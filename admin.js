/* Admin dashboard — app logic.
   Loaded by admin.html. The page markup is built from the render() functions below. */

/* ---------- Sample data (replace with real API calls) ---------- */
const UNITS = [
  { unit:"Unit 12A", name:"Reyes Household", type:"Owner", status:"Occupied", contact:"0917 555 0112", overdue:1, usage:"owner" },
  { unit:"Unit 7C", name:"Garcia Household", type:"Tenant", status:"Occupied", contact:"0917 555 0234", overdue:1, usage:"tenant" },
  { unit:"Unit 3B", name:"Villanueva Household", type:"Owner", status:"Occupied", contact:"0917 555 0311", overdue:2, usage:"shortterm", usageStatus:"approved", usageDetails:"Listed on Airbnb, approved March 2026." },
  { unit:"Unit 15D", name:"Mendoza Household", type:"Tenant", status:"Occupied", contact:"0917 555 0455", overdue:1, usage:"tenant" },
  { unit:"Unit 9A", name:"Cruz Household", type:"Owner", status:"Occupied", contact:"0917 555 0567", overdue:3, usage:"owner" },
  { unit:"Unit 21B", name:"Santos Household", type:"Owner", status:"Occupied", contact:"0917 555 0678", overdue:1, usage:"business", usageStatus:"pending", usageDetails:"Online reselling of home goods." },
  { unit:"Unit 5A", name:"—", type:"—", status:"Vacant", contact:"—", overdue:2, usage:"" },
  { unit:"Unit 18C", name:"Aquino Household", type:"Tenant", status:"Occupied", contact:"0917 555 0891", overdue:1, usage:"tenant" },
  { unit:"Unit 4D", name:"Reyes-Torres Household", type:"Owner", status:"Occupied", contact:"0917 555 0932", overdue:0, usage:"owner" },
  { unit:"Unit 11B", name:"Fernandez Household", type:"Owner", status:"Occupied", contact:"0917 555 1007", overdue:0, usage:"owner" },
  { unit:"Unit 6B", name:"Fugaban Household", type:"Owner", status:"Occupied", contact:"0917 555 0145", overdue:0, usage:"owner" }
];
// Best-effort bridge from the resident portal's Unit usage declaration (resident.html),
// stored via localStorage when both pages are opened from the same origin/browser
// (e.g. via Live Server). Front-end-only demo, so this is optional and silently
// skipped if storage isn't available — the sample usage values above always show.
(function loadStoredUnitUsage(){
  try {
    const raw = localStorage.getItem("residenthub_unit_usage");
    if (!raw) return;
    const stored = JSON.parse(raw);
    Object.keys(stored).forEach(function(key){
      const unitLabel = key.split(" · ")[0];
      const u = UNITS.find(function(x){ return x.unit === unitLabel; });
      const entry = stored[key];
      if (!u || !entry) return;
      u.usage = entry.usage;
      u.usageDetails = entry.details;
      const needsApproval = entry.usage === "shortterm" || entry.usage === "business";
      u.usageStatus = entry.status || (needsApproval ? "pending" : "");
      u.usageRemark = entry.remark || "";
    });
  } catch(e){ /* storage unavailable — sample data still shows */ }
})();
const FACILITIES = [
  { name:"Swimming Pool", hours:"6:00 AM – 8:00 PM" }, { name:"Function Hall", hours:"8:00 AM – 10:00 PM" }
];
const SLOT_TIMES = ["8–10","10–12","12–2","2–4","4–6","6–8","8–10"];
const BASE_BOOKED = [[4,6],[0,2]];
const BOOKING_REQS = [
  { id:1, who:"Reyes Household", place:"Function Hall", when:"Oct 3, 6:00 PM – 10:00 PM" },
  { id:2, who:"Cruz Household", place:"Swimming Pool", when:"Tomorrow, 3:00 PM – 5:00 PM" },
  { id:3, who:"Garcia Household", place:"Function Hall", when:"Sat, 2:00 PM – 6:00 PM" },
  { id:4, who:"Villanueva Household", place:"Swimming Pool", when:"Oct 5, 1:00 PM – 4:00 PM" }
];
const DUES = [
  { id:1, unit:"Unit 12A", name:"Reyes Household", months:1 }, { id:2, unit:"Unit 7C", name:"Garcia Household", months:1 },
  { id:3, unit:"Unit 3B", name:"Villanueva Household", months:2 }, { id:4, unit:"Unit 15D", name:"Mendoza Household", months:1 },
  { id:5, unit:"Unit 9A", name:"Cruz Household", months:3 }, { id:6, unit:"Unit 21B", name:"Santos Household", months:1 },
  { id:7, unit:"Unit 5A", name:"Vacant unit", months:2 }, { id:8, unit:"Unit 18C", name:"Aquino Household", months:1 }
].map(d => ({ ...d, amt: d.months * 450 }));
const GRIEVANCES = [
  { title:"Street light out on the Phase 2 road", by:"Reported by Unit 8A" },
  { title:"Construction noise after 8 PM", by:"Reported by Unit 14B" },
  { title:"Clogged drainage near the parking area", by:"Reported by Unit 3D" }
];
const DOCS = [
  { name:"House Rules and Regulations", cat:"Policy", date:"Updated Sep 1" }, { name:"2026 Association Dues Schedule", cat:"Finance", date:"Updated Aug 15" },
  { name:"Facility Reservation Form", cat:"Form", date:"Updated Jul 20" }, { name:"Fire Safety Advisory", cat:"Notice", date:"Sep 10" },
  { name:"Board Meeting Minutes, August", cat:"Minutes", date:"Aug 30" }
];
const VENDORS = ["Security guards","Landscaping","Garbage collection","Plumbing and repairs","Elevator maintenance"];
const ANNOUNCEMENTS = [
  { id:1, title:"Water interruption on Sept 30", body:"Scheduled maintenance, 10 PM–4 AM.", date:"Sep 24, 2026", status:"Published", type:"Maintenance", sms:true },
  { id:2, title:"Reminder: October dues due on the 5th", body:"Please settle dues on or before due date to avoid penalties.", date:"Sep 20, 2026", status:"Published", type:"General", sms:false },
  { id:3, title:"Elevator B undergoing inspection", body:"Elevator B out of service Oct 1, 8 AM–12 PM.", date:"Sep 18, 2026", status:"Draft", type:"Maintenance", sms:false }
];
const RESIDENT_PHONE_COUNT = 184;
const EVENTS = [
  { id:1, title:"Community Clean-Up Drive", date:"Oct 24, 2026 · 7:00 AM", place:"Ground floor lobby" },
  { id:2, title:"Halloween Kids' Party", date:"Oct 31, 2026 · 4:00 PM", place:"Function Hall" },
  { id:3, title:"HOA General Assembly", date:"Nov 8, 2026 · 6:00 PM", place:"Function Hall" }
];

