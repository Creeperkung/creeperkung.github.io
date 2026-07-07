# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

ArkPulls: an Arknights gacha pull tracker with community luck analytics. Two apps in one repo:

- **Root** — Express 5 + TypeScript REST API (port 3000), Prisma ORM
- **`web/`** — Next.js 16 dashboard (port 3001), proxies `/api/*` to the backend via rewrites in `web/next.config.ts`, so there is no CORS handling anywhere. `web/` has its own CLAUDE.md: Next 16 has breaking changes; consult `web/node_modules/next/dist/docs/` before writing Next-specific code.

## Commands

```bash
# API (repo root)
npm run dev              # tsx watch, http://localhost:3000
npm run db:migrate       # prisma migrate dev (also regenerates client + runs seed)
npm run db:seed          # seed 50 simulated players (idempotent)
npm run build            # tsc → dist/
npm test                 # vitest run (tests/, pure logic only — no DB needed)

# Dashboard
cd web && npm run dev    # defaults to port 3000 — collides with the API
```

Run the dashboard on port 3001. On Windows/PowerShell, `npm run dev -- --port 3001` mangles the flag (npm passes `3001` as a directory); use `$env:PORT=3001; npm run dev` instead.

Database is SQLite (`dev.db`, gitignored) for dev. For deployment, change `provider` in `prisma/schema.prisma` to `postgresql` and point `DATABASE_URL` (in `.env`) at Postgres.

Tests live in `tests/` (Vitest) and cover the pure logic only: pity extraction (`src/services/pity.ts`) and JSON-import parsing/dedup/merging (`parseExport`, `dedupeWithinPaste`, `mergeBannerPulls` in `jsonImport.ts`). Keep testable logic in pure exported functions, DB access in thin wrappers around them.

## Architecture

Data flow: ingestion → Prisma (User/Banner/Pull) → stats service → REST API → dashboard.

Two import paths, both idempotent, both identify accounts by **SHA-256 hash only** (raw tokens/account names are never stored):

- `src/services/ingest.ts` (`POST /api/import`) — token-based. Calls `fetchGachaHistory()` in `src/services/yostarClient.ts`, which is currently a **mock** that generates deterministic-per-token histories using real Arknights pity mechanics (2% base 6★, +2%/pull after 50). The planned real Yostar email-code integration replaces only that function's body; keep its interface stable. Appends new pulls by `seq`.
- `src/services/jsonImport.ts` (`POST /api/import/json`) — paste-based import of Yostar Account Center Headhunting History responses. The real shape is **confirmed against an actual export**: `{ code, data: { rows: [{ charName, star: "4星", poolId, poolName, type, at: <ms> }], count } }`, paginated 10 rows per page. The parser also accepts arrays of page responses, flat pull arrays, and a grouped legacy shape (`data.list` + `chars`); star strings are 1-indexed by definition, numeric `rarity` fields get 0- vs 1-indexed auto-detection.

### Invariants that break stats if violated

- `Pull.seq` must be **chronological AND dense (0-based, no gaps) within (userId, bannerId)** — per-user pity extraction (`src/services/pity.ts`) walks pulls in `seq` order, and the community pity distribution (`src/services/stats.ts`) computes pity in SQL as `seq - LAG(seq)` over rarity-6 rows, which is only correct if every pull occupies exactly one seq slot. `jsonImport` preserves this by deleting and re-creating a banner's pulls in timestamp order on every merge (an import can contain pulls older than what's stored); token ingest appends dense seq from the client.
- JSON-import dedup is a **multiset** keyed by `(timestamp, operator, rarity)` — in the grouped legacy shape a ten-pull can legally contain the same operator twice at one shared timestamp, so per-key counts are compared, not key existence. But within a single paste, identical keys from **flat rows** (which carry per-pull ms timestamps) are duplicated/overlapping pages and are dropped — see `allowDuplicates` in `jsonImport.ts`.
- Rarity is stored **1-indexed (3–6)**; Arknights game data is 0-indexed (6★ = 5). Conversion happens only at the jsonImport boundary.

### Community stats

The community pity distribution is aggregated in SQL (`communityPityDistribution` in `stats.ts`) with a window function that reads only rarity-6 rows — it no longer loads every pull into memory per request. The raw query uses double-quoted identifiers and `LAG ... OVER` syntax valid in both SQLite (3.25+) and Postgres; keep any changes portable across both.

## Frontend conventions

Chart and theme colors are CSS custom properties defined once in `web/app/globals.css` (light + dark via `prefers-color-scheme`), consumed as `var(--series-1)`, `var(--ink)`, etc. The histogram (`web/components/PityHistogram.tsx`) is hand-rolled SVG — no chart library. Palette values follow a validated accessibility method (contrast + colorblind-safety per mode); don't introduce new chart colors ad hoc.
