-- ---------------------------------------------------------------------------
-- UNVERIFIED — NOT EXECUTED
-- Requires local Docker + Supabase CLI testing before any non-local application.
--
-- Nothing in this file has been run against Postgres. No RLS behaviour here has
-- been observed. Syntax is reviewed only. Every allow/deny claim in the
-- accompanying documentation is a stated intent, not a verified outcome.
--
-- Verification procedure: docs/RLS_TESTING.md
-- Policy-by-policy intent:  docs/RLS_POLICY_MIGRATION_REVIEW.md
-- ---------------------------------------------------------------------------
--
-- TNG Daily — 0011 RBAC policy rewrite
--
-- Replaces every authorization predicate that referenced the legacy role ladder
-- (`tng_is_editor`, `tng_is_admin`, `tng_current_role`) with permission checks
-- against the RBAC model from 0008-0010.
--
-- Three things this migration does beyond swapping predicates:
--
--   1. Adds the three public-gate columns the target policy shape requires.
--      `visibility`, `content_environment`, and `deleted_at` did not exist; the
--      public policy could not reference them without this.
--
--   2. Adds a status-transition trigger. RLS gates rows, not columns, so a
--      row-level policy cannot express "a writer may edit their own draft but
--      may not set status to published". The trigger enforces that per column
--      change, which is the only correct place for it.
--
--   3. Splits every former `admin` policy along the reversible/irreversible
--      line. Deletes become owner-only; moderation and editing move to specific
--      permissions.
--
-- The legacy helper functions are NOT dropped here. 0012 drops them, after the
-- data migration proves every internal profile has a mapped role. Dropping them
-- in the same migration as the policy rewrite would leave no way to roll back
-- policies independently of data.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- PART 1 — Public-gate columns
--
-- Outside the policy transaction on purpose: `ALTER TABLE ... ADD COLUMN` takes
-- an ACCESS EXCLUSIVE lock, and holding that for the duration of a 30-policy
-- rewrite widens the window in which the table is unavailable.
-- ===========================================================================

do $$ begin
  create type tng_visibility as enum ('public', 'unlisted', 'private');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tng_content_environment as enum ('production', 'staging', 'development');
exception when duplicate_object then null; end $$;

alter table public.articles
  add column if not exists visibility tng_visibility not null default 'public',
  add column if not exists content_environment tng_content_environment not null default 'production',
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles (id) on delete set null;

comment on column public.articles.visibility is
  'public: eligible for the public site. unlisted: reachable by direct URL only, excluded from feeds and sitemap. private: internal only.';

comment on column public.articles.content_environment is
  'production content is the only kind a public reader may see. staging and development exist so fixtures can be exercised without a separate database.';

comment on column public.articles.deleted_at is
  'Soft delete. A non-null value removes the row from every read path including the editorial dashboard. Hard delete is owner-only.';

-- Existing seeded fixtures are development content by definition. Aligning
-- these two columns keeps `is_mock` and `content_environment` from disagreeing.
update public.articles
   set content_environment = 'development'
 where is_mock = true
   and content_environment <> 'development';

create index if not exists articles_public_gate_idx
  on public.articles (published_at desc)
  where status = 'published'
    and visibility = 'public'
    and content_environment = 'production'
    and is_mock = false
    and deleted_at is null;

-- The same soft-delete and environment columns on the media library, so an
-- asset cannot outlive the article it was cleared for.
alter table public.article_images
  add column if not exists content_environment tng_content_environment not null default 'production',
  add column if not exists deleted_at timestamptz;

update public.article_images ai
   set content_environment = 'development'
 where exists (
   select 1 from public.articles a
    where a.id = ai.article_id and a.is_mock = true
 )
   and ai.content_environment <> 'development';

