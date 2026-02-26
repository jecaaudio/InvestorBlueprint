(() => {
  const buildShareLink = (state) => {
    const encoded = window.FlipFormatters.encodeState(state);
    const url = new URL(window.location.href);
    url.hash = `deal=${encoded}`;
    return url.toString();
  };

  const readStateFromHash = () => {
    const hash = window.location.hash || "";
    if (!hash.startsWith("#deal=")) return null;
    return window.FlipFormatters.decodeState(hash.replace("#deal=", ""));
  };

  window.FlipShareLink = { buildShareLink, readStateFromHash };
})();
