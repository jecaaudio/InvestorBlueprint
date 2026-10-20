import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareSellerTax} from './prepare-seller-tax.mjs';

// Contract-only excerpt, without private calculator HTML. Arithmetic is additionally
// tested against the exported live function by audit-seller-snapshot.mjs.
const contract=`const s=state.value,basis=price+n('assumed');
else if(s==='IL'){calc=Math.ceil(basis/500)*.50;
<div class="field"><label for="mortgage1">
'price','assumed','mortgage1'
["price","assumed","mortgage1"
assumed:'0',mortgage1:
function render(){
$('stateTaxOverride').value='';$('localTax')
return {known,rawTax,sellerTax,auto:
let warning=!known?showLang('falta impuesto','transfer tax is missing. '):'';
La base puede variar en transferencias sujetas a hipoteca.
The tax base can vary for transfers subject to mortgage debt.`;
test('Seller retained mortgage field participates in saved values, visibility and tax basis',()=>{
 const result=prepareSellerTax(contract);
 assert.match(result,/consideration=price\+n\('assumed'\)/);
 assert.match(result,/basis=consideration-retained/);
 assert.match(result,/retained=s==='IL'\?n\('ilRetainedMortgage'\):0/);
 assert.match(result,/calc=validBasis\?Math.ceil\(basis\/500\)\*\.50:null/);
 assert.match(result,/'price','assumed','ilRetainedMortgage','mortgage1'/);
 assert.match(result,/ilRetainedMortgage:'0'/);
 assert.match(result,/No restes aquí una hipoteca pagada al cierre/);
 assert.match(result,/disabled=state.value!=='IL'/);
});
test('Seller patch refuses changed private-page contracts and repeated application',()=>{
 assert.throws(()=>prepareSellerTax('<html>Unknown version</html>'),/contract changed/);
 assert.throws(()=>prepareSellerTax(prepareSellerTax(contract)),/contract changed/);
 assert.throws(()=>prepareSellerTax(contract.replace("'price','assumed','mortgage1'",'')),/contract changed/);
});
