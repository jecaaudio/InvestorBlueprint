import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('assets/js/member-access.js','utf8');

async function runRecovery({secondsLeft=3600,updateErrors=[],missingSession=false,refreshError=null}={}){
  const fields=new Map();
  function field(id){
    if(!fields.has(id)){
      const handlers={};
      fields.set(id,{
        id,hidden:id.endsWith('-form')||id==='portal-message'||id==='account-summary',
        textContent:'',value:id==='new-password'?'StrongTestPassword2026!':'',
        dataset:{},handlers,reset(){this.value='';},
        querySelectorAll(){return[]},
        setAttribute(){},
        addEventListener(name,callback){handlers[name]=callback;}
      });
    }
    return fields.get(id);
  }
  let onReady;
  const document={
    documentElement:{lang:'es'},
    getElementById(id){return id==='admin-root'?null:field(id)},
    addEventListener(name,callback){if(name==='DOMContentLoaded')onReady=callback}
  };
  const currentSession={access_token:'TEST_ONLY_NOT_A_REAL_TOKEN',user:{id:'example'},expires_at:Math.floor(Date.now()/1000)+secondsLeft};
  const stats={refresh:0,update:0,signedOut:0};
  const client={
    auth:{
      onAuthStateChange(callback){callback('PASSWORD_RECOVERY',currentSession);return {data:{subscription:{unsubscribe(){}}}};},
      async getSession(){return {data:{session:missingSession?null:currentSession},error:null}},
      async refreshSession(){stats.refresh++;return refreshError?{data:{session:null},error:refreshError}:{data:{session:currentSession},error:null}},
      async getUser(){return {data:{user:missingSession?null:{id:'example'}},error:null}},
      async updateUser(){stats.update++;const error=updateErrors.shift()||null;return {error}},
      async signOut(){stats.signedOut++;return {error:null}}
    },
    from(){return {select(){return this},eq(){return this},async single(){return {data:{id:'example',email:'tester@example.com',role:'admin',access_status:'approved'},error:null}}}}
  };
  const window={
    IB_AUTH_CONFIG:{supabaseUrl:'https://example.supabase.co',supabaseAnonKey:'sb_publishable_mock_not_sensitive_key'},
    supabase:{createClient:()=>client},
    location:{href:'https://example.github.io/InvestorBlueprint/login.html#type=recovery',hash:'#type=recovery',search:'',pathname:'/InvestorBlueprint/login.html',origin:'https://example.github.io',assign(){}}
  };
  const sandbox={window,document,location:window.location,URLSearchParams,URL,Date,console};
  vm.runInNewContext(source,sandbox,{filename:'member-access.js'});
  assert.equal(typeof onReady,'function','DOM listener must be installed');
  await onReady();
  const before={visible:!field('new-password-form').hidden};
  const handler=field('new-password-form').handlers.submit;
  assert.equal(typeof handler,'function');
  await handler({preventDefault(){}});
  return {before,after:{recover:!field('recover-form').hidden,login:!field('login-form').hidden,message:field('portal-message').textContent},stats};
}

test('recovery event arriving before DOM is captured and permits saving a fresh password',async()=>{
  const r=await runRecovery();
  assert.equal(r.before.visible,true);
  assert.equal(r.stats.update,1);
  assert.equal(r.stats.refresh,0);
  assert.equal(r.stats.signedOut,1);
  assert.equal(r.after.login,true);
  assert.match(r.after.message,/Contraseña actualizada/);
});
test('near-expired recovery access token is refreshed before changing password',async()=>{
  const r=await runRecovery({secondsLeft:25});
  assert.equal(r.stats.refresh,1);
  assert.equal(r.stats.update,1);
  assert.match(r.after.message,/Contraseña actualizada/);
});
test('one expired JWT during save triggers at most one refreshed retry',async()=>{
  const r=await runRecovery({updateErrors:[{status:401,message:'JWT expired'}]});
  assert.equal(r.stats.refresh,1);
  assert.equal(r.stats.update,2);
  assert.equal(r.stats.signedOut,1);
});
test('missing recovery session cannot change password and offers to request a new link',async()=>{
  const r=await runRecovery({missingSession:true});
  assert.equal(r.stats.update,0);
  assert.equal(r.after.recover,true);
  assert.match(r.after.message,/Solicita un nuevo correo/);
});
test('failed token refresh cannot change password and returns to recovery',async()=>{
  const r=await runRecovery({secondsLeft:15,refreshError:{message:'refresh token expired'}});
  assert.equal(r.stats.update,0);
  assert.equal(r.after.recover,true);
});
