import { test } from "node:test";
import assert from "node:assert/strict";
import { lireCriteres, urlRecherche, parametresRpc, liensExternes, aDesCriteres, depuisQuand } from "./recherche.ts";

test("lireCriteres lit une adresse complète", () => {
  const c = lireCriteres({
    q: "  vendeur ",
    s: ["commerce", "marketing"],
    v: ["Lyon~45.758~4.835", "Villeurbanne~45.771~4.880"],
    r: "30",
    n: "bac2",
    d: "7",
    e: "1",
    t: "distance",
    p: "2",
  });
  assert.equal(c.q, "vendeur");
  assert.deepEqual(c.secteurs, ["commerce", "marketing"]);
  assert.deepEqual(c.villes, [
    { nom: "Lyon", lat: 45.758, lon: 4.835 },
    { nom: "Villeurbanne", lat: 45.771, lon: 4.88 },
  ]);
  assert.equal(c.rayon, 30);
  assert.equal(c.niveau, "bac2");
  assert.equal(c.depuis, 7);
  assert.equal(c.ecoles, true);
  assert.equal(c.tri, "distance");
  assert.equal(c.page, 2);
});

test("lireCriteres ignore les valeurs inconnues ou piégées", () => {
  const c = lireCriteres({
    q: "x".repeat(300),
    s: ["commerce", "informatique", "<script>"],
    v: ["Lyon~abc~4.8", "Paris~48.85~2.35", "Nulle part~95~200"],
    r: "9999",
    n: "doctorat",
    d: "-3",
    t: "n'importe",
    p: "0",
  });
  assert.equal(c.q.length, 100);
  assert.deepEqual(c.secteurs, ["commerce"]);
  assert.deepEqual(c.villes, [{ nom: "Paris", lat: 48.85, lon: 2.35 }]);
  assert.equal(c.rayon, 20);
  assert.equal(c.niveau, null);
  assert.equal(c.depuis, null);
  assert.equal(c.tri, "date");
  assert.equal(c.page, 1);
});

test("lireCriteres garde 5 villes au maximum", () => {
  const v = Array.from({ length: 8 }, (_, i) => `Ville${i}~45.${i}~4.8`);
  assert.equal(lireCriteres({ v }).villes.length, 5);
});

test("le tri par distance n'a de sens qu'avec une ville", () => {
  assert.equal(lireCriteres({ t: "distance" }).tri, "date");
});

test("urlRecherche reconstruit l'adresse et applique des changements", () => {
  const c = lireCriteres({ q: "vendeur", s: ["commerce"], v: ["Lyon~45.758~4.835"], r: "20", p: "3" });
  assert.equal(urlRecherche(c), "/?q=vendeur&s=commerce&v=Lyon%7E45.758%7E4.835&r=20&p=3");
  assert.equal(urlRecherche(c, { ecoles: true, page: 1 }), "/?q=vendeur&s=commerce&v=Lyon%7E45.758%7E4.835&r=20&e=1");
  assert.equal(urlRecherche(lireCriteres({})), "/");
});

test("parametresRpc prépare l'appel à la base", () => {
  const c = lireCriteres({ q: "vendeur", s: ["commerce"], v: ["Lyon~45.758~4.835"], r: "30", n: "bac2", d: "7", t: "distance", p: "2" });
  assert.deepEqual(parametresRpc(c, 30), {
    p_secteurs: ["commerce"],
    p_texte: "vendeur",
    p_niveaux: ["BTS, DEUST (Bac+2)"],
    p_inclure_sans_niveau: true,
    p_depuis_jours: 7,
    p_zones: [{ lat: 45.758, lon: 4.835, rayon_km: 30 }],
    p_ecoles: false,
    p_tri: "distance",
    p_limite: 30,
    p_decalage: 30,
  });
  const vide = parametresRpc(lireCriteres({}), 30);
  assert.equal(vide.p_secteurs, null);
  assert.equal(vide.p_zones, null);
  assert.equal(vide.p_niveaux, null);
});

test("aDesCriteres dit si l'étudiant a lancé une recherche", () => {
  assert.equal(aDesCriteres(lireCriteres({})), false);
  assert.equal(aDesCriteres(lireCriteres({ e: "1" })), false);
  assert.equal(aDesCriteres(lireCriteres({ q: "vendeur" })), true);
  assert.equal(aDesCriteres(lireCriteres({ v: ["Lyon~45.7~4.8"] })), true);
});

test("liensExternes prépare des recherches d'alternance déjà remplies", () => {
  const l = liensExternes(lireCriteres({ q: "vendeur", v: ["Lyon~45.758~4.835"] }));
  assert.deepEqual(
    l.map((x) => x.nom),
    ["Indeed", "LinkedIn", "Welcome to the Jungle", "HelloWork"],
  );
  for (const x of l) {
    assert.ok(x.url.startsWith("https://"), x.url);
    assert.ok(decodeURIComponent(x.url.replace(/\+/g, " ")).includes("alternance vendeur"), x.url);
  }
  assert.ok(l[0].url.includes("l=Lyon"));
});

test("liensExternes utilise le secteur quand il n'y a pas de mot-clé", () => {
  const l = liensExternes(lireCriteres({ s: ["hotellerie_restauration"] }));
  assert.ok(decodeURIComponent(l[0].url.replace(/\+/g, " ")).includes("alternance hôtellerie et restauration"));
});

test("depuisQuand écrit une date relative en français", () => {
  const maintenant = new Date("2026-11-20T12:00:00Z");
  assert.equal(depuisQuand("2026-11-20T11:30:00Z", maintenant), "il y a 30 minutes");
  assert.equal(depuisQuand("2026-11-20T07:00:00Z", maintenant), "il y a 5 heures");
  assert.equal(depuisQuand("2026-11-19T10:00:00Z", maintenant), "hier");
  assert.equal(depuisQuand("2026-11-10T12:00:00Z", maintenant), "il y a 10 jours");
  assert.equal(depuisQuand(null, maintenant), null);
});
