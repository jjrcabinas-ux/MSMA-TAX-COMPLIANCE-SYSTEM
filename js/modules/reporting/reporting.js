"use strict";
/* ============================================================
   Reporting module — export functions and reports page
============================================================ */

/* ---- Export current view (sidebar button) ---- */
$("navExport").onclick = ()=>{
  let ret, filename, list;
  if(view === "masterlist" || view === "dashboard"){
    // export masterlist
    const head = ["Client","TIN","RDO","Registered Address","Channel","EFPS Group","WTC","EWT","VAT","IT","Associate in charge","Reviewer/Senior associate in charge","Notes"];
    const lines = [head.join(",")];
    [...db.clients].sort((a,b)=>a.name.localeCompare(b.name)).forEach(c=>{
      const tt = c.taxTypes||{};
      lines.push([c.name,c.tin,c.rdo,c.address||"",c.channel,c.efpsGroup||"",
        tt.WTC?"Y":"", tt.EWT?"Y":"", tt.VAT?"Y":"", tt.IT?"Y":"",
        c.preparer||"", c.reviewer||"", c.notes||""
      ].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(","));
    });
    downloadCsv(lines, `MSMA_${cluster}_masterlist.csv`);
    return;
  }
  ret = activeReturn[view];
  const p = periods[ret];
  list = clientsFor(view);
  const head = ["Client","TIN","RDO","Channel","EFPS Group","Associate in charge","Reviewer/Senior associate in charge","Stage","Flag","Tax Due","FRN",
                ...STEPS.map(s=>s.label+" date"),"Notes"];
  const lines = [head.join(",")];
  list.forEach(c=>{
    const rec = getRecord(ret, p, c.id);
    const flag = flagFor(ret, c, p, rec);
    lines.push([
      c.name, c.tin, c.rdo, c.channel, c.efpsGroup||"", c.preparer||"", c.reviewer||"",
      rec.stage>=STEPS.length ? "Archived" : rec.stage===0 ? "Not started" : STEPS[rec.stage-1].label,
      flag.text, rec.taxDue||"", rec.ref||"",
      ...STEPS.map(s=>rec.dates[s.key]||""), rec.notes||""
    ].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(","));
  });
  downloadCsv(lines, `MSMA_${cluster}_${RETURNS[ret].form.replace(/[\/ ]/g,"")}_${periodKey(ret,p)}.csv`);
};

