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

/** Temps de trajet depuis l'adresse de l'étudiant (calcul OpenRouteService). */
export const MODES = {
  pied: { nom: "À pied", profil: "foot-walking" },
  velo: { nom: "À vélo", profil: "cycling-regular" },
  voiture: { nom: "En voiture", profil: "driving-car" },
} as const;
export type Mode = keyof typeof MODES;
export const DUREES = [10, 15, 20, 30, 45, 60] as const;

/** Accès en transports : arrêt à moins de 500 m, gare à moins de 2, 5 ou 10 km. */
export const ARRET_MAX_M = 500;
export const GARES_KM = [2, 5, 10] as const;

export const PAR_PAGE = 30;
const VILLES_MAX = 5;
/** Une zone dessinée sur la carte a de 3 à 30 coins. */
export const ZONE_COINS_MAX = 30;

export type Ville = { nom: string; lat: number; lon: number };
export type Point = { lat: number; lon: number };
export type Trajet = { depart: Ville; mode: Mode; minutes: number };
export type Criteres = {
  q: string;
  secteurs: Secteur[];
  villes: Ville[];
  rayon: number;
  /** Zone dessinée sur la carte (null = pas de zone). */
  zone: Point[] | null;
  /** Temps de trajet depuis l'adresse de l'étudiant (null = pas de trajet). Remplace villes et zone. */
  trajet: Trajet | null;
  /** Seulement les offres à moins de 500 m d'un arrêt de bus, car, tram ou métro. */
  arret: boolean;
  /** Seulement les offres à moins de N km d'une gare (null = peu importe). */
  gare: number | null;
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

/** Arrondi à 3 décimales (environ 100 m) : on ne garde pas l'adresse exacte de l'étudiant. */
export const arrondiDepart = (n: number) => Math.round(n * 1000) / 1000;

function lireTrajet(p: Parametres): Trajet | null {
  const depart = lireVille(premier(p.dep));
  if (!depart) return null;
  const mode = premier(p.m);
  const minutes = Number(premier(p.min));
  return {
    depart: { nom: depart.nom, lat: arrondiDepart(depart.lat), lon: arrondiDepart(depart.lon) },
    mode: mode in MODES ? (mode as Mode) : "pied",
    minutes: (DUREES as readonly number[]).includes(minutes) ? minutes : 20,
  };
}

/** Lit les critères de recherche dans l'adresse. Toute valeur inconnue est ignorée. */
export function lireCriteres(p: Parametres): Criteres {
  const secteurs = tous(p.s).filter((s): s is Secteur => s in SECTEURS);
  const trajet = lireTrajet(p);
  // Une seule façon de dire « où » : le trajet passe avant les villes et la zone dessinée.
  const villes = trajet
    ? []
    : tous(p.v)
    .map(lireVille)
    .filter((v): v is Ville => v !== null)
    .slice(0, VILLES_MAX);
  const rayon = Number(premier(p.r));
  const niveau = premier(p.n);
  const depuis = Number(premier(p.d));
  const page = Math.floor(Number(premier(p.p)));
  const vue = premier(p.a) === "carte" ? "carte" : "liste";
  const gare = Number(premier(p.g));

  return {
    q: premier(p.q).trim().slice(0, 100),
    secteurs: [...new Set(secteurs)],
    villes,
    rayon: (RAYONS as readonly number[]).includes(rayon) ? rayon : 20,
    zone: trajet ? null : lireZone(premier(p.z)),
    trajet,
    arret: premier(p.ta) === "1",
    gare: (GARES_KM as readonly number[]).includes(gare) ? gare : null,
    niveau: niveau in NIVEAUX ? (niveau as Niveau) : null,
    depuis: DEPUIS.some((d) => d.jours === depuis) ? depuis : null,
    ecoles: premier(p.e) === "1",
    tri: premier(p.t) === "distance" && (villes.length > 0 || trajet) ? "distance" : "date",
    vue,
    // La carte montre toutes les offres d'un coup : pas de pages.
    page: vue === "liste" && Number.isFinite(page) && page > 1 ? Math.min(page, 100) : 1,
  };
}

/** Vrai si l'étudiant a précisé quelque chose (sinon on montre les dernières offres). */
export function aDesCriteres(c: Criteres): boolean {
  return Boolean(c.q || c.secteurs.length || c.villes.length || c.zone || c.trajet || c.arret || c.gare || c.niveau || c.depuis);
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
  if (x.trajet) {
    u.set("dep", encoderVille(x.trajet.depart));
    u.set("m", x.trajet.mode);
    u.set("min", String(x.trajet.minutes));
  }
  if (x.niveau) u.set("n", x.niveau);
  if (x.depuis) u.set("d", String(x.depuis));
  if (x.arret) u.set("ta", "1");
  if (x.gare) u.set("g", String(x.gare));
  if (x.ecoles) u.set("e", "1");
  if (x.tri === "distance" && (x.villes.length || x.trajet)) u.set("t", "distance");
  if (x.vue === "carte") u.set("a", "carte");
  else if (x.page > 1) u.set("p", String(x.page));
  const texte = u.toString();
  return texte ? `/?${texte}` : "/";
}

/**
 * Filtres communs aux fonctions SQL rechercher_offres (la liste) et points_offres (la carte).
 * zoneTrajet : la zone atteignable calculée par OpenRouteService quand l'étudiant donne un trajet.
 */
export function parametresFiltres(c: Criteres, zoneTrajet: Point[] | null = null) {
  const zones = c.trajet
    ? [{ lat: c.trajet.depart.lat, lon: c.trajet.depart.lon, rayon_km: 200 }] // sert au tri par distance
    : c.villes.map((v) => ({ lat: v.lat, lon: v.lon, rayon_km: c.rayon }));
  const polygone = c.trajet ? zoneTrajet : c.zone;
  return {
    p_secteurs: c.secteurs.length ? c.secteurs : null,
    p_texte: c.q || null,
    p_niveaux: c.niveau ? [NIVEAUX[c.niveau].libelle] : null,
    p_inclure_sans_niveau: true,
    p_depuis_jours: c.depuis,
    p_zones: zones.length ? zones : null,
    // PostGIS attend [longitude, latitude].
    p_polygone: polygone ? polygone.map((p) => [p.lon, p.lat]) : null,
    p_ecoles: c.ecoles,
    p_arret_max_m: c.arret ? ARRET_MAX_M : null,
    p_gare_max_m: c.gare ? c.gare * 1000 : null,
  };
}

/** Paramètres de la fonction SQL rechercher_offres. */
export function parametresRpc(c: Criteres, parPage: number, zoneTrajet: Point[] | null = null) {
  return {
    ...parametresFiltres(c, zoneTrajet),
    p_tri: c.tri,
    p_limite: parPage,
    p_decalage: (c.page - 1) * parPage,
  };
}

/** Boutons « Chercher aussi sur… » : on ouvre leur recherche déjà remplie (pas de collecte chez eux). */
export function liensExternes(c: Criteres): { nom: string; url: string }[] {
  const sujet = c.q || (c.secteurs[0] ? SECTEURS[c.secteurs[0]].nom.toLowerCase() : "");
  const quoi = `alternance ${sujet}`.trim();
  // Pour un trajet, on garde seulement la commune (« Rue X, Lyon » → « Lyon »).
  const ou = c.villes[0]?.nom ?? c.trajet?.depart.nom.split(",").pop()?.trim() ?? "";
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
