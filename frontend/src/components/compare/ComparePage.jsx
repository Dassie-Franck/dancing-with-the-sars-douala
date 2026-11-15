/* eslint-disable react/prop-types */
// Comparer deux dates (Dev 2) : F11 curseur avant/après et choix des deux dates, F12 préréglage saisons.
// Les surfaces gagnées / rendues viennent du cas d'usage compareAcquisitions ; ici on ne fait qu'afficher.
import { useState } from "react";
import { ReactCompareSlider } from "react-compare-slider";
import { ArrowLeftRight } from "lucide-react";
import { useComparison } from "../../app/services";
import { CHANGE_RGB } from "../../ui/theme";
import { SEASON_LABEL, fDate, nf, signed } from "../../ui/format";
import { useDiffImage } from "./useDiffImage";

const rgb = (c) => `rgb(${c.join(",")})`;

/** @param {{catalog: import("../../application/useCases").Catalog, pair: [string, string],
 *           onPairChange: (pair: [string, string]) => void}} props */
export default function ComparePage({ catalog, pair, onPairChange }) {
  const [mode, setMode] = useState("rideau"); // rideau | diff
  const [showWater, setShowWater] = useState(true);
  const [sliderKey, setSliderKey] = useState(0);

  const { acquisitions, studyArea, contrastedPair: preset } = catalog;
  const [idA, idB] = pair;
  const A = acquisitions.find((x) => x.id === idA);
  const B = acquisitions.find((x) => x.id === idB);
  const same = idA === idB;
  const { comparison, error: diffError } = useComparison(catalog, idA, same ? null : idB);
  const diffUrl = useDiffImage(comparison, studyArea);
  const diff = { result: comparison && diffUrl ? { ...comparison, url: diffUrl } : null, error: diffError };

  const { width: iw, height: ih } = studyArea;
  const isPreset = preset && preset[0] === idA && preset[1] === idB;

  const applyPreset = () => {
    if (!preset) return;
    onPairChange(preset);
    setSliderKey((k) => k + 1); // poignée recentrée
  };

  const delta = A && B ? B.waterAreaKm2 - A.waterAreaKm2 : null;

  return (
    <div className="px-4 pb-24 pt-5 sm:px-[22px] md:pb-10">
      {/* Barre de choix */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <DateSelect label="Date A" value={idA} acquisitions={acquisitions} onChange={(v) => onPairChange([v, idB])} />
        <span className="sar-cap">face à</span>
        <DateSelect label="Date B" value={idB} acquisitions={acquisitions} onChange={(v) => onPairChange([idA, v])} />
        <button className={`sar-btn ${isPreset ? "" : "sar-btn-pri"}`} onClick={applyPreset} disabled={!preset} aria-pressed={!!isPreset}>
          Saison sèche vs saison des pluies
        </button>
        <div className="flex flex-wrap gap-2.5 lg:ml-auto">
          <div className="sar-seg" role="group" aria-label="Mode de comparaison">
            <button aria-pressed={mode === "rideau"} onClick={() => setMode("rideau")}>
              Rideau
            </button>
            <button aria-pressed={mode === "diff"} onClick={() => setMode("diff")}>
              Différence
            </button>
          </div>
          {mode === "rideau" && (
            <div className="sar-seg" role="group" aria-label="Couches affichées">
              <button aria-pressed={!showWater} onClick={() => setShowWater(false)}>
                Radar seul
              </button>
              <button aria-pressed={showWater} onClick={() => setShowWater(true)}>
                Radar + eau
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Visionneuse : garde les proportions de la grille du contrat */}
      <div
        className="relative mx-auto overflow-hidden rounded-card border border-sar-line bg-black"
        style={{ aspectRatio: `${iw} / ${ih}`, width: `min(100%, calc((100vh - 290px) * ${iw / ih}))`, minWidth: "min(100%, 300px)" }}
      >
        {mode === "rideau" ? (
          <ReactCompareSlider
            key={sliderKey}
            className="h-full w-full"
            style={{ height: "100%", width: "100%" }}
            itemOne={<Scene acq={A} water={showWater} />}
            itemTwo={<Scene acq={B} water={showWater} />}
            handle={<Handle />}
            keyboardIncrement="5%"
            aria-label="Curseur avant / après"
          />
        ) : (
          <div className="absolute inset-0">
            <Scene acq={B} water={false} dim />
            {diff.result && <img src={diff.result.url} alt="" className="absolute inset-0 h-full w-full" draggable={false} />}
            {!diff.result && !diff.error && <Overlay>Calcul de la différence…</Overlay>}
            {diff.error && <Overlay>Différence indisponible : {diff.error.message}</Overlay>}
          </div>
        )}

        {mode === "rideau" ? (
          <>
            <Tag className="left-2.5">A · {A ? fDate(A.date) : "–"}</Tag>
            <Tag className="right-2.5">B · {B ? fDate(B.date) : "–"}</Tag>
          </>
        ) : (
          <Tag className="left-2.5">
            <span className="inline-flex flex-wrap items-center gap-3">
              <span className="text-sar-ink">De A à B</span>
              <Sw c={rgb(CHANGE_RGB.gained)} l="eau gagnée" />
              <Sw c={rgb(CHANGE_RGB.lost)} l="eau rendue" />
            </span>
          </Tag>
        )}
        {same && <Overlay>Choisissez deux dates différentes.</Overlay>}
      </div>

      {/* Chiffres de la comparaison */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat
          label="Eau détectée, de A à B"
          value={A && B ? `${nf(A.waterAreaKm2)} → ${nf(B.waterAreaKm2)}` : "–"}
          unit="km²"
          cap={delta == null ? "" : `${signed(delta)} km², soit ${signed((delta / A.waterAreaKm2) * 100)} %`}
        />
        <Stat
          label="Surface gagnée par l’eau"
          value={comparison ? nf(comparison.gainedKm2) : "…"}
          unit="km²"
          cap="en bleu sur la vue « Différence »"
          accent={rgb(CHANGE_RGB.gained)}
        />
        <Stat
          label="Surface rendue par l’eau"
          value={comparison ? nf(comparison.lostKm2) : "…"}
          unit="km²"
          cap="en orange sur la vue « Différence »"
          accent={rgb(CHANGE_RGB.lost)}
        />
      </div>
      <p className="mt-3 text-[12px] text-sar-mut">
        Gains et pertes calculés pixel par pixel sur les masques d’eau des deux dates (seuil HH &lt; {nf(catalog.defaultThresholdDb)} dB),
        surface de chaque pixel corrigée de la latitude.
      </p>
    </div>
  );
}

function DateSelect({ label, value, acquisitions, onChange }) {
  return (
    <select className="sar-select" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      {acquisitions.map((a) => (
        <option key={a.id} value={a.id}>
          {fDate(a.date)} · {SEASON_LABEL[a.season] ?? a.season}
        </option>
      ))}
    </select>
  );
}

// Image d'une date : fond HH, masque d'eau et eau nouvelle superposés
function Scene({ acq, water, dim }) {
  if (!acq) return <div className="h-full w-full bg-black" />;
  const L = acq.layers;
  const img = "absolute inset-0 h-full w-full select-none";
  return (
    <div className="relative h-full w-full bg-black">
      <img src={L.backscatterHh} alt={`Radar HH du ${acq.date}`} className={img} style={dim ? { opacity: 0.5 } : undefined} draggable={false} />
      {water && L.waterMask && <img src={L.waterMask} alt="" className={img} draggable={false} />}
      {water && L.newWaterMask && <img src={L.newWaterMask} alt="" className={img} draggable={false} />}
    </div>
  );
}

function Handle() {
  return (
    <div className="relative h-full w-[2px] bg-white shadow-[0_0_0_1px_rgba(0,0,0,.3)]">
      <div className="absolute left-1/2 top-1/2 grid h-[38px] w-[38px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-sar-acc bg-white shadow-[0_10px_34px_rgba(0,0,0,.55)]">
        <ArrowLeftRight size={16} className="text-sar-oacc" />
      </div>
    </div>
  );
}

const Tag = ({ className = "", children }) => (
  <div
    className={`pointer-events-none absolute top-2.5 z-10 rounded-md border border-sar-line bg-[rgba(10,19,33,.9)] px-2.5 py-1 font-mono text-[11.5px] font-medium text-sar-ink ${className}`}
  >
    {children}
  </div>
);

const Overlay = ({ children }) => (
  <div className="absolute inset-0 z-20 grid place-items-center bg-black/55 text-[13px] text-sar-ink2">{children}</div>
);

const Sw = ({ c, l }) => (
  <span className="inline-flex items-center gap-1.5 text-sar-ink2">
    <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
    {l}
  </span>
);

const Stat = ({ label, value, unit, cap, accent }) => (
  <section className="sar-card">
    <span className="sar-lab">{label}</span>
    <div className="mt-1.5 text-[28px] font-semibold leading-tight tracking-tight" style={accent ? { color: accent } : undefined}>
      {value}
      <small className="ml-1 text-[13px] font-normal tracking-normal text-sar-mut">{unit}</small>
    </div>
    <span className="sar-cap">{cap}</span>
  </section>
);
