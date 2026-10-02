(function finalTortureQA(){
'use strict';
const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const iphone=fs.readFileSync('CROPPY_iPhone_v2.64.38.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const VERSION='v2.64.38';
const checks=[];
const timings=[];
function check(name,ok,detail){checks.push({name,ok:!!ok,detail:detail||''});}
function timed(name,fn){const t=Date.now();const out=fn();timings.push({name,ms:Date.now()-t});return out;}
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
function fnFrom(src,name,deps){
  const list=extractFunctions(src,name);if(!list.length)throw new Error('missing '+name);
  const body=list[list.length-1].replace(new RegExp('^function\\s+'+name.replace(/\$/g,'\\$&')),'function');
  const keys=Object.keys(deps||{}),vals=keys.map(k=>deps[k]);
  return Function(...keys,'return ('+body+');')(...vals);
}
function memoryStorage(init){
  const store=Object.assign({},init||{});
  return {
    store,
    get length(){return Object.keys(store).length},
    key(i){return Object.keys(store)[i]??null},
    getItem(k){return Object.prototype.hasOwnProperty.call(store,k)?store[k]:null},
    setItem(k,v){store[k]=String(v)},
    removeItem(k){delete store[k]}
  };
}
const D='soulz_cross_calc_v11_draft',H='soulz_cross_calc_v11_history';
const DR='SOULZ_CROSS_RECOVERY_DRAFT_V1',HR='SOULZ_CROSS_RECOVERY_HISTORY_V1';
const DS='SOULZ_CROSS_STAGE_DRAFT_V1',HS='SOULZ_CROSS_STAGE_HISTORY_V1';
const PRE='SOULZ_CROSS_PRE_RESTORE_BACKUP';

try{
  check('Pinned app version',html.includes('<title>CROSS GPT クロッピー | '+VERSION+'</title>')&&iphone.includes(VERSION));
  const stored=fnFrom(html,'croppyStoredValue',{});
  const dataKey=fnFrom(html,'croppyIsDataKey',{CROPPY_PRE_RESTORE_KEY:PRE,DRAFT_KEY:D,HISTORY_KEY:H,String});
  const recoveryKey=fnFrom(html,'croppyIsRecoveryKey',{DRAFT_RECOVERY_KEY:DR,HISTORY_RECOVERY_KEY:HR,DRAFT_STAGE_KEY:DS,HISTORY_STAGE_KEY:HS,String});
  const canonical=fnFrom(html,'croppyBackupCanonicalStorage',{});
  const integrity=fnFrom(html,'croppyBackupIntegrity',{croppyBackupCanonicalStorage:canonical,Math});
  const validate=fnFrom(html,'croppyValidateBackup',{DRAFT_KEY:D,HISTORY_KEY:H,croppyBackupIntegrity:integrity,JSON,String,Number,Error});

  timed('10,000 sequential draft saves',()=>{
    const ls=memoryStorage({[D]:JSON.stringify({seq:-1}),[DR]:JSON.stringify({seq:-2})});
    const faults=[];
    const write=fnFrom(html,'croppyWriteWithRecovery',{localStorage:ls,croppyStoredValue:stored,croppyNotifyStorageFault:e=>faults.push(e),DRAFT_STAGE_KEY:DS,HISTORY_STAGE_KEY:HS,JSON,Error});
    let all=true;
    for(let i=0;i<10000;i++){if(write(D,DR,{seq:i,payload:'x'.repeat(64)},'draft')!==true){all=false;break}}
    const cur=JSON.parse(ls.getItem(D)),prev=JSON.parse(ls.getItem(DR));
    check('Endurance: 10,000 sequential draft saves',all&&faults.length===0&&cur.seq===9999&&prev.seq===9998&&ls.getItem(DS)===null,'final='+cur.seq+', prev='+prev.seq+', faults='+faults.length);
  });

  timed('history cap from 5,000 rows',()=>{
    let captured=null;
    const saveHist=fnFrom(html,'saveHistoryStore',{
      history:Array.from({length:5000},(_,i)=>({id:'h'+i})),
      croppyWriteWithRecovery:(pk,rk,v)=>{captured=v;return true},
      HISTORY_KEY:H,HISTORY_RECOVERY_KEY:HR,
      window:{},renderStartRecent:()=>{}
    });
    const ok=saveHist();
    check('Endurance: 5,000 incoming history rows cap safely to 200',ok===true&&Array.isArray(captured)&&captured.length===200&&captured[0].id==='h0'&&captured[199].id==='h199','saved='+((captured&&captured.length)||0));
  });

  let hugeBackup=null;
  timed('5,000-row backup validate and restore',()=>{
    const history=Array.from({length:5000},(_,i)=>({id:'h'+i,jobName:'現場'+i,memo:'耐久'.repeat(40),items:[{cm:240+(i%50),count:1+(i%5),repeatCm:i%3?0:52.5}]}));
    const storage={
      [D]:JSON.stringify({jobName:'最終耐久試験',memo:'z'.repeat(20000),rooms:Array.from({length:30},(_,i)=>({id:'r'+i,name:'部屋'+i}))}),
      [H]:JSON.stringify(history),
      SOULZ_CROSS_UI_PREFS:JSON.stringify({theme:'blue',font:'normal'})
    };
    hugeBackup={format:'CROPPY_BACKUP',formatVersion:1,appVersion:VERSION,exportedAt:new Date().toISOString(),storage,integrity:{algorithm:'fnv1a32',value:integrity(storage)}};
    const ls=memoryStorage();
    const replace=fnFrom(html,'croppyReplaceStorage',{localStorage:ls,croppyIsDataKey:dataKey,croppyIsRecoveryKey:recoveryKey,DRAFT_KEY:D,HISTORY_KEY:H,croppyStoredValue:stored,DRAFT_RECOVERY_KEY:DR,HISTORY_RECOVERY_KEY:HR,Error});
    const valid=validate(hugeBackup);
    replace(storage);
    const restored=JSON.parse(ls.getItem(H));
    check('Endurance: 5,000-row backup validates and restores',valid===true&&restored.length===5000&&restored[4999].id==='h4999'&&ls.getItem(HR)===ls.getItem(H)&&ls.getItem(DR)===ls.getItem(D),'bytes='+JSON.stringify(hugeBackup).length);
  });

  timed('200 alternating restore cycles',()=>{
    const ls=memoryStorage();
    const replace=fnFrom(html,'croppyReplaceStorage',{localStorage:ls,croppyIsDataKey:dataKey,croppyIsRecoveryKey:recoveryKey,DRAFT_KEY:D,HISTORY_KEY:H,croppyStoredValue:stored,DRAFT_RECOVERY_KEY:DR,HISTORY_RECOVERY_KEY:HR,Error});
    let ok=true;
    for(let i=0;i<200;i++){
      const storage={
        [D]:JSON.stringify({cycle:i,jobName:'復元'+i}),
        [H]:JSON.stringify(Array.from({length:200},(_,j)=>({id:i+'-'+j,value:j})))
      };
      replace(storage);
      if(JSON.parse(ls.getItem(D)).cycle!==i||JSON.parse(ls.getItem(H)).length!==200||ls.getItem(DR)!==ls.getItem(D)||ls.getItem(HR)!==ls.getItem(H)||ls.getItem(DS)!==null||ls.getItem(HS)!==null){ok=false;break}
    }
    check('Endurance: 200 alternating restore cycles',ok,'finalCycle='+(ls.getItem(D)?JSON.parse(ls.getItem(D)).cycle:'none'));
  });

  function writeFaultCase(kind){
    const store={[D]:JSON.stringify({seq:1}),[DR]:JSON.stringify({seq:0})};
    let enabled=true,getCount=0;
    const ls={
      getItem(k){
        if(enabled&&kind==='stage-read-corrupt'&&k===DS&&++getCount===1)return '{broken';
        if(enabled&&kind==='primary-read-corrupt'&&k===D&&store[D]&&JSON.parse(store[D]).seq===2)return '{broken';
        return Object.prototype.hasOwnProperty.call(store,k)?store[k]:null;
      },
      setItem(k,v){
        if(enabled&&kind==='stage-write'&&k===DS)throw Object.assign(new Error('stage write fail'),{name:'QuotaExceededError',code:22});
        if(enabled&&kind==='recovery-write'&&k===DR)throw new Error('recovery write fail');
        if(enabled&&kind==='primary-write'&&k===D)throw new Error('primary write fail');
        store[k]=String(v);
      },
      removeItem(k){
        if(enabled&&kind==='stage-remove'&&k===DS)throw new Error('stage remove fail');
        delete store[k];
      }
    };
    const faults=[];
    const write=fnFrom(html,'croppyWriteWithRecovery',{localStorage:ls,croppyStoredValue:stored,croppyNotifyStorageFault:e=>faults.push(String(e&&e.message||e)),DRAFT_STAGE_KEY:DS,HISTORY_STAGE_KEY:HS,JSON,Error});
    const result=write(D,DR,{seq:2},'draft');
    enabled=false;
    const recovered=[],win={};
    const read=fnFrom(html,'croppyReadWithRecovery',{localStorage:ls,croppyStoredValue:stored,croppyRecoveredKinds:recovered,window:win,DRAFT_STAGE_KEY:DS,HISTORY_STAGE_KEY:HS,Error});
    const got=read(D,DR,'draft');
    return {result,store,faults,recovered,got};
  }
  timed('web fault injection matrix',()=>{
    const kinds=['stage-write','stage-read-corrupt','recovery-write','primary-write','primary-read-corrupt','stage-remove'];
    const results={};let safe=true;
    for(const kind of kinds){
      const x=writeFaultCase(kind);results[kind]={result:x.result,seq:x.got&&x.got.seq,keys:Object.keys(x.store),faults:x.faults.length};
      if(kind==='stage-write'){if(x.result!==false||!x.got||x.got.seq!==1)safe=false}
      else if(!x.got||x.got.seq!==2)safe=false;
    }
    check('Fault injection: every Web save phase preserves a recoverable state',safe,JSON.stringify(results));
  });

  timed('500 verified backup commits',()=>{
    const state={seq:0,jobName:'現場0'},history=[{id:'h0'}];
    const ls=memoryStorage();
    const verify=fnFrom(html,'croppyVerifyLatestBeforeBackup',{state,history,localStorage:ls,DRAFT_KEY:D,HISTORY_KEY:H,croppyStoredValue:stored,JSON,Error});
    const write=fnFrom(html,'croppyWriteWithRecovery',{localStorage:ls,croppyStoredValue:stored,croppyNotifyStorageFault:()=>{},DRAFT_STAGE_KEY:DS,HISTORY_STAGE_KEY:HS,JSON,Error});
    const saveDraft=()=>write(D,DR,state,'draft');
    const saveHistoryStore=()=>write(H,HR,history,'history');
    const build=fnFrom(html,'croppyBuildBackup',{saveDraft,saveHistoryStore,croppyVerifyLatestBeforeBackup:verify,localStorage:ls,croppyIsDataKey:dataKey,croppyIsRecoveryKey:recoveryKey,Date,croppyBackupIntegrity:integrity,croppyValidateBackup:validate,Error});
    let ok=true,last=null;
    for(let i=0;i<500;i++){
      state.seq=i;state.jobName='現場'+i;history[0].id='h'+i;
      last=build();
      if(JSON.parse(last.storage[D]).seq!==i||JSON.parse(last.storage[H])[0].id!=='h'+i||validate(last)!==true){ok=false;break}
    }
    check('Endurance: 500 verified backup commits use latest data',ok&&last&&last.integrity&&last.integrity.value===integrity(last.storage),'last='+(last?JSON.parse(last.storage[D]).seq:'none'));
  });

  timed('huge backup tamper rejection',()=>{
    const tampered=JSON.parse(JSON.stringify(hugeBackup));
    tampered.storage[H]=tampered.storage[H].replace('"h4999"','"CORRUPTED"');
    let rejected=false;try{validate(tampered)}catch(e){rejected=String(e.message).includes('破損')}
    check('Integrity: tampered 5,000-row backup is rejected',rejected);
  });

  timed('5,000 iPhone native saves',()=>{
    const shape=fnFrom(iphone,'croppyNativeShapeOK',{draftPath:'DRAFT',historyPath:'HISTORY'});
    const files={'DRAFT':JSON.stringify({seq:-1})};
    const fm={
      fileExists:p=>Object.prototype.hasOwnProperty.call(files,p),
      readString:p=>files[p],
      writeString:(p,v)=>{files[p]=String(v)},
      remove:p=>{delete files[p]}
    };
    const save=fnFrom(iphone,'saveJSON',{fm,croppyNativeShapeOK:shape,console:{log:()=>{}},JSON,Error});
    for(let i=0;i<5000;i++)save('DRAFT',JSON.stringify({seq:i,payload:'n'.repeat(64)}));
    const cur=JSON.parse(files.DRAFT),prev=JSON.parse(files['DRAFT.prev']);
    check('Endurance: 5,000 iPhone native saves keep current and previous valid',cur.seq===4999&&prev.seq===4998&&!Object.prototype.hasOwnProperty.call(files,'DRAFT.tmp'),'current='+cur.seq+', prev='+prev.seq);
  });

  timed('iPhone native failure recovery',()=>{
    const shape=fnFrom(iphone,'croppyNativeShapeOK',{draftPath:'DRAFT',historyPath:'HISTORY'});
    const files={};let failFinal=true;
    const fm={
      fileExists:p=>Object.prototype.hasOwnProperty.call(files,p),
      readString:p=>files[p],
      writeString:(p,v)=>{if(p==='DRAFT'&&failFinal)throw new Error('final fail');files[p]=String(v)},
      remove:p=>{delete files[p]}
    };
    const save=fnFrom(iphone,'saveJSON',{fm,croppyNativeShapeOK:shape,console:{log:()=>{}},JSON,Error});
    save('DRAFT',JSON.stringify({seq:77}));
    const stageHeld=JSON.parse(files['DRAFT.tmp']).seq===77&&!files.DRAFT;
    failFinal=false;
    const recovered=[];
    const read=fnFrom(iphone,'readObject',{fm,croppyNativeShapeOK:shape,croppyNativeRecovered:recovered,draftPath:'DRAFT',historyPath:'HISTORY',JSON});
    const got=read('DRAFT',null);
    check('Fault injection: iPhone final-write loss recovers verified temp',stageHeld&&got&&got.seq===77&&JSON.parse(files.DRAFT).seq===77&&!files['DRAFT.tmp']&&recovered[0]==='draft');
  });

  timed('500 offline service-worker navigations',()=>{
    function SyncThen(ok,value){this.ok=ok;this.value=value}
    SyncThen.resolve=v=>v instanceof SyncThen?v:new SyncThen(true,v);
    SyncThen.reject=e=>new SyncThen(false,e);
    SyncThen.prototype.then=function(done,fail){try{if(this.ok)return done?SyncThen.resolve(done(this.value)):this;return fail?SyncThen.resolve(fail(this.value)):this}catch(e){return SyncThen.reject(e)}};
    SyncThen.prototype.catch=function(f){return this.then(null,f)};
    const handlers={},cached={kind:'index',clone(){return this}},map=new Map([['./index.html',cached]]);
    const caches={
      open:()=>SyncThen.resolve({addAll:()=>SyncThen.resolve(true),put:(k,v)=>{map.set(typeof k==='string'?k:k.url,v);return SyncThen.resolve(true)}}),
      keys:()=>SyncThen.resolve(['cross-gpt-croppy-v2-64-38']),
      delete:()=>SyncThen.resolve(true),
      match:k=>SyncThen.resolve(map.get(typeof k==='string'?k:k.url)||null)
    };
    const self={addEventListener:(n,f)=>handlers[n]=f,skipWaiting:()=>SyncThen.resolve(true),clients:{claim:()=>SyncThen.resolve(true)}};
    Function('self','caches','fetch','URL',sw)(self,caches,()=>SyncThen.reject(new Error('offline')),URL);
    let ok=true;
    for(let i=0;i<500;i++){
      let p=null;handlers.fetch({request:{method:'GET',mode:'navigate',url:'https://example.test/route/'+i},respondWith:x=>p=x});
      if(!p||!p.ok||p.value!==cached){ok=false;break}
    }
    check('Endurance: 500 offline navigations consistently fall back to cached index',ok);
  });

  check('Release guard: no final-test mutation to runtime version',VERSION==='v2.64.38'&&html.includes("appVersion:'v2.64.38'"));
}catch(e){
  check('Final test harness completed without unexpected exception',false,e&&e.stack?e.stack:String(e));
}

const pass=checks.filter(x=>x.ok).length,fail=checks.length-pass;
const lines=[
  'CROSS GPT クロッピー '+VERSION+' FINAL ENDURANCE TEST',
  'Commit: '+(process.env.GITHUB_SHA||'local'),
  'Result: '+pass+' PASS / '+fail+' FAIL',
  '',
  'Final endurance / fault-injection checks:'
];
for(const c of checks)lines.push('- '+c.name+': '+(c.ok?'PASS':'FAIL')+(c.detail?' ('+c.detail+')':''));
lines.push('','Timings:');
for(const t of timings)lines.push('- '+t.name+': '+t.ms+' ms');
lines.push('','Decision: '+(fail===0?'FINAL TEST PASS':'FINAL TEST FAILED'),'');
fs.writeFileSync('FINAL_TEST_REPORT.txt',lines.join('\n'));
console.log(lines.join('\n'));
if(fail)process.exit(1);
})();