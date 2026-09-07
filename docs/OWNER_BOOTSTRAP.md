# TNG Daily — Owner Bootstrap Runbook

> **Status: PARTIALLY VERIFIED — 7 September 2026.**
> The RBAC migrations are applied to the linked Supabase project, the live
> owner assignment and permission check are verified, and the three owner
> protection triggers are enabled. The primary bootstrap RPC itself was not
> executed in this project because an owner already existed; the break-glass
> path remains intentionally unexercised.

---

## Overview

The owner role is never assigned by migration. `0012_legacy_role_migration.sql`
deliberately maps `admin` → `managing_editor`, not `owner`. Ownership is
granted exclusively through one of two manual procedures documented here.

After `0012` completes on a new project, `tng_count_active_owners()` returns 0.
The system is fully functional for data reads but no privileged operation
(role management, AI secrets, feature flags, integrations, audit log) is
available until an owner is bootstrapped.

## Prerequisites

Before either path:

1. Migrations 0008–0012 have been applied and verified (all in-transaction
   assertions passed).
2. The target user has a row in `public.profiles` with `status = 'active'`.
3. The target user has a row in `auth.users` that is not soft-deleted and not
   banned.
4. `tng_count_active_owners()` returns `0`.

---

## Path 1: Primary Bootstrap (Authenticated Application RPC)

This is the standard path for first deployment. The target user authenticates
through the normal Supabase auth flow, then calls the dedicated narrow RPC
`public.tng_bootstrap_authenticated_first_owner()` via a server-only action
(Supabase SSR client with authenticated session cookies) or authenticated PostgREST call.

Direct client INSERT into `public.user_roles` remains strictly forbidden by
table privileges and RLS. Normal role changes use the narrow RPCs.

### How It Works

1. The authenticated user calls `public.tng_bootstrap_authenticated_first_owner()`.
2. The function takes **no arguments**; target identity is derived strictly from `auth.uid()`.
3. The function acquires transaction-scoped advisory lock:
   `pg_advisory_xact_lock(hashtextextended('tng_owner_bootstrap', 0))`
4. Validates all invariant conditions:
   - Caller is authenticated (`auth.uid() is not null`)
   - Zero active owners currently exist (`tng_count_active_owners() = 0`)
   - Target account is active (not soft-deleted, not banned, profile active)
   - Target does not already hold an owner row
   - Owner system role exists
5. Sets `tng.bootstrap_owner = 'on'` (transaction-local marker) strictly inside the function.
6. Inserts exact owner assignment:
   `user_id = auth.uid()`, `role = owner`, `assigned_by = auth.uid()`, `expires_at = null`.
7. Writes audit log via `public.tng_write_audit_log` with minimal non-redundant metadata:
   - `action`: `'auth.owner_bootstrapped'`
   - `entity_type`: `'user_role'`
   - `entity_id`: `auth.uid()::text || ':' || owner_role_id::text`
   - `actor_id`: `auth.uid()`
   - `before_data`: `null`
   - `after_data`: `null`
   - `metadata`: `{"bootstrap_mode": "primary_authenticated"}`
8. If audit write fails or returns null, the entire bootstrap transaction aborts.
9. Returns minimal receipt `{ "ok": true }`.
10. **Permissions & Security Properties**:
    - `authenticated` has EXECUTE only because Supabase RPC needs an authenticated JWT context for `auth.uid()`.
    - `authenticated` does not have direct INSERT/UPDATE/DELETE privileges on `public.user_roles`.
    - Direct table mutation remains RLS- and privilege-protected.
    - The primary RPC remains safe even if called directly through authenticated PostgREST RPC because it accepts no parameters and independently enforces all invariants.
    - The UI will eventually invoke it only through a server-side route/action (do not build that route yet).
    - `service_role` has no EXECUTE on either primary owner bootstrap RPC or emergency break-glass function.
    - The break-glass function remains DB-owner-only and has no normal application route.

