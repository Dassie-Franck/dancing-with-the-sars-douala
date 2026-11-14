// Accès aux données selon le contrat docs/CONTRAT_DONNEES.md (schéma 1.0).
// Source de vérité unique : /data/manifest.json

const BASE = `${import.meta.env.BASE_URL}data/`;

export const layerUrl = (relativePath) => `${BASE}${relativePath}`;

export async function loadManifest() {
  const res = await fetch(`${BASE}manifest.json`);
  if (!res.ok) throw new Error(`manifest.json introuvable (${res.status})`);
  const manifest = await res.json();
  if (manifest.schema_version !== "1.0") {
    throw new Error(`Version de contrat non supportée : ${manifest.schema_version}`);
  }
  return manifest;
}

// Les 4 coins attendus par une source "image" MapLibre : haut-gauche, haut-droit, bas-droit, bas-gauche
export function imageCoordinates(bbox) {
  const [west, south, east, north] = bbox;
  return [
    [west, north],
    [east, north],
    [east, south],
    [west, south],
  ];
}

// Acquisitions exploitables pour la courbe (couverture suffisante)
export const usableAcquisitions = (manifest) => manifest.acquisitions.filter((a) => !a.partial);

// Données prêtes pour Recharts (M3)
export function waterSeries(manifest) {
  return usableAcquisitions(manifest).map((a) => ({
    date: a.date,
    season: a.season,
    water: a.stats.water_area_km2,
    newWater: a.stats.new_water_km2, // null pour la scène de référence
    meanDb: a.stats.mean_hh_db,
    mock: a.mock,
  }));
}

// Ajoute ou met à jour une image géoréférencée sur la carte (M1/M2).
// layerKey : "backscatter_hh" | "water_mask" | "new_water_mask" | "backscatter_hv"
export function showLayer(map, manifest, acquisition, layerKey, { opacity = 1 } = {}) {
  const rel = acquisition.layers[layerKey];
  if (!rel) return false;
  const id = `sar-${layerKey}`;
  const url = layerUrl(rel);
  const coordinates = imageCoordinates(manifest.aoi.bbox);
  const source = map.getSource(id);
  if (source) {
    source.updateImage({ url, coordinates });
  } else {
    map.addSource(id, { type: "image", url, coordinates });
    map.addLayer({ id, type: "raster", source: id, paint: { "raster-opacity": opacity, "raster-fade-duration": 0 } });
  }
  return true;
}

export function hideLayer(map, layerKey) {
  const id = `sar-${layerKey}`;
  if (map.getLayer(id)) map.removeLayer(id);
  if (map.getSource(id)) map.removeSource(id);
}
