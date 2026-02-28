(function () {
  const TOOL_CONFIG_PATHS = ['/InvestorBlueprint/assets/config/tools.json', 'assets/config/tools.json', '../assets/config/tools.json', '../../assets/config/tools.json'];

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

  const normalizePlan = (plan) => (String(plan || '').toLowerCase() === 'free' ? 'free' : 'pro');

  const applyBadge = (badgeNode, plan) => {
    if (!badgeNode) {
      return;
    }

    const normalizedPlan = normalizePlan(plan);
    badgeNode.textContent = normalizedPlan.toUpperCase();
    badgeNode.classList.remove('free', 'pro');
    badgeNode.classList.add(normalizedPlan);
  };

  const applyHomeCards = (toolsById) => {
    document.querySelectorAll('[data-tool-id]').forEach((card) => {
      const toolId = card.dataset.toolId;
      const tool = toolsById.get(toolId);
      if (!tool) {
        return;
      }

      const plan = normalizePlan(tool.plan);
      applyBadge(card.querySelector('[data-tool-plan-badge]'), plan);

      const link = card.querySelector('a.card-btn');
      if (link) {
        const isPro = plan === 'pro';
        if (isPro) {
          link.setAttribute('data-pro-tool', 'true');
        } else {
          link.removeAttribute('data-pro-tool');
        }
      }
    });

    const freeCount = Array.from(toolsById.values()).filter((tool) => normalizePlan(tool.plan) === 'free').length;
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

    const plan = normalizePlan(tool.plan);
    applyBadge(document.querySelector('[data-tool-plan-badge]'), plan);

    const title = document.querySelector('[data-tool-title]');
    if (title) {
      const cleanName = tool.name || title.textContent;
      title.textContent = `${cleanName} — ${plan.toUpperCase()}`;
    }
  };

  const init = async () => {
    const tools = await fetchToolsConfig();
    if (!Array.isArray(tools) || !tools.length) {
      return;
    }

    const toolsById = new Map(tools.map((tool) => [tool.id, tool]));
    applyHomeCards(toolsById);
    applyToolPage(toolsById);
  };

  init();
})();
