// Collecte des offres d'alternance. Lancée chaque heure par GitHub Actions.
// Sur ton PC : npm run collecte
// Réglages (facultatifs) :
//   COLLECTE_SOURCES=lba,adzuna   sources à interroger (par défaut : toutes celles qui ont leurs clés)
//   COLLECTE_ROMES=G1602,E1112    essai rapide sur quelques métiers LBA
//   ADZUNA_JOURS=2                âge maximum des offres Adzuna demandées
//   ADZUNA_PAGES_MAX=10           nombre maximum d'appels Adzuna par collecte (quota gratuit)
import { SECTEURS, type Secteur } from "../../src/lib/secteurs.ts";
import { chercherOffresLba, transformerOffreLba } from "./lba.ts";
import { chercherOffresAdzuna, transformerOffreAdzuna } from "./adzuna.ts";
import { baseOffres } from "./supabase.ts";
import { attendre } from "./outils.ts";
import type { LigneOffre } from "./types.ts";

const LBA_PAUSE_MS = 600; // moins de 2 appels par seconde : La Bonne Alternance refuse au-delà
const ADZUNA_PAUSE_MS = 2500;
const ADZUNA_MOTS = ["alternance", "alternant", "alternante", "apprenti", "apprentie", "apprentissage", "professionnalisation"];
const OUBLI_HEURES = 48; // une offre LBA plus vue depuis 48 h est retirée
const ADZUNA_AGE_MAX_JOURS = 45; // une offre Adzuna plus vieille que 45 jours est retirée
const ERREURS_MAX = 0.05; // au-delà de 5 % d'échecs, on ne supprime pas les offres disparues

type Bilan = { lignes: LigneOffre[]; demandes: number; echecs: number; ignorees: number };

