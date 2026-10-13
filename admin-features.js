/* ==========================================================================
   admin-features.js — the newer administrator pages
   Polls · Reports · Parking · Activity log · Settings · dues reminders ·
   unit profile · search · notification bell
   (Loaded after shared.js and admin.js.)
   ========================================================================== */

/* ---------- Extra state for these pages ---------- */
Object.assign(state, {
  pollFilter: "open", newPollQ: "", newPollOpts: "",
  payUnit: "", payAmount: "", paymentHistory: [], pendingImport: null,
  settings: { assoc: "City Residences Condominium Corporation", email: "office@cityresidences.ph", phone: "", address: "", dues: "450", dueDay: "15", late: "0", sms: true }
});

/* ---------- Activity log ---------- */
const ACTIVITY = [
  { when: "Yesterday, 4:40 PM", who: "Ana Reyes", what: "Published announcement “Water interruption on Sept 30”" },
  { when: "Yesterday, 2:15 PM", who: "Marco Dizon", what: "Recorded dues payment for Unit 4D" },
  { when: "Sep 22, 10:05 AM", who: "Joseph Capili", what: "Approved the Function Hall booking for Reyes Household" },
  { when: "Sep 20, 9:30 AM", who: "Joseph Capili", what: "Added trusted account for Marco Dizon (Admin staff)" }
];
function logAct(what){ ACTIVITY.unshift({ when: "Just now", who: "Joseph Capili", what: what }); }
function viewLog(){
  return `
    <div class="filters">
      <span style="font-size:13px;color:var(--muted)">${ACTIVITY.length} entries</span>
      <button class="btn" style="margin-left:auto" onclick='exportCSV("activity-log.csv",["When","Who","Action"],ACTIVITY.map(a=>[a.when,a.who,a.what]))'>Export to Excel (.csv)</button>
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      <table><thead><tr><th>WHEN</th><th>WHO</th><th>ACTION</th></tr></thead>
      <tbody>${ACTIVITY.map(a=>`<tr><td style="color:var(--muted);white-space:nowrap">${a.when}</td><td style="font-weight:700">${a.who}</td><td>${a.what}</td></tr>`).join("")}</tbody></table>
    </div>`;
}

/* ---------- Polls ---------- */
let POLLS = samplePolls();
function viewPolls(){
  const open = POLLS.filter(p=>p.open).length;
  const shown = POLLS.filter(p => state.pollFilter === "all" || (state.pollFilter === "open") === p.open);
  return `
    <div class="two-col-r" style="grid-template-columns:minmax(0,1fr) 360px">
      <div style="display:flex;flex-direction:column;gap:14px">
        ${pageTabs([["open","Open ("+open+")"],["closed","Closed ("+(POLLS.length-open)+")"],["all","All ("+POLLS.length+")"]], state.pollFilter, "pollFilter")}
        ${shown.map(p=>`
          <div class="card">
            <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px">
              <div><h2>${p.q}</h2><small style="color:var(--muted)">${p.open?"Closes":"Closed"} ${p.closes}</small></div>
              <span class="chip ${p.open?"good":"info"}">${p.open?"Open":"Closed"}</span>
            </div>
            ${pollBars(p)}
            <div style="margin-top:14px">${progressBar("Units that voted", pollTotal(p), 52, "green")}</div>
            <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
              <button class="btn" onclick="togglePoll(${p.id})">${p.open?"Close poll":"Reopen poll"}</button>
              <button class="btn" onclick="exportPoll(${p.id})">Export results</button>
              <button class="btn" style="margin-left:auto;color:var(--bad-fg)" onclick="deletePoll(${p.id})">Delete</button>
            </div>
          </div>`).join("") || '<p class="empty">No polls here yet.</p>'}
      </div>
      <div class="card" style="display:flex;flex-direction:column;gap:10px">
        <h2>New poll</h2>
        <p style="margin:0;font-size:13px;color:var(--muted)">Residents see open polls in their portal and vote once per unit.</p>
        <label class="fl">Question<input id="newPollQ" value="${escAttr(state.newPollQ)}" oninput="state.newPollQ=this.value" placeholder="e.g. Extend pool hours on weekends?"></label>
        <label class="fl">Options (one per line)<textarea id="newPollOpts" rows="4" oninput="state.newPollOpts=this.value" placeholder="Yes&#10;No&#10;Not sure">${state.newPollOpts}</textarea></label>
        <button class="btn primary" onclick="addPoll()">Publish poll</button>
      </div>
    </div>`;
}
function addPoll(){
  const options = state.newPollOpts.split("\n").map(s=>s.trim()).filter(Boolean);
  if (!state.newPollQ.trim() || options.length < 2){ toast("Add a question and at least two options."); return; }
  const end = new Date(Date.now() + 7*86400000).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
  POLLS.unshift({ id: Date.now(), q: state.newPollQ.trim(), open: true, closes: end, options: options.map(t=>({ t: t, votes: 0 })) });
  logAct("Published poll “" + state.newPollQ.trim() + "”");
  set({ newPollQ:"", newPollOpts:"", pollFilter:"open" });
  toast("Poll published. Residents can vote now.");
}
function togglePoll(id){ const p = POLLS.find(x=>x.id===id); p.open = !p.open; logAct((p.open?"Reopened":"Closed")+" poll “"+p.q+"”"); render(); }
function deletePoll(id){
  const p = POLLS.find(x=>x.id===id);
  if (!confirm("Delete this poll and its results?")) return;
  logAct("Deleted poll “"+p.q+"”"); POLLS = POLLS.filter(x=>x.id!==id); render();
}
function exportPoll(id){ const p = POLLS.find(x=>x.id===id); exportCSV("poll-results.csv",["Option","Votes"],p.options.map(o=>[o.t,o.votes])); }

