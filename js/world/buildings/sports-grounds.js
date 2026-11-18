// BITS sports grounds: the Gymkhana ground (athletics track, football infield, hockey field, cricket practice nets,
// the Gymkhana pavilion and its blue stands, boundary wall and gates), the basketball and tennis courts, the sand
// volleyball courts, the skating rink, the swimming pool with its changing block, and the Med-C cricket ground.
// Research: research/buildings/sports.md (and review.md: the indoor halls and gym are in the SAC, not here).
//
// None of these is an OSM building, so the module owns no footprint (osm: []). The kit's frame is the campus frame
// itself (u = x east, v = z south); each site is built in its own small Kit frame fitted to its OSM polygon (the
// grounds are tilted 8.5-12 degrees off north) and then merged into this kit, so the whole module costs one mesh
// per material. Interior zones: the pavilion rooms, the pool block and the Med-C scorers' hut.
// The football field and its goals stay as bits-world.js builds them (fieldBounds drives the ball and the match).
// Everything here is ground level (stands 2 m, floodlights 17 m) and far east of the Clock Tower → Saraswati axis.
import * as THREE from 'three';
import { Kit } from './kit.js';
import { worldBoxGeometry, TEX_SIZE } from '../textures.js';

const ID = 'sports-grounds';

const M = {
  cream: 't:plaster:#ead7ab', creamW: 't:plaster:#f0e4c4', trim: 'c:#f4ecd6', dado: 't:plaster:#c9ae7f',
  conc: 't:concrete:#cdc6b8', kota: 't:concrete:#d4cab4', terrazzo: 't:terrazzo:#d9d3c6', ceil: 'c:#efece4',
  roof: 't:concrete:#cfc8bb', blue1: 't:concrete:#86b8de', blue2: 't:concrete:#6fa5d2', blueWall: 't:plaster:#5d95c6',
  steel: 'm:#9aa3a8', post: 'm:#4d5d53', pipe: 'm:#7f898e', white: 'c:#f4f4f0', yellow: 'c:#e9c12c',
  door: 't:wood:#8a6a4a', grey: 'c:#5d6266', glow: 'e:#fff6dc', dark: 'c:#2c3034', red: 'c:#b8322a', orange: 'c:#e07a2a',
  wood: 't:wood:#a07850', locker: 'm:#7c8a96', almirah: 'm:#6f7d72', gold: 'm:#d4af37', board: 'c:#2f3a33',
  tileW: 't:tiles:#e6ecec', tileDeck: 't:tiles:#e4dccb', tileBlue: 't:tiles:#8ccfeb', tileFloor: 't:tiles:#a6dcf0',
  coping: 'c:#f1eee6', laneBlue: 'c:#1d3f8a', ropeRed: 'c:#c8302a', ropeBlue: 'c:#2f5fc0', ball: 'c:#f2f2ee',
  bball: 'c:#d8692a', cone: 'c:#ef7b22', glass: 'g:#9fc3d6', net: 'x:net', netW: 'x:netW', netG: 'x:netG',
  chain: 'x:chain', jaali: 'x:jaali', water: 'sp:water',
};
// ground surfaces lie centimetres over the campus areas (court, track, pitch: polygon offsets 4..8): offset harder
const S = (base, lvl) => `po${lvl}:${base}`;
const LINE = S('c:#f7f7f2', 12);
const TILE = { chain: 0.5, net: 0.15, netW: 0.12, netG: 0.15, jaali: 0.4 };
const NO_SHADOW = ['x:', 'sp:', 'po'];

// ---------- frames and helpers ----------
const unit = ([x, z]) => { const l = Math.hypot(x, z); return [x / l, z / l]; };
const frameOf = (O, dir) => { const ev = unit(dir); return { O, eu: [ev[1], -ev[0]], ev, angle: Math.atan2(ev[0], ev[1]) }; };
const inPoly = (x, z, poly) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i]; const [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-12) + xi) c = !c;
  }
  return c;
};

// Flat triangles [[u, y, v] x3] facing up, UVs in metres / tile.
function flatGeo(tris, tile = 4) {
  const pos = new Float32Array(tris.length * 9); const nor = new Float32Array(tris.length * 9); const uv = new Float32Array(tris.length * 6);
  tris.forEach((t, i) => {
    let [a, b, c] = t;
    if ((b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]) < 0) [b, c] = [c, b];
    [a, b, c].forEach((p, j) => { pos.set(p, i * 9 + j * 3); nor.set([0, 1, 0], i * 9 + j * 3); uv.set([p[0] / tile, -p[2] / tile], i * 6 + j * 2); });
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
const quadTris = (a, b, c, d, y, ya = y, yb = y, yc = y, yd = y) => [[[a[0], ya, a[1]], [b[0], yb, b[1]], [c[0], yc, c[1]]], [[a[0], ya, a[1]], [c[0], yc, c[1]], [d[0], yd, d[1]]]];
// ribbon between two polylines of [u, v]
const ribbonTris = (A, B, y) => { const t = []; for (let i = 0; i + 1 < A.length; i++) t.push(...quadTris(A[i], B[i], B[i + 1], A[i + 1], y)); return t; };
const arcPts = (cu, cv, r, a0, a1, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [cu + r * Math.cos(a), cv + r * Math.sin(a)]; });
const segTris = ([u0, v0], [u1, v1], w, y) => {
  const [du, dv] = unit([u1 - u0, v1 - v0]); const nu = -dv * w / 2; const nv = du * w / 2;
  return quadTris([u0 + nu, v0 + nv], [u1 + nu, v1 + nv], [u1 - nu, v1 - nv], [u0 - nu, v0 - nv], y);
};
const rectTris = (u0, u1, v0, v1, y) => quadTris([u0, v0], [u1, v0], [u1, v1], [u0, v1], y);
const outlineTris = (u0, u1, v0, v1, w, y) => [
  ...rectTris(u0 - w / 2, u1 + w / 2, v0 - w / 2, v0 + w / 2, y), ...rectTris(u0 - w / 2, u1 + w / 2, v1 - w / 2, v1 + w / 2, y),
  ...rectTris(u0 - w / 2, u0 + w / 2, v0 + w / 2, v1 - w / 2, y), ...rectTris(u1 - w / 2, u1 + w / 2, v0 + w / 2, v1 - w / 2, y),
];
const ringTris = (cu, cv, r0, r1, a0, a1, y, n = 32) => ribbonTris(arcPts(cu, cv, r0, a0, a1, n), arcPts(cu, cv, r1, a0, a1, n), y);
const discTris = (cu, cv, r, a0, a1, y, n = 32) => { const p = arcPts(cu, cv, r, a0, a1, n); const t = []; for (let i = 0; i + 1 < p.length; i++) t.push([[cu, y, cv], [p[i][0], y, p[i][1]], [p[i + 1][0], y, p[i + 1][1]]]); return t; };

// A vertical quad from (u0, v0) to (u1, v1), y0..y1, UVs in metres / tile (nets, fences, jaali).
function vquad(K, [u0, v0], [u1, v1], y0, y1, key, tile = 1) {
  const len = Math.hypot(u1 - u0, v1 - v0);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([u0, y0, v0, u1, y0, v1, u1, y1, v1, u0, y0, v0, u1, y1, v1, u0, y1, v0]), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, y0 / tile, len / tile, y0 / tile, len / tile, y1 / tile, 0, y0 / tile, len / tile, y1 / tile, 0, y1 / tile]), 2));
  g.computeVertexNormals();
  K.geo(key, g);
}

// A box with world-metre UVs for any key (kit.box tiles only 't:' keys).
function slab(K, u0, u1, v0, v1, y0, y1, key, { tile = 3, walkable = true, collide = true } = {}) {
  if (u1 < u0) [u0, u1] = [u1, u0];
  if (v1 < v0) [v0, v1] = [v1, v0];
  const base = key.replace(/^po\d+:/, '');
  const t = base.startsWith('t:') ? TEX_SIZE[base.split(':')[1]] || tile : tile;
  const g = worldBoxGeometry(u1 - u0, y1 - y0, v1 - v0, t);
  g.translate((u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2);
  K.geo(key, g);
  if (collide) K.col(u0, u1, v0, v1, y0, y1, walkable);
}

// A short piece of geometry in a local frame facing [du, dv] (x across, z forward), with optional tilt about x.
function piece(K, u, v, [du, dv], key, g) { g.rotateY(Math.atan2(du, dv)); g.translate(u, 0, v); K.geo(key, g); }

// Canvas textures (repeating) for fences, nets and the jaali parapet.
function canvasTex(size, draw, { alphaTest = 0.4 } = {}) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  t.userData = { alphaTest, doubleSide: true };
  return t;
}
const TEXTURES = {
  chain: () => canvasTex(64, (g, n) => { g.strokeStyle = '#66756d'; g.lineWidth = 4; for (const o of [-n, 0, n]) { g.beginPath(); g.moveTo(o, 0); g.lineTo(o + n, n); g.moveTo(o + n, 0); g.lineTo(o, n); g.stroke(); } }),
  net: () => canvasTex(32, (g, n) => { g.fillStyle = '#1f2326'; g.fillRect(0, 0, n, 3); g.fillRect(0, 0, 3, n); }, { alphaTest: 0.3 }),
  netW: () => canvasTex(32, (g, n) => { g.fillStyle = '#f2f2ee'; g.fillRect(0, 0, n, 4); g.fillRect(0, 0, 4, n); }, { alphaTest: 0.3 }),
  netG: () => canvasTex(32, (g, n) => { g.fillStyle = '#2f6b3a'; g.fillRect(0, 0, n, 3); g.fillRect(0, 0, 3, n); }, { alphaTest: 0.3 }),
  jaali: () => canvasTex(64, (g, n) => {
    g.fillStyle = '#d3d2ca'; g.fillRect(0, 0, n, n);
    g.globalCompositeOperation = 'destination-out';
    for (const [x, y] of [[6, 6], [38, 6], [6, 38], [38, 38]]) { g.beginPath(); g.ellipse(x + 10, y + 10, 9, 9, 0, 0, Math.PI * 2); g.fill(); }
  }),
};

// ---------- reusable pieces ----------
// Floodlight mast: concrete plinth, tapering galvanised pole, a head frame of LED floods facing the target.
function flood(K, u, v, tu, tv, h = 17, cols = 4) {
  slab(K, u - 0.45, u + 0.45, v - 0.45, v + 0.45, 0, 0.5, M.conc, { walkable: false });
  K.cyl(u, v, 0.5, 0.2, h - 0.4, M.steel, { rTop: 0.11, seg: 8 });
  K.box(u - 0.2, u + 0.2, v - 0.2, v + 0.2, 1.1, 1.6, M.grey, { collide: false }); // switch box
  const d = unit([tu - u, tv - v]);
  const W = cols * 0.4 + 0.1; const parts = [];
  parts.push([-W, W, h - 0.06, h + 0.06, -0.08, 0.08, M.steel], [-W, W, h + 1.14, h + 1.26, -0.08, 0.08, M.steel]);
  parts.push([-W - 0.06, -W + 0.06, h - 0.06, h + 1.26, -0.08, 0.08, M.steel], [W - 0.06, W + 0.06, h - 0.06, h + 1.26, -0.08, 0.08, M.steel]);
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < cols; c++) {
      const x = -W + 0.45 + c * ((2 * W - 0.9) / Math.max(1, cols - 1)); const y = h + 0.3 + r * 0.6;
      parts.push([x - 0.3, x + 0.3, y - 0.22, y + 0.22, 0.08, 0.3, M.dark], [x - 0.26, x + 0.26, y - 0.18, y + 0.18, 0.3, 0.32, M.glow]);
    }
  }
  K._rot(u, v, d, parts);
}

