// PRÉSENTATION · Réglages de l'observatoire (fond, calques, quartier ciblé), partagés avec les pages
// « Ce que voit le radar » et « Applications futures » qui ouvrent la carte avec des calques choisis.

export const LAYERS = [
  { key: "hh", label: "Rétrodiffusion HH" },
  { key: "water", label: "Eau détectée" },
  { key: "newWater", label: "Eau nouvelle" },
  { key: "freq", label: "Fréquence d’inondation" },
  { key: "quartiers", label: "Quartiers" },
];

export const DEFAULT_OBS = {
  basemap: "dark",
  layers: {
    hh: { on: true, opacity: 0.85 },
    water: { on: true, opacity: 0.6 },
    newWater: { on: true, opacity: 0.85 },
    freq: { on: false, opacity: 0.8 },
    quartiers: { on: true, opacity: 1 },
  },
  focusQuartierId: null,
  nonce: 0, // change à chaque préréglage : la carte se recadre
};

/**
 * Applique un préréglage partiel : { basemap?, layers?: {key: boolean | {on, opacity}}, focusQuartierId? }
 */
export function withPreset(obs, preset = {}) {
  const layers = { ...obs.layers };
  for (const [k, v] of Object.entries(preset.layers ?? {})) {
    layers[k] = typeof v === "boolean" ? { ...layers[k], on: v } : { ...layers[k], ...v };
  }
  return {
    ...obs,
    basemap: preset.basemap ?? obs.basemap,
    layers,
    focusQuartierId: preset.focusQuartierId !== undefined ? preset.focusQuartierId : obs.focusQuartierId,
    nonce: obs.nonce + 1,
  };
}
