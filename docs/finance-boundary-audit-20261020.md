# Finance boundary audit — 20 October 2026

Tracking #88. This is evidence for specific models, not whole-project certification.

## Corrections

The shared parser silently turned malformed strings into zero or stripped letters
into a different number. Pure models accepted missing/NaN/infinite/negative values;
an empty comparable set produced NaN. Zero occupancy returned a suggested rent of
zero although no finite asking rent could meet a positive yield at zero occupancy.
Flip's validation ignored the result of native reportValidity().

Preserve valid USD cents/grouping, reject malformed numbers, enforce finite input
and model ranges, detect numeric overflow, preserve negative *results* such as losses
and infeasible MAO, and show unavailable rent as N/A. Invalid calculation errors clear
old result cards and show a bilingual validation message. Currency focus/blur no
longer converts malformed input to a seemingly valid $0.

## Evidence and remaining scope

| Calculator | Evidence | Still open |
|---|---|---|
| Flip | Existing seven finance fixtures plus zero deal, invalid/overflow input, losses and hypothetical user-entered profit tax | Lender draw schedules/compound interest, real closing statements, authenticated UI/export |
| Rental Cash Flow | Vacancy-adjusted monthly/yearly example and 100% vacancy with ongoing costs | Mortgage debt service and reserves are explicitly excluded by current simplified model; complete model requires adding explicit fields |
| Rent Calculator | Gross-yield/occupancy example; zero occupancy is indeterminate rent, not $0 | Net-yield goal is a different calculation; no invented market rent |
| ARV Estimator | Three-user-comp average, missing/invalid comps rejected, infeasible MAO remains negative | Date/condition/size/location adjustments not implemented; 70% MAO is only a labeled screening heuristic |
| Hard Money | Simple interest + points, zero duration includes upfront points only, negative duration rejected | Actual draw timing, compounding and lender-specific fees |
| ROI Search | Simulated inventory remains disclosed; return input validated | No licensed live inventory; cannot certify simulated rows as investment opportunities |
| Automated ARV | Separate PR #91 corrects seven provenance/filter defects, 15 worker tests + UI demo tests | Live licensed closed sales and condition/rehab valuation/calibration remain blocked |
| Seller Net | Actual live protected function snapshot audited by audit-seller-snapshot.mjs | Tax basis, local charges/exemptions and payoffs require transaction-specific verification; browser/PDF gates remain |

Site Node suite: 48/48 passed, including eight new finance boundary tests and the
deployment gate's six tests. Seller snapshot: 14 scenarios passed; SHA-256
`a776ed12680a000be494890ca3ec661559e1609ad78244cc4244467c693a4c7a`.
No rates, tax brackets, financing quotes or market values were invented.

## Seller snapshot reproduction

Export `pages/seller-net.ts` from Supabase `ib-protected-tools` version 2, decode its
JSON string to HTML, then run `node scripts/audit-seller-snapshot.mjs <html-path>`.
The script extracts and executes actual getTransfer/calc function bodies in a minimal
fixture; it does not copy their formulas into a replacement model.

Checks include ordinary KY proceeds, optional second mortgage, cash-owned property,
negative proceeds, zero sale, tax-unit rounding, manual override/share, exemption,
unknown jurisdiction pending, Florida/Miami single vs other property, Texas and Illinois.
These are arithmetic fixtures, not verification of every exemption or local tax.

Primary rules consulted: Kentucky KRS 142.050 (official legislative PDF), Florida
Department of Revenue documentary stamp rules, Texas Constitution art. VIII §29.
Illinois IDOR's official realestate.html page was subsequently retrieved. It states
that retained mortgages may reduce taxable basis to equity when declared on the deed;
county/municipal taxes may apply. The current generic `price + assumed debt` calculation
does not model that Illinois-specific basis. **This remains an identified Seller Net
defect requiring an explicit taxable-basis model or manual override and transaction
validation; Illinois is not financially certified by the nominal-price fixture.**
The detailed statute endpoint returned 502. No guessed legal change was deployed.

Official references:
- https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=43160
- https://floridarevenue.com/taxes/taxesfees/Pages/doc_stamp.aspx
- https://statutes.capitol.texas.gov/Docs/CN/htm/CN.8.htm#8.29
- https://tax.illinois.gov/research/taxinformation/property/realestate.html

Rollback is reverting code; no database/data changes. Keep isolated pending exact
Actions and authenticated UI review; no whole-calculator completion claims.
