import 'dotenv/config';
import express from 'express';
import path from 'path';
import {fileURLToPath} from 'url';
import bodyParser from 'body-parser';
import cors from 'cors';
import crypto from 'crypto';
import * as db from './sheets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

// ── CORS ──────────────────────────────────────────────────────────────────────
// Restrict CORS to same origin in production via ALLOWED_ORIGIN.
// In development it's unset, so '*' is used as a fallback.
const corsOptions = {
  origin: process.env.ALLOWED_ORIGIN || '*',
};

// Middleware
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(cors(corsOptions));

// Never let the browser serve stale API data from its cache — otherwise newly
// saved rows only appear after a hard refresh.
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// ── ADMIN AUTH ────────────────────────────────────────────────────────────────
// Protect admin routes with a shared secret token. Set ADMIN_TOKEN in your
// environment. If unset, admin routes are open (dev-friendly fallback).
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null;

function requireAdmin(req, res, next) {
  if (!ADMIN_TOKEN) return next(); // no token configured → open (dev mode)
  const provided = req.headers['x-admin-token'] || req.query.adminToken;
  if (provided !== ADMIN_TOKEN) {
    return res.status(401).json({error: 'Unauthorized'});
  }
  next();
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

// Basic input sanitization — trim strings, validate email format.
function sanitizeClientInput(body) {
  const name      = (body.name      || '').toString().trim();
  const email     = (body.email     || '').toString().trim();
  const phone     = (body.phone     || '').toString().trim();
  const age       = (body.age       || '').toString().trim();
  const checkinDay= (body.checkinDay|| '').toString().trim();
  const weeks     = parseInt(body.weeks, 10) || 12;

  const errors = [];
  if (!name) errors.push('Client name is required');
  if (name.length > 120) errors.push('Name must be 120 characters or fewer');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Invalid email address');
  }
  if (age && (!/^\d+$/.test(age) || +age < 1 || +age > 99)) {
    errors.push('Age must be a number between 1 and 99');
  }
  if (weeks < 1 || weeks > 99) {
    errors.push('Program duration must be between 1 and 99 weeks');
  }

  return {values: {name, email, phone, age, weeks, checkinDay}, errors};
}

// Proper CSV escaping — handles internal quotes and commas.
function escapeCSV(v) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

// Wrap an async route so rejected promises become clean 500s instead of crashes.
const wrap = handler => (req, res) => handler(req, res).catch(err => {
  console.error(err);
  res.status(500).json({error: err.message});
});

// ── API ENDPOINTS ─────────────────────────────────────────────────────────────

// Create client
app.post('/api/clients', wrap(async (req, res) => {
  const {values, errors} = sanitizeClientInput(req.body);
  if (errors.length) return res.status(400).json({error: errors.join(', ')});
  if (values.phone && await db.phoneExists(values.phone)) {
    return res.status(409).json({error: 'Duplicate mobile no.'});
  }

  const id = crypto.randomUUID();
  await db.createClient({id, ...values});
  res.json({success: true, client: {id, ...values}});
}));

// Get all clients — protected
app.get('/api/clients', requireAdmin, wrap(async (req, res) => {
  res.json(await db.getClientsWithStats());
}));

// Get client by ID
app.get('/api/clients/:id', wrap(async (req, res) => {
  const client = await db.getClient(req.params.id);
  if (!client) return res.status(404).json({error: 'Client not found'});
  res.json(client);
}));

// Update client
app.put('/api/clients/:id', wrap(async (req, res) => {
  const {values, errors} = sanitizeClientInput(req.body);
  if (errors.length) return res.status(400).json({error: errors.join(', ')});
  if (values.phone && await db.phoneExists(values.phone, req.params.id)) {
    return res.status(409).json({error: 'Duplicate mobile no.'});
  }

  const updated = await db.updateClient(req.params.id, values);
  if (!updated) return res.status(404).json({error: 'Client not found'});
  res.json({success: true});
}));

// Delete client (and its submissions + preferences) — protected
app.delete('/api/clients/:id', requireAdmin, wrap(async (req, res) => {
  await db.deleteClient(req.params.id);
  res.json({success: true});
}));

// Save form submission
app.post('/api/submissions', wrap(async (req, res) => {
  if (!req.body.clientId) return res.status(400).json({error: 'Missing clientId'});
  const submissionId = await db.createSubmission(req.body);
  res.json({success: true, submissionId});
}));

// Get submissions for a client (optional ?limit=N, default/cap 5000)
app.get('/api/submissions/:clientId', wrap(async (req, res) => {
  const requestedLimit = parseInt(req.query.limit, 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 5000) : 5000;
  res.json(await db.getSubmissions(req.params.clientId, limit));
}));

// Delete a client's check-in history while preserving their profile.
app.delete('/api/submissions/:clientId', wrap(async (req, res) => {
  const deleted = await db.clearSubmissions(req.params.clientId);
  res.json({success: true, deleted});
}));

app.get('/api/clients/:id/preferences', wrap(async (req, res) => {
  res.json({customDefs: await db.getPreferences(req.params.id)});
}));

app.put('/api/clients/:id/preferences', wrap(async (req, res) => {
  const customDefs = req.body?.customDefs;
  if (!customDefs || !Array.isArray(customDefs.habit) || !Array.isArray(customDefs.ritual)) {
    return res.status(400).json({error: 'Invalid custom definitions'});
  }
  await db.updatePreferences(req.params.id, customDefs);
  res.json({success: true});
}));

// Export all data as CSV — protected
app.get('/api/export/csv', requireAdmin, wrap(async (req, res) => {
  const rows = await db.getClientsWithStats();
  const csv = [
    'Client ID,Name,Email,Phone,Age,Program Weeks,Check-in Day,Submissions,Last Updated',
    ...rows.map(r =>
      [r.id, r.name, r.email, r.phone, r.age, r.weeks, r.checkinDay, r.submissionCount, r.updatedAt]
        .map(escapeCSV)
        .join(',')
    ),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="client-data.csv"');
  res.send(csv);
}));

// Health check
app.get('/health', (req, res) => res.send('OK'));

// Only bind a port when run directly (local dev / `npm start`).
// On Vercel the app is imported as a serverless handler and must NOT listen.
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`Health Tracker server listening on http://localhost:${PORT}`);
    console.log(`Admin dashboard: http://localhost:${PORT}/?admin=1`);
    console.log('Data store: Google Sheets');
    if (!process.env.GOOGLE_SHEET_ID) {
      console.warn('⚠️  GOOGLE_SHEET_ID not set — configure Google Sheets env vars (.env) before use.');
    }
    if (!ADMIN_TOKEN) {
      console.warn('⚠️  ADMIN_TOKEN not set — admin routes are unprotected. Set it in production!');
    }
    if (!process.env.ALLOWED_ORIGIN) {
      console.warn('⚠️  ALLOWED_ORIGIN not set — CORS allows all origins. Set it in production!');
    }
  });
}

export default app;
