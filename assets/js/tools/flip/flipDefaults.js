(function () {
  const createFlipDefaults = () => ({
    mode: 'basic',
    purchase: {
      offerPrice: 150000,
      arv: 250000,
      buyClosingPct: 0.03,
      buyClosingOverride: null,
      inspectionOther: 0
    },
    rehab: {
      rehabBudget: 40000,
      contingencyPct: 0.1,
      rehabMonths: 4
    },
    financing: {
      type: 'cash',
      loanToPurchasePct: 0.9,
      loanToRehabPct: 1,
      downPaymentPct: 0.1,
      interestApr: 0.12,
      pointsPct: 0.02,
      originationFees: 0,
      interestOnly: true,
      useDrawInterest: false
    },
    holding: {
      holdMonths: 5,
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
      salePrice: 250000,
      salePriceTouched: false,
      realtorCommissionPct: 0.06,
      sellerClosingPct: 0.02,
      concessions: 0,
      staging: 0
    },
    assumptions: {
      maoRulePct: 0.7,
      maoProfitTarget: 0
    }
  });

  window.FlipDefaults = { createFlipDefaults };
})();
