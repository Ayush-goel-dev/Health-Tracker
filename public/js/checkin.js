/* ═══════════════════════════════════════════
   IMPORT MEASUREMENTS FROM GOOGLE FORM
   Pulls the latest form response matching this client's phone and fills the
   Body Measurements inputs. Backend matches by phone against a form-responses
   tab in the same spreadsheet.
═══════════════════════════════════════════ */
async function importMeasurementForm() {
  const status = document.getElementById('meas-form-status');
  const btn = document.getElementById('meas-form-btn');
  const setStatus = (msg, kind) => {
    if (status) { status.textContent = msg; status.className = 'meas-form-status' + (kind ? ' ' + kind : ''); }
  };

  const clientId = getCurrentClientId();
  if (!clientId || clientId === DEFAULT_CLIENT_ID) {
    return setStatus('Save the client profile first, then import.', 'err');
  }

  setStatus('Fetching latest form response…', '');
  if (btn) btn.disabled = true;
  try {
    const res = await api.getMeasurementForm(clientId);
    if (!res.found) {
      return setStatus("No Google Form response found for this client's phone number yet.", 'err');
    }
    const keys = ['weight', 'waist', 'chest', 'hips', 'arms', 'thighs', 'neck', 'bodyfat'];
    let n = 0;
    keys.forEach(k => {
      const v = res.measurements[k];
      const el = document.getElementById('m-' + k);
      if (el && v != null) { el.value = v; n++; }
    });
    const when = res.submittedAt ? ' (submitted ' + res.submittedAt + ')' : '';
    if (n) setStatus(`Imported ${n} measurement${n > 1 ? 's' : ''} from the form${when}. Review, then save the week.`, 'ok');
    else setStatus('Form response found, but it had no measurement values.', 'err');
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Could not import from the Google Form.', 'err');
  } finally {
    if (btn) btn.disabled = false;
  }
}

/* ═══════════════════════════════════════════
   CUSTOM HABITS / RITUALS
═══════════════════════════════════════════ */
async function addCustomItem(type) {
  const defs = structuredClone(getCustomDefs());
  const id = type + '_' + Date.now();
  defs[type].push({id, name:''});
  try {
    await saveCustomDefs(defs);
    renderCustomItems();
  } catch (error) {
    console.error(error);
    showError('Custom item could not be saved.');
  }
}
async function removeCustomItem(type, id) {
  const defs = structuredClone(getCustomDefs());
  defs[type] = defs[type].filter(d=>d.id!==id);
  try {
    await saveCustomDefs(defs);
    renderCustomItems();
  } catch (error) {
    console.error(error);
    showError('Custom item could not be removed.');
  }
}
function renderCustomItems() {
  const defs = getCustomDefs();
  ['habit','ritual'].forEach(type=>{
    const wrap = document.getElementById(`custom-${type}s-list`);
    if (!wrap) return;
    wrap.innerHTML = defs[type].map(d=>`
      <div class="habit-row custom">
        <input type="text" class="custom-name-input" placeholder="Name this ${type}…" value="${escAttr(d.name)}" oninput="updateCustomName('${type}','${d.id}',this.value)">
        <input type="number" class="habit-input" min="0" max="21" placeholder="0–7" id="custom-${d.id}-val">
        <button type="button" class="habit-remove-btn" onclick="removeCustomItem('${type}','${d.id}')" title="Remove">✕</button>
      </div>`).join('');
  });
}
let customNameSaveTimer = null;
function updateCustomName(type, id, name) {
  const defs = structuredClone(getCustomDefs());
  const item = defs[type].find(d=>d.id===id);
  if (!item) return;
  item.name = name;
  currentCustomDefs = defs;
  clearTimeout(customNameSaveTimer);
  customNameSaveTimer = setTimeout(async () => {
    try {
      await saveCustomDefs(currentCustomDefs);
    } catch (error) {
      console.error(error);
      showError('Custom item name could not be saved.');
    }
  }, 300);
}

