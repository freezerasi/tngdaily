# TNG Daily — Service-Role Confinement

> **Status: UNVERIFIED — NOT EXECUTED.**
> No revoke statement in this document has been applied. Every claim about
> access is a stated intent, not an observed outcome.

---

## Why `service_role` Bypasses RLS

Supabase's `service_role` is a PostgreSQL role configured to bypass Row Level
Security. This is by design: server-side operations (Next.js server actions,
Edge Functions, cron jobs) use `service_role` to perform trusted work that
cannot be scoped to a single user's JWT.

**Bypassing RLS is not a bug.** The DAL (Data Access Layer) running as
`service_role` is the authorization boundary for server-side code. RLS protects
the PostgREST API surface; the DAL protects the server-side surface.

## The Problem

Because `service_role` bypasses RLS, any table-level privilege granted to it
is exercisable without policy evaluation. If a server action is compromised
(e.g., via an injection or a dependency vulnerability), the attacker can issue
arbitrary DML on any table `service_role` has privileges on.

## The Mitigation: API Surface Confinement

The mitigation is not to remove RLS bypass (that would break the server), but
to **narrow the table-level grants** so `service_role` can only reach tables
it actually needs, through paths it is designed to use.

### Principle

- `service_role` reads tables it needs to read (SELECT granted).
- `service_role` writes tables **only through SECURITY DEFINER functions**
  that enforce business rules.
- Direct INSERT/UPDATE/DELETE on sensitive tables is revoked from
  `service_role` where all writes go through a controlled function.

### Tables With Revoked Direct Mutation

| Table | What's Revoked | Why | Write Path |
| --- | --- | --- | --- |
| `audit_logs` | INSERT, UPDATE, DELETE | All writes go through `tng_write_audit_log` (SECURITY DEFINER) which derives `actor_id` from `auth.uid()` and scrubs sensitive keys | `tng_write_audit_log()` |
| `ai_api_keys` | INSERT, UPDATE, DELETE | API keys are managed through the DAL; no PostgREST path should directly mutate this table | DAL functions (server-side only) |
| `user_roles` | INSERT, UPDATE, DELETE | Normal role mutations route exclusively through narrow `SECURITY DEFINER` RPCs. `service_role` has **NO EXECUTE** on these RPCs. The DAL must act as an `authenticated` user client to manage roles. The `user_roles` table uses `NO FORCE ROW LEVEL SECURITY`, but because direct DML grants are revoked, no application role (including `service_role`) can bypass the RPC. | `tng_assign_role()`, `tng_update_role_expiry()`, `tng_revoke_role()` |

### Tables With `FORCE ROW LEVEL SECURITY`

`FORCE ROW LEVEL SECURITY` means even the table owner is subject to policies.
`service_role` still bypasses (it's a separate mechanism), but any other
non-superuser connection that somehow gets table-owner privileges is still
gated. *(Note: `user_roles` deliberately uses `NO FORCE ROW LEVEL SECURITY` because its table privileges are entirely revoked, see above).*

| Table | Set In |
| --- | --- |
| `role_permissions` | 0008 |
| `audit_logs` | 0008 |
| `invitations` | 0008 |
| `ai_api_keys` | 0005 |

### Tables With All Privileges Revoked From `anon`

These tables are not accessible to unauthenticated users at all:

| Table | Set In |
| --- | --- |
| `audit_logs` | 0008 |
| `role_permissions` | 0008 |
| `user_roles` | 0008 |
| `invitations` | 0008 |
| `ai_api_keys` | 0013 |

### Column-Level Revokes

| Table | Column | Revoked From | Set In |
| --- | --- | --- | --- |
| `invitations` | `token_hash` | `anon`, `authenticated` | 0008 |

---

## What `service_role` CAN Still Do

`service_role` retains full access to domain tables (`articles`, `profiles`,
`article_images`, etc.) because server-side code legitimately needs to:

- Create articles on behalf of users (server actions)
- Process AI generation jobs (background workers)
- Manage media uploads and transformations
- Run scheduled publishing jobs
- Handle invitation acceptance

These operations go through the DAL, which applies its own authorization
checks before executing. The DAL is the trust boundary.

## What This Does NOT Protect Against

- A database-owner-level compromise (the attacker already has everything).
- A Supabase superuser connection (bypasses all security).
- A `service_role` connection that uses `SET ROLE` to impersonate another role
  (this is a PostgreSQL-level attack, not an application-level one).

These are infrastructure threats, not application threats, and are addressed
by infrastructure controls (credential rotation, network isolation, audit
logging).

---

## Migration References

| Migration | Confinement Actions |
| --- | --- |
| `0005_rls.sql` | `FORCE RLS` on `ai_api_keys` |
| `0008_rbac_foundation.sql` | `FORCE RLS` on `user_roles` (removed in 0015), `role_permissions`, `audit_logs`, `invitations`; revoke all from `anon` on authorization tables |
| `0009_authorization_helpers.sql` | Revoke INSERT/UPDATE/DELETE on `audit_logs` from `anon`, `authenticated`; break-glass execute revoked from all application roles |
| `0013_rbac_forward_repair.sql` | Revoke INSERT/UPDATE/DELETE on `audit_logs` from `service_role`; revoke direct mutation on `ai_api_keys` from all roles |
| `0014_primary_owner_bootstrap_rpc.sql` | Revoke execute on `tng_bootstrap_authenticated_first_owner` from `service_role`, `anon`, and `PUBLIC`; grant execute strictly to `authenticated` |
| `0015_rpc_role_management.sql` | Revoke direct mutation on `user_roles` from `authenticated`, `anon`, `PUBLIC`. Implement `NO FORCE ROW LEVEL SECURITY` posture. |
| `20260907061200_harden_user_roles_table_grants.sql` | Remove remaining browser-role `TRUNCATE`, `TRIGGER`, and `REFERENCES` privileges; retain only authenticated `SELECT`. |

---

## Related Documentation

- [RBAC.md](./RBAC.md) — Full RBAC architecture
- [OWNER_BOOTSTRAP.md](./OWNER_BOOTSTRAP.md) — Two bootstrap procedures runbook
- [RBAC_FORWARD_REPAIR.md](./RBAC_FORWARD_REPAIR.md) — What 0013 does and why
- [RLS_TESTING.md](./RLS_TESTING.md) — Verification procedure