/* ---------- Reports ---------- */
function viewReports(){
  const unpaid = DUES.filter(d=>!state.paid[d.id]).length;
  const rate = Math.round((52 - unpaid) / 52 * 100);
  const monthly = [["May",168400],["Jun",172900],["Jul",175300],["Aug",179800],["Sep",181600],["Oct",184200]];
  const ageing = [
    { label:"1 month", value: DUES.filter(d=>!state.paid[d.id] && d.months===1).length, tone:"green" },
    { label:"2 months", value: DUES.filter(d=>!state.paid[d.id] && d.months===2).length, tone:"yellow" },
    { label:"3+ months", value: DUES.filter(d=>!state.paid[d.id] && d.months>=3).length, tone:"pink" }
  ];
  const usageNames = { owner:"Owner-occupied", tenant:"Leased", shortterm:"Short-term rental", business:"Business use" };
  const usage = Object.keys(usageNames).map((k,i)=>({ label: usageNames[k], value: UNITS.filter(u=>u.usage===k).length, tone: ["green","blue","yellow","pink"][i] })).filter(p=>p.value>0);
  const req = ["Open","In progress","Resolved"].map((n,k)=>({ label:n, value: state.gStatus.filter(s=>s===k).length, tone:["pink","yellow","green"][k] }));
  const facility = [{ label:"Swimming Pool", value:14, tone:"blue" },{ label:"Function Hall", value:9, tone:"yellow" }];
  const resolved = req[2].value, totalReq = state.gStatus.length;
  return `
    <div class="filters"><button class="btn" style="margin-left:auto" onclick="downloadReport()">Download report (.csv)</button></div>
    <div class="sc-grid">
      ${summaryCard("yellow","Collections",[[rate+"%","Collection rate"],[unpaid,"Unpaid units","fin"]],"cross")}
      ${summaryCard("pink","Earnings",[[peso(184200),"This month"]],"heart")}
      ${summaryCard("green","Occupancy",[["98%","Occupied"],["1","Vacant","units"]],"triangle")}
      ${summaryCard("blue","Requests",[[totalReq-resolved,"Open"],[resolved,"Resolved","req"]],"burst")}
    </div>
    <div class="two-col-e">
      <div class="card"><h2>Collections, last 6 months</h2><p class="hint">Sample figures, in thousands of pesos.</p>${barChart(monthly.map((m,i)=>({label:m[0],value:Math.round(m[1]/1000),tone:i===5?"pink":"yellow"})),"₱","k")}</div>
      <div class="card"><h2>Dues ageing</h2><p class="hint">Unpaid units by how long they are overdue.</p>${barChart(ageing)}</div>
      <div class="card"><h2>Unit usage</h2><p class="hint">From the ${UNITS.length} units on record.</p>${donutChart(usage, String(UNITS.length), "units")}</div>
      <div class="card"><h2>Grievances by status</h2><p class="hint">Updates as you move requests forward.</p>${donutChart(req, String(totalReq), "requests")}</div>
      <div class="card"><h2>Facility use this month</h2><p class="hint">Approved bookings (sample).</p>${barChart(facility)}</div>
      <div class="card"><h2>Poll turnout</h2><p class="hint">Units that voted in each open poll.</p>${POLLS.filter(p=>p.open).map(p=>progressBar(p.q, pollTotal(p), 52, "blue")).join("") || '<p class="empty">No open polls.</p>'}</div>
    </div>`;
}
function downloadReport(){
  const unpaid = DUES.filter(d=>!state.paid[d.id]).length;
  exportCSV("city-residences-report.csv", ["Metric","Value"], [
    ["Earnings this month", 184200], ["Unpaid units", unpaid], ["Collection rate", Math.round((52-unpaid)/52*100)+"%"],
    ["Open grievances", state.gStatus.filter(s=>s<2).length], ["Pending booking requests", counts().bookings], ["Parking slots used", PARKING.filter(s=>s.unit).length+" of "+PARKING.length]
  ]);
  logAct("Downloaded the monthly report");
}

