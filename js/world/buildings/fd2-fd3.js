// Faculty Divisions III and II: the two arcaded quadrangles either side of the Main Building spine.
// Research: research/buildings/fd2-fd3.md (and main-building.md for the joins), research/review.md.
//
//   FD-III  OSM "Main Building (West Wing)": the old Science Block. An outer ring of two-storey ranges round TWO
//           courts (north and south) split by an inner cross range, as on the official room-number plan. Chemistry
//           lives here: Chemistry Laboratory 3103 and the department office off the south court, the S9 print shop
//           at the main entrance, Computational Chemistry Lab 3163 in the cross range, faculty chambers 3268 upstairs.
//   FD-II   OSM "Main Building (East Wing)": the old M-Block. One big court (the FD 2 courtyard) ringed by the same
//           ranges. Mechanical Engineering, the Student Union and the SWD office off the south verandah, EEE in the
//           west range, the busiest lecture room (2241) upstairs in the north range.
//
// Both use the Main Building's Art Deco language (main-building.js): cream plaster, maroon plinth and string-courses,
// a cusped-arch arcade below and a paired-column verandah above round each court, a jali vent band between them,
// flat parapet roofs, domed chhatris on the front corners. Ground floor y 0, first floor 5.4, roof 9.9 (the spine's
// levels, so the ranges meet it level). Each quad is built in its own Kit frame, squared to the OSM outline
// (FD-II's is a clean rectangle turned 9°; FD-III's is sheared, so its frame follows the west edge, 6.7°); the walls'
// inner faces sit on the OSM edges where gameplay rooms stand, so those rooms always fit inside.
//
// Each range is a solid band of rooms (closed doors and windows in relief) behind an arcaded verandah. Doors that
// really open: the main entrances (south, with a porch) and rear entrances (north) through the ranges into the
// courts, two dog-leg stairs per quad up to the first-floor verandah ring, the department rooms named above, and the
// gameplay rooms (AUGSD `reception` and `complab` in FD-III, the Director's Office `principal` in FD-II), which
// keep their doors on the outer facades where placeRooms put them.
//
// Joins: the spine (main-building) ends in solid end walls at x -70 and x 39.5; a short link block fills the gap to
// each quad (FD-III's east face steps out 1.85 m south of the spine so the Computer Lab fits behind it).
import * as THREE from 'three';
import { Kit, RISE_MAX } from './kit.js';
import { TEX_SIZE } from '../textures.js';

// ---------- dimensions ----------
const FL1 = 5.4; // first floor
const FL2 = 9.9; // roof
const PAR = 0.75; // parapet above the roof
const H0 = FL1 - 0.3; // ground-floor ceiling (underside of the first floor)
const H1 = FL2 - 0.35; // first-floor ceiling (underside of the roof)
const T = 0.4; // outer walls
const TF = 0.25; // verandah (front) walls
const VD = 3.8; // verandah depth, front wall face to arcade centre line
const PIER = 0.75;

// ---------- materials (the Main Building's) ----------
const CREAM = 't:plaster:#f1ead9';
const CREAM_C = 'c:#efe8d6';
const MAROON = 'c:#8e2f28';
const TRIM = 'c:#f6f2ea';
const GLASS = 'c:#33424c';
const ROOF = 'c:#b7b2aa';
const PLINTH = 'c:#8a3a2c';
const KOTA = 'c:#a29f97';
const SLAB = 'c:#f3f0e8';
const DADO = 'c:#7d7f80';
const WOOD = 't:wood:#7a5232';
const LEAF = 'c:#6b4a2e';
const LEAF_F = 'c:#4e3420';
const JALI = 'c:#d9cfbd';
const JALI_H = 'c:#6d6253';
const STONE = 't:paving:#d9ccb2';
const LAWN = 't:grass:#cfe8a8';
const WHITE = 'c:#f4f4f2';

// ---------- the two quads (local frames: u across, east-ish; v along, south-ish; origin at the NW outer corner) ----------
// W/L: outer faces. w, e, n, s: the verandah ring's back (front-wall) lines. Courts: open lawns inside the arcades.
const QUADS = [
  {
    key: 'fd3', title: 'FACULTY DIVISION III', short: 'FD-III', osm: 'Main Building (West Wing)', digit: 3,
    off: [-0.45, 3.5],
    W: 91.05, WS: 92.9, vJ: 54.7, L: 111.9, // east face steps out to WS south of vJ (beside the spine's front)
    w: 15, e: 78.6, n: 15, s: 96.4,
    courts: [{ u0: 18.8, u1: 74.8, v0: 18.8, v1: 47.9 }, { u0: 18.8, u1: 74.8, v0: 63.5, v1: 92.6 }],
    xband: { u0: 18.8, u1: 74.8, v0: 51.7, v1: 59.7 },
    stairs: [
      { name: 'FD-III west stair', wall: 'QW', u0: 7.55, u1: 14.75, v0: 24, v1: 27.4, along: 'u', reverse: true },
      { name: 'FD-III east stair', wall: 'QE', u0: 78.85, u1: 86.05, v0: 78, v1: 81.4, along: 'u', reverse: false },
    ],
    passages: [
      { name: 'FD-III main entrance (S9)', side: 'S', at: 46.8, porch: true },
      { name: 'FD-III north entrance', side: 'N', at: 46.8 },
    ],
    rooms: [
      { id: 'fd3-3103', name: 'Chemistry Laboratory 3103', sign: '3103 · Chemistry Laboratory', kind: 'chemlab', wall: 'QS', a0: 60, a1: 74, depth: 9.6, floor: 0 },
      { id: 'fd3-chem', name: 'Department of Chemistry', sign: 'Department of Chemistry · HoD', kind: 'office', wall: 'QS', a0: 50.5, a1: 58.5, depth: 7, floor: 0 },
      { id: 'fd3-s9', name: 'S9 Print Shop', sign: 'S9 · Xerox & Print', kind: 'shop', wall: 'QS', a0: 38, a1: 43.6, depth: 5, floor: 0 },
      { id: 'fd3-3163', name: 'Computational Chemistry Lab 3163', sign: '3163 · Computational Chemistry Lab', kind: 'computers', wall: 'XN', a0: 36, a1: 50, depth: 7.5, floor: 0, noBack: true },
      { id: 'fd3-3268', name: 'Chemistry Faculty Chambers 3268', sign: '3268 A–V · Chemistry Faculty', kind: 'faculty', wall: 'QS', a0: 50.5, a1: 58.5, depth: 7, floor: 1 },
    ],
    plates: [ // department signs on the verandah (no enterable room)
      { wall: 'QN', a: 30, floor: 0, text: 'Pharmacy · 3170' }, { wall: 'QE', a: 30, floor: 1, text: 'Physics Faculty · 3263–3266' },
      { wall: 'QW', a: 70, floor: 1, text: 'Biological Sciences · 3277' }, { wall: 'XS', a: 30, floor: 0, text: 'Chemistry · 3143–3148' },
    ],
  },
  {
    key: 'fd2', title: 'FACULTY DIVISION II', short: 'FD-II', osm: 'Main Building (East Wing)', digit: 2,
    off: [-0.4, -0.4],
    W: 93.95, WS: 93.95, vJ: null, L: 104.15,
    w: 15, e: 81, n: 18, s: 83,
    courts: [{ u0: 18.8, u1: 77.2, v0: 21.8, v1: 79.2 }],
    xband: null,
    stairs: [
      { name: 'FD-II north stair', wall: 'QN', u0: 30, u1: 33.4, v0: 10.55, v1: 17.75, along: 'v', reverse: true },
      { name: 'FD-II east stair', wall: 'QE', u0: 81.25, u1: 88.45, v0: 60, v1: 63.4, along: 'u', reverse: false },
    ],
    passages: [
      { name: 'FD-II main entrance', side: 'S', at: 48, porch: true },
      { name: 'FD-II north entrance', side: 'N', at: 48 },
    ],
    rooms: [
      { id: 'fd2-mech', name: 'Department of Mechanical Engineering', sign: 'Mechanical Engineering · 222X', kind: 'office', wall: 'QS', a0: 26.5, a1: 34.5, depth: 7.5, floor: 0 },
      { id: 'fd2-su', name: 'Student Union Office', sign: 'Students’ Union Office', kind: 'union', wall: 'QS', a0: 36, a1: 43.8, depth: 7.5, floor: 0 },
      { id: 'fd2-swd', name: 'SWD Office', sign: 'Student Welfare Division (SWD)', kind: 'office', wall: 'QS', a0: 52.5, a1: 61, depth: 7.5, floor: 0 },
      { id: 'fd2-eee', name: 'Department of EEE', sign: 'Electrical & Electronics Engg · 2210', kind: 'office', wall: 'QW', a0: 30, a1: 38.5, depth: 7.5, floor: 0 },
      { id: 'fd2-2241', name: 'Lecture Room 2241', sign: '2241 · Lecture Room', kind: 'lecture', wall: 'QN', a0: 40, a1: 54, depth: 9.25, floor: 1 },
    ],
    plates: [
      { wall: 'QN', a: 64, floor: 1, text: 'Physics Faculty · 2219 A–J' }, { wall: 'QW', a: 66, floor: 0, text: 'RC Club' },
      { wall: 'QE', a: 36, floor: 0, text: 'Lecture Rooms 2119 · 2139' }, { wall: 'QE', a: 36, floor: 1, text: 'Lecture Room 2206' },
    ],
  },
];

// The frame: v along the OSM west edge (outer[0] → outer[3]), origin shifted by `off` in that frame.
function quadFrame(outer, off, W, L) {
  const p0 = outer[0]; const p1 = outer[3];
  const l = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
  const ev = [(p1[0] - p0[0]) / l, (p1[1] - p0[1]) / l]; const eu = [ev[1], -ev[0]];
  const O = [p0[0] + off[0] * eu[0] + off[1] * ev[0], p0[1] + off[0] * eu[1] + off[1] * ev[1]];
  return { O, eu, ev, angle: Math.atan2(ev[0], ev[1]), W, L };
}

