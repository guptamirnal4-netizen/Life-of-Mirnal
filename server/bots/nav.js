// Navigation for computer-controlled paintball players (bots).
//
// Whole Campus: a coarse waypoint graph built offline by dev/build-bot-nav.mjs from the same 1 m flood fill of
// reachable ground the Campus Royale registries use (stairs, upper floors, doorways, the sunken NAB / Rotunda
// courts). Each node stands for a patch of mutually reachable ground inside one 8 m cell; an edge means "walk
// straight from this node to that one (through the listed via points)" and every edge was walked by the builder
// with the game's own movement code. Stored gzip-compressed in js/paintball/data/bot-nav.{bin,json}. A* runs on the
// server, time-sliced (a node-expansion budget per tick) with a small path cache.
//
// Med-C Ground: a visibility graph round the inflated bunkers, built at load time (a few dozen nodes).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { hashBytes } from '../../js/paintball/geometry.js';
import { segCyl, segBox } from '../../js/paintball/sim.js';

export const NAV_VERSION = 1;
const DATA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../js/paintball/data');

// ---------- encoding (the builder) ----------
// nodes: [[x, z, y]]; edges: per node [[target, [[x, z, y] via…]]]. Positions in metres.
// Layout (little-endian): u32 N, u32 E, u32 V; N×i16 x (dm), N×i16 z (dm), N×i16 y (cm); N×u8 out-degree;
// E×i32 target − source; E×u8 via count; V×(i16 x dm, i16 z dm, i16 y cm).
export function encodeNav(nodes, edges) {
  const N = nodes.length; let E = 0; let V = 0;
  for (const list of edges) { E += list.length; for (const [, via] of list) V += via.length; }
  const buf = new ArrayBuffer(12 + N * 7 + E * 5 + V * 6);
  const dv = new DataView(buf); let o = 0;
  const u32 = (v) => { dv.setUint32(o, v, true); o += 4; }; const i32 = (v) => { dv.setInt32(o, v, true); o += 4; };
  const i16 = (v) => { if (v < -32768 || v > 32767) throw new Error(`nav value out of range ${v}`); dv.setInt16(o, v, true); o += 2; };
  const u8 = (v) => { if (v > 255) throw new Error(`nav count out of range ${v}`); dv.setUint8(o, v); o += 1; };
  const dm = (v) => Math.round(v * 10); const cm = (v) => Math.round(v * 100);
  u32(N); u32(E); u32(V);
  for (const n of nodes) i16(dm(n[0])); for (const n of nodes) i16(dm(n[1])); for (const n of nodes) i16(cm(n[2]));
  for (const list of edges) u8(list.length);
  edges.forEach((list, i) => { for (const [t] of list) i32(t - i); });
  for (const list of edges) for (const [, via] of list) u8(via.length);
  for (const list of edges) for (const [, via] of list) for (const p of via) { i16(dm(p[0])); i16(dm(p[1])); i16(cm(p[2])); }
  return new Uint8Array(buf);
}

export function decodeNav(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); let o = 0;
  const u32 = () => { const v = dv.getUint32(o, true); o += 4; return v; };
  const N = u32(); const E = u32(); const V = u32();
  const x = new Float32Array(N); const z = new Float32Array(N); const y = new Float32Array(N);
  for (let i = 0; i < N; i++) { x[i] = dv.getInt16(o, true) / 10; o += 2; }
  for (let i = 0; i < N; i++) { z[i] = dv.getInt16(o, true) / 10; o += 2; }
  for (let i = 0; i < N; i++) { y[i] = dv.getInt16(o, true) / 100; o += 2; }
  const start = new Uint32Array(N + 1);
  for (let i = 0; i < N; i++) { start[i + 1] = start[i] + dv.getUint8(o); o += 1; }
  const tgt = new Uint32Array(E);
  for (let i = 0; i < N; i++) for (let k = start[i]; k < start[i + 1]; k++) { tgt[k] = i + dv.getInt32(o, true); o += 4; }
  const viaStart = new Uint32Array(E + 1);
  for (let k = 0; k < E; k++) { viaStart[k + 1] = viaStart[k] + dv.getUint8(o); o += 1; }
  const vx = new Float32Array(V); const vz = new Float32Array(V); const vy = new Float32Array(V);
  for (let k = 0; k < V; k++) { vx[k] = dv.getInt16(o, true) / 10; vz[k] = dv.getInt16(o + 2, true) / 10; vy[k] = dv.getInt16(o + 4, true) / 100; o += 6; }
  return new NavGraph({ x, z, y, start, tgt, viaStart, vx, vz, vy });
}

