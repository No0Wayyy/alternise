// Petites fonctions de nettoyage, communes à toutes les sources d'offres.
import { SECTEURS, type Secteur } from "../../src/lib/secteurs.ts";

/** Minuscules, sans accents ni ponctuation : sert à comparer deux textes. */
export function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Clé qui repère une même offre vue sur plusieurs sources : titre + entreprise + code postal. */
export function cleDoublon(titre: string, entreprise: string | null, codePostal: string | null): string {
  return `${normaliser(titre)}|${normaliser(entreprise ?? "")}|${codePostal ?? ""}`;
}

/** Coupe un texte trop long à la fin d'un mot, avec « … ». */
export function couper(texte: string, max: number): string {
  if (texte.length <= max) return texte;
  const debut = texte.slice(0, max - 1);
  const dernierEspace = debut.lastIndexOf(" ");
  return (dernierEspace > max / 2 ? debut.slice(0, dernierEspace) : debut).trimEnd() + "…";
}

const ENTITES: Record<string, string> = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'" };

/** Enlève le HTML et les espaces en trop, garde les paragraphes. */
export function nettoyerTexte(texte: string | null | undefined): string | null {
  if (!texte) return null;
  const propre = texte
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*(p|div|li|h\d)\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&[a-z#0-9]+;/gi, (e) => ENTITES[e.toLowerCase()] ?? " ")
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return propre || null;
}

/** Met une majuscule à chaque mot : « LACANAU OCEAN » → « Lacanau Ocean ». */
function joliNom(texte: string): string {
  return texte.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, sep: string, l: string) => sep + l.toUpperCase());
}

/** Trouve le code postal et la ville à la fin d'une adresse. */
export function lireAdresse(adresse: string | null | undefined): { code_postal: string | null; ville: string | null } {
  const m = adresse?.match(/\b(\d{5})\s+([^,]+?)\s*$/);
  if (!m) return { code_postal: adresse?.match(/\b\d{5}\b/)?.[0] ?? null, ville: null };
  return { code_postal: m[1], ville: joliNom(m[2]) };
}

/** Point GPS au format attendu par PostGIS, ou null s'il est invalide. */
export function pointGps(coords: unknown): string | null {
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const [lon, lat] = coords;
  if (typeof lon !== "number" || typeof lat !== "number") return null;
  if (Math.abs(lon) > 180 || Math.abs(lat) > 90) return null;
  return `SRID=4326;POINT(${lon} ${lat})`;
}

const MOTS_ALTERNANCE = /\b(alternance|alternant|alternante|apprenti|apprentie|apprentissage|contrat pro|professionnalisation)\b/;
const MOTS_HORS_ALTERNANCE = [
  /^\W*stage\b/, // « Stage - … », « Stage en cuisine »
  /\b(offre de|en) stage\b/,
  /\bstage\s*[-–:|(]/,
  /\bstagiaire\b/,
  /\b(cdi|cdd|interim|interimaire|saisonnier|saisonniere)\b/,
  /\bjobs? d.ete\b/,
];

/**
 * Vrai si le titre annonce un stage, un CDI, un CDD, de l'intérim ou un job saisonnier.
 * Alternise ne montre que de l'alternance. Un titre qui parle aussi d'alternance est gardé.
 */
export function estHorsAlternance(titre: string): boolean {
  const t = titre.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  if (MOTS_ALTERNANCE.test(t)) return false;
  return MOTS_HORS_ALTERNANCE.some((motif) => motif.test(t));
}

/** Retrouve le secteur Alternise d'un code ROME. */
export function secteurDuRome(code: string): Secteur | null {
  for (const [secteur, { romes }] of Object.entries(SECTEURS)) {
    if ((romes as readonly string[]).includes(code)) return secteur as Secteur;
  }
  return null;
}

export const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));
