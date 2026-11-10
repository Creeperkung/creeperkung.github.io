// Regenerates web/data/stronghold.json: Stronghold Protocol (卫戍协议 / 堅守協定, data id
// "autochess") in EN / JP / CN, one block per season, plus icons in web/public/stronghold/<id>.webp.
//
// DRAFT. The mode's tables (activity_table.json → autoChessData) only ever hold the current
// season and are emptied once an event ends, so each season is read from mirror commits pinned
// while its data was there (SEASONS below). Adding a season = a new SEASONS entry.
//
// Sources:
//   client data   alliance / strategy names, strategy unlock text, bosses, enemy types, and the
//                 equipment's names, Base / Advanced effects (skill_table) and flavor text
//   PRTS          each season's record page: the operator pool with traits, alliance and
//                 strategy effects, and which equipment is in the season (CN)
//   Terra Wiki    (arknights.wiki.gg) the same tables for seasons that ran on EN, in the EN
//                 client's wording: paired with PRTS row by row (same operator / alliance /
//                 strategy) they give official EN for each CN string
// EN text for a CN string: official (EN client, or a Terra Wiki pair) wherever the identical CN
// string has one, then translations.json `strings` (fan, tl "fan"), else CN (tl "partial").
//
// Icons (the mode's own UI icons aren't in the asset mirror):
//   operators and strategies → the operator's avatar; bosses → the enemy portrait (mirror, then
//   PRTS); equipment → PRTS "卫戍协议 道具 <名称>.png"; alliances and enemy types → letter
//   placeholder. Hand-placed files in scripts/icon-overrides/stronghold/<id>.(png|webp|jpg)
//   always win. Icons are shared by every season (same id = same picture).
//
// Hand-filled operator data: data/stronghold-operators.json, edited with scripts/stronghold-editor.html
// (open it in Chrome or Edge). Its entries override, extend or remove operators of one season.
//
// Usage: node scripts/build-stronghold.mjs [--skip-icons] [--refresh-icons] [--skip-prts] [--export-untranslated]
//   --skip-prts: no PRTS / Terra Wiki requests; use data/stronghold-prts.json (the cached pages)
import { readFile, writeFile, mkdir, access, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const MIRROR = "https://raw.githubusercontent.com/ArknightsAssets/ArknightsGamedata";
const CN_REGULATION = "b1031d1035e8df3042f601e33d5c1dfab8345d59"; // 2026-11-08, 规程 opened
const CN_ALLIANCE = "30b826bb86dfae590ab63c23c6878f687c1d8545"; // 2026-04-01, during act2autochess
const GLOBAL = "409bce70516f2420af61b1fc5680da60e448ab99"; // EN/JP 2026-10-28, during 盟约 there
// Character and enemy names (avatars, official EN/JP operator names): the newest pins.
const NAME_PINS = { zh: [CN_REGULATION, "cn"], en: [GLOBAL, "en"], ja: [GLOBAL, "jp"] };
// One entry per season, oldest first.
//   pins: server → [mirror commit, folder] from while the season was in activity_table. A server
//     without a pin hasn't had the season.
//   pages: PRTS season records, oldest first; the last one gives the operator pool. `en` is the
//     Terra Wiki page with the same tables in official EN, for seasons that ran on EN.
//   names: display names the game data doesn't give; endOverride: the real end when the client says 2099.
const SEASONS = [
  {
    id: "alliance",
    zh: "盟约",
    pins: { zh: [CN_ALLIANCE, "cn"], en: [GLOBAL, "en"], ja: [GLOBAL, "jp"] },
    pages: [
      { prts: "卫戍协议：盟约/PRTS盟约记录", en: "Stronghold Protocol Alliance/Strategies" },
      { prts: "卫戍协议：盟约 下半/PRTS盟约记录", en: "Stronghold Protocol Alliance Part 2/Strategies" },
    ],
    // still read (its EN wiki pages are where the official EN wording comes from), not on the site
    publish: false,
  },
  {
    id: "regulation",
    zh: "规程",
    names: { en: "Regulation" }, // the CN event's own subtitle: STRONGHOLD PROTOCOL: REGULATION
    pins: { zh: [CN_REGULATION, "cn"] },
    pages: [{ prts: "卫戍协议·规程/PRTS盟约记录" }],
    endOverride: { zh: "2027-11-07T03:59:59+08:00" }, // PRTS; the client says 2099
    // PRTS file of the season's launch banner → public/stronghold/banner-<id>.webp
    banner: "活动预告 感谢庆典2026 33.JPG",
  },
];
const NEWEST = SEASONS.at(-1).id;
const ASSETS = "https://raw.githubusercontent.com/ArknightsAssets/ArknightsAssets/cn/assets/torappu/dynamicassets/arts";
const PRTS_ENEMY = "https://torappu.prts.wiki/assets/enemy_icon";
const PRTS_API = "https://prts.wiki/api.php";
const WIKI_API = "https://arknights.wiki.gg/api.php";
const UA = { "User-Agent": "relic-index-build-script/1.0" };

const DATA_DIR = new URL("../data/", import.meta.url);
const ICON_DIR = new URL("../public/stronghold/", import.meta.url);
const OVERRIDE_DIR = new URL("icon-overrides/stronghold/", import.meta.url);

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const LANGS = ["en", "ja", "zh"];

const downloads = new Map(); // one download per commit/folder/file
function table([sha, dir], file) {
  const url = `${MIRROR}/${sha}/${dir}/gamedata/excel/${file}`;
  if (!downloads.has(url))
    downloads.set(
      url,
      fetch(url).then((res) => {
        if (!res.ok) throw new Error(`Download failed: ${res.status} ${url}`);
        return res.json();
      }),
    );
  return downloads.get(url);
}

const clean = (s) =>
  (s ?? "")
    .replace(/\\n/g, "\n")
    .replace(/<(?:[@$][^>]*|color=[^>]*|\/[a-z]*)>/g, "")
    .trim() || null;
const vals = (o) => Object.values(o ?? {});
const exists = (url) => access(url).then(() => true, () => false);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

console.log("downloading activity, character, skill and enemy tables…");
const NAMES = {}; // lang → {chars, enemies}
await Promise.all(
  LANGS.map(async (l) => {
    const [chars, enemies] = await Promise.all([
      table(NAME_PINS[l], "character_table.json"),
      table(NAME_PINS[l], "enemy_handbook_table.json"),
    ]);
    NAMES[l] = { chars, enemies: enemies.enemyData ?? enemies };
  }),
);
for (const S of SEASONS) {
  S.T = {}; // lang → {act, ac, chars, skills}, only for servers that had the season
  await Promise.all(
    Object.entries(S.pins).map(async ([l, pin]) => {
      const [act, chars, skills] = await Promise.all([
        table(pin, "activity_table.json"),
        table(pin, "character_table.json"),
        table(pin, "skill_table.json"),
      ]);
      if (!vals(act.autoChessData?.bondInfoDict).length)
        throw new Error(`${S.id} ${l}: autoChessData is empty at the pinned commit; pin one from during an event`);
      S.T[l] = { act, ac: act.autoChessData, chars, skills };
    }),
  );
}
const CHARS = NAMES.zh.chars;

const playable = (k) => /^char_\d+_/.test(k) && !CHARS[k].isNotObtainable;
const charKeys = Object.keys(CHARS).filter((k) => /^char_\d+_/.test(k));
const charByZh = (name) =>
  charKeys.filter((k) => CHARS[k].name === name).sort((x, y) => playable(y) - playable(x))[0];
const enCharKeys = Object.keys(NAMES.en.chars).filter((k) => /^char_\d+_/.test(k));
const charByEn = (name) => enCharKeys.find((k) => NAMES.en.chars[k].name === name);
// operators not on EN yet take a fan name from translations.json `strings` (read below)
const namesOf = (charId, zh) => {
  const out = Object.fromEntries(
    LANGS.flatMap((l) => (charId && NAMES[l].chars[charId] ? [[l, NAMES[l].chars[charId].name]] : l === "zh" ? [[l, zh]] : [])),
  );
  if (!out.en && fanNames[out.zh]) out.en = fanNames[out.zh];
  return out;
};
let fanNames = {};

// ---------------------------------------------------------------------------
// Wikitext (PRTS and Terra Wiki)

async function wikitext(api, title) {
  const u = new URL(api);
  for (const [k, v] of Object.entries({ action: "parse", page: title, prop: "wikitext", format: "json", redirects: "1" }))
    u.searchParams.set(k, v);
  for (let i = 0; i < 4; i++) {
    try {
      const j = await (await fetch(u, { headers: UA, signal: AbortSignal.timeout(90_000) })).json();
      if (j.error) throw new Error(j.error.code);
      return j.parse.wikitext["*"];
    } catch (e) {
      console.log(`  ${new URL(api).host} ${title}: ${e.message}, retrying…`);
      await sleep(3000 * (i + 1));
    }
  }
  return null;
}

/** {{name|a|k=v}} calls in `text` (whitespace allowed before the first "|"), brace-balanced. */
function templateCalls(text, name) {
  const out = [];
  const re = new RegExp(`\\{\\{${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\|`, "g");
  for (let m; (m = re.exec(text)); ) {
    let depth = 0;
    let j = m.index;
    for (; j < text.length; j++) {
      if (text.startsWith("{{", j)) {
        depth++;
        j++;
      } else if (text.startsWith("}}", j)) {
        depth--;
        j++;
        if (!depth) break;
      }
    }
    out.push({ at: m.index, body: text.slice(m.index + m[0].length, j - 1) });
    re.lastIndex = j;
  }
  return out;
}
/** Split template args on top-level "|" into {key: value}. */
function templateArgs(body) {
  const args = {};
  let depth = 0;
  let start = 0;
  const push = (s) => {
    const k = s.indexOf("=");
    if (k > 0) args[s.slice(0, k).trim()] = s.slice(k + 1).trim();
  };
  for (let i = 0; i < body.length; i++) {
    if (body.startsWith("{{", i) || body.startsWith("[[", i)) {
      depth++;
      i++;
    } else if (body.startsWith("}}", i) || body.startsWith("]]", i)) {
      depth--;
      i++;
    } else if (body[i] === "|" && depth === 0) {
      push(body.slice(start, i));
      start = i + 1;
    }
  }
  push(body.slice(start));
  return args;
}
/** Replace innermost {{name|…}} templates with their n-th positional argument (0 = drop). */
function unwrap(s, keep) {
  let t = s;
  for (let prev; prev !== t; ) {
    prev = t;
    t = t.replace(/\{\{([^{}|]+)\|([^{}]*)\}\}/g, (m, name, rest) => {
      const n = keep[name.trim()];
      if (n === undefined) return m;
      return n ? (rest.split("|").filter((p) => !/^[\w一-鿿]+=/.test(p))[n - 1] ?? "") : "";
    });
  }
  return t;
}
const wikiCommon = (t) =>
  t
    .replace(/<nowiki>(.*?)<\/nowiki>/g, "$1")
    .replace(/&times;/g, "×")
    .replace(/&nbsp;/g, " ")
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<hr\s*\/?>/g, "\n")
    .replace(/<ref[^>]*\/>|<ref[^>]*>.*?<\/ref>|<references[^>]*\/>/gs, "")
    .replace(/<\/?(?:span|div|small|big|sup|sub|u|b|i)[^>]*>/g, "")
    .replace(/<!--.*?-->/gs, "")
    .replace(/[ \t]+\n/g, "\n");
