-- ---------------------------------------------------------------------------
-- UNVERIFIED — NOT EXECUTED
-- Requires local Docker + Supabase CLI testing before any non-local application.
--
-- TNG Daily — 0010 seed roles and permissions
--
-- Eight system roles, and the explicit permission grant for each. Idempotent: a
-- re-run reconciles rather than duplicating, so a corrected matrix can be
-- reapplied without dropping data.
--
-- The owner row is seeded with no role_permissions at all. That is deliberate.
-- `tng_has_permission` short-circuits for an active owner, so enumerating the
-- grants would create a second source of truth that could drift out of date and
-- appear to remove owner capability without actually doing so.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Roles
--
-- `authority_rank` orders role *assignment* only: a user may not grant a role at
-- or above their own rank. It is never consulted for capability checks. Peers
-- share a rank precisely because their capabilities are disjoint, not ordered.
-- ---------------------------------------------------------------------------

insert into public.roles (key, name, description, is_system_role, authority_rank)
values
  ('owner', 'Owner',
   'Pemilik sistem. Satu-satunya role yang mengatur AI provider, secret, role, permission, feature flag, integrasi, dan audit log.',
   true, 100),
  ('managing_editor', 'Managing Editor',
   'Menerbitkan dan menjadwalkan konten editorial, mengkurasi homepage, dan menutup review. Tidak menyentuh secret AI, role, atau integrasi.',
   true, 70),
  ('editor', 'Editor',
   'Menyunting dan mereview seluruh konten editorial, meminta perubahan, dan menyetujui. Tidak menerbitkan.',
   true, 50),
  ('writer', 'Writer',
   'Menulis dan menyunting draft sendiri, lalu mengirimkannya untuk review. Tidak pernah menerbitkan.',
   true, 30),
  ('contributor', 'Contributor',
   'Mengirim draft sendiri. Tidak mereview, tidak menerbitkan, tidak melihat draft orang lain.',
   true, 20),
  ('commercial_manager', 'Commercial Manager',
   'Mengelola partner, campaign, dan draft advertorial. Tidak menerbitkan konten editorial independen.',
   true, 50),
  ('media_manager', 'Media Manager',
   'Mengelola aset media dan metadatanya, termasuk provenance. Tidak mengubah status artikel.',
   true, 40),
  ('analyst', 'Analyst',
   'Membaca dan mengekspor analitik. Tidak melakukan mutasi apa pun pada konten, media, atau sistem.',
   true, 10)
on conflict (key) do update
  set name = excluded.name,
      description = excluded.description,
      is_system_role = true,
      authority_rank = excluded.authority_rank,
      updated_at = now();

-- ---------------------------------------------------------------------------
-- Permissions
--
-- `is_privileged` marks anything touching secrets, authorization, or system
-- config. The verification block at the end of this migration asserts that no
-- role other than owner holds one.
-- ---------------------------------------------------------------------------

