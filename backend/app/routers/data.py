from datetime import date as Date
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Query

from .. import store
from ..models import Acquisition, StatsResponse, WaterPoint

router = APIRouter()


@router.get("/health", summary="Santé de l'API", description="Répond `{\"status\": \"ok\"}` quand l'API est en ligne.")
def health():
    return {"status": "ok"}


@router.get("/manifest", summary="Manifeste complet (contrat 2.0)",
            description="Renvoie exactement le contenu de `manifest.json`, utilisable tel quel par le front.")
def manifest():
    raw, _ = store.load()
    return raw


@router.get("/acquisitions", response_model=list[Acquisition], summary="Liste des acquisitions",
            description="Une entrée par date, triée. Filtre optionnel : `?season=dry` ou `?season=rain`.")
def acquisitions(season: Optional[Literal["dry", "rain"]] = Query(None, description="dry = déc.–fév. ; rain = le reste")):
    _, m = store.load()
    items = m.acquisitions
    if season:
        items = [a for a in items if a.season == season]
    return items


@router.get("/acquisitions/{day}", response_model=Acquisition, summary="Détail d'une acquisition",
            description="`day` au format AAAA-MM-JJ. Erreur 404 si la date n'existe pas.")
def acquisition(day: str):
    _, m = store.load()
    for a in m.acquisitions:
        if a.date == day:
            return a
    raise HTTPException(404, f"Aucune acquisition à la date {day}")


@router.get("/water-series", response_model=list[WaterPoint], summary="Série temporelle de la surface d'eau",
            description="Source de la courbe. Filtres optionnels `start` et `end` (AAAA-MM-JJ). "
                        "Surface d'eau détectée, estuaire et mer côtière inclus.")
def water_series(start: Optional[Date] = None, end: Optional[Date] = None):
    _, m = store.load()
    pts = []
    for a in store.usable(m):
        if start and a.date < start.isoformat():
            continue
        if end and a.date > end.isoformat():
            continue
        pts.append(WaterPoint(date=a.date, surface_km2=a.stats.water_area_km2, backscatter_db=a.stats.mean_vv_db))
    return pts


@router.get("/stats", response_model=StatsResponse, summary="Chiffres clés",
            description="Surface min/max, moyennes saison sèche vs saison des pluies et variation en %.")
def stats():
    _, m = store.load()
    return store.compute_stats(m)
