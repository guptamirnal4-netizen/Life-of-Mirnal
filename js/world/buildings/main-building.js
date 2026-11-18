// Main Building: the Clock Tower block, its spine ranges, the Auditorium behind and the sunken Rotunda in front.
// Research: research/buildings/main-building.md, research/buildings/fd2-fd3.md, research/review.md §5.4.
//
// What is here (game metres, x east, z south; the frame is the world itself, so every collider is exact):
//   Tower block    Art Deco, three stepped tiers round the x = -9.3 axis: two-storey outer body (roof 9.9), a
//                  three-storey middle tier (roof 14.4) and the Clock Tower (about 43 m to the finial). A one-storey
//                  foyer with a roof terrace runs forward to the porte-cochère, whose steps reach z -42.
//   Inside         foyer (checkerboard marble) → inner foyer (bust, murals) → cross corridor → pillared inner hall
//                  round a light-court → carved doors into the Auditorium. Twin dog-leg stairs flank the tower hall
//                  (x ≈ -26.6…-21.3 and 2.7…8) up to a first floor: corridor, first-floor hall onto the terrace,
//                  side halls that open onto the spine verandahs.
//   Spine ranges   (OSM "FD-II") two storeys, cusped-arch arcade below and a paired-column verandah above. The
//                  gameplay lab `sciencelab` sits in the west range (moved off the tower entrance, see `rooms`);
//                  above it, on the first floor, is Physics Laboratory 2247A.
//   Auditorium     (OSM "Main Building Hall") a long hall with a pitched corrugated roof, stage and seating.
//   Rotunda        a sunken plaza 50 m across, floor y -4.5, at the origin: star paving, ochre niche wall with
//                  the BITS emblem and a jali parapet on the north, amphitheatre terraces E/S/W with stair aisles,
//                  and two doorways in the wall with stairs up to the Clock Tower forecourt.
import * as THREE from 'three';
import { TEX_SIZE, worldBoxGeometry } from '../textures.js';

// ---------- dimensions ----------
const C = -9.3; // the tower axis (BITS Clock Tower POI x)
const FL0 = 0.9; // tower block ground floor (plinth)
const FL1 = 5.4; // first floor everywhere
const FL2 = 9.9; // roof of the two-storey parts
const FL3 = 14.4; // roof of the middle tier
const TX0 = C - 18; const TX1 = C + 18; // tower block outer body
const W0 = -70; const E1 = 39.5; // ends of the west and east ranges
const ZB = -69.5; // rear wall of the ranges
const A0 = -33.8; const A1 = -1.6; const AZ0 = -131; const AZ1 = -82; // Auditorium
const ROT_R = 25; const ROT_Y = -4.5; // Rotunda radius and floor
const TW = 3.5; const TZ0 = -64.9; const TZ1 = -57.9; // Clock Tower shaft (half width, z extent)

// ---------- materials ----------
const CREAM = 't:plaster:#f1ead9';
const CREAM_C = 'c:#efe8d6';
const MAROON = 'c:#8e2f28';
const TRIM = 'c:#f6f2ea';
const GLASS = 'c:#33424c';
const ROOF = 'c:#b7b2aa';
const OCHRE = 't:plaster:#e2c27a';
const STONE = 't:paving:#d9ccb2';
const TERRAZZO = 't:terrazzo:#d6d1c6';
const WOOD = 't:wood:#7a5232';
const STEEL = 'm:#9aa1a6';
const PLINTH = 'c:#8a3a2c';

// ---------- canvas textures ----------
function canvasTex(w, h, draw, { repeat = null, alphaTest = 0, doubleSide = false } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.userData = { alphaTest, doubleSide };
  return t;
}

// Multifoil (cusped) arch path, base width w at (x, y) springing at y, as on the arcades and the Rotunda niches.
function cuspPath(g, x, y, w, rise = 1.05, lobes = 5) {
  const r = w / 2; const cx = x + r;
  g.moveTo(x, y);
  for (let i = 1; i < lobes * 8; i++) {
    const t = i / (lobes * 8); const a = Math.PI * (1 - t);
    const rr = r * (1 + 0.13 * Math.sin(Math.PI * ((t * lobes) % 1)));
    g.lineTo(cx + Math.cos(a) * rr, y - Math.sin(a) * rr * rise);
  }
  g.lineTo(x + w, y);
}

const TEX = {
  // the Rotunda paving: pink sandstone star and slate-blue rays inside lotus petals, pale stone beyond
  floor: () => canvasTex(1024, 1024, (g, W) => {
    const c = W / 2; const s = W / 2 / ROT_R; // px per metre
    const at = (r, a) => [c + Math.sin(a) * r * s, c - Math.cos(a) * r * s];
    const poly = (pts, col) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = col; g.fill(); };
    g.fillStyle = '#d8c7aa'; g.fillRect(0, 0, W, W);
    for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; poly([at(11, a - 0.17), at(14.2, a - 0.12), at(16.6, a), at(14.2, a + 0.12), at(11, a + 0.17)], k % 2 ? '#bf7f77' : '#cf968c'); }
    const star = []; for (let k = 0; k < 16; k++) star.push(at(k % 2 ? 5.4 : 11, (k / 16) * Math.PI * 2));
    poly(star, '#c08a80');
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; poly([at(5.4, a - Math.PI / 8), at(11, a), at(5.4, a + Math.PI / 8), at(7.2, a)], '#56677e'); }
    const inner = []; for (let k = 0; k < 16; k++) inner.push(at(k % 2 ? 2 : 5, (k / 16) * Math.PI * 2 + Math.PI / 8));
    poly(inner, '#e6d5bb');
    g.strokeStyle = '#f0e6d6'; g.lineWidth = 3;
    for (let k = 0; k < 32; k++) { const [x, y] = at(ROT_R, (k / 32) * Math.PI * 2); const [x0, y0] = at(16.6, (k / 32) * Math.PI * 2); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x, y); g.stroke(); }
    for (const r of [5, 11, 16.6, 17]) { g.beginPath(); g.arc(c, c, r * s, 0, Math.PI * 2); g.stroke(); }
    // thin curved grass strips set into the paving (north side, as in the 360° view)
    g.strokeStyle = '#6f9a48'; g.lineWidth = 0.45 * s;
    g.beginPath(); g.arc(c, c, 13.2 * s, -Math.PI / 2 - 0.55, -Math.PI / 2 + 0.55); g.stroke();
    g.fillStyle = '#56677e'; g.beginPath(); g.arc(c, c, 0.9 * s, 0, Math.PI * 2); g.fill();
  }),
  // one Rotunda wall bay: white rectangular frame round a cusped niche on ochre
  niche: () => canvasTex(256, 384, (g, W, H) => {
    g.fillStyle = '#e2c27a'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(120,90,40,${Math.random() * 0.06})`; g.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
    const fx = W * 0.2; const fw = W * 0.6; const fy = H * 0.3; const fh = H * 0.62;
    g.fillStyle = '#f4efe2'; g.fillRect(fx, fy, fw, fh);
    g.fillStyle = '#8f8576'; g.beginPath(); cuspPath(g, fx + fw * 0.17, fy + fh * 0.32, fw * 0.66, 0.9); g.lineTo(fx + fw * 0.83, fy + fh); g.lineTo(fx + fw * 0.17, fy + fh); g.closePath(); g.fill();
    g.fillStyle = '#6f675b'; g.beginPath(); cuspPath(g, fx + fw * 0.24, fy + fh * 0.36, fw * 0.52, 0.8); g.lineTo(fx + fw * 0.76, fy + fh); g.lineTo(fx + fw * 0.24, fy + fh); g.closePath(); g.fill();
    g.fillStyle = '#d4b46c'; g.fillRect(0, H - 10, W, 10);
  }),
  // the pierced parapet (square holes) on top of the Rotunda wall
  jali: () => canvasTex(256, 64, (g, W, H) => {
    g.fillStyle = '#e8cd8c'; g.fillRect(0, 0, W, H);
    for (let x = 10; x < W; x += 32) g.clearRect(x, 22, 14, 18);
    g.fillStyle = '#f4efe2'; g.fillRect(0, 0, W, 6);
  }, { alphaTest: 0.5, doubleSide: true }),
  emblem: () => canvasTex(512, 512, (g, W) => {
    const c = W / 2;
    g.clearRect(0, 0, W, W);
    g.fillStyle = '#efe9dc'; g.beginPath(); g.arc(c, c, c - 4, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#a99f8c'; g.lineWidth = 10; g.stroke();
    g.lineWidth = 4; g.beginPath(); g.arc(c, c, c - 70, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#7d7362'; g.font = 'bold 34px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const txt = 'BIRLA INSTITUTE OF TECHNOLOGY & SCIENCE · PILANI ·';
    for (let i = 0; i < txt.length; i++) { const a = -Math.PI * 0.95 + (i / txt.length) * Math.PI * 1.9; g.save(); g.translate(c + Math.sin(a) * (c - 38), c - Math.cos(a) * (c - 38)); g.rotate(a); g.fillText(txt[i], 0, 0); g.restore(); }
    g.strokeStyle = '#8b816f'; g.lineWidth = 9;
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.beginPath(); g.moveTo(c + Math.sin(a) * 40, c - Math.cos(a) * 40); g.lineTo(c + Math.sin(a) * (c - 90), c - Math.cos(a) * (c - 90)); g.stroke(); }
    g.beginPath(); g.moveTo(c - 70, c - 80); g.lineTo(c, c + 90); g.lineTo(c + 70, c - 80); g.stroke();
    g.fillStyle = '#efe9dc'; g.beginPath(); g.arc(c, c, 36, 0, Math.PI * 2); g.fill(); g.stroke();
  }, { alphaTest: 0.5 }),
  dial: () => canvasTex(512, 512, (g, W) => {
    const c = W / 2;
    g.clearRect(0, 0, W, W);
    g.fillStyle = '#8e2f28'; g.beginPath(); g.arc(c, c, c - 2, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fbf8f0'; g.beginPath(); g.arc(c, c, c - 46, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#2b2b2b';
    for (let k = 0; k < 60; k++) { const a = (k / 60) * Math.PI * 2; const big = k % 5 === 0; g.lineWidth = big ? 9 : 3; g.beginPath(); g.moveTo(c + Math.sin(a) * (c - 54), c - Math.cos(a) * (c - 54)); g.lineTo(c + Math.sin(a) * (c - (big ? 100 : 70)), c - Math.cos(a) * (c - (big ? 100 : 70))); g.stroke(); }
    g.strokeStyle = '#5a5248'; g.lineWidth = 3;
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.sin(a) * (c - 110), c - Math.cos(a) * (c - 110)); g.stroke(); }
  }, { alphaTest: 0.5 }),
  checker: (n) => canvasTex(128, 128, (g, W) => { g.fillStyle = '#f2f0ec'; g.fillRect(0, 0, W, W); g.fillStyle = '#7f8487'; g.fillRect(0, 0, W / 2, W / 2); g.fillRect(W / 2, W / 2, W / 2, W / 2); }, { repeat: n }),
  starFloor: () => canvasTex(512, 512, (g, W) => {
    const c = W / 2;
    g.fillStyle = '#f3f1ec'; g.fillRect(0, 0, W, W);
    g.strokeStyle = '#ddd8cf'; g.lineWidth = 2; for (let x = 0; x <= W; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, W); g.moveTo(0, x); g.lineTo(W, x); g.stroke(); }
    g.fillStyle = '#7a4a2a'; g.fillRect(0, 0, W, 16); g.fillRect(0, W - 16, W, 16); g.fillRect(0, 0, 16, W); g.fillRect(W - 16, 0, 16, W);
    g.beginPath(); for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; const r = k % 2 ? 60 : 150; const p = [c + Math.sin(a) * r, c - Math.cos(a) * r]; if (k) g.lineTo(...p); else g.moveTo(...p); } g.closePath(); g.fill();
    g.fillStyle = '#e9dcc5'; g.beginPath(); g.arc(c, c, 34, 0, Math.PI * 2); g.fill();
  }),
  mural: (hue) => canvasTex(384, 256, (g, W, H) => {
    g.fillStyle = '#6b4a2e'; g.fillRect(0, 0, W, H);
    g.fillStyle = `hsl(${hue},35%,62%)`; g.fillRect(12, 12, W - 24, H - 24);
    for (let i = 0; i < 26; i++) { g.fillStyle = `hsla(${(hue + i * 37) % 360},45%,${35 + (i % 4) * 10}%,0.8)`; g.beginPath(); g.ellipse(20 + ((i * 97) % (W - 40)), 20 + ((i * 53) % (H - 40)), 14 + (i % 5) * 7, 10 + (i % 3) * 8, i, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = 'rgba(40,30,20,0.7)'; g.fillRect(12, H - 52, W - 24, 6);
  }),
  relief: () => canvasTex(128, 256, (g, W, H) => {
    g.fillStyle = '#d6cbb4'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#a89a80'; g.lineWidth = 5;
    for (let y = 20; y < H; y += 54) { g.strokeRect(16, y, W - 32, 40); g.beginPath(); g.moveTo(16, y); g.lineTo(W - 16, y + 40); g.moveTo(W - 16, y); g.lineTo(16, y + 40); g.stroke(); }
  }),
  carved: () => canvasTex(128, 256, (g, W, H) => {
    g.fillStyle = '#6a4326'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#4a2c16'; g.lineWidth = 4;
    for (let x = 12; x < W; x += 26) for (let y = 12; y < H; y += 26) g.strokeRect(x, y, 18, 18);
  }),
  corrugated: () => canvasTex(256, 256, (g, W, H) => {
    g.fillStyle = '#8b9093'; g.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 8) { g.fillStyle = x % 16 ? '#7c8184' : '#9a9fa1'; g.fillRect(x, 0, 4, H); }
    for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(${140 + (i % 3) * 20},${70 + (i % 4) * 8},40,0.35)`; g.fillRect((i * 71) % W, (i * 113) % H, 30 + (i % 4) * 14, 22 + (i % 3) * 20); }
  }, { repeat: [5, 3] }),
};

