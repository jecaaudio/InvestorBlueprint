(function () {
  const BETA_FREE_MODE = true;
  const menuToggle = document.getElementById('menu-toggle');
  const nav = document.getElementById('primary-nav');

  if (menuToggle && nav) {
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

    window.addEventListener('resize', () => {
      if (window.innerWidth > 840) {
        closeMenu();
      }
    });
  }

  // Keep this block disabled while beta free mode is active.
  if (!BETA_FREE_MODE) {
    document.querySelectorAll('[data-pro-tool="true"]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        window.location.href = 'login.html';
      });
    });
  }
})();
