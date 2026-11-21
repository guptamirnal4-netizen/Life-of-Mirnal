// The newer Bhawans (research/buildings/hostels-newer.md).
//
// Ashok, Rana Pratap and Malviya (A) are walk-in combs: a long spine with thin arms reaching out from it, and open
// gaps between the arms. They are laid out like the courtyard Bhawans in hostel.js, with different wings: the spine is
// the "west" wing (entrance, lobby, stairs, washrooms, common room, rooms along its outer wall), and each arm is a wing
// with a corridor along one side and rooms along the other. A dog-leg stair stands in each arm where it meets the spine,
// under the square roof tower (mumty) seen there in the drone view.
//
// The outside is the "new Bhawan" design they share (SWD photos, tour panoramas): cream render with sand-beige trim and
// oxide-red (maroon) bands; on the ground floor cusped arched windows with white scrolled grilles, on the first floor
// deep recessed bays between projecting fins; a cornice and a parapet with a coping. The entrance is a three-arch porch
// on the spine's road face: cusped arches in raised surrounds (one open, two with white iron gates), the Devanagari
// name band, a first-floor loggia with paired turned columns, the porch's own parapet.
//
// Also built here, from outlines in this file (they are not walk-in):
//   Bhagirath Bhawan  the same comb, mirrored (spine on the west), blue reveals and green collapsible gates (SWD photo);
//                     shut, pending the decision on who lives there (research/review.md).
//   Malviya-B         OSM relation 5372379, missing from the campus data: a two-storey block round four courts.
//   SR Bhawan         OSM relation 5372462, missing from the data: white two-storey bars, with its gate and sign.
//   Meera Bhawan      OSM relation 20803053 (two footprints north of the Meera POI), girls' hostel, closed.
// The missing footprints are added to BITS_CAMPUS.buildings when this module loads (see ANNEXES at the end), so the
// labels, the explorer, trees and people's routes treat them like any other building.
//
// The OSM outline is rotated into its own frame, squared up (every edge along u or v) and simplified: the spine gets
// exactly one wing's depth, WD, so small bumps on it go. u runs from the spine's outer face (0) out along the arms;
// v runs along the spine.
import * as THREE from 'three';
import { Hostel, FH, FLOORS, DIMS } from './hostel.js';
import { worldBoxGeometry, TEX_SIZE } from './textures.js';
import { BITS_CAMPUS as D } from '../../data/bits-campus.js';

const { DEPTH, T, OUT, SCREEN, WD } = DIMS;
const MOD = 3.4; // the bay (hostel.js MOD)
const R = FLOORS * FH; // roof level, 6.6 m
const PW = 11.2; // the entrance porch: width along the spine
const PD = 2.6; // and how far it projects
export const MODULE_ID = 'hostels-newer';

export const COMB = { 'Ashok bhawan': 'Ashok Bhawan', 'Rana Pratap Bhawan': 'Rana Pratap Bhawan', 'Malviya-A': 'Malviya Bhawan' };
// the porch name bands (SWD photos)
const PLAQUE = { 'Ashok Bhawan': 'अशोक-भवन', 'Rana Pratap Bhawan': 'राणाप्रताप-भवन', 'Malviya Bhawan': 'पंडित मदन मोहन मालवीय भवन', 'Bhagirath Bhawan': 'भागीरथ-भवन' };

// Facade styles. g / u: the ground and first-floor wall textures, one bay (MOD wide, FH high) per repeat.
const STYLE = {
  comb: { wall: '#efe8da', trim: '#dcbf92', band: '#7c2c24', plinth: '#cdb994', g: 'n:combG', u: 'n:combU', fins: true },
  // Bhagirath: the same family with light-blue reveals (SWD photo, 2019)
  blue: { wall: '#efe9dc', trim: '#e3cfa6', band: '#a5554a', plinth: '#cbbd9e', g: 'n:blueG', u: 'n:blueU', fins: true },
  // SR: plain white modern blocks, sunshades over the windows (SWD photo)
  modern: { wall: '#f3f3ef', trim: '#e2e2dc', band: null, plinth: '#c9c6bd', g: 'n:modern', u: 'n:modern', chajja: true },
  // Meera's long bar: peach and white (tour "Girls Hostel" panorama) [approximation: which block is which is unknown]
  peach: { wall: '#e8b993', trim: '#f4eee2', band: '#b8644f', plinth: '#c7a68a', g: 'n:peach', u: 'n:peach', chajja: true },
};

// ---------- outlines ----------
// Inside an outline (local [u, v] points)?
const inside = (poly, u, v) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ui, vi] = poly[i]; const [uj, vj] = poly[j];
    if (vi > v !== vj > v && u < ((uj - ui) * (v - vi)) / (vj - vi) + ui) c = !c;
  }
  return c;
};

// The direction most edges run along (or across), weighted by length.
function dominantAngle(outline) {
  let sx = 0; let sy = 0;
  outline.forEach((a, i) => {
    const c = outline[(i + 1) % outline.length];
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]); const th = 4 * Math.atan2(c[1] - a[1], c[0] - a[0]);
    sx += len * Math.cos(th); sy += len * Math.sin(th);
  });
  return Math.atan2(sy, sx) / 4;
}

// Drop repeated points and points in the middle of a straight run.
function tidy(pts) {
  for (let changed = true; changed;) {
    changed = false;
    for (let i = 0; i < pts.length && pts.length > 4; i++) {
      const a = pts[(i + pts.length - 1) % pts.length]; const b = pts[i]; const c = pts[(i + 1) % pts.length];
      const same = Math.hypot(b[0] - c[0], b[1] - c[1]) < 0.05;
      const straight = (Math.abs(a[0] - b[0]) < 0.05 && Math.abs(b[0] - c[0]) < 0.05) || (Math.abs(a[1] - b[1]) < 0.05 && Math.abs(b[1] - c[1]) < 0.05);
      if (same || straight) { pts.splice(i, 1); changed = true; break; }
    }
  }
  return pts;
}

// Square up an outline already in its own frame: runs of edges along the same axis merge, and every edge's fixed
// coordinate becomes the mean of its two ends (edges alternate between u and v, so each corner is set once each way).
function squareUp(local) {
  const p = local.map((q) => [...q]);
  const axis = (a, b) => (Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1]) ? 'u' : 'v');
  for (let changed = true; changed && p.length > 4;) {
    changed = false;
    for (let i = 0; i < p.length; i++) {
      const a = p[(i + p.length - 1) % p.length]; const b = p[i]; const c = p[(i + 1) % p.length];
      if (axis(a, b) === axis(b, c)) { p.splice(i, 1); changed = true; break; }
    }
  }
  const n = p.length; const out = p.map((q) => [...q]);
  for (let i = 0; i < n; i++) {
    const a = p[i]; const b = p[(i + 1) % n]; const j = (i + 1) % n;
    if (axis(a, b) === 'u') { const m = (a[1] + b[1]) / 2; out[i][1] = m; out[j][1] = m; } else { const m = (a[0] + b[0]) / 2; out[i][0] = m; out[j][0] = m; }
  }
  return tidy(out);
}

// A frame for any footprint: u along its dominant direction, origin at the low corner of its extent.
function frameOf(outline) {
  const ang = dominantAngle(outline);
  const eu = [Math.cos(ang), Math.sin(ang)]; const ev = [-eu[1], eu[0]];
  const raw = (p) => [p[0] * eu[0] + p[1] * eu[1], p[0] * ev[0] + p[1] * ev[1]];
  const r = outline.map(raw);
  const u0 = Math.min(...r.map((p) => p[0])); const v0 = Math.min(...r.map((p) => p[1]));
  return { eu, ev, O: [u0 * eu[0] + v0 * ev[0], u0 * eu[1] + v0 * ev[1]], toLocal: (p) => { const q = raw(p); return [q[0] - u0, q[1] - v0]; } };
}

