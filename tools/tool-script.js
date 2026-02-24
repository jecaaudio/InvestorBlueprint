(function () {
  const form = document.getElementById('tool-form');
  const output = document.getElementById('result');
  const type = document.body.dataset.tool;

  if (!form || !output || !type) {
    return;
  }

  const money = (value) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form).entries());
    const num = (name) => Number(values[name] || 0);

    if (type === 'flip') {
      const purchase = num('purchasePrice');
      const rehab = num('rehabCost');
      const sale = num('salePrice');
      const holding = num('holdingCost');
      const fees = num('closingFees');
      const profit = sale - purchase - rehab - holding - fees;
      const margin = sale ? (profit / sale) * 100 : 0;
      output.innerHTML = `<strong>Estimated Profit:</strong> ${money(profit)}<br><strong>Profit Margin:</strong> ${margin.toFixed(1)}%`;
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