// Chain-link fence along a local axis from (u0, v0) to (u1, v1) with gaps [{ at, width }] (metres from the start).
function fence(K, u0, v0, u1, v1, h = 3.5, { gaps = [], key = M.chain, post = M.post } = {}) {
  const alongU = Math.abs(u1 - u0) >= Math.abs(v1 - v0);
  const len = Math.abs(alongU ? u1 - u0 : v1 - v0);
  const sgn = Math.sign(alongU ? u1 - u0 : v1 - v0) || 1;
  const P = (s) => (alongU ? [u0 + sgn * s, v0] : [u0, v0 + sgn * s]);
  const pieces = []; let s = 0;
  for (const gp of [...gaps].sort((a, b) => a.at - b.at)) { pieces.push([s, gp.at - gp.width / 2]); s = gp.at + gp.width / 2; }
  pieces.push([s, len]);
  for (const [a, b] of pieces) {
    if (b - a < 0.05) continue;
    const pa = P(a); const pb = P(b);
    vquad(K, pa, pb, 0.05, h, key, TILE[key.slice(2)] || 0.5);
    const n = Math.max(1, Math.round((b - a) / 3));
    for (let i = 0; i <= n; i++) { const p = P(a + ((b - a) * i) / n); K.cyl(p[0], p[1], 0, 0.04, h + 0.05, post, { seg: 6 }); }
    // top and bottom rails
    for (const y of [h - 0.03, 0.08]) {
      const g = new THREE.BoxGeometry(alongU ? Math.abs(pb[0] - pa[0]) : 0.04, 0.05, alongU ? 0.04 : Math.abs(pb[1] - pa[1]));
      g.translate((pa[0] + pb[0]) / 2, y, (pa[1] + pb[1]) / 2);
      K.geo(post, g);
    }
    K.col(Math.min(pa[0], pb[0]) - (alongU ? 0 : 0.06), Math.max(pa[0], pb[0]) + (alongU ? 0 : 0.06), Math.min(pa[1], pb[1]) - (alongU ? 0.06 : 0), Math.max(pa[1], pb[1]) + (alongU ? 0.06 : 0), 0, h);
  }
}

// Blue concrete stand: rows of walkable tiers along u (u0..u1) rising towards +v from the front at v = 0, a back
// wall, and a stair at each end with a stepped cheek wall (the tiers themselves are 0.4 m: you can climb them too).
function stand(K, u0, u1, rows, { rise = 0.4, tread = 0.7, ends = [true, true] } = {}) {
  for (let k = 0; k < rows; k++) slab(K, u0, u1, k * tread, (k + 1) * tread, 0, (k + 1) * rise, k % 2 ? M.blue2 : M.blue1);
  // white seat nosings
  for (let k = 0; k < rows; k++) K.box(u0, u1, k * tread, k * tread + 0.05, (k + 1) * rise, (k + 1) * rise + 0.004, M.white, { collide: false });
  const H = rows * rise; const D = rows * tread;
  slab(K, u0 - (ends[0] ? 1.55 : 0), u1 + (ends[1] ? 1.55 : 0), D, D + 0.25, 0, H + 1.0, M.blue2, { walkable: false });
  K.box(u0 - (ends[0] ? 1.55 : 0), u1 + (ends[1] ? 1.55 : 0), D - 0.03, D + 0.28, H + 1.0, H + 1.06, M.trim, { collide: false });
  const n = Math.ceil(H / 0.18); const rs = H / n; const ts = D / n;
  for (const [i, on] of ends.entries()) {
    if (!on) continue;
    const [a, b, c0, c1] = i === 0 ? [u0 - 1.4, u0, u0 - 1.55, u0 - 1.4] : [u1, u1 + 1.4, u1 + 1.4, u1 + 1.55];
    for (let j = 0; j < n; j++) {
      slab(K, a, b, j * ts, (j + 1) * ts, 0, (j + 1) * rs, M.conc);
      slab(K, c0, c1, j * ts, (j + 1) * ts, 0, (j + 1) * rs + 0.9, M.blue2, { walkable: false });
    }
    K.stairs.push({ name: `stand stair ${i ? 'east' : 'west'}`, u0: a, u1: b, v0: 0, v1: D, y0: 0, y1: H });
  }
  return { H, D };
}

// A plain flat-roofed single-storey block's parapet + cornice around u0..u1 × v0..v1 at roof level y.
function roofEdge(K, u0, u1, v0, v1, y, { parapet = 0.75, over = 0.15 } = {}) {
  slab(K, u0 - over, u1 + over, v0 - over, v1 + over, y, y + 0.2, M.roof, { walkable: false, collide: false });
  K.box(u0 - over - 0.08, u1 + over + 0.08, v0 - over - 0.08, v1 + over + 0.08, y + 0.02, y + 0.12, M.trim, { collide: false }); // cornice band
  const t = 0.2; const y0 = y + 0.2; const y1 = y0 + parapet;
  K.box(u0 - over, u1 + over, v0 - over, v0 - over + t, y0, y1, M.cream, { collide: false });
  K.box(u0 - over, u1 + over, v1 + over - t, v1 + over, y0, y1, M.cream, { collide: false });
  K.box(u0 - over, u0 - over + t, v0 - over + t, v1 + over - t, y0, y1, M.cream, { collide: false });
  K.box(u1 + over - t, u1 + over, v0 - over + t, v1 + over - t, y0, y1, M.cream, { collide: false });
  K.box(u0 - over - 0.04, u1 + over + 0.04, v0 - over - 0.04, v0 - over + t + 0.04, y1, y1 + 0.07, M.trim, { collide: false });
  K.box(u0 - over - 0.04, u1 + over + 0.04, v1 + over - t - 0.04, v1 + over + 0.04, y1, y1 + 0.07, M.trim, { collide: false });
  K.box(u0 - over - 0.04, u0 - over + t + 0.04, v0 - over + t + 0.04, v1 + over - t - 0.04, y1, y1 + 0.07, M.trim, { collide: false });
  K.box(u1 + over - t - 0.04, u1 + over + 0.04, v0 - over + t + 0.04, v1 + over - t - 0.04, y1, y1 + 0.07, M.trim, { collide: false });
}

// Football / hockey goal: two posts and a bar on the goal line at v (mouth facing [0, dir]), a net behind.
function goal(K, cu, v, dir, w, h, depth, { post = M.white } = {}) {
  for (const s of [-1, 1]) slab(K, cu + s * w / 2 - 0.05, cu + s * w / 2 + 0.05, v - 0.05, v + 0.05, 0, h, post, { walkable: false });
  K.box(cu - w / 2 - 0.05, cu + w / 2 + 0.05, v - 0.05, v + 0.05, h, h + 0.1, post, { collide: false });
  const vb = v - dir * depth;
  vquad(K, [cu - w / 2, vb], [cu + w / 2, vb], 0, h * 0.8, M.netW, TILE.netW);
  for (const s of [-1, 1]) vquad(K, [cu + s * w / 2, v], [cu + s * w / 2, vb], 0, h, M.netW, TILE.netW);
  const g = new THREE.PlaneGeometry(w, Math.hypot(depth, h * 0.2)); // the sloping roof net
  g.rotateX(-Math.PI / 2 + Math.atan2(h * 0.2, depth) * -dir); g.translate(cu, h * 0.9, v - dir * depth / 2);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / TILE.netW, uv.getY(i) * depth / TILE.netW);
  K.geo(M.netW, g);
  K.col(cu - w / 2, cu + w / 2, Math.min(v, vb) - 0.05, Math.max(v, vb) + 0.05, 0, 0.0 + 0.3).walkable = false;
}

// ---------- the module ----------
export default {
  id: ID,
  name: 'BITS Gymkhana Grounds, courts, Swimming Pool and Med-C ground',
  category: 'sports',
  osm: [],
  floors: 1,
  enabled: true,
  research: 'mixed',
  frame() { return { O: [0, 0], eu: [1, 0], ev: [0, 1], angle: 0, W: 0, L: 0 }; },
  build(kit, ctx) { buildSports(kit, ctx); },
};

function buildSports(kit, ctx) {
  const { campus, D } = ctx;
  for (const [name, make] of Object.entries(TEXTURES)) kit.texture(name, make);
  const subs = {};
  const site = (name, O, dir) => (subs[name] = new Kit(campus, ID, frameOf(O, dir)));
  const area = (fn) => D.areas.find(fn);
  const ground = area((a) => a.kind === 'ground');
  const track = area((a) => a.kind === 'track');
  const pool = area((a) => a.kind === 'pool' && /Swimming/.test(a.name || ''));
  const medc = area((a) => a.sport === 'cricket');
  const bb = D.areas.filter((a) => a.sport === 'basketball' && a.poly.every(([x, z]) => inPoly(x, z, ground.poly)));
  const tennis = area((a) => a.sport === 'tennis');
  const volley = area((a) => a.sport === 'volleyball');
  const clear = []; // world polygons kept free of the scattered trees

  // the football field exactly as bits-world.js buildGymkhana() lays it out (it runs after the modules)
  const tb = { minX: Math.min(...track.poly.map((p) => p[0])), maxX: Math.max(...track.poly.map((p) => p[0])), minZ: Math.min(...track.poly.map((p) => p[1])), maxZ: Math.max(...track.poly.map((p) => p[1])) };
  const fcx = (tb.minX + tb.maxX) / 2; const fcz = (tb.minZ + tb.maxZ) / 2;
  const fhw = Math.min(30, (tb.maxX - tb.minX) / 2 - 8); const fhl = Math.min(48, (tb.maxZ - tb.minZ) / 2 - 10);
  const field = { minX: fcx - fhw, maxX: fcx + fhw, minZ: fcz - fhl, maxZ: fcz + fhl };

  // G: the Gymkhana frame, origin at the track's centre, v along the ground's east edge (9 degrees east of south)
  const east = [ground.poly[2][0] - ground.poly[1][0], ground.poly[2][1] - ground.poly[1][1]];
  const G = site('G', [fcx, fcz], east);
  const T = buildTrack(site, track, field, kit, clear);
  buildBoundary(kit, site, ground, G);
  buildGymkhanaFurniture(G, T, clear);
  const pav = buildPavilion(site, G, clear);
  const C = buildCourts(site, bb, tennis, clear);
  const V = buildVolleyball(site, volley, clear);
  const P = buildPool(site, pool, clear);
  buildMedC(G, medc, clear);
  Object.assign(subs, { T, C, V, P, pav });

  // merge every site into this kit (its frame is the campus frame)
  for (const K of new Set(Object.values(subs))) {
    const m = new THREE.Matrix4().makeRotationY(K.angle).setPosition(K.O[0], 0, K.O[1]);
    for (const [layer, parts] of K.parts) {
      kit.layer(layer, () => { for (const [key, list] of parts) for (const g of list) { g.applyMatrix4(m); kit.geo(key, g); } });
    }
    K.parts.clear();
    Object.assign(kit.textures, K.textures);
    for (const l of K.lights) { const p = K.world(l.u, l.v); kit.lights.push({ u: p.x, v: p.z, y: l.y }); }
    for (const s of K.stairs) { const ps = [K.world(s.u0, s.v0), K.world(s.u1, s.v1)]; kit.stairs.push({ ...s, u0: Math.min(ps[0].x, ps[1].x), u1: Math.max(ps[0].x, ps[1].x), v0: Math.min(ps[0].z, ps[1].z), v1: Math.max(ps[0].z, ps[1].z) }); }
    for (const e of K.entrances) kit.entrances.push({ ...e, u: e.world.x, v: e.world.z });
    for (const r of K.rooms) { const ps = [K.world(r.u0, r.v0), K.world(r.u1, r.v0), K.world(r.u1, r.v1), K.world(r.u0, r.v1)]; kit.room(r.id, r.name, Math.min(...ps.map((p) => p.x)), Math.max(...ps.map((p) => p.x)), Math.min(...ps.map((p) => p.z)), Math.max(...ps.map((p) => p.z)), r.y0, r.y1, r.floor); }
    for (const l of K.navLinks) kit.navLinks.push(l);
  }
  kit.sites = subs;

  // polygon-offset ground surfaces and the pool water
  for (const layerParts of kit.parts.values()) {
    for (const key of layerParts.keys()) {
      if (kit.customMats[key]) continue;
      const mm = /^po(\d+):(.*)$/.exec(key);
      if (mm) {
        const m = kit.material(mm[2]).clone();
        Object.assign(m, { polygonOffset: true, polygonOffsetFactor: -Number(mm[1]), polygonOffsetUnits: -2 * Number(mm[1]) });
        kit.customMats[key] = m;
      } else if (key === M.water) {
        kit.customMats[key] = new THREE.MeshStandardMaterial({ color: '#2f9fd6', roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.68, depthWrite: false });
      }
    }
  }
  // nets, fences, lines and water cast no (solid) shadows
  const finish = kit.finish.bind(kit);
  kit.finish = (root) => {
    finish(root);
    for (const grp of Object.values(kit.groups)) for (const mesh of grp.children) if (NO_SHADOW.some((p) => Object.entries(kit.customMats).some(([k, m]) => m === mesh.material && k.startsWith(p)))) mesh.castShadow = false;
  };
  // the module spans the whole east campus: "inside" means inside one of its interior zones, not its bounding box
  kit.distance = (x, z, zone = null) => (zone ? Kit.prototype.distance.call(kit, x, z, zone) : Math.min(Infinity, ...kit.zones.map((zn) => Kit.prototype.distance.call(kit, x, z, zn))));
  // keep the campus's scattered trees off the track, courts, pool and pitches (buildTrees runs after the modules)
  const keep = campus.keepClear.bind(campus);
  const boxes = clear.map((poly) => ({ poly, minX: Math.min(...poly.map((p) => p[0])), maxX: Math.max(...poly.map((p) => p[0])), minZ: Math.min(...poly.map((p) => p[1])), maxZ: Math.max(...poly.map((p) => p[1])) }));
  campus.keepClear = (x, z) => keep(x, z) || boxes.some((b) => x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ && inPoly(x, z, b.poly));
}

