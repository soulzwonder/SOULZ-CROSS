(function qaMain(){
  const fs=require('fs');
  const VERSION='v2.63.05';
  const html=fs.readFileSync('index.html','utf8');
  const sw=fs.readFileSync('sw.js','utf8');
  const manifest=fs.readFileSync('manifest.webmanifest','utf8');
  const server=fs.readFileSync('server.js','utf8');
  const iphone=fs.readFileSync('CROPPY_iPhone_v2.63.05.js','utf8');
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
  check('Version title',html.includes('<title>CROSS GPT クロッピー | v2.63.05</title>'));
  check('Visible version',html.includes('クロッピー / v2.63.05'));
  const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]),syntaxErr=[];
  scripts.forEach((s,i)=>{try{new Function(s)}catch(e){syntaxErr.push('script'+(i+1)+':'+e.message)}});
  check('HTML embedded JS syntax',syntaxErr.length===0,syntaxErr.join(' | '));
  try{new Function(sw);check('Service worker syntax',true)}catch(e){check('Service worker syntax',false,e.message)}
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
  const legacyExpected=['normalizeHistory','load','totals','saveToHistory','loadHistory','filteredHistory','normalizeRoomObject','currentRoom','roomItems','currentItems','renderEntry','render','inlineEditItem','beginInlineItemEdit','clearItems','checkedMeterTotal','changeCount','removeItem','setCutCount','setCutDone','renderCutSummary'];
  check('Pass3 legacy functions retained',legacyExpected.every(n=>html.includes('function legacy_'+n+'_v26303(')));
  const pass4Critical=['addItem','inputDigit','backspace','resetField','undo','summaryText','renderList','setActive','inputDecimal','redo','parseOCRText','updateOCRCommit','parseOCRNow','resetOCR','commitOCR','openRoomEditor','renderRoomContext','renderRoomOverview'];
  check('Pass4 active functions single-definition',pass4Critical.every(n=>extractFunctions(html,n).length===1),pass4Critical.filter(n=>extractFunctions(html,n).length!==1).join(','));
  check('Pass4 legacy functions retained',pass4Critical.every(n=>html.includes('function legacy_'+n+'_v26304_')));
  check('UI typo fixed',!html.includes('このこの場所にはまだ部屋がありません。')&&html.includes('この場所にはまだ部屋がありません。'));
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
      state,inlineEditId:()=>null,commitInlineItemEdit:()=>{},normalizeProjectState:()=>{},currentRoom:()=>quick,inputLengthToCm:v=>Number(v),setActive:()=>{},toast:()=>{},snap:()=>{},validCategory:c=>c==='wall',activeSectionRepeat:()=>0,repeatNumber:v=>Number(v)||0,roundCm:v=>Math.round(v*100)/100,itemStoreForRoom:r=>r.items,extraPatternEnabled:()=>false,setExtraPattern:()=>{},saveDraft:()=>{},render:()=>{},categoryLabel:c=>c
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
    check('iPhone embedded HTML version',embedded.includes('<title>CROSS GPT クロッピー | v2.63.05</title>')&&embedded.includes('クロッピー / v2.63.05'));
    check('iPhone embedded home flow',['⚡ すぐ計算','📐 現場を開く','📋 予定・準備'].every(s=>embedded.includes(s)));
    check('iPhone embedded quick separation',embedded.includes('quickCalcByArea')&&embedded.includes('function realProjectItems()'));
    check('iPhone native bridge',embedded.includes('soulz-save://')&&embedded.includes('soulz-repeat://search')&&embedded.includes('soulz-share://summary'));
  }catch(e){check('iPhone embedded HTML decode',false,e.message)}
  check('SW cache version',sw.includes('cross-gpt-croppy-v2-63-05'));
  const allNames={};for(const m of html.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g))allNames[m[1]]=(allNames[m[1]]||0)+1;
  const remaining=Object.entries(allNames).filter(([,n])=>n>1).sort((a,b)=>b[1]-a[1]);
  const allowedScoped=new Set(['q','qa','fallbackCopy']);
  const unexpectedRemaining=remaining.filter(x=>!allowedScoped.has(x[0]));
  check('Only scoped helper duplicates remain',unexpectedRemaining.length===0,'remaining='+remaining.length+' '+remaining.map(x=>x[0]+':'+x[1]).join(','));
  const lines=['CROSS GPT クロッピー '+VERSION+' STAGE4 PASS4 - QA REPORT','','変更:','- 入力・描画・OCR系の旧上書き関数も legacy_ へ退避','- 現場操作の正規関数を単一定義化し、クイック計算分離を維持','- テンキー枚数入力、クイック追加、計算、iPhone埋め込みHTMLの動作QAを実施','','自動検証:'];
  for(const c of checks)lines.push('- '+c.name+': '+(c.ok?'PASS':'FAIL')+(c.detail?' ('+c.detail+')':''));
  lines.push('','残る重複関数: '+remaining.length+'種類','残る重複はIIFE内のローカル補助関数 q / qa と、別スコープの fallbackCopy のみ。','','注意:','- iPhone/Android実機のタップ感、OS共有シート、ホーム画面追加は実機で最終確認が必要。','- 外部品番検索はネットワーク先の応答に依存。','');
  fs.writeFileSync('QA_REPORT.txt',lines.join('\n'));console.log(lines.join('\n'));
  if(checks.some(c=>!c.ok))process.exit(1);
})();
