// Krishna Bhawan, walk-in. Two floors of corridors round two courtyards, stairs, your room, a few lived-in
// rooms, the common room, washrooms, a laundry, the entrance lobby (security desk, vending machine, water cooler,
// notice board) and a roof terrace.
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

export const FH = 3.3; // floor height, the same as the hostel facade texture
export const FLOORS = 2; // BITS Pilani boys' Bhawans: ground floor, first floor and the roof
const BAY = 3.4; // one room / one facade bay
const DEPTH = 4.2; // room depth
const T = 0.25; // partition
const OUT = 0.3; // outer wall
const COR = 2.8; // corridor width
const SCREEN = 0.3; // arch screen on the courtyard side
const WD = OUT + DEPTH + T + COR + SCREEN; // wing depth, 7.85
const SLAB = 0.2;
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
function bayTexture() {
  return canvas(512, 512, (g) => {
    const W = 512; const H = 512; const m = W / BAY; const y = (h) => H - h * (H / (FH - SLAB));
    g.fillStyle = '#f3f0e8'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#e6d6b2'; g.fillRect(0, y(1.0), W, H - y(1.0));
    g.fillStyle = '#b89a6a'; g.fillRect(0, y(1.0), W, 3);
    // door
    g.fillStyle = '#9a7a4f'; g.fillRect(0.3 * m, y(2.16), 1.0 * m, y(0) - y(2.16));
    g.fillStyle = '#d8b987'; g.fillRect(0.36 * m, y(2.1), 0.88 * m, y(0) - y(2.1));
    g.fillStyle = '#cfae7c'; g.fillRect(0.44 * m, y(1.95), 0.72 * m, y(1.2) - y(1.95));
    g.fillStyle = '#b9bec4'; g.fillRect(1.12 * m, y(1.08), 0.05 * m, y(0.88) - y(1.08));
    g.fillStyle = '#8f9399'; g.fillRect(1.06 * m, y(0.98), 0.12 * m, 4);
    // corridor window with bars
    g.fillStyle = '#efe7d6'; g.fillRect(1.75 * m, y(2.25), 1.2 * m, y(1.05) - y(2.25));
    g.fillStyle = '#3a4550'; g.fillRect(1.82 * m, y(2.18), 1.06 * m, y(1.12) - y(2.18));
    g.fillStyle = '#5c6b78'; g.fillRect(1.82 * m, y(2.18), 1.06 * m, 6);
    g.strokeStyle = '#d9d4c8'; g.lineWidth = 4;
    for (let k = 1; k < 5; k++) { const x = (1.82 + (1.06 * k) / 5) * m; g.beginPath(); g.moveTo(x, y(2.18)); g.lineTo(x, y(1.12)); g.stroke(); }
    // jaali ventilator above the door
    g.fillStyle = '#e9e1cf'; g.fillRect(0.4 * m, y(2.75), 0.8 * m, y(2.4) - y(2.75));
    g.fillStyle = '#9b927f';
    for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) g.fillRect((0.46 + i * 0.12) * m, y(2.7 - j * 0.15), 0.07 * m, 0.08 * m);
    // switch board
    g.fillStyle = '#ffffff'; g.fillRect(1.45 * m, y(1.45), 0.12 * m, 0.18 * m);
  });
}

