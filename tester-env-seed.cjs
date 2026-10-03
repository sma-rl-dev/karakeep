#!/usr/bin/env node
// Karakeep — deterministic seed data for tester-env (idempotent).
//
// Recreates the full seeded state on every run: reset-style delete of the
// admin user's bookmarks/tags/lists followed by fixed inserts, so running it
// twice in a row yields the same visible state. All timestamps are fixed.
"use strict";

const Database = require("better-sqlite3");
const db = new Database("/data/db.db");
db.pragma("foreign_keys = ON");
const user = db
  .prepare("select id from user where email=?")
  .get("admin@karakeep.local");
if (!user) throw new Error("run deploy first");
const ts = (s) => Math.floor(Date.parse(s) / 1000);
const b = [
  ["seed-bm-001","Kubernetes Runbook: Blue/Green Deployments","https://docs.local/ops/kubernetes-blue-green","Step-by-step rollout checklist for checkout and billing services.","Roll back if checkout latency exceeds the agreed threshold.",0,1,"2026-01-15T09:00:00Z"],
  ["seed-bm-002","Q2 Product Analytics Plan","https://example.com/product/q2-analytics-plan","Dashboard metrics and launch instrumentation plan for the growth team.","North-star metric review includes the search phrase \"aurora retention cohort\".",0,0,"2026-02-03T14:30:00Z"],
  ["seed-bm-003","Design Systems: Accessible Forms","https://example.com/design/accessibility-forms","Reference checklist for labels, validation, keyboard order, and error messages.","Review before the settings redesign.",0,0,"2026-02-18T11:45:00Z"],
  ["seed-bm-004","Incident Review: Payment Timeout","https://status.local/incidents/payment-timeout-review","Post-incident notes for the January payment processor timeout.","Archived after remediation actions were completed.",1,0,"2026-01-28T16:15:00Z"],
  ["seed-bm-005","Vendor Security Questionnaire","https://security.local/vendor-questionnaire","Security review template for SOC2, data retention, and subprocessors.","Favourite reference for procurement reviews.",0,1,"2026-03-01T08:20:00Z"],
  ["seed-bm-006","Local Text Note: Customer Interview Themes",null,null,"Interview synthesis for Nimbus Labs: onboarding clarity, saved-search education, and alert fatigue.",0,0,"2026-03-05T10:00:00Z"],
  // Power-user workspace expansion: 10 additional bookmarks carrying a 48-tag human taxonomy.
  ["seed-bm-007","Stripe Billing Migration Handbook","https://docs.local/ops/stripe-billing-migration","Runbook for moving recurring subscriptions from the legacy processor to Stripe billing.","Milestone owners and cutover windows are tracked in the linked project board.",0,0,"2026-01-22T10:30:00Z"],
  ["seed-bm-008","Checkout Accessibility Audit Checklist","https://example.com/accessibility/checkout-audit","WCAG 2.2 pass/fail matrix for the checkout funnel ahead of the relaunch review.","Blocked items carry owners in the checkout relaunch board.",0,0,"2026-02-09T13:15:00Z"],
  ["seed-bm-009","Conference Talk: Scaling Postgres Past 10 Terabytes","https://videos.local/talks/scaling-postgres","Partitioning, connection pooling, and read replica strategies from the spring database conference.","Watch with the platform guild during the next brown-bag session.",0,0,"2026-02-14T09:00:00Z"],
  ["seed-bm-010","Datadog Alerting Notes: Payment Timeouts","https://metrics.local/dashboards/payment-timeout","Alert thresholds and SLO burn rates reviewed after the January payment processor timeout.","Follow-up: tune the checkout service alert windows after the node pool upgrade.",0,0,"2026-01-30T17:40:00Z"],
  ["seed-bm-011","Mobile Beta Onboarding Findings","https://notes.local/research/mobile-beta-findings","Usability synthesis for the Mobile Beta cohort: onboarding friction and notification fatigue.","Figma flows for the revised onboarding are linked from the appendix.",0,0,"2026-03-10T11:20:00Z"],
  ["seed-bm-012","Pricing Page A/B Experiment Readout","https://insights.local/experiments/pricing-page-ab","Growth team writeup of the pricing page A/B experiment: conversion lift for the annual-plan variant.","Rollout decision still pending; sales enablement wants the final numbers first.",0,0,"2026-02-25T15:45:00Z"],
  ["seed-bm-013","Platform Tools Shortlist","https://wiki.local/platform/tools-shortlist","Shortlist from the platform guild: AWS cost guardrails, Linear triage flows, and Vercel preview deploys.","Licensing terms and renewal windows are compared in the appendix table.",0,0,"2026-02-27T10:00:00Z"],
  ["seed-bm-014","Analytics Revamp Discovery Notes","https://wiki.local/analytics/revamp-discovery","Discovery notes for the analytics revamp: GraphQL federation costs, event pipeline privacy posture, and web performance budgets for the new dashboards.","Carried over from the 2024 analytics rewrite proposal; includes a podcast interview with the reference customer.",0,0,"2026-03-02T14:00:00Z"],
  ["seed-bm-015","Design Tokens Migration Notes","https://design.local/systems/design-tokens-migration","Migration plan from ad-hoc hex values to shared design tokens, with Figma library sync steps.","Changelog entries per release; the design systems team reviews before each sprint.",0,0,"2026-02-20T09:30:00Z"],
  ["seed-bm-016","RFC: TypeScript Strict Mode Rollout","https://rfcs.local/engineering/typescript-strict-mode","Proposal to enable TypeScript strict mode across checkout and billing services in three phases.","Covers expected developer experience gains and the support burden during migration.",0,0,"2026-01-12T08:45:00Z"]
];
const tags = [
  ["seed-tag-ops","Ops"],["seed-tag-product","Product"],["seed-tag-design","Design"],["seed-tag-security","Security"],["seed-tag-research","Research"],
  // Power-user taxonomy: topics
  ["seed-tag-kubernetes","Kubernetes"],["seed-tag-postgres","Postgres"],["seed-tag-graphql","GraphQL"],["seed-tag-typescript","TypeScript"],["seed-tag-web-performance","Web Performance"],["seed-tag-accessibility","Accessibility"],["seed-tag-observability","Observability"],["seed-tag-privacy","Privacy"],["seed-tag-licensing","Licensing"],["seed-tag-developer-experience","Developer Experience"],
  // Projects
  ["seed-tag-checkout-relaunch","Checkout Relaunch"],["seed-tag-billing-migration","Billing Migration"],["seed-tag-mobile-beta","Mobile Beta"],["seed-tag-pricing-experiment","Pricing Experiment"],["seed-tag-design-tokens","Design Tokens"],["seed-tag-analytics-revamp","Analytics Revamp"],
  // Workflow status
  ["seed-tag-to-read","To Read"],["seed-tag-reading-now","Reading Now"],["seed-tag-needs-review","Needs Review"],["seed-tag-follow-up","Follow-up"],["seed-tag-deep-dive","Deep Dive"],["seed-tag-quick-reference","Quick Reference"],
  // Formats
  ["seed-tag-documentation","Documentation"],["seed-tag-blog-post","Blog Post"],["seed-tag-conference-talk","Conference Talk"],["seed-tag-video","Video"],["seed-tag-podcast","Podcast"],["seed-tag-rfc","RFC"],["seed-tag-case-study","Case Study"],["seed-tag-changelog","Changelog"],
  // Vendors
  ["seed-tag-aws","AWS"],["seed-tag-stripe","Stripe"],["seed-tag-datadog","Datadog"],["seed-tag-figma","Figma"],["seed-tag-linear","Linear"],["seed-tag-vercel","Vercel"],
  // Years and quarters
  ["seed-tag-2024","2024"],["seed-tag-2025","2025"],["seed-tag-2026","2026"],["seed-tag-q1","Q1"],["seed-tag-q2","Q2"],["seed-tag-q3","Q3"],["seed-tag-q4","Q4"],
  // Audiences
  ["seed-tag-engineering","Engineering"],["seed-tag-product-team","Product Team"],["seed-tag-support","Support"],["seed-tag-sales","Sales"],["seed-tag-leadership","Leadership"]
];
const lists = [
  ["seed-list-launch","Launch Readiness","Release planning, rollout, and measurement references.","🚀"],
  ["seed-list-incidents","Incident Reviews","Archived and active reliability follow-ups.","🧯"],
  ["seed-list-research","Research Library","Customer and UX research bookmarks.","🔎"]
];
const tagMap = {
  "seed-bm-001":["seed-tag-ops"],
  "seed-bm-002":["seed-tag-product"],
  "seed-bm-003":["seed-tag-design"],
  "seed-bm-004":["seed-tag-ops"],
  "seed-bm-005":["seed-tag-security"],
  "seed-bm-006":["seed-tag-research","seed-tag-product"],
  "seed-bm-007":["seed-tag-billing-migration","seed-tag-stripe","seed-tag-documentation","seed-tag-engineering","seed-tag-deep-dive","seed-tag-2025","seed-tag-q3"],
  "seed-bm-008":["seed-tag-accessibility","seed-tag-checkout-relaunch","seed-tag-documentation","seed-tag-product-team","seed-tag-needs-review","seed-tag-2026","seed-tag-q1"],
  "seed-bm-009":["seed-tag-postgres","seed-tag-conference-talk","seed-tag-video","seed-tag-engineering","seed-tag-to-read","seed-tag-2025","seed-tag-q4"],
  "seed-bm-010":["seed-tag-datadog","seed-tag-observability","seed-tag-kubernetes","seed-tag-engineering","seed-tag-follow-up","seed-tag-2026","seed-tag-q1"],
  "seed-bm-011":["seed-tag-mobile-beta","seed-tag-case-study","seed-tag-figma","seed-tag-product-team","seed-tag-2026","seed-tag-q1"],
  "seed-bm-012":["seed-tag-pricing-experiment","seed-tag-blog-post","seed-tag-sales","seed-tag-leadership","seed-tag-2026","seed-tag-q2"],
  "seed-bm-013":["seed-tag-aws","seed-tag-linear","seed-tag-vercel","seed-tag-licensing","seed-tag-engineering","seed-tag-quick-reference","seed-tag-2025"],
  "seed-bm-014":["seed-tag-analytics-revamp","seed-tag-graphql","seed-tag-privacy","seed-tag-podcast","seed-tag-web-performance","seed-tag-reading-now","seed-tag-2024","seed-tag-q1"],
  "seed-bm-015":["seed-tag-design-tokens","seed-tag-changelog","seed-tag-figma","seed-tag-product-team","seed-tag-2026"],
  "seed-bm-016":["seed-tag-rfc","seed-tag-typescript","seed-tag-developer-experience","seed-tag-engineering","seed-tag-support","seed-tag-2025","seed-tag-q4"]
};
const listMap = {
  "seed-list-launch":["seed-bm-001","seed-bm-002","seed-bm-005"],
  "seed-list-incidents":["seed-bm-004"],
  "seed-list-research":["seed-bm-003","seed-bm-006"]
};

