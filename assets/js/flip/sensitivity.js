(() => {
  const getSensitivityRows = (baseInput, toggles = {}) => {
    const scenarios = [{ label: "Base", arvFactor: 1, rehabFactor: 1, holdDelta: 0 }];

    if (toggles.arvDown) scenarios.push({ label: "ARV -5%", arvFactor: 0.95, rehabFactor: 1, holdDelta: 0 });
    if (toggles.rehabUp) scenarios.push({ label: "Rehab +10%", arvFactor: 1, rehabFactor: 1.1, holdDelta: 0 });
    if (toggles.holdUp) scenarios.push({ label: "Hold +2 months", arvFactor: 1, rehabFactor: 1, holdDelta: 2 });

    return scenarios.map((scenario) => {
      const variant = {
        ...baseInput,
        arv: baseInput.arv * scenario.arvFactor,
        expectedSellingPrice: baseInput.expectedSellingPrice * scenario.arvFactor,
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
