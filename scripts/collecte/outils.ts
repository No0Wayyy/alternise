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

/**
 * Clé qui repère une même offre vue sur plusieurs sources : titre + entreprise,
 * sans les mentions H/F. La base compare ensuite les lieux (moins de 5 km).
 */
export function cleDoublon(titre: string, entreprise: string | null): string {
  const t = normaliser(titre).replace(/\b(h|f|x|nb)\b/g, " ").replace(/\s+/g, " ").trim();
  return `${t}|${normaliser(entreprise ?? "")}`;
}

/** Texte en minuscules sans accents, ponctuation gardée (pour les motifs ci-dessous). */
function simplifier(texte: string): string {
  return texte.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
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
// Toujours hors alternance, même si le mot « alternance » apparaît (« hors stage et alternance »).
const TOUJOURS_HORS = [/\bhors\b.*\b(stage|alternance)\b/, /\bfreelance\b/];
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
  const t = simplifier(titre);
  if (TOUJOURS_HORS.some((motif) => motif.test(t))) return true;
  if (MOTS_ALTERNANCE.test(t)) return false;
  return MOTS_HORS_ALTERNANCE.some((motif) => motif.test(t));
}

/** Vrai si le titre dit clairement qu'il s'agit d'alternance (obligatoire pour Adzuna, qui mélange tout). */
export function parleAlternance(titre: string): boolean {
  return MOTS_ALTERNANCE.test(simplifier(titre));
}

const ECOLE_TITRE = [
  /^\W*(bts|bachelor|master|mba|licence|but|titre (pro|rncp)|cqp|bac pro|formation)\b/, // « BTS MCO en alternance… »
  /\ben (licence|bts|bachelor|master|but|mba)\b/,
  /\bformation (en alternance|remuneree|diplomante|gratuite|qualifiante)\b/,
  /\b(devenez|rentree|admissions? ouvertes?|inscriptions? ouvertes?)\b/,
];
const ECOLE_ENTREPRISE =
  /\b(cfa|ecole|school|campus|formations?|institut|academy|academie|afpa|iscod|ifcdis|studi|ifocop|universite|iut|lycee|greta)\b/;

/** Vrai si l'annonce vient d'une école, d'un CFA ou d'un organisme de formation qui recrute des élèves. */
export function estAnnonceEcole(titre: string, entreprise: string | null): boolean {
  const t = simplifier(titre);
  return ECOLE_TITRE.some((motif) => motif.test(t)) || ECOLE_ENTREPRISE.test(simplifier(entreprise ?? ""));
}

const MOTS_SECTEURS: [Secteur, RegExp][] = [
  [
    "communication",
    /\b(communication|community|social media|evenementiel|evenementielle|graphiste|graphisme|infographiste|pao|redacteur|redactrice|content|contenus?|relations? presse|attachee? de presse|publicite|publicitaire|medias?|webdesigner|web designer|motion designer?|brand)\b/,
  ],
  [
    "marketing",
    /\b(marketing|chef de produit|cheffe de produit|product manager|trade|etudes? de marche|category manager|growth|seo|sea|acquisition)\b/,
  ],
];
// Hors des secteurs d'Alternise : informatique, santé, social, aide à la personne, animation, BTP, finance, RH, droit, tourisme.
const HORS_SECTEURS =
  /\b(informatique|developpeur|developpeuse|data|reseaux?|cyber|devops|tourisme|aide.soignante?|infirmiere?|educat\w*|aes|accompagnante?|auxiliaire|aide a domicile|petite enfance|puericult\w*|animatrice|animateur|periscolaire|bpjeps|ambulanci\w*|pharmacie|sante|social|batiment|plombier|chauffagiste|macon|comptab\w*|paie|ressources humaines|rh|juriste|juridique)\b/;
const MOTS_SECTEURS_SUITE: [Secteur, RegExp][] = [
  // Métiers de bouche : rangés dans le commerce (comme dans le ROME).
  ["commerce", /\b(bouchere?|boulangere?|patissiere?|charcutiere?|poissonniere?|fromagere?|primeur|traiteur)\b/],
  [
    "hotellerie_restauration",
    /\b(cuisiniere?|cuisine|commis|serveur|serveuse|barman|barmaid|restaurant|restauration|hotellerie|hotel|receptionniste|plongeur|chef de rang|maitre d.hotel|gouvernante?|femme de chambre|valet)\b/,
  ],
  [
    "commerce",
    /\b(vendeur|vendeuse|vente|commercial|commerciale|caissiere?|magasin|boutique|retail|e.?commerce|business developer|developpement commercial|charge.? d.affaires|chef de rayon|chef de secteur|merchandiser|fleuriste|opticien|opticienne|relation client|service client|teleconseill\w*)\b/,
  ],
  [
    "industrie_maintenance",
    /\b(maintenance|techniciens?|technicienne|electrotechni\w*|electromecani\w*|mecanicien|mecanicienne|mecanique|usinage|usineur|tourneur|fraiseur|soudeur|soudeuse|chaudronn\w*|production|operateur|operatrice|conducteur de ligne|pilote de ligne|automaticien|automatisme|industriel|industrielle|industrie|methodes|frigoriste|plasturgie)\b/,
  ],
];

/** Range un titre d'offre dans un secteur d'Alternise grâce à ses mots. Renvoie null si aucun ne colle. */
export function secteurParMotsCles(titre: string): Secteur | null {
  const t = simplifier(titre);
  for (const [secteur, motif] of MOTS_SECTEURS) if (motif.test(t)) return secteur;
  if (HORS_SECTEURS.test(t)) return null;
  for (const [secteur, motif] of MOTS_SECTEURS_SUITE) if (motif.test(t)) return secteur;
  return null;
}

/** Vrai si le titre appartient clairement à un secteur qu'Alternise ne couvre pas. */
export function estHorsSecteur(titre: string): boolean {
  return secteurParMotsCles(titre) === null && HORS_SECTEURS.test(simplifier(titre));
}

/** Retrouve le secteur Alternise d'un code ROME. */
export function secteurDuRome(code: string): Secteur | null {
  for (const [secteur, { romes }] of Object.entries(SECTEURS)) {
    if ((romes as readonly string[]).includes(code)) return secteur as Secteur;
  }
  return null;
}

export const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));
