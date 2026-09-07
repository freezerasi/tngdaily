-- Keep user_roles read-only to browser roles. Role changes must go through
-- the SECURITY DEFINER RPCs in 0015_rpc_role_management.
revoke all on table public.user_roles from public, anon, authenticated;
grant select on table public.user_roles to authenticated;

do $$
begin
  if has_table_privilege('anon', 'public.user_roles', 'INSERT')
     or has_table_privilege('anon', 'public.user_roles', 'UPDATE')
     or has_table_privilege('anon', 'public.user_roles', 'DELETE')
     or has_table_privilege('anon', 'public.user_roles', 'TRUNCATE')
     or has_table_privilege('authenticated', 'public.user_roles', 'INSERT')
     or has_table_privilege('authenticated', 'public.user_roles', 'UPDATE')
     or has_table_privilege('authenticated', 'public.user_roles', 'DELETE')
     or has_table_privilege('authenticated', 'public.user_roles', 'TRUNCATE') then
    raise exception 'Assertion failed: browser roles retain a write privilege on public.user_roles.';
  end if;

  if not has_table_privilege('authenticated', 'public.user_roles', 'SELECT') then
    raise exception 'Assertion failed: authenticated must retain SELECT on public.user_roles.';
  end if;
end;
$$;
