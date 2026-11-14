# dancing-with-the-sars-douala

**NASA Space Apps Challenge 2026 — Défi « Dancing with the SARs »**
Suivi par imagerie radar (SAR / NISAR) des dynamiques hydriques et urbaines à **Douala** et dans l'estuaire du **Wouri** (Cameroun).

Tableau de bord web interactif qui montre, date après date, l'avancée et le recul des eaux grâce aux couches radar, avec une courbe quantitative et une explication physique accessible (et honnête sur les limites).

> Principe d'architecture : les calculs lourds sur les rasters sont faits **en amont en Python** (Google Colab / local) pour produire des **PNG géoréférencés + JSON légers**, consommés directement par le frontend React.

---

## 1. Prérequis (une seule fois par machine)

| Outil | Version | Lien |
|-------|---------|------|
| Node.js | 18 ou plus (LTS conseillé) | https://nodejs.org |
| Python | 3.10 – 3.12 conseillé | https://www.python.org/downloads/ (cocher **Add to PATH**) |
| Git | récent | https://git-scm.com |
| Compte Earthdata | gratuit | https://urs.earthdata.nasa.gov |

Installation rapide via winget (PowerShell) :

```powershell
winget install OpenJS.NodeJS.LTS
winget install Python.Python.3.12
winget install Git.Git
```

Fermez puis rouvrez PowerShell après l'installation.

---

## 2. Installation pour un coéquipier

### Option A — Script automatique (recommandé)

```powershell
git clone <URL_DU_DEPOT_GITHUB> dancing-with-the-sars-douala
cd dancing-with-the-sars-douala
powershell -ExecutionPolicy Bypass -File .\setup-projet.ps1
```

Le script est **idempotent** : il peut être relancé sans danger, il n'écrase rien d'existant.

Options utiles :

```powershell
.\setup-projet.ps1 -InstallPrerequisites   # installe Node/Python/Git via winget si absents
.\setup-projet.ps1 -Skip3D                 # ignore Three.js / Globe.gl (module bonus)
.\setup-projet.ps1 -SkipPython             # frontend uniquement
```

### Option B — Installation manuelle

**Frontend**

```powershell
cd frontend
npm install
```

**Python** (depuis la racine du projet)

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python data-processing\scripts\check_env.py
```

---

## 3. Configurer le jeton Earthdata (JWT)

1. Connectez-vous sur https://urs.earthdata.nasa.gov
2. Menu **Generate Token** → copiez le jeton.
3. Copiez le modèle puis collez le jeton :

```powershell
Copy-Item .env.example .env
notepad .env
```

> ⚠️ Ne commitez **jamais** `.env` (déjà dans `.gitignore`). Chaque membre a son propre jeton (il expire : à régénérer régulièrement).

---

## 4. Lancer le projet

**Frontend (http://localhost:5173)**

```powershell
cd frontend
npm run dev
```

**API optionnelle (http://localhost:8000/health)**

```powershell
.\.venv\Scripts\Activate.ps1
cd backend
uvicorn main:app --reload --port 8000
```

**Traitement des données (Jupyter / Colab)**

```powershell
.\.venv\Scripts\Activate.ps1
# Dans VS Code : ouvrir un notebook de data-processing/notebooks/ et choisir le noyau ".venv"
```

Les calques générés (PNG géoréférencés) et séries (JSON) vont dans :

- `frontend/public/data/layers/` → images SAR (rétrodiffusion dB, masques d'eau)
- `frontend/public/data/series/` → séries temporelles (surface en eau par date)

---

## 5. Structure du dépôt

```
dancing-with-the-sars-douala/
├── frontend/                 # React (Vite) + Tailwind + MapLibre + Recharts
│   ├── public/data/          # layers/ (PNG) et series/ (JSON) servis statiquement
│   └── src/components/       # MapView.jsx, ...
├── data-processing/
│   ├── notebooks/            # Notebooks Colab / Jupyter
│   ├── scripts/              # Scripts Python (check_env.py, ...)
│   ├── raw/                  # Données brutes NISAR (NON versionnées)
│   └── output/               # Sorties intermédiaires
├── backend/                  # FastAPI (optionnel)
├── docs/
├── requirements.txt          # Dépendances Python
├── .env.example              # Modèle de configuration (jeton Earthdata)
└── setup-projet.ps1          # Script d'installation
```

---

## 6. Modules du MVP

| Module | Contenu |
|--------|---------|
| **M1** | Carte interactive MapLibre centrée sur Douala + sélecteur de dates + curseur avant/après |
| **M2** | Couches SAR : rétrodiffusion (dB) et masques d'eau (saison sèche vs pluies) |
| **M3** | Courbe de suivi temporel de la surface en eau (Recharts) |
| **M4** | Panneau « Ce que voit le radar » : effet miroir de l'eau, HH/HV, mangrove, limites |
| **M5** | Applications futures : alerte inondations, suivi des mangroves, aménagement côtier |
| **M6** | Dépôt GitHub public + README + déploiement Vercel + vidéo démo de 2 min |

---

## 7. Stack technique

- **Frontend** : React (Vite), Tailwind CSS 3, Lucide React, MapLibre GL JS, React Compare Slider, Recharts
- **Bonus 3D** : Three.js, react-globe.gl (uniquement si M1–M6 sont terminés)
- **Données** : rasterio, geopandas, numpy, xarray, pillow
- **Accès NASA** : asf_search, earthaccess (Earthdata Login + jeton JWT)
- **API optionnelle** : FastAPI + Uvicorn
- **Stockage** : fichiers statiques (PNG / GeoJSON / JSON), pas de base de données

---

## 8. Workflow Git en équipe

```powershell
git checkout -b feature/nom-de-la-fonctionnalite   # une branche par fonctionnalité
git add .
git commit -m "feat: description courte"
git pull --rebase origin main                      # récupérer le travail des autres
git push -u origin feature/nom-de-la-fonctionnalite
```

Puis ouvrir une Pull Request vers `main`. Un module (M1…M6) = une personne responsable pour éviter les conflits.

---

## 9. Dépannage

| Problème | Solution |
|----------|----------|
| `l'exécution de scripts est désactivée sur ce système` | `powershell -ExecutionPolicy Bypass -File .\setup-projet.ps1` ou `Set-ExecutionPolicy -Scope Process Bypass` |
| `python` ouvre le Microsoft Store | Installer Python depuis python.org, ou désactiver l'alias dans *Paramètres → Alias d'exécution d'application* |
| `rasterio` / `geopandas` ne s'installent pas | Utiliser **Python 3.12** (versions trop récentes parfois sans wheels), puis `pip install -r requirements.txt` |
| `npm` introuvable | Fermer/rouvrir PowerShell après installation de Node.js |
| `Activate.ps1` bloqué | `Set-ExecutionPolicy -Scope Process Bypass` puis réactiver |
| Port 5173 occupé | `npm run dev -- --port 5174` |

---

## 10. Licence et crédits

Projet open source réalisé pour le NASA Space Apps Challenge 2026.
Données : NASA-ISRO NISAR (via ASF DAAC / Earthdata). Fond de carte © contributeurs OpenStreetMap.