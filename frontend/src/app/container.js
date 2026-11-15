// RACINE DE COMPOSITION
// Le seul endroit qui choisit les adaptateurs. Pour passer des données factices au backend,
// on change une variable d'environnement (fichier frontend/.env.local), pas le code :
//
//   VITE_DATA_SOURCE=static   (défaut) lit public/data/manifest.json
//   VITE_DATA_SOURCE=api      lit l'API FastAPI, repli automatique sur les fichiers statiques
//   VITE_API_URL=http://localhost:8000
//   VITE_LAYERS_URL=          (optionnel) où sont servis les PNG ; défaut : public/data/
import { createUseCases } from "../application/useCases";
import { createStaticSarRepository } from "../infrastructure/static/staticSarRepository";
import { createApiSarRepository } from "../infrastructure/api/apiSarRepository";
import { createStaticQuartierRepository } from "../infrastructure/static/staticQuartierRepository";
import { createCanvasMaskReader } from "../infrastructure/browser/canvasMaskReader";

export function createContainer(env = import.meta.env) {
  const staticBase = `${env.BASE_URL ?? "/"}data/`;
  const staticRepo = createStaticSarRepository({ baseUrl: staticBase });

  const sarRepository =
    env.VITE_DATA_SOURCE === "api"
      ? createApiSarRepository({
          apiUrl: env.VITE_API_URL ?? "http://localhost:8000",
          layersBaseUrl: env.VITE_LAYERS_URL || staticBase,
          fallback: staticRepo,
        })
      : staticRepo;

  return createUseCases({
    sarRepository,
    maskReader: createCanvasMaskReader(),
    quartierRepository: createStaticQuartierRepository(),
  });
}
