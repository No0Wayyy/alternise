// Écrit dans la table « offres » avec la clé secrète (jamais utilisée dans le navigateur).
import type { LigneOffre } from "./types.ts";

export function baseOffres(urlProjet: string, cleSecrete: string) {
  const url = `${urlProjet.replace(/\/$/, "")}/rest/v1/offres`;
  const entetes = { apikey: cleSecrete, "Content-Type": "application/json" };

  return {
    /** Ajoute les nouvelles offres et met à jour celles déjà connues (même source + même numéro). */
    async enregistrer(lignes: LigneOffre[], parPaquet = 500): Promise<void> {
      for (let i = 0; i < lignes.length; i += parPaquet) {
        const paquet = lignes.slice(i, i + parPaquet);
        const r = await fetch(`${url}?on_conflict=source,source_id`, {
          method: "POST",
          headers: { ...entetes, Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify(paquet),
        });
        if (!r.ok) throw new Error(`Supabase : enregistrement refusé, code ${r.status} : ${(await r.text()).slice(0, 300)}`);
      }
    },

    /** Lance la fusion des doublons dans la base (fonction SQL marquer_doublons). */
    async marquerDoublons(): Promise<number> {
      const r = await fetch(`${urlProjet.replace(/\/$/, "")}/rest/v1/rpc/marquer_doublons`, {
        method: "POST",
        headers: entetes,
        body: "{}",
      });
      if (!r.ok) throw new Error(`Supabase : fusion des doublons refusée, code ${r.status} : ${(await r.text()).slice(0, 300)}`);
      return Number(await r.json());
    },

    /** Supprime les offres qui correspondent au filtre, et dit combien. */
    async supprimer(filtre: string): Promise<number> {
      const r = await fetch(`${url}?${filtre}`, {
        method: "DELETE",
        headers: { ...entetes, Prefer: "return=minimal,count=exact" },
      });
      if (!r.ok) throw new Error(`Supabase : suppression refusée, code ${r.status} : ${(await r.text()).slice(0, 300)}`);
      return Number(r.headers.get("content-range")?.split("/")[1] ?? 0);
    },
  };
}
