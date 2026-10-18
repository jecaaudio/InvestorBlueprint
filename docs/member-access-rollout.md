# InvestorBlueprint — Secure member access (implementation staging)

This feature lives on \`feature/secure-member-access-20261018\` and is **not production-ready** until its backend is configured and tools are moved behind a server-enforced access gateway.

## User-facing flow
1. Public home explains the purpose and functionality of each calculator.
2. Visitor requests access with email, full name and a password (12-character minimum).
3. Email verification is handled by Supabase Auth, not in the site's JavaScript.
4. The user remains \`pending\`. Only an approved \`admin\` can switch status to \`approved\`, \`rejected\`, \`suspended\`, or back to \`pending\`.
5. The administrator sees request history, and each change is saved in a database audit table.
6. A future subscription state table exists but payments, plans, subscription renewal, and billing UI **are not active**.

## Current technical state
- Frontend: \`login.html\` and \`admin.html\`, using \`assets/js/member-access.js\`.
- Public, non-secret config: \`assets/js/member-auth-config.js\`.
- Database: \`supabase/migrations/20261018_member_access.sql\`.
- Spanish/English text and dark/light styling retained.
- Authentication is not activated until real Supabase credentials are supplied. No test password or admin credential is hard-coded.

**CRITICAL:** GitHub Pages serves \`tools/*.html\` and \`calculadora-venta/index.html\` publicly. A browser-only login cannot secure or revoke access to these static URLs. Do **not** claim that hiding a card or redirecting users from the home page protects the calculators.

## Backend activation checklist

1. Connect a Supabase project (prefer staging first).
2. Apply migration as a privileged database migration, review migration and RLS checks.
3. Configure Email Auth, email confirmation, password requirements, and redirect allowlist:
   - \`https://jecaaudio.github.io/InvestorBlueprint/login.html\`
   - Future protected-host login callback URL(s).
4. Register the owner's actual email address through Auth and verify it. Then, **only via a privileged SQL editor / migration**, promote that exact user:
   \`\`\`sql
   update public.member_profiles
      set role='admin', access_status='approved'
    where id=(select id from auth.users where email='OWNER_VERIFIED_EMAIL');
   \`\`\`
   The site must never accept an admin role from client-supplied profile data.
5. Fill the public Supabase project URL and **publishable/anon key** in \`member-auth-config.js\`; never a service role key, client secret, password, or database connection string.
6. RLS security tests with at least two different users:
   - unauthenticated sessions cannot read member profiles;
   - pending users can view only their own profile and cannot change status;
   - an approved non-admin user cannot see others or approve them;
   - approved admin sees all and can change statuses; audit entries are created;
   - suspended admin loses admin access; approved admins cannot accidentally self-suspend;
   - email-verification and password-reset links work.
7. Move **each protected tool page and any proprietary calculator APIs** to an authenticated, server-verified hosting path (e.g., a protected app deployment). Validate current Supabase session/token **and** the profile's current \`approved\` status server-side for every protected request. Remove tool assets from the public Pages deployment, or old public links will remain bypasses. Serving JavaScript inside an unprotected public repository cannot hide its algorithms.
8. Verify mobile/desktop, sign-out, expired/revoked access, deep-link protection, permissions, bilingual UI, accessibility and audit history.
9. Only after these checks, change tool cards to the protected routes and promote the feature branch to production.

## Security boundaries
- RLS is required. Admin role and paid/trial flags cannot be set by ordinary registered users.
- Passwords are managed solely by Supabase Auth; never email or collect the administrator password in chat, code, or public GitHub.
- MFA for the administrator is strongly recommended before production.
- Keep costs, plan entitlements and future Stripe webhook authorization server-side; client-supplied plan names must never grant access.
- Consider rate limits, abuse protection, and verified signup email.
- The current repo still contains an old \`auth.js\` localStorage-only demo which is **not real authentication**. Remove unused imports from production and do not rely on it for access control.

## Status
The database migration, UX, and admin-review UI are staged in GitHub; they are not connected to a live Supabase project. No live users, role grants, password, billing, or legitimate route restriction is claimed yet.

## Verified live environment — 2026-10-18

- Supabase project: `ppeyoovykxomxinumibk` (JECA Free, us-east-2)
- Owner's verified account: Jansel2913@gmail.com; role `admin`, status `approved` (verified after tests)
- Migration: `init_investorblueprint_member_access`; RLS on all three tables
- RLS checks: approved administrator sees own profile; a different simulated UUID sees zero rows; anonymous role receives permission denied. Simulated unauthorized update returned zero rows. Tests were performed inside transactions with rollback.
- Live Supabase Edge Function: `member-access-check` (version 1, active, `verify_jwt=true`). This endpoint verifies a signed-in user and reads current approval from the RLS-protected table. Source is in `supabase/functions/member-access-check/index.ts`.
- **No calculator routes have been protected yet.** Publishing a login on GitHub Pages alone will not restrict static tools.
- Authentication configuration in Supabase (redirect allowlist, SMTP for customer signups, server-side minimum password policy) still needs dashboard setup and real mobile QA.
- Supabase security advisor reports `auth_leaked_password_protection`: leaked password protection is **only available on Pro and above**, not JECA Free. Do not claim this safeguard is enabled. User must explicitly accept plan charges before upgrade.
- Do not merge the draft PR or block current tool URLs until backend-verified protected-host migration and session/revocation tests are complete.
