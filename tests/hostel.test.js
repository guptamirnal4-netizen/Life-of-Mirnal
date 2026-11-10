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
  const same = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} vs ${b}`);
  same(at('stair').t0, at('lobby').t1);
  same(at('wash').t0, at('stair').t1);
  same(H.spaces.find((s) => s.id === 'hostelroom').t1, at('lobby').t0);
});

test('every corridor is filled end to end with spaces and rooms that never overlap', () => {
  const H = make();
  for (const [key, segs] of Object.entries(H.segs)) {
    const w = H.wings[key[0]];
    for (const x of segs) assert.ok(x.t0 >= w.tb[0] - 1e-9 && x.t1 <= w.tb[1] + 1e-9, `${key} ${x.type} fits`);
    for (let i = 1; i < segs.length; i++) assert.ok(segs[i].t0 >= segs[i - 1].t1 - 1e-9, `${key}: ${segs[i - 1].type} and ${segs[i].type} overlap`);
    const used = segs.reduce((a, x) => a + (x.t1 - x.t0), 0);
    assert.ok(used > w.tb[1] - w.tb[0] - 3.1, `${key}: no long blank walls`);
  }
});

test('student rooms are wide (about 5 m), so there are fewer doors down each corridor', () => {
  const H = make();
  const rooms = Object.values(H.segs).flat().filter((x) => x.type === 'locked' || x.type === 'room');
  const widths = rooms.map((x) => x.t1 - x.t0);
  assert.ok(Math.min(...widths) >= 3.4, `narrowest ${Math.min(...widths)}`);
  assert.ok(widths.reduce((a, b) => a + b, 0) / widths.length > 4.8);
  assert.ok(rooms.length < 180, `${rooms.length} rooms`);
});

test('the guide knows where the important places are', () => {
  const H = make();
  // the legend fills in as the Bhawan is built; the plan already knows the stairs, lobby and washrooms
  assert.ok(H.spaces.some((s) => s.type === 'stair' && s.roof));
  for (const sp of H.spaces) {
    const r = H.spaceRect(sp);
    assert.ok(r.u0 >= 0 && r.u1 <= H.W && r.v0 >= 0 && r.v1 <= H.L, `${sp.type} inside the building`);
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

test('inside, courtyard and outside are told apart; no scattered trees in the building or its courtyards', () => {
  const H = make();
  const pt = (u, v) => H.world(u, v);
  const corridor = pt(6.15, H.ve);
  const court = pt((H.court[0].u0 + H.court[0].u1) / 2, (H.court[0].v0 + H.court[0].v1) / 2);
  const outside = pt(-10, H.ve);
  assert.equal(H.roomAt(corridor.x, corridor.z), 'hostel');
  assert.equal(H.roomAt(court.x, court.z), null);
  assert.equal(H.roomAt(outside.x, outside.z), null);
  assert.equal(H.treeOk(corridor.x, corridor.z), false);
  assert.equal(H.treeOk(court.x, court.z), false, 'the courtyards are concrete playgrounds: only the two planted shade trees');
  assert.equal(H.treeOk(outside.x - 30, outside.z), true, 'trees are fine away from the Bhawan');
});
