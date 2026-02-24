export function normalizeOptions(options = {}) {
  return {
    radiusMiles: Number(options.radiusMiles ?? 1.5),
    soldWithinMonths: Number(options.soldWithinMonths ?? 12),
    maxComps: Number(options.maxComps ?? 8),
    sqftTolerance: Number(options.sqftTolerance ?? 0.25),
    bedsTolerance: Number(options.bedsTolerance ?? 1),
    bathsTolerance: Number(options.bathsTolerance ?? 1)
  };
}

export function normalizeSubject(subject = {}, fallbackAddress = "") {
  return {
    address: subject.address || fallbackAddress,
    beds: Number(subject.beds ?? 3),
    baths: Number(subject.baths ?? 2),
    sqft: Number(subject.sqft ?? 1600),
    propertyType: subject.propertyType || "Single Family",
    yearBuilt: Number(subject.yearBuilt ?? 1988),
    lotSqft: Number(subject.lotSqft ?? 6500),
    lat: subject.lat ?? null,
    lon: subject.lon ?? null
  };
}

export function normalizeComp(comp = {}) {
  const sqft = Number(comp.sqft || 0);
  const soldPrice = Number(comp.soldPrice || 0);
  return {
    address: comp.address || "Unknown",
    distanceMiles: Number(comp.distanceMiles || 0),
    soldDate: comp.soldDate || new Date().toISOString().slice(0, 10),
    soldPrice,
    beds: Number(comp.beds || 0),
    baths: Number(comp.baths || 0),
    sqft,
    pricePerSqft: sqft > 0 ? soldPrice / sqft : 0
  };
}
