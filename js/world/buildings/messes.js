// The messes and food places: VKB, RP, Ram-Budh, Shankar-Vyas and Malviya messes, the (off-campus) Boys Canteen,
// the All Night Canteen (ANC) and the C'not (Connaught) market. Research: research/buildings/messes.md.
//
// Every boys' mess is one plan type: a single-storey dining hall (ceiling 4.6 m, roof 4.9 m, parapet to 5.6 m) on
// one side and a lower kitchen block (roof 3.9 m) on the other, cream render with maroon bands, grilled windows
// under sunshades, pilasters on the bay lines, a ribbed hall roof and water tanks and flues on the kitchen. Each
// footprint is squared up in its own frame (the hostel grid, about -9 degrees) and split into cells: cells in
// the hall rectangle get the hall height, the rest the kitchen height.
//
// Only VKB is enterable. The gameplay room 'mess' (14 x 9 m, built world-aligned by bits-world placeRooms)
// becomes part of a real hall (15 x 23 m, Type A from the official tour: ochre transverse beams, steel tables
// with attached seats, serving hatches in the kitchen wall, a snack kiosk by the door). Its plain walls, ceiling,
// wooden tables and lights are removed; its counter, food tubs, menu boards, Pitstop counter and fridge are
// turned (about the door) to line up with the hall; its colliders, interactables, NPC seats and staff spot follow.
// The room keeps its id, door side, roomAt rectangle and exit. A wash room (north) and a store (south) close
// the ends of the hall wing.
//
// The ANC is rebuilt in front of the tall building it backs onto (OSM, unnamed): a tin canopy of stalls, a
// paved yard with round tables and mesh chairs, a low wall with railings and a gate (campus.buildANC is
// replaced; the 'canteen' interactable, staff and seat spots are kept). The C'not market's two shop rows (OSM,
// unnamed) get arcaded shopfronts with signboards, open and shuttered shops, a sandy street with raised planters,
// tables, a lamp pillar and parked bikes.
//
// Kits: the module's own kit is VKB's frame (the hall interior is its zone 'hall'); every other building gets
// its own Kit (shell only), finished here.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Kit } from './kit.js';
import { worldBoxGeometry, TEX_SIZE } from '../textures.js';

const T = 0.3; // facade wall thickness, inwards from the outline
const SKIN = 0.03; // white interior skin of the VKB hall walls
const HALL = { roof: 4.9, slab: 0.3, par: 0.7 }; // ceiling 4.6, parapet top 5.6
const KITCHEN = { roof: 3.9, slab: 0.3, par: 0.5 };
const CEIL = HALL.roof - HALL.slab; // 4.6

const K = {
  cream: 't:plaster:#efe5cf', maroon: 'c:#a8443a', coping: 'c:#ece6d8', plinth: 'c:#8f4a3b', roof: 't:concrete:#cbc6bc',
  frame: 'c:#f4f0e6', dark: 'c:#2c353e', glass: 'g:#bcd3dc', grille: 'm:#2b2f33', white: 'c:#f6f4ee', ochre: 'c:#c8913a',
  kota: 'x:kota', steel: 'm:#c9ced3', steel2: 'm:#9aa1a7', granite: 'c:#17191b', tile: 't:tiles:#f2f2ee', jali: 'x:jali',
  door: 't:wood:#9a6a40', doorFrame: 'c:#5a4632', service: 'c:#3d5a4a', tank: 'c:#1d1f22', brick: 't:brick:#b8705a',
  stone: 'c:#9a9c98', signs: 'x:signs', lamp: 'e:#fffbea', ceiling: 'c:#f3f0ea', board: 'x:whiteboard', blue: 'c:#2f6db3',
  red: 'c:#b03a2e', vent: 'c:#40464c', concrete: 't:concrete:#d9d4ca', sand: 'x:sand', slabs: 'x:slabs', tin: 'm:#9ea4a8',
  weathered: 'x:weathered', shutter: 'x:shutter', goods: 'x:goods', greenSh: 'c:#3f6e4a', fairy: 'e:#ffd27a', black: 'c:#1d2023',
};
// world size of one repeat of the module's own textures
const XT = { kota: 2.4, sand: 6, slabs: 2.4, weathered: 6, shutter: 2, goods: 2, jali: 0.8 };

// ---------- geometry helpers (local frame of a Kit: u across, v along, y up) ----------
function inPoly(u, v, poly) {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ui, vi] = poly[i]; const [uj, vj] = poly[j];
    if ((vi > v) !== (vj > v) && u < ((uj - ui) * (v - vi)) / (vj - vi) + ui) ins = !ins;
  }
  return ins;
}

// u coordinates where the line v = c crosses the polygon (sorted)
function crossU(poly, c) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const [u0, v0] = poly[i]; const [u1, v1] = poly[(i + 1) % poly.length];
    if ((v0 > c) !== (v1 > c)) out.push(u0 + ((c - v0) / (v1 - v0)) * (u1 - u0));
  }
  return out.sort((a, b) => a - b);
}

function segDist(px, pz, [ax, az], [bx, bz]) {
  const dx = bx - ax; const dz = bz - az; const L = dx * dx + dz * dz;
  const t = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L)) : 0;
  return Math.hypot(px - ax - t * dx, pz - az - t * dz);
}

// The hostel-grid angle of an outline: its longest edge, averaged with the edges parallel to it.
function gridAngle(outer) {
  const es = outer.map((a, i) => {
    const b = outer[(i + 1) % outer.length];
    let t = Math.atan2(b[1] - a[1], b[0] - a[0]);
    while (t > Math.PI / 4) t -= Math.PI / 2;
    while (t <= -Math.PI / 4) t += Math.PI / 2;
    return { t, len: Math.hypot(b[0] - a[0], b[1] - a[1]) };
  });
  const top = es.reduce((p, q) => (q.len > p.len ? q : p));
  const near = es.filter((e) => Math.abs(e.t - top.t) < 1.5 * (Math.PI / 180));
  return near.reduce((s, e) => s + e.t * e.len, 0) / near.reduce((s, e) => s + e.len, 0);
}

// Kit frame: u along the grid's east, v along its south; origin at the outline's minimum corner.
function frameFor(outer, a = gridAngle(outer)) {
  const eu = [Math.cos(a), Math.sin(a)]; const ev = [-Math.sin(a), Math.cos(a)];
  const us = outer.map(([x, z]) => x * eu[0] + z * eu[1]); const vs = outer.map(([x, z]) => x * ev[0] + z * ev[1]);
  const u0 = Math.min(...us); const v0 = Math.min(...vs);
  return { O: [u0 * eu[0] + v0 * ev[0], u0 * eu[1] + v0 * ev[1]], eu, ev, angle: Math.atan2(ev[0], ev[1]), W: Math.max(...us) - u0, L: Math.max(...vs) - v0 };
}

// Square an outline up in the kit's frame: every edge runs along u or v; lines closer than 0.4 m merge.
function snapOutline(kit, outer) {
  const L = outer.map(([x, z]) => kit.local(x, z));
  let E = L.map((a, i) => {
    const b = L[(i + 1) % L.length]; const du = b[0] - a[0]; const dv = b[1] - a[1];
    const alongU = Math.abs(du) >= Math.abs(dv);
    return { alongU, c: alongU ? (a[1] + b[1]) / 2 : (a[0] + b[0]) / 2, len: Math.hypot(du, dv) };
  });
  const mergeRuns = () => {
    for (let k = 0; k < 4 * E.length && E.length > 3; k++) {
      const i = k % E.length; const j = (i + 1) % E.length;
      if (E[i].alongU !== E[j].alongU) continue;
      const len = E[i].len + E[j].len;
      E[i] = { alongU: E[i].alongU, c: (E[i].c * E[i].len + E[j].c * E[j].len) / Math.max(len, 1e-6), len };
      E.splice(j, 1);
    }
  };
  mergeRuns();
  for (const axis of [true, false]) {
    const es = E.filter((e) => e.alongU === axis).sort((p, q) => p.c - q.c);
    let group = [];
    const flush = () => { const tot = group.reduce((s, e) => s + e.len, 0); const m = group.reduce((s, e) => s + e.c * e.len, 0) / tot; for (const e of group) e.c = Math.round(m * 100) / 100; group = []; };
    for (const e of es) { if (group.length && e.c - group[group.length - 1].c > 0.4) flush(); group.push(e); }
    if (group.length) flush();
  }
  let pts = E.map((e, i) => { const p = E[(i - 1 + E.length) % E.length]; return e.alongU ? [p.c, e.c] : [e.c, p.c]; });
  for (let pass = 0; pass < 3; pass++) { // drop zero-length edges and collinear points left by the merging
    pts = pts.filter((p, i) => { const q = pts[(i + 1) % pts.length]; return Math.abs(p[0] - q[0]) > 0.01 || Math.abs(p[1] - q[1]) > 0.01; });
    pts = pts.filter((p, i) => { const a = pts[(i - 1 + pts.length) % pts.length]; const b = pts[(i + 1) % pts.length]; return !((Math.abs(a[0] - p[0]) < 0.01 && Math.abs(b[0] - p[0]) < 0.01) || (Math.abs(a[1] - p[1]) < 0.01 && Math.abs(b[1] - p[1]) < 0.01)); });
  }
  return pts;
}

// ---------- textures (made once, shared by every kit) ----------
const texCache = new Map();
let seed = 11;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const jitter = (hex, f) => { const c = new THREE.Color(hex); c.offsetHSL(0, 0, (rnd() - 0.5) * f); return `#${c.getHexString()}`; };
function canvasTex(w, h, paint, { repeat = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
const MAKERS = {
  kota: () => canvasTex(512, 512, (g, W) => { // grey-green Kota slabs, 0.6 m, light and dark mixed
    const n = 4; const s = W / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const base = jitter(rnd() < 0.5 ? '#98a08b' : '#b0b29f', 0.1); g.fillStyle = base; g.fillRect(i * s, j * s, s, s);
      for (let k = 0; k < 140; k++) { g.fillStyle = jitter(base, 0.12); g.globalAlpha = 0.35; g.fillRect(i * s + rnd() * s, j * s + rnd() * s, 5, 3); }
      g.globalAlpha = 1; g.strokeStyle = '#5f675d'; g.lineWidth = 2; g.strokeRect(i * s + 1, j * s + 1, s - 2, s - 2);
    }
  }),
  jali: () => canvasTex(256, 256, (g, W) => { // white pierced screen
    g.fillStyle = '#f1efe9'; g.fillRect(0, 0, W, W);
    g.fillStyle = '#6d6a64'; const n = 4; const s = W / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const cx = i * s + s / 2; const cy = j * s + s / 2;
      g.beginPath(); for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; const r = k % 2 ? s * 0.16 : s * 0.36; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.fill();
    }
  }),
  sand: () => canvasTex(256, 256, (g, W) => { g.fillStyle = '#cdb48c'; g.fillRect(0, 0, W, W); for (let i = 0; i < 4000; i++) { g.fillStyle = jitter('#c8ad84', 0.25); g.globalAlpha = 0.6; g.fillRect(rnd() * W, rnd() * W, 2, 2); } g.globalAlpha = 1; }),
  slabs: () => canvasTex(512, 512, (g, W) => { // buff stone slabs in running bond
    g.fillStyle = '#6f675c'; g.fillRect(0, 0, W, W);
    const rows = 4; const rh = W / rows;
    for (let r = 0; r < rows; r++) for (let c = -1; c < 3; c++) {
      const x = c * (W / 2) + (r % 2 ? W / 4 : 0);
      const base = jitter('#b9ad97', 0.12); g.fillStyle = base; g.fillRect(x + 3, r * rh + 3, W / 2 - 6, rh - 6);
      for (let k = 0; k < 80; k++) { g.fillStyle = jitter(base, 0.12); g.globalAlpha = 0.4; g.fillRect(x + 3 + rnd() * (W / 2 - 10), r * rh + 3 + rnd() * (rh - 10), 6, 3); }
      g.globalAlpha = 1;
    }
  }),
  weathered: () => canvasTex(512, 512, (g, W) => { // weathered buff render with rain streaks
    g.fillStyle = '#b8a688'; g.fillRect(0, 0, W, W);
    for (let i = 0; i < 2500; i++) { g.fillStyle = jitter('#b3a083', 0.2); g.globalAlpha = 0.35; g.fillRect(rnd() * W, rnd() * W, 6, 4); }
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(70,60,50,0.12)'; g.globalAlpha = 1; const x = rnd() * W; g.fillRect(x, 0, 3 + rnd() * 8, W * (0.3 + rnd() * 0.7)); }
    g.globalAlpha = 1;
  }),
  shutter: () => canvasTex(128, 128, (g, W) => { g.fillStyle = '#8d9396'; g.fillRect(0, 0, W, W); for (let y = 0; y < W; y += 8) { g.fillStyle = '#6c7275'; g.fillRect(0, y, W, 2); g.fillStyle = '#a8aeb1'; g.fillRect(0, y + 3, W, 1); } }),
  goods: () => canvasTex(256, 256, (g, W) => { // shop shelves stacked with packets and boxes
    g.fillStyle = '#3a2f26'; g.fillRect(0, 0, W, W);
    for (let r = 0; r < 4; r++) {
      const y0 = r * 64; g.fillStyle = '#c9b48f'; g.fillRect(0, y0 + 58, W, 6);
      let x = 2; while (x < W) { const w = 8 + rnd() * 22; const h = 20 + rnd() * 34; g.fillStyle = ['#c0392b', '#f1c40f', '#2e86c1', '#27ae60', '#e67e22', '#ecf0f1', '#8e44ad', '#d35400'][Math.floor(rnd() * 8)]; g.fillRect(x, y0 + 58 - h, w - 2, h); x += w; }
    }
  }),
  whiteboard: () => canvasTex(1024, 512, (g, W, H) => { // the mess committee's whiteboard (official tour, Mess 2)
    g.fillStyle = '#f7f7f4'; g.fillRect(0, 0, W, H); g.strokeStyle = '#9aa1a7'; g.lineWidth = 16; g.strokeRect(8, 8, W - 16, H - 16);
    g.fillStyle = '#1b3f8f'; g.textAlign = 'center'; g.font = 'bold 54px "Comic Sans MS", "Marker Felt", sans-serif';
    g.fillText('TAKE ALL YOU CAN EAT,', W / 2, 100); g.fillText('BUT EAT ALL YOU TAKE', W / 2, 168);
    g.fillStyle = '#b02a2a'; g.font = 'bold 40px "Marker Felt", sans-serif';
    g.fillText("YESTERDAY'S FOOD WASTAGE: 38 KGS", W / 2, 270); g.fillText('WHICH CAN FEED 95 PEOPLE', W / 2, 330);
    g.fillStyle = '#1d1d1d'; g.font = '34px "Marker Felt", sans-serif'; g.fillText('- MESS COMMITTEE', W * 0.68, 430);
  }, { repeat: false }),
};