db.transaction(() => {
  db.prepare("delete from bookmarks where userId=?").run(user.id);
  db.prepare("delete from bookmarkTags where userId=?").run(user.id);
  db.prepare("delete from bookmarkLists where userId=?").run(user.id);
  const ib = db.prepare("insert into bookmarks (id,createdAt,modifiedAt,title,archived,favourited,userId,taggingStatus,summarizationStatus,summary,note,type,source) values (?,?,?,?,?,?,?,'success','success',?,?,?,'api')");
  const il = db.prepare("insert into bookmarkLinks (id,url,title,description,crawledAt,crawlStatus,crawlStatusCode) values (?,?,?,?,?,'success',200)");
  const it = db.prepare("insert into bookmarkTexts (id,text,sourceUrl) values (?,?,null)");
  for (const [id, title, url, desc, note, arch, fav, created] of b) {
    ib.run(id, ts(created), ts(created), title, arch, fav, user.id, desc ?? null, note, url ? "link" : "text");
    url ? il.run(id, url, title, desc, ts(created)) : it.run(id, note);
  }
  const tg = db.prepare("insert into bookmarkTags (id,name,createdAt,userId) values (?,?,?,?)");
  for (const [id, name] of tags) tg.run(id, name, ts("2026-01-01T00:00:00Z"), user.id);
  const tb = db.prepare("insert into tagsOnBookmarks (bookmarkId,tagId,attachedAt,attachedBy) values (?,?,?,'human')");
  for (const [bid, tids] of Object.entries(tagMap))
    for (const tid of tids) tb.run(bid, tid, ts("2026-03-06T12:00:00Z"));
  const li = db.prepare("insert into bookmarkLists (id,name,description,icon,createdAt,userId,type,public) values (?,?,?,?,?,?,'manual',0)");
  for (const [id, name, desc, icon] of lists) li.run(id, name, desc, icon, ts("2026-03-06T12:00:00Z"), user.id);
  const lb = db.prepare("insert into bookmarksInLists (bookmarkId,listId,addedAt,listMembershipId) values (?,?,?,null)");
  for (const [lid, bids] of Object.entries(listMap))
    for (const bid of bids) lb.run(bid, lid, ts("2026-03-06T12:00:00Z"));
})();

