# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Relic Index**: a searchable list of every Arknights Integrated Strategies (roguelike) relic, covering both the EN server and CN-only themes (with English translations). It's a static Next.js 16 site in `web/`. There's no backend or database.

(This repo used to be ArkPulls, a gacha pull tracker with an Express/Prisma API. It was removed in favour of the relic index. The last version with it is commit `1f54551`.)

`web/` has its own CLAUDE.md: Next 16 has breaking changes. Read `web/node_modules/next/dist/docs/` before writing Next-specific code.

## Commands (run in `web/`)

```bash
npm run dev                      # http://localhost:3000
npm run build                    # fully static output; also typechecks
npm run lint
node scripts/build-relics.mjs    # regenerate data/relics.json + icons from upstream game data
node scripts/build-relics.mjs --skip-icons --export-untranslated   # list CN text still needing translation
node scripts/apply-translations.mjs batch.json                       # merge a batch into data/translations.json
```

## Data

- `web/data/relics.json` and `web/public/relics/*.webp` are **generated, committed data**. Don't hand-edit them. Regenerate them with `scripts/build-relics.mjs`, which downloads `roguelike_topic_table.json` from Kengxxiao/ArknightsGameData_YoStar (EN, `en_US`) and Kengxxiao/ArknightsGameData (CN, `zh_CN`). You can pass local copies with `--en=` and `--cn=`. The EN repo stopped updating in Nov 2025; the CN one is current.
- CN is a superset of EN, so themes come from CN topics. EN themes use official EN text, plus `nameZh` for search. CN-only themes (`cnOnly`, currently rogue_5 and rogue_6) resolve each field in this order: (1) official EN text from any EN relic with the **identical** CN string (reprints; about 200 relics); (2) a fan translation in `web/data/translations.json`; (3) the raw Chinese, marked `translation: "partial"`. They also keep the original Chinese in `zh`.
- `web/data/translations.json` is **hand-maintained** (fan translations, plus CN-only theme names under `themes`). Each entry stores the exact Chinese it translates in `src`. If the game changes that text, the translation stops applying and the field shows up again in `--export-untranslated`. A translation also applies to every other relic with the same Chinese text. Edit it with `apply-translations.mjs`, not by hand. Match official EN terms: Squad Size Limit, Hope, Originium Ingot, Life Point, Objective Shield, Offensive/Defensive Recovery, and so on.
- The canonical relic list and numbering is each theme's **Collection archive** (`details[theme].archiveComp.relic.relic`, `orderId`), joined to `details[theme].items`. Items that aren't in the archive are internal/event-only and are deliberately skipped.
- Rarity `NORMAL/RARE/SUPER_RARE` maps to `normal/rare/superRare`. `subType` `CURSE`/`SECRET` maps to `kind`.
- Icons are resized to 128px WebP with `sharp`. Sources, in priority order: (1) hand-placed `web/scripts/icon-overrides/<relicId>.(png|webp|jpg)`, always applied; (2) the ArknightsAssets mirror (`cn` branch, `.../ui/rogueliketopic/itempic/<relicId>.png`), which stopped before the CN-only themes; (3) PRTS, `torappu.prts.wiki/assets/roguelike_topic_itempic/<relicId>.png`, which has every CN-only relic but is hosted in China and flaky from abroad, so the script uses concurrency 3 and retries; (4) Arknights Terra Wiki (arknights.wiki.gg) `File:<EN Relic Name>.png` (colons stripped) for whatever is still missing. Phantom's 6 "Reforged" relics and 4 Playwright's Manuscripts come from the wiki. Only missing icons are fetched. `--refresh-icons` re-fetches them all, and you need it after deleting an override. `--skip-icons` fetches nothing.
- IS numbering: `themeShort()` labels `rogue_N` as IS#(N+1), since IS#1 (Ceobe's Fungimist, CN-only) isn't in the data. So rogue_5 is IS#6 and rogue_6 is IS#7.
- Types live in `web/lib/relics.ts`. If you change the JSON shape, update the script and the types together.

## Frontend

- `app/page.tsx` is a server component that passes the bundled data to `components/RelicBrowser.tsx` (a client component). The browser reads `?theme=&q=` through `useSearchParams`, so it must stay inside the `<Suspense>` boundary in `page.tsx`.
- Colors are CSS custom properties in `web/app/globals.css`, with light and dark variants via `prefers-color-scheme`. Rarity accents are `--rarity-{normal,rare,superRare}` and `--relic-curse`. Always pair them with a text label, never color alone.
