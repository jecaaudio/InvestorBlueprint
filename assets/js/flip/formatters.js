(() => {
  const toNum = (value) => {
    if (value == null) return 0;
    const sanitized = String(value).replace(/[^0-9.-]/g, "");
    const parsed = Number(sanitized);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const currency = (value) => {
    const safeValue = Number.isFinite(value) ? value : 0;
    return safeValue.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    });
  };

  const percent = (value, digits = 1) => {
    const safeValue = Number.isFinite(value) ? value : 0;
    return `${safeValue.toFixed(digits)}%`;
  };

  const encodeState = (state) => {
    const payload = JSON.stringify(state);
    return btoa(unescape(encodeURIComponent(payload)));
  };

  const decodeState = (encoded) => {
    try {
      const payload = decodeURIComponent(escape(atob(encoded)));
      return JSON.parse(payload);
    } catch (_) {
      return null;
    }
  };

  window.FlipFormatters = { toNum, currency, percent, encodeState, decodeState };
})();
