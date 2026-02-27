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

  const getCurrentLang = () => (document.documentElement.lang === 'es' ? 'es' : 'en');

  const authMessages = {
    emailAlreadyRegistered: {
      es: 'Este correo ya está registrado.',
      en: 'This email is already registered.'
    },
    accountCreatedTrialActive: {
      es: 'Cuenta creada. Tu prueba gratis de 30 días está activa.',
      en: 'Account created. Your 30-day free trial is active.'
    },
    accountCreatedNoTrial: {
      es: 'Solicitud enviada. Te avisaremos cuando tu acceso esté listo.',
      en: 'Request submitted. We will notify you when your access is ready.'
    },
    invalidCredentials: {
      es: 'Correo no encontrado. Solicita acceso primero.',
      en: 'Email not found. Please request access first.'
    },
    trialActivated: {
      es: 'Prueba gratis activada por 30 días.',
      en: 'Free trial activated for 30 days.'
    },
    trialAlreadyActive: {
      es: 'Tu cuenta ya tiene una prueba activa o un plan de pago.',
      en: 'Your account already has an active trial or paid plan.'
    },
    loginSuccess: {
      es: 'Sesión iniciada correctamente.',
      en: 'Signed in successfully.'
    },
    loginFirst: {
      es: 'Primero inicia sesión.',
      en: 'Please sign in first.'
    },
    invalidEmail: {
      es: 'Ingresa un correo válido.',
      en: 'Enter a valid email address.'
    }
  };

  const accountPlanText = {
    paid: {
      status: {
        es: 'Plan activo: Suscripción de pago',
        en: 'Active plan: Paid subscription'
      },
      detail: {
        es: 'Tienes acceso completo a todas las herramientas.',
        en: 'You have full access to all tools.'
      }
    },
    trial: {
      status: {
        es: 'Plan activo: Prueba gratis (30 días)',
        en: 'Active plan: Free trial (30 days)'
      },
      detailPrefix: {
        es: 'Tu prueba vence el',
        en: 'Your trial ends on'
      }
    },
    expired: {
      status: {
        es: 'Tu prueba gratis terminó',
        en: 'Your free trial has ended'
      },
      detail: {
        es: 'Para continuar con acceso completo, activa la suscripción de pago.',
        en: 'To continue with full access, activate the paid subscription.'
      }
    },
    none: {
      status: {
        es: 'Sin plan activo',
        en: 'No active plan'
      },
      detail: {
        es: 'Activa tu prueba gratis desde el botón “Start Free”.',
        en: 'Activate your free trial from the “Start Free” button.'
      }
    }
  };

  const tAuth = (key) => authMessages[key]?.[getCurrentLang()] || authMessages[key]?.es || '';

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

  const updateLoginLinks = () => {
    const loginLinks = document.querySelectorAll('[data-auth-link]');
    const user = getSession();
    const currentLang = getCurrentLang();
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
  const subscriptionStatus = document.getElementById('subscription-status');
  const subscriptionDetail = document.getElementById('subscription-detail');
  const savedCalculationsList = document.getElementById('saved-calculations-list');
  const registerEmailField = document.getElementById('register-email');
  const registerEmailError = document.getElementById('register-email-error');

  if (registerForm) {
    registerForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(registerForm);
      const email = String(data.get('email') || '').trim().toLowerCase();

      if (!email || !registerEmailField?.checkValidity()) {
        if (registerEmailError) {
          registerEmailError.hidden = false;
          registerEmailError.textContent = tAuth('invalidEmail');
        }
        registerEmailField?.focus();
        return;
      }

      if (registerEmailError) {
        registerEmailError.hidden = true;
        registerEmailError.textContent = '';
      }

      const users = getUsers();
      if (users.some((u) => u.email === email)) {
        authMessage.textContent = tAuth('emailAlreadyRegistered');
        return;
      }

      users.push({
        email,
        accessRequestedAt: new Date().toISOString(),
        subscriptionPlan: 'none'
      });
      saveUsers(users);
      setSession(email);

      if (window.location.hash === '#trial') {
        startTrial(email);
        authMessage.textContent = tAuth('accountCreatedTrialActive');
      } else {
        authMessage.textContent = tAuth('accountCreatedNoTrial');
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

      const user = getUsers().find((u) => u.email === email);
      if (!user) {
        authMessage.textContent = tAuth('invalidCredentials');
        return;
      }

      setSession(user.email);

      if (window.location.hash === '#trial') {
        const started = startTrial(user.email);
        authMessage.textContent = started
          ? tAuth('trialActivated')
          : tAuth('trialAlreadyActive');
      } else {
        authMessage.textContent = tAuth('loginSuccess');
      }

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
      const user = getUserByEmail(current);
      const currentLang = getCurrentLang();
      const status = getSubscriptionStatus(user);
      accountPanel.hidden = false;
      accountEmail.textContent = current;

      if (savedCalculationsList) {
        const savedCalculations = Array.isArray(user?.savedCalculations)
          ? [...user.savedCalculations].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          : [];

        if (!savedCalculations.length) {
          savedCalculationsList.innerHTML = currentLang === 'es'
            ? '<li>Aún no tienes cálculos guardados.</li>'
            : '<li>You have no saved calculations yet.</li>' ;
        } else {
          savedCalculationsList.innerHTML = savedCalculations
            .map((item) => {
              const updated = formatDate(item.updatedAt, currentLang === 'es' ? 'es-ES' : 'en-US');
              const toolUrl = item.tool === 'flip'
                ? `tools/flip-calculator.html?flip=${encodeURIComponent(btoa(JSON.stringify(item.state)))}`
                : '#';
              return `<li><a href="${toolUrl}">${item.name}</a> · ${updated}</li>`;
            })
            .join('');
        }
      }

      if (subscriptionStatus && subscriptionDetail) {
        if (status === 'paid') {
          subscriptionStatus.textContent = accountPlanText.paid.status[currentLang];
          subscriptionDetail.textContent = accountPlanText.paid.detail[currentLang];
        } else if (status === 'trial') {
          subscriptionStatus.textContent = accountPlanText.trial.status[currentLang];
          subscriptionDetail.textContent = `${accountPlanText.trial.detailPrefix[currentLang]} ${formatDate(user.trialEndsAt, currentLang === 'es' ? 'es-ES' : 'en-US')}.`;
        } else if (status === 'expired') {
          subscriptionStatus.textContent = accountPlanText.expired.status[currentLang];
          subscriptionDetail.textContent = accountPlanText.expired.detail[currentLang];
        } else {
          subscriptionStatus.textContent = accountPlanText.none.status[currentLang];
          subscriptionDetail.textContent = accountPlanText.none.detail[currentLang];
        }
      }
    } else {
      accountPanel.hidden = true;
    }
  }

  updateLoginLinks();
  observeLanguageChanges();
})();
