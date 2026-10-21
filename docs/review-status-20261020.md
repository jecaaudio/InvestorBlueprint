# Current review status — 20 October 2026

Tracker #88; aggregate #95 remains draft. #100 pins application candidate
`b38ab233b6e0fc409006bd0d008a2be1a549fcbe` at `review-b38ab23/`.
The aggregate includes current main preview infrastructure; its application
assets are identical to this pinned, tested candidate.

## Implemented and verified

- Shared Flip engine, rental debt service/reserves, partial lender draws,
  manual ARV adjustments, and detailed/summary bilingual reports retain the
  prior financial reconciliation and privacy fixes.
- Seller review function v5 rejects invalid debt/tax text, clears stale outputs,
  blocks PDF/CSV and native print, and preserves the last valid saved scenario.
  Illinois retained mortgage tax basis and cash allocation remain corrected.
- Miami-Dade single residential condo units are distinct from multifamily.
  The ambiguous saved legacy type requires confirmation. A $200,000 unit has
  $1,200 documentary tax; confirmed multifamily has $2,100.
- ROI filters/sorts/maps one explicit metric and shows both cap rate and
  cash-on-cash return. Empty matches show N/A. Inventory remains simulated.
- ARV requires compatible property types, screens strong PPSF outliers,
  penalizes small/dispersed samples, and discloses observed ranges rather than
  statistical confidence. Storage and stale-response regressions pass.
- Native Seller PDFs hide editor controls and translate property type using the
  document language. Thirteen synthetic PDFs were generated: eight finance/ARV,
  four Seller variants, and one blocked report. Seller detailed fixtures have
  two pages, summaries one. Text checks and visual inspection passed; the
  blocked report contains no stale net proceeds.
- Local evidence: 96 public regressions, 18 ARV worker tests, eight actual
  private-page checks, and 28 Seller assertions. Actual-source checks are kept
  private; no protected calculator HTML is committed to this public repository.
- Exact application candidate checks: Quality 39501344103, member/profile
  39501344158, ARV Worker 39501344123, property safety 39501344121, all successful.
  Quality includes native Chromium PDF, accessibility, Lighthouse and WebKit.
- Review v5 exact source readback matches; JWT, confirmed email and approved
  member guards are preserved. Missing/forged credentials return 401 for Flip
  and Seller. Private backup version 3 preserves production v2, review v4 and
  validated review v5 without credentials or member records.

## Current limitations and remaining release checks

- The browser session for this follow-up is signed out. The earlier owner
  session verified all eight tools and saved/restored profile preferences on
  the earlier candidate; those observations are historical, not a current
  authenticated UI check of the new candidate.
- Repeat signed-in UI checks at the refreshed immutable path. Physical iPhone
  Safari/home-screen icons and actual Seller PDF pagination remain unverified.
  Synthetic Chromium and WebKit do not certify physical-device behavior.
- Real second-account/relogin isolation and confirmation/recovery email delivery
  need a real second identity/recipient. No account, password reset or recipient
  was invented; no owner suspension or role change was performed.
- Real provider key, licensed closed-sale data, retention rights and billing
  allowance remain external. Provider SQL is unapplied, live flags are off,
  ATTOM remains a stub and no paid calls or Zillow application were submitted.

Production root business assets and protected function v2 remain unchanged.
Do not represent live ARV as available or mark #88 fully complete. The refreshed
preview is isolated and authenticated; keep the remaining release checks visible
before publishing the aggregate and private Seller source to production.
