// Builds the bots' navigation graph for the Whole Campus from the campus collision export (run after
// dev/export-campus-collision.mjs; Node only, no browser):
//
//   node dev/build-bot-nav.mjs
//
// 1. The same reachability flood fill as dev/build-royale-spots.mjs (a 1 m grid from the Med-C Ground, stepping like
//    a player: 0.7 m step-ups, drops, walls, trunks, the boundary, floors and stairs, and the campus doorways), but
//    keeping every step between grid points as a directed edge.
// 2. Patches: inside each CELL × CELL m cell, the grid points that can walk to each other both ways form one patch
//    (so a wall, a floor level or a one-way drop splits a cell). Each patch becomes one waypoint node, placed on the
//    patch's grid point nearest its middle with the most room around it.
// 3. Edges: patch A → patch B wherever a grid step leads from A into B. The builder then walks it with the game's own
//    movement rules (js/paintball/geometry.js floorAt / blockedAt with a body a little wider than a player's, as a bot
//    walks it: straight at the next point): straight from node to node if that works; otherwise along the grid path
//    between them (through the doorway, round the corner, down the stairs), pulled tight into a few via points that
//    are each walkable in a straight line. (Sliding along a wall is never relied on: it fails from a slightly
//    different starting point.)
// 4. Only the largest strongly connected part is kept (every node can reach every other).
// Writes js/paintball/data/bot-nav.bin (gzip) and bot-nav.json (header: hash, counts). Deterministic.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { decodeGeometry, hashBytes } from '../js/paintball/geometry.js';
import { stepCampus } from '../js/paintball/sim.js';
import { encodeNav, NAV_VERSION } from '../server/bots/nav.js';

