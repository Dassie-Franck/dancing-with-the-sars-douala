// INFRASTRUCTURE · Traduction du contrat de données (docs/CONTRAT_DONNEES.md) vers le modèle du domaine.
// Seul fichier qui connaît les noms de champs du manifest (snake_case, bbox en tableau, etc.).
// Schémas acceptés : 1.0 (NISAR, HH) et 2.0 (capteur libre : VV, HH… ; satellite et produit par date).
//
// Sécurité : le manifest peut venir d'une API. Tout est vérifié avant d'atteindre l'interface :
// chemins d'images relatifs uniquement (pas d'URL externe, pas de « .. »), nombres finis, tailles bornées.
import { seasonOf } from "../../domain/season";

export const SUPPORTED_SCHEMAS = ["1.0", "2.0"];

const MAX_SIDE = 4096; // pixels : au-delà, le décodage canvas deviendrait dangereux pour la mémoire
const MAX_ACQUISITIONS = 1000;
const LAYER_PATH = /^[A-Za-z0-9_-]+(\/[A-Za-z0-9_.-]+)*\.png$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const CO_POL = ["hh", "vv"];
const CROSS_POL = ["hv", "vh"];

class ContractError extends Error {
  constructor(message) {
    super(`Contrat de données invalide : ${message}`);
    this.name = "ContractError";
  }
}

const check = (ok, message) => {
  if (!ok) throw new ContractError(message);
};
const finite = (v, what) => {
  check(typeof v === "number" && Number.isFinite(v), `${what} doit être un nombre`);
  return v;
};
const optFinite = (v, what) => (v == null ? null : finite(v, what));
const text = (v, max = 120) => (typeof v === "string" ? v.slice(0, max) : null);

/** Chemin d'image relatif au dossier des données ; tout le reste est refusé. */
function layerPath(p, what) {
  if (p == null) return null;
  check(typeof p === "string" && LAYER_PATH.test(p) && !p.split("/").includes(".."), `chemin d'image refusé (${what})`);
  return p;
}

/** Première polarisation présente parmi les couches backscatter_xx. */
const pickPol = (layers, candidates) => candidates.find((p) => layers[`backscatter_${p}`] != null) ?? null;

function mapAcquisition(a, i, url) {
  const where = `acquisition ${i + 1}`;
  check(a && typeof a === "object", `${where} manquante`);
  check(typeof a.id === "string" && a.id.length <= 64, `${where} : identifiant invalide`);
  check(typeof a.date === "string" && DATE.test(a.date), `${where} : date invalide`);
  const layers = a.layers ?? {};
  const stats = a.stats ?? {};
  const co = pickPol(layers, CO_POL);
  const cross = pickPol(layers, CROSS_POL);
  check(co, `${where} : aucune couche de rétrodiffusion (backscatter_hh ou backscatter_vv)`);
  check(layers.water_mask, `${where} : masque d'eau manquant`);

  return {
    id: a.id,
    date: a.date,
    season: a.season === "dry" || a.season === "rain" ? a.season : seasonOf(a.date),
    orbit: text(a.orbit, 8),
    polarizations: Array.isArray(a.polarizations) ? a.polarizations.map((p) => text(p, 4)).filter(Boolean) : [co.toUpperCase()],
    polarization: co.toUpperCase(),
    satellite: text(a.satellite, 16),
    product: text(a.product, 64),
    maturity: text(a.maturity, 32) ?? "",
    isMock: a.mock === true,
    waterAreaKm2: finite(stats.water_area_km2, `${where} : water_area_km2`),
    newWaterKm2: optFinite(stats.new_water_km2, `${where} : new_water_km2`),
    waterFraction: finite(stats.water_fraction, `${where} : water_fraction`),
    validFraction: finite(stats.valid_fraction, `${where} : valid_fraction`),
    thresholdDb: finite(stats.threshold_db, `${where} : threshold_db`),
    meanDb: optFinite(stats[`mean_${co}_db`] ?? stats.mean_db, `${where} : mean_${co}_db`),
    layers: {
      backscatter: url(layerPath(layers[`backscatter_${co}`], where)),
      backscatterCross: url(layerPath(cross && layers[`backscatter_${cross}`], where)),
      waterMask: url(layerPath(layers.water_mask, where)),
      newWaterMask: url(layerPath(layers.new_water_mask, where)),
    },
  };
}

