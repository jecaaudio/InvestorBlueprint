-- Session revocation and an absolute eight-hour lifetime. Existing ownership
-- and approved-owner policies stay in force; restrictive policies add a check.
begin;
create or replace function private.ib_session_active()
returns boolean language sql stable security definer set search_path=''
as $$
 select exists (
   select 1 from auth.sessions s
   where s.id::text=(select auth.jwt()->>'session_id')
     and s.user_id=(select auth.uid())
     and s.created_at > statement_timestamp()-interval '8 hours'
     and (s.not_after is null or s.not_after > statement_timestamp())
 );
$$;
revoke all on function private.ib_session_active() from public,anon;
grant execute on function private.ib_session_active() to authenticated;
create or replace function public.ib_session_active()
returns boolean language sql stable security invoker set search_path=''
as $$ select private.ib_session_active(); $$;
revoke all on function public.ib_session_active() from public,anon;
grant execute on function public.ib_session_active() to authenticated;
create or replace function public.ib_accept_terms(p_version text)
returns timestamptz language plpgsql security definer set search_path='' as $$
declare uid uuid := (select auth.uid()); accepted timestamptz;
begin
 if uid is null or not private.ib_session_active() then raise exception 'Sign in first' using errcode='42501'; end if;
 if p_version is null or p_version !~ '^\d{4}-\d{2}-\d{2}$' or p_version::date > current_date then
   raise exception 'Invalid terms version' using errcode='22023';
 end if;
 perform set_config('ib.terms_acceptance','on',true);
 update public.member_profiles set terms_version=p_version
   where id=uid and (terms_accepted_at is null or terms_version is distinct from p_version);
 perform set_config('ib.terms_acceptance','off',true);
 select terms_accepted_at into accepted from public.member_profiles where id=uid and terms_version=p_version;
 return accepted;
end $$;
revoke all on function public.ib_accept_terms(text) from public,anon,service_role;
grant execute on function public.ib_accept_terms(text) to authenticated;
do $$ declare tab text; begin
 foreach tab in array array['member_profiles','member_preferences','member_feedback','member_access_audit','member_subscription_state'] loop
   execute format('drop policy if exists ib_active_session_required on public.%I',tab);
   execute format('create policy ib_active_session_required on public.%I as restrictive for all to authenticated using ((select private.ib_session_active())) with check ((select private.ib_session_active()))',tab);
 end loop;
end $$;
commit;
