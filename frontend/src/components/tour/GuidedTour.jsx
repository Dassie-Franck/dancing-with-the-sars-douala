/* eslint-disable react/prop-types */
// Démo guidée : enchaîne les vues clés (support du tournage de la vidéo de 2 minutes, L5/L6).
// Chaque étape déclenche une action de l'application (vue, date, calques) puis avance seule.
import { useEffect, useState } from "react";
import { TOUR_STEPS } from "../../content/tour";

const STEP_MS = 10000;

export default function GuidedTour({ step, onStep, onClose, onAction }) {
  const [tick, setTick] = useState(0);
  const current = TOUR_STEPS[step];

  // Exécute l'action de l'étape, puis passe à la suivante après STEP_MS
  useEffect(() => {
    if (!current) return;
    onAction(current.action);
    setTick((t) => t + 1);
    const t = setTimeout(() => (step + 1 < TOUR_STEPS.length ? onStep(step + 1) : onClose()), STEP_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (!current) return null;
  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Démo guidée"
      className="fixed bottom-[140px] left-1/2 z-[60] w-[min(640px,calc(100vw-24px))] -translate-x-1/2 overflow-hidden rounded-[12px] border border-sar-acc bg-[#0b1626] shadow-[0_10px_34px_rgba(0,0,0,.55)] md:bottom-[112px]"
    >
      <div className="h-0.5 bg-sar-line">
        <i key={tick} className="block h-full bg-sar-acc" style={{ animation: `sar-tour ${STEP_MS}ms linear forwards` }} />
      </div>
      <div className="px-3.5 py-3">
        <p className="mb-2.5 text-[15px] font-medium">{current.text}</p>
        <div className="flex items-center gap-2">
          <span className="mr-auto font-mono text-[11px] text-sar-mut">
            Démo guidée · {step + 1}/{TOUR_STEPS.length}
          </span>
          <button className="sar-btn h-7 px-2.5 text-[12px]" disabled={step === 0} onClick={() => onStep(Math.max(0, step - 1))}>
            Précédent
          </button>
          <button className="sar-btn h-7 px-2.5 text-[12px]" onClick={() => (step + 1 < TOUR_STEPS.length ? onStep(step + 1) : onClose())}>
            Suivant
          </button>
          <button className="sar-btn h-7 px-2.5 text-[12px]" onClick={onClose}>
            Quitter
          </button>
        </div>
      </div>
      <style>{`@keyframes sar-tour{from{width:0}to{width:100%}}`}</style>
    </div>
  );
}
