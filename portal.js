/* ResidentHub web portal — City Residences Condominium
   Real system: Supabase sign-in, no sample data. Reads and writes the same `records`
   rows as the ResidentHub app, so the website and the app always show the same thing. */
(function () {
  "use strict";

  var cfg = window.RH_SUPABASE || {};
  var sb = window.supabase.createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  });

  // ------------------------------------------------------------------ constants
  var PAY_OFFICE = "Cash or check at the office";
  var DEFAULT_PAY = [
    { name: PAY_OFFICE, details: "Pay at the administration office.", enabled: true },
    { name: "Bank transfer", details: "Account name: (add account name)\nBank: (add bank name)\nAccount no.: (add account number)", enabled: false },
    { name: "GCash", details: "Account name: (add name)\nNumber: (add GCash number)", enabled: false },
    { name: "Maya", details: "Account name: (add name)\nNumber: (add Maya number)", enabled: false }
  ];
  var FACILITIES = [["Swimming Pool", "6:00 AM – 8:00 PM"], ["Function Hall", "8:00 AM – 10:00 PM"]];
  var SLOT_TIMES = ["8–10 AM", "10–12 NN", "12–2 PM", "2–4 PM", "4–6 PM", "6–8 PM", "8–10 PM"];
  var EXP_CATS = ["Security services", "Common-area utilities", "Janitorial and maintenance", "Repairs and improvements",
    "Supplies and equipment", "Insurance", "Administration and reserve fund", "Other"];
  var EXP_AREAS = ["Whole building", "Lobby and common areas", "Swimming pool", "Function hall", "Elevators", "Parking",
    "Grounds and garden", "Offices and security"];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var LONG_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // ------------------------------------------------------------------ small helpers
  var $ = function (s, el) { return (el || document).querySelector(s); };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function peso(n) {
    return "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  function shortDate(d) { return MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear(); }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function dayKey(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parseShort(s) {
    var m = /^([A-Za-z]{3})[A-Za-z]*\.?\s+(\d{1,2}),?\s+(\d{4})$/.exec(String(s || "").trim());
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
  function toast(msg, bad) {
    var t = document.createElement("div");
    t.className = "toast" + (bad ? " bad" : "");
    t.textContent = msg;
    $("#toasts").appendChild(t);
    setTimeout(function () { t.remove(); }, bad ? 6000 : 3200);
  }
  function errText(e) {
    var m = (e && (e.message || e.error_description)) || String(e || "");
    if (e && e.code === "23505") return "That was already taken by someone else.";
    if (/row-level security|permission denied/i.test(m)) return "You are not allowed to do that.";
    if (/Failed to fetch|NetworkError|network/i.test(m)) return "No internet connection. Try again.";
    return m || "Something went wrong.";
  }
  function naturalCompare(a, b) {
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
  }

  // ------------------------------------------------------------------ state
  var S = {
    user: null,        // auth user
    profile: null,     // profiles row
    rows: {},          // kind -> Map(id -> {unit, value})
    accounts: [],      // admin: all profiles
    view: "",
    f: {},             // small UI filters
    sig: "",
    busy: false
  };
  var isAdmin = function () { return S.profile && S.profile.role === "admin"; };
  var myUnit = function () { return (S.profile && S.profile.unit) || ""; };

  function list(kind) {
    var m = S.rows[kind];
    if (!m) return [];
    var out = [];
    m.forEach(function (r, id) { out.push({ id: id, unit: r.unit, v: r.value || {} }); });
    return out;
  }
  function vals(kind) { return list(kind).map(function (r) { return r.v; }); }
  function newest(a) { return a.slice().sort(function (x, y) { return Number(y.id) - Number(x.id); }); }
  function setting(id) {
    var m = S.rows.setting;
    return (m && m.get(id) && m.get(id).value) || {};
  }

  // ------------------------------------------------------------------ database
  async function loadAll() {
    var out = {};
    var from = 0;
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
    var changed = sig !== S.sig;
    S.sig = sig;
    S.rows = out;
    return changed;
  }
  async function loadAccounts() {
    if (!isAdmin()) return;
    var r = await sb.from("profiles").select("*").order("name");
    if (r.error) throw r.error;
    S.accounts = r.data || [];
  }
  async function put(kind, id, unit, value) {
    id = String(id);
    value = clean(value);
    var known = S.rows[kind] && S.rows[kind].has(id);
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
    if (!S.rows[kind]) S.rows[kind] = new Map();
    S.rows[kind].set(id, { unit: unit, value: value });
  }
  async function del(kind, id) {
    id = String(id);
    var res = await sb.from("records").delete().eq("kind", kind).eq("id", id);
    if (res.error) throw res.error;
    if (S.rows[kind]) S.rows[kind].delete(id);
  }
  function logAct(title, area) {
    var at = nextId();
    put("activity", at, "__admin", { title: title, area: area, at: at }).catch(function () {});
  }

  // ------------------------------------------------------------------ derived data
  function balanceFor(unit) {
    return vals("due").filter(function (d) { return d.unit === unit && !d.paid; })
      .reduce(function (s, d) { return s + Number(d.amount || 0); }, 0);
  }
  function overdue(d) {
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
    var place = FACILITIES[f][0];
    return vals("booking").some(function (x) {
      return x.day === today && Number(x.slot) === i && x.place === place && (x.status === "Pending" || x.status === "Approved");
    });
  }
  function unitRec(unit) { var r = S.rows.unit && S.rows.unit.get(unit); return r ? r.value : null; }
  function pill(text, tone) { return '<span class="pill ' + (tone || "") + '">' + esc(text) + "</span>"; }

  // ------------------------------------------------------------------ modal / forms
  function closeModal() { var v = $(".veil"); if (v) v.remove(); }
  function openForm(o) {
    closeModal();
    var html = '<div class="veil"><form class="modal" autocomplete="off"><h2>' + esc(o.title) + "</h2>";
    if (o.intro) html += '<p class="note">' + o.intro + "</p>";
    (o.fields || []).forEach(function (f) {
      var val = f.value == null ? "" : f.value;
      html += '<label class="f"><span>' + esc(f.label) + "</span>";
      if (f.type === "select") {
        html += '<select name="' + f.name + '">' + f.options.map(function (op) {
          var v = Array.isArray(op) ? op[0] : op, l = Array.isArray(op) ? op[1] : op;
          return '<option value="' + esc(v) + '"' + (String(v) === String(val) ? " selected" : "") + ">" + esc(l) + "</option>";
        }).join("") + "</select>";
      } else if (f.type === "textarea") {
        html += '<textarea name="' + f.name + '" placeholder="' + esc(f.placeholder || "") + '">' + esc(val) + "</textarea>";
      } else {
        html += '<input name="' + f.name + '" type="' + (f.type || "text") + '" value="' + esc(val) + '" placeholder="' +
          esc(f.placeholder || "") + '"' + (f.readonly ? " readonly" : "") + (f.step ? ' step="' + f.step + '"' : "") + ">";
      }
      html += "</label>";
    });
    html += '<div class="err" hidden></div><div class="btns"><button type="button" class="btn ghost" data-close>Cancel</button>' +
      '<button class="btn" type="submit">' + esc(o.submit || "Save") + "</button></div></form></div>";
    var wrap = document.createElement("div");
    wrap.innerHTML = html;
    var veil = wrap.firstChild;
    document.body.appendChild(veil);
    var form = $("form", veil);
    var first = $("input:not([readonly]),select,textarea", form);
    if (first) first.focus();
    veil.addEventListener("mousedown", function (e) { if (e.target === veil) closeModal(); });
    $("[data-close]", form).addEventListener("click", closeModal);
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = typeof v === "string" ? v.trim() : v; });
      var btn = $("button[type=submit]", form), err = $(".err", form);
      btn.disabled = true; err.hidden = true;
      try {
        var r = await o.onSubmit(data);
        if (r && r.error) throw new Error(r.error);
        if (!r || !r.keepOpen) closeModal();
      } catch (ex) {
        err.textContent = errText(ex); err.hidden = false; btn.disabled = false;
      }
    });
  }
  function openInfo(title, bodyHtml) {
    closeModal();
    var wrap = document.createElement("div");
    wrap.innerHTML = '<div class="veil"><div class="modal"><h2>' + esc(title) + "</h2>" + bodyHtml +
      '<div class="btns"><button class="btn" data-close>Done</button></div></div></div>';
    var veil = wrap.firstChild;
    document.body.appendChild(veil);
    $("[data-close]", veil).addEventListener("click", closeModal);
  }
  function confirmBox(title, text, label, fn, danger) {
    openForm({
      title: title, intro: esc(text), fields: [], submit: label,
      onSubmit: async function () { return await fn(); }
    });
    if (danger) { var b = $(".veil button[type=submit]"); if (b) b.classList.add("bad"); }
  }

  // ------------------------------------------------------------------ edge function
  async function callUsers(body) {
    var r = await sb.functions.invoke("manage-users", { body: body });
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

  // ------------------------------------------------------------------ login screens
  function renderLogin(msg) {
    $("#root").innerHTML =
      '<div class="login"><form class="login-card" id="loginForm">' +
      '<div class="brand"><img src="logo.jpg" alt=""><span><b>ResidentHub</b><small>CITY RESIDENCES</small></span></div>' +
      "<h1>Sign in</h1><p class=\"sub\">Use the email and password from the administration office.</p>" +
      '<div class="err" id="loginErr"' + (msg ? "" : " hidden") + ">" + esc(msg || "") + "</div>" +
      '<label class="f"><span>Email</span><input name="email" type="email" autocomplete="username" required></label>' +
      '<label class="f"><span>Password</span><input name="password" type="password" autocomplete="current-password" required></label>' +
      '<button class="btn full" type="submit">Sign in</button>' +
      '<p class="sub" style="margin-top:14px;font-size:14px">Forgot your password? Ask the administrator to reset it.</p>' +
      '<a class="back" href="index.html">← Back to the website</a></form></div>';
    var fails = 0, lockedUntil = 0;
    $("#loginForm").addEventListener("submit", async function (e) {
      e.preventDefault();
      var f = e.target, err = $("#loginErr"), btn = $("button", f);
      if (Date.now() < lockedUntil) {
        err.textContent = "Too many tries. Wait a minute and try again."; err.hidden = false; return;
      }
      btn.disabled = true; err.hidden = true;
      var r = await sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value });
      if (r.error) {
        fails++;
        if (fails >= 5) { lockedUntil = Date.now() + 60000; fails = 0; }
        err.textContent = /invalid|credentials/i.test(r.error.message) ? "Wrong email or password." : errText(r.error);
        err.hidden = false; btn.disabled = false;
        return;
      }
      await start(r.data.session);
    });
  }
  function renderNewPassword() {
    $("#root").innerHTML =
      '<div class="login"><form class="login-card" id="npForm">' +
      '<div class="brand"><img src="logo.jpg" alt=""><span><b>ResidentHub</b><small>CITY RESIDENCES</small></span></div>' +
      "<h1>Choose your password</h1><p class=\"sub\">The administrator gave you a temporary password. Set your own to continue (at least 8 characters).</p>" +
      '<div class="err" id="npErr" hidden></div>' +
      '<label class="f"><span>New password</span><input name="pw" type="password" autocomplete="new-password" minlength="8" required></label>' +
      '<label class="f"><span>Confirm new password</span><input name="pw2" type="password" autocomplete="new-password" minlength="8" required></label>' +
      '<button class="btn full" type="submit">Save and continue</button>' +
      '<button class="btn ghost full" type="button" id="npOut" style="margin-top:10px">Sign out</button></form></div>';
    $("#npOut").addEventListener("click", signOut);
    $("#npForm").addEventListener("submit", async function (e) {
      e.preventDefault();
      var f = e.target, err = $("#npErr"), btn = $("button", f);
      if (f.pw.value.length < 8) { err.textContent = "Password must be at least 8 characters."; err.hidden = false; return; }
      if (f.pw.value !== f.pw2.value) { err.textContent = "The two passwords don't match."; err.hidden = false; return; }
      btn.disabled = true; err.hidden = true;
      try {
        var u = await sb.auth.updateUser({ password: f.pw.value });
        if (u.error) throw u.error;
        var p = await sb.from("profiles").update({ must_change_password: false }).eq("id", S.user.id);
        if (p.error) throw p.error;
        S.profile.must_change_password = false;
        await boot();
      } catch (ex) { err.textContent = errText(ex); err.hidden = false; btn.disabled = false; }
    });
  }

  // Confirm the email address and mobile number with two 6-digit codes.
  async function callVerify(body) {
    var r = await sb.functions.invoke("verify-contact", { body: body });
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
  function renderVerify() {
    var sent = false, wait = 0, tick = null;
    function draw(info, err) {
      $("#root").innerHTML =
        '<div class="login"><form class="login-card" id="vForm">' +
        '<div class="brand"><img src="logo.jpg" alt=""><span><b>ResidentHub</b><small>CITY RESIDENCES</small></span></div>' +
        "<h1>Verify your account</h1><p class=\"sub\">" +
        (sent ? "We sent a code to " + esc(info.email) + " and a text message to " + esc(info.phone) + ". Enter both codes. They expire in 10 minutes."
          : "For your security, confirm your email address and mobile number. We will send one code by email and one by text message.") + "</p>" +
        '<div class="err" id="vErr"' + (err ? "" : " hidden") + ">" + esc(err || "") + "</div>" +
        (sent ? '<label class="f"><span>Code from your email</span><input name="ec" inputmode="numeric" maxlength="6" autocomplete="one-time-code" required></label>' +
          '<label class="f"><span>Code from the text message</span><input name="sc" inputmode="numeric" maxlength="6" required></label>' +
          '<button class="btn full" type="submit">Verify</button>' +
          '<button class="btn ghost full" type="button" id="vResend" style="margin-top:10px"></button>'
          : '<button class="btn full" type="submit">Send the codes</button>') +
        '<button class="btn ghost full" type="button" id="vOut" style="margin-top:10px">Sign out</button></form></div>';
      $("#vOut").addEventListener("click", signOut);
      var rs = $("#vResend");
      if (rs) {
        var upd = function () { rs.disabled = wait > 0; rs.textContent = wait > 0 ? "Send new codes in " + wait + " s" : "Send new codes"; };
        upd();
        rs.addEventListener("click", function () { send(); });
        clearInterval(tick);
        tick = setInterval(function () { if (wait > 0) wait--; if (!document.body.contains(rs)) return clearInterval(tick); upd(); }, 1000);
      }
      $("#vForm").addEventListener("submit", async function (e) {
        e.preventDefault();
        var f = e.target, errEl = $("#vErr"), btn = $("button[type=submit]", f);
        btn.disabled = true; errEl.hidden = true;
        try {
          if (!sent) return await send();
          var r = await callVerify({ action: "check", emailCode: f.ec.value.trim(), smsCode: f.sc.value.trim() });
          if (r.verified) {
            S.profile.contact_verified_at = new Date().toISOString();
            await boot();
          }
        } catch (ex) { errEl.textContent = errText(ex); errEl.hidden = false; btn.disabled = false; }
      });
    }
    async function send() {
      var r = await callVerify({ action: "send" });
      if (r.verified) { S.profile.contact_verified_at = new Date().toISOString(); return boot(); }
      sent = true; wait = r.cooldown || 60;
      draw({ email: r.email, phone: r.phone });
    }
    draw();
  }

  // ------------------------------------------------------------------ session
  async function signOut() {
    stopLive();
    await sb.auth.signOut();
    S.user = S.profile = null; S.rows = {}; S.accounts = []; S.sig = ""; S.view = "";
    renderLogin();
  }
  async function start(session) {
    S.user = session.user;
    var p = await sb.from("profiles").select("*").eq("id", S.user.id).maybeSingle();
    if (p.error || !p.data) {
      await sb.auth.signOut();
      return renderLogin("This account is not set up yet. Please contact the administrator.");
    }
    if (p.data.suspended) {
      await sb.auth.signOut();
      return renderLogin("This account is suspended. Please contact the administrator.");
    }
    S.profile = p.data;
    if (S.profile.must_change_password) return renderNewPassword();
    await boot();
  }
  async function boot() {
    if (!isAdmin() && !S.profile.contact_verified_at) return renderVerify();
    $("#root").innerHTML = '<div class="boot"><img src="logo.jpg" alt=""><p>Loading your data…</p></div>';
    try {
      await loadAll();
      await loadAccounts();
    } catch (e) {
      $("#root").innerHTML = '<div class="boot"><p>' + esc(errText(e)) + '</p><button class="btn" id="retry">Try again</button> ' +
        '<button class="btn ghost" id="out">Sign out</button></div>';
      $("#retry").onclick = boot; $("#out").onclick = signOut;
      return;
    }
    S.view = isAdmin() ? "overview" : "home";
    render();
    startLive();
  }

  // ------------------------------------------------------------------ live updates
  var chan = null, timer = null, reloadT = null;
  function startLive() {
    stopLive();
    try {
      chan = sb.channel("records-live").on("postgres_changes", { event: "*", schema: "public", table: "records" }, scheduleReload).subscribe();
    } catch (e) { /* the timer still refreshes */ }
    timer = setInterval(reload, 45000);
  }
  function stopLive() {
    if (chan) { sb.removeChannel(chan); chan = null; }
    if (timer) { clearInterval(timer); timer = null; }
  }
  function scheduleReload() { clearTimeout(reloadT); reloadT = setTimeout(reload, 500); }
  async function reload() {
    if (!S.user || S.busy) return;
    try {
      var changed = await loadAll();
      if (isAdmin() && S.view === "accounts") { await loadAccounts(); changed = true; }
      if (changed && !$(".veil")) render();
    } catch (e) { /* try again next time */ }
  }

  // ------------------------------------------------------------------ layout
  var ADMIN_NAV = [
    ["overview", "Overview"], ["units", "Units"], ["accounts", "Accounts"], ["finance", "Finance"], ["bookings", "Bookings"],
    ["news", "Announcements"], ["grievances", "Grievances"], ["expenses", "Expenses"]
  ];
  var RES_NAV = [["home", "Home"], ["dues", "Dues & payment"], ["book", "Book a facility"], ["grievances", "Grievances"], ["settings", "Settings"]];

  function badgeFor(id) {
    if (!isAdmin()) return 0;
    if (id === "bookings") return vals("booking").filter(function (b) { return b.status === "Pending"; }).length;
    if (id === "finance") return vals("proof").filter(function (p) { return p.status === "Pending"; }).length;
    if (id === "grievances") return vals("grievance").filter(function (g) { return !(g.stage >= 2); }).length;
    return 0;
  }
  function render() {
    var nav = isAdmin() ? ADMIN_NAV : RES_NAV;
    var view = VIEWS[S.view] || VIEWS[nav[0][0]];
    var body = view();
    var scroll = window.scrollY;
    $("#root").innerHTML =
      '<div class="shell"><aside class="side"><div class="brand"><span style="display:flex;gap:10px;align-items:center"><img src="logo.jpg" alt="">' +
      "<span><b>ResidentHub</b><small>CITY RESIDENCES</small></span></span></div>" +
      '<nav class="nav">' + nav.map(function (n) {
        var b = badgeFor(n[0]);
        return '<button data-nav="' + n[0] + '" class="' + (S.view === n[0] ? "on" : "") + '">' + esc(n[1]) +
          (b ? '<span class="badge">' + b + "</span>" : "") + "</button>";
      }).join("") + "</nav>" +
      '<div class="who"><b>' + esc(S.profile.name || S.profile.email) + "</b><small>" +
      (isAdmin() ? "Administrator" : esc(myUnit())) + '</small><button class="btn ghost sm" data-act="signout" style="color:#EAF0F7;border-color:rgba(255,255,255,.3)">Sign out</button></div></aside>' +
      '<main class="main">' + body + "</main></div>";
    window.scrollTo(0, scroll);
  }
  function head(title, sub, actions) {
    return '<div class="top"><div><h1>' + esc(title) + "</h1>" + (sub ? "<p>" + esc(sub) + "</p>" : "") +
      '</div><div class="actions">' + (actions || "") + "</div></div>";
  }
  function table(cols, rows, empty) {
    if (!rows.length) return '<p class="empty">' + esc(empty) + "</p>";
    return '<div class="tablewrap"><table><thead><tr>' + cols.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") +
      "</tr></thead><tbody>" + rows.join("") + "</tbody></table></div>";
  }
  function btn(act, id, label, cls) {
    return '<button class="btn sm ' + (cls || "ghost") + '" data-act="' + act + '" data-id="' + esc(id) + '">' + esc(label) + "</button>";
  }

  // ------------------------------------------------------------------ admin views
  var VIEWS = {};

  VIEWS.overview = function () {
    var units = list("unit").length;
    var residents = S.accounts.filter(function (a) { return a.role === "resident" && !a.suspended; }).length;
    var unpaid = vals("due").filter(function (d) { return !d.paid; });
    var owed = unpaid.reduce(function (s, d) { return s + Number(d.amount || 0); }, 0);
    var act = newest(list("activity")).slice(0, 8);
    var empty = !units && !list("announcement").length;
    return head("Overview", "City Residences Condominium Corporation") +
      (empty ? '<div class="note">Welcome. The system is empty — you decide what goes in. Start with <b>Units</b>, then create resident <b>Accounts</b>.</div>' : "") +
      '<div class="grid">' +
      stat("Units", units) + stat("Resident accounts", residents) + stat("Unpaid dues", peso(owed)) +
      stat("Bookings to review", vals("booking").filter(function (b) { return b.status === "Pending"; }).length) +
      stat("Payments to check", vals("proof").filter(function (p) { return p.status === "Pending"; }).length) +
      stat("Open grievances", vals("grievance").filter(function (g) { return !(g.stage >= 2); }).length) +
      "</div>" +
      '<div class="card"><h2>Recent activity</h2>' + (act.length ? '<div class="list">' + act.map(function (a) {
        return "<div><b>" + esc(a.v.title) + "</b><small>" + esc(a.v.area) + " · " + new Date(a.v.at).toLocaleString() + "</small></div>";
      }).join("") + "</div>" : '<p class="empty">Nothing yet.</p>') + "</div>";
  };
  function stat(label, value) { return '<div class="stat"><small>' + esc(label) + "</small><b>" + esc(value) + "</b></div>"; }

  VIEWS.units = function () {
    var rows = list("unit").sort(function (a, b) { return naturalCompare(a.id, b.id); }).map(function (r) {
      var u = r.v, bal = balanceFor(r.id);
      return "<tr><td><b>" + esc(r.id) + "</b></td><td>" + esc(u.name || "—") + "</td><td>" + esc(u.type || "Owner") + "</td><td>" +
        pill(u.status || "Occupied", (u.status === "Vacant") ? "warn" : "good") + "</td><td>" + esc(u.contact || "—") + "</td><td>" +
        (bal ? peso(bal) : "—") + '</td><td class="act">' + btn("unit-edit", r.id, "Edit") + btn("unit-del", r.id, "Remove") + "</td></tr>";
    });
    return head("Units", "Add each unit once, then create its resident account.", '<button class="btn" data-act="unit-add">Add unit</button>') +
      '<div class="card">' + table(["Unit", "Household", "Occupancy", "Status", "Contact", "Balance", ""], rows, "No units yet. Tap “Add unit”.") + "</div>";
  };

  VIEWS.accounts = function () {
    var res = S.accounts.filter(function (a) { return a.role === "resident"; });
    var rows = res.map(function (a) {
      return "<tr><td><b>" + esc(a.name) + "</b></td><td>" + esc(a.email) + "</td><td>" + esc(a.unit) + "</td><td>" + esc(a.phone || "—") + "</td><td>" +
        (a.suspended ? pill("Suspended", "bad") : !a.contact_verified_at ? pill("Not verified yet", "warn") : a.must_change_password ? pill("Not signed in yet", "warn") : pill("Active", "good")) +
        '</td><td class="act">' + btn("acc-reset", a.id, "Reset password") +
        btn("acc-susp", a.id, a.suspended ? "Reactivate" : "Suspend") + btn("acc-del", a.id, "Delete") + "</td></tr>";
    });
    return head("Resident accounts", "Only you can create accounts. A temporary password is shown once.",
      '<button class="btn" data-act="acc-add">Create account</button>') +
      '<div class="card">' + table(["Name", "Email", "Unit", "Mobile", "Status", ""], rows, "No resident accounts yet.") + "</div>";
  };

  VIEWS.finance = function () {
    var rate = setting("dues_rate").rate;
    var f = S.f.dues || "open";
    var dues = newest(list("due"));
    if (f === "open") dues = dues.filter(function (d) { return !d.v.paid; });
    var dRows = dues.map(function (r) {
      var d = r.v;
      return "<tr><td><b>" + esc(d.unit) + "</b></td><td>" + esc(d.note) + "</td><td>" + peso(d.amount) + "</td><td>" + esc(d.dueDate || "On receipt") + "</td><td>" +
        (d.paid ? pill("Paid", "good") : overdue(d) ? pill("Overdue", "bad") : pill("Open", "warn")) + '</td><td class="act">' +
        (d.paid ? "" : btn("due-pay", r.id, "Record payment", "gold")) + btn("due-del", r.id, "Delete") + "</td></tr>";
    });
    var proofs = newest(list("proof")).filter(function (p) { return p.v.status === "Pending"; });
    var pRows = proofs.map(function (r) {
      var p = r.v;
      return "<tr><td><b>" + esc(p.unit) + "</b></td><td>" + peso(p.amount) + "</td><td>" + esc(p.method) + "</td><td>" + esc(p.reference) + "</td><td>" + esc(p.date) +
        '</td><td class="act">' + btn("proof-ok", r.id, "Confirm", "gold") + btn("proof-no", r.id, "Reject") + "</td></tr>";
    });
    var pays = newest(list("payment")).slice(0, 30).map(function (r) {
      var p = r.v;
      return "<tr><td>" + esc(p.receiptNo) + "</td><td><b>" + esc(p.unit) + "</b></td><td>" + esc(p.forText) + "</td><td>" + esc(p.method) + "</td><td>" + esc(p.date) + "</td><td>" + peso(p.amount) + "</td></tr>";
    });
    var methods = payMethods().map(function (m) {
      return "<div><b>" + esc(m.name) + " " + pill(m.enabled ? "On" : "Off", m.enabled ? "good" : "") + "</b><p>" + esc(m.details) + "</p></div>";
    }).join("");
    return head("Finance", "Monthly dues: " + (rate ? peso(rate) + " per unit" : "not set yet"),
      '<button class="btn ghost" data-act="rate-set">Monthly amount</button><button class="btn ghost" data-act="pay-methods">Payment options</button>' +
      '<button class="btn ghost" data-act="charge-add">Add charge</button><button class="btn" data-act="bill">Bill monthly dues</button>') +
      (pRows.length ? '<div class="card"><h2>Payments to check</h2>' + table(["Unit", "Amount", "Method", "Reference", "Date", ""], pRows, "") + "</div>" : "") +
      '<div class="card"><h2>Charges <span class="seg" style="margin:0"><button data-act="dues-f" data-id="open" class="' + (f === "open" ? "on" : "") +
      '">Unpaid</button><button data-act="dues-f" data-id="all" class="' + (f === "all" ? "on" : "") + '">All</button></span></h2>' +
      table(["Unit", "For", "Amount", "Due", "Status", ""], dRows, "No charges. Use “Bill monthly dues” or “Add charge”.") + "</div>" +
      '<div class="card"><h2>Receipts</h2>' + table(["Receipt", "Unit", "For", "Method", "Date", "Amount"], pays, "No payments recorded yet.") + "</div>" +
      '<div class="card"><h2>How residents can pay</h2><div class="list">' + methods + "</div></div>";
  };

  VIEWS.bookings = function () {
    var rows = newest(list("booking")).map(function (r) {
      var b = r.v;
      return "<tr><td><b>" + esc(b.place) + "</b></td><td>" + esc(b.unit) + (b.who ? " · " + esc(b.who) : "") + "</td><td>" + esc(b.when) + "</td><td>" +
        pill(b.status, b.status === "Approved" ? "good" : b.status === "Denied" ? "bad" : "warn") + '</td><td class="act">' +
        (b.status === "Pending" ? btn("bk-ok", r.id, "Approve", "gold") + btn("bk-no", r.id, "Deny") : "") + "</td></tr>";
    });
    return head("Facility bookings", "Swimming Pool and Function Hall", '<button class="btn ghost" data-act="block-slots">Close slots today</button>') +
      '<div class="card">' + table(["Facility", "Unit", "When", "Status", ""], rows, "No booking requests yet.") + "</div>";
  };

  VIEWS.news = function () {
    var ann = newest(list("announcement")).map(function (r) {
      var a = r.v;
      return "<div><div class=\"row\"><b>" + esc(a.title) + (a.type && a.type !== "General" ? " " + pill(a.type, a.type === "Emergency" ? "bad" : "warn") : "") +
        "</b><span>" + btn("ann-del", r.id, "Delete") + "</span></div><small>" + esc(a.date) + "</small><p>" + esc(a.body) + "</p></div>";
    }).join("");
    var ev = newest(list("event")).map(function (r) {
      var e = r.v, going = list("rsvp").filter(function (x) { return Number(x.v.event) === Number(r.id); }).length;
      return "<div><div class=\"row\"><b>" + esc(e.title) + "</b><span>" + btn("ev-del", r.id, "Delete") + "</span></div><small>" + esc(e.date) + " · " + esc(e.place) +
        " · " + going + " going</small>" + (e.about ? "<p>" + esc(e.about) + "</p>" : "") + "</div>";
    }).join("");
    return head("Announcements & events", "", '<button class="btn ghost" data-act="ev-add">Add event</button><button class="btn" data-act="ann-add">Post announcement</button>') +
      '<div class="card"><h2>Announcements</h2>' + (ann ? '<div class="list">' + ann + "</div>" : '<p class="empty">None yet.</p>') + "</div>" +
      '<div class="card"><h2>Events</h2>' + (ev ? '<div class="list">' + ev + "</div>" : '<p class="empty">None yet.</p>') + "</div>";
  };

  function adminGrievances() {
    var names = ["Open", "In progress", "Resolved"], tones = ["bad", "warn", "good"];
    var rows = newest(list("grievance")).map(function (r) {
      var g = r.v, st = Math.min(2, Math.max(0, Number(g.stage) || 0));
      return "<div><div class=\"row\"><b>" + esc(g.title) + " " + pill(names[st], tones[st]) + "</b><span>" +
        (st < 2 ? btn("gr-next", r.id, st === 0 ? "Start working" : "Mark resolved", "gold") : "") + "</span></div><small>" + esc(g.by) + "</small><p>" + esc(g.body) + "</p></div>";
    }).join("");
    return head("Grievances", "Concerns sent by residents") + '<div class="card">' + (rows ? '<div class="list">' + rows + "</div>" : '<p class="empty">No grievances.</p>') + "</div>";
  }

  VIEWS.expenses = function () {
    var now = new Date();
    var ym = S.f.exp || (now.getFullYear() + "-" + pad(now.getMonth() + 1));
    var all = newest(list("expense"));
    var inMonth = all.filter(function (e) { return String(e.v.date || "").slice(0, 7) === ym; });
    var total = inMonth.reduce(function (s, e) { return s + Number(e.v.qty || 1) * Number(e.v.unitPrice || 0); }, 0);
    var rows = inMonth.sort(function (a, b) { return String(b.v.date).localeCompare(String(a.v.date)); }).map(function (r) {
      var e = r.v;
      return "<tr><td>" + esc(e.date) + "</td><td><b>" + esc(e.item) + "</b><br><small>" + esc(e.payee || "") + (e.receiptNo ? " · OR " + esc(e.receiptNo) : "") + "</small></td><td>" +
        esc(e.category) + "</td><td>" + esc(e.area || "") + "</td><td>" + peso(Number(e.qty || 1) * Number(e.unitPrice || 0)) + '</td><td class="act">' + btn("exp-del", r.id, "Delete") + "</td></tr>";
    });
    return head("Expenses", "Every purchase of the corporation", '<button class="btn" data-act="exp-add">Add purchase</button>') +
      '<div class="card"><h2>Month <input type="month" value="' + ym + '" data-exp-month style="width:auto;min-height:36px"> <span>' + peso(total) + "</span></h2>" +
      table(["Date", "Item", "Category", "For", "Total", ""], rows, "No purchases recorded for this month.") + "</div>";
  };

  // ------------------------------------------------------------------ resident views
  VIEWS.home = function () {
    var unit = myUnit(), u = unitRec(unit) || {};
    var bal = balanceFor(unit);
    var ann = newest(list("announcement")).filter(function (a) { return a.v.status !== "Draft"; }).slice(0, 5).map(function (r) {
      var a = r.v;
      return "<div><b>" + esc(a.title) + (a.type && a.type !== "General" ? " " + pill(a.type, a.type === "Emergency" ? "bad" : "warn") : "") + "</b><small>" + esc(a.date) + "</small><p>" + esc(a.body) + "</p></div>";
    }).join("");
    var ev = newest(list("event")).slice(0, 5).map(function (r) {
      var e = r.v, mine = S.rows.rsvp && S.rows.rsvp.has(unit + "|" + r.id);
      return '<div><div class="row"><b>' + esc(e.title) + "</b>" + btn("ev-go", r.id, mine ? "Going ✓" : "I'm going", mine ? "" : "gold") + "</div><small>" +
        esc(e.date) + " · " + esc(e.place) + "</small>" + (e.about ? "<p>" + esc(e.about) + "</p>" : "") + "</div>";
    }).join("");
    var mine = newest(list("booking")).filter(function (b) { return b.unit === unit && (b.v.status === "Pending" || b.v.status === "Approved"); })[0];
    return head("Hello, " + (S.profile.name || "resident").split(" ")[0], unit + (u.name && u.name !== "—" ? " · " + u.name : "")) +
      '<div class="grid">' + stat("Balance due", bal ? peso(bal) : "None") +
      stat("Next booking", mine ? mine.v.place : "None") + "</div>" +
      '<div class="card"><h2>Announcements</h2>' + (ann ? '<div class="list">' + ann + "</div>" : '<p class="empty">No announcements yet.</p>') + "</div>" +
      '<div class="card"><h2>Community events</h2>' + (ev ? '<div class="list">' + ev + "</div>" : '<p class="empty">No events yet.</p>') + "</div>";
  };

  VIEWS.dues = function () {
    var unit = myUnit();
    var dues = newest(list("due")).filter(function (d) { return d.unit === unit; });
    var rows = dues.map(function (r) {
      var d = r.v;
      return "<tr><td>" + esc(d.note) + "</td><td>" + peso(d.amount) + "</td><td>" + esc(d.dueDate || "On receipt") + "</td><td>" +
        (d.paid ? pill("Paid", "good") : overdue(d) ? pill("Overdue", "bad") : pill("Open", "warn")) + "</td></tr>";
    });
    var proofs = newest(list("proof")).filter(function (p) { return p.unit === unit; }).map(function (r) {
      var p = r.v;
      return "<tr><td>" + esc(p.date) + "</td><td>" + peso(p.amount) + "</td><td>" + esc(p.method) + "</td><td>" + esc(p.reference) + "</td><td>" +
        pill(p.status, p.status === "Confirmed" ? "good" : p.status === "Rejected" ? "bad" : "warn") + "</td><td>" + esc(p.receiptNo || "—") + "</td></tr>";
    });
    var methods = payMethods().filter(function (m) { return m.enabled; }).map(function (m) {
      return "<div><b>" + esc(m.name) + "</b><p>" + esc(m.details) + "</p></div>";
    }).join("");
    var bal = balanceFor(unit);
    return head("Dues & payment", "", bal ? '<button class="btn" data-act="send-proof">I have paid</button>' : "") +
      '<div class="grid">' + stat("Balance due", bal ? peso(bal) : "None") + "</div>" +
      '<div class="card"><h2>My charges</h2>' + table(["For", "Amount", "Due", "Status"], rows, "No charges yet.") + "</div>" +
      '<div class="card"><h2>How to pay</h2><div class="list">' + methods + "</div>" +
      '<p class="empty">After paying, tap “I have paid” and send the reference number. The office will confirm it and issue your receipt.</p></div>' +
      '<div class="card"><h2>My payments</h2>' + table(["Date", "Amount", "Method", "Reference", "Status", "Receipt"], proofs, "No payments sent yet.") + "</div>";
  };

  VIEWS.book = function () {
    var unit = myUnit();
    var f = S.f.fac || 0;
    var today = new Date();
    var slots = SLOT_TIMES.map(function (t, i) {
      var taken = slotBooked(f, i);
      return '<button data-act="book" data-id="' + i + '"' + (taken ? " disabled" : "") + ">" + esc(t) + (taken ? "<br><small>Taken</small>" : "") + "</button>";
    }).join("");
    var mine = newest(list("booking")).filter(function (b) { return b.unit === unit; }).map(function (r) {
      var b = r.v;
      return '<div><div class="row"><b>' + esc(b.place) + " " + pill(b.status, b.status === "Approved" ? "good" : b.status === "Denied" ? "bad" : "warn") +
        "</b>" + (b.status === "Pending" || b.status === "Approved" ? btn("bk-cancel", r.id, "Cancel") : "") + "</div><small>" + esc(b.when) + "</small></div>";
    }).join("");
    return head("Book a facility", "Today, " + shortDate(today)) +
      '<div class="card"><div class="seg">' + FACILITIES.map(function (x, i) {
        return '<button data-act="fac" data-id="' + i + '" class="' + (i === f ? "on" : "") + '">' + esc(x[0]) + "</button>";
      }).join("") + "</div><p class=\"empty\" style=\"padding-top:0\">Open " + esc(FACILITIES[f][1]) + ". Choose a time:</p><div class=\"slots\">" + slots + "</div>" +
      (f === 0 ? '<p class="empty">Free for residents. Guests pay ₱150 per visit at the gate.</p>' : "") + "</div>" +
      '<div class="card"><h2>My reservations</h2>' + (mine ? '<div class="list">' + mine + "</div>" : '<p class="empty">No reservations yet.</p>') + "</div>";
  };

  function residentGrievances() {
    var unit = myUnit();
    var names = ["Open", "In progress", "Resolved"], tones = ["bad", "warn", "good"];
    var rows = newest(list("grievance")).filter(function (g) { return g.unit === unit; }).map(function (r) {
      var g = r.v, st = Math.min(2, Math.max(0, Number(g.stage) || 0));
      return "<div><b>" + esc(g.title) + " " + pill(names[st], tones[st]) + "</b><p>" + esc(g.body) + "</p></div>";
    }).join("");
    return head("Grievances", "Tell the office about a concern", '<button class="btn" data-act="gr-add">New grievance</button>') +
      '<div class="card">' + (rows ? '<div class="list">' + rows + "</div>" : '<p class="empty">You have not sent any grievance.</p>') + "</div>";
  }
  VIEWS.grievances = function () { return isAdmin() ? adminGrievances() : residentGrievances(); };

  VIEWS.settings = function () {
    var p = S.profile;
    return head("Settings") +
      '<div class="card"><h2>My account</h2><div class="list"><div><b>' + esc(p.name) + "</b><small>" + esc(p.email) + " · " + esc(p.unit) + " · " + esc(p.phone || "no mobile number") +
      "</small></div></div><p class=\"empty\">To change your name, email or unit, ask the administrator.</p></div>" +
      '<div class="card"><h2>Password</h2><button class="btn" data-act="pw-change">Change password</button></div>';
  };

  // ------------------------------------------------------------------ actions
  var ACT = {};

  ACT.signout = function () { signOut(); };
  ACT["dues-f"] = function (el) { S.f.dues = el.dataset.id; render(); };
  ACT.fac = function (el) { S.f.fac = +el.dataset.id; render(); };

  // units
  function unitForm(edit) {
    var u = edit ? unitRec(edit) || {} : {};
    openForm({
      title: edit ? "Edit " + edit : "Add unit",
      fields: [
        { name: "unit", label: "Unit name", value: edit || "", placeholder: "e.g. Unit 12A", readonly: !!edit },
        { name: "name", label: "Household / owner name", value: u.name && u.name !== "—" ? u.name : "" },
        { name: "type", label: "Occupancy", type: "select", options: ["Owner", "Tenant"], value: u.type || "Owner" },
        { name: "status", label: "Status", type: "select", options: ["Occupied", "Vacant"], value: u.status || "Occupied" },
        { name: "contact", label: "Contact number", value: u.contact && u.contact !== "—" ? u.contact : "" }
      ],
      onSubmit: async function (d) {
        var label = edit;
        if (!edit) {
          label = d.unit.replace(/\s+/g, " ");
          if (!label) return { error: "Enter the unit name, e.g. Unit 12A." };
          if (!/^unit /i.test(label)) label = "Unit " + label;
          label = "Unit " + label.slice(5).trim().toUpperCase();
          if (S.rows.unit && Array.from(S.rows.unit.keys()).some(function (k) { return k.toLowerCase() === label.toLowerCase(); })) return { error: label + " already exists." };
        }
        var old = edit ? unitRec(edit) || {} : {};
        await put("unit", label, label, Object.assign({}, old, {
          unit: label, name: d.name || "—", type: d.type, status: d.status, contact: d.contact || "—", usage: old.usage || "owner"
        }));
        logAct((edit ? "Unit updated: " : "Unit added: ") + label, "Units");
        render();
      }
    });
  }
  ACT["unit-add"] = function () { unitForm(null); };
  ACT["unit-edit"] = function (el) { unitForm(el.dataset.id); };
  ACT["unit-del"] = function (el) {
    var id = el.dataset.id;
    var hasAcc = S.accounts.some(function (a) { return a.unit === id; });
    confirmBox("Remove " + id + "?", hasAcc ? "This unit still has a resident account. Delete or move that account first." : "Its charges and history stay in the database.",
      "Remove", async function () {
        if (hasAcc) throw new Error("This unit still has a resident account.");
        await del("unit", id); logAct("Unit removed: " + id, "Units"); render();
      }, true);
  };

  // accounts
  ACT["acc-add"] = function () {
    var units = list("unit").map(function (r) { return r.id; }).sort(naturalCompare);
    if (!units.length) return toast("Add a unit first.", true);
    openForm({
      title: "Create resident account",
      fields: [
        { name: "name", label: "Full name" },
        { name: "email", label: "Email", type: "email" },
        { name: "phone", label: "Mobile number (a code is texted to it)", placeholder: "e.g. 0917 555 0112" },
        { name: "unit", label: "Unit", type: "select", options: units }
      ],
      submit: "Create",
      onSubmit: async function (d) {
        if (!d.name || !d.email) return { error: "Full name and email are required." };
        if (!/^(\+?63|0)?9\d{9}$/.test(d.phone.replace(/[\s-]/g, ""))) return { error: "Enter a valid Philippine mobile number, e.g. 0917 555 0112." };
        var r = await callUsers({ action: "create", name: d.name, email: d.email, phone: d.phone, unit: d.unit });
        await loadAccounts();
        logAct("Account created: " + d.unit, "Access");
        showPassword(d.name, r.email, r.password);
        render();
        return { keepOpen: true };
      }
    });
  };
  function showPassword(name, email, pw) {
    openInfo("Temporary password",
      '<p class="note">Give this to <b>' + esc(name) + "</b> (" + esc(email) + "). It is shown only now. They must choose their own password when they sign in, then enter a code sent to their email and a code sent to their mobile number.</p>" +
      '<p class="mono">' + esc(pw) + "</p>");
  }
  function accById(id) { return S.accounts.filter(function (a) { return a.id === id; })[0]; }
  ACT["acc-reset"] = function (el) {
    var a = accById(el.dataset.id); if (!a) return;
    confirmBox("Reset password?", "A new temporary password will be made for " + a.name + ".", "Reset", async function () {
      var r = await callUsers({ action: "reset-password", userId: a.id });
      logAct("Password reset: " + a.unit, "Access");
      showPassword(a.name, a.email, r.password);
      return { keepOpen: true };
    });
  };
  ACT["acc-susp"] = function (el) {
    var a = accById(el.dataset.id); if (!a) return;
    confirmBox((a.suspended ? "Reactivate " : "Suspend ") + a.name + "?", a.suspended ? "They will be able to sign in again." : "They will not be able to sign in.",
      a.suspended ? "Reactivate" : "Suspend", async function () {
        await callUsers({ action: "set-suspended", userId: a.id, suspended: !a.suspended });
        await loadAccounts(); logAct((a.suspended ? "Account reactivated: " : "Account suspended: ") + a.unit, "Access"); render();
      });
  };
  ACT["acc-del"] = function (el) {
    var a = accById(el.dataset.id); if (!a) return;
    confirmBox("Delete " + a.name + "'s account?", "This cannot be undone.", "Delete", async function () {
      await callUsers({ action: "delete", userId: a.id });
      await loadAccounts(); logAct("Account deleted: " + a.unit, "Access"); render();
    }, true);
  };

  // finance
  ACT["rate-set"] = function () {
    openForm({
      title: "Monthly dues per unit",
      fields: [{ name: "rate", label: "Amount (₱)", type: "number", step: "0.01", value: setting("dues_rate").rate || "" }],
      onSubmit: async function (d) {
        var n = parseFloat(d.rate);
        if (!(n > 0)) return { error: "Enter the monthly dues amount." };
        await put("setting", "dues_rate", "", { rate: n }); render();
      }
    });
  };
  ACT.bill = function () {
    var now = new Date();
    openForm({
      title: "Bill monthly dues",
      intro: "Adds one charge for every unit that has not been billed for this month yet.",
      fields: [
        { name: "period", label: "Month", value: LONG_MONTHS[now.getMonth()] + " " + now.getFullYear() },
        { name: "due", label: "Due date (optional)", placeholder: "e.g. " + shortDate(new Date(now.getFullYear(), now.getMonth(), 15)) }
      ],
      submit: "Bill",
      onSubmit: async function (d) {
        var rate = setting("dues_rate").rate;
        if (!(rate > 0)) return { error: "Set the monthly dues amount first." };
        var units = list("unit");
        if (!units.length) return { error: "Add the units first." };
        if (!d.period) return { error: "Enter the month, e.g. October 2026." };
        var due = "";
        if (d.due) { var p = parseShort(d.due); if (!p) return { error: 'Enter the due date like "Oct 15, 2026".' }; due = shortDate(p); }
        var note = "Association dues - " + d.period, n = 0;
        var existing = vals("due");
        for (var i = 0; i < units.length; i++) {
          var u = units[i];
          if (existing.some(function (x) { return x.unit === u.id && x.note === note; })) continue;
          var id = nextId();
          await put("due", id, u.id, { id: id, unit: u.id, name: u.v.name || "", amount: rate, note: note, dueDate: due });
          n++;
        }
        logAct("Dues billed for " + d.period + ": " + n + " unit" + (n === 1 ? "" : "s"), "Finance");
        toast(n ? "Billed " + n + " unit" + (n === 1 ? "" : "s") + "." : "Everyone was already billed for that month.");
        render();
      }
    });
  };
  ACT["charge-add"] = function () {
    var units = list("unit").map(function (r) { return r.id; }).sort(naturalCompare);
    if (!units.length) return toast("Add a unit first.", true);
    openForm({
      title: "Add charge",
      fields: [
        { name: "unit", label: "Unit", type: "select", options: units },
        { name: "amount", label: "Amount (₱)", type: "number", step: "0.01" },
        { name: "note", label: "Description", placeholder: "e.g. Facility damage fee" },
        { name: "due", label: "Due date (optional)", placeholder: "e.g. Oct 30, 2026" }
      ],
      onSubmit: async function (d) {
        var a = parseFloat(d.amount);
        if (!(a > 0)) return { error: "Enter a valid amount." };
        if (!d.note) return { error: "Add a short description, e.g. Facility damage fee." };
        var due = "";
        if (d.due) { var p = parseShort(d.due); if (!p) return { error: 'Enter the due date like "Oct 15, 2026".' }; due = shortDate(p); }
        var id = nextId(), u = unitRec(d.unit) || {};
        await put("due", id, d.unit, { id: id, unit: d.unit, name: u.name || "", amount: a, note: d.note, dueDate: due });
        logAct("Charge added, " + d.unit + ": " + d.note, "Finance"); render();
      }
    });
  };
  ACT["due-del"] = function (el) {
    var id = el.dataset.id;
    confirmBox("Delete this charge?", "It will be removed for the resident too.", "Delete", async function () {
      await del("due", id); render();
    }, true);
  };
  async function recordPayment(unit, payer, forText, method, reference, amount, proofRow) {
    var no = proofRow && proofRow.receiptNo ? proofRow.receiptNo : nextReceiptNo();
    var date = shortDate(new Date());
    var pid = nextId();
    await put("payment", pid, unit, { id: pid, receiptNo: no, unit: unit, payer: payer, forText: forText, method: method, reference: reference || "—", date: date, amount: amount });
    return { no: no, date: date };
  }
  ACT["due-pay"] = function (el) {
    var id = el.dataset.id, d = S.rows.due.get(id).value;
    openForm({
      title: "Record payment — " + d.unit,
      intro: esc(d.note) + " · " + peso(d.amount),
      fields: [
        { name: "method", label: "Paid by", type: "select", options: payMethods().map(function (m) { return m.name; }), value: PAY_OFFICE },
        { name: "reference", label: "Reference no. (optional)" }
      ],
      submit: "Record and issue receipt",
      onSubmit: async function (f) {
        var cur = S.rows.due.get(id).value;
        if (cur.paid) return { error: "This charge is already paid." };
        await put("due", id, S.rows.due.get(id).unit, Object.assign({}, cur, { paid: true }));
        var r = await recordPayment(cur.unit, cur.name || cur.unit, cur.note, f.method, f.reference, cur.amount);
        var qid = nextId();
        await put("proof", qid, cur.unit, { id: qid, unit: cur.unit, payer: cur.name || cur.unit, forText: cur.note, method: f.method, reference: f.reference || "—",
          amount: cur.amount, date: r.date, status: "Confirmed", receiptNo: r.no, confirmedOn: r.date, direct: true });
        logAct("Payment recorded, " + cur.unit, "Finance");
        toast("Receipt " + r.no + " issued."); render();
      }
    });
  };
  ACT["proof-ok"] = async function (el) {
    var id = el.dataset.id, row = S.rows.proof.get(id);
    if (!row || row.value.status !== "Pending") return;
    var p = Object.assign({}, row.value);
    try {
      p.status = "Confirmed"; p.receiptNo = nextReceiptNo(); p.confirmedOn = shortDate(new Date());
      var due = firstOpenDue(p.unit);
      if (due) {
        await put("due", due.id, p.unit, Object.assign({}, due, { paid: true }));
        p.forText = due.note;
      } else if (!p.forText) p.forText = "Association dues";
      await put("proof", id, row.unit, p);
      await recordPayment(p.unit, p.payer, p.forText, p.method, p.reference, p.amount, p);
      logAct("Payment recorded, " + p.unit, "Finance");
      toast("Receipt " + p.receiptNo + " issued."); render();
    } catch (e) { toast(errText(e), true); }
  };
  ACT["proof-no"] = async function (el) {
    var id = el.dataset.id, row = S.rows.proof.get(id);
    if (!row || row.value.status !== "Pending") return;
    try {
      await put("proof", id, row.unit, Object.assign({}, row.value, { status: "Rejected" }));
      logAct("Payment reference not confirmed, " + row.value.unit, "Finance"); render();
    } catch (e) { toast(errText(e), true); }
  };
  ACT["pay-methods"] = function () {
    var ms = payMethods();
    var fields = [];
    ms.forEach(function (m, i) {
      fields.push({ name: "en" + i, label: m.name, type: "select", options: [["1", "On"], ["0", "Off"]], value: m.enabled ? "1" : "0" });
      if (m.name !== PAY_OFFICE) fields.push({ name: "d" + i, label: m.name + " — details", type: "textarea", value: m.details });
    });
    openForm({
      title: "Payment options", intro: "Residents see only the options that are On.", fields: fields,
      onSubmit: async function (d) {
        var list_ = ms.map(function (m, i) {
          return { name: m.name, details: m.name === PAY_OFFICE ? m.details : (d["d" + i] || m.details), enabled: d["en" + i] === "1" };
        });
        await put("setting", "paymethods", "", { list: list_ }); render();
      }
    });
  };

  // bookings
  ACT["bk-ok"] = function (el) { setBooking(el.dataset.id, "Approved"); };
  ACT["bk-no"] = function (el) { setBooking(el.dataset.id, "Denied"); };
  async function setBooking(id, status) {
    var row = S.rows.booking.get(id); if (!row) return;
    try {
      await put("booking", id, row.unit, Object.assign({}, row.value, { status: status }));
      logAct(row.value.place + " booking " + status.toLowerCase() + ", " + row.value.unit, "Facilities"); render();
    } catch (e) { toast(errText(e), true); }
  }
  ACT["block-slots"] = function () {
    var today = dayKey(new Date()), cur = setting("blocked");
    var keys = cur.day === today ? (cur.keys || []) : [];
    var fields = [];
    FACILITIES.forEach(function (f, fi) {
      SLOT_TIMES.forEach(function (t, si) {
        fields.push({ name: "k" + fi + "-" + si, label: f[0] + " · " + t, type: "select", options: [["0", "Open"], ["1", "Closed"]], value: keys.indexOf(fi + "-" + si) >= 0 ? "1" : "0" });
      });
    });
    openForm({
      title: "Close slots today", intro: "Closed slots cannot be booked today. This resets tomorrow.", fields: fields,
      onSubmit: async function (d) {
        var ks = [];
        Object.keys(d).forEach(function (k) { if (d[k] === "1") ks.push(k.slice(1)); });
        await put("setting", "blocked", "", { day: today, keys: ks }); render();
      }
    });
  };

  // announcements, events
  ACT["ann-add"] = function () {
    openForm({
      title: "Post announcement",
      fields: [
        { name: "title", label: "Title" },
        { name: "body", label: "Message", type: "textarea" },
        { name: "type", label: "Type", type: "select", options: ["General", "Maintenance", "Warning", "Emergency"] }
      ],
      submit: "Publish",
      onSubmit: async function (d) {
        if (!d.title) return { error: "Enter a title." };
        var id = nextId();
        await put("announcement", id, "", { id: id, title: d.title, body: d.body || "—", date: shortDate(new Date()), status: "Published", type: d.type });
        logAct("Announcement published: " + d.title, "Announcements"); render();
      }
    });
  };
  ACT["ann-del"] = function (el) {
    var id = el.dataset.id;
    confirmBox("Delete announcement?", "Residents will no longer see it.", "Delete", async function () { await del("announcement", id); render(); }, true);
  };
  ACT["ev-add"] = function () {
    openForm({
      title: "Add event",
      fields: [{ name: "title", label: "Title" }, { name: "date", label: "Date", placeholder: "e.g. Nov 15, 2026, 4 PM" }, { name: "place", label: "Venue" }, { name: "about", label: "Details", type: "textarea" }],
      onSubmit: async function (d) {
        if (!d.title) return { error: "Enter a title." };
        var id = nextId();
        await put("event", id, "", { id: id, title: d.title, date: d.date || "Date TBD", place: d.place || "Venue TBD", about: d.about });
        render();
      }
    });
  };
  ACT["ev-del"] = function (el) {
    var id = el.dataset.id;
    confirmBox("Delete event?", "Residents will no longer see it.", "Delete", async function () {
      await del("event", id);
      var gone = list("rsvp").filter(function (r) { return Number(r.v.event) === Number(id); });
      for (var i = 0; i < gone.length; i++) await del("rsvp", gone[i].id);
      render();
    }, true);
  };
  ACT["ev-go"] = async function (el) {
    var id = el.dataset.id, key = myUnit() + "|" + id;
    try {
      if (S.rows.rsvp && S.rows.rsvp.has(key)) await del("rsvp", key);
      else await put("rsvp", key, myUnit(), { event: Number(id) });
      render();
    } catch (e) { toast(errText(e), true); }
  };

  // grievances
  ACT["gr-next"] = async function (el) {
    var id = el.dataset.id, row = S.rows.grievance.get(id); if (!row) return;
    try {
      var st = Math.min(2, (Number(row.value.stage) || 0) + 1);
      await put("grievance", id, row.unit, Object.assign({}, row.value, { stage: st }));
      logAct("Grievance " + (st === 2 ? "resolved" : "in progress") + ": " + row.value.title, "Requests"); render();
    } catch (e) { toast(errText(e), true); }
  };
  ACT["gr-add"] = function () {
    openForm({
      title: "New grievance",
      fields: [{ name: "title", label: "Subject" }, { name: "body", label: "Describe the concern", type: "textarea" }],
      submit: "Send",
      onSubmit: async function (d) {
        if (!d.title) return { error: "Enter a subject." };
        var id = nextId();
        await put("grievance", id, myUnit(), { id: id, title: d.title, body: d.body || "—", by: myUnit(), stage: 0 });
        logAct("Grievance sent, " + myUnit() + ": " + d.title, "Requests"); render();
      }
    });
  };

  // expenses
  ACT["exp-add"] = function () {
    var t = new Date();
    openForm({
      title: "Add purchase",
      fields: [
        { name: "item", label: "What was bought" },
        { name: "category", label: "Category", type: "select", options: EXP_CATS },
        { name: "area", label: "For", type: "select", options: EXP_AREAS },
        { name: "payee", label: "Store / supplier" },
        { name: "qty", label: "Quantity", type: "number", step: "any", value: "1" },
        { name: "unitPrice", label: "Price of one (₱)", type: "number", step: "0.01" },
        { name: "receiptNo", label: "Official receipt no. (optional)" },
        { name: "date", label: "Date", type: "date", value: dayKey(t) },
        { name: "note", label: "Note (optional)" }
      ],
      onSubmit: async function (d) {
        if (!d.item) return { error: "Enter what was bought." };
        var qty = d.qty === "" ? 1 : parseFloat(d.qty), price = parseFloat(d.unitPrice);
        if (!(qty > 0)) return { error: "Enter a valid quantity." };
        if (!(price > 0)) return { error: "Enter the price of one." };
        if (!d.date) return { error: "Choose the date." };
        var id = nextId();
        await put("expense", id, "__admin", { id: id, item: d.item, category: d.category, area: d.area, payee: d.payee, receiptNo: d.receiptNo, note: d.note, qty: qty, unitPrice: price, date: d.date });
        logAct("Purchase recorded: " + d.item, "Expenses"); render();
      }
    });
  };
  ACT["exp-del"] = function (el) {
    var id = el.dataset.id;
    confirmBox("Delete this purchase?", "This cannot be undone.", "Delete", async function () { await del("expense", id); render(); }, true);
  };

  // resident actions
  ACT["send-proof"] = function () {
    var ms = payMethods().filter(function (m) { return m.enabled; }).map(function (m) { return m.name; });
    var unit = myUnit(), bal = balanceFor(unit);
    openForm({
      title: "I have paid",
      intro: "Send the reference number of your payment. The office will confirm it and issue a receipt.",
      fields: [
        { name: "method", label: "Paid by", type: "select", options: ms },
        { name: "reference", label: "Reference number" },
        { name: "amount", label: "Amount paid (₱)", type: "number", step: "0.01", value: bal || "" }
      ],
      submit: "Send",
      onSubmit: async function (d) {
        var a = parseFloat(d.amount);
        if (!(a > 0)) return { error: "Enter the amount you paid." };
        if (!d.reference) return { error: "Enter the reference number from your payment receipt." };
        var due = firstOpenDue(unit), id = nextId(), u = unitRec(unit) || {};
        await put("proof", id, unit, { id: id, unit: unit, payer: u.name && u.name !== "—" ? u.name : S.profile.name, forText: due ? due.note : "Association dues",
          method: d.method, reference: d.reference, amount: a, date: shortDate(new Date()), status: "Pending" });
        logAct("Payment reference sent, " + unit, "Finance");
        toast("Sent. The office will confirm it."); render();
      }
    });
  };
  ACT.book = async function (el) {
    var f = S.f.fac || 0, i = +el.dataset.id, unit = myUnit();
    if (slotBooked(f, i)) return toast("That time is already taken.", true);
    var u = unitRec(unit) || {};
    var id = nextId(), now = new Date();
    S.busy = true;
    try {
      await put("booking", id, unit, { id: id, who: u.name && u.name !== "—" ? u.name : S.profile.name, unit: unit, place: FACILITIES[f][0],
        when: shortDate(now) + ", " + SLOT_TIMES[i], status: "Pending", day: dayKey(now), slot: i });
      logAct("Booking request for the " + FACILITIES[f][0] + ", " + unit, "Facilities");
      toast("Request sent. The office will approve it.");
    } catch (e) {
      toast(errText(e), true);
      await loadAll().catch(function () {});
    }
    S.busy = false; render();
  };
  ACT["bk-cancel"] = function (el) {
    var id = el.dataset.id;
    confirmBox("Cancel this reservation?", "The time becomes free for others.", "Cancel reservation", async function () { await del("booking", id); render(); }, true);
  };
  ACT["pw-change"] = function () {
    openForm({
      title: "Change password",
      fields: [
        { name: "cur", label: "Current password", type: "password" },
        { name: "pw", label: "New password (at least 8 characters)", type: "password" },
        { name: "pw2", label: "Confirm new password", type: "password" }
      ],
      onSubmit: async function (d) {
        if (d.pw.length < 8) return { error: "New password must be at least 8 characters." };
        if (d.pw !== d.pw2) return { error: "New password and confirmation don't match." };
        var chk = await sb.auth.signInWithPassword({ email: S.profile.email, password: d.cur });
        if (chk.error) return { error: "Your current password is not correct." };
        var u = await sb.auth.updateUser({ password: d.pw });
        if (u.error) return { error: u.error.message };
        toast("Password changed.");
      }
    });
  };

  // ------------------------------------------------------------------ events
  document.addEventListener("click", function (e) {
    var nav = e.target.closest("[data-nav]");
    if (nav) { S.view = nav.dataset.nav; if (isAdmin() && S.view === "accounts") loadAccounts().then(render); else render(); window.scrollTo(0, 0); return; }
    var a = e.target.closest("[data-act]");
    if (a && ACT[a.dataset.act]) {
      var r = ACT[a.dataset.act](a);
      if (r && r.catch) r.catch(function (ex) { toast(errText(ex), true); });
    }
  });
  document.addEventListener("change", function (e) {
    if (e.target.matches("[data-exp-month]")) { S.f.exp = e.target.value; render(); }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });

  // ------------------------------------------------------------------ go
  (async function init() {
    try {
      var s = await sb.auth.getSession();
      if (s.data && s.data.session) await start(s.data.session);
      else renderLogin();
    } catch (e) { renderLogin(); }
    sb.auth.onAuthStateChange(function (ev) {
      if (ev === "SIGNED_OUT" && S.user) { stopLive(); S.user = S.profile = null; renderLogin(); }
    });
  })();
})();
