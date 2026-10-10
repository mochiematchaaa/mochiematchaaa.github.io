/* ResidentHub admin enhancements. Browser-local demo data. */
(function(){
'use strict';
const KEY='residenthub_rental_inventory_v1';
const reviewPanel=window.viewRentals; // resident declarations that need approval (defined in admin.js)
let inventory;
try {const saved=JSON.parse(localStorage.getItem(KEY));inventory=Array.isArray(saved)?saved:null;}catch(e){}
const seedRow=u=>({unit:u.unit,resident:u.name==='—'?'':u.name,status:u.status==='Vacant'?'Vacant':'Occupied',rental:u.usage==='tenant'||u.usage==='shortterm'?'For Rent':'Not Listed',notes:u.usageDetails||''});
if(!inventory) inventory=UNITS.map(seedRow);
let selected=-1, editing=false, snapshot=null, lockedUnit='';
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v||'').trim().toLowerCase();
const unitRecord=id=>UNITS.find(u=>norm(u.unit)===norm(id));
function store(){try{localStorage.setItem(KEY,JSON.stringify(inventory));}catch(e){alert('Could not save: browser storage is full or disabled.');return false;}return true;}
/* The Units list is the source of truth for who lives in a unit and whether it is occupied.
   The registry follows it, so a change made in Units & Residents shows up here too. */
function syncFromUnits(){
  if(editing) return;
  UNITS.forEach(u=>{
    const row=inventory.find(r=>norm(r.unit)===norm(u.unit));
    if(!row){inventory.push(seedRow(u));return;}
    row.resident=u.name==='—'?'':u.name;
    row.status=u.status==='Vacant'?'Vacant':'Occupied';
  });
}
function pushToUnits(){
  inventory.forEach(r=>{
    const u=unitRecord(r.unit);
    if(!u) return;
    u.name=r.resident.trim()||'—';
    u.status=r.status;
  });
}
function startEdit(){snapshot=JSON.stringify(inventory);editing=true;lockedUnit=selected>=0&&unitRecord(inventory[selected].unit)?inventory[selected].unit:'';}
function focusFirstField(){setTimeout(()=>{const el=document.querySelector('input[data-rh-field="unit"]')||document.querySelector('[data-rh-field]');if(el){el.scrollIntoView({block:'center'});el.focus();}},0);}
function rentalRegistry(){
  syncFromUnits();
  const counts={Vacant:0,Occupied:0,'For Rent':0};inventory.forEach(u=>{if(u.status==='Vacant')counts.Vacant++;if(u.status==='Occupied')counts.Occupied++;if(u.rental==='For Rent')counts['For Rent']++;});
  const cell=(u,i,k)=>{
    if(!(editing&&selected===i)) return safe(u[k]);
    if(k==='unit'&&lockedUnit&&norm(u.unit)===norm(lockedUnit)) return `<span title="This unit comes from Units &amp; Residents, so its name cannot be changed here.">${safe(u.unit)}</span>`;
    if(k==='status'||k==='rental') return `<select data-rh-field="${k}" onchange="rhRentalChange('${k}',this.value)">${(k==='status'?['Occupied','Vacant']:['For Rent','Not Listed']).map(v=>`<option ${u[k]===v?'selected':''}>${v}</option>`).join('')}</select>`;
    return `<input data-rh-field="${k}" value="${safe(u[k])}" oninput="rhRentalChange('${k}',this.value)">`;
  };
  return `<div class="rental-summary">${['For Rent','Vacant','Occupied'].map(k=>`<div class="card"><span>${k}</span><strong>${counts[k]}</strong></div>`).join('')}</div>
  <div class="card" style="margin-top:16px"><h2>Unit rental &amp; occupancy registry</h2>
  <p class="hint">${editing?'<b>Editing.</b> Click Save to keep your changes, or Cancel to throw them away.':'Select a row, then Edit its details. Resident and occupancy stay in step with Units &amp; Residents.'}</p>
  <div class="rental-tools"><button class="btn primary" onclick="rhRentalAdd()">+ Add</button><button class="btn" onclick="rhRentalEdit()">Edit</button><button class="btn" onclick="rhRentalRemove()">Remove</button><button class="btn primary" onclick="rhRentalSave()">Save</button><button class="btn" style="${editing?'':'display:none'}" onclick="rhRentalCancel()">Cancel</button></div>
  <div class="rental-table-wrap"><table><thead><tr><th>Select</th><th>Unit</th><th>Resident / owner</th><th>Occupancy</th><th>Rental listing</th><th>Notes</th></tr></thead><tbody>${inventory.map((u,i)=>`<tr class="${selected===i?'selected':''}" onclick="rhRentalSelect(${i})"><td><input type="radio" name="rhRentalSelection" ${selected===i?'checked':''} aria-label="Select ${safe(u.unit)}"></td>${['unit','resident','status','rental','notes'].map(k=>`<td>${cell(u,i,k)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
}
function rentalPage(){
  const review=typeof reviewPanel==='function'?reviewPanel():'';
  return `<h2 class="rh-section-title" style="margin:0 0 12px">Declarations from residents</h2>${review}<h2 class="rh-section-title" style="margin:28px 0 12px">Registry</h2>${rentalRegistry()}`;
}
window.rhRentalSelect=i=>{
  if(editing&&selected!==i){
    if(!confirm('Discard your unsaved changes?'))return;
    window.rhRentalCancel(true);
  }
  selected=i;if(!editing)lockedUnit='';render();
};
window.rhRentalAdd=()=>{
  if(editing){alert('Save or cancel the row you are editing first.');return;}
  snapshot=JSON.stringify(inventory);
  inventory.push({unit:'',resident:'',status:'Vacant',rental:'Not Listed',notes:''});
  selected=inventory.length-1;editing=true;lockedUnit='';render();focusFirstField();
};
window.rhRentalEdit=()=>{if(selected<0){alert('Select a row first.');return;}if(!editing)startEdit();render();focusFirstField();};
window.rhRentalChange=(field,value)=>{if(selected>=0)inventory[selected][field]=value;};
window.rhRentalCancel=quiet=>{
  if(snapshot){try{inventory=JSON.parse(snapshot);}catch(e){}}
  snapshot=null;editing=false;lockedUnit='';selected=-1;
  if(quiet!==true)render();
};
window.rhRentalRemove=()=>{
  if(selected<0){alert('Select a row first.');return;}
  if(editing){alert('Save or cancel the row you are editing first.');return;}
  if(unitRecord(inventory[selected].unit)){alert('This unit is on the Units & Residents list. Remove it there, and it will disappear from this registry.');return;}
  if(!confirm('Remove the selected unit?'))return;
  inventory.splice(selected,1);selected=-1;render();store();
};
window.rhRentalSave=()=>{
  if(inventory.some(u=>!u.unit.trim())){alert('Enter a unit identifier for every row before saving.');return;}
  const ids=inventory.map(u=>norm(u.unit));
  if(new Set(ids).size!==ids.length){alert('Unit identifiers must be unique.');return;}
  pushToUnits();
  if(store()){snapshot=null;editing=false;lockedUnit='';render();if(typeof toast==='function')toast('Unit rental records saved.');if(typeof logAct==='function')logAct('Updated the unit rental registry');}
};
window.viewRentals=rentalPage;
// Add searchable, prominent matching results. Search works on actual record content.
window.runSearch=function(query){const output=document.getElementById('qOut');if(!output)return;const q=query.trim().toLocaleLowerCase();if(!q){output.hidden=true;return;}let results=[];function add(title,description,view){if(matchesUnitSearch(title+' '+description,q))results.push({title,description,view});}
UNITS.forEach(u=>add(u.unit,Object.values(u).join(' ')+' '+usageLabel(u.usage)+' '+(u.overdue>0?'overdue unpaid dues':'settled paid dues'),'units'));
inventory.forEach(u=>add(u.unit,u.resident+' '+u.status+' '+u.rental+' '+u.notes,'rentals'));
ANNOUNCEMENTS.forEach(a=>add(a.title,a.body,'ann'));
EVENTS.forEach(e=>add(e.title,e.date+' '+e.place,'ann'));
GRIEVANCES.forEach(g=>add(g.title,g.by,'req'));
FACILITIES.forEach(f=>add(f.name,f.hours,'fac'));
if(typeof POLLS!=='undefined')POLLS.forEach(p=>add(p.q,'Poll','polls'));
searchIndex().forEach(r=>add(r.t,r.s,r.v));
const unique=[];const seen=new Set();for(const r of results){const key=r.title+'|'+r.view;if(!seen.has(key)){unique.push(r);seen.add(key);}if(unique.length>=12)break;}
output.innerHTML=unique.length?unique.map(r=>`<button type="button" onclick="rhOpenSearchResult('${r.view}',${safe(JSON.stringify(r.title))})"><b>${safe(r.title)}</b><small>${safe(r.description)}</small></button>`).join(''):`<p>No matches for “${safe(query)}”.</p>`;output.hidden=false;};
window.rhOpenSearchResult=function(view,title){if(view==='units'){set({view,unitSearch:title});}else{set({view});}const output=document.getElementById('qOut');if(output)output.hidden=true;};
// Charts drawn with native canvas, no external chart library.
const oldReports=window.viewReports;
window.viewReports=function(){return `<div class="rh-chart-grid"><div class="card"><h2>Unit occupancy chart</h2><canvas id="rhOccupancyChart" width="540" height="290" role="img" aria-label="Occupied versus vacant units"></canvas></div><div class="card"><h2>Rental listing chart</h2><canvas id="rhRentalChart" width="540" height="290" role="img" aria-label="For rent versus not listed units"></canvas></div></div><div style="margin-top:16px">${oldReports()}</div>`;};
function chart(id,items){const el=document.getElementById(id);if(!el)return;const ctx=el.getContext('2d');if(!ctx)return;ctx.clearRect(0,0,540,290);const max=Math.max(1,...items.map(x=>x[1]));items.forEach(([label,value],i)=>{const y=45+i*95;ctx.fillStyle='#303750';ctx.font='16px sans-serif';ctx.fillText(label,18,y);ctx.fillStyle='#e8e5f6';ctx.fillRect(18,y+13,440,30);ctx.fillStyle=i?'#8ddccf':'#a99af1';ctx.fillRect(18,y+13,440*value/max,30);ctx.fillStyle='#303750';ctx.fillText(String(value),470,y+36);});}
const oldRender=window.render;
window.render=function(){syncFromUnits();oldRender();if(state.authed&&state.view==='reports'){chart('rhOccupancyChart',[['Occupied',inventory.filter(u=>u.status==='Occupied').length],['Vacant',inventory.filter(u=>u.status==='Vacant').length]]);chart('rhRentalChart',[['For Rent',inventory.filter(u=>u.rental==='For Rent').length],['Not Listed',inventory.filter(u=>u.rental!=='For Rent').length]]);}};
})();
