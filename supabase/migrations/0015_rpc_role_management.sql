-- ---------------------------------------------------------------------------
-- UNVERIFIED — NOT EXECUTED
-- Requires validation on isolated development database before any production application.
--
-- TNG Daily — 0015 RPC role management
--
-- Establishes the exclusive audited mutation path for user roles. Direct DML
-- is completely revoked from application roles. All normal role assignment,
-- expiry updates, and revocations must route through narrow SECURITY DEFINER
-- RPCs that enforce strict constraints and guarantee audit writes.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- Table Privilege Revocation & RLS Posture
-- ===========================================================================

-- Revoke all table-level DML to strictly enforce the RPC-only mutation path.
revoke insert, update, delete on table public.user_roles from PUBLIC, anon, authenticated;

-- Drop the DML-oriented policy as it is no longer the ordinary mutation path.
-- The existing `user_roles_read_self` policy (which permits SELECT for self
-- and users with `user.manage_roles`) remains untouched.
drop policy if exists user_roles_manage on public.user_roles;

-- Remove FORCE ROW LEVEL SECURITY.
-- Because direct DML is revoked at the table privilege layer, NO application role
-- can bypass and mutate this table. This change allows the SECURITY DEFINER RPCs
-- (running as the table owner) to perform audited mutation natively without needing
-- a forgeable transaction-local bypass marker.
alter table public.user_roles no force row level security;

-- ===========================================================================
-- RPC: Assign Role
-- ===========================================================================

