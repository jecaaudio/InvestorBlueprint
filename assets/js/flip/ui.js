(() => {
  const $ = (id) => document.getElementById(id);
  const money = window.FlipFormatters.currency;
  const pctText = window.FlipFormatters.percent;
  const toNum = window.FlipFormatters.toNum;

  const setText = (id, value) => { const el = $(id); if (el) el.textContent = value; };

  const snapshot = () => {
    const state = {};
    document.querySelectorAll(".fc-input").forEach((input) => { state[input.id] = input.value; });
    state.sensArvDown = $("sensArvDown")?.checked;
    state.sensRehabUp = $("sensRehabUp")?.checked;
    state.sensHoldUp = $("sensHoldUp")?.checked;
    return state;
  };

  const applyState = (state = {}) => {
    Object.entries(state).forEach(([id, value]) => {
      const el = $(id);
      if (!el || value == null) return;
      if (el.type === "checkbox") el.checked = Boolean(value);
      else el.value = value;
    });
  };

  const loadDeals = () => { try { return JSON.parse(localStorage.getItem("ib_flip_deals") || "[]"); } catch { return []; } };
  const loadLocal = () => { try { return JSON.parse(localStorage.getItem(window.FlipConfig.STORAGE_KEY) || "null"); } catch { return null; } };

  const renderHistory = () => {
    const select = $("fcHistorySelect"); if (!select) return;
    const deals = loadDeals();
    select.innerHTML = '<option value="">Load saved...</option>' + deals.map((d) => `<option value="${d.id}">${d.name}</option>`).join("");
  };

  const saveLocal = () => {
    const list = loadDeals();
    const state = snapshot();
    localStorage.setItem(window.FlipConfig.STORAGE_KEY, JSON.stringify(state));
    const item = { id: Date.now(), name: `Deal ${new Date().toLocaleTimeString()}`, state };
    localStorage.setItem("ib_flip_deals", JSON.stringify([item, ...list].slice(0, 12)));
    renderHistory();
  };

  const readSingle = () => ({
    model: "hardMoney",
    arv: toNum($("arv")?.value),
    expectedSellingPrice: toNum($("expectedSellingPrice")?.value) || toNum($("arv")?.value),
    purchase: toNum($("purchasePrice")?.value),
    rehab: toNum($("rehab")?.value),
    loanPct: toNum($("loanPct")?.value),
    rehabFinancingPct: toNum($("rehabFinancingPct")?.value),
    downPct: toNum($("downPct")?.value),
    pointsPct: toNum($("pointsPct")?.value),
    interestApr: toNum($("interestApr")?.value),
    loanTermMonths: toNum($("loanTermMonths")?.value),
    months: toNum($("months")?.value),
    holdingMonthly: toNum($("holdingMonthly")?.value),
    propertyTaxesMonthly: toNum($("propertyTaxesMonthly")?.value),
    insuranceMonthly: toNum($("insuranceMonthly")?.value),
    utilitiesMonthly: toNum($("utilitiesMonthly")?.value),
    hoaMonthly: toNum($("hoaMonthly")?.value),
    buyClosingPct: toNum($("buyClosingPct")?.value),
    agentPct: toNum($("sellingCostsPct")?.value),
    closingPct: 0,
    contingencyPct: 0,
    desiredProfit: 0,
    lenderFees: 0,
    rehabFinanced: true,
    maoSafetyPct: 0,
    drawSchedule: [0, 25, 50, 75, 100]
  });

  const renderErrors = (errors = []) => {
    const box = $("fcErrors"); if (!box) return;
    box.style.display = errors.length ? "block" : "none";
    box.innerHTML = errors.map((e) => `• ${e}`).join("<br>");
  };

  const renderDeal = (deal, score, rows) => {
    setText("kpiProfit", money(deal.profit));
    setText("kpiRoi", pctText(deal.roi * 100));
    setText("kpiRoiAnnualized", pctText(deal.roiAnnualized * 100));
    setText("kpiCash", money(deal.cashNeeded));

    const profitEl = $("kpiProfit");
    if (profitEl) profitEl.classList.toggle("is-negative", deal.profit < 0);

    setText("diagLoanAmount", money(deal.loanTotal));
    setText("diagPointsCost", money(deal.pointsCost));
    setText("diagInterest", money(deal.interestCost));
    setText("diagTotalProject", money(deal.totalCosts));
    setText("diagMaoStatus", score.maoLabel);
    setText("diagSafety", pctText(deal.safetyMargin * 100));

    const pill = $("dealScorePill");
    if (pill) {
      pill.textContent = `${score.score} · ${score.label}`;
      pill.style.borderColor = window.FlipConfig.SCORE_COLORS[score.tone];
    }
    const bar = document.querySelector(".fc-score-bar-fill");
    if (bar) {
      bar.style.width = `${score.score}%`;
      bar.style.background = window.FlipConfig.SCORE_COLORS[score.tone];
    }
    setText("dealScoreDesc", score.recommendation);

    const tbody = $("fcSensitivityTable")?.querySelector("tbody");
    if (tbody) tbody.innerHTML = rows.map((r) => `<tr><td>${r.label}</td><td>${money(r.profit)}</td><td>${pctText(r.roi * 100)}</td><td>${money(r.cashNeeded)}</td></tr>`).join("");

    setText("investorSnapshot", `Cash needed: ${money(deal.cashNeeded)} | Profit: ${money(deal.profit)} | ROI: ${pctText(deal.roi * 100)} | Risk: ${score.label} | 70% Rule: ${score.maoLabel} | Recommendation: ${score.recommendation}`);
  };

  let currentResult = null;

  const calculate = () => {
    const input = readSingle();
    const errors = window.FlipValidators.validateDealInput(input);
    if (errors.length) return renderErrors(errors);

    const deal = window.FlipCore.computeDeal(input);
    const score = window.FlipScoring.getDealScore(deal);
    const rows = window.FlipSensitivity.getSensitivityRows(input, {
      arvDown: $("sensArvDown")?.checked,
      rehabUp: $("sensRehabUp")?.checked,
      holdUp: $("sensHoldUp")?.checked
    });

    currentResult = { deal, score, rows };
    renderErrors([]);
    renderDeal(deal, score, rows);
    saveLocal();
  };

  const exportExcel = () => {
    if (!currentResult) return;
    const rows = [
      ["Metric", "Value"],
      ["Net Profit", currentResult.deal.profit],
      ["ROI", currentResult.deal.roi],
      ["Annual ROI", currentResult.deal.roiAnnualized],
      ["Cash Needed", currentResult.deal.cashNeeded],
      ["Deal Score", currentResult.score.label],
      ["70% Rule", currentResult.score.maoLabel]
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "investor-snapshot.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const loadDefaults = () => applyState({
    purchasePrice: "170000", arv: "250000", expectedSellingPrice: "250000", rehab: "40000", months: "6",
    loanPct: "90", rehabFinancingPct: "100", downPct: "10", pointsPct: "2", interestApr: "12", loanTermMonths: "12",
    buyClosingPct: "1.5", sellingCostsPct: "7", holdingMonthly: "900", propertyTaxesMonthly: "250", insuranceMonthly: "120", utilitiesMonthly: "180", hoaMonthly: "0"
  });

  const init = () => {
    if (!$("flip-calculator")) return;
    $("fcCalcBtn")?.addEventListener("click", calculate);
    $("fcResetBtn")?.addEventListener("click", loadDefaults);
    $("fcDuplicateBtn")?.addEventListener("click", saveLocal);
    $("fcExportPdfBtn")?.addEventListener("click", () => window.print());
    $("fcExportExcelBtn")?.addEventListener("click", exportExcel);
    $("fcHistorySelect")?.addEventListener("change", (e) => {
      const id = Number(e.target.value);
      const selected = loadDeals().find((d) => d.id === id);
      if (selected) applyState(selected.state);
    });

    applyState(loadLocal() || {});
    if (!$("arv")?.value) loadDefaults();
    renderHistory();
  };

  document.addEventListener("DOMContentLoaded", init);
})();
