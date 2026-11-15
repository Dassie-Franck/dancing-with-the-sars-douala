"""Chargement des deux fichiers de données, une seule fois au démarrage."""
import json
import os
from pathlib import Path

from .models import Manifest, PointEau

# Dossier des données. Par défaut : backend/app/data
# On peut le changer avec la variable d'environnement SAR_DATA_DIR.
DATA_DIR = Path(os.environ.get('SAR_DATA_DIR', str(Path(__file__).parent / 'data')))


class Donnees:
    def __init__(self, dossier: Path):
        self.dossier = dossier
        brut_manifest = json.loads((dossier / 'manifest.json').read_text(encoding='utf-8'))
        brut_serie = json.loads((dossier / 'water_series.json').read_text(encoding='utf-8'))

        self.manifest = Manifest(**brut_manifest)
        self.acquisitions = sorted(self.manifest.acquisitions, key=lambda a: a.date)
        self.serie = sorted((PointEau(**p) for p in brut_serie), key=lambda p: p.date)
        self._verifier_coherence()

    def _verifier_coherence(self):
        dates = [a.date for a in self.acquisitions]
        if len(dates) != len(set(dates)):
            raise ValueError('manifest.json : une date apparait plusieurs fois')
        inconnues = [p.date for p in self.serie if p.date not in set(dates)]
        if inconnues:
            raise ValueError('water_series.json : dates absentes du manifest.json : ' + ', '.join(inconnues))

    @property
    def factices(self) -> bool:
        return self.manifest.factices


DONNEES = Donnees(DATA_DIR)
