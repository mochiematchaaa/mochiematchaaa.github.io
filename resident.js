/* Resident portal — app logic.
   Loaded by resident.html. The page markup is built from the render() functions below. */

const FACILITIES = [
  { name:"Swimming Pool", hours:"6:00 AM – 8:00 PM" }, { name:"Function Hall", hours:"8:00 AM – 10:00 PM" }
];
const SLOT_TIMES = ["8–10","10–12","12–2","2–4","4–6","6–8","8–10"];
const BASE_BOOKED = [[4,6],[0,2]];
const POSTS = [
  { title:"Water interruption this Saturday", body:"Main water supply will be shut off from 9 AM to 3 PM for pipe maintenance.", when:"Posted yesterday", type:"Maintenance", sms:true },
  { title:"Annual General Assembly", body:"This year's assembly is set for October 18, 6:00 PM at the Function Hall.", when:"Posted 3 days ago", type:"General", sms:false }
];
const EVENTS = [["Zumba at the Function Hall","Every Sat, 6:00 AM"],["Trick or Treat, Phase 2","Oct 31, 4:00 PM"],["Annual General Assembly","Oct 18, 6:00 PM"]];
const NOTIFS = [
  ["Your Function Hall booking for Saturday was approved.","good"], ["Your unit usage declaration was received by the office.","info"],
  ["Dues for September are now overdue.","bad"], ["New announcement: Water interruption this Saturday.","info"]
];
const BASE_BOOKINGS = [
  { place:"Function Hall", when:"Saturday, 2:00 PM – 6:00 PM", status:"Approved" },
  { place:"Function Hall", when:"Sep 10, 6:00 PM – 9:00 PM", status:"Completed" },
  { place:"Swimming Pool", when:"Sep 2, 3:00 PM – 5:00 PM", status:"Completed" }
];
const DUES_ROWS = [
  { month:"September 2026", amt:450, due:"Sep 15", status:"Overdue" }, { month:"August 2026", amt:450, due:"Aug 15", status:"Paid" },
  { month:"July 2026", amt:450, due:"Jul 15", status:"Paid" }, { month:"June 2026", amt:450, due:"Jun 15", status:"Paid" }
];
const MOTOR_PARKING_RATE = 500;
const BASE_GRS = [{ title:"Slow drainage in the hallway sink", body:"Reported last week, plumber scheduled.", status:"In progress" }];
const DOCS = [
  { name:"House Rules and Regulations", cat:"Policy", date:"Updated Sep 1" }, { name:"2026 Association Dues Schedule", cat:"Finance", date:"Updated Aug 15" },
  { name:"Facility Reservation Form", cat:"Form", date:"Updated Jul 20" }, { name:"Fire Safety Advisory", cat:"Notice", date:"Sep 10" }, { name:"Board Meeting Minutes, August", cat:"Minutes", date:"Aug 30" }
];

const REGISTERED = [
  { name:"Maria Santos", unit:"Unit 12A · Owner", email:"maria.santos@cityresidences.ph", phone:"0917 555 0112", password:"resident123", confirmedOn:"Jan 15, 2026" },
  { name:"Jessele Fugaban", unit:"Unit 6B · Owner", email:"jessele.fugaban@cityresidences.ph", phone:"0917 555 0145", password:"resident123", confirmedOn:"Feb 3, 2026" }
];
const state = {
  authed:false, authErr:"", redirecting:"",
  signinEmail:"", signinPassword:"", showPassword:false,
  showForgot:false, forgotEmail:"", forgotSent:false,
  showNoAccount:false,
  currentUser:null,
  view:"home", facIdx:0, pick:null, submitted:{}, extraBookings:[],  bellOpen:false, bellSeen:false, grTitle:"", grBody:"", myGrs:[],
  darkMode:false, settingsMsg:"",
  motorParkingRequested:false,
  payFor:"", payAmt:"", payMethod:"GCash", payRef:"",
  unitUsage:"owner", unitUsageDetails:"", unitUsageSaved:false, unitUsageMsg:"",
  profile:{ name:"Maria Santos", email:"maria.santos@cityresidences.ph", phone:"0917 555 0112" },
  sessions:[
    { id:1, device:"Chrome on Windows", location:"Quezon City, PH", when:"Active now", current:true },
    { id:2, device:"Safari on iPhone 13", location:"Quezon City, PH", when:"2 hours ago", current:false },
    { id:3, device:"Chrome on Android", location:"Manila, PH", when:"3 days ago", current:false }
  ]
};
/* Demo-only: lets an administrator or admin-staff account sign in from this
   same Resident Login page and land on the right dashboard, since the public
   site only exposes one login button. Not real cross-app auth — just a
   client-side redirect matched against the same demo accounts admin.html uses. */
const ADMIN_LOGIN_MATCH = ["owner","admin","joseph","joseph.capili","joseph capili","owner@cityresidences.ph","joseph.capili@cityresidences.ph","ana.reyes@cityresidences.ph","marco.dizon@cityresidences.ph"];

