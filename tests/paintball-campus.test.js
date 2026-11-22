// Campus Royale: the exported campus geometry, the shared movement / paintball simulation on it, the verified
// landing and supply registries, the zone, landing assignment, loot and inventory rules. Pure Node.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { decodeGeometry, hashBytes, encodeGeometry } from '../js/paintball/geometry.js';
import { stepCampus, sweepArena } from '../js/paintball/sim.js';
import { readSpots, validateSpot, SPOT_RULES, planZone, zoneAt, ZONE_PHASES, zoneLength, assignLandings, spawnCrates, pickFinal, pickAirdrop, ROYALE } from '../js/paintball/royale.js';
import { pickupPlan, gearPaint, bombPaint, BOMB, ITEMS, AMMO_MAX, CARRY, rollLoot, rollAirdrop } from '../js/paintball/items.js';
import { rng } from '../server/logic/match.js';
import { loadCampus } from '../server/geo.js';
import { CAMPUS } from '../js/paintball/arena.js';

const DATA = new URL('../js/paintball/data/', import.meta.url);
const header = JSON.parse(fs.readFileSync(new URL('campus-collision.json', DATA), 'utf8'));
const bytes = new Uint8Array(zlib.gunzipSync(fs.readFileSync(new URL('campus-collision.bin', DATA))));
const { geo, spots: rawSpots, ms } = loadCampus();
const spots = readSpots(rawSpots);
const probes = JSON.parse(fs.readFileSync(new URL('campus-probes.json', DATA), 'utf8'));

test('the committed campus export matches its header hash (re-run dev/export-campus-collision.mjs after campus changes)', () => {
  assert.equal(hashBytes(bytes), header.hash);
  assert.equal(header.bytes, bytes.length);
  assert.equal(geo.n, header.counts.boxes);
  assert.equal(geo.m, header.counts.trees);
  assert.ok(geo.n > 100000 && geo.m > 5000, 'campus geometry looks complete');
  assert.equal(probes.hash, header.hash, 'probes recorded on the same export');
  assert.equal(rawSpots.geoHash, header.hash, 'royale-spots.json built for this export');
  assert.ok(ms < 5000, `loading took ${ms} ms`);
  assert.equal(CAMPUS.geo, geo);
});

test('encode → decode round trip (cm quantised, trees as circles, sunken courts in the header)', () => {
  const boxes = [{ minX: -1.234, maxX: 2.5, minZ: 10, maxZ: 10.2, minY: -4.5, maxY: -1.3, walkable: false }, { minX: 0, maxX: 1, minZ: 0, maxZ: 1, minY: 0, maxY: 0.15, walkable: true }];
  const trees = [{ x: 5, z: 6, r: 0.18, y0: 0, h: 2.5 }];
  const b = encodeGeometry(boxes, trees);
  const g = decodeGeometry(b, { hash: hashBytes(b), boundary: [[-50, -50], [50, -50], [50, 50], [-50, 50]], pits: [{ y: -4.5, poly: [[20, 20], [30, 20], [30, 30], [20, 30]] }] });
  assert.equal(g.n, 2); assert.equal(g.m, 1);
  assert.equal(g.groundAt(25, 25), -4.5); assert.equal(g.groundAt(0, 0), 0);
  assert.ok(Math.abs(g.floorAt(0.5, 0.5, 0) - 0.15) < 1e-6);
  assert.ok(g.blockedAt(5, 6.3, 0), 'a trunk blocks');
  assert.equal(hashBytes(encodeGeometry([...boxes].reverse(), trees)), hashBytes(b), 'order does not change the export');
});

// steer towards each waypoint in turn (as the browser tests and the exporter do), walking pace
function follow(start, pts, { maxSteps = 6000 } = {}) {
  const p = { x: start[0], y: start[1], z: start[2], vy: 0 };
  for (const [x, z] of pts) {
    let still = 0; let last = null;
    for (let k = 0; k < maxSteps; k++) {
      const dx = x - p.x; const dz = z - p.z; const d = Math.hypot(dx, dz);
      if (d < 0.25) break;
      stepCampus(p, { f: 1, s: 0, yaw: Math.atan2(-dx, -dz), run: false }, 1 / 30, geo);
      if (last && Math.hypot(p.x - last.x, p.z - last.z) < 0.002) { if (++still > 30) break; } else still = 0;
      last = { x: p.x, z: p.z };
    }
  }
  for (let k = 0; k < 30; k++) stepCampus(p, { f: 0, s: 0, yaw: 0 }, 1 / 30, geo);
  return p;
}

