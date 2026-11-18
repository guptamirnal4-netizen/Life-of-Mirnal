// A walk-in Bhawan (Krishna, Gandhi, Budh, Ram, Shankar, Vyas, Vishwakarma). Two floors of corridors round one
// or two courtyards, stairs, a few lived-in rooms, the common room, washrooms, a laundry, the entrance lobby
// (security desk, vending machine, water cooler, notice board) and a roof terrace. Your own Bhawan (Krishna)
// also has your room. Each Bhawan's interior is only drawn while you are in it or at its door.
//
// The building is laid out in its own frame: u runs across the building, v along its length (the OSM outline,
// squared up). Rooms line the outer walls; a corridor runs along the courtyard side behind cusped arches,
// open on the ground floor and screened with scrollwork grilles above, as in the Gandhi Bhawan walkthrough
// (Phodu Club, 2026). Only a handful of rooms are furnished and open; the rest are locked doors.
//
// Inside a wing ("band" coordinates): s is the depth from the corridor wall into the rooms (0 at the wall),
// t runs along the corridor. Furniture is written in s/t, so the same room works in any wing.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { texturedMaterial, worldBoxGeometry, TEX_SIZE } from './textures.js';
import { mat } from './campus.js';

// The courtyard Bhawans you can walk into (the newer comb-shaped ones are in comb-hostel.js).
export const WALK_IN = ['Krishna Bhawan', 'Gandhi Bhawan', 'Budh Bhawan', 'Ram Bhawan', 'Shankar Bhawan', 'Vyas Bhawan', 'Vishwakarma Bhawan'];
export const FH = 3.3;

// A Bhawan outline's corners reordered so the entrance side (the first, A→D) is a long side, the building lies
// on its +u side, and of the two long sides it is the one nearer a road.
export function entranceOrder(o, roads) {
  const dist = (p, q) => Math.hypot(q[0] - p[0], q[1] - p[1]);
  const segDist = (x, z, a, b) => {
    const dx = b[0] - a[0]; const dz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
  };
  const real = roads.filter((r) => !['footway', 'path', 'steps'].includes(r.kind));
  let best = null;
  for (let r = 0; r < 4; r++) {
    for (const wind of [[0, 1, 2, 3], [0, 3, 2, 1]]) {
      const order = wind.map((i) => o[(i + r) % 4]);
      const [A, B, , Dp] = order;
      if (dist(A, Dp) < dist(A, B)) continue;
      const eu = [Dp[1] - A[1], -(Dp[0] - A[0])];
      if ((B[0] - A[0]) * eu[0] + (B[1] - A[1]) * eu[1] <= 0) continue;
      const mx = (A[0] + Dp[0]) / 2; const mz = (A[1] + Dp[1]) / 2;
      let road = Infinity;
      for (const rd of real) for (let i = 1; i < rd.pts.length; i++) road = Math.min(road, segDist(mx, mz, rd.pts[i - 1], rd.pts[i]));
      if (!best || road < best.road) best = { order, road };
    }
  }
  return best ? best.order : o;
} // floor height, the same as the hostel facade texture
export const FLOORS = 2; // BITS Pilani boys' Bhawans: ground floor, first floor and the roof
const MOD = 3.4; // module for the shared spaces (stairs, washrooms, lobby, common room) and the courtyard arches
const ROOM = 5.1; // a student room: wide rooms, so doors are well spaced down each corridor
const DEPTH = 4.2; // room depth
const T = 0.25; // partition
const OUT = 0.3; // outer wall
const COR = 2.8; // corridor width
const SCREEN = 0.3; // arch screen on the courtyard side
const WD = OUT + DEPTH + T + COR + SCREEN; // wing depth, 7.85
// Krishna: outer rooms, corridor, inner rooms, verandah and arcade: 15.35 m, the OSM wing depth (15.4 m)
const KWD = WD + T + DEPTH + T + COR; // 15.35
const VER = SCREEN + COR; // the verandah ring round a Krishna courtyard, from the arcade line to the room fronts
const SLAB = 0.2;
export const DIMS = { DEPTH, T, OUT, COR, SCREEN, WD, SLAB };
const RISE = FH / 16; // 8 + 8 steps per floor
const TREAD = 0.27;
// Colliders are axis-aligned, so walls in the rotated frame are split into short pieces (short enough that you
// can walk along a wall without catching on the steps); floors can use longer ones.
const CHUNK = 0.5;
const FLOOR_CHUNK = 1.2;

function canvas(w, h, draw, { repeat = false } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (repeat) { tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping; }
  return tex;
}

function rng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

// ---------- textures (drawn once) ----------
const PX = 150; // pixels per metre on the wall textures

// Corridor face of one locked room: door, corridor window, ventilator, cream dado.
// style 'k': Krishna Bhawan (cream corridor walls, green-painted timber doors with a wire-mesh outer leaf, as in the
// 2006 photos); 'ver': the same door in a salmon wall, for the room fronts along Krishna's courtyard verandahs;
// 'pink': the plain timber door in a salmon wall, for the other Bhawans' room fronts behind an open arcade.
function bayTexture(style = null) {
  return canvas(768, 512, (g) => {
    const W = 768; const H = 512; const m = W / ROOM; const y = (h) => H - h * (H / (FH - SLAB));
    const wx = (1.3 + ROOM) / 2 - 0.6; // corridor window, centred in the wall beside the door
    const K = style === 'k' || style === 'ver'; const P = style === 'ver' || style === 'pink';
    g.fillStyle = P ? '#e9b29a' : K ? '#f2ead6' : '#f3f0e8'; g.fillRect(0, 0, W, H);
    g.fillStyle = P ? '#c98f78' : K ? '#cfd3cf' : '#e6d6b2'; g.fillRect(0, y(1.0), W, H - y(1.0));
    g.fillStyle = K ? '#8d8a80' : '#b89a6a'; g.fillRect(0, y(1.0), W, 3);
    if (K) {
      // deep reveal, green frame, two leaves: the wire-mesh outer leaf folded back over the solid inner one
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0.24 * m, y(2.24), 1.12 * m, y(0) - y(2.24));
      g.fillStyle = '#3f5f3a'; g.fillRect(0.3 * m, y(2.16), 1.0 * m, y(0) - y(2.16));
      g.fillStyle = '#5d7f52'; g.fillRect(0.36 * m, y(2.1), 0.44 * m, y(0) - y(2.1)); g.fillRect(0.8 * m, y(2.1), 0.44 * m, y(0) - y(2.1));
      g.strokeStyle = '#2c3f29'; g.lineWidth = 2;
      g.save(); g.beginPath(); g.rect(0.42 * m, y(1.95), 0.32 * m, y(0.25) - y(1.95)); g.clip();
      for (let d = -300; d < 300; d += 10) { g.beginPath(); g.moveTo(0.42 * m + d, y(1.95)); g.lineTo(0.42 * m + d + 260, y(0.25)); g.stroke(); g.beginPath(); g.moveTo(0.42 * m + d + 260, y(1.95)); g.lineTo(0.42 * m + d, y(0.25)); g.stroke(); }
      g.restore();
      g.fillStyle = '#4c6c44'; g.fillRect(0.86 * m, y(1.95), 0.32 * m, y(1.15) - y(1.95)); g.fillRect(0.86 * m, y(1.0), 0.32 * m, y(0.2) - y(1.0));
      g.fillStyle = '#c9ccc4'; g.fillRect(0.83 * m, y(1.08), 0.03 * m, y(0.9) - y(1.08));
    } else {
    g.fillStyle = '#9a7a4f'; g.fillRect(0.3 * m, y(2.16), 1.0 * m, y(0) - y(2.16));
    g.fillStyle = '#d8b987'; g.fillRect(0.36 * m, y(2.1), 0.88 * m, y(0) - y(2.1));
    g.fillStyle = '#cfae7c'; g.fillRect(0.44 * m, y(1.95), 0.72 * m, y(1.2) - y(1.95));
    g.fillStyle = '#b9bec4'; g.fillRect(1.12 * m, y(1.08), 0.05 * m, y(0.88) - y(1.08));
    g.fillStyle = '#8f9399'; g.fillRect(1.06 * m, y(0.98), 0.12 * m, 4);
    }
    // corridor window with bars
    g.fillStyle = '#efe7d6'; g.fillRect(wx * m, y(2.25), 1.2 * m, y(1.05) - y(2.25));
    g.fillStyle = '#3a4550'; g.fillRect((wx + 0.07) * m, y(2.18), 1.06 * m, y(1.12) - y(2.18));
    g.fillStyle = '#5c6b78'; g.fillRect((wx + 0.07) * m, y(2.18), 1.06 * m, 6);
    g.strokeStyle = '#d9d4c8'; g.lineWidth = 4;
    for (let k = 1; k < 5; k++) { const x = (wx + 0.07 + (1.06 * k) / 5) * m; g.beginPath(); g.moveTo(x, y(2.18)); g.lineTo(x, y(1.12)); g.stroke(); }
    // jaali ventilator above the door
    g.fillStyle = '#e9e1cf'; g.fillRect(0.4 * m, y(2.75), 0.8 * m, y(2.4) - y(2.75));
    g.fillStyle = '#9b927f';
    for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) g.fillRect((0.46 + i * 0.12) * m, y(2.7 - j * 0.15), 0.07 * m, 0.08 * m);
    // switch board
    g.fillStyle = '#ffffff'; g.fillRect(1.45 * m, y(1.45), 0.12 * m, 0.18 * m);
  });
}

// Courtyard screen bay: cusped arch, open (ground floor) or filled with a scrollwork grille above a sill; round: a
// plain semicircular arch on piers (the middle-wing arcades of Ram, Budh, Shankar, Vyas and Vishwakarma).
function archTexture(grille, round = false) {
  return canvas(512, 512, (g) => {
    const W = 512; const H = 512; const m = W / MOD; const y = (h) => H - h * (H / (FH - SLAB));
    g.fillStyle = '#ecdcb9'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#e1cda4'; g.fillRect(0, 0, 0.32 * m, H); g.fillRect(W - 0.32 * m, 0, 0.32 * m, H);
    g.fillStyle = '#d6bf92'; g.fillRect(0, y(0.15), W, 6);
    const x0 = 0.42 * m; const x1 = W - 0.42 * m; const cx = W / 2;
    const sill = grille ? 0.85 : 0; const spring = round ? 1.6 : 2.05; const apex = 2.72;
    const opening = () => {
      g.beginPath();
      g.moveTo(x0, y(sill)); g.lineTo(x0, y(spring));
      if (round) { g.arc(cx, y(spring), cx - x0, Math.PI, 0); g.lineTo(x1, y(sill)); g.closePath(); return; }
      // cusped (multifoil) head: five lobes along a pointed arch
      const lobes = 5;
      const pt = (k) => { const a = Math.PI * (k / lobes); return [cx - Math.cos(a) * (cx - x0), y(spring + Math.sin(a) * (apex - spring))]; };
      for (let k = 0; k < lobes; k++) {
        const [ax, ay] = pt(k); const [bx, by] = pt(k + 1);
        const mx = (ax + bx) / 2; const my = (ay + by) / 2;
        const nx = -(by - ay); const ny = bx - ax; const nl = Math.hypot(nx, ny);
        g.quadraticCurveTo(mx + (nx / nl) * 18, my + (ny / nl) * 18, bx, by);
      }
      g.lineTo(x1, y(sill)); g.closePath();
    };
    // moulding round the opening
    g.save(); g.strokeStyle = '#cdb489'; g.lineWidth = 14; opening(); g.stroke(); g.restore();
    g.save(); g.globalCompositeOperation = 'destination-out'; opening(); g.fill(); g.restore();
    if (grille) {
      g.save(); opening(); g.clip();
      g.strokeStyle = '#f7f5ef'; g.lineWidth = 7; g.lineCap = 'round';
      const top = y(apex); const bot = y(sill);
      for (let x = x0 + 28; x < x1; x += 56) { g.beginPath(); g.moveTo(x, top); g.lineTo(x, bot); g.stroke(); }
      for (let x = x0; x < x1; x += 56) {
        for (let yy = top + 30; yy < bot; yy += 70) {
          g.beginPath(); g.moveTo(x + 28, yy); g.bezierCurveTo(x + 2, yy + 4, x + 2, yy + 34, x + 22, yy + 34); g.bezierCurveTo(x + 34, yy + 34, x + 34, yy + 20, x + 24, yy + 18); g.stroke();
          g.beginPath(); g.moveTo(x + 28, yy + 35); g.bezierCurveTo(x + 54, yy + 39, x + 54, yy + 69, x + 34, yy + 69); g.bezierCurveTo(x + 22, yy + 69, x + 22, yy + 55, x + 32, yy + 53); g.stroke();
        }
      }
      g.lineWidth = 10; g.beginPath(); g.moveTo(x0, bot - 4); g.lineTo(x1, bot - 4); g.stroke();
      g.restore();
    }
  });
}

// Room numbers for the door plates, all in one atlas (shared by every Bhawan: rooms 1001–1150 and 2001–2150).
const PLATES_PER_FLOOR = 200; // Krishna has a second row of rooms round its courtyards
const sharedPlates = {};
// style 'k': Krishna's numbers, stencilled in red on the wall above the door (2006 photo), not on a plate
function plates(style = 'plate') {
  if (!sharedPlates[style]) {
    const numbers = [];
    for (let k = 1; k <= FLOORS; k++) for (let n = 1; n <= PLATES_PER_FLOOR; n++) numbers.push(k * 1000 + n);
    sharedPlates[style] = plateAtlas(numbers, style);
  }
  return sharedPlates[style];
}
// Materials are shared between Bhawans too, except the TV screen, which each common room switches on its own.
const sharedMats = new Map();
// Plain single-colour pieces ('c:#rrggbb') are painted with vertex colours and merged into one mesh ('vc').
const VC = 'vc';
const plain = (key) => /^c:#[0-9a-f]{3,6}$/i.test(key);
const castsShadow = (key) => key.startsWith('t:plaster') || key.startsWith('t:concrete');
function paint(g, hex) {
  const c = new THREE.Color(hex); const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
}

// The outside of every Bhawan (arcades, roofs, courtyards, porches) shares materials, so after they are all
// built their shells are merged into one mesh per material for the whole campus.
export function mergeShells(hostels, root) {
  const all = new Map();
  for (const H of hostels) {
    for (const [key, list] of H.shellOut) {
      if (!all.has(key)) all.set(key, { H, list: [] });
      all.get(key).list.push(...list);
    }
    H.shellOut = null;
  }
  for (const [key, { H, list }] of all) {
    const g = mergeGeometries(list);
    if (!g) continue;
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, H.material(key));
    mesh.receiveShadow = true;
    mesh.castShadow = castsShadow(key);
    root.add(mesh);
  }
}

function plateAtlas(numbers, style = 'plate') {
  const cols = 16; const cw = 128; const ch = 48;
  const rows = Math.ceil(numbers.length / cols);
  const uv = new Map();
  const tex = canvas(cols * cw, Math.max(1, rows) * ch, (g) => {
    g.textAlign = 'center'; g.textBaseline = 'middle';
    numbers.forEach((n, i) => {
      const x = (i % cols) * cw; const yy = Math.floor(i / cols) * ch;
      if (style === 'k') {
        g.fillStyle = '#f2ead6'; g.fillRect(x, yy, cw, ch);
        g.fillStyle = '#b3261e'; g.font = 'bold 34px "Courier New", monospace'; g.fillText(String(n), x + cw / 2, yy + ch / 2 + 2);
      } else {
        g.fillStyle = '#2b2f36'; g.fillRect(x + 4, yy + 4, cw - 8, ch - 8);
        g.fillStyle = '#f2f2f2'; g.font = 'bold 30px system-ui, sans-serif'; g.fillText(String(n), x + cw / 2, yy + ch / 2 + 1);
      }
      uv.set(n, [x / (cols * cw), 1 - (yy + ch) / (rows * ch), (x + cw) / (cols * cw), 1 - yy / (rows * ch)]);
    });
  });
  return { tex, uv };
}

// ---------- Krishna Bhawan's own faces (research/buildings/hostels-krishna-gandhi.md) ----------
// Textures with cut-out openings (alpha-tested, both sides drawn).
const CUT = new Set(['colonnade', 'kbay', 'kgate']);
// A cusped (multifoil) arch head: five lobes along a pointed arch from (x0, spring) over to (x1, spring).
function cusped(g, x0, x1, ySpring, yApex, bulge) {
  const cx = (x0 + x1) / 2; const lobes = 5;
  const pt = (k) => { const a = Math.PI * (k / lobes); return [cx - Math.cos(a) * (cx - x0), ySpring - Math.sin(a) * (ySpring - yApex)]; };
  for (let k = 0; k < lobes; k++) {
    const [ax, ay] = pt(k); const [bx, by] = pt(k + 1);
    const mx = (ax + bx) / 2; const my = (ay + by) / 2;
    const nx = -(by - ay); const ny = bx - ax; const nl = Math.hypot(nx, ny);
    g.quadraticCurveTo(mx - (nx / nl) * bulge, my - (ny / nl) * bulge, bx, by);
  }
}
// A round-arched window with a radial fanlight grille and vertical bars with rings (the 2006 entrance photo).
function archedWindow(g, cx, sill, spring, w, py, px) {
  const r = (w / 2) * px; const x0 = cx - r; const x1 = cx + r;
  const ys = py(spring); const yb = py(sill);
  g.fillStyle = '#fbf8f0'; g.beginPath(); g.moveTo(x0 - 9, yb + 6); g.lineTo(x0 - 9, ys); g.arc(cx, ys, r + 9, Math.PI, 0); g.lineTo(x1 + 9, yb + 6); g.closePath(); g.fill();
  g.fillStyle = '#2c3135'; g.beginPath(); g.moveTo(x0, yb); g.lineTo(x0, ys); g.arc(cx, ys, r, Math.PI, 0); g.lineTo(x1, yb); g.closePath(); g.fill();
  g.strokeStyle = '#d8d6cf'; g.lineWidth = 2;
  for (let k = 1; k < 8; k++) { const a = Math.PI + (Math.PI * k) / 8; g.beginPath(); g.moveTo(cx, ys); g.lineTo(cx + Math.cos(a) * r, ys + Math.sin(a) * r); g.stroke(); }
  g.beginPath(); g.arc(cx, ys, r * 0.3, Math.PI, 0); g.stroke();
  g.beginPath(); g.moveTo(x0, ys); g.lineTo(x1, ys); g.stroke();
  for (let k = 1; k < 6; k++) { const x = x0 + (k * (x1 - x0)) / 6; g.beginPath(); g.moveTo(x, ys); g.lineTo(x, yb); g.stroke(); }
  const yr = py(sill + 0.35);
  for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x0 + ((k + 0.5) * (x1 - x0)) / 5, yr, Math.min(7, r / 6), 0, 7); g.stroke(); }
  g.fillStyle = '#e9e4d6'; g.fillRect(x0 - 12, yb, x1 - x0 + 24, 7);
}
function rosette(g, x, y, r) {
  g.fillStyle = '#fbf8f0'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  g.strokeStyle = '#cbbd9c'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r * 0.8, 0, 7); g.stroke();
  for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.42, y + Math.sin(a) * r * 0.42, r * 0.3, r * 0.12, a, 0, 7); g.stroke(); }
}
function jaaliPanel(g, x, y, w, h) {
  g.fillStyle = '#f6f3ea'; g.fillRect(x, y, w, h);
  g.fillStyle = '#7d7a72';
  const n = Math.max(2, Math.round(w / 22));
  const cs = w / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < Math.max(1, Math.round(h / cs)); j++) { g.beginPath(); g.arc(x + (i + 0.5) * cs, y + (j + 0.5) * cs, cs * 0.3, 0, 7); g.fill(); }
}
const LAWN = 't:grass:#d9e8b8';
const KOTA = 't:terrazzo:#b7bab2';
const PAVING = 't:paving:#c27a62'; // Shankar's red forecourt
const SAND = 't:dirt:#cdb48a'; // the bare play patches in the Vyas and Vishwakarma courtyards
const COURT = 't:concrete:#c9c4b8'; // a concrete games court on a lawn
// laid on (or just over) the ground: drawn pulled forward so they never flicker against it at a distance
const GROUND = new Set(['t:concrete:#dcd6ca', LAWN, PAVING, SAND]);
const PAD = 0.08; // the top of a games court or a sand patch, well clear of the lawn under it
const ENTRANCE_W = 10.4; // the projecting entrance bay of Krishna Bhawan
const KTEX = {
  // Krishna's outer face, one 3.4 m bay, both floors: arched grilled windows below, rectangular openings above
  kfacade: () => canvas(256, 512, (g, W, H) => {
    const px = W / MOD; const py = (h) => H - h * (H / (FLOORS * FH));
    g.fillStyle = '#efe5cb'; g.fillRect(0, 0, W, H);
    const r = rng(11); g.fillStyle = 'rgba(120,100,60,0.05)'; for (let i = 0; i < 260; i++) g.fillRect(r() * W, r() * H, 3 + r() * 9, 2 + r() * 6);
    g.fillStyle = '#d8c8a2'; g.fillRect(0, py(0.5), W, H - py(0.5));
    g.fillStyle = '#e4d6b4'; g.fillRect(0, 0, 10, H); g.fillRect(W - 10, 0, 10, H);
    archedWindow(g, W / 2, 0.95, 2.05, 1.2, py, px);
    g.fillStyle = '#f7f3ea'; g.fillRect(0, py(3.42), W, py(3.15) - py(3.42));
    for (const cx of [0.95, 2.45]) {
      const x0 = (cx - 0.5) * px; const x1 = (cx + 0.5) * px;
      g.fillStyle = '#fbf8f0'; g.fillRect(x0 - 7, py(5.95), x1 - x0 + 14, py(3.85) - py(5.95));
      g.fillStyle = '#30373b'; g.fillRect(x0, py(5.88), x1 - x0, py(3.92) - py(5.88));
      g.fillStyle = '#556a5a'; for (let k = 0; k < 4; k++) g.fillRect(x0 + 3, py(5.7 - k * 0.45), x1 - x0 - 6, 4);
    }
  }, { repeat: true }),
  // the ground floor of the entrance bay: window, the gate arch, the open arch, window; name band; loggia parapet
  kbay: () => canvas(1040, 440, (g, W, H) => {
    const px = W / ENTRANCE_W; const py = (h) => H - h * (H / 4.4);
    g.fillStyle = '#eddcb5'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ddc79c'; g.fillRect(0, py(0.5), W, H - py(0.5));
    for (const x of [0, 2.3, 5.2, 8.1, 10.4]) { g.fillStyle = '#e4cfa6'; g.fillRect(x * px - 14, py(2.95), 28, py(0) - py(2.95)); }
    archedWindow(g, 1.15 * px, 0.95, 2.0, 1.1, py, px);
    archedWindow(g, 9.25 * px, 0.95, 2.0, 1.1, py, px);
    rosette(g, 1.15 * px, py(2.62), 22); rosette(g, 9.25 * px, py(2.62), 22);
    const arch = (cx) => {
      const x0 = (cx - 1.15) * px; const x1 = (cx + 1.15) * px;
      const path = (grow) => { g.beginPath(); g.moveTo(x0 - grow, py(0)); g.lineTo(x0 - grow, py(2.2)); cusped(g, x0 - grow, x1 + grow, py(2.2), py(2.85) - grow, 14); g.lineTo(x1 + grow, py(0)); g.closePath(); };
      g.fillStyle = '#fbf8f0'; path(12); g.fill();
      g.save(); g.globalCompositeOperation = 'destination-out'; path(0); g.fill(); g.restore();
      for (const dx of [-1.48, 1.48]) rosette(g, (cx + dx) * px, py(2.7), 15);
    };
    arch(3.75); arch(6.65);
    // name band: "कृष्ण भवन" in Devanagari above the arches (partly legible in the photo; the full name is assumed)
    g.fillStyle = '#f7f3ea'; g.fillRect(0, py(3.3), W, py(2.95) - py(3.3));
    g.fillStyle = '#5a4a32'; g.font = 'bold 30px "Kohinoor Devanagari", "Devanagari Sangam MN", "Noto Sans Devanagari", "Mangal", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('कृष्ण भवन', 5.2 * px, py(3.125));
    // loggia parapet with jaali panels, white coping
    g.fillStyle = '#eddcb5'; g.fillRect(0, py(4.3), W, py(3.3) - py(4.3));
    for (const x of [0.7, 2.9, 4.8, 6.9, 8.9]) jaaliPanel(g, x * px, py(4.15), 0.8 * px, py(3.45) - py(4.15));
    g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, W, py(4.3));
  }),
  // green collapsible gate (the left arch)
  kgate: () => canvas(256, 256, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    g.strokeStyle = '#2d5634'; g.lineWidth = 5;
    for (let x = 4; x < W; x += 21) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    g.lineWidth = 3;
    for (let x = 4; x < W - 21; x += 21) for (let y = 0; y < H; y += 32) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 21, y + 16); g.lineTo(x, y + 32); g.stroke(); g.beginPath(); g.moveTo(x + 21, y); g.lineTo(x, y + 16); g.lineTo(x + 21, y + 32); g.stroke(); }
    g.lineWidth = 8; for (const y of [6, H - 6, H / 2]) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  }),
  // the courtyard colonnade on the first floor: square piers, a rectangular opening over a jaali parapet
  colonnade: () => canvas(512, 512, (g, W, H) => {
    const m = W / MOD; const y = (h) => H - h * (H / (FH - SLAB));
    g.fillStyle = '#efe4c9'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#e4d5b2'; g.fillRect(0, 0, 0.42 * m, H); g.fillRect(W - 0.42 * m, 0, 0.42 * m, H);
    g.fillStyle = '#f8f4ea'; g.fillRect(0, y(2.95), W, y(2.75) - y(2.95));
    jaaliPanel(g, 0.55 * m, y(0.85), W - 1.1 * m, y(0.2) - y(0.85));
    g.fillStyle = '#f8f4ea'; g.fillRect(0.42 * m, y(0.98), W - 0.84 * m, y(0.88) - y(0.98));
    g.save(); g.globalCompositeOperation = 'destination-out'; g.fillRect(0.42 * m, y(2.72), W - 0.84 * m, y(0.98) - y(2.72)); g.restore();
  }),
  // the back wall of the first-floor loggia: pale blue distemper, doors and windows (2006 photo)
  loggiaBack: () => canvas(512, 160, (g, W, H) => {
    const px = W / ENTRANCE_W; const py = (h) => H - h * (H / (FH - SLAB));
    g.fillStyle = '#dfe7ea'; g.fillRect(0, 0, W, H);
    for (const cx of [1.6, 4.0, 6.4, 8.8]) {
      g.fillStyle = '#f5f6f2'; g.fillRect((cx - 0.6) * px - 3, py(2.4), 1.2 * px + 6, py(0.9) - py(2.4));
      g.fillStyle = '#3d4f3c'; g.fillRect((cx - 0.6) * px, py(2.35), 1.2 * px, py(0.95) - py(2.35));
      g.fillStyle = '#7e8c80'; g.fillRect((cx - 0.3) * px, py(2.9), 0.6 * px, py(2.6) - py(2.9));
    }
  }),
  // a roof mumty's side: arched jaali opening
  mumty: () => canvas(256, 256, (g, W, H) => {
    g.fillStyle = '#ebe3cf'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#f6f2e8'; g.fillRect(0, 0, W, 22);
    g.fillStyle = '#3a3a36'; g.beginPath(); g.moveTo(88, 200); g.lineTo(88, 120); g.arc(128, 120, 40, Math.PI, 0); g.lineTo(168, 200); g.closePath(); g.fill();
    g.fillStyle = '#e8e2d2'; for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) g.fillRect(94 + i * 19, 98 + j * 20, 9, 9);
  }),
};

