import { test } from "node:test";
import assert from "node:assert/strict";
import { cleArret, estEnFrance, garderArret, lireLigneCsv, lirePositionGare } from "./outils.ts";

test("lireLigneCsv garde les virgules entre guillemets", () => {
  assert.deepEqual(lireLigneCsv('Réseau,1400719,"Gex, centre",46.33,6.05,0'), ["Réseau", "1400719", "Gex, centre", "46.33", "6.05", "0"]);
  assert.deepEqual(lireLigneCsv('a,"dit ""bonjour""",c'), ["a", 'dit "bonjour"', "c"]);
  assert.deepEqual(lireLigneCsv("Abancourt;ABT;C;49.68, 1.77", ";"), ["Abancourt", "ABT", "C", "49.68, 1.77"]);
  assert.deepEqual(lireLigneCsv("a,,c"), ["a", "", "c"]);
});

test("garderArret écarte les réseaux scolaires, les entrées de station et les points hors de France", () => {
  const base = { reseau: "Réseau urbain TCL", typeLieu: "0", lat: 45.76, lon: 4.83 };
  assert.equal(garderArret(base), true);
  assert.equal(garderArret({ ...base, typeLieu: "" }), true);
  assert.equal(garderArret({ ...base, reseau: "Réseau scolaire de l'Aisne (02)" }), false);
  assert.equal(garderArret({ ...base, typeLieu: "1" }), false);
  assert.equal(garderArret({ ...base, typeLieu: "2" }), false);
  // Simple cadre : les pays voisins proches (Suisse…) passent, sans gêne pour des offres en France.
  assert.equal(garderArret({ ...base, lat: 40.42, lon: -3.7 }), false, "Madrid");
  assert.equal(garderArret({ ...base, lat: Number.NaN }), false);
});

test("estEnFrance accepte la métropole, la Corse et l'outre-mer", () => {
  assert.equal(estEnFrance(48.85, 2.35), true); // Paris
  assert.equal(estEnFrance(41.92, 8.74), true); // Ajaccio
  assert.equal(estEnFrance(-20.88, 55.45), true); // Saint-Denis (La Réunion)
  assert.equal(estEnFrance(51.5, -0.12), false); // Londres
});

test("cleArret fusionne deux arrêts à quelques mètres l'un de l'autre", () => {
  assert.equal(cleArret(46.33191308, 6.05951), cleArret(46.33193, 6.05953));
  assert.notEqual(cleArret(46.3319, 6.0595), cleArret(46.3329, 6.0595));
});

test("lirePositionGare lit « lat, lon »", () => {
  assert.deepEqual(lirePositionGare("49.6852237, 1.7743058"), { lat: 49.6852237, lon: 1.7743058 });
  assert.equal(lirePositionGare(""), null);
  assert.equal(lirePositionGare("abc, def"), null);
});
