// PRÉSENTATION · Peint le résultat métier de la comparaison (classes par pixel) en image PNG affichable.
import { useEffect, useState } from "react";
import { CHANGE } from "../../domain/waterChange";
import { CHANGE_RGB } from "../../ui/theme";

export function useDiffImage(comparison, studyArea) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!comparison) return;
    const { width: w, height: h } = studyArea;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(w, h);
    const px = img.data;
    const { classes } = comparison;
    for (let k = 0; k < classes.length; k++) {
      const v = classes[k];
      if (v === CHANGE.NONE) continue;
      const rgb = v === CHANGE.GAINED ? CHANGE_RGB.gained : CHANGE_RGB.lost;
      const q = k * 4;
      px[q] = rgb[0];
      px[q + 1] = rgb[1];
      px[q + 2] = rgb[2];
      px[q + 3] = 235;
    }
    ctx.putImageData(img, 0, 0);
    let made = null;
    let alive = true;
    c.toBlob((blob) => {
      if (!alive || !blob) return;
      made = URL.createObjectURL(blob);
      setUrl(made);
    }, "image/png");
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
      setUrl(null);
    };
  }, [comparison, studyArea]);

  return url;
}