// a local rectangle as a world polygon (for keepClear)
const worldRect = (K, u0, u1, v0, v1, pad = 2) => [[u0 - pad, v0 - pad], [u1 + pad, v0 - pad], [u1 + pad, v1 + pad], [u0 - pad, v1 + pad]].map(([u, v]) => { const p = K.world(u, v); return [p.x, p.z]; });
const localBounds = (K, poly) => { const l = poly.map(([x, z]) => K.local(x, z)); return { u0: Math.min(...l.map((p) => p[0])), u1: Math.max(...l.map((p) => p[0])), v0: Math.min(...l.map((p) => p[1])), v1: Math.max(...l.map((p) => p[1])) }; };

// ---------- athletics track and the grass infield ----------
function buildTrack(site, track, field, kit, clear) {
  // frame along the east straight; centre the oval on the OSM polygon
  const P = track.poly;
  const i0 = P.reduce((best, p, i) => (Math.hypot(P[(i + 1) % P.length][0] - p[0], P[(i + 1) % P.length][1] - p[1]) > Math.hypot(P[(best + 1) % P.length][0] - P[best][0], P[(best + 1) % P.length][1] - P[best][1]) ? i : best), 0);
  let dir = [P[(i0 + 1) % P.length][0] - P[i0][0], P[(i0 + 1) % P.length][1] - P[i0][1]];
  if (dir[1] < 0) dir = [-dir[0], -dir[1]];
  const tmp = new Kit(null, ID, frameOf([0, 0], dir));
  const b = localBounds(tmp, P);
  const O = tmp.world((b.u0 + b.u1) / 2, (b.v0 + b.v1) / 2);
  const T = site('T', [O.x, O.z], dir);
  const R = (b.u1 - b.u0) / 2; const Sx = (b.v1 - b.v0) / 2 - R;
  const Ro = R - 0.4; const LANES = 6; const LW = 1.22; const Ri = Ro - LANES * LW;
  const oval = (r, n = 40) => [...arcPts(0, Sx, r, 0, Math.PI, n), ...arcPts(0, -Sx, r, Math.PI, 2 * Math.PI, n), [r, Sx]];
  T.geo(S('t:dirt:#e6c697', 10), flatGeo(ribbonTris(oval(Ri - 0.15), oval(Ro + 0.15), 0.046), TEX_SIZE.dirt));
  T.geo(S('c:#e4e0d6', 11), flatGeo(ribbonTris(oval(Ri - 0.15), oval(Ri), 0.047), 1)); // inner kerb
  const lines = [];
  for (let k = 0; k <= LANES; k++) { const r = Ri + k * LW; lines.push(...ribbonTris(oval(r - 0.03), oval(r + 0.03), 0.048)); }
  lines.push(...segTris([Ri, Sx], [Ro, Sx], 0.08, 0.048)); // finish line at the end of the home straight
  for (let k = 0; k < LANES; k++) lines.push(...segTris([Ri + (k + 0.15) * LW, -Sx + 4 + k * 3.6], [Ri + (k + 0.85) * LW, -Sx + 4 + k * 3.6], 0.06, 0.048)); // staggered marks
  T.geo(LINE, flatGeo(lines, 1));
  T.track = { R, S: Sx, Ro, Ri };
  T.ovalDist = (u, v) => (Math.abs(v) <= Sx ? Math.abs(u) : Math.hypot(u, Math.abs(v) - Sx));
  clear.push(oval(Ro + 3, 20).map(([u, v]) => { const p = T.world(u, v); return [p.x, p.z]; }));

  // the infield grass round the (axis-aligned) football field: 1 m world cells inside the inner kerb, in row runs
  const tris = [];
  const x0 = field.minX - Math.ceil((field.minX - (O.x - R - 20)) / 1); const z0 = field.minZ - Math.ceil((field.minZ - (O.z - R - Sx - 20)) / 1);
  for (let z = z0; z < O.z + R + Sx + 20; z += 1) {
    let run = null;
    for (let x = x0; x < O.x + R + 20; x += 1) {
      const [u, v] = T.local(x + 0.5, z + 0.5);
      const inField = x + 0.5 > field.minX && x + 0.5 < field.maxX && z + 0.5 > field.minZ && z + 0.5 < field.maxZ;
      const ok = !inField && T.ovalDist(u, v) < Ri + 0.55;
      if (ok && run === null) run = x;
      if (!ok && run !== null) { tris.push(...rectTris(run, x, z, z + 1, 0.045)); run = null; }
    }
    if (run !== null) tris.push(...rectTris(run, O.x + R + 20, z, z + 1, 0.045));
  }
  kit.geo(S('t:grass:#bfe89a', 9), flatGeo(tris, TEX_SIZE.grass));

  // two training goals in the north and south D's, and the floodlights round the track
  for (const s of [-1, 1]) goal(T, 0, s * (Sx + Ri * 0.55), -s, 5, 2, 1.2);
  for (const v of [-36, -12, 12, 36]) { flood(T, -(Ro + 4.5), v, 0, v); flood(T, Ro + 9.5, v, 0, v); }
  return T;
}

// ---------- the Gymkhana boundary wall: cream, 1.1 m, pipe railing on top, six gates ----------
function buildBoundary(kit, site, ground, G) {
  const P = ground.poly; const n = P.length; const INSET = 1.5;
  const lines = P.map((a, i) => {
    const b = P[(i + 1) % n]; const d = unit([b[0] - a[0], b[1] - a[1]]);
    let nrm = [-d[1], d[0]];
    const mid = [(a[0] + b[0]) / 2 + nrm[0], (a[1] + b[1]) / 2 + nrm[1]];
    if (!inPoly(mid[0], mid[1], P)) nrm = [-nrm[0], -nrm[1]];
    return { p: [a[0] + nrm[0] * INSET, a[1] + nrm[1] * INSET], d, nrm };
  });
  const cross = (A, B) => { const den = A.d[0] * B.d[1] - A.d[1] * B.d[0]; const t = ((B.p[0] - A.p[0]) * B.d[1] - (B.p[1] - A.p[1]) * B.d[0]) / den; return [A.p[0] + A.d[0] * t, A.p[1] + A.d[1] * t]; };
  const Q = lines.map((L, i) => cross(lines[(i - 1 + n) % n], L));
  // gates: by the roads and paths that reach the ground
  const targets = [G.world(50, -165), G.world(-60, -108), [240, 470], G.world(128, -12), G.world(60, 112), [272, 342]].map((p) => (Array.isArray(p) ? p : [p.x, p.z]));
  const gates = Q.map(() => []);
  for (const [tx, tz] of targets) {
    let best = null;
    Q.forEach((a, i) => {
      const b = Q[(i + 1) % n]; const len = Math.hypot(b[0] - a[0], b[1] - a[1]); const d = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
      const s = Math.max(4, Math.min(len - 4, (tx - a[0]) * d[0] + (tz - a[1]) * d[1]));
      const dist = Math.hypot(a[0] + d[0] * s - tx, a[1] + d[1] * s - tz);
      if (!best || dist < best.dist) best = { i, s, dist };
    });
    gates[best.i].push({ at: best.s, width: 5 });
  }
  kit.gates = [];
  Q.forEach((a, i) => {
    const b = Q[(i + 1) % n]; const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const W = site(`wall${i}`, a, [b[0] - a[0], b[1] - a[1]]);
    const inward = lines[i].nrm; const inU = Math.sign(inward[0] * W.eu[0] + inward[1] * W.eu[1]); // which side of the wall is the ground
    const gs = gates[i].sort((p, q) => p.at - q.at);
    const pieces = []; let s = 0;
    for (const gt of gs) { pieces.push([s, gt.at - gt.width / 2]); s = gt.at + gt.width / 2; }
    pieces.push([s, len]);
    for (const [s0, s1] of pieces) {
      if (s1 - s0 < 0.3) continue;
      W.box(-0.12, 0.12, s0, s1, 0, 1.1, M.cream, { collide: false });
      W.box(-0.13, 0.13, s0, s1, 0, 0.25, M.dado, { collide: false });
      W.box(-0.17, 0.17, s0, s1, 1.1, 1.17, M.trim, { collide: false });
      W.col(-0.17, 0.17, s0, s1, 0, 1.75);
      const np = Math.max(1, Math.round((s1 - s0) / 3));
      for (let k = 0; k <= np; k++) {
        const v = s0 + ((s1 - s0) * k) / np;
        W.box(-0.2, 0.2, Math.max(s0, v - 0.2), Math.min(s1, v + 0.2), 0, 1.3, M.creamW, { collide: false });
        W.box(-0.22, 0.22, Math.max(s0, v - 0.22), Math.min(s1, v + 0.22), 1.3, 1.36, M.trim, { collide: false });
        if (k < np) W.box(-0.02, 0.02, v + 1.47, v + 1.51, 1.17, 1.75, M.pipe, { collide: false });
      }
      W.box(-0.025, 0.025, s0, s1, 1.71, 1.76, M.pipe, { collide: false });
      W.box(-0.015, 0.015, s0, s1, 1.44, 1.47, M.pipe, { collide: false });
    }
    for (const gt of gs) {
      for (const sd of [-1, 1]) {
        const v = gt.at + sd * (gt.width / 2 + 0.3);
        W.box(-0.3, 0.3, v - 0.3, v + 0.3, 0, 2.0, M.creamW);
        W.box(-0.36, 0.36, v - 0.36, v + 0.36, 2.0, 2.12, M.trim, { collide: false });
        W.box(-0.22, 0.22, v - 0.22, v + 0.22, 2.12, 2.4, M.cream, { collide: false });
      }
      const out = W.world(-inU * 7, gt.at); const inn = W.world(inU * 9, gt.at);
      W.navLinks.push([[out.x, out.z], [inn.x, inn.z]]);
      W.entrance(`Gymkhana gate ${kit.gates.length + 1}`, -inU * 2, gt.at, [-inU, 0]);
      kit.gates.push({ out: [out.x, out.z], in: [inn.x, inn.z], world: W.world(0, gt.at) });
    }
  });
}

