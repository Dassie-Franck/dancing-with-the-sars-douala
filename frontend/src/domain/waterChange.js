// DOMAINE · Évolution de l'eau entre deux dates, pixel par pixel.
// Un masque est un tableau de la taille de la grille : valeur > 0 = eau.
import { rowAreasKm2 } from "./geo";

export const CHANGE = { NONE: 0, GAINED: 1, LOST: 2 };

/**
 * @param {ArrayLike<number>} maskA  date A
 * @param {ArrayLike<number>} maskB  date B
 * @param {import("./model").StudyArea} area
 * @returns {{classes: Uint8Array, gainedKm2: number, lostKm2: number}}
 *   classes[k] = CHANGE.GAINED (eau en B, pas en A), CHANGE.LOST (l'inverse) ou CHANGE.NONE
 */
export function compareWaterMasks(maskA, maskB, area) {
  const { width, height } = area;
  const rows = rowAreasKm2(area);
  const classes = new Uint8Array(width * height);
  let gainedKm2 = 0;
  let lostKm2 = 0;
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const k = j * width + i;
      const a = maskA[k] > 0;
      const b = maskB[k] > 0;
      if (a === b) continue;
      if (b) {
        classes[k] = CHANGE.GAINED;
        gainedKm2 += rows[j];
      } else {
        classes[k] = CHANGE.LOST;
        lostKm2 += rows[j];
      }
    }
  }
  return { classes, gainedKm2, lostKm2 };
}
