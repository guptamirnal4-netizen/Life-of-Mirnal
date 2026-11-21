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

// ================================================================ 2. New BITS Workshop ("CENTRAL WORKSHOP")
// Two tall machine halls (north: lathes, the mezzanine and its stair; south: mills, drills, CNC room) and a two-storey
// entrance and admin block on the east with the recessed glazed entrance in its ochre frame.
const NW = { O: [37.4, -188.5], eu: [0.9881, -0.1539], U: 60.4, V: 41.4, HH: 8.0, AU: 47, FH: 4.4 };
function buildNewWorkshop(kit) {
  const { U, V, HH, AU, FH } = NW;
  const T = 0.3; const RF = 2 * FH; // admin roof 8.8
  const K = { ext: 't:plaster:#f2f0ea', int: 't:plaster:#eeece4', ochre: 'c:#c97d2c', ochreDark: 'c:#a8631f', frame: 'm:#2b2f33', truss: 'c:#b0302a', sheet: 'c:#c9cdcf', floor: 't:concrete:#9c9d99', floor1: 't:terrazzo:#c9c6bd', ceil: 'c:#f1efe9', coping: 'c:#e2ded4', rail: 'c:#1d1f21' };
  const L = (axis, c, out) => line(kit, axis, c, out);
  const bays = (s0, s1, n) => Array.from({ length: n }, (_, i) => s0 + ((s1 - s0) * (i + 0.5)) / n);
  // ---- hall walls: lower windows, a continuous clerestory band, pilasters, ochre base band
  const hallSides = [
    { L: L('u', T / 2, -1), s0: 0, s1: AU, doors: [{ at: 22, width: 1.8, top: 2.7, fire: true }] },
    { L: L('u', V - T / 2, 1), s0: 0, s1: AU, doors: [] },
    { L: L('v', T / 2, -1), s0: T, s1: V - T, doors: [{ at: 31, width: 4.4, top: 4.6, shutter: true }] },
  ];
  for (const sd of hallSides) {
    const n = Math.round((sd.s1 - sd.s0) / 6);
    const B = bays(sd.s0, sd.s1, n); const bw = (sd.s1 - sd.s0) / n;
    const lows = B.filter((s) => !sd.doors.some((d) => Math.abs(d.at - s) < d.width / 2 + 1.4));
    const ops = [...lows.map((s) => ({ at: s, width: 2.4, bottom: 1.2, top: 3.4 })), ...B.map((s) => ({ at: s, width: bw - 0.8, bottom: 6.0, top: 7.3 })), ...sd.doors.map((d) => ({ at: d.at, width: d.width, bottom: 0, top: d.top }))];
    wall2(kit, sd.L, sd.s0, sd.s1, 0, HH, K.ext, K.int, T, ops);
    for (const s of lows) glaze(sd.L, s, 2.4, 1.2, 2.2, T, { frame: K.frame, mull: 1, sill: 'c:#d8d4ca' });
    for (const s of B) glaze(sd.L, s, bw - 0.8, 6.0, 1.3, T, { frame: K.frame, mull: 3, transom: 0.99, sill: null });
    for (let k = 0; k <= n; k++) { const s = sd.s0 + k * bw; sd.L.box(s - 0.3, s + 0.3, T / 2 - 0.01, T / 2 + 0.15, 0, HH, K.ext); }
    let s = sd.s0;
    for (const d of [...sd.doors].sort((a, b) => a.at - b.at)) { sd.L.box(s, d.at - d.width / 2, T / 2, T / 2 + 0.17, 0, 0.9, K.ochre); s = d.at + d.width / 2; }
    sd.L.box(s, sd.s1, T / 2, T / 2 + 0.17, 0, 0.9, K.ochre);
    sd.L.box(sd.s0 - (sd.L.axis === 'v' ? T : 0), sd.s1, -T / 2, T / 2, HH, HH + 1.2, K.ext);
    sd.L.box(sd.s0 - (sd.L.axis === 'v' ? T : 0), sd.s1, -T / 2 - 0.05, T / 2 + 0.05, HH + 1.2, HH + 1.28, K.coping);
    for (const d of sd.doors) {
      if (d.fire) kit.door(true, d.at, sd.L.c, 0, d.width - 0.1, { height: d.top - 0.05, thick: T, side: 1, frame: 'c:#3f7a4a', leaf: 'c:#a8322b' });
      if (d.shutter) { sd.L.box(d.at - d.width / 2 - 0.2, d.at + d.width / 2 + 0.2, T / 2, T / 2 + 0.45, d.top, d.top + 0.55, K.frame); sd.L.box(d.at - d.width / 2 - 0.12, d.at - d.width / 2, T / 2, T / 2 + 0.12, 0, d.top, K.frame); sd.L.box(d.at + d.width / 2, d.at + d.width / 2 + 0.12, T / 2, T / 2 + 0.12, 0, d.top, K.frame); }
    }
  }
  // ---- admin block walls (two storeys), the recessed entrance in its ochre frame
  const EV0 = 15.7; const EV1 = 25.7; const EU = 57.5; // the recess
  const adminSides = [
    { L: L('u', T / 2, -1), s0: AU, s1: U, wins: [50, 54.5, 58.3] },
    { L: L('u', V - T / 2, 1), s0: AU, s1: U, wins: [50, 54.5, 58.3] },
    { L: L('v', U - T / 2, 1), s0: T, s1: V - T, wins: [3.2, 7.6, 12.0, 29.4, 33.8, 38.2], gap: [EV0, EV1] },
  ];
  for (const sd of adminSides) {
    for (const f of [0, 1]) {
      const y0 = f * FH;
      const ops = sd.wins.map((s) => ({ at: s, width: 2.4, bottom: 1.0, top: 3.2 }));
      if (sd.gap) ops.push({ at: (sd.gap[0] + sd.gap[1]) / 2, width: sd.gap[1] - sd.gap[0], bottom: 0, top: f === 0 ? FH + 1 : 3.6 });
      wall2(kit, sd.L, sd.s0, sd.s1, y0, y0 + FH, K.ext, K.int, T, ops);
      for (const s of sd.wins) glaze(sd.L, s, 2.4, y0 + 1.0, 2.2, T, { frame: K.frame, mull: 1, sill: 'c:#d8d4ca' });
      sd.L.box(sd.s0, sd.s1, T / 2 - 0.01, T / 2 + 0.6, y0 + 3.5, y0 + 3.62, K.coping); // sunshade
    }
    if (!sd.gap) sd.L.box(sd.s0, sd.s1, T / 2, T / 2 + 0.17, 0, 0.9, K.ochre);
    else for (const [a, b] of [[sd.s0, sd.gap[0] - 1], [sd.gap[1] + 1, sd.s1]]) sd.L.box(a, b, T / 2, T / 2 + 0.17, 0, 0.9, K.ochre);
    sd.L.box(sd.s0 - (sd.L.axis === 'v' ? T : 0), sd.s1 + (sd.L.axis === 'v' ? T : 0), -T / 2, T / 2, RF, RF + 0.9, K.ext);
    sd.L.box(sd.s0 - (sd.L.axis === 'v' ? T : 0), sd.s1 + (sd.L.axis === 'v' ? T : 0), -T / 2 - 0.05, T / 2 + 0.05, RF + 0.9, RF + 0.98, K.coping);
  }
  {
    // the ochre frame, the white mass over the recess, the sign
    const Le = L('v', U - T / 2, 1);
    Le.box(EV0 - 1.0, EV0, -T / 2, T / 2 + 0.7, 0, 8.3, K.ochre); Le.box(EV1, EV1 + 1.0, -T / 2, T / 2 + 0.7, 0, 8.3, K.ochre);
    Le.box(EV0 - 1.0, EV1 + 1.0, -T / 2, T / 2 + 0.7, 7.1, 8.3, K.ochre);
    Le.box(EV0 - 1.05, EV1 + 1.05, T / 2 + 0.7, T / 2 + 0.75, 0, 0.12, K.ochreDark);
    Le.box(EV0, EV1, -T / 2, T / 2, 8.3, RF + 0.9, K.ext, { collide: false });
    kit.sign('CENTRAL WORKSHOP', U + 0.72, (EV0 + EV1) / 2, 7.35, [1, 0], { width: 9.0, height: 0.75, bg: '#c97d2c', fg: '#ffffff', font: 'bold 72px Arial, sans-serif' });
    // recess side walls and the glazed screen with its doors
    for (const v of [EV0, EV1]) L('u', v, v === EV0 ? -1 : 1).wall(EU, U - T, 0, 7.1, K.ext, 0.3);
    const Lg = L('v', EU, 1);
    Lg.wall(EV0 + 0.15, EV1 - 0.15, 0, 7.1, K.ext, 0.2, [{ at: 18.6, width: 3.4, bottom: 0.3, top: 6.8 }, { at: 22.8, width: 3.4, bottom: 0.3, top: 6.8 }, { at: 20.7, width: 1.8, bottom: 0, top: 6.8 }]);
    for (const s of [18.6, 22.8]) glaze(Lg, s, 3.4, 0.3, 6.5, 0.2, { frame: K.frame, mull: 2, transom: 0.4, sill: null });
    glaze(Lg, 20.7, 1.8, 2.6, 4.2, 0.2, { frame: K.frame, mull: 0, transom: 0.5, sill: null });
    kit.door(false, 20.7, EU, 0, 1.7, { height: 2.55, thick: 0.2, side: -1, frame: K.frame, leaf: 'g:#9fbfcc' });
    kit.box(EU, U + 0.8, EV0 + 0.15, EV1 - 0.15, 0, 0.06, 't:paving:#b6aea0', { collide: false });
    ceiling(kit, EU, U - T, EV0, EV1, 7.1, K.ceil);
    rodLight(kit, 59, 20.7, 7.1, 0.3, [0, 1]);
    // approach: paved drive with low ochre walls
    kit.box(U + 0.8, U + 14, 17.2, 24.2, -0.02, 0.025, 't:paving:#a99f8e', { collide: false });
    for (const v of [16.9, 24.5]) kit.box(U + 1.5, U + 13, v - 0.15, v + 0.15, 0, 0.6, K.ochre);
  }
  kit.entrance('Main entrance (east)', U + 2.5, 20.7, [1, 0]);
  kit.entrance('Hall 2 loading door (west)', -1.6, 31, [-1, 0]);
  kit.entrance('Hall 1 fire door (north)', 22, -1.6, [0, -1]);
  // ---- roofs: hall roofs (low-pitch sheets behind the parapet, red trusses), admin roof slab, PV
  const halls = [[T, 20.575], [20.825, V - T]];
  for (const [a, b] of halls) {
    const m = (a + b) / 2; const eave = HH - 0.2; const ridge = HH + 0.75;
    for (const [p, q] of [[a, m], [m, b]]) bar(kit, [AU / 2, (p === a ? eave : ridge) + 0.08, p], [AU / 2, (q === b ? eave : ridge) + 0.08, q], AU - 0.3, K.sheet, 0.06);
    for (let u = 6; u < AU - 1; u += 6) {
      const bc = HH - 1.2;
      bar(kit, [u, bc, a + 0.1], [u, bc, b - 0.1], 0.14, K.truss);
      bar(kit, [u, eave, a + 0.05], [u, ridge, m], 0.14, K.truss); bar(kit, [u, ridge, m], [u, eave, b - 0.05], 0.14, K.truss);
      for (const f of [0.17, 0.33, 0.5, 0.67, 0.83]) {
        const v = a + (b - a) * f; const top = eave + (ridge - eave) * (1 - Math.abs(v - m) / (m - a));
        bar(kit, [u, bc, v], [u, top - 0.05, v], 0.07, K.truss);
        if (f !== 0.5) bar(kit, [u, bc, v], [u, eave + (ridge - eave) * (1 - Math.abs(v + (v < m ? 1 : -1) * (b - a) / 6 - m) / (m - a)) - 0.05, v + (v < m ? 1 : -1) * (b - a) / 6], 0.06, K.truss);
      }
      bar(kit, [u, bc, a + 0.1], [u, eave, a + 0.1], 0.14, K.truss); bar(kit, [u, bc, b - 0.1], [u, eave, b - 0.1], 0.14, K.truss);
    }
    for (const v of [a + 2, m - 3, m, m + 3, b - 2]) kit.box(T, AU, v - 0.06, v + 0.06, HH - 0.1 + (HH + 0.75 - (HH - 0.2)) * (1 - Math.abs(v - m) / (m - a)) - 0.12, HH - 0.1 + (HH + 0.75 - (HH - 0.2)) * (1 - Math.abs(v - m) / (m - a)) - 0.02, K.truss, { collide: false });
  }
  kit.slab(AU, U - T, T, V - T, RF, 't:concrete:#c9c4b8', { thick: 0.25, walkable: false, collide: false });
  for (let k = 0; k < 6; k++) { const v = 4 + k * 6; for (let j = 0; j < 4; j++) { const u = 48.5 + j * 2.6; quad(kit, [[u - 1.1, RF + 0.2, v + 0.8], [u + 1.1, RF + 0.2, v + 0.8], [u + 1.1, RF + 0.75, v - 0.8], [u - 1.1, RF + 0.75, v - 0.8]], 'm:#26355c'); kit.box(u - 1.0, u + 1.0, v - 0.75, v - 0.7, RF, RF + 0.75, 'm:#9aa1a6', { collide: false }); } }
  for (const v of [8, 33]) kit.cyl(58.5, v, RF, 0.8, 1.6, 'c:#2a2c2e', { seg: 14 });
  // admin first floor: slabs round the recess, ceilings
  for (const [u0, u1, v0, v1] of [[AU, U - T, T, EV0], [AU, EU, EV0, EV1], [AU, U - T, EV1, V - T]]) {
    kit.slab(u0, u1, v0, v1, FH, 'c:#ece7dc', { thick: 0.22 });
    kit.slab(u0, u1, v0, v1, FH + 0.012, K.floor1, { thick: 0.01, walkable: false, collide: false });
    ceiling(kit, u0, u1, v0, v1, FH - 0.225, K.ceil);
    ceiling(kit, u0, u1, v0, v1, RF - 0.255, K.ceil);
  }
  // the dividing wall between the halls (two wide openings) and the wall between the halls and the admin block
  L('u', 20.7, 1).wall(T, AU, 0, HH, K.int, 0.25, [{ at: 12, width: 4.2, bottom: 0, top: 4.4 }, { at: 30, width: 4.2, bottom: 0, top: 4.4 }]);
  L('v', AU, 1).wall(T, V - T, 0, HH + 1.2, K.int, 0.3, [{ at: 18.0, width: 2.4, bottom: 0, top: 3.0 }, { at: 23.4, width: 2.4, bottom: 0, top: 3.0 }, { at: 8.0, width: 1.6, bottom: FH, top: FH + 2.4 }]);
  // ---- the mezzanine in hall 1 (concrete walls under it, black railings) and its stair along the north wall
  const MZ = { u0: 41.0, u1: AU - 0.15, v0: T, v1: 20.575 };
  kit.slab(MZ.u0, MZ.u1, MZ.v0, MZ.v1, FH, 'c:#bdbab2', { thick: 0.3 });
  kit.box(MZ.u0 - 0.05, MZ.u0, MZ.v0, MZ.v1, FH - 0.3, FH + 0.02, K.ochre, { collide: false });
  L('v', MZ.u0 + 0.15, -1).wall(1.75, MZ.v1, 0, FH - 0.3, 't:concrete:#b9b5aa', 0.3, [{ at: 11, width: 1.6, bottom: 0, top: 2.4 }]);
  kit.door(false, 11, MZ.u0 + 0.15, 0, 1.5, { height: 2.35, thick: 0.3, side: -1, frame: 'c:#3f7a4a', leaf: 'c:#a8322b' });
  kit.rail(MZ.u0 + 0.05, 1.62, MZ.u0 + 0.05, MZ.v1 - 0.05, FH, K.rail);
  const steps = Math.ceil(FH / RISE_MAX); const rise = FH / steps; const run = steps * 0.28;
  const s0 = MZ.u0 - run;
  kit.flight(s0, 0.95, 0, [1, 0], steps, rise, 1.2, 'c:#6c7378');
  for (let j = 0; j <= steps; j += 4) { const u = s0 + j * 0.28 + 0.14; const y = Math.min(FH, (j + 1) * rise); kit.box(u - 0.02, u + 0.02, 1.53, 1.57, y, y + 1.0, K.rail, { collide: false }); }
  bar(kit, [s0 + 0.14, rise + 1.0, 1.55], [MZ.u0, FH + 1.0, 1.55], 0.05, K.rail);
  kit.stairs.push({ name: 'Mezzanine stair', u0: s0, u1: MZ.u0, v0: 0.35, v1: 1.55, y0: 0, y1: FH, along: 'u' });
  kit.sign('CENTRAL WORKSHOP · Hall 1', 24, 20.575 - 0.14, 4.6, [0, -1], { width: 5, height: 0.5, bg: '#2f3b46', fg: '#f4efe2', font: 'bold 56px Arial, sans-serif' });

  // ---- interiors
  kit.layer('halls', () => {
    kit.box(T, AU - 0.15, T, V - T, -0.05, 0.03, K.floor, { collide: false });
    for (const v of [4.0, 16.8, 24.4, 37.0]) kit.box(1.5, 40, v - 0.05, v + 0.05, 0.03, 0.036, M.yellow, { collide: false });
    for (const u of [1.5, 40]) kit.box(u - 0.05, u + 0.05, 4.0, 16.8, 0.03, 0.036, M.yellow, { collide: false });
    for (let u = 6; u < AU - 1; u += 6) for (const v of [5.2, 15.4, 26, 36]) { rodLight(kit, u + 3, v, HH - 1.2, 1.5); kit.cyl(u + 3, v, HH - 2.75, 0.35, 0.18, 'c:#4a5056', { seg: 12, rTop: 0.12 }); }
    // hall 1: two rows of lathes, benches along the dividing wall
    for (let u = 4; u < 38; u += 3.6) { lathe(kit, u, 7.0, 0.03, [0, 1]); lathe(kit, u, 13.6, 0.03, [0, -1]); }
    for (let u = 4; u < 30; u += 5) workbench(kit, u, 19.6, 0.03, [0, -1], { w: 2.4 });
    for (const v of [4, 9, 14]) toolBoard(kit, 1.0, v, 0.03, [1, 0]);
    // under the mezzanine: tool crib with shelves
    for (const v of [3, 5.2, 7.4, 9.6, 13.5]) kit.shelf(AU - 0.55, v, 0.03, [-1, 0], { w: 2.0, books: ['c:#8a8f94', 'c:#6f6253', 'c:#2f5d8a', 'c:#a8a08f'] });
    rodLight(kit, 44, 6, FH - 0.3, 0.05); rodLight(kit, 44, 15, FH - 0.3, 0.05);
    // hall 2: mills, drills, perforated tool benches, the glazed CNC room in the SW corner
    for (let u = 16; u < 40; u += 3.2) { mill(kit, u, 25.6, 0.03, [0, 1]); drill(kit, u + 1.6, 28.8, 0.03, [0, 1]); }
    for (let u = 18; u < 40; u += 4.6) workbench(kit, u, 35.6, 0.03, [0, -1], { w: 2.6, top: M.grey });
    for (const u of [20, 26, 32, 38]) toolBoard(kit, u, V - T - 0.45, 0.03, [0, -1]);
    const C = { u0: 1.0, u1: 13.0, v0: 30.5, v1: V - T };
    kit.box(C.u0, C.u1, C.v0 + 0.02, C.v0 + 0.05, 0.03, 3.2, 'g:#cfe0ea', { collide: false });
    kit.col(C.u0, C.u1 - 2.0, C.v0, C.v0 + 0.08, 0, 3.2); kit.col(C.u1 - 0.8, C.u1, C.v0, C.v0 + 0.08, 0, 3.2);
    for (let u = C.u0; u <= C.u1 + 1e-6; u += 1.2) kit.box(u - 0.03, u + 0.03, C.v0, C.v0 + 0.08, 0.03, 3.2, 'm:#b8bec2', { collide: false });
    kit.box(C.u0, C.u1, C.v0, C.v0 + 0.08, 3.2, 3.3, 'm:#b8bec2', { collide: false });
    L('v', C.u1, 1).wall(C.v0, C.v1, 0, 3.3, 'm:#b8bec2', 0.08, [{ at: 34, width: 2.4, bottom: 0.9, top: 3.2 }, { at: 38.5, width: 2.4, bottom: 0.9, top: 3.2 }]);
    kit.box(C.u0, C.u1 + 0.04, C.v0, C.v1, 3.3, 3.35, K.ceil, { collide: false });
    kit.box(C.u1 - 2.0, C.u1 - 0.8, C.v0, C.v0 + 0.08, 2.3, 3.2, 'c:#3f7a4a', { collide: false });
    cnc(kit, 4.0, 36.5, 0.03, [0, -1]); cnc(kit, 8.5, 36.5, 0.03, [0, -1]);
    pcDesk(kit, 10.6, 32.2, 0.03, [0, -1]);
    kit.box(C.u0 + 0.02, C.u1, C.v0, C.v1, 0.036, 0.04, 'c:#3f6fa8', { collide: false });
    kit.sign('MECHANICAL ENGG · CNC LAB', (C.u0 + C.u1) / 2, C.v0 - 0.01, 2.4, [0, -1], { width: 4.6, height: 0.4, bg: '#2f3b46', fg: '#f4efe2', font: 'bold 56px Arial, sans-serif' });
    rodLight(kit, 4, 34, 3.3, 0.02); rodLight(kit, 9, 34, 3.3, 0.02);
  });
  kit.layer('admin0', () => {
    kit.box(AU + 0.15, U - T, T, V - T, -0.05, 0.03, K.floor1, { collide: false });
    kit.box(AU + 0.15, EU - 0.1, EV0, EV1, -0.04, 0.035, 't:terrazzo:#b8b2a4', { collide: false });
    // lobby walls and rooms each side
    for (const v of [EV0, EV1]) { L('u', v, 1).wall(AU + 0.15, EU - 0.1, 0, FH - 0.22, K.int, 0.2, [{ at: 52.5, width: 1.2, bottom: 0, top: 2.4 }, { at: 55.5, width: 2.4, bottom: 0.9, top: 2.4 }]); kit.door(true, 52.5, v, 0, 1.1, { height: 2.35, thick: 0.2, side: v === EV0 ? -1 : 1, frame: 'c:#3f7a4a', leaf: 'c:#a8322b' }); glaze(L('u', v, v === EV0 ? -1 : 1), 55.5, 2.4, 0.9, 1.5, 0.2, { frame: 'm:#b8bec2', mull: 1, sill: null }); }
    counter(kit, 51.5, 20.7, 0.03, [1, 0], 3.6);
    kit.chair(50.6, 20.7, 0.03, [1, 0]);
    kit.board(AU + 0.2, 20.7, 0.03, [1, 0], { w: 2.6, h: 1.2, key: 'c:#2f4a6a' });
    sofa(kit, 55.5, 16.6, 0.03, [0, 1]);
    for (const [u, v] of [[50, 5], [54, 5], [50, 10], [54, 10]]) pcDesk(kit, u, v, 0.03, [0, -1]);
    for (const v of [28, 31, 34, 37]) kit.shelf(AU + 0.55, v + 0.5, 0.03, [1, 0], { w: 2.2, books: ['c:#8a8f94', 'c:#6f6253', 'c:#a8a08f'] });
    confTable(kit, 52, 57, 31, 36, 0.03);
    for (const [u, v] of [[50, 8], [55, 8], [51, 20.7], [55, 20.7], [50, 33], [55, 33]]) rodLight(kit, u, v, FH - 0.225, 0.05);
  });
  kit.layer('admin1', () => {
    for (const v of [EV0, EV1]) { L('u', v, 1).wall(AU + 0.15, v === EV0 ? U - T : U - T, FH, RF - 0.25, K.int, 0.2, [{ at: 50, width: 1.2, bottom: 0, top: 2.4 }]); kit.door(true, 50, v, FH, 1.1, { height: 2.35, thick: 0.2, side: v === EV0 ? 1 : -1, frame: 'c:#3f7a4a', leaf: 'c:#a8322b' }); }
    kit.rail(EU - 0.05, EV0 + 0.15, EU - 0.05, EV1 - 0.15, FH, K.rail);
    // drafting room (north), CAD lab (south)
    for (let u = 49; u < 59; u += 2.6) for (const v of [3, 6.4, 9.8, 13.0]) { kit.desk(u, v, FH, [0, -1], { w: 1.4, d: 0.9, top: 't:wood:#b08a5c' }); kit.chair(u, v + 0.7, FH, [0, -1]); }
    for (let u = 49.5; u < 59; u += 2.4) for (const v of [28.5, 32, 35.5, 39]) pcDesk(kit, u, v, FH, [0, -1]);
    kit.board(AU + 0.2, 8.0 + 3.5, FH, [1, 0], { w: 3.0, h: 1.2, key: 'c:#f2f2ee', frame: 'c:#9aa0a3' });
    for (const [u, v] of [[50, 4], [56, 4], [50, 11], [56, 11], [52, 20.7], [50, 30], [56, 30], [50, 37], [56, 37]]) rodLight(kit, u, v, RF - 0.255, 0.05);
    // mezzanine furniture
    for (const v of [5, 10, 15]) { kit.desk(44, v, FH, [-1, 0], { w: 1.6, d: 0.9, top: 't:wood:#b08a5c' }); kit.chair(44.6, v, FH, [-1, 0]); }
    lockers(kit, AU - 0.4, 18.5, FH, [-1, 0], 4);
  });
  kit.room('nwHall1', 'Central Workshop · Hall 1 (turning)', T, AU, T, 20.7, 0, HH);
  kit.room('nwHall2', 'Central Workshop · Hall 2 (milling)', T, AU, 20.7, V - T, 0, HH);
  kit.room('nwLobby', 'Central Workshop · entrance lobby', AU, EU, EV0, EV1, 0, FH);
  kit.room('nwMezz', 'Central Workshop · mezzanine', MZ.u0, AU, T, 20.7, FH, HH, 1);
  kit.room('nwDrafting', 'Central Workshop · drafting room', AU, U, T, EV0, FH, RF, 1);
  kit.room('nwCad', 'Central Workshop · CAD lab', AU, U, EV1, V, FH, RF, 1);
  kit.floors.push({ y: 0, name: 'Halls and lobby' }, { y: FH, name: 'Mezzanine and first floor' });
}

