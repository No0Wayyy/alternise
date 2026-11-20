// Récupère les offres dans Supabase, côté serveur, avec la clé publique (lecture seule).
import "server-only";
import { cacheLife } from "next/cache";
import { PAR_PAGE, parametresFiltres, parametresRpc, type Criteres } from "./recherche.ts";

export type Offre = {
  id: number;
  titre: string;
  entreprise: string | null;
  description: string | null;
  secteur: string;
  types_contrat: string[];
  niveau_diplome: string | null;
  debut_contrat: string | null;
  ville: string | null;
  code_postal: string | null;
  latitude: number | null;
  longitude: number | null;
  distance_km: number | null;
  url_postuler: string;
  source: "lba" | "france_travail" | "adzuna";
  origine: string | null;
  publiee_le: string | null;
  est_nouvelle: boolean;
  total: number;
};

export type Resultats = { offres: Offre[]; total: number; totalAutreOnglet: number };

/** Un point de la carte : [identifiant de l'offre, longitude, latitude]. */
export type PointCarte = [id: number, lon: number, lat: number];

/** Nombre maximum de points renvoyés par la base (les plus récents d'abord). */
export const POINTS_MAX = 5000;

async function appeler<T>(fonction: string, parametres: object): Promise<T> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !cle) throw new Error("Configuration Supabase manquante");
  const r = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/${fonction}`, {
    method: "POST",
    headers: { apikey: cle, "Content-Type": "application/json" },
    body: JSON.stringify(parametres),
  });
  if (!r.ok) throw new Error(`Recherche refusée (code ${r.status})`);
  return (await r.json()) as T;
}

/** Offres de l'onglet demandé, et nombre d'offres de l'autre onglet (entreprises / écoles). */
export async function rechercherOffres(c: Criteres): Promise<Resultats> {
  "use cache";
  cacheLife("minutes"); // les offres ne changent qu'une fois par heure

  const [offres, autre] = await Promise.all([
    appeler<Offre[]>("rechercher_offres", parametresRpc(c, PAR_PAGE)),
    appeler<Offre[]>("rechercher_offres", parametresRpc({ ...c, ecoles: !c.ecoles, page: 1 }, 1)),
  ]);
  return { offres, total: offres[0]?.total ?? 0, totalAutreOnglet: autre[0]?.total ?? 0 };
}

/** Tous les points de la carte pour ces critères (sans les descriptions : réponse légère). */
export async function pointsOffres(c: Criteres): Promise<PointCarte[]> {
  "use cache";
  cacheLife("minutes");
  return appeler<PointCarte[]>("points_offres", parametresFiltres(c));
}