// One sign atlas (1024 x 2048, 2 x 16 cells of 512 x 128) for every signboard in the module: one material.
const ATLAS = { cols: 2, rows: 16, cw: 512, ch: 128, cells: new Map(), tex: null };
function atlasTexture() {
  if (!ATLAS.tex) {
    const c = document.createElement('canvas'); c.width = ATLAS.cols * ATLAS.cw; c.height = ATLAS.rows * ATLAS.ch;
    ATLAS.tex = new THREE.CanvasTexture(c); ATLAS.tex.colorSpace = THREE.SRGBColorSpace; ATLAS.tex.anisotropy = 8;
  }
  return ATLAS.tex;
}
// the uv rectangle [u0, v0, u1, v1] of a sign, drawn on first use
function atlasCell(text, { bg = '#7a2622', fg = '#f6ecd2', font = 'bold 64px Georgia, serif', sub = null, border = null } = {}) {
  const key = `${text}|${bg}|${fg}|${sub}`;
  const tex = atlasTexture();
  if (!ATLAS.cells.has(key)) {
    const i = ATLAS.cells.size;
    if (i >= ATLAS.cols * ATLAS.rows) throw new Error('messes: sign atlas is full');
    const cx = (i % ATLAS.cols) * ATLAS.cw; const cy = Math.floor(i / ATLAS.cols) * ATLAS.ch;
    const g = tex.image.getContext('2d');
    g.save(); g.translate(cx, cy);
    g.fillStyle = bg; g.fillRect(0, 0, ATLAS.cw, ATLAS.ch);
    if (border) { g.strokeStyle = border; g.lineWidth = 8; g.strokeRect(6, 6, ATLAS.cw - 12, ATLAS.ch - 12); }
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    let size = parseInt(font.match(/(\d+)px/)[1], 10); const fam = font.replace(/^.*?\d+px\s*/, ''); const weight = font.match(/^(bold|\d00)?/)[0];
    const y = sub ? ATLAS.ch * 0.4 : ATLAS.ch / 2;
    do { g.font = `${weight} ${size}px ${fam}`; size -= 2; } while (g.measureText(text).width > ATLAS.cw * 0.9 && size > 10);
    g.fillText(text, ATLAS.cw / 2, y);
    if (sub) { g.font = `26px system-ui, sans-serif`; g.fillText(sub, ATLAS.cw / 2, ATLAS.ch * 0.8); }
    g.restore();
    tex.needsUpdate = true;
    ATLAS.cells.set(key, [cx / tex.image.width, 1 - (cy + ATLAS.ch) / tex.image.height, (cx + ATLAS.cw) / tex.image.width, 1 - cy / tex.image.height]);
  }
  return ATLAS.cells.get(key);
}

// ---------- a helper bound to one kit ----------
function tools(kit) {
  for (const name of Object.keys(MAKERS)) kit.texture(name, () => { if (!texCache.has(name)) texCache.set(name, MAKERS[name]()); return texCache.get(name); });
  kit.texture('signs', atlasTexture);
  const add = (key, g) => kit.geo(key, g);
  const tileOf = (key) => (key.startsWith('x:') ? XT[key.slice(2)] || 0 : 0);
  const scaleUV = (g, k, ou = 0, ov = 0) => { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * k + ou, uv.getY(i) * k + ov); return g; };
  // a box that also tiles the module's own textures in world size
  const B = (u0, u1, v0, v1, y0, y1, key, { collide = false, walkable = false } = {}) => {
    if (u1 < u0) [u0, u1] = [u1, u0];
    if (v1 < v0) [v0, v1] = [v1, v0];
    if (u1 - u0 < 1e-3 || v1 - v0 < 1e-3 || y1 - y0 < 1e-3) return;
    const tile = tileOf(key.replace(/^po:/, ''));
    if (tile) { const g = worldBoxGeometry(u1 - u0, y1 - y0, v1 - v0, tile); g.translate((u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2); add(key, g); if (collide) kit.col(u0, u1, v0, v1, y0, y1, walkable); } else kit.box(u0, u1, v0, v1, y0, y1, key, { collide, walkable });
  };
  // horizontal rectangle, world-tiled for textures (down: faces down, for ceilings)
  const flat = (u0, u1, v0, v1, y, key, { down = false } = {}) => {
    const g = new THREE.PlaneGeometry(u1 - u0, v1 - v0);
    const base = key.replace(/^po:/, '');
    const tile = tileOf(base) || (base.startsWith('t:') ? TEX_SIZE[base.split(':')[1]] || 2 : 0);
    if (tile) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (u0 + uv.getX(i) * (u1 - u0)) / tile, (-v1 + uv.getY(i) * (v1 - v0)) / tile); }
    g.rotateX(down ? Math.PI / 2 : -Math.PI / 2); g.translate((u0 + u1) / 2, y, (v0 + v1) / 2); add(key, g);
  };
  // a flat polygon (local points), world-tiled
  const flatPoly = (pts, y, key) => {
    const s = new THREE.Shape(pts.map(([u, v]) => new THREE.Vector2(u, -v)));
    const g = new THREE.ShapeGeometry(s);
    const tile = tileOf(key.replace(/^po:/, '')) || 2;
    const pos = g.attributes.position; const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / tile, pos.getY(i) / tile);
    g.rotateX(-Math.PI / 2); g.translate(0, y, 0); add(key, g);
  };
  // vertical plane facing [du, dv] (axis-aligned) with an optional atlas uv rectangle
  const plane = (u, v, y, w, h, [du, dv], key, { uv = null, offset = 0.015 } = {}) => {
    const g = new THREE.PlaneGeometry(w, h);
    const a = g.attributes.uv;
    if (uv) for (let i = 0; i < a.count; i++) a.setXY(i, uv[0] + a.getX(i) * (uv[2] - uv[0]), uv[1] + a.getY(i) * (uv[3] - uv[1]));
    else if (tileOf(key)) for (let i = 0; i < a.count; i++) a.setXY(i, (a.getX(i) * w) / tileOf(key), (a.getY(i) * h) / tileOf(key));
    g.rotateY(Math.atan2(du, dv)); g.translate(u + du * offset, y + h / 2, v + dv * offset); add(key, g);
  };
  // a signboard (atlas) of width w (height w/4) with a thin frame, facing [du, dv]
  const sign = (text, u, v, y, w, facing, style = {}, { frame = 'c:#2a2a2a' } = {}) => {
    const h = w / 4; const [du, dv] = facing;
    if (frame) { const t = 0.04; const ax = du !== 0; B(ax ? u - du * 0.01 : u - w / 2 - 0.05, ax ? u + du * t : u + w / 2 + 0.05, ax ? v - w / 2 - 0.05 : v - dv * 0.01, ax ? v + w / 2 + 0.05 : v + dv * t, y - 0.05, y + h + 0.05, frame); }
    plane(u, v, y, w, h, facing, K.signs, { uv: atlasCell(text, style), offset: (frame ? 0.04 : 0) + 0.012 });
  };
  // polygon-offset copy of a material key (thin overlays that must win the depth test from far away)
  const po = (key) => {
    const k = `po:${key}`;
    if (!kit.customMats[k]) { const m = kit.material(key).clone(); Object.assign(m, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6 }); kit.customMats[k] = m; }
    return k;
  };
  const cyl = (u, v, y, r, h, key, o = {}) => kit.cyl(u, v, y, r, h, key, o);
  return { add, B, flat, flatPoly, plane, sign, po, cyl, scaleUV };
}

// ---------- the mess plan type ----------
// spec: { name, poly (snapped, local), isHall(u, v), doors: [{ u, v, w, open, main }], skin (interior walls of the hall
//        block, VKB only), openings(piece, list) (override), glass, tanks: [[u, v]], flues: [[u, v]], ribs: 'u'|'v' }
function buildMess(kit, spec) {
  const X = tools(kit);
  const { poly } = spec;
  const us = [...new Set(poly.map((p) => p[0]))].sort((a, b) => a - b);
  const vs = [...new Set(poly.map((p) => p[1]))].sort((a, b) => a - b);
  const blockAt = (u, v) => (spec.isHall(u, v) ? 'hall' : 'kitchen');
  const H = (b) => (b === 'hall' ? HALL : KITCHEN);
  const area = poly.reduce((s, p, i) => { const q = poly[(i + 1) % poly.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0);
  const convex = (i) => {
    const a = poly[(i - 1 + poly.length) % poly.length]; const p = poly[i]; const b = poly[(i + 1) % poly.length];
    return Math.sign(((p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0])) * area) > 0;
  };
  // cells of the grid inside the outline
  const cells = [];
  for (let i = 0; i < us.length - 1; i++) for (let j = 0; j < vs.length - 1; j++) {
    const cu = (us[i] + us[i + 1]) / 2; const cv = (vs[j] + vs[j + 1]) / 2;
    if (inPoly(cu, cv, poly)) cells.push({ u0: us[i], u1: us[i + 1], v0: vs[j], v1: vs[j + 1], block: blockAt(cu, cv) });
  }
  const cellAt = (u, v) => cells.find((c) => u > c.u0 && u < c.u1 && v > c.v0 && v < c.v1);

  // roof slabs (strips along u), roof ribs over the hall
  for (const c of cells) {
    const h = H(c.block);
    X.B(c.u0, c.u1, c.v0, c.v1, h.roof - h.slab, h.roof, K.roof);
  }
  // the outline, cut into pieces at the grid lines; each piece knows its block and inward side
  const pieces = [];
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length];
    const alongU = Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]);
    const c = alongU ? a[1] : a[0];
    const s0 = alongU ? Math.min(a[0], b[0]) : Math.min(a[1], b[1]); const s1 = alongU ? Math.max(a[0], b[0]) : Math.max(a[1], b[1]);
    const mid = (s0 + s1) / 2;
    const inward = (alongU ? inPoly(mid, c + 0.05, poly) : inPoly(c + 0.05, mid, poly)) ? 1 : -1;
    // trim the along-v walls at convex corners (the along-u walls run through them)
    const lo = alongU ? a[0] < b[0] : a[1] < b[1]; // does the edge run from s0 to s1?
    const trim0 = !alongU && convex(lo ? i : (i + 1) % poly.length) ? T : 0;
    const trim1 = !alongU && convex(lo ? (i + 1) % poly.length : i) ? T : 0;
    const cuts = [s0, ...(alongU ? us : vs).filter((x) => x > s0 + 0.01 && x < s1 - 0.01), s1];
    for (let k = 0; k < cuts.length - 1; k++) {
      const m = (cuts[k] + cuts[k + 1]) / 2;
      const block = alongU ? blockAt(m, c + inward * 0.1) : blockAt(c + inward * 0.1, m);
      pieces.push({ alongU, c, a0: cuts[k] + (k === 0 ? trim0 : 0), a1: cuts[k + 1] - (k === cuts.length - 2 ? trim1 : 0), inward, block, exterior: true, edge: i });
    }
  });
  // hall / kitchen boundaries inside the outline: a full-height wall on the hall side
  for (const c of cells) {
    if (c.block !== 'hall') continue;
    for (const [alongU, line, a0, a1, side] of [[false, c.u1, c.v0, c.v1, 1], [false, c.u0, c.v0, c.v1, -1], [true, c.v1, c.u0, c.u1, 1], [true, c.v0, c.u0, c.u1, -1]]) {
      const m = (a0 + a1) / 2;
      const o = alongU ? cellAt(m, line + side * 0.05) : cellAt(line + side * 0.05, m);
      if (o && o.block === 'kitchen') pieces.push({ alongU, c: line, a0, a1, inward: -side, block: 'hall', exterior: false, internal: true });
    }
  }
  // merge collinear neighbours of the same kind (so bays and openings span whole walls)
  pieces.sort((p, q) => (p.alongU - q.alongU) || (p.c - q.c) || (p.inward - q.inward) || (p.a0 - q.a0));
  const walls = [];
  for (const p of pieces) {
    const last = walls[walls.length - 1];
    if (last && last.alongU === p.alongU && Math.abs(last.c - p.c) < 1e-3 && last.inward === p.inward && last.block === p.block && last.exterior === p.exterior && Math.abs(last.a1 - p.a0) < 0.02) last.a1 = p.a1;
    else walls.push({ ...p });
  }
  for (const w of walls) buildWall(kit, X, spec, w);

  // hall roof ribs (the transverse beams show above the roof in the aerial imagery)
  const hallCells = cells.filter((c) => c.block === 'hall');
  if (hallCells.length) {
    const hu0 = Math.min(...hallCells.map((c) => c.u0)); const hu1 = Math.max(...hallCells.map((c) => c.u1));
    const hv0 = Math.min(...hallCells.map((c) => c.v0)); const hv1 = Math.max(...hallCells.map((c) => c.v1));
    const alongV = (spec.ribs || (hv1 - hv0 > hu1 - hu0 ? 'v' : 'u')) === 'v'; // ribs repeat along the long axis
    const [s0, s1] = alongV ? [hv0, hv1] : [hu0, hu1];
    const n = Math.round((s1 - s0) / 3.3);
    for (let k = 1; k < n; k++) {
      const s = s0 + ((s1 - s0) * k) / n;
      for (const c of hallCells) {
        if (alongV && s > c.v0 + 0.3 && s < c.v1 - 0.3) X.B(c.u0 + T, c.u1 - T, s - 0.15, s + 0.15, HALL.roof, HALL.roof + 0.25, K.coping);
        if (!alongV && s > c.u0 + 0.3 && s < c.u1 - 0.3) X.B(s - 0.15, s + 0.15, c.v0 + T, c.v1 - T, HALL.roof, HALL.roof + 0.25, K.coping);
      }
    }
  }
  // kitchen roof: water tanks on stands, brick flues with caps, an exhaust hood
  for (const [u, v] of spec.tanks || []) {
    X.B(u - 0.8, u + 0.8, v - 0.8, v + 0.8, KITCHEN.roof, KITCHEN.roof + 0.25, K.concrete);
    X.cyl(u, v, KITCHEN.roof + 0.25, 0.62, 1.25, K.tank, { seg: 16 });
    X.cyl(u, v, KITCHEN.roof + 1.5, 0.2, 0.08, K.tank, { seg: 10 });
  }
  for (const [u, v] of spec.flues || []) {
    X.B(u - 0.35, u + 0.35, v - 0.35, v + 0.35, KITCHEN.roof, KITCHEN.roof + 2.2, K.brick);
    X.B(u - 0.45, u + 0.45, v - 0.45, v + 0.45, KITCHEN.roof + 2.2, KITCHEN.roof + 2.3, K.concrete);
    X.B(u - 0.12, u + 0.12, v - 0.12, v + 0.12, KITCHEN.roof + 2.3, KITCHEN.roof + 2.6, K.concrete);
  }
  return { cells, walls, us, vs, cellAt };
}