// ---------- in the Gymkhana: east stands, hockey field, practice nets, skating rink, hurdles ----------
function buildGymkhanaFurniture(G, T, clear) {
  // East stands facing the home straight: five blue tiers, 50 m long, stairs at both ends.
  {
    const a = G.world(43, 25); const b = G.world(43, -25);
    const Ks = new Kit(G.campus, ID, frameOf([a.x, a.z], G.eu)); // v rises east (away from the track)
    const [uA] = Ks.local(a.x, a.z); const [uB] = Ks.local(b.x, b.z);
    stand(Ks, Math.min(uA, uB), Math.max(uA, uB), 5);
    mergeInto(G, Ks);
    clear.push(worldRect(G, 41, 48, -27, 27));
  }
  // Hockey field: 50 × 88 m of greener grass with its lines, two goals and six floodlights.
  {
    const u0 = 64; const u1 = 114; const v0 = 8; const v1 = 96; const cu = (u0 + u1) / 2;
    G.geo(S('t:grass:#a7d67e', 9), flatGeo(rectTris(u0 - 2, u1 + 2, v0 - 3, v1 + 3, 0.05), TEX_SIZE.grass));
    const L = [...outlineTris(u0, u1, v0, v1, 0.075, 0.052), ...segTris([u0, (v0 + v1) / 2], [u1, (v0 + v1) / 2], 0.075, 0.052)];
    for (const v of [v0 + 22.9, v1 - 22.9]) L.push(...segTris([u0, v], [u1, v], 0.075, 0.052));
    for (const [v, s] of [[v0, 1], [v1, -1]]) {
      L.push(...ringTris(cu - 1.83, v, 14.63 - 0.0375, 14.63 + 0.0375, s > 0 ? Math.PI / 2 : Math.PI, s > 0 ? Math.PI : 1.5 * Math.PI, 0.052));
      L.push(...ringTris(cu + 1.83, v, 14.63 - 0.0375, 14.63 + 0.0375, s > 0 ? 0 : 1.5 * Math.PI, s > 0 ? Math.PI / 2 : 2 * Math.PI, 0.052));
      L.push(...segTris([cu - 1.83, v + s * 14.63], [cu + 1.83, v + s * 14.63], 0.075, 0.052));
      L.push(...discTris(cu, v + s * 6.475, 0.1, 0, Math.PI * 2, 0.053, 12));
      goal(G, cu, v, s, 3.66, 2.14, 1.2);
      G.box(cu - 1.83, cu + 1.83, v - s * 1.2 - 0.03, v - s * 1.2 + 0.03, 0, 0.46, M.dark); // backboard
    }
    G.geo(LINE, flatGeo(L, 1));
    for (const v of [15, 52, 89]) { flood(G, 61.5, v, cu, v); flood(G, 117, v, cu, v); }
    clear.push(worldRect(G, u0, u1, v0, v1, 4));
  }
  // Cricket practice nets (green-netted enclosure): three concrete lanes, open at the bowlers' end.
  {
    const u0 = 50.5; const v0 = 32; const v1 = 56;
    for (let k = 0; k < 3; k++) slab(G, u0 + k * 3 + 0.3, u0 + k * 3 + 2.7, v0 + 0.5, v1 - 2, 0, 0.06, S('t:concrete:#b9b3a6', 9), { tile: 3 });
    for (let k = 0; k <= 3; k++) fence(G, u0 + k * 3, v0, u0 + k * 3, v1, 3.5, { key: M.netG });
    fence(G, u0, v0, u0 + 9, v0, 3.5, { key: M.netG });
    const g = new THREE.PlaneGeometry(9, v1 - v0); g.rotateX(-Math.PI / 2); g.translate(u0 + 4.5, 3.5, (v0 + v1) / 2);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 9 / TILE.netG, uv.getY(i) * (v1 - v0) / TILE.netG);
    G.geo(M.netG, g);
    for (let k = 0; k < 3; k++) for (const v of [v0 + 1.5, v0 + 1.5 + 20.12 - 1]) { // stumps at the batting end only
      if (v > v0 + 2) continue;
      for (const s of [-0.11, 0, 0.11]) G.cyl(u0 + k * 3 + 1.5 + s, v, 0, 0.018, 0.71, M.yellow, { seg: 6 });
    }
    clear.push(worldRect(G, u0, u0 + 9, v0, v1));
  }
  // Skating rink: grey tiled slab with a speed oval, low cream wall and pipe railing, two openings.
  {
    const u0 = 50; const u1 = 104; const v0 = -100; const v1 = -74; const cu = (u0 + u1) / 2; const cv = (v0 + v1) / 2;
    slab(G, u0, u1, v0, v1, 0, 0.12, S('t:tiles:#c9cac5', 9));
    const r = 7; const L = [];
    const a0 = u0 + 4 + r; const a1 = u1 - 4 - r; const b0 = v0 + 4; const b1 = v1 - 4;
    L.push(...segTris([a0, b0], [a1, b0], 0.08, 0.124), ...segTris([a0, b1], [a1, b1], 0.08, 0.124));
    L.push(...ringTris(a0, cv, (b1 - b0) / 2 - 0.04, (b1 - b0) / 2 + 0.04, Math.PI / 2, 1.5 * Math.PI, 0.124), ...ringTris(a1, cv, (b1 - b0) / 2 - 0.04, (b1 - b0) / 2 + 0.04, -Math.PI / 2, Math.PI / 2, 0.124));
    L.push(...ringTris(cu, cv, 2.96, 3.04, 0, Math.PI * 2, 0.124), ...segTris([cu, v0 + 0.5], [cu, v1 - 0.5], 0.06, 0.124));
    G.geo(LINE, flatGeo(L, 1));
    const wall = (ua, va, ub, vb, gaps) => {
      const alongU = va === vb; const len = alongU ? ub - ua : vb - va;
      const pieces = []; let s = 0;
      for (const gp of gaps) { pieces.push([s, gp - 1]); s = gp + 1; }
      pieces.push([s, len]);
      for (const [p, q] of pieces) {
        const box = (y0, y1, key, t = 0.12) => (alongU ? G.box(ua + p, ua + q, va - t, va + t, y0, y1, key, { collide: false }) : G.box(ua - t, ua + t, va + p, va + q, y0, y1, key, { collide: false }));
        box(0, 0.6, M.cream); box(0.6, 0.66, M.trim, 0.15); box(1.06, 1.1, M.pipe, 0.025);
        for (let k = 0; k <= Math.round((q - p) / 2); k++) { const s1 = p + ((q - p) * k) / Math.max(1, Math.round((q - p) / 2)); if (alongU) G.box(ua + s1 - 0.02, ua + s1 + 0.02, va - 0.02, va + 0.02, 0.66, 1.08, M.pipe, { collide: false }); else G.box(ua - 0.02, ua + 0.02, va + s1 - 0.02, va + s1 + 0.02, 0.66, 1.08, M.pipe, { collide: false }); }
        if (alongU) G.col(ua + p, ua + q, va - 0.15, va + 0.15, 0, 1.1); else G.col(ua - 0.15, ua + 0.15, va + p, va + q, 0, 1.1);
      }
    };
    wall(u0, v0, u1, v0, []); wall(u0, v1, u1, v1, [27]); wall(u0, v0, u0, v1, [13]); wall(u1, v0, u1, v1, []);
    flood(G, u0 - 2, v0 + 2, cu, cv, 12, 3); flood(G, u1 + 2, v1 - 2, cu, cv, 12, 3);
    G.entrance('Skating rink (west opening)', u0 - 1.5, cv, [-1, 0]);
    clear.push(worldRect(G, u0, u1, v0, v1));
  }
  // a stack of hurdles and a roller by the pavilion
  for (let k = 0; k < 6; k++) {
    const v = -44 + k * 0.25; const y = 0;
    G.box(46.5, 46.55, v, v + 0.04, y, 0.84, M.white, { collide: false }); G.box(47.65, 47.7, v, v + 0.04, y, 0.84, M.white, { collide: false });
    G.box(46.5, 47.7, v, v + 0.04, 0.76, 0.84, k % 2 ? M.white : M.dark, { collide: false });
  }
  G.col(46.4, 47.8, -44.1, -42.5, 0, 0.84);
}

// copy one kit's geometry into another (both still building), transforming between their frames
function mergeInto(dst, src) {
  const m = new THREE.Matrix4().makeRotationY(-dst.angle).multiply(new THREE.Matrix4().makeTranslation(src.O[0] - dst.O[0], 0, src.O[1] - dst.O[1])).multiply(new THREE.Matrix4().makeRotationY(src.angle));
  for (const [layer, parts] of src.parts) dst.layer(layer, () => { for (const [key, list] of parts) for (const g of list) { g.applyMatrix4(m); dst.geo(key, g); } });
  src.parts.clear();
  Object.assign(dst.textures, src.textures);
  for (const s of src.stairs) { const a = dst.local(...xz(src.world(s.u0, s.v0))); const b = dst.local(...xz(src.world(s.u1, s.v1))); dst.stairs.push({ ...s, u0: Math.min(a[0], b[0]), u1: Math.max(a[0], b[0]), v0: Math.min(a[1], b[1]), v1: Math.max(a[1], b[1]) }); }
  for (const e of src.entrances) { const [u, v] = dst.local(e.world.x, e.world.z); dst.entrances.push({ ...e, u, v }); }
  dst.navLinks.push(...src.navLinks);
}
const xz = (p) => [p.x, p.z];

// ---------- the Gymkhana pavilion: single storey, colonnaded verandah facing the track ----------
// Local frame: u 0 (verandah front) .. 9 (back wall), v 0..24 along the track; floor on a 0.45 m plinth.
function buildPavilion(site, G, clear) {
  const o = G.world(50, -71);
  const K = site('pav', [o.x, o.z], G.ev);
  const F = 0.45; const CEIL = 3.85; const ROOF = 3.95; const L = 24;
  // plinth, front steps, verandah
  slab(K, 0, 3, 0, L, 0, F, M.kota);
  slab(K, 3, 9, 0, L, 0, F, M.terrazzo);
  slab(K, -0.3, 0, 0, L, 0, 0.3, M.kota); slab(K, -0.6, -0.3, 0, L, 0, 0.15, M.kota);
  K.box(-0.62, 9.02, -0.02, L + 0.02, 0, 0.12, M.dado, { collide: false }); // plinth band
  K.stairs.push({ name: 'pavilion front steps', u0: -0.6, u1: 0, v0: 0, v1: L, y0: 0, y1: F });
  // colonnade
  for (let i = 0; i <= 6; i++) {
    const v = 0.4 + (i * (L - 0.8)) / 6;
    slab(K, 0.1, 0.5, v - 0.2, v + 0.2, F, ROOF, M.creamW, { walkable: false });
    K.box(0.04, 0.56, v - 0.26, v + 0.26, F, F + 0.25, M.trim, { collide: false });
    K.box(0.04, 0.56, v - 0.26, v + 0.26, ROOF - 0.3, ROOF - 0.18, M.trim, { collide: false });
  }
  // walls (cream outside, the rooms' faces are the same plaster)
  const doors = [{ at: 4, width: 1.1 }, { at: 13, width: 1.6 }, { at: 21, width: 1.0 }];
  const wins = [1.8, 6.3, 10.3, 15.8, 23];
  K.wall(3, 0, 3, L, F, ROOF, M.cream, { thick: 0.25, openings: [...doors.map((d) => ({ ...d, top: 2.2 })), ...wins.map((v) => ({ at: v, width: 1.2, bottom: 0.9, top: 2.1 }))] });
  K.wall(9, 0, 9, L, 0, ROOF, M.cream, { thick: 0.25, openings: [4, 13, 21].map((v) => ({ at: v, width: 1.4, bottom: 2.45, top: 3.1 })) });
  K.wall(3, 0, 9.125, 0, 0, ROOF, M.cream, { thick: 0.25 });
  K.wall(3, L, 9.125, L, 0, ROOF, M.cream, { thick: 0.25 });
  K.box(8.99, 9.15, 0, L, 0, 0.9, M.dado, { collide: false });
  for (const d of doors) K.door(false, d.at, 3, F, d.width, { thick: 0.25, side: 1, height: 2.2 });
  for (const v of wins) { K.window(false, v, 3, F + 0.9, 1.2, 1.2, { frame: 'c:#3f5f52' }); for (let k = 1; k < 6; k++) K.box(2.83, 2.86, v - 0.6 + k * 0.2 - 0.01, v - 0.6 + k * 0.2 + 0.01, F + 0.9, F + 2.1, M.grey, { collide: false }); }
  for (const v of [4, 13, 21]) K.window(false, v, 9, F + 2.0, 1.4, 0.65, { frame: 'c:#3f5f52' });
  roofEdge(K, 0, 9, 0, L, ROOF, { over: 0.6 });
  // raised name panel over the middle bays
  K.box(-0.75, -0.45, 8, 16, ROOF + 0.95, ROOF + 1.75, M.cream, { collide: false });
  K.box(-0.8, -0.4, 7.9, 16.1, ROOF + 1.75, ROOF + 1.83, M.trim, { collide: false });
  K.sign('BITS GYMKHANA', -0.76, 12, ROOF + 1.0, [-1, 0], { width: 7.4, height: 0.7, bg: '#ead7ab', fg: '#7a2622' });
  for (const [v, t] of [[4, 'Gymkhana Office'], [13, 'Sports Store'], [21, 'Changing Room']]) K.sign(t, 2.86, v, F + 2.35, [-1, 0], { width: 1.8, height: 0.3, bg: '#2f3a5a', fg: '#f4ecd6', font: 'bold 56px sans-serif' });
  // verandah: benches, tube lights, a notice board
  for (const v of [7, 17]) { K.box(1.6, 2.0, v - 1.2, v + 1.2, F + 0.42, F + 0.47, M.wood); for (const s of [-1, 1]) K.box(1.65, 1.95, v + s * 1.05 - 0.04, v + s * 1.05 + 0.04, F, F + 0.42, M.grey, { collide: false }); }
  for (const v of [6, 12, 18]) K.tubeLight(1.6, v, ROOF, [0, 1]);
  K.board(2.86, 9.2, F, [-1, 0], { w: 1.4, h: 1.0, key: 'c:#6b4f35', frame: 'c:#3b2f22' });
  K.partitions = [8, 18];
  // interior (zone): partitions, ceilings, lights, furniture
  K.layer('pavilion', () => {
    for (const v of [8, 18]) K.box(3.125, 8.875, v - 0.075, v + 0.075, F, CEIL, M.creamW);
    for (const [v0, v1] of [[0.125, 7.925], [8.075, 17.925], [18.075, 23.875]]) {
      K.box(3.125, 8.875, v0, v1, CEIL, CEIL + 0.05, M.ceil, { collide: false });
      K.box(3.125, 3.2, v0, v1, F, F + 0.9, M.dado, { collide: false }); K.box(8.8, 8.875, v0, v1, F, F + 0.9, M.dado, { collide: false });
      K.tubeLight(6, (v0 + v1) / 2 - 1.5, CEIL, [0, 1]); K.tubeLight(6, (v0 + v1) / 2 + 1.5, CEIL, [0, 1]);
      K.fan(6, (v0 + v1) / 2, CEIL);
    }
    // office: desk, chairs, almirah, trophy cabinet, notice board
    K.desk(6.2, 4, F, [-1, 0], { w: 1.5, d: 0.75 }); K.chair(6.9, 4, F, [-1, 0]); K.chair(5.1, 3.5, F, [1, 0]); K.chair(5.1, 4.5, F, [1, 0]);
    slab(K, 8.3, 8.85, 0.6, 1.6, F, F + 1.9, M.almirah, { walkable: false });
    slab(K, 7.5, 8.85, 6.0, 7.8, F, F + 0.8, M.wood, { walkable: false });
    K.box(7.6, 8.8, 6.1, 7.7, F + 0.8, F + 2.0, M.glass, { collide: false });
    for (const [u, v, h] of [[8.0, 6.4, 0.35], [8.3, 6.9, 0.45], [8.0, 7.35, 0.3], [8.4, 6.4, 0.25]]) { K.cyl(u, v, F + 0.8, 0.07, 0.06, M.gold, { seg: 8 }); K.cyl(u, v, F + 0.86, 0.03, h * 0.5, M.gold, { seg: 6 }); K.cyl(u, v, F + 0.86 + h * 0.5, 0.06, h * 0.5, M.gold, { seg: 8, rTop: 0.1 }); }
    K.board(8.86, 4, F, [-1, 0], { w: 2.2, h: 1.0, key: 'c:#6b4f35', frame: 'c:#3b2f22' });
    // store: steel racks with balls, cones, bags; a stack of hurdles
    for (const v0 of [8.6, 14.2]) {
      slab(K, 8.25, 8.85, v0, v0 + 2.6, F, F + 2.0, M.almirah, { walkable: false, collide: false });
      K.col(8.25, 8.85, v0, v0 + 2.6, F, F + 2.0);
      for (let s = 0; s < 4; s++) {
        const y = F + 0.12 + s * 0.48;
        K.box(8.2, 8.85, v0, v0 + 2.6, y, y + 0.03, M.steel, { collide: false });
        for (let k = 0; k < 5; k++) {
          const g = new THREE.SphereGeometry(s % 2 ? 0.12 : 0.11, 10, 8); g.translate(8.5, y + 0.15, v0 + 0.3 + k * 0.5);
          K.geo(s === 1 ? M.bball : s === 3 ? M.red : M.ball, g);
        }
      }
    }
    for (let k = 0; k < 8; k++) { const g = new THREE.ConeGeometry(0.12, 0.3, 10); g.translate(3.6 + (k % 4) * 0.3, F + 0.15 + Math.floor(k / 4) * 0.16, 17.3); K.geo(M.cone, g); }
    for (const v of [10.5, 12]) slab(K, 4.2, 5.0, v, v + 0.8, F, F + 0.35, 'c:#24406e', { walkable: false }); // kit bags
    K.box(3.4, 4.1, 9.5, 9.6, F, F + 1.1, M.white, { collide: false }); // folded nets
    // changing room: lockers and a bench
    for (let k = 0; k < 5; k++) slab(K, 8.4, 8.85, 18.4 + k * 0.62, 18.98 + k * 0.62, F, F + 1.9, M.locker, { walkable: false });
    K.box(5.4, 5.8, 19, 23, F + 0.42, F + 0.47, M.wood, { collide: false }); K.col(5.4, 5.8, 19, 23, F, F + 0.47);
  });
  K.room('pavilionOffice', 'Gymkhana Office', 3.125, 8.875, 0.125, 7.925, F, CEIL);
  K.room('sportsStore', 'Sports Store', 3.125, 8.875, 8.075, 17.925, F, CEIL);
  K.room('pavilionChanging', 'Changing Room', 3.125, 8.875, 18.075, 23.875, F, CEIL);
  K.entrance('Gymkhana pavilion', -1.5, 12, [-1, 0]);
  const a = K.world(-2, 12); const b = K.world(1.5, 12); K.navLinks.push([[a.x, a.z], [b.x, b.z]]);
  clear.push(worldRect(K, -1, 10, -1, L + 1));
  K.F = F;
  return K;
}