// ---------- the other courtyard Bhawans' faces ----------
// An outer face, one 3.4 m bay over both floors (research: hostels-ram-budh.md and hostels-shankar-vyas-vk.md).
//   'scroll' (Gandhi): arched openings filled with dark scroll grilles, rectangular windows above.
//   'round' (Ram, Budh): tall round-headed windows, a rectangular window over each, a thin cornice band.
//   'jaali' (Shankar, Vyas, Vishwakarma): round-headed arches filled with jaali, a moulded band, small windows.
//   'budh' (Budh's east face): an arcade with circular-pattern grilles under an open gallery with sunshades.
function facadeTexture(kind) {
  return canvas(256, 512, (g, W, H) => {
    const px = W / MOD; const py = (h) => H - h * (H / (FLOORS * FH));
    const base = kind === 'scroll' ? '#ebe5d5' : '#efe5cb';
    g.fillStyle = base; g.fillRect(0, 0, W, H);
    const r = rng(kind.length * 7 + 3); g.fillStyle = 'rgba(120,100,60,0.05)'; for (let i = 0; i < 260; i++) g.fillRect(r() * W, r() * H, 3 + r() * 9, 2 + r() * 6);
    g.fillStyle = '#d8c8a2'; g.fillRect(0, py(0.5), W, H - py(0.5)); // plinth
    g.fillStyle = 'rgba(160,140,100,0.25)'; g.fillRect(0, 0, 8, H); g.fillRect(W - 8, 0, 8, H); // pilaster edges
    const cx = W / 2;
    const archPath = (x0, x1, yb, ys) => { g.beginPath(); g.moveTo(x0, yb); g.lineTo(x0, ys); g.arc((x0 + x1) / 2, ys, (x1 - x0) / 2, Math.PI, 0); g.lineTo(x1, yb); g.closePath(); };
    const surround = (x0, x1, yb, ys, pad = 9) => { g.fillStyle = '#fbf8f0'; archPath(x0 - pad, x1 + pad, yb + 6, ys); g.fill(); };
    const rectWin = (w, h0, h1, bars = 4, frame = '#fbf8f0') => {
      const x0 = cx - (w / 2) * px; const x1 = cx + (w / 2) * px;
      g.fillStyle = frame; g.fillRect(x0 - 7, py(h1) - 7, x1 - x0 + 14, py(h0) - py(h1) + 14);
      g.fillStyle = '#30373b'; g.fillRect(x0, py(h1), x1 - x0, py(h0) - py(h1));
      g.fillStyle = '#566a76'; g.fillRect(x0, py(h1), x1 - x0, 5);
      g.strokeStyle = '#cfd2cc'; g.lineWidth = 3; for (let k = 1; k < bars; k++) { const x = x0 + (k * (x1 - x0)) / bars; g.beginPath(); g.moveTo(x, py(h1)); g.lineTo(x, py(h0)); g.stroke(); }
      g.fillStyle = '#e4dccb'; g.fillRect(x0 - 12, py(h0), x1 - x0 + 24, 7); // sill
    };
    if (kind === 'budh') {
      // ground floor: a wide arch on piers, its circular grille; first floor: an open gallery bay with a sunshade
      const x0 = 0.38 * px; const x1 = W - 0.38 * px; const yb = py(0.5); const ys = py(1.75);
      surround(x0, x1, yb, ys, 6);
      g.fillStyle = '#2b2f31'; archPath(x0, x1, yb, ys); g.fill();
      g.save(); archPath(x0, x1, yb, ys); g.clip(); g.strokeStyle = '#d9d3c4'; g.lineWidth = 3;
      for (let yy = py(0.6); yy > py(3.0); yy -= 22) for (let x = x0 + 11; x < x1; x += 22) { g.beginPath(); g.arc(x, yy, 9, 0, 7); g.stroke(); }
      g.restore();
      g.fillStyle = '#f7f3ea'; g.fillRect(0, py(3.42), W, py(3.15) - py(3.42));
      g.fillStyle = '#e8dcc0'; g.fillRect(0.3 * px, py(4.35), W - 0.6 * px, py(3.45) - py(4.35)); // gallery parapet
      g.fillStyle = '#2f3437'; g.fillRect(0.3 * px, py(6.0), W - 0.6 * px, py(4.35) - py(6.0)); // the open gallery
      g.fillStyle = '#4b5256'; g.fillRect(0.3 * px, py(6.0), W - 0.6 * px, 10);
      g.fillStyle = '#fbf8f0'; g.fillRect(0.2 * px, py(6.12), W - 0.4 * px, py(5.95) - py(6.12)); // sunshade
      for (const x of [0.4 * px, W - 0.4 * px]) { g.fillStyle = '#ddd0b0'; g.beginPath(); g.moveTo(x - 10, py(5.95)); g.lineTo(x + 10, py(5.95)); g.lineTo(x, py(5.6)); g.closePath(); g.fill(); }
      return;
    }
    // ground floor
    const aw = kind === 'round' ? 1.25 : 1.4; const x0 = cx - (aw / 2) * px; const x1 = cx + (aw / 2) * px;
    const yb = py(kind === 'round' ? 0.85 : 0.6); const ys = py(kind === 'round' ? 2.25 : 2.05);
    surround(x0, x1, yb, ys);
    g.fillStyle = '#2c3135'; archPath(x0, x1, yb, ys); g.fill();
    g.save(); archPath(x0, x1, yb, ys); g.clip();
    if (kind === 'scroll') {
      g.strokeStyle = '#6d6a62'; g.lineWidth = 3;
      for (let x = x0; x < x1; x += 22) for (let yy = ys - 50; yy < yb; yy += 30) { g.beginPath(); g.arc(x + 11, yy, 9, 0.2, 4.5); g.stroke(); g.beginPath(); g.arc(x + 11, yy + 15, 9, 3.4, 7.6); g.stroke(); }
    } else if (kind === 'jaali') {
      g.fillStyle = '#e6dcc4';
      for (let yy = ys - 50; yy < yb; yy += 12) for (let x = x0; x < x1; x += 12) { g.fillRect(x, yy, 12, 4); g.fillRect(x, yy, 4, 12); }
    } else {
      g.strokeStyle = '#d8d6cf'; g.lineWidth = 3;
      for (let k = 1; k < 4; k++) { const x = x0 + (k * (x1 - x0)) / 4; g.beginPath(); g.moveTo(x, ys - 60); g.lineTo(x, yb); g.stroke(); }
      g.beginPath(); g.moveTo(x0, ys); g.lineTo(x1, ys); g.stroke();
      for (let k = 1; k < 6; k++) { const a = Math.PI + (Math.PI * k) / 6; g.beginPath(); g.moveTo(cx, ys); g.lineTo(cx + Math.cos(a) * (x1 - x0) / 2, ys + Math.sin(a) * (x1 - x0) / 2); g.stroke(); }
    }
    g.restore();
    g.fillStyle = '#e9e4d6'; g.fillRect(x0 - 12, yb, x1 - x0 + 24, 7);
    // the moulded band between the floors (the string course itself is a box)
    g.fillStyle = '#f7f3ea'; g.fillRect(0, py(3.45), W, py(3.15) - py(3.45));
    // first floor
    if (kind === 'jaali') rectWin(0.8, 4.25, 5.35, 3);
    else if (kind === 'round') rectWin(1.0, 4.0, 5.7, 4);
    else rectWin(1.1, 3.95, 5.8, 4);
  }, { repeat: true });
}

// The front of an entrance bay (10.4 m): round-arched windows at the ends, the shut gate arch and the open door
// arch between them, rosettes, the Devanagari name band; above it either the loggia's parapet (to 4.4 m) or, for a
// closed block, the first floor with three tall windows and the attic (to 8.6 m).
function frontTexture(st) {
  const block = st.bay === 'block';
  const Hm = block ? 8.6 : 4.4;
  return canvas(1040, block ? 860 : 440, (g, W, H) => {
    const px = W / ENTRANCE_W; const py = (h) => H - h * (H / Hm);
    const wall = st.maroon ? '#efe4c6' : '#eddcb5';
    g.fillStyle = wall; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ddc79c'; g.fillRect(0, py(0.5), W, H - py(0.5));
    for (const x of [0, 2.3, 5.2, 8.1, 10.4]) { g.fillStyle = '#e4cfa6'; g.fillRect(x * px - 14, py(2.95), 28, py(0) - py(2.95)); }
    archedWindow(g, 1.15 * px, 0.95, 2.0, 1.1, py, px);
    archedWindow(g, 9.25 * px, 0.95, 2.0, 1.1, py, px);
    rosette(g, 1.15 * px, py(2.62), 22); rosette(g, 9.25 * px, py(2.62), 22);
    const arch = (cx) => {
      const x0 = (cx - 1.15) * px; const x1 = (cx + 1.15) * px;
      const path = (grow) => {
        g.beginPath(); g.moveTo(x0 - grow, py(0));
        if (st.arch === 'round') { g.lineTo(x0 - grow, py(1.7)); g.arc((x0 + x1) / 2, py(1.7), (x1 - x0) / 2 + grow, Math.PI, 0); } else { g.lineTo(x0 - grow, py(2.2)); cusped(g, x0 - grow, x1 + grow, py(2.2), py(2.85) - grow, 14); }
        g.lineTo(x1 + grow, py(0)); g.closePath();
      };
      g.fillStyle = '#fbf8f0'; path(12); g.fill();
      g.save(); g.globalCompositeOperation = 'destination-out'; path(0); g.fill(); g.restore();
      for (const dx of [-1.48, 1.48]) rosette(g, (cx + dx) * px, py(2.7), 15);
    };
    arch(3.75); arch(6.65);
    g.fillStyle = '#f7f3ea'; g.fillRect(0, py(3.3), W, py(2.95) - py(3.3));
    g.fillStyle = '#5a4a32'; g.font = 'bold 30px "Kohinoor Devanagari", "Devanagari Sangam MN", "Noto Sans Devanagari", "Mangal", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(st.deva, 5.2 * px, py(3.125));
    if (!block) {
      g.fillStyle = wall; g.fillRect(0, py(4.3), W, py(3.3) - py(4.3));
      for (const x of [0.7, 2.9, 4.8, 6.9, 8.9]) jaaliPanel(g, x * px, py(4.15), 0.8 * px, py(3.45) - py(4.15));
      g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, W, py(4.3));
      return;
    }
    // first floor: three tall windows with fanlights and balconettes
    for (const cx of [2.3, 5.2, 8.1]) {
      const x0 = (cx - 0.75) * px; const x1 = (cx + 0.75) * px;
      g.fillStyle = '#fbf8f0'; g.fillRect(x0 - 10, py(6.35), x1 - x0 + 20, py(3.75) - py(6.35));
      g.fillStyle = '#2f3639'; g.fillRect(x0, py(6.25), x1 - x0, py(3.85) - py(6.25));
      g.strokeStyle = '#d4d2c8'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(x0, py(5.6)); g.lineTo(x1, py(5.6)); g.stroke();
      for (let k = 1; k < 4; k++) { const x = x0 + (k * (x1 - x0)) / 4; g.beginPath(); g.moveTo(x, py(6.25)); g.lineTo(x, py(3.85)); g.stroke(); }
      jaaliPanel(g, x0 - 6, py(4.45), x1 - x0 + 12, py(3.85) - py(4.45));
    }
    // cornice, a maroon line under it (Shankar, Vyas, Vishwakarma), the attic
    g.fillStyle = '#f7f3ea'; g.fillRect(0, py(6.95), W, py(6.6) - py(6.95));
    if (st.maroon) { g.fillStyle = '#8a3b2e'; g.fillRect(0, py(6.6), W, 6); g.fillRect(0, py(8.2), W, 5); }
    for (const x of [1.0, 3.4, 5.8, 8.2]) jaaliPanel(g, x * px, py(8.0), 1.2 * px, py(7.25) - py(8.0));
  });
}

// A courtyard face without an arcade, one bay of one floor: salmon plaster with a barred corridor window (cut out).
function courtWindowTexture() {
  return canvas(512, 512, (g, W, H) => {
    const m = W / MOD; const y = (h) => H - h * (H / (FH - SLAB));
    g.fillStyle = '#e9b29a'; g.fillRect(0, 0, W, H);
    const r = rng(31); g.fillStyle = 'rgba(120,60,40,0.06)'; for (let i = 0; i < 200; i++) g.fillRect(r() * W, r() * H, 3 + r() * 9, 2 + r() * 6);
    g.fillStyle = '#d99c84'; g.fillRect(0, y(0.45), W, H - y(0.45));
    const x0 = 1.0 * m; const x1 = W - 1.0 * m;
    g.fillStyle = '#f4ead8'; g.fillRect(x0 - 12, y(2.38), x1 - x0 + 24, y(0.88) - y(2.38));
    g.save(); g.globalCompositeOperation = 'destination-out'; g.fillRect(x0, y(2.3), x1 - x0, y(0.95) - y(2.3)); g.restore();
    g.fillStyle = '#4c5a50';
    for (let k = 0; k <= 6; k++) { const x = x0 + (k * (x1 - x0)) / 6; g.fillRect(x - 3, y(2.3), 6, y(0.95) - y(2.3)); }
    g.fillRect(x0, y(1.65) - 3, x1 - x0, 6);
    g.fillStyle = '#efe4d0'; g.fillRect(x0 - 16, y(0.95), x1 - x0 + 32, 10);
  });
}

// The middle wing's back onto the second courtyard (rooms): salmon, a room window on each floor, a cream band.
function courtFaceTexture() {
  return canvas(256, 512, (g, W, H) => {
    const px = W / MOD; const py = (h) => H - h * (H / (FLOORS * FH));
    g.fillStyle = '#e9b29a'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#d99c84'; g.fillRect(0, py(0.45), W, H - py(0.45));
    g.fillStyle = '#f4efe3'; g.fillRect(0, py(3.42), W, py(3.15) - py(3.42));
    for (const k of [0, 1]) {
      const y0 = k * FH; const x0 = (MOD / 2 - 0.65) * px; const x1 = (MOD / 2 + 0.65) * px;
      g.fillStyle = '#f4ead8'; g.fillRect(x0 - 7, py(y0 + 2.35), x1 - x0 + 14, py(y0 + 0.95) - py(y0 + 2.35));
      g.fillStyle = '#323a3d'; g.fillRect(x0, py(y0 + 2.28), x1 - x0, py(y0 + 1.02) - py(y0 + 2.28));
      g.fillStyle = '#7d1f2b'; g.fillRect(x0 + 4, py(y0 + 2.2), (x1 - x0) * 0.3, py(y0 + 1.1) - py(y0 + 2.2)); // a curtain
      g.strokeStyle = '#cfd2cc'; g.lineWidth = 3; for (let j = 1; j < 4; j++) { const x = x0 + (j * (x1 - x0)) / 4; g.beginPath(); g.moveTo(x, py(y0 + 2.28)); g.lineTo(x, py(y0 + 1.02)); g.stroke(); }
    }
  }, { repeat: true });
}

const TEXTURES = {
  ...KTEX,
  courtWin: courtWindowTexture,
  courtFace: courtFaceTexture,
  notice: () => canvas(256, 160, (g) => {
    g.fillStyle = '#a77b4f'; g.fillRect(0, 0, 256, 160);
    g.fillStyle = '#c69c6d'; g.fillRect(8, 8, 240, 144);
    const r = rng(5);
    for (let i = 0; i < 9; i++) {
      const x = 14 + (i % 3) * 78 + r() * 8; const yy = 14 + Math.floor(i / 3) * 46 + r() * 6;
      g.fillStyle = ['#ffffff', '#fff6c8', '#d8ecff', '#ffd9d9'][i % 4]; g.fillRect(x, yy, 62, 38);
      g.fillStyle = '#8b8b8b'; for (let l = 0; l < 4; l++) g.fillRect(x + 6, yy + 8 + l * 7, 50 - r() * 18, 2);
      g.fillStyle = ['#d22', '#2a2', '#22d'][i % 3]; g.beginPath(); g.arc(x + 31, yy + 3, 3, 0, 7); g.fill();
    }
  }),
  tvOn: () => canvas(512, 288, (g) => {
    g.fillStyle = '#2f7d34'; g.fillRect(0, 0, 512, 288);
    g.fillStyle = '#3d9142'; g.beginPath(); g.ellipse(256, 160, 230, 120, 0, 0, 7); g.fill();
    g.fillStyle = '#c9b17d'; g.fillRect(236, 90, 40, 140);
    g.fillStyle = '#fff'; g.fillRect(232, 96, 48, 3); g.fillRect(232, 220, 48, 3);
    const r = rng(9);
    for (let i = 0; i < 9; i++) { g.fillStyle = i < 2 ? '#2155c9' : '#f2f2f2'; g.beginPath(); g.arc(60 + r() * 390, 70 + r() * 170, 7, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(10,20,60,0.85)'; g.fillRect(0, 248, 512, 40);
    g.fillStyle = '#fff'; g.font = 'bold 22px system-ui'; g.fillText('HOME 182/4 (18.2)   CRR 9.91   need 27 off 10', 14, 276);
  }),
  tvOff: () => canvas(64, 36, (g) => { g.fillStyle = '#0d0f12'; g.fillRect(0, 0, 64, 36); g.fillStyle = '#1b1f26'; g.fillRect(6, 4, 30, 6); }),
  vending: () => canvas(256, 512, (g) => {
    g.fillStyle = '#1f4fa3'; g.fillRect(0, 0, 256, 512);
    g.fillStyle = '#d9e6f5'; g.fillRect(14, 30, 160, 360);
    const cols = ['#e53935', '#fdd835', '#43a047', '#8e24aa', '#fb8c00', '#00acc1', '#6d4c41'];
    for (let row = 0; row < 6; row++) {
      g.fillStyle = '#9aa7b6'; g.fillRect(14, 82 + row * 58, 160, 4);
      for (let k = 0; k < 4; k++) { g.fillStyle = cols[(row * 3 + k) % cols.length]; g.fillRect(22 + k * 38, 44 + row * 58, 28, 36); }
    }
    g.fillStyle = '#0d1b2a'; g.fillRect(188, 40, 56, 40);
    g.fillStyle = '#7fffd4'; g.font = '14px monospace'; g.fillText('UPI', 200, 66);
    g.fillStyle = '#c7d0db'; for (let i = 0; i < 12; i++) g.fillRect(192 + (i % 3) * 17, 100 + Math.floor(i / 3) * 20, 12, 14);
    g.fillStyle = '#0b0b0b'; g.fillRect(30, 420, 140, 56);
    g.fillStyle = '#fff'; g.font = 'bold 26px system-ui'; g.fillText('SNACKS', 40, 24);
  }),
  whiteboard: () => canvas(256, 160, (g) => {
    g.fillStyle = '#b8bcc2'; g.fillRect(0, 0, 256, 160); g.fillStyle = '#fbfbf8'; g.fillRect(6, 6, 244, 148);
    g.strokeStyle = '#1d4fa8'; g.lineWidth = 2; g.font = '18px "Comic Sans MS", system-ui'; g.fillStyle = '#1d4fa8';
    g.fillText('∫ x e^x dx = e^x(x−1)', 16, 36); g.fillText('F = ma   v² = u² + 2as', 16, 66);
    g.fillStyle = '#c62828'; g.fillText('Midsem: wk 10 !!', 16, 100); g.fillText('TODO: lab report', 16, 130);
  }),
  posterCode: () => canvas(160, 224, (g) => {
    g.fillStyle = '#111827'; g.fillRect(0, 0, 160, 224); g.fillStyle = '#34d399'; g.font = 'bold 18px monospace';
    ['while (alive) {', '  eat();', '  code();', '  sleep();', '}'].forEach((l, i) => g.fillText(l, 12, 50 + i * 30));
  }),
  posterSpace: () => canvas(160, 224, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 224); gr.addColorStop(0, '#0b1d3a'); gr.addColorStop(1, '#4a2a6a'); g.fillStyle = gr; g.fillRect(0, 0, 160, 224);
    const r = rng(3); g.fillStyle = '#fff'; for (let i = 0; i < 60; i++) g.fillRect(r() * 160, r() * 224, 2, 2);
    g.fillStyle = '#e8a33b'; g.beginPath(); g.arc(80, 120, 42, 0, 7); g.fill();
    g.strokeStyle = '#f4d58d'; g.lineWidth = 4; g.beginPath(); g.ellipse(80, 120, 70, 16, -0.3, 0, 7); g.stroke();
    g.fillStyle = '#fff'; g.font = 'bold 20px system-ui'; g.fillText('EXPLORE', 36, 210);
  }),
  posterFest: () => canvas(160, 224, (g) => {
    g.fillStyle = '#f5d142'; g.fillRect(0, 0, 160, 224);
    const cs = ['#e63946', '#1d3557', '#2a9d8f', '#f4a261'];
    for (let i = 0; i < 8; i++) { g.fillStyle = cs[i % 4]; g.beginPath(); g.arc(20 + (i % 4) * 40, 40 + Math.floor(i / 4) * 40, 16, 0, 7); g.fill(); }
    g.fillStyle = '#1d3557'; g.font = 'bold 30px system-ui'; g.fillText('OASIS', 30, 160); g.font = '14px system-ui'; g.fillText('cultural fest', 38, 186);
  }),
  curtain: () => canvas(128, 256, (g) => {
    g.fillStyle = '#7d1f2b'; g.fillRect(0, 0, 128, 256); g.fillStyle = '#f1e6e6';
    for (let yy = 8; yy < 256; yy += 32) for (let x = 8 + ((yy / 32) % 2) * 16; x < 128; x += 32) { g.fillRect(x, yy, 10, 10); g.fillRect(x + 3, yy - 4, 4, 18); }
    g.fillStyle = 'rgba(0,0,0,0.12)'; for (let x = 0; x < 128; x += 16) g.fillRect(x, 0, 6, 256);
  }),
  sheetBlue: () => canvas(128, 128, (g) => { g.fillStyle = '#2f5d8a'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#9cc3e6'; g.lineWidth = 3; for (let i = 0; i < 128; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); } }, { repeat: true }),
  sheetFloral: () => canvas(128, 128, (g) => { g.fillStyle = '#d9576b'; g.fillRect(0, 0, 128, 128); const r = rng(4); for (let i = 0; i < 22; i++) { g.fillStyle = ['#f7d6a0', '#fff', '#7dbb7a'][i % 3]; g.beginPath(); g.arc(r() * 128, r() * 128, 6, 0, 7); g.fill(); } }, { repeat: true }),
  sheetTeal: () => canvas(128, 128, (g) => { g.fillStyle = '#167a7a'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#f2c14e'; for (let i = 0; i < 128; i += 32) for (let j = 0; j < 128; j += 32) g.fillRect(i + 8, j + 8, 12, 12); }, { repeat: true }),
  board: () => canvas(64, 64, (g) => { g.fillStyle = '#e7c48a'; g.fillRect(0, 0, 64, 64); g.strokeStyle = '#7a4a1d'; g.lineWidth = 3; g.strokeRect(4, 4, 56, 56); g.beginPath(); g.arc(32, 32, 9, 0, 7); g.stroke(); for (const [x, y] of [[6, 6], [58, 6], [6, 58], [58, 58]]) { g.fillStyle = '#222'; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); } }),
  chess: () => canvas(64, 64, (g) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? '#6b4a2e' : '#efe0c2'; g.fillRect(i * 8, j * 8, 8, 8); } }),
  ttTop: () => canvas(256, 140, (g) => { g.fillStyle = '#1f3f7a'; g.fillRect(0, 0, 256, 140); g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 4); g.fillRect(0, 136, 256, 4); g.fillRect(0, 0, 4, 140); g.fillRect(252, 0, 4, 140); g.fillRect(0, 68, 256, 2); }),
  geyser: () => canvas(64, 64, (g) => { g.fillStyle = '#f4f4f2'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#d32f2f'; g.fillRect(8, 40, 10, 6); g.fillStyle = '#1976d2'; g.fillRect(46, 40, 10, 6); g.fillStyle = '#888'; g.font = '10px sans-serif'; g.fillText('25 L', 22, 20); }),
  washer: () => canvas(64, 96, (g) => { g.fillStyle = '#f2f2f0'; g.fillRect(0, 0, 64, 96); g.fillStyle = '#c9ced4'; g.fillRect(0, 0, 64, 18); g.fillStyle = '#36454f'; g.beginPath(); g.arc(32, 56, 20, 0, 7); g.fill(); g.fillStyle = '#7fa3bf'; g.beginPath(); g.arc(32, 56, 14, 0, 7); g.fill(); }),
  electric: () => canvas(64, 96, (g) => { g.fillStyle = '#8d959c'; g.fillRect(0, 0, 64, 96); g.fillStyle = '#f2c94c'; g.beginPath(); g.moveTo(32, 20); g.lineTo(46, 46); g.lineTo(18, 46); g.closePath(); g.fill(); g.fillStyle = '#222'; g.font = 'bold 18px sans-serif'; g.fillText('!', 29, 43); g.fillStyle = '#333'; g.font = '9px sans-serif'; g.fillText('DB · 415 V', 8, 70); }),
  calendar: () => canvas(64, 80, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 80); g.fillStyle = '#d32f2f'; g.fillRect(0, 0, 64, 18); g.fillStyle = '#555'; for (let i = 0; i < 30; i++) g.fillRect(4 + (i % 7) * 8.4, 24 + Math.floor(i / 7) * 11, 5, 5); }),
};

