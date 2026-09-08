-- ---------------------------------------------------------------------------
-- TNG Daily — 0016 MFA enforcement: AAL2-restrictive RLS policies
--
-- Defence in depth for the CMS MFA rollout. The proxy and requireRole gates
-- check the session's assurance level in the application layer first; these
-- policies make the database itself refuse writes from a session whose user
-- has a verified MFA factor but whose JWT is still at AAL1 — a stolen AAL1
-- refresh cookie alone can never mutate editorial or RBAC data, even if the
-- application gates were bypassed.
--
-- Enforcement model is "opt-in per user" (the third pattern in the Supabase
-- MFA guide): a session is only required to be at AAL2 when the user has at
-- least one VERIFIED factor. Editors who have not enrolled MFA keep working
-- at AAL1, so this migration never locks out accounts without factors.
--
-- Scope: write-side policies for the `authenticated` role only. They do NOT
-- affect:
--   - anon policies (public reads stay open)
--   - SECURITY DEFINER helpers and the role-management RPCs from 0015, which
--     run as their owner and bypass RLS by design
--   - the service_role clients in server routes (they bypass RLS and apply
--     their own authorization; public contribution intake and reactions are
--     unaffected)
--
-- Reads keep their existing permissive policies; only INSERT/UPDATE/DELETE
-- carry the requirement. A `for all` restrictive policy would also filter
-- SELECTs and silently hide rows from legitimate dashboards.
-- ---------------------------------------------------------------------------

-- Single predicate shared by every policy below: true when the session
-- satisfies its own MFA bar — either the user has no verified factors, or
-- the JWT is at AAL2. SECURITY DEFINER follows the repo convention from
-- 0009 because the policy caller (`authenticated`) cannot read
-- auth.mfa_factors directly; grants are limited to the API roles that
-- evaluate RLS.
create or replace function public.tng_session_mfa_satisfied()
returns boolean
language sql
stable
security definer
set search_path = auth, public
as $$
  select coalesce(
    (select auth.jwt() ->> 'aal') = 'aal2'
    or not exists (
      select 1
        from auth.mfa_factors f
       where f.user_id = (select auth.uid())
         and f.status = 'verified'
    ),
    false
  );
$$;

revoke execute on function public.tng_session_mfa_satisfied() from public, anon;
grant execute on function public.tng_session_mfa_satisfied() to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles',
    'articles',
    'article_sources',
    'article_images',
    'contributions',
    'directory_listings',
    'ai_providers',
    'ai_api_keys',
    'ai_models',
    'ai_task_models',
    'ai_prompt_templates',
    'ai_generation_jobs',
    'rewrite_jobs',
    'roles',
    'permissions',
    'role_permissions',
    'user_roles',
    'invitations',
    'feature_flags',
    'audit_logs'
  ]
  loop
    execute format(
      'drop policy if exists %I on public.%I;',
      t || '_require_aal2_insert', t
    );
    execute format(
      'create policy %I on public.%I
         as restrictive
         for insert to authenticated
         with check ((select public.tng_session_mfa_satisfied()));',
      t || '_require_aal2_insert', t
    );

    execute format(
      'drop policy if exists %I on public.%I;',
      t || '_require_aal2_update', t
    );
    execute format(
      'create policy %I on public.%I
         as restrictive
         for update to authenticated
         using ((select public.tng_session_mfa_satisfied()))
         with check ((select public.tng_session_mfa_satisfied()));',
      t || '_require_aal2_update', t
    );

    execute format(
      'drop policy if exists %I on public.%I;',
      t || '_require_aal2_delete', t
    );
    execute format(
      'create policy %I on public.%I
         as restrictive
         for delete to authenticated
         using ((select public.tng_session_mfa_satisfied()));',
      t || '_require_aal2_delete', t
    );
  end loop;
end;
$$;

