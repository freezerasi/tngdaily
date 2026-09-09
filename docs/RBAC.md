# TNG Daily â€” RBAC Architecture

> **Status: UNVERIFIED â€” NOT EXECUTED.**
> This document describes the design and intent of migrations 0008â€“0013. None
> of these migrations have been run against any database. Every statement below
> is a stated intent, not an observed outcome.

---

## Overview

TNG Daily uses a normalised role-based access control (RBAC) model backed by
Supabase Postgres, replacing the legacy four-value enum ladder
(`reader < contributor < editor < admin`).

The legacy ladder could not express TNG Daily's actual authorization topology:
`commercial_manager`, `media_manager`, and `analyst` are peers with disjoint
capabilities, not rungs. "May manage campaigns but may never publish editorial"
is unrepresentable as a rank comparison.

Permissions are now the source of truth. Role names exist for operational
grouping and dashboard grouping only.

## Migration Sequence

| Migration | Purpose |
| --- | --- |
| `0008_rbac_foundation.sql` | Tables: `roles`, `permissions`, `role_permissions`, `user_roles`, `audit_logs`, `invitations`, `feature_flags` |
| `0009_authorization_helpers.sql` | All helper functions, escalation guard, break-glass, audit writer, policies for RBAC tables |
| `0010_seed_rbac.sql` | 8 system roles, 47 permissions, reconciling matrix, verification assertions |
| `0011_rbac_policy_rewrite.sql` | Replaces all legacy predicates with permission checks; adds public-gate columns and status-transition trigger |
| `0012_legacy_role_migration.sql` | Maps `profiles.role` â†’ `user_roles`; drops column, legacy functions, and enum |
| `0013_rbac_forward_repair.sql` | Stale policy cleanup, grant reconciliation, service-role confinement, structural assertions |

## Data Model

```text
roles (8 system roles)
  â””â”€â”€ role_permissions (composite PK: role_id, permission_id)
        â””â”€â”€ permissions (47 permissions)

profiles
  â””â”€â”€ user_roles (composite PK: user_id, role_id)
        â””â”€â”€ roles

audit_logs (append-only, immutable)
invitations (token hash, never plaintext)
feature_flags
```

### `user_roles` Composite Primary Key

`user_roles` uses a **composite primary key `(user_id, role_id)`**. There is no
surrogate UUID column. A user may hold several roles; their effective permission
set is the union of all permissions granted to those roles.

#### Deterministic Identifier for Audit Events

Because `user_roles` has no single-column surrogate key, audit events that
reference a role assignment use a **deterministic composite string** as
`entity_id`:

```text
user_id::text || ':' || role_id::text
```

Example: `'a1b2c3d4-...:e5f6g7h8-...'`

This is **not** a UUID. It is a deterministic, reproducible string derived from
the composite primary key. The format is used by:

- `tng_emergency_bootstrap_first_owner` (break-glass audit event)
- Any future DAL function that writes audit events for role assignment changes

The format is stable and must not be changed without updating every consumer.

## System Roles

| Role | `authority_rank` | Purpose |
| --- | --- | --- |
| `owner` | 100 | System owner. Holds implicit-all semantics in `tng_has_permission`. No explicit `role_permissions` rows. |
| `managing_editor` | 70 | Editorial publishing authority. No privileged permissions. |
| `editor` | 50 | Reviews and edits all content, approves. Does not publish. |
| `writer` | 30 | Writes and edits own drafts, submits for review. |
| `contributor` | 20 | Submits own drafts only. |
| `commercial_manager` | 50 | Partners, campaigns, advertorial. Cannot publish editorial. |
| `media_manager` | 40 | Media assets and provenance. No article status capability. |
| `analyst` | 10 | Read-only analytics. No mutations. |

### Authority Rank

`authority_rank` is an **assignment-governance mechanism**, not a capability or
privilege ladder.

It is read in exactly one place: the escalation guard trigger
(`tng_guard_role_assignment`), to refuse granting a role at or above the actor's
own rank. It is never consulted by `tng_has_permission` and never a fallback for
a missing permission.