// Courtyard screen bay: cusped arch, open (ground floor) or filled with a scrollwork grille above a sill.
function archTexture(grille) {
  return canvas(512, 512, (g) => {
    const W = 512; const H = 512; const m = W / BAY; const y = (h) => H - h * (H / (FH - SLAB));
    g.fillStyle = '#ecdcb9'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#e1cda4'; g.fillRect(0, 0, 0.32 * m, H); g.fillRect(W - 0.32 * m, 0, 0.32 * m, H);
    g.fillStyle = '#d6bf92'; g.fillRect(0, y(0.15), W, 6);
    const x0 = 0.42 * m; const x1 = W - 0.42 * m; const cx = W / 2;
    const sill = grille ? 0.85 : 0; const spring = 2.05; const apex = 2.72;
    const opening = () => {
      g.beginPath();
      g.moveTo(x0, y(sill)); g.lineTo(x0, y(spring));
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

// Room numbers for the door plates, all in one atlas.
function plateAtlas(numbers) {
  const cols = 16; const cw = 128; const ch = 48;
  const rows = Math.ceil(numbers.length / cols);
  const uv = new Map();
  const tex = canvas(cols * cw, Math.max(1, rows) * ch, (g) => {
    g.textAlign = 'center'; g.textBaseline = 'middle';
    numbers.forEach((n, i) => {
      const x = (i % cols) * cw; const yy = Math.floor(i / cols) * ch;
      g.fillStyle = '#2b2f36'; g.fillRect(x + 4, yy + 4, cw - 8, ch - 8);
      g.fillStyle = '#f2f2f2'; g.font = 'bold 30px system-ui, sans-serif'; g.fillText(String(n), x + cw / 2, yy + ch / 2 + 1);
      uv.set(n, [x / (cols * cw), 1 - (yy + ch) / (rows * ch), (x + cw) / (cols * cw), 1 - yy / (rows * ch)]);
    });
  });
  return { tex, uv };
}

const TEXTURES = {
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

export class Hostel {
  constructor(campus, b) {
    this.campus = campus;
    this.b = b;
    this.parts = new Map();
    this.customMats = {};
    this.doors = [];
    this.spaces = [];
    this.npcSpots = {};
    this.time = 0;
    this.lightOn = true;
    // --- frame from the OSM outline (a four-sided quad), squared up ---
    const [A, B, C, Dp] = b.outer;
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
    // The middle wing sits between the two OSM courtyards.
    const hv = b.holes.map((h) => h.map((p) => proj(p)[1] - v0)).sort((a, c) => a[0] - c[0]);
    this.vm = hv.length >= 2 ? (Math.max(...hv[0]) + Math.min(...hv[1])) / 2 : this.L / 2;
    const { W, L, vm } = this;
    this.mc0 = vm - WD / 2; this.mc1 = this.mc0 + COR;
    this.court = [
      { u0: WD, u1: W - WD, v0: WD, v1: this.mc0 - SCREEN },
      { u0: WD, u1: W - WD, v0: vm + WD / 2, v1: L - WD },
    ];
    const rect = (r) => [this.world(r.u0, r.v0), this.world(r.u1, r.v0), this.world(r.u1, r.v1), this.world(r.u0, r.v1)].map((p) => [p.x, p.z]);
    b.outer = rect({ u0: 0, u1: W, v0: 0, v1: L });
    b.holes = this.court.map(rect);
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
    for (const [name, w] of Object.entries(this.wings)) {
      w.name = name;
      const o = w.map(0, 0); const a = w.map(1, 0); const c = w.map(0, 1);
      w.ds = [a[0] - o[0], a[1] - o[1]];
      w.dt = [c[0] - o[0], c[1] - o[1]];
      w.nb = Math.floor((w.tb[1] - w.tb[0]) / BAY);
    }
    // The entrance: middle of the west face, two bays wide.
    const Wg = this.wings.W;
    this.ie = Math.round((L / 2 - Wg.tb[0]) / BAY) - 1;
    this.ve = Wg.tb[0] + (this.ie + 1) * BAY;
    this.planSpaces();
    this.planCourtyards();
    // the roof opening over the main stair, so you can climb out onto the terrace
    const st = this.spaces.find((s) => s.type === 'stair' && s.roof);
    const t0 = this.bayT(st);
    b.roofHoles = [[this.band(Wg, 0.84, t0), this.band(Wg, DEPTH, t0), this.band(Wg, DEPTH, t0 + BAY), this.band(Wg, 0.84, t0 + BAY)].map(([u, v]) => { const p = this.world(u, v); return [p.x, p.z]; })];
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
  bayT(sp) { return this.wings[sp.wing].tb[0] + sp.i * BAY; }

  // World yaw that faces along a band direction ('+s', '-s', '+t', '-t').
  yawOf(w, dir) {
    const d = { '+s': w.ds, '-s': [-w.ds[0], -w.ds[1]], '+t': w.dt, '-t': [-w.dt[0], -w.dt[1]] }[dir];
    const x = d[0] * this.eu[0] + d[1] * this.ev[0]; const z = d[0] * this.eu[1] + d[1] * this.ev[1];
    return Math.atan2(x, z);
  }

  // ---------- what goes where ----------
  planSpaces() {
    const ie = this.ie;
    const add = (wing, k, i, n, type, extra = {}) => this.spaces.push({ wing, k, i, n, type, ...extra });
    add('W', 0, ie, 2, 'lobby');
    for (let k = 0; k < FLOORS; k++) add('W', k, ie + 2, 1, 'stair', { roof: true, top: FLOORS });
    for (let k = 0; k < FLOORS; k++) add('W', k, ie + 3, 3, 'wash');
    add('W', 0, ie + 6, 1, 'laundry');
    add('W', 0, ie - 1, 1, 'room', { variant: 'mine', id: 'hostelroom' });
    add('W', 0, ie - 2, 1, 'room', { variant: 'study', id: 'room-study' });
    add('W', 0, ie - 6, 4, 'common');
    add('W', 1, ie - 1, 1, 'room', { variant: 'double', id: 'room-double' });
    add('W', 1, ie - 2, 1, 'room', { variant: 'senior', id: 'room-senior' });
    const e = this.wings.E.nb - 3;
    for (let k = 0; k < FLOORS; k++) add('E', k, e, 1, 'stair', { top: FLOORS - 1 });
  }

  // Badminton court in the first courtyard, a basketball hoop in the second; trees keep clear of them and of the arcades.
  planCourtyards() {
    const [c1, c2] = this.court;
    this.badminton = { u: (c1.u0 + c1.u1) / 2, v: (c1.v0 + c1.v1) / 2 };
    this.hoop = { u: (c2.u0 + c2.u1) / 2, v: c2.v1 - 9 };
    const { u: cu, v: cv } = this.badminton; const { u: bu, v: bv } = this.hoop;
    this.keepClearRects = [{ u0: cu - 5.5, u1: cu + 5.5, v0: cv - 9.5, v1: cv + 9.5 }, { u0: bu - 8, u1: bu + 8, v0: bv - 7, v1: bv + 8 }];
    for (const r of this.court) this.keepClearRects.push({ u0: r.u0 - 1, u1: r.u0 + 3, v0: r.v0 - 1, v1: r.v1 + 1 }, { u0: r.u1 - 3, u1: r.u1 + 1, v0: r.v0 - 1, v1: r.v1 + 1 }, { u0: r.u0 - 1, u1: r.u1 + 1, v0: r.v0 - 1, v1: r.v0 + 3 }, { u0: r.u0 - 1, u1: r.u1 + 1, v0: r.v1 - 3, v1: r.v1 + 1 });
  }

  spaceAtBay(wing, k, i) {
    return this.spaces.find((s) => s.wing === wing && s.k === k && i >= s.i && i < s.i + s.n);
  }

  // ---------- geometry helpers (local frame) ----------
  geo(key, g) {
    if (!this.parts.has(key)) this.parts.set(key, []);
    this.parts.get(key).push(g.index ? g.toNonIndexed() : g);
  }

  // Axis-aligned box in the local frame; collide pushes world AABB pieces.
  box(u0, u1, v0, v1, y0, y1, key, { collide = true, walkable = false } = {}) {
    if (u1 < u0) [u0, u1] = [u1, u0];
    if (v1 < v0) [v0, v1] = [v1, v0];
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
    const out = [];
    for (let i = 0; i < n; i++) {
      const a0 = (along === 'u' ? u0 : v0) + (len * i) / n; const a1 = a0 + len / n;
      const [pu0, pu1, pv0, pv1] = along === 'u' ? [a0, a1, v0, v1] : [u0, u1, a0, a1];
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
    let m;
    if (key.startsWith('t:')) { const [, tex, tint = '#ffffff'] = key.split(':'); m = texturedMaterial(tex, { tint }); }
    else if (key.startsWith('m:')) m = mat(key.slice(2), { metalness: 0.6, roughness: 0.35 });
    else if (key.startsWith('e:')) m = mat(key.slice(2), { emissive: key.slice(2) });
    else if (key.startsWith('g:')) m = new THREE.MeshStandardMaterial({ color: key.slice(2), roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.55 });
    else if (key.startsWith('x:')) {
      const name = key.slice(2);
      const tex = name === 'bay' ? bayTexture() : name === 'arch' ? archTexture(false) : name === 'grille' ? archTexture(true) : name === 'plates' ? this.plates.tex : TEXTURES[name]();
      const cut = name === 'arch' || name === 'grille';
      m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, side: cut ? THREE.DoubleSide : THREE.FrontSide, alphaTest: cut ? 0.5 : 0 });
    } else if (key.startsWith('facade:')) m = this.campus.material(key);
    else m = mat(key.replace(/^c:/, ''));
    this.customMats[key] = m;
    return m;
  }

  flush() {
    for (const [key, list] of this.parts) {
      const g = mergeGeometries(list);
      if (!g) continue;
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, this.material(key));
      mesh.receiveShadow = true;
      mesh.castShadow = key.startsWith('t:plaster') || key.startsWith('t:concrete');
      this.g.add(mesh);
    }
    this.parts.clear();
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
    this.g = new THREE.Group();
    this.g.position.set(this.O[0], 0, this.O[1]);
    this.g.rotation.y = this.angle;
    c.root.add(this.g);
    // room numbers, wing by wing, floor by floor (4 digits, like the plates in the walkthrough)
    const numbers = [];
    this.number = new Map();
    for (let k = 0; k < FLOORS; k++) {
      let n = 1;
      for (const w of Object.values(this.wings)) {
        for (let i = 0; i < w.nb; i++) {
          const sp = this.spaceAtBay(w.name, k, i);
          if (sp && sp.type !== 'room') continue;
          const no = (k + 1) * 1000 + n++;
          numbers.push(no);
          this.number.set(`${w.name}${k}:${i}`, no);
        }
      }
    }
    this.plates = plateAtlas(numbers);
    this.entranceCut();
    for (let k = 0; k < FLOORS; k++) for (const w of Object.values(this.wings)) this.buildBandWall(w, k);
    this.buildCorridors();
    this.buildScreens();
    this.buildRoof();
    for (const sp of this.spaces) this[`space_${sp.type}`](sp);
    this.buildCourtyards();
    this.buildOutside();
    this.flush();
  }

  // Opening in the west facade for the entrance (the facade itself is built with the other buildings).
  entranceCut() {
    const cuts = this.campus.hostCuts;
    if (!cuts.has(this.b)) cuts.set(this.b, []);
    const ps = [this.world(-1.2, this.ve - 1.5), this.world(0.8, this.ve - 1.5), this.world(0.8, this.ve + 1.5), this.world(-1.2, this.ve + 1.5)];
    cuts.get(this.b).push({ minX: Math.min(...ps.map((p) => p.x)), maxX: Math.max(...ps.map((p) => p.x)), minZ: Math.min(...ps.map((p) => p.z)), maxZ: Math.max(...ps.map((p) => p.z)) });
    const out = this.world(-2.2, this.ve);
    const inside = this.world(1.6, this.ve);
    this.entrance = { out, inside, yaw: Math.atan2(this.eu[0], this.eu[1]) };
  }

  // The corridor wall of a wing on one floor: locked doors (texture + number plate), with openings
  // where a space opens onto the corridor.
  buildBandWall(w, k) {
    const y0 = k * FH; const y1 = y0 + FH - SLAB;
    const open = [];
    for (let i = 0; i < w.nb; i++) {
      const t0 = w.tb[0] + i * BAY;
      const sp = this.spaceAtBay(w.name, k, i);
      if (!sp) {
        this.bquad(w, -T - 0.012, t0 + BAY / 2, y0, BAY, FH - SLAB, '-s', 'x:bay', { flip: 'auto' });
        const no = this.number.get(`${w.name}${k}:${i}`);
        this.bquad(w, -T - 0.02, t0 + 0.8, y0 + 2.18, 0.32, 0.12, '-s', 'x:plates', { uv: this.plates.uv.get(no) });
        continue;
      }
      if (sp.i !== i) continue;
      const st = t0;
      if (sp.type === 'lobby' || sp.type === 'stair') open.push([st + 0.15, st + sp.n * BAY - 0.15]);
      else if (sp.type === 'common') open.push([st + 5.4, st + 8.2]);
      else if (sp.type === 'wash') open.push([st + 0.35, st + 1.5]);
      else open.push([st + 0.3, st + 1.3]);
      if (sp.type === 'room') {
        const no = this.number.get(`${w.name}${k}:${i}`);
        this.bquad(w, -T - 0.02, st + 0.8, y0 + 2.18, 0.32, 0.12, '-s', 'x:plates', { uv: this.plates.uv.get(no) });
        sp.number = no;
      }
    }
    // wall pieces between openings, lintels over them
    let t = w.tw[0];
    for (const [a, b] of [...open, [w.tw[1], w.tw[1]]]) {
      if (a > t) this.bbox(w, -T, 0, t, a, y0, y1, 't:plaster:#f1ede4');
      if (b > a) this.bbox(w, -T, 0, a, b, y0 + 2.25, y1, 't:plaster:#f1ede4', { collide: false });
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
    ];
  }

  buildCorridors() {
    for (const r of this.corridorRects()) {
      for (let k = 0; k < FLOORS; k++) {
        const y = k * FH;
        if (k === 0) this.box(r.u0, r.u1, r.v0, r.v1, 0, 0.03, 't:terrazzo:#d9dad6', { collide: false });
        else this.box(r.u0, r.u1, r.v0, r.v1, y - SLAB, y, 't:terrazzo:#d9dad6', { walkable: true });
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
      for (let i = 4; i < Wg.nb; i += 9) {
        const t = Wg.tb[0] + i * BAY + 0.1;
        this.bcyl(Wg, -T - 0.12, t, k * FH + 0.9, 0.08, 0.5, 'c:#c62828', 10);
        this.bcyl(Wg, -T - 0.12, t, k * FH + 1.4, 0.03, 0.08, 'c:#222222', 6);
      }
      const tw = this.bayT({ wing: 'W', i: this.ie + 3 }) + 3.1; // just past the washroom door and the water cooler
      this.bcyl(Wg, -T - 0.25, tw, k * FH, 0.2, 0.6, 'c:#2e7d32', 12, 0.24);
      this.bcol(Wg, -T - 0.45, -T - 0.05, tw - 0.2, tw + 0.2, k * FH, k * FH + 0.6);
    }
  }

  // The courtyard side: cusped arches on piers, open on the ground floor, grilles above.
  buildScreens() {
    const { W, L, mc0, mc1, vm } = this;
    // [fixed axis, value (screen centre line), from, to, wall?]
    const runs = [
      ['u', WD - SCREEN / 2, WD, mc0 - SCREEN], ['u', WD - SCREEN / 2, vm + WD / 2, L - WD],
      ['u', W - WD + SCREEN / 2, WD, mc0 - SCREEN], ['u', W - WD + SCREEN / 2, vm + WD / 2, L - WD],
      ['v', WD - SCREEN / 2, WD, W - WD], ['v', L - WD + SCREEN / 2, WD, W - WD], ['v', mc0 - SCREEN / 2, WD, W - WD],
    ];
    for (let k = 0; k < FLOORS; k++) {
      const y0 = k * FH; const y1 = y0 + FH - SLAB;
      for (const [axis, at, a, b] of runs) {
        const n = Math.max(1, Math.round((b - a) / BAY)); const bw = (b - a) / n;
        for (let j = 0; j < n; j++) {
          const m = a + (j + 0.5) * bw;
          const g = new THREE.PlaneGeometry(bw, FH - SLAB);
          if (axis === 'u') g.rotateY(Math.PI / 2);
          g.translate(axis === 'u' ? at : m, y0 + (FH - SLAB) / 2, axis === 'u' ? m : at);
          this.geo(k === 0 ? 'x:arch' : 'x:grille', g);
          // piers
          const p0 = a + j * bw;
          const pier = (pa, pb) => (axis === 'u' ? this.box(at - SCREEN / 2, at + SCREEN / 2, pa, pb, y0, y1, 'c:#ecdcb9', { collide: true }) : this.box(pa, pb, at - SCREEN / 2, at + SCREEN / 2, y0, y1, 'c:#ecdcb9', { collide: true }));
          if (k === 0) pier(Math.max(a, p0 - 0.4), p0 + 0.4);
          else if (axis === 'u') this.col(at - 0.1, at + 0.1, p0, p0 + bw, y0, y1);
          else this.col(p0, p0 + bw, at - 0.1, at + 0.1, y0, y1);
        }
        if (k === 0) { const pb = b; axis === 'u' ? this.box(at - SCREEN / 2, at + SCREEN / 2, pb - 0.4, pb, y0, y1, 'c:#ecdcb9') : this.box(pb - 0.4, pb, at - SCREEN / 2, at + SCREEN / 2, y0, y1, 'c:#ecdcb9'); }
      }
      // corner piers and the ends of the middle wing
      for (const [u, v] of [[WD - SCREEN, WD - SCREEN], [W - WD, WD - SCREEN], [WD - SCREEN, mc0 - SCREEN], [W - WD, mc0 - SCREEN], [WD - SCREEN, L - WD], [W - WD, L - WD], [WD - SCREEN, vm + WD / 2 - SCREEN], [W - WD, vm + WD / 2 - SCREEN]]) this.box(u, u + SCREEN, v, v + SCREEN, y0, y1 + SLAB, 'c:#e1cda4');
      for (const u of [WD - SCREEN, W - WD]) this.box(u, u + SCREEN, mc1, vm + WD / 2, y0, y1 + SLAB, 't:plaster:#f1ede4');
      // floor slab edges facing the courtyards
      if (k > 0) for (const r of this.court) {
        this.box(r.u0 - SCREEN, r.u1 + SCREEN, r.v0 - SCREEN, r.v0, y0 - SLAB, y0, 'c:#e8d9b8', { collide: false });
        this.box(r.u0 - SCREEN, r.u1 + SCREEN, r.v1, r.v1 + SCREEN, y0 - SLAB, y0, 'c:#e8d9b8', { collide: false });
      }
    }
    // the middle wing's back wall onto the second courtyard (rooms with windows)
    const len = W - 2 * WD;
    const g = new THREE.PlaneGeometry(len, FLOORS * FH);
    const a = g.attributes.uv;
    for (let i = 0; i < a.count; i++) a.setXY(i, (a.getX(i) * len) / 3.4, a.getY(i) * FLOORS);
    g.translate(W / 2, (FLOORS * FH) / 2, vm + WD / 2 + 0.01);
    this.geo('facade:hostel', g);
    this.box(WD, W - WD, vm + WD / 2 - OUT, vm + WD / 2, 0, FLOORS * FH, 't:plaster:#eee7d8');
  }

  // Walkable roof over every wing, parapets all round, water tanks and washing lines on the west wing.
  buildRoof() {
    const { W, L, mc0, vm } = this;
    const y = FLOORS * FH;
    const st = this.spaces.find((s) => s.type === 'stair' && s.roof);
    const hole = this.bayT(st);
    const Wg = this.wings.W;
    const strips = [
      { u0: 0, u1: WD, v0: 0, v1: L }, { u0: W - WD, u1: W, v0: 0, v1: L },
      { u0: WD, u1: W - WD, v0: 0, v1: WD }, { u0: WD, u1: W - WD, v0: L - WD, v1: L }, { u0: WD, u1: W - WD, v0: mc0 - SCREEN, v1: vm + WD / 2 },
    ];
    // west strip, minus the stair opening
    const [hu0, hv0] = Wg.map(DEPTH, hole); const [hu1, hv1] = Wg.map(0.84, hole + BAY);
    for (const r of strips) {
      if (r.u0 === 0) {
        this.col(r.u0, r.u1, r.v0, hv0, y - 0.3, y, true);
        this.col(r.u0, r.u1, hv1, r.v1, y - 0.3, y, true);
        this.col(Math.max(hu0, hu1), r.u1, hv0, hv1, y - 0.3, y, true);
      } else this.col(r.u0, r.u1, r.v0, r.v1, y - 0.3, y, true);
    }
    // parapets: outside edge and courtyard edges
    const par = (u0, u1, v0, v1) => { this.box(u0, u1, v0, v1, y, y + 0.95, 't:plaster:#f1ece2'); };
    par(-0.05, 0.25, 0, L); par(W - 0.25, W + 0.05, 0, L); par(0, W, -0.05, 0.25); par(0, W, L - 0.25, L + 0.05);
    for (const r of this.court) { par(r.u0 - 0.25, r.u0, r.v0, r.v1); par(r.u1, r.u1 + 0.25, r.v0, r.v1); par(r.u0, r.u1, r.v0 - 0.25, r.v0); par(r.u0, r.u1, r.v1, r.v1 + 0.25); }
    // stair head room (mumty) over the main stair
    const t0 = hole; const t1 = hole + BAY;
    for (const t of [t0, t1]) this.bbox(Wg, 0.3, DEPTH + OUT, t - T / 2, t + T / 2, y, y + 2.6, 't:plaster:#ede6d6');
    this.bbox(Wg, DEPTH, DEPTH + OUT, t0, t1, y, y + 2.6, 't:plaster:#ede6d6');
    this.bbox(Wg, 0.3, DEPTH + OUT, t0 - 0.2, t1 + 0.2, y + 2.6, y + 2.8, 't:concrete:#e5e0d4', { collide: false });
    this.bbox(Wg, 0.7, 0.84, t0 + 0.15, t0 + 1.45, y, y + 1.0, 'm:#9aa1a8');
    this.label('Roof terrace', Wg, -0.3, t0 + BAY / 2, y + 2.4);
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
    const w = this.wings[sp.wing]; const t0 = this.bayT(sp); const t1 = t0 + sp.n * BAY; const y0 = sp.k * FH; const y1 = y0 + FH - SLAB;
    this.partitions(sp, w, t0, t1, y0, y1);
    if (back) this.bbox(w, w.depth, w.depth + 0.3, t0, t1, y0, y1, 't:plaster:#f3efe6');
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
    const leaf = new THREE.Mesh(worldBoxGeometry(0.98, 2.1, 0.05, 1.5), texturedMaterial('wood', { tint: '#e2c493' }));
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
    this.bbox(w, w.depth, w.depth + 0.3, t0, tc - 1.5, 0, FH - SLAB, 't:plaster:#f3efe6');
    this.bbox(w, w.depth, w.depth + 0.3, tc + 1.5, t1, 0, FH - SLAB, 't:plaster:#f3efe6');
    this.bbox(w, w.depth, w.depth + 0.3, tc - 1.5, tc + 1.5, 2.7, FH - SLAB, 't:plaster:#f3efe6', { collide: false });
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
    this.label('Krishna Bhawan · Lobby', w, 0.6, tc, 2.55, { height: 0.38 });
    this.lobby = { w, t0, t1 };
  }

  space_stair(sp) {
    const w = this.wings[sp.wing]; const t0 = this.bayT(sp); const t1 = t0 + BAY; const y0 = sp.k * FH;
    this.partitions(sp, w, t0, t1, y0, y0 + FH);
    this.bbox(w, w.depth, w.depth + 0.3, t0, t1, y0, y0 + FH, 't:plaster:#f3efe6');
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
    const flight = (ta, tb, yStart, sStart, dir) => {
      for (let j = 0; j < 8; j++) {
        const sa = sStart + dir * j * TREAD; const sb = sa + dir * TREAD;
        this.bbox(w, Math.min(sa, sb), Math.max(sa, sb), ta, tb, yStart - (j === 0 ? 0 : 0.6), yStart + (j + 1) * RISE, stone, { walkable: true });
      }
    };
    flight(t0 + 0.15, t0 + 1.4, y0, 0.84, 1); // up to the landing
    this.bbox(w, 3.0, w.depth, t0 + 0.15, t1 - 0.15, y0 + FH / 2 - 0.25, y0 + FH / 2, stone, { walkable: true });
    flight(t0 + 2.0, t1 - 0.15, y0 + FH / 2, 3.0, -1); // up to the next floor
    this.bbox(w, 0.84, 3.0, t0 + 1.4, t0 + 2.0, y0, y0 + FH + 1.0, 't:plaster:#ebe5d8');
    // handrail along the core
    this.bbox(w, 0.84, 3.0, t0 + 1.36, t0 + 1.4, y0 + 0.9, y0 + FH / 2 + 0.95, 'm:#7d858c', { collide: false });
    this.tube(w, 3.6, t0 + BAY / 2, y0 + FH - 0.1, false);
    if (sp.k === 0) this.label(sp.roof ? 'Stairs · roof terrace' : 'Stairs', w, -T - 0.3, t0 + BAY / 2, 2.55);
    sp.flights = { t0, t1 };
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
  }

  // ---------- rooms ----------
  space_room(sp) {
    const { w, t0, t1, y0, y1 } = this.shell(sp);
    const k = sp.k; const v = sp.variant;
    const sheet = { mine: 'x:sheetBlue', study: 'x:sheetTeal', double: 'x:sheetFloral', senior: 'x:sheetTeal' }[v];
    sp.doorIndex = this.door(w, t0 + 0.3, k, true);
    this.interact(`hdoor:${sp.doorIndex}`, w, -0.6, t0 + 0.8, k, 'Open / close the door', 1.3);
    this.window(w, t0 + 1.7, y0);
    this.curtains(w, t0 + 1.7, y0);
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
        const tm = new THREE.Mesh(g, lm); const p = w.map(2.1, t0 + BAY / 2);
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
    if (v !== 'mine') this.tube(w, 2.1, t0 + BAY / 2, y1);
    this.fan(w, 2.0, t0 + BAY / 2, y1);
    sp.center = this.bandWorld(w, 2.0, t0 + BAY / 2, y0);
  }

  // ---------- courtyards and outside ----------
  buildCourtyards() {
    // badminton court (13.4 × 6.1 m) on a cement pad in the first courtyard
    const { u: cu, v: cv } = this.badminton;
    this.box(cu - 4.5, cu + 4.5, cv - 8.5, cv + 8.5, 0, 0.04, 't:concrete:#cfc9bc', { collide: false });
    const line = (u0, u1, v0, v1) => this.box(u0, u1, v0, v1, 0.04, 0.045, 'c:#ffffff', { collide: false });
    line(cu - 3.05, cu + 3.05, cv - 6.7, cv - 6.65); line(cu - 3.05, cu + 3.05, cv + 6.65, cv + 6.7); line(cu - 3.05, cu - 3.0, cv - 6.7, cv + 6.7); line(cu + 3.0, cu + 3.05, cv - 6.7, cv + 6.7);
    line(cu - 0.02, cu + 0.02, cv - 6.7, cv + 6.7); line(cu - 3.05, cu + 3.05, cv - 1.98, cv - 1.96); line(cu - 3.05, cu + 3.05, cv + 1.96, cv + 1.98);
    for (const s of [-1, 1]) { this.cyl(cu + s * 3.1, 0, cv, 0.03, 1.55, 'm:#9aa1a8', 8); this.col(cu + s * 3.1 - 0.05, cu + s * 3.1 + 0.05, cv - 0.05, cv + 0.05, 0, 1.55); }
    this.box(cu - 3.1, cu + 3.1, cv - 0.005, cv + 0.005, 0.9, 1.55, 'g:#f4f4f4', { collide: false });
    this.npcSpots.badminton = [{ at: this.world(cu, cv - 4.5), yaw: Math.atan2(this.ev[0], this.ev[1]) }, { at: this.world(cu, cv + 4.5), yaw: Math.atan2(-this.ev[0], -this.ev[1]) }];
    // basketball half-court in the second courtyard
    const { u: bu, v: bv } = this.hoop;
    this.box(bu - 7, bu + 7, bv - 6, bv + 7, 0, 0.04, 't:concrete:#c8c3b6', { collide: false });
    this.cyl(bu, 0, bv + 6.4, 0.08, 3.0, 'm:#5c6670', 10); this.col(bu - 0.1, bu + 0.1, bv + 6.3, bv + 6.5, 0, 3);
    this.box(bu - 0.9, bu + 0.9, bv + 6.1, bv + 6.15, 2.9, 3.95, 'c:#f5f5f5', { collide: false });
    const ring = new THREE.TorusGeometry(0.23, 0.015, 6, 20); ring.rotateX(Math.PI / 2); ring.translate(bu, 3.05, bv + 5.8); this.geo('c:#e65100', ring);
    // benches and lamp posts along the arcades
    for (const r of this.court) {
      for (const [u, v, alongV] of [[r.u0 + 2.2, (r.v0 + r.v1) / 2 - 6, true], [r.u1 - 2.2, (r.v0 + r.v1) / 2 + 6, true], [(r.u0 + r.u1) / 2 - 10, r.v0 + 2.2, false], [(r.u0 + r.u1) / 2 + 10, r.v1 - 2.2, false]]) {
        if (alongV) { this.box(u - 0.25, u + 0.25, v - 0.9, v + 0.9, 0.42, 0.47, 't:wood:#8a6040', { collide: false }); this.col(u - 0.25, u + 0.25, v - 0.9, v + 0.9, 0, 0.47); } else { this.box(u - 0.9, u + 0.9, v - 0.25, v + 0.25, 0.42, 0.47, 't:wood:#8a6040', { collide: false }); this.col(u - 0.9, u + 0.9, v - 0.25, v + 0.25, 0, 0.47); }
        this.box(u - 0.04, u + 0.04, v - 0.04, v + 0.04, 0, 0.42, 'c:#444', { collide: false });
      }
      for (const [u, v] of [[r.u0 + 1.2, r.v0 + 1.2], [r.u1 - 1.2, r.v1 - 1.2], [r.u0 + 1.2, r.v1 - 1.2], [r.u1 - 1.2, r.v0 + 1.2]]) {
        this.cyl(u, 0, v, 0.06, 3.2, 'c:#2f3437', 8); this.col(u - 0.08, u + 0.08, v - 0.08, v + 0.08, 0, 3.2);
        this.cyl(u, 3.2, v, 0.18, 0.25, 'e:#fff1c9', 10, 0.1);
      }
    }
    this.labelCourt = this.campus.label('Courtyard (QT) · badminton', this.world(cu, cv - 9.5).x, 3.2, this.world(cu, cv - 9.5).z, { height: 0.42 });
  }

  // Porch at the entrance and the cycle stand beside it.
  buildOutside() {
    const ve = this.ve;
    for (const dv of [-1.85, 1.85]) this.box(-1.45, -0.95, ve + dv - 0.25, ve + dv + 0.25, 0, 3.0, 't:plasterWhite:#ecd8b8');
    this.box(-1.6, 0, ve - 2.2, ve + 2.2, 3.0, 3.35, 't:plasterWhite:#ecd8b8', { collide: false });
    this.box(-1.5, -0.1, ve - 1.6, ve + 1.6, 0, 0.12, 't:concrete:#d8d2c4', { collide: false });
    const v0 = ve + 4.5; const v1 = ve + 13.5;
    for (const [u, v] of [[-4.2, v0], [-4.2, v1], [-1.4, v0], [-1.4, v1]]) { this.box(u - 0.06, u + 0.06, v - 0.06, v + 0.06, 0, 2.4, 'm:#7b8288'); }
    this.box(-4.5, -1.1, v0 - 0.3, v1 + 0.3, 2.4, 2.48, 'c:#5b7c99', { collide: false });
    this.col(-4.5, -1.1, v0 - 0.2, v1 + 0.2, 0, 1.0);
    const r = rng(23);
    const cols = ['#c62828', '#1565c0', '#2e7d32', '#212121', '#6a1b9a', '#ef6c00'];
    for (let v = v0 + 0.3; v < v1; v += 0.75) {
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
    // the guard's spot and where batchmates gather in the evening
    this.npcSpots.lobbyChat = [{ at: this.world(1.2, ve - 1.2), yaw: this.entrance.yaw + Math.PI / 2 }, { at: this.world(1.2, ve + 0.1), yaw: this.entrance.yaw - Math.PI / 2 }];
  }

  // ---------- queries ----------
  treeOk(x, z) {
    const [u, v] = this.local(x, z);
    if (u > -2 && u < this.W + 2 && v > -2 && v < this.L + 2) {
      const inCourt = this.court.some((r) => u > r.u0 + 1 && u < r.u1 - 1 && v > r.v0 + 1 && v < r.v1 - 1);
      if (!inCourt) return false;
      return !this.keepClearRects.some((r) => u > r.u0 && u < r.u1 && v > r.v0 && v < r.v1);
    }
    if (u > -8 && u < 0 && v > this.ve - 8 && v < this.ve + 16) return false; // porch and cycle stand
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

  update(dt) {
    this.time += dt;
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
