(function () {
  function appTemplate() {
    return `
      <div class="flip-header">
        <h1 data-i18n-flip="flipUiTitle">Flip Calculator</h1>
        <div class="flip-controls">
          <button type="button" data-mode="basic" class="mode-btn" data-i18n-flip="modeBasic">Basic</button>
          <button type="button" data-mode="pro" class="mode-btn">Pro</button>
          <select id="financing-type">
            <option value="cash" data-i18n-flip="financingCash">Cash</option>
            <option value="hardMoney" data-i18n-flip="financingHardMoney">Hard Money</option>
            <option value="conventional" data-i18n-flip="financingConventional">Conventional</option>
            <option value="private" data-i18n-flip="financingPrivate">Private</option>
            <option value="hybrid" data-i18n-flip="financingHybrid">Hybrid</option>
          </select>
          <button id="reset-defaults" type="button" data-i18n-flip="resetDefaults">Reset Defaults</button>
          <button id="export-json" type="button" data-i18n-flip="exportJson">Export JSON</button>
          <button id="copy-link" type="button" data-i18n-flip="copyLink">Copy Link</button>
        </div>
      </div>
      <div class="saved-calculations-panel">
        <input id="scenario-name" type="text" maxlength="60" placeholder="Calculation name" data-i18n-flip-placeholder="scenarioNamePlaceholder" />
        <button id="save-scenario" type="button" data-i18n-flip="saveToProfile">Save to profile</button>
        <select id="saved-scenarios"></select>
        <button id="load-scenario" type="button" data-i18n-flip="load">Load</button>
        <button id="delete-scenario" type="button" data-i18n-flip="delete">Delete</button>
      </div>
      <p id="saved-scenario-message" class="saved-scenario-message"></p>
      <div id="flip-errors"></div>
      <div id="flip-summary" class="flip-summary"></div>
      <div id="flip-inputs"></div>
      <div id="flip-scenarios"></div>
      <div id="flip-breakdown"></div>
    `;
  }

  window.FlipTemplates = { appTemplate };
})();