// ================================================================ 3. Rakesh Kapoor Innovation Centre
// Three levels of labs round an open courtyard (3 steps down from the arcade), grey round columns, galleries with
// steel railings, an orange timber-slat soffit; ochre walls with cream pilasters and window hoods; the cream and red
// portico on the south. Two stacked dog-leg stairs: in the east bump and in the north projection.
const RK = { O: [28.87, -304.06], eu: [0.9898, -0.1422], G: 0.45, FH: 3.75 };
const RK_OUT = [[0, 6.4], [8, 6.4], [8, 0], [25.6, 0], [25.6, 6.4], [33.2, 6.4], [33.2, 18.4], [38.1, 18.4], [38.1, 27.5], [31.1, 27.5], [31.1, 38.6], [23.7, 38.6], [23.7, 44.7], [10.2, 44.7], [10.2, 38.6], [0, 38.6]];
const RK_RECTS = [[0, 31.1, 6.4, 38.6], [31.1, 33.2, 6.4, 27.5], [8, 25.6, 0, 6.4], [33.2, 38.1, 18.4, 27.5], [10.2, 23.7, 38.6, 44.7]];
function inPolyUV(u, v, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [a, b] = poly[i]; const [p, q] = poly[j]; if ((b > v) !== (q > v) && u < ((p - a) * (v - b)) / (q - b) + a) c = !c; } return c; }
// Ceiling planes over rectangles minus holes.
function ceilRects(kit, rects, holes, y, key) {
  for (const [u0, u1, v0, v1] of rects) {
    const hs = holes.filter((h) => h.u1 > u0 && h.u0 < u1 && h.v1 > v0 && h.v0 < v1);
    const vs = [...new Set([v0, v1, ...hs.flatMap((h) => [h.v0, h.v1])])].filter((x) => x >= v0 && x <= v1).sort((a, b) => a - b);
    for (let j = 0; j < vs.length - 1; j++) {
      const vm = (vs[j] + vs[j + 1]) / 2; let s = u0;
      for (const h of hs.filter((q) => vm > q.v0 && vm < q.v1).sort((a, b) => a.u0 - b.u0)) { if (h.u0 > s) ceiling(kit, s, Math.min(h.u0, u1), vs[j], vs[j + 1], y, key); s = Math.max(s, h.u1); }
      if (u1 > s) ceiling(kit, s, u1, vs[j], vs[j + 1], y, key);
    }
  }
}
// Furniture by room type in the rectangle r (u0, u1, v0, v1) at floor y; `front` is the side the board/screen is on.
function furnishRoom(kit, r, y, type, ceil) {
  const [u0, u1, v0, v1] = [r[0] + 0.2, r[1] - 0.2, r[2] + 0.2, r[3] - 0.2];
  const W = u1 - u0; const D = v1 - v0; const cu = (u0 + u1) / 2; const cv = (v0 + v1) / 2;
  const nu = Math.max(1, Math.round(W / 3.2)); const nv = Math.max(1, Math.round(D / 3.2));
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) rodLight(kit, u0 + (W * (i + 0.5)) / nu, v0 + (D * (j + 0.5)) / nv, ceil, 0.04, W > D ? [1, 0] : [0, 1]);
  const longU = W >= D;
  if (type === 'lab' || type === 'class') {
    const f = longU ? [-1, 0] : [0, -1]; // facing the low end
    kit.board(...(longU ? [u0 + 0.02, cv] : [cu, v0 + 0.02]), y, longU ? [1, 0] : [0, 1], { w: Math.min(3.6, (longU ? D : W) - 1), h: 1.2, key: type === 'lab' ? 'c:#f2f2ee' : 'c:#22302a', frame: 'c:#9aa0a3' });
    const len = longU ? W : D; const wid = longU ? D : W;
    const cols = Math.max(1, Math.floor((wid - 0.8) / (type === 'lab' ? 1.7 : 2.2)));
    for (let s = 2.4; s < len - 0.6; s += type === 'lab' ? 1.7 : 1.15) for (let k = 0; k < cols; k++) {
      const b = (longU ? v0 : u0) + 0.4 + ((wid - 0.8) * (k + 0.5)) / cols; const a = (longU ? u0 : v0) + s;
      if (type === 'lab') pcDesk(kit, longU ? a : b, longU ? b : a, y, f);
      else kit.benchDesk(longU ? a : b, longU ? b : a, y, f.map((x) => -x).map((x) => -x), { w: 1.8 });
    }
    return;
  }
  if (type === 'conf') {
    const m = Math.min(W, D) * 0.28; const n = Math.max(W, D) * 0.32;
    confTable(kit, cu - (longU ? n : m), cu + (longU ? n : m), cv - (longU ? m : n), cv + (longU ? m : n), y);
    kit.box(...(longU ? [u1 - 0.06, u1, cv - 1.2, cv + 1.2] : [cu - 1.2, cu + 1.2, v1 - 0.06, v1]), y + 1.0, y + 2.3, 'e:#dfe8ee', { collide: false });
    return;
  }
  if (type === 'maker') {
    for (let s = 1.6; s < (longU ? W : D) - 1; s += 2.6) { const [a, b] = longU ? [u0 + s, cv] : [cu, v0 + s]; workbench(kit, a, b, y, longU ? [0, 1] : [1, 0], { w: 2.0, top: 't:wood:#b08a5c' }); piece(kit, a + (longU ? -0.5 : 0), b + (longU ? 0 : -0.5), y + 0.88, [0, 1], [[-0.22, 0.22, 0, 0.45, -0.22, 0.22, 'c:#e8e8e2'], [-0.18, 0.18, 0.06, 0.36, -0.23, -0.22, 'g:#9fc3d6'], [-0.06, 0.06, 0.1, 0.16, -0.06, 0.06, 'c:#d24a2a']], 0, 0, 0); }
    for (let s = 1.2; s < (longU ? W : D) - 1; s += 2.0) kit.shelf(...(longU ? [u0 + s, v0 + 0.25] : [u0 + 0.25, v0 + s]), y, longU ? [0, 1] : [1, 0], { w: 1.8, books: ['c:#8a8f94', 'c:#d24a2a', 'c:#2f5d8a', 'c:#a8a08f'] });
    return;
  }
  if (type === 'reception') {
    counter(kit, cu, v0 + 2.0, y, [0, 1], Math.min(3.4, W - 1.5));
    sofa(kit, cu - 1.2, v1 - 1.0, y, [0, -1], { c: 'c:#8a2b24' }); sofa(kit, cu + 1.4, v1 - 1.0, y, [0, -1], { c: 'c:#8a2b24' });
    kit.box(cu - 0.5, cu + 0.5, v1 - 2.4, v1 - 1.9, y, y + 0.42, 't:wood:#6f4a2f');
    return;
  }
  if (type === 'vr') {
    kit.box(u0 + 0.5, u1 - 0.5, v0 + 0.5, v1 - 0.5, y, y + 0.012, 'c:#3a3f55', { collide: false });
    for (let s = 1.5; s < (longU ? W : D) - 1; s += 3.0) pcDesk(kit, ...(longU ? [u0 + s, v1 - 0.5] : [u1 - 0.5, v0 + s]), y, longU ? [0, 1] : [1, 0]);
    return;
  }
  // cowork / office: clusters of four desks, a sofa
  for (let a = 2.4; a < W - 1.6; a += 3.4) for (let b = 2.0; b < D - 1.6; b += 3.0) {
    for (const [du, dv, f] of [[-0.75, -0.4, [0, 1]], [0.75, -0.4, [0, 1]], [-0.75, 0.4, [0, -1]], [0.75, 0.4, [0, -1]]]) { kit.desk(u0 + a + du, v0 + b + dv, y, f, { w: 1.4, d: 0.7, top: 'c:#e2ddd2' }); kit.chair(u0 + a + du, v0 + b + dv - f[1] * 0.65, y, f, { seat: 'c:#c25a2a' }); }
  }
}

