"""Lecture de manifest.json (source de vérité unique) et calcul des statistiques."""
import json
import os
from pathlib import Path
from typing import Optional

from fastapi import HTTPException
from pydantic import ValidationError

from .models import Acquisition, Manifest

NOTE = ("Surface d'eau détectée (estuaire et mer côtière inclus). "
        "Marée et vent ne sont pas corrigés : ce n'est pas une mesure d'inondation.")

_HERE = Path(__file__).resolve().parent
_cache: dict = {"path": None, "mtime": None, "raw": None, "manifest": None}


def _candidates() -> list[Path]:
    env = os.environ.get("DATA_DIR")
    paths = [Path(env)] if env else []
    paths += [_HERE / "data", _HERE.parent.parent / "frontend" / "public" / "data"]
    return [p / "manifest.json" for p in paths]


def manifest_path() -> Optional[Path]:
    return next((p for p in _candidates() if p.exists()), None)


def load() -> tuple[dict, Manifest]:
    """Renvoie (JSON brut, manifeste validé). Recharge si le fichier a changé."""
    path = manifest_path()
    if path is None:
        raise HTTPException(503, "manifest.json introuvable : copiez-le dans backend/app/data/ ou définissez DATA_DIR")
    mtime = path.stat().st_mtime
    if _cache["path"] != path or _cache["mtime"] != mtime:
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
            manifest = Manifest.model_validate(raw)
        except (ValueError, ValidationError) as exc:   # contrat non respecté : message clair, pas de 500
            first = exc.errors()[0] if isinstance(exc, ValidationError) else exc
            raise HTTPException(503, f"manifest.json non conforme au contrat 2.0 : {first}") from exc
        _cache.update(path=path, mtime=mtime, raw=raw, manifest=manifest)
    return _cache["raw"], _cache["manifest"]


def usable(manifest: Manifest) -> list[Acquisition]:
    """Acquisitions exploitables pour la courbe (couverture suffisante), comme le front."""
    return [a for a in manifest.acquisitions if not a.partial]


def compute_stats(manifest: Manifest) -> dict:
    acqs = usable(manifest)
    if not acqs:
        raise HTTPException(404, "Aucune acquisition exploitable")
    lo = min(acqs, key=lambda a: a.stats.water_area_km2)
    hi = max(acqs, key=lambda a: a.stats.water_area_km2)

    def season(s: str) -> dict:
        v = [a.stats.water_area_km2 for a in acqs if a.season == s]
        return {"n": len(v), "mean_km2": round(sum(v) / len(v), 2) if v else None}

    dry, rain = season("dry"), season("rain")
    variation = None
    if dry["mean_km2"] and rain["mean_km2"]:
        variation = round((rain["mean_km2"] / dry["mean_km2"] - 1) * 100, 1)
    return {
        "n_acquisitions": len(acqs),
        "min_km2": lo.stats.water_area_km2, "min_date": lo.date,
        "max_km2": hi.stats.water_area_km2, "max_date": hi.date,
        "dry": dry, "rain": rain,
        "variation_pct_rain_vs_dry": variation,
        "note": NOTE,
    }
