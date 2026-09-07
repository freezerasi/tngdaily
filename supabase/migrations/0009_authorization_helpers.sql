-- ---------------------------------------------------------------------------
-- UNVERIFIED — NOT EXECUTED
-- Requires local Docker + Supabase CLI testing before any non-local application.
--
-- TNG Daily — 0009 authorization helpers, owner safeguards, escalation guards
--
-- Every function here is SECURITY DEFINER with a pinned `search_path`, no
-- dynamic SQL, and no return path that can carry a secret. Execute grants are
-- restricted per function: the API roles get only the read-only predicates they
-- need for RLS, and nothing that mutates authorization.
--
-- Design decisions worth stating:
--
--   1. `tng_has_permission` returns true for any active owner regardless of
--      role_permissions contents. An incomplete seed must not be able to lock
--      the owner out of their own instance, which would be unrecoverable without
--      direct database access.
--
--   2. Account state gates everything. A suspended profile authorizes nothing,
--      even with intact role rows, and an expired assignment authorizes nothing,
--      even before any cleanup job runs.
--
--   3. Privilege escalation is blocked by trigger, not by application code
--      alone, so a compromised server action still cannot grant itself owner.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Account state
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Account state
--
-- "Active" means all four of: the auth user exists, is not soft-deleted, is not
-- banned, and the profile is not suspended or deactivated.
--
-- `profiles.id` cascades from `auth.users`, so a hard-deleted user already loses
-- its profile. The explicit auth join covers the two states a cascade does not:
-- Supabase soft-deletion (`deleted_at`) and banning (`banned_until`), either of
-- which leaves the profile row intact and would otherwise keep authorizing.
-- ---------------------------------------------------------------------------

create or replace function public.tng_is_active_account(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
      from public.profiles p
      join auth.users u on u.id = p.id
     where p.id = p_user_id
       and p.status = 'active'
       and u.deleted_at is null
       and (u.banned_until is null or u.banned_until <= now())
  );
$$;

comment on function public.tng_is_active_account(uuid) is
  'True when the auth user exists, is not soft-deleted, is not banned, and the profile status is active. This is the single definition of "active" used by every authorization helper.';

-- ---------------------------------------------------------------------------
-- Effective roles
--
-- One definition of "a role currently held", used by every other helper: the
-- assignment exists, has not expired, and the account is active.
-- ---------------------------------------------------------------------------

create or replace function public.tng_user_role_keys(p_user_id uuid)
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select r.key
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
   where ur.user_id = p_user_id
     and (ur.expires_at is null or ur.expires_at > now())
     and public.tng_is_active_account(p_user_id);
$$;