// ---------- the courtyard Bhawans, one by one ----------
// research/buildings/hostels-krishna-gandhi.md, hostels-ram-budh.md and hostels-shankar-vyas-vk.md. Every one is
// cream outside with a projecting entrance block on the west face carrying its Devanagari name, salmon courtyard
// faces, lawns with trees, and square stair-head pavilions (mumties) on the roof.
//   deva: the name band. bay: 'loggia' (open first-floor loggia with paired columns, as at Krishna and Gandhi) or
//   'block' (a closed block with big windows over the arches, as at Shankar). arch: the bay's and the courtyard
//   arcade's arches, 'cusped' or 'round'. face: the outer face texture, per side (W, E, N, S). arcade: the courtyard
//   sides with an open arcade (the rest are salmon walls with barred windows). upper: the arcade's first floor.
//   at: where along the west face the entrance sits (a fraction of the length; default: the middle wing).
//   extendN: metres the building runs north of its OSM outline. vm: the middle wing (fraction of the length) when
//   OSM has one courtyard and the building has two. courts: what each courtyard holds.
const STYLE = {
  'Krishna Bhawan': { deva: 'कृष्ण भवन', bay: 'loggia', arch: 'cusped', face: { W: 'k', E: 'k', N: 'k', S: 'k' }, arcade: 'WENSMH', upper: 'colonnade' },
  // west-face bay with a loggia (drone, top and west-face crops), arched windows with dark scroll grilles, about
  // eight black tanks on the middle wing; a basketball court and a badminton court on the lawns (SWD)
  'Gandhi Bhawan': { deva: 'गांधी भवन', bay: 'loggia', arch: 'cusped', face: { W: 'scroll', E: 'scroll', N: 'scroll', S: 'scroll' }, arcade: 'WENSM', upper: 'grille', at: 0.62, tanks: 8, courts: ['basketball', 'badminton'] },
  // tall round-headed windows below, a rectangular one above each; arcade and gallery on the middle wing; the
  // west wing's inner face is salmon with plain windows; north court green, south court paved; a tall finned block
  'Ram Bhawan': { deva: 'राम भवन', bay: 'block', arch: 'round', face: { W: 'round', E: 'round', N: 'round', S: 'round' }, arcade: 'ENSM', upper: 'colonnade', courts: ['trees', 'paved'], tower: true },
  // the east outer face is an arcade with circular grilles under an open gallery; both courts are lawns with trees
  'Budh Bhawan': { deva: 'बुद्ध भवन', bay: 'block', arch: 'round', face: { W: 'round', E: 'budh', N: 'round', S: 'round' }, arcade: 'ENSM', upper: 'colonnade', tanks: 8, courts: ['trees', 'trees'] },
  // round-arched jaali openings below, small windows above, a maroon line under the parapet; the arcade is on the
  // middle wing's north face, the other courtyard faces are salmon with windows; a red forecourt with a planter
  'Shankar Bhawan': { deva: 'शंकर भवन', bay: 'block', arch: 'round', face: { W: 'jaali', E: 'jaali', N: 'jaali', S: 'jaali' }, arcade: 'M', upper: 'colonnade', maroon: true, forecourt: true, courts: ['volleyball', 'trees'] },
  // OSM stops about 35 m short: the north courtyard and north wing are missing (Esri imagery, drone)
  'Vyas Bhawan': { deva: 'व्यास भवन', bay: 'block', arch: 'round', face: { W: 'jaali', E: 'jaali', N: 'jaali', S: 'jaali' }, arcade: 'M', upper: 'colonnade', maroon: true, forecourt: true, extendN: 35, vm: 0.48, courts: ['tree', 'sandy'] },
  // two courtyards (OSM has one); the east wing is joined to Rana Pratap Bhawan, so nothing opens on that side
  'Vishwakarma Bhawan': { deva: 'विश्वकर्मा भवन', bay: 'block', arch: 'round', face: { W: 'jaali', E: 'jaali', N: 'jaali', S: 'jaali' }, arcade: 'M', upper: 'colonnade', maroon: true, forecourt: true, vm: 0.46, courts: ['sandy', 'trees'] },
};

// A courtyard Bhawan's corners as NW, NE, SE, SW (all of them are long north–south): the entrance side, A→D, is
// the west face, the one the research finds the entrance on (Gandhi, Shankar and Vyas on Krishna Marg and the
// west road; Ram, Budh and Vishwakarma already there).
function westOrder(o) {
  const byX = [...o].sort((p, q) => p[0] - q[0]);
  const [A, Dp] = byX.slice(0, 2).sort((p, q) => p[1] - q[1]);
  const [B, C] = byX.slice(2).sort((p, q) => p[1] - q[1]);
  return [A, B, C, Dp];
}

export class Hostel {
  // mine: your own Bhawan (your room, your bed). outer: the outline's four corners in the order to use, so
  // that the first side (A→D, the entrance side) is a long side facing a road; defaults to the OSM order.
  constructor(campus, b, { mine = false, outer = b.outer } = {}) {
    this.campus = campus;
    this.b = b;
    this.name = b.name;
    this.mine = mine;
    this.parts = new Map();
    this.customMats = {};
    this.doors = [];
    this.spaces = [];
    this.npcSpots = {};
    this.time = 0;
    this.lightOn = true;
    // the look and the per-Bhawan differences (STYLE); every courtyard Bhawan is built like Krishna outside
    this.style = STYLE[b.name] || null;
    this.heritage = !!this.style;
    if (this.heritage && !mine) {
      outer = westOrder(b.outer);
      // Vyas: run the outline north to where the building really ends (the data file keeps the OSM outline)
      const ext = this.style.extendN || 0;
      if (ext) {
        const [A, B, C, Dp] = outer;
        const d = [(Dp[0] - A[0]) + (C[0] - B[0]), (Dp[1] - A[1]) + (C[1] - B[1])]; const l = Math.hypot(...d);
        outer = [[A[0] - (d[0] / l) * ext, A[1] - (d[1] / l) * ext], [B[0] - (d[0] / l) * ext, B[1] - (d[1] / l) * ext], C, Dp];
      }
    }
    // Krishna's wings are as deep as in OSM (about 15.4 m): rooms on the outside, a corridor, a second row of rooms
    // and a verandah behind the courtyard arcade. The other Bhawans keep one row of rooms and a corridor.
    this.WD = mine ? KWD : WD;
    this.layout(b, outer);
    for (const [name, w] of [...Object.entries(this.wings), ...Object.entries(this.inner || {})]) {
      w.name = name;
      const o = w.map(0, 0); const a = w.map(1, 0); const c = w.map(0, 1);
      w.ds = [a[0] - o[0], a[1] - o[1]];
      w.dt = [c[0] - o[0], c[1] - o[1]];
    }
    // The entrance: on the west face, in the middle (Krishna), in line with the middle wing (Shankar, Vyas,
    // Vishwakarma, Ram, Budh), or where the research puts it (Gandhi)
    const Wg = this.wings.W;
    const want = this.mine || !this.twoCourts ? this.L / 2 : this.style?.at ? this.style.at * this.L : this.vm;
    this.ve = Wg.tb[0] + Math.round((want - Wg.tb[0]) / MOD) * MOD;
    this.legendItems = [];
    this.planSpaces();
    this.planCourtyards();
    // the roof opening over the main stair, so you can climb out onto the terrace
    const st = this.spaces.find((x) => x.type === 'stair' && x.roof);
    const t0 = st.t0;
    b.roofHoles = [[this.band(Wg, 0.84, t0), this.band(Wg, DEPTH, t0), this.band(Wg, DEPTH, t0 + MOD), this.band(Wg, 0.84, t0 + MOD)].map(([u, v]) => { const p = this.world(u, v); return [p.x, p.z]; })];
  }

  // The building's frame (O, eu, ev, W, L), its outline, courtyards and wings; also squares up b's outline.
  layout(b, outer) {
    // --- frame from the OSM outline (a four-sided quad), squared up ---
    const [A, B, C, Dp] = outer;
    let ev = [(Dp[0] - A[0]) + (C[0] - B[0]), (Dp[1] - A[1]) + (C[1] - B[1])];
    const el = Math.hypot(...ev); ev = [ev[0] / el, ev[1] / el];
    const eu = [ev[1], -ev[0]];
    this.eu = eu; this.ev = ev;
    this.angle = Math.atan2(ev[0], ev[1]);
    const proj = (p) => [(p[0] - A[0]) * eu[0] + (p[1] - A[1]) * eu[1], (p[0] - A[0]) * ev[0] + (p[1] - A[1]) * ev[1]];
    const [pa, pb, pc, pd] = [A, B, C, Dp].map(proj);
    const u0 = (pa[0] + pd[0]) / 2; const u1 = (pb[0] + pc[0]) / 2;
    const v0 = (pa[1] + pb[1]) / 2; const v1 = (pd[1] + pc[1]) / 2;
    this.O = [A[0] + u0 * eu[0] + v0 * ev[0], A[1] + u0 * eu[1] + v0 * ev[1]];
    this.W = u1 - u0; this.L = v1 - v0;
    // Two OSM courtyards: a middle wing sits between them. One courtyard: no middle wing.
    // Vyas and Vishwakarma have two courtyards and a middle wing too (imagery), though OSM traces one.
    this.twoCourts = b.holes.length >= 2 || !!this.style?.vm;
    const hv = b.holes.map((h) => h.map((p) => proj(p)[1] - v0)).sort((a, c) => Math.min(...a) - Math.min(...c));
    this.vm = b.holes.length >= 2 ? (Math.max(...hv[0]) + Math.min(...hv[1])) / 2 : this.twoCourts ? this.style.vm * this.L : this.L / 2;
    const { W, L, vm, WD } = this;
    this.mc0 = vm - WD / 2; this.mc1 = this.mc0 + COR;
    this.court = this.twoCourts ? [
      { u0: WD, u1: W - WD, v0: WD, v1: this.mc0 - SCREEN },
      { u0: WD, u1: W - WD, v0: vm + WD / 2, v1: L - WD },
    ] : [{ u0: WD, u1: W - WD, v0: WD, v1: L - WD }];
    const rect = (r) => [this.world(r.u0, r.v0), this.world(r.u1, r.v0), this.world(r.u1, r.v1), this.world(r.u0, r.v1)].map((p) => [p.x, p.z]);
    b.outer = rect({ u0: 0, u1: W, v0: 0, v1: L });
    b.holes = this.court.map(rect);
    this.outline = [[0, 0], [W, 0], [W, L], [0, L]];
    b.h = FLOORS * FH;
    b.hostel = this;

    // --- wings: band coordinates (s into the rooms, t along the corridor) to local (u, v) ---
    const mBand = this.mc1 + T;
    this.wings = {
      W: { map: (s, t) => [4.5 - s, t], depth: DEPTH, tw: [4.5, L - 4.5], tb: [4.75, L - 4.75] },
      E: { map: (s, t) => [W - 4.5 + s, t], depth: DEPTH, tw: [4.5, L - 4.5], tb: [4.75, L - 4.75] },
      N: { map: (s, t) => [t, 4.5 - s], depth: DEPTH, tw: [4.5, W - 4.5], tb: [4.75, W - 4.75] },
      S: { map: (s, t) => [t, L - 4.5 + s], depth: DEPTH, tw: [4.5, W - 4.5], tb: [4.75, W - 4.75] },
      M: { map: (s, t) => [t, mBand + s], depth: WD - COR - T - OUT, tw: [WD - SCREEN, W - WD + SCREEN], tb: [WD, W - WD] },
    };
    if (!this.twoCourts) delete this.wings.M;
    if (this.mine && this.twoCourts) this.krishnaBands();
  }

  // Krishna's second row of rooms, one band per side of each courtyard's verandah ring. The room fronts face the
  // verandah (s < 0, as in every band); the backs line the corridor ring (u or v = 7.55 … 7.8 from the outside).
  // The middle wing is two rows back to back: M (onto the first courtyard's verandah, which is the old M corridor)
  // and H (onto the second's). Single-letter names, like the wings: the room numbers and the guide use them.
  krishnaBands() {
    const { W, L, vm } = this;
    const c2 = this.court[1];
    const e = OUT + DEPTH + T + COR + T + DEPTH; // 12.0: from the outside face to the room side of a front wall
    this.n2a = c2.v0 - VER; this.n2b = c2.v0 - SCREEN; // the second courtyard's north verandah
    const mBand = this.mc1 + T;
    Object.assign(this.wings.M, { depth: vm - T / 2 - mBand, front: true });
    this.inner = {
      A: { map: (s, t) => [e - s, t], tw: [e, this.mc0], tb: [e + T, this.mc0 - T] },
      B: { map: (s, t) => [W - e + s, t], tw: [e, this.mc0], tb: [e + T, this.mc0 - T] },
      C: { map: (s, t) => [t, e - s], tw: [e, W - e], tb: [e + T, W - e - T] },
      D: { map: (s, t) => [e - s, t], tw: [this.n2b, L - e], tb: [this.n2b + T, L - e - T] },
      F: { map: (s, t) => [W - e + s, t], tw: [this.n2b, L - e], tb: [this.n2b + T, L - e - T] },
      G: { map: (s, t) => [t, L - e + s], tw: [e, W - e], tb: [e + T, W - e - T] },
      H: { map: (s, t) => [t, this.n2a - T - s], spine: true },
    };
    for (const w of Object.values(this.inner)) { w.depth = w.spine ? this.n2a - T - (vm + T / 2) : DEPTH; w.front = true; w.ring = !w.spine; }
    // M and H run the whole width, from corridor ring to corridor ring (their west and east ends are the junctions)
    const r0 = WD - SCREEN; // 7.55, the inner face of the corridor ring
    for (const w of [this.wings.M, this.inner.H]) { w.tw = [r0, W - r0]; w.tb = [r0 + T, W - r0 - T]; }
  }

  // ---------- coordinates ----------
  world(u, v, y = 0) {
    return new THREE.Vector3(this.O[0] + u * this.eu[0] + v * this.ev[0], y, this.O[1] + u * this.eu[1] + v * this.ev[1]);
  }

  local(x, z) {
    const dx = x - this.O[0]; const dz = z - this.O[1];
    return [dx * this.eu[0] + dz * this.eu[1], dx * this.ev[0] + dz * this.ev[1]];
  }

  band(w, s, t) { return w.map(s, t); }
  bandWorld(w, s, t, y = 0) { const [u, v] = w.map(s, t); return this.world(u, v, y); }

  // World yaw that faces along a band direction ('+s', '-s', '+t', '-t').
  yawOf(w, dir) {
    const d = { '+s': w.ds, '-s': [-w.ds[0], -w.ds[1]], '+t': w.dt, '-t': [-w.dt[0], -w.dt[1]] }[dir];
    const x = d[0] * this.eu[0] + d[1] * this.ev[0]; const z = d[0] * this.eu[1] + d[1] * this.ev[1];
    return Math.atan2(x, z);
  }

  // ---------- what goes where ----------
  // Shared spaces are placed around the entrance (t in metres along each corridor); every other stretch of
  // corridor is filled with student rooms about ROOM wide, which get locked doors and number plates.
  planSpaces() {
    const ve = this.ve;
    const add = (wing, k, t0, width, type, extra = {}) => this.spaces.push({ wing, k, t0, t1: t0 + width, type, ...extra });
    add('W', 0, ve - MOD, 2 * MOD, 'lobby');
    for (let k = 0; k < FLOORS; k++) add('W', k, ve + MOD, MOD, 'stair', { roof: true, top: FLOORS });
    for (let k = 0; k < FLOORS; k++) add('W', k, ve + 2 * MOD, 3 * MOD, 'wash');
    add('W', 0, ve + 5 * MOD, MOD, 'laundry');
    add('W', 0, ve - MOD - ROOM, ROOM, 'room', this.mine ? { variant: 'mine', id: 'hostelroom' } : { variant: 'double', id: 'room-double0' });
    add('W', 0, ve - MOD - 2 * ROOM, ROOM, 'room', { variant: 'study', id: 'room-study' });
    add('W', 0, ve - MOD - 2 * ROOM - 4 * MOD, 4 * MOD, 'common');
    add('W', 1, ve - MOD - ROOM, ROOM, 'room', { variant: 'double', id: 'room-double' });
    add('W', 1, ve - MOD - 2 * ROOM, ROOM, 'room', { variant: 'senior', id: 'room-senior' });
    const E = this.wings.E;
    if (E) for (let k = 0; k < FLOORS; k++) add('E', k, E.tb[1] - 3 * MOD, MOD, 'stair', { top: FLOORS - 1 });
    if (this.inner) this.planKrishna(add);
    else if (this.heritage) this.planCores(add);
    // fill the rest of every corridor with student rooms
    this.segs = {};
    this.fillSegs(this.wings, this.segs);
    if (this.inner) this.fillSegs(this.inner, (this.innerSegs = {}));
  }

  // Krishna: a stair core under each roof mumty seen in the drone view (near the courtyard corners and at both ends
  // of the middle wing, besides the main stair and the east stair), and cross passages from the corridor ring
  // through the inner rooms to the courtyard verandahs. The extra cores are 'core' spaces: stairs like the east one.
  planKrishna(add) {
    const { W } = this; const I = this.inner;
    for (let k = 0; k < FLOORS; k++) {
      add('A', k, I.A.tb[0] + 0.75, MOD, 'core', { top: FLOORS - 1, label: 'NW stairs' });
      add('C', k, I.C.tb[1] - MOD - 4.6, MOD, 'core', { top: FLOORS - 1, label: 'North stairs' });
      add('M', k, I.A.tb[0] + 4.0, MOD, 'core', { top: FLOORS - 1, label: 'Middle-wing stairs' });
      add('H', k, W - I.A.tb[0] - 4.0 - MOD, MOD, 'core', { top: FLOORS - 1, label: 'Middle-wing stairs' });
      add('G', k, I.G.tb[0] + 6.0, MOD, 'core', { top: FLOORS - 1, label: 'South stairs' });
      // passages: one off each side of each courtyard, each in line with an arch of the arcade (not a pier)
      const [c1, c2] = this.court;
      const arch = (a, b, want) => { const n = Math.max(1, Math.round((b - a) / MOD)); const bw = (b - a) / n; const j = Math.max(0, Math.min(n - 1, Math.round((want - a) / bw - 0.5))); return a + (j + 0.5) * bw - 1.6; };
      add('A', k, arch(c1.v0, c1.v1, this.ve - 30), 3.2, 'pass');
      add('B', k, arch(c1.v0, c1.v1, (I.B.tb[0] + I.B.tb[1]) / 2), 3.2, 'pass');
      add('C', k, arch(c1.u0, c1.u1, W / 2), 3.2, 'pass');
      add('D', k, arch(c2.v0, c2.v1, (I.D.tb[0] + I.D.tb[1]) / 2), 3.2, 'pass');
      add('F', k, arch(c2.v0, c2.v1, (I.F.tb[0] + I.F.tb[1]) / 2), 3.2, 'pass');
      add('G', k, arch(c2.u0, c2.u1, W / 2), 3.2, 'pass');
    }
  }

  // The other Bhawans: a stair core under each roof pavilion the drone views show, at the corners and at both
  // ends of the middle wing (research: about six per Bhawan), besides the main stair and the east stair.
  planCores(add) {
    const { N, S, M } = this.wings;
    for (let k = 0; k < FLOORS; k++) {
      add('N', k, N.tb[0], MOD, 'core', { top: FLOORS - 1, label: 'NW stairs' });
      add('N', k, N.tb[1] - MOD, MOD, 'core', { top: FLOORS - 1, label: 'NE stairs' });
      add('S', k, S.tb[0], MOD, 'core', { top: FLOORS - 1, label: 'SW stairs' });
      if (M) {
        add('M', k, M.tb[0], MOD, 'core', { top: FLOORS - 1, label: 'Middle-wing stairs' });
        add('M', k, M.tb[1] - MOD, MOD, 'core', { top: FLOORS - 1, label: 'Middle-wing stairs' });
      }
    }
  }

  // Fill every stretch of corridor wall between the spaces with student rooms about ROOM wide.
  fillSegs(wings, out) {
    for (const w of Object.values(wings)) {
      for (let k = 0; k < FLOORS; k++) {
        const own = this.spaces.filter((x) => x.wing === w.name && x.k === k).sort((x, y) => x.t0 - y.t0);
        const list = [];
        let t = w.tb[0];
        for (const x of [...own, { t0: w.tb[1], t1: w.tb[1], end: true }]) {
          const gap = x.t0 - t;
          if (gap > 3) {
            const n = Math.max(1, Math.round(gap / ROOM));
            for (let j = 0; j < n; j++) list.push({ wing: w.name, k, t0: t + (gap * j) / n, t1: t + (gap * (j + 1)) / n, type: 'locked' });
          }
          if (!x.end) list.push(x);
          t = Math.max(t, x.t1);
        }
        out[`${w.name}${k}`] = list;
      }
    }
  }

  // The rooms and spaces along a band on one floor.
  allBands() { return [...Object.values(this.wings), ...Object.values(this.inner || {})]; }
  segsOf(w, k) { return (this.inner?.[w.name] ? this.innerSegs : this.segs)[`${w.name}${k}`]; }
  bandOf(name) { return this.wings[name] || this.inner?.[name]; }

