/* eslint-disable react/prop-types */
// Sélecteur de langue FR | EN (écran d'accueil et en-tête de l'application)
import { useI18n } from "../../i18n";

export default function LangSwitch({ variant = "app", className = "" }) {
  const { lang, setLang, t } = useI18n();
  const intro = variant === "intro";
  const base = intro
    ? "h-8 px-2.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors"
    : "h-8 px-2.5 font-mono text-[11.5px] font-medium uppercase tracking-[0.06em] transition-colors";
  const on = intro ? "bg-white/15 text-white" : "bg-sar-acc/[.13] text-sar-acc";
  const off = intro ? "text-blue-100/60 hover:text-white" : "text-sar-ink2 hover:text-sar-ink";
  const frame = intro ? "border-white/20 bg-black/30 backdrop-blur" : "border-sar-line bg-sar-sf";

  return (
    <div role="group" aria-label={t("Langue")} className={`flex shrink-0 overflow-hidden rounded-[10px] border ${frame} ${className}`}>
      {[
        ["fr", "Français"],
        ["en", "English"],
      ].map(([code, name], i) => (
        <button
          key={code}
          lang={code}
          title={name}
          aria-label={name}
          aria-pressed={lang === code}
          onClick={() => setLang(code)}
          className={`${base} ${i ? (intro ? "border-l border-white/20" : "border-l border-sar-line") : ""} ${lang === code ? on : off}`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
