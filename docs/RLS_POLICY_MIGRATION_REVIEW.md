# TNG Daily — RLS Policy Migration Review

> **Status: UNVERIFIED — NOT EXECUTED.**
> No policy in this document has been observed to allow or deny access. Every
> "allows" / "denies" statement is a stated intent derived from reading the SQL
> predicate, not from testing against a running database.
>
> Verification procedure: [RLS_TESTING.md](./RLS_TESTING.md)

---

## Purpose

This document reviews every RLS policy created by `0011_rbac_policy_rewrite.sql`
and `0009_authorization_helpers.sql`, comparing the legacy predicate
(from `0005_rls.sql`) to the new predicate, and stating the intent of each
policy.

## Legend

| Symbol | Meaning |
| --- | --- |
| 🔄 | Renamed from legacy policy |
| ➕ | New policy (no legacy equivalent) |
| ✂️ | Legacy policy split into multiple policies |
| 🗑️ | Legacy policy removed (no replacement) |

---

## Profiles

### `profiles_select_self` 🔄

| | Legacy (0005) | New (0011) |
| --- | --- | --- |
| **Operation** | SELECT | SELECT |
| **Target role** | `authenticated` | `authenticated` |
| **Predicate** | `id = auth.uid() OR tng_is_editor()` | `id = auth.uid() OR tng_has_permission('article.read_all')` |

**Intent**: A user can always read their own profile. Staff who can see all
articles can also see all profiles (needed for author attribution in the editor
view). Previously keyed to the `editor` ladder position; now keyed to the
specific permission that actually requires profile visibility.

### `profiles_update_self` 🔄

| | Legacy (0005) | New (0011) |
| --- | --- | --- |
| **Operation** | UPDATE | UPDATE |
| **Target role** | `authenticated` | `authenticated` |
| **USING** | `id = auth.uid()` | `id = auth.uid()` |
| **WITH CHECK** | `id = auth.uid() AND role = tng_current_role()` | `id = auth.uid()` |

**Intent**: Self-update only. The legacy `role = tng_current_role()` check
prevented self-promotion by pinning the role column to the caller's current
value. In the RBAC model, the `role` column no longer exists (dropped by 0012),
so self-promotion is structurally impossible: roles live in `user_roles` behind
escalation triggers.

### `profiles_suspend` ➕

| | New (0011) |
| --- | --- |
| **Operation** | UPDATE |
| **Target role** | `authenticated` |
| **Predicate** | `tng_has_permission('user.suspend')` |

**Intent**: Replaces the `profiles_admin_all` blanket policy. Only users with
the specific `user.suspend` permission may modify other profiles. Owner-only in
the default matrix (privileged permission).

### `profiles_owner_delete` ➕

| | New (0011) |
| --- | --- |
| **Operation** | DELETE |
| **Target role** | `authenticated` |
| **Predicate** | `tng_is_owner()` |

**Intent**: Hard deleting a profile is irreversible, so it is owner-only.
Previously under the blanket `profiles_admin_all`.

### `profiles_admin_all` 🗑️

Dropped. Replaced by `profiles_suspend` (update) and `profiles_owner_delete`
(delete), splitting the reversible/irreversible line.

---

## Articles

### `articles_public_read` 🔄

| | Legacy (0005) | New (0011) |
| --- | --- | --- |
| **Operation** | SELECT | SELECT |
| **Target role** | `anon, authenticated` | `anon, authenticated` |
| **Predicate** | `status = 'published' AND published_at IS NOT NULL AND published_at <= now()` | `tng_is_publicly_publishable(id)` |

**Intent**: Delegates to the single `tng_is_publicly_publishable` helper, which
adds five conditions: `status = 'published'`, `published_at <= now()`,
`visibility = 'public'`, `content_environment = 'production'`, `is_mock = false`,
`deleted_at IS NULL`. The helper is the single source of truth for public
eligibility.

### `articles_internal_read` 🔄

