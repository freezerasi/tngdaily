-- ---------------------------------------------------------------------------
-- TNG Daily - Supabase Vault create_secret signature compatibility
-- ---------------------------------------------------------------------------
--
-- supabase_vault 0.3.x exposes vault.create_secret(text, text, text, uuid).
-- Older/local environments may expose the 3-argument variant. Keep the public
-- wrapper stable for the app and choose the available Vault signature at call
-- time.
-- ---------------------------------------------------------------------------

create or replace function public.tng_vault_create_secret(
  p_secret text,
  p_name text,
  p_description text default ''
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  new_id uuid;
begin
  if to_regprocedure('vault.create_secret(text,text,text,uuid)') is not null then
    execute 'select vault.create_secret($1, $2, $3, null::uuid)'
      into new_id
      using p_secret, p_name, coalesce(p_description, '');
  elsif to_regprocedure('vault.create_secret(text,text,text)') is not null then
    execute 'select vault.create_secret($1, $2, $3)'
      into new_id
      using p_secret, p_name, coalesce(p_description, '');
  else
    raise exception
      'Supabase Vault is not available. Enable the supabase_vault extension or set SECRET_STORE_DRIVER=development.'
      using errcode = 'feature_not_supported';
  end if;

  return new_id;
end;
$$;

revoke all on function public.tng_vault_create_secret(text, text, text)
  from public, anon, authenticated;
grant execute on function public.tng_vault_create_secret(text, text, text)
  to service_role;

do $$
begin
  if has_function_privilege('anon', 'public.tng_vault_create_secret(text, text, text)', 'EXECUTE') then
    raise exception 'Assertion failed: anon must not execute tng_vault_create_secret.';
  end if;

  if has_function_privilege('authenticated', 'public.tng_vault_create_secret(text, text, text)', 'EXECUTE') then
    raise exception 'Assertion failed: authenticated must not execute tng_vault_create_secret.';
  end if;

  if not has_function_privilege('service_role', 'public.tng_vault_create_secret(text, text, text)', 'EXECUTE') then
    raise exception 'Assertion failed: service_role must execute tng_vault_create_secret.';
  end if;
end $$;
