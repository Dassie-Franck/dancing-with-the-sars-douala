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
│   └── geo.js             Grille EPSG:4326 : surface des pixels, conversions lon/lat <-> pixel
│
├── application/       Ce que l'application fait, sans savoir comment les données arrivent
│   ├── ports.js           Contrats : SarRepository, MaskReader, QuartierRepository
│   └── useCases.js        loadCatalog, compareAcquisitions, quartierExposure
│
├── infrastructure/    Adaptateurs : la seule couche qui connaît fichiers, URL et API
│   ├── contract/manifestMapper.js     Contrat v1.0 (manifest.json) -> modèle du domaine
│   ├── static/staticSarRepository.js  Lit public/data/manifest.json (données factices)
│   ├── api/apiSarRepository.js        Lit l'API FastAPI, repli statique après 3 s (K13)
│   ├── static/staticQuartierRepository.js   Liste des quartiers suivis
│   ├── browser/canvasMaskReader.js    Décode les PNG de masques en pixels
│   └── maplibre/worker.js             Réglage technique de MapLibre avec Vite
│
├── app/               Racine de composition et liaison React
│   ├── container.js       Choisit les adaptateurs (variables d'environnement)
│   └── services.jsx       ServicesProvider + hooks : useCatalog, useComparison, useQuartierExposure
│
├── ui/                Présentation commune : couleurs de la charte, libellés, formats français
└── components/        Composants React : affichent, ne calculent pas
```

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

### Cas 1 : l'API renvoie le manifest au format du contrat v1.0

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
  maskReader: { readWaterMask: async () => new Uint8Array(1400 * 1200) },
  quartierRepository: { listQuartiers: async () => [] },
});
const catalog = await uc.loadCatalog();
```

## Ressources statiques

- `public/brand/logo-dancing-with-the-sars.svg` : logo animé du projet, affiché par `components/brand/Logo.jsx` (accueil et barre latérale) et utilisé comme icône d'onglet dans `index.html`.

## Fichiers hors de cette architecture

`components/globe/` (écran d'accueil), `components/MapView.jsx` (carte principale) et `lib/dataContract.js` appartiennent aux autres membres de l'équipe. `dataContract.js` n'est plus utilisé par le tableau de bord ni par Comparer : `infrastructure/contract/manifestMapper.js` le remplace pour la lecture du contrat.