insert into public.permissions (key, group_name, description, is_privileged)
values
  -- Articles
  ('article.create_own',   'article', 'Membuat artikel baru sebagai penulisnya.', false),
  ('article.edit_own',     'article', 'Menyunting artikel yang dibuat sendiri.', false),
  ('article.submit_review','article', 'Mengirim artikel sendiri ke antrean review.', false),
  ('article.read_all',     'article', 'Membaca seluruh artikel, termasuk draft orang lain.', false),
  ('article.edit_all',     'article', 'Menyunting artikel milik siapa pun.', false),
  ('article.review',       'article', 'Memberi catatan review dan meminta perubahan.', false),
  ('article.approve',      'article', 'Menyetujui artikel sehingga siap terbit.', false),
  ('article.publish',      'article', 'Menerbitkan artikel ke publik.', false),
  ('article.schedule',     'article', 'Menjadwalkan penerbitan artikel.', false),
  ('article.archive',      'article', 'Mengarsipkan artikel.', false),
  ('article.restore',      'article', 'Memulihkan revisi atau artikel terarsip.', false),

  -- Media
  ('media.upload',         'media', 'Mengunggah aset media.', false),
  ('media.edit_metadata',  'media', 'Menyunting alt text, kredit, dan provenance media.', false),
  ('media.delete_own',     'media', 'Menghapus aset media yang diunggah sendiri.', false),
  ('media.delete_any',     'media', 'Menghapus aset media milik siapa pun.', false),

  -- Homepage
  ('homepage.read',        'homepage', 'Melihat konfigurasi homepage.', false),
  ('homepage.edit_draft',  'homepage', 'Menyunting draft layout homepage.', false),
  ('homepage.publish',     'homepage', 'Menerbitkan layout homepage.', false),
  ('homepage.schedule',    'homepage', 'Menjadwalkan layout homepage.', false),

  -- Commercial
  ('partner.read',         'commercial', 'Melihat partner dan campaign.', false),
  ('partner.manage',       'commercial', 'Mengelola partner, campaign, dan tautan komersial.', false),
  ('commercial.publish',   'commercial', 'Menerbitkan konten advertorial yang lolos validasi disclosure.', false),

  -- Directory
  ('directory.read',       'directory', 'Melihat listing direktori.', false),
  ('directory.manage',     'directory', 'Mengelola listing loker, UMKM, kos, dan event.', false),

  -- Community
  ('community.read',       'community', 'Membaca kiriman komunitas.', false),
  ('community.moderate',   'community', 'Memoderasi kiriman komunitas.', false),

  -- AI usage
  ('ai.use_writing',       'ai', 'Memakai bantuan AI untuk outline, judul, draft, dan rewrite.', false),
  ('ai.use_seo',           'ai', 'Memakai bantuan AI untuk SEO dan metadata.', false),
  ('ai.use_research',      'ai', 'Memakai bantuan AI untuk ekstraksi sumber dan checklist verifikasi.', false),
  ('ai.use_image_prompt',  'ai', 'Memakai bantuan AI untuk prompt gambar dan alt text.', false),
  ('ai.view_usage',        'ai', 'Melihat log pemakaian AI.', false),
  /*
   * Reversible: a suggestion lands in `pending_owner_review` and changes nothing
   * until an owner approves it. The destructive counterpart,
   * `ai.manage_prompt_library`, stays owner-only.
   */
  ('ai.suggest_prompt_edit', 'ai',
   'Mengusulkan perubahan prompt ke status pending_owner_review. Tidak mengaktifkan prompt apa pun.', false),

  -- AI configuration: privileged
  ('ai.configure_provider',    'ai', 'Mengatur provider AI, model, dan urutan fallback.', true),
  ('ai.manage_secrets',        'ai', 'Mengelola siklus hidup API key AI.', true),
  ('ai.manage_prompt_library', 'ai', 'Menyetujui, mengaktifkan, dan menghapus prompt library global.', true),

  -- Analytics
  ('analytics.read',       'analytics', 'Membaca analitik.', false),
  ('analytics.export',     'analytics', 'Mengekspor data analitik.', false),

  -- Users and roles: privileged
  ('user.invite',          'user', 'Mengundang anggota tim.', true),
  ('user.manage_roles',    'user', 'Menetapkan dan mencabut role.', true),
  ('user.suspend',         'user', 'Menangguhkan akun.', true),
  ('role.manage',          'user', 'Membuat dan menyunting role.', true),
  ('permission.manage',    'user', 'Mengubah pemetaan permission ke role.', true),

  -- System: privileged
  ('system.manage_feature_flags', 'system', 'Mengatur feature flag.', true),
  ('system.manage_integrations',  'system', 'Mengatur integrasi pihak ketiga dan kredensialnya.', true),
  /*
   * Demo content is split along the reversible/irreversible line.
   *
   * Archiving and restoring demo content is recoverable, so it belongs to the
   * newsroom. Purging it deletes rows and Cloudinary assets permanently, so it
   * stays with the owner. Same subject, two permissions, split by consequence.
   */
  ('system.manage_demo_content',  'system',
   'Mengarsipkan, memulihkan, dan melihat konten demo. Reversibel.', false),
  ('system.purge_demo_content',   'system',
   'Menghapus permanen konten demo beserta aset Cloudinary-nya. Tidak reversibel.', true),
  ('system.view_audit_log',       'system', 'Membaca audit log.', true)
