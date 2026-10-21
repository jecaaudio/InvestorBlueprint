import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const page=fs.readFileSync('admin.html','utf8').replace(/<script\b[\s\S]*?<\/script>/gi,'');
const source=fs.readFileSync('assets/js/member-access.js','utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,10));
const owner={id:'owner-id',email:'owner@example.invalid',full_name:'Owner',role:'admin',access_status:'approved',requested_at:'2026-10-01T00:00:00Z'};
const member={id:'member-id',email:'tester@example.invalid',full_name:'Tester',role:'member',access_status:'approved',requested_at:'2026-10-02T00:00:00Z'};

async function openAdmin({betaColumn=true,betaTester=false,updateError=null}={}){
  const updates=[];
  const dom=new JSDOM(page,{url:'https://jecaaudio.github.io/InvestorBlueprint/admin.html',runScripts:'outside-only'});
  const w=dom.window;
  w.IB_AUTH_CONFIG={supabaseUrl:'https://example.supabase.co',supabaseAnonKey:'sb_publishable_fixture_key_long_enough'};
  const client={
    auth:{getUser:async()=>({data:{user:{id:owner.id}},error:null}),onAuthStateChange(){},signOut:async()=>({error:null})},
    from(table){
      assert.equal(table,'member_profiles');
      let columns='',pending=null;
      const q={
        select(value){columns=value;return q},
        eq(){return pending?Promise.resolve({error:updateError}):q},
        single:async()=>({data:owner,error:null}),
        order:async()=>betaColumn||!columns.includes('beta_tester')
          ?{data:[owner,{...member,...(betaColumn?{beta_tester:betaTester}:{})}],error:null}
          :{data:null,error:{message:'column member_profiles.beta_tester does not exist'}},
        update(values){pending=values;updates.push(values);return q}
      };
      return q;
    }
  };
  w.supabase={createClient:()=>client};
  w.confirm=()=>true;
  w.eval(source);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  await tick();
  return {dom,updates};
}

test('owner marks and unmarks a beta tester from the admin panel',async()=>{
  const {dom,updates}=await openAdmin();
  const d=dom.window.document;
  const rows=d.querySelectorAll('#member-list .member-row');
  assert.equal(rows.length,2);
  assert.equal(rows[0].querySelector('.member-beta'),null,'the owner row has no checkbox');
  assert.match(rows[0].textContent,/acceso beta/);
  const box=rows[1].querySelector('.member-beta input');
  assert.ok(box&&!box.disabled&&!box.checked);
  box.checked=true;box.dispatchEvent(new dom.window.Event('change'));await tick();
  assert.equal(JSON.stringify(updates),JSON.stringify([{beta_tester:true}]));
  assert.match(d.getElementById('admin-message').textContent,/Acceso beta activado para tester@example.invalid/);
  box.checked=false;box.dispatchEvent(new dom.window.Event('change'));await tick();
  assert.equal(JSON.stringify(updates[1]),JSON.stringify({beta_tester:false}));
  dom.window.close();
});

test('a failed beta update reverts the checkbox and shows the error',async()=>{
  const {dom}=await openAdmin({updateError:{message:'permission denied'}});
  const box=dom.window.document.querySelector('#member-list .member-beta input');
  box.checked=true;box.dispatchEvent(new dom.window.Event('change'));await tick();
  assert.equal(box.checked,false);
  assert.match(dom.window.document.getElementById('admin-message').textContent,/permission denied/);
  dom.window.close();
});

test('without the migration the panel still lists members and explains what to apply',async()=>{
  const {dom,updates}=await openAdmin({betaColumn:false});
  const d=dom.window.document;
  assert.equal(d.querySelectorAll('#member-list .member-row').length,2);
  const box=d.querySelector('#member-list .member-beta input');
  assert.ok(box.disabled);
  assert.match(d.getElementById('admin-message').textContent,/20261021120000_beta_testers\.sql/);
  assert.equal(d.getElementById('admin-message').dataset.state,'warning');
  assert.equal(updates.length,0);
  dom.window.close();
});
