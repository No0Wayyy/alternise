// Copie le « worker » de MapLibre (le programme qui prépare la carte en arrière-plan)
// dans public/, pour que le navigateur le trouve à l'adresse /maplibre/maplibre-gl-worker.mjs.
// Lancé tout seul avant « npm run dev » et « npm run build » (donc aussi sur Vercel).
import { copyFileSync, mkdirSync } from "node:fs";

const source = "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs";
mkdirSync("public/maplibre", { recursive: true });
copyFileSync(source, "public/maplibre/maplibre-gl-worker.mjs");
console.log("Worker de la carte copié dans public/maplibre/");