/* ---------- Parking ---------- */
const PARKING_UNITS = ["Unit 12A","Unit 7C","Unit 3B","Unit 15D","Unit 9A","Unit 21B","Unit 18C","Unit 6B","Unit 2A","Unit 8C","Unit 10D","Unit 14A","Unit 17B"];
const PARKING = Array.from({ length: 24 }, (_, i) => ({ id: "M-" + String(i + 1).padStart(2, "0"), unit: PARKING_UNITS[i] || "" }));
let PARKING_REQUESTS = [{ unit:"Unit 4D", who:"Reyes-Torres Household", when:"2 days ago" },{ unit:"Unit 11B", who:"Fernandez Household", when:"Yesterday" }];
function viewParking(){
  const used = PARKING.filter(s=>s.unit).length;
  return `
    <div class="grid cols-3">
      <div class="card"><div class="stat-label">Slots in use</div><div class="stat-value">${used} of ${PARKING.length}</div></div>
      <div class="card"><div class="stat-label">Monthly parking income</div><div class="stat-value">${peso(used * state.motorParkingRate)}</div></div>
      <div class="card"><div class="stat-label">Requests waiting</div><div class="stat-value">${PARKING_REQUESTS.length}</div></div>
    </div>
    <div class="two-col-r" style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)">
      <div class="card"><h2>Motor parking slots</h2><p class="hint">Tap a slot to assign it to a unit or release it. Rate: ${peso(state.motorParkingRate)} per month (change it under Finance).</p>
        <div class="slotgrid">${PARKING.map((s,i)=>`<button class="pslot ${s.unit?"used":"free"}" onclick="openSlot(${i})"><b>${s.id}</b><small>${s.unit||"Free"}</small></button>`).join("")}</div>
      </div>
      <div class="card"><h2>Requests</h2><p class="hint">Residents who asked for a slot.</p>
        ${PARKING_REQUESTS.map((r,k)=>`<div class="req-row"><div><b>${r.unit}</b><small>${r.who} · ${r.when}</small></div><div><button class="btn primary" onclick="approveParking(${k})">Assign</button><button class="btn" onclick="declineParking(${k})">Decline</button></div></div>`).join("") || '<p class="empty">No requests waiting.</p>'}
      </div>
    </div>`;
}
function openSlot(i){
  const s = PARKING[i];
  if (s.unit){
    openModal(`<h2>${s.id}</h2><p>Assigned to <b>${s.unit}</b>.</p><div class="modal-actions"><button class="btn primary" onclick="releaseSlot(${i})">Release this slot</button><button class="btn" onclick="closeModal()">Keep</button></div>`);
  } else {
    const taken = PARKING.map(p=>p.unit);
    const choices = PARKING_UNITS.concat(UNITS.map(u=>u.unit)).filter((u,k,all)=>all.indexOf(u)===k && taken.indexOf(u)<0 && u!=="Unit 5A");
    openModal(`<h2>${s.id}</h2><p>This slot is free. Choose a unit to assign it to.</p><label class="fl">Unit<select id="pkUnit">${choices.map(u=>`<option>${u}</option>`).join("")}</select></label><div class="modal-actions"><button class="btn primary" onclick="assignSlot(${i})">Assign slot</button><button class="btn" onclick="closeModal()">Cancel</button></div>`);
  }
}
function assignSlot(i){ const u = document.getElementById("pkUnit").value; PARKING[i].unit = u; logAct("Assigned parking slot "+PARKING[i].id+" to "+u); closeModal(); render(); toast(PARKING[i].id+" assigned to "+u+"."); }
function releaseSlot(i){ logAct("Released parking slot "+PARKING[i].id+" from "+PARKING[i].unit); PARKING[i].unit = ""; closeModal(); render(); toast("Slot released."); }
function approveParking(k){
  const free = PARKING.find(s=>!s.unit);
  if (!free){ toast("There are no free slots right now."); return; }
  free.unit = PARKING_REQUESTS[k].unit; logAct("Assigned parking slot "+free.id+" to "+free.unit);
  toast(free.id+" assigned to "+free.unit+"."); PARKING_REQUESTS.splice(k,1); render();
}
function declineParking(k){ logAct("Declined a parking request from "+PARKING_REQUESTS[k].unit); PARKING_REQUESTS.splice(k,1); render(); }

/* ---------- Settings ---------- */
function viewSettings(){
  const s = state.settings;
  const f = (label, key, ph) => `<label class="fl">${label}<input value="${escAttr(s[key])}" oninput="state.settings.${key}=this.value" placeholder="${ph||""}"></label>`;
  return `
    <div class="two-col-e">
      <div class="card" style="display:flex;flex-direction:column;gap:10px"><h2>Association</h2>
        ${f("Association name","assoc")}${f("Office email","email")}${f("Office phone","phone","Add the office phone number")}${f("Address","address","Add the building address")}
      </div>
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="card" style="display:flex;flex-direction:column;gap:10px"><h2>Billing defaults</h2>
          ${f("Monthly association dues (₱)","dues")}${f("Due day of the month","dueDay")}${f("Late fee (%)","late")}
          <label style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" ${s.sms?"checked":""} onchange="state.settings.sms=this.checked"> Text residents by default when I publish an announcement</label>
        </div>
        <div class="card" style="display:flex;flex-direction:column;gap:10px"><h2>Your preferences</h2>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" onclick="toggleDarkMode()">${state.darkMode?"Switch to light mode":"Switch to dark mode"}</button><button class="btn" onclick="resetDemo()">Reset demo data</button></div>
        </div>
        <button class="btn primary" onclick="saveSettings()">Save settings</button>
      </div>
    </div>`;
}
function saveSettings(){ logAct("Updated association settings"); toast("Settings saved. (Demo only — nothing is stored after you refresh.)"); }
function resetDemo(){ if (confirm("Reset all sample data and sign out?")) location.reload(); }

