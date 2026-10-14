/* ResidentHub web — shared core for admin.html and resident.html
   Real system: Supabase sign-in and the shared `records` table. No sample data.
   The ResidentHub app reads and writes the very same rows, so both always show the same thing.

   Each page sets window.RH_ROLE ("admin" or "resident") and loads, in order:
   shared.js, supabase-config.js, core.js, then its own script (admin.js or resident.js).
   The page script defines: state, render(), rhEnter(), rhRefresh(), rhLeave() and then calls rhInit(). */

var ROLE = window.RH_ROLE || "resident";
var sb = window.supabase.createClient((window.RH_SUPABASE || {}).url, (window.RH_SUPABASE || {}).anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
});

/* ---------- constants ---------- */
var PAY_OFFICE = "Cash or check at the office";
var DEFAULT_PAY = [
  { name: PAY_OFFICE, details: "Pay at the administration office.", enabled: true },
  { name: "Bank transfer", details: "Account name: (add account name)\nBank: (add bank name)\nAccount no.: (add account number)", enabled: false },
  { name: "GCash", details: "Account name: (add name)\nNumber: (add GCash number)", enabled: false },
  { name: "Maya", details: "Account name: (add name)\nNumber: (add Maya number)", enabled: false }
];
var FACILITIES = [{ name: "Swimming Pool", hours: "6:00 AM – 8:00 PM" }, { name: "Function Hall", hours: "8:00 AM – 10:00 PM" }];
var SLOT_TIMES = ["8–10 AM", "10–12 NN", "12–2 PM", "2–4 PM", "4–6 PM", "6–8 PM", "8–10 PM"];
var EXP_CATS = ["Security services", "Common-area utilities", "Janitorial and maintenance", "Repairs and improvements",
  "Supplies and equipment", "Insurance", "Administration and reserve fund", "Other"];
var EXP_AREAS = ["Whole building", "Lobby and common areas", "Swimming pool", "Function hall", "Elevators", "Parking",
  "Grounds and garden", "Offices and security"];
var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var LONG_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
var USAGE_NAMES = { owner: "Owner-occupied", tenant: "Leased (long-term)", shortterm: "Short-term rental", business: "Business use", renovation: "Under renovation", vacant: "Vacant" };
var DOC_CATS = ["Policy", "Finance", "Form", "Notice", "Minutes", "Other"];