// The comb's outline in its own frame: squared up, spine at u = 0..WD, arms as rows { v0, v1, u1 }.
export function combPlan(outline) {
  const ang = dominantAngle(outline);
  const axes = [[Math.cos(ang), Math.sin(ang)], [-Math.sin(ang), Math.cos(ang)]];
  // the spine: a face that runs the whole length of the building, opposite a jagged face (the arm ends)
  let best = null;
  for (const [ia, e] of axes.entries()) {
    const along = axes[1 - ia];
    const c = outline.map((p) => p[0] * e[0] + p[1] * e[1]);
    const pr = outline.map((p) => p[0] * along[0] + p[1] * along[1]);
    const ext = Math.max(...pr) - Math.min(...pr);
    const face = (at) => {
      let len = 0;
      outline.forEach((a, i) => {
        const j = (i + 1) % outline.length;
        if (Math.abs(c[i] - at) < 2.5 && Math.abs(c[j] - at) < 2.5) len += Math.abs(pr[j] - pr[i]);
      });
      return len > 0.8 * ext;
    };
    const lo = face(Math.min(...c)); const hi = face(Math.max(...c));
    if (lo !== hi) best = { e: lo ? e : [-e[0], -e[1]] };
  }
  if (!best) return null;
  // eu points from the spine out along the arms; ev completes the frame the way Hostel expects (eu = [ev1, -ev0])
  const eu = best.e;
  const ev = [-eu[1], eu[0]];
  const raw = outline.map((p) => [p[0] * eu[0] + p[1] * eu[1], p[0] * ev[0] + p[1] * ev[1]]);
  const u0 = Math.min(...raw.map((p) => p[0])); const v0 = Math.min(...raw.map((p) => p[1]));
  let pts = raw.map(([u, v]) => [u - u0, v - v0]);
  // square up: the spine's outer face to u = 0, its inner face to u = WD
  pts = pts.map(([u, v]) => [u < 2.5 ? 0 : u < WD + 5.5 ? WD : u, v]);
  for (let pass = 0; pass < 2; pass++) {
    pts.forEach((a, i) => {
      const c = pts[(i + 1) % pts.length];
      if (Math.abs(c[0] - a[0]) >= Math.abs(c[1] - a[1])) { const m = (a[1] + c[1]) / 2; a[1] = m; c[1] = m; } else if (a[0] !== 0 && a[0] !== WD) { const m = (a[0] + c[0]) / 2; a[0] = m; c[0] = m; }
    });
  }
  tidy(pts);
  const W = Math.max(...pts.map((p) => p[0])); const L = Math.max(...pts.map((p) => p[1]));
  // rows along v: where the building reaches past the spine, that row is an arm
  const vs = [...new Set(pts.map((p) => +p[1].toFixed(2)))].sort((a, b) => a - b);
  const arms = [];
  for (let i = 1; i < vs.length; i++) {
    const vm = (vs[i - 1] + vs[i]) / 2;
    // where this row crosses the outline's walls along u; the first span from the spine is the building
    const cross = [];
    pts.forEach((a, j) => {
      const c = pts[(j + 1) % pts.length];
      if (Math.abs(c[0] - a[0]) < 0.05 && (a[1] - vm) * (c[1] - vm) < 0) cross.push(a[0]);
    });
    cross.sort((x, y) => x - y);
    const u1 = cross[1];
    if (!(u1 > WD + 3)) continue;
    // touching rows are one arm (a notch at its end makes two rows); it reaches as far as both do
    const last = arms.at(-1);
    if (last && Math.abs(last.v1 - vs[i - 1]) < 0.01) { last.v1 = vs[i]; last.u1 = Math.min(last.u1, u1); } else arms.push({ v0: vs[i - 1], v1: vs[i], u1 });
  }
  return { eu, ev, origin: [u0 * eu[0] + v0 * ev[0], u0 * eu[1] + v0 * ev[1]], pts, W, L, arms };
}

// ---------- textures (drawn once, on first use) ----------
const BAY = 512; // pixels per bay texture (MOD × FH)
function canvasTex(w, h, draw, repeat = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (repeat) tex.wrapS = THREE.RepeatWrapping;
  return tex;
}
const PX = BAY / MOD; const PY = BAY / FH;
const X = (m) => m * PX; const Y = (h) => BAY - h * PY;

// A cusped (multifoil) arch opening in canvas metres: jambs from y0 up to the spring, five lobes over the top.
function archPath(g, cx, hw, y0, spring, apex, bulge = 0.08) {
  g.beginPath();
  g.moveTo(X(cx - hw), Y(y0)); g.lineTo(X(cx - hw), Y(spring));
  for (const [u, y] of archHead(cx, hw, spring, apex, bulge).reverse()) g.lineTo(X(u), Y(y));
  g.lineTo(X(cx + hw), Y(y0)); g.closePath();
}

// The head of a cusped arch from its right springing to its left one: five lobes, each bulging out between cusps.
function archHead(cx, hw, spring, apex, bulge = 0.12) {
  const P = (a) => [cx + Math.cos(a) * hw, spring + Math.sin(a) * (apex - spring)];
  const out = [P(0)];
  const lobes = 5;
  for (let k = 0; k < lobes; k++) {
    const a0 = (Math.PI * k) / lobes; const a1 = (Math.PI * (k + 1)) / lobes;
    for (let j = 1; j <= 4; j++) {
      const t = j / 4; const a = a0 + (a1 - a0) * t;
      const [x, y] = P(a); const dx = x - cx; const dy = (y - spring) * (hw / Math.max(0.01, apex - spring)); const l = Math.hypot(dx, dy) || 1;
      const b = j < 4 ? bulge * Math.sin(Math.PI * t) : 0;
      out.push([x + (dx / l) * b, y + (dy / l) * b * ((apex - spring) / hw)]);
    }
  }
  return out;
}

function scrollGrille(g, x0, x1, top, bot, color, step = 46) {
  g.strokeStyle = color; g.lineWidth = 5; g.lineCap = 'round';
  for (let x = x0 + step / 2; x < x1; x += step) { g.beginPath(); g.moveTo(x, top); g.lineTo(x, bot); g.stroke(); }
  for (let x = x0; x < x1; x += step) {
    for (let y = top + 20; y < bot; y += 58) {
      g.beginPath(); g.moveTo(x + step / 2, y); g.bezierCurveTo(x + 2, y + 3, x + 2, y + 28, x + 18, y + 28); g.bezierCurveTo(x + 28, y + 28, x + 28, y + 16, x + 20, y + 15); g.stroke();
      g.beginPath(); g.moveTo(x + step / 2, y + 29); g.bezierCurveTo(x + step - 2, y + 32, x + step - 2, y + 57, x + 28, y + 57); g.bezierCurveTo(x + 18, y + 57, x + 18, y + 45, x + 26, y + 44); g.stroke();
    }
  }
}

function rosette(g, x, y, r, col) {
  g.fillStyle = col;
  for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; g.beginPath(); g.arc(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.42, 0, 7); g.fill(); }
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); g.arc(x, y, r * 0.3, 0, 7); g.fill();
}

// Ground-floor bay: a cusped arched window in a raised niche, white (or dark) scrolled grille over dark glass.
function groundBay({ wall, niche, rim, grille, glass }) {
  return canvasTex(BAY, BAY, (g) => {
    g.fillStyle = wall; g.fillRect(0, 0, BAY, BAY);
    g.fillStyle = 'rgba(120,100,70,0.06)'; for (let i = 0; i < 300; i++) g.fillRect(Math.random() * BAY, Math.random() * BAY, 3, 3);
    const c = MOD / 2;
    g.fillStyle = rim; archPath(g, c, 1.08, 0.62, 1.95, 2.62, 0.1); g.fill();
    g.fillStyle = niche; archPath(g, c, 0.98, 0.7, 1.95, 2.55, 0.1); g.fill();
    g.fillStyle = glass; archPath(g, c, 0.8, 0.82, 1.92, 2.42, 0.08); g.fill();
    g.save(); archPath(g, c, 0.8, 0.82, 1.92, 2.42, 0.08); g.clip();
    g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(X(c - 0.8), Y(2.5), X(0.5), Y(0.8) - Y(2.5));
    scrollGrille(g, X(c - 0.8), X(c + 0.8), Y(2.45), Y(0.82), grille);
    g.restore();
    // sill and the drip under it
    g.fillStyle = '#c9b089'; g.fillRect(X(c - 1.12), Y(0.7), X(2.24), Y(0.62) - Y(0.7));
    g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(X(c - 1.12), Y(0.62), X(2.24), 4);
    rosette(g, X(0.32), Y(2.55), 14, rim); rosette(g, X(MOD - 0.32), Y(2.55), 14, rim);
    // the conduit and a lamp bracket every bay (photos)
    g.fillStyle = '#d8d2c6'; g.fillRect(X(0.18), Y(3.3), 5, Y(2.75) - Y(3.3));
  });
}

// First-floor bay: a deep recess between fins (the fins themselves are geometry) with a plain window.
function upperBay({ wall, recess, frame, glass, vent }) {
  return canvasTex(BAY, BAY, (g) => {
    g.fillStyle = wall; g.fillRect(0, 0, BAY, BAY);
    g.fillStyle = recess; g.fillRect(X(0.12), Y(2.98), X(MOD - 0.24), Y(0.28) - Y(2.98));
    // shade at the top of the recess and down its sides (it is 0.4 m deep)
    let gr = g.createLinearGradient(0, Y(2.98), 0, Y(2.3)); gr.addColorStop(0, 'rgba(40,25,10,0.32)'); gr.addColorStop(1, 'rgba(40,25,10,0)');
    g.fillStyle = gr; g.fillRect(X(0.12), Y(2.98), X(MOD - 0.24), Y(2.3) - Y(2.98));
    gr = g.createLinearGradient(X(0.12), 0, X(0.6), 0); gr.addColorStop(0, 'rgba(40,25,10,0.22)'); gr.addColorStop(1, 'rgba(40,25,10,0)');
    g.fillStyle = gr; g.fillRect(X(0.12), Y(2.98), X(0.48), Y(0.28) - Y(2.98));
    const c = MOD / 2;
    g.fillStyle = frame; g.fillRect(X(c - 0.68), Y(2.32), X(1.36), Y(0.88) - Y(2.32));
    g.fillStyle = glass; g.fillRect(X(c - 0.6), Y(2.24), X(1.2), Y(0.96) - Y(2.24));
    g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(X(c - 0.6), Y(2.24), X(0.35), Y(0.96) - Y(2.24));
    g.strokeStyle = frame; g.lineWidth = 4;
    for (let k = 1; k < 4; k++) { const x = X(c - 0.6 + (1.2 * k) / 4); g.beginPath(); g.moveTo(x, Y(2.24)); g.lineTo(x, Y(0.96)); g.stroke(); }
    g.beginPath(); g.moveTo(X(c - 0.6), Y(1.6)); g.lineTo(X(c + 0.6), Y(1.6)); g.stroke();
    // a jaali vent under the window
    g.fillStyle = vent; g.fillRect(X(c - 0.45), Y(0.72), X(0.9), Y(0.42) - Y(0.72));
    g.fillStyle = 'rgba(40,30,20,0.55)';
    for (let i = 0; i < 7; i++) for (let j = 0; j < 2; j++) g.fillRect(X(c - 0.4 + i * 0.12), Y(0.68 - j * 0.14), X(0.07), X(0.08));
  });
}

