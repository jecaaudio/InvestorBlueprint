(function () {
  const menuToggle = document.getElementById('menu-toggle');
  const nav = document.getElementById('primary-nav');

  if (menuToggle && nav) {
    const header=menuToggle.closest('.navbar');
    const preferences=document.createElement('div');preferences.className='mobile-nav-preferences';
    nav.append(preferences);
    const syncPreferences=()=>{
      const language=header.querySelector('.lang-switcher'),theme=header.querySelector('#siteThemeToggle');
      const mobile=window.innerWidth<=840;
      for(const control of [language,theme])if(control)(mobile?preferences:header).append(control);
      preferences.hidden=!mobile;
    };
    syncPreferences();header.addEventListener('ib:theme-ready',syncPreferences);
    const closeMenu = () => {
      menuToggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
    };

    menuToggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('is-open');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
    });

    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&nav.classList.contains('is-open')){
        closeMenu();menuToggle.focus();
      }
    });

    window.addEventListener('resize', () => {
      syncPreferences();
      if (window.innerWidth > 840) {
        closeMenu();
      }
    });
    document.addEventListener('click',event=>{if(!header.contains(event.target))closeMenu();});
  }
})();
