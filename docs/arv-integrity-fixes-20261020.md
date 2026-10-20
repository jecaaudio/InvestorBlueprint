# ARV data integrity corrections — 20 October 2026

Tracking #88. Separate candidate; no live valuation provider is configured.

## Reproduced defects

Seven new regression tests initially failed on main:

1. Missing property facts were invented as 3 bedrooms, 2 bathrooms, 1600 sqft,
   year 1988 and lot 6500 sqft.
2. Missing comparable sale date became today's date; missing distance became zero.
3. Radius, sale-date, area, bed and bath limits only affected ranking, not eligibility.
4. Duplicate properties and the subject itself could enter the sample.
5. DUMMY worker responses were not explicitly demo-tagged; normal Calculate could
   display/export simulated data without the local demo button's disclosure.
6. Unknown provider configuration silently fell back to DUMMY.
7. Nonstring addresses threw an unstructured exception; invalid options were accepted.

## Corrections

- Keep missing subject facts, dates and distances null.
- Require usable area, real date/distance and requested comparison limits; deduplicate
  addresses and exclude the subject. Return structured 422 when no comps qualify.
- Mark all DUMMY responses demonstration data; UI and report state honor backend
  provenance even through the normal calculation button.
- Explicit unsupported-provider/input errors; cap request-driven comp/radius/time limits.
- Disclose confidence and range as heuristics, not calibrated statistical claims.

## Evidence

Worker suite: 15/15 passed after fixes. Site suite: existing 34/34 passed; additional
UI provenance tests verify that worker demo flags and DUMMY provider always display
the demo disclosure. No provider network calls or real property transactions used.

## Release boundary and rollback

Keep candidate isolated until exact-commit Actions, authenticated browser rendering
and export review pass. No Cloudflare deployment or upstream account created.
Rollback code by reverting this candidate commit; no database/data migration involved.

Remaining: actual licensed closed-sale provider, source references, condition/rehab
adjustments and calibration, plus full numeric/UI audit of the other seven calculators.
The simplified weighted PPSF estimate is not a certified appraisal or validated ARV.