/** PRTS wikitext → plain text: {{color|#x|t}} → t, {{术语|id|t}} → t, {{修正|t|…}} → t, [[a|b]] → b, <br> → newline. */
const PRTS_TEMPLATES = { color: 2, 发光: 2, 术语: 2, 修正: 1, 变动数值: 1, 异常效果: 1 };
const wikiPlain = (s) => (s ? clean(wikiCommon(unwrap(s, PRTS_TEMPLATES))) : null);
/** Terra Wiki wikitext → plain text: {{Color|t|…}} → t, {{E|name}} → name. */
const enPlain = (s) => (s ? clean(wikiCommon(unwrap(s, { Color: 1, E: 1, I: 1 })).replace(/ {2,}/g, " ")) : null);

const TIERS = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ"];
const TRAIT_TYPES = { 作战能力: "combat", 单次叠加: "stackOnce", 持续叠加: "stackOngoing", 整备能力: "prep", 特异化: "special" };
// operator row template; PRTS renamed it from {{/参战干员}} in Nov 2026
const OP_TEMPLATES = ["卫戍协议/参战干员", "/参战干员"];

/** One PRTS season record → plain rows (CN names; ids are resolved later). */
function parsePrts(title, w) {
  const start = w.indexOf("==干员数据库==");
  if (start < 0) throw new Error(`${title}: no 干员数据库 section; the page layout changed`);
  const end = w.indexOf("\n==", start + 2);
  const section = w.slice(start, end > 0 ? end : undefined);
  // tier headings "{{color|#…|Ⅲ}}阶干员" mark where each tier starts
  const heads = [...section.matchAll(/\|([ⅠⅡⅢⅣⅤⅥ])\}\}阶干员/g)].map((m) => ({ at: m.index, tier: TIERS.indexOf(m[1]) + 1 }));
  const operators = OP_TEMPLATES.flatMap((t) => templateCalls(section, t))
    .sort((x, y) => x.at - y.at)
    .map(({ at, body }) => {
      const a = templateArgs(body);
      return {
        tier: heads.filter((h) => h.at < at).pop()?.tier ?? 0,
        zh: wikiPlain(a["干员"]),
        prototype: a["原型"] ? wikiPlain(a["原型"]).replace(/\(卫戍协议\)|（卫戍协议）/, "") : null,
        alliances: ["盟约1", "盟约2", "盟约3"].map((k) => wikiPlain(a[k])).filter(Boolean),
        traitType: a["特质类型"] ?? null,
        base: wikiPlain(a["特质1"]),
        elite: wikiPlain(a["特质2"]),
      };
    });
  if (!operators.length) throw new Error(`${title}: no operator rows; the page layout changed`);
  // the alliance report (S.W.E.E.P.盟约报告): which alliances are in the season, and their effects
  const alliances = templateCalls(w, "卫戍协议/盟约").map(({ body }) => {
    const a = templateArgs(body);
    return { name: wikiPlain(a["盟约"]), need: Number(a["人数"]) || null, effect: wikiPlain(a["效果"]) };
  });
  const strategies = templateCalls(w, ":卫戍协议/策略").map(({ body }) => {
    const a = templateArgs(body);
    return {
      initiator: wikiPlain(a["发起人"]),
      // the leader's portrait is File:卫戍协议<season> 策略发起人 <发起人>.png, or `icon` when set
      season: a["season"] ?? null,
      icon: a["icon"] ?? null,
      name: wikiPlain(a["策略"]),
      hp: Number(a["血量"]) || null,
      effect: wikiPlain(a["效果"]),
    };
  });
  const items = templateCalls(w, ":卫戍协议/道具").map(({ body }) => {
    const a = templateArgs(body);
    return {
      type: a["类型"] === "法术" ? "arts" : "equipment",
      tier: Number(a["等阶"]) || null,
      name: wikiPlain(a["名称"]),
      price: Number(a["售价"]) || null,
      effect: wikiPlain(a["效果"]),
    };
  });
  return { operators, alliances, strategies, items };
}

