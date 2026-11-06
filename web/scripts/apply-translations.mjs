// Merges a batch of English translations into data/translations.json.
//
// Workflow:
//   1. node scripts/build-relics.mjs --skip-icons --export-untranslated
//        → data/untranslated.json lists every CN-only string with no translation
//   2. write a batch file: { "<relicId>": { "name"?, "effect"?, "flavor"?, "unlock"? } }
//   3. node scripts/apply-translations.mjs batch.json [more.json …]
//        → each field is stored with the exact Chinese source it translates (`src`),
//          so build-relics.mjs ignores it if the game text later changes
//   4. node scripts/build-relics.mjs --skip-icons   (rebuild data/relics.json)
import { readFile, writeFile } from "node:fs/promises";

const DATA = new URL("../data/", import.meta.url);
const FIELDS = ["name", "effect", "flavor", "unlock"];

const untranslated = JSON.parse(await readFile(new URL("untranslated.json", DATA), "utf8"));
const store = JSON.parse(
  await readFile(new URL("translations.json", DATA), "utf8").catch(() => '{"themes":{},"relics":{}}')
);

let added = 0;
const problems = [];
for (const file of process.argv.slice(2)) {
  const batch = JSON.parse(await readFile(file, "utf8"));
  for (const [id, fields] of Object.entries(batch)) {
    const src = untranslated[id];
    if (!src) {
      problems.push(`${id}: not in untranslated.json (unknown id, or already translated)`);
      continue;
    }
    const entry = (store.relics[id] ??= { src: {} });
    for (const f of FIELDS) {
      if (fields[f] == null) continue;
      if (!src[f]) {
        problems.push(`${id}.${f}: no untranslated source text for this field`);
        continue;
      }
      entry[f] = fields[f].trim();
      entry.src[f] = src[f];
      added++;
    }
  }
}

// stable, reviewable output: relics sorted by id
store.relics = Object.fromEntries(Object.entries(store.relics).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(new URL("translations.json", DATA), JSON.stringify(store, null, 1) + "\n");
console.log(`applied ${added} field translation(s)`);
for (const p of problems) console.warn(`  ! ${p}`);
