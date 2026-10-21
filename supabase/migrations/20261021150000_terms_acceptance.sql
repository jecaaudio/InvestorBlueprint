-- Signup acceptance of the results notice and the Terms, recorded by the server.
-- The signup form only sends which version was accepted (user metadata terms_version).
-- The time is the server's, and nobody (member, owner or service) can change the record later.
-- Accounts created before this, or through the API without accepting, stay null.
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
