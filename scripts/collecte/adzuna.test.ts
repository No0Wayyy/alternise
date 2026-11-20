import { test } from "node:test";
import assert from "node:assert/strict";
import { doitLancerAdzuna, planAppelsAdzuna, transformerOffreAdzuna, type OffreAdzuna } from "./adzuna.ts";

test("doitLancerAdzuna : une collecte Adzuna toutes les N heures", () => {
  assert.equal(doitLancerAdzuna(new Date("2026-11-20T00:17:00Z"), 4), true);
  assert.equal(doitLancerAdzuna(new Date("2026-11-20T04:17:00Z"), 4), true);
  assert.equal(doitLancerAdzuna(new Date("2026-11-20T05:17:00Z"), 4), false);
  assert.equal(doitLancerAdzuna(new Date("2026-11-20T05:17:00Z"), 1), true);
});

test("planAppelsAdzuna : la page 1 de chaque mot-clé passe avant les pages suivantes", () => {
  assert.deepEqual(planAppelsAdzuna(["a", "b", "c"], 5), [
    { motCle: "a", page: 1 },
    { motCle: "b", page: 1 },
    { motCle: "c", page: 1 },
    { motCle: "a", page: 2 },
    { motCle: "b", page: 2 },
  ]);
});

// Offre inventée, avec la même forme qu'une vraie réponse d'Adzuna.
function exemple(): OffreAdzuna {
  return {
    id: "123456",
    title: "Vendeur (H/F) - en alternance",
    description: "Rejoins notre magasin &amp; apprends le métier…",
    created: "2026-11-20T09:00:00Z",
    redirect_url: "https://www.adzuna.fr/land/ad/123456?se=abc",
    latitude: 45.76,
    longitude: 4.83,
    location: { display_name: "Lyon, Rhône", area: ["France", "Auvergne-Rhône-Alpes", "Rhône", "Lyon"] },
    company: { display_name: "Magasin Exemple" },
    category: { tag: "retail-jobs", label: "Emplois Commerce détail" },
    contract_type: "contract",
  };
}

const VUE_LE = "2026-11-20T10:00:00.000Z";

test("transforme une offre d'alternance complète", () => {
  const o = transformerOffreAdzuna(exemple(), VUE_LE);
  assert.ok(o);
  assert.equal(o.source, "adzuna");
  assert.equal(o.source_id, "123456");
  assert.equal(o.origine, "Adzuna");
  assert.equal(o.titre, "Vendeur (H/F) - en alternance");
  assert.equal(o.entreprise, "Magasin Exemple");
  assert.equal(o.description, "Rejoins notre magasin & apprends le métier…");
  assert.equal(o.secteur, "commerce");
  assert.deepEqual(o.types_contrat, ["alternance"]);
  assert.equal(o.ville, "Lyon");
  assert.equal(o.position, "SRID=4326;POINT(4.83 45.76)");
  assert.equal(o.url_postuler, "https://www.adzuna.fr/land/ad/123456?se=abc");
  assert.equal(o.publiee_le, "2026-11-20T09:00:00Z");
  assert.equal(o.cle_doublon, "vendeur en alternance|magasin exemple");
  assert.equal(o.annonce_ecole, false);
});

test("refuse une offre dont le titre ne parle pas d'alternance (ex. intérim en CDI)", () => {
  const e = exemple();
  e.title = "TECHNICIEN DE MAINTENANCE ITINERANT (F/H)";
  e.description = "Randstad vous ouvre toutes les portes de l'emploi : intérim, CDD, CDI, alternance…";
  e.contract_type = "permanent";
  assert.equal(transformerOffreAdzuna(e, VUE_LE), null);
});

test("refuse « hors stage et alternance, Freelance »", () => {
  const e = exemple();
  e.title = "QA web & mobile 3-6 ans d'expérience hors stage et alternance, Freelance";
  e.category = { tag: "it-jobs", label: "Emplois Informatique" };
  assert.equal(transformerOffreAdzuna(e, VUE_LE), null);
});

test("refuse une offre hors des secteurs d'Alternise", () => {
  const e = exemple();
  e.title = "Contrat d'alternance AES en FAM";
  e.category = { tag: "healthcare-nursing-jobs", label: "Soins" };
  assert.equal(transformerOffreAdzuna(e, VUE_LE), null);
});

test("classe par mots-clés une offre mal rangée par Adzuna", () => {
  const e = exemple();
  e.title = "Apprenti Boucher alternance H/F";
  e.category = { tag: "social-work-jobs", label: "Travail social" };
  assert.equal(transformerOffreAdzuna(e, VUE_LE)?.secteur, "commerce");
});

test("sépare communication et marketing dans la catégorie « RP, Publicité et Marketing »", () => {
  const e = exemple();
  e.category = { tag: "pr-advertising-marketing-jobs", label: "RP, Publicité et Marketing" };
  e.title = "Chargé de communication en alternance";
  assert.equal(transformerOffreAdzuna(e, VUE_LE)?.secteur, "communication");
  e.title = "Chef de produit junior en alternance";
  assert.equal(transformerOffreAdzuna(e, VUE_LE)?.secteur, "marketing");
});

test("précise le type de contrat quand le titre le dit", () => {
  const e = exemple();
  e.title = "Contrat pro - Assistant commercial";
  assert.deepEqual(transformerOffreAdzuna(e, VUE_LE)?.types_contrat, ["professionnalisation"]);
  e.title = "Apprenti vendeur";
  assert.deepEqual(transformerOffreAdzuna(e, VUE_LE)?.types_contrat, ["apprentissage"]);
});

test("marque les annonces d'écoles", () => {
  const e = exemple();
  e.title = "BTS MCO en alternance - Formation rémunérée";
  e.company = { display_name: "Nuevo CFA" };
  assert.equal(transformerOffreAdzuna(e, VUE_LE)?.annonce_ecole, true);
});

test("accepte une offre sans point GPS", () => {
  const e = exemple();
  delete e.latitude;
  delete e.longitude;
  assert.equal(transformerOffreAdzuna(e, VUE_LE)?.position, null);
});

test("refuse un lien qui n'est pas http(s)", () => {
  const e = exemple();
  e.redirect_url = "javascript:alert(1)";
  assert.equal(transformerOffreAdzuna(e, VUE_LE), null);
});
