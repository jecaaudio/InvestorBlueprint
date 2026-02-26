(() => {
  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

  const computeDeal = (rawInput) => {
    const input = {
      arv: Math.max(0, rawInput.arv || 0),
      purchase: Math.max(0, rawInput.purchase || 0),
      rehab: Math.max(0, rawInput.rehab || 0),
      loanPct: clamp(rawInput.loanPct || 0, 0, 100),
      downPct: clamp(rawInput.downPct || 0, 0, 100),
      pointsPct: clamp(rawInput.pointsPct || 0, 0, 20),
      interestApr: clamp(rawInput.interestApr || 0, 0, 50),
      months: clamp(rawInput.months || 0, 0, 60),
      holdingMonthly: Math.max(0, rawInput.holdingMonthly || 0),
      agentPct: clamp(rawInput.agentPct || 0, 0, 20),
      closingPct: clamp(rawInput.closingPct || 0, 0, 20),
      contingencyPct: clamp(rawInput.contingencyPct || 0, 0, 50),
      desiredProfit: Math.max(0, rawInput.desiredProfit || 0)
    };

    const pct = {
      loan: input.loanPct / 100,
      down: input.downPct / 100,
      points: input.pointsPct / 100,
      interest: input.interestApr / 100,
      agent: input.agentPct / 100,
      closing: input.closingPct / 100,
      contingency: input.contingencyPct / 100
    };

    const rehabWithContingency = input.rehab * (1 + pct.contingency);
    const loanPurchase = input.purchase * pct.loan;
    const loanRehab = rehabWithContingency * pct.loan;
    const loanTotal = loanPurchase + loanRehab;

    const pointsCost = loanTotal * pct.points;
    const interestPurchase = loanPurchase * pct.interest * (input.months / 12);
    const avgDrawnRehabLoan = loanRehab * 0.5;
    const interestRehab = avgDrawnRehabLoan * pct.interest * (input.months / 12);
    const interestCost = interestPurchase + interestRehab;

    const holdingCost = input.holdingMonthly * input.months;
    const sellingCost = input.arv * (pct.agent + pct.closing);

    const totalCosts = input.purchase + rehabWithContingency + pointsCost + interestCost + holdingCost + sellingCost;
    const profit = input.arv - totalCosts;

    const purchaseDownPayment = input.purchase * pct.down;
    const uncoveredPurchase = Math.max(0, input.purchase - loanPurchase - purchaseDownPayment);
    const uncoveredRehab = Math.max(0, rehabWithContingency - loanRehab);
    const cashNeeded = Math.max(0, purchaseDownPayment + uncoveredPurchase + uncoveredRehab + pointsCost + interestCost + holdingCost);

    const roi = cashNeeded > 0 ? profit / cashNeeded : 0;
    const roiAnnualized = input.months > 0 ? roi * (12 / input.months) : 0;

    const mao = Math.max(0, input.arv - (rehabWithContingency + sellingCost + holdingCost + pointsCost + interestCost + input.desiredProfit));

    const financingCost = pointsCost + interestCost;

    return {
      input,
      rehabWithContingency,
      loanPurchase,
      loanRehab,
      loanTotal,
      pointsCost,
      interestCost,
      holdingCost,
      sellingCost,
      financingCost,
      totalCosts,
      profit,
      cashNeeded,
      roi,
      roiAnnualized,
      mao
    };
  };

  window.FlipCore = { computeDeal };
})();
