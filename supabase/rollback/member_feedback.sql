-- Emergency rollback for 20261021140000_member_feedback.sql. Deletes every stored comment.
drop table if exists public.member_feedback;
drop function if exists private.limit_member_feedback();
