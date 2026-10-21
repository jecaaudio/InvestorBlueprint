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

  const FALLBACK_MESSAGES = {
    en: {
      requiredField: 'This field is required.',
      cannotBeNegative: 'This value cannot be negative.',
      outOfRange: 'Please enter a value within the allowed range.',
      monthlyCashFlow: 'Monthly cash flow',
      annualCashFlow: 'Annual cash flow',
      estimatedArv: 'Estimated ARV',
      maxOffer: 'Max offer',
      totalFinancingCost: 'Total financing cost',
      monthlyInterestCarry: 'Monthly interest carry',
      profit: 'Profit',
      mao: 'MAO',
      cashToClose: 'Cash to close',
      totalCosts: 'Total costs',
      roi: 'ROI',
      breakEven: 'Break-even',
      dealScore: 'Deal score',
      costBreakdown: 'Cost breakdown',
      section: 'Section',
      total: 'Total',
      acquisition: 'Acquisition',
      rehabContingency: 'Rehab + contingency',
      holding: 'Holding',
      selling: 'Selling',
      financing: 'Financing',
      sensitivityResults: 'Sensitivity results',
      scenario: 'Scenario',
      low: 'Low',
      base: 'Base',
      high: 'High',
      proHint: 'Pro mode enabled: includes financing stack, MAO strategy checks, risk buffer and sensitivity table.',
      freeHint: 'Free mode: quick estimate with purchase, rehab, holding and sale costs only.'
    },
    es: {
      requiredField: 'Este campo es obligatorio.',
      cannotBeNegative: 'Este valor no puede ser negativo.',
      outOfRange: 'Ingresa un valor dentro del rango permitido.',
      monthlyCashFlow: 'Flujo mensual',
      annualCashFlow: 'Flujo anual',
      estimatedArv: 'ARV estimado',
      maxOffer: 'Oferta maxima',
      totalFinancingCost: 'Costo total de financiamiento',
      monthlyInterestCarry: 'Interes mensual',
      profit: 'Ganancia',
      mao: 'MAO',
      cashToClose: 'Efectivo al cierre',
      totalCosts: 'Costos totales',
      roi: 'ROI',
      breakEven: 'Punto de equilibrio',
      dealScore: 'Calificacion del deal',
      costBreakdown: 'Desglose de costos',
      section: 'Seccion',
      total: 'Total',
      acquisition: 'Adquisicion',
      rehabContingency: 'Rehab + contingencia',
      holding: 'Holding',
      selling: 'Venta',
      financing: 'Financiamiento',
      sensitivityResults: 'Resultados de sensibilidad',
      scenario: 'Escenario',
      low: 'Bajo',
      base: 'Base',
      high: 'Alto',
      proHint: 'Modo Pro activo: incluye stack de financiamiento, checks de MAO, buffer de riesgo y tabla de sensibilidad.',
      freeHint: 'Modo gratis: estimacion rapida con compra, rehab, holding y costos de venta.'
    }
  };

  const normalizeLang = (lang) => (SUPPORTED_LANGS.has(lang) ? lang : DEFAULT_LANG);
  const withFallbacks = (lang, messages) => ({ ...(FALLBACK_MESSAGES[lang] || {}), ...(messages || {}) });

  const getPreferredLanguage = () => {
    let stored = null;
    try { stored = localStorage.getItem('preferredLanguage'); } catch (_) { /* Private mode can block storage. */ }
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
    CACHE[lang] = withFallbacks(lang, messages);
    return CACHE[lang];
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
    let messages;
    try { messages = await fetchLanguageFile(nextLang); }
    catch (_) { messages = CACHE[nextLang] || withFallbacks(nextLang, null); }

    window.translations = {
      ...window.translations,
      [nextLang]: messages,
      [DEFAULT_LANG]: CACHE[DEFAULT_LANG] || window.translations?.[DEFAULT_LANG] || FALLBACK_MESSAGES[DEFAULT_LANG]
    };

    document.documentElement.lang = nextLang;
    try { localStorage.setItem('preferredLanguage', nextLang); } catch (_) { /* Session-only locale. */ }
    applyTranslations(messages);
    syncLanguageButtons(nextLang);
    document.dispatchEvent(new CustomEvent('ib:language-changed', { detail: { lang: nextLang, messages } }));
    return messages;
  };

  window.IBI18n = {
    getPreferredLanguage,
    getCurrentMessages: () => {
      const lang = normalizeLang(document.documentElement.lang);
      return CACHE[lang] || window.translations?.[lang] || FALLBACK_MESSAGES[lang] || {};
    },
    t: (key, fallback = '') => {
      const messages = window.IBI18n.getCurrentMessages();
      return messages[key] || fallback;
    },
    applyLanguage
  };

  document.addEventListener('DOMContentLoaded', async () => {
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