/* ---------- small helpers ---------- */
function $(s, el) { return (el || document).querySelector(s); }
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
function shortDate(d) { return MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear(); }
function pad(n) { return n < 10 ? "0" + n : "" + n; }
function dayKey(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
function parseShort(s) {
  var m = /^([A-Za-z]{3})[A-Za-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/.exec(String(s || "").trim());
  if (!m) return null;
  var mi = MONTHS.indexOf(m[1].charAt(0).toUpperCase() + m[1].slice(1, 3).toLowerCase());
  return mi < 0 ? null : new Date(+m[3], mi, +m[2]);
}
var lastId = 0;
function nextId() {
  var n = Date.now();
  if (n <= lastId) n = lastId + 1;
  lastId = n;
  return n;
}
function clean(v) {
  if (Array.isArray(v)) return v.map(clean);
  if (v && typeof v === "object") {
    var o = {};
    Object.keys(v).forEach(function (k) {
      var c = clean(v[k]);
      var empty = c == null || c === "" || c === false || c === 0 ||
        (Array.isArray(c) && !c.length) || (c && typeof c === "object" && !Array.isArray(c) && !Object.keys(c).length);
      if (!empty) o[k] = c;
    });
    return o;
  }
  return v;
}
function naturalCompare(a, b) { return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" }); }
function errText(e) {
  var m = (e && (e.message || e.error_description)) || String(e || "");
  if (e && e.code === "23505") return "That was already taken by someone else.";
  if (/row-level security|permission denied/i.test(m)) return "You are not allowed to do that.";
  if (/Failed to fetch|NetworkError|network/i.test(m)) return "No internet connection. Try again.";
  return m || "Something went wrong.";
}
function usageLabel(k) { return USAGE_NAMES[k] || "—"; }
function initials(name) { return String(name || "?").split(/\s+/).map(function (s) { return s[0]; }).slice(0, 2).join("").toUpperCase(); }

/* ---------- password rules ---------- */
var PW_RULES = [
  ["At least 8 characters", function (p) { return p.length >= 8; }],
  ["An uppercase letter (A-Z)", function (p) { return /[A-Z]/.test(p); }],
  ["A lowercase letter (a-z)", function (p) { return /[a-z]/.test(p); }],
  ["A number (0-9)", function (p) { return /\d/.test(p); }],
  ["A symbol, e.g. ! @ # $ %", function (p) { return /[^A-Za-z0-9]/.test(p); }]
];
function pwProblem(p) {
  for (var i = 0; i < PW_RULES.length; i++) {
    if (!PW_RULES[i][1](p)) return "Your new password needs: " + PW_RULES[i][0].replace(/^A(n)? /, function (m, n) { return n ? "an " : "a "; }).replace(/^At least/, "at least") + ".";
  }
  return null;
}
function rulesHtml() {
  return '<ul class="rules" data-rules>' + PW_RULES.map(function (r) { return "<li>" + esc(r[0]) + "</li>"; }).join("") + "</ul>";
}
function bindRules(input, root) {
  var items = root.querySelectorAll("li");
  function upd() { for (var i = 0; i < items.length; i++) items[i].className = PW_RULES[i][1](input.value) ? "ok" : ""; }
  input.addEventListener("input", function () {
    var er = input.form && input.form.querySelector(".formerr");
    if (er) er.hidden = true;
    upd();
  });
  upd();
}

/* ---------- state held by the core ---------- */
var DB = {
  user: null,       // auth user
  profile: null,    // profiles row
  rows: {},         // kind -> Map(id -> {unit, value})
  accounts: [],     // admin: all profiles
  sig: "",
  busy: false
};
function isAdmin() { return DB.profile && DB.profile.role === "admin"; }
function myUnit() { return (DB.profile && DB.profile.unit) || ""; }

function list(kind) {
  var m = DB.rows[kind];
  if (!m) return [];
  var out = [];
  m.forEach(function (r, id) { out.push({ id: id, unit: r.unit, v: r.value || {} }); });
  return out;
}
function vals(kind) { return list(kind).map(function (r) { return r.v; }); }
function newest(a) { return a.slice().sort(function (x, y) { return Number(y.id) - Number(x.id); }); }
function getRow(kind, id) { var m = DB.rows[kind]; return m ? m.get(String(id)) : null; }
function setting(id) { var r = getRow("setting", id); return (r && r.value) || {}; }
function unitRec(unit) { var r = getRow("unit", unit); return r ? r.value : null; }

/* ---------- database ---------- */
async function loadAll() {
  var out = {}, from = 0;
  for (;;) {
    var r = await sb.from("records").select("kind,id,unit,value").order("kind").order("id").range(from, from + 999);
    if (r.error) throw r.error;
    r.data.forEach(function (x) {
      if (!out[x.kind]) out[x.kind] = new Map();
      out[x.kind].set(x.id, { unit: x.unit, value: x.value });
    });
    if (r.data.length < 1000) break;
    from += 1000;
  }
  var sig = JSON.stringify(Object.keys(out).sort().map(function (k) {
    var a = [];
    out[k].forEach(function (v, id) { a.push([id, v.unit, v.value]); });
    return [k, a];
  }));
  var changed = sig !== DB.sig;
  DB.sig = sig;
  DB.rows = out;
  return changed;
}
async function loadAccounts() {
  if (!isAdmin()) return;
  var r = await sb.from("profiles").select("*").order("name");
  if (r.error) throw r.error;
  DB.accounts = r.data || [];
}
async function put(kind, id, unit, value) {
  id = String(id);
  value = clean(value);
  var known = DB.rows[kind] && DB.rows[kind].has(id);
  var res;
  if (known) {
    res = await sb.from("records").update({ unit: unit, value: value }).eq("kind", kind).eq("id", id);
  } else {
    res = await sb.from("records").insert({ kind: kind, id: id, unit: unit, value: value });
    if (res.error && res.error.code === "23505" && kind !== "booking") {
      res = await sb.from("records").update({ unit: unit, value: value }).eq("kind", kind).eq("id", id);
    }
  }
  if (res.error) throw res.error;
  if (!DB.rows[kind]) DB.rows[kind] = new Map();
  DB.rows[kind].set(id, { unit: unit, value: value });
}
async function del(kind, id) {
  id = String(id);
  var res = await sb.from("records").delete().eq("kind", kind).eq("id", id);
  if (res.error) throw res.error;
  if (DB.rows[kind]) DB.rows[kind].delete(id);
}
function logAct(title, area) {
  var at = nextId();
  put("activity", at, "__admin", { title: title, area: area || "", at: at }).catch(function () {});
}
/* run an action, show any error as a message, and redraw */
async function act(fn) {
  try { await fn(); } catch (e) { toast(errText(e)); }
  rhRefresh(true);
}

/* ---------- derived data ---------- */
function balanceFor(unit) {
  return vals("due").filter(function (d) { return d.unit === unit && !d.paid; })
    .reduce(function (s, d) { return s + Number(d.amount || 0); }, 0);
}
function isOverdue(d) {
  if (d.paid || !d.dueDate) return false;
  var x = parseShort(d.dueDate);
  return !!x && Date.now() > x.getTime() + 86400000;
}
function nextReceiptNo() {
  var year = new Date().getFullYear(), max = 0, re = /^OR-(\d{4})-(\d+)$/;
  vals("payment").concat(vals("proof")).forEach(function (r) {
    var m = re.exec(r.receiptNo || "");
    if (m && +m[1] === year && +m[2] > max) max = +m[2];
  });
  return "OR-" + year + "-" + String(max + 1).padStart(4, "0");
}
function firstOpenDue(unit) {
  var open = vals("due").filter(function (d) { return d.unit === unit && !d.paid; });
  open.sort(function (a, b) { return a.id - b.id; });
  return open[0] || null;
}
function payMethods() {
  var s = setting("paymethods").list;
  if (!Array.isArray(s)) return DEFAULT_PAY.map(function (m) { return Object.assign({}, m); });
  return DEFAULT_PAY.map(function (d) {
    var f = s.filter(function (x) { return x.name === d.name; })[0];
    return f ? { name: d.name, details: f.details || d.details, enabled: !!f.enabled } : Object.assign({}, d, { enabled: d.name === PAY_OFFICE });
  });
}
function slotBooked(f, i) {
  var today = dayKey(new Date());
  var b = setting("blocked");
  if (b.day === today && (b.keys || []).indexOf(f + "-" + i) >= 0) return true;
  var place = FACILITIES[f].name;
  return vals("booking").some(function (x) {
    return x.day === today && Number(x.slot) === i && x.place === place && (x.status === "Pending" || x.status === "Approved");
  });
}
function slotClosed(f, i) {
  var b = setting("blocked");
  return b.day === dayKey(new Date()) && (b.keys || []).indexOf(f + "-" + i) >= 0;
}
function pollsAll() {
  var votes = list("vote");
  return newest(list("poll")).map(function (r) {
    var p = r.v;
    var opts = (p.options || []).map(function (t) { return { t: t, votes: 0 }; });
    votes.forEach(function (x) {
      if (Number(x.v.poll) === Number(r.id) && opts[x.v.option]) opts[x.v.option].votes++;
    });
    return { id: Number(r.id), q: p.question || "", open: !!p.open, closes: p.closes || "—", options: opts };
  });
}
function myVote(pollId) {
  var r = getRow("vote", myUnit() + "|" + pollId);
  return r ? Number(r.value.option) : undefined;
}
function monthOf(dateText) { var d = parseShort(dateText); return d ? d.getFullYear() * 12 + d.getMonth() : null; }
function thisMonthKey() { var n = new Date(); return n.getFullYear() * 12 + n.getMonth(); }

/* ---------- documents ---------- */
function b64Bytes(b64) {
  var bin = atob(b64), n = bin.length, a = new Uint8Array(n);
  for (var i = 0; i < n; i++) a[i] = bin.charCodeAt(i);
  return a;
}
var MIME = { pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", png: "image/png", jpg: "image/jpeg",
  jpeg: "image/jpeg", txt: "text/plain", csv: "text/csv" };
function openDoc(id) {
  var r = getRow("doc", id); if (!r) return;
  var d = r.value;
  if (d.raw) {
    var ext = (d.ext || "").replace(/^\./, "").toLowerCase();
    var blob = new Blob([b64Bytes(d.raw)], { type: MIME[ext] || "application/octet-stream" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = /\.[A-Za-z0-9]+$/.test(d.name) || !ext ? d.name : d.name + "." + ext;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    return;
  }
  var html = (d.blocks || []).map(function (b) {
    if (b.k === "h1") return "<h2>" + esc(b.t) + "</h2>";
    if (b.k === "h2") return "<h3>" + esc(b.t) + "</h3>";
    if (b.k === "bullet") return "<p>• " + esc(b.t) + "</p>";
    if (b.k === "table") return '<table style="font-size:13px"><tbody>' + (b.r || []).map(function (row) {
      return "<tr>" + row.map(function (c) { return "<td>" + esc(c) + "</td>"; }).join("") + "</tr>";
    }).join("") + "</tbody></table>";
    return "<p>" + esc(b.t) + "</p>";
  }).join("") || "<p>This document has no readable content.</p>";
  openModal('<h2>' + esc(d.name) + '</h2><div style="max-height:55vh;overflow:auto">' + html + '</div>');
}

/* ---------- receipts (opens in Word) ---------- */
function receiptHtml(p) {
  var rows = [["Receipt no.", p.receiptNo], ["Date paid", p.confirmedOn || p.date], ["Unit", p.unit], ["Received from", p.payer],
    ["Payment for", p.forText], ["Amount", peso(Number(p.amount))], ["Payment method", p.method], ["Reference no.", p.reference || "—"], ["Status", "Paid"]];
  return '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>Payment receipt</title></head><body style="font-family:Arial,sans-serif">' +
    "<h1>Payment receipt</h1><p>City Residences Condominium Corporation</p>" +
    '<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse"><tr><th align="left">Detail</th><th align="left">Information</th></tr>' +
    rows.map(function (r) { return "<tr><td>" + esc(r[0]) + "</td><td>" + esc(r[1]) + "</td></tr>"; }).join("") +
    "</table><p>This receipt is your proof of payment. Keep a copy for your records.</p></body></html>";
}
function downloadReceipt(p) {
  var blob = new Blob(["﻿", receiptHtml(p)], { type: "application/msword" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "receipt-" + p.receiptNo + ".doc";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
}
function receiptFor(kind, id) {
  var r = getRow(kind, id);
  if (!r) return toast("Receipt not found.");
  if (kind === "proof" && r.value.status !== "Confirmed") return toast("The receipt is available once the office confirms the payment.");
  downloadReceipt(r.value);
}

/* ---------- popup form (uses the same look as the old popup window) ---------- */
function openForm(o) {
  closeModal();
  var html = '<div class="modal-back" id="modal"><form class="modal" id="rhForm" autocomplete="off" onclick="event.stopPropagation()"><button type="button" class="modal-x" data-close aria-label="Close">×</button><h2>' + esc(o.title) + "</h2>";
  if (o.intro) html += "<p>" + o.intro + "</p>";
  html += '<div style="display:flex;flex-direction:column;gap:12px">';
  (o.fields || []).forEach(function (f) {
    var val = f.value == null ? "" : f.value;
    html += '<label class="fl"><span>' + esc(f.label) + "</span>";
    if (f.type === "select") {
      html += '<select name="' + f.name + '">' + f.options.map(function (op) {
        var v = Array.isArray(op) ? op[0] : op, l = Array.isArray(op) ? op[1] : op;
        return '<option value="' + esc(v) + '"' + (String(v) === String(val) ? " selected" : "") + ">" + esc(l) + "</option>";
      }).join("") + "</select>";
    } else if (f.type === "textarea") {
      html += '<textarea name="' + f.name + '" rows="3" placeholder="' + esc(f.placeholder || "") + '">' + esc(val) + "</textarea>";
    } else {
      html += '<input name="' + f.name + '" type="' + (f.type || "text") + '" value="' + esc(val) + '" placeholder="' + esc(f.placeholder || "") + '"' +
        (f.readonly ? " readonly" : "") + (f.step ? ' step="' + f.step + '"' : "") + ">";
    }
    html += "</label>";
    if (f.rules) html += rulesHtml();
  });
  html += '</div><div class="formerr" hidden></div><div class="modal-actions"><button class="btn primary" type="submit">' + esc(o.submit || "Save") +
    '</button><button type="button" class="btn" data-close>Cancel</button></div></form></div>';
  var wrap = document.createElement("div");
  wrap.innerHTML = html;
  var veil = wrap.firstChild;
  document.body.appendChild(veil);
  var form = $("form", veil);
  (o.fields || []).forEach(function (f) { if (f.rules) bindRules($('[name="' + f.name + '"]', form), $("[data-rules]", form)); });
  var first = $("input:not([readonly]),select,textarea", form);
  if (first) first.focus();
  veil.addEventListener("mousedown", function (e) { if (e.target === veil) closeModal(); });
  Array.prototype.forEach.call(form.querySelectorAll("[data-close]"), function (b) { b.addEventListener("click", closeModal); });
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = typeof v === "string" ? v.trim() : v; });
    var btn = $("button[type=submit]", form), err = $(".formerr", form);
    btn.disabled = true; err.hidden = true;
    try {
      var r = await o.onSubmit(data);
      if (r && r.error) throw new Error(r.error);
      if (!r || !r.keepOpen) closeModal();
      rhRefresh(true);
    } catch (ex) {
      err.textContent = errText(ex); err.hidden = false; btn.disabled = false;
    }
  });
}
function openInfo(title, bodyHtml) {
  openModal("<h2>" + esc(title) + "</h2>" + bodyHtml + '<div class="modal-actions"><button class="btn primary" onclick="closeModal()">Done</button></div>');
}
function confirmBox(title, text, label, fn, danger) {
  openForm({ title: title, intro: esc(text), fields: [], submit: label, onSubmit: async function () { return await fn(); } });
  if (danger) { var b = $("#modal button[type=submit]"); if (b) b.style.background = "#A02B1D"; }
}

/* ---------- edge functions ---------- */
async function callFn(name, body) {
  var r = await sb.functions.invoke(name, { body: body });
  if (r.error) {
    var msg = r.error.message;
    try {
      if (r.error.context && r.error.context.json) {
        var j = await r.error.context.json();
        if (j && j.error) msg = j.error;
      }
    } catch (e) { /* keep default */ }
    throw new Error(msg || "Could not reach the server.");
  }
  if (r.data && r.data.error) throw new Error(r.data.error);
  return r.data || {};
}
function callUsers(body) { return callFn("manage-users", body); }

/* ---------- keep typing position while the page redraws ---------- */
function keepFocus(fn) {
  var a = document.activeElement, id = a && a.id, s = null, e = null;
  if (id && a.selectionStart != null) { s = a.selectionStart; e = a.selectionEnd; }
  fn();
  if (id) {
    var el = document.getElementById(id);
    if (el) {
      el.focus();
      if (s != null && el.setSelectionRange) { try { el.setSelectionRange(s, e); } catch (x) { /* some inputs have no range */ } }
    }
  }
}

/* ==========================================================================
   Sign-in screens (same look as the old sign-in pages)
   ========================================================================== */
var AUTH = ROLE === "admin"
  ? { wrap: "login-wrap", card: "login-card", badges: "login-badges", form: "login-form", err: "login-err", divider: "login-divider", links: "login-links" }
  : { wrap: "auth-wrap", card: "auth-card", badges: "auth-badges", form: "auth-form", err: "auth-err", divider: "auth-divider", links: "auth-links" };

function authPage(title, sub, inner, badges) {
  document.documentElement.setAttribute("data-theme", "light");
  $("#app").innerHTML = '<div class="' + AUTH.wrap + '"><a class="back-link" href="index.html">&larr; Back to website</a>' +
    '<form class="' + AUTH.card + '" id="authForm" novalidate>' +
    '<img src="logo.jpg" alt="ResidentHub"><div class="name">' + title + '</div><div class="sub">' + sub + "</div>" +
    (badges ? '<div class="' + AUTH.badges + '">' + badges.map(function (b) { return "<span>" + b + "</span>"; }).join("") + "</div>" : "") +
    '<div class="' + AUTH.form + '">' + inner + "</div></form></div>";
}
function authErr(id, msg) {
  return '<div class="' + AUTH.err + '" id="' + id + '"' + (msg ? "" : " hidden") + ">" + esc(msg || "") + "</div>";
}
function fieldHtml(label, name, type, extra) {
  return "<label>" + label + '</label><input name="' + name + '" type="' + (type || "text") + '" ' + (extra || "") + ">";
}
function pwField(label, name, auto) {
  return "<label>" + label + '</label><div class="pw-wrap"><input name="' + name + '" type="password" autocomplete="' + (auto || "current-password") +
    '" placeholder="••••••••"><button type="button" class="pw-toggle" data-pw="' + name + '">Show</button></div>';
}
function bindPwToggles(root) {
  Array.prototype.forEach.call(root.querySelectorAll("[data-pw]"), function (b) {
    b.addEventListener("click", function () {
      var inp = root.querySelector('[name="' + b.dataset.pw + '"]');
      var show = inp.type === "password";
      inp.type = show ? "text" : "password"; b.textContent = show ? "Hide" : "Show";
    });
  });
}

function renderLogin(msg) {
  var admin = ROLE === "admin";
  authPage(admin ? "Administrator sign-in" : "Sign in to ResidentHub",
    admin ? "CITY RESIDENCES CONDOMINIUM CORP." : "CITY RESIDENCES CONDOMINIUM CORP. · RESIDENT PORTAL",
    fieldHtml("Email address", "email", "email", 'autocomplete="username" placeholder="you@email.com"') +
    pwField("Password", "password") +
    '<button class="btn primary" type="submit">Continue</button>' + authErr("loginErr", msg) +
    '<div class="' + AUTH.divider + '"></div><div class="' + AUTH.links + '"><button type="button" class="linklike" id="forgotLink">Forgot password?</button></div>' +
    '<p style="font-size:12px;color:var(--muted);text-align:center;line-height:1.55;margin:6px 0 0">Access is by invitation only. There is no public sign-up — the administration office creates every account.' +
    (admin ? ' Residents use the <a href="resident.html" style="color:var(--navy-dark);font-weight:700">Resident Login</a>.' : "") + "</p>",
    admin ? ["Centralized dashboard", "Role-based access"] : ["Secure resident sign-in", "Bookings &amp; dues in one place"]);
  bindPwToggles($("#authForm"));
  $("#forgotLink").addEventListener("click", function () { renderForgot(); });
  var fails = 0, lockedUntil = 0;
  $("#authForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var f = e.target, err = $("#loginErr"), btn = $("button[type=submit]", f);
    if (!f.email.value.trim() || !f.password.value) { err.textContent = "Enter your email and password."; err.hidden = false; return; }
    if (Date.now() < lockedUntil) { err.textContent = "Too many tries. Wait a minute and try again."; err.hidden = false; return; }
    btn.disabled = true; err.hidden = true;
    var r = await sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value });
    if (r.error) {
      fails++;
      if (fails >= 5) { lockedUntil = Date.now() + 60000; fails = 0; }
      err.textContent = /invalid|credentials/i.test(r.error.message) ? "Wrong email or password." : errText(r.error);
      err.hidden = false; btn.disabled = false;
      return;
    }
    await startSession(r.data.session);
  });
}