- **SQLSTATE Error Codes**:
  - `insufficient_privilege` (`42501`): Unauthenticated session (`auth.uid() IS NULL`) or inactive/banned/suspended account.
  - `restrict_violation` (`23001`): Active owner already exists.
  - `feature_not_supported` (`0A000`): Owner system role is not seeded in `public.roles`.
  - `unique_violation` (`23505`): Target user already holds an owner row.
  - `internal_error` (`XX000`): Audit writer failed or returned no audit ID.

### Step-by-Step

```typescript
// Invoked from a server action / route handler using authenticated user cookies:
// The UI will eventually invoke it through a server-side route; do not build that route yet.
const supabase = await createClient(); // @supabase/ssr
const { data, error } = await supabase.rpc('tng_bootstrap_authenticated_first_owner');
if (error) {
  throw new Error(`Bootstrap failed: ${error.message}`);
}
// data is { "ok": true }
```

Or via direct authenticated SQL session:

```sql
-- Connect as the target user (authenticated session with their JWT).
select public.tng_bootstrap_authenticated_first_owner();
-- Returns: {"ok": true}

-- Verify:
select public.tng_count_active_owners();
-- Must return 1.

select public.tng_is_owner();
-- Must return true.
```

### Concurrency

The bootstrap acquires `pg_advisory_xact_lock(hashtextextended('tng_owner_bootstrap', 0))`
at the beginning of the transaction. Two concurrent bootstrap attempts are serialized:
the second waits for the lock, re-counts owners, and fails because the count
is now 1.

---

## Path 2: Break-Glass (Emergency Recovery)

This path exists for exactly one situation: **zero active owners remain and the
primary authenticated bootstrap cannot run** — typically because every owner
account was lost (deleted, banned, or suspended).

### Who May Run This

Only a **human operator connected as the database owner** (the PostgreSQL role
that ran the migrations). The function's `EXECUTE` privilege is revoked from
`PUBLIC`, `anon`, `authenticated`, and `service_role`. It is not reachable over
PostgREST.

This function must never be called from a migration, a server action, a cron
job, a webhook, or a DAL helper.

### How It Works

`tng_emergency_bootstrap_first_owner(target_user_id uuid)` performs:

1. Acquires `pg_advisory_xact_lock(hashtextextended('tng_owner_bootstrap', 0))`
   to serialize against concurrent attempts.
2. Verifies `tng_count_active_owners() = 0`.
3. Verifies `tng_is_active_account(target_user_id)`.
4. Looks up the `owner` system role.
5. Checks no pre-existing `user_roles` row for this target + owner role.
6. Sets `tng.internal_break_glass = 'on'` (transaction-local marker).
7. Inserts into `user_roles` with `assigned_by = null`, `expires_at = null`.
8. The escalation guard trigger re-validates every invariant independently.
9. Writes an audit event through `tng_write_audit_log`.
10. Aborts the entire transaction if the audit write returns no row ID.
11. Returns the audit log ID as the receipt.

### Step-by-Step

```sql
-- Connect as the DATABASE OWNER (not service_role, not authenticated).
-- This is a psql or equivalent direct connection.

-- 1. Identify the target user.
select id, username, display_name, status
  from public.profiles
 where status = 'active'
 order by created_at
 limit 10;
-- Choose the user who should become owner. Note their UUID.

-- 2. Verify zero owners.
select public.tng_count_active_owners();
-- Must return 0.

-- 3. Verify the target is active.
select public.tng_is_active_account('<target_user_uuid>');
-- Must return true.

-- 4. Run the break-glass function.
select public.tng_emergency_bootstrap_first_owner('<target_user_uuid>');
-- Returns the audit log UUID on success.
-- Raises an exception with a diagnostic message on failure.

-- 5. Verify.
select public.tng_count_active_owners();
-- Must return 1.

select r.key, ur.user_id, ur.assigned_by, ur.expires_at
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
 where r.key = 'owner';
-- Must show one row with the target user, assigned_by = null, expires_at = null.
```

