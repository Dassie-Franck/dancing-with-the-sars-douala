// APPLICATION · Cas d'usage
// Orchestration : on lit les données par les ports, on applique les règles du domaine.
// Aucune connaissance de React, de fetch, de manifest.json ni de l'API.
import { PORTS, assertPort } from "./ports";
import { computeWaterStats, isUsable, mostContrastedPair } from "../domain/waterStats";
import { compareWaterMasks } from "../domain/waterChange";
import { rankQuartiers } from "../domain/exposure";
import { histogram, interpretDb, otsuThreshold, waterAreaBelow } from "../domain/backscatter";
import { floodFrequency } from "../domain/frequency";
import { toPixel } from "../domain/geo";
import { describeSensor } from "../domain/sensor";

/**
 * Catalogue prêt pour l'interface.
 * @typedef {Object} Catalog
 * @property {import("../domain/model").StudyArea} studyArea
 * @property {string} referenceId
 * @property {number} defaultThresholdDb
 * @property {[number, number]} dbRange
 * @property {"static"|"api"} source
 * @property {import("../domain/model").Acquisition[]} acquisitions  exploitables, triées par date
 * @property {ReturnType<typeof computeWaterStats>} stats
 * @property {[string, string] | null} contrastedPair
 * @property {boolean} hasMockData
 * @property {import("../domain/model").Sensor} sensor
 * @property {{dry?: import("../domain/model").SeasonComposite, rain?: import("../domain/model").SeasonComposite}} composites
 * @property {string|null} generatedAt
 */

/**
 * @param {{sarRepository: import("./ports").SarRepository,
 *          rasterReader: import("./ports").RasterReader,
 *          quartierRepository: import("./ports").QuartierRepository}} deps
 */
export function createUseCases({ sarRepository, rasterReader, quartierRepository }) {
  assertPort("SarRepository", sarRepository, PORTS.SarRepository);
  assertPort("RasterReader", rasterReader, PORTS.RasterReader);
  assertPort("QuartierRepository", quartierRepository, PORTS.QuartierRepository);

  // Résultats coûteux mémorisés par catalogue (un nouveau catalogue = nouveaux calculs)
  const memo = new WeakMap();
  const remember = (catalog, key, compute) => {
    if (!memo.has(catalog)) memo.set(catalog, new Map());
    const m = memo.get(catalog);
    if (!m.has(key)) {
      const p = compute();
      p.catch(() => m.delete(key));
      m.set(key, p);
    }
    return m.get(key);
  };
  const find = (catalog, id) => {
    const a = catalog.acquisitions.find((x) => x.id === id) ?? Object.values(catalog.composites ?? {}).find((c) => c.id === id);
    if (!a) throw new Error(`Acquisition inconnue : ${id}`);
    return a;
  };
  const reference = (catalog) => catalog.acquisitions.find((a) => a.id === catalog.referenceId) ?? catalog.acquisitions[0];
  const mask = (catalog, a) => rasterReader.readWaterMask(a, catalog.studyArea);
  const db = (catalog, a) => rasterReader.readBackscatterDb(a, catalog.studyArea, catalog.dbRange);

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
      dbRange: raw.dbRange ?? [-30, 0],
      source: raw.source ?? "static",
      acquisitions,
      stats: computeWaterStats(acquisitions),
      contrastedPair: mostContrastedPair(acquisitions),
      hasMockData: raw.acquisitions.some((a) => a.isMock),
      sensor: describeSensor({
        products: [...new Set(acquisitions.map((a) => a.product).filter(Boolean))],
        satellites: [...new Set(acquisitions.map((a) => a.satellite).filter(Boolean))],
        polarizations: [...new Set(acquisitions.map((a) => a.polarization).filter(Boolean))],
      }),
      composites: raw.composites ?? {},
      generatedAt: raw.generatedAt ?? null,
    });
  }

  /** Quartiers suivis. */
  const listQuartiers = () => quartierRepository.listQuartiers();

  /** Eau gagnée / rendue entre deux dates, ou entre les deux composites saisonniers (F11, F12). */
  function compareAcquisitions(catalog, idA, idB) {
    return remember(catalog, `cmp:${idA}|${idB}`, async () => {
      const [ma, mb] = await Promise.all([mask(catalog, find(catalog, idA)), mask(catalog, find(catalog, idB))]);
      return compareWaterMasks(ma, mb, catalog.studyArea);
    });
  }

  /** Exposition des quartiers pour chaque date : { [acquisitionId]: classement } */
  function quartierExposure(catalog) {
    return remember(catalog, "exposure", async () => {
      const quartiers = await quartierRepository.listQuartiers();
      const [refMask, ...masks] = await Promise.all([reference(catalog), ...catalog.acquisitions].map((a) => mask(catalog, a)));
      const byAcquisition = {};
      catalog.acquisitions.forEach((a, i) => {
        byAcquisition[a.id] = rankQuartiers(masks[i], refMask, catalog.studyArea, quartiers);
      });
      return { quartiers, byAcquisition };
    });
  }

  /** Fréquence d'inondation sur toutes les dates (hors eau permanente). */
  function floodFrequencyMap(catalog) {
    return remember(catalog, "frequency", async () => {
      const [refMask, ...masks] = await Promise.all([reference(catalog), ...catalog.acquisitions].map((a) => mask(catalog, a)));
      return floodFrequency(masks, refMask);
    });
  }

  /** Atelier du seuil : histogramme de rétrodiffusion d'une date, seuil d'Otsu, surface en eau au seuil choisi. */
  async function thresholdStudy(catalog, id, thresholdDb) {
    const acq = find(catalog, id);
    const hist = await remember(catalog, `hist:${id}`, async () => {
      const values = await db(catalog, acq);
      return { values, hist: histogram(values, catalog.dbRange[0], catalog.dbRange[1], 60) };
    });
    return {
      histogram: hist.hist,
      otsuDb: otsuThreshold(hist.hist),
      waterKm2: waterAreaBelow(hist.values, thresholdDb, catalog.studyArea),
      contractThresholdDb: acq.thresholdDb,
      contractWaterKm2: acq.waterAreaKm2,
    };
  }

  /**
   * Inspection d'un point (équivalent client de GET /api/point, K14).
   * @returns {Promise<null | {lon:number, lat:number, db:number|null, isWater:boolean,
   *   interpretation:string|null, series:{id:string, date:string, db:number|null}[]}>}
   */
  async function probePoint(catalog, id, lon, lat) {
    const { x, y } = toPixel(catalog.studyArea, lon, lat);
    const { width, height } = catalog.studyArea;
    if (x < 0 || y < 0 || x >= width || y >= height) return null;
    const k = Math.floor(y) * width + Math.floor(x);
    const [values, masks] = await Promise.all([
      Promise.all(catalog.acquisitions.map((a) => db(catalog, a))),
      mask(catalog, find(catalog, id)),
    ]);
    const series = catalog.acquisitions.map((a, i) => ({ id: a.id, date: a.date, db: Number.isNaN(values[i][k]) ? null : values[i][k] }));
    const value = series.find((s) => s.id === id)?.db ?? null;
    const threshold = find(catalog, id).thresholdDb ?? catalog.defaultThresholdDb;
    return { lon, lat, db: value, isWater: masks[k] > 0, interpretation: value == null ? null : interpretDb(value, threshold), series };
  }

  return { loadCatalog, listQuartiers, compareAcquisitions, quartierExposure, floodFrequencyMap, thresholdStudy, probePoint };
}
