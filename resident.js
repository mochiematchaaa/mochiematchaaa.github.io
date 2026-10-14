/* Resident portal — the pages a resident sees, with real data from Supabase (see core.js). */

var state = {
  authed: false, view: "home", darkMode: false, bellOpen: false, bellSeen: false,
  facIdx: 0, pick: null, eventFilter: "all", pollFilter: "open",
  payFor: "", payAmt: "", payMethod: "", payRef: "",
  usage: "", usageDetails: "", usageMsg: ""
};
try { state.darkMode = localStorage.getItem("rh_dark") === "1"; } catch (e) { /* storage blocked */ }

function rhEnter() { state.authed = true; state.view = "home"; state.usage = ""; render(); }
function rhLeave() { state.authed = false; state.view = "home"; }
function doLogout() { signOut(); }
function me() { return DB.profile || {}; }
function myName() { return me().name || me().email || "Resident"; }
function myHousehold() { var u = unitRec(myUnit()) || {}; return u.name && u.name !== "—" ? u.name : myName(); }
function myRec() { return unitRec(myUnit()) || {}; }
function needsApproval(u) { return u && (u.usage === "shortterm" || u.usage === "business"); }
function chipFor(s) { return s === "Approved" || s === "Paid" || s === "Confirmed" || s === "Completed" ? "good" : s === "Pending" ? "warn" : s === "Denied" || s === "Rejected" || s === "Overdue" ? "bad" : "info"; }
function typeChipClass(t) { return t === "Emergency" ? "bad" : t === "Warning" ? "warn" : t === "Maintenance" ? "info" : ""; }

/* ---------- mine ---------- */
function myBookings() { return newest(list("booking")).filter(function (r) { return r.unit === myUnit(); }); }
function myDues() { return newest(list("due")).filter(function (r) { return r.unit === myUnit(); }); }
function myOpenDues() { return myDues().filter(function (r) { return !r.v.paid; }).sort(function (a, b) { return Number(a.id) - Number(b.id); }); }
function myProofs() { return newest(list("proof")).filter(function (r) { return r.unit === myUnit(); }); }
function publishedAnns() { return newest(list("announcement")).filter(function (r) { return r.v.status !== "Draft"; }); }
function nextBooking() {
  return myBookings().filter(function (r) { return r.v.status === "Pending" || r.v.status === "Approved"; })[0] || null;
}
function eventInfo(r) {
  var e = r.v, d = parseShort(e.date), going = list("rsvp").filter(function (x) { return Number(x.v.event) === Number(r.id); }).length;
  return { id: r.id, title: e.title, when: e.date || "", place: e.place || "", about: e.about || "", going: going,
    month: d ? MONTHS[d.getMonth()].toUpperCase() : "EVENT", day: d ? String(d.getDate()) : "•", mine: !!getRow("rsvp", myUnit() + "|" + r.id) };
}
function notifs() {
  var out = [], unit = myUnit(), u = myRec();
  myBookings().slice(0, 3).forEach(function (r) {
    if (r.v.status === "Approved") out.push(["Your " + r.v.place + " booking (" + r.v.when + ") was approved.", "good", "res"]);
    else if (r.v.status === "Denied") out.push(["Your " + r.v.place + " booking (" + r.v.when + ") was not approved.", "bad", "res"]);
  });
  var over = myOpenDues().filter(function (r) { return isOverdue(r.v); });
  if (over.length) out.push([over.length === 1 ? "A charge is overdue: " + over[0].v.note + "." : over.length + " charges are overdue.", "bad", "dues"]);
  myProofs().slice(0, 3).forEach(function (r) {
    if (r.v.status === "Confirmed" && !r.v.direct) out.push(["Your payment (ref. " + r.v.reference + ") was confirmed. The receipt is under Dues.", "good", "dues"]);
    else if (r.v.status === "Rejected") out.push(["Your payment (ref. " + r.v.reference + ") could not be confirmed. Please check the reference number.", "bad", "dues"]);
  });
  if (u.usageStatus === "approved") out.push(["Your " + usageLabel(u.usage).toLowerCase() + " was approved.", "good", "rental"]);
  else if (u.usageStatus === "rejected") out.push(["Your " + usageLabel(u.usage).toLowerCase() + " was not approved. " + (u.usageRemark || ""), "bad", "rental"]);
  else if (u.usageStatus === "pending") out.push(["Your " + usageLabel(u.usage).toLowerCase() + " is waiting for the administrator.", "info", "rental"]);
  var slot = list("slot").filter(function (r) { return r.v.unit === unit; })[0];
  if (slot) out.push(["Motor parking slot " + slot.id + " is assigned to your unit.", "good", "dues"]);
  var a = publishedAnns()[0];
  if (a) out.push(["New announcement: " + a.v.title + ".", "info", "home"]);
  var toVote = pollsAll().filter(function (p) { return p.open && myVote(p.id) === undefined; }).length;
  if (toVote) out.push([toVote + " poll" + (toVote > 1 ? "s" : "") + " waiting for your vote.", "info", "polls"]);
  return out;
}

