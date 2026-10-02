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
  check('OCR version marker v2.64.55',html.includes('<title>CROSS GPT クロッピー | v2.64.55</title>'));
  check('OCR visible badge v2.64.55',html.includes('<span class="ocr-version-badge">v2.64.55</span>'));
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
  const resolve=make('ocrResolveEnginePicksV26452');

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

  const resolve3=make('ocrResolveEnginePicksV26452');
  let r3=resolve3({fixed:'108×3',raw:'ai',confidence:3},{fixed:'8×3',raw:'ocr',confidence:3},{fixed:'108×3',raw:'shape',confidence:3});
  check('Three-engine majority returns medium candidate',r3.length===1&&r3[0].fixed==='108×3'&&r3[0].tier==='medium'&&!r3[0].verified,JSON.stringify(r3));
  r3=resolve3({fixed:'218×6',raw:'ai',confidence:3},{fixed:'218×6',raw:'ocr',confidence:3},{fixed:'218×6',raw:'shape',confidence:3});
  check('Three-engine unanimous returns high confidence',r3.length===1&&r3[0].fixed==='218×6'&&r3[0].tier==='high'&&r3[0].verified,JSON.stringify(r3));
  r3=resolve3(null,null,{fixed:'212×1',raw:'shape',confidence:3});
  check('Shape-only strong candidate is medium, never auto-high',r3.length===1&&r3[0].fixed==='212×1'&&r3[0].tier==='medium'&&!r3[0].verified,JSON.stringify(r3));
  check('Digit-shape engine is wired into line crops',extract('makeOCRLineCrops').includes('shapeMain:ocrCanvasDigitShapeV26450')&&extract('makeOCRLineCrops').includes('shapeRight:rightInkCv?ocrCanvasDigitShapeV26450'));
  check('Four-engine resolver is wired',extract('recognizeHandwritingLines').includes('ocrResolveEnginePicksV26452(aiPicks[k],tessPicks[k],shapePicks[k],paddlePicks[k])'));
  check('Free PaddleOCR official SDK is pinned',html.includes('https://cdn.jsdelivr.net/npm/@paddleocr/paddleocr-js@0.4.2/+esm'));
  check('PaddleOCR uses PP-OCRv5 English handwriting model selection',extract('loadPaddleOCRV26453').includes("lang:'en'")&&extract('loadPaddleOCRV26453').includes("ocrVersion:'PP-OCRv5'"));
  check('PaddleOCR has no API key path',!extract('loadPaddleOCRV26453').toLowerCase().includes('apikey')&&!extract('loadPaddleOCRV26453').toLowerCase().includes('authorization'));
  check('PaddleOCR failure falls back safely',extract('recognizeHandwritingLines').includes('PaddleOCR unavailable, legacy path')&&extract('recognizeHandwritingLines').includes('needsAI.length'));

  const paddleFrom=make('ocrPaddlePickFromResultsV26452',{
    ocrPaddleResultV26452:make('ocrPaddleResultV26452'),
    ocrMainNumber:main,
    ocrFixedParts:fixed,
    ocrCountNumber:count
  });
  function pres(text,score=.9){return{items:text?[{text,score,poly:[[0,0],[20,0],[20,10],[0,10]]}]:[]}}
  let pp=paddleFrom(pres('108',.94),pres('108-3',.90),pres('3',.96),{hasRight:true});
  check('Paddle sample: 108x3',pp&&pp.fixed==='108×3'&&pp.confidence===3,JSON.stringify(pp));
  pp=paddleFrom(pres('218',.92),pres('218-6',.89),pres('6',.93),{hasRight:true});
  check('Paddle sample: 218x6',pp&&pp.fixed==='218×6'&&pp.confidence===3,JSON.stringify(pp));
  pp=paddleFrom(pres('10',.91),pres('10-2',.88),pres('2',.95),{hasRight:true});
  check('Paddle sample: 10x2',pp&&pp.fixed==='10×2'&&pp.confidence===3,JSON.stringify(pp));
  pp=paddleFrom(pres('22',.96),pres('22',.93),null,{hasRight:false});
  check('Paddle sample: 22x1',pp&&pp.fixed==='22×1'&&pp.confidence===3,JSON.stringify(pp));
  pp=paddleFrom(pres('212',.94),pres('212',.91),null,{hasRight:false});
  check('Paddle sample: 212x1',pp&&pp.fixed==='212×1'&&pp.confidence===3,JSON.stringify(pp));
  pp=paddleFrom(pres('108',.9),pres('188-3',.9),pres('3',.9),{hasRight:true});
  check('Paddle internal disagreement is withheld',pp&&pp.unresolved===true&&pp.fixed==='',JSON.stringify(pp));

  const resolve4=make('ocrResolveEnginePicksV26452');
  let r4=resolve4({fixed:'108×3',raw:'trocr',confidence:3},{fixed:'8×3',raw:'tess',confidence:3},{fixed:'108×3',raw:'shape',confidence:3},{fixed:'108×3',raw:'paddle',confidence:3});
  check('Four-engine 3-to-1 majority is high confidence',r4.length===1&&r4[0].fixed==='108×3'&&r4[0].tier==='high'&&r4[0].verified,JSON.stringify(r4));
  r4=resolve4(null,{fixed:'218×6',raw:'tess',confidence:3},{fixed:'218×6',raw:'shape',confidence:3},{fixed:'218×6',raw:'paddle',confidence:3});
  check('Paddle plus two local engines can verify without TrOCR',r4.length===1&&r4[0].fixed==='218×6'&&r4[0].tier==='high',JSON.stringify(r4));
  r4=resolve4({fixed:'108×3',raw:'trocr',confidence:3},{fixed:'8×3',raw:'tess',confidence:3},{fixed:'108×3',raw:'shape',confidence:3},{fixed:'8×3',raw:'paddle',confidence:3});
  check('Four-engine 2-to-2 tie is withheld',r4.length===1&&r4[0].unresolved===true,JSON.stringify(r4));
  check('Memory-safe Paddle then TrOCR sequencing',extract('recognizeHandwritingLines').indexOf('await ocrDisposePaddleV26453(paddle)')<extract('recognizeHandwritingLines').indexOf('loadHandwritingAI(progress)'));
  check('TrOCR is limited to non-high-confidence rows',extract('recognizeHandwritingLines').includes("if(!p||!p.fixed||p.tier!=='high')needsAI.push(j)"));
  check('Blank OCR output is forbidden per extracted row',extract('recognizeHandwritingLines').includes("reason:'no-engine-read'")&&extract('recognizeHandwritingLines').includes("全エンジンで数値化できず"));
  check('Zero-candidate warning exposes engine diagnostics',html.includes("寸法候補0件。'+ocrDiagTextV26453()")&&extract('ocrDiagTextV26453').includes("'行抽出 '"));
  check('Paddle engine is disposable',extract('ocrDisposePaddleV26453').includes("engine.dispose"));
  check('Paddle load failure still activates legacy path',extract('recognizeHandwritingLines').includes("PaddleOCR unavailable, legacy path")&&extract('recognizeHandwritingLines').includes("needsAI.length"));
  const laneFn=make('ocrDimensionLaneV26454');
  const currentPhotoItems=[{"x":536,"y":308,"w":69,"h":169,"area":1562,"cx":561.4967989756722,"cy":400.3021766965429},{"x":628,"y":337,"w":62,"h":100,"area":1271,"cx":657.1966955153423,"cy":385.0763178599528},{"x":464,"y":353,"w":41,"h":151,"area":931,"cx":474.9989258861439,"cy":420.1439312567132},{"x":249,"y":434,"w":58,"h":27,"area":274,"cx":276.55474452554745,"cy":446.97080291970804},{"x":254,"y":459,"w":139,"h":93,"area":1293,"cx":308.44238205723127,"cy":511.6047950502707},{"x":560,"y":500,"w":114,"h":44,"area":644,"cx":612.3913043478261,"cy":520.6180124223603},{"x":547,"y":512,"w":40,"h":83,"area":598,"cx":565.3645484949833,"cy":553.8010033444816},{"x":486,"y":535,"w":37,"h":86,"area":562,"cx":507.855871886121,"cy":573.576512455516},{"x":288,"y":537,"w":6,"h":26,"area":91,"cx":291.14285714285717,"cy":549.4725274725274},{"x":782,"y":602,"w":112,"h":67,"area":831,"cx":823.4572803850782,"cy":638.1817087845968},{"x":595,"y":636,"w":48,"h":86,"area":512,"cx":623.380859375,"cy":673.580078125},{"x":500,"y":646,"w":58,"h":106,"area":685,"cx":521.2875912408759,"cy":687.5693430656934},{"x":681,"y":649,"w":47,"h":19,"area":176,"cx":701.1477272727273,"cy":658.3806818181819},{"x":281,"y":681,"w":44,"h":104,"area":680,"cx":307.4279411764706,"cy":725.7720588235294},{"x":777,"y":759,"w":148,"h":111,"area":2035,"cx":852.9105651105651,"cy":805.6579852579853},{"x":601,"y":785,"w":62,"h":75,"area":823,"cx":635.5236938031592,"cy":827.4240583232078},{"x":525,"y":813,"w":62,"h":72,"area":423,"cx":564.3995271867612,"cy":838.4491725768321},{"x":715,"y":815,"w":55,"h":15,"area":211,"cx":738.1611374407582,"cy":820.7962085308056},{"x":417,"y":843,"w":94,"h":56,"area":517,"cx":459.1605415860735,"cy":869.8046421663443},{"x":666,"y":918,"w":90,"h":12,"area":306,"cx":707.3464052287582,"cy":925.0098039215686},{"x":628,"y":926,"w":41,"h":78,"area":446,"cx":647.3923766816143,"cy":965.3923766816143},{"x":567,"y":950,"w":17,"h":54,"area":219,"cx":573.5114155251141,"cy":974.3561643835617},{"x":462,"y":965,"w":79,"h":46,"area":448,"cx":503.47544642857144,"cy":985.0424107142857},{"x":849,"y":1031,"w":102,"h":64,"area":563,"cx":889.9467140319716,"cy":1069.9715808170515},{"x":473,"y":1049,"w":27,"h":67,"area":282,"cx":487.06028368794324,"cy":1080.5851063829787},{"x":570,"y":1050,"w":40,"h":58,"area":656,"cx":590.5396341463414,"cy":1078.5198170731708},{"x":629,"y":1050,"w":103,"h":44,"area":591,"cx":671.8714043993232,"cy":1073.834179357022},{"x":29,"y":1191,"w":29,"h":185,"area":1044,"cx":41.13409961685824,"cy":1291.1226053639846},{"x":88,"y":1386,"w":100,"h":28,"area":379,"cx":135.14511873350924,"cy":1398.891820580475},{"x":177,"y":1405,"w":75,"h":21,"area":173,"cx":213.11560693641619,"cy":1414.1271676300578},{"x":1105,"y":1415,"w":18,"h":83,"area":371,"cx":1114.7816711590297,"cy":1464.7843665768194},{"x":449,"y":1463,"w":116,"h":28,"area":650,"cx":508.5846153846154,"cy":1476.4076923076923},{"x":568,"y":1486,"w":32,"h":12,"area":167,"cx":583.6347305389221,"cy":1491.7425149700598}];
  const lane2=laneFn({items:currentPhotoItems,w:1152,h:1536});
  check('Current field photo: dynamic lane starts after left annotations',lane2.start>350&&lane2.start<430,'start='+lane2.start);
  check('Current field photo: bottom/screen-edge components are removed',lane2.items.every(c=>c.cy<=1536*.95&&c.cx<=1152*.95));
  const slope2=estimate(lane2.items,1152,1536);
  const rows2=cluster({items:lane2.items,w:1152,h:1536,laneFiltered:true,laneStart:lane2.start},slope2);
  check('Current field photo: six measurement rows separated',rows2.length===6,'rows='+rows2.length);
  const meta2=rows2.map(r=>analyze(r,1152,1536));
  check('Current field photo: 160 and 35 are not merged',rows2[0].y<400&&rows2[1].y>=490&&rows2[1].y<560,JSON.stringify(rows2.map(r=>({y:r.y,h:r.h}))));
  check('Current field photo: 53 right count is isolated',meta2[2]&&meta2[2].hasRight&&meta2[2].hasSeparator,JSON.stringify(meta2[2]));
  check('Current field photo: leading 1 of 182 is preserved',meta2[5]&&meta2[5].labelTrimmed===false&&rows2[5].items.length===4,JSON.stringify(meta2[5]));
  check('Current field photo: 182 right-side 2 is isolated',meta2[5]&&meta2[5].hasRight===true&&meta2[5].rightInferred===true,JSON.stringify(meta2[5]));
  check('Dynamic lane is wired before skew estimation',extract('makeOCRLineCrops').indexOf('ocrDimensionLaneV26454(geo)')<extract('makeOCRLineCrops').indexOf('ocrEstimateSkew(lane.items'));
  check('Current field photo: crossed-out count is marked suspicious',meta2[3]&&meta2[3].rightSuspicious===true,JSON.stringify(meta2[3]));
  check('Current field photo: valid right counts stay usable',meta2[2]&&meta2[2].rightSuspicious===false&&meta2[5]&&meta2[5].rightSuspicious===false);
  check('Per-row member pixels are retained',extract('ocrFindInkComponents').includes('members:members.slice()'));
  check('Per-row ink isolation is wired before OCR',extract('makeOCRLineCrops').includes('ocrDeskewMembersCropV26455(meta.mainItems')&&extract('makeOCRLineCrops').includes('ocrDeskewMembersCropV26455(meta.rightItems'));
  check('Suspicious count override is wired',extract('recognizeHandwritingLines').includes('ocrSuspiciousRightReviewV26455(rows[k]'));
  const classify55=make('ocrClassifyDigitShapeV26455');
  const shapeCases=[
    ['1',{ratio:.227,density:.226,holes:0,topSpan:.90,midSpan:.25,botSpan:.95,topMean:.374,midMean:.107,botMean:.373,compCount:1}],
    ['6',{ratio:.303,density:.224,holes:1,topSpan:.867,midSpan:.267,botSpan:.967,topMean:.49,midMean:.087,botMean:.42,compCount:1}],
    ['0',{ratio:.55,density:.269,holes:0,topSpan:.818,midSpan:.909,botSpan:.758,topMean:.582,midMean:.47,botMean:.32,compCount:1}],
    ['3',{ratio:.494,density:.182,holes:0,topSpan:.756,midSpan:.610,botSpan:.537,topMean:.439,midMean:.724,botMean:.675,compCount:1}],
    ['5',{ratio:1.139,density:.114,holes:0,topSpan:.939,midSpan:.452,botSpan:.313,topMean:.568,midMean:.150,botMean:.241,compCount:2}],
    ['7',{ratio:.914,density:.122,holes:0,topSpan:1,midSpan:.203,botSpan:.25,topMean:.508,midMean:.905,botMean:.745,compCount:1}],
    ['2',{ratio:1.821,density:.153,holes:0,topSpan:.745,midSpan:.441,botSpan:.49,topMean:.391,midMean:.704,botMean:.651,compCount:1}],
    ['8',{ratio:.697,density:.304,holes:1,topSpan:1,midSpan:.903,botSpan:.806,topMean:.495,midMean:.618,botMean:.548,compCount:1}]
  ];
  check('Current field photo: shape feature regression reads 160 / 35 / 53 / 276 / 215 / 182',shapeCases.every(function(t){return classify55(t[1]).digit===t[0]}),shapeCases.map(function(t){return t[0]+'='+classify55(t[1]).digit}).join(','));
  const scriptPath='v2.64.55_CROPPY_OCR.js';
  check('Scriptable v2.64.55 package exists',fs.existsSync(scriptPath));
  if(fs.existsSync(scriptPath)){
    const ocrScript=fs.readFileSync(scriptPath,'utf8');
    const bm=ocrScript.match(/var b64 = '([^']+)'/);
    const bundled=bm?Buffer.from(bm[1],'base64').toString('utf8'):'';
    check('Scriptable header is version-first v2.64.55',ocrScript.includes('クロッピー v2.64.55 OCR CAMERA')&&ocrScript.includes('OCR v2.64.55 / auto-update'));
    check('Scriptable bundled HTML is v2.64.55',bundled.includes('<title>CROSS GPT クロッピー | v2.64.55</title>')&&bundled.includes('<span class="ocr-version-badge">v2.64.55</span>'));
    check('Scriptable keeps OCR auto-update URL',ocrScript.includes('https://soulz-cross.onrender.com/ocr-camera-prototype.html'));
  }
  const copyPage=fs.readFileSync('iphone-copy.html','utf8');
  check('OCR copy page points to v2.64.55 version-first package',copyPage.includes('./v2.64.55_CROPPY_OCR.js')&&copyPage.includes('iPhone OCR版 v2.64.55'));
}catch(e){
  check('OCR structure QA harness',false,e.stack||String(e));
}
const pass=checks.filter(x=>x.ok).length,fail=checks.length-pass;
for(const c of checks)console.log('- '+c.name+': '+(c.ok?'PASS':'FAIL')+(c.detail?' ('+c.detail+')':''));
console.log('Result: '+pass+' PASS / '+fail+' FAIL');
if(fail)process.exit(1);
