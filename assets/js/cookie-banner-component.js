(function () {
  // Spanish is the site default; lang.js swaps every [data-i18n] text for English.
  const bannerHtml = `
    <div id="cookie-banner" class="cookie-banner" role="dialog" aria-live="polite" aria-label="Cookies">
      <p>
        <span data-i18n="cookieMessage">Usamos cookies para mejorar tu experiencia. Decide si aceptas las cookies de analítica y de marketing.</span>
        <a href="{{privacyHref}}" data-i18n="cookiePrivacyLink">Política de privacidad</a>.
      </p>
      <div class="cookie-options">
        <label class="cookie-option" for="cookie-analytics">
          <input id="cookie-analytics" type="checkbox" />
          <span data-i18n="cookieAnalytics">Cookies de analítica</span>
        </label>
        <label class="cookie-option" for="cookie-marketing">
          <input id="cookie-marketing" type="checkbox" />
          <span data-i18n="cookieMarketing">Cookies de marketing</span>
        </label>
      </div>
      <div class="cookie-actions">
        <button id="cookie-reject-all" class="cookie-btn cookie-btn-secondary" type="button" data-i18n="cookieRejectAll">Rechazar todas</button>
        <button id="cookie-save-preferences" class="cookie-btn cookie-btn-secondary" type="button" data-i18n="cookieSavePreferences">Guardar preferencias</button>
        <button id="cookie-accept-all" class="cookie-btn cookie-btn-primary" type="button" data-i18n="cookieAcceptAll">Aceptar todas</button>
      </div>
    </div>
  `;

  function getPrivacyHref() {
    const path = window.location.pathname;
    if (path.includes('/tools/arv/')) {
      return '../../privacy.html';
    }
    if (path.includes('/tools/')) {
      return '../privacy.html';
    }
    return 'privacy.html';
  }

  function renderCookieBanner() {
    if (document.getElementById('cookie-banner')) return;

    const markup = bannerHtml.replace('{{privacyHref}}', getPrivacyHref()).trim();
    document.body.insertAdjacentHTML('beforeend', markup);
    const messages = window.IBI18n?.getCurrentMessages?.() || {};
    document.querySelectorAll('#cookie-banner [data-i18n]').forEach((node) => {
      if (messages[node.dataset.i18n]) node.textContent = messages[node.dataset.i18n];
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderCookieBanner);
  } else {
    renderCookieBanner();
  }
})();