/* ---------- App state ---------- */
const state = {
  authed: false,
  loginUser: "",
  loginPass: "",
  showPassword: false,
  showForgot: false, forgotEmail: "", forgotSent: false,
  loginError: false,
  trusted: [
    { name:"Ana Reyes", email:"ana.reyes@cityresidences.ph", phone:"0917 555 2201", role:"Board member", added:"Sep 2, 2026", suspended:false },
    { name:"Marco Dizon", email:"marco.dizon@cityresidences.ph", phone:"0917 555 2202", role:"Admin staff", added:"Sep 14, 2026", suspended:false }
  ],
  newName: "", newEmail: "", newPhone: "", newUnit: "", newRole: "Admin staff", manageError: "",
  ann: {}, newAnnTitle: "", newAnnBody: "", newAnnType: "General", newAnnSms: true, smsToast: "",
  newEventTitle: "", newEventDate: "", newEventPlace: "",
  newVendor: "",
  view: "home",
    unitFilter: "all",
  unitSearch: "",
  manageSearch: "",
  facIdx: 0,
  blocked: {},
  bookAction: {},
  finFilter: "unpaid",
  paid: {},
  bellOpen: false, bellSeen: false,
  reminded: {},
  gStatus: [0,1,2],
  darkMode: false,
  motorParkingRate: 500,
  motorParkingRateDraft: "500",
  rateToast: ""
};
const VALID_LOGINS = ["joseph","joseph capili","joseph.capili","owner","admin"];


/* ---------- Auth ---------- */
function doLogin(){
  const u = (state.loginUser||"").trim().toLowerCase();
  const match = state.trusted.find(t => t.email.toLowerCase() === u);
  if (match && match.suspended){ set({ authed:false, loginError:true }); return; }
  const ok = VALID_LOGINS.indexOf(u) >= 0 || !!match;
  if (ok) set({ authed:true, loginError:false });
  else set({ loginError:true });
}
function doLogout(){ set({ authed:false, loginUser:"", loginPass:"", loginError:false, view:"home" }); }
function onLoginInput(e){ state.loginUser = e.target.value; state.loginError = false; }
function onLoginPassInput(e){ state.loginPass = e.target.value; state.loginError = false; }
function onLoginKey(e){ if (e.key === "Enter") doLogin(); }
function togglePasswordVisible(){ state.showPassword = !state.showPassword; render(); }
function toggleForgot(){ state.showForgot = !state.showForgot; render(); }
function sendResetLink(){ if (!state.forgotEmail.trim()) return; set({ forgotSent:true }); }
function addTrusted(){
  const name = state.newName.trim();
  const email = state.newEmail.trim();
  if (!name || !email){ set({ manageError:"Full name and email are required." }); return; }
  if (!/^\S+@\S+\.\S+$/.test(email)){ set({ manageError:"Enter a valid email address." }); return; }
  const clash = email.toLowerCase() === "owner@cityresidences.ph" || state.trusted.some(t => t.email.toLowerCase() === email.toLowerCase());
  if (clash){ set({ manageError:"An account with that email already exists." }); return; }
  if (state.newRole === "Resident" && !state.newUnit.trim()){ set({ manageError:"Assign a unit to confirm this resident's account." }); return; }
  const unit = state.newRole === "Resident" ? state.newUnit.trim() : "—";
  logAct("Added trusted account for "+name+" ("+state.newRole+")");
  state.trusted.push({ name, email, phone: state.newPhone.trim() || "—", unit, role: state.newRole, added: "Just now", suspended:false });
  set({ newName:"", newEmail:"", newPhone:"", newUnit:"", manageError:"" });
}
function toggleSuspend(i){ state.trusted[i].suspended = !state.trusted[i].suspended; render(); }
function revokeTrusted(i){
  const t = state.trusted[i];
  if (!confirm(`Permanently revoke access for ${t.name}? This removes their account and cannot be undone.`)) return;
  logAct("Revoked access for "+t.name);
  state.trusted.splice(i,1);
  render();
}
function publishAnn(id){
  logAct("Published announcement “"+(ANNOUNCEMENTS.find(x=>x.id===id)||{}).title+"”");
  state.ann[id] = "Published";
  const a = ANNOUNCEMENTS.find(a=>a.id===id);
  if (a && a.sms){
    set({ smsToast: `Text alert sent — "${a.title}" was texted to all ${RESIDENT_PHONE_COUNT} residents' phone numbers on file. (Demo only — no real SMS is sent.)` });
    return;
  }
  render();
}
function addAnnouncement(){
  if (!state.newAnnTitle.trim()) return;
  logAct("Published announcement “"+state.newAnnTitle.trim()+"”");
  const type = state.newAnnType || "General";
  const sms = !!state.newAnnSms;
  ANNOUNCEMENTS.unshift({ id: Date.now(), title: state.newAnnTitle.trim(), body: state.newAnnBody.trim() || "—", date: "Just now", status: "Published", type, sms });
  const toast = sms
    ? `Text alert sent — "${state.newAnnTitle.trim()}" was texted to all ${RESIDENT_PHONE_COUNT} residents' phone numbers on file. (Demo only — no real SMS is sent.)`
    : "";
  set({ newAnnTitle:"", newAnnBody:"", newAnnType:"General", newAnnSms:true, smsToast: toast });
}
function dismissSmsToast(){ set({ smsToast:"" }); }
function addEvent(){
  if (!state.newEventTitle.trim()) return;
  logAct("Added event “"+state.newEventTitle.trim()+"”");
  EVENTS.unshift({ id: Date.now(), title: state.newEventTitle.trim(), date: state.newEventDate.trim() || "Date TBD", place: state.newEventPlace.trim() || "Venue TBD" });
  set({ newEventTitle:"", newEventDate:"", newEventPlace:"" });
}
function deleteAnn(id){ logAct("Deleted an announcement"); const i = ANNOUNCEMENTS.findIndex(a=>a.id===id); if (i>=0) ANNOUNCEMENTS.splice(i,1); render(); }
function editAnn(id){
  const a = ANNOUNCEMENTS.find(a=>a.id===id); if (!a) return;
  const t = prompt("Edit title", a.title); if (t===null) return;
  const b = prompt("Edit message", a.body); if (b===null) return;
  a.title = t.trim() || a.title; a.body = b.trim() || a.body;
  render();
}
function deleteEvent(id){ logAct("Deleted a community event"); const i = EVENTS.findIndex(e=>e.id===id); if (i>=0) EVENTS.splice(i,1); render(); }

