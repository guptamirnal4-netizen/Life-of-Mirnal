// Workshops, labs and halls (research/buildings/workshops-halls.md, research/review.md):
//   BITS Workshop               the old Central Workshop: a one-storey north-light (sawtooth) shed, trimmed back from FD-I
//   New BITS Workshop           "CENTRAL WORKSHOP": white and ochre machine halls with red trusses, a mezzanine, admin block
//   Rakesh Kapoor Innovation Centre   3 levels of labs round an open courtyard, ochre and cream, red portico
//   Rakesh Verma Convention Centre    as the imagery shows it: a fenced construction site, the guest block's frame going up
//   VFAST                       the guest house: a single-storey cream U round a lawn, two-storey ends (no OSM footprint)
//   Lecture Theatre Complex     pink and cream arcades round a lawn, raked theatres under sloped roofs (no OSM footprint)
// One registry entry per building (all with id 'workshops', so ?only=workshops builds them all); each has its own Kit
// frame, so its interior zones and distance checks stay local.
import * as THREE from 'three';
import { plateAtlas, plate, ceiling, bar, quad, line, glaze, addFootprint, rodLight } from './fd1.js';
import { RISE_MAX } from './kit.js';

const TILE = { plaster: 3, concrete: 3, terrazzo: 2.5, paving: 3, grass: 4, dirt: 6, wood: 1.5, brick: 1.6, tiles: 2 };

// ---------------------------------------------------------------- helpers
function frameOf(O, eu, W, L) {
  const n = Math.hypot(eu[0], eu[1]); const e = [eu[0] / n, eu[1] / n]; const ev = [-e[1], e[0]];
  return { O, eu: e, ev, angle: Math.atan2(ev[0], ev[1]), W, L };
}

// Swap the winding of a non-indexed geometry (after a mirroring transform).
function flipWinding(g) {
  for (const name of Object.keys(g.attributes)) {
    const a = g.attributes[name]; const n = a.itemSize;
    for (let i = 0; i < a.count; i += 3) for (let k = 0; k < n; k++) { const t = a.array[(i + 1) * n + k]; a.array[(i + 1) * n + k] = a.array[(i + 2) * n + k]; a.array[(i + 2) * n + k] = t; }
  }
}

// Extrude a THREE.Shape drawn in (s, y) along a wall line L, from offset d0 to d1 (outward of the line).
function extrude(kit, L, shape, d0, d1, key, { curve = 14 } = {}) {
  const g0 = new THREE.ExtrudeGeometry(shape, { depth: d1 - d0, bevelEnabled: false, curveSegments: curve });
  const g = g0.index ? g0.toNonIndexed() : g0;
  g.translate(0, 0, d0);
  const tex = key.startsWith('t:') ? key.split(':')[1] : null;
  if (tex) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / (TILE[tex] || 2), uv.getY(i) / (TILE[tex] || 2)); }
  const m = new THREE.Matrix4();
  if (L.axis === 'u') m.set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, L.out, L.c, 0, 0, 0, 1);
  else m.set(0, 0, L.out, L.c, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1);
  g.applyMatrix4(m);
  if (m.determinant() < 0) flipWinding(g);
  kit.geo(key, g);
}

// A polygon in (s, y) as a shape.
function shapeOf(pts) { const s = new THREE.Shape(); s.moveTo(...pts[0]); for (const p of pts.slice(1)) s.lineTo(...p); s.closePath(); return s; }

// The solid above a semicircular arch of clear span w centred at s = 0, springing at `spring`, up to `top`.
function spandrel(w, spring, top) {
  const r = w / 2; const sh = new THREE.Shape();
  sh.moveTo(-r, spring); sh.lineTo(-r, top); sh.lineTo(r, top); sh.lineTo(r, spring);
  sh.absarc(0, spring, r, 0, Math.PI, false);
  return sh;
}
function archRing(w, spring, b) {
  const r = w / 2; const sh = new THREE.Shape();
  sh.moveTo(r + b, spring); sh.absarc(0, spring, r + b, 0, Math.PI, false); sh.lineTo(-r, spring); sh.absarc(0, spring, r, Math.PI, 0, true); sh.closePath();
  return sh;
}
const shift = (sh, ds) => { const pts = sh.extractPoints(14).shape.map((p) => [p.x + ds, p.y]); return shapeOf(pts); };

// A two-leaf wall on line L (centre c): the outer leaf in `ext`, a 0.1 m inner leaf in `int`.
function wall2(kit, L, s0, s1, y0, y1, ext, int, t, openings = []) {
  line(kit, L.axis, L.c + L.out * 0.05, L.out).wall(s0, s1, y0, y1, ext, t - 0.1, openings);
  line(kit, L.axis, L.c - L.out * (t / 2 - 0.05), L.out).wall(s0, s1, y0, y1, int, 0.1, openings, false);
}

