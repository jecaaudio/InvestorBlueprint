(function () {
  const form = document.getElementById('tool-form');
  const output = document.getElementById('result');
  const type = document.body.dataset.tool;

  if (!form || !output || !type) {
    return;
  }

  const money = (value) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  const pct = (value) => `${value.toFixed(1)}%`;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form).entries());
    const num = (name) => Number(values[name] || 0);

    if (type === 'flip') {
      const purchase = num('purchasePrice');
      const earnest = num('earnestDeposit');
      const buyerClosing = num('buyerClosing');
      const titleFees = num('titleFees');
      const prorations = num('prorations');
      const inspection = num('inspectionCost');

      const rehabBase = num('rehabCost');
      const contingency = rehabBase * (num('contingencyPct') / 100);
      const rehabTotal = rehabBase + contingency;

      const holdMonths = Math.max(num('holdingMonths'), 0);
      const monthlyHolding =
        num('insuranceMonthly') +
        num('taxesMonthly') +
        num('utilitiesMonthly') +
        num('maintenanceMonthly') +
        num('hoaMonthly') +
        num('miscMonthly');
      const holdingTotal = monthlyHolding * holdMonths;

      const sale = num('salePrice');
      const realtor = sale * (num('realtorPct') / 100);
      const concessions = sale * (num('concessionPct') / 100);
      const sellerClosing = sale * (num('sellerClosingPct') / 100);
      const staging = num('stagingCost');
      const transferTax = num('transferTax');
      const sellingTotal = realtor + concessions + sellerClosing + staging + transferTax;

      const acquisitionTotal = purchase + earnest + buyerClosing + titleFees + prorations + inspection;
      const projectCostBeforeFinancing = acquisitionTotal + rehabTotal + holdingTotal + sellingTotal;

      const financingType = values.financingType || 'cash';
      const loanAmountInput = num('loanAmount');
      const points = num('pointsPct') / 100;
      const annualRate = num('interestRate') / 100;
      const loanPurchase = purchase * (num('loanPurchasePct') / 100);
      const loanRehab = rehabTotal * (num('loanRehabPct') / 100);
      const heuristicLoan = loanPurchase + loanRehab;
      const financedAmount = financingType === 'cash' ? 0 : Math.max(loanAmountInput, heuristicLoan);
      const drawFees = (num('drawFee') + num('drawInspectionFee')) * num('drawCount');
      const pointCost = financedAmount * points;
      const interestCost = financedAmount * annualRate * (holdMonths / 12);
      const loanFees = num('originationFees') + num('loanClosingCosts') + num('prepayPenalty');
      const financingTotal = financingType === 'cash' ? 0 : pointCost + interestCost + drawFees + loanFees;

      const grossProfitPreTax = sale - projectCostBeforeFinancing - financingTotal;
      const taxAmount = Math.max(grossProfitPreTax, 0) * (num('taxRate') / 100);
      const netProfit = grossProfitPreTax - taxAmount;

      const downPayment = purchase * (num('downPaymentPct') / 100);
      const cashRequired =
        financingType === 'cash'
          ? acquisitionTotal + rehabTotal + holdingTotal + sellingTotal
          : Math.max(acquisitionTotal + rehabTotal + holdingTotal + sellingTotal - financedAmount, 0) + loanFees + drawFees + pointCost + downPayment;

      const margin = sale ? (netProfit / sale) * 100 : 0;
      const roiCash = cashRequired ? (netProfit / cashRequired) * 100 : 0;
      const annualizedRoi = holdMonths ? roiCash * (12 / holdMonths) : 0;
      const allInNoSale = acquisitionTotal + rehabTotal + holdingTotal + financingTotal;
      const arvPct = sale ? (allInNoSale / sale) * 100 : 0;
      const sqft = num('sqft');
      const costPerSqft = sqft ? allInNoSale / sqft : 0;

      const mao70 = sale * 0.7 - rehabTotal;
      const targetProfit = num('targetProfit');
      const targetRoiPct = num('targetRoi') / 100;
      const riskBuffer = num('riskBufferPct') / 100;
      const fixedWithoutPurchase =
        earnest + buyerClosing + titleFees + prorations + inspection + rehabTotal + holdingTotal + sellingTotal + financingTotal + taxAmount;
      const maoByProfit = sale - targetProfit - fixedWithoutPurchase;
      const maoByRoi = (sale - fixedWithoutPurchase) / (1 + targetRoiPct);
      const maoAdjusted = Math.min(maoByProfit, maoByRoi) * (1 - riskBuffer);

      const maxRehabAllowed = sale - targetProfit - (acquisitionTotal - purchase) - holdingTotal - sellingTotal - financingTotal - taxAmount - purchase;
      const maxHoldingMonths = monthlyHolding > 0 ? Math.max((sale - targetProfit - acquisitionTotal - rehabTotal - sellingTotal - financingTotal - taxAmount) / monthlyHolding, 0) : 0;
      const breakEvenSale = projectCostBeforeFinancing + financingTotal + taxAmount;
      const breakEvenArv = breakEvenSale;

      const scenarioProfit = (saleShiftPct, rehabShiftPct, monthsOverride) => {
        const s = sale * (1 + saleShiftPct / 100);
        const r = rehabTotal * (1 + rehabShiftPct / 100);
        const h = monthlyHolding * monthsOverride;
        const sellCosts = s * (num('realtorPct') / 100 + num('concessionPct') / 100 + num('sellerClosingPct') / 100) + staging + transferTax;
        const interestAdj = financingType === 'cash' ? 0 : financedAmount * annualRate * (monthsOverride / 12);
        return s - (acquisitionTotal + r + h + sellCosts + financingTotal - interestCost + interestAdj);
      };

      const sensitivityRows = [
        { label: 'Low', arv: num('arvLowPct'), rehab: num('rehabHighPct'), months: num('holdHighMonths') || holdMonths },
        { label: 'Base', arv: 0, rehab: 0, months: holdMonths },
        { label: 'High', arv: num('arvHighPct'), rehab: num('rehabLowPct'), months: num('holdLowMonths') || holdMonths }
      ].map((row) => ({ ...row, profit: scenarioProfit(row.arv, row.rehab, row.months) }));

      const statusClass = netProfit >= targetProfit && roiCash >= num('targetRoi')
        ? 'green'
        : netProfit >= 0
          ? 'yellow'
          : 'red';
      const statusLabel = statusClass === 'green' ? 'Green · Meets targets' : statusClass === 'yellow' ? 'Yellow · Borderline' : 'Red · Fails targets';

      output.innerHTML = `
        <div class="badge ${statusClass}">${statusLabel}</div>
        <h3>Deal summary</h3>
        <div class="result-grid">
          <div class="metric"><strong>All-in cost</strong><span>${money(allInNoSale)}</span></div>
          <div class="metric"><strong>Cash required</strong><span>${money(cashRequired)}</span></div>
          <div class="metric"><strong>Financed amount</strong><span>${money(financedAmount)}</span></div>
          <div class="metric"><strong>Total financing cost</strong><span>${money(financingTotal)}</span></div>
          <div class="metric"><strong>Net profit</strong><span>${money(netProfit)}</span></div>
          <div class="metric"><strong>Profit margin</strong><span>${pct(margin)}</span></div>
          <div class="metric"><strong>ROI on cash</strong><span>${pct(roiCash)}</span></div>
          <div class="metric"><strong>Annualized ROI</strong><span>${pct(annualizedRoi)}</span></div>
          <div class="metric"><strong>All-in / ARV</strong><span>${pct(arvPct)}</span></div>
          <div class="metric"><strong>Cost per sqft</strong><span>${sqft ? money(costPerSqft) : 'N/A'}</span></div>
        </div>

        <h3>MAO and offer limits</h3>
        <div class="result-grid">
          <div class="metric"><strong>70% Rule MAO</strong><span>${money(mao70)}</span></div>
          <div class="metric"><strong>MAO by target + buffer</strong><span>${money(maoAdjusted)}</span></div>
          <div class="metric"><strong>Max rehab allowed</strong><span>${money(maxRehabAllowed)}</span></div>
          <div class="metric"><strong>Max holding months</strong><span>${maxHoldingMonths.toFixed(1)} mo</span></div>
          <div class="metric"><strong>Break-even sale price</strong><span>${money(breakEvenSale)}</span></div>
          <div class="metric"><strong>Break-even ARV</strong><span>${money(breakEvenArv)}</span></div>
        </div>

        <h3>Cost breakdown (auditable)</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Section</th><th>Total</th></tr></thead>
            <tbody>
              <tr><td>Acquisition costs</td><td>${money(acquisitionTotal)}</td></tr>
              <tr><td>Rehab + contingency</td><td>${money(rehabTotal)}</td></tr>
              <tr><td>Holding (${holdMonths.toFixed(1)} mo)</td><td>${money(holdingTotal)}</td></tr>
              <tr><td>Selling costs</td><td>${money(sellingTotal)}</td></tr>
              <tr><td>Financing costs</td><td>${money(financingTotal)}</td></tr>
            </tbody>
          </table>
        </div>

        <h3>Sensitivity scenarios</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Scenario</th><th>ARV shift</th><th>Rehab shift</th><th>Months</th><th>Profit</th></tr></thead>
            <tbody>
              ${sensitivityRows
                .map((row) => `<tr><td>${row.label}</td><td>${pct(row.arv)}</td><td>${pct(row.rehab)}</td><td>${row.months.toFixed(1)}</td><td>${money(row.profit)}</td></tr>`)
                .join('')}
            </tbody>
          </table>
        </div>
      `;
      return;
    }

    if (type === 'rental') {
      const rent = num('monthlyRent');
      const taxes = num('taxes');
      const insurance = num('insurance');
      const maintenance = num('maintenance');
      const vacancyRate = num('vacancyRate') / 100;
      const management = num('management');
      const adjustedRent = rent * (1 - vacancyRate);
      const cashFlow = adjustedRent - taxes - insurance - maintenance - management;
      output.innerHTML = `<strong>Monthly Cash Flow:</strong> ${money(cashFlow)}<br><strong>Annual Cash Flow:</strong> ${money(cashFlow * 12)}`;
      return;
    }

    if (type === 'arv') {
      const comp1 = num('comp1');
      const comp2 = num('comp2');
      const comp3 = num('comp3');
      const repairs = num('repairs');
      const average = (comp1 + comp2 + comp3) / 3;
      const buyMax = average * 0.7 - repairs;
      output.innerHTML = `<strong>Estimated ARV:</strong> ${money(average)}<br><strong>Maximum Offer (70% Rule):</strong> ${money(buyMax)}`;
      return;
    }

    if (type === 'hard-money') {
      const loan = num('loanAmount');
      const interest = num('interestRate') / 100;
      const points = num('points') / 100;
      const months = num('months');
      const pointCost = loan * points;
      const interestCost = loan * interest * (months / 12);
      const totalCost = pointCost + interestCost;
      output.innerHTML = `<strong>Total Financing Cost:</strong> ${money(totalCost)}<br><strong>Monthly Interest Carry:</strong> ${money(interestCost / Math.max(months, 1))}`;
    }
  });
})();
