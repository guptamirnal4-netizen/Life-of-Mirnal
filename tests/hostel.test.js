import test from 'node:test';
import assert from 'node:assert/strict';
import { BITS_CAMPUS as D } from '../data/bits-campus.js';

globalThis.document ??= { addEventListener() {}, createElement: () => ({ getContext: () => null }) };
globalThis.window ??= { addEventListener() {} };
const { Hostel, FH, FLOORS, WALK_IN, entranceOrder } = await import('../js/world/hostel.js');

const krishna = () => {
  const b = D.buildings.find((x) => x.name === 'Krishna Bhawan');
  return { ...b, outer: b.outer.map((p) => [...p]), holes: b.holes.map((h) => h.map((p) => [...p])) };
};
const make = () => new Hostel({ colliders: [], interactables: [] }, krishna(), { mine: true });

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

test('every courtyard Bhawan can be laid out: entrance on a long side facing a road, rooms fill every corridor', () => {
  assert.equal(WALK_IN.length, 7);
  for (const name of WALK_IN) {
    const b0 = D.buildings.find((x) => x.name === name);
    assert.ok(b0, name);
    const b = { ...b0, outer: b0.outer.map((p) => [...p]), holes: b0.holes.map((h) => h.map((p) => [...p])) };
    const mine = name === 'Krishna Bhawan';
    const H = new Hostel({ colliders: [], interactables: [] }, b, { mine, outer: mine ? b.outer : entranceOrder(b.outer, D.roads) });
    assert.ok(H.W > 40 && H.L >= H.W - 1e-6, `${name}: ${H.W.toFixed(1)} × ${H.L.toFixed(1)}`);
    assert.equal(H.court.length, b0.holes.length >= 2 ? 2 : 1, name);
    for (const r of H.court) assert.ok(r.u1 - r.u0 > 20 && r.v1 - r.v0 > 20, `${name}: courtyard big enough`);
    assert.equal(!!H.spaces.find((s) => s.id === 'hostelroom'), mine, `${name}: your room only in your Bhawan`);
    for (const [key, segs] of Object.entries(H.segs)) {
      const w = H.wings[key[0]];
      for (let i = 1; i < segs.length; i++) assert.ok(segs[i].t0 >= segs[i - 1].t1 - 1e-6, `${name} ${key}: overlap`);
      assert.ok(segs.at(-1).t1 <= w.tb[1] + 1e-6, `${name} ${key}: past the end`);
      for (const x of segs) if (x.type === 'locked') assert.ok(x.t1 - x.t0 > 3, `${name} ${key}: room too narrow`);
    }
    // the squared-up outline stays within 4 m of every OSM corner
    for (const p of b0.outer) assert.ok(b.outer.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 4), `${name}: corner moved`);
  }
});

test('the comb-shaped Bhawans: a spine one wing deep with four arms, laid out like the others', async () => {
  const { combPlan, COMB, CombHostel } = await import('../js/world/comb-hostel.js');
  assert.deepEqual(Object.values(COMB), ['Ashok Bhawan', 'Rana Pratap Bhawan', 'Malviya Bhawan']);
  for (const name of Object.keys(COMB)) {
    const b0 = D.buildings.find((x) => x.name === name);
    const plan = combPlan(b0.outer);
    assert.equal(plan.arms.length, 4, name);
    for (const a of plan.arms) assert.ok(a.v1 - a.v0 > 6 && a.u1 > 40, `${name}: arm ${JSON.stringify(a)}`);
    // every edge runs along u or v
    plan.pts.forEach((p, i) => { const q = plan.pts[(i + 1) % plan.pts.length]; assert.ok(Math.abs(p[0] - q[0]) < 1e-6 || Math.abs(p[1] - q[1]) < 1e-6, `${name}: edge ${i}`); });
    const b = { ...b0, outer: b0.outer.map((p) => [...p]), holes: [] };
    const H = new CombHostel({ colliders: [], interactables: [] }, b);
    assert.equal(H.name, COMB[name]);
    for (const t of ['lobby', 'stair', 'wash', 'common']) assert.ok(H.spaces.some((s) => s.type === t), `${name}: ${t}`);
    for (const [key, segs] of Object.entries(H.segs)) for (let i = 1; i < segs.length; i++) assert.ok(segs[i].t0 >= segs[i - 1].t1 - 1e-6, `${name} ${key}: overlap`);
    // the squared-up outline stays close to the OSM one: every new corner is within 4 m of the OSM outline
    // (as for Krishna; Malviya's spine is up to 11.5 m deep in places and becomes one wing, 7.85 m)
    const near = (p) => b0.outer.some((a, i) => { const c = b0.outer[(i + 1) % b0.outer.length]; const dx = c[0] - a[0]; const dz = c[1] - a[1]; const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz))); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz) < 4; });
    for (const p of b.outer) assert.ok(near(p), `${name}: corner ${p} moved`);
    assert.equal(H.roomAt(...(() => { const p = H.world(6, H.ve); return [p.x, p.z]; })()), 'hostel');
  }
});
