# Rosmontis

Fan-made reference pages for Arknights game modes, in English, Japanese and Chinese.

- **Integrated Strategies**: every theme (CN-only ones included, with English fan translations) with its relics, difficulty upgrades, buffs, debuffs and special mechanic items. Searchable and filterable.
- **Stronghold Protocol**: coming soon.

```bash
cd web
npm install
npm run dev
```

Game data comes from [ArknightsGamedata](https://github.com/ArknightsAssets/ArknightsGamedata) (EN, JP and CN clients). To refresh it after a game update, run `node scripts/build-relics.mjs` and `node scripts/build-mechanics.mjs` in `web/`.

Fan-made, not affiliated with Hypergryph or Yostar.
