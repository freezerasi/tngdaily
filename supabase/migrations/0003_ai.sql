-- ---------------------------------------------------------------------------
-- TNG Daily — 0003 AI engine tables
-- ---------------------------------------------------------------------------

create table if not exists public.ai_providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_url text not null,
  default_model text not null,
  is_active boolean not null default true,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_providers_name_len check (char_length(name) between 2 and 80),
  -- Only https endpoints, except explicit localhost during development.
  constraint ai_providers_base_url_scheme check (
    base_url ~* '^https://' or base_url ~* '^http://(localhost|127\.0\.0\.1)(:[0-9]+)?(/|$)'
  )
);

create trigger ai_providers_set_updated_at
  before update on public.ai_providers
  for each row execute function public.tng_set_updated_at();

create unique index if not exists ai_providers_name_idx on public.ai_providers (lower(name));

create table if not exists public.ai_api_keys (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.ai_providers (id) on delete cascade,
  -- Reference into vault.secrets. The plaintext key is never stored here.
  vault_secret_id uuid not null,
  key_label text,
  key_preview text not null,
  priority integer not null default 100,
  status tng_ai_key_status not null default 'active',
  last_used_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_api_keys_priority_range check (priority between 1 and 999),
  -- Guards against ever writing a full key into the preview column.
  constraint ai_api_keys_preview_masked check (
    key_preview ~ '\.\.\.' and char_length(key_preview) <= 24
  )
);

create trigger ai_api_keys_set_updated_at
  before update on public.ai_api_keys
  for each row execute function public.tng_set_updated_at();

create index if not exists ai_api_keys_provider_priority_idx
  on public.ai_api_keys (provider_id, priority);
create index if not exists ai_api_keys_active_priority_idx
  on public.ai_api_keys (priority)
  where status = 'active';

create table if not exists public.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid references public.ai_api_keys (id) on delete set null,
  provider_name text,
  task_type tng_ai_task_type not null,
  model text,
  tokens_used integer,
  prompt_tokens integer,
  completion_tokens integer,
  latency_ms integer,
  success boolean not null default false,
  status_code integer,
  error_code text,
  attempt integer not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_log_created_idx on public.ai_usage_log (created_at desc);
create index if not exists ai_usage_log_key_idx on public.ai_usage_log (api_key_id, created_at desc);

create table if not exists public.ai_prompt_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null unique,
  task_type tng_ai_task_type not null,
  name text not null,
  system_prompt text not null,
  user_prompt_template text,
  output_schema jsonb,
  version integer not null default 1,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_prompt_templates_key_format check (template_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create trigger ai_prompt_templates_set_updated_at
  before update on public.ai_prompt_templates
  for each row execute function public.tng_set_updated_at();

create index if not exists ai_prompt_templates_task_active_idx
  on public.ai_prompt_templates (task_type)
  where is_active;

create table if not exists public.ai_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references public.articles (id) on delete set null,
  -- Groups the stages of one Content Studio run.
  session_key text,
  task_type tng_ai_task_type not null,
  status tng_ai_job_status not null default 'pending',
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  prompt_template_id uuid references public.ai_prompt_templates (id) on delete set null,
  prompt_version integer,
  prompt_template_key text,
  provider_name text,
  model text,
  latency_ms integer,
  revision integer not null default 1,
  error_message text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger ai_generation_jobs_set_updated_at
  before update on public.ai_generation_jobs
  for each row execute function public.tng_set_updated_at();

create index if not exists ai_generation_jobs_session_idx
  on public.ai_generation_jobs (session_key, task_type, revision desc);
create index if not exists ai_generation_jobs_created_by_idx
  on public.ai_generation_jobs (created_by, created_at desc);

create table if not exists public.rewrite_jobs (
  id uuid primary key default gen_random_uuid(),
  source_urls text[] not null,
  extracted_content jsonb,
  synthesis jsonb,
  generated_article_id uuid references public.articles (id) on delete set null,
  similarity_score double precision,
  similarity_report jsonb,
  decision text,
  status tng_rewrite_status not null default 'pending',
  error_message text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rewrite_jobs_url_count check (
    array_length(source_urls, 1) between 1 and 5
  ),
  constraint rewrite_jobs_similarity_range check (
    similarity_score is null or similarity_score between 0 and 1
  ),
  constraint rewrite_jobs_decision_allowed check (
    decision is null or decision in (
      'proceed', 'needs_more_original_reporting', 'insufficient_source_material'
    )
  )
);

create trigger rewrite_jobs_set_updated_at
  before update on public.rewrite_jobs
  for each row execute function public.tng_set_updated_at();

create index if not exists rewrite_jobs_created_idx on public.rewrite_jobs (created_at desc);

-- Deferred FK: rewrite_jobs is created after articles.
alter table public.articles
  drop constraint if exists articles_source_rewrite_job_fk;
alter table public.articles
  add constraint articles_source_rewrite_job_fk
  foreign key (source_rewrite_job_id)
  references public.rewrite_jobs (id) on delete set null;
