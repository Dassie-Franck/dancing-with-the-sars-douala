/* eslint-disable react/prop-types */
// B1 – Écran d'accueil « console de mission » : globe 3D -> acquisition de Douala -> tableau de bord.
// Le module 3D (three.js) est chargé à part (lazy) pour ne pas ralentir le tableau de bord.
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { ArrowRight, Crosshair, Radio } from "lucide-react";
import Logo from "../brand/Logo";

const Globe3D = lazy(() => import("./Globe3D.jsx"));

const FLY_MS = 2500; // doit rester égal à FLY_MS dans Globe3D.jsx

// Fiche cible : uniquement des valeurs vérifiées (mission NISAR, centre de MapView)
const TELEMETRY = [
  ["Cible", "Douala · Wouri"],
  ["Coordonnées", "4.0511° N  9.7679° E"],
  ["Capteur", "NISAR L-SAR"],
  ["Longueur d’onde", "≈ 24 cm (bande L)"],
  ["Polarisations", "HH · HV"],
  ["Revisite", "12 jours"],
];

// Sans WebGL (vieux téléphone, navigateur bloqué), on saute le globe.
function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

// Horloge UTC, comme sur une console d'opérations
function useUtcClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now.toISOString().slice(0, 19).replace("T", "  ") + " UTC";
}

const mono = "font-mono tabular-nums";

// Coins de cadrage (réticule) autour de l'écran
function FrameCorners() {
  const c = "absolute h-6 w-6 border-blue-200/40";
  return (
    <div className="pointer-events-none absolute inset-4 sm:inset-6">
      <span className={`${c} left-0 top-0 border-l border-t`} />
      <span className={`${c} right-0 top-0 border-r border-t`} />
      <span className={`${c} bottom-0 left-0 border-b border-l`} />
      <span className={`${c} bottom-0 right-0 border-b border-r`} />
    </div>
  );
}

export default function IntroGlobe({ onDone }) {
  const [flying, setFlying] = useState(false);
  const [webgl] = useState(hasWebGL);
  const clock = useUtcClock();
  const done = useCallback(() => onDone?.(), [onDone]);

  useEffect(() => {
    if (!webgl) done();
  }, [webgl, done]);

  if (!webgl) return null;

  return (
    <div
      translate="no"
      className="fixed inset-0 z-50 overflow-hidden bg-space-900 text-white selection:bg-blue-300/30"
    >
      <Suspense
        fallback={
          <p className={`absolute inset-0 grid place-items-center text-xs uppercase tracking-[0.3em] text-blue-200/60 ${mono}`}>
            Initialisation du globe…
          </p>
        }
      >
        <Globe3D flying={flying} onArrived={done} />
      </Suspense>

      {/* Voile pour la lisibilité : vignette + dégradé bas */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(5,11,24,0.75)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-space-900 via-space-900/70 to-transparent" />

      <FrameCorners />

      {/* Barre supérieure : identité de mission + statut + horloge */}
      <header className="absolute inset-x-0 top-0 flex items-center justify-between gap-4 px-8 py-6 sm:px-12">
        <div className="flex items-center gap-3">
          <Logo size={40} decorative className="shadow-[0_0_22px_rgba(63,208,224,.35)]" />
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-wide">Dancing with the SARs</p>
            <p className={`text-[11px] uppercase tracking-[0.25em] text-blue-200/60 ${mono}`}>
              NASA Space Apps 2026
            </p>
          </div>
        </div>
        <div className={`hidden items-center gap-6 text-[11px] uppercase tracking-[0.2em] text-blue-100/70 sm:flex ${mono}`}>
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Données NISAR
          </span>
          <span>{clock}</span>
        </div>
      </header>

      {/* Fiche cible (télémétrie) – à droite, écrans larges */}
      <aside
        className={`absolute right-12 top-1/2 hidden w-72 -translate-y-1/2 rounded-sm border border-blue-200/15
          bg-space-900/50 backdrop-blur-md transition-opacity duration-500 lg:block ${flying ? "opacity-0" : "opacity-100"}`}
      >
        <div className="flex items-center justify-between border-b border-blue-200/15 px-5 py-3">
          <span className={`text-[11px] uppercase tracking-[0.25em] text-blue-200/70 ${mono}`}>Fiche cible</span>
          <Radio size={14} className="text-blue-200/70" />
        </div>
        <dl className="divide-y divide-blue-200/10 px-5">
          {TELEMETRY.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-xs text-blue-100/55">{k}</dt>
              <dd className={`text-right text-xs text-white ${mono}`}>{v}</dd>
            </div>
          ))}
        </dl>
      </aside>

      {/* Bloc principal : titre + actions (en bas à gauche) */}
      <section
        className={`absolute bottom-0 left-0 max-w-2xl px-8 pb-12 transition-all duration-500 sm:px-12 sm:pb-16
          ${flying ? "pointer-events-none translate-y-4 opacity-0" : "opacity-100"}`}
      >
        <p className={`mb-4 flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-blue-200/80 ${mono}`}>
          <span className="h-px w-8 bg-blue-200/60" />
          Observation radar<span className="hidden sm:inline">&nbsp;· Golfe de Guinée</span>
        </p>
        <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          Douala,
          <br />
          <span className="bg-gradient-to-r from-white via-blue-100 to-blue-300 bg-clip-text text-transparent">
            vue par le radar NISAR
          </span>
        </h1>
        
        <div className="mt-8 flex flex-wrap items-center gap-5">
          <button
            onClick={() => setFlying(true)}
            className="group flex items-center gap-3 rounded-sm bg-white px-6 py-3.5 text-sm font-semibold text-space-900
              shadow-[0_0_40px_rgba(147,197,253,0.35)] transition hover:shadow-[0_0_56px_rgba(147,197,253,0.6)]
              focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-space-900"
          >
            Explorer Douala
            <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
          </button>
          <button
            onClick={done}
            className={`text-[11px] uppercase tracking-[0.25em] text-blue-100/60 underline-offset-8 transition hover:text-white hover:underline ${mono}`}
          >
            Accéder au tableau de bord
          </button>
        </div>
      </section>

      {/* Séquence d'acquisition pendant le zoom : réticule au centre, statut en dessous */}
      {flying && (
        <div className="pointer-events-none absolute inset-0">
          <Crosshair
            size={64}
            strokeWidth={1}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse text-blue-100/80"
          />
          <div
            className={`absolute left-1/2 top-[calc(50%+72px)] -translate-x-1/2 text-center text-[11px] uppercase
              tracking-[0.3em] text-blue-100 ${mono}`}
          >
            Acquisition de la cible
            <div className="mx-auto mt-3 h-px w-48 overflow-hidden bg-blue-200/20">
              <div
                className="h-full bg-white"
                style={{ animation: `b1-progress ${FLY_MS}ms ease-in-out forwards` }}
              />
            </div>
            <span className="mt-3 block text-blue-200/60">4.0511° N · 9.7679° E</span>
          </div>
          <style>{`@keyframes b1-progress { from { width: 0% } to { width: 100% } }`}</style>
        </div>
      )}
    </div>
  );
}