// ---------- basketball and tennis courts ----------
function buildCourts(site, bb, tennis, clear) {
  const A = [...bb].sort((p, q) => Math.min(...p.poly.map((x) => x[0])) - Math.min(...q.poly.map((x) => x[0])));
  const west = A[0].poly; const e0 = west.reduce((m, p) => (p[0] + p[1] < m[0] + m[1] ? p : m));
  // frame along the courts' long side (12 degrees east of south), origin at the west court's NW corner
  const side = west.map((p, i) => [p, west[(i + 1) % west.length]]).map(([a, b]) => [b[0] - a[0], b[1] - a[1]]).sort((p, q) => Math.hypot(...q) - Math.hypot(...p))[0];
  const dir = side[1] < 0 ? [-side[0], -side[1]] : side;
  const C = site('C', e0, dir);
  const rects = A.map((a) => localBounds(C, a.poly));
  const tr = localBounds(C, tennis.poly);
  const bu0 = Math.min(...rects.map((r) => r.u0)); const bu1 = Math.max(...rects.map((r) => r.u1));
  const bv0 = Math.min(...rects.map((r) => r.v0)); const bv1 = Math.max(...rects.map((r) => r.v1));
  const ju = (bu1 + tr.u0) / 2; // the line between basketball and tennis
  // slabs: green run-off for basketball, olive for tennis
  slab(C, bu0 - 0.4, ju, bv0 - 0.4, bv1 + 0.4, 0, 0.1, S('c:#4f8c5c', 9), { tile: 2 });
  slab(C, ju, tr.u1 + 0.4, tr.v0 - 0.4, tr.v1 + 0.4, 0, 0.1, S('c:#7d8c68', 9), { tile: 2 });
  const Y = 0.101; const BL = []; const BF = []; const KEY = [];
  const courts = rects.map((r) => ({ cu: (r.u0 + r.u1) / 2, cv: (r.v0 + r.v1) / 2 }));
  for (const { cu, cv } of courts) {
    BF.push(...rectTris(cu - 7.5, cu + 7.5, cv - 14, cv + 14, Y));
    BL.push(...outlineTris(cu - 7.5, cu + 7.5, cv - 14, cv + 14, 0.05, Y + 0.002), ...segTris([cu - 7.5, cv], [cu + 7.5, cv], 0.05, Y + 0.002));
    BL.push(...ringTris(cu, cv, 1.775, 1.825, 0, Math.PI * 2, Y + 0.002, 40));
    KEY.push(...discTris(cu, cv, 1.775, Math.PI / 2, 1.5 * Math.PI, Y + 0.001, 20));
    for (const s of [-1, 1]) {
      const base = cv + s * 14; const ft = base - s * 5.8;
      KEY.push(...rectTris(cu - 2.45, cu + 2.45, Math.min(base, ft), Math.max(base, ft), Y + 0.001));
      BL.push(...outlineTris(cu - 2.45, cu + 2.45, Math.min(base, ft), Math.max(base, ft), 0.05, Y + 0.002));
      BL.push(...ringTris(cu, ft, 1.775, 1.825, s > 0 ? Math.PI : 0, s > 0 ? 2 * Math.PI : Math.PI, Y + 0.002, 24)); // free-throw semicircle (court side)
      const bk = base - s * 1.575; const a = Math.asin(6.6 / 6.75);
      BL.push(...ringTris(cu, bk, 6.725, 6.775, s > 0 ? -Math.PI / 2 - a : Math.PI / 2 - a, s > 0 ? -Math.PI / 2 + a : Math.PI / 2 + a, Y + 0.002, 40));
      const vEnd = bk - s * 6.75 * Math.cos(a);
      for (const k of [-1, 1]) BL.push(...segTris([cu + k * 6.6, base], [cu + k * 6.6, vEnd], 0.05, Y + 0.002));
      hoop(C, cu, base, -s);
    }
  }
  C.geo(S('c:#6aa8d8', 10), flatGeo(BF, 2)); C.geo(S('c:#8e3a32', 11), flatGeo(KEY, 2)); C.geo(LINE, flatGeo(BL, 1));
  // tennis: two courts side by side in the tennis rectangle
  const TL = []; const TF = [];
  const tw = (tr.u1 - ju) / 2;
  for (let k = 0; k < 2; k++) {
    const cu = ju + tw * (k + 0.5); const cv = (tr.v0 + tr.v1) / 2;
    TF.push(...rectTris(cu - 5.485, cu + 5.485, cv - 11.885, cv + 11.885, Y));
    TL.push(...outlineTris(cu - 5.485, cu + 5.485, cv - 11.885, cv + 11.885, 0.05, Y + 0.002));
    for (const s of [-1, 1]) {
      TL.push(...segTris([cu + s * 4.115, cv - 11.885], [cu + s * 4.115, cv + 11.885], 0.05, Y + 0.002));
      TL.push(...segTris([cu - 4.115, cv + s * 6.4], [cu + 4.115, cv + s * 6.4], 0.05, Y + 0.002));
      TL.push(...segTris([cu, cv + s * 11.885], [cu, cv + s * 11.785], 0.05, Y + 0.002));
    }
    TL.push(...segTris([cu, cv - 6.4], [cu, cv + 6.4], 0.05, Y + 0.002));
    // net and posts
    for (const s of [-1, 1]) C.cyl(cu + s * 6.4, cv, 0, 0.04, 1.07, 'c:#2f5a3a', { seg: 8, collide: true });
    vquad(C, [cu - 6.4, cv], [cu + 6.4, cv], 0.12, 1.0, M.net, TILE.net);
    C.box(cu - 6.4, cu + 6.4, cv - 0.025, cv + 0.025, 0.98, 1.05, M.white, { collide: false });
    C.col(cu - 6.4, cu + 6.4, cv - 0.05, cv + 0.05, 0, 1.05);
    for (const s of [-1, 1]) { C.box(cu + s * 7.6 - 0.3, cu + s * 7.6 + 0.3, cv - 0.3, cv + 0.3, 0.1, 0.55, M.wood, { collide: false }); } // umpire-side benches
  }
  C.geo(S('c:#4b88c0', 10), flatGeo(TF, 2)); C.geo(LINE, flatGeo(TL, 1));
  // the blue wall between the basketball and tennis blocks: 2.5 m concrete, mesh above
  slab(C, ju - 0.12, ju + 0.12, tr.v0 - 0.4, tr.v1 + 0.4, 0, 2.5, M.blueWall, { walkable: false });
  C.box(ju - 0.15, ju + 0.15, tr.v0 - 0.4, tr.v1 + 0.4, 2.5, 2.56, M.trim, { collide: false });
  vquad(C, [ju, tr.v0 - 0.4], [ju, tr.v1 + 0.4], 2.56, 3.7, M.chain, TILE.chain);
  for (let v = tr.v0 - 0.4; v <= tr.v1 + 0.41; v += (tr.v1 - tr.v0 + 0.8) / 12) C.cyl(ju, v, 2.5, 0.04, 1.25, M.post, { seg: 6 });
  // chain-link round the tennis courts (gate on the south side)
  const tu1 = tr.u1 + 0.4; const tv0 = tr.v0 - 0.4; const tv1 = tr.v1 + 0.4;
  fence(C, ju, tv0, tu1, tv0, 3.6); fence(C, tu1, tv0, tu1, tv1, 3.6);
  fence(C, ju, tv1, tu1, tv1, 3.6, { gaps: [{ at: (tu1 - ju) / 2, width: 1.6 }] });
  C.entrance('Tennis courts gate', (ju + tu1) / 2, tv1 + 1.5, [0, 1]);
  // basketball: low pipe railing on the north and west (gaps), jaali parapet and the stand on the south
  const rail = (u0, v0, u1, v1) => C.rail(u0, v0, u1, v1, 0.1, M.pipe, { h: 1.0 });
  rail(bu0 - 0.4, bv0 - 0.4, (bu0 + ju) / 2 - 1.2, bv0 - 0.4); rail((bu0 + ju) / 2 + 1.2, bv0 - 0.4, ju - 0.15, bv0 - 0.4);
  rail(bu0 - 0.4, bv0 - 0.4, bu0 - 0.4, (bv0 + bv1) / 2 - 1.2); rail(bu0 - 0.4, (bv0 + bv1) / 2 + 1.2, bu0 - 0.4, bv1 + 0.4);
  // south: jaali parapet with three openings, then five blue tiers
  const pv = bv1 + 0.55; const openings = [bu0 + 2, (bu0 + ju) / 2, ju - 3];
  let s0 = bu0 - 0.4;
  for (const o of [...openings, ju + 1e3]) {
    const s1 = Math.min(o - 1.0, ju - 0.15);
    if (s1 - s0 > 0.2) {
      vquad(C, [s0, pv], [s1, pv], 0, 1.0, M.jaali, TILE.jaali);
      C.box(s0, s1, pv - 0.08, pv + 0.08, 1.0, 1.08, M.trim, { collide: false });
      C.box(s0, s1, pv - 0.08, pv + 0.08, 0, 0.12, M.conc, { collide: false });
      C.col(s0, s1, pv - 0.1, pv + 0.1, 0, 1.08);
      for (const p of [s0, s1]) C.box(p - 0.12, p + 0.12, pv - 0.12, pv + 0.12, 0, 1.15, M.creamW, { collide: false });
    }
    s0 = o + 1.0;
  }
  const sv = pv + 0.35;
  const Ks = new Kit(C.campus, ID, frameOf(xz(C.world(0, sv)), C.ev));
  const [su0] = Ks.local(...xz(C.world(bu0 + 1.6, sv))); const [su1] = Ks.local(...xz(C.world(ju - 1.8, sv)));
  stand(Ks, su0, su1, 5);
  mergeInto(C, Ks);
  // floodlights: north edge and behind the stand / tennis fence
  for (const u of [bu0 + 2, (bu0 + ju) / 2 + 2, ju + tw * 0.5, ju + tw * 1.5]) flood(C, u, bv0 - 2.2, u, (bv0 + bv1) / 2, 16, 3);
  for (const u of [bu0 + 6, ju - 6]) flood(C, u, sv + 5.2, u, (bv0 + bv1) / 2, 16, 3);
  for (const u of [ju + tw * 0.5, ju + tw * 1.5]) flood(C, u, tv1 + 2, u, (tr.v0 + tr.v1) / 2, 16, 3);
  clear.push(worldRect(C, bu0, tu1, Math.min(bv0, tv0), sv + 6, 3));
  C.courts = { bu0, bu1: ju, bv0, bv1, tu0: ju, tu1, tv0, tv1, pv, sv, openings, tw };
  return C;
}

