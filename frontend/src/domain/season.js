// DOMAINE · Saisons (règle du contrat : sèche = décembre à février, pluies = mars à novembre)

export const SEASONS = /** @type {const} */ (["dry", "rain"]);

/** Saison d'une date AAAA-MM-JJ. */
export function seasonOf(date) {
  const month = Number(date.slice(5, 7));
  return month === 12 || month <= 2 ? "dry" : "rain";
}

/**
 * Périodes de saison couvrant [t0, t1] (horodatages ms), coupées aux bornes.
 * @returns {{season:"dry"|"rain", start:number, end:number}[]}
 */
export function seasonPeriods(t0, t1) {
  const out = [];
  const y0 = new Date(t0).getFullYear() - 1;
  const y1 = new Date(t1).getFullYear() + 1;
  for (let y = y0; y <= y1; y++) {
    out.push({ season: "dry", start: new Date(y - 1, 11, 1).getTime(), end: new Date(y, 2, 1).getTime() });
    out.push({ season: "rain", start: new Date(y, 2, 1).getTime(), end: new Date(y, 11, 1).getTime() });
  }
  return out
    .map((p) => ({ ...p, start: Math.max(p.start, t0), end: Math.min(p.end, t1) }))
    .filter((p) => p.end > p.start);
}
