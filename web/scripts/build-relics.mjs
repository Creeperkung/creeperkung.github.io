// Regenerates web/data/relics.json from the public EN game-data dump, and
// fetches relic icons into web/public/relics/<id>.webp. Icon sources, in priority order:
//   1. scripts/icon-overrides/<id>.(png|webp|jpg)  — hand-placed, always applied
//   2. ArknightsAssets game-asset mirror           — by relic id
//   3. Arknights Terra Wiki (arknights.wiki.gg)    — by relic name, for anything still missing
// Usage: node scripts/build-relics.mjs [file.json] [--skip-icons] [--refresh-icons]
//   file.json        use a local copy of roguelike_topic_table.json
//   --skip-icons     don't fetch anything; `icon` flags reflect files already on disk
//   --refresh-icons  re-download icons that already exist
import { readFile, writeFile, mkdir, access, readdir } from "node:fs/promises";
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
const iconPath = (id) => new URL(`${id}.webp`, ICON_DIR);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function writeIcon(id, input) {
  await sharp(input)
    .resize(ICON_SIZE, ICON_SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 82 })
    .toFile(fileURLToPath(iconPath(id)));
}

/** Fetch with retries; returns the body, or null on 404 / repeated failure. */
async function download(url, init) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, init);
    if (res.status === 404) return null;
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    await sleep(1000 * (attempt + 1));
  }
  console.warn(`download failed: ${url}`);
  return null;
}

/** Runs fn over items with a small concurrency limit. */
async function pool(items, fn, width = 8) {
  const queue = [...items];
  await Promise.all(Array.from({ length: width }, async () => {
    for (let x; (x = queue.shift()); ) await fn(x);
  }));
}

// Source 1 (highest priority): hand-placed files in scripts/icon-overrides/<id>.(png|webp|jpg)
async function applyOverrides() {
  const dir = new URL("icon-overrides/", import.meta.url);
  const files = await readdir(dir).catch(() => []);
  const byId = new Map(relics.map((r) => [r.id, r]));
  for (const f of files) {
    const id = f.replace(/\.(png|webp|jpe?g)$/i, "");
    if (id === f) continue;
    if (!byId.has(id)) {
      console.warn(`override ignored, unknown relic id: ${f}`);
      continue;
    }
    await writeIcon(id, fileURLToPath(new URL(f, dir)));
    byId.get(id).icon = true;
    byId.get(id).overridden = true;
  }
}

// Source 2: game-asset mirror, file name = relic id.
async function fromAssetMirror(r) {
  const png = await download(`${ICON_SOURCE}/${r.id}.png`);
  if (!png) return; // a few relics (Phantom "Reforged" + Playwright's Manuscripts) aren't there
  await writeIcon(r.id, png);
  r.icon = true;
}

// Source 3: Arknights Terra Wiki (arknights.wiki.gg), file name = relic name,
// e.g. "Playwright's Manuscript: Gaul" → File:Playwright's Manuscript Gaul.png
const WIKI_API = "https://arknights.wiki.gg/api.php";
const WIKI_HEADERS = { "User-Agent": "relic-index-build-script/1.0" };
const wikiTitle = (name) => `File:${name.replace(/[:#<>[\]|{}/]/g, "").replace(/\s+/g, " ").trim()}.png`;

async function fromWiki(missing) {
  for (let i = 0; i < missing.length; i += 50) {
    const batch = missing.slice(i, i + 50);
    const qs = new URLSearchParams({
      action: "query", prop: "imageinfo", iiprop: "url", format: "json",
      titles: batch.map((r) => wikiTitle(r.name)).join("|"),
    });
    const body = await download(`${WIKI_API}?${qs}`, { headers: WIKI_HEADERS });
    if (!body) continue;
    const q = JSON.parse(body.toString()).query ?? {};
    const norm = new Map((q.normalized ?? []).map((n) => [n.from, n.to]));
    const urlByTitle = new Map(
      Object.values(q.pages ?? {})
        .filter((p) => p.imageinfo?.[0]?.url)
        .map((p) => [p.title, p.imageinfo[0].url])
    );
    for (const r of batch) {
      const t = wikiTitle(r.name);
      const url = urlByTitle.get(norm.get(t) ?? t);
      if (!url) continue;
      const img = await download(url, { headers: WIKI_HEADERS });
      if (!img) continue;
      await writeIcon(r.id, img);
      r.icon = true;
      console.log(`icon from wiki.gg: ${r.id} (${r.name})`);
      await sleep(250); // be polite to the wiki
    }
  }
}

await mkdir(ICON_DIR, { recursive: true });
for (const r of relics) r.icon = await exists(iconPath(r.id));

if (!flag("--skip-icons")) {
  await applyOverrides();
  const refresh = flag("--refresh-icons");
  const todo = relics.filter((r) => !r.overridden && (refresh || !r.icon));
  let done = 0;
  await pool(todo, async (r) => {
    await fromAssetMirror(r);
    if (++done % 100 === 0) console.log(`icons ${done}/${todo.length}`);
  });
  const stillMissing = relics.filter((r) => !r.icon);
  if (stillMissing.length) await fromWiki(stillMissing);
}

for (const r of relics) delete r.overridden;
const noIcon = relics.filter((r) => !r.icon);
if (noIcon.length) {
  console.log(`no icon found for ${noIcon.length} relic(s) — drop an image in scripts/icon-overrides/<id>.png:`);
  for (const r of noIcon) console.log(`  ${r.id}  ${r.name}`);
}

await mkdir(new URL("../data/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../data/relics.json", import.meta.url),
  JSON.stringify({ source: SOURCE, generatedAt: new Date().toISOString().slice(0, 10), themes, relics })
);
console.log(
  `${themes.length} themes, ${relics.length} relics, ${relics.filter((r) => r.icon).length} with icons`
);