/* ---------- Auth (sign-in only — accounts are created by the administrator) ---------- */
function onSigninInput(field, e){ state[field] = e.target.value; state.authErr = ""; }
function onSigninKey(e){ if (e.key === "Enter") doSignin(); }
function togglePasswordVisible(){ state.showPassword = !state.showPassword; render(); }
function toggleForgot(){ state.showForgot = !state.showForgot; state.showNoAccount = false; render(); }
function toggleNoAccount(){ state.showNoAccount = !state.showNoAccount; state.showForgot = false; render(); }
function sendResetLink(){
  if (!state.forgotEmail.trim()) return;
  set({ forgotSent:true });
}
function doSignin(){
  const email = (state.signinEmail||"").trim().toLowerCase();
  const pass = state.signinPassword||"";
  if (ADMIN_LOGIN_MATCH.indexOf(email) >= 0) {
    set({ redirecting:"admin" });
    setTimeout(() => { window.location.href = "admin.html"; }, 650);
    return;
  }
  const user = REGISTERED.find(u => u.email.toLowerCase() === email);
  if (user && (pass === "" || pass === user.password)) {
    set({ authed:true, authErr:"", currentUser:user, signinPassword:"",
          profile:{ name:user.name, email:user.email, phone:user.phone } });
  } else {
    set({ authErr:"That doesn't match an account on file. Ask the administrator to set one up for you." });
  }
}
function doLogout(){ set({ authed:false, currentUser:null, signinEmail:"", signinPassword:"", view:"home" }); }

