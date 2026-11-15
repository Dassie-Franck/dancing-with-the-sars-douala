"""Modèles Pydantic : copie du contrat de données v2.0 (docs/CONTRAT_DONNEES.md)."""
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


class AcqStats(BaseModel):
    model_config = ConfigDict(extra="allow")
    water_area_km2: float
    new_water_km2: Optional[float] = None      # null pour la scène de référence
    water_fraction: float
    valid_fraction: float
    threshold_db: float
    mean_vv_db: float


class Acquisition(BaseModel):
    model_config = ConfigDict(extra="allow")   # champs optionnels futurs (ex. satellite)
    id: str
    date: str
    datetime_utc: str
    season: Literal["dry", "rain"]
    orbit: Optional[str] = None
    polarizations: list[str]
    product: Optional[str] = None
    maturity: Literal["VALIDATED", "PROVISIONAL", "BETA", "MOCK"]
    mock: bool
    partial: bool
    satellite: Optional[str] = None
    layers: dict[str, str]
    stats: AcqStats


class Manifest(BaseModel):
    model_config = ConfigDict(extra="allow")
    schema_version: Literal["2.0"]
    generated_at: str
    project: str
    aoi: dict
    db_range: list[float]
    water_style: dict
    threshold_default_db: float
    min_valid_fraction: float
    reference_id: str
    acquisitions: list[Acquisition]


class WaterPoint(BaseModel):
    date: str
    surface_km2: float
    backscatter_db: float


class SeasonSummary(BaseModel):
    n: int
    mean_km2: Optional[float] = None


class StatsResponse(BaseModel):
    n_acquisitions: int
    min_km2: float
    min_date: str
    max_km2: float
    max_date: str
    dry: SeasonSummary
    rain: SeasonSummary
    variation_pct_rain_vs_dry: Optional[float] = None
    note: str
