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
  check('OCR structure version marker',html.includes('<title>CROSS GPT クロッピー | v2.64.46</title>'));
  check('Connected-component segmentation enabled',html.includes('function ocrFindInkComponents'));
  check('Skew estimation enabled',html.includes('function ocrEstimateSkew'));
  check('Row structure clustering enabled',html.includes('function ocrClusterRows'));
  check('Dual-read consensus enabled',html.includes('function ocrPickStructuredRow'));
  check('Low-confidence candidates stay unselected',html.includes("var suspicious=(/^\\?/.test(line)||cm<100||count>30);"));

  const estimate=make('ocrEstimateSkew');
  const cluster=make('ocrClusterRows');
  const bounds=make('ocrBounds');
  const analyze=make('ocrAnalyzeRow',{ocrBounds:bounds});
  const pick=make('ocrPickStructuredRow',{
    ocrMainNumber:make('ocrMainNumber',{normalizeOCRText:x=>String(x)}),
    ocrFixedParts:make('ocrFixedParts',{ocrDimensionRepairLine:make('ocrDimensionRepairLine',{normalizeOCRText:x=>String(x)})}),
    ocrCountNumber:make('ocrCountNumber',{normalizeOCRText:x=>String(x)})
  });

  const items=[
    {x:249,y:435,w:57,h:25,area:196,cx:276,cy:447},
    {x:465,y:354,w:39,h:149,area:746,cx:475,cy:419},
    {x:536,y:309,w:68,h:168,area:1306,cx:561,cy:401},
    {x:629,y:338,w:60,h:98,area:1003,cx:657,cy:385},

    {x:487,y:536,w:36,h:85,area:418,cx:508,cy:573},
    {x:548,y:513,w:38,h:81,area:475,cx:565,cy:554},
    {x:560,y:502,w:111,h:41,area:563,cx:612,cy:521},

    {x:282,y:681,w:43,h:98,area:552,cx:308,cy:723},
    {x:501,y:647,w:55,h:104,area:531,cx:520,cy:688},
    {x:597,y:638,w:45,h:83,area:380,cx:623,cy:672},
    {x:682,y:650,w:43,h:18,area:128,cx:700,cy:659},
    {x:782,y:602,w:111,h:66,area:653,cx:824,cy:639},

    {x:417,y:843,w:90,h:56,area:395,cx:458,cy:870},
    {x:525,y:814,w:61,h:69,area:337,cx:564,cy:838},
    {x:601,y:786,w:61,h:74,area:708,cx:635,cy:828},
    {x:716,y:815,w:52,h:15,area:191,cx:739,cy:821},
    {x:778,y:760,w:147,h:109,area:1950,cx:854,cy:805},

    {x:462,y:965,w:78,h:46,area:407,cx:503,cy:985},
    {x:567,y:950,w:17,h:54,area:208,cx:573,cy:975},
    {x:629,y:926,w:40,h:77,area:369,cx:648,cy:965},
    {x:666,y:919,w:82,h:10,area:265,cx:707,cy:925},

    {x:473,y:1049,w:26,h:67,area:299,cx:487,cy:1081},
    {x:570,y:1050,w:40,h:59,area:693,cx:591,cy:1080},
    {x:629,y:1050,w:103,h:44,area:620,cx:675,cy:1076},
    {x:773,y:1057,w:44,h:6,area:121,cx:794,cy:1060},
    {x:850,y:1031,w:101,h:64,area:586,cx:893,cy:1075}
  ];
  const slope=estimate(items,1152,1536);
  check('Benchmark photo geometry: skew estimated',slope<=-0.075&&slope>=-0.20,'slope='+slope);
  const rows=cluster({items,w:1152,h:1536},slope);
  check('Benchmark photo geometry: six measurement rows retained',rows.length>=6&&rows.length<=8,'rows='+rows.length);
  const first=rows[0]&&analyze(rows[0],1152,1536);
  check('Benchmark photo geometry: left handwritten label is trimmed',!!first&&first.labelTrimmed===true,JSON.stringify(first));

  let p=pick('160','160','160','');
  check('Consensus: 160 survives',p&&p.fixed==='160×1'&&p.confidence===3,JSON.stringify(p));
  p=pick('53','53','53 - 2','2');
  check('Consensus: separated count becomes 53x2',p&&p.fixed==='53×2'&&p.confidence===3,JSON.stringify(p));
  p=pick('236','236','236 - 3','scribble');
  check('Consensus: crossed-out right mark is not accepted as count',p&&p.fixed==='236×1',JSON.stringify(p));
  p=pick('141','160','388','');
  check('Consensus: disagreement is marked low confidence',p&&p.confidence===1,JSON.stringify(p));
  const repair=make('ocrDimensionRepairLine',{normalizeOCRText:x=>String(x)});
  check('Short dimension: 15x2 remains candidate',repair('15 - 2')==='15×2',repair('15 - 2'));
  const resolve=make('ocrResolveEnginePicksV26446');
  let resolved=resolve({fixed:'160×1',raw:'160',confidence:3},{fixed:'160×1',raw:'160',confidence:3});
  check('Cross-engine: matching 160 is verified',resolved.length===1&&resolved[0].fixed==='160×1'&&resolved[0].verified===true,JSON.stringify(resolved));
  resolved=resolve({fixed:'141×1',raw:'141',confidence:3},{fixed:'160×1',raw:'160',confidence:3});
  check('Cross-engine: disagreement stays unchecked',resolved.length===2&&resolved.every(x=>x.fixed.startsWith('? '))&&resolved.every(x=>x.verified===false),JSON.stringify(resolved));
  check('Line-level numeric verifier enabled',html.includes('function ocrTessReadV26446')&&html.includes("progress('数字照合 ")&&html.includes("tessedit_pageseg_mode:'7'"));
}catch(e){
  check('OCR structure QA harness',false,e.stack||String(e));
}
const pass=checks.filter(x=>x.ok).length,fail=checks.length-pass;
for(const c of checks)console.log('- '+c.name+': '+(c.ok?'PASS':'FAIL')+(c.detail?' ('+c.detail+')':''));
console.log('Result: '+pass+' PASS / '+fail+' FAIL');
if(fail)process.exit(1);
