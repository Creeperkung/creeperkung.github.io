// Regenerates web/data/relics.json from the public EN game-data dump.
// Usage: node scripts/build-relics.mjs            (downloads the table)
//        node scripts/build-relics.mjs <file.json> (uses a local copy)
import { readFile, writeFile, mkdir } from "node:fs/promises";

const SOURCE =
  "https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData_YoStar/main/en_US/gamedata/excel/roguelike_topic_table.json";

const RARITY = { NORMAL: "normal", RARE: "rare", SUPER_RARE: "superRare" };

async function load() {
  const local = process.argv[2];
  if (local) return JSON.parse(await readFile(local, "utf8"));
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  return res.json();
}

const clean = (s) => (s ?? "").replace(/\\n/g, "\n").trim();

const table = await load();
const themes = [];
const relics = [];

for (const [themeId, topic] of Object.entries(table.topics)) {
  const detail = table.details[themeId];
  if (!detail) continue;
  themes.push({ id: themeId, name: topic.name });

  // The in-game Collection archive is the canonical list and numbering;
  // items missing from it are internal/event-only entries.
  const archive = Object.values(detail.archiveComp?.relic?.relic ?? {});
  for (const entry of archive) {
    const item = detail.items[entry.relicId];
    if (!item || item.type !== "RELIC") continue;
    relics.push({
      id: item.id,
      theme: themeId,
      no: Number(entry.orderId),
      name: clean(item.name),
      effect: clean(item.usage),
      flavor: clean(item.description),
      rarity: RARITY[item.rarity] ?? "normal",
      kind: item.subType === "CURSE" ? "curse" : item.subType === "SECRET" ? "secret" : "standard",
      special: Boolean(entry.isSpRelic),
      unlock: clean(item.unlockCondDesc) || null,
    });
  }
}

relics.sort((a, b) => a.theme.localeCompare(b.theme) || a.no - b.no);

await mkdir(new URL("../data/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../data/relics.json", import.meta.url),
  JSON.stringify({ source: SOURCE, generatedAt: new Date().toISOString().slice(0, 10), themes, relics })
);
console.log(`${themes.length} themes, ${relics.length} relics`);
