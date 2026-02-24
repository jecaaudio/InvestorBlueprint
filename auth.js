(function () {
  const USERS_KEY = 'ibUsers';
  const SESSION_KEY = 'ibCurrentUser';

  const getUsers = () => {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    } catch {
      return [];
    }
  };

  const saveUsers = (users) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  };

  const getSession = () => localStorage.getItem(SESSION_KEY);

  const setSession = (email) => {
    localStorage.setItem(SESSION_KEY, email);
  };

  const clearSession = () => {
    localStorage.removeItem(SESSION_KEY);
  };

  const updateLoginLinks = () => {
    const loginLinks = document.querySelectorAll('[data-auth-link]');
    const user = getSession();
    const currentLang = document.documentElement.lang === 'es' ? 'es' : 'en';
    const accountLabel = currentLang === 'es' ? 'Mi cuenta' : 'My account';
    const loginLabel = currentLang === 'es' ? 'Ingresar' : 'Login';

    loginLinks.forEach((link) => {
      if (user) {
        link.textContent = `${accountLabel} (${user})`;
        link.setAttribute('href', 'login.html#account');
      } else {
        link.textContent = loginLabel;
        link.setAttribute('href', 'login.html');
      }
    });
  };

  const observeLanguageChanges = () => {
    const observer = new MutationObserver(() => {
      updateLoginLinks();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang']
    });
  };

  const registerForm = document.getElementById('register-form');
  const loginForm = document.getElementById('login-form');
  const logoutBtn = document.getElementById('logout-btn');
  const authMessage = document.getElementById('auth-message');
  const accountPanel = document.getElementById('account-panel');
  const accountEmail = document.getElementById('account-email');

  if (registerForm) {
    registerForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(registerForm);
      const name = String(data.get('name') || '').trim();
      const email = String(data.get('email') || '').trim().toLowerCase();
      const password = String(data.get('password') || '').trim();

      const users = getUsers();
      if (users.some((u) => u.email === email)) {
        authMessage.textContent = 'Este correo ya está registrado.';
        return;
      }

      users.push({ name, email, password });
      saveUsers(users);
      setSession(email);
      authMessage.textContent = 'Cuenta creada correctamente. Sesión iniciada.';
      registerForm.reset();
      updateLoginLinks();
      window.location.hash = 'account';
      window.location.reload();
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(loginForm);
      const email = String(data.get('email') || '').trim().toLowerCase();
      const password = String(data.get('password') || '').trim();

      const user = getUsers().find((u) => u.email === email && u.password === password);
      if (!user) {
        authMessage.textContent = 'Correo o contraseña inválidos.';
        return;
      }

      setSession(user.email);
      authMessage.textContent = 'Sesión iniciada correctamente.';
      loginForm.reset();
      updateLoginLinks();
      window.location.hash = 'account';
      window.location.reload();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      clearSession();
      updateLoginLinks();
      window.location.hash = '';
      window.location.reload();
    });
  }

  if (accountPanel && accountEmail) {
    const current = getSession();
    if (current) {
      accountPanel.hidden = false;
      accountEmail.textContent = current;
    } else {
      accountPanel.hidden = true;
    }
  }

  updateLoginLinks();
  observeLanguageChanges();
})();
