// INFRASTRUCTURE · Adaptateur « fichiers statiques » du port SarRepository.
// Lit frontend/public/data/manifest.json : aujourd'hui les données factices, demain la sortie du notebook.
import { manifestToCatalog } from "../contract/manifestMapper";

/** @returns {import("../../application/ports").SarRepository} */
export function createStaticSarRepository({ baseUrl }) {
  const resolveUrl = (rel) => `${baseUrl}${rel}`;
  return {
    async getCatalog() {
      const res = await fetch(`${baseUrl}manifest.json`);
      if (!res.ok) throw new Error(`manifest.json introuvable (${res.status})`);
      return { ...manifestToCatalog(await res.json(), resolveUrl), source: "static" };
    },
  };
}
