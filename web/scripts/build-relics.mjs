// Regenerates web/data/relics.json from the public game-data dumps, and fetches
// relic icons into web/public/relics/<id>.webp.
//
// Text, per relic, in three languages (en / ja / zh):
//   zh  always (CN is a superset of the other servers)
//   ja  official JP text, for themes on the JP server
//   en  official EN text for themes on the EN server. For CN-only themes each field is
//       the official EN string when the exact same CN string exists in an EN theme
//       (reprinted relics), else the fan translation in data/translations.json, else
//       the untranslated Chinese (and `tl` says which).
//
// Icon sources, in priority order:
//   1. scripts/icon-overrides/<id>.(png|webp|jpg)  — hand-placed, always applied
//   2. ArknightsAssets game-asset mirror           — by relic id
//   3. PRTS (torappu.prts.wiki)                    — by relic id; has CN-only themes
//   4. Arknights Terra Wiki (arknights.wiki.gg)    — by EN relic name
//
// Usage: node scripts/build-relics.mjs [--en=file.json] [--ja=file.json] [--cn=file.json]
//                                      [--skip-icons] [--refresh-icons] [--export-untranslated]
//                                      [--prune-translations]
//   --en / --ja / --cn      local copies of roguelike_topic_table.json
//   --skip-icons            don't fetch anything; `icon` flags reflect files already on disk
//   --refresh-icons         re-download icons that already exist
//   --export-untranslated   write data/untranslated.json: CN strings with no EN text yet
//   --prune-translations    drop fan translations no relic uses any more
import { readFile, writeFile, mkdir, access, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// ArknightsAssets/ArknightsGamedata: every server, updated automatically from the game clients.
const GAMEDATA = "https://raw.githubusercontent.com/ArknightsAssets/ArknightsGamedata/master";
const TABLE = "gamedata/excel/roguelike_topic_table.json";
const SOURCES = { en: `${GAMEDATA}/en/${TABLE}`, ja: `${GAMEDATA}/jp/${TABLE}`, zh: `${GAMEDATA}/cn/${TABLE}` };

const ICON_SOURCE =
  "https://raw.githubusercontent.com/ArknightsAssets/ArknightsAssets/cn/assets/torappu/dynamicassets/arts/ui/rogueliketopic/itempic";
const PRTS_ICON_SOURCE = "https://torappu.prts.wiki/assets/roguelike_topic_itempic";
const ICON_DIR = new URL("../public/relics/", import.meta.url);
const DATA_DIR = new URL("../data/", import.meta.url);
const ICON_SIZE = 128;
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);

const RARITY = { NORMAL: "normal", RARE: "rare", SUPER_RARE: "superRare" };
// game field → our field
const FIELDS = { name: "name", usage: "effect", description: "flavor", unlockCondDesc: "unlock" };

