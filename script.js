(function () {
  const toggle = document.getElementById('lang-toggle');
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

  const preferred = localStorage.getItem('preferredLanguage');
  applyLanguage(preferred === 'es' ? 'es' : 'en');

  toggle.addEventListener('click', () => {
    applyLanguage(nextLanguage());
  });
})();