Equal rank means equal assignment tier, not equivalent capabilities. `editor`
and `commercial_manager` both sit at 50 with disjoint permissions.

## Permission Model

### 47 Permissions in 10 Groups

| Group | Permissions | Notes |
| --- | --- | --- |
| `article` | `create_own`, `edit_own`, `submit_review`, `read_all`, `edit_all`, `review`, `approve`, `publish`, `schedule`, `archive`, `restore` | Core editorial workflow |
| `media` | `upload`, `edit_metadata`, `delete_own`, `delete_any` | Asset management |
| `homepage` | `read`, `edit_draft`, `publish`, `schedule` | Homepage curation |
| `commercial` | `partner.read`, `partner.manage`, `commercial.publish` | Partner & campaign management |
| `directory` | `read`, `manage` | Directory listings |
| `community` | `read`, `moderate` | Community contributions |
| `ai` | `use_writing`, `use_seo`, `use_research`, `use_image_prompt`, `view_usage`, `suggest_prompt_edit`, `configure_provider`â˜…, `manage_secrets`â˜…, `manage_prompt_library`â˜… | AI writing assistance |
| `analytics` | `read`, `export` | Analytics access |
| `user` | `invite`â˜…, `manage_roles`â˜…, `suspend`â˜…, `role.manage`â˜…, `permission.manage`â˜… | User & role management |
| `system` | `manage_feature_flags`â˜…, `manage_integrations`â˜…, `manage_demo_content`, `purge_demo_content`â˜…, `view_audit_log`â˜… | System configuration |

â˜… = `is_privileged`. No non-owner role may hold a privileged permission
(enforced by assertion in 0010).

### Owner Short-Circuit

`tng_has_permission` returns `true` for any active owner regardless of
`role_permissions` contents. This is deliberate: an incomplete seed must not be
able to lock the owner out of their own instance. The owner has zero explicit
`role_permissions` rows.

### Account State

Every permission check gates on account state via `tng_is_active_account`:

1. The `auth.users` row exists
2. Not soft-deleted (`deleted_at is null`)
3. Not banned (`banned_until is null or <= now()`)
4. Profile status is `'active'`

A suspended profile authorizes nothing, even with intact role assignments.

An expired assignment (`expires_at <= now()`) authorizes nothing, even before
any cleanup job runs.

## Escalation Guard

Four rules, enforced by trigger (`tng_guard_role_assignment`) on
`user_roles INSERT/UPDATE`:

1. **No self-assignment** â€” except during the one-time bootstrap window.
2. **Owner-only for owner role** â€” only an owner may grant or revoke `owner`.
3. **Permission required** â€” the actor needs `user.manage_roles`.
4. **Authority ceiling** â€” nobody may grant a role at or above their own
   `authority_rank` (owners exempt).

Revocation is guarded by `tng_guard_role_revocation` with the same permission
and owner checks.

## Owner Floor

The system must never be left without an active owner. Enforced by:

- `tng_protect_last_owner` trigger on `user_roles DELETE/UPDATE`
- `tng_protect_owner_account` trigger on `profiles UPDATE OF status`

Both count active owners via `tng_count_active_owners()` and refuse the
operation if it would drop the count to zero.

## Bootstrap Procedures

Two paths exist for assigning the first owner. See
[OWNER_BOOTSTRAP.md](./OWNER_BOOTSTRAP.md) for the complete runbook.

| Path | When | Actor | Method |
| --- | --- | --- | --- |
| Primary | First deployment, authenticated user | The user themselves | Dedicated RPC `public.tng_bootstrap_authenticated_first_owner()` |
| Break-glass (`tng_emergency_bootstrap_first_owner`) | All owners lost | Database owner (human operator) | Direct DB connection only |

## Audit Log

Append-only. No update or delete policy exists or may be added.

- Writes go exclusively through `tng_write_audit_log`, which derives `actor_id`
  from `auth.uid()` (cannot be caller-supplied).
- `tng_scrub_sensitive` recursively redacts credential-shaped keys before insert.
- Immutability is enforced by triggers, not by policy absence alone.

