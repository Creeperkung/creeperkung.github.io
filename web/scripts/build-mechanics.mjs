// Regenerates web/data/mechanics.json: each IS theme's special mechanics (debuffs,
// buffs and mechanic items), taken from the in-game Collection archive tabs, in
// EN / JP / CN. Also fetches their icons into web/public/mechanics/<id>.webp and
// a banner per theme into web/public/themes/<themeId>.webp.
//
// Section titles, kinds and summaries are hand-written in data/mechanics-config.json.
// EN text for themes not on the EN server comes from the `strings` dictionary
// (CN string → fan translation) in data/translations.json.
//
// Icon sources, in priority order:
//   1. scripts/icon-overrides/mechanics/<id>.(png|webp|jpg)  — hand-placed, always applied
//   2. ArknightsAssets mirror / PRTS item pictures            — for entries that are items
//   3. Arknights Terra Wiki (arknights.wiki.gg)               — by per-section file name pattern
//
// Usage: node scripts/build-mechanics.mjs [--en=file.json] [--ja=file.json] [--cn=file.json]
//                                         [--skip-icons] [--refresh-icons] [--export-untranslated]
import { readFile, writeFile, mkdir, access, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const GAMEDATA = "https://raw.githubusercontent.com/ArknightsAssets/ArknightsGamedata/master";
const TABLE = "gamedata/excel/roguelike_topic_table.json";
const SOURCES = { en: `${GAMEDATA}/en/${TABLE}`, ja: `${GAMEDATA}/jp/${TABLE}`, zh: `${GAMEDATA}/cn/${TABLE}` };
const MIRROR_ITEMPIC =
  "https://raw.githubusercontent.com/ArknightsAssets/ArknightsAssets/cn/assets/torappu/dynamicassets/arts/ui/rogueliketopic/itempic";
const PRTS_ITEMPIC = "https://torappu.prts.wiki/assets/roguelike_topic_itempic";
const WIKI_API = "https://arknights.wiki.gg/api.php";
const PRTS_API = "https://prts.wiki/api.php";
const UA = { "User-Agent": "relic-index-build-script/1.0" };

const DATA_DIR = new URL("../data/", import.meta.url);
const ICON_DIR = new URL("../public/mechanics/", import.meta.url);
const BANNER_DIR = new URL("../public/themes/", import.meta.url);
const OVERRIDE_DIR = new URL("icon-overrides/mechanics/", import.meta.url);

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);

