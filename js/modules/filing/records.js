"use strict";
/* ============================================================
   Filing records module — pipeline actions, client & record modals
============================================================ */

/* ---- Page event wiring (called after each render) ---- */
function wirePageEvents(){
  const s = $("search");
  if(s) s.addEventListener("input", e=>{ searchQ = e.target.value; rerenderKeepFocus(); });
  const ff = $("filterFlag");
  if(ff) ff.addEventListener("change", e=>{ filterFlag = e.target.value; render(); });
  const fc = $("filterChan");
  if(fc) fc.addEventListener("change", e=>{ filterChan = e.target.value; render(); });
  const add = $("btnAddClient");
  if(add) add.onclick = ()=> openClient(null);

  if(TAX_PAGES[view]){
    const ret = activeReturn[view];
    const pv = $("prevPeriod"), nx = $("nextPeriod");
    if(pv) pv.onclick = ()=>{ periods[ret] = shiftPeriod(ret, periods[ret], -1); render(); };
    if(nx) nx.onclick = ()=>{ periods[ret] = shiftPeriod(ret, periods[ret], 1); render(); };
    document.querySelectorAll(".subtab").forEach(b=>{
      b.onclick = ()=>{ activeReturn[view] = b.dataset.ret; render(); };
    });
  }
}
function rerenderKeepFocus(){
  const pos = $("search") ? $("search").selectionStart : 0;
  render();
  const s = $("search");
  if(s){ s.focus(); s.setSelectionRange(pos,pos); }
}

/* ---- Pipeline step actions ---- */
window.stepRec = function(ret, clientId, dir){
  const rec = getRecord(ret, periods[ret], clientId);
  if(dir === 1 && rec.stage < STEPS.length){
    const step = STEPS[rec.stage];
    rec.dates[step.key] = dateStampPST();
    rec.stage++;
    logAudit("Step advance", `${RETURNS[ret].form} · ${clientId} → ${step.label}`);
    toast(`${RETURNS[ret].form}: ${step.label} · ${rec.dates[step.key]}`);
  } else if(dir === -1 && rec.stage > 0){
    rec.stage--;
    const step = STEPS[rec.stage];
    delete rec.dates[step.key];
    logAudit("Step rollback", `${RETURNS[ret].form} · ${clientId} rolled back before "${step.label}"`);
    toast(`Rolled back to before "${step.label}"`);
  }
  save(); render();
};

/* ---- Client modal ---- */
window.openClient = function(id){
  editingClientId = id || null;
  const c = db.clients.find(x=>x.id===id) || {};
  $("clientModalTitle").textContent = id ? "Edit client" : "Add client";
  $("fName").value = c.name || "";
  $("fTin").value = c.tin || "";
  $("fRdo").value = c.rdo || "";
  $("fAddr").value = c.address || "";
  $("fChan").value = c.channel || "eBIRForms";
  $("fGroup").value = c.efpsGroup || "";
  $("fPrep").value = c.preparer || "";
  $("fRev").value = c.reviewer || "";
  $("fNotes").value = c.notes || "";
  const tt = c.taxTypes || {};
  $("txWTC").checked = !!tt.WTC;
  $("txEWT").checked = !!tt.EWT;
  $("txVAT").checked = !!tt.VAT;
  $("txIT").checked = !!tt.IT;
  // sensible default for new clients created from a tax page
  if(!id && TAX_PAGES[view]) $("tx"+view).checked = true;
  updateTaxDdLabel();
  $("taxDd").classList.remove("open");
  resetModalPosition("clientOverlay");
  $("btnDeleteClient").style.display = id ? "inline" : "none";
  $("clientOverlay").classList.add("open");
  $("fName").focus();
};

/* ---- Applicable tax types dropdown checklist ---- */
function updateTaxDdLabel(){
  const sel = ["WTC","EWT","VAT","IT"].filter(t=>$("tx"+t).checked);
  const btn = $("taxDdBtn");
  if(sel.length){ btn.textContent = sel.join(", "); btn.classList.remove("placeholder"); }
  else { btn.textContent = "Select tax types"; btn.classList.add("placeholder"); }
}
$("taxDdBtn").onclick = e=>{
  e.stopPropagation();
  $("taxDd").classList.toggle("open");
};
document.querySelectorAll("#taxDd .dd-panel input").forEach(cb=>{
  cb.addEventListener("change", updateTaxDdLabel);
});
document.addEventListener("click", e=>{
  const dd = $("taxDd");
  if(dd && dd.classList.contains("open") && !dd.contains(e.target)) dd.classList.remove("open");
});