db.close();

const MEILI_ADDR = (process.env.MEILI_ADDR || "").replace(/\/+$/, "");
if (!MEILI_ADDR) {
  throw new Error("MEILI_ADDR is required to seed the search index");
}

// Official document set; mirrors searchWorker.ts runIndex() and
// zBookmarkSearchDocument: link -> url/linkTitle/description/content(null,
// seed has no htmlContent)/publisher/author/dates; text -> content=bookmarkTexts.text.
// Attribute order matches runIndex(): id, userId, [link fields | content], note,
// summary, title, createdAt, tags. No volatile/computed field is added.
const tagNameById = new Map(tags);
const documents = b.map(([id, title, url, desc, note, , , created]) => {
  const link = url
    ? { url, linkTitle: title, description: desc ?? null, content: null, publisher: null, author: null, datePublished: null, dateModified: null }
    : { content: note };
  return {
    id,
    userId: user.id,
    ...link,
    note,
    summary: desc ?? null,
    title,
    createdAt: new Date(ts(created) * 1000).toISOString(),
    tags: (tagMap[id] ?? []).map((t) => tagNameById.get(t)).sort(),
  };
});

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

// Mirrors MeiliSearchIndexClient.ensureTaskSuccess: 200ms poll, 90% of
// SEARCH_JOB_TIMEOUT_SEC(30)=27000ms. A failed or unsettled task throws once;
// no retry is attempted.
async function waitTask(uid) {
  const deadline = Date.now() + 27000;
  for (;;) {
    const task = await meili(`/tasks/${uid}`);
    if (task.status === "succeeded") return task;
    if (task.status === "failed" || task.status === "canceled") {
      const err = task.error || {};
      throw new Error(`meili task ${uid} (${task.type}) ${task.status}: ${err.code || ""} ${err.message || ""}`.trim());
    }
    if (Date.now() >= deadline) {
      throw new Error(`meili task ${uid} (${task.type}) unsettled after 27000ms (last ${task.status})`);
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

const sameSet = (a, b) => JSON.stringify([...(a || [])].sort()) === JSON.stringify([...b].sort());
async function put(path, value) {
  const task = await meili(path, { method: "PUT", body: JSON.stringify(value) });
  await waitTask(task.taskUid);
}

async function syncSearchIndex() {
  const indexes = await meili("/indexes?limit=100");
  if (!(indexes.results || []).some((i) => i.uid === "bookmarks")) {
    const created = await meili("/indexes", { method: "POST", body: JSON.stringify({ uid: "bookmarks", primaryKey: "id" }) });
    await waitTask(created.taskUid);
  }
  const settings = await meili("/indexes/bookmarks/settings");
  if (!sameSet(settings.filterableAttributes, ["id", "userId"])) await put("/indexes/bookmarks/settings/filterable-attributes", ["id", "userId"]);
  if (!sameSet(settings.sortableAttributes, ["createdAt"])) await put("/indexes/bookmarks/settings/sortable-attributes", ["createdAt"]);
  // Fixed document IDs make repeated upserts idempotent.
  const added = await meili("/indexes/bookmarks/documents?primaryKey=id", { method: "POST", body: JSON.stringify(documents) });
  await waitTask(added.taskUid);
}

(async () => {
  await syncSearchIndex();
  console.log(
    "seeded admin=admin@karakeep.local bookmarks=16 active=15 archived=1 " +
      "favourites=2 tags=53 human_attached_tags=53 lists=3 list_memberships=6",
  );
  console.log("seeded search_index=bookmarks documents=16 filterable=id,userId sortable=createdAt");
})().catch((err) => {
  console.error(err && err.stack ? err.stack : String(err));
  process.exit(1);
});
