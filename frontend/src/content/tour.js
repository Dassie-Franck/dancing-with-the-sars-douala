// CONTENU · Étapes de la démo guidée (support du script vidéo, L5). Modifiable sans toucher au code.
// action : mêmes champs que les boutons des pages (view, date, preset, tab, pair).

export const TOUR_STEPS = [
  { text: "Douala : des inondations à chaque saison des pluies, et un ciel presque toujours couvert.", action: { view: "tableau-de-bord" } },
  {
    text: "Le radar traverse les nuages. L’eau calme renvoie l’onde ailleurs : elle apparaît noire.",
    action: { view: "carte", date: "max", preset: { layers: { hh: { on: true, opacity: 0.95 }, water: false, newWater: false, freq: false }, focusQuartierId: null } },
  },
  {
    text: "Date après date, le masque d’eau montre où elle avance ; en orange, l’eau absente en saison sèche.",
    action: { view: "carte", date: "max", preset: { layers: { hh: { on: true, opacity: 0.7 }, water: true, newWater: true } } },
  },
  { text: "Saison sèche contre saison des pluies : glissez le curseur, ou passez en vue « Différence ».", action: { view: "comparer", pair: "contrast" } },
  { text: "La courbe chiffre le rythme hydrologique, et le seuil de détection reste un choix assumé.", action: { view: "analyse" } },
  { text: "Nous disons aussi ce que le radar ne voit pas.", action: { view: "comprendre", tab: "limites" } },
];
