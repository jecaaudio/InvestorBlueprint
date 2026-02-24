import { normalizeComp } from "./normalize.js";
import { computeCompScore } from "./scoring.js";

export function rankAndFilterComps(subject, rawComps, options) {
  return rawComps
    .map((comp) => normalizeComp(comp))
    .filter((comp) => comp.soldPrice > 0 && comp.sqft > 0)
    .map((comp) => ({
      ...comp,
      score: computeCompScore(subject, comp, options)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, options.maxComps);
}
