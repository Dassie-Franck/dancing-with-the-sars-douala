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
function useAsync(run, deps) {
  const [state, setState] = useState({ status: "loading", data: null, error: null, key: null });
  const key = JSON.stringify(deps);
  useEffect(() => {
    let alive = true;
    const p = run();
    if (!p) return;
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