create or replace function public.tng_assign_role(
  p_target_user_id uuid,
  p_role_key text,
  p_expires_at timestamptz default null
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_authority integer;
  v_target_authority integer;
  v_role_id uuid;
  v_audit_id uuid;
begin
  if v_actor is null then
    raise exception 'RPC requires an authenticated user session.'
      using errcode = 'insufficient_privilege';
  end if;

  if not public.tng_is_active_account(v_actor) then
    raise exception 'Actor account is not active.'
      using errcode = 'insufficient_privilege';
  end if;

  if not public.tng_has_permission('user.manage_roles') then
    raise exception 'Missing permission: user.manage_roles.'
      using errcode = 'insufficient_privilege';
  end if;

  if p_target_user_id is null then
    raise exception 'Target user ID is required.';
  end if;

  if not public.tng_is_active_account(p_target_user_id) then
    raise exception 'Target account is not active.';
  end if;

  if v_actor = p_target_user_id then
    raise exception 'Self-assignment is forbidden.'
      using errcode = 'restrict_violation';
  end if;

  if p_role_key is null then
    raise exception 'Role key cannot be null.' using errcode = 'null_value_not_allowed';
  end if;

  if p_role_key !~ '^[a-z][a-z0-9_]{2,40}$' then
    raise exception 'Invalid role key format.' using errcode = 'invalid_parameter_value';
  end if;

  if p_role_key = 'owner' then
    raise exception 'Owner role cannot be assigned through normal application RPC.'
      using errcode = 'feature_not_supported';
  end if;

  if p_expires_at is not null and p_expires_at <= now() then
    raise exception 'Expiry date must be strictly in the future.';
  end if;

  select id, authority_rank into v_role_id, v_target_authority
    from public.roles
   where key = p_role_key
     and is_system_role = true;

  if v_role_id is null then
    raise exception 'Role not found or is not a system role: %', p_role_key;
  end if;

  v_actor_authority := public.tng_user_authority(v_actor);

  -- Actor must have strictly greater authority than the role they are assigning,
  -- unless the actor is an owner (intrinsic highest authority).
  if not public.tng_user_is_owner(v_actor) and v_target_authority >= v_actor_authority then
    raise exception 'Actor lacks sufficient authority to govern target role.'
      using errcode = 'insufficient_privilege';
  end if;

  if exists (
    select 1 from public.user_roles
     where user_id = p_target_user_id and role_id = v_role_id
  ) then
    raise exception 'Target user already holds this role assignment.'
      using errcode = 'unique_violation';
  end if;

  insert into public.user_roles (user_id, role_id, assigned_by, expires_at)
  values (p_target_user_id, v_role_id, v_actor, p_expires_at);

  v_audit_id := public.tng_write_audit_log(
    p_action      => 'auth.role_assigned',
    p_entity_type => 'user_role',
    p_entity_id   => p_target_user_id::text || ':' || v_role_id::text,
    p_before      => null,
    p_after       => null,
    p_metadata    => pg_catalog.jsonb_build_object(
      'role_key', p_role_key,
      'has_expiry', (p_expires_at is not null)
    ),
    p_request_id  => null
  );

  if v_audit_id is null then
    raise exception 'Audit writer failed. Aborting role assignment.'
      using errcode = 'internal_error';
  end if;

  return pg_catalog.jsonb_build_object('ok', true);
end;
$$;

-- ===========================================================================
-- RPC: Update Role Expiry
-- ===========================================================================

create or replace function public.tng_update_role_expiry(
  p_target_user_id uuid,
  p_role_key text,
  p_expires_at timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_authority integer;
  v_target_authority integer;
  v_role_id uuid;
  v_old_expires_at timestamptz;
  v_change_type text;
  v_audit_id uuid;
begin
  if v_actor is null then
    raise exception 'RPC requires an authenticated user session.'
      using errcode = 'insufficient_privilege';
  end if;

  if not public.tng_is_active_account(v_actor) then
    raise exception 'Actor account is not active.'
      using errcode = 'insufficient_privilege';
  end if;

  if not public.tng_has_permission('user.manage_roles') then
    raise exception 'Missing permission: user.manage_roles.'
      using errcode = 'insufficient_privilege';
  end if;

  if p_target_user_id is null then
    raise exception 'Target user ID is required.';
  end if;

  if not public.tng_is_active_account(p_target_user_id) then
    raise exception 'Target account is not active.';
  end if;

  if v_actor = p_target_user_id then
    raise exception 'Self-expiry extension is forbidden.'
      using errcode = 'restrict_violation';
  end if;

  if p_role_key is null then
    raise exception 'Role key cannot be null.' using errcode = 'null_value_not_allowed';
  end if;

  if p_role_key !~ '^[a-z][a-z0-9_]{2,40}$' then
    raise exception 'Invalid role key format.' using errcode = 'invalid_parameter_value';
  end if;

  if p_role_key = 'owner' then
    raise exception 'Owner role expiry cannot be managed through normal application RPC.'
      using errcode = 'feature_not_supported';
  end if;

  if p_expires_at is null then
    raise exception 'Expiry timestamp is required.'
      using errcode = 'null_value_not_allowed';
  end if;

  if p_expires_at <= now() then
    raise exception 'Expiry date must be strictly in the future.';
  end if;

  select id, authority_rank into v_role_id, v_target_authority
    from public.roles
   where key = p_role_key
     and is_system_role = true;

  if v_role_id is null then
    raise exception 'Role not found or is not a system role: %', p_role_key;
  end if;

  v_actor_authority := public.tng_user_authority(v_actor);

  if not public.tng_user_is_owner(v_actor) and v_target_authority >= v_actor_authority then
    raise exception 'Actor lacks sufficient authority to govern target role.'
      using errcode = 'insufficient_privilege';
  end if;

  select expires_at into v_old_expires_at
    from public.user_roles
   where user_id = p_target_user_id
     and role_id = v_role_id
     for update;

  if not found then
    raise exception 'Role assignment does not exist.';
  end if;

  if v_old_expires_at is not null and v_old_expires_at = p_expires_at then
    raise exception 'Expiry date is unchanged (no-op).'
      using errcode = 'restrict_violation';
  end if;

  if v_old_expires_at is null then
    v_change_type := 'set_expiry';
  elsif p_expires_at > v_old_expires_at then
    v_change_type := 'extend_expiry';
  else
    v_change_type := 'shorten_expiry';
  end if;

  update public.user_roles
     set expires_at = p_expires_at
   where user_id = p_target_user_id
     and role_id = v_role_id;

  v_audit_id := public.tng_write_audit_log(
    p_action      => 'auth.role_expiry_updated',
    p_entity_type => 'user_role',
    p_entity_id   => p_target_user_id::text || ':' || v_role_id::text,
    p_before      => null,
    p_after       => null,
    p_metadata    => pg_catalog.jsonb_build_object(
      'role_key', p_role_key,
      'change', v_change_type
    ),
    p_request_id  => null
  );

  if v_audit_id is null then
    raise exception 'Audit writer failed. Aborting role expiry update.'
      using errcode = 'internal_error';
  end if;

  return pg_catalog.jsonb_build_object('ok', true);
end;
$$;

-- ===========================================================================
-- RPC: Revoke Role
-- ===========================================================================

create or replace function public.tng_revoke_role(
  p_target_user_id uuid,
  p_role_key text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_authority integer;
  v_target_authority integer;
  v_role_id uuid;
  v_audit_id uuid;
begin
  if v_actor is null then
    raise exception 'RPC requires an authenticated user session.'
      using errcode = 'insufficient_privilege';
  end if;

  if not public.tng_is_active_account(v_actor) then
    raise exception 'Actor account is not active.'
      using errcode = 'insufficient_privilege';
  end if;

  if not public.tng_has_permission('user.manage_roles') then
    raise exception 'Missing permission: user.manage_roles.'
      using errcode = 'insufficient_privilege';
  end if;

  if p_target_user_id is null then
    raise exception 'Target user ID is required.';
  end if;

  if v_actor = p_target_user_id then
    raise exception 'Self-revocation is forbidden.'
      using errcode = 'restrict_violation';
  end if;

  if p_role_key is null then
    raise exception 'Role key cannot be null.' using errcode = 'null_value_not_allowed';
  end if;

  if p_role_key !~ '^[a-z][a-z0-9_]{2,40}$' then
    raise exception 'Invalid role key format.' using errcode = 'invalid_parameter_value';
  end if;

  if p_role_key = 'owner' then
    raise exception 'Owner role cannot be revoked through normal application RPC.'
      using errcode = 'feature_not_supported';
  end if;

  select id, authority_rank into v_role_id, v_target_authority
    from public.roles
   where key = p_role_key
     and is_system_role = true;

  if v_role_id is null then
    raise exception 'Role not found or is not a system role: %', p_role_key;
  end if;

  v_actor_authority := public.tng_user_authority(v_actor);

  if not public.tng_user_is_owner(v_actor) and v_target_authority >= v_actor_authority then
    raise exception 'Actor lacks sufficient authority to govern target role.'
      using errcode = 'insufficient_privilege';
  end if;

  delete from public.user_roles
   where user_id = p_target_user_id
     and role_id = v_role_id;

  if not found then
    raise exception 'Role assignment does not exist.';
  end if;

  v_audit_id := public.tng_write_audit_log(
    p_action      => 'auth.role_revoked',
    p_entity_type => 'user_role',
    p_entity_id   => p_target_user_id::text || ':' || v_role_id::text,
    p_before      => null,
    p_after       => null,
    p_metadata    => pg_catalog.jsonb_build_object(
      'role_key', p_role_key
    ),
    p_request_id  => null
  );

  if v_audit_id is null then
    raise exception 'Audit writer failed. Aborting role revocation.'
      using errcode = 'internal_error';
  end if;

  return pg_catalog.jsonb_build_object('ok', true);
end;
$$;

-- ===========================================================================
-- Function Grants
-- ===========================================================================

revoke all on function public.tng_assign_role(uuid, text, timestamptz) from public;
revoke execute on function public.tng_assign_role(uuid, text, timestamptz) from anon;
revoke execute on function public.tng_assign_role(uuid, text, timestamptz) from service_role;
grant execute on function public.tng_assign_role(uuid, text, timestamptz) to authenticated;

revoke all on function public.tng_update_role_expiry(uuid, text, timestamptz) from public;
revoke execute on function public.tng_update_role_expiry(uuid, text, timestamptz) from anon;
revoke execute on function public.tng_update_role_expiry(uuid, text, timestamptz) from service_role;
grant execute on function public.tng_update_role_expiry(uuid, text, timestamptz) to authenticated;

revoke all on function public.tng_revoke_role(uuid, text) from public;
revoke execute on function public.tng_revoke_role(uuid, text) from anon;
revoke execute on function public.tng_revoke_role(uuid, text) from service_role;
grant execute on function public.tng_revoke_role(uuid, text) to authenticated;

-- ===========================================================================
-- Structural Assertions
-- ===========================================================================

do $$
declare
  v_assign_args integer;
  v_assign_secdef boolean;
  v_assign_config text[];
  v_assign_argtypes oidvector;
  v_update_args integer;
  v_update_secdef boolean;
  v_update_config text[];
  v_update_argtypes oidvector;
  v_revoke_args integer;
  v_revoke_secdef boolean;
  v_revoke_config text[];
  v_revoke_argtypes oidvector;
  v_policy_cmd text;
begin
  -- 1. Assert Direct DML is revoked from application roles and PUBLIC
  if exists (
    select 1
      from information_schema.table_privileges
     where table_schema = 'public'
       and table_name = 'user_roles'
       and grantee in ('authenticated', 'anon', 'PUBLIC')
       and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
  ) then
    raise exception 'Assertion failed: direct DML privileges must be revoked from authenticated, anon, and PUBLIC.';
  end if;

  -- 2. Assert old DML policy is dropped
  select cmd into v_policy_cmd
    from pg_policies
   where schemaname = 'public'
     and tablename = 'user_roles'
     and policyname = 'user_roles_manage';

  if v_policy_cmd is not null then
    raise exception 'Assertion failed: user_roles_manage policy must be dropped.';
  end if;
  
  -- 3. Assert no public/anon SELECT policy exists
  if exists (
    select 1
      from pg_policies
     where schemaname = 'public'
       and tablename = 'user_roles'
       and cmd = 'SELECT'
       and (roles @> array['public'::name] or roles @> array['anon'::name])
  ) then
    raise exception 'Assertion failed: PUBLIC/anon SELECT policy must not exist on user_roles.';
  end if;

  -- 4. Function signatures, SECURITY DEFINER flags, and proconfig array
  select pronargs, prosecdef, proconfig, proargtypes into v_assign_args, v_assign_secdef, v_assign_config, v_assign_argtypes
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'tng_assign_role';
   
  select pronargs, prosecdef, proconfig, proargtypes into v_update_args, v_update_secdef, v_update_config, v_update_argtypes
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'tng_update_role_expiry';
   
  select pronargs, prosecdef, proconfig, proargtypes into v_revoke_args, v_revoke_secdef, v_revoke_config, v_revoke_argtypes
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'tng_revoke_role';

  if coalesce(v_assign_args, -1) <> 3 or not coalesce(v_assign_secdef, false) then
    raise exception 'Assertion failed: tng_assign_role signature/secdef mismatch.';
  end if;
  
  if coalesce(v_update_args, -1) <> 3 or not coalesce(v_update_secdef, false) then
    raise exception 'Assertion failed: tng_update_role_expiry signature/secdef mismatch.';
  end if;
  
  if coalesce(v_revoke_args, -1) <> 2 or not coalesce(v_revoke_secdef, false) then
    raise exception 'Assertion failed: tng_revoke_role signature/secdef mismatch.';
  end if;

  if array_position(v_assign_config, 'search_path=pg_catalog, public, auth') is null then
    raise exception 'Assertion failed: tng_assign_role must have strict search_path.';
  end if;

  if array_position(v_update_config, 'search_path=pg_catalog, public, auth') is null then
    raise exception 'Assertion failed: tng_update_role_expiry must have strict search_path.';
  end if;

  if array_position(v_revoke_config, 'search_path=pg_catalog, public, auth') is null then
    raise exception 'Assertion failed: tng_revoke_role must have strict search_path.';
  end if;

  -- 5. Effective EXECUTE tests (via has_function_privilege)
  -- Tests both direct grants and any inherited PUBLIC grants
  
  -- tng_assign_role
  if not has_function_privilege('authenticated', 'public.tng_assign_role(uuid, text, timestamptz)', 'EXECUTE') then
    raise exception 'Assertion failed: authenticated must have EXECUTE on tng_assign_role.';
  end if;
  if has_function_privilege('anon', 'public.tng_assign_role(uuid, text, timestamptz)', 'EXECUTE') then
    raise exception 'Assertion failed: anon must NOT have EXECUTE on tng_assign_role.';
  end if;
  if has_function_privilege('service_role', 'public.tng_assign_role(uuid, text, timestamptz)', 'EXECUTE') then
    raise exception 'Assertion failed: service_role must NOT have EXECUTE on tng_assign_role.';
  end if;

  -- tng_update_role_expiry
  if not has_function_privilege('authenticated', 'public.tng_update_role_expiry(uuid, text, timestamptz)', 'EXECUTE') then
    raise exception 'Assertion failed: authenticated must have EXECUTE on tng_update_role_expiry.';
  end if;
  if has_function_privilege('anon', 'public.tng_update_role_expiry(uuid, text, timestamptz)', 'EXECUTE') then
    raise exception 'Assertion failed: anon must NOT have EXECUTE on tng_update_role_expiry.';
  end if;
  if has_function_privilege('service_role', 'public.tng_update_role_expiry(uuid, text, timestamptz)', 'EXECUTE') then
    raise exception 'Assertion failed: service_role must NOT have EXECUTE on tng_update_role_expiry.';
  end if;

  -- tng_revoke_role
  if not has_function_privilege('authenticated', 'public.tng_revoke_role(uuid, text)', 'EXECUTE') then
    raise exception 'Assertion failed: authenticated must have EXECUTE on tng_revoke_role.';
  end if;
  if has_function_privilege('anon', 'public.tng_revoke_role(uuid, text)', 'EXECUTE') then
    raise exception 'Assertion failed: anon must NOT have EXECUTE on tng_revoke_role.';
  end if;
  if has_function_privilege('service_role', 'public.tng_revoke_role(uuid, text)', 'EXECUTE') then
    raise exception 'Assertion failed: service_role must NOT have EXECUTE on tng_revoke_role.';
  end if;

  -- 6. Ensure existing triggers remain
  if not exists (select 1 from pg_trigger where tgname = 'user_roles_guard_assignment') then
    raise exception 'Assertion failed: user_roles_guard_assignment trigger missing.';
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'user_roles_guard_revocation') then
    raise exception 'Assertion failed: user_roles_guard_revocation trigger missing.';
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'user_roles_protect_last_owner') then
    raise exception 'Assertion failed: user_roles_protect_last_owner trigger missing.';
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'profiles_protect_owner_account') then
    raise exception 'Assertion failed: profiles_protect_owner_account trigger missing.';
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'audit_logs_no_update') then
    raise exception 'Assertion failed: audit_logs_no_update trigger missing.';
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'audit_logs_no_delete') then
    raise exception 'Assertion failed: audit_logs_no_delete trigger missing.';
  end if;

  -- 7. Ensure 0014 bootstrap RPC exists
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'tng_bootstrap_authenticated_first_owner'
  ) then
    raise exception 'Assertion failed: 0014 tng_bootstrap_authenticated_first_owner must exist prior to 0015.';
  end if;

  -- 8. Ensure break-glass exists and is non-executable by application roles
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'tng_emergency_bootstrap_first_owner'
  ) then
    raise exception 'Assertion failed: break-glass function must exist.';
  end if;
  if has_function_privilege('authenticated', 'public.tng_emergency_bootstrap_first_owner(uuid)', 'EXECUTE') then
    raise exception 'Assertion failed: authenticated must NOT have EXECUTE on break-glass function.';
  end if;
  if has_function_privilege('anon', 'public.tng_emergency_bootstrap_first_owner(uuid)', 'EXECUTE') then
    raise exception 'Assertion failed: anon must NOT have EXECUTE on break-glass function.';
  end if;
  if has_function_privilege('service_role', 'public.tng_emergency_bootstrap_first_owner(uuid)', 'EXECUTE') then
    raise exception 'Assertion failed: service_role must NOT have EXECUTE on break-glass function.';
  end if;

  -- 9. Verify mock-content/media/public gates are intact (not dropped)
  if not exists (select 1 from pg_policies where policyname = 'articles_public_read') then
    raise exception 'Assertion failed: articles_public_read policy missing.';
  end if;

  raise notice '0015 RPC role management: all structural assertions passed.';
end $$;
