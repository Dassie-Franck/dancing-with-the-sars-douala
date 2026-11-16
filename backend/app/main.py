import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import store
from .routers import data


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:                       # échoue tôt et clairement si le contrat n'est pas respecté
        store.load()
        print("manifest.json chargé :", store.manifest_path())
    except Exception as exc:   # l'API démarre quand même ; les routes renverront 503
        print("ATTENTION :", getattr(exc, "detail", exc))
    yield


app = FastAPI(
    title="Dancing with the SARs – Douala : API",
    description="Sert les métadonnées, la série temporelle et les statistiques du MVP "
                "(Sentinel-1 VV, bande C, en attendant NISAR). Le front fonctionne aussi sans cette API.",
    version="2.0",
    lifespan=lifespan,
)

origins = [o.strip() for o in os.environ.get(
    "ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET"], allow_headers=["*"])

app.include_router(data.router, prefix="/api")
