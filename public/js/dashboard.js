/* ═══════════════════════════════════════════
   OVERVIEW STRIP
═══════════════════════════════════════════ */
function buildOverview() {
  const h = getHistory();
  const user = getUser();
  const totalWeeks = user?.weeks || 12;
  document.getElementById('ov-sessions').textContent = h.length || '—';
  if (h.length) {
    const avg  = h.reduce((a,e)=>a+e.consistency,0) / h.length;
    const best = Math.max(...h.map(e=>e.consistency));
    document.getElementById('ov-avg').textContent  = avg.toFixed(0)+'%';
    document.getElementById('ov-best').textContent = best.toFixed(0)+'%';
    document.getElementById('ov-streak').textContent = `${Math.min(h.length,totalWeeks)}/${totalWeeks}`;
  } else {
    ['ov-avg','ov-best'].forEach(id => document.getElementById(id).textContent='—');
    document.getElementById('ov-streak').textContent = `0/${totalWeeks}`;
  }
  const barWrap = document.getElementById('program-bar-wrap');
  if (user) {
    const pct = Math.min(100, Math.round((h.length/totalWeeks)*100));
    barWrap.style.display = 'block';
    document.getElementById('program-bar-fill').style.width = pct+'%';
    const remaining = Math.max(0, totalWeeks-h.length);
    document.getElementById('program-bar-label').textContent = h.length>=totalWeeks
      ? `Program complete — ${totalWeeks} of ${totalWeeks} weeks logged 🎉`
      : `${pct}% of program complete — ${remaining} week${remaining===1?'':'s'} remaining`;
  } else {
    barWrap.style.display = 'none';
  }
}

/* ═══════════════════════════════════════════
   BUILD PROGRESS (main controller)
═══════════════════════════════════════════ */
let selectedWeekIndex = null; // null = latest week

function buildProgress() {
  selectedWeekIndex = null; // always open on the current week
  const history = getHistory();
  const latest  = history.length ? history[history.length-1] : null;
  const prev    = history.length>1 ? history[history.length-2] : null;
  buildOverview();
  try { buildSlide1(latest,prev,history); } catch(e) { console.error('buildSlide1 failed', e); }
  try { buildSlide2(latest,prev,history); } catch(e) { console.error('buildSlide2 failed', e); }
  try { buildSlide3(latest); }             catch(e) { console.error('buildSlide3 failed', e); }
  updateViewingBanner(history);
  // Celebrate the current week's wins with a one-off confetti burst on open.
  const w = latest?.q3;
  if (w && (w.winBiggest || w.winFamily || w.winWork)) { try { runConfetti(); } catch(e) {} }
}

// Re-point the Inner State + Cost-of-Delay dashboards at a past week's check-in.
function viewWeek(index) {
  const history = getHistory();
  if (!history.length || index < 0 || index >= history.length) return;
  selectedWeekIndex = index;
  const upto = history.slice(0, index + 1);       // so the week pill reads "Week N"
  const entry = history[index];
  const prev  = index > 0 ? history[index - 1] : null;
  try { buildSlide1(entry, prev, upto); } catch(e) { console.error(e); }
  try { buildSlide3(entry); } catch(e) { console.error(e); }
  try { buildSlide2(history[history.length-1], history[history.length-2] || null, history); } catch(e) { console.error(e); }
  updateViewingBanner(history);
  window.scrollTo({top: 0, behavior: 'smooth'});
}

function viewLatestWeek() {
  buildProgress();
  window.scrollTo({top: 0, behavior: 'smooth'});
}

function updateViewingBanner(history) {
  const banner = document.getElementById('viewing-week-banner');
  if (!banner) return;
  const isPast = selectedWeekIndex != null && selectedWeekIndex !== history.length - 1;
  banner.style.display = isPast ? 'flex' : 'none';
  if (isPast) document.getElementById('vw-num').textContent = selectedWeekIndex + 1;
}

// Save the dashboard as a PDF via the browser's print dialog (Save as PDF).
function downloadDashboardPDF() {
  const user = typeof getUser === 'function' ? getUser() : null;
  const name = (user?.name || 'client').replace(/\s+/g, '-');
  const prevTitle = document.title;
  document.title = `WAYDA-Progress-${name}`;
  window.print();
  setTimeout(() => { document.title = prevTitle; }, 500);
}

