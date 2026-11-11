// The newer, comb-shaped Bhawans (Ashok, Rana Pratap, Malviya): a long spine with thin arms reaching out from
// it, and open gaps between the arms. They are laid out like the courtyard Bhawans in hostel.js, with
// different wings: the spine is the "west" wing (entrance, lobby, stairs, washrooms, common room, rooms along
// its outer wall), and each arm is a wing with a corridor along one side and rooms along the other.
//
// The OSM outline is rotated into its own frame, squared up (every edge along u or v) and simplified: the
// spine gets exactly one wing's depth, WD, so small bumps on it go. u runs from the spine's outer face (0)
// out along the arms; v runs along the spine.
import { Hostel, FH, FLOORS, DIMS } from './hostel.js';

const { DEPTH, T, OUT, SCREEN, WD } = DIMS;

export const COMB = { 'Ashok bhawan': 'Ashok Bhawan', 'Rana Pratap Bhawan': 'Rana Pratap Bhawan', 'Malviya-A': 'Malviya Bhawan' };

// Inside an outline (local [u, v] points)?
const inside = (poly, u, v) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ui, vi] = poly[i]; const [uj, vj] = poly[j];
    if (vi > v !== vj > v && u < ((uj - ui) * (v - vi)) / (vj - vi) + ui) c = !c;
  }
  return c;
};

// The comb's outline in its own frame: squared up, spine at u = 0..WD, arms as rows { v0, v1, u1 }.
export function combPlan(outline) {
  // dominant direction (edges are all roughly parallel or perpendicular to it), weighted by length
  let sx = 0; let sy = 0;
  outline.forEach((a, i) => {
    const c = outline[(i + 1) % outline.length];
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]); const th = 4 * Math.atan2(c[1] - a[1], c[0] - a[0]);
    sx += len * Math.cos(th); sy += len * Math.sin(th);
  });
  const ang = Math.atan2(sy, sx) / 4;
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
  // drop repeated points and points in the middle of a straight run
  for (let changed = true; changed;) {
    changed = false;
    for (let i = 0; i < pts.length && pts.length > 4; i++) {
      const a = pts[(i + pts.length - 1) % pts.length]; const b = pts[i]; const c = pts[(i + 1) % pts.length];
      const same = Math.hypot(b[0] - c[0], b[1] - c[1]) < 0.05;
      const straight = (Math.abs(a[0] - b[0]) < 0.05 && Math.abs(b[0] - c[0]) < 0.05) || (Math.abs(a[1] - b[1]) < 0.05 && Math.abs(b[1] - c[1]) < 0.05);
      if (same || straight) { pts.splice(i, 1); changed = true; break; }
    }
  }
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

  planCourtyards() { this.cricket = null; this.football = null; }

  corridorRects() {
    return [
      { u0: 4.75, u1: WD - SCREEN, v0: OUT, v1: this.L - OUT, w: 'W' },
      ...this.arms.map((a) => ({ u0: WD - SCREEN, u1: a.u1 - OUT, v0: a.v0 + OUT, v1: a.cw - T, w: a.name })),
    ];
  }

  // No arcades: the inside face of every outer wall (the facade is one-sided), with windows onto the corridors,
  // and an end wall where each arm's rooms meet the spine corridor.
  buildScreens() {
    const H = FLOORS * FH;
    const pts = this.outline; const n = pts.length;
    for (let i = 0; i < n; i++) {
      const [ua, va] = pts[i]; const [ub, vb] = pts[(i + 1) % n];
      if (Math.abs(ua) < 0.01 && Math.abs(ub) < 0.01) continue; // the spine's outer face: rooms and spaces have their own back walls
      const alongU = Math.abs(ub - ua) > Math.abs(vb - va);
      if (alongU) {
        const v = va; const inV = inside(pts, (ua + ub) / 2, v + 0.15) ? 1 : -1;
        this.box(Math.min(ua, ub), Math.max(ua, ub), v + inV * 0.02, v + inV * OUT, 0, H, 't:plaster:#f3efe6'); // 2 cm behind the facade
        // windows onto an arm corridor
        const arm = this.arms.find((a) => Math.abs(a.v0 - v) < 0.05 && inV > 0);
        if (arm) for (let k = 0; k < FLOORS; k++) for (let u = WD + 1.4; u < arm.u1 - 1.2; u += 3.4) this.glass(u, v + OUT, k, 'u');
      } else {
        const u = ua; const inU = inside(pts, u + 0.15, (va + vb) / 2) ? 1 : -1;
        this.box(u + inU * 0.02, u + inU * OUT, Math.min(va, vb), Math.max(va, vb), 0, H, 't:plaster:#f3efe6');
        if (Math.abs(u - WD) < 0.05) for (let k = 0; k < FLOORS; k++) for (let v = Math.min(va, vb) + 1.4; v < Math.max(va, vb) - 1.2; v += 3.4) this.glass(WD - OUT, v, k, 'v');
      }
    }
    for (const a of this.arms) this.box(WD - SCREEN, WD, a.cw - T, a.v1 - OUT, 0, H, 't:plaster:#f3efe6');
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

  // The gaps between the arms are open ground, not courtyards: nothing to build there.
  buildCourtyards() { this.shadeTrees = []; }

  treeOk(x, z) {
    const [u, v] = this.local(x, z);
    for (const [du, dv] of [[0, 0], [2, 0], [-2, 0], [0, 2], [0, -2]]) if (inside(this.outline, u + du, v + dv)) return false;
    if (u > -8 && u < 0 && v > this.ve - 8 && v < this.ve + 16) return false; // porch and cycle stand
    return true;
  }

  roomAt(x, z) {
    const [u, v] = this.local(x, z);
    return inside(this.outline, u, v) ? 'hostel' : null;
  }
}
