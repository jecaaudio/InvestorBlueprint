(function () {
  const config = window.TRACKING_CONFIG || {};
  const pixelId = config.META_PIXEL_ID;
  let loaded = false;

  function loadMetaPixel() {
    if (loaded || !pixelId || pixelId === 'META_PIXEL_ID') return;
    loaded = true;

    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

    window.fbq('init', pixelId);
    window.fbq('track', 'PageView');
  }

  function maybeLoad(consent) {
    if (consent && consent.marketing) {
      loadMetaPixel();
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
