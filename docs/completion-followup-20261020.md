# Completion follow-up — 20 October 2026

Tracking #88; extends aggregate candidate #95. This document does not certify release.

## Reproduced problems and corrections

1. **Published Flip used a different engine than the audited model.** Export of
   `ib-protected-tools` version 2 showed `fc-*` markup loading
   `assets/js/flip-calculator.js`, without `tool-form`. Prior shared-model tests did
   not validate that route. Replaced the independent legacy formula with an adapter
   that preserves its input controls and connects them to the tested shared model.
   The down-payment reference is excluded from costs; actual equity is costs less
   funded proceeds. Real-page DOM fixture now verifies profit, equity ROI and report
   readiness. No claim that old shared-model evidence certified the old live Flip.
2. **Rental cash flow omitted financing and reserves.** Added explicit monthly
   debt service excluding escrow, capital reserve, HOA, utilities, other operating
   costs, equity cash and total property cost. NOI excludes debt/reserve; cash flow
   deducts both; cap rate uses NOI/property cost; cash-on-cash uses cash flow/equity.
   Zero denominators yield N/A and full vacancy retains ongoing costs.
3. **Loan models assumed full funding at closing.** Hard Money and shared Flip
   now accept explicit month/amount draws, simple or monthly-capitalized interest
   and explicit fees. Draws cannot exceed commitment or duration. Points are on
   committed principal; equity subtracts only actually drawn proceeds. Unpaid
   monthly compounding uses whole periods and simple accrual on the final fraction.
   Lender day-count, repayment schedules and contractual charges still need lender
   validation; these conventions are explained rather than inferred.
4. **Manual ARV had no comparable adjustments.** Added signed user-entered
   adjustments and source/date/evidence notes per sale. Reject nonpositive adjusted
   prices. Display adjusted min/max as a comparable range, never a confidence
   interval. No source is certified as closed by accepting a user-entered price.
   The 70% MAO remains a labeled screening heuristic.
5. **Six tools lacked report export controls.** Added detailed/summary bilingual
   browser print / Save PDF reports with inputs, results, notes, declared source,
   calculation timestamp and simulation disclosure. Read identity/language only
   from the protected document's preference snapshot. Escape user content. Disable
   exports and erase old printable output after input changes, reset or invalid
   calculation. Copy finance-report.js in the Pages deployment allowlist.
6. **Illinois retained-mortgage basis defect.** Prepared a fail-closed patch for
   the private Seller Net HTML, adding a saved qualifying retained-mortgage input
   and subtracting it from total consideration only in Illinois. The debt must be
   included in consideration, remain on the property and be declared on the deed;
   seller payoffs are separate. An excessive retained amount leaves tax pending,
   rather than presenting a negative tax. The print report includes the basis.
   Patch script: `scripts/prepare-seller-tax.mjs`; actual private HTML is not added
   to GitHub. **This edge-function page patch remains unapplied.**
7. **Currency blur could discard cents.** Shared formatting now preserves up to
   two decimal places.

## Evidence

- 84/84 combined site, finance, privacy, deployment, provider, report and DOM tests.
- 15/15 ARV worker tests.
- 7/7 local DOM tests using actual authorized private-page exports: Flip, Rental,
  Rent, manual ARV, Hard Money, ROI Search and patched Seller Net.
- Actual Seller Net functions: original 14 scenarios plus 9 retained-mortgage
  assertions. All three private inline script blocks parse after patching.
- Patched private Seller HTML SHA-256:
  `20d3d1905129c6bef5ee9235040d844560b7602c07e5924f914d082ed93f0938`.
- Current live DB aggregate: exactly one approved admin, no other profiles.
- Live endpoint denial checks are recorded separately; no test accounts created,
  passwords changed, or private financial records mutated.

Local commands:

```bash
node --test scripts/finance-dom.test.mjs scripts/seller-tax.test.mjs
node scripts/prepare-seller-tax.mjs PRIVATE_EXPORT PRIVATE_CANDIDATE
node scripts/audit-seller-snapshot.mjs PRIVATE_CANDIDATE
IB_PRIVATE_PAGES=/private/export-directory node --test scripts/private-page-dom.test.mjs
node --test workers/arv-worker/test/*.test.js
```

The private DOM tests intentionally skip without authorized source files; CI does
not receive private HTML. Public contract-level DOM tests run in Quality with the
new exact-pinned jsdom dependency and committed lockfile. These are DOM/function
checks, **not** authenticated sessions, layout verification or physical Safari QA.
Local Chromium download returned a truncated/non-ZIP archive. Browser visual,
PDF pagination and physical iPhone gates remain open.

## Publication and external blockers

- Do not merge #95 or apply the private Seller patch until exact updated CI and
  authenticated/visual release checks pass. Earlier green CI covers the previous
  remote commit, not this follow-up.
- Initial push was rejected by automatic approval review, which described code
  disclosure to an unverified GitHub destination. Read-only connector verification
  subsequently established repository `jecaaudio/InvestorBlueprint` is public,
  owned by the connected `jecaaudio` account (251836913), with push/admin rights.
  Any reattempt must stay on the same named candidate branch and contain only
  reviewed project code; never include private-page exports or credential files.
- Owner authentication is still required for real preference/admin sessions.
  Recovery/confirmation email delivery and physical iPhone/home-screen tests are
  not replaced by mocked tests.
- Provider licensing/key/actual free billing allowance and dates remain missing.
  RentCast stays disabled, migration unapplied, no billable call made. Existing
  source matrix and Zillow request packet remain the starting point; do not claim
  a submitted application, licensed MLS access or verified closed-sale feed.

Rollback: revert follow-up commits before release or revert the aggregate release
after a gated deployment. Private Seller source is deployed separately; restore
the exported version-2 page bundle if that later deployment needs rollback. Keep
member preferences and provider consumption counters intact.

## Subsequent print/auth closure attempt

Added Automated ARV print/Save PDF in both report languages and detail levels,
with company metadata, escaped analyst notes and explicit DEMO disclosure. Input
changes clear the previously printable report; older in-flight responses cannot
replace the current address's results. Four new DOM tests cover language/depth,
identity isolation, notes escaping and stale report invalidation. Quality now
includes native Chromium PDF/screenshot fixtures for the shared report renderer
and Automated ARV. Synthetic previews contain no real account data.

The renewed secure browser-auth request timed out; a fresh account-page check
showed sign-in still required. Do not treat the request as successful or as a
user refusal. Do not reset credentials or fabricate a session. Native isolated
Chromium can launch locally but crashes on page navigation in this host; the
new native print fixtures run in GitHub Actions. Their results/artifacts must be
reviewed before checking off visual/PDF gates. Physical iPhone and real-session
checks remain pending. This follow-up does not authorize merging around them.
