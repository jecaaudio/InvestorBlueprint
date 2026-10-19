-- Optimize access review/audit foreign keys without changing RLS or member data.
-- Automatically reusable in CI and new Supabase environments.
create index if not exists member_access_audit_actor_id_idx
  on public.member_access_audit (actor_id);
create index if not exists member_profiles_reviewed_by_idx
  on public.member_profiles (reviewed_by);
