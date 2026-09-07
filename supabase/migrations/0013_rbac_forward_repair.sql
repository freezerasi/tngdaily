-- ---------------------------------------------------------------------------
-- UNVERIFIED — NOT EXECUTED
-- Requires local Docker + Supabase CLI testing before any non-local application.
--
-- Nothing in this file has been run against Postgres. Every statement below is
-- a stated intent awaiting execution. No structural assertion has been observed
-- to pass or fail.
--
-- Verification procedure: docs/RLS_TESTING.md
-- Explanation:              docs/RBAC_FORWARD_REPAIR.md
-- ---------------------------------------------------------------------------
--
-- TNG Daily — 0013 RBAC forward repair
--
-- Runs after 0012. This migration addresses gaps and residual artifacts that
-- 0011 and 0012 could not fix within their own transaction scope, and adds
-- belt-and-braces safety for the post-migration state.
--
-- What this migration does:
--
--   1. Drops legacy policy names from 0005 that 0011 renamed but may not have
--      explicitly dropped (if 0011 already dropped them, these are no-ops).
--   2. Reconciles execute grants after 0012 drops legacy functions.
--   3. Adds explicit service-role revokes on authorization tables to narrow
--      the PostgREST surface — service_role bypasses RLS by design, so this
--      controls the API surface, not the privilege.
--   4. Verifies indexes from 0008–0011 are present.
--   5. Asserts structural consistency of the complete post-migration state.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- PART 1 — Stale policy cleanup
--
-- 0011 drops-then-creates, but uses `DROP POLICY IF EXISTS` only for the names
-- it replaces. These are the 0005 policy names that were superseded by a
-- renamed policy in 0011 (e.g. `articles_editor_read` → `articles_internal_read`).
-- If 0011 already dropped them, `DROP POLICY IF EXISTS` is a no-op.
-- ===========================================================================

-- profiles: `profiles_admin_all` was replaced by `profiles_suspend` + `profiles_owner_delete`
drop policy if exists profiles_admin_all on public.profiles;

-- articles: `articles_editor_read` → `articles_internal_read`
drop policy if exists articles_editor_read on public.articles;
-- articles: `articles_editor_insert` → `articles_create`
drop policy if exists articles_editor_insert on public.articles;
-- articles: `articles_editor_update` → `articles_update`
drop policy if exists articles_editor_update on public.articles;
-- articles: `articles_admin_delete` → `articles_owner_delete`
drop policy if exists articles_admin_delete on public.articles;

-- article_sources: `article_sources_editor_all` split into `_internal_read` + `_write`
drop policy if exists article_sources_editor_all on public.article_sources;

-- article_images: `article_images_editor_all` split into `_internal_read` + `_write` + `_update` + `_delete`
drop policy if exists article_images_editor_all on public.article_images;

-- reactions: `reactions_editor_read` → `reactions_analytics_read`
drop policy if exists reactions_editor_read on public.reactions;

-- contributions: `contributions_editor_read` → `contributions_read`
drop policy if exists contributions_editor_read on public.contributions;
-- contributions: `contributions_editor_update` → `contributions_moderate`
drop policy if exists contributions_editor_update on public.contributions;
-- contributions: `contributions_admin_delete` → `contributions_owner_delete`
drop policy if exists contributions_admin_delete on public.contributions;

-- directory: `directory_editor_all` → `directory_manage`
drop policy if exists directory_editor_all on public.directory_listings;

-- ai_providers: `ai_providers_admin_all` → `ai_providers_owner_all`
drop policy if exists ai_providers_admin_all on public.ai_providers;

-- ai_usage_log: `ai_usage_log_admin_read` → `ai_usage_log_read`
drop policy if exists ai_usage_log_admin_read on public.ai_usage_log;

-- ai_prompt_templates: `ai_prompt_templates_editor_read` → `ai_prompt_templates_read`
drop policy if exists ai_prompt_templates_editor_read on public.ai_prompt_templates;
-- ai_prompt_templates: `ai_prompt_templates_admin_write` → `ai_prompt_templates_owner_write`
drop policy if exists ai_prompt_templates_admin_write on public.ai_prompt_templates;

-- ai_generation_jobs: `ai_generation_jobs_editor_read` → `ai_generation_jobs_read`
drop policy if exists ai_generation_jobs_editor_read on public.ai_generation_jobs;
-- ai_generation_jobs: `ai_generation_jobs_editor_write` → `ai_generation_jobs_write`
drop policy if exists ai_generation_jobs_editor_write on public.ai_generation_jobs;

-- rewrite_jobs: `rewrite_jobs_editor_all` split into `_read` + `_write` + `_update`
drop policy if exists rewrite_jobs_editor_all on public.rewrite_jobs;

-- storage: `contributions_bucket_editor_write` → `contributions_bucket_write`
drop policy if exists contributions_bucket_editor_write on storage.objects;

