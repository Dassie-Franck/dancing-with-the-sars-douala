import os
from pathlib import Path

os.environ["DATA_DIR"] = str(Path(__file__).parent / "fixtures")   # avant d'importer l'app
