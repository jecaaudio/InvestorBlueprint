(function () {
  function hasAnalyticsConsent() {
    return Boolean(window.ConsentManager && window.ConsentManager.getConsent() && window.ConsentManager.getConsent().analytics);
  }

  function hasMarketingConsent() {
    return Boolean(window.ConsentManager && window.ConsentManager.getConsent() && window.ConsentManager.getConsent().marketing);
  }

  function trackGaEvent(eventName, params) {
    if (!hasAnalyticsConsent() || typeof window.gtag !== 'function') return;
    window.gtag('event', eventName, params || {});
  }

  function trackMetaEvent(eventName, params) {
    if (!hasMarketingConsent() || typeof window.fbq !== 'function') return;
    window.fbq('track', eventName, params || {});
  }

  const eventMap = {
    start_free: function () {
      trackGaEvent('start_free', { source: 'data-track' });
      trackMetaEvent('Lead');
    },
    upgrade_premium: function () {
      trackMetaEvent('Subscribe');
    },
    whatsapp_click: function () {
      trackMetaEvent('Contact');
    },
    calculator_submit: function () {
      trackGaEvent('calculator_submit', { source: 'tool_form' });
    }
  };

  document.addEventListener('click', function (event) {
    const element = event.target.closest('[data-track]');
    if (!element) return;

    const key = element.getAttribute('data-track');
    const handler = eventMap[key];
    if (typeof handler === 'function') {
      handler();
    }
  });
})();
