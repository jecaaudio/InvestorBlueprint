function toFiniteNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalCoordinate(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalNumber(value, minimum = 0) {
  const parsed=optionalCoordinate(value);
  return parsed !== null && parsed >= minimum ? parsed : null;
}

export function normalizePropertyType(value){
 if(typeof value!=='string')return null;
 const key=value.toLowerCase().replace(/[^a-z0-9]/g,'');
 const aliases={singlefamily:'single_family',singlefamilyresidential:'single_family',sfr:'single_family',detached:'single_family',condo:'condo',condominium:'condo',townhouse:'townhouse',townhome:'townhouse',duplex:'duplex',triplex:'triplex',fourplex:'fourplex',multifamily:'multifamily',multifamiliar:'multifamily',commercial:'commercial',land:'land'};
 return aliases[key]||null;
}

export function normalizeOptions(options = {}) {
  return {
    radiusMiles: Math.min(50, Math.max(toFiniteNumber(options.radiusMiles, 1.5), 0.1)),
    soldWithinMonths: Math.min(60, Math.max(toFiniteNumber(options.soldWithinMonths, 12), 1)),
    maxComps: Math.min(25, Math.max(Math.floor(toFiniteNumber(options.maxComps, 8)), 1)),
    sqftTolerance: Math.max(toFiniteNumber(options.sqftTolerance, 0.25), 0.01),
    bedsTolerance: Math.max(toFiniteNumber(options.bedsTolerance, 1), 0.1),
    bathsTolerance: Math.max(toFiniteNumber(options.bathsTolerance, 1), 0.1)
  };
}

export function normalizeSubject(subject = {}, fallbackAddress = "") {
  return {
    address: subject.address || fallbackAddress,
    beds: optionalNumber(subject.beds),
    baths: optionalNumber(subject.baths),
    sqft: optionalNumber(subject.sqft, 1),
    propertyType: normalizePropertyType(subject.propertyType),
    yearBuilt: optionalNumber(subject.yearBuilt, 1),
    lotSqft: optionalNumber(subject.lotSqft),
    lat: optionalCoordinate(subject.lat),
    lon: optionalCoordinate(subject.lon)
  };
}

export function normalizeComp(comp = {}) {
  const sqft = Math.max(toFiniteNumber(comp.sqft, 0), 0);
  const rawPrice=toFiniteNumber(comp.soldPrice,0);
  const soldPrice=rawPrice>=0&&rawPrice<=Number.MAX_SAFE_INTEGER/100?rawPrice:0;
  return {
    address: typeof comp.address==='string' ? comp.address.trim() : null,
    distanceMiles: optionalNumber(comp.distanceMiles),
    soldDate: typeof comp.soldDate==='string' && Number.isFinite(Date.parse(comp.soldDate)) ? comp.soldDate : null,
    soldPrice,
    beds: optionalNumber(comp.beds),
    baths: optionalNumber(comp.baths),
    propertyType: normalizePropertyType(comp.propertyType),
    source: typeof comp.source==='string' && /^https:\/\//.test(comp.source) ? comp.source : null,
    sqft,
    pricePerSqft: sqft > 0 ? soldPrice / sqft : 0
  };
}