/** One Terra Wiki season tables page (official EN) → rows. */
function parseEnWiki(w) {
  const arg = (body, k) => templateArgs(body)[k];
  return {
    attributes: templateCalls(w, "SP Attributes").map(({ body }) => ({
      operator: enPlain(arg(body, "operator")),
      base: enPlain(arg(body, "attribute1")),
      elite: enPlain(arg(body, "attribute2")),
    })),
    alliances: templateCalls(w, "SP Alliances").map(({ body }) => ({
      name: enPlain(arg(body, "alliance")),
      effect: enPlain(arg(body, "description")),
    })),
    strategies: templateCalls(w, "SP Strategies cell")
      .filter(({ body }) => !arg(body, "table"))
      .map(({ body }) => ({ name: enPlain(arg(body, "name")), effect: enPlain(arg(body, "effect")) })),
  };
}

// The parsed pages are cached in data/stronghold-prts.json (generated), so offline rebuilds
// (--skip-prts, or a wiki timing out) start from wiki data, not from an earlier merged result:
// removing a hand-filled entry then really removes its changes.
const PAGE_CACHE = new URL("stronghold-prts.json", DATA_DIR);
const cache = await readFile(PAGE_CACHE, "utf8").then(JSON.parse, () => ({}));
cache.prts ??= {};
cache.enWiki ??= {};
let cacheChanged = false;
async function page(kind, title) {
  const [api, parse, store] =
    kind === "prts" ? [PRTS_API, (w) => parsePrts(title, w), cache.prts] : [WIKI_API, parseEnWiki, cache.enWiki];
  const w = flag("--skip-prts") ? null : await wikitext(api, title);
  if (w) {
    store[title] = { fetchedAt: new Date().toISOString(), ...parse(w) };
    cacheChanged = true;
  } else if (store[title]) console.log(`  ${title}: using the cached copy from ${store[title].fetchedAt.slice(0, 10)}`);
  else throw new Error(`${title}: unreachable and not in data/stronghold-prts.json yet: rerun without --skip-prts`);
  return store[title];
}
for (const S of SEASONS) {
  S.pages = await Promise.all(
    S.pages.map(async (p) => ({ ...p, data: await page("prts", p.prts), enData: p.en ? await page("en", p.en) : null })),
  );
  S.prtsData = S.pages.at(-1).data;
}
if (cacheChanged) {
  // keep only the pages SEASONS still uses
  const used = new Set(SEASONS.flatMap((S) => S.pages.flatMap((p) => [p.prts, p.en])));
  for (const store of [cache.prts, cache.enWiki]) for (const k of Object.keys(store)) if (!used.has(k)) delete store[k];
  await writeFile(PAGE_CACHE, JSON.stringify({ prts: cache.prts, enWiki: cache.enWiki }, null, 1) + "\n");
}

// ---------------------------------------------------------------------------
// Official CN → EN / JP strings, from everything both servers had: the client tables (same id,
// same field) and the Terra Wiki pages paired with PRTS row by row. A CN-only season then reuses
// official text wherever its CN string is identical.

const OFFICIAL = { en: new Map(), ja: new Map() };
const pair = (l, zh, other) => {
  if (zh && other) OFFICIAL[l].set(zh, other);
};
const FIELDS = {
  bondInfoDict: (x) => [x.name],
  bandDataDict: (x) => [x.bandName, x.unlockDesc],
  enemyTypeDatas: (x) => [x.name, x.description],
};
const isItem = (k) => /_ac(arm|spell)\d/.test(k);
for (const S of SEASONS)
  for (const l of ["en", "ja"]) {
    if (!S.T[l]) continue;
    for (const [dict, get] of Object.entries(FIELDS))
      for (const [id, x] of Object.entries(S.T.zh.ac[dict] ?? {})) {
        const y = S.T[l].ac[dict]?.[id];
        if (y) get(x).forEach((zh, i) => pair(l, clean(zh), clean(get(y)[i])));
      }
    // equipment: name, flavor and the Base / Advanced effect of each item
    for (const [id, c] of Object.entries(S.T.zh.chars)) {
      const o = S.T[l].chars[id];
      if (!isItem(id) || !o) continue;
      pair(l, clean(c.name), clean(o.name));
      pair(l, clean(c.itemDesc), clean(o.itemDesc));
      for (const sk of c.skills ?? []) {
        const a = S.T.zh.skills[sk.skillId]?.levels[0];
        const b = S.T[l].skills[sk.skillId]?.levels[0];
        if (a && b) pair(l, clean(a.description), clean(b.description));
      }
    }
  }
// Terra Wiki ↔ PRTS, joined on the operator / alliance / strategy
for (const S of SEASONS) {
  if (!S.T.en) continue;
  const enBond = Object.fromEntries(vals(S.T.en.ac.bondInfoDict).map((b) => [clean(b.name), b.bondId]));
  const enBands = vals(S.T.en.ac.bandDataDict);
  for (const { data, enData } of S.pages) {
    if (!enData) continue;
    for (const a of enData.attributes) {
      const id = charByEn(a.operator);
      const op = id && data.operators.find((o) => charByZh(o.zh) === id);
      if (!op) continue;
      pair("en", op.base, a.base);
      pair("en", op.elite, a.elite);
    }
    for (const a of enData.alliances) {
      const zh = clean(S.T.zh.ac.bondInfoDict[enBond[a.name]]?.name);
      pair("en", data.alliances.find((x) => x.name === zh)?.effect, a.effect);
    }
    for (const s of enData.strategies) {
      const band = enBands.find((b) => clean(b.bandName) === s.name);
      const zh = band && clean(S.T.zh.ac.bandDataDict[band.bandId]?.bandName);
      const row = zh && data.strategies.find((x) => x.initiator === zh);
      const m = s.effect?.match(/^\[([^\]]+)\]\s*([\s\S]*)$/);
      if (!row || !m) continue;
      pair("en", row.name, m[1]);
      pair("en", row.effect, m[2]);
    }
  }
}
console.log(`official EN strings: ${OFFICIAL.en.size}`);