// A modern bay: a wide aluminium window with six panes.
function modernBay({ wall, frame, glass, surround }) {
  return canvasTex(BAY, BAY, (g) => {
    g.fillStyle = wall; g.fillRect(0, 0, BAY, BAY);
    g.fillStyle = 'rgba(0,0,0,0.04)'; for (let i = 0; i < 200; i++) g.fillRect(Math.random() * BAY, Math.random() * BAY, 3, 3);
    const c = MOD / 2;
    if (surround) { g.fillStyle = surround; g.fillRect(X(c - 1.05), Y(2.35), X(2.1), Y(0.8) - Y(2.35)); }
    g.fillStyle = frame; g.fillRect(X(c - 0.92), Y(2.22), X(1.84), Y(0.93) - Y(2.22));
    g.fillStyle = glass; g.fillRect(X(c - 0.86), Y(2.16), X(1.72), Y(0.99) - Y(2.16));
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(X(c - 0.86), Y(2.16), X(0.5), Y(0.99) - Y(2.16));
    g.strokeStyle = frame; g.lineWidth = 6;
    for (const f of [1 / 3, 2 / 3]) { const x = X(c - 0.86 + 1.72 * f); g.beginPath(); g.moveTo(x, Y(2.16)); g.lineTo(x, Y(0.99)); g.stroke(); }
    g.beginPath(); g.moveTo(X(c - 0.86), Y(1.62)); g.lineTo(X(c + 0.86), Y(1.62)); g.stroke();
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(X(c - 1.0), Y(0.9), X(2.0), 5);
  });
}

// The ornamental porch gates (alpha-cut): white scrolled iron with a fan at the top (Ashok, Malviya), or a green
// collapsible gate (Bhagirath). The texture covers the arch's bounding box.
function gateTex(kind) {
  return canvasTex(256, 512, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    if (kind === 'green') {
      g.strokeStyle = '#2e6a3d'; g.lineWidth = 6;
      for (let x = 6; x < W; x += 20) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
      g.lineWidth = 3;
      for (let y = -W; y < H; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y + W * 0.5); g.stroke(); g.beginPath(); g.moveTo(W, y); g.lineTo(0, y + W * 0.5); g.stroke(); }
      g.lineWidth = 10; for (const y of [8, H * 0.5, H - 8]) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      return;
    }
    g.strokeStyle = '#f6f4ee'; g.lineWidth = 7; g.lineCap = 'round';
    g.strokeRect(6, 6, W - 12, H - 12);
    g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.stroke();
    // the lower half: bars and scrolls; the upper: a fan of curved ribs from the middle rail
    const mid = H * 0.5;
    g.lineWidth = 6; g.beginPath(); g.moveTo(0, mid); g.lineTo(W, mid); g.stroke();
    for (let x = 22; x < W; x += 26) { g.beginPath(); g.moveTo(x, mid); g.lineTo(x, H - 8); g.stroke(); }
    g.lineWidth = 5;
    for (let k = 0; k <= 8; k++) {
      const a = Math.PI * (0.06 + (0.88 * k) / 8);
      g.beginPath(); g.moveTo(W / 2, mid); g.quadraticCurveTo(W / 2 + Math.cos(a) * 60, mid - 90, W / 2 + Math.cos(a) * 150, mid - Math.sin(a) * 260); g.stroke();
    }
    for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(W / 2 + (k - 2.5) * 38, mid - 40, 16, 0, Math.PI * 2); g.stroke(); }
    g.beginPath(); g.arc(W / 2, mid, 40, Math.PI, 0); g.stroke();
    for (let y = mid + 40; y < H - 30; y += 80) for (const x of [W * 0.25, W * 0.75]) { g.beginPath(); g.arc(x, y, 20, 0, Math.PI * 1.6); g.stroke(); g.beginPath(); g.arc(x, y + 38, 14, Math.PI, Math.PI * 2.6); g.stroke(); }
  }, false);
}

