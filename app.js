const DEFAULT_ROLL_TYPES=["5.3/36","5.3/43","6.3/36","6.35/43","6.5/43","6.5/36","7.1/36","7.1/45","7.3/55","8.0/60","8.6/80","9.3/50","9.75/80","9.75/50L","10.5/50","10.25/90","10.5/70","13.0/70","10.9/65","6.3/43","6.4/55","7.5/50Lam","8.9/50L","8.5/50L","9.1/45","9.1/55","9.0/80","10.25/80"];
const KEY='rollCount.current.v1',HKEY='rollCount.history.v1',SKEY='rollCount.scrap.v1',TKEY='rollCount.types.v2',CKEY='rollCount.consumption.v1',SHIFTKEY='rollCount.shift.v1',PENDINGKEY='rollCount.sharedPending.v1';
const $=s=>document.querySelector(s);const list=$('#rollList');
function load(k,fallback){try{const v=localStorage.getItem(k);return v===null?fallback:JSON.parse(v)}catch{return fallback}}
function normalizeType(s){let v=String(s||'').trim().replace(/\s+/g,'').replace(/\\/g,'/');if(!v.includes('/')){const m=v.match(/^([0-9]+(?:\.[0-9]+)?)\.([0-9]+(?:\.[0-9]+)?)([A-Za-z]*)$/);if(m)v=`${m[1]}/${m[2]}${m[3]}`;}return v;}
function typeParts(type){const s=normalizeType(type);const m=s.match(/^([0-9]+(?:\.[0-9]+)?)\/([0-9]+(?:\.[0-9]+)?)(.*)$/i);if(!m)return [Number.POSITIVE_INFINITY,Number.POSITIVE_INFINITY,s.toLowerCase()];return [Number(m[1]),Number(m[2]),m[3].toLowerCase()];}
function sortTypes(arr){return [...new Set(arr.map(normalizeType).filter(Boolean))].sort((a,b)=>{const A=typeParts(a),B=typeParts(b);return A[0]-B[0]||A[1]-B[1]||A[2].localeCompare(B[2])||a.localeCompare(b,undefined,{numeric:true});});}
let rollTypes=sortTypes(load(TKEY,DEFAULT_ROLL_TYPES));
let data=load(KEY,{}),history=load(HKEY,[]),scrap=String(load(SKEY,'')),consumption=String(load(CKEY,'')),shift=String(load(SHIFTKEY,''));
function ensureData(){for(const t of rollTypes)if(!data[t])data[t]={a1:'',a2:'',line:'',other:''};for(const t of Object.keys(data))if(!rollTypes.includes(t))delete data[t];}
ensureData();
function blank(){return Object.fromEntries(rollTypes.map(t=>[t,{a1:'',a2:'',line:'',other:''}]))}
function save(){localStorage.setItem(KEY,JSON.stringify(data));localStorage.setItem(SKEY,JSON.stringify(scrap));localStorage.setItem(TKEY,JSON.stringify(rollTypes));localStorage.setItem(CKEY,JSON.stringify(consumption))}
function n(v){const x=parseInt(v,10);return Number.isFinite(x)&&x>0?x:0}
function scrapN(){const x=parseInt(scrap,10);return Number.isFinite(x)&&x>=0?x:0}
function totalFor(t){const d=data[t]||{};return n(d.a1)+n(d.a2)+n(d.line)+n(d.other)}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function field(t,k,slot,val){return `<div class="field"><input inputmode="numeric" pattern="[0-9]*" enterkeyhint="done" aria-label="${esc(t)} count ${slot}" data-type="${esc(t)}" data-key="${k}" value="${esc(val||'')}" placeholder="${esc(t)}"></div>`}
function render(){ensureData();list.innerHTML=rollTypes.map(t=>{const d=data[t]||{};return `<article class="roll-card"><div class="roll-card-head"><button type="button" class="roll-type-title" data-manage-type="${esc(t)}" aria-label="Edit ${esc(t)}">${esc(t)}</button></div><div class="fields">${field(t,'a1',1,d.a1)}${field(t,'a2',2,d.a2)}${field(t,'line',3,d.line)}${field(t,'other',4,d.other)}</div></article>`}).join('');
  list.querySelectorAll('input').forEach(inp=>inp.addEventListener('input',e=>{const {type,key}=e.target.dataset;let v=e.target.value.replace(/\D/g,'').slice(0,3);e.target.value=v;if(!data[type])data[type]={a1:'',a2:'',line:'',other:''};data[type][key]=v;save();updateSummary()}));
  list.querySelectorAll('[data-manage-type]').forEach(btn=>btn.addEventListener('click',()=>openRollDialog(btn.dataset.manageType)));
  $('#scrapInput').value=scrap; updateSummary();renderHistory();renderConsumption();
}
function inStock(){return rollTypes.map(t=>({type:t,total:totalFor(t)})).filter(x=>x.total>0)}
function scrapState(v){return v===0?'good':'bad'}
function updateScrapVisual(){const v=scrapN(),state=scrapState(v),input=$('#scrapInput'),badge=$('#scrapBadge'),metric=$('#scrapMetric');input.classList.remove('scrap-good','scrap-bad');input.classList.add(`scrap-${state}`);badge.className=`scrap-badge ${state}`;badge.textContent=v===0?'ZERO':'SCRAP';metric.className=`metric-value scrap-${state}-text`;metric.textContent=v.toLocaleString();}
function extruderForRoll(roll){
  const prefix=(String(roll||'').trim().match(/^(\d{2})/)||[])[1];
  return ({'16':1,'26':2,'36':3,'46':4})[prefix]||null;
}
function sortConsumptionItems(items){
  return items.map((x,i)=>({...x,extruder:extruderForRoll(x.roll),_sourceOrder:i}))
    .sort((a,b)=>(a.extruder??99)-(b.extruder??99)||a._sourceOrder-b._sourceOrder);
}
function extruderInlineStyle(extruder){
  return ({
    1:'background:#dcecff;color:#155c9d;border:1px solid #bed8f4;',
    2:'background:#fff0d8;color:#8a5a00;border:1px solid #f3d2a2;',
    3:'background:#daf3e8;color:#14705a;border:1px solid #b8e1d2;',
    4:'background:#eadffc;color:#5d3aa6;border:1px solid #d3c3f3;'
  })[extruder]||'background:#eef2f5;color:#536472;border:1px solid #d5dee6;';
}
function parseConsumption(text){
  const items=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(line=>{
    const roll=(line.match(/Roll:\s*([^,]+)/i)||[])[1];
    const des=(line.match(/Designator:\s*([^,]+?)(?=\s+(?:has\b|was\b|is\b|will\b|$))/i)||[])[1]||(line.match(/Designator:\s*([^,]+)/i)||[])[1];
    if(!roll||!des)return null;
    const idx=line.toLowerCase().indexOf('designator:');
    let tail='';
    if(idx>=0){
      const after=line.slice(idx+'designator:'.length).trim();
      tail=after.slice(des.length).trim().replace(/^,\s*/,'');
    }
    return {roll:roll.trim(),designator:des.trim(),status:tail};
  }).filter(Boolean);
  return sortConsumptionItems(items);
}
function consumptionText(){
  const items=parseConsumption(consumption);
  if(!items.length)return '';
  return ['ROLL CONSUMPTION',`Consumed ${items.length} ${items.length===1?'roll':'rolls'}.`,
    ...items.map(x=>`${x.roll}${x.extruder?` | Extruder ${x.extruder}`:''} | ${x.designator}${x.status?' | '+x.status:''}`)
  ].join('\n');
}
function renderConsumption(){
  const items=parseConsumption(consumption),box=$('#consumptionPreview');
  if(!box)return;
  $('#consumptionInput').value=consumption;
  if(!items.length){box.classList.add('hidden');box.innerHTML='';return}
  box.classList.remove('hidden');
  box.innerHTML=`<div class="consumption-title">Roll Consumption</div>
    <div class="consumption-count">Consumed ${items.length} ${items.length===1?'roll':'rolls'}.</div>
    ${items.map(x=>`<div class="consumption-row">
      <div class="consumption-roll-line">
        <div class="consumption-roll">${esc(x.roll)}</div>
        ${x.extruder?`<span class="extruder-badge extruder-${x.extruder}">Extruder ${x.extruder}</span>`:''}
      </div>
      <div class="consumption-meta">${esc(x.designator)}${x.status?' · '+esc(x.status):''}</div>
    </div>`).join('')}`;
}
function updateSummary(){const rows=inStock(),gt=rows.reduce((s,x)=>s+x.total,0),sv=scrapN(),ss=scrapState(sv);$('#typesInStock').textContent=rows.length;$('#grandTotal').textContent=gt.toLocaleString();$('#reportTotal').textContent=gt.toLocaleString();$('#reportTableTotal').textContent=gt.toLocaleString();$('#reportScrap').textContent=sv.toLocaleString();$('#summaryEmpty').style.display=rows.length?'none':'block';$('#summaryList').innerHTML=rows.map(x=>`<div class="summary-row"><span>${esc(x.type)}</span><strong>${x.total.toLocaleString()}</strong></div>`).join('');
  const top=$('#reportScrapCard');top.className=`hero-metric scrap ${ss}`;updateScrapVisual();}