/* ═══════════════════════════════════════════
   SLIDE 1 — INNER STATE DASHBOARD
═══════════════════════════════════════════ */
function buildSlide1(latest,prev,history) {
  if (!latest) return;
  const user = getUser();
  const totalWeeks = user?.weeks || 12;
  const pill = document.getElementById('p1-week');
  if (pill) pill.textContent = `Week ${Math.min(history.length,totalWeeks)} of ${totalWeeks}`;
  const q1  = latest.q1||{};
  const q2  = latest.q2||{};
  const pq2 = prev?.q2||{};
  const pq1 = prev?.q1||{};
  const cons= latest.consistency||0;
  const bns = q1.bottlenecks||[];

  // ── INNER STATE / HEALTH SCORE ──────────────────────
  const healingScore = (((q1.energy||0)+(q1.mood||0)+(q1.motivation||0))/3)||Math.round(cons/10*10)/10;
  const rs = Math.round(healingScore*10)/10;
  const circ = 2*Math.PI*42;
  document.getElementById('ring-fill-1').style.strokeDashoffset = circ-(rs/10)*circ;
  document.getElementById('ring-fill-1').setAttribute('stroke', rs>=8?'#22C55E':rs>=6?'#F59E0B':'#F87171');
  document.getElementById('ring-score-1').textContent = rs||'—';
  // Consistency ring (dual-ring header)
  const rfc = document.getElementById('ring-fill-cons');
  if (rfc) {
    rfc.style.strokeDashoffset = circ-(cons/100)*circ;
    rfc.setAttribute('stroke', cons>=75?'#22C55E':cons>=50?'#F59E0B':'#F87171');
    const rc1 = document.getElementById('ring-cons-1');
    if (rc1) rc1.textContent = cons || '—';
  }
  const msgs = rs>=8?['Great Progress! 🎉','Your body is healing. Consistency is improving.']:
    rs>=6?['Good Progress 👍','Solid week. Push a little harder.']:
    rs>=4?['Getting There 🌱','Foundation building. Small improvements add up.']:
    ['Needs Focus ⚠️','Identify one thing to fix and focus.'];
  document.getElementById('ring-label').textContent   = msgs[0];
  document.getElementById('ring-message').textContent = msgs[1];
  document.getElementById('ring-hinglish').innerHTML = `<b>Health Score kya hota hai?</b> Yeh score Health Awareness, Mood, aur Intent — in teenon ka average hai.`;
  if (prev) {
    const ps = ((prev.q1?.energy||0)+(prev.q1?.mood||0)+(prev.q1?.motivation||0))/3;
    const diff = (rs-ps).toFixed(1);
    const de = document.getElementById('ring-delta');
    de.style.display='inline-flex'; de.className='ring-delta '+(diff>=0?'up':'down');
    de.textContent=(diff>=0?'↑ +':'↓ ')+diff+' from last week';
  }
  // ── CONSISTENCY SCORE ───────────────────────────────
  // (The standalone number card was removed — consistency now shows as the
  // hero ring plus the Consistency Growth graph. Guard in case markup is absent.)
  const conPct = document.getElementById('con-pct');
  if (conPct) conPct.textContent = cons;
  const conBar = document.getElementById('con-bar');
  if (conBar) conBar.style.width = cons + '%';
  const customNote = document.getElementById('con-custom-note');
  if (customNote) customNote.textContent = (latest.filledCustoms&&latest.filledCustoms.length)
    ? `Includes ${latest.filledCustoms.length} custom habit/ritual${latest.filledCustoms.length>1?'s':''}: ${latest.filledCustoms.map(c=>c.name).join(', ')}.`
    : '';

  // ── HABIT → RESULT IMPACT ───────────────────────────
  const hriWrap  = document.getElementById('habit-result-impact');
  const hriItems = [];
  if (q1.walking >= 5)   hriItems.push({pos:true,  icon:'✅', text:`Aapne Daily Walk ${q1.walking} baar ki hai. Isse digestion improve hoti hai, stress markers reduce hote hain, aur recovery score better hota hai.`});
  else if (q1.walking <= 2 && prev) hriItems.push({pos:false, icon:'❌', text:`Aapne sirf ${q1.walking} baar walk ki. Iska impact digestion slowdown, bloating, aur reduced energy levels par dikh sakta hai.`});
  if (q1.nightritual >= 5 && q1.sleepquality >= 7) hriItems.push({pos:true, icon:'✅', text:`Aapne Night Healing Ritual ${q1.nightritual} baar follow kiya. Sleep quality ${q1.sleepquality}/10 rahi aur morning energy levels better huye hain.`});
  else if (q1.nightritual <= 2) hriItems.push({pos:false, icon:'❌', text:`Night Healing Ritual sirf ${q1.nightritual} baar follow hua. Deep sleep reduce ho sakti hai aur recovery capacity impact hoti hai.`});
  const screen = q1.screentime||0;
  if (screen >= 5) hriItems.push({pos:true,  icon:'✅', text:`Aapne screen-free time ${screen} raat maintain kiya. Iska seedha faida melatonin production aur sleep depth par padta hai.`});
  else if (screen <= 2) hriItems.push({pos:false, icon:'❌', text:`Screen-free 1hr before bed sirf ${screen} raat follow hua. Late-night screen exposure melatonin ko delay karta hai.`});
  if (q1.protein === 'yes') hriItems.push({pos:true, icon:'✅', text:`Protein consistency maintain rahi. Iska positive impact cravings control, muscle recovery, aur stable energy levels par dikh raha hai.`});
  else hriItems.push({pos:false, icon:'❌', text:`Protein consistently nahi li gayi. Isse cravings increase, metabolism slow, aur energy dips ho sakte hain.`});
  if (q1.supplements >= 5) hriItems.push({pos:true, icon:'✅', text:`Supplements ${q1.supplements} din consistently li gayi hain. Iska positive impact energy levels, hormonal balance, aur recovery par dikh raha hai.`});
  else if (q1.supplements <= 2) hriItems.push({pos:false, icon:'❌', text:`Supplements sirf ${q1.supplements} din li gayi. Incomplete supplementation se nutrient gaps ban sakte hain.`});
  if (q1.tea >= 5) hriItems.push({pos:true, icon:'✅', text:`Evening Tea Ritual ${q1.tea} raat follow hua. Yeh nervous system ko wind-down karta hai, cortisol lower karta hai, aur better sleep ki taraf lead karta hai.`});
  if (q1.stress >= 8) hriItems.push({pos:false, icon:'❌', text:`Stress level ${q1.stress}/10 raha. High chronic stress cortisol badhaata hai — fat storage, sleep quality, aur digestion par direct impact.`});
  else if (q1.stress <= 4 && prev && pq1.stress > 6) hriItems.push({pos:true, icon:'✅', text:`Stress level pichhle hafte ke comparison mein behtar raha (${q1.stress}/10). Kam stress se recovery aur hormonal balance improve hote hain.`});
  const breath = q1.breathing||0;
  if (breath >= 5) hriItems.push({pos:true, icon:'✅', text:`Breathing before meals ${breath} baar follow hua. Yeh parasympathetic nervous system ko activate karta hai — digestion improve hoti hai aur bloating reduce hoti hai.`});
  else if (breath <= 2) hriItems.push({pos:false, icon:'❌', text:`Breathing before meals sirf ${breath} baar hua. Bina breathwork ke digestion aur absorption issues ho sakte hain.`});
  if (prev && q2.sleepq != null && pq2.sleepq != null) {
    const diff = q2.sleepq - pq2.sleepq;
    if (diff >= 2) hriItems.push({pos:true,  icon:'✅', text:`Sleep quality pichhle hafte se ${diff} points improve hui. Energy, focus, aur recovery boost hota hai.`});
    else if (diff <= -2) hriItems.push({pos:false, icon:'❌', text:`Sleep quality pichhle hafte se ${Math.abs(diff)} points gir gayi. Poor sleep har doosre health marker ko negatively impact karta hai.`});
  }
  hriWrap.innerHTML = hriItems.length
    ? `<div>${hriItems.map(item=>`<div class="hri-item ${item.pos?'positive':'negative'}"><div class="hri-icon">${item.icon}</div><div class="hri-body"><div class="hri-text">${esc(item.text)}</div></div></div>`).join('')}</div>`
    : '<div class="empty-state">No habit data available yet. Add habits in your check-in for impact tracking.</div>';

  // ── BOTTLENECK ANALYSIS ─────────────────────────────
  const bnKnowledge = {
    'Late Nights':            { problem:'Delayed sleep onset disrupts the body\'s natural repair cycle. Cortisol stays elevated, melatonin production is suppressed, deep sleep stages are shortened, and the next day\'s energy, focus, and fat metabolism all suffer.', impacts:['Energy','Sleep','Recovery','Focus','Weight','Stress'], suggestion:'Set a hard wind-down time 45 minutes before your target sleep. Replace screens with reading, slow stretching, or guided breathing. Your evening tea ritual is already a strong tool — lean into it more consistently.' },
    'Emotional Eating':       { problem:'Emotional eating bypasses hunger cues and typically involves high-sugar or high-fat foods that spike insulin, trigger inflammatory responses, disrupt gut flora, and create guilt cycles that increase stress.', impacts:['Weight','Digestion','Recovery','Stress','Focus'], suggestion:'Identify your top 2 emotional eating triggers this week. When the urge hits, pause for 5 minutes — drink water, do 10 deep breaths, or step outside.' },
    'Work Stress / Overwhelm':{ problem:'Chronic work stress keeps cortisol chronically elevated. This stalls fat loss, disrupts sleep quality, causes muscle breakdown, impairs digestion, reduces immune function, and erodes motivation for healthy habits.', impacts:['Stress','Sleep','Energy','Weight','Focus','Recovery'], suggestion:'Block 15-minute decompression gaps between high-intensity work sessions. Your breathing ritual before meals is a powerful cortisol reset — use it consistently.' },
    'Lack of Time':           { problem:'When health actions feel like extra effort, they get deprioritised. Missing even one core habit (sleep ritual, walking, protein) has a measurable ripple effect — reduced recovery, lower energy, and increased cravings.', impacts:['Recovery','Energy','Digestion','Sleep'], suggestion:'Identify the 3 highest-impact habits (sleep ritual, walking after meals, protein) and make those non-negotiable even on time-pressed days.' },
    'Cravings / Junk Food':   { problem:'Frequent cravings indicate blood sugar instability, insufficient protein, poor sleep, or high stress. Acting on cravings creates insulin spikes, gut microbiome disruption, and stalls fat metabolism.', impacts:['Weight','Digestion','Energy','Recovery','Focus'], suggestion:'Front-load protein and healthy fats at breakfast to stabilise blood sugar for the day.' },
    'Low Energy':             { problem:'Persistent low energy points to disrupted sleep, insufficient nutrition, low iron/B12/magnesium, high cortisol, or deconditioning. It creates a self-defeating loop — low energy reduces movement, which further lowers energy.', impacts:['Energy','Recovery','Focus','Movement','Stress'], suggestion:'Check supplement consistency — magnesium and B-vitamins have a direct energy impact. A 10-minute walk after meals is one of the most effective natural energy restorers.' },
    'Inconsistent Routine':   { problem:'Inconsistency prevents the body from establishing stable circadian rhythms and hormonal cycles. Irregular meal timing disrupts insulin patterns, variable sleep times reduce sleep quality.', impacts:['Sleep','Recovery','Digestion','Energy','Stress'], suggestion:'Anchor your day to 3 fixed times: wake-up, first meal, and bedtime. Use your night ritual as a non-negotiable anchor.' },
    'Travel / Social':        { problem:'Travel disrupts sleep timing, food quality, and routine — all at once. Social situations add alcohol, late nights, and irregular meal patterns. These compound into elevated inflammation and poor sleep architecture.', impacts:['Sleep','Recovery','Digestion','Energy','Weight'], suggestion:'Pack supplements so travel doesn\'t break that streak. Choose protein-first at every meal when eating out.' },
  };
  const otherTags = q1.otherTags||[];
  const notes     = q1.notes||'';
  const allBns    = [...bns.filter(b=>b!=='Other'), ...otherTags];
  // Funnel visual (ported from v5): narrowing ranked layers, tap-to-expand detail.
  const funnelColors        = ['#c23b3b','#c45c1a','#b8922a','#1a7a7a','#2d7a4f'];
  const funnelChevronColors = ['#a82e2e','#a84e14','#9e7a22','#156666','#246843'];
  let bnHtml = '';
  if (!allBns.length) {
    bnHtml = '<div class="funnel-empty">✅ <span>No bottlenecks flagged this week — great consistency!</span></div>';
  } else {
    bnHtml = `<div style="font-size:11px;color:var(--ink4);font-family:var(--font-mono);letter-spacing:.08em;text-transform:uppercase;margin-bottom:14px">Top bottlenecks funnelling into your progress — tap to expand</div>`;
    bnHtml += `<div class="funnel-wrap">`;
    allBns.forEach((bn, i) => {
      const k = bnKnowledge[bn];
      const w = Math.max(40, 100 - i*14); // narrowing funnel
      const col = funnelColors[i % funnelColors.length];
      const chCol = funnelChevronColors[i % funnelChevronColors.length];
      const isLast = i === allBns.length - 1;
      bnHtml += `<div class="funnel-layer" onclick="toggleFunnel(${i})" style="width:100%">
        <div class="funnel-shape" style="width:${w}%;background:${col};padding:${14 - i*1.5}px 20px;border-radius:${i===0?'10px 10px 4px 4px':'4px'}">
          <span class="funnel-rank">#${i+1}</span>
          <div><div class="funnel-label">${esc(bn)}</div>${k?`<div class="funnel-sub">${k.impacts.slice(0,3).join(' · ')}</div>`:''}</div>
        </div>
        ${!isLast?`<div class="funnel-chevron" style="border-top-color:${chCol}"></div>`:''}
      </div>`;
      if (k) {
        bnHtml += `<div class="funnel-detail" id="funnel-detail-${i}">
          <div class="funnel-detail-title">${esc(bn)}</div>
          <div class="funnel-detail-body">${esc(k.problem)}</div>
          <div class="funnel-impacts">${k.impacts.map(t=>`<span class="funnel-impact-tag">${t}</span>`).join('')}</div>
          <div class="funnel-suggestion">💡 ${esc(k.suggestion)}</div>
        </div>`;
      } else {
        bnHtml += `<div class="funnel-detail" id="funnel-detail-${i}"><div class="funnel-detail-title">${esc(bn)}</div><div class="funnel-detail-body">Added as a custom bottleneck this week.</div></div>`;
      }
    });
    bnHtml += `</div>`;
    if (notes) bnHtml += `<div style="margin-top:14px;padding:12px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);font-size:12px;color:var(--ink3);font-style:italic">"${esc(notes)}"</div>`;
  }
  document.getElementById('bottleneck-display').innerHTML = bnHtml;

  buildRoadmap(history);
  buildRadar(latest, prev);
  buildHeatmap(latest);
  buildMeasurements(latest, history);
}

