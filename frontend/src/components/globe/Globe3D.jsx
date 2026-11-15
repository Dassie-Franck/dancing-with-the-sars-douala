/* eslint-disable react/prop-types */
// B1 – Globe 3D d'accueil (bonus) : la Terre tourne, puis zoome sur Douala.
import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
 
// Centre de Douala / estuaire du Wouri
const DOUALA = { lat: 4.0511, lng: 9.7679 };
 
const START_VIEW = { lat: 10, lng: 15, altitude: 2.4 }; // Afrique, vue lointaine
const ZOOM_VIEW = { ...DOUALA, altitude: 0.35 };        // vue proche sur Douala
const FLY_MS = 2500;                                    // durée du zoom (ms)
 
export default function Globe3D({ flying, onArrived }) {
  const globeRef = useRef();
  const wrapRef = useRef();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [ready, setReady] = useState(false);
 
  // Le globe prend toute la taille de son conteneur (s'adapte au mobile)
  useEffect(() => {
    const ro = new ResizeObserver(([e]) =>
      setSize({ w: e.contentRect.width, h: e.contentRect.height })
    );
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);
 
  // Vue de départ + rotation lente
  const handleReady = () => {
    const g = globeRef.current;
    g.pointOfView(START_VIEW, 0);
    const controls = g.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.6;
    controls.enableZoom = false;
    setReady(true);
  };
 
  // Quand on clique « Explorer » : arrêt de la rotation et zoom sur Douala.
  // Dépend aussi de `ready` : un clic avant la fin du chargement du globe ne bloque plus l'accueil.
  useEffect(() => {
    if (!flying || !ready || !globeRef.current) return;
    const g = globeRef.current;
    g.controls().autoRotate = false;
    g.pointOfView(ZOOM_VIEW, FLY_MS);
    const t = setTimeout(() => onArrived?.(), FLY_MS + 200);
    return () => clearTimeout(t);
  }, [flying, ready, onArrived]);
 
  const marker = useMemo(
    () => [{ ...DOUALA, label: "Douala · estuaire du Wouri" }],
    []
  );
 
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
          ringsData={marker}
          ringColor={() => (t) =>
            `rgba(${Math.round(255 - 160 * t)},${Math.round(255 - 70 * t)},255,${1 - t})`}
          ringMaxRadius={4}
          ringPropagationSpeed={2}
          ringRepeatPeriod={900}
          labelsData={flying ? [] : marker}
          labelText="label"
          labelSize={1.2}
          labelDotRadius={0.5}
          labelColor={() => "#ffffff"}
          labelResolution={2}
          onGlobeReady={handleReady}
        />
      )}
    </div>
  );
}
 