/* eslint-disable react-refresh/only-export-components, react/prop-types */
// PRÉSENTATION · Langue de l'interface (français / anglais).
// Le texte français reste écrit dans les composants : il sert de clé. en.js donne sa traduction.
//   const { t } = useI18n();  t("Eau détectée")  ->  "Detected water" en anglais
//   t("{n} en alerte", { n: 3 })  : les {variables} sont remplacées après traduction.
// Une phrase absente de en.js reste en français (et est signalée dans la console en développement).
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { EN } from "./en";
import { setFormatLocale } from "../ui/format";

export const LANGS = ["fr", "en"];
const STORAGE_KEY = "sar-lang";

let current = "fr";
const missing = new Set();

function initialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (LANGS.includes(saved)) return saved;
  } catch {
    /* stockage indisponible : langue du navigateur */
  }
  return typeof navigator !== "undefined" && /^en\b/i.test(navigator.language ?? "") ? "en" : "fr";
}

const fill = (s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s);

/** Traduction hors composant React (popups MapLibre, formats). Préférer useI18n() dans les composants. */
export function tr(text, vars) {
  if (current === "en") {
    const en = EN[text];
    if (en == null && import.meta.env.DEV && !missing.has(text)) {
      missing.add(text);
      console.warn(`[i18n] traduction anglaise manquante : ${JSON.stringify(text)}`);
    }
    return fill(en ?? text, vars);
  }
  return fill(text, vars);
}

/** Choisit la valeur de la langue courante dans un objet { fr, en } (contenus éditoriaux). */
export const pick = (byLang) => byLang[current] ?? byLang.fr;

function apply(lang) {
  current = lang;
  setFormatLocale(lang);
  if (typeof document !== "undefined") document.documentElement.lang = lang;
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const l = initialLang();
    apply(l);
    return l;
  });

  const setLang = useCallback((l) => {
    if (!LANGS.includes(l)) return;
    apply(l);
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignoré : le choix vaut pour cette visite */
    }
  }, []);

  useEffect(() => apply(lang), [lang]);

  // t change d'identité avec la langue : les composants qui l'utilisent se mettent à jour.
  const value = useMemo(() => ({ lang, setLang, t: (s, vars) => tr(s, vars) }), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** @returns {{lang: "fr"|"en", setLang: (l: "fr"|"en") => void, t: (text: string, vars?: object) => string}} */
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n doit être utilisé sous <I18nProvider>");
  return ctx;
}
