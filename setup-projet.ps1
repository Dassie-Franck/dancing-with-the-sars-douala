<#
.SYNOPSIS
    Cree et configure tout l'environnement du projet NASA Space Apps 2026
    "Dancing with the SARs" (Douala / estuaire du Wouri).

.DESCRIPTION
    - Frontend : React (Vite) + Tailwind CSS 3 + Lucide + MapLibre GL + React Compare Slider + Recharts (+ Three.js / Globe.gl en option)
    - Python   : venv unique (.venv) avec rasterio, geopandas, numpy, xarray, pillow, asf_search, earthaccess, fastapi, uvicorn
    - Structure de dossiers, .gitignore, .env.example, squelette de carte centree sur Douala
    - Genere un README.md destine a toute l'equipe
    Le script est idempotent : on peut le relancer sans risque, ce qui existe deja est conserve.

.PARAMETER ProjectName
    Nom du dossier projet (defaut : dancing-with-the-sars-douala)

.PARAMETER BasePath
    Dossier dans lequel creer le projet (defaut : dossier courant)

.PARAMETER Skip3D
    N'installe pas le module bonus Three.js / Globe.gl

.PARAMETER SkipPython
    Ne cree pas l'environnement Python

.PARAMETER SkipGit
    N'initialise pas le depot Git

.PARAMETER InstallPrerequisites
    Tente d'installer Node.js LTS, Python 3.12 et Git via winget s'ils sont absents

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\setup-projet.ps1
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\setup-projet.ps1 -InstallPrerequisites -Skip3D
#>

[CmdletBinding()]
param(
    [string]$ProjectName = "dancing-with-the-sars-douala",
    [string]$BasePath = (Get-Location).Path,
    [switch]$Skip3D,
    [switch]$SkipPython,
    [switch]$SkipGit,
    [switch]$InstallPrerequisites
)

$ErrorActionPreference = "Stop"
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

