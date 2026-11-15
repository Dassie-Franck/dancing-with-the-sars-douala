// PRÉSENTATION · Couleurs de la charte pour les SVG (Recharts) et les canvas.
// Miroir de tailwind.config.js -> colors.sar. Le domaine ne connaît que des clés (« high », « dry »…).
export const C = {
  bg: "#07090d",
  sf: "#12151b",
  sf2: "#1a1f27",
  line: "#222a35",
  ink: "#f1f5f9",
  ink2: "#aab4c2",
  mut: "#6b7686",
  acc: "#19d3f3",
  water: "#19d3f3",
  mang: "#4ade80",
  urb: "#a78bfa",
  veg: "#fb923c",
  dry: "#facc15",
  bad: "#f43f5e",
};

export const SEASON_COLOR = { dry: C.dry, rain: C.water };
export const RISK_COLOR = { high: C.bad, mid: C.veg, low: C.acc };
// Comparaison de deux dates : eau gagnée / rendue
export const CHANGE_RGB = { gained: [0, 200, 255], lost: [255, 150, 20] };
// Fréquence d'inondation : rouge (risque), de plus en plus opaque avec le nombre de dates en eau
export const frequencyRgba = (ratio) => [250, Math.round(70 - ratio * 40), Math.round(80 - ratio * 20), Math.round(110 + ratio * 145)];
