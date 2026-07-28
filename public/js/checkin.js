/* ═══════════════════════════════════════════
   MEASUREMENTS — DOWNLOAD / UPLOAD EXCEL FORM
   Download a blank Excel template, fill it (in Excel / Sheets), then upload it
   back to auto-fill the Body Measurements inputs. Fully client-side (SheetJS),
   no server or Google account needed.
═══════════════════════════════════════════ */
const MEAS_FIELDS = [
  {key: 'weight',  label: 'Weight (kg)'},
  {key: 'waist',   label: 'Waist (cm)'},
  {key: 'chest',   label: 'Chest (cm)'},
  {key: 'hips',    label: 'Hips (cm)'},
  {key: 'arms',    label: 'Arms (cm)'},
  {key: 'thighs',  label: 'Thighs (cm)'},
  {key: 'neck',    label: 'Neck (cm)'},
  {key: 'bodyfat', label: 'Body Fat (%)'},
];

function setMeasStatus(msg, kind) {
  const status = document.getElementById('meas-form-status');
  if (status) { status.textContent = msg; status.className = 'meas-form-status' + (kind ? ' ' + kind : ''); }
}

// Build and download a blank two-column Excel template (Measurement | Value).
function downloadMeasurementTemplate() {
  if (typeof XLSX === 'undefined') {
    return setMeasStatus('Excel library not loaded — check your connection and refresh.', 'err');
  }
  const clientName = (getUser() && getUser().name) ? getUser().name : '';
  const rows = [
    ['Measurement', 'Value'],
    ...MEAS_FIELDS.map(f => [f.label, '']),
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{wch: 18}, {wch: 14}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Measurements');
  const safe = clientName ? clientName.replace(/[^\w-]+/g, '_') + '-' : '';
  XLSX.writeFile(wb, `${safe}measurements-form.xlsx`);
  setMeasStatus('Template downloaded. Fill the Value column, then upload it back.', 'ok');
}

// Parse an uploaded Excel/CSV form and fill the measurement inputs.
function uploadMeasurementFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (typeof XLSX === 'undefined') {
    return setMeasStatus('Excel library not loaded — check your connection and refresh.', 'err');
  }
  setMeasStatus('Reading file…', '');
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(e.target.result, {type: 'array'});
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, {header: 1, blankrows: false});
      // Match each row's first cell (label) to a field, read the value from any
      // later cell in that row. Tolerates extra columns / header variations.
      let n = 0;
      rows.forEach(row => {
        if (!row || !row.length) return;
        const label = String(row[0] || '').toLowerCase();
        const field = MEAS_FIELDS.find(f => label.includes(f.key) || label.includes(f.label.split(' ')[0].toLowerCase()));
        if (!field) return;
        const val = row.slice(1).map(c => parseFloat(c)).find(v => Number.isFinite(v));
        if (val != null && Number.isFinite(val)) {
          const el = document.getElementById('m-' + field.key);
          if (el) { el.value = val; n++; }
        }
      });
      if (n) setMeasStatus(`Imported ${n} measurement${n > 1 ? 's' : ''} from the file. Review, then save the week.`, 'ok');
      else setMeasStatus('No matching measurement values found in that file. Use the downloaded template.', 'err');
    } catch (err) {
      console.error(err);
      setMeasStatus('Could not read that file. Please upload the downloaded Excel template.', 'err');
    } finally {
      event.target.value = ''; // allow re-uploading the same file
    }
  };
  reader.onerror = () => setMeasStatus('Could not read that file.', 'err');
  reader.readAsArrayBuffer(file);
}

