// PRÉSENTATION · Outils MapLibre partagés (fond de carte, images géoréférencées, repères).

const OSM_SOURCE = {
  type: "raster",
  tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
  tileSize: 256,
  maxzoom: 19,
  attribution: "© OpenStreetMap contributors",
};

// Fond sombre : OSM en niveaux de gris, luminosité inversée (min > max) => rues claires sur fond noir.
const DARK_PAINT = {
  "raster-saturation": -1,
  "raster-brightness-min": 0.92,
  "raster-brightness-max": 0.06,
  "raster-contrast": 0.15,
  "raster-opacity": 0.9,
};
const PLAN_PAINT = { "raster-saturation": -0.35, "raster-opacity": 0.95 };

export const BASEMAPS = [
  ["dark", "Sombre"],
  ["plan", "Plan"],
  ["none", "Aucun"],
];

/** Style MapLibre minimal : un fond OSM dont l'apparence change selon `kind`. */
export function baseStyle(kind = "dark") {
  return {
    version: 8,
    sources: { osm: OSM_SOURCE },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": "#0b0e13" } },
      { id: "osm", type: "raster", source: "osm", paint: kind === "plan" ? PLAN_PAINT : DARK_PAINT, layout: { visibility: kind === "none" ? "none" : "visible" } },
    ],
  };
}

/** Change le fond sans recréer la carte. */
export function applyBasemap(map, kind) {
  if (!map.getLayer("osm")) return;
  map.setLayoutProperty("osm", "visibility", kind === "none" ? "none" : "visible");
  const paint = kind === "plan" ? { ...DARK_PAINT, ...PLAN_PAINT, "raster-brightness-min": 0, "raster-brightness-max": 1, "raster-contrast": 0 } : DARK_PAINT;
  for (const [k, v] of Object.entries(paint)) map.setPaintProperty("osm", k, v);
}

export const bboxCorners = ({ bbox }) => [
  [bbox.west, bbox.north],
  [bbox.east, bbox.north],
  [bbox.east, bbox.south],
  [bbox.west, bbox.south],
];

export const bboxBounds = ({ bbox }) => [
  [bbox.west, bbox.south],
  [bbox.east, bbox.north],
];

/**
 * Image géoréférencée posée sur l'emprise d'étude ; mise à jour sans recréer la couche (pas de clignotement, F7).
 * url = null retire la couche. `beforeId` permet de garder l'ordre des calques.
 */
export function setImageLayer(map, id, url, area, { opacity = 1, visible = true, beforeId } = {}) {
  const src = map.getSource(id);
  if (!url) {
    if (map.getLayer(id)) map.removeLayer(id);
    if (src) map.removeSource(id);
    return;
  }
  const coordinates = bboxCorners(area);
  if (src) src.updateImage({ url, coordinates });
  else {
    map.addSource(id, { type: "image", url, coordinates });
    map.addLayer(
      { id, type: "raster", source: id, paint: { "raster-opacity": opacity, "raster-fade-duration": 0 } },
      beforeId && map.getLayer(beforeId) ? beforeId : undefined
    );
  }
  map.setPaintProperty(id, "raster-opacity", opacity);
  map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
}

export function pinSvg(color) {
  return `<svg width="26" height="34" viewBox="0 0 26 34" aria-hidden="true">
    <path d="M13 33s11-11.2 11-19.5A11 11 0 0 0 2 13.5C2 21.8 13 33 13 33z" fill="${color}" stroke="rgba(0,0,0,.45)" stroke-width="1"/>
    <circle cx="13" cy="13.5" r="4.2" fill="#06121a"/></svg>`;
}

/** Précharge des images (lecture automatique, F18). */
export function preloadImages(urls) {
  for (const u of urls) if (u) new Image().src = u;
}