/* ---------- page frame ---------- */
function titles() {
  var first = String(myName()).split(/\s+/)[0];
  return {
    home: [greeting() + ", " + first, "Your unit, announcements, events and notifications in one place."],
    book: ["Book a facility", "Check availability and send a reservation request."],
    res: ["My reservations", "Every facility request you've made, and its current status."],
    dues: ["Dues & payment status", "Your monthly charges and outstanding balance."],
    events: ["Community events", "See what is coming up and tell us you are going."],
    polls: ["Polls & voting", "Have your say on community decisions. One vote per unit."],
    directory: ["Directory", "Who to call, house rules, and answers to common questions."],
    gr: ["Grievances", "Submit a concern and track its status."],
    docs: ["Community documents", "Files shared by the association."],
    rental: ["Unit Rental", "Renting out your unit or running a business from it? Declare it here."],
    settings: ["Settings", "Manage your profile, password, appearance, and where you're signed in."]
  }[state.view] || ["", ""];
}
function view() {
  return ({ home: viewHome, book: viewBook, res: viewRes, dues: viewDues, gr: viewGr, docs: viewDocs, rental: viewRental, settings: viewSettings, events: viewEvents, polls: viewPolls, directory: viewDirectory }[state.view] || viewHome)();
}
function emergencyBanner() {
  var a = publishedAnns().filter(function (r) { return r.v.type === "Emergency"; })[0];
  return a ? '<div class="alert-banner"><div><strong>' + esc(a.v.title) + "</strong> — " + esc(a.v.body) + "</div></div>" : "";
}
function render() {
  if (!state.authed) return;
  document.documentElement.setAttribute("data-theme", state.darkMode ? "dark" : "light");
  try { localStorage.setItem("rh_dark", state.darkMode ? "1" : "0"); } catch (e) { /* storage blocked */ }
  var app = document.getElementById("app");
  var viewChanged = state.view !== window.__lastView, authChanged = state.authed !== window.__lastAuthed;
  window.__lastView = state.view; window.__lastAuthed = state.authed;
  app.classList.toggle("enter", viewChanged || authChanged);
  app.classList.toggle("enter-shell", authChanged);
  if (viewChanged && !authChanged) window.scrollTo({ top: 0, behavior: "smooth" });
  var isHome = state.view === "home";
  keepFocus(function () {
    mountApp(app, '<div class="shell"><aside class="side"><div class="side-brand"><img src="logo.jpg" alt=""><span>ResidentHub</span></div>' +
      '<div class="side-label">General</div><nav>' + navBtn("home", "Home") + navBtn("book", "Book a facility") + navBtn("res", "Reservations") + navBtn("dues", "Dues") + navBtn("events", "Events") + "</nav>" +
      '<div class="side-label">Community</div><nav>' + navBtn("polls", "Polls") + navBtn("directory", "Directory") + navBtn("gr", "Grievances") + navBtn("docs", "Documents") + "</nav>" +
      '<div class="side-label">Account</div><nav>' + navBtn("rental", "Unit Rental") + navBtn("settings", "Settings") + "</nav>" +
      '<div class="side-foot"><div class="side-user"><span class="avatar">' + esc(initials(myName())) + "</span><span><b>" + esc(myName()) + "</b><small>" + esc(myUnit()) + "</small></span></div>" +
      '<button class="side-out" onclick="doLogout()">' + icon("logout") + "<span>Log out</span></button></div></aside>" +
      '<main><div class="topline">' + searchBox("Search events, polls, documents, contacts...") +
      '<div class="top-actions"><button class="icon-btn" title="Toggle dark mode" aria-label="Toggle dark mode" onclick="toggleDarkMode()">' + icon(state.darkMode ? "sun" : "moon") + "</button>" + bellHtml() + "</div></div>" +
      '<div class="body ' + (isHome ? "with-aside" : "") + '"><div class="col">' + emergencyBanner() +
      '<div class="pagehead"><p class="kicker">' + todayLabel() + "</p><h1>" + titles()[0] + "</h1><p>" + titles()[1] + "</p></div>" + view() + "</div>" + (isHome ? homeAside() : "") + "</div></main></div>");
  });
}

/* ==========================================================================
   Home
   ========================================================================== */
function homeAside() {
  var items = newest(list("event")).map(function (r) { var e = eventInfo(r); return [esc(e.title), esc(e.place), esc(e.when)]; });
  var nb = nextBooking();
  if (nb) items.unshift([esc(nb.v.place) + " booking", esc(nb.v.status), esc(nb.v.when)]);
  return asideHtml(items.slice(0, 4), "See all events", "events");
}
function viewHome() {
  var u = myRec(), open = myOpenDues(), bal = balanceFor(myUnit()), next = open[0], nb = nextBooking();
  var going = list("rsvp").filter(function (r) { return r.unit === myUnit(); }).length;
  var toVote = pollsAll().filter(function (p) { return p.open && myVote(p.id) === undefined; }).length;
  var quick = [["Book a facility", "book"], ["Vote in polls", "polls"], ["See events", "events"], ["Declare unit usage", "rental"], ["Submit a grievance", "gr"]];
  var anns = publishedAnns().slice(0, 4), ns = notifs().slice(0, 5);
  var unitNo = String(myUnit()).replace(/^Unit\s*/i, "");
  return '<div class="sc-grid">' +
    summaryCard("yellow", "Dues", [[bal ? peso(bal) : "None", "Balance", "dues"], [open.length, "Open items", "dues"]], "cross", '<p class="sc-note">' + (next ? "Next due " + esc(next.v.dueDate || "on receipt") : "All dues settled") + "</p>") +
    summaryCard("pink", "Next reservation", [[nb ? esc(nb.v.place) : "None", nb ? esc(nb.v.status) : "Book a facility", nb ? "res" : "book"]], "heart", '<p class="sc-note">' + (nb ? esc(nb.v.when) : "No upcoming reservation") + "</p>") +
    summaryCard("green", "My unit", [[esc(unitNo), "Unit"], [esc(usageLabel(u.usage || "owner")), "Usage", "rental"]], "triangle", '<div class="avatar-stack"><span class="av">' + esc(initials(myName())) + "</span></div>") +
    summaryCard("blue", "Community", [[toVote, "Polls to vote on", "polls"], [going, "Events going", "events"]], "burst") + "</div>" +
    '<div class="pills-row">' + quick.map(function (q) { return '<button onclick="set({view:\'' + q[1] + '\'})">' + q[0] + "</button>"; }).join("") + "</div>" +
    '<div class="two-lists"><section><div class="sec-head"><h2>Announcements</h2></div><div class="lrows">' +
    (anns.map(function (r, i) {
      var p = r.v;
      return '<div class="lrow ' + (i === 0 ? "sel" : "") + '"><span class="lav t' + (1 + i % 4) + '">' + esc(String(p.title).charAt(0)) + '</span><span class="lmain"><b>' + esc(p.title) + "</b><small>" + esc(p.body) + '</small></span><span class="lpill t' + (1 + i % 4) + '">' + esc(p.date) + "</span></div>";
    }).join("") || '<p class="empty">No announcements yet.</p>') + "</div></section>" +
    '<section class="panel blue"><div class="sec-head"><h2>Notifications</h2></div>' + (ns.map(function (n) { return '<div class="note"><b>' + esc(n[0]) + "</b></div>"; }).join("") || '<p class="empty">You are all caught up.</p>') + "</section></div>";
}