  // Cricket in the first courtyard, football (and the basketball hoop) in the second. Both are bare concrete.
  // A Bhawan with one courtyard plays football in it.
  planCourtyards() {
    const c1 = this.court[0]; const c2 = this.court.at(-1);
    this.cricket = this.twoCourts ? { u: (c1.u0 + c1.u1) / 2, v: (c1.v0 + c1.v1) / 2 } : null;
    this.football = { u: (c2.u0 + c2.u1) / 2, v: (c2.v0 + c2.v1) / 2 };
  }

  // Something worth finding, for the Bhawan guide: floors it is on, and where (local u, v).
  legend(icon, name, floors, u, v) { this.legendItems.push({ icon, name, floors, u, v }); }
  legendBand(icon, name, floors, w, s, t) { const [u, v] = w.map(s, t); this.legend(icon, name, floors, u, v); }

  // A space's footprint in the local frame (for the guide's floor plan).
  spaceRect(sp) {
    const w = this.bandOf(sp.wing); const a = w.map(0, sp.t0); const c = w.map(w.depth, sp.t1);
    return { u0: Math.min(a[0], c[0]), u1: Math.max(a[0], c[0]), v0: Math.min(a[1], c[1]), v1: Math.max(a[1], c[1]) };
  }

  // ---------- geometry helpers (local frame) ----------
  geo(key, g) {
    const parts = this.layer || this.parts;
    const geom = g.index ? g.toNonIndexed() : g;
    if (plain(key)) { paint(geom, key.slice(2)); key = VC; }
    if (!parts.has(key)) parts.set(key, []);
    parts.get(key).push(geom);
  }

  // Geometry built inside fn goes to the shell: what you can see from outside (arches, courtyards, roof).
  onShell(fn) {
    this.layer = this.shellParts;
    fn();
    this.layer = null;
  }

