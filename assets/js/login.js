(function () {
  const WAITLIST_KEY = 'ib_waitlist_email';
  const FALLBACK_PATH = 'index.html';

  const form = document.getElementById('access-form');
  const emailInput = document.getElementById('access-email');
  const teamCodeInput = document.getElementById('access-team-code');
  const error = document.getElementById('access-email-error');

  if (!form || !emailInput || !teamCodeInput || !error) {
    return;
  }

  const resolveNextPath = () => {
    const url = new URL(window.location.href);
    const returnTo = url.searchParams.get('returnTo');
    if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
      return returnTo;
    }

    return FALLBACK_PATH;
  };

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
    window.alert('Access requested. We saved your email and will contact you with beta updates.');
    window.location.href = resolveNextPath();
  });
})();
