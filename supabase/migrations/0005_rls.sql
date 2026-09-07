-- ---------------------------------------------------------------------------
-- TNG Daily — 0005 Row Level Security
--
-- Baseline: every table has RLS enabled and no permissive default. The public
-- (anon) role may read published articles and their attached media/sources,
-- and nothing else. Writes from the browser are limited to reactions.
-- Contributions are inserted through a rate-limited server route using the
-- service role, so no anon insert policy exists for them.
-- ---------------------------------------------------------------------------

alter table public.profiles            enable row level security;
alter table public.articles            enable row level security;
alter table public.article_sources     enable row level security;
alter table public.article_images      enable row level security;
alter table public.reactions           enable row level security;
alter table public.contributions       enable row level security;
alter table public.directory_listings  enable row level security;
alter table public.ai_providers        enable row level security;
alter table public.ai_api_keys         enable row level security;
alter table public.ai_usage_log        enable row level security;
alter table public.ai_prompt_templates enable row level security;
alter table public.ai_generation_jobs  enable row level security;
alter table public.rewrite_jobs        enable row level security;

-- Force RLS even for the table owner so a misconfigured connection cannot
-- quietly bypass the policies. service_role still bypasses by design.
alter table public.ai_api_keys         force row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.tng_is_editor());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.tng_current_role());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all to authenticated
  using (public.tng_is_admin())
  with check (public.tng_is_admin());

-- ---------------------------------------------------------------------------
-- articles
-- ---------------------------------------------------------------------------
drop policy if exists articles_public_read on public.articles;
create policy articles_public_read on public.articles
  for select to anon, authenticated
  using (status = 'published' and published_at is not null and published_at <= now());

drop policy if exists articles_editor_read on public.articles;
create policy articles_editor_read on public.articles
  for select to authenticated
  using (public.tng_is_editor() or author_id = auth.uid());

drop policy if exists articles_editor_insert on public.articles;
create policy articles_editor_insert on public.articles
  for insert to authenticated
  with check (public.tng_is_editor());

drop policy if exists articles_editor_update on public.articles;
create policy articles_editor_update on public.articles
  for update to authenticated
  using (public.tng_is_editor())
  with check (public.tng_is_editor());

drop policy if exists articles_admin_delete on public.articles;
create policy articles_admin_delete on public.articles
  for delete to authenticated
  using (public.tng_is_admin());

-- ---------------------------------------------------------------------------
-- article_sources / article_images
-- ---------------------------------------------------------------------------
drop policy if exists article_sources_public_read on public.article_sources;
create policy article_sources_public_read on public.article_sources
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.articles a
       where a.id = article_sources.article_id
         and a.status = 'published'
         and a.published_at is not null
         and a.published_at <= now()
    )
  );

drop policy if exists article_sources_editor_all on public.article_sources;
create policy article_sources_editor_all on public.article_sources
  for all to authenticated
  using (public.tng_is_editor())
  with check (public.tng_is_editor());

drop policy if exists article_images_public_read on public.article_images;
create policy article_images_public_read on public.article_images
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.articles a
       where a.id = article_images.article_id
         and a.status = 'published'
         and a.published_at is not null
         and a.published_at <= now()
    )
  );

drop policy if exists article_images_editor_all on public.article_images;
create policy article_images_editor_all on public.article_images
  for all to authenticated
  using (public.tng_is_editor())
  with check (public.tng_is_editor());

-- ---------------------------------------------------------------------------
-- reactions
--
-- Anonymous readers may react to a published article. They may only remove
-- their own reaction, identified by the session id carried in the request
-- header the server route sets. Reading raw reaction rows is not public: the
-- feed reads the denormalised counters on articles instead.
-- ---------------------------------------------------------------------------
drop policy if exists reactions_public_insert on public.reactions;
create policy reactions_public_insert on public.reactions
  for insert to anon, authenticated
  with check (
    exists (
      select 1 from public.articles a
       where a.id = reactions.article_id
         and a.status = 'published'
         and a.published_at is not null
         and a.published_at <= now()
    )
  );

