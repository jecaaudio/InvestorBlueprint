(() => {
  const getDealScore = (deal) => {
    let score = 100;
    const reasons = [];

    const marginPctArv = deal.input.arv > 0 ? ((deal.input.arv - deal.totalCosts) / deal.input.arv) * 100 : 0;

    if (deal.roi < 0.12) {
      score -= 22;
      reasons.push("ROI bajo para riesgo de flip.");
    }
    if (deal.roiAnnualized < 0.18) {
      score -= 18;
      reasons.push("ROI anualizado por debajo del objetivo.");
    }
    if (marginPctArv < 12) {
      score -= 18;
      reasons.push("Margen contra ARV muy ajustado.");
    }
    if (deal.cashNeeded > (deal.input.arv * 0.35)) {
      score -= 12;
      reasons.push("Capital requerido alto para el valor de salida.");
    }
    if (deal.input.months > 8) {
      score -= 15;
      reasons.push("Hold largo incrementa riesgo operativo.");
    }
    if (deal.profit <= 0) {
      score -= 30;
      reasons.push("Ganancia nula o negativa.");
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
