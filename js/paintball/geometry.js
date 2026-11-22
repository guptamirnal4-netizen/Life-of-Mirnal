// The whole BITS campus as collision geometry for the paintball match, shared by the game server and the browser
// (client-side prediction). The browser builds the campus (js/world/bits-world.js) but the server cannot, so
// dev/export-campus-collision.mjs reads the built campus's colliders, trees, sunken courts (pits) and boundary
// in headless Chrome and writes js/paintball/data/campus-collision.{json,bin}. This file encodes / decodes that
// data and answers the questions movement and paintballs ask: where is the floor, what does a body bump into,
// what does a paintball hit first. Plain math, no three.js or DOM.
//
// The rules copy the life-sim player (js/world/player.js) so a paintball player walks exactly where the game's
// own player walks: walls block; a walkable box (stair tread, landing, upper floor) can be stepped onto when its
// top is at most STEP above your feet; the floor is the highest walkable top under you that you can step onto, or
// the ground (0, or a sunken court's floor: the NAB at -4.5, the Rotunda / lower NAB at -9).

export const GEO_VERSION = 1;
export const STEP = 0.7; // highest step-up (player.js floorAt / resolve)
export const BODY_R = 0.32; // the life-sim player's foot radius
export const HEAD = 1.7; // a box starting more than this above your feet is over your head
const CELL = 4; // spatial grid cell, m

// ---------- tiny geometry ----------
export function inPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i]; const [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
export function polyBox(poly) {
  let minX = Infinity; let maxX = -Infinity; let minZ = Infinity; let maxZ = -Infinity;
  for (const [x, z] of poly) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
  return { minX, maxX, minZ, maxZ };
}

// A 53-bit string hash of bytes (cyrb53), the same in Node and the browser. Not cryptographic: it only tells the
// client and the server that they loaded the same export.
export function hashBytes(u8) {
  let h1 = 0xdeadbeef; let h2 = 0x41c6ce57;
  for (let i = 0; i < u8.length; i++) { const c = u8[i]; h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

// ---------- encoding (the exporter) ----------
// boxes: [{ minX, maxX, minZ, maxZ, minY, maxY, walkable }] in metres; trees: [{ x, z, r, y0, h }].
// Everything is stored in centimetres, column by column (better compression), sorted for determinism, with x and z
// delta-coded. Layout (little-endian): u32 nBoxes, u32 nTrees, then the box columns x0 i32, z0 i32, w u16, d u16,
// y0 i16, h u16, flags u8, then the tree columns x i32, z i32, r u16, y0 i16, h u16.
const cm = (v) => Math.round(v * 100);
export function encodeGeometry(boxes, trees) {
  const B = boxes.map((b) => { const x0 = cm(b.minX); const z0 = cm(b.minZ); const y0 = cm(b.minY); return [x0, z0, cm(b.maxX) - x0, cm(b.maxZ) - z0, y0, cm(b.maxY) - y0, b.walkable ? 1 : 0]; })
    .filter((b) => b[2] > 0 && b[3] > 0 && b[5] > 0);
  const T = trees.map((t) => [cm(t.x), cm(t.z), cm(t.r), cm(t.y0 || 0), cm(t.h)]);
  const key = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };
  const band = (v) => Math.floor(v / 1600);
  B.sort((a, b) => band(a[1]) - band(b[1]) || key(a, b));
  T.sort((a, b) => band(a[1]) - band(b[1]) || key(a, b));
  // drop exact duplicates
  const uniq = (L) => L.filter((r, i) => i === 0 || key(r, L[i - 1]) !== 0);
  const bx = uniq(B); const tr = uniq(T);
  for (const b of bx) {
    if (b[2] > 65535 || b[3] > 65535 || b[5] > 65535) throw new Error(`box too large to encode: ${b}`);
    if (b[4] < -32768 || b[4] > 32767) throw new Error(`box y out of range: ${b}`);
  }
  const n = bx.length; const m = tr.length;
  const buf = new ArrayBuffer(8 + n * (4 + 4 + 2 + 2 + 2 + 2 + 1) + m * (4 + 4 + 2 + 2 + 2));
  const dv = new DataView(buf); let o = 0;
  const u32 = (v) => { dv.setUint32(o, v, true); o += 4; }; const i32 = (v) => { dv.setInt32(o, v, true); o += 4; };
  const u16 = (v) => { dv.setUint16(o, v, true); o += 2; }; const i16 = (v) => { dv.setInt16(o, v, true); o += 2; };
  const u8 = (v) => { dv.setUint8(o, v); o += 1; };
  u32(n); u32(m);
  let p = 0; for (const b of bx) { i32(b[0] - p); p = b[0]; }
  p = 0; for (const b of bx) { i32(b[1] - p); p = b[1]; }
  for (const b of bx) u16(b[2]); for (const b of bx) u16(b[3]); for (const b of bx) i16(b[4]); for (const b of bx) u16(b[5]); for (const b of bx) u8(b[6]);
  p = 0; for (const t of tr) { i32(t[0] - p); p = t[0]; }
  p = 0; for (const t of tr) { i32(t[1] - p); p = t[1]; }
  for (const t of tr) u16(t[2]); for (const t of tr) i16(t[3]); for (const t of tr) u16(t[4]);
  return new Uint8Array(buf);
}

// ---------- decoding + queries ----------
// bytes: the decompressed payload; header: the JSON header (boundary, pits, water, hash).
export function decodeGeometry(bytes, header) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); let o = 0;
  const u32 = () => { const v = dv.getUint32(o, true); o += 4; return v; };
  const n = u32(); const m = u32(); const N = n + m;
  // trees become boxes of half-size r, exactly the life-sim's trunk colliders
  const minX = new Float32Array(N); const maxX = new Float32Array(N); const minZ = new Float32Array(N); const maxZ = new Float32Array(N);
  const minY = new Float32Array(N); const maxY = new Float32Array(N); const flags = new Uint8Array(N);
  let p = 0; for (let i = 0; i < n; i++) { p += dv.getInt32(o, true); o += 4; minX[i] = p / 100; }
  p = 0; for (let i = 0; i < n; i++) { p += dv.getInt32(o, true); o += 4; minZ[i] = p / 100; }
  for (let i = 0; i < n; i++) { maxX[i] = minX[i] + dv.getUint16(o, true) / 100; o += 2; }
  for (let i = 0; i < n; i++) { maxZ[i] = minZ[i] + dv.getUint16(o, true) / 100; o += 2; }
  for (let i = 0; i < n; i++) { minY[i] = dv.getInt16(o, true) / 100; o += 2; }
  for (let i = 0; i < n; i++) { maxY[i] = minY[i] + dv.getUint16(o, true) / 100; o += 2; }
  for (let i = 0; i < n; i++) { flags[i] = dv.getUint8(o); o += 1; }
  const tx = new Float32Array(m); const tz = new Float32Array(m);
  p = 0; for (let i = 0; i < m; i++) { p += dv.getInt32(o, true); o += 4; tx[i] = p / 100; }
  p = 0; for (let i = 0; i < m; i++) { p += dv.getInt32(o, true); o += 4; tz[i] = p / 100; }
  for (let i = 0; i < m; i++) { const r = dv.getUint16(o, true) / 100; o += 2; const k = n + i; minX[k] = tx[i] - r; maxX[k] = tx[i] + r; minZ[k] = tz[i] - r; maxZ[k] = tz[i] + r; flags[k] = 2; }
  for (let i = 0; i < m; i++) { minY[n + i] = dv.getInt16(o, true) / 100; o += 2; }
  for (let i = 0; i < m; i++) { maxY[n + i] = minY[n + i] + dv.getUint16(o, true) / 100; o += 2; }
  return new CampusGeo({ minX, maxX, minZ, maxZ, minY, maxY, flags, n, m }, header);
}

