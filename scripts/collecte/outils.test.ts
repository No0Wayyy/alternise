import { test } from "node:test";
import assert from "node:assert/strict";
import { cleDoublon, couper, estHorsAlternance, lireAdresse, nettoyerTexte, normaliser, pointGps, secteurDuRome } from "./outils.ts";

test("normaliser enlève accents, majuscules et ponctuation", () => {
  assert.equal(normaliser("  Chargé(e) de COMMUNICATION – H/F "), "charge e de communication h f");
});

test("cleDoublon est identique pour la même offre écrite différemment", () => {
  const a = cleDoublon("Commis de cuisine H/F", "Le Bon Resto", "33680");
  const b = cleDoublon("commis de cuisine (h/f)", "LE BON RESTO", "33680");
  assert.equal(a, b);
});

test("cleDoublon diffère si la ville change", () => {
  assert.notEqual(cleDoublon("Vendeur", "Magasin", "75001"), cleDoublon("Vendeur", "Magasin", "69001"));
});

test("couper garde les textes courts et coupe proprement les longs", () => {
  assert.equal(couper("court", 10), "court");
  const long = "un deux trois quatre cinq six";
  const r = couper(long, 15);
  assert.ok(r.length <= 15, `trop long : ${r.length}`);
  assert.ok(r.endsWith("…"));
  assert.ok(!r.includes("quat"), "ne coupe pas au milieu d'un mot");
});

test("nettoyerTexte enlève le HTML et les espaces en trop", () => {
  assert.equal(nettoyerTexte("<p>Bonjour&nbsp;<b>toi</b></p>\n\n\n<p>Suite &amp; fin</p>"), "Bonjour toi\n\nSuite & fin");
  assert.equal(nettoyerTexte(null), null);
});

test("lireAdresse trouve code postal et ville", () => {
  assert.deepEqual(lireAdresse("11 RUE DU PORT 33680 LACANAU"), { code_postal: "33680", ville: "Lacanau" });
  assert.deepEqual(lireAdresse("2 place X 75001 PARIS 01"), { code_postal: "75001", ville: "Paris 01" });
  assert.deepEqual(lireAdresse(null), { code_postal: null, ville: null });
});

test("pointGps accepte un point valide et refuse le reste", () => {
  assert.equal(pointGps([2.35, 48.85]), "SRID=4326;POINT(2.35 48.85)");
  assert.equal(pointGps([200, 48]), null);
  assert.equal(pointGps(undefined), null);
});

test("estHorsAlternance repère stages, CDI, CDD, intérim et jobs saisonniers", () => {
  for (const titre of [
    "Stage - Chargé de communication H/F",
    "STAGE - ASSISTANT CHEF DE PROJET",
    "Stagiaire marketing",
    "Vendeur en CDI",
    "Serveur CDD 6 mois",
    "Cariste en intérim",
    "Job d'été vendeur",
    "Saisonnier restauration",
  ]) {
    assert.equal(estHorsAlternance(titre), true, titre);
  }
});

test("estHorsAlternance garde les vraies offres d'alternance", () => {
  for (const titre of [
    "Commis de cuisine",
    "Chargé de communication en alternance",
    "Apprenti vendeur (CDD d'apprentissage)",
    "Contrat pro - Assistant commercial",
    "Contrat de professionnalisation technicien maintenance",
    "Responsable de la mise en scène des stages",
  ]) {
    assert.equal(estHorsAlternance(titre), false, titre);
  }
});

test("secteurDuRome retrouve le secteur d'un code", () => {
  assert.equal(secteurDuRome("G1602"), "hotellerie_restauration");
  assert.equal(secteurDuRome("E1112"), "communication");
  assert.equal(secteurDuRome("Z9999"), null);
});