// Single-pole basketball goal at the baseline v = base, the court lying towards [0, dir].
function hoop(C, cu, base, dir) {
  const pv = base - dir * 1.0; // post 1 m behind the baseline
  slab(C, cu - 0.11, cu + 0.11, pv - 0.11, pv + 0.11, 0, 3.55, 'c:#1f4f8a', { walkable: false });
  C.box(cu - 0.16, cu + 0.16, pv - 0.16, pv + 0.16, 0.1, 1.9, 'c:#2a63a8', { collide: false }); // padding
  const bv = base + dir * 1.2; // backboard face 1.2 m inside the baseline
  C.box(cu - 0.06, cu + 0.06, Math.min(pv, bv), Math.max(pv, bv), 3.3, 3.42, 'c:#1f4f8a', { collide: false }); // arm
  C.box(cu - 0.9, cu + 0.9, Math.min(bv, bv - dir * 0.04), Math.max(bv, bv - dir * 0.04), 2.9, 3.95, M.white, { collide: false });
  const f = bv + dir * 0.003; // painted target square and border
  for (const [u0, u1, y0, y1] of [[-0.9, 0.9, 2.9, 2.95], [-0.9, 0.9, 3.9, 3.95], [-0.9, -0.85, 2.9, 3.95], [0.85, 0.9, 2.9, 3.95], [-0.295, 0.295, 3.05, 3.1], [-0.295, 0.295, 3.45, 3.5], [-0.295, -0.245, 3.05, 3.5], [0.245, 0.295, 3.05, 3.5]]) C.box(cu + u0, cu + u1, Math.min(f, f + dir * 0.004), Math.max(f, f + dir * 0.004), y0, y1, 'c:#c0392b', { collide: false });
  const rv = base + dir * 1.575;
  const rim = new THREE.TorusGeometry(0.225, 0.012, 6, 20); rim.rotateX(Math.PI / 2); rim.translate(cu, 3.05, rv); C.geo(M.orange, rim);
  C.box(cu - 0.08, cu + 0.08, Math.min(bv, rv - dir * 0.2), Math.max(bv, rv - dir * 0.2), 3.02, 3.05, M.orange, { collide: false });
  const net = new THREE.CylinderGeometry(0.22, 0.14, 0.42, 12, 1, true); net.translate(cu, 2.83, rv);
  const uv = net.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 1.4 / TILE.netW, uv.getY(i) * 0.42 / TILE.netW);
  C.geo(M.netW, net);
}

// ---------- sand volleyball courts in a chain-link cage ----------
function buildVolleyball(site, volley, clear) {
  const P = volley.poly;
  const west = P.map((p, i) => [p, P[(i + 1) % P.length]]).filter(([a, b]) => Math.abs(b[1] - a[1]) > Math.abs(b[0] - a[0])).sort((p, q) => p[0][0] - q[0][0])[0];
  let dir = [west[1][0] - west[0][0], west[1][1] - west[0][1]]; if (dir[1] < 0) dir = [-dir[0], -dir[1]];
  const tmp = new Kit(null, ID, frameOf([0, 0], dir)); const b0 = localBounds(tmp, P);
  const o = tmp.world(b0.u0, b0.v0);
  const V = site('V', [o.x, o.z], dir);
  const U = b0.u1 - b0.u0; const Lv = b0.v1 - b0.v0;
  slab(V, 0.2, U - 0.2, 0.2, Lv - 0.2, 0, 0.08, S('t:dirt:#e3cb98', 9), { tile: TEX_SIZE.dirt });
  const L = []; const cv = Lv / 2; const gap = (U - 27) / 4;
  for (let k = 0; k < 3; k++) {
    const cu = gap + 4.5 + k * (9 + gap);
    L.push(...outlineTris(cu - 4.5, cu + 4.5, cv - 9, cv + 9, 0.05, 0.082));
    for (const s of [-1, 1]) {
      V.cyl(cu + s * 5.0, cv, 0, 0.05, 2.55, M.steel, { seg: 8, collide: true });
      for (const y of [0.4, 1.0]) V.box(cu + s * 5.0 - 0.03, cu + s * 5.0 + 0.03, cv - 0.15, cv + 0.15, y, y + 0.04, M.steel, { collide: false });
    }
    vquad(V, [cu - 4.9, cv], [cu + 4.9, cv], 1.43, 2.43, M.net, TILE.net);
    V.box(cu - 4.9, cu + 4.9, cv - 0.02, cv + 0.02, 2.38, 2.44, M.white, { collide: false });
    V.box(cu - 4.9, cu + 4.9, cv - 0.02, cv + 0.02, 1.41, 1.45, M.white, { collide: false });
    V.col(cu - 4.9, cu + 4.9, cv - 0.05, cv + 0.05, 1.4, 2.45);
  }
  V.geo(LINE, flatGeo(L, 1));
  fence(V, 0, 0, U, 0, 3.5); fence(V, U, 0, U, Lv, 3.5); fence(V, 0, Lv, U, Lv, 3.5);
  fence(V, 0, 0, 0, Lv, 3.5, { gaps: [{ at: Lv / 2 - 6, width: 1.6 }] });
  V.entrance('Volleyball courts gate', -1.5, Lv / 2 - 6, [-1, 0]);
  flood(V, -2.5, 2, U / 2, Lv / 2, 14, 3); flood(V, U + 2.5, Lv - 2, U / 2, Lv / 2, 14, 3);
  clear.push(worldRect(V, 0, U, 0, Lv));
  V.size = { U, L: Lv };
  return V;
}

