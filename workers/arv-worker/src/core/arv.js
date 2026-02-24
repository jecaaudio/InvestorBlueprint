import { confidenceFromComps } from "./scoring.js";

export function calculateArv(subject, comps) {
  if (!comps.length) {
    return {
      estimate: 0,
      low: 0,
      high: 0,
      method: "weighted_ppsf",
      ppsfWeighted: 0,
      confidence: 0
    };
  }

  const weighted = comps.reduce(
    (acc, comp) => {
      const weight = Math.max(comp.score, 0.01);
      acc.weight += weight;
      acc.ppsf += comp.pricePerSqft * weight;
      return acc;
    },
    { weight: 0, ppsf: 0 }
  );

  const ppsfWeighted = weighted.weight > 0 ? weighted.ppsf / weighted.weight : 0;
  const estimate = ppsfWeighted * subject.sqft;
  const confidence = confidenceFromComps(comps);
  const spread = Math.max(0.04, (100 - confidence) / 250);

  return {
    estimate: Math.round(estimate),
    low: Math.round(estimate * (1 - spread)),
    high: Math.round(estimate * (1 + spread)),
    method: "weighted_ppsf",
    ppsfWeighted: Math.round(ppsfWeighted),
    confidence
  };
}