### Audit Events for Role Management (0015)

Direct `INSERT`/`UPDATE`/`DELETE` on `public.user_roles` is explicitly revoked from `PUBLIC`, `anon`, and `authenticated`. Normal role mutation is exclusively handled through narrow `SECURITY DEFINER` RPCs (`tng_assign_role`, `tng_update_role_expiry`, `tng_revoke_role`).

**NO FORCE ROW LEVEL SECURITY**: The `user_roles` table uses `NO FORCE ROW LEVEL SECURITY`. Because direct DML grants are revoked, no application role can bypass and mutate the table via PostgREST. This setup cleanly allows the `SECURITY DEFINER` RPCs (running as the table owner) to execute their audited mutations natively without needing a forgeable bypass marker or generic write policies.

The following audit events are written by these RPCs:

- **`tng_assign_role`**:
  - `action`: `'auth.role_assigned'`
  - `entity_type`: `'user_role'`
  - `metadata`: `{"role_key": "<role>", "has_expiry": true|false}`
- **`tng_update_role_expiry`**:
  - `action`: `'auth.role_expiry_updated'`
  - `entity_type`: `'user_role'`
  - `metadata`: `{"role_key": "<role>", "change": "set_expiry" | "extend_expiry" | "shorten_expiry"}`
- **`tng_revoke_role`**:
  - `action`: `'auth.role_revoked'`
  - `entity_type`: `'user_role'`
  - `metadata`: `{"role_key": "<role>"}`

*(All events use `actor_id = auth.uid()`, `entity_id = <target_user_id>:<role_id>`, and `before_data/after_data = null`)*

### Audit Event for Primary Authenticated Bootstrap (0014)

Written via `tng_write_audit_log` with no redundant identity dump:

| Field | Value |
| --- | --- |
| `actor_id` | `auth.uid()` (derived naturally) |
| `action` | `'auth.owner_bootstrapped'` |
| `entity_type` | `'user_role'` |
| `entity_id` | `auth.uid()::text \|\| ':' \|\| owner_role_id::text` |
| `before_data` | `null` |
| `after_data` | `null` |
| `metadata` | `{"bootstrap_mode": "primary_authenticated"}` |

### Audit Event for Break-Glass Bootstrap

| Field | Value |
| --- | --- |
| `actor_id` | `NULL` â€” no actor override, no fabrication |
| `action` | `'auth.owner_bootstrapped'` |
| `entity_type` | `'user_role'` |
| `entity_id` | `target_user_id::text \|\| ':' \|\| owner_role_id::text` |
| `metadata` | `{"bootstrap_mode": "break_glass", "target_user_id": "<uuid>", "role_key": "owner"}` |

### Audit Event for Legacy Role Migration (0012)

Written exclusively via `tng_write_audit_log` with no actor override:

| Field | Value |
| --- | --- |
| `actor_id` | `NULL` (derived naturally from unauthenticated migration context) |
| `action` | `'rbac.legacy_roles_migrated'` |
| `entity_type` | `'migration'` |
| `entity_id` | `'0012_legacy_role_migration'` |
| `metadata` | `{"migration": "0012_legacy_role_migration", "mode": "system_migration"}` |

No user IDs, emails, original legacy role values, full mapping rows, credentials,
tokens, or raw SQL are placed in the audit metadata.

No email, token, IP, cookie, headers, raw SQL, API key, or secret is stored in
any audit event.

## Related Documentation

- [OWNER_BOOTSTRAP.md](./OWNER_BOOTSTRAP.md) — Step-by-step bootstrap runbook
- [RLS_POLICY_MIGRATION_REVIEW.md](./RLS_POLICY_MIGRATION_REVIEW.md) — Policy-by-policy intent review
- [RLS_TESTING.md](./RLS_TESTING.md) — Verification procedure
- [SERVICE_ROLE_CONFINEMENT.md](./SERVICE_ROLE_CONFINEMENT.md) — Service-role API surface
- [RBAC_FORWARD_REPAIR.md](./RBAC_FORWARD_REPAIR.md) — What 0013 does and why
