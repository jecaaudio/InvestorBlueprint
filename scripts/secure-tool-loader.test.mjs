import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const script=fs.readFileSync('assets/js/secure-tool-loader.js','utf8');
const validHtml='<!doctype html><html><head><title>Protected</title></head><body>'+
  '<a class="tool-logo" href="../index.html">InvestorBlueprint</a><header class="top"><div>Sale report</div></header>'+
  '<main>'+('Secure content '.repeat(95))+'</main></body></html>';

async function run({signedIn=true,httpStatus=200,prefError=false,prefs=null,tool='flip',userId='user_2',responseHtml=validHtml,blockedStorage=false,sessionChangedBeforeRender=false,eventAfterRender=null}={}){
  let html='',redirect='',signedOut=0,requests=0;
  let shownMessage='',loginLinkHidden=true,authHeader='';
  const cache=new Map([
    ['ib_display_name','Previous customer'],
    ['ib_company_name','Former customer LLC'],
    ['ib_document_language','en'],
    ['ib_report_detail','summary']
  ]);
  const localStorage={setItem(key,value){if(blockedStorage)throw Error('Storage disabled');cache.set(key,String(value))},getItem(key){return cache.get(key)||null}};
  const session=signedIn?{access_token:'dummy_access_token',user:{id:userId}}:null;
  let sessionReads=0,authListener=null;
  const auth={
    async getSession(){sessionReads++;return {data:{session:sessionChangedBeforeRender&&sessionReads>1?null:session},error:null}},
    onAuthStateChange(listener){authListener=listener;return {data:{subscription:{unsubscribe(){}}}}},
    async signOut(){signedOut++;return {error:null}}
  };
  const client={auth,from(table){
    assert.equal(table,'member_preferences');
    const builder={
      select(){return builder},
      eq(column,value){assert.equal(column,'user_id');assert.equal(value,userId);return builder},
      async maybeSingle(){return {data:prefs,error:prefError?{message:'Network or RLS failure'}:null}}
    };
    return builder;
  }};
  const link={hidden:true,href:''};
  const status={textContent:''};
  const document={
    currentScript:{dataset:{tool,root:'../',assetBase:'tools/'}},
    documentElement:{classList:{remove(){}}},
    body:{replaceChildren(){html=''}},
    getElementById(id){return id==='secure-loading-message'?status:id==='secure-login-link'?link:null},
    open(){},
    write(value){html=value},
    close(){}
  };
  const location={href:'https://jecaaudio.github.io/InvestorBlueprint/tools/flip-calculator.html',
    pathname:'/InvestorBlueprint/tools/flip-calculator.html',
    search:'',
    replace(url){redirect=url}};
  const window={location,IB_AUTH_CONFIG:{supabaseUrl:'https://example.supabase.co',supabaseAnonKey:'sb_publishable_dummy'},
    supabase:{createClient:()=>client}};
  const fetch=async (url,opts)=>{
    requests++;authHeader=opts.headers.Authorization;
    assert.ok(url.endsWith('ib-protected-tools?tool='+tool));
    return {
      status:httpStatus,ok:httpStatus===200,
      async text(){return responseHtml}
    };
  };
  await vm.runInNewContext(script,{window,document,fetch,URL,localStorage,
    console:{error(){},warn(){}}},{filename:'secure-tool-loader.js'});
  if(eventAfterRender)authListener?.(eventAfterRender.event,eventAfterRender.session);
  shownMessage=status.textContent;
  loginLinkHidden=link.hidden;
  return {html,redirect,signedOut,requests,authHeader,cache,shownMessage,loginLinkHidden};
}

test('a signed-out person cannot fetch protected calculator HTML',async()=>{
  const r=await run({signedIn:false});
  assert.equal(r.requests,0);
  assert.equal(r.html,'');
  assert.match(r.redirect,/login.html\?returnTo=/);
});
test('a server-side denial returns no calculator HTML',async()=>{
  const r=await run({httpStatus:403});
  assert.equal(r.requests,1);
  assert.equal(r.html,'');
  assert.equal(r.loginLinkHidden,false);
  assert.match(r.shownMessage,/aprobación/);
});
test('a revoked JWT logs out and redirects before rendering',async()=>{
  const r=await run({httpStatus:401});
  assert.equal(r.signedOut,1);
  assert.equal(r.html,'');
  assert.match(r.redirect,/login.html/);
});
test('failed preference lookup never reuses a previous member name or company',async()=>{
  const r=await run({prefError:true});
  assert.ok(r.html.startsWith('<!doctype html>'));
  assert.equal(r.cache.get('ib_display_name'),'');
  assert.equal(r.cache.get('ib_company_name'),'');
  assert.equal(r.cache.get('ib_document_language'),'es');
  assert.equal(r.cache.get('ib_report_detail'),'detailed');
});
test('only settings of the currently authenticated member reach reports',async()=>{
  const r=await run({prefs:{display_name:'Current member',company_name:'New LLC',
    document_language:'en',report_detail:'summary',notes_detail:'detailed'}});
  assert.equal(r.cache.get('ib_display_name'),'Current member');
  assert.equal(r.cache.get('ib_company_name'),'New LLC');
  assert.equal(r.cache.get('ib_document_language'),'en');
  assert.equal(r.cache.get('ib_report_detail'),'summary');
  assert.equal(r.authHeader,'Bearer dummy_access_token');
  assert.ok(r.html.includes('<base href="https://jecaaudio.github.io/InvestorBlueprint/tools/tools/">'));
});

