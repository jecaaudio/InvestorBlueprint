import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {parseSellerCurrency,validateSellerInputs,prepareSellerValidation} from './prepare-seller-validation.mjs';

test('money accepts US and Spanish cents without silently discarding invalid input',()=>{
 for(const [text,value] of [['$150,000.50',150000.5],['150.000,50',150000.5],['150000,50',150000.5],['1,234',1234],['1.234',1234],['0',0],['',0]])assert.equal(parseSellerCurrency(text),value,text);
 for(const text of ['abc','150000abc','-150000','1e9','1,2,3','1.2.3','0.001','Infinity','90071992547409910'])assert.ok(Number.isNaN(parseSellerCurrency(text)),text);
 assert.throws(()=>prepareSellerValidation('<html>unknown private contract</html>'),/contract changed/);
});

test('invalid debt or confirmed tax blocks export, clears stale values, and can recover',()=>{
 const money=['price','mortgage1','mortgage2','assumed','ilRetainedMortgage','stateTaxOverride'];
 const fields=money.map(id=>'<label for="'+id+'">'+id+'</label><input id="'+id+'" value="'+(id==='price'?'200000':id==='mortgage1'?'150000':id==='stateTaxOverride'?'':'0')+'">').join('');
 const dom=new JSDOM('<body><section>'+fields+'</section><select id="state"><option>KY</option><option>IL</option></select>'+['listingPct','buyerAgentPct','creditPct','sellerShare'].map(id=>'<input type="number" id="'+id+'" value="0">').join('')+['rPrice','rDebt','rCommission','rCredit','rTax','rLocal','rOther','rFees','netValue','netLabel','netDetail','taxExplanation','scenarios','printReport'].map(id=>'<div id="'+id+'">OLD $150000</div>').join('')+'<button id="printButton"></button><button id="csvButton"></button></body>',{runScripts:'outside-only'});
 const w=dom.window,d=w.document;
 w.eval('const $=id=>document.getElementById(id); const state=$("state"); const currencyIds=new Set('+JSON.stringify(money)+'); const showLang=(es,en)=>en; const addText=(el,t)=>el.textContent=t; const parseCurrency='+parseSellerCurrency.toString()+'; const n=id=>parseCurrency($(id).value);'+validateSellerInputs.toString());
 assert.equal(w.validateSellerInputs(),true);
 for(const [id,value] of [['mortgage1','abc'],['stateTaxOverride','oops'],['mortgage1','-1']]){
  d.getElementById(id).value=value;assert.equal(w.validateSellerInputs(),false);
  assert.equal(d.getElementById('printButton').disabled,true);assert.equal(d.getElementById('csvButton').disabled,true);
  assert.match(d.getElementById('netValue').textContent,/PENDING/);assert.equal(d.getElementById('printReport').textContent,'');
  assert.equal(d.getElementById(id).getAttribute('aria-invalid'),'true');
  d.getElementById(id).value=id==='stateTaxOverride'?'':'150000';assert.equal(w.validateSellerInputs(),true);
 }
 d.getElementById('state').value='IL';d.getElementById('ilRetainedMortgage').value='200001';assert.equal(w.validateSellerInputs(),false);
 d.getElementById('state').value='KY';d.getElementById('ilRetainedMortgage').disabled=true;assert.equal(w.validateSellerInputs(),true,'disabled state-specific fields are excluded');
 dom.window.close();
});
