-- InvestorBlueprint member-owned profile preferences (additive; no billing).
-- Only authenticated users may read or modify their own settings.
create table if not exists public.member_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 120),
  company_name text not null default '' check (char_length(company_name) <= 120),
  interface_language text not null default 'es' check (interface_language in ('es','en')),
  document_language text not null default 'es' check (document_language in ('es','en')),
  report_detail text not null default 'detailed' check (report_detail in ('summary','detailed')),
  notes_detail text not null default 'detailed' check (notes_detail in ('summary','detailed')),
  updated_at timestamptz not null default now()
);
alter table public.member_preferences enable row level security;
revoke all on public.member_preferences from PUBLIC;
revoke all on public.member_preferences from anon;
grant select,insert,update on public.member_preferences to authenticated;

create policy "Members read own preferences"
on public.member_preferences for select to authenticated
using (user_id = (select auth.uid()));

create policy "Members insert own preferences"
on public.member_preferences for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "Members update own preferences"
on public.member_preferences for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

comment on table public.member_preferences is
'User-controlled profile and document preferences. No administrative privileges or billing fields.';