function chanHtml(opts, sel, info) {
  info = info || {};
  function one(v, title, sub, ready) {
    return '<label class="chan' + (ready ? "" : " off") + '"><input type="radio" name="chan" value="' + v + '"' + (sel === v ? " checked" : "") + (ready ? "" : " disabled") + '><span><b>' + title + "</b><small>" +
      (ready ? sub : "Not set up yet") + "</small></span></label>";
  }
  return '<div class="chans" role="radiogroup" aria-label="How should we send the code?">' +
    one("sms", "Text message (SMS)", info.phone ? "to " + esc(info.phone) : "to your mobile number", opts.smsReady) +
    one("email", "Email (Gmail)", info.email ? "to " + esc(info.email) : "to your email address", opts.emailReady) + "</div>";
}
function firstChan(opts) { return opts.smsReady ? "sms" : opts.emailReady ? "email" : ""; }
function chanName(c) { return c === "sms" ? "text message" : "email"; }

function renderForgot() {
  var sent = false, email = "", chan = "", opts = null, wait = 0, tick = null;
  function draw(err) {
    if (!opts) {
      authPage("Forgot password", "CITY RESIDENCES CONDOMINIUM CORP.", '<p style="text-align:center;color:var(--muted)">Loading…</p>');
      callFn("reset-password", { action: "options" }).then(function (r) { opts = r; chan = firstChan(r); draw(); }, function () { opts = { smsReady: true, emailReady: true }; chan = "sms"; draw(); });
      return;
    }
    authPage("Forgot password", "CITY RESIDENCES CONDOMINIUM CORP.",
      '<p style="font-size:13px;color:var(--muted);line-height:1.55;margin:0;text-align:center">' +
      (sent ? "If that email belongs to an account, we sent a code by " + chanName(chan) + ". The code expires in 10 minutes."
        : "Choose how to get a code. It is sent to the email or mobile number on file for your account, so nobody else can take it over.") + "</p>" +
      authErr("fErr", err) +
      fieldHtml("Email of your account", "email", "email", 'value="' + esc(email) + '"' + (sent ? " readonly" : "")) +
      (sent ? fieldHtml("6-digit code (" + chanName(chan) + ")", "code", "text", 'inputmode="numeric" maxlength="6" autocomplete="one-time-code"') +
        pwField("New password", "pw", "new-password") + rulesHtml() + pwField("Confirm new password", "pw2", "new-password") +
        '<button class="btn primary" type="submit">Change password</button><button class="btn" type="button" id="fResend"></button>' +
        '<button class="btn" type="button" id="fOther">Send it another way</button>'
        : chanHtml(opts, chan) + (firstChan(opts) ? "" : '<div class="formerr">Sending codes is not set up yet. Please contact the administration office.</div>') +
          '<button class="btn primary" type="submit"' + (firstChan(opts) ? "" : " disabled") + '>Send the code</button>') +
      '<p style="font-size:12px;color:var(--muted);text-align:center;margin:4px 0 0">No code arrived, or your mobile number changed? Contact the administration office.</p>' +
      '<div class="' + AUTH.links + '"><button type="button" class="linklike" id="fBack">&larr; Back to sign in</button></div>');
    bindPwToggles($("#authForm"));
    if (sent) bindRules($("#authForm [name=pw]"), $("#authForm [data-rules]"));
    $("#fBack").addEventListener("click", function () { clearInterval(tick); renderLogin(); });
    var other = $("#fOther");
    if (other) other.addEventListener("click", function () { sent = false; draw(); });
    var rs = $("#fResend");
    if (rs) {
      var upd = function () { rs.disabled = wait > 0; rs.textContent = wait > 0 ? "Send a new code in " + wait + " s" : "Send a new code"; };
      upd();
      rs.addEventListener("click", async function () {
        try { await callFn("reset-password", { action: "request", email: email, channel: chan }); wait = 60; upd(); toast("New code sent."); }
        catch (ex) { toast(errText(ex)); }
      });
      clearInterval(tick);
      tick = setInterval(function () { if (!document.body.contains(rs)) return clearInterval(tick); if (wait > 0) wait--; upd(); }, 1000);
    }
    $("#authForm").addEventListener("submit", async function (e) {
      e.preventDefault();
      var f = e.target, errEl = $("#fErr"), btn = $("button[type=submit]", f);
      btn.disabled = true; errEl.hidden = true;
      try {
        if (!sent) {
          email = f.email.value.trim().toLowerCase();
          var pick = f.querySelector("input[name=chan]:checked");
          if (!email) throw new Error("Enter your email.");
          if (!pick) throw new Error("Choose how to get the code.");
          chan = pick.value;
          await callFn("reset-password", { action: "request", email: email, channel: chan });
          sent = true; wait = 60; draw();
          return;
        }
        var bad = pwProblem(f.pw.value);
        if (bad) throw new Error(bad);
        if (f.pw.value !== f.pw2.value) throw new Error("The two passwords don't match.");
        await callFn("reset-password", { action: "confirm", email: email, channel: chan, code: f.code.value.trim(), newPassword: f.pw.value });
        clearInterval(tick);
        renderLogin();
        toast("Password changed. Sign in with your new password.");
      } catch (ex) { errEl.textContent = errText(ex); errEl.hidden = false; btn.disabled = false; }
    });
  }
  draw();
}

