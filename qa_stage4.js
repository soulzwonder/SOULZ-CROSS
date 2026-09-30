const fs=require('fs');
const VERSION='v2.63.03';
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const manifest=fs.readFileSync('manifest.webmanifest','utf8');
const server=fs.readFileSync('server.js','utf8');
const iphonePath='CROPPY_iPhone_v2.63.03.js';
const iphone=fs.readFileSync(iphonePath,'utf8');
const checks=[];
const check=(name,ok,detail='')=>checks.push({name,ok:!!ok,detail});
check('Version title',html.includes('<title>CROSS GPT クロッピー | v2.63.03</title>'));
check('Visible version',html.includes('クロッピー / v2.63.03'));
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
const syntaxErr=[];scripts.forEach((s,i)=>{try{new Function(s)}catch(e){syntaxErr.push('script'+(i+1)+':'+e.message)}});
check('HTML embedded JS syntax',syntaxErr.length===0,syntaxErr.join(' | '));
try{new Function(sw);check('Service worker syntax',true)}catch(e){check('Service worker syntax',false,e.message)}
try{JSON.parse(manifest);check('Manifest JSON',true)}catch(e){check('Manifest JSON',false,e.message)}
try{new Function(server);check('Server JS syntax',true)}catch(e){check('Server JS syntax',false,e.message)}
try{new Function('return (async function(){\n'+iphone+'\n})');check('iPhone Scriptable syntax',true)}catch(e){check('iPhone Scriptable syntax',false,e.message)}
const ids=[...html.matchAll(/<[^>]+\bid=["']([^"']+)["']/gi)].map(m=>m[1]);
const dup=Object.entries(ids.reduce((o,x)=>(o[x]=(o[x]||0)+1,o),{})).filter(([,n])=>n>1);
check('Duplicate HTML IDs',dup.length===0,dup.map(x=>x.join(':')).join(','));
const req=['startMeasureBtn','startSiteBtn','startPlanBtn','startRecentList','workAreaTabs','roomTabsWrap','projectTabs','categoryTabs','lengthField','countField','sharePreviewSend','historyAllBtn'];
check('Required UI IDs',req.every(id=>ids.includes(id)),req.filter(id=>!ids.includes(id)).join(','));
const visible=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]+>/g,' ');
check('Internal hierarchy words hidden',!/(グループ|階層|採寸先)/.test(visible));
check('Home 3 actions',['⚡ すぐ計算','📐 現場を開く','📋 予定・準備'].every(s=>html.includes(s)));
check('Quick store separated',html.includes('quickCalcByArea')&&html.includes('function realProjectItems()')&&html.includes('historyRooms=state.rooms.filter(function(r){return !isQuickCalcRoom(r)})'));
check('Legacy quick migration',html.includes('var legacy=(state.rooms||[]).filter(function(r){return !!(r&&r.quickCalc)})'));
check('Pass2 legacy helpers',html.includes('function legacy_mergeActiveSectionDuplicates_v26302(){')&&html.includes('function legacy_applyRepeatToActiveSection_v26302(value,on,doRender){'));
check('One active repeat merge helper',(html.match(/function mergeActiveSectionDuplicates\(\)\{/g)||[]).length===1);
check('One active repeat apply helper',(html.match(/function applyRepeatToActiveSection\(value,on,doRender\)\{/g)||[]).length===1);
check('SW cache version',sw.includes('cross-gpt-croppy-v2-63-03'));
check('iPhone native bridge',iphone.includes('soulz-save://')&&iphone.includes('soulz-repeat://search')&&iphone.includes('soulz-share://summary'));
const lines=['CROSS GPT クロッピー '+VERSION+' STAGE4 PASS2 - QA REPORT','','自動検証:'];
for(const c of checks)lines.push('- '+c.name+': '+(c.ok?'PASS':'FAIL')+(c.detail?' ('+c.detail+')':''));
lines.push('','注意:','- iPhone/Android実機のタップ感、OS共有シート、ホーム画面追加は実機で最終確認が必要。','- 外部品番検索はネットワーク先の応答に依存。','');
fs.writeFileSync('QA_REPORT.txt',lines.join('\n'));
console.log(lines.join('\n'));
if(checks.some(c=>!c.ok))process.exit(1);
