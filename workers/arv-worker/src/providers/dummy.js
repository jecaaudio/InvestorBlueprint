function seedFromAddress(address = "") {
  return [...address].reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0) || 101;
}

function jitter(seed, min, max, offset = 0) {
  const value = Math.abs(Math.sin(seed + offset)) % 1;
  return min + value * (max - min);
}

export async function getSubject(address) {
  const seed = seedFromAddress(address);
  const sqft = Math.round(jitter(seed, 1250, 2550, 1));
  const beds = Math.round(jitter(seed, 2.5, 5, 2));
  const baths = Number(jitter(seed, 1.5, 3.5, 3).toFixed(1));

  return {
    address,
    beds,
    baths,
    sqft,
    propertyType: "Single Family",
    yearBuilt: Math.round(jitter(seed, 1968, 2020, 4)),
    lotSqft: Math.round(sqft * jitter(seed, 2.8, 4.7, 5))
  };
}

export async function getSoldComps(subject, options) {
  const seed = seedFromAddress(subject.address);
  const now = Date.now();

  return Array.from({ length: Math.max(options.maxComps + 2, 6) }).map((_, index) => {
    const localSeed = seed + index * 17;
    const sqft = Math.round(subject.sqft * jitter(localSeed, 0.82, 1.18, 1));
    const ppsf = jitter(localSeed, 155, 325, 2);
    const soldPrice = Math.round(ppsf * sqft);
    const soldDaysAgo = Math.round(jitter(localSeed, 8, options.soldWithinMonths * 30, 3));

    return {
      address: `${100 + index * 7} ${subject.address.split(" ").slice(1).join(" ") || "Comparable Rd"}`,
      distanceMiles: Number(jitter(localSeed, 0.15, Math.max(options.radiusMiles * 1.2, 0.8), 4).toFixed(2)),
      soldDate: new Date(now - soldDaysAgo * 24 * 3600 * 1000).toISOString().slice(0, 10),
      soldPrice,
      beds: Math.max(1, Math.round(subject.beds + jitter(localSeed, -1, 1, 5))),
      baths: Number(Math.max(1, subject.baths + jitter(localSeed, -0.8, 0.8, 6)).toFixed(1)),
      sqft
    };
  });
}
