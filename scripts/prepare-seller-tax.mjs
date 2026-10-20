// Applies a reviewed change to the private server-delivered HTML; never commit that HTML.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
export function prepareSellerTax(html){
 const replace=(before,after)=>{
  if(!html.includes(before))throw Error('Protected Seller Net contract changed: '+before.slice(0,60));
  html=html.replace(before,()=>after);
 };
 replace("const s=state.value,basis=price+n('assumed');",`const s=state.value;
 const retained=s==='IL'?n('ilRetainedMortgage'):0;
 const consideration=price+n('assumed');
 const basis=consideration-retained;
 const validBasis=Number.isFinite(basis)&&basis>=0;`);
 replace("else if(s==='IL'){calc=Math.ceil(basis/500)*.50;", "else if(s==='IL'){calc=validBasis?Math.ceil(basis/500)*.50:null;");
 const marker='<div class="field"><label for="mortgage1">';
 replace(marker,`<div class="field" id="ilRetainedField" hidden><label for="ilRetainedMortgage">Illinois: hipoteca retenida calificada / qualifying retained mortgage ($)</label><input id="ilRetainedMortgage" type="text" inputmode="decimal" autocomplete="off" class="currency-input" data-currency="USD" value="0" /><span class="help">Solo deuda incluida en el valor total que permanece sobre la propiedad y consta en la escritura. No restes aquí una hipoteca pagada al cierre. No incluyas deuda retenida entre los payoffs del vendedor. / Only debt included in total consideration that remains on the property and is stated on the deed. Do not subtract a mortgage paid at closing here. Exclude retained debt from seller payoffs.</span></div>\n`+marker);
 replace("'price','assumed','mortgage1'", "'price','assumed','ilRetainedMortgage','mortgage1'");
 replace('["price","assumed","mortgage1"', '["price","assumed","ilRetainedMortgage","mortgage1"');
 replace("assumed:'0',mortgage1:","assumed:'0',ilRetainedMortgage:'0',mortgage1:");
 replace('function render(){',`function render(){
 $('ilRetainedField').hidden=state.value!=='IL';
 $('ilRetainedMortgage').disabled=state.value!=='IL';`);
 replace("$('stateTaxOverride').value='';$('localTax')", "$('stateTaxOverride').value='';$('ilRetainedMortgage').value=money(0);$('localTax')");
 replace("return {known,rawTax,sellerTax,auto:","return {retained,consideration,validBasis,known,rawTax,sellerTax,auto:");
 replace("let warning=!known?",`let warning=(code==='IL'&&!tax.validBasis?showLang('La hipoteca retenida supera el valor total: corrige la base o introduce el impuesto confirmado. ','Retained mortgage exceeds total consideration: correct the basis or enter confirmed tax. '):'')+(!known?`);
 replace("transfer tax is missing. '):'';", "transfer tax is missing. '):'');");
 replace("La base puede variar en transferencias sujetas a hipoteca.","Base: valor total menos hipoteca retenida calificada declarada en escritura. Verifica PTAX-203 y cargos locales.");
 replace("The tax base can vary for transfers subject to mortgage debt.","Basis: total consideration less qualifying retained mortgage stated on the deed. Verify PTAX-203 and local charges.");
 return html;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [input,output]=process.argv.slice(2);
 if(!input||!output||input===output)throw Error('Usage: node scripts/prepare-seller-tax.mjs PRIVATE_INPUT PRIVATE_OUTPUT');
 fs.writeFileSync(output,prepareSellerTax(fs.readFileSync(input,'utf8')));
}