function renderNewPassword() {
  authPage("Choose your password", "CITY RESIDENCES CONDOMINIUM CORP.",
    '<p style="font-size:13px;color:var(--muted);line-height:1.55;margin:0;text-align:center">The administrator gave you a temporary password. Set your own to continue.</p>' +
    authErr("npErr") + pwField("New password", "pw", "new-password") + rulesHtml() + pwField("Confirm new password", "pw2", "new-password") +
    '<button class="btn primary" type="submit">Save and continue</button><button class="btn" type="button" id="npOut">Sign out</button>');
  bindPwToggles($("#authForm"));
  bindRules($("#authForm [name=pw]"), $("#authForm [data-rules]"));
  $("#npOut").addEventListener("click", signOut);
  $("#authForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var f = e.target, err = $("#npErr"), btn = $("button[type=submit]", f);
    var bad = pwProblem(f.pw.value);
    if (bad) { err.textContent = bad; err.hidden = false; return; }
    if (f.pw.value !== f.pw2.value) { err.textContent = "The two passwords don't match."; err.hidden = false; return; }
    btn.disabled = true; err.hidden = true;
    try {
      var u = await sb.auth.updateUser({ password: f.pw.value });
      if (u.error) throw u.error;
      var p = await sb.from("profiles").update({ must_change_password: false }).eq("id", DB.user.id);
      if (p.error) throw p.error;
      DB.profile.must_change_password = false;
      await boot();
    } catch (ex) { err.textContent = errText(ex); err.hidden = false; btn.disabled = false; }
  });
}

