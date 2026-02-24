(function () {
  const KEY = 'investorBlueprint.flipCalculator.v1';
  const USERS_KEY = 'ibUsers';
  const SESSION_KEY = 'ibCurrentUser';

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

  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function getCurrentEmail() {
    return localStorage.getItem(SESSION_KEY);
  }

  function getNamedCalculations(tool = 'flip') {
    const currentEmail = getCurrentEmail();
    if (!currentEmail) {
      return [];
    }

    const user = getUsers().find((item) => item.email === currentEmail);
    if (!user || !Array.isArray(user.savedCalculations)) {
      return [];
    }

    return user.savedCalculations
      .filter((item) => item.tool === tool)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  function saveNamedCalculation(name, state, tool = 'flip') {
    const currentEmail = getCurrentEmail();
    if (!currentEmail || !name) {
      return null;
    }

    const users = getUsers();
    const userIndex = users.findIndex((item) => item.email === currentEmail);
    if (userIndex === -1) {
      return null;
    }

    const now = new Date().toISOString();
    const calculations = Array.isArray(users[userIndex].savedCalculations)
      ? [...users[userIndex].savedCalculations]
      : [];
    const existingIndex = calculations.findIndex(
      (item) => item.tool === tool && item.name.toLowerCase() === name.toLowerCase()
    );

    const entry = {
      id: existingIndex >= 0 ? calculations[existingIndex].id : `calc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tool,
      name,
      state,
      updatedAt: now
    };

    if (existingIndex >= 0) {
      calculations[existingIndex] = entry;
    } else {
      calculations.push(entry);
    }

    users[userIndex] = {
      ...users[userIndex],
      savedCalculations: calculations
    };

    saveUsers(users);
    return entry;
  }

  function loadNamedCalculation(id, tool = 'flip') {
    return getNamedCalculations(tool).find((item) => item.id === id) || null;
  }

  function deleteNamedCalculation(id, tool = 'flip') {
    const currentEmail = getCurrentEmail();
    if (!currentEmail || !id) {
      return false;
    }

    const users = getUsers();
    const userIndex = users.findIndex((item) => item.email === currentEmail);
    if (userIndex === -1) {
      return false;
    }

    const calculations = Array.isArray(users[userIndex].savedCalculations)
      ? users[userIndex].savedCalculations
      : [];
    const filtered = calculations.filter((item) => !(item.tool === tool && item.id === id));

    users[userIndex] = {
      ...users[userIndex],
      savedCalculations: filtered
    };

    saveUsers(users);
    return filtered.length !== calculations.length;
  }

  window.FlipStorage = {
    KEY,
    save,
    load,
    clear,
    getNamedCalculations,
    saveNamedCalculation,
    loadNamedCalculation,
    deleteNamedCalculation
  };
})();