// A small-pane steel window in an opening of a wall line (glaze plus extra glazing bars).
function steelWindow(L, s, w, y, h, t, { frame = 'm:#39414a', rows = 4, cols = 3 } = {}) {
  glaze(L, s, w, y, h, t, { frame, mull: cols - 1, transom: 0.5, sill: 'c:#c9c2b2' });
  const d = t / 2 - 0.1;
  for (let k = 1; k < rows; k++) { const yy = y + (h * k) / rows; L.box(s - w / 2, s + w / 2, d - 0.04, d + 0.02, yy - 0.015, yy + 0.015, frame); }
}

// A piece of furniture or machinery: parts [x0, x1, y0, y1, z0, z1, key] in its own frame (x across, z forward),
// set at (u, v, y) facing f, with a w x d collider of height h.
function piece(kit, u, v, y, f, parts, w, d, h) {
  kit._rot(u, v, f, kit._up(parts, y));
  if (h > 0) kit.col(...kit._aabb(u, v, f, w, d), y, y + h);
}
// A wheel or drum lying along the piece's x axis (or y axis with vertical) at (x, yc, z) of a piece.
function drum(kit, u, v, y, f, x, yc, z, r, t, key, { seg = 16, vertical = false } = {}) {
  const g = new THREE.CylinderGeometry(r, r, t, seg);
  if (!vertical) g.rotateZ(Math.PI / 2);
  g.translate(x, yc, z); g.rotateY(Math.atan2(f[0], f[1])); g.translate(u, y, v);
  kit.geo(key, g);
}

const M = { green: 'c:#3f6e55', green2: 'c:#2f5a44', steel: 'm:#7d858c', bright: 'm:#aab0b4', dark: 'c:#2b2f33', blue: 'c:#2f5d8a', grey: 'c:#8e9aa0', wood: 't:wood:#8a6a48', conc: 't:concrete:#a7a296', yellow: 'c:#e1b324', red: 'c:#a8322b', black: 'c:#1d1f21', cream: 'c:#d9dcd8' };

