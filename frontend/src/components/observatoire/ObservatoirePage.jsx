/* eslint-disable react/prop-types */
// Observatoire SAR (M1, M2) : carte MapLibre de Douala (F3), couches radar et eau géoréférencées (F8, F9),
// légende (F10), chronologie avec lecture automatique (F6), date reliée à la carte sans clignotement (F7),
// préchargement pendant la lecture (F18), valeur radar au clic (K14).
import { useCallback, useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Eye, EyeOff, Minus, Pause, Play, Plus, X } from "lucide-react";
import { useFloodFrequency, useProbe, useQuartierExposure } from "../../app/services";
import { C, RISK_COLOR, SEASON_COLOR } from "../../ui/theme";
import { DB_READING, RISK_LABEL, fCoord, fDate, fShort, nf, polOf } from "../../ui/format";
import { BASEMAPS, applyBasemap, baseStyle, bboxBounds, pinSvg, preloadImages, setImageLayer } from "../map/mapKit";
import { useFrequencyImage } from "../map/useFrequencyImage";
import { LAYERS } from "./obsSettings";
import { tr, useI18n } from "../../i18n";
import { SeasonChip } from "../dashboard/SectorGlobe";

const PLAY_MS = 1500;
const bigScreen = (px) => typeof window !== "undefined" && window.innerWidth >= px;