// Cusped (multifoil) arch notch in a wall panel `len` wide and `H` high: piers `a` and `len - b` wide, springing at
// `spring`. Shape coordinates: x along the wall, y up.
function archShape(len, a, b, spring, H, lobes = 5) {
  const s = new THREE.Shape();
  const r = (b - a) / 2;
  s.moveTo(0, 0); s.lineTo(a, 0); s.lineTo(a, spring);
  for (let i = 1; i < lobes * 8; i++) {
    const t = i / (lobes * 8); const ang = Math.PI * (1 - t);
    const rr = r * (1 + 0.12 * Math.sin(Math.PI * ((t * lobes) % 1)));
    s.lineTo(a + r + Math.cos(ang) * rr, spring + Math.sin(ang) * rr * 1.08);
  }
  s.lineTo(b, spring); s.lineTo(b, 0); s.lineTo(len, 0); s.lineTo(len, H); s.lineTo(0, H); s.lineTo(0, 0);
  return s;
}

// ======================================================================================
// One quad
// ======================================================================================
function buildQuad(K, Q, ctx) {
  const { campus } = ctx;
  const B = (u0, u1, v0, v1, y0, y1, key, o) => K.box(u0, u1, v0, v1, y0, y1, key, o);
  const D = (u0, u1, v0, v1, y0, y1, key) => K.box(u0, u1, v0, v1, y0, y1, key, { collide: false });
  const walk = (u0, u1, v0, v1, y0, y1, key) => K.box(u0, u1, v0, v1, y0, y1, key, { walkable: true });
  const po = (key) => { // thin overlays win the depth test even from the campus-map camera
    const k = `po:${key}`;
    if (!K.customMats[k]) { const m = K.material(key).clone(); Object.assign(m, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 }); K.customMats[k] = m; }
    return k;
  };
  const geoKey = (g, key) => {
    const t = key.startsWith('t:') ? key.split(':')[1] : null;
    if (t) { const uv = g.attributes.uv; const sz = TEX_SIZE[t] || 2; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / sz, uv.getY(i) / sz); }
    K.mesh(g, key);
  };
  // shape (x along the wall, y up) extruded `depth` thick: along u centred on v = c, or along v centred on u = c
  const extrude = (shape, axis, s0, c, depth, key, y0 = 0) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    if (axis === 'u') g.translate(s0, y0, c - depth / 2);
    else { g.rotateY(-Math.PI / 2); g.translate(c + depth / 2, y0, s0); }
    geoKey(g, key);
  };
  // a box given along/across a wall: axis 'u' → s is u and c is v
  const A = (axis, s0, s1, c0, c1, y0, y1, key, o = { collide: false }) => (axis === 'u' ? K.box(s0, s1, c0, c1, y0, y1, key, o) : K.box(c0, c1, s0, s1, y0, y1, key, o));
  // a flat ground overlay with world-scale texture UVs (lawns, paths)
  const ground = (u0, u1, v0, v1, y, key) => {
    const g = new THREE.PlaneGeometry(u1 - u0, v1 - v0); g.rotateX(-Math.PI / 2); g.translate((u0 + u1) / 2, y, (v0 + v1) / 2);
    const t = key.startsWith('t:') ? key.split(':')[1] : null; const sz = t ? TEX_SIZE[t] || 2 : 1;
    const pos = g.attributes.position; const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / sz, pos.getZ(i) / sz);
    K.mesh(g, po(key));
  };
  const { W, WS, L, w, e, n, s } = Q;
  const vJ = Q.vJ ?? L;
  const courts = Q.courts; const xb = Q.xband;

  // ---------------------------------------------------------------------------------
  // Walls: outer facades and the verandah (front) walls. side = the direction the visible face looks.
  // ---------------------------------------------------------------------------------
  const walls = {
    ON: { axis: 'u', c: T / 2, s0: 0, s1: W, side: -1, outer: true, thick: T },
    OS: { axis: 'u', c: L - T / 2, s0: 0, s1: WS, side: 1, outer: true, thick: T },
    OW: { axis: 'v', c: T / 2, s0: T, s1: L - T, side: -1, outer: true, thick: T },
    OE: { axis: 'v', c: W - T / 2, s0: T, s1: Q.vJ ? vJ : L - T, side: 1, outer: true, thick: T },
    QN: { axis: 'u', c: n - TF / 2, s0: w - TF, s1: e + TF, side: 1, thick: TF },
    QS: { axis: 'u', c: s + TF / 2, s0: w - TF, s1: e + TF, side: -1, thick: TF },
    QW: { axis: 'v', c: w - TF / 2, s0: n, s1: s, side: 1, thick: TF },
    QE: { axis: 'v', c: e + TF / 2, s0: n, s1: s, side: -1, thick: TF },
  };
  if (Q.vJ) {
    walls.OJ = { axis: 'u', c: vJ + T / 2, s0: W - T, s1: WS, side: -1, outer: true, thick: T, ret: true }; // the step's north-facing return
    walls.OE2 = { axis: 'v', c: WS - T / 2, s0: vJ + T, s1: L - T, side: 1, outer: true, thick: T };
  }
  if (xb) {
    walls.XN = { axis: 'u', c: xb.v0 + TF / 2, s0: xb.u0, s1: xb.u1, side: -1, thick: TF };
    walls.XS = { axis: 'u', c: xb.v1 - TF / 2, s0: xb.u0, s1: xb.u1, side: 1, thick: TF };
    walls.XW = { axis: 'v', c: xb.u0 + TF / 2, s0: xb.v0 + TF, s1: xb.v1 - TF, side: -1, thick: TF };
    walls.XE = { axis: 'v', c: xb.u1 - TF / 2, s0: xb.v0 + TF, s1: xb.v1 - TF, side: 1, thick: TF };
  }
  for (const [id, wl] of Object.entries(walls)) { wl.id = id; wl.ops = []; wl.face = wl.c + wl.side * wl.thick / 2; wl.y1 = wl.outer ? FL2 + PAR : H1; }
  const op = (wid, a, width, y0, y1, kind = 'door') => walls[wid].ops.push({ a, w: width, y0, y1, kind });
  // the band side of a front wall: the direction into the rooms
  const intoBand = (wl) => -wl.side;
  // a rectangle in the band behind front wall `wid`, from a0 to a1 along it, `depth` deep
  const bandRect = (wid, a0, a1, depth) => {
    const wl = walls[wid]; const back = wl.c - wl.side * wl.thick / 2; // the band-side face
    const c0 = back; const c1 = back + intoBand(wl) * depth;
    const [p0, p1] = [Math.min(c0, c1), Math.max(c0, c1)];
    return wl.axis === 'u' ? { u0: a0, u1: a1, v0: p0, v1: p1 } : { u0: p0, u1: p1, v0: a0, v1: a1 };
  };
  const yOf = (floor) => (floor ? FL1 : 0);
  const ceilOf = (floor) => (floor ? H1 : H0 - 0.02);

  // ---------------------------------------------------------------------------------
  // Features first (they cut openings), then the walls
  // ---------------------------------------------------------------------------------
  // ---- passages through the ranges into the courts ----
  const passages = [];
  for (const p of Q.passages) {
    const S = p.side === 'S';
    const outerW = S ? 'OS' : 'ON'; const frontW = S ? 'QS' : 'QN';
    const pw = 4; const v0 = S ? s + TF : T; const v1 = S ? L - T : n - TF; // between the front and outer walls
    op(outerW, p.at, pw, 0, 3.6, 'passage'); op(frontW, p.at, pw, 0, 3.6, 'passage');
    passages.push({ ...p, u0: p.at - pw / 2, u1: p.at + pw / 2, v0, v1, S, vIn: S ? s : n, vOut: S ? L : 0 });
  }
  // ---- stairs ----
  for (const st of Q.stairs) {
    const wl = walls[st.wall];
    const [a0, a1] = wl.axis === 'u' ? [st.u0, st.u1] : [st.v0, st.v1];
    op(st.wall, (a0 + a1) / 2, a1 - a0 - 0.1, 0, 3.0, 'stair');
    op(st.wall, (a0 + a1) / 2, a1 - a0 - 0.1, FL1, FL1 + 2.6, 'stair');
  }
  // ---- department rooms ----
  const rooms = Q.rooms.map((r) => ({ ...r, rect: bandRect(r.wall, r.a0, r.a1, r.depth) }));
  for (const r of rooms) {
    const y = yOf(r.floor); const len = r.a1 - r.a0;
    r.door = r.a0 + 1.4;
    op(r.wall, r.door, 1.5, y, y + 2.6, 'roomdoor');
    r.windows = [];
    const nw = Math.max(1, Math.floor((len - 3.2) / 2.6));
    for (let k = 0; k < nw; k++) { const at = r.a0 + 2.6 + (k + 0.5) * ((len - 3.0) / nw); r.windows.push(at); op(r.wall, at, 1.5, y + 1.0, y + 2.6, 'window'); }
  }
  // ---- gameplay rooms (placed by placeRooms inside the OSM outline; doors on the outer facades) ----
  const bays = [];
  for (const r of ctx.rooms) {
    const loc = [[r.x0, r.z0], [r.x1, r.z0], [r.x1, r.z1], [r.x0, r.z1]].map(([x, z]) => K.local(x, z));
    const box = { u0: Math.min(...loc.map((p) => p[0])), u1: Math.max(...loc.map((p) => p[0])), v0: Math.min(...loc.map((p) => p[1])), v1: Math.max(...loc.map((p) => p[1])) };
    const side = r.door.side;
    const wid = { west: 'OW', east: box.v0 > vJ - 0.01 && Q.vJ ? 'OE2' : 'OE', south: 'OS', north: 'ON' }[side];
    const wl = walls[wid];
    // the door's centre line, where it crosses the facade
    const dx = side === 'west' || side === 'east';
    const doorPt = dx ? K.local(side === 'west' ? r.x0 - 1 : r.x1 + 1, r.door.at) : K.local(r.door.at, side === 'north' ? r.z0 - 1 : r.z1 + 1);
    const at = wl.axis === 'u' ? doorPt[0] : doorPt[1];
    op(wid, at, 3.0, 0, 2.75, 'gameplay');
    bays.push({ r, box, wid, at, side });
  }

  // ---------------------------------------------------------------------------------
  // Walls with their openings
  // ---------------------------------------------------------------------------------
  const solidWall = (wl) => {
    const { axis, c, thick, s0, s1 } = wl; const y0 = 0; const y1 = wl.y1;
    const key = CREAM;
    const piece = (a, b, ya, yb) => { if (b - a > 0.005 && yb - ya > 0.005) A(axis, a, b, c - thick / 2, c + thick / 2, ya, yb, key, { collide: true }); };
    const cuts = [...new Set([s0, s1, ...wl.ops.flatMap((o) => [o.a - o.w / 2, o.a + o.w / 2])])].filter((x) => x >= s0 && x <= s1).sort((p, q) => p - q);
    for (let i = 0; i < cuts.length - 1; i++) {
      const a = cuts[i]; const b = cuts[i + 1]; const m = (a + b) / 2;
      const holes = wl.ops.filter((o) => m > o.a - o.w / 2 && m < o.a + o.w / 2).map((o) => [o.y0, o.y1]).sort((p, q) => p[0] - q[0]);
      let y = y0;
      for (const [h0, h1] of holes) { if (h0 > y) piece(a, b, y, h0); y = Math.max(y, h1); }
      if (y < y1) piece(a, b, y, y1);
    }
  };
  for (const wl of Object.values(walls)) solidWall(wl);
  // walkable sills through first-floor openings (stair heads, upstairs room doors), so the floor never gaps across
  // the wall's thickness
  for (const wl of Object.values(walls)) {
    for (const o of wl.ops) if (Math.abs(o.y0 - FL1) < 0.01 && o.kind !== 'window') A(wl.axis, o.a - o.w / 2, o.a + o.w / 2, wl.c - wl.thick / 2 - 0.02, wl.c + wl.thick / 2 + 0.02, FL1 - 0.3, FL1, SLAB, { walkable: true });
    // and a stone threshold through the ground-floor room and gameplay doors
    for (const o of wl.ops) {
      if (o.y0 !== 0 || (o.kind !== 'roomdoor' && o.kind !== 'gameplay')) continue;
      const [a0, a1, c0, c1] = [o.a - o.w / 2, o.a + o.w / 2, wl.c - wl.thick / 2 - 0.03, wl.c + wl.thick / 2 + 0.03];
      if (wl.axis === 'u') ground(a0, a1, c0, c1, 0.03, STONE); else ground(c0, c1, a0, a1, 0.03, STONE);
    }
  }
  // is (along a, floor y) clear of every opening in this wall (by `pad` metres)?
  const clear = (wl, a, half, y0, y1, pad = 0.35) => !wl.ops.some((o) => a + half > o.a - o.w / 2 - pad && a - half < o.a + o.w / 2 + pad && y1 > o.y0 && y0 < o.y1);

  // ---------- relief windows and doors on a face (plane `f`, looking along `sd`) ----------
  const winR = (axis, a, f, sd, y, wdt, h, { frame = TRIM, glass = GLASS, mull = 1, chajja = true } = {}) => {
    const R = (s0, s1, d0, d1, ya, yb, key) => A(axis, s0, s1, Math.min(f + sd * d0, f + sd * d1), Math.max(f + sd * d0, f + sd * d1), ya, yb, key);
    R(a - wdt / 2, a + wdt / 2, 0, 0.04, y, y + h, glass);
    R(a - wdt / 2 - 0.09, a + wdt / 2 + 0.09, 0, 0.14, y - 0.1, y, frame); // sill
    R(a - wdt / 2 - 0.09, a + wdt / 2 + 0.09, 0, 0.1, y + h, y + h + 0.09, frame);
    R(a - wdt / 2 - 0.09, a - wdt / 2, 0, 0.1, y, y + h, frame); R(a + wdt / 2, a + wdt / 2 + 0.09, 0, 0.1, y, y + h, frame);
    for (let k = 1; k <= mull; k++) { const m = a - wdt / 2 + (k * wdt) / (mull + 1); R(m - 0.03, m + 0.03, 0, 0.08, y, y + h, frame); }
    R(a - wdt / 2, a + wdt / 2, 0, 0.08, y + h * 0.62 - 0.03, y + h * 0.62 + 0.03, frame);
    if (chajja) { R(a - wdt / 2 - 0.3, a + wdt / 2 + 0.3, 0, 0.55, y + h + 0.25, y + h + 0.35, CREAM_C); R(a - wdt / 2 - 0.3, a + wdt / 2 + 0.3, 0.5, 0.56, y + h + 0.16, y + h + 0.35, CREAM_C); }
  };
  const doorR = (axis, a, f, sd, y, wdt, h = 2.6) => {
    const R = (s0, s1, d0, d1, ya, yb, key) => A(axis, s0, s1, Math.min(f + sd * d0, f + sd * d1), Math.max(f + sd * d0, f + sd * d1), ya, yb, key);
    R(a - wdt / 2, a + wdt / 2, 0, 0.05, y, y + h, LEAF);
    R(a - wdt / 2 - 0.1, a + wdt / 2 + 0.1, 0, 0.1, y + h, y + h + 0.1, LEAF_F);
    R(a - wdt / 2 - 0.1, a - wdt / 2, 0, 0.1, y, y + h, LEAF_F); R(a + wdt / 2, a + wdt / 2 + 0.1, 0, 0.1, y, y + h, LEAF_F);
    R(a - 0.02, a + 0.02, 0, 0.08, y, y + h, LEAF_F);
    R(a - wdt / 2, a + wdt / 2, 0, 0.07, y + h * 0.55, y + h * 0.55 + 0.05, LEAF_F);
  };
  // a horizontal ribbon along a face from s0 to s1, broken where openings reach into it
  const ribbon = (wl, s0, s1, y0, y1, d, key) => {
    let a = s0;
    const ops = wl.ops.filter((o) => y1 > o.y0 && y0 < o.y1).map((o) => [o.a - o.w / 2, o.a + o.w / 2]).sort((p, q) => p[0] - q[0]);
    const R = (p, q) => { if (q - p > 0.02) A(wl.axis, p, q, Math.min(wl.face, wl.face + wl.side * d), Math.max(wl.face, wl.face + wl.side * d), y0, y1, key); };
    for (const [p, q] of ops) { if (q < s0 || p > s1) continue; R(a, Math.max(a, p)); a = Math.max(a, q); }
    R(a, s1);
  };

  // ---------- outer facades ----------
  // How far a band `d` proud runs past each end of an outer wall, so the corners close without overlapping:
  // the u-walls (north, south, the step's return) wrap the corners; the v-walls run to the u-walls' faces.
  const ext = (wl, d) => {
    if (wl.id === 'OJ') return [W, wl.s1 + d];
    if (wl.axis === 'u') return [wl.s0 - d, wl.s1 + d];
    if (wl.id === 'OE' && Q.vJ) return [wl.s0 - T, wl.s1 - d];
    return [wl.s0 - T, wl.s1 + T];
  };
  for (const wl of Object.values(walls).filter((x) => x.outer)) {
    const { axis, face: f, side: sd, s0, s1 } = wl;
    const len = s1 - s0;
    const band = (d, y0, y1, key, gaps = false) => { const [a, b] = ext(wl, d); if (gaps) ribbon(wl, a, b, y0, y1, d, key); else A(axis, a, b, Math.min(f, f + sd * d), Math.max(f, f + sd * d), y0, y1, key); };
    band(0.07, 0, 0.6, PLINTH, true); // plinth
    band(0.08, FL1 - 0.3, FL1 - 0.15, MAROON, true); // string-course at the first floor
    band(0.14, FL1 - 0.15, FL1 - 0.05, CREAM_C, true);
    band(0.45, FL2 - 0.55, FL2 - 0.4, CREAM_C); // cornice
    band(0.3, FL2 - 0.4, FL2 - 0.3, CREAM_C);
    band(0.05, FL2 + PAR - 0.2, FL2 + PAR - 0.12, MAROON); // parapet band
    const cp = wl.axis === 'u' ? [s0 - 0.05, s1 + 0.05] : [s0 + 0.05, s1 - 0.05];
    A(axis, cp[0], cp[1], wl.c - wl.thick / 2 - 0.05, wl.c + wl.thick / 2 + 0.05, FL2 + PAR, FL2 + PAR + 0.08, TRIM); // coping
    if (len < 4) continue;
    const nb = Math.max(1, Math.round((len - 2) / 3.6)); const bay = (len - 2) / nb;
    for (let i = 0; i < nb; i++) {
      const a = s0 + 1 + (i + 0.5) * bay;
      if (clear(wl, a, 0.9, 0, 3.4, 0.5)) winR(axis, a, f, sd, 1.0, 1.5, 2.2);
      if (clear(wl, a, 0.9, FL1, FL1 + 3, 0.3)) { winR(axis, a - 0.55, f, sd, FL1 + 1.0, 0.8, 2.0, { chajja: false }); winR(axis, a + 0.55, f, sd, FL1 + 1.0, 0.8, 2.0, { chajja: false }); A(axis, a - 1.3, a + 1.3, Math.min(f, f + sd * 0.55), Math.max(f, f + sd * 0.55), FL1 + 3.25, FL1 + 3.35, CREAM_C); }
      if (i > 0) { const pa = s0 + 1 + i * bay; A(axis, pa - 0.22, pa + 0.22, Math.min(f, f + sd * 0.1), Math.max(f, f + sd * 0.1), 0.6, FL2 - 0.55, CREAM_C); } // pilasters
      // jali vent tiles under the cornice
      for (const k of [-1, 0, 1]) A(axis, a + k * 0.7 - 0.18, a + k * 0.7 + 0.18, Math.min(f, f + sd * 0.03), Math.max(f, f + sd * 0.03), FL2 - 1.05, FL2 - 0.75, JALI_H);
    }
  }

  // ---------- verandah (front) walls: dado, relief doors and windows on the verandah face ----------
  for (const wl of Object.values(walls).filter((x) => !x.outer)) {
    const { axis, face: f, side: sd, s0, s1 } = wl;
    for (const fl of [0, 1]) {
      const y = yOf(fl);
      ribbon(wl, s0, s1, y, y + 1.0, 0.03, DADO);
      const len = s1 - s0; const nb = Math.max(1, Math.round(len / 3.6)); const bay = len / nb;
      for (let i = 0; i < nb; i++) {
        const a = s0 + (i + 0.5) * bay;
        if (a - s0 < 1.2 || s1 - a < 1.2) continue;
        if (!clear(wl, a, 0.9, y, y + 3)) continue;
        if ((i + fl) % 2 === 0) doorR(axis, a, f, sd, y, 1.2); else winR(axis, a, f, sd, y + 1.0, 1.6, 1.9, { chajja: false });
      }
    }
  }

  // ---------- floors, roof ----------
  const holes = [...courts, ...(xb ? [xb] : [])];
  K.slab(w, e, n, s, 0.03, po(KOTA), { thick: 0.03, holes, walkable: false, collide: false }); // ground verandah paving
  K.slab(w, e, n, s, FL1, SLAB, { thick: 0.3, holes }); // first-floor verandah (walkable)
  K.slab(w, e, n, s, FL1 + 0.012, po(KOTA), { thick: 0.012, holes, walkable: false, collide: false });
  K.slab(T - 0.02, W - T + 0.02, T - 0.02, L - T + 0.02, FL2, ROOF, { thick: 0.35, holes: courts, walkable: false, collide: false });
  if (Q.vJ) D(W - T + 0.02, WS - T + 0.02, vJ + T - 0.02, L - T + 0.02, FL2 - 0.35, FL2, ROOF);
  // roof furniture: water tanks and a few AC boxes
  for (const [tu, tv] of [[w * 0.5, n * 0.5], [W - 6, L - 8], [W * 0.5, n * 0.45]]) { K.cyl(tu, tv, FL2, 0.9, 1.6, 'c:#2b2b2b', { seg: 12 }); K.cyl(tu + 2.2, tv, FL2, 0.9, 1.6, 'c:#2b2b2b', { seg: 12 }); }

  // ---------- courts: arcades, verandah columns, lawns ----------
  const arcade = (axis, c, s0, s1, { faceSide }) => {
    const len = s1 - s0;
    let nb = Math.max(3, Math.round(len / 3.5)); if (nb % 2 === 0) nb += 1; // odd: an arch on the court's centre line
    if (len / nb > 3.6) nb += 2;
    const bay = len / nb;
    const spring = Math.min(2.5, H0 - 0.95 - 1.21 * (bay - PIER) / 2); // the crown stays under the jali band
    const sh = archShape(bay, PIER / 2, bay - PIER / 2, spring, H0);
    for (let i = 0; i < nb; i++) {
      const b0 = s0 + i * bay;
      extrude(sh, axis, b0, c, 0.6, CREAM);
      A(axis, b0 + PIER / 2 - 0.05, b0 + bay - PIER / 2 + 0.05, c - 0.32, c + 0.32, H0 - 0.85, H0 - 0.3, JALI); // jali band
      for (const fs of [-1, 1]) for (let k = 0; k < 6; k++) { const vx = b0 + PIER / 2 + 0.2 + k * ((bay - PIER - 0.4) / 5); A(axis, vx - 0.12, vx + 0.12, Math.min(c + fs * 0.31, c + fs * 0.34), Math.max(c + fs * 0.31, c + fs * 0.34), H0 - 0.75, H0 - 0.4, JALI_H); }
    }
    for (let i = 0; i <= nb; i++) {
      const p = s0 + i * bay;
      if (axis === 'u') K.col(p - PIER / 2, p + PIER / 2, c - 0.3, c + 0.3, 0, H0); else K.col(c - 0.3, c + 0.3, p - PIER / 2, p + PIER / 2, 0, H0);
      A(axis, p - PIER / 2 - 0.06, p + PIER / 2 + 0.06, c - 0.36, c + 0.36, 0, 0.55, PLINTH);
    }
    A(axis, s0, s1, c - 0.36, c + 0.36, H0 - 0.05, H0 + 0.12, MAROON); // string-course
    // first floor: balustrade, paired columns, beam; parapet above the roof
    A(axis, s0, s1, c - 0.12, c + 0.12, FL1, FL1 + 0.95, CREAM, { collide: true });
    A(axis, s0 - 0.05, s1 + 0.05, c - 0.18, c + 0.18, FL1 + 0.95, FL1 + 1.05, TRIM);
    for (let i = 0; i <= nb; i++) {
      const p = s0 + i * bay;
      for (const dx of [-0.2, 0.2]) A(axis, p + dx - 0.11, p + dx + 0.11, c - 0.11, c + 0.11, FL1 + 1.05, H1 - 0.35, TRIM);
      A(axis, p - 0.4, p + 0.4, c - 0.18, c + 0.18, H1 - 0.5, H1 - 0.35, CREAM_C); // capital
    }
    A(axis, s0, s1, c - 0.25, c + 0.3, H1 - 0.35, H1, CREAM_C); // beam
    A(axis, s0, s1, Math.min(c + faceSide * 0.25, c + faceSide * 0.31), Math.max(c + faceSide * 0.25, c + faceSide * 0.31), H1 - 0.3, H1 - 0.2, MAROON);
    A(axis, s0, s1, c - 0.15, c + 0.15, FL2, FL2 + 0.6, CREAM); // court parapet
    A(axis, s0 - 0.05, s1 + 0.05, c - 0.2, c + 0.2, FL2 + 0.6, FL2 + 0.68, TRIM);
    // verandah lights (ground and first floor), on the verandah side of the arcade
    const lc = c - faceSide * (VD / 2);
    for (let i = 0; i < nb; i += 2) {
      const p = s0 + (i + 0.5) * bay;
      const [lu, lv] = axis === 'u' ? [p, lc] : [lc, p];
      const dir = axis === 'u' ? [1, 0] : [0, 1];
      K.tubeLight(lu, lv, H0, dir); K.tubeLight(lu, lv, H1, dir);
    }
    return { nb, bay };
  };
  for (const ct of courts) {
    arcade('u', ct.v0, ct.u0, ct.u1, { faceSide: 1 }); // north edge: the court lies at +v
    arcade('u', ct.v1, ct.u0, ct.u1, { faceSide: -1 });
    arcade('v', ct.u0, ct.v0, ct.v1, { faceSide: 1 });
    arcade('v', ct.u1, ct.v0, ct.v1, { faceSide: -1 });
    for (const [cu, cv] of [[ct.u0, ct.v0], [ct.u1, ct.v0], [ct.u0, ct.v1], [ct.u1, ct.v1]]) {
      B(cu - 0.4, cu + 0.4, cv - 0.4, cv + 0.4, 0, H0, CREAM); // corner pier
      D(cu - 0.46, cu + 0.46, cv - 0.46, cv + 0.46, 0, 0.6, PLINTH);
      D(cu - 0.2, cu + 0.2, cv - 0.2, cv + 0.2, FL1 + 1.05, H1 - 0.35, TRIM);
      D(cu - 0.2, cu + 0.2, cv - 0.2, cv + 0.2, FL2, FL2 + 0.6, CREAM);
    }
    // lawn, a perimeter path and the cross paths to the arches on the centre lines
    const cu = (ct.u0 + ct.u1) / 2; const cv = (ct.v0 + ct.v1) / 2;
    ground(ct.u0, ct.u1, ct.v0, ct.v1, 0.035, LAWN); // right up to the verandah paving's edge
    ground(ct.u0 + 0.3, ct.u1 - 0.3, ct.v0 + 0.6, ct.v0 + 2.2, 0.045, STONE); ground(ct.u0 + 0.3, ct.u1 - 0.3, ct.v1 - 2.2, ct.v1 - 0.6, 0.045, STONE);
    ground(ct.u0 + 0.6, ct.u0 + 2.2, ct.v0 + 2.2, ct.v1 - 2.2, 0.045, STONE); ground(ct.u1 - 2.2, ct.u1 - 0.6, ct.v0 + 2.2, ct.v1 - 2.2, 0.045, STONE);
    ground(cu - 1.1, cu + 1.1, ct.v0 + 2.2, cv - 2.4, 0.046, STONE); ground(cu - 1.1, cu + 1.1, cv + 2.4, ct.v1 - 2.2, 0.046, STONE);
    ground(ct.u0 + 2.2, cu - 2.4, cv - 1.1, cv + 1.1, 0.046, STONE); ground(cu + 2.4, ct.u1 - 2.2, cv - 1.1, cv + 1.1, 0.046, STONE);
    // a round bed where the paths cross
    const bed = new THREE.CylinderGeometry(2.4, 2.4, 0.35, 24); bed.translate(cu, 0.175, cv); K.mesh(bed, 'c:#bdb5a6');
    K.col(cu - 1.7, cu + 1.7, cv - 1.7, cv + 1.7, 0, 0.35);
    const top = new THREE.CircleGeometry(2.25, 24); top.rotateX(-Math.PI / 2); top.translate(cu, 0.36, cv); K.mesh(top, 'c:#6f9a48');
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; const sp = new THREE.SphereGeometry(0.45, 8, 6); sp.scale(1, 0.8, 1); sp.translate(cu + Math.cos(a) * 1.5, 0.65, cv + Math.sin(a) * 1.5); K.mesh(sp, k % 2 ? 'c:#c2385a' : 'c:#a8283a'); }
  }
  // benches along the verandahs (against the front walls)
  for (const wl of Object.values(walls).filter((x) => !x.outer)) {
    for (let a = wl.s0 + 6; a < wl.s1 - 4; a += 14) {
      if (!clear(wl, a, 1.1, 0, 2, 0.5)) continue;
      const f = wl.face; const sd = wl.side;
      A(wl.axis, a - 0.9, a + 0.9, Math.min(f + sd * 0.2, f + sd * 0.6), Math.max(f + sd * 0.2, f + sd * 0.6), 0.42, 0.48, WOOD);
      for (const k of [-0.85, 0.8]) A(wl.axis, a + k, a + k + 0.05, Math.min(f + sd * 0.25, f + sd * 0.55), Math.max(f + sd * 0.25, f + sd * 0.55), 0, 0.42, WOOD);
      A(wl.axis, a - 0.9, a + 0.9, Math.min(f + sd * 0.2, f + sd * 0.6), Math.max(f + sd * 0.2, f + sd * 0.6), 0, 0.48, WOOD, { collide: true });
    }
  }

  // ---------- passages and porches ----------
  for (const p of passages) {
    const { u0, u1, v0, v1 } = p;
    for (const [a, b] of [[u0 - TF, u0], [u1, u1 + TF]]) B(a, b, v0, v1, 0, H0, CREAM);
    D(u0 - TF, u1 + TF, v0, v1, H0 - 0.34, H0 - 0.31, WHITE); // ceiling (just under any room above)
    D(u0, u1, Math.min(p.vIn, p.vOut), Math.max(p.vIn, p.vOut), 0.0, 0.035, po(KOTA));
    for (const [a, f] of [[u0, 1], [u1, -1]]) D(Math.min(a, a + f * 0.03), Math.max(a, a + f * 0.03), v0, v1, 0, 1.0, DADO);
    for (let v = v0 + 2; v < v1 - 1; v += 4) K.tubeLight((u0 + u1) / 2, v, H0 - 0.34, [0, 1]);
    // notice boards and the way-finding signs
    K.board(u0 + 0.02, (v0 + v1) / 2, 0, [1, 0], { w: 2.6, h: 1.1, key: 'c:#b48a5a' });
    K.board(u1 - 0.02, (v0 + v1) / 2, 0, [-1, 0], { w: 2.6, h: 1.1, key: 'c:#b48a5a' });
    const inner = p.vIn; const outerV = p.vOut; const toOut = p.S ? 1 : -1;
    const courtName = Q.courts.length > 1 ? `${Q.short} · ${p.S ? 'South' : 'North'} Court` : `${Q.short} · Courtyard`;
    K.sign(courtName, (u0 + u1) / 2, inner, 3.7, [0, -toOut], { width: 3.2, height: 0.36 });
    K.sign(Q.short, (u0 + u1) / 2, outerV, 3.75, [0, toOut], { width: 1.6, height: 0.42 });
    K.entrance(p.name, (u0 + u1) / 2, outerV + toOut * (p.porch ? 6.2 : 1.6), [0, toOut]);
    const out = K.world((u0 + u1) / 2, outerV + toOut * (p.porch ? 6.2 : 1.6)); const inn = K.world((u0 + u1) / 2, inner - toOut * (VD + 2.5));
    K.navLinks.push([[out.x, out.z], [inn.x, inn.z]]);
    (campus.statuePts ||= []).push([out.x, out.z], [inn.x, inn.z]); // keep trees off the way in
    if (!p.porch) continue;
    // porch: a single-storey arched pavilion with a parapet and the division's name
    const pu0 = p.at - 4.8; const pu1 = p.at + 4.8; const pv0 = L; const pv1 = L + 4.6; const PH = 5.0;
    extrude(archShape(pu1 - pu0, 2.6, pu1 - pu0 - 2.6, 2.0, PH), 'u', pu0, pv1 - 0.35, 0.7, CREAM);
    for (const su of [pu0 + 0.35, pu1 - 0.35]) extrude(archShape(pv1 - 0.7 - pv0, 0.6, pv1 - 0.7 - pv0 - 0.6, 2.4, PH), 'v', pv0, su, 0.7, CREAM);
    for (const [a, b] of [[pu0, pu0 + 2.6], [pu1 - 2.6, pu1]]) K.col(a, b, pv1 - 0.7, pv1, 0, PH);
    for (const su of [pu0 + 0.35, pu1 - 0.35]) { K.col(su - 0.35, su + 0.35, pv0, pv0 + 0.6, 0, PH); K.col(su - 0.35, su + 0.35, pv1 - 1.3, pv1, 0, PH); }
    D(pu0, pu1, pv0, pv1, PH, PH + 0.3, CREAM_C); // roof slab
    D(pu0 + 0.2, pu1 - 0.2, pv0, pv1 - 0.2, PH - 0.02, PH, WHITE);
    D(pu0 - 0.1, pu1 + 0.1, pv0, pv1 + 0.1, PH + 0.3, PH + 1.1, CREAM); // parapet block with the name
    D(pu0 - 0.15, pu1 + 0.15, pv0, pv1 + 0.15, PH + 1.1, PH + 1.2, TRIM);
    D(pu0 - 0.12, pu1 + 0.12, pv0, pv1 + 0.12, PH + 0.3, PH + 0.4, MAROON);
    for (const su of [pu0, pu1]) for (const sv of [pv1 - 0.7]) D(su - 0.1, su + 0.1, sv - 0.1, pv1 + 0.1, 0, 0.7, PLINTH);
    D(pu0, pu1, pv1 - 0.75, pv1 + 0.05, 0, 0.6, PLINTH);
    K.sign(Q.title, p.at, pv1 + 0.11, PH + 0.42, [0, 1], { width: 7.6, height: 0.62, bg: '#efe8d6', fg: '#7a2622', font: 'bold 64px Georgia, serif' });
    ground(pu0 + 0.1, pu1 - 0.1, pv0, pv1, 0.04, STONE);
    ground(p.at - 2.2, p.at + 2.2, pv1, pv1 + 6, 0.04, STONE); // apron
    K.tubeLight(p.at, (pv0 + pv1) / 2, PH - 0.02, [1, 0]);
    // the chamfered entrance attic over the passage, on the facade
    D(p.at - 3.4, p.at + 3.4, L - 0.2, L + 0.25, FL2 + PAR, FL2 + PAR + 1.3, CREAM);
    D(p.at - 3.5, p.at + 3.5, L - 0.25, L + 0.3, FL2 + PAR + 1.3, FL2 + PAR + 1.42, TRIM);
    D(p.at - 1.2, p.at + 1.2, L - 0.15, L + 0.27, FL2 + PAR + 1.42, FL2 + PAR + 2.1, CREAM);
    D(p.at - 1.3, p.at + 1.3, L - 0.2, L + 0.32, FL2 + PAR + 2.1, FL2 + PAR + 2.2, TRIM);
    const emb = new THREE.CircleGeometry(0.55, 24); emb.translate(p.at, FL2 + PAR + 0.65, L + 0.26); K.mesh(emb, MAROON);
    (campus.statuePts ||= []).push([K.world(p.at, pv1 + 4).x, K.world(p.at, pv1 + 4).z]);
  }

  // ---------- stairs: dog-legs from the ground verandah up to the first-floor verandah ----------
  const stairInfo = [];
  for (const st of Q.stairs) {
    const wl = walls[st.wall];
    const hole = K.dogleg(st.u0, st.u1, st.v0, st.v1, 0, FL1, { along: st.along, reverse: st.reverse, wall: null, name: st.name, key: 't:terrazzo:#c9c6bd' });
    { // the stair hall's ground floor, through the opening to the verandah paving
      const c0 = wl.c - wl.thick / 2 - 0.02; const c1 = wl.c + wl.thick / 2 + 0.02;
      if (wl.axis === 'u') ground(st.u0, st.u1, Math.min(st.v0, c0), Math.max(st.v1, c1), 0.025, 't:terrazzo:#c9c6bd');
      else ground(Math.min(st.u0, c0), Math.max(st.u1, c1), st.v0, st.v1, 0.025, 't:terrazzo:#c9c6bd');
    }
    // spare floor at the start end is a first-floor landing next to the front wall (the floor above the way in)
    if (st.along === 'u') {
      const [l0, l1] = st.reverse ? [hole.u1, st.u1] : [st.u0, hole.u0];
      if (l1 - l0 > 0.05) walk(l0, l1, st.v0, st.v1, FL1 - 0.3, FL1, 't:terrazzo:#c9c6bd');
    } else {
      const [l0, l1] = st.reverse ? [hole.v1, st.v1] : [st.v0, hole.v0];
      if (l1 - l0 > 0.05) walk(st.u0, st.u1, l0, l1, FL1 - 0.3, FL1, 't:terrazzo:#c9c6bd');
    }
    // stair-hall walls (both long sides and the far end) up to the roof
    const t = 0.2;
    if (st.along === 'u') {
      B(st.u0, st.u1, st.v0 - t, st.v0, 0, H1, CREAM); B(st.u0, st.u1, st.v1, st.v1 + t, 0, H1, CREAM);
      const fu = st.reverse ? st.u0 : st.u1; B(Math.min(fu, fu + (st.reverse ? -t : t)), Math.max(fu, fu + (st.reverse ? -t : t)), st.v0 - t, st.v1 + t, 0, H1, CREAM);
    } else {
      B(st.u0 - t, st.u0, st.v0, st.v1, 0, H1, CREAM); B(st.u1, st.u1 + t, st.v0, st.v1, 0, H1, CREAM);
      const fv = st.reverse ? st.v0 : st.v1; B(st.u0 - t, st.u1 + t, Math.min(fv, fv + (st.reverse ? -t : t)), Math.max(fv, fv + (st.reverse ? -t : t)), 0, H1, CREAM);
    }
    // a solid dwarf wall between the flights, stepping up with flight 2 (the kit's rail stops at landing height)
    const across = st.along === 'u' ? [st.v0, st.v1] : [st.u0, st.u1];
    const wid = (across[1] - across[0] - 0.1) / 2; const b0 = across[0] + wid; const b1 = b0 + 0.1;
    const landing = Math.max(1.1, wid); const steps = Math.max(2, Math.ceil(FL1 / 2 / RISE_MAX)); const run = steps * 0.28;
    const climb = st.along === 'u' ? [st.u0, st.u1] : [st.v0, st.v1];
    const far = st.reverse ? climb[0] : climb[1]; const dir = st.reverse ? -1 : 1;
    const la0 = far - dir * landing; const start = la0 - dir * run;
    const N = 8;
    for (let k = 0; k < N; k++) {
      const a = Math.min(la0, start) + (Math.abs(start - la0) * k) / N; const b = a + Math.abs(start - la0) / N;
      const mid = (a + b) / 2; const f = Math.abs(mid - la0) / Math.abs(start - la0); // 0 at the landing, 1 at the top
      const top = FL1 * (0.5 + 0.5 * Math.min(1, f + 0.5 / N)) + 1.0;
      if (st.along === 'u') { B(a, b, b0 - 0.04, b1 + 0.04, 0, top, CREAM); D(a - 0.01, b + 0.01, b0 - 0.08, b1 + 0.08, top - 0.05, top + 0.03, 'c:#d9d3c7'); }
      else { B(b0 - 0.04, b1 + 0.04, a, b, 0, top, CREAM); D(b0 - 0.08, b1 + 0.08, a - 0.01, b + 0.01, top - 0.05, top + 0.03, 'c:#d9d3c7'); }
    }
    const cu = (st.u0 + st.u1) / 2; const cv = (st.v0 + st.v1) / 2;
    K.tubeLight(cu, cv, H1, st.along === 'u' ? [1, 0] : [0, 1]);
    K.tubeLight(cu, cv, H0 - 0.02, st.along === 'u' ? [1, 0] : [0, 1]);
    const ctr = (st.along === 'u' ? (st.v0 + st.v1) / 2 : (st.u0 + st.u1) / 2);
    for (const fl of [0, 1]) K.sign(fl ? '↓ Stairs' : '↑ Stairs · First Floor', wl.axis === 'u' ? cu : wl.face + wl.side * 0.02, wl.axis === 'u' ? wl.face + wl.side * 0.02 : cv, yOf(fl) + 3.1, wl.axis === 'u' ? [0, wl.side] : [wl.side, 0], { width: 2.0, height: 0.3, bg: '#1f3a5f', fg: '#ffffff', font: 'bold 56px Arial, sans-serif' });
    stairInfo.push({ ...st, hole, ctr, start, la0, far });
  }

  // ---------- department rooms ----------
  const roomWalls = (r, y, yc) => {
    const { rect } = r; const wl = walls[r.wall]; const t = 0.2; const ib = intoBand(wl);
    const back = wl.c - wl.side * wl.thick / 2 + ib * r.depth;
    if (wl.axis === 'u') {
      B(rect.u0 - t, rect.u0, rect.v0, rect.v1, y, yc, CREAM); B(rect.u1, rect.u1 + t, rect.v0, rect.v1, y, yc, CREAM);
      if (!r.noBack) B(rect.u0 - t, rect.u1 + t, Math.min(back, back + ib * t), Math.max(back, back + ib * t), y, yc, CREAM);
    } else {
      B(rect.u0, rect.u1, rect.v0 - t, rect.v0, y, yc, CREAM); B(rect.u0, rect.u1, rect.v1, rect.v1 + t, y, yc, CREAM);
      if (!r.noBack) B(Math.min(back, back + ib * t), Math.max(back, back + ib * t), rect.v0 - t, rect.v1 + t, y, yc, CREAM);
    }
  };
  for (const r of rooms) {
    const { rect } = r; const wl = walls[r.wall]; const y = yOf(r.floor); const yc = ceilOf(r.floor);
    roomWalls(r, y, r.floor ? H1 : H0);
    if (r.floor) walk(rect.u0 - 0.2, rect.u1 + 0.2, rect.v0, rect.v1, FL1 - 0.3, FL1, SLAB);
    else D(rect.u0, rect.u1, rect.v0, rect.v1, H0 - 0.02, H0 + 0.1, WHITE);
    // door leaf (open into the room), frame and glazed windows
    K.door(wl.axis === 'u', r.door, wl.c, y, 1.5, { height: 2.6, thick: wl.thick, side: intoBand(wl) });
    for (const at of r.windows) K.window(wl.axis === 'u', at, wl.c, y + 1.0, 1.5, 1.6, { glass: 'g:#9fc3d6', thick: wl.thick });
    const sw = Math.min(4.2, 0.95 + r.sign.length * 0.11); const sa = Math.min(r.a1 - sw / 2 - 0.1, r.door + sw / 2 - 0.8);
    K.sign(r.sign, wl.axis === 'u' ? sa : wl.face, wl.axis === 'u' ? wl.face : sa, y + 2.75, wl.axis === 'u' ? [0, wl.side] : [wl.side, 0], { width: sw, height: 0.3, bg: '#1f3a5f', fg: '#ffffff', font: 'bold 56px Arial, sans-serif' });
    K.layer(`${Q.key}-${r.id}`, () => furnish(K, r, wl, y, yc));
    K.room(r.id, r.name, rect.u0, rect.u1, rect.v0, rect.v1, y, yc, r.floor);
  }

  // ---------- gameplay rooms: an enclosed bay round each, open to its facade door ----------
  for (const g of bays) {
    const wl = walls[g.wid];
    const m = 0.55; const t = 0.2;
    // the band's inner limit (a front wall) on the side away from the facade
    let { u0, u1, v0, v1 } = { u0: g.box.u0 - m, u1: g.box.u1 + m, v0: g.box.v0 - m, v1: g.box.v1 + m };
    const inside = { u0: T, u1: (Q.vJ && g.box.v0 > vJ ? WS : W) - T, v0: T, v1: L - T };
    u0 = Math.max(u0, inside.u0); u1 = Math.min(u1, inside.u1); v0 = Math.max(v0, inside.v0); v1 = Math.min(v1, inside.v1);
    const front = { OW: ['u1', w - TF], OE: ['u0', e + TF], OE2: ['u0', e + TF], OS: ['v0', s + TF], ON: ['v1', n - TF] }[g.wid];
    const lim = front[1];
    if (front[0] === 'u1') u1 = Math.min(u1, lim); if (front[0] === 'u0') u0 = Math.max(u0, lim);
    if (front[0] === 'v1') v1 = Math.min(v1, lim); if (front[0] === 'v0') v0 = Math.max(v0, lim);
    const sides = [];
    if (wl.axis === 'v') { sides.push(['v', v0 - t, v0], ['v', v1, v1 + t]); if (Math.abs((front[0] === 'u1' ? u1 : u0) - lim) > 0.01) sides.push(['u', front[0] === 'u1' ? u1 : u0 - t, front[0] === 'u1' ? u1 + t : u0]); }
    else { sides.push(['u', u0 - t, u0], ['u', u1, u1 + t]); if (Math.abs((front[0] === 'v1' ? v1 : v0) - lim) > 0.01) sides.push(['v', front[0] === 'v1' ? v1 : v0 - t, front[0] === 'v1' ? v1 + t : v0]); }
    // north of FD-III's step the building ends at W - T: clip anything there
    const uMax = (va) => (Q.vJ && va < vJ + T ? W - T : WS - T);
    for (const [ax, a, b] of sides) { if (ax === 'v') B(u0 - t, Math.min(u1 + t, uMax(a)), a, b, 0, H0, CREAM); else B(a, b, v0, v1, 0, H0, CREAM); }
    if (Q.vJ && v0 < vJ + T && u1 > W - T) {
      D(u0, W - T, v0, vJ + T, H0 - 0.02, H0 + 0.1, WHITE); D(u0, u1, vJ + T, v1, H0 - 0.02, H0 + 0.1, WHITE);
    } else D(u0, u1, v0, v1, H0 - 0.02, H0 + 0.1, WHITE);
    // paving from the facade to the room's door wall, and a light
    const r = g.r;
    const dw = { west: [[r.x0 - 0.12, r.z0], [r.x0 - 0.12, r.z1]], east: [[r.x1 + 0.12, r.z0], [r.x1 + 0.12, r.z1]], south: [[r.x0, r.z1 + 0.12], [r.x1, r.z1 + 0.12]], north: [[r.x0, r.z0 - 0.12], [r.x1, r.z0 - 0.12]] }[g.side].map(([x, z]) => K.local(x, z));
    const inF = wl.c - wl.side * wl.thick / 2;
    const pts = wl.axis === 'v' ? [[inF, dw[0][1]], [dw[0][0], dw[0][1]], [dw[1][0], dw[1][1]], [inF, dw[1][1]]] : [[dw[0][0], inF], [dw[0][0], dw[0][1]], [dw[1][0], dw[1][1]], [dw[1][0], inF]];
    const sh = new THREE.Shape(pts.map(([pu, pv]) => new THREE.Vector2(pu, -pv)));
    const pg = new THREE.ShapeGeometry(sh); pg.rotateX(-Math.PI / 2); pg.translate(0, 0.02, 0); K.mesh(pg, po(KOTA));
    const [lu, lv] = wl.axis === 'v' ? [inF + wl.side * -0.9, g.at] : [g.at, inF + wl.side * -0.9];
    K.tubeLight(lu, lv, H0 - 0.02, wl.axis === 'v' ? [0, 1] : [1, 0]);
    // door surround on the facade
    const f = wl.face; const sd = wl.side;
    A(wl.axis, g.at - 1.6, g.at - 1.4, Math.min(f, f + sd * 0.12), Math.max(f, f + sd * 0.12), 0, 2.85, MAROON);
    A(wl.axis, g.at + 1.4, g.at + 1.6, Math.min(f, f + sd * 0.12), Math.max(f, f + sd * 0.12), 0, 2.85, MAROON);
    A(wl.axis, g.at - 1.6, g.at + 1.6, Math.min(f, f + sd * 0.12), Math.max(f, f + sd * 0.12), 2.75, 2.95, MAROON);
    A(wl.axis, g.at - 1.9, g.at + 1.9, Math.min(f, f + sd * 0.7), Math.max(f, f + sd * 0.7), 3.2, 3.32, CREAM_C); // canopy
  }

  // ---------- plates (department names on the verandahs) ----------
  for (const p of Q.plates) {
    const wl = walls[p.wall]; const y = yOf(p.floor);
    const [pu, pv] = wl.axis === 'u' ? [p.a, wl.face] : [wl.face, p.a];
    K.sign(p.text, pu, pv, y + 2.95, wl.axis === 'u' ? [0, wl.side] : [wl.side, 0], { width: Math.min(4.4, 1 + p.text.length * 0.11), height: 0.3, bg: '#7a2622' });
  }

  // ---------- chhatris on the front (south) corners ----------
  const chhatri = (cu, cv) => {
    const y = FL2 + PAR + 0.08; const r = 1.5;
    D(cu - r - 0.2, cu + r + 0.2, cv - r - 0.2, cv + r + 0.2, FL2, y + 0.45, CREAM_C);
    for (const [du, dv] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) D(cu + du * r * 0.75 - 0.17, cu + du * r * 0.75 + 0.17, cv + dv * r * 0.75 - 0.17, cv + dv * r * 0.75 + 0.17, y + 0.45, y + 2.65, CREAM);
    D(cu - r - 0.15, cu + r + 0.15, cv - r - 0.15, cv + r + 0.15, y + 2.65, y + 2.95, CREAM_C);
    D(cu - r - 0.18, cu + r + 0.18, cv - r - 0.18, cv + r + 0.18, y + 2.75, y + 2.82, MAROON);
    const dome = new THREE.SphereGeometry(r * 0.88, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2); dome.scale(1, 1.15, 1); dome.translate(cu, y + 2.95, cv); K.mesh(dome, CREAM_C);
    const tip = new THREE.ConeGeometry(0.16, 0.9, 8); tip.translate(cu, y + 2.95 + r * 1.0 + 0.4, cv); K.mesh(tip, 'm:#b9974f');
  };
  chhatri(1.9, L - 1.9); chhatri(WS - 1.9, L - 1.9);

  // ---------- the courts become the footprint's holes (trees, people, the explorer agree with the two FD-III courts) ----------
  const host = ctx.buildings.find((b) => b.name === Q.osm);
  if (host) host.holes = courts.map((ct) => [[ct.u0, ct.v0], [ct.u1, ct.v0], [ct.u1, ct.v1], [ct.u0, ct.v1]].map(([u, v]) => { const p = K.world(u + (u === ct.u0 ? 0.4 : -0.4), v + (v === ct.v0 ? 0.4 : -0.4)); return [p.x, p.z]; }));

  K.floors.push({ y: 0, name: `${Q.short} ground (${Q.digit}1xx)` }, { y: FL1, name: `${Q.short} first (${Q.digit}2xx)` });
  return { walls, rooms, bays, stairs: stairInfo, passages };
}