function buildRKIC(kit) {
  const { G, FH } = RK;
  const LV = [G, G + FH, G + 2 * FH]; const R = G + 3 * FH;
  const T = 0.3;
  const K = { ochre: 't:plaster:#d8a64e', cream: 'c:#efe3c8', plinth: 'c:#55585a', frame: 'm:#2b2f33', int: 't:plaster:#f1ede4', col: 'c:#8d9196', slat: 't:wood:#e0904c', floor: 't:terrazzo:#a9a7a2', gallery: 't:paving:#9a9893', ceil: 'c:#f3f1ec', red: 'c:#a52a22', rail: 'm:#9aa1a6', roof: 't:concrete:#c9c4b8' };
  const L = (axis, c, out) => line(kit, axis, c, out);
  const C = { u0: 10.5, u1: 23, v0: 15, v1: 30.5 };
  const GAL = { u0: 7.9, u1: 25.6, v0: 12.4, v1: 33.1 };
  // ---- stairs (both stacked G -> L1 -> L2)
  const SE = { u0: 33.35, u1: 37.75, v0: 18.75, v1: 27.2 };
  const SN = { u0: 8.45, u1: 17.3, v0: 0.45, v1: 5.2 };
  const hE = []; const hN = [];
  for (const k of [0, 1]) {
    hE.push(dogleg(kit, SE.u0, SE.u1, SE.v0, SE.v1, LV[k], LV[k + 1], { along: 'v', key: 't:terrazzo:#bdb8ad', name: `East stair ${k === 0 ? 'G-1' : '1-2'}`, topRail: k === 1 }));
    hN.push(dogleg(kit, SN.u0, SN.u1, SN.v0, SN.v1, LV[k], LV[k + 1], { along: 'u', key: 't:terrazzo:#bdb8ad', name: `North stair ${k === 0 ? 'G-1' : '1-2'}`, topRail: k === 1 }));
  }
  const nStart = kit.stairs.find((s) => s.name === 'North stair G-1').start;
  // ---- floors: the plinth (G), slabs at L1 and L2, roof
  for (const [u0, u1, v0, v1] of RK_RECTS) {
    kit.slab(u0, u1, v0, v1, G, K.floor, { thick: G, holes: [C] });
    for (const k of [1, 2]) {
      kit.slab(u0, u1, v0, v1, LV[k], 'c:#e6e2d8', { thick: 0.22, holes: [C, hE[k - 1], hN[k - 1]] });
      kit.slab(u0, u1, v0, v1, LV[k] + 0.012, K.floor, { thick: 0.01, holes: [C, hE[k - 1], hN[k - 1]], walkable: false, collide: false });
    }
    kit.slab(u0, u1, v0, v1, R, K.roof, { thick: 0.25, holes: [C], walkable: false, collide: false });
  }
  // gallery paving ring at each level (just over the floor finish)
  for (const k of [0, 1, 2]) {
    const y = LV[k] + (k === 0 ? 0.004 : 0.016);
    for (const [u0, u1, v0, v1] of [[GAL.u0, GAL.u1, GAL.v0, C.v0], [GAL.u0, GAL.u1, C.v1, GAL.v1], [GAL.u0, C.u0, C.v0, C.v1], [C.u1, GAL.u1, C.v0, C.v1]]) kit.box(u0, u1, v0, v1, y, y + 0.004, K.gallery, { collide: false });
  }
  for (const k of [0, 1, 2]) {
    const top = k < 2 ? LV[k + 1] - 0.225 : R - 0.255;
    ceilRects(kit, RK_RECTS, [C], top, K.ceil);
    // orange timber slats under the gallery ring
    for (let u = GAL.u0 + 0.15; u < GAL.u1; u += 0.25) for (const [a, b] of [[GAL.v0, C.v0 - 0.35], [C.v1 + 0.35, GAL.v1]]) kit.box(u - 0.04, u + 0.04, a, b, top - 0.09, top - 0.01, K.slat, { collide: false });
    for (let v = C.v0 + 0.15; v < C.v1; v += 0.25) for (const [a, b] of [[GAL.u0, C.u0 - 0.35], [C.u1 + 0.35, GAL.u1]]) kit.box(a, b, v - 0.04, v + 0.04, top - 0.09, top - 0.01, K.slat, { collide: false });
  }
  // ---- courtyard: three steps down, setts, lawn strips, a circular motif, bollards; columns, railings
  const ring = (inset, top) => {
    const [a0, a1, b0, b1] = [C.u0 + inset, C.u1 - inset, C.v0 + inset, C.v1 - inset];
    kit.box(a0, a1, b0, b0 + 0.35, 0, top, K.gallery, { walkable: true }); kit.box(a0, a1, b1 - 0.35, b1, 0, top, K.gallery, { walkable: true });
    kit.box(a0, a0 + 0.35, b0 + 0.35, b1 - 0.35, 0, top, K.gallery, { walkable: true }); kit.box(a1 - 0.35, a1, b0 + 0.35, b1 - 0.35, 0, top, K.gallery, { walkable: true });
  };
  ring(0, 0.3); ring(0.35, 0.15);
  kit.box(C.u0 + 0.7, C.u1 - 0.7, C.v0 + 0.7, C.v1 - 0.7, -0.03, 0.02, 't:paving:#8d8a85', { collide: false });
  for (const v of [C.v0 + 2.2, C.v1 - 2.2]) kit.box(C.u0 + 1.5, C.u1 - 1.5, v - 0.5, v + 0.5, 0.02, 0.03, 't:grass:#7fa75a', { collide: false });
  kit.cyl((C.u0 + C.u1) / 2, (C.v0 + C.v1) / 2, 0.02, 2.4, 0.015, 'c:#6e6a66', { seg: 32 });
  kit.cyl((C.u0 + C.u1) / 2, (C.v0 + C.v1) / 2, 0.035, 1.6, 0.012, 'c:#a33a2a', { seg: 32 });
  for (const [u, v] of [[C.u0 + 1.2, C.v0 + 1.2], [C.u1 - 1.2, C.v0 + 1.2], [C.u0 + 1.2, C.v1 - 1.2], [C.u1 - 1.2, C.v1 - 1.2]]) { kit.cyl(u, v, 0, 0.1, 0.8, 'c:#3a3d40', { seg: 8 }); kit.cyl(u, v, 0.8, 0.1, 0.08, 'e:#fff1c4', { seg: 8 }); }
  const colAt = [];
  for (let k = 0; k <= 4; k++) { const u = C.u0 + 0.3 + ((C.u1 - C.u0 - 0.6) * k) / 4; colAt.push([u, C.v0 - 0.35], [u, C.v1 + 0.35]); }
  for (let k = 1; k < 5; k++) { const v = C.v0 + 0.3 + ((C.v1 - C.v0 - 0.6) * k) / 5; colAt.push([C.u0 - 0.35, v], [C.u1 + 0.35, v]); }
  for (const [u, v] of colAt) kit.cyl(u, v, G, 0.25, R - G, K.col, { seg: 14, collide: true });
  for (const k of [1, 2]) {
    const y = LV[k];
    kit.rail(C.u0 + 0.1, C.v0 - 0.1, C.u1 - 0.1, C.v0 - 0.1, y, K.rail); kit.rail(C.u0 + 0.1, C.v1 + 0.1, C.u1 - 0.1, C.v1 + 0.1, y, K.rail);
    kit.rail(C.u0 - 0.1, C.v0 - 0.1, C.u0 - 0.1, C.v1 + 0.1, y, K.rail); kit.rail(C.u1 + 0.1, C.v0 - 0.1, C.u1 + 0.1, C.v1 + 0.1, y, K.rail);
    for (const [u0, u1, v0, v1] of [[C.u0 - 0.05, C.u1 + 0.05, C.v0 - 0.3, C.v0 - 0.02], [C.u0 - 0.05, C.u1 + 0.05, C.v1 + 0.02, C.v1 + 0.3], [C.u0 - 0.3, C.u0 - 0.02, C.v0, C.v1], [C.u1 + 0.02, C.u1 + 0.3, C.v0, C.v1]]) kit.box(u0, u1, v0, v1, y - 0.6, y + 0.02, K.cream, { collide: false });
  }
  // roof parapet round the court
  for (const [u0, u1, v0, v1] of [[C.u0 - 0.25, C.u1 + 0.25, C.v0 - 0.25, C.v0], [C.u0 - 0.25, C.u1 + 0.25, C.v1, C.v1 + 0.25], [C.u0 - 0.25, C.u0, C.v0, C.v1], [C.u1, C.u1 + 0.25, C.v0, C.v1]]) { kit.box(u0, u1, v0, v1, R - 0.6, R + 0.9, K.cream, { collide: false }); }

  // ---- outer facades, edge by edge
  const n = RK_OUT.length;
  const PORT = { s0: 12.2, s1: 21.7, top: G + 3.0 };
  for (let i = 0; i < n; i++) {
    const p = RK_OUT[i]; const q = RK_OUT[(i + 1) % n];
    const axis = Math.abs(p[1] - q[1]) < 1e-6 ? 'u' : 'v';
    const cEdge = axis === 'u' ? p[1] : p[0]; const s0 = Math.min(axis === 'u' ? p[0] : p[1], axis === 'u' ? q[0] : q[1]); const s1 = Math.max(axis === 'u' ? p[0] : p[1], axis === 'u' ? q[0] : q[1]);
    const sm = (s0 + s1) / 2; const probe = axis === 'u' ? [sm, cEdge + 0.5] : [cEdge + 0.5, sm];
    const out = inPolyUV(probe[0], probe[1], RK_OUT) ? -1 : 1;
    const Le = L(axis, cEdge - out * T / 2, out);
    const len = s1 - s0;
    const isPortico = axis === 'u' && Math.abs(cEdge - 44.7) < 1e-6;
    const isBumpE = axis === 'v' && Math.abs(cEdge - 38.1) < 1e-6;
    const isStairN = axis === 'u' && Math.abs(cEdge) < 1e-6;
    for (const k of [0, 1, 2]) {
      const y0 = k === 0 ? 0 : LV[k]; const y1 = k < 2 ? LV[k + 1] : R; const fl = LV[k];
      let wins = [];
      if (isBumpE) wins = [{ at: 20.0, width: 1.0, bottom: fl + 0.9 - y0, top: fl + 3.0 - y0 }];
      else if (len > 2.4) {
        const m = Math.max(1, Math.floor((len - 0.8) / 3.0)); const sp = len / m;
        for (let j = 0; j < m; j++) wins.push({ at: s0 + sp * (j + 0.5), width: Math.min(1.6, sp - 1.2), bottom: fl + 0.9 - y0, top: fl + 2.7 - y0 });
        if (isStairN) wins = wins.filter((w) => w.at > SN.u1 + 0.6);
      }
      const ops = [...wins];
      if (isPortico && k === 0) { ops.length = 0; ops.push({ at: (PORT.s0 + PORT.s1) / 2, width: PORT.s1 - PORT.s0, bottom: 0, top: PORT.top }); }
      wall2(kit, Le, s0, s1, y0, y1, K.ochre, K.int, T, ops);
      for (const w of wins) {
        if (isPortico && k === 0) continue;
        glaze(Le, w.at, w.width, y0 + w.bottom, w.top - w.bottom, T, { frame: K.frame, mull: 1, transom: 0.7, sill: K.cream });
        Le.box(w.at - w.width / 2 - 0.15, w.at + w.width / 2 + 0.15, T / 2 - 0.01, T / 2 + 0.55, y0 + w.top + 0.05, y0 + w.top + 0.2, K.cream); // hood
        Le.box(w.at - w.width / 2 - 0.15, w.at - w.width / 2 - 0.05, T / 2 - 0.01, T / 2 + 0.55, y0 + w.top - 0.25, y0 + w.top + 0.05, K.cream);
        Le.box(w.at + w.width / 2 + 0.05, w.at + w.width / 2 + 0.15, T / 2 - 0.01, T / 2 + 0.55, y0 + w.top - 0.25, y0 + w.top + 0.05, K.cream);
      }
      if (k > 0) Le.box(s0, s1, T / 2 - 0.01, T / 2 + 0.06, fl - 0.25, fl + 0.05, K.cream); // floor band
    }
    // pilasters (full height) at the ends and every ~6 m, plinth, cornice, parapet
    const pm = Math.max(1, Math.round(len / 6));
    for (let j = 0; j <= pm; j++) { const s = s0 + (len * j) / pm; Le.box(Math.max(s0 - (j === 0 ? 0.0 : 0), s - 0.35), Math.min(s1, s + 0.35), T / 2 - 0.01, T / 2 + 0.14, G, R + 0.9, K.cream); }
    if (!(isPortico)) Le.box(s0, s1, T / 2 - 0.01, T / 2 + 0.08, 0, G + 0.35, K.plinth);
    else { Le.box(s0, PORT.s0, T / 2 - 0.01, T / 2 + 0.08, 0, G + 0.35, K.plinth); Le.box(PORT.s1, s1, T / 2 - 0.01, T / 2 + 0.08, 0, G + 0.35, K.plinth); }
    Le.box(s0, s1, T / 2 - 0.01, T / 2 + 0.3, R - 0.1, R + 0.15, K.cream);
    Le.box(s0, s1, -T / 2, T / 2, R, R + 0.9, K.ochre);
    Le.box(s0, s1, -T / 2 - 0.05, T / 2 + 0.05, R + 0.9, R + 0.98, K.cream);
  }
  // ---- the south portico: cream gateway with a red frame, the name, steps, the name wall and paving
  {
    const Lp = L('u', 44.7 - T / 2, 1); const um = (PORT.s0 + PORT.s1) / 2;
    Lp.box(PORT.s0 - 1.2, PORT.s0, -T / 2, T / 2 + 0.6, 0, R + 1.4, K.cream); Lp.box(PORT.s1, PORT.s1 + 1.2, -T / 2, T / 2 + 0.6, 0, R + 1.4, K.cream);
    Lp.box(PORT.s0 - 1.2, PORT.s1 + 1.2, -T / 2, T / 2 + 0.6, PORT.top, PORT.top + 1.2, K.cream);
    Lp.box(PORT.s0 - 1.2, PORT.s1 + 1.2, -T / 2, T / 2 + 0.6, R + 0.9, R + 1.4, K.cream);
    Lp.box(PORT.s0 - 0.25, PORT.s0, T / 2 + 0.6, T / 2 + 0.66, 0, PORT.top, K.red); Lp.box(PORT.s1, PORT.s1 + 0.25, T / 2 + 0.6, T / 2 + 0.66, 0, PORT.top, K.red);
    Lp.box(PORT.s0 - 0.25, PORT.s1 + 0.25, T / 2 + 0.6, T / 2 + 0.66, PORT.top, PORT.top + 0.25, K.red);
    kit.sign('RAKESH KAPOOR INNOVATION CENTRE', um, 44.7 + 0.67, PORT.top + 0.35, [0, 1], { width: 9.4, height: 0.7, bg: '#f3ead6', fg: '#a52a22', font: 'bold 64px Georgia, serif' });
    for (const [a, b, top] of [[44.7, 45.0, G], [45.0, 45.3, 0.3], [45.3, 45.6, 0.15]]) kit.box(PORT.s0, PORT.s1, a, b, 0, top, 't:paving:#8d8a85', { walkable: true });
    ceiling(kit, 10.5, 23.4, 38.6, 44.4, LV[1] - 0.225, K.slat);
    // forecourt: grey pavers with maroon bands, the stone name wall with its curved plinth
    kit.box(-1, 34, 45.6, 58, -0.02, 0.022, 't:paving:#9a9690', { collide: false });
    for (const v of [48, 51, 54]) kit.box(-1, 34, v - 0.2, v + 0.2, 0.022, 0.026, 'c:#7a2b2b', { collide: false });
    kit.box(1.5, 9.5, 51.5, 52.1, 0, 1.7, 't:concrete:#7d7b78');
    kit.cyl(5.5, 52.6, 0, 3.2, 0.35, 't:concrete:#8a8784', { seg: 24 });
    kit.sign('RAKESH KAPOOR INNOVATION CENTRE · BITS Pilani', 5.5, 52.12, 0.5, [0, 1], { width: 7.4, height: 0.9, bg: '#6f6d6a', fg: '#f3ead6', font: 'bold 54px Georgia, serif' });
    for (const u of [-1, 34]) for (const v of [47, 56]) { kit.cyl(u, v, 0, 0.08, 5.5, 'm:#8a9096', { seg: 8 }); kit.box(u - 0.35, u + 0.35, v - 0.12, v + 0.12, 5.4, 5.55, 'e:#fff3d0', { collide: false }); }
  }
  kit.entrance('South portico', 17, 46.6, [0, 1]);
  // ---- roof: stair heads, water tanks, AC units
  for (const [u0, u1, v0, v1] of [[SE.u0 - 0.1, SE.u1 + 0.1, SE.v0, SE.v1], [SN.u0 - 0.1, SN.u1, SN.v0, SN.v1 + 0.2]]) { kit.box(u0, u1, v0, v1, R, R + 2.8, K.ochre, { collide: false }); kit.box(u0 - 0.2, u1 + 0.2, v0 - 0.2, v1 + 0.2, R + 2.8, R + 3.0, K.cream, { collide: false }); }
  for (const [u, v] of [[3, 10], [3, 34], [28, 34]]) kit.cyl(u, v, R, 0.8, 1.5, 'c:#2a2c2e', { seg: 14 });
  for (let u = 2; u < 7; u += 1.6) for (const v of [20, 24]) kit.box(u - 0.5, u + 0.5, v - 0.4, v + 0.4, R, R + 0.9, 'c:#d9dcd8', { collide: false });

  // ---- interiors, one zone per level
  const plates = []; const pIdx = {};
  const rooms = [
    [[0.3, 7.9, 6.7, 17], 'r1', ['IoT Tinkering Lab', 'AI Lab', 'Technology Enabling Centre'], ['maker', 'lab', 'cowork']],
    [[0.3, 7.9, 17, 28], 'r2', ['Maker Space', 'API Lab', 'Co-working Zone'], ['maker', 'lab', 'cowork']],
    [[0.3, 7.9, 28, 38.3], 'r3', ['UI/UX Lab', 'AR/VR Lab', 'Incubator Offices'], ['lab', 'vr', 'cowork']],
    [[17.3, 25.45, 0.3, 12.4], 'n1', ['Vinati Organics Conference Room', 'CG-CV Lab', 'Board Room'], ['conf', 'lab', 'conf']],
    [[25.6, 32.9, 6.7, 18.4], 'e1', ['Reception · PIEDS', 'Fin-Tech Lab', 'Start-up Offices'], ['reception', 'lab', 'cowork']],
    [[25.6, 30.8, 22.4, 38.3], 'e2', ['Co-working', 'Co-working', 'Co-working'], ['cowork', 'cowork', 'cowork']],
  ];
  for (const [, id, names] of rooms) names.forEach((nm, k) => { pIdx[`${id}${k}`] = plates.length; plates.push([`${['G', '1', '2'][k]}·${id.toUpperCase()}`, nm]); });
  for (const [k, nm] of [[0, 'Hari Menon Conference Room'], [0, 'Prem Talreja Conference Room'], [1, 'Seminar Hall'], [2, 'Co-working Hall']]) { pIdx[nm] = plates.length; plates.push([['G', '1', '2'][k] + ' · S', nm]); }
  kit.texture('rkplates', () => plateAtlas(plates, { cols: 4, cw: 320, ch: 72, bg: '#3b3f44', fg: '#f3ead6', sub: '#e6c58a' }));
  const doorPlate = (Lw, s, y, key, flip = 1) => { const i = pIdx[key]; if (i === undefined) return; const [pu, pv] = Lw.P(s + 1.0, flip * (0.125 + 0.006)); plate(kit, 'rkplates', i, pu, pv, y + 1.7, 0.82, 0.18, Lw.dir.map((x) => x * flip)); };
  const DOORK = { frame: 'c:#3b3f44', leaf: 't:wood:#9a7b55' };
  for (const k of [0, 1, 2]) {
    kit.layer(`L${k}`, () => {
      const y = LV[k]; const top = k < 2 ? LV[k + 1] - 0.225 : R - 0.255; const h = top - y;
      // gallery walls with doors and glazed panels
      const gw = [
        { L: L('v', GAL.u0, -1), s0: 6.7, s1: 38.3, doors: [[14, 'r1'], [22.5, 'r2'], [31, 'r3']] },
        { L: L('v', GAL.u1, 1), s0: 6.7, s1: 38.3, doors: [[15, 'e1'], [30, 'e2']], open: [[18.55, 22.25]] },
        { L: L('u', GAL.v0, -1), s0: 17.3, s1: GAL.u1, doors: [[21, 'n1']] },
        { L: L('u', GAL.v1, 1), s0: GAL.u0, s1: GAL.u1, doors: k === 0 ? [[11, 'Hari Menon Conference Room'], [23, 'Prem Talreja Conference Room']] : [[12, k === 1 ? 'Seminar Hall' : 'Co-working Hall'], [21.5, null]], open: k === 0 ? [[14.1, 19.7]] : [] },
      ];
      for (const w of gw) {
        const ops = w.doors.map(([s]) => ({ at: s, width: 1.1, bottom: 0, top: 2.4 }));
        for (const [a, b] of w.open || []) ops.push({ at: (a + b) / 2, width: b - a, bottom: 0, top: Math.min(3.0, h - 0.1) });
        const glz = [];
        for (let s = w.s0 + 1.5; s < w.s1 - 1.2; s += 2.6) if (!ops.some((o) => Math.abs(o.at - s) < o.width / 2 + 1.4)) glz.push(s);
        for (const s of glz) ops.push({ at: s, width: 1.6, bottom: 0.9, top: 2.4 });
        w.L.wall(w.s0, w.s1, y, top, K.int, 0.25, ops);
        for (const s of glz) glaze(w.L, s, 1.6, y + 0.9, 1.5, 0.25, { frame: K.frame, mull: 0, sill: null, recess: 0.03 });
        for (const [s, id] of w.doors) { kit.door(w.L.axis === 'u', s, w.L.c, y, 1.0, { height: 2.35, side: -w.L.out, ...DOORK }); if (id) doorPlate(w.L, s, y, id.length < 3 ? `${id}${k}` : id); }
      }
      // radial partitions
      for (const v of [17, 28]) L('u', v, 1).wall(0.3, GAL.u0 - 0.125, y, top, K.int, 0.2);
      L('v', 17.3, 1).wall(0.3, GAL.v0 - 0.125, y, top, K.int, 0.2);
      for (const v of [18.4, 22.4]) L('u', v, 1).wall(GAL.u1 + 0.125, 33.2, y, top, K.int, 0.2);
      L('v', 33.2, 1).wall(22.5, 27.5, y, top, K.int, 0.25);
      L('v', 30.95, 1).wall(27.6, 38.3, y, top, K.int, 0.01, [], false);
      // north stair: wall between the flights' side and the lobby
      L('u', SN.v1 + 0.08, 1).wall(nStart, SN.u1, y, top, K.int, 0.15);
      if (k === 0) {
        for (const u of [14, 19.8]) L('v', u, 1).wall(GAL.v1 + 0.125, 38.6, y, top, K.int, 0.2);
        for (const [a, b] of [[10.2, 14], [19.8, 23.7]]) L('u', 38.6, 1).wall(a, b, y, top, K.int, 0.2);
        furnishRoom(kit, [7.9, 14, 33.1, 38.6], y, 'conf', top); furnishRoom(kit, [19.8, 25.6, 33.1, 38.6], y, 'conf', top);
        // the arcade: benches, a fire-hose cabinet, the lift
        for (const [u, v] of [[9.2, 20], [24.3, 25]]) kit.box(u - 0.25, u + 0.25, v - 1, v + 1, y, y + 0.45, 't:wood:#8f6f4b');
        kit.box(GAL.u0 + 0.13, GAL.u0 + 0.3, 26, 26.9, y + 0.9, y + 2.0, K.red, { collide: false });
        kit.box(17.4, 19.2, 10.5, 12.25, y, y + 2.3, 'm:#9aa1a6');
      } else furnishRoom(kit, [7.9, 25.6, 33.1, 44.4], y, k === 1 ? 'class' : 'cowork', top);
      for (const [r, id, , types] of rooms) furnishRoom(kit, r, y, types[k], top);
      // gallery lights
      for (let u = GAL.u0 + 1.3; u < GAL.u1; u += 3.2) for (const v of [(GAL.v0 + C.v0) / 2, (C.v1 + GAL.v1) / 2]) rodLight(kit, u, v, top - 0.09, 0.02);
      for (let v = C.v0 + 2; v < C.v1; v += 3.2) for (const u of [(GAL.u0 + C.u0) / 2, (C.u1 + GAL.u1) / 2]) rodLight(kit, u, v, top - 0.09, 0.02, [0, 1]);
      for (const [u, v] of [[12, 3], [14, 8], [29, 20.4], [35.5, 20]]) rodLight(kit, u, v, top, 0.02);
    });
  }
  for (const [r, id, names] of rooms) names.forEach((nm, k) => kit.room(`rk${k}:${id}`, nm, r[0], r[1], r[2], r[3], LV[k], k < 2 ? LV[k + 1] : R, k));
  kit.room('rkCourt', 'RKIC courtyard', C.u0, C.u1, C.v0, C.v1, 0, R);
  kit.room('rkPortico', 'RKIC portico', 10.2, 23.7, 38.6, 44.7, G, LV[1]);
  kit.floors.push({ y: LV[0], name: 'Ground (arcade, Maker Space, reception)' }, { y: LV[1], name: 'Level 1 (labs)' }, { y: LV[2], name: 'Level 2 (co-working, TEC)' });
}

