/* Header "Ingresar" link: becomes "Mi perfil" while this browser holds a member session,
 * so a signed-in person can tell they are signed in (and why admin shortcuts may show).
 * It only reads the saved Supabase session; pages that need access still check on the server. */
(function () {
  'use strict';
  const signedIn = () => {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!/^sb-[a-z0-9]+-auth-token$/i.test(key || '')) continue;
        const saved = JSON.parse(localStorage.getItem(key) || 'null');
        const session = saved?.currentSession || saved;
        if (session?.user?.id && (session.refresh_token || Number(session.expires_at) * 1000 > Date.now())) return true;
      }
    } catch (error) { /* Blocked storage or unreadable data: keep "Ingresar". */ }
    return false;
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