/**
 * @param {any} manifest            contenu de manifest.json (ou réponse API au même format)
 * @param {(relativePath: string) => string} resolveUrl  transforme "layers/x.png" en URL affichable
 * @returns {import("../../domain/model").RawCatalog}
 */
export function manifestToCatalog(manifest, resolveUrl) {
  check(manifest && typeof manifest === "object", "réponse vide");
  check(SUPPORTED_SCHEMAS.includes(manifest.schema_version), `version non supportée (${manifest.schema_version ?? "absente"})`);
  const aoi = manifest.aoi ?? {};
  check(Array.isArray(aoi.bbox) && aoi.bbox.length === 4, "aoi.bbox doit contenir [ouest, sud, est, nord]");
  const [west, south, east, north] = aoi.bbox.map((v, k) => finite(v, `aoi.bbox[${k}]`));
  check(west < east && south < north && west >= -180 && east <= 180 && south >= -90 && north <= 90, "aoi.bbox incohérente");
  check(Array.isArray(aoi.image_size) && aoi.image_size.length === 2, "aoi.image_size manquant");
  const [width, height] = aoi.image_size;
  check([width, height].every((n) => Number.isInteger(n) && n > 0 && n <= MAX_SIDE), `aoi.image_size hors limites (1 à ${MAX_SIDE} px)`);
  check(Array.isArray(manifest.acquisitions) && manifest.acquisitions.length <= MAX_ACQUISITIONS, "liste d'acquisitions invalide");

  const dbRange = Array.isArray(manifest.db_range) ? manifest.db_range.map((v, k) => finite(v, `db_range[${k}]`)) : [-30, 0];
  check(dbRange.length === 2 && dbRange[0] < dbRange[1], "db_range incohérent");
  const url = (p) => (p ? resolveUrl(p) : null);
  const acquisitions = manifest.acquisitions.map((a, i) => mapAcquisition(a, i, url));

  return {
    studyArea: { name: text(aoi.name) ?? "Zone d’étude", bbox: { west, south, east, north }, crs: text(aoi.crs, 32) ?? "EPSG:4326", width, height },
    referenceId: typeof manifest.reference_id === "string" ? manifest.reference_id : acquisitions[0]?.id ?? null,
    defaultThresholdDb: finite(manifest.threshold_default_db, "threshold_default_db"),
    minValidFraction: optFinite(manifest.min_valid_fraction, "min_valid_fraction") ?? 0.9,
    dbRange,
    generatedAt: text(manifest.generated_at, 32),
    acquisitions,
  };
}

/**
 * composites.json (facultatif) : { dry: {backscatter_vv, water_mask}, rain: {...} }.
 * @returns {{dry?: import("../../domain/model").SeasonComposite, rain?: import("../../domain/model").SeasonComposite}}
 */
export function compositesToDomain(json, resolveUrl) {
  if (!json || typeof json !== "object") return {};
  const out = {};
  for (const season of ["dry", "rain"]) {
    const c = json[season];
    if (!c || typeof c !== "object") continue;
    const pol = pickPol(c, CO_POL);
    if (!pol || !c.water_mask) continue;
    out[season] = {
      id: `composite-${season}`,
      season,
      polarization: pol.toUpperCase(),
      layers: {
        backscatter: resolveUrl(layerPath(c[`backscatter_${pol}`], `composite ${season}`)),
        waterMask: resolveUrl(layerPath(c.water_mask, `composite ${season}`)),
      },
    };
  }
  return out;
}
