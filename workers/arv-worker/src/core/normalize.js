function toFiniteNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalCoordinate(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeOptions(options = {}) {
  return {
    radiusMiles: Math.max(toFiniteNumber(options.radiusMiles, 1.5), 0.1),
    soldWithinMonths: Math.max(toFiniteNumber(options.soldWithinMonths, 12), 1),
    maxComps: Math.max(Math.floor(toFiniteNumber(options.maxComps, 8)), 1),
    sqftTolerance: Math.max(toFiniteNumber(options.sqftTolerance, 0.25), 0.01),
    bedsTolerance: Math.max(toFiniteNumber(options.bedsTolerance, 1), 0.1),
    bathsTolerance: Math.max(toFiniteNumber(options.bathsTolerance, 1), 0.1)
  };
}

export function normalizeSubject(subject = {}, fallbackAddress = "") {
  return {
    address: subject.address || fallbackAddress,
    beds: Math.max(toFiniteNumber(subject.beds, 3), 0),
    baths: Math.max(toFiniteNumber(subject.baths, 2), 0),
    sqft: Math.max(toFiniteNumber(subject.sqft, 1600), 1),
    propertyType: subject.propertyType || "Single Family",
    yearBuilt: Math.max(toFiniteNumber(subject.yearBuilt, 1988), 1800),
    lotSqft: Math.max(toFiniteNumber(subject.lotSqft, 6500), 0),
    lat: optionalCoordinate(subject.lat),
    lon: optionalCoordinate(subject.lon)
  };
}

export function normalizeComp(comp = {}) {
  const sqft = Math.max(toFiniteNumber(comp.sqft, 0), 0);
  const soldPrice = Math.max(toFiniteNumber(comp.soldPrice, 0), 0);
  return {
    address: comp.address || "Unknown",
    distanceMiles: Math.max(toFiniteNumber(comp.distanceMiles, 0), 0),
    soldDate: comp.soldDate || new Date().toISOString().slice(0, 10),
    soldPrice,
    beds: Math.max(toFiniteNumber(comp.beds, 0), 0),
    baths: Math.max(toFiniteNumber(comp.baths, 0), 0),
    sqft,
    pricePerSqft: sqft > 0 ? soldPrice / sqft : 0
  };
}
