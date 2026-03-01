(function () {
  const bannerHtml = `
    <div id="cookie-banner" class="cookie-banner" role="dialog" aria-live="polite" aria-label="Cookie consent">
      <p>
        We use cookies to improve your experience. Manage consent for Analytics and Marketing cookies.
        <a href="{{privacyHref}}">Privacy policy</a>.
      </p>
      <div class="cookie-options">
        <label class="cookie-option" for="cookie-analytics">
          <input id="cookie-analytics" type="checkbox" />
          Analytics cookies
        </label>
        <label class="cookie-option" for="cookie-marketing">
          <input id="cookie-marketing" type="checkbox" />
          Marketing cookies
        </label>
      </div>
      <div class="cookie-actions">
        <button id="cookie-reject-all" class="cookie-btn cookie-btn-secondary" type="button">Reject all</button>
        <button id="cookie-save-preferences" class="cookie-btn cookie-btn-secondary" type="button">Save preferences</button>
        <button id="cookie-accept-all" class="cookie-btn cookie-btn-primary" type="button">Accept all</button>
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderCookieBanner);
  } else {
    renderCookieBanner();
  }
})();