/* ---------- Dues reminders + unit profile ---------- */
function remindDue(id){
  const d = DUES.find(x=>x.id===id);
  state.reminded[id] = true; logAct("Sent a dues reminder to "+d.unit);
  render(); toast("Reminder sent to "+d.name+" ("+d.unit+"). Demo only — no real message is sent.");
}
function remindAll(){
  const list = DUES.filter(d=>!state.paid[d.id]);
  if (!list.length){ toast("Everyone is paid up."); return; }
  list.forEach(d=>{ state.reminded[d.id] = true; });
  logAct("Sent dues reminders to "+list.length+" units");
  render(); toast("Reminders sent to "+list.length+" units. Demo only — no real messages are sent.");
}
function showUnit(unit){
  const u = UNITS.find(x=>x.unit===unit); const d = DUES.find(x=>x.unit===unit);
  const owes = d && !state.paid[d.id];
  openModal(`<h2>${u.unit}</h2><p>${u.name}</p>
    <div class="kv"><span>Occupancy</span><b>${u.type}</b><span>Status</span><b>${u.status}</b><span>Contact</span><b>${u.contact}</b><span>Usage</span><b>${usageLabel(u.usage)}</b><span>Dues</span><b>${owes?peso(d.amt)+" overdue ("+d.months+" mo)":"Settled"}</b></div>
    <div class="modal-actions">${owes?`<button class="btn primary" onclick="remindDue(${d.id});closeModal()">Send dues reminder</button>`:""}<button class="btn" onclick="copyContact('${u.contact}')">Copy contact</button></div>`);
}
function copyContact(text){
  try { navigator.clipboard.writeText(text); toast("Contact number copied."); } catch (e) { toast(text); }
}

/* ---------- Search + notification bell ---------- */
function searchIndex(){
  const pages = [["Finance","fin"],["Reports","reports"],["Parking","parking"],["Polls","polls"],["Facility booking","fac"],["Announcements","ann"],["Grievances","req"],["Unit rentals","rentals"],["Activity log","log"],["Manage access","manage"],["Settings","settings"],["My profile","profile"]];
  return [].concat(
    UNITS.map(u=>({ t:u.unit+" · "+u.name, s:u.type+" · "+u.contact, tag:"Unit", v:"units" })),
    ANNOUNCEMENTS.map(a=>({ t:a.title, s:a.body, tag:"Announcement", v:"ann" })),
    EVENTS.map(e=>({ t:e.title, s:e.date+" · "+e.place, tag:"Event", v:"ann" })),
    POLLS.map(p=>({ t:p.q, s:p.open?"Open poll":"Closed poll", tag:"Poll", v:"polls" })),
    GRIEVANCES.map(g=>({ t:g.title, s:g.by, tag:"Grievance", v:"req" })),
    DOCS.map(d=>({ t:d.name, s:d.cat+" · "+d.date, tag:"Document", v:"req" })),
    VENDORS.map(v=>({ t:v, s:"Vendor", tag:"Vendor", v:"req" })),
    state.trusted.map(t=>({ t:t.name, s:t.role+" · "+t.email, tag:"Account", v:"manage" })),
    pages.map(p=>({ t:p[0], s:"Open this page", tag:"Page", v:p[1] }))
  );
}
function bellItems(){
  const c = counts();
  const list = [];
  if (c.bookings) list.push({ t:c.bookings+" booking request"+(c.bookings>1?"s":"")+" to review", s:"Facility", v:"fac" });
  if (c.unpaid) list.push({ t:c.unpaid+" unpaid dues", s:"Finance", v:"fin" });
  if (c.grievances) list.push({ t:c.grievances+" open grievance"+(c.grievances>1?"s":""), s:"Grievances", v:"req" });
  if (c.rentals) list.push({ t:c.rentals+" unit rental to review", s:"Rentals", v:"rentals" });
  if (PARKING_REQUESTS.length) list.push({ t:PARKING_REQUESTS.length+" parking request"+(PARKING_REQUESTS.length>1?"s":""), s:"Parking", v:"parking" });
  return list;
}