### Audit Event

The break-glass procedure writes exactly one audit event:

| Field | Value |
|---|---|
| `actor_id` | `NULL` |
| `action` | `'auth.owner_bootstrapped'` |
| `entity_type` | `'user_role'` |
| `entity_id` | `target_user_id::text \|\| ':' \|\| owner_role_id::text` |
| `before_data` | `NULL` |
| `after_data` | `{"user_id": "<uuid>", "role_id": "<uuid>", "role_key": "owner", "assigned_by": null, "expires_at": null}` |
| `metadata` | `{"bootstrap_mode": "break_glass", "target_user_id": "<uuid>", "role_key": "owner"}` |

#### `entity_id` Format

`user_roles` has a composite primary key `(user_id, role_id)` with no surrogate
UUID column. The `entity_id` is a **deterministic composite string**:

```sql
target_user_id::text || ':' || owner_role_id::text
```

This produces a value like `'a1b2c3d4-...:e5f6g7h8-...'`. It is not a UUID. It
is not an assignment identifier. It is a stable, reproducible string derived
from the two columns of the composite primary key, used to correlate the audit
event with the specific `user_roles` row.

#### `actor_id` is NULL

`actor_id` is `NULL` for break-glass operations. This is correct and
intentional:

- The target user did not perform this operation.
- No actor may be fabricated or overridden.
- The database owner who ran the function is a PostgreSQL role, not an
  `auth.users` identity.
- `tng_write_audit_log` derives `actor_id` from `auth.uid()`, which is `NULL`
  in a database-owner session. There is no override parameter.

#### Metadata Constraints

The metadata contains exactly three fields:

```json
{
  "bootstrap_mode": "break_glass",
  "target_user_id": "<uuid>",
  "role_key": "owner"
}
```

**Never stored**: email, token, IP address, cookie, headers, raw SQL, API key,
or any secret. This constraint is enforced by:

1. The function's hardcoded `jsonb_build_object` call (no caller-supplied metadata).
2. `tng_scrub_sensitive`, which recursively redacts credential-shaped keys
   before any audit write.

---

## Security Model

### What the `tng.internal_break_glass` Marker Is NOT

The marker is not a secret, not an access-control boundary, and not an
authorization mechanism. It is a transaction-local contextual flag. Any session
can `set_config` it. It grants nothing by itself: the escalation guard trigger
re-validates every invariant independently. Setting the marker without
satisfying the invariants fails.

The security layers, in order, are:

1. `EXECUTE` revoked from `PUBLIC`, `anon`, `authenticated`, `service_role`.
2. Parameter surface is a single UUID; role/expiry/assigned_by are hardcoded.
3. The function validates every invariant.
4. The trigger re-validates every invariant independently.
5. Advisory lock serializes concurrent attempts.
6. Audit write must succeed or the transaction aborts.

### Concurrency Key

Both bootstrap paths share a single advisory lock key:

```sql
pg_advisory_xact_lock(hashtextextended('tng_owner_bootstrap', 0))
```

The `xact` variant releases automatically on commit or rollback. There is no
unlock path to get wrong.

---

## After Bootstrap

Once the first owner is established:

1. Use the owner account to invite or assign roles to other team members
   through the normal DAL.
2. The owner holds implicit-all permissions — no `role_permissions` rows need
   to exist.
3. The escalation guard prevents the last owner from being removed (trigger
   `tng_protect_last_owner`).
4. Subsequent owners are assigned through ordinary role management (owner
   grants owner to another user).

---

## Related Documentation

- [RBAC.md](./RBAC.md) — Full RBAC architecture
- [SERVICE_ROLE_CONFINEMENT.md](./SERVICE_ROLE_CONFINEMENT.md) — Service-role API surface
- [RLS_TESTING.md](./RLS_TESTING.md) — Verification procedure
