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

  const saveUsers = (users) => localStorage.setItem(USERS_KEY, JSON.stringify(users));
  const getSession = () => localStorage.getItem(SESSION_KEY);
  const setSession = (email) => localStorage.setItem(SESSION_KEY, email);
  const clearSession = () => localStorage.removeItem(SESSION_KEY);

  const updateLoginLinks = () => {
    const loginLinks = document.querySelectorAll('[data-auth-link]');
    const userEmail = getSession();

    loginLinks.forEach((link) => {
      if (userEmail) {
        link.textContent = `Mi cuenta (${userEmail})`;
        link.setAttribute('href', 'login.html#account-panel');
      } else {
        link.textContent = 'Login';
        link.setAttribute('href', 'login.html');
      }
    });
  };

  const showMessage = (element, message, type) => {
    if (!element) return;
    element.textContent = message;
    element.classList.remove('is-success', 'is-error');
    element.classList.add(type === 'success' ? 'is-success' : 'is-error');
  };

  const setupTabs = () => {
    const tabs = document.querySelectorAll('[data-auth-tab]');
    const panels = document.querySelectorAll('[data-auth-panel]');

    if (!tabs.length || !panels.length) return;

    const activate = (panelName) => {
      tabs.forEach((tab) => {
        const active = tab.dataset.authTab === panelName;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', String(active));
      });

      panels.forEach((panel) => {
        panel.hidden = panel.dataset.authPanel !== panelName;
      });
    };

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => activate(tab.dataset.authTab));
    });

    activate('login');
  };

  const setPasswordVisibility = (selector, visible) => {
    document.querySelectorAll(selector).forEach((input) => {
      input.type = visible ? 'text' : 'password';
    });
  };

  const setupPasswordToggles = () => {
    const loginToggle = document.getElementById('show-login-password');
    const registerToggle = document.getElementById('show-register-password');

    if (loginToggle) {
      loginToggle.addEventListener('change', () => {
        setPasswordVisibility('#login-form input[name="password"]', loginToggle.checked);
      });
    }

    if (registerToggle) {
      registerToggle.addEventListener('change', () => {
        setPasswordVisibility('#register-form input[name="password"], #register-form input[name="confirmPassword"]', registerToggle.checked);
      });
    }
  };

  const mountAccountPanel = () => {
    const panel = document.getElementById('account-panel');
    const accountEmail = document.getElementById('account-email');
    const session = getSession();

    if (!panel || !accountEmail) return;

    if (session) {
      panel.hidden = false;
      accountEmail.textContent = session;
    } else {
      panel.hidden = true;
      accountEmail.textContent = '';
    }
  };

  const bindAuthForms = () => {
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');
    const authMessage = document.getElementById('auth-message');

    if (registerForm) {
      registerForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const data = new FormData(registerForm);

        const name = String(data.get('name') || '').trim();
        const email = String(data.get('email') || '').trim().toLowerCase();
        const password = String(data.get('password') || '').trim();
        const confirmPassword = String(data.get('confirmPassword') || '').trim();

        if (password.length < 6) {
          showMessage(authMessage, 'La contraseña debe tener al menos 6 caracteres.', 'error');
          return;
        }

        if (password !== confirmPassword) {
          showMessage(authMessage, 'Las contraseñas no coinciden.', 'error');
          return;
        }

        const users = getUsers();
        if (users.some((user) => user.email === email)) {
          showMessage(authMessage, 'Este correo ya está registrado.', 'error');
          return;
        }

        users.push({ name, email, password });
        saveUsers(users);
        setSession(email);
        registerForm.reset();
        showMessage(authMessage, 'Cuenta creada y sesión iniciada correctamente.', 'success');
        updateLoginLinks();
        mountAccountPanel();
      });
    }

    if (loginForm) {
      loginForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const data = new FormData(loginForm);
        const email = String(data.get('email') || '').trim().toLowerCase();
        const password = String(data.get('password') || '').trim();

        const user = getUsers().find((item) => item.email === email && item.password === password);
        if (!user) {
          showMessage(authMessage, 'Correo o contraseña inválidos.', 'error');
          return;
        }

        setSession(user.email);
        loginForm.reset();
        showMessage(authMessage, `Bienvenido/a ${user.name || user.email}.`, 'success');
        updateLoginLinks();
        mountAccountPanel();
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        clearSession();
        showMessage(authMessage, 'Sesión cerrada correctamente.', 'success');
        updateLoginLinks();
        mountAccountPanel();
      });
    }
  };

  setupTabs();
  setupPasswordToggles();
  bindAuthForms();
  updateLoginLinks();
  mountAccountPanel();
})();