export class CampusGeo {
  constructor(a, header) {
    Object.assign(this, a);
    this.count = a.n + a.m;
    this.header = header;
    this.hash = header.hash;
    this.boundary = header.boundary;
    this.bbox = polyBox(header.boundary);
    this.pits = (header.pits || []).map((q) => ({ ...q, ...polyBox(q.poly) }));
    this.water = (header.water || []).map((q) => ({ poly: q.poly, ...polyBox(q.poly) }));
    this.rings = header.rings || []; // ring canals: { c: [x, z], r: [r0, r1] }
    // spatial grid (CSR): cell → box indices
    const gx0 = Math.floor((this.bbox.minX - 40) / CELL); const gz0 = Math.floor((this.bbox.minZ - 40) / CELL);
    const gw = Math.ceil((this.bbox.maxX + 40) / CELL) - gx0 + 1; const gh = Math.ceil((this.bbox.maxZ + 40) / CELL) - gz0 + 1;
    Object.assign(this, { gx0, gz0, gw, gh });
    const range = (i) => [Math.max(0, Math.floor(a.minX[i] / CELL) - gx0), Math.min(gw - 1, Math.floor(a.maxX[i] / CELL) - gx0), Math.max(0, Math.floor(a.minZ[i] / CELL) - gz0), Math.min(gh - 1, Math.floor(a.maxZ[i] / CELL) - gz0)];
    const counts = new Uint32Array(gw * gh + 1);
    for (let i = 0; i < this.count; i++) { const [x0, x1, z0, z1] = range(i); for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) counts[z * gw + x + 1]++; }
    for (let k = 1; k < counts.length; k++) counts[k] += counts[k - 1];
    const fill = counts.slice(0, gw * gh);
    const idx = new Uint32Array(counts[gw * gh]);
    for (let i = 0; i < this.count; i++) { const [x0, x1, z0, z1] = range(i); for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) idx[fill[z * gw + x]++] = i; }
    this.cellStart = counts; this.cellIdx = idx;
    this.stamp = new Uint32Array(this.count); this.stampId = 0;
    this.found = new Uint32Array(4096);
  }

  // Box indices whose grid cells overlap [x0, x1] × [z0, z1] (deduplicated). Returns { list, n } (shared buffer).
  query(x0, x1, z0, z1) {
    const gw = this.gw;
    const cx0 = Math.max(0, Math.floor(x0 / CELL) - this.gx0); const cx1 = Math.min(gw - 1, Math.floor(x1 / CELL) - this.gx0);
    const cz0 = Math.max(0, Math.floor(z0 / CELL) - this.gz0); const cz1 = Math.min(this.gh - 1, Math.floor(z1 / CELL) - this.gz0);
    if (++this.stampId === 0xffffffff) { this.stamp.fill(0); this.stampId = 1; }
    const id = this.stampId; let n = 0; let out = this.found;
    for (let z = cz0; z <= cz1; z++) {
      for (let x = cx0; x <= cx1; x++) {
        const c = z * gw + x;
        for (let k = this.cellStart[c]; k < this.cellStart[c + 1]; k++) {
          const i = this.cellIdx[k];
          if (this.stamp[i] === id) continue;
          this.stamp[i] = id;
          if (n >= out.length) { const g = new Uint32Array(out.length * 2); g.set(out); out = this.found = g; }
          out[n++] = i;
        }
      }
    }
    return { list: out, n };
  }

  walkable(i) { return (this.flags[i] & 1) === 1; }
  isTree(i) { return (this.flags[i] & 2) === 2; }

  // Bare ground at (x, z): 0, or a sunken court's floor.
  groundAt(x, z) {
    for (const p of this.pits) if (x > p.minX && x < p.maxX && z > p.minZ && z < p.maxZ && inPoly(x, z, p.poly)) return p.y;
    return 0;
  }

  // The floor under someone at height y: the ground, raised by any walkable top they can step onto (≤ y + STEP).
  floorAt(x, z, y = 0) {
    let f = this.groundAt(x, z);
    const { list, n } = this.query(x, x, z, z);
    for (let k = 0; k < n; k++) {
      const i = list[k];
      if (!(this.flags[i] & 1)) continue;
      const top = this.maxY[i];
      if (top <= f || y < top - STEP) continue;
      if (x > this.minX[i] && x < this.maxX[i] && z > this.minZ[i] && z < this.maxZ[i]) f = top;
    }
    return f;
  }

  inBounds(x, z) { return inPoly(x, z, this.boundary); }
  inWater(x, z) {
    for (const w of this.water) if (x > w.minX && x < w.maxX && z > w.minZ && z < w.maxZ && inPoly(x, z, w.poly)) return true;
    for (const r of this.rings) { const d = Math.hypot(x - r.c[0], z - r.c[1]); if (d > r.r[0] && d < r.r[1]) return true; }
    return false;
  }

  // Push a foot circle at (p.x, p.z), feet at p.y, out of what it bumps into: player.js resolve().
  resolve(p, axis, r = BODY_R) {
    const { list, n } = this.query(p.x - r, p.x + r, p.z - r, p.z + r);
    for (let k = 0; k < n; k++) {
      const i = list[k];
      const top = this.maxY[i];
      if (p.y >= top - 0.05) continue;
      if (this.minY[i] > p.y + HEAD) continue;
      if ((this.flags[i] & 1) && p.y + STEP >= top) continue;
      const x0 = this.minX[i]; const x1 = this.maxX[i]; const z0 = this.minZ[i]; const z1 = this.maxZ[i];
      const nx = p.x < x0 ? x0 : p.x > x1 ? x1 : p.x; const nz = p.z < z0 ? z0 : p.z > z1 ? z1 : p.z;
      const dx = p.x - nx; const dz = p.z - nz; const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-10) { const d = Math.sqrt(d2); p.x += (dx / d) * (r - d); p.z += (dz / d) * (r - d); continue; }
      if (axis === 'x') {
        if (dx !== 0) p.x = nx + Math.sign(dx) * Math.sqrt(r * r - dz * dz);
        else if (dz === 0) p.x = p.x < (x0 + x1) / 2 ? x0 - r : x1 + r;
      } else if (dz !== 0) p.z = nz + Math.sign(dz) * Math.sqrt(r * r - dx * dx);
      else if (dx === 0) p.z = p.z < (z0 + z1) / 2 ? z0 - r : z1 + r;
    }
  }

  // Is a body of radius r standing at (x, z) with feet at y overlapping anything solid?
  blockedAt(x, z, y, r = BODY_R) {
    const { list, n } = this.query(x - r, x + r, z - r, z + r);
    for (let k = 0; k < n; k++) {
      const i = list[k];
      const top = this.maxY[i];
      if (y >= top - 0.05 || this.minY[i] > y + HEAD) continue;
      if ((this.flags[i] & 1) && y + STEP >= top) continue;
      const nx = Math.max(this.minX[i], Math.min(x, this.maxX[i])); const nz = Math.max(this.minZ[i], Math.min(z, this.maxZ[i]));
      if ((x - nx) ** 2 + (z - nz) ** 2 < r * r) return true;
    }
    return false;
  }

  // First solid a segment a → b (3D) hits: { t, n, kind: 'solid' | 'ground', id } or null. Long segments are
  // split so the grid query stays local.
  sweep(a, b) {
    const L = Math.hypot(b.x - a.x, b.z - a.z);
    const parts = Math.max(1, Math.ceil(L / 6));
    for (let s = 0; s < parts; s++) {
      const t0 = s / parts; const t1 = (s + 1) / parts;
      const pa = { x: a.x + (b.x - a.x) * t0, y: a.y + (b.y - a.y) * t0, z: a.z + (b.z - a.z) * t0 };
      const pb = { x: a.x + (b.x - a.x) * t1, y: a.y + (b.y - a.y) * t1, z: a.z + (b.z - a.z) * t1 };
      const h = this.sweepShort(pa, pb);
      if (h) return { ...h, t: t0 + h.t * (t1 - t0) };
    }
    return null;
  }

  sweepShort(a, b) {
    const dx = b.x - a.x; const dy = b.y - a.y; const dz = b.z - a.z;
    const { list, n } = this.query(Math.min(a.x, b.x), Math.max(a.x, b.x), Math.min(a.z, b.z), Math.max(a.z, b.z));
    let best = null;
    for (let k = 0; k < n; k++) {
      const i = list[k];
      let t0 = 0; let t1 = best ? best.t : 1; let axis = -1; let sign = 0; let ok = true;
      const lo = [this.minX[i], this.minY[i], this.minZ[i]]; const hi = [this.maxX[i], this.maxY[i], this.maxZ[i]];
      const o = [a.x, a.y, a.z]; const d = [dx, dy, dz];
      for (let c = 0; c < 3; c++) {
        if (Math.abs(d[c]) < 1e-12) { if (o[c] < lo[c] || o[c] > hi[c]) { ok = false; break; } continue; }
        let ta = (lo[c] - o[c]) / d[c]; let tb = (hi[c] - o[c]) / d[c]; let sg = -1;
        if (ta > tb) { const q = ta; ta = tb; tb = q; sg = 1; }
        if (ta > t0) { t0 = ta; axis = c; sign = sg; }
        if (tb < t1) t1 = tb;
        if (t0 > t1) { ok = false; break; }
      }
      if (!ok) continue;
      if (!best || t0 < best.t) {
        const nrm = { x: 0, y: 0, z: 0 };
        if (axis === 0) nrm.x = sign; else if (axis === 1) nrm.y = sign; else if (axis === 2) nrm.z = sign; else nrm.y = 1;
        best = { t: t0, n: nrm, kind: 'solid', id: `c${i}` };
      }
    }
    // the ground (or a sunken court's floor)
    const ga = this.groundAt(a.x, a.z); const gb = this.groundAt(b.x, b.z);
    if (b.y < gb && a.y >= ga - 0.01) {
      let lo = 0; let hi = 1;
      for (let it = 0; it < 18; it++) { const m = (lo + hi) / 2; const x = a.x + dx * m; const z = a.z + dz * m; if (a.y + dy * m < this.groundAt(x, z)) hi = m; else lo = m; }
      if (!best || hi < best.t) best = { t: hi, n: { x: 0, y: 1, z: 0 }, kind: 'ground' };
    }
    return best;
  }

  // Is the straight line a → b blocked? (paint splash cover, pick-up line of sight)
  blocked(a, b) {
    const h = this.sweep(a, b);
    return !!h && h.t < 0.999;
  }
}
