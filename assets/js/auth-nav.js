/* Header "Ingresar" link: becomes "Mi perfil" while this browser holds a member session,
 * so a signed-in person can tell they are signed in (and why admin shortcuts may show).
 * It only reads the saved Supabase session; pages that need access still check on the server. */
(function () {
  'use strict';
  // github.io pages share one storage origin with the owner's other projects,
  // so only this site's Supabase project counts (ref set in site-config.js).
  const projectRef = () => {
    const fromAuth = /^https:\/\/([a-z0-9]+)\.supabase\.co/i.exec(window.IB_AUTH_CONFIG?.supabaseUrl || '')?.[1];
    const ref = fromAuth || window.IB_SITE?.supabaseProjectRef || '';
    return /^[a-z0-9]+$/i.test(ref) ? ref : '';
  };
  const signedIn = () => {
    const ref = projectRef();
    if (!ref) return false;
    try {
      const saved = JSON.parse(localStorage.getItem('sb-' + ref + '-auth-token') || 'null');
      const session = saved?.currentSession || saved;
      return Boolean(session?.user?.id && (session.refresh_token || Number(session.expires_at) * 1000 > Date.now()));
    } catch (error) { return false; /* Blocked storage or unreadable data: keep "Ingresar". */ }
  };
  const update = () => {
    if (!signedIn()) return;
    const english = (document.documentElement.lang || '').toLowerCase().startsWith('en');
    document.querySelectorAll('.navbar a[data-i18n="navLogin"], .navbar a[data-i18n="navAccount"][data-auth-nav]').forEach((link) => {
      link.href = link.getAttribute('href').replace(/login\.html.*$/, 'account.html');
      link.dataset.i18n = 'navAccount';
      link.dataset.authNav = 'account';
      link.textContent = english ? 'My profile' : 'Mi perfil';
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', update, { once: true });
  else update();
  document.addEventListener('ib:language-changed', update);
})();
