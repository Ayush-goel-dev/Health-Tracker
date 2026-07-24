/* ═══════════════════════════════════════════
   SLIDE 2 — PROGRESS TRACKER
═══════════════════════════════════════════ */
function buildSlide2(latest,prev,history) {
  const user2 = getUser();
  const totalWeeks2 = user2?.weeks || 12;
  const pill2 = document.getElementById('p2-week');
  if (pill2) pill2.textContent = `Week ${Math.min(history.length,totalWeeks2)} of ${totalWeeks2}`;
  if (!latest) {
    const tl=document.getElementById('fayde-timeline-all');
    if(tl) tl.innerHTML='<div class="empty-state">No wins logged yet. Complete a check-in to see your wins here.</div>';
    return;
  }
  const q2=latest.q2||{}; const pq2=prev?.q2||{};
  const mn = document.getElementById('dash-meas-note');
  if(mn) mn.textContent = q2.measurementsNote || 'No measurement notes logged this week.';

  buildWinsCelebration(latest);

  // Life Improvements Timeline
  const timelineEl = document.getElementById('fayde-timeline-all');
  if (!history.length) {
    timelineEl.innerHTML = '<div class="empty-state">No wins logged yet. Complete a check-in to see your wins here.</div>';
  } else {
    const viewingIdx = typeof selectedWeekIndex !== 'undefined' ? selectedWeekIndex : null;
    timelineEl.innerHTML = history.map((entry, idx) => {
      const wkNum = idx + 1;
      const isLatest = idx === history.length - 1;
      const isViewing = viewingIdx === idx;
      const q3w = entry.q3 || {};
      const wins = [q3w.winBiggest, q3w.winFamily, q3w.winWork].filter(Boolean);
      const winsHtml = wins.length
        ? wins.map(w=>`<div class="fayde-win-item"><span class="fayde-check">✓</span><span>${esc(w)}</span></div>`).join('')
        : `<div class="fayde-empty-line"><span class="fayde-check">✓</span><span>No wins logged</span></div>`;
      return `<div class="fayde-week-entry${isLatest?' latest':''}${isViewing?' viewing':''}" onclick="viewWeek(${idx})" title="View Week ${wkNum} data" role="button" tabindex="0">
        <div class="fayde-week-label">Week ${wkNum} ›</div>
        <div class="fayde-week-wins">${winsHtml}</div>
      </div>`;
    }).join('');
  }

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
  const sv = +document.getElementById('sim-slider').value;
  document.getElementById('sim-pct-display').textContent = sv + '%';
  document.getElementById('range-fill-el').style.width = sv + '%';
  const box = document.getElementById('sim-pct-box');
  if (box) box.textContent = sv + '%';
  const history = getHistory();
  const latest = history.length ? history[history.length - 1] : null;
  const gm = latest?.q1?.goalMonths || 3;
  const curCons = latest?.consistency || 0;
  const curTime = curCons > 0 ? gm / (curCons / 100) : null;
  const simTime = sv > 0 ? gm / (sv / 100) : null;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('sim-cur-pct', curCons ? curCons + '%' : '—');
  set('sim-cur-months', curTime ? curTime.toFixed(1) + ' mo' : '—');
  set('sim-time', simTime ? simTime.toFixed(1) + ' mo' : '∞');
  const insEl = document.getElementById('sim-insight');
  if (insEl && simTime) {
    if (sv >= 90) insEl.textContent = `🔥 At ${sv}% consistency, you hit your goal in ${simTime.toFixed(1)} months — ${Math.abs((simTime - gm).toFixed(1))} months ${simTime < gm ? 'ahead of' : 'behind'} schedule.`;
    else if (sv >= 70) insEl.textContent = `💪 At ${sv}%, you reach your goal in ${simTime.toFixed(1)} months. Good trajectory — push harder for faster results.`;
    else if (sv >= 50) insEl.textContent = `⚠️ At ${sv}%, your goal takes ${simTime.toFixed(1)} months — ${(simTime - gm).toFixed(1)} months longer than planned.`;
    else insEl.textContent = `🚨 At ${sv}%, your goal could take ${simTime.toFixed(1)} months. Small daily improvements matter enormously.`;
  }
}
