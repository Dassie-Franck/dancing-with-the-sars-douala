# Architecture du frontend

Le frontend suit une **architecture hexagonale** (ports et adaptateurs). Les règles métier ne dépendent ni de React, ni de la source des données. Remplacer les données factices par le backend ne touche que la couche `infrastructure/`, ou une simple variable d'environnement.

```
src/
├── domain/            Règles métier pures : aucun React, aucun fetch, aucun format de fichier
│   ├── model.js           Objets métier (StudyArea, Acquisition, Quartier)
│   ├── season.js          Saisons : sèche = déc.–fév., pluies = mars–nov.
│   ├── waterStats.js      Min / max / variation saisonnière, préréglage saisons, niveau de crue
│   ├── waterChange.js     Eau gagnée / rendue entre deux masques
│   ├── exposure.js        Exposition des quartiers, seuils de risque
│   ├── backscatter.js     Gris -> dB, lecture physique d'une valeur, histogramme, seuil d'Otsu
│   ├── frequency.js       Fréquence d'inondation par pixel (hors eau permanente)
│   ├── sensor.js          Capteur déduit des données (Sentinel-1 bande C, NISAR bande L…)
│   └── geo.js             Grille EPSG:4326 : surface des pixels, conversions lon/lat <-> pixel
│
├── application/       Ce que l'application fait, sans savoir comment les données arrivent
│   ├── ports.js           Contrats : SarRepository, RasterReader, QuartierRepository
│   └── useCases.js        loadCatalog, listQuartiers, compareAcquisitions, quartierExposure,
│                          floodFrequencyMap, thresholdStudy, probePoint
│
├── infrastructure/    Adaptateurs : la seule couche qui connaît fichiers, URL et API
│   ├── contract/manifestMapper.js     Contrat 1.0 / 2.0 (manifest.json, composites.json) -> modèle, avec validation
│   ├── static/staticSarRepository.js  Lit public/data/manifest.json (données factices)
│   ├── api/apiSarRepository.js        Lit l'API FastAPI, repli statique après 3 s (K13)
│   ├── static/staticQuartierRepository.js   Liste des quartiers suivis
│   ├── browser/canvasRasterReader.js  Décode les PNG : masques d'eau et rétrodiffusion HH (dB)
│   └── maplibre/worker.js             Réglage technique de MapLibre avec Vite
│
├── app/               Racine de composition et liaison React
│   ├── container.js       Choisit les adaptateurs (variables d'environnement)
│   └── services.jsx       ServicesProvider + hooks : useCatalog, useComparison, useQuartierExposure,
│                          useQuartiers, useFloodFrequency, useThresholdStudy, useProbe, useDataSource
│
├── content/           Textes et données éditoriales, modifiables sans toucher au code (C6)
│   ├── radar.js           « Ce que voit le radar » (M4) : textes, schémas SVG, boutons
│   └── tour.js            Étapes de la démo guidée
│
├── i18n/              Langue de l'interface : I18nProvider, useI18n(), en.js (traductions anglaises)
├── ui/                Présentation commune : couleurs de la charte, libellés, formats (fr ou en)
└── components/        Composants React : affichent, ne calculent pas
    ├── dashboard/         Tableau de bord (globe -> secteur, indicateurs, courbe, quartiers)
    ├── observatoire/      Carte MapLibre : calques, légende, inspection, chronologie (M1, M2)
    ├── compare/           Comparer deux dates : rideau et différence (F11, F12)
    ├── analyse/           Courbe, atelier du seuil, exposition par date, export (M3)
    ├── learn/             « Ce que voit le radar » (M4)
    ├── tour/              Démo guidée
    ├── map/               Outils MapLibre partagés (fond de carte, images géoréférencées)
    ├── globe/, brand/     Écran d'accueil et logo
```

## Pages

| Page | Composant | Tâches |
|---|---|---|
| Tableau de bord | `dashboard/Dashboard.jsx` | F13, F14, F16, globe -> secteur, quartiers |
| Observatoire SAR | `observatoire/ObservatoirePage.jsx` | F3, F6–F10, F15, F18, K14 |
| Comparer deux dates | `compare/ComparePage.jsx` | F11, F12 |
| Analyse | `analyse/AnalysePage.jsx` | M3, atelier du seuil, export `water_series.json` |
| Ce que voit le radar | `learn/RadarExplainer.jsx` | C1–C6 |

