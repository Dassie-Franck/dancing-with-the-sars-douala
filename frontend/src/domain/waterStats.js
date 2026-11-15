// DOMAINE · Indicateurs de surface en eau (même définition que GET /api/stats, tâche K7)

/** Une acquisition entre dans les calculs si sa couverture est suffisante. */
export const isUsable = (acq, minValidFraction) => acq.validFraction >= minValidFraction;

const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);

/**
 * Minimum, maximum, moyennes par saison et variation saisonnière.
 * @param {import("./model").Acquisition[]} acquisitions
 */
export function computeWaterStats(acquisitions) {
  if (!acquisitions.length) return null;
  const v = acquisitions.map((a) => a.waterAreaKm2);
  const meanDry = mean(acquisitions.filter((a) => a.season === "dry").map((a) => a.waterAreaKm2));
  const meanRain = mean(acquisitions.filter((a) => a.season === "rain").map((a) => a.waterAreaKm2));
  const min = Math.min(...v);
  const max = Math.max(...v);
  return {
    minKm2: min,
    maxKm2: max,
    minDate: acquisitions[v.indexOf(min)].date,
    maxDate: acquisitions[v.indexOf(max)].date,
    meanDryKm2: meanDry,
    meanRainKm2: meanRain,
    seasonalVariationPct: meanDry && meanRain != null ? (meanRain / meanDry - 1) * 100 : null,
  };
}

/**
 * Les deux dates les plus contrastées : saison sèche la moins en eau contre saison des pluies la plus en eau (F12).
 * @returns {[string, string] | null} identifiants [A, B]
 */
export function mostContrastedPair(acquisitions) {
  if (acquisitions.length < 2) return null;
  const byWater = (a, b) => a.waterAreaKm2 - b.waterAreaKm2;
  const all = [...acquisitions].sort(byWater);
  const dry = all.filter((a) => a.season === "dry");
  const rain = all.filter((a) => a.season === "rain");
  const a = dry[0] ?? all[0];
  const b = rain.at(-1) ?? all.at(-1);
  return a.id === b.id ? null : [a.id, b.id];
}

/**
 * Niveau de crue d'une acquisition entre l'étiage (0) et le pic (1), et sa gravité.
 * @returns {{ratio:number, aboveLowKm2:number, severity:"low"|"mid"|"high"}}
 */
export function floodLevel(acq, stats) {
  const span = stats.maxKm2 - stats.minKm2;
  const ratio = span > 0 ? (acq.waterAreaKm2 - stats.minKm2) / span : 0;
  return {
    ratio,
    aboveLowKm2: acq.waterAreaKm2 - stats.minKm2,
    severity: ratio >= 0.66 ? "high" : ratio >= 0.33 ? "mid" : "low",
  };
}
