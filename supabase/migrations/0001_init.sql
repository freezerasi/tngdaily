-- ---------------------------------------------------------------------------
-- TNG Daily — 0001 init: extensions, enums, helper functions
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

-- Enums keep the pillar/status vocabulary identical between DB and TypeScript.
do $$ begin
  create type tng_pillar as enum ('vibes', 'suara', 'hustle', 'story');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tng_article_status as enum (
    'draft', 'needs_review', 'scheduled', 'published', 'archived'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type tng_user_role as enum ('reader', 'contributor', 'editor', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tng_reaction_type as enum ('like', 'save', 'share');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tng_contribution_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tng_image_source as enum ('upload', 'unsplash', 'pexels', 'pixabay');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tng_ai_key_status as enum ('active', 'rate_limited', 'error', 'disabled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tng_ai_task_type as enum (
    'brand', 'ideation', 'headline', 'outline', 'draft', 'rewrite',
    'seo', 'image', 'quality', 'social', 'copilot', 'connection_test'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type tng_ai_job_status as enum ('pending', 'processing', 'completed', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tng_rewrite_status as enum (
    'pending', 'processing', 'needs_review', 'completed', 'failed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type tng_directory_type as enum ('loker', 'umkm', 'kos', 'event');
exception when duplicate_object then null; end $$;

-- Keeps updated_at honest without application code remembering to set it.
create or replace function public.tng_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
