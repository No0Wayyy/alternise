// Zone atteignable depuis l'adresse de l'étudiant en N minutes (à pied, à vélo, en voiture).
// Calcul par OpenRouteService, côté serveur : la clé ORS_API_KEY ne part jamais dans le navigateur.
// Quota gratuit : 500 calculs par jour. La même zone est gardée en mémoire 1 jour.
import "server-only";
import { cacheLife } from "next/cache";
import { simplifierContour } from "./geometrie.ts";
import { MODES, type Point, type Trajet } from "./recherche.ts";

/** La base accepte 500 coins ; 300 suffisent pour garder la forme. */
const COINS_MAX = 300;

export async function zoneAtteignable(trajet: Trajet): Promise<Point[]> {
  "use cache";
  cacheLife("days");

  const cle = process.env.ORS_API_KEY;
  if (!cle) throw new Error("Clé ORS_API_KEY manquante");
  const r = await fetch(`https://api.openrouteservice.org/v2/isochrones/${MODES[trajet.mode].profil}`, {
    method: "POST",
    headers: { Authorization: cle, "Content-Type": "application/json", Accept: "application/geo+json" },
    // L'adresse est déjà arrondie à ~100 m (voir lireCriteres).
    body: JSON.stringify({ locations: [[trajet.depart.lon, trajet.depart.lat]], range: [trajet.minutes * 60] }),
  });
  if (!r.ok) throw new Error(`OpenRouteService : calcul refusé (code ${r.status})`);

  const json = (await r.json()) as {
    features?: { geometry: { type: string; coordinates: number[][][] | number[][][][] } }[];
  };
  const geometrie = json.features?.[0]?.geometry;
  if (!geometrie) throw new Error("OpenRouteService : réponse sans zone");
  // Polygon : [contour, trous…]. MultiPolygon : on garde le plus grand contour.
  const contours =
    geometrie.type === "MultiPolygon"
      ? (geometrie.coordinates as number[][][][]).map((p) => p[0])
      : [(geometrie.coordinates as number[][][])[0]];
  const contour = contours.reduce((a, b) => (b.length > a.length ? b : a));
  return simplifierContour(
    contour.map(([lon, lat]) => ({ lat, lon })),
    COINS_MAX,
  );
}
