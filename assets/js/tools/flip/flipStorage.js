(function () {
  const KEY = 'investorBlueprint.flipCalculator.v1';

  function save(state) {
    localStorage.setItem(KEY, JSON.stringify({ version: 1, state }));
  }

  function load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!parsed || parsed.version !== 1) return null;
      return parsed.state;
    } catch {
      return null;
    }
  }

  function clear() {
    localStorage.removeItem(KEY);
  }

  window.FlipStorage = { KEY, save, load, clear };
})();
