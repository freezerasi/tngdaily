-- ---------------------------------------------------------------------------
-- TNG Daily - harden function metadata and executable RPC surface
-- ---------------------------------------------------------------------------
--
-- This migration reconciles the live database with the intended security model:
-- only intentional RPCs and RLS predicates are executable by API roles. Trigger
-- functions and user-id parameterized authorization helpers stay internal.
-- ---------------------------------------------------------------------------

-- Functions without a pinned search_path are reported by the Supabase linter.
alter function public.tng_set_updated_at()
  set search_path = public;

alter function public.tng_audit_logs_immutable()
  set search_path = public;

alter function public.tng_is_sensitive_key(text)
  set search_path = pg_catalog;

alter function public.tng_required_status_permission(
  public.tng_article_status,
  public.tng_article_status
)
  set search_path = pg_catalog;

alter function public.tng_scrub_sensitive(jsonb)
  stable;

alter function public.tng_scrub_sensitive(jsonb)
  set search_path = pg_catalog, public;

-- A view should only count for content that is publicly publishable, not merely
-- any row with status = published.
create or replace function public.tng_increment_article_view(p_article_id uuid)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
  update public.articles
     set view_count = view_count + 1
   where id = p_article_id
     and public.tng_is_publicly_publishable(p_article_id);
$$;

-- Start from a closed surface for every known function, then grant back only
-- the functions that are intentionally callable by API roles.
revoke all on function public.rls_auto_enable()
  from public, anon, authenticated, service_role;

revoke all on function public.tng_set_updated_at()
  from public, anon, authenticated, service_role;
revoke all on function public.tng_audit_logs_immutable()
  from public, anon, authenticated, service_role;
revoke all on function public.tng_required_status_permission(
  public.tng_article_status,
  public.tng_article_status
)
  from public, anon, authenticated, service_role;
revoke all on function public.tng_is_sensitive_key(text)
  from public, anon, authenticated;
revoke all on function public.tng_scrub_sensitive(jsonb)
  from public, anon, authenticated;

revoke all on function public.tng_handle_new_user()
  from public, anon, authenticated, service_role;
revoke all on function public.tng_sync_reaction_counts()
  from public, anon, authenticated, service_role;
revoke all on function public.tng_guard_article_status()
  from public, anon, authenticated, service_role;
revoke all on function public.tng_guard_role_assignment()
  from public, anon, authenticated, service_role;
revoke all on function public.tng_guard_role_revocation()
  from public, anon, authenticated, service_role;
revoke all on function public.tng_protect_last_owner()
  from public, anon, authenticated, service_role;
revoke all on function public.tng_protect_owner_account()
  from public, anon, authenticated, service_role;

revoke all on function public.tng_is_active_account(uuid)
  from public, anon, authenticated;
revoke all on function public.tng_user_role_keys(uuid)
  from public, anon, authenticated;
revoke all on function public.tng_user_is_owner(uuid)
  from public, anon, authenticated;
revoke all on function public.tng_user_has_permission(uuid, text)
  from public, anon, authenticated;
revoke all on function public.tng_user_authority(uuid)
  from public, anon, authenticated;
revoke all on function public.tng_count_active_owners()
  from public, anon, authenticated;
revoke all on function public.tng_can_read_all_articles()
  from public, anon, authenticated;
revoke all on function public.tng_can_edit_all_articles()
  from public, anon, authenticated;

revoke all on function public.tng_current_role_keys()
  from public, anon;
revoke all on function public.tng_current_permissions()
  from public, anon;
revoke all on function public.tng_has_permission(text)
  from public, anon;
revoke all on function public.tng_has_any_permission(text[])
  from public, anon;
revoke all on function public.tng_is_owner()
  from public, anon;
revoke all on function public.tng_write_audit_log(
  text,
  text,
  text,
  jsonb,
  jsonb,
  jsonb,
  text
)
  from public, anon, authenticated;

revoke all on function public.tng_is_publicly_publishable(uuid)
  from public;
revoke all on function public.tng_is_public_media(uuid)
  from public;
revoke all on function public.tng_increment_article_view(uuid)
  from public;

-- Authenticated RPCs and RLS predicates.
grant execute on function public.tng_assign_role(uuid, text, timestamptz)
  to authenticated;
grant execute on function public.tng_update_role_expiry(uuid, text, timestamptz)
  to authenticated;
grant execute on function public.tng_revoke_role(uuid, text)
  to authenticated;
grant execute on function public.tng_bootstrap_authenticated_first_owner()
  to authenticated;

grant execute on function public.tng_has_permission(text)
  to authenticated, service_role;
grant execute on function public.tng_has_any_permission(text[])
  to authenticated, service_role;
grant execute on function public.tng_is_owner()
  to authenticated, service_role;
grant execute on function public.tng_current_role_keys()
  to authenticated, service_role;
grant execute on function public.tng_current_permissions()
  to authenticated, service_role;

