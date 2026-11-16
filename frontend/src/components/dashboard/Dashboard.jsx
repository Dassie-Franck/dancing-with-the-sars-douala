/* eslint-disable react/prop-types */
// Tableau de bord (Dev 2) : secteur d'étude (globe -> radar), indicateurs min / max / variation,
// courbe km² et dB avec saisons en fond (F13, F14, F16), quartiers sous surveillance.
// Présentation seulement : les chiffres viennent du catalogue (cas d'usage) et des règles du domaine.
import { useState } from "react";
import { useQuartierExposure } from "../../app/services";
import { EXPOSURE_RADIUS_KM, RISK_THRESHOLDS } from "../../domain/exposure";
import { floodLevel } from "../../domain/waterStats";
import { C, RISK_COLOR } from "../../ui/theme";
import { RISK_LABEL, fDate, fShort, nf, signed } from "../../ui/format";
import Donut from "./Donut";
import QuartiersMap from "./QuartiersMap";
import SectorGlobe, { SeasonChip } from "./SectorGlobe";
import WaterChart, { ChartLegend } from "./WaterChart";

/** @param {{catalog: import("../../application/useCases").Catalog, selectedId: string,
 *           onSelect: (id: string) => void, active: boolean, onNavigate: (view: string) => void}} props */
