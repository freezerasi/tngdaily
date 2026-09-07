-- ---------------------------------------------------------------------------
-- TNG Daily — 0002 content tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  display_name text,
  role tng_user_role not null default 'reader',
  bio text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (
    username is null or username ~ '^[a-z0-9_.-]{3,32}$'
  )
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.tng_set_updated_at();

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  dek text,
  content_markdown text not null default '',
  cover_image_url text,
  cover_image_alt text,
  cover_image_credit text,
  pillar tng_pillar not null,
  tags text[] not null default '{}',
  status tng_article_status not null default 'draft',
  author_id uuid references public.profiles (id) on delete set null,
  author_name text,
  published_at timestamptz,
  scheduled_at timestamptz,
  seo_title text,
  meta_description text,
  primary_keyword text,
  secondary_keywords text[] not null default '{}',
  reading_minutes integer,
  generated_by_ai boolean not null default false,
  ai_provider_used text,
  source_rewrite_job_id uuid,
  is_sample boolean not null default false,
  view_count integer not null default 0,
  like_count integer not null default 0,
  save_count integer not null default 0,
  share_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint articles_title_len check (char_length(title) between 3 and 200),
  constraint articles_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint articles_published_needs_time check (
    status <> 'published' or published_at is not null
  ),
  constraint articles_scheduled_needs_time check (
    status <> 'scheduled' or scheduled_at is not null
  ),
  constraint articles_reading_minutes_range check (
    reading_minutes is null or reading_minutes between 1 and 120
  )
);

create trigger articles_set_updated_at
  before update on public.articles
  for each row execute function public.tng_set_updated_at();

create index if not exists articles_status_published_at_idx
  on public.articles (status, published_at desc nulls last);
create index if not exists articles_pillar_published_at_idx
  on public.articles (pillar, published_at desc nulls last)
  where status = 'published';
create index if not exists articles_tags_idx on public.articles using gin (tags);
create index if not exists articles_scheduled_at_idx
  on public.articles (scheduled_at)
  where status = 'scheduled';
create index if not exists articles_author_idx on public.articles (author_id);
create index if not exists articles_search_idx
  on public.articles using gin (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(excerpt, ''))
  );

create table if not exists public.article_sources (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  source_name text not null,
  source_url text not null,
  attribution_text text,
  source_type text not null default 'reference',
  created_at timestamptz not null default now(),
  constraint article_sources_url_scheme check (source_url ~* '^https?://'),
  constraint article_sources_type_allowed check (
    source_type in ('reference', 'rewrite', 'data', 'interview', 'press_release')
  )
);

create index if not exists article_sources_article_idx
  on public.article_sources (article_id);

create table if not exists public.article_images (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references public.articles (id) on delete cascade,
  cloudinary_public_id text,
  url text not null,
  alt_text text,
  caption text,
  width integer,
  height integer,
  source tng_image_source not null default 'upload',
  original_source_url text,
  photographer_name text,
  photographer_url text,
  attribution_text text,
  is_cover boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint article_images_url_scheme check (url ~* '^https?://'),
  -- Stock providers require visible credit, so attribution is not optional.
  constraint article_images_stock_needs_credit check (
    source = 'upload' or attribution_text is not null
  )
);

create index if not exists article_images_article_idx
  on public.article_images (article_id);
create unique index if not exists article_images_one_cover_idx
  on public.article_images (article_id)
  where is_cover;

create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  session_id text not null,
  type tng_reaction_type not null,
  created_at timestamptz not null default now(),
  constraint reactions_session_len check (char_length(session_id) between 8 and 128)
);

-- One like/save per session per article; shares are also idempotent per session.
create unique index if not exists reactions_unique_idx
  on public.reactions (article_id, session_id, type);
create index if not exists reactions_article_type_idx
  on public.reactions (article_id, type);

create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  contributor_name text not null,
  contributor_contact text,
  title text not null,
  content text not null,
  pillar tng_pillar not null,
  location text,
  media_urls text[] not null default '{}',
  consent_publish boolean not null default false,
  consent_edit boolean not null default false,
  status tng_contribution_status not null default 'pending',
  moderation_note text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  published_article_id uuid references public.articles (id) on delete set null,
  submitter_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contributions_name_len check (char_length(contributor_name) between 2 and 80),
  constraint contributions_title_len check (char_length(title) between 5 and 160),
  constraint contributions_content_len check (char_length(content) between 60 and 8000),
  constraint contributions_media_count check (array_length(media_urls, 1) is null or array_length(media_urls, 1) <= 4),
  -- Nothing enters the moderation queue without publish consent.
  constraint contributions_consent_required check (consent_publish)
);

create trigger contributions_set_updated_at
  before update on public.contributions
  for each row execute function public.tng_set_updated_at();

create index if not exists contributions_status_created_idx
  on public.contributions (status, created_at desc);
create index if not exists contributions_submitter_hash_idx
  on public.contributions (submitter_hash, created_at desc);

create table if not exists public.directory_listings (
  id uuid primary key default gen_random_uuid(),
  type tng_directory_type not null,
  title text not null,
  description text,
  company_name text,
  contact_info text,
  location text,
  price_range text,
  external_url text,
  is_paid boolean not null default false,
  is_active boolean not null default true,
  expires_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint directory_url_scheme check (
    external_url is null or external_url ~* '^https?://'
  )
);

create trigger directory_listings_set_updated_at
  before update on public.directory_listings
  for each row execute function public.tng_set_updated_at();

create index if not exists directory_active_idx
  on public.directory_listings (type, created_at desc)
  where is_active;
