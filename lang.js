(function () {
  const SUPPORTED_LANGS = new Set(['es', 'en']);
  const DEFAULT_LANG = 'es';
  const CACHE = {};
  const I18N_PATHS = [
    'assets/i18n/',
    '../assets/i18n/',
    '../../assets/i18n/',
    '/InvestorBlueprint/assets/i18n/'
  ];

  const normalizeLang = (lang) => (SUPPORTED_LANGS.has(lang) ? lang : DEFAULT_LANG);

  const getPreferredLanguage = () => {
    const stored = localStorage.getItem('preferredLanguage');
    return normalizeLang(stored || DEFAULT_LANG);
  };

  const fetchLanguageFile = async (lang) => {
    if (CACHE[lang]) return CACHE[lang];

    let messages = null;
    for (const base of I18N_PATHS) {
      try {
        const response = await fetch(`${base}${lang}.json`, { cache: 'no-store' });
        if (response.ok) {
          messages = await response.json();
          break;
        }
      } catch {
        // try next path
      }
    }

    if (!messages) throw new Error(`Unable to load language file: ${lang}`);
    CACHE[lang] = messages;
    return messages;
  };

  const applyTranslations = (messages) => {
    document.querySelectorAll('[data-i18n]').forEach((element) => {
      const key = element.dataset.i18n;
      if (messages[key]) {
        element.textContent = messages[key];
      }
    });
  };

  const syncLanguageButtons = (lang) => {
    document.querySelectorAll('[data-lang]').forEach((button) => {
      const isActive = button.dataset.lang === lang;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  };

  const applyLanguage = async (lang) => {
    const nextLang = normalizeLang(lang);
    const messages = await fetchLanguageFile(nextLang);

    window.translations = {
      ...window.translations,
      [nextLang]: messages,
      [DEFAULT_LANG]: CACHE[DEFAULT_LANG] || window.translations?.[DEFAULT_LANG] || {}
    };

    document.documentElement.lang = nextLang;
    localStorage.setItem('preferredLanguage', nextLang);
    applyTranslations(messages);
    syncLanguageButtons(nextLang);
    document.dispatchEvent(new CustomEvent('ib:language-changed', { detail: { lang: nextLang, messages } }));
    return messages;
  };

  window.IBI18n = {
    getPreferredLanguage,
    getCurrentMessages: () => {
      const lang = normalizeLang(document.documentElement.lang);
      return CACHE[lang] || window.translations?.[lang] || {};
    },
    t: (key, fallback = '') => {
      const messages = window.IBI18n.getCurrentMessages();
      return messages[key] || fallback;
    },
    applyLanguage
  };

  document.addEventListener('DOMContentLoaded', async () => {
    await fetchLanguageFile(DEFAULT_LANG);
    const preferred = getPreferredLanguage();
    await applyLanguage(preferred);

    document.querySelectorAll('[data-lang]').forEach((button) => {
      button.addEventListener('click', async () => {
        const selectedLanguage = normalizeLang(button.dataset.lang);
        await applyLanguage(selectedLanguage);
      });
    });
  });
})();
