/* eslint-disable react/prop-types */
// Coquille de l'application (F1) et état global partagé (F4) : date choisie, dates comparées,
// réglages de la carte, navigation. Les pages reçoivent ces valeurs ; les données passent par app/services.
import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Columns2,
  LayoutDashboard,
  Map as MapIcon,
  PlayCircle,
  Radar,
  Search,
} from "lucide-react";
import Logo from "./components/brand/Logo";
import LangSwitch from "./components/brand/LangSwitch";
import { useI18n } from "./i18n";
import IntroGlobe from "./components/globe/IntroGlobe";
import Dashboard from "./components/dashboard/Dashboard";
import GuidedTour from "./components/tour/GuidedTour";
import { DEFAULT_OBS, withPreset } from "./components/observatoire/obsSettings";
import { useCatalog, useDataSource, useQuartiers } from "./app/services";
import { fShort } from "./ui/format";

const NO_ACQUISITIONS = [];

// Pages chargées à la demande (F18) : le tableau de bord s’affiche sans attendre le reste
const ObservatoirePage = lazy(() => import("./components/observatoire/ObservatoirePage"));
const ComparePage = lazy(() => import("./components/compare/ComparePage"));
const AnalysePage = lazy(() => import("./components/analyse/AnalysePage"));
const RadarExplainer = lazy(() => import("./components/learn/RadarExplainer"));

// Vues de l'application (une entrée = une page et une icône de la barre latérale)
const NAV = [
  { id: "tableau-de-bord", label: "Tableau de bord", Icon: LayoutDashboard },
  { id: "carte", label: "Observatoire SAR", Icon: MapIcon },
  { id: "comparer", label: "Comparer deux dates", Icon: Columns2 },
  { id: "analyse", label: "Analyse", Icon: BarChart3 },
  { id: "comprendre", label: "Ce que voit le radar", Icon: Radar },
];
const WITH_DATE = new Set(["tableau-de-bord", "carte", "analyse"]);

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
  const [obs, setObs] = useState(DEFAULT_OBS);
  const [radarTab, setRadarTab] = useState("miroir");
  const [tourStep, setTourStep] = useState(null);
  const quartiers = useQuartiers();
  const source = useDataSource(catalog);
  const { t } = useI18n();

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

  // Action venue d'une page (bouton « Voir sur la carte », démo guidée…) :
  // { view, date?: "max"|"min"|id, preset?: réglages de la carte, tab?: onglet radar, pair?: "contrast" }
  const runAction = useCallback(
    (action) => {
      if (!action) return;
      if (catalog && action.date) {
        const target =
          action.date === "max" ? catalog.stats?.maxDate : action.date === "min" ? catalog.stats?.minDate : action.date;
        const a = catalog.acquisitions.find((x) => x.id === target || x.date === target);
        if (a) setSelectedId(a.id);
      }
      if (catalog && action.pair === "contrast" && catalog.contrastedPair) setPair(catalog.contrastedPair);
      if (action.preset) setObs((o) => withPreset(o, action.preset));
      if (action.tab) setRadarTab(action.tab);
      if (action.view) go(action.view);
    },
    [catalog, go]
  );

  const openQuartier = useCallback(
    (id) => runAction({ view: "carte", preset: { focusQuartierId: id, layers: { quartiers: true } } }),
    [runAction]
  );

  const idx = series.findIndex((s) => s.id === selectedId);
  const selected = series[idx];
  const step = useCallback(
    (d) => {
      if (!series.length) return;
      setSelectedId((cur) => {
        const i = series.findIndex((s) => s.id === cur);
        return series[(i + d + series.length) % series.length].id;
      });
    },
    [series]
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
  const ready = status === "ready" && selected && pair;

  return (
    <>
      {showIntro && <IntroGlobe onDone={introDone} sensor={catalog?.sensor} />}

      <div className="md:grid md:min-h-full md:grid-cols-[68px_1fr]">
        {/* Barre d'icônes (en bas sur mobile) */}
        <nav
          aria-label={t("Navigation principale")}
          className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-center justify-around border-t border-sar-line bg-[#090b10] px-1 md:sticky md:top-0 md:h-screen md:flex-col md:justify-start md:gap-1.5 md:border-r md:border-t-0 md:px-0 md:py-3.5"
        >
          <Logo size={42} className="mb-[18px] hidden shadow-[0_0_22px_rgba(25,211,243,.4)] md:block" />
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => go(id)}
              aria-label={t(label)}
              aria-current={view === id ? "page" : undefined}
              className={`group relative grid h-[42px] w-[42px] place-items-center rounded-[11px] transition-colors ${
                view === id ? "bg-sar-acc/[.13] text-sar-acc" : "text-sar-mut hover:bg-sar-sf2 hover:text-sar-ink"
              }`}
            >
              <Icon size={20} strokeWidth={1.7} />
              <span className="pointer-events-none absolute left-[54px] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-[7px] border border-sar-line bg-black px-2.5 py-1 text-xs text-sar-ink opacity-0 transition-opacity group-hover:opacity-100 md:block">
                {t(label)}
              </span>
            </button>
          ))}
        </nav>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2.5 border-b border-sar-line bg-[rgba(7,9,13,.88)] px-3 backdrop-blur-md sm:h-16 sm:gap-3 sm:px-[22px]">
            <h1 className="min-w-0 truncate text-[15px] font-semibold tracking-tight sm:text-[19px]">{t(current.label)}</h1>
            <span className="hidden truncate text-[13px] text-sar-mut 2xl:inline">Dancing with the SARs · {t("Douala et estuaire du Wouri")}</span>
            <div className="flex-1" />

            <QuartierSearch quartiers={quartiers} onPick={openQuartier} />
            <SourcePill source={source} />
            {catalog?.hasMockData && (
              <span
                className="hidden h-8 shrink-0 items-center rounded-full border border-dashed border-sar-mut px-3 text-xs text-sar-ink2 lg:inline-flex"
                title={t("Au moins une acquisition du manifest est marquée « mock » : ces images ne sont pas des mesures réelles.")}
              >
                {t("Données de démonstration")}
              </span>
            )}
            {ready && WITH_DATE.has(view) && (
              <div className="flex h-8 shrink-0 items-center rounded-[10px] border border-sar-line bg-sar-sf" title={t("Date d’acquisition (flèches ← →)")}>
                <button className="grid h-full w-7 place-items-center text-sar-ink2 hover:text-sar-acc" onClick={() => step(-1)} aria-label={t("Date précédente")}>
                  <ChevronLeft size={16} />
                </button>
                <span className="min-w-[70px] px-1 text-center font-mono text-xs font-medium sm:min-w-[88px]">
                  {fShort(selected.date)}
                  <span className="hidden sm:inline"> {selected.date.slice(0, 4)}</span>
                  <span className="ml-1 text-sar-mut">
                    {idx + 1}/{series.length}
                  </span>
                </span>
                <button className="grid h-full w-7 place-items-center text-sar-ink2 hover:text-sar-acc" onClick={() => step(1)} aria-label={t("Date suivante")}>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
            {ready && (
              <button
                className="sar-btn hidden h-8 px-2.5 text-[12px] sm:inline-flex"
                onClick={() => setTourStep(0)}
                title={t("Parcours automatique des pages clés")}
              >
                <PlayCircle size={15} /> {t("Démo guidée")}
              </button>
            )}
            <LangSwitch />
          </header>

          <main>
            {status === "loading" && <p className="p-6 text-sar-ink2">{t("Chargement des acquisitions…")}</p>}
            {status === "error" && (
              <p className="m-6 rounded-card border border-sar-bad/40 bg-sar-bad/10 p-4 text-sar-ink">
                {t("Impossible de charger les données :")} {error.message}
              </p>
            )}
            {ready && !catalog.acquisitions.length && <p className="p-6 text-sar-ink2">{t("Aucune acquisition exploitable dans les données.")}</p>}

            {/* Monté après l'accueil : cartes et calculs ne ralentissent pas le globe */}
            {ready && !showIntro && (
              <Suspense fallback={<p className="p-6 text-sar-ink2">{t("Chargement de la page…")}</p>}>
                {view === "tableau-de-bord" && (
                  <Dashboard catalog={catalog} selectedId={selectedId} onSelect={setSelectedId} active={!showIntro} onNavigate={go} />
                )}
                {view === "carte" && (
                  <ObservatoirePage catalog={catalog} selectedId={selectedId} onSelect={setSelectedId} onStep={step} obs={obs} setObs={setObs} />
                )}
                {view === "comparer" && <ComparePage catalog={catalog} pair={pair} onPairChange={setPair} />}
                {view === "analyse" && (
                  <AnalysePage catalog={catalog} selectedId={selectedId} onSelect={setSelectedId} onOpenQuartier={openQuartier} />
                )}
                {view === "comprendre" && <RadarExplainer tab={radarTab} onTab={setRadarTab} onAction={runAction} />}
              </Suspense>
            )}
          </main>
        </div>
      </div>

      {tourStep != null && <GuidedTour step={tourStep} onStep={setTourStep} onClose={() => setTourStep(null)} onAction={runAction} />}
    </>
  );
}

