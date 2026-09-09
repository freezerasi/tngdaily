-- ---------------------------------------------------------------------------
-- TNG Daily — server-side aggregates for the CMS dashboard and AI overview
--
-- Finding (2026-09-09 perf audit): the dashboard fanned out 6 count queries
-- plus a list, and the AI overview pulled up to 5000 `ai_usage_log` rows into
-- Node just to reduce them into a handful of numbers. Every one of those is a
-- ~100ms sequential round trip from the app region to the database region.
--
-- These two SECURITY DEFINER functions compute the same numbers inside
-- Postgres in a single round trip each. They return counts and averages only —
-- no row content — and execute is granted to `authenticated` (CMS roles) and
-- `service_role`, never to `anon`.
-- ---------------------------------------------------------------------------

create or replace function public.tng_dashboard_stats(p_since timestamptz)
returns table (
  published_count bigint,
  draft_count bigint,
  scheduled_count bigint,
  pending_contributions bigint,
  total_views bigint,
  total_reactions bigint,
  ai_requests_7d bigint,
  ai_success_rate_7d integer
)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from public.articles where status = 'published'),
    (select count(*) from public.articles where status in ('draft', 'needs_review')),
    (select count(*) from public.articles where status = 'scheduled'),
    (select count(*) from public.contributions where status = 'pending'),
    (select coalesce(sum(view_count), 0) from public.articles where status = 'published'),
    (select coalesce(sum(like_count + save_count + share_count), 0)
       from public.articles where status = 'published'),
    (select count(*) from public.ai_usage_log where created_at >= p_since),
    (select case
              when count(*) = 0 then 0
              else round(100.0 * sum(case when success then 1 else 0 end) / count(*))::integer
            end
       from public.ai_usage_log where created_at >= p_since);
$$;

create or replace function public.tng_ai_usage_stats(p_since timestamptz)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with rows_since as (
    select provider_name, success, latency_ms, tokens_used
      from public.ai_usage_log
     where created_at >= p_since
  ),
  overall as (
    select count(*) as requests,
           coalesce(sum(case when success then 1 else 0 end), 0) as successes,
           avg(latency_ms)::numeric as avg_latency,
           coalesce(sum(tokens_used), 0) as tokens
      from rows_since
  ),
  per_provider as (
    select coalesce(provider_name, 'Tidak diketahui') as provider_name,
           count(*) as requests,
           sum(case when success then 1 else 0 end) as successes,
           avg(latency_ms)::numeric as avg_latency
      from rows_since
     group by 1
     order by requests desc
  )
  select jsonb_build_object(
    'totalRequests', (select requests from overall),
    'successRate', case
      when (select requests from overall) = 0 then 0
      else round(100.0 * (select successes from overall) / (select requests from overall))::integer
    end,
    'averageLatencyMs', coalesce(round((select avg_latency from overall))::integer, 0),
    'totalTokens', (select tokens from overall),
    'perProvider', coalesce((
      select jsonb_agg(jsonb_build_object(
        'providerName', provider_name,
        'requests', requests,
        'successRate', case
          when requests = 0 then 0
          else round(100.0 * successes / requests)::integer
        end,
        'averageLatencyMs', coalesce(round(avg_latency)::integer, 0)
      ) order by requests desc)
      from per_provider
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.tng_dashboard_stats(timestamptz) from public, anon;
grant execute on function public.tng_dashboard_stats(timestamptz) to authenticated, service_role;

revoke all on function public.tng_ai_usage_stats(timestamptz) from public, anon;
grant execute on function public.tng_ai_usage_stats(timestamptz) to authenticated, service_role;

do $$
begin
  if to_regprocedure('public.tng_dashboard_stats(timestamptz)') is null then
    raise exception 'Assertion failed: tng_dashboard_stats missing.';
  end if;
  if to_regprocedure('public.tng_ai_usage_stats(timestamptz)') is null then
    raise exception 'Assertion failed: tng_ai_usage_stats missing.';
  end if;
end;
$$;
