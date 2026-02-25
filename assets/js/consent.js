(function () {
  const config = window.TRACKING_CONFIG || {};
  const storageKey = config.CONSENT_STORAGE_KEY || 'ib_cookie_consent_v1';

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  function toGoogleConsent(consent) {
    return {
      analytics_storage: consent.analytics ? 'granted' : 'denied',
      ad_storage: consent.marketing ? 'granted' : 'denied',
      ad_user_data: consent.marketing ? 'granted' : 'denied',
      ad_personalization: consent.marketing ? 'granted' : 'denied'
    };
  }

  function readStoredConsent() {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (typeof parsed.analytics !== 'boolean' || typeof parsed.marketing !== 'boolean') {
        return null;
      }
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function writeStoredConsent(consent) {
    window.localStorage.setItem(storageKey, JSON.stringify(consent));
  }

  function dispatchConsent(consent) {
    window.dispatchEvent(new CustomEvent('ib:consent-updated', { detail: consent }));
  }

  function applyGoogleConsent(consentModePayload) {
    window.gtag('consent', 'update', consentModePayload);
  }

  const ConsentManager = {
    getConsent() {
      return readStoredConsent();
    },
    updateConsent(consent) {
      writeStoredConsent(consent);
      applyGoogleConsent(toGoogleConsent(consent));
      dispatchConsent(consent);
    },
    hasDecision() {
      return Boolean(readStoredConsent());
    }
  };

  window.ConsentManager = ConsentManager;

  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500
  });

  function setupBanner() {
    const banner = document.getElementById('cookie-banner');
    if (!banner) return;

    const acceptAllBtn = document.getElementById('cookie-accept-all');
    const rejectAllBtn = document.getElementById('cookie-reject-all');
    const saveBtn = document.getElementById('cookie-save-preferences');
    const analyticsCheckbox = document.getElementById('cookie-analytics');
    const marketingCheckbox = document.getElementById('cookie-marketing');

    const stored = readStoredConsent();
    if (stored) {
      if (analyticsCheckbox) analyticsCheckbox.checked = stored.analytics;
      if (marketingCheckbox) marketingCheckbox.checked = stored.marketing;
      banner.hidden = true;
      applyGoogleConsent(toGoogleConsent(stored));
      dispatchConsent(stored);
    }

    if (acceptAllBtn) {
      acceptAllBtn.addEventListener('click', function () {
        const consent = { analytics: true, marketing: true };
        ConsentManager.updateConsent(consent);
        if (analyticsCheckbox) analyticsCheckbox.checked = true;
        if (marketingCheckbox) marketingCheckbox.checked = true;
        banner.hidden = true;
      });
    }

    if (rejectAllBtn) {
      rejectAllBtn.addEventListener('click', function () {
        const consent = { analytics: false, marketing: false };
        ConsentManager.updateConsent(consent);
        if (analyticsCheckbox) analyticsCheckbox.checked = false;
        if (marketingCheckbox) marketingCheckbox.checked = false;
        banner.hidden = true;
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        const consent = {
          analytics: Boolean(analyticsCheckbox && analyticsCheckbox.checked),
          marketing: Boolean(marketingCheckbox && marketingCheckbox.checked)
        };
        ConsentManager.updateConsent(consent);
        banner.hidden = true;
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupBanner);
  } else {
    setupBanner();
  }
})();