/* ==========================================================================
   Book a facility and reservations
   ========================================================================== */
function viewBook() {
  var fl = facilities();
  if (!fl.length) return '<div class="card"><p class="empty">No facilities can be booked yet. Please check again later.</p></div>';
  var i = Math.min(state.facIdx || 0, fl.length - 1), pick = state.pick, cur = fl[i];
  return '<div class="two-col"><div class="card facility-list"><div style="font-weight:700;font-size:13px;letter-spacing:.08em;color:var(--muted);padding:0 2px 6px">FACILITIES</div>' +
    fl.map(function (f, idx) { return '<button class="facility-btn ' + (i === idx ? "active" : "") + '" onclick="pickFacility(' + idx + ')"><span style="font-size:15px;font-weight:700">' + esc(f.name) + "</span><small>" + esc(f.hours) + "</small></button>"; }).join("") + "</div>" +
    '<div style="display:flex;flex-direction:column;gap:16px"><div class="card"><div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px"><h2 style="font-size:19px">' + esc(cur.name) + ' · availability today</h2><span style="font-size:13px;color:var(--muted)">Tap an open slot to request it</span></div>' +
    (cur.note ? '<div style="font-size:13px;background:var(--good-bg);color:var(--good-fg);border-radius:10px;padding:8px 12px;margin-bottom:10px">' + esc(cur.note) + '</div>' : "") +
    '<div class="slots">' + cur.slots.map(function (t, idx) {
      var booked = slotBooked(i, idx), picked = pick === idx, cls = booked ? "booked" : picked ? "picked" : "open";
      return '<button class="slot ' + cls + '" ' + (booked ? "disabled" : "") + ' onclick="pickSlot(' + idx + ')"><span style="font-size:12px;font-weight:700">' + esc(t) + '</span><span style="font-size:12px">' + (booked ? "Booked" : picked ? "Selected" : "Open") + "</span></button>";
    }).join("") + "</div></div>" +
    (pick != null ? '<div class="card" style="background:var(--info-bg);border-color:#C7D4EF;display:flex;align-items:center;gap:16px"><div style="flex-grow:1"><div style="font-size:13px;color:var(--navy-dark)">Your request</div><div style="font:700 18px \'Bricolage Grotesque\',\'Source Sans 3\',sans-serif">' + esc(cur.name) + ", " + esc(cur.slots[pick]) + ' today</div></div><button class="btn primary" onclick="submitBooking()">Submit request</button></div>' : "") + "</div></div>";
}
function pickFacility(idx) { state.facIdx = idx; state.pick = null; render(); }
function pickSlot(idx) { state.pick = idx; render(); }
async function submitBooking() {
  if (state.pick == null) return;
  var f = state.facIdx, i = state.pick, unit = myUnit(), fac = facilities()[f];
  if (!fac || !fac.slots[i]) { state.pick = null; return render(); }
  if (slotBooked(f, i)) { toast("That time is already taken."); state.pick = null; return render(); }
  var id = nextId(), now = new Date();
  DB.busy = true;
  try {
    await put("booking", id, unit, { id: id, who: myHousehold(), unit: unit, place: fac.name, when: shortDate(now) + ", " + fac.slots[i], status: "Pending", day: dayKey(now), slot: i });
    logAct("Booking request for the " + fac.name + ", " + unit, "Facilities");
    toast("Request sent. You will see it under My reservations once the office decides.");
  } catch (e) {
    toast(errText(e));
    await loadAll().catch(function () {});
  }
  DB.busy = false; state.pick = null; render();
}
function cancelBooking(id) {
  confirmBox("Cancel this reservation?", "The time becomes free for others.", "Cancel reservation", async function () { await del("booking", id); }, true);
}
function exportMyReservations() {
  exportCSV("my-reservations.csv", ["Facility", "Date & time", "Status"], myBookings().map(function (r) { return [r.v.place, r.v.when, r.v.status]; }));
}
function viewRes() {
  var rows = myBookings().map(function (r) {
    var b = r.v;
    return '<tr><td style="font-weight:700">' + esc(b.place) + '</td><td style="color:var(--muted)">' + esc(b.when) + '</td><td><span class="chip ' + chipFor(b.status) + '">' + esc(b.status) + '</span></td><td>' +
      (b.status === "Pending" || b.status === "Approved" ? '<button class="btn" style="min-height:32px;padding:0 10px;font-size:12px" onclick="cancelBooking(\'' + escAttr(r.id) + '\')">Cancel</button>' : "") + "</td></tr>";
  });
  return '<div class="card" style="padding:0;overflow:hidden"><div style="display:flex;justify-content:flex-end;padding:12px 18px"><button class="btn" onclick="exportMyReservations()">Export to Excel (.csv)</button></div>' +
    (rows.length ? '<table><thead><tr><th>FACILITY</th><th>DATE &amp; TIME</th><th>STATUS</th><th></th></tr></thead><tbody>' + rows.join("") + "</tbody></table>" : '<div style="padding:22px;text-align:center;color:var(--muted)">You have not made any reservation yet.</div>') + "</div>";
}

/* ==========================================================================
   Dues, payments and motor parking
   ========================================================================== */
