(() => {
  const buildShareLink = (state) => {
    const encoded = window.FlipFormatters.encodeState(state);
    const url = new URL(window.location.href);
    url.searchParams.set("deal", encoded);
    return url.toString();
  };

  const readStateFromHash = () => {
    const url = new URL(window.location.href);
    const deal = url.searchParams.get("deal");
    if (!deal) return null;
    return window.FlipFormatters.decodeState(deal);
  };

  window.FlipShareLink = { buildShareLink, readStateFromHash };
})();
