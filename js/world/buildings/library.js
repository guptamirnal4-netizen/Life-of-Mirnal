// BITS Library: detailed exterior and interior. Research: research/buildings/library.md (and research/review.md 5.1).
//
// Local frame (as in the research report): u metres east along the long axis, v metres south, origin at the
// footprint's centroid (214.8, -221.3); the axis is rotated 7.94° (the east end lies further north).
//
// Levels: the ground floor stands on a 0.6 m plinth (G), reached by the fan steps and ramps at the west portico;
// the first floor is at F1 and the roof at R (parapet above). The gameplay room 'library' (Hall 4's reading room)
// stays where placeRooms put it, at bare-ground level, with its south door to the outside; this module cuts a
// second door in its east wall that opens, three steps down, from Hall 4, which opens off the rotunda.
//
// Layers: 'shell' (exterior, always drawn); interior zones 'structure' (floors, ceilings, linings), 'west'
// (foyer, twin stairs, Area 1, galleries, Hall 1, Heritage Gallery, Hall 6 upstairs), 'centre' (rotunda), 'south'
// (Halls 4 and 5), 'east' (east lobby, Halls 2 and 3). Walkable floors are world-aligned collider strips built
// from a height function, so the plinth, the sunken rotunda court, the steps and the ramps are all exact.
import * as THREE from 'three';
import { worldBoxGeometry, TEX_SIZE } from '../textures.js';

const DEG = Math.PI / 180;
const ROT = 7.94 * DEG;
const ORIGIN = [214.8, -221.3];
const G = 0.6; // ground floor (top of the plinth)
const F1 = 5.2; // first floor
const R = 9.8; // roof
const PAR = 0.9; // parapet
const WT = 0.3; // interior walls
const FAC = 0.45; // facade wall thickness (inwards from the OSM outline)
const STEPS = 24; // per twin stair flight
const TREAD = 0.28;
const STAIR_U0 = -24.4 - STEPS * TREAD; // foot of the twin stairs; they climb east to the bridge at u -24.4
const ROT_R = 8; // rotunda colonnade radius
const COURT_R = 6.0; // gravel court
const RING_R = 6.5; // marble step ring round it

// world-size of one repeat of the module's own canvas textures
const XT = { ashlar: 3.6, marble: 4, kota: 2.4, gravel: 2, jali: 0.9, pavers: 2.0, spines: 1.2, diamond: 0.9 };

const K = {
  ashlar: 'x:ashlar', pink: 't:plaster:#f4b9a6', cream: 'c:#efe0c2', plinth: 'c:#8f4a3b', white: 't:plaster:#f7f4ee',
  marble: 'x:marble', kota: 'x:kota', brick: 't:brick', sand: 'c:#c98a78', jali: 'x:jali', teak: 't:wood:#8a5a32',
  dark: 't:wood:#5e3d24', steel: 'm:#c9cdd1', black: 'c:#1d2023', granite: 'c:#22342c', nosing: 'c:#ece8df',
  glassOut: 'c:#33414c', glassIn: 'e:#d4e6ee', glass: 'g:#cfe3ec', roof: 'c:#d3ccc1', ceiling: 'c:#f3f0ea',
  pv: 'm:#24324f', green: 'c:#3f7a3a', gmarble: 'c:#2f5a49', gravel: 'x:gravel', spines: 'x:spines', signs: 'x:signs',
  pavers: 'x:pavers', diamond: 'x:diamond', lamp: 'e:#fff1c9', canopy: 'c:#f6f4ef', navy: 'c:#2b3a5c', red: 'c:#9b1c1c',
  sofa: 'c:#2f4fa0', pmarble: 'c:#ebe5d9', chair: 'c:#3f5f8a', metal: 'm:#4a4f55',
};

function inPoly(u, v, poly) {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ui, vi] = poly[i]; const [uj, vj] = poly[j];
    if ((vi > v) !== (vj > v) && u < ((uj - ui) * (v - vi)) / (vj - vi) + ui) ins = !ins;
  }
  return ins;
}

function canvas(w, h, paint) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const jitter = (hex, f) => { const c = new THREE.Color(hex); c.offsetHSL(0, 0, (rnd() - 0.5) * f); return `#${c.getHexString()}`; };