-- Public predicates used by public read policies, plus the public view counter.
grant execute on function public.tng_is_publicly_publishable(uuid)
  to anon, authenticated, service_role;
grant execute on function public.tng_is_public_media(uuid)
  to anon, authenticated, service_role;
grant execute on function public.tng_increment_article_view(uuid)
  to anon, authenticated, service_role;

-- Service-only helper surface.
grant execute on function public.tng_is_active_account(uuid)
  to service_role;
grant execute on function public.tng_user_role_keys(uuid)
  to service_role;
grant execute on function public.tng_user_is_owner(uuid)
  to service_role;
grant execute on function public.tng_user_has_permission(uuid, text)
  to service_role;
grant execute on function public.tng_user_authority(uuid)
  to service_role;
grant execute on function public.tng_count_active_owners()
  to service_role;
grant execute on function public.tng_is_sensitive_key(text)
  to service_role;
grant execute on function public.tng_scrub_sensitive(jsonb)
  to service_role;
grant execute on function public.tng_write_audit_log(
  text,
  text,
  text,
  jsonb,
  jsonb,
  jsonb,
  text
)
  to service_role;

-- Preserve existing service-only operational functions.
revoke all on function public.tng_publish_due_articles()
  from public, anon, authenticated;
grant execute on function public.tng_publish_due_articles()
  to service_role;

revoke all on function public.tng_vault_create_secret(text, text, text)
  from public, anon, authenticated;
grant execute on function public.tng_vault_create_secret(text, text, text)
  to service_role;

revoke all on function public.tng_vault_read_secret(uuid)
  from public, anon, authenticated;
grant execute on function public.tng_vault_read_secret(uuid)
  to service_role;

revoke all on function public.tng_vault_delete_secret(uuid)
  from public, anon, authenticated;
grant execute on function public.tng_vault_delete_secret(uuid)
  to service_role;

-- Break-glass stays database-owner only.
revoke all on function public.tng_emergency_bootstrap_first_owner(uuid)
  from public, anon, authenticated, service_role;

-- Structural assertions for the security-sensitive bits of this migration.
do $$
declare
  offender text;
begin
  if exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in (
         'tng_set_updated_at',
         'tng_audit_logs_immutable',
         'tng_is_sensitive_key',
         'tng_scrub_sensitive',
         'tng_required_status_permission'
       )
       and p.proconfig is null
  ) then
    raise exception 'Assertion failed: every linted function must have a pinned search_path.';
  end if;

  if (
    select p.provolatile
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'tng_scrub_sensitive'
       and pg_get_function_identity_arguments(p.oid) = 'p_data jsonb'
  ) <> 's' then
    raise exception 'Assertion failed: tng_scrub_sensitive(jsonb) must be STABLE.';
  end if;

  select string_agg(proname || '(' || pg_get_function_identity_arguments(oid) || ')', ', ' order by proname)
    into offender
    from (
      select p.oid, p.proname
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
         and p.proname in (
           'rls_auto_enable',
           'tng_guard_article_status',
           'tng_guard_role_assignment',
           'tng_guard_role_revocation',
           'tng_handle_new_user',
           'tng_protect_last_owner',
           'tng_protect_owner_account',
           'tng_sync_reaction_counts',
           'tng_write_audit_log',
           'tng_user_has_permission',
           'tng_user_authority',
           'tng_user_role_keys',
           'tng_user_is_owner',
           'tng_is_active_account',
           'tng_count_active_owners'
         )
         and (
           has_function_privilege('anon', p.oid, 'EXECUTE')
           or has_function_privilege('authenticated', p.oid, 'EXECUTE')
         )
    ) exposed;

  if offender is not null then
    raise exception 'Assertion failed: internal functions exposed to API roles: %', offender;
  end if;

  if not has_function_privilege('authenticated', 'public.tng_assign_role(uuid, text, timestamptz)', 'EXECUTE') then
    raise exception 'Assertion failed: authenticated must execute tng_assign_role.';
  end if;

  if has_function_privilege('anon', 'public.tng_assign_role(uuid, text, timestamptz)', 'EXECUTE') then
    raise exception 'Assertion failed: anon must not execute tng_assign_role.';
  end if;

  if not has_function_privilege('authenticated', 'public.tng_has_permission(text)', 'EXECUTE') then
    raise exception 'Assertion failed: authenticated must execute tng_has_permission.';
  end if;

  if has_function_privilege('anon', 'public.tng_has_permission(text)', 'EXECUTE') then
    raise exception 'Assertion failed: anon must not execute tng_has_permission.';
  end if;

  if not has_function_privilege('anon', 'public.tng_is_publicly_publishable(uuid)', 'EXECUTE') then
    raise exception 'Assertion failed: anon must execute tng_is_publicly_publishable for public read policies.';
  end if;

  if not has_function_privilege('anon', 'public.tng_increment_article_view(uuid)', 'EXECUTE') then
    raise exception 'Assertion failed: anon must execute tng_increment_article_view.';
  end if;
end $$;
