// DOMAINE · Exposition des quartiers à l'eau
// Dans un disque autour du centre du quartier : part du sol (hors eau permanente de la référence)
// recouverte d'eau à la date étudiée.
import { radiusPx, toPixel } from "./geo";

export const EXPOSURE_RADIUS_KM = 1;
// Seuils indicatifs, en % du sol du quartier gagné par l'eau
export const RISK_THRESHOLDS = { high: 10, mid: 3 };

/** @returns {"high"|"mid"|"low"} */
export function riskOf(pct) {
  if (pct >= RISK_THRESHOLDS.high) return "high";
  if (pct >= RISK_THRESHOLDS.mid) return "mid";
  return "low";
}

/**
 * @param {ArrayLike<number>} mask        eau à la date étudiée
 * @param {ArrayLike<number>} referenceMask eau permanente (scène de référence)
 * @param {import("./model").StudyArea} area
 * @param {import("./model").Quartier} quartier
 * @returns {number} pourcentage 0–100
 */
export function quartierExposurePct(mask, referenceMask, area, quartier, radiusKm = EXPOSURE_RADIUS_KM) {
  const { width: w, height: h } = area;
  const { x: cx, y: cy } = toPixel(area, quartier.lon, quartier.lat);
  const { rx, ry } = radiusPx(area, radiusKm);
  let land = 0;
  let wet = 0;
  for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(h - 1, Math.ceil(cy + ry)); y++) {
    for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(w - 1, Math.ceil(cx + rx)); x++) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1) continue;
      const k = y * w + x;
      if (referenceMask[k] > 0) continue;
      land++;
      if (mask[k] > 0) wet++;
    }
  }
  return land ? (wet / land) * 100 : 0;
}

/**
 * Exposition de tous les quartiers, triée du plus exposé au moins exposé.
 * @returns {{quartier: import("./model").Quartier, pct: number, risk: "high"|"mid"|"low"}[]}
 */
export function rankQuartiers(mask, referenceMask, area, quartiers) {
  return quartiers
    .map((quartier) => {
      const pct = quartierExposurePct(mask, referenceMask, area, quartier);
      return { quartier, pct, risk: riskOf(pct) };
    })
    .sort((a, b) => b.pct - a.pct);
}
