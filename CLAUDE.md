# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Relic Index**: every Arknights Integrated Strategies (roguelike) theme with its relics and its own mechanics (buffs, debuffs, special items), in EN / JP / CN, covering CN-only themes too (with English fan translations). It's a static Next.js 16 site in `web/`. There's no backend or database.

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
node scripts/build-mechanics.mjs # regenerate data/mechanics.json + mechanic icons + theme banners
node scripts/build-mechanics.mjs --skip-icons --export-untranslated  # list CN mechanic strings needing translation
```

## Data

- `web/data/relics.json` and `web/public/relics/*.webp` are **generated, committed data**. Don't hand-edit them. Regenerate them with `scripts/build-relics.mjs`, which downloads `roguelike_topic_table.json` for the EN, JP and CN servers from ArknightsAssets/ArknightsGamedata (`en/`, `jp/`, `cn/`; updated automatically from the game clients). You can pass local copies with `--en=`, `--ja=` and `--cn=`. (Kengxxiao/ArknightsGameData_YoStar stopped updating in Nov 2025, before IS#6 reached EN; don't switch back to it.)
- Every relic has `text.{en,ja?,zh}`. CN is a superset of the other servers, so themes and relics come from CN topics; `servers` lists where a theme is released. `ja` exists only for themes on the JP server (the UI falls back to EN with a "No JP text yet" tag). `en` is official for themes on the EN server. For themes not on EN (currently rogue_6) each field resolves in this order: (1) official EN text from any EN relic with the **identical** CN string (reprints); (2) a fan translation in `web/data/translations.json`; (3) the raw Chinese. `text.en.tl` is then `"fan"` or `"partial"`.
- `web/data/translations.json` is **hand-maintained** (fan translations, plus CN-only theme names under `themes`). Each entry stores the exact Chinese it translates in `src`. If the game changes that text, the translation stops applying and the field shows up again in `--export-untranslated`. A translation also applies to every other relic with the same Chinese text. Edit it with `apply-translations.mjs`, not by hand. Match official EN terms: Squad Size Limit, Hope, Originium Ingot, Life Point, Objective Shield, Offensive/Defensive Recovery, and so on. When a theme reaches EN, its fan translations go unused; the build reports them and `--prune-translations` removes them.
- The canonical relic list and numbering is each theme's **Collection archive** (`details[theme].archiveComp.relic.relic`, `orderId`), joined to `details[theme].items`. Items that aren't in the archive are internal/event-only and are deliberately skipped.
- Search (in `RelicBrowser.tsx`) covers name, effect, unlock and upgrade text in all three languages, but deliberately not the flavor text. `MechanicList.tsx` searches the same way (name, effect, stage text) and gives every grouped section filter chips, plus a Collection order / Name sort.
- **Difficulty upgrades** (IS#4 on): `details[theme].difficultyUpgradeRelicGroups` lists a base relic plus `_a/_b/_c` items (-α/-β/-γ) that replace it from difficulty grade 3/6/9 (`equivalentGrade`). They go on the base relic as `upgrades: [{id, grade, text}]`, with only name and effect (flavor/unlock are the base's). EN text uses the same resolution as relics. For CN-only themes, upgrade names are derived as `<EN base name> - α`, so only effects can ever need a fan translation (keyed by the upgrade's id).
- Rarity `NORMAL/RARE/SUPER_RARE` maps to `normal/rare/superRare`. `subType` `CURSE`/`SECRET` maps to `kind`.
- Icons are resized to 128px WebP with `sharp`. Sources, in priority order: (1) hand-placed `web/scripts/icon-overrides/<relicId>.(png|webp|jpg)`, always applied; (2) the ArknightsAssets mirror (`cn` branch, `.../ui/rogueliketopic/itempic/<relicId>.png`), which stopped before the CN-only themes; (3) PRTS, `torappu.prts.wiki/assets/roguelike_topic_itempic/<relicId>.png`, which has every CN-only relic but is hosted in China and flaky from abroad, so the script uses concurrency 3 and retries; (4) Arknights Terra Wiki (arknights.wiki.gg) `File:<EN Relic Name>.png` (colons stripped) for whatever is still missing. Phantom's 6 "Reforged" relics and 4 Playwright's Manuscripts come from the wiki. Only missing icons are fetched. `--refresh-icons` re-fetches them all, and you need it after deleting an override. `--skip-icons` fetches nothing.
- IS numbering: `themeShort()` labels `rogue_N` as IS#(N+1), since IS#1 (Ceobe's Fungimist, CN-only) isn't in the data. So rogue_5 is IS#6 and rogue_6 is IS#7.
- **Mechanics.** `scripts/build-mechanics.mjs` generates `data/mechanics.json`, icons in `public/mechanics/` and banners in `public/themes/<themeId>.webp`.
  - `data/mechanics-config.json` is **hand-maintained**. It lists each theme's sections as `{id, extract, kind, title, summary, groups?}`. The user tunes the titles and summaries there.
  - `extract` names an extractor in the script. Each one reads one Collection-archive tab or module: capsules, sanCheck, chaos, totems, fragments, disasters, wraths, coppers, weather, variations or scrap.
  - `kind` is `debuff`, `buff` or `mixed` (shown on the "Buffs & Debuffs" tab), or `item` (shown on the "Special Items" tab).
  - EN text for themes not on the EN server comes from the plain `strings` dictionary (CN string → EN) in `translations.json`. `--export-untranslated` writes untranslated strings to `data/untranslated-strings.json`.
  - Icon sources, in order: overrides in `scripts/icon-overrides/mechanics/<entryId>.png`, then item pictures (mirror, then PRTS), then Terra Wiki file-name patterns per section (`WIKI_FILES`), then PRTS wiki file names (`PRTS_FILES`: Mizuki's 启示/排异/回响 numbered in archive order, IS#7 `沉沦者的黑流树海 乌托邦幸福论 <CN name>.png`). prts.wiki often times out from abroad; just rerun.
  - Groups can carry an icon: an extractor sets `prtsIcon` (a PRTS file name) and it's saved as `public/mechanics/group-<sectionId>-<groupId>.webp`. IS#6 Tongbao are grouped by luck (`copperData[].luckyLevel`), in the order Dayan Tongbao (the base coin), Risk, Flower, Balance. They're not grouped by coin type.
  - Mizuki's 4 Light levels have no icon in the game, so they keep the letter placeholder.
  - Banners come from the wiki's `CN <EN theme name> banner.png`.
- Types live in `web/lib/relics.ts` and `web/lib/mechanics.ts`. If you change a JSON shape, update the script and the types together.

## Frontend

- **Routes.** Server pages pass each client component only the data it needs.
  - `/`: hub with one card per game mode. Modes are listed in `lib/modes.ts` (`MODES`, which also drives the top nav). Each mode lives under its own route prefix; add a new mode there plus its `app/<prefix>/` pages.
  - `/is`: Integrated Strategies home, theme cards (`HomeThemes`).
  - `/is/[n]`: one theme, by community IS number (2–7), statically generated. `ThemeView` shows Relics, Buffs & Debuffs and Special Items tabs, selected with `?tab=`.
  - `/is/relics`: all relics (`AllRelics`). The static segment wins over `[n]`.
  - `/stronghold`: Stronghold Protocol, a placeholder (`comingSoon` in `MODES`) until the mode is out on CN and has data.
  - Section pages start with `Crumbs` (breadcrumbs).
- **Language** lives in `components/lang.tsx`. `useLang()` reads `?lang=`, then localStorage. `setUrlParams()` only touches the params a component owns.
- Everything that uses `useSearchParams` must stay inside the page's `<Suspense>` boundary.
- Game text switches language. UI chrome (tabs, section titles, summaries) is English only.
- Colors are CSS custom properties in `web/app/globals.css`, with light and dark variants via `prefers-color-scheme`. Rarity accents are `--rarity-{normal,rare,superRare}` and `--relic-curse`. Always pair them with a text label, never color alone.
