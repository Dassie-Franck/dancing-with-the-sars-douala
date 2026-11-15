from fastapi.testclient import TestClient

from app.main import app
from app.store import DONNEES

client = TestClient(app)


def test_health():
    r = client.get('/api/health')
    assert r.status_code == 200
    corps = r.json()
    assert corps['status'] == 'ok'
    assert corps['nb_acquisitions'] == len(DONNEES.acquisitions)


def test_liste_acquisitions_triee():
    r = client.get('/api/acquisitions')
    assert r.status_code == 200
    dates = [a['date'] for a in r.json()]
    assert len(dates) == len(DONNEES.acquisitions) > 0
    assert dates == sorted(dates)


def test_filtre_periode():
    pluies = client.get('/api/acquisitions?periode=pluies').json()
    assert all(a['periode'] == 'pluies' for a in pluies)
    assert client.get('/api/acquisitions?periode=nimporte').json() == []


def test_detail_date():
    une_date = DONNEES.acquisitions[0].date
    r = client.get('/api/acquisitions/' + une_date)
    assert r.status_code == 200
    assert r.json()['date'] == une_date


def test_date_inconnue_404():
    assert client.get('/api/acquisitions/1999-01-01').status_code == 404


def test_date_mauvais_format_422():
    assert client.get('/api/acquisitions/pas-une-date').status_code == 422


def test_serie_complete_et_filtre():
    toute = client.get('/api/water-series').json()
    assert len(toute) == len(DONNEES.serie)
    debut, fin = toute[2]['date'], toute[4]['date']
    r = client.get(f'/api/water-series?start={debut}&end={fin}')
    assert r.status_code == 200
    assert all(debut <= p['date'] <= fin for p in r.json())
    assert len(r.json()) == 3


def test_serie_mauvaise_date_422():
    assert client.get('/api/water-series?start=hier').status_code == 422


def test_serie_start_apres_end_400():
    assert client.get('/api/water-series?start=2026-09-01&end=2026-08-01').status_code == 400


def test_stats_coherentes_avec_la_serie():
    s = client.get('/api/stats').json()
    surfaces = [p.surface_km2 for p in DONNEES.serie]
    assert s['nb_dates'] == len(surfaces)
    assert s['surface_min_km2'] == min(surfaces)
    assert s['surface_max_km2'] == max(surfaces)
    attendu = round((max(surfaces) - min(surfaces)) / min(surfaces) * 100, 1)
    assert s['variation_pct'] == attendu


def test_coordonnees_longitude_latitude():
    """Garde-fou : on a bien [longitude, latitude] (Cameroun : lon 8-17, lat 1-14)."""
    for a in DONNEES.acquisitions:
        for lon, lat in a.coordinates:
            assert 8 <= lon <= 17, 'longitude suspecte : ' + str(lon)
            assert 1 <= lat <= 14, 'latitude suspecte : ' + str(lat)
