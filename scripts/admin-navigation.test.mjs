import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const code=readFileSync('assets/js/member-navigation.js','utf8');
async function navigation({role='member',status='approved',signedIn=true}={}){
  const links={
    'index-admin-link':{hidden:true},
    'primary-admin-link':{hidden:true}
  };
  const document={
    readyState:'complete',
    getElementById(id){return links[id]||null}
  };
  const client={
    auth:{getSession:async()=>({data:{session:signedIn?{user:{id:'test-member'}}:null},error:null})},
    from(table){
      assert.equal(table,'member_profiles');
      const q={select(){return q},eq(){return q},
        maybeSingle:async()=>({data:{role,access_status:status},error:null})};
      return q;
    }
  };
  const window={IB_AUTH_CONFIG:{supabaseUrl:'https://example.supabase.co',supabaseAnonKey:'sb_publishable_fixture'},
    supabase:{createClient:()=>client}};
  vm.runInNewContext(code,{window,document,console});
  await new Promise(resolve=>setImmediate(resolve));
  return links;
}
test('approved admin sees both menu and main navigation shortcuts',async()=>{
  const l=await navigation({role:'admin',status:'approved'});
  assert.equal(l['index-admin-link'].hidden,false);
  assert.equal(l['primary-admin-link'].hidden,false);
});
test('members and suspended admins cannot see administrative links',async()=>{
  for(const input of [{role:'member',status:'approved'},{role:'admin',status:'suspended'},
    {role:'admin',status:'pending'},{role:'admin',status:'approved',signedIn:false}]){
    const l=await navigation(input);
    assert.equal(l['index-admin-link'].hidden,true);
    assert.equal(l['primary-admin-link'].hidden,true);
  }
});

async function betaAccess({role='member',status='approved',betaTester=false,betaColumn=true,catalog=true}={}){
  const events=[];
  const document={
    readyState:'complete',
    getElementById(){return null},
    querySelector(selector){return catalog&&selector==='.tool-grid'?{}:null},
    dispatchEvent(event){events.push(event.detail.allowed)}
  };
  const client={
    auth:{getSession:async()=>({data:{session:{user:{id:'test-member'}}},error:null})},
    from(table){
      assert.equal(table,'member_profiles');
      let columns='';
      const q={select(value){columns=value;return q},eq(){return q},
        maybeSingle:async()=>columns==='beta_tester'
          ?(betaColumn?{data:{beta_tester:betaTester},error:null}:{data:null,error:{message:'column member_profiles.beta_tester does not exist'}})
          :{data:{role,access_status:status},error:null}};
      return q;
    }
  };
  class CustomEvent{constructor(type,init){this.type=type;this.detail=init.detail}}
  const window={IB_AUTH_CONFIG:{supabaseUrl:'https://example.supabase.co',supabaseAnonKey:'sb_publishable_fixture'},
    supabase:{createClient:()=>client}};
  vm.runInNewContext(code,{window,document,console,CustomEvent});
  await new Promise(resolve=>setImmediate(resolve));
  return {global:window.IB_BETA_ACCESS,events};
}
test('beta access goes to the approved owner and owner-marked testers only',async()=>{
  assert.deepEqual(await betaAccess({role:'admin'}),{global:true,events:[true]});
  assert.deepEqual(await betaAccess({betaTester:true}),{global:true,events:[true]});
  for(const input of [{},{betaTester:true,status:'suspended'},{betaTester:true,status:'pending'},{role:'admin',status:'suspended'},{betaColumn:false,betaTester:true}]){
    assert.deepEqual(await betaAccess(input),{global:false,events:[false]},JSON.stringify(input));
  }
  assert.deepEqual(await betaAccess({role:'admin',catalog:false}),{global:undefined,events:[]},'pages without a catalog do not publish');
});
