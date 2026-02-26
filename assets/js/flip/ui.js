(() => {
  const $ = (id) => document.getElementById(id);
  const money = window.FlipFormatters.currency;
  const pctText = window.FlipFormatters.percent;
  const toNum = window.FlipFormatters.toNum;

  const setText = (id, value) => {
    const el = $(id);
    if (el) el.textContent = value;
  };

  const getActiveTab = () => document.querySelector(".fc-tab.is-active")?.dataset.tab || "single";

  const setActiveTab = (tab) => {
    document.querySelectorAll(".fc-tab").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.tab === tab);
    });
    $("fcSingleForm")?.classList.toggle("fc-hidden", tab !== "single");
    $("fcScenarioForm")?.classList.toggle("fc-hidden", tab !== "scenario");
    $("fcCompareBox")?.classList.toggle("fc-hidden", tab !== "scenario");
  };

  const snapshot = () => ({
    tab: getActiveTab(),
    arv: $("arv")?.value || "",
    purchasePrice: $("purchasePrice")?.value || "",
    rehab: $("rehab")?.value || "",
    loanPct: $("loanPct")?.value || "",
    downPct: $("downPct")?.value || "",
    pointsPct: $("pointsPct")?.value || "",
    interestApr: $("interestApr")?.value || "",
    months: $("months")?.value || "",
    holdingMonthly: $("holdingMonthly")?.value || "",
    agentPct: $("agentPct")?.value || "",
    closingPct: $("closingPct")?.value || "",
    contingencyPct: $("contingencyPct")?.value || "",
    desiredProfit: $("desiredProfit")?.value || "",
    purchaseA: $("purchaseA")?.value || "",
    rehabA: $("rehabA")?.value || "",
    purchaseB: $("purchaseB")?.value || "",
    rehabB: $("rehabB")?.value || "",
    arvShared: $("arvShared")?.value || ""
  });

  const applyState = (state) => {
    Object.entries(state || {}).forEach(([id, value]) => {
      const el = $(id);
      if (el && value != null) el.value = value;
    });
    if (state?.tab) setActiveTab(state.tab);
  };

  const saveLocal = () => localStorage.setItem(window.FlipConfig.STORAGE_KEY, JSON.stringify(snapshot()));
  const loadLocal = () => {
    try { return JSON.parse(localStorage.getItem(window.FlipConfig.STORAGE_KEY) || "null"); } catch (_) { return null; }
  };

  const readSingle = () => ({
    arv: toNum($("arv")?.value),
    purchase: toNum($("purchasePrice")?.value),
    rehab: toNum($("rehab")?.value),
    loanPct: toNum($("loanPct")?.value),
    downPct: toNum($("downPct")?.value),
    pointsPct: toNum($("pointsPct")?.value),
    interestApr: toNum($("interestApr")?.value),
    months: toNum($("months")?.value),
    holdingMonthly: toNum($("holdingMonthly")?.value),
    agentPct: toNum($("agentPct")?.value),
    closingPct: toNum($("closingPct")?.value),
    contingencyPct: toNum($("contingencyPct")?.value),
    desiredProfit: toNum($("desiredProfit")?.value)
  });

  const readScenario = () => {
    const shared = readSingle();
    shared.arv = toNum($("arvShared")?.value) || shared.arv;
    return {
      a: { ...shared, purchase: toNum($("purchaseA")?.value), rehab: toNum($("rehabA")?.value) },
      b: { ...shared, purchase: toNum($("purchaseB")?.value), rehab: toNum($("rehabB")?.value) }
    };
  };

  const renderErrors = (errors) => {
    const box = $("fcErrors");
    if (!box) return;
    if (!errors.length) {
      box.style.display = "none";
      box.innerHTML = "";
      return;
    }
    box.style.display = "block";
    box.innerHTML = `<strong>Fix these:</strong><ul>${errors.map((error) => `<li>${error}</li>`).join("")}</ul>`;
  };

  const renderScore = (score) => {
    setText("dealScorePill", `${score.score} / 100`);
    setText("dealScoreDesc", `${score.label} · ${score.reasons.join(" ") || "No major risks detected."}`);
    const pill = $("dealScorePill");
    if (pill) pill.style.borderColor = window.FlipConfig.SCORE_COLORS[score.tone];

    const bar = document.querySelector(".fc-score-bar-fill");
    if (bar) {
      bar.style.width = `${score.score}%`;
      bar.style.background = window.FlipConfig.SCORE_COLORS[score.tone];
    }
  };

  const renderSensitivity = (rows) => {
    const tbody = $("fcSensitivityTable")?.querySelector("tbody");
    if (!tbody) return;
    tbody.innerHTML = rows.map((row) => `
      <tr>
        <td>${row.label}</td>
        <td>${money(row.profit)}</td>
        <td>${pctText(row.roi * 100)}</td>
      </tr>
    `).join("");
  };

  const renderWarnings = (deal) => {
    const warnings = [];
    if (deal.input.months > 8) warnings.push("⚠️ Holding > 8 months");
    if (deal.roi < 0.15) warnings.push("⚠️ ROI < 15%");
    setText("fcWarnings", warnings.join(" · "));
  };

  const renderDeal = (deal, score, rows) => {
    setText("kpiProfit", money(deal.profit));
    setText("kpiRoi", pctText(deal.roi * 100));
    setText("kpiRoiAnnualized", pctText(deal.roiAnnualized * 100));
    setText("kpiCash", money(deal.cashNeeded));
    setText("kpiMao", money(deal.mao));

    const profitEl = $("kpiProfit");
    if (profitEl) profitEl.classList.toggle("is-negative", deal.profit < 0);

    const totalArvPct = deal.input.arv > 0 ? (deal.totalCosts / deal.input.arv) * 100 : 0;
    const financingArvPct = deal.input.arv > 0 ? (deal.financingCost / deal.input.arv) * 100 : 0;
    const sellingArvPct = deal.input.arv > 0 ? (deal.sellingCost / deal.input.arv) * 100 : 0;
    const holdingArvPct = deal.input.arv > 0 ? (deal.holdingCost / deal.input.arv) * 100 : 0;

    setText("bdTotalCosts", `${money(deal.totalCosts)} (${pctText(totalArvPct)})`);
    setText("bdFinCost", `${money(deal.financingCost)} (${pctText(financingArvPct)})`);
    setText("bdSellCost", `${money(deal.sellingCost)} (${pctText(sellingArvPct)})`);
    setText("bdHoldCost", `${money(deal.holdingCost)} (${pctText(holdingArvPct)})`);

    renderScore(score);
    renderSensitivity(rows);
    renderWarnings(deal);
  };

  const renderCompare = (dealA, dealB) => {
    setText("cmpProfitA", money(dealA.profit));
    setText("cmpProfitB", money(dealB.profit));
    setText("cmpProfitDiff", money(dealB.profit - dealA.profit));
    const winner = dealA.profit === dealB.profit ? "Tie" : dealA.profit > dealB.profit ? "Scenario A" : "Scenario B";
    setText("cmpWinner", winner);
  };

  let currentDeal = null;
  let currentScore = null;
  let currentSensitivity = [];

  const calculate = () => {
    const tab = getActiveTab();
    const errors = [];

    if (tab === "single") {
      const input = readSingle();
      errors.push(...window.FlipValidators.validateDealInput(input));
      if (errors.length) return renderErrors(errors);

      const deal = window.FlipCore.computeDeal(input);
      const score = window.FlipScoring.getDealScore(deal);
      const rows = window.FlipSensitivity.getSensitivityRows(input);

      currentDeal = deal;
      currentScore = score;
      currentSensitivity = rows;
      renderErrors([]);
      renderDeal(deal, score, rows);
      saveLocal();
      return;
    }

    const scenario = readScenario();
    const errsA = window.FlipValidators.validateDealInput(scenario.a).map((error) => `Scenario A: ${error}`);
    const errsB = window.FlipValidators.validateDealInput(scenario.b).map((error) => `Scenario B: ${error}`);
    errors.push(...errsA, ...errsB);
    if (errors.length) return renderErrors(errors);

    const dealA = window.FlipCore.computeDeal(scenario.a);
    const dealB = window.FlipCore.computeDeal(scenario.b);
    const best = dealA.profit >= dealB.profit ? dealA : dealB;
    const score = window.FlipScoring.getDealScore(best);
    const rows = window.FlipSensitivity.getSensitivityRows(best.input);

    currentDeal = best;
    currentScore = score;
    currentSensitivity = rows;
    renderErrors([]);
    renderDeal(best, score, rows);
    renderCompare(dealA, dealB);
    saveLocal();
  };

  const copyShareLink = async () => {
    const link = window.FlipShareLink.buildShareLink(snapshot());
    try {
      await navigator.clipboard.writeText(link);
      const button = $("fcCopyLinkBtn");
      if (!button) return;
      const original = button.textContent;
      button.textContent = "Copied!";
      setTimeout(() => { button.textContent = original; }, 900);
    } catch (_) {
      alert(link);
    }
  };

  const loadDefaults = () => applyState({
    tab: "single",
    arv: "250000",
    purchasePrice: "170000",
    rehab: "40000",
    loanPct: "90",
    downPct: "10",
    pointsPct: "2",
    interestApr: "12",
    months: "6",
    holdingMonthly: "900",
    agentPct: "6",
    closingPct: "2",
    contingencyPct: "10",
    desiredProfit: "25000",
    purchaseA: "170000",
    rehabA: "40000",
    purchaseB: "160000",
    rehabB: "50000",
    arvShared: "250000"
  });

  const syncSliders = () => {
    [["loanPct", "loanPctSlider"], ["pointsPct", "pointsPctSlider"], ["interestApr", "interestAprSlider"], ["months", "monthsSlider"]].forEach(([inputId, sliderId]) => {
      const input = $(inputId);
      const slider = $(sliderId);
      if (!input || !slider) return;
      slider.value = String(toNum(input.value));
    });
  };

  const init = () => {
    if (!$("flip-calculator")) return;

    document.querySelectorAll(".fc-tab").forEach((button) => {
      button.addEventListener("click", () => {
        setActiveTab(button.dataset.tab);
        saveLocal();
      });
    });

    [["loanPct", "loanPctSlider"], ["pointsPct", "pointsPctSlider"], ["interestApr", "interestAprSlider"], ["months", "monthsSlider"]].forEach(([inputId, sliderId]) => {
      const input = $(inputId);
      const slider = $(sliderId);
      if (!input || !slider) return;

      slider.addEventListener("input", () => {
        input.value = slider.value;
        saveLocal();
      });

      input.addEventListener("input", () => {
        slider.value = String(toNum(input.value));
        saveLocal();
      });
    });

    document.querySelectorAll(".fc-input").forEach((input) => input.addEventListener("input", saveLocal));

    $("fcCalcBtn")?.addEventListener("click", calculate);
    $("fcResetBtn")?.addEventListener("click", () => {
      loadDefaults();
      renderErrors([]);
    });
    $("fcCopyLinkBtn")?.addEventListener("click", copyShareLink);
    $("fcExportPdfBtn")?.addEventListener("click", () => {
      window.FlipPdf.exportDealPdf({
        deal: currentDeal,
        score: currentScore || { score: 0, label: "No-Go", reasons: [] },
        sensitivityRows: currentSensitivity
      });
    });

    const stateFromHash = window.FlipShareLink.readStateFromHash();
    if (stateFromHash) applyState(stateFromHash);
    else applyState(loadLocal() || {});

    if (!$("arv")?.value) loadDefaults();
    syncSliders();
  };

  document.addEventListener("DOMContentLoaded", init);
})();
