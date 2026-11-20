// Critères de recherche : lus dans l'adresse de la page (partageable), envoyés à la base.
import { SECTEURS, type Secteur } from "./secteurs.ts";

export const NIVEAUX = {
  cap: { nom: "CAP, BEP", libelle: "CAP, BEP (Infrabac)" },
  bac: { nom: "Bac, Bac pro", libelle: "Bac, Bac Pro, BP (Bac)" },
  bac2: { nom: "Bac+2 (BTS…)", libelle: "BTS, DEUST (Bac+2)" },
  bac3: { nom: "Bac+3 (Licence, BUT…)", libelle: "Licence, BUT, Licence Pro (Bac+3)" },
  bac5: { nom: "Bac+5 (Master…)", libelle: "Master, titre ingénieur, grande école (Bac+5)" },
} as const;
export type Niveau = keyof typeof NIVEAUX;

export const RAYONS = [5, 10, 20, 30, 50, 100] as const;
export const DEPUIS = [
  { jours: 1, nom: "Moins de 24 h" },
  { jours: 3, nom: "Moins de 3 jours" },
  { jours: 7, nom: "Moins d'une semaine" },
  { jours: 30, nom: "Moins d'un mois" },
] as const;

export const PAR_PAGE = 30;
const VILLES_MAX = 5;
/** Une zone dessinée sur la carte a de 3 à 30 coins. */
export const ZONE_COINS_MAX = 30;

export type Ville = { nom: string; lat: number; lon: number };
export type Point = { lat: number; lon: number };
export type Criteres = {
  q: string;
  secteurs: Secteur[];
  villes: Ville[];
  rayon: number;
  /** Zone dessinée sur la carte (null = pas de zone). */
  zone: Point[] | null;
  niveau: Niveau | null;
  depuis: number | null;
  ecoles: boolean;
  tri: "date" | "distance";
  vue: "liste" | "carte";
  page: number;
};

type Parametres = Record<string, string | string[] | undefined>;

const premier = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const tous = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

/** Une ville s'écrit « Nom~latitude~longitude » dans l'adresse. */
export function encoderVille(v: Ville): string {
  return `${v.nom}~${v.lat}~${v.lon}`;
}

function lireVille(texte: string): Ville | null {
  const [nom, lat, lon] = texte.split("~");
  const la = Number(lat);
  const lo = Number(lon);
  if (!nom?.trim() || !Number.isFinite(la) || !Number.isFinite(lo)) return null;
  // France métropolitaine et outre-mer : on refuse seulement l'impossible.
  if (Math.abs(la) > 90 || Math.abs(lo) > 180) return null;
  return { nom: nom.trim().slice(0, 80), lat: la, lon: lo };
}

/** Une zone s'écrit « lat,lon;lat,lon;… » dans l'adresse, arrondie à 4 décimales (environ 10 m). */
export function encoderZone(zone: Point[]): string {
  const arrondi = (n: number) => String(Math.round(n * 1e4) / 1e4);
  return zone.map((p) => `${arrondi(p.lat)},${arrondi(p.lon)}`).join(";");
}

function lireZone(texte: string): Point[] | null {
  if (!texte) return null;
  const coins = texte.split(";").map((c) => c.split(",").map(Number));
  if (coins.length < 3 || coins.length > ZONE_COINS_MAX) return null;
  const valides = coins.every(
    (c) => c.length === 2 && c.every(Number.isFinite) && Math.abs(c[0]) <= 90 && Math.abs(c[1]) <= 180,
  );
  return valides ? coins.map(([lat, lon]) => ({ lat, lon })) : null;
}

/** Lit les critères de recherche dans l'adresse. Toute valeur inconnue est ignorée. */
export function lireCriteres(p: Parametres): Criteres {
  const secteurs = tous(p.s).filter((s): s is Secteur => s in SECTEURS);
  const villes = tous(p.v)
    .map(lireVille)
    .filter((v): v is Ville => v !== null)
    .slice(0, VILLES_MAX);
  const rayon = Number(premier(p.r));
  const niveau = premier(p.n);
  const depuis = Number(premier(p.d));
  const page = Math.floor(Number(premier(p.p)));
  const vue = premier(p.a) === "carte" ? "carte" : "liste";

  return {
    q: premier(p.q).trim().slice(0, 100),
    secteurs: [...new Set(secteurs)],
    villes,
    rayon: (RAYONS as readonly number[]).includes(rayon) ? rayon : 20,
    zone: lireZone(premier(p.z)),
    niveau: niveau in NIVEAUX ? (niveau as Niveau) : null,
    depuis: DEPUIS.some((d) => d.jours === depuis) ? depuis : null,
    ecoles: premier(p.e) === "1",
    tri: premier(p.t) === "distance" && villes.length > 0 ? "distance" : "date",
    vue,
    // La carte montre toutes les offres d'un coup : pas de pages.
    page: vue === "liste" && Number.isFinite(page) && page > 1 ? Math.min(page, 100) : 1,
  };
}