// ---------- swimming pool: 25 × 12.5 m, six lanes, tiled deck, perimeter wall and a single-storey changing block ----------
// Local frame (fitted to the OSM enclosure): u 0..32.4 east, v 0..41.4 south. The block fronts the road on the south.
function buildPool(site, pool, clear) {
  const P = pool.poly;
  const dir = [P[3][0] - P[0][0], P[3][1] - P[0][1]];
  const tmp = new Kit(null, ID, frameOf([0, 0], dir)); const b = localBounds(tmp, P);
  const o = tmp.world(b.u0 - 0.1, b.v0 - 0.1);
  const K = site('P', [o.x, o.z], dir);
  const U = b.u1 - b.u0 + 0.2; const Lv = b.v1 - b.v0 + 0.2; // enclosure (covers the OSM polygon)
  const BV = Lv - 8.4; // the block's back (deck side) wall line
  const DECK = 0.15; const CEIL = 3.75; const ROOF = 3.9;
  const cu = U / 2; const W0 = cu - 6.25; const W1 = cu + 6.25; const P0 = 4; const P1 = 29; // water
  const floorY = (v) => (v < 11 ? -2.0 : v > 19 ? -1.2 : -2.0 + ((v - 11) / 8) * 0.8);
  K.pit([[W0, P0], [W1, P0], [W1, P1], [W0, P1]], -2.2);
  // deck (round the coping) and the coping
  const deck = S(M.tileDeck, 9);
  slab(K, 0, U, 0, P0 - 0.3, 0, DECK, deck); slab(K, 0, U, P1 + 0.3, BV, 0, DECK, deck);
  slab(K, 0, W0 - 0.3, P0 - 0.3, P1 + 0.3, 0, DECK, deck); slab(K, W1 + 0.3, U, P0 - 0.3, P1 + 0.3, 0, DECK, deck);
  slab(K, W0 - 0.3, W1 + 0.3, P0 - 0.3, P0, 0, 0.2, M.coping); slab(K, W0 - 0.3, W1 + 0.3, P1, P1 + 0.3, 0, 0.2, M.coping);
  slab(K, W0 - 0.3, W0, P0, P1, 0, 0.2, M.coping); slab(K, W1, W1 + 0.3, P0, P1, 0, 0.2, M.coping);
  // tank: tiled walls below the coping, sloping floor (2.0 m deep end north, 1.2 m shallow end south)
  for (const [u0, u1, v0, v1] of [[W0 - 0.3, W1 + 0.3, P0 - 0.3, P0], [W0 - 0.3, W1 + 0.3, P1, P1 + 0.3], [W0 - 0.3, W0, P0, P1], [W1, W1 + 0.3, P0, P1]]) slab(K, u0, u1, v0, v1, -2.2, 0, M.tileBlue, { collide: false });
  K.box(W0 - 0.01, W1 + 0.01, P0 - 0.01, P1 + 0.01, -0.08, -0.0, 'c:#1d4f7a', { collide: false }); // dark tile band at the waterline (behind the water)
  const ft = []; const steps = [P0, 11, 19, P1];
  for (let i = 0; i < 3; i++) ft.push(...quadTris([W0, steps[i]], [W1, steps[i]], [W1, steps[i + 1]], [W0, steps[i + 1]], 0, floorY(steps[i]), floorY(steps[i]), floorY(steps[i + 1]), floorY(steps[i + 1])));
  K.geo(M.tileFloor, flatGeo(ft, 2));
  const st = [];
  for (let k = 0; k < 6; k++) {
    const u = W0 + (k + 0.5) * (12.5 / 6);
    for (let v = P0 + 2; v < P1 - 2; v += 1) { const v2 = Math.min(P1 - 2, v + 1); st.push(...quadTris([u - 0.125, v], [u + 0.125, v], [u + 0.125, v2], [u - 0.125, v2], 0, floorY(v) + 0.01, floorY(v) + 0.01, floorY(v2) + 0.01, floorY(v2) + 0.01)); }
    for (const v of [P0 + 2, P1 - 2]) st.push(...quadTris([u - 0.5, v - 0.125], [u + 0.5, v - 0.125], [u + 0.5, v + 0.125], [u - 0.5, v + 0.125], 0, floorY(v) + 0.012, floorY(v) + 0.012, floorY(v) + 0.012, floorY(v) + 0.012));
  }
  K.geo(S(M.laneBlue, 3), flatGeo(st, 1));
  K.geo(M.water, flatGeo(rectTris(W0, W1, P0, P1, -0.15), 4));
  K.col(W0, W1, P0, P1, -2.2, 1.1); // the water: no walking in (you can swim when the club lets you)
  // lane ropes (red near the walls, blue and white between) and backstroke flags
  for (let k = 1; k < 6; k++) {
    const u = W0 + k * (12.5 / 6);
    for (let v = P0, i = 0; v < P1 - 0.01; v += 0.25, i++) {
      const key = v < P0 + 5 || v > P1 - 5 ? M.ropeRed : i % 2 ? M.white : M.ropeBlue;
      K.box(u - 0.05, u + 0.05, v + 0.02, v + 0.23, -0.19, -0.1, key, { collide: false });
    }
  }
  for (const v of [P0 + 5, P1 - 5]) {
    for (const s of [-1, 1]) K.cyl(cu + s * 7.1, v, DECK, 0.03, 1.75, M.steel, { seg: 6 });
    K.box(cu - 7.1, cu + 7.1, v - 0.01, v + 0.01, 1.86, 1.88, M.white, { collide: false });
    for (let i = 0; i < 28; i++) { const u = cu - 6.75 + i * 0.5; K._rot(u, v, [0, 1], [[-0.12, 0.12, 1.62, 1.86, -0.005, 0.005, i % 3 === 0 ? M.red : i % 3 === 1 ? M.white : M.ropeBlue]]); }
  }
  // starting blocks at the shallow (south) end, ladders at the four corners
  for (let k = 0; k < 6; k++) {
    const u = W0 + (k + 0.5) * (12.5 / 6);
    slab(K, u - 0.25, u + 0.25, P1 + 0.32, P1 + 0.95, DECK, 0.75, M.coping, { walkable: false });
    K.box(u - 0.26, u + 0.26, P1 + 0.3, P1 + 0.35, 0.78, 0.82, M.red, { collide: false });
    K.sign(String(k + 1), u, P1 + 0.959, 0.4, [0, 1], { width: 0.3, height: 0.25, bg: '#1d3f8a', fg: '#ffffff', font: 'bold 60px sans-serif' });
  }
  for (const [u, v, s] of [[W0, P0 + 1.5, 1], [W1, P0 + 1.5, -1], [W0, P1 - 1.5, 1], [W1, P1 - 1.5, -1]]) {
    for (const dv of [-0.25, 0.25]) {
      K.box(u + s * 0.1 - 0.02, u + s * 0.1 + 0.02, v + dv - 0.02, v + dv + 0.02, -1.0, 0.95, M.steel, { collide: false });
      K.box(Math.min(u - s * 0.4, u + s * 0.1), Math.max(u - s * 0.4, u + s * 0.1), v + dv - 0.02, v + dv + 0.02, 0.92, 0.96, M.steel, { collide: false });
      K.box(u - s * 0.42 - 0.02, u - s * 0.42 + 0.02, v + dv - 0.02, v + dv + 0.02, DECK, 0.95, M.steel, { collide: false });
    }
    for (const y of [-0.9, -0.6, -0.3]) K.box(Math.min(u + s * 0.02, u + s * 0.12), Math.max(u + s * 0.02, u + s * 0.12), v - 0.25, v + 0.25, y, y + 0.03, M.steel, { collide: false });
  }
  // perimeter wall 2.2 m (north, west, east)
  const wallH = 2.2;
  slab(K, 0, U, 0, 0.23, DECK, wallH, M.cream, { walkable: false }); slab(K, 0, 0.23, 0.23, BV, DECK, wallH, M.cream, { walkable: false }); slab(K, U - 0.23, U, 0.23, BV, DECK, wallH, M.cream, { walkable: false });
  for (const [u0, u1, v0, v1] of [[-0.04, U + 0.04, -0.04, 0.27], [-0.04, 0.27, 0.27, BV], [U - 0.27, U + 0.04, 0.27, BV]]) K.box(u0, u1, v0, v1, wallH, wallH + 0.08, M.trim, { collide: false });
  for (const [u0, u1, v0, v1] of [[-0.02, U + 0.02, -0.02, 0.25], [-0.02, 0.25, 0.25, BV], [U - 0.25, U + 0.02, 0.25, BV]]) K.box(u0, u1, v0, v1, 0, DECK + 0.6, M.dado, { collide: false });
  // spectator tiers along the west deck (three rows facing the pool, stairs at both ends)
  {
    const Ks = new Kit(K.campus, ID, frameOf(xz(K.world(3.0, 6)), [-K.ev[0] * 0 - K.eu[0], -K.eu[1]])); // v rises west
    const [ua] = Ks.local(...xz(K.world(3.0, 7))); const [ub] = Ks.local(...xz(K.world(3.0, 26)));
    for (let k = 0; k < 3; k++) slab(Ks, Math.min(ua, ub), Math.max(ua, ub), k * 0.8, (k + 1) * 0.8, DECK, DECK + (k + 1) * 0.4, k % 2 ? M.blue2 : M.blue1);
    const n = 7; const rs = 1.2 / n; const ts = 2.4 / n;
    for (const [a, c] of [[Math.min(ua, ub) - 1.2, Math.min(ua, ub)], [Math.max(ua, ub), Math.max(ua, ub) + 1.2]]) for (let j = 0; j < n; j++) slab(Ks, a, c, j * ts, (j + 1) * ts, DECK, DECK + (j + 1) * rs, M.conc);
    Ks.stairs.push({ name: 'pool tiers stair', u0: Math.min(ua, ub) - 1.2, u1: Math.min(ua, ub), v0: 0, v1: 2.4, y0: DECK, y1: DECK + 1.2 });
    mergeInto(K, Ks);
  }
  // lifeguard chair
  {
    const u = W0 - 1.6; const v = 16.5;
    for (const [du, dv] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) K.box(u + du - 0.03, u + du + 0.03, v + dv - 0.03, v + dv + 0.03, DECK, 1.9, M.white, { collide: false });
    K.box(u - 0.4, u + 0.4, v - 0.4, v + 0.4, 1.85, 1.92, M.white, { collide: false });
    K.box(u - 0.42, u - 0.36, v - 0.4, v + 0.4, 1.92, 2.6, M.white, { collide: false });
    K.box(u - 0.45, u + 0.45, v - 0.45, v + 0.45, 2.75, 2.8, M.red, { collide: false });
    K.cyl(u - 0.3, v, 1.92, 0.025, 0.85, M.steel, { seg: 6 });
    K.col(u - 0.4, u + 0.4, v - 0.4, v + 0.4, 0, 1.9);
  }
  for (const v of [9, 22]) { K.box(U - 1.6, U - 1.2, v - 1.5, v + 1.5, DECK + 0.42, DECK + 0.47, M.wood, { collide: false }); K.col(U - 1.6, U - 1.2, v - 1.5, v + 1.5, DECK, DECK + 0.47); }
  K.sign('POOL RULES: shower first · no running · no diving at the shallow end', cu, 0.24, 1.0, [0, 1], { width: 7, height: 0.45, bg: '#1d3f8a', fg: '#ffffff', font: 'bold 44px sans-serif' });
  K.sign('DEEP END 2.0 M', cu, 0.24, 1.55, [0, 1], { width: 2.4, height: 0.32, bg: '#c0392b', fg: '#ffffff', font: 'bold 56px sans-serif' });
  K.sign('SHALLOW END 1.2 M', cu, BV + 0.13, 2.65, [0, -1], { width: 2.8, height: 0.32, bg: '#1d3f8a', fg: '#ffffff', font: 'bold 56px sans-serif' });
  for (const [u, v] of [[1.2, 1.2], [U - 1.2, 1.2], [1.2, BV - 1.2], [U - 1.2, BV - 1.2]]) flood(K, u, v, cu, (P0 + P1) / 2, 9, 2);

  // ----- the changing block: men (west), lobby, women (east) -----
  const v0 = BV; const v1 = Lv; const vc0 = v0 + 0.115; const vc1 = v1 - 0.115;
  const uM = 12.3; const uW = U - 12.3; const DOOR = cu;
  slab(K, 0, U, v0 - 0.01, v1, 0, DECK, M.terrazzo);
  slab(K, DOOR - 3, DOOR + 3, v1, v1 + 2.0, 0, DECK, M.kota); // porch
  slab(K, 0, U, v1 + 2.0, v1 + 0.0 + 2.0, 0, 0.01, M.kota, { collide: false });
  const forecourt = S('t:paving:#c9bfae', 9);
  slab(K, -0.6, U + 0.6, v1, v1 + 3.2, 0, 0.06, forecourt, { collide: false });
  K.wall(0, vc1, U, vc1, DECK, ROOF, M.cream, { thick: 0.23, openings: [{ at: DOOR, width: 2.0, top: 2.4 }, ...[3, 6.3, 9.6, U - 3, U - 6.3, U - 9.6].map((u) => ({ at: u, width: 1.4, bottom: 1.85, top: 2.65 }))] });
  K.wall(0, vc0, U, vc0, DECK, ROOF, M.cream, { thick: 0.23, openings: [{ at: DOOR, width: 2.0, top: 2.4 }, { at: 3.5, width: 1.2 }, { at: U - 3.5, width: 1.2 }, ...[7, 10, U - 7, U - 10].map((u) => ({ at: u, width: 1.2, bottom: 1.85, top: 2.65 }))] });
  K.wall(0.115, v0, 0.115, v1, DECK, ROOF, M.cream, { thick: 0.23 });
  K.wall(U - 0.115, v0, U - 0.115, v1, DECK, ROOF, M.cream, { thick: 0.23 });
  K.box(-0.02, U + 0.02, v1 - 0.02, v1 + 0.02, 0, DECK + 0.75, M.dado, { collide: false });
  for (const u of [3, 6.3, 9.6, U - 3, U - 6.3, U - 9.6]) K.window(true, u, vc1, DECK + 1.85, 1.4, 0.8, { frame: 'c:#3f5f52', glass: 'g:#b9d0d8' });
  for (const u of [7, 10, U - 7, U - 10]) K.window(true, u, vc0, DECK + 1.85, 1.2, 0.8, { frame: 'c:#3f5f52', glass: 'g:#b9d0d8' });
  K.door(true, DOOR - 0.5, vc1, DECK, 1.0, { thick: 0.23, side: -1, height: 2.4, leaf: 't:wood:#6d8a9a' });
  K.door(true, DOOR + 0.5, vc1, DECK, 1.0, { thick: 0.23, side: -1, height: 2.4, leaf: 't:wood:#6d8a9a' });
  K.door(true, DOOR, vc0, DECK, 2.0, { thick: 0.23, side: 1, height: 2.4 });
  K.door(true, 3.5, vc0, DECK, 1.2, { thick: 0.23, side: 1 }); K.door(true, U - 3.5, vc0, DECK, 1.2, { thick: 0.23, side: 1 });
  roofEdge(K, 0, U, v0, v1, ROOF, { over: 0.15 });
  // porch: two columns, a canopy slab, the name board
  for (const s of [-1, 1]) { slab(K, DOOR + s * 2.5 - 0.2, DOOR + s * 2.5 + 0.2, v1 + 1.6, v1 + 2.0, DECK, 3.2, M.creamW, { walkable: false }); K.box(DOOR + s * 2.5 - 0.26, DOOR + s * 2.5 + 0.26, v1 + 1.54, v1 + 2.06, DECK, DECK + 0.2, M.trim, { collide: false }); }
  K.box(DOOR - 3.1, DOOR + 3.1, v1, v1 + 2.2, 3.2, 3.42, M.roof, { collide: false });
  K.box(DOOR - 3.15, DOOR + 3.15, v1 + 2.15, v1 + 2.25, 3.15, 3.5, M.trim, { collide: false });
  K.sign('BITS SWIMMING POOL', DOOR, v1 + 2.25, 3.18, [0, 1], { width: 5.8, height: 0.3, bg: '#1d3f8a', fg: '#f4ecd6', font: 'bold 60px Georgia, serif' });
  K.box(DOOR - 4, DOOR + 4, v1 + 0.15 - 0.3, v1 + 0.15 + 0.0, ROOF + 0.25, ROOF + 1.15, M.cream, { collide: false });
  K.sign('SWIMMING POOL', DOOR, v1 + 0.16, ROOF + 0.4, [0, 1], { width: 6, height: 0.6, bg: '#ead7ab', fg: '#1d3f8a' });
  K.sign('Swimming club members only', DOOR + 1.6, v1 + 0.02, 1.3, [0, 1], { width: 1.1, height: 0.35, bg: '#f4ecd6', fg: '#7a2622', font: 'bold 40px sans-serif' });
  K.tubeLight(DOOR, v1 + 1.1, 3.2, [1, 0]);
  K.stairs.push({ name: 'pool porch', u0: DOOR - 3, u1: DOOR + 3, v0: v1, v1: v1 + 2, y0: 0, y1: DECK });
  // interior (zone): partitions with doors, showers, lockers, benches, the attendant's counter
  K.layer('pool-block', () => {
    for (const u of [uM, uW]) K.wall(u, v0 + 0.23, u, v1 - 0.23, DECK, CEIL, M.tileW, { thick: 0.15, openings: [{ at: 5.6, width: 1.0 }] });
    for (const u of [uM, uW]) K.door(false, v0 + 0.23 + 5.6, u, DECK, 1.0, { thick: 0.15, side: u === uM ? 1 : -1 });
    K.box(0.23, U - 0.23, v0 + 0.23, v1 - 0.23, CEIL, CEIL + 0.05, M.ceil, { collide: false });
    for (const [a, c] of [[0.23, uM - 0.075], [uM + 0.075, uW - 0.075], [uW + 0.075, U - 0.23]]) {
      K.box(a, c, v0 + 0.23, v0 + 0.26, DECK, DECK + 1.5, M.tileW, { collide: false }); K.box(a, c, v1 - 0.26, v1 - 0.23, DECK, DECK + 1.5, M.tileW, { collide: false });
      for (const f of [0.3, 0.7]) K.tubeLight(a + (c - a) * f, (v0 + v1) / 2, CEIL, [1, 0]);
    }
    for (const [lo, hi, s] of [[0.23, uM - 0.075, 1], [uW + 0.075, U - 0.23, -1]]) {
      const edge = s > 0 ? lo : hi; const inner = s > 0 ? hi : lo;
      // lockers on the outer wall, benches down the middle, three showers against the partition
      for (let k = 0; k < 9; k++) slab(K, Math.min(edge, edge + s * 0.45), Math.max(edge, edge + s * 0.45), v0 + 1.2 + k * 0.6, v0 + 1.78 + k * 0.6, DECK, DECK + 1.9, M.locker, { walkable: false });
      for (const vb of [v0 + 3, v0 + 5.5]) { K.box(Math.min(edge + s * 2.4, edge + s * 4.8), Math.max(edge + s * 2.4, edge + s * 4.8), vb - 0.2, vb + 0.2, DECK + 0.42, DECK + 0.47, M.wood, { collide: false }); K.col(Math.min(edge + s * 2.4, edge + s * 4.8), Math.max(edge + s * 2.4, edge + s * 4.8), vb - 0.2, vb + 0.2, DECK, DECK + 0.47); }
      slab(K, Math.min(inner, inner - s * 3.2), Math.max(inner, inner - s * 3.2), v0 + 0.3, v1 - 0.3, DECK, DECK + 0.02, 't:tiles:#c9d6d6', { collide: false });
      for (let k = 0; k < 3; k++) {
        const vs = v0 + 1.5 + k * 1.9;
        K.box(Math.min(inner, inner - s * 1.6), Math.max(inner, inner - s * 1.6), vs - 0.04, vs + 0.04, DECK, DECK + 2.1, M.tileW);
        K.cyl(inner - s * 0.2, vs + 0.95, DECK + 2.0, 0.07, 0.04, M.steel, { seg: 8 });
        K.box(Math.min(inner, inner - s * 0.22), Math.max(inner, inner - s * 0.22), vs + 0.93, vs + 0.97, DECK + 2.02, DECK + 2.06, M.steel, { collide: false });
      }
      K.box(Math.min(inner, inner - s * 1.6), Math.max(inner, inner - s * 1.6), v0 + 1.5 + 3 * 1.9 - 0.04, v0 + 1.5 + 3 * 1.9 + 0.04, DECK, DECK + 2.1, M.tileW);
    }
    K.sign('GENTS', uM - 0.08, v0 + 5.6 + 0.23, DECK + 2.25, [-1, 0], { width: 0.9, height: 0.25, bg: '#1d3f8a', fg: '#fff', font: 'bold 56px sans-serif' });
    K.sign('GENTS', uM + 0.08, v0 + 5.6 + 0.23, DECK + 2.25, [1, 0], { width: 0.9, height: 0.25, bg: '#1d3f8a', fg: '#fff', font: 'bold 56px sans-serif' });
    K.sign('LADIES', uW + 0.08, v0 + 5.6 + 0.23, DECK + 2.25, [1, 0], { width: 0.9, height: 0.25, bg: '#8e2b5a', fg: '#fff', font: 'bold 56px sans-serif' });
    K.sign('LADIES', uW - 0.08, v0 + 5.6 + 0.23, DECK + 2.25, [-1, 0], { width: 0.9, height: 0.25, bg: '#8e2b5a', fg: '#fff', font: 'bold 56px sans-serif' });
    // lobby: attendant's counter, register, bench, notice board, fan
    slab(K, DOOR + 1.6, DOOR + 3.6, v0 + 3.0, v0 + 3.6, DECK, DECK + 1.0, M.wood, { walkable: false });
    K.box(DOOR + 1.55, DOOR + 3.65, v0 + 2.95, v0 + 3.65, DECK + 1.0, DECK + 1.05, 't:wood:#6b4a2a', { collide: false });
    K.box(DOOR + 2.2, DOOR + 2.6, v0 + 3.2, v0 + 3.5, DECK + 1.05, DECK + 1.09, 'c:#2f4f8c', { collide: false });
    K.chair(DOOR + 2.6, v0 + 2.4, DECK, [0, 1]);
    K.box(DOOR - 3.5, DOOR - 3.1, v0 + 2, v0 + 5.5, DECK + 0.42, DECK + 0.47, M.wood, { collide: false }); K.col(DOOR - 3.5, DOOR - 3.1, v0 + 2, v0 + 5.5, DECK, DECK + 0.47);
    K.board(uW - 0.08, v0 + 2.2, DECK, [-1, 0], { w: 1.4, h: 0.9, key: 'c:#6b4f35', frame: 'c:#3b2f22' });
    K.fan(DOOR, (v0 + v1) / 2, CEIL);
    K.sign('Timings 6-8 am · 4-7 pm', DOOR - 1.8, v0 + 0.27, DECK + 1.6, [0, 1], { width: 1.6, height: 0.3, bg: '#f4ecd6', fg: '#1d3f8a', font: 'bold 44px sans-serif' });
  });
  K.room('poolLobby', 'Swimming pool lobby', uM, uW, v0, v1, DECK, CEIL);
  K.room('poolGents', 'Gents changing room', 0, uM, v0, v1, DECK, CEIL);
  K.room('poolLadies', 'Ladies changing room', uW, U, v0, v1, DECK, CEIL);
  K.entrance('Swimming pool', DOOR, v1 + 3, [0, 1]);
  const a = K.world(DOOR, v1 + 5); const m = K.world(DOOR, v0 + 3); const d = K.world(DOOR, BV - 2);
  K.navLinks.push([[a.x, a.z], [m.x, m.z]], [[m.x, m.z], [d.x, d.z]]);
  clear.push(worldRect(K, 0, U, 0, Lv + 3, 2));
  K.pool = { U, Lv, BV, W0, W1, P0, P1, DOOR, uM, uW, DECK, v1 };
  return K;
}