// Default openings of a wall: windows in bays (hall: tall with a vent above; kitchen: small and high), doors
// from the spec. Each { at, w, bottom, top, kind: 'window' | 'door' | 'vent' | 'hatch' | 'opening', ... }.
function defaultOpenings(spec, w) {
  const len = w.a1 - w.a0; const list = [];
  const doors = (spec.doors || []).filter((d) => (w.alongU ? Math.abs(d.v - w.c) < 0.5 && d.u > w.a0 && d.u < w.a1 : Math.abs(d.u - w.c) < 0.5 && d.v > w.a0 && d.v < w.a1));
  for (const d of doors) list.push({ at: w.alongU ? d.u : d.v, w: d.w || 1.9, bottom: 0, top: d.service ? 2.2 : 2.95, kind: 'door', ...d });
  if (!w.exterior) return list;
  const clash = (at, half) => list.some((o) => Math.abs(o.at - at) < o.w / 2 + half + 0.5);
  if (w.block === 'hall') {
    const n = Math.max(1, Math.round(len / 3.4)); const bay = len / n;
    w.bays = [];
    for (let k = 0; k < n; k++) {
      const at = w.a0 + bay * (k + 0.5); const ww = Math.min(1.5, bay - 1.1);
      if (k > 0) w.bays.push(w.a0 + bay * k);
      if (ww < 0.6 || clash(at, ww / 2)) continue;
      list.push({ at, w: ww, bottom: spec.sill ?? 1.0, top: 3.0, kind: 'window' });
      list.push({ at, w: Math.min(0.9, ww), bottom: 3.5, top: 4.05, kind: 'vent' });
    }
  } else {
    const n = Math.floor(len / 3.8); const bay = len / Math.max(n, 1);
    for (let k = 0; k < n; k++) {
      const at = w.a0 + bay * (k + 0.5);
      if (clash(at, 0.5)) continue;
      list.push({ at, w: 1.0, bottom: 1.5, top: 2.4, kind: 'window' });
    }
  }
  return list;
}

// One wall: the solid pieces round its openings (with colliders), the window and door fittings, and on the outside
// the plinth band, pilasters, sunshades, cornice, maroon band and coping.
function buildWall(kit, X, spec, w) {
  const h = w.block === 'hall' ? HALL : KITCHEN;
  const top = h.roof + (w.exterior ? h.par : HALL.par);
  const ops = (spec.openings ? spec.openings(w, defaultOpenings(spec, w)) : defaultOpenings(spec, w)).sort((p, q) => p.at - q.at);
  const n = w.inward; const c = w.c;
  const skin = spec.skin && spec.skin(w);
  // perpendicular extents: main wall [m0, m1], skin [k0, k1] (inside), outer face at c
  const tMain = skin ? T - SKIN : T;
  const m = [c, c + n * tMain].sort((a, b) => a - b); const k = [c + n * tMain, c + n * T].sort((a, b) => a - b);
  const box = (a, b, y0, y1, key, p0, p1, o) => (w.alongU ? X.B(a, b, p0, p1, y0, y1, key, o) : X.B(p0, p1, a, b, y0, y1, key, o));
  const solid = (a, b, y0, y1, collide) => {
    if (b - a < 0.005 || y1 - y0 < 0.005) return;
    box(a, b, y0, y1, K.cream, m[0], m[1], { collide: collide && !!spec.enterable });
    if (skin && y0 < CEIL) box(a, b, y0, Math.min(y1, CEIL), skin, k[0], k[1]);
  };
  // openings sharing a span (a window with a vent above) cut the same strip of wall
  const spans = [];
  for (const o of ops) { const last = spans[spans.length - 1]; if (last && Math.abs(last.at - o.at) < 1e-6) { last.holes.push(o); last.w = Math.max(last.w, o.w); } else spans.push({ at: o.at, w: o.w, holes: [o] }); }
  let s = w.a0;
  for (const sp of spans) {
    const a = sp.at - sp.w / 2; const b = sp.at + sp.w / 2;
    solid(s, a, 0, top, true);
    let y = 0;
    for (const o of sp.holes.sort((p, q) => p.bottom - q.bottom)) {
      const oa = o.at - o.w / 2; const ob = o.at + o.w / 2;
      solid(a, oa, y, o.top, y < 2.2); solid(ob, b, y, o.top, y < 2.2); // narrower hole in a wider span
      solid(a, b, y, o.bottom, y < 2.2); y = o.top;
    }
    solid(a, b, y, top, y < 2.2);
    s = b;
  }
  solid(s, w.a1, 0, top, true);
  // closed buildings: one collider along the whole wall
  if (!spec.enterable) (w.alongU ? kit.col(w.a0, w.a1, m[0], m[1], 0, 3) : kit.col(m[0], m[1], w.a0, w.a1, 0, 3));
  const mid = c + (n * T) / 2; // centre line
  const outF = c; const out = -n; // outer face and outward direction
  const P = (a, b, p0, p1, y0, y1, key, o) => box(a, b, y0, y1, key, Math.min(p0, p1), Math.max(p0, p1), o);
  for (const o of ops) {
    const a = o.at - o.w / 2; const b = o.at + o.w / 2;
    if (o.kind === 'window') {
      const glass = spec.glass || K.dark;
      P(a, b, mid - 0.06, mid + 0.06, o.bottom, o.bottom + 0.05, K.frame); P(a, b, mid - 0.06, mid + 0.06, o.top - 0.05, o.top, K.frame);
      for (const f of [0, 0.5, 1]) P(a + f * (b - a) - 0.03, a + f * (b - a) + 0.03, mid - 0.06, mid + 0.06, o.bottom, o.top, K.frame);
      if (o.top - o.bottom > 1.2) P(a, b, mid - 0.05, mid + 0.05, o.bottom + (o.top - o.bottom) * 0.62, o.bottom + (o.top - o.bottom) * 0.62 + 0.04, K.frame);
      P(a, b, mid - 0.008, mid + 0.008, o.bottom, o.top, glass);
      // iron grille on the outside of the glass
      const g0 = outF + n * 0.06; const nb = Math.max(2, Math.round((b - a) / 0.16));
      for (let i = 1; i < nb; i++) { const x = a + ((b - a) * i) / nb; P(x - 0.008, x + 0.008, g0 - 0.008, g0 + 0.008, o.bottom, o.top, K.grille); }
      for (const f of [0.33, 0.66]) P(a, b, g0 - 0.01, g0 + 0.01, o.bottom + (o.top - o.bottom) * f - 0.012, o.bottom + (o.top - o.bottom) * f + 0.012, K.grille);
      // sill and sunshade
      P(a - 0.08, b + 0.08, outF + out * 0.08, outF, o.bottom - 0.06, o.bottom, K.coping);
      if (w.exterior) P(a - 0.2, b + 0.2, outF + out * (w.block === 'hall' ? 0.55 : 0.4), outF, o.top + 0.18, o.top + 0.26, K.coping);
      if (!spec.enterable || !w.exterior) continue;
    } else if (o.kind === 'vent') { // louvred clerestory vent
      P(a, b, mid - 0.02, mid + 0.02, o.bottom, o.top, K.vent);
      for (let y = o.bottom + 0.08; y < o.top - 0.04; y += 0.12) P(a, b, outF + n * 0.04, outF + n * 0.1, y, y + 0.03, K.frame);
    } else if (o.kind === 'door') {
      const lw = o.w / 2; const tr = Math.min(2.4, o.top - 0.05);
      P(a - 0.07, a, mid - 0.17, mid + 0.17, 0, o.top, K.doorFrame); P(b, b + 0.07, mid - 0.17, mid + 0.17, 0, o.top, K.doorFrame);
      if (o.top > 2.5) { P(a, b, mid - 0.06, mid + 0.06, tr, tr + 0.07, K.doorFrame); P(a, b, mid - 0.01, mid + 0.01, tr + 0.07, o.top, spec.enterable ? K.glass : K.dark); P(o.at - 0.03, o.at + 0.03, mid - 0.05, mid + 0.05, tr + 0.07, o.top, K.doorFrame); }
      if (o.open) { // two leaves swung in against the reveals, at right angles to the wall
        const i0 = c + n * T; const i1 = i0 + n * (lw - 0.05);
        for (const [x0, x1] of [[a + 0.01, a + 0.06], [b - 0.06, b - 0.01]]) { P(x0, x1, i0, i1, 0.02, tr - 0.02, K.door); P(x0 - 0.005, x1 + 0.005, i0 + n * 0.15, i0 + n * (lw - 0.25), 1.2, 1.9, K.glass); }
      } else {
        const fill = o.service ? K.service : K.door;
        P(a, o.at - 0.01, mid - 0.03, mid + 0.03, 0, tr, fill); P(o.at + 0.01, b, mid - 0.03, mid + 0.03, 0, tr, fill);
        if (!o.service) for (const x of [a + lw * 0.5, b - lw * 0.5]) P(x - 0.15, x + 0.15, mid - 0.04, mid + 0.04, 1.3, 1.85, K.dark);
        if (spec.enterable) (w.alongU ? kit.col(a, b, mid - 0.05, mid + 0.05, 0, tr) : kit.col(mid - 0.05, mid + 0.05, a, b, 0, tr));
      }
      P(a - 0.3, b + 0.3, outF + out * 0.02, outF, 0, 0.03, K.stone); // threshold
      if (w.exterior && !o.service) { // porch slab on brackets and the name board above it
        P(a - 0.6, b + 0.6, outF + out * 1.3, outF, o.top + 0.1, o.top + 0.22, K.coping);
        for (const x of [a - 0.4, b + 0.4]) P(x - 0.06, x + 0.06, outF + out * 0.5, outF, o.top - 0.3, o.top + 0.1, K.coping);
        if (o.main) X.sign(o.main, w.alongU ? o.at : outF + out * 0.005, w.alongU ? outF + out * 0.005 : o.at, o.top + 0.35, Math.min(3.4, o.w + 1.4), w.alongU ? [0, out] : [out, 0], { bg: '#7a2622', fg: '#f6ecd2', border: '#e0c48a' });
      } else if (o.service && w.exterior) P(a - 0.2, b + 0.2, outF + out * 0.5, outF, o.top + 0.1, o.top + 0.18, K.coping);
    }
  }
  if (!w.exterior) { // coping on the hall wall that rises above the kitchen roof
    box(w.a0, w.a1, top - 0.08, top, K.coping, m[0] - 0.05, m[1] + 0.05);
    return;
  }
  // exterior trim: plinth band (broken at doors), pilasters on the bay lines, cornice, maroon band, coping
  const doorsAt = ops.filter((o) => o.kind === 'door' || o.kind === 'opening');
  let s2 = w.a0;
  for (const o of [...doorsAt, { at: w.a1 + 1e3, w: 0 }]) {
    const e = Math.min(w.a1, o.at - o.w / 2 - 0.07);
    if (e > s2) P(s2, e, outF + out * 0.04, outF, 0, 0.45, K.plinth);
    s2 = o.at + o.w / 2 + 0.07;
  }
  for (const x of w.bays || []) if (!ops.some((o) => Math.abs(o.at - x) < o.w / 2 + 0.25)) P(x - 0.2, x + 0.2, outF + out * 0.07, outF, 0.45, h.roof - 0.3, K.cream);
  P(w.a0, w.a1, outF + out * 0.14, outF, h.roof - 0.32, h.roof - 0.2, K.coping); // cornice at the roof slab
  P(w.a0, w.a1, outF + out * 0.03, outF, top - 0.4, top - 0.1, K.maroon);
  box(w.a0, w.a1, top - 0.1, top, K.coping, m[0] - 0.06, m[1] + 0.06);
}

