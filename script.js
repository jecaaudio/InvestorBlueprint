(function () {
  const langButtons = document.querySelectorAll('[data-lang]');
  const menuToggle = document.getElementById('menu-toggle');
  const nav = document.getElementById('primary-nav');
  const translatable = document.querySelectorAll('[data-i18n]');

  const getMessages = (lang) => window.translations?.[lang] || window.translations?.en || {};

  const syncLanguageButtons = (lang) => {
    langButtons.forEach((button) => {
      const isActive = button.dataset.lang === lang;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  };

  const applyLanguage = (lang) => {
    const messages = getMessages(lang);

    translatable.forEach((element) => {
      const key = element.dataset.i18n;
      if (messages[key]) {
        element.textContent = messages[key];
      }
    });

    document.documentElement.lang = lang;
    localStorage.setItem('preferredLanguage', lang);
    syncLanguageButtons(lang);
    document.dispatchEvent(new CustomEvent('ib:language-changed', { detail: { lang } }));
  };

  const browserLanguage = navigator.language?.toLowerCase().startsWith('es')
    ? 'es'
    : 'en';
  const preferred = localStorage.getItem('preferredLanguage') || browserLanguage;
  applyLanguage(preferred === 'es' ? 'es' : 'en');

  langButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const selectedLanguage = button.dataset.lang === 'es' ? 'es' : 'en';
      applyLanguage(selectedLanguage);
    });
  });

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

})();
