// APPLICATION · Ports
// Ce dont les cas d'usage ont besoin, sans dire comment c'est obtenu.
// Chaque adaptateur de src/infrastructure/ implémente un de ces contrats.
// Brancher le backend = écrire (ou finir) un adaptateur ; rien d'autre ne change.

/**
 * Source des acquisitions radar (public/data/manifest.json ou l'API FastAPI).
 * @typedef {Object} SarRepository
 * @property {() => Promise<import("../domain/model").RawCatalog>} getCatalog
 */

/**
 * Lecture des couches raster d'une acquisition, à la taille de la grille.
 * @typedef {Object} RasterReader
 * @property {(acquisition: import("../domain/model").Acquisition,
 *             area: import("../domain/model").StudyArea) => Promise<Uint8Array>} readWaterMask
 *   masque d'eau : valeur > 0 = eau
 * @property {(acquisition: import("../domain/model").Acquisition,
 *             area: import("../domain/model").StudyArea,
 *             dbRange: [number, number]) => Promise<Float32Array>} readBackscatterDb
 *   rétrodiffusion (co-polarisation) en dB ; NaN = sans donnée
 */

/**
 * Liste des quartiers suivis.
 * @typedef {Object} QuartierRepository
 * @property {() => Promise<import("../domain/model").Quartier[]>} listQuartiers
 */

/** Vérifie qu'un adaptateur respecte son port (erreur claire au démarrage plutôt qu'en pleine page). */
export function assertPort(name, adapter, methods) {
  for (const m of methods) {
    if (typeof adapter?.[m] !== "function") throw new Error(`Adaptateur ${name} invalide : méthode « ${m} » manquante`);
  }
  return adapter;
}

export const PORTS = {
  SarRepository: ["getCatalog"],
  RasterReader: ["readWaterMask", "readBackscatterDb"],
  QuartierRepository: ["listQuartiers"],
};
