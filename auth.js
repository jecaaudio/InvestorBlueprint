(function () {
  const USERS_KEY = 'ibUsers';
  const SESSION_KEY = 'ibCurrentUser';
  const TRIAL_DAYS = 30;

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

  const getUserByEmail = (email) => getUsers().find((u) => u.email === email);

  const getPaymentMethodLabel = (paymentMethod, lang = 'es') => {
    const labels = {
      card: { es: 'Tarjeta de crédito/débito', en: 'Credit/Debit card' },
      transfer: { es: 'Transferencia bancaria', en: 'Bank transfer' },
      paypal: { es: 'PayPal', en: 'PayPal' }
    };

    return labels[paymentMethod]?.[lang] || (lang === 'es' ? 'No definido' : 'Not set');
  };

  const getSubscriptionStatus = (user) => {
    if (!user) {
      return 'none';
    }

    if (user.subscriptionPlan === 'paid') {
      return 'paid';
    }

    if (!user.trialEndsAt) {
      return 'none';
    }

    return new Date(user.trialEndsAt).getTime() > Date.now() ? 'trial' : 'expired';
  };

  const formatDate = (isoDate, locale = 'es-ES') => {
    if (!isoDate) {
      return '—';
    }

    const date = new Date(isoDate);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(locale);
  };

  const startTrial = (email) => {
    const users = getUsers();
    const idx = users.findIndex((u) => u.email === email);

    if (idx === -1) {
      return false;
    }

    const status = getSubscriptionStatus(users[idx]);
    if (status === 'trial' || status === 'paid') {
      return false;
    }

    const startsAt = new Date();
    const endsAt = new Date(startsAt);
    endsAt.setDate(endsAt.getDate() + TRIAL_DAYS);

    users[idx] = {
      ...users[idx],
      trialStartsAt: startsAt.toISOString(),
      trialEndsAt: endsAt.toISOString(),
      subscriptionPlan: 'trial'
    };

    saveUsers(users);
    return true;
  };

  const activatePaidPlan = (email) => {
    const users = getUsers();
    const idx = users.findIndex((u) => u.email === email);

    if (idx === -1) {
      return false;
    }

    users[idx] = {
      ...users[idx],
      subscriptionPlan: 'paid',
      paidActivatedAt: new Date().toISOString()
    };

    saveUsers(users);
    return true;
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
  const activatePaidBtn = document.getElementById('activate-paid-btn');
  const authMessage = document.getElementById('auth-message');
  const accountPanel = document.getElementById('account-panel');
  const accountEmail = document.getElementById('account-email');
  const subscriptionStatus = document.getElementById('subscription-status');
  const subscriptionDetail = document.getElementById('subscription-detail');
  const accountPaymentMethod = document.getElementById('account-payment-method');
  const enrollmentPaymentStatus = document.getElementById('enrollment-payment-status');

  if (registerForm) {
    registerForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(registerForm);
      const name = String(data.get('name') || '').trim();
      const email = String(data.get('email') || '').trim().toLowerCase();
      const password = String(data.get('password') || '').trim();
      const paymentMethod = String(data.get('paymentMethod') || '').trim();

      const users = getUsers();
      if (users.some((u) => u.email === email)) {
        authMessage.textContent = 'Este correo ya está registrado.';
        return;
      }

      users.push({
        name,
        email,
        password,
        paymentMethod,
        enrollmentPaidAt: new Date().toISOString(),
        subscriptionPlan: 'none'
      });
      saveUsers(users);
      setSession(email);

      if (window.location.hash === '#trial') {
        startTrial(email);
        authMessage.textContent = 'Cuenta creada. Tu prueba gratis de 30 días está activa.';
      } else {
        authMessage.textContent = 'Cuenta creada correctamente. Ya puedes activar tu prueba gratis.';
      }

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

      if (window.location.hash === '#trial') {
        const started = startTrial(user.email);
        authMessage.textContent = started
          ? 'Prueba gratis activada por 30 días.'
          : 'Tu cuenta ya tiene una prueba activa o un plan de pago.';
      } else {
        authMessage.textContent = 'Sesión iniciada correctamente.';
      }

      loginForm.reset();
      updateLoginLinks();
      window.location.hash = 'account';
      window.location.reload();
    });
  }

  if (activatePaidBtn) {
    activatePaidBtn.addEventListener('click', () => {
      const current = getSession();
      if (!current) {
        authMessage.textContent = 'Primero inicia sesión.';
        return;
      }

      activatePaidPlan(current);
      authMessage.textContent = 'Suscripción de pago activada correctamente.';
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
      const user = getUserByEmail(current);
      const currentLang = document.documentElement.lang === 'es' ? 'es' : 'en';
      const status = getSubscriptionStatus(user);
      accountPanel.hidden = false;
      accountEmail.textContent = current;

      if (accountPaymentMethod && enrollmentPaymentStatus) {
        accountPaymentMethod.textContent = getPaymentMethodLabel(user?.paymentMethod, currentLang);
        enrollmentPaymentStatus.textContent = user?.enrollmentPaidAt
          ? currentLang === 'es'
            ? `Pagada el ${formatDate(user.enrollmentPaidAt)}`
            : `Paid on ${formatDate(user.enrollmentPaidAt, 'en-US')}`
          : currentLang === 'es'
            ? 'Pendiente'
            : 'Pending';
      }

      if (subscriptionStatus && subscriptionDetail) {
        if (status === 'paid') {
          subscriptionStatus.textContent = 'Plan activo: Suscripción de pago';
          subscriptionDetail.textContent = 'Tienes acceso completo a todas las herramientas.';
        } else if (status === 'trial') {
          subscriptionStatus.textContent = 'Plan activo: Prueba gratis (30 días)';
          subscriptionDetail.textContent = `Tu prueba vence el ${formatDate(user.trialEndsAt)}.`;
        } else if (status === 'expired') {
          subscriptionStatus.textContent = 'Tu prueba gratis terminó';
          subscriptionDetail.textContent = 'Para continuar con acceso completo, activa la suscripción de pago.';
        } else {
          subscriptionStatus.textContent = 'Sin plan activo';
          subscriptionDetail.textContent = 'Activa tu prueba gratis desde el botón “Start Free”.';
        }
      }

      if (activatePaidBtn) {
        activatePaidBtn.hidden = status === 'paid';
      }
    } else {
      accountPanel.hidden = true;
    }
  }

  updateLoginLinks();
  observeLanguageChanges();
})();
