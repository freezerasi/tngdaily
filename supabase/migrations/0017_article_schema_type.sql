-- 0017: Article structured-data schema selection.
--
-- Editors pick the JSON-LD schema per article from the AI assistant or the
-- editor sidebar. The site renders the chosen schema server-side from stored
-- metadata; no model-authored graph is ever trusted.

-- Postgres has no `create type if not exists`: guard with a DO block.
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'tng_article_schema' and n.nspname = 'public'
  ) then
    create type public.tng_article_schema as enum (
      'NewsArticle',
      'Article',
      'ReportageNewsArticle',
      'OpinionNewsArticle',
      'AnalysisNewsArticle',
      'ReviewArticle',
      'HowTo',
      'FAQPage'
    );
  end if;
end
$$;

alter table public.articles
  add column if not exists schema_type public.tng_article_schema
    not null default 'NewsArticle';

comment on column public.articles.schema_type is
  'Which JSON-LD schema the public article page renders. Chosen by the editor (the AI assistant only recommends), defaulting to NewsArticle.';