// Recherche d'un quartier : ouvre l'observatoire centré dessus
function QuartierSearch({ quartiers, onPick }) {
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const pick = (v) => {
    const q = quartiers.find((x) => x.name.toLowerCase() === v.trim().toLowerCase());
    if (q) {
      onPick(q.id);
      setValue("");
    }
  };
  return (
    <label className="hidden h-[34px] w-[210px] shrink-0 items-center gap-2 rounded-[10px] border border-sar-line bg-sar-sf px-2.5 text-sar-mut focus-within:border-sar-acc xl:flex">
      <Search size={15} aria-hidden="true" />
      <input
        list="sar-quartiers"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          pick(e.target.value);
        }}
        onKeyDown={(e) => e.key === "Enter" && pick(value)}
        placeholder={t("Rechercher un quartier")}
        aria-label={t("Rechercher un quartier")}
        className="w-full border-0 bg-transparent text-[13px] text-sar-ink outline-none placeholder:text-sar-mut"
      />
      <datalist id="sar-quartiers">
        {quartiers.map((q) => (
          <option key={q.id} value={q.name} />
        ))}
      </datalist>
    </label>
  );
}

// Indicateur de la source des données (K13) : fichiers statiques, API en ligne, ou repli statique
function SourcePill({ source }) {
  const { t } = useI18n();
  const info = {
    static: [t("Fichiers statiques"), "bg-sar-mut", t("Données lues dans public/data (manifest.json du notebook).")],
    api: [t("API en ligne"), "bg-sar-ok", t("Données servies par l’API : {url}", { url: source.apiUrl })],
    fallback: [t("Repli statique"), "bg-sar-warn", t("L’API n’a pas répondu en 3 s : les fichiers statiques ont pris le relais.")],
    pending: [t("Connexion…"), "bg-sar-mut", ""],
  }[source.state];
  return (
    <span
      className="hidden h-8 shrink-0 items-center gap-2 rounded-full border border-sar-line bg-sar-sf px-3 text-xs text-sar-ink2 md:inline-flex"
      title={info[2]}
    >
      <i className={`h-[7px] w-[7px] rounded-full ${info[1]}`} />
      {info[0]}
    </span>
  );
}