function viewDues() {
  var dues = myDues(), bal = balanceFor(myUnit());
  var rows = dues.map(function (r) {
    var d = r.v, st = d.paid ? "Paid" : isOverdue(d) ? "Overdue" : (myProofs().some(function (p) { return p.v.status === "Pending" && p.v.forText === d.note; }) ? "Pending" : "Open");
    return '<tr><td style="font-weight:600">' + esc(d.note) + "</td><td>" + peso(Number(d.amount)) + '</td><td style="color:var(--muted)">' + esc(d.dueDate || "On receipt") + '</td><td><span class="chip ' + (st === "Open" ? "info" : chipFor(st)) + '">' + st + "</span></td></tr>";
  });
  return '<div class="two-col" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)"><div class="card" style="padding:0;overflow:hidden">' +
    (rows.length ? '<table><thead><tr><th>CHARGE</th><th>AMOUNT</th><th>DUE DATE</th><th>STATUS</th></tr></thead><tbody>' + rows.join("") + "</tbody></table>" : '<div style="padding:22px;text-align:center;color:var(--muted)">No charges yet.</div>') + "</div>" +
    '<div style="display:flex;flex-direction:column;gap:16px"><div class="card"><div style="font-size:13px;font-weight:600;color:var(--muted)">Outstanding balance</div><div style="font:700 34px \'Bricolage Grotesque\',\'Source Sans 3\',sans-serif;color:' + (bal ? "#A02B1D" : "var(--ink)") + '">' + (bal ? peso(bal) : "None") + "</div>" +
    '<p style="font-size:13px;color:var(--muted);line-height:1.5;margin:8px 0 0">This system does not take payments. Pay the office, then send the details below so the office can confirm and issue your receipt.</p>' +
    '<button class="btn" style="width:100%;margin-top:10px" onclick="exportMyDues()">Export to Excel (.csv)</button></div>' +
    payFormHtml() + howToPayHtml() + myPaymentsHtml() + parkingCardHtml() + "</div></div>";
}
function exportMyDues() {
  exportCSV("my-dues.csv", ["Charge", "Amount", "Due date", "Status"], myDues().map(function (r) { return [r.v.note, r.v.amount, r.v.dueDate || "", r.v.paid ? "Paid" : "Unpaid"]; }));
}
function choosePayFor(v) {
  state.payFor = v;
  var r = myOpenDues().filter(function (x) { return x.id === v; })[0];
  state.payAmt = r ? String(r.v.amount) : (v === "parking" ? String(setting("motor_rate").rate || "") : "");
  render();
}
function payFormHtml() {
  var open = myOpenDues(), methods = payMethods().filter(function (m) { return m.enabled; });
  if (!methods.length) methods = [{ name: PAY_OFFICE }];
  if (!state.payMethod || !methods.some(function (m) { return m.name === state.payMethod; })) state.payMethod = methods[0].name;
  return '<div class="card" style="display:flex;flex-direction:column;gap:10px"><h2 style="font-size:17px;margin-bottom:0">I have paid</h2>' +
    '<p style="margin:0;font-size:13px;color:var(--muted);line-height:1.5">Pay at the office, by bank transfer, GCash or Maya. Then send the details here so the office can verify them and issue your receipt.</p>' +
    '<label>Payment for<select onchange="choosePayFor(this.value)"><option value="">Choose…</option>' + open.map(function (r) { return '<option value="' + escAttr(r.id) + '" ' + (state.payFor === r.id ? "selected" : "") + ">" + esc(r.v.note) + "</option>"; }).join("") +
    '<option value="parking" ' + (state.payFor === "parking" ? "selected" : "") + '>Motor parking rental</option><option value="other" ' + (state.payFor === "other" ? "selected" : "") + ">Other charge</option></select></label>" +
    '<label>Amount paid (₱)<input id="payAmt" type="number" min="0.01" step="0.01" placeholder="e.g. 450" value="' + escAttr(state.payAmt) + '" oninput="state.payAmt=this.value"></label>' +
    '<label>Payment method<select onchange="state.payMethod=this.value">' + methods.map(function (m) { return "<option " + (state.payMethod === m.name ? "selected" : "") + ">" + esc(m.name) + "</option>"; }).join("") + "</select></label>" +
    '<label>Reference number<input id="payRef" type="text" placeholder="Number on your receipt or transaction" value="' + escAttr(state.payRef) + '" oninput="state.payRef=this.value"></label>' +
    '<button class="btn primary" onclick="submitPaymentProof()">Send payment details</button></div>';
}
function howToPayHtml() {
  var ms = payMethods().filter(function (m) { return m.enabled; });
  return '<div class="card"><h2 style="font-size:17px;margin-bottom:8px">How to pay</h2>' + ms.map(function (m) {
    return '<div style="padding:8px 0;border-top:1px solid var(--border2)"><b style="font-size:14px">' + esc(m.name) + '</b><div style="font-size:12.5px;color:var(--muted);white-space:pre-line">' + esc(m.details) + "</div></div>";
  }).join("") + "</div>";
}
function submitPaymentProof() {
  var amount = parseFloat(state.payAmt), ref = state.payRef.trim();
  if (!state.payFor) return toast("Choose what the payment is for.");
  if (!(amount > 0)) return toast("Enter the amount you paid.");
  if (ref.length < 4) return toast("Enter the reference number from your receipt or transaction.");
  var open = myOpenDues().filter(function (x) { return x.id === state.payFor; })[0];
  var forText = open ? open.v.note : state.payFor === "parking" ? "Motor parking rental" : "Other charge";
  if (myProofs().some(function (p) { return p.v.status !== "Rejected" && String(p.v.reference).toLowerCase() === ref.toLowerCase() && p.v.method === state.payMethod; })) return toast("That reference number was already submitted.");
  act(async function () {
    var id = nextId();
    await put("proof", id, myUnit(), { id: id, unit: myUnit(), payer: myHousehold(), forText: forText, method: state.payMethod, reference: ref, amount: amount, date: shortDate(new Date()), status: "Pending" });
    logAct("Payment reference sent, " + myUnit(), "Finance");
    state.payFor = ""; state.payAmt = ""; state.payRef = "";
    toast("Payment details sent. The office will verify them and your receipt will appear here.");
  });
}
function myPaymentsHtml() {
  var l = myProofs();
  return '<div class="card"><h2 style="font-size:17px;margin-bottom:8px">My payments</h2>' + (l.length ? l.map(function (r) {
    var p = r.v;
    return '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--border2)"><div style="min-width:0"><b style="font-size:14px">' + esc(p.forText || "") + '</b><div style="font-size:12.5px;color:var(--muted)">' + esc(p.method) + " · Ref " + esc(p.reference) + " · " + peso(Number(p.amount)) + "</div>" + (p.receiptNo ? '<div style="font-size:12.5px;color:var(--muted)">Receipt ' + esc(p.receiptNo) + "</div>" : "") +
      '</div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px"><span class="chip ' + chipFor(p.status) + '">' + esc(p.status) + "</span>" + (p.status === "Confirmed" ? '<button class="btn" style="min-height:30px;padding:0 10px;font-size:12px" onclick="receiptFor(\'proof\',\'' + escAttr(r.id) + '\')">Receipt</button>' : "") + "</div></div>";
  }).join("") : '<p style="margin:0;font-size:13px;color:var(--muted)">No payments sent yet. After you pay, send the details above.</p>') + "</div>";
}
function slotsSorted() { return list("slot").sort(function (a, b) { return naturalCompare(a.id, b.id); }); }
function parkingCardHtml() {
  var slots = slotsSorted(), unit = myUnit(), rate = setting("motor_rate").rate;
  var mine = slots.filter(function (s) { return s.v.unit === unit; })[0], requested = !!getRow("request", unit);
  var free = slots.filter(function (s) { return !s.v.unit; }).length;
  var grid = slots.map(function (s) {
    var isMine = mine && s.id === mine.id, u = s.v.unit;
    var bg = isMine ? "var(--ink)" : (u ? "var(--bad-bg)" : "var(--good-bg)"), fg = isMine ? "#fff" : (u ? "var(--bad-fg)" : "var(--good-fg)");
    return '<div title="' + (isMine ? "Your slot" : (u ? "Taken" : "Free")) + '" style="background:' + bg + ";color:" + fg + ';border-radius:10px;padding:7px 0;text-align:center;font-size:11.5px;font-weight:700">' + esc(s.id) + "</div>";
  }).join("");
  var action = mine ? '<div class="chip good">Your slot: ' + esc(mine.id) + "</div>" : requested ? '<div class="chip good">Request sent — awaiting admin confirmation</div>' : '<button class="btn primary" style="width:100%" onclick="requestMotorParking()">Request a parking slot</button>';
  return '<div class="card"><h2 style="font-size:17px;margin-bottom:4px">Motor parking rental</h2><p style="margin:0 0 10px;font-size:13px;color:var(--muted)">Rent a motor/motorcycle parking slot' + (rate ? " for <b>" + peso(rate) + "/month</b>" : "") + ". The rate may change — check with the office for the latest amount.</p>" +
    (slots.length ? '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px"><b style="font-size:14px">' + free + " of " + slots.length + ' slots free</b><span style="font-size:12px;color:var(--muted)">Green = free · Red = taken</span></div><div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-bottom:12px">' + grid + "</div>" : '<p style="margin:0 0 10px;font-size:13px;color:var(--muted)">The office has not set up the parking slots yet. You can still send a request.</p>') + action + "</div>";
}
function requestMotorParking() {
  var unit = myUnit();
  if (getRow("request", unit)) return toast("You already sent a request.");
  act(async function () {
    await put("request", unit, unit, { unit: unit, who: myHousehold(), when: "Just now", at: Date.now() });
    logAct("Motor parking requested, " + unit, "Parking");
    toast("Parking slot request sent to the administrator.");
  });
}

