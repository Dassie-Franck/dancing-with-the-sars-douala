# Contrat de données — v1.0, étendu en v2.0 (tâche 6, bloquante)

> **Version en vigueur : 2.0** (données livrées le 15 novembre 2026, dans `frontend/public/data/`).
> La v2.0 garde tout ce qui suit (bbox, grille 1400 × 1200, échelle [-30, 0] dB, saisons, PNG RGBA), avec ces différences :
>
> | Champ | v1.0 | v2.0 |
> |---|---|---|
> | `schema_version` | `"1.0"` | `"2.0"` |
> | Capteur | NISAR GCOV, bande L | **Sentinel-1 RTC (HyP3), bande C**, en attendant NISAR |
> | Rétrodiffusion | `layers.backscatter_hh`, `stats.mean_hh_db` | `layers.backscatter_vv`, `stats.mean_vv_db` (la polarisation se lit sur le nom de la couche) |
> | Seuil d'eau | `-18 dB` en HH | `threshold_default_db = -14 dB` en VV |
> | Nouveaux champs par date | — | `satellite` (`S1A`, `S1D`), `product`, `mock: false` |
> | Composites | — | `composites.json` facultatif : `{dry, rain}` avec `backscatter_vv` et `water_mask` |
>
> Le site et l'API acceptent les deux versions. Chemins d'image : toujours relatifs (`layers/….png`), sans `..` ni URL externe, sinon le manifest est refusé.
> Vérification : `python data-processing/scripts/validate_contract.py --strict`.

**Pourquoi ce document est bloquant** : l'équipe *données* (Python / Colab) produit des fichiers, l'équipe *frontend* (React / MapLibre / Recharts) les consomme. Tant que le format n'est pas figé, personne ne peut avancer en parallèle. Ce contrat fixe **exactement** ce qui est échangé. Il est accompagné de données factices conformes (`make_mock_data.py`) pour que le frontend démarre dès maintenant.

> **Règle d'or** : on ne change rien ici sans prévenir toute l'équipe (voir section 9).

---

## 1. Décisions figées

| Sujet | Valeur figée | Remarque |
|-------|--------------|----------|
| Zone d'étude (AOI) | `bbox = [9.55, 3.90, 9.90, 4.20]` (ouest, sud, est, nord) | ≈ 39 km × 33 km : Douala, estuaire du Wouri et mangroves |
| Système de coordonnées | `EPSG:4326` (lon/lat) | Tous les PNG sont nord en haut, alignés sur la bbox |
| Taille des images | `1400 × 1200` px (≈ 25 m/px), **identique pour tous les PNG** | Permet de superposer n'importe quelles couches sans recalcul |
| Source SAR | NISAR **GCOV** bande L, fréquence A (`HHHH`, option `HVHV`) | Puissance γ⁰ linéaire → convertie en dB |
| Échelle de rétrodiffusion | `[-30, 0] dB` → niveaux de gris 0–255 | `dB = -30 + (pixel/255) × 30` |
| Seuil d'eau par défaut | `HH < -18 dB` | **Hypothèse** à valider avec l'histogramme (cellule 9 du notebook) ; la valeur utilisée est écrite dans chaque acquisition |
| Saisons | `dry` = déc.–fév. ; `rain` = mars–nov. | Règle calculée sur le mois de la date |
| Identifiant d'acquisition | `id = date` (`YYYY-MM-DD`) | Une seule acquisition par date |
| Couverture minimale | `valid_fraction ≥ 0.90` | Sinon `partial = true` : exclue de la courbe |
| Source de vérité | `frontend/public/data/manifest.json` | La courbe (M3) est calculée à partir du manifest : pas de second fichier à synchroniser |

---

## 2. Arborescence livrée

```
frontend/public/data/
├── manifest.json
└── layers/
    ├── 2026-01-15_backscatter_hh.png
    ├── 2026-01-15_water_mask.png
    ├── 2026-07-26_backscatter_hh.png
    ├── 2026-07-26_water_mask.png
    ├── 2026-07-26_new_water_mask.png
    └── ...
```

Nom des fichiers : `layers/{date}_{couche}.png`, où `couche` ∈ `backscatter_hh`, `backscatter_hv`, `water_mask`, `new_water_mask`.

---

## 3. Les PNG

Tous : **RGBA 8 bits, 1400 × 1200 px**, poids cible < 3 Mo.

| Couche | Obligatoire | Contenu |
|--------|-------------|---------|
| `backscatter_hh` | oui | Gris = rétrodiffusion HH (échelle ci-dessus). **Alpha = 0** là où il n'y a pas de donnée |
| `water_mask` | oui | Cyan `(34,211,238)` semi-transparent (alpha 170) sur les pixels d'eau (`HH < seuil`), transparent ailleurs. Inclut l'eau **permanente** (estuaire) |
| `new_water_mask` | non (absent pour la scène de référence) | Orange `(251,146,60)` : eau présente à cette date **mais absente de la scène de référence saison sèche** = eau « nouvelle » (inondation probable) |
| `backscatter_hv` | non | Même format que `backscatter_hh` (utile pour la mangrove) |

---

## 4. `manifest.json` (schéma 1.0)

