// Patch the authorized private Seller page; never publish the private HTML.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

export function parseSellerCurrency(value){
 let s=String(value??'').trim().replace(/^\$\s*/,'');
 if(!s)return 0;
 // Accept explicit US or Spanish monetary notation, never strip arbitrary text.
 if(/^[1-9]\d{0,2}(,\d{3})+(\.\d{1,2})?$/.test(s))s=s.replace(/,/g,'');
 else if(/^[1-9]\d{0,2}(\.\d{3})+(,\d{1,2})?$/.test(s))s=s.replace(/\./g,'').replace(',','.');
 else if(/^\d+(,\d{1,2})$/.test(s))s=s.replace(',','.');
 else if(!/^\d+(\.\d{1,2})?$/.test(s))return NaN;
 const result=Number(s);
 return Number.isFinite(result)&&result<=Number.MAX_SAFE_INTEGER/100?result:NaN;
}

export function validateSellerInputs(notify=true){
 const invalid=[];
 for(const id of [...currencyIds,'listingPct','buyerAgentPct','creditPct','sellerShare']){
  const el=$(id);if(!el||el.disabled)continue;
  const raw=el.value.trim();
  const value=currencyIds.has(id)?parseCurrency(raw):Number(raw);
  const bad=(id==='price'&&!raw)||!Number.isFinite(value)||value<0||
   (!currencyIds.has(id)&&(value>100||el.validity.badInput));
  el.setAttribute('aria-invalid',String(bad));if(bad)invalid.push(id);
 }
 const kind=$('propertyType');
 if(kind){const bad=!['single','condo_unit','multi','commercial'].includes(kind.value);kind.setAttribute('aria-invalid',String(bad));if(bad)invalid.push('propertyType');}
 if(state.value==='IL'&&!invalid.length&&n('ilRetainedMortgage')>n('price')+n('assumed')){
  invalid.push('ilRetainedMortgage');$('ilRetainedMortgage').setAttribute('aria-invalid','true');
 }
 const valid=!invalid.length;document.body.dataset.sellerValid=String(valid);
 let notice=$('seller-validation');
 if(!notice){notice=document.createElement('p');notice.id='seller-validation';notice.setAttribute('role','alert');$('price').closest('section').prepend(notice);}
 notice.hidden=valid;
 notice.textContent=valid?'':showLang('Corrige los campos señalados antes de calcular o exportar. Un dato inválido no equivale a $0.','Correct the marked fields before calculating or exporting. Invalid data does not mean $0.');
 for(const id of ['printButton','csvButton'])$(id).disabled=!valid;
 if(!valid){
  for(const id of ['rPrice','rDebt','rCommission','rCredit','rTax','rLocal','rOther','rFees'])addText($(id),'—');
  addText($('netValue'),showLang('PENDIENTE: corrige los datos','PENDING: correct inputs'));
  addText($('netLabel'),showLang('Datos sin validar','Inputs require validation'));
  addText($('netDetail'),notice.textContent);addText($('taxExplanation'),notice.textContent);
  $('scenarios').replaceChildren();$('printReport')?.replaceChildren();
 }
 if(notify)document.dispatchEvent(new CustomEvent('ib:seller-validity',{detail:{valid}}));
 return valid;
}

export function prepareSellerValidation(html){
 const replace=(before,after)=>{
  if(!html.includes(before))throw Error('Seller validation contract changed: '+before.slice(0,70));
  html=html.replace(before,()=>after);
 };
 if(html.includes('function validateSellerInputs('))throw Error('Seller validation already applied');
 const a=html.indexOf('function parseCurrency(value){'),b=html.indexOf('function formatCurrencyField(',a);
 if(a<0||b<0)throw Error('Seller parser contract changed');
 html=html.slice(0,a)+parseSellerCurrency.toString().replace('parseSellerCurrency','parseCurrency')+'\n'+html.slice(b);
 replace('el.value=money(parseCurrency(el.value));','const parsed=parseCurrency(el.value);if(Number.isFinite(parsed))el.value=money(parsed);');
 replace('el.value=parseCurrency(el.value).toFixed(2);','const parsed=parseCurrency(el.value);if(Number.isFinite(parsed))el.value=parsed.toFixed(2);');
 replace('money(parseCurrency(raw))','(Number.isFinite(parseCurrency(raw))?money(parseCurrency(raw)):String(raw))');
 replace("return Number.isFinite(val)?Math.max(0,val):0",'return Number.isFinite(val)&&val>=0?val:NaN');
 replace('function render(){',validateSellerInputs.toString()+"\nwindow.IBSellerValidation={check:validateSellerInputs,parse:parseCurrency};\nfunction render(){");
 replace("$('mortgage2').disabled=!hasSecond;","$('mortgage2').disabled=!hasSecond;\n if(!validateSellerInputs())return;");
 replace("$('printButton').addEventListener('click',()=>window.print());","$('printButton').addEventListener('click',()=>{if(validateSellerInputs(false))window.print();});");
 replace("$('csvButton').addEventListener('click',()=>{","$('csvButton').addEventListener('click',()=>{\n if(!validateSellerInputs(false))return;");
 // A single residential condo/co-op is distinct from multiple units.
 replace('<option value="condo">Condominio / multifamiliar</option>','<option value="condo" disabled>Tipo anterior sin confirmar: selecciona el tipo actual</option><option value="condo_unit">Una unidad residencial de condominio / cooperativa</option><option value="multi">Multifamiliar / varias unidades</option>');
 replace('"Condominio / multifamiliar": "Condo / multi-family",','"Tipo anterior sin confirmar: selecciona el tipo actual": "Unconfirmed legacy type: choose the current property type",\n  "Una unidad residencial de condominio / cooperativa": "One residential condominium / cooperative unit",\n  "Multifamiliar / varias unidades": "Multifamily / multiple units",');
 // Ambiguous saved condo/multifamily values require confirmation, never an inferred exemption.
 html=html.replaceAll("$('propertyType').value!=='single'","!['single','condo_unit'].includes($('propertyType').value)");
 replace("miami&&prop!=='single'","miami&&!['single','condo_unit'].includes(prop)");
 replace("Florida Statutes §201.02','https://", "Florida Statutes §201.031','https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0200-0299/0201/Sections/0201.031.html','Una sola residencia, incluido un condominio residencial, queda exenta del recargo de Miami-Dade.'],['Florida Statutes §201.02','https://");
 return html;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [input,output]=process.argv.slice(2);
 if(!input||!output||input===output)throw Error('Usage: prepare-seller-validation.mjs PRIVATE_INPUT PRIVATE_OUTPUT');
 fs.writeFileSync(output,prepareSellerValidation(fs.readFileSync(input,'utf8')));
}
