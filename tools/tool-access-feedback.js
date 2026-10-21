/* "Send feedback" button inside the calculators.
 * Comments are saved in Supabase (member_feedback): the member writes its own row and only the
 * owner reads them in the admin panel. With no signed-in session the text is kept and, when the
 * site has a contact inbox, an email link is offered instead. */
(function () {
  'use strict';
  const TOOLS = [
    { value: 'seller-net', es: 'Ganancia neta de venta', en: 'Seller net proceeds' },
    { value: 'flip', es: 'Calculadora de flip', en: 'Flip calculator' },
    { value: 'arv-estimator', es: 'Estimador de ARV', en: 'ARV estimator' },
    { value: 'automated-arv', es: 'ARV automático', en: 'Automated ARV' },
    { value: 'hard-money', es: 'Préstamo hard money', en: 'Hard money loan' },
    { value: 'rent', es: 'Calculadora de renta', en: 'Rent calculator' },
    { value: 'rental', es: 'Flujo de caja de alquiler', en: 'Rental cash flow' },
    { value: 'roi-search', es: 'Búsqueda de ROI', en: 'ROI search' },
    { value: 'general', es: 'El sitio en general', en: 'The site in general' }
  ];
  // Older page ids map to the loader's tool ids.
  const ALIASES = {
    'flip-calculator': 'flip', 'hard-money-analyzer': 'hard-money', 'rent-calculator': 'rent',
    'rental-cash-flow': 'rental', 'automated-arv-tool': 'automated-arv'
  };
  const COPY = {
    es: {
      open: 'Enviar comentarios', title: 'Enviar comentarios', close: 'Cerrar', tool: 'Herramienta',
      message: 'Tu comentario', placeholder: 'Cuéntanos qué funciona bien y qué deberíamos mejorar.',
      send: 'Enviar', sending: 'Enviando…', empty: 'Escribe tu comentario antes de enviarlo.',
      tooLong: 'El comentario es demasiado largo (máximo 2000 caracteres).',
      sent: '¡Gracias! Recibimos tu comentario.',
      limit: 'Enviaste muchos comentarios en poco tiempo. Inténtalo de nuevo en una hora.',
      failed: 'No pudimos enviar tu comentario. Comprueba tu conexión e inténtalo de nuevo.',
      signedOut: 'Inicia sesión para enviar comentarios.',
      email: 'O escríbenos por correo'
    },
    en: {
      open: 'Send feedback', title: 'Send feedback', close: 'Close', tool: 'Tool',
      message: 'Your feedback', placeholder: 'Tell us what works well and what we should improve.',
      send: 'Send', sending: 'Sending…', empty: 'Please write your feedback before sending.',
      tooLong: 'Your feedback is too long (2000 characters max).',
      sent: 'Thank you! We received your feedback.',
      limit: 'You sent a lot of feedback in a short time. Please try again in an hour.',
      failed: "We couldn't send your feedback. Check your connection and try again.",
      signedOut: 'Sign in to send feedback.',
      email: 'Or email us'
    }
  };
  const MAX_LENGTH = 2000;

  const language = () => {
    const lang = (document.documentElement.lang || '').toLowerCase();
    if (lang.startsWith('en')) return 'en';
    if (lang.startsWith('es')) return 'es';
    try { return localStorage.getItem('preferredLanguage') === 'en' ? 'en' : 'es'; } catch (error) { return 'es'; }
  };
  const normalizeTool = (value) => {
    const id = ALIASES[value] || value;
    return TOOLS.some((tool) => tool.value === id) ? id : '';
  };
  const detectTool = () => normalizeTool(document.body?.dataset?.tool || '')
    || normalizeTool(window.IB_TOOL_ID || '')
    || (window.location.pathname.includes('/tools/arv/') ? 'automated-arv' : '')
    || (window.location.pathname.includes('calculadora-venta') ? 'seller-net' : '')
    || 'general';

  // The secure loader shares its signed-in client; otherwise build one from the public config.
  const memberClient = () => {
    if (window.IB_MEMBER_CLIENT?.from) return window.IB_MEMBER_CLIENT;
    const cfg = window.IB_AUTH_CONFIG || {};
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase?.createClient) return null;
    try {
      window.IB_MEMBER_CLIENT = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey,
        { auth: { persistSession: true, autoRefreshToken: true } });
      return window.IB_MEMBER_CLIENT;
    } catch (error) { return null; }
  };
  const contactEmail = () => {
    const email = window.IB_SITE?.contactEmail;
    return typeof email === 'string' && /^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(email) ? email : '';
  };

  const createFeedbackWidget = () => {
    if (document.getElementById('feedbackOpen')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'ib-feedback';
    wrapper.innerHTML = `
      <button type="button" class="feedback-fab" id="feedbackOpen" aria-haspopup="dialog" aria-controls="feedbackModal"></button>
      <div id="feedbackBackdrop" hidden></div>
      <div class="feedback-modal" id="feedbackModal" role="dialog" aria-modal="true" aria-labelledby="feedback-modal-title" hidden>
        <div class="feedback-modal-panel" id="feedbackPanel">
          <div class="feedback-modal-header">
            <h2 id="feedback-modal-title"></h2>
            <button type="button" class="feedback-close" id="feedbackClose">×</button>
          </div>
          <form id="feedback-form" class="feedback-form" novalidate>
            <label for="feedback-tool" id="feedback-tool-label"></label>
            <select id="feedback-tool" name="tool" required></select>
            <label for="feedback-message" id="feedback-message-label"></label>
            <textarea id="feedback-message" name="message" rows="5" maxlength="${MAX_LENGTH}" required></textarea>
            <p class="feedback-status" id="feedback-status" role="status" aria-live="polite"></p>
            <a class="feedback-email" id="feedback-email" hidden></a>
            <button type="submit" class="feedback-submit" id="feedback-submit"></button>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(wrapper);

    const $ = (id) => document.getElementById(id);
    const openButton = $('feedbackOpen');
    const closeButton = $('feedbackClose');
    const backdrop = $('feedbackBackdrop');
    const modal = $('feedbackModal');
    const panel = $('feedbackPanel');
    const form = $('feedback-form');
    const status = $('feedback-status');
    const toolSelect = $('feedback-tool');
    const messageInput = $('feedback-message');
    const submit = $('feedback-submit');
    const emailLink = $('feedback-email');
    let statusKey = '';
    let sending = false;

    const setStatus = (key) => { statusKey = key; status.textContent = key ? COPY[language()][key] : ''; };
    const render = () => {
      const t = COPY[language()];
      const selected = toolSelect.value || detectTool();
      openButton.textContent = t.open;
      $('feedback-modal-title').textContent = t.title;
      closeButton.setAttribute('aria-label', t.close);
      $('feedback-tool-label').textContent = t.tool;
      $('feedback-message-label').textContent = t.message;
      messageInput.placeholder = t.placeholder;
      submit.textContent = sending ? t.sending : t.send;
      emailLink.textContent = t.email;
      toolSelect.replaceChildren(...TOOLS.map((tool) => {
        const option = document.createElement('option');
        option.value = tool.value;
        option.textContent = tool[language()];
        return option;
      }));
      toolSelect.value = selected;
      if (statusKey) status.textContent = t[statusKey];
    };
    // Offer email only as a fallback, with the comment already written in.
    const offerEmail = (message) => {
      const email = contactEmail();
      emailLink.hidden = !email;
      if (!email) return;
      const tool = TOOLS.find((item) => item.value === toolSelect.value) || TOOLS[TOOLS.length - 1];
      emailLink.href = 'mailto:' + email + '?subject=' + encodeURIComponent('InvestorBlueprint – ' + tool.en)
        + '&body=' + encodeURIComponent(message);
    };

    const openFeedback = () => {
      render();
      backdrop.hidden = false;
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      messageInput.focus();
    };
    const closeFeedback = () => {
      backdrop.hidden = true;
      modal.hidden = true;
      document.body.style.overflow = '';
      openButton.focus();
    };

    render();
    openButton.addEventListener('click', openFeedback);
    closeButton.addEventListener('click', closeFeedback);
    backdrop.addEventListener('click', closeFeedback);
    modal.addEventListener('click', (event) => { if (event.target === modal) closeFeedback(); });
    panel.addEventListener('click', (event) => event.stopPropagation());
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !modal.hidden) closeFeedback();
    });
    // Calculators switch language by changing <html lang>; follow it.
    if (typeof MutationObserver === 'function') {
      new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }
    document.addEventListener('ib:language-changed', render);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (sending) return;
      const message = messageInput.value.trim();
      emailLink.hidden = true;
      if (!message) { setStatus('empty'); return; }
      if (message.length > MAX_LENGTH) { setStatus('tooLong'); return; }
      const client = memberClient();
      if (!client) { setStatus(contactEmail() ? 'failed' : 'signedOut'); offerEmail(message); return; }
      sending = true;
      submit.disabled = true;
      render();
      try {
        const { data } = await client.auth.getSession();
        if (!data?.session?.user) { setStatus('signedOut'); offerEmail(message); return; }
        const { error } = await client.from('member_feedback').insert({
          tool: toolSelect.value,
          page: (window.location.pathname || '').slice(0, 300),
          message,
          language: language()
        });
        if (error) {
          setStatus(error.code === '54000' ? 'limit' : 'failed');
          if (error.code !== '54000') offerEmail(message);
          return;
        }
        messageInput.value = '';
        setStatus('sent');
      } catch (error) {
        setStatus('failed');
        offerEmail(message);
      } finally {
        sending = false;
        submit.disabled = false;
        render();
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createFeedbackWidget, { once: true });
  } else {
    createFeedbackWidget();
  }
})();