const translations = JSON.parse(await readFile(new URL("translations.json", DATA_DIR), "utf8"));
const fan = translations.strings ?? {};
fanNames = fan;
const untranslated = new Set();

/** EN / JP for one CN string: {text, fan?} or null. CN-only "被动效果：" prefixes are translated on their own. */
function tr(l, zh) {
  if (!zh) return null;
  if (OFFICIAL[l].has(zh)) return { text: OFFICIAL[l].get(zh) };
  if (l === "en" && fan[zh]) return { text: fan[zh], fan: true };
  const m = zh.match(/^(被动效果|主动效果)：([\s\S]+)$/);
  if (l === "en" && m) {
    const rest = tr(l, m[2]);
    return rest && { text: `${m[1] === "被动效果" ? "Passive" : "Active"}: ${rest.text}`, fan: true };
  }
  return null;
}

/**
 * Text for every language from the CN text. `client[l]` holds fields the season's own client
 * data gives on that server (always wins); other fields are translated with tr(). EN fills gaps
 * with CN (tl "partial"); JP fills gaps with the EN text, so its names stay Japanese.
 */
function localize(zh, client = {}, alt = {}) {
  const out = { zh };
  for (const l of ["en", "ja"]) {
    let fanUsed = false;
    let missing = false;
    const field = (key, value) => {
      if (client[l]?.[key] != null) return client[l][key];
      if (!value) return value ?? null;
      const t = tr(l, value) ?? (key === "name" && alt[l] ? { text: alt[l] } : null);
      if (t) {
        fanUsed ||= Boolean(t.fan);
        return t.text;
      }
      missing = true;
      if (l === "en") untranslated.add(value);
      return l === "en" ? value : (out.en?.[key] ?? value);
    };
    const t = { name: field("name", zh.name), effect: field("effect", zh.effect), flavor: field("flavor", zh.flavor) };
    if (zh.levels)
      t.levels = zh.levels.map((lv, i) => ({
        label: { en: ["Base", "Advanced"], ja: ["基本", "強化"] }[l][i] ?? lv.label,
        effect: (() => {
          if (!lv.effect) return null;
          const x = tr(l, lv.effect);
          if (x) {
            fanUsed ||= Boolean(x.fan);
            return x.text;
          }
          missing = true;
          if (l === "en") untranslated.add(lv.effect);
          return l === "en" ? lv.effect : out.en.levels[i].effect;
        })(),
      }));
    if (l === "en") {
      if (missing) t.tl = "partial";
      else if (fanUsed) t.tl = "fan";
    }
    // JP with nothing of its own (no client text, no translation) is left out: the UI shows EN
    if (l === "ja" && !client.ja && missing && !Object.keys(client).length) continue;
    out[l] = t;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Per-season entries. Same shape as data/mechanics.json entries, so MechanicList renders them.

function buildSeason(S) {
  const CN = S.T.zh;
  const P = S.prtsData;
  const pinned = (l) => (S.T[l] ? [l] : []);
  /** client fields per server that had the season: {en: {...}, ja: {...}} */
  const fromClient = (pick) =>
    Object.fromEntries(["en", "ja"].flatMap(pinned).flatMap((l) => {
      const x = pick(S.T[l]);
      return x ? [[l, x]] : [];
    }));

  // Season: every activity sharing one seasonName (盟约 = act1autochess + act2autochess)
  const ids = [...new Set(vals(CN.ac.versionInfoDict).filter((v) => v.seasonName === S.zh).map((v) => v.activityId))];
  if (!ids.length) throw new Error(`${S.id}: no versionInfoDict entry with seasonName ${S.zh}`);
  const runs = ids.map((id) => ({
    id,
    dates: Object.fromEntries(
      LANGS.flatMap((l) => {
        const b = S.T[l]?.act.basicInfo[id];
        if (!b) return [];
        const end = S.endOverride?.[l] ? Date.parse(S.endOverride[l]) / 1000 : b.endTime;
        return [[l, { start: b.startTime, end }]];
      }),
    ),
  }));
  // Display names: the activity name "卫戍协议:盟约" → its subtitle "盟约"
  const names = {
    ...S.names,
    ...Object.fromEntries(
      LANGS.flatMap((l) => {
        const b = S.T[l]?.act.basicInfo[runs[0].id];
        return b ? [[l, b.name.split(/[:：·]\s*/).pop()]] : [];
      }),
    ),
    zh: S.zh,
  };
  const servers = LANGS.filter((l) => runs.some((r) => r.dates[l]));

  // Alliances (盟约, "bonds" in the data): faction (SEASON) and sub-faction (REGULAR), in
  // bondOrder. The client keeps alliances that sit a season out (Laterano in 规程): only the
  // ones in the season's PRTS alliance report are kept. Effects come from that report.
  const report = new Map(P.alliances.map((a) => [a.name, a]));
  const dropped = vals(CN.ac.bondInfoDict).filter((b) => !report.has(clean(b.name)));
  if (dropped.length) console.log(`${S.id}: alliances not in this season (PRTS): ${dropped.map((b) => b.name).join(", ")}`);
  const bonds = vals(CN.ac.bondInfoDict)
    .filter((b) => report.has(clean(b.name)))
    .sort((a, b) => (a.bondType === b.bondType ? a.bondOrder - b.bondOrder : a.bondType === "SEASON" ? -1 : 1))
    .map((b) => {
      const r = report.get(clean(b.name));
      return {
        id: b.bondId,
        group: b.bondType === "SEASON" ? "faction" : "sub",
        stats: r.need ? [{ key: "need", value: r.need }] : undefined,
        text: localize(
          { name: clean(b.name), effect: r.effect, flavor: null },
          fromClient((s) => s.ac.bondInfoDict[b.bondId] && { name: clean(s.ac.bondInfoDict[b.bondId].name) }),
        ),
      };
    });

  // Strategies: named after an operator. Match bandIconId icon_<x> ↔ character key char_<n>_<x>,
  // else the operator's CN name (prefer playable operators over NPC copies). The effect is
  // PRTS's "【sub-name】effect"; the unlock condition (client) goes in the flavor line.
  const charFor = (b) => {
    const suffix = b.bandIconId?.replace(/^icon_/, "");
    return charKeys.find((k) => k.endsWith(`_${suffix}`)) ?? charByZh(b.bandName);
  };
  const usedRows = new Set();
  const bands = vals(CN.ac.bandDataDict).map((b) => {
    const charId = charFor(b);
    const row = P.strategies.find((r) => r.initiator === clean(b.bandName) && !usedRows.has(r));
    if (row) usedRows.add(row);
    const sub = row?.name && { zh: row.name, en: tr("en", row.name), ja: tr("ja", row.name) };
    const zh = {
      name: clean(b.bandName),
      effect: row?.effect ?? null,
      flavor: clean(b.unlockDesc),
    };
    const text = localize(
      zh,
      fromClient((s) => s.ac.bandDataDict[b.bandId] && {
        name: clean(s.ac.bandDataDict[b.bandId].bandName),
        flavor: clean(s.ac.bandDataDict[b.bandId].unlockDesc),
      }),
      // a strategy named exactly after its operator takes the operator's official name
      charId && CHARS[charId].name === b.bandName ? namesOf(charId, b.bandName) : {},
    );
    // sub-name in front of the effect: 【众志合一】… / [Wills As One] …
    if (sub && text.zh.effect) {
      text.zh = { ...text.zh, effect: `【${sub.zh}】${text.zh.effect}` };
      if (text.en?.effect) {
        if (!sub.en) {
          untranslated.add(sub.zh);
          text.en.tl = "partial";
        } else if (sub.en.fan && !text.en.tl) text.en.tl = "fan";
        text.en.effect = `[${sub.en?.text ?? sub.zh}] ${text.en.effect}`;
      }
      if (text.ja?.effect) text.ja.effect = `[${sub.ja?.text ?? sub.en?.text ?? sub.zh}] ${text.ja.effect}`;
    }
    // strategies led by an NPC (no character avatar): PRTS's leader portrait
    const leader = row?.initiator ?? clean(b.bandName);
    const prtsFiles = [
      ...(row?.icon ? [row.icon] : []),
      ...[row?.season, "：盟约", "·规程", `·${S.zh}`, `：${S.zh}`].filter(Boolean).map((s) => `卫戍协议${s} 策略发起人 ${leader}.png`),
    ];
    return { id: b.bandId, charId, prtsFiles, stats: row?.hp ? [{ key: "hp", value: row.hp }] : undefined, text };
  });
  const missingRows = P.strategies.filter((r) => !usedRows.has(r)).map((r) => r.initiator);
  if (missingRows.length) console.log(`${S.id}: PRTS strategies with no client strategy: ${missingRows.join(", ")}`);
  const noChar = bands.filter((b) => !b.charId).map((b) => b.id);
  if (noChar.length) console.log(`${S.id}: strategies with no matching operator (no avatar): ${noChar.join(", ")}`);

  // Equipment and Arts: PRTS says which are in the season; text comes from the client
  // (character_table name / itemDesc, skill_table _1 = Base and _2 = Advanced). A few CN names
  // exist twice (reworked items): pick the id whose Base effect matches PRTS.
  const itemIds = Object.keys(CN.chars).filter(isItem);
  const skillText = (id, i) => clean(CN.skills[CN.chars[id].skills?.[i]?.skillId]?.levels[0].description);
  const prtsLevels = (e) => {
    const [base, adv] = (e ?? "").split(/【进阶】/);
    return [base.replace(/^【基础】/, "").trim(), adv?.trim() ?? null];
  };
  const loose = (s) => (s ?? "").replace(/[\s，。,.（）()]/g, "");
  const items = P.items.flatMap((r) => {
    const cands = itemIds.filter((k) => clean(CN.chars[k].name) === r.name);
    if (!cands.length) {
      console.log(`  ${S.id}: no client item for ${r.name}`);
      return [];
    }
    const [base] = prtsLevels(r.effect);
    const id = cands.find((k) => loose(skillText(k, 0)) === loose(base)) ?? cands.at(-1);
    const c = CN.chars[id];
    const zh = {
      name: clean(c.name),
      effect: null,
      flavor: clean(c.itemDesc),
      levels: [skillText(id, 0), skillText(id, 1)].filter(Boolean).map((effect, i) => ({ label: ["基础", "进阶"][i], effect })),
    };
    const client = fromClient((s) => s.chars[id] && { name: clean(s.chars[id].name), flavor: clean(s.chars[id].itemDesc) });
    const text = localize(zh, client);
    // client levels on servers that had the season
    for (const l of ["en", "ja"].flatMap(pinned)) {
      const sk = S.T[l].chars[id]?.skills ?? [];
      const lv = sk.map((x) => clean(S.T[l].skills[x.skillId]?.levels[0].description));
      if (text[l]?.levels && lv.every(Boolean) && lv.length === text[l].levels.length)
        text[l].levels = text[l].levels.map((x, i) => ({ ...x, effect: lv[i] }));
    }
    return [
      {
        id,
        name: r.name,
        group: r.type === "arts" ? "arts" : `tier${r.tier ?? Number(c.rarity?.replace("TIER_", ""))}`,
        stats: r.price ? [{ key: "price", value: r.price }] : undefined,
        text,
      },
    ];
  });

  // Bosses: names from the enemy handbook, which every server has; "_2" ids are the stronger
  // second-half variants
  // effect = the handbook's ability list (one line each); a TITLE line ("隐秘核心" / "Hidden
  // Core") starts a labelled block. The lore description becomes the flavor text.
  const abilities = (lines) => {
    const out = { effect: [], levels: [] };
    for (const a of lines ?? []) {
      const t = clean(a.text);
      if (!t) continue;
      if (a.textFormat === "TITLE") out.levels.push({ label: t, effect: [] });
      else (out.levels.at(-1)?.effect ?? out.effect).push(t);
    }
    return {
      effect: out.effect.join("\n") || null,
      levels: out.levels.length ? out.levels.map((x) => ({ label: x.label, effect: x.effect.join("\n") || null })) : undefined,
    };
  };
  const enemyText = (l, id) => {
    const E = NAMES[l].enemies;
    const e = E[id] ?? E[id.replace(/_\d+$/, "")];
    if (!e) return null;
    const ab = e.abilityList?.length ? abilities(e.abilityList) : { effect: clean(e.ability) };
    return { name: clean(e.name), ...ab, flavor: clean(e.description), lines: e.abilityList };
  };
  // fan EN for enemies not on EN yet, translated line by line
  const fanEnemy = (zh, lines) => {
    let fanUsed = false;
    let missing = false;
    const one = (s) => {
      const t = tr("en", s);
      if (t) {
        fanUsed ||= Boolean(t.fan);
        return t.text;
      }
      missing = true;
      untranslated.add(s);
      return s;
    };
    const en = abilities((lines ?? []).map((a) => ({ ...a, text: clean(a.text) && one(clean(a.text)) })));
    const t = { name: one(zh.name), ...en, flavor: zh.flavor && one(zh.flavor) };
    if (missing) t.tl = "partial";
    else if (fanUsed) t.tl = "fan";
    return t;
  };
  const bosses = vals(CN.ac.bossInfoDict)
    .sort((a, b) => Number(a.bossId.split("_")[1]) - Number(b.bossId.split("_")[1]))
    .map((b) => {
      const text = Object.fromEntries(LANGS.flatMap((l) => (enemyText(l, b.handbookEnemyId) ? [[l, enemyText(l, b.handbookEnemyId)]] : [])));
      if (!text.en) text.en = fanEnemy(text.zh, text.zh.lines);
      for (const t of Object.values(text)) delete t.lines;
      if (!text.ja) delete text.ja;
      return { id: b.bossId, enemyId: b.enemyId, handbookEnemyId: b.handbookEnemyId, sp: /_\d+$/.test(b.enemyId) || undefined, text };
    });

  const enemyTypes = vals(CN.ac.enemyTypeDatas)
    .sort((a, b) => a.sortId - b.sortId)
    .map((e) => ({
      id: `enemytype_${e.type.toLowerCase()}`,
      // File:特训敌人_特异.png for "特训敌人·特异"
      prtsFiles: [`特训敌人_${clean(e.name).split(/[·・]/).pop()}.png`],
      text: localize(
        { name: clean(e.name), effect: clean(e.description), flavor: null },
        fromClient((s) => s.ac.enemyTypeDatas[e.type] && { name: clean(s.ac.enemyTypeDatas[e.type].name), effect: clean(s.ac.enemyTypeDatas[e.type].description) }),
      ),
    }));

  return { meta: { id: S.id, names, servers, runs }, bonds, bands, items, bosses, enemyTypes };
}

// ---------------------------------------------------------------------------
// Operators: the PRTS pool (last page of the season), names matched to character_table for
// official EN/JP names and avatars. Trait EN: official where the CN string has a pair, else fan.

// Operators that take part in a different form than their character_table entry: the class and
// art come from the form (char_patch_table), the names stay those of the base character.
const FORMS = {
  阿米娅: { art: "char_1037_amiya3", profession: "MEDIC" }, // Medic Amiya
};

function poolOf(S) {
  const bondByZh = Object.fromEntries(vals(S.T.zh.ac.bondInfoDict).map((b) => [clean(b.name), b.bondId]));
  const ops = S.prtsData.operators.map((r) => {
    const charId = charByZh(r.zh);
    const protoId = r.prototype && charByZh(r.prototype);
    const unknown = r.alliances.filter((b) => !bondByZh[b]);
    if (unknown.length) console.log(`  ${S.id} ${r.zh}: unknown alliance ${unknown.join(", ")}`);
    const form = FORMS[r.zh];
    return {
      id: charId ?? `op_${r.zh}`,
      charId,
      artId: form?.art,
      tier: r.tier,
      profession: form?.profession ?? (charId ? CHARS[charId].profession : protoId ? CHARS[protoId].profession : null),
      names: namesOf(charId, r.zh),
      prototype: r.prototype ? { id: protoId ?? null, names: namesOf(protoId, r.prototype) } : undefined,
      alliances: r.alliances.map((b) => bondByZh[b]).filter(Boolean),
      traitType: TRAIT_TYPES[r.traitType] ?? "combat",
      trait: { zh: { base: r.base, elite: r.elite } },
    };
  });
  const noChar = ops.filter((o) => !o.charId).map((o) => o.names.zh);
  if (noChar.length) console.log(`${S.id}: operators with no character_table match: ${noChar.join(", ")}`);
  return ops;
}
/** trait.en from official / fan text; set after hand-filled entries so their CN edits count. */
function translateTrait(o) {
  if (o.trait.en && o.manualEn) return;
  const b = tr("en", o.trait.zh.base);
  const e = tr("en", o.trait.zh.elite);
  if (b && (!o.trait.zh.elite || e)) {
    o.trait.en = { base: b.text, elite: e?.text ?? null };
    if (b.fan || e?.fan) o.trait.tl = "fan";
  } else for (const s of [o.trait.zh.base, o.trait.zh.elite]) if (s) untranslated.add(s);
}

// Hand-filled operators (scripts/stronghold-editor.html writes this file). Each entry belongs to
// one season (`season`, default the newest) and is matched to that season's PRTS operator by
// `id`, else by CN name; its non-empty fields win. Unmatched entries are added as new operators
// and `removed: true` drops one. Re-applying is harmless, so --skip-prts rebuilds stay correct.
const MANUAL_FILE = new URL("stronghold-operators.json", DATA_DIR);
const manual = await readFile(MANUAL_FILE, "utf8").then(JSON.parse, () => ({ operators: [] }));
const PROFESSIONS = new Set(["PIONEER", "WARRIOR", "TANK", "SNIPER", "CASTER", "MEDIC", "SUPPORT", "SPECIAL"]);
for (const m of manual.operators ?? [])
  if (m.season && !SEASONS.some((S) => S.id === m.season))
    console.log(`  stronghold-operators.json: unknown season "${m.season}" (${m.names?.zh ?? m.id})`);

function applyManual(S, pool) {
  let operators = structuredClone(pool);
  const entries = (manual.operators ?? []).filter((m) => (m.season ?? NEWEST) === S.id);
  const allianceIds = new Set(vals(S.T.zh.ac.bondInfoDict).map((b) => b.bondId));
  let added = 0;
  const removedIds = new Set();
  for (const m of entries) {
    const zh = m.names?.zh?.trim();
    if (!zh && !m.id) continue;
    let o = operators.find((x) => (m.id && x.id === m.id) || (zh && x.names.zh === zh));
    // removed: true drops the operator from the pool (e.g. one PRTS lists by mistake)
    if (m.removed) {
      if (o) removedIds.add(o.id);
      else console.log(`  ${S.id} ${zh ?? m.id}: marked removed but not in the pool`);
      continue;
    }
    if (!o) {
      const charId = (m.id && CHARS[m.id] ? m.id : null) ?? (zh && charByZh(zh)) ?? null;
      o = {
        id: charId ?? `op_${zh}`,
        charId,
        tier: 0,
        profession: charId ? CHARS[charId].profession : null,
        names: namesOf(charId, zh ?? m.id),
        alliances: [],
        traitType: "combat",
        trait: { zh: { base: null, elite: null } },
      };
      operators.push(o);
      added++;
    }
    o.manual = true;
    if (m.tier >= 1 && m.tier <= 6) o.tier = m.tier;
    if (PROFESSIONS.has(m.profession)) o.profession = m.profession;
    for (const l of LANGS) if (m.names?.[l]?.trim()) o.names = { ...o.names, [l]: m.names[l].trim() };
    if (m.alliances?.length) {
      const bad = m.alliances.filter((a) => !allianceIds.has(a));
      if (bad.length) console.log(`  ${S.id} ${o.names.zh}: unknown alliance ${bad.join(", ")} in stronghold-operators.json`);
      o.alliances = m.alliances.filter((a) => allianceIds.has(a));
    }
    if (TRAIT_TYPES[m.traitType] || Object.values(TRAIT_TYPES).includes(m.traitType))
      o.traitType = TRAIT_TYPES[m.traitType] ?? m.traitType;
    if (m.prototype?.zh?.trim() || m.prototype?.en?.trim()) {
      const pZh = m.prototype.zh?.trim() || o.prototype?.names.zh || m.prototype.en.trim();
      const pId = charByZh(pZh) ?? null;
      o.prototype = { id: pId, names: { ...namesOf(pId, pZh), ...(m.prototype.en?.trim() ? { en: m.prototype.en.trim() } : {}) } };
    }
    const t = m.trait?.zh;
    if (t?.base?.trim() || t?.elite?.trim())
      o.trait.zh = { base: t.base?.trim() || o.trait.zh.base || null, elite: t.elite?.trim() || o.trait.zh.elite || null };
    const en = m.trait?.en;
    if (en?.base?.trim() || en?.elite?.trim()) {
      translateTrait(o); // fill the half the entry leaves out
      o.trait.en = { base: en.base?.trim() || o.trait.en?.base || null, elite: en.elite?.trim() || o.trait.en?.elite || null };
      delete o.trait.tl;
      o.manualEn = true;
    }
  }
  operators = operators.filter((o) => !removedIds.has(o.id));
  if (entries.length)
    console.log(`${S.id}: stronghold-operators.json ${entries.length} entries applied (${added} new, ${removedIds.size} removed)`);
  for (const o of operators) {
    translateTrait(o);
    delete o.manualEn;
  }
  return operators;
}

const built = SEASONS.map((S) => ({ S, ...buildSeason(S), operators: applyManual(S, poolOf(S)) }));

// ---------------------------------------------------------------------------
// Icons (shared by every season)

const iconUrl = (id) => new URL(`${id}.webp`, ICON_DIR);

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
const writeIcon = (dest, input) =>
  sharp(input)
    .resize(128, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 82 })
    .toFile(fileURLToPath(dest));
/** Operator portraits keep their 1:2 shape: 180x360 WebP. */
const writePortrait = (dest, input) =>
  sharp(input)
    .resize(180, 360, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 80 })
    .toFile(fileURLToPath(dest));