| | Legacy (0005) | New (0011) |
| --- | --- | --- |
| **Legacy name** | `articles_editor_read` | `articles_internal_read` |
| **Predicate** | `tng_is_editor() OR author_id = auth.uid()` | `deleted_at IS NULL AND (tng_has_permission('article.read_all') OR author_id = auth.uid())` |

**Intent**: Staff with `article.read_all` see all non-deleted articles. Authors
always see their own. Adds `deleted_at IS NULL` gate — soft-deleted articles are
invisible to everyone except the owner (who can hard-delete).

### `articles_create` 🔄

| | Legacy (0005) | New (0011) |
| --- | --- | --- |
| **Legacy name** | `articles_editor_insert` | `articles_create` |
| **Predicate** | `tng_is_editor()` | `(tng_has_permission('article.create_own') AND author_id = auth.uid()) OR tng_has_permission('article.edit_all')` |

**Intent**: Creating as an author requires `article.create_own` AND the row
must be theirs. Full editors with `article.edit_all` can create on behalf of
others. Previously any editor-or-above could insert.

### `articles_update` 🔄

| | Legacy (0005) | New (0011) |
| --- | --- | --- |
| **Legacy name** | `articles_editor_update` | `articles_update` |
| **USING** | `tng_is_editor()` | `deleted_at IS NULL AND (tng_has_permission('article.edit_all') OR (tng_has_permission('article.edit_own') AND author_id = auth.uid() AND status IN ('draft', 'needs_review')))` |
| **WITH CHECK** | `tng_is_editor()` | `tng_has_permission('article.edit_all') OR (tng_has_permission('article.edit_own') AND author_id = auth.uid())` |

**Intent**: Own-work editing stops once the piece leaves the author's hands
(past `needs_review`). Full editors can edit anything. Status transitions are
further guarded by `tng_guard_article_status` trigger.

### `articles_owner_delete` 🔄

| | Legacy (0005) | New (0011) |
| --- | --- | --- |
| **Legacy name** | `articles_admin_delete` | `articles_owner_delete` |
| **Predicate** | `tng_is_admin()` | `tng_is_owner()` |

**Intent**: Hard delete is irreversible → owner-only. Everything else soft-deletes
through the update policy.

---

## Article Sources

### `article_sources_public_read` 🔄

| | Legacy | New |
| --- | --- | --- |
| **Predicate** | Published article join | `tng_is_publicly_publishable(article_id)` |

**Intent**: Same semantics, delegates to the unified public gate.

### `article_sources_internal_read` 🔄

| | Legacy | New |
| --- | --- | --- |
| **Legacy name** | `article_sources_editor_all` (SELECT part) | `article_sources_internal_read` |
| **Predicate** | `tng_is_editor()` | `tng_has_permission('article.read_all') OR author owns the parent article` |

**Intent**: Split read from write. Read now includes own-article access for
authors who don't have `article.read_all`.

### `article_sources_write` ✂️

| | New |
| --- | --- |
| **Operation** | ALL (insert/update/delete) |
| **Predicate** | `tng_has_permission('article.edit_all') OR (tng_has_permission('article.edit_own') AND author owns article)` |

**Intent**: Write follows article edit permissions. Authors can manage sources
on their own articles.

---

## Article Images

### `article_images_public_read` 🔄

| | Legacy | New |
| --- | --- | --- |
| **Predicate** | Published article join | `tng_is_public_media(id) AND tng_is_publicly_publishable(article_id)` |

**Intent**: Two independent gates. The asset must itself be public-eligible
(production environment, declared provenance, not `mock_visual`, not
soft-deleted) AND the parent article must be publicly publishable. Article
eligibility never implies media eligibility.

### `article_images_internal_read` 🔄

| | Legacy | New |
| --- | --- | --- |
| **Legacy name** | `article_images_editor_all` (SELECT part) | `article_images_internal_read` |
| **Predicate** | `tng_is_editor()` | `tng_has_any_permission(ARRAY['media.edit_metadata', 'article.read_all'])` |

