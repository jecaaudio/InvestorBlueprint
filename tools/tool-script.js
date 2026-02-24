(function () {
  const form = document.getElementById('tool-form');
  const output = document.getElementById('result-detail');
  const cards = document.getElementById('result-cards');
  const type = document.body.dataset.tool;
  const planHint = document.getElementById('plan-hint');
  const sampleBtn = document.getElementById('load-sample');

  if (!form || !type) return;

  const money = (value) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value) || 0);
  const pct = (value) => `${(Number(value) || 0).toFixed(1)}%`;

  const copy = {
    en: {
      monthlyCashFlow: 'Monthly Cash Flow',
      annualCashFlow: 'Annual Cash Flow',
      estimatedArv: 'Estimated ARV',
      maxOffer: 'Maximum Offer (70% Rule)',
      totalFinancingCost: 'Total Financing Cost',
      monthlyInterestCarry: 'Monthly Interest Carry',
      freeHint: 'Free mode: quick estimate with purchase, rehab, holding and sale costs only.',
      proHint: 'Pro mode enabled: includes financing stack, MAO strategy checks, risk buffer and sensitivity table.'
    },
    es: {
      monthlyCashFlow: 'Flujo de caja mensual',
      annualCashFlow: 'Flujo de caja anual',
      estimatedArv: 'ARV estimado',
      maxOffer: 'Oferta máxima (regla del 70%)',
      totalFinancingCost: 'Costo total del financiamiento',
      monthlyInterestCarry: 'Carga mensual de intereses',
      freeHint: 'Modo gratis: estimación rápida con compra, rehab, holding y costos de venta.',
      proHint: 'Modo Pro: incluye estructura de financiamiento, MAO por objetivos, buffer de riesgo y sensibilidades.'
    }
  };

  const getLang = () => (document.documentElement.lang === 'es' ? 'es' : 'en');

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
  const validateFlip = () => {
    let valid = true;
    requiredFields.forEach((field) => {
      const input = form.elements[field];
      if (!input) return;
      input.setCustomValidity('');
      if (!input.value) {
        input.setCustomValidity('Required field');
        valid = false;
      } else if (Number(input.value) < 0) {
        input.setCustomValidity('Cannot be negative');
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
        syncPlanMode();
        setCards([
          { label: 'Profit', value: '$0' },
          { label: 'MAO', value: '$0' },
          { label: 'Cash to Close', value: '$0' },
          { label: 'Total Costs', value: '$0' },
          { label: 'ROI', value: '0.0%' },
          { label: 'Break-even', value: '$0' }
        ]);
        if (output) output.textContent = 'Enter your numbers and click calculate.';
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
    const num = (name) => Number(values[name] || 0);

    if (type === 'flip') {
      if (!validateFlip()) return;

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
        financingTotal =
          financedAmount * (num('pointsPct') / 100) +
          financedAmount * (num('interestRate') / 100) * (num('holdingMonths') / 12) +
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
        { label: 'Profit', value: money(netProfit) },
        { label: 'MAO', value: money(mao70) },
        { label: 'Cash to Close', value: money(cashToClose) },
        { label: 'Total Costs', value: money(totalCosts) },
        { label: 'ROI', value: pct(roi) },
        { label: 'Break-even', value: money(breakEven) }
      ]);

      if (output) {
        output.innerHTML = `
          <div class="badge ${netProfit > 0 ? 'green' : 'red'}">Deal Score: ${score}</div>
          <h3>Cost Breakdown</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Section</th><th>Total</th></tr></thead>
              <tbody>
                <tr><td>Acquisition</td><td>${money(acquisition)}</td></tr>
                <tr><td>Rehab + contingency</td><td>${money(rehabTotal)}</td></tr>
                <tr><td>Holding</td><td>${money(holdingTotal)}</td></tr>
                <tr><td>Selling</td><td>${money(sellingTotal)}</td></tr>
                <tr><td>Financing</td><td>${money(financingTotal)}</td></tr>
              </tbody>
            </table>
          </div>
          <h3>Sensitivity Results</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Scenario</th><th>Profit</th></tr></thead>
              <tbody>
                <tr><td>Low</td><td>${money(scenarioLow)}</td></tr>
                <tr><td>Base</td><td>${money(scenarioBase)}</td></tr>
                <tr><td>High</td><td>${money(scenarioHigh)}</td></tr>
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
