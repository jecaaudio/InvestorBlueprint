import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const ids=['arv-form','status','error','results','subject-fields','arv-fields','comps-wrap','comps-body','action-row','copy-btn','export-btn','worker-url','save-worker-url-btn','run-demo-btn','calculate-btn','demo-banner','current-origin'];
const fixture=JSON.parse(fs.readFileSync('tools/arv/fixtures/demo-report.json','utf8'));
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
for(const lang of ['es','en'])for(const detail of ['summary','detailed']){
 test('Automated ARV '+lang+' '+detail+' print uses escaped per-document data and clears stale report',async()=>{
  const html='<html><head></head><body>'+ids.map(id=>id==='arv-form'?'<form id="arv-form"><input name="address" id="address"></form>':id==='worker-url'?'<input id="worker-url">':id.includes('btn')?'<button type="button" id="'+id+'"></button>':'<div id="'+id+'"></div>').join('')+'</body></html>';
  const dom=new JSDOM(html,{url:'https://jecaaudio.github.io/InvestorBlueprint/tools/arv/',runScripts:'outside-only'}),w=dom.window,d=w.document;
  w.IB_REPORT_PREFERENCES=Object.freeze({ib_document_language:lang,ib_report_detail:detail,ib_display_name:'Current Analyst',ib_company_name:'Current Company'});
  w.localStorage.setItem('ib_display_name','Other User');
  w.fetch=async()=>({ok:true,json:async()=>fixture});let printed=0;w.print=()=>printed++;
  w.eval(fs.readFileSync('tools/arv/arv.js','utf8'));await tick();
  d.getElementById('run-demo-btn').click();await tick();
  d.getElementById('arv-analyst-notes').value='<img src=x onerror=alert(1)>';
  d.getElementById('arv-print-report').click();
  const report=d.getElementById('arv-printable-report');
  assert.equal(printed,1);assert.equal(report.lang,lang);assert.match(report.textContent,/DEMO/);
  assert.match(report.textContent,/Current Analyst/);assert.match(report.textContent,/Current Company/);assert.doesNotMatch(report.textContent,/Other User/);
  assert.equal(report.querySelector('img'),null);
  assert.ok(report.textContent.includes(lang==='en'?'ARV REPORT':'INFORME DE ARV'));
  assert.equal(report.textContent.includes(lang==='en'?'Comparable properties:':'Comparables:'),detail==='detailed');
  d.getElementById('address').value='Changed address';d.getElementById('address').dispatchEvent(new w.Event('input',{bubbles:true}));
  assert.equal(report.children.length,0);assert.equal(d.getElementById('action-row').hidden,true);
  d.getElementById('arv-print-report').click();assert.equal(printed,1);
  dom.window.close();
 });
}