// ---------- Med-C (cricket) ground: clay square, pitch, stumps, boundary rope, sight screens, scorers' hut ----------
function buildMedC(G, medc, clear) {
  const cu = 68; const cv = 206; // centre of the square (G frame)
  const L = [];
  G.geo(S('t:dirt:#c9a274', 10), flatGeo(discTris(cu, cv, 14, 0, Math.PI * 2, 0.05, 48), TEX_SIZE.dirt));
  G.geo(S('t:dirt:#dcc49c', 11), flatGeo(rectTris(cu - 1.6, cu + 1.6, cv - 12, cv + 12, 0.052), TEX_SIZE.dirt));
  for (const s of [-1, 1]) {
    const sv = cv + s * 10.06;
    L.push(...segTris([cu - 1.32, sv], [cu + 1.32, sv], 0.05, 0.054)); // bowling crease
    L.push(...segTris([cu - 1.83, sv - s * 1.22], [cu + 1.83, sv - s * 1.22], 0.05, 0.054)); // popping crease
    for (const k of [-1, 1]) L.push(...segTris([cu + k * 1.32, sv + s * 1.0], [cu + k * 1.32, sv - s * 1.22], 0.05, 0.054)); // return creases
    for (const k of [-0.11, 0, 0.11]) G.cyl(cu + k, sv, 0, 0.018, 0.71, M.yellow, { seg: 6 });
    for (const k of [-0.055, 0.055]) G.box(cu + k - 0.05, cu + k + 0.05, sv - 0.008, sv + 0.008, 0.71, 0.73, M.yellow, { collide: false });
  }
  L.push(...ringTris(cu, cv, 51.94, 52.06, 0, Math.PI * 2, 0.055, 120)); // boundary rope
  for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; L.push(...discTris(cu + 27.4 * Math.cos(a), cv + 27.4 * Math.sin(a), 0.25, 0, Math.PI * 2, 0.055, 8)); } // inner ring discs
  G.geo(LINE, flatGeo(L, 1));
  // sight screens beyond the boundary at both ends
  for (const s of [-1, 1]) {
    const v = cv + s * 57;
    G.box(cu - 4, cu + 4, v - 0.06, v + 0.06, 0.5, 4.0, M.white, { collide: false });
    for (const k of [-3.6, 0, 3.6]) slab(G, cu + k - 0.08, cu + k + 0.08, v + s * 0.06, v + s * 0.9, 0, 4.0, M.steel, { walkable: false });
    G.col(cu - 4, cu + 4, v - 0.08, v + 0.08, 0, 4.0);
  }
  for (const [u, v] of [[30, 140], [106, 140], [30, 273], [106, 273], [14, 206], [122, 206]]) flood(G, u, v, cu, cv, 17, 4);
  // scorers' hut on the NW edge: one room, verandah facing the ground, scoreboard
  {
    const u0 = 9; const u1 = 15; const v0 = 135.5; const v1 = 145.5; const F = 0.3; const R = 3.4;
    slab(G, u0, u1 + 2, v0, v1, 0, F, M.kota);
    slab(G, u1 + 2, u1 + 2.3, v0, v1, 0, 0.15, M.kota);
    G.wall(u0 + 0.115, v0, u0 + 0.115, v1, F, R, M.cream, { thick: 0.23, openings: [{ at: 5, width: 1.2, bottom: 1.2, top: 2.1 }] });
    G.wall(u1 - 0.115, v0, u1 - 0.115, v1, F, R, M.cream, { thick: 0.23, openings: [{ at: 3, width: 1.0 }, { at: 7, width: 1.6, bottom: 0.9, top: 2.0 }] });
    G.wall(u0, v0 + 0.115, u1, v0 + 0.115, F, R, M.cream, { thick: 0.23 });
    G.wall(u0, v1 - 0.115, u1, v1 - 0.115, F, R, M.cream, { thick: 0.23 });
    G.door(false, v0 + 3, u1 - 0.115, F, 1.0, { thick: 0.23, side: 1 });
    G.window(false, v0 + 7, u1 - 0.115, F + 0.9, 1.6, 1.1, { frame: 'c:#3f5f52' });
    for (const v of [v0 + 0.3, v1 - 0.3]) slab(G, u1 + 1.65, u1 + 1.95, v - 0.15, v + 0.15, F, R, M.creamW, { walkable: false });
    roofEdge(G, u0, u1 + 2, v0, v1, R, { over: 0.1, parapet: 0.5 });
    G.sign('MED-C GROUND · SCORE 000/0 · OVERS 00.0', u1 + 0.01, v0 + 7, R - 0.9, [1, 0], { width: 3.6, height: 0.5, bg: '#1d2420', fg: '#f2d64b', font: 'bold 52px monospace' });
    G.box(u1 + 0.6, u1 + 1.0, v0 + 1, v0 + 6, F + 0.42, F + 0.47, M.wood, { collide: false }); G.col(u1 + 0.6, u1 + 1.0, v0 + 1, v0 + 6, F, F + 0.47);
    G.tubeLight(u1 + 1.0, v0 + 5, R, [0, 1]);
    G.layer('medc-hut', () => {
      G.box(u0 + 0.23, u1 - 0.23, v0 + 0.23, v1 - 0.23, R - 0.12, R - 0.07, M.ceil, { collide: false });
      G.tubeLight((u0 + u1) / 2, (v0 + v1) / 2, R - 0.12, [0, 1]);
      G.desk(u1 - 0.9, v0 + 7, F, [1, 0], { w: 1.6, d: 0.6 }); G.chair(u1 - 1.6, v0 + 6.6, F, [1, 0]); G.chair(u1 - 1.6, v0 + 7.4, F, [1, 0]);
      slab(G, u0 + 0.23, u0 + 0.8, v0 + 0.5, v0 + 2.4, F, F + 1.9, M.almirah, { walkable: false });
      G.box(u0 + 0.24, u0 + 0.27, v0 + 4, v0 + 7, F + 1.0, F + 2.0, 'c:#2a2f2c', { collide: false }); // spare scoreboard numbers board
      for (let k = 0; k < 6; k++) G.box(u0 + 0.3, u0 + 0.5, v0 + 4.2 + k * 0.45, v0 + 4.5 + k * 0.45, F + 1.1, F + 1.5, M.white, { collide: false });
    });
    G.room('medcHut', "Med-C scorers' hut", u0, u1, v0, v1, F, R);
    G.entrance("Med-C scorers' hut", u1 + 3, v0 + 3, [1, 0]);
  }
  clear.push(medc.poly.map((p) => p));
}
