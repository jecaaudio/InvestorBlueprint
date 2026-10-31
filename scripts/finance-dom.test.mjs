import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
const source=fs.readFileSync('tools/tool-script.js','utf8');
const report=fs.readFileSync('tools/finance-report.js','utf8');
const en=JSON.parse(fs.readFileSync('assets/i18n/en.json','utf8'));
const es=JSON.parse(fs.readFileSync('assets/i18n/es.json','utf8'));
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
async function setup(type,fields,extra='',inputAttrs=''){
 const inputs=Object.entries(fields).map(([id,value])=>`<label for="${id}">${id}</label><input id="${id}" name="${id}" value="${value}"${inputAttrs}><p id="${id}-error" class="field-error" hidden></p>`).join('');
 const dom=new JSDOM(`<!doctype html><html lang="es"><head></head><body data-tool="${type}"><h1>Fixture</h1><form id="tool-form">${inputs}<p id="tool-validation" hidden></p><div class="tool-actions"><button>Calculate</button></div></form><div id="result-cards"></div><div id="result"></div>${extra}</body></html>`,{url:'https://jecaaudio.github.io/InvestorBlueprint/tools/fixture.html',runScripts:'outside-only'});
 const w=dom.window;
 w.IBI18n={getCurrentMessages:()=>es};
 w.IB_REPORT_PREFERENCES=Object.freeze({ib_document_language:'en',ib_report_detail:'detailed',ib_display_name:'Current user',ib_company_name:'Current company',preferredLanguage:'es'});
 w.print=()=>{w.didPrint=true};
 w.fetch=async()=>({ok:true,json:async()=>en});
 w.eval(fs.readFileSync('assets/js/finance-visuals.js','utf8'));w.eval(source);w.eval(report);await tick();
 return dom;
}
test('changing language refreshes the current chart without recording a new calculation',async()=>{
 const dom=await setup('rental',{monthlyRent:2400,taxes:220,insurance:120,maintenance:180,management:190,vacancyRate:5});
 const w=dom.window,d=w.document;let runs=0,successes=0;
 w.IBAnalytics={trackCalcRun(){runs++},trackCalcSuccess(){successes++}};
 d.getElementById('tool-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 assert.equal(runs,1);assert.equal(successes,1);
 d.documentElement.lang='en';w.IBI18n={getCurrentMessages:()=>en};d.dispatchEvent(new w.Event('ib:language-changed'));
 assert.match(d.getElementById('ib-tool-chart').textContent,/Your monthly rent breakdown/);
 assert.match(d.getElementById('ib-tool-chart').textContent,/Income after vacancy/);
 assert.equal(runs,1);assert.equal(successes,1);
 assert.equal(d.querySelector('label[for="ib-finance-notes"]').textContent,'Report notes');
 assert.equal(d.getElementById('ib-finance-print').textContent,'Print / Save PDF');
 assert.equal(d.getElementById('ib-finance-print').disabled,false,'Language changes preserve the valid report snapshot');
 d.getElementById('monthlyRent').dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(d.querySelector('.ib-finance-report-controls [role="status"]').textContent,'Calculate again before exporting.');
 d.documentElement.lang='es';d.dispatchEvent(new w.Event('ib:language-changed'));
 assert.equal(d.querySelector('label[for="ib-finance-notes"]').textContent,'Notas del informe');
 assert.equal(d.querySelector('.ib-finance-report-controls [role="status"]').textContent,'Calcula de nuevo antes de exportar.');
 dom.window.close();
});
test('rental form includes validated costs, computes NOI and exports document-scoped metadata',async()=>{
 const dom=await setup('rental',{monthlyRent:2400,taxes:220,insurance:120,maintenance:180,management:190,vacancyRate:5});
 const w=dom.window,d=w.document,f=d.getElementById('tool-form');
 f.elements.debtService.value='900';f.elements.capitalReserve.value='100';f.elements.cashInvested.value='60000';
 assert.match(d.querySelector('label[for="debtService"]').textContent,/Pago mensual/);
 f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await tick();
 assert.match(d.getElementById('result-cards').textContent,/\$570/);
 assert.match(d.getElementById('ib-tool-chart').textContent,/\$570/);
 const button=d.getElementById('ib-finance-print');assert.equal(button.disabled,false);
 w.localStorage.setItem('ib_display_name','Another account');
 d.getElementById('ib-finance-notes').value='<script>steal()</script>';
 button.click();await tick();
 const printed=d.getElementById('ib-finance-report');
 assert.equal(w.didPrint,true);assert.match(printed.textContent,/Current user/);assert.doesNotMatch(printed.textContent,/Another account/);
 assert.equal(printed.querySelector('script'),null);assert.match(printed.textContent,/Monthly debt service/);
 assert.match(printed.querySelector('img').src,/\/InvestorBlueprint\/assets\/brand\/favicon.svg$/);
 f.elements.monthlyRent.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(button.disabled,true);
 assert.equal(d.getElementById('ib-tool-chart').children.length,0,'An edited calculation cannot leave an old chart visible');
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
 w.IBI18n={getCurrentMessages:()=>en};w.IB_REPORT_PREFERENCES={ib_document_language:'es'};w.fetch=async()=>({ok:true,json:async()=>es});w.print=()=>{};
 // Protected Flip loads report controls before its dynamically inserted engine.
 w.eval(report);await tick();w.eval(source);
 const f=d.getElementById('tool-form');assert.ok(f);assert.ok(d.getElementById('loanDraws'));
 for(const [key,value] of Object.entries({salePrice:320000,purchasePrice:200000,rehabCost:50000,holdingMonths:6,miscMonthly:1000,buyerClosing:5000,stagingCost:1000,realtorPct:7,loanAmount:100000,interestRate:12,pointsPct:2}))f.elements[key].value=value;
 f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 // Readiness must follow the completed render synchronously, not a listener-order microtask.
 assert.equal(d.getElementById('ib-finance-print').disabled,false);
 assert.match(d.getElementById('result-cards').textContent,/\$27,600/);
 assert.match(d.getElementById('result-cards').textContent,/16\.3%/);
 assert.equal(d.getElementById('ib-finance-print').disabled,false);
 assert.equal(d.getElementById('downPayment').disabled,true);
 d.getElementById('ib-finance-print').click();await tick();
 const spanish=d.getElementById('ib-finance-report').textContent;
 assert.match(spanish,/Calculadora de Flip/);assert.match(spanish,/Capital propio comprometido/);assert.match(spanish,/Precio de compra \(USD\)/);assert.match(spanish,/Préstamo comprometido \(USD\)/);assert.doesNotMatch(spanish,/Net capital committed|Purchase Price|planMode|Down Payment/);
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

test('ROI filters one explicit metric, shows both returns, and exports the selected metric',async()=>{
 const table='<table><thead><tr>'+Array.from({length:7},(_,i)=>'<th>Column '+i+'</th>').join('')+'</tr></thead><tbody id="result-rows"></tbody></table>';
 const dom=await setup('roi_search',{desiredReturn:8.5,location:'33101',propertyType:'single_family'},table);
 const w=dom.window,d=w.document,f=d.getElementById('tool-form');
 const submit=()=>f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 submit();assert.match(d.getElementById('result-rows').textContent,/ROI-101/);
 assert.equal(d.querySelectorAll('thead th').length,8);assert.match(d.getElementById('result-rows').textContent,/7\.8%/);assert.match(d.getElementById('result-rows').textContent,/9\.1%/);
 f.elements.returnMetric.value='capRate';f.elements.returnMetric.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(d.getElementById('ib-finance-print').disabled,true);
 submit();assert.doesNotMatch(d.getElementById('result-rows').textContent,/ROI-101/);assert.match(d.getElementById('result-cards').textContent,/N\/A/);
 f.elements.desiredReturn.value='7';submit();assert.match(d.getElementById('result-rows').textContent,/ROI-101/);
 d.getElementById('ib-finance-print').click();await tick();
 assert.match(d.getElementById('ib-finance-report').textContent,/Capitalization rate \(NOI \/ property value\)/);
 assert.match(d.getElementById('ib-finance-report').textContent,/DEMONSTRATION/);
 f.elements.returnMetric.value='bad';submit();assert.equal(d.getElementById('ib-finance-print').disabled,true);
 dom.window.close();
});
test('numeric fields read Spanish notation and say how an ambiguous entry was read',async()=>{
 const dom=await setup('rental',{monthlyRent:'',taxes:0,insurance:0,maintenance:0,management:0,vacancyRate:'5'},'',' type="number" inputmode="decimal" min="0" step="0.01"');
 const w=dom.window,d=w.document,f=d.getElementById('tool-form');
 for(const input of f.querySelectorAll('input:not([type="hidden"])'))assert.notEqual(input.type,'number',input.name+' must not use the native number parser');
 const rent=f.elements.monthlyRent,echo=d.getElementById('monthlyRent-read-as');
 rent.value='2.400';rent.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(echo.hidden,false);assert.match(echo.textContent,/Se lee como 2,400/);
 assert.match(rent.getAttribute('aria-describedby'),/monthlyRent-read-as/);
 rent.value='2400';rent.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(echo.hidden,true);
 rent.value='2.4.0';rent.dispatchEvent(new w.Event('input',{bubbles:true}));assert.match(echo.textContent,/Número no válido/);
 rent.value='2.400';f.elements.vacancyRate.value='5,5';
 f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await tick();
 // 2,400 rent less 5.5% vacancy = 2,268 monthly cash flow with no costs.
 assert.match(d.getElementById('result-cards').textContent,/\$2,268/);
 dom.window.close();
});
test('private Flip labels, help and notices follow the page language; unused down payment is hidden',async()=>{
 const row=(id,label,tip)=>'<div class="fc-row"><label for="'+id+'">'+label+' <button type="button" class="info-icon" aria-label="What is '+label+'?" data-tooltip="'+tip+'">!</button></label><input id="'+id+'" class="fc-input money" type="text" inputmode="decimal"></div>';
 const html='<html lang="es"><head></head><body data-tool="flip"><main><section id="flip-calculator"><div class="fc-panel"><div class="fc-section"><h3>Inputs</h3>'+
  row('purchasePrice','Purchase Price','Agreed purchase price (excluding closing costs).')+row('downPayment','Down Payment','Cash you bring to closing (if applicable).')+
  '</div></div><div id="fcReportArea"></div></section></main></body></html>';
 const dom=new JSDOM(html,{url:'https://jecaaudio.github.io/InvestorBlueprint/tools/flip-calculator.html',runScripts:'outside-only'});
 const w=dom.window,d=w.document;w.IBI18n={getCurrentMessages:()=>es};
 const tag=d.createElement('script');tag.src='https://jecaaudio.github.io/InvestorBlueprint/assets/js/flip-calculator.js';
 Object.defineProperty(d,'currentScript',{configurable:true,value:tag});w.eval(fs.readFileSync('assets/js/flip-calculator.js','utf8'));
 Object.defineProperty(d,'currentScript',{configurable:true,value:null});w.eval(source);await tick();
 const label=d.querySelector('label[for="purchasePrice"]'),icon=label.querySelector('.info-icon');
 assert.match(label.textContent,/Precio de compra/);assert.equal(icon.textContent,'?');
 assert.match(icon.getAttribute('data-tooltip'),/Precio de compra acordado/);
 assert.match(d.querySelector('h3').textContent,/Datos del proyecto/);
 assert.equal(d.getElementById('downPayment').closest('.fc-row').hidden,true);
 assert.match(d.getElementById('tool-form').textContent,/Tu capital propio/);assert.doesNotMatch(d.getElementById('tool-form').textContent,/Equity is/);
 assert.equal(d.querySelector('#tool-form button[type="submit"]').textContent,'Calcular');
 d.documentElement.lang='en';d.dispatchEvent(new w.CustomEvent('ib:language-changed'));
 assert.match(label.textContent,/Purchase Price/);assert.match(icon.getAttribute('data-tooltip'),/Agreed purchase price/);
 assert.match(d.getElementById('tool-form').textContent,/Your equity is/);
 dom.window.close();
});
test('cookie banner is Spanish by default and uses translation keys for English',async()=>{
 const dom=new JSDOM('<html lang="es"><body></body></html>',{url:'https://jecaaudio.github.io/InvestorBlueprint/',runScripts:'outside-only'});
 const w=dom.window,d=w.document;w.eval(fs.readFileSync('assets/js/cookie-banner-component.js','utf8'));await new Promise(resolve=>setTimeout(resolve,20));
 assert.match(d.getElementById('cookie-banner').textContent,/Usamos cookies/);
 assert.equal(d.getElementById('cookie-accept-all').textContent,'Aceptar todas');
 for(const node of d.querySelectorAll('#cookie-banner [data-i18n]'))assert.ok(en[node.dataset.i18n]&&es[node.dataset.i18n],'Missing banner key '+node.dataset.i18n);
 assert.ok(d.getElementById('cookie-analytics'),'checkbox survives translation markup');
 dom.window.close();
});
test('finance PDF leads with the member company and ends with a small brand line',async()=>{
 const dom=await setup('rent',{propertyValue:300000,annualExpenses:0,targetYield:8,occupancy:100});
 const render=dom.window.IBRenderFinanceReport;
 const snapshot={title:'Rent',titleKey:'',date:'2026-10-21T14:32:07.512Z',logo:'https://jecaaudio.github.io/InvestorBlueprint/assets/brand/favicon.svg',
  inputs:[],metrics:[{key:'',label:'Rent',value:'$2,000'}],details:'',sourceMessages:{}};
 const html=render(snapshot,{ib_document_language:'es',ib_display_name:'María López',ib_company_name:'López Investments'},{});
 const doc=new JSDOM('<body>'+html+'</body>').window.document;
 assert.equal(doc.querySelector('.ib-r-company').textContent,'López Investments');
 assert.match(doc.querySelector('.ib-r-head').textContent,/María López/);
 assert.equal(doc.querySelector('h1').textContent,'Rent','the brand is not the document title');
 assert.match(doc.querySelector('.ib-r-doc p').textContent,/21 de octubre de 2026/);
 assert.doesNotMatch(html,/2026-10-21T/);
 const brand=doc.querySelector('.ib-r-brand');
 assert.equal(brand.textContent,'Preparado con InvestorBlueprint · jecaaudio.github.io/InvestorBlueprint');
 assert.equal(brand.querySelector('img').getAttribute('width'),'12');
 const english=new JSDOM('<body>'+render(snapshot,{ib_document_language:'en'},{})+'</body>').window.document;
 assert.equal(english.querySelector('.ib-r-client').textContent,'','no empty client line without a name');
 assert.match(english.querySelector('.ib-r-brand').textContent,/^Prepared with InvestorBlueprint/);
 assert.match(english.querySelector('.ib-r-doc p').textContent,/October 21, 2026/);
 const inline=new JSDOM('<body>'+render({...snapshot,logo:'data:image/svg+xml;base64,AAAA'},{},{})+'</body>').window.document;
 assert.equal(inline.querySelector('.ib-r-brand').textContent,'Preparado con InvestorBlueprint','an inline logo never prints as a site address');
 dom.window.close();
});