for (const pr of probes.probes.filter((q) => !q.expect?.wall)) {
  test(`same floor as the life-sim player: ${pr.name}`, () => {
    const pts = pr.waypoints || pr.path.slice(1).map(([x, , z]) => [x, z]);
    const p = follow(pr.start, pts);
    assert.ok(Math.abs(p.y - pr.end[1]) < 0.12, `ended at y ${p.y.toFixed(2)}, the life-sim player at ${pr.end[1]}`);
    assert.ok(Math.hypot(p.x - pr.end[0], p.z - pr.end[2]) < 1.2, `ended ${Math.hypot(p.x - pr.end[0], p.z - pr.end[2]).toFixed(2)} m from the life-sim player`);
    if (pr.expect?.y !== undefined) assert.ok(Math.abs(p.y - pr.expect.y) < 0.12, `expected y ${pr.expect.y}, got ${p.y}`);
  });
}

test('a building wall stops a runner and a paintball; a paintball across open ground flies on', () => {
  // the Library foyer's north wall (tests/browser/library.mjs): run straight at it for 1.5 s
  const wall = probes.probes.find((q) => q.expect?.wall);
  const target = wall.waypoints[0];
  const p = { x: wall.start[0], y: wall.start[1], z: wall.start[2], vy: 0 };
  const yaw = Math.atan2(0, -(target[1] - p.z)); // straight at it (no sliding along it towards a doorway)
  for (let k = 0; k < 45; k++) stepCampus(p, { f: 1, s: 0, yaw, run: true }, 1 / 30, geo);
  assert.ok(Math.abs(p.z - wall.end[2]) < 0.4 && Math.abs(p.x - wall.start[0]) < 0.3, `stopped at z ${p.z.toFixed(2)}, the life-sim player at ${wall.end[2]}`);
  assert.ok(Math.abs(p.y - wall.end[1]) < 0.05);
  // a paintball from where the runner stopped towards the waypoint behind the wall hits a solid first
  const a = { x: p.x, y: p.y + 1.5, z: p.z }; const b = { x: p.x, y: p.y + 1.5, z: target[1] };
  const h = geo.sweep(a, b);
  assert.ok(h && h.kind === 'solid' && h.t < 0.5, `paintball through the wall ${JSON.stringify(h)}`);
  assert.ok(geo.blocked(a, b));
  // open ground on the Med-C cricket ground: nothing in the way
  assert.equal(sweepArena({ x: 380, y: 1.5, z: 644 }, { x: 410, y: 1.5, z: 644 }, CAMPUS), null);
});

test('the sunken NAB and Rotunda courts are lower ground; paintballs fall into them and land on their floors', () => {
  const nab = header.pits.find((q) => q.y === -4.5); const deep = header.pits.find((q) => q.y === -9);
  assert.ok(nab && deep, 'pits exported');
  const inside = (poly) => { const pt = spots.drops.concat(spots.supplies).find((s) => Math.abs(s.y - (poly === nab ? -4.5 : -9)) < 0.01); return pt; };
  const s = inside(nab); assert.ok(s, 'a registry spot on the -4.5 court');
  assert.equal(geo.groundAt(s.x, s.z) <= -4.5, true);
  const h = geo.sweep({ x: s.x, y: s.y + 6, z: s.z }, { x: s.x, y: s.y - 1, z: s.z });
  assert.ok(h && Math.abs(s.y + 6 - 7 * h.t - s.y) < 0.05, `a dropped paintball lands on the court floor ${JSON.stringify(h)}`);
  const d = inside(deep); assert.ok(d, 'a registry spot on the -9 court');
});

