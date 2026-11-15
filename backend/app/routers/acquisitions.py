from typing import List, Optional

from fastapi import APIRouter, HTTPException, Path

from ..models import DATE_PATTERN, Acquisition
from ..store import DONNEES

router = APIRouter(prefix='/api', tags=['acquisitions'])


@router.get('/acquisitions', response_model=List[Acquisition],
            summary='Liste des dates (images radar) disponibles')
def lister(periode: Optional[str] = None):
    """Renvoie toutes les acquisitions, triées par date.

    Filtre facultatif : `?periode=pluies`.
    """
    return [a for a in DONNEES.acquisitions if periode is None or a.periode == periode]


@router.get('/acquisitions/{date}', response_model=Acquisition,
            summary="Détail d'une date")
def detail(date: str = Path(pattern=DATE_PATTERN, description='Date au format AAAA-MM-JJ')):
    for a in DONNEES.acquisitions:
        if a.date == date:
            return a
    raise HTTPException(status_code=404, detail='Aucune acquisition à la date ' + date)
