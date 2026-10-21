-- Emergency rollback for 20261021150000_terms_acceptance.sql. Deletes every acceptance record.
drop trigger if exists ib_record_terms_acceptance on public.member_profiles;
drop function if exists private.record_terms_acceptance();
alter table public.member_profiles
  drop column if exists terms_version,
  drop column if exists terms_accepted_at;
