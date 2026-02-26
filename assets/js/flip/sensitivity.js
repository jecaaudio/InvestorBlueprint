(() => {
  const getSensitivityRows = (baseInput, settings = {}) => {
    const arvShift = Number(settings.arvShift || 10);
    const rehabShift = Number(settings.rehabShift || 10);
    const holdShift = Number(settings.holdShift || 2);

    const scenarios = [
      { label: "Base", arvFactor: 1, rehabFactor: 1, holdDelta: 0 },
      { label: `Best (+${arvShift}% ARV / -${rehabShift}% Rehab / -${holdShift}m)`, arvFactor: 1 + (arvShift / 100), rehabFactor: 1 - (rehabShift / 100), holdDelta: -holdShift },
      { label: `Worst (-${arvShift}% ARV / +${rehabShift}% Rehab / +${holdShift}m)`, arvFactor: 1 - (arvShift / 100), rehabFactor: 1 + (rehabShift / 100), holdDelta: holdShift }
    ];

    return scenarios.map((scenario) => {
      const variant = {
        ...baseInput,
        arv: baseInput.arv * scenario.arvFactor,
        rehab: baseInput.rehab * scenario.rehabFactor,
        months: Math.max(0, baseInput.months + scenario.holdDelta)
      };
      const result = window.FlipCore.computeDeal(variant);
      return {
        label: scenario.label,
        profit: result.profit,
        roi: result.roi,
        mao: result.maoAdjusted,
        cashNeeded: result.cashNeeded
      };
    });
  };

  window.FlipSensitivity = { getSensitivityRows };
})();