// ======================================================================================
// Furniture for the department rooms (inside a zone layer). wl = the front wall; the room lies on its band side.
// ======================================================================================
function furnish(K, r, wl, y, yc) {
  const { rect } = r;
  const D = (u0, u1, v0, v1, y0, y1, key) => K.box(u0, u1, v0, v1, y0, y1, key, { collide: false });
  const B = (u0, u1, v0, v1, y0, y1, key) => K.box(u0, u1, v0, v1, y0, y1, key);
  const ib = -wl.side; // into the room from the front wall
  // room-relative coordinates: a along the front wall (from a0), d into the room (0 at the front wall's back face)
  const frontC = wl.c - wl.side * wl.thick / 2;
  const P = (a, d) => (wl.axis === 'u' ? [r.a0 + a, frontC + ib * d] : [frontC + ib * d, r.a0 + a]);
  const len = r.a1 - r.a0; const dep = r.depth;
  const inward = wl.axis === 'u' ? [0, ib] : [ib, 0]; // facing deeper into the room
  const outward = [-inward[0], -inward[1]];
  const alongDir = wl.axis === 'u' ? [1, 0] : [0, 1];
  const RB = (a0, a1, d0, d1, y0, y1, key, col = false) => { const [p0, q0] = P(a0, d0); const [p1, q1] = P(a1, d1); (col ? B : D)(Math.min(p0, p1), Math.max(p0, p1), Math.min(q0, q1), Math.max(q0, q1), y0, y1, key); };
  const floorKey = { chemlab: 'c:#9aa0a3', computers: 'c:#8f9aa6', lecture: 't:terrazzo:#d6d1c6', office: 't:wood:#9a7650', union: 't:terrazzo:#d6d1c6', shop: 't:terrazzo:#cfc9bd', faculty: 'c:#9fa9b8' }[r.kind] || 't:terrazzo:#d6d1c6';
  const wallTint = { chemlab: 't:plaster:#f1ecd8', computers: 't:plaster:#e6ecf6', faculty: 't:plaster:#e9eef4' }[r.kind];
  K.flat((rect.u0 + rect.u1) / 2, (rect.v0 + rect.v1) / 2, y + 0.012, rect.u1 - rect.u0, rect.v1 - rect.v0, floorKey);
  if (wallTint) { // a coloured skin on the three inner walls
    RB(0, 0.02, 0.05, dep, y, yc - 0.01, wallTint); RB(len - 0.02, len, 0.05, dep, y, yc - 0.01, wallTint); RB(0, len, dep - 0.02, dep, y, yc - 0.01, wallTint);
  }
  RB(0, len, dep - 0.03, dep, y, y + 0.12, 'c:#5b5047'); // skirting at the back
  // lights in a grid, fans in the older rooms
  const nl = Math.max(1, Math.round(len / 3.5)); const nd = Math.max(1, Math.round(dep / 3.5));
  for (let i = 0; i < nl; i++) for (let j = 0; j < nd; j++) { const [lu, lv] = P(((i + 0.5) * len) / nl, ((j + 0.5) * dep) / nd); K.tubeLight(lu, lv, yc, alongDir); }
  if (['office', 'union', 'lecture', 'shop'].includes(r.kind)) for (let i = 0; i < Math.max(1, Math.round(len / 6)); i++) { const [fu, fv] = P(((i + 0.5) * len) / Math.max(1, Math.round(len / 6)), dep / 2); K.fan(fu, fv, yc); }
  const at = (a, d) => P(a, d);
  if (r.kind === 'office' || r.kind === 'union') {
    // the head's desk facing the door, two visitors' chairs, shelves on the back wall, a notice board
    const [du, dv] = at(len * 0.55, dep * 0.62);
    K.desk(du, dv, y, outward, { w: 1.8, d: 0.85, top: 't:wood:#6a4a30', legs: 'c:#3b2a1c' });
    const [cu, cv] = at(len * 0.55, dep * 0.62 + 0.8); K.chair(cu, cv, y, outward, { seat: 'c:#5a3a2a' });
    for (const da of [-0.6, 0.6]) { const [vu, vv] = at(len * 0.55 + da, dep * 0.62 - 0.9); K.chair(vu, vv, y, inward, { seat: 'c:#3f5f8a' }); }
    for (const a of [len * 0.2, len * 0.85]) { const [su, sv] = at(a, dep - 0.25); K.shelf(su, sv, y, outward, { w: 1.6, h: 2.0, d: 0.4 }); }
    const [bu, bv] = at(0.03, dep * 0.5); K.board(bu, bv, y, alongDir, { w: 2.2, h: 1.0, key: 'c:#b48a5a' });
    if (r.kind === 'union') { // a long meeting table with chairs, posters
      const [tu, tv] = at(len * 0.45, dep * 0.3);
      K.desk(tu, tv, y, inward, { w: 3.2, d: 1.0, top: 'c:#d9d4c8', legs: 'm:#555b61' });
      for (const da of [-1.1, 0, 1.1]) { const [qu, qv] = at(len * 0.45 + da, dep * 0.3 - 0.75); K.chair(qu, qv, y, inward); }
      for (const [k, col] of [[0.3, 'c:#d9a43a'], [0.7, 'c:#3a7ad9']]) { const [pu, pv] = at(len * k, dep - 0.02); K.plane(pu, pv, y + 1.3, 1.0, 1.3, outward, col, { offset: 0.03 }); }
    }
  } else if (r.kind === 'chemlab') {
    // island benches: grey and blue cabinets, black granite tops, steel reagent racks; fume hoods on the back wall
    const nIs = Math.max(1, Math.floor((len - 3) / 3.6));
    for (let i = 0; i < nIs; i++) {
      const a = 2.4 + (i + 0.5) * ((len - 3.6) / nIs);
      RB(a - 0.7, a + 0.7, 1.6, dep - 2.4, y, y + 0.86, 'c:#7f8b96', true);
      RB(a - 0.72, a + 0.72, 1.58, dep - 2.38, y + 0.86, y + 0.92, 'c:#1e1f22');
      RB(a - 0.05, a + 0.05, 1.7, dep - 2.5, y + 0.92, y + 1.6, 'm:#9aa1a6');
      RB(a - 0.3, a + 0.3, 1.7, dep - 2.5, y + 1.55, y + 1.6, 'm:#9aa1a6');
      for (let d = 2.0; d < dep - 2.6; d += 0.6) RB(a - 0.25, a - 0.15, d, d + 0.08, y + 1.6, y + 1.78, d % 1.2 < 0.6 ? 'c:#b8d2e6' : 'c:#e2c27a');
      for (let d = 2.0; d < dep - 2.6; d += 1.4) RB(a - 0.7, a + 0.7, d, d + 0.02, y + 0.15, y + 0.8, 'c:#2f5ea8');
      for (const s of [-1, 1]) for (let d = 2.2; d < dep - 2.6; d += 1.3) { const [su, sv] = at(a + s * 1.1, d); K.cyl(su, sv, y, 0.17, 0.62, 'c:#2f5ea8'); }
    }
    for (let a = 1.2; a < len - 1.6; a += 2.2) {
      RB(a, a + 1.8, dep - 0.9, dep - 0.05, y, y + 0.9, 'c:#d9dde1', true);
      RB(a, a + 1.8, dep - 0.9, dep - 0.05, y + 0.9, y + 0.95, 'c:#1e1f22');
      RB(a, a + 1.8, dep - 0.9, dep - 0.05, y + 2.0, y + 2.6, 'c:#d9dde1');
      RB(a + 0.05, a + 1.75, dep - 0.92, dep - 0.88, y + 0.95, y + 2.0, 'g:#bcd3df');
      RB(a + 0.6, a + 1.2, dep - 0.6, dep - 0.3, y + 2.6, yc, 'm:#9aa1a6'); // duct
    }
    const [bu, bv] = at(0.03, dep * 0.45); K.board(bu, bv, y, alongDir, { w: 3.0, h: 1.2, key: 'c:#2a3a30' });
    const [eu, ev] = at(len - 0.4, 0.7); K.cyl(eu, ev, y, 0.18, 1.2, 'c:#c0392b'); // extinguisher / safety shower post
  } else if (r.kind === 'computers') {
    for (let d = 1.5; d < dep - 0.8; d += 1.8) {
      RB(1.0, len - 1.0, d, d + 0.7, y + 0.72, y + 0.76, 'c:#d9d4c8', true);
      RB(1.0, len - 1.0, d, d + 0.7, y, y + 0.72, 'm:#555b61');
      for (let a = 1.6; a < len - 1.3; a += 1.2) {
        RB(a - 0.28, a + 0.28, d + 0.45, d + 0.5, y + 0.86, y + 1.2, 'c:#1c1d20');
        RB(a - 0.24, a + 0.24, d + 0.44, d + 0.452, y + 0.9, y + 1.16, 'e:#5d7fa3');
        RB(a - 0.04, a + 0.04, d + 0.5, d + 0.56, y + 0.76, y + 0.86, 'c:#1c1d20');
        const [cu, cv] = at(a, d - 0.35); K.chair(cu, cv, y, inward, { seat: 'c:#2f2f35' });
      }
    }
  } else if (r.kind === 'lecture') {
    // board on the near end wall, teacher's table, rows of bench desks facing it
    const [bu, bv] = at(0.04, dep / 2); K.board(bu, bv, y, alongDir, { w: 4.6, h: 1.3, key: 'c:#2a3a30' });
    const [tu, tv] = at(1.7, dep / 2); K.desk(tu, tv, y + 0.18, [alongDir[0], alongDir[1]], { w: 1.6, d: 0.8 });
    { const [p0, q0] = P(0.05, 1.0); const [p1, q1] = P(2.4, dep - 1.0); K.box(Math.min(p0, p1), Math.max(p0, p1), Math.min(q0, q1), Math.max(q0, q1), y, y + 0.18, 't:wood:#7b5a3c', { walkable: true }); }
    for (let a = 3.6; a < len - 0.8; a += 1.25) for (const d of [dep * 0.27, dep * 0.73]) { const [qu, qv] = at(a, d); K.benchDesk(qu, qv, y, [-alongDir[0], -alongDir[1]], { w: Math.min(3.0, dep * 0.4) }); }
  } else if (r.kind === 'shop') {
    // S9: a counter across the room, photocopiers, paper stacks, a price board
    RB(0.6, len - 0.6, 1.6, 2.2, y, y + 1.0, 't:wood:#8a6a4a', true);
    RB(0.55, len - 0.55, 1.55, 2.25, y + 1.0, y + 1.06, 'c:#d9d4c8');
    for (const a of [1.2, 2.7]) { RB(a - 0.45, a + 0.45, dep - 1.1, dep - 0.35, y, y + 1.05, 'c:#e6e6e2', true); RB(a - 0.4, a + 0.4, dep - 1.05, dep - 0.4, y + 1.05, y + 1.12, 'c:#3a3a3a'); }
    for (let k = 0; k < 4; k++) RB(len - 1.3, len - 0.8, dep - 0.9, dep - 0.5, y + k * 0.12, y + k * 0.12 + 0.1, 'c:#f7f7f2');
    const [pu, pv] = at(len / 2, dep - 0.02); K.plane(pu, pv, y + 1.6, 2.2, 0.9, outward, 'c:#f2f0e6', { offset: 0.03 });
  } else if (r.kind === 'faculty') {
    // chambers: low partitions with a desk, chair and a shelf each
    const nc = Math.max(2, Math.floor(len / 2.6));
    for (let i = 0; i < nc; i++) {
      const a0 = (i * len) / nc; const a1 = ((i + 1) * len) / nc; const am = (a0 + a1) / 2;
      if (i > 0) RB(a0 - 0.03, a0 + 0.03, dep * 0.4, dep, y, y + 1.5, 'c:#c9d1da', true);
      const [du, dv] = at(am, dep - 1.0); K.desk(du, dv, y, outward, { w: 1.3, d: 0.65 });
      const [cu, cv] = at(am, dep - 0.35); K.chair(cu, cv, y, outward, { seat: 'c:#2f4f6f' });
      const [mu, mv] = at(am, dep - 1.15); K.box(mu - 0.25, mu + 0.25, mv - 0.03, mv + 0.03, y + 0.76, y + 1.1, 'c:#1c1d20', { collide: false });
    }
  }
}

