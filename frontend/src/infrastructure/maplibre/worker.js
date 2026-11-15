// INFRASTRUCTURE · MapLibre 6 cherche son worker à côté de son propre fichier (new URL("./maplibre-gl-worker.mjs", import.meta.url)).
// Vite déplace ce fichier (dev : .vite/deps, build : assets/) : le worker devient introuvable
// et la carte ne charge plus ses tuiles ni ses images. On lui donne l'URL exacte, valable en dev et en production.
import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";

setWorkerUrl(workerUrl);
