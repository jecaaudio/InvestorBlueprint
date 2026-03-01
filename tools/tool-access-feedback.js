(function () {
  const TOOL_NAMES = [
    { value: 'arv-estimator', label: 'ARV Estimator' },
    { value: 'flip-calculator', label: 'Flip Calculator' },
    { value: 'hard-money-analyzer', label: 'Hard Money Analyzer' },
    { value: 'rent-calculator', label: 'Rent Calculator' },
    { value: 'rental-cash-flow', label: 'Rental Cash Flow' },
    { value: 'automated-arv-tool', label: 'Automated ARV Tool' }
  ];

  const detectTool = () => {
    const bodyTool = document.body?.dataset?.tool;
    if (bodyTool) {
      return bodyTool;
    }

    const path = window.location.pathname;
    if (path.includes('/tools/arv/')) {
      return 'automated-arv-tool';
    }

    return 'unknown';
  };

  const resolveToolFromValue = (value) => {
    const match = TOOL_NAMES.find((tool) => tool.value === value);
    return match ? match.label : value;
  };

  const encode = (text) => encodeURIComponent(text);

  const createFeedbackWidget = () => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <button type="button" class="feedback-fab" id="feedbackOpen" aria-haspopup="dialog" aria-controls="feedbackModal">
        Send Feedback
      </button>
      <div id="feedbackBackdrop" hidden></div>
      <div class="feedback-modal" id="feedbackModal" role="dialog" aria-modal="true" aria-labelledby="feedback-modal-title" hidden>
        <div class="feedback-modal-panel" id="feedbackPanel">
          <div class="feedback-modal-header">
            <h2 id="feedback-modal-title">Send Feedback</h2>
            <button type="button" class="feedback-close" id="feedbackClose" aria-label="Close feedback modal">×</button>
          </div>
          <form id="feedback-form" class="feedback-form">
            <label for="feedback-tool">Tool</label>
            <select id="feedback-tool" name="tool" required>
              ${TOOL_NAMES.map((tool) => `<option value="${tool.value}">${tool.label}</option>`).join('')}
            </select>

            <label for="feedback-message">Your feedback</label>
            <textarea id="feedback-message" name="message" rows="5" required placeholder="Tell us what is working and what we should improve."></textarea>

            <p class="feedback-status" id="feedback-status" role="status" aria-live="polite"></p>
            <button type="submit" class="feedback-submit">Send</button>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(wrapper);

    const openButton = document.getElementById('feedbackOpen');
    const closeButton = document.getElementById('feedbackClose');
    const backdrop = document.getElementById('feedbackBackdrop');
    const modal = document.getElementById('feedbackModal');
    const form = document.getElementById('feedback-form');
    const status = document.getElementById('feedback-status');
    const toolSelect = document.getElementById('feedback-tool');
    const messageInput = document.getElementById('feedback-message');

    if (!openButton || !closeButton || !backdrop || !modal || !form || !status || !toolSelect || !messageInput) {
      return;
    }

    const currentTool = detectTool();
    if (TOOL_NAMES.some((tool) => tool.value === currentTool)) {
      toolSelect.value = currentTool;
    }

    const openFeedback = () => {
      backdrop.hidden = false;
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      messageInput.focus();
    };

    const closeFeedback = () => {
      backdrop.hidden = true;
      modal.hidden = true;
      document.body.style.overflow = '';
      openButton.focus();
    };

    openButton.addEventListener('click', openFeedback);
    closeButton.addEventListener('click', closeFeedback);

    backdrop.addEventListener('click', closeFeedback);
    modal.addEventListener('click', (event) => event.stopPropagation());

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !modal.hidden) {
        closeFeedback();
      }
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const selectedTool = toolSelect.value;
      const message = messageInput.value.trim();

      if (!message) {
        status.textContent = 'Please write your feedback before sending.';
        return;
      }

      const toolLabel = resolveToolFromValue(selectedTool);
      const mailtoHref = `mailto:feedback@investorblueprint.local?subject=${encode(`InvestorBlueprint Feedback - ${toolLabel}`)}&body=${encode(
        `Tool: ${toolLabel}\nURL: ${window.location.href}\n\nFeedback:\n${message}`
      )}`;

      window.location.href = mailtoHref;
      status.textContent = 'Opening your email client to send feedback.';
      form.reset();
      toolSelect.value = selectedTool;
      setTimeout(closeFeedback, 300);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createFeedbackWidget, { once: true });
  } else {
    createFeedbackWidget();
  }
})();
