import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto,createHash} from 'node:crypto';
const source=fs.readFileSync('assets/js/password-safety.js','utf8');
const password='Synthetic-Password-Only-2026!';
const hash=createHash('sha1').update(password).digest('hex').toUpperCase();
function run({body='A'.repeat(35)+':0\r\n',status=200,fail=false,hang=false,lang='es'}={}){
 const calls=[];const window={crypto:webcrypto};
 const fetch=async(url,options)=>{
  calls.push({url,options});if(fail)throw Error('offline');
  if(hang)return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Error('timeout'))));
  return {ok:status===200,text:async()=>body};
 };
 vm.runInNewContext(source,{window,document:{documentElement:{lang}},TextEncoder,AbortController,fetch,
  setTimeout:(fn,ms)=>setTimeout(fn,ms===6000?5:ms),clearTimeout});
 return {check:window.IBPasswordSafety.assertSafe,calls};
}
test('password lookup sends only a five-character prefix, with padding and no credentials or referrer',async()=>{
 const r=run();await r.check(password);
 assert.equal(r.calls.length,1);const {url,options}=r.calls[0];
 assert.equal(url,'https://api.pwnedpasswords.com/range/'+hash.slice(0,5));
 assert.equal(options.headers['Add-Padding'],'true');assert.equal(options.credentials,'omit');
 assert.equal(options.referrerPolicy,'no-referrer');assert.equal(options.cache,'no-store');
 assert.equal(options.body,undefined);assert.ok(!JSON.stringify(r.calls).includes(password));
 assert.ok(!JSON.stringify(r.calls).includes(hash));
});
test('a leaked password is rejected, while padded zero-count matches are ignored',async()=>{
 await assert.rejects(run({body:hash.slice(5)+':17\r\n'}).check(password),e=>e.code==='compromised_password');
 await run({body:hash.slice(5)+':0\r\n'}).check(password);
});
test('an outage, timeout or malformed range never silently approves a new password',async()=>{
 for(const options of [{fail:true},{hang:true},{status:503},{body:''},{body:'not a range'},{body:'A'.repeat(2000001)}]){
  await assert.rejects(run(options).check(password),/No pudimos comprobar/);
 }
});
test('short passwords are rejected before sending anything and errors follow the interface language',async()=>{
 const r=run();await assert.rejects(r.check('short'),/12 caracteres/);assert.equal(r.calls.length,0);
 await assert.rejects(run({fail:true,lang:'en'}).check(password),/could not check/);
});
test('the deployed free configuration has no prices, trials, checkout or payment portal',()=>{
 const window={};vm.runInNewContext(fs.readFileSync('assets/js/billing-config.js','utf8'),{window});
 const b=window.IB_BILLING;assert.equal(b.enabled,false);assert.equal(b.trialDays,0);
 assert.ok(Object.values(b.prices).every(p=>p===0));assert.ok(Object.values(b.links).every(p=>p===''));assert.equal(b.customerPortal,'');
});
