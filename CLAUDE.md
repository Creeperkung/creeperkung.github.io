# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Relic Index**: a searchable list of every Arknights Integrated Strategies (roguelike) relic. It's a static Next.js 16 site in `web/`. There's no backend or database.

(This repo used to be ArkPulls, a gacha pull tracker with an Express/Prisma API. It was removed in favour of the relic index. The last version with it is commit `1f54551`.)

`web/` has its own CLAUDE.md: Next 16 has breaking changes. Read `web/node_modules/next/dist/docs/` before writing Next-specific code.

## Commands (run in `web/`)

```bash
npm run dev                      # http://localhost:3000
npm run build                    # fully static output; also typechecks
npm run lint
node scripts/build-relics.mjs    # regenerate data/relics.json from upstream game data
```

## Data

- `web/data/relics.json` and `web/public/relics/*.webp` are **generated, committed data**. Don't hand-edit them. Regenerate it with `scripts/build-relics.mjs`, which downloads `en_US/gamedata/excel/roguelike_topic_table.json` from Kengxxiao/ArknightsGameData_YoStar (you can also pass a local path to it).
- The canonical relic list and numbering is each theme's **Collection archive** (`details[theme].archiveComp.relic.relic`, `orderId`), joined to `details[theme].items`. Items that aren't in the archive are internal/event-only and are deliberately skipped.
- Rarity `NORMAL/RARE/SUPER_RARE` maps to `normal/rare/superRare`. `subType` `CURSE`/`SECRET` maps to `kind`.
- Icons come from ArknightsAssets (`cn` branch, `assets/torappu/dynamicassets/arts/ui/rogueliketopic/itempic/<relicId>.png`). The script resizes them to 128px WebP using `sharp`, downloads only missing ones (`--refresh-icons` re-fetches all, `--skip-icons` skips them), and sets `relic.icon`. 10 early Phantom (IS#2) relics have no upstream icon, and the UI shows a placeholder for them.
- IS numbering: `themeShort()` labels `rogue_N` as IS#(N+1), since IS#1 (Ceobe's Fungimist, CN-only) isn't in the data.
- Types live in `web/lib/relics.ts`. If you change the JSON shape, update the script and the types together.

## Frontend

- `app/page.tsx` is a server component that passes the bundled data to `components/RelicBrowser.tsx` (a client component). The browser reads `?theme=&q=` through `useSearchParams`, so it must stay inside the `<Suspense>` boundary in `page.tsx`.
- Colors are CSS custom properties in `web/app/globals.css`, with light and dark variants via `prefers-color-scheme`. Rarity accents are `--rarity-{normal,rare,superRare}` and `--relic-curse`. Always pair them with a text label, never color alone.
