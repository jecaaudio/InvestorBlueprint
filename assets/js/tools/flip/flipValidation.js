(function () {
  const eps = 0.00001;

  function validate(state) {
    const errors = [];
    const warnings = [];

    const critical = (field, message) => errors.push({ field, message, critical: true });
    const warn = (field, message) => warnings.push({ field, message });

    if (!(state.purchase.arv > 0)) critical('purchase.arv', 'ARV debe ser mayor a 0.');
    if (!(state.purchase.offerPrice > 0)) critical('purchase.offerPrice', 'Offer price debe ser mayor a 0.');
    if (state.rehab.rehabBudget < 0) critical('rehab.rehabBudget', 'Rehab budget no puede ser negativo.');
    if (state.holding.holdMonths < 0) critical('holding.holdMonths', 'Hold months no puede ser negativo.');

    ['loanToPurchasePct', 'loanToRehabPct', 'downPaymentPct'].forEach((field) => {
      const value = state.financing[field];
      if (value < 0 || value > 1) {
        critical(`financing.${field}`, `${field} debe estar entre 0 y 1.`);
      }
    });

    if ((state.financing.downPaymentPct + state.financing.loanToPurchasePct) > (1 + eps)) {
      critical('financing.downPaymentPct', 'DP + LTP no puede exceder 100%.');
    }

    if (state.exit.salePrice <= 0) warn('exit.salePrice', 'Sale price <= 0. Revisa salida.');
    if (state.holding.holdMonths === 0) warn('holding.holdMonths', 'Holding 0 meses es inusual.');
    if (state.rehab.contingencyPct < 0.05) warn('rehab.contingencyPct', 'Contingency menor a 5% puede ser riesgoso.');
    if (state.exit.realtorCommissionPct < 0.04 || state.exit.realtorCommissionPct > 0.08) {
      warn('exit.realtorCommissionPct', 'Comisión fuera del rango típico (4%-8%).');
    }

    return { errors, warnings, hasCritical: errors.some((e) => e.critical) };
  }

  window.FlipValidation = { validate };
})();