/* ---------- Finance: payment desk, history, charts (from the classmate's version) ---------- */
function viewFin(){
  const paidList = DUES.filter(d=>state.paid[d.id]);
  const dueList = DUES.filter(d=>!state.paid[d.id]);
  const rows = DUES;
  const sessionTotal = paidList.reduce((s,d)=>s+d.amt,0);
  const outstanding = dueList.reduce((s,d)=>s+d.amt,0);
  const stats = [["Collected this month",peso(184200+sessionTotal)],["Outstanding",peso(outstanding)],["Unpaid units",String(dueList.length)],["Payments recorded",String(state.paymentHistory.length)]];
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const rate = [62,48,78,37,65,84,45,56,73,80,92,51];
  const chosen = DUES.find(d=>String(d.id)===state.payUnit);
  const tx = state.paymentHistory.length
    ? state.paymentHistory.map(t=>`<div class="tx-row"><span class="tx-ic">${icon("fin")}</span><div><b>${t.name}</b><small>${t.unit} · ${t.date}</small></div><strong>+ ${peso(t.amount)}</strong></div>`).join("")
    : `<p class="hint" style="margin:6px 0 0">No payments recorded yet. Pick a unit in the payment desk and record one.</p>`;
  return `
    <div class="grid cols-4">${stats.map(s=>`<div class="card"><div class="stat-label">${s[0]}</div><div class="stat-value">${s[1]}</div></div>`).join("")}</div>
    ${adminProofsHtml()}
    ${state.rateToast ? `<div class="card" style="margin-top:16px;background:var(--good-bg);border-color:#B9D6B4;color:var(--good-fg);display:flex;justify-content:space-between;align-items:center;gap:10px">
      <span style="font-size:13px;font-weight:600">${state.rateToast}</span>
      <button class="btn" style="min-height:30px;padding:0 10px;font-size:12px" onclick="dismissRateToast()">Dismiss</button>
    </div>` : ""}
    <div class="fin-grid">
      <div class="fin-main">
        <div class="card"><h2>Collection summary</h2><p class="hint">Share of dues collected each month in 2026 (sample figures).</p>
          ${barChart(months.map((m,i)=>({label:m,value:rate[i],tone:i===9?"pink":"yellow"})),"","%")}
        </div>
        <div class="card" style="padding:0;overflow:hidden">
          <div class="filters" style="padding:14px 18px">
            <button class="btn" style="margin-left:auto" onclick="remindAll()">Send reminders to all unpaid</button>
          </div>
          ${exactCSV.finance ? exactTable("finance") : `<table><thead><tr><th>UNIT</th><th>RESIDENT</th><th>OVERDUE</th><th>AMOUNT DUE</th><th>STATUS</th></tr></thead>
          <tbody>${rows.map(d=>{
            const action = state.paid[d.id] ? `<span class="chip good">Paid</span>` : `<button class="btn" onclick="chooseFinanceUnit(${d.id})">Collect</button> <button class="btn" onclick="remindDue(${d.id})">${state.reminded[d.id]?"Reminded ✓":"Remind"}</button>`;
            return `<tr><td style="font-weight:700">${d.unit}</td><td>${d.name}</td><td style="color:var(--muted)">${d.months} month${d.months>1?"s":""}</td><td style="font-weight:700">${peso(d.amt)}</td><td>${action}</td></tr>`;
          }).join("")}</tbody></table>`}
        </div>
        <div class="card" style="display:flex;flex-direction:column;gap:10px">
          <h2>Motor parking rental</h2>
          <p class="hint" style="margin:0">Monthly rate for residents renting a motor/motorcycle parking slot. The board can change it at any time.</p>
          <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap">
            <label class="fl" style="width:160px">Monthly rate (₱)<input type="number" min="0" value="${escAttr(state.motorParkingRateDraft)}" oninput="state.motorParkingRateDraft=this.value"></label>
            <button class="btn primary" onclick="updateMotorParkingRate()">Update rate</button>
            <span style="font-size:13px;color:var(--muted)">Current rate: <b>${peso(state.motorParkingRate)}/month</b></span>
          </div>
        </div>
      </div>
      <aside class="fin-side">
        <div class="card" style="display:flex;flex-direction:column;gap:10px"><h2>Record payment</h2>
          <label class="fl">Resident / unit
            <select onchange="chooseFinanceUnit(this.value)"><option value="">Select an unpaid unit</option>${dueList.map(d=>`<option value="${d.id}" ${state.payUnit===String(d.id)?"selected":""}>${d.unit} — ${d.name}</option>`).join("")}</select></label>
          <label class="fl">Amount (₱)<input type="number" min="0.01" step="0.01" placeholder="Amount" value="${escAttr(state.payAmount)}" oninput="state.payAmount=this.value"></label>
          <div class="kv" style="font-size:13px">${chosen?`<span>Resident</span><b>${chosen.name}</b><span>Amount due</span><b>${peso(chosen.amt)}</b>`:`<span style="grid-column:1/-1">Choose a unit to begin.</span>`}</div>
          <button class="btn primary" onclick="recordFinancePayment()">Record payment</button>
          <p class="hint" style="margin:0">Demo only. This updates the ledger on screen and does not charge a card or move money.</p>
        </div>
        <div class="card" style="display:flex;flex-direction:column;gap:8px"><h2>Reports &amp; import</h2>
          <label class="btn file-import-btn">Import finance CSV<input type="file" accept=".csv,text/csv" onchange="importFile('finance',this)" hidden></label>
          <button class="btn" onclick="downloadImportTemplate('finance')">Download CSV template</button>
          <button class="btn" onclick='exportCSV("dues.csv",["Unit","Resident","Months overdue","Amount due","Status"],DUES.map(d=>[d.unit,d.name,d.months,d.amt,state.paid[d.id]?"Paid":"Unpaid"]))'>Export dues CSV</button>
        </div>
      </aside>
    </div>`;
}
function chooseFinanceUnit(id){
  const d = DUES.find(x=>String(x.id)===String(id));
  state.payUnit = d ? String(d.id) : "";
  state.payAmount = d ? String(d.amt) : "";
  render();
  if (d) { const el = document.querySelector(".fin-side"); if (el && window.innerWidth<1100) el.scrollIntoView({behavior:"smooth",block:"start"}); }
}
function recordFinancePayment(){
  const d = DUES.find(x=>String(x.id)===state.payUnit);
  const amount = Number(state.payAmount);
  if (!d || state.paid[d.id] || !Number.isFinite(amount) || amount<=0 || Math.abs(amount-d.amt)>0.001){
    toast("Select an unpaid unit and enter its exact amount due."); return;
  }
  state.paid[d.id] = true;
  state.paymentHistory.unshift({ ref:"DEMO-"+Date.now(), unit:d.unit, name:d.name, amount:d.amt, date:new Date().toLocaleString("en-PH",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}) });
  logAct("Recorded dues payment for "+d.unit+" ("+peso(d.amt)+")");
  state.payUnit = ""; state.payAmount = "";
  render(); toast("Payment recorded for "+d.unit+": "+peso(d.amt)+". No real funds moved.");
}
function payDue(id){ chooseFinanceUnit(id); }

