# InvestorBlueprint protected tool migration — 2026-10-18

## Infrastructure (JECA, Supabase Free)
- Supabase project ref: `ppeyoovykxomxinumibk`, region `us-east-2`.
- Auth: Supabase email/password; `member_profiles` and audit/subscription tables protected by PostgreSQL RLS.
- The sole administrator was verified privately against Auth and the profile. Do not put owner identifiers or passwords in public documentation.
- Auth interface: `login.html` and `admin.html`.
- Latest JS browser SDK script: `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`, following official docs. Earlier `dist/umd/supabase.js` was not the recommended entrypoint.
- Recovery flow in `login.html?recover=1`; **URL configuration in Supabase Dashboard and outgoing email delivery must be verified.**

## Server-side delivery
- Authenticated Supabase Edge Function `ib-protected-tools` (`verify_jwt=true`) packages the **eight** calculator pages. It checks Supabase Auth token and **current** member profile `access_status = approved` (RLS applies) before returning HTML.
- Public GitHub Pages entry URLs are thin wrappers (under `tools/` and `calculadora-venta/`) that do not embed calculator HTML. These wrappers use `assets/js/secure-tool-loader.js`.
- In the normal website flow, visitors without sessions cannot receive calculator HTML from the protected endpoint.
- The old calculator source *remains retrievable in the public Git repository history* and some publicly served JS assets; server gating controls current delivery/access, **not secrecy of source code**. A private repository/build pipeline is required if source secrecy is an objective.
- Server-side endpoint status: ACTIVE in Supabase; bundled HTML snapshots structurally checked. Browser loader's `document.open/write/close` method validated with local Chromium mock. **Real authorized-user end-to-end mobile login and calculator smoke tests not yet complete.**

## Remaining release checks
1. Confirm Auth Site URL `https://jecaaudio.github.io/InvestorBlueprint/` and Redirect URL `https://jecaaudio.github.io/InvestorBlueprint/login.html` in Supabase Authentication > URL Configuration.
2. Confirm owner can sign in. Auth logs showed `400 invalid_credentials` in recent attempts; profile is verified/approved and a password hash exists. Owner can use recovery email (never share password in chat).
3. Test sign-in, profile status, redirect from protected tool, all 8 tools, printing, iPhone/Safari, sign-out, pending/rejected/suspended access, password recovery, and email confirmation.
4. Configure custom SMTP before public customer signup (Free default SMTP has restrictions).
5. Investigate existing GitHub Quality workflow failures and update test harness for protected routes. Deployment success does not establish QA passing.
6. Leaked password detection is a **Supabase Pro** feature: do not enable paid plan without user's approval. Organization is on Free.

## Recovery plan
Public tool wrappers can be restored to the prior version from GitHub commit history if the protected delivery fails. The latest working calculator HTML is also bundled in Supabase Edge Function `ib-protected-tools`. Keep Edge snapshots stable until automated E2E smoke tests pass.
