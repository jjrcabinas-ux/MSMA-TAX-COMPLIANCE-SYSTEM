"use strict";
/* ============================================================
   DOM helper
============================================================ */
const $ = id => document.getElementById(id);

/* ============================================================
   PST-pinned date helpers
============================================================ */
const MONTHS = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];

function nowPST(){
  const fmt = new Intl.DateTimeFormat("en-PH", {
    timeZone:"Asia/Manila", year:"numeric", month:"2-digit", day:"2-digit",
    hour:"2-digit", minute:"2-digit", hour12:false
  });
  const p = {};
  fmt.formatToParts(new Date()).forEach(x => p[x.type] = x.value);
  return { y:+p.year, m:+p.month, d:+p.day, hh:p.hour, mm:p.minute };
}
function ymdInt(y,m,d){ return y*10000+m*100+d; }
function todayInt(){ const t=nowPST(); return ymdInt(t.y,t.m,t.d); }
function dateStampPST(){ const t=nowPST(); return `${t.y}-${String(t.m).padStart(2,"0")}-${String(t.d).padStart(2,"0")}`; }
function daysBetween(fromInt, toYmd){
  const f = new Date(Date.UTC(Math.floor(fromInt/10000), Math.floor(fromInt/100)%100-1, fromInt%100));
  const t = new Date(Date.UTC(toYmd.y, toYmd.m-1, toYmd.d));
  return Math.round((t-f)/86400000);
}
function lastDayOf(y,m){ return new Date(Date.UTC(y,m,0)).getUTCDate(); }
function addDays(y,m,d,n){
  const dt = new Date(Date.UTC(y,m-1,d)); dt.setUTCDate(dt.getUTCDate()+n);
  return { y:dt.getUTCFullYear(), m:dt.getUTCMonth()+1, d:dt.getUTCDate() };
}
function ordinal(n){ const s=["th","st","nd","rd"], v=n%100; return n+(s[(v-20)%10]||s[v]||s[0]); }
function fmtYmd(o){ return `${MONTHS[o.m-1].slice(0,3)} ${o.d}, ${o.y}`; }

/* ============================================================
   String helpers
============================================================ */
function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function fmtMoney(v){
  if(v === "" || v === null || v === undefined || isNaN(+v)) return "—";
  return "₱" + (+v).toLocaleString("en-PH",{minimumFractionDigits:2, maximumFractionDigits:2});
}

/* ============================================================
   CSV export helper
============================================================ */
function downloadCsv(lines, name){
  const blob = new Blob([lines.join("\r\n")], {type:"text/csv"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
  toast("CSV exported");
}

/* ============================================================
   Toast notification
============================================================ */
let toastTimer;
function toast(msg){
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove("show"), 2400);
}
