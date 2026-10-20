// Local authenticated-source QA. Source files come from the authorized Supabase
// function export; they are intentionally absent from the public repository.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {JSDOM} from 'jsdom';
const directory=process.env.IB_PRIVATE_PAGES;
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const messages=JSON.parse(fs.readFileSync('assets/i18n/es.json','utf8'));
for(const tool of ['flip','rental','rent','arv-estimator','hard-money','roi-search']){
 test('actual private '+tool+' HTML with candidate financial engine and reports',{skip:!directory},async()=>{
  const html=fs.readFileSync(path.join(directory,tool+'.html'),'utf8');
  const dom=new JSDOM(html,{url:'https://jecaaudio.github.io/InvestorBlueprint/tools/'+tool+'.html',runScripts:'outside-only'});
  const w=dom.window,d=w.document;
  w.IBI18n={getCurrentMessages:()=>messages};w.IB_REPORT_PREFERENCES=Object.freeze({ib_document_language:'es',preferredLanguage:'es'});
  if(tool==='flip'){
    const script=d.createElement('script');script.src='https://jecaaudio.github.io/InvestorBlueprint/assets/js/flip-calculator.js';
    Object.defineProperty(d,'currentScript',{configurable:true,value:script});
    w.eval(fs.readFileSync('assets/js/flip-calculator.js','utf8'));
    Object.defineProperty(d,'currentScript',{configurable:true,value:null});
  }
  w.eval(fs.readFileSync('tools/tool-script.js','utf8'));w.eval(fs.readFileSync('tools/finance-report.js','utf8'));await tick();
  if(tool==='flip'){
    const f=d.getElementById('tool-form');
    for(const [key,value] of Object.entries({salePrice:320000,purchasePrice:200000,rehabCost:50000,holdingMonths:6,miscMonthly:1000,buyerClosing:5000,stagingCost:1000,realtorPct:7,loanAmount:100000,interestRate:12,pointsPct:2}))f.elements[key].value=value;
    f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  }else{const sample=d.getElementById('load-sample');assert.ok(sample,tool+' sample button');sample.click();}
  await tick();
  const validation=d.getElementById('tool-validation');assert.ok(!validation||validation.hidden,validation?.textContent);
  assert.ok(d.getElementById('result-cards').children.length>0,tool+' outputs');
  assert.equal(d.getElementById('ib-finance-print').disabled,false,tool+' report ready');
  if(tool==='rental')assert.ok(d.getElementById('debtService'));
  if(tool==='flip'||tool==='hard-money')assert.ok(d.getElementById('loanDraws'));
  if(tool==='flip')assert.match(d.getElementById('result-cards').textContent,/\$27,600/);
  dom.window.close();
 });
}
test('actual patched Seller Net HTML persists retained mortgage, rejects invalid tax basis and prints bilingual basis',{skip:!directory},async()=>{
 const html=fs.readFileSync(path.join(directory,'seller-net.html'),'utf8');
 const dom=new JSDOM(html,{url:'https://jecaaudio.github.io/InvestorBlueprint/calculadora-venta/',runScripts:'outside-only'});
 const w=dom.window,d=w.document;
 w.matchMedia=()=>({matches:false,addEventListener(){}});w.print=()=>{};
 w.IB_REPORT_PREFERENCES=Object.freeze({ib_document_language:'en',ib_report_detail:'detailed'});
 for(const script of d.querySelectorAll('script:not([src])'))if(script.textContent.trim())w.eval(script.textContent);
 await tick();
 const change=(id,value)=>{d.getElementById(id).value=value;d.getElementById(id).dispatchEvent(new w.Event('change',{bubbles:true}))};
 change('state','IL');change('price','200000');change('ilRetainedMortgage','150000');change('mortgage1','0');
 assert.equal(d.getElementById('ilRetainedField').hidden,false);assert.match(d.getElementById('rTax').textContent,/50\.00/);
 const saved=JSON.parse(w.localStorage.getItem('seller-net-multistate-2026-v1'));assert.equal(saved.ilRetainedMortgage,'150000');
 w.eval(fs.readFileSync('calculadora-venta/print-report.js','utf8'));await tick();
 w.dispatchEvent(new w.Event('beforeprint'));
 assert.match(d.getElementById('printReport').textContent,/Illinois taxable basis/);
 assert.match(d.getElementById('printReport').textContent,/\$50,000\.00/);
 change('ilRetainedMortgage','200001');assert.match(d.getElementById('rTax').textContent,/PENDIENTE|PENDING/);
 change('state','KY');assert.equal(d.getElementById('ilRetainedField').hidden,true);assert.match(d.getElementById('rTax').textContent,/200\.00/);
 dom.window.close();
});
