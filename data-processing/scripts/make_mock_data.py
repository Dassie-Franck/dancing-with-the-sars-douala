"""Génère des données FACTICES conformes au contrat (docs/CONTRAT_DONNEES.md).

Permet au frontend (M1-M3) de se développer avant l'arrivée des vraies données NISAR.
Usage (depuis la racine du projet) :
    python data-processing/scripts/make_mock_data.py [dossier_sortie]
Par défaut : frontend/public/data
Tout est marqué "mock": true dans le manifest.
"""
import datetime as dt
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

# --- Constantes du contrat (doivent rester identiques à validate_contract.py et au notebook) ---
SCHEMA_VERSION = "1.0"
BBOX = (9.55, 3.90, 9.90, 4.20)
IMAGE_SIZE = (1400, 1200)
DB_RANGE = (-30.0, 0.0)
THRESHOLD_DB = -18.0
MIN_VALID_FRACTION = 0.90
WATER_RGBA = (34, 211, 238, 170)
NEW_WATER_RGBA = (251, 146, 60, 190)

WEST, SOUTH, EAST, NORTH = BBOX
WIDTH, HEIGHT = IMAGE_SIZE
RES_X, RES_Y = (EAST - WEST) / WIDTH, (NORTH - SOUTH) / HEIGHT
LAT_ROWS = NORTH - (np.arange(HEIGHT) + 0.5) * RES_Y
AREA_MAP = ((111.32 * np.cos(np.radians(LAT_ROWS)) * RES_X) * (110.57 * RES_Y))[:, None] * np.ones((1, WIDTH))

# (date, niveau d'inondation 0..1)
SCENES = [("2026-01-15", 0.00), ("2026-04-21", 0.25), ("2026-07-26", 0.50), ("2026-10-02", 0.65)]

rng = np.random.default_rng(42)


def smooth(sigma):
    small = (HEIGHT // 4, WIDTH // 4)
    img = Image.fromarray((rng.random(small) * 255).astype(np.uint8)).resize((WIDTH, HEIGHT))
    a = np.asarray(img.filter(ImageFilter.GaussianBlur(sigma)), dtype="float32")
    return (a - a.min()) / (a.max() - a.min() + 1e-9)


def season_of(d):
    return "dry" if int(d[5:7]) in (12, 1, 2) else "rain"


def km2(mask):
    return float((AREA_MAP * mask).sum())


def write_backscatter_png(db, path):
    lo, hi = DB_RANGE
    g = np.where(np.isfinite(db), np.clip((db - lo) / (hi - lo), 0, 1) * 255, 0).astype(np.uint8)
    a = np.where(np.isfinite(db), 255, 0).astype(np.uint8)
    Image.fromarray(np.dstack([g, g, g, a]), "RGBA").save(path, optimize=True)


def write_mask_png(mask, rgba, path):
    out = np.zeros((HEIGHT, WIDTH, 4), dtype=np.uint8)
    out[mask] = rgba
    Image.fromarray(out, "RGBA").save(path, optimize=True)


def main(out_dir):
    out_dir = Path(out_dir)
    (out_dir / "layers").mkdir(parents=True, exist_ok=True)

    yy, xx = np.mgrid[0:HEIGHT, 0:WIDTH]
    x, y = xx / WIDTH, yy / HEIGHT
    river = np.abs(x - (0.55 - 0.40 * y)) < (0.015 + 0.07 * y)           # estuaire (eau permanente)
    city = ((x - 0.50) ** 2 + (y - 0.35) ** 2) < 0.03                      # zone urbaine claire
    lowland = smooth(40)                                                   # zones basses inondables
    base_land = -11 + 5 * smooth(25)
    base_land = np.where(city, -4 + 2 * smooth(8), base_land)

    grids = {}
    for d, level in SCENES:
        db = base_land + rng.normal(0, 1.2, base_land.shape)
        flood = (lowland < level * 0.6) & ~river & ~city
        db = np.where(river | flood, -25 + rng.normal(0, 1.5, base_land.shape), db)
        grids[d] = db.astype("float32")

    ref = SCENES[0][0]
    ref_water = grids[ref] < THRESHOLD_DB
    acquisitions = []
    for d, _ in SCENES:
        db = grids[d]
        water = db < THRESHOLD_DB
        layers = {"backscatter_hh": f"layers/{d}_backscatter_hh.png", "water_mask": f"layers/{d}_water_mask.png"}
        write_backscatter_png(db, out_dir / layers["backscatter_hh"])
        write_mask_png(water, WATER_RGBA, out_dir / layers["water_mask"])
        new_km2 = None
        if d != ref:
            layers["new_water_mask"] = f"layers/{d}_new_water_mask.png"
            write_mask_png(water & ~ref_water, NEW_WATER_RGBA, out_dir / layers["new_water_mask"])
            new_km2 = round(km2(water & ~ref_water), 3)
        acquisitions.append({
            "id": d, "date": d, "datetime_utc": f"{d}T05:30:00Z", "season": season_of(d),
            "orbit": "A", "polarizations": ["HH"], "product": None, "maturity": "MOCK",
            "mock": True, "partial": False, "layers": layers,
            "stats": {
                "water_area_km2": round(km2(water), 3), "new_water_km2": new_km2,
                "water_fraction": round(float(water.mean()), 4), "valid_fraction": 1.0,
                "threshold_db": THRESHOLD_DB, "mean_hh_db": round(float(db.mean()), 2),
            },
        })

    manifest = {
        "schema_version": SCHEMA_VERSION,
        "generated_at": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "project": "dancing-with-the-sars-douala",
        "aoi": {"name": "Douala – estuaire du Wouri", "bbox": list(BBOX), "crs": "EPSG:4326", "image_size": list(IMAGE_SIZE)},
        "db_range": list(DB_RANGE),
        "water_style": {"color": "#22d3ee", "opacity": 0.67},
        "threshold_default_db": THRESHOLD_DB,
        "min_valid_fraction": MIN_VALID_FRACTION,
        "reference_id": ref,
        "acquisitions": acquisitions,
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Données factices écrites dans {out_dir} ({len(acquisitions)} dates)")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "frontend/public/data")
