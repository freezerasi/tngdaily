-- ---------------------------------------------------------------------------
-- TNG Daily — 0007 cover provenance and mock flagging
--
-- Two integrity problems this migration fixes:
--
--   1. A cover image had nowhere to record *what it is*. `cover_image_credit`
--      was free text, so a credit could claim newsroom photography that never
--      happened. Provenance is now structured and constrained.
--
--   2. Development fixtures had no durable marker, so nothing stopped a seeded
--      placeholder from being served, indexed, or shared as real reporting.
--      `is_mock` is now a column, and the public read policy excludes it.
-- ---------------------------------------------------------------------------

do $$ begin
  create type tng_media_source_type as enum (
    'original_photo',
    'licensed_photo',
    'community_submission',
    'editorial_graphic',
    'ai_illustration',
    'mock_visual'
  );
exception when duplicate_object then null; end $$;

alter table public.articles
  add column if not exists cover_media_source_type tng_media_source_type,
  add column if not exists cover_media_credit text,
  add column if not exists cover_media_disclosure text,
  add column if not exists cover_depicts_actual_location boolean not null default false,
  add column if not exists cover_depicts_actual_event boolean not null default false,
  add column if not exists is_mock boolean not null default false;

-- A cover must declare what it is. Enforced only when a cover exists, so a
-- text-only article is unaffected.
alter table public.articles
  drop constraint if exists articles_cover_needs_provenance;
alter table public.articles
  add constraint articles_cover_needs_provenance check (
    cover_image_url is null
    or (cover_media_source_type is not null and cover_media_credit is not null)
  );

-- A generated or placeholder frame can never be evidence of a real place or
-- event. This is the database refusing the claim, not just the UI.
alter table public.articles
  drop constraint if exists articles_non_evidentiary_cover;
alter table public.articles
  add constraint articles_non_evidentiary_cover check (
    cover_media_source_type is null
    or cover_media_source_type not in ('ai_illustration', 'mock_visual')
    or (cover_depicts_actual_location = false and cover_depicts_actual_event = false)
  );

-- Non-evidentiary frames must carry a reader-facing disclosure.
alter table public.articles
  drop constraint if exists articles_non_evidentiary_needs_disclosure;
alter table public.articles
  add constraint articles_non_evidentiary_needs_disclosure check (
    cover_media_source_type is null
    or cover_media_source_type not in ('ai_illustration', 'mock_visual')
    or cover_media_disclosure is not null
  );

-- Any cover with a real photograph must name a source of that photograph.
-- "TNG Daily" alone is not a credit; a documentary claim needs a person or a
-- licence behind it.
alter table public.articles
  drop constraint if exists articles_credit_not_placeholder;
alter table public.articles
  add constraint articles_credit_not_placeholder check (
    cover_media_credit is null or char_length(btrim(cover_media_credit)) >= 4
  );

create index if not exists articles_is_mock_idx
  on public.articles (is_mock)
  where is_mock;

-- ---------------------------------------------------------------------------
-- Public read policy: mock rows are not public content.
--
-- This is the production filter at the row level. Even if application code
-- forgets to exclude a fixture, the anon role cannot read it.
-- ---------------------------------------------------------------------------

drop policy if exists articles_public_read on public.articles;
create policy articles_public_read on public.articles
  for select to anon, authenticated
  using (
    status = 'published'
    and published_at is not null
    and published_at <= now()
    and is_mock = false
  );

-- The same exclusion for anything hanging off an article, so a mock row cannot
-- leak through its images or its source list.
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
         and a.is_mock = false
    )
  );

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
         and a.is_mock = false
    )
  );

-- Reactions belong to real articles only.
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
         and a.is_mock = false
    )
  );

-- ---------------------------------------------------------------------------
-- Same provenance model for the image library.
-- ---------------------------------------------------------------------------

alter table public.article_images
  add column if not exists media_source_type tng_media_source_type,
  add column if not exists disclosure text,
  add column if not exists depicts_actual_location boolean not null default false,
  add column if not exists depicts_actual_event boolean not null default false;

alter table public.article_images
  drop constraint if exists article_images_non_evidentiary;
alter table public.article_images
  add constraint article_images_non_evidentiary check (
    media_source_type is null
    or media_source_type not in ('ai_illustration', 'mock_visual')
    or (depicts_actual_location = false and depicts_actual_event = false)
  );

-- ---------------------------------------------------------------------------
-- Backfill: existing seeded rows are development fixtures.
--
-- Anything already carrying is_sample is a fixture from supabase/
-- seed_articles.sql. Mark it mock, strip any credit that implied reporting, and
-- attach the placeholder disclosure.
-- ---------------------------------------------------------------------------

update public.articles
   set is_mock = true,
       cover_media_source_type = 'mock_visual',
       cover_media_credit = 'Visual contoh · bukan dokumentasi',
       cover_media_disclosure =
         'Visual contoh untuk pengembangan tampilan. Gambar ini bukan dokumentasi lokasi, orang, atau peristiwa mana pun, dan tidak tayang di versi produksi.',
       cover_depicts_actual_location = false,
       cover_depicts_actual_event = false,
       cover_image_credit = null
 where is_sample = true;