/* ═══════════════════════════════════════════
   REQUIRED-FIELD VALIDATION
═══════════════════════════════════════════ */
function showFieldError(errId, msg, el) {
  const err = document.getElementById(errId);
  if (err) { err.textContent = msg; err.style.display = 'block'; }
  if (el) {
    el.scrollIntoView({behavior: 'smooth', block: 'center'});
    if (typeof el.focus === 'function') el.focus({preventScroll: true});
  }
  return false;
}
function clearFieldError(errId) {
  const err = document.getElementById(errId);
  if (err) err.style.display = 'none';
}
// Every [id, label, min, max] number input must be filled and within range.
function validateNumbers(errId, fields) {
  for (const [id, label, min, max] of fields) {
    const el = document.getElementById(id);
    if (!el || el.value === '') return showFieldError(errId, `Please fill "${label}".`, el);
    const v = Number(el.value);
    if (!Number.isFinite(v) || v < min || v > max) {
      return showFieldError(errId, `"${label}" must be between ${min} and ${max}.`, el);
    }
  }
  return true;
}

/* ═══════════════════════════════════════════
   SAVE Q1
═══════════════════════════════════════════ */
function saveQ1() {
  // ── Required: everything on Inner State except the bottleneck section ──
  clearFieldError('q1-err');
  if (!document.getElementById('goal-text').value.trim()) {
    return showFieldError('q1-err', 'Please enter your goal description.', document.getElementById('goal-text'));
  }
  if (!validateNumbers('q1-err', [['goal-months', 'Goal Duration (months)', 1, 60]])) return;
  if (!getScaleVal('scale-energy')) return showFieldError('q1-err', 'Please rate your Health Awareness (1–10).', document.getElementById('scale-energy'));
  if (!getScaleVal('scale-mood')) return showFieldError('q1-err', 'Please rate your Mood (1–10).', document.getElementById('scale-mood'));
  if (!getScaleVal('scale-motivation')) return showFieldError('q1-err', 'Please rate your Intent (1–10).', document.getElementById('scale-motivation'));
  if (!validateNumbers('q1-err', [
    ['h-breathing', 'Breathing before meals', 0, 21],
    ['h-walking', 'Walked after meals', 0, 21],
    ['h-screentime', 'Screen-free 1hr before bed', 0, 7],
    ['h-tea', 'Evening tea', 0, 7],
    ['h-nightritual', 'Night healing ritual', 0, 7],
    ['h-supplements', 'Supplements consistently', 0, 7],
    ['h-sleepquality', 'Sleep quality', 1, 10],
    ['h-stress', 'Stress level', 1, 10],
  ])) return;
  if (!ynState.protein) return showFieldError('q1-err', 'Please select Yes or No for "Protein in most meals".', document.getElementById('yn-protein-yes'));

  if (!currentEntry) currentEntry = {};
  const defs = getCustomDefs();
  const customHabits = defs.habit.filter(d=>d.name.trim()).map(d=>{
    const el = document.getElementById(`custom-${d.id}-val`);
    const val = el ? +el.value||0 : 0;
    const filled = !!(el && el.value !== '');
    return {name:d.name.trim(), value:val, filled};
  });
  const customRituals = defs.ritual.filter(d=>d.name.trim()).map(d=>{
    const el = document.getElementById(`custom-${d.id}-val`);
    const val = el ? +el.value||0 : 0;
    const filled = !!(el && el.value !== '');
    return {name:d.name.trim(), value:val, filled};
  });
  currentEntry.q1 = {
    energy:getScaleVal('scale-energy'), mood:getScaleVal('scale-mood'), motivation:getScaleVal('scale-motivation'),
    breathing:+document.getElementById('h-breathing').value||0,
    walking:+document.getElementById('h-walking').value||0,
    protein:ynState.protein||'',
    screentime:+document.getElementById('h-screentime').value||0,
    tea:+document.getElementById('h-tea').value||0,
    nightritual:+document.getElementById('h-nightritual').value||0,
    supplements:+document.getElementById('h-supplements').value||0,
    sleepquality:+document.getElementById('h-sleepquality').value||0,
    stress:+document.getElementById('h-stress').value||0,
    bottlenecks:[...selectedBottlenecks],
    otherTags:[...selectedOtherChips],
    notes:document.getElementById('q1-notes').value.trim(),
    customHabits, customRituals,
    goalText:document.getElementById('goal-text').value.trim(),
    goalMonths:Math.max(1,+document.getElementById('goal-months').value||3),
  };
  goTo('q2');
}

