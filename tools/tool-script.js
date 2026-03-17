(function () {
  const onDomReady = (callback) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
      return;
    }
    callback();
  };

  onDomReady(() => {
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

  const getMessages = () => window.IBI18n?.getCurrentMessages?.() || {};
  const t = (key, fallback = '') => getMessages()[key] || fallback;

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
      const value = parseNumeric(form.elements[rule.name]?.value);
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
      } else if (Number(input.value) < 0) {
        input.setCustomValidity(messages.cannotBeNegative);
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

  const getReturnLabel = (property) => Math.max(property.capRate, property.cocReturn);

  const renderRoiRows = (rows, messages) => {
    if (!roiResultRows) return;
    if (!rows.length) {
      roiResultRows.innerHTML = `<tr><td colspan="7">${t('roiNoResults', 'No simulated properties matched your filters.')}</td></tr>`;
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
          <td>${pct(getReturnLabel(property))}</td>
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

    if (window.IBAnalytics && typeof window.IBAnalytics.trackCalcRun === 'function') {
      window.IBAnalytics.trackCalcRun(type);
    }
    const values = Object.fromEntries(new FormData(form).entries());
    const num = (name) => parseNumeric(values[name]);

    if (type === 'flip') {
      if (!validateFlip(messages)) return;

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
        { label: messages.profit, value: money(netProfit) },
        { label: messages.mao, value: money(mao70) },
        { label: messages.cashToClose, value: money(cashToClose) },
        { label: messages.totalCosts, value: money(totalCosts) },
        { label: messages.roi, value: pct(roi) },
        { label: messages.breakEven, value: money(breakEven) }
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
        { name: 'vacancyRate', required: true, min: 0, max: 100 }
      ], messages)) return;

      const monthlyRent = num('monthlyRent');
      const vacancyRate = num('vacancyRate');
      const expenses = ['taxes', 'insurance', 'maintenance', 'management'].map(num);

      const cashFlow = monthlyRent * (1 - vacancyRate / 100) - expenses.reduce((sum, value) => sum + value, 0);
      setCards([
        { label: messages.monthlyCashFlow, value: money(cashFlow) },
        { label: messages.annualCashFlow, value: money(cashFlow * 12) },
        { label: t('vacancyRateLabel', 'Vacancy Rate'), value: pct(vacancyRate) }
      ]);
      output.textContent = t('cashFlowCalculated', 'Cash flow calculated.');
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

      const suggestedMonthlyRent = propertyValue > 0 && occupancy > 0 ? (propertyValue * targetYield) / (12 * occupancy) : 0;
      const annualIncome = suggestedMonthlyRent * 12 * occupancy;
      const grossYield = propertyValue > 0 ? (annualIncome / propertyValue) * 100 : 0;
      const netAfterExpenses = annualIncome - annualExpenses;

      setCards([
        { label: messages.rentSuggestedMonthly, value: money(suggestedMonthlyRent) },
        { label: messages.rentAnnualIncome, value: money(annualIncome) },
        { label: messages.rentGrossYield, value: pct(grossYield) },
        { label: messages.rentNetAfterExpenses, value: money(netAfterExpenses) }
      ]);
      output.textContent = t('rentProjectionCalculated', 'Rent projection calculated.');
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
      ], messages)) return;

      const average = (num('comp1') + num('comp2') + num('comp3')) / 3;
      const maxOffer = average * 0.7 - num('repairs');
      setCards([
        { label: messages.estimatedArv, value: money(average) },
        { label: messages.maxOffer, value: money(maxOffer) }
      ]);
      output.textContent = t('arvEstimateCalculated', 'ARV estimate calculated.');
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
      ], messages)) return;

      const loan = num('loanAmount');
      const interestCost = loan * (num('interestRate') / 100) * (num('months') / 12);
      const totalCost = loan * (num('points') / 100) + interestCost;
      setCards([
        { label: messages.totalFinancingCost, value: money(totalCost) },
        { label: messages.monthlyInterestCarry, value: money(interestCost / Math.max(num('months'), 1)) }
      ]);
      output.textContent = t('financingEstimateCalculated', 'Financing estimate calculated.');
      if (window.IBAnalytics && typeof window.IBAnalytics.trackCalcSuccess === 'function') {
        window.IBAnalytics.trackCalcSuccess(type, { result: 'financing_estimate' });
      }
      return;
    }

    if (type === 'roi_search') {
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
        { label: t('roiAverageReturn', 'Avg. return'), value: pct(filteredRows.reduce((sum, property) => sum + getReturnLabel(property), 0) / Math.max(filteredRows.length, 1)) }
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
  });
  });
})();
