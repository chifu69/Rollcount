/* Roll Count v7.3.2 — Microsoft 365 / SharePoint shared-data adapter for GitHub Pages.
   Uses delegated Microsoft Graph access. The signed-in user must already have access to
   the SharePoint/Teams Shared Data folder. */
(function(root){
  'use strict';
  const CFGKEY='rollCount.teamsGraphConfig.v1';
  const SCOPES=['User.Read','Files.ReadWrite.All'];
  const GRAPH='https://graph.microsoft.com/v1.0';
  let pca=null, account=null, resolved=null;

  function loadConfig(){
    let saved={};try{saved=JSON.parse(localStorage.getItem(CFGKEY)||'{}')||{}}catch{}
    return {...(root.ROLLCOUNT_TEAMS_DEFAULTS||{}),...saved};
  }
  function saveConfig(cfg){localStorage.setItem(CFGKEY,JSON.stringify({clientId:String(cfg.clientId||'').trim(),sharedDataUrl:String(cfg.sharedDataUrl||'').trim()}));resolved=null;pca=null;account=null}
  function clearConfig(){localStorage.removeItem(CFGKEY);resolved=null;pca=null;account=null}
  function isConfigured(){const c=loadConfig();return !!(c.clientId&&c.sharedDataUrl)}
  function b64url(s){return btoa(unescape(encodeURIComponent(s))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')}
  function shareToken(url){return 'u!'+b64url(url)}
  async function ensurePca(){
    if(!isConfigured())throw new Error('Teams setup required');
    if(!root.msal||!root.msal.PublicClientApplication)throw new Error('Microsoft sign-in library unavailable');
    if(!pca){
      const c=loadConfig();
      pca=new root.msal.PublicClientApplication({auth:{clientId:c.clientId,authority:'https://login.microsoftonline.com/organizations',redirectUri:location.origin+location.pathname},cache:{cacheLocation:'localStorage',storeAuthStateInCookie:false}});
      if(typeof pca.initialize==='function')await pca.initialize();
      const accounts=pca.getAllAccounts();account=accounts[0]||null;
    }
    return pca;
  }
  async function signIn(interactive=true){
    const app=await ensurePca();
    if(account)return account;
    if(!interactive)throw new Error('Microsoft sign-in required');
    const r=await app.loginPopup({scopes:SCOPES,prompt:'select_account'});account=r.account;return account;
  }
  async function token(interactive=true){
    const app=await ensurePca();await signIn(interactive);
    try{return (await app.acquireTokenSilent({account,scopes:SCOPES})).accessToken}
    catch(e){if(!interactive)throw e;return (await app.acquireTokenPopup({account,scopes:SCOPES})).accessToken}
  }
  async function graph(path,opts={}){
    const access=await token(opts.interactive!==false);
    const headers={Authorization:`Bearer ${access}`,...(opts.headers||{})};
    if(opts.json!==undefined){headers['Content-Type']='application/json';opts.body=JSON.stringify(opts.json)}
    const r=await fetch(path.startsWith('http')?path:GRAPH+path,{method:opts.method||'GET',headers,body:opts.body});
    if(r.status===404&&opts.allow404)return null;
    if(!r.ok){let msg=`Graph ${r.status}`;try{const j=await r.json();msg=j?.error?.message||msg}catch{}throw new Error(msg)}
    if(opts.text)return r.text();
    if(r.status===204)return {};
    const ct=r.headers.get('content-type')||'';return ct.includes('json')?r.json():r.text();
  }
  async function resolveRoot(){
    if(resolved)return resolved;
    const cfg=loadConfig();
    const item=await graph(`/shares/${shareToken(cfg.sharedDataUrl)}/driveItem?$select=id,name,parentReference`);
    const driveId=item?.parentReference?.driveId;if(!driveId||!item?.id)throw new Error('The Shared Data link could not be resolved');
    resolved={driveId,rootId:item.id,rootName:item.name||'Shared Data',folders:{}};
    await ensureSubfolders();return resolved;
  }
  async function children(parentId){
    const r=await graph(`/drives/${encodeURIComponent((await resolveRoot()).driveId)}/items/${encodeURIComponent(parentId)}/children?$select=id,name,folder,file,lastModifiedDateTime`);return r.value||[];
  }
  async function createFolder(parentId,name){
    const r=await graph(`/drives/${encodeURIComponent((await resolveRoot()).driveId)}/items/${encodeURIComponent(parentId)}/children`,{method:'POST',json:{name,folder:{},'@microsoft.graph.conflictBehavior':'fail'}});return r;
  }
  async function ensureSubfolders(){
    if(!resolved)return resolveRoot();
    const list=await graph(`/drives/${encodeURIComponent(resolved.driveId)}/items/${encodeURIComponent(resolved.rootId)}/children?$select=id,name,folder`);
    for(const name of ['Roll Count History','Roll Consumption History']){
      let f=(list.value||[]).find(x=>x.folder&&x.name===name);if(!f){try{f=await createFolder(resolved.rootId,name)}catch{const again=await graph(`/drives/${encodeURIComponent(resolved.driveId)}/items/${encodeURIComponent(resolved.rootId)}/children?$select=id,name,folder`);f=(again.value||[]).find(x=>x.folder&&x.name===name)}}
      if(!f)throw new Error(`Missing ${name}`);resolved.folders[name]=f.id;
    }
  }
  async function writeFile(folderId,name,text){
    const r=await graph(`/drives/${encodeURIComponent((await resolveRoot()).driveId)}/items/${encodeURIComponent(folderId)}:/${encodeURIComponent(name)}:/content`,{method:'PUT',headers:{'Content-Type':'application/json; charset=utf-8'},body:text});return r;
  }
  async function readFile(folderId,name){
    const d=(await resolveRoot()).driveId;
    return graph(`/drives/${encodeURIComponent(d)}/items/${encodeURIComponent(folderId)}:/${encodeURIComponent(name)}:/content`,{text:true,allow404:true});
  }
  function safeJson(s,fallback){try{return JSON.parse(s)}catch{return fallback}}
  function consumptionKey(x){return `${x.date||''}|${x.shift||''}|${x.roll||''}`}
  async function save(payload){
    const r=await resolveRoot();
    const snapName=`RollCount-${payload.date}-Shift-${payload.shift}.json`;
    const snap={version:1,type:'roll-count-snapshot',date:payload.date,shift:payload.shift,savedAt:payload.savedAt,rows:payload.rows||[],grandTotal:Number(payload.grandTotal||0),scrap:Number(payload.scrap||0)};
    await writeFile(r.folders['Roll Count History'],snapName,JSON.stringify(snap,null,2));
    const items=payload.consumption||[];
    if(items.length){
      const month=String(payload.date||'').slice(0,7),name=`RollConsumption-${month}.json`,fid=r.folders['Roll Consumption History'];
      let doc={version:1,month,items:[]};const old=await readFile(fid,name);if(old)doc=safeJson(old,doc)||doc;if(!Array.isArray(doc.items))doc.items=[];
      const map=new Map(doc.items.map(x=>[consumptionKey(x),x]));
      for(const x of items){const rec={date:payload.date,shift:payload.shift,savedAt:payload.savedAt,roll:x.roll,extruder:x.extruder||null,designator:x.designator||'',status:x.status||''};map.set(consumptionKey(rec),rec)}
      doc={version:1,month,updatedAt:new Date().toISOString(),items:[...map.values()].sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.shift).localeCompare(String(b.shift))||(Number(a.extruder)||99)-(Number(b.extruder)||99)||String(a.roll).localeCompare(String(b.roll),undefined,{numeric:true}))};
      await writeFile(fid,name,JSON.stringify(doc,null,2));
    }
    return {saved:true};
  }
  async function snapshots(limit=120){
    const r=await resolveRoot(),fid=r.folders['Roll Count History'];const list=await children(fid);
    const files=list.filter(x=>x.file&&/^RollCount-\d{4}-\d{2}-\d{2}-Shift-[ABCD]\.json$/i.test(x.name)).sort((a,b)=>String(b.name).localeCompare(String(a.name))).slice(0,Math.max(1,Math.min(200,Number(limit)||120)));
    const out=[];for(const f of files){try{const txt=await graph(`/drives/${encodeURIComponent(r.driveId)}/items/${encodeURIComponent(f.id)}/content`,{text:true});const j=safeJson(txt,null);if(j)out.push(j)}catch{}}
    return {items:out};
  }
  async function consumption(month,shift,extruder){
    const r=await resolveRoot(),fid=r.folders['Roll Consumption History'],name=`RollConsumption-${month}.json`;const txt=await readFile(fid,name);let items=[];
    if(txt){const doc=safeJson(txt,{items:[]});items=Array.isArray(doc?.items)?doc.items:[]}
    if(shift)items=items.filter(x=>String(x.shift)===String(shift));if(extruder)items=items.filter(x=>String(x.extruder)===String(extruder));
    items.sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.shift).localeCompare(String(b.shift))||(Number(a.extruder)||99)-(Number(b.extruder)||99)||String(a.roll).localeCompare(String(b.roll),undefined,{numeric:true}));
    return {items};
  }
  async function status(interactive=false){
    if(!isConfigured())return {connected:false,setupRequired:true};
    try{await ensurePca();await signIn(interactive);await resolveRoot();return {connected:true,mode:'graph'}}catch(e){return {connected:false,setupRequired:false,error:e.message||String(e)}}
  }
  async function handleApi(url,options={}){
    const u=new URL(url,location.origin),method=String(options.method||'GET').toUpperCase();
    if(u.pathname==='/api/shared/status')return status(false);
    if(u.pathname==='/api/shared/save'&&method==='POST')return save(JSON.parse(options.body||'{}'));
    if(u.pathname==='/api/shared/snapshots')return snapshots(u.searchParams.get('limit')||120);
    if(u.pathname==='/api/shared/consumption')return consumption(u.searchParams.get('month')||'',u.searchParams.get('shift')||'',u.searchParams.get('extruder')||'');
    throw new Error('Unsupported Teams API route');
  }
  root.RollCountTeamsGraph={loadConfig,saveConfig,clearConfig,isConfigured,signIn,status,handleApi};
})(window);
