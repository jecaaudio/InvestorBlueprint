import { normalizeComp } from "./normalize.js";
import { computeCompScore } from "./scoring.js";

export function rankAndFilterComps(subject, rawComps, options, asOf = new Date()) {
  if(!(subject.sqft>0)||!Array.isArray(rawComps))return [];
  const latest=new Date(asOf);
  const earliest=new Date(latest);
  earliest.setUTCMonth(earliest.getUTCMonth()-options.soldWithinMonths);
  const addressKey=value=>(value||'').trim().replace(/\s+/g,' ').toLowerCase();
  const seen=new Set([addressKey(subject.address)]);
  return rawComps.filter(comp=>comp&&typeof comp==='object')
    .map((comp) => normalizeComp(comp))
    .filter((comp) => comp.soldPrice > 0 && comp.sqft > 0 && comp.address &&
      comp.distanceMiles!==null && comp.distanceMiles<=options.radiusMiles &&
      comp.soldDate!==null && new Date(comp.soldDate)>=earliest && new Date(comp.soldDate)<=latest &&
      Math.abs(comp.sqft-subject.sqft)/subject.sqft<=options.sqftTolerance &&
      (subject.beds===null || (comp.beds!==null && Math.abs(comp.beds-subject.beds)<=options.bedsTolerance)) &&
      (subject.baths===null || (comp.baths!==null && Math.abs(comp.baths-subject.baths)<=options.bathsTolerance)))
    .filter(comp=>{const key=addressKey(comp.address);if(seen.has(key))return false;seen.add(key);return true})
    .map((comp) => ({
      ...comp,
      score: computeCompScore(subject, comp, options)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, options.maxComps);
}
