import test from 'node:test';
import assert from 'node:assert/strict';
import { PROFILES, PROFILE_ORDER, DEFAULT_PROFILE, pixelRatioFor, profileOf } from '../js/graphics/GraphicsConfig.js';

test('four profiles, getting heavier from Low to Ultra; High is the default', () => {
  assert.deepEqual(PROFILE_ORDER, ['low', 'medium', 'high', 'ultra']);
  assert.equal(DEFAULT_PROFILE, 'high');
  for (let i = 1; i < PROFILE_ORDER.length; i++) {
    const a = PROFILES[PROFILE_ORDER[i - 1]]; const b = PROFILES[PROFILE_ORDER[i]];
    assert.ok(b.maxPixels >= a.maxPixels && b.shadowMapSize >= a.shadowMapSize && b.anisotropy >= a.anisotropy);
  }
  assert.equal(PROFILES.low.shadows, false);
  assert.ok(PROFILES.high.shadows);
});

test('pixel ratio never exceeds the device, the profile cap or the pixel budget', () => {
  const hi = PROFILES.high;
  assert.equal(pixelRatioFor(hi, 1, 1280, 800), 1, 'a non-Retina screen stays at 1');
  const pr = pixelRatioFor(hi, 2, 1470, 956); // MacBook Air full screen
  assert.ok(pr < 2 && pr > 1.3, `${pr}`);
  assert.ok(1470 * 956 * pr * pr <= hi.maxPixels + 1);
  assert.equal(pixelRatioFor(PROFILES.low, 2, 800, 500), 1);
  assert.equal(pixelRatioFor(PROFILES.ultra, 2, 800, 500), 2, 'small windows get full Retina on Ultra');
  assert.ok(pixelRatioFor(hi, 2, 6000, 4000) >= 0.5, 'never below 0.5');
});

test('unknown profile names fall back to High', () => {
  assert.equal(profileOf('potato'), PROFILES.high);
  assert.equal(profileOf(undefined), PROFILES.high);
});

test('post-processing: Low renders straight to the screen, the others grade, High and Ultra add bloom', () => {
  assert.equal(PROFILES.low.post, false);
  for (const k of ['medium', 'high', 'ultra']) assert.equal(PROFILES[k].post, true, k);
  assert.equal(PROFILES.medium.bloom, null);
  for (const k of ['high', 'ultra']) assert.ok(PROFILES[k].bloom.threshold > 2, `${k}: only the sky and sun glow`);
});

test('the colour grade is warmer at golden hour than at midday', async () => {
  const { gradeFor } = await import('../js/graphics/PostProcessing.js');
  const noon = gradeFor(12 * 60).warmth;
  assert.ok(gradeFor(7 * 60).warmth > noon + 0.04, 'morning');
  assert.ok(gradeFor(18 * 60 + 30).warmth > noon + 0.04, 'evening');
});

test('ambient occlusion is Ultra only (it re-renders the scene), at a fraction of the screen size', () => {
  for (const k of ['low', 'medium', 'high']) assert.equal(PROFILES[k].ao, undefined, k);
  const ao = PROFILES.ultra.ao;
  assert.ok(ao.scale > 0 && ao.scale <= 1 && ao.radius > 0 && ao.strength >= 1);
});

test('tree crowns: shaded darker underneath than on top; the near crown has more detail than the far one', async () => {
  const { crownGeometry } = await import('../js/world/foliage.js');
  for (const kind of ['near', 'far']) {
    const g = crownGeometry(kind);
    const p = g.attributes.position; const c = g.attributes.color;
    assert.ok(c && c.count === p.count, kind);
    let lo = { y: Infinity, v: 0 }; let hi = { y: -Infinity, v: 0 };
    for (let i = 0; i < p.count; i++) {
      if (p.getY(i) < lo.y) lo = { y: p.getY(i), v: c.getX(i) };
      if (p.getY(i) > hi.y) hi = { y: p.getY(i), v: c.getX(i) };
    }
    assert.ok(hi.v > lo.v * 1.3, `${kind}: top ${hi.v} vs underside ${lo.v}`);
  }
  assert.ok(crownGeometry('near').attributes.position.count > 4 * crownGeometry('far').attributes.position.count);
});
