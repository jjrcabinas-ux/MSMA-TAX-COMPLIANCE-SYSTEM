"use strict";
/* ============================================================
   Audit Log module — records every significant data change
============================================================ */
function renderAuditLog(){
  const log = (db && db.auditLog) ? db.auditLog : [];

  const rows = log.length
    ? log.map(entry=>`
        <tr>
          <td>${escapeHtml(entry.ts||"")}</td>
          <td class="audit-action">${escapeHtml(entry.action||"")}</td>
          <td class="audit-detail">${escapeHtml(entry.detail||"")}</td>
          <td><span class="cluster-chip" style="font-size:.7rem;">${escapeHtml(entry.cluster||cluster)}</span></td>
        </tr>`)
      .join("")
    : `<tr><td colspan="4"><div class="audit-empty">No audit entries yet. Actions such as adding clients, advancing pipeline steps, and saving filing details are recorded here automatically.</div></td></tr>`;

  return `
    <div class="page-head">
      <h1>Audit Log</h1>
      <div class="sub">${log.length} entr${log.length===1?"y":"ies"} recorded for the ${cluster} Cluster · most recent first</div>
    </div>
    <div class="toolbar">
      <button class="btn ghost" id="btnClearAudit" style="${log.length ? "" : "display:none"}">Clear log</button>
      <button class="btn" id="btnExportAudit">Export CSV</button>
    </div>
    <div class="card audit-table">
      <table>
        <thead><tr>
          <th style="min-width:145px;">Timestamp (PST)</th>
          <th>Action</th>
          <th>Detail</th>
          <th>Cluster</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

/* ---- Wire audit page buttons (called after render) ---- */
function wireAuditEvents(){
  const clr = $("btnClearAudit");
  if(clr) clr.onclick = ()=>{
    if(!confirm("Clear the entire audit log for this cluster? This cannot be undone.")) return;
    db.auditLog = [];
    save();
    render();
    toast("Audit log cleared");
  };

  const exp = $("btnExportAudit");
  if(exp) exp.onclick = ()=>{
    const log = db.auditLog || [];
    const head = ["Timestamp (PST)","Action","Detail","Cluster"];
    const lines = [head.join(","), ...log.map(e=>[
      e.ts||"", e.action||"", e.detail||"", e.cluster||cluster
    ].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(","))];
    downloadCsv(lines, `MSMA_${cluster}_audit_log_${dateStampPST()}.csv`);
  };
}
