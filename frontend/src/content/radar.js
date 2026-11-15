// CONTENU · « Ce que voit le radar » (M4 : tâches C1 à C5). Textes modifiables sans toucher au code (C6).
// Les schémas sont des SVG ; leurs classes (f-w, s-a…) reprennent les couleurs de la charte (index.css, .sar-schema).
// action : bouton qui ouvre une autre page avec des réglages ; preset = calques de l'observatoire,
// date = "max" (pic de crue) ou "min" (étiage).

const SAT =
  '<g transform="translate(40,26)"><rect x="-13" y="-6" width="26" height="12" rx="2" class="f-a"/><rect x="-36" y="-4" width="20" height="8" class="f-mut"/><rect x="16" y="-4" width="20" height="8" class="f-mut"/></g>';

export const RADAR_TOPICS = [
  {
    id: "miroir",
    tab: "Effet miroir",
    title: "L’eau calme est un miroir : elle apparaît noire",
    paragraphs: [
      "Le radar émet lui-même une onde et mesure ce qui lui revient. Une surface d’eau calme se comporte comme un miroir : elle renvoie presque toute l’onde dans la direction opposée au satellite. Très peu de signal revient, et l’eau s’affiche en noir.",
      "Une ville fait l’inverse. Les murs et le sol forment des angles droits qui renvoient l’onde vers le capteur : les quartiers bâtis brillent. Ce contraste entre eau sombre et ville claire permet de suivre l’avancée de l’eau.",
    ],
    example:
      "À Douala : le Wouri reste sombre à toutes les dates. Les surfaces qui s’assombrissent pendant la saison des pluies sont celles que l’eau a gagnées.",
    action: { label: "Voir l’image radar HH", view: "carte", preset: { layers: { hh: true, water: false, newWater: false, freq: false } } },
    schema: `<svg viewBox="0 0 420 300">${SAT}<rect x="0" y="220" width="210" height="80" class="f-w" opacity=".35"/><rect x="210" y="220" width="210" height="80" class="f-s2"/><rect x="290" y="150" width="46" height="70" class="f-mut"/><rect x="345" y="175" width="36" height="45" class="f-mut"/><path class="wv s-w" d="M50 36 130 220" stroke-width="2.5" fill="none"/><path class="wv s-w" d="M130 220 205 60" stroke-width="2.5" fill="none" opacity=".5"/><path class="wv s-a" d="M56 34 262 220 290 190" stroke-width="2.5" fill="none"/><path class="wv s-a" d="M296 184 68 32" stroke-width="2" fill="none" opacity=".6"/><text x="105" y="250" text-anchor="middle">eau calme</text><text x="105" y="268" text-anchor="middle" class="f-w">≈ −23 dB · noir</text><text x="315" y="250" text-anchor="middle">ville</text><text x="315" y="268" text-anchor="middle" class="f-a">≈ −5 dB · clair</text><text x="212" y="52">l'onde repart ailleurs</text></svg>`,
  },
  {
    id: "nuages",
    tab: "Nuages",
    title: "Sous l’équateur, l’optique est aveugle une bonne partie de l’année",
    paragraphs: [
      "Un satellite optique photographie la lumière du soleil réfléchie par le sol. Quand le ciel est couvert, il photographie le dessus des nuages. Sur la côte camerounaise, c’est le cas presque en continu pendant la saison des pluies, précisément quand les inondations surviennent.",
      "Le radar utilise des micro-ondes, qui traversent les nuages et la pluie, et il fournit son propre éclairage : il mesure de jour comme de nuit, à chaque passage.",
    ],
    example: "Essayez : ouvrez la carte à la date du pic de crue. L’image radar reste lisible, alors que le ciel de Douala est alors presque toujours couvert.",
    action: { label: "Voir le pic de crue au radar", view: "carte", date: "max", preset: { layers: { hh: true, water: true, newWater: true } } },
    schema: `<svg viewBox="0 0 420 300"><line x1="210" y1="10" x2="210" y2="290" class="s-l"/><text x="105" y="22" text-anchor="middle" class="f-i" style="font-size:13px">Optique</text><text x="315" y="22" text-anchor="middle" class="f-i" style="font-size:13px">Radar</text><circle cx="40" cy="60" r="16" class="f-d"/><g class="f-mut" opacity=".55"><ellipse cx="105" cy="130" rx="80" ry="20"/><ellipse cx="315" cy="130" rx="80" ry="20"/></g><rect x="10" y="240" width="190" height="50" class="f-s2"/><rect x="220" y="240" width="190" height="50" class="f-s2"/><rect x="250" y="240" width="90" height="50" class="f-w" opacity=".4"/><path class="wv s-d" d="M52 70 100 118" stroke-width="2.5" fill="none"/><path class="wv s-d" d="M104 114 160 50" stroke-width="2.5" fill="none"/><g transform="translate(210,20)">${SAT}</g><path class="wv s-a" d="M262 58 300 240" stroke-width="2.5" fill="none"/><path class="wv s-a" d="M360 240 268 56" stroke-width="2" fill="none" opacity=".6"/><text x="105" y="170" text-anchor="middle">la lumière s'arrête aux nuages</text><text x="315" y="170" text-anchor="middle">les micro-ondes traversent</text><text x="105" y="270" text-anchor="middle">sol invisible</text><text x="370" y="270" text-anchor="middle">sol mesuré</text></svg>`,
  },
  {
    id: "polarisations",
    tab: "Polarisations HH et HV",
    title: "Deux façons d’écouter le même écho",
    paragraphs: [
      "<b>HH</b> : l’onde est émise et reçue à l’horizontale. Elle réagit fortement au double rebond entre le sol et une paroi verticale, comme un mur ou un tronc qui a les pieds dans l’eau.",
      "<b>HV</b> : l’onde est émise à l’horizontale et reçue à la verticale. Seuls les milieux qui brouillent l’onde en tous sens, comme un feuillage dense, en renvoient beaucoup.",
    ],
    example:
      "À Douala : en HH, les immeubles d’Akwa et de Bonanjo ressortent très clairs. En HV, la ville s’efface et ce sont les mangroves et la forêt qui dominent. Les cartes actuelles affichent HH ; la couche HV est prévue par le contrat de données.",
    action: { label: "Voir la rétrodiffusion HH", view: "carte", preset: { layers: { hh: true, water: false, newWater: false } } },
    schema: `<svg viewBox="0 0 420 300"><text x="105" y="22" text-anchor="middle" class="f-i" style="font-size:13px">HH · double rebond</text><text x="315" y="22" text-anchor="middle" class="f-i" style="font-size:13px">HV · volume</text><line x1="210" y1="10" x2="210" y2="290" class="s-l"/><rect x="10" y="230" width="190" height="60" class="f-w" opacity=".35"/><rect x="130" y="110" width="44" height="120" class="f-mut"/><path class="wv s-a" d="M20 50 105 230 130 180" stroke-width="2.5" fill="none"/><path class="wv s-a" d="M130 170 34 44" stroke-width="2" fill="none" opacity=".6"/><text x="105" y="272" text-anchor="middle">sol ou eau, puis mur</text><rect x="220" y="230" width="190" height="60" class="f-s2"/><g class="f-m" opacity=".8"><circle cx="290" cy="150" r="34"/><circle cx="335" cy="135" r="38"/><circle cx="372" cy="160" r="30"/></g><g class="s-mut" stroke-width="5"><path d="M290 180v50M335 170v60M372 188v42"/></g><path class="wv s-i" d="M232 46 318 140" stroke-width="2.5" fill="none"/><g class="s-i" stroke-width="1.5" opacity=".7"><path d="M318 140 290 100M318 140 350 96M318 140 380 128M318 140 268 132M318 140 246 58"/></g><text x="315" y="272" text-anchor="middle">diffusion en tous sens</text></svg>`,
  },
  {
    id: "bande-l",
    tab: "Bande L et mangroves",
    title: "Voir l’eau sous les arbres",
    paragraphs: [
      "NISAR observe en bande L, avec une longueur d’onde d’environ 24 cm. Une onde aussi longue est peu arrêtée par les feuilles et les petites branches : elle traverse le feuillage et atteint le sol ou l’eau qui se trouve dessous.",
      "Quand la mangrove est inondée, l’onde rebondit sur l’eau puis sur les troncs et revient renforcée en HH. La mangrove inondée devient donc plus claire, pas plus sombre : elle ne se détecte pas avec le même seuil que l’eau libre.",
    ],
    example:
      "Dans l’estuaire du Wouri, le masque d’eau actuel ne compte que l’eau libre (pixels sombres). L’eau sous la mangrove demande un traitement dédié, prévu dans une version ultérieure du pipeline.",
    action: { label: "Voir l’estuaire au radar", view: "carte", preset: { layers: { hh: true, water: true, newWater: false } } },
    schema: `<svg viewBox="0 0 420 300">${SAT}<rect x="0" y="240" width="420" height="60" class="f-w" opacity=".35"/><g class="f-m" opacity=".8"><ellipse cx="150" cy="150" rx="70" ry="34"/><ellipse cx="260" cy="145" rx="80" ry="38"/><ellipse cx="350" cy="155" rx="60" ry="32"/></g><g class="s-mut" stroke-width="5" fill="none"><path d="M150 180v60M150 215l-14 25M150 215l14 25M260 180v60M260 212l-16 28M260 212l16 28M350 184v56"/></g><path class="wv s-a" d="M52 36 232 240 260 205" stroke-width="2.5" fill="none"/><path class="wv s-a" d="M254 200 58 30" stroke-width="2" fill="none" opacity=".6"/><text x="210" y="272" text-anchor="middle">eau sous la mangrove</text><text x="210" y="290" text-anchor="middle" class="f-a">λ ≈ 24 cm : l'onde traverse le feuillage</text></svg>`,
  },
  {
    id: "limites",
    tab: "Limites",
    title: "Ce que cette carte ne dit pas",
    limits: [
      ["Le vent ride l’eau.", "Une surface agitée renvoie plus de signal et peut passer au-dessus du seuil : une partie de l’eau n’est alors plus comptée."],
      ["Faux positifs.", "Pistes d’aéroport, routes lisses, ombres radar et grands toits plats sont sombres eux aussi et peuvent être classés « eau »."],
      ["La ville dense masque l’inondation.", "Entre les bâtiments, les échos des murs dominent : une rue inondée peut rester invisible."],
      ["Le passage du satellite.", "Une crue brève qui survient entre deux acquisitions n’est jamais observée."],
      ["Le seuil est un choix.", "La surface en km² dépend du seuil retenu. Il est le même pour toutes les dates : l’évolution est fiable même si la valeur absolue se discute."],
      ["Mangrove inondée.", "En bande L elle s’éclaircit au lieu de s’assombrir : le masque d’eau libre ne la compte pas."],
    ],
    action: { label: "Essayer l’atelier du seuil", view: "analyse" },
    schema: `<svg viewBox="0 0 420 300"><text x="20" y="24" class="f-i" style="font-size:13px">Histogramme et seuil</text><line x1="30" y1="250" x2="400" y2="250" class="s-mut"/><path d="M30 250C70 250 80 120 110 120S150 250 190 240 230 60 280 60 340 250 400 250Z" class="f-w s-w" fill-opacity=".18"/><rect x="150" y="196" width="48" height="54" class="f-a" opacity=".2"/><line x1="174" y1="40" x2="174" y2="250" class="s-a" stroke-width="2"/><text x="180" y="52" class="f-a">seuil ≈ −18 dB</text><text x="174" y="188" text-anchor="middle">zone ambiguë</text><text x="105" y="105" text-anchor="middle">eau</text><text x="290" y="46" text-anchor="middle">terre, végétation, bâti</text><text x="30" y="270">−30 dB</text><text x="400" y="270" text-anchor="end">0 dB</text><text x="210" y="292" text-anchor="middle">eau ridée, pistes, ombres, toits plats</text></svg>`,
  },
];
