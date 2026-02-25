(() => {
  const $ = (id) => document.getElementById(id);

  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

  const toNum = (v) => {
    if (v == null) return 0;
    const s = String(v).replace(/[^0-9.\-]/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  const fmtMoney = (n) => {
    const v = Number.isFinite(n) ? n : 0;
    return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  };

  const fmtPct = (n) => {
    const v = Number.isFinite(n) ? n : 0;
    return `${v.toFixed(1)}%`;
  };

  const setText = (id, text) => {
    const el = $(id);
    if (el) el.textContent = text;
  };

  const showErrors = (errs) => {
    const box = $("fcErrors");
    if (!box) return;
    if (!errs.length) {
      box.style.display = "none";
      box.innerHTML = "";
      return;
    }
    box.style.display = "block";
    box.innerHTML = `<strong>Fix these:</strong><ul>${errs.map((e) => `<li>${e}</li>`).join("")}</ul>`;
  };

  const addAnim = (el) => {
    if (!el) return;
    el.classList.remove("fc-anim");
    void el.offsetWidth;
    el.classList.add("fc-anim");
  };

  function computeFlip({ arv, purchase, rehab, loanPct, downPct, pointsPct, interestApr, months, holdingMonthly, agentPct, closingPct, contingencyPct }) {
    arv = Math.max(0, arv);
    purchase = Math.max(0, purchase);
    rehab = Math.max(0, rehab);

    loanPct = clamp(loanPct, 0, 100) / 100;
    downPct = clamp(downPct, 0, 100) / 100;
    pointsPct = clamp(pointsPct, 0, 20) / 100;
    interestApr = clamp(interestApr, 0, 100) / 100;
    months = clamp(months, 1, 60);
    holdingMonthly = Math.max(0, holdingMonthly);
    agentPct = clamp(agentPct, 0, 20) / 100;
    closingPct = clamp(closingPct, 0, 20) / 100;
    contingencyPct = clamp(contingencyPct, 0, 50) / 100;

    const rehabAdj = rehab * (1 + contingencyPct);
    const projectCost = purchase + rehabAdj;
    const loanAmount = projectCost * loanPct;
    const downPayment = purchase * downPct;
    const gap = Math.max(0, projectCost - loanAmount);
    const cashToClose = downPayment + gap;
    const pointsCost = loanAmount * pointsPct;
    const interestCost = loanAmount * interestApr * (months / 12);
    const holdingCost = holdingMonthly * months;
    const sellingCost = (arv * agentPct) + (arv * closingPct);
    const totalCosts = projectCost + pointsCost + interestCost + holdingCost + sellingCost;
    const profit = arv - totalCosts;
    const cashNeeded = cashToClose + pointsCost + holdingCost;
    const roi = cashNeeded > 0 ? (profit / cashNeeded) : 0;
    const maoSimple = Math.max(0, arv - (rehabAdj + sellingCost + holdingCost + (loanAmount * pointsPct) + (loanAmount * interestApr * (months / 12))));

    return {
      inputs: { arv, purchase, rehab, rehabAdj, loanPct, downPct, pointsPct, interestApr, months, holdingMonthly, agentPct, closingPct, contingencyPct },
      loanAmount,
      downPayment,
      gap,
      cashToClose,
      pointsCost,
      interestCost,
      holdingCost,
      sellingCost,
      projectCost,
      totalCosts,
      cashNeeded,
      profit,
      roi,
      maoSimple
    };
  }

  function dealScore({ profit, roi, cashNeeded, arv }) {
    const cashRatio = arv > 0 ? (cashNeeded / arv) : 999;

    if (profit <= 0) {
      return { label: "HIGH RISK", desc: "El profit es negativo o cero. Revisa compra/rehab/fees o renegocia.", tone: "bad" };
    }
    if (roi >= 0.25 && profit >= 20000 && cashRatio <= 0.25) {
      return { label: "STRONG DEAL", desc: "Buen margen, ROI fuerte y cash requerido razonable vs ARV.", tone: "good" };
    }
    if (roi >= 0.15 && profit >= 10000) {
      return { label: "MODERATE", desc: "Puede funcionar, pero es sensible a bajadas de ARV o sobrecostos de rehab.", tone: "mid" };
    }
    return { label: "HIGH RISK", desc: "Margen o ROI bajos. Haz sensitivity y considera mejor entrada.", tone: "bad" };
  }

  function renderScore(score) {
    const pill = $("dealScorePill");
    const desc = $("dealScoreDesc");
    if (!pill || !desc) return;

    pill.textContent = score.label;
    desc.textContent = score.desc;

    pill.style.borderColor = "rgba(255,255,255,0.18)";
    pill.style.background = "rgba(255,255,255,0.06)";
    pill.style.opacity = "1";

    if (score.tone === "good") {
      pill.style.background = "rgba(0,255,160,0.10)";
      pill.style.borderColor = "rgba(0,255,160,0.25)";
    } else if (score.tone === "mid") {
      pill.style.background = "rgba(255,200,0,0.10)";
      pill.style.borderColor = "rgba(255,200,0,0.25)";
    } else {
      pill.style.background = "rgba(255,80,80,0.10)";
      pill.style.borderColor = "rgba(255,80,80,0.25)";
    }
  }

  function buildSensitivity(baseInputs) {
    const rows = [
      { label: "Base", arvDelta: 0, rehabDelta: 0 },
      { label: "ARV -$10k", arvDelta: -10000, rehabDelta: 0 },
      { label: "ARV -$20k", arvDelta: -20000, rehabDelta: 0 },
      { label: "Rehab +$10k", arvDelta: 0, rehabDelta: 10000 },
      { label: "Rehab +$20k", arvDelta: 0, rehabDelta: 20000 },
      { label: "ARV -$10k & Rehab +$10k", arvDelta: -10000, rehabDelta: 10000 },
      { label: "ARV -$20k & Rehab +$20k", arvDelta: -20000, rehabDelta: 20000 }
    ];

    return rows.map((r) => {
      const out = computeFlip({
        ...baseInputs,
        arv: Math.max(0, baseInputs.arv + r.arvDelta),
        rehab: Math.max(0, baseInputs.rehab + r.rehabDelta)
      });
      return { label: r.label, profit: out.profit, roi: out.roi };
    });
  }

  function renderSensitivity(rows) {
    const table = $("fcSensitivityTable");
    if (!table) return;
    const tbody = table.querySelector("tbody");
    if (!tbody) return;

    tbody.innerHTML = rows.map((r) => `
      <tr>
        <td>${r.label}</td>
        <td>${fmtMoney(r.profit)}</td>
        <td>${fmtPct(r.roi * 100)}</td>
      </tr>
    `).join("");
  }

  const STORAGE_KEY = "ib_flip_calc_v1";

  function getActiveTab() {
    const active = document.querySelector(".fc-tab.is-active");
    return active ? active.getAttribute("data-tab") : "single";
  }

  function setTab(tab) {
    document.querySelectorAll(".fc-tab").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-tab") === tab);
    });
    $("fcSingleForm")?.classList.toggle("fc-hidden", tab !== "single");
    $("fcScenarioForm")?.classList.toggle("fc-hidden", tab !== "scenario");
    $("fcCompareBox")?.classList.toggle("fc-hidden", tab !== "scenario");
  }

  function readSingleInputs() {
    return {
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
    };
  }

  function readScenarioSharedInputsFromSingle() {
    const s = readSingleInputs();
    return {
      ...s,
      arv: toNum($("arvShared")?.value) || s.arv
    };
  }

  function validateInputs(inp) {
    const errs = [];
    if (inp.arv <= 0) errs.push("ARV must be greater than 0.");
    if (inp.purchase < 0) errs.push("Purchase cannot be negative.");
    if (inp.rehab < 0) errs.push("Rehab cannot be negative.");
    if (inp.months < 1) errs.push("Months must be at least 1.");
    if (inp.loanPct < 0 || inp.loanPct > 100) errs.push("Loan % must be between 0 and 100.");
    if (inp.pointsPct < 0 || inp.pointsPct > 20) errs.push("Points % must be between 0 and 20.");
    if (inp.interestApr < 0 || inp.interestApr > 50) errs.push("Interest % seems too high (max 50).");
    return errs;
  }

  function saveState(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  function applyState(state) {
    if (!state) return;

    const map = [
      ["arv", state.arv],
      ["purchasePrice", state.purchasePrice],
      ["rehab", state.rehab],
      ["loanPct", state.loanPct],
      ["downPct", state.downPct],
      ["pointsPct", state.pointsPct],
      ["interestApr", state.interestApr],
      ["months", state.months],
      ["holdingMonthly", state.holdingMonthly],
      ["agentPct", state.agentPct],
      ["closingPct", state.closingPct],
      ["contingencyPct", state.contingencyPct],
      ["desiredProfit", state.desiredProfit],
      ["purchaseA", state.purchaseA],
      ["rehabA", state.rehabA],
      ["purchaseB", state.purchaseB],
      ["rehabB", state.rehabB],
      ["arvShared", state.arvShared]
    ];

    map.forEach(([id, v]) => {
      const el = $(id);
      if (el != null && v != null) el.value = v;
    });

    if (state.tab) setTab(state.tab);

    syncSliders();
    formatAll();
  }

  function buildShareLink() {
    const tab = getActiveTab();
    const s = snapshotState(tab);
    const url = new URL(window.location.href);
    Object.entries(s).forEach(([k, v]) => url.searchParams.set(k, String(v ?? "")));
    return url.toString();
  }

  function readFromQueryParams() {
    const url = new URL(window.location.href);
    const params = url.searchParams;

    const keys = [
      "tab", "arv", "purchasePrice", "rehab", "loanPct", "downPct", "pointsPct", "interestApr", "months", "holdingMonthly", "agentPct", "closingPct", "contingencyPct", "desiredProfit",
      "purchaseA", "rehabA", "purchaseB", "rehabB", "arvShared"
    ];

    const state = {};
    let found = false;

    keys.forEach((k) => {
      if (params.has(k)) {
        state[k] = params.get(k);
        found = true;
      }
    });

    if (!found) return null;
    return state;
  }

  function snapshotState(tab) {
    return {
      tab,
      arv: $("arv")?.value ?? "",
      purchasePrice: $("purchasePrice")?.value ?? "",
      rehab: $("rehab")?.value ?? "",
      loanPct: $("loanPct")?.value ?? "",
      downPct: $("downPct")?.value ?? "",
      pointsPct: $("pointsPct")?.value ?? "",
      interestApr: $("interestApr")?.value ?? "",
      months: $("months")?.value ?? "",
      holdingMonthly: $("holdingMonthly")?.value ?? "",
      agentPct: $("agentPct")?.value ?? "",
      closingPct: $("closingPct")?.value ?? "",
      contingencyPct: $("contingencyPct")?.value ?? "",
      desiredProfit: $("desiredProfit")?.value ?? "",
      purchaseA: $("purchaseA")?.value ?? "",
      rehabA: $("rehabA")?.value ?? "",
      purchaseB: $("purchaseB")?.value ?? "",
      rehabB: $("rehabB")?.value ?? "",
      arvShared: $("arvShared")?.value ?? ""
    };
  }

  function formatMoneyInput(el) {
    const n = toNum(el.value);
    if (!el.value) return;
    el.value = fmtMoney(Math.round(n));
  }

  function formatPercentInput(el) {
    const n = toNum(el.value);
    if (!el.value) return;
    el.value = fmtPct(Number.isFinite(n) ? n : 0);
  }

  function formatAll() {
    document.querySelectorAll(".fc-input.money").forEach(formatMoneyInput);
    document.querySelectorAll(".fc-input.percent").forEach(formatPercentInput);
  }

  function syncSliders() {
    const pairs = [
      ["loanPct", "loanPctSlider"],
      ["pointsPct", "pointsPctSlider"],
      ["interestApr", "interestAprSlider"],
      ["months", "monthsSlider"]
    ];
    pairs.forEach(([inp, sld]) => {
      const i = $(inp);
      const s = $(sld);
      if (!i || !s) return;
      const v = toNum(i.value);
      if (String(s.value) !== String(v)) s.value = String(v);
    });
  }

  function wireSlider(inputId, sliderId) {
    const inp = $(inputId);
    const sld = $(sliderId);
    if (!inp || !sld) return;

    sld.addEventListener("input", () => {
      inp.value = String(sld.value);
      saveState(snapshotState(getActiveTab()));
    });

    inp.addEventListener("input", () => {
      sld.value = String(toNum(inp.value));
      saveState(snapshotState(getActiveTab()));
    });
  }

  function renderResults(out) {
    setText("kpiProfit", fmtMoney(out.profit));
    setText("kpiRoi", fmtPct(out.roi * 100));
    setText("kpiCash", fmtMoney(out.cashNeeded));
    setText("kpiMao", fmtMoney(out.maoSimple));

    setText("bdTotalCosts", fmtMoney(out.totalCosts));
    setText("bdFinCost", fmtMoney(out.pointsCost + out.interestCost));
    setText("bdSellCost", fmtMoney(out.sellingCost));
    setText("bdHoldCost", fmtMoney(out.holdingCost));

    const score = dealScore({ profit: out.profit, roi: out.roi, cashNeeded: out.cashNeeded, arv: out.inputs.arv });
    renderScore(score);

    addAnim($("fcKpis"));
    addAnim($("fcScoreBox"));
  }

  function renderCompare(outA, outB) {
    setText("cmpProfitA", fmtMoney(outA.profit));
    setText("cmpProfitB", fmtMoney(outB.profit));
    setText("cmpProfitDiff", fmtMoney(outB.profit - outA.profit));
    setText("cmpWinner", outA.profit === outB.profit ? "TIE" : (outA.profit > outB.profit ? "A" : "B"));
  }

  async function exportPdf(currentOut, mode, extra) {
    if (!currentOut) return;

    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) return;

    const doc = new jsPDF();
    let y = 14;

    doc.setFontSize(16);
    doc.text("InvestorBlueprint - Flip Calculator Report", 14, y);
    y += 10;

    doc.setFontSize(11);
    doc.text(`Mode: ${mode}`, 14, y);
    y += 7;

    const lines = [
      `ARV: ${fmtMoney(currentOut.inputs.arv)}`,
      `Purchase: ${fmtMoney(currentOut.inputs.purchase)}`,
      `Rehab (adj): ${fmtMoney(currentOut.inputs.rehabAdj)}`,
      `Loan Amount: ${fmtMoney(currentOut.loanAmount)}`,
      `Financing Cost (Points + Interest): ${fmtMoney(currentOut.pointsCost + currentOut.interestCost)}`,
      `Holding: ${fmtMoney(currentOut.holdingCost)}`,
      `Selling: ${fmtMoney(currentOut.sellingCost)}`,
      `Total Costs: ${fmtMoney(currentOut.totalCosts)}`,
      `Profit: ${fmtMoney(currentOut.profit)}`,
      `ROI: ${fmtPct(currentOut.roi * 100)}`,
      `Cash Needed: ${fmtMoney(currentOut.cashNeeded)}`
    ];

    lines.forEach((t) => {
      doc.text(t, 14, y);
      y += 7;
    });

    if (mode === "scenario" && extra?.outA && extra?.outB) {
      y += 4;
      doc.setFontSize(12);
      doc.text("Scenario Compare", 14, y);
      y += 8;
      doc.setFontSize(11);
      doc.text(`Profit A: ${fmtMoney(extra.outA.profit)} | Profit B: ${fmtMoney(extra.outB.profit)}`, 14, y);
      y += 7;
      doc.text(`Winner: ${extra.outA.profit === extra.outB.profit ? "TIE" : (extra.outA.profit > extra.outB.profit ? "A" : "B")}`, 14, y);
    }

    doc.save("flip-report.pdf");
  }

  function wireTooltips() {
    document.querySelectorAll("[data-tip]").forEach((el) => {
      const tip = el.getAttribute("data-tip");
      if (tip) el.setAttribute("title", tip);
    });
  }

  let lastOut = null;
  let lastScenario = null;

  function calculate() {
    const tab = getActiveTab();
    const errs = [];

    if (tab === "single") {
      const inp = readSingleInputs();
      errs.push(...validateInputs(inp));
      showErrors(errs);
      if (errs.length) return;

      const out = computeFlip(inp);
      lastOut = out;
      lastScenario = null;

      renderResults(out);
      renderSensitivity(buildSensitivity(inp));

      saveState(snapshotState(tab));
      return;
    }

    const shared = readScenarioSharedInputsFromSingle();

    const A = { ...shared, purchase: toNum($("purchaseA")?.value), rehab: toNum($("rehabA")?.value), arv: toNum($("arvShared")?.value) };
    const B = { ...shared, purchase: toNum($("purchaseB")?.value), rehab: toNum($("rehabB")?.value), arv: toNum($("arvShared")?.value) };

    errs.push(...validateInputs(A).map((e) => `Scenario A: ${e}`));
    errs.push(...validateInputs(B).map((e) => `Scenario B: ${e}`));
    showErrors(errs);
    if (errs.length) return;

    const outA = computeFlip(A);
    const outB = computeFlip(B);

    const best = outA.profit >= outB.profit ? outA : outB;

    lastOut = best;
    lastScenario = { outA, outB };

    renderResults(best);
    renderCompare(outA, outB);
    renderSensitivity(buildSensitivity(best.inputs));

    saveState(snapshotState(tab));
  }

  function resetAll() {
    const defaults = {
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
    };
    applyState(defaults);
    showErrors([]);
    lastOut = null;
    lastScenario = null;
    const tbody = $("fcSensitivityTable")?.querySelector("tbody");
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="3" class="fc-muted">Calcula para ver la tabla.</td></tr>';
    }
  }

  function loadExample() {
    const ex = {
      tab: getActiveTab(),
      arv: "265000",
      purchasePrice: "178000",
      rehab: "42000",
      loanPct: "90",
      downPct: "10",
      pointsPct: "2",
      interestApr: "12.5",
      months: "6",
      holdingMonthly: "950",
      agentPct: "6",
      closingPct: "2",
      contingencyPct: "10",
      desiredProfit: "30000",
      purchaseA: "178000",
      rehabA: "42000",
      purchaseB: "168000",
      rehabB: "52000",
      arvShared: "265000"
    };
    applyState(ex);
    showErrors([]);
  }

  async function copyLink() {
    const link = buildShareLink();
    try {
      await navigator.clipboard.writeText(link);
      const btn = $("fcCopyLinkBtn");
      if (btn) {
        const old = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(() => {
          btn.textContent = old;
        }, 900);
      }
    } catch (_) {
      alert(link);
    }
  }

  function wireTabs() {
    document.querySelectorAll(".fc-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        setTab(btn.getAttribute("data-tab"));
        saveState(snapshotState(getActiveTab()));
      });
    });
  }

  function wireFormatting() {
    document.querySelectorAll(".fc-input.money").forEach((el) => {
      el.addEventListener("blur", () => {
        formatMoneyInput(el);
        saveState(snapshotState(getActiveTab()));
      });
    });
    document.querySelectorAll(".fc-input.percent").forEach((el) => {
      el.addEventListener("blur", () => {
        formatPercentInput(el);
        saveState(snapshotState(getActiveTab()));
      });
    });
  }

  function wireButtons() {
    $("fcCalcBtn")?.addEventListener("click", calculate);
    $("fcResetBtn")?.addEventListener("click", resetAll);
    $("fcExampleBtn")?.addEventListener("click", loadExample);
    $("fcCopyLinkBtn")?.addEventListener("click", copyLink);

    $("fcExportPdfBtn")?.addEventListener("click", () => {
      const mode = getActiveTab();
      exportPdf(lastOut, mode, lastScenario);
    });
  }

  function wireSliders() {
    wireSlider("loanPct", "loanPctSlider");
    wireSlider("pointsPct", "pointsPctSlider");
    wireSlider("interestApr", "interestAprSlider");
    wireSlider("months", "monthsSlider");
  }

  function wireAutosync() {
    document.querySelectorAll(".fc-input").forEach((el) => {
      el.addEventListener("input", () => syncSliders());
    });
  }

  function init() {
    if (!$("flip-calculator")) return;

    wireTabs();
    wireButtons();
    wireSliders();
    wireFormatting();
    wireAutosync();
    wireTooltips();

    const fromQuery = readFromQueryParams();
    if (fromQuery) {
      applyState(fromQuery);
      if (fromQuery.tab) setTab(fromQuery.tab);
    } else {
      const saved = loadState();
      if (saved) applyState(saved);
      else resetAll();
    }

    syncSliders();
    formatAll();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