/** A dark-on-white icon (PRTS class icons) → white glyph on transparent, like the alliance emblems. */
async function writeGlyph(dest, input) {
  // the tile has a line down each side (outer ~8%) and a shadow bar along the bottom (~17%)
  const { width: w, height: h } = await sharp(input).metadata();
  const crop = { left: Math.round(w * 0.09), top: 0, width: Math.round(w * 0.82), height: Math.round(h * 0.82) };
  const alpha = await sharp(input)
    .extract(crop)
    .flatten({ background: "#ffffff" })
    .greyscale()
    .negate()
    .resize(128, 128, { fit: "contain", background: "#000000" })
    .raw()
    .toBuffer();
  await sharp({ create: { width: 128, height: 128, channels: 3, background: "#ffffff" } })
    .joinChannel(alpha, { raw: { width: 128, height: 128, channels: 1 } })
    .webp({ quality: 90 })
    .toFile(fileURLToPath(dest));
}
/** File name → direct URL on a MediaWiki, 50 per request. */
async function fileUrls(files, api) {
  const out = new Map();
  for (let i = 0; i < files.length; i += 50) {
    const batch = files.slice(i, i + 50);
    const qs = new URLSearchParams({ action: "query", prop: "imageinfo", iiprop: "url", format: "json", titles: batch.map((f) => `File:${f}`).join("|") });
    const body = await get(`${api}?${qs}`, 4, 60_000);
    if (!body) continue;
    const q = JSON.parse(body.toString()).query ?? {};
    const norm = new Map((q.normalized ?? []).map((n) => [n.from, n.to]));
    const byTitle = new Map(vals(q.pages).filter((p) => p.imageinfo?.[0]?.url).map((p) => [p.title, p.imageinfo[0].url]));
    for (const f of batch) {
      const u = byTitle.get(norm.get(`File:${f}`) ?? `File:${f}`);
      if (u) out.set(f, u);
    }
  }
  return out;
}