L'état partagé (date choisie, dates comparées, réglages de la carte, onglet) vit dans `App.jsx` (F4). Les boutons de « Ce que voit le radar » et la démo guidée passent par une seule fonction, `runAction({ view, date, preset, tab, pair })`. Les pages autres que le tableau de bord sont chargées à la demande (F18).

## Règle de dépendance

```
components / ui  ->  app (hooks)  ->  application  ->  domain
                     app (container)  ->  infrastructure  ->  application (ports), domain (modèle)
```

- `domain/` n'importe rien d'autre que `domain/`.
- `application/` n'importe que `domain/`.
- `infrastructure/` implémente les ports. Elle n'est jamais importée par l'interface.
- `components/` obtient ses données par les hooks de `app/services.jsx`. Elle peut utiliser les fonctions pures du domaine (par exemple `floodLevel`) et les formats de `ui/`.

Ces règles sont **vérifiées par ESLint** (`no-restricted-imports` dans `eslint.config.js`) : `npm run lint` échoue si une couche importe une couche extérieure.

## Brancher le backend

### Cas 1 : l'API renvoie le manifest au format du contrat (1.0 ou 2.0)

Aucun code à modifier. Il suffit de créer `frontend/.env.local` :

```
VITE_DATA_SOURCE=api
VITE_API_URL=http://localhost:8000
```

Le frontend appelle `GET /api/manifest`. Si l'API ne répond pas en 3 s, il relit `public/data/manifest.json` et l'indique dans la console.

### Cas 2 : la route ou la forme de la réponse diffère

On modifie **uniquement** `src/infrastructure/api/apiSarRepository.js` :

- `ENDPOINTS.catalog` pour le chemin de la route ;
- l'option `toCatalog` pour la forme de la réponse : écrire un mapper qui renvoie le même `RawCatalog` que `manifestToCatalog`.

Le domaine, les cas d'usage et les composants ne bougent pas.

### Cas 3 : le backend calcule lui-même l'exposition ou les différences

On écrit un nouvel adaptateur (ou un cas d'usage alternatif) qui renvoie les mêmes formes que `quartierExposure` / `compareAcquisitions`, et on le branche dans `app/container.js`.

## Remplacer les données factices par les vraies données du notebook

Il suffit de remplacer le contenu de `public/data/` (manifest + `layers/`), comme le prévoit `docs/CONTRAT_DONNEES.md`. Aucune modification de code.

## Tester les règles métier

Le domaine et les cas d'usage sont des fonctions pures ou injectables : on les teste en passant de faux adaptateurs en mémoire, sans navigateur. Par exemple :

```js
const uc = createUseCases({
  sarRepository: { getCatalog: async () => fakeCatalog },
  rasterReader: {
    readWaterMask: async () => new Uint8Array(1400 * 1200),
    readBackscatterDb: async () => new Float32Array(1400 * 1200).fill(-8),
  },
  quartierRepository: { listQuartiers: async () => [] },
});
const catalog = await uc.loadCatalog();
```

## Ressources statiques

- `public/brand/logo-dancing-with-the-sars.svg` : logo animé du projet, affiché par `components/brand/Logo.jsx` (accueil et barre latérale) et utilisé comme icône d'onglet dans `index.html`.

## Fichiers hors de cette architecture

`components/globe/` (écran d'accueil, bonus B1) lit seulement ses textures dans `public/globe/`.

## Données réelles (contrat 2.0)

Le site affiche les acquisitions Sentinel-1 (VV, bande C) livrées par le notebook. Le capteur, la polarisation et le satellite sont lus dans le manifest : aucun libellé « HH » ou « NISAR » n'est écrit en dur. Quand les produits NISAR (HH, bande L) arriveront, il suffira de remplacer `public/data/`. Les composites saisonniers (`composites.json`, facultatif) alimentent le mode « Composites saisonniers » de la page Comparer.

## Traduction (français / anglais)

Le sélecteur FR | EN est sur l'écran d'accueil et dans l'en-tête ; le choix est mémorisé. Le texte français reste écrit dans les composants et sert de clé : `t("Eau détectée")`. Sa traduction est dans `src/i18n/en.js`. Les dates et les nombres suivent la langue (`ui/format.js`).

Pour ajouter un texte : l'écrire en français dans `t("…")`, ajouter la ligne anglaise dans `en.js`, puis lancer `npm run check:i18n`. Le script signale les traductions manquantes, les `{variables}` différentes et le texte resté en dur dans le JSX.
