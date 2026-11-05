// Regenerates web/data/relics.json from the public EN game-data dump, and
// downloads relic icons into web/public/relics/<id>.webp.
// Usage: node scripts/build-relics.mjs [file.json] [--skip-icons] [--refresh-icons]
//   file.json        use a local copy of roguelike_topic_table.json
//   --skip-icons     don't touch icons; keep the existing `icon` flags from files on disk
//   --refresh-icons  re-download icons that already exist
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const SOURCE =
  "https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData_YoStar/main/en_US/gamedata/excel/roguelike_topic_table.json";

const ICON_SOURCE =
  "https://raw.githubusercontent.com/ArknightsAssets/ArknightsAssets/cn/assets/torappu/dynamicassets/arts/ui/rogueliketopic/itempic";
const ICON_DIR = new URL("../public/relics/", import.meta.url);
const ICON_SIZE = 128;
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);

const RARITY = { NORMAL: "normal", RARE: "rare", SUPER_RARE: "superRare" };

async function load() {
  const local = args.find((a) => !a.startsWith("--"));
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

const exists = (url) => access(url).then(() => true, () => false);

// Returns true if public/relics/<id>.webp exists after the call.
async function ensureIcon(id) {
  const out = new URL(`${id}.webp`, ICON_DIR);
  if (flag("--skip-icons") || (!flag("--refresh-icons") && (await exists(out)))) return exists(out);
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${ICON_SOURCE}/${id}.png`);
    if (res.status === 404) return false; // no icon upstream (a few early IS#1 relics)
    if (!res.ok) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      continue;
    }
    const png = Buffer.from(await res.arrayBuffer());
    await sharp(png)
      .resize(ICON_SIZE, ICON_SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 82 })
      .toFile(fileURLToPath(out));
    return true;
  }
  console.warn(`icon download failed: ${id}`);
  return exists(out);
}

await mkdir(ICON_DIR, { recursive: true });
let done = 0;
const queue = [...relics];
await Promise.all(
  Array.from({ length: 8 }, async () => {
    for (let r; (r = queue.shift()); ) {
      r.icon = await ensureIcon(r.id);
      if (++done % 100 === 0) console.log(`icons ${done}/${relics.length}`);
    }
  })
);

await mkdir(new URL("../data/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../data/relics.json", import.meta.url),
  JSON.stringify({ source: SOURCE, generatedAt: new Date().toISOString().slice(0, 10), themes, relics })
);
console.log(
  `${themes.length} themes, ${relics.length} relics, ${relics.filter((r) => r.icon).length} with icons`
);
