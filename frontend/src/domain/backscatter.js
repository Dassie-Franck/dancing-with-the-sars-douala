// DOMAINE · Rétrodiffusion radar (dB) : décodage du contrat, lecture physique, histogramme, seuil d'Otsu.
import { rowAreasKm2 } from "./geo";

/** Contrat : niveau de gris 0–255 -> dB sur l'échelle dbRange (par défaut [-30, 0]). */
export const grayToDb = (gray, [lo, hi]) => lo + (gray / 255) * (hi - lo);

/**
 * Lecture physique d'une valeur de rétrodiffusion (dB), du plus sombre au plus clair.
 * Sous le seuil d'eau du jeu de données, le pixel est lu comme de l'eau calme : la lecture reste cohérente avec le masque.
 * @param {number} db
 * @param {number} [waterThresholdDb]  seuil du masque d'eau (−14 dB en VV Sentinel-1, −18 dB en HH NISAR)
 * @returns {"calm-water"|"smooth"|"vegetation"|"double-bounce"|"urban"}
 */
export function interpretDb(db, waterThresholdDb = -17) {
  if (db < waterThresholdDb) return "calm-water";
  if (db < Math.max(waterThresholdDb + 3, -12)) return "smooth";
  if (db < -7.5) return "vegetation";
  if (db < -5) return "double-bounce";
  return "urban";
}

/**
 * Histogramme des pixels valides (NaN = sans donnée).
 * @returns {{lo:number, hi:number, bins:number, counts:Float64Array, total:number}}
 */
export function histogram(db, lo = -30, hi = 0, bins = 60) {
  const counts = new Float64Array(bins);
  let total = 0;
  for (let k = 0; k < db.length; k++) {
    const v = db[k];
    if (Number.isNaN(v)) continue;
    const b = Math.min(bins - 1, Math.max(0, Math.floor(((v - lo) / (hi - lo)) * bins)));
    counts[b]++;
    total++;
  }
  return { lo, hi, bins, counts, total };
}

/** Seuil d'Otsu (dB) : sépare au mieux les deux populations de l'histogramme (eau / reste). */
export function otsuThreshold({ lo, hi, bins, counts, total }) {
  let sum = 0;
  for (let i = 0; i < bins; i++) sum += i * counts[i];
  let wB = 0;
  let sumB = 0;
  let best = -1;
  let bestI = 0;
  for (let i = 0; i < bins; i++) {
    wB += counts[i];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += i * counts[i];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) {
      best = between;
      bestI = i;
    }
  }
  return lo + ((bestI + 1) / bins) * (hi - lo);
}

/** Surface (km²) des pixels sous le seuil, sur la grille de l'emprise. */
export function waterAreaBelow(db, thresholdDb, area) {
  const rows = rowAreasKm2(area);
  const { width, height } = area;
  let km2 = 0;
  for (let j = 0; j < height; j++) {
    const row = j * width;
    for (let i = 0; i < width; i++) {
      const v = db[row + i];
      if (!Number.isNaN(v) && v < thresholdDb) km2 += rows[j];
    }
  }
  return km2;
}
