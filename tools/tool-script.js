(function () {
  const form = document.getElementById('tool-form');
  const output = document.getElementById('result-detail') || document.getElementById('result');
  const cards = document.getElementById('result-cards');
  const type = document.body.dataset.tool;
  const planHint = document.getElementById('plan-hint');
  const sampleBtn = document.getElementById('load-sample');

  if (!form || !type) return;

  const parseNumeric = (value) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const clean = String(value ?? '').replace(/[^0-9.-]/g, '');
    const parsed = Number(clean);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const money = (value) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value) || 0);
  const pct = (value) => `${(Number(value) || 0).toFixed(1)}%`;

  const copy = {
    en: {
      monthlyCashFlow: 'Monthly Cash Flow',
      annualCashFlow: 'Annual Cash Flow',
      rentSuggestedMonthly: 'Suggested Monthly Rent',
      rentAnnualIncome: 'Projected Annual Income',
      rentGrossYield: 'Projected Gross Yield',
      rentNetAfterExpenses: 'Annual Net After Expenses',
      estimatedArv: 'Estimated ARV',
      maxOffer: 'Maximum Offer (70% Rule)',
      totalFinancingCost: 'Total Financing Cost',
      monthlyInterestCarry: 'Monthly Interest Carry',
      freeHint: 'Free mode: quick estimate with purchase, rehab, holding and sale costs only.',
      proHint: 'Pro mode enabled: includes financing stack, MAO strategy checks, risk buffer and sensitivity table.',
      requiredField: 'Required field',
      cannotBeNegative: 'Cannot be negative',
      profit: 'Profit',
      mao: 'MAO',
      cashToClose: 'Cash to Close',
      totalCosts: 'Total Costs',
      roi: 'ROI',
      breakEven: 'Break-even',
      dealScore: 'Deal Score',
      costBreakdown: 'Cost Breakdown',
      section: 'Section',
      total: 'Total',
      acquisition: 'Acquisition',
      rehabContingency: 'Rehab + contingency',
      holding: 'Holding',
      selling: 'Selling',
      financing: 'Financing',
      sensitivityResults: 'Sensitivity Results',
      scenario: 'Scenario',
      low: 'Low',
      base: 'Base',
      high: 'High',
      resultPrompt: 'Enter your numbers and click calculate.'
    },
    es: {
      monthlyCashFlow: 'Flujo de caja mensual',
      annualCashFlow: 'Flujo de caja anual',
      rentSuggestedMonthly: 'Renta mensual sugerida',
      rentAnnualIncome: 'Ingreso anual proyectado',
      rentGrossYield: 'Rendimiento bruto proyectado',
      rentNetAfterExpenses: 'Neto anual después de gastos',
      estimatedArv: 'ARV estimado',
      maxOffer: 'Oferta máxima (regla del 70%)',
      totalFinancingCost: 'Costo total del financiamiento',
      monthlyInterestCarry: 'Carga mensual de intereses',
      freeHint: 'Modo gratis: estimación rápida con compra, rehab, holding y costos de venta.',
      proHint: 'Modo Pro: incluye estructura de financiamiento, MAO por objetivos, buffer de riesgo y sensibilidades.',
      requiredField: 'Campo obligatorio',
      cannotBeNegative: 'No puede ser negativo',
      profit: 'Ganancia',
      mao: 'MAO',
      cashToClose: 'Efectivo para cerrar',
      totalCosts: 'Costos totales',
      roi: 'ROI',
      breakEven: 'Punto de equilibrio',
      dealScore: 'Puntaje de operación',
      costBreakdown: 'Desglose de costos',
      section: 'Sección',
      total: 'Total',
      acquisition: 'Adquisición',
      rehabContingency: 'Rehab + contingencia',
      holding: 'Holding',
      selling: 'Venta',
      financing: 'Financiamiento',
      sensitivityResults: 'Resultados de sensibilidad',
      scenario: 'Escenario',
      low: 'Bajo',
      base: 'Base',
      high: 'Alto',
      resultPrompt: 'Ingresa tus datos y haz clic en calcular.'
    }
  };

  const getLang = () => (document.documentElement.lang === 'es' ? 'es' : 'en');

  const setupCurrencyInputs = () => {
    form.querySelectorAll('input[data-format="currency"]').forEach((input) => {
      input.placeholder = '$0';
      input.inputMode = 'decimal';

      input.addEventListener('focus', () => {
        const value = parseNumeric(input.value);
        input.value = value ? String(value) : '';
      });

      input.addEventListener('blur', () => {
        const value = parseNumeric(input.value);
        input.value = input.value.trim() ? money(value) : '';
      });

      if (input.value) {
        const value = parseNumeric(input.value);
        input.value = money(value);
      }
    });
  };

  setupCurrencyInputs();

  const syncPlanMode = () => {
    if (type !== 'flip') return;
    const selected = form.querySelector('input[name="planMode"]:checked')?.value || 'free';
    const isPro = selected === 'pro';
    form.querySelectorAll('.pro-only').forEach((section) => section.classList.toggle('is-hidden', !isPro));
    if (planHint) {
      planHint.textContent = isPro ? copy[getLang()].proHint : copy[getLang()].freeHint;
    }
  };

  const setCards = (items) => {
    if (!cards) return;
    cards.innerHTML = items
      .map((item) => `<div class="metric"><strong>${item.label}</strong><span>${item.value}</span></div>`)
      .join('');
  };

  const requiredFields = ['salePrice', 'purchasePrice', 'rehabCost'];
  const validateFlip = (t) => {
    let valid = true;
    requiredFields.forEach((field) => {
      const input = form.elements[field];
      if (!input) return;
      input.setCustomValidity('');
      if (!input.value) {
        input.setCustomValidity(t.requiredField);
        valid = false;
      } else if (Number(input.value) < 0) {
        input.setCustomValidity(t.cannotBeNegative);
        valid = false;
      }
    });
    form.reportValidity();
    return valid;
  };

  if (type === 'flip') {
    form.querySelectorAll('input[name="planMode"]').forEach((input) => input.addEventListener('change', syncPlanMode));
    syncPlanMode();

    form.addEventListener('reset', () => {
      setTimeout(() => {
        const t = copy[getLang()];
        syncPlanMode();
        setCards([
          { label: t.profit, value: '$0' },
          { label: t.mao, value: '$0' },
          { label: t.cashToClose, value: '$0' },
          { label: t.totalCosts, value: '$0' },
          { label: t.roi, value: '0.0%' },
          { label: t.breakEven, value: '$0' }
        ]);
        if (output) output.textContent = copy[getLang()].resultPrompt || 'Enter your numbers and click calculate.';
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

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const lang = getLang();
    const t = copy[lang];
    const values = Object.fromEntries(new FormData(form).entries());
    const num = (name) => parseNumeric(values[name]);

    if (type === 'flip') {
      if (!validateFlip(t)) return;

      const purchase = num('purchasePrice');
      const sale = num('salePrice');
      const rehabTotal = num('rehabCost') * (1 + num('contingencyPct') / 100);
      const acquisition = purchase + num('earnestDeposit') + num('buyerClosing') + num('titleFees') + num('prorations') + num('inspectionCost');
      const monthlyHolding = num('insuranceMonthly') + num('taxesMonthly') + num('utilitiesMonthly') + num('maintenanceMonthly') + num('hoaMonthly') + num('miscMonthly');
      const holdingTotal = monthlyHolding * num('holdingMonths');
      const sellingTotal = sale * ((num('realtorPct') + num('concessionPct') + num('sellerClosingPct')) / 100) + num('stagingCost') + num('transferTax');
      const projectCost = acquisition + rehabTotal + holdingTotal + sellingTotal;

      const isPro = (values.planMode || 'free') === 'pro';
      let financedAmount = 0;
      let financingTotal = 0;
      if (isPro && values.financingType !== 'cash') {
        financedAmount = Math.max(num('loanAmount'), purchase * (num('loanPurchasePct') / 100) + rehabTotal * (num('loanRehabPct') / 100));
        const monthlyInterestBase = values.financingType === 'hard-money' ? purchase : financedAmount;
        financingTotal =
          financedAmount * (num('pointsPct') / 100) +
          monthlyInterestBase * (num('interestRate') / 100) * (num('holdingMonths') / 12) +
          (num('drawFee') + num('drawInspectionFee')) * num('drawCount') +
          num('originationFees') + num('loanClosingCosts') + num('prepayPenalty');
      }

      const taxAmount = Math.max(sale - projectCost - financingTotal, 0) * (num('taxRate') / 100);
      const netProfit = sale - projectCost - financingTotal - taxAmount;
      const cashToClose = acquisition + rehabTotal + holdingTotal + financingTotal - financedAmount;
      const roi = cashToClose > 0 ? (netProfit / cashToClose) * 100 : 0;
      const mao70 = sale * 0.7 - rehabTotal;
      const totalCosts = projectCost + financingTotal + taxAmount;
      const breakEven = totalCosts;
      const scenarioLow = sale * 0.95 - (totalCosts + rehabTotal * 0.1);
      const scenarioBase = netProfit;
      const scenarioHigh = sale * 1.05 - (totalCosts - rehabTotal * 0.1);
      const score = netProfit > 0 && roi > 15 ? 'A' : netProfit > 0 ? 'B' : 'C';

      setCards([
        { label: t.profit, value: money(netProfit) },
        { label: t.mao, value: money(mao70) },
        { label: t.cashToClose, value: money(cashToClose) },
        { label: t.totalCosts, value: money(totalCosts) },
        { label: t.roi, value: pct(roi) },
        { label: t.breakEven, value: money(breakEven) }
      ]);

      if (output) {
        output.innerHTML = `
          <div class="badge ${netProfit > 0 ? 'green' : 'red'}">${t.dealScore}: ${score}</div>
          <h3>${t.costBreakdown}</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>${t.section}</th><th>${t.total}</th></tr></thead>
              <tbody>
                <tr><td>${t.acquisition}</td><td>${money(acquisition)}</td></tr>
                <tr><td>${t.rehabContingency}</td><td>${money(rehabTotal)}</td></tr>
                <tr><td>${t.holding}</td><td>${money(holdingTotal)}</td></tr>
                <tr><td>${t.selling}</td><td>${money(sellingTotal)}</td></tr>
                <tr><td>${t.financing}</td><td>${money(financingTotal)}</td></tr>
              </tbody>
            </table>
          </div>
          <h3>${t.sensitivityResults}</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>${t.scenario}</th><th>${t.profit}</th></tr></thead>
              <tbody>
                <tr><td>${t.low}</td><td>${money(scenarioLow)}</td></tr>
                <tr><td>${t.base}</td><td>${money(scenarioBase)}</td></tr>
                <tr><td>${t.high}</td><td>${money(scenarioHigh)}</td></tr>
              </tbody>
            </table>
          </div>
        `;
      }
      return;
    }

    if (type === 'rental') {
      const cashFlow = num('monthlyRent') * (1 - num('vacancyRate') / 100) - num('taxes') - num('insurance') - num('maintenance') - num('management');
      output.innerHTML = `<strong>${t.monthlyCashFlow}:</strong> ${money(cashFlow)}<br><strong>${t.annualCashFlow}:</strong> ${money(cashFlow * 12)}`;
      return;
    }


    if (type === 'rent') {
      const propertyValue = num('propertyValue');
      const annualExpenses = num('annualExpenses');
      const targetYield = num('targetYield') / 100;
      const occupancy = num('occupancy') / 100;
      const suggestedMonthlyRent = propertyValue > 0 && occupancy > 0 ? (propertyValue * targetYield) / (12 * occupancy) : 0;
      const annualIncome = suggestedMonthlyRent * 12 * occupancy;
      const grossYield = propertyValue > 0 ? (annualIncome / propertyValue) * 100 : 0;
      const netAfterExpenses = annualIncome - annualExpenses;

      output.innerHTML = `<strong>${t.rentSuggestedMonthly}:</strong> ${money(suggestedMonthlyRent)}<br><strong>${t.rentAnnualIncome}:</strong> ${money(annualIncome)}<br><strong>${t.rentGrossYield}:</strong> ${pct(grossYield)}<br><strong>${t.rentNetAfterExpenses}:</strong> ${money(netAfterExpenses)}`;
      return;
    }

    if (type === 'arv') {
      const average = (num('comp1') + num('comp2') + num('comp3')) / 3;
      output.innerHTML = `<strong>${t.estimatedArv}:</strong> ${money(average)}<br><strong>${t.maxOffer}:</strong> ${money(average * 0.7 - num('repairs'))}`;
      return;
    }

    if (type === 'hard-money') {
      const loan = num('loanAmount');
      const interestCost = loan * (num('interestRate') / 100) * (num('months') / 12);
      const totalCost = loan * (num('points') / 100) + interestCost;
      output.innerHTML = `<strong>${t.totalFinancingCost}:</strong> ${money(totalCost)}<br><strong>${t.monthlyInterestCarry}:</strong> ${money(interestCost / Math.max(num('months'), 1))}`;
    }
  });
})();