/* ═══════════════════════════════════════════
   SAVE Q2
═══════════════════════════════════════════ */
async function saveQ2AndGoProgress() {
  // ── Required: all Progress & Wins fields before viewing the dashboard ──
  clearFieldError('q2-err');
  if (!validateNumbers('q2-err', [
    ['p-sleepq', 'Sleep Quality', 1, 10],
    ['p-stressadapt', 'Stress Adaptability', 1, 10],
    ['p-activeness', 'Activeness & Energy', 1, 10],
    ['p-digestion', 'Digestion / Bloating', 1, 10],
    ['p-brainfog', 'Brain Fog', 1, 10],
    ['p-pain', 'Body Pains / Stiffness', 1, 10],
    ['p-cravings', 'Cravings', 1, 10],
    ['p-movement', 'Movement', 1, 10],
  ])) return;
  for (const [id, label] of [
    ['win-biggest', 'Biggest Win This Week'],
    ['win-family', 'Family / Relationship Win'],
    ['win-work', 'Work / Business Win'],
  ]) {
    const el = document.getElementById(id);
    if (!el.value.trim()) return showFieldError('q2-err', `Please fill "${label}".`, el);
  }

  if (!currentEntry) currentEntry = {};

  function gv(id) {
    const el = document.getElementById(id);
    return el && el.value !== '' ? +el.value : null;
  }

  // Body measurements (all optional) — nested inside q2, so no schema change.
  const measurements = {};
  ['weight', 'waist', 'chest', 'hips', 'arms', 'thighs', 'neck', 'bodyfat'].forEach(k => {
    const v = gv('m-' + k);
    if (v != null) measurements[k] = v;
  });

  currentEntry.q2 = {
    sleepq: gv('p-sleepq'),
    stressadapt: gv('p-stressadapt'),
    activeness: gv('p-activeness'),
    digestion: gv('p-digestion'),
    brainfog: gv('p-brainfog'),
    pain: gv('p-pain'),
    cravings: gv('p-cravings'),
    movement: gv('p-movement'),
    measurements,
  };

  currentEntry.q3 = {
    winBiggest: document.getElementById('win-biggest').value.trim(),
    winFamily: document.getElementById('win-family').value.trim(),
    winWork: document.getElementById('win-work').value.trim(),
  };

  const q1 = currentEntry.q1 || {};

  const food = Math.round(((q1.breathing / 21 + q1.walking / 21 + (q1.protein === 'yes' ? 1 : 0)) / 3) * 100);
  const movement = Math.round((q1.walking / 21) * 100);
  const recovery = Math.round(((q1.nightritual / 7 + (q1.sleepquality > 0 ? q1.sleepquality / 10 : 0)) / 2) * 100);
  const sleep = Math.round(q1.sleepquality > 0 ? (q1.sleepquality / 10) * 100 : 0);
  const rituals = Math.round(((q1.tea / 7 + q1.nightritual / 7) / 2) * 100);
  const supplements = Math.round((q1.supplements / 7) * 100);

  const filledCustoms = [
    ...(q1.customHabits || []),
    ...(q1.customRituals || [])
  ].filter(c => c.filled);

  const customPcts = filledCustoms.map(c =>
    Math.min(100, Math.round((c.value / 7) * 100))
  );

  const customAvg = customPcts.length
    ? Math.round(customPcts.reduce((a, b) => a + b, 0) / customPcts.length)
    : null;

  const fixedCats = {
    food,
    movement,
    recovery,
    sleep,
    rituals,
    supplements
  };

  let overall;

  if (customAvg != null) {
    const fixedOverall =
      food * .2 +
      movement * .15 +
      recovery * .2 +
      sleep * .15 +
      rituals * .15 +
      supplements * .15;

    overall = Math.round(fixedOverall * .9 + customAvg * .1);
  } else {
    overall = Math.round(
      food * .2 +
      movement * .15 +
      recovery * .2 +
      sleep * .15 +
      rituals * .15 +
      supplements * .15
    );
  }

  currentEntry.consistency = overall;
  currentEntry.date = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  currentEntry.dateISO = new Date().toISOString();
  currentEntry.goals = fixedCats;
  currentEntry.customAvg = customAvg;
  currentEntry.filledCustoms = filledCustoms;

  try {
    const entry = structuredClone(currentEntry);
    const result = await api.createSubmission({
      clientId: getCurrentClientId(),
      ...entry,
    });
    currentHistory.push({...entry, id: result.submissionId});
    currentEntry = null;
    buildOverview();
    goTo('progress');
  } catch (error) {
    console.error(error);
    showError('Check-in could not be saved. Please try again.');
  }
}
