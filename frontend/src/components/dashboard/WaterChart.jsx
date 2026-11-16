/* eslint-disable react/prop-types */
// F13 courbe de surface en eau · F14 rétrodiffusion moyenne sur axe droit · F16 saisons en fond.
// Un clic sur un point choisit la date pour toute l'application (F15 s'appuie dessus).
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { seasonPeriods } from "../../domain/season";
import { C, SEASON_COLOR } from "../../ui/theme";
import { SEASON_LABEL, fDate, fShortTs, nf } from "../../ui/format";
import { tr, useI18n } from "../../i18n";

const DAY = 864e5;
const ts = (d) => new Date(`${d}T00:00:00`).getTime();

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-sar-line bg-black px-2.5 py-2 text-xs text-sar-ink shadow-lg">
      <div className="mb-1 text-sar-ink2">
        {fDate(p.date)} · {SEASON_LABEL[p.season] ? tr(SEASON_LABEL[p.season]) : p.season}
      </div>
      <Row color={C.water} label={tr("Eau détectée")} value={`${nf(p.water)} km²`} />
      <Row color={C.veg} label={tr("Eau nouvelle")} value={p.newWater == null ? tr("référence") : `${nf(p.newWater)} km²`} />
      <Row color={C.ink2} label={tr("{pol} moyen", { pol: p.pol })} value={`${nf(p.meanDb, 2)} dB`} />
    </div>
  );
}

const Row = ({ color, label, value }) => (
  <div className="flex items-center gap-2 py-0.5">
    <i className="inline-block h-2 w-2 rounded-sm" style={{ background: color }} />
    <span className="text-sar-ink2">{label}</span>
    <b className="ml-auto pl-4 font-mono font-medium">{value}</b>
  </div>
);

export function ChartLegend({ pol = "" }) {
  const { t } = useI18n();
  const items = [
    [C.water, t("Eau détectée (km²)"), false],
    [C.veg, t("Eau nouvelle vs référence (km²)"), false],
    [C.ink2, t("Rétrodiffusion {pol} moyenne (dB)", { pol }).replace("  ", " "), true],
  ];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-sar-ink2">
      {items.map(([c, l, dashed]) => (
        <span key={l} className="inline-flex items-center gap-1.5">
          <i
            className="inline-block h-[3px] w-3.5"
            style={dashed ? { backgroundImage: `linear-gradient(90deg, ${c} 60%, transparent 0)`, backgroundSize: "6px 3px" } : { background: c }}
          />
          {l}
        </span>
      ))}
    </div>
  );
}

// acquisitions : modèle du domaine ; on en tire ici les points du graphique (vue)
export default function WaterChart({ acquisitions, selectedId, onSelect, height = 300 }) {
  const { t } = useI18n();
  const data = useMemo(
    () =>
      acquisitions.map((a) => ({
        id: a.id,
        date: a.date,
        season: a.season,
        t: ts(a.date),
        water: a.waterAreaKm2,
        newWater: a.newWaterKm2,
        meanDb: a.meanDb,
        pol: a.polarization ?? "",
      })),
    [acquisitions]
  );
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const { domain, bands, dbDomain } = useMemo(() => {
    if (!data.length) return { domain: [0, 1], bands: [], dbDomain: [-20, 0] };
    const t0 = data[0].t - 20 * DAY;
    const t1 = data.at(-1).t + 20 * DAY;
    const dbs = data.map((d) => d.meanDb);
    return {
      domain: [t0, t1],
      bands: seasonPeriods(t0, t1).map((p) => ({ season: p.season, a: p.start, b: p.end })),
      dbDomain: [Math.floor(Math.min(...dbs) - 0.5), Math.ceil(Math.max(...dbs) + 0.5)],
    };
  }, [data]);

  const selT = data.find((d) => d.id === selectedId)?.t ?? null;
  // Largeur d'une bande en pixels (zone de tracé = largeur - axes) : le libellé n'apparaît que s'il tient
  const plotW = Math.max(0, width - 48 - 40 + 2);
  const bandPx = (b) => ((b.b - b.a) / (domain[1] - domain[0])) * plotW;
  const fits = (b) => bandPx(b) > t(SEASON_LABEL[b.season]).length * 6.3 + 12;

  const dot = (color, rSel, r) =>
    function Dot({ cx, cy, payload, index }) {
      if (cx == null || cy == null) return <g key={`d${index}`} />;
      const on = payload.id === selectedId;
      return (
        <circle
          key={`d${index}`}
          cx={cx}
          cy={cy}
          r={on ? rSel : r}
          fill={color}
          stroke={C.sf}
          strokeWidth={2}
          style={{ cursor: "pointer" }}
          onClick={() => onSelect?.(payload.id)}
        />
      );
    };

  return (
    <div ref={wrapRef} style={{ height }} className="relative w-full select-none">
      {/* Unités des deux axes, au-dessus des graduations */}
      <span className="pointer-events-none absolute left-0 top-0 font-mono text-[10.5px] text-sar-mut">km²</span>
      <span className="pointer-events-none absolute right-0 top-0 font-mono text-[10.5px] text-sar-mut">dB</span>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 18, right: 4, bottom: 0, left: -6 }}
          onClick={(st) => {
            const i = Number(st?.activeTooltipIndex);
            if (Number.isInteger(i) && data[i]) onSelect?.(data[i].id);
          }}
          style={{ cursor: "pointer" }}
        >
          <defs>
            <linearGradient id="wc-water" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.water} stopOpacity={0.28} />
              <stop offset="100%" stopColor={C.water} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          {bands.map((b) => (
            <ReferenceArea
              key={`${b.season}${b.a}`}
              yAxisId="km"
              x1={b.a}
              x2={b.b}
              fill={SEASON_COLOR[b.season]}
              fillOpacity={b.season === "dry" ? 0.04 : 0.07}
              strokeOpacity={0}
              ifOverflow="hidden"
              label={
                fits(b)
                  ? { value: t(SEASON_LABEL[b.season]).toLowerCase(), position: "insideTopLeft", fill: SEASON_COLOR[b.season], fontSize: 10.5, opacity: 0.9 }
                  : undefined
              }
            />
          ))}

          <CartesianGrid vertical={false} stroke={C.line} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={domain}
            ticks={data.map((d) => d.t)}
            tickFormatter={fShortTs}
            tick={{ fill: C.mut }}
            axisLine={{ stroke: C.line }}
            tickLine={false}
            allowDataOverflow
          />
          <YAxis
            yAxisId="km"
            domain={[0, "auto"]}
            tick={{ fill: C.mut }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <YAxis
            yAxisId="db"
            orientation="right"
            domain={dbDomain}
            tick={{ fill: C.mut }}
            axisLine={false}
            tickLine={false}
            width={40}
          />

          {selT && <ReferenceLine yAxisId="km" x={selT} stroke={C.acc} strokeWidth={1.5} />}

          <Tooltip content={<ChartTooltip />} cursor={{ stroke: C.mut, strokeDasharray: "3 3" }} isAnimationActive={false} />

          <Area
            yAxisId="km"
            dataKey="water"
            type="linear"
            stroke={C.water}
            strokeWidth={2}
            fill="url(#wc-water)"
            dot={dot(C.water, 6, 3.5)}
            activeDot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="km"
            dataKey="newWater"
            type="linear"
            stroke={C.veg}
            strokeWidth={2}
            connectNulls={false}
            dot={dot(C.veg, 5, 3)}
            activeDot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="db"
            dataKey="meanDb"
            type="linear"
            stroke={C.ink2}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
