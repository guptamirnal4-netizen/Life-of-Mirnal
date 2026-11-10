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
