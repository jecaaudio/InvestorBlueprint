(function () {
  const ACCESS_CODE = 'INVESTOR_TEAM_2026';
  const ACCESS_KEY = 'ib_role';
  const ACCESS_VALUE = 'TEAM_ACCESS';
  const FALLBACK_PATH = 'index.html';

  const form = document.getElementById('access-form');
  const codeInput = document.getElementById('access-code');
  const error = document.getElementById('access-code-error');

  if (!form || !codeInput || !error) {
    return;
  }

  const resolveNextPath = () => {
    const url = new URL(window.location.href);
    const returnTo = url.searchParams.get('returnTo');

    if (!returnTo || !returnTo.startsWith('/')) {
      return FALLBACK_PATH;
    }

    return returnTo;
  };

  if (localStorage.getItem(ACCESS_KEY) === ACCESS_VALUE) {
    window.location.replace(resolveNextPath());
    return;
  }

  const showError = (message) => {
    error.hidden = false;
    error.textContent = message;
    codeInput.setAttribute('aria-invalid', 'true');
    codeInput.focus();
  };

  const clearError = () => {
    error.hidden = true;
    error.textContent = '';
    codeInput.removeAttribute('aria-invalid');
  };

  codeInput.addEventListener('input', clearError);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const accessCode = codeInput.value.trim();

    if (accessCode !== ACCESS_CODE) {
      showError('Invalid access code. Please try again.');
      return;
    }

    clearError();
    localStorage.setItem(ACCESS_KEY, ACCESS_VALUE);
    window.location.href = resolveNextPath();
  });
})();
