# Accès Earthdata (tâche 5)

Les produits NISAR sont distribués gratuitement par l'**ASF DAAC** via NASA Earthdata. Chaque membre qui lance le notebook a besoin de **son propre compte et de son propre jeton**.

## 1. Créer le compte (≈ 3 min)

1. Aller sur https://urs.earthdata.nasa.gov → **Register** (gratuit).
2. Confirmer l'e-mail, puis se connecter.

## 2. Générer le jeton (JWT)

1. Connecté sur https://urs.earthdata.nasa.gov, ouvrir **Generate Token** (menu du profil).
2. Cliquer **Generate Token** et copier la valeur.
3. Le jeton **expire** (environ 60 jours) : le régénérer si l'authentification échoue plus tard.

> Si l'accès aux données renvoie une erreur 401/403, vérifier dans votre profil Earthdata, rubrique **Applications → Authorized Apps**, que l'application *Alaska Satellite Facility Data Access* est bien approuvée (**Approve More Applications**).

## 3. Utiliser le jeton dans Google Colab

1. Ouvrir le notebook `01_nisar_douala_pipeline.ipynb` dans Colab (Fichier → Importer un notebook).
2. Menu de gauche → icône 🔑 **Secrets** → **Ajouter un secret**.
3. Nom : `EARTHDATA_TOKEN` — Valeur : le jeton — activer **Accès au notebook**.
4. Exécuter la cellule 3 : elle doit afficher `Authentifié : True`, un granule de test et une signature de fichier contenant `HDF`.

Alternative sans jeton : secrets `EARTHDATA_USERNAME` et `EARTHDATA_PASSWORD`.

**Ne jamais** coller le jeton dans une cellule, un notebook partagé, un commit ou un message d'équipe. Jeton exposé → le régénérer immédiatement sur Earthdata.

## 4. Utiliser le jeton en local (PowerShell)

```powershell
Copy-Item .env.example .env
notepad .env        # EARTHDATA_TOKEN=votre_jeton
```

Le fichier `.env` est dans `.gitignore` et ne doit jamais être commité.

```python
import os, earthaccess
from dotenv import load_dotenv
load_dotenv()                               # charge EARTHDATA_TOKEN depuis .env
earthaccess.login(strategy="environment")
```

## 5. Vérifier qu'il existe des données sur Douala

- Interface web : https://search.asf.alaska.edu → Dataset **NISAR** → Science Product **GCOV** → dessiner un rectangle autour de Douala → regarder le nombre d'acquisitions et leurs dates.
- Dans le notebook : cellules 4 et 5 (recherche et sélection). Chercher **plusieurs dates en saison sèche (déc.–fév.) ET en saison des pluies**.

Collections GCOV utilisées (de la plus à la moins mature) : `NISAR_L2_GCOV_V1` (validée), `NISAR_L2_GCOV_PROVISIONAL_V1`, `NISAR_L2_GCOV_BETA_V1`.

## 6. Problèmes fréquents

| Symptôme | Piste |
|----------|-------|
| `Authentifié : False` | Jeton expiré ou mal copié → régénérer ; vérifier le nom du secret `EARTHDATA_TOKEN` et l'accès notebook activé |
| 401 / 403 au téléchargement | Application ASF non approuvée (voir section 2) |
| 0 granule trouvé | Élargir `START_DATE`, vérifier la bbox (longitude avant latitude), essayer la collection BETA/PROVISIONAL |
| Très peu de dates | Données disponibles limitées : le dire dans le README ; Sentinel-1 peut servir de secours (à annoncer comme tel) |
| Lecture lente | Normal : le notebook ne lit en streaming que la zone utile ; relancer la cellule |

## 7. Ressources

- Guide utilisateur NISAR : https://nisar-docs.asf.alaska.edu
- Recherche : https://search.asf.alaska.edu et https://search.earthdata.nasa.gov
- Support : https://forum.earthdata.nasa.gov
