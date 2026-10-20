import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
const source=fs.readFileSync('tools/tool-script.js','utf8');
const report=fs.readFileSync('tools/finance-report.js','utf8');
const en=JSON.parse(fs.readFileSync('assets/i18n/en.json','utf8'));
const es=JSON.parse(fs.readFileSync('assets/i18n/es.json','utf8'));
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
async function setup(type,fields){
 const inputs=Object.entries(fields).map(([id,value])=>`<label for="${id}">${id}</label><input id="${id}" name="${id}" value="${value}"><p id="${id}-error" class="field-error" hidden></p>`).join('');
 const dom=new JSDOM(`<!doctype html><html lang="es"><head></head><body data-tool="${type}"><h1>Fixture</h1><form id="tool-form">${inputs}<p id="tool-validation" hidden></p><div class="tool-actions"><button>Calculate</button></div></form><div id="result-cards"></div><div id="result"></div></body></html>`,{url:'https://jecaaudio.github.io/InvestorBlueprint/tools/fixture.html',runScripts:'outside-only'});
 const w=dom.window;
 w.IBI18n={getCurrentMessages:()=>es};
 w.IB_REPORT_PREFERENCES=Object.freeze({ib_document_language:'en',ib_report_detail:'detailed',ib_display_name:'Current user',ib_company_name:'Current company',preferredLanguage:'es'});
 w.print=()=>{w.didPrint=true};
 w.fetch=async()=>({ok:true,json:async()=>en});
 w.eval(source);w.eval(report);await tick();
 return dom;
}
test('rental form includes validated costs, computes NOI and exports document-scoped metadata',async()=>{
 const dom=await setup('rental',{monthlyRent:2400,taxes:220,insurance:120,maintenance:180,management:190,vacancyRate:5});
 const w=dom.window,d=w.document,f=d.getElementById('tool-form');
 f.elements.debtService.value='900';f.elements.capitalReserve.value='100';f.elements.cashInvested.value='60000';
 assert.match(d.querySelector('label[for="debtService"]').textContent,/Pago mensual/);
 f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await tick();
 assert.match(d.getElementById('result-cards').textContent,/\$570/);
 const button=d.getElementById('ib-finance-print');assert.equal(button.disabled,false);
 w.localStorage.setItem('ib_display_name','Another account');
 d.getElementById('ib-finance-notes').value='<script>steal()</script>';
 button.click();await tick();
 const printed=d.getElementById('ib-finance-report');
 assert.equal(w.didPrint,true);assert.match(printed.textContent,/Current user/);assert.doesNotMatch(printed.textContent,/Another account/);
 assert.equal(printed.querySelector('script'),null);assert.match(printed.textContent,/Monthly debt service/);
 assert.match(printed.querySelector('img').src,/\/InvestorBlueprint\/assets\/brand\/favicon.svg$/);
 f.elements.monthlyRent.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(button.disabled,true);
 f.elements.debtService.value='-1';f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await tick();
 assert.equal(button.disabled,true);dom.window.close();
});
test('hard-money form uses schedule, rejects overcommitment and invalid schedules, and disables old exports',async()=>{
 const dom=await setup('hard-money',{loanAmount:100000,interestRate:12,points:2,months:6});
 const w=dom.window,d=w.document,f=d.getElementById('tool-form');
 f.elements.loanDraws.value='0:50000\n3:25000';f.elements.lenderFees.value='700';
 f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await tick();
 assert.match(d.getElementById('result-cards').textContent,/\$6,450/);assert.equal(d.getElementById('ib-finance-print').disabled,false);
 for(const bad of ['0:100001','nonsense','7:500','-1:100','0:']){
   f.elements.loanDraws.value=bad;f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await tick();
   assert.equal(d.getElementById('result-cards').children.length,0,bad);assert.equal(d.getElementById('ib-finance-print').disabled,true,bad);
 }
 dom.window.close();
});
test('print renderer distinguishes languages, report depth, simulated inventory and untrusted notes',async()=>{
 const dom=await setup('rent',{propertyValue:300000,annualExpenses:0,targetYield:8,occupancy:95});
 const render=dom.window.IBRenderFinanceReport;
 const snapshot={logo:'https://jecaaudio.github.io/InvestorBlueprint/assets/brand/favicon.svg',title:'Rent',date:'2026-10-20',metrics:[{key:'profit',label:'Profit',value:'$100'}],inputs:[{key:'rentalDebtService',label:'Debt',value:'$900'}],details:'NOI - debt',demo:true,notes:'<img src=x onerror=alert(1)>'};
 const a=render(snapshot,{ib_document_language:'es'},es),b=render(snapshot,{ib_document_language:'en',ib_report_detail:'summary'},en);
 assert.match(a,/Datos utilizados/);assert.match(a,/DEMOSTRACIÓN/);assert.match(a,/&lt;img/);assert.doesNotMatch(a,/<img src=x/);
 assert.match(a,/Ganancia/);assert.doesNotMatch(a,/>Profit</);
 assert.match(b,/Results/);assert.match(b,/DEMONSTRATION/);assert.doesNotMatch(b,/Inputs used/);assert.doesNotMatch(b,/\$900/);
 dom.window.close();
});
test('production Flip markup connects to the tested shared engine instead of the legacy ROI formula',async()=>{
 const fields=['arv','purchasePrice','rehab','holdingMonths','holdingMonthlyCost','buyClosingCosts','sellClosingCosts','agentCommissionPct','loanAmount','interestRatePct','pointsPct','downPayment'];
 const dom=new JSDOM('<html><head></head><body data-tool="flip"><section id="flip-calculator"><div class="fc-panel">'+fields.map(id=>'<label for="'+id+'">'+id+'</label><input id="'+id+'" class="money">').join('')+'</div><div id="fcReportArea"></div></section></body></html>',{url:'https://jecaaudio.github.io/InvestorBlueprint/tools/flip-calculator.html',runScripts:'outside-only'});
 const w=dom.window,d=w.document;
 const tag=d.createElement('script');tag.src='https://jecaaudio.github.io/InvestorBlueprint/assets/js/flip-calculator.js';
 Object.defineProperty(d,'currentScript',{configurable:true,value:tag});
 w.eval(fs.readFileSync('assets/js/flip-calculator.js','utf8'));
 Object.defineProperty(d,'currentScript',{configurable:true,value:null});
 w.IBI18n={getCurrentMessages:()=>en};w.eval(source);w.eval(report);await tick();
 const f=d.getElementById('tool-form');assert.ok(f);assert.ok(d.getElementById('loanDraws'));
 for(const [key,value] of Object.entries({salePrice:320000,purchasePrice:200000,rehabCost:50000,holdingMonths:6,miscMonthly:1000,buyerClosing:5000,stagingCost:1000,realtorPct:7,loanAmount:100000,interestRate:12,pointsPct:2}))f.elements[key].value=value;
 f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await tick();
 assert.match(d.getElementById('result-cards').textContent,/\$27,600/);
 assert.match(d.getElementById('result-cards').textContent,/16\.3%/);
 assert.equal(d.getElementById('ib-finance-print').disabled,false);
 assert.equal(d.getElementById('downPayment').disabled,true);
 assert.match(d.head.querySelector('script[src*="tool-script.js"]').src,/\/InvestorBlueprint\/tools\/tool-script.js/);
 f.elements.salePrice.value='invalid';f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await tick();
 assert.equal(d.getElementById('ib-finance-print').disabled,true);
 dom.window.close();
});
test('manual ARV accepts signed adjustments and retains evidence in detailed report inputs',async()=>{
 const dom=await setup('arv',{comp1:300000,comp2:330000,comp3:280000,repairs:30000});
 const w=dom.window,d=w.document,f=d.getElementById('tool-form');
 f.elements.comp1Adjustment.value='10000';f.elements.comp2Adjustment.value='-20000';f.elements.comp3Adjustment.value='30000';
 f.elements.comp1Evidence.value='Closed sale, 2026-09-01, county record supplied by user';
 f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await tick();
 assert.match(d.getElementById('result-cards').textContent,/\$310,000/);
 d.getElementById('ib-finance-print').click();await tick();
 assert.match(d.getElementById('ib-finance-report').textContent,/county record supplied by user/);
 f.elements.comp1Adjustment.value='-999999';f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await tick();
 assert.equal(d.getElementById('result-cards').children.length,0);assert.equal(d.getElementById('ib-finance-print').disabled,true);
 dom.window.close();
});
