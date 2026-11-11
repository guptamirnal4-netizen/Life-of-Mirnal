import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createState, DEFAULT_SETTINGS, TIME_SPEEDS, FAST_FORWARD } from '../js/core/state.js';
import { buildDay, advanceClock, currentSlot } from '../js/core/timetable.js';
import { serialize, deserialize } from '../js/core/save.js';

// Player listens on document/window; a stub is enough outside the browser.
globalThis.document ??= { addEventListener() {} };
globalThis.window ??= { addEventListener() {} };
const { Player, MOVE } = await import('../js/world/player.js');

test('new games run at Normal speed: one game minute every 15 real seconds', () => {
  assert.equal(DEFAULT_SETTINGS.timeScale, TIME_SPEEDS.normal);
  assert.equal(1 / TIME_SPEEDS.normal, 15);
  assert.equal(createState().settings.timeScale, 1 / 15);
});

test('the clock advances by speed × seconds, and Z multiplies it by 4', () => {
  const slots = buildDay(13);
  const t0 = slots[0].start + 1;
  // 20 frames of 50 ms = 1 real second
  let t = t0;
  for (let i = 0; i < 20; i++) t = advanceClock(slots, t, 0.05, TIME_SPEEDS.normal);
  assert.ok(Math.abs(t - t0 - 1 / 15) < 1e-9);
  t = t0;
  for (let i = 0; i < 20; i++) t = advanceClock(slots, t, 0.05, TIME_SPEEDS.normal, FAST_FORWARD);
  assert.ok(Math.abs(t - t0 - 4 / 15) < 1e-9);
});

test('a long frame is capped, so a stall cannot jump the clock', () => {
  const slots = buildDay(13);
  const t0 = slots[0].start + 1;
  assert.ok(Math.abs(advanceClock(slots, t0, 5, 1) - (t0 + 0.05)) < 1e-9);
});

test('the clock stops at the next slot boundary instead of skipping a slot', () => {
  const slots = buildDay(13);
  const end = slots[0].end;
  const t = advanceClock(slots, end - 0.001, 0.05, 1000, FAST_FORWARD);
  assert.equal(t, end);
  assert.equal(currentSlot(slots, t).id, slots[1].id);
  // Every slot is visited in order even at an absurd speed.
  const seen = [];
  let c = slots[0].start;
  while (c < slots.at(-1).end) {
    const id = currentSlot(slots, c).id;
    if (seen.at(-1) !== id) seen.push(id);
    c = advanceClock(slots, c, 0.05, 1000, FAST_FORWARD);
  }
  assert.deepEqual(seen, slots.map((s) => s.id));
});

test('save migration: old defaults 1.2 and 0.35 become Normal, chosen speeds are kept, junk is repaired', () => {
  const load = (timeScale) => {
    const s = createState();
    s.settings.timeScale = timeScale;
    s.classNum = 5;
    return deserialize(serialize(s));
  };
  assert.equal(load(1.2).settings.timeScale, TIME_SPEEDS.normal);
  assert.equal(load(1.2).classNum, 5);
  assert.equal(load(0.35).settings.timeScale, TIME_SPEEDS.normal);
  for (const v of [0.2, 0.6, 1, 0.8]) assert.equal(load(v).settings.timeScale, v);
  for (const v of ['fast', null, -1, 50, NaN]) assert.equal(load(v).settings.timeScale, TIME_SPEEDS.normal);
  const s = createState();
  delete s.settings.timeScale;
  assert.equal(deserialize(serialize(s)).settings.timeScale, TIME_SPEEDS.normal);
});

function makePlayer() {
  const p = new Player(new THREE.PerspectiveCamera(), {});
  p.setClass(13);
  p.enabled = true;
  p.place(new THREE.Vector3(0, 0, 0), 0);
  return p;
}
const run = (p, seconds, colliders = []) => { for (let i = 0; i < seconds * 60; i++) p.update(1 / 60, colliders); };