/* ═══════════════════════════════════════════
   BODY MEASUREMENTS (ported from v5)
═══════════════════════════════════════════ */
function buildMeasurements(latest, history) {
  const card = document.getElementById('meas-analysis-card');
  if (!card) return;
  const defs = [
    {key: 'weight', label: '⚖️ Weight', unit: 'kg', dotId: 'bdot-waist', goodDown: true},
    {key: 'waist', label: '📏 Waist', unit: 'cm', dotId: 'bdot-waist', goodDown: true},
    {key: 'chest', label: '💪 Chest', unit: 'cm', dotId: 'bdot-chest', goodDown: false},
    {key: 'hips', label: '🔻 Hips', unit: 'cm', dotId: 'bdot-hips', goodDown: true},
    {key: 'arms', label: '💪 Arms', unit: 'cm', dotId: null, goodDown: false},
    {key: 'thighs', label: '🦵 Thighs', unit: 'cm', dotId: 'bdot-thighs', goodDown: true},
    {key: 'neck', label: '🔗 Neck', unit: 'cm', dotId: 'bdot-neck', goodDown: true},
    {key: 'bodyfat', label: '💧 Body Fat', unit: '%', dotId: null, goodDown: true},
  ];
  const meas = e => (e && e.q2 && e.q2.measurements) || {};
  const curM = meas(latest);
  const firstEntry = history.find(e => Object.keys(meas(e)).length) || history[0] || {};
  const firstM = meas(firstEntry);
  const filled = defs.filter(m => curM[m.key] != null);

  const tbody = document.getElementById('meas-tbody');
  const table = document.getElementById('meas-table');
  const empty = document.getElementById('meas-empty');
  const legEl = document.getElementById('body-legend');
  const figEl = document.getElementById('body-figure');

  if (!filled.length) {
    if (table) table.style.display = 'none';
    if (empty) empty.style.display = 'block';
    if (legEl) legEl.innerHTML = '';
    if (figEl) figEl.innerHTML = '';
    return;
  }
  if (table) table.style.display = '';
  if (empty) empty.style.display = 'none';

  tbody.innerHTML = filled.map(m => {
    const startV = firstM[m.key], curV = curM[m.key];
    let deltaCell = '<td class="meas-delta-neu">—</td>';
    if (startV != null && curV != null && history.length > 1 && startV !== curV) {
      const diff = (curV - startV).toFixed(1);
      const good = m.goodDown ? +diff <= 0 : +diff >= 0;
      deltaCell = `<td class="${good ? 'meas-delta-pos' : 'meas-delta-neg'}">${+diff > 0 ? '+' : ''}${diff} ${m.unit}</td>`;
    }
    return `<tr><td style="font-weight:600">${m.label}</td><td>${startV != null ? startV + ' ' + m.unit : '—'}</td><td>${curV} ${m.unit}</td>${deltaCell}</tr>`;
  }).join('');

  // Morphing silhouette: dashed "start" outline vs filled "latest" shape.
  const hasStart = history.length > 1 && Object.keys(firstM).length > 0;
  buildBodyFigure(hasStart ? firstM : null, curM);
  if (legEl) {
    legEl.innerHTML = hasStart
      ? '<div class="body-legend-item"><span class="body-legend-key body-legend-start"></span>Starting week</div>'
        + '<div class="body-legend-item"><span class="body-legend-key body-legend-latest"></span>Latest week</div>'
      : '<div class="body-legend-item"><span class="body-legend-key body-legend-latest"></span>Latest week</div>';
  }
}