```json
{
  "schema_version": "1.0",
  "generated_at": "2026-11-14T10:00:00Z",
  "project": "dancing-with-the-sars-douala",
  "aoi": {
    "name": "Douala – estuaire du Wouri",
    "bbox": [9.55, 3.90, 9.90, 4.20],
    "crs": "EPSG:4326",
    "image_size": [1400, 1200]
  },
  "db_range": [-30, 0],
  "water_style": { "color": "#22d3ee", "opacity": 0.67 },
  "threshold_default_db": -18,
  "min_valid_fraction": 0.9,
  "reference_id": "2026-01-15",
  "acquisitions": [
    {
      "id": "2026-07-26",
      "date": "2026-07-26",
      "datetime_utc": "2026-07-26T05:30:00Z",
      "season": "rain",
      "orbit": "A",
      "polarizations": ["HH", "HV"],
      "product": "NISAR_L2_PR_GCOV_...",
      "maturity": "VALIDATED",
      "mock": false,
      "partial": false,
      "layers": {
        "backscatter_hh": "layers/2026-07-26_backscatter_hh.png",
        "water_mask": "layers/2026-07-26_water_mask.png",
        "new_water_mask": "layers/2026-07-26_new_water_mask.png"
      },
      "stats": {
        "water_area_km2": 139.03,
        "new_water_km2": 10.18,
        "water_fraction": 0.1,
        "valid_fraction": 1.0,
        "threshold_db": -18,
        "mean_hh_db": -11.2
      }
    }
  ]
}
```

| Champ | Type | Règle |
|-------|------|-------|
| `acquisitions` | liste | **Triée par date croissante**, non vide |
| `orbit` | `"A"` / `"D"` / `null` | Sens d'orbite. On garde une seule trace/orbite pour comparer des images comparables |
| `maturity` | `VALIDATED` / `PROVISIONAL` / `BETA` / `MOCK` | Niveau de maturité de la collection NISAR |
| `mock` | booléen | `true` = donnée factice : le frontend doit l'afficher clairement (bandeau « données de démonstration ») |
| `partial` | booléen | `valid_fraction < min_valid_fraction` |
| `stats.new_water_km2` | nombre ou `null` | `null` pour la scène de référence |
| `stats.water_area_km2` | nombre ≥ 0 | Surface d'eau totale (permanente + inondée) |

---

## 5. Règles de calcul (pour que les chiffres soient comparables)

1. **dB** : `10 · log10(HHHH)` ; pixels ≤ 0 ou non finis = sans donnée.
2. **Masque d'eau** : `HH_dB < threshold_db` sur les pixels valides.
3. **Surface** : somme des pixels d'eau × surface du pixel en km² (corrigée de `cos(latitude)` ligne par ligne sur la grille EPSG:4326). La même méthode sert à toutes les dates.
4. **Référence « eau permanente »** : la scène de saison sèche la plus complète (`reference_id`). `new_water` = eau à la date t **et** pas d'eau dans la référence.
5. **Reprojection** : UTM (grille native NISAR, 10–20 m) → EPSG:4326, interpolation bilinéaire en **puissance linéaire** (jamais en dB).
6. **Couverture partielle** : calculée sur la grille finale ; `< 0.90` → `partial = true`, exclue de la courbe.

---

## 6. Côté frontend (M1 / M2 / M3)

Tout passe par `frontend/src/lib/dataContract.js` :

```js
import { loadManifest, showLayer, waterSeries } from "../lib/dataContract";

const manifest = await loadManifest();           // M1 : liste des dates pour le sélecteur
const acq = manifest.acquisitions[2];
showLayer(map, manifest, acq, "water_mask");     // M2 : image géoréférencée sur MapLibre
const data = waterSeries(manifest);              // M3 : [{date, water, newWater, meanDb, season}]
```

Curseur avant/après : deux acquisitions du même `manifest`, mêmes coordonnées, même taille d'image.

---

## 7. Données factices → données réelles

```powershell
.\.venv\Scripts\Activate.ps1
python data-processing\scripts\make_mock_data.py          # régénère les données factices
python data-processing\scripts\validate_contract.py       # vérifie la conformité
```

Quand le notebook Colab a produit les vraies données : remplacer **tout** le contenu de `frontend/public/data/` (manifest + `layers/`) par la sortie du notebook, relancer `validate_contract.py`, puis commit. Rien ne change côté frontend.

---

## 8. Limites connues à afficher dans l'interface (honnêteté scientifique)

- Le seuil d'eau est une hypothèse, non validée sur le terrain.
- Marée, vent et zones urbaines peuvent fausser le masque (voir M4, onglet « Limites »).
- `new_water` dépend de la qualité de la scène de référence.
- Si la saison sèche manque, la référence est la scène la moins humide : à signaler dans le README.

---

## 9. Évolution du contrat

- Ajout d'un champ **optionnel** : version `1.x`, annonce sur le canal d'équipe.
- Changement de bbox, taille d'image, nom de fichier ou champ obligatoire : version `2.0`, **accord de tous**, et mise à jour simultanée de `validate_contract.py`, du notebook, de `make_mock_data.py` et de `dataContract.js`.

## 10. Validation avant le gel (à cocher en équipe)

- [ ] AOI validée sur la carte (Douala, Wouri, mangroves visibles, pas trop d'océan)
- [ ] Taille d'image 1400 × 1200 acceptée (fluidité sur mobile)
- [ ] Seuil `-18 dB` discuté, ou remplacé par la valeur choisie dans le notebook
- [ ] Règle des saisons confirmée
- [ ] Le frontend charge les données factices sans erreur
- [ ] `validate_contract.py` passe au vert
- [ ] Contrat annoncé « gelé » à toute l'équipe
