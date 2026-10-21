-- Comments members send from the "Send feedback" button inside the calculators.
-- A member can only add its own comments; only the approved owner reads and manages them.
create table if not exists public.member_feedback (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tool text not null check (tool ~ '^[a-z0-9-]{1,60}$'),
  page text not null default '' check (char_length(page) <= 300),
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  language text not null default 'es' check (language in ('es','en')),
  status text not null default 'new' check (status in ('new','reviewed')),
  created_at timestamptz not null default now()
);
create index if not exists member_feedback_created_idx on public.member_feedback(created_at desc);
create index if not exists member_feedback_user_created_idx on public.member_feedback(user_id,created_at desc);

alter table public.member_feedback enable row level security;
revoke all on public.member_feedback from public, anon, authenticated;
-- Column grants: a member cannot choose the author, status or timestamp.
grant insert(tool,page,message,language) on public.member_feedback to authenticated;
grant select, delete on public.member_feedback to authenticated;
grant update(status) on public.member_feedback to authenticated;

drop policy if exists member_feedback_insert_own on public.member_feedback;
drop policy if exists member_feedback_owner_read on public.member_feedback;
drop policy if exists member_feedback_owner_update on public.member_feedback;
drop policy if exists member_feedback_owner_delete on public.member_feedback;
create policy member_feedback_insert_own on public.member_feedback
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy member_feedback_owner_read on public.member_feedback
  for select to authenticated using ((select private.is_approved_admin()));
create policy member_feedback_owner_update on public.member_feedback
  for update to authenticated using ((select private.is_approved_admin()))
  with check ((select private.is_approved_admin()));
create policy member_feedback_owner_delete on public.member_feedback
  for delete to authenticated using ((select private.is_approved_admin()));

-- At most 10 comments per member per hour, so the form cannot be used to flood the table.
create or replace function private.limit_member_feedback()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.member_feedback f
      where f.user_id=new.user_id and f.created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Too many comments; try again later' using errcode='54000';
  end if;
  return new;
end;
$$;
revoke all on function private.limit_member_feedback() from public, anon, authenticated, service_role;
drop trigger if exists ib_limit_member_feedback on public.member_feedback;
create trigger ib_limit_member_feedback before insert on public.member_feedback
for each row execute function private.limit_member_feedback();