// ---------- the graph ----------
const GRID = 8; // m, nearest-node lookup cell
export class NavGraph {
  constructor(a) {
    Object.assign(this, a);
    this.n = a.x.length; this.e = a.tgt.length;
    // edge costs: the walked length through the via points
    this.cost = new Float32Array(this.e);
    for (let i = 0; i < this.n; i++) {
      for (let k = this.start[i]; k < this.start[i + 1]; k++) {
        let px = this.x[i]; let pz = this.z[i]; let L = 0;
        for (let v = this.viaStart[k]; v < this.viaStart[k + 1]; v++) { L += Math.hypot(this.vx[v] - px, this.vz[v] - pz); px = this.vx[v]; pz = this.vz[v]; }
        const t = this.tgt[k]; L += Math.hypot(this.x[t] - px, this.z[t] - pz) + Math.abs(this.y[t] - this.y[i]) * 0.5;
        this.cost[k] = Math.max(0.1, L);
      }
    }
    // spatial grid for nearest-node queries
    let minX = Infinity; let minZ = Infinity; let maxX = -Infinity; let maxZ = -Infinity;
    for (let i = 0; i < this.n; i++) { minX = Math.min(minX, this.x[i]); maxX = Math.max(maxX, this.x[i]); minZ = Math.min(minZ, this.z[i]); maxZ = Math.max(maxZ, this.z[i]); }
    this.gx0 = Math.floor(minX / GRID) - 1; this.gz0 = Math.floor(minZ / GRID) - 1;
    this.gw = Math.floor(maxX / GRID) - this.gx0 + 2; this.gh = Math.floor(maxZ / GRID) - this.gz0 + 2;
    const counts = new Uint32Array(this.gw * this.gh + 1);
    const cell = (i) => (Math.floor(this.z[i] / GRID) - this.gz0) * this.gw + (Math.floor(this.x[i] / GRID) - this.gx0);
    for (let i = 0; i < this.n; i++) counts[cell(i) + 1]++;
    for (let k = 1; k < counts.length; k++) counts[k] += counts[k - 1];
    const fill = counts.slice(0, this.gw * this.gh); this.cellIdx = new Uint32Array(this.n);
    for (let i = 0; i < this.n; i++) this.cellIdx[fill[cell(i)]++] = i;
    this.cellStart = counts;
    // search scratch (one search at a time per graph)
    this.g = new Float32Array(this.n); this.from = new Int32Array(this.n); this.seen = new Uint32Array(this.n); this.closed = new Uint32Array(this.n); this.stamp = 0;
  }

