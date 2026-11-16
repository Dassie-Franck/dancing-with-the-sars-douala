import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import store
from .routers import data
from .security import RateLimitMiddleware, SecurityHeadersMiddleware

PRODUCTION = os.environ.get("APP_ENV", "development").lower() == "production"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Vérifie le manifeste au démarrage : un fichier non conforme est signalé tout de suite.
    try:
        store.load()
        print(f"manifest.json chargé : {store.manifest_path()}")
    except Exception as exc:
        print("ATTENTION :", getattr(exc, "detail", exc))
    yield


app = FastAPI(
    title="Dancing with the SARs – Douala : API",
    description=(
        "Sert les métadonnées, la série temporelle et les statistiques du MVP "
        "(Sentinel-1 VV, bande C, en attendant NISAR). Le front fonctionne aussi sans cette API."
    ),
    version="2.0",
    lifespan=lifespan,
    # Documentation interactive seulement en développement
    docs_url=None if PRODUCTION else "/docs",
    redoc_url=None if PRODUCTION else "/redoc",
    openapi_url=None if PRODUCTION else "/openapi.json",
)

origins = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()]
if PRODUCTION and "*" in origins:
    raise RuntimeError("ALLOWED_ORIGINS ne doit pas contenir « * » en production.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)
app.add_middleware(RateLimitMiddleware, per_minute=int(os.environ.get("RATE_LIMIT_PER_MINUTE", "240")))
app.add_middleware(SecurityHeadersMiddleware, hsts=PRODUCTION)

app.include_router(data.router, prefix="/api")
