(function qaMain(){
  const fs=require('fs');
  const VERSION='v2.64.37';
  const html=fs.readFileSync('index.html','utf8');
  const sw=fs.readFileSync('sw.js','utf8');
  const manifest=fs.readFileSync('manifest.webmanifest','utf8');
  const server=fs.readFileSync('server.js','utf8');
  const iphone=fs.readFileSync('CROPPY_iPhone_v2.64.37.js','utf8');
  const iphoneCopy=fs.readFileSync('iphone-copy.html','utf8');
  const checks=[];
  const check=(name,ok,detail='')=>checks.push({name,ok:!!ok,detail});
  function extractFunctions(src,name){
    const out=[],sig='function '+name+'(';let p=0;
    while((p=src.indexOf(sig,p))>=0){
      const brace=src.indexOf('{',p);let i=brace+1,depth=1,state='code',quote='',esc=false;
      for(;i<src.length&&depth>0;i++){
        const ch=src[i],nx=src[i+1];
        if(state==='str'){if(esc){esc=false;continue}if(ch==='\\'){esc=true;continue}if(ch===quote){state='code';quote=''}continue}
        if(state==='line'){if(ch==='\n')state='code';continue}
        if(state==='block'){if(ch==='*'&&nx==='/'){state='code';i++}continue}
        if(ch==="'"||ch==='"'||ch.charCodeAt(0)===96){state='str';quote=ch;continue}
        if(ch==='/'&&nx==='/'){state='line';i++;continue}
        if(ch==='/'&&nx==='*'){state='block';i++;continue}
        if(ch==='{')depth++;else if(ch==='}')depth--;
      }
      out.push(src.slice(p,i));p=i;
    }
    return out;
  }
  function activeFunction(name){const a=extractFunctions(html,name);if(!a.length)throw new Error('missing '+name);return a[a.length-1]}
  function makeFn(name,deps){
    const src=activeFunction(name).replace(new RegExp('^function\\s+'+name.replace(/\$/g,'\\$&')),'function');
    const keys=Object.keys(deps),vals=keys.map(k=>deps[k]);
    return Function(...keys,'return ('+src+');')(...vals);
  }
  check('Version title',html.includes('<title>CROSS GPT クロッピー | v2.64.37</title>'));
  check('Visible version',html.includes('クロッピー / v2.64.37'));
  const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]),syntaxErr=[];
  scripts.forEach((s,i)=>{try{new Function(s)}catch(e){syntaxErr.push('script'+(i+1)+':'+e.message)}});
  check('HTML embedded JS syntax',syntaxErr.length===0,syntaxErr.join(' | '));
  try{new Function(sw);check('Service worker syntax',true)}catch(e){check('Service worker syntax',false,e.message)}
  try{
    function SyncThen(ok,value){this.ok=ok;this.value=value}
    SyncThen.from=function(v){return v instanceof SyncThen?v:new SyncThen(true,v)};
    SyncThen.resolve=function(v){return SyncThen.from(v)};
    SyncThen.reject=function(e){return new SyncThen(false,e)};
    SyncThen.prototype.then=function(done,fail){
      try{
        if(this.ok)return done?SyncThen.from(done(this.value)):this;
        return fail?SyncThen.from(fail(this.value)):this;
      }catch(e){return SyncThen.reject(e)}
    };
    SyncThen.prototype.catch=function(fail){return this.then(null,fail)};
    const handlers={},cachedIndex={kind:'cached-index',clone:function(){return this}},cachedAsset={kind:'cached-asset',clone:function(){return this}};
    const cacheMap=new Map([['./index.html',cachedIndex],['https://example.test/icon-192.png',cachedAsset]]);
    const cachesMock={
      open:function(){return SyncThen.resolve({addAll:function(){return SyncThen.resolve(true)},put:function(k,v){cacheMap.set(typeof k==='string'?k:k.url,v);return SyncThen.resolve(true)}})},
      keys:function(){return SyncThen.resolve(['cross-gpt-croppy-v2-64-37'])},
      delete:function(){return SyncThen.resolve(true)},
      match:function(k){return SyncThen.resolve(cacheMap.get(typeof k==='string'?k:k.url)||null)}
    };
    const selfMock={addEventListener:function(n,f){handlers[n]=f},skipWaiting:function(){return SyncThen.resolve(true)},clients:{claim:function(){return SyncThen.resolve(true)}}};
    const runSW=Function('self','caches','fetch','URL',sw);
    runSW(selfMock,cachesMock,function(){return SyncThen.reject(new Error('offline'))},URL);
    let navResult=null;
    handlers.fetch({request:{method:'GET',mode:'navigate',url:'https://example.test/app'},respondWith:function(p){navResult=p}});
    check('Behavior: service worker offline navigation falls back to cached index',navResult&&navResult.ok&&navResult.value===cachedIndex);
    let assetResult=null;
    handlers.fetch({request:{method:'GET',mode:'no-cors',url:'https://example.test/icon-192.png'},respondWith:function(p){assetResult=p}});
    check('Behavior: service worker serves cached asset while offline',assetResult&&assetResult.ok&&assetResult.value===cachedAsset);
  }catch(e){
    check('Behavior: service worker offline navigation falls back to cached index',false,e.message);
    check('Behavior: service worker serves cached asset while offline',false,e.message);
  }
  try{JSON.parse(manifest);check('Manifest JSON',true)}catch(e){check('Manifest JSON',false,e.message)}
  try{new Function(server);check('Server JS syntax',true)}catch(e){check('Server JS syntax',false,e.message)}
  try{new Function('return (async function(){\n'+iphone+'\n})');check('iPhone Scriptable syntax',true)}catch(e){check('iPhone Scriptable syntax',false,e.message)}
  const ids=[...html.matchAll(/<[^>]+\bid=["']([^"']+)["']/gi)].map(m=>m[1]);
  const dupIds=Object.entries(ids.reduce((o,x)=>(o[x]=(o[x]||0)+1,o),{})).filter(([,n])=>n>1);
  check('Duplicate HTML IDs',dupIds.length===0,dupIds.map(x=>x.join(':')).join(','));
  const req=['startMeasureBtn','startSiteBtn','startPlanBtn','startRecentList','workAreaTabs','roomTabsWrap','projectTabs','categoryTabs','lengthField','countField','sharePreviewSend','historyAllBtn'];
  check('Required UI IDs',req.every(id=>ids.includes(id)),req.filter(id=>!ids.includes(id)).join(','));
  const visible=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]+>/g,' ');
  check('Internal hierarchy words hidden',!/(グループ|階層|採寸先)/.test(visible));
  check('Home 3 actions',['⚡ すぐ計算','📐 現場を開く','📋 予定・準備'].every(s=>html.includes(s)));
  check('Quick store separated',html.includes('quickCalcByArea')&&html.includes('function realProjectItems()')&&html.includes('historyRooms=state.rooms.filter(function(r){return !isQuickCalcRoom(r)})'));
  check('Legacy quick migration',html.includes('var legacy=(state.rooms||[]).filter(function(r){return !!(r&&r.quickCalc)})'));
  const critical=['normalizeHistory','load','totals','saveToHistory','loadHistory','filteredHistory','normalizeRoomObject','currentRoom','roomItems','currentItems','renderEntry','render','inlineEditItem','beginInlineItemEdit','clearItems','checkedMeterTotal','changeCount','removeItem','setCutCount','setCutDone','renderCutSummary','mergeActiveSectionDuplicates','applyRepeatToActiveSection'];
  const badCritical=critical.filter(n=>extractFunctions(html,n).length!==1);
  check('Critical active functions single-definition',badCritical.length===0,badCritical.join(','));
  check('Legacy functions removed',![...html.matchAll(/function\s+legacy_[A-Za-z0-9_$]+\s*\(/g)].length);
  const pass4Critical=['addItem','inputDigit','backspace','resetField','undo','summaryText','renderList','setActive','inputDecimal','redo','parseOCRText','updateOCRCommit','parseOCRNow','resetOCR','commitOCR','openRoomEditor','renderRoomContext','renderRoomOverview'];
  check('Pass4 active functions single-definition',pass4Critical.every(n=>extractFunctions(html,n).length===1),pass4Critical.filter(n=>extractFunctions(html,n).length!==1).join(','));
  check('UI typo fixed',!html.includes('このこの場所にはまだ部屋がありません。')&&html.includes('この場所にはまだ部屋がありません。'));
  check('Clean theme stylesheet present',html.includes('id="croppy-v26306-clean-theme"'));
  check('Soft corners layer present',html.includes('id="croppy-soft-corners-v26427"')&&html.includes('.panel{border-radius:20px}')&&html.includes('#keypad .key{border-radius:15px}'));
  check('Soft corners stay subtle',html.includes('.field{border-radius:16px}')&&html.includes('.item{border-radius:17px}')&&html.includes('.quick button{border-radius:12px}'));
  check('All light themes use near-white backgrounds',
    html.includes('body[data-croppy-theme="blue"]{--ct-bg:#f9fbfe')&&
    html.includes('body[data-croppy-theme="green"]{--ct-bg:#f9fcfa')&&
    html.includes('body[data-croppy-theme="orange"]{--ct-bg:#fffbf8')&&
    html.includes('body[data-croppy-theme="red"]{--ct-bg:#fffafa')&&
    html.includes('body[data-croppy-theme="purple"]{--ct-bg:#fbfaff'));
  check('Active input badge uses white knockout',html.includes('-webkit-text-fill-color:#fff!important')&&html.includes('border:1px solid rgba(255,255,255,.96)!important')&&html.includes("content:'入力中'"));
  check('Keypad follows theme accent',
    html.includes('.keypad-wrap')&&html.includes('color-mix(in srgb,var(--ct-accent) 10%,#263946)')&&
    html.includes('#keypad .flow-enter.ready-add')&&html.includes('linear-gradient(180deg,var(--ct-accent2),var(--ct-accent))'));
  check('Fixed blue amber field colors overridden',
    html.lastIndexOf('croppy-v26306-clean-theme')>html.indexOf('croppy-measure-clarity'));

  try{
    global.window={__SOULZ_COUNT_REPLACE_NEXT:true,__SOULZ_INLINE_EDIT_REPLACE_NEXT:false,__SOULZ_INLINE_EDIT_DIRTY:false};
    const state={active:'count',count:'1',length:'',repeatCm:'',repeatOn:false};
    const inputDigit=makeFn('inputDigit',{redoStack:[],state,inlineEditId:()=>null,applyRepeatToActiveSection:()=>{},renderEntry:()=>{},renderList:()=>{},saveDraft:()=>{}});
    inputDigit('5');
    check('Behavior: count digit replaces default 1',state.count==='5'&&window.__SOULZ_COUNT_REPLACE_NEXT===false,'count='+state.count);
  }catch(e){check('Behavior: count digit replaces default 1',false,e.message)}
  try{
    global.window={};
    const state={active:'count',count:'5',length:'',repeatCm:'',repeatOn:false};
    const backspace=makeFn('backspace',{redoStack:[],state,inlineEditId:()=>null,applyRepeatToActiveSection:()=>{},renderEntry:()=>{},renderList:()=>{},saveDraft:()=>{}});
    backspace();
    check('Behavior: count backspace returns to 1',state.count==='1'&&window.__SOULZ_COUNT_REPLACE_NEXT===true,'count='+state.count);
  }catch(e){check('Behavior: count backspace returns to 1',false,e.message)}
  try{
    global.window={};
    const state={active:'count',count:'27',length:'',repeatCm:'',repeatOn:false};
    const resetField=makeFn('resetField',{redoStack:[],state,inlineEditId:()=>null,applyRepeatToActiveSection:()=>{},toast:()=>{},renderEntry:()=>{},renderList:()=>{},saveDraft:()=>{}});
    resetField();
    check('Behavior: count reset returns to 1',state.count==='1'&&window.__SOULZ_COUNT_REPLACE_NEXT===true,'count='+state.count);
  }catch(e){check('Behavior: count reset returns to 1',false,e.message)}
  try{
    global.window={};
    const state={length:'250',count:'2',activeCategory:'wall',repeatOn:false,repeatCm:'',recent:[],active:'length'};
    const quick={id:'quick::area_1',name:'計算だけ',quickCalc:true,repeats:{wall:0},items:[]};
    const addItem=makeFn('addItem',{
      state,inlineEditId:()=>null,commitInlineItemEdit:()=>{},normalizeProjectState:()=>{},currentRoom:()=>quick,inputLengthToCm:v=>Number(v),setActive:()=>{},toast:()=>{},snap:()=>{},validCategory:c=>c==='wall',activeSectionRepeat:()=>0,repeatNumber:v=>Number(v)||0,roundCm:v=>Math.round(v*100)/100,itemStoreForRoom:r=>r.items,extraPatternEnabled:()=>false,setExtraPattern:()=>{},rememberRecentLength:cm=>{quick.recent=[cm]},saveDraft:()=>{},render:()=>{},categoryLabel:c=>c
    });
    addItem();
    check('Behavior: quick add stays in quick store',quick.items.length===1&&quick.items[0].cm===250&&quick.items[0].count===2&&quick.items[0].roomId==='quick::area_1'&&state.length===''&&state.count==='1',JSON.stringify(quick.items));
  }catch(e){check('Behavior: quick add stays in quick store',false,e.message)}
  check('OCR enriched handler active',activeFunction('commitOCR').includes('ocrAssignments')&&activeFunction('commitOCR').includes('ocrSiteCandidate'));

  try{
    const state={waste:10};
    const totals=makeFn('totals',{state,currentItems:()=>[],itemBaseCutCm:x=>x.base,itemCutCm:x=>x.cut,normalizedCutCount:x=>x.cutCount});
    const t=totals([{cm:200,count:2,base:206,cut:220,cutCount:1},{cm:100,count:1,base:106,cut:110,cutCount:1}]);
    check('Behavior: totals calculation',t.actualCm===500&&t.needCm===550&&t.pieces===3&&t.cutPieces===2&&t.allowanceExtraCm===18&&t.repeatExtraCm===32&&Math.abs(t.withWasteM-6.05)<1e-9&&t.order===6.5,JSON.stringify(t));
  }catch(e){check('Behavior: totals calculation',false,e.message)}
  try{
    const normalize=makeFn('normalizeQuickCalcRoom',{
      quickCalcId:a=>'quick::'+String(a||'area'),
      freshProducts:()=>({ceil:'',wall:'',accent:''}),
      freshRepeats:()=>({ceil:0,wall:0,accent:0}),
      validCategory:c=>['ceil','wall','accent'].includes(c),
      normalizedCutCount:x=>Math.max(0,Math.min(Number(x.count)||0,Math.round(Number(x.cutCount)||0)))
    });
    const q=normalize({items:[{count:3,cutCount:8,category:'bad'}]},'area_1');
    check('Behavior: quick calculation normalization',q.id==='quick::area_1'&&q.quickCalc===true&&q.workAreaId==='area_1'&&q.items[0].category==='wall'&&q.items[0].cutCount===3&&q.items[0].roomId==='quick::area_1',JSON.stringify(q));
  }catch(e){check('Behavior: quick calculation normalization',false,e.message)}
  try{
    const real=makeFn('realProjectItems',{state:{items:[{id:'formal'}],quickCalcByArea:{area_1:{items:[{id:'quick'}]}}}});
    const out=real();check('Behavior: formal items exclude quick store',out.length===1&&out[0].id==='formal');
  }catch(e){check('Behavior: formal items exclude quick store',false,e.message)}
  try{
    const start=iphone.indexOf('var b64 = '),end=iphone.indexOf(';\nvar htmlData',start),expr=iphone.slice(start+'var b64 = '.length,end);
    const chunks=[...expr.matchAll(/'([^']*)'/g)].map(m=>m[1]),embedded=Buffer.from(chunks.join(''),'base64').toString('utf8');
    check('iPhone embedded HTML version',embedded.includes('<title>CROSS GPT クロッピー | v2.64.37</title>')&&embedded.includes('クロッピー / v2.64.37'));
    check('iPhone embedded home flow',['⚡ すぐ計算','📐 現場を開く','📋 予定・準備'].every(s=>embedded.includes(s)));
    check('iPhone embedded quick separation',embedded.includes('quickCalcByArea')&&embedded.includes('function realProjectItems()'));
    try{
      const statusFns=extractFunctions(iphone,'croppyInjectIPhoneUpdateStatus');
      const statusSrc=statusFns[statusFns.length-1].replace(/^function\s+croppyInjectIPhoneUpdateStatus/,'function');
      const injectStatus=Function('croppyUpdateVersion','croppyUpdateSource','return ('+statusSrc+');')([2,64,21],'最新');
      const sample='<html><head></head><body><div class="title">CROSS GPT</div><div class="subtitle">クロッピー / v2.64.37</div></body></html>';
      const once=injectStatus(sample),twice=injectStatus(once);
      check('Behavior: iPhone update badge is actually injected',once.includes('data-croppy-update-badge="1"')&&once.includes('自動更新・最新 v2.64.21')&&once.includes('id="croppy-iphone-update-status-style"'));
      check('Behavior: iPhone update badge does not duplicate',(twice.match(/data-croppy-update-badge="1"/g)||[]).length===1&&(twice.match(/id="croppy-iphone-update-status-style"/g)||[]).length===1);
    }catch(e){check('Behavior: iPhone update badge is actually injected',false,e.message);check('Behavior: iPhone update badge does not duplicate',false,e.message)}
    check('iPhone native bridge',iphone.includes('soulz-save://')&&iphone.includes('soulz-repeat://search')&&iphone.includes('soulz-share://summary'));
    check('iPhone native save avoids URL payload size',iphone.includes('window.__croppyNativeSavePayload')&&iphone.includes("'soulz-save://'+k+'?x='")&&!iphone.includes("'soulz-save://'+k+'?data='"));
    check('iPhone native save pulls payload from WebView',iphone.includes('async function soulzSaveFromWeb(kind)')&&iphone.includes('window.__croppyNativeSavePayload')&&iphone.includes('web.evaluateJavaScript'));
    check('iPhone native save validates JSON shape',iphone.includes('function croppyNativeShapeOK(path, value)')&&iphone.includes('invalid native save shape'));
    check('iPhone auto-update source',iphone.includes('var AUTO_UPDATE_URL = "https://soulz-cross.onrender.com/";')&&iphone.includes('async function croppyLoadLatestHTML(bundled)')&&iphone.includes('croppy_iphone_update='));
    check('iPhone auto-update cache fallback',iphone.includes('SOULZ_CROSS_app_cache.html')&&iphone.includes('fm.fileExists(appCachePath)')&&iphone.includes('croppyWriteVerifiedCache(remote)')&&iphone.includes('using cached/bundled app'));
    check('iPhone staged update cache recovers on launch',iphone.includes('var cacheCandidates = [appCachePath, appCacheTempPath]')&&iphone.includes('cacheCandidate === appCacheTempPath')&&iphone.includes('croppyWriteVerifiedCache(cached)'));
    check('iPhone auto-update prevents downgrade',iphone.includes('croppyCompareVersion(remoteVersion, croppyHTMLVersion(bundled)) >= 0')&&iphone.includes('croppyCompareVersion(remoteVersion, bestVersion) >= 0'));
    try{
      const vf=extractFunctions(iphone,'croppyHTMLVersion');const vs=vf[vf.length-1].replace(/^function\s+croppyHTMLVersion/,'function');
      const version=Function('return ('+vs+');')();
      const cf=extractFunctions(iphone,'croppyValidHTML');const cs=cf[cf.length-1].replace(/^function\s+croppyValidHTML/,'function');
      const valid=Function('croppyHTMLVersion','return ('+cs+');')(version);
      const good='<!doctype html><html><head><title>CROSS GPT クロッピー | v2.64.37</title></head><body><button id="startMeasureBtn"></button><div id="workAreaTabs"></div><button id="lengthField"></button><button id="countField"></button><div id="keypadWrap"></div><button id="keypadRepeatBtn"></button><button id="historyAllBtn"></button></body></html>';
      const truncated=good.slice(0,-14);
      const noVersion=good.replace('CROSS GPT クロッピー | v2.64.37','CROSS GPT クロッピー');
      const missingId=good.replace('id="lengthField"','id="missingLengthField"');
      const brokenEnd=good.replace(/<\/body><\/html>$/,'');
      check('Behavior: truncated update HTML is rejected',valid(good)===true&&valid(truncated)===false);
      check('Behavior: update HTML without version is rejected',valid(noVersion)===false);
      check('Behavior: update HTML missing required UI is rejected',valid(missingId)===false);
      check('Behavior: structurally broken update HTML is rejected',valid(brokenEnd)===false);
    }catch(e){
      check('Behavior: truncated update HTML is rejected',false,e.message);
      check('Behavior: update HTML without version is rejected',false,e.message);
      check('Behavior: update HTML missing required UI is rejected',false,e.message);
      check('Behavior: structurally broken update HTML is rejected',false,e.message);
    }
    try{
      const vf=extractFunctions(iphone,'croppyHTMLVersion');const versionSrc=vf[vf.length-1].replace(/^function\s+croppyHTMLVersion/,'function');
      const versionFn=Function('return ('+versionSrc+');')();
      const cmpf=extractFunctions(iphone,'croppyCompareVersion');const compareSrc=cmpf[cmpf.length-1].replace(/^function\s+croppyCompareVersion/,'function');
      const compareFn=Function('return ('+compareSrc+');')();
      const valf=extractFunctions(iphone,'croppyValidHTML');const validSrc=valf[valf.length-1].replace(/^function\s+croppyValidHTML/,'function');
      const validFn=Function('croppyHTMLVersion','return ('+validSrc+');')(versionFn);
      const loadf=extractFunctions(iphone,'croppyLoadLatestHTML');
      const loadSrc=loadf[loadf.length-1]
        .replace(/^function\s+croppyLoadLatestHTML/,'function')
        .replace(/await\s+req\.loadString\(\)/g,'req.loadString()');
      const sample=function(v){
        return '<!doctype html><html><head><title>CROSS GPT クロッピー | v'+v+'</title></head><body><button id="startMeasureBtn"></button><div id="workAreaTabs"></div><button id="lengthField"></button><button id="countField"></button><div id="keypadWrap"></div><button id="keypadRepeatBtn"></button><button id="historyAllBtn"></button></body></html>';
      };
      const bundled=sample('2.64.36');
      function runUpdateScenario(opts){
        opts=opts||{};
        const CACHE='CACHE',TEMP='TEMP';
        const store=Object.assign({},opts.files||{});
        const cacheWrites=[],removed=[];
        const fmMock={
          fileExists:function(p){return Object.prototype.hasOwnProperty.call(store,p)},
          readString:function(p){if(opts.readError===p)throw new Error('cache read failed');return store[p]},
          remove:function(p){removed.push(p);delete store[p]}
        };
        function RequestMock(){this.timeoutInterval=0;this.headers={};this.loadString=function(){if(opts.remoteError)throw new Error('network offline');return opts.remote}}
        function writeCache(raw){cacheWrites.push(raw);store[CACHE]=raw;delete store[TEMP];return true}
        const factory=Function(
          'fm','appCachePath','appCacheTempPath','croppyHTMLVersion','croppyValidHTML','croppyCompareVersion','AUTO_UPDATE_URL','Request','Date','console','croppyWriteVerifiedCache',
          'var croppyUpdateSource=null,croppyUpdateVersion=null;return {run:('+loadSrc+'),source:function(){return croppyUpdateSource},version:function(){return croppyUpdateVersion}};'
        );
        const box=factory(fmMock,CACHE,TEMP,versionFn,validFn,compareFn,'https://example.invalid/',RequestMock,Date,{log:function(){}},writeCache);
        const result=box.run(bundled);
        return {result:result,source:box.source(),version:box.version(),cacheWrites:cacheWrites,removed:removed,store:store};
      }
      const remoteNew=sample('2.64.40');
      const cacheNew=sample('2.64.38');
      const tempNew=sample('2.64.39');
      const oldRemote=sample('2.64.35');
      const brokenRemote=remoteNew.replace(/<\/body><\/html>$/,'');
      const noVersionRemote=remoteNew.replace('CROSS GPT クロッピー | v2.64.40','CROSS GPT クロッピー');
      const missingUiRemote=remoteNew.replace('id="countField"','id="missingCountField"');

      let u=runUpdateScenario({remote:remoteNew});
      check('Behavior: valid newer remote wins and is cached',u.result===remoteNew&&u.source==='最新'&&u.cacheWrites[0]===remoteNew,JSON.stringify({source:u.source,writes:u.cacheWrites.length}));
      u=runUpdateScenario({remote:brokenRemote,files:{CACHE:cacheNew}});
      check('Behavior: broken remote HTML falls back to cache',u.result===cacheNew&&u.source==='キャッシュ',JSON.stringify({source:u.source}));
      u=runUpdateScenario({remote:noVersionRemote,files:{CACHE:cacheNew}});
      check('Behavior: versionless remote falls back to cache',u.result===cacheNew&&u.source==='キャッシュ',JSON.stringify({source:u.source}));
      u=runUpdateScenario({remote:missingUiRemote,files:{CACHE:cacheNew}});
      check('Behavior: remote missing required UI falls back to cache',u.result===cacheNew&&u.source==='キャッシュ',JSON.stringify({source:u.source}));
      u=runUpdateScenario({remote:oldRemote});
      check('Behavior: older remote cannot downgrade bundled app',u.result===bundled&&u.source==='内蔵',JSON.stringify({source:u.source}));
      u=runUpdateScenario({remoteError:true,files:{CACHE:cacheNew}});
      check('Behavior: offline launch uses valid cache',u.result===cacheNew&&u.source==='キャッシュ',JSON.stringify({source:u.source}));
      u=runUpdateScenario({remoteError:true,files:{CACHE:'<html>broken cache</html>'}});
      check('Behavior: broken cache plus remote failure uses bundled',u.result===bundled&&u.source==='内蔵',JSON.stringify({source:u.source}));
      u=runUpdateScenario({remoteError:true});
      check('Behavior: remote fetch failure uses bundled fallback',u.result===bundled&&u.source==='内蔵',JSON.stringify({source:u.source}));
      u=runUpdateScenario({remoteError:true,files:{CACHE:'<html>broken cache</html>',TEMP:tempNew}});
      check('Behavior: verified staged cache recovers after interrupted update',u.result===tempNew&&u.source==='キャッシュ'&&u.cacheWrites[0]===tempNew,JSON.stringify({source:u.source,writes:u.cacheWrites.length}));
      u=runUpdateScenario({remote:remoteNew.slice(0,Math.floor(remoteNew.length*0.6)),files:{CACHE:cacheNew}});
      check('Behavior: partially downloaded remote falls back safely',u.result===cacheNew&&u.source==='キャッシュ',JSON.stringify({source:u.source}));
    }catch(e){
      [
        'Behavior: valid newer remote wins and is cached',
        'Behavior: broken remote HTML falls back to cache',
        'Behavior: versionless remote falls back to cache',
        'Behavior: remote missing required UI falls back to cache',
        'Behavior: older remote cannot downgrade bundled app',
        'Behavior: offline launch uses valid cache',
        'Behavior: broken cache plus remote failure uses bundled',
        'Behavior: remote fetch failure uses bundled fallback',
        'Behavior: verified staged cache recovers after interrupted update',
        'Behavior: partially downloaded remote falls back safely'
      ].forEach(function(name){check(name,false,e.message)});
    }
    check('iPhone keeps stable local data origin',iphone.includes('await web.loadHTML(html, "https://soulz.local/");'));
    check('iPhone keypad clarity layer',iphone.includes('croppy-iphone-keypad-clarity')&&iphone.includes('#keypad .key[data-key]{font-size:1.30rem!important')&&iphone.includes('#keypad .flow-enter{border-width:3px!important')&&iphone.includes('croppyInjectIPhoneKeypadClarity(html)'));
  check('iPhone top safe-area compact layer',iphone.includes('id="croppy-iphone-top-compact"')&&iphone.includes('padding-top:10px!important')&&iphone.includes('croppyInjectIPhoneTopCompact(html)'));
    check('iPhone update source is visible',iphone.includes('croppyUpdateSource = "内蔵"')&&iphone.includes('croppyUpdateSource = "キャッシュ"')&&iphone.includes('croppyUpdateSource = "最新"')&&iphone.includes('croppyInjectIPhoneUpdateStatus(html)'));
    check('iPhone update badge distinguishes latest cache bundled',iphone.includes('自動更新・最新 ')&&iphone.includes('オフライン・キャッシュ ')&&iphone.includes('内蔵版 ')&&iphone.includes('croppy-iphone-update-status.latest')&&iphone.includes('croppy-iphone-update-status.cached'));
    check('iPhone update badge uses dedicated marker',iphone.includes('data-croppy-update-badge="1"')&&iphone.includes("s.indexOf('data-croppy-update-badge=\"1\"') < 0"));
    check('iPhone cached launch uses short timeout',iphone.includes('req.timeoutInterval = fm.fileExists(appCachePath) ? 2.5 : 5;'));
    check('iPhone share fallback copies on failure',iphone.includes('async function soulzPresentShare(text)')&&iphone.includes('await ShareSheet.present([text])')&&iphone.includes('Pasteboard.copyString')&&iphone.includes('共有を開けなかったためコピーしました'));
    check('iPhone share bridge uses resilient helper',iphone.includes('if (shareText) soulzPresentShare(shareText);'));
  }catch(e){check('iPhone embedded HTML decode',false,e.message)}
  
  check('Repeat keypad dedicated mode',html.includes("strip.classList.toggle('repeat-mode',repeatMode)")&&html.includes("label.textContent=repeatMode?'リピート':'長さ'")&&html.includes("repeatMode?'決定 → 長さ':'枚数へ ↵'"));
  check('Repeat first digit replaces existing value',html.includes('window.__SOULZ_REPEAT_REPLACE_NEXT')&&html.includes("if(window.__SOULZ_REPEAT_REPLACE_NEXT){v='';window.__SOULZ_REPEAT_REPLACE_NEXT=false}"));
  check('Repeat status contrast',html.includes('id="croppy-v26308-repeat-input"')&&html.includes('#measurementRepeatBadge')&&html.includes('-webkit-text-fill-color:#fff!important'));

  
  check('Active input is semantic red',html.includes('id="croppy-v26309-active-extra"')&&html.includes('background:#d93645!important')&&html.includes('border-color:#d93645!important'));
  check('Extra pattern button has explicit ON state',html.includes("b.textContent=extraPatternOn?'＋1柄 ON':'＋1柄'")&&html.includes("＋1柄 ON：次に追加する採寸へ反映")&&html.includes("＋1柄 ON：編集中の採寸へ反映"));
  check('Extra pattern uses JS event binding',html.includes("extraPatternBtn.addEventListener('click'")&&!html.includes('id="extraPatternBtn" class="extra-pattern-btn" aria-pressed="false" onclick='));
  try{
    const cut=makeFn('itemCutCm',{itemBaseCutCm:x=>Number(x.cm||0),repeatNumber:x=>Number(x)||0,roundCm:x=>Math.round(Number(x)*100)/100});
    const normal=cut({cm:55,repeatCm:52,extraPattern:false});
    const plusOne=cut({cm:55,repeatCm:52,extraPattern:true});
    check('Behavior: +1 pattern changes cut length',normal===104&&plusOne===156,'normal='+normal+', plusOne='+plusOne);
  }catch(e){check('Behavior: +1 pattern changes cut length',false,e.message)}

  
  check('Dynamic keypad bottom clearance',html.includes('--croppy-keypad-inset:292px')&&html.includes('function updateKeypadInset()')&&html.includes('ResizeObserver')&&html.includes("getBoundingClientRect().height"));
  check('Keypad hide button is visible and labeled',html.includes('keypad-toggle-direct')&&activeFunction('setKeypadHidden').includes("b.textContent=keypadHidden?'▲ テンキー':'▼ 閉じる'"));
  check('Visible decimal key restored',html.includes('class="key fn decimal-key" data-action="decimal"')&&html.includes('aria-label="小数点">.</button>'));
  check('Decimal key sits beside zero',html.indexOf('<button class="key" data-key="0">0</button>')<html.indexOf('class="key fn decimal-key" data-action="decimal"')&&html.indexOf('class="key fn decimal-key" data-action="decimal"')<html.indexOf('class="key fn lime" data-action="resetField"')&&html.includes('grid-column:2!important')&&html.includes('grid-row:4!important'));
  check('Numeric bottom row is 0 decimal clear',html.includes('#keypad>.key[data-key="0"]{grid-column:1!important;grid-row:4!important}')&&html.includes('#keypad>.key[data-action="resetField"]{grid-column:3!important;grid-row:4!important}'));
  check('Keypad undo redo buttons removed',!html.includes('id="undoKey"')&&!html.includes('id="redoKey"')&&!html.includes('class="key-nav-pair"'));
  check('Decimal handler supports length and repeat',activeFunction('handleKeyButton').includes("a==='decimal'")&&activeFunction('inputDecimal').includes("state.length=v+'.'")&&activeFunction('inputDecimal').includes("state.repeatCm=v+'.'"));
  check('Repeat OFF target enlarged',html.includes('id="croppy-v26415-repeat-signal"')&&html.includes('min-width:64px!important')&&html.includes('font-size:.76rem!important')&&html.includes('min-width:60px!important'));
  check('Repeat controls stay inside one capsule',html.includes('id="keypadRepeatCapsule"')&&html.includes('id="croppy-v2648-repeat-capsule"')&&html.includes('.keypad-repeat-capsule{')&&activeFunction('refreshInputLoop').includes("capsule.classList.toggle('repeat-ready'"));
  check('Mobile close button is forced beside repeat capsule',html.includes('.keypad-control-strip>.keypad-toggle-direct{grid-column:2!important')&&html.includes('.keypad-wrap.collapsed .keypad-control-strip>.keypad-toggle-direct{display:block!important;grid-column:1!important'));
  check('Legacy keypad toggle cannot force a second row',!html.includes('.keypad-toggle{grid-column:1/-1!important'));
  check('Repeat ON uses amber state color',html.includes('id="croppy-v26410-repeat-state-colors"')&&html.includes('.keypad-repeat-capsule.repeat-ready{')&&html.includes('#ffe7a8')&&html.includes('#f4c95f'));
  check('Repeat editing stays red',html.includes('.keypad-repeat-capsule.repeat-active:not(.repeat-ready){')&&html.includes('border-color:#d93645!important')&&html.includes('background:#fff1f2!important'));
  check('Plus1 ON uses deeper amber',html.includes('.keypad-repeat-capsule.repeat-ready .keypad-extra-direct.on{')&&html.includes('background:#e5a900!important'));
  check('Repeat plus active input uses red and amber rings',html.includes('id="croppy-v26411-repeat-input-mix"')&&html.includes('body.repeat-measure-active.room-tab-active #lengthField.field.active')&&html.includes('0 0 0 6px rgba(229,169,0,.42)'));
  check('Repeat active input has strong amber outline',html.includes('id="croppy-v26415-repeat-signal"')&&html.includes('outline:4px solid #f0bd2b!important')&&html.includes('background:linear-gradient(180deg,#fff4bd 0%,#f7fbfa 72%)!important'));
  check('Repeat active badge explicitly says input in progress',activeFunction('renderEntry').includes("'リピート入力中 '+fmtCm(state.repeatCm)+'cm'")&&html.includes('background:linear-gradient(180deg,#ffe7a8,#f4c95f)!important'));
  check('Repeat active input badge gets amber ring',html.includes('#lengthField.field.active::after')&&html.includes('outline:3px solid #f0bd2b!important'));
  check('Repeat focus flashes once on state entry',activeFunction('refreshInputLoop').includes("repeatMeasureNow&&!repeatMeasureWas")&&activeFunction('refreshInputLoop').includes("classList.add('repeat-focus-flash')")&&activeFunction('refreshInputLoop').includes("setTimeout(function(){document.body.classList.remove('repeat-focus-flash')},620)"));
  check('Repeat focus flash respects reduced motion',html.includes('@media(prefers-reduced-motion:reduce)')&&html.includes('animation:none!important'));
  check('Repeat focus flash is not continuous',html.includes('animation:croppyRepeatFocusFlash .62s ease-out 1')&&html.includes('animation:croppyRepeatBadgeFlash .62s ease-out 1'));
  check('Keypad active input also gets amber repeat ring',html.includes('body.repeat-measure-active .keypad-input-strip button.active')&&html.includes('0 0 0 5px rgba(229,169,0,.38)'));
  check('Repeat-active body class excludes repeat-width edit',activeFunction('refreshInputLoop').includes("repeatMeasureNow=repReady&&!repeatMode")&&activeFunction('refreshInputLoop').includes("classList.toggle('repeat-measure-active',repeatMeasureNow)"));
  check('Repeat capsule order is repeat + plus1 + off',html.indexOf('id="keypadRepeatBtn"')<html.indexOf('id="keypadExtraPatternBtn"')&&html.indexOf('id="keypadExtraPatternBtn"')<html.indexOf('id="keypadRepeatOffBtn"')&&html.indexOf('id="keypadRepeatOffBtn"')<html.indexOf('id="keypadToggle"'));
  check('Inline edit carries +1 pattern',html.includes('setExtraPattern(!!it.extraPattern&&repeatNumber(it.repeatCm)>0)')&&html.includes('it.extraPattern=!!nextExtra'));
  check('Inline +1 preview is immediate',html.includes('{cm:measureCm,extraPattern:extraPatternEnabled()}')&&html.includes('(selected?extraPatternEnabled():x.extraPattern)'));
  try{
    const it={cm:100,count:1,cutCount:0,repeatCm:52.5,extraPattern:false};
    const state={length:'100',count:'1',recent:[],repeatOn:true,repeatCm:'52.5'};
    let snapshot=false,rendered=false;
    const commit=makeFn('commitInlineItemEdit',{
      state,inlineEditItem:()=>it,clearInlineEditState:()=>{},inputLengthToCm:v=>Number(v),toast:()=>{},setActive:()=>{},
      roundCm:v=>Number(v),repeatNumber:v=>Number(v)||0,extraPatternEnabled:()=>true,
      pushInlineEditUndoSnapshot:()=>{snapshot=true},normalizedCutCount:()=>0,rememberRecentLength:()=>{},setExtraPattern:()=>{},saveDraft:()=>{},render:()=>{rendered=true}
    });
    const ok=commit(false);
    check('Behavior: editing can add +1 pattern',ok===true&&it.extraPattern===true&&snapshot&&rendered,JSON.stringify(it));
  }catch(e){check('Behavior: editing can add +1 pattern',false,e.message)}

  
  check('Final active field red override',html.includes('id="croppy-v26311-active-red-final"')&&html.includes("content:'入力中'!important")&&html.includes('background:#d93645!important'));

  
  check('High-specificity top active red',html.includes('id="croppy-v26312-semantic-active-red"')&&html.includes('body[data-croppy-theme].room-tab-active .entry.input-primary #lengthField.field.active')&&html.includes("content:'入力中'!important"));
  check('Repeat field active red',html.includes('#repeatField.repeat-card.active')&&html.includes("content:'入力中'!important"));
  check('Repeat keypad active red',html.includes('.keypad-input-strip.repeat-mode #keypadLengthTarget.active')&&html.includes('background:#d93645!important'));

  
  check('Quick buttons use only entered lengths',html.includes('function activeRecentLengthsStore()')&&html.includes('function rememberRecentLength(cm)')&&!html.includes('var base=[90,180,240,250,270,300]'));
  check('Site recent shared and quick isolated',html.includes("if(isQuickCalcRoom(r)){if(!Array.isArray(r.recent))r.recent=[];return r.recent}")&&html.includes('q.recent=Array.isArray(q.recent)'));
  check('Inline edit uses shared recent helper',activeFunction('commitInlineItemEdit').includes('rememberRecentLength(cm)')&&!activeFunction('commitInlineItemEdit').includes('state.recent='));
  check('Render keeps repeat manual active chrome synced',activeFunction('renderEntry').includes("repeatManual.classList.toggle('input-active',state.active==='repeat')")&&activeFunction('renderEntry').includes("repeatManual.setAttribute('aria-pressed',state.active==='repeat'?'true':'false')"));
  check('New site clears length shortcuts',html.includes("recent:[],repeatOn:false"));
  check('Repeat manual button gets red active state',html.includes('#repeatManualBtn.input-active')&&html.includes("repeatManual.classList.toggle('input-active',name==='repeat')"));
  try{
    const q={items:[],recent:[235,100,235,55]};
    const normalize=makeFn('normalizeQuickCalcRoom',{
      quickCalcId:a=>'quick::'+String(a||'area'),freshProducts:()=>({ceil:'',wall:'',accent:''}),freshRepeats:()=>({ceil:0,wall:0,accent:0}),
      validCategory:()=>true,normalizedCutCount:()=>0
    });
    const out=normalize(q,'area_1');
    check('Behavior: quick recent survives separately',Array.isArray(out.recent)&&out.recent.length===4&&out.recent[0]===235,JSON.stringify(out.recent));
  }catch(e){check('Behavior: quick recent survives separately',false,e.message)}

  
  check('Recent chips max ten',html.includes('next.length<10')&&html.includes('values.length<10')&&html.includes('.slice(0,10)'));
  check('Recent chips individual delete',html.includes('function removeRecentLength(cm)')&&html.includes('class="quick-remove"')&&html.includes('data-remove'));
  check('Recent chips omit unit text',activeFunction('renderQuick').includes(">'+shown+'</button>")&&!activeFunction('renderQuick').includes('shown+unit'));
  check('Main site/measure tabs follow theme',html.includes('id="croppy-v26314-theme-tabs-recent"')&&html.includes('#projectSiteTab.project-tab-fixed.active')&&html.includes('#projectMeasureTab.project-tab-fixed.active')&&html.includes('linear-gradient(180deg,var(--ct-accent2),var(--ct-accent))'));

  
  check('Repeat manual button active state wired',activeFunction('setActive').includes("repeatManual.classList.toggle('input-active',name==='repeat')")&&activeFunction('setActive').includes("repeatManual.setAttribute('aria-pressed',name==='repeat'?'true':'false')"));
  check('Repeat manual button active style',html.includes('id="croppy-v26315-repeat-button-active"')&&html.includes('#repeatManualBtn.input-active::after')&&html.includes("content:' 入力中'"));

  
  check('Repeat controls follow theme colors',html.includes('id="croppy-v26316-repeat-theme-colors"')&&html.includes('.product-repeat-search')&&html.includes('color-mix(in srgb,var(--ct-accent) 6%,#fff)'));
  check('Repeat active red still wins',html.includes('#repeatManualBtn.input-active')&&html.includes('background:#fff1f2!important')&&html.includes('border:2px solid #d93645!important'));

  check('Cut meter relationship is explicit',html.includes('✂ カット進捗')&&html.includes('今回のカット')&&html.includes('累計カット済み')&&html.includes('開始後に✓した分'));
  check('Cut checkbox follows theme',html.includes('id="croppy-v26318-cut-meter-link"')&&html.includes('.cut-box:checked')&&html.includes('background:var(--ct-accent)!important'));
  check('Inline edit uses semantic red',html.includes('.one-line-item.edit-selected .edit-part.edit-active')&&html.includes('background:#d93645!important'));
  check('Meter button state updates',activeFunction('renderMeterProgress').includes("btn.textContent='ここからカット開始'")&&activeFunction('renderMeterProgress').includes("btn.textContent='開始点を更新'")&&activeFunction('renderMeterProgress').includes("run.textContent='● 今回計測中'"));
  check('Per-row cut status is concise',activeFunction('renderList').includes('cut-state-label')&&activeFunction('renderList').includes("complete?'済':''")&&activeFunction('renderList').includes("complete?'✓ カット済み':'未カット'"));
  check('Cut progress has no extra slider operation',!activeFunction('renderList').includes('data-cutrange')&&!activeFunction('renderList').includes('data-progress-toggle'));
  check('Cut row status follows theme',html.includes('id="croppy-v26319-cut-row-status"')&&html.includes('.cut-box:checked + .cut-state-label'));
  check('Cut session emphasis style present',html.includes('id="croppy-v26320-cut-session"')&&html.includes('#checkedMeterSince')&&html.includes('.meter-run-state.active'));
  check('Cut baseline stored in site state',activeFunction('setMeterBaseline').includes('state.cutMeterBaseline=checkedMeterTotal()')&&html.includes('cutMeterBaseline:state.cutMeterBaseline')&&html.includes('state.cutMeterBaseline=(h.cutMeterBaseline===null'));
  check('New site resets cut baseline',html.includes("cutMeterBaseline:null,editingHistoryId:null"));
  check('Legacy global meter baseline removed',activeFunction('loadMeterBaseline').includes("localStorage.removeItem('CROSS_GPT_METER_BASELINE')"));
  check('Quick calc jumps straight to measurement',activeFunction('selectProjectTab').includes('var quickJump=isQuickCalcId(id)')&&activeFunction('selectProjectTab').includes("if(quickJump){state.active='length';setKeypadHidden(false)}")&&activeFunction('selectProjectTab').includes('if(quickJump)bringMeasurementToTop()'));
  check('Quick calc keeps keypad open',activeFunction('ensureQuickCalcRoom').includes('setKeypadHidden(false);bringMeasurementToTop()'));
  check('Quick calc hides setup chrome',html.includes('id="croppy-v26322-quick-focus"')&&html.includes('body.quick-calc-mode #workAreaWrap')&&html.includes('body.quick-calc-mode #roomTabsWrap')&&html.includes('display:none!important'));
  check('Repeat labels remain readable',html.includes("rb.textContent=activeRepeat?'リピート入力中 '+fmtCm(state.repeatCm)+'cm':''")&&html.includes("+' / リピート '+cutDisplayValue(x.repeatCm)")&&html.includes("toast('リピート '+state.repeatCm+'cm を設定')"));
  check('OCR example uses repeat wording',html.includes('リピート64.2')&&html.includes('(?:リピート|柄\\s*リピート|柄|repeat|rep\\.?|R)'));
  check('Repeat wording layout support',html.includes('id="croppy-v26323-repeat-wording"')&&html.includes('.product-repeat-status{max-width:185px!important}'));
  check('Repeat remains per item without retroactive rewrite',activeFunction('applyRepeatToActiveSection').includes("state.repeatCm=rep>0?fmtCm(rep):''")&&!activeFunction('applyRepeatToActiveSection').includes('roomItems(r.id).forEach'));
  check('Sticky repeat survives item add',!activeFunction('addItem').includes("state.repeatOn=false;state.repeatCm=''")&&activeFunction('addItem').includes('setExtraPattern(false)'));
  check('Sticky repeat remains visibly active',activeFunction('refreshInputLoop').includes("repReady?'リピート '+fmtCm(state.repeatCm)"));
  check('Product change clears active repeat only on commit',html.includes('__SOULZ_PRODUCT_BEFORE_EDIT')&&html.includes("toast('品番変更：リピート OFF')")&&html.includes("addEventListener('change',function(e){var before="));
  check('Cut estimate opens calculation detail',html.includes('data-calc-detail')&&activeFunction('showCutCalculationDetail').includes("title:'計算内訳'")&&activeFunction('cutCalculationDetailText').includes("'柄合わせ前　'"));
  check('Keypad +1 pattern control present',html.includes('id="keypadExtraPatternBtn"')&&html.includes('id="croppy-v2643-sticky-repeat-extra"')&&html.includes("keypadExtraPatternBtn.addEventListener('click'"));
  try{
    const state={length:'30',count:'1',activeCategory:'wall',repeatOn:true,repeatCm:'52.5',active:'count'};
    const room={id:'r1',name:'洗面',items:[]};let extra=true;
    const add=makeFn('addItem',{state,inlineEditId:()=>null,commitInlineItemEdit:()=>{},normalizeProjectState:()=>{},currentRoom:()=>room,inputLengthToCm:v=>Number(v),setActive:n=>state.active=n,toast:()=>{},snap:()=>{},validCategory:()=>true,repeatNumber:v=>Number(v)||0,roundCm:v=>Math.round(v*100)/100,itemStoreForRoom:r=>r.items,extraPatternEnabled:()=>extra,setExtraPattern:v=>{extra=!!v},rememberRecentLength:()=>{},saveDraft:()=>{},render:()=>{},categoryLabel:()=>''});
    add();state.length='40';state.count='1';add();
    check('Behavior: repeat stays on while +1 pattern is one-shot',room.items.length===2&&room.items[0].repeatCm===52.5&&room.items[0].extraPattern===true&&room.items[1].repeatCm===52.5&&room.items[1].extraPattern===false&&state.repeatOn&&state.repeatCm==='52.5'&&!extra,JSON.stringify(room.items));
  }catch(e){check('Behavior: repeat stays on while +1 pattern is one-shot',false,e.message)}
  try{
    const items=[{id:1,cm:30,count:1,repeatCm:0,extraPattern:false,cutCount:0},{id:2,cm:40,count:1,repeatCm:0,extraPattern:false,cutCount:0}];
    const state={length:'40',count:'1',repeatOn:true,repeatCm:'52.5',recent:[]};let extra=false;
    const commit=makeFn('commitInlineItemEdit',{state,inlineEditItem:()=>items[1],clearInlineEditState:()=>{},inputLengthToCm:v=>Number(v),toast:()=>{},setActive:()=>{},roundCm:v=>Number(v),repeatNumber:v=>Number(v)||0,extraPatternEnabled:()=>extra,pushInlineEditUndoSnapshot:()=>{},normalizedCutCount:x=>x.cutCount||0,rememberRecentLength:()=>{},setExtraPattern:v=>{extra=!!v},saveDraft:()=>{},render:()=>{}});
    commit(false);
    check('Behavior: inline repeat changes selected row only',items[0].repeatCm===0&&items[1].repeatCm===52.5,JSON.stringify(items));
  }catch(e){check('Behavior: inline repeat changes selected row only',false,e.message)}
  check('Inline edit owns its repeat',activeFunction('beginInlineItemEdit').includes("state.repeatOn=repeatNumber(it.repeatCm)>0")&&activeFunction('commitInlineItemEdit').includes('it.repeatCm=nextRepeat'));
  check('Inline edit restores sticky repeat state',activeFunction('beginInlineItemEdit').includes('__SOULZ_INLINE_ENTRY_REPEAT_RETURN')&&activeFunction('clearInlineEditState').includes('repeatReturn')&&!activeFunction('commitInlineItemEdit').includes("state.repeatOn=false;state.repeatCm=''"));
  check('Cut slider removed from active list',!activeFunction('renderList').includes('data-cutrange')&&!activeFunction('renderList').includes('data-progress-toggle')&&activeFunction('renderList').includes("complete?'✓ カット済み':'未カット'"));
  check('Cut checkbox is all or nothing',activeFunction('setCutDone').includes('it.cutCount=done?it.count:0'));
  check('Per-item repeat style present',html.includes('id="croppy-v26324-per-item-repeat"'));
  try{
    const state={cutAllowanceCm:0};
    const cutAllowanceCm=makeFn('cutAllowanceCm',{state});
    const itemBaseCutCm=makeFn('itemBaseCutCm',{roundCm:v=>Number(v),cutAllowanceCm});
    const itemCutCm=makeFn('itemCutCm',{itemBaseCutCm,repeatNumber:v=>Number(v)||0,roundCm:v=>Number(v)});
    const noAllowance=itemCutCm({cm:50,repeatCm:52.5,extraPattern:false});
    state.cutAllowanceCm=6;
    const withAllowance=itemCutCm({cm:50,repeatCm:52.5,extraPattern:false});
    check('Behavior: 50cm repeat52.5 respects allowance',noAllowance===52.5&&withAllowance===105,'none='+noAllowance+', allowance6='+withAllowance);
    state.cutAllowanceCm=6;const detailFn=makeFn('cutCalculationDetailText',{roundCm:v=>Number(v),cutAllowanceCm:()=>6,repeatNumber:v=>Number(v)||0,cutCalcDisplay:v=>String(v)+'cm'});const detail=detailFn({cm:50,repeatCm:52.5,extraPattern:true});check('Behavior: calc detail shows 50→56→105→157.5',detail.includes('採寸　50cm')&&detail.includes('柄合わせ前　56cm')&&detail.includes('柄合わせ　105cm')&&detail.includes('カット目安　157.5cm'),detail);
  }catch(e){check('Behavior: 50cm repeat52.5 respects allowance',false,e.message)}
  check('Repeat decimal draft preserves trailing dot',activeFunction('inputDecimal').includes("state.repeatCm=v+'.'")&&!activeFunction('inputDecimal').includes('applyRepeatToActiveSection'));
  try{
    const state={active:'repeat',repeatOn:true,repeatCm:'',count:'1',length:''};
    const env={
      state,redoStack:[],window:{__SOULZ_REPEAT_REPLACE_NEXT:false,__SOULZ_INLINE_EDIT_DIRTY:false},
      setRepeatExpanded:()=>{},inlineEditId:()=>null,renderEntry:()=>{},renderList:()=>{},saveDraft:()=>{},
      toast:()=>{},repeatNumber:v=>{const n=parseFloat(v);return Number.isNaN(n)?0:n},fmtCm:v=>String(Number(v)),
      setActive:n=>{state.active=n},refreshInputLoop:()=>{},roundCm:v=>Math.round((Number(v)+Number.EPSILON)*100)/100
    };
    const decimal=makeFn('inputDecimal',env);
    const digit=makeFn('inputDigit',env);
    state.active='length';state.length='52';decimal();digit('5');
    check('Behavior: length 52.5 keeps decimal',state.length==='52.5','length='+state.length);
    state.active='repeat';state.repeatCm='52';decimal();digit('5');
    check('Behavior: repeat 52.5 keeps decimal',state.repeatCm==='52.5','repeatCm='+state.repeatCm);
  }catch(e){check('Behavior: repeat 52.5 keeps decimal',false,e.message)}

  check('Repeat digits stay raw until commit',!activeFunction('inputDigit').includes('applyRepeatToActiveSection(state.repeatCm')&&activeFunction('nextInputStep').includes('state.repeatCm=fmtCm(repeatNumber(state.repeatCm))'));
  check('Input handler monkey patches removed',!html.includes('var oldHandleKeyButton=handleKeyButton')&&!html.includes('var oldRenderEntry=renderEntry')&&!html.includes('var oldSetActive=setActive'));
  check('Canonical handlers refresh keypad directly',activeFunction('setActive').includes('refreshInputLoop()')&&activeFunction('renderEntry').includes('refreshInputLoop()')&&activeFunction('handleKeyButton').includes("a==='flowEnter'"));
  check('Cleanup markers present',html.includes('id="croppy-v2640-cleanup"')&&html.includes('v2.64.11 CLEANUP 2'));
  check('Dead cut slider CSS removed',!html.includes('.cut-range{')&&!html.includes('.cut-progress{')&&!html.includes('.one-line-progress{')&&!html.includes('__SOULZ_CUT_PROGRESS_OPEN'));
  check('Keypad repeat control outside number grid',html.includes('id="keypadRepeatBtn"')&&html.indexOf('id="keypadRepeatBtn"')<html.indexOf('<div class="keypad" id="keypad">'));
  check('Keypad repeat control does not resize number keys',html.includes('id="croppy-v2641-keypad-repeat"')&&html.includes('.keypad-wrap.collapsed .keypad-repeat-btn{display:none!important}'));
  check('Keypad repeat button shows off on and input states',activeFunction('refreshInputLoop').includes("'リピート OFF'")&&activeFunction('refreshInputLoop').includes("'リピート入力中'")&&activeFunction('refreshInputLoop').includes("'リピート '+fmtCm(state.repeatCm)"));
  check('Keypad repeat control enters direct input mode',html.includes("$('#keypadRepeatBtn').addEventListener('click',function(){beginRepeatInput()")&&activeFunction('beginRepeatInput').includes("state.repeatOn=true")&&activeFunction('beginRepeatInput').includes("setActive('repeat')"));
  check('Repeat without stored value starts input directly',html.includes("$('#keypadRepeatBtn').addEventListener('click',function(){beginRepeatInput()")&&activeFunction('beginRepeatInput').includes("saved=repeatNumber(state.repeatCm)")&&activeFunction('beginRepeatInput').includes("setActive('repeat')")&&activeFunction('beginRepeatInput').includes('__SOULZ_REPEAT_REPLACE_NEXT=true'));
  check('Repeat OFF preserves stored value',html.includes('id="keypadRepeatOffBtn"')&&html.includes('hidden>OFF</button>')&&html.includes("$('#keypadRepeatOffBtn').addEventListener('click',function(){disableRepeatInput()")&&activeFunction('disableRepeatInput').includes("state.repeatOn=false")&&!activeFunction('disableRepeatInput').includes("state.repeatCm=''")&&activeFunction('disableRepeatInput').includes("cmを保持"));
  check('Repeat OFF to ON reuses stored value',activeFunction('beginRepeatInput').includes("forceEdit!==true&&!state.repeatOn&&saved>0")&&activeFunction('beginRepeatInput').includes("state.repeatOn=true;window.__SOULZ_REPEAT_REPLACE_NEXT=false")&&activeFunction('beginRepeatInput').includes("setActive('length')"));
  check('Repeat OFF shows remembered value',activeFunction('refreshInputLoop').includes("memoryOff=!state.repeatOn&&!repeatMode&&savedRepeat>0")&&activeFunction('refreshInputLoop').includes("class=\"repeat-memory\">記憶 ")&&activeFunction('refreshInputLoop').includes("rpt.classList.toggle('memory-off',memoryOff)"));
  check('Remembered repeat hint is visually neutral',html.includes('id="croppy-v26417-repeat-memory-ui"')&&html.includes('color:#7b8796!important')&&html.includes('border-left:1px solid rgba(100,116,139,.38)!important'));
  check('Remembered repeat hint has accessible OFF label',activeFunction('refreshInputLoop').includes("リピート OFF。記憶 ")&&activeFunction('refreshInputLoop').includes("cm"));
  check('Repeat three-state wording is fixed',activeFunction('refreshInputLoop').includes("'リピート OFF'")&&activeFunction('refreshInputLoop').includes("'リピート '+fmtCm(state.repeatCm)")&&activeFunction('refreshInputLoop').includes("'リピート入力中'")&&activeFunction('refreshInputLoop').includes("class=\"repeat-memory\">記憶 "));
  check('Remembered state stays neutral not amber',html.includes('#keypadRepeatBtn.memory-off .repeat-memory')&&html.includes('color:#7b8796!important')&&!html.includes('#keypadRepeatBtn.memory-off .repeat-memory{color:#f4c95f'));
  check('Manual repeat button still opens value editor',html.includes("repeatManualBtn.addEventListener('click',function(){beginRepeatInput(true)}"));
  check('Legacy repeat toggle shares memory behavior',html.includes("els.repeatToggle.addEventListener('click',function(){if(state.repeatOn)disableRepeatInput();else beginRepeatInput()})"));

  try{
    global.window={__SOULZ_REPEAT_REPLACE_NEXT:false,__SOULZ_INLINE_EDIT_DIRTY:false};
    const state={active:'length',repeatOn:true,repeatCm:'52.5'};
    let extra=true,active='length',message='';
    const off=makeFn('disableRepeatInput',{
      state,inlineEditId:()=>null,repeatNumber:v=>Number(v)||0,window:global.window,setExtraPattern:v=>{extra=!!v},
      setActive:n=>{state.active=n;active=n},renderEntry:()=>{},saveDraft:()=>{},refreshInputLoop:()=>{},toast:m=>{message=m},fmtCm:v=>String(Number(v))
    });
    off();
    check('Behavior: OFF keeps 52.5 in memory',state.repeatOn===false&&state.repeatCm==='52.5'&&!extra&&active==='length'&&message.includes('52.5cmを保持'),JSON.stringify(state));
  }catch(e){check('Behavior: OFF keeps 52.5 in memory',false,e.message)}
  try{
    global.window={__SOULZ_REPEAT_REPLACE_NEXT:false,__SOULZ_INLINE_EDIT_DIRTY:false};
    const state={active:'length',repeatOn:false,repeatCm:'52.5'};
    let active='length',message='';
    const begin=makeFn('beginRepeatInput',{
      state,inlineEditId:()=>null,repeatNumber:v=>Number(v)||0,keypadHidden:false,setKeypadHidden:()=>{},window:global.window,
      setRepeatExpanded:()=>{},setActive:n=>{state.active=n;active=n},renderEntry:()=>{},saveDraft:()=>{},refreshInputLoop:()=>{},
      toast:m=>{message=m},fmtCm:v=>String(Number(v))
    });
    begin();
    check('Behavior: ON restores remembered 52.5',state.repeatOn===true&&state.repeatCm==='52.5'&&active==='length'&&global.window.__SOULZ_REPEAT_REPLACE_NEXT===false&&message.includes('52.5cm ON'),JSON.stringify(state));
  }catch(e){check('Behavior: ON restores remembered 52.5',false,e.message)}
  try{
    global.window={__SOULZ_REPEAT_REPLACE_NEXT:false,__SOULZ_INLINE_EDIT_DIRTY:false};
    const state={active:'length',repeatOn:false,repeatCm:''};
    let active='length';
    const begin=makeFn('beginRepeatInput',{
      state,inlineEditId:()=>null,repeatNumber:v=>Number(v)||0,keypadHidden:false,setKeypadHidden:()=>{},window:global.window,
      setRepeatExpanded:()=>{},setActive:n=>{state.active=n;active=n},renderEntry:()=>{},saveDraft:()=>{},refreshInputLoop:()=>{},
      toast:()=>{},fmtCm:v=>String(Number(v))
    });
    begin();
    check('Behavior: empty memory opens repeat input',state.repeatOn===true&&active==='repeat'&&global.window.__SOULZ_REPEAT_REPLACE_NEXT===true,JSON.stringify(state));
  }catch(e){check('Behavior: empty memory opens repeat input',false,e.message)}
  check('Numeric keypad grid unchanged by direct repeat control',html.includes('<div class="keypad" id="keypad">')&&html.includes('<button class="key" data-key="7">7</button><button class="key" data-key="8">8</button><button class="key" data-key="9">9</button>'));
  check('Memo summary removes zero-value clutter',!activeFunction('summaryText').includes("'予備込み")&&!activeFunction('summaryText').includes("'品番ごとの発注")&&!activeFunction('summaryText').includes("'発注合計")&&!activeFunction('summaryText').includes("'↓ 0.5m単位"));
  check('Memo summary hides missing product wording',!activeFunction('summaryText').includes('品番未入力')&&activeFunction('summaryText').includes("'内訳'"));
  check('Cut memo card uses compact order rows',!activeFunction('renderCutMemoCard').includes('cut-memo-simple-note')&&!activeFunction('renderCutMemoCard').includes('予備込み')&&activeFunction('renderCutMemoCard').includes('cut-memo-breakdown-title">内訳'));
  try{
    const room={id:'r1',workAreaId:'a1',name:'洗面',products:{wall:'',ceiling:'',accent:''}};
    const items=[{id:1,roomId:'r1',category:'wall',cm:200,count:3,repeatCm:32,extraPattern:false},{id:2,roomId:'r1',category:'accent',cm:100,count:1,repeatCm:0,extraPattern:false}];
    const state={jobName:'',customerName:'',address:'',workAreas:[{id:'a1',name:'101'}],rooms:[room],inputUnit:'cm',waste:0,memo:''};
    const plan={needCm:1302,actualCm:985,order:14,wasteExtraM:0,groups:[{categories:['wall'],code:'',total:{order:5.5}},{categories:['accent'],code:'',total:{order:8.5}}]};
    const compactLabel=g=>(g.categories||[]).map(k=>({wall:'壁',accent:'アクセント'}[k]||k)).join('・')+(g.code?' '+g.code:'');
    const fn=makeFn('summaryText',{normalizeProjectState:()=>{},currentRoom:()=>room,isQuickCalcRoom:()=>false,roomItems:()=>items,realProjectItems:()=>items,buildOrderPlan:()=>plan,state,locationAreaPathText:()=> '101',CATEGORY_DEFS:[{key:'wall',label:'壁'},{key:'ceiling',label:'天井'},{key:'accent',label:'アクセント'}],groupRepeatLabel:g=>g.some(x=>x.repeatCm)?'リピート32cm':'',itemCutCm:x=>x.repeatCm?224:x.cm,cutDisplayValue:v=>String(v),cutDisplayUnit:()=> 'cm',repeatNumber:v=>Number(v)||0,compactOrderGroupLabel:compactLabel});
    const memo=fn('activeRoom');
    check('Behavior: compact memo has only useful totals',memo.includes('発注\n必要 13.02m\n発注 14.0m\n実寸 9.85m')&&memo.includes('内訳\n壁 5.5m')&&!memo.includes('予備 0%')&&!memo.includes('品番未入力')&&!memo.includes('予備込み'),memo);
  }catch(e){check('Behavior: compact memo has only useful totals',false,e.message)}



  check('Data safety settings UI',html.includes('id="dataBackupBtn"')&&html.includes('id="dataRestoreBtn"')&&html.includes('id="dataUndoRestoreBtn"')&&html.includes('id="dataRestoreInput"')&&html.includes('id="dataSafetyLastBackup"'));
  check('Recovery guard keys present',html.includes("DRAFT_RECOVERY_KEY='SOULZ_CROSS_RECOVERY_DRAFT_V1'")&&html.includes("HISTORY_RECOVERY_KEY='SOULZ_CROSS_RECOVERY_HISTORY_V1'"));
  check('Web staged save keys present',html.includes("DRAFT_STAGE_KEY='SOULZ_CROSS_STAGE_DRAFT_V1'")&&html.includes("HISTORY_STAGE_KEY='SOULZ_CROSS_STAGE_HISTORY_V1'"));
  check('Web staged save verifies before promote',activeFunction('croppyWriteWithRecovery').includes("staged save verification failed")&&activeFunction('croppyWriteWithRecovery').includes("primary save verification failed")&&activeFunction('croppyWriteWithRecovery').includes('localStorage.removeItem(stageKey)'));
  check('Backup excludes staged snapshots',activeFunction('croppyIsRecoveryKey').includes("SOULZ_CROSS_STAGE_"));
  check('Storage quota gets specific guidance',html.includes("function croppyStorageFaultInfo(err)")&&html.includes("保存容量がいっぱいです。バックアップ後に履歴を整理してください")&&html.includes("__CROPPY_STORAGE_FAULT_REASON=info.reason"));
  try{
    const info=makeFn('croppyStorageFaultInfo',{String,Number});
    const quota=info({name:'QuotaExceededError',code:22,message:'quota exceeded'});
    const generic=info({name:'UnknownError',code:0,message:'write failed'});
    check('Behavior: storage fault distinguishes quota',quota.reason==='quota'&&quota.message.includes('保存容量がいっぱい')&&generic.reason==='write'&&!generic.message.includes('保存容量がいっぱい'),JSON.stringify({quota,generic}));
  }catch(e){check('Behavior: storage fault distinguishes quota',false,e.message)}
  check('Web boot history allows localStorage fallback',html.includes('window.__SOULZ_BOOT_HISTORY = null;')&&activeFunction('load').includes("croppyReadWithRecovery(HISTORY_KEY,HISTORY_RECOVERY_KEY,'history')"));
  check('Background safety flush saves draft and history',html.includes("window.addEventListener('pagehide',flushCroppySafety)")&&activeFunction('flushCroppySafety').includes('saveDraft()')&&activeFunction('flushCroppySafety').includes('flushAutoHistorySave()'));
  check('Backup success status persists separately',html.includes("CROPPY_LAST_BACKUP_META_KEY='CROPPY_LAST_BACKUP_META'")&&html.includes('croppyRememberBackupSuccess(result.location')&&html.includes("croppyRememberBackupSuccess('ダウンロード')"));
  check('Backup status shows time and destination',html.includes("'最終バックアップ '+lastText")&&html.includes("last.location?' ・ '+last.location"));
  try{
    const parse=makeFn('croppyStoredValue',{});
    const store={p:'{broken',s:'{"jobName":"復旧"}'};const ls={getItem:k=>Object.prototype.hasOwnProperty.call(store,k)?store[k]:null,setItem:(k,v)=>{store[k]=v}};const recovered=[];const win={};
    const read=makeFn('croppyReadWithRecovery',{localStorage:ls,croppyStoredValue:parse,croppyRecoveredKinds:recovered,window:win,DRAFT_STAGE_KEY:'sd',HISTORY_STAGE_KEY:'sh'});
    const got=read('p','s','draft');check('Behavior: corrupted primary auto-recovers',got&&got.jobName==='復旧'&&store.p===store.s&&recovered[0]==='draft'&&win.__CROPPY_RECOVERED_ON_LOAD===true,JSON.stringify({got,store,recovered,win}));
  }catch(e){check('Behavior: corrupted primary auto-recovers',false,e.message)}
  try{
    const parse=makeFn('croppyStoredValue',{});
    const store={p:'{"jobName":"旧"}',sd:'{"jobName":"途中保存"}',r:'{"jobName":"予備"}'};
    const ls={getItem:k=>Object.prototype.hasOwnProperty.call(store,k)?store[k]:null,setItem:(k,v)=>{store[k]=v},removeItem:k=>{delete store[k]}};
    const recovered=[],win={};
    const read=makeFn('croppyReadWithRecovery',{localStorage:ls,croppyStoredValue:parse,croppyRecoveredKinds:recovered,window:win,DRAFT_STAGE_KEY:'sd',HISTORY_STAGE_KEY:'sh'});
    const got=read('p','r','draft');
    check('Behavior: interrupted staged save recovers latest',got&&got.jobName==='途中保存'&&store.p==='{"jobName":"途中保存"}'&&!Object.prototype.hasOwnProperty.call(store,'sd')&&win.__CROPPY_RECOVERED_ON_LOAD===true,JSON.stringify({got,store,recovered,win}));
  }catch(e){check('Behavior: interrupted staged save recovers latest',false,e.message)}
  check('Backup schema and app version',html.includes("format:'CROPPY_BACKUP'")&&html.includes("formatVersion:1")&&html.includes("appVersion:'v2.64.37'"));
  check('Backup captures draft history and Croppy storage',html.includes("key===DRAFT_KEY||key===HISTORY_KEY")&&html.includes("key.indexOf('SOULZ_CROSS_')===0")&&html.includes("key.indexOf('soulz_cross_')===0"));
  check('Backup excludes stale recovery snapshots',html.includes('function croppyIsRecoveryKey(key)')&&html.includes("croppyIsDataKey(k)&&!croppyIsRecoveryKey(k)"));
  check('Restore reseeds recovery from restored primary',html.includes("localStorage.setItem(DRAFT_RECOVERY_KEY,restoredDraft)")&&html.includes("localStorage.setItem(HISTORY_RECOVERY_KEY,restoredHistory)"));
  check('Backup integrity metadata is generated',html.includes("integrity:{algorithm:'fnv1a32',value:croppyBackupIntegrity(storage)}")&&html.includes('function croppyBackupIntegrity(storage)'));
  check('Restore rejects checksum mismatch but allows legacy backups',html.includes("バックアップファイルが破損しています")&&html.includes("if(obj.integrity!==undefined&&obj.integrity!==null)"));
  check('Restore validates before writing',html.includes("croppyValidateBackup(obj);")&&html.includes("クロッピーのバックアップファイルではありません")&&html.includes("バックアップの内容が壊れています"));
  check('Restore confirmation shows backup summary',html.includes('function croppyBackupRestoreSummary(obj)')&&html.includes("'現場 '+h.length+'件'")&&html.includes("restoreSummary=croppyBackupRestoreSummary(obj)"));
  check('Restore auto-saves previous state',html.includes("localStorage.setItem(CROPPY_PRE_RESTORE_KEY,JSON.stringify(rollback))")&&html.includes("直前の状態に戻す"));
  check('Restore verifies written storage before success',html.includes('function croppyReplaceStorage(storage)')&&html.includes('restore write verification failed')&&html.includes('restore primary verification failed')&&html.includes('restore recovery verification failed'));
  check('Restore failure auto-rolls back previous snapshot',html.includes('croppyReplaceStorage(rollback.storage)')&&html.includes('復元に失敗したため元の状態へ戻しました'));
  check('Restore syncs native draft and history',html.includes("window.__soulzNativeSave('draft'")&&html.includes("window.__soulzNativeSave('history'"));
  try{
    const canonical=makeFn('croppyBackupCanonicalStorage',{});
    const integrity=makeFn('croppyBackupIntegrity',{croppyBackupCanonicalStorage:canonical,Math});
    const validate=makeFn('croppyValidateBackup',{DRAFT_KEY:'soulz_cross_calc_v11_draft',HISTORY_KEY:'soulz_cross_calc_v11_history',croppyBackupIntegrity:integrity,JSON,String,Number,Error});
    const storage={soulz_cross_calc_v11_draft:'{}',soulz_cross_calc_v11_history:'[]'};
    const legacy={format:'CROPPY_BACKUP',formatVersion:1,storage:Object.assign({},storage)};
    const good={format:'CROPPY_BACKUP',formatVersion:1,storage:Object.assign({},storage),integrity:{algorithm:'fnv1a32',value:integrity(storage)}};
    const tampered=JSON.parse(JSON.stringify(good));tampered.storage.soulz_cross_calc_v11_draft='{"changed":true}';
    let badRejected=false,tamperRejected=false;try{validate({format:'OTHER',formatVersion:1,storage:{}})}catch(e){badRejected=true}try{validate(tampered)}catch(e){tamperRejected=true}
    check('Behavior: backup validator accepts valid schema',validate(good)===true&&validate(legacy)===true);
    check('Behavior: backup validator rejects invalid schema',badRejected===true);
    check('Behavior: backup integrity detects tampering',tamperRejected===true);
  }catch(e){check('Behavior: backup validator accepts valid schema',false,e.message);check('Behavior: backup validator rejects invalid schema',false,e.message);check('Behavior: backup integrity detects tampering',false,e.message)}
  try{
    const DK='soulz_cross_calc_v11_draft',HK='soulz_cross_calc_v11_history',DR='SOULZ_CROSS_RECOVERY_DRAFT_V1',HR='SOULZ_CROSS_RECOVERY_HISTORY_V1',DS='SOULZ_CROSS_STAGE_DRAFT_V1',HS='SOULZ_CROSS_STAGE_HISTORY_V1';
    const dataKey=makeFn('croppyIsDataKey',{CROPPY_PRE_RESTORE_KEY:'SAFE',DRAFT_KEY:DK,HISTORY_KEY:HK,String});
    const recoveryKey=makeFn('croppyIsRecoveryKey',{DRAFT_RECOVERY_KEY:DR,HISTORY_RECOVERY_KEY:HR,DRAFT_STAGE_KEY:DS,HISTORY_STAGE_KEY:HS,String});
    const stored=makeFn('croppyStoredValue',{});
    const mem={old:'keep'};mem[DR]='{"stale":"draft"}';mem[HR]='["stale"]';mem[DS]='{"stale":"stage"}';mem[HS]='["stage"]';
    const ls={get length(){return Object.keys(mem).length},key:function(i){return Object.keys(mem)[i]||null},getItem:function(k){return Object.prototype.hasOwnProperty.call(mem,k)?mem[k]:null},setItem:function(k,v){mem[k]=String(v)},removeItem:function(k){delete mem[k]}};
    const replace=makeFn('croppyReplaceStorage',{localStorage:ls,croppyIsDataKey:dataKey,croppyIsRecoveryKey:recoveryKey,DRAFT_KEY:DK,HISTORY_KEY:HK,croppyStoredValue:stored,DRAFT_RECOVERY_KEY:DR,HISTORY_RECOVERY_KEY:HR,Array,Object,Error});
    const incoming={};incoming[DK]='{"jobName":"legacy primary"}';incoming[HK]='[{"id":"h1"}]';incoming[DR]='{"stale":"backup draft"}';incoming[HR]='["stale backup history"]';incoming[DS]='{"stale":"backup stage"}';incoming[HS]='["stale backup stage"]';
    replace(incoming);
    check('Behavior: legacy backup recovery keys are ignored and reseeded',mem[DK]===incoming[DK]&&mem[HK]===incoming[HK]&&mem[DR]===incoming[DK]&&mem[HR]===incoming[HK]&&!Object.prototype.hasOwnProperty.call(mem,DS)&&!Object.prototype.hasOwnProperty.call(mem,HS),JSON.stringify(mem));
  }catch(e){check('Behavior: legacy backup recovery keys are ignored and reseeded',false,e.message)}
  try{
    const DK='soulz_cross_calc_v11_draft',HK='soulz_cross_calc_v11_history',DR='SOULZ_CROSS_RECOVERY_DRAFT_V1',HR='SOULZ_CROSS_RECOVERY_HISTORY_V1',DS='SOULZ_CROSS_STAGE_DRAFT_V1',HS='SOULZ_CROSS_STAGE_HISTORY_V1';
    const canonical=makeFn('croppyBackupCanonicalStorage',{});
    const integrity=makeFn('croppyBackupIntegrity',{croppyBackupCanonicalStorage:canonical,Math});
    const validate=makeFn('croppyValidateBackup',{DRAFT_KEY:DK,HISTORY_KEY:HK,croppyBackupIntegrity:integrity,JSON,String,Number,Error});
    const dataKey=makeFn('croppyIsDataKey',{CROPPY_PRE_RESTORE_KEY:'SAFE',DRAFT_KEY:DK,HISTORY_KEY:HK,String});
    const recoveryKey=makeFn('croppyIsRecoveryKey',{DRAFT_RECOVERY_KEY:DR,HISTORY_RECOVERY_KEY:HR,DRAFT_STAGE_KEY:DS,HISTORY_STAGE_KEY:HS,String});
    const stored=makeFn('croppyStoredValue',{});
    const history=Array.from({length:1000},function(_,i){return {id:'h'+i,name:'現場'+i,memo:'x'.repeat(80),items:[{cm:250,count:4,repeatCm:52.5}]};});
    const storage={};storage[DK]=JSON.stringify({jobName:'大容量テスト',memo:'y'.repeat(5000)});storage[HK]=JSON.stringify(history);
    const backup={format:'CROPPY_BACKUP',formatVersion:1,storage:storage,integrity:{algorithm:'fnv1a32',value:integrity(storage)}};
    const mem={};
    const ls={get length(){return Object.keys(mem).length},key:function(i){return Object.keys(mem)[i]||null},getItem:function(k){return Object.prototype.hasOwnProperty.call(mem,k)?mem[k]:null},setItem:function(k,v){mem[k]=String(v)},removeItem:function(k){delete mem[k]}};
    const replace=makeFn('croppyReplaceStorage',{localStorage:ls,croppyIsDataKey:dataKey,croppyIsRecoveryKey:recoveryKey,DRAFT_KEY:DK,HISTORY_KEY:HK,croppyStoredValue:stored,DRAFT_RECOVERY_KEY:DR,HISTORY_RECOVERY_KEY:HR,Array,Object,Error});
    const valid=validate(backup);replace(storage);
    const restored=JSON.parse(mem[HK]);
    check('Behavior: 1000-history backup validates and restores',valid===true&&restored.length===1000&&restored[999].id==='h999'&&mem[HR]===mem[HK]&&storage[HK].length>100000,'historyBytes='+storage[HK].length);
  }catch(e){check('Behavior: 1000-history backup validates and restores',false,e.message)}
  try{
    const calls=[],syncs=[],rollback={storage:{old:'1'}};
    const apply=makeFn('croppyApplyBackup',{
      croppyValidateBackup:()=>true,
      croppyBuildBackup:()=>rollback,
      localStorage:{setItem:()=>{}},
      CROPPY_PRE_RESTORE_KEY:'SAFE',
      JSON,
      croppyReplaceStorage:(storage)=>{calls.push(storage);if(calls.length===1)throw new Error('simulated restore failure');return true},
      croppySyncNativeStorage:(storage)=>syncs.push(storage),
      Error
    });
    let caught=null;try{apply({storage:{next:'2'}},true)}catch(e){caught=e}
    check('Behavior: failed restore automatically rolls back',!!caught&&caught.croppyRolledBack===true&&calls.length===2&&calls[1]===rollback.storage&&syncs.length===1&&syncs[0]===rollback.storage&&String(caught.message).includes('元の状態'),JSON.stringify({calls,syncs,msg:caught&&caught.message}));
  }catch(e){check('Behavior: failed restore automatically rolls back',false,e.message)}
  try{
    const fns=extractFunctions(iphone,'croppyInjectIPhoneNativeBridges');
    const src=fns[fns.length-1].replace(/^function\s+croppyInjectIPhoneNativeBridges/,'function');
    const inject=Function('return ('+src+');')();
    const sample='x window.__soulzNativeSave = function(){}; y';
    const out=inject(sample);
    check('Behavior: iPhone native data bridge is injected',out.includes('soulz-save://')&&out.includes('soulz-backup://export'));
  }catch(e){check('Behavior: iPhone native data bridge is injected',false,e.message)}
  check('iPhone backup saves to iCloud Scriptable folder',iphone.includes('FileManager.iCloud()')&&iphone.includes('"CROPPY_Backups"')&&iphone.includes('croppyBackupFM.writeString(path'));
  check('iPhone backup bridge avoids URL payload size',iphone.includes('window.__croppyBackupPayload||')&&iphone.includes('soulz-backup://export?x=')&&!iphone.includes('soulz-backup://export?data='));
  check('iPhone native files keep previous valid copy',iphone.includes('path + ".prev"')&&iphone.includes('fm.writeString(path + ".prev", rollback)')&&iphone.includes('croppyNativeRecovered'));
  check('iPhone previous copy validates data shape',iphone.includes('var currentParsed = JSON.parse(current)')&&iphone.includes('croppyNativeShapeOK(path, currentParsed)'));
  check('iPhone native save uses staged verification',iphone.includes('var tmpPath = path + ".tmp"')&&iphone.includes('staged native save verification failed')&&iphone.includes('final native save verification failed'));
  check('iPhone startup prefers verified staged save',iphone.includes('var candidates = [path + ".tmp", path, path + ".prev"]')&&iphone.includes('candidate !== path')&&iphone.includes('native recovery promotion failed'));
  check('iPhone backup file uses staged verification',iphone.includes('function croppyWriteVerifiedBackupFile(path, text)')&&iphone.includes('staged backup verification failed')&&iphone.includes('final backup verification failed'));
  check('iPhone failed final write can preserve verified stage',iphone.includes('var stagedVerified = false')&&iphone.includes('!stagedVerified || rollbackRestored'));
  check('iPhone update cache uses staged verification',iphone.includes('var appCacheTempPath = appCachePath + ".tmp"')&&iphone.includes('function croppyWriteVerifiedCache(raw)')&&iphone.includes('staged cache verification failed')&&iphone.includes('var stagedVerified = false'));
  try{
    const vf=extractFunctions(iphone,'croppyHTMLVersion');const versionSrc=vf[vf.length-1].replace(/^function\s+croppyHTMLVersion/,'function');
    const versionFn=Function('return ('+versionSrc+');')();
    const cf=extractFunctions(iphone,'croppyCompareVersion');const compareSrc=cf[cf.length-1].replace(/^function\s+croppyCompareVersion/,'function');
    const compareFn=Function('return ('+compareSrc+');')();
    const valf=extractFunctions(iphone,'croppyValidHTML');const validSrc=valf[valf.length-1].replace(/^function\s+croppyValidHTML/,'function');
    const validFn=Function('croppyHTMLVersion','return ('+validSrc+');')(versionFn);
    const wf=extractFunctions(iphone,'croppyWriteVerifiedCache');const writeSrc=wf[wf.length-1].replace(/^function\s+croppyWriteVerifiedCache/,'function');
    const sample='<!doctype html><html><head><title>CROSS GPT クロッピー | v2.64.37</title></head><body><button id="startMeasureBtn"></button><div id="workAreaTabs"></div><button id="lengthField"></button><button id="countField"></button><div id="keypadWrap"></div><button id="keypadRepeatBtn"></button><button id="historyAllBtn"></button></body></html>';
    const files={};let failFinal=true;
    const fmMock={writeString:function(p,v){if(p==='CACHE'&&failFinal)throw new Error('simulated cache final write failure');files[p]=v},readString:function(p){return files[p]},fileExists:function(p){return Object.prototype.hasOwnProperty.call(files,p)},remove:function(p){delete files[p]}};
    const write=Function('fm','appCacheTempPath','appCachePath','croppyValidHTML','croppyCompareVersion','croppyHTMLVersion','console','return ('+writeSrc+');')(fmMock,'TEMP','CACHE',validFn,compareFn,versionFn,{log:function(){}});
    const first=write(sample),kept=first===false&&files.TEMP===sample&&!Object.prototype.hasOwnProperty.call(files,'CACHE');
    failFinal=false;
    const second=write(files.TEMP);
    check('Behavior: verified update stage survives final cache write failure',kept&&second===true&&files.CACHE===sample&&!Object.prototype.hasOwnProperty.call(files,'TEMP'),JSON.stringify({first:first,second:second,keys:Object.keys(files)}));
  }catch(e){check('Behavior: verified update stage survives final cache write failure',false,e.message)}
  try{
    const fns=extractFunctions(iphone,'croppyNativeShapeOK');
    const src=fns[fns.length-1].replace(/^function\s+croppyNativeShapeOK/,'function');
    const shape=Function('draftPath','historyPath','return ('+src+');')('DRAFT','HISTORY');
    check('Behavior: iPhone native shape guard rejects wrong type',shape('DRAFT',{a:1})&&!shape('DRAFT',[])&&shape('HISTORY',[])&&!shape('HISTORY',{}));
  }catch(e){check('Behavior: iPhone native shape guard rejects wrong type',false,e.message)}
  try{
    const shapeFns=extractFunctions(iphone,'croppyNativeShapeOK');
    const shapeSrc=shapeFns[shapeFns.length-1].replace(/^function\s+croppyNativeShapeOK/,'function');
    const shape=Function('draftPath','historyPath','return ('+shapeSrc+');')('DRAFT','HISTORY');
    const saveFns=extractFunctions(iphone,'saveJSON');
    const saveSrc=saveFns[saveFns.length-1].replace(/^function\s+saveJSON/,'function');
    const files={'DRAFT':'[]','DRAFT.prev':'{"safe":true}'},writes=[];
    const fm={fileExists:p=>Object.prototype.hasOwnProperty.call(files,p),readString:p=>files[p],writeString:(p,v)=>{writes.push(p);files[p]=v},remove:p=>{delete files[p]}};
    const save=Function('fm','croppyNativeShapeOK','return ('+saveSrc+');')(fm,shape);
    save('DRAFT','{"new":1}');
    const invalidSkipped=files['DRAFT.prev']==='{"safe":true}'&&files['DRAFT']==='{"new":1}'&&!files['DRAFT.tmp'];
    files['DRAFT']='{"old":1}';writes.length=0;save('DRAFT','{"new":2}');
    const validCopied=files['DRAFT.prev']==='{"old":1}'&&files['DRAFT']==='{"new":2}'&&!files['DRAFT.tmp'];
    const stagedFirst=writes[0]==='DRAFT.tmp'&&writes.indexOf('DRAFT')>0;
    check('Behavior: invalid native current is not promoted to previous',invalidSkipped&&validCopied,JSON.stringify(files));
    check('Behavior: native save stages before final write',stagedFirst&&validCopied,writes.join(','));
  }catch(e){check('Behavior: invalid native current is not promoted to previous',false,e.message)}
  try{
    const shapeFns=extractFunctions(iphone,'croppyNativeShapeOK');
    const shapeSrc=shapeFns[shapeFns.length-1].replace(/^function\s+croppyNativeShapeOK/,'function');
    const shape=Function('draftPath','historyPath','return ('+shapeSrc+');')('DRAFT','HISTORY');
    const saveFns=extractFunctions(iphone,'saveJSON');
    const saveSrc=saveFns[saveFns.length-1].replace(/^function\s+saveJSON/,'function');
    const readFns=extractFunctions(iphone,'readObject');
    const readSrc=readFns[readFns.length-1].replace(/^function\s+readObject/,'function');
    const files={},recovered=[];let failFinal=true;
    const fm={
      fileExists:p=>Object.prototype.hasOwnProperty.call(files,p),
      readString:p=>files[p],
      writeString:(p,v)=>{if(p==='DRAFT'&&failFinal)throw new Error('simulated final write failure');files[p]=v},
      remove:p=>{delete files[p]}
    };
    const save=Function('fm','croppyNativeShapeOK','console','return ('+saveSrc+');')(fm,shape,{log:()=>{}});
    save('DRAFT','{"latest":true}');
    const stagedKept=files['DRAFT.tmp']==='{"latest":true}'&&!files['DRAFT'];
    failFinal=false;
    const read=Function('fm','croppyNativeShapeOK','croppyNativeRecovered','draftPath','historyPath','return ('+readSrc+');')(fm,shape,recovered,'DRAFT','HISTORY');
    const got=read('DRAFT',null);
    check('Behavior: verified staged save recovers after failed final write',stagedKept&&got&&got.latest===true&&files['DRAFT']==='{"latest":true}'&&!files['DRAFT.tmp']&&recovered[0]==='draft',JSON.stringify({files,recovered,got}));
  }catch(e){check('Behavior: verified staged save recovers after failed final write',false,e.message)}
  try{
    const shapeFns=extractFunctions(iphone,'croppyNativeShapeOK');
    const shapeSrc=shapeFns[shapeFns.length-1].replace(/^function\s+croppyNativeShapeOK/,'function');
    const shape=Function('draftPath','historyPath','return ('+shapeSrc+');')('DRAFT','HISTORY');
    const readFns=extractFunctions(iphone,'readObject');
    const readSrc=readFns[readFns.length-1].replace(/^function\s+readObject/,'function');
    const files={'DRAFT':'{"old":true}','DRAFT.tmp':'{"newest":true}','DRAFT.prev':'{"older":true}'},recovered=[];
    const fm={fileExists:p=>Object.prototype.hasOwnProperty.call(files,p),readString:p=>files[p],writeString:(p,v)=>{files[p]=v},remove:p=>{delete files[p]}};
    const read=Function('fm','croppyNativeShapeOK','croppyNativeRecovered','draftPath','historyPath','return ('+readSrc+');')(fm,shape,recovered,'DRAFT','HISTORY');
    const got=read('DRAFT',null);
    check('Behavior: verified staged save wins over older valid primary',got&&got.newest===true&&files['DRAFT']==='{"newest":true}'&&!files['DRAFT.tmp']&&recovered[0]==='draft',JSON.stringify({files,recovered,got}));
  }catch(e){check('Behavior: verified staged save wins over older valid primary',false,e.message)}
  try{
    const fns=extractFunctions(iphone,'croppyWriteVerifiedBackupFile');
    const src=fns[fns.length-1].replace(/^function\s+croppyWriteVerifiedBackupFile/,'function');
    const files={},writes=[];
    const fm={fileExists:p=>Object.prototype.hasOwnProperty.call(files,p),readString:p=>files[p],writeString:(p,v)=>{writes.push(p);files[p]=v},remove:p=>{delete files[p]}};
    const write=Function('croppyBackupFM','JSON','Error','return ('+src+');')(fm,JSON,Error);
    const text=JSON.stringify({format:'CROPPY_BACKUP',storage:{}},null,2);
    const ok=write('backup.json',text);
    check('Behavior: iPhone backup stages and verifies before success',ok===true&&files['backup.json']===text&&!files['backup.json.tmp']&&writes[0]==='backup.json.tmp'&&writes[1]==='backup.json',writes.join(','));
  }catch(e){check('Behavior: iPhone backup stages and verifies before success',false,e.message)}
  check('iPhone native boot state is injected',iphone.includes('function croppyInjectIPhoneBootState')&&iphone.includes('html = croppyInjectIPhoneBootState(html)')&&iphone.includes('window.__SOULZ_BOOT_HISTORY = []'));
  try{
    const fns=extractFunctions(iphone,'croppyInjectIPhoneBootState');const src=fns[fns.length-1].replace(/^function\s+croppyInjectIPhoneBootState/,'function');
    const inject=Function('safeJSON','bootDraft','bootHistory','homeMode','croppyNativeRecovered','return ('+src+');')(JSON.stringify,{jobName:'復旧テスト'},[{id:'h1'}],true,['draft']);
    const sample='window.__SOULZ_BOOT_DRAFT = null;\nwindow.__SOULZ_BOOT_HISTORY = null;\nwindow.__SOULZ_HOME_MODE = false;\nwindow.__SOULZ_NATIVE_RECOVERED = false;';
    const out=inject(sample);check('Behavior: iPhone boot injection carries native data',out.includes('復旧テスト')&&out.includes('"id":"h1"')&&out.includes('__SOULZ_HOME_MODE = true')&&out.includes('__SOULZ_NATIVE_RECOVERED = true'),out);
  }catch(e){check('Behavior: iPhone boot injection carries native data',false,e.message)}
  check('iPhone copy installer follows latest',iphoneCopy.includes('v2.64.37')&&iphoneCopy.includes('./CROPPY_iPhone_v2.64.37.js')&&!iphoneCopy.includes('v2.58.27'));
  check('SW cache version',sw.includes('cross-gpt-croppy-'+VERSION.split('.').join('-')));
  const allNames={};for(const m of html.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g))allNames[m[1]]=(allNames[m[1]]||0)+1;
  const remaining=Object.entries(allNames).filter(([,n])=>n>1).sort((a,b)=>b[1]-a[1]);
  const allowedScoped=new Set(['q','qa','fallbackCopy']);
  const unexpectedRemaining=remaining.filter(x=>!allowedScoped.has(x[0]));
  check('Only scoped helper duplicates remain',unexpectedRemaining.length===0,'remaining='+remaining.length+' '+remaining.map(x=>x[0]+':'+x[1]).join(','));
  const lines=['CROSS GPT クロッピー '+VERSION+' CACHE FAILSAFE - QA REPORT','','変更:','- UIと操作は変更せずWeb/Android保存を段階書き込み化','- 一時保存を読戻し検証してから本番データへ昇格','- 保存途中で終了した場合は次回起動時に検証済み一時保存から復旧','- 一時保存キーはバックアップ対象から除外','- v2.64.35の復元ロールバック・容量不足警告・iPhone保護を維持','- iPhone自動更新は必須UI・HTML終端・remote/cache/bundled異常系を挙動QA','- 検証済み更新tmpを最終cache書込み失敗時にも保持','- 旧Recovery/Stage入りバックアップと履歴1000件を復元QA','- Service Workerのオフラインindex/asset fallbackを挙動QA','','自動検証:'];
  for(const c of checks)lines.push('- '+c.name+': '+(c.ok?'PASS':'FAIL')+(c.detail?' ('+c.detail+')':''));
  lines.push('','実機確認（5分）:','1. 起動 → 採寸画面まで進む','2. 長さ → 枚数 → 追加を3回繰り返す','3. リピートOFF記憶 → ON復帰 → +1柄の1回使い切りを確認','4. カット済みチェック → 保存 → 再起動で保持を確認','5. バックアップ書き出し → 最終日時/保存先の更新を確認','6. 共有シートとホーム画面起動を確認','7. オフライン再起動でキャッシュ起動を確認','','legacy_ 関数: '+([...html.matchAll(/function\s+legacy_[A-Za-z0-9_$]+\s*\(/g)].length)+'個','残る重複関数: '+remaining.length+'種類','残る重複はIIFE内のローカル補助関数 q / qa と、別スコープの fallbackCopy のみ。','','注意:','- iPhone/Android実機のタップ感、OS共有シート、ホーム画面追加は実機で最終確認が必要。','- 外部品番検索はネットワーク先の応答に依存。','');
  fs.writeFileSync('QA_REPORT.txt',lines.join('\n'));console.log(lines.join('\n'));
  if(checks.some(c=>!c.ok))process.exit(1);
})();
