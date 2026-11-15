# Notes sur les données radar — Douala (D1 → D5)

Source retenue : **Sentinel-1** (bande C), piste 132, calibré par HyP3. NISAR a été étudié en premier (D2) et sert de vitrine ; il ne couvre pas la saison sèche sur les pistes qui recouvrent bien Douala (voir section 3).

## 1. Zone d'étude (D1)

- Fichier : `../aoi/douala_aoi.geojson` (centre 4.02295 N / 9.60535 E, rayon 36 965 m, bbox 9.2721, 3.69052, 9.9386, 4.35538).
- Les traitements et les PNG utilisent la **bbox du contrat de données** : [9.55, 3.90, 9.90, 4.20] (ouest, sud, est, nord), EPSG:4326, 1400 × 1200 px.

## 2. Inventaire NISAR (D2)

Notebook : `02_d2_recherche_nisar.ipynb` → `inventaire_nisar_douala.csv` (recherche ASF, 2025-08-01 → 2026-11-15).

| Élément | Valeur |
|---|---|
| Acquisitions | 620 scènes, 51 dates (2025-11-04 → 2026-11-11) |
| Produits | RSLC 124, GSLC 124, GCOV 124, SME2 106, GUNW 96, RRSD 46 |
| Pistes | 58 et 159 (ascendantes), 22 et 94 (descendantes) |
| Polarisation | colonne vide ; lue dans le nom de scène : `DHDH` (HH+HV) 399 scènes, `SHSH` 79 |
| Versions | BETA : nov. 2025 → janv. 2026 ; PROVISIONAL : juin → oct. 2026 |
| Trou de données | 2026-07-27 → 2026-08-10 |

Couverture de la grande zone (GCOV, ≈ 7 Go par scène) :

| Piste | Sens | Couverture | Dates | Période |
|---|---|---|---|---|
| 58 | ascendant | ≈ 100 % | 11 | 2026-06-18 → 2026-10-28 |
| 22 | descendant | ≈ 100 % | 11 | 2026-06-27 → 2026-11-06 |
| 159 | ascendant | ≈ 50 % | 10 | 2026-06-25 → 2026-10-23 |
| 94 | descendant | ≈ 5 % | 16 | 2025-11-04 → 2026-10-30 |

## 3. Pourquoi Sentinel-1 (D6, plan B)

- Aucune image NISAR à bonne couverture en saison sèche (déc.–févr.) : les pistes 58 et 22 démarrent en juin 2026, la piste 94 ne couvre que 5 % de la zone.
- Les scènes GCOV pèsent environ 7 Go chacune.
- ASF indique que les données NISAR de sept. 2025 à juil. 2026 sont retraitées et publiées progressivement jusqu'à fin 2026 : la saison sèche NISAR pourrait apparaître plus tard (à surveiller en relançant D2).

## 4. Inventaire Sentinel-1 (D6)

Notebook : `06_d6_recherche_sentinel1.ipynb` → `inventaire_s1_douala.csv` (GRD haute résolution, mode IW, bbox du contrat, 2025-11-01 → 2026-11-15).

| Élément | Valeur |
|---|---|
| Scènes | 109 scènes, 77 dates (2025-11-04 → 2026-11-12), polarisation **VV+VH** |
| Piste 132 (ascendante) | 31 scènes, 31 dates, **100 % de la bbox**, ≈ 1 Go chacune, un passage tous les 12 jours (vers 17 h 36 UTC) |
| Piste 51 (descendante) | 78 scènes, bbox couverte par deux scènes avant juin 2026 : plus lourde à traiter, non retenue |
| Satellites (piste 132) | Sentinel-1A jusqu'au 2026-06-25, puis Sentinel-1D à partir du 2026-07-02 |

## 5. Choix des dates (D3)

Piste 132, même orbite et même polarisation. 16 dates traitées :