on conflict (key) do update
  set group_name = excluded.group_name,
      description = excluded.description,
      is_privileged = excluded.is_privileged;

-- ---------------------------------------------------------------------------
-- Role to permission mapping
--
-- Reconciling rather than additive: the delete removes any grant no longer
-- listed, so this migration is the authoritative matrix and a re-run corrects
-- drift. Owner is excluded from both statements by design.
-- ---------------------------------------------------------------------------

create temporary table tng_role_permission_matrix (
  role_key text not null,
  permission_key text not null
) on commit drop;

insert into tng_role_permission_matrix (role_key, permission_key)
values
  -- MANAGING EDITOR: the editorial publishing authority. No secrets, no roles,
  -- no integrations.
  ('managing_editor', 'article.create_own'),
  ('managing_editor', 'article.edit_own'),
  ('managing_editor', 'article.submit_review'),
  ('managing_editor', 'article.read_all'),
  ('managing_editor', 'article.edit_all'),
  ('managing_editor', 'article.review'),
  ('managing_editor', 'article.approve'),
  ('managing_editor', 'article.publish'),
  ('managing_editor', 'article.schedule'),
  ('managing_editor', 'article.archive'),
  ('managing_editor', 'article.restore'),
  ('managing_editor', 'media.upload'),
  ('managing_editor', 'media.edit_metadata'),
  ('managing_editor', 'media.delete_own'),
  ('managing_editor', 'homepage.read'),
  ('managing_editor', 'homepage.edit_draft'),
  ('managing_editor', 'homepage.publish'),
  ('managing_editor', 'homepage.schedule'),
  ('managing_editor', 'partner.read'),
  ('managing_editor', 'directory.read'),
  ('managing_editor', 'directory.manage'),
  ('managing_editor', 'community.read'),
  ('managing_editor', 'community.moderate'),
  ('managing_editor', 'ai.use_writing'),
  ('managing_editor', 'ai.use_seo'),
  ('managing_editor', 'ai.use_research'),
  ('managing_editor', 'ai.use_image_prompt'),
  ('managing_editor', 'ai.view_usage'),
  ('managing_editor', 'ai.suggest_prompt_edit'),
  ('managing_editor', 'analytics.read'),
  ('managing_editor', 'system.manage_demo_content'),

  -- EDITOR: reviews and edits everything, approves, but does not publish.
  -- The publish/approve split is the point of this role.
  ('editor', 'article.create_own'),
  ('editor', 'article.edit_own'),
  ('editor', 'article.submit_review'),
  ('editor', 'article.read_all'),
  ('editor', 'article.edit_all'),
  ('editor', 'article.review'),
  ('editor', 'article.approve'),
  ('editor', 'media.upload'),
  ('editor', 'media.edit_metadata'),
  ('editor', 'media.delete_own'),
  ('editor', 'homepage.read'),
  ('editor', 'homepage.edit_draft'),
  ('editor', 'partner.read'),
  ('editor', 'directory.read'),
  ('editor', 'community.read'),
  ('editor', 'community.moderate'),
  ('editor', 'ai.use_writing'),
  ('editor', 'ai.use_seo'),
  ('editor', 'ai.use_research'),
  ('editor', 'ai.use_image_prompt'),
  ('editor', 'ai.suggest_prompt_edit'),
  ('editor', 'analytics.read'),

  -- WRITER: own work only, submits for review, never publishes.
  ('writer', 'article.create_own'),
  ('writer', 'article.edit_own'),
  ('writer', 'article.submit_review'),
  ('writer', 'media.upload'),
  ('writer', 'media.edit_metadata'),
  ('writer', 'media.delete_own'),
  ('writer', 'ai.use_writing'),
  ('writer', 'ai.use_seo'),
  ('writer', 'ai.use_image_prompt'),

  -- CONTRIBUTOR: own submission only. No read_all, so cannot see others' drafts.
  ('contributor', 'article.create_own'),
  ('contributor', 'article.edit_own'),
  ('contributor', 'article.submit_review'),
  ('contributor', 'media.upload'),

  -- COMMERCIAL MANAGER: partners and campaigns. `commercial.publish` is granted
  -- because publishing advertorial is the job, but it only ever passes the
  -- disclosure validation in the DAL; it does NOT grant article.publish, so
  -- independent editorial remains out of reach.
  ('commercial_manager', 'article.create_own'),
  ('commercial_manager', 'article.edit_own'),
  ('commercial_manager', 'article.submit_review'),
  ('commercial_manager', 'partner.read'),
  ('commercial_manager', 'partner.manage'),
  ('commercial_manager', 'commercial.publish'),
  ('commercial_manager', 'directory.read'),
  ('commercial_manager', 'directory.manage'),
  ('commercial_manager', 'media.upload'),
  ('commercial_manager', 'media.edit_metadata'),
  ('commercial_manager', 'analytics.read'),

  -- MEDIA MANAGER: assets and provenance. Deliberately holds no article.*
  -- permission at all, so article status is untouchable.
  ('media_manager', 'media.upload'),
  ('media_manager', 'media.edit_metadata'),
  ('media_manager', 'media.delete_own'),
  ('media_manager', 'media.delete_any'),
  ('media_manager', 'article.read_all'),
  ('media_manager', 'ai.use_image_prompt'),

  -- ANALYST: read-only. No mutation permission of any kind.
  ('analyst', 'analytics.read'),
  ('analyst', 'analytics.export'),
  ('analyst', 'article.read_all'),
  ('analyst', 'homepage.read'),
  ('analyst', 'partner.read'),
  ('analyst', 'directory.read'),
  ('analyst', 'community.read'),
  ('analyst', 'ai.view_usage');

