# Current review status — 20 October 2026

Tracker #88; aggregate #95 remains a draft and is not published at the production root.
The immutable review path is `review-a93ebd9/`; #99 pins application candidate a93ebd940ddd8937b45256a1e5c864109d9b50af behind `ib-review-tools` with JWT verification and the same confirmed-email/approved-member checks as production.

## Verified

- Real owner session signed in, approved admin. Saved all six profile preferences, reloaded to verify persistence, then restored all original values. Admin shows the one owner; pending filter shows none. No role or account changes.
- All eight review tools opened through the actual guarded server with the owner session. Flip profit $27,600 and equity ROI 16.3%; rental cash flow $570 after $900 debt service and $100 reserve; hard-money partial draws cost $9,450; manual ARV and rent examples reconcile; ROI inventory and Automated ARV remain explicitly simulated.
- Native owner browser exposed report initialization before the dynamic Flip engine. Explicit renderer-completion notification replaces submit-listener microtasks; reversed-order DOM and native-browser regression cover readiness and stale report clearing.
- Seller review function version 4 corrects retained mortgage tax basis and cash proceeds. Retained debt first offsets additional assumed consideration; the remainder reduces cash received from entered price. It is separate from payoffs. The UI, CSV and PDF disclose the allocation. Excess retained consideration leaves net pending even with a tax override. Original production protected function remains version 2, unchanged.
- Actual Seller source passes 14 original scenarios and 14 retained-debt assertions; seven actual-source DOM cases pass. Owner Seller test fields and location were restored after review.
- Candidate 3bfec6b passed all four exact-head workflows: Quality 39486542878 (including the native reversed-listener PDF regression and mobile WebKit), profile 39486542777, ARV Worker 39486542817, property-data safety 39486542806.
- Eight corrected bilingual native PDF fixtures were previously inspected visually and for pagination; regenerated fixtures exist on b8c87d7. This is synthetic evidence, separate from an actual Seller PDF exported on a physical device.
- Missing/forged credentials are denied; owner-only DB migration is applied. Provider SQL and billing protection tests pass, but provider migration is intentionally unapplied and live flags remain off.

## Latest report closure evidence

- Real owner clicked the enabled Flip PDF button at the immutable 3bfec6b path and generated the report DOM. A real saved document-language change produced an English summary while the interface remained Spanish; all six original preferences were restored and save confirmation observed.
- That review exposed legacy Flip report labels without dictionary keys. Candidate a93ebd9 adds explicit translated input/title/equity keys, excludes hidden plan/disabled reference controls, and explains selected funding schedules in both languages. Actual legacy-adapter DOM verifies English-screen/Spanish-document export.
- a93ebd9 passed exact-head Quality 39487778319, profile 39487778672, ARV Worker 39487778665 and property-data safety 39487778307. #99 updates only preview infrastructure; production root business code remains unchanged.
- Review v4 returns to the stable main account route. Versioned private backup preserves v4 and unchanged production v2; no credentials or user records included.

## Remaining release gates and external dependencies

- Verify refreshed immutable live preview and enabled Flip export; current integration retains the same business assets and adds only latest main deployment infrastructure and status documentation.
- Physical iPhone Safari/home-screen icons and actual Seller PDF pagination. WebKit emulation is useful evidence and does not certify physical device behavior.
- Real second-account/relogin isolation and confirmation/recovery email delivery. Only the existing owner was used; no second identity or email recipient was invented, password reset, owner suspension, or sign-out that would lose the review session performed.
- Data-provider dedicated key, licensing/retention rights, actual billing allowance and billing dates; Zillow owner company/contact/terms are external. No provider calls, paid plans, submitted Zillow request or closed-sale feed certification.

The production root keeps existing business assets. Publish #95 and the private Seller page only after remaining release gates are satisfied; do not mark #88 complete or represent live ARV as available. Root infrastructure #96/#97/#98/#99 only adds the isolated review path. Revert preview commits to remove that path; restore private review source from the saved original bundle if needed. Preserve member data and usage counters.
