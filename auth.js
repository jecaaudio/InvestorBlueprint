(function () {
  const SESSION_CACHE_KEY = 'ibCurrentUserCache';

  const getApiBase = () => (window.AUTH_CONFIG?.API_BASE || '').replace(/\/$/, '');
  const isApiConfigured = () => Boolean(getApiBase());

  const getCurrentLang = () => (document.documentElement.lang === 'es' ? 'es' : 'en');

  const authMessages = {
    backendNotConfigured: {
      es: 'El backend de autenticación aún no está configurado en este sitio.',
      en: 'The authentication backend is not configured for this site yet.'
    },
    emailAlreadyRegistered: {
      es: 'Este correo ya está registrado.',
      en: 'This email is already registered.'
    },
    accountCreatedTrialActive: {
      es: 'Cuenta creada. Tu prueba gratis de 30 días está activa.',
      en: 'Account created. Your 30-day free trial is active.'
    },
    accountCreatedNoTrial: {
      es: 'Cuenta creada correctamente.',
      en: 'Account created successfully.'
    },
    invalidCredentials: {
      es: 'Correo o contraseña incorrectos.',
      en: 'Email or password is incorrect.'
    },
    weakPassword: {
      es: 'La contraseña debe tener al menos 8 caracteres.',
      en: 'Password must be at least 8 characters.'
    },
    trialActivated: {
      es: 'Prueba gratis activada por 30 días.',
      en: 'Free trial activated for 30 days.'
    },
    loginSuccess: {
      es: 'Sesión iniciada correctamente.',
      en: 'Signed in successfully.'
    },
    invalidEmail: {
      es: 'Ingresa un correo válido.',
      en: 'Enter a valid email address.'
    },
    networkError: {
      es: 'No se pudo conectar con el servidor. Intenta de nuevo.',
      en: 'Could not reach the server. Please try again.'
    }
  };

  const accountPlanText = {
    paid: {
      status: { es: 'Plan activo: Suscripción de pago', en: 'Active plan: Paid subscription' },
      detail: { es: 'Tienes acceso completo a todas las herramientas.', en: 'You have full access to all tools.' }
    },
    trial: {
      status: { es: 'Plan activo: Prueba gratis (30 días)', en: 'Active plan: Free trial (30 days)' },
      detailPrefix: { es: 'Tu prueba vence el', en: 'Your trial ends on' }
    },
    expired: {
      status: { es: 'Tu prueba gratis terminó', en: 'Your free trial has ended' },
      detail: { es: 'Para continuar con acceso completo, activa la suscripción de pago.', en: 'To continue with full access, activate the paid subscription.' }
    },
    none: {
      status: { es: 'Sin plan activo', en: 'No active plan' },
      detail: { es: 'Activa tu prueba gratis desde el botón “Start Free”.', en: 'Activate your free trial from the “Start Free” button.' }
    }
  };

  const tAuth = (key) => authMessages[key]?.[getCurrentLang()] || authMessages[key]?.es || '';

  const ERROR_MESSAGE_KEYS = {
    EMAIL_TAKEN: 'emailAlreadyRegistered',
    INVALID_EMAIL: 'invalidEmail',
    WEAK_PASSWORD: 'weakPassword',
    INVALID_CREDENTIALS: 'invalidCredentials'
  };

  const resolveNextPath = () => {
    const url = new URL(window.location.href);
    const returnTo = url.searchParams.get('returnTo');
    if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
      return returnTo;
    }
    return 'index.html';
  };

  const getSubscriptionStatus = (user) => {
    if (!user) return 'none';
    if (user.subscriptionPlan === 'paid') return 'paid';
    if (!user.trialEndsAt) return 'none';
    return new Date(user.trialEndsAt).getTime() > Date.now() ? 'trial' : 'expired';
  };

  const formatDate = (isoDate, locale = 'es-ES') => {
    if (!isoDate) return '—';
    const date = new Date(isoDate);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(locale);
  };

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  async function apiRequest(path, { method = 'GET', body } = {}) {
    const response = await fetch(`${getApiBase()}${path}`, {
      method,
      credentials: 'include',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const code = data?.error?.code;
      const error = new Error(data?.error?.message || 'Request failed');
      error.code = code;
      throw error;
    }

    return data;
  }

  async function fetchCurrentUser() {
    if (!isApiConfigured()) return null;
    try {
      const { user } = await apiRequest('/api/auth/me');
      sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(user));
      return user;
    } catch {
      sessionStorage.removeItem(SESSION_CACHE_KEY);
      return null;
    }
  }

  const updateLoginLinks = (user) => {
    const loginLinks = document.querySelectorAll('[data-auth-link]');
    const currentLang = getCurrentLang();
    const accountLabel = currentLang === 'es' ? 'Mi cuenta' : 'My account';
    const loginLabel = currentLang === 'es' ? 'Ingresar' : 'Login';

    loginLinks.forEach((link) => {
      if (user) {
        link.textContent = `${accountLabel} (${user.email})`;
        link.setAttribute('href', 'login.html');
      } else {
        link.textContent = loginLabel;
        link.setAttribute('href', 'login.html');
      }
    });
  };

  const observeLanguageChanges = (getUser) => {
    const observer = new MutationObserver(() => updateLoginLinks(getUser()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  };

  function renderAccountPanel(user, panelRefs) {
    const { accountPanel, accountEmail, subscriptionStatus, subscriptionDetail, savedCalculationsList } = panelRefs;
    if (!accountPanel || !accountEmail) return;

    if (!user) {
      accountPanel.hidden = true;
      return;
    }

    const currentLang = getCurrentLang();
    const status = getSubscriptionStatus(user);
    accountPanel.hidden = false;
    accountEmail.textContent = user.email;

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

    if (savedCalculationsList) {
      apiRequest('/api/saved-calculations')
        .then(({ calculations }) => {
          if (!calculations.length) {
            savedCalculationsList.innerHTML = currentLang === 'es'
              ? '<li>Aún no tienes cálculos guardados.</li>'
              : '<li>You have no saved calculations yet.</li>';
            return;
          }
          savedCalculationsList.innerHTML = calculations
            .map((item) => {
              const updated = formatDate(item.updatedAt, currentLang === 'es' ? 'es-ES' : 'en-US');
              return `<li>${escapeHtml(item.name)} · ${updated}</li>`;
            })
            .join('');
        })
        .catch(() => {
          savedCalculationsList.innerHTML = '';
        });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');
    const authMessage = document.getElementById('auth-message');
    const tabRegister = document.getElementById('tab-register');
    const tabLogin = document.getElementById('tab-login');
    const panelRefs = {
      accountPanel: document.getElementById('account-panel'),
      accountEmail: document.getElementById('account-email'),
      subscriptionStatus: document.getElementById('subscription-status'),
      subscriptionDetail: document.getElementById('subscription-detail'),
      savedCalculationsList: document.getElementById('saved-calculations-list')
    };
    const registerEmailField = document.getElementById('register-email');
    const registerEmailError = document.getElementById('register-email-error');

    let currentUser = null;

    const setAuthMessage = (text) => {
      if (authMessage) authMessage.textContent = text;
    };

    const refreshUi = () => {
      updateLoginLinks(currentUser);
      renderAccountPanel(currentUser, panelRefs);
      if (registerForm && loginForm) {
        const showForms = !currentUser;
        registerForm.closest('.auth-card')?.querySelector('.auth-tabs')?.toggleAttribute('hidden', !showForms);
      }
    };

    if (tabRegister && tabLogin && registerForm && loginForm) {
      tabRegister.addEventListener('click', () => {
        tabRegister.classList.add('is-active');
        tabLogin.classList.remove('is-active');
        tabRegister.setAttribute('aria-selected', 'true');
        tabLogin.setAttribute('aria-selected', 'false');
        registerForm.hidden = false;
        loginForm.hidden = true;
      });
      tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('is-active');
        tabRegister.classList.remove('is-active');
        tabLogin.setAttribute('aria-selected', 'true');
        tabRegister.setAttribute('aria-selected', 'false');
        loginForm.hidden = false;
        registerForm.hidden = true;
      });
    }

    if (registerForm) {
      registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!isApiConfigured()) {
          setAuthMessage(tAuth('backendNotConfigured'));
          return;
        }

        const data = new FormData(registerForm);
        const email = String(data.get('email') || '').trim().toLowerCase();
        const password = String(data.get('password') || '');

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

        const startTrial = window.location.hash === '#trial';

        try {
          const { user } = await apiRequest('/api/auth/register', {
            method: 'POST',
            body: { email, password, startTrial }
          });
          currentUser = user;
          setAuthMessage(startTrial ? tAuth('accountCreatedTrialActive') : tAuth('accountCreatedNoTrial'));
          registerForm.reset();
          refreshUi();
          window.location.href = resolveNextPath();
        } catch (error) {
          setAuthMessage(tAuth(ERROR_MESSAGE_KEYS[error.code]) || error.message || tAuth('networkError'));
        }
      });
    }

    if (loginForm) {
      loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!isApiConfigured()) {
          setAuthMessage(tAuth('backendNotConfigured'));
          return;
        }

        const data = new FormData(loginForm);
        const email = String(data.get('email') || '').trim().toLowerCase();
        const password = String(data.get('password') || '');
        const startTrial = window.location.hash === '#trial';

        try {
          const { user } = await apiRequest('/api/auth/login', {
            method: 'POST',
            body: { email, password, startTrial }
          });
          currentUser = user;
          setAuthMessage(startTrial ? tAuth('trialActivated') : tAuth('loginSuccess'));
          loginForm.reset();
          refreshUi();
          window.location.href = resolveNextPath();
        } catch (error) {
          setAuthMessage(tAuth(ERROR_MESSAGE_KEYS[error.code]) || error.message || tAuth('networkError'));
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          await apiRequest('/api/auth/logout', { method: 'POST' });
        } catch {
          // best-effort: clear local state even if the request failed
        }
        currentUser = null;
        sessionStorage.removeItem(SESSION_CACHE_KEY);
        refreshUi();
      });
    }

    observeLanguageChanges(() => currentUser);

    fetchCurrentUser().then((user) => {
      currentUser = user;
      refreshUi();
    });
  });
})();
