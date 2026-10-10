/* ==========================================================================
   resident-features.js — the newer resident pages
   Events (RSVP) · Polls · Directory · search · notification bell
   (Loaded after shared.js and resident.js.)
   ========================================================================== */

Object.assign(state, { rsvp: {}, votes: {}, eventFilter: "all", pollFilter: "open" });

/* ---------- Events with RSVP ---------- */
const COMMUNITY_EVENTS = [
  { id:1, title:"Zumba at the Function Hall", when:"Every Sat, 6:00 AM", month:"SAT", day:"•", place:"Function Hall", going:14, about:"A free weekly workout for residents of all ages. Bring a towel and water." },
  { id:2, title:"Annual General Assembly", when:"Oct 18, 2026 · 6:00 PM", month:"OCT", day:"18", place:"Function Hall", going:41, about:"Yearly report, budget and board updates. Every unit is encouraged to send a representative." },
  { id:3, title:"Community Clean-Up Drive", when:"Oct 24, 2026 · 7:00 AM", month:"OCT", day:"24", place:"Ground floor lobby", going:19, about:"Gloves and bags are provided. Breakfast is on the association." },
  { id:4, title:"Trick or Treat, Phase 2", when:"Oct 31, 2026 · 4:00 PM", month:"OCT", day:"31", place:"Phase 2 grounds", going:27, about:"Kids in costume walk the building with a parent. Volunteers are welcome to hand out treats." }
];
function viewEvents(){
  const list = COMMUNITY_EVENTS.filter(e => state.eventFilter === "all" || state.rsvp[e.id]);
  const goingCount = COMMUNITY_EVENTS.filter(e=>state.rsvp[e.id]).length;
  return `
    ${pageTabs([["all","All events ("+COMMUNITY_EVENTS.length+")"],["mine","I'm going ("+goingCount+")"]], state.eventFilter, "eventFilter")}
    <div class="event-grid">
      ${list.map((e,i)=>`
        <div class="card event ${state.rsvp[e.id]?"yes":""}">
          <div class="date-badge t${1+i%4}"><small>${e.month}</small><b>${e.day}</b></div>
          <div class="event-main">
            <h2>${e.title}</h2>
            <p class="meta">${e.when} · ${e.place}</p>
            <p>${e.about}</p>
            <div class="event-foot">
              <span class="going">${e.going + (state.rsvp[e.id]?1:0)} going</span>
              <button class="btn ${state.rsvp[e.id]?"":"primary"}" onclick="toggleRsvp(${e.id})">${state.rsvp[e.id]?"You're going ✓":"I'm going"}</button>
            </div>
          </div>
        </div>`).join("") || '<p class="empty">You have not said you are going to any event yet.</p>'}
    </div>`;
}
function toggleRsvp(id){
  const e = COMMUNITY_EVENTS.find(x=>x.id===id);
  state.rsvp[id] = !state.rsvp[id];
  render();
  toast(state.rsvp[id] ? "See you at " + e.title + "!" : "Removed from " + e.title + ".");
}

/* ---------- Polls ---------- */
const POLLS = samplePolls();
function viewPolls(){
  const open = POLLS.filter(p=>p.open).length;
  const shown = POLLS.filter(p => state.pollFilter === "all" || (state.pollFilter === "open") === p.open);
  return `
    ${pageTabs([["open","Open ("+open+")"],["closed","Closed ("+(POLLS.length-open)+")"],["all","All"]], state.pollFilter, "pollFilter")}
    <div class="event-grid">
      ${shown.map(p=>{
        const voted = state.votes[p.id];
        const showResults = !p.open || voted !== undefined;
        return `<div class="card">
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px">
            <div><h2>${p.q}</h2><small style="color:var(--muted)">${p.open?"Closes":"Closed"} ${p.closes}</small></div>
            <span class="chip ${p.open?"good":"info"}">${p.open?"Open":"Closed"}</span>
          </div>
          ${showResults ? pollBars(p, voted) : `
            <div class="options">${p.options.map((o,i)=>`<label class="opt"><input type="radio" name="poll-${p.id}" value="${i}"><span>${o.t}</span></label>`).join("")}</div>
            <button class="btn primary" style="margin-top:12px" onclick="castVote(${p.id})">Submit my vote</button>`}
          ${showResults ? `<p class="hint" style="margin:12px 0 0">${pollTotal(p)} votes so far${voted!==undefined?" · thank you for voting":""}</p>` : ""}
        </div>`;
      }).join("") || '<p class="empty">No polls here.</p>'}
    </div>`;
}
function castVote(id){
  const picked = document.querySelector('input[name="poll-' + id + '"]:checked');
  if (!picked){ toast("Pick an option first."); return; }
  const p = POLLS.find(x=>x.id===id);
  p.options[Number(picked.value)].votes++;
  state.votes[id] = Number(picked.value);
  render();
  toast("Your vote was recorded. Thank you!");
}

