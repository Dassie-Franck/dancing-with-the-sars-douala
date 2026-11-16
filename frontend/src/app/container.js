// RACINE DE COMPOSITION
// Le seul endroit qui choisit les adaptateurs. Pour passer des fichiers statiques au backend,
// on change une variable d'environnement (fichier frontend/.env.local), pas le code :
//
//   VITE_DATA_SOURCE=static   (défaut) lit public/data/manifest.json (sortie du notebook)
//   VITE_DATA_SOURCE=api      lit l'API FastAPI, repli automatique sur les fichiers statiques
//   VITE_API_URL=http://localhost:8000
//   VITE_LAYERS_URL=          (optionnel) où sont servis les PNG ; défaut : public/data/
import { createUseCases } from "../application/useCases";
import { createStaticSarRepository } from "../infrastructure/static/staticSarRepository";
import { createApiSarRepository } from "../infrastructure/api/apiSarRepository";
import { createStaticQuartierRepository } from "../infrastructure/static/staticQuartierRepository";
import { createCanvasRasterReader } from "../infrastructure/browser/canvasRasterReader";

export function createContainer(env = import.meta.env) {
  const staticBase = `${env.BASE_URL ?? "/"}data/`;
  const staticRepo = createStaticSarRepository({ baseUrl: staticBase });
  const dataMode = env.VITE_DATA_SOURCE === "api" ? "api" : "static";

  const sarRepository =
    dataMode === "api"
      ? createApiSarRepository({
          apiUrl: env.VITE_API_URL ?? "http://localhost:8000",
          layersBaseUrl: env.VITE_LAYERS_URL || staticBase,
          fallback: staticRepo,
        })
      : staticRepo;

  const useCases = createUseCases({
    sarRepository,
    rasterReader: createCanvasRasterReader(),
    quartierRepository: createStaticQuartierRepository(),
  });
  // dataMode : source configurée (indicateur « API en ligne / repli statique » de l'en-tête, K13)
  return { ...useCases, dataMode, apiUrl: dataMode === "api" ? env.VITE_API_URL ?? "http://localhost:8000" : null };
}
