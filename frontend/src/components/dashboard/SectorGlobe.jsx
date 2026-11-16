/* eslint-disable react/prop-types */
// Carte « Secteur d'étude » du tableau de bord.
// Remplace les vignettes saison sèche / saison des pluies : le globe de l'accueil réapparaît ici,
// plonge sur l'emprise du contrat (bbox), puis cède la place à l'image radar du secteur à la date choisie.
import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import { centerOf, extentKm } from "../../domain/geo";
import { SEASON_LABEL, fCoord as coord, fDate, nf } from "../../ui/format";
import { useI18n } from "../../i18n";

const SectorGlobeCanvas = lazy(() => import("./SectorGlobeCanvas.jsx"));

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// La plongée se joue une fois par session (en arrivant de l'accueil), pas à chaque retour sur la page.
let introPlayed = false;

export default function SectorGlobe({ studyArea, acquisition, active, onOpenMap }) {
  const { t } = useI18n();
  const [webgl] = useState(hasWebGL);
  const [reduced] = useState(prefersReducedMotion);
  const [phase, setPhase] = useState(() => (webgl && !introPlayed ? "globe" : "sector"));
  const [runKey, setRunKey] = useState(0);
  const [startedWithGlobe] = useState(phase === "globe");

  const arrived = useCallback(() => {
    introPlayed = true;
    setPhase("sector");
  }, []);
  const replay = () => {
    setPhase("globe");
    setRunKey((k) => k + 1);
  };

  useEffect(() => {
    if (!webgl) setPhase("sector");
  }, [webgl]);

  const { bbox, width: iw, height: ih } = studyArea;
  const { widthKm: kmW, heightKm: kmH } = extentKm(studyArea);
  const center = centerOf(studyArea);
  const showSector = phase === "sector";

  return (
    <div className="sar-card relative min-h-[340px] overflow-hidden p-0 lg:min-h-[380px]" style={{ background: "#03060c" }}>
      {/* 1. Globe (WebGL), monté seulement quand l'écran d'accueil est fermé */}
      {webgl && active && (startedWithGlobe || runKey > 0) && (
        <div className={`absolute inset-0 transition-opacity duration-700 ${showSector ? "opacity-0" : "opacity-100"}`} aria-hidden="true">
          <Suspense fallback={null}>
            <SectorGlobeCanvas bbox={[bbox.west, bbox.south, bbox.east, bbox.north]} runKey={runKey} paused={showSector} reducedMotion={reduced} onArrived={arrived} />
          </Suspense>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(3,6,12,0.8)_100%)]" />
        </div>
      )}

      {/* Statut pendant la plongée */}
      {!showSector && (
        <div className="pointer-events-none absolute inset-x-0 bottom-5 text-center font-mono text-[10.5px] uppercase tracking-[0.25em] text-sar-ink2">
          {t("Positionnement sur le secteur d’étude")}
          <span className="mt-1.5 block text-sar-mut">
            {coord(center.lat, "N", "S")} · {coord(center.lon, "E", "O")}
          </span>
        </div>
      )}

      {/* 2. Secteur : image radar géoréférencée de la date choisie */}
      <div
        className={`relative flex flex-col gap-4 p-4 transition-opacity duration-700 sm:absolute sm:inset-0 sm:flex-row sm:p-5 ${
          showSector ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="flex min-w-0 flex-col sm:w-[40%]">
          <span className="sar-lab">{t("Secteur d’étude")}</span>
          <h3 className="mt-1 text-[17px] font-semibold leading-tight">{t(studyArea.name)}</h3>
          <dl className="mt-3 space-y-1 text-[12.5px]">
            <Kv k={t("Latitude")} v={`${coord(bbox.south, "N", "S")} – ${coord(bbox.north, "N", "S")}`} />
            <Kv k={t("Longitude")} v={`${coord(bbox.west, "E", "O")} – ${coord(bbox.east, "E", "O")}`} />
            <Kv k={t("Emprise")} v={`${nf(kmW, 0)} × ${nf(kmH, 0)} km`} />
            <Kv k={t("Grille")} v={`${iw} × ${ih} px`} />
            <Kv k={t("Projection")} v={studyArea.crs} />
          </dl>

          {acquisition && (
            <div className="mt-auto pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <SeasonChip season={acquisition.season} />
                <span className="text-[12.5px] text-sar-ink2">{fDate(acquisition.date)}</span>
              </div>
              <div className="mt-1.5 text-[26px] font-semibold leading-none tracking-tight">
                {nf(acquisition.waterAreaKm2)}
                <small className="ml-1 text-[13px] font-normal text-sar-mut">{t("km² en eau")}</small>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {onOpenMap && (
                  <button className="sar-btn h-[30px] px-2.5 text-[12px]" onClick={onOpenMap}>
                    {t("Ouvrir la carte")} <ArrowRight size={14} />
                  </button>
                )}
                {webgl && (
                  <button className="sar-btn h-[30px] px-2.5 text-[12px]" onClick={replay} title={t("Rejouer la plongée depuis le globe")}>
                    <RotateCcw size={14} /> {t("Revoir le globe")}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <figure className="relative m-0 flex h-[280px] min-h-0 min-w-0 flex-1 items-center justify-center sm:h-auto">
          <svg
            viewBox={`0 0 ${iw} ${ih}`}
            preserveAspectRatio="xMidYMid meet"
            className={`h-full min-h-[220px] w-full transition-transform duration-[900ms] ease-out ${showSector ? "scale-100" : "scale-[0.35]"}`}
            role="img"
            aria-label={acquisition ? t("Image radar du secteur, {date}", { date: fDate(acquisition.date) }) : t("Image radar du secteur")}
          >
            <rect width={iw} height={ih} fill="#000" />
            {acquisition && <SectorLayers key={acquisition.id} acquisition={acquisition} w={iw} h={ih} />}
            <rect width={iw} height={ih} fill="none" stroke="#222a35" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            <FrameTicks w={iw} h={ih} />
          </svg>
          <figcaption className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-3 whitespace-nowrap rounded-md border border-sar-line bg-black/75 px-2 py-1 text-[11px] text-sar-ink2 backdrop-blur">
            <Swatch c="#22d3ee" l={t("Eau détectée")} />
            <Swatch c="#fb923c" l={t("Eau nouvelle")} />
            <span className="text-sar-mut">{t("fond : radar {pol}", { pol: acquisition?.polarization ?? "" })}</span>
          </figcaption>
        </figure>
      </div>
    </div>
  );
}

// Fond radar + masque d'eau + eau nouvelle, superposés sur la même grille (contrat : mêmes dimensions)
function SectorLayers({ acquisition, w, h }) {
  const L = acquisition.layers;
  const keys = ["backscatter", "waterMask", "newWaterMask"].filter((k) => L[k]);
  return (
    <g className="animate-[sar-fade_400ms_ease-out]">
      {keys.map((k) => (
        <image key={k} href={L[k]} width={w} height={h} preserveAspectRatio="none" />
      ))}
      <style>{`@keyframes sar-fade{from{opacity:.2}to{opacity:1}}`}</style>
    </g>
  );
}

// Coins de cadrage, comme le réticule de l'accueil
function FrameTicks({ w, h }) {
  const L = Math.round(Math.min(w, h) * 0.05);
  const m = Math.round(L * 0.35);
  const d = [
    `M${m} ${m + L}V${m}H${m + L}`,
    `M${w - m - L} ${m}H${w - m}V${m + L}`,
    `M${m} ${h - m - L}V${h - m}H${m + L}`,
    `M${w - m - L} ${h - m}H${w - m}V${h - m - L}`,
  ].join("");
  return <path d={d} fill="none" stroke="#19d3f3" strokeWidth="2" vectorEffect="non-scaling-stroke" />;
}

const Kv = ({ k, v }) => (
  <div className="flex justify-between gap-3 text-sar-ink2">
    <dt>{k}</dt>
    <dd className="m-0 text-right font-mono text-[12px] text-sar-ink">{v}</dd>
  </div>
);

const Swatch = ({ c, l }) => (
  <span className="inline-flex items-center gap-1.5">
    <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
    {l}
  </span>
);

export function SeasonChip({ season }) {
  const { t } = useI18n();
  const cls = season === "dry" ? "bg-sar-dry/15 text-sar-dry" : "bg-sar-water/15 text-sar-water";
  return <span className={`sar-chip ${cls}`}>{SEASON_LABEL[season] ? t(SEASON_LABEL[season]) : season}</span>;
}
