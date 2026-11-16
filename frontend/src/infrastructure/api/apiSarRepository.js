// INFRASTRUCTURE · Adaptateur « API FastAPI » du port SarRepository (tâches K4–K6, K13).
// Si l'API ne répond pas dans le délai, on relit les fichiers statiques : la démo ne dépend jamais d'elle.
//
// À ajuster par l'équipe backend, et seulement ici :
//   - ENDPOINTS : chemins des routes (voir backend/app/main.py) ;
//   - toCatalog : forme de la réponse (par défaut, le même format que manifest.json, schéma 1.0 ou 2.0) ;
//   - layersBaseUrl : où sont servis les PNG (public/data du site, ou /data de l'API).
import { compositesToDomain, manifestToCatalog } from "../contract/manifestMapper";

export const ENDPOINTS = {
  catalog: "/api/manifest", // manifest complet (aoi + acquisitions)
  composites: "/api/composites", // composites saisonniers (facultatif)
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

  async function getJson(path, { optional = false } = {}) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      // credentials: "omit" : aucune information de session n'est envoyée à l'API (lecture publique)
      const res = await fetch(`${base}${path}`, { signal: ctrl.signal, credentials: "omit", headers: { Accept: "application/json" } });
      if (!res.ok) {
        if (optional && res.status === 404) return null;
        throw new Error(`${path} : HTTP ${res.status}`);
      }
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    async getCatalog() {
      try {
        const [manifest, composites] = await Promise.all([
          getJson(ENDPOINTS.catalog),
          getJson(ENDPOINTS.composites, { optional: true }).catch(() => null),
        ]);
        return { ...toCatalog(manifest, resolveUrl), composites: compositesToDomain(composites, resolveUrl), source: "api" };
      } catch (err) {
        if (!fallback) throw err;
        console.warn(`API indisponible (${err.message}) : repli sur les fichiers statiques.`);
        return fallback.getCatalog();
      }
    },
  };
}
