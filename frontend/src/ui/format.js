// PRÉSENTATION · Libellés et formats (français par défaut, anglais via le sélecteur de langue)
// Les libellés sont en français : les composants les passent à t() pour les traduire.

export const SEASON_LABEL = { dry: "Saison sèche", rain: "Saison des pluies" };
/** Polarisation affichée (« VV », « HH ») ; le capteur vient du manifest, jamais d'une valeur en dur. */
export const polOf = (catalog) => catalog?.sensor?.polarization ?? "";

export const RISK_LABEL = { high: "Élevée", mid: "Modérée", low: "Faible" };
export const DB_READING = {
  "calm-water": "probablement de l’eau calme",
  smooth: "surface lisse ou sol nu",
  vegetation: "végétation dense",
  "double-bounce": "double rebond : bâti ou troncs dans l’eau",
  urban: "bâti dense",
};

// Format des nombres et des dates : suit la langue choisie (réglé par i18n/index.jsx)
let LOCALE = "fr-FR";
export const setFormatLocale = (lang) => {
  LOCALE = lang === "en" ? "en-GB" : "fr-FR";
};

export const nf = (v, d = 1) =>
  v == null || Number.isNaN(v)
    ? "–"
    : v.toLocaleString(LOCALE, { minimumFractionDigits: d, maximumFractionDigits: d });

export const signed = (v, d = 1) => (v == null ? "–" : `${v >= 0 ? "+" : "−"}${nf(Math.abs(v), d)}`);

const asDate = (d) => new Date(`${d}T00:00:00`);
export const fDate = (d) => asDate(d).toLocaleDateString(LOCALE, { day: "numeric", month: "long", year: "numeric" });
export const fShort = (d) => asDate(d).toLocaleDateString(LOCALE, { day: "numeric", month: "short" });
export const fShortTs = (t) => new Date(t).toLocaleDateString(LOCALE, { day: "numeric", month: "short" });

/** Coordonnée lisible : 4,05° N (fr) ou 4.05° N (en). Ouest : « O » en français, « W » en anglais. */
export const fCoord = (v, pos, neg) => `${nf(Math.abs(v), 2)}° ${v >= 0 ? pos : LOCALE === "en-GB" && neg === "O" ? "W" : neg}`;