# ---------------------------------------------------------------------------
# Fonctions utilitaires
# ---------------------------------------------------------------------------
function Write-Step($msg) { Write-Host ""; Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    [OK] $msg" -ForegroundColor Green }
function Write-Skip($msg) { Write-Host "    [--] $msg" -ForegroundColor DarkGray }
function Write-Warn2($msg){ Write-Host "    [!!] $msg" -ForegroundColor Yellow }

function Write-Utf8 {
    param([string]$Path, [string]$Content, [switch]$Force)
    if ((Test-Path $Path) -and -not $Force) { Write-Skip "Existe deja : $Path"; return }
    $dir = Split-Path $Path -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    [System.IO.File]::WriteAllText($Path, $Content, $Utf8NoBom)
    Write-Ok "Fichier ecrit : $Path"
}

function Invoke-Native {
    param([string]$Exe, [string[]]$Arguments, [string]$WorkDir)
    Push-Location $WorkDir
    try {
        & $Exe @Arguments
        if ($LASTEXITCODE -ne 0) { throw "Commande en echec : $Exe $($Arguments -join ' ')" }
    }
    finally { Pop-Location }
}

function Test-Command($name) { return [bool](Get-Command $name -ErrorAction SilentlyContinue) }

function Get-PythonCommand {
    $candidates = @(
        @{ Exe = "py";      Args = @("-3") },
        @{ Exe = "python";  Args = @() },
        @{ Exe = "python3"; Args = @() }
    )
    foreach ($c in $candidates) {
        if (-not (Test-Command $c.Exe)) { continue }
        try {
            $out = (& $c.Exe @($c.Args) "--version" 2>&1 | Out-String).Trim()
            if ($out -match "Python (\d+)\.(\d+)\.(\d+)") {
                return @{ Exe = $c.Exe; Args = $c.Args; Major = [int]$Matches[1]; Minor = [int]$Matches[2]; Text = $out }
            }
        } catch { }
    }
    return $null
}

# ---------------------------------------------------------------------------
# 0. Banniere
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "=============================================================" -ForegroundColor Magenta
Write-Host "  NASA Space Apps 2026 - Dancing with the SARs (Douala)"        -ForegroundColor Magenta
Write-Host "  Installation automatique de l'environnement de projet"       -ForegroundColor Magenta
Write-Host "=============================================================" -ForegroundColor Magenta

# ---------------------------------------------------------------------------
# 1. Prerequis
# ---------------------------------------------------------------------------
Write-Step "Verification des prerequis (Node.js, Python, Git)"

if ($InstallPrerequisites) {
    if (-not (Test-Command "winget")) {
        Write-Warn2 "winget introuvable : installez Node.js, Python et Git manuellement."
    } else {
        $installed = $false
        if (-not (Test-Command "node")) { winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements; $installed = $true }
        if (-not (Get-PythonCommand))   { winget install --id Python.Python.3.12 -e --accept-source-agreements --accept-package-agreements; $installed = $true }
        if (-not (Test-Command "git"))  { winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements; $installed = $true }
        if ($installed) {
            Write-Warn2 "Des outils viennent d'etre installes. FERMEZ puis rouvrez PowerShell, puis relancez ce script."
            exit 0
        }
    }
}

$missing = @()

if (Test-Command "node") {
    $nodeVersion = (node --version).Trim()
    $nodeMajor = [int](($nodeVersion -replace "^v", "").Split(".")[0])
    if ($nodeMajor -lt 18) { $missing += "Node.js >= 18 (version detectee : $nodeVersion)" }
    else { Write-Ok "Node.js $nodeVersion" }
} else { $missing += "Node.js LTS (https://nodejs.org)" }

if (-not (Test-Command "npm.cmd")) { $missing += "npm (livre avec Node.js)" }

$py = $null
if (-not $SkipPython) {
    $py = Get-PythonCommand
    if ($null -eq $py) { $missing += "Python 3.10+ (https://www.python.org/downloads/ - cochez 'Add to PATH')" }
    elseif ($py.Major -lt 3 -or ($py.Major -eq 3 -and $py.Minor -lt 10)) { $missing += "Python 3.10+ (version detectee : $($py.Text))" }
    else {
        Write-Ok $py.Text
        if ($py.Minor -ge 14) { Write-Warn2 "Python 3.14+ : si rasterio/geopandas ne s'installent pas, utilisez Python 3.12." }
    }
}

$hasGit = Test-Command "git"
if ($hasGit) { Write-Ok ((git --version).Trim()) }
elseif (-not $SkipGit) { Write-Warn2 "Git absent : l'initialisation du depot sera ignoree (https://git-scm.com)." }

if ($missing.Count -gt 0) {
    Write-Host ""
    Write-Host "Prerequis manquants :" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Write-Host "Astuce : relancez avec -InstallPrerequisites pour une installation via winget." -ForegroundColor Yellow
    exit 1
}

# ---------------------------------------------------------------------------
# 2. Arborescence du projet
# ---------------------------------------------------------------------------
Write-Step "Creation de l'arborescence du projet"

if (-not (Test-Path $BasePath)) { New-Item -ItemType Directory -Force -Path $BasePath | Out-Null }
$Base = (Resolve-Path $BasePath).Path
$Root = Join-Path $Base $ProjectName

$dirs = @(
    "frontend",
    "data-processing\notebooks",
    "data-processing\scripts",
    "data-processing\raw",
    "data-processing\output",
    "backend",
    "docs"
)
foreach ($d in $dirs) {
    $full = Join-Path $Root $d
    if (-not (Test-Path $full)) { New-Item -ItemType Directory -Force -Path $full | Out-Null; Write-Ok "Dossier cree : $d" }
    else { Write-Skip "Dossier existant : $d" }
}
# Garder les dossiers vides dans Git
foreach ($d in @("data-processing\raw", "data-processing\output", "docs")) {
    $keep = Join-Path $Root "$d\.gitkeep"
    if (-not (Test-Path $keep)) { [System.IO.File]::WriteAllText($keep, "", $Utf8NoBom) }
}

# .gitignore
$gitignore = @'
# Node
node_modules/
dist/
.vite/

# Python
.venv/
__pycache__/
*.pyc
.ipynb_checkpoints/

# Secrets
.env
*.token

# Donnees satellites brutes (lourdes)
data-processing/raw/*
!data-processing/raw/.gitkeep
*.tif
*.tiff
*.h5
*.zip

# Divers
.DS_Store
Thumbs.db
.vscode/*
!.vscode/extensions.json
'@
Write-Utf8 (Join-Path $Root ".gitignore") $gitignore

# .env.example
$envExample = @'
# Copiez ce fichier en ".env" et renseignez votre jeton Earthdata (JWT).
# Generer le jeton : https://urs.earthdata.nasa.gov  ->  "Generate Token"
# NE JAMAIS COMMITER LE FICHIER .env
EARTHDATA_TOKEN=colle_ton_jeton_ici
'@
Write-Utf8 (Join-Path $Root ".env.example") $envExample

# ---------------------------------------------------------------------------
# 3. Frontend : React (Vite) + dependances
# ---------------------------------------------------------------------------
Write-Step "Frontend : React (Vite), Tailwind, MapLibre, Recharts, ..."

$Frontend = Join-Path $Root "frontend"
$freshFrontend = $false

if (-not (Test-Path (Join-Path $Frontend "package.json"))) {
    # create-vite@5 : version stable, non interactive avec --template
    Invoke-Native "npm.cmd" @("create", "vite@5", "frontend", "--", "--template", "react") $Root
    $freshFrontend = $true
    Write-Ok "Projet Vite + React cree"
} else {
    Write-Skip "Projet Vite deja present"
}

Write-Host "    Installation des dependances de base (react, react-dom, ...)" -ForegroundColor Gray
Invoke-Native "npm.cmd" @("install") $Frontend

Write-Host "    Dependances applicatives" -ForegroundColor Gray
Invoke-Native "npm.cmd" @("install", "maplibre-gl", "react-compare-slider", "recharts", "lucide-react") $Frontend

Write-Host "    Styling (Tailwind CSS 3 + PostCSS + Autoprefixer)" -ForegroundColor Gray
Invoke-Native "npm.cmd" @("install", "-D", "tailwindcss@3", "postcss", "autoprefixer") $Frontend

if (-not $Skip3D) {
    Write-Host "    Module bonus 3D (Three.js + Globe.gl)" -ForegroundColor Gray
    Invoke-Native "npm.cmd" @("install", "three", "react-globe.gl") $Frontend
    Invoke-Native "npm.cmd" @("install", "-D", "@types/three") $Frontend
} else {
    Write-Skip "Module 3D ignore (-Skip3D)"
}

# Configuration Tailwind / PostCSS
$tailwindConfig = @'
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        space: { 900: "#050b18", 800: "#0b1630", 700: "#13224a" },
        radar: { DEFAULT: "#22d3ee", dark: "#0891b2" },
      },
    },
  },
  plugins: [],
};
'@
$postcssConfig = @'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
'@
Write-Utf8 (Join-Path $Frontend "tailwind.config.js") $tailwindConfig -Force:$freshFrontend
Write-Utf8 (Join-Path $Frontend "postcss.config.js")  $postcssConfig  -Force:$freshFrontend

# Dossiers de donnees servies statiquement
foreach ($d in @("public\data\layers", "public\data\series", "src\components")) {
    $full = Join-Path $Frontend $d
    if (-not (Test-Path $full)) { New-Item -ItemType Directory -Force -Path $full | Out-Null }
}
foreach ($d in @("public\data\layers", "public\data\series")) {
    $keep = Join-Path $Frontend "$d\.gitkeep"
    if (-not (Test-Path $keep)) { [System.IO.File]::WriteAllText($keep, "", $Utf8NoBom) }
}

# Squelette applicatif (ecrase uniquement a la premiere creation)
$indexCss = @'
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root { height: 100%; margin: 0; }
body { @apply bg-space-900 text-slate-100 antialiased; }
'@
Write-Utf8 (Join-Path $Frontend "src\index.css") $indexCss -Force:$freshFrontend

$mapView = @'
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Centre de la carte : Douala / estuaire du Wouri
export const DOUALA = { lng: 9.7679, lat: 4.0511, zoom: 10.5 };

export default function MapView() {
  const containerRef = useRef(null);

  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: [DOUALA.lng, DOUALA.lat],
      zoom: DOUALA.zoom,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    // TODO (M2) : ajouter ici les calques SAR depuis /data/layers/*.png via map.addSource({type:"image"})
    return () => map.remove();
  }, []);

  return <div ref={containerRef} className="h-full w-full rounded-lg" />;
}
'@
Write-Utf8 (Join-Path $Frontend "src\components\MapView.jsx") $mapView -Force:$freshFrontend

$appJsx = @'
import { Satellite, Waves } from "lucide-react";
import MapView from "./components/MapView";

export default function App() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-space-700 bg-space-800 px-5 py-3">
        <Satellite className="text-radar" />
        <h1 className="text-lg font-semibold">Dancing with the SARs — Douala</h1>
        <span className="ml-auto flex items-center gap-1 text-sm text-slate-400">
          <Waves size={16} /> Suivi radar NISAR de l'estuaire du Wouri
        </span>
      </header>

      <main className="grid flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-3">
        <section className="min-h-[420px] lg:col-span-2">
          {/* M1 : carte interactive (+ M2 : couches SAR) */}
          <MapView />
        </section>

        <aside className="space-y-4">
          {/* M3 : courbe de suivi temporel (Recharts) */}
          <div className="rounded-lg bg-space-800 p-4">M3 — Courbe de suivi temporel</div>
          {/* M4 : panneau « Ce que voit le radar » */}
          <div className="rounded-lg bg-space-800 p-4">M4 — Ce que voit le radar</div>
          {/* M5 : applications futures */}
          <div className="rounded-lg bg-space-800 p-4">M5 — Applications futures</div>
        </aside>
      </main>
    </div>
  );
}
'@
Write-Utf8 (Join-Path $Frontend "src\App.jsx") $appJsx -Force:$freshFrontend

