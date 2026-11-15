"""Modèles de données = le CONTRAT (voir tâche B0.1 du document).

Un modèle Pydantic décrit la forme exacte d'un objet JSON. Si un fichier
de données ne respecte pas cette forme, l'API refuse de démarrer et dit
quel champ est faux : c'est notre contrôle automatique du contrat.
"""
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, field_validator

DATE_PATTERN = r'^\d{4}-\d{2}-\d{2}$'   # AAAA-MM-JJ


class Orbite(BaseModel):
    piste: int
    frame: int
    sens: str = Field(pattern=r'^[AD]$')      # A = ascendante, D = descendante


class Acquisition(BaseModel):
    date: str = Field(pattern=DATE_PATTERN)
    periode: str                               # 'pluies', 'transition' ou 'seche'
    maturite: str                              # 'PROVISIONAL', 'VALIDATED', 'BETA'
    orbite: Orbite
    backscatter_png: str                       # chemin relatif, ex. 'layers/sigma_2026-08-29.png'
    water_png: str
    flood_png: Optional[str] = None
    coordinates: List[List[float]]             # 4 coins [longitude, latitude]

    @field_validator('coordinates')
    @classmethod
    def verifier_coins(cls, coins):
        if len(coins) != 4 or any(len(c) != 2 for c in coins):
            raise ValueError('coordinates doit contenir 4 points [longitude, latitude]')
        return coins


class Manifest(BaseModel):
    zone: str
    factices: bool = False                     # True = données d'exemple (à supprimer en vrai)
    acquisitions: List[Acquisition]


class PointEau(BaseModel):
    date: str = Field(pattern=DATE_PATTERN)
    surface_km2: float
    inondee_km2: Optional[float] = None
    backscatter_db: float


class Stats(BaseModel):
    nb_dates: int
    surface_min_km2: float
    date_min: str
    surface_max_km2: float
    date_max: str
    variation_pct: Optional[float] = None       # (max - min) / min * 100
    moyenne_par_periode: Dict[str, float]
    inondee_max_km2: Optional[float] = None


class Sante(BaseModel):
    status: str
    nb_acquisitions: int
    nb_points_serie: int
    donnees_factices: bool
