/* Live sync with Supabase for the shared records: payment proofs and motor parking.

   The website keeps working from local storage; this file mirrors those records into one
   Supabase table (shared_records) and listens for changes, so the resident page, the admin
   page and the ResidentHub app all show the same data within about a second.

   Needs supabase-config.js to be filled in. Until then this file does nothing. */
(function(){
  const cfg = window.RH_SUPABASE || {};
  window.RH_CLOUD = { enabled:false, ready:false };
  if (!cfg.url || !cfg.anonKey) return;
  window.RH_CLOUD.enabled = true;

  const TABLE = "shared_records";
  const KINDS = ["proof", "slot", "request", "setting"];
  const SDK_URLS = [
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js",
    "https://unpkg.com/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"
  ];

  /* ---------- small status badge so you can see it is connected ---------- */
  function badge(text, tone){
    let el = document.getElementById("rh-live");
    if (!el){
      el = document.createElement("div");
      el.id = "rh-live";
      el.style.cssText = "position:fixed;left:14px;bottom:14px;z-index:9999;padding:5px 12px;border-radius:999px;font:700 12px 'Source Sans 3',sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.15);pointer-events:none";
      (document.body || document.documentElement).appendChild(el);
    }
    el.textContent = text;
    el.style.background = tone === "good" ? "#DDF2D8" : tone === "bad" ? "#F9D9D5" : "#FFF1C9";
    el.style.color = tone === "good" ? "#1F5B22" : tone === "bad" ? "#8A2A1E" : "#6B5200";
  }

  /* ---------- helpers ---------- */
  const keyOf = (kind, id) => kind + "|" + id;
  function stable(v){
    if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
    if (v && typeof v === "object") return "{" + Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + stable(v[k])).join(",") + "}";
    return JSON.stringify(v);
  }
  /* What the cloud holds right now: "kind|id" -> { kind, id, value } */
  const known = new Map();
  let client = null, ready = false, pushing = false, pushAgain = false, pushTimer = null;

  function localRows(){
    const rows = [];
    readProofs().forEach(p => rows.push({ kind:"proof", id:String(p.id), value:p }));
    const pk = readParking();
    pk.slots.forEach((u, i) => rows.push({ kind:"slot", id:parkSlotId(i), value:{ unit:u } }));
    pk.requests.forEach(r => rows.push({ kind:"request", id:r.unit, value:r }));
    rows.push({ kind:"setting", id:"motor_rate", value:{ rate:pk.rate } });
    return rows;
  }

  /* Write what the cloud holds into local storage (without pushing it back). */
  function applyKnownToLocal(){
    const all = Array.from(known.values());
    const proofs = all.filter(r => r.kind === "proof").map(r => r.value).sort((a, b) => Number(b.id) - Number(a.id));
    try { localStorage.setItem(PAY_KEY, JSON.stringify(proofs)); } catch(err){}
    const slotRows = all.filter(r => r.kind === "slot");
    if (slotRows.length){
      const base = parkDefault();
      const slots = base.slots.slice();
      slotRows.forEach(r => { const i = parseInt(String(r.id).replace("M-", ""), 10) - 1; if (i >= 0 && i < 24) slots[i] = (r.value && r.value.unit) || ""; });
      const requests = all.filter(r => r.kind === "request").map(r => r.value).sort((a, b) => (a.at || 0) - (b.at || 0));
      const rateRow = known.get(keyOf("setting", "motor_rate"));
      const rate = rateRow && Number.isFinite(Number(rateRow.value.rate)) ? Number(rateRow.value.rate) : base.rate;
      try { localStorage.setItem(PARK_KEY, JSON.stringify({ slots, requests, rate })); } catch(err){}
    }
    if (typeof hydrateParking === "function") { try { hydrateParking(); } catch(err){} }
  }

  /* Redraw, but never while someone is typing in a field. */
  let renderPending = false;
  function safeRender(){
    try { if (typeof state === "undefined" || !state.authed || typeof render !== "function") return; } catch(err){ return; }
    const a = document.activeElement;
    if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)){
      if (!renderPending){
        renderPending = true;
        a.addEventListener("blur", function once(){ a.removeEventListener("blur", once); renderPending = false; setTimeout(safeRender, 150); });
      }
      return;
    }
    render();
  }

  async function pull(){
    const { data, error } = await client.from(TABLE).select("kind,id,value").in("kind", KINDS);
    if (error) throw error;
    known.clear();
    (data || []).forEach(r => known.set(keyOf(r.kind, r.id), { kind:r.kind, id:r.id, value:r.value }));
    /* A brand-new project has no parking rows yet: the first device in saves the starting layout. */
    const seeding = !(data || []).some(r => r.kind === "slot");
    if (!seeding) applyKnownToLocal();
    ready = true; window.RH_CLOUD.ready = true;
    if (seeding) await pushDiff(true);
    safeRender();
  }

  /* Send only what changed on this device. */
  async function pushDiff(force){
    if (!ready && !force) return;
    if (pushing){ pushAgain = true; return; }
    pushing = true;
    try {
      const want = new Map(localRows().map(r => [keyOf(r.kind, r.id), r]));
      const upserts = [], deletes = [];
      want.forEach((r, key) => { const k = known.get(key); if (!k || stable(k.value) !== stable(r.value)) upserts.push(r); });
      known.forEach((r, key) => { if (!want.has(key) && (r.kind === "proof" || r.kind === "request")) deletes.push(r); });
      if (upserts.length){
        const { error } = await client.from(TABLE).upsert(upserts.map(r => ({ kind:r.kind, id:r.id, value:r.value })), { onConflict:"kind,id" });
        if (error) throw error;
        upserts.forEach(r => known.set(keyOf(r.kind, r.id), r));
      }
      for (const r of deletes){
        const { error } = await client.from(TABLE).delete().eq("kind", r.kind).eq("id", r.id);
        if (error) throw error;
        known.delete(keyOf(r.kind, r.id));
      }
      badge("Live · connected", "good");
    } catch(err){
      console.warn("ResidentHub sync:", err);
      badge("Sync problem · retrying", "bad");
      clearTimeout(pushTimer); pushTimer = setTimeout(() => pushDiff(), 4000);
    } finally {
      pushing = false;
      if (pushAgain){ pushAgain = false; pushDiff(); }
    }
  }
  function schedulePush(){ clearTimeout(pushTimer); pushTimer = setTimeout(() => pushDiff(), 120); }

  /* Whenever this page saves, push the change. */
  const _writeProofs = window.writeProofs, _writeParking = window.writeParking;
  window.writeProofs = function(list){ _writeProofs(list); schedulePush(); };
  window.writeParking = function(p){ _writeParking(p); schedulePush(); };

  function start(){
    try { client = window.supabase.createClient(cfg.url, cfg.anonKey); }
    catch(err){ console.warn("ResidentHub sync: bad config", err); badge("Sync off · check supabase-config.js", "bad"); return; }
    badge("Connecting…", "warn");
    client.channel("residenthub-live")
      .on("postgres_changes", { event:"*", schema:"public", table:TABLE }, function(payload){
        const r = payload.eventType === "DELETE" ? payload.old : payload.new;
        if (!r || !KINDS.includes(r.kind)) return;
        if (payload.eventType === "DELETE") known.delete(keyOf(r.kind, r.id));
        else known.set(keyOf(r.kind, r.id), { kind:r.kind, id:r.id, value:r.value });
        applyKnownToLocal(); safeRender();
      })
      .subscribe(function(status){
        if (status === "SUBSCRIBED") pull().then(() => badge("Live · connected", "good")).catch(err => { console.warn("ResidentHub sync:", err); badge("Sync problem · check the SQL setup", "bad"); });
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") badge("Reconnecting…", "warn");
      });
  }

  function loadSdk(i){
    if (window.supabase && window.supabase.createClient) return start();
    if (i >= SDK_URLS.length){ badge("Sync off · could not load the Supabase library", "bad"); return; }
    const s = document.createElement("script");
    s.src = SDK_URLS[i]; s.onload = () => start(); s.onerror = () => loadSdk(i + 1);
    document.head.appendChild(s);
  }
  loadSdk(0);
})();
