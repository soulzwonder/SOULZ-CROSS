(function qaMain(){
  const fs=require('fs');
  const VERSION='v2.63.24';
  const html=fs.readFileSync('index.html','utf8');
  const sw=fs.readFileSync('sw.js','utf8');
  const manifest=fs.readFileSync('manifest.webmanifest','utf8');
  const server=fs.readFileSync('server.js','utf8');
  const iphone=fs.readFileSync('CROPPY_iPhone_v2.63.24.js','utf8');
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
  check('Version title',html.includes('<title>CROSS GPT クロッピー | v2.63.24</title>'));
  check('Visible version',html.includes('クロッピー / v2.63.24'));
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
  check('Clean theme stylesheet present',html.includes('id="croppy-v26306-clean-theme"'));
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
    check('iPhone embedded HTML version',embedded.includes('<title>CROSS GPT クロッピー | v2.63.24</title>')&&embedded.includes('クロッピー / v2.63.24'));
    check('iPhone embedded home flow',['⚡ すぐ計算','📐 現場を開く','📋 予定・準備'].every(s=>embedded.includes(s)));
    check('iPhone embedded quick separation',embedded.includes('quickCalcByArea')&&embedded.includes('function realProjectItems()'));
    check('iPhone native bridge',embedded.includes('soulz-save://')&&embedded.includes('soulz-repeat://search')&&embedded.includes('soulz-share://summary'));
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
  check('Keypad hide button is prominent',html.includes('min-height:40px!important')&&html.includes("b.textContent=keypadHidden?'▲ テンキーを表示':'▼ テンキーを隠す'"));
  check('Inline edit carries +1 pattern',html.includes('setExtraPattern(!!it.extraPattern&&repeatNumber(it.repeatCm)>0)')&&html.includes('it.extraPattern=!!nextExtra'));
  check('Inline +1 preview is immediate',html.includes('{cm:measureCm,extraPattern:extraPatternEnabled()}')&&html.includes('(selected?extraPatternEnabled():x.extraPattern)'));
  try{
    const it={cm:100,count:1,cutCount:0,repeatCm:52.5,extraPattern:false};
    const state={length:'100',count:'1',recent:[]};
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
  check('Per-row cut status is concise',activeFunction('renderList').includes('cut-state-label')&&activeFunction('renderList').includes("complete?'済':''")&&activeFunction('renderList').includes("complete?'✓ カット済み':'カット '+cutCount+'/'+x.count"));
  check('Cut progress live label stays explicit',activeFunction('renderList').includes("doneNow?'✓ カット済み':'カット '+it.cutCount+'/'+it.count"));
  check('Cut row status follows theme',html.includes('id="croppy-v26319-cut-row-status"')&&html.includes('.cut-box:checked + .cut-state-label'));
  check('Cut session emphasis style present',html.includes('id="croppy-v26320-cut-session"')&&html.includes('#checkedMeterSince')&&html.includes('.meter-run-state.active'));
  check('Cut baseline stored in site state',activeFunction('setMeterBaseline').includes('state.cutMeterBaseline=checkedMeterTotal()')&&html.includes('cutMeterBaseline:state.cutMeterBaseline')&&html.includes('state.cutMeterBaseline=(h.cutMeterBaseline===null'));
  check('New site resets cut baseline',html.includes("cutMeterBaseline:null,editingHistoryId:null"));
  check('Legacy global meter baseline removed',activeFunction('loadMeterBaseline').includes("localStorage.removeItem('CROSS_GPT_METER_BASELINE')"));
  check('Quick calc jumps straight to measurement',activeFunction('selectProjectTab').includes('var quickJump=isQuickCalcId(id)')&&activeFunction('selectProjectTab').includes("if(quickJump){state.active='length';setKeypadHidden(false)}")&&activeFunction('selectProjectTab').includes('if(quickJump)bringMeasurementToTop()'));
  check('Quick calc keeps keypad open',activeFunction('ensureQuickCalcRoom').includes('setKeypadHidden(false);bringMeasurementToTop()'));
  check('Quick calc hides setup chrome',html.includes('id="croppy-v26322-quick-focus"')&&html.includes('body.quick-calc-mode #workAreaWrap')&&html.includes('body.quick-calc-mode #roomTabsWrap')&&html.includes('display:none!important'));
  check('Repeat labels use full Japanese wording',html.includes("rb.textContent=activeRepeat?'次の採寸：リピート '+fmtCm(state.repeatCm)+'cm':''")&&html.includes("text='リピート '+fmtCm(rep)+'cm → 次の採寸'")&&html.includes("+' / リピート '+cutDisplayValue(x.repeatCm)")&&html.includes("toast('リピート '+fmtCm(state.repeatCm)+'cm を設定')"));
  check('OCR example uses repeat wording',html.includes('リピート64.2')&&html.includes('(?:リピート|柄\\s*リピート|柄|repeat|rep\\.?|R)'));
  check('Repeat wording layout support',html.includes('id="croppy-v26323-repeat-wording"')&&html.includes('.product-repeat-status{max-width:185px!important}'));
  check('Repeat applies only to next measurement',activeFunction('applyRepeatToActiveSection').includes("state.repeatCm=rep>0?fmtCm(rep):''")&&!activeFunction('applyRepeatToActiveSection').includes('roomItems(r.id).forEach')&&activeFunction('addItem').includes("state.repeatOn=false;state.repeatCm=''"));
  check('Inline edit owns its repeat',activeFunction('beginInlineItemEdit').includes("state.repeatOn=repeatNumber(it.repeatCm)>0")&&activeFunction('commitInlineItemEdit').includes('it.repeatCm=nextRepeat'));
  check('Cut slider removed from active list',!activeFunction('renderList').includes('data-cutrange')&&!activeFunction('renderList').includes('data-progress-toggle')&&activeFunction('renderList').includes("complete?'✓ カット済み':'未カット'"));
  check('Cut checkbox is all or nothing',activeFunction('setCutDone').includes('it.cutCount=done?it.count:0'));
  check('Per-item repeat style present',html.includes('id="croppy-v26324-per-item-repeat"'));



  check('SW cache version',sw.includes('cross-gpt-croppy-v2-63-24'));
  const allNames={};for(const m of html.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g))allNames[m[1]]=(allNames[m[1]]||0)+1;
  const remaining=Object.entries(allNames).filter(([,n])=>n>1).sort((a,b)=>b[1]-a[1]);
  const allowedScoped=new Set(['q','qa','fallbackCopy']);
  const unexpectedRemaining=remaining.filter(x=>!allowedScoped.has(x[0]));
  check('Only scoped helper duplicates remain',unexpectedRemaining.length===0,'remaining='+remaining.length+' '+remaining.map(x=>x[0]+':'+x[1]).join(','));
  const lines=['CROSS GPT クロッピー '+VERSION+' PER ITEM REPEAT - QA REPORT','','変更:','- 入力・描画・OCR系の旧上書き関数も legacy_ へ退避','- 現場操作の正規関数を単一定義化し、クイック計算分離を維持','- テンキー枚数入力、クイック追加、計算、iPhone埋め込みHTMLの動作QAを実施','','自動検証:'];
  for(const c of checks)lines.push('- '+c.name+': '+(c.ok?'PASS':'FAIL')+(c.detail?' ('+c.detail+')':''));
  lines.push('','残る重複関数: '+remaining.length+'種類','残る重複はIIFE内のローカル補助関数 q / qa と、別スコープの fallbackCopy のみ。','','注意:','- iPhone/Android実機のタップ感、OS共有シート、ホーム画面追加は実機で最終確認が必要。','- 外部品番検索はネットワーク先の応答に依存。','');
  fs.writeFileSync('QA_REPORT.txt',lines.join('\n'));console.log(lines.join('\n'));
  if(checks.some(c=>!c.ok))process.exit(1);
})();