-- ===========================================================================
-- PART 2 — Service-role API surface confinement
--
-- `service_role` bypasses RLS by design; these REVOKEs do not change that.
-- What they do: remove unused table-level privileges from the API role so that
-- a compromised server action cannot issue arbitrary DML on authorization
-- tables through PostgREST. The DAL uses the specific SECURITY DEFINER
-- functions for all authorized writes.
--
-- See docs/SERVICE_ROLE_CONFINEMENT.md for rationale.
-- ===========================================================================

-- audit_logs: writes go through tng_write_audit_log exclusively.
-- service_role needs SELECT for audit reads and the function needs INSERT
-- internally (via SECURITY DEFINER), so no direct INSERT/UPDATE/DELETE grant
-- is needed for service_role on the table itself.
revoke insert, update, delete on public.audit_logs from service_role;

-- ai_api_keys: service_role manages these through DAL functions only.
-- No API role should have direct table access.
revoke all on public.ai_api_keys from anon;
revoke all on public.ai_api_keys from authenticated;
-- service_role keeps select for reads but loses direct mutation.
revoke insert, update, delete on public.ai_api_keys from service_role;

-- ===========================================================================
-- PART 3 — Index verification (idempotent)
--
-- These are defined in 0008 and 0011. Repeating them here is belt-and-braces:
-- if 0008 was rolled back and replayed, or if a manual intervention dropped an
-- index, the forward state is still correct.
-- ===========================================================================

-- From 0008
create index if not exists profiles_status_idx
  on public.profiles (status)
  where status <> 'active';

create index if not exists role_permissions_permission_idx
  on public.role_permissions (permission_id);

create index if not exists user_roles_user_idx on public.user_roles (user_id);
create index if not exists user_roles_role_idx on public.user_roles (role_id);
create index if not exists user_roles_active_idx
  on public.user_roles (user_id)
  where expires_at is null;

create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
create index if not exists audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id, created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs (action, created_at desc);

create index if not exists invitations_email_idx on public.invitations (lower(email));
create index if not exists invitations_pending_idx
  on public.invitations (expires_at)
  where status = 'pending';

create index if not exists permissions_group_idx on public.permissions (group_name);

-- From 0011
create index if not exists articles_public_gate_idx
  on public.articles (published_at desc)
  where status = 'published'
    and visibility = 'public'
    and content_environment = 'production'
    and is_mock = false
    and deleted_at is null;

-- ===========================================================================
-- PART 4 — Grant reconciliation
--
-- After 0012 drops `tng_current_role`, `tng_is_editor`, and `tng_is_admin`,
-- verify that the execute grants on the replacement functions are correct.
-- These are all defined in 0009 but repeated here for forward-repair safety.
-- ===========================================================================

-- Public-gate helpers added in 0011 need anon access for public read policies.
grant execute on function public.tng_is_publicly_publishable(uuid)
  to anon, authenticated, service_role;
grant execute on function public.tng_is_public_media(uuid)
  to anon, authenticated, service_role;

