-- Real PostgreSQL roles/RLS tests for beta testers; synthetic fixtures, always rolled back.
begin;
set local statement_timeout='20s';
insert into auth.users(id,email,raw_user_meta_data)
values ('20000000-0000-4000-8000-000000000001','ib-beta-a@example.invalid','{"beta_tester":true}'),
       ('20000000-0000-4000-8000-000000000002','ib-beta-b@example.invalid','{}');
update public.member_profiles set access_status='approved'
 where id in ('20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002');

do $$
declare owner_id uuid; flag boolean; allowed boolean;
begin
  select user_id into strict owner_id from private.platform_owner;
  if (select beta_tester from public.member_profiles where id='20000000-0000-4000-8000-000000000001') then
    raise exception 'Signup metadata granted beta access';
  end if;

  -- A member cannot grant beta access to itself or to anyone else.
  perform set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
  perform set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
  set local role authenticated;
  update public.member_profiles set beta_tester=true where id='20000000-0000-4000-8000-000000000001';
  update public.member_profiles set beta_tester=true where id='20000000-0000-4000-8000-000000000002';
  select beta_tester into flag from public.member_profiles where id='20000000-0000-4000-8000-000000000001';
  if flag then raise exception 'Member granted itself beta access'; end if;
  if private.has_beta_access() then raise exception 'Non-tester has beta access'; end if;
  begin update public.member_profiles set role='admin' where id='20000000-0000-4000-8000-000000000001';
    raise exception 'Member gained a role write through the beta grant';
  exception when insufficient_privilege then null; end;
  reset role;

  -- The owner grants beta access; only that member gains it.
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',owner_id,'role','authenticated')::text,true);
  set local role authenticated;
  if not private.has_beta_access() then raise exception 'Approved owner lacks beta access'; end if;
  update public.member_profiles set beta_tester=true where id='20000000-0000-4000-8000-000000000001';
  reset role;

  perform set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
  perform set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
  set local role authenticated;
  select beta_tester into flag from public.member_profiles where id='20000000-0000-4000-8000-000000000001';
  if not flag or not private.has_beta_access() then raise exception 'Granted tester cannot use beta tools'; end if;
  reset role;

  perform set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000002',true);
  perform set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
  set local role authenticated;
  if private.has_beta_access() then raise exception 'Beta access leaked to another member'; end if;
  reset role;

  -- A suspended tester loses beta access.
  update public.member_profiles set access_status='suspended' where id='20000000-0000-4000-8000-000000000001';
  perform set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
  perform set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
  set local role authenticated;
  if private.has_beta_access() then raise exception 'Suspended tester kept beta access'; end if;
  reset role;

  set local role anon;
  begin perform private.has_beta_access(); raise exception 'Anonymous beta helper exposed';
  exception when insufficient_privilege then null; end;
  reset role;
  raise notice 'beta tester checks passed';
end $$;
rollback;
