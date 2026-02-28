(function () {
  const ACCESS_KEY = 'ib_role';
  const ACCESS_VALUE = 'TEAM_ACCESS';
  const WAITLIST_KEY = 'ib_waitlist_email';
  const FALLBACK_PATH = '/InvestorBlueprint/index.html';
  const TEAM_DOMAIN = '@tudominio.com';
  const TEAM_ALLOWLIST = ['team@investorblueprint.local', 'admin@investorblueprint.local'];

  const form = document.getElementById('access-form');
  const emailInput = document.getElementById('access-email');
  const error = document.getElementById('access-email-error');

  if (!form || !emailInput || !error) {
    return;
  }

  const resolveNextPath = () => {
    const url = new URL(window.location.href);
    const returnTo = url.searchParams.get('returnTo');
    if (returnTo && returnTo.startsWith('/')) {
      return returnTo;
    }

    return FALLBACK_PATH;
  };

  const hasInternalAccess = (email) => email.endsWith(TEAM_DOMAIN) || TEAM_ALLOWLIST.includes(email);

  if (localStorage.getItem(ACCESS_KEY) === ACCESS_VALUE) {
    window.location.replace(resolveNextPath());
    return;
  }

  const showError = (message) => {
    error.hidden = false;
    error.textContent = message;
    emailInput.setAttribute('aria-invalid', 'true');
    emailInput.focus();
  };

  const clearError = () => {
    error.hidden = true;
    error.textContent = '';
    emailInput.removeAttribute('aria-invalid');
  };

  emailInput.addEventListener('input', clearError);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = emailInput.value.trim().toLowerCase();

    if (!email || !emailInput.checkValidity()) {
      showError('Please enter a valid email address.');
      return;
    }

    clearError();
    localStorage.setItem(WAITLIST_KEY, email);

    if (hasInternalAccess(email)) {
      localStorage.setItem(ACCESS_KEY, ACCESS_VALUE);
      window.location.href = resolveNextPath();
      return;
    }

    window.alert('Access requested. We have saved your email and will contact you for pilot access.');
  });
})();
