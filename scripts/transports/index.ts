// Charge les arrêts de transport et les gares SNCF dans la base, puis calcule l'accès de chaque offre.
// Lancé une fois par mois par GitHub Actions (les fichiers officiels changent rarement).
// Sur ton PC : npm run transports
// Réglages (facultatifs) :
//   TRANSPORTS_FICHIER_ARRETS=chemin/arrets.csv   utiliser un fichier déjà téléchargé (le fichier national pèse ~440 Mo)
//   TRANSPORTS_ESSAI=1                             tout lire et compter, sans rien écrire dans la base
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { baseOffres } from "../collecte/supabase.ts";
import { cleArret, garderArret, lireLigneCsv, lirePositionGare } from "./outils.ts";

// Jeux de données sur data.gouv.fr. On demande l'adresse du dernier fichier à chaque fois (elle change à chaque mise à jour).
const JEU_ARRETS = "arrets-de-transport-en-france"; // transport.data.gouv.fr, Licence Ouverte
const JEU_GARES = "gares-de-voyageurs-1"; // SNCF, licence ODbL
const PAR_PAQUET = 5000;

function lireCle(nom: string): string {
  const valeur = process.env[nom]?.trim().replace(/^["']|["']$/g, "") ?? "";
  if (!valeur) throw new Error(`Clé manquante : ${nom} (dans .env.local ou les secrets GitHub)`);
  return valeur;
}

/** Adresse du fichier CSV le plus récent d'un jeu de données data.gouv.fr. */
async function adresseDuCsv(jeu: string): Promise<string> {
  const r = await fetch(`https://www.data.gouv.fr/api/1/datasets/${jeu}/`);
  if (!r.ok) throw new Error(`data.gouv.fr : jeu ${jeu} introuvable (code ${r.status})`);
  const { resources } = (await r.json()) as { resources: { format: string; url: string }[] };
  const csv = resources.find((x) => x.format?.toLowerCase() === "csv");
  if (!csv) throw new Error(`data.gouv.fr : pas de fichier CSV dans ${jeu}`);
  return csv.url;
}

/** Lit un fichier (local ou en ligne) ligne par ligne, sans le garder en mémoire. */
async function* lignes(source: string): AsyncGenerator<string> {
  let flux: NodeJS.ReadableStream;
  if (/^https?:\/\//.test(source)) {
    const r = await fetch(source);
    if (!r.ok || !r.body) throw new Error(`Téléchargement refusé (code ${r.status}) : ${source}`);
    flux = Readable.fromWeb(r.body as never);
  } else {
    flux = createReadStream(source);
  }
  yield* createInterface({ input: flux, crlfDelay: Infinity });
}

const sansBom = (texte: string) => texte.replace(/^﻿/, "");

async function lireArrets(source: string): Promise<{ positions: { lat: number; lon: number }[]; lues: number }> {
  const vues = new Set<string>();
  const positions: { lat: number; lon: number }[] = [];
  let colonnes: Record<string, number> | null = null;
  let lues = 0;
  for await (const ligne of lignes(source)) {
    const champs = lireLigneCsv(sansBom(ligne));
    if (!colonnes) {
      colonnes = Object.fromEntries(champs.map((nom, i) => [nom.trim(), i]));
      for (const nom of ["dataset_custom_title", "stop_lat", "stop_lon", "location_type"]) {
        if (!(nom in colonnes)) throw new Error(`Fichier des arrêts : colonne ${nom} absente`);
      }
      continue;
    }
    lues++;
    const arret = {
      reseau: `${champs[colonnes.dataset_custom_title]} ${champs[colonnes.resource_title] ?? ""}`,
      typeLieu: (champs[colonnes.location_type] ?? "").trim(),
      lat: Number(champs[colonnes.stop_lat]),
      lon: Number(champs[colonnes.stop_lon]),
    };
    if (!garderArret(arret)) continue;
    const cle = cleArret(arret.lat, arret.lon);
    if (vues.has(cle)) continue;
    vues.add(cle);
    const [lat, lon] = cle.split(";").map(Number);
    positions.push({ lat, lon });
  }
  return { positions, lues };
}

async function lireGares(source: string): Promise<{ nom: string; lat: number; lon: number }[]> {
  const gares: { nom: string; lat: number; lon: number }[] = [];
  let colonnes: Record<string, number> | null = null;
  for await (const ligne of lignes(source)) {
    const champs = lireLigneCsv(sansBom(ligne), ";");
    if (!colonnes) {
      colonnes = Object.fromEntries(champs.map((nom, i) => [nom.trim(), i]));
      for (const nom of ["Nom_Gare", "Position géographique"]) {
        if (!(nom in colonnes)) throw new Error(`Fichier des gares : colonne ${nom} absente`);
      }
      continue;
    }
    const position = lirePositionGare(champs[colonnes["Position géographique"]] ?? "");
    const nom = champs[colonnes.Nom_Gare]?.trim();
    if (position && nom) gares.push({ nom: nom.slice(0, 200), ...position });
  }
  return gares;
}

/** Remplace tout le contenu d'une table (arrets ou gares) par de nouvelles lignes. */
async function remplacer(urlProjet: string, cle: string, table: string, lignesTable: object[]): Promise<void> {
  const url = `${urlProjet.replace(/\/$/, "")}/rest/v1/${table}`;
  const entetes = { apikey: cle, "Content-Type": "application/json" };
  const vider = await fetch(`${url}?id=gt.0`, { method: "DELETE", headers: { ...entetes, Prefer: "return=minimal" } });
  if (!vider.ok) throw new Error(`Supabase : ${table} non vidée, code ${vider.status} : ${(await vider.text()).slice(0, 300)}`);
  for (let i = 0; i < lignesTable.length; i += PAR_PAQUET) {
    const r = await fetch(url, {
      method: "POST",
      headers: { ...entetes, Prefer: "return=minimal" },
      body: JSON.stringify(lignesTable.slice(i, i + PAR_PAQUET)),
    });
    if (!r.ok) throw new Error(`Supabase : ${table} refusée, code ${r.status} : ${(await r.text()).slice(0, 300)}`);
  }
}

const point = (p: { lat: number; lon: number }) => `SRID=4326;POINT(${p.lon} ${p.lat})`;

async function main() {
  const debut = Date.now();
  const essai = process.env.TRANSPORTS_ESSAI === "1";

  const sourceGares = await adresseDuCsv(JEU_GARES);
  const gares = await lireGares(sourceGares);
  console.log(`🚆 ${gares.length} gares de voyageurs lues`);

  const sourceArrets = process.env.TRANSPORTS_FICHIER_ARRETS || (await adresseDuCsv(JEU_ARRETS));
  console.log(`🚏 Lecture des arrêts : ${sourceArrets}`);
  const { positions, lues } = await lireArrets(sourceArrets);
  console.log(`🚏 ${lues} lignes lues, ${positions.length} arrêts gardés (sans réseaux scolaires, doublons fusionnés)`);

  // Garde-fous : un fichier presque vide ou cassé ne doit pas effacer les données de la base.
  if (gares.length < 2000) throw new Error(`Trop peu de gares (${gares.length}) : fichier suspect, rien n'est changé`);
  if (positions.length < 100_000) throw new Error(`Trop peu d'arrêts (${positions.length}) : fichier suspect, rien n'est changé`);

  if (essai) {
    console.log("Essai : rien n'est écrit dans la base.");
    return;
  }

  const urlProjet = lireCle("NEXT_PUBLIC_SUPABASE_URL");
  const cle = lireCle("SUPABASE_SECRET_KEY");
  await remplacer(urlProjet, cle, "gares", gares.map((g) => ({ nom: g.nom, position: point(g) })));
  console.log("✅ Gares enregistrées");
  await remplacer(urlProjet, cle, "arrets", positions.map((p) => ({ position: point(p) })));
  console.log("✅ Arrêts enregistrés");

  const calculees = await baseOffres(urlProjet, cle).calculerAcces(true);
  console.log(`✅ Accès recalculés pour ${calculees} offres (${Math.round((Date.now() - debut) / 1000)} s)`);
}

main().catch((e) => {
  console.error(`❌ ${(e as Error).message}`);
  process.exitCode = 1;
});
