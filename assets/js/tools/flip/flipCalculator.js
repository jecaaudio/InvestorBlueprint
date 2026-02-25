(function () {
  const currency = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(n) || 0);
  const percent = (n) => `${((Number(n) || 0) * 100).toFixed(1)}%`;

  function init() {
    const mount = document.getElementById('flip-calculator');
    if (!mount || !window.FlipDefaults) return;

    mount.innerHTML = window.FlipTemplates.appTemplate();

    const getMessages = () => {
      const lang = document.documentElement.lang === 'es' ? 'es' : 'en';
      return window.translations?.[lang] || window.translations?.en || {};
    };
    const t = (key, fallback) => getMessages()[key] || fallback;

    let state = window.FlipDefaults.createFlipDefaults();
    let debounceId;

    const scenarioNameInput = mount.querySelector('#scenario-name');
    const savedScenariosSelect = mount.querySelector('#saved-scenarios');
    const savedScenarioMessage = mount.querySelector('#saved-scenario-message');

    const applyStaticTranslations = () => {
      mount.querySelectorAll('[data-i18n-flip]').forEach((element) => {
        const key = element.dataset.i18nFlip;
        element.textContent = t(key, element.textContent);
      });

      mount.querySelectorAll('[data-i18n-flip-placeholder]').forEach((element) => {
        const key = element.dataset.i18nFlipPlaceholder;
        const translated = t(key, element.getAttribute('placeholder') || '');
        element.setAttribute('placeholder', translated);
      });
    };

    const setMessage = (text) => {
      if (savedScenarioMessage) {
        savedScenarioMessage.textContent = text;
      }
    };

    const translateScenarioName = (name) => {
      if (name === 'Conservador') return t('flipScenarioConservative', 'Conservative');
      if (name === 'Base') return t('flipScenarioBase', 'Base');
      if (name === 'Optimista') return t('flipScenarioOptimistic', 'Optimistic');
      return name;
    };

    const translateBreakdownLabel = (label) => {
      const keys = {
        'Purchase + Buy Closing + Fees': 'flipBreakdownPurchase',
        'Rehab + Contingency': 'flipBreakdownRehab',
        'Holding total': 'flipBreakdownHolding',
        'Financing costs (interest + points + fees)': 'flipBreakdownFinancing',
        'Selling costs': 'flipBreakdownSelling',
        'Total cost': 'flipBreakdownTotalCost',
        'Net proceeds': 'flipBreakdownNetProceeds',
        Profit: 'flipBreakdownProfit'
      };
      return t(keys[label], label);
    };

    const fillSavedScenarios = () => {
      if (!savedScenariosSelect) return;

      const scenarios = window.FlipStorage.getNamedCalculations('flip');
      const options = [`<option value="">${t('flipSelectSavedPlaceholder', 'Select a saved calculation')}</option>`];
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

    const getFocusedField = () => {
      const active = document.activeElement;
      if (!active || active.tagName !== 'INPUT' || !active.dataset.path) return null;
      return {
        path: active.dataset.path,
        type: active.type,
        selectionStart: typeof active.selectionStart === 'number' ? active.selectionStart : null,
        selectionEnd: typeof active.selectionEnd === 'number' ? active.selectionEnd : null
      };
    };

    const restoreFocusedField = (focusState) => {
      if (!focusState) return;
      const next = mount.querySelector(`input[data-path="${focusState.path}"]`);
      if (!next) return;
      next.focus({ preventScroll: true });
      if (focusState.type !== 'checkbox' && focusState.selectionStart != null && focusState.selectionEnd != null) {
        next.setSelectionRange(focusState.selectionStart, focusState.selectionEnd);
      }
    };

    const render = () => {
      applyStaticTranslations();
      const focusState = getFocusedField();
      const validation = window.FlipValidation.validate(state, t);
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
        [t('flipSummaryMAO', 'MAO'), s.maoAllIn],
        [t('flipSummaryNetProfit', 'Net Profit'), s.profit],
        [t('flipSummaryProfitMargin', 'Profit Margin'), percent(s.profitMargin)],
        [t('flipSummaryCashNeeded', 'Total Cash Needed'), s.cashNeeded],
        [t('flipSummaryROI', 'ROI'), percent(s.roi)],
        [t('flipSummaryBreakEven', 'Break-even'), s.breakEvenSale],
        [t('flipSummaryDealGrade', 'Deal Grade'), validation.hasCritical ? '⛔' : s.dealGrade]
      ]
        .map(([k, v]) => `<div class="metric"><strong>${k}</strong><span>${typeof v === 'string' ? v : currency(v)}</span></div>`)
        .join('')}`;

      const basicInputs = [
        [t('flipInputArv', 'ARV'), 'purchase.arv', state.purchase.arv],
        [t('flipInputOfferPrice', 'Offer Price'), 'purchase.offerPrice', state.purchase.offerPrice],
        [t('flipInputRehabBudget', 'Rehab Budget'), 'rehab.rehabBudget', state.rehab.rehabBudget],
        [t('flipInputHoldMonths', 'Hold Months'), 'holding.holdMonths', state.holding.holdMonths, 'int'],
        [t('flipInputInterestApr', 'Interest APR %'), 'financing.interestApr', state.financing.interestApr],
        [t('flipInputPoints', 'Points %'), 'financing.pointsPct', state.financing.pointsPct],
        [t('flipInputDownPayment', 'Down Payment %'), 'financing.downPaymentPct', state.financing.downPaymentPct],
        [t('flipInputCommission', 'Commission %'), 'exit.realtorCommissionPct', state.exit.realtorCommissionPct],
        [t('flipInputBuyClosing', 'Buy Closing %'), 'purchase.buyClosingPct', state.purchase.buyClosingPct],
        [t('flipInputHoldingMonthly', 'Holding Monthly $'), 'holding.holdingMonthlyOverride', state.holding.holdingMonthlyOverride]
      ];
      const proInputs = [
        [t('flipInputBuyClosingOverride', 'Buy Closing Override $'), 'purchase.buyClosingOverride', state.purchase.buyClosingOverride],
        [t('flipInputInspectionOther', 'Inspection/Other $'), 'purchase.inspectionOther', state.purchase.inspectionOther],
        [t('flipInputContingency', 'Contingency %'), 'rehab.contingencyPct', state.rehab.contingencyPct],
        [t('flipInputRehabMonths', 'Rehab Months'), 'rehab.rehabMonths', state.rehab.rehabMonths, 'int'],
        [t('flipInputTaxesMonth', 'Taxes/mo'), 'holding.taxesPerMonth', state.holding.taxesPerMonth],
        [t('flipInputInsuranceMonth', 'Insurance/mo'), 'holding.insurancePerMonth', state.holding.insurancePerMonth],
        [t('flipInputUtilitiesMonth', 'Utilities/mo'), 'holding.utilitiesPerMonth', state.holding.utilitiesPerMonth],
        [t('flipInputHoaMonth', 'HOA/mo'), 'holding.hoaPerMonth', state.holding.hoaPerMonth],
        [t('flipInputLawnMonth', 'Lawn/mo'), 'holding.lawnPerMonth', state.holding.lawnPerMonth],
        [t('flipInputOtherMonth', 'Other/mo'), 'holding.otherPerMonth', state.holding.otherPerMonth],
        [t('flipInputReserves', 'Reserves'), 'holding.reserves', state.holding.reserves],
        [t('flipInputLtp', 'LTP %'), 'financing.loanToPurchasePct', state.financing.loanToPurchasePct],
        [t('flipInputLtr', 'LTR %'), 'financing.loanToRehabPct', state.financing.loanToRehabPct],
        [t('flipInputOriginationFees', 'Origination Fees'), 'financing.originationFees', state.financing.originationFees],
        [t('flipInputSalePrice', 'Sale Price'), 'exit.salePrice', state.exit.salePrice],
        [t('flipInputSellerClosing', 'Seller Closing %'), 'exit.sellerClosingPct', state.exit.sellerClosingPct],
        [t('flipInputConcessions', 'Concessions'), 'exit.concessions', state.exit.concessions],
        [t('flipInputStaging', 'Staging'), 'exit.staging', state.exit.staging],
        [t('flipInputMaoRule', 'MAO Rule %'), 'assumptions.maoRulePct', state.assumptions.maoRulePct]
      ];

      mount.querySelector('#flip-inputs').innerHTML = `
        <div class="card-block">
          <h3>${t('flipInputsTitle', 'Inputs')}</h3>
          <div class="form-grid">${basicInputs.map((x) => renderInput(...x)).join('')}</div>
          ${
            state.mode === 'pro'
              ? `<div class="form-grid">${proInputs.map((x) => renderInput(...x)).join('')}</div>
          <label><input type="checkbox" data-path="financing.useDrawInterest" ${state.financing.useDrawInterest ? 'checked' : ''}> ${t('flipUseDrawInterest', 'Pro: use 50% average rehab draw for interest')}</label>`
              : ''
          }
        </div>
      `;

      mount.querySelector('#flip-scenarios').innerHTML = `
        <div class="card-block"><h3>${t('flipScenariosTitle', 'Scenarios')}</h3><div class="table-wrap"><table><thead><tr><th>${t('flipScenarioColName', 'Scenario')}</th><th>${t('flipScenarioColProfit', 'Profit')}</th><th>${t('flipScenarioColCashNeeded', 'Cash Needed')}</th><th>${t('flipScenarioColBreakEven', 'Break-even')}</th><th>${t('flipScenarioColROI', 'ROI')}</th></tr></thead>
        <tbody>${scenarios
          .map((sc) => `<tr><td>${translateScenarioName(sc.name)}</td><td>${currency(sc.result.profit)}</td><td>${currency(sc.result.cashNeeded)}</td><td>${currency(sc.result.breakEvenSale)}</td><td>${percent(sc.result.roi)}</td></tr>`)
          .join('')}</tbody></table></div></div>`;

      mount.querySelector('#flip-breakdown').innerHTML = `<div class="card-block"><h3>${t('flipCostBreakdownTitle', 'Cost Breakdown')}</h3><div class="table-wrap"><table><tbody>${result.breakdown
        .map((row) => `<tr><td>${translateBreakdownLabel(row[0])}</td><td>${currency(row[1])}</td></tr>`)
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

      restoreFocusedField(focusState);
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
        setMessage(t('flipMessageReset', 'Current calculation was reset.'));
        render();
      }
      if (e.target.id === 'export-json') {
        navigator.clipboard.writeText(JSON.stringify(state, null, 2));
        setMessage(t('flipMessageJsonCopied', 'JSON copied to clipboard.'));
      }
      if (e.target.id === 'copy-link') {
        const q = encodeURIComponent(btoa(JSON.stringify(state)));
        const url = `${location.origin}${location.pathname}?flip=${q}`;
        navigator.clipboard.writeText(url);
        setMessage(t('flipMessageLinkCopied', 'Link copied.'));
      }
      if (e.target.id === 'save-scenario') {
        const rawName = scenarioNameInput?.value?.trim() || '';
        const scenarioName = rawName || `${t('flipScenarioDefaultPrefix', 'Calculation')} ${new Date().toLocaleDateString()}`;
        const saved = window.FlipStorage.saveNamedCalculation(scenarioName, state, 'flip');
        if (!saved) {
          setMessage(t('flipMessageLoginRequired', 'Log in to save calculations to your profile.'));
          return;
        }
        fillSavedScenarios();
        savedScenariosSelect.value = saved.id;
        setMessage(t('flipMessageSaved', 'Calculation saved to your profile.'));
      }
      if (e.target.id === 'load-scenario') {
        const selectedId = savedScenariosSelect?.value;
        if (!selectedId) {
          setMessage(t('flipMessageSelectToLoad', 'Select a calculation to load.'));
          return;
        }
        const found = window.FlipStorage.loadNamedCalculation(selectedId, 'flip');
        if (!found) {
          setMessage(t('flipMessageNotFound', 'We could not find that saved calculation.'));
          return;
        }
        state = found.state;
        mergeDefaults();
        window.FlipStorage.save(state);
        scenarioNameInput.value = found.name;
        setMessage(t('flipMessageLoaded', 'Calculation loaded. You can now adjust it.'));
        render();
      }
      if (e.target.id === 'delete-scenario') {
        const selectedId = savedScenariosSelect?.value;
        if (!selectedId) {
          setMessage(t('flipMessageSelectToDelete', 'Select a calculation to delete.'));
          return;
        }
        const removed = window.FlipStorage.deleteNamedCalculation(selectedId, 'flip');
        if (!removed) {
          setMessage(t('flipMessageDeleteFailed', 'Could not delete the selected calculation.'));
          return;
        }
        fillSavedScenarios();
        setMessage(t('flipMessageDeleted', 'Calculation deleted from your profile.'));
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

    document.addEventListener('ib:language-changed', () => {
      fillSavedScenarios();
      render();
    });

    fillSavedScenarios();
    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
