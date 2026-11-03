-- Keep the checked, owner-only write behind the same authenticated RPC.
alter function public.ib_accept_terms(text) set schema private;
revoke all on function private.ib_accept_terms(text) from public, anon, service_role;
grant execute on function private.ib_accept_terms(text) to authenticated;

create function public.ib_accept_terms(p_version text)
returns timestamptz language sql security invoker set search_path = ''
as $$ select private.ib_accept_terms(p_version); $$;
revoke all on function public.ib_accept_terms(text) from public, anon, service_role;
grant execute on function public.ib_accept_terms(text) to authenticated;
