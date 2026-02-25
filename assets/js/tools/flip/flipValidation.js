(function () {
  const eps = 0.00001;

  function validate(state, t = (_, fallback) => fallback) {
    const errors = [];
    const warnings = [];

    const critical = (field, message) => errors.push({ field, message, critical: true });
    const warn = (field, message) => warnings.push({ field, message });

    if (!(state.purchase.arv > 0)) critical('purchase.arv', t('flipValidationArvPositive', 'ARV must be greater than 0.'));
    if (!(state.purchase.offerPrice > 0)) critical('purchase.offerPrice', t('flipValidationOfferPositive', 'Offer price must be greater than 0.'));
    if (state.rehab.rehabBudget < 0) critical('rehab.rehabBudget', t('flipValidationRehabNonNegative', 'Rehab budget cannot be negative.'));
    if (state.holding.holdMonths < 0) critical('holding.holdMonths', t('flipValidationHoldMonthsNonNegative', 'Hold months cannot be negative.'));

    ['loanToPurchasePct', 'loanToRehabPct', 'downPaymentPct'].forEach((field) => {
      const value = state.financing[field];
      if (value < 0 || value > 1) {
        critical(`financing.${field}`, t('flipValidationFieldBetweenZeroAndOne', `${field} must be between 0 and 1.`));
      }
    });

    if ((state.financing.downPaymentPct + state.financing.loanToPurchasePct) > (1 + eps)) {
      critical('financing.downPaymentPct', t('flipValidationDpLtp', 'DP + LTP cannot exceed 100%.'));
    }

    if (state.exit.salePrice <= 0) warn('exit.salePrice', t('flipWarningSalePrice', 'Sale price <= 0. Review your exit assumptions.'));
    if (state.holding.holdMonths === 0) warn('holding.holdMonths', t('flipWarningHoldZero', 'Holding 0 months is unusual.'));
    if (state.rehab.contingencyPct < 0.05) warn('rehab.contingencyPct', t('flipWarningContingency', 'Contingency below 5% may be risky.'));
    if (state.exit.realtorCommissionPct < 0.04 || state.exit.realtorCommissionPct > 0.08) {
      warn('exit.realtorCommissionPct', t('flipWarningCommissionRange', 'Commission is outside the typical range (4%-8%).'));
    }

    return { errors, warnings, hasCritical: errors.some((e) => e.critical) };
  }

  window.FlipValidation = { validate };
})();