/* ==========================================================================
   Events and polls
   ========================================================================== */
function viewEvents() {
  var all = newest(list("event")).map(eventInfo), list_ = all.filter(function (e) { return state.eventFilter === "all" || e.mine; });
  var goingCount = all.filter(function (e) { return e.mine; }).length;
  return pageTabs([["all", "All events (" + all.length + ")"], ["mine", "I'm going (" + goingCount + ")"]], state.eventFilter, "eventFilter") +
    '<div class="event-grid">' + (list_.map(function (e, i) {
      return '<div class="card event ' + (e.mine ? "yes" : "") + '"><div class="date-badge t' + (1 + i % 4) + '"><small>' + esc(e.month) + "</small><b>" + esc(e.day) + '</b></div><div class="event-main"><h2>' + esc(e.title) + '</h2><p class="meta">' + esc(e.when) + " · " + esc(e.place) + "</p>" + (e.about ? "<p>" + esc(e.about) + "</p>" : "") +
        '<div class="event-foot"><span class="going">' + e.going + ' going</span><button class="btn ' + (e.mine ? "" : "primary") + '" onclick="toggleRsvp(\'' + escAttr(e.id) + '\')">' + (e.mine ? "You're going ✓" : "I'm going") + "</button></div></div></div>";
    }).join("") || '<p class="empty">' + (all.length ? "You have not said you are going to any event yet." : "No events have been posted yet.") + "</p>") + "</div>";
}
function toggleRsvp(id) {
  var key = myUnit() + "|" + id, going = !!getRow("rsvp", key);
  act(async function () {
    if (going) await del("rsvp", key); else await put("rsvp", key, myUnit(), { event: Number(id) });
    toast(going ? "Removed from the event." : "See you there!");
  });
}
function viewPolls() {
  var all = pollsAll(), open = all.filter(function (p) { return p.open; }).length;
  var shown = all.filter(function (p) { return state.pollFilter === "all" || (state.pollFilter === "open") === p.open; });
  return pageTabs([["open", "Open (" + open + ")"], ["closed", "Closed (" + (all.length - open) + ")"], ["all", "All"]], state.pollFilter, "pollFilter") +
    '<div class="event-grid">' + (shown.map(function (p) {
      var voted = myVote(p.id), showResults = !p.open || voted !== undefined, total = pollTotal(p);
      return '<div class="card"><div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px"><div><h2>' + esc(p.q) + '</h2><small style="color:var(--muted)">' + (p.open ? "Closes" : "Closed") + " " + esc(p.closes) + '</small></div><span class="chip ' + (p.open ? "good" : "info") + '">' + (p.open ? "Open" : "Closed") + "</span></div>" +
        (showResults ? pollBars(p, voted) : '<div class="options">' + p.options.map(function (o, i) { return '<label class="opt"><input type="radio" name="poll-' + p.id + '" value="' + i + '"><span>' + esc(o.t) + "</span></label>"; }).join("") + '</div><button class="btn primary" style="margin-top:12px" onclick="castVote(' + p.id + ')">Submit my vote</button>') +
        (showResults ? '<p class="hint" style="margin:12px 0 0">' + total + " vote" + (total === 1 ? "" : "s") + " so far" + (voted !== undefined ? " · thank you for voting" : "") + "</p>" : "") + "</div>";
    }).join("") || '<p class="empty">No polls here.</p>') + "</div>";
}
function castVote(id) {
  var picked = document.querySelector('input[name="poll-' + id + '"]:checked');
  if (!picked) return toast("Pick an option first.");
  act(async function () {
    await put("vote", myUnit() + "|" + id, myUnit(), { poll: Number(id), option: Number(picked.value) });
    toast("Your vote was recorded. Thank you!");
  });
}