// ---------- the VKB hall, with the gameplay room in it ----------
function buildVKB(kit, ctx, X) {
  const { campus } = ctx;
  const poly = snapOutline(kit, ctx.buildings[0].outer);
  const r = campus.rooms.mess;
  const [Pu, Pv] = kit.local(r.x0, r.door.at); // the room's west door, where it turns
  const near = (list, x) => list.reduce((p, q) => (Math.abs(q - x) < Math.abs(p - x) ? q : p));
  const us = [...new Set(poly.map((p) => p[0]))]; const vs = [...new Set(poly.map((p) => p[1]))];
  const uW = crossU(poly, Pv)[0]; // west facade
  const uE = near(us, 15.2); // hall | kitchen
  const uEnd = near(us, 3.2); // west face of the end rooms
  const vN = near(vs, 7.1); const vS = near(vs, 30.75); const v0 = Math.min(...vs); const v1 = Math.max(...vs);
  const vK0 = near(vs, 8.75); const vK1 = near(vs, 25.1); // where the kitchen meets the hall's east wall
  // the hall's interior faces
  const iu0 = uW + T; const iu1 = uE - T; const iv0 = vN + T; const iv1 = vS - T;
  const hatches = [Pv - 2.4, Pv, Pv + 2.4];
  const door2 = Pv + 8.8; // second west door
  const washDoor = 12.6; const storeDoor = 9.2; const kitchenDoor = vK0 + 1.6;
  const spec = {
    name: 'VKB mess', poly, enterable: true, glass: K.glass,
    isHall: (u) => u < uE,
    doors: [{ u: uW, v: Pv, w: 2.0, open: true, main: 'VKB MESS' }, { u: uW, v: door2, w: 1.9, open: true }, { u: 39.7, v: 18, w: 1.6, service: true }, { u: 30, v: 29.9, w: 1.4, service: true }],
    skin: (w) => (w.block === 'hall' ? K.white : null),
    openings: (w, list) => {
      if (!w.alongU && Math.abs(w.c - uE) < 0.01 && !w.exterior) { // the serving wall: hatches and the kitchen door
        return [...hatches.map((at) => ({ at, w: 1.6, bottom: 0.86, top: 2.05, kind: 'hatch' })), { at: kitchenDoor, w: 1.1, bottom: 0, top: 2.2, kind: 'door', service: true }];
      }
      if (w.alongU && (Math.abs(w.c - v0) < 0.01 || Math.abs(w.c - v1) < 0.01)) return list.map((o) => (o.kind === 'window' ? { ...o, bottom: 1.7 } : o)); // over the basins
      return list;
    },
    tanks: [[30, 13], [34, 22]], flues: [[24, 20], [36, 12]],
  };
  const built = buildMess(kit, spec);
  // end-room partitions (wash room north, store south)
  const part = (v, inward, doorAt, open) => {
    const [p0, p1] = inward > 0 ? [v, v + T] : [v - T, v];
    for (const [a, b] of [[uEnd, doorAt - 0.9], [doorAt + 0.9, iu1]]) X.B(a, b, p0, p1, 0, CEIL, K.white, { collide: true });
    X.B(doorAt - 0.9, doorAt + 0.9, p0, p1, 2.4, CEIL, K.white);
    // the jambs and head stand 2 cm proud of the reveal faces (no coplanar faces to z-fight)
    X.B(doorAt - 0.97, doorAt - 0.88, p0 - 0.03, p1 + 0.03, 0, 2.38, K.doorFrame); X.B(doorAt + 0.88, doorAt + 0.97, p0 - 0.03, p1 + 0.03, 0, 2.38, K.doorFrame);
    X.B(doorAt - 0.97, doorAt + 0.97, p0 - 0.03, p1 + 0.03, 2.38, 2.47, K.doorFrame);
    if (!open) { X.B(doorAt - 0.9, doorAt + 0.9, (p0 + p1) / 2 - 0.03, (p0 + p1) / 2 + 0.03, 0, 2.4, K.door, { collide: true }); }
  };
  // the wall under the north end of the hall: the outline edge along v = vN only covers u < uEnd
  kit.layer('hall', () => {
    part(vN, 1, washDoor, true);
    part(vS, -1, storeDoor, false);
    interior();
  });
  vkb.hall = { u0: iu0, u1: iu1, v0: iv0, v1: iv1 };
  vkb.wash = { u0: uEnd + T, u1: iu1, v0: v0 + T, v1: vN };
  // the gameplay room's objects, turned to line up with the hall (run last, once everything else is built)
  return () => adoptRoom(kit, campus, r, { Pu, Pv, iu0 });

  function interior() {
    // floors, ceilings, beams, fans and lights
    X.flat(iu0, iu1, iv0, iv1, 0.02, X.po(K.kota));
    X.flat(uW, iu0, Pv - 1.0, Pv + 1.0, 0.02, X.po(K.stone)); X.flat(uW, iu0, door2 - 0.95, door2 + 0.95, 0.02, X.po(K.stone));
    X.flat(uEnd + T, iu1, v0 + T, vN, 0.02, X.po('t:tiles:#dfe3e2')); X.flat(washDoor - 0.9, washDoor + 0.9, vN, vN + T, 0.02, X.po(K.stone));
    X.flat(uEnd + T, iu1, vS, v1 - T, 0.02, X.po(K.concrete));
    for (const [a, b, c0, c1] of [[iu0, iu1, iv0, iv1], [uEnd + T, iu1, v0 + T, vN], [uEnd + T, iu1, vS, v1 - T]]) X.flat(a, b, c0, c1, CEIL - 0.015, K.ceiling, { down: true });
    // ochre transverse beams, fans in two lines, wall tube lights between the beams
    const bays = 7; const step = (iv1 - iv0) / bays;
    for (let k = 1; k < bays; k++) X.B(iu0, iu1, iv0 + k * step - 0.15, iv0 + k * step + 0.15, CEIL - 0.45, CEIL - 0.01, K.ochre);
    for (let k = 0; k < bays; k++) {
      const v = iv0 + (k + 0.5) * step;
      for (const u of [iu0 + 4.2, iu0 + 10]) { X.cyl(u, v, 3.9, 0.018, CEIL - 3.9, K.white, { seg: 6 }); kit.fan(u, v, 3.9); }
      for (const [u, du] of [[iu0, 1], [iu1, -1]]) {
        if (du < 0 && v > Pv - 3.8 && v < Pv + 3.8) continue; // the serving wall carries the menu board
        kit._rot(u, v, [du, 0], [[-0.6, 0.6, 3.48, 3.53, 0.03, 0.09, K.lamp], [-0.62, 0.62, 3.46, 3.55, 0, 0.03, 'c:#e9e6df']]);
        kit.lights.push({ u: u + du * 0.3, v, y: 3.5 });
      }
    }
    kit.tubeLight((iu0 + iu1) / 2, (v0 + vN) / 2, CEIL); kit.tubeLight((iu0 + iu1) / 2, (vS + v1) / 2, CEIL);
    for (let k = 0; k < bays; k += 2) kit.tubeLight((iu0 + iu1) / 2, iv0 + (k + 0.5) * step, CEIL);
    // blue digital displays on the long walls
    for (const v of [Pv - 6, Pv + 6]) X.B(iu0, iu0 + 0.04, v - 0.3, v + 0.3, 2.8, 3.1, 'e:#2a6fdb');
    // the serving wall: grey stone band and pillars framing three hatches, granite counters, jali over two
    const sv0 = Pv - 3.7; const sv1 = Pv + 3.7;
    for (const v of [sv0, sv1]) X.B(iu1 - 0.12, iu1, v - 0.22, v + 0.22, 0, 3.4, K.stone);
    X.B(iu1 - 0.06, iu1, sv0, sv1, 3.3, 3.5, K.stone);
    for (const h of hatches) {
      X.B(iu1 - 0.04, uE + 0.25, h - 0.79, h + 0.79, 0, 0.86, K.tile, { collide: true });
      X.B(iu1 - 0.12, uE + 0.3, h - 0.82, h + 0.82, 0.86, 0.9, K.granite);
      kit.col(iu1 - 0.04, uE, h - 0.8, h + 0.8, 0.9, 2.05); // nobody climbs through
      for (const v of [h - 0.78, h + 0.78]) X.B(iu1 - 0.08, iu1 - 0.04, v - 0.015, v + 0.015, 0.9, 1.45, K.steel);
      X.B(iu1 - 0.08, iu1 - 0.04, h - 0.8, h + 0.8, 1.43, 1.46, K.steel);
      if (h !== Pv) X.plane(iu1, h, 2.15, 1.6, 0.75, [-1, 0], K.jali, { offset: 0.012 });
    }
    // the kitchen behind the hatches: tiled walls, a steel rack of vessels, a light (not enterable)
    const kb = uE + 2.4;
    X.flat(uE, kb, sv0, sv1, 0.02, X.po(K.concrete));
    X.B(kb, kb + 0.1, sv0, sv1, 0, KITCHEN.roof - KITCHEN.slab, K.tile);
    for (const v of [sv0, sv1]) X.B(uE, kb, v - 0.05, v + 0.05, 0, KITCHEN.roof - KITCHEN.slab, K.tile);
    X.flat(uE, kb + 0.1, sv0, sv1, KITCHEN.roof - KITCHEN.slab - 0.01, K.ceiling, { down: true });
    X.B(kb - 0.5, kb, sv0 + 0.4, sv1 - 0.4, 0.9, 0.94, K.steel); X.B(kb - 0.5, kb, sv0 + 0.4, sv1 - 0.4, 1.7, 1.73, K.steel);
    for (const v of [sv0 + 0.45, sv1 - 0.45]) X.B(kb - 0.5, kb - 0.46, v - 0.02, v + 0.02, 0, 1.75, K.steel);
    for (let v = sv0 + 1; v < sv1 - 0.8; v += 1.1) { X.cyl(kb - 0.25, v, 0.94, 0.3, 0.4, K.steel, { seg: 14 }); X.cyl(kb - 0.25, v + 0.5, 1.73, 0.18, 0.26, K.steel2, { seg: 12 }); }
    kit._rot(kb - 0.02, Pv, [-1, 0], [[-0.6, 0.6, 2.6, 2.65, 0, 0.06, K.lamp]]);
    // steel tables with attached seats, in rows across the hall; a cross aisle on the door's axis
    const colU = [iu0 + 3.1 + 1.5, iu0 + 3.1 + 3 + 1.6 + 1.5]; // west aisle 3.1 m (door, kiosk), central 1.6 m, serving 2.3 m
    const rows = [-8.06, -5.06, -2.06, 2.14, 5.14, 8.14, 11.14].map((d) => Pv + d).filter((v) => v - 2.17 > iv0 && v + 2.17 < iv1); // 1.2 m clear at the ends
    const seats = [];
    for (const v of rows) for (const u of colU) seats.push(...steelTable(kit, X, u, v));
    vkb.seats = seats;
    // menu board frame (the board itself is the gameplay one, moved up over the middle hatch)
    X.B(iu1 - 0.04, iu1, Pv - 0.81, Pv + 0.81, 2.12, 4.08, 'c:#5b3d24');
    // kitchen door sign, the whiteboard, wash-room signs
    X.sign('STAFF ONLY', iu1 - 0.005, kitchenDoor, 2.35, 1.2, [-1, 0], { bg: '#1f3a5f', fg: '#ffffff', font: 'bold 70px system-ui, sans-serif' }, { frame: null });
    X.plane(iu0 + 5.6, iv0, 1.1, 3.0, 1.5, [0, 1], K.board, { offset: 0.045 });
    X.B(iu0 + 4.05, iu0 + 7.15, iv0, iv0 + 0.03, 1.05, 2.65, K.steel2);
    X.sign('HAND WASH · RETURN THALIS HERE', washDoor, iv0, 2.55, 2.4, [0, 1], { bg: '#ffffff', fg: '#1f3a5f', font: 'bold 52px system-ui, sans-serif' }, { frame: null });
    X.sign('STORE', storeDoor, iv1, 2.55, 1.2, [0, -1], { bg: '#ffffff', fg: '#333333', font: 'bold 72px system-ui, sans-serif' }, { frame: null });
    // tray trolleys (VEG and NON-VEG) at the ends of the counter
    for (const [v, label, bg] of [[Pv - 4.4, 'VEG', '#2e7d32'], [Pv + 4.4, 'NON-VEG', '#b71c1c']]) {
      const u = iu1 - 1.0;
      X.B(u - 0.35, u + 0.35, v - 0.5, v + 0.5, 0.15, 0.2, K.steel, { collide: true });
      X.B(u - 0.35, u + 0.35, v - 0.5, v + 0.5, 0.75, 0.8, K.steel);
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) X.B(u + a * 0.33 - 0.015, u + a * 0.33 + 0.015, v + b * 0.48 - 0.015, v + b * 0.48 + 0.015, 0.05, 1.0, K.steel);
      for (let i = 0; i < 14; i++) X.B(u - 0.3, u + 0.3, v - 0.4, v + 0.4, 0.8 + i * 0.018, 0.812 + i * 0.018, K.steel2);
      X.sign(label, u - 0.36, v, 0.3, 0.8, [-1, 0], { bg, fg: '#ffffff', font: 'bold 80px system-ui, sans-serif' }, { frame: null });
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) X.cyl(u + a * 0.3, v + b * 0.45, 0, 0.05, 0.1, K.black, { seg: 8 });
    }
    // snack kiosk behind the Pitstop counter (blue, as in the tour): back panel, shelves, header
    const k0 = Pv - 4.6; const k1 = Pv - 1.35;
    X.B(iu0, iu0 + 0.25, k0, k1, 0, 2.5, K.blue, { collide: true });
    for (const y of [0.6, 1.1, 1.6, 2.05]) X.B(iu0 + 0.25, iu0 + 0.6, k0 + 0.1, k1 - 0.1, y, y + 0.03, K.white);
    X.plane(iu0 + 0.25, (k0 + k1) / 2, 0.62, k1 - k0 - 0.3, 1.45, [1, 0], K.goods, { offset: 0.01 });
    X.B(iu0 + 0.25, iu0 + 0.6, k0, k0 + 0.06, 0, 2.5, K.blue); X.B(iu0 + 0.25, iu0 + 0.6, k1 - 0.06, k1, 0, 2.5, K.blue);
    // wash room: a long trough of basins with taps under the windows, tiled dado, the dish-return table
    const wv = v0 + T;
    X.B(uEnd + 1.2, iu1 - 1.2, wv, wv + 0.55, 0.75, 0.85, 'c:#f2f2ef');
    X.B(uEnd + 1.2, iu1 - 1.2, wv + 0.5, wv + 0.55, 0.55, 0.85, 'c:#f2f2ef', { collide: true });
    for (let u = uEnd + 1.8; u < iu1 - 1.4; u += 1.1) { X.B(u - 0.02, u + 0.02, wv, wv + 0.2, 1.0, 1.04, K.steel); X.cyl(u, wv + 0.18, 0.9, 0.015, 0.14, K.steel, { seg: 6 }); }
    for (const [a, b, c0, c1] of [[uEnd + T, iu1, wv, wv + 0.02], [uEnd + T, uEnd + T + 0.02, wv, vN], [iu1 - 0.02, iu1, wv, vN]]) X.B(a, b, c0, c1, 0.02, 1.5, K.tile);
    X.B(iu1 - 0.7, iu1, vN - 4.5, vN - 0.5, 0.85, 0.9, K.steel, { collide: true });
    X.B(iu1 - 0.7, iu1, vN - 4.5, vN - 0.5, 0, 0.85, K.steel2);
    for (let i = 0; i < 4; i++) X.cyl(iu1 - 0.35, vN - 4 + i * 0.9, 0.9, 0.17, 0.06 + i * 0.02, K.steel, { seg: 14 });
  }
}

