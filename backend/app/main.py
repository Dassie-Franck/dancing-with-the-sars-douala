import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from .models import Sante
from .routers import acquisitions, series
from .store import DATA_DIR, DONNEES

DESCRIPTION = """
API du projet **Dancing with the SARs - Douala** (NASA Space Apps 2026).

Elle sert au site web les résultats du traitement des images radar NISAR :
la liste des dates, la surface en eau au fil du temps et quelques chiffres clés.
Toutes les routes sont en lecture seule (GET).
"""

app = FastAPI(title='API Dancing with the SARs - Douala', description=DESCRIPTION, version='1.0.0')

# CORS : sans cette règle, le navigateur bloque les appels du site vers l'API
# (adresses différentes). En production, mettre l'adresse Vercel dans la variable
# d'environnement ALLOWED_ORIGINS (plusieurs adresses séparées par des virgules).
origines = [o.strip() for o in os.environ.get(
    'ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(',') if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origines, allow_methods=['GET'], allow_headers=['*'])

app.include_router(acquisitions.router)
app.include_router(series.router)

# Option : servir les PNG depuis l'API si le dossier data/layers existe.
# (Recommandé : laisser les PNG dans le site Vercel et ne pas utiliser cette option.)
if (DATA_DIR / 'layers').is_dir():
    app.mount('/static/layers', StaticFiles(directory=DATA_DIR / 'layers'), name='layers')


@app.get('/', include_in_schema=False)
def accueil():
    return RedirectResponse('/docs')


@app.get('/api/health', response_model=Sante, tags=['sante'], summary="L'API est-elle en ligne ?")
def health():
    return Sante(status='ok', nb_acquisitions=len(DONNEES.acquisitions),
                 nb_points_serie=len(DONNEES.serie), donnees_factices=DONNEES.factices)