/*
 * Provenance backfill, only where it is factually determinable.
 *
 * `media_source_type` is nullable and predates no default, so existing rows and
 * anything written by the current ingest route carry NULL. NULL means
 * "provenance not recorded", which is NOT the same as "safe": under the
 * defence-in-depth rule, unknown provenance must not be publicly deliverable.
 *
 * Only one case can be filled in without asserting something unknown: a row
 * whose upload origin is a stock provider IS a licensed photo, by definition of
 * how it arrived. An `upload` row could be original photography, licensed
 * material, or an AI illustration, and guessing would manufacture a provenance
 * claim. Those stay NULL and stay non-public until an editor declares them.
 */
update public.article_images
   set media_source_type = 'licensed_photo'
 where media_source_type is null
   and source in ('unsplash', 'pexels', 'pixabay');

-- ===========================================================================
-- PART 2 — Publishable predicates
--
-- Two separate gates, deliberately not one.
--
-- An article being publicly publishable does NOT imply its attached media is
-- publicly deliverable. A production article can legitimately carry a
-- placeholder while a real photograph is commissioned. Conflating the two is
-- exactly how a mock fixture reaches an OG card.
-- ===========================================================================

create or replace function public.tng_is_publicly_publishable(p_article_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.articles a
     where a.id = p_article_id
       and a.status = 'published'
       and a.published_at is not null
       and a.published_at <= now()
       and a.visibility = 'public'
       and a.content_environment = 'production'
       and a.is_mock = false
       and a.deleted_at is null
  );
$$;

comment on function public.tng_is_publicly_publishable(uuid) is
  'Public visibility gate for an ARTICLE: published, past publish time, public visibility, production environment, not mock, not soft-deleted. Does NOT imply that attached media is public-safe.';

/**
 * Public media eligibility.
 *
 * Two conditions, the second deliberately redundant:
 *
 *   content_environment = 'production'    intended lifecycle
 *   media_source_type <> 'mock_visual'    intrinsic provenance
 *
 * The redundancy is the point. A bad UPDATE that flips an asset's environment to
 * production must not be sufficient to publish a fixture. Provenance is a fact
 * about the frame and does not change when a lifecycle column does.
 *
 * NULL provenance is INELIGIBLE. `media_source_type` is nullable and unrecorded
 * on rows written before 0007, and "unknown" cannot be assumed safe: the unknown
 * set includes AI illustrations and placeholders. An editor must declare
 * provenance before an asset becomes publicly deliverable.
 *
 * `article_images` has no `is_mock` column, so the article-level flag is not
 * referenced here; mock articles are excluded by the parent article gate. This is
 * the "apply only fields that actually exist" instruction, verified against
 * 0002 and 0007 rather than assumed.
 */
create or replace function public.tng_is_public_media(p_image_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.article_images i
     where i.id = p_image_id
       and i.deleted_at is null
       and i.content_environment = 'production'
       and i.media_source_type is not null
       and i.media_source_type <> 'mock_visual'
  );
$$;

comment on function public.tng_is_public_media(uuid) is
  'Public media eligibility: production environment AND declared provenance that is not mock_visual AND not soft-deleted. NULL provenance is ineligible because unknown is not safe. Independent of article eligibility by design.';

revoke all on function public.tng_is_publicly_publishable(uuid) from public;
revoke all on function public.tng_is_public_media(uuid) from public;
grant execute on function public.tng_is_publicly_publishable(uuid)
  to anon, authenticated, service_role;
grant execute on function public.tng_is_public_media(uuid)
  to anon, authenticated, service_role;

-- ===========================================================================
-- PART 3 — Status-transition guard
--
-- RLS decides which rows a caller may touch. It cannot decide which column
-- values they may write. Publishing is a column value, so it is guarded here.
--
-- Table-driven rather than a chain of IF statements, so the permission required
-- for each transition is legible and auditable in one place.
-- ===========================================================================

