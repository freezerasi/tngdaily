-- Optimize RLS policy evaluation and remove overlapping permissive policies.
--
-- Supabase's advisors flag two classes here:
-- 1. `auth.uid()` and stable helper calls in RLS predicates should be wrapped in
--    scalar subqueries so Postgres can init-plan them once per statement.
-- 2. Multiple permissive policies for the same table/action/role force Postgres
--    to evaluate several predicates. Where public and internal reads overlapped,
--    anon keeps the public policy and authenticated gets one equivalent combined
--    read policy. Where `for all` write policies overlapped with read policies,
--    they are split into explicit DML policies.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or (select public.tng_has_any_permission(array[
      'user.manage_roles',
      'user.invite',
      'article.read_all'
    ]))
  );

drop policy if exists profiles_update_self on public.profiles;
drop policy if exists profiles_suspend on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (
    id = (select auth.uid())
    or (select public.tng_has_permission('user.suspend'))
  )
  with check (
    id = (select auth.uid())
    or (select public.tng_has_permission('user.suspend'))
  );

drop policy if exists profiles_owner_delete on public.profiles;
create policy profiles_owner_delete on public.profiles
  for delete to authenticated
  using ((select public.tng_is_owner()));

-- ---------------------------------------------------------------------------
-- articles
-- ---------------------------------------------------------------------------

drop policy if exists articles_public_read on public.articles;
create policy articles_public_read on public.articles
  for select to anon
  using (
    status = 'published'
    and published_at is not null
    and published_at <= now()
    and visibility = 'public'
    and content_environment = 'production'
    and is_mock = false
    and deleted_at is null
  );

drop policy if exists articles_internal_read on public.articles;
drop policy if exists articles_authenticated_read on public.articles;
create policy articles_authenticated_read on public.articles
  for select to authenticated
  using (
    (
      status = 'published'
      and published_at is not null
      and published_at <= now()
      and visibility = 'public'
      and content_environment = 'production'
      and is_mock = false
      and deleted_at is null
    )
    or (
      deleted_at is null
      and (
        (select public.tng_has_permission('article.read_all'))
        or author_id = (select auth.uid())
      )
    )
  );

drop policy if exists articles_create on public.articles;
create policy articles_create on public.articles
  for insert to authenticated
  with check (
    (
      (select public.tng_has_permission('article.create_own'))
      and author_id = (select auth.uid())
    )
    or (select public.tng_has_permission('article.edit_all'))
  );

drop policy if exists articles_update on public.articles;
create policy articles_update on public.articles
  for update to authenticated
  using (
    deleted_at is null
    and (
      (select public.tng_has_permission('article.edit_all'))
      or (
        (select public.tng_has_permission('article.edit_own'))
        and author_id = (select auth.uid())
        and status in ('draft', 'needs_review')
      )
    )
  )
  with check (
    (select public.tng_has_permission('article.edit_all'))
    or (
      (select public.tng_has_permission('article.edit_own'))
      and author_id = (select auth.uid())
    )
  );

drop policy if exists articles_owner_delete on public.articles;
create policy articles_owner_delete on public.articles
  for delete to authenticated
  using ((select public.tng_is_owner()));

-- ---------------------------------------------------------------------------
-- article_sources
-- ---------------------------------------------------------------------------

drop policy if exists article_sources_public_read on public.article_sources;
create policy article_sources_public_read on public.article_sources
  for select to anon
  using (public.tng_is_publicly_publishable(article_id));

drop policy if exists article_sources_internal_read on public.article_sources;
drop policy if exists article_sources_authenticated_read on public.article_sources;
create policy article_sources_authenticated_read on public.article_sources
  for select to authenticated
  using (
    public.tng_is_publicly_publishable(article_id)
    or (select public.tng_has_permission('article.read_all'))
    or exists (
      select 1 from public.articles a
       where a.id = article_sources.article_id
         and a.author_id = (select auth.uid())
    )
    or (select public.tng_has_permission('article.edit_all'))
    or (
      (select public.tng_has_permission('article.edit_own'))
      and exists (
        select 1 from public.articles a
         where a.id = article_sources.article_id
           and a.author_id = (select auth.uid())
      )
    )
  );

drop policy if exists article_sources_write on public.article_sources;
drop policy if exists article_sources_insert on public.article_sources;
create policy article_sources_insert on public.article_sources
  for insert to authenticated
  with check (
    (select public.tng_has_permission('article.edit_all'))
    or (
      (select public.tng_has_permission('article.edit_own'))
      and exists (
        select 1 from public.articles a
         where a.id = article_sources.article_id
           and a.author_id = (select auth.uid())
      )
    )
  );

