const ROLL_TYPES=["5.3/36","5.3/43","6.3/36","6.35/43","6.5/43","6.5/36","7.1/36","7.1/45","7.3/55","8.0/60","8.6/80","9.3/50","9.75/80","9.75/50L","10.5/50","10.25/90","10.5/70","13.0/70","10.9/65","6.3/43","6.4/55","7.5/50Lam","8.9/50L","8.5/50L","9.1/45","9.1/55","9.0/80","10.25/80"];
const KEY='rollCount.current.v1',HKEY='rollCount.history.v1',SKEY='rollCount.scrap.v1';
const blank=()=>Object.fromEntries(ROLL_TYPES.map(t=>[t,{a1:'',a2:'',line:'',other:''}]));
let data=load(KEY,blank()),history=load(HKEY,[]),scrap=String(load(SKEY,''));
const $=s=>document.querySelector(s);const list=$('#rollList');
function load(k,fallback){try{const v=localStorage.getItem(k);return v===null?fallback:JSON.parse(v)}catch{return fallback}}
function save(){localStorage.setItem(KEY,JSON.stringify(data));localStorage.setItem(SKEY,JSON.stringify(scrap))}
function n(v){const x=parseInt(v,10);return Number.isFinite(x)&&x>0?x:0}
function scrapN(){const x=parseInt(scrap,10);return Number.isFinite(x)&&x>=0?x:0}
function totalFor(t){const d=data[t]||{};return n(d.a1)+n(d.a2)+n(d.line)+n(d.other)}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function render(){list.innerHTML=ROLL_TYPES.map(t=>{const d=data[t]||{};return `<article class="roll-card"><div class="fields">${field(t,'a1',1,d.a1)}${field(t,'a2',2,d.a2)}${field(t,'line',3,d.line)}${field(t,'other',4,d.other)}</div></article>`}).join('');
  list.querySelectorAll('input').forEach(inp=>inp.addEventListener('input',e=>{const {type,key}=e.target.dataset;let v=e.target.value.replace(/\D/g,'').slice(0,3);e.target.value=v;data[type][key]=v;save();updateSummary()}));
  $('#scrapInput').value=scrap; updateSummary();renderHistory();
}
function field(t,k,slot,val){return `<div class="field"><input inputmode="numeric" pattern="[0-9]*" enterkeyhint="done" aria-label="${t} count ${slot}" data-type="${t}" data-key="${k}" value="${esc(val||'')}" placeholder="${esc(t)}"></div>`}
function inStock(){return ROLL_TYPES.map(t=>({type:t,total:totalFor(t)})).filter(x=>x.total>0)}
function scrapState(v){return v===0?'good':'bad'}
function updateScrapVisual(){const v=scrapN(),state=scrapState(v),input=$('#scrapInput'),badge=$('#scrapBadge'),metric=$('#scrapMetric');input.classList.remove('scrap-good','scrap-bad');input.classList.add(`scrap-${state}`);badge.className=`scrap-badge ${state}`;badge.textContent=v===0?'ZERO':'SCRAP';metric.className=`metric-value scrap-${state}-text`;metric.textContent=v.toLocaleString();}
function updateSummary(){const rows=inStock(),gt=rows.reduce((s,x)=>s+x.total,0),sv=scrapN(),ss=scrapState(sv);$('#typesInStock').textContent=rows.length;$('#grandTotal').textContent=gt.toLocaleString();$('#reportTotal').textContent=gt.toLocaleString();$('#reportScrap').textContent=sv.toLocaleString();$('#reportScrap').className=`report-scrap-value ${ss}`;$('#reportScrap').closest('.report-scrap').className=`report-scrap ${ss==='bad'?'bad-box':''}`;$('#reportCount').textContent=`${rows.length} ${rows.length===1?'type':'types'}`;$('#summaryEmpty').style.display=rows.length?'none':'block';$('#summaryList').innerHTML=rows.map(x=>`<div class="summary-row"><span>${esc(x.type)}</span><strong>${x.total.toLocaleString()}</strong></div>`).join('');updateScrapVisual();}
function dateLong(){return new Date().toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'})}
function reportText(){const rows=inStock(),gt=rows.reduce((s,x)=>s+x.total,0),sv=scrapN();const divider='------------------------------';return [
  'K1 OPERATIONS',
  'DAILY ROLL INVENTORY REPORT',
  dateLong(),
  divider,
  ...rows.map(x=>`${x.type.padEnd(12,' ')} ${String(x.total).padStart(3,' ')} rolls`),
  divider,
  `TOTAL ROLLS: ${gt}`,
  `SCRAP: ${sv.toLocaleString()}${sv===0?'  |  ZERO':'  |  SCRAP RECORDED'}`
].join('\n')}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(window.__tt);window.__tt=setTimeout(()=>t.classList.remove('show'),1800)}
async function shareReport(){const text=reportText();try{if(navigator.share){await navigator.share({title:`K1 Roll Inventory - ${dateLong()}`,text});}else{await navigator.clipboard.writeText(text);toast('Report copied')}}catch(e){if(e.name!=='AbortError')toast('Unable to share')}}
async function copyReport(){try{await navigator.clipboard.writeText(reportText());toast('Report copied')}catch{const ta=document.createElement('textarea');ta.value=reportText();document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();toast('Report copied')}}
function newDay(){const rows=inStock(),gt=rows.reduce((s,x)=>s+x.total,0),sv=scrapN();if(!rows.length&&sv===0){if(confirm('Everything is already clear. Start a fresh count?')){data=blank();scrap='';save();render()}return}if(!confirm(`Save today's count (${gt} rolls, scrap ${sv}) to history and clear all entries?`))return;history.unshift({ts:new Date().toISOString(),rows,grandTotal:gt,scrap:sv});history=history.slice(0,60);localStorage.setItem(HKEY,JSON.stringify(history));data=blank();scrap='';save();render();window.scrollTo({top:0,behavior:'smooth'});toast('New day started')}
function renderHistory(){const box=$('#historyList');if(!history.length){box.innerHTML='<div class="empty-state">No saved days yet.</div>';return}box.innerHTML=history.map(h=>{const d=new Date(h.ts).toLocaleString([], {dateStyle:'medium',timeStyle:'short'});const sv=Number.isFinite(h.scrap)?h.scrap:0;return `<div class="history-item"><div class="date">${esc(d)}</div><div class="meta">${h.rows.length} types • ${h.grandTotal} rolls • Scrap ${sv}</div><details><summary>View details</summary><div class="history-lines">${h.rows.map(r=>`${esc(r.type)} — <strong>${r.total}</strong>`).join('<br>')}<br><strong>Scrap — ${sv}</strong></div></details></div>`}).join('')}
$('#scrapInput').addEventListener('input',e=>{let v=e.target.value.replace(/\D/g,'').slice(0,7);e.target.value=v;scrap=v;save();updateSummary()});
$('#shareBtn').addEventListener('click',shareReport);$('#copyBtn').addEventListener('click',copyReport);$('#printBtn').addEventListener('click',()=>window.print());$('#newDayBtn').addEventListener('click',newDay);$('#historyBtn').addEventListener('click',()=>$('#historyDialog').showModal());$('#closeHistory').addEventListener('click',()=>$('#historyDialog').close());
$('#dateLabel').textContent=new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
render();
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}))}