  // Nodes within r metres of (x, z) whose height is within dy of y, nearest first: [[index, distance]].
  near(x, z, y, r = 12, dy = 2.5, limit = 8) {
    const out = [];
    const cx0 = Math.max(0, Math.floor((x - r) / GRID) - this.gx0); const cx1 = Math.min(this.gw - 1, Math.floor((x + r) / GRID) - this.gx0);
    const cz0 = Math.max(0, Math.floor((z - r) / GRID) - this.gz0); const cz1 = Math.min(this.gh - 1, Math.floor((z + r) / GRID) - this.gz0);
    for (let cz = cz0; cz <= cz1; cz++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const c = cz * this.gw + cx;
        for (let k = this.cellStart[c]; k < this.cellStart[c + 1]; k++) {
          const i = this.cellIdx[k];
          if (Math.abs(this.y[i] - y) > dy) continue;
          const d = Math.hypot(this.x[i] - x, this.z[i] - z);
          if (d <= r) out.push([i, d + Math.abs(this.y[i] - y) * 2]);
        }
      }
    }
    out.sort((a, b) => a[1] - b[1]);
    return out.slice(0, limit);
  }

  // The waypoints of the edge k (its via points, then its target node): [[x, z, y]].
  edgePoints(k) {
    const out = [];
    for (let v = this.viaStart[k]; v < this.viaStart[k + 1]; v++) out.push([this.vx[v], this.vz[v], this.vy[v]]);
    const t = this.tgt[k]; out.push([this.x[t], this.z[t], this.y[t]]);
    return out;
  }
  node(i) { return [this.x[i], this.z[i], this.y[i]]; }

  // A time-sliced A* search from node a to any node in `goals` (a Set or one index). step(budget) expands at most
  // `budget` nodes and returns null (not finished), [] (no path) or the waypoint list [[x, z, y]] from a's first
  // edge to the goal node. Only one search per graph runs at a time (the room's BotManager queues them).
  search(a, goal) {
    const goals = goal instanceof Set ? goal : new Set([goal]);
    let gx = 0; let gz = 0; for (const t of goals) { gx += this.x[t]; gz += this.z[t]; } gx /= goals.size; gz /= goals.size;
    const self = this; const heap = new Heap();
    if (++this.stamp >= 0xfffffff0) { this.seen.fill(0); this.closed.fill(0); this.stamp = 1; }
    const S = this.stamp;
    const h = (i) => (goals.size === 1 ? Math.hypot(this.x[i] - gx, this.z[i] - gz) : 0);
    this.g[a] = 0; this.from[a] = -1; this.seen[a] = S; heap.push(a, h(a));
    let expanded = 0; let done = null;
    return {
      get expanded() { return expanded; },
      step(budget) {
        if (done) return done;
        if (self.stamp !== S) { done = []; return done; } // superseded by another search
        for (let k = 0; k < budget; k++) {
          if (!heap.size) { done = []; return done; }
          const i = heap.pop();
          if (self.closed[i] === S) continue;
          self.closed[i] = S; expanded++;
          if (goals.has(i)) { done = self.unwind(a, i); return done; }
          for (let e = self.start[i]; e < self.start[i + 1]; e++) {
            const t = self.tgt[e]; const ng = self.g[i] + self.cost[e];
            if (self.seen[t] === S && ng >= self.g[t]) continue;
            self.seen[t] = S; self.g[t] = ng; self.from[t] = e; heap.push(t, ng + h(t));
          }
        }
        return null;
      },
    };
  }
  unwind(a, goal) {
    const edges = [];
    for (let i = goal; i !== a;) { const e = this.from[i]; edges.push(e); i = this.srcOf(e); }
    const out = [];
    for (let k = edges.length - 1; k >= 0; k--) out.push(...this.edgePoints(edges[k]));
    return out.length ? out : [this.node(goal)];
  }
  srcOf(e) {
    // binary search the CSR offsets
    let lo = 0; let hi = this.n - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (this.start[m] <= e) lo = m; else hi = m - 1; }
    return lo;
  }
}

class Heap {
  constructor() { this.k = []; this.v = []; }
  get size() { return this.k.length; }
  push(id, pr) {
    const k = this.k; const v = this.v; let i = k.length; k.push(id); v.push(pr);
    while (i > 0) { const p = (i - 1) >> 1; if (v[p] <= pr) break; k[i] = k[p]; v[i] = v[p]; i = p; }
    k[i] = id; v[i] = pr;
  }
  pop() {
    const k = this.k; const v = this.v; const top = k[0]; const lk = k.pop(); const lv = v.pop();
    if (k.length) {
      let i = 0; const n = k.length;
      for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && v[c + 1] < v[c]) c++; if (v[c] >= lv) break; k[i] = k[c]; v[i] = v[c]; i = c; }
      k[i] = lk; v[i] = lv;
    }
    return top;
  }
}

// ---------- loading ----------
let loaded = null;
export function loadNav({ dir = DATA, geoHash = null } = {}) {
  if (loaded) return loaded;
  const t0 = performance.now();
  const header = JSON.parse(fs.readFileSync(path.join(dir, 'bot-nav.json'), 'utf8'));
  const bytes = new Uint8Array(zlib.gunzipSync(fs.readFileSync(path.join(dir, 'bot-nav.bin'))));
  const hash = hashBytes(bytes);
  if (hash !== header.hash) throw new Error(`bot-nav.bin does not match its header (hash ${hash}, header ${header.hash}): re-run node dev/build-bot-nav.mjs`);
  if (geoHash && header.geoHash !== geoHash) throw new Error('bot-nav.bin was built for another campus export: re-run node dev/build-bot-nav.mjs');
  const graph = decodeNav(bytes);
  loaded = { graph, header, ms: Math.round(performance.now() - t0) };
  return loaded;
}

