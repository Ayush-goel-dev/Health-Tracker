/* ═══════════════════════════════════════════
   SLIDE 2 — PROGRESS TRACKER
═══════════════════════════════════════════ */
function buildSlide2(latest,prev,history) {
  if (latest) buildWinsCelebration(latest);

  // Consistency chart
  if(lineChartInst){try{lineChartInst.destroy();}catch(e){} lineChartInst=null;}
  if(history.length>0){
    try {
      const ctx=document.getElementById('lineChart').getContext('2d');
      const grad=ctx.createLinearGradient(0,0,0,180);
      grad.addColorStop(0,'rgba(34,197,94,0.22)');grad.addColorStop(1,'rgba(34,197,94,0)');
      lineChartInst=new Chart(ctx,{type:'line',data:{
        labels:history.map((_,i)=>`W${i+1}`),
        datasets:[{label:'Consistency %',data:history.map(e=>e.consistency),borderColor:'#16A34A',backgroundColor:grad,borderWidth:2,pointBackgroundColor:'#16A34A',pointBorderColor:'#fff',pointRadius:4,tension:.4,fill:true}]
      },options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'#111827',borderColor:'rgba(255,255,255,0.1)',borderWidth:1,titleColor:'#fff',bodyColor:'rgba(255,255,255,0.7)',callbacks:{label:c=>` ${c.parsed.y}%`}}},scales:{x:{grid:{color:'rgba(17,24,39,0.05)'},ticks:{color:'rgba(17,24,39,0.4)',font:{family:'JetBrains Mono',size:9}}},y:{grid:{color:'rgba(17,24,39,0.05)'},ticks:{color:'rgba(17,24,39,0.4)',font:{family:'JetBrains Mono',size:9},callback:v=>v+'%'},min:0,max:100}}}});
    } catch(e) {
      const wrap=document.querySelector('#lineChart')?.parentElement;
      if (wrap) wrap.innerHTML = '<div class="empty-state">Chart unavailable — check your connection.</div>';
    }
  }
}

/* ═══════════════════════════════════════════
   THIS WEEK'S WINS CELEBRATION (ported from v5)
═══════════════════════════════════════════ */
function buildWinsCelebration(latest) {
  const card = document.getElementById('wins-celebration-card');
  const wrap = document.getElementById('wins-celebration');
  if (!card || !wrap) return;
  const q3 = latest?.q3 || {};
  if (!(q3.winBiggest || q3.winFamily || q3.winWork)) { card.style.display = 'none'; return; }
  card.style.display = 'block';
  wrap.innerHTML = `
    <div style="text-align:center;padding:8px 0 4px">
      <div style="font-size:34px;margin-bottom:6px">🎉</div>
      <div class="lit-proud">We are <span>proud of you!</span></div>
      <div style="font-size:14px;color:var(--ink3);margin-top:6px">Here's what you achieved this week</div>
    </div>
    <div class="lit-wins-grid">
      ${q3.winBiggest ? `<div class="lit-win-card featured"><div class="lit-win-icon">🏆</div><div class="lit-win-type">Biggest Win</div><div class="lit-win-text">${esc(q3.winBiggest)}</div></div>` : ''}
      ${q3.winFamily ? `<div class="lit-win-card"><div class="lit-win-icon">👨‍👩‍👧</div><div class="lit-win-type">Family / Personal</div><div class="lit-win-text">${esc(q3.winFamily)}</div></div>` : ''}
      ${q3.winWork ? `<div class="lit-win-card"><div class="lit-win-icon">💼</div><div class="lit-win-type">Work / Business</div><div class="lit-win-text">${esc(q3.winWork)}</div></div>` : ''}
    </div>`;
}

/* ═══════════════════════════════════════════
   SIMULATOR — current % vs simulated % (v5 grid)
═══════════════════════════════════════════ */
function updateSim() {
  const slider = document.getElementById('sim-slider');
  if (!slider) return;
  const sv  = +slider.value;
  const min = +slider.min || 10;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const history = getHistory();
  const latest = history.length ? history[history.length - 1] : null;
  const gm  = latest?.q1?.goalMonths || 3;
  const cur = latest?.consistency || 0;

  // Weeks behind the goal timeline at a given consistency %.
  const delayWeeks = c => {
    if (c <= 0) return null;
    const extraMonths = gm / (c / 100) - gm;
    return Math.max(0, Math.ceil(extraMonths * 30 / 7));
  };
  const wk = n => `${n} Week${n === 1 ? '' : 's'}`;
  const curDelay = delayWeeks(cur);
  const simDelay = delayWeeks(sv);
  const saved = (curDelay != null && simDelay != null) ? Math.max(0, curDelay - simDelay) : 0;

  // Slider fill (relative to its dynamic min).
  const fill = document.getElementById('range-fill-el');
  if (fill) fill.style.width = (min < 100 ? ((sv - min) / (100 - min)) * 100 : 100) + '%';

  // ── LEFT: current status ──
  set('sim2-cur-pct', cur || '—');
  const cf = document.getElementById('sim2-cur-fill');
  if (cf) cf.style.width = cur + '%';
  if (curDelay == null) {
    set('sim2-cur-delay', '—');
    set('sim2-cur-delay-sub', 'Complete a check-in to see your delay.');
  } else if (curDelay <= 0) {
    set('sim2-cur-delay', 'On track');
    set('sim2-cur-delay-sub', 'You are on track with your goal timeline. 🎉');
  } else {
    set('sim2-cur-delay', wk(curDelay));
    set('sim2-cur-delay-sub', `You are currently ${wk(curDelay).toLowerCase()} behind your goal timeline.`);
  }

  // ── RIGHT: you-will-save + time-you-get-back ──
  set('sim2-save', simDelay == null ? '—' : wk(simDelay));
  set('sim2-save-sub', simDelay == null ? 'Drag the slider to explore.' : `At ${sv}% you will be only ${wk(simDelay).toLowerCase()} behind your goal timeline.`);
  set('sim2-getback', wk(saved));
  set('sim2-getback-sub', `By improving to ${sv}% consistency, you save ${wk(saved).toLowerCase()}.`);

  // ── Delay comparison bars ──
  const maxDelay = Math.max(curDelay || 0, simDelay || 0, 1);
  const curBar = document.getElementById('sim2-cmp-cur-bar');
  const simBar = document.getElementById('sim2-cmp-sim-bar');
  if (curBar) curBar.style.width = ((curDelay || 0) / maxDelay) * 100 + '%';
  if (simBar) simBar.style.width = ((simDelay || 0) / maxDelay) * 100 + '%';
  set('sim2-cmp-cur-name', `Current (${cur}%)`);
  set('sim2-cmp-sim-name', `At ${sv}% Consistency`);
  set('sim2-cmp-cur-val', curDelay == null ? '—' : wk(curDelay));
  set('sim2-cmp-sim-val', simDelay == null ? '—' : wk(simDelay));

  // ── Insight line ──
  const insEl = document.getElementById('sim-insight');
  if (insEl) {
    if (simDelay == null) insEl.textContent = 'Enter your check-in and goal duration to see the simulation.';
    else if (saved > 0)   insEl.textContent = `🔥 Reaching ${sv}% consistency gets you back ${wk(saved).toLowerCase()} toward your goal.`;
    else if (curDelay === 0) insEl.textContent = `💪 You are already on track — keep this consistency going.`;
    else insEl.textContent = `Drag the slider up to see how much time you can save.`;
  }
}