function dateLong(){return new Date().toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'})}
function reportText(){const rows=inStock(),gt=rows.reduce((s,x)=>s+x.total,0),sv=scrapN();const divider='------------------------------';const ct=consumptionText();return ['ROLL COUNT REPORT',`${dateLong()}${shift?` • Shift ${shift}`:''}`,divider,...rows.map(x=>`${x.type.padEnd(12,' ')} ${String(x.total).padStart(3,' ')} rolls`),divider,`TOTAL ROLLS: ${gt}`,`SCRAP: ${sv.toLocaleString()}`,...(ct?['',ct]:[])].join('\n')}
function reportRichHTML(){
  const rows=inStock(),gt=rows.reduce((s,x)=>s+x.total,0),sv=scrapN(),bad=sv>0;
  const scrapBg=bad?'#fde8e7':'#e7f5eb',scrapInk=bad?'#b42318':'#14733b',scrapBorder=bad?'#df9b9b':'#afd0aa';
  const citems=parseConsumption(consumption);
  const consumptionHTML=citems.length?`<div style="margin-top:14px;border:1px solid #d5dee6;border-radius:12px;overflow:hidden;">
    <div style="padding:10px 12px;background:#123b5d;color:#fff;font-size:12px;font-weight:900;text-transform:uppercase;">ROLL CONSUMPTION</div>
    <div style="padding:10px 12px;background:#f1f7ff;color:#0b4e9d;font-size:18px;font-weight:900;">Consumed ${citems.length} ${citems.length===1?'roll':'rolls'}.</div>
    ${citems.map(x=>`<div style="padding:9px 12px;border-top:1px solid #e2e7eb;">
      <div style="font-weight:900;color:#123b5d;">
        ${esc(x.roll)}
        ${x.extruder?`<span style="display:inline-block;margin-left:8px;padding:3px 9px;border-radius:999px;font-size:12px;font-weight:800;vertical-align:2px;${extruderInlineStyle(x.extruder)}">Extruder ${x.extruder}</span>`:''}
      </div>
      <div style="margin-top:2px;font-size:13px;color:#687684;">${esc(x.designator)}${x.status?' · '+esc(x.status):''}</div>
    </div>`).join('')}
  </div>`:'';
  const bodyRows=rows.length?rows.map(x=>`<tr><td style="width:62%;padding:9px 12px;border-top:1px solid #e2e7eb;font-family:Arial,sans-serif;font-size:18px;font-weight:700;color:#102b42;">${esc(x.type)}</td><td style="width:38%;padding:7px 10px;border-top:1px solid #e2e7eb;border-left:1px solid #e2e7eb;text-align:center;font-family:Arial,sans-serif;font-size:34px;line-height:1;font-weight:900;color:#123b5d;">${x.total.toLocaleString()}</td></tr>`).join(''):`<tr><td colspan="2" style="padding:18px;text-align:center;color:#6b7c8a;font-family:Arial,sans-serif;">No rolls entered yet.</td></tr>`;
  return `<div style="max-width:540px;background:#ffffff;padding:22px;border:1px solid #d5dee6;border-radius:18px;font-family:Arial,sans-serif;color:#102b42;">
    <div style="margin-bottom:16px;"><div style="font-size:28px;line-height:1.1;font-weight:900;color:#123b5d;">ROLL COUNT REPORT</div><div style="margin-top:5px;font-size:14px;color:#6b7c8a;">${esc(dateLong())}${shift?` • Shift ${esc(shift)}`:''}</div></div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate;border-spacing:10px 0;margin:0 -10px 14px;width:calc(100% + 20px);"><tr>
      <td style="width:50%;padding:12px 14px;text-align:center;background:#f1f7ff;border:1.5px solid #b7d1ef;border-radius:14px;color:#0b4e9d;"><div style="font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;">TOTAL ROLLS</div><div style="font-size:28px;line-height:1;font-weight:900;">${gt.toLocaleString()}</div></td>
      <td style="width:50%;padding:12px 14px;text-align:center;background:${scrapBg};border:1.5px solid ${scrapBorder};border-radius:14px;color:${scrapInk};"><div style="font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;">SCRAP</div><div style="font-size:28px;line-height:1;font-weight:900;">${sv.toLocaleString()}</div></td>
    </tr></table>
    <table cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:separate;border-spacing:0;border:1px solid #d5dee6;border-radius:12px;overflow:hidden;">
      <tr><th style="width:62%;padding:10px 12px;background:#123b5d;color:#fff;text-align:left;font-size:12px;text-transform:uppercase;">ROLL COUNT</th><th style="width:38%;padding:10px 10px;background:#123b5d;color:#fff;text-align:center;font-size:12px;text-transform:uppercase;border-left:1px solid #7992a7;">COUNT</th></tr>
      ${bodyRows}
      <tr><td style="padding:11px 14px;border-top:1px solid #d5dee6;background:#f6f9fc;font-size:14px;font-weight:900;color:#1557a5;text-transform:uppercase;">TOTAL</td><td style="padding:9px 14px;border-top:1px solid #d5dee6;border-left:1px solid #d5dee6;background:#f6f9fc;text-align:center;font-size:34px;font-weight:900;color:#1557a5;">${gt.toLocaleString()}</td></tr>
    </table>
    ${consumptionHTML}
  </div>`;
}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(window.__tt);window.__tt=setTimeout(()=>t.classList.remove('show'),1800)}
function showShareMenu(){
  const dlg=$('#shareDialog');
  if(dlg)dlg.showModal();
}
function closeShareMenu(){
  const dlg=$('#shareDialog');
  if(dlg&&dlg.open)dlg.close();
}
function legacyRichCopy(html){
  const holder=document.createElement('div');
  holder.setAttribute('contenteditable','true');
  holder.style.position='fixed';
  holder.style.left='-9999px';
  holder.style.top='0';
  holder.style.width='560px';
  holder.innerHTML=html;
  document.body.appendChild(holder);
  const range=document.createRange();
  range.selectNodeContents(holder);
  const sel=window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  let ok=false;
  try{ok=document.execCommand('copy')}catch{}
  sel.removeAllRanges();
  holder.remove();
  return ok;
}
async function copyFormattedReport(silent=false){
  const text=reportText(),html=reportRichHTML();
  try{
    if(navigator.clipboard&&window.ClipboardItem){
      const item=new ClipboardItem({
        'text/html':new Blob([html],{type:'text/html'}),
        'text/plain':new Blob([text],{type:'text/plain'})
      });
      await navigator.clipboard.write([item]);
      if(!silent)toast('Formatted report copied');
      return true;
    }
  }catch{}
  if(legacyRichCopy(html)){
    if(!silent)toast('Formatted report copied');
    return true;
  }
  try{
    await navigator.clipboard.writeText(text);
    if(!silent)toast('Copied as text (rich format unavailable)');
    return false;
  }catch{
    const ta=document.createElement('textarea');
    ta.value=text;
    ta.style.position='fixed';
    ta.style.left='-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    if(!silent)toast('Copied as text');
    return false;
  }
}
async function copyReport(){return copyFormattedReport(false)}
async function emailReport(){
  const copiedRich=await copyFormattedReport(true);
  closeShareMenu();
  const subject=encodeURIComponent(`Roll Count Report - ${dateLong()}`);
  const fallbackBody=copiedRich?'':`&body=${encodeURIComponent(reportText())}`;
  window.location.href=`mailto:?subject=${subject}${fallbackBody}`;
  if(copiedRich)setTimeout(()=>toast('Formatted report copied — paste it into Outlook with Ctrl+V'),250);
}
async function systemShareReport(){
  closeShareMenu();
  const text=reportText();
  try{
    if(navigator.share){
      await navigator.share({title:`Roll Count Report - ${dateLong()}`,text});
    }else{
      await copyFormattedReport(false);
    }
  }catch(e){
    if(e.name!=='AbortError')toast('Unable to share');
  }
}
async function newDay(){
  const rows=inStock(),gt=rows.reduce((s,x)=>s+x.total,0),sv=scrapN(),items=parseConsumption(consumption);
  if(!shift){toast('Select Shift A, B, C or D first');$('#shiftSelect').focus();return}
  if(!rows.length&&sv===0&&!items.length){
    if(confirm('Everything is already clear. Start a fresh count?')){data=blank();scrap='';consumption='';save();render()}
    return;
  }
  if(!confirm(`Save ${shift} Shift (${gt} rolls, scrap ${sv}, ${items.length} consumed) to history and clear all entries?`))return;
  const payload={date:localDateISO(),shift,savedAt:new Date().toISOString(),rows,grandTotal:gt,scrap:sv,consumption:items.map(x=>({roll:x.roll,extruder:x.extruder,designator:x.designator,status:x.status}))};
  history.unshift({ts:payload.savedAt,date:payload.date,shift,rows,grandTotal:gt,scrap:sv});
  history=history.slice(0,60);localStorage.setItem(HKEY,JSON.stringify(history));
  const sharedOk=await saveSharedPayload(payload);
  data=blank();scrap='';consumption='';save();render();window.scrollTo({top:0,behavior:'smooth'});
  toast(sharedOk?'Saved to shared history':'Saved locally — shared sync pending');
}
function renderHistory(){const box=$('#historyList');if(!history.length){box.innerHTML='<div class="empty-state">No saved days yet.</div>';return}box.innerHTML=history.map(h=>{const d=new Date(h.ts).toLocaleString([], {dateStyle:'medium',timeStyle:'short'});const sv=Number.isFinite(h.scrap)?h.scrap:0;return `<div class="history-item"><div class="date">${esc(d)}</div><div class="meta">${h.rows.length} types • ${h.grandTotal} rolls • Scrap ${sv}</div><details><summary>View details</summary><div class="history-lines">${h.rows.map(r=>`${esc(r.type)} — <strong>${r.total}</strong>`).join('<br>')}<br><strong>Scrap — ${sv}</strong></div></details></div>`}).join('')}

