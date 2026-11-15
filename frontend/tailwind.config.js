/** @type {import('tailwindcss').Config} */
// Charte graphique : mêmes valeurs que la maquette « Dancing with the SARs — Douala ».
// Une couleur = un sens, partout dans l'application (eau, mangrove, bâti, végétation, saison sèche, risque).
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        space: { 900: "#050b18", 800: "#0b1630", 700: "#13224a" },
        radar: { DEFAULT: "#22d3ee", dark: "#0891b2" },
        sar: {
          bg: "#07090d", // fond « centre de contrôle »
          sf: "#12151b", // panneau
          sf2: "#1a1f27", // panneau secondaire
          line: "#222a35", // bordures
          ink: "#f1f5f9", // texte principal
          ink2: "#aab4c2", // texte secondaire
          mut: "#6b7686", // texte discret, étiquettes
          acc: "#19d3f3", // accent et état actif
          water: "#19d3f3", // eau
          mang: "#4ade80", // mangrove
          urb: "#a78bfa", // tissu urbain
          veg: "#fb923c", // végétation, eau nouvelle (contrat : orange)
          dry: "#facc15", // saison sèche
          ok: "#34d399",
          warn: "#fbbf24",
          bad: "#f43f5e", // risque
          oacc: "#03222a", // texte posé sur l'accent
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "Consolas", "monospace"],
      },
      borderRadius: { card: "16px" },
    },
  },
  plugins: [],
};