export default {
  id: 'main-building',
  name: 'Main Building',
  category: 'academic',
  // OSM "Main Building (West Wing)" is FD-III and "(East Wing)" the FD-II quad (fd2-fd3.md): they stay plain blocks.
  osm: ['Main Building Hall', 'FD-II'],
  owns: ['clockTower', 'rotunda'],
  // The labs were placed over the tower entrance; put them in the west range, under the real 2247A (review §5.4).
  rooms: { sciencelab: { host: 'FD-II', near: [-46, -61] } },
  floors: 3,
  enabled: true,
  research: 'mixed',
  frame: () => ({ O: [0, 0], eu: [1, 0], ev: [0, 1], angle: 0, W: 120, L: 170 }),
  build(kit, ctx) {
    const { campus } = ctx;
    const B = (x0, x1, z0, z1, y0, y1, key, o) => kit.box(x0, x1, z0, z1, y0, y1, key, o);
    const D = (x0, x1, z0, z1, y0, y1, key) => kit.box(x0, x1, z0, z1, y0, y1, key, { collide: false });
    const walk = (x0, x1, z0, z1, y0, y1, key) => kit.box(x0, x1, z0, z1, y0, y1, key, { walkable: true });
    const tex = (name, make) => { kit.texture(name, make); return `x:${name}`; };
    const geoKey = (g, key) => {
      const t = key.startsWith('t:') ? key.split(':')[1] : null;
      if (t) { const uv = g.attributes.uv; const s = TEX_SIZE[t] || 2; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / s, uv.getY(i) / s); }
      kit.mesh(g, key);
    };
    // a box turned by yaw about its centre (cx, cz)
    const rbox = (cx, cz, yaw, w, h, d, y0, key) => {
      const t = key.startsWith('t:') ? key.split(':')[1] : null;
      const g = t ? worldBoxGeometry(w, h, d, TEX_SIZE[t] || 2) : new THREE.BoxGeometry(w, h, d);
      g.rotateY(yaw); g.translate(cx, y0 + h / 2, cz); kit.mesh(g, key);
    };
    // a shape drawn in (s along the wall, y) extruded `depth` thick, along x at z = zc or along z at x = xc
    const extrudeX = (shape, x0, zc, depth, key) => { const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }); g.translate(x0, 0, zc - depth / 2); geoKey(g, key); };
    const extrudeZ = (shape, z0, xc, depth, key) => { const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(xc + depth / 2, 0, z0); geoKey(g, key); };
    // windows and doors as relief on a solid wall face: plane z (or x), facing sign s
    const winZ = (x, z, y, w, h, s, { glass = GLASS, frame = TRIM, muntins = 1 } = {}) => {
      D(x - w / 2, x + w / 2, z, z + s * 0.04, y, y + h, glass);
      D(x - w / 2 - 0.09, x + w / 2 + 0.09, z, z + s * 0.12, y - 0.1, y, frame);
      D(x - w / 2 - 0.09, x + w / 2 + 0.09, z, z + s * 0.1, y + h, y + h + 0.09, frame);
      D(x - w / 2 - 0.09, x - w / 2, z, z + s * 0.1, y, y + h, frame); D(x + w / 2, x + w / 2 + 0.09, z, z + s * 0.1, y, y + h, frame);
      for (let k = 1; k <= muntins; k++) { const mx = x - w / 2 + (k * w) / (muntins + 1); D(mx - 0.03, mx + 0.03, z, z + s * 0.08, y, y + h, frame); }
      D(x - w / 2, x + w / 2, z, z + s * 0.08, y + h * 0.62 - 0.03, y + h * 0.62 + 0.03, frame);
    };
    const winX = (x, z, y, w, h, s, o = {}) => {
      const { glass = GLASS, frame = TRIM } = o;
      D(x, x + s * 0.04, z - w / 2, z + w / 2, y, y + h, glass);
      D(x, x + s * 0.12, z - w / 2 - 0.09, z + w / 2 + 0.09, y - 0.1, y, frame);
      D(x, x + s * 0.1, z - w / 2 - 0.09, z + w / 2 + 0.09, y + h, y + h + 0.09, frame);
      D(x, x + s * 0.1, z - w / 2 - 0.09, z - w / 2, y, y + h, frame); D(x, x + s * 0.1, z + w / 2, z + w / 2 + 0.09, y, y + h, frame);
      D(x, x + s * 0.08, z - 0.03, z + 0.03, y, y + h, frame);
      D(x, x + s * 0.08, z - w / 2, z + w / 2, y + h * 0.62 - 0.03, y + h * 0.62 + 0.03, frame);
    };
    const doorZ = (x, z, y, w, s, { h = 2.4, leaf = 'c:#6b4a2e' } = {}) => {
      D(x - w / 2, x + w / 2, z, z + s * 0.05, y, y + h, leaf);
      D(x - w / 2 - 0.1, x + w / 2 + 0.1, z, z + s * 0.1, y + h, y + h + 0.1, 'c:#4e3420');
      D(x - w / 2 - 0.1, x - w / 2, z, z + s * 0.1, y, y + h, 'c:#4e3420'); D(x + w / 2, x + w / 2 + 0.1, z, z + s * 0.1, y, y + h, 'c:#4e3420');
      D(x - 0.02, x + 0.02, z, z + s * 0.08, y, y + h, 'c:#4e3420');
    };
    // a ribbon (string-course, band) round a rectangle at y0..y1, proud by p
    const band = (x0, x1, z0, z1, y0, y1, key, p = 0.06) => { D(x0 - p, x1 + p, z0 - p, z1 + p, y0, y1, key); };

    // ======================================================================================
    // Gameplay room in the spine: build round it
    // ======================================================================================
    const lab = ctx.rooms.find((r) => r.id === 'sciencelab');
    const zF = lab ? lab.z1 : -56.3; // the rooms' front wall line in the ranges
    const ZP = zF + 3.3; // the arcade line (verandah front)
    const Z_END = -52.2; // tower block outer-body front

    // ======================================================================================
    // SPINE RANGES (west and east of the tower block)
    // ======================================================================================
    const range = (x0, x1, side) => {
      const len = x1 - x0;
      const n = Math.max(3, Math.round(len / 3.6)); const bay = len / n;
      const labIn = lab && lab.x0 > x0 && lab.x1 < x1;
      // floors, roof and parapets
      walk(x0, side < 0 ? x1 + 0.5 : x1, ZB, ZP + 0.3, FL1 - 0.3, FL1, 'c:#f3f0e8');
      if (side > 0) walk(x0 - 0.5, x0, zF, ZP + 0.3, FL1 - 0.3, FL1, 'c:#f3f0e8');
      B(x0, x1, ZB, ZP + 0.45, FL2 - 0.35, FL2, ROOF);
      for (const [a, b, c, d] of [[x0, x1, ZP + 0.2, ZP + 0.45], [x0, x1, ZB, ZB + 0.25]]) B(a, b, c, d, FL2, FL2 + 0.75, CREAM);
      B(side < 0 ? x0 : x1 - 0.25, side < 0 ? x0 + 0.25 : x1, ZB, ZP + 0.45, FL2, FL2 + 0.75, CREAM);
      band(x0, x1, ZP + 0.45, ZP + 0.45, FL2 + 0.7, FL2 + 0.8, MAROON, 0.03);
      D(x0, x1, ZP + 0.3, ZP + 0.62, FL2 - 0.5, FL2 - 0.3, CREAM_C); // cornice
      // rear and end walls (closed rooms behind solid walls with window relief)
      kit.wall(x0, ZB + 0.15, x1, ZB + 0.15, 0, FL2, CREAM, { thick: 0.3 });
      const endX = side < 0 ? x0 + 0.15 : x1 - 0.15;
      kit.wall(endX, ZB, endX, ZP + 0.3, 0, FL2, CREAM, { thick: 0.3 });
      D(x0, x1, ZB - 0.06, ZB, 0, 0.6, PLINTH);
      for (let i = 0; i < n; i++) {
        const mx = x0 + (i + 0.5) * bay;
        winZ(mx, ZB, 1.4, 1.5, 2.0, -1); winZ(mx, ZB, FL1 + 1.1, 1.5, 2.0, -1);
      }
      // front wall of the rooms at zF: solid, with doors and windows in relief; the lab span is the room's own wall
      const fw = (a, b) => { if (b - a > 0.05) B(a, b, zF - 0.15, zF + 0.15, 0, FL1 - 0.3, CREAM); };
      if (labIn) { fw(x0, lab.x0 - 0.05); fw(lab.x1 + 0.05, x1); D(lab.x0 - 0.05, lab.x1 + 0.05, zF - 0.15, zF + 0.15, 3.35, FL1 - 0.3, CREAM); } else fw(x0, x1);
      if (labIn) for (const x of [lab.x0 - 0.3, lab.x1 + 0.3]) B(x - 0.15, x + 0.15, ZB, zF - 0.15, 0, FL1 - 0.3, CREAM); // cross walls beside the lab
      D(x0, x1, zF + 0.15, zF + 0.2, 0, 1.0, 'c:#7d7f80'); // dark grey dado on the verandah wall
      for (let i = 0; i < n; i++) {
        const mx = x0 + (i + 0.5) * bay;
        if (labIn && mx > lab.x0 - 1 && mx < lab.x1 + 1) continue;
        if (i % 2 === 0) doorZ(mx, zF + 0.15, 0, 1.3, 1, { h: 2.6 }); else winZ(mx, zF + 0.15, 1.1, 1.6, 1.9, 1);
      }
      // ---- ground floor arcade: cusped arches on square piers, red plinth, jali vent band ----
      const H = FL1 - 0.3;
      const shape = new THREE.Shape();
      const pier = 0.75; const a = pier / 2; const b = bay - pier / 2; const r = (b - a) / 2; const spring = 2.5;
      shape.moveTo(0, 0); shape.lineTo(a, 0); shape.lineTo(a, spring);
      for (let i = 1; i < 40; i++) { const t = i / 40; const ang = Math.PI * (1 - t); const rr = r * (1 + 0.12 * Math.sin(Math.PI * ((t * 5) % 1))); shape.lineTo(a + r + Math.cos(ang) * rr, spring + Math.sin(ang) * rr * 1.08); }
      shape.lineTo(b, spring); shape.lineTo(b, 0); shape.lineTo(bay, 0); shape.lineTo(bay, H); shape.lineTo(0, H); shape.lineTo(0, 0);
      for (let i = 0; i < n; i++) {
        extrudeX(shape, x0 + i * bay, ZP, 0.6, CREAM);
        D(x0 + i * bay + a - 0.05, x0 + i * bay + b + 0.05, ZP - 0.32, ZP + 0.32, H - 0.85, H - 0.3, 'c:#d9cfbd'); // jali vent band
        for (let k = 0; k < 6; k++) { const vx = x0 + i * bay + a + 0.2 + k * ((b - a - 0.4) / 5); D(vx - 0.12, vx + 0.12, ZP + 0.31, ZP + 0.34, H - 0.75, H - 0.4, 'c:#6d6253'); }
      }
      for (let i = 0; i <= n; i++) {
        const px = x0 + i * bay;
        kit.col(px - pier / 2, px + pier / 2, ZP - 0.3, ZP + 0.3, 0, H);
        D(px - pier / 2 - 0.06, px + pier / 2 + 0.06, ZP - 0.36, ZP + 0.36, 0, 0.55, PLINTH);
      }
      D(x0, x1, ZP + 0.3, ZP + 0.36, H - 0.05, H + 0.12, MAROON); // string-course
      // verandah: paving, ceiling lights, a slatted bench now and then
      D(x0, x1, zF + 0.15, ZP + 0.3, 0, 0.03, 'c:#9c9a93');
      for (let i = 0; i < n; i += 2) kit.tubeLight(x0 + (i + 0.5) * bay, (zF + ZP) / 2, FL1 - 0.3, [1, 0]);
      for (let i = 1; i < n; i += 3) { const mx = x0 + i * bay; D(mx - 0.9, mx + 0.9, zF + 0.35, zF + 0.75, 0.42, 0.48, WOOD); D(mx - 0.85, mx - 0.8, zF + 0.4, zF + 0.7, 0, 0.42, WOOD); D(mx + 0.8, mx + 0.85, zF + 0.4, zF + 0.7, 0, 0.42, WOOD); }
      // ---- first floor: front wall, verandah with paired slender columns and a balustrade ----
      const lab1 = side < 0 ? { x0: -52, x1: -40, door: -46 } : null;
      const openings = lab1 ? [{ at: lab1.door - x0, width: 1.4, bottom: 0, top: 2.5 }] : [];
      kit.wall(x0, zF, x1, zF, FL1, FL2 - 0.35, CREAM, { thick: 0.3, openings });
      D(x0, x1, zF + 0.15, zF + 0.2, FL1, FL1 + 1.0, 'c:#7d7f80');
      for (let i = 0; i < n; i++) {
        const mx = x0 + (i + 0.5) * bay;
        if (lab1 && Math.abs(mx - lab1.door) < 1.6) continue;
        if (i % 2 === 1) doorZ(mx, zF + 0.15, FL1, 1.2, 1, { h: 2.5 }); else winZ(mx, zF + 0.15, FL1 + 1.0, 1.6, 1.9, 1);
      }
      B(x0, x1, ZP - 0.12, ZP + 0.12, FL1, FL1 + 0.95, CREAM); // balustrade
      D(x0, x1, ZP - 0.18, ZP + 0.18, FL1 + 0.95, FL1 + 1.05, TRIM);
      for (let i = 0; i <= n; i++) {
        const px = x0 + i * bay;
        for (const dx of [-0.2, 0.2]) { const cx = Math.min(x1 - 0.12, Math.max(x0 + 0.12, px + dx)); D(cx - 0.11, cx + 0.11, ZP - 0.11, ZP + 0.11, FL1 + 1.05, FL2 - 0.5, TRIM); }
      }
      D(x0, x1, ZP - 0.25, ZP + 0.3, FL2 - 0.7, FL2 - 0.35, CREAM_C);
      for (let i = 0; i < n; i += 2) kit.tubeLight(x0 + (i + 0.5) * bay, (zF + ZP) / 2, FL2 - 0.35, [1, 0]);
      D(x0, x1, ZP + 0.12, ZP + 0.17, FL1 - 0.3, FL1 - 0.15, MAROON);
    };
    range(W0, TX0, -1);
    range(TX1, E1, 1);

    // ---- Physics Laboratory 2247A (first floor, west range, over the ground-floor labs) ----
    kit.layer('lab-2247a', () => {
      const x0 = -52; const x1 = -40; const z0 = -66; const z1 = zF - 0.15; const y = FL1; const top = FL2 - 0.35;
      const PERI = 't:plaster:#aeb9e4';
      kit.wall(x0, z0, x1, z0, y, top, PERI, { thick: 0.25 });
      for (const x of [x0, x1]) kit.wall(x, z0, x, z1, y, top, PERI, { thick: 0.25 });
      D(x0 + 0.12, x1 - 0.12, z1 - 0.03, z1, y, top, PERI);
      kit.flat((x0 + x1) / 2, (z0 + z1) / 2, y + 0.01, x1 - x0 - 0.25, z1 - z0 - 0.15, 'c:#5c7fb4');
      D(x0, x1, z0, z1, top - 0.06, top - 0.04, 'c:#f4f4f2'); // false ceiling
      for (const lz of [z0 + 2.5, z0 + 6]) for (const lx of [x0 + 3, x0 + 6, x0 + 9]) kit.tubeLight(lx, lz, top - 0.06, [1, 0]);
      kit.board((x0 + x1) / 2, z0 + 0.14, y, [0, 1], { w: 4.2, h: 1.3, key: 'c:#2a3a30' });
      for (const lz of [z0 + 3.0, z0 + 5.4, z0 + 7.8]) {
        for (const lx of [x0 + 3.2, x0 + 8.8]) {
          kit.desk(lx, lz, y, [0, -1], { w: 3.2, d: 0.9, top: 'c:#1e1f22', legs: 'c:#e9ecef' });
          D(lx - 1.6, lx + 1.6, lz - 0.45, lz + 0.45, y + 0.05, y + 0.7, 'c:#f2f4f6');
          D(lx - 1.62, lx + 1.62, lz - 0.47, lz - 0.43, y + 0.05, y + 0.72, 'c:#3e6db5');
          for (const dx of [-1.0, 0, 1.0]) kit.cyl(lx + dx, lz + 0.75, y, 0.17, 0.62, 'c:#2f5ea8');
          D(lx - 0.3, lx + 0.3, lz - 0.2, lz + 0.1, y + 0.76, y + 1.0, 'm:#5d6670'); // a meter on the bench
        }
      }
      // apparatus cupboard (kit.shelf indexes its book colours with a negative number at negative coordinates)
      B(x1 - 0.6, x1 - 0.13, z0 + 3.5, z0 + 5.5, y, y + 2.0, 'c:#dfe3e8');
      for (const yy of [0.5, 1.0, 1.5]) D(x1 - 0.62, x1 - 0.6, z0 + 3.55, z0 + 5.45, y + yy, y + yy + 0.03, 'c:#9aa3ab');
      kit.room('lab2247a', 'Physics Laboratory 2247A', x0, x1, z0, z1, y, top, 1);
    });
    kit.sign('2247A · Physics Laboratory', -46, zF + 0.17, FL1 + 2.6, [0, 1], { width: 2.4, height: 0.32, bg: '#1f3a5f', fg: '#ffffff', font: 'bold 56px Arial, sans-serif' });
    kit.sign('FD-II', -34, zF + 0.17, 2.75, [0, 1], { width: 1.2, height: 0.36, bg: '#7a2622' });

    // ======================================================================================
    // TOWER BLOCK
    // ======================================================================================
    // ---- slabs ----
    walk(TX0, TX1, -70, -47, 0, FL0, TERRAZZO); // ground floor plinth
    walk(C - 4.4, C + 4.4, -47.5, -44.15, 0, FL0, STONE); // entrance terrace under the porch
    kit.flight(C, -41.95, 0, [0, -1], 5, 0.18, 8, STONE, { tread: 0.44 }); // porch steps
    D(C - 4.4, C + 4.4, -44.2, -41.9, 0, 0.12, PLINTH);
    const stairs = { W: null, E: null };
    kit.layer('tower', () => {
      stairs.W = kit.dogleg(C - 17.8, C - 12, -66, -62, FL0, FL1, { along: 'u', reverse: true, wall: null, name: 'West stair (tower hall)', key: TERRAZZO });
      stairs.E = kit.dogleg(C + 12, C + 17.8, -66, -62, FL0, FL1, { along: 'u', wall: null, name: 'East stair (tower hall)', key: TERRAZZO });
    });
    kit.slab(TX0 + 0.4, TX1 - 0.4, -70, Z_END, FL1, 'c:#f3f0e8', { thick: 0.3, holes: [stairs.W, stairs.E] });
    walk(C - 6, C + 6, Z_END, -47.3, FL1 - 0.3, FL1, 'c:#cfc8bb'); // the terrace over the foyer
    B(TX0, TX1, -70, Z_END, FL2 - 0.3, FL2, ROOF); // outer body roof
    B(C - 10, C + 10, -70, -58, FL2, FL3, CREAM); // middle tier, third storey (closed)
    B(C - 10.1, C + 10.1, -70.1, -57.9, FL3, FL3 + 0.25, ROOF);
    // ---- exterior walls of the outer body ----
    const sideDoor = (-54.65) - (-70);
    kit.wall(TX0 + 0.2, -70, TX0 + 0.2, Z_END, 0, FL2, CREAM, { thick: 0.4, openings: [{ at: sideDoor, width: 1.6, bottom: FL1, top: FL1 + 2.4 }] });
    kit.wall(TX1 - 0.2, -70, TX1 - 0.2, Z_END, 0, FL2, CREAM, { thick: 0.4, openings: [{ at: sideDoor, width: 1.6, bottom: FL1, top: FL1 + 2.4 }] });
    kit.wall(TX0, -69.8, TX1, -69.8, 0, FL2, CREAM, { thick: 0.4, openings: [{ at: C - TX0, width: 12, bottom: FL0, top: 4.9 }] });
    for (const s of [-1, 1]) {
      const xa = s < 0 ? TX0 : C + 6; const xb = s < 0 ? C - 6 : TX1;
      B(xa, xb, Z_END - 0.4, Z_END, 0, FL2, CREAM);
      // the stepped one-storey projection flanking the foyer (rooms 2149 / 2148)
      const pa = s < 0 ? C - 16 : C + 6; const pb = s < 0 ? C - 6 : C + 16;
      B(pa, pb, Z_END, -47.5, 0, 6.0, CREAM);
      B(pa - 0.15, pb + 0.15, Z_END, -47.35, 6.0, 6.25, CREAM_C);
      B(s < 0 ? C - 6.3 : C + 6, s < 0 ? C - 6 : C + 6.3, Z_END, -47.3, 6.0, 6.7, CREAM); // terrace parapet over it
      D(pa, pb, -47.56, -47.5, 0, 0.9, PLINTH);
      for (const k of [-1, 0, 1]) winZ((pa + pb) / 2 + k * 2.6, -47.5, 1.6, 1.9, 2.2, 1, { muntins: 2 });
      D(pa - 0.1, pb + 0.1, -47.5, -46.9, 4.25, 4.4, CREAM_C); // eyebrow over the window band
      D(pa - 0.1, pb + 0.1, -47.5, -47.45, 4.1, 4.2, MAROON);
      for (let k = 0; k < 8; k++) D(pa + 0.8 + k * ((pb - pa - 1.6) / 7) - 0.15, pa + 0.8 + k * ((pb - pa - 1.6) / 7) + 0.15, -47.5, -47.42, 4.95, 5.25, 'c:#dcd3c1'); // relief tiles
      // first-floor band on the outer body front, above the projection
      for (const k of [-1, 0, 1]) winZ((xa + xb) / 2 + s * 1.5 + k * 2.4, Z_END, FL1 + 1.4, 1.8, 2.0, 1, { muntins: 2 });
      D(xa, xb, Z_END, Z_END + 0.6, FL2 - 1.0, FL2 - 0.85, CREAM_C);
      D(xa, xb, Z_END, Z_END + 0.05, FL2 - 1.15, FL2 - 1.05, MAROON);
      // side faces: two window bands
      const fx = s < 0 ? TX0 : TX1;
      for (const z of [-67.5, -63.5, -59.5]) { winX(fx, z, 1.9, 1.7, 2.2, s); winX(fx, z, FL1 + 1.2, 1.7, 2.0, s); }
      D(fx, fx + s * 0.6, -70, Z_END, 4.6, 4.75, CREAM_C);
      D(fx, fx + s * 0.06, -70, Z_END, 0, FL0, PLINTH);
    }
    // parapets and string-courses
    for (const [x0, x1, z0, z1] of [[TX0, TX1, -70, -69.7], [TX0, TX0 + 0.3, -70, Z_END], [TX1 - 0.3, TX1, -70, Z_END], [TX0, C - 6, Z_END - 0.3, Z_END], [C + 6, TX1, Z_END - 0.3, Z_END]]) B(x0, x1, z0, z1, FL2, FL2 + 0.6, CREAM);
    band(TX0, TX1, -70, Z_END, FL2 + 0.55, FL2 + 0.65, MAROON, 0.04);
    band(TX0, TX1, -70, Z_END, FL1 - 0.25, FL1 - 0.15, MAROON, 0.05);
    D(TX0 - 0.05, TX1 + 0.05, Z_END, Z_END + 0.06, 0, FL0, PLINTH);
    // middle tier: window band, parapet, string-courses
    for (const [x0, x1, z0, z1] of [[C - 10.1, C + 10.1, -70.1, -69.8], [C - 10.1, C - 9.8, -70.1, -57.9], [C + 9.8, C + 10.1, -70.1, -57.9], [C - 10.1, C + 10.1, -58.2, -57.9]]) B(x0, x1, z0, z1, FL3 + 0.25, FL3 + 0.85, CREAM);
    band(C - 10, C + 10, -70, -58, FL3 + 0.8, FL3 + 0.9, MAROON, 0.12);
    band(C - 10, C + 10, -70, -58, FL2 + 0.15, FL2 + 0.25, MAROON, 0.04);
    for (const s of [-1, 1]) {
      for (const k of [0, 1]) winZ(C + s * (5.2 + k * 2.4), -57.9, FL2 + 1.3, 1.8, 2.0, 1, { muntins: 2 });
      for (const z of [-67, -64, -61]) winX(C + s * 10, z, FL2 + 1.3, 1.8, 2.0, s);
      D(C + s * 3.6, C + s * 9.9, -57.9, -57.3, FL3 - 0.9, FL3 - 0.75, CREAM_C);
      for (let k = 0; k < 4; k++) { const x = C + s * (4.6 + k * 1.6); D(x - 0.14, x + 0.14, -57.9, -57.84, FL3 - 0.5, FL3 - 0.22, 'c:#dcd3c1'); }
      // vertical slit windows up the tier corners (as in the drone shot)
      for (let k = 0; k < 6; k++) D(C + s * 8.9 - 0.25, C + s * 8.9 + 0.25, -57.9, -57.85, FL1 + 0.7 + k * 1.4, FL1 + 1.5 + k * 1.4, GLASS);
    }
    for (const x of [-7, -4, 4, 7]) winZ(C + x, -70.1, FL2 + 1.3, 1.8, 2.0, -1);

    // ---- foyer front, terrace, first-floor hall front ----
    kit.wall(C - 6, -47.15, C + 6, -47.15, 0, 6.4, CREAM, { thick: 0.3, openings: [{ at: 6, width: 3.2, bottom: FL0, top: 4.6 }] });
    D(C - 6.05, C + 6.05, -47.35, -46.95, 6.4, 6.55, TRIM);
    D(C - 2.0, C + 2.0, -47.0, -46.94, FL0, 4.85, MAROON); // maroon door surround
    D(C - 1.6, C + 1.6, -47.02, -46.9, FL0, 4.6, 'c:#3a2416');
    kit.wall(C - 6, -58, C + 6, -58, FL1, FL2 - 0.3, CREAM, { thick: 0.3, openings: [{ at: 6, width: 1.6, bottom: 0, top: 2.5 }, { at: 1.4, width: 1.8, bottom: 0.9, top: 3.0 }, { at: 10.6, width: 1.8, bottom: 0.9, top: 3.0 }] });
    kit.window(true, C - 4.6, -58, FL1 + 0.9, 1.8, 2.1, { glass: 'g:#8fb3c6' });
    kit.window(true, C + 4.6, -58, FL1 + 0.9, 1.8, 2.1, { glass: 'g:#8fb3c6' });
    kit.wall(C - 6.15, -66, C - 6.15, Z_END, FL0, FL2 - 0.3, CREAM, { thick: 0.3 });
    kit.wall(C + 6.15, -66, C + 6.15, Z_END, FL0, FL2 - 0.3, CREAM, { thick: 0.3 });
    for (const s of [-1, 1]) for (const z of [-56.4, -53.6]) winX(C + s * 6.0, z, FL1 + 1.1, 1.6, 2.0, -s); // room 2246/2244 windows on the terrace
    D(C - 6, C + 6, -47.3, -46.4, 4.9, 5.15, CREAM_C); // eyebrow over the door

    // ---- porte-cochère ----
    for (const px of [C - 4.8, C + 4.8]) for (const pz of [-42.1, -46.6]) { B(px - 0.4, px + 0.4, pz - 0.4, pz + 0.4, 0, 4.6, CREAM); D(px - 0.45, px + 0.45, pz - 0.45, pz + 0.45, 0, 0.7, PLINTH); }
    D(C - 5.4, C + 5.4, -47.0, -41.5, 4.6, 5.3, CREAM);
    D(C - 5.45, C + 5.45, -47.0, -41.45, 4.75, 4.85, MAROON);
    D(C - 5.0, C + 5.0, -46.9, -41.9, 4.55, 4.6, 'c:#f7f5f0');
    D(C - 5.5, C + 5.5, -47.0, -41.4, 5.3, 5.45, TRIM);
    kit.tubeLight(C, -44.5, 4.55, [1, 0]);
    kit.entrance('Main entrance (Clock Tower porch)', C, -40.5, [0, 1]);
    // cannons flanking the porch, on the forecourt
    for (const s of [-1, 1]) {
      const cx = C + s * 7.6; const cz = -44;
      for (const dz of [-0.55, 0.55]) { const w = new THREE.CylinderGeometry(0.6, 0.6, 0.1, 16); w.rotateX(Math.PI / 2); w.translate(cx, 0.6, cz + dz); kit.mesh(w, 'c:#3b3a36'); }
      const barrel = new THREE.CylinderGeometry(0.16, 0.24, 2.2, 12); barrel.rotateZ(Math.PI / 2 - 0.12); barrel.rotateY(Math.PI / 2); barrel.translate(cx, 0.85, cz + 0.3); kit.mesh(barrel, 'm:#4a4a44');
      D(cx - 0.12, cx + 0.12, cz - 1.5, cz + 0.2, 0.3, 0.55, 'c:#5a4632');
      kit.col(cx - 0.7, cx + 0.7, cz - 1.5, cz + 1.4, 0, 1.0);
      for (const dx of [-2.2, 2.2]) kit.cyl(cx + dx, -48.6, 0, 0.32, 0.55, 'c:#c9c2b4', { collide: true }); // plant pots
    }

    // ---- interior walls (shell, so a hidden zone never shows through the door) ----
    kit.wall(C - 10.5, -66.15, C - 6, -66.15, FL0, FL2 - 0.3, CREAM, { thick: 0.3 });
    kit.wall(C + 6, -66.15, C + 10.5, -66.15, FL0, FL2 - 0.3, CREAM, { thick: 0.3 });
    for (const s of [-1, 1]) {
      kit.wall(C + s * 10.65, -66, C + s * 10.65, -62, FL0, FL1 - 0.3, CREAM, { thick: 0.3 });
      kit.wall(C + s * 10.65, -66, C + s * 10.65, Z_END, FL1, FL2 - 0.3, CREAM, { thick: 0.3 });
      kit.wall(C + s * 10.5, -61.85, C + s * 17.8, -61.85, FL0, FL1 - 0.3, CREAM, { thick: 0.3 });
      kit.wall(C + s * 12.49, -61.85, C + s * 17.8, -61.85, FL1, FL2 - 0.3, CREAM, { thick: 0.3 });
      kit.wall(C + s * 12, -66.15, C + s * 17.8, -66.15, FL0, FL1 - 0.3, CREAM, { thick: 0.3 });
      kit.rail(C + s * 12.49, -66.1, C + s * 17.8, -66.1, FL1);
    }
    kit.wall(C - 6, -57.85, C + 6, -57.85, FL0, FL1 - 0.3, CREAM, { thick: 0.3, openings: [{ at: 6, width: 4, bottom: 0, top: 3.0 }] });

    // ---- inner hall round the light-court, and the Auditorium doors ----
    walk(C - 8, C + 8, AZ1, -70, 0, FL0, TERRAZZO);
    for (const s of [-1, 1]) {
      kit.wall(C + s * 7.85, AZ1, C + s * 7.85, -70, 0, 5.9, CREAM, { thick: 0.3 });
      for (const z of [-79, -75, -72.5]) winX(C + s * 8, z, 1.8, 1.4, 2.1, s);
      D(C + s * 8, C + s * 8.06, AZ1, -70, 0, FL0, PLINTH);
    }
    const court = { u0: C - 3, u1: C + 3, v0: -79, v1: -73 };
    kit.slab(C - 8, C + 8, AZ1, -70, 5.7, CREAM_C, { thick: 0.3, holes: [court], walkable: false });
    for (const [x0, x1, z0, z1] of [[C - 8, C + 8, -82, -81.7], [C - 8, C - 7.7, -82, -70], [C + 7.7, C + 8, -82, -70], [court.u0 - 0.2, court.u1 + 0.2, court.v0 - 0.2, court.v0], [court.u0 - 0.2, court.u1 + 0.2, court.v1, court.v1 + 0.2], [court.u0 - 0.2, court.u0, court.v0, court.v1], [court.u1, court.u1 + 0.2, court.v0, court.v1]]) D(x0, x1, z0, z1, 5.7, 6.3, CREAM);
    for (const [px, pz] of [[court.u0, court.v0], [court.u1, court.v0], [court.u0, court.v1], [court.u1, court.v1], [court.u0, -76], [court.u1, -76], [C, court.v0], [C, court.v1]]) B(px - 0.35, px + 0.35, pz - 0.35, pz + 0.35, FL0, 5.4, 't:plaster:#f7f4ee');
    // the planted light-court
    B(court.u0, court.u1, court.v0, court.v1, FL0, FL0 + 0.35, 'c:#bdb5a6');
    kit.flat(C, -76, FL0 + 0.36, 5.6, 5.6, 't:grass:#cfe8a8');
    for (const [dx, dz] of [[-1.6, -1.6], [1.6, 1.6], [1.5, -1.4], [-1.4, 1.5]]) { kit.cyl(C + dx, -76 + dz, FL0 + 0.35, 0.08, 1.4, 'c:#5a4632'); const cone = new THREE.ConeGeometry(0.55, 1.8, 8); cone.translate(C + dx, FL0 + 2.4, -76 + dz); kit.mesh(cone, 'c:#3f6b35'); }

    // ======================================================================================
    // CLOCK TOWER
    // ======================================================================================
    const TZ = (TZ0 + TZ1) / 2;
    const T_TOP = 31.5; // top of the shaft
    // lower face over the terrace (the tower base seen behind the porch), with the terrace door
    D(C - TW, C - 0.8, TZ1 - 0.35, TZ1 + 0.05, FL1, FL3, CREAM); D(C + 0.8, C + TW, TZ1 - 0.35, TZ1 + 0.05, FL1, FL3, CREAM);
    D(C - 0.8, C + 0.8, TZ1 - 0.35, TZ1 + 0.05, FL1 + 2.5, FL3, CREAM);
    D(C - 1.25, C + 1.25, TZ1 + 0.05, TZ1 + 0.12, FL1 + 4.8, FL1 + 7.2, MAROON); // red-framed window on the base
    D(C - 1.05, C + 1.05, TZ1 + 0.06, TZ1 + 0.14, FL1 + 5.0, FL1 + 7.0, 'c:#5a2a24');
    for (const k of [-0.5, 0, 0.5]) D(C + k * 1.05 - 0.04, C + k * 1.05 + 0.04, TZ1 + 0.1, TZ1 + 0.18, FL1 + 5.0, FL1 + 7.0, MAROON);
    D(C - 1.6, C + 1.6, TZ1, TZ1 + 0.7, FL1 + 3.9, FL1 + 4.05, CREAM_C); // little canopy over the door
    // shaft
    B(C - TW, C + TW, TZ0, TZ1, FL3, T_TOP, CREAM, { collide: false });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) D(C + sx * (TW - 0.45), C + sx * (TW + 0.08), TZ + sz * (TW - 0.45), TZ + sz * (TW + 0.08), sz > 0 ? FL1 : FL3, T_TOP, CREAM_C); // corner pilasters
    // the red-framed slot (front and back): three maroon fins, louvred panels, horizontal frames
    for (const s of [1, -1]) {
      const zf = s > 0 ? TZ1 : TZ0;
      D(C - 1.0, C + 1.0, zf, zf + s * 0.03, FL3 + 1.6, T_TOP - 1.4, 'c:#5a2a24');
      for (const k of [-1, -0.33, 0.33, 1]) D(C + k * 0.95 - 0.07, C + k * 0.95 + 0.07, zf, zf + s * 0.3, FL3 + 1.4, T_TOP - 1.2, MAROON);
      for (const y of [FL3 + 1.4, FL3 + 5.6, FL3 + 9.8, FL3 + 13.6, T_TOP - 1.35]) D(C - 1.05, C + 1.05, zf, zf + s * 0.22, y, y + 0.15, MAROON);
      for (let y = FL3 + 1.8; y < T_TOP - 1.5; y += 0.42) D(C - 0.9, C + 0.9, zf, zf + s * 0.1, y, y + 0.06, 'c:#3a1d18');
      D(C - 1.6, C + 1.6, zf, zf + s * 0.5, FL3 + 0.9, FL3 + 1.15, CREAM_C);
    }
    for (const s of [-1, 1]) for (const k of [-0.9, 0.9]) D(C + s * TW, C + s * (TW + 0.04), TZ + k - 0.06, TZ + k + 0.06, FL3 + 2, T_TOP - 2, 'c:#d8cfbd'); // grooves on the sides
    // clock stage
    const CK0 = T_TOP; const CK1 = T_TOP + 4.6;
    B(C - TW - 0.3, C + TW + 0.3, TZ0 - 0.3, TZ1 + 0.3, CK0, CK1, CREAM, { collide: false });
    for (const y of [CK0 + 0.15, CK1 - 0.3]) band(C - TW - 0.3, C + TW + 0.3, TZ0 - 0.3, TZ1 + 0.3, y, y + 0.14, MAROON, 0.05);
    band(C - TW - 0.3, C + TW + 0.3, TZ0 - 0.3, TZ1 + 0.3, CK1, CK1 + 0.35, CREAM_C, 0.35);
    const dialKey = tex('mb-dial', TEX.dial);
    const CY = (CK0 + CK1) / 2; const DR = 1.75;
    const faces = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    for (const [fx, fz] of faces) {
      const g = new THREE.CircleGeometry(DR, 40);
      g.rotateY(Math.atan2(fx, fz));
      g.translate(C + fx * (TW + 0.33), CY, TZ + fz * (TW + 0.33));
      kit.mesh(g, dialKey);
    }
    // belfry: an open arched stage
    const BF0 = CK1 + 0.35; const BF1 = BF0 + 3.4; const BW = 2.5;
    const arch = new THREE.Shape();
    arch.moveTo(0, 0); arch.lineTo(1.0, 0); arch.lineTo(1.0, 1.4); arch.absarc(BW, 1.4, BW - 1.0, Math.PI, 0, true); arch.lineTo(2 * BW - 1.0, 0); arch.lineTo(2 * BW, 0); arch.lineTo(2 * BW, BF1 - BF0); arch.lineTo(0, BF1 - BF0); arch.lineTo(0, 0);
    const archAt = (g, yaw, cx, cz) => { g.translate(-BW, 0, -0.25); g.rotateY(yaw); g.translate(cx, BF0, cz); geoKey(g, CREAM); };
    for (const [fx, fz] of faces) archAt(new THREE.ExtrudeGeometry(arch, { depth: 0.5, bevelEnabled: false }), Math.atan2(fx, fz), C + fx * (BW - 0.25), TZ + fz * (BW - 0.25));
    for (const [fx, fz] of faces) { const g = new THREE.BoxGeometry(2 * BW - 2, 0.12, 0.08); g.rotateY(Math.atan2(fx, fz)); g.translate(C + fx * (BW + 0.02), BF0 + 1.25, TZ + fz * (BW + 0.02)); kit.mesh(g, MAROON); }
    kit.cyl(C, TZ, BF0 + 0.6, 0.55, 1.0, 'm:#6a5a3a', { rTop: 0.25 });
    D(C - BW, C + BW, TZ - BW, TZ + BW, BF0 - 0.02, BF0 + 0.02, 'c:#d8d0c0');
    // bangla cupola: a square curved roof (four-sided lathe) edged in red, a small dome and a finial
    const cupola = new THREE.LatheGeometry([[0.01, 1.9], [0.9, 1.75], [1.9, 1.35], [2.9, 0.8], [3.6, 0.25], [3.9, -0.1], [3.75, -0.2]].map(([r, y]) => new THREE.Vector2(r, y)), 4, Math.PI / 4);
    cupola.translate(C, BF1 + 0.2, TZ); kit.mesh(cupola, CREAM_C);
    const rim = new THREE.LatheGeometry([[3.62, 0.0], [3.98, -0.12], [3.84, -0.28], [3.5, -0.08]].map(([r, y]) => new THREE.Vector2(r, y)), 4, Math.PI / 4);
    rim.translate(C, BF1 + 0.2, TZ); kit.mesh(rim, MAROON);
    D(C - BW - 0.1, C + BW + 0.1, TZ - BW - 0.1, TZ + BW + 0.1, BF1 - 0.05, BF1 + 0.25, CREAM_C);
    kit.cyl(C, TZ, BF1 + 1.9, 0.75, 0.6, CREAM_C, { seg: 16 });
    const dome = new THREE.SphereGeometry(0.8, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2); dome.translate(C, BF1 + 2.5, TZ); kit.mesh(dome, CREAM_C);
    kit.cyl(C, TZ, BF1 + 3.25, 0.06, 1.4, 'm:#b9974f', { seg: 6 });
    for (const y of [BF1 + 3.5, BF1 + 3.85]) { const s = new THREE.SphereGeometry(0.14, 8, 6); s.translate(C, y, TZ); kit.mesh(s, 'm:#b9974f'); }
    D(C - 0.02, C + 0.6, TZ - 0.02, TZ + 0.02, BF1 + 4.3, BF1 + 4.5, 'm:#3a3a3a'); // weather-vane

    // ======================================================================================
    // AUDITORIUM (Main Building Hall): pitched corrugated roof, cream gables
    // ======================================================================================
    const AC = (A0 + A1) / 2; const AH = (A1 - A0) / 2; const EAVE = 10.9; const RIDGE = 16.5;
    walk(A0, A1, AZ0, AZ1, 0, FL0, 't:wood:#9a7650');
    kit.wall(A0 + 0.2, AZ0, A0 + 0.2, AZ1, 0, EAVE, CREAM, { thick: 0.4 });
    kit.wall(A1 - 0.2, AZ0, A1 - 0.2, AZ1, 0, EAVE, CREAM, { thick: 0.4 });
    kit.wall(A0, AZ0 + 0.2, A1, AZ0 + 0.2, 0, EAVE, CREAM, { thick: 0.4 });
    kit.wall(A0, AZ1 - 0.2, A1, AZ1 - 0.2, 0, EAVE, CREAM, { thick: 0.4, openings: [{ at: C - A0, width: 3.0, bottom: FL0, top: FL0 + 3.4 }] });
    const gable = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(2 * AH, 0), new THREE.Vector2(AH, RIDGE - EAVE)]);
    for (const z of [AZ0 + 0.2, AZ1 - 0.2]) { const g = new THREE.ExtrudeGeometry(gable, { depth: 0.4, bevelEnabled: false }); g.translate(A0, EAVE, z - 0.2); geoKey(g, CREAM); }
    const slope = Math.atan2(RIDGE - EAVE, AH); const slopeLen = Math.hypot(AH, RIDGE - EAVE) + 0.9;
    const corr = tex('mb-corrugated', TEX.corrugated);
    for (const s of [-1, 1]) {
      const g = new THREE.BoxGeometry(slopeLen, 0.12, AZ1 - AZ0 + 1.2);
      g.rotateZ(s * slope);
      g.translate(AC + s * (AH / 2 + 0.2), (EAVE + RIDGE) / 2 + 0.1, (AZ0 + AZ1) / 2);
      kit.mesh(g, corr);
      // louvred clerestory hoods and windows along the long walls
      const fx = s < 0 ? A0 : A1;
      for (let z = AZ0 + 4; z < AZ1 - 3; z += 6) {
        winX(fx, z, 2.6, 2.0, 2.6, s, { glass: 'c:#4a4f4a' });
        D(fx, fx + s * 0.8, z - 1.4, z + 1.4, 7.6, 7.75, 'c:#a3533c'); // small red-tiled hood
        winX(fx, z, 8.0, 1.6, 1.4, s, { glass: 'c:#5c5a52' });
      }
      D(fx, fx + s * 0.06, AZ0, AZ1, 0, FL0, PLINTH);
      D(fx, fx + s * 0.07, AZ0, AZ1, EAVE - 0.4, EAVE - 0.3, MAROON);
    }
    D(AC - 0.15, AC + 0.15, AZ0 - 0.6, AZ1 + 0.6, RIDGE + 0.15, RIDGE + 0.4, 'm:#7d8285');
    for (const z of [AZ0 - 0.0, AZ1]) { const g = new THREE.CircleGeometry(0.9, 20); g.rotateY(z < -100 ? Math.PI : 0); g.translate(AC, RIDGE - 2.6, z + (z < -100 ? -0.02 : 0.02)); kit.mesh(g, 'c:#6d6253'); } // round gable louvres
    kit.layer('auditorium', () => {
      // stage, proscenium, curtain
      walk(A0 + 0.4, A1 - 0.4, AZ0 + 0.4, AZ0 + 8.5, FL0, FL0 + 1.1, 't:wood:#7b5a3c');
      kit.flight(AC, AZ0 + 9.6, FL0, [0, -1], 4, 0.275, 3, 't:wood:#7b5a3c', { tread: 0.28 });
      D(A0 + 0.4, A0 + 3.5, AZ0 + 8.3, AZ0 + 8.6, FL0, 9.5, CREAM_C); D(A1 - 3.5, A1 - 0.4, AZ0 + 8.3, AZ0 + 8.6, FL0, 9.5, CREAM_C);
      D(A0 + 0.4, A1 - 0.4, AZ0 + 8.3, AZ0 + 8.6, 8.2, 9.5, CREAM_C);
      D(A0 + 3.5, A1 - 3.5, AZ0 + 3.0, AZ0 + 3.15, FL0 + 1.1, 8.2, 'c:#7a1f24');
      kit.sign('BITS PILANI', AC, AZ0 + 8.62, 8.5, [0, 1], { width: 6, height: 0.8, bg: '#efe8d6', fg: '#7a2622' });
      // seating: two blocks of bench rows with a centre aisle and side aisles
      for (let z = AZ0 + 13; z < AZ1 - 4; z += 1.1) {
        for (const [x0, x1] of [[A0 + 2.2, AC - 1.0], [AC + 1.0, A1 - 2.2]]) {
          D(x0, x1, z, z + 0.45, FL0 + 0.4, FL0 + 0.48, 'c:#8a2b2b');
          D(x0, x1, z + 0.42, z + 0.5, FL0 + 0.48, FL0 + 0.95, 'c:#7a2424');
          for (let x = x0; x <= x1 + 1e-6; x += (x1 - x0) / 6) D(x - 0.03, x + 0.03, z + 0.05, z + 0.45, FL0, FL0 + 0.4, 'm:#4a4f55');
          kit.col(x0, x1, z, z + 0.5, FL0, FL0 + 0.95);
        }
      }
      // roof trusses, wall lights, tube lights
      for (let z = AZ0 + 3; z < AZ1; z += 6) {
        D(A0 + 0.4, A1 - 0.4, z - 0.1, z + 0.1, EAVE - 0.25, EAVE - 0.05, 'm:#6a6f72');
        for (const s of [-1, 1]) { const g = new THREE.BoxGeometry(AH - 0.4, 0.18, 0.18); g.rotateZ(s * slope); g.translate(AC + s * (AH / 2), (EAVE + RIDGE) / 2 - 0.6, z); kit.mesh(g, 'm:#6a6f72'); }
        kit.tubeLight(A0 + 0.7, z + 1.5, 6.5, [0, 1]); kit.tubeLight(A1 - 0.7, z + 1.5, 6.5, [0, 1]);
        kit.tubeLight(AC, z + 1.5, EAVE - 0.3, [1, 0]);
      }
      kit.room('auditorium-main', 'Main Building Auditorium', A0, A1, AZ0, AZ1, FL0, EAVE, 0);
    });

    // ======================================================================================
    // TOWER BLOCK INTERIOR (foyer, inner foyer, corridor, inner hall, stair halls, first floor)
    // ======================================================================================
    kit.layer('tower', () => {
      const y = FL0;
      // foyer: grey/white checkerboard marble, stone pilasters, coffered ceiling
      kit.flat(C, -52.6, y + 0.01, 11.7, 10.5, tex('mb-checker-foyer', () => TEX.checker([11.7 / 1.2, 10.5 / 1.2])));
      for (const s of [-1, 1]) for (let z = -56.5; z <= -48.5; z += 2.6) D(C + s * 5.7, C + s * 6.0, z - 0.3, z + 0.3, y, FL1 - 0.3, 'c:#d9d3c7');
      for (let x = C - 4.5; x <= C + 4.5; x += 1.5) D(x - 0.1, x + 0.1, -57.7, -47.3, FL1 - 0.62, FL1 - 0.3, 'c:#f6f3ec');
      for (let z = -56.5; z <= -48; z += 1.5) D(C - 5.85, C + 5.85, z - 0.1, z + 0.1, FL1 - 0.62, FL1 - 0.3, 'c:#f6f3ec');
      for (const z of [-55.5, -50]) kit.tubeLight(C, z, FL1 - 0.62, [1, 0]);
      // the front doors: carved wooden folding leaves, open against the walls; steel rails beside the steps
      const carved = tex('mb-carved', TEX.carved);
      for (const s of [-1, 1]) D(C + s * 1.6, C + s * 3.2, -47.42, -47.32, y, y + 3.6, carved);
      for (const s of [-1, 1]) kit.rail(C + s * 4.05, -41.95, C + s * 4.05, -44.15, 0.5, STEEL, { h: 0.9 });
      // inner foyer: white marble with a brown star inlay, the bust, murals, a welcome screen, carved doors
      kit.flat(C, -62, y + 0.01, 11.7, 7.7, tex('mb-starfloor', TEX.starFloor));
      for (const s of [-1, 1]) D(C + s * 2.0, C + s * 3.9, -58.12, -58.02, y, y + 3.0, carved);
      B(C - 0.5, C + 0.5, -62.6, -61.6, y, y + 1.1, 'c:#8f9294');
      D(C - 0.55, C + 0.55, -62.65, -61.55, y + 1.1, y + 1.18, 'c:#a7aaac');
      D(C - 0.32, C + 0.32, -62.3, -61.9, y + 1.18, y + 1.55, 'm:#6e5232');
      { const head = new THREE.SphereGeometry(0.17, 14, 10); head.scale(1, 1.2, 1); head.translate(C, y + 1.78, -62.1); kit.mesh(head, 'm:#6e5232'); }
      kit.sign('कुलपति पद्मश्री शुकदेव पाण्डे', C, -61.54, y + 0.55, [0, 1], { width: 0.9, height: 0.22, bg: '#3a3a36', fg: '#e8d9a6', font: 'bold 60px sans-serif' });
      for (const [s, hue] of [[-1, 30], [1, 200]]) {
        const key = tex(`mb-mural-${hue}`, () => TEX.mural(hue));
        kit.plane(C + s * 5.98, -62, y + 1.0, 4.2, 2.6, [-s, 0], key, { offset: 0.02 });
      }
      kit.sign('Welcome to BITS Pilani', C, -57.7, 3.95, [0, 1], { width: 2.6, height: 0.6, bg: '#123049', fg: '#ffffff', font: 'bold 60px Arial, sans-serif' });
      for (let x = C - 4.5; x <= C + 4.5; x += 1.5) D(x - 0.12, x + 0.12, -65.9, -58.1, FL1 - 0.7, FL1 - 0.3, 'c:#f8f6f1');
      for (let z = -64.5; z <= -59; z += 1.5) D(C - 5.85, C + 5.85, z - 0.12, z + 0.12, FL1 - 0.7, FL1 - 0.3, 'c:#f8f6f1');
      kit.tubeLight(C, -62, FL1 - 0.7, [1, 0]);
      for (const s of [-1, 1]) { D(C + s * 4.6 - 0.45, C + s * 4.6 + 0.45, -65.4, -64.5, y, y + 0.55, WOOD); kit.cyl(C + s * 4.6, -64.95, y + 0.55, 0.3, 0.6, 'c:#4f7f36'); kit.col(C + s * 4.6 - 0.45, C + s * 4.6 + 0.45, -65.4, -64.5, y, y + 0.55); }
      // cross corridor
      for (let x = C - 16; x <= C + 16; x += 4) kit.tubeLight(x, -68, FL1 - 0.3, [1, 0]);
      for (const s of [-1, 1]) { kit.board(C + s * 9, -69.58, y, [0, 1], { w: 2.4, h: 1.1, key: 'c:#b48a5a' }); kit.sign(s < 0 ? '← Stairs · FD-III · 2151–2154' : 'Stairs · FD-II · 2145 →', C + s * 14, -69.58, 2.9, [0, 1], { width: 3.2, height: 0.34, bg: '#7a2622' }); }
      // inner hall: marble with a brown border, relief ceiling, carved Auditorium doors between stone relief panels
      kit.flat(C, -76, y + 0.005, 15.4, 11.6, 'c:#f1eee7');
      for (const [x0, x1, z0, z1] of [[C - 7.7, C + 7.7, -81.6, -81.2], [C - 7.7, C + 7.7, -70.8, -70.4], [C - 7.7, C - 7.3, -81.6, -70.4], [C + 7.3, C + 7.7, -81.6, -70.4]]) D(x0, x1, z0, z1, y, y + 0.012, 'c:#7a4a2a');
      for (const [x0, x1] of [[C - 7.7, C - 3.2], [C + 3.2, C + 7.7]]) for (let x = x0 + 1.1; x < x1; x += 1.1) D(x - 0.1, x + 0.1, -81.6, -70.2, 5.1, 5.4, 'c:#f8f6f1');
      for (const [z0, z1] of [[-81.6, -79.2], [-72.8, -70.2]]) for (let z = z0 + 0.8; z < z1; z += 1.0) D(C - 3.2, C + 3.2, z - 0.1, z + 0.1, 5.1, 5.4, 'c:#f8f6f1');
      for (const s of [-1, 1]) for (const z of [-80.5, -71.5]) kit.tubeLight(C + s * 5.5, z, 5.1, [0, 1]);
      const relief = tex('mb-relief', TEX.relief);
      for (const s of [-1, 1]) { kit.plane(C + s * 3.2, -81.98, y + 0.3, 1.6, 3.4, [0, 1], relief); D(C + s * 1.5 - 0.05, C + s * 1.5 + 0.05, -81.98, -80.5, y, y + 3.3, carved); }
      kit.sign('AUDITORIUM', C, -81.98, FL0 + 3.55, [0, 1], { width: 3.0, height: 0.42, bg: '#5a3a22', fg: '#f3e2b8' });
      for (const s of [-1, 1]) { kit.cyl(C + s * 2.2, -73.5, y, 0.35, 0.7, 'c:#a65a3a'); kit.cyl(C + s * 2.2, -73.5, y + 0.7, 0.45, 0.5, 'c:#4f7f36'); }
      // first floor: corridor, hall over the inner foyer (conference table), side halls to the verandahs
      const y1 = FL1;
      for (let x = C - 16; x <= C + 16; x += 4) kit.tubeLight(x, -68, FL2 - 0.3, [1, 0]);
      kit.desk(C, -62.5, y1, [0, 1], { w: 4.2, d: 1.4, top: 't:wood:#6a4a30', legs: 'c:#3b2a1c' });
      for (const dx of [-1.5, -0.5, 0.5, 1.5]) { kit.chair(C + dx, -61.4, y1, [0, -1], { seat: 'c:#5a3a2a' }); kit.chair(C + dx, -63.6, y1, [0, 1], { seat: 'c:#5a3a2a' }); }
      kit.tubeLight(C, -64, FL2 - 0.3, [1, 0]); kit.tubeLight(C, -60, FL2 - 0.3, [1, 0]);
      for (const s of [-1, 1]) {
        const hx = C + s * 14.4;
        kit.tubeLight(hx, -59, FL2 - 0.3, [0, 1]); kit.tubeLight(hx, -55, FL2 - 0.3, [0, 1]);
        kit.board(C + s * 10.82, -57.5, y1, [s, 0], { w: 2.4, h: 1.1, key: 'c:#b48a5a' });
        D(hx - 0.9 + s * 1.5, hx + 0.9 + s * 1.5, -60.6, -60.2, y1 + 0.42, y1 + 0.48, WOOD);
        kit.sign(s < 0 ? '→ West verandah · 2247A Physics Lab' : '→ East verandah · 2243', C + s * 17.58, -58.0, y1 + 2.2, [-s, 0], { width: 3.4, height: 0.32, bg: '#7a2622' });
        doorZ(C + s * 8.3, -66.3, y1, 1.2, -1, { h: 2.4 }); // rooms 2246 / 2244 (closed) off the corridor
        kit.sign(s < 0 ? '2246' : '2244', C + s * 8.3, -66.34, y1 + 2.55, [0, -1], { width: 0.6, height: 0.22, bg: '#ffffff', fg: '#222222' });
      }
      kit.room('foyer', 'Foyer (Admin Block)', C - 6, C + 6, -58, -47, FL0, FL1, 0);
      kit.room('inner-foyer', 'Inner foyer', C - 6, C + 6, -66, -58, FL0, FL1, 0);
      kit.room('inner-hall', 'Inner hall', C - 8, C + 8, AZ1, -70, FL0, 5.4, 0);
      kit.room('first-floor', 'First-floor hall', C - 6, C + 6, -66, -58, FL1, FL2, 1);
    });
    kit.floors.push({ y: FL0, name: 'Ground' }, { y: FL1, name: 'First' });

    // ======================================================================================
    // FRONT GARDENS (lawns, hedges, cypress cones)
    // ======================================================================================
    for (const [x0, x1] of [[W0 + 2, TX0 - 1], [TX1 + 1, E1 - 1]]) {
      kit.flat((x0 + x1) / 2, (ZP + 0.7 - 41.2) / 2, 0.035, x1 - x0, -41.2 - (ZP + 0.7), 't:grass:#d6efb4');
      for (let x = x0 + 2; x < x1 - 1; x += 4.5) { const cone = new THREE.ConeGeometry(0.55, 3.2, 8); cone.translate(x, 1.6 + 0.3, -43); kit.mesh(cone, 'c:#3c6a33'); kit.cyl(x, -43, 0, 0.08, 0.35, 'c:#5a4632'); }
      D(x0, x1, -41.0, -40.5, 0, 0.6, 'c:#4f7f36');
    }
    for (const s of [-1, 1]) { kit.flat(C + s * 9.5, -45.5, 0.035, 4.4, 8, 't:grass:#d6efb4'); D(C + s * 5.7, C + s * 5.9 + s * 0.0, -47.3, -41.3, 0, 0.5, 'c:#4f7f36'); }
    kit.flat(C, -39, 0.04, 10.4, 3.2, STONE); // apron from the drive to the porch steps

    // ======================================================================================
    // ROTUNDA (sunken plaza at the origin)
    // ======================================================================================
    const sinD = (d) => Math.sin((d * Math.PI) / 180); const cosD = (d) => Math.cos((d * Math.PI) / 180);
    const P = (r, d) => [r * sinD(d), -r * cosD(d)]; // φ in degrees from north, clockwise (east = 90)
    const WALL_END = 62; // the niche wall runs φ -62…62 (north); terraces fill the rest
    const TR0 = 12.6; const TR1 = 15.4; // stair trenches through the wall at x ±12.6…15.4 (NE and NW doorways)
    const RUN = 24 * 0.28; const TZTOP = -21.5 - RUN; // trench stairs climb north to the forecourt
    const gapD = [Math.asin(TR0 / ROT_R) * 180 / Math.PI, Math.asin(TR1 / ROT_R) * 180 / Math.PI];
    // the pit: a circle with the two trench tabs
    const poly = [];
    const zc = (x) => -Math.sqrt(ROT_R * ROT_R - x * x);
    const NP = 120;
    for (let k = 0; k < NP; k++) {
      const [x, z] = P(ROT_R, -180 + (k * 360) / NP);
      if (z < 0 && ((x > TR0 && x < TR1) || (x > -TR1 && x < -TR0))) continue;
      poly.push([x, z]);
      const [xn] = P(ROT_R, -180 + ((k + 1) * 360) / NP);
      for (const [ga, gb] of [[-TR1, -TR0], [TR0, TR1]]) if (z < 0 && x <= ga && xn > ga) poly.push([ga, zc(ga)], [ga, TZTOP], [gb, TZTOP], [gb, zc(gb)]);
    }
    kit.pit(poly, ROT_Y);
    // floor with the star paving
    const fl = new THREE.CircleGeometry(ROT_R, 96); fl.rotateX(-Math.PI / 2); fl.translate(0, ROT_Y + 0.01, 0);
    kit.mesh(fl, tex('mb-rotunda-floor', TEX.floor));
    // north niche wall: one bay per chord, ochre with white-framed cusped niches, emblem in the middle
    const niche = tex('mb-niche', TEX.niche); const jali = tex('mb-jali', TEX.jali);
    const WH = -ROT_Y; // wall height above the floor
    const runs = [[-WALL_END, -gapD[1], 4], [-gapD[0], gapD[0], 9], [gapD[1], WALL_END, 4]];
    for (const [d0, d1, n] of runs) {
      for (let i = 0; i < n; i++) {
        const a = d0 + ((d1 - d0) * i) / n; const b = d0 + ((d1 - d0) * (i + 1)) / n; const m = (a + b) / 2;
        const half = ((b - a) / 2) * Math.PI / 180; const chord = 2 * ROT_R * Math.sin(half); const rIn = ROT_R * Math.cos(half);
        const [cx, cz] = P(rIn + 0.3, m); const yaw = -(m * Math.PI) / 180;
        rbox(cx, cz, yaw, chord + 0.04, WH, 0.6, ROT_Y, OCHRE);
        const [px, pz] = P(rIn - 0.01, m);
        const pl = new THREE.PlaneGeometry(chord, WH); pl.rotateY(yaw); pl.translate(px, ROT_Y + WH / 2, pz); kit.mesh(pl, niche);
        // jali parapet, coping and the steel rail at grade
        const [jx, jz] = P(rIn + 0.3, m);
        const jl = new THREE.PlaneGeometry(chord, 0.8); jl.rotateY(yaw); jl.translate(jx, 0.4, jz); kit.mesh(jl, jali);
        rbox(jx, jz, yaw, chord + 0.04, 0.12, 0.7, 0.8, TRIM);
        rbox(jx, jz, yaw, chord + 0.04, 0.05, 0.05, 1.55, STEEL);
        const [qx, qz] = P(rIn + 0.3, a); kit.cyl(qx, qz, 0.92, 0.03, 0.65, STEEL, { seg: 6 });
        rbox(cx, cz, yaw, chord + 0.05, 0.25, 0.64, -0.25, 'c:#f4efe2');
      }
      for (let d = d0; d <= d1 + 1e-6; d += 0.8 / ROT_R * 180 / Math.PI) { const [x, z] = P(ROT_R + 0.3, d); kit.col(x - 0.45, x + 0.45, z - 0.45, z + 0.45, ROT_Y, 1.5); }
    }
    const emb = new THREE.CircleGeometry(1.35, 40); emb.translate(0, ROT_Y + 2.35, -ROT_R + 0.06); kit.mesh(emb, tex('mb-emblem', TEX.emblem));
    // the doorways (white frames) and the trench stairs up to the forecourt
    for (const s of [-1, 1]) {
      const xa = s < 0 ? -TR1 : TR0; const xb = s < 0 ? -TR0 : TR1; const xm = (xa + xb) / 2;
      const za = zc(xa); const zb = zc(xb);
      const lintel = new THREE.BoxGeometry(Math.hypot(xb - xa, zb - za) + 0.4, 2.0, 0.62); lintel.rotateY(-Math.atan2(zb - za, xb - xa)); lintel.translate(xm, -1.0, (za + zb) / 2 - 0.3); kit.mesh(lintel, OCHRE);
      const fr = new THREE.BoxGeometry(Math.hypot(xb - xa, zb - za) + 0.6, 0.25, 0.1); fr.rotateY(-Math.atan2(zb - za, xb - xa)); fr.translate(xm, -1.9, (za + zb) / 2 + 0.03); kit.mesh(fr, TRIM);
      for (const x of [xa, xb]) {
        const inner = x === xa ? xa + 0.0 : xb; const sideOut = x === xa ? -1 : 1;
        B(inner + (sideOut < 0 ? -0.3 : 0), inner + (sideOut < 0 ? 0 : 0.3), TZTOP, zc(x), ROT_Y, 0, OCHRE);
        D(inner + (sideOut < 0 ? -0.35 : -0.05), inner + (sideOut < 0 ? 0.05 : 0.35), zc(x) - 0.3, zc(x) + 0.05, ROT_Y, -1.9, TRIM);
        kit.rail(inner + sideOut * 0.15, TZTOP, inner + sideOut * 0.15, zc(x) - 0.3, 0, STEEL);
      }
      kit.flight(xm, -21.5, ROT_Y, [0, -1], 24, 0.1875, xb - xa, STONE, { tread: 0.28 });
      walk(xa, xb, -21.5, Math.max(za, zb) + 0.6, ROT_Y - 0.2, ROT_Y + 0.0, STONE);
      kit.navLinks.push([[xm, TZTOP - 1.0], [xm, -17]]);
      kit.entrance(s < 0 ? 'Rotunda NW stair' : 'Rotunda NE stair', xm, TZTOP - 1.0, [0, -1]);
    }
    // amphitheatre terraces E, S and W with stair aisles at φ = 90, 180, 270
    const TIERS = 10; const T_IN = 17; const T_D = 0.8; const T_H = -ROT_Y / TIERS;
    const AISLE = 1.25;
    const banks = [[WALL_END, 90], [90, 180], [180, 270], [270, 360 - WALL_END]];
    const aisleAt = new Set([90, 180, 270]);
    for (let k = 1; k <= TIERS; k++) {
      const r0 = T_IN + T_D * (k - 1); const r1 = r0 + T_D; const top = ROT_Y + T_H * k;
      const trim = (Math.asin(AISLE / r0) * 180) / Math.PI;
      for (const [b0, b1] of banks) {
        const d0 = b0 + (aisleAt.has(b0) ? trim : 0); const d1 = b1 - (aisleAt.has(b1) ? trim : 0);
        const steps = Math.max(4, Math.ceil(((d1 - d0) * Math.PI / 180) * r1 / 1.2));
        const sh = new THREE.Shape();
        for (let i = 0; i <= steps; i++) { const d = d0 + ((d1 - d0) * i) / steps; const [x, z] = P(r1, d); i ? sh.lineTo(x, -z) : sh.moveTo(x, -z); }
        for (let i = steps; i >= 0; i--) { const d = d0 + ((d1 - d0) * i) / steps; const [x, z] = P(r0, d); sh.lineTo(x, -z); }
        const g = new THREE.ExtrudeGeometry(sh, { depth: top - ROT_Y, bevelEnabled: false });
        g.rotateX(-Math.PI / 2); g.translate(0, ROT_Y, 0);
        geoKey(g, k % 2 ? 't:paving:#d9c7a6' : 't:paving:#cdb995');
        if (k % 2 === 0 && k < TIERS) { // grass band on the back of every other tier
          const gs = new THREE.Shape();
          for (let i = 0; i <= steps; i++) { const d = d0 + ((d1 - d0) * i) / steps; const [x, z] = P(r1 - 0.02, d); i ? gs.lineTo(x, -z) : gs.moveTo(x, -z); }
          for (let i = steps; i >= 0; i--) { const d = d0 + ((d1 - d0) * i) / steps; const [x, z] = P(r1 - 0.3, d); gs.lineTo(x, -z); }
          const gg = new THREE.ShapeGeometry(gs); gg.rotateX(-Math.PI / 2); gg.translate(0, top + 0.01, 0); geoKey(gg, 't:grass:#cfe8a8');
        }
        // colliders: walkable cells along the arc
        const cells = Math.max(2, Math.ceil(((d1 - d0) * Math.PI / 180) * r1 / 1.5));
        for (let i = 0; i < cells; i++) {
          const da = d0 + ((d1 - d0) * i) / cells; const db = d0 + ((d1 - d0) * (i + 1)) / cells;
          const pts = [P(r0 + 0.05, da), P(r1 - 0.05, da), P(r0 + 0.05, db), P(r1 - 0.05, db), P(r1 - 0.05, (da + db) / 2)];
          const xs = pts.map((p) => p[0]); const zs = pts.map((p) => p[1]);
          kit.col(Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs), ROT_Y, top, true);
        }
      }
    }
    // the stair aisles (24 risers of 0.1875 over the 8 m of terraces)
    kit.flight(T_IN, 0, ROT_Y, [1, 0], 24, 0.1875, 2 * AISLE, STONE, { tread: (TIERS * T_D) / 24 });
    kit.flight(-T_IN, 0, ROT_Y, [-1, 0], 24, 0.1875, 2 * AISLE, STONE, { tread: (TIERS * T_D) / 24 });
    kit.flight(0, T_IN, ROT_Y, [0, 1], 24, 0.1875, 2 * AISLE, STONE, { tread: (TIERS * T_D) / 24 });
    for (const [a, b] of [[[ROT_R + 1.5, 0], [12, 0]], [[-ROT_R - 1.5, 0], [-12, 0]], [[0, ROT_R + 1.5], [0, 12]]]) kit.navLinks.push([a, b]);
    kit.entrance('Rotunda east steps', ROT_R + 0.8, 0, [1, 0]); kit.entrance('Rotunda west steps', -ROT_R - 0.8, 0, [-1, 0]); kit.entrance('Rotunda south steps', 0, ROT_R + 0.8, [0, 1]);
    // bougainvillea beds at the NE and NW rims, date palms either side of the south opening
    for (const s of [-1, 1]) {
      const bs = new THREE.Shape();
      for (let i = 0; i <= 10; i++) { const d = s * (40 + i * 1.7); const [x, z] = P(30.5, d); i ? bs.lineTo(x, -z) : bs.moveTo(x, -z); }
      for (let i = 10; i >= 0; i--) { const d = s * (40 + i * 1.7); const [x, z] = P(26.2, d); bs.lineTo(x, -z); }
      const bg = new THREE.ShapeGeometry(bs); bg.rotateX(-Math.PI / 2); bg.translate(0, 0.08, 0); kit.mesh(bg, 'c:#b8323a');
      for (let i = 0; i < 6; i++) { const [x, z] = P(28.3, s * (41.5 + i * 2.8)); const sp = new THREE.SphereGeometry(0.75 + (i % 2) * 0.2, 8, 6); sp.scale(1, 0.75, 1); sp.translate(x, 0.55, z); kit.mesh(sp, i % 2 ? 'c:#c2385a' : 'c:#a8283a'); }
    }
    campus.palmPts ||= [];
    for (const s of [-1, 1]) campus.palmPts.push([Math.sin(s * 0.62) * 29.5, Math.cos(s * 0.62) * 29.5], [Math.sin(s * 0.75) * 33, Math.cos(s * 0.75) * 33]);
    // keep the scattered campus trees off the porch, the front gardens and the trench stairs (buildTrees skips
    // anything within 9 m of these points)
    campus.statuePts ||= [];
    campus.statuePts.push([C - 4, -43], [C + 4, -43], [-TR1 + 1.4, TZTOP - 1], [TR0 + 1.4, TZTOP - 1]);
    for (let x = W0 + 4; x < E1; x += 11) campus.statuePts.push([x, -49]);

    // ---- gameplay spots: assembly on the Rotunda floor, the principal on the porch terrace ----
    campus.spots.assembly = [];
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2; const rr = 11 + (i % 2) * 4;
      campus.spots.assembly.push(new THREE.Vector3(Math.cos(a) * rr, ROT_Y, Math.sin(a) * rr));
    }
    campus.spots.assemblyPlayer = new THREE.Vector3(0, ROT_Y, 14);
    campus.spots.stage = new THREE.Vector3(C, FL0, -45.6);
    kit.room('rotunda', 'Rotunda', -ROT_R, ROT_R, -ROT_R, ROT_R, ROT_Y, 0, -1);

    // ---- the clock hands: they follow the game clock (or the explorer's) while the dials are in view ----
    const hands = new THREE.Group(); hands.name = 'main-building:clock-hands';
    const handMat = new THREE.MeshStandardMaterial({ color: '#1d1d1d', roughness: 0.6 });
    const sets = [];
    for (const [fx, fz] of faces) {
      const f = new THREE.Group();
      f.position.set(C + fx * (TW + 0.36), CY, TZ + fz * (TW + 0.36));
      f.rotation.y = Math.atan2(fx, fz);
      const hg = new THREE.BoxGeometry(0.16, 1.0, 0.03); hg.translate(0, 0.42, 0);
      const mg = new THREE.BoxGeometry(0.1, 1.45, 0.03); mg.translate(0, 0.62, 0.02);
      const h = new THREE.Mesh(hg, handMat); const m = new THREE.Mesh(mg, handMat);
      f.add(h, m); hands.add(f); sets.push([h, m]);
    }
    const tick = () => {
      const G = typeof window !== 'undefined' ? window.__game : null;
      const t = G?.state?.day?.clock ?? G?.explorer?.clock ?? 10 * 60 + 10;
      for (const [h, m] of sets) { h.rotation.z = -((t % 720) / 720) * Math.PI * 2; m.rotation.z = -((t % 60) / 60) * Math.PI * 2; }
    };
    tick();
    sets[0][0].onBeforeRender = tick;
    campus.root.add(hands);
    kit.sprites = [...(kit.sprites || []), hands];
  },
};
