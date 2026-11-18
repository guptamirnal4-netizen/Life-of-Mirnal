// Faculty Division I (FD-I): the two-storey 日-plan block south of the Library. Research: research/buildings/fd1.md
// (sections B-F) and research/review.md (5.0 m floor-to-floor for FD-I).
//
// Local frame (as in the research report): u metres along the north edge (east), v metres south, origin at the OSM
// NW corner (175, -149.9); the building is turned 6.0 degrees (the NE corner lies further north).
//
//   v   0 .. 9.8    north wing rooms 1108-1116 (labs below, classrooms 12xx above), corridor v 9.8 .. 14.4
//   v  14.4 .. 41   north courtyard (u 18 .. 86), west wing rooms u 2.3 .. 13 + corridor u 13 .. 18, east wing
//                   rooms u 89.5 .. 95.7 + corridor u 86 .. 89.5
//   v  41 .. 50     cross wing: an open pillared arcade on the ground floor from the west entrance hall to the east
//                   projection; classrooms above with a corridor on the north courtyard
//   v  50 .. 94.5   south courtyard
//   v  94.5 .. 110.75 south corridor and the south wing rooms 1127-1133; the gameplay room `staffroom` stays where
//                   placeRooms put it, in the SW corner block, closed off inside the block and entered by its own
//                   south door through the facade (as before).
//   east projection u 96 .. 109, v 39.5 .. 66.5 (missing from OSM): entrance hall, main stair, labs.
// Stairs: dog-legs at the NW and SW corners of the west wing, the SE corner and in the east projection (G 0 to F1
// 5.0). Roof at 10.0, parapet to 11.1, stair heads (mumties) and a few PV clusters on top.
//
// Layers: 'shell' (facades, slabs, roof, corridor fronts, pillars) and interior zones per wing and floor
// ('N0', 'N1', 'W0', 'W1', 'S0', 'S1', 'E0', 'E1', 'X0', 'X1', 'P0', 'P1') with partitions, furniture and lights.
//
// The helpers exported at the top are shared with workshops.js.
import * as THREE from 'three';

// ---------- shared helpers ----------
export function canvasTexture(w, h, paint, { repeat = false, alphaTest = 0, doubleSide = false } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.userData = { alphaTest, doubleSide, transparent: false };
  return t;
}

// One texture holding many short labels (room plates): cell i of a cols x rows grid. Use plate() to show a cell.
export function plateAtlas(labels, { cols = 4, cw = 256, ch = 64, bg = '#2f3b46', fg = '#f4efe2', sub = '#c9d3da' } = {}) {
  const rows = Math.ceil(labels.length / cols);
  const t = canvasTexture(cols * cw, rows * ch, (g) => {
    labels.forEach((lab, i) => {
      const x = (i % cols) * cw; const y = Math.floor(i / cols) * ch;
      const [a, b] = Array.isArray(lab) ? lab : [lab, ''];
      g.fillStyle = bg; g.fillRect(x + 2, y + 2, cw - 4, ch - 4);
      g.strokeStyle = fg; g.lineWidth = 2; g.strokeRect(x + 5, y + 5, cw - 10, ch - 10);
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `bold ${b ? 26 : 34}px Arial, sans-serif`;
      g.fillText(a, x + cw / 2, y + (b ? ch * 0.36 : ch / 2));
      if (b) { g.fillStyle = sub; let s = 17; do { g.font = `${s}px Arial, sans-serif`; s -= 1; } while (g.measureText(b).width > cw - 16 && s > 9); g.fillText(b, x + cw / 2, y + ch * 0.72); }
    });
  });
  t.userData.cells = { cols, rows };
  return t;
}

// A vertical plate facing [du, dv] showing atlas cell i (texture registered as kit.texture(name)).
export function plate(kit, name, i, u, v, y, w, h, [du, dv]) {
  const { cols, rows } = kit.textures[name].userData.cells;
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  const c = i % cols; const r = Math.floor(i / cols);
  for (let k = 0; k < uv.count; k++) uv.setXY(k, (c + uv.getX(k)) / cols, 1 - (r + 1 - uv.getY(k)) / rows);
  g.rotateY(Math.atan2(du, dv));
  g.translate(u + du * 0.02, y + h / 2, v + dv * 0.02);
  kit.geo(`x:${name}`, g);
}

// A ceiling: a horizontal plane at y facing down.
export function ceiling(kit, u0, u1, v0, v1, y, key) {
  const g = new THREE.PlaneGeometry(u1 - u0, v1 - v0);
  g.rotateX(Math.PI / 2);
  g.translate((u0 + u1) / 2, y, (v0 + v1) / 2);
  kit.geo(key, g);
}

// A thin bar (truss member, rod, rail) between two local points [u, y, v].
export function bar(kit, a, b, t, key, tz = t) {
  const A = new THREE.Vector3(a[0], a[1], a[2]); const B = new THREE.Vector3(b[0], b[1], b[2]);
  const len = A.distanceTo(B);
  if (len < 1e-3) return;
  const g = new THREE.BoxGeometry(t, len, tz);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  g.applyQuaternion(q);
  g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  kit.geo(key, g);
}

