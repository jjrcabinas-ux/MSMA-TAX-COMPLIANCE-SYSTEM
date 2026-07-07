"use strict";
/* ============================================================
   Client Masterlist module
============================================================ */
function renderMasterlist(){
  const q = searchQ.toLowerCase();
  const rows = [...db.clients].sort((a,b)=>a.name.localeCompare(b.name)).filter(c=>{
    if(q && !(c.name.toLowerCase().includes(q) || (c.tin||"").toLowerCase().includes(q) ||
              (c.preparer||"").toLowerCase().includes(q) || (c.reviewer||"").toLowerCase().includes(q))) return false;
    if(filterChan && c.channel !== filterChan) return false;
    return true;
  }).map(c=>`
    <tr>
      <td><div class="cname" onclick="openClient('${c.id}')">${escapeHtml(c.name)}</div>
          <div class="cmeta">TIN ${escapeHtml(c.tin||"—")} · RDO ${escapeHtml(c.rdo||"—")}${c.address?"<br>"+escapeHtml(c.address):""}</div></td>
      <td><span class="chan ${c.channel==="EFPS"?"efps":"ebir"}">${c.channel}${c.channel==="EFPS"&&c.efpsGroup?" · "+c.efpsGroup:""}</span></td>
      <td>${["WTC","EWT","VAT","IT"].filter(t=>c.taxTypes&&c.taxTypes[t]).map(t=>`<span class="taxtag">${t}</span>`).join("")||"—"}</td>
      <td>${escapeHtml(c.preparer||"—")}<div class="cmeta">${c.reviewer?("Rev: "+escapeHtml(c.reviewer)):""}</div></td>
      <td>${escapeHtml(c.notes||"")}</td>
    </tr>`).join("");

  return `
    <div class="page-head">
      <h1>Client Masterlist</h1>
      <div class="sub">${db.clients.length} client${db.clients.length===1?"":"s"} in the ${cluster} Cluster · click a name to edit</div>
    </div>
    <div class="toolbar">
      <input type="search" id="search" placeholder="Search client, TIN, or staff…" value="${escapeHtml(searchQ)}">
      <select id="filterChan">
        <option value="">All channels</option>
        <option value="eBIRForms" ${filterChan==="eBIRForms"?"selected":""}>eBIRForms</option>
        <option value="EFPS" ${filterChan==="EFPS"?"selected":""}>EFPS</option>
      </select>
      <button class="btn" id="btnAddClient">+ Add client</button>
    </div>
    <div class="card">
      <table>
        <thead><tr><th style="min-width:200px;">Client</th><th>Channel</th><th>Tax types</th><th>Assigned</th><th>Notes</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${db.clients.length ? "" : `<div class="empty"><b>No clients yet.</b><br>Add your first client to start tracking compliance for this cluster.</div>`}
    </div>`;
}
