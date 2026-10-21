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
