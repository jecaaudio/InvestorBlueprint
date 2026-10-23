begin;
do $$ declare tab text; begin
 foreach tab in array array['member_profiles','member_preferences','member_feedback','member_access_audit','member_subscription_state'] loop
   execute format('drop policy if exists ib_active_session_required on public.%I',tab);
 end loop;
end $$;
create or replace function public.ib_accept_terms(p_version text)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); accepted timestamptz;
begin
  if uid is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if p_version is null or p_version !~ '^\d{4}-\d{2}-\d{2}$' or p_version::date > current_date then
    raise exception 'Invalid terms version' using errcode = '22023';
  end if;
  perform set_config('ib.terms_acceptance', 'on', true);
  update public.member_profiles set terms_version = p_version
   where id = uid and (terms_accepted_at is null or terms_version is distinct from p_version);
  perform set_config('ib.terms_acceptance', 'off', true);
  select terms_accepted_at into accepted from public.member_profiles where id = uid and terms_version = p_version;
  return accepted;
end;
$$;
revoke all on function public.ib_accept_terms(text) from public, anon, service_role;
grant execute on function public.ib_accept_terms(text) to authenticated;
drop function if exists public.ib_session_active();
drop function if exists private.ib_session_active();
commit;