async function load(local, url) {
  if (local) return JSON.parse(await readFile(local, "utf8"));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${url}`);
  return res.json();
}

// strips rich-text markup: <@ba.vup>…</>, <$ba.x>…</>, <color=#…>…</color>
const clean = (s) =>
  (s ?? "")
    .replace(/\\n/g, "\n")
    .replace(/<(?:[@$][^>]*|color=[^>]*|\/[a-z]*)>/g, "")
    .trim() || null;
const vals = (o) => Object.values(o ?? {});

// ---------------------------------------------------------------------------
// Extractors. Each runs once per server and returns
//   { groups?: [{id, name}], entries: [{id, group?, positive?, sp?, iconId?, text}] }
// where text = { name, effect, flavor, levels?: [{label, effect}] }.
// Ids must be identical across servers so the languages can be merged.

const itemText = (it) => ({ name: clean(it.name), effect: clean(it.usage), flavor: clean(it.description) });

const EXTRACT = {
  // IS#2 Phantom: Plays (capsules)
  plays: (d) => ({
    entries: vals(d.details.rogue_1.archiveComp.capsule.capsule)
      .sort((a, b) => a.capsuleSortId - b.capsuleSortId)
      .map((c) => {
        const it = d.details.rogue_1.items[c.capsuleId];
        return { id: c.capsuleId, iconId: it.iconId, text: itemText(it) };
      }),
  }),
  // IS#2 Phantom: support devices brought into battle
  devices: (d) => ({
    entries: vals(d.details.rogue_1.archiveComp.trap.trap)
      .sort((a, b) => a.trapSortId - b.trapSortId)
      .map((t) => {
        const it = d.details.rogue_1.items[t.trapId];
        return { id: t.trapId, iconId: it.iconId, text: itemText(it) };
      }),
  }),
  // IS#3 Mizuki: Light levels
  light: (d) => ({
    entries: vals(d.modules.rogue_2.sanCheck.sanRanges)
      .sort((a, b) => b.sanMax - a.sanMax)
      .map((r, i) => {
        const m = /^<([^>]+)>\s*(.*)$/s.exec(r.description ?? "") ?? [null, r.description, null];
        return {
          id: `rogue_2_light_${i + 1}`,
          text: { name: clean(m[1]), effect: null, flavor: clean(m[2]) },
        };
      }),
  }),
  // IS#3 Mizuki: archive "buff" tab, split by group: 1 virtues, 2 rejections, 3 echoes
  mizukiBuffs: (group) => (d) => ({
    entries: vals(d.details.rogue_2.archiveComp.buff.buff)
      .filter((b) => b.buffGroupIndex === group)
      .sort((a, b) => a.innerSortId - b.innerSortId)
      .map((b) => ({ id: b.buffId, text: { name: clean(b.name), effect: clean(b.usage), flavor: clean(b.desc) } })),
  }),
  // IS#4 Expeditioner: Collapsal Paradigms (base + intensified level)
  collapse: (d) => {
    const data = d.modules.rogue_3.chaos.chaosDatas;
    return {
      entries: Object.keys(d.details.rogue_3.archiveComp.chaos.chaos).map((id, i) => {
        const base = data[id];
        const next = base.nextChaosId ? data[base.nextChaosId] : null;
        return {
          id,
          wikiNo: i + 1,
          text: {
            name: clean(base.name),
            effect: clean(base.functionDesc),
            flavor: clean(base.desc),
            ...(next && { levels: [{ label: clean(next.name), effect: clean(next.functionDesc) }] }),
          },
        };
      }),
    };
  },
  // IS#4 Expeditioner: Foldartals (totems), upper = location, lower = effect
  foldartals: (d) => {
    const items = d.details.rogue_3.items;
    return {
      // group names come from mechanics-config.json
      groups: [
        { id: "TOTEM_UPPER", name: null },
        { id: "TOTEM_LOWER", name: null },
      ],
      entries: vals(d.details.rogue_3.archiveComp.totem.totem)
        .filter((t) => items[t.id])
        .map((t) => ({ id: t.id, group: items[t.id].subType, iconId: items[t.id].iconId, text: itemText(items[t.id]) })),
    };
  },
  // IS#5 Sarkaz: Thoughts (fragments), grouped by type
  thoughts: (d) => {
    const mod = d.modules.rogue_4.fragment;
    const items = d.details.rogue_4.items;
    return {
      groups: vals(mod.fragmentTypeData).map((t) => ({ id: t.type, name: clean(t.typeName), note: clean(t.typeDesc) })),
      entries: vals(d.details.rogue_4.archiveComp.fragment.fragment)
        .sort((a, b) => a.sortId - b.sortId)
        .filter((f) => items[f.fragmentId])
        .map((f) => ({
          id: f.fragmentId,
          group: mod.fragmentData[f.fragmentId]?.type,
          iconId: items[f.fragmentId].iconId,
          text: itemText(items[f.fragmentId]),
        })),
    };
  },
  // IS#5 Sarkaz: Epochs (disasters), 3 levels each
  epochs: (d) => {
    const byType = new Map();
    for (const x of vals(d.modules.rogue_4.disaster.disasterData)) {
      if (!byType.has(x.type)) byType.set(x.type, []);
      byType.get(x.type).push(x);
    }
    return {
      entries: [...byType.entries()].map(([type, lv]) => {
        lv.sort((a, b) => a.level - b.level);
        return {
          id: type,
          text: {
            name: clean(lv[0].name),
            effect: null,
            flavor: clean(lv[0].desc),
            levels: lv.map((x) => ({ label: clean(x.levelName), effect: clean(x.functionDesc) })),
          },
        };
      }),
    };
  },
  // IS#6 Sui: Tongbao (coins), grouped by coin type
  tongbao: (d) => {
    const ac = d.details.rogue_5.archiveComp.copper;
    const items = d.details.rogue_5.items;
    return {
      groups: vals(ac.copperTypes).map((t) => ({ id: t.copperType, name: clean(t.typeName) })),
      entries: vals(ac.coppers)
        .filter((c) => c.archiveType === "COPPER" && items[c.displayCopperId])
        .sort((a, b) => a.sortId - b.sortId)
        .map((c) => {
          const it = items[c.displayCopperId];
          return { id: c.id, group: c.copperType, iconId: it.iconId, text: itemText(it) };
        }),
    };
  },
  // IS#6 Sui: Hours of Sui (wraths), 4 levels each
  hours: (d) => {
    const data = d.modules.rogue_5.wrath.wrathData;
    const groups = new Map();
    for (const w of vals(d.details.rogue_5.archiveComp.wrath.wraths)) {
      const x = data[w.wrathId];
      if (!x) continue;
      if (!groups.has(x.group)) groups.set(x.group, { sp: w.isSp, lv: [] });
      groups.get(x.group).lv.push(x);
    }
    return {
      entries: [...groups.entries()]
        .sort(([a], [b]) => Number(a.split("_").pop()) - Number(b.split("_").pop()))
        .map(([id, { sp, lv }]) => {
          lv.sort((a, b) => a.level - b.level);
          return {
            id,
            sp,
            text: {
              name: clean(lv[0].name),
              effect: null,
              flavor: clean(lv[0].desc),
              levels: lv.map((x) => ({ label: clean(x.levelName), effect: clean(x.functionDesc) })),
            },
          };
        }),
    };
  },
  // IS#7: weather (main, 3 levels each) and sub-weather
  weather: (d) => {
    const mod = d.modules.rogue_6.weather;
    const byType = new Map();
    for (const x of vals(mod.mainWeatherData)) {
      if (!byType.has(x.type)) byType.set(x.type, []);
      byType.get(x.type).push(x);
    }
    const main = [...byType.entries()]
      .sort(([a], [b]) => Number(a.split("_").pop()) - Number(b.split("_").pop()))
      .map(([type, lv]) => {
        lv.sort((a, b) => a.level - b.level);
        return {
          id: type,
          group: "main",
          positive: lv[0].isPositive,
          iconId: lv[0].iconId,
          text: {
            name: clean(lv[0].name),
            effect: null,
            flavor: clean(lv[0].desc),
            levels: lv.map((x) => ({ label: clean(x.levelName), effect: clean(x.functionDesc) })),
          },
        };
      });
    const sub = vals(mod.subWeatherData).map((x) => ({
      id: x.id,
      group: "sub",
      positive: x.isPositive,
      iconId: x.iconId,
      text: { name: clean(x.name), effect: clean(x.functionDesc), flavor: clean(x.desc) },
    }));
    return { groups: [{ id: "main", name: null }, { id: "sub", name: null }], entries: [...main, ...sub] };
  },
  // IS#7: floor variations
  variations: (d) => ({
    entries: vals(d.details.rogue_6.variationData).map((v) => ({
      id: `rogue_6_${v.id}`,
      iconId: v.iconId,
      text: { name: clean(v.outerName), effect: clean(v.functionDesc), flavor: clean(v.desc) },
    })),
  }),
  // IS#7: Scrap, grouped by type
  scrap: (d) => {
    const mod = d.modules.rogue_6.scrap;
    const items = d.details.rogue_6.items;
    return {
      groups: vals(mod.scrapTypeData).map((t) => ({ id: t.type, name: clean(t.typeName), note: clean(t.typeDesc) })),
      entries: vals(d.details.rogue_6.archiveComp.scrap.scraps)
        .sort((a, b) => a.sortId - b.sortId)
        .filter((s) => items[s.scrapId])
        .map((s) => ({
          id: s.scrapId,
          group: mod.scrapItemToType[s.scrapId],
          iconId: items[s.scrapId].iconId,
          text: itemText(items[s.scrapId]),
        })),
    };
  },
};

// Terra Wiki file-name patterns, from the EN name (wiki.gg only covers EN-server themes).
// drops quote marks around words (keeps apostrophes inside words: "Colli's")
const strip = (s) =>
  s
    .replace(/(^|\s)['"‘“]+/g, "$1")
    .replace(/['"’”]+(\s|$)/g, "$1")
    .replace(/[:#<>[\]|{}/]/g, "").replace(/\s+/g, " ").trim();
const WIKI_FILES = {
  plays: (e) => [`${strip(e.text.en.name)}.png`],
  devices: (e) => [`${strip(e.text.en.name)}.png`],
  collapse: (e) => [`IS4 Collapse Paradigm ${e.wikiNo}.png`],
  foldartals: (e) => [`Foldartal-${strip(e.text.en.name)}.png`],
  thoughts: (e) => [`Thought-${strip(e.text.en.name)}.png`, `${strip(e.text.en.name)}.png`],
  epochs: (e) => [`Epoch-${strip(e.text.en.name)}.png`],
  // EN names carry a luck prefix ("Risk-West Stones"); wiki files don't
  // EN names carry a luck prefix ("Risk-West Stones"); wiki files don't; "YAN" is "Yan" there
  tongbao: (e) => {
    const n = strip(e.text.en.name).replace(/^[A-Za-z]{2,6}-/, "");
    return [strip(e.text.en.name), n, n.replace(/\b([A-Z])([A-Z]+)\b/g, (_, a, b) => a + b.toLowerCase())].map((x) => `Tongbao-${x}.png`);
  },
  mizukiBuffs: (e) => [`${strip(e.text.en.name)}.png`],
  hours: (e) => [`Hour of Sui-${strip(e.text.en.name)}.png`],
};

// PRTS (prts.wiki) file names, for what neither item pictures nor the Terra Wiki have.
// (e, i) = entry and its 1-based position in the section; the Mizuki files are numbered
// in Collection-archive order (checked against 水月与深蓝之树/深蓝记录仪).
const MIZUKI_PRTS = { 1: "启示", 2: "排异", 3: "回响" }; // virtues, rejections, echoes; light levels have no icon
const PRTS_FILES = {
  mizukiBuffs: (e, i, group) => (MIZUKI_PRTS[group] ? [`集成战略 3 ${MIZUKI_PRTS[group]} ${i}.png`] : []),
  weather: (e) => [`沉沦者的黑流树海 乌托邦幸福论 ${e.text.zh.name}.png`],
  variations: (e) => [`沉沦者的黑流树海 乌托邦幸福论 ${e.text.zh.name}.png`],
};

// ---------------------------------------------------------------------------

const [EN, JA, CN] = await Promise.all([load(opt("en"), SOURCES.en), load(opt("ja"), SOURCES.ja), load(opt("cn"), SOURCES.zh)]);
const SERVERS = { en: EN, ja: JA, zh: CN };
const config = JSON.parse(await readFile(new URL("mechanics-config.json", DATA_DIR), "utf8"));
const translations = JSON.parse(await readFile(new URL("translations.json", DATA_DIR), "utf8"));
const fan = translations.strings ?? {};
const untranslated = new Set();

/** EN text for a theme not on the EN server: fan translation of each CN string. */
function translate(zh) {
  const tr = (s) => {
    if (s == null) return { v: null, ok: true };
    if (fan[s]) return { v: fan[s], ok: true };
    untranslated.add(s);
    return { v: s, ok: false };
  };
  let ok = true;
  const f = (s) => {
    const r = tr(s);
    ok &&= r.ok;
    return r.v;
  };
  const out = { name: f(zh.name), effect: f(zh.effect), flavor: f(zh.flavor) };
  if (zh.levels) out.levels = zh.levels.map((l) => ({ label: f(l.label), effect: f(l.effect) }));
  out.tl = ok ? "fan" : "partial";
  return out;
}

const themes = {};
for (const [themeId, sections] of Object.entries(config.themes)) {
  themes[themeId] = [];
  for (const sec of sections) {
    const fn = sec.extract.startsWith("mizukiBuffs:")
      ? EXTRACT.mizukiBuffs(Number(sec.extract.split(":")[1]))
      : EXTRACT[sec.extract];
    if (!fn) throw new Error(`unknown extractor ${sec.extract}`);
    const per = {};
    for (const [lang, d] of Object.entries(SERVERS)) if (d.details[themeId]) per[lang] = fn(d);
    const base = per.zh;
    const entries = base.entries.map((e) => {
      const text = { zh: e.text };
      for (const lang of ["en", "ja"]) {
        const other = per[lang]?.entries.find((x) => x.id === e.id);
        if (other) text[lang] = other.text;
      }
      if (!text.en) text.en = translate(e.text);
      return { ...e, text };
    });
    const groups = base.groups?.map((g) => {
      const name = {};
      for (const lang of ["en", "ja", "zh"]) {
        const og = per[lang]?.groups?.find((x) => x.id === g.id);
        if (og?.name) name[lang] = og.name;
      }
      const cfgName = sec.groups?.[g.id];
      if (cfgName) name.en = cfgName;
      else if (!name.en && name.zh) name.en = fan[name.zh] ?? (untranslated.add(name.zh), name.zh);
      const note = {};
      for (const lang of ["en", "ja", "zh"]) {
        const n = per[lang]?.groups?.find((x) => x.id === g.id)?.note;
        if (n) note[lang] = n;
      }
      if (!note.en && note.zh) note.en = fan[note.zh] ?? (untranslated.add(note.zh), note.zh);
      return { id: g.id, name, ...(note.en && { note }) };
    });
    themes[themeId].push({
      id: sec.id,
      title: sec.title,
      kind: sec.kind,
      summary: sec.summary ?? null,
      ...(groups && { groups }),
      entries: entries.map((e, i) => {
        const [kind, arg] = sec.extract.split(":");
        return { ...e, _wiki: WIKI_FILES[kind]?.(e) ?? [], _prts: PRTS_FILES[kind]?.(e, i + 1, Number(arg)) ?? [] };
      }),
    });
  }
}

if (untranslated.size) console.log(`${untranslated.size} CN string(s) without an EN translation`);
if (flag("--export-untranslated")) {
  await writeFile(new URL("untranslated-strings.json", DATA_DIR), JSON.stringify([...untranslated], null, 1));
  console.log("wrote data/untranslated-strings.json");
}

// ---------------------------------------------------------------------------
// Icons

const exists = (url) => access(url).then(() => true, () => false);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const all = Object.values(themes).flatMap((secs) => secs.flatMap((s) => s.entries));
const iconUrl = (id) => new URL(`${id}.webp`, ICON_DIR);

async function writeIcon(dest, input, size = 128) {
  await sharp(input)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 82 })
    .toFile(fileURLToPath(dest));
}

async function get(url, tries = 3, timeout = 30_000) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(timeout) });
      if (res.status === 404) return null;
      if (res.ok) return Buffer.from(await res.arrayBuffer());
    } catch {
      // retry
    }
    await sleep(1500 * (i + 1));
  }
  return null;
}

async function pool(items, fn, width = 6) {
  const q = [...items];
  await Promise.all(Array.from({ length: width }, async () => {
    for (let x; (x = q.shift()); ) await fn(x);
  }));
}

async function wikiUrls(files, api = WIKI_API) {
  const out = new Map();
  for (let i = 0; i < files.length; i += 50) {
    const batch = files.slice(i, i + 50);
    const qs = new URLSearchParams({
      action: "query", prop: "imageinfo", iiprop: "url", format: "json",
      titles: batch.map((f) => `File:${f}`).join("|"),
    });
    const body = await get(`${api}?${qs}`, 4, 60_000);
    if (!body) continue;
    const q = JSON.parse(body.toString()).query ?? {};
    const norm = new Map((q.normalized ?? []).map((n) => [n.from, n.to]));
    const byTitle = new Map(vals(q.pages).filter((p) => p.imageinfo?.[0]?.url).map((p) => [p.title, p.imageinfo[0].url]));
    for (const f of batch) {
      const t = `File:${f}`;
      const u = byTitle.get(norm.get(t) ?? t);
      if (u) out.set(f, u);
    }
  }
  return out;
}

await mkdir(ICON_DIR, { recursive: true });
await mkdir(BANNER_DIR, { recursive: true });
for (const e of all) e.icon = await exists(iconUrl(e.id));

if (!flag("--skip-icons")) {
  const refresh = flag("--refresh-icons");
  // 1. overrides
  const byId = new Map(all.map((e) => [e.id, e]));
  for (const f of await readdir(OVERRIDE_DIR).catch(() => [])) {
    const id = f.replace(/\.(png|webp|jpe?g)$/i, "");
    if (id === f) continue;
    if (!byId.has(id)) {
      console.warn(`override ignored, unknown id: ${f}`);
      continue;
    }
    await writeIcon(iconUrl(id), fileURLToPath(new URL(f, OVERRIDE_DIR)));
    Object.assign(byId.get(id), { icon: true, _override: true });
  }
  const todo = () => all.filter((e) => !e._override && (refresh ? !e._done : !e.icon));
  // 2. item pictures: mirror, then PRTS
  await pool(todo().filter((e) => e.iconId), async (e) => {
    const png = (await get(`${MIRROR_ITEMPIC}/${e.iconId}.png`)) ?? (await get(`${PRTS_ITEMPIC}/${e.iconId}.png`, 4, 60_000));
    if (!png) return;
    await writeIcon(iconUrl(e.id), png);
    Object.assign(e, { icon: true, _done: true });
  }, 3);
  // 3. Terra Wiki
  const want = todo().filter((e) => e._wiki.length);
  const urls = await wikiUrls([...new Set(want.flatMap((e) => e._wiki))]);
  for (const e of want) {
    const file = e._wiki.find((f) => urls.has(f));
    if (!file) continue;
    const img = await get(urls.get(file));
    if (!img) continue;
    await writeIcon(iconUrl(e.id), img);
    Object.assign(e, { icon: true, _done: true });
    await sleep(200);
  }
  // 4. PRTS wiki files
  const wantP = todo().filter((e) => e._prts.length);
  const pUrls = await wikiUrls([...new Set(wantP.flatMap((e) => e._prts))], PRTS_API);
  for (const e of wantP) {
    const file = e._prts.find((f) => pUrls.has(f));
    const img = file && (await get(pUrls.get(file), 4, 60_000));
    if (!img) continue;
    await writeIcon(iconUrl(e.id), img);
    Object.assign(e, { icon: true, _done: true });
    await sleep(200);
  }

  // Theme banners (Terra Wiki: "CN <EN theme name> banner.png")
  const relics = JSON.parse(await readFile(new URL("relics.json", DATA_DIR), "utf8"));
  const bannerFile = (t) => `CN ${strip(t.names.en).replace(/ǫ/g, "o")} banner.png`;
  const need = [];
  for (const t of relics.themes) if (refresh || !(await exists(new URL(`${t.id}.webp`, BANNER_DIR)))) need.push(t);
  const bUrls = await wikiUrls(need.map(bannerFile));
  for (const t of need) {
    const u = bUrls.get(bannerFile(t));
    const img = u && (await get(u));
    if (!img) {
      console.warn(`no banner for ${t.id} (${bannerFile(t)})`);
      continue;
    }
    await sharp(img).resize({ width: 960, withoutEnlargement: true }).webp({ quality: 80 }).toFile(fileURLToPath(new URL(`${t.id}.webp`, BANNER_DIR)));
    console.log(`banner: ${t.id}`);
  }
}

const banners = {};
for (const id of Object.keys(themes)) banners[id] = await exists(new URL(`${id}.webp`, BANNER_DIR));

for (const e of all) {
  delete e._wiki;
  delete e._prts;
  delete e._done;
  delete e._override;
  delete e.iconId;
  delete e.wikiNo;
}
const missing = all.filter((e) => !e.icon).length;
console.log(`${all.length} mechanic entries, ${all.length - missing} with icons`);

await writeFile(
  new URL("mechanics.json", DATA_DIR),
  JSON.stringify({ sources: SOURCES, generatedAt: new Date().toISOString().slice(0, 10), banners, themes })
);