const CELL = 8; // m
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'js/paintball/data');
const header = JSON.parse(fs.readFileSync(path.join(DATA, 'campus-collision.json'), 'utf8'));
const bytes = new Uint8Array(zlib.gunzipSync(fs.readFileSync(path.join(DATA, 'campus-collision.bin'))));
if (hashBytes(bytes) !== header.hash) throw new Error('campus-collision.bin does not match its header');
const geo = decodeGeometry(bytes, header);
const t0 = Date.now();
const lap = (s) => console.log(`${s} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);

// ---------- 1. flood fill with edges ----------
const G = 1; const OX = 500; const OZ = 500; const W = 2200;
const yk = (y) => Math.round((y + 20) * 20);
const key = (ix, iz, y) => (yk(y) * W + (iz + OZ)) * W + (ix + OX);
const index = new Map(); // key → node index
const NX = []; const NZ = []; const NY = [];
const queue = [];
let eFrom = new Int32Array(1 << 20); let eTo = new Int32Array(1 << 20); let E = 0;
const eVia = new Map(); // edge → via points (doorways)
function addNode(x, z, y) {
  const ix = Math.round(x / G); const iz = Math.round(z / G); const k = key(ix, iz, y);
  let i = index.get(k);
  if (i === undefined) { i = NX.length; index.set(k, i); NX.push(ix * G); NZ.push(iz * G); NY.push(y); queue.push(i); }
  return i;
}
function addEdge(a, b, via = null) {
  if (a === b) return;
  if (E === eFrom.length) { const f = new Int32Array(E * 2); f.set(eFrom); eFrom = f; const t = new Int32Array(E * 2); t.set(eTo); eTo = t; }
  if (via) eVia.set(E, via);
  eFrom[E] = a; eTo[E] = b; E++;
}
// straight walk in 0.25 m increments with the movement rules; returns the end height or null if blocked
function walk(x0, z0, y0, x1, z1, r = 0.3) {
  const L = Math.hypot(x1 - x0, z1 - z0); const n = Math.max(1, Math.ceil(L / 0.25));
  let y = y0;
  for (let i = 1; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n; const z = z0 + ((z1 - z0) * i) / n;
    if (!geo.inBounds(x, z)) return null;
    y = geo.floorAt(x, z, y);
    if (geo.blockedAt(x, z, y, r)) return null;
  }
  return y;
}
// a player's walk (sliding along walls) from a towards b, as a bot steers; returns the end or null
function simWalk(a, b, y, maxSteps = 600) {
  const p = { x: a[0], z: a[1], y, vy: 0 };
  for (let k = 0; k < maxSteps; k++) {
    const dx = b[0] - p.x; const dz = b[1] - p.z; const d = Math.hypot(dx, dz);
    if (d < 0.3) { for (let s = 0; s < 8; s++) stepCampus(p, { f: 0, s: 0, yaw: 0 }, 1 / 30, geo); return p; }
    stepCampus(p, { f: 1, s: 0, yaw: Math.atan2(-dx, -dz), run: false }, 1 / 30, geo);
  }
  return null;
}
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const links = header.links || [];
const tried = new Set();
addNode(395, 644, 0);
while (queue.length) {
  const i = queue.pop();
  const x = NX[i]; const z = NZ[i]; const y = NY[i];
  for (const [dx, dz] of DIRS) {
    const ny = walk(x, z, y, x + dx * G, z + dz * G);
    if (ny !== null) addEdge(i, addNode(x + dx * G, z + dz * G, ny));
  }
  for (let l = 0; l < links.length; l++) {
    for (const [a, b] of [[links[l][0], links[l][1]], [links[l][1], links[l][0]]]) {
      if (Math.hypot(a[0] - x, a[1] - z) > 1.5) continue;
      const tk = `${l}:${a}`; if (tried.has(tk)) continue; tried.add(tk);
      const p = simWalk([x, z], a, y); if (!p) continue;
      const q = simWalk([p.x, p.z], b, p.y); if (!q) continue;
      addEdge(i, addNode(q.x, q.z, q.y), [[a[0], a[1], p.y], [b[0], b[1], q.y]]);
    }
  }
}
const N = NX.length;
lap(`flood fill: ${N} grid points, ${E} steps, ${eVia.size} doorway steps`);

// CSR out-edges
const outStart = new Uint32Array(N + 1);
for (let k = 0; k < E; k++) outStart[eFrom[k] + 1]++;
for (let i = 0; i < N; i++) outStart[i + 1] += outStart[i];
const outE = new Uint32Array(E); { const f = outStart.slice(0, N); for (let k = 0; k < E; k++) outE[f[eFrom[k]]++] = k; }
const hasEdge = (a, b) => { for (let j = outStart[a]; j < outStart[a + 1]; j++) if (eTo[outE[j]] === b) return true; return false; };

// ---------- 2. patches ----------
const cellOf = (i) => `${Math.floor(NX[i] / CELL)},${Math.floor(NZ[i] / CELL)}`;
const patch = new Int32Array(N).fill(-1);
const patches = []; // [members]
for (let s = 0; s < N; s++) {
  if (patch[s] >= 0) continue;
  const id = patches.length; const c = cellOf(s); const mem = [s]; patch[s] = id;
  for (let q = 0; q < mem.length; q++) {
    const i = mem[q];
    for (let j = outStart[i]; j < outStart[i + 1]; j++) {
      const k = outE[j]; const t = eTo[k];
      if (patch[t] >= 0 || eVia.has(k) || cellOf(t) !== c || !hasEdge(t, i)) continue;
      patch[t] = id; mem.push(t);
    }
  }
  patches.push(mem);
}
lap(`patches: ${patches.length}`);
const rep = patches.map((mem) => {
  let mx = 0; let mz = 0; let my = 0; for (const i of mem) { mx += NX[i]; mz += NZ[i]; my += NY[i]; } mx /= mem.length; mz /= mem.length; my /= mem.length;
  const byD = [...mem].sort((a, b) => (NX[a] - mx) ** 2 + (NZ[a] - mz) ** 2 + (NY[a] - my) ** 2 - ((NX[b] - mx) ** 2 + (NZ[b] - mz) ** 2 + (NY[b] - my) ** 2) || a - b).slice(0, 12);
  for (const r of [0.9, 0.6]) { const ok = byD.find((i) => !geo.blockedAt(NX[i], NZ[i], NY[i], r)); if (ok !== undefined) return ok; }
  return byD[0];
});

// ---------- 3. edges ----------
const P = (i) => [NX[i], NZ[i], NY[i]];
const straight = (a, b) => { const y = walk(a[0], a[1], a[2], b[0], b[1], 0.36); return y !== null && Math.abs(y - b[2]) < 0.35; };
// grid path from fine node s to fine node t staying inside patches A and B (BFS over directed steps)
function finePath(s, t, A, B) {
  const prev = new Map([[s, -1]]); const q = [s];
  for (let h = 0; h < q.length; h++) {
    const i = q[h]; if (i === t) break;
    for (let j = outStart[i]; j < outStart[i + 1]; j++) {
      const k = outE[j]; const n = eTo[k];
      if (prev.has(n) || (patch[n] !== A && patch[n] !== B)) continue;
      prev.set(n, k); q.push(n);
    }
  }
  if (!prev.has(t)) return null;
  const pts = []; // [x, z, y, mustKeep]
  for (let i = t; i !== s;) { const k = prev.get(i); pts.push([...P(i), false]); const via = eVia.get(k); if (via) for (let v = via.length - 1; v >= 0; v--) pts.push([...via[v], true]); i = eFrom[k]; }
  pts.push([...P(s), true]);
  return pts.reverse();
}
function pull(pts) {
  const out = []; let i = 0;
  while (i < pts.length - 1) {
    let j = i + 1;
    for (let k = Math.min(pts.length - 1, i + 40); k > i + 1; k--) {
      if (pts.slice(i + 1, k).some((p) => p[3])) continue; // never skip a doorway point
      if (straight(pts[i], pts[k])) { j = k; break; }
    }
    out.push(pts[j]); i = j;
  }
  return out.map((p) => [p[0], p[1], p[2]]);
}
const cand = new Map(); // A*M+B → fine edge
const M = patches.length;
for (let k = 0; k < E; k++) { const A = patch[eFrom[k]]; const B = patch[eTo[k]]; if (A !== B && !cand.has(A * M + B)) cand.set(A * M + B, k); }
lap(`candidate patch edges: ${cand.size}`);
const pedges = patches.map(() => []); let direct = 0; let pulled = 0; let failed = 0;
for (const [ab] of cand) {
  const A = Math.floor(ab / M); const B = ab % M;
  const a = P(rep[A]); const b = P(rep[B]);
  if (straight(a, b)) { pedges[A].push([B, []]); direct++; continue; }
  const fp = finePath(rep[A], rep[B], A, B);
  if (!fp) { failed++; continue; }
  const pts = pull(fp);
  pedges[A].push([B, pts.slice(0, -1)]); pulled++;
}
lap(`patch edges: ${direct} straight, ${pulled} through via points, ${failed} without a grid path`);

// ---------- 4. the largest strongly connected part (Tarjan, iterative) ----------
const idx = new Int32Array(M).fill(-1); const low = new Int32Array(M); const onStack = new Uint8Array(M); const comp = new Int32Array(M).fill(-1);
const stack = []; let counter = 0; let nComp = 0;
for (let s = 0; s < M; s++) {
  if (idx[s] >= 0) continue;
  const work = [[s, 0]]; idx[s] = low[s] = counter++; stack.push(s); onStack[s] = 1;
  while (work.length) {
    const top = work[work.length - 1]; const [v, ei] = top;
    if (ei < pedges[v].length) {
      top[1]++;
      const w = pedges[v][ei][0];
      if (idx[w] < 0) { idx[w] = low[w] = counter++; stack.push(w); onStack[w] = 1; work.push([w, 0]); } else if (onStack[w]) low[v] = Math.min(low[v], idx[w]);
    } else {
      work.pop();
      if (work.length) { const u = work[work.length - 1][0]; low[u] = Math.min(low[u], low[v]); }
      if (low[v] === idx[v]) { let w; do { w = stack.pop(); onStack[w] = 0; comp[w] = nComp; } while (w !== v); nComp++; }
    }
  }
}
const size = new Int32Array(nComp); const fine = new Int32Array(nComp);
for (let v = 0; v < M; v++) { size[comp[v]]++; fine[comp[v]] += patches[v].length; }
let big = 0; for (let c = 1; c < nComp; c++) if (size[c] > size[big]) big = c;
lap(`strongly connected parts: ${nComp}; largest ${size[big]} nodes covering ${fine[big]} of ${N} grid points (${((100 * fine[big]) / N).toFixed(1)}%)`);

// keep it, ordered by cell row then column (small index deltas compress well)
const keep = []; for (let v = 0; v < M; v++) if (comp[v] === big) keep.push(v);
keep.sort((a, b) => { const pa = P(rep[a]); const pb = P(rep[b]); return Math.floor(pa[1] / CELL) - Math.floor(pb[1] / CELL) || Math.floor(pa[0] / CELL) - Math.floor(pb[0] / CELL) || pa[2] - pb[2] || a - b; });
const newId = new Int32Array(M).fill(-1); keep.forEach((v, i) => { newId[v] = i; });
const nodes = keep.map((v) => P(rep[v]));
const edges = keep.map((v) => pedges[v].filter(([w]) => newId[w] >= 0).map(([w, via]) => [newId[w], via]).sort((a, b) => a[0] - b[0]));
const enc = encodeNav(nodes, edges);
const gz = zlib.gzipSync(enc, { level: 9 });
fs.writeFileSync(path.join(DATA, 'bot-nav.bin'), gz);
const out = {
  version: NAV_VERSION,
  geoHash: header.hash,
  hash: hashBytes(enc),
  bytes: enc.length,
  gzBytes: gz.length,
  cell: CELL,
  counts: { gridPoints: N, nodes: nodes.length, edges: edges.reduce((s, l) => s + l.length, 0), viaPoints: edges.reduce((s, l) => s + l.reduce((t, [, v]) => t + v.length, 0), 0), coveredGridPoints: fine[big] },
  note: 'Generated by dev/build-bot-nav.mjs from the campus collision export: waypoint nodes over patches of reachable ground (8 m cells), edges checked with the movement rules (js/paintball/geometry.js), straight or through via points. Decoded by server/bots/nav.js.',
};
fs.writeFileSync(path.join(DATA, 'bot-nav.json'), `${JSON.stringify(out, null, 1)}\n`);
lap(JSON.stringify(out));