/* ---- Reports page ---- */
function renderReporting(){
  return `
    <div class="page-head">
      <h1>Reports</h1>
      <div class="sub">Export and summarise compliance data for the ${cluster} Cluster</div>
    </div>
    <div class="report-grid">
      <div class="report-card">
        <h3>Client Masterlist Export</h3>
        <p>Download all clients with their registered details, assigned staff, and applicable tax types as a CSV file.</p>
        <button class="btn" id="rptExportMasterlist">Export masterlist CSV</button>
      </div>
      <div class="report-card">
        <h3>Filing Summary by Return</h3>
        <p>Export the current period's filing pipeline for any tax return type — stage, flag, tax due, and FRN included.</p>
        <div style="display:flex; flex-wrap:wrap; gap:8px;">
          ${Object.keys(RETURNS).map(r=>`<button class="btn ghost rpt-filing-btn" data-ret="${r}">${RETURNS[r].form}</button>`).join("")}
        </div>
      </div>
      <div class="report-card">
        <h3>At-Risk & Overdue Returns</h3>
        <p>View all clients currently flagged as <b style="color:var(--red)">Overdue</b> or <b style="color:var(--red)">At risk</b> across all return types.</p>
        <button class="btn" id="rptExportAtRisk">Export at-risk CSV</button>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Filing completion summary — all returns</div>
      <table>
        <thead><tr>
          <th>Return</th><th>Period</th><th>Clients</th><th>Filed</th><th>In progress</th>
          <th>At risk</th><th>Needs follow-up</th>
        </tr></thead>
        <tbody>
          ${Object.keys(RETURNS).map(ret=>{
            const R = RETURNS[ret];
            const { p, s } = summarize(ret);
            return `<tr>
              <td><b>${R.form}</b><div class="cmeta">${escapeHtml(R.name)}</div></td>
              <td>${periodLabel(ret,p)}</td>
              <td>${s.total}</td>
              <td><span class="flagchip green">${s.filed}</span></td>
              <td>${s.prog}</td>
              <td><span class="${s.red?"flagchip red":"cmeta"}">${s.red}</span></td>
              <td><span class="${s.amber?"flagchip amber":"cmeta"}">${s.amber}</span></td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>`;
}

/* ---- Wire reporting page buttons (called after render) ---- */
function wireReportingEvents(){
  const ml = $("rptExportMasterlist");
  if(ml) ml.onclick = ()=>{
    const head = ["Client","TIN","RDO","Registered Address","Channel","EFPS Group","WTC","EWT","VAT","IT","Associate in charge","Reviewer/Senior associate in charge","Notes"];
    const lines = [head.join(",")];
    [...db.clients].sort((a,b)=>a.name.localeCompare(b.name)).forEach(c=>{
      const tt = c.taxTypes||{};
      lines.push([c.name,c.tin,c.rdo,c.address||"",c.channel,c.efpsGroup||"",
        tt.WTC?"Y":"", tt.EWT?"Y":"", tt.VAT?"Y":"", tt.IT?"Y":"",
        c.preparer||"", c.reviewer||"", c.notes||""
      ].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(","));
    });
    downloadCsv(lines, `MSMA_${cluster}_masterlist.csv`);
  };

  document.querySelectorAll(".rpt-filing-btn").forEach(btn=>{
    btn.onclick = ()=>{
      const ret = btn.dataset.ret;
      const p = periods[ret];
      const list = clientsFor(RETURNS[ret].tax);
      const head = ["Client","TIN","RDO","Channel","EFPS Group","Associate in charge","Reviewer/Senior associate in charge","Stage","Flag","Tax Due","FRN",
                    ...STEPS.map(s=>s.label+" date"),"Notes"];
      const lines = [head.join(",")];
      list.forEach(c=>{
        const rec = getRecord(ret, p, c.id);
        const flag = flagFor(ret, c, p, rec);
        lines.push([
          c.name, c.tin, c.rdo, c.channel, c.efpsGroup||"", c.preparer||"", c.reviewer||"",
          rec.stage>=STEPS.length ? "Archived" : rec.stage===0 ? "Not started" : STEPS[rec.stage-1].label,
          flag.text, rec.taxDue||"", rec.ref||"",
          ...STEPS.map(s=>rec.dates[s.key]||""), rec.notes||""
        ].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(","));
      });
      downloadCsv(lines, `MSMA_${cluster}_${RETURNS[ret].form.replace(/[\/ ]/g,"")}_${periodKey(ret,p)}.csv`);
    };
  });

  const ar = $("rptExportAtRisk");
  if(ar) ar.onclick = ()=>{
    const head = ["Client","TIN","Return","Period","Deadline","Stage","Flag","Associate in charge"];
    const lines = [head.join(",")];
    Object.keys(RETURNS).forEach(ret=>{
      const p = periods[ret];
      clientsFor(RETURNS[ret].tax).forEach(c=>{
        const rec = getRecord(ret, p, c.id);
        const flag = flagFor(ret, c, p, rec);
        if(flag.cls === "red" || flag.cls === "amber"){
          const dl = deadlineFor(ret, c, p).file;
          lines.push([
            c.name, c.tin, RETURNS[ret].form, periodLabel(ret,p), fmtYmd(dl),
            rec.stage===0?"Not started":STEPS[rec.stage-1]?.label||"",
            flag.text, c.preparer||""
          ].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(","));
        }
      });
    });
    downloadCsv(lines, `MSMA_${cluster}_at_risk_${dateStampPST()}.csv`);
  };
}