// A stainless table (3.0 x 0.75 m) with three swivel seats a side on steel arms. Returns the seat points (local).
const vkb = { seats: [] };
function steelTable(kit, X, u, v) {
  const L = 3.0; const D = 0.75; const SO = 0.8;
  X.B(u - L / 2, u + L / 2, v - D / 2, v + D / 2, 0.72, 0.76, K.steel);
  X.B(u - L / 2, u + L / 2, v - D / 2, v - D / 2 + 0.02, 0.66, 0.72, K.steel); X.B(u - L / 2, u + L / 2, v + D / 2 - 0.02, v + D / 2, 0.66, 0.72, K.steel);
  for (const du of [-1.15, 1.15]) { X.B(u + du - 0.03, u + du + 0.03, v - 0.03, v + 0.03, 0, 0.72, K.steel2); X.B(u + du - 0.2, u + du + 0.2, v - 0.25, v + 0.25, 0, 0.02, K.steel2); }
  X.B(u - 1.3, u + 1.3, v - 0.025, v + 0.025, 0.28, 0.32, K.steel2);
  const seats = [];
  for (const du of [-1, 0, 1]) {
    X.B(u + du - 0.025, u + du + 0.025, v - SO, v + SO, 0.28, 0.32, K.steel2);
    for (const s of [-1, 1]) {
      X.cyl(u + du, v + s * SO, 0.3, 0.025, 0.13, K.steel2, { seg: 6 });
      X.cyl(u + du, v + s * SO, 0.43, 0.17, 0.04, K.steel, { seg: 14 });
      X.cyl(u + du + 0.24, v + s * 0.2, 0.76, 0.035, 0.09, K.steel, { seg: 10, rTop: 0.035 }); // steel glass
      seats.push({ u: u + du, v: v + s * SO, tu: u + du, tv: v + s * 0.22, s });
    }
  }
  kit.col(u - L / 2, u + L / 2, v - SO - 0.17, v + SO + 0.17, 0, 0.76);
  return seats;
}

// The gameplay room was built world-aligned. Turn its kept objects about its door to the hall's angle, remove the
// parts the hall replaces, and move its colliders, interactables and spots with it.
function adoptRoom(kit, campus, r, { Pu, Pv, iu0 }) {
  const P = new THREE.Vector3(r.x0, 0, r.door.at);
  const M = new THREE.Matrix4().makeTranslation(P.x, 0, P.z).multiply(new THREE.Matrix4().makeRotationY(kit.angle)).multiply(new THREE.Matrix4().makeTranslation(-P.x, 0, -P.z));
  const turn = (p) => { const dx = p.x - P.x; const dz = p.z - P.z; p.x = P.x + dx * kit.eu[0] + dz * kit.ev[0]; p.z = P.z + dx * kit.eu[1] + dz * kit.ev[1]; return p; };
  const reg = { minX: r.x0 - 3.6, maxX: r.x1 + 0.6, minZ: r.z0 - 0.6, maxZ: r.z1 + 0.6 };
  const inReg = (x, z) => x > reg.minX && x < reg.maxX && z > reg.minZ && z < reg.maxZ;
  const box = new THREE.Box3(); const ctr = new THREE.Vector3(); const size = new THREE.Vector3();
  const remove = []; const keep = [];
  const replaced = new Set([campus.messSteel, campus.messFood]);
  const kept = new Set([campus.messLids, ...(campus.messTubs || [])]);
  for (const o of [...campus.root.children]) {
    if (o.name?.includes(':')) continue; // detailed-building groups
    if (o.isSprite) { if (inReg(o.position.x, o.position.z)) keep.push(o); continue; }
    box.setFromObject(o); if (box.isEmpty()) continue;
    box.getCenter(ctr); box.getSize(size);
    if (!inReg(ctr.x, ctr.z) || Math.max(size.x, size.z) > 16 || box.min.y > 4) continue;
    if (o.isGroup && o.position.lengthSq() === 0) { // the room's shell group (walls, floor, ceiling, door frame, label)
      for (const c of [...o.children]) (c.isSprite ? keep : remove).push(c);
      continue;
    }
    if (replaced.has(o)) { remove.push(o); continue; }
    if (kept.has(o)) { keep.push(o); continue; }
    const y = o.position.y;
    if (o.isGroup || y > 3.0 || Math.abs(y - 0.38) < 0.005 || Math.abs(y - 0.225) < 0.005) { remove.push(o); continue; } // fans, tube lights, wooden tables, benches
    if (o.isMesh && Math.abs(y - 2.1) < 0.01 && Math.abs(o.scale.x - 0.04) < 1e-3) { remove.push(o); continue; } // old menu frame
    keep.push(o);
  }
  for (const o of remove) { o.removeFromParent(); }
  for (const o of keep) {
    if (o.parent !== campus.root) { const wp = o.getWorldPosition(new THREE.Vector3()); o.removeFromParent(); campus.root.add(o); o.position.copy(wp); }
    if (o.isSprite) { turn(o.position); continue; }
    o.applyMatrix4(M);
    // the menu board inside goes up over the middle hatch, onto the serving wall's face
    if (o.isMesh && o.material?.map && o.material.map === campus.messMenuTex && Math.abs(o.position.y - 2.1) < 0.01) {
      o.position.y += 0.95; o.position.x -= kit.eu[0] * 0.1; o.position.z -= kit.eu[1] * 0.1;
    }
    // the Pitstop sign goes onto the kiosk's back panel
    if (o.isMesh && o.material?.emissiveMap && Math.abs(o.position.y - 2.25) < 0.01) {
      const d = kit.local(o.position.x, o.position.z)[0] - (iu0 + 0.27);
      o.position.x -= kit.eu[0] * d; o.position.z -= kit.eu[1] * d;
    }
  }
  vkb.adopted = { removed: remove.length, kept: keep.length };
  // colliders: the room's own (no building tag) inside the region go; the kept furniture gets new ones
  let off = 0;
  for (const c of campus.colliders) if (!c.building && c.enabled !== false && c.minX >= reg.minX && c.maxX <= reg.maxX && c.minZ >= reg.minZ && c.maxZ <= reg.maxZ && c.maxY > 0.3) { c.enabled = false; off++; }
  vkb.collidersOff = off;
  const L = (dx, dz) => [Pu + dx, Pv + dz]; // room offset from the door (x east, z south) -> local
  const C = (cx, cz, w, d, h) => { const [u, v] = L(cx, cz); kit.col(u - w / 2, u + w / 2, v - d / 2, v + d / 2, 0, h); };
  const W = r.x1 - r.x0;
  C(W - 1.2, 0, 0.9, 6, 1.0); // serving counter
  C(0.65, -2.55, 0.7, 2.2, 1.0); // Pitstop counter
  C(0.4, -4.1, 0.7, 0.7, 1.9); // drinks fridge
  for (const d of [-0.62, 0.62]) C(r.exit.x + 0.9 - r.x0, -2.6 + d, 0.08, 0.08, 2.5); // outside menu board posts
  // interactables and spots
  for (const it of campus.interactables) if (['mess', 'pitstop', 'messmenu'].includes(it.id) && inReg(it.pos.x, it.pos.z)) turn(it.pos);
  if (campus.spots.messStaff) turn(campus.spots.messStaff);
  // NPC seats: the hall's seats that lie in the gameplay room (roomAt must say 'mess')
  const seats = vkb.seats.map((s) => ({ ...s, w: kit.world(s.u, s.v) })).filter((s) => campus.roomAt(s.w.x, s.w.z) === 'mess' && campus.roomAt(s.w.x + 0.3, s.w.z + 0.3) === 'mess' && campus.roomAt(s.w.x - 0.3, s.w.z - 0.3) === 'mess');
  if (Array.isArray(campus.spots.mess) && seats.length >= 6) campus.spots.mess.splice(0, campus.spots.mess.length, ...seats.map((s) => s.w));
  // thalis at mealtimes: on every seat in the room and every other seat elsewhere (campus.setMessFood shows them)
  const geos = [];
  const put = (g, u, y, v, color) => { const q = g.index ? g.toNonIndexed() : g; q.translate(u, y, v); const col = new THREE.Color(color); const n = q.attributes.position.count; const a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; } q.setAttribute('color', new THREE.BufferAttribute(a, 3)); geos.push(q); };
  const inRoom = new Set(seats);
  vkb.seats.forEach((s, i) => {
    if (!inRoom.has(s) && i % 2) return;
    const { tu, tv } = s; const f = s.s;
    put(new THREE.CylinderGeometry(0.17, 0.15, 0.018, 18), tu, 0.77, tv, '#c3c8cd');
    for (const [fx, fz, c] of [[-0.07, -0.05, '#e3a33a'], [0.07, -0.05, '#f7f4ea'], [0, 0.07, '#d98a2b']]) put(new THREE.CylinderGeometry(0.05, 0.05, 0.022, 10), tu + fx, 0.785, tv + fz * f, c);
    put(new THREE.CylinderGeometry(0.075, 0.075, 0.008, 12), tu + 0.02, 0.8, tv - 0.01 * f, '#c9934a');
  });
  const [cu, cv] = L(W - 1.2, -1.35); // rotis in a basket on the counter
  put(new THREE.CylinderGeometry(0.2, 0.16, 0.1, 14), cu, 1.05, cv, '#a8834f');
  for (let i = 0; i < 6; i++) put(new THREE.CylinderGeometry(0.11, 0.11, 0.01, 14), cu, 1.1 + i * 0.012, cv, i % 2 ? '#c9934a' : '#d8a35a');
  // thali stack, water jug and glasses at the counter's ends (they were in the steel mesh)
  const st = (g, dx, y, dz) => { const [u, v] = L(W - 1.2 + dx, dz); const q = g.index ? g.toNonIndexed() : g; q.translate(u, y, v); kit.layer('hall', () => kit.geo(K.steel, q)); };
  for (let i = 0; i < 8; i++) st(new THREE.CylinderGeometry(0.17, 0.15, 0.018, 18), 0, 1.0 + i * 0.02, 2.65);
  st(new THREE.CylinderGeometry(0.09, 0.11, 0.3, 14), 0, 1.15, -2.65);
  for (const dx of [-0.25, 0.25]) st(new THREE.CylinderGeometry(0.035, 0.03, 0.09, 10), dx, 1.045, -2.6);
  for (const dz of [-2, -0.7, 0.6, 1.9]) st(new THREE.CylinderGeometry(0.35, 0.3, 0.25, 16), 0, 1.125, dz);
  kit.layer('hall', () => { // sneeze guard on the diners' side: steel posts, a glass screen and a top rail
    const [fu, fv] = L(W - 1.2 - 0.47, 0);
    for (const dv of [-2.9, -1.35, 0, 1.35, 2.9]) kit.box(fu - 0.02, fu + 0.02, fv + dv - 0.02, fv + dv + 0.02, 1.0, 1.62, K.steel, { collide: false });
    kit.box(fu - 0.03, fu + 0.03, fv - 2.92, fv + 2.92, 1.6, 1.64, K.steel, { collide: false });
    kit.box(fu - 0.006, fu + 0.006, fv - 2.9, fv + 2.9, 1.18, 1.6, K.glass, { collide: false });
    kit.box(fu - 0.45, fu - 0.43, fv - 2.92, fv + 2.92, 0.98, 1.0, K.steel, { collide: false }); // tray slide
    for (const dv of [-2.6, 0, 2.6]) kit.box(fu - 0.45, fu, fv + dv - 0.015, fv + dv + 0.015, 0.96, 0.98, K.steel, { collide: false });
    kit.col(fu - 0.45, fu, fv - 2.92, fv + 2.92, 0, 1.0);
  });
  const g = mergeGeometries(geos);
  g.applyMatrix4(new THREE.Matrix4().makeTranslation(kit.O[0], 0, kit.O[1]).multiply(new THREE.Matrix4().makeRotationY(kit.angle)));
  const food = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }));
  food.name = 'messes:thalis'; food.receiveShadow = true;
  food.visible = !!campus.messFood?.visible;
  campus.root.add(food);
  campus.messFood = food;
  campus.messSteel = null;
}

