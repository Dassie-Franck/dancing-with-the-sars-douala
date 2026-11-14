/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        space: { 900: "#050b18", 800: "#0b1630", 700: "#13224a" },
        radar: { DEFAULT: "#22d3ee", dark: "#0891b2" },
      },
    },
  },
  plugins: [],
};