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
    propertyType: subject.propertyType || null,
    yearBuilt: optionalNumber(subject.yearBuilt, 1),
    lotSqft: optionalNumber(subject.lotSqft),
    lat: optionalCoordinate(subject.lat),
    lon: optionalCoordinate(subject.lon)
  };
}

export function normalizeComp(comp = {}) {
  const sqft = Math.max(toFiniteNumber(comp.sqft, 0), 0);
  const soldPrice = Math.max(toFiniteNumber(comp.soldPrice, 0), 0);
  return {
    address: typeof comp.address==='string' ? comp.address.trim() : null,
    distanceMiles: optionalNumber(comp.distanceMiles),
    soldDate: typeof comp.soldDate==='string' && Number.isFinite(Date.parse(comp.soldDate)) ? comp.soldDate : null,
    soldPrice,
    beds: optionalNumber(comp.beds),
    baths: optionalNumber(comp.baths),
    source: typeof comp.source==='string' && /^https:\/\//.test(comp.source) ? comp.source : null,
    sqft,
    pricePerSqft: sqft > 0 ? soldPrice / sqft : 0
  };
}
