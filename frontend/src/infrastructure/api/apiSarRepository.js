// INFRASTRUCTURE · Adaptateur « API FastAPI » du port SarRepository (tâches K4–K6, K13).
// Si l'API ne répond pas dans le délai, on relit les fichiers statiques : la démo ne dépend jamais d'elle.
//
// À ajuster par l'équipe backend, et seulement ici :
//   - ENDPOINTS : chemins des routes ;
//   - toCatalog : forme de la réponse (par défaut, le même format que manifest.json, schéma 1.0) ;
//   - layersBaseUrl : où sont servis les PNG (Vercel via public/data, ou StaticFiles de l'API, K8).
import { manifestToCatalog } from "../contract/manifestMapper";

export const ENDPOINTS = {
  catalog: "/api/manifest", // renvoie le manifest complet (aoi + acquisitions), schéma 1.0
};

/**
 * @param {{apiUrl: string, layersBaseUrl: string, timeoutMs?: number,
 *          fallback?: import("../../application/ports").SarRepository,
 *          toCatalog?: (json: any, resolveUrl: (p: string) => string) => import("../../domain/model").RawCatalog}} cfg
 * @returns {import("../../application/ports").SarRepository}
 */
export function createApiSarRepository({ apiUrl, layersBaseUrl, timeoutMs = 3000, fallback, toCatalog = manifestToCatalog }) {
  const base = apiUrl.replace(/\/$/, "");
  const resolveUrl = (rel) => `${layersBaseUrl}${rel}`;

  async function getJson(path) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(`${base}${path}`, { signal: ctrl.signal, headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`${path} : HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    async getCatalog() {
      try {
        return { ...toCatalog(await getJson(ENDPOINTS.catalog), resolveUrl), source: "api" };
      } catch (err) {
        if (!fallback) throw err;
        console.warn(`API indisponible (${err.message}) : repli sur les fichiers statiques.`);
        return fallback.getCatalog();
      }
    },
  };
}