/* Parametric humanoid whose torso / waist / hips widths follow the actual
   measurements. Draws a dashed START outline behind a filled LATEST shape so
   the change between the two weeks is visible at a glance. */
function buildBodyFigure(startM, curM) {
  const fig = document.getElementById('body-figure');
  if (!fig) return;

  // Derive body half-widths (px) directly proportional to each measurement, with
  // sensible fallbacks. Proportional (not deviation-from-a-baseline) so ANY two
  // weeks render at clearly different widths — realistic adult sizes land
  // mid-range, and even out-of-range test values stay distinct instead of both
  // collapsing onto a clamp floor.
  const shape = (m) => {
    const waist = num(m.waist) ?? (num(m.weight) != null ? num(m.weight) * 1.02 : 80);
    const chest = num(m.chest) ?? waist + 12;
    const hips = num(m.hips) ?? waist + 10;
    return {
      chestHalf: clamp(chest * 0.32, 8, 46),
      waistHalf: clamp(waist * 0.32, 7, 44),
      hipHalf: clamp(hips * 0.32, 8, 46),
    };
  };

  const body = (s, opts) => {
    const cx = 60;
    // Key vertical anchors on the 120×230 canvas.
    const shoulderY = 58, chestY = 78, waistY = 118, hipY = 150, kneeY = 196, ankleY = 224;
    const ch = s.chestHalf, wa = s.waistHalf, hp = s.hipHalf;
    const legTop = hp * 0.62, ankle = 6;
    const torso =
      `M${cx - ch * 0.7} ${shoulderY} `
      + `C${cx - ch} ${chestY - 6} ${cx - ch} ${chestY} ${cx - ch} ${chestY} `
      + `C${cx - wa - 2} ${chestY + 14} ${cx - wa} ${waistY - 8} ${cx - wa} ${waistY} `
      + `C${cx - hp} ${waistY + 12} ${cx - hp} ${hipY - 6} ${cx - hp} ${hipY} `
      + `L${cx + hp} ${hipY} `
      + `C${cx + hp} ${hipY - 6} ${cx + hp} ${waistY + 12} ${cx + wa} ${waistY} `
      + `C${cx + wa} ${waistY - 8} ${cx + wa + 2} ${chestY + 14} ${cx + ch} ${chestY} `
      + `C${cx + ch} ${chestY} ${cx + ch} ${chestY - 6} ${cx + ch * 0.7} ${shoulderY} Z`;
    // Legs (simple tapered).
    const legL = `M${cx - hp} ${hipY} L${cx - legTop} ${kneeY} L${cx - ankle - 6} ${ankleY} L${cx - 2} ${ankleY} L${cx - 2} ${hipY} Z`;
    const legR = `M${cx + hp} ${hipY} L${cx + legTop} ${kneeY} L${cx + ankle + 6} ${ankleY} L${cx + 2} ${ankleY} L${cx + 2} ${hipY} Z`;
    const head = `<circle cx="${cx}" cy="34" r="16" ${opts.attrs}/>`;
    const neck = `<rect x="${cx - 6}" y="47" width="12" height="12" rx="4" ${opts.attrs}/>`;
    return `${head}${neck}<path d="${torso}" ${opts.attrs}/><path d="${legL}" ${opts.attrs}/><path d="${legR}" ${opts.attrs}/>`;
  };

  const parts = [];
  if (startM) {
    parts.push(body(shape(startM), {
      attrs: 'fill="none" stroke="var(--ink4)" stroke-width="2" stroke-dasharray="4 4" stroke-linejoin="round"',
    }));
  }
  parts.push(body(shape(curM), {
    attrs: 'fill="var(--brand-light)" stroke="var(--brand)" stroke-width="2.5" stroke-linejoin="round"',
  }));

  fig.innerHTML =
    `<svg width="130" height="238" viewBox="0 0 120 232" fill="none" xmlns="http://www.w3.org/2000/svg">${parts.join('')}</svg>`;
}