// ---------- a closed mess (shell only, its own kit) ----------
function closedMess(campus, b, cfg) {
  const kit = new Kit(campus, 'messes', frameFor(b.outer));
  const X = tools(kit);
  const poly = snapOutline(kit, b.outer);
  const near = (list, x) => list.reduce((p, q) => (Math.abs(q - x) < Math.abs(p - x) ? q : p));
  const us = [...new Set(poly.map((p) => p[0]))]; const vs = [...new Set(poly.map((p) => p[1]))];
  const res = cfg(poly, (x) => near(us, x), (x) => near(vs, x));
  buildMess(kit, { poly, ...res });
  kit.finish();
  return kit;
}

// ---------- ANC: canopy stalls against the tall building, a paved yard, a wall with railings ----------
function buildANC(campus, back, D) {
  const kit = new Kit(campus, 'messes', frameFor(back.outer));
  const X = tools(kit);
  const poly = snapOutline(kit, back.outer);
  const u0 = Math.min(...poly.map((p) => p[0])); const u1 = Math.max(...poly.map((p) => p[0]));
  const v0 = Math.min(...poly.map((p) => p[1])); const v1 = Math.max(...poly.map((p) => p[1]));
  // the tall weathered building behind (about 8.5 m), small green-shuttered windows in two rows
  const HB = 8.4;
  X.B(u0, u1, v0, v1, HB - 0.3, HB, K.roof);
  const faces = [[true, v0, u0, u1, -1], [true, v1, u0, u1, 1], [false, u0, v0, v1, -1], [false, u1, v0, v1, 1]];
  for (const [alongU, c, a0, a1, out] of faces) {
    const p = [c, c - out * T].sort((a, b) => a - b);
    const bx = (a, b, y0, y1, key, q0 = p[0], q1 = p[1], o) => (alongU ? X.B(a, b, q0, q1, y0, y1, key, o) : X.B(q0, q1, a, b, y0, y1, key, o));
    const lo = alongU ? a0 : a0 + T; const hi = alongU ? a1 : a1 - T;
    const n = Math.floor((hi - lo) / 3.2); const wins = [];
    for (let k = 0; k < n; k++) wins.push(lo + ((hi - lo) * (k + 0.5)) / n);
    let yPrev = 0;
    // the west face's ground floor is behind the stalls: no windows there
    for (const [y0, y1] of !alongU && out < 0 ? [[5.2, 6.3]] : [[1.6, 2.7], [5.2, 6.3]]) {
      let s = lo;
      bx(lo, hi, yPrev, y0, K.weathered); yPrev = y1;
      for (const w of wins) { bx(s, w - 0.45, y0, y1, K.weathered); s = w + 0.45; bx(w - 0.45, w + 0.45, y0, y1, K.dark, c - out * 0.16, c - out * 0.14); for (const sd of [-1, 1]) bx(w + sd * 0.45 + (sd < 0 ? -0.45 : 0), w + sd * 0.45 + (sd < 0 ? 0 : 0.45), y0, y1, K.greenSh, ...[c + out * 0.02, c + out * 0.05].sort((a, b) => a - b)); bx(w - 0.55, w + 0.55, y1 + 0.05, y1 + 0.12, K.coping, ...[c, c + out * 0.35].sort((a, b) => a - b)); }
      bx(s, hi, y0, y1, K.weathered);
    }
    bx(lo, hi, yPrev, HB + 0.6, K.weathered);
    bx(lo, hi, HB + 0.5, HB + 0.6, K.coping, p[0] - 0.05, p[1] + 0.05);
    (alongU ? kit.col(lo, hi, p[0], p[1], 0, 3) : kit.col(p[0], p[1], lo, hi, 0, 3));
  }
  for (const [u, v] of [[u0 + 6, v0 + 5], [u0 + 9, v0 + 5]]) { X.cyl(u, v, HB, 0.65, 1.3, K.tank, { seg: 16 }); }
  // where the road runs (keep the yard wall clear of it)
  const roads = D.roads.flatMap((rd) => rd.pts.slice(1).map((p, i) => ({ a: kit.local(...rd.pts[i]), b: kit.local(...p), w: rd.w })));
  const roadGap = (u, v) => Math.min(...roads.map((s) => segDist(u, v, s.a, s.b) - s.w / 2));
  let wallU = -16;
  while (wallU < -9 && [v0 - 1, (v0 + v1) / 2, v1 + 1].some((v) => roadGap(wallU, v) < 1.2)) wallU += 0.5;
  const cu0 = u0 - 4.6; // canopy front
  const ya = v0; const yb = v1; // yard ends (v), flush with the building
  // paved yard and the floor under the canopy
  X.flat(wallU, u0, ya, yb, 0.03, X.po(K.slabs));
  // tin canopy on steel posts (sloping from 3.3 at the wall to 2.9 at the front), fascia with lights and the name
  const vs = []; // posts on the stall partitions, so none stands in front of a counter
  for (let k = 0; k <= 5; k++) vs.push(k === 0 ? v0 - 0.5 : k === 5 ? v1 + 0.5 : v0 + ((v1 - v0) * k) / 5);
  for (const v of vs) { X.B(cu0 + 0.1 - 0.05, cu0 + 0.1 + 0.05, v - 0.05, v + 0.05, 0, 2.88, K.steel2, { collide: true }); }
  {
    const len = u0 - cu0 + 0.3; const rise = 0.4; const tilt = Math.atan2(rise, len);
    const g = new THREE.BoxGeometry(len / Math.cos(tilt), 0.05, v1 - v0 + 2.0);
    g.rotateZ(tilt); g.translate((cu0 + u0 + 0.3) / 2, 3.1, (v0 + v1) / 2); X.add(K.tin, g);
    const g2 = g.clone(); g2.translate(0, -0.06, 0); X.add('c:#5d6366', g2);
  }
  X.B(cu0 - 0.05, cu0 + 0.05, v0 - 1, v1 + 1, 2.75, 3.0, 'c:#7a2622');
  X.sign('ANC · ALL NIGHT CANTEEN', cu0 - 0.06, (v0 + v1) / 2, 3.0, 4.4, [-1, 0], { bg: '#b03a2e', fg: '#fff3d6', font: 'bold 64px Georgia, serif', border: '#f2c14e' });
  for (let v = v0 - 0.9; v < v1 + 0.9; v += 0.35) X.B(cu0 - 0.1, cu0 - 0.06, v - 0.03, v + 0.03, 2.72 + 0.03 * Math.sin(v * 2), 2.78 + 0.03 * Math.sin(v * 2), K.fairy);
  X.cyl(cu0 + 2, v0 + 2, 3.2, 0.55, 1.0, K.tank, { seg: 14 }); X.cyl(cu0 + 2, v1 - 3, 3.2, 0.55, 1.0, K.tank, { seg: 14 });
  // five stalls: partitions, steel counters with glass cases, freezers, fridges, bottle stacks, boards
  const stalls = ['PARATHAS', 'ROLLS & CHINESE', 'TEA · COFFEE · MAGGI', 'JUICES & SHAKES', 'SANDWICH & OMELETTE'];
  const sv = (v1 - v0) / stalls.length; const cf = cu0 + 1.2; // counter front
  const spots = { counter: null, staff: null };
  stalls.forEach((name, i) => {
    const a = v0 + i * sv; const b = a + sv;
    if (i) X.B(cf, u0, a - 0.05, a + 0.05, 0, 2.6, K.white, { collide: true });
    X.B(cf, cf + 0.6, a + 0.3, b - 0.3, 0, 0.95, K.steel, { collide: true });
    X.B(cf, cf + 0.6, a + 0.3, b - 0.3, 0.95, 1.0, K.granite);
    X.B(cf + 0.1, cf + 0.5, a + 0.5, a + 1.6, 1.0, 1.4, K.glass); X.B(cf + 0.1, cf + 0.5, a + 0.5, a + 1.6, 1.4, 1.42, K.steel);
    X.B(u0 - 0.75, u0, b - 1.0, b - 0.35, 0, 1.9, i % 2 ? 'c:#c62828' : 'c:#eef1f3', { collide: true });
    X.plane(u0 - 0.76, b - 0.675, 0.3, 0.55, 1.4, [-1, 0], 'c:#bfe3ff', { offset: 0.005 });
    X.B(u0 - 1.6, u0 - 0.9, a + 0.4, a + 1.4, 0, 0.85, 'c:#f4f6f7', { collide: true });
    X.B(u0 - 0.3, u0, a + 0.2, b - 0.2, 1.5, 1.53, K.steel);
    for (let k = 0; k < 6; k++) X.cyl(u0 - 0.15, a + 0.5 + k * 0.25, 1.53, 0.04, 0.26, 'c:#4fa3e0', { seg: 8 });
    X.sign(name, u0 - 0.01, (a + b) / 2, 2.0, Math.min(2.4, sv - 0.4), [-1, 0], { bg: ['#f2c14e', '#2e7d32', '#6d4c41', '#e65100', '#1565c0'][i], fg: i === 0 ? '#3b2a12' : '#ffffff', font: 'bold 60px system-ui, sans-serif' }, { frame: null });
    kit._rot(u0 - 0.05, (a + b) / 2, [-1, 0], [[-0.5, 0.5, 2.5, 2.55, 0, 0.05, K.lamp]]);
    kit.lights.push({ u: u0 - 0.5, v: (a + b) / 2, y: 2.5 });
    if (i === 2) { spots.counter = [cf - 0.9, (a + b) / 2]; spots.staff = [cf + 1.3, (a + b) / 2]; }
  });
  // closing walls at the canopy ends, the low wall with railings round the yard and the gate to the road
  const lowWall = (a0, a1, alongU, c, gap = null) => {
    const segs = gap ? [[a0, gap[0]], [gap[1], a1]] : [[a0, a1]];
    for (const [s, e] of segs) {
      if (e - s < 0.1) continue;
      const bx = (y0, y1, key, t, o) => (alongU ? X.B(s, e, c - t, c + t, y0, y1, key, o) : X.B(c - t, c + t, s, e, y0, y1, key, o));
      bx(0, 0.9, K.white, 0.12, { collide: true }); bx(0.9, 0.98, 'c:#7a2a2a', 0.16);
      if (alongU) kit.rail(s, c, e, c, 0.98, K.black, { h: 0.9 }); else kit.rail(c, s, c, e, 0.98, K.black, { h: 0.9 });
    }
  };
  const gate = [(v0 + v1) / 2 - 2, (v0 + v1) / 2 + 2];
  lowWall(ya, yb, false, wallU, gate);
  lowWall(wallU, u0, true, ya); lowWall(wallU, u0, true, yb);
  for (const v of gate) { X.B(wallU - 0.3, wallU + 0.3, v - 0.3, v + 0.3, 0, 2.2, K.white, { collide: true }); X.B(wallU - 0.35, wallU + 0.35, v - 0.35, v + 0.35, 2.2, 2.3, 'c:#7a2a2a'); }
  X.B(wallU - 0.08, wallU + 0.08, gate[0] - 0.2, gate[1] + 0.2, 2.3, 3.2, 'c:#7a2a2a');
  X.sign('ALL NIGHT CANTEEN', wallU - 0.09, (gate[0] + gate[1]) / 2, 2.4, 3.4, [-1, 0], { bg: '#7a2622', fg: '#f6ecd2', font: 'bold 64px Georgia, serif' }, { frame: null });
  X.sign('ALL NIGHT CANTEEN', wallU + 0.09, (gate[0] + gate[1]) / 2, 2.4, 3.4, [1, 0], { bg: '#7a2622', fg: '#f6ecd2', font: 'bold 64px Georgia, serif' }, { frame: null });
  // round tables (red, maroon, brown) with mesh chairs (green, blue, orange, red)
  const seatSpots = [];
  const tcol = ['c:#b3262b', 'c:#6e1f24', 'c:#6b4428']; const ccol = ['c:#2e9e45', 'c:#1f6fc4', 'c:#ef7d22', 'c:#cf2a2a'];
  const tus = [wallU + 2.6, (wallU + 2.6 + cu0 - 1.6) / 2, cu0 - 1.6]; const tvs = [ya + 2.0, ya + 5.2, gate[1] + 2.2, yb - 2.0];
  let n = 0;
  for (const tu of tus) for (const tv of tvs) {
    if (tv > gate[0] - 1 && tv < gate[1] + 1) continue;
    const key = tcol[n % 3];
    X.cyl(tu, tv, 0, 0.25, 0.04, K.black, { seg: 12 }); X.cyl(tu, tv, 0.04, 0.04, 0.68, K.black, { seg: 8 }); X.cyl(tu, tv, 0.72, 0.45, 0.04, key, { seg: 20 });
    kit.col(tu - 0.45, tu + 0.45, tv - 0.45, tv + 0.45, 0, 0.76);
    for (let c = 0; c < 4; c++) {
      const a = (c / 4) * Math.PI * 2 + n * 0.4; const du = Math.cos(a); const dv = Math.sin(a);
      const cuu = tu + du * 0.78; const cvv = tv + dv * 0.78; const ck = ccol[(c + n) % 4];
      kit._rot(cuu, cvv, [-du, -dv], [[-0.22, 0.22, 0.42, 0.46, -0.2, 0.22, ck], [-0.22, 0.22, 0.46, 0.92, -0.24, -0.2, ck], ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => [x * 0.19 - 0.02, x * 0.19 + 0.02, 0, 0.42, z * 0.19 - 0.02, z * 0.19 + 0.02, ck])]);
      if (c % 2 === 0) seatSpots.push(kit.world(tu + du * 0.8, tv + dv * 0.8));
    }
    n++;
  }
  // teal planters along the wall, a tall twin-headed street lamp
  for (let v = ya + 1; v < yb - 0.5; v += 3.2) if (v < gate[0] - 0.6 || v > gate[1] + 0.6) { X.cyl(wallU + 0.5, v, 0, 0.28, 0.5, 'c:#1f8a8a', { seg: 12, rTop: 0.34 }); X.cyl(wallU + 0.5, v, 0.5, 0.34, 0.35, 'c:#3f7a3a', { seg: 8, rTop: 0.1 }); }
  {
    const lu = wallU + 1.2; const lv = yb - 0.8;
    X.cyl(lu, lv, 0, 0.12, 7.5, K.black, { seg: 10, collide: true });
    for (const s of [-1, 1]) { X.B(lu - 0.03, lu + 0.03, lv + s * 0.05, lv + s * 0.9, 7.3, 7.36, K.black); X.B(lu - 0.15, lu + 0.15, lv + s * 0.75, lv + s * 1.05, 7.12, 7.3, 'e:#ffe7b0'); }
  }
  kit.finish();
  // gameplay: the 'canteen' counter, its staff and the seats (bits-world's own ANC is replaced)
  const c = kit.world(...spots.counter); const s = kit.world(...spots.staff); const lab = kit.world(cu0 - 3, (v0 + v1) / 2);
  return { kit, canteen: c, staff: s, seats: seatSpots, label: [lab.x, lab.z] };
}