drop policy if exists reactions_editor_read on public.reactions;
create policy reactions_editor_read on public.reactions
  for select to authenticated
  using (public.tng_is_editor());

-- ---------------------------------------------------------------------------
-- contributions
--
-- No anon policy at all. Public submissions go through /api/contributions,
-- which validates, rate limits, hashes the submitter, and writes with the
-- service role. Editors moderate.
-- ---------------------------------------------------------------------------
drop policy if exists contributions_editor_read on public.contributions;
create policy contributions_editor_read on public.contributions
  for select to authenticated
  using (public.tng_is_editor());

drop policy if exists contributions_editor_update on public.contributions;
create policy contributions_editor_update on public.contributions
  for update to authenticated
  using (public.tng_is_editor())
  with check (public.tng_is_editor());

drop policy if exists contributions_admin_delete on public.contributions;
create policy contributions_admin_delete on public.contributions
  for delete to authenticated
  using (public.tng_is_admin());

-- ---------------------------------------------------------------------------
-- directory_listings
-- ---------------------------------------------------------------------------
drop policy if exists directory_public_read on public.directory_listings;
create policy directory_public_read on public.directory_listings
  for select to anon, authenticated
  using (is_active and (expires_at is null or expires_at > now()));

drop policy if exists directory_editor_all on public.directory_listings;
create policy directory_editor_all on public.directory_listings
  for all to authenticated
  using (public.tng_is_editor())
  with check (public.tng_is_editor());

-- ---------------------------------------------------------------------------
-- AI configuration: admin only, no public access of any kind.
-- ---------------------------------------------------------------------------
drop policy if exists ai_providers_admin_all on public.ai_providers;
create policy ai_providers_admin_all on public.ai_providers
  for all to authenticated
  using (public.tng_is_admin())
  with check (public.tng_is_admin());

-- ai_api_keys deliberately has NO policy for anon or authenticated. Even an
-- admin browser session cannot select the vault reference; the admin UI reads
-- it through a server route using the service role, which returns metadata and
-- the masked preview only.

drop policy if exists ai_usage_log_admin_read on public.ai_usage_log;
create policy ai_usage_log_admin_read on public.ai_usage_log
  for select to authenticated
  using (public.tng_is_admin());

drop policy if exists ai_prompt_templates_editor_read on public.ai_prompt_templates;
create policy ai_prompt_templates_editor_read on public.ai_prompt_templates
  for select to authenticated
  using (public.tng_is_editor());

drop policy if exists ai_prompt_templates_admin_write on public.ai_prompt_templates;
create policy ai_prompt_templates_admin_write on public.ai_prompt_templates
  for all to authenticated
  using (public.tng_is_admin())
  with check (public.tng_is_admin());

drop policy if exists ai_generation_jobs_editor_read on public.ai_generation_jobs;
create policy ai_generation_jobs_editor_read on public.ai_generation_jobs
  for select to authenticated
  using (public.tng_is_editor());

drop policy if exists ai_generation_jobs_editor_write on public.ai_generation_jobs;
create policy ai_generation_jobs_editor_write on public.ai_generation_jobs
  for all to authenticated
  using (public.tng_is_editor())
  with check (public.tng_is_editor());

drop policy if exists rewrite_jobs_editor_all on public.rewrite_jobs;
create policy rewrite_jobs_editor_all on public.rewrite_jobs
  for all to authenticated
  using (public.tng_is_editor())
  with check (public.tng_is_editor());

-- ---------------------------------------------------------------------------
-- Column-level hardening: the vault reference is never selectable through the
-- API roles, so a future permissive policy cannot leak it either.
-- ---------------------------------------------------------------------------
revoke select (vault_secret_id) on public.ai_api_keys from anon, authenticated;
revoke all on public.ai_api_keys from anon;