// ---------- the module's own textures ----------
const TEXTURES = {
  ashlar: () => canvas(512, 512, (g, W, H) => { // red-brown sandstone panels, cream joints (6 courses of 0.4 m per 2.4 m)
    g.fillStyle = '#e2c7aa'; g.fillRect(0, 0, W, H);
    const rows = 6; const rh = H / rows;
    for (let r = 0; r < rows; r++) {
      const cols = 4; const cw = W / cols; const off = r % 2 ? cw / 2 : 0;
      for (let c = -1; c <= cols; c++) {
        const base = ['#b0584a', '#a65446', '#b8624f', '#a14f40', '#ab5a49'][Math.floor(rnd() * 5)];
        g.fillStyle = base; g.fillRect(c * cw + off + 2, r * rh + 2, cw - 4, rh - 4);
        for (let k = 0; k < 160; k++) { g.fillStyle = jitter(base, 0.1); g.globalAlpha = 0.5; g.fillRect(c * cw + off + 2 + rnd() * (cw - 6), r * rh + 2 + rnd() * (rh - 6), 3, 2); }
        g.globalAlpha = 1;
      }
    }
  }),
  marble: () => canvas(512, 512, (g, W, H) => { // white marble, green inlay grid every 2 m, yellow Jaisalmer fillets
    g.fillStyle = '#eeebe4'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(160,160,165,0.35)'; g.lineWidth = 1;
    for (let i = 0; i < 30; i++) { g.beginPath(); let x = rnd() * W; let y = rnd() * H; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (rnd() - 0.5) * 60; y += (rnd() - 0.3) * 40; g.lineTo(x, y); } g.stroke(); }
    for (const p of [0, W / 2]) {
      g.fillStyle = '#2d5a46'; g.fillRect(p, 0, 7, H); g.fillRect(0, p, W, 7);
      g.fillStyle = '#d6a640'; g.fillRect(p + 12, 0, 3, H); g.fillRect(0, p + 12, W, 3);
    }
  }),
  kota: () => canvas(512, 512, (g, W, H) => { // grey Kota stone slabs, 0.6 m
    const n = 4; const s = W / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const base = jitter('#9ea49b', 0.08); g.fillStyle = base; g.fillRect(i * s, j * s, s, s);
      for (let k = 0; k < 120; k++) { g.fillStyle = jitter(base, 0.08); g.globalAlpha = 0.4; g.fillRect(i * s + rnd() * s, j * s + rnd() * s, 4, 3); }
      g.globalAlpha = 1; g.strokeStyle = '#6f746c'; g.lineWidth = 2; g.strokeRect(i * s + 1, j * s + 1, s - 2, s - 2);
    }
  }),
  gravel: () => canvas(256, 256, (g, W, H) => { g.fillStyle = '#d8cdb4'; g.fillRect(0, 0, W, H); for (let i = 0; i < 5000; i++) { g.fillStyle = jitter('#d0c3a8', 0.3); g.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 2, 2 + rnd() * 2); } }),
  jali: () => canvas(256, 256, (g, W, H) => { // pierced sandstone screen
    g.fillStyle = '#c47d68'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#4a2a22';
    const n = 4; const s = W / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const cx = i * s + s / 2; const cy = j * s + s / 2;
      g.beginPath(); for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; const r = k % 2 ? s * 0.18 : s * 0.38; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.fill();
    }
    g.strokeStyle = '#e4b9a5'; g.lineWidth = 3; g.strokeRect(0, 0, W, H);
  }),
  pavers: () => canvas(512, 512, (g, W, H) => { // grey octagons with red squares between
    g.fillStyle = '#8b4a44'; g.fillRect(0, 0, W, H);
    const n = 6; const s = W / n; const c = s * 0.29;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = i * s; const y = j * s;
      g.fillStyle = jitter('#d9d7d1', 0.05);
      g.beginPath(); g.moveTo(x + c, y + 2); g.lineTo(x + s - c, y + 2); g.lineTo(x + s - 2, y + c); g.lineTo(x + s - 2, y + s - c); g.lineTo(x + s - c, y + s - 2); g.lineTo(x + c, y + s - 2); g.lineTo(x + 2, y + s - c); g.lineTo(x + 2, y + c); g.closePath(); g.fill();
    }
  }),
  spines: () => canvas(512, 128, (g, W, H) => { // a shelf of book spines
    g.fillStyle = '#3a2a1c'; g.fillRect(0, 0, W, H);
    let x = 0;
    while (x < W) {
      const w = 10 + Math.floor(rnd() * 14); const top = Math.floor(rnd() * 30);
      const col = ['#8c2f2f', '#2f4f8c', '#3d7a4a', '#b8893a', '#5b3a6e', '#c7c1b2', '#1f2f3f', '#a0522d'][Math.floor(rnd() * 8)];
      g.fillStyle = col; g.fillRect(x, top, w - 1, H - top);
      g.fillStyle = 'rgba(255,230,160,0.55)'; g.fillRect(x + 2, top + 18, w - 5, 3); g.fillRect(x + 2, H - 22, w - 5, 2);
      x += w;
    }
  }),
  diamond: () => { // black steel balustrade, diamond pattern (cut out)
    const t = canvas(128, 128, (g, W, H) => {
      g.clearRect(0, 0, W, H); g.strokeStyle = '#141618'; g.lineWidth = 7;
      g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W / 2, 0); g.lineTo(W, H / 2); g.lineTo(W / 2, H); g.closePath(); g.stroke();
      g.lineWidth = 10; g.beginPath(); g.moveTo(0, 4); g.lineTo(W, 4); g.moveTo(0, H - 4); g.lineTo(W, H - 4); g.stroke();
    });
    t.userData = { alphaTest: 0.5, doubleSide: true };
    return t;
  },
  fresco: () => canvas(512, 512, (g, W, H) => { // painted portico ceiling
    const gr = g.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, W * 0.7); gr.addColorStop(0, '#d8e6e6'); gr.addColorStop(1, '#5f8fa0'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { g.fillStyle = ['#e9d9b0', '#7aa0a8', '#c99a6a', '#f1efe6'][i % 4]; g.globalAlpha = 0.6; g.beginPath(); g.ellipse(rnd() * W, rnd() * H, 10 + rnd() * 40, 6 + rnd() * 20, rnd() * 3, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1; g.strokeStyle = '#2f4a5a'; g.lineWidth = 16; g.strokeRect(8, 8, W - 16, H - 16);
  }),
  rosette: () => canvas(128, 128, (g, W, H) => {
    g.fillStyle = '#a24e40'; g.fillRect(0, 0, W, H); g.strokeStyle = '#e8d2b4'; g.lineWidth = 6; g.strokeRect(4, 4, W - 8, H - 8);
    g.fillStyle = '#c06a55';
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; g.beginPath(); g.ellipse(W / 2 + Math.cos(a) * 22, H / 2 + Math.sin(a) * 22, 18, 9, a, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#7d3428'; g.beginPath(); g.arc(W / 2, H / 2, 10, 0, Math.PI * 2); g.fill();
  }),
  starburst: () => canvas(512, 512, (g, W, H) => { // the foyer's floor medallion
    g.fillStyle = '#eeebe4'; g.fillRect(0, 0, W, H);
    const c = W / 2;
    g.fillStyle = '#d6a640';
    g.beginPath(); for (let k = 0; k < 32; k++) { const a = (k / 32) * Math.PI * 2; const r = k % 2 ? c * 0.55 : c * 0.98; g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r); } g.fill();
    g.strokeStyle = '#2d5a46'; g.lineWidth = 10; g.beginPath(); g.arc(c, c, c * 0.5, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#eeebe4'; g.beginPath(); g.arc(c, c, c * 0.46, 0, Math.PI * 2); g.fill();
  }),
  doorglass: () => canvas(256, 128, (g, W, H) => { // coloured glass grid over the entrance doors
    const cols = ['#d9cf5a', '#5f86b8', '#c64a3e', '#9aa3a8', '#7fb08a', '#e0d27a'];
    for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) { g.fillStyle = cols[(i * 3 + j * 5) % cols.length]; g.fillRect(i * 32 + 2, j * 42 + 2, 28, 38); }
    g.strokeStyle = '#d7dadd'; g.lineWidth = 4; g.strokeRect(0, 0, W, H);
  }),
  mural: () => canvas(512, 384, (g, W, H) => { // east lobby wall painting
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#2b5f86'); gr.addColorStop(1, '#3f9a8c'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = '#6fb6d8'; g.beginPath(); g.ellipse(W / 2, H / 2, 120, 150, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f2d16b'; for (const x of [W / 2 - 45, W / 2 + 45]) { g.beginPath(); g.ellipse(x, H / 2 - 20, 26, 16, 0, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = '#e8eef2'; g.lineWidth = 4; for (let i = 0; i < 14; i++) { g.beginPath(); g.moveTo(W / 2 + (rnd() - 0.5) * 220, H / 2 + 60); g.lineTo(W / 2 + (rnd() - 0.5) * 400, H); g.stroke(); }
  }),
  guide: () => canvas(512, 640, (g, W, H) => { // LIBRARY FLOOR GUIDE board (brochure "Know your Library")
    g.fillStyle = '#1f3552'; g.fillRect(0, 0, W, H); g.fillStyle = '#f2c14e'; g.font = 'bold 34px Georgia, serif'; g.textAlign = 'center'; g.fillText('LIBRARY FLOOR GUIDE', W / 2, 52);
    g.textAlign = 'left'; g.fillStyle = '#ffffff';
    const rows = [['Foyer', 'Issue / return, help desk, new arrivals'], ['Hall 1', 'Heritage Gallery, journals, reference'], ['Hall 2', 'Books 001-623'], ['Hall 3', 'Books 624-999, rare books'], ['Hall 4', 'Reference, MakerSpace, reading room'], ['Hall 5', 'Reading room, HBR collection'], ['Hall 6 (1st)', 'Bound volumes, E-zone, GD rooms']];
    rows.forEach(([a, b], i) => { g.font = 'bold 24px system-ui, sans-serif'; g.fillText(a, 26, 120 + i * 72); g.font = '20px system-ui, sans-serif'; g.fillText(b, 26, 148 + i * 72); });
  }),
};

export default {
  id: 'library',
  name: 'BITS Library',
  category: 'library',
  osm: ['BITS Library'],
  floors: 2,
  enabled: true,
  research: 'mixed',
  frame() {
    const ev = [Math.sin(ROT), Math.cos(ROT)];
    return { O: ORIGIN, eu: [ev[1], -ev[0]], ev, angle: Math.atan2(ev[0], ev[1]) };
  },
  build(kit, ctx) { buildLibrary(kit, ctx); },
};

function buildLibrary(kit, ctx) {
  const campus = ctx.campus;
  seed = 7;
  for (const [name, make] of Object.entries(TEXTURES)) kit.texture(name, make);
  const P = ctx.buildings[0].outer.map(([x, z]) => kit.local(x, z));
  const room = ctx.rooms.find((r) => r.id === 'library');

  // ---------- primitives ----------
  const tileOf = (key) => (key.startsWith('x:') ? XT[key.slice(2).split(':')[0]] : key.startsWith('t:') ? TEX_SIZE[key.split(':')[1]] || 2 : 0);
  const scaleUV = (g, k) => { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * k, uv.getY(i) * k); return g; };
  const add = (key, g) => kit.geo(key, g);
  const pushCol = (pts, y0, y1, walkable = false) => {
    const w = pts.map(([u, v]) => kit.world(u, v));
    campus.colliders.push({ minX: Math.min(...w.map((p) => p.x)), maxX: Math.max(...w.map((p) => p.x)), minZ: Math.min(...w.map((p) => p.z)), maxZ: Math.max(...w.map((p) => p.z)), minY: y0, maxY: y1, walkable, enabled: true, building: 'library' });
  };
  // collider for a local axis-aligned box, cut into pieces about `chunk` long (the frame is rotated)
  const col = (u0, u1, v0, v1, y0, y1, walkable = false, chunk = 1) => {
    const n = Math.max(1, Math.ceil((u1 - u0) / chunk)); const m = Math.max(1, Math.ceil((v1 - v0) / chunk));
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
      const a0 = u0 + ((u1 - u0) * i) / n; const a1 = u0 + ((u1 - u0) * (i + 1)) / n; const b0 = v0 + ((v1 - v0) * j) / m; const b1 = v0 + ((v1 - v0) * (j + 1)) / m;
      pushCol([[a0, b0], [a1, b0], [a1, b1], [a0, b1]], y0, y1, walkable);
    }
  };
  // local axis-aligned box
  const B = (u0, u1, v0, v1, y0, y1, key, { collide = false, walkable = false } = {}) => {
    if (u1 < u0) [u0, u1] = [u1, u0];
    if (v1 < v0) [v0, v1] = [v1, v0];
    if (u1 - u0 <= 0 || v1 - v0 <= 0 || y1 - y0 <= 0) return;
    if (key.startsWith('x:') && XT[key.slice(2)]) {
      const g = worldBoxGeometry(u1 - u0, y1 - y0, v1 - v0, XT[key.slice(2)]);
      g.translate((u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2); add(key, g);
    } else kit.box(u0, u1, v0, v1, y0, y1, key, { collide: false });
    if (collide) col(u0, u1, v0, v1, y0, y1, walkable);
  };
  // box of length len along direction t=(tu,tv) (unit) and thickness th across it, centred at (cu, cv)
  const obox = (cu, cv, tu, tv, len, th, y0, y1, key, { collide = false } = {}) => {
    if (len <= 0 || y1 <= y0) return;
    const tile = tileOf(key);
    const g = tile ? worldBoxGeometry(len, y1 - y0, th, tile) : new THREE.BoxGeometry(len, y1 - y0, th);
    g.rotateY(Math.atan2(-tv, tu)); g.translate(cu, (y0 + y1) / 2, cv); add(key, g);
    if (collide) {
      const n = Math.max(1, Math.ceil(len / 1)); const nu = -tv; const nv = tu;
      for (let i = 0; i < n; i++) {
        const s0 = -len / 2 + (len * i) / n; const s1 = -len / 2 + (len * (i + 1)) / n;
        pushCol([[s0, -th / 2], [s1, -th / 2], [s1, th / 2], [s0, th / 2]].map(([s, d]) => [cu + tu * s + nu * d, cv + tv * s + nv * d]), y0, y1);
      }
    }
  };
  // bar between two local points a, b = [u, y, v] (rails, ribs, frames); its width stays level
  const bar = (a, b, w, h, key) => {
    const du = b[0] - a[0]; const dy = b[1] - a[1]; const dv = b[2] - a[2];
    const hl = Math.hypot(du, dv); const L = Math.hypot(hl, dy);
    if (L < 1e-4) return;
    const g = new THREE.BoxGeometry(w, h, L);
    g.rotateX(-Math.atan2(dy, hl));
    g.rotateY(Math.atan2(du, dv));
    g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); add(key, g);
  };
  // vertical plane facing [du, dv] with a uv rectangle (atlas) or world-tiled
  const plane = (u, v, y, w, h, [du, dv], key, { uv = null, offset = 0.015 } = {}) => {
    const g = new THREE.PlaneGeometry(w, h);
    if (uv) { const a = g.attributes.uv; for (let i = 0; i < a.count; i++) a.setXY(i, uv[0] + a.getX(i) * (uv[2] - uv[0]), uv[1] + a.getY(i) * (uv[3] - uv[1])); }
    const n = Math.hypot(du, dv);
    g.rotateY(Math.atan2(du, dv)); g.translate(u + (du / n) * offset, y + h / 2, v + (dv / n) * offset); add(key, g);
  };
  // horizontal disc / ring / plate
  const disc = (u, v, y, r0, r1, key, { a0 = 0, a1 = Math.PI * 2, seg = 48, up = true } = {}) => {
    const g = r0 > 0 ? new THREE.RingGeometry(r0, r1, seg, 1, a0, a1 - a0) : new THREE.CircleGeometry(r1, seg, a0, a1 - a0);
    const tile = tileOf(key);
    if (tile && key.startsWith('x:') && XT[key.slice(2)]) scaleUV(g, (2 * r1) / tile);
    g.rotateX(up ? -Math.PI / 2 : Math.PI / 2); g.translate(u, y, v); add(key, g);
  };
  // flipped normals (to see a cylinder from the inside)
  const flip = (g) => {
    g = g.index ? g.toNonIndexed() : g;
    for (const name of ['position', 'normal', 'uv']) {
      const a = g.attributes[name]; const s = a.itemSize;
      for (let i = 0; i < a.count; i += 3) for (let k = 0; k < s; k++) { const t = a.array[(i + 1) * s + k]; a.array[(i + 1) * s + k] = a.array[(i + 2) * s + k]; a.array[(i + 2) * s + k] = t; }
    }
    const n = g.attributes.normal; for (let i = 0; i < n.array.length; i++) n.array[i] = -n.array[i];
    return g;
  };
  const ring = (u, v, y0, y1, r, key, { inside = false, outside = true, seg = 48 } = {}) => {
    const mk = () => { const g = new THREE.CylinderGeometry(r, r, y1 - y0, seg, 1, true); g.translate(u, (y0 + y1) / 2, v); return g; };
    if (outside) add(key, mk());
    if (inside) add(key, flip(mk()));
  };
  // flat polygon (local [u, v] points) with polygon and circle holes, facing up or down
  const flatShape = (outer, holes, y, key, { up = true, circles = [] } = {}) => {
    const s = up ? -1 : 1;
    const shape = new THREE.Shape(outer.map(([u, v]) => new THREE.Vector2(u, s * v)));
    for (const h of holes) shape.holes.push(new THREE.Path(h.map(([u, v]) => new THREE.Vector2(u, s * v))));
    for (const [cu, cv, r] of circles) { const p = new THREE.Path(); p.absarc(cu, s * cv, r, 0, Math.PI * 2, false); shape.holes.push(p); }
    const g = new THREE.ShapeGeometry(shape, 40);
    const tile = tileOf(key); if (tile) scaleUV(g, 1 / tile);
    g.rotateX(up ? -Math.PI / 2 : Math.PI / 2); g.translate(0, y, 0); add(key, g);
  };
  const rect = (u0, u1, v0, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
  // a vertical extruded shape (x along t, y up), thickness th, centred on (cu, cv)
  const vshape = (shape, cu, cv, tu, tv, th, key) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth: th, bevelEnabled: false, curveSegments: 20 });
    g.translate(0, 0, -th / 2);
    const tile = tileOf(key); if (tile) scaleUV(g, 1 / tile);
    g.rotateY(Math.atan2(-tv, tu)); g.translate(cu, 0, cv); add(key, g);
  };
  // spandrel above an arch: the area between an arch (springing at ys, rising `rise`) and the top yt, width w.
  // cusps > 0 scallops the arch (the Rajput cusped arch of the rotunda)
  const spandrel = (w, ys, rise0, yt, cusps = 0) => {
    const rise = Math.min(rise0, yt - ys - 0.08); // the crown never touches the top (a degenerate shape tears)
    const s = new THREE.Shape();
    s.moveTo(-w / 2, yt); s.lineTo(-w / 2, ys);
    const N = 48; const a = w / 2;
    for (let i = 0; i <= N; i++) {
      const t = Math.PI - (i / N) * Math.PI;
      const k = cusps ? 0.9 + 0.1 * Math.abs(Math.sin(cusps * t)) : 1;
      s.lineTo(Math.cos(t) * a * k, ys + Math.sin(t) * rise * k);
    }
    s.lineTo(w / 2, ys); s.lineTo(w / 2, yt); s.closePath();
    return s;
  };
  // walls along u or v in the local frame, with openings { at (absolute u or v), w, bot, top (absolute y) }
  const wall = (u0, v0, u1, v1, y0, y1, key, { th = WT, ops = [], collide = true } = {}) => {
    const alongU = Math.abs(u1 - u0) >= Math.abs(v1 - v0);
    const a0 = alongU ? Math.min(u0, u1) : Math.min(v0, v1); const a1 = alongU ? Math.max(u0, u1) : Math.max(v0, v1);
    const c = alongU ? v0 : u0;
    const piece = (a, b, ya, yb) => { if (b - a < 0.01 || yb - ya < 0.01) return; if (alongU) B(a, b, c - th / 2, c + th / 2, ya, yb, key, { collide }); else B(c - th / 2, c + th / 2, a, b, ya, yb, key, { collide }); };
    const list = ops.map((o) => ({ a: o.at - o.w / 2, b: o.at + o.w / 2, bot: o.bot ?? y0, top: o.top ?? y0 + 2.4 }));
    const cuts = [...new Set([a0, a1, ...list.flatMap((o) => [o.a, o.b])])].filter((x) => x >= a0 && x <= a1).sort((p, q) => p - q);
    for (let i = 0; i < cuts.length - 1; i++) {
      const m = (cuts[i] + cuts[i + 1]) / 2;
      const gaps = list.filter((o) => m > o.a && m < o.b).map((o) => [o.bot, o.top]).sort((p, q) => p[0] - q[0]);
      let y = y0;
      for (const [g0, g1] of gaps) { piece(cuts[i], cuts[i + 1], y, g0); y = Math.max(y, g1); }
      piece(cuts[i], cuts[i + 1], y, y1);
    }
  };
  // brick surround round a door opening on both faces of a wall
  const surround = (alongU, at, c, w, y0, top, th = WT, key = K.brick) => {
    for (const s of [-1, 1]) {
      const f = c + s * (th / 2 + 0.03);
      const BB = (a0, a1, ya, yb) => (alongU ? B(a0, a1, f - 0.03, f + 0.03, ya, yb, key) : B(f - 0.03, f + 0.03, a0, a1, ya, yb, key));
      BB(at - w / 2 - 0.35, at - w / 2, y0, top + 0.35); BB(at + w / 2, at + w / 2 + 0.35, y0, top + 0.35); BB(at - w / 2, at + w / 2, top, top + 0.35);
    }
  };
  // railing from a=[u,v] to b with heights ya, yb (sloped on stairs and ramps); optional diamond panel
  const railLine = (a, b, ya, yb, { h = 1.0, key = K.dark, panel = true, posts = K.black, collide = true, top = 0.06 } = {}) => {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    bar([a[0], ya + h, a[1]], [b[0], yb + h, b[1]], top, top, key);
    if (panel) {
      const g = new THREE.BufferGeometry();
      const p = [[a[0], ya + 0.05, a[1]], [b[0], yb + 0.05, b[1]], [b[0], yb + h - 0.05, b[1]], [a[0], ya + h - 0.05, a[1]]];
      const tile = XT.diamond; const uv = [[0, 0], [L / tile, 0], [L / tile, (h - 0.1) / tile], [0, (h - 0.1) / tile]];
      const idx = [0, 1, 2, 0, 2, 3];
      g.setAttribute('position', new THREE.Float32BufferAttribute(idx.flatMap((i) => p[i]), 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(idx.flatMap((i) => uv[i]), 2));
      g.computeVertexNormals(); add(K.diamond, g);
    } else bar([a[0], ya + h * 0.5, a[1]], [b[0], yb + h * 0.5, b[1]], 0.03, 0.03, posts);
    const n = Math.max(1, Math.round(L / 1.2));
    for (let i = 0; i <= n; i++) { const t = i / n; const u = a[0] + (b[0] - a[0]) * t; const v = a[1] + (b[1] - a[1]) * t; const y = ya + (yb - ya) * t; B(u - 0.025, u + 0.025, v - 0.025, v + 0.025, y, y + h, posts); }
    if (collide) {
      const m = Math.max(1, Math.ceil(L / 0.6)); const tu = (b[0] - a[0]) / L; const tv = (b[1] - a[1]) / L;
      for (let i = 0; i < m; i++) {
        const s0 = (L * i) / m; const s1 = (L * (i + 1)) / m; const y0 = ya + ((yb - ya) * i) / m; const y1 = ya + ((yb - ya) * (i + 1)) / m;
        pushCol([[s0, -0.06], [s1, -0.06], [s1, 0.06], [s0, 0.06]].map(([s, d]) => [a[0] + tu * s - tv * d, a[1] + tv * s + tu * d]), Math.min(y0, y1), Math.max(y0, y1) + h);
      }
    }
  };
  // ---------- signs (one atlas texture for the whole building) ----------
  const signs = []; const ROWS = 32;
  const sign = (text, u, v, y, w, h, facing, { bg = '#7a2622', fg = '#f6ecd2', font = 'bold 40px Georgia, serif' } = {}) => {
    const i = signs.length; if (i >= ROWS) return;
    const ratio = Math.min(8, w / h);
    signs.push({ text, bg, fg, font, ratio });
    const half = ratio / 16;
    plane(u, v, y, w, h, facing, K.signs, { uv: [0.5 - half, 1 - (i + 1) / ROWS, 0.5 + half, 1 - i / ROWS], offset: 0.03 });
  };
  const finishSigns = () => kit.texture('signs', () => canvas(512, 64 * ROWS, (g, W) => {
    signs.forEach((s, i) => {
      const y = i * 64; const w = s.ratio * 64; const x = (W - w) / 2;
      g.fillStyle = s.bg; g.fillRect(0, y, W, 64);
      g.fillStyle = s.fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      let size = parseInt(s.font.match(/(\d+)px/)[1], 10); const fam = s.font.replace(/^.*?\d+px\s*/, ''); const weight = s.font.startsWith('bold') ? 'bold' : '';
      do { g.font = `${weight} ${size}px ${fam}`; size -= 2; } while (g.measureText(s.text).width > w * 0.9 && size > 8);
      g.fillText(s.text, x + w / 2, y + 33);
    });
  }));

  // ---------- furniture ----------
  const table8 = (u, v, y, alongU = true, { len = 2.4, chairs = true, seat = K.teak } = {}) => {
    const [hw, hd] = alongU ? [len / 2, 0.6] : [0.6, len / 2];
    B(u - hw, u + hw, v - hd, v + hd, y + 0.72, y + 0.77, K.teak, { collide: false });
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B(u + a * (hw - 0.12) - 0.04, u + a * (hw - 0.12) + 0.04, v + b * (hd - 0.12) - 0.04, v + b * (hd - 0.12) + 0.04, y, y + 0.72, K.dark);
    col(u - hw, u + hw, v - hd, v + hd, y, y + 0.77);
    if (!chairs) return;
    const opts = { seat, frame: K.metal };
    for (const s of [-1, 1]) for (const k of [-1, 0, 1]) {
      const d = (len / 3) * k;
      if (alongU) kit.chair(u + d, v + s * 0.95, y, [0, -s], opts); else kit.chair(u + s * 0.95, v + d, y, [-s, 0], opts);
    }
    if (alongU) { kit.chair(u - hw - 0.45, v, y, [1, 0], opts); kit.chair(u + hw + 0.45, v, y, [-1, 0], opts); } else { kit.chair(u, v - hd - 0.45, y, [0, 1], opts); kit.chair(u, v + hd + 0.45, y, [0, -1], opts); }
  };
  // bookstack (double sided unless single) running along u or v from a0 to a1 at c
  const stack = (alongU, a0, a1, c, y, { h = 2.2, levels = 6, single = 0 } = {}) => {
    const d = single ? 0.4 : 0.6; const L = a1 - a0;
    const BB = (s0, s1, d0, d1, ya, yb, key, opt) => (alongU ? B(a0 + s0, a0 + s1, c + d0, c + d1, ya, yb, key, opt) : B(c + d0, c + d1, a0 + s0, a0 + s1, ya, yb, key, opt));
    BB(0, L, -d / 2, d / 2, y, y + 0.1, K.dark, { collide: true });
    col(...(alongU ? [a0, a1, c - d / 2, c + d / 2] : [c - d / 2, c + d / 2, a0, a1]), y, y + h);
    BB(0, L, -d / 2, d / 2, y + h - 0.05, y + h, K.dark);
    BB(0, 0.05, -d / 2, d / 2, y, y + h, K.dark); BB(L - 0.05, L, -d / 2, d / 2, y, y + h, K.dark);
    BB(0, L, -0.02, 0.02, y, y + h, K.dark);
    const gap = (h - 0.15) / levels;
    for (let k = 0; k < levels; k++) {
      const y0 = y + 0.1 + k * gap;
      BB(0.05, L - 0.05, -d / 2, d / 2, y0, y0 + 0.025, K.dark);
      const sides = single ? [single] : [-1, 1];
      for (const s of sides) BB(0.06, L - 0.06, s > 0 ? 0.03 : -d / 2 + 0.04, s > 0 ? d / 2 - 0.04 : -0.03, y0 + 0.025, y0 + gap * 0.82, K.spines);
    }
  };
  const plant = (u, v, y, r = 0.45, key = K.gmarble) => {
    kit.cyl(u, v, y, r, 0.45, key, { seg: 8, collide: true });
    for (let k = 0; k < 5; k++) { const a = k * 1.3; const g = new THREE.IcosahedronGeometry(r * 0.55, 0); g.translate(u + Math.cos(a) * r * 0.4, y + 0.65 + (k % 2) * 0.15, v + Math.sin(a) * r * 0.4); add(K.green, g); }
  };
  const sofa = (u, v, y, facing, key = K.sofa) => kit._rot(u, v, facing, kit._up([[-0.9, 0.9, 0, 0.42, -0.4, 0.4, key], [-0.9, 0.9, 0.42, 0.85, -0.42, -0.22, key], [-0.95, -0.8, 0, 0.6, -0.42, 0.4, key], [0.8, 0.95, 0, 0.6, -0.42, 0.4, key]], y));

  // =====================================================================================================
  // SHELL: the facade along the OSM outline
  // =====================================================================================================
  kit.layer('shell', () => {
    const OPEN = [
      { p: [-43.7, 0], w: 3.6, bot: G, top: G + 4.2 }, // west entrance doors
      { p: [-8.82, 28.95], w: 2.55, bot: 0, top: 2.7 }, // the reading room's south door (the gameplay room)
    ];
    const n = P.length;
    for (let i = 0; i < n; i++) {
      const p0 = P[i]; const p1 = P[(i + 1) % n];
      const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      if (L < 0.05) continue;
      const tu = (p1[0] - p0[0]) / L; const tv = (p1[1] - p0[1]) / L;
      let nu = tv; let nv = -tu;
      const mid = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
      if (inPoly(mid[0] + nu * 0.2, mid[1] + nv * 0.2, P)) { nu = -nu; nv = -nv; }
      const at = (s, d) => [p0[0] + tu * s + nu * d, p0[1] + tv * s + nv * d];
      const seg = (s0, s1, d0, d1, y0, y1, key, collide = false) => { const c = at((s0 + s1) / 2, (d0 + d1) / 2); obox(c[0], c[1], tu, tv, s1 - s0, d1 - d0, y0, y1, key, { collide }); };
      const ops = [];
      for (const o of OPEN) {
        const s = (o.p[0] - p0[0]) * tu + (o.p[1] - p0[1]) * tv; const d = Math.abs((o.p[0] - p0[0]) * nu + (o.p[1] - p0[1]) * nv);
        if (s > 0 && s < L && d < 0.8) ops.push({ s0: Math.max(0.02, s - o.w / 2), s1: Math.min(L - 0.02, s + o.w / 2), bot: o.bot, top: o.top });
      }
      // core: sandstone ground storey, pink plaster upper storey and parapet
      const core = (s0, s1, y0, y1) => {
        if (s1 - s0 < 0.01 || y1 - y0 < 0.01) return;
        if (y0 < F1) seg(s0, s1, -FAC, 0, y0, Math.min(F1, y1), K.ashlar, true);
        if (y1 > F1) seg(s0, s1, -FAC, 0, Math.max(F1, y0), y1, K.pink, y0 >= F1 ? false : false);
        if (y1 > F1 && y0 < F1 + 0.01 && y0 >= F1) { /* upper only */ }
      };
      let s = 0;
      for (const o of ops.sort((a, b) => a.s0 - b.s0)) { core(s, o.s0, 0, R + PAR); core(o.s0, o.s1, 0, o.bot); core(o.s0, o.s1, o.top, R + PAR); s = o.s1; }
      core(s, L, 0, R + PAR);
      // the upper storey's colliders (the core's lower part already blocks the player)
      // bands: plinth, string course at the first floor, cornice and coping
      let ps = 0;
      for (const o of ops) { if (o.s0 > ps) seg(ps, o.s0, 0, 0.06, 0, G, K.plinth); ps = o.s1; }
      if (ps < L) seg(ps, L, 0, 0.06, 0, G, K.plinth);
      seg(0, L, 0, 0.12, F1 - 0.14, F1 + 0.14, K.cream);
      seg(0, L, 0, 0.1, R - 0.2, R, K.cream);
      seg(0, L, -FAC - 0.05, 0.08, R + PAR, R + PAR + 0.1, K.cream);
      // inner lining (white plaster) from the ground floor to the roof
      // (split round the openings like the core, so the doorways stay open)
      kit.layer('structure', () => {
        const lin = (s0, s1, y0, y1) => { if (s1 - s0 > 0.01 && y1 - y0 > 0.01) seg(s0, s1, -FAC - 0.02, -FAC, y0, y1, K.white); };
        let ls = 0;
        for (const o of ops) { lin(ls, o.s0, G, R - 0.3); lin(o.s0, o.s1, Math.max(G, o.top), R - 0.3); lin(o.s0, o.s1, G, Math.min(o.bot, R - 0.3)); ls = o.s1; }
        lin(ls, L, G, R - 0.3);
      });
      // crenellations: clusters of small merlons on the parapet
      const clusters = L > 18 ? [L / 4, L / 2, (3 * L) / 4] : L > 5 ? [L / 2] : [];
      for (const c of clusters) for (let k = -2; k <= 2; k++) seg(c + k * 0.6 - 0.15, c + k * 0.6 + 0.15, -FAC + 0.05, 0, R + PAR + 0.1, R + PAR + 0.45, K.pink);
      // portholes near the ends of the upper band
      if (L >= 7) for (const sp of [1.6, L - 1.6]) {
        const c = at(sp, 0.02);
        const t = new THREE.TorusGeometry(0.42, 0.08, 6, 20); t.rotateY(Math.atan2(nu, nv)); t.translate(c[0], R - 0.75, c[1]); add(K.cream, t);
        const d = new THREE.CircleGeometry(0.38, 20); d.rotateY(Math.atan2(nu, nv)); d.translate(c[0], R - 0.75, c[1]); add('c:#2f4f7a', d);
      }
      // windows: white frames and dark glass outside, daylight panes inside
      const westEnd = Math.max(p0[0], p1[0]) < -39 && Math.abs((p0[1] + p1[1]) / 2) < 17;
      const nb = Math.floor((L - 2) / 5);
      for (let k = 0; k < nb; k++) {
        const c = L / 2 + (k - (nb - 1) / 2) * 5;
        if (ops.some((o) => c > o.s0 - 2 && c < o.s1 + 2)) continue;
        for (const [y0, h, ground] of [[G + 0.9, 2.0, true], [F1 + 1.0, 1.8, false]]) {
          if (ground && westEnd) continue;
          const w = 2.0;
          const gp = at(c, 0.012); plane(gp[0], gp[1], y0, w, h, [nu, nv], K.glassOut, { offset: 0 });
          seg(c - w / 2 - 0.08, c + w / 2 + 0.08, 0, 0.08, y0 + h, y0 + h + 0.1, K.canopy);
          seg(c - w / 2 - 0.12, c + w / 2 + 0.12, 0, 0.16, y0 - 0.1, y0, K.canopy);
          for (const x of [c - w / 2 - 0.04, c - 0.03, c + w / 2 - 0.02]) seg(x, x + 0.07, 0, 0.07, y0, y0 + h, K.canopy);
          seg(c - w / 2, c + w / 2, 0, 0.06, y0 + h * 0.62, y0 + h * 0.62 + 0.05, K.canopy);
          kit.layer('structure', () => { const ip = at(c, -FAC - 0.035); plane(ip[0], ip[1], y0, w, h, [-nu, -nv], K.glassIn, { offset: 0 }); });
        }
        // carved square panel between the ground-floor windows
        if (!westEnd && L > 10 && k < nb - 1) {
          const cp = at(c + 2.5, 0.02); plane(cp[0], cp[1], G + 3.3, 0.8, 0.8, [nu, nv], 'x:rosette', { offset: 0 });
        }
      }
    }
    // piers at the corners, turned to the bisector of the two walls so they sit flush over the joint
    for (let i = 0; i < n; i++) {
      const pa = P[(i + n - 1) % n]; const pb = P[i]; const pc = P[(i + 1) % n];
      const la = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]); const lc = Math.hypot(pc[0] - pb[0], pc[1] - pb[1]);
      if (la < 0.05 || lc < 0.05) continue;
      let tu = (pb[0] - pa[0]) / la + (pc[0] - pb[0]) / lc; let tv = (pb[1] - pa[1]) / la + (pc[1] - pb[1]) / lc;
      const tl = Math.hypot(tu, tv); if (tl < 1e-3) continue; tu /= tl; tv /= tl;
      let nu = tv; let nv = -tu; if (inPoly(pb[0] + nu * 0.3, pb[1] + nv * 0.3, P)) { nu = -nu; nv = -nv; }
      obox(pb[0] - nu * 0.12, pb[1] - nv * 0.12, tu, tv, 0.6, 0.54, 0, R + PAR + 0.1, K.cream);
    }

    // ---------- roof ----------
    const SKY = [[-37.5, 0], [-29.5, 0], [-17.2, 0], [17.5, 0], [26.5, 0]];
    const skyHoles = SKY.map(([u, v]) => rect(u - 1.5, u + 1.5, v - 1.5, v + 1.5));
    flatShape(P, skyHoles, R, K.roof, { circles: [[0, 0, ROT_R]] });
    kit.layer('structure', () => flatShape(P, skyHoles, R - 0.3, K.ceiling, { up: false, circles: [[0, 0, ROT_R]] }));
    // glazed pyramid skylights (octagonal lanterns in the foyer read as pyramids from outside)
    for (const [u, v] of SKY) {
      for (const [a0, a1, b0, b1] of [[-1.6, 1.6, -1.6, -1.4], [-1.6, 1.6, 1.4, 1.6], [-1.6, -1.4, -1.6, 1.6], [1.4, 1.6, -1.6, 1.6]]) B(u + a0, u + a1, v + b0, v + b1, R - 0.3, R + 0.35, K.canopy);
      const g = new THREE.ConeGeometry(2.12, 1.3, 4, 1, true); g.rotateY(Math.PI / 4); g.translate(u, R + 0.35 + 0.65, v); add(K.glass, g);
      for (const [du, dv] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) bar([u + du * 1.5, R + 0.35, v + dv * 1.5], [u, R + 1.65, v], 0.06, 0.06, K.canopy);
      kit.layer('structure', () => { for (const [du, dv] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) bar([u + du * 1.5, R + 0.35, v + dv * 1.5], [u, R + 1.65, v], 0.05, 0.05, K.canopy); });
    }
    // solar panels in rows over the reading halls
    const PV = [[-21, -6, -26, -14], [1, 30, -26, -15], [18, 31, 14, 26], [-38, -26, 11.5, 19], [1, 14, 14, 26]];
    for (const [u0, u1, v0, v1] of PV) for (let v = v0; v < v1 - 1; v += 2.2) {
      const g = new THREE.BoxGeometry(u1 - u0, 0.05, 1.2); g.rotateX(0.26); g.translate((u0 + u1) / 2, R + 0.45, v + 0.6); add(K.pv, g);
      B(u0, u1, v + 0.1, v + 0.2, R, R + 0.3, K.metal);
    }
    // rotunda drum, ribbed glazed dome and its little lantern
    ring(0, 0, R - 0.3, R + 1.4, ROT_R + 0.25, K.canopy, { seg: 64 });
    disc(0, 0, R + 1.4, ROT_R - 0.1, ROT_R + 0.45, K.cream, { seg: 64 });
    for (let k = 0; k < 20; k++) { const a = (k / 20) * Math.PI * 2; const c = new THREE.CircleGeometry(0.2, 12); c.rotateY(Math.atan2(Math.cos(a), Math.sin(a))); c.translate(Math.cos(a) * (ROT_R + 0.27), R + 0.6, Math.sin(a) * (ROT_R + 0.27)); add(K.navy, c); }
    const rise = 2.4; const Rs = (ROT_R * ROT_R + rise * rise) / (2 * rise); const th = Math.asin(ROT_R / Rs);
    const dome = new THREE.SphereGeometry(Rs, 48, 10, 0, Math.PI * 2, 0, th); dome.translate(0, R + 1.4 + rise - Rs, 0);
    add(K.glass, dome);
    kit.layer('centre', () => add(K.glass, flip(dome.clone())));
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      let prev = null;
      for (let j = 0; j <= 6; j++) {
        const t = th * (1 - j / 6); const r = Rs * Math.sin(t); const y = R + 1.4 + rise - Rs + Rs * Math.cos(t);
        const p = [Math.cos(a) * Math.max(r, 1.2), y, Math.sin(a) * Math.max(r, 1.2)];
        if (prev) { bar(prev, p, 0.12, 0.12, K.canopy); kit.layer('centre', () => bar(prev, p, 0.1, 0.1, K.black)); }
        prev = p;
      }
    }
    const lt = new THREE.TorusGeometry(1.2, 0.15, 6, 24); lt.rotateX(Math.PI / 2); lt.translate(0, R + 1.4 + rise - 0.05, 0); add(K.canopy, lt);

    // =================================================================================================
    // the west entrance: portico, "BITS LIBRARY" arch band, pyramid canopy, stepped wing walls, fan steps
    // =================================================================================================
    // portico piers and lintel
    for (const s of [-1, 1]) B(-46.5, -43.5, s * 3.4, s * 4.8, 0, 6.0, K.ashlar, { collide: true });
    B(-46.8, -45.9, -4.8, 4.8, 4.6, 6.0, K.ashlar);
    B(-46.86, -46.8, -4.85, 4.85, 5.88, 6.02, K.cream); B(-46.86, -46.8, -4.85, 4.85, 4.58, 4.7, K.cream);
    for (const s of [-1, 1]) B(-46.86, -46.8, s * 3.4 - 0.06, s * 3.4 + 0.06, 0.6, 4.6, K.cream);
    // portico ceiling (fresco) and its side walls of sandstone fins
    { const g = new THREE.PlaneGeometry(3.0, 6.8); g.rotateX(Math.PI / 2); g.translate(-45.0, 4.58, 0); add('x:fresco', g); }
    for (const s of [-1, 1]) for (let u = -46.2; u < -43.8; u += 0.6) B(u, u + 0.18, s * 3.4 - s * 0.12, s * 3.4, G, 4.6, K.sand);
    // the segmental arch band carrying the lettering, with a slot showing the canopy behind
    {
      const Rc = (7.2 * 7.2 + 1.9 * 1.9) / (2 * 1.9); const cy = 9.6 - Rc;
      const sh = new THREE.Shape(); sh.moveTo(-7.2, 6.0); sh.lineTo(7.2, 6.0); sh.lineTo(7.2, 7.7);
      for (let i = 1; i < 32; i++) { const x = 7.2 - (14.4 * i) / 32; sh.lineTo(x, cy + Math.sqrt(Rc * Rc - x * x)); }
      sh.lineTo(-7.2, 7.7); sh.closePath();
      const hole = new THREE.Path(); hole.moveTo(-4.6, 6.35); hole.lineTo(4.6, 6.35); hole.lineTo(4.6, 7.25); hole.lineTo(-4.6, 7.25); hole.closePath(); sh.holes.push(hole);
      vshape(sh, -45.3, 0, 0, 1, 0.6, K.ashlar);
      // cream coping following the arc and edging the slot
      for (let i = 0; i < 16; i++) {
        const xa = -7.2 + (14.4 * i) / 16; const xb = xa + 14.4 / 16;
        bar([-45.3, cy + Math.sqrt(Rc * Rc - xa * xa) + 0.06, xa], [-45.3, cy + Math.sqrt(Rc * Rc - xb * xb) + 0.06, xb], 0.75, 0.14, K.cream);
      }
      B(-45.62, -45.58, -4.7, 4.7, 7.25, 7.35, K.cream); B(-45.62, -45.58, -4.7, 4.7, 6.25, 6.35, K.cream);
      sign('BITS LIBRARY', -45.61, 0, 8.05, 4.4, 0.62, [-1, 0], { bg: '#b05c4b', fg: '#f7ecd4', font: 'bold 44px Georgia, serif' });
    }
    // the white tent-like pyramid canopy over the portico (white with dark lines)
    {
      // it sits on the portico lintel in front of the arch band and stays clear of the facade (u < -44)
      const g = new THREE.ConeGeometry(3.4, 1.6, 4); g.rotateY(Math.PI / 4); g.translate(-46.4, 6.0 + 0.8, 0); add(K.canopy, g);
      for (const [du, dv] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) bar([-46.4 + du * 2.4, 6.0, dv * 2.4], [-46.4, 7.6, 0], 0.1, 0.1, K.navy);
      bar([-48.85, 6.1, -2.4], [-48.85, 6.1, 2.4], 0.05, 0.2, K.navy);
    }
    // the door screen: coloured glass over four glazed leaves standing open
    plane(-43.45, 0, G + 2.6, 3.6, 1.6, [-1, 0], 'x:doorglass', { offset: 0 });
    B(-43.6, -43.3, -1.85, 1.85, G + 2.5, G + 2.62, K.steel);
    for (const s of [-1, 1]) for (const [k, colr] of [[0, s < 0 ? 'c:#d9b93a' : 'c:#c64a3e'], [1, s < 0 ? 'c:#3d86c4' : 'c:#9aa3a8']]) {
      const u0 = -43.2 + k * 0.92; const v = s * 1.72;
      B(u0, u0 + 0.9, v - 0.03, v + 0.03, G, G + 2.5, K.steel);
      B(u0 + 0.06, u0 + 0.84, v - 0.04, v + 0.04, G + 0.95, G + 2.42, K.glassOut);
      B(u0 + 0.06, u0 + 0.84, v - 0.04, v + 0.04, G + 0.1, G + 0.9, colr);
    }
    // landing (portico floor), the two straight steps and the semicircular platform and fan steps
    B(-46.5, -43.3, -3.4, 3.4, 0, G, K.pmarble);
    B(-47.0, -46.5, -3.4, 3.4, 0, G - 0.1, K.pmarble);
    B(-47.0, -46.5, -3.4, 3.4, G - 0.13, G - 0.1, K.nosing);
    B(-47.0, -46.0, -6.0, -3.4, 0, 0.4, K.pmarble); B(-47.0, -46.0, 3.4, 6.0, 0, 0.4, K.pmarble);
    {
      const fan = (r, h, key) => { const g = new THREE.CylinderGeometry(r, r, h, 40, 1, false, Math.PI, Math.PI); g.translate(-47, h / 2, 0); add(key, g); };
      fan(7.2, 0.1, 'c:#b9705a'); fan(6.8, 0.2, 'c:#b9705a'); fan(6.4, 0.3, 'c:#b9705a'); fan(6.0, 0.4, K.pmarble);
      for (const [r, h] of [[7.2, 0.1], [6.8, 0.2], [6.4, 0.3]]) { const g = new THREE.CylinderGeometry(r, r, 0.03, 40, 1, false, Math.PI, Math.PI); g.translate(-47, h - 0.01, 0); add(K.nosing, g); }
      const inlay = new THREE.RingGeometry(5.6, 5.8, 32, 1, Math.PI / 2, Math.PI); inlay.rotateX(-Math.PI / 2); inlay.translate(-47, 0.405, 0); add(K.gmarble, inlay);
    }
    // ramps both sides with stainless steel railings
    for (const s of [-1, 1]) {
      const A = [-46.9, s * 6.0]; const Bp = [-43.5, s * 14.4];
      const L = Math.hypot(Bp[0] - A[0], Bp[1] - A[1]); const tu = (Bp[0] - A[0]) / L; const tv = (Bp[1] - A[1]) / L;
      bar([A[0], 0.25, A[1]], [Bp[0], -0.15, Bp[1]], 1.5, 0.3, 'c:#b9705a');
      bar([A[0], 0.405, A[1]], [Bp[0], 0.005, Bp[1]], 1.3, 0.01, K.pmarble);
      const nu = -tv * s; const nv = tu * s; // outward: away from the wing walls
      const off = (p, d) => [p[0] - nv * 0 + (s > 0 ? -1 : -1) * Math.abs(nu) * d, p[1] - Math.sign(s) * 0 + 0 * d];
      void off;
      const e = (p) => [p[0] - 0.72 * Math.abs(tv), p[1] + 0.72 * tu * Math.sign(-s) * -1 * 0];
      void e;
      // rail along the ramp's west edge
      const wu = -0.72 * Math.abs(tv); const wv = 0.72 * tu * (s > 0 ? -1 : 1) * 0;
      railLine([A[0] + wu, A[1] + wv + s * 0.25], [Bp[0] + wu, Bp[1] + wv], 0.4, 0, { key: K.steel, posts: K.steel, panel: false, h: 0.95, top: 0.05 });
    }
    // stepped sandstone wing walls fanning back from the portico, with carved rosette panels
    const WING = [[-46.0, 4.8, 7.4], [-44.2, 9.0, 5.8], [-42.8, 12.6, 4.4], [-41.8, 16.0, 3.0]];
    for (const s of [-1, 1]) {
      let prev = [-46.5, s * 4.8];
      for (const [u, v, h] of WING) {
        const p = [u, s * v];
        const L = Math.hypot(p[0] - prev[0], p[1] - prev[1]); const tu = (p[0] - prev[0]) / L; const tv = (p[1] - prev[1]) / L;
        const c = [(p[0] + prev[0]) / 2, (p[1] + prev[1]) / 2];
        obox(c[0], c[1], tu, tv, L + 0.3, 0.6, 0, h, K.ashlar, { collide: true });
        obox(c[0], c[1], tu, tv, L + 0.4, 0.75, h, h + 0.12, K.cream);
        const nn = [-tv, tu]; const out = (nn[0] < 0 ? 1 : -1);
        const fc = [c[0] + nn[0] * 0.31 * out, c[1] + nn[1] * 0.31 * out];
        plane(fc[0], fc[1], h - 1.2, 0.9, 0.9, [nn[0] * out, nn[1] * out], 'x:rosette', { offset: 0.01 });
        prev = p;
      }
    }

    // =================================================================================================
    // forecourt: octagonal pavers, planters, bicycles, lamp posts
    // =================================================================================================
    {
      const g = new THREE.PlaneGeometry(36, 52); scaleUV(g, 36 / XT.pavers); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * (52 / 36));
      g.rotateX(-Math.PI / 2); g.translate(-41 - 18, 0.03, 0); add(K.pavers, g);
    }
    for (const [u, v] of [[-62, -11], [-62, 11], [-70, -11], [-70, 11], [-55, -18], [-55, 18]]) {
      B(u - 1.8, u + 1.8, v - 0.8, v + 0.8, 0, 0.6, K.ashlar, { collide: true });
      B(u - 1.9, u + 1.9, v - 0.9, v + 0.9, 0.6, 0.68, K.cream);
      for (let k = 0; k < 5; k++) { const ge = new THREE.IcosahedronGeometry(0.42, 0); ge.translate(u - 1.4 + k * 0.7, 0.95, v); add(K.green, ge); }
    }
    for (const s of [-1, 1]) for (let k = 0; k < 12; k++) { // bicycles on stands along both sides
      const u = -73 + k * 1.0; const v = s * 21;
      for (const dv of [-0.5, 0.5]) { const t = new THREE.TorusGeometry(0.32, 0.025, 4, 14); t.rotateY(Math.PI / 2); t.translate(u, 0.33, v + dv); add(K.black, t); }
      bar([u, 0.33, v - 0.5], [u, 0.75, v - 0.05], 0.04, 0.04, k % 3 ? K.navy : K.red);
      bar([u, 0.33, v + 0.5], [u, 0.75, v - 0.05], 0.04, 0.04, k % 3 ? K.navy : K.red);
      bar([u, 0.75, v - 0.05], [u, 0.95, v - 0.45], 0.04, 0.04, K.metal);
      B(u - 0.25, u + 0.25, v + 0.2, v + 0.3, 0.92, 0.96, K.black);
    }
    for (const s of [-1, 1]) B(-73.5, -61.5, s * 21 - 0.6, s * 21 + 0.6, 0, 0.9, K.metal, { collide: false }), col(-73.5, -61.5, s * 21 - 0.6, s * 21 + 0.6, 0, 0.9);
    for (const [u, v] of [[-50, -14], [-50, 14], [-66, -24], [-66, 24]]) {
      kit.cyl(u, v, 0, 0.1, 7.5, K.metal, { seg: 8, collide: true });
      B(u - 0.5, u + 0.5, v - 0.2, v + 0.2, 7.3, 7.5, K.metal); B(u - 0.45, u + 0.45, v - 0.15, v + 0.15, 7.22, 7.3, K.lamp);
    }
    // hedges along the facade either side of the entrance
    for (const s of [-1, 1]) B(-39, -24.5, s * (s < 0 ? 17.4 : 21.7), s * (s < 0 ? 18.4 : 22.7), 0, 0.8, K.green, { collide: true });
  });

  // =====================================================================================================
  // STRUCTURE: floors, the first floor slab, the rotunda court
  // =====================================================================================================
  const roomLocal = room ? {
    NW: kit.local(room.x0, room.z0), NE: kit.local(room.x1, room.z0), SE: kit.local(room.x1, room.z1), SW: kit.local(room.x0, room.z1),
    W1: kit.local(room.x1, room.z1 - 2), W2: kit.local(room.x1 + 1, room.z1 - 2), W3: kit.local(room.x1 + 1, room.z1 - 0.5), W4: kit.local(room.x1, room.z1 - 0.5),
  } : null;
  const southEdgeV = (u) => { const { SW, SE } = roomLocal; return SW[1] + ((u - SW[0]) * (SE[1] - SW[1])) / (SE[0] - SW[0]); };
  const VEST = [-10.1, -7.55]; // the reading room's south door passage (local u)
  // the ground-floor outline: the footprint with the gameplay room, its south door passage and the step well
  // notched out (they stay at bare-ground level)
  const groundOutline = (() => {
    if (!roomLocal) return P;
    const i25 = P.findIndex(([u, v]) => Math.abs(u + 7.5) < 0.3 && Math.abs(v - 28.9) < 0.3);
    if (i25 < 0) return P;
    const { NW, NE, SE, SW, W1, W2, W3, W4 } = roomLocal;
    const notch = [[VEST[1], 28.9], [VEST[1], southEdgeV(VEST[1])], SE, W4, W3, W2, W1, NE, NW, SW, [VEST[0], southEdgeV(VEST[0])], [VEST[0], 28.95]];
    const nxt = P[(i25 + 1) % P.length];
    const fwd = nxt[0] < P[i25][0]; // the outline runs west along the south facade here
    return fwd ? [...P.slice(0, i25 + 1), ...notch, ...P.slice(i25 + 1)] : [...P.slice(0, i25), ...[...notch].reverse(), ...P.slice(i25)];
  })();
  const VOIDS = [rect(-42, STAIR_U0 + STEPS * TREAD, -6.5, 6.5), rect(-22.5, -12, -6.5, 6.5), rect(12.15, 32.45, -6.85, 6.85)];
  kit.layer('structure', () => {
    flatShape(groundOutline, [], G, K.kota, { circles: [[0, 0, RING_R]] });
    // marble: foyer and Area 1, rotunda walkway, east lobby and apse
    const foyer = [[-12.15, -9.35], [-40.9, -9.35], [-40.9, -8.9], ...P.filter(([u, v]) => u < -41 && v > -9 && v < 9.3), [-42.62, 9.35], [-12.15, 9.35]];
    flatShape(foyer, [], G + 0.004, K.marble);
    flatShape(rect(-11.85, 11.85, -11.85, 11.85), [], G + 0.004, K.marble, { circles: [[0, 0, RING_R]] });
    const east = [[12.15, -6.85], [32.6, -6.85], ...P.filter(([u, v]) => u > 32.4 && Math.abs(v) < 13.6), [12.15, 6.85]];
    flatShape(east.sort ? [[12.15, -6.85], [32.6, -6.85], [32.6, -12.9], ...P.filter(([u]) => u > 33), [32.7, 13.4], [32.7, 6.85], [12.15, 6.85]] : east, [], G + 0.004, K.marble);
    disc(-37, 0, G + 0.008, 0, 2.6, 'x:starburst');
    // first floor (top) and the ceilings of the ground floor (bottom)
    flatShape(P, VOIDS, F1, K.kota, { circles: [[0, 0, ROT_R]] });
    flatShape(P, VOIDS, F1 - 0.3, K.ceiling, { up: false, circles: [[0, 0, ROT_R]] });
    // void edges: cream fascia
    for (const [u0, u1, v0, v1] of [[-42, STAIR_U0 + STEPS * TREAD, -6.5, -6.5], [-42, STAIR_U0 + STEPS * TREAD, 6.5, 6.5], [-22.5, -12, -6.5, -6.5], [-22.5, -12, 6.5, 6.5]]) B(u0, u1, v0 - 0.05, v0 + 0.05, F1 - 0.45, F1, K.cream);
    B(-42.05, -41.95, -6.5, 6.5, F1 - 0.45, F1, K.cream);
    // the sunken gravel court and its two marble steps
    disc(0, 0, G - 0.3, 0, COURT_R, K.gravel, { seg: 56 });
    disc(0, 0, G - 0.15, COURT_R, RING_R, K.gmarble, { seg: 56 });
    ring(0, 0, G - 0.3, G - 0.15, COURT_R, K.gmarble, { inside: true, outside: false, seg: 56 });
    ring(0, 0, G - 0.15, G, RING_R, K.nosing, { inside: true, outside: false, seg: 56 });
  });

  // ---------- walkable floors: world-aligned collider strips from a height function ----------
  const entranceH = (u, v) => {
    let h = null; const set = (y) => { if (h === null || y > h) h = y; };
    if (u >= -46.5 && u <= -43.0 && Math.abs(v) <= 3.4) set(G);
    if (u >= -47.0 && u < -46.5 && Math.abs(v) <= 3.4) set(G - 0.1);
    if (u >= -47.0 && u <= -46.0 && Math.abs(v) <= 6.0) set(0.4);
    const rf = Math.hypot(u + 47, v);
    if (u < -47) { if (rf < 6.0) set(0.4); else if (rf < 6.4) set(0.3); else if (rf < 6.8) set(0.2); else if (rf < 7.2) set(0.1); }
    for (const s of [-1, 1]) {
      const A = [-46.9, s * 6.0]; const Bp = [-43.5, s * 14.4];
      const L = Math.hypot(Bp[0] - A[0], Bp[1] - A[1]); const tu = (Bp[0] - A[0]) / L; const tv = (Bp[1] - A[1]) / L;
      const t = ((u - A[0]) * tu + (v - A[1]) * tv) / L; const d = Math.abs((u - A[0]) * -tv + (v - A[1]) * tu);
      if (t >= 0 && t <= 1 && d <= 0.72) set(0.4 * (1 - t));
    }
    return h;
  };
  const groundH = (x, z) => {
    const [u, v] = kit.local(x, z);
    if (room) {
      if (x > room.x0 && x < room.x1 && z > room.z0 && z < room.z1) return null;
      if (x > room.x1 && x < room.x1 + 1 && z > room.z1 - 2 && z < room.z1 - 0.5) return null;
    }
    if (u > VEST[0] && u < VEST[1] && v > 27.5) return null;
    let h = null;
    if (inPoly(u, v, P)) { const r = Math.hypot(u, v); h = r < COURT_R ? G - 0.3 : r < RING_R ? G - 0.15 : G; }
    const e = entranceH(u, v);
    if (e !== null && (h === null || e > h)) h = e;
    return h;
  };
  const upperH = (x, z) => {
    const [u, v] = kit.local(x, z);
    if (!inPoly(u, v, P)) return null;
    const av = Math.abs(v);
    const gal = u >= -42.2 && u <= -12 && av >= 6.25 && av <= 9.6;
    const bridge = u >= -24.65 && u <= -22.25 && av <= 6.5;
    const hall6 = (u >= -23.7 && u <= -4 && v >= -27.9 && v <= -9.5) || (u >= -41.2 && u <= -23.6 && v >= -16.7 && v <= -9.5);
    const ringF = Math.abs(u) <= 12.1 && av <= 12 && Math.hypot(u, v) >= ROT_R - 0.3;
    return gal || bridge || hall6 || ringF ? F1 : null;
  };
  const strips = (fn, step, ox, oz, bottom) => {
    const corners = [[-56, -42], [45, -42], [45, 40], [-56, 40]].map(([u, v]) => kit.world(u, v));
    const x0 = ox + Math.floor((Math.min(...corners.map((p) => p.x)) - ox) / step) * step; const x1 = Math.max(...corners.map((p) => p.x));
    const z0 = oz + Math.floor((Math.min(...corners.map((p) => p.z)) - oz) / step) * step; const z1 = Math.max(...corners.map((p) => p.z));
    let open = new Map(); // key x0|x1|h -> collider being grown along z
    for (let z = z0; z < z1; z += step) {
      const runs = []; let cur = null;
      for (let x = x0; x < x1; x += step) {
        const h = fn(x + step / 2, z + step / 2);
        if (cur && h === cur.h) cur.x1 = x + step;
        else { if (cur && cur.h !== null) runs.push(cur); cur = { x0: x, x1: x + step, h }; }
      }
      if (cur && cur.h !== null) runs.push(cur);
      const next = new Map();
      for (const r of runs) {
        const key = `${r.x0.toFixed(3)}|${r.x1.toFixed(3)}|${r.h.toFixed(3)}`;
        const c = open.get(key);
        if (c) { c.maxZ = z + step; next.set(key, c); } else {
          const nc = { minX: r.x0, maxX: r.x1, minZ: z, maxZ: z + step, minY: bottom(r.h), maxY: r.h, walkable: true, enabled: true, building: 'library', floor: true };
          campus.colliders.push(nc); next.set(key, nc);
        }
      }
      open = next;
    }
  };
  const ox = room ? room.x0 : 0; const oz = room ? room.z0 : 0;
  strips(groundH, 0.25, ox, oz, () => 0);
  strips(upperH, 0.25, ox, oz, (h) => h - 0.3);

  // =====================================================================================================
  // WEST: foyer, twin stairs and bridge, Area 1, galleries, Heritage Gallery, Hall 1, Hall 6 upstairs
  // =====================================================================================================
  kit.layer('west', () => {
    const top = R - 0.3;
    wall(-40.9, -9.5, -12, -9.5, G, top, K.white, { ops: [{ at: -33, w: 2.4, bot: G, top: G + 2.8 }, { at: -18, w: 2.4, bot: G, top: G + 3.0 }, { at: -30, w: 2, bot: F1, top: F1 + 2.5 }, { at: -17, w: 2, bot: F1, top: F1 + 2.5 }] });
    wall(-42.6, 9.5, -12, 9.5, G, top, K.white, { ops: [{ at: -33, w: 2.4, bot: G, top: G + 2.8 }, { at: -20, w: 2.4, bot: G, top: G + 3.0 }] });
    for (const at of [-33, -18]) surround(true, at, -9.5, 2.4, G, at === -33 ? G + 2.8 : G + 3.0);
    for (const at of [-33, -20]) surround(true, at, 9.5, 2.4, G, at === -33 ? G + 2.8 : G + 3.0);
    wall(-23.6, -16.6, -23.6, -9.5, G, top, K.white, { ops: [{ at: -13, w: 2.4, bot: G, top: G + 2.8 }, { at: -13, w: 3, bot: F1, top: F1 + 2.6 }] });
    wall(-4, -27.8, -4, -12, G, top, K.white, { ops: [{ at: -20, w: 2.4, bot: G, top: G + 2.8 }] });
    // brick band and the clerestory row of jali niches round the foyer and Area 1
    for (const s of [-1, 1]) {
      const f = s * (9.5 - WT / 2 - 0.02);
      B(-42, -12.2, f - 0.02, f + 0.02, G + 3.4, G + 3.75, K.brick);
      B(-42, -12.2, f - 0.02, f + 0.02, F1 + 2.9, F1 + 3.3, K.brick);
      for (let u = -40.5; u < -13; u += 1.6) { B(u, u + 0.9, f - 0.03, f + 0.03, F1 + 1.75, F1 + 2.7, K.canopy); B(u + 0.1, u + 0.8, f - 0.04, f + 0.04, F1 + 1.85, F1 + 2.6, K.jali); }
    }
    // brick arches in the foyer's side walls (as in the panorama), under the gallery slab
    for (const s of [-1, 1]) for (const uc of [-37.5]) { // kept below the gallery slab and clear of the doors
      const f = s * (9.5 - WT / 2 - 0.04);
      const sh = new THREE.Shape(); const r0 = 1.9; const r1 = 2.3;
      sh.absarc(0, 0, r1, 0, Math.PI, false); sh.lineTo(-r0, 0); sh.absarc(0, 0, r0, Math.PI, 0, true); sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: false, curveSegments: 20 }); g.translate(0, 0, -0.03); scaleUV(g, 1 / 1.6); g.translate(uc, G + 1.9, f); add(K.brick, g);
      for (const x of [-r1, r0]) B(uc + x, uc + x + 0.4, f - 0.03, f + 0.03, G, G + 1.9, K.brick);
    }
    // --- twin stairs: straight flights rising east on both sides of the central passage, to the bridge ---
    const rise = (F1 - G) / STEPS; const uTop = STAIR_U0 + STEPS * TREAD;
    for (const s of [-1, 1]) {
      const vA = s * 2.2; const vB = s * 4.3;
      for (let j = 0; j < STEPS; j++) {
        const a = STAIR_U0 + j * TREAD; const yt = G + (j + 1) * rise;
        B(a, a + TREAD, vA, vB, G, yt, K.granite, { collide: true, walkable: true });
        B(a - 0.01, a + 0.04, vA, vB, yt - 0.03, yt + 0.004, K.nosing);
      }
      // white side face of the flight (towards the passage)
      const sh = new THREE.Shape(); sh.moveTo(0, G); sh.lineTo(uTop - STAIR_U0, G); sh.lineTo(uTop - STAIR_U0, F1); sh.lineTo(0, G + rise); sh.closePath();
      const g = new THREE.ShapeGeometry(sh); if (s < 0) { g.translate(STAIR_U0, 0, vA + 0.01); } else { g.scale(-1, 1, 1); g.rotateY(Math.PI); g.translate(STAIR_U0, 0, vA - 0.01); }
      add(K.white, g);
      // inner balustrade (diamond steel, teak handrail) along the passage
      railLine([STAIR_U0, s * 2.27], [uTop, s * 2.27], G + rise, F1, { h: 0.95 });
      // outer wall with a brick arch cut-out decoration
      B(STAIR_U0 - 0.3, uTop, s * 4.3, s * 4.5, G, F1, K.white, { collide: true });
      B(STAIR_U0 - 0.3, uTop, s * 4.3 - 0.02 * s, s * 4.5 + 0.02 * s, F1 - 0.35, F1, K.brick);
      const ar = new THREE.Shape(); ar.absarc(0, 0, 1.9, 0, Math.PI, false); ar.lineTo(-1.5, 0); ar.absarc(0, 0, 1.5, Math.PI, 0, true); ar.closePath();
      const ag = new THREE.ExtrudeGeometry(ar, { depth: 0.24, bevelEnabled: false, curveSegments: 18 }); ag.translate(0, 0, -0.12); scaleUV(ag, 1 / 1.6); ag.translate(STAIR_U0 + 2.6, G + 1.0, s * 4.4); add(K.brick, ag);
      kit.stairs.push({ name: s < 0 ? 'Twin stair S-N' : 'Twin stair S-S', u0: STAIR_U0, u1: uTop, v0: Math.min(vA, vB), v1: Math.max(vA, vB), y0: G, y1: F1 });
    }
    // the bridge over the passage and its white arch frame
    B(uTop, -22.5, -6.5, 6.5, F1 - 0.45, F1 - 0.3, K.ceiling);
    B(uTop - 0.08, uTop, -4.5, 4.5, F1 - 0.75, F1, K.canopy);
    const sp = spandrel(4.4, G + 3.3, 0.9, F1 - 0.3); vshape(sp, uTop - 0.1, 0, 0, 1, 0.2, K.canopy);
    // galleries' balustrades
    railLine([-42, -6.5], [uTop, -6.5], F1, F1); railLine([-42, 6.5], [uTop, 6.5], F1, F1);
    railLine([-22.5, -6.5], [-12.15, -6.5], F1, F1); railLine([-22.5, 6.5], [-12.15, 6.5], F1, F1);
    railLine([-42, -6.5], [-42, 6.5], F1, F1);
    railLine([-22.5, -6.5], [-22.5, 6.5], F1, F1);
    railLine([uTop, -6.5], [uTop, -4.5], F1, F1); railLine([uTop, -2.2], [uTop, 2.2], F1, F1); railLine([uTop, 4.5], [uTop, 6.5], F1, F1);
    // reading tables at the gallery balustrades
    for (const s of [-1, 1]) for (const u of [-38, -32, -19, -15]) { table8(u, s * 7.15, F1, true, { len: 1.6, chairs: false }); kit.chair(u - 0.5, s * 8.0, F1, [0, -s]); kit.chair(u + 0.5, s * 8.0, F1, [0, -s]); }
    // --- foyer furniture ---
    for (const s of [-1, 1]) { // issue/return counters (brick faced, glazed screens behind)
      B(-40.2, -34.5, s * 7.3, s * 8.1, G, G + 1.05, K.brick, { collide: true });
      B(-40.3, -34.4, s * 7.2, s * 8.2, G + 1.05, G + 1.12, K.teak);
      B(-40.2, -34.5, s * 8.9, s * 8.95, G + 1.2, G + 2.5, K.glass);
      B(-40.2, -34.5, s * 8.85, s * 9.0, G + 2.5, G + 2.6, K.steel);
      sign('ISSUE / RETURN', -37.35, s * 9.3, G + 2.7, 2.6, 0.42, [0, -s], { bg: '#1f3552', fg: '#ffffff', font: 'bold 36px system-ui, sans-serif' });
      for (const u of [-39, -36.5]) { B(u, u + 0.5, s * 7.6, s * 7.95, G + 1.12, G + 1.45, K.black); }
    }
    kit.cyl(-37, 0, G, 0.75, 0.8, K.red, { seg: 20, collide: true });
    disc(-37, 0, G + 0.805, 0, 0.75, K.red, { seg: 20 });
    sign('MUST READ', -37, -0.2, G + 0.85, 0.6, 0.3, [1, 0], { bg: '#1d1d1d', fg: '#f2c14e', font: 'bold 40px system-ui, sans-serif' });
    B(-33.4, -32.6, 5.0, 5.6, G, G + 1.1, K.teak, { collide: true }); // help desk lectern
    sign('HELP DESK', -32.58, 5.3, G + 0.5, 0.55, 0.3, [1, 0], { bg: '#2b2b2b', fg: '#ffffff', font: 'bold 34px system-ui, sans-serif' });
    B(-40.5, -40.0, -5.0, -4.4, G, G + 1.4, K.canopy, { collide: true }); // self issue kiosk
    plane(-40.0, -4.7, G + 1.0, 0.45, 0.35, [1, 0], 'e:#7fb4e0');
    sign('SELF ISSUE / RETURN', -39.98, -4.7, G + 1.45, 0.55, 0.12, [1, 0], { bg: '#ffffff', fg: '#1f3552', font: 'bold 30px system-ui, sans-serif' });
    sofa(-35, 4.4, G, [0, -1]); sofa(-35, -4.4, G, [0, 1]);
    B(-35.5, -34.5, -0.6 + 3.4, 0.6 + 3.4 - 0.4, G, G + 0.4, K.dark);
    for (const [u, v] of [[-41, -6.6], [-41, 6.6], [-33, -6.8], [-33, 6.8]]) plant(u, v, G, 0.7);
    for (const [u, v] of [[-37.5, 0], [-29.5, 0], [-17.2, 0]]) { // brass chandeliers under the skylights
      kit.cyl(u, v, R - 2.4, 0.015, 2.1, 'm:#b8902e', { seg: 4 });
      kit.cyl(u, v, R - 2.6, 0.45, 0.2, 'm:#b8902e', { seg: 12 });
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; const s2 = new THREE.SphereGeometry(0.09, 8, 6); s2.translate(u + Math.cos(a) * 0.45, R - 2.4, v + Math.sin(a) * 0.45); add(K.lamp, s2); }
    }
    for (const u of [-39, -34, -28]) for (const s of [-1, 1]) kit.tubeLight(u, s * 8.0, F1 - 0.3);
    // --- Area 1: portraits, floor guide, planters, hall signs ---
    for (const s of [-1, 1]) for (let u = -22; u < -13; u += 1.5) { if (Math.abs(u - (s < 0 ? -18 : -20)) < 1.8) continue; const f = s * (9.5 - WT / 2 - 0.04); B(u, u + 0.9, f - 0.03, f + 0.03, G + 1.6, G + 2.8, K.dark); B(u + 0.08, u + 0.82, f - s * 0.04, f - s * 0.035, G + 1.68, G + 2.72, 'c:#a8916b'); }
    plane(-21.0, 4.0, G + 0.6, 0.8, 1.0, [1, 0], 'x:guide', { offset: 0 }); B(-21.1, -21.02, 3.55, 4.45, G, G + 1.7, K.metal, { collide: true });
    for (const [u, v] of [[-21, -5], [-14, -5], [-14, 5]]) plant(u, v, G, 0.55);
    sign('HALL NO. 1', -18, -9.3, G + 3.25, 1.6, 0.35, [0, 1], { bg: '#7a2622', fg: '#f6ecd2' });
    sign('HALL NO. 5', -20, 9.3, G + 3.25, 1.6, 0.35, [0, -1], { bg: '#7a2622', fg: '#f6ecd2' });
    sign('LIBRARY OFFICES · GMAT CENTRE', -33, 9.3, G + 3.05, 2.6, 0.3, [0, -1], { bg: '#7a2622', fg: '#f6ecd2', font: 'bold 30px Georgia, serif' });
    sign('BITS Pilani HERITAGE GALLERY', -33, -9.3, G + 3.05, 2.6, 0.3, [0, 1], { bg: '#7a2622', fg: '#f6ecd2', font: 'bold 30px Georgia, serif' });
    for (const u of [-20, -15]) for (const s of [-1, 1]) kit.tubeLight(u, s * 8.0, F1 - 0.3);
    // --- Heritage Gallery (west wing north) ---
    for (let u = -40; u < -25; u += 1.8) { B(u, u + 1.2, -16.1, -16.04, G + 1.3, G + 2.3, K.dark); B(u + 0.07, u + 1.13, -16.04, -16.0, G + 1.36, G + 2.24, 'c:#b59a72'); }
    B(-40.4, -24.2, -16.1, -16.05, G + 2.6, G + 3.0, 'c:#3f6d8e');
    sign('PILANI CAMPUS · HYDERABAD CAMPUS · GOA CAMPUS · DUBAI CAMPUS', -32.3, -16.0, G + 2.62, 7.0, 0.36, [0, 1], { bg: '#3f6d8e', fg: '#ffffff', font: 'bold 26px system-ui, sans-serif' });
    sofa(-34, -11, G, [0, -1], 'c:#e8dcc4'); sofa(-29, -11, G, [0, -1], 'c:#e8dcc4');
    B(-38, -37.4, -12.8, -12.2, G, G + 1.3, K.canopy, { collide: true }); plane(-37.4, -12.5, G + 0.9, 0.4, 0.3, [1, 0], 'e:#7fb4e0');
    for (const u of [-37, -31, -26]) kit.tubeLight(u, -13, F1 - 0.3);
    // --- Hall 1: reference and reading ---
    for (const v of [-24, -19.5, -15]) for (const u of [-19, -11]) table8(u, v, G, true, { len: 4.8, seat: K.black });
    stack(true, -23.2, -5, -27.2, G, { single: 1, h: 2.2 });
    stack(false, -27.4, -17, -23.1, G, { single: 1, h: 2.2 });
    for (const u of [-20, -14, -8]) for (const v of [-24, -18, -13]) kit.tubeLight(u, v, F1 - 0.3);
    // --- Hall 6 (first floor): bound volumes, carrels, tables; brainstorm room and E-zone in the annex ---
    for (let u = -22.5; u < -15; u += 2.2) stack(false, -26.5, -19, u, F1);
    for (let u = -13.5; u < -5; u += 1.4) { B(u, u + 1.2, -27.4, -26.8, F1 + 0.72, F1 + 0.76, K.teak, { collide: true }); B(u + 1.18, u + 1.22, -27.4, -26.6, F1, F1 + 1.3, K.dark); kit.chair(u + 0.6, -26.3, F1, [0, -1]); }
    for (const [u, v] of [[-18, -14], [-11, -14], [-11, -20]]) table8(u, v, F1, true);
    sign('HALL NO. 6', -17, -9.3, F1 + 2.65, 1.6, 0.35, [0, 1], { bg: '#7a2622', fg: '#f6ecd2' });
    sign('HALL NO. 6 · BOUND VOLUMES', -17, -9.7, F1 + 2.65, 2.4, 0.35, [0, -1], { bg: '#7a2622', fg: '#f6ecd2' });
    // brainstorm room: glazed partitions
    B(-39.8, -33, -16.2, -16.1, F1, R - 0.3, K.white);
    for (const [u0, u1, v0, v1] of [[-33.1, -33.0, -16.2, -12.6], [-39.8, -34.4, -12.6, -12.5], [-33.6, -33.0, -12.6, -12.5]]) { B(u0, u1, v0, v1, F1, F1 + 2.7, K.glass); col(u0, u1, v0, v1, F1, F1 + 2.7); B(u0, u1, v0, v1, F1 + 2.7, F1 + 2.8, K.steel); }
    table8(-36.4, -14.4, F1, true, { len: 3.2 });
    sign('BRAINSTORM ROOM', -36.4, -12.45, F1 + 2.3, 1.8, 0.3, [0, 1], { bg: '#1f3552', fg: '#ffffff', font: 'bold 32px system-ui, sans-serif' });
    for (let u = -31; u < -25; u += 1.5) { B(u, u + 1.3, -16.3, -15.7, F1 + 0.72, F1 + 0.76, K.canopy, { collide: true }); plane(u + 0.65, -16.0, F1 + 0.8, 0.5, 0.35, [0, 1], 'e:#7fb4e0'); kit.chair(u + 0.65, -15.2, F1, [0, -1], { seat: K.black }); }
    sign('E-ZONE', -28.2, -16.25, F1 + 2.0, 1.2, 0.3, [0, 1], { bg: '#1f3552', fg: '#ffffff', font: 'bold 34px system-ui, sans-serif' });
    for (const u of [-37, -31, -26]) kit.tubeLight(u, -13.5, R - 0.3);
    for (const u of [-20, -14, -8]) for (const v of [-24, -18, -13]) kit.tubeLight(u, v, R - 0.3);
    for (const u of [-38, -30, -20, -15]) for (const s of [-1, 1]) kit.tubeLight(u, s * 8, R - 0.3);
  });

  // =====================================================================================================
  // CENTRE: the rotunda (Area 2): two tiers of pink Dholpur sandstone columns, cusped arches, jali, court
  // =====================================================================================================
  kit.layer('centre', () => {
    const top = R - 0.3;
    wall(-12, -12, -12, 12, G, top, K.white, { ops: [{ at: 0, w: 7, bot: G, top: G + 4.0 }, { at: -8, w: 2.8, bot: F1, top: F1 + 2.6 }, { at: 8, w: 2.8, bot: F1, top: F1 + 2.6 }] });
    wall(-12, -12, 12, -12, G, top, K.white);
    wall(-12, 12, 12, 12, G, top, K.white, { ops: [{ at: 2, w: 3, bot: G, top: G + 3.4 }] });
    wall(12, -12, 12, 12, G, top, K.white, { ops: [{ at: 0, w: 7, bot: G, top: G + 4.0 }] });
    for (const [u, c] of [[-12, 0], [12, 0]]) { const sp = spandrel(7, G + 3.0, 1.0, G + 4.0, 7); vshape(sp, u, c, 0, 1, 0.34, K.sand); }
    { const sp = spandrel(3, G + 2.6, 0.8, G + 3.4, 5); vshape(sp, 2, 12, 1, 0, 0.34, K.sand); }
    sign('HALL NO. 4', 2, 11.8, G + 3.5, 1.6, 0.35, [0, -1], { bg: '#7a2622', fg: '#f6ecd2' });
    // columns: 16 on a ring of 8 m, both tiers
    const N = 16;
    for (let k = 0; k < N; k++) {
      const a = ((k + 0.5) / N) * Math.PI * 2; const u = Math.cos(a) * ROT_R; const v = Math.sin(a) * ROT_R;
      for (const [y0, y1] of [[G, F1 - 0.45], [F1, top - 0.3]]) {
        kit.cyl(u, v, y0, 0.3, y1 - y0, K.sand, { seg: 8, collide: true });
        kit.cyl(u, v, y0, 0.38, 0.3, K.sand, { seg: 8 });
        for (const f of [0.35, 0.7]) kit.cyl(u, v, y0 + (y1 - y0) * f, 0.33, 0.14, K.cream, { seg: 8 });
        kit.cyl(u, v, y1 - 0.25, 0.4, 0.25, K.cream, { seg: 8 });
      }
    }
    // bays: lower tier, jharokha frames with jali on the odd bays; upper tier, jali parapet all round and
    // cusped arches on the odd bays
    const chord = 2 * ROT_R * Math.sin(Math.PI / N) - 0.6;
    for (let k = 0; k < N; k++) {
      const a = (k / N) * Math.PI * 2; const rc = ROT_R * Math.cos(Math.PI / N);
      const cu = Math.cos(a) * rc; const cv = Math.sin(a) * rc; const tu = -Math.sin(a); const tv = Math.cos(a);
      if (k % 2) {
        vshape(spandrel(chord, G + 2.7, 1.2, F1 - 0.45, 7), cu, cv, tu, tv, 0.22, K.sand);
        obox(cu, cv, tu, tv, chord, 0.14, G, G + 0.9, K.jali, { collide: true });
        obox(cu, cv, tu, tv, chord + 0.05, 0.2, G + 0.9, G + 0.98, K.cream);
        for (const s of [-1, 1]) obox(cu + tu * s * (chord / 2 - 0.08), cv + tv * s * (chord / 2 - 0.08), tu, tv, 0.16, 0.22, G, G + 2.7, K.sand);
        vshape(spandrel(chord, F1 + 2.2, 1.1, top - 0.55, 7), cu, cv, tu, tv, 0.22, K.sand);
      }
      obox(cu, cv, tu, tv, chord + 0.02, 0.14, F1, F1 + 0.95, K.jali, { collide: true });
      obox(cu, cv, tu, tv, chord + 0.05, 0.22, F1 + 0.95, F1 + 1.03, K.cream);
    }
    // ring beams: the first floor's edge and the roof's
    ring(0, 0, F1 - 0.45, F1 + 0.05, ROT_R + 0.02, K.cream, { inside: true, seg: 64 });
    ring(0, 0, top - 0.55, top, ROT_R + 0.02, K.cream, { inside: true, seg: 64 });
    ring(0, 0, top, R + 1.4, ROT_R + 0.2, K.canopy, { inside: true, outside: false, seg: 64 });
    for (let k = 0; k < 20; k++) { const a = (k / 20) * Math.PI * 2; const c = new THREE.CircleGeometry(0.16, 10); c.rotateY(Math.atan2(-Math.cos(a), -Math.sin(a))); c.translate(Math.cos(a) * (ROT_R + 0.15), R + 0.6, Math.sin(a) * (ROT_R + 0.15)); add(K.lamp, c); }
    // court: airport benches facing out, potted plants
    for (let k = 0; k < 8; k++) {
      const a = ((k + 0.5) / 8) * Math.PI * 2; const u = Math.cos(a) * 4.3; const v = Math.sin(a) * 4.3; const f = [Math.cos(a), Math.sin(a)];
      const parts = [];
      for (const x of [-0.62, 0, 0.62]) parts.push([x - 0.27, x + 0.27, 0.42, 0.46, -0.22, 0.22, K.steel], [x - 0.27, x + 0.27, 0.46, 0.85, -0.26, -0.22, K.steel]);
      parts.push([-0.95, 0.95, 0.36, 0.42, -0.05, 0.05, K.metal], [-0.85, -0.8, G - 0.3 - G, 0.42, -0.2, 0.2, K.metal], [0.8, 0.85, G - 0.3 - G, 0.42, -0.2, 0.2, K.metal]);
      kit._rot(u, v, f, kit._up(parts, G - 0.3));
      col(u - 0.6, u + 0.6, v - 0.6, v + 0.6, G - 0.3, G + 0.2);
      const b = ((k) / 8) * Math.PI * 2; plant(Math.cos(b) * 5.3, Math.sin(b) * 5.3, G - 0.3, 0.35);
    }
    plant(0, 0, G - 0.3, 0.8);
    // ambulatory: help desk, stationery counter, book displays, downlights
    B(-1.6, 1.6, -10.9, -10.2, G, G + 1.05, K.teak, { collide: true });
    sign('HELP DESK', 0, -10.15, G + 0.55, 1.0, 0.3, [0, 1], { bg: '#2b2b2b', fg: '#ffffff', font: 'bold 34px system-ui, sans-serif' });
    B(8.4, 10.6, -10.6, -9.9, G, G + 1.05, K.teak, { collide: true });
    sign('STATIONERY', 9.5, -9.85, G + 0.55, 1.2, 0.3, [0, 1], { bg: '#1f3552', fg: '#ffffff', font: 'bold 34px system-ui, sans-serif' });
    for (const u of [-7.5, 5.5]) stack(true, u - 1.4, u + 1.4, -11.55, G, { single: 1, h: 1.9, levels: 5 });
    for (const v of [-7.5, 7.5]) stack(false, v - 1.4, v + 1.4, 11.55, G, { single: -1, h: 1.9, levels: 5 });
    for (let k = 0; k < 12; k++) { const a = ((k + 0.5) / 12) * Math.PI * 2; disc(Math.cos(a) * 10, Math.sin(a) * 10, F1 - 0.305, 0, 0.12, K.lamp, { up: false, seg: 10 }); }
    for (const [u, v] of [[8.5, 8.5], [-8.5, 8.5], [8.5, -8.5], [-8.5, -8.5]]) table8(u, v, F1, Math.abs(u) > 0 && u * v > 0, { len: 1.8 });
    for (const [u, v] of [[10, 0], [-10, -3], [0, 10], [0, -10]]) kit.tubeLight(u, v, R - 0.3, Math.abs(u) > 0 ? [0, 1] : [1, 0]);
  });

  // =====================================================================================================
  // SOUTH: Hall 5 and Hall 4 (round the gameplay reading room)
  // =====================================================================================================
  kit.layer('south', () => {
    const top = R - 0.3;
    wall(-17, 9.5, -17, 28.95, G, top, K.white, { ops: [{ at: 15, w: 3.5, bot: G, top: G + 3.0 }] });
    surround(false, 15, -17, 3.5, G, G + 3.0);
    // wedge closures and the jambs of the reading room's south door passage
    B(-14.85, -14.65, 27.25, 28.95, 0, top, K.white, { collide: true });
    if (room) {
      for (const u of VEST) { const v0 = southEdgeV(u) - 0.15; B(u - 0.08, u + 0.08, v0, 28.95, 0, F1 - 0.3, K.white, { collide: true }); }
      B(VEST[0], VEST[1], southEdgeV(VEST[1]) - 0.1, 28.6, 2.7, F1 - 0.3, K.white);
      B(VEST[0] + 0.05, VEST[1] - 0.05, southEdgeV(VEST[0]), 28.6, 2.68, 2.7, K.ceiling);
    }
    // --- Hall 5: teak tables, wooden issue counter, wall shelves ---
    for (const u of [-38.5, -33.5, -28.5]) for (const v of [13, 17.5]) table8(u, v, G, false);
    for (const v of [13, 17.5, 22, 26]) table8(-20.3, v, G, true, { len: 3.0 });
    B(-23.2, -21.8, 10.4, 11.2, G, G + 1.05, K.teak, { collide: true });
    stack(true, -40, -24.5, 20.5, G, { single: -1, h: 2.0, levels: 5 });
    stack(false, 21.5, 28.5, -23.2, G, { single: 1, h: 2.0, levels: 5 });
    sign('HALL NO. 5 · READING', -22.5, 9.7, G + 2.6, 2.4, 0.35, [0, 1], { bg: '#7a2622', fg: '#f6ecd2' });
    sign('HBR COLLECTION · BOOKS BY BITS FACULTY', -32, 20.25, G + 2.3, 4.2, 0.3, [0, -1], { bg: '#1f3552', fg: '#ffffff', font: 'bold 28px system-ui, sans-serif' });
    for (const u of [-38, -33, -28, -20]) for (const v of [12.5, 18]) { kit.tubeLight(u, v, F1 - 0.3); }
    for (const v of [22, 26.5]) kit.tubeLight(-20, v, F1 - 0.3);
    for (const [u, v] of [[-36, 15.2], [-30.5, 15.2]]) kit.fan(u, v, F1 - 0.3);
    // --- Hall 4: reference, MakerSpace, research zone, young learners; tables east of the reading room ---
    for (const u of [3.5, 8.5, 13]) for (const v of [15.5, 20.5, 25]) table8(u, v, G, false);
    stack(true, -10.5, -3.5, 13.0, G, { single: 1, h: 1.4, levels: 3 });
    for (const [u, v] of [[-15.5, 12.8], [-1.3, 14.5]]) { kit.cyl(u, v, G, 0.3, 0.42, 'c:#2f6db0', { seg: 10, collide: true }); kit.cyl(u, v, G + 0.42, 0.32, 0.08, 'c:#e6d36a', { seg: 10 }); }
    // MakerSpace in the south lobe: benches with 3D printers
    for (const u of [2, 6, 10]) { B(u - 1.2, u + 1.2, 34.8, 35.6, G, G + 0.9, K.canopy, { collide: true }); B(u - 0.35, u + 0.35, 34.9, 35.5, G + 0.9, G + 1.55, K.black); B(u - 0.25, u + 0.25, 35.0, 35.4, G + 1.0, G + 1.35, 'e:#ffb347'); }
    table8(6, 31.5, G, true, { len: 3.2 });
    sign('MAKERSPACE', 6, 35.9, G + 2.4, 2.2, 0.4, [0, -1], { bg: '#1f3552', fg: '#ffffff', font: 'bold 36px system-ui, sans-serif' });
    flatShape(rect(10.5, 15.5, 29.2, 33.8), [], G + 0.01, 'c:#e9c25a'); // young learners' rainbow corner
    for (const [i, c] of ['#d6493f', '#e98a3a', '#e9c25a', '#5aa35a', '#4a7fc4'].entries()) B(10.6 + i * 0.95, 11.4 + i * 0.95, 33.95, 34.0, G, G + 1.6, `c:${c}`);
    sign('HALL NO. 4 · REFERENCE', 8, 12.2, G + 3.0, 2.6, 0.35, [0, 1], { bg: '#7a2622', fg: '#f6ecd2' });
    for (const u of [-14, 0, 4, 9, 13.5]) for (const v of [14, 19.5, 25]) { if (u === -14 && v > 15) continue; kit.tubeLight(u, v, F1 - 0.3); }
    for (const u of [-14.8, -16]) kit.tubeLight(u + 0.6, 22, F1 - 0.3, [0, 1]);
    for (const u of [2, 8, 13]) kit.tubeLight(u, 32, F1 - 0.3);
    for (const [u, v] of [[6, 18], [11, 23]]) kit.fan(u, v, F1 - 0.3);
  });

  // =====================================================================================================
  // EAST: the east lobby (Area Ending), Halls 2 and 3, the closed north lobe (WILP)
  // =====================================================================================================
  kit.layer('east', () => {
    const top = R - 0.3;
    wall(12, -7, 32.6, -7, G, top, K.white, { ops: [{ at: 24, w: 3, bot: G, top: G + 3.2 }] });
    wall(12, 7, 32.6, 7, G, top, K.white, { ops: [{ at: 24, w: 3, bot: G, top: G + 3.2 }] });
    surround(true, 24, -7, 3, G, G + 3.2); surround(true, 24, 7, 3, G, G + 3.2);
    wall(32.6, -13, 32.6, -7, G, top, K.white); wall(32.6, 7, 32.6, 13.5, G, top, K.white);
    wall(12, 12, 16.2, 12, G, top, K.white);
    wall(16.2, 12, 16.2, 28.1, G, top, K.white, { ops: [{ at: 20, w: 2.4, bot: G, top: G + 2.8 }] });
    wall(-8.5, -27.8, 16.2, -27.8, G, top, K.white);
    B(3, 4.8, -27.62, -27.6, G, G + 2.4, K.dark);
    sign('WILP DIVISION', 3.9, -27.6, G + 2.6, 2.0, 0.35, [0, 1], { bg: '#7a2622', fg: '#f6ecd2' });
    sign('HALL NO. 2 · CALL NO. (001-623)', 24, -6.8, G + 3.35, 3.6, 0.4, [0, 1], { bg: '#7a2622', fg: '#f6ecd2', font: 'bold 32px Georgia, serif' });
    sign('HALL NO. 3 · CALL NO. (624-999)', 24, 6.8, G + 3.35, 3.6, 0.4, [0, -1], { bg: '#7a2622', fg: '#f6ecd2', font: 'bold 32px Georgia, serif' });
    sign('HALL NO. 2', 24, -7.2, G + 3.35, 1.6, 0.35, [0, -1], { bg: '#7a2622', fg: '#f6ecd2' });
    sign('HALL NO. 3', 24, 7.2, G + 3.35, 1.6, 0.35, [0, 1], { bg: '#7a2622', fg: '#f6ecd2' });
    // the logo pillar with the Director's message, and the mural
    B(19.3, 20.7, -0.7, 0.7, G, G + 4.6, K.white, { collide: true });
    for (const y of [G + 0.3, G + 4.2]) B(19.25, 20.75, -0.75, 0.75, y, y + 0.25, K.brick);
    sign('BITS Pilani', 19.27, 0, G + 3.2, 1.2, 0.5, [-1, 0], { bg: '#f4f1ea', fg: '#1f3552', font: 'bold 44px Georgia, serif' });
    sign('BITS Pilani', 20.73, 0, G + 3.2, 1.2, 0.5, [1, 0], { bg: '#f4f1ea', fg: '#1f3552', font: 'bold 44px Georgia, serif' });
    sign('Message from the Vice-Chancellor', 20, -0.73, G + 1.4, 1.1, 0.7, [0, -1], { bg: '#f2ead6', fg: '#3b2b1b', font: 'bold 18px Georgia, serif' });
    plane(16, -6.83, G + 1.2, 6, 4.2, [0, 1], 'x:mural', { offset: 0 });
    for (const [u, v] of [[36, -6], [36, 6]]) table8(u, v, G, false, { len: 3.0 });
    for (const [u, v] of [[14, -5.5], [14, 5.5], [31, -5.5], [31, 5.5]]) plant(u, v, G, 0.55);
    for (const u of [15, 22, 29]) for (const s of [-1, 1]) kit.tubeLight(u, s * 6.4, G + 4.4);
    // Hall 2: stacks in rows at right angles to the door wall, a cross aisle, the study tables by the door
    for (let u = -1.5; u < 31; u += 2.2) { stack(false, -26.8, -21.2, u, G); stack(false, -19.8, -13.6, u, G); }
    for (const u of [16, 30]) table8(u, -9.5, G, true, { len: 3.0 });
    for (let u = 0; u < 31; u += 5) for (const v of [-24, -17]) kit.tubeLight(u, v, F1 - 0.3, [0, 1]);
    for (const u of [16, 23, 30]) kit.tubeLight(u, -9.5, F1 - 0.3);
    // Hall 3: stacks, and the G.D. Birla rare-book room's display case
    for (let u = 18.6; u < 31.5; u += 2.2) { stack(false, 13.4, 19.6, u, G); stack(false, 21, 27.3, u, G); }
    B(13, 15.5, 8.2, 9.0, G, G + 1.0, K.dark, { collide: true }); B(13, 15.5, 8.2, 9.0, G + 1.0, G + 1.5, K.glass);
    for (let u = 19; u < 32; u += 5) for (const v of [16, 24]) kit.tubeLight(u, v, F1 - 0.3, [0, 1]);
    for (const u of [16, 23, 30]) kit.tubeLight(u, 9.5, F1 - 0.3);
  });

  // =====================================================================================================
  // The gameplay room: a door in its east wall to Hall 4, three steps up to the hall floor
  // =====================================================================================================
  if (room) kit.layer('south', () => openReadingRoom(kit, campus, room, { sign }));

  finishSigns();
  // interactables: read a book at the stacks (the gameplay room keeps its own)
  kit.interact('bookshelf', 23.5, -14.2, 'Pick a book from Hall 2 and read');
  kit.interact('bookshelf', 23.5, 20.3, 'Pick a book from Hall 3 and read');
  kit.interact('bookshelf', -18.5, -19.8, 'Read the bound volumes in Hall 6', { y: F1 + 1.2 });

  // what the building tells the rest of the game
  kit.floors.push({ y: G, name: 'Ground floor' }, { y: F1, name: 'First floor' });
  kit.entrance('West entrance (fan steps)', -55, 0, [-1, 0]);
  const rl = kit.local(...(room ? [room.exit.x, room.exit.z] : [210.2, -189.8]));
  kit.entrance('Reading room south door', rl[0], rl[1], [0, 1]);
  kit.room('foyer', 'Foyer', -43, -31.2, -9.5, 9.5, G, R);
  kit.room('area1', 'Area 1', -24.4, -12, -9.5, 9.5, G, R);
  kit.room('rotunda', 'Rotunda (Area 2)', -12, 12, -12, 12, G - 0.3, R);
  kit.room('eastLobby', 'East lobby', 12, 42, -7, 7, G, R);
  kit.room('hall1', 'Hall No. 1', -23.6, -4, -27.8, -9.5, G, F1);
  kit.room('hall2', 'Hall No. 2', -4, 32.6, -27.8, -7, G, F1);
  kit.room('hall3', 'Hall No. 3', 12, 32.6, 7, 28.1, G, F1);
  kit.room('hall4', 'Hall No. 4', -17, 16.2, 9.5, 36.4, G, F1);
  kit.room('hall5', 'Hall No. 5', -42.6, -17, 9.5, 29, G, F1);
  kit.room('heritage', 'Birla Heritage Gallery', -40.9, -23.6, -16.6, -9.5, G, F1);
  kit.room('hall6', 'Hall No. 6', -41, -4, -27.8, -9.5, F1, R, 1);
  kit.room('galleries', 'First-floor galleries', -42, -12, -9.5, 9.5, F1, R, 1);
}

