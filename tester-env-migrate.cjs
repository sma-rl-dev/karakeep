#!/usr/bin/env node
// Karakeep — deterministic idempotent migration runner for tester-env.
//
// Applies the upstream drizzle journal (packages/db/drizzle) directly via
// better-sqlite3, mirroring drizzle's own better-sqlite3 migrator: same
// __drizzle_migrations schema, entries applied in journal order, one
// transaction per migration, created_at = journal `when`. Idempotent: only
// entries newer than the newest applied created_at run, so it is safe to
// re-run after a mid-run crash. Exits non-zero unless the journal is
// verifiably fully applied.
//
// Deliberately avoids the crypto module and any post-close work: the node
// 24.20.0 base image segfaults/aborts at teardown in some better-sqlite3
// workloads (upstream toolchain drift), so this script keeps the native
// footprint minimal and closes the database explicitly.
"use strict";

const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const DRIZZLE_DIR = path.resolve(__dirname, "packages/db/drizzle");
const DB_PATH = process.env.KARAKEEP_DB_PATH || "/data/db.db";

const journal = JSON.parse(
  fs.readFileSync(path.join(DRIZZLE_DIR, "meta/_journal.json"), "utf8"),
);
const entries = journal.entries;
const lastWhen = Number(entries[entries.length - 1].when);

const db = new Database(DB_PATH);
db.pragma("foreign_keys = ON");

db.exec(
  "CREATE TABLE IF NOT EXISTS __drizzle_migrations (" +
    "id integer PRIMARY KEY AUTOINCREMENT, " +
    "hash text NOT NULL, " +
    "created_at numeric)",
);

const applied = db
  .prepare("select count(*) n, coalesce(max(created_at), 0) m from __drizzle_migrations")
  .get();
let newlyApplied = 0;

for (const entry of entries) {
  if (Number(entry.when) <= Number(applied.m)) continue;
  const raw = fs.readFileSync(path.join(DRIZZLE_DIR, `${entry.tag}.sql`), "utf8");
  const stmts = entry.breakpoints
    ? raw.split("--> statement-breakpoint")
    : [raw];
  db.transaction(() => {
    for (const stmt of stmts) {
      const text = stmt.trim();
      if (text) db.exec(text);
    }
    db.prepare(
      "insert into __drizzle_migrations (hash, created_at) values (?, ?)",
    ).run(entry.tag, entry.when);
  })();
  newlyApplied += 1;
  process.stdout.write(`migrated ${entry.tag}\n`);
}

const state = db
  .prepare("select count(*) n, coalesce(max(created_at), 0) m from __drizzle_migrations")
  .get();
db.close();

if (state.n < entries.length || Number(state.m) < lastWhen) {
  console.error(
    `migration verification FAILED: ${state.n}/${entries.length} rows, ` +
      `max created_at ${state.m} < ${lastWhen}`,
  );
  process.exit(1);
}
console.log(
  `migrations verified: ${entries.length} journal entries, ` +
    `${newlyApplied} newly applied`,
);

// --- Queue prerequisite: create the liteque SQLite schema (tasks table) ----
// tester-env composes no workers service, so the upstream
// prepareQueue() -> LitequeQueueClient.prepare() -> migrateDB() call
// (apps/workers/index.ts) never runs. The web process opens DATA_DIR/queue.db
// without schema, so any bookmark update fails with "no such table: tasks".
// Run the official public liteque migrator here, before web starts. This
// constructs no Runner, poller, crawler, or LLM consumer.
const QUEUE_DB_PATH = path.join(process.env.DATA_DIR || "/data", "queue.db");
const liteque = require(
  require.resolve("liteque", {
    paths: [path.join(__dirname, "packages/plugins/queue-liteque")],
  }),
);
const queueDb = liteque.buildDBClient(QUEUE_DB_PATH, {
  runMigrations: true,
  walEnabled: process.env.DB_WAL_MODE === "true",
});
const queueClient = queueDb.session?.client;
if (typeof queueClient?.close !== "function") {
  throw new Error(
    "queue prerequisite FAILED: buildDBClient did not expose a better-sqlite3 handle",
  );
}
queueClient.close();
console.log(`queue schema verified at ${QUEUE_DB_PATH}`);