// ======================================================================================
// Joins to the Main Building spine (world frame): a link block from each spine end to the quad's face
// ======================================================================================
function link(kit, poly, ctx, { front, back, sign = null }) {
  // poly: world [x, z] corners (counter-clockwise or not) of the block's footprint; front/back z of the faces
  const D = (x0, x1, z0, z1, y0, y1, key) => kit.box(x0, x1, z0, z1, y0, y1, key, { collide: false });
  const sh = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
  for (const [y0, y1, key] of [[0, FL2 - 0.02, CREAM], [FL2 - 0.02, FL2, ROOF]]) {
    const g = new THREE.ExtrudeGeometry(sh, { depth: y1 - y0, bevelEnabled: false });
    g.rotateX(-Math.PI / 2); g.translate(0, y0, 0);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3, uv.getY(i) / 3);
    kit.mesh(g, key);
  }
  const xs = poly.map((p) => p[0]); const zs = poly.map((p) => p[1]);
  // colliders in 1 m strips along z, each as wide as the footprint is there
  const z0 = Math.min(...zs); const z1 = Math.max(...zs);
  const xAt = (z) => { const hits = []; for (let i = 0; i < poly.length; i++) { const a = poly[i]; const b = poly[(i + 1) % poly.length]; if ((a[1] <= z && b[1] > z) || (b[1] <= z && a[1] > z)) hits.push(a[0] + ((z - a[1]) / (b[1] - a[1])) * (b[0] - a[0])); } return hits.length ? [Math.min(...hits), Math.max(...hits)] : null; };
  for (let z = z0; z < z1 - 1e-6; z += 1) { const zb = Math.min(z1, z + 1); const p = xAt(z + 0.001); const q = xAt(zb - 0.001); if (!p || !q) continue; kit.col(Math.min(p[0], q[0]), Math.max(p[1], q[1]), z, zb, 0, FL2 + PAR); }
  // the faces along x (front and back): plinth, string-course, cornice, windows in relief, parapet band
  for (const [zf, sd] of [[front, 1], [back, -1]]) {
    const xr = xAt(zf + (sd > 0 ? -0.01 : 0.01)); if (!xr) continue;
    const [x0, x1] = xr; const F = (a, b, d0, d1, y0, y1, key) => D(a, b, Math.min(zf + sd * d0, zf + sd * d1), Math.max(zf + sd * d0, zf + sd * d1), y0, y1, key);
    F(x0, x1, 0, 0.07, 0, 0.6, PLINTH);
    F(x0, x1, 0, 0.08, FL1 - 0.3, FL1 - 0.15, MAROON);
    F(x0, x1, 0, 0.45, FL2 - 0.55, FL2 - 0.4, CREAM_C);
    F(x0, x1, 0, 0.05, FL2 + PAR - 0.2, FL2 + PAR - 0.12, MAROON);
    const nb = Math.max(1, Math.round((x1 - x0 - 1.5) / 3.4));
    for (let i = 0; i < nb; i++) {
      const a = x0 + 0.75 + ((i + 0.5) * (x1 - x0 - 1.5)) / nb;
      for (const [y, h] of [[1.1, 2.1], [FL1 + 1.0, 2.0]]) {
        F(a - 0.75, a + 0.75, 0, 0.04, y, y + h, GLASS);
        F(a - 0.84, a + 0.84, 0, 0.12, y - 0.1, y, TRIM); F(a - 0.84, a + 0.84, 0, 0.1, y + h, y + h + 0.09, TRIM);
        F(a - 0.84, a - 0.75, 0, 0.1, y, y + h, TRIM); F(a + 0.75, a + 0.84, 0, 0.1, y, y + h, TRIM); F(a - 0.03, a + 0.03, 0, 0.08, y, y + h, TRIM);
        F(a - 1.05, a + 1.05, 0, 0.5, y + h + 0.25, y + h + 0.35, CREAM_C);
      }
    }
    if (sign && sd > 0) kit.sign(sign, (x0 + x1) / 2, zf, FL1 - 1.1, [0, 1], { width: Math.min(3.4, x1 - x0 - 0.6), height: 0.34 });
    // parapet and coping along this face
    const xp = xAt(zf - sd * 0.3) || xr;
    F(Math.max(x0, xp[0]), Math.min(x1, xp[1]), -0.3, 0, FL2, FL2 + PAR, CREAM);
    F(Math.max(x0, xp[0]), Math.min(x1, xp[1]), -0.33, 0.04, FL2 + PAR, FL2 + PAR + 0.07, TRIM);
  }
  void xs;
}