function renderLogin(){
  return `
    <div class="login-wrap">
      <a class="back-link" href="index.html">&larr; Back to website</a>
      <div class="login-card">
        <img src="logo.jpg" alt="ResidentHub">
        <div class="name">Administrator sign-in</div>
        <div class="sub">CITY RESIDENCES CONDOMINIUM CORP.</div>
        <div class="login-badges">
          <span>Centralized dashboard</span>
          <span>Role-based access</span>
        </div>
        <div class="login-form">
          <label>Username or email</label>
          <input id="loginUserInput" placeholder="owner@cityresidences.ph" value="${escAttr(state.loginUser)}" oninput="onLoginInput(event)" onkeydown="onLoginKey(event)">
          <label>Password</label>
          <div class="pw-wrap">
            <input type="${state.showPassword?"text":"password"}" placeholder="••••••••" value="${escAttr(state.loginPass)}" oninput="onLoginPassInput(event)" onkeydown="onLoginKey(event)">
            <button type="button" class="pw-toggle" title="${state.showPassword?"Hide password":"Show password"}" onclick="togglePasswordVisible()">${state.showPassword?"Hide":"Show"}</button>
          </div>
          <button class="btn primary" onclick="doLogin()">Continue</button>
          ${state.loginError ? `<div class="login-err">That account isn't recognized, or has been suspended. Ask the owner for access.</div>` : ""}
          <div class="login-divider"></div>
          <div class="login-links">
            <button type="button" class="linklike" onclick="toggleForgot()">Forgot password?</button>
          </div>
          ${state.showForgot ? `
            <div class="forgot-panel">
              ${state.forgotSent ? `If <strong>${escAttr(state.forgotEmail)}</strong> matches an account on file, a reset link has been sent. (Demo only — no email is actually sent.)` : `
                <div style="font-weight:700;margin-bottom:6px">Reset your password</div>
                <input placeholder="owner@cityresidences.ph" value="${escAttr(state.forgotEmail)}" oninput="state.forgotEmail=this.value" style="width:100%;height:38px;margin-bottom:8px">
                <button class="btn primary" style="height:38px;width:100%" onclick="sendResetLink()">Send reset link</button>
              `}
            </div>` : ""}
        </div>
        <div class="login-note">Access is by invitation only.<br>Only the owner, <strong style="color:var(--ink)">Joseph Capili</strong>, or someone he has explicitly added as a trusted user can sign in — there is no public sign-up. Residents should use the <a href="resident.html" style="color:var(--navy-dark);font-weight:700">Resident Login</a> instead.</div>
        <div class="login-legal">By signing in, you agree to City Residences' administrator terms of use and privacy notice.</div>
      </div>
    </div>
  `;
}

/* ---------- Render ---------- */
function render(){
  document.documentElement.setAttribute("data-theme", state.darkMode ? "dark" : "light");
  const app = document.getElementById("app");
  // Play the entrance animation only when the screen actually changes (not on every keystroke re-render).
  const viewChanged = state.view !== window.__lastView, authChanged = state.authed !== window.__lastAuthed;
  window.__lastView = state.view; window.__lastAuthed = state.authed;
  app.classList.toggle("enter", viewChanged || authChanged);
  app.classList.toggle("enter-shell", authChanged);
  if (viewChanged && !authChanged && state.authed) window.scrollTo({ top:0, behavior:"smooth" });
  const active = document.activeElement;
  const focusId = (active && active.id) ? active.id : null;
  const selStart = (focusId && active.selectionStart != null) ? active.selectionStart : null;
  const selEnd = (focusId && active.selectionEnd != null) ? active.selectionEnd : null;
  if (!state.authed){
    app.innerHTML = renderLogin();
    return;
  }
  const isHome = state.view === "home";
  mountApp(app, `
    <div class="shell">
      <aside class="side">
        <div class="side-brand"><img src="logo.jpg" alt=""><span>ResidentHub</span></div>
        <div class="side-label">General</div>
        <nav>${navBtn("home","Dashboard")}${navBtn("units","Units")}${navBtn("fac","Facility")}${navBtn("ann","Announcements")}${navBtn("polls","Polls")}</nav>
        <div class="side-label">Tools</div>
        <nav>${navBtn("fin","Finance")}${navBtn("reports","Reports")}${navBtn("req","Grievances")}${navBtn("parking","Parking")}${navBtn("rentals","Rentals")}</nav>
        <div class="side-label">Admin</div>
        <nav>${navBtn("log","Activity log")}${navBtn("manage","Access")}${navBtn("settings","Settings")}</nav>
        <div class="side-foot">
          <button class="side-user" title="Open my profile" onclick="set({view:'profile'})"><span class="avatar">JC</span><span><b>Joseph Capili</b><small>Administrator</small></span></button>
          <button class="side-out" onclick="doLogout()">${icon("logout")}<span>Log out</span></button>
        </div>
      </aside>
      <main>
        <div class="topline">
          ${searchBox("Search units, residents, announcements, polls...")}
          <div class="top-actions">
            <span class="pill sample">Sample data</span>
            <button class="icon-btn" title="Toggle dark mode" aria-label="Toggle dark mode" onclick="toggleDarkMode()">${icon(state.darkMode ? "sun" : "moon")}</button>
            ${bellHtml()}
          </div>
        </div>
        <div class="body ${isHome?"with-aside":""}">
          <div class="col">
            <div class="pagehead"><p class="kicker">${todayLabel()}</p><h1>${titles()[0]}</h1><p>${titles()[1]}</p></div>
            ${view()}
          </div>
          ${isHome ? homeAside() : ""}
        </div>
      </main>
    </div>
  `);
  if (focusId){
    const el = document.getElementById(focusId);
    if (el){ el.focus(); if (selStart != null && el.setSelectionRange) el.setSelectionRange(selStart, selEnd); }
  }
}
function titles(){
  return {
    home: [greeting() + ", Joseph", homeSummary()],
    units: ["Units & residents","Maintain unit, occupancy, and resident records."],
    fac: ["Facility booking","Manage facilities, check availability, and approve or deny reservation requests."],
    fin: ["Finance","Dues, charges, payment status and payment history."],
    req: ["Grievances &amp; documents","Track resident concerns and manage shared files."],
    manage: ["Manage access","Add or revoke trusted accounts. Only the owner can grant access — there is no public sign-up."],
    ann: ["Announcements","Publish community announcements and events."],
    rentals: ["Unit rentals","Review units residents have declared as leased, short-term rentals, or home businesses."],
    polls: ["Polls & voting","Ask residents what they think and see the results as votes come in."],
    reports: ["Reports","Collections, occupancy, dues ageing, facility use and requests at a glance."],
    parking: ["Parking","Motor parking slots, who has one, and requests waiting for approval."],
    log: ["Activity log","A record of what the administrators did, newest first."],
    settings: ["Settings","Association details, billing defaults and your preferences."],
    profile: ["My profile","Your administrator account, recent activity and shortcuts."]
  }[state.view];
}
function view(){
  if (state.view === "home") return viewHome();
  if (state.view === "units") return viewUnits();
  if (state.view === "fac") return viewFac();
  if (state.view === "fin") return viewFin();
  if (state.view === "manage") return viewManage();
  if (state.view === "ann") return viewAnn();
  if (state.view === "rentals") return viewRentals();
  if (state.view === "polls") return viewPolls();
  if (state.view === "reports") return viewReports();
  if (state.view === "parking") return viewParking();
  if (state.view === "log") return viewLog();
  if (state.view === "settings") return viewSettings();
  if (state.view === "profile") return viewProfile();
  return viewReq();
}

function typeChipClass(t){ return t==="Emergency" ? "bad" : t==="Warning" ? "warn" : t==="Maintenance" ? "info" : ""; }
function viewAnn(){
  return `
    <div class="two-col-r" style="grid-template-columns:minmax(0,1.3fr) minmax(0,1fr)">
      <div style="display:flex;flex-direction:column;gap:16px">
        ${state.smsToast ? `<div class="card" style="background:var(--good-bg);border-color:#B9D6B4;color:var(--good-fg);display:flex;justify-content:space-between;align-items:center;gap:10px">
          <span style="font-size:13px;font-weight:600">${state.smsToast}</span>
          <button class="btn" style="min-height:30px;padding:0 10px;font-size:12px" onclick="dismissSmsToast()">Dismiss</button>
        </div>` : ""}
        <div class="card" style="display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;justify-content:space-between;align-items:baseline">
            <h2 style="font-size:19px">Create announcement</h2>
          </div>
          <input placeholder="Title" value="${escAttr(state.newAnnTitle)}" oninput="state.newAnnTitle=this.value" style="height:44px;border:1px solid #CFC3A9;border-radius:10px;padding:0 12px;font-size:14px">
          <textarea placeholder="Message" oninput="state.newAnnBody=this.value" style="min-height:70px;border:1px solid #CFC3A9;border-radius:10px;padding:10px 12px;font-size:14px;font-family:inherit;resize:vertical">${escAttr(state.newAnnBody)}</textarea>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <div class="field" style="flex-grow:0">
              <label style="font-size:12px;font-weight:700;color:var(--muted)">Type</label>
              <select onchange="state.newAnnType=this.value" style="height:40px;border:1px solid #CFC3A9;border-radius:10px;padding:0 10px;font-size:14px">
                <option ${state.newAnnType==="General"?"selected":""}>General</option>
                <option ${state.newAnnType==="Maintenance"?"selected":""}>Maintenance</option>
                <option ${state.newAnnType==="Warning"?"selected":""}>Warning</option>
                <option ${state.newAnnType==="Emergency"?"selected":""}>Emergency</option>
              </select>
            </div>
            <label style="flex-direction:row;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--ink)">
              <input type="checkbox" style="width:16px;height:16px" ${state.newAnnSms?"checked":""} onchange="state.newAnnSms=this.checked">
              Also text this to all residents' phone numbers
            </label>
          </div>
          <button class="btn primary" onclick="addAnnouncement()">Publish announcement</button>
        </div>
        <div class="card" style="padding:0;overflow:hidden">
          <div style="display:flex;align-items:center;padding:14px 18px"><h2 style="font-size:19px;flex-grow:1">Announcements</h2><button class="btn" onclick='exportCSV("announcements.csv",["Title","Body","Type","Date","Status","Texted"],ANNOUNCEMENTS.map(a=>[a.title,a.body,a.type||"General",a.date,state.ann[a.id]||a.status,a.sms?"Yes":"No"]))'>Export to Excel (.csv)</button></div>
          ${ANNOUNCEMENTS.map(a=>{
            const status = state.ann[a.id] || a.status;
            const type = a.type || "General";
            return `<div style="padding:12px 18px;border-top:1px solid var(--border2)">
              <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px">
                <div style="font-weight:700;font-size:15px">${a.title}</div>
                <span style="display:flex;gap:6px;flex-shrink:0">
                  ${type!=="General" ? `<span class="chip ${typeChipClass(type)}">${type}</span>` : ""}
                  <span class="chip ${status==="Published"?"good":"warn"}">${status}</span>
                </span>
              </div>
              <div style="font-size:13px;color:var(--muted);margin:4px 0">${a.body}</div>
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-size:12px;color:var(--muted)">${a.date}${a.sms?" · Texted to residents":""}</span>
                <span style="display:flex;gap:6px">
                  ${status!=="Published" ? `<button class="btn" onclick="publishAnn(${a.id})">Publish</button>` : ""}
                  <button class="btn" style="font-size:12px" onclick="editAnn(${a.id})">Edit</button>
                  <button class="btn" style="font-size:12px;color:#A02B1D" onclick="deleteAnn(${a.id})">Delete</button>
                </span>
              </div>
            </div>`;
          }).join("")}
        </div>
      </div>
      <div class="card" style="display:flex;flex-direction:column;gap:10px">
        <h2 style="font-size:19px">Add event</h2>
        <input placeholder="Event title" value="${escAttr(state.newEventTitle)}" oninput="state.newEventTitle=this.value" style="height:44px;border:1px solid #CFC3A9;border-radius:10px;padding:0 12px;font-size:14px">
        <input placeholder="Date &amp; time, e.g. Oct 4, 2026 · 7:00 AM" value="${escAttr(state.newEventDate)}" oninput="state.newEventDate=this.value" style="height:44px;border:1px solid #CFC3A9;border-radius:10px;padding:0 12px;font-size:14px">
        <input placeholder="Venue" value="${escAttr(state.newEventPlace)}" oninput="state.newEventPlace=this.value" style="height:44px;border:1px solid #CFC3A9;border-radius:10px;padding:0 12px;font-size:14px">
        <button class="btn primary" onclick="addEvent()">+ Add event</button>
        <div style="border-top:1px solid var(--border2);margin-top:6px;padding-top:10px;display:flex;justify-content:space-between;align-items:baseline">
          <h2 style="font-size:16px">Upcoming events</h2>
          <button class="btn" onclick='exportCSV("events.csv",["Title","Date","Venue"],EVENTS.map(e=>[e.title,e.date,e.place]))' style="font-size:12px;min-height:34px">Export .csv</button>
        </div>
        ${EVENTS.map(e=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-top:1px solid var(--border2)"><div><div style="font-weight:700;font-size:14px">${e.title}</div><div style="font-size:12px;color:var(--muted)">${e.date} · ${e.place}</div></div><button class="btn" style="min-height:32px;padding:0 10px;font-size:12px;color:#A02B1D" onclick="deleteEvent(${e.id})">Delete</button></div>`).join("")}
      </div>
    </div>
  `;
}

function viewManage(){
  const roleClass = r => r === "Board member" ? "warn" : r === "Resident" ? "good" : "good";
  const mq = state.manageSearch.trim().toLowerCase();
  const matches = t => !mq || (t.name+" "+t.email+" "+(t.unit||"")+" "+t.role).toLowerCase().indexOf(mq) >= 0;
  const visibleTrusted = state.trusted.map((t,i)=>({t,i})).filter(x=>matches(x.t));
  return `
    <div class="card" style="display:flex;flex-direction:column;gap:12px">
      <h2 style="font-size:19px">Create a new account</h2>
      <p style="margin:0;font-size:13px;color:var(--muted)">Only the owner can create accounts here — this is the sign-up. There is no public sign-up form; every account (including residents) is added by hand, by Joseph Capili.</p>
      <div class="manage-row" style="flex-wrap:wrap">
        <div class="field"><label>Full name</label><input value="${escAttr(state.newName)}" oninput="state.newName=this.value" placeholder="e.g. Ana Reyes"></div>
        <div class="field"><label>Email address</label><input value="${escAttr(state.newEmail)}" oninput="state.newEmail=this.value" placeholder="e.g. ana.reyes@cityresidences.ph"></div>
        <div class="field"><label>Phone number</label><input value="${escAttr(state.newPhone)}" oninput="state.newPhone=this.value" placeholder="e.g. 0917 555 0000"></div>
        <div class="field" style="flex-grow:0">
          <label>Role</label>
          <select onchange="set({newRole:this.value})">
            <option ${state.newRole==="Admin staff"?"selected":""}>Admin staff</option>
            <option ${state.newRole==="Resident"?"selected":""}>Resident</option>
            <option ${state.newRole==="Board member"?"selected":""}>Board member</option>
          </select>
        </div>
        ${state.newRole==="Resident" ? `<div class="field"><label>Unit (confirms ownership/tenancy)</label><input value="${escAttr(state.newUnit)}" oninput="state.newUnit=this.value" placeholder="e.g. Unit 12A"></div>` : ""}
        <button class="btn primary" onclick="addTrusted()">+ Create account</button>
      </div>
      ${state.manageError ? `<div style="font-size:13px;color:#A02B1D;font-weight:600">${state.manageError}</div>` : ""}
      ${state.newRole==="Resident" ? `<p style="margin:0;font-size:12px;color:var(--muted)">Assigning a unit here is what confirms this person as a verified resident — it's the same "confirmation" step a new owner/tenant goes through before they can sign in and submit grievances. It's required so no resident account is ever left unconfirmed.</p>` : ""}
    </div>
    <div class="card" style="padding:0;overflow:hidden;margin-top:16px">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:14px 18px">
        <h2 style="font-size:19px;margin:0">People with access</h2>
        <input id="manageSearchInput" value="${escAttr(state.manageSearch)}" oninput="set({manageSearch:this.value})" placeholder="Search name, email, unit or role..." style="height:38px;border:1px solid #CFC3A9;border-radius:999px;padding:0 14px;font-size:13px;min-width:220px">
        <span style="font-size:13px;color:var(--muted);margin-left:auto">${visibleTrusted.length+1} of ${state.trusted.length+1} accounts</span>
        <label class="btn file-import-btn">Import access CSV<input type="file" accept=".csv,text/csv" onchange="importFile('access',this)" hidden></label>
        <button class="btn" onclick="downloadImportTemplate('access')">CSV template</button>
        <button class="btn" onclick='exportCSV("residenthub-accounts.csv",["Name","Email","Phone","Unit","Role","Status","Added"],[["Joseph Capili","owner@cityresidences.ph","—","—","Owner","Active","—"]].concat(state.trusted.map(t=>[t.name,t.email,t.phone,t.unit||"—",t.role,t.suspended?"Suspended":"Active",t.added])))'>Export to Excel (.csv)</button>
      </div>
      ${exactCSV.access ? exactTable("access") : `<table><thead><tr><th>NAME</th><th>EMAIL</th><th>PHONE</th><th>UNIT</th><th>ROLE</th><th>STATUS</th><th>ADDED</th><th>ACTION</th></tr></thead>
      <tbody>
        <tr><td style="font-weight:700">Joseph Capili</td><td style="color:var(--muted)">owner (cannot be revoked)</td><td style="color:var(--muted)">—</td><td style="color:var(--muted)">—</td><td><span class="chip info">Owner</span></td><td><span class="chip good">Active</span></td><td style="color:var(--muted)">—</td><td></td></tr>
        ${visibleTrusted.map(x=>{const t=x.t,i=x.i; return `<tr${t.suspended?' style="opacity:.55"':''}><td style="font-weight:700">${t.name}</td><td style="color:var(--muted)">${t.email}</td><td style="color:var(--muted)">${t.phone||"—"}</td><td style="color:var(--muted)">${t.unit||"—"}</td><td><span class="chip ${roleClass(t.role)}">${t.role}</span></td><td><span class="chip ${t.suspended?"bad":"good"}">${t.suspended?"Suspended":"Active"}</span></td><td style="color:var(--muted)">${t.added}</td><td style="display:flex;gap:6px"><button class="btn" style="font-size:12px;min-height:32px;padding:0 10px" onclick="toggleSuspend(${i})">${t.suspended?"Reactivate":"Suspend"}</button><button class="btn" style="font-size:12px;min-height:32px;padding:0 10px;color:#A02B1D" onclick="revokeTrusted(${i})">Revoke</button></td></tr>`;}).join("")}
        ${(mq && visibleTrusted.length===0) ? `<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:18px">No accounts match "${escAttr(state.manageSearch)}".</td></tr>` : ""}
      </tbody></table>`}
      <div style="padding:10px 18px;font-size:12px;color:var(--muted);border-top:1px solid var(--border2)">Suspend keeps the account on file but blocks sign-in; Revoke permanently removes it and asks for confirmation first.</div>
    </div>
  `;
}

function counts(){
  return {
    unpaid: DUES.filter(d=>!state.paid[d.id]).length,
    grievances: state.gStatus.filter(s=>s<2).length,
    bookings: BOOKING_REQS.filter(r=>!state.bookAction[r.id]).length,
    rentals: UNITS.filter(u=>(u.usage==="shortterm"||u.usage==="business") && u.usageStatus==="pending").length
  };
}
function homeSummary(){
  const c = counts();
  return `${c.unpaid} unpaid dues, ${c.bookings} booking requests and ${c.grievances} open grievances are waiting for you today at City Residences.`;
}
const UPCOMING_BOOKINGS = [["Function Hall","Garcia Household","Saturday, 2:00 PM"],["Swimming Pool","Mendoza Household","Sunday, 6:00 AM"],["Function Hall","Reyes Household","October 3, 6:00 PM"]];
function homeAside(){
  const items = EVENTS.map(e=>[e.title, e.place, e.date]).concat(UPCOMING_BOOKINGS.map(b=>[b[0]+" booking", b[1], b[2]]));
  return asideHtml(items.slice(0,4), "Add event", "ann");
}
function viewHome(){
  const c = counts();
  const bars = DUES.map(d=>`<i class="${state.paid[d.id]?"on":""}" style="height:${25+d.months*20}%" title="${d.unit}"></i>`).join("");
  const quick = [
    ["Create Announcement","ann"], ["New Poll","polls"], ["Add Finance Charge","fin"],
    ["View Reports","reports"], ["Assign Parking","parking"], ["My Profile","profile"], ["Settings","settings"]
  ];
  const pendingBookings = BOOKING_REQS.filter(r=>!state.bookAction[r.id]).slice(0,2);
  const openGr = GRIEVANCES.filter((g,i)=>state.gStatus[i]<2).slice(0,2);
  const rows = pendingBookings.map((r,i)=>listRow(1+i%2, r.place, r.who, r.when.split(",")[0], "fac", i===0))
    .concat(openGr.map((g,i)=>listRow(3+i%2, g.title, g.by, "Open", "req", false)));
  const openPolls = POLLS.filter(p=>p.open).length;
  const parkingUsed = PARKING.filter(s=>s.unit).length;
  return `
    <div class="sc-grid">
      ${summaryCard("yellow","Community",[["52","Units","units"],["184","Residents","units"],["5","Vendors","req"]],"cross")}
      ${summaryCard("pink","Finance",[[peso(184200),"Earnings this month","fin"],[c.unpaid,"Unpaid dues","fin"]],"heart",`<div class="bars" title="One bar per unit. Solid bars are paid.">${bars}</div>`)}
      ${summaryCard("green","Needs attention",[[c.grievances,"Grievances","req"],[c.bookings,"Bookings","fac"],[c.rentals,"Rentals to review","rentals"]],"triangle")}
      ${summaryCard("blue","Community life",[[openPolls,"Open polls","polls"],[parkingUsed+"/"+PARKING.length,"Parking used","parking"]],"burst")}
    </div>
    <div class="pills-row">${quick.map(q=>`<button onclick="set({view:'${q[1]}'})">${q[0]}</button>`).join("")}</div>
    <div class="two-lists">
      <section>
        <div class="sec-head"><h2>Pending requests</h2><button class="btn-dark sm" onclick="set({view:'fac'})">Open requests</button></div>
        <div class="lrows">${rows.join("") || '<p class="empty">Nothing is waiting for you. Nice work.</p>'}</div>
      </section>
      <section class="panel pink">
        <div class="sec-head"><h2>Announcements</h2><button class="btn-dark sm" onclick="set({view:'ann'})">See all</button></div>
        ${ANNOUNCEMENTS.slice(0,3).map(a=>`<div class="note"><b>${a.title}</b>${(a.type&&a.type!=="General")?`<span class="chip ${typeChipClass(a.type)}">${a.type}</span>`:""}<small>${a.status} · ${a.date}</small></div>`).join("")}
      </section>
    </div>
    <section>
      <div class="sec-head"><h2>Recent activity</h2><button class="btn-dark sm" onclick="set({view:'log'})">Full log</button></div>
      <div class="activity">${ACTIVITY.slice(0,4).map(x=>`<div><b>${x.what}</b><small>${x.who} · ${x.when}</small></div>`).join("")}</div>
    </section>
  `;
}

function rowsForExportUnits(){ return UNITS.map(u=>[u.unit,u.name,u.type,u.status,u.contact,usageLabel(u.usage)]); }
function usageLabel(usage){
  return { owner:"Owner-occupied", tenant:"Leased (long-term)", shortterm:"Short-term rental", business:"Business use" }[usage] || "—";
}
function usageChipClass(usage){
  return (usage==="shortterm" || usage==="business") ? "warn" : usage==="tenant" ? "info" : "good";
}
function usageCellHtml(u){
  if (!u.usage) return `<span style="color:var(--muted)">—</span>`;
  const needsApproval = u.usage==="shortterm" || u.usage==="business";
  const statusText = needsApproval ? (u.usageStatus==="approved"?" · Approved":u.usageStatus==="rejected"?" · Rejected":" · Pending") : "";
  return `<span class="chip ${usageChipClass(u.usage)}" title="${escAttr(u.usageDetails||"")}">${usageLabel(u.usage)}${statusText}</span>`;
}
function viewUnits(){
  const filters = [["all","All units (52)"],["vacant","Vacant (1)"],["overdue","With overdue dues"],["flagged","Rented out / business use"]];
  const q = state.unitSearch.trim().toLowerCase();
  const rows = UNITS.filter(u => state.unitFilter==="all" || (state.unitFilter==="vacant"&&u.status==="Vacant") || (state.unitFilter==="overdue"&&u.overdue>0) || (state.unitFilter==="flagged"&&(u.usage==="shortterm"||u.usage==="business")))
    .filter(u => !q || (u.unit+" "+u.name+" "+u.contact).toLowerCase().indexOf(q) >= 0);
  return `
    <div class="filters">
      ${filters.map(f=>`<button class="${state.unitFilter===f[0]?"active":""}" onclick="set({unitFilter:'${f[0]}'})">${f[1]}</button>`).join("")}
      <input id="unitSearchInput" value="${escAttr(state.unitSearch)}" oninput="set({unitSearch:this.value})" placeholder="Search unit, name or contact..." style="height:40px;border:1px solid #CFC3A9;border-radius:999px;padding:0 16px;font-size:13px;min-width:220px">
      <span style="margin-left:auto;font-size:13px;color:var(--muted)">${rows.length} units on record</span>
      <label class="btn file-import-btn">Import CSV<input type="file" accept=".csv,text/csv" onchange="importFile('units',this)" hidden></label>
      <button class="btn" onclick="downloadImportTemplate('units')">Template</button>
      <button class="btn primary" onclick='exportCSV("units.csv",["Unit","Resident/Owner","Occupancy","Status","Contact","Usage"],rowsForExportUnits())'>Export CSV</button>
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      ${exactCSV.units ? exactTable("units") : `<table><thead><tr><th>UNIT</th><th>RESIDENT / OWNER</th><th>OCCUPANCY</th><th>STATUS</th><th>CONTACT</th><th>USAGE</th><th></th></tr></thead>
      <tbody>${rows.map(u=>`<tr><td style="font-weight:700">${u.unit}</td><td>${u.name}</td><td style="color:var(--muted)">${u.type}</td><td><span class="chip ${u.status==="Vacant"?"warn":"good"}">${u.status}</span></td><td style="color:var(--muted)">${u.contact}</td><td>${usageCellHtml(u)}</td><td><button class="btn" style="min-height:34px;padding:0 14px;font-size:12.5px" onclick="showUnit('${u.unit}')">View</button></td></tr>`).join("")}</tbody></table>`}
    </div>
  `;
}

function viewFac(){
  return `<div class="facility-today-grid">${FACILITIES.map((f,i)=>`<div class="card"><h2>${escAttr(f.name)} · Availability today</h2><p class="hint">${escAttr(f.hours)} · Select a slot to change availability</p>${i===0?'<p class="hint">Residents enter free; guests pay ₱150 per visit.</p>':''}<div class="slots">${SLOT_TIMES.map((t,j)=>{const booked=BASE_BOOKED[i].includes(j)!==!!state.blocked[i+'-'+j];return `<button class="slot ${booked?'booked':'open'}" onclick="set({facIdx:${i}});toggleSlot(${j})"><b>${t}</b><span>${booked?'Booked':'Open'}</span></button>`}).join('')}</div></div>`).join('')}</div>`;
}

function toggleSlot(idx){ const key = state.facIdx+"-"+idx; state.blocked[key] = !state.blocked[key]; render(); }
function bookAct(id,action){ logAct((action==="approve"?"Approved":"Denied")+" the "+BOOKING_REQS.find(r=>r.id===id).place+" booking for "+BOOKING_REQS.find(r=>r.id===id).who); state.bookAction[id] = action; render(); }

function updateMotorParkingRate(){
  const n = parseFloat(state.motorParkingRateDraft);
  if (isNaN(n) || n < 0) { set({ rateToast: "Enter a valid amount before updating the rate." }); return; }
  state.motorParkingRate = n;
  logAct("Updated motor parking rate to "+peso(n)+"/month");
  state.motorParkingRateDraft = String(n);
  set({ rateToast: `Motor parking rental rate updated to ${peso(n)}/month.` });
}
function dismissRateToast(){ set({ rateToast:"" }); }

function viewRentals(){
  const flagged = UNITS.filter(u=>u.usage==="shortterm"||u.usage==="business");
  const pending = flagged.filter(u=>u.usageStatus==="pending").length;
  const approved = flagged.filter(u=>u.usageStatus==="approved").length;
  const rejected = flagged.filter(u=>u.usageStatus==="rejected").length;
  return `
    <div class="grid cols-3">
      <div class="card"><div class="stat-label">Awaiting review</div><div class="stat-value">${pending}</div></div>
      <div class="card"><div class="stat-label">Approved</div><div class="stat-value">${approved}</div></div>
      <div class="card"><div class="stat-label">Rejected</div><div class="stat-value">${rejected}</div></div>
    </div>
    <div class="card" style="margin-top:16px;font-size:13px;color:var(--muted)">
      Residents declare this themselves under their portal's <b>Unit Rental</b> tab. Short-term rentals (e.g. Airbnb) and home-based businesses need your review here before they're marked Approved — long-term tenant leases and owner-occupied units don't need approval and won't appear in this list.
    </div>
    <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px">
      ${flagged.length===0 ? `<div class="card" style="text-align:center;color:var(--muted)">No units have declared a short-term rental or business use yet.</div>` : flagged.map(u=>{
        const statusChip = u.usageStatus==="approved" ? `<span class="chip good">Approved</span>` : u.usageStatus==="rejected" ? `<span class="chip bad">Rejected</span>` : `<span class="chip warn">Pending review</span>`;
        return `<div class="card" style="display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap">
            <div><span style="font-weight:700;font-size:16px">${u.unit}</span><span style="color:var(--muted);font-size:13px"> · ${u.name}</span></div>
            <span style="display:flex;gap:8px;align-items:center">${statusChip}<span class="chip ${usageChipClass(u.usage)}">${usageLabel(u.usage)}</span></span>
          </div>
          <div style="font-size:13px;color:var(--muted)">${u.usageDetails || "No additional details provided."}</div>
          ${u.usageRemark ? `<div style="font-size:12px;color:#A02B1D">Your note to the resident: "${u.usageRemark}"</div>` : ""}
          ${u.usageStatus==="pending" ? `<div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;border-top:1px solid var(--border2);padding-top:10px">
            <div class="field" style="flex-grow:1;min-width:200px"><label style="font-size:12px;font-weight:700;color:var(--muted)">Note (optional, shown to resident if rejected)</label><input id="rentalNote-${u.unit.replace(/\s+/g,'')}" placeholder="e.g. Please submit your barangay business permit"></div>
            <button class="btn primary" onclick="rentalAct('${u.unit}','approved')">Approve</button>
            <button class="btn" onclick="rentalAct('${u.unit}','rejected')">Reject</button>
          </div>` : `<div style="border-top:1px solid var(--border2);padding-top:10px"><button class="btn" style="font-size:12px" onclick="set({unitFilter:'flagged',view:'units'})">View in Units &amp; Residents</button></div>`}
        </div>`;
      }).join("")}
    </div>
  `;
}
function rentalAct(unit, decision){
  const u = UNITS.find(x=>x.unit===unit);
  if (!u) return;
  const noteEl = document.getElementById("rentalNote-"+unit.replace(/\s+/g,''));
  const note = noteEl ? noteEl.value.trim() : "";
  u.usageStatus = decision;
  logAct((decision==="approved"?"Approved":"Rejected")+" unit usage declaration for "+unit);
  u.usageRemark = decision==="rejected" ? (note || "Not approved at this time — please contact the office.") : "";
  try {
    const existing = JSON.parse(localStorage.getItem("residenthub_unit_usage") || "{}");
    const key = Object.keys(existing).find(function(k){ return k.split(" · ")[0] === unit; }) || unit;
    existing[key] = Object.assign({}, existing[key], { usage:u.usage, details:u.usageDetails, status:u.usageStatus, remark:u.usageRemark });
    localStorage.setItem("residenthub_unit_usage", JSON.stringify(existing));
  } catch(e){ /* storage unavailable — admin-side status still updates */ }
  render();
}

function viewReq(){
  const stepNames = ["Open","In progress","Resolved"];
  return `
    <div class="grid cols-3">
      ${GRIEVANCES.map((g,i)=>{
        const s = state.gStatus[i];
        const steps = stepNames.map((n,k)=>`<span class="chip ${k===s?(k===2?"good":k===1?"warn":"bad"):"info"}" style="${k===s?"":"background:#F1E9D8;color:#6F6753"}">${n}</span>`).join(" ");
        const canAdvance = s < 2;
        return `<div class="card"><div><div style="font:700 17px 'Bricolage Grotesque','Source Sans 3',sans-serif">${g.title}</div><div style="font-size:12px;color:var(--muted);margin-top:2px">${g.by}</div></div>
          <div style="display:flex;gap:6px;margin:10px 0">${steps}</div>
          ${canAdvance?`<button class="btn primary" style="width:100%" onclick="advanceGr(${i})">${s===0?"Start working on it":"Mark resolved"}</button>`:""}</div>`;
      }).join("")}
    </div>
    <div class="two-col-r" style="grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);margin-top:16px">
      <div class="card" style="padding:0;overflow:hidden">
        <div style="display:flex;align-items:center;padding:14px 18px">
          <h2 style="font-size:19px;flex-grow:1">Community documents</h2>
          <input type="file" id="docFileInput" style="display:none" onchange="uploadDoc(event)">
          <button class="btn primary" style="margin-right:8px" onclick="document.getElementById('docFileInput').click()">+ Upload file</button>
          <button class="btn" onclick='exportCSV("documents.csv",["Name","Category","Date"],DOCS.map(d=>[d.name,d.cat,d.date]))'>Export .csv</button>
        </div>
        ${DOCS.map((d,i)=>`<div style="display:flex;align-items:center;gap:12px;padding:0 18px;height:50px;border-top:1px solid var(--border2);font-size:14px"><span style="flex-grow:1;font-weight:700">${d.name}</span><span style="color:var(--muted)">${d.cat}</span><span style="color:var(--muted)">${d.date}</span><button class="btn" style="min-height:32px;padding:0 10px;font-size:12px;color:#A02B1D" onclick="removeDoc(${i})">Remove</button></div>`).join("")}
      </div>

    </div>
  `;
}
function advanceGr(i){ logAct("Moved grievance “"+GRIEVANCES[i].title+"” forward"); state.gStatus[i] = Math.min(2, state.gStatus[i]+1); render(); }
function uploadDoc(e){
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const today = new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"});
  logAct("Uploaded document “"+file.name+"”");
  DOCS.unshift({ name: file.name, cat: "Uploaded", date: "Uploaded " + today });
  render();
}
function removeDoc(i){ DOCS.splice(i,1); render(); }
function addVendor(){
  if (!state.newVendor || !state.newVendor.trim()) return;
  VENDORS.push(state.newVendor.trim());
  set({ newVendor:"" });
}
function removeVendor(i){ VENDORS.splice(i,1); render(); }

// Interactive buttons: ripple + press feedback on every .btn. Delegated on
// document (not attached per-button) so it keeps working after render()
// rebuilds the DOM, since this app's whole UI is re-rendered on every action.
(function(){
  document.addEventListener("pointerdown", function(e){
    var btn = e.target.closest(".btn");
    if (btn) btn.classList.add("is-pressed");
  });
  ["pointerup","pointerleave"].forEach(function(ev){
    document.addEventListener(ev, function(e){
      var btn = e.target.closest(".btn");
      if (btn) btn.classList.remove("is-pressed");
    });
  });
  document.addEventListener("click", function(e){
    var btn = e.target.closest(".btn");
    if (!btn) return;
    var rect = btn.getBoundingClientRect();
    var size = Math.max(rect.width, rect.height) * 1.6;
    var ripple = document.createElement("span");
    ripple.className = "btn-ripple";
    ripple.style.width = ripple.style.height = size + "px";
    ripple.style.left = (e.clientX - rect.left - size / 2) + "px";
    ripple.style.top = (e.clientY - rect.top - size / 2) + "px";
    btn.appendChild(ripple);
    ripple.addEventListener("animationend", function(){ ripple.remove(); });
  });
})();

render();
