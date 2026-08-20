const DEFAULT_ROLL_TYPES=["5.3/36","5.3/43","6.3/36","6.35/43","6.5/43","6.5/36","7.1/36","7.1/45","7.3/55","8.0/60","8.6/80","9.3/50","9.75/80","9.75/50L","10.5/50","10.25/90","10.5/70","13.0/70","10.9/65","6.3/43","6.4/55","7.5/50Lam","8.9/50L","8.5/50L","9.1/45","9.1/55","9.0/80","10.25/80"];
const KEY='rollCount.current.v1',HKEY='rollCount.history.v1',SKEY='rollCount.scrap.v1',TKEY='rollCount.types.v2';
const $=s=>document.querySelector(s);const list=$('#rollList');
function load(k,fallback){try{const v=localStorage.getItem(k);return v===null?fallback:JSON.parse(v)}catch{return fallback}}
function normalizeType(s){return String(s||'').trim().replace(/\s+/g,'').replace(/\\/g,'/');}
function typeParts(type){const s=normalizeType(type);const m=s.match(/^([0-9]+(?:\.[0-9]+)?)\/([0-9]+(?:\.[0-9]+)?)(.*)$/i);if(!m)return [Number.POSITIVE_INFINITY,Number.POSITIVE_INFINITY,s.toLowerCase()];return [Number(m[1]),Number(m[2]),m[3].toLowerCase()];}
function sortTypes(arr){return [...new Set(arr.map(normalizeType).filter(Boolean))].sort((a,b)=>{const A=typeParts(a),B=typeParts(b);return A[0]-B[0]||A[1]-B[1]||A[2].localeCompare(B[2])||a.localeCompare(b,undefined,{numeric:true});});}
let rollTypes=sortTypes(load(TKEY,DEFAULT_ROLL_TYPES));
let data=load(KEY,{}),history=load(HKEY,[]),scrap=String(load(SKEY,''));
function ensureData(){for(const t of rollTypes)if(!data[t])data[t]={a1:'',a2:'',line:'',other:''};for(const t of Object.keys(data))if(!rollTypes.includes(t))delete data[t];}
ensureData();
function blank(){return Object.fromEntries(rollTypes.map(t=>[t,{a1:'',a2:'',line:'',other:''}]))}
function save(){localStorage.setItem(KEY,JSON.stringify(data));localStorage.setItem(SKEY,JSON.stringify(scrap));localStorage.setItem(TKEY,JSON.stringify(rollTypes))}
function n(v){const x=parseInt(v,10);return Number.isFinite(x)&&x>0?x:0}
function scrapN(){const x=parseInt(scrap,10);return Number.isFinite(x)&&x>=0?x:0}
function totalFor(t){const d=data[t]||{};return n(d.a1)+n(d.a2)+n(d.line)+n(d.other)}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function field(t,k,slot,val){return `<div class="field"><input inputmode="numeric" pattern="[0-9]*" enterkeyhint="done" aria-label="${esc(t)} count ${slot}" data-type="${esc(t)}" data-key="${k}" value="${esc(val||'')}" placeholder="${esc(t)}"></div>`}
function render(){ensureData();list.innerHTML=rollTypes.map(t=>{const d=data[t]||{};return `<article class="roll-card"><div class="roll-card-head"><button type="button" class="roll-type-title" data-manage-type="${esc(t)}" aria-label="Edit ${esc(t)}">${esc(t)}</button></div><div class="fields">${field(t,'a1',1,d.a1)}${field(t,'a2',2,d.a2)}${field(t,'line',3,d.line)}${field(t,'other',4,d.other)}</div></article>`}).join('');
  list.querySelectorAll('input').forEach(inp=>inp.addEventListener('input',e=>{const {type,key}=e.target.dataset;let v=e.target.value.replace(/\D/g,'').slice(0,3);e.target.value=v;if(!data[type])data[type]={a1:'',a2:'',line:'',other:''};data[type][key]=v;save();updateSummary()}));
  list.querySelectorAll('[data-manage-type]').forEach(btn=>btn.addEventListener('click',()=>openRollDialog(btn.dataset.manageType)));
  $('#scrapInput').value=scrap; updateSummary();renderHistory();
}
function inStock(){return rollTypes.map(t=>({type:t,total:totalFor(t)})).filter(x=>x.total>0)}
function scrapState(v){return v===0?'good':'bad'}
function updateScrapVisual(){const v=scrapN(),state=scrapState(v),input=$('#scrapInput'),badge=$('#scrapBadge'),metric=$('#scrapMetric');input.classList.remove('scrap-good','scrap-bad');input.classList.add(`scrap-${state}`);badge.className=`scrap-badge ${state}`;badge.textContent=v===0?'ZERO':'SCRAP';metric.className=`metric-value scrap-${state}-text`;metric.textContent=v.toLocaleString();}
function updateSummary(){const rows=inStock(),gt=rows.reduce((s,x)=>s+x.total,0),sv=scrapN(),ss=scrapState(sv);$('#typesInStock').textContent=rows.length;$('#grandTotal').textContent=gt.toLocaleString();$('#reportTotal').textContent=gt.toLocaleString();$('#reportTableTotal').textContent=gt.toLocaleString();$('#reportScrap').textContent=sv.toLocaleString();$('#summaryEmpty').style.display=rows.length?'none':'block';$('#summaryList').innerHTML=rows.map(x=>`<div class="summary-row"><span>${esc(x.type)}</span><strong>${x.total.toLocaleString()}</strong></div>`).join('');
  const top=$('#reportScrapCard');top.className=`hero-metric scrap ${ss}`;updateScrapVisual();}
