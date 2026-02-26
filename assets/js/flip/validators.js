(() => {
  const validateDealInput = (input) => {
    const errors = [];

    if (input.arv <= 0) errors.push("ARV must be greater than 0.");
    if (input.purchase < 0) errors.push("Purchase price cannot be negative.");
    if (input.rehab < 0) errors.push("Rehab budget cannot be negative.");
    if (input.months < 0) errors.push("Hold months cannot be negative.");
    if (input.loanPct < 0 || input.loanPct > 100) errors.push("Loan % must be between 0 and 100.");
    if (input.downPct < 0 || input.downPct > 100) errors.push("Down payment % must be between 0 and 100.");
    if (input.loanPct + input.downPct > 100) errors.push("Loan % + Down payment % cannot exceed 100.");

    return errors;
  };

  window.FlipValidators = { validateDealInput };
})();