create or replace function public.tng_required_status_permission(
  p_from tng_article_status,
  p_to tng_article_status
)
returns text
language sql
immutable
as $$
  select case
    -- Submitting own work for review.
    when p_to = 'needs_review' then 'article.submit_review'
    -- Review outcomes.
    when p_to = 'draft' and p_from = 'needs_review' then 'article.review'
    when p_to = 'published' then 'article.publish'
    when p_to = 'scheduled' then 'article.schedule'
    when p_to = 'archived' then 'article.archive'
    -- Un-archiving, or returning an archived piece to circulation.
    when p_from = 'archived' then 'article.restore'
    -- draft -> draft and other same-state edits need no transition permission;
    -- the row-level policy already decided the caller may edit the row.
    else null
  end;
$$;

create or replace function public.tng_guard_article_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  required text;
begin
  if new.status = old.status then
    return new;
  end if;

  required := public.tng_required_status_permission(old.status, new.status);

  if required is null then
    return new;
  end if;

  -- A trusted server-side job or migration runs without auth.uid(); those paths
  -- are service-role only and already outside RLS.
  if auth.uid() is null then
    return new;
  end if;

  if not public.tng_has_permission(required) then
    raise exception
      'Missing permission % for status transition % -> %.',
      required, old.status, new.status
      using errcode = 'insufficient_privilege';
  end if;

  /*
   * Commercial content must carry its disclosure before it can go live. This is
   * the database half of the rule; the DAL enforces the same check with a better
   * error message. Both exist because a partner article published without
   * disclosure is a regulatory problem, not a UX problem.
   */
  if new.status in ('published', 'scheduled')
     and coalesce(new.is_commercial, false)
     and (new.commercial_disclosure is null or char_length(btrim(new.commercial_disclosure)) < 10)
  then
    raise exception
      'Commercial content requires a disclosure of at least 10 characters before publishing.'
      using errcode = 'check_violation';
  end if;

  /*
   * Mock and non-production content can never reach a published state. The
   * public policy already filters it, so this is defence in depth: it stops a
   * fixture being marked published at all, rather than relying on the read path
   * to hide it.
   */
  if new.status = 'published'
     and (new.is_mock = true or new.content_environment <> 'production')
  then
    raise exception
      'Mock or non-production content cannot be published.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- Commercial flags the guard depends on.
alter table public.articles
  add column if not exists is_commercial boolean not null default false,
  add column if not exists commercial_disclosure text,
  add column if not exists partner_name text;

comment on column public.articles.is_commercial is
  'True for advertorial and partner content. Publishing one requires commercial.publish plus a disclosure.';

drop trigger if exists articles_guard_status on public.articles;
create trigger articles_guard_status
  before update of status on public.articles
  for each row execute function public.tng_guard_article_status();

-- ===========================================================================
-- PART 4 — Policy rewrite, in one transaction
--
-- Every DROP and CREATE for the live policy set is inside a single
-- BEGIN/COMMIT, so a failure part-way leaves the previous policies intact
-- rather than a half-rewritten authorization surface.
--
-- The in-transaction assertions at the end check policy *presence*, which is
-- all that can be checked without a session. Behavioural allow/deny testing
-- requires role impersonation with JWT claims and is deferred to
-- tests/integration; see docs/RLS_TESTING.md.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- profiles
--
-- Old: `profiles_select_self` allowed self or any editor. `profiles_update_self`
-- allowed self and pinned `role` to the caller's current role to stop
-- self-promotion. `profiles_admin_all` gave admins everything.
--
-- New: the role column is gone from the equation entirely (0012 drops it), so
-- self-promotion is structurally impossible: roles live in `user_roles` behind
-- the escalation triggers. Admin-all is split into a suspension permission and
-- an owner-only delete.
-- ---------------------------------------------------------------------------

drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    -- Reading other profiles is a team-management and byline concern.
    or public.tng_has_any_permission(array['user.manage_roles', 'user.invite', 'article.read_all'])
  );

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Suspension is a distinct capability from editing a profile.
drop policy if exists profiles_admin_all on public.profiles;
drop policy if exists profiles_suspend on public.profiles;
create policy profiles_suspend on public.profiles
  for update to authenticated
  using (public.tng_has_permission('user.suspend'))
  with check (public.tng_has_permission('user.suspend'));