// ================================================================ 4. Lecture Theatre Complex (not in OSM)
// Footprint from research (review.md: x 285...347, z -231...-135; kept 12 m clear of FD-I's east projection).
// Pink and cream: a ring of single-storey arcades (semicircular arches on square piers) round a long lawn with a raised
// circular stage; three raked lecture theatres under sloped roofs on the west; two-storey classroom blocks on the north,
// east and south, their first floors opening onto the arcade roofs. Ramps and steps with steel railings.
const LTC = { O: [288, -231], eu: [1, 0], U: 59, V: 96, G: 0.45, FH: 4.2 };
function buildLTC(kit, campus) {
  const { G, FH } = LTC; const F1 = G + FH; const R = F1 + FH; const T = 0.3;
  const K = { wall: 't:plaster:#efd9cc', int: 't:plaster:#f3ece4', pink: 'c:#cf8f86', pinkD: 'c:#b8766d', cope: 'c:#f5e9df', frame: 'c:#5a3e2e', floor: 't:tiles:#a8ada4', arc: 't:paving:#b9aea2', ceil: 'c:#f6f3ee', roof: 't:concrete:#cbbfb4', grass: 't:grass:#7fae55', rail: 'm:#9aa1a6', seat: 't:wood:#8a5f3a' };
  const L = (axis, c, out) => line(kit, axis, c, out);
  const CT = { u0: 25, u1: 43, v0: 16, v1: 80 }; // the lawn
  const ARC = [[21, 25, 12, 84], [25, 47, 12, 16], [25, 47, 80, 84], [43, 47, 16, 80]];
  // ---- arcade floors, roofs (the first-floor verandah), ceilings
  for (const [u0, u1, v0, v1] of ARC) {
    kit.box(u0, u1, v0, v1, 0, G, K.arc, { walkable: true });
    kit.box(u0, u1, v0, v1, F1 - 0.25, F1, 'c:#e9e1d8', { walkable: true });
    kit.box(u0, u1, v0, v1, F1, F1 + 0.01, K.arc, { collide: false });
    ceiling(kit, u0, u1, v0, v1, F1 - 0.255, K.ceil);
  }
  // ---- arcade fronts on the lawn
  const spring = G + 2.2; const atop = F1 - 0.25;
  const fronts = [[L('v', CT.u0, 1), CT.v0, CT.v1], [L('u', CT.v0, 1), CT.u0, CT.u1], [L('v', CT.u1, -1), CT.v0, CT.v1], [L('u', CT.v1, -1), CT.u0, CT.u1]];
  const steps = [];
  for (const [Lf, s0, s1] of fronts) {
    const n = Math.round((s1 - s0) / 3.9); const bay = (s1 - s0) / n; const w = bay - 0.8;
    for (let k = 0; k <= n; k++) {
      const s = s0 + k * bay;
      Lf.box(s - 0.4, s + 0.4, -0.35, 0.35, G, atop, K.wall, { collide: true });
      for (const y of [G + 0.9, G + 1.5]) Lf.box(s - 0.42, s + 0.42, -0.37, 0.37, y, y + 0.1, K.pink);
      Lf.box(s - 0.45, s + 0.45, -0.4, 0.4, spring - 0.15, spring, K.pinkD);
      Lf.box(s - 0.42, s + 0.42, -0.37, 0.37, 0, G + 0.35, K.pinkD);
    }
    for (let k = 0; k < n; k++) {
      const sm = s0 + (k + 0.5) * bay;
      extrude(kit, Lf, shift(spandrel(w, spring, atop), sm), -0.35, 0.35, K.wall);
      for (const [d0, d1] of [[0.35, 0.38], [-0.38, -0.35]]) extrude(kit, Lf, shift(archRing(w, spring, 0.26), sm), d0, d1, K.pink);
      Lf.box(sm - 0.14, sm + 0.14, -0.4, 0.4, spring + w / 2 - 0.05, spring + w / 2 + 0.32, K.pinkD);
    }
    // cornice at the slab, the verandah parapet over it
    Lf.box(s0 - 0.4, s1 + 0.4, -0.45, 0.45, atop - 0.05, F1 + 0.05, K.pink);
    Lf.box(s0 - 0.4, s1 + 0.4, -0.15, 0.15, F1, F1 + 1.0, K.wall, { collide: true });
    Lf.box(s0 - 0.4, s1 + 0.4, -0.2, 0.2, F1 + 1.0, F1 + 1.08, K.cope);
    // the steps down to the lawn in the middle bay; a ramp near one end
    const sm = s0 + (Math.floor(n / 2) + 0.5) * bay;
    steps.push([Lf, sm, w]);
  }
  for (const [Lf, sm, w] of steps) {
    for (const [d0, d1, top] of [[0.35, 0.65, 0.3], [0.65, 0.95, 0.15]]) Lf.box(sm - w / 2, sm + w / 2, d0, d1, 0, top, K.arc, { collide: true, walkable: true });
  }
  {
    // ramp from the lawn up to the west arcade, steel railings both sides (1:12)
    const Lr = L('v', CT.u0, 1); const a = 22; const len = 5.4; const n = 9;
    for (let k = 0; k < n; k++) { const top = G - ((k + 1) * G) / (n + 1); Lr.box(a + (k * len) / n, a + ((k + 1) * len) / n, 0.35, 1.75, 0, Math.max(0.03, top + G / (n + 1) / 2), K.arc, { collide: true, walkable: true }); }
    for (const d of [0.4, 1.7]) { const [u, v0] = Lr.P(a, d); bar(kit, [u, G + 0.95, v0], [u, 0.95, v0 + len], 0.05, K.rail); for (let k = 0; k <= 3; k++) { const v = v0 + (k * len) / 3; kit.box(u - 0.025, u + 0.025, v - 0.025, v + 0.025, 0, G + 0.95 - (k * G) / 3, K.rail, { collide: false }); } kit.col(u - 0.05, u + 0.05, v0, v0 + len, 0, 1.4); }
  }
  // ---- the lawn, the paths, the raised circular stage with shrubs
  kit.box(CT.u0 + 0.35, CT.u1 - 0.35, CT.v0 + 0.35, CT.v1 - 0.35, -0.02, 0.03, K.grass, { collide: false });
  kit.box(33, 35, CT.v0 + 0.35, CT.v1 - 0.35, -0.02, 0.035, 't:paving:#c9b8a8', { collide: false });
  kit.box(CT.u0 + 0.35, CT.u1 - 0.35, 47, 49, -0.02, 0.036, 't:paving:#c9b8a8', { collide: false });
  const SC = [34, 58];
  kit.cyl(SC[0], SC[1], 0, 4.5, 0.6, 't:paving:#c4b4a4', { seg: 36 });
  kit.cyl(SC[0], SC[1], 0.6, 4.55, 0.06, K.pink, { seg: 36 });
  kit.col(SC[0] - 3.2, SC[0] + 3.2, SC[1] - 3.2, SC[1] + 3.2, 0, 0.66, true);
  for (let k = 0; k < 20; k++) { const a = (k / 20) * Math.PI * 2; if (Math.abs(Math.sin(a)) < 0.25 && Math.cos(a) < 0) continue; kit.cyl(SC[0] + Math.cos(a) * 5.1, SC[1] + Math.sin(a) * 5.1, 0, 0.45, 0.7, 'c:#4f8a3e', { seg: 8, rTop: 0.3 }); kit.cyl(SC[0] + Math.cos(a) * 5.1, SC[1] + Math.sin(a) * 5.1, 0.55, 0.22, 0.2, 'c:#d0457a', { seg: 6 }); }
  for (let k = 0; k < 2; k++) kit.box(SC[0] - 4.9 + k * 0.3 - 0.3, SC[0] - 4.9 + k * 0.3, SC[1] - 1, SC[1] + 1, 0, 0.2 * (k + 1), 't:paving:#c4b4a4', { walkable: true });

  // ---- the theatres (west): raked rows rising westwards, the stage at the arcade end, sloped roofs
  const theatres = [{ id: 'LT1', name: 'Lecture Theatre 1 (400 seats)', a: 13, b: 39 }, { id: 'LT2', name: 'Lecture Theatre 2 (150 seats)', a: 44, b: 62 }, { id: 'LT3', name: 'Lecture Theatre 3 (150 seats)', a: 67, b: 83 }];
  const HB = 10.6; const HF = 7.4; // roof top at the back (u 0) and the front (u 21)
  const roofY = (u) => HB - ((HB - HF) * u) / 21;
  for (const th of theatres) {
    const { a, b } = th; const vm = (a + b) / 2;
    // side walls (trapezoids) with high windows, back wall, front wall on the arcade with two double doors
    for (const [v, out] of [[a + T / 2, -1], [b - T / 2, 1]]) {
      const Ls = L('u', v, out);
      const wins = [4, 8, 12, 16].map((s) => ({ at: s, width: 2.0, bottom: 5.4, top: 6.6 }));
      Ls.wall(0, 21, 0, 5.0, K.wall, T, []);
      Ls.wall(0, 21, 5.0, 6.9, K.wall, T, wins);
      for (const o of wins) glaze(Ls, o.at, o.width, 5.4, 1.2, T, { frame: K.frame, mull: 1, sill: K.pink });
      extrude(kit, Ls, shapeOf([[0, 6.9], [21, 6.9], [21, HF], [0, HB]]), -T / 2, T / 2, K.wall);
      for (const y of [1.2, 3.2, 6.9]) Ls.box(0, 21, T / 2 - 0.01, T / 2 + 0.06, y, y + 0.14, K.pink);
      Ls.box(0, 21, T / 2 - 0.01, T / 2 + 0.06, 0, 0.6, K.pinkD);
    }
    const Lb = L('v', T / 2, -1);
    Lb.wall(a + T, b - T, 0, HB, K.wall, T);
    for (const y of [1.2, 3.2, 6.9]) Lb.box(a, b, T / 2 - 0.01, T / 2 + 0.06, y, y + 0.14, K.pink);
    Lb.box(a, b, T / 2 - 0.01, T / 2 + 0.06, 0, 0.6, K.pinkD);
    const doors = [a + 1.8, b - 1.8];
    const Lfw = L('v', 21 - T / 2, 1);
    Lfw.wall(a + T, b - T, 0, HF, K.wall, T, doors.map((s) => ({ at: s, width: 2.0, bottom: G, top: G + 2.6 })));
    for (const s of doors) { for (const k of [-1, 1]) kit.door(false, s + k * 0.5, 21 - T / 2, G, 0.95, { height: 2.55, thick: T, side: 1, frame: K.frame, leaf: 't:wood:#7a5232' }); }
    // sloped roof slab with a pink fascia and a parapet at the back
    bar(kit, [-0.4, HB + 0.1, vm], [21.3, HF + 0.1, vm], 0.22, K.roof, b - a + 0.6);
    for (const v of [a - 0.3, b + 0.3]) bar(kit, [-0.4, HB + 0.1, v], [21.3, HF + 0.1, v], 0.4, K.pink, 0.08);
    kit.box(-0.1, 0.3, a, b, HB, HB + 0.8, K.wall, { collide: false });
    kit.box(-0.15, 0.35, a - 0.05, b + 0.05, HB + 0.8, HB + 0.88, K.cope, { collide: false });
    kit.sign(th.id, 21.2, vm, 4.9, [1, 0], { width: 2.4, height: 0.9, bg: '#b8766d', fg: '#fff6ee', font: 'bold 96px Georgia, serif' });
    // the interior
    kit.layer(th.id, () => {
      const y0 = G; const front = 15.6; const rowD = 0.95; const rise = 0.2;
      const rows = Math.floor((front - T - 0.4) / rowD);
      kit.box(front, 21 - T, a + T, b - T, 0, y0, K.floor, { walkable: true });
      kit.box(front, 21 - T, a + T, b - T, y0, y0 + 0.01, 't:tiles:#8f9a92', { collide: false });
      for (let r = 0; r < rows; r++) {
        const u1 = front - r * rowD; const u0 = u1 - rowD; const top = y0 + (r + 1) * rise;
        kit.box(u0, u1, a + T, b - T, 0, top, K.floor, { walkable: true });
        kit.box(u0, u1, a + T, b - T, top, top + 0.008, 't:tiles:#8f9a92', { collide: false });
        // bench desks fanned towards the stage, side aisles 1.3 m
        const w = b - a - 2 * T - 2.6; const nd = Math.max(1, Math.floor(w / 1.9));
        for (let k = 0; k < nd; k++) {
          const v = a + T + 1.3 + (w * (k + 0.5)) / nd; const u = u0 + 0.5;
          const du = 19.5 - u; const dv = vm - v; const d = Math.hypot(du, dv);
          kit.benchDesk(u, v, top, [du / d, dv / d], { w: 1.8, top: K.seat, frame: 'm:#3f4449' });
        }
      }
      const backTop = y0 + rows * rise; const uBack = front - rows * rowD;
      kit.box(T, uBack, a + T, b - T, 0, backTop, K.floor, { walkable: true });
      kit.rail(T + 0.4, a + T + 0.1, T + 0.4, b - T - 0.1, backTop, K.rail);
      // stage, lecture table, lectern, boards, screen, the red LED clock
      kit.box(18.2, 21 - T, a + 3.2, b - 3.2, y0, y0 + 0.45, 't:wood:#7a5232', { walkable: true });
      kit.box(17.9, 18.2, a + 3.2, b - 3.2, y0, y0 + 0.22, 't:wood:#7a5232', { walkable: true });
      kit.box(18.9, 19.9, vm - 1.6, vm + 1.6, y0 + 0.45, y0 + 1.27, 't:wood:#6d4528');
      piece(kit, 19.2, vm + 2.6, y0 + 0.45, [-1, 0], [[-0.3, 0.3, 0, 1.15, -0.22, 0.22, 't:wood:#6d4528'], [-0.33, 0.33, 1.15, 1.22, -0.3, 0.25, 't:wood:#5d3a20']], 0.6, 0.5, 1.2);
      for (const dv of [-1, 1]) kit.board(21 - T - 0.02, vm + dv * ((b - a) / 4 + 0.6), y0 + 0.45, [-1, 0], { w: Math.min(4.2, (b - a) / 4), h: 1.4, key: 'c:#2f4a3a', frame: 'c:#6b5a43' });
      kit.box(21 - T - 0.05, 21 - T - 0.02, vm - 1.9, vm + 1.9, y0 + 1.5, y0 + 4.0, 'e:#e9eef2', { collide: false });
      kit.box(21 - T - 0.08, 21 - T - 0.02, vm - 0.5, vm + 0.5, y0 + 4.4, y0 + 4.8, 'c:#1a1a1a', { collide: false });
      kit.box(21 - T - 0.09, 21 - T - 0.08, vm - 0.4, vm + 0.4, y0 + 4.47, y0 + 4.73, 'e:#ff3a2a', { collide: false });
      // stepped white grid ceiling, fans and tube lights
      const steps = [[0, 5.5, 9.4], [5.5, 11, 8.6], [11, 16, 7.8], [16, 21, 6.8]];
      for (const [u0, u1, y] of steps) {
        ceiling(kit, u0 + (u0 === 0 ? T : 0), u1 - (u1 === 21 ? T : 0), a + T, b - T, y, K.ceil);
        for (let v = a + T + 1.2; v < b - T; v += 1.2) kit.box(u0, u1, v - 0.03, v + 0.03, y - 0.06, y, 'c:#d9d5cc', { collide: false });
        for (let u = u0 + 1.2; u < u1; u += 1.2) kit.box(u - 0.03, u + 0.03, a + T, b - T, y - 0.06, y, 'c:#d9d5cc', { collide: false });
        for (let v = a + 2.5; v < b - 2; v += 3.4) { rodLight(kit, (u0 + u1) / 2 - 1.2, v, y - 0.06, 0.02, [0, 1]); kit.fan((u0 + u1) / 2 + 1.2, v + 1.2, y); }
        if (u1 < 21) kit.box(u1 - 0.05, u1 + 0.05, a + T, b - T, steps.find((q) => q[0] === u1)[2], y, K.ceil, { collide: false });
      }
      // dado
      for (const [v, s] of [[a + T + 0.01, 1], [b - T - 0.01, -1]]) kit.box(T, 21 - T, v - 0.01, v + 0.01 * s, 0, y0 + 1.2, 'c:#b8a99a', { collide: false });
    });
    kit.room(th.id, th.name, T, 21 - T, a + T, b - T, 0, HF);
    kit.entrance(`${th.id} doors`, 23, a + 1.8, [1, 0]);
  }
  // the passages between the theatres: steps up to the arcade
  for (const [a, b] of [[39, 44], [62, 67], [12, 13], [83, 84]]) {
    if (b - a > 2) for (const [u0, u1, top] of [[20.4, 21, 0.3], [19.8, 20.4, 0.15]]) kit.box(u0, u1, a, b, 0, top, K.arc, { walkable: true });
    // first floor: parapet along the open west edge of the arcade roof
    kit.box(21, 21.3, a, b, F1, F1 + 1.0, K.wall); kit.box(20.95, 21.35, a, b, F1 + 1.0, F1 + 1.08, K.cope, { collide: false });
  }
  // the west arcade's verandah: a parapet along the theatre fronts above their roofs' low edge is not needed (walls)

  // ---- the two-storey blocks: north, east, south
  const blocks = [
    { id: 'N', u0: 21, u1: 47, v0: 0, v1: 12, arc: 'v1', rooms: [[[21.3, 32, 'C1'], [32, 36, 'pass'], [36, 46.7, 'C2']], [[21.3, 34, 'C3'], [34, 46.7, 'C4']]] },
    { id: 'S', u0: 21, u1: 47, v0: 84, v1: 96, arc: 'v0', rooms: [[[21.3, 32, 'C5'], [32, 36, 'pass'], [36, 46.7, 'C6']], [[21.3, 34, 'C7'], [34, 46.7, 'C8']]] },
    { id: 'E', u0: 47, u1: 59, v0: 12, v1: 84, arc: 'u0', rooms: [[[12.3, 28, 'C9'], [28, 34, 'stair'], [34, 46, 'C10'], [46, 50, 'pass'], [50, 66, 'C11'], [66, 83.7, 'Office']], [[12.3, 28, 'C12'], [28, 34, 'stair'], [34, 50, 'C13'], [50, 66, 'C14'], [66, 83.7, 'C15']]] },
  ];
  const plates = []; const pIdx = {};
  for (const B of blocks) for (const fl of B.rooms) for (const [, , id] of fl) if (!['pass', 'stair'].includes(id)) { pIdx[id] = plates.length; plates.push(id === 'Office' ? ['LTC Office', 'Time Table · AUGSD'] : [`LTC ${id}`, '80-seat classroom']); }
  kit.texture('ltcplates', () => plateAtlas(plates, { cols: 4, cw: 256, ch: 64, bg: '#7a4a44', fg: '#fff6ee', sub: '#f1d6cf' }));
  let stairHole = null;
  for (const B of blocks) {
    const alongU = B.arc[0] === 'v'; // rooms run along u
    const arcC = B[B.arc]; const arcOut = B.arc.endsWith('1') ? 1 : -1; // outward of the block on the arcade side
    const [s0, s1] = alongU ? [B.u0, B.u1] : [B.v0, B.v1];
    const [d0, d1] = alongU ? [B.v0, B.v1] : [B.u0, B.u1];
    const backC = arcOut > 0 ? d0 : d1;
    const LA = L(alongU ? 'u' : 'v', arcC - arcOut * T / 2, arcOut); // arcade-side wall
    const LB = L(alongU ? 'u' : 'v', backC + arcOut * T / 2, -arcOut); // the back (outer) wall
    const ends = [[s0 + T / 2, -1], [s1 - T / 2, 1]].map(([c, o]) => L(alongU ? 'v' : 'u', c, o));
    // stair (east block)
    if (B.id === 'E') stairHole = dogleg(kit, 49.0, 58.6, 28.15, 33.85, G, F1, { along: 'u', key: 't:terrazzo:#c4b8ab', name: 'LTC east stair' });
    // floors
    kit.box(B.u0, B.u1, B.v0, B.v1, 0, G, K.floor, { walkable: true });
    kit.slab(B.u0, B.u1, B.v0, B.v1, F1, 'c:#e9e1d8', { thick: 0.25, holes: B.id === 'E' ? [stairHole] : [] });
    kit.slab(B.u0, B.u1, B.v0, B.v1, F1 + 0.01, K.floor, { thick: 0.008, holes: B.id === 'E' ? [stairHole] : [], walkable: false, collide: false });
    kit.slab(B.u0, B.u1, B.v0, B.v1, R, K.roof, { thick: 0.25, walkable: false, collide: false });
    ceilRects(kit, [[B.u0, B.u1, B.v0, B.v1]], B.id === 'E' ? [stairHole] : [], F1 - 0.255, K.ceil);
    ceilRects(kit, [[B.u0, B.u1, B.v0, B.v1]], [], R - 0.255, K.ceil);
    for (const f of [0, 1]) {
      const y0 = f === 0 ? 0 : F1; const fl = f === 0 ? G : F1; const y1 = f === 0 ? F1 : R;
      const list = B.rooms[f];
      // arcade side: a door per room, windows between, the passage open
      const opsA = []; const winsA = [];
      for (const [a, b, id] of list) {
        if (id === 'pass') { opsA.push({ at: (a + b) / 2, width: b - a - 0.4, bottom: 0, top: fl - y0 + 3.0 }); continue; }
        const dAt = id === 'stair' ? a + 1.3 : b - 1.4;
        opsA.push({ at: dAt, width: 1.4, bottom: fl - y0, top: fl - y0 + 2.5, door: id });
        if (id !== 'stair') for (let s = a + 1.8; s < b - 3.0; s += 3.2) winsA.push(s);
      }
      for (const s of winsA) opsA.push({ at: s, width: 1.5, bottom: fl - y0 + 1.0, top: fl - y0 + 2.6 });
      wall2(kit, LA, s0, s1, y0, y1, K.wall, K.int, T, opsA);
      for (const s of winsA) glaze(LA, s, 1.5, fl + 1.0, 1.6, T, { frame: K.frame, mull: 1, sill: K.pink });
      for (const o of opsA.filter((q) => q.door)) {
        kit.door(alongU, o.at, LA.c, fl, 1.3, { height: 2.45, thick: T, side: -arcOut, frame: K.frame, leaf: 't:wood:#7a5232' });
        if (pIdx[o.door] !== undefined) { const [pu, pv] = LA.P(o.at + 1.05, T / 2 + 0.006); plate(kit, 'ltcplates', pIdx[o.door], pu, pv, fl + 1.75, 0.7, 0.18, LA.dir); }
      }
      // back wall: windows with pink arched hoods; the passage open on the ground floor
      const opsB = []; const winsB = [];
      for (let s = s0 + 2; s < s1 - 1.5; s += 3.2) if (!list.some(([a, b, id]) => (id === 'pass' || id === 'stair') && s > a - 1 && s < b + 1)) winsB.push(s);
      for (const s of winsB) opsB.push({ at: s, width: 1.4, bottom: fl - y0 + 1.0, top: fl - y0 + 2.8 });
      for (const [a, b, id] of list) if (id === 'pass') opsB.push({ at: (a + b) / 2, width: b - a - 0.4, bottom: 0, top: fl - y0 + 3.0 });
      wall2(kit, LB, s0, s1, y0, y1, K.wall, K.int, T, opsB);
      for (const s of winsB) { glaze(LB, s, 1.4, fl + 1.0, 1.8, T, { frame: K.frame, mull: 1, sill: K.pink }); extrude(kit, LB, shift(archRing(1.4, fl + 2.85, 0.22), s), T / 2, T / 2 + 0.06, K.pink); }
      for (const Le of ends) {
        const ws = []; for (let s = d0 + 2.5; s < d1 - 2; s += 3.4) ws.push(s);
        wall2(kit, Le, d0, d1, y0, y1, K.wall, K.int, T, ws.map((s) => ({ at: s, width: 1.4, bottom: fl - y0 + 1.0, top: fl - y0 + 2.8 })));
        for (const s of ws) { glaze(Le, s, 1.4, fl + 1.0, 1.8, T, { frame: K.frame, mull: 1, sill: K.pink }); extrude(kit, Le, shift(archRing(1.4, fl + 2.85, 0.22), s), T / 2, T / 2 + 0.06, K.pink); }
      }
      // bands
      for (const Lx of [LB, ...ends]) {
        const [p, q] = Lx === LB ? [s0, s1] : [d0, d1];
        Lx.box(p, q, T / 2 - 0.01, T / 2 + 0.06, fl + 0.85, fl + 0.98, K.pink);
        if (f === 1) Lx.box(p, q, T / 2 - 0.01, T / 2 + 0.08, F1 - 0.25, F1 + 0.05, K.pink);
      }
    }
    for (const Lx of [LB, LA, ...ends]) {
      const [p, q] = Lx === LB || Lx === LA ? [s0, s1] : [d0, d1];
      if (Lx !== LA) Lx.box(p, q, T / 2 - 0.01, T / 2 + 0.07, 0, 0.75, K.pinkD);
      Lx.box(p, q, T / 2 - 0.01, T / 2 + 0.3, R - 0.15, R + 0.1, K.pink);
      Lx.box(p, q, -T / 2, T / 2, R, R + 0.9, K.wall);
      Lx.box(p, q, -T / 2 - 0.05, T / 2 + 0.05, R + 0.9, R + 0.98, K.cope);
    }
    // the passage: arched heads on both faces, side walls
    for (const [a, b, id] of B.rooms[0]) {
      if (id !== 'pass') continue;
      const w = b - a - 0.4; const sm = (a + b) / 2; const sp = G + 3.0 - w / 2;
      for (const Lx of [LA, LB]) { extrude(kit, Lx, shift(spandrel(w, sp, G + 3.0), sm), -T / 2, T / 2, K.wall); extrude(kit, Lx, shift(archRing(w, sp, 0.3), sm), T / 2, T / 2 + 0.05, K.pink); }
      ceiling(kit, alongU ? a : d0, alongU ? b : d1, alongU ? d0 : a, alongU ? d1 : b, G + 3.0, K.ceil);
      rodLight(kit, alongU ? sm : (d0 + d1) / 2, alongU ? (d0 + d1) / 2 : sm, G + 3.0, 0.02, alongU ? [0, 1] : [1, 0]);
    }
    // partitions, furniture
    for (const f of [0, 1]) {
      const fl = f === 0 ? G : F1; const top = f === 0 ? F1 - 0.25 : R - 0.25;
      kit.layer(`${B.id}${f}`, () => {
        const list = B.rooms[f];
        const cuts = [...new Set(list.slice(1).map(([a]) => a))];
        for (const s of cuts) L(alongU ? 'v' : 'u', s, 1).wall(d0 + T, d1 - T, fl, top, K.int, 0.2);
        for (const [a, b, id] of list) {
          if (id === 'pass' || id === 'stair') continue;
          const r = alongU ? [a, b, d0 + T, d1 - T] : [d0 + T, d1 - T, a, b];
          furnishRoom(kit, r, fl, id === 'Office' ? 'cowork' : 'class', top);
          kit.room(`ltc:${id}`, `LTC ${id === 'Office' ? 'Office' : id}`, r[0], r[1], r[2], r[3], fl, top, f);
        }
        if (B.id === 'E') rodLight(kit, 48.2, 31, top, 0.02);
      });
    }
  }
  // the east main entrance: outside steps, name over the arch, a paved forecourt
  {
    for (const [u0, u1, top] of [[59, 59.35, 0.3], [59.35, 59.7, 0.15]]) kit.box(u0, u1, 46.2, 49.8, 0, top, K.arc, { walkable: true });
    kit.box(59.7, 64, 45, 51, -0.02, 0.025, 't:paving:#c9b8a8', { collide: false });
    kit.sign('LECTURE THEATRE COMPLEX', 59.2, 48, G + 3.35, [1, 0], { width: 7.0, height: 0.6, bg: '#b8766d', fg: '#fff6ee', font: 'bold 64px Georgia, serif' });
    for (const v of [44.6, 51.4]) kit.box(59.15, 59.6, v - 0.6, v + 0.6, 0, 3.8, K.pink);
    for (const [u, v] of [[34, -1.2], [34, 97.2]]) for (const [a, b, top] of [[0, 0.35, 0.3], [0.35, 0.7, 0.15]]) kit.box(u - 1.8, u + 1.8, v < 0 ? v + 1.2 - b + 0 - 0 : v - 1.2 + a, v < 0 ? v + 1.2 - a : v - 1.2 + b, 0, top, K.arc, { walkable: true });
  }
  kit.entrance('East main entrance', 61.5, 48, [1, 0]);
  kit.entrance('North passage', 34, -2, [0, -1]);
  kit.entrance('South passage', 34, 98, [0, 1]);
  // roof: water tanks and the telecom mast on the east block
  for (const [u, v] of [[24, 4], [44, 4], [24, 92], [44, 92], [52, 20], [52, 76]]) { kit.box(u - 1.2, u + 1.2, v - 1.2, v + 1.2, R, R + 0.6, 'c:#d9cfc6', { collide: false }); kit.cyl(u, v, R + 0.6, 0.85, 1.5, 'c:#2a2c2e', { seg: 14 }); }
  {
    const [mu, mv] = [55, 60]; const H = 18; const b0 = 1.2; const b1 = 0.35;
    const c = (t, sx, sz) => [mu + sx * (b0 + (b1 - b0) * t), R + H * t, mv + sz * (b0 + (b1 - b0) * t)];
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) bar(kit, c(0, sx, sz), c(1, sx, sz), 0.08, 'm:#a9afb3');
    for (let k = 0; k < 6; k++) { const t0 = k / 6; const t1 = (k + 1) / 6; for (const [[ax, az], [bx, bz]] of [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]], [[-1, 1], [-1, -1]]]) { bar(kit, c(t0, ax, az), c(t1, bx, bz), 0.04, 'm:#a9afb3'); bar(kit, c(t1, ax, az), c(t1, bx, bz), 0.04, 'm:#a9afb3'); } }
    for (const a of [0, 2.1, 4.2]) kit.box(mu + Math.cos(a) * 0.5 - 0.2, mu + Math.cos(a) * 0.5 + 0.2, mv + Math.sin(a) * 0.5 - 0.2, mv + Math.sin(a) * 0.5 + 0.2, R + H - 2, R + H - 0.6, 'c:#e8e8e2', { collide: false });
  }
  kit.room('ltcLawn', 'LTC lawn', CT.u0, CT.u1, CT.v0, CT.v1, 0, F1);
  kit.room('ltcArcade', 'LTC arcade', 21, 25, 12, 84, G, F1);
  kit.floors.push({ y: G, name: 'Arcades, theatres, ground-floor classrooms' }, { y: F1, name: 'First floor and the arcade-roof verandah' });
  register(kit, campus, 'Lecture Theatre Complex', [[0, 13], [21, 13], [21, 0], [47, 0], [47, 12], [59, 12], [59, 84], [47, 84], [47, 96], [21, 96], [21, 83], [0, 83]], R);
}

