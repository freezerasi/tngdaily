-- ---------------------------------------------------------------------------
-- TNG Daily - AI key metadata RPCs and detected model defaults
-- ---------------------------------------------------------------------------
--
-- `ai_api_keys` intentionally keeps direct API-role mutation closed. The app's
-- server actions and gateway use the service-role client, but service_role also
-- has no direct INSERT/UPDATE/DELETE grant on this table. These narrow
-- SECURITY DEFINER RPCs are the only mutation surface for key metadata.
--
-- Detected models now start disabled. Owners explicitly enable models one by
-- one; the first enabled model for a provider becomes that provider's primary
-- model through the server action layer.
-- ---------------------------------------------------------------------------

alter table public.ai_models
  alter column is_enabled set default false;

create or replace function public.tng_ai_api_key_create(
  p_provider_id uuid,
  p_vault_secret_id uuid,
  p_key_label text,
  p_key_preview text,
  p_priority integer default 100,
  p_status public.tng_ai_key_status default 'active'
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  new_id uuid;
begin
  insert into public.ai_api_keys (
    provider_id,
    vault_secret_id,
    key_label,
    key_preview,
    priority,
    status
  )
  values (
    p_provider_id,
    p_vault_secret_id,
    nullif(btrim(p_key_label), ''),
    p_key_preview,
    p_priority,
    p_status
  )
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function public.tng_ai_api_key_update_state(
  p_key_id uuid,
  p_status public.tng_ai_key_status default null,
  p_last_error text default null,
  p_clear_last_error boolean default false,
  p_touch_last_used boolean default false
)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
  update public.ai_api_keys
     set status = coalesce(p_status, status),
         last_error = case
           when p_clear_last_error then null
           when p_last_error is not null then p_last_error
           else last_error
         end,
         last_used_at = case
           when p_touch_last_used then now()
           else last_used_at
         end
   where id = p_key_id;
$$;

create or replace function public.tng_ai_api_key_set_priority(
  p_key_id uuid,
  p_priority integer
)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
  update public.ai_api_keys
     set priority = p_priority
   where id = p_key_id;
$$;

create or replace function public.tng_ai_api_key_delete(p_key_id uuid)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
  delete from public.ai_api_keys
   where id = p_key_id;
$$;

revoke all on function public.tng_ai_api_key_create(
  uuid,
  uuid,
  text,
  text,
  integer,
  public.tng_ai_key_status
) from public, anon, authenticated;
revoke all on function public.tng_ai_api_key_update_state(
  uuid,
  public.tng_ai_key_status,
  text,
  boolean,
  boolean
) from public, anon, authenticated;
revoke all on function public.tng_ai_api_key_set_priority(uuid, integer)
  from public, anon, authenticated;
revoke all on function public.tng_ai_api_key_delete(uuid)
  from public, anon, authenticated;

grant execute on function public.tng_ai_api_key_create(
  uuid,
  uuid,
  text,
  text,
  integer,
  public.tng_ai_key_status
) to service_role;
grant execute on function public.tng_ai_api_key_update_state(
  uuid,
  public.tng_ai_key_status,
  text,
  boolean,
  boolean
) to service_role;
grant execute on function public.tng_ai_api_key_set_priority(uuid, integer)
  to service_role;
grant execute on function public.tng_ai_api_key_delete(uuid)
  to service_role;

revoke insert, update, delete on public.ai_api_keys from service_role;

do $$
begin
  if (
    select column_default
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'ai_models'
       and column_name = 'is_enabled'
  ) is distinct from 'false' then
    raise exception 'Assertion failed: ai_models.is_enabled default must be false.';
  end if;

  if has_table_privilege('service_role', 'public.ai_api_keys', 'insert')
     or has_table_privilege('service_role', 'public.ai_api_keys', 'update')
     or has_table_privilege('service_role', 'public.ai_api_keys', 'delete') then
    raise exception 'Assertion failed: service_role must not mutate ai_api_keys directly.';
  end if;

  if has_function_privilege('anon', 'public.tng_ai_api_key_create(uuid, uuid, text, text, integer, public.tng_ai_key_status)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.tng_ai_api_key_create(uuid, uuid, text, text, integer, public.tng_ai_key_status)', 'EXECUTE')
     or has_function_privilege('anon', 'public.tng_ai_api_key_update_state(uuid, public.tng_ai_key_status, text, boolean, boolean)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.tng_ai_api_key_update_state(uuid, public.tng_ai_key_status, text, boolean, boolean)', 'EXECUTE')
     or has_function_privilege('anon', 'public.tng_ai_api_key_set_priority(uuid, integer)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.tng_ai_api_key_set_priority(uuid, integer)', 'EXECUTE')
     or has_function_privilege('anon', 'public.tng_ai_api_key_delete(uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.tng_ai_api_key_delete(uuid)', 'EXECUTE') then
    raise exception 'Assertion failed: AI key metadata RPCs must not be executable by browser roles.';
  end if;

  if not has_function_privilege('service_role', 'public.tng_ai_api_key_create(uuid, uuid, text, text, integer, public.tng_ai_key_status)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.tng_ai_api_key_update_state(uuid, public.tng_ai_key_status, text, boolean, boolean)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.tng_ai_api_key_set_priority(uuid, integer)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.tng_ai_api_key_delete(uuid)', 'EXECUTE') then
    raise exception 'Assertion failed: service_role must execute AI key metadata RPCs.';
  end if;
end $$;
