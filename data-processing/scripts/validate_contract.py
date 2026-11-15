"""Valide frontend/public/data par rapport à docs/CONTRAT_DONNEES.md.
Usage : python data-processing/scripts/validate_contract.py [dossier_data]
Code de sortie 0 = conforme, 1 = erreurs.
"""
import json
import re
import sys
from pathlib import Path

from PIL import Image

FROZEN = {
    "schema_version": "2.0",
    "bbox": [9.55, 3.90, 9.90, 4.20],
    "crs": "EPSG:4326",
    "image_size": [1400, 1200],
    "db_range": [-30, 0],
}
MAX_PNG_MB = 3.0
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
STATS_REQUIRED = ["water_area_km2", "water_fraction", "valid_fraction", "threshold_db", "mean_vv_db"]


def main(data_dir):
    data = Path(data_dir)
    errors, warns = [], []
    mf = data / "manifest.json"
    if not mf.exists():
        print(f"ERREUR : {mf} introuvable")
        return 1
    try:
        m = json.loads(mf.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        print("ERREUR : manifest.json invalide :", exc)
        return 1

    def err(msg): errors.append(msg)

    if m.get("schema_version") != FROZEN["schema_version"]:
        err(f"schema_version doit être {FROZEN['schema_version']}")
    aoi = m.get("aoi", {})
    for key in ("bbox", "crs", "image_size"):
        if aoi.get(key) != FROZEN[key]:
            err(f"aoi.{key} = {aoi.get(key)} (attendu {FROZEN[key]})")
    if m.get("db_range") != FROZEN["db_range"]:
        err(f"db_range = {m.get('db_range')} (attendu {FROZEN['db_range']})")

    acqs = m.get("acquisitions")
    if not isinstance(acqs, list) or not acqs:
        err("acquisitions doit être une liste non vide")
        acqs = []
    dates = [a.get("date") for a in acqs]
    if dates != sorted(dates):
        err("acquisitions doivent être triées par date croissante")
    if len(set(dates)) != len(dates):
        err("une seule acquisition par date (id = date)")
    if m.get("reference_id") is not None and m["reference_id"] not in dates:
        err("reference_id absent des acquisitions")

    for a in acqs:
        d = a.get("date", "?")
        p = f"[{d}]"
        if not DATE_RE.match(str(d)):
            err(f"{p} date invalide")
            continue
        if a.get("id") != d:
            err(f"{p} id doit être égal à date")
        exp_season = "dry" if int(d[5:7]) in (12, 1, 2) else "rain"
        if a.get("season") != exp_season:
            err(f"{p} season = {a.get('season')} (attendu {exp_season})")
        pols = a.get("polarizations")
        if not pols or not set(pols) <= {"HH", "HV", "VV", "VH"}:
            err(f"{p} polarizations invalide")
        if not isinstance(a.get("mock"), bool):
            err(f"{p} mock doit être un booléen")
        if a.get("mock"):
            warns.append(f"{p} données FACTICES (mock)")

        layers = a.get("layers", {})
        for req in ("backscatter_vv", "water_mask"):
            if req not in layers:
                err(f"{p} couche obligatoire absente : {req}")
        for name, rel in layers.items():
            f = data / rel
            if not f.exists():
                err(f"{p} fichier manquant : {rel}")
                continue
            with Image.open(f) as im:
                if list(im.size) != FROZEN["image_size"]:
                    err(f"{p} {rel} : taille {im.size} (attendu {tuple(FROZEN['image_size'])})")
                if im.mode != "RGBA":
                    err(f"{p} {rel} : mode {im.mode} (attendu RGBA)")
            mb = f.stat().st_size / 1e6
            if mb > MAX_PNG_MB:
                warns.append(f"{p} {rel} pèse {mb:.1f} Mo (> {MAX_PNG_MB} Mo)")

        s = a.get("stats", {})
        for k in STATS_REQUIRED:
            if not isinstance(s.get(k), (int, float)):
                err(f"{p} stats.{k} manquant ou non numérique")
        if isinstance(s.get("water_area_km2"), (int, float)) and s["water_area_km2"] < 0:
            err(f"{p} water_area_km2 négatif")
        for k in ("water_fraction", "valid_fraction"):
            if isinstance(s.get(k), (int, float)) and not 0 <= s[k] <= 1:
                err(f"{p} stats.{k} hors de [0,1]")
        if s.get("new_water_km2") is not None and not isinstance(s["new_water_km2"], (int, float)):
            err(f"{p} new_water_km2 doit être un nombre ou null")
        vf = s.get("valid_fraction")
        if isinstance(vf, (int, float)) and a.get("partial") != (vf < m.get("min_valid_fraction", 0.9)):
            err(f"{p} partial incohérent avec valid_fraction")

    for w in warns:
        print("AVERTISSEMENT :", w)
    for e in errors:
        print("ERREUR :", e)
    print(f"\n{len(acqs)} acquisition(s) — {len(errors)} erreur(s), {len(warns)} avertissement(s)")
    print("Contrat respecté ✔" if not errors else "Contrat NON respecté ✘")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "frontend/public/data"))
