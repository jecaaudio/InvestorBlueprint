/* Header "Ingresar" link: becomes "Mi perfil" while this browser holds a member session,
 * so a signed-in person can tell they are signed in.
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
      return Boolean(session?.user?.id && Number(session.expires_at)*1000>Date.now() && !window.IBSessionSecurity?.isLocked());
    } catch (error) { return false; /* Blocked storage or unreadable data: keep "Ingresar". */ }
  };
  const originals = new Map();
  const attributes = ['href','data-i18n','data-es','data-en','data-track','data-cta-click'];
  const remember = link => {
    if (!originals.has(link)) originals.set(link, {
      attrs: Object.fromEntries(attributes.map(name=>[name,link.getAttribute(name)])),
      text:link.textContent, hidden:link.hidden
    });
    return originals.get(link);
  };
  const restore = (link,original,english) => {
    for(const [name,value] of Object.entries(original.attrs)) {
      if(value===null)link.removeAttribute(name); else link.setAttribute(name,value);
    }
    const key=original.attrs['data-i18n'];
    link.textContent=original.attrs[english?'data-en':'data-es'] || window.translations?.[english?'en':'es']?.[key] || original.text;
    link.hidden=original.hidden;
    delete link.dataset.authNav;
  };
  const update = () => {
    const active=signedIn();
    const english = (document.documentElement.lang || '').toLowerCase().startsWith('en');
    document.querySelectorAll('.navbar a[data-i18n="navLogin"], .navbar a[data-i18n="navAccount"][data-auth-nav]').forEach((link) => {
      const original=remember(link);
      if(!active){
        restore(link,original,english);
        link.href=original.attrs.href.replace(/login\.html.*$/, 'login.html?reason=login');
        link.textContent=english?'Sign in':'Ingresar';
        return;
      }
      // A menu that already links to My profile just drops "Ingresar" instead of repeating it.
      if (link.parentElement?.querySelector('a[href$="account.html"]:not([data-auth-nav])')) {
        link.hidden = true;
        link.dataset.authNav = 'hidden';
        return;
      }
      link.href = link.getAttribute('href').replace(/login\.html.*$/, 'account.html');
      link.dataset.i18n = 'navAccount';
      link.dataset.authNav = 'account';
      link.textContent = english ? 'My profile' : 'Mi perfil';
    });
    // Presentation only: a remembered session never grants tool or admin access.
    document.querySelectorAll('main a[data-track="request_access"], .lp-actions a.btn[href*="login.html"], .lp-cta a.btn[href*="login.html"], main a[data-auth-nav="cta"], #pro-cta').forEach(link=>{
      if(link.id==='pro-cta'&&window.IB_BILLING?.enabled)return;
      const original=remember(link);
      if(!active){restore(link,original,english);return;}
      link.href=original.attrs.href.replace(/login\.html.*$/, 'account.html');
      link.dataset.i18n='navAccount';
      link.dataset.es='Mi perfil';link.dataset.en='My profile';
      link.dataset.authNav='cta';
      link.removeAttribute('data-track');link.removeAttribute('data-cta-click');
      link.textContent=english?'My profile':'Mi perfil';
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', update, { once: true });
  else update();
  document.addEventListener('ib:language-changed', update);
  document.addEventListener('ib:pricing-rendered',update);
  document.addEventListener('ib:session-changed',update);
  window.addEventListener('storage',update);
  window.addEventListener('pageshow',update);
})();