// The gameplay room (built by placeRooms, world-aligned) gets a door in its east wall: the old wall mesh and its
// collider are replaced by pieces with an opening, and steps climb the 0.6 m plinth to Hall 4's floor.
function openReadingRoom(kit, campus, r, { sign }) {
  const T = 0.2; const H = 3.2;
  const z0 = r.z1 - 2.0; const z1 = r.z1 - 0.5; // the opening (on the collider grid)
  const cz = (r.z0 + r.z1) / 2;
  let removed = false;
  campus.root.traverse((o) => {
    if (removed || !o.isMesh) return;
    const p = o.geometry?.parameters;
    if (p && Math.abs(o.position.x - r.x1) < 1e-3 && Math.abs(o.position.z - cz) < 1e-3 && Math.abs(p.width - T) < 1e-3 && Math.abs(p.depth - (r.z1 - r.z0)) < 1e-3) { o.visible = false; removed = o; }
  });
  if (removed) removed.removeFromParent();
  for (const c of campus.colliders) if (Math.abs(c.minX - (r.x1 - T / 2)) < 1e-3 && Math.abs(c.maxX - (r.x1 + T / 2)) < 1e-3 && Math.abs(c.minZ - r.z0) < 1e-3 && Math.abs(c.maxZ - r.z1) < 1e-3) c.enabled = false;
  const wkey = 't:plaster:#f3ead8';
  const wbox = (x0, x1, za, zb, y0, y1, key, { collide = false, walkable = false } = {}) => {
    const tile = key.startsWith('t:') ? TEX_SIZE[key.split(':')[1]] || 2 : 0;
    const g = tile ? worldBoxGeometry(x1 - x0, y1 - y0, zb - za, tile) : new THREE.BoxGeometry(x1 - x0, y1 - y0, zb - za);
    g.translate((x0 + x1) / 2 - kit.O[0], (y0 + y1) / 2, (za + zb) / 2 - kit.O[1]);
    g.rotateY(-kit.angle);
    kit.geo(key, g);
    if (collide) campus.colliders.push({ minX: x0, maxX: x1, minZ: za, maxZ: zb, minY: y0, maxY: y1, walkable, enabled: true, building: 'library' });
  };
  const x0 = r.x1 - T / 2; const x1 = r.x1 + T / 2;
  wbox(x0, x1, r.z0, z0, 0, H, wkey, { collide: true });
  wbox(x0, x1, z1, r.z1, 0, H, wkey, { collide: true });
  wbox(x0, x1, z0, z1, 2.5, H, wkey);
  wbox(x0 - 0.04, x1 + 0.04, z0 - 0.08, z0, 0, 2.5, 'c:#6b4a2e'); wbox(x0 - 0.04, x1 + 0.04, z1, z1 + 0.08, 0, 2.5, 'c:#6b4a2e'); wbox(x0 - 0.04, x1 + 0.04, z0 - 0.08, z1 + 0.08, 2.44, 2.56, 'c:#6b4a2e');
  // steps (world-aligned, as the room is) up to Hall 4's floor at the plinth level, with cheek walls and rails
  const rises = [0.15, 0.3, 0.45];
  rises.forEach((h, i) => { wbox(r.x1 + T / 2 + i * 0.3 - (i === 0 ? 0 : 0), r.x1 + T / 2 + (i + 1) * 0.3, z0, z1, 0, h, 'c:#9ea49b', { collide: true, walkable: true }); wbox(r.x1 + T / 2 + i * 0.3, r.x1 + T / 2 + i * 0.3 + 0.04, z0, z1, h - 0.02, h + 0.005, 'c:#ece8df'); });
  for (const [za, zb] of [[z0 - 0.12, z0], [z1, z1 + 0.12]]) {
    wbox(x1, r.x1 + 1.0, za, zb, 0, G, 't:plaster:#f7f4ee', { collide: true });
    wbox(x1, r.x1 + 1.0, za, zb, G, G + 0.95, 'c:#1d2023', { collide: true });
    wbox(x1, r.x1 + 1.0, za - 0.02, zb + 0.02, G + 0.95, G + 1.0, 't:wood:#5e3d24');
  }
  // the sign over the door, on the hall side
  const [su, sv] = kit.local(r.x1 + T / 2 + 0.02, (z0 + z1) / 2);
  sign('HALL NO. 4 · READING ROOM', su, sv, 2.62, 2.0, 0.32, [kit.eu[0], kit.ev[0]], { bg: '#7a2622', fg: '#f6ecd2', font: 'bold 30px Georgia, serif' });
}