-- Storage: the contributions bucket is written by authenticated editors.
drop policy if exists contributions_bucket_require_aal2_insert on storage.objects;
create policy contributions_bucket_require_aal2_insert on storage.objects
  as restrictive
  for insert to authenticated
  with check (
    bucket_id = 'contributions'
    and (select public.tng_session_mfa_satisfied())
  );

drop policy if exists contributions_bucket_require_aal2_update on storage.objects;
create policy contributions_bucket_require_aal2_update on storage.objects
  as restrictive
  for update to authenticated
  using (
    bucket_id = 'contributions'
    and (select public.tng_session_mfa_satisfied())
  )
  with check (
    bucket_id = 'contributions'
    and (select public.tng_session_mfa_satisfied())
  );

drop policy if exists contributions_bucket_require_aal2_delete on storage.objects;
create policy contributions_bucket_require_aal2_delete on storage.objects
  as restrictive
  for delete to authenticated
  using (
    bucket_id = 'contributions'
    and (select public.tng_session_mfa_satisfied())
  );

-- ---------------------------------------------------------------------------
-- Assertions
-- ---------------------------------------------------------------------------

do $$
declare
  missing text;
begin
  -- Every intended table must carry the three restrictive policies.
  select string_agg(expected.tablename || ':' || expected.action, ', ' order by expected.tablename, expected.action)
    into missing
    from (values
      ('profiles', 'insert'), ('profiles', 'update'), ('profiles', 'delete'),
      ('articles', 'insert'), ('articles', 'update'), ('articles', 'delete'),
      ('article_sources', 'insert'), ('article_sources', 'update'), ('article_sources', 'delete'),
      ('article_images', 'insert'), ('article_images', 'update'), ('article_images', 'delete'),
      ('contributions', 'insert'), ('contributions', 'update'), ('contributions', 'delete'),
      ('directory_listings', 'insert'), ('directory_listings', 'update'), ('directory_listings', 'delete'),
      ('ai_providers', 'insert'), ('ai_providers', 'update'), ('ai_providers', 'delete'),
      ('ai_api_keys', 'insert'), ('ai_api_keys', 'update'), ('ai_api_keys', 'delete'),
      ('ai_models', 'insert'), ('ai_models', 'update'), ('ai_models', 'delete'),
      ('ai_task_models', 'insert'), ('ai_task_models', 'update'), ('ai_task_models', 'delete'),
      ('ai_prompt_templates', 'insert'), ('ai_prompt_templates', 'update'), ('ai_prompt_templates', 'delete'),
      ('ai_generation_jobs', 'insert'), ('ai_generation_jobs', 'update'), ('ai_generation_jobs', 'delete'),
      ('rewrite_jobs', 'insert'), ('rewrite_jobs', 'update'), ('rewrite_jobs', 'delete'),
      ('roles', 'insert'), ('roles', 'update'), ('roles', 'delete'),
      ('permissions', 'insert'), ('permissions', 'update'), ('permissions', 'delete'),
      ('role_permissions', 'insert'), ('role_permissions', 'update'), ('role_permissions', 'delete'),
      ('user_roles', 'insert'), ('user_roles', 'update'), ('user_roles', 'delete'),
      ('invitations', 'insert'), ('invitations', 'update'), ('invitations', 'delete'),
      ('feature_flags', 'insert'), ('feature_flags', 'update'), ('feature_flags', 'delete'),
      ('audit_logs', 'insert')
    ) as expected(tablename, action)
    where not exists (
      select 1
        from pg_policies
       where schemaname = 'public'
         and tablename = expected.tablename
         and policyname = expected.tablename || '_require_aal2_' || expected.action
         and permissive = 'RESTRICTIVE'
    );

  if missing is not null then
    raise exception 'Assertion failed: AAL2 restrictive policy missing on: %', missing;
  end if;

  if not exists (
    select 1
      from pg_policies
     where schemaname = 'storage'
       and tablename = 'objects'
       and policyname like 'contributions_bucket_require_aal2_%'
       and permissive = 'RESTRICTIVE'
  ) then
    raise exception 'Assertion failed: storage AAL2 policy missing.';
  end if;
end;
$$;
