(function () {
  const TOOL_CONFIG_PATHS = [
    '/InvestorBlueprint/assets/config/tools.json',
    'assets/config/tools.json',
    '../assets/config/tools.json',
    '../../assets/config/tools.json'
  ];

  const STATUS_CONFIG = {
    beta_free: { label: 'BETA (FREE)', className: 'free', isPro: false }
  };

  const getCurrentLanguage = () => (localStorage.getItem('preferredLanguage') === 'es' ? 'es' : 'en');

  const getMessages = () => {
    const lang = getCurrentLanguage();
    return window.translations?.[lang] || window.translations?.en || {};
  };

  const getLocalizedDescription = (tool) => {
    const lang = getCurrentLanguage();
    if (lang === 'es') {
      return tool.description_es || tool.description_en || '';
    }

    return tool.description_en || tool.description_es || '';
  };

  const fetchToolsConfig = async () => {
    for (const path of TOOL_CONFIG_PATHS) {
      try {
        const response = await fetch(path, { cache: 'no-store' });
        if (response.ok) {
          return response.json();
        }
      } catch {
        // try next path
      }
    }

    return [];
  };

  const getStatusMeta = (status) => STATUS_CONFIG[String(status || '').toLowerCase()] || STATUS_CONFIG.beta_free;

  const applyBadge = (badgeNode, status) => {
    if (!badgeNode) {
      return;
    }

    const statusMeta = getStatusMeta(status);
    badgeNode.textContent = statusMeta.label;
    badgeNode.classList.remove('free', 'pro');
    badgeNode.classList.add(statusMeta.className);
  };

  const createHomeCard = (tool, messages) => {
    const article = document.createElement('article');
    article.className = 'card';
    article.dataset.toolId = tool.id;

    const statusMeta = getStatusMeta(tool.status);

    const badge = document.createElement('span');
    badge.className = `badge ${statusMeta.className}`;
    badge.dataset.toolPlanBadge = '';
    badge.textContent = statusMeta.label;

    const title = document.createElement('h3');
    title.textContent = tool.name;

    const description = document.createElement('p');
    description.textContent = getLocalizedDescription(tool);

    const link = document.createElement('a');
    link.className = 'card-btn';
    link.href = tool.url;
    link.textContent = messages.tryTool || 'Open Tool';
    link.setAttribute('data-cta-click', 'Open Tool');
    if (statusMeta.isPro) {
      link.setAttribute('data-pro-tool', 'true');
    }

    article.append(badge, title, description, link);
    return article;
  };

  const applyHomeCards = (tools) => {
    const toolGrid = document.querySelector('.tool-grid');
    if (!toolGrid) {
      return;
    }

    const messages = getMessages();
    toolGrid.innerHTML = '';

    tools.forEach((tool) => {
      toolGrid.append(createHomeCard(tool, messages));
    });

    const freeCount = tools.filter((tool) => !getStatusMeta(tool.status).isPro).length;
    const freeFeature = document.getElementById('free-feature-count');
    if (freeFeature) {
      freeFeature.textContent = `${freeCount} tools`;
    }
  };

  const applyToolPage = (toolsById) => {
    const toolId = document.body?.dataset?.toolId;
    if (!toolId) {
      return;
    }

    const tool = toolsById.get(toolId);
    if (!tool) {
      return;
    }

    const statusMeta = getStatusMeta(tool.status);
    applyBadge(document.querySelector('[data-tool-plan-badge]'), tool.status);

    const title = document.querySelector('[data-tool-title]');
    if (title) {
      title.textContent = `${tool.name} — ${statusMeta.label}`;
    }

    const description = document.querySelector('[data-tool-description]');
    if (description) {
      description.textContent = getLocalizedDescription(tool);
    }
  };

  const init = async () => {
    const tools = await fetchToolsConfig();
    if (!Array.isArray(tools) || !tools.length) {
      return;
    }

    const toolsById = new Map(tools.map((tool) => [tool.id, tool]));

    const render = () => {
      applyHomeCards(tools);
      applyToolPage(toolsById);
    };

    render();
    document.addEventListener('ib:language-changed', render);
  };

  init();
})();
