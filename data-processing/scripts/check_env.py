"""Verifie que toutes les dependances Python du projet sont installees."""
import importlib

MODULES = [
    ("rasterio", "rasterio"),
    ("geopandas", "geopandas"),
    ("numpy", "numpy"),
    ("xarray", "xarray"),
    ("PIL", "pillow"),
    ("asf_search", "asf_search"),
    ("earthaccess", "earthaccess"),
    ("fastapi", "fastapi"),
    ("uvicorn", "uvicorn"),
    ("dotenv", "python-dotenv"),
]

ok = True
for module, pip_name in MODULES:
    try:
        mod = importlib.import_module(module)
        version = getattr(mod, "__version__", "?")
        print(f"[OK]   {pip_name:<15} {version}")
    except Exception as exc:  # noqa: BLE001
        ok = False
        print(f"[FAIL] {pip_name:<15} {exc}")

print()
print("Environnement Python pret." if ok else "Des dependances manquent : relancez setup-projet.ps1")