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
| Bookmarks | 6 (5 active, 1 archived) |
| Favourites | 2 |
| Tags | 5 (Ops, Product, Design, Security, Research) |
| Lists | 3 (Launch Readiness, Incident Reviews, Research Library) |

## Reset Path

```bash
./tester-env reset    # docker compose down -v
```

## Dev Notes

- The base image is built from `docker/Dockerfile.dev` (node:24-alpine + pnpm).
- Source is bind-mounted via `docker-compose.tester-env.yml` so Next.js HMR reflects code changes live.
- First deploy cold time: ~2m16s pnpm install + ~10s db:migrate + ~7s Next.js compile.
- Subsequent deploys reuse Docker volumes for node_modules and pnpm-store (seconds to restart).

## Baseline

- Release: v0.32.0 (2026-05-08)
- Commit: b9b252ecb6d2af379192778ec24f766d4cd60da3
