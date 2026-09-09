-- ---------------------------------------------------------------------------
-- TNG Daily — stale Rewrite Studio job reaper
--
-- Finding (2026-09-09 verification): 10 rewrite_jobs rows were stuck in
-- status `processing` for 2–12 hours. The extract route inserts `processing`
-- the moment extraction succeeds, and the row only leaves that state when the
-- editor runs synthesis. A closed tab, a crashed request, or an abandoned
-- brief leaves the row there forever: there is no worker holding it.
--
-- Design notes:
-- - The 24h threshold only sweeps abandoned extractions. No legitimate
--   request runs that long (synthesize route maxDuration is 300s and the AI
--   gateway budget is ~280s), and the synthesize route resolves the job by id
--   without filtering on status, so an editor mid-brief is never broken by a
--   status flip: extracted_content is preserved untouched.
-- - Hourly cadence matches the audit-trail nature of the table; this is
--   hygiene, not a hot path.
-- ---------------------------------------------------------------------------

create or replace function public.tng_fail_stale_rewrite_jobs()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.rewrite_jobs
     set status = 'failed',
         error_message = 'Job ditandai gagal otomatis: tidak ada sintesis dalam 24 jam setelah ekstraksi (stale-worker reaper). Ekstrak ulang sumber untuk mencoba lagi.',
         updated_at = now()
   where status = 'processing'
     and coalesce(updated_at, created_at) < now() - interval '24 hours';
  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.tng_fail_stale_rewrite_jobs() from public, anon, authenticated;
grant execute on function public.tng_fail_stale_rewrite_jobs() to service_role;

create extension if not exists pg_cron;

do $$
begin
  if to_regprocedure('cron.schedule(text,text,text)') is null then
    raise exception 'pg_cron is not available. Enable Supabase Cron before applying this migration.'
      using errcode = 'feature_not_supported';
  end if;
end
$$;

select cron.schedule(
  'tng-fail-stale-rewrite-jobs',
  '0 * * * *',
  'select public.tng_fail_stale_rewrite_jobs();'
);

do $$
declare
  job_count integer;
begin
  select count(*)
    into job_count
    from cron.job
   where jobname = 'tng-fail-stale-rewrite-jobs'
     and active;

  if job_count <> 1 then
    raise exception 'Expected exactly one active tng-fail-stale-rewrite-jobs cron job, found %.', job_count;
  end if;
end
$$;
