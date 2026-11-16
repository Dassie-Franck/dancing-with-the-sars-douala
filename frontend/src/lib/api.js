// Accès aux données via l'API FastAPI, avec repli automatique sur les fichiers statiques (public/data).
// La démo ne dépend jamais de l'API : si elle ne répond pas en 3 s, on relit manifest.json.
//
// Configuration : frontend/.env.local  ->  VITE_API_URL=http://localhost:8000
// (sans cette variable, le front lit directement les fichiers statiques)
import { loadManifest } from "./dataContract";

const API_URL = (import.meta.env?.VITE_API_URL ?? "").replace(/\/$/, "");
const TIMEOUT_MS = 3000;

// "api" ou "static" : d'où viennent les données affichées (à montrer dans l'interface si utile)
export let dataSource = "static";

async function fetchJson(url, ms = TIMEOUT_MS) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`${url} -> ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Remplace loadManifest() : même objet en retour (schéma 2.0).
export async function loadManifestWithApi() {
  if (API_URL) {
    try {
      const manifest = await fetchJson(`${API_URL}/api/manifest`);
      if (manifest.schema_version !== "2.0") {
        throw new Error(`Version de contrat non supportée : ${manifest.schema_version}`);
      }
      dataSource = "api";
      return manifest;
    } catch (err) {
      console.warn("API indisponible, repli sur les fichiers statiques :", err.message);
    }
  }
  dataSource = "static";
  return loadManifest();
}

// Même calcul que GET /api/stats (utilisé quand l'API est éteinte)
export function computeStats(manifest) {
  const acqs = manifest.acquisitions.filter((a) => !a.partial);
  if (!acqs.length) return null;
  const area = (a) => a.stats.water_area_km2;
  const lo = acqs.reduce((m, a) => (area(a) < area(m) ? a : m));
  const hi = acqs.reduce((m, a) => (area(a) > area(m) ? a : m));
  const season = (s) => {
    const v = acqs.filter((a) => a.season === s).map(area);
    return { n: v.length, mean_km2: v.length ? round(v.reduce((x, y) => x + y, 0) / v.length, 2) : null };
  };
  const dry = season("dry");
  const rain = season("rain");
  return {
    n_acquisitions: acqs.length,
    min_km2: area(lo), min_date: lo.date,
    max_km2: area(hi), max_date: hi.date,
    dry, rain,
    variation_pct_rain_vs_dry: dry.mean_km2 && rain.mean_km2 ? round((rain.mean_km2 / dry.mean_km2 - 1) * 100, 1) : null,
    note: "Surface d'eau détectée (estuaire et mer côtière inclus). Marée et vent ne sont pas corrigés : ce n'est pas une mesure d'inondation.",
  };
}

// Chiffres clés : API si disponible, sinon calcul local à partir du manifeste déjà chargé.
export async function getStats(manifest) {
  if (API_URL) {
    try {
      return await fetchJson(`${API_URL}/api/stats`);
    } catch (err) {
      console.warn("API /stats indisponible, calcul local :", err.message);
    }
  }
  return computeStats(manifest);
}

function round(x, n) {
  const f = 10 ** n;
  return Math.round(x * f) / f;
}