function renderVerify() {
  var sent = false, wait = 0, tick = null, opts = null, chan = "", info = {};
  function draw(err) {
    if (!opts) {
      authPage("Verify your account", "CITY RESIDENCES CONDOMINIUM CORP.", '<p style="text-align:center;color:var(--muted)">Loading…</p>');
      callFn("verify-contact", { action: "options" }).then(function (r) {
        if (r.verified) { DB.profile.contact_verified_at = new Date().toISOString(); return boot(); }
        opts = r; info = { email: r.email, phone: r.phone }; chan = firstChan(r); draw();
      }, function (ex) { opts = { smsReady: false, emailReady: false }; draw(errText(ex)); });
      return;
    }
    authPage("Verify your account", "CITY RESIDENCES CONDOMINIUM CORP.",
      '<p style="font-size:13px;color:var(--muted);line-height:1.55;margin:0;text-align:center">' +
      (sent ? "We sent a code by " + chanName(chan) + " to " + esc(chan === "sms" ? info.phone : info.email) + ". Enter it below. It expires in 10 minutes."
        : "For your security, confirm your account. Choose how you want to get your code.") + "</p>" +
      authErr("vErr", err) +
      (sent ? fieldHtml("6-digit code", "code", "text", 'inputmode="numeric" maxlength="6" autocomplete="one-time-code"') +
        '<button class="btn primary" type="submit">Verify</button><button class="btn" type="button" id="vResend"></button><button class="btn" type="button" id="vOther">Send it another way</button>'
        : chanHtml(opts, chan, info) + (firstChan(opts) ? "" : '<div class="formerr">Sending codes is not set up yet. Please tell the administrator.</div>') +
          '<button class="btn primary" type="submit"' + (firstChan(opts) ? "" : " disabled") + '>Send the code</button>') +
      '<button class="btn" type="button" id="vOut">Sign out</button>');
    $("#vOut").addEventListener("click", signOut);
    var other = $("#vOther");
    if (other) other.addEventListener("click", function () { sent = false; draw(); });
    var rs = $("#vResend");
    if (rs) {
      var upd = function () { rs.disabled = wait > 0; rs.textContent = wait > 0 ? "Send a new code in " + wait + " s" : "Send a new code"; };
      upd();
      rs.addEventListener("click", function () { send().catch(function (ex) { toast(errText(ex)); }); });
      clearInterval(tick);
      tick = setInterval(function () { if (!document.body.contains(rs)) return clearInterval(tick); if (wait > 0) wait--; upd(); }, 1000);
    }
    $("#authForm").addEventListener("submit", async function (e) {
      e.preventDefault();
      var f = e.target, errEl = $("#vErr"), btn = $("button[type=submit]", f);
      btn.disabled = true; errEl.hidden = true;
      try {
        if (!sent) {
          var pick = f.querySelector("input[name=chan]:checked");
          if (!pick) throw new Error("Choose how to get the code.");
          chan = pick.value;
          return await send();
        }
        var r = await callFn("verify-contact", { action: "check", channel: chan, code: f.code.value.trim() });
        if (r.verified) { DB.profile.contact_verified_at = new Date().toISOString(); clearInterval(tick); await boot(); }
      } catch (ex) { errEl.textContent = errText(ex); errEl.hidden = false; btn.disabled = false; }
    });
  }
  async function send() {
    var r = await callFn("verify-contact", { action: "send", channel: chan });
    if (r.verified) { DB.profile.contact_verified_at = new Date().toISOString(); return boot(); }
    sent = true; wait = r.cooldown || 60;
    if (r.email) info.email = r.email;
    if (r.phone) info.phone = r.phone;
    draw();
  }
  draw();
}

