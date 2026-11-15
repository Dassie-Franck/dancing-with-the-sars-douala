// INFRASTRUCTURE · Adaptateur navigateur du port MaskReader.
// Décode le PNG du masque d'eau dans un canvas et garde le canal alpha (> 0 = eau). Résultats mis en cache par URL.
// Si un jour le backend calcule lui-même les différences et l'exposition, ce port pourra ne plus servir.

/** @returns {import("../../application/ports").MaskReader} */
export function createCanvasMaskReader() {
  const cache = new Map();

  function decode(src, w, h) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; // PNG servis par l'API : lecture des pixels autorisée si CORS ouvert
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        const rgba = ctx.getImageData(0, 0, w, h).data;
        const alpha = new Uint8Array(w * h);
        for (let k = 0; k < alpha.length; k++) alpha[k] = rgba[k * 4 + 3];
        resolve(alpha);
      };
      img.onerror = () => reject(new Error(`Image introuvable : ${src}`));
      img.src = src;
    });
  }

  return {
    readWaterMask(acquisition, area) {
      const src = acquisition.layers.waterMask;
      if (!src) return Promise.reject(new Error(`Pas de masque d'eau pour ${acquisition.id}`));
      if (!cache.has(src)) {
        const p = decode(src, area.width, area.height);
        p.catch(() => cache.delete(src));
        cache.set(src, p);
      }
      return cache.get(src);
    },
  };
}
