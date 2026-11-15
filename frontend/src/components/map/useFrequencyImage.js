// PRÉSENTATION · Peint la fréquence d'inondation (résultat métier) en image PNG pour la carte.
import { useEffect, useState } from "react";
import { frequencyRgba } from "../../ui/theme";

export function useFrequencyImage(frequency, studyArea) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!frequency || !studyArea) return;
    const { width: w, height: h } = studyArea;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(w, h);
    const px = img.data;
    const { counts, dates } = frequency;
    for (let k = 0; k < counts.length; k++) {
      const n = counts[k];
      if (!n) continue;
      const [r, g, b, a] = frequencyRgba(dates > 1 ? (n - 1) / (dates - 1) : 1);
      const q = k * 4;
      px[q] = r;
      px[q + 1] = g;
      px[q + 2] = b;
      px[q + 3] = a;
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
  }, [frequency, studyArea]);

  return url;
}
