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
  const syncBanner = fbEnabled() ? "" :
    `<div class="sync-setup-banner">
       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:0 0 16px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
       <span><b>Real-time sync is not active.</b> Data saved on this device will not appear on other devices.
       To enable cross-device sync, fill in your Firebase credentials in
       <code>js/firebase-config.js</code> — see the instructions at the top of that file, or visit
       <a href="https://console.firebase.google.com" target="_blank" rel="noopener">console.firebase.google.com</a>.</span>
     </div>`;
  if(view === "dashboard")       el.innerHTML = syncBanner + renderDashboard();
  else if(view === "masterlist") el.innerHTML = syncBanner + renderMasterlist();
  else if(view === "reporting")  el.innerHTML = syncBanner + renderReporting();
  else if(view === "auditlog")   el.innerHTML = syncBanner + renderAuditLog();
  else                           el.innerHTML = syncBanner + renderTaxPage(view);
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
