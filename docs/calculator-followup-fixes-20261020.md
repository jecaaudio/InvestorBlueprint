# Calculator follow-up fixes — 20 October 2026

These changes address faults reproduced after the prior eight-tool review. They
are a candidate update, not evidence of production publication or live property data.

## Seller Net

- Strict nonnegative currency parsing accepts explicit US/Spanish monetary formats.
  Invalid debt or tax text remains visible, marks the field and leaves net pending;
  it cannot silently become zero, overwrite the last valid saved scenario, or export
  a stale PDF/CSV. Browser print also receives a blocked notice.
- One residential condo/cooperative unit is distinct from multifamily. A $200,000
  Miami-Dade residential unit has $1,200 documentary tax; confirmed multifamily has
  $2,100. The ambiguous old saved `condo` selection requires explicit confirmation.
  Florida Statutes 201.031 is linked in the private page patch.
- The private source is patched using `prepare-seller-validation.mjs`, after the
  existing retained-mortgage correction. Never commit private calculator HTML.

## ROI Search

- Filtering, sorting and heatmap use the selected metric: cash-on-cash return
  (default) or cap rate. Both appear in the table. The previous maximum of two
  incompatible metrics is removed. Empty results show N/A, not an invented zero.
- Reports include the selected metric in the document language. Inventory remains
  explicitly simulated; selecting a metric does not make it a live property feed.

## Automated ARV

- Comparable and subject property types must be recognized and compatible.
- With at least four eligible sales, a log-price-per-square-foot median/MAD screen
  excludes strong outliers before the result cap. The excluded count is disclosed.
  The threshold is max(3 × 1.4826 × MAD, log(1.5)); this is a screening heuristic.
- Range uses observed comparable min/max price per square foot times subject area.
  It is not a statistical confidence interval. Screening quality penalizes small
  samples and price dispersion; fewer than three sales and CV above 20% warn users.
  The legacy API `confidence` field is deprecated and omitted from exported JSON.
- Invalid responses cannot become reports; blocked storage permits temporary HTTPS
  configuration; older failed requests cannot replace newer successful results.
- The provider remains a disabled/stub integration. No billable call, new provider
  account, live-sale certification or licensing claim is introduced.

## Verification

Run the explicit Quality workflow test lists, all worker tests and the authorized
actual-source tests (`IB_PRIVATE_PAGES=... node --test scripts/private-page-dom.test.mjs`).
Native Chromium adds four Seller language/detail PDFs and an invalid-input blocked
PDF to the existing eight fixtures. CI also checks accessibility and mobile WebKit.
Native synthetic PDFs do not certify a physical iPhone or a real second account.