function localDateISO(d=new Date()){
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function currentMonthISO(){return localDateISO().slice(0,7)}
async function apiJSON(url,options={}){
  const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),4500);
  try{
    const r=await fetch(url,{...options,signal:ctrl.signal,headers:{'Content-Type':'application/json',...(options.headers||{})}});
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    return await r.json();
  }finally{clearTimeout(timer)}
}
async function refreshSharedStatus(){
  const el=$('#sharedStatus');if(!el)return false;
  el.className='shared-status checking shared-status-button';el.textContent='Shared Data…';
  try{
    const st=await apiJSON('/api/shared/status');
    if(st.connected){el.className='shared-status connected shared-status-button';el.textContent='Shared Data Connected';return true}
    if(st.setupRequired){el.className='shared-status offline shared-status-button';el.textContent='Connect Teams';return false}
  }catch{}
  el.className='shared-status offline shared-status-button';el.textContent=['127.0.0.1','localhost'].includes(location.hostname)?'Local Only':'Connect Teams';return false;
}
function pendingShared(){return load(PENDINGKEY,[])}
function setPendingShared(v){localStorage.setItem(PENDINGKEY,JSON.stringify(v.slice(-30)))}
async function pushSharedPayload(payload){
  await apiJSON('/api/shared/snapshot',{method:'POST',body:JSON.stringify(payload)});
  if(payload.consumption&&payload.consumption.length){
    await apiJSON('/api/shared/consumption',{method:'POST',body:JSON.stringify({date:payload.date,shift:payload.shift,savedAt:payload.savedAt,items:payload.consumption})});
  }
  return true;
}
async function syncPendingShared(){
  let q=pendingShared();if(!q.length)return true;
  const remain=[];
  for(const item of q){try{await pushSharedPayload(item)}catch{remain.push(item)}}
  setPendingShared(remain);
  return remain.length===0;
}
async function saveSharedPayload(payload){
  try{await pushSharedPayload(payload);await syncPendingShared();await refreshSharedStatus();return true}
  catch{const q=pendingShared();q.push(payload);setPendingShared(q);await refreshSharedStatus();return false}
}
function setHistoryTab(which){
  const rc=which==='roll';
  $('#rollCountHistoryTab').classList.toggle('active',rc);$('#consumptionHistoryTab').classList.toggle('active',!rc);
  $('#rollCountHistoryPanel').classList.toggle('hidden',!rc);$('#consumptionHistoryPanel').classList.toggle('hidden',rc);
}
async function openSharedHistory(){
  $('#historyDialog').showModal();setHistoryTab('roll');
  $('#historyMonth').value=$('#historyMonth').value||currentMonthISO();
  await loadSharedRollCountHistory();
}
async function loadSharedRollCountHistory(){
  const box=$('#sharedRollCountHistory');box.innerHTML='<div class="empty-state">Loading shared history…</div>';
  try{
    const out=await apiJSON('/api/shared/snapshots?limit=120');
    const items=out.items||[];
    if(!items.length){box.innerHTML='<div class="empty-state">No shared Roll Count snapshots yet.</div>';return}
    box.innerHTML=items.map(h=>`<div class="history-item"><div class="date">${esc(h.date||'')} <span class="snapshot-shift">Shift ${esc(h.shift||'?')}</span></div><div class="meta">${Number(h.grandTotal||0).toLocaleString()} rolls • Scrap ${Number(h.scrap||0).toLocaleString()}</div><details><summary>View snapshot</summary><div class="history-lines">${(h.rows||[]).map(r=>`${esc(r.type)} — <strong>${Number(r.total||0).toLocaleString()}</strong>`).join('<br>')}<br><strong>TOTAL — ${Number(h.grandTotal||0).toLocaleString()}</strong><br><strong>SCRAP — ${Number(h.scrap||0).toLocaleString()}</strong></div></details></div>`).join('');
  }catch{box.innerHTML='<div class="empty-state">Shared history is unavailable on this device.</div>'}
}
let lastConsumptionHistory=[];
async function loadConsumptionHistory(){
  const box=$('#sharedConsumptionHistory'),sum=$('#consumptionHistorySummary');
  const month=$('#historyMonth').value||currentMonthISO(),sh=$('#historyShift').value,ex=$('#historyExtruder').value;
  box.innerHTML='<div class="empty-state">Loading report…</div>';sum.classList.remove('show');
  const qs=new URLSearchParams({month});if(sh)qs.set('shift',sh);if(ex)qs.set('extruder',ex);
  try{
    const out=await apiJSON('/api/shared/consumption?'+qs.toString());lastConsumptionHistory=out.items||[];
    const label=[month,sh?`Shift ${sh}`:'All shifts',ex?`Extruder ${ex}`:'All extruders'].join(' • ');
    sum.textContent=`${label} — ${lastConsumptionHistory.length} consumed ${lastConsumptionHistory.length===1?'roll':'rolls'}`;sum.classList.add('show');
    if(!lastConsumptionHistory.length){box.innerHTML='<div class="empty-state">No matching consumed rolls.</div>';return}
    box.innerHTML=lastConsumptionHistory.map(x=>`<div class="history-item"><div class="date">${esc(x.date)} <span class="snapshot-shift">Shift ${esc(x.shift)}</span>${x.extruder?` <span class="record-extruder">Extruder ${x.extruder}</span>`:''}</div><div class="meta"><strong>${esc(x.roll)}</strong> • ${esc(x.designator||'')}${x.status?' • '+esc(x.status):''}</div></div>`).join('');
  }catch{lastConsumptionHistory=[];box.innerHTML='<div class="empty-state">Shared consumption history is unavailable on this device.</div>'}
}
async function copyConsumptionHistoryReport(){
  const month=$('#historyMonth').value||currentMonthISO(),sh=$('#historyShift').value,ex=$('#historyExtruder').value;
  const lines=[`ROLL CONSUMPTION REPORT`,month,sh?`Shift: ${sh}`:'Shift: All',ex?`Extruder: ${ex}`:'Extruder: All',`Consumed rolls: ${lastConsumptionHistory.length}`,'------------------------------',...lastConsumptionHistory.map(x=>`${x.date} | Shift ${x.shift} | ${x.roll}${x.extruder?` | Extruder ${x.extruder}`:''} | ${x.designator||''}${x.status?` | ${x.status}`:''}`)];
  try{await navigator.clipboard.writeText(lines.join('\n'));toast('Consumption report copied')}catch{toast('Unable to copy report')}
}
function openRollDialog(existing=''){const dlg=$('#rollTypeDialog');$('#editingRollType').value=existing;$('#rollTypeInput').value=existing.replace(/L$/i,'');$('#laminatedInput').checked=/L$/i.test(existing);$('#rollDialogTitle').textContent=existing?'Edit Roll Type':'Add Roll Type';$('#deleteRollTypeBtn').classList.toggle('hidden',!existing);dlg.showModal();setTimeout(()=>$('#rollTypeInput').focus(),50)}
function closeRollDialog(){$('#rollTypeDialog').close()}
function saveRollType(){const oldType=$('#editingRollType').value;let newType=normalizeType($('#rollTypeInput').value).replace(/L$/i,'');if($('#laminatedInput').checked)newType+='L';if(!/^\d+(?:\.\d+)?\/\d+(?:\.\d+)?[A-Za-z]*$/.test(newType)){toast('Use a format like 5.5/50');return}if(newType!==oldType&&rollTypes.some(t=>t.toLowerCase()===newType.toLowerCase())){toast('That roll type already exists');return}
  if(oldType){const oldData=data[oldType]||{a1:'',a2:'',line:'',other:''};rollTypes=rollTypes.filter(t=>t!==oldType);delete data[oldType];rollTypes.push(newType);data[newType]=oldData;}else{rollTypes.push(newType);data[newType]={a1:'',a2:'',line:'',other:''};}
  rollTypes=sortTypes(rollTypes);save();closeRollDialog();render();toast(oldType?'Roll type updated':'Roll type added');
}
function deleteRollType(){const type=$('#editingRollType').value;if(!type)return;const total=totalFor(type);if(total>0&&!confirm(`${type} currently has ${total} rolls entered. Delete this roll type and its counts?`))return;if(total===0&&!confirm(`Delete ${type}?`))return;rollTypes=rollTypes.filter(t=>t!==type);delete data[type];save();closeRollDialog();render();toast('Roll type deleted')}

