// DOMAINE · Géométrie de la grille EPSG:4326 du contrat

const KM_PER_DEG_LAT = 110.574;
const KM_PER_DEG_LON_EQ = 111.32;
const rad = (d) => (d * Math.PI) / 180;

/** Surface (km²) d'un pixel pour chaque ligne de la grille, corrigée de cos(latitude). */
export function rowAreasKm2({ bbox, width, height }) {
  const dLon = (bbox.east - bbox.west) / width;
  const dLat = (bbox.north - bbox.south) / height;
  const rows = new Float64Array(height);
  for (let j = 0; j < height; j++) {
    const lat = bbox.north - (j + 0.5) * dLat;
    rows[j] = dLon * KM_PER_DEG_LON_EQ * Math.cos(rad(lat)) * (dLat * KM_PER_DEG_LAT);
  }
  return rows;
}

/** Dimensions de l'emprise en km, mesurées au centre. */
export function extentKm({ bbox }) {
  const lat = rad((bbox.south + bbox.north) / 2);
  return {
    widthKm: (bbox.east - bbox.west) * KM_PER_DEG_LON_EQ * Math.cos(lat),
    heightKm: (bbox.north - bbox.south) * KM_PER_DEG_LAT,
  };
}

export const centerOf = ({ bbox }) => ({ lon: (bbox.west + bbox.east) / 2, lat: (bbox.south + bbox.north) / 2 });

/** Position (pixels, éventuellement fractionnaires) d'un point lon/lat sur la grille. */
export function toPixel({ bbox, width, height }, lon, lat) {
  return {
    x: ((lon - bbox.west) / (bbox.east - bbox.west)) * width,
    y: ((bbox.north - lat) / (bbox.north - bbox.south)) * height,
  };
}

/** Rayon en pixels (horizontal, vertical) correspondant à une distance en km. */
export function radiusPx(area, km) {
  const { bbox, width, height } = area;
  const lat = rad((bbox.south + bbox.north) / 2);
  return {
    rx: km / (((bbox.east - bbox.west) / width) * KM_PER_DEG_LON_EQ * Math.cos(lat)),
    ry: km / (((bbox.north - bbox.south) / height) * KM_PER_DEG_LAT),
  };
}
