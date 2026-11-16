import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app

FIX = json.loads((Path(__file__).parent / "fixtures" / "manifest.json").read_text(encoding="utf-8"))
ACQ = FIX["acquisitions"]
client = TestClient(app)


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json() == {"status": "ok"}


def test_manifest_identique_au_fichier():
    r = client.get("/api/manifest")
    assert r.status_code == 200
    assert r.json() == FIX and r.json()["schema_version"] == "2.0"


def test_liste_complete_et_filtre_saison():
    assert len(client.get("/api/acquisitions").json()) == len(ACQ)
    dry = client.get("/api/acquisitions", params={"season": "dry"}).json()
    assert len(dry) == sum(a["season"] == "dry" for a in ACQ) and all(a["season"] == "dry" for a in dry)


def test_saison_invalide_422():
    assert client.get("/api/acquisitions", params={"season": "seche"}).status_code == 422


def test_detail_200_et_404():
    r = client.get("/api/acquisitions/2025-12-03")
    assert r.status_code == 200 and r.json()["layers"]["water_mask"] == "layers/2025-12-03_water_mask.png"
    assert client.get("/api/acquisitions/2000-01-01").status_code == 404


def test_water_series_forme_et_filtre():
    pts = client.get("/api/water-series").json()
    assert len(pts) == len(ACQ)
    assert set(pts[0]) == {"date", "surface_km2", "backscatter_db"}
    assert pts[0] == {"date": "2025-12-03", "surface_km2": 210.16, "backscatter_db": -7.77}
    sub = client.get("/api/water-series", params={"start": "2026-07-01", "end": "2026-08-31"}).json()
    assert [p["date"] for p in sub] == ["2026-07-02", "2026-07-14", "2026-08-07", "2026-08-19"]
    assert client.get("/api/water-series", params={"start": "pas-une-date"}).status_code == 422


def test_stats_coherentes_avec_les_donnees():
    s = client.get("/api/stats").json()
    areas = {a["date"]: a["stats"]["water_area_km2"] for a in ACQ}
    assert s["min_km2"] == min(areas.values()) and s["min_date"] == "2026-02-25"
    assert s["max_km2"] == max(areas.values())
    dry = [a["stats"]["water_area_km2"] for a in ACQ if a["season"] == "dry"]
    rain = [a["stats"]["water_area_km2"] for a in ACQ if a["season"] == "rain"]
    assert s["dry"] == {"n": len(dry), "mean_km2": round(sum(dry) / len(dry), 2)}
    assert s["rain"]["n"] == len(rain)
    assert s["variation_pct_rain_vs_dry"] == round((s["rain"]["mean_km2"] / s["dry"]["mean_km2"] - 1) * 100, 1)
    assert "mer" in s["note"]


def test_cors_front_local():
    r = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_manifeste_non_conforme_renvoie_503(tmp_path, monkeypatch):
    from app import store
    old = [{"date": "2025-12-03"}]                       # ancien format (liste) : doit être refusé proprement
    (tmp_path / "manifest.json").write_text(json.dumps(old), encoding="utf-8")
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    r = client.get("/api/acquisitions")
    assert r.status_code == 503 and "contrat 2.0" in r.json()["detail"]
    monkeypatch.undo()
    store._cache.update(path=None, mtime=None)
    assert client.get("/api/health").status_code == 200
