// Simplifier le contour d'une zone : moins de coins, presque la même forme (algorithme de Douglas-Peucker).
import type { Point } from "./recherche.ts";

/** Distance (en degrés, approximative) d'un point au segment [a, b]. Suffisant pour simplifier un contour. */
function distanceAuSegment(p: Point, a: Point, b: Point): number {
  const dx = b.lon - a.lon;
  const dy = b.lat - a.lat;
  const longueur2 = dx * dx + dy * dy;
  const t = longueur2 ? Math.max(0, Math.min(1, ((p.lon - a.lon) * dx + (p.lat - a.lat) * dy) / longueur2)) : 0;
  const x = a.lon + t * dx - p.lon;
  const y = a.lat + t * dy - p.lat;
  return Math.sqrt(x * x + y * y);
}

function douglasPeucker(points: Point[], tolerance: number): Point[] {
  if (points.length < 3) return points;
  let plusLoin = 0;
  let indice = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = distanceAuSegment(points[i], points[0], points[points.length - 1]);
    if (d > plusLoin) {
      plusLoin = d;
      indice = i;
    }
  }
  if (plusLoin <= tolerance) return [points[0], points[points.length - 1]];
  const gauche = douglasPeucker(points.slice(0, indice + 1), tolerance);
  const droite = douglasPeucker(points.slice(indice), tolerance);
  return [...gauche.slice(0, -1), ...droite];
}

/**
 * Réduit un contour fermé à `max` coins au plus, en gardant sa forme.
 * Le dernier point n'est pas répété (la base referme la zone toute seule).
 */
export function simplifierContour(contour: Point[], max: number): Point[] {
  let points = contour;
  const premier = points[0];
  const dernier = points[points.length - 1];
  if (points.length > 1 && premier.lat === dernier.lat && premier.lon === dernier.lon) points = points.slice(0, -1);
  if (points.length <= max) return points;
  // On coupe le contour en deux moitiés pour que Douglas-Peucker garde les deux côtés.
  const milieu = Math.floor(points.length / 2);
  let tolerance = 0.0001; // environ 10 m
  for (;;) {
    const a = douglasPeucker(points.slice(0, milieu + 1), tolerance);
    const b = douglasPeucker([...points.slice(milieu), points[0]], tolerance);
    const resultat = [...a.slice(0, -1), ...b.slice(0, -1)];
    if (resultat.length <= max) return resultat;
    tolerance *= 1.5;
  }
}
