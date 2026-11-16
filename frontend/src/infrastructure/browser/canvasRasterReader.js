// INFRASTRUCTURE · Adaptateur navigateur du port RasterReader.
// Décode les PNG du contrat dans un canvas :
//   - masque d'eau : canal alpha (> 0 = eau) ;
//   - rétrodiffusion HH : niveau de gris -> dB (échelle db_range), alpha 0 = sans donnée (NaN).
// Résultats mis en cache par URL. Si le backend calcule un jour ces valeurs lui-même
// (par exemple GET /api/point), on écrit un autre adaptateur ; les cas d'usage ne changent pas.
import { grayToDb } from "../../domain/backscatter";

/** @returns {import("../../application/ports").RasterReader} */
export function createCanvasRasterReader() {
  const cache = new Map();

  function decodeRgba(src, w, h) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; // PNG servis par l'API : lecture des pixels autorisée si CORS ouvert
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        resolve(ctx.getImageData(0, 0, w, h).data);
      };
      img.onerror = () => reject(new Error(`Image introuvable : ${src}`));
      img.src = src;
    });
  }

  function cached(key, make) {
    if (!cache.has(key)) {
      const p = make();
      p.catch(() => cache.delete(key));
      cache.set(key, p);
    }
    return cache.get(key);
  }

  return {
    readWaterMask(acquisition, area) {
      const src = acquisition.layers.waterMask;
      if (!src) return Promise.reject(new Error(`Pas de masque d'eau pour ${acquisition.id}`));
      return cached(`mask:${src}`, async () => {
        const rgba = await decodeRgba(src, area.width, area.height);
        const alpha = new Uint8Array(area.width * area.height);
        for (let k = 0; k < alpha.length; k++) alpha[k] = rgba[k * 4 + 3];
        return alpha;
      });
    },

    readBackscatterDb(acquisition, area, dbRange) {
      const src = acquisition.layers.backscatterHh;
      if (!src) return Promise.reject(new Error(`Pas de rétrodiffusion HH pour ${acquisition.id}`));
      return cached(`hh:${src}`, async () => {
        const rgba = await decodeRgba(src, area.width, area.height);
        const db = new Float32Array(area.width * area.height);
        for (let k = 0; k < db.length; k++) db[k] = rgba[k * 4 + 3] === 0 ? NaN : grayToDb(rgba[k * 4], dbRange);
        return db;
      });
    },
  };
}