/* ==========================================================================
   Directory, grievances, documents
   ========================================================================== */
var FAQ = [
  ["How do I book the pool or the Function Hall?", "Open Book a facility, pick the place, tap an open time slot and send your request. The office approves it and you will see the result under Reservations."],
  ["When are monthly dues due?", "Your balance, due dates and history are under Dues."],
  ["I rent out my unit. What do I need to do?", "Open Unit Rental and declare how your unit is used. Long-term leases are saved right away. Short-term rentals and home businesses need the administrator's approval."],
  ["How do I request motor parking?", "Open Dues and use the Motor parking rental box. The office will assign a slot when one is free."],
  ["How do I report a problem in the building?", "Use Grievances to describe the concern. You can follow its status from Open to In progress to Resolved."]
];
function directory() { var d = setting("directory"); return { contacts: d.contacts || [], rules: d.rules || [] }; }
function viewDirectory() {
  var d = directory();
  return '<section><div class="sec-head"><h2>Who to call</h2></div>' + (d.contacts.length ? '<div class="contact-grid">' + d.contacts.map(function (c, i) {
    return '<div class="contact t' + (1 + i % 4) + '"><b>' + esc(c.name) + "</b><small>" + esc(c.note || "") + "</small><em>" + esc(c.tel || "") + "</em></div>";
  }).join("") + "</div>" : '<p class="empty">The office has not added contact numbers yet.</p>') + "</section>" +
    '<div class="two-lists"><section><div class="sec-head"><h2>House rules</h2></div><div class="lrows">' + (d.rules.map(function (r) { return '<div class="lrow rule"><span class="lmain"><b>' + esc(r[0]) + "</b><small>" + esc(r[1]) + "</small></span></div>"; }).join("") || '<p class="empty">The office has not added house rules yet.</p>') + "</div></section>" +
    '<section><div class="sec-head"><h2>Questions we hear a lot</h2></div><div class="faq">' + FAQ.map(function (f) { return "<details><summary>" + esc(f[0]) + "</summary><p>" + esc(f[1]) + "</p></details>"; }).join("") + "</div></section></div>";
}
function viewGr() {
  var all = newest(list("grievance")).filter(function (r) { return r.unit === myUnit(); }), names = ["Open", "In progress", "Resolved"];
  return '<div class="two-col-e"><div class="card"><h2 style="font-size:19px;margin-bottom:4px">Submit a grievance</h2><p style="margin:0 0 12px;font-size:13px;color:var(--muted)">The association will follow up here once reviewed.</p>' +
    '<div style="display:flex;flex-direction:column;gap:10px"><label>Subject<input id="grTitle" type="text" placeholder="e.g. Leaking pipe in the hallway"></label><label>Details<textarea id="grBody" rows="3" placeholder="Describe the concern"></textarea></label><button class="btn primary" style="margin-top:4px" onclick="submitGr()">Submit grievance</button></div></div>' +
    '<div class="card"><h2 style="font-size:19px;margin-bottom:6px">My grievances</h2>' + (all.length === 0 ? '<div style="padding:16px;border:2px dashed #D8CCB1;border-radius:12px;text-align:center;font-size:14px;color:var(--muted)">No grievances submitted yet.</div>' :
      all.map(function (r) {
        var g = r.v, s = Math.min(2, Math.max(0, Number(g.stage) || 0));
        return '<div style="padding:12px 0;border-top:1px solid var(--border2)"><div style="font-weight:700;font-size:15px">' + esc(g.title) + '</div><div style="font-size:13px;color:var(--muted);margin:2px 0 6px">' + esc(g.body) + '</div><span class="chip ' + (s === 2 ? "good" : s === 1 ? "warn" : "info") + '">' + names[s] + "</span></div>";
      }).join("")) + "</div></div>";
}
function submitGr() {
  var title = document.getElementById("grTitle").value.trim();
  if (!title) return toast("Enter a subject first.");
  var body = document.getElementById("grBody").value.trim() || "No further details.";
  act(async function () {
    var id = nextId();
    await put("grievance", id, myUnit(), { id: id, title: title, body: body, by: myUnit(), stage: 0 });
    logAct("Grievance sent, " + myUnit() + ": " + title, "Requests");
    toast("Grievance sent. The office will review it.");
  });
}
function viewDocs() {
  var docs = newest(list("doc")).filter(function (r) { return r.v.audience !== "admin"; });
  return '<div class="card" style="padding:0;overflow:hidden">' + (docs.map(function (r) {
    var d = r.v;
    return '<div style="display:flex;align-items:center;gap:12px;padding:0 22px;min-height:56px;border-top:1px solid var(--border2);font-size:14px;flex-wrap:wrap"><span style="flex-grow:1;font-weight:700">' + esc(d.name) + '</span><span style="color:var(--muted)">' + esc(d.cat || "Other") + '</span><span style="color:var(--muted)">' + esc(d.date) + '</span><button class="btn" onclick="openDoc(\'' + escAttr(r.id) + '\')">' + (d.raw ? "Download" : "View") + "</button></div>";
  }).join("") || '<div style="padding:22px;text-align:center;color:var(--muted)">The association has not shared any document yet.</div>') + "</div>";
}

