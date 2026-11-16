// INFRASTRUCTURE · Adaptateur statique du port QuartierRepository.
// Centres approximatifs (WGS84) des quartiers suivis à Douala, à affiner avec l'équipe.
// Pour les servir depuis l'API plus tard : écrire un adaptateur qui renvoie la même liste.

const QUARTIERS = [
  ["akwa", "Akwa", 9.699, 4.05],
  ["bonanjo", "Bonanjo", 9.69, 4.042],
  ["deido", "Deido", 9.708, 4.065],
  ["bonaberi", "Bonabéri", 9.66, 4.073],
  ["mabanda", "Mabanda", 9.645, 4.085],
  ["bepanda", "Bépanda", 9.727, 4.064],
  ["new-bell", "New Bell", 9.712, 4.038],
  ["makepe-missoke", "Makèpè Missoké", 9.753, 4.079],
  ["bonamoussadi", "Bonamoussadi", 9.74, 4.092],
  ["youpwe", "Youpwé", 9.694, 4.017],
  ["logbaba", "Logbaba", 9.768, 4.04],
  ["ndogpassi", "Ndogpassi", 9.77, 4.017],
].map(([id, name, lon, lat]) => ({ id, name, lon, lat }));

/** @returns {import("../../application/ports").QuartierRepository} */
export function createStaticQuartierRepository() {
  return {
    async listQuartiers() {
      return QUARTIERS;
    },
  };
}