// The name band: Devanagari letters on the beige band with the "≡" ornaments either side (SWD photos).
function plaqueTex(text, { bg = '#e1c597', ink = '#3b2a1b', w = 1024, h = 96, border = null } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    if (border) { g.strokeStyle = border; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8); }
    g.fillStyle = ink;
    g.font = `bold ${Math.round(h * 0.62)}px "Kohinoor Devanagari", "Devanagari Sangam MN", "Noto Sans Devanagari", Mangal, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const tw = Math.min(w * 0.8, g.measureText(text).width);
    g.fillText(text, w / 2, h * 0.54, w * 0.8);
    if (!border) for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) g.fillRect(w / 2 + sx * (tw / 2 + 40) - 22, h * 0.32 + k * h * 0.15, 44, h * 0.07);
  }, false);
}

function brickTex() {
  return canvasTex(256, 256, (g, W, H) => {
    g.fillStyle = '#c9b8a6'; g.fillRect(0, 0, W, H);
    const bw = 64; const bh = 32;
    for (let r = 0; r < H / bh; r++) {
      for (let c = -1; c < W / bw + 1; c++) {
        const x = c * bw + (r % 2) * (bw / 2); const shade = 150 + ((r * 7 + c * 13) % 5) * 9;
        g.fillStyle = `rgb(${shade + 20},${Math.round(shade * 0.48)},${Math.round(shade * 0.36)})`;
        g.fillRect(x + 2, r * bh + 2, bw - 4, bh - 4);
      }
    }
  });
}

const myMats = new Map();
function makeMaterial(key) {
  const [, kind, arg = ''] = key.match(/^n:([^:]+):?(.*)$/);
  const std = (map, extra = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.88, ...extra });
  switch (kind) {
    case 'combG': return std(groundBay({ wall: '#efe8da', niche: '#dcbf92', rim: '#e6d2ad', grille: '#f7f4ec', glass: '#2e2b27' }));
    case 'combU': return std(upperBay({ wall: '#efe8da', recess: '#dcc096', frame: '#f1ece2', glass: '#33383c', vent: '#e7dcc6' }));
    case 'blueG': return std(groundBay({ wall: '#efe9dc', niche: '#a9bce6', rim: '#e3d3b2', grille: '#26302a', glass: '#33363a' }));
    case 'blueU': return std(upperBay({ wall: '#efe9dc', recess: '#9fb3e1', frame: '#e8edf3', glass: '#2c3a52', vent: '#c7d2ea' }));
    case 'modern': return std(modernBay({ wall: '#f3f3ef', frame: '#8b9299', glass: '#55697a' }));
    case 'peach': return std(modernBay({ wall: '#e8b993', frame: '#f2efe8', glass: '#4f6270', surround: '#f4eee2' }));
    case 'gate': return std(gateTex(arg), { side: THREE.DoubleSide, alphaTest: 0.5, roughness: 0.5, metalness: 0.25 });
    case 'name': return std(plaqueTex(arg));
    case 'sign': return std(plaqueTex(arg, { bg: '#f7f7f4', ink: '#151515', w: 1024, h: 150, border: '#151515' }));
    case 'brick': return std(brickTex(), { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
    default: throw new Error(`comb-hostel: no material ${key}`);
  }
}

// ---------- geometry helpers (a Hostel-like object H in its own local frame) ----------
// A vertical quad on the wall line from P0 to P1 (local [u, v]), facing `n`; uv across from ua to ub.
function wallQuad(H, key, P0, P1, n, y0, y1, ua, ub) {
  // Hostel.quad's face normal is (-dv, du): order the corners so it points along n
  const dv = P1[1] - P0[1]; const du = P1[0] - P0[0];
  if (-dv * n[0] + du * n[1] < 0) { [P0, P1] = [P1, P0]; [ua, ub] = [ub, ua]; }
  const g = new THREE.BufferGeometry();
  const P = [[P0[0], y0, P0[1]], [P1[0], y0, P1[1]], [P1[0], y1, P1[1]], [P0[0], y1, P0[1]]];
  const UV = [[ua, 0], [ub, 0], [ub, 1], [ua, 1]];
  const idx = [0, 1, 2, 0, 2, 3];
  const nn = [n[0], 0, n[1]];
  g.setAttribute('position', new THREE.Float32BufferAttribute(idx.flatMap((i) => P[i]), 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(idx.flatMap(() => nn), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(idx.flatMap((i) => UV[i]), 2));
  H.geo(key, g);
}

// The edges of a ring, each with its direction d and outward normal n (towards the side that is not building).
function edgesOf(ring, isIn) {
  const E = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]; const b = ring[(i + 1) % ring.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 0.05) continue;
    const d = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
    let n = [d[1], -d[0]];
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (isIn(m[0] + n[0] * 0.15, m[1] + n[1] * 0.15)) n = [-n[0], -n[1]];
    E.push({ a, b, len, d, n });
  }
  return E;
}

// A box against an edge: s along it from its start, o outwards from the wall line.
function edgeBox(H, e, s0, s1, o0, o1, y0, y1, key, opts = { collide: false }) {
  if (s1 - s0 < 0.01) return;
  const p = (s, o) => [e.a[0] + e.d[0] * s + e.n[0] * o, e.a[1] + e.d[1] * s + e.n[1] * o];
  const [u0, v0] = p(s0, o0); const [u1, v1] = p(s1, o1);
  if (!key) { H.col(Math.min(u0, u1), Math.max(u0, u1), Math.min(v0, v1), Math.max(v0, v1), y0, y1); return; } // a collider only
  H.box(Math.min(u0, u1), Math.max(u0, u1), Math.min(v0, v1), Math.max(v0, v1), y0, y1, key, opts);
}

// [s0, s1] with the ranges in `skip` taken out.
function minus(s0, s1, skip) {
  let parts = [[s0, s1]];
  for (const [k0, k1] of skip) parts = parts.flatMap(([a, b]) => (k1 <= a || k0 >= b ? [[a, b]] : [[a, Math.min(b, k0)], [Math.max(a, k1), b]].filter(([x, y]) => y - x > 0.02)));
  return parts;
}

// The facade along every edge of the given rings (local frame). opts:
//   porch    { ve, door: [v0, v1] | null }: the spine face (u = 0) leaves the porch's width to the porch
//   parapet  build the parapet too (the walk-in Bhawans get theirs from Hostel.buildRoof)
function facade(H, rings, isIn, st, { porch = null, parapet = false } = {}) {
  const c = (hex) => `c:${hex}`;
  for (const ring of rings) {
    const E = edgesOf(ring, isIn);
    for (const e of E) {
      const n = Math.max(1, Math.round(e.len / MOD)); const bw = e.len / n;
      // the porch's stretch of the spine face, in s
      let skip = []; let door = null;
      const spine = porch && Math.abs(e.a[0]) < 0.01 && Math.abs(e.b[0]) < 0.01;
      if (spine) {
        const s = (v) => (v - e.a[1]) * e.d[1];
        skip = [[s(porch.ve - PW / 2), s(porch.ve + PW / 2)].sort((x, y) => x - y)];
        if (porch.door) door = porch.door.map(s).sort((x, y) => x - y);
      }
      const at = (s, o = 0) => [e.a[0] + e.d[0] * s + e.n[0] * o, e.a[1] + e.d[1] * s + e.n[1] * o];
      // the wall faces, floor by floor (the ground floor leaves the door open under a lintel)
      for (let k = 0; k < FLOORS; k++) {
        const key = e.len < 1.2 ? c(st.wall) : k === 0 ? st.g : st.u;
        const y0 = k * FH; const y1 = y0 + FH;
        for (const [s0, s1] of k === 0 && door ? minus(0, e.len, [door]) : [[0, e.len]]) wallQuad(H, key, at(s0), at(s1), e.n, y0, y1, s0 / bw, s1 / bw);
        if (k === 0 && door) wallQuad(H, c(st.wall), at(door[0]), at(door[1]), e.n, 2.7, FH, 0, 1);
      }
      // walls block, except through the door
      for (const [s0, s1] of door ? minus(0, e.len, [door]) : [[0, e.len]]) edgeBox(H, e, s0, s1, -0.1, 0.05, 0, R + 1, null, { collide: true });
      for (const [s0, s1] of minus(0, e.len, skip)) {
        edgeBox(H, e, s0, s1, 0, 0.09, 0, 0.45, c(st.plinth));
        if (st.band) {
          edgeBox(H, e, s0, s1, 0, 0.2, FH - 0.14, FH + 0.05, c(st.band));
          edgeBox(H, e, s0, s1, 0, 0.12, FH + 0.05, FH + 0.3, c(st.trim));
          edgeBox(H, e, s0, s1, 0, 0.3, R - 0.42, R - 0.24, c(st.band));
          edgeBox(H, e, s0, s1, 0, 0.18, R - 0.24, R, c(st.trim));
        } else {
          edgeBox(H, e, s0, s1, 0, 0.08, FH - 0.1, FH + 0.1, c(st.trim));
          edgeBox(H, e, s0, s1, 0, 0.12, R - 0.22, R, c(st.trim));
        }
        // the parapet's coping and its maroon line
        edgeBox(H, e, s0, s1, -0.27, 0.1, R + 0.95, R + 1.05, c('#f4efe4'));
        if (st.band) edgeBox(H, e, s0, s1, 0, 0.03, R + 0.62, R + 0.72, c(st.band));
        if (parapet) edgeBox(H, e, s0, s1, -0.25, 0, R, R + 0.95, c(st.wall), { collide: true });
      }
      if (e.len < 1.2) continue;
      // per bay: pilasters between the ground-floor arches, fins between the first-floor recesses, sunshades
      for (let j = 0; j <= n; j++) {
        const s = j * bw;
        if (skip.some(([a, b]) => s > a - 0.3 && s < b + 0.3)) continue;
        if (st.fins) {
          edgeBox(H, e, Math.max(0, s - 0.2), Math.min(e.len, s + 0.2), 0, 0.06, 0.45, FH - 0.14, c(st.wall));
          edgeBox(H, e, Math.max(0, s - 0.17), Math.min(e.len, s + 0.17), 0, 0.42, FH + 0.3, R - 0.42, c(st.wall));
        }
        if (st.chajja && j < n && !skip.some(([a, b]) => s + bw > a && s < b)) {
          for (let k = 0; k < FLOORS; k++) edgeBox(H, e, s + bw / 2 - 1.15, s + bw / 2 + 1.15, 0, 0.5, k * FH + 2.32, k * FH + 2.42, c(st.trim));
        }
      }
    }
    // convex corners: fill the gap the bands leave where two faces meet
    for (let i = 0; i < E.length; i++) {
      const e1 = E[i]; const e2 = E[(i + 1) % E.length];
      const P = e1.b;
      let mat = 0; for (const [du, dv] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) if (isIn(P[0] + du * 0.1, P[1] + dv * 0.1)) mat++;
      if (mat !== 1) continue;
      const fill = (o, y0, y1, key) => { const q = [P[0] + (e1.n[0] + e2.n[0]) * o, P[1] + (e1.n[1] + e2.n[1]) * o]; H.box(Math.min(P[0], q[0]), Math.max(P[0], q[0]), Math.min(P[1], q[1]), Math.max(P[1], q[1]), y0, y1, key, { collide: false }); };
      fill(0.09, 0, 0.45, c(st.plinth));
      if (st.band) { fill(0.2, FH - 0.14, FH + 0.05, c(st.band)); fill(0.12, FH + 0.05, FH + 0.3, c(st.trim)); fill(0.3, R - 0.42, R - 0.24, c(st.band)); fill(0.18, R - 0.24, R, c(st.trim)); fill(0.03, R + 0.62, R + 0.72, c(st.band)); } else { fill(0.08, FH - 0.1, FH + 0.1, c(st.trim)); fill(0.12, R - 0.22, R, c(st.trim)); }
      fill(0.1, R + 0.95, R + 1.05, c('#f4efe4'));
    }
  }
}

// An extruded outline in the u = const plane: shape x runs along v (from vc), y is height; the shape's front face
// looks down -u and its back sits at uBack.
function extrudeU(H, shape, depth, uBack, vc, key) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 4 });
  g.rotateY(-Math.PI / 2);
  g.translate(uBack, 0, vc);
  H.geo(key, g);
}

// The three-arch porch on the spine's outer face (u = 0, looking down -u), centred at v = ve (AK, ML, BG photos).
// open: which of the three arches (from -v to +v) has no gate. Two steps up from the road, one down into the lobby.
function porch(H, ve, { name, open = [true, false, false], gate = 'scroll', st = STYLE.comb, forecourt = false } = {}) {
  const c = (hex) => `c:${hex}`;
  const f = -PD; const wall = c(st.wall); const trim = c(st.trim);
  const ARCH = [-3.6, 0, 3.6]; const HW = 1.1; const SPRING = 1.95; const APEX = 2.55;
  const head = (cx, hw = HW) => archHead(cx, hw, SPRING, APEX, 0.12);
  // the ground-floor front: one outline with the three arches as notches from the bottom
  const front = new THREE.Shape();
  front.moveTo(PW / 2, 0); front.lineTo(PW / 2, FH); front.lineTo(-PW / 2, FH); front.lineTo(-PW / 2, 0);
  for (const cx of ARCH) { front.lineTo(cx - HW, 0); front.lineTo(cx - HW, SPRING); for (const [x, y] of head(cx).reverse()) front.lineTo(x, y); front.lineTo(cx + HW, 0); }
  front.closePath();
  extrudeU(H, front, 0.4, f + 0.4, ve, wall);
  // raised beige surrounds round each arch, a rosette in each spandrel
  for (const cx of ARCH) {
    const s = new THREE.Shape();
    s.moveTo(cx + HW, 0); for (const [x, y] of head(cx)) s.lineTo(x, y); s.lineTo(cx - HW, 0);
    s.lineTo(cx - HW - 0.3, 0); s.lineTo(cx - HW - 0.3, APEX + 0.42); s.lineTo(cx + HW + 0.3, APEX + 0.42); s.lineTo(cx + HW + 0.3, 0); s.closePath();
    extrudeU(H, s, 0.07, f, ve, trim);
    for (const sx of [-1, 1]) { const g = new THREE.CylinderGeometry(0.12, 0.12, 0.05, 10); g.rotateZ(Math.PI / 2); g.translate(f - 0.09, APEX + 0.1, ve + cx + sx * (HW + 0.05)); H.geo(c('#f6eedc'), g); }
  }
  // piers block; the gated arches block
  const edges = [-PW / 2, ...ARCH.flatMap((cx) => [cx - HW, cx + HW]), PW / 2];
  for (let i = 0; i < edges.length; i += 2) H.col(f - 0.07, f + 0.4, ve + edges[i], ve + edges[i + 1], 0, FH);
  ARCH.forEach((cx, i) => {
    H.col(f, f + 0.4, ve + cx - HW, ve + cx + HW, 2.2, FH); // over the arch
    if (open[i]) return;
    const s = new THREE.Shape(); s.moveTo(cx - HW, 0); s.lineTo(cx + HW, 0); for (const [x, y] of head(cx)) s.lineTo(x, y); s.closePath();
    const g = new THREE.ShapeGeometry(s, 4);
    const uv = g.attributes.uv; const top = APEX + 0.14;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, (uv.getX(k) - (cx - HW)) / (2 * HW), uv.getY(k) / top);
    g.rotateY(-Math.PI / 2); g.translate(f + 0.2, 0, ve);
    H.geo(`n:gate:${gate}`, g);
    H.col(f, f + 0.4, ve + cx - HW, ve + cx + HW, 0, 2.3);
  });
  // returns (side walls) up to the parapet
  for (const sv of [-1, 1]) {
    const v0 = ve + sv * PW / 2; const v1 = v0 - sv * 0.4;
    H.box(f, 0, Math.min(v0, v1), Math.max(v0, v1), 0, R + 0.95, wall);
  }
  // floor, step, ceiling and light of the vestibule
  const vi0 = ve - PW / 2 + 0.4; const vi1 = ve + PW / 2 - 0.4;
  H.box(f, 0, vi0, vi1, 0, 0.12, 't:terrazzo:#d9d3c3', { walkable: true });
  H.box(f - 0.5, f, ve - PW / 2, ve + PW / 2, 0, 0.06, 't:concrete:#cfc8b8', { walkable: true });
  H.box(f + 0.4, 0, vi0, vi1, FH - 0.2, FH - 0.02, c('#f1ede4'), { collide: false });
  H.box(-1.3, -1.22, ve - 0.6, ve + 0.6, FH - 0.26, FH - 0.2, 'e:#fffaf0', { collide: false });
  // the name band and the maroon band at the first floor, wrapping round the returns
  H.box(f - 0.1, f, ve - 4.0, ve + 4.0, 2.72, 3.12, c('#dcc08f'), { collide: false });
  const plaque = new THREE.PlaneGeometry(7.8, 0.38); plaque.rotateY(-Math.PI / 2); plaque.translate(f - 0.105, 2.92, ve);
  if (name) H.geo(`n:name:${name}`, plaque);
  H.box(f - 0.2, f + 0.4, ve - PW / 2 - 0.2, ve + PW / 2 + 0.2, FH - 0.14, FH + 0.05, c(st.band || st.trim), { collide: false });
  for (const sv of [-1, 1]) { const v = ve + sv * (PW / 2 + 0.1); H.box(f, 0, v - 0.1, v + 0.1, FH - 0.14, FH + 0.05, c(st.band || st.trim), { collide: false }); }
  // first floor: an open loggia, paired turned columns on pedestals, a low wall between them
  H.box(f, f + 0.3, vi0, vi1, FH, FH + 0.7, wall, { collide: false });
  H.box(f - 0.04, f + 0.34, vi0, vi1, FH + 0.7, FH + 0.78, c('#f4efe4'), { collide: false });
  const lathe = new THREE.LatheGeometry([[0.001, 0], [0.16, 0], [0.16, 0.1], [0.12, 0.16], [0.13, 0.45], [0.16, 0.85], [0.135, 1.3], [0.115, 1.68], [0.15, 1.74], [0.17, 1.86], [0.001, 1.86]].map(([x, y]) => new THREE.Vector2(x, y)), 10);
  for (const vc of [-1.75, 1.75, -4.25, 4.25]) {
    for (const dv of [-0.28, 0.28]) {
      const v = ve + vc + dv; const u = f + 0.18;
      H.box(u - 0.2, u + 0.2, v - 0.2, v + 0.2, FH, FH + 0.78, c('#e8cfa3'), { collide: false });
      const g = lathe.clone(); g.translate(u, FH + 0.78, v); H.geo(c('#e8cfa3'), g);
      H.box(u - 0.2, u + 0.2, v - 0.2, v + 0.2, FH + 2.64, FH + 2.74, c('#e8cfa3'), { collide: false });
    }
  }
  // entablature, porch roof, parapet
  H.box(f, f + 0.4, ve - PW / 2, ve + PW / 2, R - 0.56, R - 0.24, wall, { collide: false });
  H.box(f - 0.2, f + 0.4, ve - PW / 2 - 0.2, ve + PW / 2 + 0.2, R - 0.42, R - 0.24, c(st.band || st.trim), { collide: false });
  H.box(f + 0.4, 0, vi0, vi1, R - 0.4, R - 0.22, c('#f1ede4'), { collide: false });
  H.box(-1.3, -1.22, ve - 0.6, ve + 0.6, R - 0.46, R - 0.4, 'e:#fffaf0', { collide: false });
  const slab = worldBoxGeometry(PD, 0.22, PW, TEX_SIZE.concrete); slab.translate(f / 2, R - 0.11, ve); H.geo('t:concrete:#d6d0c4', slab);
  H.box(f, f + 0.25, ve - PW / 2, ve + PW / 2, R, R + 0.95, wall, { collide: false });
  H.box(f - 0.1, f + 0.35, ve - PW / 2 - 0.1, ve + PW / 2 + 0.1, R + 0.95, R + 1.07, c('#f4efe4'), { collide: false });
  if (st.band) H.box(f - 0.03, f, ve - PW / 2, ve + PW / 2, R + 0.62, R + 0.72, c(st.band), { collide: false });
  // the forecourt: red-brick paving, gate pillars with ball finials, a round planter (Ashok, tour panorama)
  if (forecourt) {
    const b = worldBoxGeometry(8.6, 0.03, 18, 1.2); b.translate(f - 0.5 - 4.3, 0.015, ve); H.geo('n:brick', b);
    for (const sv of [-1, 1]) {
      const v = ve + sv * 3.4; const u = f - 9.6;
      H.box(u - 0.32, u + 0.32, v - 0.32, v + 0.32, 0, 1.9, wall);
      H.box(u - 0.38, u + 0.38, v - 0.38, v + 0.38, 1.9, 2.02, c('#f4efe4'), { collide: false });
      const ball = new THREE.SphereGeometry(0.22, 12, 8); ball.translate(u, 2.24, v); H.geo(c('#f4efe4'), ball);
    }
    H.cyl(f - 5.2, 0, ve + 6.2, 1.0, 0.45, c('#d8c9ab'), 18);
    const shrub = new THREE.SphereGeometry(0.85, 12, 8); shrub.scale(1, 0.8, 1); shrub.translate(f - 5.2, 0.95, ve + 6.2); H.geo(c('#4b7a3e'), shrub);
    H.col(f - 6.2, f - 4.2, ve + 5.2, ve + 7.2, 0, 1.4);
  }
}

// A roof tower (mumty) on the roof between u0..u1, v0..v1: walls, coping, jaali openings, maybe two water tanks.
function mumty(H, u0, u1, v0, v1, tanks = false) {
  H.box(u0, u1, v0, v1, R, R + 2.5, 't:plaster:#ebe3cf');
  H.box(u0 - 0.12, u1 + 0.12, v0 - 0.12, v1 + 0.12, R + 2.5, R + 2.68, 'c:#f4efe3', { collide: false });
  const uc = (u0 + u1) / 2; const vc = (v0 + v1) / 2;
  const w = Math.min(2.5, v1 - v0 - 0.2);
  wallQuad(H, 'x:mumty', [u0 - 0.01, vc - w / 2], [u0 - 0.01, vc + w / 2], [-1, 0], R, R + 2.5, 0, 1);
  wallQuad(H, 'x:mumty', [u1 + 0.01, vc - w / 2], [u1 + 0.01, vc + w / 2], [1, 0], R, R + 2.5, 0, 1);
  if (tanks) for (const dv of [-0.8, 0.8]) H.cyl(uc, R + 2.68, vc + dv, 0.55, 1.0, 'c:#1f2326', 14);
}

// A thin roof slab whose top is the roof (R): drawn directly, so Hostel.box doesn't pull it down under the roof.
function slab(H, u0, u1, v0, v1) {
  if (u1 - u0 < 0.01 || v1 - v0 < 0.01) return;
  const g = worldBoxGeometry(u1 - u0, 0.04, v1 - v0, TEX_SIZE.concrete);
  g.translate((u0 + u1) / 2, R - 0.02, (v0 + v1) / 2);
  H.geo('t:concrete:#d6d0c4', g);
}

// Rows of solar panels on an arm's roof (the drone view shows them on some arms only).
function solar(H, u0, u1, v0, v1) {
  for (let v = v0 + 1.4; v < v1 - 1.1; v += 2.3) {
    for (let u = u0; u + 4 <= u1; u += 4.4) {
      const g = new THREE.BoxGeometry(4.0, 0.05, 1.05); g.rotateX(0.32); g.translate(u + 2, R + 0.62, v); H.geo('c:#223a5a', g);
      for (const du of [0.3, 3.7]) for (const [dv, h] of [[-0.42, 0.45], [0.42, 0.8]]) H.box(u + du - 0.03, u + du + 0.03, v + dv - 0.03, v + dv + 0.03, R, R + h, 'c:#9aa1a8', { collide: false });
      H.col(u, u + 4, v - 0.55, v + 0.55, R, R + 0.9);
    }
  }
}

// ---------- the walk-in combs ----------
export class CombHostel extends Hostel {
  layout(b) {
    const plan = combPlan(b.outer);
    this.name = COMB[b.name] || b.name;
    this.eu = plan.eu; this.ev = plan.ev;
    this.angle = Math.atan2(plan.ev[0], plan.ev[1]);
    this.O = plan.origin;
    this.W = plan.W; this.L = plan.L;
    this.outline = plan.pts;
    this.arms = plan.arms;
    this.twoCourts = false;
    this.court = [];
    b.outer = plan.pts.map(([u, v]) => { const p = this.world(u, v); return [p.x, p.z]; });
    b.holes = [];
    b.h = FLOORS * FH;
    b.hostel = this;
    b.module = MODULE_ID; // the campus doesn't extrude it: the facade, roof and porch are built here
    const L = this.L;
    // the spine: rooms on its outer side, a corridor on the inner side; arms: a corridor along the v0 side
    this.wings = { W: { map: (s, t) => [4.5 - s, t], depth: DEPTH, tw: [OUT, L - OUT], tb: [OUT + T, L - OUT - T] } };
    this.arms.forEach((a, i) => {
      const depth = Math.min(DEPTH, a.v1 - a.v0 - 2 * OUT - T - 1.9);
      a.cw = a.v1 - OUT - depth;
      a.name = `A${i}`;
      this.wings[a.name] = { map: (s, t) => [t, a.cw + s], depth, tw: [WD - SCREEN, a.u1 - OUT], tb: [WD, a.u1 - OUT - T] };
    });
  }

  // A dog-leg stair in each arm where it leaves the spine corridor (under the roof towers of the drone view), on
  // arms deep enough for its landing; then the rooms fill the rest as usual.
  fillSegs(wings, out) {
    if (!this.armStairs) {
      this.armStairs = [];
      for (const a of this.arms) {
        const w = this.wings[a.name];
        if (w.depth < 3.9) continue;
        for (let k = 0; k < FLOORS; k++) this.spaces.push({ wing: a.name, k, t0: w.tb[0] + 0.2, t1: w.tb[0] + 0.2 + MOD, type: 'stair', top: FLOORS - 1, label: 'Wing stairs' });
        this.armStairs.push(a.name);
      }
    }
    super.fillSegs(wings, out);
  }

  planCourtyards() { this.cricket = null; this.football = null; }

  // The way in is through the porch: "outside the door" is the porch's vestibule, in line with the lobby door.
  entranceCut() {
    super.entranceCut();
    this.entrance.out = this.world(-1.25, this.ve);
  }

  corridorRects() {
    return [
      { u0: 4.75, u1: WD - SCREEN, v0: OUT, v1: this.L - OUT, w: 'W' },
      ...this.arms.map((a) => ({ u0: WD - SCREEN, u1: a.u1 - OUT, v0: a.v0 + OUT, v1: a.cw - T, w: a.name })),
    ];
  }

  // No arcades: the inside face of every outer wall (the facade is one-sided), with windows onto the corridors,
  // and an end wall where each arm's rooms meet the spine corridor. Then the facade itself, outside the wall line.
  buildScreens() {
    const H = FLOORS * FH;
    const pts = this.outline; const n = pts.length;
    for (let i = 0; i < n; i++) {
      const [ua, va] = pts[i]; const [ub, vb] = pts[(i + 1) % n];
      if (Math.abs(ua) < 0.01 && Math.abs(ub) < 0.01) continue; // the spine's outer face: rooms and spaces have their own back walls
      const alongU = Math.abs(ub - ua) > Math.abs(vb - va);
      if (alongU) {
        const v = va; const inV = inside(pts, (ua + ub) / 2, v + 0.15) ? 1 : -1;
        this.box(Math.min(ua, ub), Math.max(ua, ub), v + inV * 0.1, v + inV * OUT, 0, H, 't:plaster:#f3efe6'); // 10 cm behind the facade
        // windows onto an arm corridor
        const arm = this.arms.find((a) => Math.abs(a.v0 - v) < 0.05 && inV > 0);
        if (arm) for (let k = 0; k < FLOORS; k++) for (let u = WD + 1.4; u < arm.u1 - 1.2; u += 3.4) this.glass(u, v + OUT, k, 'u');
      } else {
        const u = ua; const inU = inside(pts, u + 0.15, (va + vb) / 2) ? 1 : -1;
        this.box(u + inU * 0.1, u + inU * OUT, Math.min(va, vb), Math.max(va, vb), 0, H, 't:plaster:#f3efe6');
        if (Math.abs(u - WD) < 0.05) for (let k = 0; k < FLOORS; k++) for (let v = Math.min(va, vb) + 1.4; v < Math.max(va, vb) - 1.2; v += 3.4) this.glass(WD - OUT, v, k, 'v');
      }
    }
    for (const a of this.arms) this.box(WD - SCREEN, WD, a.cw - T, a.v1 - OUT, 0, H, 't:plaster:#f3efe6');
    facade(this, [pts], (u, v) => inside(pts, u, v), STYLE.comb, { porch: { ve: this.ve, door: [this.ve - 1.5, this.ve + 1.5] } });
  }

  // A window on the inside of an outer wall at (u, v) facing into the building; along: the wall's direction.
  glass(u, v, k, along) {
    const y0 = k * FH;
    const [du, dv] = along === 'u' ? [0.6, 0.02] : [0.02, 0.6];
    this.box(u - du - 0.08, u + du + 0.08, v - dv - 0.005, v + dv + 0.005, y0 + 1.0, y0 + 2.36, 'c:#efe7d6', { collide: false });
    this.box(u - du, u + du, v - dv - 0.01, v + dv + 0.01, y0 + 1.06, y0 + 2.3, 'e:#b9d7ee', { collide: false });
  }

  roofStrips() {
    return [{ u0: 0, u1: WD, v0: 0, v1: this.L }, ...this.arms.map((a) => ({ u0: WD, u1: a.u1, v0: a.v0, v1: a.v1 }))];
  }

  roofParapets(par) {
    const pts = this.outline; const n = pts.length;
    for (let i = 0; i < n; i++) {
      const [ua, va] = pts[i]; const [ub, vb] = pts[(i + 1) % n];
      if (Math.abs(ub - ua) > Math.abs(vb - va)) { const inV = inside(pts, (ua + ub) / 2, va + 0.15) ? 1 : -1; par(Math.min(ua, ub), Math.max(ua, ub), va, va + inV * 0.25); } else { const inU = inside(pts, ua + 0.15, (va + vb) / 2) ? 1 : -1; par(ua, ua + inU * 0.25, Math.min(va, vb), Math.max(va, vb)); }
    }
  }

  // The terrace (Hostel.buildRoof: walkable strips, parapets, the main stair's head room, tanks, washing lines), and
  // here its slab (with the opening over the main stair), a tower over each wing stair, solar panels on two arms.
  buildRoof() {
    super.buildRoof();
    const st = this.spaces.find((s) => s.type === 'stair' && s.roof);
    const h0 = st.t0; const h1 = st.t0 + MOD;
    for (const r of this.roofStrips()) {
      if (r.u0 === 0) { slab(this, 0, WD, 0, h0); slab(this, 0, WD, h1, this.L); slab(this, 0, 0.3, h0, h1); slab(this, 4.5 - 0.84, WD, h0, h1); } else slab(this, r.u0, r.u1, r.v0, r.v1);
    }
    this.buildMumties();
    this.arms.forEach((a, i) => { if (i === 1 || i === 2) solar(this, WD + (this.armStairs.includes(a.name) ? MOD + 1.6 : 1.2), a.u1 - 1.2, a.v0, a.v1); });
  }

  // The porch (instead of Hostel's plain door canopy), the cycle stand beside it and the name over it.
  buildOutside() {
    const ve = this.ve;
    porch(this, ve, { name: PLAQUE[this.name], forecourt: this.name === 'Ashok Bhawan' });
    const v0 = ve + PW / 2 + 1.8; const v1 = v0 + 9;
    for (const [u, v] of [[-4.2, v0], [-4.2, v1], [-1.4, v0], [-1.4, v1]]) this.box(u - 0.06, u + 0.06, v - 0.06, v + 0.06, 0, 2.4, 'm:#7b8288');
    this.box(-4.5, -1.1, v0 - 0.3, v1 + 0.3, 2.4, 2.48, 'c:#5b7c99', { collide: false });
    this.col(-4.5, -1.1, v0 - 0.2, v1 + 0.2, 0, 1.0);
    let s = 23;
    const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const cols = ['#c62828', '#1565c0', '#2e7d32', '#212121', '#6a1b9a', '#ef6c00'];
    for (let v = v0 + 0.3; v < v1; v += 0.75) {
      const col = cols[Math.floor(r() * cols.length)];
      for (const du of [-0.55, 0.55]) { const tor = new THREE.TorusGeometry(0.33, 0.025, 6, 16); tor.translate(-2.8 + du, 0.35, v); this.geo('c:#1b1b1b', tor); }
      this.box(-3.35, -2.25, v - 0.02, v + 0.02, 0.55, 0.6, `c:${col}`, { collide: false });
      this.box(-3.0, -2.95, v - 0.02, v + 0.02, 0.35, 0.85, `c:${col}`, { collide: false });
      this.box(-2.3, -2.25, v - 0.25, v + 0.25, 0.95, 0.98, 'c:#333', { collide: false });
    }
    const p = this.world(-2.8, (v0 + v1) / 2);
    this.campus.label('Cycle parking', p.x, 2.9, p.z, { height: 0.38 });
    const e = this.world(-PD - 1.5, ve);
    this.campus.label(this.name, e.x, R + 2.4, e.z, { height: 0.7, bg: 'rgba(60,50,40,0.9)' });
    this.legend('🚲', 'Cycle stand', [0], -2.8, (v0 + v1) / 2);
    this.npcSpots.lobbyChat = [{ at: this.world(1.2, ve - 1.2), yaw: this.entrance.yaw + Math.PI / 2 }, { at: this.world(1.2, ve + 0.1), yaw: this.entrance.yaw - Math.PI / 2 }];
  }

  // The gaps between the arms are open ground, not courtyards: nothing to build there.
  buildCourtyards() { this.shadeTrees = []; }

  // Built with the first comb: the Bhawans in this file that are not walk-in (they share its merged shell).
  build() {
    super.build();
    const c = this.campus;
    if (!c.combAnnexes && Array.isArray(c.buildings)) c.combAnnexes = buildAnnexes(this);
  }

  material(key) {
    if (!key.startsWith('n:')) return super.material(key);
    if (!myMats.has(key)) myMats.set(key, makeMaterial(key));
    return myMats.get(key);
  }

  treeOk(x, z) {
    const [u, v] = this.local(x, z);
    for (const [du, dv] of [[0, 0], [2, 0], [-2, 0], [0, 2], [0, -2]]) if (inside(this.outline, u + du, v + dv)) return false;
    if (u > -14 && u < 0 && v > this.ve - PW / 2 - 4 && v < this.ve + PW / 2 + 14) return false; // porch, forecourt and cycle stand
    return true;
  }

  roomAt(x, z) {
    const [u, v] = this.local(x, z);
    return inside(this.outline, u, v) ? 'hostel' : null;
  }
}

// ---------- the Bhawans built here that you can't walk into ----------
// A Hostel-like object in its own frame for the geometry helpers (box, col, geo, cyl); its pieces go to the host's
// merged shell once placed in the world.
function shellBlock(host, { O, eu, ev }) {
  const B = Object.create(Hostel.prototype);
  return Object.assign(B, { campus: host.campus, O, eu, ev, angle: Math.atan2(ev[0], ev[1]), parts: new Map(), layer: null, customMats: {} });
}

function bake(B, host) {
  const m = new THREE.Matrix4().makeRotationY(B.angle).setPosition(B.O[0], 0, B.O[1]);
  for (const [key, list] of B.parts) {
    if (!host.shellOut.has(key)) host.shellOut.set(key, []);
    host.shellOut.get(key).push(...list.map((g) => g.applyMatrix4(m)));
  }
  B.parts.clear();
}

// A flat roof over a squared outline with holes (courts), its top at R.
function roofShape(B, outer, holes) {
  const shape = new THREE.Shape(outer.map(([u, v]) => new THREE.Vector2(u, -v)));
  for (const h of holes) shape.holes.push(new THREE.Path(h.map(([u, v]) => new THREE.Vector2(u, -v))));
  const g = new THREE.ShapeGeometry(shape);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / TEX_SIZE.concrete, uv.getY(i) / TEX_SIZE.concrete);
  g.rotateX(-Math.PI / 2);
  g.translate(0, R, 0);
  B.geo('t:concrete:#d6d0c4', g);
}

// Bhagirath: the comb mirrored, its porch facing west towards Gandhi and Krishna, the gates shut.
function closedComb(host, b) {
  const plan = combPlan(b.outer);
  const B = shellBlock(host, { O: plan.origin, eu: plan.eu, ev: plan.ev });
  const pts = plan.pts; const isIn = (u, v) => inside(pts, u, v);
  const ve = plan.L / 2; // the porch bump in OSM is at v 40…54
  facade(B, [pts], isIn, STYLE.blue, { porch: { ve, door: null }, parapet: true });
  porch(B, ve, { name: PLAQUE['Bhagirath Bhawan'], open: [false, false, false], gate: 'green', st: STYLE.blue });
  slab(B, 0, WD, 0, plan.L);
  plan.arms.forEach((a, i) => {
    slab(B, WD, a.u1, a.v0, a.v1);
    const vc = (a.v0 + a.v1) / 2; const hw = Math.min(1.7, (a.v1 - a.v0) / 2 - 0.6);
    mumty(B, WD + 0.3, WD + 3.7, vc - hw, vc + hw, i % 2 === 0);
    if (i === 1 || i === 2) solar(B, WD + 5, a.u1 - 1.2, a.v0, a.v1);
  });
  mumty(B, 0.6, 4.2, ve + PW / 2 + 0.6, ve + PW / 2 + 4.0, true);
  bake(B, host);
}

// Malviya-B, SR, Meera: the outline squared up in its own frame, the facade all round (courts too), a flat roof with
// parapets, stair towers along the longest faces, a doorway with a canopy on the longest outer face.
function block(host, b, spec) {
  const fr = frameOf(b.outer);
  const outer = squareUp(b.outer.map(fr.toLocal));
  const holes = (b.holes || []).map((h) => squareUp(h.map(fr.toLocal)));
  const B = shellBlock(host, fr);
  const isIn = (u, v) => inside(outer, u, v) && !holes.some((h) => inside(h, u, v));
  const st = STYLE[spec.style];
  facade(B, [outer, ...holes], isIn, st, { parapet: true });
  roofShape(B, outer, holes);
  // towers: over the middle of the longest outer faces, wherever a 3.4 m square fits inside
  const E = edgesOf(outer, isIn).sort((p, q) => q.len - p.len);
  let towers = 0;
  for (const e of E) {
    if (towers >= Math.max(2, Math.round(e.len / 60)) || e.len < 12) break;
    const m = [(e.a[0] + e.b[0]) / 2 - e.n[0] * 2.2, (e.a[1] + e.b[1]) / 2 - e.n[1] * 2.2];
    const ok = [[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]].every(([du, dv]) => isIn(m[0] + du, m[1] + dv));
    if (!ok) continue;
    mumty(B, m[0] - 1.7, m[0] + 1.7, m[1] - 1.7, m[1] + 1.7, towers % 2 === 0);
    towers++;
  }
  // the doorway: a dark recess, steps and a canopy, a quarter of the way along the longest face
  const e = E[0]; const s = e.len * 0.25;
  const at = (ss, o) => [e.a[0] + e.d[0] * ss + e.n[0] * o, e.a[1] + e.d[1] * ss + e.n[1] * o];
  wallQuad(B, 'c:#3a332c', at(s - 0.9, 0.03), at(s + 0.9, 0.03), e.n, 0.15, 2.5, 0, 1);
  edgeBox(B, e, s - 1.1, s + 1.1, 0.03, 0.12, 0, 2.62, `c:${st.trim}`);
  edgeBox(B, e, s - 1.6, s + 1.6, 0, 1.3, 2.62, 2.76, `c:${st.trim}`);
  edgeBox(B, e, s - 1.4, s + 1.4, 0, 0.9, 0, 0.15, 't:concrete:#cfc8b8', { collide: true, walkable: true });
  bake(B, host);
}

// SR's gate on the service road (SWD photo: yellow pillars, a steel gate with diagonal bars, the name on a board).
// Where it stands is an approximation: the road's west end, which leads to the SR blocks.
function srGate(host) {
  const a = [-1, -236]; const b = [125, -259];
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]); const d = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  const ev = [-d[1], d[0]]; const eu = [ev[1], -ev[0]];
  const O = [a[0] + d[0] * 6, a[1] + d[1] * 6];
  const B = shellBlock(host, { O, eu, ev });
  const yellow = 'c:#e2c06a';
  for (const v of [-3.2, 3.2]) {
    B.box(-0.35, 0.35, v - 0.35, v + 0.35, 0, 2.3, yellow);
    B.box(-0.4, 0.4, v - 0.4, v + 0.4, 2.3, 2.4, 'c:#f2f0ea', { collide: false });
  }
  // the gate, swung open against the pillars: a frame with diagonal bars
  for (const sv of [-1, 1]) {
    const v = sv * 2.8; const u0 = 0.4; const u1 = 2.9;
    B.box(u0, u1, v - 0.03, v + 0.03, 0.15, 0.2, 'c:#1c1c1c', { collide: false });
    B.box(u0, u1, v - 0.03, v + 0.03, 1.75, 1.8, 'c:#1c1c1c', { collide: false });
    for (const u of [u0, (u0 + u1) / 2, u1]) B.box(u - 0.03, u + 0.03, v - 0.03, v + 0.03, 0.15, 1.8, 'c:#1c1c1c', { collide: false });
    for (let k = 0; k < 6; k++) { const g = new THREE.BoxGeometry(0.04, 1.9, 0.03); g.rotateX(0); g.rotateZ(0.7); g.translate(u0 + 0.25 + k * 0.42, 0.98, v); B.geo('c:#f0f0f0', g); }
    B.col(u0, u1, v - 0.05, v + 0.05, 0, 1.8);
  }
  // the name board on two posts beside the gate
  for (const v of [4.2, 8.2]) B.box(-0.06, 0.06, v - 0.06, v + 0.06, 0, 2.9, 'c:#2b2b2b');
  B.box(-0.05, 0.05, 3.9, 8.5, 2.2, 2.95, 'c:#f7f7f4', { collide: false });
  const sign = new THREE.PlaneGeometry(4.5, 0.66); sign.rotateY(-Math.PI / 2); sign.translate(-0.06, 2.58, 6.2);
  B.geo('n:sign:श्रीनिवास रामानुजन भवन', sign);
  bake(B, host);
}

function buildAnnexes(host) {
  const c = host.campus; const done = [];
  const attempt = (b, fn) => {
    const c0 = c.colliders.length;
    try { fn(); b.module = MODULE_ID; done.push(b.name || b.annex); } catch (e) {
      console.error(`[${MODULE_ID}] ${b.name || b.annex}: using the plain block`, e);
      c.colliders.length = c0;
    }
  };
  for (const b of c.buildings) {
    if (b.name === 'Bhagirath Bhawan') attempt(b, () => closedComb(host, b));
    else if (b.annex && ANNEX[b.annex]) attempt(b, () => { block(host, b, ANNEX[b.annex]); if (b.annex === 'sr') srGate(host); });
  }
  return done;
}

// ---------- footprints missing from data/bits-campus.js ----------
// OpenStreetMap (ODbL), converted to game metres with research/COORDINATES.md; outer ring and courts (holes).
// Added to BITS_CAMPUS.buildings here, unless the data already has them (by `annex` id or name).
const ANNEX = {
  // Malviya-B, relation 5372379 (dormitory, four courts)
  'malviya-b': { name: 'Malviya-B', style: 'comb', osm: 'relation 5372379',
    outer: [[-254.5,206],[-254.7,205.2],[-255.4,205.3],[-256,201.5],[-255.6,201.4],[-255.8,200.2],[-256.2,200.3],[-256.9,196],[-256.2,195.8],[-256.4,194.4],[-253.7,193.9],[-253.8,193.4],[-256.5,193.8],[-256.8,192.4],[-257.5,192.6],[-258.3,188.1],[-257.9,188],[-258,187],[-258.4,187.1],[-259.3,182.3],[-258.8,182.2],[-259,180.8],[-259.5,180.9],[-260.3,176],[-261.9,176.3],[-262.6,172.2],[-260.7,171.9],[-261.4,167.5],[-261,167.4],[-261.2,166.1],[-261.7,166.1],[-262.4,161.6],[-262.1,161.5],[-262.3,160.4],[-262.6,160.4],[-263.4,156],[-262.7,155.9],[-262.9,154.6],[-260.6,154.2],[-260.7,153.5],[-263,153.9],[-263.3,152.5],[-264,152.6],[-264.7,148.4],[-264,148.3],[-264.2,147.1],[-264.9,147.2],[-265.7,142.4],[-264.7,142.3],[-264.9,141.3],[-261.5,140.8],[-261.2,142.3],[-259.5,142],[-259.8,140.5],[-256.3,139.9],[-255.8,143],[-254.9,142.9],[-254.4,145.7],[-255.1,145.8],[-254.9,146.9],[-254.3,146.8],[-253.5,151.3],[-250.5,150.7],[-251.9,142.4],[-246.1,141.4],[-245.3,146],[-244.2,145.9],[-245,141.2],[-238.7,140.2],[-237.2,148.8],[-234.6,148.3],[-235.3,144],[-234.4,143.9],[-234.6,142.5],[-235.5,142.7],[-236.3,138.1],[-235.2,137.9],[-235.3,137],[-231.8,136.4],[-231.6,137.8],[-230.2,137.6],[-230.5,136.2],[-226.3,135.5],[-225.3,141.1],[-225.9,141.2],[-225.7,142.5],[-225.1,142.4],[-224.4,146.5],[-225.2,146.7],[-225,148.1],[-228.1,148.6],[-227.9,149.6],[-224.8,149.1],[-224.6,150.4],[-223.8,150.2],[-223,154.8],[-223.6,154.9],[-223.4,156.1],[-222.8,156],[-222,160.9],[-222.5,161],[-222.3,162],[-221.8,161.9],[-221,166.5],[-220,166.3],[-218.6,174.8],[-221,175.2],[-220.7,176.7],[-220.2,176.6],[-219.4,181],[-219.9,181.1],[-219.7,182.2],[-219.2,182.1],[-218.3,187.5],[-218.8,187.6],[-218.6,188.8],[-221.8,189.3],[-221.6,190.3],[-218.4,189.7],[-218.2,191],[-217.7,190.9],[-217.1,194.5],[-218,194.6],[-217.7,196],[-216.9,195.9],[-216.3,199.2],[-217.7,199.4],[-217.5,200.6],[-220.1,201.1],[-220.3,200.1],[-222,200.4],[-221.9,201.4],[-225,201.9],[-225.1,201.2],[-226.4,201.4],[-227.1,197.2],[-226.2,197.1],[-226.4,196],[-227.3,196.1],[-228,191.9],[-227,191.7],[-227.2,190.5],[-232.3,191.4],[-231,199.3],[-235.4,200],[-236.1,195.5],[-237.7,195.7],[-236.9,200.3],[-241.7,201.1],[-243.1,192.6],[-247.9,193.4],[-247.7,194.6],[-246.7,194.5],[-245.9,199],[-246.8,199.1],[-246.6,200.1],[-245.8,200],[-245,204.4],[-249.7,205.2],[-249.8,204.4],[-251.3,204.6],[-251.2,205.4]],
    holes: [[[-255.6,167.6],[-245.5,165.9],[-243.5,177.3],[-253.6,179]],
      [[-238.4,165.2],[-228,163.5],[-226.1,174.7],[-236.5,176.5]],
      [[-253.5,153.5],[-234.1,150.2],[-233.1,156.1],[-232.4,156],[-232.2,157.3],[-232.9,157.4],[-232,162.2],[-251.5,165.5],[-252.4,160],[-253.1,160.1],[-253.3,159],[-252.6,158.8]],
      [[-249.7,179.9],[-230.5,176.7],[-229.5,182.6],[-228.5,182.4],[-228.3,183.7],[-229.3,183.9],[-228.4,188.8],[-247.6,192.1],[-248.5,186.9],[-249.3,187],[-249.5,185.7],[-248.7,185.5]]] },
  // Srinivasa Ramanujan Bhawan (SR), relation 5372462 (two courts); named as its POI, so they share one label
  sr: { name: 'Srinivas Ramanujan Bhawan', style: 'modern', osm: 'relation 5372462',
    outer: [[-116.3,-241.4],[-96.4,-244.5],[-97.5,-251.9],[-112,-249.7],[-111.8,-248.3],[-121.8,-246.8],[-122,-248.2],[-166.9,-241.4],[-167.6,-245.9],[-170.2,-245.5],[-170.8,-249],[-168.2,-249.4],[-169,-255.1],[-144.4,-258.8],[-144.6,-259.5],[-134.7,-261],[-134.6,-260.3],[-116.7,-263],[-117.8,-269.8],[-120,-269.5],[-120.8,-274.1],[-123.5,-273.7],[-124.1,-277.7],[-121.4,-278.1],[-122.2,-283.1],[-84.6,-289],[-84.8,-290.5],[-74.8,-292],[-74.6,-290.6],[-24.6,-298.5],[-24.8,-299.6],[-14.6,-301.2],[-14.4,-300.1],[3.7,-302.9],[4.7,-296.6],[7.9,-297.1],[8.4,-294.2],[5.2,-293.7],[5.9,-289.3],[-33.2,-283.1],[-33.1,-282.3],[-40.9,-281.1],[-41,-281.9],[-55.8,-279.6],[-54.6,-272.2],[-36,-275],[-35.1,-269.6],[-32.4,-270],[-31.9,-266.7],[-34.6,-266.3],[-33.9,-261.5],[-51.8,-258.8],[-51.6,-257.5],[-62,-255.9],[-62.2,-257.2],[-95.6,-252.2],[-94.4,-244.8],[-78.6,-247.2],[-78.7,-248],[-68,-249.6],[-67.8,-248.9],[-18.6,-256.4],[-18.8,-257.4],[-9.8,-258.8],[-10.4,-262.3],[-7.6,-262.7],[-10.1,-278.9],[7.8,-281.6],[13.1,-247.6],[-25.6,-241.6],[-25.4,-240.2],[-35.2,-238.7],[-35.4,-240.1],[-49,-238],[-47.8,-230.3],[-30,-233.1],[-29.1,-227.4],[-24.9,-228.1],[-24.3,-224.3],[-28.5,-223.7],[-27.7,-218.4],[-44.9,-215.8],[-44.7,-214.7],[-54.9,-213.2],[-55.1,-214.2],[-104.7,-206.5],[-104.4,-205.1],[-114.7,-203.5],[-114.9,-204.9],[-160.7,-197.8],[-161.7,-203.8],[-163.9,-203.4],[-164.4,-206.5],[-162.2,-206.9],[-163.1,-212.4],[-137.9,-216.3],[-138,-217.2],[-127.8,-218.8],[-127.7,-217.9],[-109.3,-220.8],[-110.5,-228.6],[-114.2,-228],[-114.8,-231.9],[-117.1,-231.5],[-117.6,-235.2],[-115.4,-235.6]],
    holes: [[[-114.4,-263.3],[-83.3,-268],[-83.4,-268.9],[-74.8,-270.2],[-74.6,-269.2],[-56.6,-271.9],[-57.8,-279.6],[-92.3,-274.2],[-92.2,-273.3],[-101.5,-271.9],[-101.7,-272.7],[-115.5,-270.5]],
      [[-49.9,-230],[-51.1,-237.7],[-86.5,-232.3],[-86.3,-231.2],[-95.4,-229.8],[-95.6,-230.9],[-108.9,-228.8],[-107.6,-221],[-78.2,-225.6],[-78.4,-226.8],[-67.9,-228.4],[-67.7,-227.3]]] },
  // Meera Bhawan, relation 20803053: way 360838104 (the jagged block) and way 360838157 (the long bar)
  'meera-a': { name: 'Meera Bhawan', style: 'comb', osm: 'relation 20803053, way 360838104',
    outer: [[-155.8,691.7],[-180.9,696.3],[-181.5,693.1],[-185.7,693.8],[-185.6,694.5],[-203.1,697.7],[-205.7,684],[-192,681.5],[-192.4,679],[-202.5,680.8],[-203.7,674.3],[-190.2,671.8],[-191,668],[-195.4,668.8],[-195.9,665.9],[-188.7,664.6],[-184.7,686.4],[-182.8,686.1],[-184.1,679.3],[-162.2,675.3],[-162.1,676.2],[-158.8,675.6]], holes: [] },
  'meera-b': { name: null, style: 'peach', osm: 'relation 20803053, way 360838157',
    outer: [[-184.5,673.2],[-186.4,660.7],[-90.2,645.9],[-88.3,658.5]], holes: [] },
};
export const ANNEXES = ANNEX;

for (const [id, a] of Object.entries(ANNEX)) {
  if (D.buildings.some((b) => b.annex === id || (a.name && b.name === a.name))) continue;
  D.buildings.push({ name: a.name, kind: 'hostel', h: R, outer: a.outer.map((p) => [...p]), holes: a.holes.map((h) => h.map((p) => [...p])), inCampus: true, annex: id });
}
