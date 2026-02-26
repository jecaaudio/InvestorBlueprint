(() => {
  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

  const normalizeDraws = (draws = []) => {
    const clean = (Array.isArray(draws) && draws.length ? draws : [0, 25, 50, 75, 100])
      .map((n) => clamp(Number(n) || 0, 0, 100))
      .sort((a, b) => a - b);
    if (clean[0] !== 0) clean.unshift(0);
    if (clean[clean.length - 1] !== 100) clean.push(100);
    return clean;
  };

  const averageFundedPct = (drawSchedule) => {
    const draws = normalizeDraws(drawSchedule);
    let area = 0;
    for (let i = 1; i < draws.length; i += 1) {
      const prev = draws[i - 1] / 100;
      const curr = draws[i] / 100;
      area += ((prev + curr) / 2) * (1 / (draws.length - 1));
    }
    return clamp(area, 0, 1);
  };

  const computeDeal = (rawInput) => {
    const input = {
      model: rawInput.model === "hardMoney" ? "hardMoney" : "standard",
      arv: Math.max(0, rawInput.arv || 0),
      expectedSellingPrice: Math.max(0, rawInput.expectedSellingPrice || rawInput.arv || 0),
      purchase: Math.max(0, rawInput.purchase || 0),
      rehab: Math.max(0, rawInput.rehab || 0),
      loanPct: clamp(rawInput.loanPct || 0, 0, 100),
      rehabFinancingPct: clamp((rawInput.rehabFinancingPct ?? rawInput.loanPct ?? 0), 0, 100),
      downPct: clamp(rawInput.downPct || 0, 0, 100),
      pointsPct: clamp(rawInput.pointsPct || 0, 0, 20),
      interestApr: clamp(rawInput.interestApr || 0, 0, 50),
      loanTermMonths: clamp(rawInput.loanTermMonths || rawInput.months || 0, 0, 60),
      months: clamp(rawInput.months || 0, 0, 60),
      holdingMonthly: Math.max(0, rawInput.holdingMonthly || 0),
      propertyTaxesMonthly: Math.max(0, rawInput.propertyTaxesMonthly || 0),
      insuranceMonthly: Math.max(0, rawInput.insuranceMonthly || 0),
      utilitiesMonthly: Math.max(0, rawInput.utilitiesMonthly || 0),
      hoaMonthly: Math.max(0, rawInput.hoaMonthly || 0),
      agentPct: clamp(rawInput.agentPct || 0, 0, 20),
      closingPct: clamp(rawInput.closingPct || 0, 0, 20),
      contingencyPct: clamp(rawInput.contingencyPct || 0, 0, 50),
      desiredProfit: Math.max(0, rawInput.desiredProfit || 0),
      buyClosingPct: clamp(rawInput.buyClosingPct || 0, 0, 20),
      lenderFees: Math.max(0, rawInput.lenderFees || 0),
      rehabFinanced: Boolean(rawInput.rehabFinanced ?? true),
      drawSchedule: normalizeDraws(rawInput.drawSchedule),
      maoSafetyPct: clamp(rawInput.maoSafetyPct || 0, 0, 40)
    };

    const pct = {
      loan: input.loanPct / 100,
      rehabFinancing: input.rehabFinancingPct / 100,
      down: input.downPct / 100,
      points: input.pointsPct / 100,
      interest: input.interestApr / 100,
      agent: input.agentPct / 100,
      closing: input.closingPct / 100,
      contingency: input.contingencyPct / 100,
      buyClosing: input.buyClosingPct / 100,
      maoSafety: input.maoSafetyPct / 100
    };

    const rehabWithContingency = input.rehab * (1 + pct.contingency);
    const acquisitionClosing = input.purchase * pct.buyClosing;
    const loanPurchase = input.purchase * pct.loan;
    const loanRehab = input.rehabFinanced ? rehabWithContingency * pct.rehabFinancing : 0;
    const loanTotal = loanPurchase + loanRehab;

    const pointsCost = loanTotal * pct.points;

    let rehabInterestBase = loanRehab * 0.5;
    if (input.model === "hardMoney") {
      rehabInterestBase = loanRehab * averageFundedPct(input.drawSchedule);
    }

    const interestPurchase = loanPurchase * pct.interest * (input.months / 12);
    const interestRehab = rehabInterestBase * pct.interest * (input.months / 12);
    const interestCost = interestPurchase + interestRehab;

    const monthlyOperatingCosts = input.holdingMonthly + input.propertyTaxesMonthly + input.insuranceMonthly + input.utilitiesMonthly + input.hoaMonthly;
    const holdingCost = monthlyOperatingCosts * input.months;
    const sellingCost = input.expectedSellingPrice * (pct.agent + pct.closing);

    const financingCost = pointsCost + interestCost + input.lenderFees;

    const phaseCosts = {
      acquisition: input.purchase + acquisitionClosing,
      rehab: rehabWithContingency,
      holding: holdingCost,
      sale: sellingCost,
      financing: financingCost
    };

    const totalCosts = Object.values(phaseCosts).reduce((sum, value) => sum + value, 0);
    const netSaleProceeds = input.expectedSellingPrice - sellingCost;
    const profit = netSaleProceeds - totalCosts;

    const purchaseDownPayment = input.purchase * pct.down;
    const uncoveredPurchase = Math.max(0, input.purchase - loanPurchase - purchaseDownPayment);
    const uncoveredRehab = Math.max(0, rehabWithContingency - loanRehab);
    const cashNeeded = Math.max(0, purchaseDownPayment + uncoveredPurchase + uncoveredRehab + acquisitionClosing + financingCost + holdingCost);

    const roi = cashNeeded > 0 ? profit / cashNeeded : 0;
    const roiAnnualized = input.months > 0 ? roi * (12 / input.months) : 0;

    const mao70 = Math.max(0, (input.arv * 0.7) - rehabWithContingency);
    const maoAdjustedBase = input.arv - (rehabWithContingency + sellingCost + holdingCost + financingCost + input.desiredProfit + acquisitionClosing);
    const maoAdjusted = Math.max(0, maoAdjustedBase * (1 - pct.maoSafety));

    const breakEvenPrice = totalCosts / Math.max(0.0001, 1 - (pct.agent + pct.closing));
    const safetyMargin = input.arv > 0 ? (input.arv - breakEvenPrice) / input.arv : 0;

    return {
      input,
      rehabWithContingency,
      acquisitionClosing,
      loanPurchase,
      loanRehab,
      loanTotal,
      pointsCost,
      interestCost,
      holdingCost,
      monthlyOperatingCosts,
      sellingCost,
      financingCost,
      netSaleProceeds,
      phaseCosts,
      totalCosts,
      profit,
      cashNeeded,
      roi,
      roiAnnualized,
      mao: maoAdjusted,
      mao70,
      maoAdjusted,
      breakEvenArv: breakEvenPrice,
      breakEvenPrice,
      safetyMargin
    };
  };

  window.FlipCore = { computeDeal, averageFundedPct };
})();