/* ==========================================================================
   Session
   ========================================================================== */
async function signOut(everywhere) {
  stopLive();
  await sb.auth.signOut(everywhere === true ? { scope: "global" } : undefined);
  DB.user = DB.profile = null; DB.rows = {}; DB.accounts = []; DB.sig = "";
  rhLeave();
  renderLogin();
}
async function startSession(session) {
  DB.user = session.user;
  var p = await sb.from("profiles").select("*").eq("id", DB.user.id).maybeSingle();
  if (p.error || !p.data) {
    await sb.auth.signOut();
    return renderLogin("This account is not set up yet. Please contact the administrator.");
  }
  if (p.data.suspended) {
    await sb.auth.signOut();
    return renderLogin("This account is suspended. Please contact the administrator.");
  }
  DB.profile = p.data;
  // each page is for one kind of account; send the other kind to its own page
  if (DB.profile.role !== ROLE) {
    location.replace(DB.profile.role === "admin" ? "admin.html" : "resident.html");
    return;
  }
  if (DB.profile.must_change_password) return renderNewPassword();
  await boot();
}
async function boot() {
  if (!isAdmin() && !DB.profile.contact_verified_at) return renderVerify();
  $("#app").innerHTML = '<div class="' + AUTH.wrap + '"><div class="' + AUTH.card + '" style="align-items:center"><img src="logo.jpg" alt=""><div class="name">Loading your data…</div></div></div>';
  try {
    await loadAll();
    await loadAccounts();
  } catch (e) {
    $("#app").innerHTML = '<div class="' + AUTH.wrap + '"><div class="' + AUTH.card + '" style="align-items:center"><img src="logo.jpg" alt=""><div class="name">Could not load</div><p style="color:var(--muted);text-align:center">' +
      esc(errText(e)) + '</p><button class="btn primary" id="retry">Try again</button><button class="btn" id="out" style="margin-top:8px">Sign out</button></div></div>';
    $("#retry").onclick = boot; $("#out").onclick = function () { signOut(); };
    return;
  }
  rhEnter();
  startLive();
}

