-- ---------------------------------------------------------------------------
-- UNVERIFIED — NOT EXECUTED
-- Requires validation on isolated development database before any production application.
--
-- TNG Daily — 0014 primary owner bootstrap RPC
--
-- Adds a dedicated, narrow SECURITY DEFINER RPC for the primary authenticated
-- owner bootstrap. This is a forward migration: migrations 0001–0013 are already
-- applied to development, so this file introduces the RPC without mutating
-- historical migration files or altering RLS policies.
--
-- Why an RPC instead of direct INSERT:
-- `user_roles_manage` RLS policy requires `user.manage_roles` permission.
-- An unbootstrapped first user holds no roles and therefore cannot directly
-- insert into `user_roles` through PostgREST. Rather than punching a generic
-- custom-setting exception into the `user_roles` RLS policy, this function
-- provides a narrow, parameterless, zero-owner-only entry point.
--
-- Design commitments:
--   1. Zero input parameters: caller cannot select target user, role, or expiry.
--   2. Target identity is derived strictly from `auth.uid()`.
--   3. Serialized via `pg_advisory_xact_lock(hashtextextended('tng_owner_bootstrap', 0))`.
--   4. Validates account is active (not soft-deleted, not banned, profile active).
--   5. Refuses if any active owner already exists.
--   6. Sets `tng.bootstrap_owner = 'on'` internally to satisfy escalation trigger invariants.
--   7. Writes audit log exclusively via `public.tng_write_audit_log` with no payload dump.
--   8. If audit write fails or returns null, the transaction aborts.
--   9. EXECUTE is granted strictly to `authenticated`. `anon`, `service_role`,
--      and `PUBLIC` are revoked.
--  10. Returns minimal receipt `{ "ok": true }`.
-- ---------------------------------------------------------------------------

create or replace function public.tng_bootstrap_authenticated_first_owner()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_actor uuid := auth.uid();
  v_role_id uuid;
  v_audit_id uuid;
begin
  -- 1. Must be an authenticated session
  if v_actor is null then
    raise exception 'Primary bootstrap requires an authenticated user session.'
      using errcode = 'insufficient_privilege';
  end if;

  -- 2. Concurrency serialization via transaction-scoped advisory lock
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('tng_owner_bootstrap', 0)
  );

  -- 3. Invariant: zero active owners must exist
  if public.tng_count_active_owners() <> 0 then
    raise exception 'Primary bootstrap refused: an active owner already exists.'
      using errcode = 'restrict_violation';
  end if;

  -- 4. Invariant: actor account must be active (not soft-deleted, not banned, profile active)
  if not public.tng_is_active_account(v_actor) then
    raise exception 'Primary bootstrap refused: account is not active (suspended, banned, or deleted).'
      using errcode = 'insufficient_privilege';
  end if;

  -- 5. System owner role lookup
  select r.id into v_role_id
    from public.roles r
   where r.key = 'owner'
     and r.is_system_role;

  if v_role_id is null then
    raise exception 'Owner system role is not seeded.'
      using errcode = 'feature_not_supported';
  end if;

  -- 6. Invariant: actor does not already hold owner row
  if exists (
    select 1 from public.user_roles
     where user_id = v_actor and role_id = v_role_id
  ) then
    raise exception 'Target already holds an owner assignment.'
      using errcode = 'unique_violation';
  end if;

  -- 7. Set transaction-local marker to satisfy escalation trigger invariants
  perform pg_catalog.set_config('tng.bootstrap_owner', 'on', true);

  -- 8. Insert exact owner assignment (assigned_by = v_actor, expires_at = null)
  insert into public.user_roles (user_id, role_id, assigned_by, expires_at)
  values (v_actor, v_role_id, v_actor, null);

  -- 9. Minimal audit event: zero redundant identity data in before/after payloads
  v_audit_id := public.tng_write_audit_log(
    p_action      => 'auth.owner_bootstrapped',
    p_entity_type => 'user_role',
    p_entity_id   => v_actor::text || ':' || v_role_id::text,
    p_before      => null,
    p_after       => null,
    p_metadata    => pg_catalog.jsonb_build_object(
      'bootstrap_mode', 'primary_authenticated'
    ),
    p_request_id  => null
  );

  -- 10. Audit check: if audit write fails, rollback the entire bootstrap
  if v_audit_id is null then
    raise exception 'Audit writer failed. Aborting primary owner bootstrap.'
      using errcode = 'internal_error';
  end if;

  -- 11. Minimal safe return
  return pg_catalog.jsonb_build_object('ok', true);
end;
$$;

comment on function public.tng_bootstrap_authenticated_first_owner() is
  'Primary authenticated bootstrap RPC. Allows the initial authenticated active user to claim the owner role when zero active owners exist. Accepts no parameters and derives identity from auth.uid(). Callable exclusively by authenticated; revoked from anon, service_role, and PUBLIC.';