// ---------- C'not: a row of arcaded shops facing the street ----------
function shopRow(campus, b, { street, names }) {
  const kit = new Kit(campus, 'messes', frameFor(b.outer));
  const X = tools(kit);
  const poly = snapOutline(kit, b.outer);
  const u0 = Math.min(...poly.map((p) => p[0])); const u1 = Math.max(...poly.map((p) => p[0]));
  const v0 = Math.min(...poly.map((p) => p[1])); const v1 = Math.max(...poly.map((p) => p[1]));
  const sf = street === 'v1' ? v1 : v0; const out = street === 'v1' ? 1 : -1; const bf = street === 'v1' ? v0 : v1; // street face, back face
  const AD = 2.6; const PL = 0.3; const ROOF = 3.7; const ar = sf - out * AD; // arcade depth, plinth, roof, shopfront line
  const S = (a, b) => [a, b].sort((p, q) => p - q);
  const n = Math.round((u1 - u0) / 4.2); const bay = (u1 - u0) / n;
  // roof and the solid back of the row
  X.B(u0, u1, ...S(ar, bf), ROOF - 0.3, ROOF, K.roof);
  X.B(u0, u1, ...S(sf, ar), 3.25, 3.45, K.roof);
  // arcade floor (one step up from the street, a half step in front)
  X.B(u0, u1, ...S(sf, ar), 0, PL, K.stone, { collide: true, walkable: true });
  X.B(u0, u1, ...S(sf, ar), PL, PL + 0.005, X.po('x:slabs'));
  X.B(u0, u1, ...S(sf, sf + out * 0.4), 0, 0.15, K.stone, { collide: true, walkable: true });
  X.flat(u0, u1, ...S(sf, ar), 3.25 - 0.01, K.ceiling, { down: true });
  // piers and segmental arches along the street face, the parapet above with the signboards
  for (let k = 0; k <= n; k++) { const u = u0 + k * bay; const a = Math.max(u0, u - 0.25); const e = Math.min(u1, u + 0.25); X.B(a, e, ...S(sf, sf - out * 0.45), PL, 3.25, K.cream, { collide: true }); X.B(a - 0.03, e + 0.03, ...S(sf + out * 0.03, sf - out * 0.48), PL, PL + 0.4, K.plinth); }
  for (let k = 0; k < n; k++) {
    const a = u0 + k * bay + 0.25; const e = u0 + (k + 1) * bay - 0.25; const w = e - a; const ys = 2.55; const rise = 0.45; const yt = 3.25;
    const s = new THREE.Shape(); s.moveTo(-w / 2, yt); s.lineTo(-w / 2, ys);
    for (let i = 0; i <= 24; i++) { const t = Math.PI - (i / 24) * Math.PI; s.lineTo(Math.cos(t) * w / 2, ys + Math.sin(t) * rise); }
    s.lineTo(w / 2, ys); s.lineTo(w / 2, yt); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.4, bevelEnabled: false, curveSegments: 12 });
    g.translate((a + e) / 2, 0, Math.min(sf, sf - out * 0.4)); X.add(K.cream, g);
  }
  X.B(u0, u1, ...S(sf, sf - out * 0.45), 3.25, ROOF + 1.0, K.cream);
  X.B(u0 - 0.05, u1 + 0.05, ...S(sf + out * 0.12, sf - out * 0.5), 3.3, 3.42, K.coping);
  X.B(u0 - 0.05, u1 + 0.05, ...S(sf + out * 0.06, sf - out * 0.51), ROOF + 0.92, ROOF + 1.02, K.coping);
  // shopfronts: open shops (shutter rolled up, counter, lit shelves) and shuttered ones
  for (let k = 0; k < n; k++) {
    const a = u0 + k * bay; const e = a + bay; const m = (a + e) / 2;
    const name = names[k % names.length];
    const open = name && k % 5 !== 3;
    const oa = a + 0.35; const oe = e - 0.35;
    X.B(a, oa, ...S(ar, ar - out * 0.3), PL, ROOF - 0.3, K.cream, { collide: true }); X.B(oe, e, ...S(ar, ar - out * 0.3), PL, ROOF - 0.3, K.cream, { collide: true });
    X.B(oa, oe, ...S(ar, ar - out * 0.3), 2.75, ROOF - 0.3, K.cream);
    X.B(oa, oe, ...S(ar + out * 0.02, ar - out * 0.32), 2.6, 2.78, K.shutter);
    if (open) {
      const d = 3.6; const back = ar - out * d;
      X.B(oa, oe, ...S(ar - out * 0.3, back), PL, PL + 0.01, 'c:#8b8378');
      X.B(oa, oe, ...S(back, back - out * 0.1), PL, ROOF - 0.3, K.goods);
      X.plane(m, back, PL + 0.3, oe - oa - 0.2, 2.0, [0, out], K.goods, { offset: 0.01 });
      for (const x of [oa, oe]) X.B(x - 0.02, x + 0.02, ...S(ar - out * 0.3, back), PL, ROOF - 0.3, K.white);
      X.flat(oa, oe, ...S(ar - out * 0.3, back), ROOF - 0.31, K.ceiling, { down: true });
      X.B(oa + 0.1, oe - 0.1, ...S(ar - out * 0.35, ar - out * 0.95), PL, PL + 0.95, k % 2 ? 'c:#6d4c41' : K.white, { collide: true });
      X.B(oa + 0.08, oe - 0.08, ...S(ar - out * 0.33, ar - out * 0.97), PL + 0.95, PL + 1.0, K.granite);
      kit._rot(m, ar - out * 2.0, [0, out], [[-0.6, 0.6, ROOF - 0.38, ROOF - 0.33, -0.04, 0.04, K.lamp]]);
      kit.col(oa, oe, ...S(ar - out * 0.3, ar - out * 0.35), PL, 2.6);
    } else {
      X.B(oa, oe, ...S(ar - out * 0.05, ar - out * 0.1), PL, 2.6, K.shutter, { collide: true });
      X.B(m - 0.15, m + 0.15, ...S(ar - out * 0.02, ar - out * 0.05), PL + 0.05, PL + 0.12, K.black);
    }
    if (name) X.sign(name, m, sf + out * 0.02, 3.55, Math.min(3.6, bay - 0.5), [0, out], SIGN_STYLE(name, k), { frame: 'c:#3a3a3a' });
  }
  // back face: rolling shutters and small windows; ends: plain walls with a window
  for (let k = 0; k < n; k++) {
    const a = u0 + k * bay; const m = a + bay / 2;
    X.B(a, a + bay, ...S(bf, bf + out * T), 0, 2.4, K.cream);
    X.B(a + 0.4, a + bay - 0.4, ...S(bf - out * 0.02, bf + out * 0.02), 0.1, 2.3, k % 3 ? K.shutter : K.service);
    X.B(a, a + bay, ...S(bf, bf + out * T), 2.4, ROOF + 0.6, K.cream);
    X.B(m - 0.5, m + 0.5, ...S(bf - out * 0.01, bf + out * 0.02), 2.65, 3.25, K.dark);
  }
  X.B(u0 - 0.04, u1 + 0.04, ...S(bf - out * 0.04, bf), 0, 0.45, K.plinth);
  X.B(u0 - 0.05, u1 + 0.05, ...S(bf - out * 0.06, bf + out * (T + 0.05)), ROOF + 0.55, ROOF + 0.62, K.coping);
  kit.col(u0, u1, ...S(bf, bf + out * T), 0, 3);
  for (const [u, s] of [[u0, 1], [u1, -1]]) {
    X.B(...S(u, u + s * T), ...S(ar, bf), 0, ROOF + 0.6, K.cream, { collide: true });
    X.B(...S(u, u - s * 0.04), ...S(ar, bf), 0, 0.45, K.plinth);
    X.B(...S(u - s * 0.01, u + s * 0.02), (ar + bf) / 2 - 0.6, (ar + bf) / 2 + 0.6, 1.5, 2.5, K.dark);
  }
  for (let k = 1; k < n; k += 4) { const u = u0 + k * bay + 1; X.cyl(u, (ar + bf) / 2, ROOF, 0.6, 1.2, K.tank, { seg: 14 }); }
  kit.row = { u0, u1, sf, out, ar, PL };
  return { kit, X, poly, u0, u1, sf, out };
}
const SIGN_STYLE = (name) => ({ bg: ['#1565c0', '#c62828', '#f9a825', '#2e7d32', '#6a1b9a', '#ef6c00', '#00838f', '#4e342e'][[...name].reduce((h, ch) => h + ch.charCodeAt(0), 0) % 8], fg: '#ffffff', font: 'bold 60px system-ui, sans-serif', border: '#ffffff' });

