-- ---------------------------------------------------------------------------
-- UNVERIFIED — NOT EXECUTED
-- Requires local Docker + Supabase CLI testing before any non-local application.
--
-- Nothing in this file has been run. The preflight report it produces has NOT
-- been generated: there is no database to inventory. Every count, mapping, and
-- outcome below is logic awaiting execution, not an observed result.
--
-- Verification procedure: docs/RLS_TESTING.md
-- Forward repair:         docs/RBAC_FORWARD_REPAIR.md
-- ---------------------------------------------------------------------------
--
-- TNG Daily — 0012 legacy role migration
--
-- Migrates `profiles.role` (enum `tng_user_role`) into `user_roles` rows, then
-- drops the column and the three helper functions that read it.
--
-- Design commitments, all fail-closed:
--
--   1. No legacy value maps to `owner`. Ever. `admin` becomes
--      `managing_editor`, which deliberately holds no privileged permission.
--      Ownership is granted exclusively by the manual bootstrap in
--      docs/OWNER_BOOTSTRAP.md.
--
--   2. An unmapped, null, or unrecognised legacy value ABORTS the migration.
--      The column is not dropped, nothing is half-migrated, and the operator
--      gets a remediation message naming the offending rows.
--
--   3. The column is dropped only after every internal profile is verified to
--      hold a mapped assignment. Verification precedes destruction, in that
--      order, in the same transaction.
--
--   4. `reader` maps to NOTHING. A reader is a member of the public who
--      happened to create an account; granting them a CMS role would be an
--      unrequested privilege escalation across the whole existing user base.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- PART 1 — PREFLIGHT (read-only)
--
-- Run these BEFORE the migration and read the output. They mutate nothing.
--
--   psql "$LOCAL_DB_URL" -f supabase/migrations/0012_legacy_role_migration.sql
--
-- is NOT how to run a preflight: the file continues into a transaction that
-- mutates. Copy this section into a session on its own first.
-- ===========================================================================

-- PREFLIGHT 1 — Distribution of legacy roles.
-- Expect: a small number of internal accounts, and possibly many readers.
--
--   select role, count(*) as accounts, count(*) filter (where status <> 'active') as inactive
--     from public.profiles
--    group by role
--    order by role;

-- PREFLIGHT 2 — Every internal account, with its proposed mapping.
-- This is the report to read line by line before proceeding. It names each
-- account that will gain a CMS role.
--
--   select
--     p.id,
--     p.username,
--     p.status,
--     p.role                          as legacy_role,
--     case p.role
--       when 'admin'       then 'managing_editor'
--       when 'editor'      then 'editor'
--       when 'contributor' then 'contributor'
--       when 'reader'      then '(none — no internal role)'
--       else '(UNMAPPED — migration will abort)'
--     end                             as proposed_role,
--     p.created_at
--   from public.profiles p
--   where p.role <> 'reader'
--   order by p.role, p.created_at;

-- PREFLIGHT 3 — Values with no mapping. MUST return zero rows.
--
--   select distinct role
--     from public.profiles
--    where role is null
--       or role::text not in ('reader', 'contributor', 'editor', 'admin');

-- PREFLIGHT 4 — Legacy admin count, and owner-bootstrap candidates.
-- Every one of these becomes managing_editor, NOT owner. Choose one manually
-- for the bootstrap afterwards.
--
--   select p.id, p.username, p.status, p.created_at
--     from public.profiles p
--    where p.role = 'admin'
--    order by p.created_at
--    limit 20;

-- PREFLIGHT 5 — Confirm no active owner exists yet. MUST return 0.
--
--   select public.tng_count_active_owners() as active_owners;

-- PREFLIGHT 6 — Confirm prerequisites are installed.
-- All four MUST return true.
--
--   select
--     to_regclass('public.roles')            is not null as roles_table,
--     to_regclass('public.user_roles')       is not null as user_roles_table,
--     to_regproc('public.tng_has_permission') is not null as permission_helper,
--     (select count(*) from public.roles where is_system_role) = 8 as eight_roles;

-- PREFLIGHT 7 — Confirm the policy rewrite landed. MUST return zero rows.
-- A surviving legacy reference means 0011 did not complete, and dropping the
-- helpers here would break those policies.
--
--   select policyname, tablename
--     from pg_policies
--    where schemaname = 'public'
--      and (coalesce(qual, '') || coalesce(with_check, '')) ~
--          '(tng_is_editor|tng_is_admin|tng_current_role\()';

