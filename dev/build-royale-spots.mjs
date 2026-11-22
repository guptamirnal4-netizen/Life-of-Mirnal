// Builds the verified Campus Royale registries from the campus collision export (run after
// dev/export-campus-collision.mjs; Node only, no browser):
//
//   node dev/build-royale-spots.mjs
//
// 1. Reachability: a flood fill over a 1 m grid from the Med-C Ground, stepping like a player (js/paintball/
//    geometry.js: step-ups of at most 0.7 m, drops, walls, trunks, the boundary), across floors and stairs, and
//    through the doorways the campus lists (building entrances, NAB portals, room doors).
// 2. Landing spots (drops): reachable, clear of anything solid for 1.5 m, on the ground or a floor, inside the
//    boundary (3 m margin), not in water; about 25 m apart, outdoors and in large open interiors. Each has up to 5
//    nearby validated slots so a squad lands together.
// 3. Supply spots: reachable, clear for 0.6 m, inside buildings (under a roof) about every 14 m and outdoors about
//    every 60 m.
// 4. Final-zone centres: outdoor drops at least 60 m inside the boundary with 3 m clear.
// Writes js/paintball/data/royale-spots.json (with the geometry hash it was built for). Deterministic.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { decodeGeometry, hashBytes, inPoly } from '../js/paintball/geometry.js';
import { stepCampus } from '../js/paintball/sim.js';
import { BITS_CAMPUS as D } from '../data/bits-campus.js';
import { validateSpot, SPOT_RULES } from '../js/paintball/royale.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'js/paintball/data');
const header = JSON.parse(fs.readFileSync(path.join(DATA, 'campus-collision.json'), 'utf8'));
const bytes = new Uint8Array(zlib.gunzipSync(fs.readFileSync(path.join(DATA, 'campus-collision.bin'))));
if (hashBytes(bytes) !== header.hash) throw new Error('campus-collision.bin does not match its header');
const geo = decodeGeometry(bytes, header);
const t0 = Date.now();

