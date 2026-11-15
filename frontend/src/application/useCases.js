// APPLICATION · Cas d'usage
// Orchestration : on lit les données par les ports, on applique les règles du domaine.
// Aucune connaissance de React, de fetch, de manifest.json ni de l'API.
import { PORTS, assertPort } from "./ports";
import { computeWaterStats, isUsable, mostContrastedPair } from "../domain/waterStats";
import { compareWaterMasks } from "../domain/waterChange";
import { rankQuartiers } from "../domain/exposure";

/**
 * Catalogue prêt pour l'interface.
 * @typedef {Object} Catalog
 * @property {import("../domain/model").StudyArea} studyArea
 * @property {string} referenceId
 * @property {number} defaultThresholdDb
 * @property {import("../domain/model").Acquisition[]} acquisitions  exploitables, triées par date
 * @property {ReturnType<typeof computeWaterStats>} stats
 * @property {[string, string] | null} contrastedPair
 * @property {boolean} hasMockData
 */

/**
 * @param {{sarRepository: import("./ports").SarRepository,
 *          maskReader: import("./ports").MaskReader,
 *          quartierRepository: import("./ports").QuartierRepository}} deps
 */
export function createUseCases({ sarRepository, maskReader, quartierRepository }) {
  assertPort("SarRepository", sarRepository, PORTS.SarRepository);
  assertPort("MaskReader", maskReader, PORTS.MaskReader);
  assertPort("QuartierRepository", quartierRepository, PORTS.QuartierRepository);

  const comparisons = new Map();

  /** Catalogue : acquisitions exploitables + indicateurs (tableau de bord, F13/F14/F16). */
  async function loadCatalog() {
    const raw = await sarRepository.getCatalog();
    const acquisitions = raw.acquisitions
      .filter((a) => isUsable(a, raw.minValidFraction))
      .sort((a, b) => a.date.localeCompare(b.date));
    return /** @type {Catalog} */ ({
      studyArea: raw.studyArea,
      referenceId: raw.referenceId,
      defaultThresholdDb: raw.defaultThresholdDb,
      acquisitions,
      stats: computeWaterStats(acquisitions),
      contrastedPair: mostContrastedPair(acquisitions),
      hasMockData: raw.acquisitions.some((a) => a.isMock),
    });
  }

  /** Eau gagnée / rendue entre deux dates (F11). */
  async function compareAcquisitions(catalog, idA, idB) {
    const key = `${idA}|${idB}`;
    if (!comparisons.has(key)) {
      const find = (id) => catalog.acquisitions.find((a) => a.id === id);
      const a = find(idA);
      const b = find(idB);
      if (!a || !b) throw new Error("Acquisition inconnue");
      const p = Promise.all([maskReader.readWaterMask(a, catalog.studyArea), maskReader.readWaterMask(b, catalog.studyArea)]).then(
        ([ma, mb]) => compareWaterMasks(ma, mb, catalog.studyArea)
      );
      p.catch(() => comparisons.delete(key));
      comparisons.set(key, p);
      if (comparisons.size > 12) comparisons.delete(comparisons.keys().next().value);
    }
    return comparisons.get(key);
  }

  /** Exposition des quartiers pour chaque date : { [acquisitionId]: classement } */
  async function quartierExposure(catalog) {
    const quartiers = await quartierRepository.listQuartiers();
    const reference =
      catalog.acquisitions.find((a) => a.id === catalog.referenceId) ?? catalog.acquisitions[0];
    const [refMask, ...masks] = await Promise.all(
      [reference, ...catalog.acquisitions].map((a) => maskReader.readWaterMask(a, catalog.studyArea))
    );
    const byAcquisition = {};
    catalog.acquisitions.forEach((a, i) => {
      byAcquisition[a.id] = rankQuartiers(masks[i], refMask, catalog.studyArea, quartiers);
    });
    return { quartiers, byAcquisition };
  }

  return { loadCatalog, compareAcquisitions, quartierExposure };
}
