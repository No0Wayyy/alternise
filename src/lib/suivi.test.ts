import { test } from "node:test";
import assert from "node:assert/strict";
import { ENTREES_MAX, aRelancer, lireSuivi, mettreStatut, parStatut, retirer, SUIVI_VIDE } from "./suivi.ts";

const offre = { id: 42, titre: "Vendeur en alternance", entreprise: "Magasin A", ville: "Lyon", url: "https://exemple.fr/offre/42" };
const lundi = new Date("2026-11-16T09:00:00Z");

test("mettreStatut garde une offre puis change son statut", () => {
  let s = mettreStatut(SUIVI_VIDE, offre, "a_postuler", lundi);
  assert.equal(s[42].statut, "a_postuler");
  assert.equal(s[42].gardee_le, lundi.toISOString());
  const mercredi = new Date("2026-11-18T09:00:00Z");
  s = mettreStatut(s, offre, "envoyee", mercredi);
  assert.equal(s[42].statut, "envoyee");
  assert.equal(s[42].gardee_le, lundi.toISOString(), "la date d'ajout ne change pas");
  assert.equal(s[42].maj_le, mercredi.toISOString());
});

test("remettre le même statut ne change pas la date du dernier changement", () => {
  const s = mettreStatut(SUIVI_VIDE, offre, "envoyee", lundi);
  const s2 = mettreStatut(s, offre, "envoyee", new Date("2026-11-20T09:00:00Z"));
  assert.equal(s2[42].maj_le, lundi.toISOString());
});

test("retirer enlève l'offre sans toucher aux autres", () => {
  let s = mettreStatut(SUIVI_VIDE, offre, "a_postuler", lundi);
  s = mettreStatut(s, { ...offre, id: 7 }, "a_postuler", lundi);
  s = retirer(s, 42);
  assert.deepEqual(Object.keys(s), ["7"]);
  assert.equal(retirer(s, 999), s);
});

test("lireSuivi relit ce qui a été enregistré", () => {
  const s = mettreStatut(SUIVI_VIDE, offre, "entretien", lundi);
  assert.deepEqual(lireSuivi(JSON.stringify(s)), s);
});

test("lireSuivi ignore les données abîmées ou piégées", () => {
  assert.deepEqual(lireSuivi(null), {});
  assert.deepEqual(lireSuivi("pas du json"), {});
  assert.deepEqual(lireSuivi("[1,2]"), {});
  const bon = mettreStatut(SUIVI_VIDE, offre, "envoyee", lundi)[42];
  const lu = lireSuivi(
    JSON.stringify({
      42: bon,
      1: { ...bon, id: 1, url: "javascript:alert(1)" },
      2: { ...bon, id: 2, statut: "pirate" },
      3: { ...bon, id: 3, gardee_le: "hier" },
      4: { ...bon, id: -4 },
      5: { ...bon, id: 5, titre: "x".repeat(1000) },
    }),
  );
  assert.deepEqual(Object.keys(lu).sort(), ["42", "5"]);
  assert.equal(lu[5].titre.length, 300);
});

test("la liste est limitée", () => {
  let s = SUIVI_VIDE;
  for (let i = 1; i <= ENTREES_MAX + 5; i++) s = mettreStatut(s, { ...offre, id: i }, "a_postuler", lundi);
  assert.equal(Object.keys(s).length, ENTREES_MAX);
});

test("aRelancer : 7 jours après l'envoi sans nouvelle", () => {
  const s = mettreStatut(SUIVI_VIDE, offre, "envoyee", lundi);
  assert.equal(aRelancer(s[42], new Date("2026-11-22T09:00:00Z")), false); // 6 jours
  assert.equal(aRelancer(s[42], new Date("2026-11-23T09:00:00Z")), true); // 7 jours
  const entretien = mettreStatut(SUIVI_VIDE, offre, "entretien", lundi);
  assert.equal(aRelancer(entretien[42], new Date("2026-12-23T09:00:00Z")), false);
});

test("parStatut range par statut, le plus récent d'abord", () => {
  let s = mettreStatut(SUIVI_VIDE, offre, "envoyee", lundi);
  s = mettreStatut(s, { ...offre, id: 7 }, "envoyee", new Date("2026-11-19T09:00:00Z"));
  s = mettreStatut(s, { ...offre, id: 8 }, "a_postuler", lundi);
  const g = parStatut(s);
  assert.deepEqual(g.envoyee.map((e) => e.id), [7, 42]);
  assert.deepEqual(g.a_postuler.map((e) => e.id), [8]);
  assert.deepEqual(g.entretien, []);
});