  // Axis-aligned box in the local frame; collide pushes world AABB pieces.
  box(u0, u1, v0, v1, y0, y1, key, { collide = true, walkable = false } = {}) {
    if (u1 < u0) [u0, u1] = [u1, u0];
    if (v1 < v0) [v0, v1] = [v1, v0];
    // anything built up from below to the roof level stops just under the roof's surface, or its top z-fights with
    // the roof (salmon stripes along the roof in the aerial view)
    const R = FLOORS * FH;
    if (y0 < R - 0.1 && y1 > R - 0.03 && y1 < R + 0.01) y1 = R - 0.03;
    const w = u1 - u0; const d = v1 - v0; const h = y1 - y0;
    if (w <= 0 || d <= 0 || h <= 0) return;
    const tex = key.startsWith('t:') ? key.split(':')[1] : null;
    const g = tex ? worldBoxGeometry(w, h, d, TEX_SIZE[tex] || 2) : new THREE.BoxGeometry(w, h, d);
    g.translate((u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2);
    this.geo(key, g);
    if (collide) this.col(u0, u1, v0, v1, y0, y1, walkable);
  }

  // Box in band coordinates.
  bbox(w, s0, s1, t0, t1, y0, y1, key, opts) {
    const a = w.map(s0, t0); const c = w.map(s1, t1);
    this.box(a[0], c[0], a[1], c[1], y0, y1, key, opts);
  }

  col(u0, u1, v0, v1, y0, y1, walkable = false, list = this.campus.colliders) {
    if (u1 < u0) [u0, u1] = [u1, u0];
    if (v1 < v0) [v0, v1] = [v1, v0];
    const along = u1 - u0 > v1 - v0 ? 'u' : 'v';
    const len = along === 'u' ? u1 - u0 : v1 - v0;
    const n = Math.max(1, Math.ceil(len / (walkable ? FLOOR_CHUNK : CHUNK)));
    // floors are split across as well, so a wide slab's box doesn't spill over a stair opening
    const wid = along === 'u' ? v1 - v0 : u1 - u0;
    const m = walkable ? Math.max(1, Math.ceil(wid / FLOOR_CHUNK)) : 1;
    const out = [];
    for (let i = 0; i < n * m; i++) {
      const a0 = (along === 'u' ? u0 : v0) + (len * (i % n)) / n; const a1 = a0 + len / n;
      const b0 = (along === 'u' ? v0 : u0) + (wid * Math.floor(i / n)) / m; const b1 = b0 + wid / m;
      const [pu0, pu1, pv0, pv1] = along === 'u' ? [a0, a1, b0, b1] : [b0, b1, a0, a1];
      const ps = [this.world(pu0, pv0), this.world(pu1, pv0), this.world(pu1, pv1), this.world(pu0, pv1)];
      const c = { minX: Math.min(...ps.map((p) => p.x)), maxX: Math.max(...ps.map((p) => p.x)), minZ: Math.min(...ps.map((p) => p.z)), maxZ: Math.max(...ps.map((p) => p.z)), minY: y0, maxY: y1, walkable, enabled: true, hostel: true };
      list.push(c);
      out.push(c);
    }
    return out;
  }

  bcol(w, s0, s1, t0, t1, y0, y1, walkable = false) {
    const a = w.map(s0, t0); const c = w.map(s1, t1);
    return this.col(a[0], c[0], a[1], c[1], y0, y1, walkable);
  }

  // Vertical quad facing `dir` in band coordinates, centred at (s, t), bottom at y.
  // Text and pictures read correctly from the front; flip: 'auto' instead mirrors the texture so its +x runs
  // towards +t (the locked-door texture uses this to line its door up with the number plate).
  bquad(w, s, t, y, width, height, dir, key, { flip = false, uv = [0, 0, 1, 1] } = {}) {
    const d = { '+s': w.ds, '-s': [-w.ds[0], -w.ds[1]], '+t': w.dt, '-t': [-w.dt[0], -w.dt[1]] }[dir];
    const g = new THREE.PlaneGeometry(width, height);
    // the plane's +x runs along (nv, -nu); flip the texture so its +x always runs towards +t (or +s)
    const xAxis = [d[1], -d[0]];
    const along = dir.endsWith('s') ? w.dt : w.ds;
    const reversed = flip === 'auto' ? xAxis[0] * along[0] + xAxis[1] * along[1] < 0 : flip;
    const a = g.attributes.uv;
    for (let i = 0; i < a.count; i++) {
      let x = a.getX(i); const yy = a.getY(i);
      if (reversed) x = 1 - x;
      a.setXY(i, uv[0] + x * (uv[2] - uv[0]), uv[1] + yy * (uv[3] - uv[1]));
    }
    g.rotateY(Math.atan2(d[0], d[1]));
    const [u, v] = w.map(s, t);
    g.translate(u, y + height / 2, v);
    this.geo(key, g);
  }

  // Horizontal quad (table tops, sheets, boards): sd metres along s, td along t.
  flat(w, s, t, y, sd, td, key) {
    const g = new THREE.PlaneGeometry(sd, td);
    g.rotateX(-Math.PI / 2);
    g.rotateY(Math.atan2(-w.ds[1], w.ds[0])); // plane x → the band's s direction
    const [u, v] = w.map(s, t);
    g.translate(u, y, v);
    this.geo(key, g);
  }

  cyl(u, y, v, r, h, key, seg = 12, rTop = r) {
    const g = new THREE.CylinderGeometry(rTop, r, h, seg);
    g.translate(u, y + h / 2, v);
    this.geo(key, g);
  }

  bcyl(w, s, t, y, r, h, key, seg, rTop) { const [u, v] = w.map(s, t); this.cyl(u, y, v, r, h, key, seg, rTop); }

  material(key) {
    if (this.customMats[key]) return this.customMats[key];
    if (key !== 'x:tvOn' && sharedMats.has(key)) return (this.customMats[key] = sharedMats.get(key));
    let m;
    if (key.startsWith('t:')) { const [, tex, tint = '#ffffff'] = key.split(':'); m = texturedMaterial(tex, { tint }); }
    else if (key.startsWith('m:')) m = mat(key.slice(2), { metalness: 0.6, roughness: 0.35 });
    else if (key.startsWith('e:')) m = mat(key.slice(2), { emissive: key.slice(2) });
    else if (key.startsWith('g:')) m = new THREE.MeshStandardMaterial({ color: key.slice(2), roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.55 });
    else if (key.startsWith('x:')) {
      const name = key.slice(2);
      const tex = name === 'bay' ? bayTexture() : name === 'bayK' ? bayTexture('k') : name === 'bayVer' ? bayTexture('ver') : name === 'bayPink' ? bayTexture('pink') : name === 'arch' ? archTexture(false) : name === 'rarch' ? archTexture(false, true) : name === 'grille' ? archTexture(true) : name === 'plates' ? this.plates.tex : name === 'platesK' ? this.platesK.tex
        : name.startsWith('fac:') ? facadeTexture(name.slice(4)) : name.startsWith('front:') ? frontTexture(STYLE[name.slice(6)]) : TEXTURES[name]();
      const cut = name === 'arch' || name === 'rarch' || name === 'grille' || name === 'courtWin' || name.startsWith('front:') || CUT.has(name);
      m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, side: cut ? THREE.DoubleSide : THREE.FrontSide, alphaTest: cut ? 0.5 : 0 });
    } else if (key.startsWith('facade:')) m = this.campus.material(key);
    else if (key === VC) m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 });
    else m = mat(key.replace(/^c:/, ''));
    // the courtyard concrete (or lawn) lies 3.5 cm over the ground: keep it in front at a distance
    if (GROUND.has(key)) Object.assign(m, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
    this.customMats[key] = m;
    if (key !== 'x:tvOn') sharedMats.set(key, m);
    return m;
  }

  flush() {
    for (const [key, list] of this.parts) {
      const g = mergeGeometries(list);
      if (!g) continue;
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, this.material(key));
      mesh.receiveShadow = true;
      mesh.castShadow = castsShadow(key);
      this.g.add(mesh);
    }
    this.parts.clear();
    // the shell goes into mergeShells with every other Bhawan's, so bake this Bhawan's placement into it
    const m = new THREE.Matrix4().makeRotationY(this.angle).setPosition(this.O[0], 0, this.O[1]);
    this.shellOut = new Map();
    for (const [key, list] of this.shellParts) this.shellOut.set(key, list.map((g) => g.applyMatrix4(m)));
    this.shellParts.clear();
  }

  fan(w, s, t, y) {
    const [u, v] = w.map(s, t);
    const grp = new THREE.Group();
    grp.position.set(u, y - 0.05, v);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 6), mat('#e8e4dc'));
    rod.position.y = -0.22;
    grp.add(rod);
    const rotor = new THREE.Group();
    rotor.position.y = -0.47;
    rotor.add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.12, 14), mat('#e8e4dc', { metalness: 0.3, roughness: 0.4 })));
    for (let i = 0; i < 3; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.015, 0.13), mat('#d9d4ca'));
      blade.position.set(Math.cos((i / 3) * Math.PI * 2) * 0.42, 0, Math.sin((i / 3) * Math.PI * 2) * 0.42);
      blade.rotation.y = -(i / 3) * Math.PI * 2;
      rotor.add(blade);
    }
    grp.add(rotor);
    this.g.add(grp);
    this.campus.fans.push(rotor);
  }

  tube(w, s, t, y, alongT = true) {
    if (alongT) this.bbox(w, s - 0.04, s + 0.04, t - 0.6, t + 0.6, y - 0.06, y, 'e:#fffaf0', { collide: false });
    else this.bbox(w, s - 0.6, s + 0.6, t - 0.04, t + 0.04, y - 0.06, y, 'e:#fffaf0', { collide: false });
  }

  interact(id, w, s, t, k, label, radius = 1.6, yOff = 1.2) {
    const p = this.bandWorld(w, s, t);
    return this.campus.interactable(id, p.x, p.z, label, { radius, y: k * FH + yOff });
  }

  label(text, w, s, t, y, opts = { height: 0.34 }) {
    const p = this.bandWorld(w, s, t);
    return this.campus.label(text, p.x, y, p.z, opts);
  }

  // ---------- build ----------
  build() {
    const c = this.campus;
    // g: the interior, drawn only near the Bhawan; the shell (everything visible from outside) is merged
    // with the other Bhawans' (mergeShells)
    this.shellParts = new Map();
    this.g = new THREE.Group();
    this.g.position.set(this.O[0], 0, this.O[1]);
    this.g.rotation.y = this.angle;
    c.root.add(this.g);
    // room numbers, wing by wing, floor by floor (4 digits, like the plates in the walkthrough)
    const numbers = [];
    for (let k = 0; k < FLOORS; k++) {
      let n = 1;
      for (const w of this.allBands()) {
        for (const x of this.segsOf(w, k)) {
          if (x.type !== 'room' && x.type !== 'locked') continue;
          x.number = (k + 1) * 1000 + n++;
          numbers.push(x.number);
        }
      }
    }
    this.plates = plates();
    if (this.mine) this.platesK = plates('k');
    if (numbers.some((n) => n % 1000 > PLATES_PER_FLOOR)) throw new Error(`${this.name}: more rooms than room plates`);
    this.entranceCut();
    for (let k = 0; k < FLOORS; k++) for (const w of this.allBands()) this.buildBandWall(w, k);
    this.buildCorridors();
    if (this.inner) this.buildRing();
    this.onShell(() => { this.buildScreens(); this.buildRoof(); });
    for (const sp of this.spaces) this[`space_${sp.type}`](sp);
    this.onShell(() => { this.buildCourtyards(); this.buildOutside(); if (this.heritage) { this.buildFacade(); this.buildEntranceBay(); this.buildMumties(); this.buildRoofExtras(); } });
    this.flush();
  }

  // Opening in the west facade for the entrance (the facade itself is built with the other buildings).
  entranceCut() {
    const cuts = this.campus.hostCuts;
    if (!cuts.has(this.b)) cuts.set(this.b, []);
    const ps = [this.world(-1.2, this.ve - 1.5), this.world(0.8, this.ve - 1.5), this.world(0.8, this.ve + 1.5), this.world(-1.2, this.ve + 1.5)];
    cuts.get(this.b).push({ minX: Math.min(...ps.map((p) => p.x)), maxX: Math.max(...ps.map((p) => p.x)), minZ: Math.min(...ps.map((p) => p.z)), maxZ: Math.max(...ps.map((p) => p.z)) });
    // Krishna: outside means in front of the projecting entrance bay and its steps
    const out = this.world(this.heritage ? -4.8 : -2.2, this.ve);
    const inside = this.world(1.6, this.ve);
    this.entrance = { out, inside, yaw: Math.atan2(this.eu[0], this.eu[1]) };
  }

  // The corridor wall of a wing on one floor: locked doors (texture + number plate), with openings
  // where a space opens onto the corridor.
  buildBandWall(w, k) {
    const y0 = k * FH; const y1 = y0 + FH - SLAB;
    const open = [];
    // Krishna: green double-leaf doors with red stencilled numbers; salmon room fronts along the verandahs
    // the others: salmon room fronts where the corridor is an open arcade, cream behind the windowed walls
    const pink = this.mine ? w.front : this.heritage && this.style.arcade.includes(w.name);
    const bay = this.mine ? (w.front ? 'x:bayVer' : 'x:bayK') : pink ? 'x:bayPink' : 'x:bay';
    const wall = pink ? 't:plaster:#e9b29a' : 't:plaster:#f1ede4';
    const plate = this.mine ? 'x:platesK' : 'x:plates';
    for (const sp of this.segsOf(w, k)) {
      const st = sp.t0;
      if (sp.type === 'locked') {
        this.bquad(w, -T - 0.012, (sp.t0 + sp.t1) / 2, y0, sp.t1 - sp.t0, FH - SLAB, '-s', bay, { flip: 'auto' });
        this.bquad(w, -T - 0.02, st + 0.8, y0 + 2.18, 0.32, 0.12, '-s', plate, { uv: this.plates.uv.get(sp.number) });
        continue;
      }
      if (sp.type === 'lobby' || sp.type === 'stair' || sp.type === 'core' || sp.type === 'pass') open.push([st + 0.15, sp.t1 - 0.15]);
      else if (sp.type === 'common') open.push([st + 5.4, st + 8.2]);
      else if (sp.type === 'wash') open.push([st + 0.35, st + 1.5]);
      else open.push([st + 0.3, st + 1.3]);
      if (sp.type === 'room') this.bquad(w, -T - 0.02, st + 0.8, y0 + 2.18, 0.32, 0.12, '-s', plate, { uv: this.plates.uv.get(sp.number) });
    }
    // wall pieces between openings, lintels over them (Krishna's run up to the slab above, so no gap shows)
    const top = this.heritage ? y0 + FH : y1;
    let t = w.tw[0];
    for (const [a, b] of [...open, [w.tw[1], w.tw[1]]]) {
      if (a > t) this.bbox(w, -T, 0, t, a, y0, top, wall);
      if (b > a) this.bbox(w, -T, 0, a, b, y0 + 2.25, top, wall, { collide: false });
      t = Math.max(t, b);
    }
    // dado band on the corridor side
    this.bbox(w, -T - 0.01, -T, w.tw[0], w.tw[1], y0, y0 + 0.02, 'c:#c9b48c', { collide: false });
  }

  // Corridor floors, ceilings and lights for all floors.
  corridorRects() {
    const { W, L } = this;
    return [
      { u0: 4.75, u1: 7.55, v0: 4.75, v1: L - 4.75, w: 'W' },
      { u0: W - 7.55, u1: W - 4.75, v0: 4.75, v1: L - 4.75, w: 'E' },
      { u0: 7.55, u1: W - 7.55, v0: 4.75, v1: 7.55, w: 'N' },
      { u0: 7.55, u1: W - 7.55, v0: L - 7.55, v1: L - 4.75, w: 'S' },
      { u0: 7.55, u1: W - 7.55, v0: this.mc0, v1: this.mc1, w: 'M' },
      ...this.verandahRects(),
    ].filter((r) => this.wings[r.w]);
  }

  // Krishna's verandahs round the courtyards, behind the arcade (the first courtyard's south one is the M corridor;
  // the second's north one runs the whole width too, out to the corridor ring at both ends).
  verandahRects() {
    if (!this.inner) return [];
    const { W, L } = this; const [c1, c2] = this.court;
    const a = c1.u0 - VER; const b = c1.u0 - SCREEN; // 12.25 … 15.05 from the west face
    return [
      { u0: a, u1: b, v0: c1.v0 - VER, v1: this.mc0, w: 'W' }, { u0: W - b, u1: W - a, v0: c1.v0 - VER, v1: this.mc0, w: 'E' },
      { u0: b, u1: W - b, v0: c1.v0 - VER, v1: c1.v0 - SCREEN, w: 'N' },
      { u0: 7.55, u1: W - 7.55, v0: this.n2a, v1: this.n2b, w: 'M' },
      { u0: a, u1: b, v0: this.n2b, v1: L - a, w: 'W' }, { u0: W - b, u1: W - a, v0: this.n2b, v1: L - a, w: 'E' },
      { u0: b, u1: W - b, v0: c2.v1 + SCREEN, v1: L - a, w: 'S' },
    ];
  }

  // Krishna: the inner face of the corridor ring (the backs of the inner rooms), open where the passages and the
  // middle-wing verandahs come through, and the ends of the inner rows where they meet those verandahs.
  buildRing() {
    const { W, L } = this; const r0 = WD - SCREEN; const r1 = r0 + T;
    const gaps = { u: [[this.mc0, this.mc1], [this.n2a, this.n2b]], U: [[this.mc0, this.mc1], [this.n2a, this.n2b]], v: [], V: [] };
    for (const sp of this.spaces) if (sp.type === 'pass' && sp.k === 0) gaps[{ A: 'u', D: 'u', B: 'U', F: 'U', C: 'v', G: 'V' }[sp.wing]].push([sp.t0, sp.t1]);
    const run = (side, a0, a1, y0, y1) => {
      const list = gaps[side].slice().sort((p, q) => p[0] - q[0]);
      let t = a0;
      for (const [g0, g1] of [...list, [a1, a1]]) {
        for (let x = t; x < g0 - 0.01; x += 20) {
          const x1 = Math.min(g0, x + 20);
          if (side === 'u') this.box(r0, r1, x, x1, y0, y1, 't:plaster:#f1ede4');
          if (side === 'U') this.box(W - r1, W - r0, x, x1, y0, y1, 't:plaster:#f1ede4');
          if (side === 'v') this.box(x, x1, r0, r1, y0, y1, 't:plaster:#f1ede4');
          if (side === 'V') this.box(x, x1, L - r1, L - r0, y0, y1, 't:plaster:#f1ede4');
        }
        t = Math.max(t, g1);
      }
    };
    for (let k = 0; k < FLOORS; k++) {
      const y0 = k * FH; const y1 = y0 + FH;
      run('u', r0, L - r0, y0, y1); run('U', r0, L - r0, y0, y1);
      run('v', r1, W - r1, y0, y1); run('V', r1, W - r1, y0, y1);
      // the inner rows end beside the middle wing's verandahs
      const e = this.inner.A.tw[0];
      for (const [u0, u1] of [[r1, e], [W - e, W - r1]]) {
        this.box(u0, u1, this.mc0 - T, this.mc0, y0, y1, 't:plaster:#e9b29a');
        this.box(u0, u1, this.n2b, this.n2b + T, y0, y1, 't:plaster:#e9b29a');
      }
      // dado along the corridor side
      this.box(r0 - 0.01, r0, r0, L - r0, y0, y0 + 0.02, 'c:#c9b48c', { collide: false });
    }
  }

  buildCorridors() {
    for (const r of this.corridorRects()) {
      for (let k = 0; k < FLOORS; k++) {
        const y = k * FH;
        // Krishna: grey kota stone (2006 photo of the first-floor corridor)
        const fl = this.heritage ? KOTA : 't:terrazzo:#d9dad6';
        if (k === 0) this.box(r.u0, r.u1, r.v0, r.v1, 0, 0.03, fl, { collide: false });
        else this.box(r.u0, r.u1, r.v0, r.v1, y - SLAB, y, fl, { walkable: true });
        // ceiling (the next slab's underside; the top floor's is under the roof)
        if (k === FLOORS - 1) this.box(r.u0, r.u1, r.v0, r.v1, FLOORS * FH - SLAB - 0.05, FLOORS * FH - 0.05, 't:concrete:#f4f2ec', { walkable: true });
        // tube lights down the middle
        const alongV = r.v1 - r.v0 > r.u1 - r.u0;
        const len = alongV ? r.v1 - r.v0 : r.u1 - r.u0;
        for (let x = 3; x < len - 1; x += 6.8) {
          const cu = alongV ? (r.u0 + r.u1) / 2 : r.u0 + x; const cv = alongV ? r.v0 + x : (r.v0 + r.v1) / 2;
          this.box(cu - (alongV ? 0.04 : 0.6), cu + (alongV ? 0.04 : 0.6), cv - (alongV ? 0.6 : 0.04), cv + (alongV ? 0.6 : 0.04), y + FH - SLAB - 0.07, y + FH - SLAB - 0.01, 'e:#fffaf0', { collide: false });
        }
      }
    }
    // fire extinguishers and dustbins along the west corridor (the busy one)
    const Wg = this.wings.W;
    for (let k = 0; k < FLOORS; k++) {
      const segs = this.segs[`W${k}`];
      for (let j = 3; j < segs.length; j += 6) {
        if (segs[j].type !== 'locked') continue;
        const t = segs[j].t0 + 0.1;
        this.bcyl(Wg, -T - 0.12, t, k * FH + 0.9, 0.08, 0.5, 'c:#c62828', 10);
        this.bcyl(Wg, -T - 0.12, t, k * FH + 1.4, 0.03, 0.08, 'c:#222222', 6);
      }
      const tw = this.ve + 2 * MOD + 3.1; // just past the washroom door and the water cooler
      this.bcyl(Wg, -T - 0.25, tw, k * FH, 0.2, 0.6, 'c:#2e7d32', 12, 0.24);
      this.bcol(Wg, -T - 0.45, -T - 0.05, tw - 0.2, tw + 0.2, k * FH, k * FH + 0.6);
    }
  }

  // The courtyard side: cusped arches on piers, open on the ground floor, grilles above.
  buildScreens() {
    const { W, L, mc0, mc1, vm, WD } = this;
    // [fixed axis, value (screen centre line), from, to, wall?]
    // [fixed axis, value (screen centre line), from, to, the side it belongs to]
    const runs = this.twoCourts ? [
      ['u', WD - SCREEN / 2, WD, mc0 - SCREEN, 'W'], ['u', WD - SCREEN / 2, vm + WD / 2, L - WD, 'W'],
      ['u', W - WD + SCREEN / 2, WD, mc0 - SCREEN, 'E'], ['u', W - WD + SCREEN / 2, vm + WD / 2, L - WD, 'E'],
      ['v', WD - SCREEN / 2, WD, W - WD, 'N'], ['v', L - WD + SCREEN / 2, WD, W - WD, 'S'], ['v', mc0 - SCREEN / 2, WD, W - WD, 'M'],
      // Krishna's middle wing has a verandah onto the second courtyard too
      ...(this.inner ? [['v', vm + WD / 2 - SCREEN / 2, WD, W - WD, 'H']] : []),
    ] : [
      ['u', WD - SCREEN / 2, WD, L - WD, 'W'], ['u', W - WD + SCREEN / 2, WD, L - WD, 'E'],
      ['v', WD - SCREEN / 2, WD, W - WD, 'N'], ['v', L - WD + SCREEN / 2, WD, W - WD, 'S'],
    ];
    const st = this.style;
    // Krishna: cusped arches below, a colonnade of rectangular openings above (drone view of the middle wing); the
    // others: their own arch and upper floor, and salmon walls with barred windows where there is no arcade
    const ground = st?.arch === 'round' ? 'x:rarch' : 'x:arch';
    const upper = this.mine || st?.upper === 'colonnade' ? 'x:colonnade' : 'x:grille';
    for (let k = 0; k < FLOORS; k++) {
      const y0 = k * FH; const y1 = y0 + FH - SLAB;
      for (const [axis, at, a, b, side] of runs) {
        const arcade = !st || this.mine || st.arcade.includes(side);
        const pierKey = arcade ? 'c:#ecdcb9' : 'c:#e3a890';
        const n = Math.max(1, Math.round((b - a) / MOD)); const bw = (b - a) / n;
        for (let j = 0; j < n; j++) {
          const m = a + (j + 0.5) * bw;
          const g = new THREE.PlaneGeometry(bw, FH - SLAB);
          if (axis === 'u') g.rotateY(Math.PI / 2);
          g.translate(axis === 'u' ? at : m, y0 + (FH - SLAB) / 2, axis === 'u' ? m : at);
          this.geo(!arcade ? 'x:courtWin' : k === 0 ? ground : upper, g);
          // piers
          const p0 = a + j * bw;
          const pier = (pa, pb) => (axis === 'u' ? this.box(at - SCREEN / 2, at + SCREEN / 2, pa, pb, y0, y1, pierKey, { collide: true }) : this.box(pa, pb, at - SCREEN / 2, at + SCREEN / 2, y0, y1, pierKey, { collide: true }));
          if (k === 0 && arcade) pier(Math.max(a, p0 - 0.4), p0 + 0.4);
          else if (!arcade) pier(Math.max(a, p0 - 0.25), Math.min(b, p0 + 0.25));
          if (k > 0 || !arcade) { if (axis === 'u') this.col(at - 0.1, at + 0.1, p0, p0 + bw, y0, y1); else this.col(p0, p0 + bw, at - 0.1, at + 0.1, y0, y1); }
        }
        if (k === 0 || !arcade) { const pb = b; const d = arcade ? 0.4 : 0.25; axis === 'u' ? this.box(at - SCREEN / 2, at + SCREEN / 2, pb - d, pb, y0, y1, pierKey) : this.box(pb - d, pb, at - SCREEN / 2, at + SCREEN / 2, y0, y1, pierKey); }
      }
      // corner piers and the ends of the middle wing
      const corners = [[WD - SCREEN, WD - SCREEN], [W - WD, WD - SCREEN], [WD - SCREEN, L - WD], [W - WD, L - WD]];
      if (this.twoCourts) corners.push([WD - SCREEN, mc0 - SCREEN], [W - WD, mc0 - SCREEN], [WD - SCREEN, vm + WD / 2 - SCREEN], [W - WD, vm + WD / 2 - SCREEN]);
      for (const [u, v] of corners) this.box(u, u + SCREEN, v, v + SCREEN, y0, y1 + SLAB, 'c:#e1cda4');
      if (this.twoCourts && !this.inner) for (const u of [WD - SCREEN, W - WD]) this.box(u, u + SCREEN, mc1, vm + WD / 2, y0, y1 + SLAB, 't:plaster:#f1ede4');
      // floor slab edges facing the courtyards
      if (k > 0) for (const r of this.court) {
        this.box(r.u0 - SCREEN, r.u1 + SCREEN, r.v0 - SCREEN, r.v0, y0 - SLAB, y0, 'c:#e8d9b8', { collide: false });
        this.box(r.u0 - SCREEN, r.u1 + SCREEN, r.v1, r.v1 + SCREEN, y0 - SLAB, y0, 'c:#e8d9b8', { collide: false });
      }
    }
    // a moulded string course at the first floor and a cornice under the parapet, all round each courtyard
    if (this.heritage) {
      for (const r of this.court) {
        for (const [y0, y1, d] of [[FH - 0.22, FH + 0.12, 0.16], [FLOORS * FH - 0.3, FLOORS * FH, 0.22]]) {
          this.box(r.u0, r.u0 + d, r.v0, r.v1, y0, y1, 'c:#f4efe3', { collide: false }); this.box(r.u1 - d, r.u1, r.v0, r.v1, y0, y1, 'c:#f4efe3', { collide: false });
          this.box(r.u0, r.u1, r.v0, r.v0 + d, y0, y1, 'c:#f4efe3', { collide: false }); this.box(r.u0, r.u1, r.v1 - d, r.v1, y0, y1, 'c:#f4efe3', { collide: false });
        }
      }
    }
    // the middle wing's back wall onto the second courtyard (rooms with windows)
    if (!this.twoCourts || this.inner) return;
    const len = W - 2 * WD;
    const g = new THREE.PlaneGeometry(len, FLOORS * FH);
    const a = g.attributes.uv;
    // the heritage Bhawans: salmon plaster with a room window on each floor; the others: the campus hostel facade
    for (let i = 0; i < a.count; i++) a.setXY(i, (a.getX(i) * len) / 3.4, a.getY(i) * (this.heritage ? 1 : FLOORS));
    g.translate(W / 2, (FLOORS * FH) / 2, vm + WD / 2 + 0.01);
    this.geo(this.heritage ? 'x:courtFace' : 'facade:hostel', g);
    this.box(WD, W - WD, vm + WD / 2 - OUT, vm + WD / 2, 0, FLOORS * FH, 't:plaster:#eee7d8');
  }

  // The walkable roof: one strip per wing (the first, from u = 0, is the west wing with the stair opening).
  roofStrips() {
    const { W, L, mc0, vm, WD } = this;
    const strips = [
      { u0: 0, u1: WD, v0: 0, v1: L }, { u0: W - WD, u1: W, v0: 0, v1: L },
      { u0: WD, u1: W - WD, v0: 0, v1: WD }, { u0: WD, u1: W - WD, v0: L - WD, v1: L },
    ];
    if (this.twoCourts) strips.push({ u0: WD, u1: W - WD, v0: mc0 - SCREEN, v1: vm + WD / 2 });
    return strips;
  }

  // Parapets along the outside and round the courtyards.
  roofParapets(par) {
    const { W, L } = this;
    par(-0.05, 0.25, 0, L); par(W - 0.25, W + 0.05, 0, L); par(0, W, -0.05, 0.25); par(0, W, L - 0.25, L + 0.05);
    for (const r of this.court) { par(r.u0 - 0.25, r.u0, r.v0, r.v1); par(r.u1, r.u1 + 0.25, r.v0, r.v1); par(r.u0, r.u1, r.v0 - 0.25, r.v0); par(r.u0, r.u1, r.v1, r.v1 + 0.25); }
  }

  // Walkable roof over every wing, parapets all round, water tanks and washing lines on the west wing.
  buildRoof() {
    const y = FLOORS * FH;
    const st = this.spaces.find((s) => s.type === 'stair' && s.roof);
    const hole = st.t0;
    const Wg = this.wings.W;
    const strips = this.roofStrips();
    // west strip, minus the stair opening
    const [hu0, hv0] = Wg.map(DEPTH, hole); const [hu1, hv1] = Wg.map(0.84, hole + MOD);
    for (const r of strips) {
      if (r.u0 === 0) {
        this.col(r.u0, r.u1, r.v0, hv0, y - 0.3, y, true);
        this.col(r.u0, r.u1, hv1, r.v1, y - 0.3, y, true);
        this.col(Math.max(hu0, hu1), r.u1, hv0, hv1, y - 0.3, y, true);
      } else this.col(r.u0, r.u1, r.v0, r.v1, y - 0.3, y, true);
    }
    // parapets: outside edge and courtyard edges
    this.roofParapets((u0, u1, v0, v1) => { this.box(u0, u1, v0, v1, y, y + 0.95, 't:plaster:#f1ece2'); });
    // stair head room (mumty) over the main stair
    const t0 = hole; const t1 = hole + MOD;
    for (const t of [t0, t1]) this.bbox(Wg, 0.3, DEPTH + OUT, t - T / 2, t + T / 2, y, y + 2.6, 't:plaster:#ede6d6');
    this.bbox(Wg, DEPTH, DEPTH + OUT, t0, t1, y, y + 2.6, 't:plaster:#ede6d6');
    this.bbox(Wg, 0.3, DEPTH + OUT, t0 - 0.2, t1 + 0.2, y + 2.6, y + 2.8, 't:concrete:#e5e0d4', { collide: false });
    this.bbox(Wg, 0.7, 0.84, t0 + 0.15, t0 + 1.45, y, y + 1.0, 'm:#9aa1a8');
    this.label('Roof terrace', Wg, -0.3, t0 + MOD / 2, y + 2.4);
    this.legendBand('🪜', 'Stairs down', [FLOORS], Wg, 0.4, t0 + MOD / 2);
    // water tanks
    for (let j = 0; j < 3; j++) { const [u, v] = Wg.map(2.2, t1 + 1.6 + j * 2.3); this.cyl(u, y, v, 0.85, 1.5, 'c:#1f2326', 16); this.col(u - 0.85, u + 0.85, v - 0.85, v + 0.85, y, y + 1.5); }
    // washing lines with clothes drying
    const r = rng(17);
    for (let j = 0; j < 3; j++) {
      const ta = t0 - 12 + j * 0.01; const s = 1.0 + j * 1.6;
      for (const tt of [ta - 0.1, ta + 9]) this.bcyl(Wg, s, tt, y, 0.03, 1.9, 'm:#8c9399', 6);
      this.bbox(Wg, s - 0.01, s + 0.01, ta - 0.1, ta + 9, y + 1.85, y + 1.87, 'c:#2fb34a', { collide: false });
      for (let q = 0; q < 9; q++) {
        const tt = ta + 0.4 + q * 0.95 + r() * 0.2;
        const col = ['#e53935', '#1e88e5', '#fdd835', '#ffffff', '#43a047', '#8e24aa', '#212121'][Math.floor(r() * 7)];
        this.bquad(Wg, s, tt, y + 1.15 + r() * 0.2, 0.5, 0.6, '+s', `c:${col}`);
        this.bquad(Wg, s, tt, y + 1.15 + r() * 0.2, 0.5, 0.6, '-s', `c:${col}`);
      }
    }
  }

  // ---------- spaces ----------
  partitions(sp, w, t0, t1, y0, y1) {
    for (const t of [t0, t1]) this.bbox(w, 0, w.depth, t - T / 2, t + T / 2, y0, y1, 't:plaster:#f3efe6');
  }

  shell(sp, { floor = 't:terrazzo:#dcdcd6', ceiling = true, back = true } = {}) {
    const w = this.bandOf(sp.wing); const { t0, t1 } = sp; const y0 = sp.k * FH; const y1 = y0 + FH - SLAB;
    this.partitions(sp, w, t0, t1, y0, y1);
    if (back) this.bbox(w, w.depth, w.depth + 0.28, t0, t1, y0, y1, 't:plaster:#f3efe6');
    if (sp.k === 0) this.bbox(w, 0, w.depth, t0, t1, 0, 0.03, floor, { collide: false });
    else this.bbox(w, 0, w.depth, t0, t1, y0 - SLAB, y0, floor, { walkable: true });
    if (ceiling) this.bbox(w, 0, w.depth, t0, t1, y1, y1 + SLAB - 0.05, 't:concrete:#f6f4ee', { walkable: true });
    return { w, t0, t1, y0, y1 };
  }

  window(w, t, y0, width = 1.3) {
    const s = w.depth - 0.01;
    this.bquad(w, s, t, y0 + 1.0, width + 0.16, 1.36, '-s', 'c:#efe7d6');
    this.bquad(w, s - 0.005, t, y0 + 1.06, width, 1.24, '-s', 'e:#b9d7ee');
    for (let k = 1; k < 4; k++) this.bbox(w, s - 0.03, s - 0.01, t - width / 2 + (width * k) / 4 - 0.01, t - width / 2 + (width * k) / 4 + 0.01, y0 + 1.06, y0 + 2.3, 'm:#8a9096', { collide: false });
  }

  curtains(w, t, y0, width = 1.3) {
    const s = w.depth - 0.06;
    this.bquad(w, s, t - width / 2 - 0.05, y0 + 0.75, 0.55, 1.8, '-s', 'x:curtain');
    this.bquad(w, s, t + width / 2 + 0.05, y0 + 0.75, 0.55, 1.8, '-s', 'x:curtain');
    this.bbox(w, s - 0.01, s + 0.01, t - width / 2 - 0.4, t + width / 2 + 0.4, y0 + 2.55, y0 + 2.57, 'm:#9aa0a6', { collide: false });
  }

  // A hinged room door: E opens and closes it.
  door(w, t, k, open = true) {
    const hinge = w.map(0, t); const dt = w.dt; const ds = w.ds;
    const pivot = new THREE.Group();
    pivot.position.set(hinge[0], k * FH, hinge[1]);
    const beta = Math.atan2(-dt[1], dt[0]);
    const phi = Math.abs(dt[1] - ds[0]) < 1e-6 && Math.abs(-dt[0] - ds[1]) < 1e-6 ? Math.PI / 2 : -Math.PI / 2;
    // Krishna's doors are green-painted timber (2006 photos)
    const leaf = new THREE.Mesh(worldBoxGeometry(0.98, 2.1, 0.05, 1.5), texturedMaterial('wood', { tint: this.mine ? '#7d9a6c' : '#e2c493' }));
    leaf.position.set(0.5, 1.05, 0);
    leaf.castShadow = true;
    pivot.add(leaf);
    const knob = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.06), mat('#b9bec4', { metalness: 0.8, roughness: 0.3 }));
    knob.position.set(0.88, 0.98, 0.05);
    pivot.add(knob);
    this.g.add(pivot);
    const cols = this.bcol(w, -0.06, 0.06, t, t + 1.0, k * FH, k * FH + 2.1);
    const d = { pivot, cols, beta, phi, open };
    const set = (o) => { d.open = o; pivot.rotation.y = beta + (o ? phi : 0); for (const c of cols) c.enabled = !o; };
    d.set = set;
    set(open);
    this.doors.push(d);
    return this.doors.length - 1;
  }

  space_lobby(sp) {
    const { w, t0, t1, y0 } = this.shell(sp, { floor: 't:terrazzo:#e3ddcf', back: false });
    const tc = (t0 + t1) / 2;
    // entrance: an opening in the back (outer) wall with a wooden frame
    this.bbox(w, w.depth, w.depth + 0.28, t0, tc - 1.5, 0, FH - SLAB, 't:plaster:#f3efe6');
    this.bbox(w, w.depth, w.depth + 0.28, tc + 1.5, t1, 0, FH - SLAB, 't:plaster:#f3efe6');
    this.bbox(w, w.depth, w.depth + 0.28, tc - 1.5, tc + 1.5, 2.7, FH - SLAB, 't:plaster:#f3efe6', { collide: false });
    for (const t of [tc - 1.55, tc + 1.45]) this.bbox(w, w.depth - 0.05, w.depth + 0.35, t, t + 0.1, 0, 2.7, 'c:#7a5532', { collide: false });
    // security desk and register
    this.bbox(w, 2.7, 3.3, t0 + 0.4, t0 + 2.0, 0, 1.0, 't:wood:#8a6040');
    this.bbox(w, 2.65, 3.35, t0 + 0.35, t0 + 2.05, 1.0, 1.05, 'c:#5b3d24', { collide: false });
    this.bbox(w, 2.85, 3.15, t0 + 0.9, t0 + 1.35, 1.05, 1.09, 'c:#1f4f8a', { collide: false });
    this.npcSpots.guard = this.bandWorld(w, 3.75, t0 + 1.2);
    this.npcSpots.guardYaw = this.yawOf(w, '-s');
    // notice board, CCTV, extinguisher
    this.bquad(w, 1.8, t0 + 0.14, y0 + 1.2, 1.6, 1.0, '+t', 'x:notice');
    this.interact('hnotice', w, 1.8, t0 + 0.9, 0, 'Read the hostel notice board', 1.5);
    this.label('Notices', w, 1.8, t0 + 0.2, 2.45);
    const cc = w.map(3.6, tc); this.cyl(cc[0], FH - SLAB - 0.15, cc[1], 0.1, 0.12, 'c:#16181c', 12);
    this.bcyl(w, 0.4, t0 + 0.3, 0.9, 0.08, 0.5, 'c:#c62828', 10);
    // vending machine and water cooler on the stair-side wall
    this.bbox(w, 2.4, 3.3, t1 - 0.9, t1 - 0.12, 0, 1.85, 'c:#1f4fa3');
    this.bquad(w, 2.85, t1 - 0.92, 0, 0.88, 1.84, '-t', 'x:vending');
    this.interact('vending', w, 2.85, t1 - 1.6, 0, 'Use the vending machine', 1.6);
    this.bbox(w, 0.9, 1.6, t1 - 0.75, t1 - 0.12, 0, 1.3, 'm:#c3c9cf');
    this.bbox(w, 0.95, 1.55, t1 - 0.78, t1 - 0.74, 0.7, 1.15, 'c:#5c6a75', { collide: false });
    for (const s of [1.1, 1.4]) this.bbox(w, s - 0.03, s + 0.03, t1 - 0.86, t1 - 0.76, 0.85, 0.92, 'm:#e0e0e0', { collide: false });
    this.interact('cooler', w, 1.25, t1 - 1.4, 0, 'Drink from the water cooler', 1.4);
    this.label('Drinking water', w, 1.25, t1 - 0.3, 1.75);
    this.tube(w, 1.2, t0 + 1.7, y0 + FH - SLAB); this.tube(w, 1.2, t1 - 1.7, y0 + FH - SLAB);
    this.fan(w, 2.0, tc, y0 + FH - SLAB);
    this.label(`${this.name} · Lobby`, w, 0.6, tc, 2.55, { height: 0.38 });
    this.lobby = { w, t0, t1 };
    this.legend('🚪', 'Entrance', [0], 0.2, this.ve);
    this.legendBand('🥤', 'Vending machine', [0], w, 2.85, t1 - 1.0);
    this.legendBand('💧', 'Water cooler', [0], w, 1.25, t1 - 1.0);
    this.legendBand('📌', 'Notice board', [0], w, 1.8, t0 + 0.6);
  }

  space_stair(sp) {
    const w = this.bandOf(sp.wing); const { t0, t1 } = sp; const y0 = sp.k * FH;
    if (sp.k === 0) this.legendBand('🪜', sp.roof ? 'Main stairs · roof' : sp.label || 'East stairs', sp.roof ? [0, 1, 2] : [0, 1], w, 1.6, t0 + MOD / 2);
    this.partitions(sp, w, t0, t1, y0, y0 + FH);
    // (an inner Krishna core backs onto the corridor ring's wall, which is built with the ring)
    if (!w.ring) this.bbox(w, w.depth, w.depth + 0.28, t0, t1, y0, y0 + FH, 't:plaster:#f3efe6');
    const stone = 't:terrazzo:#c9c6bd';
    // platform at this floor (the ground floor stands on the ground)
    if (sp.k === 0) this.bbox(w, -T, 0.84, t0, t1, 0, 0.03, stone, { collide: false });
    else this.bbox(w, -T, 0.84, t0 + T / 2, t1 - T / 2, y0 - SLAB, y0, stone, { walkable: true });
    const top = sp.k >= sp.top;
    if (top) {
      // nothing above: a railing stops you stepping off over the flight below
      this.bbox(w, 0.84, 0.98, t0 + 0.15, t0 + 1.45, y0, y0 + 1.0, 'm:#9aa1a8');
      this.bbox(w, 0.84, w.depth, t0, t1, y0 + FH - SLAB, y0 + FH, 't:concrete:#f6f4ee', { collide: false });
      return;
    }
    // Each step is a block down to a sloping soffit 0.45 m under its tread (not down to the flight's foot), so the
    // flight above a lower one leaves full headroom where you step off the first floor onto the way down.
    const flight = (ta, tb, yStart, sStart, dir) => {
      for (let j = 0; j < 8; j++) {
        const sa = sStart + dir * j * TREAD; const sb = sa + dir * TREAD;
        const top = yStart + (j + 1) * RISE;
        const bottom = j === 0 ? yStart : Math.max(yStart - 0.6, top - 0.45 - RISE);
        this.bbox(w, Math.min(sa, sb), Math.max(sa, sb), ta, tb, sp.k === 0 && yStart === y0 ? y0 : bottom, top, stone, { walkable: true });
      }
    };
    flight(t0 + 0.15, t0 + 1.4, y0, 0.84, 1); // up to the landing
    this.bbox(w, 3.0, w.depth, t0 + 0.15, t1 - 0.15, y0 + FH / 2 - 0.25, y0 + FH / 2, stone, { walkable: true });
    flight(t0 + 2.0, t1 - 0.15, y0 + FH / 2, 3.0, -1); // up to the next floor
    this.bbox(w, 0.84, 3.0, t0 + 1.4, t0 + 2.0, y0, y0 + FH + 1.0, 't:plaster:#ebe5d8');
    // handrail along the core
    this.bbox(w, 0.84, 3.0, t0 + 1.36, t0 + 1.4, y0 + 0.9, y0 + FH / 2 + 0.95, 'm:#7d858c', { collide: false });
    this.tube(w, 3.6, t0 + MOD / 2, y0 + FH - 0.1, false);
    if (sp.k === 0) this.label(sp.roof ? 'Stairs · roof terrace' : 'Stairs', w, -T - 0.3, t0 + MOD / 2, 2.55);
    sp.flights = { t0, t1 };
  }

  // Krishna's other stair cores (under the roof mumties): the same dog-leg as the east stair.
  space_core(sp) { this.space_stair(sp); }

  // A cross passage from the corridor ring through the inner rooms to a courtyard verandah, on both floors.
  space_pass(sp) {
    const w = this.bandOf(sp.wing); const { t0, t1 } = sp; const y0 = sp.k * FH; const y1 = y0 + FH - SLAB;
    this.partitions(sp, w, t0, t1, y0, y0 + FH);
    const floor = 't:terrazzo:#b9bab3';
    if (sp.k === 0) this.bbox(w, -T, w.depth + T, t0, t1, 0, 0.03, floor, { collide: false });
    else this.bbox(w, -T, w.depth + T, t0, t1, y0 - SLAB, y0, floor, { walkable: true });
    this.bbox(w, -T, w.depth + T, t0, t1, y1, y0 + FH - 0.05, 't:concrete:#f6f4ee', { collide: false });
    // a plain round arch at each end, as in the corridor ring
    for (const s0 of [-T, w.depth]) this.bbox(w, s0, s0 + T, t0, t1, y0 + 2.45, y1, 't:plaster:#f1ede4', { collide: false });
    this.tube(w, w.depth / 2, (t0 + t1) / 2, y1, false);
    if (sp.k === 0) this.legendBand('↔', 'To the courtyard', [0], w, w.depth / 2, (t0 + t1) / 2);
  }

  space_wash(sp) {
    const { w, t0, t1, y0, y1 } = this.shell(sp, { floor: 't:tiles:#dfe5e8' });
    // granite counter with four basins, mirrors above, against the outer wall
    this.bbox(w, 3.55, 4.15, t0 + 0.4, t0 + 4.9, y0, y0 + 0.82, 'c:#d8cdb6');
    this.bbox(w, 3.5, 4.18, t0 + 0.35, t0 + 4.95, y0 + 0.82, y0 + 0.88, 'c:#1c1c1e', { collide: false });
    for (let j = 0; j < 4; j++) {
      const tc = t0 + 0.95 + j * 1.1;
      this.bbox(w, 3.65, 4.0, tc - 0.25, tc + 0.25, y0 + 0.84, y0 + 0.885, 'c:#f7f7f5', { collide: false });
      this.bcyl(w, 4.07, tc, y0 + 0.88, 0.025, 0.22, 'm:#c7ccd1', 8);
      this.bquad(w, 4.18, tc, y0 + 1.2, 0.8, 1.0, '-s', 'g:#dfe8ef');
    }
    this.bcyl(w, 3.75, t0 + 4.55, y0 + 0.88, 0.07, 0.12, 'c:#1fb5a8', 10);
    this.interact('washbasin', w, 3.0, t0 + 2.6, sp.k, 'Wash your face', 1.8);
    // urinals on the end wall
    for (const s of [2.6, 3.3]) this.bbox(w, s - 0.2, s + 0.2, t1 - 0.4, t1 - 0.14, y0 + 0.5, y0 + 1.2, 'c:#f4f4f2');
    // cubicles along the corridor side: toilets and showers, grey laminate
    const n = 5; const cw = (t1 - 0.9 - (t0 + 1.9)) / n;
    for (let j = 0; j <= n; j++) this.bbox(w, 0, 1.5, t0 + 1.9 + j * cw - 0.02, t0 + 1.9 + j * cw + 0.02, y0 + 0.12, y0 + 2.1, 'c:#8e959b');
    for (let j = 0; j < n; j++) {
      const ta = t0 + 1.9 + j * cw; const tc = ta + cw / 2;
      this.bbox(w, 1.48, 1.52, ta + 0.05, ta + cw - 0.05, y0 + 0.12, y0 + 2.0, 'c:#9aa1a7');
      this.bbox(w, 1.53, 1.56, ta + cw - 0.2, ta + cw - 0.12, y0 + 1.0, y0 + 1.08, 'c:#2b2b2b', { collide: false });
      if (j < 2) this.bbox(w, 0.25, 0.85, tc - 0.22, tc + 0.22, y0, y0 + 0.42, 'c:#f4f4f2', { collide: false });
      else {
        this.bbox(w, 0.06, 0.14, tc - 0.04, tc + 0.04, y0 + 1.8, y0 + 2.0, 'm:#c7ccd1', { collide: false });
        this.bquad(w, -0.005, tc, y0 + 2.2, 0.45, 0.45, '+s', 'x:geyser');
        this.bcyl(w, 0.9, tc + 0.15, y0, 0.16, 0.32, 'c:#1e88e5', 12, 0.19);
        this.bcyl(w, 0.75, tc - 0.2, y0, 0.06, 0.12, 'c:#e53935', 10);
        this.bbox(w, 0.4, 0.6, tc - 0.12, tc + 0.12, y0 + 0.031, y0 + 0.035, 'c:#4a4f55', { collide: false });
      }
    }
    // wet floor in front of the showers, a floor drain, exhaust fan
    this.bbox(w, 1.55, 2.6, t0 + 1.9 + 2 * cw, t1 - 0.9, y0 + 0.031, y0 + 0.034, 'g:#9fb3c1', { collide: false });
    this.bbox(w, 2.0, 2.2, t0 + 3.0, t0 + 3.2, y0 + 0.031, y0 + 0.036, 'c:#5a5f64', { collide: false });
    const ex = w.map(w.depth - 0.02, t1 - 1.0); this.cyl(ex[0], y0 + 2.4, ex[1], 0.2, 0.05, 'c:#d9dde0', 14);
    this.tube(w, 2.2, t0 + 2.5, y1); this.tube(w, 2.2, t1 - 2.5, y1);
    this.label(sp.k === 0 ? 'Washroom · bathing area' : 'Washroom', w, -T - 0.3, t0 + 0.9, y0 + 2.45);
    this.legendBand('🚿', 'Washroom', [sp.k], w, 2.4, (t0 + t1) / 2);
    if (sp.k > 0) this.legendBand('💧', 'Water cooler', [sp.k], w, -T - 0.4, t0 + 2.25);
    // water cooler by the washroom on the upper floors
    if (sp.k > 0) {
      this.bbox(w, -T - 0.65, -T - 0.05, t0 + 1.9, t0 + 2.6, y0, y0 + 1.3, 'm:#c3c9cf');
      this.interact('cooler', w, -T - 1.0, t0 + 2.25, sp.k, 'Drink from the water cooler', 1.3);
    }
  }

  space_laundry(sp) {
    const { w, t0, t1, y0, y1 } = this.shell(sp, { floor: 't:tiles:#d9dfe2' });
    for (const tc of [t0 + 1.9, t0 + 2.7]) {
      this.bbox(w, 3.55, 4.15, tc - 0.32, tc + 0.32, y0, y0 + 0.88, 'c:#f2f2f0');
      this.bquad(w, 3.54, tc, y0 + 0.02, 0.62, 0.85, '-s', 'x:washer');
    }
    this.bquad(w, 0.02, t1 - 0.5, y0 + 1.1, 0.5, 0.75, '+s', 'x:electric');
    this.label('Distribution board', w, 0.1, t1 - 0.5, y0 + 2.05);
    this.bcyl(w, 2.0, t1 - 0.5, y0, 0.18, 0.3, 'c:#fbc02d', 12, 0.21);
    this.bbox(w, 1.98, 2.02, t1 - 0.45, t1 - 0.4, y0, y0 + 1.3, 'c:#8d6e63', { collide: false });
    // folding drying stand
    for (const s of [1.5, 2.3]) this.bbox(w, s - 0.02, s + 0.02, t0 + 1.9, t0 + 2.9, y0 + 0.9, y0 + 0.93, 'm:#c0c6cc', { collide: false });
    this.bquad(w, 1.9, t0 + 2.4, y0 + 0.4, 0.8, 0.5, '+t', 'c:#4fc3f7');
    this.bcol(w, 1.45, 2.35, t0 + 1.9, t0 + 2.9, y0, y0 + 0.95);
    this.interact('laundry', w, 3.0, t0 + 1.3, sp.k, 'Do your laundry', 1.5);
    this.tube(w, 2.0, (t0 + t1) / 2, y1);
    this.label('Laundry', w, -T - 0.3, t0 + 0.8, y0 + 2.45);
    this.legendBand('🧺', 'Laundry', [sp.k], w, 2.0, (t0 + t1) / 2);
  }

  space_common(sp) {
    const { w, t0, t1, y0, y1 } = this.shell(sp, { floor: 't:terrazzo:#d6d2c6' });
    this.label('Common Room', w, -T - 0.3, t0 + 6.8, 2.55, { height: 0.42 });
    // table tennis
    const tt = t0 + 3.2; const sc = 2.1;
    this.bbox(w, sc - 0.76, sc + 0.76, tt - 1.37, tt + 1.37, 0.70, 0.76, 'c:#1f3f7a');
    this.flat(w, sc, tt, 0.762, 1.52, 2.74, 'x:ttTop');
    for (const [ds, dtt] of [[-0.6, -1.2], [0.6, -1.2], [-0.6, 1.2], [0.6, 1.2]]) this.bbox(w, sc + ds - 0.03, sc + ds + 0.03, tt + dtt - 0.03, tt + dtt + 0.03, 0, 0.7, 'c:#2b2b2b', { collide: false });
    this.bcol(w, sc - 0.76, sc + 0.76, tt - 1.37, tt + 1.37, 0, 0.76);
    this.bbox(w, sc - 0.84, sc + 0.84, tt - 0.01, tt + 0.01, 0.76, 0.91, 'c:#f2f2f2', { collide: false });
    this.ttEnds = [this.bandWorld(w, sc, tt - 1.25, 0), this.bandWorld(w, sc, tt + 1.25, 0)];
    this.ttBall = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), mat('#ff9800', { emissive: '#ff9800' }));
    this.ttBall.visible = false;
    this.campus.root.add(this.ttBall);
    this.interact('tt', w, sc, tt - 1.9, 0, 'Play table tennis', 1.8);
    this.npcSpots.tt = [{ at: this.bandWorld(w, sc, tt - 2.0), yaw: this.yawOf(w, '+t') }, { at: this.bandWorld(w, sc, tt + 2.0), yaw: this.yawOf(w, '-t') }];
    // foosball and carrom
    const fz = t0 + 7.0;
    this.bbox(w, 3.0, 3.7, fz - 0.6, fz + 0.6, 0.55, 0.9, 't:wood:#6d4c2f');
    this.bbox(w, 3.05, 3.65, fz - 0.55, fz + 0.55, 0.9, 0.91, 'c:#2e7d32', { collide: false });
    for (const s of [3.05, 3.65]) for (const t of [fz - 0.5, fz + 0.5]) this.bbox(w, s - 0.03, s + 0.03, t - 0.03, t + 0.03, 0, 0.55, 'c:#3e2a1a', { collide: false });
    for (let r = 0; r < 4; r++) this.bbox(w, 2.85, 3.85, fz - 0.45 + r * 0.3 - 0.01, fz - 0.45 + r * 0.3 + 0.01, 0.95, 0.97, 'm:#b0b6bc', { collide: false });
    this.bcol(w, 3.0, 3.7, fz - 0.6, fz + 0.6, 0, 0.91);
    this.interact('foosball', w, 2.5, fz, 0, 'Play foosball', 1.5);
    this.npcSpots.foosball = [{ at: this.bandWorld(w, 2.55, fz - 0.25), yaw: this.yawOf(w, '+s') }, { at: this.bandWorld(w, 4.0, fz + 0.25), yaw: this.yawOf(w, '-s') }];
    const cz = t0 + 8.9;
    this.bbox(w, 1.0, 1.75, cz - 0.38, cz + 0.38, 0, 0.62, 't:wood:#8a6040');
    this.flat(w, 1.375, cz, 0.625, 0.74, 0.74, 'x:board');
    this.interact('carrom', w, 1.375, cz - 0.9, 0, 'Play carrom', 1.4);
    this.npcSpots.carrom = [{ at: this.bandWorld(w, 1.375, cz - 0.65), yaw: this.yawOf(w, '+t'), sit: true }, { at: this.bandWorld(w, 1.375, cz + 0.65), yaw: this.yawOf(w, '-t'), sit: true }];
    // TV lounge: wall TV on the end wall, two sofas, coffee table with newspapers and a chess board
    const te = t1 - T / 2 - 0.02;
    this.bbox(w, 1.3, 2.9, te - 0.06, te, 1.15, 2.05, 'c:#111316', { collide: false });
    const tvKey = 'x:tvOn';
    this.bquad(w, 2.1, te - 0.065, 1.2, 1.5, 0.82, '-t', tvKey);
    this.tvMat = this.material(tvKey);
    this.tvTex = { on: this.tvMat.map, off: TEXTURES.tvOff() };
    this.tvMat.emissive = new THREE.Color('#ffffff');
    this.tvMat.emissiveMap = this.tvMat.map;
    this.tvMat.emissiveIntensity = 0.85;
    this.interact('tv', w, 2.1, te - 2.2, 0, 'Turn the TV on / off', 1.8);
    for (const [s0, s1] of [[0.6, 1.5], [2.7, 3.6]]) {
      const ts = te - 3.1;
      this.bbox(w, s0, s1, ts - 0.45, ts + 0.45, 0, 0.42, 'c:#7a3b2e');
      this.bbox(w, s0, s1, ts - 0.45, ts - 0.25, 0.42, 0.85, 'c:#6b3226');
      this.bbox(w, s0, s0 + 0.15, ts - 0.45, ts + 0.45, 0.42, 0.62, 'c:#6b3226', { collide: false });
      this.bbox(w, s1 - 0.15, s1, ts - 0.45, ts + 0.45, 0.42, 0.62, 'c:#6b3226', { collide: false });
    }
    this.sofaSeats = [];
    for (const s of [0.85, 1.25, 2.95, 3.35]) this.sofaSeats.push({ at: this.bandWorld(w, s, te - 3.05), yaw: this.yawOf(w, '+t'), stand: this.bandWorld(w, s < 2 ? 1.95 : 2.2, te - 2.4) });
    this.interact('sofa', w, 2.1, te - 3.0, 0, 'Sit on the sofa', 1.5);
    const ct = te - 1.9;
    this.bbox(w, 1.6, 2.6, ct - 0.3, ct + 0.3, 0, 0.42, 't:wood:#6d4c2f');
    this.flat(w, 1.85, ct, 0.425, 0.3, 0.42, 'c:#ecebe3'); // newspapers
    this.flat(w, 2.35, ct, 0.425, 0.34, 0.34, 'x:chess');
    // notice board, wall clock, AC, fans, lights
    this.bquad(w, w.depth - 0.02, t0 + 6.8, 1.3, 1.4, 0.9, '-s', 'x:notice');
    this.bquad(w, w.depth - 0.02, t0 + 4.9, 2.25, 0.32, 0.32, '-s', 'c:#fafafa'); // wall clock
    this.bbox(w, w.depth - 0.25, w.depth - 0.02, t0 + 9.5, t0 + 10.5, 2.3, 2.62, 'c:#f7f7f7', { collide: false });
    for (const t of [t0 + 3.2, t0 + 10.4]) this.fan(w, 2.1, t, y1);
    for (const t of [t0 + 1.6, t0 + 5.0, t0 + 8.6, t0 + 12.0]) this.tube(w, 2.1, t, y1);
    // a small gym corner, as in the walkthrough
    this.bbox(w, 3.4, 4.0, t0 + 5.0, t0 + 5.9, 0, 0.45, 'c:#c62828');
    this.bbox(w, 3.9, 4.15, t0 + 5.0, t0 + 5.9, 0, 2.1, 'c:#2b2b2b');
    for (const t of [t0 + 5.1, t0 + 5.8]) this.bcyl(w, 3.6, t, 0.95, 0.12, 0.05, 'c:#1c1c1c', 14);
    this.npcSpots.tv = this.sofaSeats.slice(0, 3);
    this.npcSpots.chat = [{ at: this.bandWorld(w, 3.2, t0 + 11.2), yaw: this.yawOf(w, '-s') }, { at: this.bandWorld(w, 2.4, t0 + 11.6), yaw: this.yawOf(w, '+s') }];
    this.common = { w, t0, t1 };
    this.legendBand('🏓', 'Common room · TT, TV', [0], w, 2.1, (t0 + t1) / 2);
  }

  // ---------- rooms ----------
  space_room(sp) {
    const { w, t0, t1, y0, y1 } = this.shell(sp, this.heritage ? { floor: KOTA } : {});
    const k = sp.k; const v = sp.variant;
    const sheet = { mine: 'x:sheetBlue', study: 'x:sheetTeal', double: 'x:sheetFloral', senior: 'x:sheetTeal' }[v];
    sp.doorIndex = this.door(w, t0 + 0.3, k, true);
    this.interact(`hdoor:${sp.doorIndex}`, w, -0.6, t0 + 0.8, k, 'Open / close the door', 1.3);
    const wc = (t0 + 1.3 + t1) / 2; // window centred in the wall beside the door
    this.window(w, wc, y0);
    this.curtains(w, wc, y0);
    const bed = (ta, tb, s0, s1, sheetKey) => {
      this.bbox(w, s0, s1, ta, tb, y0, y0 + 0.4, 't:wood:#8a6040');
      this.bbox(w, s0 + 0.03, s1 - 0.03, ta + 0.03, tb - 0.03, y0 + 0.4, y0 + 0.52, 'c:#e9ecf2', { collide: false });
      this.flat(w, (s0 + s1) / 2 - 0.2, (ta + tb) / 2, y0 + 0.525, s1 - s0 - 0.5, tb - ta - 0.04, sheetKey);
      this.bbox(w, s1 - 0.42, s1 - 0.06, ta + 0.12, tb - 0.12, y0 + 0.52, y0 + 0.62, 'c:#ffffff', { collide: false });
    };
    const desk = (ta, tb, s0, s1, chairS, chairT) => {
      this.bbox(w, s0, s1, ta, tb, y0 + 0.72, y0 + 0.76, 't:wood:#9b7048', { collide: false });
      this.bbox(w, s0, s1, ta, ta + 0.04, y0, y0 + 0.72, 't:wood:#9b7048', { collide: false });
      this.bbox(w, s0, s1, tb - 0.45, tb, y0 + 0.1, y0 + 0.72, 't:wood:#8a6040', { collide: false });
      this.bcol(w, s0, s1, ta, tb, y0, y0 + 0.76);
      this.bbox(w, chairS - 0.22, chairS + 0.22, chairT - 0.22, chairT + 0.22, y0 + 0.44, y0 + 0.48, 'c:#5d4632', { collide: false });
      this.bbox(w, chairS - 0.22, chairS + 0.22, chairT - 0.25, chairT - 0.21, y0 + 0.48, y0 + 0.95, 'c:#5d4632', { collide: false });
      for (const [a, b] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) this.bbox(w, chairS + a - 0.02, chairS + a + 0.02, chairT + b - 0.02, chairT + b + 0.02, y0, y0 + 0.44, 'c:#3e2e20', { collide: false });
      this.bcol(w, chairS - 0.22, chairS + 0.22, chairT - 0.25, chairT + 0.22, y0, y0 + 0.5);
    };
    const almirah = (s0, s1, ta, tb, dir) => {
      this.bbox(w, s0, s1, ta, tb, y0, y0 + 1.9, 'm:#7c8a96');
      this.bbox(w, s0 + 0.04, s1 - 0.04, dir === '-t' ? ta - 0.01 : tb, dir === '-t' ? ta : tb + 0.01, y0 + 0.9, y0 + 1.05, 'm:#5e6a74', { collide: false });
    };
    const things = (s, t, list) => list.forEach(([kind, ds, dt, col]) => {
      const S = s + ds; const Tt = t + dt;
      if (kind === 'laptop') { this.bbox(w, S - 0.17, S + 0.17, Tt - 0.12, Tt + 0.12, y0 + 0.76, y0 + 0.78, 'c:#2f3338', { collide: false }); this.bbox(w, S - 0.17, S + 0.17, Tt - 0.14, Tt - 0.12, y0 + 0.78, y0 + 1.0, 'c:#22262b', { collide: false }); }
      if (kind === 'books') for (let i = 0; i < 4; i++) this.bbox(w, S - 0.11, S + 0.11, Tt - 0.15, Tt + 0.15, y0 + 0.76 + i * 0.035, y0 + 0.79 + i * 0.035, `c:${['#c0392b', '#2471a3', '#229954', '#d4ac0d'][i]}`, { collide: false });
      if (kind === 'bottle') this.bcyl(w, S, Tt, y0 + 0.76, 0.035, 0.24, `c:${col || '#1e88e5'}`, 8);
      if (kind === 'mug') this.bcyl(w, S, Tt, y0 + 0.76, 0.04, 0.09, `c:${col || '#f5f5f5'}`, 8);
      if (kind === 'kettle') { this.bcyl(w, S, Tt, y0 + 0.76, 0.09, 0.2, 'm:#cfd4d9', 10, 0.07); }
      if (kind === 'bag') this.bbox(w, S - 0.15, S + 0.15, Tt - 0.1, Tt + 0.1, y0, y0 + 0.45, `c:${col || '#1f2a44'}`, { collide: false });
      if (kind === 'shoes') { this.bbox(w, S - 0.14, S + 0.14, Tt - 0.06, Tt, y0, y0 + 0.08, 'c:#333333', { collide: false }); this.bbox(w, S - 0.14, S + 0.14, Tt + 0.02, Tt + 0.08, y0, y0 + 0.08, 'c:#333333', { collide: false }); }
      if (kind === 'bucket') { this.bcyl(w, S, Tt, y0, 0.14, 0.3, `c:${col || '#1e88e5'}`, 12, 0.17); this.bcyl(w, S + 0.25, Tt, y0, 0.05, 0.1, 'c:#e53935', 8); }
      if (kind === 'bin') this.bcyl(w, S, Tt, y0, 0.11, 0.3, 'c:#2e7d32', 10, 0.13);
      if (kind === 'ext') { this.bbox(w, S - 0.15, S + 0.15, Tt - 0.04, Tt + 0.04, y0 + 0.76, y0 + 0.8, 'c:#f2f2f2', { collide: false }); this.bbox(w, S - 0.01, S + 0.01, Tt - 0.01, Tt + 0.6, y0 + 0.761, y0 + 0.77, 'c:#f39c12', { collide: false }); }
      if (kind === 'maggi') for (let i = 0; i < 3; i++) this.bbox(w, S - 0.06 + i * 0.13, S + 0.06 + i * 0.13, Tt - 0.05, Tt + 0.05, y0 + 0.76, y0 + 0.79, 'c:#f9c80e', { collide: false });
      if (kind === 'guitar') { this.bbox(w, S - 0.18, S + 0.18, Tt - 0.06, Tt + 0.06, y0, y0 + 1.05, 'c:#1b1b1b', { collide: false }); }
      if (kind === 'beanbag') this.bcyl(w, S, Tt, y0, 0.38, 0.45, `c:${col || '#c0392b'}`, 14, 0.25);
      if (kind === 'speaker') this.bbox(w, S - 0.08, S + 0.08, Tt - 0.08, Tt + 0.08, y0 + 0.76, y0 + 0.98, 'c:#111111', { collide: false });
    });
    const poster = (s, t, y, key, dir = '+t') => this.bquad(w, s, t, y0 + y, 0.5, 0.7, dir, key);
    const tl = t0 + T / 2; const th = t1 - T / 2;
    // clothes line across the room, with a few clothes
    this.bbox(w, 2.4, 2.41, tl, th, y0 + 2.3, y0 + 2.31, 'c:#2fb34a', { collide: false });
    for (const [dt, col] of [[0.7, '#e53935'], [1.4, '#fafafa'], [2.2, '#1e88e5']]) { this.bquad(w, 2.4, tl + dt, y0 + 1.7, 0.42, 0.6, '+s', `c:${col}`); this.bquad(w, 2.4, tl + dt, y0 + 1.7, 0.42, 0.6, '-s', `c:${col}`); }
    if (v === 'double') {
      bed(tl + 0.02, tl + 0.92, 1.2, 3.2, sheet);
      bed(th - 0.92, th - 0.02, 1.2, 3.2, 'x:sheetBlue');
      desk(tl + 1.15, tl + 2.1, 3.45, 4.15, 3.05, tl + 1.6);
      desk(th - 2.1, th - 1.15, 3.45, 4.15, 3.05, th - 1.6);
      things(3.8, tl + 1.6, [['laptop', 0, 0], ['ext', -0.15, 0.25], ['maggi', 0.1, -0.35]]);
      things(3.8, th - 1.6, [['books', 0, 0.2], ['kettle', 0.1, -0.3], ['mug', -0.2, 0, '#ff7043']]);
      things(0.6, tl + 0.5, [['bucket', 0, 0, '#43a047'], ['shoes', 0.4, 0.4]]);
      poster(1.8, tl + 0.01, 1.3, 'x:posterFest');
      poster(1.8, th - 0.01, 1.3, 'x:posterSpace', '-t');
      this.npcSpots.double = [{ at: this.bandWorld(w, 2.2, tl + 0.5, y0 + 0.1), yaw: this.yawOf(w, '+t'), sit: true }, { at: this.bandWorld(w, 3.05, th - 1.6, y0), yaw: this.yawOf(w, '+s'), sit: true }];
    } else {
      bed(th - 0.92, th - 0.02, 1.2, 3.25, sheet);
      almirah(0.25, 1.05, th - 0.58, th - 0.02, '-t');
      desk(tl + 0.02, tl + 0.68, 2.35, 3.95, 3.15, tl + 1.1);
      this.bquad(w, 3.15, tl + 0.01, y0 + 1.15, 1.2, 0.75, '+t', 'x:whiteboard');
      this.bbox(w, 2.35, 3.95, tl, tl + 0.45, y0 + 2.2, y0 + 2.6, 't:wood:#9b7048', { collide: false }); // loft cabinet over the desk
      things(3.1, tl + 0.34, [['laptop', 0.2, 0], ['books', -0.5, 0], ['bottle', 0.55, 0.1], ['ext', 0, 0.1]]);
      things(0.6, tl + 0.4, [['bucket', 0, 0], ['shoes', 0.5, 0.5], ['bin', 1.2, 0]]);
      this.bquad(w, 0.6, th - 0.01, y0 + 1.6, 0.2, 0.25, '-t', 'x:calendar');
      if (v === 'mine') {
        poster(1.8, tl + 0.01, 1.3, 'x:posterCode');
        things(3.1, tl + 0.34, [['mug', 0.4, -0.2, '#1fb5a8']]);
        things(1.3, th - 1.2, [['bag', 0, 0, '#3949ab']]);
        // the almirah door opens
        const hinge = w.map(1.05, th - 0.58);
        const pivot = new THREE.Group(); pivot.position.set(hinge[0], y0, hinge[1]);
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.8, 0.03), mat('#6f7d88', { metalness: 0.5, roughness: 0.45 }));
        leaf.position.set(-0.39, 0.95, -0.02); pivot.add(leaf);
        pivot.rotation.y = Math.atan2(-w.ds[1], w.ds[0]);
        this.g.add(pivot);
        this.almirah = { pivot, base: pivot.rotation.y, open: false };
        const inside = w.map(0.65, th - 0.3);
        for (const [dy, col] of [[0.5, '#e57373'], [0.9, '#64b5f6'], [1.3, '#ffd54f']]) this.box(inside[0] - 0.3, inside[0] + 0.3, inside[1] - 0.2, inside[1] + 0.2, y0 + dy, y0 + dy + 0.15, `c:${col}`, { collide: false });
        this.interact('almirah', w, 0.65, th - 1.15, k, 'Open / close your almirah', 1.2);
        if (this.mine) this.alcove(w, tl + 0.78, y0);
        this.interact('gate', w, 2.2, th - 1.3, k, 'Sleep (end the day)', 1.3);
        this.interact('studydesk', w, 3.15, tl + 1.2, k, 'Study at your desk', 1.1);
        this.interact('hlight', w, -0.05 + 0.25, t0 + 1.55, k, 'Switch the light on / off', 0.9);
        this.bquad(w, 0.01, t0 + 1.55, y0 + 1.25, 0.14, 0.2, '+s', 'c:#ffffff');
        this.spawn = this.bandWorld(w, 1.6, t0 + 0.8, y0);
        this.spawnYaw = this.yawOf(w, '-s');
        this.bedSpot = this.bandWorld(w, 2.2, th - 1.3, y0);
        this.myRoom = { w, t0, t1, k };
        // a light of its own that the switch controls
        const lm = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fffaf0', emissiveIntensity: 1.4 });
        this.myTube = lm;
        const g = new THREE.BoxGeometry(1.2, 0.05, 0.07);
        const tm = new THREE.Mesh(g, lm); const p = w.map(2.1, (t0 + t1) / 2);
        tm.position.set(p[0], y1 - 0.06, p[1]); tm.rotation.y = Math.atan2(w.dt[0], w.dt[1]) - Math.PI / 2;
        this.g.add(tm);
      } else if (v === 'study') {
        things(3.1, tl + 0.34, [['kettle', 0.5, 0.05], ['mug', 0.2, 0.15, '#ffca28']]);
        things(1.3, th - 1.1, [['guitar', 0, 0]]);
        poster(1.8, tl + 0.01, 1.3, 'x:posterSpace');
        this.npcSpots.study = [{ at: this.bandWorld(w, 3.15, tl + 1.1, y0), yaw: this.yawOf(w, '-t'), sit: true }];
      } else if (v === 'senior') {
        things(2.0, tl + 1.6, [['beanbag', 0, 0, '#8e24aa']]);
        things(3.1, tl + 0.34, [['speaker', 0.5, 0], ['maggi', -0.4, 0]]);
        poster(1.5, tl + 0.01, 1.3, 'x:posterFest');
        poster(2.3, tl + 0.01, 1.3, 'x:posterSpace');
        for (let i = 0; i < 12; i++) this.bbox(w, 1.0 + i * 0.25, 1.04 + i * 0.25, th - 0.04, th - 0.01, y0 + 2.45 - (i % 2) * 0.06, y0 + 2.49 - (i % 2) * 0.06, `e:${['#ffd54f', '#ff8a65', '#81d4fa'][i % 3]}`, { collide: false });
        this.npcSpots.senior = [{ at: this.bandWorld(w, 2.0, tl + 1.6, y0 + 0.05), yaw: this.yawOf(w, '+t'), sit: true }];
      }
    }
    if (v !== 'mine') this.tube(w, 2.1, (t0 + t1) / 2, y1);
    this.fan(w, 2.0, (t0 + t1) / 2, y1);
    sp.center = this.bandWorld(w, 2.0, (t0 + t1) / 2, y0);
    if (v === 'mine') this.legendBand('🛏', 'Your room', [0], w, 2.0, (t0 + t1) / 2);
  }

  // The heritage room's arched wall niche with two concrete shelves and a loft slab over it (2006 photo, tour
  // panorama), against the outer wall beside the window.
  alcove(w, t, y0) {
    const s1 = w.depth; const s0 = s1 - 0.32; const wd = 0.85; const ta = t; const tb = t + wd;
    const plaster = 't:plaster:#efe8d8'; const conc = 'c:#c9c6bc';
    for (const [a, b] of [[ta - 0.12, ta], [tb, tb + 0.12]]) this.bbox(w, s0, s1, a, b, y0, y0 + 2.15, plaster);
    this.bbox(w, s0, s1, ta - 0.12, tb + 0.12, y0 + 1.85, y0 + 2.15, plaster, { collide: false });
    this.bquad(w, s1 - 0.005, t + wd / 2, y0, wd, 1.85, '-s', 'c:#d9cfbb');
    // the arched head, as a disc above the opening's crown, and the shelves
    const [u, v] = w.map(s0 - 0.001, t + wd / 2);
    const disc = new THREE.CircleGeometry(wd / 2, 16, 0, Math.PI);
    disc.rotateY(Math.atan2(-w.ds[0], -w.ds[1])); disc.translate(u, y0 + 1.6, v); this.geo('c:#d9cfbb', disc);
    for (const yy of [0.75, 1.3]) this.bbox(w, s0 + 0.02, s1, ta, tb, y0 + yy, y0 + yy + 0.05, conc, { collide: false });
    this.bbox(w, s1 - 0.5, s1, ta - 0.12, tb + 0.12, y0 + 2.3, y0 + 2.36, conc, { collide: false });
    this.bbox(w, s0 + 0.04, s0 + 0.2, t + 0.15, t + 0.4, y0 + 0.8, y0 + 1.05, 'c:#c0392b', { collide: false });
    this.bbox(w, s0 + 0.04, s0 + 0.24, t + 0.5, t + 0.8, y0 + 1.35, y0 + 1.5, 'c:#2471a3', { collide: false });
  }

  // ---------- courtyards and outside ----------
  // Bare concrete courtyards (QT), big enough for a cricket game in one and football in the other
  // (or just football, in a Bhawan with one courtyard).
  buildCourtyards() {
    if (this.heritage && !this.mine) { this.buildGardens(); return; }
    const ev = this.ev;
    const along = Math.atan2(ev[0], ev[1]); const back = Math.atan2(-ev[0], -ev[1]);
    const across = (sgn) => Math.atan2(sgn * this.eu[0], sgn * this.eu[1]);
    // Krishna's courtyards are lawns with mature trees (SWD: "Green courtyard"; drone view); the others concrete
    for (const r of this.court) this.box(r.u0, r.u1, r.v0, r.v1, 0, 0.035, this.mine ? LAWN : 't:concrete:#dcd6ca', { collide: false });
    // markings stand a little proud of Krishna's lawn (which is drawn pulled forward, like the concrete)
    const lift = this.mine ? 0.03 : 0;
    const line = (u0, u1, v0, v1) => this.box(u0, u1, v0, v1, 0.035 + lift, 0.04 + lift, 'c:#f2f2ee', { collide: false });

    // cricket: a 22-yard pitch down the middle of the first courtyard, stumps at both ends
    if (this.cricket) {
      const { u: cu, v: cv } = this.cricket;
      const half = 10.06;
      this.box(cu - 1.5, cu + 1.5, cv - half - 1.3, cv + half + 1.3, 0.035, 0.045 + lift * 0.5, this.mine ? 'c:#c9b98f' : 'c:#b8ab90', { collide: false });
      for (const sgn of [-1, 1]) {
        const sv = cv + sgn * half;
        for (const du of [-0.11, 0, 0.11]) { this.cyl(cu + du, 0.045, sv, 0.018, 0.71, 'c:#f1e3c2', 6); }
        this.col(cu - 0.16, cu + 0.16, sv - 0.05, sv + 0.05, 0, 0.75);
        this.box(cu - 0.13, cu + 0.13, sv - 0.01, sv + 0.01, 0.755, 0.77, 'c:#f1e3c2', { collide: false });
        line(cu - 1.32, cu + 1.32, sv - sgn * 1.22 - 0.025, sv - sgn * 1.22 + 0.025); // popping crease
        line(cu - 1.32, cu + 1.32, sv - 0.025, sv + 0.025); // bowling crease
      }
      this.npcSpots.cricket = {
        bat: { at: this.world(cu + 0.25, cv - half + 1.3), yaw: along },
        bowl: { a: this.world(cu, cv + half + 7), b: this.world(cu - 0.3, cv + half - 0.5), speed: 2.6 },
        field: [{ at: this.world(cu - 9, cv - 2), yaw: across(1) }, { at: this.world(cu + 10, cv + 4), yaw: across(-1) }, { at: this.world(cu + 0.2, cv - half - 2.4), yaw: along }],
      };
      this.legend('🏏', 'Cricket (courtyard)', [0], cu, cv);
      const lc = this.world(cu, this.court[0].v0 + 2);
      this.campus.label('Courtyard · cricket', lc.x, 3.0, lc.z, { height: 0.42 });
    }

    // football: halfway line, centre circle and two small goals at the ends of the second courtyard
    const { u: fu, v: fv } = this.football;
    const c2 = this.court.at(-1);
    const fw = 16; const fl = c2.v1 - c2.v0 - 6;
    line(fu - fw, fu + fw, fv - 0.04, fv + 0.04);
    const ring = new THREE.RingGeometry(4.0, 4.09, 48); ring.rotateX(-Math.PI / 2); ring.translate(fu, 0.041 + lift, fv); this.geo('c:#f2f2ee', ring);
    for (const sgn of [-1, 1]) {
      const gv = fv + sgn * (fl / 2);
      line(fu - 5, fu + 5, gv - 0.04, gv + 0.04);
      for (const du of [-2.5, 2.5]) { this.cyl(fu + du, 0, gv, 0.06, 2.0, 'c:#fafafa', 8); this.col(fu + du - 0.08, fu + du + 0.08, gv - 0.08, gv + 0.08, 0, 2.0); }
      this.box(fu - 2.56, fu + 2.56, gv - 0.06, gv + 0.06, 1.94, 2.06, 'c:#fafafa', { collide: false });
      this.box(fu - 2.5, fu + 2.5, gv + sgn * 1.0 - 0.01, gv + sgn * 1.0 + 0.01, 0, 2.0, 'g:#f4f4f4', { collide: false });
    }
    const ball = new THREE.SphereGeometry(0.11, 12, 8); ball.translate(fu + 1.2, 0.15, fv + 0.6); this.geo('c:#f7f7f7', ball);
    this.npcSpots.football = [
      { a: this.world(fu - 6, fv - 8), b: this.world(fu - 2, fv + 6), speed: 3.2 },
      { a: this.world(fu + 7, fv + 9), b: this.world(fu + 1, fv - 5), speed: 3.0 },
      { a: this.world(fu - 9, fv + 4), b: this.world(fu + 4, fv + 3), speed: 3.4 },
      { a: this.world(fu, fv - fl / 2 + 1.2), b: this.world(fu + 1.8, fv - fl / 2 + 1.4), speed: 1.2 }, // goalkeeper
    ];
    this.legend('⚽', 'Football (courtyard)', [0], fu, fv);
    const lf = this.world(fu, c2.v1 - 2);
    this.campus.label('Courtyard · football', lf.x, 3.0, lf.z, { height: 0.42 });

    if (this.mine) this.badminton();
    // basketball hoop against the east arcade, facing into the second courtyard (not at Krishna: SWD lists
    // badminton and volleyball there)
    if (!this.mine) {
    const hu = c2.u1 - 1.0; const hv = fv;
    this.cyl(hu, 0, hv, 0.08, 3.0, 'm:#5c6670', 10); this.col(hu - 0.1, hu + 0.1, hv - 0.1, hv + 0.1, 0, 3);
    this.box(hu - 0.36, hu - 0.31, hv - 0.9, hv + 0.9, 2.9, 3.95, 'c:#f5f5f5', { collide: false });
    const hoop = new THREE.TorusGeometry(0.23, 0.015, 6, 20); hoop.rotateX(Math.PI / 2); hoop.translate(hu - 0.62, 3.05, hv); this.geo('c:#e65100', hoop);
    }

    // benches along the arcades, lamp posts in the corners
    for (const r of this.court) {
      for (const [u, v] of [[r.u0 + 1.6, (r.v0 + r.v1) / 2 - 12], [r.u0 + 1.6, (r.v0 + r.v1) / 2 + 12], [r.u1 - 1.6, (r.v0 + r.v1) / 2 + 12]]) {
        this.box(u - 0.25, u + 0.25, v - 0.9, v + 0.9, 0.42, 0.47, 't:wood:#8a6040', { collide: false }); this.col(u - 0.25, u + 0.25, v - 0.9, v + 0.9, 0, 0.47);
        this.box(u - 0.04, u + 0.04, v - 0.04, v + 0.04, 0, 0.42, 'c:#444', { collide: false });
      }
      for (const [u, v] of [[r.u0 + 1.2, r.v0 + 1.2], [r.u1 - 1.2, r.v1 - 1.2], [r.u0 + 1.2, r.v1 - 1.2], [r.u1 - 1.2, r.v0 + 1.2]]) {
        this.cyl(u, 0, v, 0.06, 3.2, 'c:#2f3437', 8); this.col(u - 0.08, u + 0.08, v - 0.08, v + 0.08, 0, 3.2);
        this.cyl(u, 3.2, v, 0.18, 0.25, 'e:#fff1c9', 10, 0.1);
      }
    }
    // one shade tree in a far corner of each playground, clear of the pitch, the goals and the players;
    // the campus tree builder plants them as [x, z, scale]
    const c1 = this.court[0];
    this.shadeTrees = (this.twoCourts ? [this.world(c1.u1 - 5.5, c1.v0 + 5.5), this.world(c2.u0 + 5.5, c2.v1 - 5.5)] : [this.world(c2.u0 + 5.5, c2.v1 - 5.5)]).map((p) => [p.x, p.z, 1.0]);
    if (this.mine) {
      // mature neem and khejri round the edges of both lawns, clear of the pitch, the goals and the players
      const more = [[c1.u0 + 5, c1.v0 + 5.5], [c1.u0 + 4.5, c1.v1 - 5], [c1.u1 - 4.5, c1.v1 - 5], [c1.u0 + 3.2, (c1.v0 + c1.v1) / 2 + 3],
        [c2.u0 + 4.5, c2.v0 + 6], [c2.u1 - 4.5, c2.v0 + 6], [c2.u1 - 4.5, c2.v1 - 6], [c2.u0 + 3.0, (c2.v0 + c2.v1) / 2 + 2], [c2.u1 - 3.0, (c2.v0 + c2.v1) / 2 - 6]];
      for (const [u, v] of more) { const p = this.world(u, v); this.shadeTrees.push([p.x, p.z, 1.25 + ((u * 7 + v) % 5) * 0.06]); }
    }
  }

  // The other Bhawans' courtyards are gardens (drone views; SWD): lawns with big trees, shrubs and one games court
  // each, or bare sand patches (Vyas, Vishwakarma), or paving with planters (Ram's south court). STYLE.courts.
  buildGardens() {
    const kinds = this.style.courts || [];
    this.shadeTrees = [];
    this.court.forEach((r, i) => {
      const kind = kinds[i] || 'trees';
      const cu = (r.u0 + r.u1) / 2; const cv = (r.v0 + r.v1) / 2;
      const keep = []; // where trees must not stand: [u0, u1, v0, v1]
      this.box(r.u0, r.u1, r.v0, r.v1, 0, 0.035, kind === 'paved' ? 't:concrete:#dcd6ca' : LAWN, { collide: false });
      // a cross of paths from the middle of each arcade, as worn into every lawn in the drone views
      // (not across a games court or a sand patch)
      if (kind === 'trees' || kind === 'tree' || kind === 'volleyball') {
        this.box(cu - 0.9, cu + 0.9, r.v0, r.v1, 0.035, 0.07, 't:paving:#cbbfa6', { collide: false });
        keep.push([cu - 2, cu + 2, r.v0, r.v1]);
        if (kind !== 'volleyball') { this.box(r.u0, cu - 0.9, cv - 0.9, cv + 0.9, 0.035, 0.07, 't:paving:#cbbfa6', { collide: false }); this.box(cu + 0.9, r.u1, cv - 0.9, cv + 0.9, 0.035, 0.07, 't:paving:#cbbfa6', { collide: false }); keep.push([r.u0, r.u1, cv - 2, cv + 2]); }
      }
      if (kind === 'basketball') keep.push(this.basketball(r));
      if (kind === 'badminton') { const at = (r.v1 - r.v0 - 13.4) / 2; this.badminton(r, at, true); keep.push([cu - 5, cu + 5, r.v0 + at - 2, r.v0 + at + 15.4]); }
      if (kind === 'volleyball') { keep.push(this.volleyball(r)); keep.push(this.smallGoal(r)); }
      if (kind === 'tree') keep.push(this.treePlatform(cu + 6, cv - 4, 1.9));
      if (kind === 'sandy') {
        const hw = Math.min(9, (r.u1 - r.u0) / 2 - 6); const hl = Math.min(13, (r.v1 - r.v0) / 2 - 6);
        this.box(cu - hw, cu + hw, cv - hl, cv + hl, 0.035, 0.055, SAND, { collide: false });
        keep.push([cu - hw - 2, cu + hw + 2, cv - hl - 2, cv + hl + 2]);
        keep.push(this.smallGoal(r, cv - hl + 1.2, cu));
      }
      if (kind === 'paved') {
        // square planters with small trees, in two rows
        for (const du of [-0.3, 0.3]) for (const dv of [-0.3, 0, 0.3]) {
          const u = cu + du * (r.u1 - r.u0); const v = cv + dv * (r.v1 - r.v0);
          this.box(u - 1.1, u + 1.1, v - 1.1, v + 1.1, 0, 0.45, 'c:#c9bfa8');
          this.box(u - 0.95, u + 0.95, v - 0.95, v + 0.95, 0.45, 0.47, 'c:#5d4632', { collide: false });
          const p = this.world(u, v); this.shadeTrees.push([p.x, p.z, 0.75]);
        }
        return;
      }
      // trees round the lawn, clear of the paths and the courts
      const free = (u, v) => !keep.some(([a, b, c, d]) => u > a - 2.5 && u < b + 2.5 && v > c - 2.5 && v < d + 2.5);
      const step = kind === 'trees' || kind === 'sandy' ? 7.5 : 10;
      let n = 0;
      for (const inset of kind === 'trees' ? [4.2, 11] : [4.2]) {
        for (let u = r.u0 + inset; u <= r.u1 - inset + 0.01; u += step) for (const v of [r.v0 + inset, r.v1 - inset]) if (free(u, v)) { const p = this.world(u, v); this.shadeTrees.push([p.x, p.z, 1.1 + ((n++ * 7) % 5) * 0.08]); }
        for (let v = r.v0 + inset + step; v < r.v1 - inset - 2; v += step) for (const u of [r.u0 + inset, r.u1 - inset]) if (free(u, v)) { const p = this.world(u, v); this.shadeTrees.push([p.x, p.z, 1.1 + ((n++ * 7) % 5) * 0.08]); }
      }
      // shrubs along the arcade
      for (let u = r.u0 + 2.5; u < r.u1 - 2; u += 3.2) if (free(u, r.v1 - 1.2)) { const g = new THREE.SphereGeometry(0.55, 8, 6); g.scale(1, 0.7, 1); g.translate(u, 0.3, r.v1 - 1.2); this.geo('c:#557f3a', g); }
    });
    // benches along the arcades, lamp posts (floodlit at night) in the corners
    for (const r of this.court) {
      for (const [u, v] of [[r.u0 + 1.6, (r.v0 + r.v1) / 2 - 8], [r.u1 - 1.6, (r.v0 + r.v1) / 2 + 8]]) {
        this.box(u - 0.25, u + 0.25, v - 0.9, v + 0.9, 0.42, 0.47, 't:wood:#8a6040', { collide: false }); this.col(u - 0.25, u + 0.25, v - 0.9, v + 0.9, 0, 0.47);
        this.box(u - 0.04, u + 0.04, v - 0.04, v + 0.04, 0, 0.42, 'c:#444', { collide: false });
      }
      for (const [u, v] of [[r.u0 + 1.2, r.v0 + 1.2], [r.u1 - 1.2, r.v1 - 1.2], [r.u0 + 1.2, r.v1 - 1.2], [r.u1 - 1.2, r.v0 + 1.2]]) {
        this.cyl(u, 0, v, 0.07, 4.2, 'c:#2f3437', 8); this.col(u - 0.08, u + 0.08, v - 0.08, v + 0.08, 0, 4.2);
        this.box(u - 0.3, u + 0.3, v - 0.12, v + 0.12, 4.1, 4.3, 'e:#fff1c9', { collide: false });
      }
    }
    const lc = this.world((this.court[0].u0 + this.court[0].u1) / 2, this.court[0].v0 + 2);
    this.campus.label('Courtyard', lc.x, 3.0, lc.z, { height: 0.42 });
  }

  // Gandhi's basketball court (SWD; drone: a marked hard court with keys), across the courtyard: pad, lines, hoops.
  basketball(r) {
    const cu = (r.u0 + r.u1) / 2; const cv = (r.v0 + r.v1) / 2; const hu = Math.min(14, (r.u1 - r.u0) / 2 - 2.5); const hv = 7.5;
    this.box(cu - hu - 1, cu + hu + 1, cv - hv - 1, cv + hv + 1, 0.035, PAD, COURT, { collide: false });
    const y = PAD; const line = (u0, u1, v0, v1) => this.box(u0, u1, v0, v1, y, y + 0.015, 'c:#f4f4ef', { collide: false });
    line(cu - hu, cu + hu, cv - hv, cv - hv + 0.05); line(cu - hu, cu + hu, cv + hv - 0.05, cv + hv);
    line(cu - hu, cu - hu + 0.05, cv - hv, cv + hv); line(cu + hu - 0.05, cu + hu, cv - hv, cv + hv); line(cu - 0.025, cu + 0.025, cv - hv, cv + hv);
    const ring = new THREE.RingGeometry(1.75, 1.8, 40); ring.rotateX(-Math.PI / 2); ring.translate(cu, y + 0.016, cv); this.geo('c:#f4f4ef', ring);
    for (const sgn of [-1, 1]) {
      const e = cu + sgn * hu; const k = e - sgn * 5.8;
      line(Math.min(e, k), Math.max(e, k), cv - 2.45, cv - 2.4); line(Math.min(e, k), Math.max(e, k), cv + 2.4, cv + 2.45);
      line(k - 0.025, k + 0.025, cv - 2.45, cv + 2.45);
      const arc = new THREE.RingGeometry(1.75, 1.8, 24, 1, sgn > 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI); arc.rotateX(-Math.PI / 2); arc.translate(k, y + 0.016, cv); this.geo('c:#f4f4ef', arc);
      // the hoop on a post behind the baseline
      const pu = e + sgn * 0.9;
      this.cyl(pu, 0, cv, 0.08, 3.0, 'm:#5c6670', 10); this.col(pu - 0.1, pu + 0.1, cv - 0.1, cv + 0.1, 0, 3);
      this.box(pu - sgn * 0.36, pu - sgn * 0.31, cv - 0.9, cv + 0.9, 2.9, 3.95, 'c:#f5f5f5', { collide: false });
      const hoop = new THREE.TorusGeometry(0.23, 0.015, 6, 20); hoop.rotateX(Math.PI / 2); hoop.translate(pu - sgn * 0.62, 3.05, cv); this.geo('c:#e65100', hoop);
    }
    this.legend('🏀', 'Basketball (courtyard)', [0], cu, cv);
    return [cu - hu - 1, cu + hu + 1, cv - hv - 1, cv + hv + 1];
  }

  // Shankar's concrete volleyball court against the west arcade of the north courtyard (drone zoom).
  volleyball(r) {
    const cu = r.u0 + 7.5; const cv = (r.v0 + r.v1) / 2; const hu = 4.5; const hv = Math.min(9, (r.v1 - r.v0) / 2 - 3);
    this.box(cu - hu - 1.5, cu + hu + 1.5, cv - hv - 1.5, cv + hv + 1.5, 0.035, PAD, COURT, { collide: false });
    const y = PAD; const line = (u0, u1, v0, v1) => this.box(u0, u1, v0, v1, y, y + 0.015, 'c:#f4f4ef', { collide: false });
    line(cu - hu, cu + hu, cv - hv, cv - hv + 0.05); line(cu - hu, cu + hu, cv + hv - 0.05, cv + hv);
    line(cu - hu, cu - hu + 0.05, cv - hv, cv + hv); line(cu + hu - 0.05, cu + hu, cv - hv, cv + hv);
    for (const dv of [-3, 0, 3]) line(cu - hu, cu + hu, cv + dv - 0.025, cv + dv + 0.025);
    for (const du of [-hu - 0.5, hu + 0.5]) { this.cyl(cu + du, 0, cv, 0.05, 2.55, 'm:#6c757d', 8); this.col(cu + du - 0.07, cu + du + 0.07, cv - 0.07, cv + 0.07, 0, 2.55); }
    this.box(cu - hu - 0.5, cu + hu + 0.5, cv - 0.006, cv + 0.006, 1.55, 2.43, 'g:#2b2b2b', { collide: false });
    this.box(cu - hu - 0.5, cu + hu + 0.5, cv - 0.015, cv + 0.015, 2.38, 2.44, 'c:#f4f4ef', { collide: false });
    this.legend('🏐', 'Volleyball (courtyard)', [0], cu, cv);
    return [cu - hu - 1.5, cu + hu + 1.5, cv - hv - 1.5, cv + hv + 1.5];
  }

  // A small football goal at the courtyard's south end (Shankar's north court; the sand patches).
  smallGoal(r, v = r.v1 - 3, u = (r.u0 + r.u1) / 2 + 6) {
    for (const du of [-1.5, 1.5]) { this.cyl(u + du, 0, v, 0.05, 1.5, 'c:#fafafa', 8); this.col(u + du - 0.07, u + du + 0.07, v - 0.07, v + 0.07, 0, 1.5); }
    this.box(u - 1.55, u + 1.55, v - 0.05, v + 0.05, 1.45, 1.55, 'c:#fafafa', { collide: false });
    this.box(u - 1.5, u + 1.5, v + 0.8 - 0.01, v + 0.8 + 0.01, 0, 1.45, 'g:#f4f4f4', { collide: false });
    return [u - 2, u + 2, v - 2, v + 1];
  }

  // A big old tree inside a round raised platform you can sit on (Shankar's and Vyas's north courts).
  treePlatform(u, v, rad) {
    this.cyl(u, 0, v, rad, 0.45, 'c:#c9bda3', 24);
    this.cyl(u, 0.45, v, rad + 0.05, 0.06, 'c:#e6dcc6', 24);
    this.cyl(u, 0.51, v, rad - 0.35, 0.02, 'c:#6d5640', 20);
    for (let a = 0; a < 8; a++) { const s = Math.sin((a * Math.PI) / 4) * rad * 0.82; const c = Math.cos((a * Math.PI) / 4) * rad * 0.82; this.col(u + c - 0.45, u + c + 0.45, v + s - 0.45, v + s + 0.45, 0, 0.51, true); }
    this.col(u - 0.5, u + 0.5, v - 0.5, v + 0.5, 0, 3.0);
    const p = this.world(u, v); this.shadeTrees.push([p.x, p.z, 1.7]);
    this.legend('🌳', 'Tree platform', [0], u, v);
    return [u - rad - 1, u + rad + 1, v - rad - 1, v + rad + 1];
  }

  // A badminton court on Krishna's first lawn, at its north end: lines, posts and the net. (The other Bhawans put
  // theirs on a concrete pad, `at` metres down from the courtyard's north edge.)
  badminton(c1 = this.court[0], at = 1.8, pad = false) {
    const cu = (c1.u0 + c1.u1) / 2; const v0 = c1.v0 + at; const v1 = v0 + 13.4; const vm = (v0 + v1) / 2;
    if (pad) this.box(cu - 3.9, cu + 3.9, v0 - 0.9, v1 + 0.9, 0.035, PAD, COURT, { collide: false });
    const ly = pad ? PAD : 0.06;
    const line = (u0, u1, a, b) => this.box(u0, u1, a, b, ly, ly + (pad ? 0.015 : 0.008), 'c:#f4f4ef', { collide: false });
    for (const du of [-3.05, -2.59, 2.59, 3.05]) line(cu + du - 0.02, cu + du + 0.02, v0, v1);
    for (const v of [v0, v0 + 0.76, vm - 1.98, vm + 1.98, v1 - 0.76, v1]) line(cu - 3.05, cu + 3.05, v - 0.02, v + 0.02);
    line(cu - 0.02, cu + 0.02, v0, vm - 1.98); line(cu - 0.02, cu + 0.02, vm + 1.98, v1);
    for (const du of [-3.1, 3.1]) { this.cyl(cu + du, 0, vm, 0.03, 1.55, 'm:#6c757d', 8); this.col(cu + du - 0.05, cu + du + 0.05, vm - 0.05, vm + 0.05, 0, 1.55); }
    this.box(cu - 3.1, cu + 3.1, vm - 0.005, vm + 0.005, 0.9, 1.52, 'g:#2b2b2b', { collide: false });
    this.box(cu - 3.1, cu + 3.1, vm - 0.012, vm + 0.012, 1.48, 1.53, 'c:#f4f4ef', { collide: false });
    this.legend('🏸', 'Badminton (courtyard)', [0], cu, vm);
  }

  // Porch at the entrance and the cycle stand beside it.
  buildOutside() {
    const ve = this.ve;
    if (!this.heritage) {
      for (const dv of [-1.85, 1.85]) this.box(-1.45, -0.95, ve + dv - 0.25, ve + dv + 0.25, 0, 3.0, 't:plasterWhite:#ecd8b8');
      this.box(-1.6, 0, ve - 2.2, ve + 2.2, 3.0, 3.35, 't:plasterWhite:#ecd8b8', { collide: false });
      this.box(-1.5, -0.1, ve - 1.6, ve + 1.6, 0, 0.12, 't:concrete:#d8d2c4', { collide: false });
    }
    const v0 = ve + 4.5; const v1 = ve + 13.5;
    for (const [u, v] of [[-4.2, v0], [-4.2, v1], [-1.4, v0], [-1.4, v1]]) { this.box(u - 0.06, u + 0.06, v - 0.06, v + 0.06, 0, 2.4, 'm:#7b8288'); }
    this.box(-4.5, -1.1, v0 - 0.3, v1 + 0.3, 2.4, 2.48, 'c:#5b7c99', { collide: false });
    this.col(-4.5, -1.1, v0 - 0.2, v1 + 0.2, 0, 1.0);
    const r = rng(23);
    const cols = ['#c62828', '#1565c0', '#2e7d32', '#212121', '#6a1b9a', '#ef6c00'];
    // Krishna: more rows of bicycles along the facade, north of the entrance bay (2006 photo, drone view)
    const rows = [[v0 + 0.3, v1]];
    if (this.mine) { rows.push([ve - 19, ve - 8.2]); this.col(-3.4, -2.2, ve - 19, ve - 8.2, 0, 0.9); }
    for (const [ra, rb] of rows) for (let v = ra; v < rb; v += 0.75) {
      const col = cols[Math.floor(r() * cols.length)];
      for (const du of [-0.55, 0.55]) {
        const tor = new THREE.TorusGeometry(0.33, 0.025, 6, 16); // wheel in the u-y plane: the cycle points away from the wall
        tor.translate(-2.8 + du, 0.35, v); this.geo('c:#1b1b1b', tor);
      }
      this.box(-3.35, -2.25, v - 0.02, v + 0.02, 0.55, 0.6, `c:${col}`, { collide: false });
      this.box(-3.0, -2.95, v - 0.02, v + 0.02, 0.35, 0.85, `c:${col}`, { collide: false });
      this.box(-2.3, -2.25, v - 0.25, v + 0.25, 0.95, 0.98, 'c:#333', { collide: false });
    }
    const p = this.world(-2.8, ve + 9);
    this.campus.label('Cycle parking', p.x, 2.9, p.z, { height: 0.38 });
    // the name over the door (the heritage bays carry it in Devanagari too, so it floats over the attic)
    if (!this.mine) { const e = this.world(this.heritage ? -3.2 : -2.4, ve); this.campus.label(this.name, e.x, this.heritage ? 9.6 : 4.2, e.z, { height: 0.7, bg: 'rgba(60,50,40,0.9)' }); }
    // the guard's spot and where batchmates gather in the evening
    this.npcSpots.lobbyChat = [{ at: this.world(1.2, ve - 1.2), yaw: this.entrance.yaw + Math.PI / 2 }, { at: this.world(1.2, ve + 0.1), yaw: this.entrance.yaw - Math.PI / 2 }];
  }

  // ---------- Krishna Bhawan's outside ----------
  // A vertical quad in the local frame from p0 = [u, v] to p1, y0 to y1; it faces the side where, walking from p0
  // to p1, the outside is on your left. The texture repeats `rep` times across.
  quad(key, p0, p1, y0, y1, rep = 1) {
    const g = new THREE.BufferGeometry();
    const P = [[p0[0], y0, p0[1]], [p1[0], y0, p1[1]], [p1[0], y1, p1[1]], [p0[0], y1, p0[1]]];
    const idx = [0, 1, 2, 0, 2, 3];
    const UV = [[0, 0], [rep, 0], [rep, 1], [0, 1]];
    const dx = p1[0] - p0[0]; const dz = p1[1] - p0[1]; const l = Math.hypot(dx, dz);
    const n = [-dz / l, 0, dx / l];
    g.setAttribute('position', new THREE.Float32BufferAttribute(idx.flatMap((i) => P[i]), 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(idx.flatMap(() => n), 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(idx.flatMap((i) => UV[i]), 2));
    this.geo(key, g);
  }

  // The outer face: cream render over the campus wall, bay by bay (arched grilled windows below, rectangular
  // openings above), with a plinth, a string course at the first floor and a moulded cornice under the parapet.
  buildFacade() {
    const { W, L, ve } = this; const o = 0.1; const h = FLOORS * FH; const st = this.style;
    const b0 = ve - 6.65; const b1 = b0 + ENTRANCE_W;
    const face = (side, p0, p1) => { const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]); this.quad(this.mine ? 'x:kfacade' : `x:fac:${st.face[side]}`, p0, p1, 0, h, len / MOD); };
    face('W', [-o, -o], [-o, b0]); face('W', [-o, b1], [-o, L + o]); // west, either side of the entrance bay
    face('E', [W + o, L + o], [W + o, -o]); // east
    face('N', [W + o, -o], [-o, -o]); // north
    face('S', [-o, L + o], [W + o, L + o]); // south
    const trim = 'c:#f4efe3'; const plinth = 'c:#d3c199';
    const band = (y0, y1, d, key, skipBay) => {
      if (skipBay) { this.box(-d, 0, -d, b0, y0, y1, key, { collide: false }); this.box(-d, 0, b1, L + d, y0, y1, key, { collide: false }); } else this.box(-d, 0, -d, L + d, y0, y1, key, { collide: false });
      this.box(W, W + d, -d, L + d, y0, y1, key, { collide: false });
      this.box(0, W, -d, 0, y0, y1, key, { collide: false }); this.box(0, W, L, L + d, y0, y1, key, { collide: false });
    };
    band(0, 0.5, 0.2, plinth, true);
    band(FH - 0.14, FH + 0.12, 0.2, trim, true);
    band(h - 0.32, h, 0.4, trim, false);
    // Shankar, Vyas and Vishwakarma: a thin maroon line under the cornice (drone views)
    band(h - 0.42, h - 0.32, 0.28, st.maroon ? 'c:#8a3b2e' : 'c:#e2d6ba', false);
    // the parapet's coping
    band(h + 0.95, h + 1.05, 0.12, trim, false);
  }

  // The entrance bay (Krishna Bhawan, 2006 photo): it projects 2.4 m from the west face and rises a storey and a
  // bit above the parapet. Below, a round-arched window, the arch with the green collapsible gate, the open arch
  // and another window, with rosettes in the spandrels; the Devanagari name band over them; above, an open loggia
  // with paired Tuscan columns and jaali panels in its parapet. Two steps up to the porch, one down into the lobby.
  // The other Bhawans get the same bay with their own name band and arches: Gandhi's with a loggia (drone), the
  // rest as a closed block with tall first-floor windows (Shankar's, drone zoom; Ram's and Budh's are not seen).
  buildEntranceBay() {
    const ve = this.ve; const b0 = ve - 6.65; const b1 = b0 + ENTRANCE_W; const f = -2.4; const f1 = f + 0.3;
    const st = this.style; const block = st.bay === 'block';
    const cream = st.maroon ? 't:plaster:#efe4c6' : 't:plaster:#eddcb5'; const white = 'c:#f6f1e6';
    const front = this.mine ? 'x:kbay' : `x:front:${this.name}`; const fh = block ? 8.6 : 4.4;
    // returns (side walls), full height up to the raised attic
    for (const [v0, v1] of [[b0, b0 + 0.35], [b1 - 0.35, b1]]) this.box(f, 0, v0, v1, 0, 8.45, cream);
    // ground floor: solid stretches between the two arches (the windows are painted on), the arches open
    const gate = this.mine ? [ve - 4.9, ve - 2.6] : [b0 + 2.6, b0 + 4.9]; const door = [ve - 1.15, ve + 1.15];
    for (const [v0, v1] of [[b0 + 0.35, gate[0]], [gate[1], door[0]], [door[1], b1 - 0.35]]) this.box(f, f1, v0, v1, 0, 3.3, cream);
    this.quad(front, [f - 0.02, b0], [f - 0.02, b1], 0, fh);
    this.quad(front, [f1 + 0.02, b1], [f1 + 0.02, b0], 0, block ? 3.3 : 4.4);
    // the gate, shut
    this.quad('x:kgate', [f + 0.15, gate[0]], [f + 0.15, gate[1]], 0.28, 2.45);
    this.col(f, f1, gate[0], gate[1], 0, 2.5);
    // steps, threshold and porch floor (the lobby inside is a step down)
    const stone = 't:concrete:#cfc8b8';
    this.box(f - 0.9, f - 0.45, ve - 5.4, ve + 1.8, 0, 0.14, stone, { walkable: true });
    this.box(f - 0.45, f, ve - 5.4, ve + 1.8, 0, 0.28, stone, { walkable: true });
    this.box(f, 0, b0 + 0.35, b1 - 0.35, 0, 0.28, 't:terrazzo:#d8d2c2', { walkable: true });
    // the vestibule's walls (pale distemper), the loggia floor over it, a tube light
    const blue = 'c:#e3e9e6';
    this.quad(blue, [-0.04, b0 + 0.35], [-0.04, ve - 1.5], 0.28, 3.1); this.quad(blue, [-0.04, ve + 1.5], [-0.04, b1 - 0.35], 0.28, 3.1);
    this.quad(blue, [-0.04, ve - 1.5], [-0.04, ve + 1.5], 2.7, 3.1);
    this.box(f, 0, b0 + 0.35, b1 - 0.35, 3.1, 3.3, 'c:#ece7da', { collide: false });
    this.box(-0.9, -0.82, ve - 0.6, ve + 0.6, 3.04, 3.1, 'e:#fffaf0', { collide: false });
    if (st.forecourt) this.forecourt(b0, b1, f);
    if (block) {
      // a closed first floor with three tall windows (painted) on small sills, then the attic
      this.box(f, 0, b0 + 0.35, b1 - 0.35, 3.3, 8.45, cream, { collide: false });
      for (const vc of [b0 + 2.3, b0 + 5.2, b0 + 8.1]) this.box(f - 0.1, f, vc - 0.85, vc + 0.85, 3.72, 3.8, white, { collide: false });
      this.box(f - 0.12, f + 0.3, b0 - 0.05, b1 + 0.05, 6.85, 6.97, white, { collide: false });
      this.box(f - 0.1, 0.1, b0 - 0.1, b1 + 0.1, 8.45, 8.6, white, { collide: false });
      this.col(f, 0, b0, b1, 3.3, 8.6);
      this.legend('🚲', 'Cycle rows', [0], -2.8, ve - 13);
      return;
    }
    // loggia: parapet with coping, paired columns, back wall, ceiling light, entablature
    this.box(f, f + 0.2, b0 + 0.35, b1 - 0.35, 3.3, 4.3, cream, { collide: false });
    this.box(f - 0.05, f + 0.25, b0, b1, 4.3, 4.4, white, { collide: false });
    for (const vc of [b0 + 0.9, ve - 1.45, b1 - 0.9, b0 + 3.0, b1 - 3.0]) {
      for (const dv of [-0.22, 0.22]) {
        const v = vc + dv; const u = f + 0.12;
        this.box(u - 0.17, u + 0.17, v - 0.17, v + 0.17, 4.4, 4.55, white, { collide: false });
        this.cyl(u, 4.55, v, 0.13, 1.55, white, 12, 0.11);
        this.box(u - 0.17, u + 0.17, v - 0.17, v + 0.17, 6.1, 6.22, white, { collide: false });
      }
    }
    this.quad('x:loggiaBack', [-0.04, b0 + 0.35], [-0.04, b1 - 0.35], 3.3, 6.4);
    this.box(-1.3, -1.22, ve - 0.6, ve + 0.6, 6.34, 6.4, 'e:#fffaf0', { collide: false });
    this.box(f, 0, b0 + 0.35, b1 - 0.35, 6.4, 6.6, 'c:#ece7da', { collide: false });
    this.box(f - 0.05, f + 0.3, b0, b1, 6.22, 6.95, cream, { collide: false });
    this.box(f - 0.12, f + 0.3, b0 - 0.05, b1 + 0.05, 6.85, 6.97, white, { collide: false });
    // the raised attic over the bay, with its coping
    this.box(f, 0, b0, b1, 6.95, 8.45, cream, { collide: false });
    this.box(f - 0.1, 0.1, b0 - 0.1, b1 + 0.1, 8.45, 8.6, white, { collide: false });
    this.col(f, 0, b0, b1, 6.6, 8.6);
    this.legend('🚲', 'Cycle rows', [0], -2.8, ve - 13);
  }

  // Shankar's paved red forecourt in front of the entrance block, with a planter (drone zoom); Vyas and Vishwakarma
  // have the same block, so they get it too.
  forecourt(b0, b1, f) {
    const v0 = b0 - 1.5; const v1 = b1 + 1.5; const u0 = f - 8.5;
    this.box(u0, f, v0, v1, 0, 0.03, PAVING, { collide: false });
    this.box(u0, u0 + 0.12, v0, v1, 0, 0.12, 'c:#d9cdb4', { collide: false }); // kerb
    // the planter: a square of red sandstone round a clipped bush
    const pu = f - 5.6; const pv = b0 + 1.2;
    this.box(pu - 0.8, pu + 0.8, pv - 0.8, pv + 0.8, 0, 0.5, 'c:#b06a52');
    this.box(pu - 0.66, pu + 0.66, pv - 0.66, pv + 0.66, 0.5, 0.52, 'c:#5d4632', { collide: false });
    const bush = new THREE.SphereGeometry(0.62, 10, 7); bush.scale(1, 0.75, 1); bush.translate(pu, 0.85, pv); this.geo('c:#4f7d35', bush);
  }

  // Square stair-head rooms (mumties) on the roof over every stair core, with small arched jaali openings; the main
  // one (built with the roof) is open onto the terrace, the others are locked. Two carry black water tanks.
  buildMumties() {
    const y = FLOORS * FH;
    let i = 0;
    for (const sp of this.spaces) {
      if (sp.k !== 0 || !(sp.type === 'core' || (sp.type === 'stair' && !sp.roof))) continue;
      const w = this.bandOf(sp.wing); const { t0, t1 } = sp; const s0 = 0; const s1 = w.depth;
      this.bbox(w, s0, s1, t0, t1, y, y + 2.5, 't:plaster:#ebe3cf');
      this.bbox(w, s0 - 0.12, s1 + 0.12, t0 - 0.12, t1 + 0.12, y + 2.5, y + 2.68, 'c:#f4efe3', { collide: false });
      const tc = (t0 + t1) / 2;
      this.bquad(w, s0 - 0.01, tc, y, Math.min(2.5, t1 - t0), 2.5, '-s', 'x:mumty');
      this.bquad(w, s1 + 0.01, tc, y, Math.min(2.5, t1 - t0), 2.5, '+s', 'x:mumty');
      if (i++ % 3 === 0) for (const dt of [-0.8, 0.8]) this.bcyl(w, (s0 + s1) / 2, tc + dt, y + 2.68, 0.55, 1.0, 'c:#1f2326', 14);
    }
  }

  // Roof equipment seen in the drone views: Gandhi's and Budh's cluster of about eight black water tanks on a raised
  // stand over the middle wing, and Ram's taller finned block on the north wing.
  buildRoofExtras() {
    const st = this.style; const y = FLOORS * FH; const { W } = this;
    if (st.tanks && this.wings.M && !this.mine) {
      const vc = (this.mc0 - SCREEN + this.vm + this.WD / 2) / 2; const uc = W / 2 + 6;
      const n = st.tanks; const cols = Math.ceil(n / 2);
      this.box(uc - cols * 0.75, uc + cols * 0.75, vc - 1.6, vc + 1.6, y + 0.7, y + 0.85, 'c:#8d9296');
      for (const du of [-cols * 0.75 + 0.15, cols * 0.75 - 0.15]) for (const dv of [-1.45, 1.45]) this.box(uc + du - 0.08, uc + du + 0.08, vc + dv - 0.08, vc + dv + 0.08, y, y + 0.7, 'm:#6c757d');
      for (let i = 0; i < n; i++) this.cyl(uc - cols * 0.75 + 0.75 + (i % cols) * 1.5, y + 0.85, vc + (i < cols ? -0.75 : 0.75), 0.62, 1.2, 'c:#1f2326', 14);
      this.col(uc - cols * 0.75, uc + cols * 0.75, vc - 1.6, vc + 1.6, y, y + 2.05);
    }
    if (st.tower) {
      // a square block standing about 4 m over the roof, its faces ribbed with vertical fins
      const uc = W / 2; const vc = this.WD / 2 + 0.15; const hw = 2.2;
      this.box(uc - hw, uc + hw, vc - hw * 0.9, vc + hw * 0.9, y, y + 4.2, 't:plaster:#ece4d0');
      this.box(uc - hw - 0.15, uc + hw + 0.15, vc - hw * 0.9 - 0.15, vc + hw * 0.9 + 0.15, y + 4.2, y + 4.4, 'c:#f4efe3', { collide: false });
      for (let k = 0; k < 7; k++) {
        const u = uc - hw + 0.35 + (k * (2 * hw - 0.7)) / 6;
        for (const sgn of [-1, 1]) this.box(u - 0.06, u + 0.06, vc + sgn * hw * 0.9 - (sgn > 0 ? 0 : 0.35), vc + sgn * hw * 0.9 + (sgn > 0 ? 0.35 : 0), y + 0.4, y + 4.2, 'c:#e4dac4', { collide: false });
      }
    }
  }

  // ---------- queries ----------
  treeOk(x, z) {
    const [u, v] = this.local(x, z);
    if (u > -2 && u < this.W + 2 && v > -2 && v < this.L + 2) return false; // the building and its concrete courtyards
    if (u > (this.style?.forecourt ? -12 : -8) && u < 0 && v > this.ve - (this.heritage ? 20 : 8) && v < this.ve + 16) return false; // porch and cycle stand
    return true;
  }

  // 'hostelroom' in your room, 'hostel' anywhere else inside, null outside and in the courtyards.
  roomAt(x, z, y = null) {
    const [u, v] = this.local(x, z);
    if (u < 0.2 || u > this.W - 0.2 || v < 0.2 || v > this.L - 0.2) return null;
    if (this.court.some((r) => u > r.u0 && u < r.u1 && v > r.v0 && v < r.v1)) return null;
    const m = this.myRoom;
    if (m) {
      const k = y === null ? 0 : Math.floor((y + 0.5) / FH);
      const [s, t] = this.toBand(m.w, u, v);
      if (k === m.k && s > -0.05 && s < m.w.depth && t > m.t0 && t < m.t1) return 'hostelroom';
    }
    return 'hostel';
  }

  toBand(w, u, v) {
    const o = w.map(0, 0);
    const du = u - o[0]; const dv = v - o[1];
    return [du * w.ds[0] + dv * w.ds[1], du * w.dt[0] + dv * w.dt[1]];
  }

  // How far (x, z) is outside the building's footprint, in metres (0 inside).
  distance(x, z) {
    const [u, v] = this.local(x, z);
    return Math.hypot(Math.max(0, -u, u - this.W), Math.max(0, -v, v - this.L));
  }

  update(dt, playerPos = null) {
    this.time += dt;
    if (playerPos) {
      // from outside, the facade hides the interior except through the entrance
      let near = this.distance(playerPos.x, playerPos.z) < 15 && playerPos.y < 30;
      // the outer faces are opaque (painted windows), so from outside only the entrance bay looks in
      if (near && this.heritage) {
        const [u, v] = this.local(playerPos.x, playerPos.z);
        const inside = u > -0.2 && u < this.W + 0.2 && v > -0.2 && v < this.L + 0.2;
        near = inside || (u < 0 && Math.abs(v - this.ve) < 14);
      }
      this.g.visible = near;
    }
    if (this.ttBall && this.ttBall.visible) {
      const [a, b] = this.ttEnds;
      const p = (this.time % 1.4) / 1.4; const f = p < 0.5 ? p * 2 : 2 - p * 2;
      this.ttBall.position.set(a.x + (b.x - a.x) * f, 0.8 + Math.sin(Math.PI * ((f * 2) % 1)) * 0.3, a.z + (b.z - a.z) * f);
    }
  }

  setTV(on) {
    this.tvOn = on;
    this.tvMat.map = on ? this.tvTex.on : this.tvTex.off;
    this.tvMat.emissiveMap = this.tvMat.map;
    this.tvMat.emissiveIntensity = on ? 0.85 : 0;
    this.tvMat.needsUpdate = true;
    return on;
  }

  toggleDoor(i) {
    const d = this.doors[i];
    d.set(!d.open);
    return d.open;
  }

  toggleAlmirah() {
    const a = this.almirah;
    a.open = !a.open;
    a.pivot.rotation.y = a.base + (a.open ? -1.6 : 0);
    return a.open;
  }

  setMyLight(on) {
    this.lightOn = on;
    this.myTube.emissiveIntensity = on ? 1.4 : 0;
    return on;
  }
}
