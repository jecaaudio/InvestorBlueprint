(() => {
  const getDealScore = (deal) => {
    let label = "🔴 Avoid";
    let tone = "NOGO";
    let score = 20;

    if (deal.roi > 0.4) {
      label = "🔥 Elite Deal";
      tone = "STRONG";
      score = 95;
    } else if (deal.roi > 0.25) {
      label = "🟢 Strong";
      tone = "STRONG";
      score = 80;
    } else if (deal.roi > 0.15) {
      label = "🟡 Moderate";
      tone = "REVIEW";
      score = 62;
    } else if (deal.roi > 0.05) {
      label = "🟠 Risky";
      tone = "RISKY";
      score = 45;
    }

    if (deal.profit < 0) score = Math.min(score, 25);
    if (deal.input.months > deal.input.loanTermMonths) score = Math.max(0, score - 10);

    const maoDelta = deal.input.purchase - deal.mao70;
    const maoLabel = maoDelta <= 0 ? "✔ Within 70% rule" : maoDelta <= (deal.input.purchase * 0.05) ? "⚠ Slightly above 70%" : "❌ Overpriced vs 70%";
    const recommendation = score >= 80 ? "Go / Pursue aggressively" : score >= 60 ? "Go with tight execution" : score >= 40 ? "Proceed only with better terms" : "Pass unless repriced";

    return { score, label, tone, reasons: [recommendation], maoLabel, recommendation };
  };

  window.FlipScoring = { getDealScore };
})();
