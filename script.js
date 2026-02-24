(function () {
  const toggle = document.getElementById('lang-toggle');
  const menuToggle = document.getElementById('menu-toggle');
  const nav = document.getElementById('primary-nav');
  const translatable = document.querySelectorAll('[data-i18n]');

  const applyLanguage = (lang) => {
    const messages = window.translations?.[lang] || window.translations.en;

    translatable.forEach((element) => {
      const key = element.dataset.i18n;
      if (messages[key]) {
        element.textContent = messages[key];
      }
    });

    document.documentElement.lang = lang;
    localStorage.setItem('preferredLanguage', lang);
  };

  const nextLanguage = () =>
    document.documentElement.lang === 'en' ? 'es' : 'en';

  const browserLanguage = navigator.language?.toLowerCase().startsWith('es')
    ? 'es'
    : 'en';
  const preferred = localStorage.getItem('preferredLanguage') || browserLanguage;
  applyLanguage(preferred === 'es' ? 'es' : 'en');

  if (toggle) {
    toggle.addEventListener('click', () => {
      applyLanguage(nextLanguage());
    });
  }

  if (menuToggle && nav) {
    const closeMenu = () => {
      menuToggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
    };

    menuToggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('is-open');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
    });

    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeMenu);
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 840) {
        closeMenu();
      }
    });
  }

  const getUsers = () => {
    try {
      return JSON.parse(localStorage.getItem('ibUsers') || '[]');
    } catch {
      return [];
    }
  };

  const currentSession = localStorage.getItem('ibCurrentUser');
  const currentUser = getUsers().find((user) => user.email === currentSession);

  const hasActiveAccess = () => {
    if (!currentUser) {
      return false;
    }

    if (currentUser.subscriptionPlan === 'paid') {
      return true;
    }

    if (!currentUser.trialEndsAt) {
      return false;
    }

    return new Date(currentUser.trialEndsAt).getTime() > Date.now();
  };

  document.querySelectorAll('[data-pro-tool="true"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (hasActiveAccess()) {
        return;
      }

      event.preventDefault();
      alert('Este módulo Pro requiere prueba activa o suscripción de pago. Inicia en “Start Free”.');
      window.location.href = 'login.html#trial';
    });
  });
})();