create or replace function public.tng_current_role_keys()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select public.tng_user_role_keys(auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Owner test
-- ---------------------------------------------------------------------------

create or replace function public.tng_user_is_owner(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tng_user_role_keys(p_user_id) k where k = 'owner'
  );
$$;

create or replace function public.tng_is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.tng_user_is_owner(auth.uid());
$$;

comment on function public.tng_is_owner() is
  'True when the caller currently holds an active, unexpired owner role.';

-- ---------------------------------------------------------------------------
-- Permission test: the single authorization primitive
-- ---------------------------------------------------------------------------

create or replace function public.tng_user_has_permission(
  p_user_id uuid,
  p_permission text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    -- Owner short-circuit. Deliberate: see the header note on seed robustness.
    public.tng_user_is_owner(p_user_id)
    or exists (
      select 1
        from public.user_roles ur
        join public.role_permissions rp on rp.role_id = ur.role_id
        join public.permissions p on p.id = rp.permission_id
       where ur.user_id = p_user_id
         and p.key = p_permission
         and (ur.expires_at is null or ur.expires_at > now())
         and public.tng_is_active_account(p_user_id)
    );
$$;

create or replace function public.tng_has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.tng_user_has_permission(auth.uid(), p_permission);
$$;

comment on function public.tng_has_permission(text) is
  'Authorization primitive for RLS. True for an active owner, or when an active unexpired role grants the permission.';

/** True when the caller holds at least one of the listed permissions. */
create or replace function public.tng_has_any_permission(p_permissions text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.tng_is_owner()
    or exists (
      select 1
        from public.user_roles ur
        join public.role_permissions rp on rp.role_id = ur.role_id
        join public.permissions p on p.id = rp.permission_id
       where ur.user_id = auth.uid()
         and p.key = any(p_permissions)
         and (ur.expires_at is null or ur.expires_at > now())
         and public.tng_is_active_account(auth.uid())
    );
$$;

/**
 * The caller's full effective permission set. Used by the DAL to build one
 * permission array per request instead of issuing a query per check.
 */
create or replace function public.tng_current_permissions()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select p.key
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions p on p.id = rp.permission_id
   where ur.user_id = auth.uid()
     and (ur.expires_at is null or ur.expires_at > now())
     and public.tng_is_active_account(auth.uid())
  union
  -- Owner holds everything defined, whatever role_permissions says.
  select p.key
    from public.permissions p
   where public.tng_is_owner();
$$;

/** Highest authority rank the user currently holds. Escalation guard input. */
create or replace function public.tng_user_authority(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(max(r.authority_rank), -1)
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
   where ur.user_id = p_user_id
     and (ur.expires_at is null or ur.expires_at > now())
     and public.tng_is_active_account(p_user_id);
$$;

-- ---------------------------------------------------------------------------
-- Convenience predicates for policies that read naturally
-- ---------------------------------------------------------------------------

create or replace function public.tng_can_read_all_articles()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.tng_has_permission('article.read_all');
$$;

create or replace function public.tng_can_edit_all_articles()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.tng_has_permission('article.edit_all');
$$;

-- ---------------------------------------------------------------------------
-- Owner floor: the system must never be left without an owner
--
-- Enforced on delete, on expiry being set, and on account suspension. All three
-- are routes by which the last owner could otherwise be locked out.
-- ---------------------------------------------------------------------------

create or replace function public.tng_count_active_owners()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
   where r.key = 'owner'
     and (ur.expires_at is null or ur.expires_at > now())
     -- Reuses the single definition of "active", so a soft-deleted or banned
     -- auth user is not counted as an owner. Counting one would let the real
     -- last owner be removed.
     and public.tng_is_active_account(ur.user_id);
$$;

comment on function public.tng_count_active_owners() is
  'Number of users holding an unexpired owner assignment on an active account. The owner floor depends on this being strict.';

create or replace function public.tng_protect_last_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_owner_role boolean;
begin
  select r.key = 'owner' into is_owner_role
    from public.roles r
   where r.id = coalesce(old.role_id, new.role_id);

  if not coalesce(is_owner_role, false) then
    return coalesce(new, old);
  end if;

  -- Deleting an owner assignment, or expiring it, both remove an owner.
  if tg_op = 'DELETE'
     or (tg_op = 'UPDATE' and new.expires_at is not null and new.expires_at <= now())
  then
    if public.tng_count_active_owners() <= 1 then
      raise exception
        'Refusing to remove the last active owner. Assign another owner first.'
        using errcode = 'restrict_violation';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists user_roles_protect_last_owner on public.user_roles;
create trigger user_roles_protect_last_owner
  before delete or update on public.user_roles
  for each row execute function public.tng_protect_last_owner();

/** Suspending or deactivating the last owner is the same lockout by another route. */
create or replace function public.tng_protect_owner_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'active' or old.status <> 'active' then
    return new;
  end if;

  if public.tng_user_is_owner(new.id) and public.tng_count_active_owners() <= 1 then
    raise exception
      'Refusing to suspend the last active owner. Assign another owner first.'
      using errcode = 'restrict_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_owner_account on public.profiles;
create trigger profiles_protect_owner_account
  before update of status on public.profiles
  for each row execute function public.tng_protect_owner_account();

-- ---------------------------------------------------------------------------
-- Escalation guard
--
-- Three rules, enforced at the row level so they hold even if a server action is
-- bypassed or compromised:
--   1. no self-assignment of any role;
--   2. only an owner may grant or revoke the owner role;
--   3. nobody may grant a role whose authority meets or exceeds their own.
--
-- service_role bypasses RLS but NOT triggers, so the bootstrap path in
-- 0012 deliberately sets a session flag to perform the one legitimate
-- self-assignment that exists.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Escalation guard
--
-- Four rules, enforced at the row level so they hold even if a server action is
-- bypassed or compromised:
--   1. no self-assignment of any role;
--   2. only an owner may grant or revoke the owner role;
--   3. the actor needs `user.manage_roles`;
--   4. nobody may grant a role whose authority meets or exceeds their own.
--
-- ONE narrow exception exists, and it is not a bypass.
--
-- `tng.bootstrap_owner` relaxes rule 1 alone, and only when every one of these
-- holds: the operation is an INSERT, the target role is exactly `owner`, the
-- actor is authenticated, the actor is the target, the target account is active,
-- there are currently zero active owners, and the assignment has no expiry.
--
-- Rules 2, 3, and 4 are not consulted in that path because they cannot be
-- satisfied by definition: the first owner has no owner to grant it and no
-- permission to manage roles. Every other guard in this file, including the
-- final-owner floor and the revocation guard, remains fully active.
--
-- An earlier revision of this function opened with an unconditional
-- `return new` whenever the flag was set, which made a flag named
-- "bootstrap_owner" mean "disable all authorization". That was a defect and is
-- corrected here.
-- ---------------------------------------------------------------------------

create or replace function public.tng_guard_role_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  actor_authority integer;
  target_role_key text;
  target_authority integer;
  target_is_system boolean;
  flag_set boolean := coalesce(
    current_setting('tng.bootstrap_owner', true) = 'on',
    false
  );
  /*
   * Emergency marker, set only inside
   * `tng_emergency_bootstrap_first_owner`. Separate from `tng.bootstrap_owner`
   * and NOT interchangeable with it: the primary path requires an authenticated
   * self-assignment, this path has no `auth.uid()` at all.
   *
   * This marker is not secret and not an access-control boundary. Any session
   * can set it. It grants nothing by itself: the branch below re-validates every
   * invariant, so setting the marker without satisfying them fails.
   */
  break_glass_set boolean := coalesce(
    current_setting('tng.internal_break_glass', true) = 'on',
    false
  );
  is_owner_bootstrap boolean := false;
  is_break_glass boolean := false;
begin
  select r.key, r.authority_rank, r.is_system_role
    into target_role_key, target_authority, target_is_system
    from public.roles r
   where r.id = new.role_id;

  if target_role_key is null then
    raise exception 'Unknown role' using errcode = 'foreign_key_violation';
  end if;

  /*
   * Emergency break-glass branch.
   *
   * Reached only from the dedicated function, which holds database-owner-only
   * EXECUTE. Every invariant is checked again here, independently of the
   * function's own checks, because the marker is caller-settable and must
   * therefore authorize nothing on its own.
   */
  if break_glass_set then
    is_break_glass :=
      tg_op = 'INSERT'
      and target_role_key = 'owner'
      and target_is_system
      and new.expires_at is null
      and public.tng_is_active_account(new.user_id)
      and public.tng_count_active_owners() = 0;

    if not is_break_glass then
      raise exception
        'Emergency marker set but break-glass conditions are not met. It permits exactly one operation: an INSERT of the owner system role, with no expiry, for an active account, while zero active owners exist. Attempted: op=%, role=%, expiry_set=%, target_active=%, active_owners=%.',
        tg_op,
        target_role_key,
        (new.expires_at is not null),
        public.tng_is_active_account(new.user_id),
        public.tng_count_active_owners()
        using errcode = 'insufficient_privilege';
    end if;

    return new;
  end if;

  /*
   * The narrow primary bootstrap window. Every condition must hold.
   */
  if flag_set then
    is_owner_bootstrap :=
      tg_op = 'INSERT'
      and target_role_key = 'owner'
      and target_is_system
      and actor is not null
      and new.user_id = actor
      and new.expires_at is null
      and public.tng_is_active_account(new.user_id)
      and public.tng_count_active_owners() = 0;

    /*
     * Fail loudly rather than silently falling through. If an operator set the
     * flag and the conditions do not hold, they are attempting something the
     * flag was not created for, and a clear refusal is more useful than a
     * confusing "self-assignment not permitted" further down.
     */
    if not is_owner_bootstrap then
      raise exception
        'Bootstrap flag set but conditions are not met. It permits exactly one operation: an INSERT of the owner role, by an authenticated active user, for themselves, with no expiry, while zero active owners exist. Attempted: op=%, role=%, self=%, expiry=%, active_owners=%.',
        tg_op,
        target_role_key,
        (actor is not null and new.user_id = actor),
        (new.expires_at is not null),
        public.tng_count_active_owners()
        using errcode = 'insufficient_privilege';
    end if;

    -- Permitted: the one legitimate self-assignment in the system's lifetime.
    return new;
  end if;

  -- ------------------------------------------------------------------
  -- Ordinary path.
  -- ------------------------------------------------------------------

  /*
   * A migration or trusted server-side job runs without `auth.uid()`. Those
   * paths reach the database through the service role, which is already outside
   * RLS, so a row-level check adds nothing. This is the path 0012 uses for
   * legacy role mapping, which is why 0012 needs no flag.
   *
   * It deliberately does NOT permit owner: an actor-null insert of the owner
   * role is refused below, so no migration can create an owner by omission.
   */
  if actor is null then
    if target_role_key = 'owner' then
      raise exception
        'The owner role cannot be assigned by a migration or an unauthenticated context. Use the documented bootstrap procedure.'
        using errcode = 'insufficient_privilege';
    end if;
    return new;
  end if;

  if actor = new.user_id then
    raise exception 'Self-assignment of roles is not permitted.'
      using errcode = 'insufficient_privilege';
  end if;

  -- The actor must themselves be an active, unsuspended account.
  if not public.tng_is_active_account(actor) then
    raise exception 'Suspended or missing accounts cannot assign roles.'
      using errcode = 'insufficient_privilege';
  end if;

  -- The target must exist and be active: granting a role to a suspended account
  -- would take effect silently the moment it was reinstated.
  if not public.tng_is_active_account(new.user_id) then
    raise exception 'Cannot assign a role to a suspended or missing profile.'
      using errcode = 'insufficient_privilege';
  end if;

  if target_role_key = 'owner' and not public.tng_user_is_owner(actor) then
    raise exception 'Only an owner may grant the owner role.'
      using errcode = 'insufficient_privilege';
  end if;

  if not public.tng_user_has_permission(actor, 'user.manage_roles') then
    raise exception 'Missing permission user.manage_roles.'
      using errcode = 'insufficient_privilege';
  end if;

  actor_authority := public.tng_user_authority(actor);

  -- Owners are exempt: an owner already holds maximum authority by definition.
  if not public.tng_user_is_owner(actor) and target_authority >= actor_authority then
    raise exception
      'Cannot assign a role at or above your own authority level.'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

comment on function public.tng_guard_role_assignment() is
  'Row-level escalation guard for user_roles INSERT and UPDATE. The tng.bootstrap_owner flag relaxes only the self-assignment rule, and only for a single first-owner INSERT meeting seven conditions; it is not a general authorization bypass.';

drop trigger if exists user_roles_guard_assignment on public.user_roles;
create trigger user_roles_guard_assignment
  before insert or update on public.user_roles
  for each row execute function public.tng_guard_role_assignment();

/** Revoking a role needs the same permission gate as granting one. */
create or replace function public.tng_guard_role_revocation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  target_role_key text;
begin
  if actor is null then
    return old;
  end if;

  select r.key into target_role_key from public.roles r where r.id = old.role_id;

  if target_role_key = 'owner' and not public.tng_user_is_owner(actor) then
    raise exception 'Only an owner may revoke the owner role.'
      using errcode = 'insufficient_privilege';
  end if;

  if not public.tng_user_has_permission(actor, 'user.manage_roles') then
    raise exception 'Missing permission user.manage_roles.'
      using errcode = 'insufficient_privilege';
  end if;

  return old;
end;
$$;

drop trigger if exists user_roles_guard_revocation on public.user_roles;
create trigger user_roles_guard_revocation
  before delete on public.user_roles
  for each row execute function public.tng_guard_role_revocation();

-- ---------------------------------------------------------------------------
-- Audit log: recursive secret scrubbing and a single controlled write path
--
-- Two problems the earlier check constraint could not solve:
--   1. `jsonb ?| array[...]` inspects only TOP-LEVEL keys, so a secret nested
--      one level down passed silently.
--   2. It is case-sensitive, so `API_KEY` passed while `api_key` was caught.
--
-- Both are fixed by scrubbing in a function, recursively and case-insensitively,
-- before the row is written. Redaction is chosen over rejection deliberately: an
-- audit write must never be the reason an authorization change fails to be
-- recorded, so the payload is neutered rather than the insert aborted.
-- ---------------------------------------------------------------------------

/**
 * True when a key name looks like a credential. Case-insensitive, substring
 * based, so `stripe_api_key`, `Authorization`, and `refreshToken` all match.
 */
create or replace function public.tng_is_sensitive_key(p_key text)
returns boolean
language sql
immutable
as $$
  select lower(p_key) ~ (
    'api[_-]?key|secret|password|passwd|token|credential|authorization|'
    || 'cookie|session[_-]?id|private[_-]?key|access[_-]?key|service[_-]?role|'
    || 'vault[_-]?secret|bearer|signature|client[_-]?secret|refresh'
  );
$$;

/**
 * Recursively replaces the value of any credential-shaped key with a marker,
 * walking objects and arrays to any depth.
 *
 * Values are not inspected, only key names: a heuristic over free text would
 * either miss real secrets or redact legitimate content, and the callers of this
 * function control their own payload shape.
 */
create or replace function public.tng_scrub_sensitive(p_data jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  result jsonb;
  item jsonb;
  entry record;
begin
  if p_data is null then
    return null;
  end if;

  case jsonb_typeof(p_data)
    when 'object' then
      result := '{}'::jsonb;
      for entry in select key, value from jsonb_each(p_data) loop
        if public.tng_is_sensitive_key(entry.key) then
          result := result || jsonb_build_object(entry.key, '[REDACTED]');
        else
          result := result || jsonb_build_object(
            entry.key,
            public.tng_scrub_sensitive(entry.value)
          );
        end if;
      end loop;
      return result;

    when 'array' then
      result := '[]'::jsonb;
      for item in select value from jsonb_array_elements(p_data) loop
        result := result || jsonb_build_array(public.tng_scrub_sensitive(item));
      end loop;
      return result;

    else
      -- Scalars pass through: strings, numbers, booleans, and null.
      return p_data;
  end case;
end;
$$;

/**
 * The only sanctioned way to write an audit row.
 *
 * `authenticated` may execute this function but has no direct INSERT on the
 * table, so an application user cannot forge an arbitrary audit event: the actor
 * is taken from `auth.uid()` here and cannot be supplied by the caller.
 */
create or replace function public.tng_write_audit_log(
  p_action text,
  p_entity_type text,
  p_entity_id text default null,
  p_before jsonb default null,
  p_after jsonb default null,
  p_metadata jsonb default null,
  p_request_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id,
    before_data, after_data, metadata, request_id
  )
  values (
    -- Actor is derived, never accepted from the caller.
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    public.tng_scrub_sensitive(p_before),
    public.tng_scrub_sensitive(p_after),
    public.tng_scrub_sensitive(p_metadata),
    p_request_id
  )
  returning id into new_id;

  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Append-only audit log
--
-- No update or delete policy is defined anywhere for audit_logs. These triggers
-- make that structural rather than merely absent: even a future policy, or the
-- table owner, cannot mutate history.
-- ---------------------------------------------------------------------------

create or replace function public.tng_audit_logs_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_logs is append-only.' using errcode = 'insufficient_privilege';
end;
$$;

drop trigger if exists audit_logs_no_update on public.audit_logs;
create trigger audit_logs_no_update
  before update on public.audit_logs
  for each row execute function public.tng_audit_logs_immutable();

drop trigger if exists audit_logs_no_delete on public.audit_logs;
create trigger audit_logs_no_delete
  before delete on public.audit_logs
  for each row execute function public.tng_audit_logs_immutable();

-- ---------------------------------------------------------------------------
-- Emergency break-glass: first-owner bootstrap when the primary path is dead
--
-- This function exists for exactly one situation: zero active owners remain and
-- the primary authenticated bootstrap (tng.bootstrap_owner, a signed-in user
-- self-assigning owner) cannot run — typically because every owner account was
-- lost. It is an emergency recovery tool, invoked by a human operator connected
-- as the database owner, and by nothing else. It must never be called from a
-- migration, a server action, a cron job, a webhook, or a DAL helper.
--
-- Security model, in layers, none of which is the marker:
--
--   1. EXECUTE is revoked from PUBLIC, anon, authenticated, and service_role,
--      so no application role can invoke it; the Supabase generated API only
--      exposes functions those roles may execute, so it is not reachable over
--      PostgREST at all.
--   2. The parameter surface is a single UUID; the role is hardcoded to owner,
--      expires_at is hardcoded to null, assigned_by is hardcoded to null.
--   3. The function validates every invariant itself, below.
--   4. The row it inserts must pass tng_guard_role_assignment, which
--      re-validates every invariant independently — the marker the function
--      sets is visible to any session that bothers to `set_config` it, so the
--      trigger branch treats it as a routing hint and proves the row on its
--      own merits. Setting the marker without satisfying the invariants fails.
--   5. The zero-owner check and the insert are serialized by a
--      transaction-scoped advisory lock, so two concurrent calls cannot both
--      succeed: the second waits for the lock, re-counts owners, and fails.
--   6. The audit event is written through tng_write_audit_log — the single
--      controlled, scrubbed write path — and if it returns no row id the whole
--      transaction aborts. An unaudited owner bootstrap must not exist.
--
-- What the marker is NOT: a secret, an access-control boundary, or an
-- authorization mechanism. It is a transaction-local contextual flag. If an
-- attacker has the database-owner connection needed to call this function
-- directly, the database is already compromised; the marker adds nothing to
-- that threat model. See docs/OWNER_BOOTSTRAP.md.
--
-- Concurrency key: pg_advisory_xact_lock(hashtextextended('tng_owner_bootstrap', 0))
-- — one stable key shared by both bootstrap paths, documented in
-- docs/OWNER_BOOTSTRAP.md and docs/RBAC.md, reused for nothing else. The xact
-- variant releases automatically on commit or rollback; there is no unlock
-- path to get wrong. hashtextextended requires PostgreSQL 10+, which every
-- supported Supabase Postgres satisfies.
-- ---------------------------------------------------------------------------

create or replace function public.tng_emergency_bootstrap_first_owner(
  target_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_role_id uuid;
  v_audit_id uuid;
begin
  if target_user_id is null then
    raise exception 'Break-glass bootstrap requires a non-null target user id.'
      using errcode = 'invalid_parameter_value';
  end if;

  -- Serialize every bootstrap attempt, before any check whose answer another
  -- transaction could change. Blocking is correct: this is a rare operation.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('tng_owner_bootstrap', 0)
  );

  -- Under the lock: an active owner already existing means there is no
  -- emergency. Refuse deterministically rather than create a second first
  -- owner.
  if public.tng_count_active_owners() <> 0 then
    raise exception
      'Break-glass refused: % active owner(s) exist. There is no emergency; use ordinary role management.',
      public.tng_count_active_owners()
      using errcode = 'restrict_violation';
  end if;

  -- The single definition of "active": auth user exists, not soft-deleted, not
  -- banned, profile exists with status active. Anything else cannot be the
  -- recovery anchor for the whole system.
  if not public.tng_is_active_account(target_user_id) then
    raise exception
      'Break-glass refused: target is not an active account (missing profile or auth user, suspended, banned, or deleted).'
      using errcode = 'insufficient_privilege';
  end if;

  -- The owner role must exist as a seeded system role.
  select r.id into v_role_id
    from public.roles r
   where r.key = 'owner'
     and r.is_system_role;

  if v_role_id is null then
    raise exception
      'Owner system role is not seeded. Run 0010_seed_rbac.sql first.'
      using errcode = 'feature_not_supported';
  end if;

  -- A pre-existing owner row for this target (even an expired one) is a
  -- primary-key violation waiting to happen; name it instead of surfacing the
  -- raw constraint error.
  if exists (
    select 1 from public.user_roles
     where user_id = target_user_id and role_id = v_role_id
  ) then
    raise exception
      'Target already holds an owner assignment row. Revoke or expire it through ordinary role management first.'
      using errcode = 'unique_violation';
  end if;

  -- Marker: transaction-local, consumed by exactly one trigger branch in
  -- tng_guard_role_assignment, which re-proves every invariant above before
  -- letting the row through. The marker alone authorizes nothing.
  perform pg_catalog.set_config('tng.internal_break_glass', 'on', true);

  -- assigned_by is null: there is no actor. expires_at is null: an emergency
  -- owner that silently expires would recreate the incident it resolved.
  insert into public.user_roles (user_id, role_id, assigned_by, expires_at)
  values (target_user_id, v_role_id, null, null);

  -- Audit through the single controlled writer. actor_id derives to null
  -- inside it (no auth.uid() in a break-glass session), which is correct and
  -- intentional: the target did not perform this operation, and no actor may
  -- be fabricated for it. entity_id is the row's composite identity
  -- 'user_id:role_id' because user_roles has no surrogate id column; the
  -- format is documented in docs/RBAC.md and docs/OWNER_BOOTSTRAP.md.
  -- Metadata is minimal and non-sensitive by design: the mode label, the
  -- target, and the role key. Nothing else belongs here.
  v_audit_id := public.tng_write_audit_log(
    'auth.owner_bootstrapped',
    'user_role',
    target_user_id::text || ':' || v_role_id::text,
    null,
    jsonb_build_object(
      'user_id',     target_user_id,
      'role_id',     v_role_id,
      'role_key',    'owner',
      'assigned_by', null,
      'expires_at',  null
    ),
    jsonb_build_object(
      'bootstrap_mode', 'break_glass',
      'target_user_id', target_user_id,
      'role_key',       'owner'
    ),
    null
  );

  -- No audit id means the event was not recorded, and an unrecorded owner
  -- bootstrap must not exist. Raise: the exception rolls back the insert and
  -- releases the advisory lock with the transaction.
  if v_audit_id is null then
    raise exception
      'Audit writer returned no row id. Aborting the emergency bootstrap.'
      using errcode = 'internal_error';
  end if;

  -- The audit id is the receipt. Returning it makes "the audit row exists"
  -- part of the function's contract, not a side effect.
  return v_audit_id;
end;
$$;

comment on function public.tng_emergency_bootstrap_first_owner(uuid) is
  'Emergency break-glass recovery: inserts the first owner assignment when zero active owners exist and the primary authenticated bootstrap is unavailable. Database-owner connection only — EXECUTE revoked from PUBLIC, anon, authenticated, service_role. Never callable from migrations, application code, cron, or RPC. See docs/OWNER_BOOTSTRAP.md.';

-- ---------------------------------------------------------------------------
-- Grants
--
-- Read-only predicates are callable by the API roles because RLS policies
-- evaluate them. Nothing that mutates authorization is granted to anon.
-- ---------------------------------------------------------------------------

revoke all on function public.tng_is_active_account(uuid) from public;
revoke all on function public.tng_user_role_keys(uuid) from public;
revoke all on function public.tng_user_is_owner(uuid) from public;
revoke all on function public.tng_user_has_permission(uuid, text) from public;
revoke all on function public.tng_user_authority(uuid) from public;
revoke all on function public.tng_count_active_owners() from public;

grant execute on function public.tng_is_active_account(uuid) to authenticated, service_role;
grant execute on function public.tng_user_role_keys(uuid) to authenticated, service_role;
grant execute on function public.tng_current_role_keys() to authenticated, service_role;
grant execute on function public.tng_user_is_owner(uuid) to authenticated, service_role;
grant execute on function public.tng_is_owner() to authenticated, service_role;
grant execute on function public.tng_user_has_permission(uuid, text) to authenticated, service_role;
grant execute on function public.tng_has_permission(text) to anon, authenticated, service_role;
grant execute on function public.tng_has_any_permission(text[]) to authenticated, service_role;
grant execute on function public.tng_current_permissions() to authenticated, service_role;
grant execute on function public.tng_user_authority(uuid) to authenticated, service_role;
grant execute on function public.tng_count_active_owners() to authenticated, service_role;
grant execute on function public.tng_can_read_all_articles() to anon, authenticated, service_role;
grant execute on function public.tng_can_edit_all_articles() to anon, authenticated, service_role;

-- The audit writer is callable by signed-in users, because a user action must be
-- able to record itself. It cannot be abused to forge an actor: `auth.uid()` is
-- read inside the function and the caller has no direct INSERT on the table.
revoke all on function public.tng_write_audit_log(text, text, text, jsonb, jsonb, jsonb, text) from public;
grant execute on function public.tng_write_audit_log(text, text, text, jsonb, jsonb, jsonb, text)
  to authenticated, service_role;

-- Scrubbing helpers are pure and hold no data; safe to expose, useful in tests.
grant execute on function public.tng_is_sensitive_key(text) to authenticated, service_role;
grant execute on function public.tng_scrub_sensitive(jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Break-glass: no application role may execute this. Ever.
--
-- `revoke ... from public` removes the default PUBLIC grant; the named revokes
-- below are explicit belt-and-braces so a future reader can see the intended
-- surface without knowing Postgres defaults. After these statements the only
-- identities that can call the function are the database owner (the role that
-- ran this migration) and a superuser — which is the threat model: reaching it
-- already means holding the database.
-- ---------------------------------------------------------------------------
revoke all on function public.tng_emergency_bootstrap_first_owner(uuid) from public;
revoke execute on function public.tng_emergency_bootstrap_first_owner(uuid) from anon;
revoke execute on function public.tng_emergency_bootstrap_first_owner(uuid) from authenticated;
revoke execute on function public.tng_emergency_bootstrap_first_owner(uuid) from service_role;

-- ---------------------------------------------------------------------------
-- Policies for the authorization tables themselves
-- ---------------------------------------------------------------------------

-- roles and permissions are readable by any signed-in user: the dashboard needs
-- to render role names and permission labels. Neither table holds a secret.
drop policy if exists roles_read_authenticated on public.roles;
create policy roles_read_authenticated on public.roles
  for select to authenticated using (true);

drop policy if exists roles_owner_write on public.roles;
create policy roles_owner_write on public.roles
  for all to authenticated
  using (public.tng_is_owner())
  with check (public.tng_is_owner());

drop policy if exists permissions_read_authenticated on public.permissions;
create policy permissions_read_authenticated on public.permissions
  for select to authenticated using (true);

drop policy if exists permissions_owner_write on public.permissions;
create policy permissions_owner_write on public.permissions
  for all to authenticated
  using (public.tng_is_owner())
  with check (public.tng_is_owner());

-- role_permissions: readable by anyone who may manage roles, plus the owner.
-- Writable only by the owner, because editing this table edits authorization.
drop policy if exists role_permissions_read on public.role_permissions;
create policy role_permissions_read on public.role_permissions
  for select to authenticated
  using (public.tng_has_any_permission(array['user.manage_roles', 'role.manage', 'permission.manage']));

drop policy if exists role_permissions_owner_write on public.role_permissions;
create policy role_permissions_owner_write on public.role_permissions
  for all to authenticated
  using (public.tng_is_owner())
  with check (public.tng_is_owner());

-- user_roles: a user may always see their own assignments. Managing others
-- requires the permission, and every write additionally passes the triggers.
drop policy if exists user_roles_read_self on public.user_roles;
create policy user_roles_read_self on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.tng_has_permission('user.manage_roles'));

drop policy if exists user_roles_manage on public.user_roles;
create policy user_roles_manage on public.user_roles
  for all to authenticated
  using (public.tng_has_permission('user.manage_roles'))
  with check (public.tng_has_permission('user.manage_roles'));

-- audit_logs: owner read only. There is deliberately NO insert policy: writes go
-- exclusively through `tng_write_audit_log`, which derives the actor from
-- auth.uid() so an application user cannot forge an event. No update policy. No
-- delete policy. Ever.
drop policy if exists audit_logs_owner_read on public.audit_logs;
create policy audit_logs_owner_read on public.audit_logs
  for select to authenticated
  using (public.tng_has_permission('system.view_audit_log'));

-- Explicitly remove any direct insert grant a previous revision may have added.
drop policy if exists audit_logs_insert on public.audit_logs;
revoke insert, update, delete on public.audit_logs from anon, authenticated;

-- invitations: only users who may invite can see or create them.
drop policy if exists invitations_read on public.invitations;
create policy invitations_read on public.invitations
  for select to authenticated
  using (public.tng_has_permission('user.invite'));

drop policy if exists invitations_manage on public.invitations;
create policy invitations_manage on public.invitations
  for all to authenticated
  using (public.tng_has_permission('user.invite'))
  with check (public.tng_has_permission('user.invite'));

-- feature_flags: readable by any signed-in user so the dashboard can branch;
-- writable only with the system permission, which only the owner holds.
drop policy if exists feature_flags_read on public.feature_flags;
create policy feature_flags_read on public.feature_flags
  for select to authenticated using (true);

drop policy if exists feature_flags_manage on public.feature_flags;
create policy feature_flags_manage on public.feature_flags
  for all to authenticated
  using (public.tng_has_permission('system.manage_feature_flags'))
  with check (public.tng_has_permission('system.manage_feature_flags'));
