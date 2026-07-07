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
function save(){
  store.set(dbKey(), JSON.stringify(db));
  fbWrite();
}

/* ============================================================
   Firebase Realtime Database sync
   · Gracefully no-ops when FIREBASE_CONFIG holds placeholder values
   · Each cluster has its own node: clusters/{cluster}
   · Data written as a single JSON blob (same shape as localStorage)
   · onValue listener merges incoming remote data into db and
     re-renders only when no overlay is open (avoids disrupting edits)
============================================================ */
const FB_PLACEHOLDER = "YOUR_API_KEY";
let fbApp = null, fbDb = null, fbRef = null, fbUnsubscribe = null;
let _fbReady = false;     // true once Firebase Auth sign-in completes
let _fbWritePending = false;

function fbEnabled(){
  return typeof FIREBASE_CONFIG !== "undefined" &&
         FIREBASE_CONFIG.apiKey !== FB_PLACEHOLDER;
}

function setSyncStatus(state){
  const el = $("syncStatus");
  if(!el) return;
  el.className = "sync-status " + state;
  const labels = { hidden:"", connecting:"Connecting…", synced:"Synced", error:"Sync error", "not-configured":"Sync not set up" };
  el.textContent = labels[state] ?? "";
}

function initFirebaseSync(cl){
  if(!fbEnabled()){ setSyncStatus("not-configured"); return; }
  setSyncStatus("connecting");
  try {
    if(!fbApp){
      fbApp = firebase.initializeApp(FIREBASE_CONFIG);
    }
    fbDb = firebase.database(fbApp);

    firebase.auth(fbApp).signInAnonymously()
      .then(()=>{
        _fbReady = true;
        fbRef = fbDb.ref("clusters/" + cl);

        // Listen for remote changes
        fbUnsubscribe = fbRef.on("value", snapshot=>{
          const remote = snapshot.val();
          if(!remote) {
            // No remote data yet — push our local data up
            if(db) fbWrite();
            setSyncStatus("synced");
            return;
          }
          // Merge remote into db (remote wins as source of truth)
          const merged = Object.assign({ clients:[], records:{}, auditLog:[] }, remote);
          if(!merged.auditLog) merged.auditLog = [];
          // Persist to localStorage
          store.set(dbKey(), JSON.stringify(merged));
          db = merged;
          setSyncStatus("synced");
          // Only re-render if no overlay is open (don't interrupt edits)
          const anyOpen = document.querySelector(".overlay.open");
          if(!anyOpen && typeof render === "function") render();
        }, err=>{
          console.error("Firebase sync error:", err);
          setSyncStatus("error");
        });

        // Flush any write that happened before auth completed
        if(_fbWritePending){ _fbWritePending = false; fbWrite(); }
      })
      .catch(err=>{
        console.error("Firebase anonymous sign-in failed:", err);
        setSyncStatus("error");
      });
  } catch(err){
    console.error("Firebase init error:", err);
    setSyncStatus("error");
  }
}

function stopFirebaseSync(){
  if(fbRef && fbUnsubscribe){
    fbRef.off("value", fbUnsubscribe);
    fbRef = null; fbUnsubscribe = null;
  }
  _fbReady = false;
  setSyncStatus("hidden");
}

function fbWrite(){
  if(!fbEnabled() || !db) return;
  if(!_fbReady){ _fbWritePending = true; return; }
  setSyncStatus("connecting");
  fbDb.ref("clusters/" + cluster).set(db)
    .then(()=>setSyncStatus("synced"))
    .catch(err=>{ console.error("Firebase write error:", err); setSyncStatus("error"); });
}

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
  initFirebaseSync(cluster);
}
$("btnLogout").onclick = ()=>{
  stopFirebaseSync();
  session.del("msma_cluster");
  cluster = null; db = null;
  $("appScreen").style.display = "none";
  $("loginScreen").style.display = "flex";
  document.querySelectorAll(".cluster-opt").forEach(x=>x.classList.remove("sel"));
  selCluster = null;
};
