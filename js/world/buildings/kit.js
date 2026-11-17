// Shared parts for the detailed BITS buildings (one module per building in this folder, listed in registry.js).
//
// A Kit is one building's local frame: u runs across, v along, y up, in metres. kit.world(u, v) gives campus
// coordinates (x east, z south; see research/COORDINATES.md). Geometry goes into layers:
//   'shell'  what you see from outside; always drawn
//   other    interior zones; each is drawn only while the player is within ZONE_RANGE of it and below the roof
// Every layer is merged into one mesh per material key at finish(), so a building costs a handful of draw calls.
//
// Material keys (as in hostel.js):
//   't:<texture>:<tint>'  tiled world-space texture (textures.js: plaster, concrete, terrazzo, wood, brick, ...)
//   'c:<hex>'             plain colour        'm:<hex>' metal        'e:<hex>' glowing (lamps, screens)
//   'g:<hex>'             glass               'x:<name>' a texture registered with kit.texture(name, makeTexture)
// Colliders are axis-aligned world boxes; in a rotated frame long boxes are split into short pieces (CHUNK).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { texturedMaterial, worldBoxGeometry, TEX_SIZE } from '../textures.js';
import { mat } from '../campus.js';

export const ZONE_RANGE = 15;
export const RISE_MAX = 0.19; // steepest step the player climbs comfortably (player.js steps up to ~0.7)
const CHUNK = 0.5;
const FLOOR_CHUNK = 1.2;
const sharedMats = new Map();

// The oriented rectangle that best fits an OSM outline: its long side runs along v. Returns the frame
// (origin O at the u0/v0 corner, unit axes eu/ev, angle for group.rotation.y) and its size W × L.
export function fitFrame(outer) {
  let best = null;
  const n = outer.length;
  for (let i = 0; i < n; i++) {
    const a = outer[i]; const b = outer[(i + 1) % n];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 1) continue;
    const ev = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
    const eu = [ev[1], -ev[0]];
    const us = outer.map((p) => p[0] * eu[0] + p[1] * eu[1]);
    const vs = outer.map((p) => p[0] * ev[0] + p[1] * ev[1]);
    const W = Math.max(...us) - Math.min(...us); const L = Math.max(...vs) - Math.min(...vs);
    if (!best || W * L < best.W * best.L - 1e-6) best = { eu, ev, W, L, u0: Math.min(...us), v0: Math.min(...vs) };
  }
  let { eu, ev, W, L, u0, v0 } = best;
  if (W > L) { // keep v along the long side
    [W, L] = [L, W];
    const nev = eu; const neu = [nev[1], -nev[0]];
    const us = outer.map((p) => p[0] * neu[0] + p[1] * neu[1]);
    const vs = outer.map((p) => p[0] * nev[0] + p[1] * nev[1]);
    eu = neu; ev = nev; u0 = Math.min(...us); v0 = Math.min(...vs);
  }
  const O = [u0 * eu[0] + v0 * ev[0], u0 * eu[1] + v0 * ev[1]];
  return { O, eu, ev, angle: Math.atan2(ev[0], ev[1]), W, L };
}

export class Kit {
  // frame: { O:[x,z], eu, ev, angle } (fitFrame gives one); name for labels and errors
  constructor(campus, id, frame) {
    this.campus = campus;
    this.id = id;
    Object.assign(this, frame);
    this.parts = new Map(); // layer -> Map(key -> geometries)
    this.layerName = 'shell';
    this.groups = {};
    this.zones = [];
    this.textures = {};
    this.customMats = {};
    // what the building tells the rest of the game
    this.floors = []; // { y, name }
    this.stairs = []; // { name, u0, u1, v0, v1, y0, y1 }
    this.entrances = []; // { name, u, v, out:[du,dv], world }
    this.rooms = []; // { id, name, u0, u1, v0, v1, y0, y1, floor }
    this.navLinks = []; // [[x,z],[x,z]] walkable links for NPCs (outside door to inside)
    this.lights = []; // { u, v, y } places the indoor light can sit
  }

  // ---------- frame ----------
  world(u, v, y = 0) {
    return new THREE.Vector3(this.O[0] + u * this.eu[0] + v * this.ev[0], y, this.O[1] + u * this.eu[1] + v * this.ev[1]);
  }

