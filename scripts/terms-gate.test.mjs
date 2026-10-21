import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const page=fs.readFileSync('account.html','utf8').replace(/<script\b[\s\S]*?<\/script>/gi,'');
const tick=()=>new Promise(resolve=>setTimeout(resolve,10));

async function openAccount({terms={terms_accepted_at:null,terms_version:null},termsError=null,rpcError=null,search=''}={}){
  const dom=new JSDOM(page,{url:'https://jecaaudio.github.io/InvestorBlueprint/account.html'+search,runScripts:'outside-only'});
  const w=dom.window,calls=[],visits=[];
  const user={id:'member-id',email:'member@example.invalid'};
  w.IB_AUTH_CONFIG={supabaseUrl:'https://example.supabase.co',supabaseAnonKey:'sb_publishable_fixture_key_long_enough',termsVersion:'2026-10-21'};
  w.IBNavigate=url=>visits.push(url);
  w.supabase={createClient:()=>({
    auth:{getUser:async()=>({data:{user},error:null}),signOut:async()=>({error:null})},
    rpc:async(name,args)=>{calls.push({name,args});return rpcError?{data:null,error:rpcError}:{data:'2026-10-21T16:00:00Z',error:null}},
    from(table){
      let columns='';
      const q={select(value){columns=value;return q},eq(){return q},upsert(){return q},
        single:async()=>({data:{id:user.id,email:user.email,role:'member',access_status:'approved'},error:null}),
        maybeSingle:async()=>table==='member_profiles'&&columns.includes('terms_accepted_at')
          ?{data:termsError?null:terms,error:termsError}:{data:null,error:null}};
      return q;
    }
  })};
  w.eval(fs.readFileSync('assets/js/account-settings.js','utf8'));
  await tick();
  return {dom,d:w.document,w,calls,visits};
}
const submit=async(w,d)=>{d.getElementById('account-terms-form').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick()};

test('an existing member without an acceptance must accept before using the account',async()=>{
  const {dom,d,w,calls}=await openAccount();
  assert.equal(d.getElementById('account-terms').hidden,false);
  assert.equal(d.getElementById('account-content').hidden,true,'settings stay hidden until accepted');
  await submit(w,d);
  assert.equal(calls.length,0);
  assert.match(d.getElementById('account-terms-message').textContent,/Marca la casilla/);
  d.getElementById('account-terms-accept').checked=true;
  await submit(w,d);
  assert.equal(JSON.stringify(calls),JSON.stringify([{name:'ib_accept_terms',args:{p_version:'2026-10-21'}}]));
  assert.equal(d.getElementById('account-terms').hidden,true);
  assert.equal(d.getElementById('account-content').hidden,false);
  dom.window.close();
});

test('a member who accepted an older version accepts the new one; a failed save is explained',async()=>{
  const {dom,d,w}=await openAccount({terms:{terms_accepted_at:'2026-01-01T00:00:00Z',terms_version:'2026-01-01'},rpcError:{message:'network'}});
  assert.equal(d.getElementById('account-terms').hidden,false);
  d.getElementById('account-terms-accept').checked=true;
  await submit(w,d);
  assert.match(d.getElementById('account-terms-message').textContent,/No pudimos guardar/);
  assert.equal(d.getElementById('account-content').hidden,true);
  dom.window.close();
});

test('after accepting, the member goes back to the calculator that sent them, never elsewhere',async()=>{
  let r=await openAccount({search:'?returnTo='+encodeURIComponent('/InvestorBlueprint/tools/flip-calculator.html')});
  r.d.getElementById('account-terms-accept').checked=true;await submit(r.w,r.d);
  assert.deepEqual(r.visits,['/InvestorBlueprint/tools/flip-calculator.html']);
  r.dom.window.close();
  for(const bad of ['https://evil.example/','//evil.example/x','/InvestorBlueprint/admin.html','/InvestorBlueprint/tools/../admin.html']){
    r=await openAccount({search:'?returnTo='+encodeURIComponent(bad)});
    r.d.getElementById('account-terms-accept').checked=true;await submit(r.w,r.d);
    assert.deepEqual(r.visits,[],bad);
    assert.equal(r.d.getElementById('account-content').hidden,false);
    r.dom.window.close();
  }
});

test('accepted members and sites without the migration see the account directly',async()=>{
  for(const options of [{terms:{terms_accepted_at:'2026-10-21T10:00:00Z',terms_version:'2026-10-21'}},{termsError:{message:'column member_profiles.terms_accepted_at does not exist'}}]){
    const {dom,d}=await openAccount(options);
    assert.equal(d.getElementById('account-terms').hidden,true);
    assert.equal(d.getElementById('account-content').hidden,false);
    dom.window.close();
  }
});

test('the terms version is the same in the configuration and the signup form fallback',()=>{
  const configured=/termsVersion:\s*"(\d{4}-\d{2}-\d{2})"/.exec(fs.readFileSync('assets/js/member-auth-config.js','utf8'))?.[1];
  const fallback=/cfg\.termsVersion\|\|'(\d{4}-\d{2}-\d{2})'/.exec(fs.readFileSync('assets/js/member-access.js','utf8'))?.[1];
  assert.ok(configured);assert.equal(configured,fallback);
});