function renderAuth(){
  if (state.redirecting === "admin") {
    return `<div class="auth-wrap"><div class="auth-card"><img src="logo.jpg" alt="ResidentHub"><div class="name">ResidentHub</div><p style="font-size:14px;color:var(--muted);text-align:center;margin-top:10px">Recognized as an administrator account — taking you to the Admin dashboard…</p></div></div>`;
  }
  return `
    <div class="auth-wrap">
      <a class="back-link" href="index.html">&larr; Back to website</a>
      <div class="auth-card">
        <img src="logo.jpg" alt="ResidentHub">
        <div class="name">Sign in to ResidentHub</div>
        <div class="sub">CITY RESIDENCES CONDOMINIUM CORP. · RESIDENT PORTAL</div>
        <div class="auth-badges">
          <span>Secure resident sign-in</span>
          <span>Bookings &amp; dues in one place</span>
        </div>
        <div class="auth-form">
          <label>Email address</label>
          <input placeholder="you@cityresidences.ph" value="${escAttr(state.signinEmail)}" oninput="onSigninInput('signinEmail',event)" onkeydown="onSigninKey(event)">
          <label>Password</label>
          <div class="pw-wrap">
            <input type="${state.showPassword?"text":"password"}" placeholder="••••••••" value="${escAttr(state.signinPassword)}" oninput="onSigninInput('signinPassword',event)" onkeydown="onSigninKey(event)">
            <button type="button" class="pw-toggle" title="${state.showPassword?"Hide password":"Show password"}" onclick="togglePasswordVisible()">${state.showPassword?"Hide":"Show"}</button>
          </div>
          <button class="btn primary" onclick="doSignin()">Continue</button>
          ${state.authErr ? `<div class="auth-err">${state.authErr}</div>` : ""}
          <div class="auth-divider"></div>
          <div class="auth-links">
            <button type="button" class="linklike" onclick="toggleForgot()">Forgot password?</button>
            <button type="button" class="linklike" onclick="toggleNoAccount()">No account yet?</button>
          </div>
          ${state.showForgot ? `
            <div class="forgot-panel">
              ${state.forgotSent ? `If <strong>${escAttr(state.forgotEmail)}</strong> matches an account on file, a reset link has been sent. (Demo only — no email is actually sent.)` : `
                <div style="font-weight:700;margin-bottom:6px">Reset your password</div>
                <input placeholder="you@cityresidences.ph" value="${escAttr(state.forgotEmail)}" oninput="state.forgotEmail=this.value" style="width:100%;height:38px;margin-bottom:8px">
                <button class="btn primary" style="height:38px;width:100%" onclick="sendResetLink()">Send reset link</button>
              `}
            </div>` : ""}
          ${state.showNoAccount ? `
            <div class="forgot-panel">There's no public sign-up — ResidentHub accounts are issued directly by the administrator (Joseph Capili), who links your email and phone number to your confirmed unit. Reach out to the property office to get one set up.</div>` : ""}
        </div>
        <div class="auth-legal">By signing in, you agree to City Residences' resident terms of use and privacy notice.</div>
      </div>
    </div>
  `;
}

function render(){
  document.documentElement.setAttribute("data-theme", state.darkMode ? "dark" : "light");
  const app = document.getElementById("app");
  // Play the entrance animation only when the screen actually changes (not on every re-render).
  const viewChanged = state.view !== window.__lastView, authChanged = state.authed !== window.__lastAuthed;
  window.__lastView = state.view; window.__lastAuthed = state.authed;
  app.classList.toggle("enter", viewChanged || authChanged);
  app.classList.toggle("enter-shell", authChanged);
  if (viewChanged && !authChanged && state.authed) window.scrollTo({ top:0, behavior:"smooth" });
  if (!state.authed){
    app.innerHTML = renderAuth();
    return;
  }
  const me = state.currentUser || { name:"Maria Santos", unit:"Unit 12A · Owner", confirmedOn:"Jan 15, 2026" };
  const initials = me.name.split(" ").map(s=>s[0]).slice(0,2).join("").toUpperCase();
  const isHome = state.view === "home";
  mountApp(app, `
    <div class="shell">
      <aside class="side">
        <div class="side-brand"><img src="logo.jpg" alt=""><span>ResidentHub</span></div>
        <div class="side-label">General</div>
        <nav>${navBtn("home","Home")}${navBtn("book","Book a facility")}${navBtn("res","Reservations")}${navBtn("dues","Dues")}${navBtn("events","Events")}</nav>
        <div class="side-label">Community</div>
        <nav>${navBtn("polls","Polls")}${navBtn("directory","Directory")}${navBtn("gr","Grievances")}${navBtn("docs","Documents")}</nav>
        <div class="side-label">Account</div>
        <nav>${navBtn("rental","Unit Rental")}${navBtn("settings","Settings")}</nav>
        <div class="side-foot">
          <div class="side-user"><span class="avatar">${initials}</span><span><b>${me.name}</b><small>${me.unit}</small></span></div>
          <button class="side-out" onclick="doLogout()">${icon("logout")}<span>Log out</span></button>
        </div>
      </aside>
      <main>
        <div class="topline">
          ${searchBox("Search events, polls, documents, contacts...")}
          <div class="top-actions">
            <button class="icon-btn" title="Toggle dark mode" aria-label="Toggle dark mode" onclick="toggleDarkMode()">${icon(state.darkMode ? "sun" : "moon")}</button>
            ${bellHtml()}
          </div>
        </div>
        <div class="body ${isHome?"with-aside":""}">
          <div class="col">
            ${emergencyBanner()}
            <div class="pagehead"><p class="kicker">${todayLabel()}</p><h1>${titles()[0]}</h1><p>${titles()[1]}</p></div>
            ${view()}
          </div>
          ${isHome ? homeAside() : ""}
        </div>
      </main>
    </div>
  `);
}
function emergencyBanner(){
  const active = POSTS.find(p => p.type === "Emergency");
  if (!active) return "";
  return `<div class="alert-banner"><div><strong>${active.title}</strong> — ${active.body}</div></div>`;
}
function titles(){
  const first = (state.currentUser ? state.currentUser.name : "Maria Santos").split(" ")[0];
  return {
    home: [greeting() + ", " + first, "Your unit, announcements, events and notifications in one place."],
    book: ["Book a facility","Check availability and send a reservation request."],
    res: ["My reservations","Every facility request you've made, and its current status."],
    dues: ["Dues &amp; payment status","Your monthly charges and outstanding balance."],
    events: ["Community events","See what is coming up and tell us you are going."],
    polls: ["Polls & voting","Have your say on community decisions. One vote per unit."],
    directory: ["Directory","Who to call, house rules, and answers to common questions."],
    gr: ["Grievances","Submit a concern and track its status."],
    docs: ["Community documents","Files shared by the association."],
    rental: ["Unit Rental","Renting out your unit or running a business from it? Declare it here."],
    settings: ["Settings","Manage your profile, password, appearance, and where you're signed in."]
  }[state.view];
}
function view(){
  return { home:viewHome, book:viewBook, res:viewRes, dues:viewDues, gr:viewGr, docs:viewDocs, rental:viewRental, settings:viewSettings, events:viewEvents, polls:viewPolls, directory:viewDirectory }[state.view]();
}

function duesBalance(){ return peso(DUES_ROWS.filter(d=>rowStatus(d)!=="Paid").reduce((s,d)=>s+d.amt,0)); }

function homeAside(){
  const items = COMMUNITY_EVENTS.map(e=>[e.title, e.place, e.when]);
  items.unshift([BASE_BOOKINGS[0].place + " booking", BASE_BOOKINGS[0].status, BASE_BOOKINGS[0].when]);
  return asideHtml(items.slice(0,4), "See all events", "events");
}
function viewHome(){
  const rentalRecord = readUnitUsageRecord();
  const rentalLabel = rentalRecord ? ({owner:"Owner-occupied",tenant:"Leased out",shortterm:"Short-term",business:"Business use"})[rentalRecord.usage] : "Owner-occupied";
  const unpaidRows = DUES_ROWS.filter(d=>rowStatus(d)!=="Paid");
  const nextDue = unpaidRows[0];
  const household = ["M","J","A"]; // initials for the 3 household members on file
  const next = BASE_BOOKINGS[0];
  const going = COMMUNITY_EVENTS.filter(e=>state.rsvp[e.id]).length;
  const openPolls = POLLS.filter(p=>p.open && state.votes[p.id]===undefined).length;
  const quick = [["Book a facility","book"],["Vote in polls","polls"],["See events","events"],["Declare unit usage","rental"],["Submit a grievance","gr"]];
  return `
    <div class="sc-grid">
      ${summaryCard("yellow","Dues",[[duesBalance(),"Balance","dues"],[unpaidRows.length,"Open items","dues"]],"cross",
        `<p class="sc-note">${unpaidRows.length>0 ? "Next due " + nextDue.due : "All dues settled"}</p>`)}
      ${summaryCard("pink","Next reservation",[[next.place,next.status,"res"]],"heart",`<p class="sc-note">${next.when}</p>`)}
      ${summaryCard("green","My unit",[["12A","Unit"],[rentalLabel,"Usage","rental"]],"triangle",
        `<div class="avatar-stack">${household.map(i=>`<span class="av">${i}</span>`).join("")}</div>`)}
      ${summaryCard("blue","Community",[[openPolls,"Polls to vote on","polls"],[going,"Events going","events"]],"burst")}
    </div>
    <div class="pills-row">${quick.map(q=>`<button onclick="set({view:'${q[1]}'})">${q[0]}</button>`).join("")}</div>
    <div class="two-lists">
      <section>
        <div class="sec-head"><h2>Announcements</h2></div>
        <div class="lrows">
          ${POSTS.map((p,i)=>`<div class="lrow ${i===0?"sel":""}"><span class="lav t${1+i}">${p.title.charAt(0)}</span><span class="lmain"><b>${p.title}</b><small>${p.body}</small></span><span class="lpill t${1+i}">${p.when.replace("Posted ","")}</span></div>`).join("")}
        </div>
      </section>
      <section class="panel blue">
        <div class="sec-head"><h2>Notifications</h2></div>
        ${NOTIFS.map(n=>`<div class="note"><b>${n[0]}</b></div>`).join("")}
      </section>
    </div>
  `;
}
function viewBook(){
  const i = state.facIdx;
  const already = state.submitted[i];
  const pick = state.pick;
  return `
    <div class="two-col">
      <div class="card facility-list">
        <div style="font-weight:700;font-size:13px;letter-spacing:.08em;color:var(--muted);padding:0 2px 6px">FACILITIES</div>
        ${FACILITIES.map((f,idx)=>`<button class="facility-btn ${i===idx?"active":""}" onclick="pickFacility(${idx})"><span style="font-size:15px;font-weight:700">${f.name}</span><small>${f.hours}</small></button>`).join("")}
      </div>
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px"><h2 style="font-size:19px">${FACILITIES[i].name} · availability today</h2><span style="font-size:13px;color:var(--muted)">Tap an open slot to request it</span></div>
          ${FACILITIES[i].name === "Swimming Pool" ? `<div style="font-size:13px;background:var(--good-bg);color:var(--good-fg);border-radius:10px;padding:8px 12px;margin-bottom:10px">Free for you as a resident. Guests pay ₱150 per visit, collected at the gate.</div>` : ""}
          <div class="slots">
            ${SLOT_TIMES.map((t,idx)=>{
              const booked = BASE_BOOKED[i].indexOf(idx)>=0 || already===idx;
              const picked = pick===idx;
              const cls = booked?"booked":picked?"picked":"open";
              return `<button class="slot ${cls}" ${booked?"disabled":""} onclick="pickSlot(${idx})"><span style="font-size:12px;font-weight:700">${t}</span><span style="font-size:12px">${booked?"Booked":picked?"Selected":"Open"}</span></button>`;
            }).join("")}
          </div>
        </div>
        ${pick!=null ? `<div class="card" style="background:var(--info-bg);border-color:#C7D4EF;display:flex;align-items:center;gap:16px"><div style="flex-grow:1"><div style="font-size:13px;color:var(--navy-dark)">Your request</div><div style="font:700 18px 'Bricolage Grotesque','Source Sans 3',sans-serif">${FACILITIES[i].name}, ${SLOT_TIMES[pick]} today</div></div><button class="btn primary" onclick="submitBooking()">Submit request</button></div>` : ""}
        ${(already!=null && pick==null && state.extraBookings.length>0) ? `<div class="card" style="background:var(--good-bg);color:var(--good-fg)">Request sent. You'll see it under "My Reservations" once the admin reviews it.</div>` : ""}
      </div>
    </div>
  `;
}
function pickFacility(idx){ state.facIdx = idx; state.pick = null; render(); }
function pickSlot(idx){ state.pick = idx; render(); }
function submitBooking(){
  if (state.pick == null) return;
  const i = state.facIdx;
  state.submitted[i] = state.pick;
  state.extraBookings.push({ place: FACILITIES[i].name, when: SLOT_TIMES[state.pick] + " today", status: "Pending" });
  state.pick = null;
  render();
}

function exportMyReservations(){
  const all = BASE_BOOKINGS.concat(state.extraBookings);
  exportCSV("my-reservations.csv", ["Facility","Date & time","Status"], all.map(b=>[b.place,b.when,b.status]));
}
function viewRes(){
  const all = BASE_BOOKINGS.concat(state.extraBookings);
  return `<div class="card" style="padding:0;overflow:hidden">
    <div style="display:flex;justify-content:flex-end;padding:12px 18px"><button class="btn" onclick="exportMyReservations()">Export to Excel (.csv)</button></div>
    <table><thead><tr><th>FACILITY</th><th>DATE &amp; TIME</th><th>STATUS</th></tr></thead>
    <tbody>${all.map(b=>`<tr><td style="font-weight:700">${b.place}</td><td style="color:var(--muted)">${b.when}</td><td><span class="chip ${b.status==="Approved"?"good":b.status==="Pending"?"warn":"info"}">${b.status}</span></td></tr>`).join("")}</tbody></table>
  </div>`;
}

function viewDues(){
  return `
    <div class="two-col" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)">
      <div class="card" style="padding:0;overflow:hidden">
        <table><thead><tr><th>MONTH</th><th>CHARGE</th><th>DUE DATE</th><th>STATUS</th></tr></thead>
        <tbody>${DUES_ROWS.map(d=>`<tr><td style="font-weight:600">${d.month}</td><td>${peso(d.amt)}</td><td style="color:var(--muted)">${d.due}</td><td><span class="chip ${rowStatus(d)==="Paid"?"good":rowStatus(d)==="Pending"?"warn":"bad"}">${rowStatus(d)}</span></td></tr>`).join("")}</tbody></table>
      </div>
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="card">
          <div style="font-size:13px;font-weight:600;color:var(--muted)">Outstanding balance</div>
          <div style="font:700 34px 'Bricolage Grotesque','Source Sans 3',sans-serif;color:#A02B1D">${duesBalance()}</div>
          <p style="font-size:13px;color:var(--muted);line-height:1.5;margin:8px 0 0">Payment status is recorded here once your association processes it. Direct online payment is outside this preview's scope.</p>
          <button class="btn" style="width:100%;margin-top:10px" onclick='exportCSV("my-dues.csv",["Month","Charge","Due date","Status"],DUES_ROWS.map(d=>[d.month,d.amt,d.due,rowStatus(d)]))'>Export to Excel (.csv)</button>
        </div>
        ${payFormHtml()}
        ${myPaymentsHtml()}
        <div class="card">
          <h2 style="font-size:17px;margin-bottom:4px">Motor parking rental</h2>
          <p style="margin:0 0 10px;font-size:13px;color:var(--muted)">Rent a motor/motorcycle parking slot for <b>${peso(MOTOR_PARKING_RATE)}/month</b>. This rate isn't fixed and may change — check with the office for the latest amount.</p>
          ${state.motorParkingRequested
            ? `<div class="chip good">Request sent — awaiting admin confirmation</div>`
            : `<button class="btn primary" style="width:100%" onclick="requestMotorParking()">Request a parking slot</button>`}
        </div>
      </div>
    </div>
  `;
}
function requestMotorParking(){ set({ motorParkingRequested: true }); }

function viewGr(){
  const all = BASE_GRS.concat(state.myGrs);
  return `
    <div class="two-col-e">
      <div class="card">
        <h2 style="font-size:19px;margin-bottom:4px">Submit a grievance</h2>
        <p style="margin:0 0 12px;font-size:13px;color:var(--muted)">The association will follow up here once reviewed.</p>
        <div style="display:flex;flex-direction:column;gap:10px">
          <label>Subject<input id="grTitle" type="text" placeholder="e.g. Leaking pipe in the hallway"></label>
          <label>Details<textarea id="grBody" rows="3" placeholder="Describe the concern"></textarea></label>
          <button class="btn primary" style="margin-top:4px" onclick="submitGr()">Submit grievance</button>
        </div>
      </div>
      <div class="card"><h2 style="font-size:19px;margin-bottom:6px">My grievances</h2>
        ${all.length===0 ? `<div style="padding:16px;border:2px dashed #D8CCB1;border-radius:12px;text-align:center;font-size:14px;color:var(--muted)">No grievances submitted yet.</div>` :
          all.map(g=>`<div style="padding:12px 0;border-top:1px solid var(--border2)"><div style="font-weight:700;font-size:15px">${g.title}</div><div style="font-size:13px;color:var(--muted);margin-top:2px">${g.body}</div><span class="chip ${g.status==="Resolved"?"good":g.status==="In progress"?"warn":"info"}">${g.status}</span></div>`).join("")}
      </div>
    </div>
  `;
}
function submitGr(){
  const title = document.getElementById("grTitle").value.trim();
  if (!title) return;
  const body = document.getElementById("grBody").value.trim() || "No further details.";
  state.myGrs.push({ title, body, status:"Open" });
  state.grTitle = ""; state.grBody = "";
  render();
}

function viewDocs(){
  return `<div class="card" style="padding:0;overflow:hidden">
    <div style="display:flex;justify-content:flex-end;padding:12px 22px"><button class="btn" onclick='exportCSV("documents.csv",["Name","Category","Date"],DOCS.map(d=>[d.name,d.cat,d.date]))'>Export to Excel (.csv)</button></div>
    ${DOCS.map(d=>`<div style="display:flex;align-items:center;gap:12px;padding:0 22px;height:56px;border-top:1px solid var(--border2);font-size:14px"><span style="flex-grow:1;font-weight:700">${d.name}</span><span style="color:var(--muted)">${d.cat}</span><span style="color:var(--muted)">${d.date}</span><button class="btn">View</button></div>`).join("")}
  </div>`;
}

// Best-effort: reads the latest status the admin set for this unit's declaration,
// via localStorage, when both pages are opened from the same origin/browser (e.g.
// Live Server). Returns null if nothing's there yet or storage isn't available —
// this is a front-end-only demo, so it degrades gracefully either way.
function readUnitUsageRecord(){
  try {
    const unit = ((state.currentUser && state.currentUser.unit) || "Unit 12A · Owner");
    const existing = JSON.parse(localStorage.getItem("residenthub_unit_usage") || "{}");
    const key = Object.keys(existing).find(function(k){ return k.split(" · ")[0] === unit.split(" · ")[0]; });
    return key ? existing[key] : null;
  } catch(e){ return null; }
}
const USAGE_TYPES = [
  { id:"owner", name:"Owner-occupied", desc:"I live here myself." },
  { id:"tenant", name:"Leased to a tenant", desc:"Long-term lease to a tenant." },
  { id:"shortterm", name:"Short-term rental", desc:"Airbnb, Booking.com, etc." },
  { id:"business", name:"Home-based business", desc:"Office or business use." }
];
function pickUnitUsage(id){ set({ unitUsage:id, unitUsageSaved:false, unitUsageMsg:"" }); }
function viewRental(){
  const record = readUnitUsageRecord();
  const needsApproval = state.unitUsage==="shortterm" || state.unitUsage==="business";
  const recordNeedsApproval = record && (record.usage==="shortterm" || record.usage==="business");
  const stepState = recordNeedsApproval ? (record.status==="approved" ? "approved" : record.status==="rejected" ? "rejected" : "pending") : null;
  return `
    <div class="two-col-e">
      <div style="display:flex;flex-direction:column;gap:16px">
        ${record ? `<div class="card">
          <h2 style="font-size:19px;margin-bottom:2px;display:flex;align-items:center">Current status</h2>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:10px 0 6px">
            <span class="chip ${recordNeedsApproval?"warn":"good"}">${({owner:"Owner-occupied",tenant:"Leased (long-term)",shortterm:"Short-term rental",business:"Business use"})[record.usage]||record.usage}</span>
            ${recordNeedsApproval ? `<span class="chip ${record.status==="approved"?"good":record.status==="rejected"?"bad":"warn"}">${record.status==="approved"?"Approved":record.status==="rejected"?"Rejected":"Pending review"}</span>` : ""}
          </div>
          ${recordNeedsApproval ? `<div class="rental-steps">
            <div class="rental-step done"><div class="dot">✓</div><div class="lbl">Declared</div></div>
            <div class="rental-step ${stepState==="pending"?"current":"done"}"><div class="dot">${stepState==="pending"?"2":"✓"}</div><div class="lbl">Under review</div></div>
            <div class="rental-step ${stepState==="pending"?"":stepState==="rejected"?"rejected":"done"}"><div class="dot">${stepState==="pending"?"3":stepState==="rejected"?"✕":"✓"}</div><div class="lbl">${stepState==="rejected"?"Rejected":"Decision"}</div></div>
          </div>` : ""}
          ${record.details ? `<p style="margin:10px 0 0;font-size:13px;color:var(--muted)">${record.details}</p>` : ""}
          ${record.status==="rejected" && record.remark ? `<p style="margin:6px 0 0;font-size:13px;color:#A02B1D">Admin note: "${record.remark}"</p>` : ""}
          <p style="margin:8px 0 0;font-size:12px;color:var(--muted)">Declared ${record.date}. Update the form below any time — resubmitting sends it for review again.</p>
        </div>` : ""}
        <div class="card">
          <h2 style="font-size:19px;margin-bottom:10px">${record ? "Update your declaration" : "Declare your unit's usage"}</h2>
          <div class="usage-grid">
            ${USAGE_TYPES.map(u=>`<button type="button" class="usage-card ${state.unitUsage===u.id?"active":""}" onclick="pickUnitUsage('${u.id}')">
              
              <span class="name">${u.name}</span>
              <span class="desc">${u.desc}</span>
            </button>`).join("")}
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;margin-top:14px">
            ${state.unitUsage!=="owner" ? `<label>Details ${state.unitUsage==="tenant"?"(tenant name &amp; contact)":state.unitUsage==="shortterm"?"(platform used, e.g. Airbnb)":"(type of business)"}<input id="unitUsageDetails" value="${escAttr(state.unitUsageDetails)}" oninput="state.unitUsageDetails=this.value" placeholder="${state.unitUsage==="tenant"?"e.g. Juan Dela Cruz, 0917 555 0000":state.unitUsage==="shortterm"?"e.g. Listed on Airbnb since August":"e.g. Online reselling, tutoring services"}"></label>` : ""}
            ${needsApproval ? `<p style="margin:0;font-size:12px;color:var(--muted)">This type needs admin approval before it's active.</p>` : ""}
            <button class="btn primary" style="margin-top:4px;align-self:flex-start" onclick="saveUnitUsage()">Save declaration</button>
            ${state.unitUsageSaved ? `<div class="chip good" style="align-self:flex-start">${needsApproval ? "Sent for admin review" : "Declared to the administrator"}</div>` : ""}
            ${state.unitUsageMsg ? `<div style="font-size:12px;color:#A02B1D">${state.unitUsageMsg}</div>` : ""}
          </div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="card">
          <h2 style="font-size:19px;margin-bottom:4px">How this works</h2>
          <ol style="margin:0;padding-left:18px;font-size:13px;color:var(--muted);line-height:1.8">
            <li>Tell us how your unit is actually being used — you live in it, you've leased it out, it's a short-term rental, or it's a home-based business.</li>
            <li>Owner-occupied and long-term tenant leases are saved right away — no review needed.</li>
            <li>Short-term rentals (like Airbnb) and home-based businesses need the administrator's approval first. You'll see the decision right here once it's reviewed.</li>
          </ol>
        </div>
        <div class="card">
          <h2 style="font-size:19px;margin-bottom:4px">Why we ask</h2>
          <div class="benefit-row"><div><h4>Security</h4><p>The guardhouse knows who to expect when a unit has regular turnover, like Airbnb guests.</p></div></div>
          <div class="benefit-row"><div><h4>Insurance</h4><p>Business or short-term-rental use can change what the building's coverage needs to account for.</p></div></div>
          <div class="benefit-row"><div><h4>Fair dues</h4><p>Keeps the association's records accurate for everyone, in case usage ever affects dues.</p></div></div>
        </div>
      </div>
    </div>
  `;
}

function viewSettings(){
  const me = state.currentUser || { unit:"Unit 12A · Owner" };
  return `
    <div class="two-col-e">
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="card">
          <h2 style="font-size:19px;margin-bottom:4px">Profile</h2>
          <p style="margin:0 0 12px;font-size:13px;color:var(--muted)">Your unit assignment can only be changed by the administrator — everything else here you can update yourself.</p>
          <div style="display:flex;flex-direction:column;gap:10px">
            <label>Full name<input value="${escAttr(state.profile.name)}" oninput="state.profile.name=this.value"></label>
            <label>Email address<input value="${escAttr(state.profile.email)}" oninput="state.profile.email=this.value"></label>
            <label>Phone number<input value="${escAttr(state.profile.phone)}" oninput="state.profile.phone=this.value"></label>
            <label>Unit (set by administrator)<input value="${escAttr(me.unit)}" disabled style="background:var(--border2);color:var(--muted)"></label>
            <button class="btn primary" style="margin-top:4px" onclick="saveProfile()">Save changes</button>
          </div>
        </div>
        <div class="card">
          <h2 style="font-size:19px;margin-bottom:4px">Security</h2>
          <p style="margin:0 0 12px;font-size:13px;color:var(--muted)">Change the password used to sign in to this account.</p>
          <div style="display:flex;flex-direction:column;gap:10px">
            <label>Current password<input type="password" id="curPass" placeholder="Leave blank if you signed in without one"></label>
            <label>New password<input type="password" id="newPass" placeholder="At least 6 characters"></label>
            <label>Confirm new password<input type="password" id="confPass" placeholder="Re-enter new password"></label>
            <button class="btn primary" style="margin-top:4px" onclick="changePassword()">Update password</button>
          </div>
        </div>
        ${state.settingsMsg ? `<div class="card" style="background:var(--info-bg);color:var(--info-fg);font-size:13px">${state.settingsMsg}</div>` : ""}
      </div>
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="card">
          <h2 style="font-size:19px;margin-bottom:4px">Appearance</h2>
          <p style="margin:0;font-size:13px;color:var(--muted)">Currently in ${state.darkMode ? "dark" : "light"} mode. Switch it anytime with the round button at the top right of the dashboard.</p>
        </div>
        <div class="card" style="padding:0;overflow:hidden">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px">
            <h2 style="font-size:19px">Where you're signed in</h2>
            <button class="btn" style="font-size:12px;min-height:34px" onclick="logoutOtherSessions()">Log out other devices</button>
          </div>
          ${state.sessions.map(s=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 18px;border-top:1px solid var(--border2)">
            <div><div style="font-weight:700;font-size:14px">${s.device}${s.current ? ` <span class="chip good" style="margin-left:6px">This device</span>` : ""}</div><div style="font-size:12px;color:var(--muted)">${s.location} · ${s.when}</div></div>
            ${s.current ? "" : `<button class="btn" style="min-height:32px;padding:0 10px;font-size:12px;color:#A02B1D" onclick="logoutSession(${s.id})">Log out</button>`}
          </div>`).join("")}
          <div style="padding:10px 18px;font-size:12px;color:var(--muted);border-top:1px solid var(--border2)">Demo only — these are sample sessions, not a real device list.</div>
        </div>
      </div>
    </div>
  `;
}
function saveProfile(){
  if (!state.profile.name.trim() || !state.profile.email.trim()){ set({ settingsMsg:"Full name and email are required." }); return; }
  if (state.currentUser){
    state.currentUser.name = state.profile.name.trim();
    state.currentUser.email = state.profile.email.trim();
    state.currentUser.phone = state.profile.phone.trim();
  }
  set({ settingsMsg:"Profile updated. (Demo only — resets on reload.)" });
}
function saveUnitUsage(){
  if (state.unitUsage !== "owner" && !state.unitUsageDetails.trim()){
    set({ unitUsageMsg:"Please add a few details for the administrator before saving." });
    return;
  }
  const unit = (state.currentUser && state.currentUser.unit) || "Unit 12A · Owner";
  // Best-effort: hand this off to the admin dashboard's Units & Residents view via
  // localStorage, when both pages are opened from the same origin/browser (e.g. via
  // Live Server). Front-end-only demo — no real backend, so this is optional and
  // silently skipped if storage isn't available.
  const needsApproval = state.unitUsage === "shortterm" || state.unitUsage === "business";
  try {
    const existing = JSON.parse(localStorage.getItem("residenthub_unit_usage") || "{}");
    existing[unit] = { usage: state.unitUsage, details: state.unitUsageDetails.trim(), date: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}), status: needsApproval ? "pending" : "", remark:"" };
    localStorage.setItem("residenthub_unit_usage", JSON.stringify(existing));
  } catch(err) { /* storage unavailable — this is still a front-end-only demo */ }
  set({ unitUsageSaved:true, unitUsageMsg:"" });
}
function changePassword(){
  const cur = document.getElementById("curPass").value;
  const nw = document.getElementById("newPass").value;
  const conf = document.getElementById("confPass").value;
  const user = state.currentUser;
  if (!user){ set({ settingsMsg:"No signed-in account to update." }); return; }
  if (cur !== "" && cur !== user.password){ set({ settingsMsg:"Current password doesn't match." }); return; }
  if (nw.length < 6){ set({ settingsMsg:"New password must be at least 6 characters." }); return; }
  if (nw !== conf){ set({ settingsMsg:"New password and confirmation don't match." }); return; }
  user.password = nw;
  set({ settingsMsg:"Password updated. (Demo only — not stored anywhere real.)" });
}
function logoutSession(id){ state.sessions = state.sessions.filter(s=>s.id!==id); render(); }
function logoutOtherSessions(){ state.sessions = state.sessions.filter(s=>s.current); render(); }

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

