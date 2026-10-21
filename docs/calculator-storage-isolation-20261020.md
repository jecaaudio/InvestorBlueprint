# Cross-account browser state — 20 October 2026

Tracking #88. Priority 1/2/5 privacy correction, independent of financial formulas.

## Confirmed defects

Live protected Seller Net snapshot used the unscoped localStorage key
`seller-net-multistate-2026-v1` for financial input, city, debt and seller figures.
Two legitimate users in the same browser could load each other's saved calculator
state after changing accounts. Existing RLS does not govern browser localStorage.

Report readers also used shared localStorage metadata on every export. Another tab
changing accounts could replace the displayed author/company/document language of an
already-open report. Calculator loader did not apply saved interface language.

## Correction

After server authorization, loader namespaces Seller Net storage to the current
member. Existing unowned legacy storage is preserved but never imported into any
account. Unexpected seller storage contract fails closed rather than leaking data.
Language/theme keys are similarly scoped.

Loader embeds a frozen per-document report-preferences snapshot before protected
page scripts execute. JSON escapes `<` and Unicode line separators to prevent user
metadata becoming executable markup. Seller and ARV report readers prefer that
snapshot over shared localStorage. Saved interface language is also synchronized.
Snapshots still work when browser storage is blocked.

## Tests and release

Existing 34 site tests plus six new regressions: two-member state isolation with
legacy preservation, changed-contract denial, blocked-storage safe snapshot with
script-like user text, cross-tab report metadata isolation, clearing already open
tools on account change/sign-out, and refusing an in-flight result after session change.
Total: 40/40 site tests passed.

No formulas, passwords, Auth identities or stored financial records changed. Rollback
is code revert; no data migration. Keep isolated pending exact-commit Quality and
authenticated browser/PDF QA. This is browser-flow isolation, not encryption of
localStorage against someone with direct access to that browser profile/devtools.
