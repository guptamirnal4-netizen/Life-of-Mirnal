// Walk graph over the campus road and footpath centrelines, with A*.
// Points are [x, z] in campus metres. `blocked(x, z)` says whether a person can't stand there.

const CELL = 20;

export class NavGraph {
  constructor(roads, blocked, { maxEdge = 12, snap = 6 } = {}) {
    this.blocked = blocked;
    this.nodes = []; // { x, z, links: [index] }
    this.grid = new Map();
    const keyOf = new Map();
    const node = (x, z) => {
      const k = `${Math.round(x * 2)},${Math.round(z * 2)}`;
      if (keyOf.has(k)) return keyOf.get(k);
      const i = this.nodes.length;
      this.nodes.push({ x, z, links: [] });
      keyOf.set(k, i);
      const g = `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
      if (!this.grid.has(g)) this.grid.set(g, []);
      this.grid.get(g).push(i);
      return i;
    };
    for (const r of roads) {
      let prev = null;
      for (let i = 0; i < r.pts.length; i++) {
        const [x, z] = r.pts[i];
        if (prev === null) { prev = node(x, z); continue; }
        const p = this.nodes[prev];
        const len = Math.hypot(x - p.x, z - p.z);
        const steps = Math.max(1, Math.ceil(len / maxEdge));
        const px = p.x; const pz = p.z;
        for (let s = 1; s <= steps; s++) {
          const cur = node(px + ((x - px) * s) / steps, pz + ((z - pz) * s) / steps);
          if (cur !== prev && this.clear(this.nodes[prev], this.nodes[cur])) this.link(prev, cur);
          prev = cur;
        }
      }
    }
    // Footpaths in the data often stop a metre short of the road they join: tie loose ends to the nearest node.
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      if (n.links.length > 1) continue;
      let best = -1; let bd = snap;
      for (const j of this.near(n.x, n.z, snap)) {
        if (j === i || n.links.includes(j)) continue;
        const d = Math.hypot(this.nodes[j].x - n.x, this.nodes[j].z - n.z);
        if (d < bd && this.clear(n, this.nodes[j])) { bd = d; best = j; }
      }
      if (best >= 0) this.link(i, best);
    }
    // Keep only the main connected network: stray fragments (plaza paths, cut-off footways) lead nowhere.
    const comp = new Int32Array(this.nodes.length).fill(-1);
    const sizes = [];
    for (let i = 0; i < this.nodes.length; i++) {
      if (comp[i] >= 0) continue;
      const stack = [i];
      comp[i] = sizes.length;
      let n = 0;
      while (stack.length) {
        const k = stack.pop();
        n++;
        for (const j of this.nodes[k].links) if (comp[j] < 0) { comp[j] = sizes.length; stack.push(j); }
      }
      sizes.push(n);
    }
    const main = sizes.indexOf(Math.max(...sizes));
    for (const [k, list] of this.grid) this.grid.set(k, list.filter((i) => comp[i] === main));
  }

  link(a, b) {
    if (!this.nodes[a].links.includes(b)) this.nodes[a].links.push(b);
    if (!this.nodes[b].links.includes(a)) this.nodes[b].links.push(a);
  }

  // Extra walkable connection (e.g. a passage through a building), from point a to point b.
  addLink(a, b) {
    const ia = this.nodes.length;
    this.nodes.push({ x: a[0], z: a[1], links: [] });
    const ib = this.nodes.length;
    this.nodes.push({ x: b[0], z: b[1], links: [] });
    this.link(ia, ib);
    for (const i of [ia, ib]) {
      const n = this.nodes[i];
      const g = `${Math.floor(n.x / CELL)},${Math.floor(n.z / CELL)}`;
      if (!this.grid.has(g)) this.grid.set(g, []);
      // connect to a few nearby road nodes with a clear line
      const cands = this.nearest(n.x, n.z, 6, 40).filter((j) => j !== ia && j !== ib);
      for (const j of cands) if (this.clear(n, this.nodes[j])) { this.link(i, j); break; }
      this.grid.get(g).push(i);
    }
  }

  // Straight walk from a to b stays on open ground (sampled every metre).
  clear(a, b) {
    const ax = a.x ?? a[0]; const az = a.z ?? a[1];
    const bx = b.x ?? b[0]; const bz = b.z ?? b[1];
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.ceil(len));
    // the first 0.6 m is where the walker already stands (a seat by a wall, a stall's counter)
    for (let i = 0; i <= n; i++) if ((len * i) / n >= 0.6 && this.blocked(ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n)) return false;
    return true;
  }

  near(x, z, r) {
    const out = [];
    const g0 = Math.floor((x - r) / CELL); const g1 = Math.floor((x + r) / CELL);
    const h0 = Math.floor((z - r) / CELL); const h1 = Math.floor((z + r) / CELL);
    for (let gx = g0; gx <= g1; gx++) for (let gz = h0; gz <= h1; gz++) for (const i of this.grid.get(`${gx},${gz}`) || []) out.push(i);
    return out;
  }

  // k nearest nodes within r (growing the search if nothing is close).
  nearest(x, z, k = 8, r = 30) {
    for (let rr = r; rr <= 480; rr *= 2) {
      const c = this.near(x, z, rr).map((i) => [i, Math.hypot(this.nodes[i].x - x, this.nodes[i].z - z)]).filter(([, d]) => d <= rr);
      if (c.length) return c.sort((a, b) => a[1] - b[1]).slice(0, k).map(([i]) => i);
    }
    return [];
  }

  // The nearest node reachable from (x, z) in a straight clear line. If none is in sight (a door in a
  // notch of the facade), step out to a nearby free point that can see one and go via that.
  entry(x, z) {
    const sight = (px, pz) => {
      for (const i of this.nearest(px, pz, 12)) if (this.clear([px, pz], this.nodes[i])) return i;
      return undefined;
    };
    const i = sight(x, z);
    if (i !== undefined) return { i, direct: true };
    for (const r of [3, 6, 10, 15, 22, 32]) {
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2;
        const px = x + Math.cos(a) * r; const pz = z + Math.sin(a) * r;
        if (this.blocked(px, pz) || !this.clear([x, z], [px, pz])) continue;
        const j = sight(px, pz);
        if (j !== undefined) return { i: j, direct: true, via: [px, pz] };
      }
    }
    return { i: this.nearest(x, z, 1)[0], direct: false };
  }

  astar(s, t) {
    if (s === t) return [s];
    const N = this.nodes;
    const h = (i) => Math.hypot(N[i].x - N[t].x, N[i].z - N[t].z);
    const g = new Map([[s, 0]]);
    const from = new Map();
    const open = [[h(s), s]];
    const closed = new Set();
    while (open.length) {
      // small graphs per query: a sorted array is plenty fast
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
      const [, cur] = open.splice(bi, 1)[0];
      if (cur === t) {
        const path = [cur];
        while (from.has(path[0])) path.unshift(from.get(path[0]));
        return path;
      }
      if (closed.has(cur)) continue;
      closed.add(cur);
      for (const nb of N[cur].links) {
        if (closed.has(nb)) continue;
        const ng = g.get(cur) + Math.hypot(N[nb].x - N[cur].x, N[nb].z - N[cur].z);
        if (ng < (g.get(nb) ?? Infinity)) {
          g.set(nb, ng);
          from.set(nb, cur);
          open.push([ng + h(nb), nb]);
        }
      }
    }
    return null;
  }

  // Waypoints from a to b (excluding a, including b) along the graph, with corners cut wherever a straight
  // line stays clear. Falls back to the straight line if the graph has no route.
  route(a, b) {
    if (this.blocked(a[0], a[1])) {
      // starting pressed against something: step out to the nearest free point first
      for (let r = 0.5; r <= 4; r += 0.5) {
        for (let k = 0; k < 16; k++) {
          const f = [a[0] + Math.cos((k / 16) * Math.PI * 2) * r, a[1] + Math.sin((k / 16) * Math.PI * 2) * r];
          if (!this.blocked(f[0], f[1]) && this.clear(a, f)) return [f, ...this.route(f, b)];
        }
      }
    }
    if (this.clear(a, b) && Math.hypot(b[0] - a[0], b[1] - a[1]) < 60) return [b];
    const s = this.entry(a[0], a[1]);
    const t = this.entry(b[0], b[1]);
    const ids = s.i === undefined || t.i === undefined ? null : this.astar(s.i, t.i);
    if (!ids) return [b];
    const pts = [a, ...(s.via ? [s.via] : []), ...ids.map((i) => [this.nodes[i].x, this.nodes[i].z]), ...(t.via ? [t.via] : []), b];
    // string-pull: from each kept point, jump to the furthest later point still in clear sight
    const out = [];
    let i = 0;
    while (i < pts.length - 1) {
      let j = Math.min(pts.length - 1, i + 12);
      while (j > i + 1 && !this.clear(pts[i], pts[j])) j--;
      out.push(pts[j]);
      i = j;
    }
    return out;
  }
}
