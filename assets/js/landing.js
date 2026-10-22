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
  const inputs=[...form.querySelectorAll('input[name]')];
  const moneyField=input=>!/(Pct|Rate|points|months|Months)$/.test(input.name);
  const formatInputs=()=>inputs.forEach(input=>{
   const value=parse(input.name,input.value);
   if(moneyField(input)&&Number.isFinite(value)&&value>=0)input.value=new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(value);
  });
  const scenarios=[];
  let current=null;
  const actions=document.createElement('div');actions.className='lp-scenario-actions';
  const compare=document.createElement('button');compare.type='button';compare.className='btn';
  const reset=document.createElement('button');reset.type='button';reset.className='btn';
  const comparison=document.createElement('section');comparison.className='lp-comparison';comparison.setAttribute('aria-live','polite');
  actions.append(compare,reset);result.after(actions,comparison);
  const renderComparison=()=>{
   compare.textContent=L('Comparar este escenario','Compare this scenario');
   compare.disabled=!current||scenarios.length>=3;
   reset.textContent=L('Restablecer ejemplo','Reset example');
   comparison.replaceChildren();
   if(!scenarios.length)return;
   const title=document.createElement('h3');title.textContent=L('Comparación en esta página','Comparison on this page');comparison.append(title);
   const note=document.createElement('p');note.textContent=L('Hasta 3 escenarios. Se borran al cerrar o recargar; no se guardan en tu cuenta. Importes en USD.','Up to 3 scenarios. Cleared when closing or reloading; not saved to your account. Amounts in USD.');comparison.append(note);
   scenarios.forEach((values,index)=>{
    const out=calc(values),card=document.createElement('article'),heading=document.createElement('h4');
    heading.textContent=L('Escenario ','Scenario ')+(index+1);card.append(heading);
    const details=document.createElement('dl');
    const rows=[out.main,...out.rows,...inputs.map(input=>[input.parentElement.querySelector('[data-es]')?.textContent||input.name,
     moneyField(input)?money(values[input.name]):String(values[input.name])])];
    rows.forEach(([label,value])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;details.append(dt,dd)});
    const restore=document.createElement('button');restore.type='button';restore.className='btn';restore.textContent=L('Usar escenario','Use scenario');
    restore.addEventListener('click',()=>{inputs.forEach(input=>{input.value=String(values[input.name])});formatInputs();render()});
    const remove=document.createElement('button');remove.type='button';remove.className='btn';remove.textContent=L('Quitar','Remove');
    remove.addEventListener('click',()=>{scenarios.splice(index,1);renderComparison()});
    card.append(details,restore,remove);comparison.append(card);
   });
  };
  const render=()=>{
   current=null;
   const values={};let invalid=false;
   for(const input of form.querySelectorAll('input[name]')){
    const value=parse(input.name,input.value);
    const echo=input.parentElement.querySelector('small');
    const plain=Number(String(input.value).replace(/[$,\s%]/g,''));
    if(!input.value.trim()||!Number.isFinite(value)||value<0||value>Number.MAX_SAFE_INTEGER||(/(Pct|Rate)$/.test(input.name)&&value>100)){
     invalid=true;input.setAttribute('aria-invalid','true');if(echo)echo.textContent=L('Número no válido','Not a valid number');continue}
    input.removeAttribute('aria-invalid');
    if(echo)echo.textContent=value!==plain?L('Se lee como ','Read as ')+new Intl.NumberFormat('en-US',{maximumFractionDigits:4}).format(value):'';
    values[input.name]=value;
   }
   result.classList.toggle('is-invalid',invalid);
   if(invalid){result.innerHTML='<div class="lp-result-main"><strong>'+L('Revisa los números marcados','Check the marked numbers')+'</strong></div>';renderComparison();return}
   let out;
   try{out=calc(values)}catch(error){result.classList.add('is-invalid');result.innerHTML='<div class="lp-result-main"><strong>'+L('Revisa los números y los rangos','Check numbers and ranges')+'</strong></div>';renderComparison();return}
   current={...values};
   const esc=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
   result.innerHTML='<div class="lp-result-main"><span>'+esc(out.main[0])+'</span><strong>'+esc(out.main[1])+'</strong></div><dl>'+
    out.rows.map(([label,value])=>'<dt>'+esc(label)+'</dt><dd>'+esc(value)+'</dd>').join('')+'</dl>';
   renderComparison();
  };
  compare.addEventListener('click',()=>{if(current&&scenarios.length<3){scenarios.push({...current});renderComparison()}});
  reset.addEventListener('click',()=>{form.reset();formatInputs();render()});
  form.addEventListener('focusout',event=>{if(inputs.includes(event.target)){formatInputs();render()}});
  form.addEventListener('input',render);
  form.addEventListener('submit',event=>{event.preventDefault();render()});
  document.addEventListener('ib:language-changed',render);
  formatInputs();render();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