drop policy if exists article_sources_update on public.article_sources;
create policy article_sources_update on public.article_sources
  for update to authenticated
  using (
    (select public.tng_has_permission('article.edit_all'))
    or (
      (select public.tng_has_permission('article.edit_own'))
      and exists (
        select 1 from public.articles a
         where a.id = article_sources.article_id
           and a.author_id = (select auth.uid())
      )
    )
  )
  with check (
    (select public.tng_has_permission('article.edit_all'))
    or (
      (select public.tng_has_permission('article.edit_own'))
      and exists (
        select 1 from public.articles a
         where a.id = article_sources.article_id
           and a.author_id = (select auth.uid())
      )
    )
  );

drop policy if exists article_sources_delete on public.article_sources;
create policy article_sources_delete on public.article_sources
  for delete to authenticated
  using (
    (select public.tng_has_permission('article.edit_all'))
    or (
      (select public.tng_has_permission('article.edit_own'))
      and exists (
        select 1 from public.articles a
         where a.id = article_sources.article_id
           and a.author_id = (select auth.uid())
      )
    )
  );

-- ---------------------------------------------------------------------------
-- article_images
-- ---------------------------------------------------------------------------

drop policy if exists article_images_public_read on public.article_images;
create policy article_images_public_read on public.article_images
  for select to anon
  using (
    public.tng_is_public_media(id)
    and public.tng_is_publicly_publishable(article_id)
  );

drop policy if exists article_images_internal_read on public.article_images;
drop policy if exists article_images_authenticated_read on public.article_images;
create policy article_images_authenticated_read on public.article_images
  for select to authenticated
  using (
    (
      public.tng_is_public_media(id)
      and public.tng_is_publicly_publishable(article_id)
    )
    or (select public.tng_has_any_permission(array[
      'media.edit_metadata',
      'article.read_all'
    ]))
  );

drop policy if exists article_images_write on public.article_images;
create policy article_images_write on public.article_images
  for insert to authenticated
  with check ((select public.tng_has_permission('media.upload')));

drop policy if exists article_images_update on public.article_images;
create policy article_images_update on public.article_images
  for update to authenticated
  using ((select public.tng_has_permission('media.edit_metadata')))
  with check ((select public.tng_has_permission('media.edit_metadata')));

