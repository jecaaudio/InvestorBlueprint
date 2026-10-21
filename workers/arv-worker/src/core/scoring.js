export function computeCompScore(subject, comp, options) {
  const distancePenalty = Math.min(comp.distanceMiles / Math.max(options.radiusMiles, 0.1), 2);
  const bedsPenalty = Math.abs((comp.beds || 0) - (subject.beds || 0)) / Math.max(options.bedsTolerance, 1);
  const bathsPenalty = Math.abs((comp.baths || 0) - (subject.baths || 0)) / Math.max(options.bathsTolerance, 1);
  const sqftPenalty = Math.abs((comp.sqft || 0) - (subject.sqft || 0)) / Math.max((subject.sqft || 1) * options.sqftTolerance, 1);

  const raw = 1 / (1 + distancePenalty * 1.6 + bedsPenalty * 1.1 + bathsPenalty + sqftPenalty * 1.2);
  return Number(raw.toFixed(4));
}

export function confidenceFromComps(comps) {
  // Deprecated numeric field retained for older clients; never a probability.
  return qualityFromComps(comps).qualityScore;
}

export function qualityFromComps(comps){
 const sampleSize=comps.length;
 if(!sampleSize)return {sampleSize:0,comparabilityScore:0,qualityScore:0,ppsfCv:null,status:'no_comps',statisticalConfidence:false};
 const prices=comps.map(c=>c.pricePerSqft).filter(v=>Number.isFinite(v)&&v>0);
 const mean=prices.reduce((sum,p)=>sum+p/Math.max(prices.length,1),0);
 const relativeVariance=mean>0?prices.reduce((sum,p)=>sum+(p/mean-1)**2/Math.max(prices.length,1),0):null;
 const cv=relativeVariance===null?null:Math.sqrt(relativeVariance);
 const average=comps.reduce((sum,c)=>sum+Math.min(1,Math.max(0,Number(c.score)||0)),0)/sampleSize;
 const comparabilityScore=Math.round(average*100);
 const qualityScore=cv===null?0:Math.min(98,Math.round(comparabilityScore*Math.min(sampleSize/5,1)*Math.exp(-2.5*cv)));
 return {sampleSize,comparabilityScore,qualityScore,ppsfCv:cv===null?null:Number(cv.toFixed(4)),status:sampleSize<3?'insufficient_comps':cv===null||cv>.2?'high_dispersion':'screening_only',statisticalConfidence:false};
}
