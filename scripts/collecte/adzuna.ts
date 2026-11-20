// Source n°3 : Adzuna (offres reprises d'autres sites d'emploi).
// Doc : https://developer.adzuna.com/docs/search
// Adzuna mélange alternance et emploi classique : le filtre ici est strict.
// Conditions d'Adzuna : afficher « Adzuna » avec un lien sur chaque offre venant d'eux.
import type { Secteur } from "../../src/lib/secteurs.ts";
import type { LigneOffre } from "./types.ts";
import {
  attendre,
  cleDoublon,
  couper,
  estAnnonceEcole,
  estHorsAlternance,
  estHorsSecteur,
  nettoyerTexte,
  parleAlternance,
  pointGps,
  secteurParMotsCles,
} from "./outils.ts";

const URL_RECHERCHE = "https://api.adzuna.com/v1/api/jobs/fr/search";

/** Partie d'une offre Adzuna dont on a besoin. */
export type OffreAdzuna = {
  id: string;
  title: string;
  description?: string | null;
  created?: string | null;
  redirect_url?: string | null;
  latitude?: number;
  longitude?: number;
  location?: { display_name?: string; area?: string[] } | null;
  company?: { display_name?: string } | null;
  category?: { tag?: string; label?: string } | null;
  contract_type?: string | null;
};

// Catégories Adzuna qui correspondent aux secteurs d'Alternise.
const CATEGORIES: Record<string, Secteur> = {
  "sales-jobs": "commerce",
  "retail-jobs": "commerce",
  "customer-services-jobs": "commerce",
  "hospitality-catering-jobs": "hotellerie_restauration",
  "pr-advertising-marketing-jobs": "marketing",
  "creative-design-jobs": "communication",
  "manufacturing-jobs": "industrie_maintenance",
  "maintenance-jobs": "industrie_maintenance",
};

function typesDeContrat(titre: string): string[] {
  const t = titre.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const types: string[] = [];
  if (/\b(contrat pro|professionnalisation)\b/.test(t)) types.push("professionnalisation");
  if (/\b(apprenti|apprentie|apprentissage)\b/.test(t)) types.push("apprentissage");
  return types.length ? types : ["alternance"]; // « alternance » : type pas précisé par l'annonce
}

function villeAdzuna(lieu: OffreAdzuna["location"]): string | null {
  const zones = lieu?.area ?? [];
  if (zones.length >= 4) return zones[zones.length - 1];
  return lieu?.display_name?.split(",")[0]?.trim() || null;
}

/** Transforme une offre Adzuna en ligne de la table « offres ». Renvoie null si ce n'est pas une offre pour Alternise. */
export function transformerOffreAdzuna(o: OffreAdzuna, vueLe: string): LigneOffre | null {
  const titre = nettoyerTexte(o.title)?.replace(/\s+/g, " ");
  const url = o.redirect_url?.trim();
  if (!titre || !url || !/^https?:\/\//i.test(url)) return null;

  // Alternance uniquement : le titre doit le dire, et ne pas annoncer un stage, un CDI, du freelance…
  if (!parleAlternance(titre) || estHorsAlternance(titre)) return null;

  // Secteur : d'abord les mots du titre, sinon la catégorie Adzuna (sauf métier clairement hors secteurs).
  const secteur = secteurParMotsCles(titre) ?? (estHorsSecteur(titre) ? null : (CATEGORIES[o.category?.tag ?? ""] ?? null));
  if (!secteur) return null;

  const entreprise = o.company?.display_name?.trim() || null;
  const description = nettoyerTexte(o.description);
  const position = typeof o.latitude === "number" && typeof o.longitude === "number" ? pointGps([o.longitude, o.latitude]) : null;

  return {
    source: "adzuna",
    source_id: String(o.id),
    origine: "Adzuna",
    titre: couper(titre, 300),
    entreprise: entreprise ? couper(entreprise, 300) : null,
    description: description ? couper(description, 2000) : null,
    secteur,
    rome_codes: [],
    types_contrat: typesDeContrat(titre),
    niveau_diplome: null,
    debut_contrat: null,
    ville: villeAdzuna(o.location),
    code_postal: null,
    position,
    url_postuler: url,
    publiee_le: o.created ?? null,
    expire_le: null,
    vue_le: vueLe,
    cle_doublon: cleDoublon(titre, entreprise),
    annonce_ecole: estAnnonceEcole(titre, entreprise),
  };
}

/** Une page de résultats Adzuna : offres dont le TITRE contient le mot-clé, publiées depuis moins de « jours ». */
export async function chercherOffresAdzuna(p: {
  appId: string;
  appKey: string;
  motCle: string;
  jours: number;
  page: number;
}): Promise<OffreAdzuna[]> {
  const q = new URLSearchParams({
    app_id: p.appId,
    app_key: p.appKey,
    title_only: p.motCle,
    max_days_old: String(p.jours),
    results_per_page: "50",
    sort_by: "date",
  });
  for (let essai = 1; essai <= 3; essai++) {
    const r = await fetch(`${URL_RECHERCHE}/${p.page}?${q}`, { headers: { Accept: "application/json" } });
    if (r.status === 429 || r.status >= 500) {
      await attendre(5000 * essai);
      continue;
    }
    if (!r.ok) throw new Error(`Adzuna « ${p.motCle} » page ${p.page} : code ${r.status}`);
    const json = (await r.json()) as { results?: OffreAdzuna[] };
    return json.results ?? [];
  }
  throw new Error(`Adzuna « ${p.motCle} » page ${p.page} : service indisponible après 3 essais`);
}
