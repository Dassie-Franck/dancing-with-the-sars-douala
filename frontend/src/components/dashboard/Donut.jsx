/* eslint-disable react/prop-types */
// Anneau de proportion (parts entre 0 et 1), centre libre.
import { C } from "../../ui/theme";

export default function Donut({ parts, children, className = "", label }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  let off = 0;
  return (
    <div className={`relative aspect-square w-full ${className}`} role="img" aria-label={label}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke={C.sf2} strokeWidth="9" />
        {parts.map(([v, color], i) => {
          const len = Math.max(0, Math.min(1, v) * circ - (parts.length > 1 ? 1.2 : 0));
          const el = (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={color}
              strokeWidth="9"
              strokeDasharray={`${len} ${circ}`}
              strokeDashoffset={-off * circ}
              style={{ transition: "stroke-dasharray .5s ease" }}
            />
          );
          off += v;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
