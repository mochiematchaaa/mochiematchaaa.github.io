/* Motor parking data shared by resident.html and admin.html (same browser).
   The administrator assigns and releases slots, residents see which slots are free
   and can send a request. Either page refreshes as soon as the other one changes it. */

const PARK_KEY = "residenthub_parking_v1";
const PARK_SEED_UNITS = ["Unit 12A","Unit 7C","Unit 3B","Unit 15D","Unit 9A","Unit 21B","Unit 18C","Unit 6B","Unit 2A","Unit 8C","Unit 10D","Unit 14A","Unit 17B"];

function parkDefault(){
  return {
    slots: Array.from({ length: 24 }, (_, i) => PARK_SEED_UNITS[i] || ""),
    requests: [{ unit:"Unit 4D", who:"Reyes-Torres Household", when:"2 days ago" }, { unit:"Unit 11B", who:"Fernandez Household", when:"Yesterday" }],
    rate: 500
  };
}
function readParking(){
  try {
    const raw = localStorage.getItem(PARK_KEY);
    if (!raw) return parkDefault();
    const v = JSON.parse(raw);
    if (!v || !Array.isArray(v.slots) || v.slots.length !== 24 || !Array.isArray(v.requests)) return parkDefault();
    return { slots: v.slots, requests: v.requests, rate: Number.isFinite(Number(v.rate)) ? Number(v.rate) : 500 };
  } catch(err){ return parkDefault(); }
}
function writeParking(p){
  try { localStorage.setItem(PARK_KEY, JSON.stringify(p)); } catch(err){ /* storage unavailable */ }
}
function parkSlotId(i){ return "M-" + String(i + 1).padStart(2, "0"); }

/* resident: ask for a slot */
function requestParkingSlot(unit, who){
  const p = readParking();
  if (p.slots.indexOf(unit) >= 0) return "Your unit already has a slot.";
  if (p.requests.some(r => r.unit === unit)) return "You already sent a request.";
  p.requests.push({ unit: unit, who: who, when: "Just now" });
  writeParking(p);
  return null;
}

/* live refresh when the other page changes the data */
window.addEventListener("storage", function(e){
  if (e.key !== PARK_KEY) return;
  try {
    if (typeof hydrateParking === "function") hydrateParking();
    if (typeof state !== "undefined" && state.authed && typeof render === "function") render();
  } catch(err){ /* ignore */ }
});
