(function () {
  const config = window.TRACKING_CONFIG || {};
  const measurementId = config.GA_MEASUREMENT_ID;
  let loaded = false;

  function loadGa4() {
    if (loaded || !measurementId || measurementId === 'GA_MEASUREMENT_ID') return;
    loaded = true;

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
    document.head.appendChild(script);

    window.gtag('js', new Date());
    window.gtag('config', measurementId, { anonymize_ip: true });
  }

  function maybeLoad(consent) {
    if (consent && consent.analytics) {
      loadGa4();
    }
  }

  const manager = window.ConsentManager;
  if (manager && manager.getConsent()) {
    maybeLoad(manager.getConsent());
  }

  window.addEventListener('ib:consent-updated', function (event) {
    maybeLoad(event.detail);
  });
})();
