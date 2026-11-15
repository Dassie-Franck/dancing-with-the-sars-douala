import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Columns2, LayoutDashboard, Map as MapIcon } from "lucide-react";
import Logo from "./components/brand/Logo";
import IntroGlobe from "./components/globe/IntroGlobe";
import MapView from "./components/MapView";
import Dashboard from "./components/dashboard/Dashboard";
import ComparePage from "./components/compare/ComparePage";
import { useCatalog } from "./app/services";
import { fShort } from "./ui/format";

const NO_ACQUISITIONS = [];

// Vues de l'application. Pour ajouter une page (Analyse, Ce que voit le radar…), ajouter une entrée ici.
const NAV = [
  { id: "tableau-de-bord", label: "Tableau de bord", Icon: LayoutDashboard },
  { id: "carte", label: "Carte radar", Icon: MapIcon },
  { id: "comparer", label: "Comparer deux dates", Icon: Columns2 },
];
const viewFromHash = () => {
  const h = window.location.hash.slice(1);
  return NAV.some((n) => n.id === h) ? h : NAV[0].id;
};

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [view, setView] = useState(viewFromHash);
  const { status, catalog, error } = useCatalog();
  const series = catalog?.acquisitions ?? NO_ACQUISITIONS;
  const [selectedId, setSelectedId] = useState(null);
  const [pair, setPair] = useState(null);

  // Date par défaut : la plus récente ; paire par défaut : le préréglage saisons (F12)
  useEffect(() => {
    if (status !== "ready" || !series.length) return;
    setSelectedId((cur) => cur ?? series.at(-1).id);
    setPair((cur) => cur ?? catalog.contrastedPair ?? [series[0].id, series.at(-1).id]);
  }, [status, series, catalog]);

  const go = useCallback((id) => {
    setView(id);
    try {
      window.history.replaceState(null, "", `#${id}`);
    } catch {
      /* navigation sans historique */
    }
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const onHash = () => setView(viewFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Fin de l'écran d'accueil : arrivée sur le tableau de bord
  const introDone = useCallback(() => {
    setShowIntro(false);
    go("tableau-de-bord");
  }, [go]);

  const idx = series.findIndex((s) => s.id === selectedId);
  const selected = series[idx];
  const step = useCallback(
    (d) => {
      if (!series.length) return;
      const i = series.findIndex((s) => s.id === selectedId);
      setSelectedId(series[(i + d + series.length) % series.length].id);
    },
    [series, selectedId]
  );

  // Flèches ← → : date précédente / suivante
  useEffect(() => {
    const onKey = (e) => {
      if (showIntro || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, showIntro]);

  const current = NAV.find((n) => n.id === view);
  const hasMock = catalog?.hasMockData;
  const ready = status === "ready" && selectedId && pair;

  return (
    <>
      {showIntro && <IntroGlobe onDone={introDone} />}

      <div className="md:grid md:min-h-full md:grid-cols-[68px_1fr]">
        {/* Barre d'icônes (en bas sur mobile) */}
        <nav
          aria-label="Navigation principale"
          className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-center justify-around border-t border-sar-line bg-[#090b10] md:sticky md:top-0 md:h-screen md:flex-col md:justify-start md:gap-1.5 md:border-r md:border-t-0 md:py-3.5"
        >
          <Logo size={42} className="mb-[18px] hidden shadow-[0_0_22px_rgba(25,211,243,.4)] md:block" />
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => go(id)}
              aria-label={label}
              aria-current={view === id ? "page" : undefined}
              className={`group relative grid h-[42px] w-[42px] place-items-center rounded-[11px] transition-colors ${
                view === id ? "bg-sar-acc/[.13] text-sar-acc" : "text-sar-mut hover:bg-sar-sf2 hover:text-sar-ink"
              }`}
            >
              <Icon size={20} strokeWidth={1.7} />
              <span className="pointer-events-none absolute left-[54px] top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-[7px] border border-sar-line bg-black px-2.5 py-1 text-xs text-sar-ink opacity-0 transition-opacity group-hover:opacity-100 md:block">
                {label}
              </span>
            </button>
          ))}
        </nav>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-sar-line bg-[rgba(7,9,13,.88)] px-3 backdrop-blur-md sm:h-16 sm:gap-3.5 sm:px-[22px]">
            <h1 className="truncate text-[15px] font-semibold tracking-tight sm:text-[19px]">{current.label}</h1>
            <span className="hidden truncate text-[13px] text-sar-mut lg:inline">Dancing with the SARs · Douala et estuaire du Wouri</span>
            <div className="flex-1" />
            {hasMock && (
              <span
                className="inline-flex h-8 shrink-0 items-center rounded-full border border-dashed border-sar-mut px-2.5 text-xs text-sar-ink2 sm:px-3"
                title="Ces images et chiffres sont des données factices conformes au contrat de données, en attendant les produits NISAR."
              >
                <span className="sm:hidden">Démo</span>
                <span className="hidden sm:inline">Données de démonstration</span>
              </span>
            )}
            {ready && view !== "comparer" && (
              <div className="flex h-8 items-center rounded-[10px] border border-sar-line bg-sar-sf" title="Date d’acquisition (flèches ← →)">
                <button className="grid h-full w-7 place-items-center text-sar-ink2 hover:text-sar-acc" onClick={() => step(-1)} aria-label="Date précédente">
                  <ChevronLeft size={16} />
                </button>
                <span className="min-w-[88px] px-1 text-center font-mono text-xs font-medium">
                  {fShort(selected.date)} {selected.date.slice(0, 4)}
                  <span className="ml-1 text-sar-mut">
                    {idx + 1}/{series.length}
                  </span>
                </span>
                <button className="grid h-full w-7 place-items-center text-sar-ink2 hover:text-sar-acc" onClick={() => step(1)} aria-label="Date suivante">
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </header>

          <main>
            {status === "loading" && <p className="p-6 text-sar-ink2">Chargement des acquisitions…</p>}
            {status === "error" && (
              <p className="m-6 rounded-card border border-sar-bad/40 bg-sar-bad/10 p-4 text-sar-ink">
                Impossible de charger les données : {error.message}
              </p>
            )}
            {/* Monté après l'accueil : la carte et les calculs ne ralentissent pas le globe */}
            {ready && !showIntro && view === "tableau-de-bord" && (
              <Dashboard
                catalog={catalog}
                selectedId={selectedId}
                onSelect={setSelectedId}
                active={!showIntro}
                onNavigate={go}
              />
            )}
            {view === "carte" && (
              <div className="h-[calc(100vh-56px-56px)] p-4 sm:h-[calc(100vh-64px)] sm:p-[22px]">
                <MapView />
              </div>
            )}
            {ready && view === "comparer" && <ComparePage catalog={catalog} pair={pair} onPairChange={setPair} />}
          </main>
        </div>
      </div>
    </>
  );
}