**Intent**: Media managers and editorial staff both need to see all images.

### `article_images_write` ✂️ (INSERT)

| Predicate | `tng_has_permission('media.upload')` |
| --- | --- |

### `article_images_update` ✂️ (UPDATE)

| Predicate | `tng_has_permission('media.edit_metadata')` |
| --- | --- |

### `article_images_delete` ✂️ (DELETE)

| Predicate | `tng_has_permission('media.delete_any') OR (tng_has_permission('media.delete_own') AND created_by = auth.uid())` |
| --- | --- |

**Intent**: The single `editor_all` blanket was split into four operation-specific
policies with distinct permissions. Media manager role can curate assets without
any article capability.

---

## Reactions

### `reactions_public_insert` 🔄

| | Legacy | New |
| --- | --- | --- |
| **Predicate** | Published article check | `tng_is_publicly_publishable(article_id)` |

**Intent**: Uses the unified public gate so mock/unlisted/non-production articles
cannot accumulate reactions.

### `reactions_analytics_read` 🔄

| | Legacy | New |
| --- | --- | --- |
| **Legacy name** | `reactions_editor_read` | `reactions_analytics_read` |
| **Predicate** | `tng_is_editor()` | `tng_has_permission('analytics.read')` |

**Intent**: Reading raw reaction rows is analytics, not editorial. Moved to the
appropriate permission.

---

## Contributions

### `contributions_read` 🔄

| Legacy name | `contributions_editor_read` |
| --- | --- |
| **Predicate** | `tng_has_permission('community.read')` |

### `contributions_moderate` 🔄

| Legacy name | `contributions_editor_update` |
| --- | --- |
| **Predicate** | `tng_has_permission('community.moderate')` |

### `contributions_owner_delete` 🔄

| Legacy name | `contributions_admin_delete` |
| --- | --- |
| **Predicate** | `tng_is_owner()` |

**Intent**: Hard delete → owner-only, consistent with the reversible/irreversible
split applied everywhere.

---

## Directory Listings

### `directory_public_read` (unchanged)

| **Predicate** | `true` (public read for all) |
| --- | --- |

### `directory_manage` 🔄

| Legacy name | `directory_editor_all` |
| --- | --- |
| **Predicate** | `tng_has_permission('directory.manage')` |

---

## AI Providers

### `ai_providers_owner_all` 🔄

| Legacy name | `ai_providers_admin_all` |
| --- | --- |
| **Predicate** | `tng_is_owner()` |

**Intent**: AI provider configuration is a privileged operation. Moved from
admin-all to owner-only.

---

## AI Usage Log

### `ai_usage_log_read` 🔄

| Legacy name | `ai_usage_log_admin_read` |
| --- | --- |
| **Predicate** | `tng_has_permission('ai.view_usage')` |

**Intent**: Viewing AI usage is granted to editors and above (and analyst),
not just admins.

---

## AI Prompt Templates

### `ai_prompt_templates_read` 🔄

| Legacy name | `ai_prompt_templates_editor_read` |
| --- | --- |
| **Predicate** | `tng_has_any_permission(ARRAY['ai.use_writing', 'ai.use_seo', 'ai.use_research', 'ai.use_image_prompt', 'ai.manage_prompt_library'])` |

**Intent**: Anyone who may use any AI feature needs to read prompt templates.

### `ai_prompt_templates_owner_write` 🔄

| Legacy name | `ai_prompt_templates_admin_write` |
| --- | --- |
| **Predicate** | `tng_has_permission('ai.manage_prompt_library')` |

**Intent**: Activating and modifying prompt templates is owner-only (privileged).

---

## AI Generation Jobs

### `ai_generation_jobs_read` 🔄

| Legacy name | `ai_generation_jobs_editor_read` |
| --- | --- |
| **Predicate** | `created_by = auth.uid() OR tng_has_permission('ai.view_usage')` |

**Intent**: Users see their own jobs; staff with `ai.view_usage` see all.

