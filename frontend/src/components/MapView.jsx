import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Centre de la carte : Douala / estuaire du Wouri
export const DOUALA = { lng: 9.7679, lat: 4.0511, zoom: 10.5 };

export default function MapView() {
  const containerRef = useRef(null);

  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: [DOUALA.lng, DOUALA.lat],
      zoom: DOUALA.zoom,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    // TODO (M2) : ajouter ici les calques SAR depuis /data/layers/*.png via map.addSource({type:"image"})
    return () => map.remove();
  }, []);

  return <div ref={containerRef} className="h-full w-full rounded-lg" />;
}