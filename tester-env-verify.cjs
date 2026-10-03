#!/usr/bin/env node
// Karakeep — seeded-state verification for tester-env.
//
// Asserts the deterministic seed produced its exact expected state, including
// the Your Tags pagination oracle: 53 distinct human-attached tags keep the
// Tags page badge at "50+" with Load More offered before pagination.
"use strict";

const Database = require("better-sqlite3");
const db = new Database("/data/db.db");
const user = db
  .prepare("select id from user where email=? and role='admin'")
  .get("admin@karakeep.local");
if (!user) throw new Error("missing admin");
const one = (sql) => db.prepare(sql).get(user.id).n;
const checks = [
  ["bookmarks", one("select count(*) n from bookmarks where userId=?"), 16],
  ["active", one("select count(*) n from bookmarks where userId=? and archived=0"), 15],
  ["archived", one("select count(*) n from bookmarks where userId=? and archived=1"), 1],
  ["favourites", one("select count(*) n from bookmarks where userId=? and favourited=1"), 2],
  ["tags", one("select count(*) n from bookmarkTags where userId=?"), 53],
  // Your Tags badge oracle: tags with at least one human attachment feed the
  // Tags page pagination (50 per page); 53 keeps the badge at "50+" with
  // Load More offered.
  ["human_attached_tags", db.prepare("select count(distinct t.id) n from bookmarkTags t join tagsOnBookmarks tb on tb.tagId=t.id where t.userId=? and tb.attachedBy='human'").get(user.id).n, 53],
  ["unused_tags", one("select count(*) n from bookmarkTags t where t.userId=? and not exists (select 1 from tagsOnBookmarks tb where tb.tagId=t.id)"), 0],
  ["lists", one("select count(*) n from bookmarkLists where userId=?"), 3],
  ["list_memberships", db.prepare("select count(*) n from bookmarksInLists").get().n, 6]
];
for (const [name, got, exp] of checks) {
  if (got !== exp) throw new Error(`${name}: expected ${exp}, got ${got}`);
}
if (db.prepare("select title from bookmarks where id='seed-bm-002'").get()?.title !== "Q2 Product Analytics Plan") {
  throw new Error("missing Q2 Product Analytics Plan");
}
if (!(db.prepare("select text from bookmarkTexts where id='seed-bm-006'").get()?.text ?? "").includes("Nimbus Labs")) {
  throw new Error("missing Nimbus Labs text note");
}
if (db.prepare("select title from bookmarks where id='seed-bm-007'").get()?.title !== "Stripe Billing Migration Handbook") {
  throw new Error("missing Stripe Billing Migration Handbook");
}
if ((db.prepare("select count(*) n from tagsOnBookmarks where attachedBy<>'human'").get().n) !== 0) {
  throw new Error("seed tags must all be human-attached");
}
const dbTagNames = db
  .prepare("select name from bookmarkTags where userId=?")
  .all(user.id)
  .map((r) => r.name)
  .sort();
db.close();

// --- Queue prerequisite: schema + official indexes (pre-UI) ----------------
// Workers are omitted, so seed writes db.db directly and enqueues nothing;
// legitimate UI edits may add pending tasks. Assert schema/index presence
// only, and log the current task count as a diagnostic (not an oracle).
const QUEUE_DB_PATH = "/data/queue.db";
const qdb = new Database(QUEUE_DB_PATH);
if (!qdb.prepare("select name from sqlite_master where type='table' and name='tasks'").get()) {
  throw new Error(`queue prerequisite: missing tasks table at ${QUEUE_DB_PATH}`);
}
const QUEUE_INDEXES = [
  "tasks_queue_idx", "tasks_status_idx", "tasks_expire_at_idx",
  "tasks_num_runs_left_idx", "tasks_max_num_runs_idx", "tasks_allocation_id_idx",
  "tasks_queue_idempotencyKey_unique", "tasks_priority_idx", "tasks_available_at_idx",
];
const qIndexes = new Set(
  qdb.prepare("select name from sqlite_master where type='index' and tbl_name='tasks'").all().map((r) => r.name),
);
for (const idx of QUEUE_INDEXES) {
  if (!qIndexes.has(idx)) throw new Error(`queue prerequisite: missing official index ${idx}`);
}
const qCount = qdb.prepare("select count(*) n from tasks").get().n;
qdb.close();
console.log(`verified queue_schema=tasks official_indexes=${QUEUE_INDEXES.length} tasks=${qCount}`);

