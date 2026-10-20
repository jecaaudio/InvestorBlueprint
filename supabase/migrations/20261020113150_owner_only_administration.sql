-- Bootstrap only from the already verified singleton administrator. No identity in source.
-- Abort instead of guessing if the target environment is not the audited baseline.
lock table public.member_profiles in share row exclusive mode;
do $$
begin
  if (select count(*) from public.member_profiles where role='admin') <> 1
     or (select count(*) from public.member_profiles p join auth.users u on u.id=p.id
         where p.role='admin' and p.access_status='approved' and u.email_confirmed_at is not null) <> 1 then
    raise exception 'Expected exactly one existing confirmed approved owner; manual verification required';
  end if;
end $$;

create table private.platform_owner (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null unique references auth.users(id) on delete restrict
);
alter table private.platform_owner enable row level security;
revoke all on private.platform_owner from public, anon, authenticated, service_role;
insert into private.platform_owner(user_id)
select id from public.member_profiles where role='admin';

create or replace function private.is_approved_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.platform_owner o
    join public.member_profiles p on p.id=o.user_id
    where o.singleton and p.id=(select auth.uid())
      and p.role='admin' and p.access_status='approved'
  );
$$;
revoke all on function private.is_approved_admin() from public, anon, service_role;
grant execute on function private.is_approved_admin() to authenticated;

create function private.enforce_platform_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
declare owner_id uuid;
begin
  select user_id into strict owner_id from private.platform_owner where singleton;
  if tg_op='DELETE' then
    if old.id=owner_id then raise exception 'The platform owner profile cannot be deleted' using errcode='42501'; end if;
    return old;
  end if;
  if tg_op='UPDATE' and new.id is distinct from old.id then
    raise exception 'Profile identity is immutable' using errcode='42501';
  end if;
  if (new.role='admin' and new.id<>owner_id)
     or (new.id=owner_id and (new.role<>'admin' or new.access_status<>'approved')) then
    raise exception 'Administrator access is reserved to the platform owner' using errcode='42501';
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_platform_owner() from public, anon, authenticated, service_role;
create trigger ib_enforce_platform_owner before insert or update or delete
on public.member_profiles for each row execute function private.enforce_platform_owner();
create unique index member_profiles_single_admin on public.member_profiles(role) where role='admin';

-- Keep the existing column-level status-only grant, make it explicit and reproducible.
revoke update on public.member_profiles from authenticated;
grant update(access_status) on public.member_profiles to authenticated;
-- Trigger functions are internal; not user-callable RPCs.
revoke all on function private.on_member_created() from public, anon, authenticated, service_role;
revoke all on function private.on_member_status_updated() from public, anon, authenticated, service_role;
revoke references on public.member_preferences from authenticated;
