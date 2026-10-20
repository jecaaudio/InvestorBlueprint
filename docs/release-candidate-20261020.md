# Integrated review candidate — 20 October 2026

Base production: `beb651ed921726880c48c83c413434f1dbd5d32f`.
Production owner-only database migration and exact-commit Pages gate are applied.
Published build-info.json verified that SHA after successful gated deployment.

This isolated candidate combines reviewed #86, #87, #90, #91, #92 and #94.
Resolved Quality workflow conflicts by preserving all unit/live-denial/WebKit/brand
checks. Resolved loader conflicts preserving both brand and member-data isolation.
Updated seller browser fixture to reflect the real storage contract. Snapshot insertion
uses a callback replacement so user-supplied `$&`, `$'`, and backtick replacement
tokens stay literal; HTML delimiters remain JSON-escaped. Removed owner email from
the old status document; no history rewrite or credential changes.

## Local verification

- 74/74 combined site/unit tests passed.
- 15/15 worker tests passed.
- Seller live snapshot: 14 arithmetic scenarios passed; exact hash in finance audit.
- Original SQL owner suite passed before/after permanent migration; fixtures removed.
- Provider quota SQL passed transactionally; separate provider CI passed real
  PostgreSQL cache/grants/expiry and 40 attempts with 8 workers, exactly 7 allowed.
- Browser-brand fixture syntax and git diff check passed.

## Pending release gates (do not merge/deploy this candidate yet)

- Exact candidate Quality, property-data, ARV worker and profile Actions.
- Real controlled account sessions: sign-in/out, recovery/confirmation email, preference
  reload/relogin/isolation, admin return/navigation and suspension behavior.
- Physical iPhone Safari/home-screen icons and authenticated desktop visual review.
- PDF/print review in both languages, detailed/summary modes and two-account privacy.
- Complete model enhancements (rental debt/reserves, lender draw/fee schedules,
  condition/size/date-adjusted ARV) and Illinois taxable-basis defect.
- Provider licenses, dedicated key, actual billing allowance/period, retention rights,
  live provenance QA; Zillow owner contact/legal-entity fields and terms.

No upstream provider activated, paid plan enabled, emails sent, passwords changed,
or real financial records modified. Backend integration migration remains unapplied
and disabled by default. This candidate does not declare InvestorBlueprint complete.

Rollback candidate code by reverting its aggregate commit; preserve stored member
data. Production database-owner rollback is separate and documented under supabase/
rollback. Provider rollback disables flags/budget first; never erase usage counters.
