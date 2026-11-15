#!/usr/bin/env python3
"""Finalisation des données (contrat v2.0) en local, sans Colab ni retraitement.

Entrée : les PNG déjà produits (par date + composites) et stats_s1.csv.
Sortie : manifest.json, water_series.json, composites.json et layers/ dans --out.

Exemple (depuis la racine du dépôt) :
  python data-processing\\scripts\\finalisation_locale.py ^
      --images data-processing\\output\\layers ^
      --stats  data-processing\\output\\stats_s1.csv ^
      --out    frontend\\public\\data --clean
"""
import argparse
import json
import re
import shutil
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from PIL import Image

BBOX = (9.55, 3.90, 9.90, 4.20)          # ouest, sud, est, nord
IMAGE_SIZE = (1400, 1200)                # largeur, hauteur
DB_RANGE = [-30.0, 0.0]
WATER_RGBA = (34, 211, 238, 170)
NEW_RGBA = (251, 146, 60, 190)
MIN_VALID_FRACTION = 0.9
MAX_MB = 3.0
DRY_MONTHS = (12, 1, 2)


def save_png(img, path):
    img.save(path, optimize=True)
    return path.stat().st_size / 1e6


def to_backscatter(src, dst):
    return save_png(Image.open(src).convert("RGBA"), dst)


def to_water(src, dst):
    arr = np.array(Image.open(src).convert("RGBA"))
    alpha = arr[..., 3]
    water = (alpha > 0) if (alpha == 0).any() else (arr[..., :3].max(axis=2) > 40)
    out = np.zeros(arr.shape, dtype=np.uint8)
    out[water] = WATER_RGBA
    save_png(Image.fromarray(out), dst)
    return int(water.sum())