const sellerHtml=validHtml.replace('</head>',"<script>const storageKey='seller-net-multistate-2026-v1';</script></head>");
test('seller financial state uses separate member namespaces and never adopts unowned legacy data',async()=>{
  const a=await run({tool:'seller-net',userId:'member_a',responseHtml:sellerHtml});
  const b=await run({tool:'seller-net',userId:'member_b',responseHtml:sellerHtml});
  const key=html=>JSON.parse(html.match(/const storageKey=("[^"]+");/)[1]);
  const store=new Map([['seller-net-multistate-2026-v1','legacy private data'],[key(a.html),'member A figures']]);
  assert.notEqual(key(a.html),key(b.html));assert.equal(store.get(key(b.html)),undefined);
  assert.equal(store.get(key(a.html)),'member A figures');assert.equal(store.get('seller-net-multistate-2026-v1'),'legacy private data');
});
test('changed seller storage contract fails closed instead of sharing financial state',async()=>{
  const r=await run({tool:'seller-net'});assert.equal(r.html,'');assert.match(r.shownMessage,/No se pudo/);
});
test('per-document export preferences work with blocked storage and safely escape markup',async()=>{
  const name="Analyst $& $' $` </script><script>unsafe()</script>";
  const r=await run({blockedStorage:true,prefs:{display_name:name,company_name:'Current LLC',document_language:'en',interface_language:'en'}});
  const json=r.html.match(/IB_REPORT_PREFERENCES=Object.freeze\((.*?)\);/)[1];
  assert.doesNotMatch(json,/<script>|<\/script>/);const snapshot=JSON.parse(json);
  assert.equal(snapshot.ib_display_name,name);assert.equal(snapshot.preferredLanguage,'en');assert.equal(snapshot.ib_document_language,'en');
});
test('report readers use their document snapshot despite another account changing local storage',()=>{
  const current={ib_display_name:'Member A',ib_document_language:'es'};
  const scope={window:{IB_REPORT_PREFERENCES:current},localStorage:{getItem(){return 'Member B'}}};
  const arv=fs.readFileSync('tools/arv/arv.js','utf8');
  const arvPref=arv.slice(arv.indexOf('function pref('),arv.indexOf('function docEnglish('));
  vm.createContext(scope);vm.runInContext(arvPref,scope);
  assert.equal(vm.runInContext("pref('ib_display_name','')",scope),'Member A');
  const seller=fs.readFileSync('calculadora-venta/print-report.js','utf8');
  const sellerPref=seller.slice(seller.indexOf(' const setting='),seller.indexOf(' const en='));
  vm.runInContext(sellerPref,scope);
  assert.equal(vm.runInContext("setting('ib_display_name','')",scope),'Member A');
});
test('sign-out or switching accounts clears an already open calculator document',async()=>{
  for(const eventAfterRender of [{event:'SIGNED_OUT',session:null},{event:'SIGNED_IN',session:{user:{id:'member_b'}}}]){
    const r=await run({eventAfterRender});assert.equal(r.html,'');assert.match(r.redirect,/login.html/);
  }
});
test('an in-flight calculator response never renders after the session changes',async()=>{
  const r=await run({sessionChangedBeforeRender:true});assert.equal(r.html,'');assert.match(r.redirect,/login.html/);
});

test('approved protected calculators restore transparent favicon and navigation logo',async()=>{
  const r=await run();
  assert.match(r.html,/rel="icon" type="image\/svg\+xml"/);
  assert.match(r.html,/apple-touch-icon\.png/);
  assert.match(r.html,/manifest\.webmanifest/);
  assert.match(r.html,/class="ib-tool-brand-mark"/);
  assert.match(r.html,/assets\/brand\/favicon\.svg/);
});
test('protected seller net receives branding without exposing it to unauthorized members',async()=>{
  const approved=await run({tool:'seller-net',responseHtml:sellerHtml});
  assert.match(approved.html,/class="ib-seller-brand"/);
  const denied=await run({tool:'seller-net',httpStatus:403});
  assert.equal(denied.html,'');
});
