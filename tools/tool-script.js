(function () {
  const checkNumber=(name,value,max=Infinity,allowNegative=false)=>{
    if(typeof value!=='number'||!Number.isFinite(value)||(!allowNegative&&value<0)||value>max)throw new RangeError('Invalid financial input: '+name);
  };
  const checkedResult=result=>{
    for(const value of Object.values(result))if(typeof value==='number'&&!Number.isFinite(value))throw new RangeError('Financial result exceeds numeric limits');
    return result;
  };
  // Accepts US (250,000.50) and Spanish (250.000,50) notation. A dot followed by
  // groups of exactly three digits is a thousands separator, so 250.000 is 250000,
  // never 250. A comma with one or two trailing digits is a decimal comma.
  const parseFinanceNumber=value=>{
    if(typeof value==='number')return Number.isFinite(value)?value:NaN;
    let clean=String(value??'').trim();if(!clean)return 0;
    clean=clean.replace(/^([+-]?)\$\s*/,'$1');
    const sign=/^[+-]/.test(clean)?clean[0]:'';
    let body=sign?clean.slice(1):clean;
    if(/^[1-9]\d{0,2}(,\d{3})+(\.\d+)?$/.test(body))body=body.replace(/,/g,'');
    else if(/^[1-9]\d{0,2}(\.\d{3})+(,\d+)?$/.test(body))body=body.replace(/\./g,'').replace(',','.');
    else if(/^\d+,\d{1,2}$/.test(body))body=body.replace(',','.');
    else if(body.includes(','))return NaN;
    if(!/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(body))return NaN;
    const parsed=Number(sign+body);return Number.isFinite(parsed)?parsed:NaN;
  };
  if(typeof window!=='undefined')window.IBParseFinanceNumber=parseFinanceNumber;
  // Percentages, months and counts never use thousands separators, so 7.125 stays
  // 7.125 (a common US rate) and a decimal comma (7,5) is also accepted.
  const parseRatioNumber=value=>{
    if(typeof value==='number')return Number.isFinite(value)?value:NaN;
    let clean=String(value??'').trim().replace(/\s*%$/,'');if(!clean)return 0;
    if(/^[+-]?\d+,\d+$/.test(clean))clean=clean.replace(',','.');
    if(!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(clean))return NaN;
    const parsed=Number(clean);return Number.isFinite(parsed)?parsed:NaN;
  };
  const isRatioField=name=>/(pct|rate|points|months|count|yield|occupancy|roi|return)$/i.test(String(name||''));
  const parseFieldNumber=(name,value)=>isRatioField(name)?parseRatioNumber(value):parseFinanceNumber(value);
  if(typeof window!=='undefined')window.IBParseFieldNumber=parseFieldNumber;
  // Pure flip model; full-draw interest is a conservative simplified estimate.
  const calculateFlipFinance = (x) => {
    for(const key of ['purchase','sale','rehabTotal','buyerClosing','titleFees','inspectionCost','monthlyHolding','holdingMonths','stagingCost','transferTax','loanAmount','drawFee','drawInspectionFee','drawCount','originationFees','loanClosingCosts','prepayPenalty'])checkNumber(key,x[key]);
    checkNumber('prorations',x.prorations,Infinity,true);
    for(const key of ['realtorPct','concessionPct','sellerClosingPct','loanPurchasePct','loanRehabPct','pointsPct','interestRate','taxRate'])checkNumber(key,x[key],100);
    const acquisition=x.purchase+x.buyerClosing+x.titleFees+x.prorations+x.inspectionCost;
    const holdingTotal=x.monthlyHolding*x.holdingMonths;
    const sellingRate=(x.realtorPct+x.concessionPct+x.sellerClosingPct)/100;
    const sellingFixed=x.stagingCost+x.transferTax;
    const isFinanced=x.isPro&&x.financingType!=='cash';
    const derivedLoan=x.purchase*x.loanPurchasePct/100+x.rehabTotal*x.loanRehabPct/100;
    const fundedPrincipal=isFinanced?(x.loanAmount>0?x.loanAmount:derivedLoan):0;
    const financing=isFinanced?hardMoneyModel(fundedPrincipal,x.interestRate,x.pointsPct,x.holdingMonths,{
      draws:x.draws,interestMethod:x.interestMethod||'simple',
      fees:(x.drawFee+x.drawInspectionFee)*x.drawCount+x.originationFees+x.loanClosingCosts+x.prepayPenalty
    }):{totalCost:0,drawnPrincipal:0};
    const financeCosts=financing.totalCost;
    const fixedCosts=acquisition+x.rehabTotal+holdingTotal+sellingFixed+financeCosts;
    function profitAtSale(gross){
      const beforeTax=gross-fixedCosts-gross*sellingRate;
      const provisionalTax=Math.max(0,beforeTax)*x.taxRate/100;
      return {profit:beforeTax-provisionalTax,sellingTotal:sellingFixed+gross*sellingRate,tax:provisionalTax};
    }
    const base=profitAtSale(x.sale);
    const cashCommitted=acquisition+x.rehabTotal+holdingTotal+financeCosts-financing.drawnPrincipal;
    return checkedResult({
      acquisition,holdingTotal,rehabTotal:x.rehabTotal,financedAmount:financing.drawnPrincipal,committedLoan:fundedPrincipal,
      financingTotal:financeCosts,sellingTotal:base.sellingTotal,
      taxAmount:base.tax,totalCosts:x.sale-base.profit,netProfit:base.profit,
      cashCommitted,roi:cashCommitted>0?base.profit/cashCommitted*100:null,
      breakEven:sellingRate<1?fixedCosts/(1-sellingRate):null,
      mao70:x.sale*0.7-x.rehabTotal,
      scenarioLow:profitAtSale(x.sale*0.95).profit,
      scenarioBase:base.profit,
      scenarioHigh:profitAtSale(x.sale*1.05).profit
    });
  };
  if(typeof window!=='undefined')window.IBCalculateFlipFinance=calculateFlipFinance;

  // Simplified tools are deterministic and explicitly exclude unmodeled costs.
  const rentalModel=(monthlyRent,vacancyRate,expenses,options={})=>{
    checkNumber('monthlyRent',monthlyRent);checkNumber('vacancyRate',vacancyRate,100);
    if(!Array.isArray(expenses))throw new RangeError('Expenses must be an array');
    expenses.forEach(value=>checkNumber('expense',value));
    const extra={debtService:0,capitalReserve:0,hoa:0,utilities:0,otherExpenses:0,cashInvested:0,totalBasis:0,...options};
    for(const [key,value] of Object.entries(extra))checkNumber(key,value);
    const effectiveIncome=monthlyRent*(1-vacancyRate/100);
    const operatingExpenses=expenses.reduce((a,b)=>a+b,0)+extra.hoa+extra.utilities+extra.otherExpenses;
    const monthlyNoi=effectiveIncome-operatingExpenses;
    const monthly=monthlyNoi-extra.debtService-extra.capitalReserve;
    return checkedResult({effectiveIncome,operatingExpenses,monthlyNoi,annualNoi:monthlyNoi*12,
      monthlyCashFlow:monthly,annualCashFlow:monthly*12,
      annualDebtService:extra.debtService*12,annualReserve:extra.capitalReserve*12,
      cashOnCash:extra.cashInvested>0?monthly*12/extra.cashInvested*100:null,
      capRate:extra.totalBasis>0?monthlyNoi*12/extra.totalBasis*100:null});
  };
  const rentModel=(value,annualExpenses,targetGrossYield,occupancy)=>{
    checkNumber('value',value);checkNumber('annualExpenses',annualExpenses);
    checkNumber('targetGrossYield',targetGrossYield,100);checkNumber('occupancy',occupancy,100);
    const grossRent=value>0&&occupancy>0?value*targetGrossYield/100/(12*occupancy/100):null;
    const collected=grossRent===null?0:grossRent*12*occupancy/100;
    return checkedResult({suggestedMonthlyRent:grossRent,annualIncome:collected,
      grossYield:value>0?collected/value*100:null,netAfterExpenses:collected-annualExpenses});
  };
  const arvModel=(comps,repairs,adjustments=comps?.map(()=>0))=>{
    if(!Array.isArray(comps)||!comps.length)throw new RangeError('Comparable sales required');
    comps.forEach(value=>{checkNumber('comparable',value);if(value===0)throw new RangeError('Comparable price must be positive')});
    checkNumber('repairs',repairs);
    if(!Array.isArray(adjustments)||adjustments.length!==comps.length)throw new RangeError('One signed adjustment per comparable required');
    const adjusted=comps.map((value,i)=>{
      checkNumber('comparable adjustment',adjustments[i],Infinity,true);
      const result=value+adjustments[i];checkNumber('adjusted comparable',result);
      if(result===0)throw new RangeError('Adjusted price must be positive');return result;
    });
    const average=adjusted.reduce((sum,x)=>sum+x/adjusted.length,0);
    return checkedResult({average,maxOffer:average*.70-repairs,minimum:Math.min(...adjusted),maximum:Math.max(...adjusted)});
  };
  const hardMoneyModel=(loan,rate,points,months,options={})=>{
    checkNumber('loan',loan);checkNumber('rate',rate,100);checkNumber('points',points,100);checkNumber('months',months);
    const fees=options.fees??0;checkNumber('fees',fees);
    const method=options.interestMethod??'simple';
    if(!['simple','monthly-compound'].includes(method))throw new RangeError('Invalid interest method');
    const draws=options.draws===undefined?[{month:0,amount:loan}]:options.draws;
    if(!Array.isArray(draws)||!draws.length)throw new RangeError('Loan draw schedule required');
    let drawnPrincipal=0,interestCost=0;
    for(const draw of draws){
      checkNumber('draw month',draw?.month,months);checkNumber('draw amount',draw?.amount);
      drawnPrincipal+=draw.amount;
      if(drawnPrincipal>loan)throw new RangeError('Draws exceed committed loan amount');
      const duration=months-draw.month,monthlyRate=rate/1200;
      const growth=method==='simple'?monthlyRate*duration:
        Math.pow(1+monthlyRate,Math.floor(duration))*(1+monthlyRate*(duration%1))-1;
      interestCost+=draw.amount*growth;
    }
    const pointsCost=loan*points/100;
    return checkedResult({interestCost,pointsCost,fees,drawnPrincipal,
      totalCost:pointsCost+interestCost+fees,
      monthlyInterest:months>0?interestCost/months:0});
  };
  if(typeof window!=='undefined'){
    window.IBSimpleFinanceModels={rentalModel,rentModel,arvModel,hardMoneyModel};
  }

  const onDomReady = (callback) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
      return;
    }
    callback();
  };

  // The private tool pages carry some fixed English text without data-i18n keys.
  // Translate those exact strings (text, tooltips, aria labels) with the page language.
  const STATIC_ES={
    'Flip Calculator':'Calculadora de Flip','Inputs':'Datos del proyecto',
    'Financial diagnostics with live updates and resilient validation.':'Calcula ganancia, ROI, precio de equilibrio y oferta máxima de un flip.',
    'ARV':'ARV (precio de venta esperado)','Purchase Price':'Precio de compra','Rehab Costs':'Costo de reparación',
    'Holding Months':'Meses hasta vender','Holding Monthly Cost':'Costo mensual mientras la tienes',
    'Buy Closing Costs':'Costos de cierre de compra','Sell Closing Costs':'Costos de cierre de venta',
    'Agent Commission %':'Comisión de agentes %','Loan Amount':'Monto del préstamo','Interest Rate %':'Tasa de interés anual %',
    'Points %':'Puntos %','Down Payment':'Pago inicial',
    'Estimated value after repairs based on recent comparable sales.':'Valor estimado después de reparar, según ventas comparables recientes.',
    'Agreed purchase price (excluding closing costs).':'Precio de compra acordado, sin costos de cierre.',
    'Total renovation cost (materials, labor, and permits).':'Costo total de la remodelación: materiales, mano de obra y permisos.',
    'Estimated months from purchase to sale.':'Meses estimados desde la compra hasta la venta.',
    'Monthly carrying costs: taxes, insurance, utilities, lawn care, etc.':'Gastos de cada mes: impuestos, seguro, servicios, jardín, etc.',
    'Closing costs when buying: title, lender fees, recording, etc.':'Costos al comprar: título, cargos del prestamista, registro, etc.',
    'Closing costs when selling (excluding agent commission).':'Costos al vender, sin contar la comisión de agentes.',
    'Total commission percentage (listing + buyer agent).':'Porcentaje total de comisión (agente vendedor + agente comprador).',
    'Borrowed amount (hard money/loan).':'Monto prestado (hard money u otro préstamo).',
    'Annual loan interest rate.':'Tasa de interés anual del préstamo.',
    'Loan points (upfront fee). 1 point = 1% of the loan amount.':'Puntos del préstamo (cargo inicial). 1 punto = 1% del monto prestado.',
    'Cash you bring to closing (if applicable).':'Efectivo que llevas al cierre, si aplica.',
    'What is ARV?':'¿Qué es el ARV?','What is Purchase Price?':'¿Qué es el precio de compra?','What are Rehab Costs?':'¿Qué es el costo de reparación?',
    'What are Holding Months?':'¿Qué son los meses hasta vender?','What is Holding Monthly Cost?':'¿Qué es el costo mensual?',
    'What are Buy Closing Costs?':'¿Qué son los costos de cierre de compra?','What are Sell Closing Costs?':'¿Qué son los costos de cierre de venta?',
    'What is Agent Commission?':'¿Qué es la comisión de agentes?','What is Loan Amount?':'¿Qué es el monto del préstamo?',
    'What is Interest Rate?':'¿Qué es la tasa de interés?','What are Points?':'¿Qué son los puntos?','What is Down Payment?':'¿Qué es el pago inicial?',
    'Net Profit':'Ganancia neta','Total Costs':'Costos totales','Break-even Sale Price':'Precio de venta de equilibrio',
    'Max Offer (70% Rule)':'Oferta máxima (regla del 70%)','Decision':'Decisión',
    'Income':'Ingresos','Use signed lease rent before expenses.':'Usa la renta del contrato firmado, antes de gastos.',
    'Expenses & assumptions':'Gastos y supuestos','Reserve 5–10% of monthly rent for repairs.':'Reserva entre 5% y 10% de la renta mensual para reparaciones.',
    'Typical stabilized vacancy is 3%–8%.':'La vacancia típica de una propiedad estabilizada es de 3% a 8%.',
    'Property assumptions':'Datos de la propiedad','Include taxes, insurance and maintenance.':'Incluye impuestos, seguro y mantenimiento.',
    'Yield goals':'Metas de rendimiento','Use realistic occupancy based on your local market.':'Usa una ocupación realista para tu mercado.',
    'Comparable sales':'Ventas comparables','Use sold comps from the last 3–6 months nearby.':'Usa ventas cercanas cerradas en los últimos 3 a 6 meses.',
    'Deal assumptions':'Supuestos de la operación','Loan terms':'Condiciones del préstamo',
    'Enter total amount financed by the lender.':'Escribe el monto total que financia el prestamista.','months':'meses',
    'Beta: tool available. Please send feedback below.':'Beta: herramienta disponible. Envíanos tus comentarios.',
    'Use example':'Usar ejemplo','Reset':'Restablecer','ROI map':'Mapa de ROI',
    'Send Feedback':'Enviar comentarios','Tool':'Herramienta','Your feedback':'Tus comentarios','Send':'Enviar',
    'Close feedback modal':'Cerrar comentarios','Tell us what is working and what we should improve.':'Cuéntanos qué funciona y qué debemos mejorar.'
  };
  const translateStaticText=()=>{
    if(typeof document==='undefined'||!document.body)return;
    const spanish=document.documentElement.lang!=='en';
    const skip='script,style,textarea,[data-i18n],#ib-finance-report,#printReport';
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    for(const node of nodes){
      if(node.parentElement?.closest(skip))continue;
      node.ibEnglish??=node.textContent.trim();
      const english=node.ibEnglish,target=spanish?STATIC_ES[english]:english;
      if(!STATIC_ES[english]||!target)continue;
      const current=node.textContent.trim();
      if(current!==target)node.textContent=node.textContent.replace(current,target);
    }
    for(const attr of ['data-tooltip','aria-label','placeholder']){
      for(const el of document.body.querySelectorAll('['+attr+']')){
        if(el.closest('#ib-finance-report,#printReport'))continue;
        const store='ibEn'+attr.replace(/(^|-)(\w)/g,(m,a,c)=>c.toUpperCase());
        el.dataset[store]??=el.getAttribute(attr);
        const english=el.dataset[store];
        if(STATIC_ES[english])el.setAttribute(attr,spanish?STATIC_ES[english]:english);
      }
    }
  };
  if(typeof window!=='undefined')window.IBTranslateStaticText=translateStaticText;
  if(typeof window?.addEventListener==='function'&&typeof document?.addEventListener==='function'){
    document.addEventListener('ib:language-changed',translateStaticText);
    window.addEventListener('load',translateStaticText);
  }

  onDomReady(() => {
  translateStaticText();
  const form = document.getElementById('tool-form');
  const output = document.getElementById('result-detail') || document.getElementById('result');
  const cards = document.getElementById('result-cards');
  const type = document.body.dataset.tool;
  const planHint = document.getElementById('plan-hint');
  const sampleBtn = document.getElementById('load-sample');

  if (!form || !type) return;

  if(type==='roi_search'){
    const group=document.createElement('fieldset');
    group.innerHTML='<legend data-i18n="roiMetricTitle">Return metric · simulated inventory</legend>'+
      '<label for="returnMetric" data-i18n="roiMetricLabel">Filter by</label>'+
      '<select id="returnMetric" name="returnMetric"><option value="cocReturn" data-i18n="roiMetricCash">Annual cash-on-cash return</option><option value="capRate" data-i18n="roiMetricCap">Capitalization rate (NOI / property value)</option></select>'+
      '<p data-i18n="roiMetricHelp">Choose one metric. Cap rate excludes financing; cash-on-cash uses equity. These fixed examples are simulated, not available listings.</p>';
    form.insertBefore(group,form.querySelector('.tool-actions'));
    const header=document.querySelector('#result-rows')?.closest('table')?.querySelector('thead tr');
    if(header){const cap=header.lastElementChild;cap.dataset.i18n='roiMetricCapShort';cap.textContent='Cap rate';const cash=document.createElement('th');cash.dataset.i18n='roiMetricCashShort';cash.textContent='Cash-on-cash';header.append(cash);}
  }

  if (window.IBAnalytics && typeof window.IBAnalytics.trackToolOpen === 'function') {
    window.IBAnalytics.trackToolOpen(type);
  }

  const parseNumeric = parseFinanceNumber;

  const money = (value) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits:0,maximumFractionDigits: 2 }).format(Number(value) || 0);
  const pct = (value) => `${(Number(value) || 0).toFixed(1)}%`;

  const getMessages = () => window.IBI18n?.getCurrentMessages?.() || {};
  const t = (key, fallback = '') => getMessages()[key] || fallback;

  // Optional lender/ownership costs are explicit inputs, never inferred market rates.
  if(type==='rental'){
    const fields=[['debtService','rentalDebtService'],['capitalReserve','rentalCapitalReserve'],
      ['hoa','rentalHoa'],['utilities','rentalUtilities'],['otherExpenses','rentalOtherExpenses'],
      ['cashInvested','rentalCashInvested'],['totalBasis','rentalTotalBasis']];
    const section=document.createElement('fieldset');
    const legend=document.createElement('legend');legend.dataset.i18n='rentalOwnershipCosts';
    legend.textContent=t('rentalOwnershipCosts','Financing, reserves and invested capital');section.append(legend);
    for(const [id,key] of fields){
      const group=document.createElement('div');group.className='form-group';
      const label=document.createElement('label');label.htmlFor=id;label.dataset.i18n=key;label.textContent=t(key,id);
      const input=document.createElement('input');Object.assign(input,{id,name:id,type:'number',min:'0',step:'0.01',value:'0'});
      input.inputMode='decimal';input.setAttribute('aria-describedby',id+'-error');
      const error=document.createElement('p');error.id=id+'-error';error.className='field-error';error.hidden=true;error.setAttribute('role','alert');
      group.append(label,input,error);section.append(group);
    }
    form.insertBefore(section,form.querySelector('.tool-actions'));
  }
  if(type==='hard-money'||type==='flip'){
    const section=document.createElement('fieldset');
    if(type==='flip')section.className='pro-only is-hidden';
    section.innerHTML='<legend data-i18n="loanScheduleTitle">Loan draw schedule and interest method</legend>'+
      '<label for="interestMethod" data-i18n="loanInterestMethod">Interest method</label>'+
      '<select id="interestMethod" name="interestMethod"><option value="simple" data-i18n="loanSimple">Simple interest</option><option value="monthly-compound" data-i18n="loanCompound">Monthly capitalized interest</option></select>'+
      '<label for="loanDraws" data-i18n="loanDraws">Draws: month:amount, one per line (optional)</label>'+
      '<textarea id="loanDraws" name="loanDraws" rows="4" maxlength="10000" placeholder="0:100000&#10;3:25000" aria-describedby="loanDrawHelp"></textarea>'+
      '<p id="loanDrawHelp" data-i18n="loanDrawHelp">Blank means the full committed loan is funded at month zero. Enter actual draws only. Points apply to the committed loan. Monthly compounding assumes unpaid interest is capitalized, with simple accrual for the final partial month.</p>';
    if(type==='hard-money')section.innerHTML+='<label for="lenderFees" data-i18n="loanLenderFees">Total lender fees, draw/inspection fees and penalties (USD)</label><input id="lenderFees" name="lenderFees" type="number" min="0" step="0.01" value="0"><p id="lenderFees-error" class="field-error" role="alert" hidden></p>';
    form.insertBefore(section,form.querySelector('.tool-actions'));
  }
  if(type==='arv'){
    const section=document.createElement('fieldset');
    section.innerHTML='<legend data-i18n="arvAdjustmentsTitle">Documented comparable adjustments</legend><p data-i18n="arvAdjustmentsHelp">Enter signed dollar adjustments supported by condition, size, date or location evidence. Positive adds to the comparable; negative subtracts. Zero means no adjustment. The tool does not verify that a sale closed.</p>';
    for(let i=1;i<=3;i++){
      const group=document.createElement('div');
      group.innerHTML='<label for="comp'+i+'Adjustment"><span data-i18n="arvCompAdjustment">Signed adjustment (USD)</span> '+i+'</label><input id="comp'+i+'Adjustment" name="comp'+i+'Adjustment" type="number" step="0.01" value="0"><p id="comp'+i+'Adjustment-error" class="field-error" hidden></p>'+
        '<label for="comp'+i+'Evidence"><span data-i18n="arvCompEvidence">Sale date, source and adjustment evidence</span> '+i+'</label><textarea id="comp'+i+'Evidence" name="comp'+i+'Evidence" maxlength="1500" rows="3"></textarea>';
      section.append(group);
    }
    form.insertBefore(section,form.querySelector('.tool-actions'));
  }
  const readLoanSchedule=()=>{
    const raw=form.elements.loanDraws?.value.trim();
    if(!raw)return undefined;
    return raw.split(/\r?\n/).filter(line=>line.trim()).map(line=>{
      const parts=line.split(':');
      if(parts.length!==2||parts.some(value=>!value.trim()))throw new RangeError('Invalid draw schedule');
      return {month:parseFinanceNumber(parts[0]),amount:parseFinanceNumber(parts[1])};
    });
  };
  form.querySelectorAll('[data-i18n]').forEach(node=>{
    const value=getMessages()[node.dataset.i18n];if(value)node.textContent=value;
  });

  const setupCurrencyInputs = () => {
    form.querySelectorAll('input[data-format="currency"]').forEach((input) => {
      input.placeholder = '$0';
      input.inputMode = 'decimal';

      input.addEventListener('focus', () => {
        const value = parseNumeric(input.value);
        if(Number.isFinite(value))input.value = value ? String(value) : '';
      });

      input.addEventListener('blur', () => {
        const value = parseNumeric(input.value);
        if(Number.isFinite(value))input.value = input.value.trim() ? money(value) : '';
      });

      if (input.value) {
        const value = parseNumeric(input.value);
        if(Number.isFinite(value))input.value = money(value);
      }
    });
  };

  setupCurrencyInputs();

  // Native number fields read the Spanish "250.000" as 250 without any warning.
  // Make every numeric field a decimal text field parsed by parseFinanceNumber,
  // and show how an entry was read whenever it differs from a plain US reading.
  const setupLocaleNumbers=()=>{
    const english=()=>document.documentElement.lang==='en';
    form.querySelectorAll('input[type="number"]').forEach(input=>{
      input.type='text';input.inputMode='decimal';input.autocomplete='off';
    });
    form.querySelectorAll('input[inputmode="decimal"],input[data-format="currency"]').forEach(input=>{
      if(input.dataset.ibNumberEcho||!input.id)return;
      input.dataset.ibNumberEcho='true';
      const echo=document.createElement('small');
      echo.id=input.id+'-read-as';echo.className='ib-number-echo';echo.hidden=true;echo.setAttribute('aria-live','polite');
      const anchor=input.parentElement?.classList.contains('input-control')?input.parentElement:input;
      anchor.after(echo);
      input.setAttribute('aria-describedby',[input.getAttribute('aria-describedby'),echo.id].filter(Boolean).join(' '));
      const update=()=>{
        const raw=input.value.trim();
        const plain=Number(raw.replace(/^([+-]?)\$\s*/,'$1').replace(/\s*%$/,'').replace(/,/g,''));
        const read=parseFieldNumber(input.name||input.id,raw);
        if(!raw||read===plain){echo.hidden=true;echo.textContent='';return;}
        echo.hidden=false;
        echo.textContent=Number.isFinite(read)
          ?(english()?'Read as ':'Se lee como ')+new Intl.NumberFormat('en-US',{maximumFractionDigits:6}).format(read)
          :(english()?'Not a valid number. Example: 250,000 or 250.000':'Número no válido. Ejemplo: 250,000 o 250.000');
      };
      input.addEventListener('input',update);input.addEventListener('blur',update);update();
    });
    if(!document.getElementById('ib-number-echo-style')){
      const style=document.createElement('style');style.id='ib-number-echo-style';
      style.textContent='.ib-number-echo{display:block;margin-top:4px;font-size:.82rem;font-weight:600;color:#0a6fd1}.ib-number-echo[hidden]{display:none}';
      document.head.append(style);
    }
  };
  setupLocaleNumbers();

  const syncPlanMode = () => {
    if (type !== 'flip') return;
    const selected = form.querySelector('input[name="planMode"]:checked')?.value || 'free';
    const isPro = selected === 'pro';
    form.querySelectorAll('.pro-only').forEach((section) => section.classList.toggle('is-hidden', !isPro));
    if (planHint) {
      planHint.textContent = isPro ? t('proHint', 'Pro mode enabled: includes financing stack, MAO strategy checks, risk buffer and sensitivity table.') : t('freeHint', 'Free mode: quick estimate with purchase, rehab, holding and sale costs only.');
    }
  };

  const setCards = (items) => {
    if (!cards) return;
    cards.innerHTML = items
      .map((item) => `<div class="metric"><strong>${item.label}</strong><span>${item.value}</span></div>`)
      .join('');
  };


  const validationFeedback = document.getElementById('tool-validation');

  const showValidationError = (message) => {
    if (!validationFeedback) return;
    validationFeedback.hidden = false;
    validationFeedback.textContent = message;
  };

  const clearValidationError = () => {
    if (!validationFeedback) return;
    validationFeedback.hidden = true;
    validationFeedback.textContent = '';
  };

  const clearFieldErrors = () => {
    form.querySelectorAll('.field-error').forEach((node) => {
      node.hidden = true;
      node.textContent = '';
    });
    form.querySelectorAll('input, select').forEach((input) => input.removeAttribute('aria-invalid'));
  };

  const setFieldError = (name, message) => {
    const input = form.elements[name];
    const errorNode = document.getElementById(`${name}-error`);
    if (!input || !errorNode) return;
    input.setAttribute('aria-invalid', 'true');
    errorNode.hidden = false;
    errorNode.textContent = message;
  };

  const validateFields = (rules, messages) => {
    clearFieldErrors();
    const invalid = [];
    rules.forEach((rule) => {
      const value = parseFieldNumber(rule.name, form.elements[rule.name]?.value);
      const isBlank = String(form.elements[rule.name]?.value || '').trim() === '';
      if (rule.required && isBlank) {
        setFieldError(rule.name, messages.requiredField);
        invalid.push(rule.name);
        return;
      }
      if (!Number.isFinite(value)) {
        setFieldError(rule.name, messages.outOfRange);
        invalid.push(rule.name);
        return;
      }
      if (!rule.allowNegative && value < 0) {
        setFieldError(rule.name, messages.cannotBeNegative);
        invalid.push(rule.name);
        return;
      }
      if (rule.min !== undefined && value < rule.min) {
        setFieldError(rule.name, messages.outOfRange);
        invalid.push(rule.name);
        return;
      }
      if (rule.max !== undefined && value > rule.max) {
        setFieldError(rule.name, messages.outOfRange);
        invalid.push(rule.name);
      }
    });

    if (invalid.length) {
      showValidationError(messages.outOfRange);
      form.elements[invalid[0]]?.focus();
      return false;
    }
    return true;
  };

  const requiredFields = ['salePrice', 'purchasePrice', 'rehabCost'];
  const validateFlip = (messages) => {
    let valid = true;
    requiredFields.forEach((field) => {
      const input = form.elements[field];
      if (!input) return;
      input.setCustomValidity('');
      if (!input.value) {
        input.setCustomValidity(messages.requiredField);
        valid = false;
      } else if (!Number.isFinite(parseNumeric(input.value))) {
        input.setCustomValidity(messages.outOfRange||'Enter a valid number.');
        valid = false;
      } else if (parseNumeric(input.value) < 0) {
        input.setCustomValidity(messages.cannotBeNegative);
        valid = false;
      }
    });
    return form.reportValidity() && valid;
  };

  if (type === 'flip') {
    form.querySelectorAll('input[name="planMode"]').forEach((input) => input.addEventListener('change', syncPlanMode));
    syncPlanMode();

    form.addEventListener('reset', () => {
      setTimeout(() => {
        syncPlanMode();
        setCards([
          { label: t('profit', 'Profit'), value: '$0' },
          { label: t('mao', 'MAO'), value: '$0' },
          { label: t('cashToClose', 'Cash to Close'), value: '$0' },
          { label: t('totalCosts', 'Total Costs'), value: '$0' },
          { label: t('roi', 'ROI'), value: '0.0%' },
          { label: t('breakEven', 'Break-even'), value: '$0' }
        ]);
        if (output) output.textContent = t('resultPrompt', 'Enter your numbers and click calculate.');
      }, 0);
    });

    if (sampleBtn) {
      sampleBtn.addEventListener('click', () => {
        const sample = {
          market: 'Louisville Sample Deal', salePrice: 315000, purchasePrice: 180000, earnestDeposit: 5000,
          buyerClosing: 3000, titleFees: 1800, prorations: 1200, inspectionCost: 700, rehabCost: 50000,
          contingencyPct: 15, drawCount: 3, rehabMonths: 4, holdingMonths: 6, insuranceMonthly: 140,
          taxesMonthly: 260, utilitiesMonthly: 220, maintenanceMonthly: 150, hoaMonthly: 0, miscMonthly: 110,
          realtorPct: 6, concessionPct: 1, sellerClosingPct: 1, stagingCost: 3000, transferTax: 800,
          financingType: 'hard-money', loanAmount: 0, loanPurchasePct: 85, loanRehabPct: 100, interestRate: 12,
          pointsPct: 2, drawFee: 150, drawInspectionFee: 75, prepayPenalty: 0, loanClosingCosts: 1200,
          originationFees: 800, targetProfit: 30000, targetRoi: 20, riskBufferPct: 5, taxRate: 0
        };
        Object.entries(sample).forEach(([key, value]) => {
          if (form.elements[key]) form.elements[key].value = value;
        });
        form.elements.planMode.value = 'pro';
        syncPlanMode();
      });
    }
  }

  const sampleData = {
    rental: { monthlyRent: 2400, taxes: 220, insurance: 120, maintenance: 180, management: 190, vacancyRate: 5 },
    rent: { propertyValue: 320000, annualExpenses: 9600, targetYield: 8.5, occupancy: 95 },
    arv: { comp1: 305000, comp2: 315000, comp3: 322000, repairs: 38000 },
    'hard-money': { loanAmount: 210000, interestRate: 11.5, points: 2, months: 9 },
    roi_search: { desiredReturn: 8.5, location: '33101', propertyType: 'single_family' }
  };

  const roiProperties = [
    { id: 'ROI-101', city: 'Miami', zip: '33101', neighborhood: 'Bayside', type: 'single_family', price: 385000, capRate: 7.8, cocReturn: 9.1, lat: 25.783, lng: -80.197 },
    { id: 'ROI-102', city: 'Miami', zip: '33127', neighborhood: 'Wynwood North', type: 'multifamiliar', price: 525000, capRate: 8.9, cocReturn: 10.8, lat: 25.806, lng: -80.202 },
    { id: 'ROI-103', city: 'Orlando', zip: '32801', neighborhood: 'Lake Eola', type: 'duplex', price: 349000, capRate: 7.1, cocReturn: 8.2, lat: 28.541, lng: -81.374 },
    { id: 'ROI-104', city: 'Tampa', zip: '33602', neighborhood: 'River Arts', type: 'single_family', price: 312000, capRate: 6.6, cocReturn: 7.5, lat: 27.949, lng: -82.458 },
    { id: 'ROI-105', city: 'Jacksonville', zip: '32202', neighborhood: 'Harborview', type: 'multifamiliar', price: 468000, capRate: 9.4, cocReturn: 11.2, lat: 30.325, lng: -81.658 },
    { id: 'ROI-106', city: 'Tampa', zip: '33605', neighborhood: 'Ybor Heights', type: 'duplex', price: 298000, capRate: 8.1, cocReturn: 9.4, lat: 27.960, lng: -82.428 }
  ];

  const roiMapContainer = document.getElementById('roi-heatmap');
  const roiHeatmapLayer = document.getElementById('heatmap-layer');
  const roiResultRows = document.getElementById('result-rows');

  const selectedReturnMetric=()=>form.elements.returnMetric?form.elements.returnMetric.value:'cocReturn';
  const getReturnLabel = property=>property[selectedReturnMetric()];

  const renderRoiRows = (rows, messages) => {
    if (!roiResultRows) return;
    if (!rows.length) {
      roiResultRows.innerHTML = `<tr><td colspan="8">${t('roiNoResults', 'No simulated properties matched your filters.')}</td></tr>`;
      return;
    }

    roiResultRows.innerHTML = rows
      .map((property) => `
        <tr>
          <td>${property.id}</td>
          <td>${property.city}</td>
          <td>${property.zip}</td>
          <td>${property.neighborhood}</td>
          <td>${({ single_family: messages.roiTypeSingleFamily, duplex: messages.roiTypeDuplex, multifamiliar: messages.roiTypeMultifamiliar }[property.type] || property.type)}</td>
          <td>${money(property.price)}</td>
          <td>${pct(property.capRate)}</td>
          <td>${pct(property.cocReturn)}</td>
        </tr>
      `)
      .join('');
  };

  const renderRoiHeatmap = (rows) => {
    if (!roiHeatmapLayer) return;
    if (!rows.length) {
      roiHeatmapLayer.innerHTML = '';
      return;
    }

    const maxReturn = rows.reduce((max, property) => Math.max(max, getReturnLabel(property)), 0);
    roiHeatmapLayer.innerHTML = rows
      .map((property) => {
        const strength = maxReturn > 0 ? getReturnLabel(property) / maxReturn : 0;
        const color = `hsla(${Math.max(0, 35 - strength * 35)}, 95%, 56%, ${0.35 + strength * 0.45})`;
        const left = ((property.lng + 83.2) / 4.2) * 100;
        const top = ((30.6 - property.lat) / 5.3) * 100;
        return `<span class="heat-point" style="left:${left}%;top:${top}%;background:${color};">${property.neighborhood}</span>`;
      })
      .join('');
  };

  const initRoiMap = () => {
    if (!roiMapContainer) return;
    const mapUrl = 'https://www.google.com/maps?q=florida&output=embed';
    if (!roiMapContainer.querySelector('iframe')) {
      const iframe = document.createElement('iframe');
      iframe.src = mapUrl;
      iframe.loading = 'lazy';
      iframe.referrerPolicy = 'no-referrer-when-downgrade';
      iframe.title = t('roiMapTitle', 'ROI heatmap preview');
      roiMapContainer.appendChild(iframe);
    }
  };

  if (type === 'roi_search') {
    initRoiMap();
    renderRoiRows(roiProperties, getMessages());
    renderRoiHeatmap(roiProperties);
  }

  if (type !== 'flip') {
    form.addEventListener('reset', () => {
      setTimeout(() => {
        clearValidationError();
        clearFieldErrors();
        setCards([]);
        if (type === 'roi_search') {
          renderRoiRows(roiProperties, getMessages());
          renderRoiHeatmap(roiProperties);
          if (output) output.textContent = t('roiResultsReady', 'Filtered opportunities updated with simulated ROI heatmap points.');
          return;
        }
        if (output) output.textContent = t('resultPrompt', 'Enter your numbers and click calculate.');
      }, 0);
    });

    if (sampleBtn) {
      sampleBtn.addEventListener('click', () => {
        const sample = sampleData[type];
        if (!sample) return;
        Object.entries(sample).forEach(([name, value]) => {
          if (form.elements[name]) form.elements[name].value = value;
        });
        form.requestSubmit();
      });
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const messages = getMessages();
    clearValidationError();
    setCards([]);
    if(output)output.textContent='';

    if (window.IBAnalytics && typeof window.IBAnalytics.trackCalcRun === 'function') {
      window.IBAnalytics.trackCalcRun(type);
    }
    const values = Object.fromEntries(new FormData(form).entries());
    const num = (name) => parseFieldNumber(name, values[name]);
    try {
    if (type === 'flip') {
      if (!validateFlip(messages)) return;

      const model=calculateFlipFinance({
        purchase:num('purchasePrice'),sale:num('salePrice'),
        rehabTotal:num('rehabCost')*(1+num('contingencyPct')/100),
        buyerClosing:num('buyerClosing'),titleFees:num('titleFees'),prorations:num('prorations'),inspectionCost:num('inspectionCost'),
        monthlyHolding:['insuranceMonthly','taxesMonthly','utilitiesMonthly','maintenanceMonthly','hoaMonthly','miscMonthly'].map(num).reduce((a,b)=>a+b,0),
        holdingMonths:num('holdingMonths'),realtorPct:num('realtorPct'),concessionPct:num('concessionPct'),
        sellerClosingPct:num('sellerClosingPct'),stagingCost:num('stagingCost'),transferTax:num('transferTax'),
        isPro:(values.planMode||'free')==='pro',financingType:values.financingType,
        loanAmount:num('loanAmount'),loanPurchasePct:num('loanPurchasePct'),loanRehabPct:num('loanRehabPct'),
        pointsPct:num('pointsPct'),interestRate:num('interestRate'),drawFee:num('drawFee'),
        drawInspectionFee:num('drawInspectionFee'),drawCount:num('drawCount'),originationFees:num('originationFees'),
        loanClosingCosts:num('loanClosingCosts'),prepayPenalty:num('prepayPenalty'),taxRate:num('taxRate'),
        draws:readLoanSchedule(),interestMethod:values.interestMethod
      });
      const {acquisition,rehabTotal,holdingTotal,sellingTotal,financingTotal,totalCosts,netProfit,
        cashCommitted,roi,mao70,breakEven,scenarioLow,scenarioBase,scenarioHigh}=model;
      const score=netProfit>0&&roi!==null&&roi>15?'A':netProfit>0?'B':'C';
      setCards([
        { label: messages.profit, value: money(netProfit) },
        { label: messages.mao, value: money(mao70) },
        { label: t('cashCommittedLabel', 'Net capital committed'), value: money(cashCommitted) },
        { label: messages.totalCosts, value: money(totalCosts) },
        { label: messages.roi, value: roi===null?'N/A':pct(roi) },
        { label: messages.breakEven, value: breakEven===null?'N/A':money(breakEven) }
      ]);

      if (output) {
        output.innerHTML = `
          <div class="badge ${netProfit > 0 ? 'green' : 'red'}">${messages.dealScore}: ${score}</div>
          <h3>${messages.costBreakdown}</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>${messages.section}</th><th>${messages.total}</th></tr></thead>
              <tbody>
                <tr><td>${messages.acquisition}</td><td>${money(acquisition)}</td></tr>
                <tr><td>${messages.rehabContingency}</td><td>${money(rehabTotal)}</td></tr>
                <tr><td>${messages.holding}</td><td>${money(holdingTotal)}</td></tr>
                <tr><td>${messages.selling}</td><td>${money(sellingTotal)}</td></tr>
                <tr><td>${messages.financing}</td><td>${money(financingTotal)}</td></tr>
              </tbody>
            </table>
          </div>
          <p class="access-note">${t('flipMathNotes', 'Earnest money credits the purchase price. Interest assumes fully drawn principal for the hold; net committed capital is not cash due at closing.')}</p>
          <h3>${messages.sensitivityResults}</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>${messages.scenario}</th><th>${messages.profit}</th></tr></thead>
              <tbody>
                <tr><td>${messages.low}</td><td>${money(scenarioLow)}</td></tr>
                <tr><td>${messages.base}</td><td>${money(scenarioBase)}</td></tr>
                <tr><td>${messages.high}</td><td>${money(scenarioHigh)}</td></tr>
              </tbody>
            </table>
          </div>
        `;
      }

      if (window.IBAnalytics && typeof window.IBAnalytics.trackCalcSuccess === 'function') {
        window.IBAnalytics.trackCalcSuccess(type, { result: netProfit > 0 ? 'profit' : 'loss' });
      }
      return;
    }

    if (type === 'rental') {
      if (!validateFields([
        { name: 'monthlyRent', required: true, min: 0.01 },
        { name: 'taxes', min: 0 },
        { name: 'insurance', min: 0 },
        { name: 'maintenance', min: 0 },
        { name: 'management', min: 0 },
        ...['debtService','capitalReserve','hoa','utilities','otherExpenses','cashInvested','totalBasis'].map(name=>({name,min:0})),
        { name: 'vacancyRate', required: true, min: 0, max: 100 }
      ], messages)) return;

      const monthlyRent = num('monthlyRent');
      const vacancyRate = num('vacancyRate');
      const expenses = ['taxes', 'insurance', 'maintenance', 'management'].map(num);

      const rentalOptions=Object.fromEntries(['debtService','capitalReserve','hoa','utilities','otherExpenses','cashInvested','totalBasis'].map(key=>[key,num(key)]));
      const rental=rentalModel(monthlyRent,vacancyRate,expenses,rentalOptions);
      const cashFlow = rental.monthlyCashFlow;
      setCards([
        { label: messages.monthlyCashFlow, value: money(cashFlow) },
        { label: messages.annualCashFlow, value: money(cashFlow * 12) },
        { label: t('vacancyRateLabel', 'Vacancy Rate'), value: pct(vacancyRate) },
        { label: t('rentalAnnualNoi','Annual NOI'), value:money(rental.annualNoi) },
        { label: t('rentalCashOnCash','Annual cash-on-cash return'), value:rental.cashOnCash===null?'N/A':pct(rental.cashOnCash) },
        { label: t('rentalCapRate','Capitalization rate'), value:rental.capRate===null?'N/A':pct(rental.capRate) }
      ]);
      output.textContent = t('cashFlowCalculated', 'Cash flow calculated.')+' '+t('rentalAssumptions','NOI excludes debt service and capital reserves. Cash flow deducts both. Cash-on-cash uses entered equity; cap rate uses entered total property basis. All costs are user-entered; $0 means omitted.');
      if (window.IBAnalytics && typeof window.IBAnalytics.trackCalcSuccess === 'function') {
        window.IBAnalytics.trackCalcSuccess(type, { result: 'cash_flow' });
      }
      return;
    }


    if (type === 'rent') {
      if (!validateFields([
        { name: 'propertyValue', required: true, min: 0.01 },
        { name: 'annualExpenses', min: 0 },
        { name: 'targetYield', required: true, min: 0, max: 100 },
        { name: 'occupancy', required: true, min: 0, max: 100 }
      ], messages)) return;

      const propertyValue = num('propertyValue');
      const annualExpenses = num('annualExpenses');
      const targetYield = num('targetYield') / 100;
      const occupancy = num('occupancy') / 100;

      const {suggestedMonthlyRent,annualIncome,grossYield,netAfterExpenses}=rentModel(propertyValue,annualExpenses,targetYield*100,occupancy*100);

      setCards([
        { label: messages.rentSuggestedMonthly, value: suggestedMonthlyRent===null?'N/A':money(suggestedMonthlyRent) },
        { label: messages.rentAnnualIncome, value: money(annualIncome) },
        { label: messages.rentGrossYield, value: pct(grossYield) },
        { label: messages.rentNetAfterExpenses, value: money(netAfterExpenses) }
      ]);
      output.textContent = t('rentProjectionCalculated', 'Rent projection calculated.')+' '+t('rentAssumptions','Target yield is GROSS; annual expenses are only deducted from the displayed net income.');
      if (window.IBAnalytics && typeof window.IBAnalytics.trackCalcSuccess === 'function') {
        window.IBAnalytics.trackCalcSuccess(type, { result: 'rent_projection' });
      }
      return;
    }

    if (type === 'arv') {
      if (!validateFields([
        { name: 'comp1', required: true, min: 0.01 },
        { name: 'comp2', required: true, min: 0.01 },
        { name: 'comp3', required: true, min: 0.01 },
        { name: 'repairs', required: true, min: 0 }
        ,...['comp1Adjustment','comp2Adjustment','comp3Adjustment'].map(name=>({name,allowNegative:true}))
      ], messages)) return;

      const {average,maxOffer,minimum,maximum}=arvModel([num('comp1'),num('comp2'),num('comp3')],num('repairs'),[num('comp1Adjustment'),num('comp2Adjustment'),num('comp3Adjustment')]);
      setCards([
        { label: messages.estimatedArv, value: money(average) },
        { label: messages.maxOffer, value: money(maxOffer) },
        { label: t('arvAdjustedRange','Adjusted comparable range (not a confidence interval)'),value:money(minimum)+' – '+money(maximum) }
      ]);
      output.textContent = t('arvEstimateCalculated', 'ARV estimate calculated.')+' '+t('arvAssumptions','Average of three prices plus user-entered signed adjustments. Sources and adjustments are not independently verified. The 70% offer rule is a screening heuristic; financing, holding and sale costs require a full deal model.');
      if (window.IBAnalytics && typeof window.IBAnalytics.trackCalcSuccess === 'function') {
        window.IBAnalytics.trackCalcSuccess(type, { result: 'arv_estimate' });
      }
      return;
    }

    if (type === 'hard-money') {
      if (!validateFields([
        { name: 'loanAmount', required: true, min: 0.01 },
        { name: 'interestRate', required: true, min: 0, max: 100 },
        { name: 'points', required: true, min: 0, max: 20 },
        { name: 'months', required: true, min: 0 },
        { name: 'lenderFees', min: 0 }
      ], messages)) return;

      const loan = num('loanAmount');
      const {interestCost,totalCost,monthlyInterest,pointsCost,fees,drawnPrincipal}=hardMoneyModel(loan,num('interestRate'),num('points'),num('months'),{
        fees:num('lenderFees'),draws:readLoanSchedule(),interestMethod:values.interestMethod
      });
      setCards([
        { label: messages.totalFinancingCost, value: money(totalCost) },
        { label: t('loanAverageMonthlyInterest','Average monthly interest'), value: money(monthlyInterest) },
        { label: t('loanAccruedInterest','Accrued interest'), value:money(interestCost) },
        { label: t('loanPointsCost','Points on committed principal'), value:money(pointsCost) },
        { label: t('loanFeesCost','Lender fees and penalties'), value:money(fees) },
        { label: t('loanDrawnPrincipal','Total funded principal'), value:money(drawnPrincipal) }
      ]);
      output.textContent = t('financingEstimateCalculated', 'Financing estimate calculated.')+' '+t('hardMoneyAssumptions','Costs include entered fees, points on committed principal and interest on each entered draw. Principal repayment is not a financing expense. Confirm the accrual convention and capitalization with the lender.');
      if (window.IBAnalytics && typeof window.IBAnalytics.trackCalcSuccess === 'function') {
        window.IBAnalytics.trackCalcSuccess(type, { result: 'financing_estimate' });
      }
      return;
    }

    if (type === 'roi_search') {
      if(!validateFields([{name:'desiredReturn',required:true,min:0,max:100}],messages))return;
      if(!['capRate','cocReturn'].includes(selectedReturnMetric()))throw new RangeError('Choose a return metric');
      const desiredReturn = num('desiredReturn');
      const rawLocation = String(values.location || '').trim().toLowerCase();
      const propertyType = String(values.propertyType || '').trim();

      const filteredRows = roiProperties.filter((property) => {
        const hitsReturn = getReturnLabel(property) >= desiredReturn;
        const hitsLocation = !rawLocation || property.city.toLowerCase().includes(rawLocation) || property.zip.includes(rawLocation);
        const hitsType = !propertyType || propertyType === 'all' || property.type === propertyType;
        return hitsReturn && hitsLocation && hitsType;
      });

      renderRoiRows(filteredRows, messages);
      renderRoiHeatmap(filteredRows);

      setCards([
        { label: t('roiMatches', 'Matching properties'), value: String(filteredRows.length) },
        { label: t('roiDesiredReturn', 'Desired return'), value: pct(desiredReturn) },
        { label: selectedReturnMetric()==='capRate'?t('roiAverageCapRate','Average cap rate'):t('roiAverageCashReturn','Average cash-on-cash return'), value: filteredRows.length?pct(filteredRows.reduce((sum, property) => sum + getReturnLabel(property), 0) / filteredRows.length):'N/A' }
      ]);

      if (output) {
        output.textContent = filteredRows.length
          ? t('roiResultsReady', 'Filtered opportunities updated with simulated ROI heatmap points.')
          : t('roiNoResults', 'No simulated properties matched your filters.');
      }

      if (window.IBAnalytics && typeof window.IBAnalytics.trackCalcSuccess === 'function') {
        window.IBAnalytics.trackCalcSuccess(type, { result: filteredRows.length ? 'matches_found' : 'no_matches' });
      }
    }
    } catch(error) {
      setCards([]);
      const message=t('outOfRange','Revisa los números y los rangos / Check numbers and allowed ranges.');
      showValidationError(message);
      if(output)output.textContent=message;
    } finally {
      // Notify only after rendering finishes, regardless of native listener order.
      form.dispatchEvent(new CustomEvent('ib:calculation-complete'));
    }
  });
  });
})();
