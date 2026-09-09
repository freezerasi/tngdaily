import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const { requireServer } = require("./helpers/require-server.mjs");
const {
  isTopic,
  looseTagsFor,
  primaryTopic,
  TOPIC_META,
  TOPICS,
  topicsForTags,
} = requireServer("src/lib/taxonomy.ts");
const {
  articleStatusLabel,
  contributionStatusLabel,
  rewriteStatusLabel,
  taskTypeLabel,
} = requireServer("src/lib/labels.ts");

// Editorial taxonomy contract: pillars own the URL/nav, topics are secondary.
// If someone adds a topic or renames a label, these tests force the UI copy
// and the mapping to be updated deliberately, not by accident.

test("curated topics are a fixed set with complete metadata", () => {
  assert.deepEqual([...TOPICS], [
    "kuliner",
    "komunitas",
    "kota",
    "agenda",
    "karier",
  ]);
  for (const topic of TOPICS) {
    const meta = TOPIC_META[topic];
    assert.equal(meta.slug, topic);
    assert.ok(meta.label.length > 0);
    assert.ok(meta.description.length > 0);
    assert.ok(meta.commonIn.length > 0);
  }
});

test("isTopic guards the controlled vocabulary", () => {
  assert.equal(isTopic("kuliner"), true);
  assert.equal(isTopic("VIBES"), false);
  assert.equal(isTopic("vibes"), false); // a pillar, not a topic
  assert.equal(isTopic(""), false);
  assert.equal(isTopic(null), false);
  assert.equal(isTopic(undefined), false);
});

test("topicsForTags maps slang to topics, deduped and ordered", () => {
  assert.deepEqual(topicsForTags(["kopi", "nongkrong", "loker"]), [
    "kuliner",
    "karier",
  ]);
  assert.deepEqual(topicsForTags(["  Kopi ", "KOPI"]), ["kuliner"]);
  assert.deepEqual(topicsForTags(["tag-bebas-xyz"]), []);
  assert.deepEqual(topicsForTags([]), []);
});

test("primaryTopic picks the first curated topic, looseTagsFor keeps the rest", () => {
  assert.equal(primaryTopic(["loker", "kopi"]), "karier");
  assert.equal(primaryTopic(["tag-bebas-xyz"]), null);
  assert.deepEqual(looseTagsFor(["kopi", "tag-bebas-xyz"]), ["tag-bebas-xyz"]);
  assert.deepEqual(looseTagsFor(["kopi"]), []);
});

test("status labels cover every lifecycle state without leaking English", () => {
  assert.equal(articleStatusLabel("draft"), "Draft");
  assert.equal(articleStatusLabel("needs_review"), "Perlu review");
  assert.equal(articleStatusLabel("scheduled"), "Terjadwal");
  assert.equal(articleStatusLabel("published"), "Tayang");
  assert.equal(articleStatusLabel("archived"), "Arsip");

  assert.equal(contributionStatusLabel("pending"), "Menunggu");
  assert.equal(contributionStatusLabel("approved"), "Disetujui");
  assert.equal(contributionStatusLabel("rejected"), "Ditolak");

  assert.equal(rewriteStatusLabel("processing"), "Diproses");
  assert.equal(rewriteStatusLabel("needs_review"), "Perlu review");
  assert.equal(rewriteStatusLabel("completed"), "Selesai");
  assert.equal(rewriteStatusLabel("failed"), "Gagal");
});

test("AI task labels stay human-readable for the studio UI", () => {
  assert.equal(taskTypeLabel("rewrite"), "Rewrite dan sintesis");
  assert.equal(taskTypeLabel("quality"), "Quality gate");
  assert.equal(taskTypeLabel("connection_test"), "Tes koneksi");
  assert.equal(taskTypeLabel("draft"), "Draft artikel");
});