// A flat quad through four local points [u, y, v] (counter-clockwise seen from the side it faces).
export function quad(kit, p, key, { both = false, tile = 0 } = {}) {
  const g = new THREE.BufferGeometry();
  const pos = []; const uv = [];
  const tri = (a, b, c) => { for (const q of [a, b, c]) pos.push(...p[q]); };
  tri(0, 1, 2); tri(0, 2, 3);
  if (both) { tri(0, 2, 1); tri(0, 3, 2); }
  // world-ish UVs along the first edge and the second
  const e1 = new THREE.Vector3(...p[1]).sub(new THREE.Vector3(...p[0])); const e2 = new THREE.Vector3(...p[3]).sub(new THREE.Vector3(...p[0]));
  const L1 = e1.length() / (tile || 1); const L2 = e2.length() / (tile || 1);
  const uvq = [[0, 0], [L1, 0], [L1, L2], [0, L2]];
  const tuv = (a, b, c) => { for (const q of [a, b, c]) uv.push(...uvq[q]); };
  tuv(0, 1, 2); tuv(0, 2, 3);
  if (both) { tuv(0, 2, 1); tuv(0, 3, 2); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  kit.geo(key, g);
}

// Tools for one straight wall line: axis 'u' or 'v' (the direction it runs), c its centre line, out (+1 or -1) the
// outward side. s is the position along the wall, d the offset outward from the centre line.
export function line(kit, axis, c, out) {
  const P = (s, d) => (axis === 'u' ? [s, c + out * d] : [c + out * d, s]);
  const self = {
    axis, c, out,
    P,
    box(s0, s1, d0, d1, y0, y1, key, opts = { collide: false }) {
      const [a0, b0] = P(s0, d0); const [a1, b1] = P(s1, d1);
      kit.box(Math.min(a0, a1), Math.max(a0, a1), Math.min(b0, b1), Math.max(b0, b1), y0, y1, key, opts);
    },
    // vertical plane at offset d, facing outward (+1) or inward (-1)
    plane(s, d, y, w, h, key, face = 1) {
      const [u, v] = P(s, d);
      kit.plane(u, v, y, w, h, axis === 'u' ? [0, out * face] : [out * face, 0], key, { offset: 0 });
    },
    wall(s0, s1, y0, y1, key, thick, openings = [], collide = true) {
      const rel = openings.map((o) => ({ ...o, at: o.at - s0 }));
      if (axis === 'u') kit.wall(s0, c, s1, c, y0, y1, key, { thick, openings: rel, collide });
      else kit.wall(c, s0, c, s1, y0, y1, key, { thick, openings: rel, collide });
    },
    dir: axis === 'u' ? [0, out] : [out, 0],
  };
  return self;
}

// A glazed window in an opening of a wall line L (thick t): outer pane (reflective) facing out, inner pane (light)
// facing in, a timber frame with two mullions and a transom, and a stone sill outside.
export function glaze(L, s, w, y, h, t, { out = 'm:#4f616c', inn = 'c:#dbe7ec', frame = 'c:#6a4f36', sill = 'c:#d8cbb0', recess = 0.1, transom = 0.72, mull = 2 } = {}) {
  const d = t / 2 - recess;
  L.plane(s, d, y, w, h, out, 1);
  L.plane(s, d - 0.03, y, w, h, inn, -1);
  const f = 0.06;
  L.box(s - w / 2, s + w / 2, d - 0.05, d + 0.03, y + h - f, y + h, frame);
  L.box(s - w / 2, s + w / 2, d - 0.05, d + 0.03, y, y + f, frame);
  L.box(s - w / 2, s + w / 2, d - 0.05, d + 0.03, y + h * transom - f / 2, y + h * transom + f / 2, frame);
  for (let k = 0; k <= mull + 1; k++) { const x = s - w / 2 + (w * k) / (mull + 1); L.box(x - f / 2, x + f / 2, d - 0.05, d + 0.03, y, y + h, frame); }
  if (sill) L.box(s - w / 2 - 0.08, s + w / 2 + 0.08, t / 2 - 0.02, t / 2 + 0.07, y - 0.06, y, sill);
}

// Register an extra footprint (not in the OSM data) with the campus, so trees, lamp posts and people keep out of it
// and the plain-block builder leaves it alone. poly is world [[x, z], ...].
export function addFootprint(campus, name, poly, h, moduleId) {
  const xs = poly.map((p) => p[0]); const zs = poly.map((p) => p[1]);
  const bb = { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
  const b = { name, kind: 'academic', h, outer: poly, holes: [], inCampus: true, bb, module: moduleId, extra: true };
  campus.buildings.push(b);
  if (campus.buildingGrid) campus.gridInsert(campus.buildingGrid, bb, b, 40);
  return b;
}

// A tube light hung on two rods from the ceiling at height ceil, `drop` metres below it.
export function rodLight(kit, u, v, ceil, drop, dir = [1, 0], rod = 'c:#8d9296') {
  const y = ceil - drop;
  kit.tubeLight(u, v, y, dir);
  if (drop > 0.05) for (const s of [-0.45, 0.45]) kit.box(u + dir[0] * s - 0.01, u + dir[0] * s + 0.01, v + dir[1] * s - 0.01, v + dir[1] * s + 0.01, y, ceil, rod, { collide: false });
}

// ---------- FD-I ----------
const DEG = Math.PI / 180;
const ROT = 6.0 * DEG;
const ORIGIN = [175, -149.9];
const FH = 5.0; // floor to floor (review.md)
const F1 = FH; // first floor
const R = 2 * FH; // roof
const PAR = 1.1; // parapet
const U0 = 2; const U1 = 96; const V0 = 0; const V1 = 110.75; // outer faces
const FT = 0.3; // facade thickness
const IT = 0.25; // interior walls
const GY = 0.03; // ground floor finish
// courtyards (the OSM holes in this frame)
const CN = { u0: 18, u1: 86, v0: 14.4, v1: 41 };
const CS = { u0: 18, u1: 86, v0: 50, v1: 94.5 };
// east projection
const PU1 = 109; const PV0 = 39.5; const PV1 = 66.5;

const K = {
  cream: 't:plaster:#efe4cc', band: 'c:#d9c49b', plinth: 't:concrete:#bba585', trim: 'c:#f3ecdc', coping: 'c:#e6dcc6',
  slab: 'c:#ece7dc', ceil: 'c:#f2efe7', floor: 't:terrazzo:#b9bcb0', floor1: 't:terrazzo:#c9c3b4', corridor: 't:terrazzo:#c8c0ae',
  inwall: 't:plaster:#f1ebdc', dado: 'c:#b7a888', door: 't:wood:#8a6a4a', frame: 'c:#5c4330', roof: 't:concrete:#c9c1b2',
  pv: 'm:#26355c', pvFrame: 'm:#9aa1a6', steel: 'm:#7d858c', tank: 'c:#2a2c2e', grass: 't:grass:#8fb35e', path: 't:paving:#cbbfa8',
  bench: 't:wood:#8f6f4b', black: 'c:#1f2224', cab: 'c:#e8ebe8', blue: 'm:#2f5d9e', green: 'c:#3f6b4a', grey: 'm:#8b9096',
  board: 'c:#22302a', boardFrame: 'c:#6b5a43', screen: 'e:#eef3f6', red: 'c:#9b2b25', water: 'c:#5d8fa8', sheet: 'm:#a7adb0',
  glassIn: 'g:#cfe0ea', sign: 'c:#7a2622', pillar: 't:plaster:#eadfc6', monitor: 'c:#16191c', yellow: 'c:#d9a521',
};

// rooms and spaces, by band: [start, end, id, name, type] (positions are wall centre lines along the band)
function bands(stf) {
  const e0 = stf.u0; const e1 = stf.u1; // staff room enclosure (u)
  const nW = (95.7 - 18) / 9;
  const north = Array.from({ length: 9 }, (_, i) => [18 + i * nW, 18 + (i + 1) * nW, String(8 + i).padStart(2, '0')]);
  const sW = (95.7 - e1) / 7;
  const south = Array.from({ length: 7 }, (_, i) => [e1 + i * sW, e1 + (i + 1) * sW, String(33 - i)]);
  return {
    west: [[0.3, 9.8, 'office'], [9.8, 14.4, 'stairNW'], [14.4, 27.7, '07'], [27.7, 41, '06'], [41, 50, 'hall'], [50, 59.4, '05'], [59.4, 68.8, '04'], [68.8, 78.2, '03'], [78.2, 87.6, '02'], [87.6, 92.4, 'stairSW'], [92.4, 98.5, 'lobbySW']],
    north,
    east: [[9.8, 17.6, '17'], [17.6, 25.4, '18'], [25.4, 33.2, '19'], [33.2, 41, '20'], [41, 50, 'passage'], [50, 61, '21'], [61, 72, '22'], [72, 83, '23'], [83, 94.1, '24'], [94.1, 98.5, 'stairSE']],
    south: [[2.3, e0, '01'], [e0, e1, 'staff'], ...south],
    cross: [[18, 40.7, '25'], [40.7, 63.3, '26'], [63.3, 86, '34']],
  };
}

// what the ground-floor rooms are (timetables, research C); the first floor is classrooms
const LABS = {
  '02': ['Concrete Lab', 'civil'], '03': ['Structures Lab', 'civil'], '04': ['Transportation Lab', 'lab'], '05': ['Environmental Lab', 'lab'],
  '06': ['Water Resources Lab', 'hyd'], '07': ['Drawing Hall', 'drawing'], '08': ['Process Control Lab', 'chem'], '09': ['Heat Transfer Lab', 'lab'],
  10: ['Mass Transfer Lab', 'lab'], 11: ['Fluid Mechanics Lab', 'hyd'], 12: ['CE Practical Lab', 'civil'], 13: ['Geotechnical Lab', 'soil'],
  14: ['Hydraulics Lab', 'hyd'], 15: ['Reaction Engg Lab', 'chem'], 16: ['Unit Operations Lab', 'lab'], 17: ['Chemical Engg Lab I', 'chem'],
  18: ['Instrumentation Lab', 'lab'], 19: ['Soil Mechanics Lab', 'soil'], 20: ['Highway Materials Lab', 'civil'], 21: ['Pilot Plant', 'lab'],
  22: ['Thermodynamics Lab', 'lab'], 23: ['Polymer Lab', 'chem'], 24: ['Civil Engg Materials Lab', 'civil'], 27: ['Surveying Lab', 'survey'],
  28: ['GIS Lab', 'gis'], 29: ['Chemical Engg Lab II', 'chem'], 30: ['Environmental Engg Lab', 'lab'], 31: ['Computational Lab', 'gis'],
  32: ['Transport Lab', 'lab'], 33: ['Building Materials Lab', 'civil'], '01': ['Store', 'store'],
};

export default {
  id: 'fd1',
  name: 'Faculty Division I (FD-I)',
  category: 'academic',
  osm: ['Faculty Division I (FD-I)'],
  floors: 2,
  enabled: true,
  research: 'mixed',
  frame() {
    const ev = [Math.sin(ROT), Math.cos(ROT)];
    return { O: ORIGIN, eu: [ev[1], -ev[0]], ev, angle: Math.atan2(ev[0], ev[1]) };
  },
  build(kit, ctx) { buildFD1(kit, ctx); },
};

function buildFD1(kit, ctx) {
  const campus = ctx.campus;
  const room = ctx.rooms.find((r) => r.id === 'staffroom');
  // the staff room (world-aligned) seen in this frame: its local box, its door on the south facade
  let stf;
  if (room) {
    const cs = [[room.x0, room.z0], [room.x1, room.z0], [room.x1, room.z1], [room.x0, room.z1]].map(([x, z]) => kit.local(x, z));
    const us = cs.map((p) => p[0]); const vs = cs.map((p) => p[1]);
    stf = { u0: Math.min(...us) - 0.25, u1: Math.max(...us) + 0.25, v0: Math.min(...vs), v1: Math.max(...vs), door: kit.local(room.door.at, room.z1)[0] };
    if (stf.v1 + 0.12 > V1 - FT) console.warn('[fd1] staff room reaches past the south facade', stf.v1);
  } else stf = { u0: 6.45, u1: 15.75, v0: 99.5, v1: 110.3, door: 10.6 };
  const B = bands(stf);

  // ---------- textures ----------
  const plates = [];
  const plateIdx = {};
  const addPlate = (key, lab) => { plateIdx[key] = plates.length; plates.push(lab); };
  for (const f of [1, 2]) {
    for (const band of ['west', 'north', 'east', 'south', 'cross']) {
      for (const [, , id] of B[band]) {
        if (!/^\d\d$/.test(id)) continue;
        if (band === 'cross' && f === 1) continue;
        const num = `${f === 1 ? 11 : 12}${id}`;
        const lab = f === 1 ? LABS[id] || LABS[+id] : null;
        addPlate(num, [num, lab ? lab[0] : 'Lecture Room']);
      }
    }
  }
  addPlate('1125', ['1125', 'Process Equipment Lab']); addPlate('1126', ['1126', 'Fuel Testing Lab']);
  addPlate('1235', ['1235', 'Seminar Room']); addPlate('1236', ['1236', 'Seminar Hall']); addPlate('1201', ['1201', 'Store']);
  addPlate('office', ['FD-I Office', 'Faculty Division I']); addPlate('1237', ['1237', 'Faculty Chambers']);
  kit.texture('fd1plates', () => plateAtlas(plates, { cols: 8, cw: 256, ch: 64 }));

  // ---------- helpers ----------
  const zoneOf = (band, f) => ({ west: 'W', north: 'N', east: 'E', south: 'S', cross: 'X', proj: 'P' }[band] + f);
  const floorY = (f) => (f === 0 ? 0 : F1);
  const L = (axis, c, out) => line(kit, axis, c, out);

  // ===================== SHELL =====================
  // ---- facades ----
  // segments along each facade (partition lines) decide where windows go; doors are listed per floor
  const westCuts = [0, 9.8, 14.4, 27.7, 41, 50, 59.4, 68.8, 78.2, 87.6, 92.4, 98.5, V1];
  const northCuts = [U0, 13, 18, ...B.north.map((r) => r[1])];
  const eastCuts = [0, 9.8, 17.6, 25.4, 33.2, 41, 50, 61, 72, 83, 94.1, 98.5, V1];
  const southCuts = [U0, stf.u0, stf.u1, ...B.south.slice(2).map((r) => r[1])];
  const sides = {
    N: { L: L('u', V0 + FT / 2, -1), s0: U0, s1: U1, cuts: northCuts },
    S: { L: L('u', V1 - FT / 2, 1), s0: U0, s1: U1, cuts: southCuts },
    W: { L: L('v', U0 + FT / 2, -1), s0: V0 + FT, s1: V1 - FT, cuts: westCuts },
    E: { L: L('v', U1 - FT / 2, 1), s0: V0 + FT, s1: V1 - FT, cuts: eastCuts },
  };
  const doors = {
    W0: [{ at: 45.5, width: 4.2, top: 3.4, main: true }, { at: 95.4, width: 2.2, top: 2.8 }],
    N0: [{ at: 15.5, width: 2.2, top: 2.8 }],
    S0: [{ at: stf.door, width: 2.9, top: 2.8, staff: true }],
    E0: [{ at: 45.5, width: 7.6, top: 3.8, inner: true }],
    E1: [{ at: 45.5, width: 7.6, top: 3.6, inner: true }],
  };
  const blank = { S0: [[stf.u0, stf.u1]], E0: [[PV0, PV1]], E1: [[PV0, PV1]] };
  for (const [name, sd] of Object.entries(sides)) {
    for (const f of [0, 1]) {
      const y0 = floorY(f);
      const ds = doors[`${name}${f}`] || [];
      const bl = blank[`${name}${f}`] || [];
      const wins = [];
      const cuts = sd.cuts.filter((x) => x >= sd.s0 - 0.01 && x <= sd.s1 + 0.01);
      for (let i = 0; i < cuts.length - 1; i++) {
        const a = Math.max(cuts[i], sd.s0); const b = Math.min(cuts[i + 1], sd.s1);
        const len = b - a;
        if (len < 2.2) continue;
        const n = Math.max(1, Math.floor((len - 0.4) / 3.2));
        const sp = len / n; const w = Math.min(2.1, sp - 1.1);
        for (let k = 0; k < n; k++) {
          const s = a + sp * (k + 0.5);
          if (ds.some((d) => Math.abs(d.at - s) < d.width / 2 + w / 2 + 0.4)) continue;
          if (bl.some(([p, q]) => s + w / 2 > p - 0.3 && s - w / 2 < q + 0.3)) continue;
          const stairWin = f === 0 && ((name === 'W' && (a === 9.8 || a === 87.6)) || (name === 'E' && a === 94.1));
          wins.push(stairWin ? { at: s, width: Math.min(w, 1.4), bottom: 3.0, top: 4.5 } : { at: s, width: w, bottom: 1.0, top: 3.1 });
        }
      }
      const openings = [...wins, ...ds.map((d) => ({ at: d.at, width: d.width, bottom: 0, top: d.top }))];
      sd.L.wall(sd.s0, sd.s1, y0, y0 + FH, K.cream, FT, openings);
      for (const o of wins) glaze(sd.L, o.at, o.width, y0 + o.bottom, o.top - o.bottom, FT, { frame: K.frame });
      // chajja (sunshade) over each window row, the floor band and the plinth
      sd.L.box(sd.s0 - (name === 'W' || name === 'E' ? FT : 0), sd.s1 + (name === 'W' || name === 'E' ? FT : 0), FT / 2, FT / 2 + 0.55, y0 + 3.3, y0 + 3.42, K.band);
      if (f === 1) sd.L.box(sd.s0, sd.s1, FT / 2 - 0.01, FT / 2 + 0.07, F1 - 0.3, F1 + 0.15, K.band);
      if (f === 0) {
        // plinth, broken at the doors
        let s = sd.s0;
        for (const d of [...ds].sort((p, q) => p.at - q.at)) { sd.L.box(s, d.at - d.width / 2, FT / 2 - 0.01, FT / 2 + 0.05, 0, 0.55, K.plinth); s = d.at + d.width / 2; }
        sd.L.box(s, sd.s1, FT / 2 - 0.01, FT / 2 + 0.05, 0, 0.55, K.plinth);
      }
      // door leaves and reveals
      for (const d of ds) {
        if (d.inner) continue;
        if (d.staff) continue;
        const [du, dv] = sd.L.dir;
        const [u, v] = sd.L.P(d.at, 0);
        const alongU = sd.L.axis === 'u';
        const leaves = d.main ? 2 : 1;
        for (let k = 0; k < leaves; k++) {
          const wl = d.width / leaves;
          kit.door(alongU, (alongU ? u : v) - d.width / 2 + wl * (k + 0.5), alongU ? v : u, y0, wl - 0.1, { height: d.top - 0.05, thick: FT, side: -sd.L.out, frame: K.frame, leaf: K.door });
        }
        // the canopy over it
        const ext = d.main ? 3.2 : 1.4;
        sd.L.box(d.at - d.width / 2 - 0.6, d.at + d.width / 2 + 0.6, FT / 2, FT / 2 + ext, d.top + 0.25, d.top + 0.45, K.trim);
        sd.L.box(d.at - d.width / 2 - 0.6, d.at + d.width / 2 + 0.6, FT / 2 + ext - 0.08, FT / 2 + ext, d.top + 0.05, d.top + 0.45, K.band);
        void du; void dv;
      }
    }
    // pilasters at the partition lines, full height, and the cornice and parapet
    for (const x of sd.cuts) if (x > sd.s0 + 0.5 && x < sd.s1 - 0.5) sd.L.box(x - 0.3, x + 0.3, FT / 2 - 0.01, FT / 2 + 0.12, 0.55, R, K.trim);
    sd.L.box(sd.s0 - (name === 'W' || name === 'E' ? FT : 0), sd.s1 + (name === 'W' || name === 'E' ? FT : 0), FT / 2 - 0.01, FT / 2 + 0.35, R - 0.15, R + 0.12, K.trim);
    sd.L.box(sd.s0, sd.s1, -FT / 2, FT / 2, R, R + PAR, K.cream);
    sd.L.box(sd.s0, sd.s1, -FT / 2 - 0.05, FT / 2 + 0.05, R + PAR, R + PAR + 0.08, K.coping);
  }
  // stepped-up parapets at the four corners and over the main entrance
  const step = (u0, u1, v0, v1) => {
    kit.box(u0, u1, v0, v1, R + PAR + 0.08, R + PAR + 0.7, K.cream, { collide: false });
    kit.box(u0 - 0.05, u1 + 0.05, v0 - 0.05, v1 + 0.05, R + PAR + 0.7, R + PAR + 0.78, K.coping, { collide: false });
  };
  for (const [cu, cv, su, sv] of [[U0, V0, 1, 1], [U1, V0, -1, 1], [U0, V1, 1, -1], [U1, V1, -1, -1]]) {
    step(Math.min(cu, cu + su * 7), Math.max(cu, cu + su * 7), Math.min(cv, cv + sv * FT), Math.max(cv, cv + sv * FT));
    step(Math.min(cu, cu + su * FT), Math.max(cu, cu + su * FT), Math.min(cv + sv * FT, cv + sv * 7), Math.max(cv + sv * FT, cv + sv * 7));
  }
  step(U0, U0 + FT, 40, 51);

  // ---- main west entrance: porch with four columns and the name on the fascia ----
  {
    const pu0 = U0 - 3.4; const pv0 = 40.8; const pv1 = 50.2;
    kit.box(pu0, U0, pv0, pv1, 0, 0.15, K.plinth, { walkable: true });
    for (const v of [41.3, 44.2, 46.8, 49.7]) kit.box(pu0 + 0.15, pu0 + 0.65, v - 0.25, v + 0.25, 0.15, 4.3, K.pillar, { collide: true });
    kit.box(pu0 - 0.1, U0, pv0 - 0.1, pv1 + 0.1, 4.3, 4.55, K.trim, { collide: false });
    kit.box(pu0 - 0.15, pu0 + 0.05, pv0 - 0.1, pv1 + 0.1, 4.0, 4.9, K.band, { collide: false });
    kit.sign('FACULTY DIVISION  I', pu0 - 0.16, 45.5, 4.1, [-1, 0], { width: 7.4, height: 0.7, bg: '#8a2b24', fg: '#f6ecd2', font: 'bold 70px Georgia, serif' });
    ceiling(kit, pu0, U0, pv0, pv1, 4.29, K.ceil);
    kit.entrance('West main entrance', pu0 - 1.5, 45.5, [-1, 0]);
  }
  kit.entrance('NW corner door', 15.5, V0 - 1.6, [0, -1]);
  kit.entrance('SW corner door', U0 - 1.6, 95.4, [-1, 0]);
  if (room) { const [u, v] = kit.local(room.exit.x, room.exit.z); kit.entrance('Staff room door', u, v, [0, 1]); }

  // ---- slabs, ceilings, roof ----
  const yard = [CN, CS];
  // stairs (dog-legs, G to F1): built in the shell so their walls show from the courtyards
  const stairKey = 't:terrazzo:#bdb6a6';
  const holes = [];
  holes.push(kit.dogleg(2.3, 13 - 0.125, 9.8 + 0.125, 14.4 - 0.125, 0, F1, { along: 'u', reverse: true, key: stairKey, rail: K.steel, wall: null, name: 'NW stair' }));
  holes.push(kit.dogleg(2.3, 13 - 0.125, 87.6 + 0.125, 92.4 - 0.125, 0, F1, { along: 'u', reverse: true, key: stairKey, rail: K.steel, wall: null, name: 'SW stair' }));
  holes.push(kit.dogleg(89.5 + 0.125, U1 - FT, 94.1 + 0.125, 98.5 - 0.125, 0, F1, { along: 'u', key: stairKey, rail: K.steel, wall: null, name: 'SE stair' }));
  holes.push(kit.dogleg(104.2, PU1 - FT, 53.3, 61.3, 0, F1, { along: 'v', key: stairKey, rail: K.steel, wall: null, name: 'East projection stair' }));
  // ground floor finish (no collider: you walk on the ground), first floor (walkable), roof
  const stfHole = { u0: stf.u0, u1: stf.u1, v0: 98.5, v1: V1 - FT };
  kit.slab(U0 + FT, U1 - FT, V0 + FT, V1 - FT, GY, K.floor, { thick: 0.08, holes: [...yard, stfHole], walkable: false, collide: false });
  kit.slab(U1 - FT, PU1 - FT, PV0 + FT, PV1 - FT, GY, K.floor, { thick: 0.08, walkable: false, collide: false });
  kit.slab(U0 + FT, U1 - FT, V0 + FT, V1 - FT, F1, K.slab, { thick: 0.2, holes: [...yard, ...holes.slice(0, 3)] });
  kit.slab(U1 - FT, PU1 - FT, PV0 + FT, PV1 - FT, F1, K.slab, { thick: 0.2, holes: [holes[3]] });
  // floor finish on the first floor (a few mm over the slab) and the ceilings under the slabs
  kit.slab(U0 + FT, U1 - FT, V0 + FT, V1 - FT, F1 + 0.012, K.floor1, { thick: 0.01, holes: [...yard, ...holes.slice(0, 3)], walkable: false, collide: false });
  kit.slab(U1 - FT, PU1 - FT, PV0 + FT, PV1 - FT, F1 + 0.012, K.floor1, { thick: 0.01, holes: [holes[3]], walkable: false, collide: false });
  kit.slab(U0 + FT, U1 - FT, V0 + FT, V1 - FT, R, K.roof, { thick: 0.25, holes: yard, walkable: false, collide: false });
  kit.slab(U1 - FT, PU1 - FT, PV0 + FT, PV1 - FT, R, K.roof, { thick: 0.25, walkable: false, collide: false });
  // ceilings (light plaster) just under the slabs, ground and first floor
  for (const y of [F1 - 0.2 - 0.005, R - 0.25 - 0.005]) {
    const cut = (u0, u1, v0, v1, hs) => {
      // ceiling strips outside the holes (rectangle minus holes, by v bands)
      const vs = [...new Set([v0, v1, ...hs.flatMap((h) => [h.v0, h.v1])])].filter((x) => x >= v0 && x <= v1).sort((a, b) => a - b);
      for (let j = 0; j < vs.length - 1; j++) {
        const vm = (vs[j] + vs[j + 1]) / 2;
        const inH = hs.filter((h) => vm > h.v0 && vm < h.v1).sort((a, b) => a.u0 - b.u0);
        let s = u0;
        for (const h of inH) { if (h.u0 > s) ceiling(kit, s, h.u0, vs[j], vs[j + 1], y, K.ceil); s = Math.max(s, h.u1); }
        if (u1 > s) ceiling(kit, s, u1, vs[j], vs[j + 1], y, K.ceil);
      }
    };
    const hs = y < F1 ? [...yard, ...holes.slice(0, 3), stfHole] : yard;
    cut(U0 + FT, U1 - FT, V0 + FT, V1 - FT, hs);
    cut(U1 - FT, PU1 - FT, PV0 + FT, PV1 - FT, y < F1 ? [holes[3]] : []);
  }

  // ---- courtyard fronts: pillars, edge beams, first-floor parapets, roof parapets ----
  const edges = [];
  for (const C of yard) {
    edges.push({ axis: 'u', c: C.v0, s0: C.u0, s1: C.u1, out: 1, wall: C === CS }); // north edge of the court; the court is to +v
    edges.push({ axis: 'u', c: C.v1, s0: C.u0, s1: C.u1, out: -1 });
    edges.push({ axis: 'v', c: C.u0, s0: C.v0, s1: C.v1, out: 1 });
    edges.push({ axis: 'v', c: C.u1, s0: C.v0, s1: C.v1, out: 1 * -1 });
  }
  for (const e of edges) {
    const Le = L(e.axis, e.c, e.out); // out points into the court
    const len = e.s1 - e.s0; const n = Math.max(2, Math.round(len / 3.6)); const sp = len / n;
    const P = 0.5;
    for (let k = 0; k <= n; k++) {
      const s = e.s0 + k * sp;
      const a = Math.max(e.s0 - P / 2, s - P / 2); const b = a + P;
      Le.box(a, b, -P, 0, 0, F1 - 0.2, K.pillar, { collide: true });
      Le.box(a, b, -P, 0, F1, R - 0.25, K.pillar, { collide: true });
      Le.box(a - 0.06, b + 0.06, -P - 0.06, 0.06, 0, 0.35, K.plinth); // pillar base
    }
    // deep edge beams under each slab, the first-floor parapet with a cap, and the roof parapet
    Le.box(e.s0 - P / 2, e.s1 + P / 2, -P, 0.02, F1 - 0.75, F1, K.trim);
    Le.box(e.s0 - P / 2, e.s1 + P / 2, -P, 0.02, R - 0.75, R + 0.1, K.trim);
    if (!e.wall) {
      Le.box(e.s0, e.s1, -0.35, -0.15, F1, F1 + 1.0, K.cream, { collide: true });
      Le.box(e.s0, e.s1, -0.4, -0.1, F1 + 1.0, F1 + 1.07, K.coping);
    }
    Le.box(e.s0, e.s1, -0.35, -0.15, R, R + 0.9, K.cream);
    Le.box(e.s0, e.s1, -0.4, -0.1, R + 0.9, R + 0.97, K.coping);
  }
  // cross-wing middle row of pillars (ground floor), under the first-floor corridor wall
  for (let k = 1; k < 19; k++) { const u = CN.u0 + (k * (CN.u1 - CN.u0)) / 19; kit.box(u - 0.25, u + 0.25, 44.5 - 0.25, 44.5 + 0.25, 0, F1 - 0.2, K.pillar); }

  // ---- courtyards: lawn, paths, the well platform in the north court, the pump room in the south court ----
  for (const C of yard) {
    kit.box(C.u0 + 0.05, C.u1 - 0.05, C.v0 + 0.05, C.v1 - 0.05, -0.05, 0.03, K.grass, { collide: false });
    const um = (C.u0 + C.u1) / 2; const vm = (C.v0 + C.v1) / 2;
    kit.box(um - 1.2, um + 1.2, C.v0 + 0.05, C.v1 - 0.05, -0.05, 0.05, K.path, { collide: false });
    kit.box(C.u0 + 0.05, C.u1 - 0.05, vm - 1.2, vm + 1.2, -0.04, 0.045, K.path, { collide: false });
  }
  kit.cyl(66, 30, 0, 2.2, 0.55, K.plinth, { seg: 20, collide: true });
  kit.cyl(66, 30, 0.55, 1.6, 0.06, K.coping, { seg: 20 });
  kit.box(78.5, 85.4, 87.5, 94.0, 0, 3.0, K.cream, { collide: true });
  kit.box(78.3, 85.6, 87.3, 94.2, 3.0, 3.2, K.trim, { collide: false });
  kit.box(80.5, 82.0, 87.45, 87.5, 0, 2.1, K.door, { collide: false });

  // ---- the SHED in front of the west half of the south wing (plan) ----
  {
    const s0 = stf.u1 + 3; const s1 = s0 + 20; const v0 = V1; const v1 = V1 + 4.2;
    for (let s = s0; s <= s1 + 0.01; s += 4) kit.box(s - 0.08, s + 0.08, v1 - 0.16, v1, 0, 2.7, K.steel, { collide: true });
    for (let s = s0; s < s1 - 0.01; s += 4) { bar(kit, [s, 0.2, v1 - 0.08], [s + 4, 2.5, v1 - 0.08], 0.05, K.steel); bar(kit, [s + 4, 0.2, v1 - 0.08], [s, 2.5, v1 - 0.08], 0.05, K.steel); }
    quad(kit, [[s0 - 0.3, 3.6, v0], [s1 + 0.3, 3.6, v0], [s1 + 0.3, 2.75, v1 + 0.4], [s0 - 0.3, 2.75, v1 + 0.4]].map(([u, y, v]) => [u, y, v]), K.sheet, { both: true });
    kit.box(s0 + 1, s0 + 7, v0 + 0.4, v0 + 2.0, 0, 1.2, 't:wood:#7a5a3c', { collide: true }); // stacked timber
    kit.box(s0 + 9, s0 + 12, v0 + 0.5, v0 + 3.2, 0, 1.5, K.grey, { collide: true }); // a mixer / old machine
    kit.cyl(s0 + 15, v0 + 2, 0, 0.6, 1.2, K.blue, { seg: 12, collide: true });
  }

  // ---- roof: stair heads, water tanks, PV clusters ----
  for (const h of [{ u0: 2.3, u1: 12.9, v0: 9.9, v1: 14.3 }, { u0: 2.3, u1: 12.9, v0: 87.7, v1: 92.3 }, { u0: 89.6, u1: U1 - FT, v0: 94.2, v1: 98.4 }, { u0: 104.2, u1: PU1 - FT, v0: 53.3, v1: 61.3 }]) {
    kit.box(h.u0, h.u1, h.v0, h.v1, R, R + 2.9, K.cream, { collide: false });
    kit.box(h.u0 - 0.2, h.u1 + 0.2, h.v0 - 0.2, h.v1 + 0.2, R + 2.9, R + 3.1, K.trim, { collide: false });
    for (const [u, v] of [[h.u0 + 1.2, (h.v0 + h.v1) / 2], [h.u1 - 1.2, (h.v0 + h.v1) / 2]]) kit.cyl(u, v, R + 3.1, 0.75, 1.5, K.tank, { seg: 14 });
  }
  const pvAt = [[30, 3.5, 8], [56, 3.5, 8], [30, 101.5, 8], [62, 101.5, 8], [40, 45.5, 10], [92.5, 26, 0], [92.5, 70, 0], [7.5, 62, 0]];
  for (const [u, v, n] of pvAt) {
    const along = n > 0; const cnt = along ? n : 6;
    for (let k = 0; k < cnt; k++) {
      const [pu, pv] = along ? [u + k * 1.7, v] : [u, v + k * 1.7];
      // a tilted panel facing south (+v) on two legs
      quad(kit, [[pu - 0.8, R + 0.45, pv - 0.9], [pu + 0.8, R + 0.45, pv - 0.9], [pu + 0.8, R + 0.15, pv + 0.6], [pu - 0.8, R + 0.15, pv + 0.6]].map(([a, y, b]) => [a, y, b]).reverse(), K.pv);
      kit.box(pu - 0.75, pu - 0.7, pv - 0.85, pv - 0.8, R, R + 0.45, K.pvFrame, { collide: false });
      kit.box(pu + 0.7, pu + 0.75, pv - 0.85, pv - 0.8, R, R + 0.45, K.pvFrame, { collide: false });
    }
  }

  // ---- corridor fronts (room walls along the corridors, with doors and high windows) ----
  // front: axis, c (centre line), the corridor side (+1/-1 along the other axis), list of spaces [s0, s1, id]
  const fronts = [];
  const doorsOn = []; // { zone, f, axis, c, side, at, id, plate }
  const front = (band, axis, c, side, spaces, f, { openIds = [], noDoor = [] } = {}) => {
    const Lf = L(axis, c, side);
    const ops = [];
    for (const [s0, s1, id] of spaces) {
      if (openIds.includes(id)) { ops.push({ at: (s0 + s1) / 2, width: s1 - s0 - IT, bottom: 0, top: FH - 0.2 - 0.01, open: true }); continue; }
      if (noDoor.includes(id)) continue;
      const len = s1 - s0;
      const dAt = s1 - 1.4; // door near the far end of each room
      ops.push({ at: dAt, width: 1.2, bottom: 0, top: 2.4, door: true, id });
      // high windows along the corridor
      const n = Math.max(1, Math.floor((len - 2.8) / 2.6));
      for (let k = 0; k < n; k++) {
        const s = s0 + 0.6 + ((len - 3.2) * (k + 0.5)) / n;
        ops.push({ at: s, width: Math.min(1.8, (len - 3.2) / n - 0.5), bottom: 1.4, top: 2.6, win: true });
      }
    }
    const y0 = floorY(f);
    const s0 = spaces[0][0]; const s1 = spaces[spaces.length - 1][1];
    Lf.wall(s0, s1, y0, y0 + FH - 0.2, K.inwall, IT, ops.filter((o) => o.width > 0.3));
    for (const o of ops) {
      if (o.win) {
        Lf.plane(o.at, 0, y0 + o.bottom, o.width, o.top - o.bottom, K.glassIn, 1);
        Lf.box(o.at - o.width / 2, o.at + o.width / 2, -IT / 2 - 0.02, IT / 2 + 0.02, y0 + o.bottom - 0.05, y0 + o.bottom, K.frame);
        Lf.box(o.at - o.width / 2, o.at + o.width / 2, -IT / 2 - 0.02, IT / 2 + 0.02, y0 + o.top, y0 + o.top + 0.05, K.frame);
        Lf.box(o.at - 0.03, o.at + 0.03, -IT / 2 - 0.02, IT / 2 + 0.02, y0 + o.bottom, y0 + o.top, K.frame);
      }
      if (o.door) doorsOn.push({ band, f, Lf, at: o.at, id: o.id });
    }
    // dado on the corridor side
    Lf.box(s0, s1, IT / 2 - 0.01, IT / 2 + 0.015, y0, y0 + 1.1, K.dado);
    fronts.push({ band, f, Lf, s0, s1 });
  };
  for (const f of [0, 1]) {
    const west = B.west.filter(([, , id]) => !['office'].includes(id));
    front('west', 'v', 13, 1, west, f, { openIds: ['stairNW', 'stairSW', 'lobbySW', ...(f === 0 ? ['hall'] : [])], noDoor: [] });
    front('north', 'u', 9.8, 1, B.north, f);
    front('east', 'v', 89.5, -1, B.east, f, { openIds: ['passage', 'stairSE'] });
    front('south', 'u', 98.5, -1, B.south.slice(2), f);
    if (f === 1) front('cross', 'u', 44.5, -1, B.cross, f);
  }
  // NW corner: the office's door from the NW lobby; walls of the lobby
  for (const f of [0, 1]) {
    const y0 = floorY(f);
    const Lw = L('v', 13, 1);
    Lw.wall(V0 + FT, 9.8, y0, y0 + FH - 0.2, K.inwall, IT, [{ at: 6.5, width: 1.2, bottom: 0, top: 2.4 }]);
    doorsOn.push({ band: 'west', f, Lf: Lw, at: 6.5, id: f === 0 ? 'office' : '1237' });
    const Le = L('v', 18, -1);
    Le.wall(V0 + FT, 9.8 - IT / 2, y0, y0 + FH - 0.2, K.inwall, IT); // lobby/1108 wall (the north band starts at 18)
  }
  // the SW corner: room 1101 (store) west of the staff room, its door from the SW lobby
  for (const f of [0, 1]) {
    const y0 = floorY(f);
    const Ls = L('u', 98.5, -1);
    Ls.wall(2.3, stf.u0, y0, y0 + FH - 0.2, K.inwall, IT, [{ at: 4.4, width: 1.2, bottom: 0, top: 2.4 }]);
    doorsOn.push({ band: 'south', f, Lf: Ls, at: 4.4, id: f === 0 ? '01' : 'store1201' });
    // over the staff room (first floor) and round it (ground floor): closed walls up to the slab
    L('u', 98.5, -1).wall(stf.u0, stf.u1, y0, y0 + FH - 0.2, K.inwall, IT);
    L('v', stf.u0, 1).wall(98.5, V1 - FT, y0, y0 + FH - 0.2, K.inwall, IT);
    L('v', stf.u1, -1).wall(98.5, V1 - FT, y0, y0 + FH - 0.2, K.inwall, IT);
  }
  // stair hall side walls (both floors, full height so the well reads from above)
  for (const [axis, c, s0, s1] of [['u', 9.8, 2.3, 13], ['u', 14.4, 2.3, 13], ['u', 87.6, 2.3, 13], ['u', 92.4, 2.3, 13], ['u', 94.1, 89.5, U1 - FT], ['v', 104.1, 53.3, 61.3]]) {
    for (const f of [0, 1]) L(axis, c, 1).wall(s0, s1, floorY(f), floorY(f) + FH - 0.2, K.inwall, IT);
  }
  // east projection: hall/stair wall (opening to the stair, door to 1126), stair end wall
  for (const f of [0, 1]) {
    const y0 = floorY(f);
    L('u', 53.2, 1).wall(U1 - FT, PU1 - FT, y0, y0 + FH - 0.2, K.inwall, IT, [{ at: 98.5, width: 1.2, bottom: 0, top: 2.4 }, { at: 106.4, width: 4.2, bottom: 0, top: FH - 0.21 }]);
    doorsOn.push({ band: 'proj', f, Lf: L('u', 53.2, 1), at: 98.5, id: f === 0 ? '1126' : '1236', flip: true });
    L('u', 61.4, 1).wall(104.1, PU1 - FT, y0, y0 + FH - 0.2, K.inwall, IT);
  }
  // east projection facades
  {
    const pf = [
      { L: L('u', PV0 + FT / 2, -1), s0: U1, s1: PU1, ds: { 0: [{ at: 102.5, width: 3.0, top: 3.0 }] } },
      { L: L('u', PV1 - FT / 2, 1), s0: U1, s1: PU1, ds: { 0: [{ at: 100, width: 1.8, top: 2.6 }] } },
      { L: L('v', PU1 - FT / 2, 1), s0: PV0 + FT, s1: PV1 - FT, ds: {} },
    ];
    for (const sd of pf) {
      for (const f of [0, 1]) {
        const y0 = floorY(f);
        const ds = sd.ds[f] || [];
        const len = sd.s1 - sd.s0; const n = Math.max(1, Math.floor((len - 0.4) / 3.3)); const sp = len / n;
        const wins = [];
        for (let k = 0; k < n; k++) { const s = sd.s0 + sp * (k + 0.5); if (!ds.some((d) => Math.abs(d.at - s) < d.width / 2 + 1.5)) wins.push({ at: s, width: Math.min(2.1, sp - 1.1), bottom: 1.0, top: 3.1 }); }
        sd.L.wall(sd.s0, sd.s1, y0, y0 + FH, K.cream, FT, [...wins, ...ds.map((d) => ({ at: d.at, width: d.width, bottom: 0, top: d.top }))]);
        for (const o of wins) glaze(sd.L, o.at, o.width, y0 + 1.0, 2.1, FT, { frame: K.frame });
        sd.L.box(sd.s0 - (sd.L.axis === 'v' ? FT : 0), sd.s1 + (sd.L.axis === 'v' ? FT : 0), FT / 2, FT / 2 + 0.55, y0 + 3.3, y0 + 3.42, K.band);
        if (f === 0) sd.L.box(sd.s0, sd.s1, FT / 2 - 0.01, FT / 2 + 0.05, 0, 0.55, K.plinth);
        else sd.L.box(sd.s0, sd.s1, FT / 2 - 0.01, FT / 2 + 0.07, F1 - 0.3, F1 + 0.15, K.band);
        for (const d of ds) {
          kit.door(sd.L.axis === 'u', d.at, sd.L.c, y0, d.width - 0.1, { height: d.top - 0.05, thick: FT, side: -sd.L.out, frame: K.frame, leaf: K.door });
          sd.L.box(d.at - d.width / 2 - 0.6, d.at + d.width / 2 + 0.6, FT / 2, FT / 2 + 1.6, d.top + 0.25, d.top + 0.45, K.trim);
        }
      }
      sd.L.box(sd.s0 - (sd.L.axis === 'v' ? FT : 0), sd.s1 + (sd.L.axis === 'v' ? FT : 0), FT / 2 - 0.01, FT / 2 + 0.35, R - 0.15, R + 0.12, K.trim);
      sd.L.box(sd.s0, sd.s1, -FT / 2, FT / 2, R, R + PAR, K.cream);
      sd.L.box(sd.s0, sd.s1, -FT / 2 - 0.05, FT / 2 + 0.05, R + PAR, R + PAR + 0.08, K.coping);
    }
    kit.sign('FD-I', 102.5, PV0 - 0.02, 3.6, [0, -1], { width: 2.2, height: 0.55, bg: '#8a2b24', fg: '#f6ecd2' });
    kit.entrance('East projection north door', 102.5, PV0 - 1.6, [0, -1]);
    kit.entrance('East projection south door', 100, PV1 + 1.6, [0, 1]);
  }

  // ---- the staff room's door through the facade: reveals from the facade to the room's own wall ----
  if (room) {
    const zIn = room.z1 + 0.12;
    const vAt = (u) => (zIn - ORIGIN[1] - u * kit.eu[1]) / kit.ev[1];
    for (const u of [stf.door - 1.45, stf.door + 1.45]) {
      const v0 = Math.min(vAt(u - 0.08), vAt(u + 0.08)) + 0.02;
      if (V1 - FT - v0 > 0.03) kit.box(u - 0.08, u + 0.08, v0, V1 - FT + 0.01, 0, 2.8, K.inwall);
    }
    kit.box(stf.door - 1.53, stf.door + 1.53, Math.min(vAt(stf.door - 1.5), vAt(stf.door + 1.5)) + 0.02, V1 - FT + 0.01, 2.8, 3.25, K.inwall, { collide: false });
    kit.sign('FD-I · STAFF ROOM', stf.door, V1 + 0.01, 3.0, [0, 1], { width: 2.9, height: 0.36, bg: '#2f3b46', fg: '#f4efe2', font: 'bold 56px Arial, sans-serif' });
  }

  // ===================== INTERIORS (zones) =====================
  // door leaves and number plates (corridor side)
  for (const d of doorsOn) {
    const zone = zoneOf(d.band, d.f);
    kit.layer(zone, () => {
      const y0 = floorY(d.f);
      const [u, v] = d.Lf.P(d.at, 0);
      const alongU = d.Lf.axis === 'u';
      kit.door(alongU, alongU ? u : v, d.Lf.c, y0, 1.1, { height: 2.35, thick: IT, side: -d.Lf.out * (d.flip ? -1 : 1), frame: K.frame, leaf: K.door, open: !/store/.test(d.id) && d.id !== '01' });
      const num = d.id === 'office' || d.id === '1237' || d.id === '1126' || d.id === '1236' ? d.id : d.id === 'store1201' ? '1201' : `${d.f === 0 ? 11 : 12}${d.id}`;
      const pi = plateIdx[num];
      if (pi !== undefined) {
        const [pu, pv] = d.Lf.P(d.at + 1.05, (d.flip ? -1 : 1) * (IT / 2 + 0.005));
        plate(kit, 'fd1plates', pi, pu, pv, y0 + 1.75, 0.64, 0.16, d.Lf.dir.map((x) => x * (d.flip ? -1 : 1)));
      }
    });
  }

  // rooms: partitions, furniture, lights
  const rooms = [];
  const addRooms = (band, f, axis, spaces, a0, a1) => {
    // axis: the band runs along this axis; a0..a1 the room depth across it
    for (const [s0, s1, id] of spaces) {
      if (!/^\d\d$/.test(id) && !['office', 'hall'].includes(id)) continue;
      if (band === 'south' && id === '01' && f === 1) { rooms.push({ band, f, axis, s0, s1, a0, a1, id: 'store1201', type: 'store' }); continue; }
      rooms.push({ band, f, axis, s0, s1, a0, a1, id, type: f === 0 ? (id === 'hall' ? 'hall' : id === 'office' ? 'office' : (LABS[id] || LABS[+id] || ['', 'lab'])[1]) : id === 'office' ? 'office' : id === 'hall' ? 'seminar' : id === '01' ? 'store' : 'class' });
    }
  };
  for (const f of [0, 1]) {
    addRooms('west', f, 'v', B.west, 2.3, 13);
    addRooms('north', f, 'u', B.north, 0.3, 9.8);
    addRooms('east', f, 'v', B.east, 89.5, U1 - FT);
    addRooms('south', f, 'u', B.south, 98.5, V1 - FT);
    if (f === 1) addRooms('cross', f, 'u', B.cross, 44.5, 50);
  }
  rooms.push({ band: 'proj', f: 0, axis: 'u', s0: 96.3, s1: 104.1, a0: 53.2, a1: PV1 - FT, id: '1126', type: 'lab' });
  rooms.push({ band: 'proj', f: 1, axis: 'u', s0: 96.3, s1: 104.1, a0: 53.2, a1: PV1 - FT, id: '1236', type: 'seminar' });

  // partitions between neighbouring rooms of a band (zone of the band and floor)
  const partitions = {
    west: [27.7, 59.4, 68.8, 78.2], north: B.north.slice(1).map((r) => r[0]), east: [17.6, 25.4, 33.2, 61, 72, 83],
    south: B.south.slice(3).map((r) => r[0]), cross: [40.7, 63.3],
  };
  const across = { west: [2.3, 13], north: [V0 + FT, 9.8], east: [89.5, U1 - FT], south: [98.5, V1 - FT], cross: [44.5, 50] };
  for (const f of [0, 1]) {
    for (const [band, list] of Object.entries(partitions)) {
      if (band === 'cross' && f === 0) continue;
      kit.layer(zoneOf(band, f), () => {
        const y0 = floorY(f); const [a0, a1] = across[band];
        for (const s of list) {
          if (band === 'west' || band === 'east') L('u', s, 1).wall(a0, a1, y0, y0 + FH - 0.2, K.inwall, IT);
          else L('v', s, 1).wall(a0, a1, y0, y0 + FH - 0.2, K.inwall, IT);
        }
        // walls closing the west entrance hall and the east passage from the rooms beside them
        if (band === 'west') for (const s of [41, 50]) L('u', s, 1).wall(2.3, 13, y0, y0 + FH - 0.2, K.inwall, IT);
        if (band === 'east') for (const s of [41, 50]) L('u', s, 1).wall(89.5, U1 - FT, y0, y0 + FH - 0.2, K.inwall, IT, f === 0 || true ? [] : []);
      });
    }
  }
  // the cross wing's first-floor rooms have their south wall on the south court
  {
    const Lc = L('u', 50 - IT / 2, 1);
    const ops = [];
    for (const [s0, s1] of B.cross) { const n = Math.floor((s1 - s0) / 3.6); for (let k = 0; k < n; k++) ops.push({ at: s0 + ((s1 - s0) * (k + 0.5)) / n, width: 2.0, bottom: 1.0, top: 3.1 }); }
    Lc.wall(CN.u0, CN.u1, F1, R - 0.25, K.cream, IT, ops);
    for (const o of ops) glaze(Lc, o.at, 2.0, F1 + 1.0, 2.1, IT, { frame: K.frame, sill: null, recess: 0.06 });
    Lc.box(CN.u0, CN.u1, IT / 2, IT / 2 + 0.5, F1 + 3.3, F1 + 3.42, K.band);
  }

  for (const r of rooms) kit.layer(zoneOf(r.band, r.f), () => furnish(kit, r));

  // corridor lights (shell: the verandahs are open to the courts)
  for (const f of [0, 1]) {
    const y = floorY(f) + FH - 0.2;
    for (let u = 16; u < 88; u += 7.2) { rodLight(kit, u, 12.1, y, 0.6); rodLight(kit, u, 96.5, y, 0.6); }
    for (let v = 18; v < 94; v += 7.2) { if (v > 40 && v < 51) continue; rodLight(kit, 15.5, v, y, 0.6, [0, 1]); rodLight(kit, 87.75, v, y, 0.6, [0, 1]); }
    if (f === 0) for (let u = 21; u < 86; u += 6.8) { rodLight(kit, u, 42.7, y, 0.8); rodLight(kit, u, 47.3, y, 0.8); }
    else for (let u = 21; u < 86; u += 6.8) rodLight(kit, u, 42.7, y, 0.6);
  }
  // the west entrance hall (ground floor) and the east projection hall: notice boards, benches, lights
  kit.layer('W0', () => {
    kit.board(2.3 + 0.02, 45.5, 0, [1, 0], { w: 3.2, h: 1.3, key: 'c:#5b7a4a', frame: 'c:#6b5a43' });
    for (const v of [42.2, 48.8]) kit.box(4, 10, v - 0.25, v + 0.25, 0, 0.45, K.bench);
  });
  kit.layer('P0', () => {
    for (const [u, v] of [[100, 43], [100, 49], [106, 43], [106, 49]]) rodLight(kit, u, v, F1 - 0.2, 1.0);
    kit.board(PU1 - FT - 0.02, 46, 0, [-1, 0], { w: 3.6, h: 1.4, key: 'c:#2f4a6a', frame: 'c:#6b5a43' });
    kit.sign('FACULTY DIVISION I · LABORATORIES', PU1 - FT - 0.03, 46, 2.5, [-1, 0], { width: 3.6, height: 0.42, bg: '#2f3b46', fg: '#f4efe2', font: 'bold 50px Arial, sans-serif' });
  });
  kit.layer('P1', () => { for (const [u, v] of [[100, 43], [100, 49], [106, 43], [106, 49]]) rodLight(kit, u, v, R - 0.25, 1.0); });
  kit.layer('W1', () => { for (const v of [91, 95.5]) rodLight(kit, 7.5, v, R - 0.25, 1.0); });

  // rooms for tests and the explorer
  kit.room('crossArcade', 'Cross-wing arcade', CN.u0, CN.u1, 41, 50, 0, F1);
  kit.room('westHall', 'West entrance hall', 2.3, 13, 41, 50, 0, F1);
  kit.room('projHall', 'East projection hall', U1, PU1, PV0, 53.2, 0, F1);
  for (const r of rooms) {
    const [u0, u1, v0, v1] = r.axis === 'u' ? [r.s0, r.s1, r.a0, r.a1] : [r.a0, r.a1, r.s0, r.s1];
    kit.room(`${r.f}:${r.id}`, `${r.f === 0 ? 11 : 12}${r.id}`, u0, u1, v0, v1, floorY(r.f), floorY(r.f) + FH, r.f);
  }
  kit.floors.push({ y: 0, name: 'Ground floor (labs, 11xx)' }, { y: F1, name: 'First floor (classrooms, 12xx)' });

  // the east projection is not in the OSM data: register it so trees and people keep out
  const pp = [[U1, PV0], [PU1, PV0], [PU1, PV1], [U1, PV1]].map(([u, v]) => { const p = kit.world(u, v); return [p.x, p.z]; });
  addFootprint(campus, null, pp, R, 'fd1');
}

// ---------- room furniture ----------
function furnish(kit, r) {
  const y0 = r.f === 0 ? 0 : F1;
  const yf = r.f === 0 ? GY : F1 + 0.012;
  const ceil = y0 + FH - 0.2 - 0.005;
  // room rectangle in u/v, the band axis (s) and the depth axis (a); the corridor side is a0 or a1
  const inner = 0.15;
  const [u0, u1, v0, v1] = r.axis === 'u' ? [r.s0 + inner, r.s1 - inner, r.a0 + inner, r.a1 - inner] : [r.a0 + inner, r.a1 - inner, r.s0 + inner, r.s1 - inner];
  const W = u1 - u0; const D = v1 - v0;
  const cu = (u0 + u1) / 2; const cv = (v0 + v1) / 2;
  // lights: a grid of tube lights on drop rods, fans in classrooms
  const nu = Math.max(1, Math.round(W / 3.2)); const nv = Math.max(1, Math.round(D / 3.2));
  if (r.type !== 'store') {
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const u = u0 + (W * (i + 0.5)) / nu; const v = v0 + (D * (j + 0.5)) / nv;
      rodLight(kit, u, v, ceil, 1.1, W > D ? [1, 0] : [0, 1]);
    }
  }
  // the room's "front" wall (boards) is at the low end of its band
  const alongU = r.axis === 'u';
  const t = r.type;
  if (t === 'class' || t === 'seminar' || t === 'drawing') {
    // board on the low-s wall, bench desks facing it
    const [bu, bv, face] = alongU ? [u0 + 0.02, cv, [1, 0]] : [cu, v0 + 0.02, [0, 1]];
    kit.board(bu, bv, yf, face, { w: Math.min(4.2, (alongU ? D : W) - 1.6), h: 1.25, key: K.board, frame: K.boardFrame });
    // teacher's table and a raised platform
    const [tu, tv] = alongU ? [u0 + 1.6, cv] : [cu, v0 + 1.6];
    if (alongU) kit.box(u0, u0 + 2.4, v0 + 0.6, v1 - 0.6, yf, yf + 0.18, 't:wood:#7a5a3c', { walkable: true });
    else kit.box(u0 + 0.6, u1 - 0.6, v0, v0 + 2.4, yf, yf + 0.18, 't:wood:#7a5a3c', { walkable: true });
    kit.desk(tu, tv, yf + 0.18, face.map((x) => -x), { w: 1.4, d: 0.7 });
    const len = alongU ? W : D; const wid = alongU ? D : W;
    const cols = Math.max(1, Math.floor((wid - 1.4) / 2.3));
    for (let s = 3.6; s < len - 0.8; s += 1.15) {
      for (let k = 0; k < cols; k++) {
        const b = (alongU ? v0 : u0) + 0.9 + ((wid - 1.8) * (k + 0.5)) / cols;
        const a = (alongU ? u0 : v0) + s;
        if (t === 'drawing') kit.desk(alongU ? a : b, alongU ? b : a, yf, face.map((x) => -x), { w: 1.4, d: 0.9, top: 't:wood:#b08a5c' });
        else kit.benchDesk(alongU ? a : b, alongU ? b : a, yf, face.map((x) => -x), { w: 1.8 });
      }
    }
    if (t !== 'drawing') for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) kit.fan(u0 + (W * (i + 0.5)) / nu + 0.8, v0 + (D * (j + 0.5)) / nv + 0.8, ceil);
    return;
  }
  if (t === 'store') {
    for (let s = 0.6; s < (alongU ? W : D) - 0.6; s += 2.0) kit.shelf(alongU ? u0 + s + 0.9 : u0 + 0.25, alongU ? v0 + 0.25 : v0 + s + 0.9, yf, alongU ? [0, 1] : [1, 0], { w: 1.8, books: ['c:#8a8f94', 'c:#6f6253', 'c:#a8a08f'] });
    return;
  }
  if (t === 'office') {
    kit.desk(cu, cv, yf, [0, -1], { w: 1.8, d: 0.9 });
    kit.chair(cu, cv + 0.8, yf, [0, -1]);
    for (const du of [-1.2, 0, 1.2]) kit.chair(cu + du, cv - 1.2, yf, [0, 1]);
    kit.shelf(u0 + 1.2, v0 + 0.25, yf, [0, 1]); kit.shelf(u0 + 3.2, v0 + 0.25, yf, [0, 1]);
    return;
  }
  if (t === 'hall') return;
  // ---- labs ----
  const len = alongU ? W : D; const wid = alongU ? D : W;
  const S = (a, b) => (alongU ? [u0 + a, v0 + b] : [u0 + b, v0 + a]); // a along the band, b across
  const BX = (a0, a1, b0, b1, ya, yb, key, opts) => { const [p0, q0] = S(a0, b0); const [p1, q1] = S(a1, b1); kit.box(Math.min(p0, p1), Math.max(p0, p1), Math.min(q0, q1), Math.max(q0, q1), yf + ya, yf + yb, key, opts); };
  const faceA = alongU ? [1, 0] : [0, 1];
  // wall cupboards along the outer wall
  const outerB = r.band === 'north' || r.band === 'west' ? 0 : wid; const ob = outerB === 0 ? 0.05 : wid - 0.65;
  if (t !== 'hyd' && t !== 'civil') for (let a = 0.8; a < len - 1.6; a += 1.2) BX(a, a + 1.15, ob, ob + 0.6, 0, 0.9, K.cab, { collide: true });
  if (t === 'chem' || t === 'lab' || t === 'soil') {
    // island benches: black tops on white cabinets with blue trim, stools, gas taps
    const n = Math.max(1, Math.floor((len - 2.4) / 2.6));
    for (let k = 0; k < n; k++) {
      const a = 1.4 + ((len - 2.8) * (k + 0.5)) / n;
      const b0 = wid * 0.28; const b1 = wid * 0.72;
      BX(a - 0.55, a + 0.55, b0, b1, 0, 0.86, K.cab, { collide: true });
      BX(a - 0.6, a + 0.6, b0 - 0.05, b1 + 0.05, 0.86, 0.92, K.black);
      BX(a - 0.56, a + 0.56, b0, b1, 0.08, 0.12, K.blue);
      BX(a - 0.04, a + 0.04, b0 + 0.2, b1 - 0.2, 0.92, 1.45, K.steel); // reagent shelf
      BX(a - 0.25, a + 0.25, b0 + 0.2, b1 - 0.2, 1.4, 1.44, K.steel);
      for (let b = b0 + 0.5; b < b1 - 0.3; b += 0.9) for (const side of [-1, 1]) { const [su, sv] = S(a + side * 1.0, b); kit.cyl(su, sv, yf, 0.17, 0.62, K.grey, { seg: 8 }); }
      if (t === 'soil') for (let b = b0 + 0.4; b < b1 - 0.3; b += 0.8) { const [su, sv] = S(a, b); kit.cyl(su, sv, yf + 0.92, 0.16, 0.42, 'm:#b8bec2', { seg: 12 }); }
      if (t === 'chem') for (let b = b0 + 0.35; b < b1 - 0.3; b += 0.7) { const [su, sv] = S(a + 0.25, b); kit.cyl(su, sv, yf + 0.92, 0.06, 0.22, 'g:#bfe0d8', { seg: 8 }); }
    }
    if (t === 'chem') { // fume hood at the low end
      BX(0.05, 0.95, wid * 0.3, wid * 0.3 + 1.8, 0, 2.3, K.cab, { collide: true });
      BX(0.9, 0.96, wid * 0.3 + 0.15, wid * 0.3 + 1.65, 0.9, 1.9, 'g:#bfd6e0');
      BX(0.05, 1.0, wid * 0.3, wid * 0.3 + 1.8, 0.86, 0.92, K.black);
    }
  } else if (t === 'civil') {
    // blue loading frames and a universal testing machine
    for (const a of [len * 0.3, len * 0.7]) {
      const b0 = wid * 0.2; const b1 = wid * 0.8;
      BX(a - 1.5, a + 1.5, b0, b1, 0, 0.3, K.grey, { collide: true });
      for (const aa of [a - 1.4, a + 1.2]) for (const bb of [b0 + 0.1, b1 - 0.3]) BX(aa, aa + 0.2, bb, bb + 0.2, 0.3, 3.2, K.blue, { collide: true });
      BX(a - 1.5, a + 1.5, b0 + 0.1, b1 - 0.1, 3.2, 3.5, K.blue);
      BX(a - 0.15, a + 0.15, wid / 2 - 0.15, wid / 2 + 0.15, 2.2, 3.2, K.red); // the jack
      BX(a - 1.2, a + 1.2, wid / 2 - 0.15, wid / 2 + 0.15, 0.6, 0.9, 'c:#9a9590'); // a test beam
    }
    const [mu, mv] = S(len - 1.1, 1.0);
    kit.box(mu - 0.6, mu + 0.6, mv - 0.6, mv + 0.6, yf, yf + 1.2, K.green);
    kit.cyl(mu - 0.35, mv, yf + 1.2, 0.08, 1.6, K.steel, { seg: 8 }); kit.cyl(mu + 0.35, mv, yf + 1.2, 0.08, 1.6, K.steel, { seg: 8 });
    kit.box(mu - 0.6, mu + 0.6, mv - 0.4, mv + 0.4, yf + 2.8, yf + 3.1, K.green);
  } else if (t === 'hyd') {
    // a long tilting flume on stands, a sump tank and a pump
    const b0 = wid * 0.42; const b1 = b0 + 0.6;
    BX(1.0, len - 1.2, b0, b1, 0.95, 1.6, 'g:#a9cfe0');
    BX(1.0, len - 1.2, b0, b1, 0.9, 0.95, K.steel);
    BX(1.0, len - 1.2, b0 - 0.04, b0, 0.95, 1.6, K.steel); BX(1.0, len - 1.2, b1, b1 + 0.04, 0.95, 1.6, K.steel);
    for (let a = 1.3; a < len - 1.2; a += 1.8) BX(a, a + 0.12, b0, b1, 0, 0.9, K.grey, { collide: true });
    BX(1.0, len - 1.2, b0 + 0.05, b1 - 0.05, 0.96, 1.22, K.water);
    BX(len - 1.1, len - 0.2, b0 - 0.5, b1 + 0.5, 0, 1.0, K.blue, { collide: true });
    const [pu, pv] = S(0.6, b0 + 0.3); kit.cyl(pu, pv, yf, 0.35, 0.7, K.green, { seg: 12, collide: true });
    BX(0.2, 1.0, wid * 0.8, wid * 0.8 + 0.6, 0, 0.9, K.bench, { collide: true });
  } else if (t === 'survey') {
    // tripods with theodolites and levelling staffs in racks
    for (let a = 1.5; a < len - 1; a += 1.8) for (const bb of [wid * 0.35, wid * 0.65]) {
      const [su, sv] = S(a, bb);
      for (let k = 0; k < 3; k++) { const ang = (k / 3) * Math.PI * 2; bar(kit, [su + Math.cos(ang) * 0.35, yf, sv + Math.sin(ang) * 0.35], [su, yf + 1.35, sv], 0.03, 't:wood:#9a7a4a'); }
      kit.box(su - 0.1, su + 0.1, sv - 0.08, sv + 0.08, yf + 1.35, yf + 1.6, K.yellow, { collide: false });
      kit.col(su - 0.3, su + 0.3, sv - 0.3, sv + 0.3, yf, yf + 1.5);
    }
    for (let a = 0.5; a < 2.5; a += 0.15) BX(a, a + 0.06, wid - 0.4, wid - 0.34, 0, 2.8, 'c:#e9e2c8');
  } else if (t === 'gis') {
    // computer desks in rows with monitors
    const cols = Math.max(1, Math.floor((wid - 1.2) / 1.8));
    for (let a = 1.6; a < len - 0.8; a += 1.6) for (let k = 0; k < cols; k++) {
      const b = 0.6 + ((wid - 1.2) * (k + 0.5)) / cols;
      const [du, dv] = S(a, b);
      kit.desk(du, dv, yf, faceA.map((x) => -x), { w: 1.5, d: 0.7, top: 'c:#d8d4cb' });
      const [mu, mv] = S(a - 0.2, b);
      kit.box(mu - (alongU ? 0.03 : 0.3), mu + (alongU ? 0.03 : 0.3), mv - (alongU ? 0.3 : 0.03), mv + (alongU ? 0.3 : 0.03), yf + 0.8, yf + 1.2, K.monitor, { collide: false });
      kit.chair(...S(a + 0.55, b), yf, faceA.map((x) => -x));
    }
  }
  // a board on the low wall in every lab
  kit.board(...(alongU ? [u0 + 0.02, cv] : [cu, v0 + 0.02]), yf, faceA, { w: 2.4, h: 1.1, key: 'c:#f2f2ee', frame: 'c:#9aa0a3' });
}