/* ---- Draggable modals (grab the header and move) ---- */
function resetModalPosition(overlayId){
  const m = document.querySelector(`#${overlayId} .modal`);
  if(m){ m.style.transform = ""; m.dataset.dx = 0; m.dataset.dy = 0; }
}
document.querySelectorAll(".modal header").forEach(head=>{
  head.addEventListener("mousedown", e=>{
    if(e.target.closest(".xclose")) return;      // don't drag from the close button
    const modal = head.closest(".modal");
    const startX = e.clientX, startY = e.clientY;
    const baseX = +modal.dataset.dx || 0, baseY = +modal.dataset.dy || 0;
    const move = ev=>{
      const dx = baseX + (ev.clientX - startX);
      const dy = baseY + (ev.clientY - startY);
      modal.dataset.dx = dx; modal.dataset.dy = dy;
      modal.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const up = ()=>{
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
    e.preventDefault();
  });
});

$("btnSaveClient").onclick = ()=>{
  const name = $("fName").value.trim();
  if(!name){ toast("Client name is required"); $("fName").focus(); return; }
  const data = {
    name, tin:$("fTin").value.trim(), rdo:$("fRdo").value.trim(),
    address:$("fAddr").value.trim(),
    channel:$("fChan").value,
    efpsGroup:$("fChan").value==="EFPS" ? $("fGroup").value : "",
    preparer:$("fPrep").value.trim(), reviewer:$("fRev").value.trim(), notes:$("fNotes").value.trim(),
    taxTypes:{ WTC:$("txWTC").checked, EWT:$("txEWT").checked, VAT:$("txVAT").checked, IT:$("txIT").checked }
  };
  if(editingClientId){
    Object.assign(db.clients.find(x=>x.id===editingClientId), data);
    logAudit("Client updated", `${data.name}`);
    toast("Client updated");
  } else {
    data.id = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
    db.clients.push(data);
    logAudit("Client added", `${data.name} (${data.tin||"no TIN"})`);
    toast("Client added");
  }
  save(); closeOverlays(); render();
};
$("btnDeleteClient").onclick = ()=>{
  if(!editingClientId) return;
  const c = db.clients.find(x=>x.id===editingClientId);
  if(!confirm(`Delete "${c.name}" and all of its tracked periods in the ${cluster} Cluster?`)) return;
  db.clients = db.clients.filter(x=>x.id!==editingClientId);
  Object.values(db.records).forEach(r=> delete r[editingClientId]);
  logAudit("Client deleted", `${c.name}`);
  save(); closeOverlays(); render(); toast("Client deleted");
};

/* ---- Record modal ---- */
window.openRec = function(ret, clientId){
  recCtx = { ret, clientId };
  const c = db.clients.find(x=>x.id===clientId);
  const rec = getRecord(ret, periods[ret], clientId);
  $("recModalTitle").textContent = `${c.name} · ${RETURNS[ret].form} · ${periodLabel(ret, periods[ret])}`;
  $("rTax").value = rec.taxDue;
  $("rRef").value = rec.ref || "";
  $("rNotes").value = rec.notes || "";
  $("rHistory").innerHTML = STEPS.map(s=>
    rec.dates[s.key] ? `✓ ${s.label} — <b>${rec.dates[s.key]}</b>` : `<span style="color:var(--muted)">○ ${s.label}</span>`
  ).join("<br>");
  resetModalPosition("recOverlay");
  $("recOverlay").classList.add("open");
};
$("btnSaveRec").onclick = ()=>{
  const rec = getRecord(recCtx.ret, periods[recCtx.ret], recCtx.clientId);
  const c = db.clients.find(x=>x.id===recCtx.clientId);
  rec.taxDue = $("rTax").value;
  rec.ref = $("rRef").value.trim();
  rec.notes = $("rNotes").value.trim();
  logAudit("Filing detail saved", `${c ? c.name : recCtx.clientId} · ${RETURNS[recCtx.ret].form}`);
  save(); closeOverlays(); render(); toast("Filing detail saved");
};
