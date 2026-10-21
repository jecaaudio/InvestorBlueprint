(function initTooltips(){
  const bubble = document.createElement("div");
  bubble.className = "tooltip-bubble";
  document.body.appendChild(bubble);

  let activeBtn = null;

  function show(btn, x, y){
    const text = btn.getAttribute("data-tooltip") || "";
    bubble.textContent = text;
    bubble.classList.add("show");

    const padding = 12;
    const rect = bubble.getBoundingClientRect();
    let left = x + 12;
    let top  = y + 12;

    if (left + rect.width > window.innerWidth - padding) {
      left = window.innerWidth - rect.width - padding;
    }
    if (top + rect.height > window.innerHeight - padding) {
      top = y - rect.height - 12;
    }

    bubble.style.left = `${Math.max(padding, left)}px`;
    bubble.style.top  = `${Math.max(padding, top)}px`;

    activeBtn = btn;
  }

  function hide(){
    bubble.classList.remove("show");
    activeBtn = null;
  }

  document.addEventListener("mouseover", (e) => {
    const btn = e.target.closest(".info-icon");
    if (!btn) return;
    const { clientX, clientY } = e;
    show(btn, clientX, clientY);
  });

  document.addEventListener("mousemove", (e) => {
    if (!activeBtn) return;
    show(activeBtn, e.clientX, e.clientY);
  });

  document.addEventListener("mouseout", (e) => {
    const btn = e.target.closest(".info-icon");
    if (!btn) return;
    hide();
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".info-icon");
    if (!btn) { hide(); return; }

    if (activeBtn === btn) { hide(); return; }

    const r = btn.getBoundingClientRect();
    show(btn, r.left + r.width/2, r.top + r.height);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hide();
  });

  window.addEventListener("scroll", hide, { passive:true });
})();

// The private production page uses the legacy fc-* markup. Adapt that exact
// document to the shared, tested engine; do not keep a second financial formula.
(function connectPublishedFlip(){
  const panel=document.querySelector('#flip-calculator .fc-panel');
  const result=document.getElementById('fcReportArea');
  if(!panel||!result)return;
  const scriptRoot=new URL('../../',document.currentScript.src);
  const form=document.createElement('form');form.id='tool-form';form.noValidate=true;
  const ids={arv:'salePrice',rehab:'rehabCost',holdingMonthlyCost:'miscMonthly',buyClosingCosts:'buyerClosing',sellClosingCosts:'stagingCost',agentCommissionPct:'realtorPct',interestRatePct:'interestRate'};
  for(const input of panel.querySelectorAll('input')){
    const old=input.id,next=ids[old]||old;
    const label=panel.querySelector('label[for="'+old+'"]');
    if(label)label.htmlFor=next;
    input.id=next;input.name=next;
    if(input.classList.contains('money'))input.dataset.format='currency';
    if(old==='downPayment'){
      input.disabled=true;
      if(label)label.append(document.createTextNode(' (referencia / reference)'));
    }
  }
  while(panel.firstChild)form.append(panel.firstChild);
  panel.append(form);
  const zeros=['titleFees','prorations','inspectionCost','insuranceMonthly','taxesMonthly','utilitiesMonthly','maintenanceMonthly','hoaMonthly','concessionPct','sellerClosingPct','transferTax','contingencyPct','loanPurchasePct','loanRehabPct','drawFee','drawInspectionFee','drawCount','originationFees','loanClosingCosts','prepayPenalty','taxRate'];
  for(const name of zeros){const input=document.createElement('input');input.type='hidden';input.name=name;input.value='0';form.append(input);}
  const plan=document.createElement('input');plan.type='radio';plan.name='planMode';plan.value='pro';plan.checked=true;plan.hidden=true;form.append(plan);
  const financing=document.createElement('input');financing.type='hidden';financing.name='financingType';financing.value='hard-money';form.append(financing);
  const notice=document.createElement('p');notice.textContent='El capital propio se calcula como costos menos desembolsos. La referencia de down payment no es un gasto adicional. / Equity is costs less funded proceeds; the down-payment reference is not an additional expense.';form.append(notice);
  const error=document.createElement('p');error.id='tool-validation';error.setAttribute('role','alert');error.hidden=true;form.append(error);
  const actions=document.createElement('div');actions.className='tool-actions';
  const button=document.createElement('button');button.type='submit';button.dataset.i18n='calculate';button.textContent='Calcular / Calculate';actions.append(button);form.append(actions);
  result.replaceChildren();
  const cards=document.createElement('div');cards.id='result-cards';cards.className='result-grid';
  const details=document.createElement('div');details.id='result-detail';details.setAttribute('aria-live','polite');result.append(cards,details);
  const engine=document.createElement('script');engine.src=new URL('tools/tool-script.js?v=20261020',scriptRoot).href;
  engine.onload=()=>window.IBInitFinanceReport?.();
  engine.onerror=()=>{button.disabled=true;error.hidden=false;error.textContent='No se pudo cargar el modelo financiero. / Unable to load financial model.';};
  document.head.append(engine);
})();
