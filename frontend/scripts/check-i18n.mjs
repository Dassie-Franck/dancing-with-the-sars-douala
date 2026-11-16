// Vérifie les traductions : npm run check:i18n
//  1. chaque texte passé à t() / tr() / tx() a une traduction dans src/i18n/en.js ;
//  2. les {variables} sont identiques en français et en anglais ;
//  3. aucun texte français n'est resté écrit en dur entre deux balises JSX.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = new URL("../src/", import.meta.url);
const { EN } = await import(new URL("i18n/en.js", SRC));
const { RADAR_TOPICS } = await import(new URL("content/radar.js", SRC));
const { TOUR_STEPS } = await import(new URL("content/tour.js", SRC));
const fmt = await import(new URL("ui/format.js", SRC));
const { LAYERS } = await import(new URL("components/observatoire/obsSettings.js", SRC));

const files = [];
const walk = (d) =>
  readdirSync(d).forEach((f) => {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(jsx?|mjs)$/.test(f)) files.push(p);
  });
walk(fileURLToPath(SRC));

const CALL = /\b(?:t|tr|tx)\(\s*"((?:[^"\\]|\\.)*)"/g;
// t(cond ? "a" : "b")
const TERNARY = /\b(?:t|tr|tx)\(\s*[^"()]*\?\s*"((?:[^"\\]|\\.)*)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
const BARE_TEXT = /^[A-Za-zÀ-ÿ’'«»,.:;!?()\- ]*[a-zà-ÿ]{3,}[A-Za-zÀ-ÿ’'«»,.:;!?()\- ]*$/;

const keys = new Set();
const hard = [];
for (const f of files) {
  if (/i18n[\\/]en\.js$/.test(f)) continue;
  const s = readFileSync(f, "utf8");
  for (const m of s.matchAll(CALL)) keys.add(JSON.parse(`"${m[1]}"`));
  for (const m of s.matchAll(TERNARY)) [m[1], m[2]].forEach((k) => keys.add(JSON.parse(`"${k}"`)));
  if (!f.endsWith(".jsx")) continue;
  s.split("\n").forEach((line, i) => {
    const bare = line.trim();
    if (/^(\/\/|\{\/\*|\*|[?:.])/.test(bare) || /^(return|export|import|const|let)\b/.test(bare) || /[,()]$/.test(bare)) return;
    if (!/\s|[À-ÿ]/.test(bare)) return; // un identifiant seul (showAtmosphere) n'est pas du texte
    if (BARE_TEXT.test(bare) && !/[{}<>=;]/.test(bare)) hard.push(`${f.split(/[\\/]src[\\/]/)[1]}:${i + 1}  ${bare}`);
  });
}

// Libellés tenus dans des tables : navigation, calques, fonds de carte, saisons, risques, lecture dB, contenus
for (const m of readFileSync(new URL("App.jsx", SRC), "utf8").matchAll(/label: "([^"]+)"/g)) keys.add(m[1]);
LAYERS.forEach((l) => keys.add(l.label));
[fmt.SEASON_LABEL, fmt.RISK_LABEL, fmt.DB_READING].forEach((o) => Object.values(o).forEach((v) => keys.add(v)));
const basemaps = readFileSync(new URL("components/map/mapKit.js", SRC), "utf8").match(/BASEMAPS = \[[\s\S]*?\];/)[0];
for (const m of basemaps.matchAll(/\["\w+", "([^"]+)"\]/g)) keys.add(m[1]);
for (const t of RADAR_TOPICS) {
  [t.tab, t.title, t.example, t.action?.label, ...(t.paragraphs ?? [])].filter(Boolean).forEach((x) => keys.add(x));
  (t.limits ?? []).forEach(([a, b]) => (keys.add(a), keys.add(b)));
  for (const m of t.schema.matchAll(/<text[^>]*>([^<]*)<\/text>/g)) if (/[A-Za-zÀ-ÿ]{3,}/.test(m[1])) keys.add(m[1]);
}
TOUR_STEPS.forEach((s) => keys.add(s.text));

const vars = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
const missing = [...keys].filter((k) => !(k in EN));
const badVars = [...keys].filter((k) => k in EN && vars(k) !== vars(EN[k]));
const unused = Object.keys(EN).filter((k) => !keys.has(k));

const report = (title, list) => list.length && console.log(`\n${title} (${list.length})\n  ${list.join("\n  ")}`);
report("Traductions manquantes", missing);
report("Variables différentes", badVars);
report("Texte français en dur dans le JSX", hard);
report("Entrées inutilisées (info)", unused);
console.log(`\n${keys.size} textes, ${Object.keys(EN).length} traductions.`);
process.exit(missing.length || badVars.length || hard.length ? 1 : 0);
