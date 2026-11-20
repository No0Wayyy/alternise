// Petites fonctions pour lire les fichiers officiels des arrêts et des gares.

/** Découpe une ligne CSV en champs. Gère les guillemets : "Gex, centre" reste un seul champ. */
export function lireLigneCsv(ligne: string, separateur = ","): string[] {
  const champs: string[] = [];
  let champ = "";
  let entreGuillemets = false;
  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i];
    if (entreGuillemets) {
      if (c === '"' && ligne[i + 1] === '"') {
        champ += '"';
        i++;
      } else if (c === '"') {
        entreGuillemets = false;
      } else {
        champ += c;
      }
    } else if (c === '"') {
      entreGuillemets = true;
    } else if (c === separateur) {
      champs.push(champ);
      champ = "";
    } else {
      champ += c;
    }
  }
  champs.push(champ);
  return champs;
}

/** France métropolitaine, Corse et outre-mer : on écarte les points hors de ces cadres (erreurs, pays voisins lointains). */
const CADRES = [
  { sud: 41.2, nord: 51.2, ouest: -5.3, est: 9.7 }, // métropole et Corse
  { sud: 15.8, nord: 16.6, ouest: -61.9, est: -60.9 }, // Guadeloupe
  { sud: 14.3, nord: 14.9, ouest: -61.3, est: -60.8 }, // Martinique
  { sud: 2.1, nord: 5.8, ouest: -54.6, est: -51.6 }, // Guyane
  { sud: -21.4, nord: -20.8, ouest: 55.2, est: 55.9 }, // La Réunion
  { sud: -13.1, nord: -12.6, ouest: 44.9, est: 45.3 }, // Mayotte
];

export function estEnFrance(lat: number, lon: number): boolean {
  return CADRES.some((c) => lat >= c.sud && lat <= c.nord && lon >= c.ouest && lon <= c.est);
}

/**
 * Garde un arrêt du fichier national s'il est utile à un étudiant :
 * un vrai point d'arrêt (pas une entrée de station), en France, hors réseaux scolaires.
 */
export function garderArret(a: { reseau: string; typeLieu: string; lat: number; lon: number }): boolean {
  if (a.typeLieu !== "" && a.typeLieu !== "0") return false;
  if (!Number.isFinite(a.lat) || !Number.isFinite(a.lon)) return false;
  if (/scolaire/i.test(a.reseau)) return false;
  return estEnFrance(a.lat, a.lon);
}

/**
 * Arrondit une position pour fusionner les arrêts très proches (souvent le même arrêt dans plusieurs réseaux).
 * 4 décimales ≈ 11 m en latitude, assez précis pour un seuil de 500 m.
 */
export function cleArret(lat: number, lon: number, decimales = 4): string {
  const f = 10 ** decimales;
  return `${Math.round(lat * f) / f};${Math.round(lon * f) / f}`;
}

/** Lit la position d'une gare SNCF : « 49.6852237, 1.7743058 ». */
export function lirePositionGare(texte: string): { lat: number; lon: number } | null {
  const [lat, lon] = texte.split(",").map((x) => Number(x.trim()));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !estEnFrance(lat, lon)) return null;
  return { lat, lon };
}
