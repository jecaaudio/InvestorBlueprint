/* Quick calculators on the public landing pages. They reuse the tested public
 * engine in tools/tool-script.js; the full tools stay behind sign-in. */
(function(){
 'use strict';
 const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
 const pct=value=>value===null||!Number.isFinite(value)?'N/A':value.toFixed(1)+'%';
 const english=()=>document.documentElement.lang==='en';
 const L=(es,en)=>english()?en:es;

 // Each calculator returns {main:[label,value], rows:[[label,value]...]}.
 const calculators={
  venta(v){
   const fees=v.price*(v.commissionPct+v.closingPct)/100;
   const net=v.price-v.mortgage-fees;
   return {main:[L('Neto estimado para el vendedor','Estimated seller net'),money(net)],
    rows:[[L('Comisiones y cierre','Commissions and closing'),money(fees)],[L('Hipoteca pagada','Mortgage payoff'),money(v.mortgage)]]};
  },
  flip(v){
   // Stated assumptions: 2% buyer closing, 6% commission, 1% seller closing, cash purchase.
   const r=window.IBCalculateFlipFinance({purchase:v.purchase,sale:v.sale,rehabTotal:v.rehab,buyerClosing:v.purchase*.02,
    titleFees:0,prorations:0,inspectionCost:0,monthlyHolding:v.monthly,holdingMonths:v.holdingMonths,realtorPct:6,concessionPct:0,
    sellerClosingPct:1,stagingCost:0,transferTax:0,isPro:false,financingType:'cash',loanAmount:0,loanPurchasePct:0,loanRehabPct:0,
    pointsPct:0,interestRate:0,drawFee:0,drawInspectionFee:0,drawCount:0,originationFees:0,loanClosingCosts:0,prepayPenalty:0,taxRate:0});
   return {main:[L('Ganancia estimada','Estimated profit'),money(r.netProfit)],
    rows:[[L('ROI sobre tu dinero','ROI on your cash'),pct(r.roi)],[L('Precio mínimo de venta','Break-even sale price'),money(r.breakEven)],
     [L('Oferta máxima (regla del 70%)','Max offer (70% rule)'),money(r.mao70)]]};
  },
  rentas(v){
   const r=window.IBSimpleFinanceModels.rentalModel(v.rent,v.vacancyRate,[v.expenses],{debtService:v.mortgage});
   return {main:[L('Flujo de caja mensual','Monthly cash flow'),money(r.monthlyCashFlow)],
    rows:[[L('Flujo anual','Annual cash flow'),money(r.annualCashFlow)],[L('Ingreso operativo neto (NOI) anual','Annual net operating income (NOI)'),money(r.annualNoi)]]};
  },
  arv(v){
   const r=window.IBSimpleFinanceModels.arvModel([v.comp1,v.comp2,v.comp3],v.repairs);
   return {main:[L('ARV estimado','Estimated ARV'),money(r.average)],
    rows:[[L('Rango de comparables','Comparable range'),money(r.minimum)+' – '+money(r.maximum)],[L('Oferta máxima (regla del 70%)','Max offer (70% rule)'),money(r.maxOffer)]]};
  },
  'hard-money'(v){
   const r=window.IBSimpleFinanceModels.hardMoneyModel(v.loan,v.interestRate,v.points,v.months);
   return {main:[L('Costo total del préstamo','Total financing cost'),money(r.totalCost)],
    rows:[[L('Intereses','Interest'),money(r.interestCost)],[L('Puntos','Points'),money(r.pointsCost)],[L('Interés mensual promedio','Average monthly interest'),money(r.monthlyInterest)]]};
  }
 };
 window.IBLandingCalculators=calculators;

 function init(){
  const form=document.querySelector('form[data-quick-calc]');
  if(!form)return;
  const kind=form.dataset.quickCalc,calc=calculators[kind];
  const result=document.getElementById('quick-result');
  if(!calc||!result)return;
  const parse=(name,value)=>window.IBParseFieldNumber?window.IBParseFieldNumber(name,value):Number(value);
  const render=()=>{
   const values={};let invalid=false;
   for(const input of form.querySelectorAll('input[name]')){
    const value=parse(input.name,input.value);
    const echo=input.parentElement.querySelector('small');
    const plain=Number(String(input.value).replace(/[$,\s%]/g,''));
    if(!Number.isFinite(value)||value<0){invalid=true;input.setAttribute('aria-invalid','true');if(echo)echo.textContent=L('Número no válido','Not a valid number');continue}
    input.removeAttribute('aria-invalid');
    if(echo)echo.textContent=value!==plain?L('Se lee como ','Read as ')+new Intl.NumberFormat('en-US',{maximumFractionDigits:4}).format(value):'';
    values[input.name]=value;
   }
   result.classList.toggle('is-invalid',invalid);
   if(invalid){result.innerHTML='<div class="lp-result-main"><strong>'+L('Revisa los números marcados','Check the marked numbers')+'</strong></div>';return}
   let out;
   try{out=calc(values)}catch(error){result.classList.add('is-invalid');result.innerHTML='<div class="lp-result-main"><strong>'+L('Revisa los números y los rangos','Check numbers and ranges')+'</strong></div>';return}
   const esc=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
   result.innerHTML='<div class="lp-result-main"><span>'+esc(out.main[0])+'</span><strong>'+esc(out.main[1])+'</strong></div><dl>'+
    out.rows.map(([label,value])=>'<dt>'+esc(label)+'</dt><dd>'+esc(value)+'</dd>').join('')+'</dl>';
  };
  form.addEventListener('input',render);
  form.addEventListener('submit',event=>{event.preventDefault();render()});
  document.addEventListener('ib:language-changed',render);
  render();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
