const fs=require('fs');
const html=fs.readFileSync('ocr-camera-prototype.html','utf8');
const checks=[];
function check(name,ok,detail=''){checks.push({name,ok:!!ok,detail});}
function extract(name){
  const sig='function '+name+'(';let p=html.indexOf(sig);
  if(p<0)throw new Error('missing '+name);
  const b=html.indexOf('{',p);let i=b+1,d=1,state='code',q='',esc=false;
  for(;i<html.length&&d>0;i++){
    const c=html[i],n=html[i+1];
    if(state==='str'){if(esc){esc=false;continue}if(c==='\\'){esc=true;continue}if(c===q){state='code';q=''}continue}
    if(state==='line'){if(c==='\n')state='code';continue}
    if(state==='block'){if(c==='*'&&n==='/'){state='code';i++}continue}
    if(c==="'"||c==='"'||c.charCodeAt(0)===96){state='str';q=c;continue}
    if(c==='/'&&n==='/'){state='line';i++;continue}
    if(c==='/'&&n==='*'){state='block';i++;continue}
    if(c==='{')d++;else if(c==='}')d--;
  }
  return html.slice(p,i);
}
function make(name,deps={}){
  const body=extract(name).replace(new RegExp('^function\\s+'+name),'function');
  const keys=Object.keys(deps),vals=keys.map(k=>deps[k]);
  return Function(...keys,'return ('+body+');')(...vals);
}
try{
  check('OCR version marker v2.64.50',html.includes('<title>CROSS GPT クロッピー | v2.64.50</title>'));
  check('OCR visible badge v2.64.50',html.includes('<span class="ocr-version-badge">v2.64.50</span>'));
  check('Local-contrast segmentation enabled',extract('ocrFindInkComponents').includes("segmentation:'local-contrast'")&&extract('ocrFindInkComponents').includes("ocrPercentile(hist,Math.max(1,sample),.95)"));
  check('Texture cleanup uses local green-channel contrast',extract('ocrFindInkComponents').includes('a[si+1]')&&extract('ocrFindInkComponents').includes('a[(sp-radius)*4+1]'));
  check('Clean handwriting canvas is generated',extract('ocrFindInkComponents').includes('cleanCanvas')&&extract('makeOCRLineCrops').includes('geo.cleanCanvas'));
  check('Clean ink crop is sent to AI/OCR',extract('recognizeHandwritingLines').includes('row.mainInk')&&extract('recognizeHandwritingLines').includes('row.rightInk'));
  check('Legacy blue-biased crop removed from row pipeline',!extract('makeOCRLineCrops').includes("'blueInk'"));
  check('Row clustering rejects small annotation-only rows',extract('ocrClusterRows').includes("charH<Math.max(18,h*.026)"));
  check('Left-label trim uses first structural gap',extract('ocrAnalyzeRow').includes('start=i+1;break'));
  check('Independent right-side count detection retained',extract('ocrAnalyzeRow').includes('rightInferred:inferredRight'));

  const estimate=make('ocrEstimateSkew');
  const cluster=make('ocrClusterRows');
  const bounds=make('ocrBounds');
  const analyze=make('ocrAnalyzeRow',{ocrBounds:bounds});
  const repair=make('ocrDimensionRepairLine',{normalizeOCRText:x=>String(x)});
  const main=make('ocrMainNumber',{normalizeOCRText:x=>String(x)});
  const count=make('ocrCountNumber',{normalizeOCRText:x=>String(x)});
  const fixed=make('ocrFixedParts',{ocrDimensionRepairLine:repair});
  const vote=make('ocrVoteValuesV26449');
  const pick=make('ocrPickStructuredRow',{ocrMainNumber:main,ocrFixedParts:fixed,ocrCountNumber:count,ocrVoteValuesV26449:vote});
  const resolve=make('ocrResolveEnginePicksV26450');

  const wallItems=[{"x":523,"y":73,"w":14,"h":17,"area":80,"cx":530.56,"cy":80.99},{"x":524,"y":214,"w":16,"h":22,"area":92,"cx":531.46,"cy":225.27},{"x":971,"y":259,"w":18,"h":22,"area":80,"cx":980.55,"cy":269.46},{"x":212,"y":292,"w":48,"h":54,"area":444,"cx":231.8,"cy":318.11},{"x":251,"y":321,"w":56,"h":25,"area":287,"cx":278.46,"cy":337.26},{"x":243,"y":325,"w":9,"h":47,"area":106,"cx":246.13,"cy":347.45},{"x":862,"y":342,"w":135,"h":160,"area":1765,"cx":949.52,"cy":409.62},{"x":205,"y":382,"w":22,"h":39,"area":113,"cx":215.6,"cy":401.62},{"x":540,"y":397,"w":67,"h":163,"area":1544,"cx":573.41,"cy":473.66},{"x":700,"y":420,"w":134,"h":40,"area":557,"cx":764.77,"cy":442.55},{"x":426,"y":466,"w":66,"h":96,"area":735,"cx":457.84,"cy":508.92},{"x":332,"y":477,"w":60,"h":169,"area":557,"cx":357.07,"cy":562.76},{"x":147,"y":532,"w":53,"h":85,"area":525,"cx":169.84,"cy":564.07},{"x":174,"y":599,"w":53,"h":25,"area":190,"cx":200.43,"cy":609.43},{"x":826,"y":632,"w":84,"h":126,"area":1497,"cx":869.65,"cy":708.82},{"x":454,"y":676,"w":97,"h":111,"area":1517,"cx":497.39,"cy":722.34},{"x":140,"y":699,"w":70,"h":113,"area":798,"cx":173.88,"cy":750.86},{"x":679,"y":701,"w":133,"h":22,"area":294,"cx":741.99,"cy":711.33},{"x":403,"y":717,"w":25,"h":55,"area":228,"cx":410.21,"cy":747.05},{"x":307,"y":728,"w":74,"h":79,"area":564,"cx":333.2,"cy":769.12},{"x":612,"y":865,"w":99,"h":81,"area":1016,"cx":658.01,"cy":907.88},{"x":416,"y":878,"w":62,"h":63,"area":585,"cx":448.12,"cy":909.62},{"x":377,"y":895,"w":20,"h":63,"area":178,"cx":385.75,"cy":926.71},{"x":527,"y":894,"w":41,"h":10,"area":116,"cx":546.49,"cy":898.6},{"x":481,"y":1007,"w":94,"h":63,"area":683,"cx":522.18,"cy":1039.23},{"x":397,"y":1009,"w":78,"h":81,"area":573,"cx":438.39,"cy":1046.28},{"x":534,"y":1119,"w":19,"h":90,"area":385,"cx":539.77,"cy":1165.22},{"x":598,"y":1129,"w":84,"h":78,"area":764,"cx":636.62,"cy":1171.28},{"x":381,"y":1130,"w":63,"h":67,"area":464,"cx":420.53,"cy":1158.5},{"x":445,"y":1184,"w":56,"h":13,"area":149,"cx":470.46,"cy":1188.81}];
  const wallSlope=estimate(wallItems,1152,1536);
  check('Wall-photo benchmark: skew stays usable',wallSlope>=-0.24&&wallSlope<=-0.10,'slope='+wallSlope);
  const wallRows=cluster({items:wallItems,w:1152,h:1536},wallSlope);
  check('Wall-photo benchmark: exactly five measurement rows',wallRows.length===5,'rows='+wallRows.length);
  const wallMeta=wallRows.map(r=>analyze(r,1152,1536));
  check('Wall-photo row1: label removed and count isolated',wallMeta[0]&&wallMeta[0].labelTrimmed&&wallMeta[0].hasSeparator&&wallMeta[0].hasRight,JSON.stringify(wallMeta[0]));
  check('Wall-photo row2: label removed and count isolated',wallMeta[1]&&wallMeta[1].labelTrimmed&&wallMeta[1].hasSeparator&&wallMeta[1].hasRight,JSON.stringify(wallMeta[1]));
  check('Wall-photo row3: 10 and count isolated',wallMeta[2]&&!wallMeta[2].labelTrimmed&&wallMeta[2].hasSeparator&&wallMeta[2].hasRight,JSON.stringify(wallMeta[2]));
  check('Wall-photo row4: plain 22 remains one main field',wallMeta[3]&&!wallMeta[3].hasRight,JSON.stringify(wallMeta[3]));
  check('Wall-photo row5: plain 212 remains one main field',wallMeta[4]&&!wallMeta[4].hasRight,JSON.stringify(wallMeta[4]));

  let p=pick('108','108','108 - 3','3','108 - 3','3');
  check('Wall-photo expected: 108x3',p&&p.fixed==='108×3'&&p.confidence===3,JSON.stringify(p));
  p=pick('218','218','218 - 6','6','218 - 6','6');
  check('Wall-photo expected: 218x6',p&&p.fixed==='218×6'&&p.confidence===3,JSON.stringify(p));
  p=pick('10','10','10 - 2','2','10 - 2','2');
  check('Wall-photo expected: 10x2',p&&p.fixed==='10×2'&&p.confidence===3,JSON.stringify(p));
  p=pick('22','22','22','','22','');
  check('Wall-photo expected: 22x1',p&&p.fixed==='22×1'&&p.confidence===3,JSON.stringify(p));
  p=pick('212','212','212','','212','');
  check('Wall-photo expected: 212x1',p&&p.fixed==='212×1'&&p.confidence===3,JSON.stringify(p));

  let v=vote([160,160,160,161,141]);
  check('Previous benchmark: 160 wins 3 of 5',v.value===160&&v.votes===3,JSON.stringify(v));
  v=vote([141,160,388]);
  check('Previous benchmark: all-different values withheld',v.value===null&&v.ambiguous===true,JSON.stringify(v));
  check('Parser: separated count not concatenated',main('53 - 2')===53,String(main('53 - 2')));
  p=pick('53','53','53 - 2','2','53 - 2','2');
  check('Previous benchmark: 53x2',p&&p.fixed==='53×2'&&p.confidence===3,JSON.stringify(p));
  p=pick('182','182','182 - 2','2','182 - 2','2');
  check('Previous benchmark: 182x2',p&&p.fixed==='182×2'&&p.confidence===3,JSON.stringify(p));
  p=pick('141','160','388','','','');
  check('Conflict: 141/160/388 withheld',p&&p.unresolved===true&&p.fixed==='',JSON.stringify(p));
  p=pick('53','53','53 - 2','2','53 - 3','3');
  check('Count conflict: 2 vs 3 withheld',p&&p.unresolved===true&&p.reason==='count-vote-conflict',JSON.stringify(p));

  let resolved=resolve({fixed:'108×3',raw:'108-3',confidence:3},{fixed:'108×3',raw:'108-3',confidence:3});
  check('Cross-engine matching result becomes high confidence',resolved.length===1&&resolved[0].verified&&resolved[0].tier==='high',JSON.stringify(resolved));
  resolved=resolve({fixed:'236×1',raw:'236',confidence:3},{fixed:'388×1',raw:'388',confidence:3});
  check('Cross-engine disagreement remains withheld',resolved.length===1&&resolved[0].unresolved&&resolved[0].fixed==='',JSON.stringify(resolved));
  resolved=resolve({fixed:'215×1',raw:'215',confidence:3},null);
  check('Single strong engine remains medium',resolved.length===1&&resolved[0].tier==='medium'&&!resolved[0].verified,JSON.stringify(resolved));

  check('Confidence: verified short dimensions can pass',html.includes("!explicitHigh&&(cm<100||count>30)"));
  check('Duplicate OCR rows retain line identity',html.includes("explicitStructured?'|ocrline:'+idx:''"));
  check('Precision gate still withholds unresolved rows',html.includes("ordered.push('要確認 行'+rowNo+' 読取不一致')"));
  check('No first-candidate fallback',!extract('ocrPickStructuredRow').includes('chosen=d1||d2||df'));
  check('Line numeric verifier retained',html.includes('function ocrTessReadV26446')&&html.includes("tessedit_pageseg_mode:'7'"));

  const classifyShape=make('ocrClassifyDigitShapeV26450');
  function glyph(ratio,density,holes,topSpan,midSpan,botSpan,topMean,botMean){return classifyShape({ratio,density,holes,topSpan,midSpan,botSpan,topMean,botMean})}
  check('Shape digit: handwritten 1 low-density slant',glyph(.568,.062,0,.405,.333,.286,.748,.119)==='1');
  check('Shape digit: handwritten 1 narrow stroke',glyph(.383,.255,0,.556,.278,.944,.289,.386)==='1');
  check('Shape digit: handwritten 0 loop',glyph(.925,.168,1,.703,.865,.676,.658,.259)==='0');
  check('Shape digit: handwritten 8 narrow double lobe',glyph(.459,.182,1,1.0,.824,.50,.597,.217)==='8');
  check('Shape digit: handwritten 8 multi-hole',glyph(.932,.182,3,1.0,.841,.366,.520,.191)==='8');
  check('Shape digit: handwritten 2 lower sweep',glyph(.809,.139,0,.364,.255,.982,.197,.419)==='2');
  check('Shape digit: handwritten 3 top hook',glyph(.887,.081,0,.957,.223,.457,.549,.606)==='3');
  check('Shape digit: handwritten 6 lower loop',glyph(.634,.150,1,.338,.915,.972,.557,.472)==='6');

  const repairOne=make('ocrRepairMissingOnesV26450');
  let repaired=repairOne({fixed:'8×3',raw:'08',confidence:2},{fixed:'108×3',raw:'形状',confidence:3});
  check('Shape repair: missing leading 1 in 108',repaired&&repaired.fixed==='108×3'&&repaired.repairedByShape===true,JSON.stringify(repaired));
  repaired=repairOne({fixed:'22×1',raw:'22',confidence:3},{fixed:'212×1',raw:'形状',confidence:3});
  check('Shape repair: missing middle 1 in 212',repaired&&repaired.fixed==='212×1',JSON.stringify(repaired));
  repaired=repairOne({fixed:'208×1',raw:'208',confidence:3},{fixed:'218×1',raw:'形状',confidence:3});
  check('Shape repair does not change non-1 disagreement',repaired&&repaired.fixed==='208×1'&&!repaired.repairedByShape,JSON.stringify(repaired));

  const resolve3=make('ocrResolveEnginePicksV26450');
  let r3=resolve3({fixed:'108×3',raw:'ai',confidence:3},{fixed:'8×3',raw:'ocr',confidence:3},{fixed:'108×3',raw:'shape',confidence:3});
  check('Three-engine majority returns medium candidate',r3.length===1&&r3[0].fixed==='108×3'&&r3[0].tier==='medium'&&!r3[0].verified,JSON.stringify(r3));
  r3=resolve3({fixed:'218×6',raw:'ai',confidence:3},{fixed:'218×6',raw:'ocr',confidence:3},{fixed:'218×6',raw:'shape',confidence:3});
  check('Three-engine unanimous returns high confidence',r3.length===1&&r3[0].fixed==='218×6'&&r3[0].tier==='high'&&r3[0].verified,JSON.stringify(r3));
  r3=resolve3(null,null,{fixed:'212×1',raw:'shape',confidence:3});
  check('Shape-only strong candidate is medium, never auto-high',r3.length===1&&r3[0].fixed==='212×1'&&r3[0].tier==='medium'&&!r3[0].verified,JSON.stringify(r3));
  check('Digit-shape engine is wired into line crops',extract('makeOCRLineCrops').includes('shapeMain:ocrCanvasDigitShapeV26450')&&extract('makeOCRLineCrops').includes('shapeRight:rightInkCv?ocrCanvasDigitShapeV26450'));
  check('Three-engine resolver is wired',extract('recognizeHandwritingLines').includes('ocrResolveEnginePicksV26450(aiPick,tessPick,shapePick)'));
  const scriptPath='v2.64.50_CROPPY_OCR.js';
  check('Scriptable v2.64.50 package exists',fs.existsSync(scriptPath));
  if(fs.existsSync(scriptPath)){
    const ocrScript=fs.readFileSync(scriptPath,'utf8');
    const bm=ocrScript.match(/var b64 = '([^']+)'/);
    const bundled=bm?Buffer.from(bm[1],'base64').toString('utf8'):'';
    check('Scriptable header is version-first v2.64.50',ocrScript.includes('クロッピー v2.64.50 OCR CAMERA')&&ocrScript.includes('OCR v2.64.50 / auto-update'));
    check('Scriptable bundled HTML is v2.64.50',bundled.includes('<title>CROSS GPT クロッピー | v2.64.50</title>')&&bundled.includes('<span class="ocr-version-badge">v2.64.50</span>'));
    check('Scriptable keeps OCR auto-update URL',ocrScript.includes('https://soulz-cross.onrender.com/ocr-camera-prototype.html'));
  }
  const copyPage=fs.readFileSync('iphone-copy.html','utf8');
  check('OCR copy page points to v2.64.50 version-first package',copyPage.includes('./v2.64.50_CROPPY_OCR.js')&&copyPage.includes('iPhone OCR版 v2.64.50'));
}catch(e){
  check('OCR structure QA harness',false,e.stack||String(e));
}
const pass=checks.filter(x=>x.ok).length,fail=checks.length-pass;
for(const c of checks)console.log('- '+c.name+': '+(c.ok?'PASS':'FAIL')+(c.detail?' ('+c.detail+')':''));
console.log('Result: '+pass+' PASS / '+fail+' FAIL');
if(fail)process.exit(1);