def water_bool(path):
    return np.array(Image.open(path).convert("RGBA"))[..., 3] > 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--images", required=True, type=Path, help="dossier des 37 PNG")
    ap.add_argument("--stats", type=Path, help="stats_s1.csv (défaut : dans --images ou son parent)")
    ap.add_argument("--inventaire", type=Path, help="inventaire_s1_douala.csv (optionnel, heure des passages)")
    ap.add_argument("--out", required=True, type=Path, help="ex. frontend/public/data")
    ap.add_argument("--reference", help="date de la scène de référence (défaut : 1re scène sèche)")
    ap.add_argument("--maturity", default="VALIDATED", choices=["VALIDATED", "PROVISIONAL", "BETA", "MOCK"])
    ap.add_argument("--clean", action="store_true",
                    help="supprime d'abord manifest.json, water_series.json, composites.json et layers/ dans --out")
    a = ap.parse_args()

    stats_path = a.stats
    if stats_path is None:
        for p in (a.images / "stats_s1.csv", a.images.parent / "stats_s1.csv"):
            if p.exists():
                stats_path = p
                break
    if stats_path is None or not stats_path.exists():
        sys.exit("stats_s1.csv introuvable : indiquez --stats")

    out, layers = a.out, a.out / "layers"
    if a.clean:
        for f in ("manifest.json", "water_series.json", "composites.json"):
            (out / f).unlink(missing_ok=True)
        if layers.exists():
            shutil.rmtree(layers)
    layers.mkdir(parents=True, exist_ok=True)

    # --- CSV + inventaire des fichiers ---
    df = pd.read_csv(stats_path)
    df.columns = [c.strip() for c in df.columns]
    df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
    df = df.sort_values("date").reset_index(drop=True)
    df["season"] = np.where(pd.to_datetime(df["date"]).dt.month.isin(DRY_MONTHS), "dry", "rain")

    manquants = [f"{d}_{k}.png" for d in df["date"] for k in ("backscatter_vv", "water_mask")
                 if not (a.images / f"{d}_{k}.png").exists()]
    if manquants:
        sys.exit(f"Fichiers manquants : {manquants}")
    for d in df["date"]:
        for k in ("backscatter_vv", "water_mask"):
            size = Image.open(a.images / f"{d}_{k}.png").size
            if size != IMAGE_SIZE:
                sys.exit(f"{d}_{k}.png fait {size}, attendu {IMAGE_SIZE}")
    print(f"{len(df)} dates ; saisons : {df.groupby('season').size().to_dict()}")

    # --- Couches du contrat ---
    px = {}
    for d in df["date"]:
        to_backscatter(a.images / f"{d}_backscatter_vv.png", layers / f"{d}_backscatter_vv.png")
        px[d] = to_water(a.images / f"{d}_water_mask.png", layers / f"{d}_water_mask.png")

    # --- Cohérence masque <-> CSV ---
    km2_px_series = df.set_index("date")["water_area_km2"] / pd.Series(px).replace(0, np.nan)
    km2_px = float(km2_px_series.median())
    ecart = ((km2_px_series / km2_px - 1) * 100).abs()
    suspects = list(ecart[ecart > 10].index)
    print(f"km2 par pixel (médiane) : {km2_px:.6f} ; dates suspectes (> 10 %) : {suspects or 'aucune'}")

    # --- Référence et nouvelle eau ---
    dry = df[df["season"] == "dry"]
    base = dry if len(dry) else df
    ref = a.reference or base.sort_values(["valid_fraction", "date"], ascending=[False, True]).iloc[0]["date"]
    if ref not in set(df["date"]):
        sys.exit(f"Référence inconnue : {ref}")
    ref_mask = water_bool(layers / f"{ref}_water_mask.png")
    print("Scène de référence :", ref)
    new_km2 = {}
    for d in df["date"]:
        if d == ref:
            new_km2[d] = None
            continue
        new = water_bool(layers / f"{d}_water_mask.png") & ~ref_mask
        img = np.zeros((IMAGE_SIZE[1], IMAGE_SIZE[0], 4), dtype=np.uint8)
        img[new] = NEW_RGBA
        save_png(Image.fromarray(img), layers / f"{d}_new_water_mask.png")
        new_km2[d] = round(float(new.sum() * km2_px), 3)

    # --- Heure des passages (optionnel) ---
    heures = {}
    if a.inventaire and a.inventaire.exists():
        inv = pd.read_csv(a.inventaire)
        for s in inv.get("scene", []):
            m = re.search(r"_(\d{8})T(\d{6})", str(s))
            if m:
                d8, h6 = m.groups()
                dd = f"{d8[:4]}-{d8[4:6]}-{d8[6:]}"
                heures[dd] = f"{dd}T{h6[:2]}:{h6[2:4]}:{h6[4:]}Z"
    else:
        print("ATTENTION : pas d'inventaire -> datetime_utc = minuit UTC (approximation)")

    # --- manifest.json (schéma 2.0) ---
    acquisitions = []
    for r in df.itertuples():
        lay = {"backscatter_vv": f"layers/{r.date}_backscatter_vv.png",
               "water_mask": f"layers/{r.date}_water_mask.png"}
        if new_km2[r.date] is not None:
            lay["new_water_mask"] = f"layers/{r.date}_new_water_mask.png"
        acquisitions.append({
            "id": r.date, "date": r.date,
            "datetime_utc": heures.get(r.date, f"{r.date}T00:00:00Z"),
            "season": r.season, "orbit": "A", "polarizations": ["VV"],
            "product": "SENTINEL1_RTC30_HYP3", "maturity": a.maturity,
            "mock": False, "partial": bool(r.valid_fraction < MIN_VALID_FRACTION),
            "satellite": r.satellite, "layers": lay,
            "stats": {
                "water_area_km2": round(float(r.water_area_km2), 2),
                "new_water_km2": new_km2[r.date],
                "water_fraction": round(px[r.date] / (IMAGE_SIZE[0] * IMAGE_SIZE[1] * float(r.valid_fraction)), 4),
                "valid_fraction": round(float(r.valid_fraction), 3),
                "threshold_db": float(r.seuil_vv_db),
                "mean_vv_db": round(float(r.mean_vv_db), 2),
            },
        })
    manifest = {
        "schema_version": "2.0",
        "generated_at": pd.Timestamp.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "project": "dancing-with-the-sars-douala",
        "aoi": {"name": "Douala – estuaire du Wouri", "bbox": list(BBOX), "crs": "EPSG:4326",
                "image_size": list(IMAGE_SIZE)},
        "db_range": DB_RANGE,
        "water_style": {"color": "#22d3ee", "opacity": 0.67},
        "threshold_default_db": float(df["seuil_vv_db"].iloc[0]),
        "min_valid_fraction": MIN_VALID_FRACTION,
        "reference_id": ref,
        "acquisitions": acquisitions,
    }
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")

    series = [{"date": q["date"], "surface_km2": q["stats"]["water_area_km2"],
               "backscatter_db": q["stats"]["mean_vv_db"]} for q in acquisitions]
    (out / "water_series.json").write_text(json.dumps(series, indent=2, ensure_ascii=False), encoding="utf-8")

    W, S, E, N = BBOX
    coords = [[W, N], [E, N], [E, S], [W, S]]
    comp = {}
    for saison, nom in (("dry", "seche"), ("rain", "pluies")):
        b = a.images / f"composite-{nom}_backscatter_vv.png"
        w = a.images / f"composite-{nom}_water_mask.png"
        if b.exists() and w.exists():
            to_backscatter(b, layers / f"composite-{nom}_backscatter_vv.png")
            to_water(w, layers / f"composite-{nom}_water_mask.png")
            comp[saison] = {"backscatter_vv": f"layers/composite-{nom}_backscatter_vv.png",
                            "water_mask": f"layers/composite-{nom}_water_mask.png",
                            "coordinates": coords}
    (out / "composites.json").write_text(json.dumps(comp, indent=2, ensure_ascii=False), encoding="utf-8")

    # --- Vérification du contrat ---
    err = []
    m = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
    dates = [q["date"] for q in m["acquisitions"]]
    if dates != sorted(dates) or len(set(dates)) != len(dates):
        err.append("dates non triées ou en double")
    if m["reference_id"] not in dates:
        err.append("reference_id inconnu")
    for q in m["acquisitions"]:
        for k in ("id", "date", "datetime_utc", "season", "orbit", "polarizations", "product", "maturity",
                  "mock", "partial", "layers", "stats"):
            if k not in q:
                err.append(f"{q['date']}: champ manquant {k}")
        if (q["stats"]["new_water_km2"] is None) != (q["date"] == m["reference_id"]):
            err.append(f"{q['date']}: new_water_km2 null uniquement pour la référence")
        for rel in q["layers"].values():
            p = out / rel
            if not p.exists():
                err.append(f"fichier absent : {rel}")
                continue
            im = Image.open(p)
            if im.size != IMAGE_SIZE or im.mode != "RGBA":
                err.append(f"{rel}: {im.size} {im.mode}")
            if p.stat().st_size / 1e6 > MAX_MB:
                err.append(f"{rel}: > {MAX_MB} Mo")
    total = sum(f.stat().st_size for f in out.rglob("*") if f.is_file()) / 1e6
    print(f"Poids total de {out} : {total:.1f} Mo")
    if err:
        print(f"Contrat 2.0 : {len(err)} erreur(s)")
        for e in err[:20]:
            print(" -", e)
        sys.exit(1)
    print("Contrat 2.0 : OK")


if __name__ == "__main__":
    main()
