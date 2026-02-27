(function () {
  const WAITLIST_KEY = 'ib_waitlist_email';
  const form = document.getElementById('request-access-form');
  const emailInput = document.getElementById('waitlist-email');
  const error = document.getElementById('waitlist-email-error');
  const message = document.getElementById('request-access-message');

  if (!form || !emailInput || !error) {
    return;
  }

  const showError = (text) => {
    error.hidden = false;
    error.textContent = text;
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

    if (message) {
      message.textContent = 'Request received. We will contact you soon.';
    }

    form.reset();
  });
})();