// ================================================================ 5. VFAST (guest house; no OSM footprint)
// A single-storey cream U round a big lawn, open to the north, with a red-brown parapet band; verandahs on square piers
// face the lawn; two-storey ends: the lobby (stair under an arch, reception, sofas) on the west, the dining hall east.
const VF = { O: [507, 300], eu: [1, 0], U: 42, V: 42, G: 0.3, FH: 3.6 };
function diamondTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#d9d8d2'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#8f9192'; g.beginPath(); g.moveTo(128, 0); g.lineTo(256, 128); g.lineTo(128, 256); g.lineTo(0, 128); g.closePath(); g.fill();
  g.strokeStyle = '#6d6f70'; g.lineWidth = 3; g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}
// A floor plane with a repeating texture (tile metres per repeat).
function tiledFloor(kit, u0, u1, v0, v1, y, key, tile) {
  const g = new THREE.PlaneGeometry(u1 - u0, v1 - v0); g.rotateX(-Math.PI / 2);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * (u1 - u0)) / tile, (uv.getY(i) * (v1 - v0)) / tile);
  g.translate((u0 + u1) / 2, y, (v0 + v1) / 2); kit.geo(key, g);
}
function buildVFAST(kit, campus) {
  const { U, V, G, FH } = VF; const F1 = G + FH; const R2 = F1 + FH; const T = 0.3;
  const K = { wall: 't:plaster:#f0e6cf', int: 't:plaster:#f6f1e6', band: 'c:#8c4a32', cope: 'c:#e9dcc2', plinth: 'c:#8a6f5a', frame: 'c:#5a3e2e', floor: 't:terrazzo:#c4bcae', ver: 't:paving:#b9b1a2', ceil: 'c:#f7f4ee', roof: 't:concrete:#c9c1b2', yellow: 't:plaster:#e9c95e', grass: 't:grass:#86b35a' };
  kit.texture('vfdiamond', diamondTexture);
  const L = (axis, c, out) => line(kit, axis, c, out);
  // ---- plinth floors (G) under everything built; the verandahs
  for (const [u0, u1, v0, v1] of [[0, 10, 0, 42], [10, 32, 32, 42], [32, 42, 0, 42]]) kit.box(u0, u1, v0, v1, 0, G, K.floor, { walkable: true });
  // ---- outer walls (square windows), the two-storey ends
  const roomsW = Array.from({ length: 5 }, (_, i) => [10 + i * 5.1, 15.1 + i * 5.1]);
  const roomsE = roomsW;
  const roomsS = Array.from({ length: 6 }, (_, i) => [6.5 + (i * 29) / 6, 6.5 + ((i + 1) * 29) / 6]);
  const sq = (list) => list.map(([a, b]) => ({ at: (a + b) / 2, width: 1.3, bottom: G + 1.1, top: G + 2.4 }));
  const outer = [
    { L: L('v', T / 2, -1), s0: 10, s1: V, ops: [...sq(roomsW), { at: 38.6, width: 0.8, bottom: G + 1.8, top: G + 2.5 }], h: F1 },
    { L: L('u', V - T / 2, 1), s0: 0, s1: U, ops: [...sq(roomsS), { at: 3.4, width: 0.8, bottom: G + 1.8, top: G + 2.5 }, { at: 38.6, width: 0.8, bottom: G + 1.8, top: G + 2.5 }], h: F1 },
    { L: L('v', U - T / 2, 1), s0: 10, s1: V - T, ops: [...sq(roomsE), { at: 38.6, width: 0.8, bottom: G + 1.8, top: G + 2.5 }], h: F1 },
  ];
  for (const o of outer) {
    wall2(kit, o.L, o.s0, o.s1, 0, o.h, K.wall, K.int, T, o.ops);
    for (const w of o.ops) glaze(o.L, w.at, w.width, w.bottom, w.top - w.bottom, T, { frame: K.frame, mull: 1, transom: 0.5, sill: K.cope });
  }
  // the two-storey ends: lobby (west) and dining hall (east)
  const ends = [
    { u0: 0, u1: 10, name: 'lobby', N: [{ at: 7.0, width: 2.0, bottom: 0, top: G + 2.6, door: true }, { at: 2.6, width: 1.4, bottom: G + 1.1, top: G + 2.4 }], W: [{ at: 5, width: 1.4, bottom: G + 1.1, top: G + 2.4 }], E: [{ at: 3, width: 1.4, bottom: G + 1.1, top: G + 2.4 }, { at: 7, width: 1.4, bottom: G + 1.1, top: G + 2.4 }], S: [{ at: 8.25, width: 1.5, bottom: G, top: G + 2.4, door: true }] },
    { u0: 32, u1: 42, name: 'dining', N: [{ at: 35, width: 1.4, bottom: G + 1.1, top: G + 2.4 }, { at: 39, width: 1.4, bottom: G + 1.1, top: G + 2.4 }], E: [{ at: 5, width: 1.6, bottom: G + 0.9, top: G + 1.9, hatch: true }], W: [{ at: 5, width: 1.8, bottom: G, top: G + 2.5, door: true }, { at: 2.2, width: 1.4, bottom: G + 1.1, top: G + 2.4 }, { at: 7.8, width: 1.4, bottom: G + 1.1, top: G + 2.4 }], S: [{ at: 33.75, width: 1.5, bottom: G, top: G + 2.4, door: true }] },
  ];
  for (const e of ends) {
    const sides = { N: [L('u', T / 2, -1), e.u0, e.u1], S: [L('u', 10 - T / 2, 1), e.u0 + (e.name === 'dining' ? T : 0), e.u1 - (e.name === 'lobby' ? T : 0)], W: [L('v', e.u0 + T / 2, -1), T, 10 - T], E: [L('v', e.u1 - T / 2, 1), T, 10 - T] };
    for (const [k, [Lx, s0, s1]] of Object.entries(sides)) {
      const ops = e[k] || [];
      const isInnerS = k === 'S';
      wall2(kit, Lx, s0, s1, 0, F1, K.wall, e.name === 'lobby' ? K.yellow : K.int, T, ops);
      for (const w of ops) if (!w.door && !w.hatch) glaze(Lx, w.at, w.width, w.bottom, w.top - w.bottom, T, { frame: K.frame, mull: 1, transom: 0.5, sill: K.cope });
      for (const w of ops) if (w.door) for (const sgn of w.width > 1.6 ? [-1, 1] : [0]) kit.door(Lx.axis === 'u', w.at + sgn * w.width / 4, Lx.c, G, sgn ? w.width / 2 - 0.05 : w.width - 0.1, { height: 2.35, thick: T, side: -Lx.out, frame: K.frame, leaf: 't:wood:#6d4b30' });
      // first floor: windows all round
      const f1 = []; for (let s = s0 + 2.4; s < s1 - 1.5; s += 3.2) f1.push({ at: s, width: 1.3, bottom: 1.1, top: 2.4 });
      wall2(kit, Lx, s0, s1, F1, R2, K.wall, K.int, T, f1.map((w) => ({ ...w, bottom: w.bottom, top: w.top })));
      for (const w of f1) glaze(Lx, w.at, w.width, F1 + w.bottom, w.top - w.bottom, T, { frame: K.frame, mull: 1, transom: 0.5, sill: K.cope });
      Lx.box(s0, s1, T / 2 - 0.01, T / 2 + 0.3, R2 - 0.1, R2 + 0.6, K.band);
      Lx.box(s0, s1, -T / 2, T / 2, R2, R2 + 0.75, K.wall); Lx.box(s0 - 0.05, s1 + 0.05, -T / 2 - 0.05, T / 2 + 0.3, R2 + 0.75, R2 + 0.83, K.cope);
      if (!isInnerS) Lx.box(s0, s1, T / 2 - 0.01, T / 2 + 0.06, 0, G + 0.3, K.plinth);
      Lx.box(s0, s1, T / 2 - 0.01, T / 2 + 0.25, F1 - 0.2, F1 + 0.05, K.band);
    }
    kit.slab(e.u0, e.u1, 0, 10, R2, K.roof, { thick: 0.25, walkable: false, collide: false });
    ceiling(kit, e.u0 + T, e.u1 - T, T, 10 - T, R2 - 0.255, K.ceil);
  }
  // ---- single-storey arms: verandah-side walls with doors and windows, roofs, parapet band
  const ver = [
    { L: L('v', 6.5, 1), rooms: roomsW, id: 'W' },
    { L: L('u', 35.5, -1), rooms: roomsS, id: 'S' },
    { L: L('v', 35.5, -1), rooms: roomsE, id: 'E' },
  ];
  const plates = []; const pIdx = {};
  for (const vr of ver) vr.rooms.forEach((_, i) => { const n = `${vr.id}${i}`; pIdx[n] = plates.length; plates.push([`${{ W: 1, S: 2, E: 3 }[vr.id]}0${i + 1}`, 'Guest Room']); });
  kit.texture('vfplates', () => plateAtlas(plates, { cols: 4, cw: 256, ch: 64, bg: '#5a3e2e', fg: '#f6efe0', sub: '#e7d4b8' }));
  for (const vr of ver) {
    const s0 = vr.rooms[0][0]; const s1 = vr.rooms[vr.rooms.length - 1][1];
    const ops = [];
    vr.rooms.forEach(([a, b]) => { ops.push({ at: a + 1.0, width: 1.1, bottom: G, top: G + 2.3, door: true }, { at: (a + b) / 2 + 0.9, width: 1.3, bottom: G + 1.1, top: G + 2.4 }); });
    wall2(kit, vr.L, s0, s1, 0, F1 - 0.25, K.wall, K.int, 0.25, ops);
    for (const o of ops) if (!o.door) glaze(vr.L, o.at, o.width, o.bottom, o.top - o.bottom, 0.25, { frame: K.frame, mull: 1, transom: 0.5, sill: K.cope });
    vr.rooms.forEach(([a], i) => {
      kit.door(vr.L.axis === 'u', a + 1.0, vr.L.c, G, 1.0, { height: 2.25, thick: 0.25, side: -vr.L.out, frame: K.frame, leaf: 't:wood:#6d4b30', open: i % 2 === 0 });
      const [pu, pv] = vr.L.P(a + 1.9, 0.125 + 0.006); plate(kit, 'vfplates', pIdx[`${vr.id}${i}`], pu, pv, G + 1.7, 0.5, 0.13, vr.L.dir);
    });
  }
  // the corner stores (closed) and the arm roofs
  for (const [u0, u1, v0, v1] of [[T, 6.5, 35.5, V - T], [35.5, U - T, 35.5, V - T]]) { L('u', 35.5, -1).wall(u0, u1, 0, F1 - 0.25, K.wall, 0.25); L('v', u0 < 10 ? 6.5 : 35.5, u0 < 10 ? 1 : -1).wall(35.5, V - T, 0, F1 - 0.25, K.wall, 0.25); }
  const armRoof = [[0, 10, 10, 42], [10, 32, 32, 42], [32, 42, 10, 42]];
  for (const [u0, u1, v0, v1] of armRoof) { kit.slab(u0, u1, v0, v1, F1, K.roof, { thick: 0.25, walkable: false }); }
  for (const [u0, u1, v0, v1] of [[T, 6.5, 10, 35.5], [6.5, 35.5, 35.5, V - T], [35.5, U - T, 10, 35.5]]) ceiling(kit, u0, u1, v0, v1, F1 - 0.255, K.ceil);
  for (const [u0, u1, v0, v1] of [[6.5, 10, 10, 35.5], [10, 32, 32, 35.5], [32, 35.5, 10, 35.5]]) { ceiling(kit, u0, u1, v0, v1, F1 - 0.255, K.ceil); kit.box(u0, u1, v0, v1, G, G + 0.005, K.ver, { collide: false }); }
  for (const [u0, u1, v0, v1] of [[0, 10, 0, 10], [32, 42, 0, 10]]) { kit.slab(u0 + T, u1 - T, T, 10 - T, F1, 'c:#ece7dc', { thick: 0.22, holes: u0 === 0 ? [{ u0: 0.3, u1: 4.6, v0: 4.8, v1: 9.7 }] : [] }); ceilRects(kit, [[u0 + T, u1 - T, T, 10 - T]], u0 === 0 ? [{ u0: 0.3, u1: 4.6, v0: 4.8, v1: 9.7 }] : [], F1 - 0.225, K.ceil); }
  // parapet band round the single-storey parts (outer edge and the verandah edge)
  const para = (Lx, s0, s1) => { Lx.box(s0, s1, -0.15, 0.15, F1, F1 + 0.7, K.wall, { collide: false }); Lx.box(s0, s1, -0.02, 0.32, F1 - 0.15, F1 + 0.55, K.band, { collide: false }); Lx.box(s0 - 0.05, s1 + 0.05, -0.2, 0.35, F1 + 0.7, F1 + 0.78, K.cope, { collide: false }); };
  para(L('v', 0.15, -1), 10, V); para(L('u', V - 0.15, 1), 0, U); para(L('v', U - 0.15, 1), 10, V);
  // verandah fronts on the lawn: square piers, a beam, the parapet band, steps
  const vf = [[L('v', 10, 1), 10, 32], [L('u', 32, -1), 10, 32], [L('v', 32, -1), 10, 32]];
  for (const [Lf, s0, s1] of vf) {
    const n = Math.round((s1 - s0) / 3.2);
    for (let k = 0; k <= n; k++) { const s = s0 + ((s1 - s0) * k) / n; Lf.box(s - 0.22, s + 0.22, -0.22, 0.22, G, F1 - 0.45, K.wall, { collide: true }); Lf.box(s - 0.28, s + 0.28, -0.28, 0.28, G, G + 0.25, K.plinth); }
    Lf.box(s0 - 0.25, s1 + 0.25, -0.25, 0.25, F1 - 0.45, F1, K.wall);
    para(Lf, s0 - 0.25, s1 + 0.25);
    const sm = (s0 + s1) / 2;
    for (const [d0, d1, top] of [[0.25, 0.55, 0.15]]) Lf.box(sm - 1.5, sm + 1.5, d0, d1, 0, top, K.ver, { walkable: true });
    Lf.box(s0 - 0.25, s1 + 0.25, 0.2, 0.3, 0, G, K.plinth);
  }
  // ---- the lawn, flower beds, Ashoka trees; a low hedge and gate on the open north side
  kit.box(10.2, 31.8, 0.5, 31.6, -0.02, 0.03, K.grass, { collide: false });
  for (const [u0, u1, v0, v1] of [[10.6, 31.4, 30.6, 31.4], [10.6, 11.4, 6, 30.6], [30.6, 31.4, 6, 30.6]]) kit.box(u0, u1, v0, v1, 0, 0.35, 'c:#5b8a3c', { collide: false });
  for (let u = 11; u < 31; u += 0.9) kit.cyl(u, 31, 0.3, 0.16, 0.18, ['c:#d0457a', 'c:#f2c230', 'c:#e8703a'][Math.floor(u) % 3], { seg: 6 });
  for (const [u0, u1] of [[10, 18.5], [23.5, 32]]) kit.box(u0, u1, 0.1, 0.6, 0, 1.0, 'c:#4f7f35');
  for (const u of [18.5, 23.5]) kit.box(u - 0.3, u + 0.3, 0.05, 0.65, 0, 1.6, K.wall);
  for (const [u, v] of [[13, 3], [29, 3], [13, 16], [29, 16]]) { kit.cyl(u, v, 0, 0.18, 5.5, 'c:#5a4632', { seg: 8 }); kit.cyl(u, v, 2.0, 1.1, 5.0, 'c:#2f6a32', { seg: 10, rTop: 0.15 }); }
  // ---- the lobby: diamond floor, reception counter, wooden sofas, the stair under an arch (to the suites upstairs)
  kit.entrance('VFAST guest house (lobby)', 7, -3.2, [0, -1]);
  {
    // porch
    kit.box(5, 9, -2.4, 0, 0, G, K.ver, { walkable: true });
    kit.box(5, 9, -2.9, -2.4, 0, 0.15, K.ver, { walkable: true });
    for (const u of [5.2, 8.8]) kit.box(u - 0.18, u + 0.18, -2.3, -1.94, G, 3.4, K.wall);
    kit.box(4.8, 9.2, -2.6, 0, 3.4, 3.7, K.wall, { collide: false }); kit.box(4.8, 9.2, -2.62, -2.5, 3.2, 3.7, K.band, { collide: false });
    kit.sign('VFAST · Visiting Faculty and Staff Hostel', 7, -2.63, 3.25, [0, -1], { width: 4.2, height: 0.42, bg: '#8c4a32', fg: '#f6efe0', font: 'bold 52px Georgia, serif' });
  }
  const stair = dogleg(kit, 0.45, 4.6, 1.0, 9.7, G, F1, { along: 'v', key: 't:wood:#7a5232', rail: 't:wood:#5d3a20', name: 'VFAST lobby stair' });
  kit.layer('vLobby', () => {
    tiledFloor(kit, T, 10 - T, T, 10 - T, G + 0.004, 'x:vfdiamond', 0.9);
    // the arch over the stair's foot and the wall beside the upper flight
    const La = L('u', 4.7, -1);
    extrude(kit, La, shift(spandrel(3.7, G + 2.2, F1 - 0.22), 2.5), -0.15, 0.15, K.yellow);
    La.box(0.3, 0.65, -0.15, 0.15, G, F1 - 0.22, K.yellow); La.box(4.35, 4.75, -0.15, 0.15, G, F1 - 0.22, K.yellow);
    extrude(kit, La, shift(archRing(3.7, G + 2.2, 0.18), 2.5), 0.15, 0.18, 't:wood:#6d4b30');
    L('v', 4.75, 1).wall(4.7, 9.7, 0, F1 - 0.22, K.yellow, 0.15);
    counter(kit, 7.6, 3.4, G, [0, 1], 2.8);
    kit.box(9.55, 9.7, 1.0, 5.6, G + 1.0, G + 2.3, 't:wood:#6d4b30', { collide: false });
    kit.chair(7.6, 2.6, G, [0, 1]);
    sofa(kit, 6.0, 8.8, G, [0, -1], { w: 1.8, c: 't:wood:#7a5232' }); sofa(kit, 9.2, 6.6, G, [-1, 0], { w: 1.6, c: 't:wood:#7a5232' });
    kit.box(5.4, 6.6, 7.0, 7.8, G, G + 0.42, 't:wood:#6d4b30');
    rodLight(kit, 7.2, 3, F1 - 0.225, 0.05); rodLight(kit, 7.2, 7, F1 - 0.225, 0.05); rodLight(kit, 2.5, 2.5, F1 - 0.225, 0.05);
  });
  kit.layer('vSuite', () => {
    tiledFloor(kit, T, 10 - T, T, 4.8, F1 + 0.004, 't:wood:#9a7b55', 1.5);
    tiledFloor(kit, 4.6, 10 - T, 4.8, 10 - T, F1 + 0.004, 't:wood:#9a7b55', 1.5);
    L('v', 4.75, 1).wall(4.8, 9.7, F1, R2 - 0.25, K.int, 0.15);
    bed(kit, 7.6, 7.8, F1, [0, -1]);
    sofa(kit, 2.5, 1.0, F1, [0, 1], { w: 2.0, c: 'c:#7a4a34' });
    kit.desk(8.8, 2.0, F1, [-1, 0], { w: 1.2, d: 0.6 }); kit.chair(8.2, 2.0, F1, [1, 0]);
    rodLight(kit, 7, 3, R2 - 0.255, 0.05); rodLight(kit, 7, 7.5, R2 - 0.255, 0.05);
  });
  // ---- the dining hall: grey diamond tiles, grid ceiling, timber tables, the servery hatch and buffet
  kit.layer('vDining', () => {
    tiledFloor(kit, 32 + T, U - T, T, 10 - T, G + 0.004, 'x:vfdiamond', 0.6);
    for (let u = 33; u < U - 0.5; u += 1.2) kit.box(u - 0.03, u + 0.03, T, 10 - T, F1 - 0.29, F1 - 0.225, 'c:#d9d5cc', { collide: false });
    for (let v = 1.5; v < 10; v += 1.2) kit.box(32 + T, U - T, v - 0.03, v + 0.03, F1 - 0.29, F1 - 0.225, 'c:#d9d5cc', { collide: false });
    for (const v of [2.2, 5.0, 7.8]) { kit.box(33.6, 38.6, v - 0.45, v + 0.45, G + 0.72, G + 0.77, 't:wood:#7a5232'); kit.box(33.8, 38.4, v - 0.35, v + 0.35, G, G + 0.72, 'c:#3a2a20', { collide: false }); kit.col(33.6, 38.6, v - 0.45, v + 0.45, G, G + 0.77); for (let u = 34.2; u < 38.4; u += 0.9) { kit.chair(u, v - 0.8, G, [0, 1], { seat: 't:wood:#6d4b30', frame: 'c:#3a2a20' }); kit.chair(u, v + 0.8, G, [0, -1], { seat: 't:wood:#6d4b30', frame: 'c:#3a2a20' }); } }
    kit.box(40.6, 41.6, 1.5, 8.5, G, G + 0.88, 'c:#f2efe8');
    for (let v = 2.2; v < 8.4; v += 1.0) kit.cyl(41.1, v, G + 0.88, 0.22, 0.16, 'm:#c8ccd0', { seg: 12 });
    const Lh = L('v', U - T / 2, 1); Lh.box(4.2, 5.8, -T / 2 - 0.3, -T / 2, G + 0.88, G + 0.92, 'c:#9aa1a6');
    kit.board(32 + T + 0.02, 8.6, G, [1, 0], { w: 1.4, h: 0.9, key: 'c:#2f4a3a' });
    for (const [u, v] of [[34.5, 2.5], [34.5, 7.5], [38.5, 2.5], [38.5, 7.5]]) rodLight(kit, u, v, F1 - 0.29, 0.05);
  });
  // ---- guest rooms
  const furnishGuest = (u0, u1, v0, v1, door) => {
    const cu = (u0 + u1) / 2; const cv = (v0 + v1) / 2; const alongU = u1 - u0 > v1 - v0;
    tiledFloor(kit, u0, u1, v0, v1, G + 0.004, 't:terrazzo:#b9ad9c', 2);
    // bed against the outer wall, the wardrobe by the door, a side table, a chair, an AC unit
    if (door === 'W') { bed(kit, u0 + 1.2, cv, G, [1, 0]); kit.box(u1 - 0.65, u1 - 0.05, v1 - 1.6, v1 - 0.2, G, G + 2.1, 't:wood:#6d4b30'); kit.box(u0 + 0.1, u0 + 0.55, cv + 1.3, cv + 1.8, G, G + 0.55, 't:wood:#6d4b30'); kit.box(u0 + 0.05, u0 + 0.3, cv - 0.6, cv + 0.6, G + 2.3, G + 2.6, 'c:#f2f2ee', { collide: false }); kit.desk(cu + 0.8, v0 + 0.5, G, [0, -1], { w: 1.1, d: 0.55 }); kit.chair(cu + 0.8, v0 + 1.1, G, [0, -1]); }
    if (door === 'E') { bed(kit, u1 - 1.2, cv, G, [-1, 0]); kit.box(u0 + 0.05, u0 + 0.65, v1 - 1.6, v1 - 0.2, G, G + 2.1, 't:wood:#6d4b30'); kit.box(u1 - 0.55, u1 - 0.1, cv + 1.3, cv + 1.8, G, G + 0.55, 't:wood:#6d4b30'); kit.box(u1 - 0.3, u1 - 0.05, cv - 0.6, cv + 0.6, G + 2.3, G + 2.6, 'c:#f2f2ee', { collide: false }); kit.desk(cu - 0.8, v0 + 0.5, G, [0, -1], { w: 1.1, d: 0.55 }); kit.chair(cu - 0.8, v0 + 1.1, G, [0, -1]); }
    if (door === 'S') { bed(kit, cu, v1 - 1.2, G, [0, -1]); kit.box(u1 - 1.6, u1 - 0.2, v0 + 0.05, v0 + 0.65, G, G + 2.1, 't:wood:#6d4b30'); kit.box(cu + 1.3, cu + 1.8, v1 - 0.55, v1 - 0.1, G, G + 0.55, 't:wood:#6d4b30'); kit.box(cu - 0.6, cu + 0.6, v1 - 0.3, v1 - 0.05, G + 2.3, G + 2.6, 'c:#f2f2ee', { collide: false }); kit.desk(u0 + 0.5, cv - 0.6, G, [-1, 0], { w: 1.1, d: 0.55 }); kit.chair(u0 + 1.1, cv - 0.6, G, [-1, 0]); }
    kit.box(cu - 0.8, cu + 0.8, cv - 0.5, cv + 0.5, G + 0.006, G + 0.012, 'c:#7a3b3b', { collide: false });
    rodLight(kit, cu, cv, F1 - 0.255, 0.04, alongU ? [1, 0] : [0, 1]);
    void alongU;
  };
  kit.layer('vW', () => { roomsW.forEach(([a, b], i) => { if (i) L('u', a, 1).wall(T, 6.5, 0, F1 - 0.25, K.int, 0.2); furnishGuest(T, 6.375, a + 0.1, b - 0.1, 'W'); kit.room(`vf:W${i}`, `VFAST guest room 10${i + 1}`, T, 6.5, a, b, G, F1, 0); }); for (let v = 12; v < 35; v += 4) rodLight(kit, 8.25, v, F1 - 0.255, 0.04, [0, 1]); });
  kit.layer('vE', () => { roomsE.forEach(([a, b], i) => { if (i) L('u', a, 1).wall(35.5, U - T, 0, F1 - 0.25, K.int, 0.2); furnishGuest(35.625, U - T, a + 0.1, b - 0.1, 'E'); kit.room(`vf:E${i}`, `VFAST guest room 30${i + 1}`, 35.5, U - T, a, b, G, F1, 0); }); for (let v = 12; v < 35; v += 4) rodLight(kit, 33.75, v, F1 - 0.255, 0.04, [0, 1]); });
  kit.layer('vS', () => { roomsS.forEach(([a, b], i) => { if (i) L('v', a, 1).wall(35.5, V - T, 0, F1 - 0.25, K.int, 0.2); furnishGuest(a + 0.1, b - 0.1, 35.625, V - T, 'S'); kit.room(`vf:S${i}`, `VFAST guest room 20${i + 1}`, a, b, 35.5, V - T, G, F1, 0); }); for (let u = 9; u < 34; u += 4) rodLight(kit, u, 33.75, F1 - 0.255, 0.04); });
  kit.room('vfLobby', 'VFAST lobby', T, 10 - T, T, 10 - T, G, F1);
  kit.room('vfDining', 'VFAST dining hall', 32 + T, U - T, T, 10 - T, G, F1);
  kit.room('vfSuite', 'VFAST suite (first floor)', T, 10 - T, T, 10 - T, F1, R2, 1);
  kit.room('vfLawn', 'VFAST lawns', 10, 32, 0, 32, 0, 1);
  kit.floors.push({ y: G, name: 'Ground (lobby, dining hall, guest rooms)' }, { y: F1, name: 'First floor (suites over the lobby)' });
  void stair;
  register(kit, campus, null, [[0, 0], [10, 0], [10, 32], [32, 32], [32, 0], [42, 0], [42, 42], [0, 42]], R2);
}

