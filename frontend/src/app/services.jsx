/* eslint-disable react/prop-types, react-refresh/only-export-components */
// Liaison React <-> cas d'usage : les composants reçoivent les cas d'usage par contexte
// (injection de dépendances) et ne connaissent jamais les adaptateurs.
import { createContext, useContext, useEffect, useState } from "react";

const ServicesContext = createContext(null);

export function ServicesProvider({ services, children }) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices() {
  const s = useContext(ServicesContext);
  if (!s) throw new Error("ServicesProvider manquant autour de l'application");
  return s;
}

// Exécute une tâche asynchrone et expose { status, data, error } ; ignore les réponses périmées.
// status : "idle" (rien à calculer), "loading", "ready", "error".
function useAsync(run, deps) {
  const [state, setState] = useState({ status: "loading", data: null, error: null, key: null });
  const key = JSON.stringify(deps);
  useEffect(() => {
    let alive = true;
    const p = run();
    if (!p) {
      setState({ status: "idle", data: null, error: null, key });
      return;
    }
    setState((s) => ({ ...s, status: "loading", key }));
    p.then((data) => alive && setState({ status: "ready", data, error: null, key })).catch(
      (error) => alive && setState({ status: "error", data: null, error, key })
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state.key === key ? state : { status: "loading", data: null, error: null, key };
}

/** Catalogue (acquisitions exploitables, indicateurs, préréglage saisons). */
export function useCatalog() {
  const { loadCatalog } = useServices();
  const s = useAsync(() => loadCatalog(), ["catalog"]);
  return { status: s.status, catalog: s.data, error: s.error };
}

/** Eau gagnée / rendue entre deux acquisitions. */
export function useComparison(catalog, idA, idB) {
  const { compareAcquisitions } = useServices();
  const s = useAsync(() => (catalog && idA && idB ? compareAcquisitions(catalog, idA, idB) : null), [idA, idB, !!catalog]);
  return { status: s.status, comparison: s.data, error: s.error };
}

/** Exposition des quartiers, pour chaque acquisition. */
export function useQuartierExposure(catalog) {
  const { quartierExposure } = useServices();
  const s = useAsync(() => (catalog ? quartierExposure(catalog) : null), [!!catalog]);
  return { status: s.status, exposure: s.data, error: s.error };
}

/** Liste des quartiers suivis (recherche de l'en-tête). */
export function useQuartiers() {
  const { listQuartiers } = useServices();
  const s = useAsync(() => listQuartiers(), ["quartiers"]);
  return s.data ?? [];
}

/** Fréquence d'inondation par pixel, toutes dates confondues. */
export function useFloodFrequency(catalog, enabled = true) {
  const { floodFrequencyMap } = useServices();
  const s = useAsync(() => (catalog && enabled ? floodFrequencyMap(catalog) : null), [!!catalog, enabled]);
  return { status: s.status, frequency: s.data, error: s.error };
}

/** Atelier du seuil pour une date. */
export function useThresholdStudy(catalog, id, thresholdDb) {
  const { thresholdStudy } = useServices();
  const s = useAsync(() => (catalog && id ? thresholdStudy(catalog, id, thresholdDb) : null), [id, thresholdDb, !!catalog]);
  return { status: s.status, study: s.data, error: s.error };
}

/** Inspection d'un point de la carte (null = aucun point choisi). */
export function useProbe(catalog, id, point) {
  const { probePoint } = useServices();
  const s = useAsync(
    () => (catalog && id && point ? probePoint(catalog, id, point.lon, point.lat) : null),
    [id, point?.lon, point?.lat, !!catalog]
  );
  return { status: s.status, probe: s.data, error: s.error };
}

/** Source de données configurée et réellement utilisée (indicateur K13). */
export function useDataSource(catalog) {
  const { dataMode, apiUrl } = useServices();
  const source = catalog?.source ?? null;
  const state = dataMode === "static" ? "static" : source === "api" ? "api" : source ? "fallback" : "pending";
  return { mode: dataMode, state, apiUrl };
}