function lathe(kit, u, v, y, f) {
  piece(kit, u, v, y, f, [
    [-1.25, -0.75, 0, 0.85, -0.35, 0.35, M.green], [0.75, 1.25, 0, 0.85, -0.35, 0.35, M.green], [-1.3, 1.3, 0.75, 0.82, -0.42, 0.42, M.green2],
    [-1.2, 1.2, 0.82, 1.0, -0.2, 0.15, M.steel], [-1.3, -0.7, 0.82, 1.45, -0.35, 0.3, M.green], [-0.7, -0.58, 1.05, 1.35, -0.15, 0.15, M.bright],
    [-0.1, 0.3, 1.0, 1.18, -0.3, 0.3, M.green], [0.0, 0.15, 1.18, 1.3, -0.05, 0.08, M.steel], [0.85, 1.2, 1.0, 1.3, -0.15, 0.15, M.green],
    [-1.3, 1.3, 1.0, 1.55, 0.27, 0.3, M.green2],
  ], 2.6, 0.9, 1.5);
}
function mill(kit, u, v, y, f) {
  piece(kit, u, v, y, f, [
    [-0.45, 0.45, 0, 0.3, -0.6, 0.5, M.blue], [-0.35, 0.35, 0.3, 2.0, 0.1, 0.55, M.blue], [-0.3, 0.3, 0.6, 0.95, -0.45, 0.1, M.blue],
    [-0.8, 0.8, 0.95, 1.05, -0.5, -0.1, M.steel], [-0.25, 0.25, 1.6, 2.0, -0.45, 0.1, M.blue], [-0.05, 0.05, 1.3, 1.6, -0.32, -0.22, M.bright],
    [0.35, 0.42, 1.0, 1.5, -0.2, 0.1, M.dark],
  ], 1.6, 1.1, 2.0);
}
function drill(kit, u, v, y, f) {
  piece(kit, u, v, y, f, [
    [-0.3, 0.3, 0, 0.12, -0.3, 0.3, M.green2], [-0.05, 0.05, 0.12, 1.9, 0.1, 0.2, M.steel], [-0.25, 0.25, 0.9, 0.95, -0.2, 0.15, M.green2],
    [-0.18, 0.18, 1.55, 1.95, -0.25, 0.2, M.green], [-0.03, 0.03, 1.35, 1.55, -0.1, -0.04, M.bright],
  ], 0.6, 0.6, 1.9);
}
function workbench(kit, u, v, y, f, { w = 2.0, top = M.wood } = {}) {
  const legs = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => [a * (w / 2 - 0.06) - 0.03, a * (w / 2 - 0.06) + 0.03, 0, 0.82, b * 0.34 - 0.03, b * 0.34 + 0.03, M.steel]);
  piece(kit, u, v, y, f, [[-w / 2, w / 2, 0.82, 0.88, -0.4, 0.4, top], [-w / 2 + 0.05, w / 2 - 0.05, 0.2, 0.24, -0.36, 0.36, M.steel], ...legs, [w / 2 - 0.3, w / 2 - 0.1, 0.88, 1.0, -0.42, -0.25, M.dark]], w, 0.8, 0.9);
}
function toolBoard(kit, u, v, y, f) {
  piece(kit, u, v, y, f, [[-1, 1, 0.9, 2.0, 0.3, 0.33, M.grey], [-1, 1, 0, 0.9, -0.35, 0.35, M.grey], [-1.02, 1.02, 0.9, 0.94, -0.37, 0.37, M.dark],
    ...[-0.7, -0.3, 0.1, 0.5].map((x) => [x - 0.04, x + 0.04, 1.3, 1.7, 0.26, 0.3, M.red])], 2.0, 0.7, 2.0);
}
function engine(kit, u, v, y, f) {
  piece(kit, u, v, y, f, [[-1.2, 1.2, 0, 0.4, -0.65, 0.65, M.conc], [-0.6, 0.5, 0.4, 1.1, -0.35, 0.35, M.green], [-0.45, 0.35, 1.1, 1.5, -0.28, 0.28, M.green],
    [-0.4, 0.3, 1.5, 1.58, -0.2, 0.2, M.dark], [0.5, 0.75, 0.55, 0.85, -0.12, 0.12, M.dark]], 2.4, 1.3, 1.6);
  drum(kit, u, v, y, f, 0.85, 0.95, 0, 0.55, 0.12, M.green2, { seg: 20 });
}
function compressor(kit, u, v, y, f) {
  drum(kit, u, v, y, f, 0, 0.55, 0, 0.35, 1.6, 'c:#b8392f', { seg: 16 });
  piece(kit, u, v, y, f, [[-0.6, -0.5, 0, 0.25, -0.25, 0.25, M.dark], [0.5, 0.6, 0, 0.25, -0.25, 0.25, M.dark], [-0.4, 0.2, 0.9, 1.25, -0.2, 0.2, M.blue], [0.3, 0.38, 0.9, 1.1, -0.04, 0.04, M.dark]], 1.8, 0.8, 1.25);
}
function cnc(kit, u, v, y, f) {
  piece(kit, u, v, y, f, [[-1.2, 1.2, 0, 2.3, -0.9, 0.9, M.cream], [-0.6, 0.6, 0.95, 1.85, -0.93, -0.9, 'g:#a8c4d0'], [-1.2, 1.2, 2.0, 2.12, -0.92, -0.9, M.blue],
    [0.75, 1.15, 1.1, 1.7, -1.05, -0.9, M.dark], [-1.2, 1.2, 0, 0.12, -0.93, 0.9, M.dark]], 2.4, 1.9, 2.3);
}
function lockers(kit, u, v, y, f, n = 4) {
  const parts = [];
  for (let i = 0; i < n; i++) { const x = -n * 0.25 + i * 0.5; parts.push([x + 0.01, x + 0.49, 0, 1.9, -0.25, 0.25, 'c:#7d8f99'], [x + 0.36, x + 0.42, 1.0, 1.1, -0.27, -0.25, M.dark]); }
  piece(kit, u, v, y, f, parts, n * 0.5, 0.5, 1.9);
}
function sofa(kit, u, v, y, f, { w = 2.0, c = 'c:#7a4a34' } = {}) {
  piece(kit, u, v, y, f, [[-w / 2, w / 2, 0.15, 0.45, -0.4, 0.4, c], [-w / 2, w / 2, 0.45, 0.9, 0.25, 0.4, c], [-w / 2, -w / 2 + 0.15, 0.45, 0.65, -0.4, 0.4, c], [w / 2 - 0.15, w / 2, 0.45, 0.65, -0.4, 0.4, c], [-w / 2, w / 2, 0, 0.15, -0.38, 0.38, 'c:#3a2a20']], w, 0.8, 0.9);
}
function counter(kit, u, v, y, f, w = 3.0, top = 't:wood:#7a5232') {
  piece(kit, u, v, y, f, [[-w / 2, w / 2, 0, 1.0, -0.3, 0.3, top], [-w / 2 - 0.05, w / 2 + 0.05, 1.0, 1.1, -0.4, 0.35, top], [-w / 2, w / 2, 0, 0.1, -0.32, 0.32, M.dark]], w, 0.8, 1.1);
}
function bed(kit, u, v, y, f) {
  piece(kit, u, v, y, f, [[-0.95, 0.95, 0, 0.42, -1.0, 1.0, 't:wood:#6d4b30'], [-0.92, 0.92, 0.42, 0.58, -0.98, 0.98, 'c:#f2efe8'], [-0.92, 0.92, 0.58, 0.62, -0.98, 0.3, 'c:#8a3b3b'],
    [-0.7, -0.1, 0.58, 0.7, 0.55, 0.9, 'c:#ffffff'], [0.1, 0.7, 0.58, 0.7, 0.55, 0.9, 'c:#ffffff'], [-1.0, 1.0, 0, 1.15, 0.98, 1.06, 't:wood:#5d3f28']], 2.0, 2.1, 0.6);
}
function confTable(kit, u0, u1, v0, v1, y, { top = 't:wood:#6f4a2f' } = {}) {
  const alongU = u1 - u0 > v1 - v0;
  kit.box(u0, u1, v0, v1, y + 0.72, y + 0.76, top);
  kit.box((u0 + u1) / 2 - (alongU ? (u1 - u0) / 2 - 0.4 : 0.15), (u0 + u1) / 2 + (alongU ? (u1 - u0) / 2 - 0.4 : 0.15), (v0 + v1) / 2 - (alongU ? 0.15 : (v1 - v0) / 2 - 0.4), (v0 + v1) / 2 + (alongU ? 0.15 : (v1 - v0) / 2 - 0.4), y, y + 0.72, M.dark, { collide: false });
  const len = alongU ? u1 - u0 : v1 - v0; const n = Math.max(1, Math.floor(len / 0.8));
  for (let i = 0; i < n; i++) {
    const s = (alongU ? u0 : v0) + (len * (i + 0.5)) / n;
    if (alongU) { kit.chair(s, v0 - 0.4, y, [0, 1], { seat: 'c:#2c2f33' }); kit.chair(s, v1 + 0.4, y, [0, -1], { seat: 'c:#2c2f33' }); }
    else { kit.chair(u0 - 0.4, s, y, [1, 0], { seat: 'c:#2c2f33' }); kit.chair(u1 + 0.4, s, y, [-1, 0], { seat: 'c:#2c2f33' }); }
  }
}
// A computer desk with a monitor and a chair.
function pcDesk(kit, u, v, y, f) {
  kit.desk(u, v, y, f, { w: 1.4, d: 0.7, top: 'c:#d8d4cb' });
  piece(kit, u, v, y, f, [[-0.3, 0.3, 0.8, 1.17, 0.12, 0.15, 'c:#16191c'], [-0.04, 0.04, 0.76, 0.85, 0.15, 0.2, M.dark], [-0.25, 0.25, 0.765, 0.78, -0.2, -0.05, M.dark]], 0, 0, 0);
  kit.chair(u - f[0] * 0.65, v - f[1] * 0.65, y, f, { seat: 'c:#2c2f33' });
}