/* ═══════════════════════════════════════════
   CUSTOM HABITS / RITUALS
═══════════════════════════════════════════ */
async function addCustomItem(type, range) {
  const defs = structuredClone(getCustomDefs());
  const id = type + '_' + Date.now();
  defs[type].push({id, name:'', range: range === 30 ? 30 : 7});
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
    wrap.innerHTML = defs[type].map(d=>{
      const max = d.range === 30 ? 30 : 7;
      const step = max === 30 ? 5 : 1;
      const midTick = max === 30 ? '<span>15 · OK</span>' : '';
      return `
      <div class="habit-slider-row custom">
        <div class="habit-slider-top">
          <div class="habit-slider-left">
            <div class="habit-slider-icon">✨</div>
            <input type="text" class="custom-name-input" placeholder="Name this ${type}…" value="${escAttr(d.name)}" oninput="updateCustomName('${type}','${d.id}',this.value)">
          </div>
          <div class="custom-slider-right">
            <div class="habit-slider-val" id="custom-${d.id}-pill">0 / ${max}</div>
            <button type="button" class="habit-remove-btn" onclick="removeCustomItem('${type}','${d.id}')" title="Remove">✕</button>
          </div>
        </div>
        <div class="habit-range-wrap"><div class="habit-range-track"><div class="habit-range-fill" id="custom-${d.id}-fill" style="width:0%"></div></div><input type="range" class="habit-range-input" id="custom-${d.id}-val" min="0" max="${max}" step="${step}" value="0" oninput="updateCustomSlider('${d.id}',${max})"></div>
        <div class="habit-range-ticks"><span>0 · Poor</span>${midTick}<span>${max} · Best</span></div>
      </div>`;
    }).join('');
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
    ['h-breathing', 'Breathing before meals', 0, 30],
    ['h-walking', 'Walking After meals', 0, 30],
    ['h-sunbath', 'Sunbath', 0, 7],
    ['h-supplements', 'Supplements', 0, 7],
    ['h-movement', 'Movement', 0, 7],
    ['h-sukoontea', 'Sukoon Tea', 0, 7],
    ['h-viraamtea', 'Viraam Tea', 0, 7],
    ['h-nightritual', 'Night healing rituals', 0, 7],
  ])) return;

  if (!currentEntry) currentEntry = {};
  const defs = getCustomDefs();
  const readCustom = d => {
    const el = document.getElementById(`custom-${d.id}-val`);
    const range = d.range === 30 ? 30 : 7;
    const val = el ? +el.value || 0 : 0;
    return {name:d.name.trim(), value:val, range, filled:true};
  };
  const customHabits = defs.habit.filter(d=>d.name.trim()).map(readCustom);
  const customRituals = defs.ritual.filter(d=>d.name.trim()).map(readCustom);
  currentEntry.q1 = {
    energy:getScaleVal('scale-energy'), mood:getScaleVal('scale-mood'), motivation:getScaleVal('scale-motivation'),
    breathing:+document.getElementById('h-breathing').value||0,
    walking:+document.getElementById('h-walking').value||0,
    sunbath:+document.getElementById('h-sunbath').value||0,
    supplements:+document.getElementById('h-supplements').value||0,
    movement:+document.getElementById('h-movement').value||0,
    sukoonTea:+document.getElementById('h-sukoontea').value||0,
    viraamTea:+document.getElementById('h-viraamtea').value||0,
    nightritual:+document.getElementById('h-nightritual').value||0,
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
  // Sleep now comes from the Q2 inner-state grid (the habit card no longer has a
  // Sleep slider). The two teas combine into one "tea" ritual term.
  const sleepVal = currentEntry.q2 && currentEntry.q2.sleepq > 0 ? currentEntry.q2.sleepq : 0;
  const teaVal = Math.min(7, (q1.sukoonTea || 0) + (q1.viraamTea || 0));

  const food = Math.round((((q1.breathing || 0) / 30 + (q1.walking || 0) / 30 + (q1.sunbath || 0) / 7) / 3) * 100);
  const movement = Math.round(((q1.movement || 0) / 7) * 100);
  const recovery = Math.round((((q1.nightritual || 0) / 7 + (sleepVal > 0 ? sleepVal / 10 : 0)) / 2) * 100);
  const sleep = Math.round(sleepVal > 0 ? (sleepVal / 10) * 100 : 0);
  const rituals = Math.round(((teaVal / 7 + (q1.nightritual || 0) / 7) / 2) * 100);
  const supplements = Math.round(((q1.supplements || 0) / 7) * 100);

  const filledCustoms = [
    ...(q1.customHabits || []),
    ...(q1.customRituals || [])
  ].filter(c => c.filled);

  const customPcts = filledCustoms.map(c =>
    Math.min(100, Math.round((c.value / (c.range || 7)) * 100))
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
