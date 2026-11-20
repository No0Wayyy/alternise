// Suivi des candidatures : les offres gardées par l'étudiant et où il en est.
// Tout reste dans son navigateur (localStorage) : pas de compte, rien n'est envoyé (RGPD).
// Ce fichier ne contient que de la logique pure (testée) ; le lien avec le navigateur est dans useSuivi.ts.

export const STATUTS = {
  a_postuler: { nom: "À postuler", court: "À postuler" },
  envoyee: { nom: "Candidature envoyée", court: "Envoyée" },
  relancee: { nom: "Relance faite", court: "Relancée" },
  entretien: { nom: "Entretien prévu", court: "Entretien" },
  terminee: { nom: "Terminé (réponse reçue)", court: "Terminé" },
} as const;
export type Statut = keyof typeof STATUTS;

/** Ce qu'on garde d'une offre : assez pour l'afficher même si elle disparaît du site. */
export type OffreGardee = {
  id: number;
  titre: string;
  entreprise: string | null;
  ville: string | null;
  url: string;
};

export type Entree = OffreGardee & {
  statut: Statut;
  gardee_le: string; // date ISO
  maj_le: string; // date ISO du dernier changement de statut
};

export type Suivi = Record<string, Entree>;

export const SUIVI_VIDE: Suivi = Object.freeze({}) as Suivi;
export const ENTREES_MAX = 300;
export const RELANCE_JOURS = 7;

const texte = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : null);
const estDate = (v: unknown): v is string => typeof v === "string" && !Number.isNaN(Date.parse(v));

/** Lit le suivi enregistré. Ignore tout ce qui est abîmé ou bizarre (le navigateur peut contenir n'importe quoi). */
export function lireSuivi(brut: string | null): Suivi {
  if (!brut) return SUIVI_VIDE;
  let donnees: unknown;
  try {
    donnees = JSON.parse(brut);
  } catch {
    return SUIVI_VIDE;
  }
  if (!donnees || typeof donnees !== "object" || Array.isArray(donnees)) return SUIVI_VIDE;
  const suivi: Suivi = {};
  for (const e of Object.values(donnees as Record<string, unknown>).slice(0, ENTREES_MAX)) {
    if (!e || typeof e !== "object") continue;
    const x = e as Record<string, unknown>;
    const id = Number(x.id);
    const titre = texte(x.titre, 300);
    const url = texte(x.url, 2000);
    if (!Number.isInteger(id) || id <= 0 || !titre || !url || !/^https?:\/\//i.test(url)) continue;
    if (typeof x.statut !== "string" || !(x.statut in STATUTS)) continue;
    if (!estDate(x.gardee_le) || !estDate(x.maj_le)) continue;
    suivi[id] = {
      id,
      titre,
      entreprise: texte(x.entreprise, 200),
      ville: texte(x.ville, 120),
      url,
      statut: x.statut as Statut,
      gardee_le: x.gardee_le,
      maj_le: x.maj_le,
    };
  }
  return suivi;
}

/** Garde une offre (statut « À postuler »), ou change son statut si elle est déjà gardée. */
export function mettreStatut(s: Suivi, offre: OffreGardee, statut: Statut, maintenant = new Date()): Suivi {
  const date = maintenant.toISOString();
  const avant = s[offre.id];
  if (!avant && Object.keys(s).length >= ENTREES_MAX) return s; // liste pleine
  return {
    ...s,
    [offre.id]: {
      id: offre.id,
      titre: offre.titre.slice(0, 300),
      entreprise: offre.entreprise?.slice(0, 200) ?? null,
      ville: offre.ville?.slice(0, 120) ?? null,
      url: offre.url,
      statut,
      gardee_le: avant?.gardee_le ?? date,
      maj_le: avant && avant.statut === statut ? avant.maj_le : date,
    },
  };
}

export function retirer(s: Suivi, id: number): Suivi {
  if (!(id in s)) return s;
  const copie = { ...s };
  delete copie[id];
  return copie;
}

/** Nombre de jours entiers depuis une date. */
export function joursDepuis(date: string, maintenant = new Date()): number {
  return Math.max(0, Math.floor((maintenant.getTime() - Date.parse(date)) / 86_400_000));
}

/** Vrai si la candidature a été envoyée (ou relancée) il y a 7 jours ou plus, sans nouvelle depuis. */
export function aRelancer(e: Entree, maintenant = new Date()): boolean {
  return (e.statut === "envoyee" || e.statut === "relancee") && joursDepuis(e.maj_le, maintenant) >= RELANCE_JOURS;
}

/** Les entrées rangées par statut, les plus récemment changées d'abord. */
export function parStatut(s: Suivi): Record<Statut, Entree[]> {
  const groupes = Object.fromEntries(Object.keys(STATUTS).map((k) => [k, [] as Entree[]])) as Record<Statut, Entree[]>;
  for (const e of Object.values(s)) groupes[e.statut].push(e);
  for (const liste of Object.values(groupes)) liste.sort((a, b) => b.maj_le.localeCompare(a.maj_le));
  return groupes;
}
