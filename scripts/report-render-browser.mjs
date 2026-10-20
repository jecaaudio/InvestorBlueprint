// Native Chromium PDF/layout fixtures. No login, live API or private source HTML.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const output=process.env.IB_REPORT_QA_OUTPUT||'tmp/report-render-qa';fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const demo=JSON.parse(fs.readFileSync('tools/arv/fixtures/demo-report.json','utf8'));
const logo='data:image/svg+xml;base64,'+fs.readFileSync('assets/brand/favicon.svg').toString('base64');
try{
 for(const lang of ['es','en'])for(const detail of ['summary','detailed']){
  const messages=JSON.parse(fs.readFileSync('assets/i18n/'+lang+'.json','utf8'));
  const prefs={ib_document_language:lang,ib_report_detail:detail,ib_display_name:'QA Analyst',ib_company_name:'QA Company'};
  const page=await browser.newPage();
  await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html></html>'}));
  await page.goto('http://report-fixture.invalid/');
  await page.setContent('<html><head><base href="https://example.invalid/InvestorBlueprint/tools/"></head><body data-tool="rental"><form id="tool-form"></form><div id="result-cards"></div></body></html>');
  await page.addScriptTag({path:'tools/finance-report.js'});
  await page.evaluate(({prefs,messages,logo})=>{
    const snapshot={title:'Rental Cash Flow · QA fixture',date:'2026-10-20T00:00:00Z',logo,
      metrics:[{key:'monthlyCashFlow',label:'Monthly cash flow',value:'$420.00'},{key:'annualCashFlow',label:'Annual cash flow',value:'$5,040.00'}],
      inputs:[{key:'rentalDebtService',label:'Debt service',value:'$900.00'},{key:'rentalCapitalReserve',label:'Capital reserve',value:'$100.00'}],
      details:'NOI = effective income - operating expenses. Cash flow = NOI - debt service - capital reserve.',
      notes:'QA fixture only. '+('Property and contract assumptions must be confirmed. '.repeat(15)),demo:false};
    document.getElementById('ib-finance-report').innerHTML=window.IBRenderFinanceReport(snapshot,prefs,messages);
  },{prefs,messages,logo});
  await page.emulateMedia({media:'print'});await page.screenshot({path:path.join(output,'finance-'+lang+'-'+detail+'.png'),fullPage:true});
  await page.pdf({path:path.join(output,'finance-'+lang+'-'+detail+'.pdf'),format:'Letter',printBackground:true,margin:{top:'0.6in',bottom:'0.6in',left:'0.6in',right:'0.6in'}});
  const financialText=await page.locator('#ib-finance-report').textContent();
  assert.match(financialText,/QA Analyst/);
  if(lang==='es'){assert.match(financialText,/Flujo mensual/);assert.doesNotMatch(financialText,/Monthly cash flow/);}
  await page.close();

  const arv=await browser.newPage();
  await arv.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html></html>'}));
  await arv.goto('http://report-fixture.invalid/');
  await arv.setContent('<html><head><base href="https://example.invalid/InvestorBlueprint/tools/arv/"></head><body><form id="arv-form"><input name="address" id="address"></form>'+['status','error','results','subject-fields','arv-fields','comps-wrap','comps-body','action-row','copy-btn','export-btn','worker-url','save-worker-url-btn','run-demo-btn','calculate-btn','demo-banner','current-origin'].map(id=>id==='worker-url'?'<input id="worker-url">':id.includes('btn')?'<button type="button" id="'+id+'"></button>':'<div id="'+id+'"></div>').join('')+'</body></html>');
  await arv.evaluate(({prefs,demo})=>{window.IB_REPORT_PREFERENCES=Object.freeze(prefs);window.fetch=async()=>({ok:true,json:async()=>demo});window.print=()=>{window.__qaPrinted=true};},{prefs,demo});
  await arv.addScriptTag({path:'tools/arv/arv.js'});await arv.evaluate(()=>document.dispatchEvent(new Event('DOMContentLoaded')));
  await arv.locator('#run-demo-btn').click();await arv.locator('#action-row').waitFor({state:'visible'});
  await arv.locator('#arv-print-report').click();await arv.waitForFunction(()=>window.__qaPrinted===true);
  assert.match(await arv.locator('#arv-printable-report').textContent(),/DEMO/);
  await arv.emulateMedia({media:'print'});await arv.screenshot({path:path.join(output,'arv-'+lang+'-'+detail+'.png'),fullPage:true});
  await arv.pdf({path:path.join(output,'arv-'+lang+'-'+detail+'.pdf'),format:'Letter',printBackground:true});await arv.close();
  console.log('PASS native PDF fixtures: '+lang+' '+detail);
 }
}finally{await browser.close()}
