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
 replace("const net=price-debt-fees;",`const retainedInPrice=Math.max(0,(tax.retained||0)-n('assumed'));
 const cashPrice=price-retainedInPrice;
 const net=tax.validBasis===false?NaN:cashPrice-debt-fees;`);
 replace("return {price,tax,debt,commission,concessions,closing,local,fees,net};", "return {price,cashPrice,retainedInPrice,tax,debt,commission,concessions,closing,local,fees,net};");
 replace("money(res.net)", "Number.isFinite(res.net)?money(res.net):showLang('PENDIENTE: corrige deuda retenida','PENDING: correct retained debt')");
 replace("money(r.net)+(r.tax.known?", "(Number.isFinite(r.net)?money(r.net):showLang('PENDIENTE','PENDING'))+(r.tax.known?");
 replace("),r.net],", "),Number.isFinite(r.net)?r.net:showLang('PENDIENTE','PENDING')],");
 replace("[showLang('Hipotecas y saldos','Mortgage and debt payoffs'),r.debt],",`[showLang('Deuda retenida incluida en el precio, no cobrada','Retained debt included in price, not received in cash'),r.retainedInPrice],
 [showLang('Precio recibido en efectivo antes de gastos','Cash sale proceeds before costs'),r.cashPrice],
 [showLang('Hipotecas y saldos','Mortgage and debt payoffs'),r.debt],`);
 replace("addText($('rPrice'),money(res.price));",`if(res.retainedInPrice>0)addText($('netDetail'),showLang('Del precio se excluyen ','Excluded from price: ')+money(res.retainedInPrice)+showLang(' de deuda retenida no cobrada en efectivo. Después se restan payoffs y gastos.',' of retained debt not received in cash. Payoffs and costs are then deducted.'));
 addText($('rPrice'),money(res.price));`);
 replace("Solo deuda incluida en el valor total que permanece sobre la propiedad y consta en la escritura.", "Solo deuda incluida en el valor total que permanece sobre la propiedad y consta en la escritura. Primero se asigna a la deuda asumida adicional; el resto se resta del precio para calcular el efectivo recibido. Comisiones y concesiones porcentuales usan el precio introducido: confirma su base contractual.");
 replace("Only debt included in total consideration that remains on the property and is stated on the deed.", "Only debt included in total consideration that remains on the property and is stated on the deed. Allocate first to additional assumed debt; the remainder is excluded from cash proceeds. Percentage commissions and concessions use the entered price: verify their contractual basis.");
 return html;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [input,output]=process.argv.slice(2);
 if(!input||!output||input===output)throw Error('Usage: node scripts/prepare-seller-tax.mjs PRIVATE_INPUT PRIVATE_OUTPUT');
 fs.writeFileSync(output,prepareSellerTax(fs.readFileSync(input,'utf8')));
}
