-- ---------------------------------------------------------------------------
-- TNG Daily — 0004 functions, triggers, and Vault wrappers
-- ---------------------------------------------------------------------------

-- Every auth user gets a profile with the lowest role. Elevation is manual SQL.
create or replace function public.tng_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, role)
  values (
    new.id,
    nullif(regexp_replace(lower(split_part(coalesce(new.email, ''), '@', 1)), '[^a-z0-9_.-]', '', 'g'), ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)),
    'reader'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.tng_handle_new_user();

-- Role lookup used by every policy. SECURITY DEFINER avoids recursive RLS on
-- profiles when a policy needs to know the caller's own role.
create or replace function public.tng_current_role()
returns tng_user_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'reader'::tng_user_role
  );
$$;

create or replace function public.tng_is_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.tng_current_role() in ('editor', 'admin');
$$;

create or replace function public.tng_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.tng_current_role() = 'admin';
$$;

-- Atomic view counter so a page view never needs a read-modify-write round trip.
create or replace function public.tng_increment_article_view(p_article_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.articles
     set view_count = view_count + 1
   where id = p_article_id
     and status = 'published';
$$;

-- Denormalised reaction counters, maintained by trigger so the public feed can
-- read counts without an aggregate per card.
create or replace function public.tng_sync_reaction_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  delta integer;
  reaction tng_reaction_type;
begin
  if (tg_op = 'INSERT') then
    target_id := new.article_id;
    reaction := new.type;
    delta := 1;
  else
    target_id := old.article_id;
    reaction := old.type;
    delta := -1;
  end if;

  update public.articles
     set like_count  = greatest(0, like_count  + case when reaction = 'like'  then delta else 0 end),
         save_count  = greatest(0, save_count  + case when reaction = 'save'  then delta else 0 end),
         share_count = greatest(0, share_count + case when reaction = 'share' then delta else 0 end)
   where id = target_id;

  return null;
end;
$$;

drop trigger if exists reactions_sync_counts_ins on public.reactions;
create trigger reactions_sync_counts_ins
  after insert on public.reactions
  for each row execute function public.tng_sync_reaction_counts();

drop trigger if exists reactions_sync_counts_del on public.reactions;
create trigger reactions_sync_counts_del
  after delete on public.reactions
  for each row execute function public.tng_sync_reaction_counts();

-- Publishes any scheduled article whose time has passed. Call from a cron job
-- (pg_cron or an external scheduler hitting a server route).
create or replace function public.tng_publish_due_articles()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.articles
     set status = 'published',
         published_at = coalesce(published_at, scheduled_at, now())
   where status = 'scheduled'
     and scheduled_at is not null
     and scheduled_at <= now();
  get diagnostics affected = row_count;
  return affected;
end;
$$;

-- ---------------------------------------------------------------------------
-- Supabase Vault wrappers
--
-- These are the only path through which an AI provider key is written or read.
-- Dynamic SQL keeps the migration applicable on a project where the
-- supabase_vault extension has not been enabled yet: the functions install,
-- and raise a clear error at call time instead of failing the whole migration.
-- ---------------------------------------------------------------------------

create or replace function public.tng_vault_create_secret(
  p_secret text,
  p_name text,
  p_description text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  new_id uuid;
begin
  if to_regprocedure('vault.create_secret(text,text,text)') is null then
    raise exception
      'Supabase Vault is not available. Enable the supabase_vault extension or set SECRET_STORE_DRIVER=development.'
      using errcode = 'feature_not_supported';
  end if;

  execute 'select vault.create_secret($1, $2, $3)'
    into new_id
    using p_secret, p_name, coalesce(p_description, '');

  return new_id;
end;
$$;

create or replace function public.tng_vault_read_secret(p_secret_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  secret_value text;
begin
  if to_regclass('vault.decrypted_secrets') is null then
    raise exception
      'Supabase Vault is not available. Enable the supabase_vault extension or set SECRET_STORE_DRIVER=development.'
      using errcode = 'feature_not_supported';
  end if;

  execute 'select decrypted_secret from vault.decrypted_secrets where id = $1'
    into secret_value
    using p_secret_id;

  if secret_value is null then
    raise exception 'Secret % not found in Vault.', p_secret_id
      using errcode = 'no_data_found';
  end if;

  return secret_value;
end;
$$;

create or replace function public.tng_vault_delete_secret(p_secret_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
begin
  if to_regclass('vault.secrets') is null then
    return;
  end if;

  execute 'delete from vault.secrets where id = $1' using p_secret_id;
end;
$$;

-- The Vault wrappers are service-role only. Revoking the API roles means an
-- anon or logged-in browser session can never call them, even with a valid JWT.
revoke all on function public.tng_vault_create_secret(text, text, text) from public, anon, authenticated;
revoke all on function public.tng_vault_read_secret(uuid) from public, anon, authenticated;
revoke all on function public.tng_vault_delete_secret(uuid) from public, anon, authenticated;
grant execute on function public.tng_vault_create_secret(text, text, text) to service_role;
grant execute on function public.tng_vault_read_secret(uuid) to service_role;
grant execute on function public.tng_vault_delete_secret(uuid) to service_role;

revoke all on function public.tng_publish_due_articles() from public, anon, authenticated;
grant execute on function public.tng_publish_due_articles() to service_role;

grant execute on function public.tng_increment_article_view(uuid) to anon, authenticated, service_role;
