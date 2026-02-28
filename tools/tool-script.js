(function () {
  const form = document.getElementById('tool-form');
  const output = document.getElementById('result-detail') || document.getElementById('result');
  const cards = document.getElementById('result-cards');
  const type = document.body.dataset.tool;
  const planHint = document.getElementById('plan-hint');
  const sampleBtn = document.getElementById('load-sample');

  if (!form || !type) return;

  if (window.IBAnalytics && typeof window.IBAnalytics.trackToolOpen === 'function') {
    window.IBAnalytics.trackToolOpen(type);
  }

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
      outOfRange: 'Value out of allowed range',
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
      outOfRange: 'Valor fuera del rango permitido',
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

  const validateFields = (rules, t) => {
    clearFieldErrors();
    const invalid = [];
    rules.forEach((rule) => {
      const value = parseNumeric(form.elements[rule.name]?.value);
      const isBlank = String(form.elements[rule.name]?.value || '').trim() === '';
      if (rule.required && isBlank) {
        setFieldError(rule.name, t.requiredField);
        invalid.push(rule.name);
        return;
      }
      if (!Number.isFinite(value)) {
        setFieldError(rule.name, t.outOfRange);
        invalid.push(rule.name);
        return;
      }
      if (!rule.allowNegative && value < 0) {
        setFieldError(rule.name, t.cannotBeNegative);
        invalid.push(rule.name);
        return;
      }
      if (rule.min !== undefined && value < rule.min) {
        setFieldError(rule.name, t.outOfRange);
        invalid.push(rule.name);
        return;
      }
      if (rule.max !== undefined && value > rule.max) {
        setFieldError(rule.name, t.outOfRange);
        invalid.push(rule.name);
      }
    });

    if (invalid.length) {
      showValidationError(t.outOfRange);
      form.elements[invalid[0]]?.focus();
      return false;
    }
    return true;
  };

  const validateRange = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;

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

  const sampleData = {
    rental: { monthlyRent: 2400, taxes: 220, insurance: 120, maintenance: 180, management: 190, vacancyRate: 5 },
    rent: { propertyValue: 320000, annualExpenses: 9600, targetYield: 8.5, occupancy: 95 },
    arv: { comp1: 305000, comp2: 315000, comp3: 322000, repairs: 38000 },
    'hard-money': { loanAmount: 210000, interestRate: 11.5, points: 2, months: 9 }
  };

  if (type !== 'flip') {
    form.addEventListener('reset', () => {
      setTimeout(() => {
        clearValidationError();
        clearFieldErrors();
        setCards([]);
        if (output) output.textContent = copy[getLang()].resultPrompt;
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
    const lang = getLang();
    const t = copy[lang];
    clearValidationError();

    if (window.IBAnalytics && typeof window.IBAnalytics.trackCalcRun === 'function') {
      window.IBAnalytics.trackCalcRun(type);
    }
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
        { name: 'vacancyRate', required: true, min: 0, max: 100 }
      ], t)) return;

      const monthlyRent = num('monthlyRent');
      const vacancyRate = num('vacancyRate');
      const expenses = ['taxes', 'insurance', 'maintenance', 'management'].map(num);

      const cashFlow = monthlyRent * (1 - vacancyRate / 100) - expenses.reduce((sum, value) => sum + value, 0);
      setCards([
        { label: t.monthlyCashFlow, value: money(cashFlow) },
        { label: t.annualCashFlow, value: money(cashFlow * 12) },
        { label: 'Vacancy Rate', value: pct(vacancyRate) }
      ]);
      output.textContent = 'Cash flow calculated.';
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
      ], t)) return;

      const propertyValue = num('propertyValue');
      const annualExpenses = num('annualExpenses');
      const targetYield = num('targetYield') / 100;
      const occupancy = num('occupancy') / 100;

      const suggestedMonthlyRent = propertyValue > 0 && occupancy > 0 ? (propertyValue * targetYield) / (12 * occupancy) : 0;
      const annualIncome = suggestedMonthlyRent * 12 * occupancy;
      const grossYield = propertyValue > 0 ? (annualIncome / propertyValue) * 100 : 0;
      const netAfterExpenses = annualIncome - annualExpenses;

      setCards([
        { label: t.rentSuggestedMonthly, value: money(suggestedMonthlyRent) },
        { label: t.rentAnnualIncome, value: money(annualIncome) },
        { label: t.rentGrossYield, value: pct(grossYield) },
        { label: t.rentNetAfterExpenses, value: money(netAfterExpenses) }
      ]);
      output.textContent = 'Rent projection calculated.';
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
      ], t)) return;

      const average = (num('comp1') + num('comp2') + num('comp3')) / 3;
      const maxOffer = average * 0.7 - num('repairs');
      setCards([
        { label: t.estimatedArv, value: money(average) },
        { label: t.maxOffer, value: money(maxOffer) }
      ]);
      output.textContent = 'ARV estimate calculated.';
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
        { name: 'months', required: true, min: 1 }
      ], t)) return;

      const loan = num('loanAmount');
      const interestCost = loan * (num('interestRate') / 100) * (num('months') / 12);
      const totalCost = loan * (num('points') / 100) + interestCost;
      setCards([
        { label: t.totalFinancingCost, value: money(totalCost) },
        { label: t.monthlyInterestCarry, value: money(interestCost / Math.max(num('months'), 1)) }
      ]);
      output.textContent = 'Financing estimate calculated.';
      if (window.IBAnalytics && typeof window.IBAnalytics.trackCalcSuccess === 'function') {
        window.IBAnalytics.trackCalcSuccess(type, { result: 'financing_estimate' });
      }
    }
  });
})();