test('every landing spot, squad slot and supply spot in the registry is valid; final-zone centres are outdoor drops', () => {
  assert.ok(spots.drops.length > 500 && spots.supplies.length > 300, `${spots.drops.length} drops, ${spots.supplies.length} supplies`);
  for (const d of spots.drops) {
    const v = validateSpot(geo, d.x, d.z, d.y, SPOT_RULES.drop); assert.ok(v.ok, `drop ${d.id} ${v.why}`);
    for (const s of d.slots) { const w = validateSpot(geo, s.x, s.z, s.y, SPOT_RULES.slot); assert.ok(w.ok, `drop ${d.id} slot ${w.why}`); }
  }
  for (const s of spots.supplies) { const v = validateSpot(geo, s.x, s.z, s.y, SPOT_RULES.supply); assert.ok(v.ok, `supply ${s.id} ${v.why}`); }
  assert.ok(spots.supplies.filter((s) => s.indoor).length > 100, 'supplies inside buildings');
  assert.ok(spots.supplies.some((s) => s.y > 3) && spots.supplies.some((s) => s.y < -4), 'supplies on upper floors and in the sunken courts');
  for (const i of rawSpots.finals) { const d = spots.drops[i]; assert.ok(!d.indoor && validateSpot(geo, d.x, d.z, d.y, SPOT_RULES.final).ok); }
  // the validator rejects bad spots
  assert.equal(validateSpot(geo, 2000, 2000, 0).ok, false);
  const wall = probes.probes.find((q) => q.expect?.wall);
  const w = wall.waypoints[0]; const e = wall.end; const L = Math.hypot(w[0] - e[0], w[1] - e[2]);
  assert.equal(validateSpot(geo, e[0] + ((w[0] - e[0]) / L) * 0.5, e[2] + ((w[1] - e[2]) / L) * 0.5, 0.6, { clear: 0.1 }).ok, false, 'inside the Library foyer wall');
  assert.equal(validateSpot(geo, 128 + 60, 823, 0).ok, false, 'in the Shiv Ganga canal');
});

test('zone: circles nest and contain the final spot; timed phases; paint per second rises; ~10 minutes', () => {
  for (let s = 1; s < 40; s++) {
    const rand = rng(s);
    const final = pickFinal(rawSpots, rand); const f = { x: final[0], z: final[1] };
    const c = planZone(rand, { centre: CAMPUS.centre, startR: 1100, final: f });
    assert.equal(c.length, ZONE_PHASES.length + 1);
    for (let i = 1; i < c.length; i++) {
      assert.ok(Math.hypot(c[i].x - c[i - 1].x, c[i].z - c[i - 1].z) <= c[i - 1].r - c[i].r + 1e-6, 'circle leaves the previous one');
      assert.ok(Math.hypot(c[i].x - f.x, c[i].z - f.z) <= c[i].r + 1e-6, 'final spot outside a circle');
    }
  }
  const c = planZone(rng(3), { centre: CAMPUS.centre, startR: 1100, final: { x: 100, z: 500 } });
  const z0 = zoneAt(c, 0); assert.equal(z0.r, 1100); assert.equal(z0.shrinking, false); assert.equal(z0.phase, 1);
  const z1 = zoneAt(c, ZONE_PHASES[0].wait + ZONE_PHASES[0].shrink / 2); assert.ok(z1.shrinking && z1.r < 1100 && z1.r > 600);
  const end = zoneAt(c, zoneLength() + 1); assert.ok(end.done && end.r === 0);
  const len = zoneLength(); assert.ok(len > 9 * 60 && len < 12 * 60, `zone length ${len}`);
  assert.ok(len < ROYALE.hardCap);
  for (let i = 1; i < ZONE_PHASES.length; i++) assert.ok(ZONE_PHASES[i].dps > ZONE_PHASES[i - 1].dps);
});

test('landing: picks honoured (taken spot → nearest free), squads land together, the rest far apart', () => {
  const rand = rng(9);
  const pick = spots.drops.find((d) => d.slots.length >= 3);
  const groups = [{ key: 0, members: ['a1', 'a2', 'a3'], choice: pick.id }, { key: 1, members: ['b1'], choice: pick.id }, { key: 2, members: ['c1'], choice: null }, { key: 3, members: ['d1'], choice: null }];
  const L = assignLandings(spots.drops, groups, rand);
  assert.equal(L.size, 6);
  const a = ['a1', 'a2', 'a3'].map((id) => L.get(id));
  assert.equal(a[0].drop, pick.id);
  for (const p of a) assert.ok(Math.hypot(p.x - pick.x, p.z - pick.z) < 8, 'squad spread out');
  assert.equal(new Set(a.map((p) => `${p.x},${p.z}`)).size, 3, 'two squad members on one spot');
  assert.notEqual(L.get('b1').drop, pick.id, 'two groups on one drop');
  const c = L.get('c1'); const d = L.get('d1');
  assert.ok(Math.hypot(c.x - d.x, c.z - d.z) > 200 && Math.hypot(c.x - pick.x, c.z - pick.z) > 200, 'auto-placed players not far apart');
});