test('W runs by default and eases in and out', () => {
  const p = makePlayer();
  p.keys.add('KeyW');
  p.update(1 / 60, []);
  assert.ok(p.speedNow > 0 && p.speedNow < MOVE.walk, 'accelerates, not instant');
  run(p, 2);
  assert.ok(Math.abs(p.speedNow - MOVE.run) < 1e-6);
  assert.equal(p.gait(), 'run');
  p.keys.delete('KeyW');
  p.update(1 / 60, []);
  assert.ok(p.speedNow > 0, 'slows down smoothly');
  run(p, 1);
  assert.equal(p.speedNow, 0);
  assert.equal(p.gait(), 'idle');
});

test('Shift + W walks', () => {
  const p = makePlayer();
  p.keys.add('KeyW');
  p.keys.add('ShiftLeft');
  run(p, 2);
  assert.ok(Math.abs(p.speedNow - MOVE.walk) < 1e-6);
  assert.equal(p.gait(), 'walk');
  const z0 = p.pos.z;
  run(p, 1);
  assert.ok(Math.abs(z0 - p.pos.z - MOVE.walk) < 0.01, 'covers MOVE.walk metres in a second');
  assert.ok(MOVE.run > MOVE.walk * 2);
});

test('the cycle is its own mode: builds up speed, tops out at bikeMax, Shift and Space do nothing', () => {
  const p = makePlayer();
  p.bike = true;
  p.keys.add('KeyW');
  run(p, 1);
  assert.ok(p.speedNow > 1.5 && p.speedNow < 3, `gradual acceleration (got ${p.speedNow})`);
  assert.ok(MOVE.bikeMax > MOVE.run);
  p.keys.add('ShiftLeft');
  p.keys.add('Space');
  run(p, 6);
  assert.equal(p.speedNow, MOVE.bikeMax);
  assert.equal(p.gait(), 'ride');
  assert.equal(p.pos.y, 0, 'no jumping on the cycle');
});

test('on the cycle S brakes, A/D steer, and letting go coasts', () => {
  const p = makePlayer();
  p.bike = true;
  p.keys.add('KeyW');
  run(p, 5);
  p.keys.delete('KeyW');
  run(p, 0.5);
  const coasting = p.speedNow;
  assert.ok(coasting > 5, 'coasts instead of stopping dead');
  p.keys.add('KeyS');
  run(p, 1.5);
  assert.equal(p.speedNow, 0);
  p.keys.delete('KeyS');
  p.keys.add('KeyW');
  run(p, 2);
  const yaw0 = p.yaw;
  p.keys.add('KeyA');
  run(p, 0.5);
  assert.ok(p.yaw > yaw0, 'A steers left');
  assert.ok(p.steer === 1);
});

test('getting off the cycle starts you from a standstill on foot', () => {
  const p = makePlayer();
  p.bike = true;
  p.keys.add('KeyW');
  run(p, 4);
  p.bike = false;
  assert.equal(p.speedNow, 0);
  run(p, 2);
  assert.ok(Math.abs(p.speedNow - MOVE.run) < 1e-6);
});

test('walls stop you on foot and on the cycle; the cycle is wider', () => {
  const wall = { minX: -5, maxX: 5, minZ: -3.1, maxZ: -3, minY: 0, maxY: 3, walkable: false, enabled: true };
  const p = makePlayer();
  p.keys.add('KeyW');
  run(p, 5, [wall]);
  assert.ok(p.pos.z >= -3 + MOVE.footRadius - 1e-6, 'never inside the wall');
  assert.ok(p.speedNow < 0.2, 'stopped by the wall');
  const b = makePlayer();
  b.bike = true;
  b.keys.add('KeyW');
  run(b, 6, [wall]);
  assert.ok(b.pos.z >= -3 + MOVE.bikeRadius - 1e-6);
  assert.ok(b.speedNow < 1);
});

test('nothing moves while the game is paused', () => {
  const p = makePlayer();
  p.keys.add('KeyW');
  run(p, 1);
  p.enabled = false;
  const z = p.pos.z;
  run(p, 1);
  assert.equal(p.pos.z, z);
  assert.equal(p.speedNow, 0);
});