/* v7.3 — Viejito automatic shift + explicit Save + reliable shared write + native Outlook draft */
(function(root){
  'use strict';
  const DAY_START_HOUR=7;
  const NIGHT_START_HOUR=19;
  const ANCHOR_DAY=new Date(2019,0,1,12,0,0,0);
  const ROTATION=Object.freeze(['CD','AB','AB','CD','CD','CD','AB','AB','CD','CD','AB','AB','AB','CD']);
  function startOfLocalDay(value){const d=value instanceof Date?new Date(value):new Date(value);if(Number.isNaN(d.getTime()))return null;return new Date(d.getFullYear(),d.getMonth(),d.getDate(),12,0,0,0)}
  function dayKey(value){const d=value instanceof Date?value:new Date(value);if(Number.isNaN(d.getTime()))return '';return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function addDays(value,days){const d=value instanceof Date?new Date(value):new Date(value);d.setDate(d.getDate()+Number(days||0));return d}
  function assignmentForDate(value){const d=startOfLocalDay(value);if(!d)return null;const anchor=startOfLocalDay(ANCHOR_DAY);const days=Math.round((d-anchor)/86400000);const idx=((days%ROTATION.length)+ROTATION.length)%ROTATION.length;return ROTATION[idx]}
  function shiftAt(value=new Date()){
    const now=value instanceof Date?new Date(value):new Date(value);if(Number.isNaN(now.getTime()))return null;
    const hour=now.getHours(),preSeven=hour<DAY_START_HOUR,workDate=preSeven?addDays(now,-1):new Date(now),pair=assignmentForDate(workDate),isDay=!preSeven&&hour<NIGHT_START_HOUR;
    const code=pair==='AB'?(isDay?'A':'B'):(isDay?'C':'D'),type=isDay?'day':'night';
    const start=new Date(workDate.getFullYear(),workDate.getMonth(),workDate.getDate(),isDay?DAY_START_HOUR:NIGHT_START_HOUR,0,0,0);
    const end=isDay?new Date(workDate.getFullYear(),workDate.getMonth(),workDate.getDate(),NIGHT_START_HOUR,0,0,0):new Date(workDate.getFullYear(),workDate.getMonth(),workDate.getDate()+1,DAY_START_HOUR,0,0,0);
    return {code,pair,type,workDate:dayKey(workDate),start:start.toISOString(),end:end.toISOString()};
  }
  root.ViejitoShiftSchedule={DAY_START_HOUR,NIGHT_START_HOUR,ROTATION,assignmentForDate,shiftAt};
})(window);

const LASTSAVESIGKEY='rollCount.lastSavedSignature.v1';
function currentShiftInfo(){return window.ViejitoShiftSchedule.shiftAt(new Date())}
function refreshAutoShift(){
  const info=currentShiftInfo();
  if(!info)return null;
  shift=info.code;
  localStorage.setItem(SHIFTKEY,JSON.stringify(shift));
  const sel=$('#shiftSelect');if(sel)sel.value=shift;
  const badge=$('#autoShiftBadge');if(badge){badge.textContent=`Shift ${shift} · Auto`;badge.title=`${info.type==='day'?'Day':'Night'} shift • Work date ${info.workDate}`}
  return info;
}
function displayDateFromISO(iso){
  const m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return new Date();
  return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12,0,0,0);
}
function dateLong(){
  const info=currentShiftInfo();const d=info?displayDateFromISO(info.workDate):new Date();
  return d.toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'});
}
function workDateISO(){return currentShiftInfo()?.workDate||localDateISO()}
function reportSignature(){
  return JSON.stringify({date:workDateISO(),shift:currentShiftInfo()?.code||shift,rows:inStock(),scrap:scrapN(),consumption:parseConsumption(consumption).map(x=>[x.roll,x.extruder,x.designator,x.status])});
}
function reportText(){
  const rows=inStock(),gt=rows.reduce((s,x)=>s+x.total,0),sv=scrapN(),info=currentShiftInfo(),sh=info?.code||shift,divider='------------------------------',ct=consumptionText();
  return ['ROLL COUNT REPORT',`${dateLong()} • Shift ${sh}`,divider,...rows.map(x=>`${x.type.padEnd(12,' ')} ${String(x.total).padStart(3,' ')} rolls`),divider,`TOTAL ROLLS: ${gt}`,`SCRAP: ${sv.toLocaleString()}`,...(ct?['',ct]:[])].join('\n');
}
function reportRichHTML(){
  const rows=inStock(),gt=rows.reduce((s,x)=>s+x.total,0),sv=scrapN(),bad=sv>0,citems=parseConsumption(consumption),info=currentShiftInfo(),sh=info?.code||shift;
  const scrapBg=bad?'#fde8e7':'#e7f5eb',scrapInk=bad?'#b42318':'#14733b',scrapBorder=bad?'#df9b9b':'#afd0aa';
  const bodyRows=rows.length?rows.map(x=>`<tr><td style="padding:5px 10px;border-top:1px solid #e2e7eb;font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#102b42;">${esc(x.type)}</td><td style="padding:5px 10px;border-top:1px solid #e2e7eb;border-left:1px solid #e2e7eb;text-align:center;font-family:Arial,sans-serif;font-size:22px;font-weight:900;color:#123b5d;">${x.total.toLocaleString()}</td></tr>`).join(''):`<tr><td colspan="2" style="padding:12px;text-align:center;color:#6b7c8a;font-family:Arial,sans-serif;">No rolls entered yet.</td></tr>`;
  const consumptionRows=citems.map(x=>`<tr>
    <td style="padding:5px 7px;border-top:1px solid #e2e7eb;font-family:Arial,sans-serif;font-size:12px;font-weight:800;color:#123b5d;white-space:nowrap;">${esc(x.roll)}</td>
    <td style="padding:5px 7px;border-top:1px solid #e2e7eb;text-align:center;font-family:Arial,sans-serif;font-size:11px;font-weight:800;white-space:nowrap;"><span style="display:inline-block;padding:2px 6px;border-radius:9px;${extruderInlineStyle(x.extruder)}">${x.extruder?`Extruder ${x.extruder}`:'—'}</span></td>
    <td style="padding:5px 7px;border-top:1px solid #e2e7eb;font-family:Arial,sans-serif;font-size:12px;color:#425466;white-space:nowrap;">${esc(x.designator||'')}</td>
    <td style="padding:5px 7px;border-top:1px solid #e2e7eb;font-family:Arial,sans-serif;font-size:12px;color:#425466;">${esc(x.status||'')}</td>
  </tr>`).join('');
  const consumptionHTML=citems.length?`<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:collapse;border:1px solid #d5dee6;margin-top:12px;">
    <tr><td colspan="4" style="padding:7px 9px;background:#123b5d;color:#fff;font-family:Arial,sans-serif;font-size:11px;font-weight:900;">ROLL CONSUMPTION — Consumed ${citems.length} ${citems.length===1?'roll':'rolls'}</td></tr>
    <tr><td style="padding:5px 7px;background:#f3f7fb;font-family:Arial,sans-serif;font-size:10px;font-weight:900;color:#536472;">ROLL</td><td style="padding:5px 7px;background:#f3f7fb;font-family:Arial,sans-serif;font-size:10px;font-weight:900;color:#536472;text-align:center;">SOURCE</td><td style="padding:5px 7px;background:#f3f7fb;font-family:Arial,sans-serif;font-size:10px;font-weight:900;color:#536472;">DESIGNATOR</td><td style="padding:5px 7px;background:#f3f7fb;font-family:Arial,sans-serif;font-size:10px;font-weight:900;color:#536472;">STATUS</td></tr>
    ${consumptionRows}
  </table>`:'';
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="620" style="width:620px;max-width:620px;border-collapse:collapse;background:#ffffff;border:1px solid #d5dee6;font-family:Arial,sans-serif;color:#102b42;">
    <tr><td style="padding:14px 16px 8px 16px;"><div style="font-size:24px;line-height:1.1;font-weight:900;color:#123b5d;">ROLL COUNT REPORT</div><div style="margin-top:4px;font-size:13px;color:#6b7c8a;">${esc(dateLong())} &nbsp;•&nbsp; Shift ${esc(sh)}</div></td></tr>
    <tr><td style="padding:0 16px 10px 16px;"><table role="presentation" cellpadding="0" cellspacing="6" width="100%" style="width:100%;"><tr>
      <td style="width:50%;padding:8px 10px;text-align:center;background:#f1f7ff;border:1px solid #b7d1ef;color:#0b4e9d;"><div style="font-size:10px;font-weight:900;">TOTAL ROLLS</div><div style="font-size:24px;font-weight:900;">${gt.toLocaleString()}</div></td>
      <td style="width:50%;padding:8px 10px;text-align:center;background:${scrapBg};border:1px solid ${scrapBorder};color:${scrapInk};"><div style="font-size:10px;font-weight:900;">SCRAP</div><div style="font-size:24px;font-weight:900;">${sv.toLocaleString()}</div></td>
    </tr></table></td></tr>
    <tr><td style="padding:0 16px 14px 16px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:collapse;border:1px solid #d5dee6;">
      <tr><td style="padding:6px 10px;background:#123b5d;color:#fff;font-size:11px;font-weight:900;">ROLL COUNT</td><td style="padding:6px 10px;background:#123b5d;color:#fff;font-size:11px;font-weight:900;text-align:center;">COUNT</td></tr>
      ${bodyRows}
      <tr><td style="padding:6px 10px;border-top:1px solid #d5dee6;background:#f6f9fc;font-size:12px;font-weight:900;color:#1557a5;">TOTAL</td><td style="padding:6px 10px;border-top:1px solid #d5dee6;border-left:1px solid #d5dee6;background:#f6f9fc;text-align:center;font-size:22px;font-weight:900;color:#1557a5;">${gt.toLocaleString()}</td></tr>
    </table>${consumptionHTML}</td></tr>
  </table>`;
}
function renderConsumption(){
  const items=parseConsumption(consumption),box=$('#consumptionPreview');if(!box)return;$('#consumptionInput').value=consumption;
  if(!items.length){box.classList.add('hidden');box.innerHTML='';return}
  box.classList.remove('hidden');
  box.innerHTML=`<div class="consumption-title">Roll Consumption</div><div class="consumption-count">Consumed ${items.length} ${items.length===1?'roll':'rolls'}.</div><div class="consumption-table-head"><span>Roll</span><span>Source</span><span>Designator</span><span>Status</span></div>${items.map(x=>`<div class="consumption-row compact-consumption-row"><div class="consumption-roll">${esc(x.roll)}</div><div>${x.extruder?`<span class="extruder-badge extruder-${x.extruder}">Extruder ${x.extruder}</span>`:'—'}</div><div class="consumption-designator">${esc(x.designator||'')}</div><div class="consumption-status">${esc(x.status||'')}</div></div>`).join('')}`;
}
async function emailReport(){
  closeShareMenu();
  const info=currentShiftInfo(),sh=info?.code||shift,subject=`Roll Count Report - ${dateLong()} - Shift ${sh}`;
  try{
    const out=await apiJSON('/api/outlook/draft',{method:'POST',body:JSON.stringify({subject,html:reportRichHTML(),text:reportText()})});
    if(out.opened){toast('Outlook draft opened with formatted report');return}
    throw new Error('Outlook unavailable');
  }catch{
    const copiedRich=await copyFormattedReport(true);
    const fallbackBody=copiedRich?'':`&body=${encodeURIComponent(reportText())}`;
    window.location.href=`mailto:?subject=${encodeURIComponent(subject)}${fallbackBody}`;
    if(copiedRich)setTimeout(()=>toast('Outlook fallback: formatted report copied — paste with Ctrl+V'),250);
  }
}
function buildSharedPayload(){
  const info=refreshAutoShift()||currentShiftInfo(),rows=inStock(),gt=rows.reduce((s,x)=>s+x.total,0),sv=scrapN(),items=parseConsumption(consumption);
  return {date:info?.workDate||localDateISO(),shift:info?.code||shift,savedAt:new Date().toISOString(),rows,grandTotal:gt,scrap:sv,consumption:items.map(x=>({roll:x.roll,extruder:x.extruder,designator:x.designator,status:x.status}))};
}
async function pushSharedPayload(payload){
  const out=await apiJSON('/api/shared/save',{method:'POST',body:JSON.stringify(payload)});
  if(!out.saved)throw new Error(out.error||'Shared save failed');
  return true;
}
async function syncPendingShared(){
  let q=pendingShared();if(!q.length)return true;const remain=[];
  for(const item of q){try{await pushSharedPayload(item)}catch{remain.push(item)}}
  setPendingShared(remain);return remain.length===0;
}
async function saveSharedPayload(payload){
  try{await pushSharedPayload(payload);await syncPendingShared();await refreshSharedStatus();return true}
  catch{
    let q=pendingShared().filter(x=>!(x.date===payload.date&&x.shift===payload.shift));q.push(payload);setPendingShared(q);await refreshSharedStatus();return false;
  }
}
function saveLocalSnapshot(payload){
  history=history.filter(h=>!(h.date===payload.date&&h.shift===payload.shift));
  history.unshift({ts:payload.savedAt,date:payload.date,shift:payload.shift,rows:payload.rows,grandTotal:payload.grandTotal,scrap:payload.scrap});
  history=history.slice(0,60);localStorage.setItem(HKEY,JSON.stringify(history));
}
async function saveReport(){
  const payload=buildSharedPayload();
  if(!payload.rows.length&&payload.scrap===0&&!payload.consumption.length){toast('Nothing to save yet');return}
  const btn=$('#saveReportBtn');if(btn){btn.disabled=true;btn.textContent='Saving…'}
  saveLocalSnapshot(payload);
  const ok=await saveSharedPayload(payload);
  if(ok)localStorage.setItem(LASTSAVESIGKEY,reportSignature());
  if(btn){btn.disabled=false;btn.textContent='Save'}
  toast(ok?`Shift ${payload.shift} saved to Teams`:`Shift ${payload.shift} saved locally — Teams sync pending`);
}
async function newDay(){
  const rows=inStock(),sv=scrapN(),items=parseConsumption(consumption);
  if(!rows.length&&sv===0&&!items.length){if(confirm('Everything is already clear. Start a fresh count?')){data=blank();scrap='';consumption='';save();render()}return}
  const last=localStorage.getItem(LASTSAVESIGKEY)||'';
  if(last!==reportSignature()&&!confirm('This report has changes that are not saved to Teams. Clear anyway?'))return;
  if(!confirm('Start a new day / clear the current Roll Count? Saved shared history will not be deleted.'))return;
  data=blank();scrap='';consumption='';save();localStorage.removeItem(LASTSAVESIGKEY);render();window.scrollTo({top:0,behavior:'smooth'});toast('New count started');
}


function renderHistory(){
  const box=$('#historyList');if(!box)return;
  if(!history.length){box.innerHTML='<div class="empty-state">No saved days yet.</div>';return}
  box.innerHTML=history.map(h=>{const d=new Date(h.ts).toLocaleString([], {dateStyle:'medium',timeStyle:'short'});const sv=Number.isFinite(h.scrap)?h.scrap:0;return `<div class="history-item"><div class="date">${esc(d)}</div><div class="meta">${h.rows.length} types • ${h.grandTotal} rolls • Scrap ${sv}</div></div>`}).join('');
}
async function apiJSON(url,options={}){
  const isDesktopHost=['127.0.0.1','localhost'].includes(location.hostname);
  if(!isDesktopHost&&String(url).startsWith('/api/shared/')){
    if(!window.RollCountTeamsGraph)throw new Error('Teams integration unavailable');
    return window.RollCountTeamsGraph.handleApi(url,options);
  }
  if(!isDesktopHost&&String(url).startsWith('/api/outlook/'))throw new Error('Native Outlook bridge is available in the Windows installed version');
  const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),15000);
  try{
    const r=await fetch(url,{...options,signal:ctrl.signal,headers:{'Content-Type':'application/json',...(options.headers||{})}});
    let body={};try{body=await r.json()}catch{}
    if(!r.ok)throw new Error(body.error||`HTTP ${r.status}`);
    return body;
  }finally{clearTimeout(timer)}
}

$('#consumptionInput').addEventListener('input',e=>{consumption=e.target.value;save();renderConsumption()});$('#clearConsumptionBtn').addEventListener('click',()=>{consumption='';save();renderConsumption();toast('Roll consumption cleared')});
$('#scrapInput').addEventListener('input',e=>{let v=e.target.value.replace(/\D/g,'').slice(0,7);e.target.value=v;scrap=v;save();updateSummary()});
$('#shareBtn').addEventListener('click',showShareMenu);$('#copyBtn').addEventListener('click',copyReport);$('#printBtn').addEventListener('click',()=>window.print());$('#printTopBtn').addEventListener('click',()=>window.print());$('#newDayBtn').addEventListener('click',newDay);$('#historyBtn').addEventListener('click',openSharedHistory);$('#closeHistory').addEventListener('click',()=>$('#historyDialog').close());
$('#emailShareBtn').addEventListener('click',emailReport);$('#systemShareBtn').addEventListener('click',systemShareReport);$('#closeShareDialog').addEventListener('click',closeShareMenu);
$('#addRollBtn').addEventListener('click',()=>openRollDialog());$('#closeRollDialog').addEventListener('click',closeRollDialog);$('#saveRollTypeBtn').addEventListener('click',saveRollType);$('#deleteRollTypeBtn').addEventListener('click',deleteRollType);$('#rollTypeInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();saveRollType()}});
refreshAutoShift();
setInterval(refreshAutoShift,60000);
$('#saveReportBtn').addEventListener('click',saveReport);
$('#rollCountHistoryTab').addEventListener('click',()=>{setHistoryTab('roll');loadSharedRollCountHistory()});
$('#consumptionHistoryTab').addEventListener('click',()=>setHistoryTab('consumption'));
$('#refreshConsumptionHistory').addEventListener('click',loadConsumptionHistory);
$('#copyConsumptionHistory').addEventListener('click',copyConsumptionHistoryReport);
refreshSharedStatus().then(ok=>{if(ok)syncPendingShared()});

function openTeamsSetup(){
  const dlg=$('#teamsSetupDialog');if(!dlg||!window.RollCountTeamsGraph)return;
  const c=window.RollCountTeamsGraph.loadConfig();$('#teamsClientId').value=c.clientId||'';$('#teamsSharedDataUrl').value=c.sharedDataUrl||'';dlg.showModal();
}
if($('#sharedStatus'))$('#sharedStatus').addEventListener('click',()=>{if(!['127.0.0.1','localhost'].includes(location.hostname))openTeamsSetup()});
if($('#closeTeamsSetup'))$('#closeTeamsSetup').addEventListener('click',()=>$('#teamsSetupDialog').close());
if($('#clearTeamsSetupBtn'))$('#clearTeamsSetupBtn').addEventListener('click',()=>{window.RollCountTeamsGraph?.clearConfig();$('#teamsClientId').value='';$('#teamsSharedDataUrl').value='';refreshSharedStatus();toast('Teams setup cleared')});
if($('#connectTeamsBtn'))$('#connectTeamsBtn').addEventListener('click',async()=>{
  const clientId=$('#teamsClientId').value.trim(),sharedDataUrl=$('#teamsSharedDataUrl').value.trim();if(!clientId||!sharedDataUrl){toast('Client ID and Shared Data link are required');return}
  const btn=$('#connectTeamsBtn');btn.disabled=true;btn.textContent='Connecting…';
  try{window.RollCountTeamsGraph.saveConfig({clientId,sharedDataUrl});await window.RollCountTeamsGraph.signIn(true);const st=await window.RollCountTeamsGraph.status(false);if(!st.connected)throw new Error(st.error||'Connection failed');$('#teamsSetupDialog').close();await refreshSharedStatus();await syncPendingShared();toast('Teams Shared Data connected')}catch(e){toast(e.message||'Teams connection failed')}finally{btn.disabled=false;btn.textContent='Save & Connect'}
});

const __shiftInfo=refreshAutoShift();const __reportDate=__shiftInfo?displayDateFromISO(__shiftInfo.workDate):new Date();$('#dateLabel').textContent=__reportDate.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});$('#reportDate').textContent=`${__reportDate.toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'})} • Shift ${shift}`;
render();
if('serviceWorker' in navigator){
  const desktopMode=new URLSearchParams(window.location.search).has('desktop');
  window.addEventListener('load',async()=>{
    if(desktopMode){
      try{for(const reg of await navigator.serviceWorker.getRegistrations())await reg.unregister()}catch{}
      try{if(window.caches){for(const key of await caches.keys())await caches.delete(key)}}catch{}
      return;
    }
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  });
}
