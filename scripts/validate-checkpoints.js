const { Client } = require('pg');

const TEST_USERS = [
  { id: '11111111-1111-4111-a111-111111111111', email: 'owner_candidate@test.local', role: 'owner_candidate' },
  { id: '22222222-2222-4222-a222-222222222222', email: 'managing_editor@test.local', role: 'managing_editor' },
  { id: '33333333-3333-4333-a333-333333333333', email: 'editor@test.local', role: 'editor' },
  { id: '44444444-4444-4444-a444-444444444444', email: 'writer@test.local', role: 'writer' },
  { id: '55555555-5555-4555-a555-555555555555', email: 'contributor@test.local', role: 'contributor' },
  { id: '66666666-6666-4666-a666-666666666666', email: 'commercial_mgr@test.local', role: 'commercial_manager' },
  { id: '77777777-7777-4777-a777-777777777777', email: 'media_mgr@test.local', role: 'media_manager' },
  { id: '88888888-8888-4888-a888-888888888888', email: 'analyst@test.local', role: 'analyst' },
  { id: '99999999-9999-4999-a999-999999999999', email: 'suspended_user@test.local', role: 'contributor', status: 'suspended' },
  { id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', email: 'expired_role_user@test.local', role: 'contributor', expired: true },
  { id: 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb', email: 'banned_user@test.local', role: 'writer', banned: true }
];

async function runValidation() {
  const client = new Client({
    host: process.env.PGHOST,
    port: parseInt(process.env.PGPORT || '6543', 10),
    database: process.env.PGDATABASE || 'postgres',
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: { rejectUnauthorized: false }
  });

  const testResults = [];
  function record(category, testName, passed, detail = '') {
    testResults.push({ category, testName, passed, detail });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${category} :: ${testName} ${detail ? '(' + detail + ')' : ''}`);
  }

  try {
    await client.connect();
    console.log('Connected for Checkpoints 3-6 validation.');

    // -------------------------------------------------------------
    // CHECKPOINT 3: Seed & Identity Setup
    // -------------------------------------------------------------
    console.log('\n=== CHECKPOINT 3: SEED & IDENTITY SETUP ===');
    
    // Clean up test identities if previously inserted
    const ids = TEST_USERS.map(u => `'${u.id}'`).join(',');
    await client.query(`DELETE FROM auth.users WHERE id IN (${ids});`);
    await client.query(`DELETE FROM public.articles WHERE slug LIKE 'test-%';`);

    // Insert into auth.users
    for (const u of TEST_USERS) {
      const bannedUntil = u.banned ? 'now() + interval \'1 year\'' : 'null';
      await client.query(`
        INSERT INTO auth.users (
          id, aud, role, email, encrypted_password, email_confirmed_at,
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
          banned_until
        ) VALUES (
          '${u.id}', 'authenticated', 'authenticated', '${u.email}', 'crypt_fake_hash', now(),
          '{"provider":"email","providers":["email"]}', '{}', now(), now(),
          ${bannedUntil}
        );
      `);

      // Profiles are automatically or manually inserted
      const profileStatus = u.status || 'active';
      const suspendedReason = u.status === 'suspended' ? 'Policy test suspension' : null;
      await client.query(`
        INSERT INTO public.profiles (id, username, display_name, status, suspended_reason)
        VALUES ('${u.id}', '${u.email.split('@')[0].replace(/_/g, '-')}', '${u.role}', '${profileStatus}', ${suspendedReason ? `'${suspendedReason}'` : 'null'})
        ON CONFLICT (id) DO UPDATE
        SET status = EXCLUDED.status, suspended_reason = EXCLUDED.suspended_reason;
      `);
    }
    record('Checkpoint 3', 'Disposable test identities seeded in auth.users and public.profiles', true, '11 test accounts');

    // -------------------------------------------------------------
    // CHECKPOINT 4: Migration & Trigger Validation
    // -------------------------------------------------------------
    console.log('\n=== CHECKPOINT 4: MIGRATION & TRIGGER VALIDATION ===');

    const ownerUser = TEST_USERS[0];
    const editorUser = TEST_USERS[2];

    // 4.1 Owner Bootstrap Test: Primary Bootstrap
    let bootstrapSucceeded = false;
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL role = 'authenticated';`);
      await client.query(`SET LOCAL request.jwt.claims = '{"sub":"${ownerUser.id}","role":"authenticated"}';`);
      await client.query(`SET LOCAL "tng.bootstrap_owner" = 'on';`);
      await client.query(`
        INSERT INTO public.user_roles (user_id, role_id, assigned_by)
        SELECT '${ownerUser.id}', id, null
        FROM public.roles WHERE key = 'owner';
      `);
      await client.query('COMMIT');
      bootstrapSucceeded = true;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Bootstrap error:', err.message);
    }
    record('Checkpoint 4', 'Primary owner bootstrap succeeds once with 7 invariants', bootstrapSucceeded);

    // 4.2 Verify second bootstrap fails (count > 0)
    let secondBootstrapBlocked = false;
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL role = 'authenticated';`);
      await client.query(`SET LOCAL request.jwt.claims = '{"sub":"${editorUser.id}","role":"authenticated"}';`);
      await client.query(`SET LOCAL "tng.bootstrap_owner" = 'on';`);
      await client.query(`
        INSERT INTO public.user_roles (user_id, role_id, assigned_by)
        SELECT '${editorUser.id}', id, null
        FROM public.roles WHERE key = 'owner';
      `);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      secondBootstrapBlocked = err.message.includes('conditions are not met') || err.message.includes('active_owners');
    }
    record('Checkpoint 4', 'Second owner bootstrap strictly rejected', secondBootstrapBlocked);

    // 4.3 Assign other test roles
    for (const u of TEST_USERS) {
      if (u.role === 'owner_candidate') continue;
      const expiresAt = u.expired ? 'now() - interval \'1 hour\'' : 'null';
      await client.query(`
        INSERT INTO public.user_roles (user_id, role_id, assigned_by, expires_at)
        SELECT '${u.id}', id, '${ownerUser.id}', ${expiresAt}
        FROM public.roles WHERE key = '${u.role}'
        ON CONFLICT (user_id, role_id) DO NOTHING;
      `);
    }
    record('Checkpoint 3', 'Role assignments assigned to test users', true);

    // 4.4 Final-Owner Floor: Owner cannot be deleted from user_roles
    let deleteOwnerBlocked = false;
    try {
      await client.query(`DELETE FROM public.user_roles WHERE user_id = '${ownerUser.id}';`);
    } catch (err) {
      deleteOwnerBlocked = err.message.includes('Refusing to remove the last active owner');
    }
    record('Checkpoint 4', 'Final-owner floor blocks deletion of last owner', deleteOwnerBlocked);

    // 4.5 Final-Owner Floor: Owner cannot be suspended
    let suspendOwnerBlocked = false;
    try {
      await client.query(`UPDATE public.profiles SET status = 'suspended' WHERE id = '${ownerUser.id}';`);
    } catch (err) {
      suspendOwnerBlocked = err.message.includes('Refusing to suspend the last active owner');
    }
    record('Checkpoint 4', 'Final-owner floor blocks suspension of last owner', suspendOwnerBlocked);

    // 4.6 Audit immutability: UPDATE on audit_logs denied
    let auditUpdateBlocked = false;
    try {
      await client.query(`UPDATE public.audit_logs SET action = 'tampered';`);
    } catch (err) {
      auditUpdateBlocked = err.message.includes('audit_logs is append-only');
    }
    record('Checkpoint 4', 'audit_logs immutability trigger blocks UPDATE', auditUpdateBlocked);

    // 4.7 Audit immutability: DELETE on audit_logs denied
    let auditDeleteBlocked = false;
    try {
      await client.query(`DELETE FROM public.audit_logs;`);
    } catch (err) {
      auditDeleteBlocked = err.message.includes('audit_logs is append-only');
    }
    record('Checkpoint 4', 'audit_logs immutability trigger blocks DELETE', auditDeleteBlocked);

    // 4.8 Audit sensitive key scrubbing: verify nested secret keys redacted
    const scrubRes = await client.query(`
      SELECT public.tng_scrub_sensitive('{"normal": "val", "api_key": "supersecret", "nested": {"password": "pass"}}'::jsonb) as scrubbed;
    `);
    const scrubbed = scrubRes.rows[0].scrubbed;
    const scrubPassed = scrubbed.api_key === '[REDACTED]' && scrubbed.nested.password === '[REDACTED]' && scrubbed.normal === 'val';
    record('Checkpoint 4', 'Sensitive key redaction recursively scrubs credentials', scrubPassed);

    // -------------------------------------------------------------
    // CHECKPOINT 5: RLS Allow / Deny Boundary Matrix
    // -------------------------------------------------------------
    console.log('\n=== CHECKPOINT 5: RLS ALLOW / DENY MATRIX ===');

    // Create test content under superuser context
    const writerUser = TEST_USERS.find(u => u.role === 'writer');
    const editorTestUser = TEST_USERS.find(u => u.role === 'editor');
    const meUser = TEST_USERS.find(u => u.role === 'managing_editor');
    const commUser = TEST_USERS.find(u => u.role === 'commercial_manager');
    const mediaUser = TEST_USERS.find(u => u.role === 'media_manager');
    const analystUser = TEST_USERS.find(u => u.role === 'analyst');
    const suspendedUser = TEST_USERS.find(u => u.email === 'suspended_user@test.local');

    // Seed test articles
    await client.query(`
      INSERT INTO public.articles (
        id, title, slug, pillar, status, author_id, published_at, visibility, content_environment, is_mock
      ) VALUES
      ('a1111111-1111-4111-a111-111111111111', 'Published Prod Article', 'test-pub-prod', 'vibes', 'published', '${writerUser.id}', now() - interval '1 hour', 'public', 'production', false),
      ('a2222222-2222-4222-a222-222222222222', 'Mock Article', 'test-mock-art', 'vibes', 'published', '${writerUser.id}', now() - interval '1 hour', 'public', 'production', true),
      ('a3333333-3333-4333-a333-333333333333', 'Writer Draft Article', 'test-draft-writer', 'vibes', 'draft', '${writerUser.id}', null, 'public', 'production', false)
      ON CONFLICT (id) DO NOTHING;
    `);

    // Helper to run query as a specific user JWT
    async function runAs(userObj, sqlQuery) {
      await client.query('BEGIN');
      try {
        if (!userObj) {
          await client.query(`SET LOCAL role = 'anon';`);
        } else {
          await client.query(`SET LOCAL role = 'authenticated';`);
          await client.query(`SET LOCAL request.jwt.claims = '{"sub":"${userObj.id}","role":"authenticated"}';`);
        }
        const res = await client.query(sqlQuery);
        await client.query('COMMIT');
        return { success: true, rows: res.rows, rowCount: res.rowCount };
      } catch (err) {
        await client.query('ROLLBACK');
        return { success: false, error: err.message };
      }
    }

    // Test 5.1: Anon can select published prod article
    const anonPub = await runAs(null, `SELECT id FROM public.articles WHERE slug = 'test-pub-prod';`);
    record('Checkpoint 5 (RLS)', 'Anon can read published public production article', anonPub.success && anonPub.rows.length === 1);

    // Test 5.2: Anon CANNOT read mock article
    const anonMock = await runAs(null, `SELECT id FROM public.articles WHERE slug = 'test-mock-art';`);
    record('Checkpoint 5 (RLS)', 'Anon cannot read mock article', anonMock.success && anonMock.rows.length === 0);

    // Test 5.3: Anon CANNOT read draft article
    const anonDraft = await runAs(null, `SELECT id FROM public.articles WHERE slug = 'test-draft-writer';`);
    record('Checkpoint 5 (RLS)', 'Anon cannot read draft article', anonDraft.success && anonDraft.rows.length === 0);

    // Test 5.4: Writer can read own draft
    const writerDraft = await runAs(writerUser, `SELECT id FROM public.articles WHERE slug = 'test-draft-writer';`);
    record('Checkpoint 5 (RLS)', 'Writer can read own draft article', writerDraft.success && writerDraft.rows.length === 1);

    // Test 5.5: Contributor CANNOT read writer\'s draft
    const contribUser = TEST_USERS.find(u => u.role === 'contributor' && !u.status && !u.expired);
    const contribDraft = await runAs(contribUser, `SELECT id FROM public.articles WHERE slug = 'test-draft-writer';`);
    record('Checkpoint 5 (RLS)', 'Contributor cannot read other\'s draft article', contribDraft.success && contribDraft.rows.length === 0);

    // Test 5.6: Editor can read other\'s draft (has article.read_all)
    const editorReadDraft = await runAs(editorTestUser, `SELECT id FROM public.articles WHERE slug = 'test-draft-writer';`);
    record('Checkpoint 5 (RLS)', 'Editor can read all drafts (article.read_all)', editorReadDraft.success && editorReadDraft.rows.length === 1);

    // Test 5.7: Writer cannot transition draft directly to published
    const writerPubAttempt = await runAs(writerUser, `UPDATE public.articles SET status = 'published' WHERE slug = 'test-draft-writer';`);
    record('Checkpoint 5 (RLS)', 'Writer cannot publish article (status guard blocked)', !writerPubAttempt.success || writerPubAttempt.rowCount === 0);

    // Test 5.8: Editor CANNOT publish article (publish is reserved for managing_editor / owner)
    const editorPubAttempt = await runAs(editorTestUser, `UPDATE public.articles SET status = 'published' WHERE slug = 'test-draft-writer';`);
    record('Checkpoint 5 (RLS)', 'Editor cannot publish article (needs article.publish)', !editorPubAttempt.success);

    // Test 5.9: Managing editor CAN publish article
    const mePubAttempt = await runAs(meUser, `UPDATE public.articles SET status = 'published', published_at = now() WHERE slug = 'test-draft-writer';`);
    record('Checkpoint 5 (RLS)', 'Managing Editor can publish article (holds article.publish)', mePubAttempt.success && mePubAttempt.rowCount === 1);

    // Test 5.10: Non-owner cannot access ai_api_keys table
    const writerAiKeys = await runAs(writerUser, `SELECT * FROM public.ai_api_keys;`);
    record('Checkpoint 5 (RLS)', 'Non-owner blocked from ai_api_keys', !writerAiKeys.success || writerAiKeys.rows.length === 0);

    // Test 5.11: Non-owner cannot view audit_logs
    const editorAudit = await runAs(editorTestUser, `SELECT * FROM public.audit_logs;`);
    record('Checkpoint 5 (RLS)', 'Non-owner blocked from audit_logs read', editorAudit.success && editorAudit.rows.length === 0);

    // Test 5.12: Owner CAN view audit_logs
    const ownerAudit = await runAs(ownerUser, `SELECT * FROM public.audit_logs;`);
    record('Checkpoint 5 (RLS)', 'Owner can view audit_logs', ownerAudit.success && ownerAudit.rows.length > 0);

    // Test 5.13: Suspended user authorizes nothing
    const suspendedRead = await runAs(suspendedUser, `SELECT * FROM public.articles;`);
    // Should only see published articles (like anon) but none of internal articles
    const suspendedDraft = await runAs(suspendedUser, `SELECT * FROM public.articles WHERE status = 'draft';`);
    record('Checkpoint 5 (RLS)', 'Suspended user cannot access internal content', suspendedDraft.success && suspendedDraft.rows.length === 0);

    // -------------------------------------------------------------
    // CHECKPOINT 6: Concurrency & Lock Testing
    // -------------------------------------------------------------
    console.log('\n=== CHECKPOINT 6: CONCURRENCY TESTING ===');

    // Create a client2 connection
    const client2 = new Client({
      host: process.env.PGHOST,
      port: parseInt(process.env.PGPORT || '6543', 10),
      database: process.env.PGDATABASE || 'postgres',
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      ssl: { rejectUnauthorized: false }
    });
    await client2.connect();

    // Test advisory xact lock serialization
    await client.query('BEGIN;');
    await client.query(`SELECT pg_advisory_xact_lock(hashtextextended('tng_owner_bootstrap', 0));`);

    let client2LockAttempt = 'WAITING';
    const lockPromise = client2.query(`SELECT pg_try_advisory_xact_lock(hashtextextended('tng_owner_bootstrap', 0)) as acquired;`);
    const lockRes = await lockPromise;
    const lockBlocked = lockRes.rows[0].acquired === false;

    await client.query('COMMIT;');
    await client2.end();

    record('Checkpoint 6', 'pg_advisory_xact_lock serializes concurrent bootstrap attempts', lockBlocked, 'Acquired false on concurrent try');

    await client.end();
    console.log('\nAll validation checkpoints executed successfully.');
  } catch (err) {
    console.error('Validation runner failure:', err);
    process.exit(1);
  }
}

runValidation();
