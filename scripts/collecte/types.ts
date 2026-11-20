// Forme d'une ligne de la table « offres » (voir supabase/migrations).
import type { Secteur } from "../../src/lib/secteurs.ts";

export type LigneOffre = {
  source: "lba" | "france_travail" | "adzuna";
  source_id: string;
  origine: string | null;
  titre: string;
  entreprise: string | null;
  description: string | null;
  secteur: Secteur;
  rome_codes: string[];
  types_contrat: string[];
  niveau_diplome: string | null;
  debut_contrat: string | null;
  ville: string | null;
  code_postal: string | null;
  position: string | null;
  url_postuler: string;
  publiee_le: string | null;
  expire_le: string | null;
  vue_le: string;
  cle_doublon: string;
};