/* ---------- live updates ---------- */
var chan = null, timer = null, reloadT = null, pendingDraw = false;
function startLive() {
  stopLive();
  try {
    chan = sb.channel("records-live-" + ROLE).on("postgres_changes", { event: "*", schema: "public", table: "records" }, scheduleReload).subscribe();
  } catch (e) { /* the timer still refreshes */ }
  timer = setInterval(reload, 45000);
}
function stopLive() {
  if (chan) { sb.removeChannel(chan); chan = null; }
  if (timer) { clearInterval(timer); timer = null; }
}
function scheduleReload() { clearTimeout(reloadT); reloadT = setTimeout(reload, 500); }
async function reload() {
  if (!DB.user || DB.busy) return;
  try {
    var changed = await loadAll();
    if (isAdmin()) { await loadAccounts(); }
    if (changed) rhRefresh(false);
  } catch (e) { /* try again next time */ }
}
/* redraw the page unless the person is typing or has a popup open */
function rhRefresh(force) {
  if (!DB.user || !DB.profile) return;
  var a = document.activeElement;
  var typing = a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.id !== "qBox" && a.closest && a.closest("#app");
  if (!force && (document.getElementById("modal") || typing)) { pendingDraw = true; return; }
  if (force && document.getElementById("modal") && !document.getElementById("rhForm")) { /* info popup stays */ }
  pendingDraw = false;
  window.render();
}
document.addEventListener("focusout", function () { if (pendingDraw) setTimeout(function () { if (pendingDraw) rhRefresh(false); }, 150); });

function rhInit() {
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });
  (async function () {
    try {
      var s = await sb.auth.getSession();
      if (s.data && s.data.session) await startSession(s.data.session);
      else renderLogin();
    } catch (e) { renderLogin(); }
    sb.auth.onAuthStateChange(function (ev) {
      if (ev === "SIGNED_OUT" && DB.user) { stopLive(); DB.user = DB.profile = null; rhLeave(); renderLogin(); }
    });
  })();
}
