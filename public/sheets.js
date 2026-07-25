/*
 * Google Sheets data layer.
 *
 * Replaces the previous SQLite backend with three tabs in one spreadsheet:
 *   Clients            — id | name | email | phone | age | weeks | checkinDay | createdAt | updatedAt
 *   Submissions        — id | clientId | q1 | q2 | q3 | consistency | date | dateISO | goals | customAvg | filledCustoms | submittedAt
 *   ClientPreferences  — clientId | customDefs | updatedAt
 *
 * Timestamps are written as 'YYYY-MM-DD HH:MM:SS' (UTC) so the frontend's
 * `new Date(str.replace(' ', 'T') + 'Z')` parsing keeps working.
 */
import {GoogleSpreadsheet} from 'google-spreadsheet';
import {JWT} from 'google-auth-library';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TABS = {clients: 'Clients', submissions: 'Submissions', preferences: 'ClientPreferences'};

// UTC timestamp, sortable as a plain string. Matches the old SQLite format.
const now = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

function parseJSON(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

// ── Connection (lazy singleton, reused across warm serverless invocations) ──
let docPromise = null;

// Normalize a private key pasted via .env / dashboard env var:
// trim whitespace, strip an accidental surrounding quote pair, expand \n escapes.
function normalizeKey(raw) {
  let key = (raw || '').trim();
  // Strip a trailing comma (common when the line is copied straight from the JSON).
  if (key.endsWith(',')) key = key.slice(0, -1).trim();
  // Strip an accidental surrounding quote pair.
  if (key.length >= 2 &&
      ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'")))) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, '\n');
}

// Accept either a bare spreadsheet ID or a full Google Sheets URL and return the ID.
function normalizeSheetId(raw) {
  const val = (raw || '').trim();
  const match = val.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/) || val.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : val;
}

function loadDoc() {
  const email = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
  const key = normalizeKey(process.env.GOOGLE_PRIVATE_KEY);
  const sheetId = normalizeSheetId(process.env.GOOGLE_SHEET_ID);
  if (!email || !key || !sheetId) {
    throw new Error(
      'Missing Google Sheets env vars — set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY and GOOGLE_SHEET_ID',
    );
  }
  const auth = new JWT({email, key, scopes: SCOPES});
  const doc = new GoogleSpreadsheet(sheetId, auth);
  return doc.loadInfo().then(() => doc);
}

function getDoc() {
  if (!docPromise) {
    docPromise = loadDoc().catch(err => {
      docPromise = null; // allow retry on next request instead of caching the failure
      throw err;
    });
  }
  return docPromise;
}

async function tab(which) {
  const doc = await getDoc();
  const title = TABS[which];
  const sheet = doc.sheetsByTitle[title];
  if (!sheet) throw new Error(`Spreadsheet tab "${title}" not found — check the tab name (case-sensitive)`);
  return sheet;
}

// Delete rows bottom-to-top so earlier row indices stay valid mid-loop.
async function deleteRows(rows) {
  for (const row of [...rows].sort((a, b) => b.rowNumber - a.rowNumber)) {
    await row.delete();
  }
}

// ── Row mappers ─────────────────────────────────────────────────────────────
function rowToClient(r) {
  return {
    id: r.get('id'),
    name: r.get('name') || '',
    email: r.get('email') || '',
    phone: r.get('phone') || '',
    age: r.get('age') || '',
    weeks: Number(r.get('weeks')) || 12,
    checkinDay: r.get('checkinDay') || '',
    createdAt: r.get('createdAt') || '',
    updatedAt: r.get('updatedAt') || '',
  };
}

function rowToSubmission(r) {
  const rawCustomAvg = r.get('customAvg');
  return {
    id: Number(r.get('id')) || r.get('id'),
    clientId: r.get('clientId'),
    q1: parseJSON(r.get('q1'), {}),
    q2: parseJSON(r.get('q2'), {}),
    q3: parseJSON(r.get('q3'), {}),
    consistency: Number(r.get('consistency')) || 0,
    date: r.get('date') || '',
    dateISO: r.get('dateISO') || '',
    goals: parseJSON(r.get('goals'), {}),
    customAvg: rawCustomAvg === '' || rawCustomAvg == null ? null : Number(rawCustomAvg),
    filledCustoms: parseJSON(r.get('filledCustoms'), []),
    submittedAt: r.get('submittedAt') || '',
  };
}

// ── Clients ─────────────────────────────────────────────────────────────────
export async function createClient({id, name, email, phone, age, weeks, checkinDay}) {
  const sheet = await tab('clients');
  const ts = now();
  await sheet.addRow({id, name, email, phone, age, weeks, checkinDay, createdAt: ts, updatedAt: ts});
}

export async function getClient(id) {
  const sheet = await tab('clients');
  const row = (await sheet.getRows()).find(r => r.get('id') === id);
  return row ? rowToClient(row) : null;
}

// True if another client already uses this phone number (optionally excluding one id).
export async function phoneExists(phone, excludeId = null) {
  const target = (phone || '').trim();
  if (!target) return false;
  const sheet = await tab('clients');
  return (await sheet.getRows()).some(
    r => (r.get('phone') || '').trim() === target && r.get('id') !== excludeId,
  );
}

export async function getClientsWithStats() {
  const [clientSheet, subSheet] = await Promise.all([tab('clients'), tab('submissions')]);
  const [clientRows, subRows] = await Promise.all([clientSheet.getRows(), subSheet.getRows()]);

  const counts = {};
  const last = {};
  for (const r of subRows) {
    const cid = r.get('clientId');
    counts[cid] = (counts[cid] || 0) + 1;
    const submittedAt = r.get('submittedAt') || '';
    if (!last[cid] || submittedAt > last[cid]) last[cid] = submittedAt;
  }

  return clientRows
    .map(r => ({
      ...rowToClient(r),
      submissionCount: counts[r.get('id')] || 0,
      lastSubmission: last[r.get('id')] || null,
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); // updatedAt DESC
}

export async function updateClient(id, {name, email, phone, age, weeks, checkinDay}) {
  const sheet = await tab('clients');
  const row = (await sheet.getRows()).find(r => r.get('id') === id);
  if (!row) return false;
  row.assign({name, email, phone, age, weeks, checkinDay, updatedAt: now()});
  await row.save();
  return true;
}

export async function deleteClient(id) {
  const [clientSheet, subSheet, prefSheet] = await Promise.all([
    tab('clients'), tab('submissions'), tab('preferences'),
  ]);
  const [clientRows, subRows, prefRows] = await Promise.all([
    clientSheet.getRows(), subSheet.getRows(), prefSheet.getRows(),
  ]);

  await deleteRows(subRows.filter(r => r.get('clientId') === id));
  await deleteRows(prefRows.filter(r => r.get('clientId') === id));
  const clientRow = clientRows.find(r => r.get('id') === id);
  if (clientRow) await clientRow.delete();
}

// ── Submissions ─────────────────────────────────────────────────────────────
export async function createSubmission(data) {
  const sheet = await tab('submissions');
  const rows = await sheet.getRows();
  const id = rows.reduce((max, r) => Math.max(max, Number(r.get('id')) || 0), 0) + 1;

  await sheet.addRow({
    id,
    clientId: data.clientId,
    q1: JSON.stringify(data.q1 ?? {}),
    q2: JSON.stringify(data.q2 ?? {}),
    q3: JSON.stringify(data.q3 ?? {}),
    consistency: data.consistency ?? '',
    date: data.date ?? '',
    dateISO: data.dateISO ?? '',
    goals: JSON.stringify(data.goals ?? {}),
    customAvg: data.customAvg ?? '',
    filledCustoms: JSON.stringify(data.filledCustoms ?? []),
    submittedAt: now(),
  });
  return id;
}

export async function getSubmissions(clientId, limit) {
  const sheet = await tab('submissions');
  const rows = (await sheet.getRows())
    .filter(r => r.get('clientId') === clientId)
    .map(rowToSubmission);

  rows.sort((a, b) => {
    const ak = a.dateISO || a.submittedAt || '';
    const bk = b.dateISO || b.submittedAt || '';
    if (ak !== bk) return ak < bk ? -1 : 1; // COALESCE(dateISO, submittedAt) ASC
    return (Number(a.id) || 0) - (Number(b.id) || 0);
  });

  return Number.isFinite(limit) ? rows.slice(0, limit) : rows;
}

export async function clearSubmissions(clientId) {
  const sheet = await tab('submissions');
  const toDelete = (await sheet.getRows()).filter(r => r.get('clientId') === clientId);
  await deleteRows(toDelete);
  return toDelete.length;
}

// ── Preferences ─────────────────────────────────────────────────────────────
export async function getPreferences(clientId) {
  const sheet = await tab('preferences');
  const row = (await sheet.getRows()).find(r => r.get('clientId') === clientId);
  return parseJSON(row?.get('customDefs'), {habit: [], ritual: []});
}

export async function updatePreferences(clientId, customDefs) {
  const sheet = await tab('preferences');
  const row = (await sheet.getRows()).find(r => r.get('clientId') === clientId);
  const payload = JSON.stringify(customDefs);
  if (row) {
    row.assign({customDefs: payload, updatedAt: now()});
    await row.save();
  } else {
    await sheet.addRow({clientId, customDefs: payload, updatedAt: now()});
  }
}