const avatar = (c) => [`${ASSETS}/charavatars/${c}.png`, `https://torappu.prts.wiki/assets/char_avatar/${c}.png`];
// E2 portrait (180x360 half-body), falling back to the base one for operators with no E2
const portrait = (c) =>
  ["2", "1"].flatMap((n) => [`${ASSETS}/charportraits/${c}_${n}.png`, `https://torappu.prts.wiki/assets/char_portrait/${c}_${n}.png`]);
// icons only for seasons on the site (an unpublished season is still read for its EN wording)
const published = built.filter(({ S }) => S.publish !== false);
const sources = new Map(
  published.flatMap(({ bands, operators, bosses }) => [
    ...bands.filter((b) => b.charId).map((b) => [b.id, avatar(b.charId)]),
    ...operators
      .map((o) => [o.id, o.charId ?? (o.id.startsWith("char_") ? o.id : null), o.artId])
      .filter(([, c]) => c)
      .flatMap(([id, c, art]) => [
        [id, avatar(c)],
        [`portrait-${id}`, art ? [...portrait(art), ...portrait(c)] : portrait(c)],
      ]),
    ...bosses.map((b) => [
      b.id,
      [`${ASSETS}/enemies/${b.handbookEnemyId}.png`, `${ASSETS}/enemies/${b.enemyId}.png`, `${PRTS_ENEMY}/${b.enemyId}.png`],
    ]),
  ]),
);
// PRTS file names to try, for entries with no avatar / enemy portrait: equipment, alliance
// icons (File:卫戍协议：盟约_icon_<bondId>.png), NPC strategy leaders, enemy types
const prtsFiles = new Map();
for (const { bonds, bands, items, enemyTypes } of published) {
  for (const e of items) prtsFiles.set(e.id, [`卫戍协议 道具 ${e.name}.png`]);
  for (const e of bonds) prtsFiles.set(e.id, [`卫戍协议：盟约_icon_${e.id}.png`]);
  for (const e of [...bands.filter((b) => !b.charId), ...enemyTypes])
    prtsFiles.set(e.id, [...new Set([...(prtsFiles.get(e.id) ?? []), ...e.prtsFiles])]);
}
// class icons for the operator cards: public/stronghold/class-<PROFESSION>.webp (white)
const PROFESSION_ZH = { PIONEER: "先锋", WARRIOR: "近卫", TANK: "重装", SNIPER: "狙击", CASTER: "术师", MEDIC: "医疗", SUPPORT: "辅助", SPECIAL: "特种" };
for (const [p, zh] of Object.entries(PROFESSION_ZH)) prtsFiles.set(`class-${p}`, [`图标_职业_${zh}_大图_白.png`]);

