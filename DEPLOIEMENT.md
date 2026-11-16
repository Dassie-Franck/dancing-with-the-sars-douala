# Mise en ligne et sécurité

Le projet a deux parties indépendantes. **Le site fonctionne seul** : l'API est un bonus, et si elle ne répond pas, le site relit ses fichiers statiques.

| Partie | Dossier | Hébergement conseillé | Données lues |
|---|---|---|---|
| Site React | `frontend/` | Vercel (gratuit) | `frontend/public/data/` |
| API FastAPI | `backend/` | Render ou Railway (facultatif) | le même `manifest.json` |

## Où sont les données

```
frontend/public/data/            <- les VRAIES données, publiées avec le site
├── manifest.json                   contrat 2.0 : 16 dates Sentinel-1 VV (déc. 2025 – oct. 2026)
├── composites.json                 composites saison sèche / saison des pluies
├── series/water_series.json        courbe (export du notebook)
└── layers/*.png                    rétrodiffusion VV, masques d'eau, eau nouvelle
data-processing/output/          <- sorties de travail du pipeline (non versionnées)
```

Pour publier de nouvelles acquisitions : remplacer le contenu de `frontend/public/data/` par la sortie du notebook, puis lancer `python data-processing/scripts/validate_contract.py --strict`. Aucune ligne de code à changer. `make_mock_data.py` écrit désormais dans `data-processing/output/mock` et ne peut plus écraser les vraies données.

## 1. Mettre le site en ligne (Vercel)

1. Sur vercel.com : *Add New Project*, choisir le dépôt GitHub.
2. *Root Directory* : `frontend`. Vercel lit `frontend/vercel.json` (commande de build, dossier `dist`, en-têtes de sécurité).
3. Aucune variable n'est nécessaire : par défaut le site lit `public/data/`.
4. Déployer, puis ouvrir le site et vérifier les cinq pages et le bouton FR | EN.

Avant de pousser, en local :

```
cd frontend
npm ci
npm run lint
npm run check:i18n     # toutes les phrases ont leur traduction anglaise
npm run build
npm run preview        # applique les mêmes en-têtes de sécurité que Vercel
```

## 2. Mettre l'API en ligne (facultatif, Render)

Voir `backend/README.md`, section « Déployer ». En résumé :

- *Root Directory* : `backend` ; build : `pip install -r requirements.txt`
- Démarrage : `uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips="*"`
- Variables : `APP_ENV=production`, `ALLOWED_ORIGINS=https://<votre-site>.vercel.app`
- Test : `https://<votre-api>/api/health` doit répondre `{"status": "ok"}`

Puis brancher le site sur l'API, dans les variables Vercel du projet :

```
VITE_DATA_SOURCE=api
VITE_API_URL=https://<votre-api>
```

et ajouter `https://<votre-api>` à `connect-src` dans `frontend/vercel.json`. Sans cela, la politique de sécurité du navigateur bloque les appels, et le site repasse en fichiers statiques.

## Ce qui protège le projet

**Site**
- Politique de sécurité du contenu (CSP) stricte : seuls le site lui-même, Google Fonts et les tuiles OpenStreetMap sont autorisés. Aucun script externe ni script en ligne. Le site ne peut pas être affiché dans une iframe (`frame-ancestors 'none'`, `X-Frame-Options: DENY`).
- HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy` (caméra, micro, géolocalisation désactivés).
- Tout ce qui vient du manifest (fichier ou API) est vérifié avant affichage (`frontend/src/infrastructure/contract/manifestMapper.js`). Sont refusés : les chemins d'image absolus ou externes, les `..`, les `javascript:`, les tailles d'image démesurées et les nombres invalides. Un manifest refusé fait repasser le site sur les fichiers statiques.
- Aucun texte venant des données n'est inséré en HTML : fiches et étiquettes de la carte sont construites avec `textContent`.
- Appels à l'API sans cookie (`credentials: "omit"`). Le site ne stocke que le choix de langue (`localStorage`).
- `npm audit --omit=dev` : 0 vulnérabilité au 15 novembre 2026.

**API**
- Lecture seule (GET), CORS limité à `ALLOWED_ORIGINS`, limitation du débit par IP, en-têtes de sécurité, `/docs` masqué en production.
- Le manifeste est validé (Pydantic) avant d'être servi : 503 plutôt que des données fausses.

**Secrets**
- Le seul secret du projet est le jeton Earthdata du notebook : il reste dans `.env` (ignoré par git, voir `docs/ACCES_EARTHDATA.md`). Si un jeton a déjà été partagé ou commité, le régénérer sur urs.earthdata.nasa.gov.
- Les variables `VITE_*` sont intégrées au site et donc publiques : n'y mettre aucun secret.