/* ---------- Directory: contacts, house rules, FAQ ---------- */
const CONTACTS = [
  { name:"Security desk", note:"Open 24 hours · Gate and lobby", tel:"Local 101", tone:1 },
  { name:"Administration office", note:"Mon–Sat, 8 AM – 5 PM · Dues, bookings, documents", tel:"Local 102", tone:2 },
  { name:"Maintenance", note:"Repairs in common areas · Report through Grievances", tel:"Local 103", tone:3 },
  { name:"Emergency hotline", note:"Fire, police or medical emergencies", tel:"911", tone:4 }
];
const RULES = [
  ["Swimming pool","Open 6:00 AM – 8:00 PM. Shower before entering and keep glass out of the pool area."],
  ["Function Hall","Open 8:00 AM – 10:00 PM. Book ahead, and leave the hall clean for the next group."],
  ["Quiet hours","Please keep noise low from 10:00 PM to 6:00 AM, including music and renovation work."],
  ["Common areas","No smoking inside the building. Keep hallways, stairs and the lobby clear."],
  ["Pets","Pets stay on a leash in common areas, and owners clean up after them."],
  ["Garbage","Bag and tie your waste, and use the designated disposal area only."]
];
const FAQ = [
  ["How do I book the pool or the Function Hall?","Open Book a facility, pick the place, tap an open time slot and send your request. The office approves it and you will see the result under Reservations."],
  ["When are monthly dues due?","Dues are due on the 15th of every month. Your balance and history are under Dues."],
  ["I rent out my unit. What do I need to do?","Open Unit Rental and declare how your unit is used. Long-term leases are saved right away. Short-term rentals and home businesses need the administrator's approval."],
  ["How do I request motor parking?","Open Dues and use the Motor parking rental box. The office will assign a slot when one is free."],
  ["How do I report a problem in the building?","Use Grievances to describe the concern. You can follow its status from Open to In progress to Resolved."]
];
function viewDirectory(){
  return `
    <section><div class="sec-head"><h2>Who to call</h2></div>
      <div class="contact-grid">${CONTACTS.map(c=>`<div class="contact t${c.tone}"><b>${c.name}</b><small>${c.note}</small><em>${c.tel}</em></div>`).join("")}</div>
      <p class="hint">Local numbers are dialled from the building's intercom. The office will confirm the outside numbers.</p>
    </section>
    <div class="two-lists">
      <section><div class="sec-head"><h2>House rules</h2></div>
        <div class="lrows">${RULES.map(r=>`<div class="lrow rule"><span class="lmain"><b>${r[0]}</b><small>${r[1]}</small></span></div>`).join("")}</div>
      </section>
      <section><div class="sec-head"><h2>Questions we hear a lot</h2></div>
        <div class="faq">${FAQ.map(f=>`<details><summary>${f[0]}</summary><p>${f[1]}</p></details>`).join("")}</div>
      </section>
    </div>`;
}

/* ---------- Search + notification bell ---------- */
function searchIndex(){
  const pages = [["Book a facility","book"],["My reservations","res"],["Dues and payments","dues"],["Community events","events"],["Polls","polls"],["Directory","directory"],["Grievances","gr"],["Documents","docs"],["Unit rental","rental"],["Settings","settings"]];
  return [].concat(
    COMMUNITY_EVENTS.map(e=>({ t:e.title, s:e.when+" · "+e.place, tag:"Event", v:"events" })),
    POLLS.map(p=>({ t:p.q, s:p.open?"Open poll":"Closed poll", tag:"Poll", v:"polls" })),
    POSTS.map(p=>({ t:p.title, s:p.body, tag:"Announcement", v:"home" })),
    DOCS.map(d=>({ t:d.name, s:d.cat, tag:"Document", v:"docs" })),
    CONTACTS.map(c=>({ t:c.name, s:c.note+" · "+c.tel, tag:"Contact", v:"directory" })),
    RULES.map(r=>({ t:r[0], s:r[1], tag:"House rule", v:"directory" })),
    FAQ.map(f=>({ t:f[0], s:f[1], tag:"FAQ", v:"directory" })),
    pages.map(p=>({ t:p[0], s:"Open this page", tag:"Page", v:p[1] }))
  );
}
function bellItems(){
  const list = [
    { t:"Your Function Hall booking for Saturday was approved.", s:"Reservations", v:"res" },
    { t:"Dues for September are now overdue.", s:"Dues", v:"dues" },
    { t:"New announcement: Water interruption this Saturday.", s:"Home", v:"home" }
  ];
  const toVote = POLLS.filter(p=>p.open && state.votes[p.id]===undefined).length;
  if (toVote) list.push({ t:toVote+" poll"+(toVote>1?"s":"")+" waiting for your vote", s:"Polls", v:"polls" });
  return list;
}
