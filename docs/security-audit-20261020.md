# Owner-only administration — 2026-10-20

Tracking: #88. Baseline main: d67a5b50d06c7431776cd7a4886364c83f1fa036.

## Findings and implementation

Live Auth and member_profiles match exactly one confirmed approved administrator.
Identity was verified privately; no owner email or UUID is embedded in this patch.
Existing column grants already restrict authenticated profile writes to access_status.
The earlier issue's claim that clients can edit every profile column was inaccurate.
RLS exists on profiles, subscription state, audit and preferences. No public RPCs exist.

Missing invariant: no fixed owner identity or singleton admin restriction. A future
privileged service write could previously create a second administrator.

Migration bootstraps a private owner registry only if exactly one confirmed approved
admin exists. Its UUID is immutable through client and service-role grants. RLS admin
helper now requires both that registry identity and current approved admin profile.
A trigger rejects non-owner admin roles, identity reassignment, owner demotion,
owner suspension and owner profile deletion. A partial unique index also prevents
multiple admins. Signup ignores role/status claims in user_metadata. Existing
status-change audit logging and status-only client grants remain in place.

Database superusers can deliberately alter schema and restore access; this is not
protection against a compromised Supabase project owner or database superuser.

## Verification

- Baseline Node tests: 34/34 passed.
- Ran migration plus SQL regression suite inside one BEGIN/ROLLBACK on live PostgreSQL.
- Passed: anon denied; pending/approved/rejected/suspended member sees own profile only;
  metadata cannot grant admin; no member status/role writes; owner can approve, reject,
  suspend and reset a synthetic member, with audit entries; owner cannot self-suspend.
- Passed: preference insert/read/update roundtrip and two-account isolation, denied
  cross-account insert and user_id reassignment; registry inaccessible to clients.
- Passed: service role cannot promote another admin, delete owner, or edit registry.
- Synthetic Auth users use example.invalid and were rolled back. No messages sent,
  passwords changed, or persistent real-user settings modified.
- SQL-role tests validate database authorization, not real browser login/email delivery.
- Security advisor baseline: only leaked-password protection disabled (existing Free
  plan limitation). No plan changes authorized or performed.

## Release and rollback

Migration and tests: supabase/migrations/20261020113150_owner_only_administration.sql,
supabase/tests/owner-access.sql. Emergency rollback is in supabase/rollback.
Rollback preserves all member data; it intentionally restores the prior weaker admin
model. Take a schema backup and verify the exact migration and CI before applying.

PR #86 and #87 were verified open, draft and unmerged. No claim of mobile, PDF,
external-provider, or whole-project completion follows from this security test.

## Remaining gates

Authenticated browser/email confirmation and recovery flows, external SMTP and a
physical iPhone require controlled account/device access. Provider licenses and keys
remain prerequisites for live licensed property data. Never substitute demo values.