export default function ObservatoirePage({ catalog, selectedId, onSelect, onStep, obs, setObs }) {
  const { studyArea, acquisitions, stats } = catalog;
  const pol = polOf(catalog);
  const { t } = useI18n();
  const idx = acquisitions.findIndex((a) => a.id === selectedId);
  const acq = acquisitions[idx];

  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const probeMarkerRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [probePoint, setProbePoint] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [leftOpen, setLeftOpen] = useState(() => bigScreen(768));
  const [rightOpen, setRightOpen] = useState(() => bigScreen(1024));
  // Sur petit écran (F17), un seul panneau ouvert à la fois pour garder la carte visible
  const openLeft = (v) => { setLeftOpen(v); if (v && !bigScreen(768)) setRightOpen(false); };
  const openRight = (v) => { setRightOpen(v); if (v && !bigScreen(768)) setLeftOpen(false); };

  const { probe, status: probeStatus } = useProbe(catalog, selectedId, probePoint);
  const { exposure } = useQuartierExposure(catalog);
  const ranking = exposure?.byAcquisition[selectedId] ?? null;
  const { frequency, status: freqStatus } = useFloodFrequency(catalog, obs.layers.freq.on);
  const freqUrl = useFrequencyImage(frequency, studyArea);

  const setLayer = useCallback(
    (key, patch) => setObs((o) => ({ ...o, layers: { ...o.layers, [key]: { ...o.layers[key], ...patch } } })),
    [setObs]
  );

  // Création de la carte (une seule fois)
  useEffect(() => {
    const map = new maplibregl.Map({
      container: boxRef.current,
      style: baseStyle(obs.basemap),
      bounds: bboxBounds(studyArea),
      fitBoundsOptions: { padding: 40 },
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
    map.getCanvas().style.cursor = "crosshair";
    map.on("load", () => setLoaded(true));
    map.on("click", (e) => setProbePoint({ lon: e.lngLat.lng, lat: e.lngLat.lat }));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyArea]);

  // Fond de carte
  useEffect(() => {
    if (loaded && mapRef.current) applyBasemap(mapRef.current, obs.basemap);
  }, [loaded, obs.basemap]);

  // Couches radar de la date (mise à jour des images, pas de recréation : F7)
  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map || !acq) return;
    const L = obs.layers;
    setImageLayer(map, "sar-radar", acq.layers.backscatter, studyArea, { opacity: L.radar.opacity, visible: L.radar.on });
    setImageLayer(map, "sar-water", acq.layers.waterMask, studyArea, { opacity: L.water.opacity, visible: L.water.on });
    setImageLayer(map, "sar-new", acq.layers.newWaterMask, studyArea, { opacity: L.newWater.opacity, visible: L.newWater.on });
    // Fréquence au-dessus des masques : elle résume les mêmes pixels, sinon elle serait cachée
    if (freqUrl) {
      setImageLayer(map, "sar-freq", freqUrl, studyArea, { opacity: L.freq.opacity, visible: L.freq.on });
      if (map.getLayer("sar-freq")) map.moveLayer("sar-freq");
    }
    else if (map.getLayer("sar-freq")) map.setLayoutProperty("sar-freq", "visibility", "none");
  }, [loaded, acq, obs.layers, freqUrl, studyArea]);

  // Lecture automatique (F6) et préchargement de la date suivante (F18)
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => onStep(1), PLAY_MS);
    return () => clearInterval(t);
  }, [playing, onStep]);
  useEffect(() => {
    const next = acquisitions[(idx + 1) % acquisitions.length];
    if (next) preloadImages([next.layers.backscatter, next.layers.waterMask, next.layers.newWaterMask]);
  }, [idx, acquisitions]);

  // Barre d'espace : lecture / pause
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== " " || /INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName)) return;
      e.preventDefault();
      setPlaying((p) => !p);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Repères des quartiers : icône (couleur du risque) + nom toujours visible
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !exposure) return;
    exposure.quartiers.forEach((q) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "sar-pin";
      el.setAttribute("aria-label", q.name);
      const icon = document.createElement("span");
      icon.className = "sar-pin-icon";
      icon.innerHTML = pinSvg(C.mut);
      const label = document.createElement("span");
      // Nom à gauche si un quartier voisin est juste à l'est (évite qu'il soit masqué par l'autre repère)
      const crowdedEast = exposure.quartiers.some(
        (o) => o.id !== q.id && o.lon - q.lon > 0 && o.lon - q.lon < 0.03 && Math.abs(o.lat - q.lat) < 0.006
      );
      label.className = crowdedEast ? "sar-pin-label sar-pin-label--left" : "sar-pin-label";
      label.textContent = q.name;
      el.append(icon, label);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        setObs((o) => ({ ...o, focusQuartierId: q.id, nonce: o.nonce + 1 }));
      });
      markersRef.current[q.id] = new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([q.lon, q.lat]).addTo(map);
    });
    return () => {
      Object.values(markersRef.current).forEach((m) => m.remove());
      markersRef.current = {};
    };
  }, [exposure, setObs]);

  useEffect(() => {
    const { on, opacity } = obs.layers.quartiers;
    (ranking ?? []).forEach(({ quartier, pct, risk }) => {
      const m = markersRef.current[quartier.id];
      if (!m) return;
      const el = m.getElement();
      const icon = el.querySelector(".sar-pin-icon");
      icon.innerHTML = pinSvg(RISK_COLOR[risk]);
      icon.style.filter = `drop-shadow(0 0 8px ${RISK_COLOR[risk]}88)`;
      el.title = `${quartier.name} · ${nf(pct)} % · ${t("exposition {level}", { level: t(RISK_LABEL[risk]).toLowerCase() })}`;
      el.style.zIndex = risk === "high" ? 3 : risk === "mid" ? 2 : 1;
      el.style.display = on ? "" : "none";
      el.style.opacity = opacity;
    });
  }, [ranking, obs.layers.quartiers, exposure, t]);

  // Quartier ciblé (recherche, préréglage, clic) : recentrage + inspection du point
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !obs.nonce) return;
    const q = exposure?.quartiers.find((x) => x.id === obs.focusQuartierId);
    if (q) {
      map.flyTo({ center: [q.lon, q.lat], zoom: 13, duration: 900 });
      setProbePoint({ lon: q.lon, lat: q.lat });
      setRightOpen(true);
      if (!bigScreen(768)) setLeftOpen(false);
    } else if (!obs.focusQuartierId) {
      map.fitBounds(bboxBounds(studyArea), { padding: 40, duration: 700 });
    }
  }, [obs.nonce, obs.focusQuartierId, exposure, studyArea]);

  // Réticule sur le point inspecté
  useEffect(() => {
    const map = mapRef.current;
    probeMarkerRef.current?.remove();
    probeMarkerRef.current = null;
    if (!map || !probePoint) return;
    const el = document.createElement("div");
    el.className = "sar-probe";
    probeMarkerRef.current = new maplibregl.Marker({ element: el }).setLngLat([probePoint.lon, probePoint.lat]).addTo(map);
  }, [probePoint, loaded]);

  if (!acq) return null;

  return (
    <div className="sar-obs relative h-[calc(100dvh-56px-56px)] min-h-[520px] overflow-hidden bg-[#0b0e13] sm:h-[calc(100dvh-64px-56px)] md:h-[calc(100dvh-64px)]">
      <div className="absolute inset-0">
        <div ref={boxRef} className="h-full w-full" />
      </div>

      {/* Calques, fond, légende */}
      <Panel className="left-3 top-3 w-[272px] max-w-[calc(100%-24px)]" title={t("Calques")} open={leftOpen} onToggle={() => openLeft(!leftOpen)}>
        <div className="space-y-0.5">
          {LAYERS.map(({ key, label: base }) => {
            const L = obs.layers[key];
            const label = key === "radar" && pol ? `${t(base)} ${pol}` : t(base);
            return (
              <div key={key} className={`grid grid-cols-[22px_1fr_84px] items-center gap-2 py-1 text-[12.5px] ${L.on ? "" : "opacity-50"}`}>
                <button
                  className="grid place-items-center text-sar-ink2 hover:text-sar-acc"
                  onClick={() => setLayer(key, { on: !L.on })}
                  aria-pressed={L.on}
                  aria-label={t(L.on ? "Masquer {name}" : "Afficher {name}", { name: label })}
                >
                  {L.on ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <span className="truncate">
                  {label}
                  {key === "freq" && L.on && freqStatus === "loading" && <span className="ml-1 text-sar-mut">…</span>}
                </span>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={Math.round(L.opacity * 100)}
                  onChange={(e) => setLayer(key, { opacity: e.target.value / 100 })}
                  aria-label={t("Opacité {name}", { name: label })}
                  className="w-full accent-sar-acc"
                />
              </div>
            );
          })}
        </div>
        <hr className="my-2.5 border-sar-line" />
        <span className="sar-lab">{t("Fond de carte")}</span>
        <div className="sar-seg mt-1.5" role="group" aria-label={t("Fond de carte")}>
          {BASEMAPS.map(([k, l]) => (
            <button key={k} aria-pressed={obs.basemap === k} onClick={() => setObs((o) => ({ ...o, basemap: k }))}>
              {t(l)}
            </button>
          ))}
        </div>
        <hr className="my-2.5 border-sar-line" />
        <Legend dbRange={catalog.dbRange} dates={acquisitions.length} showFreq={obs.layers.freq.on} />
      </Panel>

      {/* Inspection, acquisition, quartiers */}
      <Panel
        className="right-3 top-3 w-[300px] max-w-[calc(100%-24px)]"
        title={t("Analyse de la date")}
        open={rightOpen}
        onToggle={() => openRight(!rightOpen)}
        bodyClassName="max-h-[calc(100vh-64px-170px)]"
      >
        {probePoint && (
          <section className="mb-3 rounded-[10px] border border-sar-acc/60 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="sar-lab">{t("Point inspecté")}</span>
              <button className="text-sar-mut hover:text-sar-ink" onClick={() => setProbePoint(null)} aria-label={t("Fermer l’inspection")}>
                <X size={14} />
              </button>
            </div>
            {probeStatus === "loading" && <p className="text-[12px] text-sar-mut">{t("Lecture des valeurs…")}</p>}
            {probeStatus === "ready" && !probe && <p className="text-[12px] text-sar-mut">{t("Point hors de l’emprise d’étude.")}</p>}
            {probe && (
              <>
                <Kv k={t("Position")} v={`${fCoord(probe.lat, "N", "S")} ${fCoord(probe.lon, "E", "O")}`} />
                <Kv k={pol || "Radar"} v={probe.db == null ? t("sans donnée") : `${nf(probe.db)} dB`} />
                <Kv k={t("Lecture")} v={probe.interpretation ? t(DB_READING[probe.interpretation]) : "–"} sans />
                <Kv k={t("Classé « eau »")} v={probe.isWater ? t("oui") : t("non")} />
                <p className="mt-1.5 text-[11px] text-sar-mut">{t("{name} de ce point sur les {n} dates", { name: pol || t("Rétrodiffusion"), n: probe.series.length })}</p>
                <Spark series={probe.series} selectedId={selectedId} />
              </>
            )}
          </section>
        )}
        {!probePoint && <p className="mb-3 text-[12px] text-sar-mut">{t("Cliquez sur la carte pour lire la valeur radar d’un point.")}</p>}

        <section className="mb-3">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="sar-lab">
              {t("Acquisition")} {idx + 1}/{acquisitions.length}
            </span>
            <SeasonChip season={acq.season} />
          </div>
          <div className="text-[24px] font-semibold leading-tight tracking-tight">
            {nf(acq.waterAreaKm2)}
            <small className="ml-1 text-[13px] font-normal text-sar-mut">{t("km² d’eau")}</small>
          </div>
          <p className="sar-cap mb-1.5">
            {acq.waterAreaKm2 - stats.minKm2 > 0.05 ? t("+{km} km² au-dessus de l’étiage", { km: nf(acq.waterAreaKm2 - stats.minKm2) }) : t("niveau d’étiage")}
          </p>
          <Kv k={t("Eau nouvelle")} v={acq.newWaterKm2 == null ? t("référence") : `${nf(acq.newWaterKm2)} km²`} />
          <Kv k={t("{pol} moyen", { pol })} v={`${nf(acq.meanDb, 2)} dB`} />
          <Kv k={t("Couverture")} v={`${nf(acq.validFraction * 100, 0)} %`} />
        </section>

        <section>
          <span className="sar-lab">{t("Quartiers les plus exposés")}</span>
          {!ranking && <p className="mt-1 text-[12px] text-sar-mut">{t("Calcul…")}</p>}
          {(ranking ?? []).slice(0, 5).map(({ quartier, pct, risk }) => (
            <button
              key={quartier.id}
              onClick={() => setObs((o) => ({ ...o, focusQuartierId: quartier.id, nonce: o.nonce + 1 }))}
              className="flex w-full items-center gap-2 border-t border-sar-line py-1.5 text-left text-[12.5px] first-of-type:mt-1 hover:text-sar-acc"
            >
              <b className="font-medium">{quartier.name}</b>
              <em className="ml-auto font-mono text-[11px] not-italic text-sar-ink2">
                {nf(pct)} % · {t(RISK_LABEL[risk]).toLowerCase()}
              </em>
              <i className="h-2 w-2 shrink-0 rounded-full" style={{ background: RISK_COLOR[risk] }} />
            </button>
          ))}
        </section>
      </Panel>

      {/* Chronologie (F6) */}
      <div className="absolute inset-x-3 bottom-3 flex items-end gap-3 rounded-[14px] border border-sar-line bg-[rgba(10,19,33,.9)] px-3.5 py-2.5 shadow-[0_10px_34px_rgba(0,0,0,.55)] backdrop-blur-md">
        <button
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sar-acc text-sar-oacc hover:brightness-110"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? t("Pause") : t("Lecture automatique")}
          title={t("Lecture automatique (barre d’espace)")}
        >
          {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
        </button>
        <div className="min-w-0 sm:min-w-[150px]">
          <SeasonChip season={acq.season} />
          <b className="block truncate text-[15px] font-semibold leading-tight sm:text-[17px]">{fDate(acq.date)}</b>
        </div>
        <Timeline acquisitions={acquisitions} selectedId={selectedId} onSelect={onSelect} stats={stats} />
      </div>
    </div>
  );
}

function Panel({ className = "", title, open, onToggle, children, bodyClassName = "max-h-[calc(100vh-64px-170px)]" }) {
  return (
    <div className={`absolute z-10 rounded-[14px] border border-sar-line bg-[rgba(10,19,33,.9)] shadow-[0_10px_34px_rgba(0,0,0,.55)] backdrop-blur-md ${open ? "" : "!w-auto"} ${className}`}>
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <span className="sar-lab">{title}</span>
        <button className="text-sar-mut hover:text-sar-ink" onClick={onToggle} aria-label={tr(open ? "Réduire {name}" : "Afficher {name}", { name: title })} aria-expanded={open}>
          {open ? <Minus size={15} /> : <Plus size={15} />}
        </button>
      </div>
      {open && <div className={`overflow-auto px-3 pb-3 ${bodyClassName}`}>{children}</div>}
    </div>
  );
}

function Legend({ dbRange, dates, showFreq }) {
  return (
    <div className="space-y-2 text-[10.5px]">
      <div>
        <div className="h-2 rounded-sm bg-gradient-to-r from-black to-white" />
        <div className="mt-1 flex justify-between font-mono text-sar-mut">
          <span>{tr("{db} dB · eau calme", { db: dbRange[0] })}</span>
          <span>{tr("{db} dB · bâti", { db: dbRange[1] })}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-sar-ink2">
        <Sw c="#22d3ee" l={tr("eau détectée")} />
        <Sw c="#fb923c" l={tr("eau nouvelle")} />
      </div>
      {showFreq && (
        <div>
          <div className="h-2 rounded-sm" style={{ background: "linear-gradient(90deg, rgba(250,70,80,.45), #fa1e3c)" }} />
          <div className="mt-1 flex justify-between font-mono text-sar-mut">
            <span>{tr("en eau 1 date sur {n}", { n: dates })}</span>
            <span>{tr("{n} sur {n}", { n: dates })}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Timeline({ acquisitions, selectedId, onSelect, stats }) {
  const lo = stats.minKm2 * 0.9;
  const span = stats.maxKm2 - lo || 1;
  return (
    <div className="flex min-w-0 flex-1 items-end gap-1" role="listbox" aria-label={tr("Dates d’acquisition")}>
      {acquisitions.map((a) => {
        const on = a.id === selectedId;
        return (
          <button
            key={a.id}
            role="option"
            aria-selected={on}
            onClick={() => onSelect(a.id)}
            title={`${fDate(a.date)} · ${nf(a.waterAreaKm2)} km²`}
            className="group flex min-w-0 flex-1 flex-col items-center gap-1 pt-0.5"
          >
            <span
              className={`block w-full max-w-[64px] rounded-t-sm transition-opacity ${on ? "opacity-100 outline outline-2 outline-offset-1 outline-white" : "opacity-45 group-hover:opacity-80"}`}
              style={{ height: 6 + ((a.waterAreaKm2 - lo) / span) * 34, background: SEASON_COLOR[a.season] }}
            />
            <em className={`hidden font-mono text-[10px] not-italic sm:block ${on ? "font-medium text-sar-ink" : "text-sar-mut"}`}>{fShort(a.date)}</em>
          </button>
        );
      })}
    </div>
  );
}

function Spark({ series, selectedId }) {
  const vals = series.map((s) => s.db);
  const ok = vals.filter((v) => v != null);
  if (ok.length < 2) return null;
  const w = 260;
  const h = 46;
  const mn = Math.min(...ok);
  const mx = Math.max(...ok);
  const X = (i) => 4 + (i / (vals.length - 1)) * (w - 8);
  const Y = (v) => h - 5 - ((v - mn) / (mx - mn || 1)) * (h - 12);
  const d = vals.map((v, i) => (v == null ? "" : `${i && vals[i - 1] != null ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`)).join("");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-1 h-[46px] w-full" aria-hidden="true">
      <path d={d} fill="none" stroke={C.ink2} strokeWidth="1.8" />
      {series.map((s, i) =>
        s.db == null ? null : (
          <circle key={s.id} cx={X(i)} cy={Y(s.db)} r={s.id === selectedId ? 4.5 : 2} fill={s.id === selectedId ? C.acc : C.mut} />
        )
      )}
    </svg>
  );
}

const Kv = ({ k, v, sans }) => (
  <div className="flex items-baseline justify-between gap-3 py-0.5 text-[12.5px] text-sar-ink2">
    <span className="shrink-0">{k}</span>
    <b className={`text-right font-medium text-sar-ink ${sans ? "" : "font-mono text-[12px]"}`}>{v}</b>
  </div>
);

const Sw = ({ c, l }) => (
  <span className="inline-flex items-center gap-1.5">
    <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
    {l}
  </span>
);
