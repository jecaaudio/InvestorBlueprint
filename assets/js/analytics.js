(function () {
  const config = window.TRACKING_CONFIG || {};
  const storageKey = config.CONSENT_STORAGE_KEY || 'ib_cookie_consent_v1';

  window.dataLayer = window.dataLayer || [];

  function readConsentFallback() {
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function hasAnalyticsConsent() {
    if (window.ConsentManager && typeof window.ConsentManager.getConsent === 'function') {
      const consent = window.ConsentManager.getConsent();
      return Boolean(consent && consent.analytics);
    }

    const consent = readConsentFallback();
    return Boolean(consent && consent.analytics);
  }

  function hasGa4() {
    const id = config.GA_MEASUREMENT_ID;
    return typeof window.gtag === 'function' && id && id !== 'GA_MEASUREMENT_ID';
  }

  function track(eventName, params) {
    const eventParams = params || {};

    if (!hasAnalyticsConsent()) {
      return false;
    }

    window.dataLayer.push({ event: eventName, ...eventParams });

    if (hasGa4()) {
      window.gtag('event', eventName, eventParams);
      return true;
    }

    console.log('[analytics]', eventName, eventParams);
    return true;
  }

  function trackCtaClick(ctaName, extraParams) {
    return track('cta_click', {
      cta_name: ctaName,
      page_path: window.location.pathname,
      ...(extraParams || {})
    });
  }

  function trackToolOpen(toolName) {
    return track('tool_open', {
      tool_name: toolName,
      page_path: window.location.pathname
    });
  }

  function trackCalcRun(toolName) {
    return track('calc_run', {
      tool_name: toolName,
      page_path: window.location.pathname
    });
  }

  function trackCalcSuccess(toolName, extraParams) {
    return track('calc_success', {
      tool_name: toolName,
      page_path: window.location.pathname,
      ...(extraParams || {})
    });
  }

  function bindCtaTracking() {
    document.addEventListener('click', function (event) {
      const element = event.target.closest('[data-cta-click]');
      if (!element) return;
      trackCtaClick(element.getAttribute('data-cta-click') || 'unknown');
    });
  }

  bindCtaTracking();

  window.IBAnalytics = {
    track,
    trackCtaClick,
    trackToolOpen,
    trackCalcRun,
    trackCalcSuccess,
    hasAnalyticsConsent
  };
})();
