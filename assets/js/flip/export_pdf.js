(() => {
  const exportDealPdf = ({ deal, score, sensitivityRows }) => {
    if (!deal) return;
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) return;

    const doc = new jsPDF();
    const money = window.FlipFormatters.currency;
    const pct = (v) => window.FlipFormatters.percent(v * 100);
    let y = 14;

    const line = (text, spacing = 7) => {
      doc.text(text, 14, y);
      y += spacing;
    };

    doc.setFontSize(16);
    line("InvestorBlueprint - Flip Analysis Report", 10);
    doc.setFontSize(10);
    line("Disclaimer: This report is for educational/informational purposes and is not financial or legal advice.", 8);

    doc.setFontSize(12);
    line("Summary", 7);
    doc.setFontSize(10);
    line(`ARV: ${money(deal.input.arv)}`);
    line(`Purchase: ${money(deal.input.purchase)}`);
    line(`Rehab (w/ contingency): ${money(deal.rehabWithContingency)}`);

    doc.setFontSize(12);
    line("Financing Breakdown", 7);
    doc.setFontSize(10);
    line(`Loan Purchase: ${money(deal.loanPurchase)}`);
    line(`Loan Rehab: ${money(deal.loanRehab)}`);
    line(`Points: ${money(deal.pointsCost)}`);
    line(`Interest: ${money(deal.interestCost)}`);

    doc.setFontSize(12);
    line("Selling & Holding", 7);
    doc.setFontSize(10);
    line(`Selling Costs: ${money(deal.sellingCost)}`);
    line(`Holding Costs: ${money(deal.holdingCost)}`);

    doc.setFontSize(12);
    line("Results", 7);
    doc.setFontSize(10);
    line(`Profit: ${money(deal.profit)}`);
    line(`ROI: ${pct(deal.roi)}`);
    line(`Annualized ROI: ${pct(deal.roiAnnualized)}`);
    line(`Cash Needed: ${money(deal.cashNeeded)}`);
    line(`MAO: ${money(deal.mao)}`);

    doc.setFontSize(12);
    line("Deal Score", 7);
    doc.setFontSize(10);
    line(`Score: ${score.score} (${score.label})`);
    line(`Reasons: ${score.reasons.join(" | ") || "None"}`);

    doc.setFontSize(12);
    line("Sensitivity", 7);
    doc.setFontSize(10);
    sensitivityRows.forEach((row) => line(`${row.label}: Profit ${money(row.profit)} | ROI ${pct(row.roi)}`));

    doc.save("flip-analysis-report.pdf");
  };

  window.FlipPdf = { exportDealPdf };
})();
