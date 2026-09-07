# TNG Daily â€” RLS Testing Procedure

> **Status: UNVERIFIED â€” NOT EXECUTED.**
> This procedure has not been run. No test result exists. Every expectation
> below is a stated intent, not an observed outcome.

---

## Purpose

This document describes how to verify that every RLS policy in the RBAC
migration set (0008â€“0013) allows and denies the access it claims to. The
policy-by-policy intent is documented in
[RLS_POLICY_MIGRATION_REVIEW.md](./RLS_POLICY_MIGRATION_REVIEW.md).

## Prerequisites

1. **Local Docker** running Supabase (not remote, not production).
2. **Supabase CLI** installed and `supabase init` completed in this project.
3. All migrations 0001â€“0013 applied via `supabase db reset`.
4. Seed data applied (`supabase/seed.sql`).
5. At least one owner bootstrapped (see [OWNER_BOOTSTRAP.md](./OWNER_BOOTSTRAP.md)).

## Testing Approach

### Role Impersonation

Supabase policies evaluate against three API roles: `anon`, `authenticated`,
and `service_role`. To test policies for specific RBAC roles, you must:

1. Create test users in `auth.users` and `public.profiles`.
2. Assign them roles via `user_roles`.
3. Impersonate each user by setting their JWT claims in the session.

```sql
-- Helper: impersonate a specific user for policy testing.
-- Run this in a psql session connected to the local Supabase database.

-- 1. Switch to the 'authenticated' role (the API role policies target).
set role authenticated;

-- 2. Set the JWT claims to match the target user.
set request.jwt.claims = '{"sub": "<user_uuid>", "role": "authenticated"}';

-- 3. Now run your test queries. Policies will evaluate against this user.
-- ...

-- 4. Reset when done.
reset role;
reset request.jwt.claims;
```

### Test as `anon`

```sql
set role anon;
-- Run queries. Only public-read policies should allow access.
reset role;
```

### Test as `service_role`

```sql
set role service_role;
-- service_role bypasses RLS. All queries should succeed.
-- This is by design, not a bug.
reset role;
```

---

## Test Matrix

### Setup: Create Test Users

Before running the matrix, create one test user per role:

```sql
-- Run as database owner (not impersonated).

-- Insert test users into auth.users (simplified; real signup flow adds more fields).
-- In local Docker, you can insert directly.

-- Then assign each test user their respective role:
insert into public.user_roles (user_id, role_id)
select '<writer_user_uuid>', r.id from public.roles r where r.key = 'writer';

insert into public.user_roles (user_id, role_id)
select '<editor_user_uuid>', r.id from public.roles r where r.key = 'editor';

-- Repeat for: owner, managing_editor, contributor, commercial_manager,
-- media_manager, analyst.
```

### Matrix Structure

Each cell should be tested with a query and the result compared to the
expectation.