// A dog-leg stair like kit.dogleg, stackable: topRail false leaves the start end free for the next flight up.
// Records its geometry on kit.stairs (start, la0, far, mid1, mid2 along the climb axis / across) for tests.
function dogleg(kit, u0, u1, v0, v1, y0, y1, { along = 'v', key = 't:terrazzo:#c9c6bd', rail = 'm:#7d858c', name = 'Stairs', reverse = false, topRail = true } = {}) {
  const H = y1 - y0;
  const steps = Math.max(2, Math.ceil(H / 2 / RISE_MAX)); const rise = H / 2 / steps; const tread = 0.28; const run = steps * tread;
  const [a0, a1, b0, b1] = along === 'v' ? [v0, v1, u0, u1] : [u0, u1, v0, v1];
  const wid = (b1 - b0 - 0.1) / 2; const landing = Math.max(1.1, wid);
  if (run + landing > a1 - a0 + 1e-6) throw new Error(`${kit.id}: stairwell ${name} too short`);
  const dir = reverse ? -1 : 1; const far = reverse ? a0 : a1; const la0 = far - dir * landing; const start = la0 - dir * run;
  const mid1 = b0 + wid / 2; const mid2 = b1 - wid / 2;
  const P = (a, b) => (along === 'v' ? [b, a] : [a, b]);
  const R = (aa, ab, ba, bb) => { const [p0, q0] = P(Math.min(aa, ab), Math.min(ba, bb)); const [p1, q1] = P(Math.max(aa, ab), Math.max(ba, bb)); return [p0, p1, q0, q1]; };
  const D = along === 'v' ? [0, dir] : [dir, 0];
  kit.flight(...P(start, mid1), y0, D, steps, rise, wid, key, { tread });
  const lmid = y0 + H / 2;
  kit.box(...R(la0, far, b0, b1), lmid - 0.25, lmid, key, { walkable: true });
  kit.flight(...P(la0, mid2), lmid, [-D[0], -D[1]], steps, rise, wid, key, { tread });
  kit.box(...R(start, la0, b0 + wid, b0 + wid + 0.1), y0, y0 + 0.95 + H / 2, rail);
  if (topRail) kit.box(...R(start - dir * 0.05, start, b0, b0 + wid + 0.1), y1, y1 + 1.0, rail);
  kit.stairs.push({ name, u0, u1, v0, v1, y0, y1, along, start, la0, far, mid1, mid2, dir });
  const [hu0, hu1, hv0, hv1] = R(start, far, b0, b1);
  return { u0: hu0, u1: hu1, v0: hv0, v1: hv1 };
}