// ================================================================ 6. Rakesh Verma Convention Centre (as built: a site)
// Imagery shows bare earth and foundations, not a finished hall (research 4): a blue hoarding round the plot, the
// guest-room block's RC frame three floors up with props and rebar starters, footings for the convention block, a
// tower crane, site cabins and material heaps. The gate stands open; nothing above the ground slab is reachable.
const RV = { eu: [0.9715, -0.2370] };
function rvFrame(bs) {
  const eu = RV.eu; const ev = [-eu[1], eu[0]];
  const us = bs[0].outer.map(([x, z]) => x * eu[0] + z * eu[1]); const vs = bs[0].outer.map(([x, z]) => x * ev[0] + z * ev[1]);
  const u0 = Math.min(...us); const v0 = Math.min(...vs);
  return { ...frameOf([u0 * eu[0] + v0 * ev[0], u0 * eu[1] + v0 * ev[1]], eu), W: Math.max(...us) - u0, L: Math.max(...vs) - v0 };
}
function buildRVCC(kit) {
  const W = kit.W; const Lh = kit.L;
  const K = { dirt: 't:dirt:#9b7b55', conc: 't:concrete:#b4afa5', fence: 'c:#2f5d8a', stripe: 'c:#f2f2ee', steel: 'm:#7d858c', rebar: 'c:#7a4a30', brick: 't:brick:#a8573a', crane: 'c:#e2b422', prop: 'm:#9aa1a6', ply: 't:wood:#b58a55' };
  const L = (axis, c, out) => line(kit, axis, c, out);
  const fu0 = -1.5; const fu1 = W + 3; const fv0 = -3; const fv1 = Lh + 3; const FHt = 2.4;
  kit.box(fu0, fu1, fv0, fv1, -0.02, 0.025, K.dirt, { collide: false });
  // hoarding (gate on the east, towards the service road)
  const gate = { s: (fv0 + fv1) / 2, w: 6 };
  const hoard = [[L('u', fv0, -1), fu0, fu1, null], [L('u', fv1, 1), fu0, fu1, null], [L('v', fu0, -1), fv0, fv1, null], [L('v', fu1, 1), fv0, fv1, gate]];
  for (const [Lf, s0, s1, g] of hoard) {
    const segs = g ? [[s0, g.s - g.w / 2], [g.s + g.w / 2, s1]] : [[s0, s1]];
    for (const [a, b] of segs) {
      Lf.box(a, b, -0.03, 0.03, 0, FHt, K.fence, { collide: true });
      Lf.box(a, b, 0.03, 0.035, FHt - 0.35, FHt - 0.15, K.stripe);
      for (let s = a; s <= b + 1e-6; s += 2.4) Lf.box(s - 0.04, s + 0.04, -0.12, -0.04, 0, FHt + 0.1, K.steel);
    }
    if (g) {
      for (const k of [-1, 1]) Lf.box(g.s + k * g.w / 2 - 0.1, g.s + k * g.w / 2 + 0.1, -0.1, 0.1, 0, FHt + 0.4, K.steel);
      // gate leaves swung open outwards
      for (const k of [-1, 1]) Lf.box(g.s + k * (g.w / 2) - (k > 0 ? 0.05 : -0.05), g.s + k * (g.w / 2) + (k > 0 ? 0 : 0), 0.1, 0.1 + g.w / 2, 0, FHt, K.fence);
      kit.sign('RAKESH VERMA CONVENTION CENTRE · Construction in progress · IPD, BITS Pilani', fu1 + 0.05, g.s - g.w / 2 - 3.2, 1.0, [1, 0], { width: 5.6, height: 1.0, bg: '#f2f2ee', fg: '#1f3d6b', font: 'bold 40px Arial, sans-serif' });
      kit.sign('NO ENTRY WITHOUT HELMET', fu1 + 0.05, g.s + g.w / 2 + 2.0, 1.2, [1, 0], { width: 2.4, height: 0.5, bg: '#d9a521', fg: '#1d1f21', font: 'bold 52px Arial, sans-serif' });
    }
  }
  kit.entrance('Site gate', fu1 + 1.6, gate.s, [1, 0]);
  // ---- guest-room block (G+5), the frame three floors up
  const gb = { u0: 2, u1: 16, v0: 2, v1: Lh - 2 };
  const cols = 4; const rows = 7; const H = 3.3; const done = 3;
  const cu = (i) => gb.u0 + ((gb.u1 - gb.u0) * i) / (cols - 1); const cvv = (j) => gb.v0 + ((gb.v1 - gb.v0) * j) / (rows - 1);
  kit.box(gb.u0 - 0.5, gb.u1 + 0.5, gb.v0 - 0.5, gb.v1 + 0.5, 0, 0.6, K.conc, { walkable: true });
  for (let f = 1; f <= done; f++) {
    const y = 0.6 + f * H;
    kit.box(gb.u0 - 0.4, gb.u1 + 0.4, gb.v0 - 0.4, gb.v1 + 0.4, y - 0.2, y, K.conc);
    for (let j = 0; j < rows; j++) kit.box(gb.u0 - 0.2, gb.u1 + 0.2, cvv(j) - 0.15, cvv(j) + 0.15, y - 0.65, y - 0.2, K.conc);
    for (let i = 0; i < cols; i++) kit.box(cu(i) - 0.15, cu(i) + 0.15, gb.v0 - 0.2, gb.v1 + 0.2, y - 0.65, y - 0.2, K.conc);
  }
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    kit.box(cu(i) - 0.23, cu(i) + 0.23, cvv(j) - 0.23, cvv(j) + 0.23, 0.6, 0.6 + done * H - 0.2, K.conc);
    // rebar starters and a half-cast column on the top
    const yt = 0.6 + done * H;
    if ((i + j) % 3 === 0) kit.box(cu(i) - 0.23, cu(i) + 0.23, cvv(j) - 0.23, cvv(j) + 0.23, yt, yt + 1.6, K.conc, { collide: false });
    else for (const [a, b] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]]) kit.box(cu(i) + a - 0.012, cu(i) + a + 0.012, cvv(j) + b - 0.012, cvv(j) + b + 0.012, yt, yt + 1.2, K.rebar, { collide: false });
  }
  // brick infill going up on the ground floor's outer bays; props under the top slab
  for (let j = 0; j < rows - 1; j += 2) kit.box(gb.u0 - 0.12, gb.u0 + 0.12, cvv(j) + 0.25, cvv(j + 1) - 0.25, 0.6, 0.6 + H - 0.65, K.brick);
  for (let i = 0; i < cols - 1; i++) kit.box(cu(i) + 0.25, cu(i + 1) - 0.25, gb.v0 - 0.12, gb.v0 + 0.12, 0.6, 2.4, K.brick);
  for (let u = gb.u0 + 1; u < gb.u1; u += 1.6) for (let v = gb.v0 + 1; v < gb.v1; v += 1.6) kit.box(u - 0.03, u + 0.03, v - 0.03, v + 0.03, 0.6 + (done - 1) * H, 0.6 + done * H - 0.2, K.prop, { collide: false });
  kit.box(gb.u0 - 0.4, gb.u1 + 0.4, gb.v0 - 0.4, gb.v1 + 0.4, 0.6 + done * H - 0.26, 0.6 + done * H - 0.2, K.ply, { collide: false });
  // ---- convention block (G+2): footings and plinth beams, column starters
  const cb = { u0: 20, u1: W - 2, v0: 4, v1: Lh - 4 };
  kit.box(cb.u0 - 1, cb.u1 + 1, cb.v0 - 1, cb.v1 + 1, -0.01, 0.02, 't:dirt:#8a6a48', { collide: false });
  const ccols = 3; const crows = 6;
  for (let i = 0; i < ccols; i++) for (let j = 0; j < crows; j++) {
    const u = cb.u0 + ((cb.u1 - cb.u0) * i) / (ccols - 1); const v = cb.v0 + ((cb.v1 - cb.v0) * j) / (crows - 1);
    kit.box(u - 0.8, u + 0.8, v - 0.8, v + 0.8, 0, 0.25, K.conc);
    kit.box(u - 0.23, u + 0.23, v - 0.23, v + 0.23, 0.25, 1.4, K.conc);
    for (const [a, b] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]]) kit.box(u + a - 0.012, u + a + 0.012, v + b - 0.012, v + b + 0.012, 1.4, 2.4, K.rebar, { collide: false });
    if (j < crows - 1) kit.box(u - 0.15, u + 0.15, v, v + (cb.v1 - cb.v0) / (crows - 1), 0, 0.5, K.conc);
    if (i < ccols - 1) kit.box(u, u + (cb.u1 - cb.u0) / (ccols - 1), v - 0.15, v + 0.15, 0, 0.5, K.conc);
  }
  // ---- tower crane
  {
    const [mu, mv] = [18, Lh / 2]; const Hm = 32; const s = 0.8;
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) bar(kit, [mu + a * s, 0, mv + b * s], [mu + a * s, Hm, mv + b * s], 0.12, K.crane);
    for (let y = 0; y < Hm; y += 2) for (const [[a0, b0], [a1, b1]] of [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]], [[-1, 1], [-1, -1]]]) { bar(kit, [mu + a0 * s, y, mv + b0 * s], [mu + a1 * s, y + 2, mv + b1 * s], 0.05, K.crane); bar(kit, [mu + a0 * s, y, mv + b0 * s], [mu + a1 * s, y, mv + b1 * s], 0.05, K.crane); }
    kit.box(mu - 1.5, mu + 1.5, mv - 1.5, mv + 1.5, 0, 0.6, K.conc);
    kit.col(mu - s, mu + s, mv - s, mv + s, 0, Hm);
    kit.box(mu - 1.0, mu + 1.0, mv - 1.0, mv + 1.0, Hm, Hm + 0.4, K.crane, { collide: false });
    kit.box(mu + 0.9, mu + 2.2, mv - 1.0, mv + 0.6, Hm - 1.8, Hm, 'c:#f2f2ee', { collide: false });
    // jib towards -v... along -u over the frame, counter-jib +u with blocks
    for (const [a, b] of [[-0.6, -0.6], [-0.6, 0.6]]) bar(kit, [mu, Hm + 0.4, mv + b], [mu - 34, Hm + 0.4, mv + b], 0.08, K.crane);
    bar(kit, [mu, Hm + 2.0, mv], [mu - 34, Hm + 0.5, mv], 0.08, K.crane);
    for (let k = 0; k < 17; k++) { const u0 = mu - k * 2; const u1 = u0 - 2; const yt = (u) => Hm + 2.0 - ((mu - u) / 34) * 1.5; for (const b of [-0.6, 0.6]) bar(kit, [u0, Hm + 0.4, mv + b], [u1, yt(u1), mv], 0.04, K.crane); }
    bar(kit, [mu, Hm + 0.4, mv], [mu + 12, Hm + 0.4, mv], 0.5, K.crane, 1.2);
    kit.box(mu + 9, mu + 12, mv - 0.7, mv + 0.7, Hm - 1.6, Hm + 0.15, K.conc, { collide: false });
    bar(kit, [mu, Hm + 0.4, mv], [mu, Hm + 6, mv], 0.18, K.crane); bar(kit, [mu, Hm + 6, mv], [mu - 20, Hm + 1.2, mv], 0.04, K.steel); bar(kit, [mu, Hm + 6, mv], [mu + 11, Hm + 0.6, mv], 0.04, K.steel);
    bar(kit, [mu - 22, Hm + 0.4, mv], [mu - 22, 14, mv], 0.03, K.steel); kit.box(mu - 22.3, mu - 21.7, mv - 0.2, mv + 0.2, 13.4, 14, 'c:#d9a521', { collide: false });
  }
  // ---- site cabins, heaps, a mixer
  for (const [u, v, c] of [[W - 1, fv1 - 2.6, 'c:#f2f2ee'], [W - 1, fv1 - 5.6, 'c:#2f5d8a']]) { kit.box(u - 3, u + 0.5, v - 1.2, v + 1.2, 0, 2.6, c); kit.box(u - 2.6, u - 1.6, v - 1.25, v - 1.2, 1.0, 1.9, 'g:#9fc3d6', { collide: false }); }
  kit.cyl(W - 3, 3, 0, 2.6, 1.6, 't:dirt:#c9a46a', { seg: 14, rTop: 0.2, collide: true });
  kit.cyl(W + 0.5, 6.5, 0, 2.0, 1.3, 't:concrete:#8f8a80', { seg: 14, rTop: 0.2, collide: true });
  for (let k = 0; k < 4; k++) kit.box(fu0 + 3 + k * 1.4, fu0 + 4.2 + k * 1.4, fv0 + 1.5, fv0 + 2.5, 0, 1.0, K.brick);
  for (let k = 0; k < 6; k++) kit.box(gb.u1 + 1.5, gb.u1 + 2.0, fv0 + 1.5 + k * 0.12, fv0 + 1.56 + k * 0.12, 0.05, 0.12, K.rebar, { collide: false });
  piece(kit, W - 5, 10, 0, [1, 0], [[-0.6, 0.6, 0, 0.4, -0.5, 0.5, 'c:#d9a521'], [-0.05, 0.05, 0.4, 1.0, -0.05, 0.05, K.steel]], 1.2, 1.0, 1.4);
  drum(kit, W - 5, 10, 0, [1, 0], 0, 1.3, 0, 0.55, 1.0, 'c:#d24a2a', { seg: 14 });
  kit.room('rvSite', 'Rakesh Verma Convention Centre · site', fu0, fu1, fv0, fv1, 0, 4);
}

