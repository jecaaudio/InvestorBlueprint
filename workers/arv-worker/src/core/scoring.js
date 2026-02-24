export function computeCompScore(subject, comp, options) {
  const distancePenalty = Math.min(comp.distanceMiles / Math.max(options.radiusMiles, 0.1), 2);
  const bedsPenalty = Math.abs((comp.beds || 0) - (subject.beds || 0)) / Math.max(options.bedsTolerance, 1);
  const bathsPenalty = Math.abs((comp.baths || 0) - (subject.baths || 0)) / Math.max(options.bathsTolerance, 1);
  const sqftPenalty = Math.abs((comp.sqft || 0) - (subject.sqft || 0)) / Math.max((subject.sqft || 1) * options.sqftTolerance, 1);

  const raw = 1 / (1 + distancePenalty * 1.6 + bedsPenalty * 1.1 + bathsPenalty + sqftPenalty * 1.2);
  return Number(raw.toFixed(4));
}

export function confidenceFromComps(comps) {
  if (!comps.length) return 0;
  const avgScore = comps.reduce((sum, comp) => sum + comp.score, 0) / comps.length;
  return Math.max(20, Math.min(98, Math.round(avgScore * 100)));
}
