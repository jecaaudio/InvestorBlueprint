import { normalizeComp } from "./normalize.js";
import { computeCompScore } from "./scoring.js";

const median=values=>{const sorted=[...values].sort((a,b)=>a-b),n=sorted.length;return n%2?sorted[(n-1)/2]:(sorted[n/2-1]+sorted[n/2])/2;};

export function selectComparableSales(subject, rawComps, options, asOf = new Date()) {
  if(!(subject.sqft>0)||!subject.propertyType||!Array.isArray(rawComps))return {comps:[],excludedOutliers:0};
  const latest=new Date(asOf);
  const earliest=new Date(latest);
  earliest.setUTCMonth(earliest.getUTCMonth()-options.soldWithinMonths);
  const addressKey=value=>(value||'').trim().replace(/\s+/g,' ').toLowerCase();
  const seen=new Set([addressKey(subject.address)]);
  const eligible=rawComps.filter(comp=>comp&&typeof comp==='object')
    .map((comp) => normalizeComp(comp))
    .filter((comp) => comp.soldPrice > 0 && comp.sqft > 0 && comp.address && comp.propertyType===subject.propertyType &&
      comp.distanceMiles!==null && comp.distanceMiles<=options.radiusMiles &&
      comp.soldDate!==null && new Date(comp.soldDate)>=earliest && new Date(comp.soldDate)<=latest &&
      Math.abs(comp.sqft-subject.sqft)/subject.sqft<=options.sqftTolerance &&
      (subject.beds===null || (comp.beds!==null && Math.abs(comp.beds-subject.beds)<=options.bedsTolerance)) &&
      (subject.baths===null || (comp.baths!==null && Math.abs(comp.baths-subject.baths)<=options.bathsTolerance)))
    .filter(comp=>{const key=addressKey(comp.address);if(seen.has(key))return false;seen.add(key);return true});
  // With fewer than four sales, disclose dispersion rather than guessing which sale is wrong.
  let screened=eligible;
  if(eligible.length>=4){
    const logs=eligible.map(c=>Math.log(c.pricePerSqft)),center=median(logs);
    const mad=median(logs.map(v=>Math.abs(v-center)));
    const threshold=Math.max(3*1.4826*mad,Math.log(1.5));
    screened=eligible.filter((_,i)=>Math.abs(logs[i]-center)<=threshold);
  }
  const comps=screened
    .map((comp) => ({
      ...comp,
      score: computeCompScore(subject, comp, options)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, options.maxComps);
  return {comps,excludedOutliers:eligible.length-screened.length};
}

export function rankAndFilterComps(...args){return selectComparableSales(...args).comps;}
