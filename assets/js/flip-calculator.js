(function initTooltips(){
  const bubble = document.createElement("div");
  bubble.className = "tooltip-bubble";
  document.body.appendChild(bubble);

  let activeBtn = null;

  function show(btn, x, y){
    const text = btn.getAttribute("data-tooltip") || "";
    bubble.textContent = text;
    bubble.classList.add("show");

    const padding = 12;
    const rect = bubble.getBoundingClientRect();
    let left = x + 12;
    let top  = y + 12;

    if (left + rect.width > window.innerWidth - padding) {
      left = window.innerWidth - rect.width - padding;
    }
    if (top + rect.height > window.innerHeight - padding) {
      top = y - rect.height - 12;
    }

    bubble.style.left = `${Math.max(padding, left)}px`;
    bubble.style.top  = `${Math.max(padding, top)}px`;

    activeBtn = btn;
  }

  function hide(){
    bubble.classList.remove("show");
    activeBtn = null;
  }

  document.addEventListener("mouseover", (e) => {
    const btn = e.target.closest(".info-icon");
    if (!btn) return;
    const { clientX, clientY } = e;
    show(btn, clientX, clientY);
  });

  document.addEventListener("mousemove", (e) => {
    if (!activeBtn) return;
    show(activeBtn, e.clientX, e.clientY);
  });

  document.addEventListener("mouseout", (e) => {
    const btn = e.target.closest(".info-icon");
    if (!btn) return;
    hide();
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".info-icon");
    if (!btn) { hide(); return; }

    if (activeBtn === btn) { hide(); return; }

    const r = btn.getBoundingClientRect();
    show(btn, r.left + r.width/2, r.top + r.height);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hide();
  });

  window.addEventListener("scroll", hide, { passive:true });
})();

function parseMoney(input){
  if (input == null) return 0;
  const clean = String(input).replace(/[^0-9.\-]/g, "");
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(n){
  const v = Number(n);
  if (!Number.isFinite(v)) return "$0";
  return v.toLocaleString("en-US", { style:"currency", currency:"USD", maximumFractionDigits:0 });
}

function formatPercent(n){
  const v = Number(n);
  if (!Number.isFinite(v)) return "0%";
  return `${v.toFixed(2)}%`;
}

function calcFlip({
  arv,
  purchasePrice,
  rehab,
  holdingMonths,
  holdingMonthlyCost,
  buyClosingCosts,
  sellClosingCosts,
  agentCommissionPct,
  loanAmount,
  interestRatePct,
  pointsPct,
  downPayment
}){
  const agentCommission = arv * (agentCommissionPct/100);
  const totalSellCosts = agentCommission + sellClosingCosts;

  const pointsCost = loanAmount * (pointsPct/100);
  const monthlyRate = (interestRatePct/100)/12;
  const interestCost = loanAmount * monthlyRate * holdingMonths;

  const totalHolding = holdingMonthlyCost * holdingMonths;

  const totalCosts =
    purchasePrice +
    rehab +
    buyClosingCosts +
    totalHolding +
    totalSellCosts +
    pointsCost +
    interestCost;

  const netProfit = arv - totalCosts;

  const totalInvestmentSimple = purchasePrice + rehab + buyClosingCosts + totalHolding + pointsCost + interestCost;
  const roi = totalInvestmentSimple > 0 ? (netProfit / totalInvestmentSimple) * 100 : 0;

  const breakEvenSalePrice = totalCosts;
  const maxOffer70 = (arv * 0.70) - rehab;

  return { agentCommission, totalSellCosts, pointsCost, interestCost, totalHolding, totalCosts, netProfit, roi, breakEvenSalePrice, maxOffer70, downPayment };
}

const els = {
  arv: document.querySelector("#arv"),
  purchasePrice: document.querySelector("#purchasePrice"),
  rehab: document.querySelector("#rehab"),
  holdingMonths: document.querySelector("#holdingMonths"),
  holdingMonthlyCost: document.querySelector("#holdingMonthlyCost"),
  buyClosingCosts: document.querySelector("#buyClosingCosts"),
  sellClosingCosts: document.querySelector("#sellClosingCosts"),
  agentCommissionPct: document.querySelector("#agentCommissionPct"),
  loanAmount: document.querySelector("#loanAmount"),
  interestRatePct: document.querySelector("#interestRatePct"),
  pointsPct: document.querySelector("#pointsPct"),
  downPayment: document.querySelector("#downPayment")
};

function readState(){
  return {
    arv: parseMoney(els.arv && els.arv.value),
    purchasePrice: parseMoney(els.purchasePrice && els.purchasePrice.value),
    rehab: parseMoney(els.rehab && els.rehab.value),
    holdingMonths: parseMoney(els.holdingMonths && els.holdingMonths.value),
    holdingMonthlyCost: parseMoney(els.holdingMonthlyCost && els.holdingMonthlyCost.value),
    buyClosingCosts: parseMoney(els.buyClosingCosts && els.buyClosingCosts.value),
    sellClosingCosts: parseMoney(els.sellClosingCosts && els.sellClosingCosts.value),
    agentCommissionPct: parseMoney(els.agentCommissionPct && els.agentCommissionPct.value),
    loanAmount: parseMoney(els.loanAmount && els.loanAmount.value),
    interestRatePct: parseMoney(els.interestRatePct && els.interestRatePct.value),
    pointsPct: parseMoney(els.pointsPct && els.pointsPct.value),
    downPayment: parseMoney(els.downPayment && els.downPayment.value)
  };
}

function render(){
  const r = calcFlip(readState());

  document.querySelector("#outNetProfit").textContent = formatMoney(r.netProfit);
  document.querySelector("#outROI").textContent = formatPercent(r.roi);
  document.querySelector("#outTotalCosts").textContent = formatMoney(r.totalCosts);
  document.querySelector("#outBreakEven").textContent = formatMoney(r.breakEvenSalePrice);
  document.querySelector("#outMaxOffer70").textContent = formatMoney(r.maxOffer70);

  const badge = document.querySelector("#outDecision");
  const ok = r.roi >= 15;
  badge.textContent = ok ? "GO" : "NO GO";
  badge.dataset.state = ok ? "ok" : "bad";
}

Object.values(els).forEach(el => el && el.addEventListener("input", render));
render();