drop policy if exists profiles_owner_delete on public.profiles;
create policy profiles_owner_delete on public.profiles
  for delete to authenticated
  using (public.tng_is_owner());

-- ---------------------------------------------------------------------------
-- articles
--
-- Old: public read on published only. Editor read for editors or the author.
-- Editor insert, editor update, admin delete — all on the ladder.
--
-- New: the public gate gains visibility, environment, mock, and soft-delete.
-- Insert requires `article.create_own` AND authorship, so a writer creates only
-- their own work. Update splits own-vs-all. Delete is soft by default and
-- hard-delete is owner-only.
-- ---------------------------------------------------------------------------

drop policy if exists articles_public_read on public.articles;
create policy articles_public_read on public.articles
  for select to anon, authenticated
  using (
    status = 'published'
    and published_at is not null
    and published_at <= now()
    and visibility = 'public'
    and content_environment = 'production'
    and is_mock = false
    and deleted_at is null
  );

drop policy if exists articles_editor_read on public.articles;
drop policy if exists articles_internal_read on public.articles;
create policy articles_internal_read on public.articles
  for select to authenticated
  using (
    deleted_at is null
    and (
      public.tng_has_permission('article.read_all')
      or author_id = auth.uid()
    )
  );

drop policy if exists articles_editor_insert on public.articles;
drop policy if exists articles_create on public.articles;
create policy articles_create on public.articles
  for insert to authenticated
  with check (
    (
      -- Authoring own work: the row must actually be theirs.
      public.tng_has_permission('article.create_own')
      and author_id = auth.uid()
    )
    or public.tng_has_permission('article.edit_all')
  );

drop policy if exists articles_editor_update on public.articles;
drop policy if exists articles_update on public.articles;
create policy articles_update on public.articles
  for update to authenticated
  using (
    deleted_at is null
    and (
      public.tng_has_permission('article.edit_all')
      or (
        public.tng_has_permission('article.edit_own')
        and author_id = auth.uid()
        -- Own-work editing stops once the piece leaves the author's hands.
        and status in ('draft', 'needs_review')
      )
    )
  )
  with check (
    public.tng_has_permission('article.edit_all')
    or (
      public.tng_has_permission('article.edit_own')
      and author_id = auth.uid()
    )
  );

-- Hard delete is irreversible, so it sits with the owner. Everything else
-- soft-deletes through the update policy.
drop policy if exists articles_admin_delete on public.articles;
drop policy if exists articles_owner_delete on public.articles;
create policy articles_owner_delete on public.articles
  for delete to authenticated
  using (public.tng_is_owner());

-- ---------------------------------------------------------------------------
-- article_sources
--
-- Old: public read when the parent was published; editor all.
-- New: parent gate delegates to `tng_is_publicly_publishable`, so the five
-- conditions are defined once. Writes follow article edit permissions.
-- ---------------------------------------------------------------------------

drop policy if exists article_sources_public_read on public.article_sources;
create policy article_sources_public_read on public.article_sources
  for select to anon, authenticated
  using (public.tng_is_publicly_publishable(article_id));

drop policy if exists article_sources_editor_all on public.article_sources;
drop policy if exists article_sources_internal_read on public.article_sources;
create policy article_sources_internal_read on public.article_sources
  for select to authenticated
  using (
    public.tng_has_permission('article.read_all')
    or exists (
      select 1 from public.articles a
       where a.id = article_sources.article_id
         and a.author_id = auth.uid()
    )
  );

