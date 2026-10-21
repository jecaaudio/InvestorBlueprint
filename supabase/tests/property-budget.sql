-- Run AFTER candidate migration inside a transaction. No paid API calls.
begin;
do $$
declare k text:=repeat('a',64); result jsonb; n integer;
begin
  set local role anon;
  begin perform public.ib_claim_property_request(k);raise exception 'Anonymous quota RPC exposed';
  exception when insufficient_privilege then null;end;
  reset role;
  set local role authenticated;
  begin perform public.ib_claim_property_request(k);raise exception 'Member quota RPC exposed';
  exception when insufficient_privilege then null;end;
  reset role;
  set local role service_role;
  begin update private.property_provider_budget set enabled=true;raise exception 'Service can enable paid usage';
  exception when insufficient_privilege then null;end;
  result:=public.ib_claim_property_request(k);
  if result->>'status'<>'disabled' then raise exception 'Budget not disabled by default';end if;
  reset role;
  update private.property_provider_budget set enabled=true,max_requests=2,cache_seconds=60,
    period_start=now()-interval '1 hour',period_end=now()+interval '1 hour' where provider='rentcast';
  set local role service_role;
  result:=public.ib_claim_property_request(k);
  if result->>'status'<>'reserved' then raise exception 'First request not reserved';end if;
  perform public.ib_cache_property_response(k,'{"test":true}');
  result:=public.ib_claim_property_request(k);
  if result->>'status'<>'cached' or result->'payload'->>'test'<>'true' then raise exception 'Cache miss';end if;
  result:=public.ib_claim_property_request(repeat('b',64));
  if result->>'status'<>'reserved' then raise exception 'Second request not reserved';end if;
  for n in 1..100 loop
    result:=public.ib_claim_property_request(repeat('c',64));
    if result->>'status'<>'exhausted' then raise exception 'Exceeded hard budget';end if;
  end loop;
  reset role;
  if (select reserved_requests from private.property_provider_budget where provider='rentcast')<>2 then
    raise exception 'Incorrect charge count';end if;
  update private.property_provider_budget set period_start=now()-interval '2 hours',period_end=now()-interval '1 hour';
  set local role service_role;
  result:=public.ib_claim_property_request(k);
  if result->>'status'<>'disabled' then raise exception 'Expired budget served data';end if;
  reset role;
end $$;
select 'PASS: RPC grants, disabled default, cache hit, durable reservation, hard quota and expiration' as result;
rollback;
