// PRÉSENTATION · Libellés et formats français

export const SEASON_LABEL = { dry: "Saison sèche", rain: "Saison des pluies" };
export const RISK_LABEL = { high: "Élevée", mid: "Modérée", low: "Faible" };

export const nf = (v, d = 1) =>
  v == null || Number.isNaN(v)
    ? "–"
    : v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });

export const signed = (v, d = 1) => (v == null ? "–" : `${v >= 0 ? "+" : "−"}${nf(Math.abs(v), d)}`);

const asDate = (d) => new Date(`${d}T00:00:00`);
export const fDate = (d) => asDate(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
export const fShort = (d) => asDate(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
export const fShortTs = (t) => new Date(t).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

/** Coordonnée lisible : 4,05° N */
export const fCoord = (v, pos, neg) => `${nf(Math.abs(v), 2)}° ${v >= 0 ? pos : neg}`;