// If the browser's Back button returns here after an admin sign-in redirect,
// show the sign-in form again instead of the "taking you to the Admin dashboard…" message.
window.addEventListener("pageshow", function (event) {
  if (event.persisted && state.redirecting) { state.redirecting = ""; render(); }
});


/* ---------- Payment submission, verification status and receipts (see payments.js) ---------- */
function resUnit(){ return ((state.currentUser && state.currentUser.unit) || "Unit 12A · Owner").split("·")[0].trim(); }
function resPayer(){ return (state.currentUser && state.currentUser.name) || "Maria Santos"; }
function rowStatus(d){
  if (d.status === "Paid") return "Paid";
  const ps = myProofs(resUnit()).filter(p => p.forText === d.month);
  if (ps.some(p => p.status === "Confirmed")) return "Paid";
  if (ps.some(p => p.status === "Pending")) return "Pending";
  return d.status;
}
function choosePayFor(v){
  const d = DUES_ROWS.find(x => x.month === v);
  state.payFor = v;
  state.payAmt = d ? String(d.amt) : (v === "Motor parking rental" ? String(MOTOR_PARKING_RATE) : "");
  render();
}
function submitPaymentProof(){
  const err = submitProof({ unit:resUnit(), payer:resPayer(), forText:state.payFor, method:state.payMethod, reference:state.payRef, amount:state.payAmt });
  if (err){ toast(err); return; }
  set({ payFor:"", payAmt:"", payRef:"" });
  toast("Payment details sent. The office will verify them and your receipt will appear here.");
}
function payFormHtml(){
  const open = DUES_ROWS.filter(d => rowStatus(d) === "Overdue").map(d => d.month).concat(["Motor parking rental","Other charge"]);
  return `<div class="card" style="display:flex;flex-direction:column;gap:10px">
    <h2 style="font-size:17px;margin-bottom:0">I have paid</h2>
    <p style="margin:0;font-size:13px;color:var(--muted);line-height:1.5">Pay at the office, by bank transfer, GCash or Maya. Then send the details here so the office can verify them and issue your receipt. This system does not take payments itself.</p>
    <label>Payment for<select onchange="choosePayFor(this.value)"><option value="">Choose…</option>${open.map(o=>`<option value="${escAttr(o)}" ${state.payFor===o?"selected":""}>${o}</option>`).join("")}</select></label>
    <label>Amount paid (₱)<input type="number" min="0.01" step="0.01" placeholder="e.g. 450" value="${escAttr(state.payAmt)}" oninput="state.payAmt=this.value"></label>
    <label>Payment method<select onchange="state.payMethod=this.value">${PAY_METHODS.map(m=>`<option ${state.payMethod===m?"selected":""}>${m}</option>`).join("")}</select></label>
    <label>Reference number<input type="text" placeholder="Number on your receipt or transaction" value="${escAttr(state.payRef)}" oninput="state.payRef=this.value"></label>
    <button class="btn primary" onclick="submitPaymentProof()">Send payment details</button>
  </div>`;
}
function myPaymentsHtml(){
  const list = myProofs(resUnit());
  return `<div class="card">
    <h2 style="font-size:17px;margin-bottom:8px">My payments</h2>
    ${list.length ? list.map(p=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--line,#E7E2D6)">
      <div style="min-width:0"><b style="font-size:14px">${payEsc(p.forText)}</b><div style="font-size:12.5px;color:var(--muted)">${payEsc(p.method)} · Ref ${payEsc(p.reference)} · ${peso(p.amount)}</div>${p.receiptNo?`<div style="font-size:12.5px;color:var(--muted)">Receipt ${payEsc(p.receiptNo)}</div>`:""}</div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">${proofChip(p.status)}${p.status==="Confirmed"?`<button class="btn" style="min-height:30px;padding:0 10px;font-size:12px" onclick="downloadReceipt(${p.id})">Receipt</button>`:""}</div>
    </div>`).join("") : `<p style="margin:0;font-size:13px;color:var(--muted)">No payments sent yet. After you pay, send the details above.</p>`}
  </div>`;
}