// ---------- Med-C Ground: a visibility graph round the bunkers ----------
const PAD = 0.75; // m kept clear of a bunker's footprint by the waypoints
const BODY = 0.45; // m: a walking line must stay this far from every footprint
export class FieldNav {
  constructor(arena) {
    this.arena = arena;
    const pts = [];
    for (const s of arena.solids) {
      if (s.kind === 'cyl') { const r = s.r + PAD; for (let k = 0; k < 8; k++) pts.push([s.x + Math.cos((k * Math.PI) / 4) * r, s.z + Math.sin((k * Math.PI) / 4) * r]); } else {
        for (const [x, z] of [[s.minX - PAD, s.minZ - PAD], [s.maxX + PAD, s.minZ - PAD], [s.minX - PAD, s.maxZ + PAD], [s.maxX + PAD, s.maxZ + PAD]]) pts.push([x, z]);
      }
    }
    const b = arena.bounds;
    this.pts = pts.filter(([x, z]) => x > b.minX + 0.6 && x < b.maxX - 0.6 && z > b.minZ + 0.6 && z < b.maxZ - 0.6 && this.free(x, z));
    this.adj = this.pts.map((p, i) => this.pts.map((q, j) => (i !== j && this.clear(p[0], p[1], q[0], q[1]) ? j : -1)).filter((j) => j >= 0));
  }
  free(x, z) { for (const s of this.arena.solids) if (footDist(s, x, z) < BODY) return false; return true; }
  // can a body walk the straight line (x0, z0) → (x1, z1) without touching a bunker?
  clear(x0, z0, x1, z1) {
    const a = { x: x0, y: 0.5, z: z0 }; const b = { x: x1, y: 0.5, z: z1 };
    for (const s of this.arena.solids) {
      if (s.kind === 'cyl') { if (segCyl(a, b, s.x, s.z, s.r + BODY, 0, 9) >= 0) return false; } else if (segBox(a, b, { minX: s.minX - BODY, maxX: s.maxX + BODY, minZ: s.minZ - BODY, maxZ: s.maxZ + BODY, h: 9 })) return false;
    }
    return true;
  }
  // waypoints [[x, z, 0]] from (x0, z0) to (x1, z1) round the bunkers (straight if clear)
  path(x0, z0, x1, z1) {
    if (this.clear(x0, z0, x1, z1)) return [[x1, z1, 0]];
    const n = this.pts.length; const S = n; const T = n + 1;
    const P = (i) => (i === S ? [x0, z0] : i === T ? [x1, z1] : this.pts[i]);
    const nb = (i) => {
      if (i === S) return this.pts.map((p, j) => (this.clear(x0, z0, p[0], p[1]) ? j : -1)).filter((j) => j >= 0);
      const out = [...this.adj[i]]; const p = this.pts[i];
      if (this.clear(p[0], p[1], x1, z1)) out.push(T);
      return out;
    };
    const g = new Map([[S, 0]]); const from = new Map(); const open = new Heap(); open.push(S, 0); const closed = new Set();
    while (open.size) {
      const i = open.pop(); if (closed.has(i)) continue; closed.add(i);
      if (i === T) break;
      const [px, pz] = P(i);
      for (const j of nb(i)) {
        const [qx, qz] = P(j); const ng = g.get(i) + Math.hypot(qx - px, qz - pz);
        if (g.has(j) && ng >= g.get(j)) continue;
        g.set(j, ng); from.set(j, i); open.push(j, ng + Math.hypot(x1 - qx, z1 - qz));
      }
    }
    if (!from.has(T)) return [[x1, z1, 0]]; // no way round: walk straight and let the unstick logic deal with it
    const out = []; for (let i = T; i !== S; i = from.get(i)) out.push([...P(i), 0]);
    return out.reverse();
  }
}
function footDist(s, x, z) {
  if (s.kind === 'cyl') return Math.max(0, Math.hypot(x - s.x, z - s.z) - s.r);
  const dx = Math.max(s.minX - x, 0, x - s.maxX); const dz = Math.max(s.minZ - z, 0, z - s.maxZ);
  return Math.hypot(dx, dz);
}