// ======================================================================================
export default {
  id: 'fd2-fd3',
  name: 'Faculty Divisions II and III',
  category: 'academic',
  osm: ['Main Building (West Wing)', 'Main Building (East Wing)'],
  floors: 2,
  enabled: true,
  research: 'mixed',
  // the module's own kit is the world frame (the joins to the spine); each quad builds in its own Kit (subs)
  frame: () => ({ O: [0, 0], eu: [1, 0], ev: [0, 1], angle: 0, W: 0, L: 0 }),
  build(kit, ctx) {
    const { campus } = ctx;
    const subs = {};
    const built = {};
    for (const Q of QUADS) {
      const b = ctx.buildings.find((x) => x.name === Q.osm);
      if (!b || b.outer.length !== 4) throw new Error(`fd2-fd3: footprint ${Q.osm} is not the 4-corner outline this module was fitted to`);
      const K = new Kit(campus, kit.id, quadFrame(b.outer, Q.off, Q.WS, Q.L));
      const rooms = ctx.rooms.filter((r) => r.host === Q.osm);
      built[Q.key] = buildQuad(K, Q, { ...ctx, rooms });
      subs[Q.key] = K;
    }
    // ---- joins to the spine (only when the Main Building module replaces the plain FD-II block) ----
    if ((campus.activeModules || []).some((m) => m.id === 'main-building')) {
      const lab = campus.rooms?.sciencelab;
      const zF = lab && lab.host === 'FD-II' && lab.x1 < -27 ? lab.z1 : -56.3;
      const ZB = -69.5; const ZFRONT = zF + 3.3 + 0.45; // the spine's rear wall and its front parapet line
      const zOnFace = (K, u, z) => { // the point on the quad's face u = const at world z
        const p0 = K.world(u, 0); const p1 = K.world(u, 100);
        const t = (z - p0.z) / (p1.z - p0.z); return [p0.x + t * (p1.x - p0.x), z];
      };
      const K3 = subs.fd3; const Q3 = QUADS[0];
      const a3 = zOnFace(K3, Q3.W - 0.05, ZB + 0.05); const b3 = zOnFace(K3, Q3.W - 0.05, ZFRONT - 0.05);
      if (a3[0] < -69.95 && b3[0] < -69.9) link(kit, [a3, [-69.9, ZB + 0.05], [-69.9, ZFRONT - 0.05], b3], ctx, { front: ZFRONT - 0.05, back: ZB + 0.05 });
      const K2 = subs.fd2;
      const a2 = zOnFace(K2, 0.08, ZB + 0.05); const b2 = zOnFace(K2, 0.08, ZFRONT - 0.05);
      link(kit, [[39.55, ZB + 0.05], a2, b2, [39.55, ZFRONT - 0.05]], ctx, { front: ZFRONT - 0.05, back: ZB + 0.05, sign: 'FD-II' });
    }
    // ---- one module, three kits: the quads finish themselves; the module's kit speaks for all of them ----
    for (const K of Object.values(subs)) K.finish();
    const list = Object.values(subs);
    kit.subs = subs;
    kit.built = built;
    kit.zones = list.flatMap((K) => K.zones);
    kit.update = (dt, pos) => { for (const K of list) K.update(dt, pos); };
    kit.distance = (x, z) => Math.min(...list.map((K) => K.distance(x, z)));
    kit.roomAt = (x, z, y = 0) => { for (const K of list) { const r = K.roomAt(x, z, y); if (r) return r; } return null; };
    for (const K of list) {
      kit.entrances.push(...K.entrances);
      kit.navLinks.push(...K.navLinks);
      const tag = K === subs.fd3 ? 'fd3' : 'fd2';
      kit.stairs.push(...K.stairs.map((st) => ({ ...st, frame: tag })));
      kit.rooms.push(...K.rooms.map((r) => ({ ...r, frame: tag })));
      kit.floors.push(...K.floors);
      kit.sprites = [...(kit.sprites || []), ...(K.sprites || [])];
    }
  },
};