// ================================================================ modules
const mod = (name, osm, frame, build) => ({ id: 'workshops', name, category: 'academic', osm, floors: 1, enabled: true, research: 'mixed', frame: () => frame, build });
export default [
  mod('BITS Workshop', ['BITS Workshop'], frameOf(WS.O, WS.eu, WS.U, WS.V), (kit, ctx) => { buildWorkshop(kit); ctx.buildings[0].h = WS.CREST; }),
  mod('New BITS Workshop (Central Workshop)', ['New BITS Workshop'], frameOf(NW.O, NW.eu, NW.U, NW.V), (kit, ctx) => { buildNewWorkshop(kit); ctx.buildings[0].h = 9.6; }),
  mod('Lecture Theatre Complex', [], frameOf(LTC.O, LTC.eu, LTC.U, LTC.V), (kit, ctx) => buildLTC(kit, ctx.campus)),
  mod('Rakesh Kapoor Innovation Centre', ['Rakesh Kapoor Innovation Centre'], frameOf(RK.O, RK.eu, 38.1, 44.7), (kit, ctx) => { buildRKIC(kit); ctx.buildings[0].h = RK.G + 3 * RK.FH + 0.9; }),
  { ...mod('Rakesh Verma Convention Centre (site)', ['Rakesh Verma Convention Centre'], null, (kit, ctx) => { buildRVCC(kit); ctx.buildings[0].h = 12; }), category: 'hall', frame: rvFrame },
  mod('VFAST (guest house)', [], frameOf(VF.O, VF.eu, VF.U, VF.V), (kit, ctx) => buildVFAST(kit, ctx.campus)),
];
