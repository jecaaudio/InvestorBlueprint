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
    header.addEventListener('focusout',event=>{
      if(event.relatedTarget&&!header.contains(event.relatedTarget))closeMenu();
    });
  }
  // A translated hero can change height after the browser positions a deep link.
  // Keep an already-visible anchor below the sticky header; never jump back when
  // the reader has moved further down the page.
  document.addEventListener('ib:language-changed',()=>{
    if(!location.hash)return;
    let target;try{target=document.getElementById(decodeURIComponent(location.hash.slice(1)))}catch{return;}
    if(!target)return;
    const top=target.getBoundingClientRect().top;
    const bottom=document.querySelector('.navbar')?.getBoundingClientRect().bottom||0;
    if(top>=-100&&top<=bottom+80)requestAnimationFrame(()=>target.scrollIntoView({block:'start',behavior:'instant'}));
  });
})();