-- Status-transition helper is internal; only authenticated needs it (triggers
-- fire in the caller's session).
revoke all on function public.tng_required_status_permission(tng_article_status, tng_article_status) from public;
grant execute on function public.tng_required_status_permission(tng_article_status, tng_article_status)
  to authenticated, service_role;

-- media_provenance_queue view from 0011.
revoke all on public.media_provenance_queue from anon;
grant select on public.media_provenance_queue to authenticated;

-- ===========================================================================
-- PART 5 — Structural assertions
--
-- Every assertion below must pass for the migration to succeed. They verify
-- the complete post-migration state, not just what this file changed.
-- ===========================================================================

do $$
declare
  missing text;
  offender text;
  cnt integer;
begin
  -- -----------------------------------------------------------------------
  -- 5.1  Legacy artifacts are gone.
  -- -----------------------------------------------------------------------

  -- The legacy column must not exist.
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'profiles'
       and column_name = 'role'
  ) then
    raise exception
      'profiles.role still exists. 0012 did not complete. Do not apply 0013 until 0012 succeeds.';
  end if;

  -- The legacy functions must not exist.
  if to_regproc('public.tng_current_role') is not null then
    raise exception 'tng_current_role still exists after 0012.';
  end if;

  if to_regproc('public.tng_is_editor') is not null then
    raise exception 'tng_is_editor still exists after 0012.';
  end if;

  if to_regproc('public.tng_is_admin') is not null then
    raise exception 'tng_is_admin still exists after 0012.';
  end if;

  -- The legacy enum must not exist.
  if exists (
    select 1 from pg_type
     where typname = 'tng_user_role'
       and typnamespace = 'public'::regnamespace
  ) then
    raise exception 'tng_user_role enum still exists after 0012.';
  end if;

  -- -----------------------------------------------------------------------
  -- 5.2  No policy references a legacy helper.
  -- -----------------------------------------------------------------------

  select string_agg(policyname || ' on ' || tablename, ', ')
    into offender
    from pg_policies
   where schemaname = 'public'
     and (
       coalesce(qual, '') ~ '(tng_is_editor|tng_is_admin|tng_current_role\()'
       or coalesce(with_check, '') ~ '(tng_is_editor|tng_is_admin|tng_current_role\()'
     );

  if offender is not null then
    raise exception 'Policies still reference legacy helpers: %', offender;
  end if;

  -- -----------------------------------------------------------------------
  -- 5.3  All expected RBAC policies exist (from 0009 + 0011).
  -- -----------------------------------------------------------------------

  declare
    expected_policies text[] := array[
      -- From 0009 (authorization tables)
      'roles_read_authenticated', 'roles_owner_write',
      'permissions_read_authenticated', 'permissions_owner_write',
      'role_permissions_read', 'role_permissions_owner_write',
      'user_roles_read_self', 'user_roles_manage',
      'audit_logs_owner_read',
      'invitations_read', 'invitations_manage',
      'feature_flags_read', 'feature_flags_manage',
      -- From 0011 (domain tables)
      'profiles_select_self', 'profiles_update_self',
      'profiles_suspend', 'profiles_owner_delete',
      'articles_public_read', 'articles_internal_read',
      'articles_create', 'articles_update', 'articles_owner_delete',
      'article_sources_public_read', 'article_sources_internal_read',
      'article_sources_write',
      'article_images_public_read', 'article_images_internal_read',
      'article_images_write', 'article_images_update', 'article_images_delete',
      'reactions_public_insert', 'reactions_analytics_read',
      'contributions_read', 'contributions_moderate', 'contributions_owner_delete',
      'directory_public_read', 'directory_manage',
      'ai_providers_owner_all', 'ai_usage_log_read',
      'ai_prompt_templates_read', 'ai_prompt_templates_owner_write',
      'ai_generation_jobs_read', 'ai_generation_jobs_write',
      'ai_generation_jobs_update',
      'rewrite_jobs_read', 'rewrite_jobs_write', 'rewrite_jobs_update'
    ];
  begin
    select string_agg(e, ', ')
      into missing
      from unnest(expected_policies) e
     where not exists (
       select 1 from pg_policies
        where (schemaname = 'public' and policyname = e)
     );

    if missing is not null then
      raise exception 'Expected policies missing: %', missing;
    end if;
  end;

  -- -----------------------------------------------------------------------
  -- 5.4  RBAC foundation tables exist and are populated.
  -- -----------------------------------------------------------------------

  if to_regclass('public.roles') is null then
    raise exception 'roles table missing.';
  end if;

  if to_regclass('public.permissions') is null then
    raise exception 'permissions table missing.';
  end if;

  if to_regclass('public.user_roles') is null then
    raise exception 'user_roles table missing.';
  end if;

  if to_regclass('public.role_permissions') is null then
    raise exception 'role_permissions table missing.';
  end if;

  -- 8 system roles from 0010.
  select count(*) into cnt from public.roles where is_system_role;
  if cnt <> 8 then
    raise exception 'Expected 8 system roles, found %.', cnt;
  end if;

  -- 47 permissions from 0010.
  select count(*) into cnt from public.permissions;
  if cnt <> 47 then
    raise exception 'Expected 47 permissions, found %.', cnt;
  end if;

  -- -----------------------------------------------------------------------
  -- 5.5  Authorization functions exist.
  -- -----------------------------------------------------------------------

  if to_regproc('public.tng_has_permission') is null then
    raise exception 'tng_has_permission missing.';
  end if;

  if to_regproc('public.tng_is_owner') is null then
    raise exception 'tng_is_owner missing.';
  end if;

  if to_regproc('public.tng_is_active_account') is null then
    raise exception 'tng_is_active_account missing.';
  end if;

  if to_regproc('public.tng_write_audit_log') is null then
    raise exception 'tng_write_audit_log missing.';
  end if;

  if to_regproc('public.tng_emergency_bootstrap_first_owner') is null then
    raise exception 'tng_emergency_bootstrap_first_owner missing.';
  end if;

  if to_regproc('public.tng_guard_role_assignment') is null then
    raise exception 'tng_guard_role_assignment missing.';
  end if;

  if to_regproc('public.tng_guard_article_status') is null then
    raise exception 'tng_guard_article_status missing (from 0011).';
  end if;

  -- -----------------------------------------------------------------------
  -- 5.6  RLS is enabled on all authorization tables.
  -- -----------------------------------------------------------------------

  declare
    tbl text;
    rls_tables text[] := array[
      'roles', 'permissions', 'role_permissions', 'user_roles',
      'audit_logs', 'invitations', 'feature_flags'
    ];
  begin
    foreach tbl in array rls_tables loop
      if not exists (
        select 1 from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public'
           and c.relname = tbl
           and c.relrowsecurity = true
      ) then
        raise exception 'RLS not enabled on public.%.', tbl;
      end if;
    end loop;
  end;

  -- -----------------------------------------------------------------------
  -- 5.7  FORCE RLS on sensitive tables.
  -- -----------------------------------------------------------------------

  declare
    forced_tbl text;
    forced_tables text[] := array[
      'user_roles', 'role_permissions', 'audit_logs', 'invitations'
    ];
  begin
    foreach forced_tbl in array forced_tables loop
      if not exists (
        select 1 from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public'
           and c.relname = forced_tbl
           and c.relforcerowsecurity = true
      ) then
        raise exception 'FORCE RLS not set on public.%.', forced_tbl;
      end if;
    end loop;
  end;

  -- -----------------------------------------------------------------------
  -- 5.8  Triggers are in place.
  -- -----------------------------------------------------------------------

  if not exists (
    select 1 from information_schema.triggers
     where event_object_schema = 'public'
       and event_object_table = 'user_roles'
       and trigger_name = 'user_roles_guard_assignment'
  ) then
    raise exception 'Escalation guard trigger missing on user_roles.';
  end if;

  if not exists (
    select 1 from information_schema.triggers
     where event_object_schema = 'public'
       and event_object_table = 'user_roles'
       and trigger_name = 'user_roles_protect_last_owner'
  ) then
    raise exception 'Last-owner protection trigger missing on user_roles.';
  end if;

  if not exists (
    select 1 from information_schema.triggers
     where event_object_schema = 'public'
       and event_object_table = 'profiles'
       and trigger_name = 'profiles_protect_owner_account'
  ) then
    raise exception 'Owner account protection trigger missing on profiles.';
  end if;

  if not exists (
    select 1 from information_schema.triggers
     where event_object_schema = 'public'
       and event_object_table = 'articles'
       and trigger_name = 'articles_guard_status'
  ) then
    raise exception 'Status transition guard trigger missing on articles.';
  end if;

  if not exists (
    select 1 from information_schema.triggers
     where event_object_schema = 'public'
       and event_object_table = 'audit_logs'
       and trigger_name = 'audit_logs_no_update'
  ) then
    raise exception 'Audit immutability trigger (no_update) missing.';
  end if;

  if not exists (
    select 1 from information_schema.triggers
     where event_object_schema = 'public'
       and event_object_table = 'audit_logs'
       and trigger_name = 'audit_logs_no_delete'
  ) then
    raise exception 'Audit immutability trigger (no_delete) missing.';
  end if;

  -- -----------------------------------------------------------------------
  -- 5.9  No stale legacy policy names remain.
  -- -----------------------------------------------------------------------

  declare
    stale_policies text[] := array[
      'profiles_admin_all',
      'articles_editor_read', 'articles_editor_insert',
      'articles_editor_update', 'articles_admin_delete',
      'article_sources_editor_all',
      'article_images_editor_all',
      'reactions_editor_read',
      'contributions_editor_read', 'contributions_editor_update',
      'contributions_admin_delete',
      'directory_editor_all',
      'ai_providers_admin_all',
      'ai_usage_log_admin_read',
      'ai_prompt_templates_editor_read', 'ai_prompt_templates_admin_write',
      'ai_generation_jobs_editor_read', 'ai_generation_jobs_editor_write',
      'rewrite_jobs_editor_all',
      'contributions_bucket_editor_write'
    ];
    stale text;
  begin
    select string_agg(e, ', ')
      into stale
      from unnest(stale_policies) e
     where exists (
       select 1 from pg_policies
        where policyname = e
     );

    if stale is not null then
      raise exception 'Stale legacy policies still present: %', stale;
    end if;
  end;

  -- -----------------------------------------------------------------------
  -- 5.10  Owner has no explicit role_permissions rows.
  -- -----------------------------------------------------------------------

  select count(*) into cnt
    from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
   where r.key = 'owner';

  if cnt > 0 then
    raise exception
      'Owner has % explicit role_permissions rows; should have zero.', cnt;
  end if;

  -- -----------------------------------------------------------------------
  -- 5.11  Break-glass function is not executable by application roles.
  -- -----------------------------------------------------------------------

  if exists (
    select 1 from information_schema.routine_privileges
     where routine_schema = 'public'
       and routine_name = 'tng_emergency_bootstrap_first_owner'
       and grantee in ('anon', 'authenticated', 'service_role')
       and privilege_type = 'EXECUTE'
  ) then
    raise exception
      'tng_emergency_bootstrap_first_owner is executable by an application role. Security violation.';
  end if;

  raise notice '0013 forward repair: all structural assertions passed.';
end $$;
