# Karakeep — Tester Environment Deployment

## Quick Start

```bash
./tester-env deploy    # Build image, start services, create admin user
./tester-env seed      # Populate with deterministic seed data
./tester-env verify    # Check seeded state
./tester-env reset     # Clean slate (removes containers + volumes)
```

## Architecture

- **web**: Next.js 15.3.8 dev server (source bind-mounted, HMR for live mutation)
- **meilisearch**: Meilisearch v1.41.0 search engine
- **Database**: SQLite via better-sqlite3 in `/data` volume

## Credentials

- Email: `admin@karakeep.local`
- Password: `admin12345`
- URL: `http://localhost:3010`

## Seeded Data

After `./tester-env seed`:

| Entity | Count |
|--------|-------|
| Bookmarks | 16 (15 active, 1 archived) |
| Favourites | 2 |
| Tags | 53, all human-attached (Your Tags badge shows 50+ with Load More on the Tags page) |
| Lists | 3 (Launch Readiness, Incident Reviews, Research Library) |

The tag set is a power-user taxonomy spread across the workspace: topic tags
(Kubernetes, Postgres, GraphQL, TypeScript, Web Performance, Accessibility,
Observability, Privacy, Licensing, Developer Experience), project tags
(Checkout Relaunch, Billing Migration, Mobile Beta, Pricing Experiment,
Design Tokens, Analytics Revamp), workflow tags (To Read, Reading Now,
Needs Review, Follow-up, Deep Dive, Quick Reference), format tags
(Documentation, Blog Post, Conference Talk, Video, Podcast, RFC, Case Study,
Changelog), vendor tags (AWS, Stripe, Datadog, Figma, Linear, Vercel),
year/quarter tags (2024, 2025, 2026, Q1-Q4), and audience tags (Engineering,
Product Team, Support, Sales, Leadership). Every tag is attached to at least
one bookmark by a human, so the Your Tags section paginates at 50 per page.

## Reset Path

```bash
./tester-env reset    # docker compose down -v
```

## Dev Notes

- The base image is built from `docker/Dockerfile.tester-env` (fork-owned copy of `docker/Dockerfile.dev` with the node base pinned to `node:24.19-alpine`; the moving `node:24-alpine` tag landed on v24.20.0 on 2026-09-02 and node processes abort/segfault nondeterministically in better-sqlite3 and Next.js workloads under it).
- DB migrations run via `tester-env-migrate.cjs` (fork-owned, idempotent, drizzle-compatible `__drizzle_migrations` rows) with a retry loop in the `prep` compose service; `pnpm run db:migrate` (tsx) is bypassed for the same flakiness reason.
- `tester-env-seed.cjs` and `tester-env-verify.cjs` hold the seed/verify logic; the CLI retries them only on native crash exit codes (134/139). Both are idempotent.
- Source is bind-mounted via `docker-compose.tester-env.yml` so Next.js HMR reflects code changes live.
- First deploy cold time: ~2m16s pnpm install + ~10s db:migrate + ~7s Next.js compile.
- Subsequent deploys reuse Docker volumes for node_modules and pnpm-store (seconds to restart).

## Baseline

- Release: v0.32.0 (2026-05-08)
- Commit: b9b252ecb6d2af379192778ec24f766d4cd60da3