export default function Dashboard({ catalog, selectedId, onSelect, active, onNavigate }) {
  const { studyArea, acquisitions, stats, referenceId } = catalog;
  const { status: expoStatus, exposure, error: expoError } = useQuartierExposure(catalog);
  const [focusId, setFocusId] = useState(null);

  const acq = acquisitions.find((a) => a.id === selectedId);
  const ref = acquisitions.find((a) => a.id === referenceId);
  if (!stats || !acq) return <p className="p-6 text-sar-ink2">Aucune acquisition exploitable.</p>;

  const flood = floodLevel(acq, stats);
  const ranking = exposure?.byAcquisition[acq.id] ?? null;
  const nHigh = ranking ? ranking.filter((r) => r.risk === "high").length : 0;
  const maxPct = Math.max(1, ...(ranking ?? []).map((r) => r.pct));

  return (
    <div className="space-y-4 px-4 pb-24 pt-5 sm:px-[22px] md:pb-10">
      {/* Ligne 1 : secteur d'étude, acquisition, niveau de crue */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[2.1fr_1.45fr_1fr]">
        <div className="md:col-span-2 xl:col-span-1">
          <SectorGlobe studyArea={studyArea} acquisition={acq} active={active} onOpenMap={() => onNavigate("carte")} />
        </div>

        <section className="sar-card">
          <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-[15px] font-semibold">Acquisition sélectionnée</h3>
              <p className="sar-cap">{fDate(acq.date)}</p>
            </div>
            <SeasonChip season={acq.season} />
          </header>
          <div className="grid grid-cols-[1fr_128px] items-center gap-4">
            <dl className="space-y-1.5 text-[12.5px]">
              <Kv dot={C.water} k="Eau détectée" v={`${nf(acq.waterAreaKm2)} km²`} />
              <Kv dot={C.veg} k="Eau nouvelle" v={acq.newWaterKm2 == null ? "scène de référence" : `${nf(acq.newWaterKm2)} km²`} />
              <Kv dot={C.ink2} k="HH moyen" v={`${nf(acq.meanHhDb, 2)} dB`} />
              <Kv k="Seuil eau" v={`HH < ${nf(acq.thresholdDb)} dB`} />
              <Kv k="Couverture valide" v={`${nf(acq.validFraction * 100, 0)} %`} />
              <Kv k="Orbite · polar." v={`${acq.orbit ?? "–"} · ${acq.polarizations.join("/")}`} />
              <Kv k="Maturité" v={acq.maturity} />
            </dl>
            <Donut parts={[[acq.waterFraction, C.water]]} label={`${nf(acq.waterFraction * 100)} % de l'emprise en eau`}>
              <b className="text-[22px] font-semibold tracking-tight">{nf(acq.waterFraction * 100)}%</b>
              <span className="text-[11px] leading-tight text-sar-mut">de l’emprise<br />en eau</span>
            </Donut>
          </div>
        </section>

        <section className="sar-card flex flex-col">
          <header className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-[15px] font-semibold">Niveau de crue</h3>
              <p className="sar-cap">entre l’étiage et le pic observés</p>
            </div>
            {flood.severity === "high" && <span className="sar-chip bg-sar-bad/15 text-sar-bad">Alerte</span>}
          </header>
          <Donut parts={[[flood.ratio, RISK_COLOR[flood.severity]]]} className="mx-auto my-3 max-w-[170px]" label={`${Math.round(flood.ratio * 100)} % du pic`}>
            <b className="text-[25px] font-semibold tracking-tight">{Math.round(flood.ratio * 100)}%</b>
            <span className="text-[11px] leading-tight text-sar-mut">
              {signed(flood.aboveLowKm2)} km²
              <br />
              au-dessus de l’étiage
            </span>
          </Donut>
          <div className="mt-auto space-y-1 text-[12px]">
            <Kv k="Étiage" v={`${fShort(stats.minDate)} · ${nf(stats.minKm2)} km²`} />
            <Kv k="Pic" v={`${fShort(stats.maxDate)} · ${nf(stats.maxKm2)} km²`} />
          </div>
        </section>
      </div>

      {/* Ligne 2 : indicateurs (même définition que GET /api/stats) */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Tile label="Surface minimale" value={nf(stats.minKm2)} unit="km²" cap={`étiage, ${fShort(stats.minDate)}`} />
        <Tile label="Surface maximale" value={nf(stats.maxKm2)} unit="km²" cap={`pic de crue, ${fShort(stats.maxDate)}`} accent={C.bad} />
        <Tile
          label="Variation saisonnière"
          value={stats.seasonalVariationPct == null ? "–" : signed(stats.seasonalVariationPct)}
          unit="%"
          cap={
            stats.seasonalVariationPct == null
              ? "il manque une date de saison sèche ou des pluies"
              : `moyenne ${nf(stats.meanDryKm2)} → ${nf(stats.meanRainKm2)} km²`
          }
        />
        <Tile
          label="Eau nouvelle"
          value={acq.newWaterKm2 == null ? "–" : nf(acq.newWaterKm2)}
          unit={acq.newWaterKm2 == null ? "" : "km²"}
          cap={acq.newWaterKm2 == null ? "date de référence" : `le ${fShort(acq.date)}, vs ${fShort(ref?.date ?? referenceId)}`}
          accent={C.veg}
        />
      </div>

      {/* Ligne 3 : courbe et quartiers sous surveillance */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_1fr]">
        <section className="sar-card">
          <header className="mb-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-semibold">Suivi temporel de la surface en eau</h3>
              <p className="sar-cap">Cliquez un point pour changer de date dans toute l’application.</p>
            </div>
            <ChartLegend />
          </header>
          <WaterChart acquisitions={acquisitions} selectedId={selectedId} onSelect={onSelect} height={300} />
        </section>

        <section className="sar-card flex flex-col">
          <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-[15px] font-semibold">Quartiers sous surveillance</h3>
              <p className="sar-cap">Exposition à l’eau détectée le {fShort(acq.date)}</p>
            </div>
            <div className="flex items-center gap-2">
              {ranking && (
                <span className={`sar-chip ${nHigh ? "bg-sar-bad/15 text-sar-bad" : "bg-sar-sf2 text-sar-ink2"}`}>{nHigh} en alerte</span>
              )}
              <button className="sar-btn h-[28px] px-2.5 text-[12px]" onClick={() => onNavigate("carte")}>
                Ouvrir la carte
              </button>
            </div>
          </header>
          <div className="min-h-[300px] flex-1">
            <QuartiersMap
              studyArea={studyArea}
              acquisition={acq}
              quartiers={exposure?.quartiers ?? null}
              ranking={ranking}
              focusId={focusId}
              onFocus={setFocusId}
            />
          </div>
        </section>
      </div>

      {/* Ligne 4 : classement des quartiers et liste des acquisitions */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="sar-card flex flex-col">
          <header className="mb-2">
            <h3 className="text-[15px] font-semibold">Exposition des quartiers</h3>
            <p className="sar-cap">Part du sol gagnée par l’eau dans un rayon de {EXPOSURE_RADIUS_KM} km, eau permanente exclue</p>
          </header>
          {expoStatus === "loading" && <p className="py-6 text-[12.5px] text-sar-mut">Calcul de l’exposition…</p>}
          {expoStatus === "error" && <p className="py-6 text-[12.5px] text-sar-bad">Exposition indisponible : {expoError.message}</p>}
          <ol className="m-0 list-none p-0">
            {(ranking ?? []).map(({ quartier, pct, risk }, i) => {
              const on = focusId === quartier.id;
              const color = RISK_COLOR[risk];
              return (
                <li key={quartier.id}>
                  <button
                    onClick={() => setFocusId(on ? null : quartier.id)}
                    aria-pressed={on}
                    className={`grid w-full grid-cols-[20px_minmax(0,1.1fr)_minmax(0,1fr)_56px_76px] items-center gap-3 border-t border-sar-line px-1 py-[7px] text-left text-[12.5px] transition-colors ${
                      i === 0 ? "border-t-0" : ""
                    } ${on ? "bg-sar-acc/[.13]" : "hover:bg-sar-sf2"}`}
                  >
                    <span className="font-mono text-[11px] text-sar-mut">{i + 1}</span>
                    <span className="truncate font-medium text-sar-ink">{quartier.name}</span>
                    <span className="block h-1 overflow-hidden rounded-sm bg-sar-sf2">
                      <i className="block h-full rounded-sm" style={{ width: `${(pct / maxPct) * 100}%`, background: color }} />
                    </span>
                    <span className="text-right font-mono text-[12px] text-sar-ink">{nf(pct)} %</span>
                    <span className="sar-chip justify-center" style={{ background: `${color}26`, color }}>
                      {RISK_LABEL[risk]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="mt-auto pt-3 text-[12px] leading-relaxed text-sar-mut">
            Élevée à partir de {RISK_THRESHOLDS.high} %, modérée à partir de {RISK_THRESHOLDS.mid} % (seuils indicatifs). Dans le bâti dense,
            l’eau entre les immeubles reste invisible au radar : ces valeurs sont des minimums.
          </p>
        </section>

        <section className="sar-card flex flex-col">
          <header className="mb-2">
            <h3 className="text-[15px] font-semibold">Acquisitions</h3>
            <p className="sar-cap">
              {acquisitions.length} date{acquisitions.length > 1 ? "s" : ""} exploitable{acquisitions.length > 1 ? "s" : ""} · référence{" "}
              {fShort(ref?.date ?? referenceId)}
            </p>
          </header>
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="text-left">
                  {["Date", "Saison", "Eau", "Δ réf.", "HH"].map((h) => (
                    <th key={h} className="sar-lab border-b border-sar-line px-2 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {acquisitions.map((a) => {
                  const on = a.id === selectedId;
                  const td = "whitespace-nowrap border-b border-sar-line px-2 py-2";
                  return (
                    <tr
                      key={a.id}
                      onClick={() => onSelect(a.id)}
                      className={`cursor-pointer transition-colors ${on ? "bg-sar-acc/[.13]" : "hover:bg-sar-sf2"}`}
                      aria-selected={on}
                    >
                      <td className={`${td} font-mono text-sar-ink`}>
                        {/* le clic remonte à la ligne ; le bouton rend la ligne accessible au clavier */}
                        <button className="text-left focus:outline-none focus-visible:underline">{a.date}</button>
                      </td>
                      <td className={td}>
                        <SeasonChip season={a.season} />
                      </td>
                      <td className={`${td} font-mono text-sar-ink`}>{nf(a.waterAreaKm2)} km²</td>
                      <td className={`${td} font-mono text-sar-ink2`}>{ref ? signed(a.waterAreaKm2 - ref.waterAreaKm2) : "–"}</td>
                      <td className={`${td} font-mono text-sar-ink2`}>{nf(a.meanHhDb, 1)} dB</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-auto pt-3 text-[12px] leading-relaxed text-sar-mut">
            Seuil d’eau : HH &lt; {nf(catalog.defaultThresholdDb)} dB, hypothèse non validée sur le terrain. Vent, marée et bâti dense peuvent
            fausser le masque. Saisons : sèche de décembre à février, pluies de mars à novembre.
          </p>
        </section>
      </div>
    </div>
  );
}

const Kv = ({ k, v, dot }) => (
  <div className="flex items-baseline justify-between gap-3 text-sar-ink2">
    <dt className="flex items-center">
      {dot && <i className="mr-2 inline-block h-2 w-2 rounded-sm" style={{ background: dot }} />}
      {k}
    </dt>
    <dd className="m-0 text-right font-mono text-[12px] text-sar-ink">{v}</dd>
  </div>
);

const Tile = ({ label, value, unit, cap, accent }) => (
  <section className="sar-card">
    <span className="sar-lab">{label}</span>
    <div className="mt-1.5 text-[28px] font-semibold leading-tight tracking-tight" style={accent ? { color: accent } : undefined}>
      {value}
      {unit && <small className="ml-1 text-[13px] font-normal tracking-normal text-sar-mut">{unit}</small>}
    </div>
    <span className="sar-cap">{cap}</span>
  </section>
);