  local(x, z) {
    const dx = x - this.O[0]; const dz = z - this.O[1];
    return [dx * this.eu[0] + dz * this.eu[1], dx * this.ev[0] + dz * this.ev[1]];
  }

  // Yaw (rotation.y) of something whose front faces local direction [du, dv].
  yaw(du, dv) {
    const x = du * this.eu[0] + dv * this.ev[0]; const z = du * this.eu[1] + dv * this.ev[1];
    return Math.atan2(x, z);
  }

  // Everything built inside fn goes to the named layer ('shell' or an interior zone such as 'ground-floor').
  layer(name, fn) {
    const prev = this.layerName;
    this.layerName = name;
    try { fn(); } finally { this.layerName = prev; }
  }

  // ---------- geometry ----------
  geo(key, g) {
    if (!this.parts.has(this.layerName)) this.parts.set(this.layerName, new Map());
    const parts = this.parts.get(this.layerName);
    const geom = g.index ? g.toNonIndexed() : g;
    for (const a of Object.keys(geom.attributes)) if (!['position', 'normal', 'uv'].includes(a)) geom.deleteAttribute(a);
    if (!geom.attributes.uv) geom.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geom.attributes.position.count * 2), 2));
    if (!parts.has(key)) parts.set(key, []);
    parts.get(key).push(geom);
  }

  // Axis-aligned box in the local frame. collide adds colliders; walkable makes its top a floor.
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

  // Collider only (invisible), split into short world AABBs.
  col(u0, u1, v0, v1, y0, y1, walkable = false) {
    if (u1 < u0) [u0, u1] = [u1, u0];
    if (v1 < v0) [v0, v1] = [v1, v0];
    const along = u1 - u0 > v1 - v0 ? 'u' : 'v';
    const len = along === 'u' ? u1 - u0 : v1 - v0;
    const wid = along === 'u' ? v1 - v0 : u1 - u0;
    const square = Math.abs(Math.sin(2 * this.angle)) < 1e-3; // frame lines up with the world axes
    const n = square ? 1 : Math.max(1, Math.ceil(len / (walkable ? FLOOR_CHUNK : CHUNK)));
    const m = square || !walkable ? 1 : Math.max(1, Math.ceil(wid / FLOOR_CHUNK));
    for (let i = 0; i < n * m; i++) {
      const a0 = (along === 'u' ? u0 : v0) + (len * (i % n)) / n; const a1 = a0 + len / n;
      const b0 = (along === 'u' ? v0 : u0) + (wid * Math.floor(i / n)) / m; const b1 = b0 + wid / m;
      const [pu0, pu1, pv0, pv1] = along === 'u' ? [a0, a1, b0, b1] : [b0, b1, a0, a1];
      const ps = [this.world(pu0, pv0), this.world(pu1, pv0), this.world(pu1, pv1), this.world(pu0, pv1)];
      this.campus.colliders.push({ minX: Math.min(...ps.map((p) => p.x)), maxX: Math.max(...ps.map((p) => p.x)), minZ: Math.min(...ps.map((p) => p.z)), maxZ: Math.max(...ps.map((p) => p.z)), minY: y0, maxY: y1, walkable, enabled: true, building: this.id });
    }
  }

  // Cylinder (columns, posts, lamps) standing at (u, v) from y.
  cyl(u, v, y, r, h, key, { seg = 12, rTop = r, collide = false } = {}) {
    const g = new THREE.CylinderGeometry(rTop, r, h, seg);
    g.translate(u, y + h / 2, v);
    this.geo(key, g);
    if (collide) this.col(u - r, u + r, v - r, v + r, y, y + h);
  }

  // Any geometry built in local coordinates (lathe, extrude, dome ...).
  mesh(g, key) { this.geo(key, g); }

  // Vertical plane facing local direction [du, dv], centred at (u, v), bottom at y. For signs, windows, boards.
  plane(u, v, y, width, height, [du, dv], key, { offset = 0.01 } = {}) {
    const g = new THREE.PlaneGeometry(width, height);
    g.rotateY(Math.atan2(du, dv));
    g.translate(u + du * offset, y + height / 2, v + dv * offset);
    this.geo(key, g);
  }

  // Horizontal plane (rugs, table tops, markings) w across u, d along v.
  flat(u, v, y, w, d, key) {
    const g = new THREE.PlaneGeometry(w, d);
    g.rotateX(-Math.PI / 2);
    g.translate(u, y, v);
    this.geo(key, g);
  }

  // ---------- architecture ----------
  // A straight wall from (u0, v0) to (u1, v1) along u or v, `thick` thick, y0..y1, with openings
  // [{ at (metres from the start), width, bottom = 0 (sill height above y0), top = 2.2 (head above y0) }].
  // Doors are openings with bottom 0; windows have a sill. Returns the wall's segments for further detail.
  wall(u0, v0, u1, v1, y0, y1, key, { thick = 0.25, openings = [], collide = true } = {}) {
    const alongU = Math.abs(u1 - u0) >= Math.abs(v1 - v0);
    const len = alongU ? Math.abs(u1 - u0) : Math.abs(v1 - v0);
    const s0 = alongU ? Math.min(u0, u1) : Math.min(v0, v1);
    const c = alongU ? v0 : u0; // the wall's centre line
    const piece = (a, b, ya, yb) => {
      if (b - a < 0.005 || yb - ya < 0.005) return;
      if (alongU) this.box(s0 + a, s0 + b, c - thick / 2, c + thick / 2, ya, yb, key, { collide });
      else this.box(c - thick / 2, c + thick / 2, s0 + a, s0 + b, ya, yb, key, { collide });
    };
    const ops = openings.map((o) => ({ a: o.at - o.width / 2, b: o.at + o.width / 2, bottom: o.bottom ?? 0, top: o.top ?? 2.2 })).sort((p, q) => p.a - q.a);
    let s = 0;
    for (const o of ops) {
      piece(s, o.a, y0, y1);
      piece(o.a, o.b, y0, y0 + o.bottom); // sill
      piece(o.a, o.b, y0 + o.top, y1); // lintel and the wall above
      s = o.b;
    }
    piece(s, len, y0, y1);
    return { alongU, s0, c, len };
  }

  // Floor slab over a rectangle with rectangular holes (stairwells, atria), top at y.
  slab(u0, u1, v0, v1, y, key, { thick = 0.2, holes = [], walkable = true, collide = true } = {}) {
    const us = [...new Set([u0, u1, ...holes.flatMap((h) => [h.u0, h.u1])])].filter((x) => x >= u0 && x <= u1).sort((a, b) => a - b);
    const vs = [...new Set([v0, v1, ...holes.flatMap((h) => [h.v0, h.v1])])].filter((x) => x >= v0 && x <= v1).sort((a, b) => a - b);
    // grid cells outside every hole, merged along u into strips
    for (let j = 0; j < vs.length - 1; j++) {
      let start = null;
      for (let i = 0; i <= us.length - 1; i++) {
        const inside = i < us.length - 1 && !holes.some((h) => (us[i] + us[i + 1]) / 2 > h.u0 && (us[i] + us[i + 1]) / 2 < h.u1 && (vs[j] + vs[j + 1]) / 2 > h.v0 && (vs[j] + vs[j + 1]) / 2 < h.v1);
        if (inside && start === null) start = us[i];
        if (!inside && start !== null) { this.box(start, us[i], vs[j], vs[j + 1], y - thick, y, key, { walkable, collide }); start = null; }
      }
    }
  }

  // One straight flight. Starts at (u, v) on its bottom edge's centre, climbs `steps` risers of `rise` towards
  // [du, dv] (one axis only), `width` wide. Each tread is a walkable block down to a soffit 0.45 m under it
  // (not to the ground), so the flight above another leaves headroom. Returns where the top tread ends.
  flight(u, v, y0, [du, dv], steps, rise, width, key, { tread = 0.28 } = {}) {
    const alongU = du !== 0;
    for (let j = 0; j < steps; j++) {
      const a = j * tread; const b = a + tread;
      const top = y0 + (j + 1) * rise;
      const bottom = j === 0 ? y0 : Math.max(y0, top - 0.45 - rise);
      if (alongU) this.box(u + du * a, u + du * b, v - width / 2, v + width / 2, bottom, top, key, { walkable: true });
      else this.box(u - width / 2, u + width / 2, v + dv * a, v + dv * b, bottom, top, key, { walkable: true });
    }
    const run = steps * tread;
    return { u: u + du * run, v: v + dv * run, y: y0 + steps * rise };
  }

  // A dog-leg stair (two flights and a half landing) in the stairwell u0..u1 × v0..v1, from floor y0 to y1.
  // It climbs along v (along = 'v') or u, towards the far end (+ unless reverse). Flight 1 runs up the low-u
  // (or low-v) half to a half landing at the far end; flight 2 comes back down the other half, so you arrive
  // facing the start end, next to where you set off. The flights sit against the far end; any spare length is
  // floor at the start. Walls close the two long sides and the far end (wall: null for none) and a rail
  // guards the top of flight 1. Returns the hole the floor above needs (pass it to kit.slab's holes).
  dogleg(u0, u1, v0, v1, y0, y1, { along = 'v', key = 't:terrazzo:#c9c6bd', rail = 'm:#7d858c', wall = 't:plaster:#efe9dc', name = 'Stairs', reverse = false } = {}) {
    const H = y1 - y0;
    const steps = Math.max(2, Math.ceil(H / 2 / RISE_MAX));
    const rise = H / 2 / steps;
    const tread = 0.28;
    const run = steps * tread;
    const [a0, a1, b0, b1] = along === 'v' ? [v0, v1, u0, u1] : [u0, u1, v0, v1]; // a: climb axis, b: across
    const wid = (b1 - b0 - 0.1) / 2; // each flight's width, a 10 cm rail between them
    const landing = Math.max(1.1, wid);
    if (run + landing > a1 - a0 + 1e-6) throw new Error(`${this.id}: stairwell ${name} is ${(a1 - a0).toFixed(2)} m long, needs ${(run + landing).toFixed(2)}`);
    const dir = reverse ? -1 : 1;
    const far = reverse ? a0 : a1;
    const la0 = far - dir * landing; // landing starts here
    const start = la0 - dir * run; // first step
    const mid1 = b0 + wid / 2; const mid2 = b1 - wid / 2;
    const P = (a, b) => (along === 'v' ? [b, a] : [a, b]);
    const R = (aa, ab, ba, bb) => { const [p0, q0] = P(Math.min(aa, ab), Math.min(ba, bb)); const [p1, q1] = P(Math.max(aa, ab), Math.max(ba, bb)); return [p0, p1, q0, q1]; };
    const D = along === 'v' ? [0, dir] : [dir, 0];
    const ND = [-D[0], -D[1]];
    this.flight(...P(start, mid1), y0, D, steps, rise, wid, key, { tread });
    const lmid = y0 + H / 2;
    this.box(...R(la0, far, b0, b1), lmid - 0.25, lmid, key, { walkable: true });
    this.flight(...P(la0, mid2), lmid, ND, steps, rise, wid, key, { tread });
    // rail between the flights, and across the top of flight 1 on the floor above
    this.box(...R(start, la0, b0 + wid, b0 + wid + 0.1), y0, y0 + 0.95 + H / 2, rail);
    this.box(...R(start - dir * 0.05, start, b0, b0 + wid + 0.1), y1, y1 + 1.0, rail);
    if (wall) {
      const t = 0.2;
      this.box(...R(Math.min(a0, a1), Math.max(a0, a1), b0 - t, b0), y0, y1, wall);
      this.box(...R(Math.min(a0, a1), Math.max(a0, a1), b1, b1 + t), y0, y1, wall);
      this.box(...R(far, far + dir * t, b0 - t, b1 + t), y0, y1, wall);
    }
    this.stairs.push({ name, u0, u1, v0, v1, y0, y1 });
    const [hu0, hu1, hv0, hv1] = R(start, far, b0, b1);
    return { u0: hu0, u1: hu1, v0: hv0, v1: hv1 };
  }

  // Waist-high rail (top bar plus posts) from (u0, v0) to (u1, v1), with a collider so you can't step off.
  rail(u0, v0, u1, v1, y, key = 'm:#7d858c', { h = 1.0 } = {}) {
    const alongU = Math.abs(u1 - u0) >= Math.abs(v1 - v0);
    const len = alongU ? Math.abs(u1 - u0) : Math.abs(v1 - v0);
    const s0 = alongU ? Math.min(u0, u1) : Math.min(v0, v1);
    const c = alongU ? v0 : u0;
    const bar = (a, b, ya, yb, t) => (alongU ? this.box(s0 + a, s0 + b, c - t, c + t, ya, yb, key, { collide: false }) : this.box(c - t, c + t, s0 + a, s0 + b, ya, yb, key, { collide: false }));
    bar(0, len, y + h - 0.05, y + h, 0.03);
    bar(0, len, y + h * 0.5 - 0.02, y + h * 0.5, 0.015);
    for (let s = 0; s <= len + 1e-6; s += Math.max(0.6, len / Math.ceil(len / 1.2))) bar(Math.max(0, s - 0.02), Math.min(len, s + 0.02), y, y + h, 0.02);
    if (alongU) this.col(s0, s0 + len, c - 0.06, c + 0.06, y, y + h);
    else this.col(c - 0.06, c + 0.06, s0, s0 + len, y, y + h);
  }

  // Door frame and an open leaf in a wall opening. The wall runs along u (alongU) or v; `at` is the opening's
  // centre along the wall, c the wall's centre line; the leaf swings to the `side` (+1 or -1) of the wall.
  door(alongU, at, c, y, width, { height = 2.2, thick = 0.25, frame = 'c:#5a4632', leaf = 't:wood:#8a6a4a', side = 1, open = true } = {}) {
    const f = 0.06;
    const B = (a0, a1, b0, b1, ya, yb, key) => (alongU ? this.box(a0, a1, b0, b1, ya, yb, key, { collide: false }) : this.box(b0, b1, a0, a1, ya, yb, key, { collide: false }));
    B(at - width / 2 - f, at - width / 2, c - thick / 2 - 0.02, c + thick / 2 + 0.02, y, y + height, frame);
    B(at + width / 2, at + width / 2 + f, c - thick / 2 - 0.02, c + thick / 2 + 0.02, y, y + height, frame);
    B(at - width / 2 - f, at + width / 2 + f, c - thick / 2 - 0.02, c + thick / 2 + 0.02, y + height, y + height + f, frame);
    if (!open) { B(at - width / 2, at + width / 2, c - 0.025, c + 0.025, y, y + height, leaf); return; }
    // open leaf, flat against the wall's face
    const hinge = at - width / 2;
    B(hinge - 0.04, hinge, c + side * (thick / 2), c + side * (thick / 2 + width * 0.95), y, y + height - 0.02, leaf);
  }

  // Glazed window in a wall opening: frame, two mullions and glass.
  window(alongU, at, c, y, width, height, { frame = 'c:#e8e4dc', glass = 'g:#9fc3d6', thick = 0.25 } = {}) {
    const B = (a0, a1, b0, b1, ya, yb, key) => (alongU ? this.box(a0, a1, b0, b1, ya, yb, key, { collide: false }) : this.box(b0, b1, a0, a1, ya, yb, key, { collide: false }));
    const t = 0.05;
    B(at - width / 2, at + width / 2, c - t, c + t, y, y + 0.05, frame);
    B(at - width / 2, at + width / 2, c - t, c + t, y + height - 0.05, y + height, frame);
    for (const s of [-0.5, 0, 0.5]) B(at + s * width - 0.025, at + s * width + 0.025, c - t, c + t, y, y + height, frame);
    B(at - width / 2, at + width / 2, c - 0.01, c + 0.01, y, y + height, glass);
    this.col(...(alongU ? [at - width / 2, at + width / 2, c - thick / 2, c + thick / 2] : [c - thick / 2, c + thick / 2, at - width / 2, at + width / 2]), y - 1, y + height);
  }

  // ---------- furniture (each piece is a few merged boxes) ----------
  // Facing [du, dv]: the direction a seated person looks.
  _rot(u, v, [du, dv], parts) {
    // parts: [x0, x1, y0, y1, z0, z1, key] with x across and z forward in the piece's own frame
    const ang = Math.atan2(du, dv);
    for (const [x0, x1, y0, y1, z0, z1, key] of parts) {
      const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
      g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      g.rotateY(ang);
      g.translate(u, 0, v);
      this.geo(key, g);
    }
  }

  // Shift a furniture part list up by y (for upper floors).
  _up(parts, y) { return parts.map(([x0, x1, y0, y1, z0, z1, k]) => [x0, x1, y0 + y, y1 + y, z0, z1, k]); }

  desk(u, v, y, facing, { w = 1.2, d = 0.6, top = 't:wood:#9a7b55', legs = 'm:#555b61' } = {}) {
    this._rot(u, v, facing, this._up([[-w / 2, w / 2, 0.72, 0.76, -d / 2, d / 2, top], ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => [a * (w / 2 - 0.05) - 0.02, a * (w / 2 - 0.05) + 0.02, 0, 0.72, b * (d / 2 - 0.05) - 0.02, b * (d / 2 - 0.05) + 0.02, legs])], y));
    this.col(...this._aabb(u, v, facing, w, d), y, y + 0.76);
  }

  chair(u, v, y, facing, { seat = 'c:#3f5f8a', frame = 'm:#4a4f55' } = {}) {
    this._rot(u, v, facing, this._up([[-0.22, 0.22, 0.44, 0.48, -0.22, 0.2, seat], [-0.22, 0.22, 0.48, 0.9, -0.24, -0.2, seat], ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => [a * 0.19 - 0.015, a * 0.19 + 0.015, 0, 0.44, b * 0.19 - 0.015, b * 0.19 + 0.015, frame])], y));
  }

  // Bench desk for lecture rooms: a long desk with a bench behind it (seats `n`).
  benchDesk(u, v, y, facing, { w = 1.8, top = 't:wood:#8f6f4b', frame = 'm:#4a4f55' } = {}) {
    this._rot(u, v, facing, this._up([
      [-w / 2, w / 2, 0.74, 0.78, 0.0, 0.45, top], [-w / 2, w / 2, 0.42, 0.46, -0.45, -0.1, top], [-w / 2, w / 2, 0.46, 0.85, -0.5, -0.46, top],
      [-w / 2, -w / 2 + 0.05, 0, 0.78, -0.5, 0.45, frame], [w / 2 - 0.05, w / 2, 0, 0.78, -0.5, 0.45, frame],
    ], y));
    this.col(...this._aabb(u, v, facing, w, 0.95), y, y + 0.78);
  }

  // Book shelf: `levels` shelves of coloured book blocks, back against the wall behind it.
  shelf(u, v, y, facing, { w = 1.8, h = 2.1, d = 0.4, levels = 6, wood = 't:wood:#7b5a3c', books = ['c:#8c2f2f', 'c:#2f4f8c', 'c:#3d7a4a', 'c:#b8893a', 'c:#5b3a6e'] } = {}) {
    const parts = [[-w / 2, w / 2, 0, 0.06, -d / 2, d / 2, wood], [-w / 2, w / 2, h - 0.04, h, -d / 2, d / 2, wood], [-w / 2, -w / 2 + 0.03, 0, h, -d / 2, d / 2, wood], [w / 2 - 0.03, w / 2, 0, h, -d / 2, d / 2, wood], [-w / 2, w / 2, 0, h, -d / 2, -d / 2 + 0.02, wood]];
    const gap = (h - 0.1) / levels;
    for (let k = 0; k < levels; k++) {
      const y0 = 0.06 + k * gap;
      parts.push([-w / 2, w / 2, y0, y0 + 0.025, -d / 2, d / 2, wood]);
      let x = -w / 2 + 0.04; let i = k * 7 + Math.round(u * 3 + v * 5);
      while (x < w / 2 - 0.08) {
        const bw = 0.12 + ((i * 37) % 9) * 0.012; const bh = gap * (0.62 + ((i * 53) % 5) * 0.06);
        parts.push([x, Math.min(x + bw, w / 2 - 0.04), y0 + 0.025, y0 + 0.025 + bh, -d / 2 + 0.04, d / 2 - 0.06, books[i % books.length]]);
        x += bw + 0.005; i++;
      }
    }
    this._rot(u, v, facing, this._up(parts, y));
    this.col(...this._aabb(u, v, facing, w, d), y, y + h);
  }

  // Wall board (black or white) on the wall behind (u, v), facing [du, dv].
  board(u, v, y, facing, { w = 3.6, h = 1.2, key = 'c:#24302a', frame = 'c:#6b5a43' } = {}) {
    this._rot(u, v, facing, this._up([[-w / 2 - 0.05, w / 2 + 0.05, 0.85, 0.9 + h + 0.05, -0.03, 0, frame], [-w / 2, w / 2, 0.9, 0.9 + h, 0, 0.02, key]], y));
  }

  // Ceiling tube light (glows) at height y (the ceiling); also remembered as an indoor light spot.
  tubeLight(u, v, y, [du, dv] = [1, 0]) {
    this._rot(u, v, [du, dv], [[-0.6, 0.6, y - 0.08, y - 0.04, -0.04, 0.04, 'e:#fffbea'], [-0.62, 0.62, y - 0.04, y, -0.06, 0.06, 'c:#e9e6df']]);
    this.lights.push({ u, v, y });
  }

  // Ceiling fan (static; hub and three blades).
  fan(u, v, y) {
    this.cyl(u, v, y - 0.45, 0.015, 0.45, 'c:#e8e4dc', { seg: 6 });
    this.cyl(u, v, y - 0.55, 0.12, 0.1, 'c:#e8e4dc', { seg: 12 });
    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI * 2) / 3;
      this._rot(u, v, [Math.sin(a), Math.cos(a)], [[-0.07, 0.07, y - 0.52, y - 0.5, 0.1, 0.65, 'c:#e8e4dc']]);
    }
  }

  // World AABB arguments (u0, u1, v0, v1) for a w × d footprint at (u, v) facing [du, dv].
  _aabb(u, v, [du, dv], w, d) {
    const along = Math.abs(du) > Math.abs(dv);
    const [hw, hd] = along ? [d / 2, w / 2] : [w / 2, d / 2];
    return [u - hw, u + hw, v - hd, v + hd];
  }

  // ---------- signs, labels, interaction ----------
  // Canvas sign texture: register once with a name, then use 'x:<name>' as a key.
  texture(name, make) {
    if (!this.textures[name]) this.textures[name] = make();
    return this.textures[name];
  }

  // A text sign facing [du, dv], centred at (u, v), bottom at y.
  sign(text, u, v, y, facing, { width = 3, height = 0.5, bg = '#7a2622', fg = '#f6ecd2', font = 'bold 64px Georgia, serif' } = {}) {
    const name = `sign:${text}:${bg}:${fg}:${width}x${height}`;
    this.texture(name, () => {
      const W = 1024; const Hh = Math.max(64, Math.round((W * height) / width));
      const c = document.createElement('canvas'); c.width = W; c.height = Hh;
      const g = c.getContext('2d');
      g.fillStyle = bg; g.fillRect(0, 0, W, Hh);
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      let size = parseInt(font.match(/(\d+)px/)[1], 10);
      const fam = font.replace(/^.*?\d+px\s*/, ''); const weight = font.match(/^(bold|\d00)?/)[0];
      do { g.font = `${weight} ${size}px ${fam}`; size -= 2; } while (g.measureText(text).width > W * 0.92 && size > 10);
      g.fillText(text, W / 2, Hh / 2);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
      return t;
    });
    this.plane(u, v, y, width, height, facing, `x:${name}`, { offset: 0.02 });
  }

  // Floating label over the building (the campus fades these with distance).
  label(text, u, v, y, opts) {
    const p = this.world(u, v);
    const s = this.campus.label(text, p.x, y, p.z, opts);
    this.sprites = [...(this.sprites || []), s];
    return s;
  }

  // Something to press E on.
  interact(id, u, v, label, { y = 1.2, radius = 1.8 } = {}) {
    const p = this.world(u, v);
    return this.campus.interactable(id, p.x, p.z, label, { y, radius });
  }

  // Register an entrance: name, the point just outside it (u, v) and the outward direction.
  entrance(name, u, v, out) {
    const world = this.world(u, v);
    this.entrances.push({ name, u, v, out, world });
    return world;
  }

  // A sunken court: inside the local polygon [[u, v], ...] the bare ground is at y (< 0) instead of 0 and the
  // campus ground mesh gets a hole. Build its floor, retaining walls and the rails round its edge yourself.
  pit(poly, y) {
    const w = poly.map(([u, v]) => { const p = this.world(u, v); return [p.x, p.z]; });
    const xs = w.map((p) => p[0]); const zs = w.map((p) => p[1]);
    this.campus.pits.push({ poly: w, y, minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs), building: this.id });
  }

  room(id, name, u0, u1, v0, v1, y0, y1, floor = 0) {
    this.rooms.push({ id, name, u0: Math.min(u0, u1), u1: Math.max(u0, u1), v0: Math.min(v0, v1), v1: Math.max(v0, v1), y0, y1, floor });
  }

  // ---------- materials and output ----------
  material(key) {
    if (this.customMats[key]) return this.customMats[key];
    if (sharedMats.has(key)) return (this.customMats[key] = sharedMats.get(key));
    let m; let shared = true;
    if (key.startsWith('t:')) { const [, tex, tint = '#ffffff'] = key.split(':'); m = texturedMaterial(tex, { tint }); }
    else if (key.startsWith('m:')) m = mat(key.slice(2), { metalness: 0.6, roughness: 0.35 });
    else if (key.startsWith('e:')) m = mat(key.slice(2), { emissive: key.slice(2) });
    else if (key.startsWith('g:')) m = new THREE.MeshStandardMaterial({ color: key.slice(2), roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.45, depthWrite: false });
    else if (key.startsWith('x:')) {
      const tex = this.textures[key.slice(2)];
      if (!tex) throw new Error(`${this.id}: no texture ${key}`);
      m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, transparent: tex.userData?.transparent || false, alphaTest: tex.userData?.alphaTest || 0, side: tex.userData?.doubleSide ? THREE.DoubleSide : THREE.FrontSide });
      shared = false;
    } else if (key.startsWith('facade:') || key === 'parapet') m = this.campus.material(key);
    else m = mat(key.replace(/^c:/, ''));
    this.customMats[key] = m;
    if (shared) sharedMats.set(key, m);
    return m;
  }

  // Merge every layer into meshes. Interior zones remember their world bounds for visibility.
  finish(root = this.campus.root) {
    for (const [layer, parts] of this.parts) {
      const grp = new THREE.Group();
      grp.name = `${this.id}:${layer}`;
      grp.position.set(this.O[0], 0, this.O[1]);
      grp.rotation.y = this.angle;
      for (const [key, list] of parts) {
        const g = mergeGeometries(list);
        if (!g) continue;
        g.computeBoundingSphere();
        const mesh = new THREE.Mesh(g, this.material(key));
        mesh.receiveShadow = true;
        mesh.castShadow = layer === 'shell' && !key.startsWith('g:') && !key.startsWith('e:');
        grp.add(mesh);
      }
      root.add(grp);
      this.groups[layer] = grp;
      if (layer !== 'shell') {
        const box = new THREE.Box3();
        for (const list of parts.values()) for (const g of list) { g.computeBoundingBox(); box.union(g.boundingBox); }
        this.zones.push({ name: layer, group: grp, u0: box.min.x, u1: box.max.x, v0: box.min.z, v1: box.max.z, y0: box.min.y, y1: box.max.y });
      }
    }
    this.parts.clear();
  }

  // Distance (m) from (x, z) to a zone's footprint, or to the whole building with no zone.
  distance(x, z, zone = null) {
    const [u, v] = this.local(x, z);
    const r = zone || this.bounds();
    return Math.hypot(Math.max(0, r.u0 - u, u - r.u1), Math.max(0, r.v0 - v, v - r.v1));
  }

  bounds() {
    if (!this._bounds) {
      const z = this.zones;
      this._bounds = z.length ? { u0: Math.min(...z.map((q) => q.u0)), u1: Math.max(...z.map((q) => q.u1)), v0: Math.min(...z.map((q) => q.v0)), v1: Math.max(...z.map((q) => q.v1)) } : { u0: 0, u1: this.W || 0, v0: 0, v1: this.L || 0 };
    }
    return this._bounds;
  }

  // The enterable room (registered with kit.room) at a world point, if any.
  roomAt(x, z, y = 0) {
    const [u, v] = this.local(x, z);
    return this.rooms.find((r) => u > r.u0 && u < r.u1 && v > r.v0 && v < r.v1 && y >= r.y0 - 0.5 && y < r.y1) || null;
  }

  // Show interior zones near the player (and only from below roof height).
  update(dt, pos) {
    if (!pos) return;
    for (const zn of this.zones) {
      const [u, v] = this.local(pos.x, pos.z);
      const d = Math.hypot(Math.max(0, zn.u0 - u, u - zn.u1), Math.max(0, zn.v0 - v, v - zn.v1));
      zn.group.visible = d < ZONE_RANGE && pos.y < Math.max(30, zn.y1 + 5);
    }
  }
}