function dateLong(){return new Date().toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'})}
function reportText(){const rows=inStock(),gt=rows.reduce((s,x)=>s+x.total,0),sv=scrapN();const divider='------------------------------';return ['ROLL COUNT REPORT',dateLong(),divider,...rows.map(x=>`${x.type.padEnd(12,' ')} ${String(x.total).padStart(3,' ')} rolls`),divider,`TOTAL ROLLS: ${gt}`,`SCRAP: ${sv.toLocaleString()}`].join('\n')}
function reportRichHTML(){
  const rows=inStock(),gt=rows.reduce((s,x)=>s+x.total,0),sv=scrapN(),bad=sv>0;
  const scrapBg=bad?'#fde8e7':'#e7f5eb',scrapInk=bad?'#b42318':'#14733b',scrapBorder=bad?'#df9b9b':'#afd0aa';
  const bodyRows=rows.length?rows.map(x=>`<tr><td style="padding:10px 14px;border-top:1px solid #e2e7eb;font-family:Arial,sans-serif;font-size:17px;font-weight:700;color:#102b42;">${esc(x.type)}</td><td style="padding:8px 14px;border-top:1px solid #e2e7eb;border-left:1px solid #e2e7eb;text-align:center;font-family:Arial,sans-serif;font-size:28px;font-weight:900;color:#123b5d;">${x.total.toLocaleString()}</td></tr>`).join(''):`<tr><td colspan="2" style="padding:18px;text-align:center;color:#6b7c8a;font-family:Arial,sans-serif;">No rolls entered yet.</td></tr>`;
  return `<div style="max-width:680px;background:#ffffff;padding:22px;border:1px solid #d5dee6;border-radius:18px;font-family:Arial,sans-serif;color:#102b42;">
    <div style="margin-bottom:16px;"><div style="font-size:28px;line-height:1.1;font-weight:900;color:#123b5d;">ROLL COUNT REPORT</div><div style="margin-top:5px;font-size:14px;color:#6b7c8a;">${esc(dateLong())}</div></div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate;border-spacing:10px 0;margin:0 -10px 14px;width:calc(100% + 20px);"><tr>
      <td style="width:50%;padding:18px;text-align:center;background:#f1f7ff;border:1.5px solid #b7d1ef;border-radius:14px;color:#0b4e9d;"><div style="font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;">TOTAL ROLLS</div><div style="font-size:56px;line-height:1;font-weight:900;">${gt.toLocaleString()}</div></td>
      <td style="width:50%;padding:18px;text-align:center;background:${scrapBg};border:1.5px solid ${scrapBorder};border-radius:14px;color:${scrapInk};"><div style="font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;">SCRAP</div><div style="font-size:56px;line-height:1;font-weight:900;">${sv.toLocaleString()}</div></td>
    </tr></table>
    <table cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:separate;border-spacing:0;border:1px solid #d5dee6;border-radius:12px;overflow:hidden;">
      <tr><th style="padding:11px 14px;background:#123b5d;color:#fff;text-align:left;font-size:12px;text-transform:uppercase;">ROLL COUNT</th><th style="padding:11px 14px;background:#123b5d;color:#fff;text-align:center;font-size:12px;text-transform:uppercase;border-left:1px solid #7992a7;">COUNT</th></tr>
      ${bodyRows}
      <tr><td style="padding:11px 14px;border-top:1px solid #d5dee6;background:#f6f9fc;font-size:14px;font-weight:900;color:#1557a5;text-transform:uppercase;">TOTAL</td><td style="padding:9px 14px;border-top:1px solid #d5dee6;border-left:1px solid #d5dee6;background:#f6f9fc;text-align:center;font-size:30px;font-weight:900;color:#1557a5;">${gt.toLocaleString()}</td></tr>
    </table>
  </div>`;
}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(window.__tt);window.__tt=setTimeout(()=>t.classList.remove('show'),1800)}
async function shareReport(){const text=reportText();try{if(navigator.share){await navigator.share({title:`Roll Count Report - ${dateLong()}`,text});}else{await copyReport()}}catch(e){if(e.name!=='AbortError')toast('Unable to share')}}
async function copyReport(){
  const text=reportText(),html=reportRichHTML();
  try{
    if(navigator.clipboard&&window.ClipboardItem){
      const item=new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([text],{type:'text/plain'})});
      await navigator.clipboard.write([item]);
      toast('Formatted report copied');
      return;
    }
    throw new Error('Rich clipboard unavailable');
  }catch(e){
    try{await navigator.clipboard.writeText(text);toast('Copied as text (format not supported here)')}
    catch{const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();toast('Copied as text')}
  }
}
function newDay(){const rows=inStock(),gt=rows.reduce((s,x)=>s+x.total,0),sv=scrapN();if(!rows.length&&sv===0){if(confirm('Everything is already clear. Start a fresh count?')){data=blank();scrap='';save();render()}return}if(!confirm(`Save today's count (${gt} rolls, scrap ${sv}) to history and clear all entries?`))return;history.unshift({ts:new Date().toISOString(),rows,grandTotal:gt,scrap:sv});history=history.slice(0,60);localStorage.setItem(HKEY,JSON.stringify(history));data=blank();scrap='';save();render();window.scrollTo({top:0,behavior:'smooth'});toast('New day started')}
function renderHistory(){const box=$('#historyList');if(!history.length){box.innerHTML='<div class="empty-state">No saved days yet.</div>';return}box.innerHTML=history.map(h=>{const d=new Date(h.ts).toLocaleString([], {dateStyle:'medium',timeStyle:'short'});const sv=Number.isFinite(h.scrap)?h.scrap:0;return `<div class="history-item"><div class="date">${esc(d)}</div><div class="meta">${h.rows.length} types • ${h.grandTotal} rolls • Scrap ${sv}</div><details><summary>View details</summary><div class="history-lines">${h.rows.map(r=>`${esc(r.type)} — <strong>${r.total}</strong>`).join('<br>')}<br><strong>Scrap — ${sv}</strong></div></details></div>`}).join('')}
function openRollDialog(existing=''){const dlg=$('#rollTypeDialog');$('#editingRollType').value=existing;$('#rollTypeInput').value=existing;$('#rollDialogTitle').textContent=existing?'Edit Roll Type':'Add Roll Type';$('#deleteRollTypeBtn').classList.toggle('hidden',!existing);dlg.showModal();setTimeout(()=>$('#rollTypeInput').focus(),50)}
function closeRollDialog(){$('#rollTypeDialog').close()}
function saveRollType(){const oldType=$('#editingRollType').value;const newType=normalizeType($('#rollTypeInput').value);if(!/^\d+(?:\.\d+)?\/\d+(?:\.\d+)?[A-Za-z]*$/.test(newType)){toast('Use a format like 5.5/50');return}if(newType!==oldType&&rollTypes.some(t=>t.toLowerCase()===newType.toLowerCase())){toast('That roll type already exists');return}
  if(oldType){const oldData=data[oldType]||{a1:'',a2:'',line:'',other:''};rollTypes=rollTypes.filter(t=>t!==oldType);delete data[oldType];rollTypes.push(newType);data[newType]=oldData;}else{rollTypes.push(newType);data[newType]={a1:'',a2:'',line:'',other:''};}
  rollTypes=sortTypes(rollTypes);save();closeRollDialog();render();toast(oldType?'Roll type updated':'Roll type added');
}
function deleteRollType(){const type=$('#editingRollType').value;if(!type)return;const total=totalFor(type);if(total>0&&!confirm(`${type} currently has ${total} rolls entered. Delete this roll type and its counts?`))return;if(total===0&&!confirm(`Delete ${type}?`))return;rollTypes=rollTypes.filter(t=>t!==type);delete data[type];save();closeRollDialog();render();toast('Roll type deleted')}
$('#scrapInput').addEventListener('input',e=>{let v=e.target.value.replace(/\D/g,'').slice(0,7);e.target.value=v;scrap=v;save();updateSummary()});
$('#shareBtn').addEventListener('click',shareReport);$('#copyBtn').addEventListener('click',copyReport);$('#printBtn').addEventListener('click',()=>window.print());$('#printTopBtn').addEventListener('click',()=>window.print());$('#newDayBtn').addEventListener('click',newDay);$('#historyBtn').addEventListener('click',()=>$('#historyDialog').showModal());$('#closeHistory').addEventListener('click',()=>$('#historyDialog').close());
$('#addRollBtn').addEventListener('click',()=>openRollDialog());$('#closeRollDialog').addEventListener('click',closeRollDialog);$('#saveRollTypeBtn').addEventListener('click',saveRollType);$('#deleteRollTypeBtn').addEventListener('click',deleteRollType);$('#rollTypeInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();saveRollType()}});
$('#dateLabel').textContent=new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});$('#reportDate').textContent=new Date().toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'});
render();
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}))}
