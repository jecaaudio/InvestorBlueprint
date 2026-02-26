(() => {
  const getSensitivityRows = (baseInput) => {
    const scenarios = [
      { label: "Base", arvFactor: 1, rehabFactor: 1 },
      { label: "ARV -5%", arvFactor: 0.95, rehabFactor: 1 },
      { label: "ARV -10%", arvFactor: 0.9, rehabFactor: 1 },
      { label: "Rehab +10%", arvFactor: 1, rehabFactor: 1.1 },
      { label: "Rehab +20%", arvFactor: 1, rehabFactor: 1.2 }
    ];

    return scenarios.map((scenario) => {
      const variant = {
        ...baseInput,
        arv: baseInput.arv * scenario.arvFactor,
        rehab: baseInput.rehab * scenario.rehabFactor
      };
      const result = window.FlipCore.computeDeal(variant);
      return { label: scenario.label, profit: result.profit, roi: result.roi };
    });
  };

  window.FlipSensitivity = { getSensitivityRows };
})();
