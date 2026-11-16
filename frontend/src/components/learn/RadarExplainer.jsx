/* eslint-disable react/prop-types */
// « Ce que voit le radar » (M4, tâche C6) : onglets texte + schéma. Les textes vivent dans src/content/radar.js.
import { RADAR_TOPICS } from "../../content/radar";
import { useI18n } from "../../i18n";

// Textes des schémas SVG : chaque <text> passe par le dictionnaire de traduction.
// Les apostrophes droites du fichier source sont comparées telles quelles ; le texte traduit est échappé.
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const translateSvg = (svg, t) => svg.replace(/(<text[^>]*>)([^<]*)(<\/text>)/g, (m, a, txt, b) => a + esc(t(txt)) + b);

export default function RadarExplainer({ tab, onTab, onAction }) {
  const { t: tx } = useI18n();
  const topic = RADAR_TOPICS.find((t) => t.id === tab) ?? RADAR_TOPICS[0];
  return (
    <div className="px-4 pb-24 pt-5 sm:px-[22px] md:pb-10">
      <div className="mb-4 flex flex-wrap gap-1.5" role="tablist" aria-label={tx("Thèmes")}>
        {RADAR_TOPICS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={t.id === topic.id}
            onClick={() => onTab(t.id)}
            className={`h-9 rounded-[10px] border px-3.5 text-[13px] font-medium transition-colors ${
              t.id === topic.id ? "border-sar-acc bg-sar-acc/[.13] text-sar-acc" : "border-sar-line bg-sar-sf text-sar-ink2 hover:text-sar-ink"
            }`}
          >
            {tx(t.tab)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2" role="tabpanel">
        <article className="py-1.5">
          <h2 className="mb-3.5 text-[24px] font-semibold leading-tight tracking-tight [text-wrap:balance]">{tx(topic.title)}</h2>
          {topic.paragraphs?.map((p, i) => (
            // Textes du fichier de contenu (rédigés par l'équipe) : <b> autorisé pour HH / HV
            <p key={i} className="mb-3 max-w-[60ch] text-[15px] text-sar-ink2 [&_b]:text-sar-ink" dangerouslySetInnerHTML={{ __html: tx(p) }} />
          ))}
          {topic.example && (
            <div className="mt-3 rounded-r-md border-l-[3px] border-sar-acc bg-sar-acc/[.13] px-3.5 py-2 text-[13.5px]">{tx(topic.example)}</div>
          )}
          {topic.limits && (
            <ul className="m-0 space-y-2 pl-[18px] text-[14.5px] text-sar-ink2">
              {topic.limits.map(([b, t]) => (
                <li key={b}>
                  <b className="text-sar-ink">{tx(b)}</b> {tx(t)}
                </li>
              ))}
            </ul>
          )}
          {topic.action && (
            <button className="sar-btn mt-4" onClick={() => onAction(topic.action)}>
              {tx(topic.action.label)}
            </button>
          )}
        </article>
        <figure className="sar-card sar-schema m-0 grid place-items-center p-3" aria-label={tx("Schéma : {name}", { name: tx(topic.tab) })} dangerouslySetInnerHTML={{ __html: translateSvg(topic.schema, tx) }} />
      </div>
    </div>
  );
}
