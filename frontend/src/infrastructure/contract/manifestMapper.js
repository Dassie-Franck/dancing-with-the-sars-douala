// INFRASTRUCTURE · Traduction du contrat de données v1.0 (docs/CONTRAT_DONNEES.md) vers le modèle du domaine.
// Seul fichier qui connaît les noms de champs du manifest (snake_case, bbox en tableau, etc.).
// Si le backend renvoie une autre forme, on ajoute un mapper à côté ; le domaine ne bouge pas.

export const SUPPORTED_SCHEMA = "1.0";

/**
 * @param {any} manifest            contenu de manifest.json (ou réponse API au même format)
 * @param {(relativePath: string) => string} resolveUrl  transforme "layers/x.png" en URL affichable
 * @returns {import("../../domain/model").RawCatalog}
 */
export function manifestToCatalog(manifest, resolveUrl) {
  if (manifest?.schema_version !== SUPPORTED_SCHEMA) {
    throw new Error(`Version de contrat non supportée : ${manifest?.schema_version ?? "absente"}`);
  }
  const [west, south, east, north] = manifest.aoi.bbox;
  const [width, height] = manifest.aoi.image_size;
  const url = (p) => (p ? resolveUrl(p) : null);

  return {
    studyArea: { name: manifest.aoi.name, bbox: { west, south, east, north }, crs: manifest.aoi.crs, width, height },
    referenceId: manifest.reference_id,
    defaultThresholdDb: manifest.threshold_default_db,
    minValidFraction: manifest.min_valid_fraction ?? 0.9,
    acquisitions: manifest.acquisitions.map((a) => ({
      id: a.id,
      date: a.date,
      season: a.season,
      orbit: a.orbit ?? null,
      polarizations: a.polarizations ?? [],
      maturity: a.maturity,
      isMock: !!a.mock,
      waterAreaKm2: a.stats.water_area_km2,
      newWaterKm2: a.stats.new_water_km2 ?? null,
      waterFraction: a.stats.water_fraction,
      validFraction: a.stats.valid_fraction,
      thresholdDb: a.stats.threshold_db,
      meanHhDb: a.stats.mean_hh_db,
      layers: {
        backscatterHh: url(a.layers.backscatter_hh),
        backscatterHv: url(a.layers.backscatter_hv),
        waterMask: url(a.layers.water_mask),
        newWaterMask: url(a.layers.new_water_mask),
      },
    })),
  };
}
