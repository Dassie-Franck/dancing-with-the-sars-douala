/* eslint-disable react/prop-types */
// Quartiers sous surveillance : carte sombre, masque d'eau de la date, repères colorés par niveau de risque.
// Reçoit uniquement des objets du domaine (StudyArea, Acquisition, classement d'exposition).
import { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { C, RISK_COLOR } from "../../ui/theme";
import { RISK_LABEL, nf } from "../../ui/format";
import { useI18n } from "../../i18n";
import { baseStyle, bboxBounds, pinSvg, setImageLayer } from "../map/mapKit";

const FIT = { padding: 48 };

const boundsOf = (quartiers) => {
  const lons = quartiers.map((q) => q.lon);
  const lats = quartiers.map((q) => q.lat);
  return [
    [Math.min(...lons), Math.min(...lats)],
    [Math.max(...lons), Math.max(...lats)],
  ];
};

/**
 * @param {{studyArea: import("../../domain/model").StudyArea,
 *          acquisition: import("../../domain/model").Acquisition,
 *          quartiers: import("../../domain/model").Quartier[] | null,
 *          ranking: {quartier: import("../../domain/model").Quartier, pct: number, risk: string}[] | null,
 *          focusId: string | null, onFocus: (id: string|null) => void}} props
 */
export default function QuartiersMap({ studyArea, acquisition, quartiers, ranking, focusId, onFocus }) {
  const { t } = useI18n();
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const popupRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  // onFocus peut changer d'identité : les repères appellent toujours la dernière version
  const onFocusRef = useRef(onFocus);
  onFocusRef.current = onFocus;
  const bounds = useMemo(() => (quartiers?.length ? boundsOf(quartiers) : null), [quartiers]);

  // Création de la carte, cadrée sur l'emprise d'étude
  useEffect(() => {
    const map = new maplibregl.Map({
      container: boxRef.current,
      style: baseStyle("dark"),
      bounds: bboxBounds(studyArea),
      fitBoundsOptions: FIT,
      attributionControl: { compact: true },
      cooperativeGestures: true,
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.on("load", () => setLoaded(true));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
  }, [studyArea]);

  // Un repère par quartier, puis cadrage sur les quartiers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !quartiers) return;
    quartiers.forEach((q) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "sar-pin";
      el.setAttribute("aria-label", q.name);
      el.innerHTML = pinSvg(C.mut);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onFocusRef.current?.(q.id);
      });
      markersRef.current[q.id] = new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([q.lon, q.lat]).addTo(map);
    });
    if (bounds) map.fitBounds(bounds, { ...FIT, duration: 0 });
    return () => {
      Object.values(markersRef.current).forEach((m) => m.remove());
      markersRef.current = {};
    };
  }, [quartiers, bounds]);

  // Couches d'eau de la date choisie
  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map || !acquisition) return;
    setImageLayer(map, "sar-water", acquisition.layers.waterMask, studyArea, { opacity: 0.5 });
    setImageLayer(map, "sar-new-water", acquisition.layers.newWaterMask, studyArea, { opacity: 0.75 });
  }, [loaded, acquisition, studyArea]);

  // Couleur des repères selon l'exposition
  useEffect(() => {
    if (!ranking) return;
    ranking.forEach(({ quartier, pct, risk }) => {
      const m = markersRef.current[quartier.id];
      if (!m) return;
      const color = RISK_COLOR[risk];
      const el = m.getElement();
      el.innerHTML = pinSvg(color);
      el.title = `${quartier.name} · ${nf(pct)} % · ${t("exposition {level}", { level: t(RISK_LABEL[risk]).toLowerCase() })}`;
      el.style.filter = `drop-shadow(0 0 8px ${color}88)`;
      el.style.zIndex = risk === "high" ? 3 : risk === "mid" ? 2 : 1;
    });
  }, [ranking, quartiers, t]);

  // Quartier mis en avant : recentrage + fiche
  useEffect(() => {
    const map = mapRef.current;
    popupRef.current?.remove();
    if (!map || !focusId || !ranking) return;
    const r = ranking.find((x) => x.quartier.id === focusId);
    if (!r) return;
    const { quartier, pct, risk } = r;
    map.easeTo({ center: [quartier.lon, quartier.lat], zoom: Math.max(map.getZoom(), 12.5), duration: 700 });
    // Fiche construite en nœuds DOM (textContent) : aucun texte n'est interprété comme du HTML
    const card = document.createElement("div");
    const add = (tag, text, color) => {
      const n = document.createElement(tag);
      n.textContent = text;
      if (color) n.style.color = color;
      card.append(n);
    };
    add("b", quartier.name);
    add("span", t("{pct} % du sol gagné par l’eau", { pct: nf(pct) }));
    add("em", t("Exposition {level}", { level: t(RISK_LABEL[risk]).toLowerCase() }), RISK_COLOR[risk]);
    card.style.display = "contents";
    popupRef.current = new maplibregl.Popup({ offset: 32, closeButton: false, className: "sar-popup" })
      .setLngLat([quartier.lon, quartier.lat])
      .setDOMContent(card)
      .addTo(map);
  }, [focusId, ranking, t]);

  const reset = () => {
    onFocus(null);
    if (bounds) mapRef.current?.fitBounds(bounds, { ...FIT, duration: 700 });
  };

  return (
    <div className="sar-qmap relative h-full min-h-[300px] overflow-hidden rounded-[12px] border border-sar-line">
      {/* MapLibre impose position:relative à son conteneur : on le place dans un calque positionné */}
      <div className="absolute inset-0">
        <div ref={boxRef} className="h-full w-full" />
      </div>
      <div className="pointer-events-none absolute left-2.5 top-2.5 flex flex-wrap gap-3 rounded-md border border-sar-line bg-[rgba(10,19,33,.9)] px-2.5 py-1.5 text-[11px] text-sar-ink2">
        {["high", "mid", "low"].map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: RISK_COLOR[k] }} />
            {t(RISK_LABEL[k])}
          </span>
        ))}
      </div>
      {focusId && (
        <button className="sar-btn absolute right-2.5 top-2.5 h-[28px] px-2.5 text-[12px]" onClick={reset}>
          {t("Vue d’ensemble")}
        </button>
      )}
    </div>
  );
}
