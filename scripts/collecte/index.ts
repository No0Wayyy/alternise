// Collecte des offres d'alternance. Lancée chaque heure par GitHub Actions.
// Sur ton PC : npm run collecte
// Pour un essai rapide sur quelques métiers : COLLECTE_ROMES=G1602,E1112 npm run collecte
import { SECTEURS, type Secteur } from "../../src/lib/secteurs.ts";
import { chercherOffresLba, transformerOffreLba } from "./lba.ts";
import { baseOffres } from "./supabase.ts";
import { attendre } from "./outils.ts";
import type { LigneOffre } from "./types.ts";

const PAUSE_MS = 600; // moins de 2 appels par seconde : La Bonne Alternance refuse au-delà
const OUBLI_HEURES = 48; // une offre plus vue depuis 48 h est retirée
const ERREURS_MAX = 0.05; // au-delà de 5 % d'échecs, on ne supprime rien

function lireCle(nom: string): string {
  const valeur = process.env[nom]?.trim().replace(/^["']|["']$/g, "");
  if (!valeur) throw new Error(`Clé manquante : ${nom} (dans .env.local ou les secrets GitHub)`);
  return valeur;
}

async function main() {
  const jeton = lireCle("LBA_API_TOKEN");
  const base = baseOffres(lireCle("NEXT_PUBLIC_SUPABASE_URL"), lireCle("SUPABASE_SECRET_KEY"));

  const filtre = process.env.COLLECTE_ROMES?.split(",").map((c) => c.trim()).filter(Boolean);
  const vueLe = new Date().toISOString();
  const offres = new Map<string, LigneOffre>();
  let demandes = 0;
  let echecs = 0;
  let ignorees = 0;

  for (const [secteur, { nom, romes }] of Object.entries(SECTEURS) as [Secteur, (typeof SECTEURS)[Secteur]][]) {
    const aFaire = filtre ? romes.filter((r) => filtre.includes(r)) : romes;
    if (aFaire.length === 0) continue;
    const avant = offres.size;

    for (const rome of aFaire) {
      demandes++;
      try {
        for (const brute of await chercherOffresLba(rome, jeton)) {
          const ligne = transformerOffreLba(brute, secteur, vueLe);
          if (!ligne) {
            ignorees++;
            continue;
          }
          const deja = offres.get(ligne.source_id);
          if (deja) deja.rome_codes = [...new Set([...deja.rome_codes, ...ligne.rome_codes])];
          else offres.set(ligne.source_id, ligne);
        }
      } catch (e) {
        echecs++;
        console.warn(`  ⚠️ ${(e as Error).message}`);
      }
      await attendre(PAUSE_MS);
    }
    console.log(`${nom} : ${aFaire.length} métiers, ${offres.size - avant} nouvelles offres`);
  }

  const lignes = [...offres.values()];
  await base.enregistrer(lignes);
  console.log(`✅ ${lignes.length} offres enregistrées (${ignorees} ignorées : hors alternance, expirées, sans lien ou sans titre)`);

  const expirees = await base.supprimer(`expire_le=lt.${encodeURIComponent(vueLe)}`);
  console.log(`🗑️ ${expirees} offres expirées supprimées`);

  const tauxEchec = demandes ? echecs / demandes : 0;
  if (filtre) {
    console.log("Essai partiel (COLLECTE_ROMES) : pas de suppression des offres disparues.");
  } else if (tauxEchec > ERREURS_MAX) {
    console.warn(`⚠️ ${echecs}/${demandes} demandes en échec : aucune offre disparue supprimée par prudence.`);
    process.exitCode = 1;
  } else {
    const limite = new Date(Date.parse(vueLe) - OUBLI_HEURES * 3600_000).toISOString();
    const disparues = await base.supprimer(`source=eq.lba&vue_le=lt.${encodeURIComponent(limite)}`);
    console.log(`🗑️ ${disparues} offres disparues depuis ${OUBLI_HEURES} h supprimées`);
  }
  console.log(`Fin : ${demandes} demandes, ${echecs} échecs.`);
}

main().catch((e) => {
  console.error(`❌ ${(e as Error).message}`);
  process.exit(1);
});
