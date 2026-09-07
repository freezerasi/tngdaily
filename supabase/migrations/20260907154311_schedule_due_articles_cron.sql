-- ---------------------------------------------------------------------------
-- TNG Daily - schedule due article publishing
--
-- Supabase Cron is backed by pg_cron. The job is intentionally small: every
-- five minutes it publishes articles whose scheduled_at has passed.
-- ---------------------------------------------------------------------------

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
  'tng-publish-due-articles',
  '*/5 * * * *',
  'select public.tng_publish_due_articles();'
);

do $$
declare
  job_count integer;
begin
  select count(*)
    into job_count
    from cron.job
   where jobname = 'tng-publish-due-articles'
     and active;

  if job_count <> 1 then
    raise exception 'Expected exactly one active tng-publish-due-articles cron job, found %.', job_count;
  end if;
end
$$;
