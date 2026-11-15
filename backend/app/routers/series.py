from datetime import date as Date
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException

from ..models import PointEau, Stats
from ..store import DONNEES

router = APIRouter(prefix='/api', tags=['series'])


@router.get('/water-series', response_model=List[PointEau],
            summary='Surface en eau au fil des dates (courbe du site)')
def serie(start: Optional[Date] = None, end: Optional[Date] = None):
    """Filtre facultatif : `?start=2026-08-01&end=2026-08-31`.

    Un mauvais format de date donne automatiquement une erreur 422.
    """
    if start and end and start > end:
        raise HTTPException(status_code=400, detail='start doit être avant end')
    debut = start.isoformat() if start else '0000-00-00'
    fin = end.isoformat() if end else '9999-99-99'
    # Les dates ISO se comparent comme du texte.
    return [p for p in DONNEES.serie if debut <= p.date <= fin]


@router.get('/stats', response_model=Stats, summary='Chiffres clés (cartes au-dessus de la courbe)')
def stats():
    s = DONNEES.serie
    if not s:
        raise HTTPException(status_code=404, detail='Aucune donnée dans la série')

    mini = min(s, key=lambda p: p.surface_km2)
    maxi = max(s, key=lambda p: p.surface_km2)

    periode_de = {a.date: a.periode for a in DONNEES.acquisitions}
    groupes: Dict[str, List[float]] = {}
    for p in s:
        groupes.setdefault(periode_de.get(p.date, 'inconnue'), []).append(p.surface_km2)
    moyennes = {nom: round(sum(v) / len(v), 2) for nom, v in groupes.items()}

    variation = None
    if mini.surface_km2 > 0:
        variation = round((maxi.surface_km2 - mini.surface_km2) / mini.surface_km2 * 100, 1)

    inondees = [p.inondee_km2 for p in s if p.inondee_km2 is not None]

    return Stats(
        nb_dates=len(s),
        surface_min_km2=mini.surface_km2, date_min=mini.date,
        surface_max_km2=maxi.surface_km2, date_max=maxi.date,
        variation_pct=variation,
        moyenne_par_periode=moyennes,
        inondee_max_km2=max(inondees) if inondees else None,
    )
