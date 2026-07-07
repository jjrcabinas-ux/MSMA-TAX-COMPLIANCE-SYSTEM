"use strict";
/* ============================================================
   Dashboard module
============================================================ */
function summarize(ret){
  const R = RETURNS[ret];
  const p = defaultPeriod(ret);
  const list = clientsFor(R.tax);
  const s = { total:list.length, filed:0, prog:0, amber:0, red:0, notStarted:0 };
  list.forEach(c=>{
    const rec = getRecord(ret, p, c.id);
    const f = flagFor(ret, c, p, rec);
    if(rec.stage>=6) s.filed++;
    else { s.prog++; if(rec.stage===0) s.notStarted++; }
    if(f.cls==="amber") s.amber++;
    if(f.cls==="red") s.red++;
  });
  return { p, s };
}
function renderDashboard(){
  const t = nowPST();
  let cards = "", attention = "";
  let attRows = [];

  Object.keys(RETURNS).forEach(ret=>{
    const R = RETURNS[ret];
    const { p, s } = summarize(ret);
    const pct = s.total ? Math.round(100*s.filed/s.total) : 0;
    const gDL = deadlineFor(ret, {channel:"eBIRForms"}, p).file;
    cards += `
      <div class="ret-card" onclick="gotoView('${R.tax}','${ret}')">
        <div class="rc-head">
          <span class="rc-form">${R.form}</span>
          <span class="rc-tax">${R.tax}</span>
        </div>
        <div class="rc-period">${escapeHtml(R.name)} · ${periodLabel(ret,p)} · due ${fmtYmd(gDL)}${ret==="1601C"||ret==="0619E"?" (EFPS staggered)":""}</div>
        <div class="rc-bar">
          <i style="width:${pct}%; background:var(--green);"></i>
          <i style="width:${s.total?Math.round(100*s.red/s.total):0}%; background:var(--red);"></i>
          <i style="width:${s.total?Math.round(100*s.amber/s.total):0}%; background:var(--amber);"></i>
        </div>
        <div class="rc-nums">
          <span><span class="dot" style="background:var(--green)"></span><b>${s.filed}</b>/${s.total} filed</span>
          <span><span class="dot" style="background:var(--ink)"></span><b>${s.prog}</b> in progress</span>
          <span><span class="dot" style="background:var(--amber)"></span><b>${s.amber}</b> follow-up</span>
          <span><span class="dot" style="background:var(--red)"></span><b>${s.red}</b> at risk</span>
        </div>
      </div>`;

    // attention list rows
    clientsFor(R.tax).forEach(c=>{
      const rec = getRecord(ret, p, c.id);
      const f = flagFor(ret, c, p, rec);
      if(f.cls==="red" || f.cls==="amber"){
        attRows.push({ f, c, ret, p, dl: deadlineFor(ret, c, p).file,
          stageWord: rec.stage===0 ? "Not started" : STEPS[rec.stage-1].label });
      }
    });
  });

  attRows.sort((a,b)=> a.f.rank - b.f.rank || ymdInt(a.dl.y,a.dl.m,a.dl.d) - ymdInt(b.dl.y,b.dl.m,b.dl.d));
  attention = attRows.length ? attRows.map(r=>`
    <tr>
      <td><div class="cname" onclick="gotoView('${RETURNS[r.ret].tax}','${r.ret}')">${escapeHtml(r.c.name)}</div>
          <div class="cmeta">${escapeHtml(r.c.preparer||"unassigned")}</div></td>
      <td><b>${RETURNS[r.ret].form}</b><div class="cmeta">${periodLabel(r.ret,r.p)}</div></td>
      <td class="due">${fmtYmd(r.dl)}</td>
      <td>${escapeHtml(r.stageWord)}</td>
      <td><span class="flagchip ${r.f.cls}">${r.f.text}</span></td>
    </tr>`).join("")
    : `<tr><td colspan="5"><div class="empty" style="padding:26px;">Nothing needs attention right now. <b>All returns are on track.</b></div></td></tr>`;

  return `
    <div class="page-head">
      <h1>Main Tracker</h1>
      <div class="sub">Per-return compliance summary for the ${cluster} Cluster · current open cycles as of ${MONTHS[t.m-1]} ${t.d}, ${t.y} (PST)</div>
    </div>
    <div class="ret-grid">${cards}</div>
    <div class="card">
      <div class="card-title">Needs attention <span class="pill">${attRows.length}</span></div>
      <table>
        <thead><tr><th>Client</th><th>Return</th><th>Deadline</th><th>Last step done</th><th>Flag</th></tr></thead>
        <tbody>${attention}</tbody>
      </table>
    </div>
    <p class="storage-note">Cluster data is stored in this browser (localStorage) under the ${cluster} workspace. All dates are pinned to Philippine Standard Time.</p>`;
}
