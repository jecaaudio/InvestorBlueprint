import test from "node:test";
import assert from "node:assert/strict";
import { normalizeOptions, normalizeSubject, normalizeComp } from "../src/core/normalize.js";
import { computeCompScore, confidenceFromComps } from "../src/core/scoring.js";
import { rankAndFilterComps } from "../src/core/comps.js";
import { calculateArv } from "../src/core/arv.js";

test("normalizeSubject fills sane defaults and falls back to the given address", () => {
  const subject = normalizeSubject({}, "123 Main St");
  assert.equal(subject.address, "123 Main St");
  assert.equal(subject.beds, 3);
  assert.equal(subject.sqft, 1600);
});

test("normalizeComp discards invalid sqft/price by zeroing them out", () => {
  const comp = normalizeComp({ soldPrice: -10, sqft: 0 });
  assert.equal(comp.soldPrice, 0);
  assert.equal(comp.sqft, 0);
  assert.equal(comp.pricePerSqft, 0);
});

test("computeCompScore scores an identical comp near 1", () => {
  const options = normalizeOptions({});
  const subject = normalizeSubject({ beds: 3, baths: 2, sqft: 1600 }, "subject");
  const comp = normalizeComp({ beds: 3, baths: 2, sqft: 1600, distanceMiles: 0, soldPrice: 300000 });
  const score = computeCompScore(subject, comp, options);
  assert.ok(score > 0.9, `expected near-perfect match to score high, got ${score}`);
});

test("computeCompScore penalizes distant/mismatched comps", () => {
  const options = normalizeOptions({});
  const subject = normalizeSubject({ beds: 3, baths: 2, sqft: 1600 }, "subject");
  const farComp = normalizeComp({ beds: 5, baths: 4, sqft: 3200, distanceMiles: 10, soldPrice: 600000 });
  const score = computeCompScore(subject, farComp, options);
  assert.ok(score < 0.3, `expected mismatched comp to score low, got ${score}`);
});

test("confidenceFromComps is 0 with no comps and clamped between 20 and 98 otherwise", () => {
  assert.equal(confidenceFromComps([]), 0);
  const confidence = confidenceFromComps([{ score: 1 }, { score: 1 }]);
  assert.ok(confidence >= 20 && confidence <= 98);
});

test("rankAndFilterComps drops invalid comps, ranks by score, and caps to maxComps", () => {
  const options = normalizeOptions({ maxComps: 1 });
  const subject = normalizeSubject({ beds: 3, baths: 2, sqft: 1600 }, "subject");
  const comps = rankAndFilterComps(subject, [
    { soldPrice: 0, sqft: 1600 }, // invalid: no price
    { soldPrice: 300000, sqft: 1600, beds: 3, baths: 2, distanceMiles: 0 }, // best match
    { soldPrice: 250000, sqft: 900, beds: 1, baths: 1, distanceMiles: 8 } // worse match
  ], options);

  assert.equal(comps.length, 1);
  assert.equal(comps[0].soldPrice, 300000);
});

test("calculateArv returns zeroed result when there are no comps", () => {
  const arv = calculateArv({ sqft: 1600 }, []);
  assert.deepEqual(arv, {
    estimate: 0,
    low: 0,
    high: 0,
    method: "weighted_ppsf",
    ppsfWeighted: 0,
    confidence: 0
  });
});

test("calculateArv weights the estimate by comp score and brackets low/high around it", () => {
  const subject = { sqft: 1600 };
  const comps = [
    { score: 1, pricePerSqft: 200 },
    { score: 0.5, pricePerSqft: 150 }
  ];
  const arv = calculateArv(subject, comps);

  assert.ok(arv.estimate > 0);
  assert.ok(arv.low < arv.estimate);
  assert.ok(arv.high > arv.estimate);
  assert.equal(arv.method, "weighted_ppsf");
});