function lireCle(nom: string, obligatoire = true): string {
  const valeur = process.env[nom]?.trim().replace(/^["']|["']$/g, "") ?? "";
  if (!valeur && obligatoire) throw new Error(`Clé manquante : ${nom} (dans .env.local ou les secrets GitHub)`);
  return valeur;
}

function liste(nom: string): string[] | null {
  const v = process.env[nom]?.split(",").map((c) => c.trim()).filter(Boolean);
  return v?.length ? v : null;
}

async function collecterLba(jeton: string, vueLe: string, romesFiltre: string[] | null): Promise<Bilan> {
  const offres = new Map<string, LigneOffre>();
  const bilan: Bilan = { lignes: [], demandes: 0, echecs: 0, ignorees: 0 };

  for (const [secteur, { nom, romes }] of Object.entries(SECTEURS) as [Secteur, (typeof SECTEURS)[Secteur]][]) {
    const aFaire = romesFiltre ? romes.filter((r) => romesFiltre.includes(r)) : romes;
    if (aFaire.length === 0) continue;
    const avant = offres.size;
    for (const rome of aFaire) {
      bilan.demandes++;
      try {
        for (const brute of await chercherOffresLba(rome, jeton)) {
          const ligne = transformerOffreLba(brute, secteur, vueLe);
          if (!ligne) {
            bilan.ignorees++;
            continue;
          }
          const deja = offres.get(ligne.source_id);
          if (deja) deja.rome_codes = [...new Set([...deja.rome_codes, ...ligne.rome_codes])];
          else offres.set(ligne.source_id, ligne);
        }
      } catch (e) {
        bilan.echecs++;
        console.warn(`  ⚠️ ${(e as Error).message}`);
      }
      await attendre(LBA_PAUSE_MS);
    }
    console.log(`  ${nom} : ${aFaire.length} métiers, ${offres.size - avant} offres`);
  }
  bilan.lignes = [...offres.values()];
  return bilan;
}

async function collecterAdzuna(appId: string, appKey: string, vueLe: string): Promise<Bilan> {
  const jours = Number(process.env.ADZUNA_JOURS ?? 2);
  let appelsRestants = Number(process.env.ADZUNA_PAGES_MAX ?? 10);
  const offres = new Map<string, LigneOffre>();
  const bilan: Bilan = { lignes: [], demandes: 0, echecs: 0, ignorees: 0 };

  for (const motCle of ADZUNA_MOTS) {
    for (let page = 1; appelsRestants > 0; page++) {
      appelsRestants--;
      bilan.demandes++;
      let resultats;
      try {
        resultats = await chercherOffresAdzuna({ appId, appKey, motCle, jours, page });
      } catch (e) {
        bilan.echecs++;
        console.warn(`  ⚠️ ${(e as Error).message}`);
        break;
      }
      for (const brute of resultats) {
        const ligne = transformerOffreAdzuna(brute, vueLe);
        if (ligne) offres.set(ligne.source_id, ligne);
        else bilan.ignorees++;
      }
      await attendre(ADZUNA_PAUSE_MS);
      if (resultats.length < 50) break; // dernière page
    }
  }
  if (appelsRestants <= 0) console.log("  (limite d'appels Adzuna atteinte pour cette collecte)");
  bilan.lignes = [...offres.values()];
  return bilan;
}

async function main() {
  const base = baseOffres(lireCle("NEXT_PUBLIC_SUPABASE_URL"), lireCle("SUPABASE_SECRET_KEY"));
  const sources = liste("COLLECTE_SOURCES");
  const romesFiltre = liste("COLLECTE_ROMES");
  const veut = (s: string) => !sources || sources.includes(s);
  const vueLe = new Date().toISOString();
  let lbaFiable = false;
  let echecSource = false;

  // 1. La Bonne Alternance
  if (veut("lba")) {
    console.log("La Bonne Alternance :");
    try {
      const b = await collecterLba(lireCle("LBA_API_TOKEN"), vueLe, romesFiltre);
      await base.enregistrer(b.lignes);
      console.log(`✅ ${b.lignes.length} offres enregistrées (${b.ignorees} ignorées : hors alternance, expirées, sans lien ou sans titre)`);
      lbaFiable = !romesFiltre && b.demandes > 0 && b.echecs / b.demandes <= ERREURS_MAX;
      if (b.demandes && b.echecs / b.demandes > ERREURS_MAX) echecSource = true;
    } catch (e) {
      echecSource = true;
      console.error(`❌ La Bonne Alternance : ${(e as Error).message}`);
    }
  }

  // 2. Adzuna
  const adzunaId = lireCle("ADZUNA_APP_ID", false);
  const adzunaCle = lireCle("ADZUNA_APP_KEY", false);
  if (veut("adzuna") && adzunaId && adzunaCle) {
    console.log("Adzuna :");
    try {
      const b = await collecterAdzuna(adzunaId, adzunaCle, vueLe);
      await base.enregistrer(b.lignes);
      console.log(`✅ ${b.lignes.length} offres enregistrées (${b.ignorees} ignorées : hors alternance ou hors secteurs) en ${b.demandes} appels`);
      if (b.echecs) echecSource = true;
    } catch (e) {
      echecSource = true;
      console.error(`❌ Adzuna : ${(e as Error).message}`);
    }
  }

  // 3. Ménage
  const expirees = await base.supprimer(`expire_le=lt.${encodeURIComponent(vueLe)}`);
  console.log(`🗑️ ${expirees} offres expirées supprimées`);
  if (lbaFiable) {
    const limite = new Date(Date.parse(vueLe) - OUBLI_HEURES * 3600_000).toISOString();
    const disparues = await base.supprimer(`source=eq.lba&vue_le=lt.${encodeURIComponent(limite)}`);
    console.log(`🗑️ ${disparues} offres LBA disparues depuis ${OUBLI_HEURES} h supprimées`);
  } else {
    console.log("Offres LBA disparues : pas de suppression (collecte partielle ou trop d'échecs).");
  }
  const vieilles = new Date(Date.parse(vueLe) - ADZUNA_AGE_MAX_JOURS * 86400_000).toISOString();
  const anciennes = await base.supprimer(`source=eq.adzuna&publiee_le=lt.${encodeURIComponent(vieilles)}`);
  console.log(`🗑️ ${anciennes} offres Adzuna de plus de ${ADZUNA_AGE_MAX_JOURS} jours supprimées`);

  // 4. Doublons
  const doublons = await base.marquerDoublons();
  console.log(`🔗 Doublons : ${doublons} offres mises à jour`);

  if (echecSource) process.exitCode = 1;
}

main().catch((e) => {
  console.error(`❌ ${(e as Error).message}`);
  process.exit(1);
});