// ---------- 1. reachability ----------
const G = 1; const OX = 500; const OZ = 500; const W = 2200;
const yk = (y) => Math.round((y + 20) * 20);
const key = (ix, iz, y) => (yk(y) * W + (iz + OZ)) * W + (ix + OX);
const nodes = new Map(); // key → [x, z, y]
const queue = [];
const add = (x, z, y) => { const ix = Math.round(x / G); const iz = Math.round(z / G); const k = key(ix, iz, y); if (nodes.has(k)) return; nodes.set(k, [ix * G, iz * G, y]); queue.push(k); };
// straight walk a → b in 0.25 m increments with the movement rules; returns the end height or null if blocked
function walk(x0, z0, y0, x1, z1) {
  const L = Math.hypot(x1 - x0, z1 - z0); const n = Math.max(1, Math.ceil(L / 0.25));
  let y = y0;
  for (let i = 1; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n; const z = z0 + ((z1 - z0) * i) / n;
    if (!geo.inBounds(x, z)) return null;
    y = geo.floorAt(x, z, y);
    if (geo.blockedAt(x, z, y, 0.3)) return null;
  }
  return y;
}
// a player's walk (sliding along walls) from a towards b; returns the end or null
function simWalk(a, b, y) {
  const p = { x: a[0], z: a[1], y, vy: 0 };
  for (let k = 0; k < 600; k++) {
    const dx = b[0] - p.x; const dz = b[1] - p.z; const d = Math.hypot(dx, dz);
    if (d < 0.3) return p;
    stepCampus(p, { f: 1, s: 0, yaw: Math.atan2(-dx, -dz), run: false }, 1 / 30, geo);
  }
  return null;
}
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const links = header.links || [];
const tried = new Set();
add(395, 644, 0);
while (queue.length) {
  const k = queue.pop();
  const [x, z, y] = nodes.get(k);
  for (const [dx, dz] of DIRS) {
    const nx = x + dx * G; const nz = z + dz * G;
    const ny = walk(x, z, y, nx, nz);
    if (ny !== null) add(nx, nz, ny);
  }
  // doorways near this node
  for (let i = 0; i < links.length; i++) {
    for (const [a, b] of [[links[i][0], links[i][1]], [links[i][1], links[i][0]]]) {
      if (Math.hypot(a[0] - x, a[1] - z) > 1.5) continue;
      const tk = `${i}:${a}`; if (tried.has(tk)) continue; tried.add(tk);
      const p = simWalk([x, z], a, y); if (!p) continue;
      const q = simWalk([p.x, p.z], b, p.y); if (!q) continue;
      add(q.x, q.z, q.y);
    }
  }
}
const all = [...nodes.values()];
console.log(`reachable nodes: ${all.length} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);

// ---------- names ----------
const centroid = (poly) => { let x = 0; let z = 0; for (const [a, b] of poly) { x += a; z += b; } return [x / poly.length, z / poly.length]; };
const named = [
  ...D.buildings.filter((b) => b.name && b.inCampus).map((b) => ({ name: b.name, poly: b.outer, c: centroid(b.outer) })),
  ...D.areas.filter((a) => a.name).map((a) => ({ name: a.name, poly: a.poly, c: centroid(a.poly) })),
  ...D.pois.filter((p) => p.name).map((p) => ({ name: p.name, poly: null, c: [p.x, p.z] })),
];
const names = [];
const nameIdx = (n) => { let i = names.indexOf(n); if (i < 0) { i = names.length; names.push(n); } return i; };
function placeName(x, z) {
  for (const n of named) if (n.poly && inPoly(x, z, n.poly)) return n.name;
  let best = null; let bd = 120;
  for (const n of named) { const d = Math.hypot(n.c[0] - x, n.c[1] - z); if (d < bd) { bd = d; best = n.name; } }
  return best ? `near ${best}` : 'open campus';
}

// ---------- classify ----------
// under a roof: something solid 2–14 m above the feet
function covered(x, z, y) {
  const { list, n } = geo.query(x, x, z, z);
  for (let k = 0; k < n; k++) { const i = list[k]; if (geo.minY[i] > y + 1.9 && geo.minY[i] < y + 14 && x > geo.minX[i] && x < geo.maxX[i] && z > geo.minZ[i] && z < geo.maxZ[i]) return true; }
  return false;
}
// deterministic shuffle
let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const order = all.map((p, i) => [rnd(), i]).sort((a, b) => a[0] - b[0]).map(([, i]) => all[i]);
function sample(cands, spacing, ok) {
  const out = []; const grid = new Map(); const C = spacing;
  const near = (x, z) => { const gx = Math.floor(x / C); const gz = Math.floor(z / C); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const q of grid.get(`${gx + i},${gz + j}`) || []) if (Math.hypot(q[0] - x, q[1] - z) < spacing && Math.abs(q[2] - 0) >= 0) return true; return false; };
  for (const p of cands) {
    if (near(p[0], p[1]) || !ok(p)) continue;
    out.push(p); const k = `${Math.floor(p[0] / C)},${Math.floor(p[1] / C)}`; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(p);
  }
  return out;
}
const r1 = (v) => Math.round(v * 100) / 100;
const indoorOf = new Map();
const isIndoor = (p) => { const k = `${p[0]},${p[1]},${p[2]}`; if (!indoorOf.has(k)) indoorOf.set(k, covered(p[0], p[1], p[2])); return indoorOf.get(k); };

// ---------- 2. drops ----------
const dropOk = (p) => validateSpot(geo, p[0], p[1], p[2], SPOT_RULES.drop).ok;
const drops = sample(order, 25, dropOk).map((p) => {
  // up to 5 slots 2.5–7 m away, 2.5 m apart, same floor
  const slots = [];
  for (const q of order) {
    if (slots.length >= 5) break;
    const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (d < 2.5 || d > 7 || Math.abs(q[2] - p[2]) > 0.05) continue;
    if (slots.some((s) => Math.hypot(s[0] - q[0], s[1] - q[1]) < 2.5)) continue;
    if (!validateSpot(geo, q[0], q[1], q[2], SPOT_RULES.slot).ok) continue;
    if (geo.blocked({ x: p[0], y: p[2] + 1, z: p[1] }, { x: q[0], y: q[2] + 1, z: q[1] })) continue;
    slots.push(q);
  }
  return { p, slots, indoor: isIndoor(p) };
});

// ---------- 3. supplies ----------
const supOk = (p) => validateSpot(geo, p[0], p[1], p[2], SPOT_RULES.supply).ok;
const inside = sample(order.filter((p) => isIndoor(p)), 14, supOk);
const outside = sample(order.filter((p) => !isIndoor(p)), 60, (p) => supOk(p) && !inside.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 14));
const supplies = [...inside.map((p) => ({ p, indoor: true })), ...outside.map((p) => ({ p, indoor: false }))];

// ---------- 4. final-zone centres ----------
const edgeDist = (x, z) => { let d = Infinity; const B = header.boundary; for (let i = 0; i < B.length; i++) { const a = B[i]; const b = B[(i + 1) % B.length]; const vx = b[0] - a[0]; const vz = b[1] - a[1]; const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / (vx * vx + vz * vz))); d = Math.min(d, Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t)); } return d; };
const finals = drops.map((d, i) => [d, i]).filter(([d]) => !d.indoor && Math.abs(d.p[2]) < 0.01 && edgeDist(d.p[0], d.p[1]) > 60 && validateSpot(geo, d.p[0], d.p[1], d.p[2], SPOT_RULES.final).ok).map(([, i]) => i);

const out = {
  version: 1,
  geoHash: header.hash,
  note: 'Generated by dev/build-royale-spots.mjs from the campus collision export; every point is validated (js/paintball/royale.js validateSpot) and reachable from the Med-C Ground.',
  rules: SPOT_RULES,
  names,
  // drops: [x, z, y, nameIndex, indoor 0/1, [[x, z], … slots on the same floor]]
  drops: drops.map((d) => [r1(d.p[0]), r1(d.p[1]), r1(d.p[2]), nameIdx(placeName(d.p[0], d.p[1])), d.indoor ? 1 : 0, d.slots.map((s) => [r1(s[0]), r1(s[1])])]),
  // supplies: [x, z, y, nameIndex, indoor 0/1]
  supplies: supplies.map((s) => [r1(s.p[0]), r1(s.p[1]), r1(s.p[2]), nameIdx(placeName(s.p[0], s.p[1])), s.indoor ? 1 : 0]),
  // final zone centres: indices into drops
  finals,
};
fs.writeFileSync(path.join(DATA, 'royale-spots.json'), `${JSON.stringify(out)}\n`);
console.log(JSON.stringify({ nodes: all.length, drops: out.drops.length, indoorDrops: drops.filter((d) => d.indoor).length, slots: drops.reduce((n, d) => n + d.slots.length, 0), supplies: out.supplies.length, indoorSupplies: inside.length, finals: finals.length, names: names.length, seconds: (Date.now() - t0) / 1000, kb: Math.round(fs.statSync(path.join(DATA, 'royale-spots.json')).size / 1024) }));