test('supply crates: a random share of supply spots, 2–4 items each from the table, blasters with a pack; the special supply drop', () => {
  const a = spawnCrates(spots.supplies, rng(1)); const b = spawnCrates(spots.supplies, rng(2));
  assert.ok(a.length > spots.supplies.length * 0.4 && a.length < spots.supplies.length * 0.7, `${a.length} crates`);
  assert.notDeepEqual(a.map((x) => x.spot), b.map((x) => x.spot), 'crates not randomised per match');
  const all = a.flatMap((c) => c.items);
  for (const c of a) assert.ok(c.items.length >= 2 && c.items.length <= 4);
  for (const [item] of all) assert.ok(ITEMS[item], item);
  for (let i = 0; i < 200; i++) { const r = rollLoot(rng(i)); if (r[0][0].startsWith('blaster:')) assert.ok(r[1][0].startsWith('ammo:')); }
  const kinds = new Set(all.map(([item]) => ITEMS[item].kind)); for (const k of ['blaster', 'ammo', 'throw', 'kit', 'gear', 'refill', 'gadget']) assert.ok(kinds.has(k), k);
  for (const it of Object.values(ITEMS)) for (const f of ['id', 'name', 'category', 'spawn', 'qty', 'pickup', 'respawn']) assert.ok(it[f] !== undefined, `${it.id} has no ${f}`);
  const drop = rollAirdrop(rng(4)); assert.ok(drop.some(([i]) => i === 'shield') && drop.some(([i]) => /3$/.test(i)));
  const circle = { x: 140, z: 500, r: 350 };
  for (let i = 0; i < 20; i++) { const d = pickAirdrop(spots.drops, circle, rng(i)); assert.ok(!d.indoor && Math.hypot(d.x - circle.x, d.z - circle.z) < circle.r * 0.6); }
});

test('inventory limits: two blasters (a third swaps with the one in hand), paintball caps, bomb and kit caps, gear tiers', () => {
  const inv = { primary: 'standard', secondary: '', slot: 0, ammo: { standard: 0 }, paintbomb: 0, smoke: 0, wipes: 0, kit: 0, gearMask: 0, gearVest: 2 };
  assert.deepEqual(pickupPlan(inv, 'blaster:rapid'), { take: 1, drop: [], slot: 1 });
  inv.secondary = 'rapid';
  const sw = pickupPlan(inv, 'blaster:precision'); assert.equal(sw.swap, true); assert.deepEqual(sw.drop, [['blaster:standard', 1]]);
  inv.ammo.standard = AMMO_MAX.standard - 10;
  assert.equal(pickupPlan(inv, 'ammo:standard', 40).take, 10);
  inv.ammo.standard = AMMO_MAX.standard; assert.equal(pickupPlan(inv, 'ammo:standard', 40).reason, 'full');
  inv.paintbomb = CARRY.paintbomb; assert.equal(pickupPlan(inv, 'paintbomb').reason, 'full');
  inv.kit = 1; assert.equal(pickupPlan(inv, 'kit').take, 1);
  assert.equal(pickupPlan(inv, 'vest1').reason, 'have-better');
  assert.deepEqual(pickupPlan(inv, 'vest3'), { take: 1, drop: [['vest2', 1]] });
  assert.deepEqual(pickupPlan(inv, 'mask1'), { take: 1, drop: [] });
  assert.equal(pickupPlan(inv, 'shield').take, 1); inv.shield = 1; assert.equal(pickupPlan(inv, 'shield').reason, 'full');
  inv.ammo.standard = 0; const rf = pickupPlan(inv, 'refill'); assert.equal(rf.blaster, 'standard'); assert.equal(rf.add, AMMO_MAX.standard / 2);
  assert.equal(pickupPlan({ ...inv, primary: '', secondary: '' }, 'refill').reason, 'no-blaster');
});

test('protective gear reduces paint (not zone paint); paint bomb splash falls off with distance', () => {
  assert.equal(gearPaint(100, { gearVest: 3 }), 65);
  assert.equal(gearPaint(100, { gearMask: 2 }, { head: true }), 60);
  assert.equal(gearPaint(100, { gearMask: 3, gearVest: 3 }, { zone: true }), 100);
  assert.equal(bombPaint(0), BOMB.paint);
  assert.ok(bombPaint(2) < bombPaint(1) && bombPaint(BOMB.radius - 0.01) >= BOMB.paint * BOMB.min - 1e-9);
  assert.equal(bombPaint(BOMB.radius + 0.1), 0);
});