function num(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/* ═══════════════════════════════════════════
   HEALTH-SCORE JOURNEY ROADMAP (ported from v5)
═══════════════════════════════════════════ */
let radarChartInst = null;

function buildRoadmap(history) {
  const wrap = document.getElementById('roadmap-wrap');
  if (!wrap) return;
  try {
    const hs = e => Math.round(((((e.q1?.energy || 0) + (e.q1?.mood || 0) + (e.q1?.motivation || 0)) / 3) || 0) * 10) / 10;
    const color = sc => sc >= 8 ? '#16A34A' : sc >= 6 ? '#F59E0B' : '#C1121F';
    const nodes = history.map((e, i) => {
      const sc = hs(e);
      const isLast = i === history.length - 1;
      const prevSc = i > 0 ? hs(history[i - 1]) : null;
      const delta = prevSc !== null ? (sc - prevSc).toFixed(1) : null;
      const deltaHtml = delta !== null
        ? `<div class="rm-delta ${+delta >= 0 ? 'up' : 'down'}">${+delta >= 0 ? '↑ +' : '↓ '}${Math.abs(delta)}</div>` : '';
      return `<div class="rm-node${isLast ? ' current' : ''}">${isLast ? '<div class="rm-you-are-here">📍 You are here</div>' : ''}<div class="rm-score-bubble" style="background:${color(sc)}">${sc || '?'}</div><div class="rm-week-lbl">Wk ${i + 1}</div>${deltaHtml}</div>`;
    });
    nodes.push(`<div class="rm-node" style="opacity:.4"><div class="rm-score-bubble" style="background:var(--bg2);border:2px dashed var(--border-hi);color:var(--ink4)">?</div><div class="rm-week-lbl">Wk ${history.length + 1}</div></div>`);
    wrap.innerHTML = `<div class="roadmap-track">${nodes.join('')}</div>`;
  } catch (err) { console.error('roadmap', err); }
}

/* ═══════════════════════════════════════════
   HABIT & STATE HEAT MAP (ported from v5)
═══════════════════════════════════════════ */
const HM_DEFS = [
  {key: 'sleepq', label: '😴 Sleep Quality', interp: v => `Sleep quality of ${v}/10. ${v >= 8 ? 'Excellent — your body is repairing and consolidating memory effectively.' : v >= 5 ? 'Moderate — there may be disruptions affecting deep sleep. Consider your night ritual consistency.' : 'Low — poor sleep affects every other marker, including energy, cortisol and fat metabolism.'}`},
  {key: 'stressadapt', label: '🧘 Stress Adaptability', interp: v => `Stress adaptability: ${v}/10. ${v >= 8 ? 'High resilience — you are managing stress effectively this week.' : v >= 5 ? 'Moderate — some stress is not being processed well. Breathing before meals helps reset the nervous system.' : 'Low — chronic unprocessed stress raises cortisol and stalls fat loss and recovery.'}`},
  {key: 'activeness', label: '⚡ Activeness & Energy', interp: v => `Energy & activeness: ${v}/10. ${v >= 8 ? 'High energy — your habits are supporting optimal cellular function.' : v >= 5 ? 'Moderate — supplement consistency and post-meal movement can boost output.' : 'Low — check sleep, supplements and movement. Even a 10-min walk after meals shifts this.'}`},
  {key: 'digestion', label: '🌿 Digestion / Bloating', interp: v => `Digestion: ${v}/10. ${v >= 8 ? 'Good digestive function — your eating habits and rituals are supporting gut health.' : v >= 5 ? 'Moderate — try breathing before meals to activate the parasympathetic state before eating.' : 'Poor — can indicate high stress, poor food choices, or insufficient movement after meals.'}`},
  {key: 'brainfog', label: '🧠 Brain Fog', interp: v => `Brain fog: ${v}/10. ${v >= 8 ? 'Sharp and clear — low inflammation and good sleep are supporting cognition.' : v >= 5 ? 'Moderate — hydration, sleep quality and blood sugar stability all affect clarity.' : 'High fog — often links to poor sleep, high cortisol, or blood sugar crashes. Prioritise sleep and protein.'}`},
  {key: 'pain', label: '🩹 Body Pains / Stiffness', interp: v => `Body pain/stiffness: ${v}/10. ${v >= 8 ? 'Low pain — your movement and recovery habits keep inflammation in check.' : v >= 5 ? 'Moderate — consider gentle stretching or feet massage as part of your night ritual.' : 'High — may indicate insufficient recovery, high cortisol, or inflammatory food patterns.'}`},
  {key: 'cravings', label: '🍫 Cravings', interp: v => `Cravings: ${v}/10. ${v >= 8 ? 'Low cravings — protein consistency and blood sugar stability are working well.' : v >= 5 ? 'Moderate — front-loading protein at breakfast reduces afternoon cravings.' : 'High — a signal of blood sugar instability, poor sleep, or stress. Protein and post-meal walks help.'}`},
  {key: 'movement', label: '🏃 Movement', interp: v => `Movement: ${v}/10. ${v >= 8 ? 'Excellent — consistent activity supports fat metabolism and insulin sensitivity.' : v >= 5 ? 'Moderate — aim to increase daily movement, especially post-meal walks.' : 'Low — reducing insulin sensitivity and energy. Even 10 minutes after each meal makes a difference.'}`},
];

function buildHeatmap(latest) {
  const grid = document.getElementById('heatmap-grid');
  if (!grid) return;
  const q2 = latest.q2 || {};
  const filled = HM_DEFS.filter(h => q2[h.key] != null);
  if (!filled.length) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1">Complete the inner-state section in your check-in to see the heat map.</div>';
    return;
  }
  const cols = Math.min(4, filled.length);
  grid.style.gridTemplateColumns = `repeat(${cols},1fr)`;
  grid.innerHTML = filled.map(h => {
    const v = q2[h.key];
    const cls = v >= 8 ? 'green' : v >= 5 ? 'orange' : 'red';
    return `<div class="hm-cell ${cls}" onclick="openHmCard('${escAttr(h.label)}',${v},'${escAttr(h.interp(v))}')"><div class="hm-name">${h.label}</div><div class="hm-score">${v}/10</div></div>`;
  }).join('');
}