drop policy if exists article_images_delete on public.article_images;
create policy article_images_delete on public.article_images
  for delete to authenticated
  using (
    (select public.tng_has_permission('media.delete_any'))
    or (
      (select public.tng_has_permission('media.delete_own'))
      and created_by = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- reactions and contributions
-- ---------------------------------------------------------------------------

drop policy if exists reactions_analytics_read on public.reactions;
create policy reactions_analytics_read on public.reactions
  for select to authenticated
  using ((select public.tng_has_permission('analytics.read')));

drop policy if exists contributions_read on public.contributions;
create policy contributions_read on public.contributions
  for select to authenticated
  using ((select public.tng_has_permission('community.read')));

drop policy if exists contributions_moderate on public.contributions;
create policy contributions_moderate on public.contributions
  for update to authenticated
  using ((select public.tng_has_permission('community.moderate')))
  with check ((select public.tng_has_permission('community.moderate')));

drop policy if exists contributions_owner_delete on public.contributions;
create policy contributions_owner_delete on public.contributions
  for delete to authenticated
  using ((select public.tng_is_owner()));

-- ---------------------------------------------------------------------------
-- directory_listings
-- ---------------------------------------------------------------------------

drop policy if exists directory_public_read on public.directory_listings;
create policy directory_public_read on public.directory_listings
  for select to anon
  using (is_active and (expires_at is null or expires_at > now()));

drop policy if exists directory_authenticated_read on public.directory_listings;
create policy directory_authenticated_read on public.directory_listings
  for select to authenticated
  using (
    (is_active and (expires_at is null or expires_at > now()))
    or (select public.tng_has_permission('directory.manage'))
  );

drop policy if exists directory_manage on public.directory_listings;
drop policy if exists directory_manage_insert on public.directory_listings;
create policy directory_manage_insert on public.directory_listings
  for insert to authenticated
  with check ((select public.tng_has_permission('directory.manage')));

drop policy if exists directory_manage_update on public.directory_listings;
create policy directory_manage_update on public.directory_listings
  for update to authenticated
  using ((select public.tng_has_permission('directory.manage')))
  with check ((select public.tng_has_permission('directory.manage')));

drop policy if exists directory_manage_delete on public.directory_listings;
create policy directory_manage_delete on public.directory_listings
  for delete to authenticated
  using ((select public.tng_has_permission('directory.manage')));

-- ---------------------------------------------------------------------------
-- AI, invitations, feature flags, and RBAC metadata
-- ---------------------------------------------------------------------------

drop policy if exists ai_providers_owner_all on public.ai_providers;
create policy ai_providers_owner_all on public.ai_providers
  for all to authenticated
  using ((select public.tng_has_permission('ai.configure_provider')))
  with check ((select public.tng_has_permission('ai.configure_provider')));

drop policy if exists ai_usage_log_read on public.ai_usage_log;
create policy ai_usage_log_read on public.ai_usage_log
  for select to authenticated
  using ((select public.tng_has_permission('ai.view_usage')));

drop policy if exists ai_prompt_templates_read on public.ai_prompt_templates;
create policy ai_prompt_templates_read on public.ai_prompt_templates
  for select to authenticated
  using ((select public.tng_has_any_permission(array[
    'ai.use_writing',
    'ai.use_seo',
    'ai.use_research',
    'ai.use_image_prompt',
    'ai.manage_prompt_library'
  ])));

drop policy if exists ai_prompt_templates_owner_write on public.ai_prompt_templates;
drop policy if exists ai_prompt_templates_insert on public.ai_prompt_templates;
create policy ai_prompt_templates_insert on public.ai_prompt_templates
  for insert to authenticated
  with check ((select public.tng_has_permission('ai.manage_prompt_library')));

drop policy if exists ai_prompt_templates_update on public.ai_prompt_templates;
create policy ai_prompt_templates_update on public.ai_prompt_templates
  for update to authenticated
  using ((select public.tng_has_permission('ai.manage_prompt_library')))
  with check ((select public.tng_has_permission('ai.manage_prompt_library')));

drop policy if exists ai_prompt_templates_delete on public.ai_prompt_templates;
create policy ai_prompt_templates_delete on public.ai_prompt_templates
  for delete to authenticated
  using ((select public.tng_has_permission('ai.manage_prompt_library')));

drop policy if exists ai_generation_jobs_read on public.ai_generation_jobs;
create policy ai_generation_jobs_read on public.ai_generation_jobs
  for select to authenticated
  using (
    created_by = (select auth.uid())
    or (select public.tng_has_permission('ai.view_usage'))
  );

drop policy if exists ai_generation_jobs_write on public.ai_generation_jobs;
create policy ai_generation_jobs_write on public.ai_generation_jobs
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (select public.tng_has_any_permission(array[
      'ai.use_writing',
      'ai.use_seo',
      'ai.use_research',
      'ai.use_image_prompt'
    ]))
  );

drop policy if exists ai_generation_jobs_update on public.ai_generation_jobs;
create policy ai_generation_jobs_update on public.ai_generation_jobs
  for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

drop policy if exists rewrite_jobs_read on public.rewrite_jobs;
create policy rewrite_jobs_read on public.rewrite_jobs
  for select to authenticated
  using (
    created_by = (select auth.uid())
    or (select public.tng_has_permission('ai.view_usage'))
  );

drop policy if exists rewrite_jobs_write on public.rewrite_jobs;
create policy rewrite_jobs_write on public.rewrite_jobs
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (select public.tng_has_permission('ai.use_research'))
  );

drop policy if exists rewrite_jobs_update on public.rewrite_jobs;
create policy rewrite_jobs_update on public.rewrite_jobs
  for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

drop policy if exists feature_flags_manage on public.feature_flags;
drop policy if exists feature_flags_insert on public.feature_flags;
create policy feature_flags_insert on public.feature_flags
  for insert to authenticated
  with check ((select public.tng_has_permission('system.manage_feature_flags')));

drop policy if exists feature_flags_update on public.feature_flags;
create policy feature_flags_update on public.feature_flags
  for update to authenticated
  using ((select public.tng_has_permission('system.manage_feature_flags')))
  with check ((select public.tng_has_permission('system.manage_feature_flags')));

drop policy if exists feature_flags_delete on public.feature_flags;
create policy feature_flags_delete on public.feature_flags
  for delete to authenticated
  using ((select public.tng_has_permission('system.manage_feature_flags')));

drop policy if exists invitations_read on public.invitations;
create policy invitations_read on public.invitations
  for select to authenticated
  using ((select public.tng_has_permission('user.invite')));

drop policy if exists invitations_manage on public.invitations;
drop policy if exists invitations_insert on public.invitations;
create policy invitations_insert on public.invitations
  for insert to authenticated
  with check ((select public.tng_has_permission('user.invite')));

drop policy if exists invitations_update on public.invitations;
create policy invitations_update on public.invitations
  for update to authenticated
  using ((select public.tng_has_permission('user.invite')))
  with check ((select public.tng_has_permission('user.invite')));

drop policy if exists invitations_delete on public.invitations;
create policy invitations_delete on public.invitations
  for delete to authenticated
  using ((select public.tng_has_permission('user.invite')));

drop policy if exists roles_owner_write on public.roles;
drop policy if exists roles_insert on public.roles;
create policy roles_insert on public.roles
  for insert to authenticated
  with check ((select public.tng_is_owner()));

