/* eslint-disable react/prop-types */
// Analyse (M3) : courbe synchronisée, atelier du seuil (histogramme réel de la rétrodiffusion, Otsu),
// exposition des quartiers par date, tableau des acquisitions exportable.
import { useEffect, useState } from "react";
import { useQuartierExposure, useThresholdStudy } from "../../app/services";
import { EXPOSURE_RADIUS_KM } from "../../domain/exposure";
import { C, RISK_COLOR } from "../../ui/theme";
import { fDate, fShort, nf, signed } from "../../ui/format";
import WaterChart, { ChartLegend } from "../dashboard/WaterChart";
import { SeasonChip } from "../dashboard/SectorGlobe";

export default function AnalysePage({ catalog, selectedId, onSelect, onOpenQuartier }) {
  return (
    <div className="space-y-4 px-4 pb-24 pt-5 sm:px-[22px] md:pb-10">
      <p className="max-w-[76ch] text-[14px] text-sar-ink2">
        Les chiffres derrière la carte. Cliquez une date sur la courbe ou dans le tableau : toute l’application suit.
      </p>
      <section className="sar-card">
        <header className="mb-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-semibold">Suivi temporel</h3>
            <p className="sar-cap">Surface en eau, eau nouvelle et rétrodiffusion moyenne, saisons en fond</p>
          </div>
          <ChartLegend />
        </header>
        <WaterChart acquisitions={catalog.acquisitions} selectedId={selectedId} onSelect={onSelect} height={300} />
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ThresholdWorkshop catalog={catalog} selectedId={selectedId} />
        <ExposureMatrix catalog={catalog} selectedId={selectedId} onSelect={onSelect} onOpenQuartier={onOpenQuartier} />
      </div>

      <AcquisitionsTable catalog={catalog} selectedId={selectedId} onSelect={onSelect} />
    </div>
  );
}

/* ---------- Atelier du seuil ---------- */
function ThresholdWorkshop({ catalog, selectedId }) {
  const [threshold, setThreshold] = useState(catalog.defaultThresholdDb);
  const { study, status, error } = useThresholdStudy(catalog, selectedId, threshold);
  const acq = catalog.acquisitions.find((a) => a.id === selectedId);
  const [lo, hi] = catalog.dbRange;

  return (
    <section className="sar-card">
      <header className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold">Atelier du seuil</h3>
          <p className="sar-cap">Histogramme HH, {fDate(acq.date)}. Le seuil est un choix : déplacez-le.</p>
        </div>
        <button
          className="sar-btn h-[28px] px-2.5 text-[12px]"
          disabled={!study}
          onClick={() => study && setThreshold(Math.round(study.otsuDb * 2) / 2)}
          title="Seuil qui sépare au mieux les deux populations de pixels"
        >
          Appliquer Otsu
        </button>
      </header>
      {status === "error" && <p className="py-6 text-[12.5px] text-sar-bad">Histogramme indisponible : {error.message}</p>}
      {!study && status !== "error" && <p className="py-14 text-center text-[12.5px] text-sar-mut">Lecture de l’image radar…</p>}
      {study && <Histogram hist={study.histogram} threshold={threshold} otsu={study.otsuDb} />}
      <input
        type="range"
        min={Math.max(lo, -26)}
        max={Math.min(hi, -8)}
        step="0.5"
        value={threshold}
        onChange={(e) => setThreshold(+e.target.value)}
        aria-label="Seuil de détection de l’eau en dB"
        className="mt-1 w-full accent-sar-acc"
      />
      <div className="mt-3 grid grid-cols-3 gap-3">
        <Metric label={`Eau à ${nf(threshold)} dB`} value={study ? `${nf(study.waterKm2)} km²` : "…"} />
        <Metric
          label={`Écart avec ${nf(acq.thresholdDb)} dB`}
          value={study ? `${signed(study.waterKm2 - study.contractWaterKm2)} km²` : "…"}
          title="Comparé à la surface publiée par le pipeline pour cette date"
        />
        <Metric label="Seuil d’Otsu" value={study ? `${nf(study.otsuDb)} dB` : "…"} />
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-sar-mut">
        Calcul sur l’image radar publiée (quantifiée en 256 niveaux) : l’écart avec la surface officielle du pipeline reste faible au
        seuil {nf(acq.thresholdDb)} dB. Le seuil ne change ici que cet atelier ; la carte garde le masque publié.
      </p>
    </section>
  );
}