function openHmCard(label, score, interp) {
  const col = score >= 8 ? '#16A34A' : score >= 5 ? '#F59E0B' : '#C1121F';
  const badge = score >= 8 ? {t: 'Good', bg: 'rgba(22,163,74,0.12)'} : score >= 5 ? {t: 'Monitor', bg: 'rgba(245,158,11,0.14)'} : {t: 'Needs Attention', bg: 'rgba(193,18,31,0.10)'};
  const lbl = document.getElementById('hm-card-label');
  lbl.textContent = 'Health Area'; lbl.style.color = col;
  document.getElementById('hm-card-title').textContent = label;
  const sc = document.getElementById('hm-card-score');
  sc.textContent = score + '/10'; sc.style.color = col;
  document.getElementById('hm-card-body').textContent = interp;
  document.getElementById('hm-card-badge-wrap').innerHTML = `<span class="hm-card-badge" style="background:${badge.bg};color:${col}">${badge.t}</span>`;
  const d = document.getElementById('hm-detail');
  if (d) { d.style.display = 'block'; d.scrollIntoView({behavior: 'smooth', block: 'nearest'}); }
}

function closeHmCard() {
  const d = document.getElementById('hm-detail');
  if (d) d.style.display = 'none';
}

/* ═══════════════════════════════════════════
   INNER STATE RADAR (ported from v5)
═══════════════════════════════════════════ */
function buildRadar(latest, prev) {
  const canvas = document.getElementById('radarChart');
  if (!canvas || typeof Chart === 'undefined') return;
  try {
    if (radarChartInst) { try { radarChartInst.destroy(); } catch (e) {} radarChartInst = null; }
    const q2 = latest.q2 || {}, pq2 = prev?.q2 || {};
    const defs = [
      {k: 'sleepq', l: '😴 Sleep'}, {k: 'stressadapt', l: '🧘 Stress'}, {k: 'activeness', l: '⚡ Energy'},
      {k: 'digestion', l: '🌿 Digestion'}, {k: 'brainfog', l: '🧠 Clarity'}, {k: 'pain', l: '🩹 Low Pain'},
      {k: 'cravings', l: '🍫 Cravings'}, {k: 'movement', l: '🏃 Movement'},
    ];
    const cur = defs.map(d => q2[d.k] || 0);
    const datasets = [{
      label: 'This Week', data: cur, borderColor: '#C1121F', backgroundColor: 'rgba(193,18,31,0.14)',
      borderWidth: 2.5, pointBackgroundColor: '#C1121F', pointRadius: 4, pointHoverRadius: 6,
    }];
    if (prev) datasets.push({
      label: 'Last Week', data: defs.map(d => pq2[d.k] || 0), borderColor: 'rgba(21,163,74,0.6)',
      backgroundColor: 'rgba(21,163,74,0.05)', borderWidth: 1.5, borderDash: [5, 4], pointBackgroundColor: '#15A34A', pointRadius: 3,
    });
    radarChartInst = new Chart(canvas.getContext('2d'), {
      type: 'radar', data: {labels: defs.map(d => d.l), datasets},
      options: {responsive: true, maintainAspectRatio: false,
        plugins: {legend: {display: false}, tooltip: {backgroundColor: '#0F172A', titleColor: '#fff', bodyColor: 'rgba(255,255,255,0.7)', callbacks: {label: c => `${c.dataset.label}: ${c.parsed.r}/10`}}},
        scales: {r: {min: 0, max: 10, angleLines: {color: 'rgba(15,23,42,0.08)'}, grid: {color: 'rgba(15,23,42,0.08)'},
          pointLabels: {font: {family: 'Plus Jakarta Sans', size: 11}, color: '#334155'}, ticks: {display: false}}}},
    });
    const weak = defs.filter(d => (q2[d.k] || 0) > 0 && (q2[d.k] || 0) < 6).map(d => d.l.split(' ').slice(1).join(' '));
    const rsEl = document.getElementById('radar-score-summary');
    if (rsEl) rsEl.textContent = cur.every(v => !v) ? '' : (weak.length ? `Focus areas this week: ${weak.join(', ')}.` : 'All 8 markers are looking healthy this week!');
  } catch (err) { console.error('radar', err); }
}

