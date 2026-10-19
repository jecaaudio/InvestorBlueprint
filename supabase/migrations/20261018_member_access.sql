-- InvestorBlueprint members / approval workflow. Supabase/Postgres.
-- Apply through a privileged migration, not through the browser.
-- No client access is allowed to grant admin roles or paid subscriptions.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table if not exists public.member_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'member' check (role in ('member','admin')),
  access_status text not null default 'pending'
    check (access_status in ('pending','approved','rejected','suspended')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists member_profiles_status_idx
  on public.member_profiles(access_status, requested_at desc);

create table if not exists public.member_subscription_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_code text not null default 'none'
    check(plan_code in ('none','trial','starter','pro')),
  billing_status text not null default 'not_configured'
    check(billing_status in ('not_configured','trialing','active','past_due','cancelled')),
  valid_until timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.member_access_audit (
  id bigint generated always as identity primary key,
  subject_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id),
  previous_status text,
  new_status text not null,
  changed_at timestamptz not null default now()
);
create index if not exists member_access_audit_subject_idx
  on public.member_access_audit(subject_id,changed_at desc);

-- Created in an unexposed schema, with an empty search path.
create or replace function private.is_approved_admin()
returns boolean language sql stable security definer set search_path=''
as $$
  select exists(
    select 1 from public.member_profiles p
    where p.id=(select auth.uid())
      and p.role='admin'
      and p.access_status='approved'
  );
$$;
revoke all on function private.is_approved_admin() from public, anon;
grant execute on function private.is_approved_admin() to authenticated;

create or replace function private.on_member_created()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  insert into public.member_profiles(id,email,full_name,role,access_status)
  values(
    new.id,
    coalesce(new.email,''),
    left(coalesce(new.raw_user_meta_data->>'full_name',''),120),
    'member','pending'
  )
  on conflict(id) do nothing;

  insert into public.member_subscription_state(user_id)
  values(new.id)
  on conflict(user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists ib_member_created on auth.users;
create trigger ib_member_created
after insert on auth.users for each row execute function private.on_member_created();

create or replace function private.on_member_status_updated()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  -- An approved administrator cannot accidentally remove their own access.
  if old.id=(select auth.uid()) and old.role='admin'
     and new.access_status is distinct from old.access_status then
    raise exception 'You cannot change your own admin access status';
  end if;

  new.updated_at=now();
  if old.access_status is distinct from new.access_status then
    new.reviewed_at=now();
    new.reviewed_by=(select auth.uid());
    insert into public.member_access_audit(subject_id,actor_id,previous_status,new_status)
    values(new.id,(select auth.uid()),old.access_status,new.access_status);
  end if;
  return new;
end;
$$;

drop trigger if exists ib_member_status_updated on public.member_profiles;
create trigger ib_member_status_updated
before update on public.member_profiles
for each row execute function private.on_member_status_updated();

alter table public.member_profiles enable row level security;
alter table public.member_subscription_state enable row level security;
alter table public.member_access_audit enable row level security;

revoke all on public.member_profiles from anon,authenticated;
revoke all on public.member_subscription_state from anon,authenticated;
revoke all on public.member_access_audit from anon,authenticated;

grant select on public.member_profiles to authenticated;
grant update(access_status) on public.member_profiles to authenticated;
grant select on public.member_subscription_state to authenticated;
grant select on public.member_access_audit to authenticated;

drop policy if exists "Member can read own profile or admin all" on public.member_profiles;
create policy "Member can read own profile or admin all"
on public.member_profiles for select to authenticated
using ((select auth.uid())=id or (select private.is_approved_admin()));

drop policy if exists "Approved admin can review access" on public.member_profiles;
create policy "Approved admin can review access"
on public.member_profiles for update to authenticated
using ((select private.is_approved_admin()))
with check ((select private.is_approved_admin()));

drop policy if exists "Member can read own billing state or admin all" on public.member_subscription_state;
create policy "Member can read own billing state or admin all"
on public.member_subscription_state for select to authenticated
using ((select auth.uid())=user_id or (select private.is_approved_admin()));

drop policy if exists "Approved admin can read audit" on public.member_access_audit;
create policy "Approved admin can read audit"
on public.member_access_audit for select to authenticated
using ((select private.is_approved_admin()));

-- Important: role='admin' is NEVER assigned by public signup. Do not store
-- any administrator password or service_role key in this repository.
-- After verifying your own first account, promote it in the SQL editor:
-- UPDATE public.member_profiles SET role='admin', access_status='approved'
-- WHERE id=(SELECT id FROM auth.users WHERE email='YOUR_VERIFIED_ADMIN_EMAIL');
