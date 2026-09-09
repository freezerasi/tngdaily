-- ---------------------------------------------------------------------------
-- TNG Daily — 0018 re-enable RLS on articles (security repair)
--
-- Finding (2026-09-09 verification): public.articles had ROW LEVEL SECURITY
-- disabled, so the 8 policies on the table were inert and the anon key could
-- read draft / needs_review rows straight through PostgREST:
--   GET /rest/v1/articles?select=slug,status  -> 200 with non-published rows
--
-- The anon policy (articles_public_read) is already scoped to published,
-- public-visibility, production-environment, non-mock, non-deleted rows, so
-- re-enabling RLS restores the intended contract without breaking the site:
-- public pages keep reading published articles, drafts stay hidden.
-- ---------------------------------------------------------------------------

alter table public.articles enable row level security;

do $$
begin
  if exists (
    select 1
      from pg_tables
     where schemaname = 'public'
       and tablename = 'articles'
       and rowsecurity = false
  ) then
    raise exception 'Assertion failed: RLS still disabled on public.articles.';
  end if;

  if not exists (
    select 1
      from pg_policies
     where schemaname = 'public'
       and tablename = 'articles'
       and policyname = 'articles_public_read'
  ) then
    raise exception 'Assertion failed: articles_public_read policy missing.';
  end if;
end;
$$;