const MEILI_ADDR = (process.env.MEILI_ADDR || "").replace(/\/+$/, "");
if (!MEILI_ADDR) {
  throw new Error("MEILI_ADDR is required to verify the search index");
}

async function meili(path, init) {
  const res = await fetch(`${MEILI_ADDR}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...((init && init.headers) || {}) },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const code = (body && body.code) || res.status;
    const msg = (body && body.message) || res.statusText;
    throw new Error(`meili ${(init && init.method) || "GET"} ${path} -> ${res.status} ${code}: ${msg}`);
  }
  return body;
}

const sameSet = (a, b) => JSON.stringify([...(a || [])].sort()) === JSON.stringify([...b].sort());
const expect = (ok, msg) => {
  if (!ok) throw new Error(msg);
};

(async () => {
  const stats = await meili("/indexes/bookmarks/stats");
  expect(stats.numberOfDocuments === 16, `index documents: expected 16, got ${stats.numberOfDocuments}`);

  const settings = await meili("/indexes/bookmarks/settings");
  expect(sameSet(settings.filterableAttributes, ["id", "userId"]), `filterableAttributes: ${JSON.stringify(settings.filterableAttributes)}`);
  expect(sameSet(settings.sortableAttributes, ["createdAt"]), `sortableAttributes: ${JSON.stringify(settings.sortableAttributes)}`);
  // The app never sets searchableAttributes; Meili default ["*"] must remain.
  expect((settings.searchableAttributes || ["*"]).includes("*"), `searchableAttributes restricted: ${JSON.stringify(settings.searchableAttributes)}`);

  const listed = await meili("/indexes/bookmarks/documents?limit=20&fields=id,userId,title,tags,note,content,url");
  const docs = listed.results || [];
  expect(docs.length === 16, `index documents listed: expected 16, got ${docs.length}`);
  for (const doc of docs) {
    expect(String(doc.id).startsWith("seed-bm-"), `unexpected index doc id ${doc.id}`);
    expect(doc.userId === user.id, `index doc ${doc.id} not owned by the seed admin`);
  }
  const derivedTags = [...new Set(docs.flatMap((doc) => doc.tags || []))].sort();
  expect(JSON.stringify(derivedTags) === JSON.stringify(dbTagNames), `index tags != DB tags (index ${derivedTags.length}, db ${dbTagNames.length})`);
  const bm002 = docs.find((doc) => doc.id === "seed-bm-002");
  expect(bm002 && bm002.title === "Q2 Product Analytics Plan" && (bm002.tags || []).includes("Product"), "index doc seed-bm-002 is not the Q2 Product Analytics Plan with the Product tag");
  const bm006 = docs.find((doc) => doc.id === "seed-bm-006");
  expect(`${(bm006 && bm006.content) || ""} ${(bm006 && bm006.note) || ""}`.includes("Nimbus Labs"), "index doc seed-bm-006 is missing the text-note fulltext (Nimbus Labs)");

  // Mutation-agnostic: single term only; no explicit matching strategy and no
  // multi-term all-terms expectation, so the intended FAIL environment is not
  // rejected before the UI exercises it.
  const search = await meili("/indexes/bookmarks/search", {
    method: "POST",
    body: JSON.stringify({ q: "Product", filter: `userId = "${user.id}"`, limit: 20, attributesToRetrieve: ["id"] }),
  });
  const hitIds = (search.hits || []).map((hit) => hit.id);
  expect(hitIds.includes("seed-bm-002"), `representative 'Product' search missing seed-bm-002 (hits=${JSON.stringify(hitIds)})`);

  const tasks = await meili("/tasks?indexUids=bookmarks&limit=50");
  const failed = (tasks.results || []).filter((task) => task.status === "failed");
  expect(!failed.length, `failed Meili tasks: ${JSON.stringify(failed.map((t) => ({ uid: t.uid, type: t.type, error: t.error })))}`);

  console.log(
    "verified admin=admin@karakeep.local bookmarks=16 active=15 archived=1 favourites=2 " +
      "tags=53 human_attached_tags=53 lists=3 list_memberships=6",
  );
  console.log(`verified search_index=bookmarks documents=16 product_hits=${hitIds.length}`);
})().catch((err) => {
  console.error(err && err.stack ? err.stack : String(err));
  process.exit(1);
});
