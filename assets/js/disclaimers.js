/* Result disclaimers: one source for the notice next to results, the PDFs and the landing pages.
 * Loaded with data-tool (by the secure loader), it also places the notice under the results. */
(function () {
  'use strict';
  const GENERAL = {
    es: 'Resultados informativos basados en los datos ingresados. No son asesoría financiera, legal ni fiscal.',
    en: 'Informational results based on the data entered. Not financial, legal or tax advice.'
  };
  const TOOLS = {
    'hard-money': {
      es: 'Este cálculo no es una oferta ni una aprobación de préstamo. La tasa, los puntos y el monto los decide cada prestamista.',
      en: 'This calculation is not a loan offer or approval. Each lender sets the rate, points and loan amount.'
    },
    arv: {
      es: 'Es una estimación basada en los comparables que ingresaste. No es una tasación (appraisal); el valor real lo determina un tasador.',
      en: 'This is an estimate based on the comparables you entered. It is not an appraisal; a licensed appraiser determines actual value.'
    },
    'seller-net': {
      es: 'No garantiza el precio de venta ni lo que recibirás. Los montos finales los confirma la compañía de título en el cierre.',
      en: 'It does not guarantee the sale price or what you will receive. The title company confirms final amounts at closing.'
    },
    flip: {
      es: 'La ganancia depende del precio real de venta, los costos y el tiempo. Es un escenario, no una promesa de resultados.',
      en: 'Profit depends on the actual sale price, costs and timing. This is a scenario, not a promise of results.'
    },
    rental: {
      es: 'La renta, la vacancia y los gastos reales pueden variar. No es una garantía de ingresos.',
      en: 'Actual rent, vacancy and expenses can vary. This is not a guarantee of income.'
    }
  };
  // Every id the site uses for a calculator maps to one of the texts above.
  const ALIASES = {
    hard_money: 'hard-money', 'hard-money-analyzer': 'hard-money',
    'arv-estimator': 'arv', 'automated-arv': 'arv', 'automated-arv-tool': 'arv',
    venta: 'seller-net', seller: 'seller-net',
    'flip-calculator': 'flip',
    rent: 'rental', rentas: 'rental', 'rent-calculator': 'rental', 'rental-cash-flow': 'rental',
    roi_search: 'rental', 'roi-search': 'rental'
  };
  const key = (tool) => {
    const id = ALIASES[tool] || tool;
    return Object.hasOwn(TOOLS, id) ? id : '';
  };
  const forTool = (tool, lang) => {
    const l = lang === 'en' ? 'en' : 'es';
    const id = key(tool);
    return { tool: id ? TOOLS[id][l] : '', general: GENERAL[l] };
  };
  // Plain text for a PDF footer or a text export.
  const text = (tool, lang) => {
    const d = forTool(tool, lang);
    return d.tool ? d.tool + ' ' + d.general : d.general;
  };
  window.IBDisclaimer = Object.freeze({ forTool, text, key, GENERAL, TOOLS });

  const script = document.currentScript;
  const tool = script?.dataset?.tool;
  if (!tool || typeof document.createElement !== 'function') return;

  const language = () => {
    const lang = (document.documentElement.lang || '').toLowerCase();
    if (lang.startsWith('en')) return 'en';
    if (lang.startsWith('es')) return 'es';
    try { return localStorage.getItem('preferredLanguage') === 'en' ? 'en' : 'es'; } catch (error) { return 'es'; }
  };
  // Right after the results. Flip rebuilds the inside of #fcReportArea, so the note goes outside it.
  const anchor = () => document.getElementById('fcReportArea')
    || document.getElementById('result-detail')
    || document.getElementById('result')
    || document.getElementById('result-cards')
    || document.getElementById('results')
    || document.getElementById('netValue')?.closest('section,article,aside,.card,.panel')
    || null;
  const fill = (note) => {
    const d = forTool(tool, language());
    const title = document.createElement('strong');
    title.textContent = language() === 'en' ? 'Important' : 'Importante';
    note.replaceChildren(title, document.createTextNode(d.tool ? d.tool + ' ' + d.general : d.general));
  };
  const place = () => {
    if (typeof document === 'undefined' || !document?.body) return;
    let note = document.getElementById('ib-disclaimer');
    if (!note) {
      note = document.createElement('aside');
      note.id = 'ib-disclaimer';
      note.className = 'ib-disclaimer';
      note.setAttribute('role', 'note');
      fill(note);
    }
    const target = anchor();
    if (target && target.nextElementSibling !== note) target.after(note);
    else if (!target && !note.isConnected) (document.querySelector('main') || document.body).append(note);
  };
  const style = () => {
    if (document.getElementById('ib-disclaimer-style')) return;
    const css = document.createElement('style');
    css.id = 'ib-disclaimer-style';
    css.textContent = '.ib-disclaimer{margin:16px 0;padding:10px 14px;border-left:4px solid #e3a008;border-radius:8px;' +
      'background:rgba(227,160,8,.10);font-size:.88rem;line-height:1.5;color:inherit}' +
      '.ib-disclaimer strong{display:block;margin-bottom:2px}@media print{.ib-disclaimer{display:none!important}}';
    document.head?.append(css);
  };
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    style();
    place();
    // Some calculators rebuild their result area; keep the note in place.
    if (typeof MutationObserver === 'function' && document.body) {
      let queued = false;
      new MutationObserver(() => {
        if (queued) return;
        queued = true;
        Promise.resolve().then(() => { queued = false; place(); });
      }).observe(document.body, { childList: true, subtree: true });
      new MutationObserver(() => { const note = document.getElementById('ib-disclaimer'); if (note) fill(note); })
        .observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }
    document.addEventListener('ib:language-changed', () => { const note = document.getElementById('ib-disclaimer'); if (note) fill(note); });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
