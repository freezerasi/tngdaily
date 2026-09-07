-- ---------------------------------------------------------------------------
-- TNG Daily - AI model registry and task routing
--
-- Providers may expose multiple models. Editors need to select which models
-- are usable and owners need per-task routing so one model can be primary while
-- others act as fallback when a provider/key is rate-limited or errors.
-- ---------------------------------------------------------------------------

alter table public.ai_providers
  alter column default_model drop not null;

create table if not exists public.ai_models (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.ai_providers (id) on delete cascade,
  model_key text not null,
  display_name text,
  is_enabled boolean not null default true,
  source text not null default 'detected',
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_models_model_key_len check (char_length(model_key) between 1 and 160),
  constraint ai_models_display_name_len check (
    display_name is null or char_length(display_name) between 1 and 180
  ),
  constraint ai_models_source_check check (source in ('detected', 'manual'))
);

create unique index if not exists ai_models_provider_key_idx
  on public.ai_models (provider_id, model_key);

create index if not exists ai_models_provider_enabled_idx
  on public.ai_models (provider_id, is_enabled);

drop trigger if exists ai_models_set_updated_at on public.ai_models;
create trigger ai_models_set_updated_at
  before update on public.ai_models
  for each row execute function public.tng_set_updated_at();

create table if not exists public.ai_task_models (
  id uuid primary key default gen_random_uuid(),
  task_type tng_ai_task_type not null,
  model_id uuid not null references public.ai_models (id) on delete cascade,
  priority integer not null default 100,
  is_enabled boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_task_models_priority_range check (priority between 1 and 999)
);

create unique index if not exists ai_task_models_task_model_idx
  on public.ai_task_models (task_type, model_id);

create index if not exists ai_task_models_task_priority_idx
  on public.ai_task_models (task_type, priority)
  where is_enabled;

drop trigger if exists ai_task_models_set_updated_at on public.ai_task_models;
create trigger ai_task_models_set_updated_at
  before update on public.ai_task_models
  for each row execute function public.tng_set_updated_at();

alter table public.ai_models enable row level security;
alter table public.ai_task_models enable row level security;

drop policy if exists ai_models_configure on public.ai_models;
create policy ai_models_configure on public.ai_models
  for all to authenticated
  using ((select public.tng_has_permission('ai.configure_provider')))
  with check ((select public.tng_has_permission('ai.configure_provider')));

drop policy if exists ai_task_models_configure on public.ai_task_models;
create policy ai_task_models_configure on public.ai_task_models
  for all to authenticated
  using ((select public.tng_has_permission('ai.configure_provider')))
  with check ((select public.tng_has_permission('ai.configure_provider')));

grant select, insert, update, delete on table public.ai_models to authenticated;
grant select, insert, update, delete on table public.ai_task_models to authenticated;

do $$
begin
  if not exists (
    select 1
      from pg_policies
     where schemaname = 'public'
       and tablename = 'ai_models'
       and policyname = 'ai_models_configure'
  ) then
    raise exception 'Assertion failed: ai_models_configure policy missing.';
  end if;

  if not exists (
    select 1
      from pg_policies
     where schemaname = 'public'
       and tablename = 'ai_task_models'
       and policyname = 'ai_task_models_configure'
  ) then
    raise exception 'Assertion failed: ai_task_models_configure policy missing.';
  end if;
end;
$$;
