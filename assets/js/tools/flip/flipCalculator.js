(function () {
  const currency = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(n) || 0);
  const percent = (n) => `${((Number(n) || 0) * 100).toFixed(1)}%`;

  function init() {
    const mount = document.getElementById('flip-calculator');
    if (!mount || !window.FlipDefaults) return;

    mount.innerHTML = window.FlipTemplates.appTemplate();

    let state = window.FlipStorage.load() || window.FlipDefaults.createFlipDefaults();
    let debounceId;

    const scenarioNameInput = mount.querySelector('#scenario-name');
    const savedScenariosSelect = mount.querySelector('#saved-scenarios');
    const savedScenarioMessage = mount.querySelector('#saved-scenario-message');

    const setMessage = (text) => {
      if (savedScenarioMessage) {
        savedScenarioMessage.textContent = text;
      }
    };

    const fillSavedScenarios = () => {
      if (!savedScenariosSelect) return;

      const scenarios = window.FlipStorage.getNamedCalculations('flip');
      const options = ['<option value="">Selecciona un cálculo guardado</option>'];
      scenarios.forEach((item) => {
        const updated = new Date(item.updatedAt).toLocaleString();
        options.push(`<option value="${item.id}">${item.name} · ${updated}</option>`);
      });
      savedScenariosSelect.innerHTML = options.join('');
    };

    const mergeDefaults = () => {
      const defaults = window.FlipDefaults.createFlipDefaults();
      state = {
        ...defaults,
        ...state,
        purchase: { ...defaults.purchase, ...state.purchase },
        rehab: { ...defaults.rehab, ...state.rehab },
        financing: { ...defaults.financing, ...state.financing },
        holding: { ...defaults.holding, ...state.holding },
        exit: { ...defaults.exit, ...state.exit },
        assumptions: { ...defaults.assumptions, ...state.assumptions }
      };
    };
    mergeDefaults();

    const setByPath = (path, rawValue) => {
      const segments = path.split('.');
      const last = segments.pop();
      let cursor = state;
      segments.forEach((seg) => {
        cursor = cursor[seg];
      });
      if (last.endsWith('Pct') || ['interestApr', 'maoRulePct'].includes(last)) {
        cursor[last] = Number(rawValue || 0) / 100;
      } else if (last === 'salePriceTouched') {
        cursor[last] = !!rawValue;
      } else if (rawValue === '') {
        cursor[last] = null;
      } else {
        cursor[last] = Number(rawValue);
      }
    };

    const renderInput = (label, path, val, type) => {
      const isPct = path.includes('Pct') || ['financing.interestApr', 'assumptions.maoRulePct'].includes(path);
      const value = val == null ? '' : isPct ? val * 100 : val;
      return `<label>${label}<input inputmode="decimal" data-path="${path}" type="number" step="${type === 'int' ? '1' : '0.01'}" value="${value}"></label>`;
    };

    const render = () => {
      const validation = window.FlipValidation.validate(state);
      const result = window.FlipEngine.compute(state);
      const scenarios = window.FlipEngine.computeScenarios(state);

      mount.querySelectorAll('.mode-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.mode === state.mode));
      mount.querySelector('#financing-type').value = state.financing.type;

      const errEl = mount.querySelector('#flip-errors');
      errEl.innerHTML = [
        ...validation.errors.map((e) => `<div class="error">${e.message}</div>`),
        ...validation.warnings.map((w) => `<div class="warning">${w.message}</div>`)
      ].join('');

      const s = result.summary;
      mount.querySelector('#flip-summary').innerHTML = `${[
        ['MAO', s.maoAllIn],
        ['Net Profit', s.profit],
        ['Profit Margin', percent(s.profitMargin)],
        ['Total Cash Needed', s.cashNeeded],
        ['ROI', percent(s.roi)],
        ['Break-even', s.breakEvenSale],
        ['Deal Grade', validation.hasCritical ? '⛔' : s.dealGrade]
      ]
        .map(([k, v]) => `<div class="metric"><strong>${k}</strong><span>${typeof v === 'string' ? v : currency(v)}</span></div>`)
        .join('')}`;

      const basicInputs = [
        ['ARV', 'purchase.arv', state.purchase.arv],
        ['Offer Price', 'purchase.offerPrice', state.purchase.offerPrice],
        ['Rehab Budget', 'rehab.rehabBudget', state.rehab.rehabBudget],
        ['Hold Months', 'holding.holdMonths', state.holding.holdMonths, 'int'],
        ['Interest APR %', 'financing.interestApr', state.financing.interestApr],
        ['Points %', 'financing.pointsPct', state.financing.pointsPct],
        ['Down Payment %', 'financing.downPaymentPct', state.financing.downPaymentPct],
        ['Commission %', 'exit.realtorCommissionPct', state.exit.realtorCommissionPct],
        ['Buy Closing %', 'purchase.buyClosingPct', state.purchase.buyClosingPct],
        ['Holding Monthly $', 'holding.holdingMonthlyOverride', state.holding.holdingMonthlyOverride]
      ];
      const proInputs = [
        ['Buy Closing Override $', 'purchase.buyClosingOverride', state.purchase.buyClosingOverride],
        ['Inspection/Other $', 'purchase.inspectionOther', state.purchase.inspectionOther],
        ['Contingency %', 'rehab.contingencyPct', state.rehab.contingencyPct],
        ['Rehab Months', 'rehab.rehabMonths', state.rehab.rehabMonths, 'int'],
        ['Taxes/mo', 'holding.taxesPerMonth', state.holding.taxesPerMonth],
        ['Insurance/mo', 'holding.insurancePerMonth', state.holding.insurancePerMonth],
        ['Utilities/mo', 'holding.utilitiesPerMonth', state.holding.utilitiesPerMonth],
        ['HOA/mo', 'holding.hoaPerMonth', state.holding.hoaPerMonth],
        ['Lawn/mo', 'holding.lawnPerMonth', state.holding.lawnPerMonth],
        ['Other/mo', 'holding.otherPerMonth', state.holding.otherPerMonth],
        ['Reserves', 'holding.reserves', state.holding.reserves],
        ['LTP %', 'financing.loanToPurchasePct', state.financing.loanToPurchasePct],
        ['LTR %', 'financing.loanToRehabPct', state.financing.loanToRehabPct],
        ['Origination Fees', 'financing.originationFees', state.financing.originationFees],
        ['Sale Price', 'exit.salePrice', state.exit.salePrice],
        ['Seller Closing %', 'exit.sellerClosingPct', state.exit.sellerClosingPct],
        ['Concessions', 'exit.concessions', state.exit.concessions],
        ['Staging', 'exit.staging', state.exit.staging],
        ['MAO Rule %', 'assumptions.maoRulePct', state.assumptions.maoRulePct]
      ];

      mount.querySelector('#flip-inputs').innerHTML = `
        <div class="card-block">
          <h3>Inputs</h3>
          <div class="form-grid">${basicInputs.map((x) => renderInput(...x)).join('')}</div>
          ${
            state.mode === 'pro'
              ? `<div class="form-grid">${proInputs.map((x) => renderInput(...x)).join('')}</div>
          <label><input type="checkbox" data-path="financing.useDrawInterest" ${state.financing.useDrawInterest ? 'checked' : ''}> Pro: usar draw promedio rehab 50% para interés</label>`
              : ''
          }
        </div>
      `;

      mount.querySelector('#flip-scenarios').innerHTML = `
        <div class="card-block"><h3>Escenarios</h3><div class="table-wrap"><table><thead><tr><th>Escenario</th><th>Profit</th><th>Cash Needed</th><th>Break-even</th><th>ROI</th></tr></thead>
        <tbody>${scenarios
          .map((sc) => `<tr><td>${sc.name}</td><td>${currency(sc.result.profit)}</td><td>${currency(sc.result.cashNeeded)}</td><td>${currency(sc.result.breakEvenSale)}</td><td>${percent(sc.result.roi)}</td></tr>`)
          .join('')}</tbody></table></div></div>`;

      mount.querySelector('#flip-breakdown').innerHTML = `<div class="card-block"><h3>Cost Breakdown</h3><div class="table-wrap"><table><tbody>${result.breakdown
        .map((row) => `<tr><td>${row[0]}</td><td>${currency(row[1])}</td></tr>`)
        .join('')}</tbody></table></div></div>`;

      mount.querySelectorAll('input[data-path]').forEach((input) => {
        input.addEventListener('input', (e) => {
          const { path } = e.target.dataset;
          if (path === 'purchase.arv' && !state.exit.salePriceTouched) {
            setByPath(path, e.target.value);
            state.exit.salePrice = Number(e.target.value || 0);
          } else {
            setByPath(path, e.target.type === 'checkbox' ? e.target.checked : e.target.value);
            if (path === 'exit.salePrice') state.exit.salePriceTouched = true;
          }
          queueSave();
          render();
        });
      });
    };

    const queueSave = () => {
      clearTimeout(debounceId);
      debounceId = setTimeout(() => window.FlipStorage.save(state), 300);
    };

    mount.addEventListener('click', (e) => {
      if (e.target.matches('.mode-btn')) {
        state.mode = e.target.dataset.mode;
        queueSave();
        render();
      }
      if (e.target.id === 'reset-defaults') {
        state = window.FlipDefaults.createFlipDefaults();
        window.FlipStorage.clear();
        setMessage('Se reinició el cálculo actual.');
        render();
      }
      if (e.target.id === 'export-json') {
        navigator.clipboard.writeText(JSON.stringify(state, null, 2));
        setMessage('JSON copiado al portapapeles.');
      }
      if (e.target.id === 'copy-link') {
        const q = encodeURIComponent(btoa(JSON.stringify(state)));
        const url = `${location.origin}${location.pathname}?flip=${q}`;
        navigator.clipboard.writeText(url);
        setMessage('Link copiado.');
      }
      if (e.target.id === 'save-scenario') {
        const rawName = scenarioNameInput?.value?.trim() || '';
        const scenarioName = rawName || `Cálculo ${new Date().toLocaleDateString()}`;
        const saved = window.FlipStorage.saveNamedCalculation(scenarioName, state, 'flip');
        if (!saved) {
          setMessage('Inicia sesión para guardar cálculos en tu perfil.');
          return;
        }
        fillSavedScenarios();
        savedScenariosSelect.value = saved.id;
        setMessage('Cálculo guardado en tu perfil.');
      }
      if (e.target.id === 'load-scenario') {
        const selectedId = savedScenariosSelect?.value;
        if (!selectedId) {
          setMessage('Selecciona un cálculo para cargar.');
          return;
        }
        const found = window.FlipStorage.loadNamedCalculation(selectedId, 'flip');
        if (!found) {
          setMessage('No encontramos ese cálculo guardado.');
          return;
        }
        state = found.state;
        mergeDefaults();
        window.FlipStorage.save(state);
        scenarioNameInput.value = found.name;
        setMessage('Cálculo cargado. Ya puedes ajustarlo.');
        render();
      }
      if (e.target.id === 'delete-scenario') {
        const selectedId = savedScenariosSelect?.value;
        if (!selectedId) {
          setMessage('Selecciona un cálculo para eliminar.');
          return;
        }
        const removed = window.FlipStorage.deleteNamedCalculation(selectedId, 'flip');
        if (!removed) {
          setMessage('No se pudo eliminar el cálculo seleccionado.');
          return;
        }
        fillSavedScenarios();
        setMessage('Cálculo eliminado de tu perfil.');
      }
    });

    mount.querySelector('#financing-type').addEventListener('change', (e) => {
      state.financing.type = e.target.value;
      queueSave();
      render();
    });

    const param = new URLSearchParams(location.search).get('flip');
    if (param) {
      try {
        state = JSON.parse(atob(decodeURIComponent(param)));
      } catch {
        // no-op
      }
    }

    fillSavedScenarios();
    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
