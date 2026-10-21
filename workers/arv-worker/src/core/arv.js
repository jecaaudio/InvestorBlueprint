import { qualityFromComps } from "./scoring.js";

export function calculateArv(subject, comps) {
  if (!comps.length) {
    return {
      estimate: 0,
      low: 0,
      high: 0,
      method: "weighted_ppsf",
      ppsfWeighted: 0,
      confidence: 0,
      quality: qualityFromComps([]),
      rangeType:'observed_comparable_ppsf'
    };
  }

  if(!(subject.sqft>0)||!Number.isFinite(subject.sqft)||comps.some(c=>!(c.pricePerSqft>0)||!Number.isFinite(c.pricePerSqft)||!Number.isFinite(c.score)))throw new RangeError('Invalid valuation inputs');

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
  const quality=qualityFromComps(comps);
  const observed=comps.map(c=>c.pricePerSqft*subject.sqft);
  if(!Number.isFinite(estimate)||observed.some(v=>!Number.isFinite(v)))throw new RangeError('Valuation exceeds numeric limits');

  return {
    estimate: Math.round(estimate),
    low: Math.round(Math.min(...observed)),
    high: Math.round(Math.max(...observed)),
    method: "weighted_ppsf",
    ppsfWeighted: Math.round(ppsfWeighted),
    confidence:quality.qualityScore,
    quality,
    rangeType:'observed_comparable_ppsf'
  };
}
