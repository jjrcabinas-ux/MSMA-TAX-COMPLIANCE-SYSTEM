"use strict";
/* ============================================================
   App — sidebar behaviour, router, clock, boot
============================================================ */

/* ---- Sidebar ---- */
$("btnNav").onclick = ()=> document.body.classList.toggle("nav-min");
$("taxParent").onclick = ()=>{
  $("taxParent").classList.toggle("open");
  $("taxSubmenu").classList.toggle("open");
};
document.querySelectorAll(".nav-item[data-view]").forEach(b=>{
  b.onclick = ()=>{
    view = b.dataset.view;
    searchQ = ""; filterFlag = ""; filterChan = "";
    if(TAX_PAGES[view] && !$("taxSubmenu").classList.contains("open")){
      $("taxParent").classList.add("open");
      $("taxSubmenu").classList.add("open");
    }
    render();
  };
});
window.gotoView = function(v, ret){
  view = v;
  if(ret) activeReturn[RETURNS[ret].tax] = ret;
  if(TAX_PAGES[v]){
    $("taxParent").classList.add("open");
    $("taxSubmenu").classList.add("open");
  }
  render();
};

/* ---- Router ---- */
function render(){
  document.querySelectorAll(".nav-item[data-view]").forEach(b=>{
    b.classList.toggle("active", b.dataset.view === view);
  });
  $("taxParent").classList.toggle("active", !!TAX_PAGES[view]);
  const el = $("mainContent");
  if(view === "dashboard")       el.innerHTML = renderDashboard();
  else if(view === "masterlist") el.innerHTML = renderMasterlist();
  else if(view === "reporting")  el.innerHTML = renderReporting();
  else if(view === "auditlog")   el.innerHTML = renderAuditLog();
  else                           el.innerHTML = renderTaxPage(view);
  wirePageEvents();
  if(view === "reporting") wireReportingEvents();
  if(view === "auditlog")  wireAuditEvents();
}

/* ---- Overlays ---- */
document.querySelectorAll("[data-close]").forEach(b=>{
  b.onclick = ()=> $(b.dataset.close).classList.remove("open");
});
document.querySelectorAll(".overlay").forEach(o=>{
  o.addEventListener("mousedown", e=>{ if(e.target===o) o.classList.remove("open"); });
});
document.addEventListener("keydown", e=>{ if(e.key==="Escape") closeOverlays(); });
function closeOverlays(){ document.querySelectorAll(".overlay").forEach(o=>o.classList.remove("open")); }

/* ---- Clock ---- */
function tickClock(){
  const t = nowPST();
  const el = $("pstClock");
  if(el) el.innerHTML = `PST · <b>${MONTHS[t.m-1].slice(0,3)} ${t.d}, ${t.y} ${t.hh}:${t.mm}</b>`;
}
tickClock(); setInterval(tickClock, 30000);

/* ---- Boot: restore session if tab was already signed in ---- */
(function boot(){
  const saved = session.get("msma_cluster");
  if(saved && CLUSTER_HASHES[saved]) enterApp(saved);
})();