if (!flag("--skip-icons")) {
  await mkdir(ICON_DIR, { recursive: true });
  const overrides = await readdir(OVERRIDE_DIR).catch(() => []);
  for (const f of overrides) {
    const m = f.match(/^(.+)\.(png|webp|jpg)$/);
    if (m) await writeIcon(iconUrl(m[1]), fileURLToPath(new URL(f, OVERRIDE_DIR)));
  }
  const overridden = new Set(overrides.map((f) => f.replace(/\.\w+$/, "")));
  const want = async (id) => !overridden.has(id) && (flag("--refresh-icons") || !(await exists(iconUrl(id))));
  // PRTS file pages → direct URLs (the first name that exists wins)
  const fileTodo = [];
  for (const [id, files] of prtsFiles) if (await want(id)) fileTodo.push([id, files]);
  if (fileTodo.length) {
    const urls = await fileUrls([...new Set(fileTodo.flatMap(([, f]) => f))], PRTS_API);
    for (const [id, files] of fileTodo) {
      const found = files.filter((f) => urls.has(f)).map((f) => urls.get(f));
      if (found.length) sources.set(id, found);
      else console.log(`  no PRTS file for ${id} (${files.join(" / ")})`);
    }
  }
  const todo = [];
  for (const [id, urls] of sources) if (await want(id)) todo.push([id, urls]);
  console.log(`fetching ${todo.length} icons…`);
  const q = [...todo];
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (let x; (x = q.shift()); ) {
        const [id, urls] = x;
        let buf = null;
        for (const u of urls) if ((buf = await get(u))) break;
        if (buf && id.startsWith("class-")) await writeGlyph(iconUrl(id), buf);
        else if (buf && id.startsWith("portrait-")) await writePortrait(iconUrl(id), buf);
        else if (buf) await writeIcon(iconUrl(id), buf);
        else console.log(`  no icon for ${id}`);
      }
    }),
  );
}

