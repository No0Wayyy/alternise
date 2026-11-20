import { test } from "node:test";
import assert from "node:assert/strict";
import { simplifierContour } from "./geometrie.ts";

/** Un cercle de 600 coins autour de Lyon, refermé (dernier point = premier). */
function cercle(n: number) {
  const points = Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n;
    return { lat: 45.76 + 0.1 * Math.sin(a), lon: 4.83 + 0.14 * Math.cos(a) };
  });
  return [...points, points[0]];
}

test("simplifierContour réduit un contour trop détaillé", () => {
  const r = simplifierContour(cercle(600), 300);
  assert.ok(r.length <= 300, `${r.length} coins`);
  assert.ok(r.length >= 20, `forme perdue : ${r.length} coins`);
  // Tous les coins gardés sont des coins d'origine, sur le cercle.
  for (const p of r) {
    const d = Math.hypot((p.lat - 45.76) / 0.1, (p.lon - 4.83) / 0.14);
    assert.ok(Math.abs(d - 1) < 1e-9);
  }
});

test("simplifierContour garde un petit contour tel quel, sans répéter le premier point", () => {
  const r = simplifierContour(cercle(40), 300);
  assert.equal(r.length, 40);
  assert.notDeepEqual(r[0], r[r.length - 1]);
});

test("simplifierContour respecte un maximum très bas", () => {
  assert.ok(simplifierContour(cercle(600), 12).length <= 12);
});
