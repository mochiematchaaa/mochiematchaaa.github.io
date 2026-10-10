/* ResidentHub admin enhancements. Browser-local demo data. */
(function(){
'use strict';
const KEY='residenthub_rental_inventory_v1';
let inventory;
try {const saved=JSON.parse(localStorage.getItem(KEY));inventory=Array.isArray(saved)?saved:null;}catch(e){}
if(!inventory) inventory=UNITS.map(u=>({unit:u.unit,resident:u.name==='—'?'':u.name,status:u.status==='Vacant'?'Vacant':'Occupied',rental:u.usage==='tenant'||u.usage==='shortterm'?'For Rent':'Not Listed',notes:u.usageDetails||''}));
let selected=-1, editing=false;
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function store(){try{localStorage.setItem(KEY,JSON.stringify(inventory));}catch(e){alert('Could not save: browser storage is full or disabled.');return false;}return true;}
function rentalPage(){const counts={Vacant:0,Occupied:0,'For Rent':0};inventory.forEach(u=>{if(u.status==='Vacant')counts.Vacant++;if(u.status==='Occupied')counts.Occupied++;if(u.rental==='For Rent')counts['For Rent']++;});return `<div class="rental-summary">${['For Rent','Vacant','Occupied'].map(k=>`<div class="card"><span>${k}</span><strong>${counts[k]}</strong></div>`).join('')}</div><div class="card" style="margin-top:16px"><h2>Unit rental & occupancy registry</h2><p class="hint">Select a row, then edit its details. Click Save to keep changes in this browser.</p><div class="rental-tools"><button class="btn primary" onclick="rhRentalAdd()">+ Add</button><button class="btn" onclick="rhRentalEdit()">Edit</button><button class="btn" onclick="rhRentalRemove()">Remove</button><button class="btn primary" onclick="rhRentalSave()">Save</button></div><div class="rental-table-wrap"><table><thead><tr><th>Select</th><th>Unit</th><th>Resident / owner</th><th>Occupancy</th><th>Rental listing</th><th>Notes</th></tr></thead><tbody>${inventory.map((u,i)=>`<tr class="${selected===i?'selected':''}" onclick="rhRentalSelect(${i})"><td><input type="radio" name="rhRentalSelection" ${selected===i?'checked':''} aria-label="Select ${safe(u.unit)}"></td>${['unit','resident','status','rental','notes'].map(k=>`<td>${editing&&selected===i?(k==='status'||k==='rental'?`<select data-rh-field="${k}" onchange="rhRentalChange('${k}',this.value)">${(k==='status'?['Occupied','Vacant']:['For Rent','Not Listed']).map(v=>`<option ${u[k]===v?'selected':''}>${v}</option>`).join('')}</select>`:`<input data-rh-field="${k}" value="${safe(u[k])}" oninput="rhRentalChange('${k}',this.value)">`):safe(u[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;}
window.rhRentalSelect=i=>{selected=i;editing=false;render();};
window.rhRentalAdd=()=>{inventory.push({unit:'',resident:'',status:'Vacant',rental:'Not Listed',notes:''});selected=inventory.length-1;editing=true;render();};
window.rhRentalEdit=()=>{if(selected<0){alert('Select a row first.');return;}editing=true;render();};
window.rhRentalChange=(field,value)=>{if(selected>=0)inventory[selected][field]=value;};
window.rhRentalRemove=()=>{if(selected<0){alert('Select a row first.');return;}if(!confirm('Remove the selected unit?'))return;inventory.splice(selected,1);selected=-1;editing=false;render();};
window.rhRentalSave=()=>{if(inventory.some(u=>!u.unit.trim())){alert('Enter a unit identifier for every row before saving.');return;}const ids=inventory.map(u=>u.unit.trim().toLowerCase());if(new Set(ids).size!==ids.length){alert('Unit identifiers must be unique.');return;}if(store()){editing=false;render();if(typeof toast==='function')toast('Unit rental records saved.');}};
window.viewRentals=rentalPage;
// Add searchable, prominent matching results. Search works on actual record content.
const previousSearch=window.runSearch;
window.runSearch=function(query){const output=document.getElementById('qOut');if(!output)return;const q=query.trim().toLocaleLowerCase();if(!q){output.hidden=true;return;}let results=[];function add(title,description,view){if((title+' '+description).toLocaleLowerCase().includes(q))results.push({title,description,view});}
UNITS.forEach(u=>add(u.unit,u.name+' '+u.status+' '+u.contact,'units'));
inventory.forEach(u=>add(u.unit,u.resident+' '+u.status+' '+u.rental+' '+u.notes,'rentals'));
ANNOUNCEMENTS.forEach(a=>add(a.title,a.body,'ann'));
EVENTS.forEach(e=>add(e.title,e.date+' '+e.place,'ann'));
GRIEVANCES.forEach(g=>add(g.title,g.by,'req'));
FACILITIES.forEach(f=>add(f.name,f.hours,'fac'));
if(typeof POLLS!=='undefined')POLLS.forEach(p=>add(p.q,'Poll','polls'));
const unique=[];const seen=new Set();for(const r of results){const key=r.title+'|'+r.view;if(!seen.has(key)){unique.push(r);seen.add(key);}if(unique.length>=12)break;}
output.innerHTML=unique.length?unique.map(r=>`<button type="button" onclick="set({view:'${r.view}'})"><b>${safe(r.title)}</b><small>${safe(r.description)}</small></button>`).join(''):`<p>No matches for “${safe(query)}”.</p>`;output.hidden=false;};
// Charts drawn with native canvas, no external chart library.
const oldReports=window.viewReports;
window.viewReports=function(){return `<div class="rh-chart-grid"><div class="card"><h2>Unit occupancy chart</h2><canvas id="rhOccupancyChart" width="540" height="290" role="img" aria-label="Occupied versus vacant units"></canvas></div><div class="card"><h2>Rental listing chart</h2><canvas id="rhRentalChart" width="540" height="290" role="img" aria-label="For rent versus not listed units"></canvas></div></div><div style="margin-top:16px">${oldReports()}</div>`;};
function chart(id,items){const el=document.getElementById(id);if(!el)return;const ctx=el.getContext('2d');if(!ctx)return;ctx.clearRect(0,0,540,290);const max=Math.max(1,...items.map(x=>x[1]));items.forEach(([label,value],i)=>{const y=45+i*95;ctx.fillStyle='#303750';ctx.font='16px sans-serif';ctx.fillText(label,18,y);ctx.fillStyle='#e8e5f6';ctx.fillRect(18,y+13,440,30);ctx.fillStyle=i?'#8ddccf':'#a99af1';ctx.fillRect(18,y+13,440*value/max,30);ctx.fillStyle='#303750';ctx.fillText(String(value),470,y+36);});}
const oldRender=window.render;
window.render=function(){oldRender();if(state.authed&&state.view==='reports'){chart('rhOccupancyChart',[['Occupied',inventory.filter(u=>u.status==='Occupied').length],['Vacant',inventory.filter(u=>u.status==='Vacant').length]]);chart('rhRentalChart',[['For Rent',inventory.filter(u=>u.rental==='For Rent').length],['Not Listed',inventory.filter(u=>u.rental!=='For Rent').length]]);}};
})();