/* ═══════════════════════════════════════════
   SLIDE 3 — COST OF DELAY + SIMULATOR
═══════════════════════════════════════════ */
function buildSlide3(latest) {
  if(!latest) return;
  const q1   = latest.q1||{};
  const gm   = q1.goalMonths||3;
  const cons = latest.consistency||0;
  const intent = q1.motivation||0;
  const bns  = q1.bottlenecks||[];
  const history = getHistory();

  // Compute progress statement
  const last3 = history.slice(-3).map(e=>e.consistency||0);
  const trend  = last3.length > 1 ? last3[last3.length-1] - last3[0] : 0;
  const intentScore   = intent > 0 ? (intent/10)*100 : cons;
  const momentumBonus = trend > 0 ? Math.min(10, trend) : Math.max(-10, trend);
  const compositeScore= Math.round(cons * 0.5 + intentScore * 0.3 + (cons + momentumBonus) * 0.2);
  const progressPct   = Math.min(100, Math.max(0, compositeScore));

  const ttg         = cons > 0 ? gm / (cons/100) : null;
  const delayMonths = ttg ? ttg - gm : null;
  const delayDays   = delayMonths ? Math.round(delayMonths * 30) : 0;
  const delayWeeks  = Math.ceil(delayDays / 7);
  const isAhead     = delayDays <= 0;

  // Build intent banner
  let headlineText, bodyText, factorTags;
  if (isAhead) {
    headlineText = `WITH YOUR CURRENT INTENT, YOU ARE ${progressPct}% CLOSER TO YOUR GOAL.`;
    const habitHighlights = [];
    if (q1.nightritual >= 5) habitHighlights.push('sleep ritual');
    if (q1.walking >= 5)     habitHighlights.push('daily movement');
    if (q1.protein === 'yes') habitHighlights.push('protein consistency');
    if (q1.supplements >= 5) habitHighlights.push('supplementation');
    bodyText = `Your recent consistency score of ${cons}% is working in your favour.${habitHighlights.length ? ' Your consistency around '+habitHighlights.join(', ')+' has created positive momentum.' : ''}${trend > 5 ? ' Consistency has been trending upward — this momentum is compounding.' : ''} If maintained at this level, this trajectory will accelerate progress over the coming weeks.`;
    factorTags = habitHighlights.map(h=>`<span class="intent-factor positive">✓ ${h}</span>`).join('');
  } else {
    headlineText = `WITH YOUR CURRENT INTENT, YOU ARE EXPERIENCING A DELAY OF APPROXIMATELY ${delayWeeks} WEEK${delayWeeks>1?'S':''} TOWARDS YOUR HEALTH GOAL.`;
    const delayDrivers = [];
    if (bns.includes('Late Nights') || q1.sleepquality < 6) delayDrivers.push('inconsistent sleep');
    if (bns.includes('Emotional Eating')) delayDrivers.push('emotional eating episodes');
    if (q1.protein !== 'yes')  delayDrivers.push('insufficient protein');
    if (q1.stress > 7)         delayDrivers.push('high stress');
    if (q1.supplements < 4)    delayDrivers.push('missed supplements');
    bodyText = `At ${cons}% consistency, your goal timeline extends beyond the planned ${gm} months.${delayDrivers.length ? ' Key contributing factors include: '+delayDrivers.join(', ')+'.' : ''} Improving consistency to 70%+ and addressing your top bottleneck this week will create a meaningful shift in your trajectory.`;
    factorTags = delayDrivers.map(d=>`<span class="intent-factor">⚠ ${d}</span>`).join('');
  }

  // Dramatic visual display
  const delayDisplay  = isAhead ? `+${progressPct}%` : `${delayWeeks}W`;
  const delayUnit     = isAhead ? 'AHEAD OF GOAL' : 'DELAY';

  document.getElementById('intent-progress-statement').innerHTML = `
    <div class="intent-banner${isAhead?' is-ahead':''}">
      <div style="text-align:center;flex-shrink:0;min-width:130px">
        <div class="intent-delay-big${isAhead?' ahead':''}">${delayDisplay}</div>
        <div class="intent-delay-unit${isAhead?' ahead':''}">${delayUnit}</div>
        <div style="font-family:var(--font-mono);font-size:9px;color:rgba(247,245,240,0.25);margin-top:8px">${cons}% CONSISTENCY</div>
      </div>
      <div class="intent-content">
        <div class="intent-eyebrow">Your Progress Statement · Week</div>
        <div class="intent-headline">${esc(headlineText)}</div>
        <div class="intent-body">${esc(bodyText)}</div>
        ${factorTags ? `<div class="intent-factors">${factorTags}</div>` : ''}
      </div>
    </div>`;

  // Cost of delay card
  const nars=[];
  if(q1.sleepquality<6) nars.push('Poor sleep is costing you energy, focus, and fat burning every night.');
  if(q1.stress>7) nars.push('High stress is raising cortisol, stalling fat loss, and affecting every other health marker.');
  if(q1.protein!=='yes') nars.push('Missing protein means more cravings, slower metabolism, and muscle loss over time.');
  if(bns.includes('Emotional Eating')) nars.push('Emotional eating is undoing days of good choices in single episodes.');
  if(!nars.length) nars.push(`At ${cons}% consistency, you are ${delayDays>0?delayDays+' days behind your goal':'on track'}. Keep pushing!`);
  document.getElementById('cost-narrative').textContent=nars.join(' ');

  const reasons=[];
  if(bns.includes('Late Nights')||q1.sleepquality<6) reasons.push({label:'Late nights / poor sleep',days:'+2–3 days'});
  if(bns.includes('Emotional Eating')) reasons.push({label:'Emotional eating (3+ episodes)',days:'+2 days'});
  if(q1.protein!=='yes') reasons.push({label:'Inconsistent protein',days:'+1–2 days'});
  if(q1.stress>7) reasons.push({label:'High stress level',days:'+1–2 days'});
  if(q1.supplements<4) reasons.push({label:'Missed supplements',days:'+1 day'});
  document.getElementById('cost-breakdown-list').innerHTML=reasons.map(r=>`<div class="cost-item"><div style="font-size:12px;color:var(--ink2)">• ${r.label}</div><div class="cost-item-days">${r.days}</div></div>`).join('');

  buildHabitsToImprove(latest);
  updateSim();
}

