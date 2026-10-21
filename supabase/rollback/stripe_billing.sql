-- Emergency rollback for 20261021130000_stripe_billing.sql. Keeps plan/billing_status values.
drop function if exists private.has_paid_access();
drop function if exists public.ib_apply_billing_event(text,timestamptz,uuid,text,text,text,text,timestamptz);
drop table if exists private.billing_events;
alter table public.member_subscription_state drop constraint if exists member_subscription_state_plan_code_check;
update public.member_subscription_state set plan_code='none' where plan_code='team';
alter table public.member_subscription_state add constraint member_subscription_state_plan_code_check
  check (plan_code in ('none','trial','starter','pro'));
alter table public.member_subscription_state
  drop column if exists billing_event_at,
  drop column if exists stripe_subscription_id,
  drop column if exists stripe_customer_id;