const withIcon = async (list) =>
  Promise.all(
    list.map(async (e) => {
      const { id, group, sp, stats, text } = e; // drop build-only fields (charId, enemyId, …)
      const portrait = (await exists(iconUrl(`portrait-${id}`))) || undefined;
      return { id, group, sp, stats, text, icon: await exists(iconUrl(id)), portrait };
    }),
  );

// ---------------------------------------------------------------------------
// Sections (titles and summaries are hand-written here; it's a draft)

const tierGroups = TIERS.map((n, i) => ({ id: `tier${i + 1}`, name: { en: `Tier ${n}`, zh: `${n}阶` } }));
const seasons = [];
for (const { S, meta, bonds, bands, items, bosses, enemyTypes, operators } of built) {
  if (S.publish === false) continue;
  // season banner (card art and page backdrop), from its PRTS file
  const bannerUrl = iconUrl(`banner-${S.id}`);
  if (S.banner && !flag("--skip-icons") && (flag("--refresh-icons") || !(await exists(bannerUrl)))) {
    const url = (await fileUrls([S.banner], PRTS_API)).get(S.banner);
    const buf = url && (await get(url));
    if (buf) await sharp(buf).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 82 }).toFile(fileURLToPath(bannerUrl));
    else console.log(`  no banner for ${S.id} (${S.banner})`);
  }
  const banner = (await exists(bannerUrl)) || undefined;
  const itemGroups = [...tierGroups, { id: "arts", name: { en: "Arts", zh: "法术" } }].filter((g) =>
    items.some((e) => e.group === g.id),
  );
  const sections = [
    {
      id: "alliances",
      tab: "alliances",
      kind: "buff",
      title: "Alliances",
      summary:
        "Synergies that turn on when enough different operators of the same faction or sub-faction are deployed; the number is how many it takes. Stacks scale the effect.",
      groups: [
        { id: "faction", name: { en: "Faction", zh: "核心盟约" } },
        { id: "sub", name: { en: "Sub-faction", zh: "附加盟约" } },
      ],
      entries: await withIcon(bonds),
    },
    {
      id: "strategies",
      tab: "strategies",
      kind: "buff",
      title: "Strategies",
      summary: "Each run starts by picking a strategy, each one led by an operator. Life Points is how many you start the run with.",
      entries: await withIcon(bands),
    },
    {
      id: "equipment",
      tab: "equipment",
      kind: "item",
      title: "Equipment",
      summary:
        "Bought in the shop and equipped on an operator. A second copy of the same item upgrades it to the Advanced effect.",
      groups: itemGroups,
      entries: await withIcon(items.sort((a, b) => itemGroups.findIndex((g) => g.id === a.group) - itemGroups.findIndex((g) => g.id === b.group))),
    },
    {
      id: "bosses",
      tab: "enemies",
      kind: "debuff",
      title: "Bosses",
      summary: "Enemy leaders fought on boss rounds. Special = the stronger version from the second half of the season.",
      hideFlavor: true,
      skillLayout: true,
      entries: await withIcon(bosses),
    },
    {
      id: "enemy-types",
      tab: "enemies",
      kind: "debuff",
      title: "Special Enemy Types",
      summary: "Traits that rounds of special training enemies can roll.",
      entries: await withIcon(enemyTypes),
    },
  ];
  const operatorList = await Promise.all(
    operators.map(async (o) => {
      const { charId, artId, ...rest } = o; // eslint-disable-line @typescript-eslint/no-unused-vars
      return { ...rest, icon: await exists(iconUrl(o.id)), portrait: (await exists(iconUrl(`portrait-${o.id}`))) || undefined };
    }),
  );
  for (const sec of sections) for (const e of sec.entries) wordStacks(e.text);
  const last = S.pages.at(-1).prts;
  seasons.push({
    ...meta,
    banner,
    pins: S.pins,
    operatorsSource: `https://prts.wiki/w/${encodeURI(last.replace(/ /g, "_"))}`,
    operators: operatorList,
    sections,
  });
}

/**
 * Stack formulas in words: "ATK +(23 + [Stacks×0.9])%" → "ATK +23% (affected by no. of stacks)",
 * "(23+0.9×层数)%" → "23%（受层数影响）". The number kept is the value at 0 stacks; the note
 * (the game's own EN wording) goes once at the end of the line.
 */
function wordStacks(text) {
  const RULES = [
    { re: /\((-?[\d.]+)\s*[+\-−]\s*(?:\[Stacks?\s*[×x*]\s*[\d.]+\]|Stacks?)\)/g, note: " (affected by no. of stacks)", has: /affected by no\. of stacks/ },
    { re: /[（(](-?[\d.]+)[+\-][\d.]+×层数[)）]/g, note: "（受层数影响）", has: /受层数影响/ },
  ];
  const fix = (s) =>
    s &&
    s
      .split("\n")
      .map((line) => {
        for (const r of RULES) {
          if (line.search(r.re) < 0) continue; // search(), not test(): /g regexes keep lastIndex
          line = line.replace(r.re, "$1");
          if (!r.has.test(line)) {
            const end = line.match(/[.。]$/)?.[0] ?? "";
            line = line.slice(0, line.length - end.length) + r.note + end;
          }
        }
        return line;
      })
      .join("\n");
  for (const t of Object.values(text)) {
    if (!t || typeof t !== "object") continue;
    t.effect = fix(t.effect);
    if (t.levels) t.levels = t.levels.map((l) => ({ ...l, effect: fix(l.effect) }));
  }
}

await writeFile(
  new URL("stronghold.json", DATA_DIR),
  JSON.stringify({ generatedAt: new Date().toISOString(), namePins: NAME_PINS, seasons }, null, 1) + "\n",
);
if (flag("--export-untranslated")) {
  await writeFile(new URL("untranslated-stronghold.json", DATA_DIR), JSON.stringify([...untranslated], null, 1) + "\n");
  console.log(`wrote data/untranslated-stronghold.json (${untranslated.size} strings)`);
}
for (const s of seasons)
  console.log(
    `wrote ${s.id}: ${s.operators.length} operators, ` + s.sections.map((x) => `${x.entries.length} ${x.id}`).join(", "),
  );
