/* Dedicated bilingual printable statement. Values are taken from the calculator's live results. */
(function () {
 'use strict';
 const $=id=>document.getElementById(id);
 const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
 const num=id=>{
   const raw=String($(id)?.value??'').replace(/[^0-9.,-]/g,'');
   if(!raw)return 0;
   let normalized=raw;
   if(raw.includes(',')&&raw.includes('.'))normalized=raw.lastIndexOf(',')>raw.lastIndexOf('.')?raw.replace(/\./g,'').replace(',','.'):raw.replace(/,/g,'');
   else if(raw.includes(','))normalized=raw.split(',').length===2&&raw.split(',')[1].length<=2?raw.replace(',','.'):raw.replace(/,/g,'');
   const n=Number(normalized);return Number.isFinite(n)?Math.max(0,n):0;
 };
 const txt=id=>$(id)?.textContent?.trim()||'';
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const en=()=>document.documentElement.lang==='en';
 const L=(es,english)=>en()?english:es;
 const cell=(label,value,cls='')=>'<tr'+(cls?' class="'+cls+'"':'')+'><td>'+esc(label)+'</td><td>'+esc(value)+'</td></tr>';
 function createPrintMarkup(){
  const price=num('price');
  const pending=/PENDIENTE|PENDING/i.test(txt('rTax'));
  const state=$('state'),county=$('county'),kind=$('propertyType');
  const stateName=state?.selectedOptions?.[0]?.textContent?.trim()||state?.value||'—';
  const countyName=county?.selectedOptions?.[0]?.textContent?.trim()||'—';
  const kindName=kind?.selectedOptions?.[0]?.textContent?.trim()||'—';
  const pct=n=>new Intl.NumberFormat(en()?'en-US':'es-ES',{maximumFractionDigits:2}).format(n)+'%';
  const fees=[
   [L('Comisión agente del vendedor','Listing agent commission')+' ('+pct(num('listingPct'))+')',price*num('listingPct')/100],
   [L('Comisión agente comprador pagada por vendedor','Buyer agent commission paid by seller')+' ('+pct(num('buyerAgentPct'))+')',price*num('buyerAgentPct')/100],
   [L('Concesión porcentual al comprador','Buyer percentage concession')+' ('+pct(num('creditPct'))+')',price*num('creditPct')/100],
   [L('Concesión fija adicional','Additional fixed concession'),num('creditDollar')],
   [L('Título, cierre y documentos','Title, settlement and documents'),num('settlement')],
   [L('Honorarios administrativos','Administrative fees'),num('admin')],
   [L('Impuestos de propiedad prorrateados','Prorated property taxes'),num('propertyTax')],
   [L('Registro de escritura','Deed recording'),num('recording')],
   [L('Otros gastos del vendedor','Other seller costs'),num('misc')],
   [L('Impuesto base de transferencia: parte vendedor','Base transfer tax: seller share'),pending?L('PENDIENTE','PENDING'):txt('rTax')],
   [L('Impuestos locales declarados','Entered local transfer taxes'),num('localTax')]
  ];
  const feeRows=fees.filter(([,v])=>typeof v==='string'||v!==0).map(([k,v])=>cell(k,typeof v==='number'?money(v):v)).join('');
  const debts=[
    [L('Primera hipoteca','First mortgage'),num('mortgage1')],
    [L('Segunda hipoteca','Second mortgage'),num('mortgage2')],
    [L('Otros saldos e intereses de payoff','Other payoff balances and fees'),num('otherDebt')]
  ].filter(([,v])=>v!==0).map(([k,v])=>cell(k,money(v))).join('');
  const scenarioRows=[...($('scenarios')?.querySelectorAll('tr')||[])].map(tr=>{
    const vals=[...tr.querySelectorAll('td')].map(td=>td.textContent?.trim()||'');
    return '<tr>'+vals.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>';
  }).join('');
  const sourceRows=[...($('sourceList')?.querySelectorAll('.source')||[])].map(el=>{
    const name=el.querySelector('strong')?.textContent?.trim()||'';
    const link=el.querySelector('a'),href=link?.href||'';
    return '<div class="pr-source"><strong>'+esc(name)+'</strong>'+(href?' — <a href="'+esc(href)+'">'+L('Fuente oficial','Official source')+'</a>':'')+'</div>';
  }).join('');
  const date=new Intl.DateTimeFormat(en()?'en-US':'es-US',{year:'numeric',month:'long',day:'numeric'}).format(new Date());
  const statusNote=pending?
    L('El impuesto estatal de transferencia está pendiente de confirmación: el neto mostrado es parcial.','State transfer tax is not confirmed: net proceeds shown are partial.'):
    L('Los impuestos locales, exenciones y cargos finales deben verificarse para la jurisdicción y contrato.','Local taxes, exemptions, and final charges must be confirmed for the jurisdiction and contract.');
  return '<div class="pr-header">'+
    '<div><div class="pr-brand">InvestorBlueprint · Seller Net</div><h1>'+L('Estimación de venta inmobiliaria','Real estate sale estimate')+'</h1>'+
    '<div class="pr-subhead">'+L('Estado de liquidación estimado para el vendedor · USD','Estimated seller settlement statement · USD')+'</div></div>'+
    '<div class="pr-meta"><strong>'+L('Preparado','Prepared')+'</strong><div>'+esc(date)+'</div><div>'+L('Documento informativo','Informational estimate')+'</div></div></div>'+
    '<div class="pr-property">'+
      '<div><span>'+L('Estado','State')+'</span><strong>'+esc(stateName)+'</strong></div>'+
      '<div><span>'+L('Condado / jurisdicción','County / jurisdiction')+'</span><strong>'+esc(countyName)+'</strong></div>'+
      '<div><span>'+L('Ciudad','City')+'</span><strong>'+esc($('city')?.value?.trim()||'—')+'</strong></div>'+
      '<div><span>'+L('Propiedad','Property type')+'</span><strong>'+esc(kindName)+'</strong></div></div>'+
    '<div class="pr-summary">'+
      '<div class="pr-metric"><span>'+L('Precio de venta','Sale price')+'</span><strong>'+esc(txt('rPrice'))+'</strong></div>'+
      '<div class="pr-metric"><span>'+L('Pago de deudas','Debt payoffs')+'</span><strong>'+esc(txt('rDebt'))+'</strong></div>'+
      '<div class="pr-metric"><span>'+L('Gastos de venta','Selling costs')+'</span><strong>'+esc(txt('rFees').replace(/\s*\+.*/,''))+'</strong></div>'+
      '<div class="pr-metric primary"><span>'+(pending?L('Neto parcial','Partial net'):L('Neto estimado','Estimated net'))+'</span><strong>'+esc(txt('netValue'))+'</strong></div></div>'+
    '<section class="pr-section"><h2>01 · '+L('Hipotecas y saldos a liquidar','Mortgage and debt payoffs')+'</h2>'+
      '<table class="pr-table"><tbody>'+debts+cell(L('Total deudas','Total debt payoffs'),txt('rDebt'),'pr-total')+'</tbody></table></section>'+
    '<section class="pr-section"><h2>02 · '+L('Gastos, comisiones e impuestos del vendedor','Seller costs, commissions and taxes')+'</h2>'+
      '<table class="pr-table"><tbody>'+feeRows+cell(L('Total gastos de venta','Total selling costs'),txt('rFees'),'pr-total')+'</tbody></table>'+
      '<p class="pr-note">'+L('Los cargos de $0 no aparecen en este desglose. Las comisiones y concesiones son negociadas.','Zero-dollar line items are omitted. Commissions and concessions are negotiated.')+'</p></section>'+
    '<div class="pr-flag"><strong>'+L('Validación pendiente:','Verification required:')+'</strong> '+statusNote+' '+L('No dupliques comisiones dentro de concesiones.','Do not duplicate commission payments within concessions.')+'</div>'+
    '<section class="pr-section"><h2>03 · '+L('Comparación de escenarios','Scenario comparison')+'</h2>'+
      '<table class="pr-table pr-scenario-table"><thead><tr><th>'+L('Precio de venta','Sale price')+'</th><th style="text-align:right">'+L('Gastos de venta','Selling costs')+'</th><th style="text-align:right">'+L('Neto vendedor','Seller net')+'</th></tr></thead><tbody>'+scenarioRows+'</tbody></table></section>'+
    '<section class="pr-section pr-sources"><h2>04 · '+L('Base legal y fuentes oficiales','Legal basis and official sources')+'</h2>'+
      (sourceRows||'<p class="pr-note">'+L('La fórmula de este estado todavía no está verificada; consulte la autoridad oficial.','The tax formula is not yet verified for this state; consult the official authority.')+'</p>')+
      '<p class="pr-note">'+L('El listado de condados no implica que sus impuestos locales estén verificados.','County selection does not mean local taxes have been verified.')+'</p></section>'+
    '<div class="pr-disclaimer">'+L('Estimación informativa, no es un Closing Disclosure ni un ALTA Settlement Statement. Los saldos reales de payoff, prorrateos, impuestos, exenciones, cargos y distribución contractual de gastos deben confirmarse con la compañía de título. El neto recibido no equivale a la ganancia fiscal.','Informational estimate, not a Closing Disclosure or ALTA Settlement Statement. Actual payoffs, prorations, taxes, exemptions, fees, and contractual cost allocation must be confirmed by the title company. Net proceeds are not taxable capital gains.')+'</div>'+
    '<div class="pr-footer">InvestorBlueprint · '+L('Calculadora de Venta','Seller Net Calculator')+' · '+esc(date)+'</div>';
 }
 function refresh(){
   const holder=$('printReport');
   if(holder&&$('netValue')&&$('scenarios'))holder.innerHTML=createPrintMarkup();
 }
 function init(){
  if(!$('printReport')){
    const sec=document.createElement('section');sec.id='printReport';
    sec.setAttribute('aria-label','Print-ready seller settlement estimate');
    document.body.appendChild(sec);
  }
  $('printButton')?.addEventListener('click',refresh,true);
  window.addEventListener('beforeprint',refresh);
  refresh();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
 else init();
})();