drop policy if exists article_sources_write on public.article_sources;
create policy article_sources_write on public.article_sources
  for all to authenticated
  using (
    public.tng_has_permission('article.edit_all')
    or (
      public.tng_has_permission('article.edit_own')
      and exists (
        select 1 from public.articles a
         where a.id = article_sources.article_id
           and a.author_id = auth.uid()
      )
    )
  )
  with check (
    public.tng_has_permission('article.edit_all')
    or (
      public.tng_has_permission('article.edit_own')
      and exists (
        select 1 from public.articles a
         where a.id = article_sources.article_id
           and a.author_id = auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- article_images
--
-- Old: `article_images_public_read` allowed anon read whenever the parent
-- article was published. `article_images_editor_all` gave editors everything.
--
-- New: TWO independent gates must both pass for public read. The parent article
-- must be publicly publishable, AND the asset must itself be public-eligible:
-- production environment, declared provenance, provenance not `mock_visual`,
-- not soft-deleted.
--
-- Article eligibility never implies media eligibility. A production article may
-- legitimately carry a placeholder while real photography is commissioned, and
-- that placeholder must not be deliverable, indexable, or usable as an OG image.
--
-- Writes move to media permissions rather than article permissions, so a
-- media_manager can curate assets without any article capability.
-- ---------------------------------------------------------------------------

drop policy if exists article_images_public_read on public.article_images;
create policy article_images_public_read on public.article_images
  for select to anon, authenticated
  using (
    -- Gate 1: the asset is intrinsically public-safe.
    public.tng_is_public_media(id)
    -- Gate 2: the article carrying it is public.
    and public.tng_is_publicly_publishable(article_id)
  );

drop policy if exists article_images_editor_all on public.article_images;
drop policy if exists article_images_internal_read on public.article_images;
create policy article_images_internal_read on public.article_images
  for select to authenticated
  using (
    public.tng_has_any_permission(array['media.edit_metadata', 'article.read_all'])
  );

drop policy if exists article_images_write on public.article_images;
create policy article_images_write on public.article_images
  for insert to authenticated
  with check (public.tng_has_permission('media.upload'));

drop policy if exists article_images_update on public.article_images;
create policy article_images_update on public.article_images
  for update to authenticated
  using (public.tng_has_permission('media.edit_metadata'))
  with check (public.tng_has_permission('media.edit_metadata'));

drop policy if exists article_images_delete on public.article_images;
create policy article_images_delete on public.article_images
  for delete to authenticated
  using (
    public.tng_has_permission('media.delete_any')
    or (
      public.tng_has_permission('media.delete_own')
      and created_by = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- reactions
--
-- Old: anon insert when the parent was published; editor read.
-- New: insert defers to the full public gate, so a mock or unlisted article
-- cannot accumulate reactions. Read moves to `analytics.read`, which is what
-- reading raw reaction rows actually is.
-- ---------------------------------------------------------------------------

drop policy if exists reactions_public_insert on public.reactions;
create policy reactions_public_insert on public.reactions
  for insert to anon, authenticated
  with check (public.tng_is_publicly_publishable(article_id));

drop policy if exists reactions_editor_read on public.reactions;
drop policy if exists reactions_analytics_read on public.reactions;
create policy reactions_analytics_read on public.reactions
  for select to authenticated
  using (public.tng_has_permission('analytics.read'));

-- ---------------------------------------------------------------------------
-- contributions
--
-- Old: editor read, editor update, admin delete. No anon policy at all.
-- New: still no anon policy. Reading is `community.read`, moderating is
-- `community.moderate`, deleting is owner-only. Submissions stay private.
-- ---------------------------------------------------------------------------

drop policy if exists contributions_editor_read on public.contributions;
drop policy if exists contributions_read on public.contributions;
create policy contributions_read on public.contributions
  for select to authenticated
  using (public.tng_has_permission('community.read'));

drop policy if exists contributions_editor_update on public.contributions;
drop policy if exists contributions_moderate on public.contributions;
create policy contributions_moderate on public.contributions
  for update to authenticated
  using (public.tng_has_permission('community.moderate'))
  with check (public.tng_has_permission('community.moderate'));

drop policy if exists contributions_admin_delete on public.contributions;
drop policy if exists contributions_owner_delete on public.contributions;
create policy contributions_owner_delete on public.contributions
  for delete to authenticated
  using (public.tng_is_owner());

-- ---------------------------------------------------------------------------
-- directory_listings
--
-- Old: public read of active, unexpired rows; editor all.
-- New: same public read. Writes need `directory.manage`.
-- ---------------------------------------------------------------------------

drop policy if exists directory_public_read on public.directory_listings;
create policy directory_public_read on public.directory_listings
  for select to anon, authenticated
  using (is_active and (expires_at is null or expires_at > now()));

drop policy if exists directory_editor_all on public.directory_listings;
drop policy if exists directory_manage on public.directory_listings;
create policy directory_manage on public.directory_listings
  for all to authenticated
  using (public.tng_has_permission('directory.manage'))
  with check (public.tng_has_permission('directory.manage'));

-- ---------------------------------------------------------------------------
-- ai_providers
--
-- Old: admin all.
-- New: owner-only via `ai.configure_provider`, which is a privileged permission
-- no non-owner role holds. Unchanged in effect for the public: no access.
-- ---------------------------------------------------------------------------

drop policy if exists ai_providers_admin_all on public.ai_providers;
drop policy if exists ai_providers_owner_all on public.ai_providers;
create policy ai_providers_owner_all on public.ai_providers
  for all to authenticated
  using (public.tng_has_permission('ai.configure_provider'))
  with check (public.tng_has_permission('ai.configure_provider'));

-- ai_api_keys keeps having NO policy for anon or authenticated. The admin UI
-- reads masked metadata through a narrow server-only adapter. Restated here so
-- the absence is visibly deliberate rather than an oversight.

-- ---------------------------------------------------------------------------
-- ai_usage_log
--
-- Old: admin read.
-- New: `ai.view_usage`, held by managing_editor and analyst as well as owner.
-- Usage metadata is operational information, not a secret.
-- ---------------------------------------------------------------------------

drop policy if exists ai_usage_log_admin_read on public.ai_usage_log;
drop policy if exists ai_usage_log_read on public.ai_usage_log;
create policy ai_usage_log_read on public.ai_usage_log
  for select to authenticated
  using (public.tng_has_permission('ai.view_usage'));

-- ---------------------------------------------------------------------------
-- ai_prompt_templates
--
-- Old: editor read, admin write.
-- New: read for anyone who may use AI writing. Write is owner-only via
-- `ai.manage_prompt_library`. The suggestion path added by
-- `ai.suggest_prompt_edit` writes to a separate pending table, not here, so a
-- suggester cannot activate a prompt.
-- ---------------------------------------------------------------------------

drop policy if exists ai_prompt_templates_editor_read on public.ai_prompt_templates;
drop policy if exists ai_prompt_templates_read on public.ai_prompt_templates;
create policy ai_prompt_templates_read on public.ai_prompt_templates
  for select to authenticated
  using (
    public.tng_has_any_permission(array[
      'ai.use_writing', 'ai.use_seo', 'ai.use_research',
      'ai.use_image_prompt', 'ai.manage_prompt_library'
    ])
  );

drop policy if exists ai_prompt_templates_admin_write on public.ai_prompt_templates;
drop policy if exists ai_prompt_templates_owner_write on public.ai_prompt_templates;
create policy ai_prompt_templates_owner_write on public.ai_prompt_templates
  for all to authenticated
  using (public.tng_has_permission('ai.manage_prompt_library'))
  with check (public.tng_has_permission('ai.manage_prompt_library'));

-- ---------------------------------------------------------------------------
-- ai_generation_jobs
--
-- Old: editor read, editor write.
-- New: a user sees their own jobs; seeing everyone's requires `ai.view_usage`.
-- Writing requires an AI usage permission and authorship of the job.
-- ---------------------------------------------------------------------------

drop policy if exists ai_generation_jobs_editor_read on public.ai_generation_jobs;
drop policy if exists ai_generation_jobs_read on public.ai_generation_jobs;
create policy ai_generation_jobs_read on public.ai_generation_jobs
  for select to authenticated
  using (
    created_by = auth.uid()
    or public.tng_has_permission('ai.view_usage')
  );

drop policy if exists ai_generation_jobs_editor_write on public.ai_generation_jobs;
drop policy if exists ai_generation_jobs_write on public.ai_generation_jobs;
create policy ai_generation_jobs_write on public.ai_generation_jobs
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.tng_has_any_permission(array[
      'ai.use_writing', 'ai.use_seo', 'ai.use_research', 'ai.use_image_prompt'
    ])
  );

drop policy if exists ai_generation_jobs_update on public.ai_generation_jobs;
create policy ai_generation_jobs_update on public.ai_generation_jobs
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- rewrite_jobs
--
-- Old: editor all.
-- New: own jobs plus `ai.use_research`, which is the capability a rewrite job
-- actually exercises.
-- ---------------------------------------------------------------------------

drop policy if exists rewrite_jobs_editor_all on public.rewrite_jobs;
drop policy if exists rewrite_jobs_read on public.rewrite_jobs;
create policy rewrite_jobs_read on public.rewrite_jobs
  for select to authenticated
  using (
    created_by = auth.uid()
    or public.tng_has_permission('ai.view_usage')
  );

drop policy if exists rewrite_jobs_write on public.rewrite_jobs;
create policy rewrite_jobs_write on public.rewrite_jobs
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.tng_has_permission('ai.use_research')
  );

drop policy if exists rewrite_jobs_update on public.rewrite_jobs;
create policy rewrite_jobs_update on public.rewrite_jobs
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- storage: contributions bucket
--
-- Old: public read of the bucket; editor write.
-- New: same public read, since an approved contribution shows its photo.
-- Writing requires `community.moderate` or `media.upload`.
-- ---------------------------------------------------------------------------

drop policy if exists contributions_bucket_public_read on storage.objects;
create policy contributions_bucket_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'contributions');

drop policy if exists contributions_bucket_editor_write on storage.objects;
drop policy if exists contributions_bucket_write on storage.objects;
create policy contributions_bucket_write on storage.objects
  for all to authenticated
  using (
    bucket_id = 'contributions'
    and public.tng_has_any_permission(array['community.moderate', 'media.upload'])
  )
  with check (
    bucket_id = 'contributions'
    and public.tng_has_any_permission(array['community.moderate', 'media.upload'])
  );

-- ---------------------------------------------------------------------------
-- In-transaction assertions
--
-- These check policy PRESENCE and that no rewritten policy still references a
-- legacy helper. They do NOT and cannot verify allow/deny behaviour: that needs
-- a session with JWT claims, which does not exist inside a migration. See
-- docs/RLS_TESTING.md for the behavioural suite.
-- ---------------------------------------------------------------------------

do $$
declare
  missing text;
  legacy text;
  expected text[] := array[
    'profiles_select_self', 'profiles_update_self', 'profiles_suspend',
    'profiles_owner_delete',
    'articles_public_read', 'articles_internal_read', 'articles_create',
    'articles_update', 'articles_owner_delete',
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
  -- Every intended policy exists.
  select string_agg(e, ', ')
    into missing
    from unnest(expected) e
   where not exists (
     select 1 from pg_policies
      where schemaname = 'public' and policyname = e
   );

  if missing is not null then
    raise exception 'Policy rewrite incomplete, missing: %', missing;
  end if;

  -- No remaining policy in public references a legacy ladder helper. This is the
  -- assertion that catches a policy silently left on the old model.
  select string_agg(policyname || ' on ' || tablename, ', ')
    into legacy
    from pg_policies
   where schemaname = 'public'
     and (
       coalesce(qual, '') like '%tng_is_editor%'
       or coalesce(qual, '') like '%tng_is_admin%'
       or coalesce(qual, '') like '%tng_current_role()%'
       or coalesce(with_check, '') like '%tng_is_editor%'
       or coalesce(with_check, '') like '%tng_is_admin%'
       or coalesce(with_check, '') like '%tng_current_role()%'
     );

  if legacy is not null then
    raise exception 'Policies still referencing legacy role helpers: %', legacy;
  end if;

  -- ai_api_keys must have no policy for the API roles.
  if exists (
    select 1 from pg_policies
     where schemaname = 'public'
       and tablename = 'ai_api_keys'
       and ('anon' = any(roles) or 'authenticated' = any(roles))
  ) then
    raise exception 'ai_api_keys must not be reachable by anon or authenticated.';
  end if;

  -- audit_logs must have no write policy.
  if exists (
    select 1 from pg_policies
     where schemaname = 'public'
       and tablename = 'audit_logs'
       and cmd in ('INSERT', 'UPDATE', 'DELETE')
  ) then
    raise exception 'audit_logs must have no write policy; writes go through tng_write_audit_log.';
  end if;
end $$;

commit;

-- ===========================================================================
-- PART 5 — Index support for the public media path
--
-- Deliberately created after the policy transaction, and deliberately narrow.
--
-- Existing indexes on `article_images` (from 0002): `article_images_article_idx`
-- on (article_id), and `article_images_one_cover_idx`, a unique partial on
-- (article_id) where is_cover. Neither covers the provenance filter, so the
-- public read policy would fall back to a filter on the article_id lookup.
--
-- The predicate below mirrors `tng_is_public_media` exactly. `is_mock` is NOT
-- included because that column does not exist on `article_images`: it lives on
-- `articles` only, verified against 0002 and 0007. Including it would fail.
-- ===========================================================================

create index if not exists article_images_public_media_idx
  on public.article_images (article_id)
  where deleted_at is null
    and content_environment = 'production'
    and media_source_type is not null
    and media_source_type <> 'mock_visual';

comment on index public.article_images_public_media_idx is
  'Supports the public media read path. Predicate mirrors tng_is_public_media. Excludes is_mock, which is not a column on this table.';

-- ===========================================================================
-- PART 6 � Media provenance remediation queue
--
-- Operational consequence of the fail-closed media gate, stated plainly:
--
--   Legacy uploaded images with unknown provenance will not appear publicly
--   after 0011 until a privileged editor classifies them.
--
-- This is intended. Unknown provenance is not production-safe provenance, and
-- the unknown set includes AI illustrations and placeholders.
--
-- The view below is the backend contract for the remediation queue. The UI is
-- deliberately not built yet; this is the query it will read.
-- ===========================================================================

create or replace view public.media_provenance_queue as
  select
    i.id,
    i.article_id,
    i.url,
    i.source,
    i.alt_text,
    i.caption,
    i.attribution_text,
    i.created_by,
    i.created_at,
    i.content_environment,
    -- Why this asset is blocked, so the queue can be grouped by cause.
    case
      when i.media_source_type is null then 'provenance_undeclared'
      when i.media_source_type = 'mock_visual' then 'mock_fixture'
      when i.content_environment <> 'production' then 'non_production_environment'
      when i.deleted_at is not null then 'soft_deleted'
      else 'eligible'
    end as blocked_reason,
    -- Whether the parent article is live, which sets remediation urgency: an
    -- undeclared asset on a published article is a visible gap today.
    public.tng_is_publicly_publishable(i.article_id) as parent_is_public
  from public.article_images i
 where i.deleted_at is null
   and not public.tng_is_public_media(i.id);

comment on view public.media_provenance_queue is
  'Assets that cannot be delivered publicly, with the reason. Read by the media remediation workflow. Ordering by parent_is_public surfaces gaps on live articles first.';

/*
 * Views do not carry their own RLS; they inherit the policies of the underlying
 * table. `article_images_internal_read` requires media.edit_metadata or
 * article.read_all, so the queue is already limited to staff who could act on
 * it. `security_invoker` makes that inheritance explicit rather than relying on
 * the view owner's rights.
 */
alter view public.media_provenance_queue set (security_invoker = on);

revoke all on public.media_provenance_queue from anon;
grant select on public.media_provenance_queue to authenticated;