/** Vrai si l'étudiant a précisé quelque chose (sinon on montre les dernières offres). */
export function aDesCriteres(c: Criteres): boolean {
  return Boolean(c.q || c.secteurs.length || c.villes.length || c.zone || c.niveau || c.depuis);
}

/** Adresse de la page pour ces critères, avec d'éventuels changements (onglet, tri, page…). */
export function urlRecherche(c: Criteres, changements: Partial<Criteres> = {}): string {
  const x = { ...c, ...changements };
  const u = new URLSearchParams();
  if (x.q) u.set("q", x.q);
  for (const s of x.secteurs) u.append("s", s);
  for (const v of x.villes) u.append("v", encoderVille(v));
  if (x.villes.length) u.set("r", String(x.rayon));
  if (x.zone) u.set("z", encoderZone(x.zone));
  if (x.niveau) u.set("n", x.niveau);
  if (x.depuis) u.set("d", String(x.depuis));
  if (x.ecoles) u.set("e", "1");
  if (x.tri === "distance" && x.villes.length) u.set("t", "distance");
  if (x.vue === "carte") u.set("a", "carte");
  else if (x.page > 1) u.set("p", String(x.page));
  const texte = u.toString();
  return texte ? `/?${texte}` : "/";
}

/** Filtres communs aux fonctions SQL rechercher_offres (la liste) et points_offres (la carte). */
export function parametresFiltres(c: Criteres) {
  return {
    p_secteurs: c.secteurs.length ? c.secteurs : null,
    p_texte: c.q || null,
    p_niveaux: c.niveau ? [NIVEAUX[c.niveau].libelle] : null,
    p_inclure_sans_niveau: true,
    p_depuis_jours: c.depuis,
    p_zones: c.villes.length ? c.villes.map((v) => ({ lat: v.lat, lon: v.lon, rayon_km: c.rayon })) : null,
    // PostGIS attend [longitude, latitude].
    p_polygone: c.zone ? c.zone.map((p) => [p.lon, p.lat]) : null,
    p_ecoles: c.ecoles,
  };
}

/** Paramètres de la fonction SQL rechercher_offres. */
export function parametresRpc(c: Criteres, parPage: number) {
  return {
    ...parametresFiltres(c),
    p_tri: c.tri,
    p_limite: parPage,
    p_decalage: (c.page - 1) * parPage,
  };
}

/** Boutons « Chercher aussi sur… » : on ouvre leur recherche déjà remplie (pas de collecte chez eux). */
export function liensExternes(c: Criteres): { nom: string; url: string }[] {
  const sujet = c.q || (c.secteurs[0] ? SECTEURS[c.secteurs[0]].nom.toLowerCase() : "");
  const quoi = `alternance ${sujet}`.trim();
  const ou = c.villes[0]?.nom ?? "";
  const avec = (base: string, params: Record<string, string>) => {
    const u = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
    return `${base}?${u.toString()}`;
  };
  return [
    { nom: "Indeed", url: avec("https://fr.indeed.com/jobs", { q: quoi, l: ou }) },
    { nom: "LinkedIn", url: avec("https://www.linkedin.com/jobs/search/", { keywords: quoi, location: ou || "France" }) },
    { nom: "Welcome to the Jungle", url: avec("https://www.welcometothejungle.com/fr/jobs", { query: quoi, aroundQuery: ou }) },
    { nom: "HelloWork", url: avec("https://www.hellowork.com/fr-fr/emploi/recherche.html", { k: quoi, l: ou }) },
  ];
}

const relatif = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

/** « il y a 5 heures », « hier », « il y a 10 jours »… */
export function depuisQuand(date: string | null, maintenant = new Date()): string | null {
  if (!date) return null;
  const minutes = Math.max(0, Math.round((maintenant.getTime() - new Date(date).getTime()) / 60_000));
  if (minutes < 60) return relatif.format(-Math.max(1, minutes), "minute");
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return relatif.format(-heures, "hour");
  const jours = Math.floor(heures / 24);
  if (jours < 60) return relatif.format(-jours, "day");
  return relatif.format(-Math.floor(jours / 30), "month");
}
