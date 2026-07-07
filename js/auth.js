"use strict";
/* ============================================================
   Auth — cluster gate (hash-obfuscated; see deployment note)
============================================================ */
const cyrb53 = (str, seed = 0) => {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};
const CLUSTER_HASHES = { RPM:8648645207156326, ADS:8324280130240436, VCM:7499670937568036 };

/* ============================================================
   Storage (localStorage w/ in-memory fallback for sandboxes)
============================================================ */
const memStore = {};
const store = {
  get(k){ try { return localStorage.getItem(k); } catch(e){ return memStore[k] ?? null; } },
  set(k,v){ try { localStorage.setItem(k,v); } catch(e){ memStore[k]=v; } },
  del(k){ try { localStorage.removeItem(k); } catch(e){ delete memStore[k]; } }
};
const memSession = {};
const session = {
  get(k){ try { return sessionStorage.getItem(k); } catch(e){ return memSession[k] ?? null; } },
  set(k,v){ try { sessionStorage.setItem(k,v); } catch(e){ memSession[k]=v; } },
  del(k){ try { sessionStorage.removeItem(k); } catch(e){ delete memSession[k]; } }
};

let cluster = null;
let db = null;
function dbKey(){ return `msma_taxcomp_v1_${cluster}`; }
function loadDb(){
  try { db = JSON.parse(store.get(dbKey())) || null; } catch(e){ db = null; }
  if(!db) db = { clients:[], records:{}, auditLog:[] };
  if(!db.auditLog) db.auditLog = [];   // migrate: ensure auditLog exists before any operation
  if(!db.clients) db.clients = [];
  if(!db.records) db.records = {};
  // migrate any clients saved under the old "WTE" tag to "EWT"
  db.clients.forEach(c=>{
    if(c.taxTypes && "WTE" in c.taxTypes){
      c.taxTypes.EWT = c.taxTypes.EWT || c.taxTypes.WTE;
      delete c.taxTypes.WTE;
    }
  });
}
function save(){ store.set(dbKey(), JSON.stringify(db)); }

/* ============================================================
   Login flow
============================================================ */
let selCluster = null;
document.querySelectorAll(".cluster-opt").forEach(b=>{
  b.onclick = ()=>{
    document.querySelectorAll(".cluster-opt").forEach(x=>x.classList.remove("sel"));
    b.classList.add("sel");
    selCluster = b.dataset.cluster;
    $("loginErr").classList.remove("show");
    $("loginPw").focus();
  };
});
$("pwEye").onclick = ()=>{
  const i = $("loginPw");
  i.type = i.type === "password" ? "text" : "password";
};
function tryLogin(){
  const err = $("loginErr");
  err.classList.remove("show");
  if(!selCluster){
    err.textContent = "Please select your cluster first.";
    void err.offsetWidth; err.classList.add("show"); return;
  }
  const pw = $("loginPw").value;
  if(cyrb53(pw) !== CLUSTER_HASHES[selCluster]){
    err.textContent = "Incorrect password for the " + selCluster + " Cluster.";
    void err.offsetWidth; err.classList.add("show");
    $("loginPw").select(); return;
  }
  session.set("msma_cluster", selCluster);
  enterApp(selCluster);
}
$("btnLogin").onclick = tryLogin;
$("loginPw").addEventListener("keydown", e=>{ if(e.key==="Enter") tryLogin(); });

function enterApp(cl){
  cluster = cl;
  loadDb();
  $("clusterChip").textContent = cluster + " CLUSTER";
  $("loginScreen").style.display = "none";
  $("appScreen").style.display = "block";
  $("loginPw").value = "";
  view = "dashboard";
  render();
}
$("btnLogout").onclick = ()=>{
  session.del("msma_cluster");
  cluster = null; db = null;
  $("appScreen").style.display = "none";
  $("loginScreen").style.display = "flex";
  document.querySelectorAll(".cluster-opt").forEach(x=>x.classList.remove("sel"));
  selCluster = null;
};
