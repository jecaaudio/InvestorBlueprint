import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
const code=fs.readFileSync('assets/js/session-security.js','utf8');
const key='sb-ppeyoovykxomxinumibk-auth-token',policy=key+'-ib-lifetime';
const tick=()=>new Promise(resolve=>setTimeout(resolve,20));
function open({failure=false,hang=false,age=0,idle=0}={}){
 const dom=new JSDOM('<html lang="es"><head></head><body><main>PRIVATE ACCOUNT DATA</main></body></html>',{url:'https://jecaaudio.github.io/InvestorBlueprint/account.html',runScripts:'outside-only'});
 const w=dom.window;let now=1900000000000,listener;const visits=[],calls=[];
 w.Date.now=()=>now;w.IB_SITE={supabaseProjectRef:'ppeyoovykxomxinumibk'};w.IBNavigate=url=>visits.push(url);
 const script=w.document.createElement('script');script.src='https://jecaaudio.github.io/InvestorBlueprint/assets/js/session-security.js';
 Object.defineProperty(w.document,'currentScript',{value:script});
 const session={user:{id:'member-a'},expires_at:now/1000+3600,access_token:'fixture',refresh_token:'fixture'};
 w.localStorage.setItem(key,JSON.stringify(session));
 w.localStorage.setItem(policy,JSON.stringify({userId:'member-a',started:now-age,lastActive:now-idle}));
 w.localStorage.setItem('ib_display_name','PRIVATE NAME');w.localStorage.setItem('sb-unrelated-auth-token','keep');
 const client={auth:{getSession:async()=>({data:{session}}),getUser:async()=>({data:{user:session.user}}),
  onAuthStateChange(fn){listener=fn},stopAutoRefresh(){calls.push('stop')},
  async signOut(options){calls.push(options);if(hang)return new Promise(()=>{});if(failure)throw Error('offline');return {error:null}}}};
 const nativeTimeout=w.setTimeout.bind(w);w.setTimeout=(fn,ms)=>nativeTimeout(fn,ms===4000?5:ms);
 w.eval(code);w.IBSessionSecurity.attach(client);
 return {dom,w,client,visits,calls,guard:w.IBSessionSecurity,advance:ms=>{now+=ms},event:(...args)=>listener(...args)};
}
test('logout redacts private data immediately, revokes the current session and clears only this project',async()=>{
 const r=open();await tick();const job=r.guard.signOut();
 assert.doesNotMatch(r.w.document.body.textContent,/PRIVATE ACCOUNT DATA/);
 await job;assert.equal(r.w.localStorage.getItem(key),null);assert.equal(r.w.localStorage.getItem('ib_display_name'),null);
 assert.equal(r.w.localStorage.getItem('sb-unrelated-auth-token'),'keep');
 assert.equal(r.calls[0].scope,'local');assert.ok(r.calls.includes('stop'));
 assert.match(r.visits.at(-1),/login.html\?reason=login$/);r.w.close();
});
test('failed and hung logout requests still lock the browser and explain unconfirmed server revocation',async()=>{
 for(const options of [{failure:true},{hang:true}]){
  const r=open(options);await tick();await r.guard.signOut();
  assert.equal(r.w.localStorage.getItem(key),null);assert.equal(r.guard.isLocked(),true);
  assert.match(r.visits.at(-1),/reason=local-signout$/);r.w.close();
 }
});
test('idle timeout is checked on resume before another interaction can extend the session',async()=>{
 const r=open();await tick();r.advance(15*60*1000+1);assert.equal(r.guard.check(),false);await tick();
 assert.equal(r.w.localStorage.getItem(key),null);assert.match(r.visits.at(-1),/reason=expired$/);r.w.close();
});
test('refresh and navigation cannot reset the eight-hour absolute session limit',async()=>{
 const r=open({age:8*60*60*1000-1000});await tick();
 r.event('TOKEN_REFRESHED',{user:{id:'member-a'}});
 r.advance(1001);assert.equal(r.guard.check(),false);await tick();
 assert.match(r.visits.at(-1),/reason=expired$/);r.w.close();
});
test('logout in another tab removes this private view and never invokes another global logout',async()=>{
 const r=open();await tick();r.w.localStorage.removeItem(key);r.w.localStorage.removeItem(policy);
 r.w.dispatchEvent(new r.w.StorageEvent('storage',{key,newValue:null}));await tick();
 assert.doesNotMatch(r.w.document.body.textContent,/PRIVATE ACCOUNT DATA/);
 assert.equal(r.calls.filter(x=>typeof x==='object').length,0);assert.ok(r.visits.length);r.w.close();
});
test('Back cannot restore a cached private account after the stored session was removed',async()=>{
 const r=open();await tick();r.w.localStorage.removeItem(key);
 r.w.dispatchEvent(new r.w.PageTransitionEvent('pageshow',{persisted:true}));await tick();
 assert.doesNotMatch(r.w.document.body.textContent,/PRIVATE ACCOUNT DATA/);assert.ok(r.visits.length);r.w.close();
});
test('an idle warning has a usable continue action before the deadline',async()=>{
 const r=open();await tick();r.advance(14*60*1000+1);r.guard.check();
 const button=r.w.document.querySelector('[role="alert"] button');assert.ok(button);
 button.click();r.advance(2*60*1000);assert.equal(r.guard.check(),true);assert.equal(r.visits.length,0);r.w.close();
});
test('switching accounts removes the old private view while preserving the new account token',async()=>{
 const r=open();await tick();const next={user:{id:'member-b'},expires_at:2000000000};
 r.w.localStorage.setItem(key,JSON.stringify(next));
 r.event('SIGNED_IN',next);await tick();
 assert.doesNotMatch(r.w.document.body.textContent,/PRIVATE ACCOUNT DATA/);
 assert.equal(JSON.parse(r.w.localStorage.getItem(key)).user.id,'member-b');assert.ok(r.visits.length);r.w.close();
});
test('a late refresh cannot silently resurrect an explicitly closed session',async()=>{
 const r=open();await tick();await r.guard.signOut();
 const session={user:{id:'member-a'},expires_at:2000000000};
 r.w.localStorage.setItem(key,JSON.stringify(session));
 assert.equal(r.guard.isLocked(),true);
 // A verified fresh password sign-in is the explicit way to open it again.
 r.guard.start(session);assert.equal(r.guard.isLocked(),false);r.w.close();
});
test('all published entry pages load the guard before application authentication',()=>{
 for(const path of ['index.html','login.html','account.html','admin.html','pricing.html','calculadoras/venta.html','tools/flip-calculator.html','tools/arv/index.html','calculadora-venta/index.html']){
  const html=fs.readFileSync(path,'utf8');assert.match(html,/session-security\.js/);
  assert.ok(html.indexOf('session-security.js')<html.indexOf('member-auth-config.js')||!html.includes('member-auth-config.js'),path);
 }
});