| Test | anon | contributor | writer | editor | managing_editor | commercial_manager | media_manager | analyst | owner |
|---|---|---|---|---|---|---|---|---|---|
| **Profiles** | | | | | | | | | |
| SELECT own profile | â€” | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |
| SELECT other profile | âŒ | âŒ | âŒ | âœ… | âœ… | âŒ | âœ… | âœ… | âœ… |
| UPDATE own profile | â€” | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |
| UPDATE other profile (suspend) | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âœ… |
| DELETE profile | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âœ… |
| **Articles** | | | | | | | | | |
| SELECT published/public/prod article | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |
| SELECT mock/staging article | âŒ | âŒ | âŒ | âœ… | âœ… | âŒ | âŒ | âœ… | âœ… |
| SELECT own draft | â€” | âœ… | âœ… | âœ… | âœ… | âœ… | âŒ | âŒ | âœ… |
| SELECT other's draft | âŒ | âŒ | âŒ | âœ… | âœ… | âŒ | âŒ | âœ… | âœ… |
| INSERT own article | âŒ | âœ… | âœ… | âœ… | âœ… | âœ… | âŒ | âŒ | âœ… |
| UPDATE own draft | âŒ | âœ… | âœ… | âœ… | âœ… | âœ… | âŒ | âŒ | âœ… |
| UPDATE other's article | âŒ | âŒ | âŒ | âœ… | âœ… | âŒ | âŒ | âŒ | âœ… |
| DELETE article (hard) | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âœ… |
| **Status Transitions** (trigger) | | | | | | | | | |
| draft â†’ needs_review (own) | â€” | âœ… | âœ… | âœ… | âœ… | âœ… | âŒ | âŒ | âœ… |
| needs_review â†’ draft (reject) | â€” | âŒ | âŒ | âœ… | âœ… | âŒ | âŒ | âŒ | âœ… |
| any â†’ published | â€” | âŒ | âŒ | âŒ | âœ… | âŒ | âŒ | âŒ | âœ… |
| any â†’ scheduled | â€” | âŒ | âŒ | âŒ | âœ… | âŒ | âŒ | âŒ | âœ… |
| any â†’ archived | â€” | âŒ | âŒ | âŒ | âœ… | âŒ | âŒ | âŒ | âœ… |
| publish commercial w/o disclosure | â€” | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ |
| publish mock content | â€” | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ |
| **Article Sources** | | | | | | | | | |
| SELECT (published article) | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |
| SELECT (own draft's sources) | âŒ | âœ… | âœ… | âœ… | âœ… | âœ… | âŒ | âŒ | âœ… |
| INSERT/UPDATE/DELETE own sources | âŒ | âœ… | âœ… | âœ… | âœ… | âœ… | âŒ | âŒ | âœ… |
| **Article Images** | | | | | | | | | |
| SELECT (public article + public media) | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |
| SELECT (public article + mock media) | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ |
| SELECT (internal, all images) | âŒ | âŒ | âŒ | âœ… | âœ… | âŒ | âœ… | âœ… | âœ… |
| INSERT image | âŒ | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… | âŒ | âœ… |
| UPDATE image metadata | âŒ | âŒ | âŒ | âœ… | âœ… | âœ… | âœ… | âŒ | âœ… |
| DELETE own image | âŒ | âŒ | âŒ | âœ… | âœ… | âŒ | âœ… | âŒ | âœ… |
| DELETE any image | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âœ… | âŒ | âœ… |
| **Reactions** | | | | | | | | | |
| INSERT on published article | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |
| INSERT on mock article | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ |
| SELECT (analytics) | âŒ | âŒ | âŒ | âœ… | âœ… | âœ… | âŒ | âœ… | âœ… |
| **Contributions** | | | | | | | | | |
| SELECT | âŒ | âŒ | âŒ | âœ… | âœ… | âŒ | âŒ | âœ… | âœ… |
| UPDATE (moderate) | âŒ | âŒ | âŒ | âœ… | âœ… | âŒ | âŒ | âŒ | âœ… |
| DELETE | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âœ… |
| **Directory Listings** | | | | | | | | | |
| SELECT | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |
| INSERT/UPDATE/DELETE | âŒ | âŒ | âŒ | âŒ | âœ… | âœ… | âŒ | âŒ | âœ… |
| **AI Providers** | | | | | | | | | |
| ALL | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âœ… |
| **AI API Keys** | | | | | | | | | |
| ALL (via PostgREST) | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ |
| **AI Usage Log** | | | | | | | | | |
| SELECT | âŒ | âŒ | âŒ | âœ… | âœ… | âŒ | âŒ | âœ… | âœ… |
| **AI Prompt Templates** | | | | | | | | | |
| SELECT | âŒ | âŒ | âœ… | âœ… | âœ… | âŒ | âœ… | âŒ | âœ… |
| INSERT/UPDATE/DELETE | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âœ… |
| **AI Generation Jobs** | | | | | | | | | |
| SELECT own | âŒ | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |
| SELECT all | âŒ | âŒ | âŒ | âœ… | âœ… | âŒ | âŒ | âœ… | âœ… |
| INSERT own | âŒ | âŒ | âœ… | âœ… | âœ… | âŒ | âœ… | âŒ | âœ… |
| **Rewrite Jobs** | | | | | | | | | |
| SELECT own | âŒ | âŒ | âŒ | âœ… | âœ… | âŒ | âŒ | âŒ | âœ… |
| INSERT own | âŒ | âŒ | âŒ | âœ… | âœ… | âŒ | âŒ | âŒ | âœ… |
| **RBAC Tables** | | | | | | | | | |
| SELECT roles/permissions | âŒ | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |
| SELECT own user_roles | âŒ | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |
| SELECT all user_roles | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âœ… |
| Manage roles/permissions | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âœ… |
| SELECT audit_logs | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âœ… |
| **Feature Flags** | | | | | | | | | |
| SELECT | âŒ | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… | âœ… |
| Manage | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âŒ | âœ… |

### Legend

- âœ… Expected to succeed
- âŒ Expected to be denied
- â€” Not applicable (anon has no identity; contributor has no own-article context for some tests)

---

## Trigger Tests

These are tested separately from RLS because they fire on DML regardless of
the policy path.

### Escalation Guard (`tng_guard_role_assignment`)

| Test | Expected |
|---|---|
| Self-assign any role (no flag) | âŒ Exception |
| Self-assign owner with `tng.bootstrap_owner` flag, zero owners | âœ… |
| Self-assign owner with flag, one owner exists | âŒ Exception |
| Assign role at/above own authority | âŒ Exception |
| Assign owner without being owner | âŒ Exception |
| Assign owner as owner | âœ… |
| Assign role without `user.manage_roles` | âŒ Exception |
| Assign role to suspended account | âŒ Exception |

### Last Owner Protection (`tng_protect_last_owner`)

| Test | Expected |
|---|---|
| Delete last owner's role assignment | âŒ Exception |
| Delete non-last owner's assignment (2+ owners) | âœ… |
| Expire last owner's assignment | âŒ Exception |
| Suspend last owner's account | âŒ Exception |

### Status Transition Guard (`tng_guard_article_status`)

| Test | Expected |
|---|---|
| Writer: draft â†’ needs_review (own) | âœ… |
| Writer: any â†’ published | âŒ Exception |
| Managing editor: any â†’ published | âœ… |
| Publish commercial without disclosure | âŒ Exception |
| Publish mock content | âŒ Exception |
| Publish non-production content | âŒ Exception |

### Audit Immutability

| Test | Expected |
|---|---|
| UPDATE audit_logs | âŒ Exception |
| DELETE audit_logs | âŒ Exception |
| INSERT via `tng_write_audit_log` | âœ… |

### Primary Bootstrap RPC (0014)

| Test | Expected |
|---|---|
| Direct `authenticated` INSERT into `user_roles` by roleless user | âŒ RLS denied (`user_roles_manage`) |
| Direct `authenticated` INSERT into `user_roles` by non-owner | âŒ RLS denied (`user_roles_manage`) |
| Direct client attempt to set `tng.bootstrap_owner = 'on'` and INSERT | âŒ RLS denied (`user_roles_manage`) |
| Primary bootstrap RPC called by first active authenticated user | âœ… Returns `{"ok": true}` |
| Primary bootstrap RPC called with `auth.uid() IS NULL` / `anon` | âŒ Denied (no execute grant / exception) |
| Primary bootstrap RPC called by `service_role` | âŒ Permission denied (execute revoked) |
| Primary bootstrap RPC called when active owner already exists | âŒ Exception (`restrict_violation`) |
| Primary bootstrap RPC cannot bootstrap another user | âœ… Structurally enforced (takes no user argument) |
| Primary bootstrap RPC cannot assign non-owner role | âœ… Structurally enforced (locks role to 'owner') |
| Primary bootstrap RPC produces owner role row with no expiry | âœ… `expires_at IS NULL` |
| Primary bootstrap RPC creates immutable audit event | âœ… `actor_id = auth.uid()`, `before_data = null`, `after_data = null`, `metadata = {"bootstrap_mode": "primary_authenticated"}` |
| Two concurrent primary bootstrap RPC calls | âœ… Exactly 1 succeeds, serialized via advisory lock |
| Emergency break-glass remains the only actor-null owner recovery path | âœ… Dedicated DB-owner function |

### Break-Glass

| Test | Expected |
|---|---|
| Call from `authenticated` role | âŒ Permission denied |
| Call from `service_role` | âŒ Permission denied |
| Call from database owner, zero owners | âœ… |
| Call from database owner, one owner exists | âŒ Exception |
| Call with inactive target | âŒ Exception |

---

## Running the Tests

### Step 1: Start Local Supabase

```bash
supabase start
```

### Step 2: Reset and Apply Migrations

```bash
supabase db reset
```

This applies all migrations (0001â€“0013) and seeds.

### Step 3: Bootstrap a Test Owner

Follow [OWNER_BOOTSTRAP.md](./OWNER_BOOTSTRAP.md) to assign one test user as
owner.

### Step 4: Create Test Users

Create one user per role and assign their roles. Use the database owner
connection to bypass RLS for setup.

### Step 5: Run the Matrix

For each cell in the test matrix:

1. Impersonate the user (set role + JWT claims).
2. Run the test query.
3. Compare the result to the expectation.
4. Record pass/fail.

### Step 6: Report

Document which cells passed and which failed. Any failure is a policy bug that
must be fixed before the migrations are applied to any non-local environment.

---

## Related Documentation

- [RLS_POLICY_MIGRATION_REVIEW.md](./RLS_POLICY_MIGRATION_REVIEW.md) â€” Policy-by-policy intent
- [RBAC.md](./RBAC.md) â€” Full RBAC architecture
- [OWNER_BOOTSTRAP.md](./OWNER_BOOTSTRAP.md) â€” Bootstrap procedures

## 0015 Option B RPC Testing Matrix (37 Cases)

1. Direct INSERT on user_roles by Owner (Must fail: 42501).
2. Direct UPDATE on user_roles by Owner (Must fail: 42501).
3. Direct DELETE on user_roles by Owner (Must fail: 42501).
4. RPC 	ng_assign_role called by Anon (Must fail: execute denied).
5. RPC 	ng_assign_role called by Authenticated user without user.manage_roles (Must fail: missing permission).
6. RPC 	ng_assign_role called by Managing Editor (Rank 70) attempting to assign Editor (Rank 50) (Success).
7. RPC 	ng_assign_role called by Managing Editor attempting to assign Managing Editor (Must fail: target authority >= actor authority).
8. RPC 	ng_assign_role called by Editor (if granted user.manage_roles) attempting to assign Commercial Manager (both rank 50) (Must fail: target authority >= actor authority).
9. RPC 	ng_assign_role attempting to assign owner role (Must fail: owner role blocked via normal RPC).
10. RPC 	ng_assign_role attempting self-assignment (Must fail: self-assignment forbidden).
11. RPC 	ng_assign_role with malformed role key (Must fail: invalid format).
12. RPC 	ng_assign_role targeting inactive account (Must fail: target account not active).
13. RPC 	ng_assign_role creates correct audit event via 	ng_write_audit_log with actor ID matching JWT.
14. RPC 	ng_assign_role fails and rolls back if audit writer fails.
15. RPC 	ng_update_role_expiry called by non-Owner (Must fail: missing permission).
16. RPC 	ng_update_role_expiry extending expiry to future date (Success, audit change = extend_expiry).
17. RPC 	ng_update_role_expiry shortening expiry to earlier future date (Success, audit change = shorten_expiry).
18. RPC 	ng_update_role_expiry setting expiry where previously permanent (Success, audit change = set_expiry).
19. RPC 	ng_update_role_expiry with past date (Must fail: expiry in past).
20. RPC 	ng_update_role_expiry with null date (Must fail: null not allowed).
21. RPC 	ng_update_role_expiry with exact same date (Must fail: no-op).
22. RPC 	ng_update_role_expiry creates correct audit event with correct change type.
23. RPC 	ng_revoke_role called on active target account (Success).
24. RPC 	ng_revoke_role called on inactive/suspended target account (Success).
25. RPC 	ng_revoke_role attempting to revoke owner (Must fail: owner role blocked via normal RPC).
26. RPC 	ng_revoke_role attempting self-revocation (Must fail: self-revocation forbidden).
27. Managing Editor with user.manage_roles can assign a lower-authority role such as Writer or Contributor (Success).
28. Managing Editor cannot assign equal-rank Editor or Commercial Manager (Corrected logic tested in cases 7 & 8).
29. Managing Editor cannot modify/revoke equal-rank role assignment (Must fail).
30. Owner can assign all non-owner system roles (Success).
31. Owner cannot assign owner via normal RPC (Must fail).
32. Owner cannot revoke owner via normal RPC (Must fail).
33. Owner cannot alter owner expiry via normal RPC (Must fail).
34. Direct PostgREST DML remains denied even after NO FORCE ROW LEVEL SECURITY.
35. SECURITY DEFINER RPC mutation succeeds under actual runtime without needing an RLS marker.
36. Mock/public-content/media RLS gates are verified unchanged after 0015.
37. Concurrency: Two overlapping 	ng_update_role_expiry calls on the same target block correctly via FOR UPDATE and do not produce conflicting audit change types.