/* ---------- Exact CSV import: replaces sample records, never merges ---------- */
const CSV_STORE_KEY = 'residenthub_exact_csv_v1';
const exactCSV = { units:null, finance:null, access:null };
function parseImportCSV(text){
  text=String(text).replace(/^\uFEFF/,'');
  const rows=[]; let row=[],cell='',quoted=false,started=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){
      if(quoted && text[i+1]==='"'){cell+='"';i++;}
      else if(quoted){quoted=false;}
      else if(cell===''){quoted=true;started=true;}
      else throw Error('Unexpected quote at character '+(i+1));
    } else if(c===','&&!quoted){row.push(cell);cell='';started=true;}
    else if((c==='\n'||c==='\r')&&!quoted){
      if(c==='\r'&&text[i+1]==='\n')i++;
      row.push(cell); if(started||row.some(x=>x!=='')) rows.push(row);
      row=[];cell='';started=false;
    }else {cell+=c;started=true;}
  }
  if(quoted)throw Error('Unclosed quoted field');
  if(started||row.length){row.push(cell);rows.push(row);}
  if(!rows.length)throw Error('The CSV is empty');
  const width=rows[0].length;
  if(!rows[0].some(x=>x!==''))throw Error('Header row is empty');
  rows.forEach((r,i)=>{if(r.length!==width)throw Error('Row '+(i+1)+' has '+r.length+' columns; expected '+width);});
  return rows;
}
function csvEscapeCell(v){const s=String(v??'');return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}
function downloadExactCSV(kind){
  const data=exactCSV[kind]; if(!data)return;
  const content='\uFEFF'+data.rows.map(r=>r.map(csvEscapeCell).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=kind+'-imported.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
/* Inline CSV editor: all values remain strings and column order is preserved. */
const csvDrafts = {units:null, finance:null, access:null};
function csvHtml(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function csvDraft(kind){
  if(!csvDrafts[kind] && exactCSV[kind])csvDrafts[kind]=exactCSV[kind].rows.map(r=>r.slice());
  return csvDrafts[kind];
}
function csvChange(kind,row,col,value){const draft=csvDraft(kind);if(draft&&draft[row])draft[row][col]=value;}
function csvAdd(kind){
  const draft=csvDraft(kind);if(!draft)return;
  draft.push(Array(draft[0].length).fill(''));render();
}
function csvRemove(kind,row){
  const draft=csvDraft(kind);if(!draft||row<1||row>=draft.length)return;
  draft.splice(row,1);render();
}
function csvSave(kind){
  const draft=csvDraft(kind);if(!draft)return;
  applyExactCSV(kind,draft.map(r=>r.slice()));
  csvDrafts[kind]=null;render();toast('Saved '+(draft.length-1)+' '+kind+' rows.');
}
function csvEdit(kind){
  const wrap=document.querySelector('[data-csv-kind="'+kind+'"]');if(!wrap)return;
  wrap.classList.toggle('csv-editing');
  const editing=wrap.classList.contains('csv-editing');
  wrap.querySelectorAll('.csv-cell-input').forEach(el=>{el.readOnly=!editing;});
  wrap.querySelectorAll('.csv-remove-row').forEach(el=>{el.hidden=!editing;});
  const editButton=wrap.querySelector('.csv-edit-toggle');if(editButton)editButton.textContent=editing?'Finish editing':'Edit';
}
function exactTable(kind){
  const draft=csvDraft(kind);if(!draft)return '';
  return `<div class="csv-table-wrap" data-csv-kind="${kind}">
    <div class="csv-table-toolbar csv-edit-toolbar"><strong>${draft.length-1} rows · ${draft[0].length} columns</strong>
      <div class="csv-actions"><button class="btn" onclick="csvAdd('${kind}')">+ Add</button>
      <button class="btn csv-edit-toggle" onclick="csvEdit('${kind}')">Edit</button>
      <button class="btn primary" onclick="csvSave('${kind}')">Save changes</button></div></div>
    <div class="csv-scroll"><table><thead><tr>${draft[0].map(v=>`<th>${csvHtml(v)}</th>`).join('')}<th>Actions</th></tr></thead>
    <tbody>${draft.slice(1).map((r,ri)=>({r,ri})).filter(({r})=>kind!=='units'||matchesUnitSearch(r.join(' '),state.unitSearch)).map(({r,ri})=>`<tr>${r.map((v,ci)=>`<td><input class="csv-cell-input" aria-label="Row ${ri+1}, column ${ci+1}" value="${csvHtml(v)}" oninput="csvChange('${kind}',${ri+1},${ci},this.value)" readonly></td>`).join('')}<td><button class="btn csv-remove-row" hidden onclick="csvRemove('${kind}',${ri+1})">Remove</button></td></tr>`).join('')}</tbody></table></div></div>`;
}
function downloadImportTemplate(kind){
  if(kind==='units')exportCSV('units-template.csv',['Unit','Resident/Owner','Occupancy','Status','Contact','Usage'],[['Unit 1A','Example Resident','Owner','Occupied','09170000000','owner']]);
  else if(kind==='access')exportCSV('access-template.csv',['Name','Email','Phone','Unit','Role','Status','Added'],[['Example Resident','example@cityresidences.ph','09170000000','Unit 1A','Resident','Active','2026-10-09']]);
  else exportCSV('finance-template.csv',['Unit','Resident','Months overdue','Amount due','Status'],[['Unit 1A','Example Resident',1,450,'Unpaid']]);
}
function applyExactCSV(kind,rows,save=true){
  if(!['units','finance','access'].includes(kind))throw Error('Unknown import type');
  exactCSV[kind]={rows};
  csvDrafts[kind]=null;
  const headers=rows[0].map(x=>x.toLowerCase().replace(/[\s/_-]+/g,' ').trim());
  const idx=(...names)=>headers.findIndex(h=>names.includes(h));
  const value=(r,...names)=>{const i=idx(...names);return i<0?'':r[i];};
  if(kind==='units'){
    UNITS.splice(0,UNITS.length,...rows.slice(1).map(r=>({
      unit:value(r,'unit'),name:value(r,'resident owner','resident','name'),
      type:value(r,'occupancy','type'),status:value(r,'status'),contact:value(r,'contact'),
      usage:value(r,'usage'),overdue:0
    })));
    state.unitFilter='all';state.unitSearch='';
  }else if(kind==='finance'){
    DUES.splice(0,DUES.length,...rows.slice(1).map((r,i)=>({
      id:i+1,unit:value(r,'unit'),name:value(r,'resident','resident owner','name'),
      months:Number(value(r,'months overdue','overdue'))||0,
      amt:Number(value(r,'amount due','amount').replace(/[₱,\s]/g,''))||0
    })));
    state.paid={};rows.slice(1).forEach((r,i)=>{state.paid[i+1]=/^paid$/i.test(value(r,'status'));});
    state.finFilter='unpaid';
  }
  if(save){try{localStorage.setItem(CSV_STORE_KEY,JSON.stringify(exactCSV));}catch(e){toast('Imported, but browser storage is full; data may reset on reload.');}}
}
function importFile(kind,input){
  const file=input.files&&input.files[0];if(!file)return;
  if(!['units','finance','access'].includes(kind))return;
  if(!/\.csv$/i.test(file.name)){toast('Select a .csv file');input.value='';return;}
  if(file.size>5*1024*1024){toast('CSV limit: 5 MB');input.value='';return;}
  const reader=new FileReader();
  reader.onload=()=>{try{
    const rows=parseImportCSV(reader.result);
    applyExactCSV(kind,rows);
    render();toast('Imported '+(rows.length-1)+' rows exactly. Previous '+kind+' records replaced.');
  }catch(e){toast('CSV import failed: '+e.message);}finally{input.value='';}};
  reader.onerror=()=>{toast('Could not read CSV file');input.value='';};
  reader.readAsText(file,'UTF-8');
}
(function restoreExactCSV(){try{const stored=JSON.parse(localStorage.getItem(CSV_STORE_KEY)||'{}');for(const kind of ['units','finance','access'])if(stored[kind]&&Array.isArray(stored[kind].rows))applyExactCSV(kind,stored[kind].rows,false);}catch(e){console.warn('Could not restore CSV',e);}})();
/* ---------- My profile ---------- */
function viewProfile(){
  const mine = ACTIVITY.slice(0,5).map(a=>`<div class="tl-row"><span class="tl-dot"></span><div><b>${a.what}</b><small>${a.when}</small></div></div>`).join("");
  return `
    <div class="profile-grid">
      <div class="profile-col">
        <div class="card profile-hero"><span class="avatar big">JC</span>
          <div><h2>Joseph Capili</h2><p>Administrator · City Residences Condominium Corporation</p><span class="chip good">Verified admin</span></div>
          <button class="btn" onclick="set({view:'manage'})">Manage access</button>
        </div>
        <div class="two-col-e">
          <div class="card"><h2>Personal information</h2>
            <div class="kv" style="margin-top:10px"><span>Full name</span><b>Joseph Capili</b><span>Role</span><b>Administrator</b><span>Email</span><b>${state.settings.email}</b><span>Phone</span><b>${state.settings.phone||"Not added yet"}</b></div>
          </div>
          <div class="card"><h2>Account health</h2>
            <p class="hint">Sample checklist for the demo.</p>
            ${progressBar("Profile completeness",92,100)}
            <ul class="check-list"><li>Two-factor sign-in</li><li>Trusted device</li><li>Recovery contact</li></ul>
          </div>
        </div>
        <div class="card"><div class="card-head"><h2>Recent account activity</h2><button class="btn" onclick="set({view:'log'})">Full log</button></div>
          <div class="tl-list">${mine}</div>
        </div>
      </div>
      <aside class="profile-col">
        <div class="card" style="display:flex;flex-direction:column;gap:8px"><h2>Quick links</h2>
          <button class="btn" onclick="set({view:'ann'})">Announcements</button>
          <button class="btn" onclick="set({view:'req'})">Grievances &amp; files</button>
          <button class="btn" onclick="set({view:'fin'})">Finance</button>
          <button class="btn" onclick="set({view:'settings'})">Settings</button>
        </div>
      </aside>
    </div>`;
}


/* ---------- Payments to verify and receipts (see payments.js) ---------- */
function confirmProof(id){
  const p = reviewProof(id, true);
  if (!p) return;
  // Mirror it in the ledger and mark the matching unpaid unit as paid.
  const d = DUES.find(x => x.unit === p.unit && !state.paid[x.id]);
  if (d) state.paid[d.id] = true;
  state.paymentHistory.unshift({ ref:p.reference, unit:p.unit, name:p.payer, amount:p.amount, date:new Date().toLocaleString("en-PH",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}) });
  logAct("Confirmed payment from " + p.unit + " (" + peso(p.amount) + "), receipt " + p.receiptNo);
  render(); toast("Payment confirmed. Receipt " + p.receiptNo + " is ready for " + p.unit + ".");
}
function rejectProof(id){
  const p = reviewProof(id, false);
  if (!p) return;
  logAct("Rejected payment details from " + p.unit + " (ref " + p.reference + ")");
  render(); toast("Payment details rejected. The resident will see this.");
}
function adminProofsHtml(){
  const all = readProofs();
  const pending = all.filter(p => p.status === "Pending");
  const issued = all.filter(p => p.status === "Confirmed");
  const row = p => `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 0;border-top:1px solid var(--line,#E7E2D6)">
      <div style="min-width:0"><b>${payEsc(p.unit)} · ${payEsc(p.payer)}</b><div style="font-size:12.5px;color:var(--muted)">${payEsc(p.forText)} · ${payEsc(p.method)} · Ref ${payEsc(p.reference)} · ${peso(p.amount)} · ${payEsc(p.date)}</div></div>
      <div style="display:flex;gap:8px"><button class="btn" onclick="rejectProof(${p.id})">Reject</button><button class="btn primary" onclick="confirmProof(${p.id})">Confirm</button></div>
    </div>`;
  return `<div class="card" style="margin-top:16px">
      <h2>Payments to verify</h2>
      <p class="hint">Residents pay at the office, by bank, GCash or Maya, then send the amount, method and reference number. Check them against your records, then confirm to issue a receipt.</p>
      ${pending.length ? pending.map(row).join("") : `<p class="hint" style="margin:6px 0 0">Nothing waiting. New submissions from residents appear here right away.</p>`}
      ${issued.length ? `<div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px"><b>Receipts issued (${issued.length})</b><button class="btn" onclick="exportPaymentHistoryCSV(readProofs().filter(p=>p.status==='Confirmed'))">Export to Excel (.csv)</button></div>
      ${issued.slice(0,5).map(p=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--line,#E7E2D6)"><span style="font-size:13px"><b>${payEsc(p.receiptNo)}</b> · ${payEsc(p.unit)} · ${peso(p.amount)}</span><button class="btn" style="min-height:30px;padding:0 10px;font-size:12px" onclick="downloadReceipt(${p.id})">Receipt</button></div>`).join("")}` : ""}
    </div>`;
}
