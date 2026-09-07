-- Add indexes for public foreign-key columns that were not covered by a
-- primary key, unique constraint, or existing query index.
--
-- Postgres does not automatically index FK columns. These indexes keep joins,
-- deletes, and moderation/admin screens from degrading into full table scans as
-- data grows. Supabase-managed storage tables are deliberately excluded.

create index if not exists ai_generation_jobs_article_idx
  on public.ai_generation_jobs (article_id);

create index if not exists ai_generation_jobs_prompt_template_idx
  on public.ai_generation_jobs (prompt_template_id);

create index if not exists ai_prompt_templates_created_by_idx
  on public.ai_prompt_templates (created_by);

create index if not exists ai_prompt_templates_updated_by_idx
  on public.ai_prompt_templates (updated_by);

create index if not exists ai_providers_created_by_idx
  on public.ai_providers (created_by);

create index if not exists article_images_created_by_idx
  on public.article_images (created_by);

create index if not exists articles_deleted_by_idx
  on public.articles (deleted_by);

create index if not exists articles_source_rewrite_job_idx
  on public.articles (source_rewrite_job_id);

create index if not exists contributions_published_article_idx
  on public.contributions (published_article_id);

create index if not exists contributions_reviewed_by_idx
  on public.contributions (reviewed_by);

create index if not exists directory_listings_created_by_idx
  on public.directory_listings (created_by);

create index if not exists feature_flags_updated_by_idx
  on public.feature_flags (updated_by);

create index if not exists invitations_accepted_by_idx
  on public.invitations (accepted_by);

create index if not exists invitations_invited_by_idx
  on public.invitations (invited_by);

create index if not exists invitations_role_idx
  on public.invitations (role_id);

create index if not exists rewrite_jobs_created_by_idx
  on public.rewrite_jobs (created_by);

create index if not exists rewrite_jobs_generated_article_idx
  on public.rewrite_jobs (generated_article_id);

create index if not exists user_roles_assigned_by_idx
  on public.user_roles (assigned_by);

analyze public.ai_generation_jobs;
analyze public.ai_prompt_templates;
analyze public.ai_providers;
analyze public.article_images;
analyze public.articles;
analyze public.contributions;
analyze public.directory_listings;
analyze public.feature_flags;
analyze public.invitations;
analyze public.rewrite_jobs;
analyze public.user_roles;

do $$
declare
  missing text;
begin
  select string_agg(format('%s.%s', conrelid::regclass::text, a.attname), ', ')
    into missing
    from pg_constraint c
    join pg_attribute a
      on a.attrelid = c.conrelid
     and a.attnum = any(c.conkey)
   where c.contype = 'f'
     and c.connamespace = 'public'::regnamespace
     and not exists (
       select 1
         from pg_index i
        where i.indrelid = c.conrelid
          and a.attnum = any(i.indkey)
     );

  if missing is not null then
    raise exception 'public FK columns without an index remain: %', missing;
  end if;
end $$;
