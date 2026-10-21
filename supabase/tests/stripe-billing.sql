-- Real PostgreSQL checks for Stripe billing state; synthetic fixtures, always rolled back.
begin;
set local statement_timeout='20s';
insert into auth.users(id,email) values
 ('30000000-0000-4000-8000-000000000001','ib-pay-a@example.invalid'),
 ('30000000-0000-4000-8000-000000000002','ib-pay-b@example.invalid');
update public.member_profiles set access_status='rejected' where id='30000000-0000-4000-8000-000000000002';

do $$
declare r text; st record; owner_id uuid;
begin
  select user_id into strict owner_id from private.platform_owner;
  -- Only the service role may apply billing events.
  perform set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000001',true);
  set local role authenticated;
  begin perform public.ib_apply_billing_event('evt_x',now(),'30000000-0000-4000-8000-000000000001','cus_x','sub_x','pro','active',null);
    raise exception 'Member applied its own billing event';
  exception when insufficient_privilege then null; end;
  begin update public.member_subscription_state set plan_code='team' where user_id='30000000-0000-4000-8000-000000000001';
    raise exception 'Member wrote billing state';
  exception when insufficient_privilege then null; end;
  if private.has_paid_access() then raise exception 'Unpaid member has paid access'; end if;
  reset role;
  set local role anon;
  begin perform public.ib_apply_billing_event('evt_y',now(),null,'cus_y',null,'pro','active',null); raise exception 'Anon applied billing';
  exception when insufficient_privilege then null; end;
  reset role;

  set local role service_role;
  -- Checkout links the customer and approves a pending member immediately.
  r:=public.ib_apply_billing_event('evt_1','2026-10-21 10:00+00','30000000-0000-4000-8000-000000000001','cus_A','sub_A','pro','active','2026-11-21 10:00+00');
  if r<>'applied' then raise exception 'checkout not applied: %',r; end if;
  if public.ib_apply_billing_event('evt_1','2026-10-21 10:00+00','30000000-0000-4000-8000-000000000001','cus_A','sub_A','pro','active',null)<>'duplicate' then raise exception 'duplicate applied twice'; end if;
  -- An older event never overwrites a newer state.
  if public.ib_apply_billing_event('evt_0','2026-10-21 09:00+00',null,'cus_A','sub_A','pro','past_due',null)<>'stale' then raise exception 'stale event applied'; end if;
  -- Subscription events find the member by customer.
  if public.ib_apply_billing_event('evt_2','2026-10-21 11:00+00',null,'cus_A','sub_A','team','active','2026-11-21 11:00+00')<>'applied' then raise exception 'customer lookup failed'; end if;
  -- Unknown customers are not recorded, so a later retry can still apply.
  if public.ib_apply_billing_event('evt_3','2026-10-21 11:00+00',null,'cus_unknown','sub_Z','pro','active',null)<>'unknown_customer' then raise exception 'unknown customer applied'; end if;
  reset role;
  if exists(select 1 from private.billing_events where event_id='evt_3') then raise exception 'unknown event consumed'; end if;
  set local role service_role;
  -- A rejected member who pays stays rejected.
  perform public.ib_apply_billing_event('evt_4','2026-10-21 12:00+00','30000000-0000-4000-8000-000000000002','cus_B','sub_B','pro','active',null);
  begin perform public.ib_apply_billing_event('evt_5',now(),null,'cus_A',null,'gold','active',null); raise exception 'invalid plan accepted';
  exception when sqlstate '22023' then null; end;
  reset role;

  select p.access_status,b.plan_code,b.billing_status,b.stripe_customer_id into st
    from public.member_profiles p join public.member_subscription_state b on b.user_id=p.id where p.id='30000000-0000-4000-8000-000000000001';
  if st.access_status<>'approved' or st.plan_code<>'team' or st.billing_status<>'active' or st.stripe_customer_id<>'cus_A' then raise exception 'unexpected state %',st; end if;
  if (select access_status from public.member_profiles where id='30000000-0000-4000-8000-000000000002')<>'rejected' then raise exception 'Payment overrode a rejection'; end if;

  perform set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000001',true);
  set local role authenticated;
  if not private.has_paid_access() then raise exception 'Paying member lacks access'; end if;
  if (select count(*) from public.member_subscription_state)<>1 then raise exception 'Member sees other billing rows'; end if;
  reset role;

  set local role service_role;
  perform public.ib_apply_billing_event('evt_6','2026-10-21 13:00+00',null,'cus_A','sub_A','team','cancelled','2026-10-21 13:00+00');
  reset role;
  set local role authenticated;
  if private.has_paid_access() then raise exception 'Cancelled member kept paid access'; end if;
  reset role;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  set local role authenticated;
  if not private.has_paid_access() then raise exception 'Owner lacks access'; end if;
  reset role;
  raise notice 'stripe billing checks passed';
end $$;
rollback;