function Histogram({ hist, threshold, otsu }) {
  const w = 560;
  const h = 180;
  const m = { l: 6, r: 6, t: 18, b: 22 };
  const { lo, hi, bins, counts } = hist;
  const max = Math.max(...counts) || 1;
  const X = (v) => m.l + ((v - lo) / (hi - lo)) * (w - m.l - m.r);
  const bw = (w - m.l - m.r) / bins;
  const ticks = [];
  for (let d = Math.ceil(lo / 5) * 5; d <= hi; d += 5) ticks.push(d);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={`Histogramme de la rétrodiffusion, seuil ${nf(threshold)} dB`}>
      {Array.from(counts).map((v, i) => {
        const db = lo + ((i + 0.5) / bins) * (hi - lo);
        const bh = (v / max) * (h - m.t - m.b);
        const water = db < threshold;
        return <rect key={i} x={m.l + i * bw} y={h - m.b - bh} width={Math.max(0.5, bw - 0.8)} height={bh} fill={water ? C.water : C.mut} opacity={water ? 0.9 : 0.45} />;
      })}
      {ticks.map((d) => (
        <text key={d} x={X(d)} y={h - 6} textAnchor="middle" fontSize="10.5" fill={C.mut} fontFamily="JetBrains Mono, monospace">
          {d}
        </text>
      ))}
      <line x1={X(otsu)} x2={X(otsu)} y1={m.t} y2={h - m.b} stroke={C.ink2} strokeDasharray="3 3" />
      <line x1={X(threshold)} x2={X(threshold)} y1={4} y2={h - m.b} stroke={C.acc} strokeWidth="2" />
      <text x={Math.min(X(threshold) + 6, w - 90)} y={13} fontSize="11" fill={C.acc} fontFamily="JetBrains Mono, monospace">
        seuil {nf(threshold)} dB
      </text>
    </svg>
  );
}

const Metric = ({ label, value, title }) => (
  <div title={title}>
    <span className="sar-lab">{label}</span>
    <div className="mt-0.5 font-mono text-[15px] text-sar-ink">{value}</div>
  </div>
);