-- ===========================================================================
-- PART 2 — MIGRATION
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- Guard 1: prerequisites
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.user_roles') is null then
    raise exception
      'user_roles does not exist. Apply 0008 through 0010 before this migration.';
  end if;

  if (select count(*) from public.roles where is_system_role) <> 8 then
    raise exception
      'Expected 8 seeded system roles, found %. Apply 0010 before this migration.',
      (select count(*) from public.roles where is_system_role);
  end if;

  -- Nothing may proceed while a policy still depends on a helper we are about
  -- to drop.
  if exists (
    select 1 from pg_policies
     where schemaname = 'public'
       and (coalesce(qual, '') || coalesce(with_check, '')) ~
           '(tng_is_editor|tng_is_admin|tng_current_role\()'
  ) then
    raise exception
      'Policies still reference legacy role helpers. Apply 0011 before this migration. Offending: %',
      (
        select string_agg(policyname || ' on ' || tablename, ', ')
          from pg_policies
         where schemaname = 'public'
           and (coalesce(qual, '') || coalesce(with_check, '')) ~
               '(tng_is_editor|tng_is_admin|tng_current_role\()'
      );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Guard 2: is there even a legacy column?
--
-- A fresh database that never ran the old schema has nothing to migrate. That
-- is a valid state, not an error: the migration records the fact and skips to
-- the helper cleanup.
-- ---------------------------------------------------------------------------

do $$
declare
  has_legacy_column boolean;
  unmapped text;
  internal_count integer;
begin
  select exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'profiles'
       and column_name = 'role'
  ) into has_legacy_column;

  if not has_legacy_column then
    raise notice
      'No profiles.role column present. Nothing to migrate. This is expected on a database that never ran the pre-0008 schema.';
    return;
  end if;

  -- ---------------------------------------------------------------------------
  -- Guard 3: fail closed on anything unmapped
  -- ---------------------------------------------------------------------------

  execute $q$
    select string_agg(distinct coalesce(role::text, '<NULL>'), ', ')
      from public.profiles
     where role is null
        or role::text not in ('reader', 'contributor', 'editor', 'admin')
  $q$ into unmapped;

  if unmapped is not null then
    raise exception
      'Unmapped legacy role values found: %. Remediation: correct these rows to a known value, or extend the mapping in this migration deliberately. The legacy column has NOT been dropped.',
      unmapped;
  end if;

  execute 'select count(*) from public.profiles where role <> ''reader'''
    into internal_count;

  raise notice 'Legacy internal accounts to migrate: %', internal_count;
end $$;

-- ---------------------------------------------------------------------------
-- The mapping, as data rather than as branching logic.
--
--   reader      -> nothing. Not internal staff.
--   contributor -> contributor
--   editor      -> editor
--   admin       -> managing_editor   (NOT owner, by design)
--
-- `managing_editor` holds no privileged permission, so a legacy admin gains
-- editorial publishing and homepage curation but NOT: AI provider config, API
-- secrets, role management, feature flags, integrations, or audit log access.
-- That narrowing is the point of the migration.
-- ---------------------------------------------------------------------------

create temporary table tng_legacy_role_map (
  legacy_value text primary key,
  new_role_key text
) on commit drop;

insert into tng_legacy_role_map (legacy_value, new_role_key) values
  ('reader',      null),
  ('contributor', 'contributor'),
  ('editor',      'editor'),
  ('admin',       'managing_editor');

-- ---------------------------------------------------------------------------
-- Assign the mapped roles.
--
-- No bypass flag. A migration runs without `auth.uid()`, and
-- `tng_guard_role_assignment` permits an actor-null INSERT for any non-owner
-- role: the service role is already outside RLS, so a row-level actor check adds
-- nothing there. The mapping table below contains no owner row, and the trigger
-- independently refuses an actor-null owner INSERT, so ownership cannot arrive
-- through this path even if the map were edited by mistake.
--
-- An earlier revision of this file set `tng.bootstrap_owner` here. That was
-- wrong twice over: it was unnecessary, because the actor-null path already
-- permits these inserts, and it established a flag named "bootstrap owner" as a
-- general-purpose way to silence authorization triggers. Removed deliberately.
-- ---------------------------------------------------------------------------

do $$
declare
  has_legacy_column boolean;
  inserted integer;
begin
  select exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'profiles'
       and column_name = 'role'
  ) into has_legacy_column;

  if not has_legacy_column then
    return;
  end if;

  execute $q$
    insert into public.user_roles (user_id, role_id, assigned_by, assigned_at)
    select p.id, r.id, null, now()
      from public.profiles p
      join tng_legacy_role_map m on m.legacy_value = p.role::text
      join public.roles r on r.key = m.new_role_key
     where m.new_role_key is not null
    on conflict (user_id, role_id) do nothing
  $q$;

  get diagnostics inserted = row_count;
  raise notice 'Role assignments created: %', inserted;