/* ==========================================================================
   Unit rental (usage declaration)
   ========================================================================== */
var USAGE_TYPES = [
  { id: "owner", name: "Owner-occupied", desc: "I live here myself." },
  { id: "tenant", name: "Leased to a tenant", desc: "Long-term lease to a tenant." },
  { id: "shortterm", name: "Short-term rental", desc: "Airbnb, Booking.com, etc." },
  { id: "business", name: "Home-based business", desc: "Office or business use." },
  { id: "renovation", name: "Under renovation", desc: "Repairs or renovation work." },
  { id: "vacant", name: "Vacant", desc: "Nobody is staying in it." }
];
function pickUnitUsage(id) { state.usage = id; state.usageMsg = ""; render(); }
function viewRental() {
  var rec = myRec();
  if (!state.usage) state.usage = rec.usage || "owner";
  var needs = state.usage === "shortterm" || state.usage === "business";
  var recNeeds = needsApproval(rec), st = recNeeds ? (rec.usageStatus === "approved" ? "approved" : rec.usageStatus === "rejected" ? "rejected" : "pending") : null;
  var detailLabel = { tenant: "(tenant name & contact)", shortterm: "(platform used, e.g. Airbnb)", business: "(type of business)", renovation: "(what work, and until when)" }[state.usage] || "";
  return '<div class="two-col-e"><div style="display:flex;flex-direction:column;gap:16px">' +
    (rec.usage ? '<div class="card"><h2 style="font-size:19px;margin-bottom:2px">Current status</h2><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:10px 0 6px"><span class="chip ' + (recNeeds ? "warn" : "good") + '">' + esc(usageLabel(rec.usage)) + "</span>" +
      (recNeeds ? '<span class="chip ' + (st === "approved" ? "good" : st === "rejected" ? "bad" : "warn") + '">' + (st === "approved" ? "Approved" : st === "rejected" ? "Rejected" : "Pending review") + "</span>" : "") + "</div>" +
      (recNeeds ? '<div class="rental-steps"><div class="rental-step done"><div class="dot">✓</div><div class="lbl">Declared</div></div><div class="rental-step ' + (st === "pending" ? "current" : "done") + '"><div class="dot">' + (st === "pending" ? "2" : "✓") + '</div><div class="lbl">Under review</div></div><div class="rental-step ' + (st === "pending" ? "" : st === "rejected" ? "rejected" : "done") + '"><div class="dot">' + (st === "pending" ? "3" : st === "rejected" ? "✕" : "✓") + '</div><div class="lbl">' + (st === "rejected" ? "Rejected" : "Decision") + "</div></div></div>" : "") +
      (rec.statusNote ? '<p style="margin:10px 0 0;font-size:13px;color:var(--muted)">' + esc(rec.statusNote) + "</p>" : "") + (st === "rejected" && rec.usageRemark ? '<p style="margin:6px 0 0;font-size:13px;color:#A02B1D">Admin note: “' + esc(rec.usageRemark) + "”</p>" : "") +
      (rec.statusDate ? '<p style="margin:8px 0 0;font-size:12px;color:var(--muted)">Declared ' + esc(rec.statusDate) + ". Update the form below any time — resubmitting sends it for review again.</p>" : "") + "</div>" : "") +
    '<div class="card"><h2 style="font-size:19px;margin-bottom:10px">' + (rec.usage ? "Update your declaration" : "Declare your unit's usage") + '</h2><div class="usage-grid">' +
    USAGE_TYPES.map(function (u) { return '<button type="button" class="usage-card ' + (state.usage === u.id ? "active" : "") + '" onclick="pickUnitUsage(\'' + u.id + '\')"><span class="name">' + u.name + '</span><span class="desc">' + u.desc + "</span></button>"; }).join("") + "</div>" +
    '<div style="display:flex;flex-direction:column;gap:10px;margin-top:14px">' + (state.usage !== "owner" && state.usage !== "vacant" ? "<label>Details " + detailLabel + '<input id="unitUsageDetails" value="' + escAttr(state.usageDetails) + '" oninput="state.usageDetails=this.value" placeholder="Add a few details for the administrator"></label>' : "") +
    (needs ? '<p style="margin:0;font-size:12px;color:var(--muted)">This type needs admin approval before it\'s active.</p>' : "") +
    '<button class="btn primary" style="margin-top:4px;align-self:flex-start" onclick="saveUnitUsage()">Save declaration</button>' + (state.usageMsg ? '<div style="font-size:12px;color:#A02B1D">' + esc(state.usageMsg) + "</div>" : "") + "</div></div></div>" +
    '<div style="display:flex;flex-direction:column;gap:16px"><div class="card"><h2 style="font-size:19px;margin-bottom:4px">How this works</h2><ol style="margin:0;padding-left:18px;font-size:13px;color:var(--muted);line-height:1.8"><li>Tell us how your unit is actually being used.</li><li>Owner-occupied and long-term tenant leases are saved right away — no review needed.</li><li>Short-term rentals (like Airbnb) and home-based businesses need the administrator\'s approval first. You will see the decision right here.</li></ol></div>' +
    '<div class="card"><h2 style="font-size:19px;margin-bottom:4px">Why we ask</h2><div class="benefit-row"><div><h4>Security</h4><p>The guardhouse knows who to expect when a unit has regular turnover, like Airbnb guests.</p></div></div><div class="benefit-row"><div><h4>Insurance</h4><p>Business or short-term-rental use can change what the building\'s coverage needs to account for.</p></div></div><div class="benefit-row"><div><h4>Fair dues</h4><p>Keeps the association\'s records accurate for everyone, in case usage ever affects dues.</p></div></div></div></div></div>';
}
function saveUnitUsage() {
  var key = state.usage, details = (state.usageDetails || "").trim();
  if (["tenant", "shortterm", "business", "renovation"].indexOf(key) >= 0 && !details) return set({ usageMsg: "Please add a few details for the administrator before saving." });
  var rec = unitRec(myUnit());
  if (!rec) return set({ usageMsg: "Your unit record was not found. Please contact the office." });
  act(async function () {
    var date = shortDate(new Date()), needs = key === "shortterm" || key === "business";
    await put("unit", myUnit(), myUnit(), Object.assign({}, rec, { usage: key, usageStatus: needs ? "pending" : "", usageRemark: "", statusNote: (key === "owner" || key === "vacant") ? "" : details, statusDate: date, status: key === "vacant" ? "Vacant" : "Occupied" }));
    var sid = nextId();
    await put("statusUpdate", sid, myUnit(), { id: sid, unit: myUnit(), key: key, note: details, date: date, by: "Resident" });
    logAct(myUnit() + " status set to " + usageLabel(key).toLowerCase(), "Units");
    state.usageDetails = ""; state.usageMsg = "";
    toast(needs ? "Sent to the administrator for review." : "Saved. Thank you.");
  });
}