# ---------------------------------------------------------------------------
# 4. Python : venv + traitement des donnees + API optionnelle
# ---------------------------------------------------------------------------
if (-not $SkipPython) {
    Write-Step "Python : environnement virtuel (.venv) et dependances"

    $requirements = @'
# --- Traitement des donnees raster / SAR ---
rasterio
geopandas
numpy
xarray
pillow

# --- Acces aux donnees NASA (ASF / CMR / Earthdata) ---
asf_search
earthaccess

# --- API optionnelle ---
fastapi
uvicorn

# --- Confort ---
python-dotenv
ipykernel
'@
    Write-Utf8 (Join-Path $Root "requirements.txt") $requirements

    $venvDir = Join-Path $Root ".venv"
    $venvPython = Join-Path $venvDir "Scripts\python.exe"

    if (-not (Test-Path $venvPython)) {
        Invoke-Native $py.Exe (@($py.Args) + @("-m", "venv", ".venv")) $Root
        Write-Ok "Environnement virtuel cree"
    } else {
        Write-Skip "Environnement virtuel deja present"
    }

    Invoke-Native $venvPython @("-m", "pip", "install", "--upgrade", "pip") $Root
    Invoke-Native $venvPython @("-m", "pip", "install", "-r", "requirements.txt") $Root

    # Script de verification de l'environnement
    $checkEnv = @'
"""Verifie que toutes les dependances Python du projet sont installees."""
import importlib

MODULES = [
    ("rasterio", "rasterio"),
    ("geopandas", "geopandas"),
    ("numpy", "numpy"),
    ("xarray", "xarray"),
    ("PIL", "pillow"),
    ("asf_search", "asf_search"),
    ("earthaccess", "earthaccess"),
    ("fastapi", "fastapi"),
    ("uvicorn", "uvicorn"),
    ("dotenv", "python-dotenv"),
]

ok = True
for module, pip_name in MODULES:
    try:
        mod = importlib.import_module(module)
        version = getattr(mod, "__version__", "?")
        print(f"[OK]   {pip_name:<15} {version}")
    except Exception as exc:  # noqa: BLE001
        ok = False
        print(f"[FAIL] {pip_name:<15} {exc}")

print()
print("Environnement Python pret." if ok else "Des dependances manquent : relancez setup-projet.ps1")
'@
    Write-Utf8 (Join-Path $Root "data-processing\scripts\check_env.py") $checkEnv

    $backendMain = @'
"""API de metadonnees optionnelle.
Lancer :  uvicorn main:app --reload --port 8000   (depuis le dossier backend/)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Dancing with the SARs - Douala")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "zone": "Douala / estuaire du Wouri"}
'@
    Write-Utf8 (Join-Path $Root "backend\main.py") $backendMain

    Write-Host "    Verification des imports Python..." -ForegroundColor Gray
    Invoke-Native $venvPython @("data-processing\scripts\check_env.py") $Root
} else {
    Write-Skip "Environnement Python ignore (-SkipPython)"
}

# ---------------------------------------------------------------------------
# 5. README.md pour l'equipe
# ---------------------------------------------------------------------------
Write-Step "Generation du README.md"

$readme = @'
# __PROJECT__

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
git clone <URL_DU_DEPOT_GITHUB> __PROJECT__
cd __PROJECT__
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
__PROJECT__/
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
'@
$readme = $readme.Replace("__PROJECT__", $ProjectName)
Write-Utf8 (Join-Path $Root "README.md") $readme

# Copie du script dans le depot pour que les coequipiers l'aient apres clone
$self = $MyInvocation.MyCommand.Path
if ($self) {
    $dest = Join-Path $Root "setup-projet.ps1"
    if (-not (Test-Path $dest) -and ($self -ne $dest)) {
        Copy-Item $self $dest
        Write-Ok "Script copie dans le projet : setup-projet.ps1"
    }
}

# ---------------------------------------------------------------------------
# 6. Git
# ---------------------------------------------------------------------------
if (-not $SkipGit -and $hasGit) {
    Write-Step "Initialisation du depot Git"
    if (-not (Test-Path (Join-Path $Root ".git"))) {
        Invoke-Native "git" @("init", "-b", "main") $Root
        Invoke-Native "git" @("add", ".") $Root
        try { Invoke-Native "git" @("commit", "-m", "chore: initialisation du projet") $Root }
        catch { Write-Warn2 "Commit initial impossible (configurez git user.name / user.email puis commitez manuellement)." }
    } else {
        Write-Skip "Depot Git deja initialise"
    }
}

# ---------------------------------------------------------------------------
# 7. Resume
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "=============================================================" -ForegroundColor Green
Write-Host "  INSTALLATION TERMINEE" -ForegroundColor Green
Write-Host "=============================================================" -ForegroundColor Green
Write-Host "  Projet : $Root"
Write-Host ""
Write-Host "  Lancer le frontend :" -ForegroundColor Cyan
Write-Host "      cd `"$Root\frontend`""
Write-Host "      npm run dev"
Write-Host ""
Write-Host "  Activer Python :" -ForegroundColor Cyan
Write-Host "      cd `"$Root`""
Write-Host "      .\.venv\Scripts\Activate.ps1"
Write-Host ""
Write-Host "  Jeton Earthdata : copiez .env.example en .env puis renseignez EARTHDATA_TOKEN" -ForegroundColor Yellow
Write-Host "  Guide equipe    : $Root\README.md"
Write-Host ""
