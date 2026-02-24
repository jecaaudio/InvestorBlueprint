(function () {
  const clamp = (x, min, max) => Math.max(min, Math.min(max, Number(x) || 0));

  function compute(state) {
    const offerPrice = Number(state.purchase.offerPrice) || 0;
    const arv = Number(state.purchase.arv) || 0;
    const buyClosingCost = state.purchase.buyClosingOverride != null
      ? Number(state.purchase.buyClosingOverride) || 0
      : offerPrice * (Number(state.purchase.buyClosingPct) || 0);
    const purchaseTotal = offerPrice + buyClosingCost + (Number(state.purchase.inspectionOther) || 0);

    const rehabBudget = Number(state.rehab.rehabBudget) || 0;
    const rehabContingency = rehabBudget * (Number(state.rehab.contingencyPct) || 0);
    const rehabTotal = rehabBudget + rehabContingency;

    const holdMonths = Number(state.holding.holdMonths) || 0;
    const monthlyHolding = state.holding.holdingMonthlyOverride != null
      ? Number(state.holding.holdingMonthlyOverride) || 0
      : ['taxesPerMonth', 'insurancePerMonth', 'utilitiesPerMonth', 'hoaPerMonth', 'lawnPerMonth', 'otherPerMonth']
          .reduce((sum, key) => sum + (Number(state.holding[key]) || 0), 0);
    const holdingTotal = monthlyHolding * holdMonths;

    let loanPurchase = 0;
    let loanRehab = 0;
    let pointsCost = 0;
    let interestCost = 0;
    let origFees = 0;

    if (state.financing.type !== 'cash') {
      loanPurchase = offerPrice * clamp(state.financing.loanToPurchasePct, 0, 1);
      loanRehab = rehabBudget * clamp(state.financing.loanToRehabPct, 0, 1);
      const totalLoan = loanPurchase + loanRehab;
      pointsCost = totalLoan * clamp(state.financing.pointsPct, 0, 1);
      origFees = Number(state.financing.originationFees) || 0;
      const monthlyRate = (Number(state.financing.interestApr) || 0) / 12;
      const rehabMultiplier = state.financing.useDrawInterest ? 0.5 : 1;
      const interestBase = loanPurchase + (loanRehab * rehabMultiplier);
      interestCost = interestBase * monthlyRate * holdMonths;
    }

    const salePrice = Number(state.exit.salePrice) || 0;
    const realtorCost = salePrice * (Number(state.exit.realtorCommissionPct) || 0);
    const sellerClosingCost = salePrice * (Number(state.exit.sellerClosingPct) || 0);
    const sellingCosts = realtorCost + sellerClosingCost + (Number(state.exit.concessions) || 0) + (Number(state.exit.staging) || 0);

    const totalCosts = purchaseTotal + rehabTotal + holdingTotal + interestCost + pointsCost + origFees + sellingCosts;
    const netProceeds = salePrice - sellingCosts;
    const profit = salePrice - totalCosts;
    const profitMargin = salePrice > 0 ? profit / salePrice : 0;

    const cashToClosePurchase = Math.max(0, offerPrice - loanPurchase) + buyClosingCost + (Number(state.purchase.inspectionOther) || 0) + pointsCost + origFees;
    const cashForRehab = Math.max(0, rehabBudget - loanRehab) + rehabContingency;
    const cashNeeded = cashToClosePurchase + cashForRehab + holdingTotal + (Number(state.holding.reserves) || 0);

    const roi = cashNeeded > 0 ? profit / cashNeeded : 0;
    const breakEvenSale = totalCosts;

    const maoRulePct = Number(state.assumptions.maoRulePct) || 0;
    const maoBaseRule = (arv * maoRulePct) - rehabTotal;
    const maoAllIn = (arv * maoRulePct) - rehabTotal - holdingTotal - interestCost - pointsCost - origFees - (Number(state.purchase.inspectionOther) || 0) - (arv * (Number(state.exit.sellerClosingPct) || 0)) - (arv * (Number(state.exit.realtorCommissionPct) || 0));

    let dealGrade = '❌';
    if (profitMargin >= 0.15 && roi >= 0.2) dealGrade = '✅';
    else if ((profitMargin >= 0.1 && profitMargin < 0.15) || (roi >= 0.12 && roi < 0.2)) dealGrade = '⚠️';
    if (profitMargin < 0.1 || profit <= 0) dealGrade = '❌';

    return {
      summary: { buyClosingCost, purchaseTotal, rehabContingency, rehabTotal, monthlyHolding, holdingTotal, loanPurchase, loanRehab, pointsCost, interestCost, origFees, realtorCost, sellerClosingCost, sellingCosts, totalCosts, netProceeds, profit, profitMargin, cashNeeded, roi, breakEvenSale, maoBaseRule, maoAllIn, dealGrade },
      breakdown: [
        ['Purchase + Buy Closing + Fees', purchaseTotal],
        ['Rehab + Contingency', rehabTotal],
        ['Holding total', holdingTotal],
        ['Financing costs (interest + points + fees)', interestCost + pointsCost + origFees],
        ['Selling costs', sellingCosts],
        ['Total cost', totalCosts],
        ['Net proceeds', netProceeds],
        ['Profit', profit]
      ]
    };
  }

  function computeScenarios(baseState) {
    const makeScenario = (name, transform) => {
      const clone = JSON.parse(JSON.stringify(baseState));
      transform(clone);
      return { name, result: compute(clone).summary };
    };

    return [
      makeScenario('Conservador', (s) => {
        s.exit.salePrice *= 0.95;
        s.rehab.rehabBudget *= 1.1;
        s.holding.holdMonths += 1;
      }),
      makeScenario('Base', () => {}),
      makeScenario('Optimista', (s) => {
        s.exit.salePrice *= 1.03;
        s.holding.holdMonths = Math.max(0, s.holding.holdMonths - 1);
      })
    ];
  }

  window.FlipEngine = { compute, computeScenarios, clamp };
})();