### `ai_generation_jobs_write` 🔄

| Legacy name | `ai_generation_jobs_editor_write` |
| --- | --- |
| **Predicate** | `created_by = auth.uid() AND tng_has_any_permission(ARRAY['ai.use_writing', 'ai.use_seo', 'ai.use_research', 'ai.use_image_prompt'])` |

### `ai_generation_jobs_update` ➕

| **Predicate** | `created_by = auth.uid()` |
| --- | --- |

---

## Rewrite Jobs

### `rewrite_jobs_read` ✂️

| Legacy name | `rewrite_jobs_editor_all` (SELECT part) |
| --- | --- |
| **Predicate** | `created_by = auth.uid() OR tng_has_permission('ai.view_usage')` |

### `rewrite_jobs_write` ✂️ (INSERT)

| **Predicate** | `created_by = auth.uid() AND tng_has_permission('ai.use_research')` |
| --- | --- |

### `rewrite_jobs_update` ✂️ (UPDATE)

| **Predicate** | `created_by = auth.uid()` |
| --- | --- |

---

## Storage: Contributions Bucket

### `contributions_bucket_public_read` (unchanged)

| **Predicate** | `bucket_id = 'contributions'` |
| --- | --- |

### `contributions_bucket_write` 🔄

| Legacy name | `contributions_bucket_editor_write` |
| --- | --- |
| **Predicate** | `bucket_id = 'contributions' AND tng_has_any_permission(ARRAY['community.moderate', 'media.upload'])` |

---

## RBAC Tables (from 0009)

These policies govern the authorization tables themselves.

| Table | Policy | Operation | Predicate |
| --- | --- | --- | --- |
| `roles` | `roles_read_authenticated` | SELECT | `true` (all signed-in) |
| `roles` | `roles_owner_write` | ALL | `tng_is_owner()` |
| `permissions` | `permissions_read_authenticated` | SELECT | `true` |
| `permissions` | `permissions_owner_write` | ALL | `tng_is_owner()` |
| `role_permissions` | `role_permissions_read` | SELECT | `tng_has_any_permission(ARRAY['user.manage_roles', 'role.manage', 'permission.manage'])` |
| `role_permissions` | `role_permissions_owner_write` | ALL | `tng_is_owner()` |
| `user_roles` | `user_roles_read_self` | SELECT | `user_id = auth.uid() OR tng_has_permission('user.manage_roles')` |
| `user_roles` | `user_roles_manage` | ALL | `tng_has_permission('user.manage_roles')` |
| `audit_logs` | `audit_logs_owner_read` | SELECT | `tng_has_permission('system.view_audit_log')` |
| `invitations` | `invitations_read` | SELECT | `tng_has_permission('user.invite')` |
| `invitations` | `invitations_manage` | ALL | `tng_has_permission('user.invite')` |
| `feature_flags` | `feature_flags_read` | SELECT | `true` |
| `feature_flags` | `feature_flags_manage` | ALL | `tng_has_permission('system.manage_feature_flags')` |

---

## AI API Keys

`ai_api_keys` has `FORCE ROW LEVEL SECURITY` (from 0005) and **no** policy for
`anon` or `authenticated`. The table is accessible only via `service_role`
(which bypasses RLS). This is the only table that is intentionally unreachable
from the PostgREST API.

---

## Open Verification Items

All items below require local Docker Supabase testing:

1. [ ] Every policy in this document allows the intended access
2. [ ] Every policy in this document denies unintended access
3. [ ] No legacy policy name survives after 0013
4. [ ] `tng_guard_article_status` correctly blocks unauthorized status transitions
5. [ ] `tng_is_publicly_publishable` correctly gates mock/staging/unlisted content
6. [ ] `tng_is_public_media` correctly gates undeclared-provenance assets
7. [ ] Storage policies work with Supabase storage buckets

See [RLS_TESTING.md](./RLS_TESTING.md) for the complete test procedure.
