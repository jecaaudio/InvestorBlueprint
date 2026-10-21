-- Real PostgreSQL roles/RLS tests for member feedback; synthetic fixtures, always rolled back.
begin;
set local statement_timeout='20s';
insert into auth.users(id,email) values
 ('40000000-0000-4000-8000-000000000001','ib-fb-a@example.invalid'),
 ('40000000-0000-4000-8000-000000000002','ib-fb-b@example.invalid');

do $$
declare owner_id uuid; n int; i int;
begin
  select user_id into strict owner_id from private.platform_owner;

  -- Anonymous visitors cannot write or read comments.
  set local role anon;
  begin insert into public.member_feedback(tool,message) values ('flip-calculator','spam');
    raise exception 'Anon wrote feedback';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.member_feedback; raise exception 'Anon read feedback';
  exception when insufficient_privilege then null; end;
  reset role;

  -- A member adds its own comment but cannot read it back, spoof the author or set the status.
  perform set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000001',true);
  perform set_config('request.jwt.claims','{"sub":"40000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
  set local role authenticated;
  insert into public.member_feedback(tool,page,message,language)
    values ('flip-calculator','/InvestorBlueprint/tools/flip-calculator.html','The ROI label is unclear','en');
  select count(*) into n from public.member_feedback;
  if n<>0 then raise exception 'Member read stored feedback'; end if;
  begin insert into public.member_feedback(user_id,tool,message)
      values ('40000000-0000-4000-8000-000000000002','flip-calculator','forged');
    raise exception 'Member wrote feedback as another member';
  exception when insufficient_privilege then null; end;
  begin insert into public.member_feedback(tool,message,status) values ('flip-calculator','x','reviewed');
    raise exception 'Member set the review status';
  exception when insufficient_privilege then null; end;
  update public.member_feedback set status='reviewed';
  delete from public.member_feedback;
  begin insert into public.member_feedback(tool,message) values ('flip-calculator','   ');
    raise exception 'Blank feedback accepted';
  exception when check_violation then null; end;
  begin insert into public.member_feedback(tool,message) values ('flip-calculator',repeat('a',2001));
    raise exception 'Oversized feedback accepted';
  exception when check_violation then null; end;
  begin insert into public.member_feedback(tool,message) values ('<script>','x');
    raise exception 'Invalid tool id accepted';
  exception when check_violation then null; end;
  reset role;

  select count(*) into n from public.member_feedback where status='new'
    and user_id='40000000-0000-4000-8000-000000000001';
  if n<>1 then raise exception 'Member update/delete changed feedback (% new rows)',n; end if;

  -- Flood protection: the eleventh comment within an hour is refused.
  perform set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000002',true);
  perform set_config('request.jwt.claims','{"sub":"40000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
  set local role authenticated;
  for i in 1..10 loop
    insert into public.member_feedback(tool,message) values ('rent-calculator','comment '||i);
  end loop;
  begin insert into public.member_feedback(tool,message) values ('rent-calculator','one too many');
    raise exception 'Rate limit did not apply';
  exception when program_limit_exceeded then null; end;
  reset role;

  -- The owner reads every comment, marks one as reviewed and deletes another.
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform set_config('request.jwt.claims',json_build_object('sub',owner_id,'role','authenticated')::text,true);
  set local role authenticated;
  select count(*) into n from public.member_feedback
    where user_id in ('40000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002');
  if n<>11 then raise exception 'Owner sees % comments, expected 11',n; end if;
  update public.member_feedback set status='reviewed' where user_id='40000000-0000-4000-8000-000000000001';
  delete from public.member_feedback where message='comment 1';
  begin update public.member_feedback set message='edited'; raise exception 'Owner rewrote a member comment';
  exception when insufficient_privilege then null; end;
  reset role;

  select count(*) into n from public.member_feedback where status='reviewed';
  if n<>1 then raise exception 'Owner review did not apply'; end if;
  if exists (select 1 from public.member_feedback where message='comment 1') then
    raise exception 'Owner delete did not apply';
  end if;

  raise notice 'PASS member feedback';
end $$;
rollback;
