// Source n°1 : La Bonne Alternance (API Apprentissage de l'État).
// Doc : https://api.apprentissage.beta.gouv.fr/fr/explorer/recherche-offre
import type { Secteur } from "../../src/lib/secteurs.ts";
import type { LigneOffre } from "./types.ts";
import {
  attendre,
  cleDoublon,
  couper,
  estAnnonceEcole,
  estHorsAlternance,
  lireAdresse,
  nettoyerTexte,
  pointGps,
  secteurDuRome,
} from "./outils.ts";

const URL_RECHERCHE = "https://api.apprentissage.beta.gouv.fr/api/job/v1/search";

/** Partie d'une offre La Bonne Alternance dont on a besoin. */
export type OffreLba = {
  identifier: { id: string; partner_label?: string | null; partner_job_id?: string | null };
  workplace: {
    siret?: string | null;
    brand?: string | null;
    legal_name?: string | null;
    name?: string | null;
    location?: { address?: string | null; geopoint?: { type?: string; coordinates?: number[] } | null } | null;
  };
  apply: { url?: string | null; phone?: string | null; recipient_id?: string | null };
  contract?: { start?: string | null; type?: string[] | null } | null;
  offer: {
    title: string;
    rome_codes?: string[] | null;
    description?: string | null;
    target_diploma?: { european?: string | null; label?: string | null } | null;
    publication: { creation?: string | null; expiration?: string | null };
  };
  is_delegated?: boolean | null;
};

const CONTRATS: Record<string, string> = {
  apprentissage: "apprentissage",
  professionnalisation: "professionnalisation",
};

/** Transforme une offre LBA en ligne de la table « offres ». Renvoie null si l'offre est inutilisable. */
export function transformerOffreLba(o: OffreLba, secteurDemande: Secteur, vueLe: string): LigneOffre | null {
  const titre = nettoyerTexte(o.offer.title)?.replace(/\s+/g, " ");
  const url = o.apply.url?.trim();
  if (!titre || !url || !/^https?:\/\//i.test(url)) return null;

  const expiration = o.offer.publication.expiration ?? null;
  if (expiration && new Date(expiration) < new Date(vueLe)) return null;

  // Alternance uniquement : il faut un contrat d'apprentissage ou de professionnalisation,
  // et pas un titre de stage, CDI, CDD, intérim ou job saisonnier.
  const types = (o.contract?.type ?? []).map((t) => CONTRATS[t.toLowerCase()]).filter(Boolean);
  if (types.length === 0 || estHorsAlternance(titre)) return null;

  const romes = o.offer.rome_codes ?? [];
  const secteur = romes.map(secteurDuRome).find((s) => s !== null) ?? secteurDemande;
  const entreprise = (o.workplace.brand || o.workplace.name || o.workplace.legal_name)?.trim() || null;
  const { code_postal, ville } = lireAdresse(o.workplace.location?.address);
  const description = nettoyerTexte(o.offer.description);

  return {
    source: "lba",
    source_id: o.identifier.id,
    origine: o.identifier.partner_label === "offres_emploi_lba" ? "La Bonne Alternance" : (o.identifier.partner_label ?? null),
    titre: couper(titre, 300),
    entreprise: entreprise ? couper(entreprise, 300) : null,
    description: description ? couper(description, 2000) : null,
    secteur,
    rome_codes: romes,
    types_contrat: [...new Set(types)],
    niveau_diplome: o.offer.target_diploma?.label ?? null,
    debut_contrat: o.contract?.start?.slice(0, 10) ?? null,
    ville,
    code_postal,
    position: pointGps(o.workplace.location?.geopoint?.coordinates),
    url_postuler: url,
    publiee_le: o.offer.publication.creation ?? null,
    expire_le: expiration,
    vue_le: vueLe,
    cle_doublon: cleDoublon(titre, entreprise),
    // is_delegated : offre déposée par un organisme de formation (doc LBA).
    annonce_ecole: o.is_delegated === true || estAnnonceEcole(titre, entreprise),
  };
}

/** Demande à LBA les offres d'un code ROME, partout en France. Réessaie si le service dit « trop vite » (429). */
export async function chercherOffresLba(rome: string, jeton: string): Promise<OffreLba[]> {
  for (let essai = 1; essai <= 4; essai++) {
    const r = await fetch(`${URL_RECHERCHE}?romes=${encodeURIComponent(rome)}`, {
      headers: { Authorization: `Bearer ${jeton}` },
    });
    if (r.status === 429 || r.status >= 500) {
      await attendre(2000 * essai);
      continue;
    }
    if (!r.ok) throw new Error(`LBA ${rome} : code ${r.status}`);
    const json = (await r.json()) as { jobs?: OffreLba[] };
    return json.jobs ?? [];
  }
  throw new Error(`LBA ${rome} : service saturé après 4 essais`);
}