/* ---------- Exposition des quartiers, par date ---------- */
function ExposureMatrix({ catalog, selectedId, onSelect, onOpenQuartier }) {
  const { exposure, status } = useQuartierExposure(catalog);
  const dates = catalog.acquisitions;
  const rows = exposure
    ? exposure.quartiers
        .map((q) => ({ q, cells: dates.map((a) => exposure.byAcquisition[a.id].find((r) => r.quartier.id === q.id)) }))
        .sort((a, b) => Math.max(...b.cells.map((c) => c.pct)) - Math.max(...a.cells.map((c) => c.pct)))
    : [];

  return (
    <section className="sar-card">
      <header className="mb-2">
        <h3 className="text-[15px] font-semibold">Exposition des quartiers</h3>
        <p className="sar-cap">Part du sol gagnée par l’eau (rayon {EXPOSURE_RADIUS_KM} km), par date. Cliquez un quartier pour l’ouvrir sur la carte.</p>
      </header>
      {status !== "ready" && <p className="py-6 text-[12.5px] text-sar-mut">Calcul de l’exposition…</p>}
      {exposure && (
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full border-separate border-spacing-[2px] text-[12px]">
            <thead>
              <tr>
                <th />
                {dates.map((a) => (
                  <th key={a.id} className={`px-1 font-mono text-[10px] font-medium ${a.id === selectedId ? "text-sar-acc" : "text-sar-mut"}`}>
                    <button onClick={() => onSelect(a.id)}>{fShort(a.date)}</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ q, cells }) => (
                <tr key={q.id}>
                  <td className="whitespace-nowrap pr-2 font-medium">
                    <button className="hover:text-sar-acc" onClick={() => onOpenQuartier(q.id)}>
                      {q.name}
                    </button>
                  </td>
                  {cells.map((c, i) => {
                    const strength = Math.min(90, c.pct * 6);
                    return (
                      <td
                        key={dates[i].id}
                        className="h-[26px] rounded-[3px] text-center font-mono text-[11px]"
                        style={{
                          background: `color-mix(in srgb, ${RISK_COLOR[c.risk]} ${strength}%, var(--sf2))`,
                          color: strength > 50 ? "var(--sf)" : "var(--ink2)",
                          outline: dates[i].id === selectedId ? `1.5px solid ${C.acc}` : undefined,
                        }}
                        title={`${q.name}, ${fDate(dates[i].date)} : ${nf(c.pct)} %`}
                      >
                        {c.pct < 0.05 ? "·" : nf(c.pct)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-[12px] text-sar-mut">Dans le bâti dense, l’eau entre les immeubles reste invisible au radar : ces valeurs sont des minimums.</p>
    </section>
  );
}

/* ---------- Acquisitions et export ---------- */
// water_series.json (contrat T0.4) : [{date, surface_km2, backscatter_db}]
const toWaterSeries = (acqs) => acqs.map((a) => ({ date: a.date, surface_km2: a.waterAreaKm2, backscatter_db: a.meanHhDb }));
const toCsv = (acqs) =>
  ["date,saison,surface_km2,eau_nouvelle_km2,backscatter_db,couverture"]
    .concat(acqs.map((a) => [a.date, a.season, a.waterAreaKm2, a.newWaterKm2 ?? "", a.meanHhDb, a.validFraction].join(",")))
    .join("\n");

function AcquisitionsTable({ catalog, selectedId, onSelect }) {
  const acqs = catalog.acquisitions;
  const [copied, setCopied] = useState(null);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async (kind) => {
    const text = kind === "csv" ? toCsv(acqs) : JSON.stringify(toWaterSeries(acqs), null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
    } catch {
      setCopied("refus");
    }
  };

  return (
    <section className="sar-card">
      <header className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold">Acquisitions</h3>
          <p className="sar-cap">Données exploitables (couverture suffisante), triées par date</p>
        </div>
        <div className="flex gap-2">
          <button className="sar-btn h-[28px] px-2.5 text-[12px]" onClick={() => copy("csv")}>
            {copied === "csv" ? "Copié" : "Copier en CSV"}
          </button>
          <button className="sar-btn h-[28px] px-2.5 text-[12px]" onClick={() => copy("json")} title="Format water_series.json du contrat">
            {copied === "json" ? "Copié" : "Copier en JSON"}
          </button>
        </div>
      </header>
      {copied === "refus" && <p className="mb-2 text-[12px] text-sar-bad">Copie refusée par le navigateur.</p>}
      <div className="-mx-2 overflow-x-auto">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="text-left">
              {["Date", "Saison", "Eau détectée", "Eau nouvelle", "HH moyen", "Couverture", "Orbite", "Maturité"].map((h) => (
                <th key={h} className="sar-lab whitespace-nowrap border-b border-sar-line px-2 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {acqs.map((a) => {
              const td = "whitespace-nowrap border-b border-sar-line px-2 py-2 font-mono";
              return (
                <tr key={a.id} onClick={() => onSelect(a.id)} className={`cursor-pointer ${a.id === selectedId ? "bg-sar-acc/[.13]" : "hover:bg-sar-sf2"}`}>
                  <td className={`${td} text-sar-ink`}>
                    <button className="focus:outline-none focus-visible:underline">{a.date}</button>
                  </td>
                  <td className="whitespace-nowrap border-b border-sar-line px-2 py-2">
                    <SeasonChip season={a.season} />
                  </td>
                  <td className={`${td} text-sar-ink`}>{nf(a.waterAreaKm2)} km²</td>
                  <td className={`${td} text-sar-ink2`}>{a.newWaterKm2 == null ? "référence" : `${nf(a.newWaterKm2)} km²`}</td>
                  <td className={`${td} text-sar-ink2`}>{nf(a.meanHhDb, 2)} dB</td>
                  <td className={`${td} text-sar-ink2`}>{nf(a.validFraction * 100, 0)} %</td>
                  <td className={`${td} text-sar-ink2`}>{a.orbit ?? "–"}</td>
                  <td className={`${td} text-sar-ink2`}>{a.maturity}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
