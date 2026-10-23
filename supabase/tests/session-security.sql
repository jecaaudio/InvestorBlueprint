begin;
set local statement_timeout='20s';
insert into auth.users(id,email,raw_user_meta_data) values
 ('60000000-0000-4000-8000-000000000001','ib-session-a@example.invalid','{}'),
 ('60000000-0000-4000-8000-000000000002','ib-session-b@example.invalid','{}');
insert into auth.sessions(id,user_id,created_at,updated_at) values
 ('61000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001',now(),now()),
 ('61000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000001',now()-interval '9 hours',now()),
 ('61000000-0000-4000-8000-000000000003','60000000-0000-4000-8000-000000000002',now(),now());
do $$ begin
 perform set_config('request.jwt.claims','{"sub":"60000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"61000000-0000-4000-8000-000000000001"}',true);
 perform set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000001',true);
 set local role authenticated;
 if not public.ib_session_active() then raise exception 'Active session rejected'; end if;
 if (select count(*) from public.member_profiles)<>1 then raise exception 'Own profile access broken or cross-account leak'; end if;
 insert into public.member_preferences(user_id,display_name) values(auth.uid(),'Synthetic session user');
 if public.ib_accept_terms('2026-10-21') is null then raise exception 'Active acceptance broken'; end if;
 reset role;
 -- Removing a session models a successful local logout; its old JWT still has a future exp.
 delete from auth.sessions where id='61000000-0000-4000-8000-000000000001';
 set local role authenticated;
 if public.ib_session_active() then raise exception 'Revoked JWT accepted'; end if;
 if exists(select 1 from public.member_profiles) or exists(select 1 from public.member_preferences) then raise exception 'Revoked JWT reads private data'; end if;
 begin insert into public.member_preferences(user_id) values(auth.uid()); raise exception 'Revoked JWT writes private data';
 exception when insufficient_privilege then null; end;
 begin perform public.ib_accept_terms('2026-10-21'); raise exception 'Revoked JWT accepts terms';
 exception when insufficient_privilege then null; end;
 reset role;
 perform set_config('request.jwt.claims','{"sub":"60000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"61000000-0000-4000-8000-000000000002"}',true);
 set local role authenticated;
 if public.ib_session_active() then raise exception 'Nine-hour session accepted'; end if;
 reset role;
 perform set_config('request.jwt.claims','{"sub":"60000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"61000000-0000-4000-8000-000000000003"}',true);
 set local role authenticated;
 if public.ib_session_active() then raise exception 'Another user session accepted'; end if;
 reset role;
 perform set_config('request.jwt.claims','{"sub":"60000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
 set local role authenticated;
 if public.ib_session_active() then raise exception 'Missing session ID accepted'; end if;
 reset role;
 set local role anon;
 begin perform public.ib_session_active(); raise exception 'Anonymous RPC permitted'; exception when insufficient_privilege then null; end;
 reset role;
 raise notice 'PASS active session, ownership, revocation, private reads/writes, eight-hour limit and anonymous denial';
end $$;
select 'PASS session revocation, lifetime and account isolation' as result;
rollback;
