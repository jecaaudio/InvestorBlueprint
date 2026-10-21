import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
const fixture=JSON.parse(fs.readFileSync('tools/arv/fixtures/demo-report.json','utf8'));
const code=fs.readFileSync('tools/arv/arv.js','utf8');
const tick=()=>new Promise(r=>setTimeout(r,0));
async function setup(fetch,blocked=false){
 const ids=['status','error','results','subject-fields','arv-fields','comps-wrap','comps-body','action-row','copy-btn','export-btn','save-worker-url-btn','run-demo-btn','calculate-btn','demo-banner','current-origin'];
 const dom=new JSDOM('<html><body><form id="arv-form"><input name="address" id="address"></form><input id="worker-url">'+ids.map(id=>id.includes('btn')?'<button id="'+id+'"></button>':'<div id="'+id+'"></div>').join('')+'</body></html>',{url:'https://fixture.invalid/tools/arv/',runScripts:'outside-only'});
 const w=dom.window;w.fetch=fetch;w.print=()=>{};
 if(blocked)Object.defineProperty(w,'localStorage',{get(){throw Error('blocked storage')}});
 w.eval(code);await tick();return dom;
}
test('blocked storage preserves demo and temporary HTTPS configuration; saving clears prior report',async()=>{
 const dom=await setup(async()=>({ok:true,json:async()=>fixture}),true),d=dom.window.document;
 assert.equal(d.getElementById('calculate-btn').disabled,true);
 d.getElementById('run-demo-btn').click();await tick();assert.equal(d.getElementById('results').hidden,false);
 d.getElementById('worker-url').value='http://unsafe.invalid';d.getElementById('save-worker-url-btn').click();assert.equal(d.getElementById('calculate-btn').disabled,true);assert.equal(d.getElementById('action-row').hidden,true);
 d.getElementById('worker-url').value='https://valuation.example';d.getElementById('save-worker-url-btn').click();assert.equal(d.getElementById('calculate-btn').disabled,false);assert.match(d.getElementById('status').textContent,/Temporary configuration/);
 dom.window.close();
});
test('older failed response cannot replace a newer successful demo',async()=>{
 let rejectOld,requests=0;
 const dom=await setup(()=>++requests===1?new Promise((_,reject)=>rejectOld=reject):Promise.resolve({ok:true,json:async()=>fixture})),d=dom.window.document;
 d.getElementById('run-demo-btn').click();d.getElementById('run-demo-btn').click();await tick();
 const status=d.getElementById('status').textContent;rejectOld(Error('old network failure'));await tick();
 assert.equal(d.getElementById('status').textContent,status);assert.equal(d.getElementById('results').hidden,false);assert.equal(d.getElementById('error').hidden,true);dom.window.close();
});
test('invalid payload cannot become a printable valuation and JSON export omits legacy confidence',async()=>{
 let invalid=true;
 const dom=await setup(async()=>({ok:true,json:async()=>invalid?{subject:{sqft:1000},comps:[],arv:{estimate:0}}:fixture})),w=dom.window,d=w.document;
 d.getElementById('run-demo-btn').click();await tick();assert.equal(d.getElementById('action-row').hidden,true);assert.match(d.getElementById('error').textContent,/Invalid valuation response/);
 invalid=false;d.getElementById('run-demo-btn').click();await tick();
 assert.doesNotMatch(d.getElementById('arv-fields').textContent,/82%/);
 let output='';w.Blob=class{constructor(parts){output=parts.join('')}};w.URL.createObjectURL=()=> 'blob:qa';w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=()=>{};
 d.getElementById('export-btn').click();const exported=JSON.parse(output);assert.equal(exported.arv.confidence,undefined);assert.equal(exported.exportMetadata.statisticalConfidence,false);assert.equal(exported.exportMetadata.demo,true);
 dom.window.close();
});
