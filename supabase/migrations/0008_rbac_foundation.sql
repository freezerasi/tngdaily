-- ---------------------------------------------------------------------------
-- UNVERIFIED — NOT EXECUTED
-- Requires local Docker + Supabase CLI testing before any non-local application.
--
-- TNG Daily — 0008 RBAC foundation
--
-- Replaces the four-value `tng_user_role` ladder with normalised RBAC.
--
-- Why the ladder had to go: `reader < contributor < editor < admin` with a
-- numeric rank cannot express TNG Daily's actual roles. `commercial_manager`,
-- `media_manager`, and `analyst` are peers with disjoint capabilities, not rungs
-- on a ladder. "May manage campaigns but may never publish editorial" is
-- unrepresentable as a rank comparison. Permissions are now the source of truth;
-- role names exist for operational grouping and dashboard grouping only.
--
-- This migration only CREATES. It does not touch existing policies or drop the
-- legacy column: 0010 rewrites policies, 0011 migrates data and drops the
-- column after verification gates pass. That ordering is what makes the
-- sequence rollback-able.
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type tng_profile_status as enum ('active', 'suspended', 'deactivated');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- profiles: account state, separate from authorization
--
-- A suspended account must not authorize even when its role assignments are
-- intact, so account state lives here and every permission helper checks it.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists status tng_profile_status not null default 'active',
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_reason text;

create index if not exists profiles_status_idx
  on public.profiles (status)
  where status <> 'active';

-- ---------------------------------------------------------------------------
-- roles
-- ---------------------------------------------------------------------------

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  /*
   * System roles are seeded by migration and may not be renamed or deleted by
   * the application. `owner` additionally carries implicit-all semantics, which
   * is enforced in the permission helper rather than by seeding every row, so an
   * incomplete role_permissions table cannot lock the owner out.
   */
  is_system_role boolean not null default false,
  /*
   * authority_rank is an assignment-governance mechanism, not a capability or
   * privilege ladder.
   *
   * Read in exactly one place: the role-assignment trigger, to refuse granting a
   * role at or above the actor's own rank. Never consulted by
   * `tng_has_permission` and never a fallback for a missing permission. Equal
   * rank means equal assignment tier, not equivalent capabilities, which is why
   * `editor` and `commercial_manager` both sit at 50 with disjoint permissions.
   */
  authority_rank integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roles_key_format check (key ~ '^[a-z][a-z0-9_]{2,40}$'),
  constraint roles_authority_range check (authority_rank between 0 and 100)
);

create trigger roles_set_updated_at
  before update on public.roles
  for each row execute function public.tng_set_updated_at();

-- ---------------------------------------------------------------------------
-- permissions
-- ---------------------------------------------------------------------------

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  group_name text not null,
  description text,
  /*
   * Marks permissions that touch secrets, authorization, or system config.
   * Used by the DAL and the seed audit to assert that no non-owner role holds
   * one, and by the dashboard to group them behind an explicit warning.
   */
  is_privileged boolean not null default false,
  created_at timestamptz not null default now(),
  constraint permissions_key_format check (key ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$')
);

create index if not exists permissions_group_idx on public.permissions (group_name);

-- ---------------------------------------------------------------------------
-- role_permissions
-- ---------------------------------------------------------------------------

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create index if not exists role_permissions_permission_idx
  on public.role_permissions (permission_id);

-- ---------------------------------------------------------------------------
-- user_roles
--
-- A user may hold several roles; their effective permission set is the union.
-- `expires_at` supports temporary elevation (a freelance editor for one month)
-- and is enforced in the helper, not merely displayed.
-- ---------------------------------------------------------------------------

create table if not exists public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  assigned_by uuid references public.profiles (id) on delete set null,
  assigned_at timestamptz not null default now(),
  expires_at timestamptz,
  primary key (user_id, role_id),
  constraint user_roles_expiry_future check (
    expires_at is null or expires_at > assigned_at
  )
);

create index if not exists user_roles_user_idx on public.user_roles (user_id);
create index if not exists user_roles_role_idx on public.user_roles (role_id);
create index if not exists user_roles_active_idx
  on public.user_roles (user_id)
  where expires_at is null;

