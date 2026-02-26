(() => {
  const getDealScore = (deal) => {
    let score = 100;
    const reasons = [];

    const marginPctArv = deal.input.arv > 0 ? (deal.profit / deal.input.arv) * 100 : 0;

    if (deal.profit <= 0) {
      score -= 60;
      reasons.push("Profit is zero or negative.");
    }
    if (deal.roi < 0.15) {
      score -= 20;
      reasons.push("ROI is below 15%.");
    }
    if (deal.roiAnnualized < 0.2) {
      score -= 10;
      reasons.push("Annualized ROI is below 20%.");
    }
    if (marginPctArv < 10) {
      score -= 10;
      reasons.push("Profit margin is below 10% of ARV.");
    }
    if (deal.input.months >= 9) {
      score -= 10;
      reasons.push("Holding period is 9+ months.");
    }

    score = Math.max(0, Math.min(100, score));

    let label = window.FlipConfig.SCORE_LABELS.NOGO;
    let tone = "NOGO";

    if (score >= 80) {
      label = window.FlipConfig.SCORE_LABELS.STRONG;
      tone = "STRONG";
    } else if (score >= 60) {
      label = window.FlipConfig.SCORE_LABELS.REVIEW;
      tone = "REVIEW";
    } else if (score >= 40) {
      label = window.FlipConfig.SCORE_LABELS.RISKY;
      tone = "RISKY";
    }

    return { score, label, tone, reasons: reasons.slice(0, 3) };
  };

  window.FlipScoring = { getDealScore };
})();