async function load(local, url) {
  if (local) return JSON.parse(await readFile(local, "utf8"));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${url}`);
  return res.json();
}

// also strips rich-text tags like <@ba.vup>…</> in case a server leaves them in
const clean = (s) => (s ?? "").replace(/\\n/g, "\n").replace(/<[@$/][^>]*>/g, "").trim();
const kindOf = (item) => (item.subType === "CURSE" ? "curse" : item.subType === "SECRET" ? "secret" : "standard");
const textOf = (item) =>
  Object.fromEntries(Object.entries(FIELDS).map(([f, ours]) => [ours, clean(item?.[f]) || null]));

const [en, ja, cn] = await Promise.all([
  load(opt("en"), SOURCES.en),
  load(opt("ja"), SOURCES.ja),
  load(opt("cn"), SOURCES.zh),
]);
const translations = JSON.parse(
  await readFile(new URL("translations.json", DATA_DIR), "utf8").catch(() => '{"themes":{},"relics":{}}')
);

// CN string → official EN string, per field, learned from themes both servers have.
const official = Object.fromEntries(Object.keys(FIELDS).map((f) => [f, new Map()]));
for (const [themeId, enDetail] of Object.entries(en.details)) {
  const cnItems = cn.details[themeId]?.items ?? {};
  for (const [id, e] of Object.entries(enDetail.items)) {
    const c = cnItems[id];
    if (e.type !== "RELIC" || !c) continue;
    for (const f of Object.keys(FIELDS)) if (c[f] && e[f]) official[f].set(clean(c[f]), clean(e[f]));
  }
}

// CN string → fan translation, per field: a translation made for one relic also
// covers any other relic with the identical Chinese text (reprints across themes).
const fan = Object.fromEntries(Object.values(FIELDS).map((f) => [f, new Map()]));
for (const tl of Object.values(translations.relics ?? {}))
  for (const f of Object.values(FIELDS)) if (tl[f] && tl.src?.[f]) fan[f].set(tl.src[f], tl[f]);
const usedFan = new Set();

const archiveOf = (detail) =>
  Object.values(detail?.archiveComp?.relic?.relic ?? {}).filter((e) => detail.items[e.relicId]?.type === "RELIC");

const themes = [];
const relics = [];
const untranslated = {};

// CN is a superset of the other servers; iterate it so CN-only themes are included.
for (const [themeId, cnTopic] of Object.entries(cn.topics)) {
  const cnDetail = cn.details[themeId];
  const enDetail = en.details[themeId];
  const jaDetail = ja.details[themeId];
  const tName = translations.themes?.[themeId];
  themes.push({
    id: themeId,
    names: {
      en: enDetail ? en.topics[themeId].name : tName?.name ?? cnTopic.name,
      ...(jaDetail && { ja: ja.topics[themeId].name }),
      zh: cnTopic.name,
    },
    servers: ["zh", ...(jaDetail ? ["ja"] : []), ...(enDetail ? ["en"] : [])],
    ...(!enDetail && { enNameOfficial: Boolean(tName?.official) }),
  });

  // The in-game Collection archive is the canonical list and numbering;
  // items missing from it are internal/event-only entries.
  for (const entry of archiveOf(cnDetail)) {
    const id = entry.relicId;
    const item = cnDetail.items[id];
    const zh = textOf(item);
    let enText;
    if (enDetail?.items[id]) {
      enText = textOf(enDetail.items[id]);
    } else {
      // tl: "fan" (some fields are fan translations) or "partial" (some are still Chinese)
      let tl = null;
      enText = {};
      for (const [f, ours] of Object.entries(FIELDS)) {
        const src = zh[ours];
        if (!src) {
          enText[ours] = null;
        } else if (official[f].has(src)) {
          enText[ours] = official[f].get(src);
        } else if (fan[ours].has(src)) {
          enText[ours] = fan[ours].get(src);
          usedFan.add(`${ours}\0${src}`);
          tl ??= "fan";
        } else {
          enText[ours] = src;
          tl = "partial";
          (untranslated[id] ??= { theme: themeId })[ours] = src;
        }
      }
      if (tl) enText.tl = tl;
    }
    relics.push({
      id,
      theme: themeId,
      no: Number(entry.orderId),
      rarity: RARITY[item.rarity] ?? "normal",
      kind: kindOf(item),
      special: Boolean(entry.isSpRelic),
      text: { en: enText, ...(jaDetail?.items[id] && { ja: textOf(jaDetail.items[id]) }), zh },
    });
  }
}

// Fan translations that no relic uses any more (official text exists now, or the CN text changed).
const staleIds = Object.entries(translations.relics ?? {})
  .filter(([, tl]) => !Object.values(FIELDS).some((f) => tl.src?.[f] && usedFan.has(`${f}\0${tl.src[f]}`)))
  .map(([id]) => id);
if (staleIds.length)
  console.log(`${staleIds.length} fan translation(s) in data/translations.json are unused (--prune-translations removes them)`);
if (flag("--prune-translations") && staleIds.length) {
  for (const id of staleIds) delete translations.relics[id];
  await writeFile(new URL("translations.json", DATA_DIR), JSON.stringify(translations, null, 1) + "\n");
  console.log(`pruned ${staleIds.length} unused fan translation(s)`);
}

relics.sort((a, b) => a.theme.localeCompare(b.theme) || a.no - b.no);

const nUntranslated = Object.keys(untranslated).length;
if (nUntranslated) console.log(`${nUntranslated} CN-only relic(s) still have untranslated fields`);
if (flag("--export-untranslated")) {
  await writeFile(new URL("untranslated.json", DATA_DIR), JSON.stringify(untranslated, null, 1));
  console.log("wrote data/untranslated.json");
}

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
  if (!(r.theme in en.details) && !mirrorHasCnOnly) return;
  const png = await download(`${ICON_SOURCE}/${r.id}.png`);
  if (!png) return; // a few relics (Phantom "Reforged" + Playwright's Manuscripts) aren't there
  await writeIcon(r.id, png);
  r.icon = true;
}

// Source 3: PRTS asset host, file name = relic id. Hosted in mainland China and
// flaky from abroad, so: low concurrency, long timeouts, several retries.
async function fromPrts(r) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(`${PRTS_ICON_SOURCE}/${r.id}.png`, {
        headers: { "User-Agent": "relic-index-build-script/1.0" },
        signal: AbortSignal.timeout(60_000),
      });
      if (res.status === 404) return;
      if (res.ok) {
        await writeIcon(r.id, Buffer.from(await res.arrayBuffer()));
        r.icon = true;
        return;
      }
    } catch {
      // connect timeout / reset: retry
    }
    await sleep(2000 * (attempt + 1));
  }
  console.warn(`PRTS icon failed after retries: ${r.id}`);
}

// Source 4: Arknights Terra Wiki (arknights.wiki.gg), file name = relic name,
// e.g. "Playwright's Manuscript: Gaul" → File:Playwright's Manuscript Gaul.png
const WIKI_API = "https://arknights.wiki.gg/api.php";
const WIKI_HEADERS = { "User-Agent": "relic-index-build-script/1.0" };
const wikiTitle = (name) => `File:${name.replace(/[:#<>[\]|{}/]/g, "").replace(/\s+/g, " ").trim()}.png`;

async function fromWiki(missing) {
  for (let i = 0; i < missing.length; i += 50) {
    const batch = missing.slice(i, i + 50);
    const qs = new URLSearchParams({
      action: "query", prop: "imageinfo", iiprop: "url", format: "json",
      titles: batch.map((r) => wikiTitle(r.text.en.name)).join("|"),
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
      const t = wikiTitle(r.text.en.name);
      const url = urlByTitle.get(norm.get(t) ?? t);
      if (!url) continue;
      const img = await download(url, { headers: WIKI_HEADERS });
      if (!img) continue;
      await writeIcon(r.id, img);
      r.icon = true;
      console.log(`icon from wiki.gg: ${r.id} (${r.text.en.name})`);
      await sleep(250); // be polite to the wiki
    }
  }
}

// The mirror stopped updating before the CN-only themes; probe once instead of 500+ 404s.
const firstCnOnly = relics.find((r) => !(r.theme in en.details));
const mirrorHasCnOnly =
  !firstCnOnly || (await fetch(`${ICON_SOURCE}/${firstCnOnly.id}.png`, { method: "HEAD" })).ok;

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
  const notInMirror = relics.filter((r) => !r.icon);
  if (notInMirror.length) {
    console.log(`fetching ${notInMirror.length} icon(s) from PRTS...`);
    let n = 0;
    await pool(
      notInMirror,
      async (r) => {
        await fromPrts(r);
        if (++n % 50 === 0) console.log(`  PRTS ${n}/${notInMirror.length}`);
      },
      3
    );
  }
  // wiki.gg is looked up by EN name, so skip relics whose name is still Chinese
  const stillMissing = relics.filter((r) => !r.icon && r.text.en.tl !== "partial");
  if (stillMissing.length) await fromWiki(stillMissing);
}

for (const r of relics) delete r.overridden;
const noIcon = relics.filter((r) => !r.icon);
if (noIcon.length && !flag("--skip-icons")) {
  console.log(`no icon found for ${noIcon.length} relic(s) — drop an image in scripts/icon-overrides/<id>.png:`);
  for (const r of noIcon.slice(0, 25)) console.log(`  ${r.id}  ${r.text.en.name}`);
  if (noIcon.length > 25) console.log(`  …and ${noIcon.length - 25} more`);
}

await mkdir(new URL("../data/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../data/relics.json", import.meta.url),
  JSON.stringify({ sources: SOURCES, generatedAt: new Date().toISOString().slice(0, 10), themes, relics })
);
console.log(
  `${themes.length} themes, ${relics.length} relics, ${relics.filter((r) => r.icon).length} with icons`
);