/* ==========================================================================
   Settings
   ========================================================================== */
function viewSettings() {
  var p = me();
  return '<div class="two-col-e"><div style="display:flex;flex-direction:column;gap:16px"><div class="card"><h2 style="font-size:19px;margin-bottom:4px">Profile</h2><p style="margin:0 0 12px;font-size:13px;color:var(--muted)">To change your name, email, mobile number or unit, ask the administration office.</p>' +
    '<div class="kv"><span>Full name</span><b>' + esc(p.name || "—") + "</b><span>Email</span><b>" + esc(p.email) + "</b><span>Mobile</span><b>" + esc(p.phone || "Not added") + "</b><span>Unit</span><b>" + esc(p.unit || "—") + "</b></div></div>" +
    '<div class="card"><h2 style="font-size:19px;margin-bottom:4px">Security</h2><p style="margin:0 0 12px;font-size:13px;color:var(--muted)">Change the password used to sign in to this account.</p><button class="btn primary" onclick="changePasswordForm()">Change password</button></div></div>' +
    '<div style="display:flex;flex-direction:column;gap:16px"><div class="card"><h2 style="font-size:19px;margin-bottom:4px">Appearance</h2><p style="margin:0 0 10px;font-size:13px;color:var(--muted)">Currently in ' + (state.darkMode ? "dark" : "light") + ' mode.</p><button class="btn" onclick="toggleDarkMode()">' + (state.darkMode ? "Switch to light mode" : "Switch to dark mode") + "</button></div>" +
    '<div class="card"><h2 style="font-size:19px;margin-bottom:4px">Where you\'re signed in</h2><p style="margin:0 0 10px;font-size:13px;color:var(--muted)">You are signed in on this device. If you used a shared computer or lost a phone, sign out everywhere.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" onclick="signOut()">Log out here</button><button class="btn" style="color:#A02B1D" onclick="signOut(true)">Log out on all devices</button></div></div></div></div>';
}
function changePasswordForm() {
  openForm({
    title: "Change password",
    fields: [{ name: "cur", label: "Current password", type: "password" }, { name: "pw", label: "New password", type: "password", rules: true }, { name: "pw2", label: "Confirm new password", type: "password" }],
    onSubmit: async function (d) {
      var bad = pwProblem(d.pw); if (bad) return { error: bad };
      if (d.pw !== d.pw2) return { error: "New password and confirmation don't match." };
      var chk = await sb.auth.signInWithPassword({ email: DB.profile.email, password: d.cur });
      if (chk.error) return { error: "Your current password is not correct." };
      var u = await sb.auth.updateUser({ password: d.pw });
      if (u.error) return { error: u.error.message };
      toast("Password changed.");
    }
  });
}

/* ---------- search and bell ---------- */
function searchIndex() {
  var pages = [["Book a facility", "book"], ["My reservations", "res"], ["Dues and payments", "dues"], ["Community events", "events"], ["Polls", "polls"], ["Directory", "directory"], ["Grievances", "gr"], ["Documents", "docs"], ["Unit rental", "rental"], ["Settings", "settings"]];
  var d = directory();
  return [].concat(
    list("event").map(function (r) { return { t: esc(r.v.title), s: esc((r.v.date || "") + " · " + (r.v.place || "")), tag: "Event", v: "events" }; }),
    pollsAll().map(function (p) { return { t: esc(p.q), s: p.open ? "Open poll" : "Closed poll", tag: "Poll", v: "polls" }; }),
    publishedAnns().map(function (r) { return { t: esc(r.v.title), s: esc(r.v.body || ""), tag: "Announcement", v: "home" }; }),
    list("doc").filter(function (r) { return r.v.audience !== "admin"; }).map(function (r) { return { t: esc(r.v.name), s: esc(r.v.cat || ""), tag: "Document", v: "docs" }; }),
    d.contacts.map(function (c) { return { t: esc(c.name), s: esc((c.note || "") + " · " + (c.tel || "")), tag: "Contact", v: "directory" }; }),
    d.rules.map(function (r) { return { t: esc(r[0]), s: esc(r[1]), tag: "House rule", v: "directory" }; }),
    FAQ.map(function (f) { return { t: esc(f[0]), s: esc(f[1]), tag: "FAQ", v: "directory" }; }),
    pages.map(function (p) { return { t: p[0], s: "Open this page", tag: "Page", v: p[1] }; }));
}
function bellItems() { return notifs().map(function (n) { return { t: esc(n[0]), s: "Open", v: n[2] }; }); }

(function () {
  document.addEventListener("pointerdown", function (e) { var b = e.target.closest(".btn"); if (b) b.classList.add("is-pressed"); });
  ["pointerup", "pointerleave"].forEach(function (ev) { document.addEventListener(ev, function (e) { var b = e.target.closest && e.target.closest(".btn"); if (b) b.classList.remove("is-pressed"); }); });
})();

rhInit();
