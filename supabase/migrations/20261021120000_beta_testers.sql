-- Beta testers: approved members the platform owner lets open tools that are still in testing.
-- The existing UPDATE policy on member_profiles allows only the approved owner, so members
-- can read their own flag but never set it.
alter table public.member_profiles
  add column if not exists beta_tester boolean not null default false;
grant update(beta_tester) on public.member_profiles to authenticated;

-- For server-side delivery of beta tools: the approved owner or an approved beta tester.
create or replace function private.has_beta_access()
returns boolean language sql stable security definer set search_path = '' as $$
  select (select private.is_approved_admin()) or exists (
    select 1 from public.member_profiles p
    where p.id=(select auth.uid()) and p.access_status='approved' and p.beta_tester
  );
$$;
revoke all on function private.has_beta_access() from public, anon, service_role;
grant execute on function private.has_beta_access() to authenticated;
