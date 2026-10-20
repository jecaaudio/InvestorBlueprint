-- Prepared integration only. Never enables a paid provider or renews a budget automatically.
create table private.property_provider_budget (
  provider text primary key check(provider='rentcast'),
  enabled boolean not null default false,
  period_start timestamptz not null,
  period_end timestamptz not null check(period_end>period_start),
  max_requests integer not null default 0 check(max_requests between 0 and 50),
  reserved_requests integer not null default 0 check(reserved_requests>=0 and reserved_requests<=max_requests),
  cache_seconds integer not null default 0 check(cache_seconds between 0 and 86400)
);
create table private.property_provider_cache (
  cache_key text primary key check(cache_key ~ '^[a-f0-9]{64}$'),
  payload jsonb not null,
  expires_at timestamptz not null
);
alter table private.property_provider_budget enable row level security;
alter table private.property_provider_cache enable row level security;
revoke all on private.property_provider_budget,private.property_provider_cache from public,anon,authenticated,service_role;
insert into private.property_provider_budget(provider,period_start,period_end)
values('rentcast',now(),now()+interval '1 day');

-- Single serialized decision across all processes/regions; failed attempts still consume quota.
create function public.ib_claim_property_request(p_cache_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare b private.property_provider_budget; cached jsonb;
begin
  if p_cache_key !~ '^[a-f0-9]{64}$' or p_cache_key is null then
    raise exception 'Invalid cache key' using errcode='22023';
  end if;
  select * into b from private.property_provider_budget where provider='rentcast' for update;
  if not found or not b.enabled or now()<b.period_start or now()>=b.period_end then
    return jsonb_build_object('status','disabled');
  end if;
  if b.cache_seconds>0 then
    select payload into cached from private.property_provider_cache
      where cache_key=p_cache_key and expires_at>now();
    if found then return jsonb_build_object('status','cached','payload',cached); end if;
  end if;
  if b.reserved_requests>=b.max_requests then return jsonb_build_object('status','exhausted'); end if;
  update private.property_provider_budget set reserved_requests=reserved_requests+1 where provider='rentcast';
  return jsonb_build_object('status','reserved');
end $$;
revoke all on function public.ib_claim_property_request(text) from public,anon,authenticated;
grant execute on function public.ib_claim_property_request(text) to service_role;

create function public.ib_cache_property_response(p_cache_key text,p_payload jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare ttl integer;
begin
  if p_cache_key !~ '^[a-f0-9]{64}$' or p_cache_key is null or p_payload is null
    or octet_length(p_payload::text)>262144 then raise exception 'Invalid cache entry'; end if;
  select cache_seconds into ttl from private.property_provider_budget
    where provider='rentcast' and enabled and now()>=period_start and now()<period_end;
  if ttl is null or ttl=0 then return; end if;
  delete from private.property_provider_cache where expires_at<=now();
  insert into private.property_provider_cache(cache_key,payload,expires_at)
    values(p_cache_key,p_payload,now()+make_interval(secs=>ttl))
    on conflict(cache_key) do update set payload=excluded.payload,expires_at=excluded.expires_at;
end $$;
revoke all on function public.ib_cache_property_response(text,jsonb) from public,anon,authenticated;
grant execute on function public.ib_cache_property_response(text,jsonb) to service_role;
