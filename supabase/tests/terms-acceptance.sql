-- Real PostgreSQL checks for the signup acceptance record; synthetic fixtures, always rolled back.
begin;
set local statement_timeout='20s';
-- A: accepted in the form. B: signed up through the API without accepting.
-- C: forged a timestamp in metadata but sent no valid version.
insert into auth.users(id,email,raw_user_meta_data) values
 ('50000000-0000-4000-8000-000000000001','ib-terms-a@example.invalid','{"full_name":"A","terms_version":"2026-10-21"}'),
 ('50000000-0000-4000-8000-000000000002','ib-terms-b@example.invalid','{"full_name":"B"}'),
 ('50000000-0000-4000-8000-000000000003','ib-terms-c@example.invalid','{"terms_accepted_at":"2020-01-01T00:00:00Z","terms_version":"yes"}');

do $$
declare p record; owner_id uuid; first_time timestamptz;
begin
  select user_id into strict owner_id from private.platform_owner;
  select * into strict p from public.member_profiles where id='50000000-0000-4000-8000-000000000001';
  if p.terms_version<>'2026-10-21' or p.terms_accepted_at is null or p.terms_accepted_at<>now() then
    raise exception 'Accepted signup was not recorded with the server time';
  end if;
  first_time:=p.terms_accepted_at;
  if exists (select 1 from public.member_profiles where id in ('50000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000003')
             and (terms_accepted_at is not null or terms_version is not null)) then
    raise exception 'A signup without a valid acceptance got a record';
  end if;

  -- A member cannot write the record, even later through metadata.
  perform set_config('request.jwt.claim.sub','50000000-0000-4000-8000-000000000002',true);
  perform set_config('request.jwt.claims','{"sub":"50000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
  set local role authenticated;
  begin update public.member_profiles set terms_accepted_at=now(),terms_version='2026-10-21' where id='50000000-0000-4000-8000-000000000002';
    raise exception 'Member wrote its own acceptance';
  exception when insufficient_privilege then null; end;
  reset role;
  update auth.users set raw_user_meta_data='{"terms_version":"2026-10-21"}' where id='50000000-0000-4000-8000-000000000002';
  if (select terms_accepted_at from public.member_profiles where id='50000000-0000-4000-8000-000000000002') is not null then
    raise exception 'Editing metadata later created an acceptance';
  end if;

  -- The owner approves; the record is kept and cannot be rewritten by the owner or the database owner.
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',owner_id,'role','authenticated')::text,true);
  set local role authenticated;
  update public.member_profiles set access_status='approved' where id='50000000-0000-4000-8000-000000000001';
  reset role;
  -- As the database owner, which can do more than the service role.
  update public.member_profiles set terms_accepted_at='2019-01-01',terms_version='forged' where id='50000000-0000-4000-8000-000000000001';
  select * into strict p from public.member_profiles where id='50000000-0000-4000-8000-000000000001';
  if p.access_status<>'approved' or p.terms_accepted_at<>first_time or p.terms_version<>'2026-10-21' then
    raise exception 'Acceptance record changed after signup';
  end if;

  -- The owner can read the record for every member.
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  set local role authenticated;
  if (select count(*) from public.member_profiles where id::text like '50000000-%' and terms_accepted_at is not null)<>1 then
    raise exception 'Owner cannot read acceptance records';
  end if;
  reset role;
  raise notice 'PASS terms acceptance';
end $$;
rollback;