// Courtyard/ground helpers
const register = (kit, campus, name, poly, h) => addFootprint(campus, name, poly.map(([u, v]) => { const p = kit.world(u, v); return [p.x, p.z]; }), h, 'workshops');

// ================================================================ 1. BITS Workshop (sawtooth shed)
const WS = { O: [201, -31], eu: [0.98755, -0.15734], U: 72, V: 36, WH: 5.4, P: 7.2, CREST: 8.1 };
function buildWorkshop(kit) {
  const { U, V, WH, P, CREST } = WS;
  const K = { ext: 't:plaster:#d8d2c2', int: 't:plaster:#b8c6cd', plinth: 't:concrete:#8f8a80', sheet: 'c:#a3abad', rib: 'c:#949c9f', truss: 'c:#a3332b', glass: 'g:#b9d2dc', frame: 'm:#39414a', floor: 't:paving:#8f8d86', dado: 'c:#7d8f99', door: 'c:#5d6b63' };
  const T = 0.3;
  const L = (axis, c, out) => line(kit, axis, c, out);
  // ---- walls: bays of 6 m with tall small-pane steel windows; doors west (main), south (yard) and east (CRISS Robotics)
  const bays = (s0, s1, n) => Array.from({ length: n }, (_, i) => s0 + ((s1 - s0) * (i + 0.5)) / n);
  const sides = [
    { L: L('u', T / 2, -1), s0: 0, s1: U, wins: bays(0, U, 12), doors: [{ at: 63, width: 1.6, top: 2.6 }] },
    { L: L('u', V - T / 2, 1), s0: 0, s1: U, wins: bays(0, U, 12), doors: [{ at: 45, width: 4.4, top: 4.2, slide: true }] },
    { L: L('v', T / 2, -1), s0: T, s1: V - T, wins: [4, 10, 28, 33], doors: [{ at: 16, width: 4.2, top: 4.2, slide: true }] },
    { L: L('v', U - T / 2, 1), s0: T, s1: V - T, wins: [5, 11, 25, 31], doors: [{ at: 18, width: 2.4, top: 3.0 }] },
  ];
  for (const sd of sides) {
    const wins = sd.wins.filter((s) => !sd.doors.some((d) => Math.abs(d.at - s) < d.width / 2 + 1.6 + (d.slide ? d.width : 0)));
    const ops = [...wins.map((s) => ({ at: s, width: 2.6, bottom: 1.0, top: 4.4 })), ...sd.doors.map((d) => ({ at: d.at, width: d.width, bottom: 0, top: d.top }))];
    wall2(kit, sd.L, sd.s0, sd.s1, 0, WH, K.ext, K.int, T, ops);
    for (const s of wins) steelWindow(sd.L, s, 2.6, 1.0, 3.4, T, { frame: K.frame, rows: 5, cols: 4 });
    // plinth, eaves band and inside dado, broken at the doors
    let s = sd.s0;
    for (const d of [...sd.doors].sort((a, b) => a.at - b.at)) { sd.L.box(s, d.at - d.width / 2, T / 2 - 0.01, T / 2 + 0.05, 0, 0.6, K.plinth); sd.L.box(s, d.at - d.width / 2, -T / 2 - 0.012, -T / 2 + 0.01, 0, 1.2, K.dado); s = d.at + d.width / 2; }
    sd.L.box(s, sd.s1, T / 2 - 0.01, T / 2 + 0.05, 0, 0.6, K.plinth); sd.L.box(s, sd.s1, -T / 2 - 0.012, -T / 2 + 0.01, 0, 1.2, K.dado);
    sd.L.box(sd.s0 - (sd.L.axis === 'v' ? T : 0), sd.s1 + (sd.L.axis === 'v' ? T : 0), T / 2 - 0.01, T / 2 + 0.12, WH - 0.3, WH, 'c:#c4bca8');
    for (const d of sd.doors) {
      if (d.slide) { // a steel sliding door pushed open beside the opening, its track over it
        sd.L.box(d.at + d.width / 2 + 0.05, d.at + d.width * 1.5 + 0.1, T / 2 + 0.06, T / 2 + 0.14, 0.02, d.top + 0.1, K.door);
        sd.L.box(d.at - d.width / 2 - 0.2, d.at + d.width * 1.5 + 0.3, T / 2 + 0.05, T / 2 + 0.2, d.top + 0.1, d.top + 0.25, K.frame);
        for (let x = d.at + d.width / 2 + 0.4; x < d.at + d.width * 1.5; x += 0.7) sd.L.box(x - 0.03, x + 0.03, T / 2 + 0.14, T / 2 + 0.17, 0.05, d.top, K.frame);
      } else {
        kit.door(sd.L.axis === 'u', d.at, sd.L.c, 0, d.width - 0.1, { height: d.top - 0.05, thick: T, side: -sd.L.out, frame: K.frame, leaf: 'c:#8a3b2b' });
      }
    }
  }
  // gable triangles over the west and east walls, one per tooth
  for (const [c, out] of [[T / 2, -1], [U - T / 2, 1]]) {
    for (let k = 0; k < 5; k++) {
      const tri = [[k * P, WH], [(k + 1) * P, WH], [k * P + 0.001, CREST]];
      const Lg = L('v', c, out);
      extrude(kit, Lg, shapeOf(tri), -T / 2 + 0.1, T / 2, K.ext);
      extrude(kit, Lg, shapeOf(tri), -T / 2, -T / 2 + 0.1, K.int);
    }
  }
  // ---- the five north-light teeth: glazing facing north, a sheet roof sloping south, red trusses under it
  const slopeY = (k, v) => CREST - ((v - k * P) / P) * (CREST - WH);
  for (let k = 0; k < 5; k++) {
    const v0 = k * P; const v1 = (k + 1) * P;
    const Lw = L('u', v0, -1);
    // glazing (outer reflective, inner light) with mullions and transoms
    Lw.plane(U / 2, 0.02, WH, U - 0.2, CREST - WH, K.glass, 1);
    Lw.plane(U / 2, -0.02, WH, U - 0.2, CREST - WH, 'g:#dbe9ef', -1);
    for (const y of [WH, (WH + CREST) / 2, CREST - 0.06]) Lw.box(0, U, -0.05, 0.05, y, y + 0.06, K.frame);
    for (let s = 0; s <= U + 1e-6; s += 0.9) Lw.box(s - 0.025, s + 0.025, -0.04, 0.04, WH, CREST, K.frame);
    // sheet with ribs, crest flashing, valley gutter
    bar(kit, [U / 2, CREST + 0.08, v0], [U / 2, WH + 0.08, v1 + (k === 4 ? 0.35 : 0)], U + 0.6, K.sheet, 0.05);
    for (let s = 0.6; s < U; s += 1.2) bar(kit, [s, CREST + 0.12, v0 + 0.02], [s, WH + 0.12, v1 - 0.02], 0.05, K.rib, 0.05);
    kit.box(-0.3, U + 0.3, v0 - 0.06, v0 + 0.12, CREST, CREST + 0.16, K.frame, { collide: false });
    kit.box(-0.3, U + 0.3, v1 - 0.25, v1 + (k === 4 ? 0.5 : 0.05), WH - 0.22, WH, 'm:#6f777c', { collide: false });
    for (const u of [-0.3, U + 0.3]) bar(kit, [u, CREST - 0.02, v0], [u, WH - 0.02, v1 + (k === 4 ? 0.35 : 0)], 0.06, 'c:#c4bca8', 0.3);
    // trusses every 6 m
    for (let u = 6; u < U - 1; u += 6) {
      const tb = 0.12;
      bar(kit, [u, WH, v0 + 0.1], [u, WH, v1 - 0.1], tb, K.truss);
      bar(kit, [u, CREST - 0.06, v0 + 0.05], [u, WH, v1 - 0.05], tb, K.truss);
      bar(kit, [u, WH, v0 + 0.05], [u, CREST - 0.06, v0 + 0.05], tb, K.truss);
      for (const f of [1 / 3, 2 / 3]) { const v = v0 + f * P; bar(kit, [u, WH, v], [u, slopeY(k, v) - 0.06, v], 0.08, K.truss); }
      bar(kit, [u, WH, v0 + P / 3], [u, CREST - 0.1, v0 + 0.1], 0.07, K.truss);
      bar(kit, [u, WH, v0 + (2 * P) / 3], [u, slopeY(k, v0 + P / 3) - 0.06, v0 + P / 3], 0.07, K.truss);
      bar(kit, [u, WH, v1 - 0.1], [u, slopeY(k, v0 + (2 * P) / 3) - 0.06, v0 + (2 * P) / 3], 0.07, K.truss);
    }
    // purlins between the trusses
    for (const f of [0.15, 0.5, 0.85]) { const v = v0 + f * P; kit.box(0.2, U - 0.2, v - 0.05, v + 0.05, slopeY(k, v) - 0.12, slopeY(k, v) - 0.02, K.truss, { collide: false }); }
  }
  // valley girders on steel stanchions every 12 m
  for (let k = 1; k < 5; k++) {
    kit.box(T, U - T, k * P - 0.12, k * P + 0.12, WH - 0.7, WH - 0.05, K.truss, { collide: false });
    for (let u = 12; u < U - 1; u += 12) { kit.box(u - 0.15, u + 0.15, k * P - 0.15, k * P + 0.15, 0, WH - 0.7, K.truss); kit.box(u - 0.25, u + 0.25, k * P - 0.25, k * P + 0.25, 0, 0.12, 'c:#6f6a60', { collide: false }); }
  }
  // ---- west porch (the OSM annex): a lean-to on four columns over the main door, the name on its fascia
  {
    const pu0 = -5.2; const pv0 = 11.6; const pv1 = 20.6;
    kit.box(pu0, -0.15, pv0, pv1, 0, 0.12, K.plinth, { walkable: true });
    for (const v of [pv0 + 0.3, pv1 - 0.3]) kit.box(pu0 + 0.1, pu0 + 0.4, v - 0.15, v + 0.15, 0.12, 4.4, 'c:#5d6b63');
    bar(kit, [pu0 - 0.4, 4.45, (pv0 + pv1) / 2], [0, 5.0, (pv0 + pv1) / 2], 0.05, K.sheet, pv1 - pv0 + 0.4);
    kit.box(pu0 - 0.45, pu0 - 0.3, pv0 - 0.2, pv1 + 0.2, 4.0, 4.5, 'c:#c4bca8', { collide: false });
    kit.sign('BITS WORKSHOP', pu0 - 0.46, (pv0 + pv1) / 2, 4.02, [-1, 0], { width: 6.0, height: 0.46, bg: '#3a4a56', fg: '#f4efe2', font: 'bold 64px Arial, sans-serif' });
  }
  kit.sign('CRISS ROBOTICS', U + 0.16, 18, 3.25, [1, 0], { width: 3.2, height: 0.5, bg: '#1f3d6b', fg: '#f4efe2', font: 'bold 60px Arial, sans-serif' });
  kit.entrance('West main door', -6.5, 16, [-1, 0]);
  kit.entrance('South yard door', 45, V + 1.6, [0, 1]);
  kit.entrance('East door (CRISS Robotics)', U + 1.6, 18, [1, 0]);
  kit.entrance('North door', 63, -1.6, [0, -1]);

  // ---- interior (one zone): stone flags, machines, the walled tool room, the CRISS Robotics bay
  kit.layer('hall', () => {
    kit.box(T, U - T, T, V - T, -0.05, 0.03, K.floor, { collide: false });
    // yellow aisle lines
    for (const v of [10.6, 25.4]) kit.box(1.5, U - 1.5, v - 0.05, v + 0.05, 0.03, 0.036, M.yellow, { collide: false });
    // lights on drop rods from the bottom chords
    for (let u = 6; u < U - 1; u += 6) for (let k = 0; k < 5; k++) rodLight(kit, u + 3, k * P + P / 2, WH, 1.3);
    // north bay: a row of lathes; south bay: milling and drilling machines
    for (let u = 4; u < 44; u += 4.2) lathe(kit, u, 6.2, 0.03, [0, 1]);
    for (let u = 4; u < 34; u += 3.4) { mill(kit, u, 29.5, 0.03, [0, -1]); drill(kit, u + 1.7, 32.6, 0.03, [0, -1]); }
    // three old green stationary engines on plinths (west middle)
    for (const u of [6, 12, 18]) engine(kit, u, 18, 0.03, [1, 0]);
    // walled tool room, open above to the trusses
    const tr = { u0: 30, u1: 40, v0: 13.5, v1: 22.5, h: 4.0 };
    const Lt = [L('u', tr.v0, -1), L('u', tr.v1, 1), L('v', tr.u0, -1), L('v', tr.u1, 1)];
    Lt[0].wall(tr.u0, tr.u1, 0, tr.h, K.int, 0.25, [{ at: 33, width: 2.2, bottom: 1.1, top: 2.4 }, { at: 37, width: 2.2, bottom: 1.1, top: 2.4 }]);
    Lt[1].wall(tr.u0, tr.u1, 0, tr.h, K.int, 0.25, [{ at: 35, width: 1.4, bottom: 0, top: 2.3 }, { at: 32, width: 2.0, bottom: 1.1, top: 2.4 }]);
    Lt[2].wall(tr.v0 - 0.125, tr.v1 + 0.125, 0, tr.h, K.int, 0.25);
    Lt[3].wall(tr.v0 - 0.125, tr.v1 + 0.125, 0, tr.h, K.int, 0.25, [{ at: 18, width: 2.4, bottom: 1.1, top: 2.4 }]);
    for (const [Lx, s] of [[Lt[0], 33], [Lt[0], 37], [Lt[1], 32], [Lt[3], 18]]) steelWindow(Lx, s, Lx === Lt[3] ? 2.4 : 2.2 - (Lx === Lt[1] ? 0.2 : 0), 1.1, 1.3, 0.25, { rows: 2, cols: 3 });
    for (const Lx of Lt) Lx.box(Lx.axis === 'u' ? tr.u0 - 0.15 : tr.v0 - 0.15, Lx.axis === 'u' ? tr.u1 + 0.15 : tr.v1 + 0.15, -0.16, 0.16, tr.h, tr.h + 0.08, 'c:#c4bca8');
    kit.door(true, 35, tr.v1, 0, 1.3, { height: 2.25, thick: 0.25, side: -1, frame: K.frame, leaf: 't:wood:#8a6a4a' });
    for (const u of [31.2, 33.2, 35.2]) kit.shelf(u, tr.v0 + 0.4, 0.03, [0, 1], { w: 1.8, books: ['c:#8a8f94', 'c:#6f6253', 'c:#a8a08f', 'c:#5d6b63'] });
    kit.shelf(tr.u0 + 0.4, 19, 0.03, [1, 0], { w: 1.8, books: ['c:#8a8f94', 'c:#6f6253', 'c:#a8a08f'] });
    workbench(kit, 37, 19.5, 0.03, [0, -1], { w: 2.4 });
    kit.sign('TOOL ROOM', 35, tr.v1 + 0.13, 2.5, [0, 1], { width: 1.6, height: 0.3, bg: '#2f3b46', fg: '#f4efe2', font: 'bold 56px Arial, sans-serif' });
    // benches and stools in the middle, the electrical panel and compressor on the west wall
    for (const [u, v] of [[46, 15], [46, 21], [51, 15], [51, 21]]) { workbench(kit, u, v, 0.03, [0, 1], { w: 2.4 }); for (const du of [-0.6, 0.6]) kit.cyl(u + du, v - 0.75, 0.03, 0.17, 0.6, M.wood, { seg: 8 }); }
    piece(kit, T + 0.25, 7.2, 0.03, [1, 0], [[-1.0, 1.0, 0, 2.0, -0.25, 0.2, M.grey], ...[-0.6, -0.2, 0.2, 0.6].map((x) => [x - 0.09, x + 0.09, 1.35, 1.53, 0.2, 0.23, M.black]), [-0.8, 0.8, 0.5, 0.56, 0.2, 0.23, M.dark]], 2.0, 0.5, 2.0);
    compressor(kit, 2.0, 25.5, 0.03, [1, 0]);
    // blackboard and display boards on the north wall
    kit.board(20, T + 0.02, 0.03, [0, 1], { w: 3.0, h: 1.2, key: 'c:#22302a' });
    kit.board(26, T + 0.02, 0.03, [0, 1], { w: 2.4, h: 1.2, key: 'c:#5b7a4a' });
    // conduits along the walls
    for (const v of [T + 0.06, V - T - 0.06]) kit.box(T, U - T, v - 0.03, v + 0.03, 3.6, 3.66, M.black, { collide: false });
    // CRISS Robotics bay (east end): tables with robots, a banner, tool boards
    kit.sign('CRISS ROBOTICS · Welcome', U - T - 0.02, 18, 2.6, [-1, 0], { width: 4.6, height: 0.7, bg: '#1f3d6b', fg: '#f4efe2', font: 'bold 60px Arial, sans-serif' });
    for (const [u, v] of [[58, 9], [64, 9], [58, 27], [64, 27]]) {
      kit.box(u - 1.6, u + 1.6, v - 0.8, v + 0.8, 0.75, 0.8, 't:wood:#b08a5c');
      kit.box(u - 1.5, u + 1.5, v - 0.7, v + 0.7, 0.03, 0.75, 'c:#3a3f44', { collide: false });
      piece(kit, u - 0.6, v, 0.8, [1, 0], [[-0.25, 0.25, 0, 0.12, -0.3, 0.3, 'c:#d24a2a'], [-0.15, 0.15, 0.12, 0.3, -0.15, 0.15, M.dark], [-0.02, 0.02, 0.3, 0.55, -0.02, 0.02, M.bright]], 0, 0, 0);
      drum(kit, u - 0.6, v, 0.8, [1, 0], 0, 0.08, -0.33, 0.08, 0.05, M.black); drum(kit, u - 0.6, v, 0.8, [1, 0], 0, 0.08, 0.33, 0.08, 0.05, M.black);
      piece(kit, u + 0.7, v, 0.8, [0, 1], [[-0.25, 0.25, 0, 0.02, -0.18, 0.18, 'c:#2a7a3a'], [-0.18, 0.18, 0.02, 0.06, -0.12, 0.12, M.dark]], 0, 0, 0);
      for (const du of [-1.0, 0, 1.0]) for (const s of [-1, 1]) kit.cyl(u + du, v + s * 1.15, 0.03, 0.17, 0.6, M.wood, { seg: 8 });
    }
    toolBoard(kit, 69.5, 4, 0.03, [-1, 0]); toolBoard(kit, 69.5, 32, 0.03, [-1, 0]);
  });
  kit.room('wsHall', 'BITS Workshop · machine hall', T, U - T, T, V - T, 0, CREST);
  kit.room('wsToolRoom', 'BITS Workshop · tool room', 30, 40, 13.5, 22.5, 0, 4);
  kit.floors.push({ y: 0, name: 'Machine hall' });
}

// ================================================================ modules
const mod = (name, osm, frame, build) => ({ id: 'workshops', name, category: 'academic', osm, floors: 1, enabled: true, research: 'mixed', frame: () => frame, build });
export default [
  mod('BITS Workshop', ['BITS Workshop'], frameOf(WS.O, WS.eu, WS.U, WS.V), (kit) => buildWorkshop(kit)),
];
