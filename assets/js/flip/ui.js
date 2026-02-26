(() => {
  const $ = (id) => document.getElementById(id);
  const money = window.FlipFormatters.currency;
  const pctText = window.FlipFormatters.percent;
  const toNum = window.FlipFormatters.toNum;

  const STEPS = ["Deal Basics", "Financing", "Rehab", "Holding", "Sale", "Results"];
  let currentStep = 0;

  const setText = (id, value) => { const el = $(id); if (el) el.textContent = value; };
  const getActiveTab = () => document.querySelector(".fc-tab.is-active")?.dataset.tab || "single";
  const getMode = () => $("fcModeToggle")?.dataset.mode || "simple";

  const setActiveTab = (tab) => {
    document.querySelectorAll(".fc-tab[data-tab]").forEach((button) => button.classList.toggle("is-active", button.dataset.tab === tab));
    $("fcSingleForm")?.classList.toggle("fc-hidden", tab !== "single");
    $("fcScenarioForm")?.classList.toggle("fc-hidden", tab !== "scenario");
    $("fcCompareBox")?.classList.toggle("fc-hidden", tab !== "scenario");
  };

  const setMode = (mode) => {
    const target = mode === "pro" ? "pro" : "simple";
    const toggle = $("fcModeToggle");
    if (toggle) {
      toggle.dataset.mode = target;
      toggle.textContent = target === "pro" ? "Pro" : "Simple";
    }
    document.querySelectorAll(".fc-pro-field").forEach((el) => el.classList.toggle("fc-hidden", target !== "pro"));
  };

  const renderSteps = () => {
    const wrap = $("fcSteps");
    if (!wrap) return;
    wrap.innerHTML = STEPS.map((step, index) => `<span class="fc-step-pill ${index === currentStep ? "is-active" : ""}">${index + 1}. ${step}</span>`).join("");
    document.querySelectorAll("#fcSingleForm .fc-section").forEach((section) => {
      const step = Number(section.dataset.step || 0);
      section.classList.toggle("fc-hidden", step !== currentStep);
    });
  };

  const snapshot = () => {
    const state = { tab: getActiveTab(), mode: getMode(), step: currentStep };
    document.querySelectorAll(".fc-input").forEach((input) => { state[input.id] = input.value; });
    return state;
  };

  const applyState = (state = {}) => {
    Object.entries(state).forEach(([id, value]) => {
      const el = $(id);
      if (el && value != null) el.value = value;
    });
    if (state.tab) setActiveTab(state.tab);
    setMode(state.mode || "simple");
    currentStep = Math.max(0, Math.min(5, Number(state.step || 0)));
    renderSteps();
  };

  const saveLocal = () => {
    const list = loadDeals();
    const state = snapshot();
    localStorage.setItem(window.FlipConfig.STORAGE_KEY, JSON.stringify(state));
    const item = { id: Date.now(), name: `Deal ${new Date().toLocaleTimeString()}`, state };
    localStorage.setItem("ib_flip_deals", JSON.stringify([item, ...list].slice(0, 12)));
    renderHistory();
  };

  const loadLocal = () => { try { return JSON.parse(localStorage.getItem(window.FlipConfig.STORAGE_KEY) || "null"); } catch { return null; } };
  const loadDeals = () => { try { return JSON.parse(localStorage.getItem("ib_flip_deals") || "[]"); } catch { return []; } };

  const renderHistory = () => {
    const select = $("fcHistorySelect"); if (!select) return;
    const deals = loadDeals();
    select.innerHTML = '<option value="">Select...</option>' + deals.map((d) => `<option value="${d.id}">${d.name}</option>`).join("");
  };

  const readSingle = () => ({
    model: $("modelType")?.value || "standard",
    arv: toNum($("arv")?.value), purchase: toNum($("purchasePrice")?.value), rehab: toNum($("rehab")?.value),
    loanPct: toNum($("loanPct")?.value), downPct: toNum($("downPct")?.value), pointsPct: toNum($("pointsPct")?.value), interestApr: toNum($("interestApr")?.value),
    months: toNum($("months")?.value), holdingMonthly: toNum($("holdingMonthly")?.value), agentPct: toNum($("agentPct")?.value), closingPct: toNum($("closingPct")?.value),
    contingencyPct: toNum($("contingencyPct")?.value), desiredProfit: toNum($("desiredProfit")?.value), buyClosingPct: toNum($("buyClosingPct")?.value),
    lenderFees: toNum($("lenderFees")?.value), rehabFinanced: $("rehabFinanced")?.value !== "false", maoSafetyPct: toNum($("maoSafetyPct")?.value),
    drawSchedule: String($("drawSchedule")?.value || "0,25,50,75,100").split(",").map((v) => toNum(v.trim()))
  });

  const readScenario = () => {
    const base = readSingle();
    const sharedArv = toNum($("arvShared")?.value);
    return {
      a: { ...base, purchase: toNum($("purchaseA")?.value), rehab: toNum($("rehabA")?.value), arv: sharedArv || base.arv },
      b: { ...base, purchase: toNum($("purchaseB")?.value), rehab: toNum($("rehabB")?.value), arv: sharedArv || base.arv }
    };
  };

  const renderErrors = (errors = []) => {
    const box = $("fcErrors"); if (!box) return;
    box.style.display = errors.length ? "block" : "none";
    box.innerHTML = errors.map((e) => `• ${e}`).join("<br>");
  };

  const renderDeal = (deal, score, rows) => {
    setText("kpiProfit", money(deal.profit)); setText("kpiRoi", pctText(deal.roi * 100)); setText("kpiRoiAnnualized", `Annualized: ${pctText(deal.roiAnnualized * 100)}`);
    setText("kpiCash", money(deal.cashNeeded)); setText("kpiMao", money(deal.maoAdjusted)); setText("kpiMao70", `70%: ${money(deal.mao70)}`);
    setText("bdAcqCost", money(deal.phaseCosts.acquisition)); setText("bdRehabCost", money(deal.phaseCosts.rehab)); setText("bdHoldCost", money(deal.phaseCosts.holding));
    setText("bdSellCost", money(deal.phaseCosts.sale)); setText("bdFinCost", money(deal.phaseCosts.financing)); setText("bdTotalCosts", `${money(deal.totalCosts)} / ${money(deal.breakEvenArv)}`);

    const pill = $("dealScorePill"); if (pill) { pill.textContent = `${score.score} · ${score.label}`; pill.style.borderColor = window.FlipConfig.SCORE_COLORS[score.tone]; }
    const bar = document.querySelector(".fc-score-bar-fill"); if (bar) { bar.style.width = `${score.score}%`; bar.style.background = window.FlipConfig.SCORE_COLORS[score.tone]; }
    setText("dealScoreDesc", score.reasons.join(" ") || "Balanced deal.");

    const tbody = $("fcSensitivityTable")?.querySelector("tbody");
    if (tbody) tbody.innerHTML = rows.map((r) => `<tr><td>${r.label}</td><td>${money(r.profit)}</td><td>${pctText(r.roi * 100)}</td><td>${money(r.mao)}</td><td>${money(r.cashNeeded)}</td></tr>`).join("");
  };

  const renderCompare = (dealA, dealB) => {
    setText("cmpProfitA", money(dealA.profit)); setText("cmpProfitB", money(dealB.profit)); setText("cmpProfitDiff", money(dealB.profit - dealA.profit));
    setText("cmpWinner", dealA.profit > dealB.profit ? "Base" : dealB.profit > dealA.profit ? "Best" : "Tie");
  };

  let currentResult = null;

  const calculate = () => {
    const errors = [];
    if (getActiveTab() === "single") {
      const input = readSingle();
      errors.push(...window.FlipValidators.validateDealInput(input));
      if (errors.length) return renderErrors(errors);
      const deal = window.FlipCore.computeDeal(input);
      const score = window.FlipScoring.getDealScore(deal);
      const rows = window.FlipSensitivity.getSensitivityRows(input, { arvShift: toNum($("sensArv")?.value), rehabShift: toNum($("sensRehab")?.value), holdShift: toNum($("sensHold")?.value) });
      currentResult = { deal, score, rows };
      renderErrors([]); renderDeal(deal, score, rows); saveLocal();
      return;
    }

    const scenario = readScenario();
    const dealA = window.FlipCore.computeDeal(scenario.a);
    const dealB = window.FlipCore.computeDeal(scenario.b);
    const best = dealA.profit >= dealB.profit ? dealA : dealB;
    const score = window.FlipScoring.getDealScore(best);
    const rows = window.FlipSensitivity.getSensitivityRows(best.input, { arvShift: toNum($("sensArv")?.value), rehabShift: toNum($("sensRehab")?.value), holdShift: toNum($("sensHold")?.value) });
    currentResult = { deal: best, score, rows };
    renderErrors([]); renderDeal(best, score, rows); renderCompare(dealA, dealB); saveLocal();
  };

  const loadDefaults = () => applyState({ tab: "single", mode: "simple", arv: "250000", purchasePrice: "170000", rehab: "40000", loanPct: "90", downPct: "10", pointsPct: "2", interestApr: "12", months: "6", holdingMonthly: "900", agentPct: "6", closingPct: "2", contingencyPct: "10", desiredProfit: "25000", buyClosingPct: "1.5", lenderFees: "1200", maoSafetyPct: "12", sensArv: "10", sensRehab: "10", sensHold: "2", purchaseA: "170000", rehabA: "40000", purchaseB: "165000", rehabB: "36000", arvShared: "250000" });

  const init = () => {
    if (!$("flip-calculator")) return;
    document.querySelectorAll(".fc-tab[data-tab]").forEach((button) => button.addEventListener("click", () => setActiveTab(button.dataset.tab)));
    $("fcModeToggle")?.addEventListener("click", () => setMode(getMode() === "simple" ? "pro" : "simple"));
    $("fcCalcBtn")?.addEventListener("click", calculate);
    $("fcPrevStepBtn")?.addEventListener("click", () => { currentStep = Math.max(0, currentStep - 1); renderSteps(); });
    $("fcNextStepBtn")?.addEventListener("click", () => { currentStep = Math.min(5, currentStep + 1); renderSteps(); });
    $("fcResetBtn")?.addEventListener("click", loadDefaults);
    $("fcCopyLinkBtn")?.addEventListener("click", async () => {
      const link = window.FlipShareLink.buildShareLink(snapshot());
      try { await navigator.clipboard.writeText(link); } catch { alert(link); }
    });
    $("fcDuplicateBtn")?.addEventListener("click", saveLocal);
    $("fcExportJsonBtn")?.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(snapshot(), null, 2)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "flip-scenario.json"; a.click();
      URL.revokeObjectURL(a.href);
    });
    $("fcExportPdfBtn")?.addEventListener("click", () => window.print());
    $("fcHistorySelect")?.addEventListener("change", (e) => {
      const id = Number(e.target.value); const selected = loadDeals().find((d) => d.id === id); if (selected) applyState(selected.state);
    });

    const stateFromHash = window.FlipShareLink.readStateFromHash();
    if (stateFromHash) applyState(stateFromHash); else applyState(loadLocal() || {});
    if (!$("arv")?.value) loadDefaults();
    renderHistory(); renderSteps();
  };

  document.addEventListener("DOMContentLoaded", init);
})();
