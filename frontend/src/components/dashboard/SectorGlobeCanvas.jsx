/* eslint-disable react/prop-types */
// Globe du tableau de bord : mêmes textures que l'écran d'accueil (B1), puis plongée sur l'emprise d'étude.
// Chargé à part (lazy) : three.js n'alourdit pas le premier affichage.
import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import { C } from "../../ui/theme";

const START_VIEW = { lat: 10, lng: 15, altitude: 2.4 }; // même départ que l'accueil
const HOLD_MS = 700; // le globe se montre avant de plonger
export const FLY_MS = 2600;

export default function SectorGlobeCanvas({ bbox, runKey, paused, reducedMotion, onArrived }) {
  const globeRef = useRef();
  const wrapRef = useRef();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [ready, setReady] = useState(false);

  const [w, s, e, n] = bbox;
  const center = useMemo(() => ({ lat: (s + n) / 2, lng: (w + e) / 2 }), [w, s, e, n]);
  const frame = useMemo(() => [[[n, w], [n, e], [s, e], [s, w], [n, w]]], [w, s, e, n]);
  const rings = useMemo(() => [center], [center]);

  useEffect(() => {
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // Séquence : vue de départ -> courte rotation -> plongée sur Douala -> passage au secteur
  useEffect(() => {
    const g = globeRef.current;
    if (!ready || !g) return;
    g.resumeAnimation();
    const controls = g.controls();
    controls.enableZoom = false;
    controls.autoRotateSpeed = 0.6;
    if (reducedMotion) {
      g.pointOfView({ ...center, altitude: 0.12 }, 0);
      const t = setTimeout(() => onArrived?.(), 50);
      return () => clearTimeout(t);
    }
    g.pointOfView(START_VIEW, 0);
    controls.autoRotate = true;
    const t1 = setTimeout(() => {
      controls.autoRotate = false;
      g.pointOfView({ ...center, altitude: 0.12 }, FLY_MS);
    }, HOLD_MS);
    const t2 = setTimeout(() => onArrived?.(), HOLD_MS + FLY_MS + 150);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [ready, runKey, center, reducedMotion, onArrived]);

  // Une fois le secteur affiché, on arrête le rendu WebGL (batterie, mobile)
  useEffect(() => {
    const g = globeRef.current;
    if (!ready || !g) return;
    if (paused) {
      const t = setTimeout(() => g.pauseAnimation(), 700); // après le fondu
      return () => clearTimeout(t);
    }
    g.resumeAnimation();
  }, [paused, ready]);

  return (
    <div ref={wrapRef} className="absolute inset-0">
      {size.w > 0 && (
        <Globe
          ref={globeRef}
          width={size.w}
          height={size.h}
          backgroundImageUrl="/globe/night-sky.png"
          globeImageUrl="/globe/earth-blue-marble.jpg"
          bumpImageUrl="/globe/earth-topology.png"
          showAtmosphere
          atmosphereColor="#cfe3ff"
          atmosphereAltitude={0.22}
          pathsData={frame}
          pathColor={() => C.acc}
          pathStroke={2}
          pathPointAlt={0.002}
          pathTransitionDuration={0}
          ringsData={rings}
          ringColor={() => (t) => `rgba(25,211,243,${1 - t})`}
          ringMaxRadius={3}
          ringPropagationSpeed={2}
          ringRepeatPeriod={900}
          onGlobeReady={() => setReady(true)}
        />
      )}
    </div>
  );
}
