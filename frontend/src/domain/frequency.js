// DOMAINE · Fréquence d'inondation : sur combien de dates chaque pixel est en eau,
// hors eau permanente (scène de référence). Base de l'application « aménagement côtier ».

/**
 * @param {ArrayLike<number>[]} masks       un masque par date (> 0 = eau)
 * @param {ArrayLike<number>} referenceMask eau permanente
 * @returns {{counts: Uint8Array, dates: number}} counts[k] = nombre de dates où le pixel k est inondé
 */
export function floodFrequency(masks, referenceMask) {
  const n = referenceMask.length;
  const counts = new Uint8Array(n);
  for (let k = 0; k < n; k++) {
    if (referenceMask[k] > 0) continue;
    let c = 0;
    for (const m of masks) if (m[k] > 0) c++;
    counts[k] = c;
  }
  return { counts, dates: masks.length };
}