-- ---------------------------------------------------------------------------
-- Function Grants
--
-- `authenticated` execute is necessary because the RPC is invoked via the Supabase
-- client in an authenticated session. The function accepts no arguments and
-- independently validates auth.uid() and zero-owner invariants.
-- `service_role`, `anon`, and `PUBLIC` are strictly revoked.
-- ---------------------------------------------------------------------------

revoke all on function public.tng_bootstrap_authenticated_first_owner() from public;
revoke execute on function public.tng_bootstrap_authenticated_first_owner() from anon;
revoke execute on function public.tng_bootstrap_authenticated_first_owner() from service_role;
grant execute on function public.tng_bootstrap_authenticated_first_owner() to authenticated;

-- ===========================================================================
-- Structural Assertions (static catalog checks — not proof of runtime RLS)
-- ===========================================================================

do $$
declare
  v_pronargs integer;
  v_prosecdef boolean;
  v_has_anon_execute boolean;
  v_has_service_execute boolean;
  v_has_auth_execute boolean;
  v_has_public_execute boolean;
  v_policy_cmd text;
begin
  -- 1. Function exists in public schema, has 0 input arguments, is SECURITY DEFINER
  select pronargs, prosecdef
    into v_pronargs, v_prosecdef
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = 'tng_bootstrap_authenticated_first_owner';

  if v_pronargs is null then
    raise exception 'Assertion failed: tng_bootstrap_authenticated_first_owner does not exist in public.';
  end if;

  if v_pronargs <> 0 then
    raise exception 'Assertion failed: tng_bootstrap_authenticated_first_owner must accept 0 parameters, found %.', v_pronargs;
  end if;

  if not v_prosecdef then
    raise exception 'Assertion failed: tng_bootstrap_authenticated_first_owner must be SECURITY DEFINER.';
  end if;

  -- 2. Privilege checks in information_schema.routine_privileges
  select exists (
    select 1 from information_schema.routine_privileges
     where routine_schema = 'public'
       and routine_name = 'tng_bootstrap_authenticated_first_owner'
       and grantee = 'authenticated'
       and privilege_type = 'EXECUTE'
  ) into v_has_auth_execute;

  select exists (
    select 1 from information_schema.routine_privileges
     where routine_schema = 'public'
       and routine_name = 'tng_bootstrap_authenticated_first_owner'
       and grantee = 'anon'
       and privilege_type = 'EXECUTE'
  ) into v_has_anon_execute;

  select exists (
    select 1 from information_schema.routine_privileges
     where routine_schema = 'public'
       and routine_name = 'tng_bootstrap_authenticated_first_owner'
       and grantee = 'service_role'
       and privilege_type = 'EXECUTE'
  ) into v_has_service_execute;

  select exists (
    select 1 from information_schema.routine_privileges
     where routine_schema = 'public'
       and routine_name = 'tng_bootstrap_authenticated_first_owner'
       and grantee = 'PUBLIC'
       and privilege_type = 'EXECUTE'
  ) into v_has_public_execute;

  if not v_has_auth_execute then
    raise exception 'Assertion failed: authenticated must have EXECUTE on tng_bootstrap_authenticated_first_owner.';
  end if;

  if v_has_anon_execute then
    raise exception 'Assertion failed: anon must NOT have EXECUTE on tng_bootstrap_authenticated_first_owner.';
  end if;

  if v_has_service_execute then
    raise exception 'Assertion failed: service_role must NOT have EXECUTE on tng_bootstrap_authenticated_first_owner.';
  end if;

  if v_has_public_execute then
    raise exception 'Assertion failed: PUBLIC must NOT have EXECUTE on tng_bootstrap_authenticated_first_owner.';
  end if;

  -- 3. Confirm user_roles_manage policy is intact and unchanged
  select cmd into v_policy_cmd
    from pg_policies
   where schemaname = 'public'
     and tablename = 'user_roles'
     and policyname = 'user_roles_manage';

  if v_policy_cmd is null then
    raise exception 'Assertion failed: user_roles_manage policy must exist.';
  end if;

  -- 4. Fail-closed check: authenticated and anon must NOT have direct INSERT, UPDATE, or DELETE on user_roles
  if exists (
    select 1
      from information_schema.table_privileges
     where table_schema = 'public'
       and table_name = 'user_roles'
       and grantee in ('authenticated', 'anon', 'PUBLIC')
       and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
  ) then
    raise exception
      'Assertion failed: authenticated, anon, and PUBLIC must not have direct INSERT, UPDATE, or DELETE privileges on public.user_roles.';
  end if;

  -- 5. Confirm break-glass function remains untouched and not executable by application roles
  if exists (
    select 1 from information_schema.routine_privileges
     where routine_schema = 'public'
       and routine_name = 'tng_emergency_bootstrap_first_owner'
       and grantee in ('anon', 'authenticated', 'service_role', 'PUBLIC')
       and privilege_type = 'EXECUTE'
  ) then
    raise exception 'Assertion failed: tng_emergency_bootstrap_first_owner must not be executable by application roles or PUBLIC.';
  end if;

  raise notice '0014 primary owner bootstrap RPC: all structural assertions passed.';
end $$;
