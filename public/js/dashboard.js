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
  document.getElementById('ring-score-big').textContent = (rs||'—')+'/10';
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
  document.getElementById('con-pct').textContent=cons;
  document.getElementById('con-bar').style.width=cons+'%';
  const customNote = document.getElementById('con-custom-note');
  customNote.textContent = (latest.filledCustoms&&latest.filledCustoms.length)
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
  let bnHtml = '';
  if (!allBns.length) {
    bnHtml = '<div class="empty-state">No bottleneck selected this week.</div>';
  } else {
    bnHtml = allBns.map(bn => {
      const k = bnKnowledge[bn];
      if (!k) return `<div class="bn-analysis-item"><div class="bn-analysis-label">Bottleneck</div><div class="bn-analysis-title">${esc(bn)}</div></div>`;
      return `<div class="bn-analysis-item">
        <div class="bn-analysis-label">Bottleneck</div>
        <div class="bn-analysis-title">${esc(bn)}</div>
        <div class="bn-analysis-section"><div class="bn-analysis-section-label">Problem caused</div><div class="bn-analysis-section-body">${esc(k.problem)}</div></div>
        <div class="bn-impacts">${k.impacts.map(i=>`<span class="bn-impact-tag">${i}</span>`).join('')}</div>
        <div class="bn-analysis-section suggestion"><div class="bn-analysis-section-label">Suggestion</div><div class="bn-analysis-section-body">${esc(k.suggestion)}</div></div>
      </div>`;
    }).join('');
    if (notes) bnHtml += `<div style="margin-top:10px;padding:12px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);font-size:12px;color:var(--ink3);font-style:italic">"${esc(notes)}"</div>`;
  }
  document.getElementById('bottleneck-display').innerHTML = bnHtml;
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

  updateSim();
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
