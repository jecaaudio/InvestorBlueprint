(function () {
  function appTemplate() {
    return `
      <div class="flip-header">
        <h1>Flip Calculator</h1>
        <div class="flip-controls">
          <button type="button" data-mode="basic" class="mode-btn">Básico</button>
          <button type="button" data-mode="pro" class="mode-btn">Pro</button>
          <select id="financing-type">
            <option value="cash">Cash</option>
            <option value="hardMoney">Hard Money</option>
            <option value="conventional">Conventional</option>
            <option value="private">Private</option>
            <option value="hybrid">Hybrid</option>
          </select>
          <button id="reset-defaults" type="button">Reset Defaults</button>
          <button id="export-json" type="button">Export JSON</button>
          <button id="copy-link" type="button">Copiar link</button>
        </div>
      </div>
      <div class="saved-calculations-panel">
        <input id="scenario-name" type="text" maxlength="60" placeholder="Nombre del cálculo" />
        <button id="save-scenario" type="button">Guardar en mi perfil</button>
        <select id="saved-scenarios"></select>
        <button id="load-scenario" type="button">Cargar</button>
        <button id="delete-scenario" type="button">Eliminar</button>
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
