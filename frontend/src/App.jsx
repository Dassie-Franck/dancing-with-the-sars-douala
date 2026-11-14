import { useState } from "react";
import IntroGlobe from "./components/globe/IntroGlobe";
import { Satellite, Waves } from "lucide-react";
import MapView from "./components/MapView";

export default function App() {
    const [showIntro, setShowIntro] = useState(true);
  return (
    <>
    {showIntro && <IntroGlobe onDone={() => setShowIntro(false)} />}
      <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-space-700 bg-space-800 px-5 py-3">
        <Satellite className="text-radar" />
        <h1 className="text-lg font-semibold">Dancing with the SARs — Douala</h1>
        <span className="ml-auto flex items-center gap-1 text-sm text-slate-400">
          <Waves size={16} /> Suivi radar NISAR de l'estuaire du Wouri
        </span>
      </header>

      <main className="grid flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-3">
        <section className="min-h-[420px] lg:col-span-2">
          {/* M1 : carte interactive (+ M2 : couches SAR) */}
          <MapView />
        </section>

        <aside className="space-y-4">
          {/* M3 : courbe de suivi temporel (Recharts) */}
          <div className="rounded-lg bg-space-800 p-4">M3 — Courbe de suivi temporel</div>
          {/* M4 : panneau « Ce que voit le radar » */}
          <div className="rounded-lg bg-space-800 p-4">M4 — Ce que voit le radar</div>
          {/* M5 : applications futures */}
          <div className="rounded-lg bg-space-800 p-4">M5 — Applications futures</div>
        </aside>
      </main>
    </div>
    </>
  );
}