-- Add every grant in the matrix.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
  from tng_role_permission_matrix m
  join public.roles r on r.key = m.role_key
  join public.permissions p on p.key = m.permission_key
on conflict (role_id, permission_id) do nothing;

-- Remove any grant not in the matrix, for system roles other than owner.
delete from public.role_permissions rp
 using public.roles r
 where rp.role_id = r.id
   and r.is_system_role
   and r.key <> 'owner'
   and not exists (
     select 1
       from tng_role_permission_matrix m
       join public.permissions p on p.key = m.permission_key
      where m.role_key = r.key
        and p.id = rp.permission_id
   );

-- ---------------------------------------------------------------------------
-- Verification: fail the migration if the boundaries were violated
--
-- These are the invariants the whole model rests on. Asserting them here means a
-- careless future edit to the matrix breaks the migration instead of quietly
-- widening access in production.
-- ---------------------------------------------------------------------------

do $$
declare
  offender text;
  cnt integer;
begin
  -- No non-owner role may hold a privileged permission.
  select string_agg(distinct r.key || ' -> ' || p.key, ', ')
    into offender
    from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    join public.permissions p on p.id = rp.permission_id
   where p.is_privileged
     and r.key <> 'owner';

  if offender is not null then
    raise exception 'Privileged permission granted to a non-owner role: %', offender;
  end if;

  -- Writer must not be able to publish, approve, or schedule.
  select string_agg(p.key, ', ')
    into offender
    from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    join public.permissions p on p.id = rp.permission_id
   where r.key in ('writer', 'contributor')
     and p.key in ('article.publish', 'article.schedule', 'article.approve', 'article.review');

  if offender is not null then
    raise exception 'Writer or contributor holds a publishing permission: %', offender;
  end if;

  -- Commercial manager must not hold editorial publish.
  if exists (
    select 1
      from public.role_permissions rp
      join public.roles r on r.id = rp.role_id
      join public.permissions p on p.id = rp.permission_id
     where r.key = 'commercial_manager'
       and p.key in ('article.publish', 'article.schedule')
  ) then
    raise exception 'commercial_manager must not hold article.publish or article.schedule.';
  end if;

  -- Media manager must hold no article mutation permission.
  select string_agg(p.key, ', ')
    into offender
    from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    join public.permissions p on p.id = rp.permission_id
   where r.key = 'media_manager'
     and p.key like 'article.%'
     and p.key <> 'article.read_all';

  if offender is not null then
    raise exception 'media_manager holds article mutation permissions: %', offender;
  end if;

  -- Analyst must hold nothing but reads.
  select string_agg(p.key, ', ')
    into offender
    from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    join public.permissions p on p.id = rp.permission_id
   where r.key = 'analyst'
     and p.key not in (
       'analytics.read', 'analytics.export', 'article.read_all', 'homepage.read',
       'partner.read', 'directory.read', 'community.read', 'ai.view_usage'
     );

  if offender is not null then
    raise exception 'analyst holds a non-read permission: %', offender;
  end if;

  -- Prompt library activation stays owner-only. A suggestion permission must
  -- never be mistaken for approval authority.
  if exists (
    select 1
      from public.role_permissions rp
      join public.roles r on r.id = rp.role_id
      join public.permissions p on p.id = rp.permission_id
     where r.key <> 'owner'
       and p.key = 'ai.manage_prompt_library'
  ) then
    raise exception 'ai.manage_prompt_library must remain owner-only.';
  end if;

  -- Permanent demo purge stays owner-only; the reversible half may be delegated.
  if exists (
    select 1
      from public.role_permissions rp
      join public.roles r on r.id = rp.role_id
      join public.permissions p on p.id = rp.permission_id
     where r.key <> 'owner'
       and p.key = 'system.purge_demo_content'
  ) then
    raise exception 'system.purge_demo_content must remain owner-only.';
  end if;

  -- Any role that may suggest a prompt edit must not also be able to activate
  -- one, or the two-step review is theatre.
  select string_agg(distinct r.key, ', ')
    into offender
    from public.roles r
   where exists (
           select 1 from public.role_permissions rp
             join public.permissions p on p.id = rp.permission_id
            where rp.role_id = r.id and p.key = 'ai.suggest_prompt_edit'
         )
     and exists (
           select 1 from public.role_permissions rp
             join public.permissions p on p.id = rp.permission_id
            where rp.role_id = r.id and p.key = 'ai.manage_prompt_library'
         );

  if offender is not null then
    raise exception
      'Role holds both ai.suggest_prompt_edit and ai.manage_prompt_library: %', offender;
  end if;

  -- Owner must have no explicit grants: the helper short-circuits instead.
  select count(*) into cnt
    from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
   where r.key = 'owner';

  if cnt > 0 then
    raise exception
      'owner should hold no explicit role_permissions rows; authorization short-circuits in tng_has_permission.';
  end if;

  -- All eight system roles present.
  select count(*) into cnt from public.roles where is_system_role;
  if cnt < 8 then
    raise exception 'Expected 8 system roles, found %.', cnt;
  end if;

  -- Permission inventory. A drift here means the matrix and this migration
  -- disagree, which is exactly the condition these blocks exist to catch.
  select count(*) into cnt from public.permissions;
  if cnt <> 47 then
    raise exception 'Expected 47 permissions, found %.', cnt;
  end if;

  select count(*) into cnt from public.permissions where is_privileged;
  if cnt <> 12 then
    raise exception 'Expected 12 privileged permissions, found %.', cnt;
  end if;
end $$;
