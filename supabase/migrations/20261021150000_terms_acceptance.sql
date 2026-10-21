-- Signup acceptance of the results notice and the Terms, recorded by the server.
-- The signup form only sends which version was accepted (user metadata terms_version).
-- The time is the server's, and nobody (member, owner or service) can change the record later.
-- Accounts created before this, or through the API without accepting, stay null until the
-- member accepts from My profile through public.ib_accept_terms (also server time).
alter table public.member_profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text;

create or replace function private.record_terms_acceptance()
returns trigger language plpgsql security definer set search_path = '' as $$
declare accepted text;
begin
  if tg_op = 'INSERT' then
    select u.raw_user_meta_data->>'terms_version' into accepted from auth.users u where u.id = new.id;
    if accepted ~ '^\d{4}-\d{2}-\d{2}$' then
      new.terms_accepted_at := now();
      new.terms_version := accepted;
    else
      new.terms_accepted_at := null;
      new.terms_version := null;
    end if;
  elsif coalesce(current_setting('ib.terms_acceptance', true), '') = 'on' and new.id = (select auth.uid()) then
    -- Only public.ib_accept_terms sets this flag, for the signed-in member's own row.
    new.terms_accepted_at := now();
  else
    new.terms_accepted_at := old.terms_accepted_at;
    new.terms_version := old.terms_version;
  end if;
  return new;
end;
$$;
revoke all on function private.record_terms_acceptance() from public, anon, authenticated, service_role;
drop trigger if exists ib_record_terms_acceptance on public.member_profiles;
create trigger ib_record_terms_acceptance before insert or update on public.member_profiles
for each row execute function private.record_terms_acceptance();

-- A signed-in member accepts the current notice and Terms (existing accounts, or a new version).
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
