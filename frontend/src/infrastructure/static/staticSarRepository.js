// INFRASTRUCTURE · Adaptateur « fichiers statiques » du port SarRepository.
// Lit frontend/public/data/ : manifest.json (obligatoire) et composites.json (facultatif), produits par le notebook.
import { compositesToDomain, manifestToCatalog } from "../contract/manifestMapper";

async function fetchJson(url, { optional = false } = {}) {
  const res = await fetch(url, { cache: "no-cache", headers: { Accept: "application/json" } });
  if (!res.ok) {
    if (optional) return null;
    throw new Error(`${url} introuvable (${res.status})`);
  }
  return res.json();
}

/** @returns {import("../../application/ports").SarRepository} */
export function createStaticSarRepository({ baseUrl }) {
  const resolveUrl = (rel) => `${baseUrl}${rel}`;
  return {
    async getCatalog() {
      const [manifest, composites] = await Promise.all([
        fetchJson(`${baseUrl}manifest.json`),
        fetchJson(`${baseUrl}composites.json`, { optional: true }).catch(() => null),
      ]);
      return { ...manifestToCatalog(manifest, resolveUrl), composites: compositesToDomain(composites, resolveUrl), source: "static" };
    },
  };
}
