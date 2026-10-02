const fs=require('fs');
const html=fs.readFileSync('ocr-camera-prototype.html','utf8');
const iphone=fs.readFileSync('CROPPY_iPhone_OCR_CAMERA_TEST.js','utf8');
const checks=[];
const check=(name,ok,detail='')=>checks.push({name,ok:!!ok,detail});

function extract(src,name){
  const sig='function '+name+'(';let p=src.lastIndexOf(sig);
  if(p<0)throw new Error('missing '+name);
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
  return src.slice(p,i);
}

try{
  check('Prototype HTML syntax',[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].every(m=>{try{new Function(m[1]);return true}catch(e){return false}}));
  check('Prototype iPhone syntax',(()=>{try{new Function('return (async function(){\n'+iphone+'\n})');return true}catch(e){return false}})());
  check('Camera capture input',html.includes('id="ocrCameraInput"')&&html.includes('capture="environment"'));
  check('Camera-first UI',html.indexOf('id="ocrCameraBtn"')<html.indexOf('id="ocrPickBtn"')&&html.includes('カメラで寸法メモを撮る'));
  check('Dimension-only multi-pass OCR',html.includes('function preprocessImageVariant(file,mode)')&&html.includes("threshold205")&&html.includes("threshold225")&&html.includes("tessedit_char_whitelist:'0123456789xX*.- '"));
  check('Loose separator repair enabled',html.includes('function ocrDimensionRepairLine(line)')&&html.includes("return nums[0]+'×'+nums[1]"));
  check('Confirmation warning',html.includes('必ず数字を確認してから追加')&&html.includes('確認した寸法を採寸へ追加'));
  check('Stable data isolated',iphone.includes('SOULZ_CROSS_OCR_TEST_draft.json')&&iphone.includes('SOULZ_CROSS_OCR_TEST_history.json')&&iphone.includes('SOULZ_CROSS_OCR_TEST_app_cache.html'));
  check('Prototype localStorage isolated',iphone.includes('https://soulz-ocr-test.local/'));
  check('Prototype dev auto-update enabled',iphone.includes('raw.githubusercontent.com/soulzwonder/SOULZ-CROSS/feature-v1.1-ocr/ocr-camera-prototype.html')&&iphone.includes('var html = await croppyLoadLatestHTML(bundledHtml);'));
  check('Prototype dev update cache isolated',iphone.includes('SOULZ_CROSS_OCR_TEST_app_cache.html')&&iphone.includes('https://soulz-ocr-test.local/'));

  const names=['normalizeOCRText','measurementToCm','normalizeRoomName','detectRoomFromLine','detectCategoryFromLine','detectProductCode','detectSiteDetails','parseOCRText'];
  const defs=names.map(n=>extract(html,n)).join('\n');
  const roundCm=v=>Math.round(Number(v)*100)/100;
  const fmtCm=v=>String(roundCm(v)).replace(/\.0+$/,'').replace(/(\.\d*?)0+$/,'$1');
  const parse=Function('roundCm','fmtCm',defs+'\nreturn parseOCRText;')(roundCm,fmtCm);
  const cases=[
    '洋間3\nLD4121\n360×4\n240×8\n40×4\n110×2',
    '洋間３\nLD4121\n360 x 4\n240X8\n４０×４\n１１０＊２'
  ];
  for(let i=0;i<cases.length;i++){
    const out=parse(cases[i]);
    const got=out.items.map(x=>x.cm+'x'+x.count).join(',');
    check('Handwritten-dimension parser case '+(i+1),got==='360x4,240x8,40x4,110x2'&&out.items.every(x=>x.roomName==='洋間3'&&x.productCode==='LD4121'),got);
  }
  const normSrc=extract(html,'normalizeOCRText').replace(/^function\s+normalizeOCRText/,'function');
  const norm=Function('return ('+normSrc+');')();
  const repairSrc=extract(html,'ocrDimensionRepairLine').replace(/^function\s+ocrDimensionRepairLine/,'function');
  const repair=Function('normalizeOCRText','return ('+repairSrc+');')(norm);
  check('Dimension repair spaced pair',repair('260 3')==='260×3',repair('260 3'));
  check('Dimension repair dash pair',repair('15 - 2')==='15×2',repair('15 - 2'));
  check('Dimension repair OCR O to zero',repair('36O x 4')==='360×4',repair('36O x 4'));
}catch(e){check('Prototype QA harness',false,e.stack||String(e));}

const pass=checks.filter(x=>x.ok).length,fail=checks.length-pass;
for(const c of checks)console.log('- '+c.name+': '+(c.ok?'PASS':'FAIL')+(c.detail?' ('+c.detail+')':''));
console.log('Result: '+pass+' PASS / '+fail+' FAIL');
if(fail)process.exit(1);
