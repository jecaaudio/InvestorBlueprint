# Current review status — 20 October 2026

Tracker #88; aggregate #95 remains a draft and is not published at the production root.
The immutable review path is `review-291a788/`; #97 pins application candidate b8c87d722edbcfc38f159df4f562cddef9eca545 behind `ib-review-tools` with JWT verification and the same confirmed-email/approved-member checks as production.

## Verified

- Real owner session signed in, approved admin. Saved all six profile preferences, reloaded to verify persistence, then restored all original values. Admin shows the one owner; pending filter shows none. No role or account changes.
- All eight review tools opened through the actual guarded server with the owner session. Flip profit $27,600 and equity ROI 16.3%; rental cash flow $570 after $900 debt service and $100 reserve; hard-money partial draws cost $9,450; manual ARV and rent examples reconcile; ROI inventory and Automated ARV remain explicitly simulated.
- Native owner browser exposed report initialization before the dynamic Flip engine. Explicit renderer-completion notification replaces submit-listener microtasks; reversed-order DOM and native-browser regression cover readiness and stale report clearing.
- Seller review function version 2 corrects retained mortgage tax basis and cash proceeds. Retained debt first offsets additional assumed consideration; the remainder reduces cash received from entered price. It is separate from payoffs. The UI, CSV and PDF disclose the allocation. Excess retained consideration leaves net pending even with a tax override. Original production protected function remains version 2, unchanged.
- Actual Seller source passes 14 original scenarios and 14 retained-debt assertions; seven actual-source DOM cases pass. Owner Seller test fields and location were restored after review.
- Candidate b8c87d7 passed all four exact-head workflows: Quality 39486059782 (including native PDFs and mobile WebKit), profile 39486059839, ARV Worker 39486059987, property-data safety 39486059859.
- Eight corrected bilingual native PDF fixtures were previously inspected visually and for pagination; regenerated fixtures exist on b8c87d7. This is synthetic evidence, separate from an actual Seller PDF exported on a physical device.
- Missing/forged credentials are denied; owner-only DB migration is applied. Provider SQL and billing protection tests pass, but provider migration is intentionally unapplied and live flags remain off.

## Remaining release gates and external dependencies

- Confirm final updated CI after added native regression and documentation; verify refreshed live preview and enabled Flip export.
- Physical iPhone Safari/home-screen icons and actual Seller PDF pagination. WebKit emulation is useful evidence and does not certify physical device behavior.
- Real second-account/relogin isolation and confirmation/recovery email delivery. Only the existing owner was used; no second identity or email recipient was invented, password reset, owner suspension, or sign-out that would lose the review session performed.
- Data-provider dedicated key, licensing/retention rights, actual billing allowance and billing dates; Zillow owner company/contact/terms are external. No provider calls, paid plans, submitted Zillow request or closed-sale feed certification.

The production root keeps existing business assets. Publish #95 and the private Seller page only after remaining release gates are satisfied; do not mark #88 complete or represent live ARV as available. Root infrastructure #96/#97 only adds the isolated review path. Revert preview commits to remove that path; restore private review source from the saved original bundle if needed. Preserve member data and usage counters.
