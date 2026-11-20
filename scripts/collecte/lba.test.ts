import { test } from "node:test";
import assert from "node:assert/strict";
import { transformerOffreLba, type OffreLba } from "./lba.ts";

// Offre inventée, avec la même forme qu'une vraie réponse de La Bonne Alternance.
function exemple(): OffreLba {
  return {
    identifier: { id: "abc123", partner_label: "France Travail", partner_job_id: "999XYZ" },
    workplace: {
      siret: "00000000000000",
      brand: null,
      legal_name: "RESTO EXEMPLE SAS",
      name: "Resto Exemple",
      location: { address: "1 RUE DE TEST 33000 BORDEAUX", geopoint: { type: "Point", coordinates: [-0.58, 44.84] } },
    },
    apply: { url: "https://exemple.org/offre/1", phone: "0600000000", recipient_id: null },
    contract: { start: "2027-01-05T00:00:00.000Z", type: ["Apprentissage", "Professionnalisation"] },
    offer: {
      title: "  Commis de cuisine H/F ",
      rome_codes: ["G1602"],
      description: "<p>Rejoins notre équipe.</p>",
      target_diploma: { european: "3", label: "CAP, BEP (Infrabac)" },
      publication: { creation: "2026-11-19T10:00:00.000Z", expiration: "2027-01-19T00:00:00.000Z" },
    },
  };
}

const VUE_LE = "2026-11-20T08:00:00.000Z";

test("transforme une offre complète", () => {
  const o = transformerOffreLba(exemple(), "commerce", VUE_LE);
  assert.ok(o);
  assert.equal(o.source, "lba");
  assert.equal(o.source_id, "abc123");
  assert.equal(o.origine, "France Travail");
  assert.equal(o.titre, "Commis de cuisine H/F");
  assert.equal(o.entreprise, "Resto Exemple");
  assert.equal(o.description, "Rejoins notre équipe.");
  assert.equal(o.secteur, "hotellerie_restauration", "le secteur vient du code ROME de l'offre");
  assert.deepEqual(o.types_contrat, ["apprentissage", "professionnalisation"]);
  assert.equal(o.niveau_diplome, "CAP, BEP (Infrabac)");
  assert.equal(o.debut_contrat, "2027-01-05");
  assert.equal(o.ville, "Bordeaux");
  assert.equal(o.code_postal, "33000");
  assert.equal(o.position, "SRID=4326;POINT(-0.58 44.84)");
  assert.equal(o.url_postuler, "https://exemple.org/offre/1");
  assert.equal(o.publiee_le, "2026-11-19T10:00:00.000Z");
  assert.equal(o.expire_le, "2027-01-19T00:00:00.000Z");
  assert.equal(o.vue_le, VUE_LE);
  assert.equal(o.cle_doublon, "commis de cuisine h f|resto exemple|33000");
});

test("ne garde aucune donnée personnelle ou inutile", () => {
  const o = transformerOffreLba(exemple(), "commerce", VUE_LE);
  const texte = JSON.stringify(o);
  assert.ok(!texte.includes("0600000000"), "pas de téléphone");
  assert.ok(!texte.includes("00000000000000"), "pas de SIRET");
});

test("prend le secteur demandé si le code ROME de l'offre est inconnu", () => {
  const e = exemple();
  e.offer.rome_codes = ["Z9999"];
  assert.equal(transformerOffreLba(e, "commerce", VUE_LE)?.secteur, "commerce");
});

test("refuse une offre sans lien http(s) pour postuler", () => {
  const e = exemple();
  e.apply.url = "javascript:alert(1)";
  assert.equal(transformerOffreLba(e, "commerce", VUE_LE), null);
  e.apply.url = null;
  assert.equal(transformerOffreLba(e, "commerce", VUE_LE), null);
});

test("refuse une offre déjà expirée", () => {
  const e = exemple();
  e.offer.publication.expiration = "2026-11-01T00:00:00.000Z";
  assert.equal(transformerOffreLba(e, "commerce", VUE_LE), null);
});

test("refuse une offre sans titre", () => {
  const e = exemple();
  e.offer.title = "   ";
  assert.equal(transformerOffreLba(e, "commerce", VUE_LE), null);
});

test("refuse une offre sans contrat d'apprentissage ni de professionnalisation", () => {
  const e = exemple();
  e.contract = { start: null, type: ["CDI"] };
  assert.equal(transformerOffreLba(e, "commerce", VUE_LE), null);
  e.contract = null;
  assert.equal(transformerOffreLba(e, "commerce", VUE_LE), null);
});

test("refuse une offre de stage même étiquetée apprentissage", () => {
  const e = exemple();
  e.offer.title = "Stage - Chargé de communication H/F";
  assert.equal(transformerOffreLba(e, "commerce", VUE_LE), null);
});

test("décode les entités HTML du titre", () => {
  const e = exemple();
  e.offer.title = "Chef de projet communication &amp; relations publiques";
  assert.equal(transformerOffreLba(e, "commerce", VUE_LE)?.titre, "Chef de projet communication & relations publiques");
});

test("coupe une description trop longue à 2000 caractères", () => {
  const e = exemple();
  e.offer.description = "mot ".repeat(1000);
  assert.ok((transformerOffreLba(e, "commerce", VUE_LE)?.description ?? "").length <= 2000);
});