- **Saison sèche (S1A)** : 2025-12-03, 2025-12-15, 2025-12-27, 2026-01-08, 2026-02-01, 2026-02-13, 2026-02-25.
- **Saison des pluies (S1D)** : 2026-07-02, 2026-07-14, 2026-08-07, 2026-08-19, 2026-09-12, 2026-09-24, 2026-10-18, 2026-10-30.
- **Contrôle S1A/S1D** : 2026-06-25 (S1A) et 2026-07-02 (S1D).

> À valider en point d'équipe (condition « Fini quand » de D3).

## 6. Produit et polarisations (D4)

- **Produit** : Sentinel-1 GRD haute résolution, mode IW, **calibré RTC γ⁰ en puissance, 30 m**, par HyP3 (ASF). Les scènes brutes ne sont pas téléchargées.
- **Polarisations** : VV (utilisée pour la rétrodiffusion et l'eau) et VH (disponible).
- **Traitement** : reprojection sur la grille du contrat (EPSG:4326, 1400 × 1200), moyenne en **puissance linéaire**, conversion en dB, échelle [-30, 0] dB.
- **Seuil d'eau** : VV < **-14 dB**, identique pour toutes les dates. Il vient de l'histogramme des 16 dates réelles (pic de l'eau vers -17 dB, creux vers -13 dB). Le seuil du contrat v1.0 (HH < -18 dB) est celui de NISAR bande L et ne s'applique pas à Sentinel-1.
- **Notebook de traitement** : `05_d5_traitement_sentinel1.ipynb` (HyP3, recadrage, couches par date, composites, zone de démarcation).

## 7. Résultats

| Mesure | Valeur |
|---|---|
| Surface d'eau libre par date | 202 à 212 km² (une date plus basse : 178,5 km² le 2026-02-25) |
| Eau permanente (estimation sur les PNG) | ≈ 154 km² |
| Marge variable | ≈ 64 km² |
| Zone de démarcation (en eau entre 10 % et 90 % des dates) | ≈ 18 km² |
| Écart de rétrodiffusion de l'eau, pluies − sèche (marée comparable) | ≈ -1 dB |

## 8. Limites

- L'étendue d'eau libre est quasi identique entre saisons ; le signal saisonnier se limite à un écart d'environ 1 dB sur l'eau, qui mélange saison, **vent** et marée.
- La **marée n'est pas mesurée** : une estimation modélisée (Open-Meteo, point côtier) varie de -0,42 à +1,15 m aux heures de passage. Elle est peu fiable dans l'estuaire.
- Entre la sèche (S1A) et les pluies (S1D), un **décalage entre satellites** de l'ordre de 0,3 dB est probable ; il est à mesurer (section 9 du notebook D5).
- Un seuil sur l'eau sombre ne voit pas les **zones inondées sous végétation ou en ville** (rebond double).
- Le masque inclut une partie de l'**océan Atlantique** (coin sud-ouest de la bbox).
- Le filtrage du speckle par date (D10) et la vérification du masque sur OpenStreetMap (D12) ne sont pas encore faits.

## 9. Règles de comparaison

Deux dates ne sont comparables que si elles ont la même piste, le même sens d'orbite et la même polarisation. Pour NISAR, elles doivent aussi avoir le même niveau de maturité des données.

## 10. Questions ouvertes

- [ ] Contrat de données v2.0 : accepter `backscatter_vv`, les composites et le nouveau seuil ; mettre à jour `validate_contract.py` et `dataContract.js`.
- [ ] Saison des pluies : mars–nov. (contrat) ou juil.–sept. (document de tâches) ?
- [ ] Mesurer et corriger le décalage S1A/S1D.
- [ ] Obtenir des mesures de marée (Port Autonome de Douala, LEGOS, Shom/REFMAR).
- [ ] Évaluer les produits OPERA (RTC-S1, DSWx-S1) sur Douala.

> Sécurité : le jeton Earthdata reste dans les Secrets Colab (`EARTHDATA_TOKEN`), jamais dans un notebook ni un commit.
