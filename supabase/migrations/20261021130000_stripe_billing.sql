-- Stripe billing state. Written only by the ib-billing-webhook Edge Function through
-- ib_apply_billing_event (service role). Members keep read-only access to their own row.
alter table public.member_subscription_state
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text unique,
  add column if not exists billing_event_at timestamptz;
alter table public.member_subscription_state
  drop constraint if exists member_subscription_state_plan_code_check;
alter table public.member_subscription_state
  add constraint member_subscription_state_plan_code_check
  check (plan_code in ('none','trial','starter','pro','team'));

-- Stripe retries deliveries; each event id is applied once.
create table if not exists private.billing_events (
  event_id text primary key,
  processed_at timestamptz not null default now()
);
alter table private.billing_events enable row level security;
revoke all on private.billing_events from public, anon, authenticated;

create or replace function public.ib_apply_billing_event(
  p_event_id text, p_event_at timestamptz, p_user_id uuid, p_customer text,
  p_subscription text, p_plan text, p_status text, p_valid_until timestamptz)
returns text language plpgsql security definer set search_path = '' as $$
declare target uuid; last_event timestamptz;
begin
  if p_event_id is null or p_event_at is null
     or p_plan not in ('none','pro','team')
     or p_status not in ('trialing','active','past_due','cancelled') then
    raise exception 'invalid_billing_event' using errcode='22023';
  end if;
  target := p_user_id;
  if target is null then
    select user_id into target from public.member_subscription_state where stripe_customer_id=p_customer;
  end if;
  -- A subscription event can arrive before checkout links the customer; checkout re-reads it.
  if target is null or not exists (select 1 from public.member_profiles where id=target) then
    return 'unknown_customer';
  end if;
  insert into private.billing_events(event_id) values (p_event_id) on conflict do nothing;
  if not found then return 'duplicate'; end if;
  insert into public.member_subscription_state(user_id) values (target) on conflict (user_id) do nothing;
  select billing_event_at into last_event from public.member_subscription_state where user_id=target for update;
  if last_event is not null and p_event_at < last_event then return 'stale'; end if;
  update public.member_subscription_state set
    plan_code=p_plan, billing_status=p_status, valid_until=p_valid_until, billing_event_at=p_event_at,
    stripe_customer_id=coalesce(p_customer, stripe_customer_id),
    stripe_subscription_id=coalesce(p_subscription, stripe_subscription_id),
    updated_at=now()
  where user_id=target;
  -- Paying replaces manual approval for new members. Rejected or suspended accounts stay as they are.
  if p_status in ('active','trialing') then
    update public.member_profiles set access_status='approved', reviewed_at=now()
    where id=target and access_status='pending';
  end if;
  return 'applied';
end;
$$;
revoke all on function public.ib_apply_billing_event(text,timestamptz,uuid,text,text,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.ib_apply_billing_event(text,timestamptz,uuid,text,text,text,text,timestamptz) to service_role;

-- For the protected-tools function when paid plans are enforced: owner, beta access
-- rules aside, or an approved member with a current paid or trial subscription.
create or replace function private.has_paid_access()
returns boolean language sql stable security definer set search_path = '' as $$
  select (select private.is_approved_admin()) or exists (
    select 1 from public.member_subscription_state s
    join public.member_profiles p on p.id=s.user_id
    where s.user_id=(select auth.uid()) and p.access_status='approved'
      and s.billing_status in ('active','trialing')
      and (s.valid_until is null or s.valid_until > now())
  );
$$;
revoke all on function private.has_paid_access() from public, anon, service_role;
grant execute on function private.has_paid_access() to authenticated;
