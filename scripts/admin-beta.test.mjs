import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const page=fs.readFileSync('admin.html','utf8').replace(/<script\b[\s\S]*?<\/script>/gi,'');
const source=fs.readFileSync('assets/js/member-access.js','utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,10));
const owner={id:'owner-id',email:'owner@example.invalid',full_name:'Owner',role:'admin',access_status:'approved',requested_at:'2026-10-01T00:00:00Z'};
const member={id:'member-id',email:'tester@example.invalid',full_name:'Tester',role:'member',access_status:'approved',requested_at:'2026-10-02T00:00:00Z'};

async function openAdmin({betaColumn=true,betaTester=false,updateError=null,user={id:'owner-id'},profile=owner,profileError=null,feedback=[],feedbackError=null,noClient=false}={}){
  const updates=[],feedbackOps=[];
  const dom=new JSDOM(page,{url:'https://jecaaudio.github.io/InvestorBlueprint/admin.html',runScripts:'outside-only'});
  const w=dom.window;
  w.IB_AUTH_CONFIG={supabaseUrl:'https://example.supabase.co',supabaseAnonKey:'sb_publishable_fixture_key_long_enough'};
  const client={
    auth:{getUser:async()=>({data:{user},error:null}),onAuthStateChange(){},signOut:async()=>({error:null})},
    from(table){
      if(table==='member_feedback'){
        const filters={};let op='select';
        const result=()=>{
          if(op!=='select')return {error:null};
          if(feedbackError)return {data:null,error:feedbackError};
          return {data:feedback.filter(x=>!filters.status||x.status===filters.status),error:null};
        };
        const f={
          select(){return f},order(){return f},limit(){return f},
          eq(key,value){filters[key]=value;if(op!=='select')feedbackOps.push({op,...filters});return f},
          update(values){op='update';filters.values=values;return f},
          delete(){op='delete';return f},
          then(resolve,reject){return Promise.resolve(result()).then(resolve,reject)}
        };
        return f;
      }
      assert.equal(table,'member_profiles');
      let columns='',pending=null;
      const q={
        select(value){columns=value;return q},
        eq(){return pending?Promise.resolve({error:updateError}):q},
        single:async()=>profileError?{data:null,error:profileError}:{data:profile,error:null},
        order:async()=>betaColumn||!columns.includes('beta_tester')
          ?{data:[owner,{...member,...(betaColumn?{beta_tester:betaTester}:{})}],error:null}
          :{data:null,error:{message:'column member_profiles.beta_tester does not exist'}},
        update(values){pending=values;updates.push(values);return q},
        in:async()=>({data:[owner,member],error:null})
      };
      return q;
    }
  };
  if(!noClient)w.supabase={createClient:()=>client};
  w.confirm=()=>true;
  const visits=[];w.IBNavigate=url=>visits.push(url);
  w.eval(source);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  await tick();
  return {dom,updates,feedbackOps,visits:[...new Set(visits)]};
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

test('administration stays invisible unless an approved administrator is confirmed',async()=>{
  const hidden=d=>['admin-hero','admin-root'].every(id=>d.getElementById(id).hidden);
  let r=await openAdmin({user:null,profile:null});
  assert.deepEqual(r.visits,['login.html?returnTo=%2FInvestorBlueprint%2Fadmin.html']);assert.ok(hidden(r.dom.window.document));r.dom.window.close();
  r=await openAdmin({user:{id:'member-id'},profile:member});
  assert.deepEqual(r.visits,['account.html']);assert.ok(hidden(r.dom.window.document));r.dom.window.close();
  r=await openAdmin({profile:{...owner,access_status:'suspended'}});
  assert.deepEqual(r.visits,['account.html']);r.dom.window.close();
  r=await openAdmin({profileError:{message:'network'}});
  const d=r.dom.window.document;
  assert.equal(r.visits.length,0);assert.ok(hidden(d));assert.equal(d.getElementById('admin-denied').hidden,false);
  assert.doesNotMatch(d.getElementById('admin-denied').textContent,/administra/i);r.dom.window.close();
  r=await openAdmin();
  assert.equal(r.dom.window.document.getElementById('admin-hero').hidden,false);assert.equal(r.dom.window.document.getElementById('admin-checking').hidden,true);
  r.dom.window.close();
});

test('the owner reads member feedback, marks it reviewed and deletes it',async()=>{
  const feedback=[
    {id:7,user_id:'member-id',tool:'flip',page:'/InvestorBlueprint/tools/flip-calculator.html',message:'<img src=x onerror=alert(1)> great tool',language:'es',status:'new',created_at:'2026-10-21T12:00:00Z'},
    {id:8,user_id:'gone-id',tool:'general',page:'',message:'old note',language:'en',status:'reviewed',created_at:'2026-10-20T12:00:00Z'}
  ];
  const {dom,feedbackOps}=await openAdmin({feedback});
  const d=dom.window.document;
  assert.equal(d.getElementById('admin-feedback').hidden,false);
  let rows=d.querySelectorAll('#feedback-list .feedback-row');
  assert.equal(rows.length,1,'only new comments by default');
  assert.match(rows[0].textContent,/Flip/);
  assert.match(rows[0].textContent,/tester@example\.invalid/);
  assert.equal(rows[0].querySelector('img'),null,'member text is never parsed as HTML');
  assert.match(rows[0].querySelector('.feedback-text').textContent,/<img src=x/);
  const filter=d.getElementById('feedback-filter');
  filter.value='all';filter.dispatchEvent(new dom.window.Event('change'));await tick();
  rows=d.querySelectorAll('#feedback-list .feedback-row');
  assert.equal(rows.length,2);
  assert.match(rows[1].textContent,/Miembro eliminado/);
  rows[0].querySelector('.btn-primary').click();await tick();
  rows=d.querySelectorAll('#feedback-list .feedback-row');
  [...rows[1].querySelectorAll('button')].find(b=>b.textContent==='Eliminar').click();await tick();
  assert.equal(JSON.stringify(feedbackOps),JSON.stringify([{op:'update',values:{status:'reviewed'},id:7},{op:'delete',id:8}]));
  dom.window.close();
});

test('without the feedback migration the panel explains what to apply',async()=>{
  const {dom}=await openAdmin({feedbackError:{code:'PGRST205',message:"Could not find the table 'public.member_feedback'"}});
  const note=dom.window.document.getElementById('feedback-message');
  assert.match(note.textContent,/20261021140000_member_feedback\.sql/);
  assert.equal(note.dataset.state,'warning');
  dom.window.close();
});

test('feedback stays hidden from anyone who is not the confirmed administrator',async()=>{
  const {dom}=await openAdmin({profile:member,user:{id:'member-id'}});
  assert.equal(dom.window.document.getElementById('admin-feedback').hidden,true);
  dom.window.close();
});

test('when sign-in cannot start the admin page shows a recovery message, not an endless check',async()=>{
  const {dom}=await openAdmin({noClient:true});
  const d=dom.window.document;
  assert.equal(d.getElementById('admin-checking').hidden,true);
  assert.equal(d.getElementById('admin-denied').hidden,false);
  assert.equal(d.getElementById('admin-root').hidden,true);
  assert.equal(d.getElementById('admin-hero').hidden,true);
  dom.window.close();
});
