"use strict";
/* ============================================================
   Return definitions & deadline logic
============================================================ */
const STEPS = [
  {key:"requested", label:"Data Requested",  short:"RQ"},
  {key:"received",  label:"Data Received",   short:"RC"},
  {key:"drafted",   label:"Return Drafted",  short:"DR"},
  {key:"reviewed",  label:"Reviewed",        short:"RV"},
  {key:"approved",  label:"Client Approved", short:"AP"},
  {key:"filed",     label:"Filed",           short:"FI"},
  {key:"paid",      label:"Paid",            short:"PY"},
  {key:"archived",  label:"Archived",        short:"AR"}
];
const EFPS_DAYS = {A:15,B:14,C:13,D:12,E:11};

// freq: M (monthly), Q (quarterly), A (annual)
const RETURNS = {
  "1601C":  { tax:"WTC", form:"1601-C",      name:"Withholding Tax on Compensation",  freq:"M" },
  "0619E":  { tax:"EWT", form:"0619-E",      name:"Expanded WT — Monthly Remittance", freq:"M" },
  "1601EQ": { tax:"EWT", form:"1601-EQ",     name:"Expanded WT — Quarterly Return",   freq:"Q" },
  "2550Q":  { tax:"VAT", form:"2550Q",       name:"Quarterly Value-Added Tax Return", freq:"Q" },
  "1702Q":  { tax:"IT",  form:"1702Q/1701Q", name:"Quarterly Income Tax Return",      freq:"Q" },
  "1702":   { tax:"IT",  form:"1702/1701",   name:"Annual Income Tax Return",         freq:"A" }
};
const TAX_PAGES = {
  WTC: { title:"Withholding Tax — Compensation", returns:["1601C"] },
  EWT: { title:"Withholding Tax — Expanded",     returns:["0619E","1601EQ"] },
  VAT: { title:"Value-Added Tax",                returns:["2550Q"] },
  IT:  { title:"Income Tax",                     returns:["1702Q","1702"] }
};

// period objects: monthly {y,m} · quarterly {y,q} · annual {y}
function periodKey(ret, p){
  const f = RETURNS[ret].freq;
  if(f==="M") return `${p.y}-${String(p.m).padStart(2,"0")}`;
  if(f==="Q") return `${p.y}-Q${p.q}`;
  return `${p.y}`;
}
function periodLabel(ret, p){
  const f = RETURNS[ret].freq;
  if(f==="M") return `${MONTHS[p.m-1]} ${p.y}`;
  if(f==="Q") return `Q${p.q} ${p.y}`;
  return `TY ${p.y}`;
}
function shiftPeriod(ret, p, dir){
  const f = RETURNS[ret].freq;
  if(f==="M"){
    let m=p.m+dir, y=p.y;
    if(m<1){m=12;y--;} if(m>12){m=1;y++;}
    return {y,m};
  }
  if(f==="Q"){
    let q=p.q+dir, y=p.y;
    if(q<1){q=4;y--;} if(q>4){q=1;y++;}
    return {y,q};
  }
  return {y:p.y+dir};
}
// default period = latest CLOSED period as of PST today
function defaultPeriod(ret){
  const t = nowPST();
  const f = RETURNS[ret].freq;
  if(f==="M") return t.m===1 ? {y:t.y-1,m:12} : {y:t.y,m:t.m-1};
  if(f==="Q"){
    const curQ = Math.floor((t.m-1)/3)+1;
    return curQ===1 ? {y:t.y-1,q:4} : {y:t.y,q:curQ-1};
  }
  return {y:t.y-1};
}
// deadline: returns {file:{y,m,d}, pay:{y,m,d}}
function deadlineFor(ret, client, p){
  const R = RETURNS[ret];
  if(R.freq==="M"){
    const f = p.m===12 ? {y:p.y+1,m:1} : {y:p.y,m:p.m+1};
    if(p.m===12) return { file:{...f,d:15}, pay:{...f,d:15} };  // Dec comp: Jan 15
    if(client.channel==="EFPS"){
      const d = EFPS_DAYS[client.efpsGroup] || 15;
      return { file:{...f,d}, pay:{...f,d:15} };
    }
    return { file:{...f,d:10}, pay:{...f,d:10} };
  }
  if(R.freq==="Q"){
    const endM = p.q*3, endD = lastDayOf(p.y, endM);
    if(ret==="1601EQ"){
      const f = endM===12 ? {y:p.y+1,m:1} : {y:p.y,m:endM+1};
      const d = lastDayOf(f.y, f.m);
      return { file:{...f,d}, pay:{...f,d} };  // last day of month following quarter
    }
    if(ret==="2550Q"){
      const f = endM===12 ? {y:p.y+1,m:1} : {y:p.y,m:endM+1};
      return { file:{...f,d:25}, pay:{...f,d:25} };  // 25th following quarter close
    }
    // 1702Q: 60 days after quarter close (corp); good proxy for 1701Q too
    const dl = addDays(p.y, endM, endD, 60);
    return { file:dl, pay:dl };
  }
  // annual: April 15 following taxable year
  return { file:{y:p.y+1,m:4,d:15}, pay:{y:p.y+1,m:4,d:15} };
}

function getRecord(ret, p, clientId){
  const rk = `${ret}|${periodKey(ret,p)}`;
  if(!db.records[rk]) db.records[rk] = {};
  if(!db.records[rk][clientId]) db.records[rk][clientId] = { stage:0, dates:{}, taxDue:"", ref:"", notes:"" };
  return db.records[rk][clientId];
}

function flagFor(ret, client, p, rec){
  if(rec.stage >= 8) return {cls:"green", text:"Complete", rank:4};
  if(rec.stage >= 6) return {cls:"green", text:"Filed", rank:3};
  const dl = deadlineFor(ret, client, p);
  const days = daysBetween(todayInt(), dl.file);   // >0 = days remaining
  if(days < 0)  return {cls:"red", text:"OVERDUE", rank:0};
  if(days <= 2) return {cls:"red", text:"At risk", rank:0};
  if(rec.stage < 2 && days <= 6) return {cls:"amber", text:"Chase data", rank:1};
  if(rec.stage === 0 && days <= 8) return {cls:"amber", text:"Send request", rank:1};
  return {cls:"grey", text:"On track", rank:2};
}

function clientsFor(taxType){
  return db.clients
    .filter(c => c.taxTypes && c.taxTypes[taxType])
    .sort((a,b)=>a.name.localeCompare(b.name));
}

/* ============================================================
   Audit log helper
============================================================ */
function logAudit(action, detail){
  if(!db || !db.auditLog) return;
  const t = nowPST();
  db.auditLog.unshift({
    ts: `${t.y}-${String(t.m).padStart(2,"0")}-${String(t.d).padStart(2,"0")} ${t.hh}:${t.mm}`,
    action,
    detail,
    cluster
  });
  if(db.auditLog.length > 500) db.auditLog.length = 500;
}

/* ============================================================
   UI state
============================================================ */
let view = "dashboard";   // dashboard | masterlist | WTC | EWT | VAT | IT | reporting | auditlog
let activeReturn = {};    // per tax page: which return sub-tab
let periods = {};         // per return key: current period
let recCtx = null;        // {ret, period, clientId}
let editingClientId = null;
let searchQ = "", filterFlag = "", filterChan = "";

Object.keys(RETURNS).forEach(r => periods[r] = defaultPeriod(r));
Object.keys(TAX_PAGES).forEach(t => activeReturn[t] = TAX_PAGES[t].returns[0]);
