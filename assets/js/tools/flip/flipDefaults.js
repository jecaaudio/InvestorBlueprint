(function () {
  const createFlipDefaults = () => ({
    mode: 'basic',
    purchase: {
      offerPrice: 0,
      arv: 0,
      buyClosingPct: 0,
      buyClosingOverride: null,
      inspectionOther: 0
    },
    rehab: {
      rehabBudget: 0,
      contingencyPct: 0,
      rehabMonths: 0
    },
    financing: {
      type: 'cash',
      loanToPurchasePct: 0,
      loanToRehabPct: 0,
      downPaymentPct: 0,
      interestApr: 0,
      pointsPct: 0,
      originationFees: 0,
      interestOnly: true,
      useDrawInterest: false
    },
    holding: {
      holdMonths: 0,
      taxesPerMonth: 0,
      insurancePerMonth: 0,
      utilitiesPerMonth: 0,
      hoaPerMonth: 0,
      lawnPerMonth: 0,
      otherPerMonth: 0,
      reserves: 0,
      holdingMonthlyOverride: null
    },
    exit: {
      salePrice: 0,
      salePriceTouched: false,
      realtorCommissionPct: 0,
      sellerClosingPct: 0,
      concessions: 0,
      staging: 0
    },
    assumptions: {
      maoRulePct: 0,
      maoProfitTarget: 0
    }
  });

  window.FlipDefaults = { createFlipDefaults };
})();
