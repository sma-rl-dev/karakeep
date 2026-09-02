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
console.log(
  "verified admin=admin@karakeep.local bookmarks=16 active=15 archived=1 " +
    "favourites=2 tags=53 human_attached_tags=53 lists=3 list_memberships=6",
);