/* ═══════════════════════════════════════════
   HABITS TO FOCUS ON (ported from v5)
═══════════════════════════════════════════ */
function buildHabitsToImprove(latest) {
  const wrap = document.getElementById('habits-to-improve');
  if (!wrap) return;
  const q1 = latest.q1 || {};
  const sugs = [];
  if ((q1.nightritual || 0) < 4) sugs.push({icon: '🌙', title: 'Night Ritual Consistency', desc: 'Your night healing ritual was low this week. Anchor it to an existing habit — e.g. start it right after you brush your teeth.'});
  if ((q1.walking || 0) < 10) sugs.push({icon: '🚶', title: 'Walking After Meals', desc: 'Post-meal walking manages blood sugar, aids digestion and boosts energy. Aim for at least 10 minutes after each meal.'});
  if ((q1.supplements || 0) < 4) sugs.push({icon: '💊', title: 'Supplement Consistency', desc: 'Supplements were taken fewer than 4 days — missing days creates nutrient gaps. Keep them visible, next to your toothbrush or meals.'});
  if ((q1.breathing || 0) < 10) sugs.push({icon: '🧘', title: 'Breathing Before Meals', desc: 'Breathing before meals activates the parasympathetic state, improving digestion. Even 3 deep breaths before eating helps.'});
  if (!sugs.length) sugs.push({icon: '⭐', title: 'Excellent Habit Consistency', desc: 'You are doing well across all tracked habits this week! Keep it up and focus on deepening the quality of each habit.'});
  wrap.innerHTML = sugs.slice(0, 4).map(s =>
    `<div class="habit-improve-item"><div class="habit-improve-icon">${s.icon}</div><div class="habit-improve-text"><div class="habit-improve-title">${s.title}</div><div class="habit-improve-desc">${s.desc}</div></div></div>`
  ).join('');
}

/* ═══════════════════════════════════════════
   CONFETTI (ported from v5)
═══════════════════════════════════════════ */
function runConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  canvas.style.display = 'block';
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const colors = ['#C1121F', '#16A34A', '#F59E0B', '#0F172A', '#22C55E', '#E5484D'];
  const pieces = Array.from({length: 120}, () => ({
    x: Math.random() * canvas.width, y: -10,
    vx: (Math.random() - .5) * 4, vy: Math.random() * 3 + 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: Math.random() * 8 + 4, rot: Math.random() * 360, vrot: (Math.random() - .5) * 8,
  }));
  let frame = 0;
  (function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * Math.PI / 180);
      ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
      p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.rot += p.vrot;
    });
    if (++frame < 180) requestAnimationFrame(draw);
    else { ctx.clearRect(0, 0, canvas.width, canvas.height); canvas.style.display = 'none'; }
  })();
}

async function clearAllData(){
  if(!confirm('Clear all weekly history? Profile will be kept.')) return;
  try {
    await api.clearSubmissions(getCurrentClientId());
    currentHistory = [];
    adminHistory = null;
    currentEntry = null;
    if(lineChartInst){lineChartInst.destroy();lineChartInst=null;}
    buildOverview();
    buildProgress();
  } catch (error) {
    console.error(error);
    showError('Weekly history could not be cleared.');
  }
}