drop policy if exists roles_update on public.roles;
create policy roles_update on public.roles
  for update to authenticated
  using ((select public.tng_is_owner()))
  with check ((select public.tng_is_owner()));

drop policy if exists roles_delete on public.roles;
create policy roles_delete on public.roles
  for delete to authenticated
  using ((select public.tng_is_owner()));

drop policy if exists permissions_owner_write on public.permissions;
drop policy if exists permissions_insert on public.permissions;
create policy permissions_insert on public.permissions
  for insert to authenticated
  with check ((select public.tng_is_owner()));

drop policy if exists permissions_update on public.permissions;
create policy permissions_update on public.permissions
  for update to authenticated
  using ((select public.tng_is_owner()))
  with check ((select public.tng_is_owner()));

drop policy if exists permissions_delete on public.permissions;
create policy permissions_delete on public.permissions
  for delete to authenticated
  using ((select public.tng_is_owner()));

drop policy if exists role_permissions_read on public.role_permissions;
create policy role_permissions_read on public.role_permissions
  for select to authenticated
  using ((select public.tng_has_any_permission(array[
    'user.manage_roles',
    'role.manage',
    'permission.manage'
  ])));

drop policy if exists role_permissions_owner_write on public.role_permissions;
drop policy if exists role_permissions_insert on public.role_permissions;
create policy role_permissions_insert on public.role_permissions
  for insert to authenticated
  with check ((select public.tng_is_owner()));

drop policy if exists role_permissions_update on public.role_permissions;
create policy role_permissions_update on public.role_permissions
  for update to authenticated
  using ((select public.tng_is_owner()))
  with check ((select public.tng_is_owner()));

drop policy if exists role_permissions_delete on public.role_permissions;
create policy role_permissions_delete on public.role_permissions
  for delete to authenticated
  using ((select public.tng_is_owner()));

drop policy if exists user_roles_read_self on public.user_roles;
create policy user_roles_read_self on public.user_roles
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.tng_has_permission('user.manage_roles'))
  );

drop policy if exists audit_logs_owner_read on public.audit_logs;
create policy audit_logs_owner_read on public.audit_logs
  for select to authenticated
  using ((select public.tng_has_permission('system.view_audit_log')));

-- ---------------------------------------------------------------------------
-- storage: contributions bucket
-- ---------------------------------------------------------------------------

drop policy if exists contributions_bucket_public_read on storage.objects;
create policy contributions_bucket_public_read on storage.objects
  for select to anon
  using (bucket_id = 'contributions');

drop policy if exists contributions_bucket_authenticated_read on storage.objects;
create policy contributions_bucket_authenticated_read on storage.objects
  for select to authenticated
  using (bucket_id = 'contributions');

drop policy if exists contributions_bucket_write on storage.objects;
drop policy if exists contributions_bucket_insert on storage.objects;
create policy contributions_bucket_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'contributions'
    and (select public.tng_has_any_permission(array['community.moderate', 'media.upload']))
  );

drop policy if exists contributions_bucket_update on storage.objects;
create policy contributions_bucket_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'contributions'
    and (select public.tng_has_any_permission(array['community.moderate', 'media.upload']))
  )
  with check (
    bucket_id = 'contributions'
    and (select public.tng_has_any_permission(array['community.moderate', 'media.upload']))
  );

drop policy if exists contributions_bucket_delete on storage.objects;
create policy contributions_bucket_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'contributions'
    and (select public.tng_has_any_permission(array['community.moderate', 'media.upload']))
  );

-- ---------------------------------------------------------------------------
-- Assertions
-- ---------------------------------------------------------------------------

do $$
declare
  overlapping text;
begin
  with expanded as (
    select
      schemaname,
      tablename,
      policyname,
      permissive,
      unnest(roles) as role_name,
      case
        when cmd = 'ALL' then array['SELECT', 'INSERT', 'UPDATE', 'DELETE']
        else array[cmd]
      end as actions
    from pg_policies
    where schemaname in ('public', 'storage')
  ),
  actions as (
    select
      schemaname,
      tablename,
      policyname,
      permissive,
      role_name,
      unnest(actions) as action
    from expanded
  )
  select string_agg(
           format(
             '%I.%I %s %s: %s',
             schemaname,
             tablename,
             action,
             role_name,
             policies
           ),
           '; '
         )
    into overlapping
    from (
      select
        schemaname,
        tablename,
        action,
        role_name,
        array_to_string(array_agg(policyname order by policyname), ', ') as policies
      from actions
      where permissive = 'PERMISSIVE'
      group by schemaname, tablename, action, role_name
      having count(*) > 1
    ) grouped;

  if overlapping is not null then
    raise exception 'overlapping permissive RLS policies remain: %', overlapping;
  end if;
end $$;
