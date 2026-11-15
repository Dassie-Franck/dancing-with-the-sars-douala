/* eslint-disable react/prop-types */
// Quartiers sous surveillance : carte sombre, masque d'eau de la date, repères colorés par niveau de risque.
// Reçoit uniquement des objets du domaine (StudyArea, Acquisition, classement d'exposition).
import { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { C, RISK_COLOR } from "../../ui/theme";
import { RISK_LABEL, nf } from "../../ui/format";

// Fond OpenStreetMap (même source que la carte principale, sans clé), passé en sombre :
// niveaux de gris + luminosité inversée (min > max) => rues claires sur fond noir.
const DARK_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#0b0e13" } },
    {
      id: "osm-dark",
      type: "raster",
      source: "osm",
      paint: {
        "raster-saturation": -1,
        "raster-brightness-min": 0.92,
        "raster-brightness-max": 0.06,
        "raster-contrast": 0.15,
        "raster-opacity": 0.9,
      },
    },
  ],
};

const FIT = { padding: 48 };

function pinSvg(color) {
  return `<svg width="26" height="34" viewBox="0 0 26 34" aria-hidden="true">
    <path d="M13 33s11-11.2 11-19.5A11 11 0 0 0 2 13.5C2 21.8 13 33 13 33z" fill="${color}" stroke="rgba(0,0,0,.45)" stroke-width="1"/>
    <circle cx="13" cy="13.5" r="4.2" fill="#06121a"/></svg>`;
}

// Image géoréférencée posée sur l'emprise d'étude (mise à jour sans recréer la couche)
function setImageLayer(map, id, url, { bbox }, opacity) {
  const coordinates = [
    [bbox.west, bbox.north],
    [bbox.east, bbox.north],
    [bbox.east, bbox.south],
    [bbox.west, bbox.south],
  ];
  const src = map.getSource(id);
  if (!url) {
    if (map.getLayer(id)) map.removeLayer(id);
    if (src) map.removeSource(id);
    return;
  }
  if (src) src.updateImage({ url, coordinates });
  else {
    map.addSource(id, { type: "image", url, coordinates });
    map.addLayer({ id, type: "raster", source: id, paint: { "raster-opacity": opacity, "raster-fade-duration": 0 } });
  }
}

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
    const { bbox } = studyArea;
    const map = new maplibregl.Map({
      container: boxRef.current,
      style: DARK_STYLE,
      bounds: [
        [bbox.west, bbox.south],
        [bbox.east, bbox.north],
      ],
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
    setImageLayer(map, "sar-water", acquisition.layers.waterMask, studyArea, 0.5);
    setImageLayer(map, "sar-new-water", acquisition.layers.newWaterMask, studyArea, 0.75);
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
      el.title = `${quartier.name} · ${nf(pct)} % · exposition ${RISK_LABEL[risk].toLowerCase()}`;
      el.style.filter = `drop-shadow(0 0 8px ${color}88)`;
      el.style.zIndex = risk === "high" ? 3 : risk === "mid" ? 2 : 1;
    });
  }, [ranking, quartiers]);

  // Quartier mis en avant : recentrage + fiche
  useEffect(() => {
    const map = mapRef.current;
    popupRef.current?.remove();
    if (!map || !focusId || !ranking) return;
    const r = ranking.find((x) => x.quartier.id === focusId);
    if (!r) return;
    const { quartier, pct, risk } = r;
    map.easeTo({ center: [quartier.lon, quartier.lat], zoom: Math.max(map.getZoom(), 12.5), duration: 700 });
    popupRef.current = new maplibregl.Popup({ offset: 32, closeButton: false, className: "sar-popup" })
      .setLngLat([quartier.lon, quartier.lat])
      .setHTML(
        `<b>${quartier.name}</b><span>${nf(pct)} % du sol gagné par l’eau</span><em style="color:${RISK_COLOR[risk]}">Exposition ${RISK_LABEL[risk].toLowerCase()}</em>`
      )
      .addTo(map);
  }, [focusId, ranking]);

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
            {RISK_LABEL[k]}
          </span>
        ))}
      </div>
      {focusId && (
        <button className="sar-btn absolute right-2.5 top-2.5 h-[28px] px-2.5 text-[12px]" onClick={reset}>
          Vue d’ensemble
        </button>
      )}
    </div>
  );
}
