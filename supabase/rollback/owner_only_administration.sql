-- Emergency rollback to the audited pre-migration authorization model.
-- Requires database-owner access. This removes owner-only defense in depth.
-- Never execute as a routine deploy step. Member data and preferences are retained.
begin;
drop trigger ib_enforce_platform_owner on public.member_profiles;
drop function private.enforce_platform_owner();
drop index public.member_profiles_single_admin;
create or replace function private.is_approved_admin()
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.member_profiles p
    where p.id=(select auth.uid()) and p.role='admin' and p.access_status='approved');
$$;
drop table private.platform_owner;
-- Preserve safer trigger-function grants and removal of unnecessary REFERENCES.
commit;
