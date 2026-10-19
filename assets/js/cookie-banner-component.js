(function () {
  const bannerHtml = `
    <div id="cookie-banner" class="cookie-banner" role="dialog" aria-live="polite" aria-label="Cookie consent">
      <p>
        <span data-es="Usamos cookies opcionales de analítica y marketing. Elige cuáles permitir." data-en="We use optional analytics and marketing cookies. Choose which ones to allow.">Usamos cookies opcionales de analítica y marketing. Elige cuáles permitir.</span>
        <a href="{{privacyHref}}" data-es="Política de privacidad" data-en="Privacy policy">Política de privacidad</a>.
      </p>
      <div class="cookie-options">
        <label class="cookie-option" for="cookie-analytics">
          <input id="cookie-analytics" type="checkbox" />
          <span data-es="Cookies analíticas" data-en="Analytics cookies">Cookies analíticas</span>
        </label>
        <label class="cookie-option" for="cookie-marketing">
          <input id="cookie-marketing" type="checkbox" />
          <span data-es="Cookies de marketing" data-en="Marketing cookies">Cookies de marketing</span>
        </label>
      </div>
      <div class="cookie-actions">
        <button id="cookie-reject-all" class="cookie-btn cookie-btn-secondary" type="button" data-es="Rechazar todas" data-en="Reject all">Rechazar todas</button>
        <button id="cookie-save-preferences" class="cookie-btn cookie-btn-secondary" type="button" data-es="Guardar preferencias" data-en="Save preferences">Guardar preferencias</button>
        <button id="cookie-accept-all" class="cookie-btn cookie-btn-primary" type="button" data-es="Aceptar todas" data-en="Accept all">Aceptar todas</button>
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

  function translateBanner() {
    const banner=document.getElementById('cookie-banner');
    if(!banner)return;
    const isEnglish=document.documentElement.lang==='en';
    banner.setAttribute('aria-label',isEnglish?'Cookie consent':'Consentimiento de cookies');
    banner.querySelectorAll('[data-es][data-en]').forEach(el=>{
      el.textContent=isEnglish?el.dataset.en:el.dataset.es;
    });
  }

  document.addEventListener('ib:language-changed',translateBanner);

  function renderCookieBanner() {
    if (document.getElementById('cookie-banner')) return;

    const markup = bannerHtml.replace('{{privacyHref}}', getPrivacyHref()).trim();
    document.body.insertAdjacentHTML('beforeend', markup);
    translateBanner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderCookieBanner);
  } else {
    renderCookieBanner();
  }
})();
