# API - Dancing with the SARs (Douala)

Petit serveur FastAPI qui donne au site (React) les résultats du traitement des images radar (aujourd'hui Sentinel-1 VV, bande C ; NISAR ensuite).
Toutes les routes sont en lecture seule.

## Lancer en local (Windows)

```
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Puis ouvrir http://127.0.0.1:8000/docs : on y voit toutes les routes et on peut les tester avec « Try it out ».
(Si PowerShell refuse `activate`, utiliser cmd.)

## Lancer les tests

```
python -m pytest
```

## Les routes

| Route | Rôle |
|---|---|
| `GET /api/health` | L'API est-elle en ligne ? Indique aussi si les données sont des exemples. |
| `GET /api/acquisitions` | Liste des dates. Filtre facultatif : `?periode=pluies` |
| `GET /api/acquisitions/{date}` | Détail d'une date (format AAAA-MM-JJ), 404 si inconnue |
| `GET /api/water-series` | Courbe de la surface en eau. Filtres : `?start=2026-08-01&end=2026-08-31` |
| `GET /api/stats` | Chiffres clés (min, max, variation en %, moyenne par période) |

## Où sont les fichiers ?

| Fichier | Rôle |
|---|---|
| `app/models.py` | Le contrat : la forme exacte des données (Pydantic) |
| `app/store.py` | Lit `manifest.json` et `water_series.json` au démarrage et vérifie leur cohérence |
| `app/routers/acquisitions.py` | Routes des dates |
| `app/routers/series.py` | Routes de la courbe et des statistiques |
| `app/main.py` | Crée l'application, règle CORS, branche les routes |
| `app/data/` | Les deux fichiers de données |
| `tests/test_api.py` | Tests automatiques |

## Les données

L'API lit `manifest.json` (contrat 2.0) dans `DATA_DIR`, sinon dans `app/data/`, sinon dans `../frontend/public/data/`.
Les vraies données Sentinel-1 sont dans `frontend/public/data/` : par défaut, l'API et le site lisent donc le même fichier.
La courbe (`/api/water-series`) et les chiffres (`/api/stats`) sont calculés à partir du manifeste : il n'y a pas de second fichier à tenir à jour.

## Historique : données d'exemple

Les fichiers `app/data/manifest.json` et `app/data/water_series.json` fournis contiennent des
**valeurs inventées**, juste pour développer. Le champ `"factices": true` du manifeste le signale,
et `/api/health` répond `"donnees_factices": true`.

Quand le notebook (tâche TR8) a produit les vrais fichiers :
1. Les copier dans `app/data/` à la place des exemples.
2. Vérifier que `"factices"` a disparu (ou vaut `false`) et que `"zone"` n'indique plus « exemple ».
3. Relancer `python -m pytest`. Si un champ est faux, l'API refuse de démarrer et dit lequel.
4. Vérifier que `/api/health` répond `"donnees_factices": false`.

## CORS (site <-> API)

Par défaut, seuls `http://localhost:5173` et `http://127.0.0.1:5173` sont autorisés.
En ligne, définir la variable d'environnement `ALLOWED_ORIGINS` avec l'adresse du site, par exemple :
`ALLOWED_ORIGINS=https://mon-site.vercel.app,http://localhost:5173`

## Déployer (Render ou Railway)

- Dossier racine : `backend`
- Commande de build : `pip install -r requirements.txt`
- Commande de démarrage : `uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips="*"`
  (`--proxy-headers` : la limitation par IP voit l'adresse réelle du visiteur, pas celle du proxy de l'hébergeur)
- Variables : `ALLOWED_ORIGINS` (adresse du site), `APP_ENV=production`
- Données : soit `DATA_DIR` vers un dossier contenant `manifest.json`, soit copier `frontend/public/data/manifest.json` dans `app/data/`
- Test : ouvrir `https://VOTRE-API/api/health`

Sur une offre gratuite, l'API peut « s'endormir » : la première requête prend alors 30 à 60 s.
Le site doit relire les fichiers statiques si l'API ne répond pas.

## Erreurs fréquentes

- `ModuleNotFoundError: No module named 'app'` : lancer les commandes depuis le dossier `backend`.
- L'API refuse de démarrer avec une erreur Pydantic : un champ de `manifest.json` ou `water_series.json`
  ne respecte pas le contrat. Le message donne le nom du champ.
- Erreur CORS dans le navigateur : l'adresse du site n'est pas dans `ALLOWED_ORIGINS`.

## Sécurité

- Toutes les routes sont en lecture seule (GET) ; CORS limité à `ALLOWED_ORIGINS`, sans cookies.
- En-têtes ajoutés à chaque réponse (`app/security.py`) : `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`, `Content-Security-Policy`, et `Strict-Transport-Security` en production.
- Limitation à `RATE_LIMIT_PER_MINUTE` requêtes par minute et par IP (réponse 429 au-delà).
- `APP_ENV=production` masque `/docs` et refuse `ALLOWED_ORIGINS=*`.
- Le manifeste est validé par Pydantic avant d'être servi : un fichier non conforme donne une 503, jamais des données fausses.
- Aucun secret n'est nécessaire à l'API. Le jeton Earthdata ne sert qu'au notebook : il reste dans `.env`, jamais versionné.
