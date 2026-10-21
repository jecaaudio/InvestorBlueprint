-- Emergency rollback for 20261021120000_beta_testers.sql. Removes every beta-tester flag.
drop function if exists private.has_beta_access();
revoke update(beta_tester) on public.member_profiles from authenticated;
alter table public.member_profiles drop column if exists beta_tester;