end $$;

-- ---------------------------------------------------------------------------
-- Guard 4: verify before destroying
--
-- Every internal profile must now hold its mapped role. If even one is missing,
-- abort: the column stays, the helpers stay, and the operator can investigate
-- with the data intact.
-- ---------------------------------------------------------------------------

do $$
declare
  has_legacy_column boolean;
  missing text;
begin
  select exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'profiles'
       and column_name = 'role'
  ) into has_legacy_column;

  if not has_legacy_column then
    return;
  end if;

  execute $q$
    select string_agg(p.id::text || ' (' || p.role::text || ')', ', ')
      from public.profiles p
      join tng_legacy_role_map m on m.legacy_value = p.role::text
     where m.new_role_key is not null
       and not exists (
         select 1
           from public.user_roles ur
           join public.roles r on r.id = ur.role_id
          where ur.user_id = p.id
            and r.key = m.new_role_key
       )
  $q$ into missing;

  if missing is not null then
    raise exception
      'Verification failed. These internal profiles have no mapped role: %. The legacy column has NOT been dropped.',
      missing;
  end if;

  raise notice 'Verification passed: every internal profile holds its mapped role.';
end $$;

-- ---------------------------------------------------------------------------
-- Guard 5: no owner was created
--
-- Belt and braces. If this migration somehow produced an owner, that is a
-- serious defect and the transaction must not commit.
-- ---------------------------------------------------------------------------

do $$
begin
  if public.tng_count_active_owners() > 0 then
    raise exception
      'This migration must not create an owner, but % active owner(s) exist. Aborting. Ownership is granted only by the manual bootstrap in docs/OWNER_BOOTSTRAP.md.',
      public.tng_count_active_owners();
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Record the migration as a system audit event.
--
-- Uses the controlled audit writer `public.tng_write_audit_log`.
-- Since migration execution has no `auth.uid()`, `actor_id = NULL` is expected
-- and derived naturally by the function (no actor override parameter).
--
-- The event establishes that migration logic ran without dumping user IDs,
-- emails, legacy role values, full mapping rows, credentials, or raw SQL.
-- If the audit write fails or returns NULL, the migration aborts.
-- ---------------------------------------------------------------------------

do $$
declare
  v_audit_id uuid;
begin
  v_audit_id := public.tng_write_audit_log(
    p_action      => 'rbac.legacy_roles_migrated',
    p_entity_type => 'migration',
    p_entity_id   => '0012_legacy_role_migration',
    p_before      => null,
    p_after       => null,
    p_metadata    => jsonb_build_object(
      'migration', '0012_legacy_role_migration',
      'mode', 'system_migration'
    )
  );

  if v_audit_id is null then
    raise exception '0012 legacy role migration failed: audit event could not be written.'
      using errcode = 'internal_error';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Drop the legacy column and its helpers.
--
-- Only reached if every guard above passed. Order matters: the column goes
-- first, then the functions that read it, so nothing is left referencing a
-- vanished column.
-- ---------------------------------------------------------------------------

alter table public.profiles drop column if exists role;

-- These three read `profiles.role` and cannot survive it. 0011 already
-- verified no policy depends on them.
drop function if exists public.tng_current_role();
drop function if exists public.tng_is_editor();
drop function if exists public.tng_is_admin();

-- The trigger that stamped a default role on signup: `tng_handle_new_user`
-- inserted `role = 'reader'`. Replaced with a version that creates the profile
-- and no role at all, since a new signup is a member of the public until an
-- owner invites them into a role.
create or replace function public.tng_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, status)
  values (
    new.id,
    nullif(regexp_replace(lower(split_part(coalesce(new.email, ''), '@', 1)), '[^a-z0-9_.-]', '', 'g'), ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)),
    'active'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- The old enum is now unreferenced. Dropped separately so a failure here does
-- not roll back the whole migration: an orphan type is untidy, not dangerous.
drop type if exists tng_user_role;

-- ---------------------------------------------------------------------------
-- Final assertion
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'profiles'
       and column_name = 'role'
  ) then
    raise exception 'profiles.role still present after drop.';
  end if;

  if to_regproc('public.tng_is_admin') is not null then
    raise exception 'tng_is_admin still present after drop.';
  end if;

  raise notice
    'Legacy role migration complete in-transaction. Next step: run the owner bootstrap from docs/OWNER_BOOTSTRAP.md.';
end $$;

commit;
