import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,readdirSync} from 'node:fs';

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
test('no page menu ever links to administration, not even for the approved owner',async()=>{
  const l=await navigation({role:'admin',status:'approved'});
  assert.equal(l['index-admin-link'].hidden,true,'menu script never reveals admin links');
  assert.doesNotMatch(code,/admin-link|admin\.html/);
  const pages=['index.html','login.html','account.html','pricing.html','privacy.html','terms.html','404.html',
    ...readdirSync('calculadoras').filter(f=>f.endsWith('.html')).map(f=>'calculadoras/'+f)];
  for(const page of pages){
    const html=readFileSync(page,'utf8');
    const menus=[...html.matchAll(/<header[\s\S]*?<\/header>/gi)].map(m=>m[0]).join('');
    assert.doesNotMatch(menus,/admin\.html|Administraci[oó]n/,page+' header');
  }
  // The only way in is the button inside My profile, shown to the approved owner.
  const account=readFileSync('account.html','utf8');
  assert.equal((account.match(/href="admin\.html"/g)||[]).length,1);
  assert.match(account,/id="account-admin-button"[^>]*hidden/);
  assert.match(readFileSync('assets/js/account-settings.js','utf8'),/isAdmin=profile\.role==='admin'&&profile\.access_status==='approved'/);
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
