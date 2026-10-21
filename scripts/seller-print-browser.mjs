// Synthetic print controls and results only; no private calculator HTML or account data.
import path from 'node:path';
import assert from 'node:assert/strict';
import {parseSellerCurrency,validateSellerInputs} from './prepare-seller-validation.mjs';

export async function renderSellerPrintFixture(browser,output,lang,detail){
 const page=await browser.newPage();
 await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html></html>'}));
 await page.goto('http://seller-fixture.invalid/');
 const values={price:200000,assumed:0,ilRetainedMortgage:150000,mortgage1:0,mortgage2:0,otherDebt:0,creditDollar:0,settlement:550,admin:250,propertyTax:2918.84,recording:0,misc:0,stateTaxOverride:'',localTax:0,scenarioStep:5000};
 const results={rPrice:'$200,000.00',rDebt:'$0.00',rCommission:'$12,000.00',rCredit:'$6,000.00',rTax:'$50.00',rLocal:'$0.00',rOther:'$3,718.84',rFees:'$21,768.84',netValue:'$28,231.16',netLabel:'',netDetail:'',taxExplanation:''};
 await page.setContent('<html lang="'+lang+'"><head></head><body><main><section>'+Object.entries(values).map(([id,value])=>'<label for="'+id+'">'+id+'</label><input id="'+id+'" value="'+value+'">').join('')+
  '<input id="listingPct" value="3"><input id="buyerAgentPct" value="3"><input id="creditPct" value="3"><input id="sellerShare" value="100"><input type="checkbox" id="hasSecondMortgage">'+
  '<select id="state"><option value="IL">Illinois</option></select><select id="county"><option>QA County</option></select><input id="city" value="QA City"><select id="propertyType"><option value="single">Single Family</option></select></section>'+
  Object.entries(results).map(([id,text])=>'<div id="'+id+'">'+text+'</div>').join('')+
  '<button id="printButton">Print</button><button id="csvButton">CSV</button><table><tbody id="scenarios"><tr><td>$200,000.00</td><td>$21,768.84</td><td>$28,231.16</td></tr></tbody></table><div id="sourceList"><div class="source"><strong>Illinois transfer tax</strong><a href="https://tax.illinois.gov/">Official source</a></div></div></main></body></html>');
 await page.evaluate(({lang,detail})=>{window.IB_REPORT_PREFERENCES=Object.freeze({ib_document_language:lang,ib_report_detail:detail,ib_display_name:'QA Analyst',ib_company_name:'QA Company'});},{lang,detail});
 await page.addScriptTag({content:'const $=id=>document.getElementById(id);const state=$("state");const currencyIds=new Set('+JSON.stringify(Object.keys(values))+');const showLang=(es,en)=>'+JSON.stringify(lang)+'==="en"?en:es;const addText=(el,t)=>el.textContent=t;const parseCurrency='+parseSellerCurrency.toString()+';const n=id=>parseCurrency($(id).value);'+validateSellerInputs.toString()+';window.IBSellerValidation={check:validateSellerInputs,parse:parseCurrency};validateSellerInputs(false);$("mortgage1").addEventListener("input",()=>validateSellerInputs());'});
 await page.addStyleTag({path:'calculadora-venta/print-report.css'});
 await page.addScriptTag({path:'calculadora-venta/print-report.js'});
 assert.equal(await page.locator('#printButton').isEnabled(),true);
 assert.match(await page.locator('#printReport').textContent(),/28,231\.16/);
 await page.emulateMedia({media:'print'});
 assert.equal(await page.locator('.ib-report-notes-panel').isVisible(),false,'print hides the notes editor');
 assert.match(await page.locator('#printReport').textContent(),lang==='es'?/Vivienda unifamiliar/:/Single-family residence/);
 await page.screenshot({path:path.join(output,'seller-'+lang+'-'+detail+'.png'),fullPage:true});
 await page.pdf({path:path.join(output,'seller-'+lang+'-'+detail+'.pdf'),format:'Letter',printBackground:true});
 if(lang==='es'&&detail==='detailed'){
  await page.emulateMedia({media:'screen'});
  await page.locator('#mortgage1').fill('abc');assert.equal(await page.locator('#printButton').isEnabled(),false);
  assert.doesNotMatch(await page.locator('#printReport').textContent(),/28,231\.16/);
  await page.emulateMedia({media:'print'});
  await page.pdf({path:path.join(output,'seller-invalid-blocked.pdf'),format:'Letter',printBackground:true});
 }
 await page.close();console.log('PASS native Seller print, retained cash and invalid-input guard: '+lang+' '+detail);
}
