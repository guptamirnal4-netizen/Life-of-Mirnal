import test from 'node:test';
import assert from 'node:assert/strict';
import { BITS_CAMPUS as D } from '../data/bits-campus.js';

globalThis.document ??= { addEventListener() {}, createElement: () => ({ getContext: () => null }) };
globalThis.window ??= { addEventListener() {} };
const { Hostel, FH, FLOORS } = await import('../js/world/hostel.js');

const krishna = () => {
  const b = D.buildings.find((x) => x.name === 'Krishna Bhawan');
  return { ...b, outer: b.outer.map((p) => [...p]), holes: b.holes.map((h) => h.map((p) => [...p])) };
};
const make = () => new Hostel({ colliders: [], interactables: [] }, krishna());

test('Krishna Bhawan has a ground floor and a first floor under a walkable roof', () => {
  const H = make();
  assert.equal(FLOORS, 2);
  assert.equal(H.b.h, 2 * FH);
});

test('the squared-up outline stays close to the OSM one', () => {
  const osm = krishna();
  const H = make();
  // every OSM corner is within 4 m of the new rectangle's corresponding corner
  osm.outer.forEach((p, i) => assert.ok(Math.hypot(p[0] - H.b.outer[i][0], p[1] - H.b.outer[i][1]) < 4, `corner ${i}`));
  assert.ok(H.W > 60 && H.W < 66 && H.L > 160 && H.L < 166, `${H.W} × ${H.L}`);
});

test('two courtyards inside the building, separated by the middle wing', () => {
  const H = make();
  const [c1, c2] = H.court;
  assert.ok(c1.v1 < H.mc0 && H.mc1 < c2.v0, 'middle wing between the courtyards');
  for (const c of H.court) assert.ok(c.u0 > 0 && c.u1 < H.W && c.v0 > 0 && c.v1 < H.L);
});

test('the entrance is on the west face, near the middle; lobby, stairs and washroom sit beside it', () => {
  const H = make();
  assert.ok(Math.abs(H.ve - H.L / 2) < 3.5);
  const at = (type, k = 0) => H.spaces.find((s) => s.type === type && s.k === k);
  assert.equal(at('lobby').wing, 'W');
  assert.equal(at('stair').i, at('lobby').i + 2);
  assert.equal(at('wash').i, at('stair').i + 1);
  assert.equal(H.spaces.find((s) => s.id === 'hostelroom').i, at('lobby').i - 1);
});

test('spaces fit their wing and never overlap', () => {
  const H = make();
  for (const s of H.spaces) {
    const w = H.wings[s.wing];
    assert.ok(s.i >= 0 && s.i + s.n <= w.nb, `${s.type} fits in wing ${s.wing}`);
    assert.ok(s.k >= 0 && s.k < FLOORS);
  }
  for (const a of H.spaces) for (const b of H.spaces) {
    if (a === b || a.wing !== b.wing || a.k !== b.k) continue;
    assert.ok(a.i + a.n <= b.i || b.i + b.n <= a.i, `${a.type} and ${b.type} overlap`);
  }
});

test('every floor has a way up: the main stair reaches the roof, the second stair the first floor', () => {
  const H = make();
  const main = H.spaces.filter((s) => s.type === 'stair' && s.roof);
  const second = H.spaces.filter((s) => s.type === 'stair' && !s.roof);
  assert.deepEqual(main.map((s) => s.k), [0, 1]);
  assert.equal(main[0].top, FLOORS);
  assert.deepEqual(second.map((s) => s.k), [0, 1]);
  assert.equal(second[0].top, FLOORS - 1);
  assert.equal(H.b.roofHoles.length, 1);
});

test('local ↔ world coordinates round-trip', () => {
  const H = make();
  for (const [u, v] of [[0, 0], [10, 50], [H.W, H.L]]) {
    const p = H.world(u, v);
    const [u2, v2] = H.local(p.x, p.z);
    assert.ok(Math.abs(u - u2) < 1e-9 && Math.abs(v - v2) < 1e-9);
  }
});

test('inside, courtyard and outside are told apart; no trees inside the building', () => {
  const H = make();
  const pt = (u, v) => H.world(u, v);
  const corridor = pt(6.15, H.ve);
  const court = pt((H.court[0].u0 + H.court[0].u1) / 2, (H.court[0].v0 + H.court[0].v1) / 2);
  const outside = pt(-10, H.ve);
  assert.equal(H.roomAt(corridor.x, corridor.z), 'hostel');
  assert.equal(H.roomAt(court.x, court.z), null);
  assert.equal(H.roomAt(outside.x, outside.z), null);
  assert.equal(H.treeOk(corridor.x, corridor.z), false);
  const edge = pt(H.court[0].u0 + 1.5, H.court[0].v0 + 20);
  assert.equal(H.treeOk(edge.x, edge.z), false, 'arcade edges stay clear');
});