-- ---------------------------------------------------------------------------
-- audit_logs
--
-- Append-only for every application role. There is no update policy and no
-- delete policy anywhere in this migration set, and none may be added: an audit
-- trail an operator can edit is not an audit trail.
--
-- Payload rule, enforced by convention in the DAL and by the check below:
-- never write API keys, tokens, passwords, vault references, or raw prompt text.
-- ---------------------------------------------------------------------------

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  /*
   * Nullable: a system job or a bootstrap runs without an actor. When null,
   * `metadata.source` records what performed the action.
   */
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb,
  /** Correlates every row written while handling one request. */
  request_id text,
  created_at timestamptz not null default now(),
  constraint audit_logs_action_format check (action ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$')
  /*
   * Secret rejection is enforced by `tng_write_audit_log` in 0009, not by a
   * check constraint here.
   *
   * Why: a CHECK constraint can only call an IMMUTABLE function, and recursive
   * JSONB key inspection over arrays and nested objects cannot be expressed as
   * one. The earlier attempt used the `?|` operator, which inspects only
   * top-level keys and is case-sensitive, so `{"config":{"api_key":"..."}}` and
   * `{"API_KEY":"..."}` both passed it. That is a false sense of safety, so it
   * is removed in favour of a single controlled write path that scrubs
   * recursively and case-insensitively before insert.
   */
);

create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
create index if not exists audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id, created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs (action, created_at desc);

-- ---------------------------------------------------------------------------
-- invitations
--
-- Team members are invited, never self-registered into a role. The token is
-- stored as a hash: a leaked table dump must not yield usable invite links.
-- ---------------------------------------------------------------------------

do $$ begin
  create type tng_invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');
exception when duplicate_object then null; end $$;

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role_id uuid not null references public.roles (id) on delete restrict,
  invited_by uuid references public.profiles (id) on delete set null,
  /** SHA-256 of the invite token. The plaintext is emailed and never stored. */
  token_hash text not null unique,
  status tng_invitation_status not null default 'pending',
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitations_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint invitations_token_hash_len check (char_length(token_hash) = 64),
  constraint invitations_accepted_consistency check (
    (status = 'accepted') = (accepted_at is not null)
  )
);

create trigger invitations_set_updated_at
  before update on public.invitations
  for each row execute function public.tng_set_updated_at();

create index if not exists invitations_email_idx on public.invitations (lower(email));
create index if not exists invitations_pending_idx
  on public.invitations (expires_at)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- feature_flags
-- ---------------------------------------------------------------------------

create table if not exists public.feature_flags (
  key text primary key,
  description text,
  is_enabled boolean not null default false,
  /** Optional rollout percentage, 0-100. Null means all-or-nothing. */
  rollout_percentage integer,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feature_flags_key_format check (key ~ '^[a-z][a-z0-9_]{2,60}$'),
  constraint feature_flags_rollout_range check (
    rollout_percentage is null or rollout_percentage between 0 and 100
  )
);

create trigger feature_flags_set_updated_at
  before update on public.feature_flags
  for each row execute function public.tng_set_updated_at();

-- ---------------------------------------------------------------------------
-- Enable RLS immediately.
--
-- Enabling RLS with no policy denies all access to the API roles, which is the
-- correct default while 0009 installs the helpers these policies depend on.
-- ---------------------------------------------------------------------------

alter table public.roles            enable row level security;
alter table public.permissions      enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles       enable row level security;
alter table public.audit_logs       enable row level security;
alter table public.invitations      enable row level security;
alter table public.feature_flags    enable row level security;

-- Force RLS on the authorization tables so a misconfigured owner-privileged
-- connection cannot silently bypass them. service_role still bypasses, which is
-- why service-role usage is confined to narrow server-only adapters.
alter table public.user_roles       force row level security;
alter table public.role_permissions force row level security;
alter table public.audit_logs       force row level security;
alter table public.invitations      force row level security;

-- The invite token hash is never selectable through the API roles.
revoke select (token_hash) on public.invitations from anon, authenticated;
revoke all on public.audit_logs from anon;
revoke all on public.role_permissions from anon;
revoke all on public.user_roles from anon;
revoke all on public.invitations from anon;

comment on column public.roles.authority_rank is
  'authority_rank is an assignment-governance mechanism, not a capability or privilege ladder. Read only by the role-assignment trigger to prevent escalation; never read for feature authorization.';
