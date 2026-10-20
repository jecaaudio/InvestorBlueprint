-- Real PostgreSQL roles/RLS/trigger tests, synthetic fixtures, always rolled back.
begin;
set local statement_timeout='20s';
insert into auth.users(id,email,raw_user_meta_data)
values ('10000000-0000-4000-8000-000000000001','ib-security-a@example.invalid','{"role":"admin","access_status":"approved"}'),
       ('10000000-0000-4000-8000-000000000002','ib-security-b@example.invalid','{}');

do $$
declare s text; n integer; owner_id uuid;
begin
  select user_id into strict owner_id from private.platform_owner;
  if (select role from public.member_profiles where id='10000000-0000-4000-8000-000000000001') <> 'member'
    or (select access_status from public.member_profiles where id='10000000-0000-4000-8000-000000000001') <> 'pending' then
    raise exception 'Signup metadata escalated privileges';
  end if;
  -- Anonymous access must fail at grants, not merely hide rows in the UI.
  set local role anon;
  begin perform 1 from public.member_profiles; raise exception 'Anonymous profiles exposed';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.member_preferences; raise exception 'Anonymous preferences exposed';
  exception when insufficient_privilege then null; end;
  begin perform private.is_approved_admin(); raise exception 'Anonymous admin helper exposed';
  exception when insufficient_privilege then null; end;
  reset role;

  foreach s in array array['pending','approved','rejected','suspended'] loop
    update public.member_profiles set access_status=s where id='10000000-0000-4000-8000-000000000001';
    perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
    perform set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","user_metadata":{"role":"admin"}}',true);
    set local role authenticated;
    if private.is_approved_admin() then raise exception 'Member recognized as owner: %',s; end if;
    select count(*) into n from public.member_profiles;
    if n<>1 then raise exception 'Cross-account profile leak: %',s; end if;
    update public.member_profiles set access_status='approved';
    get diagnostics n=row_count;
    if n<>0 then raise exception 'Member can approve accounts: %',s; end if;
    begin update public.member_profiles set role='admin' where id=auth.uid();
      raise exception 'Role mutation permitted'; exception when insufficient_privilege then null; end;
    begin select count(*) into n from public.member_access_audit;
      if n<>0 then raise exception 'Member can read audit'; end if;
    exception when insufficient_privilege then null; end;
    insert into public.member_preferences(user_id,display_name,document_language)
      values(auth.uid(),'Synthetic A','en') on conflict(user_id) do update set document_language='en';
    update public.member_preferences set document_language='es' where user_id=auth.uid();
    if (select document_language from public.member_preferences where user_id=auth.uid())<>'es' then
      raise exception 'Own preference roundtrip failed'; end if;
    begin insert into public.member_preferences(user_id) values('10000000-0000-4000-8000-000000000002');
      raise exception 'Cross-account preference insert permitted'; exception when insufficient_privilege then null; end;
    begin update public.member_preferences set user_id='10000000-0000-4000-8000-000000000002' where user_id=auth.uid();
      raise exception 'Preference reassignment permitted'; exception when insufficient_privilege then null; end;
    begin perform 1 from private.platform_owner; raise exception 'Owner registry exposed';
      exception when insufficient_privilege then null; end;
    reset role;
  end loop;
  -- A second member cannot read or overwrite the first member's saved preferences.
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
  perform set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
  set local role authenticated;
  if exists(select 1 from public.member_preferences) then raise exception 'Preferences leaked to second account'; end if;
  update public.member_preferences set display_name='Injected';
  get diagnostics n=row_count;
  if n<>0 then raise exception 'Cross-account preferences modified'; end if;
  reset role;
  -- The real owner's authorization is exercised without changing their profile.
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',owner_id,'role','authenticated')::text,true);
  set local role authenticated;
  if not private.is_approved_admin() then raise exception 'Owner locked out'; end if;
  foreach s in array array['approved','rejected','suspended','pending'] loop
    update public.member_profiles set access_status=s where id='10000000-0000-4000-8000-000000000002';
    get diagnostics n=row_count;
    if n<>1 then raise exception 'Owner cannot review member'; end if;
    if not exists(select 1 from public.member_access_audit where subject_id='10000000-0000-4000-8000-000000000002' and actor_id=auth.uid() and new_status=s) then
      raise exception 'Owner action not audited'; end if;
  end loop;
  begin update public.member_profiles set access_status='suspended' where id=auth.uid();
    raise exception 'Owner self-suspension permitted'; exception when insufficient_privilege then null; end;
  reset role;
  -- Defense in depth: privileged service writes still cannot create a second admin.
  set local role service_role;
  begin update public.member_profiles set role='admin' where id='10000000-0000-4000-8000-000000000002';
    raise exception 'Service role created another admin'; exception when insufficient_privilege then null; end;
  begin delete from public.member_profiles where id=owner_id;
    raise exception 'Owner deletion permitted'; exception when insufficient_privilege then null; end;
  begin update private.platform_owner set user_id='10000000-0000-4000-8000-000000000002';
    raise exception 'Service changed owner registry'; exception when insufficient_privilege then null; end;
  reset role;
end $$;
select 'PASS: anonymous, pending, approved, rejected, suspended, owner; metadata forgery, RLS, preferences, status audit, service escalation' as result;
rollback;