// The street between the rows: sandy ground, raised brick planters, blue tables with plastic chairs, a lamp
// pillar with a crown finial, parked motorbikes and cycles. Built in the north row's kit.
function cnotStreet(north, south, D) {
  const { kit, X } = north;
  const w = (k, u, v) => { const p = k.world(u, v); return kit.local(p.x, p.z); };
  const nk = north.kit; const sk = south.kit;
  const a = w(nk, north.u0, north.sf + north.out * 0.4); const b = w(nk, north.u1, north.sf + north.out * 0.4);
  const c = w(sk, south.u1, south.sf + south.out * 0.4); const d = w(sk, south.u0, south.sf + south.out * 0.4);
  X.flatPoly([a, b, c, d], 0.018, X.po(K.sand));
  const roads = D.roads.flatMap((rd) => rd.pts.slice(1).map((p, i) => ({ a: rd.pts[i], b: p, w: rd.w })));
  const clear = (u, v, r) => { const p = kit.world(u, v); return roads.every((s) => segDist(p.x, p.z, s.a, s.b) > s.w / 2 + r) && inPoly(u, v, [a, b, c, d]); };
  const um = (a[0] + b[0]) / 2; const vA = a[1]; const vB = d[1];
  let planters = 0;
  for (const side of [0, 1]) for (let u = north.u0 + 8; u < north.u1 - 6; u += 17) {
    const v = side ? vB - 4.2 : vA + 4.2;
    if (!clear(u, v, 3.2)) continue;
    X.B(u - 2.2, u + 2.2, v - 1.2, v + 1.2, 0, 0.55, K.brick, { collide: true });
    X.B(u - 2.3, u + 2.3, v - 1.3, v + 1.3, 0.55, 0.62, 'c:#8a3b2e');
    X.B(u - 2.1, u + 2.1, v - 1.1, v + 1.1, 0.55, 0.58, 'c:#5a4636');
    for (const du of [-1.2, 0, 1.2]) X.cyl(u + du, v, 0.58, 0.45, 0.55, 'c:#3f7a3a', { seg: 8, rTop: 0.2 });
    // blue tables and chairs beside it
    for (const du of [-1.4, 1.4]) {
      const tv = v + (side ? 1 : -1) * 2.3;
      if (!clear(u + du, tv, 1.2)) continue;
      X.B(u + du - 0.4, u + du + 0.4, tv - 0.4, tv + 0.4, 0.72, 0.75, 'c:#2266aa');
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) X.B(u + du + x * 0.36 - 0.02, u + du + x * 0.36 + 0.02, tv + z * 0.36 - 0.02, tv + z * 0.36 + 0.02, 0, 0.72, 'c:#2266aa');
      kit.col(u + du - 0.4, u + du + 0.4, tv - 0.4, tv + 0.4, 0, 0.75);
      for (const s of [-1, 1]) kit.chair(u + du + s * 0.65, tv, 0, [-s, 0], { seat: ['c:#f5f5f0', 'c:#c62828'][(planters + s + 2) % 2], frame: 'c:#e8e8e2' });
    }
    planters++;
  }
  // lamp pillar with a crown finial in the open space
  {
    let u = um; let v = vA + 7;
    if (!clear(u, v, 1.5)) v = vB - 7;
    X.B(u - 0.6, u + 0.6, v - 0.6, v + 0.6, 0, 0.5, K.stone, { collide: true });
    X.cyl(u, v, 0.5, 0.22, 3.2, 'c:#7c8084', { seg: 12, rTop: 0.16 });
    X.cyl(u, v, 3.7, 0.3, 0.15, 'c:#7c8084', { seg: 12 });
    for (let i = 0; i < 6; i++) { const t = (i / 6) * Math.PI * 2; X.B(u + Math.cos(t) * 0.24 - 0.03, u + Math.cos(t) * 0.24 + 0.03, v + Math.sin(t) * 0.24 - 0.03, v + Math.sin(t) * 0.24 + 0.03, 3.85, 4.25, 'c:#7c8084'); }
    X.cyl(u, v, 3.85, 0.12, 0.6, 'e:#fff1c9', { seg: 10 });
    X.cyl(u, v, 4.45, 0.02, 0.25, 'c:#7c8084', { seg: 6, rTop: 0.06 });
  }
  // parked motorbikes and cycles at the shopfronts
  for (let k = 0; k < 10; k++) {
    const side = k % 2; const u = north.u0 + 5 + k * 6.2; const v = side ? vB - 1.6 : vA + 1.6;
    if (!clear(u, v, 0.8)) continue;
    const bike = k % 3 !== 0;
    const col = ['c:#1d1f22', 'c:#b71c1c', 'c:#0d47a1', 'c:#424242'][k % 4];
    for (const dv of [-0.6, 0.6]) { const g = new THREE.TorusGeometry(bike ? 0.28 : 0.32, bike ? 0.07 : 0.025, 6, 14); g.rotateY(Math.PI / 2); g.translate(u, bike ? 0.35 : 0.34, v + dv); X.add(K.black, g); }
    if (bike) { X.B(u - 0.15, u + 0.15, v - 0.5, v + 0.45, 0.45, 0.75, col); X.B(u - 0.14, u + 0.14, v - 0.1, v + 0.55, 0.75, 0.85, 'c:#222222'); X.B(u - 0.35, u + 0.35, v - 0.62, v - 0.56, 1.0, 1.03, K.steel2); }
    else { X.B(u - 0.02, u + 0.02, v - 0.6, v + 0.6, 0.55, 0.58, col); X.B(u - 0.08, u + 0.08, v + 0.2, v + 0.45, 0.85, 0.9, 'c:#222222'); X.B(u - 0.25, u + 0.25, v - 0.56, v - 0.52, 0.95, 0.98, K.steel2); }
    kit.col(u - 0.3, u + 0.3, v - 0.9, v + 0.9, 0, 0.9);
  }
}

// ---------- the module ----------
const OSM = ['VKB mess', 'RP mess', 'Ram-Budh mess', 'Shankar Vyas Mess', 'Malviya Mess', 'Boys Canteen'];
// unnamed OSM footprints this module also builds (matched by centroid): the ANC's back building, C'not's rows
const EXTRA = { ancBack: [251.7, 348.0], cnotNorth: [431.2, 773.1], cnotSouth: [434.5, 821.5] };

export default {
  id: 'messes',
  name: 'Messes, ANC and C\'not',
  category: 'mess',
  osm: OSM,
  floors: 1,
  enabled: true,
  research: 'approximate',
  frame: (bs) => frameFor(bs[0].outer),

  build(kit, ctx) {
    const { campus, D } = ctx;
    seed = 11;
    const X = tools(kit);
    const subs = [];
    const centroid = (o) => [o.reduce((s, p) => s + p[0], 0) / o.length, o.reduce((s, p) => s + p[1], 0) / o.length];
    const extra = Object.fromEntries(Object.entries(EXTRA).map(([k, [x, z]]) => [k, campus.buildings.find((b) => !b.name && !b.module && Math.hypot(centroid(b.outer)[0] - x, centroid(b.outer)[1] - z) < 4)]));
    try {
      const adopt = buildVKB(kit, ctx, X);
      const [, rp, rb, sv, mal, boys] = ctx.buildings;
      // RP: VKB's mirror twin, hall on the east; Ram-Budh the same; Shankar-Vyas a copy of VKB
      subs.push(closedMess(campus, rp, (poly, nu, nv) => ({ isHall: (u) => u > nu(24.2), doors: [{ u: nu(40.7), v: nv(9.8) + 2.2, w: 1.9, main: 'RP MESS' }, { u: nu(40.7), v: nv(29.2) - 1.5, w: 1.9 }, { u: nu(0), v: 18, w: 1.4, service: true }], tanks: [[8, 18], [14, 25]], flues: [[16, 14], [5, 24]] })));
      subs.push(closedMess(campus, rb, (poly, nu, nv) => ({ isHall: (u) => u > nu(26.4), doors: [{ u: nu(40.7), v: 13, w: 1.9, main: 'RAM-BUDH MESS' }, { u: nu(40.7), v: 27, w: 1.9 }, { u: nu(0), v: 18, w: 1.4, service: true }], tanks: [[8, 15], [15, 24]], flues: [[20, 18], [6, 25]] })));
      subs.push(closedMess(campus, sv, (poly, nu, nv) => ({ isHall: (u) => u < nu(15.2), doors: [{ u: crossU(poly, 17)[0], v: 17, w: 1.9, main: 'SHANKAR-VYAS MESS' }, { u: crossU(poly, 26)[0], v: 26, w: 1.9 }, { u: nu(39.7), v: 20, w: 1.4, service: true }], tanks: [[30, 14], [34, 24]], flues: [[24, 20], [36, 12]] })));
      subs.push(closedMess(campus, mal, (poly, nu, nv) => ({ isHall: (u) => u > nu(11.7) && u < nu(49.6), ribs: 'u', doors: [{ u: 24, v: nv(16.6), w: 1.9, main: 'MALVIYA MESS' }, { u: 38, v: nv(16.6), w: 1.9 }, { u: 30, v: nv(0), w: 1.9 }, { u: 2.6, v: nv(0.9), w: 1.4, service: true }], tanks: [[3, 3], [52, 6]], flues: [[8.5, 2], [52.5, 10]] })));
      subs.push(closedMess(campus, boys, (poly, nu, nv) => ({ isHall: () => true, doors: [{ u: nu(0), v: 20, w: 1.9, main: 'BOYS CANTEEN' }, { u: nu(0), v: 32, w: 1.6 }] })));
      let anc = null; let cn = null; let cs = null;
      if (extra.ancBack) { anc = buildANC(campus, extra.ancBack, D); subs.push(anc.kit); }
      if (extra.cnotNorth && extra.cnotSouth) {
        cn = shopRow(campus, extra.cnotNorth, { street: 'v1', names: ['KAMALS', "AL CAFÉ · COFFEE D'LITE", 'CONNAUGHT PHARMACY', 'STATIONERY & XEROX', 'GENERAL STORE', 'TAILOR', 'MOBILE REPAIR', 'SWEETS · मिठाई', 'JUICE CORNER', 'CYCLE REPAIR'] });
        cs = shopRow(campus, extra.cnotSouth, { street: 'v0', names: ['NOBLES', 'ANNAPURNA RESTAURANT', 'VIJAY RESTAURANT', 'GENERAL STORE', 'STATIONERY & XEROX', 'JUICE CORNER', 'SWEETS · मिठाई', 'MOBILE REPAIR'] });
        cnotStreet(cn, cs, D);
        cn.kit.finish(); cs.kit.finish(); subs.push(cn.kit, cs.kit);
      }
      // everything built: take the footprints over, hand the ANC's gameplay over, fix label heights
      for (const b of ctx.buildings) b.h = b.name === 'Boys Canteen' ? KITCHEN.roof + KITCHEN.par : HALL.roof + HALL.par;
      for (const b of [extra.ancBack, extra.cnotNorth, extra.cnotSouth]) if (b) b.module = 'messes';
      if (anc) {
        campus.buildANC = function buildANCDetailed() {
          this.interactable('canteen', anc.canteen.x, anc.canteen.z, 'Buy something at ANC', { radius: 2.6 });
          this.spots.canteenStaff = new THREE.Vector3(anc.staff.x, 0, anc.staff.z);
          this.spots.canteen = anc.seats.map((p) => new THREE.Vector3(p.x, 0, p.z));
          this.label('ANC · All Night Canteen', anc.label[0], 4.6, anc.label[1], { height: 0.7, bg: 'rgba(192,57,43,0.92)' });
        };
      }
      adopt();
      kit.subKits = subs;
      kit.vkb = vkb;
      kit.entrance('VKB mess west door', ...kit.local(campus.rooms.mess.exit.x, campus.rooms.mess.exit.z), [-1, 0]);
      kit.room('vkbHall', 'VKB Mess · Dining Hall', vkb.hall.u0, vkb.hall.u1, vkb.hall.v0, vkb.hall.v1, 0, CEIL);
      kit.room('vkbWash', 'VKB Mess · Wash area', vkb.wash.u0, vkb.wash.u1, vkb.wash.v0, vkb.wash.v1, 0, CEIL);
    } catch (e) {
      for (const k of subs) for (const g of [...Object.values(k.groups), ...(k.sprites || [])]) g.removeFromParent();
      throw e;
    }
  },
};
