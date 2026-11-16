// DOMAINE · Capteur radar à l'origine des images.
// Le manifest dit quel produit et quels satellites ont été utilisés ; on en déduit la bande et la longueur d'onde
// pour que l'interface n'affirme jamais un capteur qui n'est pas celui des données.

const KNOWN = [
  { test: /sentinel.?1|^s1[a-d]?$/i, name: "Sentinel-1", instrument: "C-SAR", band: "C", wavelengthCm: 5.5, revisitDays: 12 },
  { test: /nisar/i, name: "NISAR", instrument: "L-SAR", band: "L", wavelengthCm: 24, revisitDays: 12 },
];

/** « S1A » -> « Sentinel-1A » ; les autres noms sont rendus tels quels. */
export function satelliteLabel(code) {
  const m = /^S1([A-D])$/i.exec(code ?? "");
  return m ? `Sentinel-1${m[1].toUpperCase()}` : code;
}

/**
 * @param {{products: string[], satellites: string[], polarizations: string[]}} p
 * @returns {import("./model").Sensor}
 */
export function describeSensor({ products, satellites, polarizations }) {
  const hint = [...products, ...satellites].find((s) => KNOWN.some((k) => k.test.test(s)));
  const known = hint ? KNOWN.find((k) => k.test.test(hint)) : null;
  return {
    name: known?.name ?? (products[0] || "Radar SAR"),
    instrument: known?.instrument ?? null,
    band: known?.band ?? null,
    wavelengthCm: known?.wavelengthCm ?? null,
    revisitDays: known?.revisitDays ?? null,
    polarization: polarizations[0] ?? null,
    polarizations,
    satellites: satellites.map(satelliteLabel),
    products,
  };
}
