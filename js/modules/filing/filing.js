"use strict";
/* ============================================================
   Tax Filing pages module (WTC · EWT · VAT · IT)
============================================================ */
function renderTaxPage(taxType){
  const page = TAX_PAGES[taxType];
  const ret = activeReturn[taxType];
  const R = RETURNS[ret];
  const p = periods[ret];
  const list = clientsFor(taxType);
  const q = searchQ.toLowerCase();

  const tabs = page.returns.length > 1 ? `
    <div class="subtabs">
      ${page.returns.map(r=>`<button class="subtab ${r===ret?"active":""}" data-ret="${r}">${RETURNS[r].form} · ${RETURNS[r].freq==="M"?"Monthly":RETURNS[r].freq==="Q"?"Quarterly":"Annual"}</button>`).join("")}
    </div>` : "";

  let stats = {total:0, filed:0, prog:0, amber:0, red:0};
  let rows = "";
  list.forEach(c=>{
    const rec = getRecord(ret, p, c.id);
    const flag = flagFor(ret, c, p, rec);
    if(q && !(c.name.toLowerCase().includes(q) || (c.tin||"").toLowerCase().includes(q) ||
              (c.preparer||"").toLowerCase().includes(q) || (c.reviewer||"").toLowerCase().includes(q))) return;
    if(filterChan && c.channel !== filterChan) return;
    if(filterFlag){
      if(filterFlag==="red" && flag.cls!=="red") return;
      if(filterFlag==="amber" && flag.cls!=="amber") return;
      if(filterFlag==="green" && flag.cls!=="green") return;
      if(filterFlag==="pending" && flag.cls==="green") return;
    }
    stats.total++;
    if(rec.stage>=6) stats.filed++; else stats.prog++;
    if(flag.cls==="amber") stats.amber++;
    if(flag.cls==="red") stats.red++;

    const dl = deadlineFor(ret, c, p);
    const pipe = STEPS.map((s,i)=>{
      const done = i < rec.stage, next = i === rec.stage;
      const tip = s.label + (rec.dates[s.key] ? ` · ${rec.dates[s.key]}` : "");
      return `<div class="step ${done?"done":next?"next":""}" data-tip="${escapeHtml(tip)}">${s.short}</div>`;
    }).join("");
    const statusWord = rec.stage===0 ? "Not started"
      : rec.stage>=STEPS.length ? "Archived ✓"
      : `${STEPS[rec.stage-1].label} · next: ${STEPS[rec.stage].label}`;

    rows += `
      <tr>
        <td>
          <div class="cname" onclick="openClient('${c.id}')">${escapeHtml(c.name)}</div>
          <div class="cmeta">${escapeHtml(c.tin||"—")} · ${escapeHtml(c.preparer||"unassigned")}${c.reviewer?" / "+escapeHtml(c.reviewer):""}</div>
        </td>
        <td><span class="chan ${c.channel==="EFPS"?"efps":"ebir"}">${c.channel}${c.channel==="EFPS"&&c.efpsGroup?" · "+c.efpsGroup:""}</span></td>
        <td class="due">File: <b>${fmtYmd(dl.file)}</b><br><span class="cmeta">Pay: ${fmtYmd(dl.pay)}</span></td>
        <td>
          <div style="display:flex; align-items:center;">
            <div class="pipe">${pipe}</div>
            <div class="pipe-actions">
              <button title="Step back" onclick="stepRec('${ret}','${c.id}',-1)">−</button>
              <button title="Advance step" onclick="stepRec('${ret}','${c.id}',1)">＋</button>
            </div>
          </div>
          <div class="status-word">${statusWord}</div>
        </td>
        <td style="cursor:pointer; font-variant-numeric:tabular-nums;" onclick="openRec('${ret}','${c.id}')" title="Open filing detail">
          ${fmtMoney(rec.taxDue)}${rec.ref?`<div class="cmeta">FRN ${escapeHtml(rec.ref)}</div>`:""}
        </td>
        <td><span class="flagchip ${flag.cls}">${flag.text}</span></td>
      </tr>`;
  });

  return `
    <div class="page-head">
      <h1>${page.title}</h1>
      <div class="period-nav">
        <button id="prevPeriod" aria-label="Previous period">‹</button>
        <div class="period-label">${periodLabel(ret,p)}</div>
        <button id="nextPeriod" aria-label="Next period">›</button>
      </div>
      <div class="sub">${R.form} — ${escapeHtml(R.name)} · ${list.length} applicable client${list.length===1?"":"s"} in the ${cluster} Cluster</div>
    </div>
    ${tabs}
    <div class="stat-row">
      <div class="stat"><div class="n">${stats.total}</div><div class="l">Clients this period</div></div>
      <div class="stat flag-green"><div class="n">${stats.filed}</div><div class="l">Filed</div></div>
      <div class="stat"><div class="n">${stats.prog}</div><div class="l">In pipeline</div></div>
      <div class="stat flag-amber"><div class="n">${stats.amber}</div><div class="l">Needs follow-up</div></div>
      <div class="stat flag-red"><div class="n">${stats.red}</div><div class="l">At risk / overdue</div></div>
    </div>
    <div class="toolbar">
      <input type="search" id="search" placeholder="Search client, TIN, or staff…" value="${escapeHtml(searchQ)}">
      <select id="filterFlag">
        <option value="">All statuses</option>
        <option value="red" ${filterFlag==="red"?"selected":""}>Overdue / at risk</option>
        <option value="amber" ${filterFlag==="amber"?"selected":""}>Needs follow-up</option>
        <option value="green" ${filterFlag==="green"?"selected":""}>Filed / done</option>
        <option value="pending" ${filterFlag==="pending"?"selected":""}>In progress</option>
      </select>
      <select id="filterChan">
        <option value="">All channels</option>
        <option value="eBIRForms" ${filterChan==="eBIRForms"?"selected":""}>eBIRForms</option>
        <option value="EFPS" ${filterChan==="EFPS"?"selected":""}>EFPS</option>
      </select>
      <button class="btn" id="btnAddClient">+ Add client</button>
    </div>
    <div class="card">
      <table>
        <thead><tr>
          <th style="min-width:190px;">Client</th><th>Channel</th><th>Deadline</th>
          <th style="min-width:290px;">Pipeline</th><th>Tax due</th><th>Flag</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${list.length ? "" : `<div class="empty"><b>No clients tagged for ${taxType}.</b><br>Tag clients with the ${taxType} tax type in the Client Masterlist to track ${R.form} here.</div>`}
    </div>`;
}
