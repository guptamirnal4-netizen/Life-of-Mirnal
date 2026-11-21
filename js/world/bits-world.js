// BITS Pilani at real scale (1 unit = 1 m), built from data/bits-campus.js (OpenStreetMap + traced footprints).
// Origin = Rotunda; x = east, z = south (north = −z). Gameplay rooms sit inside their real host buildings
// and reuse the school interiors, which are written in school coordinates and placed in translated groups.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Campus, ROOMS, mat } from './campus.js';
import { makeLabel } from './labels.js';
import { texture, texturedMaterial, worldBoxGeometry, worldPlane, TEX_SIZE } from './textures.js';
import { BITS_CAMPUS as D } from '../../data/bits-campus.js';
import { NavGraph } from './nav.js';
import { Hostel, WALK_IN, entranceOrder, mergeShells } from './hostel.js';
import { CombHostel, COMB } from './comb-hostel.js';
import { COUNTER_FOOD } from '../../data/mess.js';
import { crownGeometry } from './foliage.js';
import { BUILDING_MODULES } from './buildings/registry.js';
import { Kit, fitFrame } from './buildings/kit.js';

const CHUNK = 150;
const chunkKey = (x, z) => `${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}`;

// ---------- geometry helpers ----------
const centroid = (p) => [p.reduce((a, q) => a + q[0], 0) / p.length, p.reduce((a, q) => a + q[1], 0) / p.length];
function inPoly(x, z, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-12) + xi) c = !c;
  }
  return c;
}
const inBuilding = (x, z, b) => inPoly(x, z, b.outer) && !b.holes.some((h) => inPoly(x, z, h));
function bbox(p) {
  let minX = Infinity; let maxX = -Infinity; let minZ = Infinity; let maxZ = -Infinity;
  for (const [x, z] of p) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
  return { minX, maxX, minZ, maxZ };
}
function segDist(px, pz, a, b) {
  const dx = b[0] - a[0]; const dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(px - (a[0] + t * dx), pz - (a[1] + t * dz));
}
// Where a vertical (const x) or horizontal (const z) line crosses a polygon.
function crossings(poly, axis, v) {
  const out = [];
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j]; const b = poly[i];
    const [ua, wa] = axis === 'x' ? [a[0], a[1]] : [a[1], a[0]];
    const [ub, wb] = axis === 'x' ? [b[0], b[1]] : [b[1], b[0]];
    if ((ua <= v && ub > v) || (ub <= v && ua > v)) out.push(wa + ((v - ua) / (ub - ua)) * (wb - wa));
  }
  return out;
}

// Accumulates triangles for one material in one chunk.
class Bucket {
  constructor() { this.pos = []; this.nor = []; this.uv = []; }
  quad(a, b, c, d, uvs, n) {
    for (const [p, t] of [[a, uvs[0]], [b, uvs[1]], [c, uvs[2]], [a, uvs[0]], [c, uvs[2]], [d, uvs[3]]]) {
      this.pos.push(p[0], p[1], p[2]); this.nor.push(n[0], n[1], n[2]); this.uv.push(t[0], t[1]);
    }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeBoundingSphere();
    return g;
  }
}

// ---------- facade textures (one repeat = one bay × one floor) ----------
// Colours and patterns follow the official 360° tour and campus-tour videos (see scratchpad/yt/REFERENCE.md):
// cream-white Bhawans, buff arcaded academic blocks, white Main Building, red-sandstone Library,
// blue-grey SAC, exposed-concrete NAB under green roofs.
const FACADES = {
  hostel: { bay: 3.4, floor: 3.3, wall: '#eee7d8', win: '#3a4653', frame: '#fbf8f1', balcony: true },
  academic: { bay: 4.2, floor: 4.0, wall: '#ead9b4', win: '#30414f', frame: '#f8f2e4', pilaster: '#dcc69c', tall: true, arch: true },
  heritage: { bay: 3.6, floor: 4.2, wall: '#f2ede1', win: '#33414d', frame: '#fffaf0', pilaster: '#e4dac4', tall: true, arch: true, cornice: '#ddd2ba' },
  library: { bay: 5.0, floor: 4.4, wall: '#b65a3f', win: '#2d3238', frame: '#e3c99f', bands: '#e3c99f', slot: true },
  concrete: { bay: 4.8, floor: 3.4, wall: '#d4cbbb', win: '#28313a', frame: '#a99f8e', deep: true },
  sac: { bay: 4.4, floor: 3.6, wall: '#9fb0bc', win: '#2f3a44', frame: '#8e3b3b', band: '#8e3b3b' },
  mess: { bay: 3.6, floor: 3.4, wall: '#efe5cf', win: '#3c4650', frame: '#f8f2e6', band: '#a8443a' },
  plain: { bay: 4.0, floor: 3.2, wall: '#e6dccb', win: '#3c4a56', frame: '#f2ece2' },
  house: { bay: 5.0, floor: 3.0, wall: '#dccbb0', win: '#465260', frame: '#efe6d6', small: true },
  school: { bay: 3.6, floor: 3.3, wall: '#f0d4c2', win: '#3b4f63', frame: '#fbf3ea' },
  food: { bay: 3.5, floor: 3.0, wall: '#f2e2c4', win: '#3a3a3a', frame: '#d84a2a' },
  // Birla Science Centre: orange-terracotta tile cladding with cream bands and yellow-framed glazing (gates-landmarks.md §6)
  museum: { bay: 4.4, floor: 4.0, wall: '#c8693e', win: '#2f3a44', frame: '#e8c45a', bands: '#f1e6cf' },
  // Shiv Ganga's island cottage: white walls, green-framed windows (landscape-water.md)
  cottage: { bay: 3.2, floor: 4.2, wall: '#f4f1ea', win: '#33414d', frame: '#5f9384' },
};
// Environment overrides of the plain extrusion: the museum is a low hall, not a 14 m block; the Shiv Ganga cottage
// and the statue platform are built by buildShivGanga.
const ENV_STYLE = { 'Birla Museum': { h: 8.5, facade: 'museum', roof: 'roofSolar' }, 'Pilani Gallery': { h: 9, facade: 'heritage', roof: 'roof' } };
const inBox = (b, x0, x1, z0, z1) => b.bb.minX > x0 && b.bb.maxX < x1 && b.bb.minZ > z0 && b.bb.maxZ < z1;
const envBuilt = (b) => !b.name && (inBox(b, 105, 136, 806, 838) || inBox(b, 155, 178, 810, 828));

function paint(g, hex) {
  const c = new THREE.Color(hex); const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
}

function canvasTexture(w, h, draw, repeat = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  if (repeat) { tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping; }
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
function speckle(g, w, h, n = 1200, seed = 7) {
  let s = seed;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${r() > 0.5 ? '255,255,255' : '80,60,40'},${0.03 + r() * 0.05})`; g.fillRect(r() * w, r() * h, 3, 3); }
}
// Window opening with a semicircular head (the arcades of the Main Building and academic blocks).
function archPath(g, x, y, w, h) {
  const r = w / 2;
  g.beginPath();
  g.moveTo(x, y + h);
  g.lineTo(x, y + r);
  g.arc(x + r, y + r, r, Math.PI, 0);
  g.lineTo(x + w, y + h);
  g.closePath();
}
const facadeCache = new Map();
function facadeMaterial(kind) {
  if (facadeCache.has(kind)) return facadeCache.get(kind);
  const f = FACADES[kind];
  const W = 256; const H = Math.round((256 * f.floor) / f.bay);
  const tex = canvasTexture(W, H, (g) => {
    g.fillStyle = f.wall; g.fillRect(0, 0, W, H);
    speckle(g, W, H, 1600);
    const px = W / f.bay; const py = H / f.floor;
    if (f.bands) { g.fillStyle = f.bands; g.fillRect(0, H * 0.12, W, py * 0.07); g.fillRect(0, H * 0.86, W, py * 0.05); }
    if (f.band) { g.fillStyle = f.band; g.fillRect(0, 0, W, py * 0.07); }
    if (f.pilaster) { g.fillStyle = f.pilaster; g.fillRect(0, 0, px * 0.35, H); g.fillRect(W - px * 0.35, 0, px * 0.35, H); }
    if (f.cornice) { g.fillStyle = f.cornice; g.fillRect(0, 0, W, py * 0.06); }
    const ww = (f.slot ? 0.28 : f.small ? 0.8 : f.tall ? 1.6 : 1.1) * px;
    const wh = (f.slot ? 2.6 : f.small ? 1.0 : f.tall ? 2.3 : 1.45) * py;
    const wx = (W - ww) / 2; const wy = H - (f.tall || f.slot ? 0.8 : 0.95) * py - wh;
    if (f.arch) {
      g.fillStyle = f.frame; archPath(g, wx - 6, wy - 6, ww + 12, wh + 10); g.fill();
      g.fillStyle = f.win; archPath(g, wx, wy, ww, wh); g.fill();
      g.strokeStyle = f.frame; g.lineWidth = 3; g.beginPath(); g.moveTo(wx, wy + ww / 2); g.lineTo(wx + ww, wy + ww / 2); g.moveTo(W / 2, wy + ww / 2); g.lineTo(W / 2, wy + wh); g.stroke();
    } else {
      g.fillStyle = f.frame; g.fillRect(wx - (f.deep ? 12 : 5), wy - (f.deep ? 12 : 5), ww + (f.deep ? 24 : 10), wh + (f.deep ? 24 : 10));
      if (f.deep) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(wx - 6, wy - 6, ww + 12, 8); }
      g.fillStyle = f.win; g.fillRect(wx, wy, ww, wh);
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(wx + 3, wy + 3, ww * 0.35, wh - 6);
      g.strokeStyle = f.frame; g.lineWidth = 3; g.beginPath(); g.moveTo(W / 2, wy); g.lineTo(W / 2, wy + wh); g.stroke();
      if (!f.slot && !f.deep) {
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(wx - 10, wy - 14, ww + 20, 8); // chajja shadow
        g.fillStyle = f.frame; g.fillRect(wx - 12, wy - 18, ww + 24, 6);
      }
    }
    if (f.balcony) { g.fillStyle = 'rgba(232,226,212,0.95)'; g.fillRect(wx - 14, H - py * 0.22, ww + 28, py * 0.2); }
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, H - 4, W, 4);
  });
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide });
  const out = { m, bay: f.bay, floor: f.floor };
  facadeCache.set(kind, out);
  return out;
}
const FACADE_OF = { hostel: 'hostel', academic: 'academic', library: 'library', hall: 'academic', sac: 'sac', office: 'plain', mess: 'mess', other: 'plain', house: 'house', school: 'school', food: 'food', temple: 'plain' };
const HERITAGE = new Set(['Main Building (West Wing)', 'Main Building (East Wing)', 'Main Building Hall', 'FD-II']);
const NAB_BLOCKS = new Set(['NAB', 'New Academic Block']);
const facadeOf = (b) => (!b.inCampus ? 'house' : HERITAGE.has(b.name) ? 'heritage' : NAB_BLOCKS.has(b.name) ? 'concrete' : FACADE_OF[b.kind] || 'plain');
// Bhawan, academic and SAC roofs carry rows of solar panels in every aerial view; the NAB blocks have grass roofs.
const roofOf = (b) => (!b.inCampus ? 'roofOut' : NAB_BLOCKS.has(b.name) ? 'roofGreen' : ['hostel', 'academic', 'sac', 'school'].includes(b.kind) && !HERITAGE.has(b.name) ? 'roofSolar' : 'roof');
const COURT_SPORTS = new Set(['basketball', 'tennis', 'volleyball', 'badminton']);

function tiledMaterial(name, tint = '#ffffff', roughness = 0.95) {
  const t = texture(name);
  return new THREE.MeshStandardMaterial({ map: t, color: tint, roughness });
}

// Gameplay rooms and the real buildings that host them.
const ROOM_HOSTS = {
  classroom: { host: 'New Academic Block', name: 'NAB · Lecture Theatre' },
  classroomB: { host: 'NAB', name: 'NAB · Tutorial Room' },
  sciencelab: { host: 'FD-II', name: 'FD-II · Physics, Chemistry & Biology Labs' },
  library: { host: 'BITS Library', name: 'BITS Library' },
  staffroom: { host: 'Faculty Division I (FD-I)', name: 'FD-I · Faculty Division' },
  principal: { host: 'Main Building (East Wing)', name: "Director's Office" },
  reception: { host: 'Main Building (West Wing)', name: 'Academic Registration (AUGSD)' },
  complab: { host: 'Main Building (West Wing)', name: 'Computer Lab (CP)' },
  auditorium: { host: 'Student Activities Center (SAC)', name: 'SAC · Auditorium' },
  mess: { host: 'VKB mess', name: 'VKB Mess · Dining Hall' },
};

// Rooms that exist only at BITS (local coordinates; placeRooms moves them into their hosts).
// VKB mess is the OSM name of the mess building beside Krishna Bhawan.
const BITS_ROOMS = [
  { id: 'mess', name: 'Mess', x0: 0, x1: 14, z0: 0, z1: 9, door: { side: 'west', at: 4.5 }, wall: '#f3ead6', floor: 'terrazzo' },
];

// The two walk-through crossings of NAB (one per block, each crossing both blocks). Positions come from the
// Google Earth imagery (paved bands and entry portals across both blocks) and the OSM footways that meet the
// outer walls there; accurate to about ±5 m. Each passage runs east-west at a fixed z through one block.
const NAB_PASSAGES = [
  { host: 'New Academic Block', z: 97, name: 'NAB north crossing (west block)', outer: 'west' },
  { host: 'NAB', z: 84, name: 'NAB north crossing (east block)', outer: 'east' },
  { host: 'New Academic Block', z: 215, name: 'NAB south crossing (west block)', outer: 'west' },
  { host: 'NAB', z: 206, name: 'NAB south crossing (east block)', outer: 'east' },
];
const PASSAGE_HALF = 2; // 4 m wide

// ---------- environment: road classes, the view axis (research/buildings/roads-paths.md, gates-landmarks.md) ----------
// Every road inside the campus is OSM `service`. The real campus has two kinds: main avenues (6.5 m asphalt, a
// dashed centre line, raised black-and-white kerbs, 2.2 m grey paver footpaths, zebras at junctions) and minor
// lanes (4 m of plain asphalt, no kerb). Avenues are the named Margs and the long spines; the Main Building drive is
// a 7 m arc with a centre line and no kerbs. Town roads outside the boundary keep their OSM width.
const FOOT_KINDS = new Set(['footway', 'path', 'steps', 'pedestrian', 'track', 'cycleway']);
const AV = { half: 3.25, kerb: 0.3, foot: 2.2, kerbH: 0.16, footY: 0.1 };
const roadLength = (r) => r.pts.slice(1).reduce((a, p, k) => a + Math.hypot(p[0] - r.pts[k][0], p[1] - r.pts[k][1]), 0);
function classifyRoads(roads, boundary) {
  const cls = new Map();
  for (const r of roads) {
    let c;
    if (FOOT_KINDS.has(r.kind)) c = 'foot';
    else if (r.kind !== 'service') c = 'town';
    else {
      const inside = r.pts.filter(([x, z]) => inPoly(x, z, boundary)).length / r.pts.length;
      const [a, b] = [r.pts[0], r.pts[r.pts.length - 1]];
      const loop = Math.hypot(a[0] - b[0], a[1] - b[1]) < 4;
      if (r.pts.some(([x, z]) => Math.hypot(x - 9, z + 37) < 6)) c = 'drive';
      else if (inside >= 0.5 && !loop && (r.name || roadLength(r) >= 130)) c = 'avenue';
      else c = 'lane';
    }
    cls.set(r, c);
  }
  return cls;
}
// The defining view: from the Clock Tower porch over the sunken Rotunda and NAB to the Saraswati Mandir. Nothing
// tall may stand in this wedge (a 5 m core widening 3 cm per metre, the width the temple subtends from the porch).
const AXIS_A = [-9.3, -40]; const AXIS_B = [103, 672];
const AXIS_L = Math.hypot(AXIS_B[0] - AXIS_A[0], AXIS_B[1] - AXIS_A[1]);
// Shiv Ganga: the OSM polygon is the island's bank; the 12 m canal lies outside it (landscape-water.md).
const SG_WATER = (D.areas.find((a) => a.kind === 'shivganga') || {}).water || { c: [128, 823], r: [54, 66] };

export class BitsCampus extends Campus {
  constructor(root) {
    super(root);
  }

  // ---------- build ----------
  build() {
    this.mode = 'college';
    this.root = this.scene;
    this.labels = [];
    this.buckets = new Map();
    this.shapeGeos = new Map();
    this.buildings = D.buildings.map((b) => ({ ...b, bb: bbox(b.outer) }));
    // The Bhawans are walk-in; their outlines are squared up to fit the interiors. Krishna is yours.
    this.hostels = [];
    for (const name of WALK_IN) {
      const b = this.buildings.find((x) => x.name === name);
      if (!b) continue;
      const mine = name === 'Krishna Bhawan';
      this.hostels.push(new Hostel(this, b, { mine, outer: mine ? b.outer : entranceOrder(b.outer, D.roads) }));
      b.bb = bbox(b.outer);
    }
    // the newer comb-shaped Bhawans (Bhagirath, a girls' hostel, stays closed to Mirnal)
    for (const name of Object.keys(COMB)) {
      const b = this.buildings.find((x) => x.name === name);
      if (!b) continue;
      this.hostels.push(new CombHostel(this, b));
      b.bb = bbox(b.outer);
    }
    this.hostel = this.hostels.find((H) => H.mine);
    this.buildingGrid = new Map();
    for (const b of this.buildings) this.gridInsert(this.buildingGrid, b.bb, b, 40);
    this.roadCls = classifyRoads(D.roads, D.boundary);
    this.roadSegs = [];
    for (const r of D.roads) for (let i = 1; i < r.pts.length; i++) this.roadSegs.push({ a: r.pts[i - 1], b: r.pts[i], w: 2 * this.roadOuter(r), half: this.roadHalf(r), r, cls: this.roadCls.get(r) });
    this.roadGrid = new Map();
    for (const s of this.roadSegs) { const bb = bbox([s.a, s.b]); this.gridInsert(this.roadGrid, { minX: bb.minX - 8, maxX: bb.maxX + 8, minZ: bb.minZ - 8, maxZ: bb.maxZ + 8 }, s, 40); }

    this.pits = [];
    const q = typeof location === 'undefined' ? new URLSearchParams() : new URLSearchParams(location.search);
    const only = q.get('only')?.split(',');
    this.activeModules = q.has('nomodules') ? [] : BUILDING_MODULES.filter((m) => m.enabled && (!only || only.includes(m.id)));
    this.placeRooms();
    this.planPassages();
    for (const H of this.hostels) H.build();
    mergeShells(this.hostels, this.root);
    this.buildModules();
    this.buildGround();
    this.buildAreas();
    this.envKits = [];
    this.buildLawns();
    this.buildRoads();
    this.buildBuildings();
    this.buildPassages();
    if (!this.owned.has('rotunda')) this.buildRotunda();
    if (!this.owned.has('clockTower')) this.buildClockTowerAt();
    this.buildTemple();
    this.buildShivGanga();
    this.buildGymkhana();
    this.buildANC();
    this.buildHostelGate();
    this.buildMainGate();
    this.buildBoundaryWall();
    this.buildStatues();
    this.buildMuseum();
    this.buildLampPosts();
    this.buildNav();
    this.buildTrees();
    this.buildLabels();
    this.envKit.finish();
    this.flushGeometry();
    this.colliderGrid = null;
  }

  gridInsert(grid, bb, item, size) {
    for (let gx = Math.floor(bb.minX / size); gx <= Math.floor(bb.maxX / size); gx++) {
      for (let gz = Math.floor(bb.minZ / size); gz <= Math.floor(bb.maxZ / size); gz++) {
        const k = `${gx},${gz}`;
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push(item);
      }
    }
  }

  gridNear(grid, x, z, size) {
    return grid.get(`${Math.floor(x / size)},${Math.floor(z / size)}`) || [];
  }

  isBuilt(x, z, pad = 0) {
    for (const b of this.gridNear(this.buildingGrid, x, z, 40)) {
      if (x < b.bb.minX - pad || x > b.bb.maxX + pad || z < b.bb.minZ - pad || z > b.bb.maxZ + pad) continue;
      if (pad === 0 ? inBuilding(x, z, b) : inPoly(x, z, b.outer) || b.outer.some((p, i) => segDist(x, z, p, b.outer[(i + 1) % b.outer.length]) < pad)) return true;
    }
    return false;
  }

  nearRoad(x, z, extra = 1.5) {
    for (const s of this.gridNear(this.roadGrid, x, z, 40)) if (segDist(x, z, s.a, s.b) < s.w / 2 + extra) return true;
    return false;
  }

  bucket(matKey, x, z) {
    const k = `${matKey}|${chunkKey(x, z)}`;
    if (!this.buckets.has(k)) this.buckets.set(k, { matKey, b: new Bucket() });
    return this.buckets.get(k).b;
  }

  addShape(matKey, x, z, geo) {
    const k = `${matKey}|${chunkKey(x, z)}`;
    if (!this.shapeGeos.has(k)) this.shapeGeos.set(k, { matKey, list: [] });
    this.shapeGeos.get(k).list.push(geo);
  }

  material(key) {
    this.mats ||= {};
    if (this.mats[key]) return this.mats[key];
    let m;
    if (key.startsWith('facade:')) m = facadeMaterial(key.slice(7)).m;
    else if (key === 'roof') m = new THREE.MeshStandardMaterial({ color: '#d9d2c4', roughness: 0.95, side: THREE.DoubleSide });
    else if (key === 'roofSolar') m = new THREE.MeshStandardMaterial({ map: this.solarRoofTexture(), roughness: 0.7, side: THREE.DoubleSide });
    else if (key === 'roofGreen') m = tiledMaterial('grass', '#a8d48a');
    else if (key === 'roofOut') m = new THREE.MeshStandardMaterial({ color: '#c9bfae', roughness: 0.95, side: THREE.DoubleSide });
    else if (key === 'parapet') m = new THREE.MeshStandardMaterial({ color: '#f1ece2', roughness: 0.85, side: THREE.DoubleSide });
    else if (key === 'grass') m = tiledMaterial('grass', '#d8f0c0');
    else if (key === 'wood') m = tiledMaterial('grass', '#b9b07a');
    else if (key === 'pitch') m = tiledMaterial('grass', '#c6f0a8');
    else if (key === 'court') m = new THREE.MeshStandardMaterial({ color: '#3f86c8', roughness: 0.8 });
    else if (key === 'ground') m = tiledMaterial('grass', '#c8d896');
    else if (key === 'track') m = tiledMaterial('dirt', '#f3dcb2'); // the Gymkhana track is unpaved sandy earth
    else if (key === 'water') m = new THREE.MeshStandardMaterial({ color: '#3f7f8f', roughness: 0.15, metalness: 0.2 });
    else if (key === 'pool') m = new THREE.MeshStandardMaterial({ color: '#4fb4e6', roughness: 0.1, metalness: 0.1 });
    else if (key === 'road') m = new THREE.MeshStandardMaterial({ map: this.roadTexture(), roughness: 0.95 });
    else if (key === 'kerb') m = new THREE.MeshStandardMaterial({ map: this.kerbTexture(), roughness: 0.8 });
    else if (key === 'path') m = new THREE.MeshStandardMaterial({ color: '#bdb6a9', roughness: 0.95 });
    else if (key === 'paver') m = new THREE.MeshStandardMaterial({ map: this.paverTexture(), roughness: 0.9 });
    else if (key === 'paint') m = new THREE.MeshStandardMaterial({ color: '#f1f0ea', roughness: 0.7 });
    else if (key === 'lawn') m = tiledMaterial('grass', '#c4e6a0');
    else if (key === 'earth') m = tiledMaterial('dirt', '#c99f78');
    else if (key === 'murram') m = tiledMaterial('dirt', '#c07a55');
    else if (key === 'plot') m = new THREE.MeshStandardMaterial({ map: this.plotTexture(), roughness: 1 });
    else m = mat('#999999');
    // Ground layers sit centimetres apart; offset them in depth so they don't stripe at a distance.
    const layer = { wood: 1, grass: 2, lawn: 2, earth: 2, plot: 3, murram: 3, ground: 3, pitch: 4, court: 4, track: 5, water: 6, pool: 6, road: 7, path: 8, paver: 8, paint: 10 }[key];
    if (layer) Object.assign(m, { polygonOffset: true, polygonOffsetFactor: -layer, polygonOffsetUnits: -layer * 2 });
    this.mats[key] = m;
    return m;
  }

  // 16 m roof tile: pale concrete with two rows of blue solar panels.
  solarRoofTexture() {
    return canvasTexture(256, 256, (g, W, H) => {
      g.fillStyle = '#dcd6ca'; g.fillRect(0, 0, W, H);
      speckle(g, W, H, 900, 3);
      for (const y0 of [28, 150]) {
        g.fillStyle = '#25426f'; g.fillRect(18, y0, 220, 60);
        g.strokeStyle = '#6688b6'; g.lineWidth = 1.5;
        for (let x = 18; x <= 238; x += 18.3) { g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y0 + 60); g.stroke(); }
        g.beginPath(); g.moveTo(18, y0 + 30); g.lineTo(238, y0 + 30); g.stroke();
      }
    });
  }

  // Grey asphalt (one repeat = 4 m).
  roadTexture() {
    return canvasTexture(128, 128, (g, W, H) => {
      g.fillStyle = '#62615d'; g.fillRect(0, 0, W, H);
      speckle(g, W, H, 700, 5);
    });
  }

  // Grey interlocking concrete pavers of the avenue footpaths (one repeat = 1.2 m, stretcher bond).
  paverTexture() {
    return canvasTexture(128, 128, (g, W, H) => {
      g.fillStyle = '#8f8d87'; g.fillRect(0, 0, W, H);
      let s = 3; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      for (let row = 0; row < 6; row++) {
        for (let k = -1; k < 4; k++) {
          const x = k * 42 + (row % 2) * 21; const v = 160 + Math.floor(r() * 26);
          g.fillStyle = `rgb(${v},${v - 2},${v - 6})`; g.fillRect(x + 1.5, row * 21.33 + 1.5, 39, 18.3);
        }
      }
      speckle(g, W, H, 500, 11);
    });
  }

  // Furrowed nursery beds (South Park's south half): rows of earth and young green, one repeat = 6 m.
  plotTexture() {
    return canvasTexture(128, 128, (g, W, H) => {
      g.fillStyle = '#a97f58'; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#8d6a47' : '#b48a62'; g.fillRect(0, i * 16, W, 9); g.fillStyle = 'rgba(92,132,58,0.75)'; for (let x = 2; x < W; x += 7) g.fillRect(x, i * 16 + 10, 4, 4); }
      speckle(g, W, H, 400, 13);
    });
  }

  // Black-and-white painted kerb stones seen along the campus roads (one repeat = 2 m).
  kerbTexture() {
    return canvasTexture(64, 8, (g, W, H) => {
      g.fillStyle = '#f2f1ec'; g.fillRect(0, 0, W / 2, H);
      g.fillStyle = '#232326'; g.fillRect(W / 2, 0, W / 2, H);
    });
  }

  flushGeometry() {
    for (const { matKey, b } of this.buckets.values()) {
      if (!b.pos.length) continue;
      const mesh = new THREE.Mesh(b.geometry(), this.material(matKey));
      mesh.castShadow = matKey.startsWith('facade') || matKey === 'parapet';
      mesh.receiveShadow = true;
      this.root.add(mesh);
    }
    for (const { matKey, list } of this.shapeGeos.values()) {
      const g = mergeGeometries(list.map((x) => (x.index ? x.toNonIndexed() : x)));
      if (!g) continue;
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, this.material(matKey));
      mesh.receiveShadow = true;
      mesh.castShadow = matKey.startsWith('roof');
      this.root.add(mesh);
    }
    this.buckets.clear();
    this.shapeGeos.clear();
  }

  // Flat polygon at height y (UVs in metres / tile).
  flatShape(outer, holes, y, tile) {
    const shape = new THREE.Shape(outer.map(([x, z]) => new THREE.Vector2(x, -z)));
    for (const h of holes || []) shape.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))));
    const g = new THREE.ShapeGeometry(shape);
    g.rotateX(-Math.PI / 2);
    g.translate(0, y, 0);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / tile, uv.getY(i) / tile);
    return g;
  }

  // The ground plane, with a hole over every sunken court (pits) the detailed buildings dig.
  buildGround() {
    const [x0, x1, z0, z1] = [140 - 1700, 140 + 1700, 500 - 1800, 500 + 1800];
    const g = this.pits.length ? this.flatShape([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], this.pits.map((p) => p.poly), 0, 1) : new THREE.PlaneGeometry(3400, 3600).rotateX(-Math.PI / 2).translate(140, 0, 500);
    const uv = g.attributes.uv;
    const pos = g.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / TEX_SIZE.dirt, -pos.getZ(i) / TEX_SIZE.dirt);
    const m = new THREE.Mesh(g, tiledMaterial('dirt', '#f0dcb4'));
    m.receiveShadow = true;
    this.root.add(m);
  }

  buildAreas() {
    const Y = { wood: 0.01, grass: 0.02, ground: 0.024, pitch: 0.03, track: 0.036, water: 0.04, pool: 0.045 };
    for (const a of D.areas) {
      if (a.kind === 'shivganga') continue;
      const key = a.kind === 'pitch' && COURT_SPORTS.has(a.sport) ? 'court' : a.kind;
      const [cx, cz] = centroid(a.poly);
      const tile = key === 'track' ? TEX_SIZE.dirt : TEX_SIZE.grass;
      const holes = this.pits.filter((p) => p.poly.every(([x, z]) => inPoly(x, z, a.poly))).map((p) => p.poly);
      const cut = this.pits.filter((p) => !holes.includes(p.poly) && (p.poly.some(([x, z]) => inPoly(x, z, a.poly)) || a.poly.some(([x, z]) => inPoly(x, z, p.poly))));
      if (cut.length) console.warn(`[pits] area ${a.name || a.kind} partly overlaps a sunken court; drawn whole`);
      this.addShape(key, cx, cz, this.flatShape(a.poly, holes, Y[a.kind] ?? 0.02, tile));
    }
  }

  // ---------- roads (research/buildings/roads-paths.md) ----------
  // Half the carriageway, and half the whole cross-section (kerbs and footpaths included), of one OSM way.
  roadHalf(r) {
    const c = this.roadCls?.get(r) || (FOOT_KINDS.has(r.kind) ? 'foot' : 'town');
    return c === 'avenue' ? AV.half : c === 'drive' ? 3.5 : c === 'lane' ? 2 : r.w / 2;
  }

  roadOuter(r) {
    return this.roadCls?.get(r) === 'avenue' ? AV.half + AV.kerb + AV.foot : this.roadHalf(r);
  }

  // On the carriageway of a road other than `except` (footways don't count), within `margin` of its edge.
  carriageAt(x, z, except = null, margin = 0) {
    for (const s of this.gridNear(this.roadGrid, x, z, 40)) {
      if (s.cls === 'foot' || s.r === except) continue;
      if (segDist(x, z, s.a, s.b) < s.half + margin) return true;
    }
    return false;
  }

  // Inside the Clock Tower → Saraswati Mandir view wedge (pad widens it).
  onAxis(x, z, pad = 0) {
    const dx = AXIS_B[0] - AXIS_A[0]; const dz = AXIS_B[1] - AXIS_A[1];
    const t = ((x - AXIS_A[0]) * dx + (z - AXIS_A[1]) * dz) / AXIS_L;
    if (t < -6 || t > AXIS_L - 34) return false;
    const perp = Math.abs((x - AXIS_A[0]) * dz - (z - AXIS_A[1]) * dx) / AXIS_L;
    return perp < 5 + 0.03 * Math.max(0, t) + pad;
  }

  // A quad that always faces normal n, whatever order its corners come in.
  face(b, p0, p1, p2, p3, uvs, n) {
    const ax = p1[0] - p0[0]; const ay = p1[1] - p0[1]; const az = p1[2] - p0[2];
    const bx = p2[0] - p0[0]; const by = p2[1] - p0[1]; const bz = p2[2] - p0[2];
    const cx = ay * bz - az * by; const cy = az * bx - ax * bz; const cz = ax * by - ay * bx;
    if (cx * n[0] + cy * n[1] + cz * n[2] >= 0) b.quad(p0, p1, p2, p3, uvs, n);
    else b.quad(p0, p3, p2, p1, [uvs[0], uvs[3], uvs[2], uvs[1]], n);
  }

  buildRoads() {
    const wuv = (p, tile) => [p[0] / tile, p[2] / tile];
    for (const r of D.roads) {
      const c = this.roadCls.get(r) || (FOOT_KINDS.has(r.kind) ? 'foot' : 'town');
      if (r.name === 'T-lawns') continue; // the Saraswati Mandir walk is built with the temple
      const key = c === 'foot' ? 'path' : 'road';
      const y = c === 'foot' ? 0.058 : 0.053;
      const hw = c === 'foot' ? r.w / 2 : this.roadHalf(r);
      for (let i = 1; i < r.pts.length; i++) {
        const [x0, z0] = r.pts[i - 1];
        const [x1, z1] = r.pts[i];
        const len = Math.hypot(x1 - x0, z1 - z0);
        if (len < 0.01) continue;
        // the ground does not exist over a sunken court: no road over it
        if (this.groundAt((x0 + x1) / 2, (z0 + z1) / 2) < -0.01 && this.groundAt(x0, z0) < -0.01) continue;
        const ux = -(z1 - z0) / len; const uz = (x1 - x0) / len;
        const nx = ux * hw; const nz = uz * hw;
        const ps = [[x0 + nx, y, z0 + nz], [x1 + nx, y, z1 + nz], [x1 - nx, y, z1 - nz], [x0 - nx, y, z0 - nz]];
        this.face(this.bucket(key, x0, z0), ...ps, ps.map((p) => wuv(p, 4)), [0, 1, 0]);
        if (c === 'avenue') this.roadSides(r, [x0, z0], [x1, z1]);
        if (c === 'avenue' || c === 'drive') this.centreLine(r, [x0, z0], [x1, z1]);
      }
      // Round joints so bends don't leave notches
      for (const [x, z] of r.pts) {
        if (this.groundAt(x, z) < -0.01) continue;
        const b = this.bucket(key, x, z);
        const n = 10;
        for (let k = 0; k < n; k++) {
          const a0 = (k / n) * Math.PI * 2; const a1 = ((k + 1) / n) * Math.PI * 2;
          const ps = [[x, y, z], [x + Math.cos(a0) * hw, y, z + Math.sin(a0) * hw], [x + Math.cos(a1) * hw, y, z + Math.sin(a1) * hw], [x, y, z]];
          this.face(b, ...ps, ps.map((p) => wuv(p, 4)), [0, 1, 0]);
        }
      }
    }
    this.buildZebras();
  }

  // Raised black-and-white kerbs (0.16 m) and grey paver footpaths on both sides of an avenue segment, in 2 m
  // pieces. A piece is left out where it would cross another road's carriageway (the junctions), stand in a
  // building, or hang over a sunken court.
  roadSides(r, [x0, z0], [x1, z1]) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const tx = (x1 - x0) / len; const tz = (z1 - z0) / len;
    const ux = -tz; const uz = tx;
    const n = Math.max(1, Math.round(len / 2));
    const H = AV.kerbH; const FY = AV.footY;
    const at = (t, off) => [x0 + tx * t + ux * off, z0 + tz * t + uz * off];
    const bad = (x, z, margin, pad) => this.carriageAt(x, z, r, margin) || this.groundAt(x, z) < -0.01 || this.isBuilt(x, z, pad);
    for (let k = 0; k < n; k++) {
      const t0 = (k / n) * len; const t1 = ((k + 1) / n) * len; const tm = (t0 + t1) / 2;
      for (const s of [-1, 1]) {
        const k0 = s * AV.half; const k1 = s * (AV.half + AV.kerb); const f1 = s * (AV.half + AV.kerb + AV.foot);
        const [kx, kz] = at(tm, s * (AV.half + AV.kerb / 2));
        if (bad(kx, kz, 0.3, 0.2)) continue;
        const kb = this.bucket('kerb', kx, kz);
        const P = (t, off, y) => { const [x, z] = at(t, off); return [x, y, z]; };
        const uvTop = [[t0, 0], [t1, 0], [t1, 1], [t0, 1]];
        this.face(kb, P(t0, k0, H), P(t1, k0, H), P(t1, k1, H), P(t0, k1, H), uvTop, [0, 1, 0]);
        this.face(kb, P(t0, k0, 0), P(t1, k0, 0), P(t1, k0, H), P(t0, k0, H), [[t0, 0], [t1, 0], [t1, 0.4], [t0, 0.4]], [-ux * s, 0, -uz * s]);
        const [fx, fz] = at(tm, s * (AV.half + AV.kerb + AV.foot / 2));
        const [ex, ez] = at(tm, f1);
        if (bad(fx, fz, 0.2, 0.3) || this.isBuilt(ex, ez, 0.2)) {
          this.face(kb, P(t0, k1, 0), P(t1, k1, 0), P(t1, k1, H), P(t0, k1, H), [[t0, 0], [t1, 0], [t1, 0.4], [t0, 0.4]], [ux * s, 0, uz * s]);
          continue;
        }
        const fb = this.bucket('paver', fx, fz);
        const fp = [P(t0, k1, FY), P(t1, k1, FY), P(t1, f1, FY), P(t0, f1, FY)];
        this.face(fb, ...fp, fp.map((p) => [p[0] / 1.2, p[2] / 1.2]), [0, 1, 0]);
        const ep = [P(t0, f1, 0), P(t1, f1, 0), P(t1, f1, FY), P(t0, f1, FY)];
        this.face(fb, ...ep, ep.map((p, i) => [(i === 1 || i === 2 ? t1 : t0) / 1.2, p[1] / 1.2]), [ux * s, 0, uz * s]);
        // the kerb's back face shows above the footpath
        this.face(kb, P(t0, k1, FY), P(t1, k1, FY), P(t1, k1, H), P(t0, k1, H), [[t0, 0], [t1, 0], [t1, 0.2], [t0, 0.2]], [ux * s, 0, uz * s]);
      }
    }
  }

  // White dashed centre line (1 m dash, 2.5 m gap), stopped short of every junction.
  centreLine(r, [x0, z0], [x1, z1]) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const tx = (x1 - x0) / len; const tz = (z1 - z0) / len;
    const w = 0.06; const y = 0.056;
    for (let t = 1.2; t + 1 < len; t += 3.5) {
      const mx = x0 + tx * (t + 0.5); const mz = z0 + tz * (t + 0.5);
      if (this.carriageAt(mx, mz, r, 1.5) || this.groundAt(mx, mz) < -0.01) continue;
      const a = [x0 + tx * t, z0 + tz * t]; const b = [x0 + tx * (t + 1), z0 + tz * (t + 1)];
      const ps = [[a[0] - tz * w, y, a[1] + tx * w], [b[0] - tz * w, y, b[1] + tx * w], [b[0] + tz * w, y, b[1] - tx * w], [a[0] + tz * w, y, a[1] - tx * w]];
      this.face(this.bucket('paint', mx, mz), ...ps, [[0, 0], [1, 0], [1, 1], [0, 1]], [0, 1, 0]);
    }
  }

  // Zebra crossings and stop lines on every avenue arm of a junction (three or more arms meeting at a node).
  buildZebras() {
    const nodes = new Map();
    for (const r of D.roads) {
      if (this.roadCls.get(r) === 'foot') continue;
      r.pts.forEach(([x, z], i) => { const k = `${x},${z}`; if (!nodes.has(k)) nodes.set(k, []); nodes.get(k).push({ r, i }); });
    }
    const y = 0.057;
    let count = 0;
    for (const list of nodes.values()) {
      const arms = list.reduce((a, { r, i }) => a + (i > 0) + (i < r.pts.length - 1), 0);
      if (arms < 3) continue;
      for (const { r, i } of list) {
        if (this.roadCls.get(r) !== 'avenue') continue;
        const others = list.filter((e) => e.r !== r);
        const clear = Math.max(4, ...others.map((e) => this.roadOuter(e.r))) + 1;
        const [x, z] = r.pts[i];
        if (this.groundAt(x, z) < -0.01) continue;
        for (const j of [i - 1, i + 1]) {
          if (j < 0 || j >= r.pts.length) continue;
          const [x1, z1] = r.pts[j];
          const len = Math.hypot(x1 - x, z1 - z);
          if (len < clear + 8) continue;
          const tx = (x1 - x) / len; const tz = (z1 - z) / len; const ux = -tz; const uz = tx;
          const quad = (t0, t1, o0, o1) => {
            const P = (t, o) => [x + tx * t + ux * o, y, z + tz * t + uz * o];
            const ps = [P(t0, o0), P(t1, o0), P(t1, o1), P(t0, o1)];
            this.face(this.bucket('paint', ps[0][0], ps[0][2]), ...ps, [[0, 0], [1, 0], [1, 1], [0, 1]], [0, 1, 0]);
          };
          for (let o = -AV.half + 0.45; o < AV.half - 0.3; o += 1.0) quad(clear, clear + 3, o, o + 0.5);
          // stop line across the lanes coming in to the junction (traffic keeps left)
          quad(clear + 4.2, clear + 4.5, 0, AV.half - 0.1);
          count++;
        }
      }
    }
    this.zebraCount = count;
  }

  // ---------- lawns and open grounds (research/buildings/landscape-water.md) ----------
  // OSM has only POIs for M Lawns, S Lawns and South Park; the outlines are read off the Esri aerial with the game
  // grid. M Lawns starts east of the turning loop and its spur; South Park is bare compacted earth in the north
  // and a furrowed nursery plot in the south, stopping short of the G.D. Birla statue lawn.
  buildLawns() {
    // Props of the environment (gates, the wall, statues, Shiv Ganga, the museum lawn) go into one kit in the world
    // frame (u = x, v = z), merged per material at the end of build().
    this.envKit = new Kit(this, 'environment', { O: [0, 0], eu: [1, 0], ev: [0, 1], angle: 0 });
    this.envKeepOut = [];
    this.ashokaPts = [];
    this.envZones = [
      { name: 'M Lawns', key: 'lawn', poly: [[84, -20], [129, -20], [132, -3], [129, 16], [88, 17], [82, 2]], trees: 0.05 },
      { name: 'S Lawns', key: 'lawn', poly: [[-140, 17], [-97, 15], [-95, 48], [-137, 50]], trees: 0.05 },
      { name: 'South Park', key: 'earth', poly: [[45, 400], [110, 398], [112, 470], [46, 472]], trees: 0.04 },
      { name: 'South Park plot', key: 'plot', poly: [[46, 474], [112, 472], [113, 544], [47, 546]], trees: 0 },
    ];
    for (const z of this.envZones) {
      const [cx, cz] = centroid(z.poly);
      this.addShape(z.key, cx, cz, this.flatShape(z.poly, [], z.key === 'plot' ? 0.03 : 0.026, z.key === 'plot' ? 6 : TEX_SIZE.grass));
    }
  }

  // An open lawn or ground with its own tree rule (share of scattered trees kept), or null.
  envZoneAt(x, z) {
    return (this.envZones || []).find((q) => inPoly(x, z, q.poly)) || null;
  }

  // ---------- rooms inside real buildings ----------
  findBuilding(name) {
    return this.buildings.find((b) => b.name === name);
  }

  // Place an axis-aligned room inside the host so its door wall sits just inside the host's facade.
  // The facade is measured on the door's own line (doorOff from the room's corner), the corridor from the door
  // to the facade must stay inside the host, and the door must open onto open ground, not another building.
  // prefer: a point [x, z] to place the room near (along the facade) instead of the middle.
  fitRoom(host, w, d, side, used, doorOff, prefer = null) {
    const bb = host.bb;
    const ok = (x0, z0) => {
      for (let t = 0; t <= 1.0001; t += 0.125) {
        for (const [px, pz] of [[x0 + t * w, z0], [x0 + t * w, z0 + d], [x0, z0 + t * d], [x0 + w, z0 + t * d]]) {
          if (!inBuilding(px, pz, host)) return false;
        }
      }
      return !used.some((u) => x0 < u.x1 + 1 && x0 + w > u.x0 - 1 && z0 < u.z1 + 1 && z0 + d > u.z0 - 1);
    };
    let best = null;
    const along = side === 'south' || side === 'north' ? [bb.minX, bb.maxX] : [bb.minZ, bb.maxZ];
    const mid = prefer ? (side === 'south' || side === 'north' ? prefer[0] : prefer[1]) : (along[0] + along[1]) / 2;
    const cands = [];
    for (let v = along[0] + 1; v <= along[1] - 1; v += 1) cands.push(v);
    cands.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
    const horiz = side === 'south' || side === 'north';
    for (const c of cands) {
      // room centre line c; the door runs along line dl, and the facade is found on that line
      const dl = c - (horiz ? w : d) / 2 + doorOff;
      const hits = crossings(host.outer, horiz ? 'x' : 'z', dl).sort((p, q) => p - q);
      if (!hits.length) continue;
      const out = side === 'south' || side === 'east' ? 1 : -1;
      const at = (v) => (horiz ? [dl, v] : [v, dl]);
      // Concave hosts cross the door line several times: every place the line leaves the host is a facade.
      const edges = hits.filter((_, k) => (out > 0 ? k % 2 === 1 : k % 2 === 0));
      if (out > 0) edges.reverse();
      for (const edge of edges) {
        const [ex, ez] = at(edge + out * 1.6);
        if (this.isBuilt(ex, ez, 0.6)) continue; // door would open onto another building
        for (let inset = 0.6; inset < 14; inset += 0.4) {
          let x0; let z0;
          if (side === 'south') { x0 = c - w / 2; z0 = edge - inset - d; }
          if (side === 'north') { x0 = c - w / 2; z0 = edge + inset; }
          if (side === 'east') { z0 = c - d / 2; x0 = edge - inset - w; }
          if (side === 'west') { z0 = c - d / 2; x0 = edge + inset; }
          if (ok(x0, z0)) {
            const corridorIn = [...Array(Math.ceil(inset) + 1).keys()].every((k) => inBuilding(...at(edge - out * Math.min(inset, k + 0.3)), host));
            if (corridorIn && (!best || inset < best.inset)) best = { x0, z0, inset, edge, c };
            break;
          }
        }
      }
      if (best && best.inset < 1.5) break;
    }
    return best;
  }

  placeRooms() {
    this.roomList = [];
    this.roomOffset = {};
    this.hostCuts = new Map();
    const usedByHost = new Map();
    const school = Object.fromEntries([...ROOMS, ...BITS_ROOMS].map((r) => [r.id, r]));
    this.rooms = {};
    // A detailed building module may move a gameplay room (rooms: { id: { host, near: [x, z], y } }); y lowers it
    // into a sunken floor (the module digs the pit it stands in).
    const moved = Object.fromEntries(this.activeModules.flatMap((m) => Object.entries(m.rooms || {})));
    for (const [id, base] of Object.entries(ROOM_HOSTS)) {
      const cfg = { ...base, ...(moved[id] || {}) };
      const s = school[id];
      const host = this.findBuilding(cfg.host);
      const w = s.x1 - s.x0; const d = s.z1 - s.z0;
      const used = usedByHost.get(host) || [];
      const horizDoor = s.door.side === 'south' || s.door.side === 'north';
      const fit = this.fitRoom(host, w, d, s.door.side, used, s.door.at - (horizDoor ? s.x0 : s.z0), cfg.near);
      if (!fit) throw new Error(`Room ${id} does not fit in ${cfg.host}`);
      const dx = fit.x0 - s.x0; const dz = fit.z0 - s.z0;
      const horiz = s.door.side === 'south' || s.door.side === 'north';
      const r = { ...s, name: cfg.name, y0: cfg.y || 0, x0: fit.x0, x1: fit.x0 + w, z0: fit.z0, z1: fit.z0 + d, door: { side: s.door.side, at: s.door.at + (horiz ? dx : dz) }, host: cfg.host };
      used.push(r);
      usedByHost.set(host, used);
      this.rooms[id] = r;
      this.roomList.push(r);
      this.roomOffset[id] = { dx, dz };
      host.isHost = true;
      if (!this.hostCuts.has(host)) this.hostCuts.set(host, []);
      // door corridor through the facade
      const at = r.door.at; const half = 1.35;
      let cut;
      if (s.door.side === 'south') cut = { minX: at - half, maxX: at + half, minZ: r.z1 - 0.3, maxZ: fit.edge + 2 };
      if (s.door.side === 'north') cut = { minX: at - half, maxX: at + half, minZ: fit.edge - 2, maxZ: r.z0 + 0.3 };
      if (s.door.side === 'east') cut = { minX: r.x1 - 0.3, maxX: fit.edge + 2, minZ: at - half, maxZ: at + half };
      if (s.door.side === 'west') cut = { minX: fit.edge - 2, maxX: r.x0 + 0.3, minZ: at - half, maxZ: at + half };
      cut.room = r;
      cut.side = s.door.side;
      const ex = { south: [at, fit.edge + 1.6], north: [at, fit.edge - 1.6], east: [fit.edge + 1.6, at], west: [fit.edge - 1.6, at] }[s.door.side];
      r.exit = new THREE.Vector3(ex[0], 0, ex[1]);
      this.hostCuts.get(host).push(cut);
    }
    for (const r of this.roomList) this.withOffset(0, 0, () => this.buildRoom(r), r.y0);
    // Interiors (school coordinates) moved into place
    const interior = { classroom: 'interiorClassroomDado', staffroom: 'interiorStaffroom', principal: 'interiorPrincipal', library: 'interiorLibrary', sciencelab: 'interiorLab', complab: 'interiorComplab', auditorium: 'interiorAuditorium', reception: 'interiorReception', classroomB: 'interiorClassroomB' };
    for (const [id, fn] of Object.entries(interior)) {
      const { dx, dz } = this.roomOffset[id];
      this.withOffset(dx, dz, () => {
        this.roomLights(school[id]);
        this[fn]();
      }, this.rooms[id].y0);
    }
    this.interiorMess(this.rooms.mess);
    this.roomRefs = this.rooms;
  }

  // Long tables with benches, the serving counter at the back (four steel tubs with the meal being served,
  // thalis and a water jug; lids on between meals), thalis on the tables at mealtimes, the Pitstop extras
  // counter by the door and a menu board inside and outside. E at the counter eats the current meal.
  interiorMess(r) {
    const cz = (r.z0 + r.z1) / 2;
    const steel = []; const lids = []; const food = []; const stall = [];
    const put = (list, g, x, y, z, color) => { const geo = g.index ? g.toNonIndexed() : g; geo.translate(x, y, z); if (color) paint(geo, color); list.push(geo); };
    const merged = (list, material) => { const m = new THREE.Mesh(mergeGeometries(list), material); m.castShadow = true; m.receiveShadow = true; this.scene.add(m); return m; };
    // serving counter with four tubs; the food in them changes with the meal (setMessFood)
    this.box(r.x1 - 1.2, 0, cz, 0.9, 1.0, 6, '#b8c2c8', { metalness: 0.6, roughness: 0.35 });
    this.messTubs = [];
    for (const dz of [-2, -0.7, 0.6, 1.9]) {
      put(steel, new THREE.CylinderGeometry(0.35, 0.3, 0.25, 16), r.x1 - 1.2, 1.125, cz + dz);
      put(lids, new THREE.CylinderGeometry(0.2, 0.37, 0.12, 16), r.x1 - 1.2, 1.31, cz + dz);
      put(lids, new THREE.CylinderGeometry(0.04, 0.04, 0.06, 8), r.x1 - 1.2, 1.4, cz + dz);
      const top = new THREE.Mesh(new THREE.CircleGeometry(0.31, 18), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.75 }));
      top.rotation.x = -Math.PI / 2;
      top.position.set(r.x1 - 1.2, 1.244, cz + dz);
      this.scene.add(top);
      this.messTubs.push(top);
    }
    // a stack of thalis, a water jug and glasses at the end of the counter; rotis in a basket at mealtimes
    for (let i = 0; i < 8; i++) put(steel, new THREE.CylinderGeometry(0.17, 0.15, 0.018, 18), r.x1 - 1.2, 1.0 + i * 0.02, cz + 2.65);
    put(steel, new THREE.CylinderGeometry(0.09, 0.11, 0.3, 14), r.x1 - 1.2, 1.15, cz - 2.65);
    for (const dx of [-0.25, 0.25]) put(steel, new THREE.CylinderGeometry(0.035, 0.03, 0.09, 10), r.x1 - 1.2 + dx, 1.045, cz - 2.6);
    put(food, new THREE.CylinderGeometry(0.2, 0.16, 0.1, 14), r.x1 - 1.2, 1.05, cz - 1.35, '#a8834f');
    for (let i = 0; i < 6; i++) put(food, new THREE.CylinderGeometry(0.11, 0.11, 0.01, 14), r.x1 - 1.2, 1.1 + i * 0.012, cz - 1.35, i % 2 ? '#c9934a' : '#d8a35a');
    // today's menu above the counter (the same board as outside)
    this.messMenuTex = canvasTexture(512, 640, () => {}, false);
    const boardMat = new THREE.MeshStandardMaterial({ map: this.messMenuTex, roughness: 0.9 });
    const inBoard = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.875), boardMat);
    inBoard.rotation.y = -Math.PI / 2;
    inBoard.position.set(r.x1 - 0.08, 2.1, cz);
    this.scene.add(inBoard);
    this.box(r.x1 - 0.05, 1.1, cz, 0.04, 2.0, 1.62, '#5b3d24', { collide: false });
    // tables and benches; a thali with food and a steel glass at every seat
    this.spots.mess = [];
    for (const tx of [r.x0 + 3.5, r.x0 + 7.5]) {
      for (const tz of [r.z0 + 1.8, r.z0 + 7.2]) {
        this.box(tx, 0, tz, 3.0, 0.76, 0.9, null, { tex: 'wood', tint: '#b08a5a' });
        for (const s of [-1, 1]) {
          this.box(tx, 0, tz + s * 0.85, 3.0, 0.45, 0.3, '#6b4a2e', { collide: false });
          for (const ox of [-1, 0, 1]) {
            this.spots.mess.push(new THREE.Vector3(tx + ox, 0, tz + s * 0.85));
            const px = tx + ox; const pz = tz + s * 0.24;
            put(food, new THREE.CylinderGeometry(0.17, 0.15, 0.018, 18), px, 0.77, pz, '#c3c8cd');
            for (const [fx, fz, c] of [[-0.07, -0.05, '#e3a33a'], [0.07, -0.05, '#f7f4ea'], [0, 0.07, '#d98a2b']]) put(food, new THREE.CylinderGeometry(0.05, 0.05, 0.022, 10), px + fx, 0.785, pz + fz * s, c);
            put(food, new THREE.CylinderGeometry(0.075, 0.075, 0.008, 12), px + 0.02, 0.8, pz - 0.01 * s, '#c9934a');
            put(steel, new THREE.CylinderGeometry(0.035, 0.03, 0.09, 10), px + 0.24, 0.805, pz - 0.05 * s);
          }
        }
      }
    }
    this.tubeLight(r.x0 + 5.5, r.z0 + 0.3);
    this.tubeLight(r.x0 + 5.5, r.z1 - 0.3);
    this.ceilingFan(r.x0 + 3.5, cz);
    this.ceilingFan(r.x0 + 7.5, cz);
    this.interactable('mess', r.x1 - 2.1, cz, 'Eat at the mess', { radius: 2.2 });
    this.spots.messStaff = new THREE.Vector3(r.x1 - 0.5, 0, cz);

    // the door wall: "in" points into the hall, "along" runs along the wall
    const out = { west: [-1, 0], east: [1, 0], south: [0, 1], north: [0, -1] }[r.door.side];
    const inn = [-out[0], -out[1]]; const along = [-out[1], out[0]];
    const wallAt = { west: [r.x0, r.door.at], east: [r.x1, r.door.at], south: [r.door.at, r.z1], north: [r.door.at, r.z0] }[r.door.side];
    const at = (i, a) => [wallAt[0] + inn[0] * i + along[0] * a, wallAt[1] + inn[1] * i + along[1] * a];
    const abox = (i, a, y, depth, len, h, color, opts) => { const [x, z] = at(i, a); const ux = Math.abs(along[0]) > 0.5; this.box(x, y, z, ux ? len : depth, h, ux ? depth : len, color, opts); };
    const facing = (dir) => Math.atan2(dir[0], dir[1]);
    // Pitstop: an extras counter beside the door, a fridge of cold drinks and a sign
    abox(0.65, 2.55, 0, 0.7, 2.2, 1.0, '#8a5a34');
    abox(0.65, 2.55, 1.0, 0.78, 2.28, 0.05, '#e9e2d4', { collide: false });
    for (const [k, c] of ['#f2c14e', '#e85d2a', '#7fb069', '#f7f4ea', '#c0392b', '#3d7ea6'].entries()) {
      const [x, z] = at(0.55, 1.75 + k * 0.32);
      put(stall, new THREE.BoxGeometry(0.2, 0.14 + (k % 3) * 0.05, 0.2), x, 1.12 + (k % 3) * 0.025, z, c);
    }
    abox(0.4, 4.1, 0, 0.7, 0.7, 1.9, '#eef1f3');
    { const [x, z] = at(0.76, 4.1); const p = new THREE.PlaneGeometry(0.58, 1.5); p.rotateY(facing(inn)); put(stall, p, x, 1.0, z, '#bfe3ff'); }
    for (let row = 0; row < 3; row++) for (let k = 0; k < 4; k++) { const [x, z] = at(0.74, 3.9 + k * 0.13); put(stall, new THREE.CylinderGeometry(0.03, 0.03, 0.18, 8), x, 0.45 + row * 0.45, z, ['#c0392b', '#2e7d32', '#f39c12', '#1565c0'][k]); }
    const signTex = canvasTexture(512, 128, (g, W, H) => {
      g.fillStyle = '#1d2a44'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#f2c14e'; g.fillRect(0, H - 10, W, 10);
      g.fillStyle = '#ffffff'; g.font = 'bold 64px system-ui, sans-serif'; g.textBaseline = 'middle'; g.fillText('PITSTOP', 24, 52);
      g.fillStyle = '#f2c14e'; g.font = '28px system-ui, sans-serif'; g.fillText('extras · maggi · omelette · lassi', 24, 98);
    }, false);
    { const [x, z] = at(0.3, 2.55); const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.5), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.8, emissive: '#ffffff', emissiveMap: signTex, emissiveIntensity: 0.35 })); sign.rotation.y = facing(inn); sign.position.set(x, 2.25, z); this.scene.add(sign); }
    { const [x, z] = at(1.5, 2.55); this.interactable('pitstop', x, z, 'Buy extras at Pitstop', { radius: 1.5 }); }
    this.label('Pitstop · extras', ...(() => { const [x, z] = at(0.4, 2.55); return [x, 2.85, z]; })(), { height: 0.34 });
    // the menu board outside, beside the door (r.exit is 1.6 m out from the facade)
    {
      const x = r.exit.x - out[0] * 0.9 + along[0] * 2.6; const z = r.exit.z - out[1] * 0.9 + along[1] * 2.6;
      const board = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.5), boardMat);
      board.rotation.y = facing(out);
      board.position.set(x + out[0] * 0.03, 1.65, z + out[1] * 0.03);
      this.scene.add(board);
      const ux = Math.abs(along[0]) > 0.5;
      this.box(x, 0.85, z, ux ? 1.32 : 0.05, 1.62, ux ? 0.05 : 1.32, '#5b3d24', { collide: false });
      for (const d of [-0.62, 0.62]) this.box(x + along[0] * d, 0, z + along[1] * d, 0.08, 2.5, 0.08, '#4a3020');
      this.interactable('messmenu', x + out[0] * 1.0, z + out[1] * 1.0, 'Read the mess menu', { radius: 1.6 });
    }
    this.messSteel = merged(steel, mat('#c9ced3', { metalness: 0.7, roughness: 0.3 }));
    this.messLids = merged(lids, mat('#c9ced3', { metalness: 0.7, roughness: 0.3 }));
    const vc = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });
    this.messFood = merged(food, vc);
    merged(stall, vc);
    this.setMessFood(null);
  }

  // The meal being served ('breakfast' | 'lunch' | 'dinner'), or null: lids on, no thalis on the tables.
  setMessFood(meal) {
    if (!this.messTubs) return;
    this.messLids.visible = !meal;
    this.messFood.visible = !!meal;
    this.messTubs.forEach((top, i) => { top.visible = !!meal; if (meal) top.material.color.set(COUNTER_FOOD[meal][i]); });
  }

  // Redraw the menu board (inside and outside): { day, menu: { breakfast, lunch, dinner }, times, now }.
  setMessBoard({ day, menu, times, now }) {
    const tex = this.messMenuTex;
    if (!tex) return;
    const c = tex.image; const g = c.getContext('2d'); const W = c.width; const H = c.height;
    g.fillStyle = '#21402f'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#8a6a3c'; g.lineWidth = 14; g.strokeRect(7, 7, W - 14, H - 14);
    g.fillStyle = '#ffffff'; g.textBaseline = 'top';
    g.font = 'bold 40px system-ui, sans-serif'; g.fillText('VKB MESS', 32, 30);
    g.font = '24px system-ui, sans-serif'; g.fillStyle = '#d7e6da'; g.fillText(`Today's menu · day ${day + 1}`, 32, 80);
    const wrap = (text, x, y, width, lh) => {
      let line = '';
      for (const w of text.split(' ')) { const t = line ? `${line} ${w}` : w; if (g.measureText(t).width > width && line) { g.fillText(line, x, y); y += lh; line = w; } else line = t; }
      g.fillText(line, x, y); return y + lh;
    };
    let y = 130;
    for (const meal of ['breakfast', 'lunch', 'dinner']) {
      const on = now === meal;
      if (on) { g.fillStyle = 'rgba(242,193,78,0.22)'; g.fillRect(20, y - 10, W - 40, 150); }
      g.fillStyle = on ? '#f2c14e' : '#ffffff'; g.font = 'bold 30px system-ui, sans-serif';
      g.fillText(`${meal[0].toUpperCase()}${meal.slice(1)}${on ? ' · NOW' : ''}`, 32, y);
      g.fillStyle = '#cfe0d2'; g.font = '22px system-ui, sans-serif'; g.fillText(times[meal] || '', W - 190, y + 6);
      g.fillStyle = '#ffffff'; g.font = '26px system-ui, sans-serif';
      wrap(menu[meal], 32, y + 44, W - 64, 32);
      y += 160;
    }
    g.fillStyle = '#f2c14e'; g.font = '22px system-ui, sans-serif'; g.fillText('Extras at Pitstop, by the door', 32, H - 44);
    tex.needsUpdate = true;
  }

  // Run school-coordinate building code, then shift everything it created by (dx, dz).
  withOffset(dx, dz, fn, dy = 0) {
    const prev = this.scene;
    const g = new THREE.Group();
    g.position.set(dx, dy, dz);
    prev.add(g);
    this.scene = g;
    const c0 = this.colliders.length;
    const i0 = this.interactables.length;
    const before = new Map(Object.entries(this.spots));
    try { fn(); } finally { this.scene = prev; }
    for (const c of this.colliders.slice(c0)) { c.minX += dx; c.maxX += dx; c.minZ += dz; c.maxZ += dz; c.minY += dy; c.maxY += dy; }
    for (const it of this.interactables.slice(i0)) { it.pos.x += dx; it.pos.z += dz; it.pos.y += dy; }
    const shift = (v) => { if (v instanceof THREE.Vector3) { v.x += dx; v.y += dy; v.z += dz; } else if (Array.isArray(v)) v.forEach(shift); };
    for (const [k, v] of Object.entries(this.spots)) if (before.get(k) !== v) shift(v);
    return g;
  }

  // ---------- NAB passages ----------
  // Open both facades where each crossing meets them; the walls above the openings stay.
  planPassages() {
    this.passages = [];
    for (const cfg of NAB_PASSAGES) {
      const host = this.findBuilding(cfg.host);
      const xs = crossings(host.outer, 'z', cfg.z).sort((a, b) => a - b);
      if (xs.length !== 2) throw new Error(`NAB passage at z=${cfg.z} does not cross ${cfg.host} cleanly`);
      const [x0, x1] = xs;
      const z0 = cfg.z - PASSAGE_HALF; const z1 = cfg.z + PASSAGE_HALF;
      for (const r of this.roomList) {
        if (r.host === cfg.host && r.x0 < x1 && r.x1 > x0 && r.z0 < z1 + 1 && r.z1 > z0 - 1) throw new Error(`NAB passage at z=${cfg.z} runs into ${r.name}`);
      }
      const west = [x0 - 2, cfg.z]; const east = [x1 + 2, cfg.z];
      const p = { ...cfg, x0, x1, minX: x0 - 2.5, maxX: x1 + 2.5, minZ: z0, maxZ: z1, a: cfg.outer === 'west' ? west : east, b: cfg.outer === 'west' ? east : west };
      this.passages.push(p);
      if (!this.hostCuts.has(host)) this.hostCuts.set(host, []);
      for (const x of [x0, x1]) this.hostCuts.get(host).push({ minX: x - 1.5, maxX: x + 1.5, minZ: z0, maxZ: z1, passage: p });
    }
  }

  // Side walls, ceiling and paving inside each crossing, so the hollow block stays closed off.
  buildPassages() {
    const wall = { tex: 'plaster', tint: '#cfc6b4', collide: true };
    for (const p of this.passages) {
      const len = p.x1 - p.x0; const mx = (p.x0 + p.x1) / 2;
      for (const z of [p.minZ, p.maxZ]) this.box(mx, 0, z, len, 2.7, 0.25, null, wall);
      this.box(mx, 2.7, p.z, len + 0.4, 0.3, PASSAGE_HALF * 2 + 0.25, null, { ...wall, collide: false });
      this.box(mx, 0, p.z, len + 3, 0.04, PASSAGE_HALF * 2 - 0.1, null, { tex: 'concrete', tint: '#d9d2c4', collide: false });
      this.label(p.name.replace(/ \(.*/, ''), p.a[0], 3.3, p.z, { height: 0.42 });
    }
  }

  // ---------- buildings ----------
  // The detailed buildings (js/world/buildings/registry.js). ?nomodules leaves them all as plain blocks and
  // ?only=<id,id> builds just those. A module that fails falls back to its plain block, so the campus still loads.
  buildModules() {
    this.modules = [];
    this.owned = new Set();
    for (const m of this.activeModules) {
      const bs = m.osm.map((n) => this.findBuilding(n));
      if (bs.some((b) => !b)) { console.error(`[building ${m.id}] missing OSM footprint`, m.osm); continue; }
      const kit = new Kit(this, m.id, m.frame ? m.frame(bs) : fitFrame(bs[0].outer));
      const c0 = this.colliders.length; const i0 = this.interactables.length; const p0 = this.pits.length;
      const ctx = { campus: this, buildings: bs, rooms: this.roomList.filter((r) => m.osm.includes(r.host)), cuts: bs.flatMap((b) => this.hostCuts.get(b) || []), passages: this.passages.filter((p) => m.osm.includes(p.host)), D };
      try {
        m.build(kit, ctx);
        kit.finish();
      } catch (e) {
        console.error(`[building ${m.id}] failed, using the plain block:`, e);
        this.colliders.length = c0; this.interactables.length = i0; this.pits.length = p0;
        for (const g of [...Object.values(kit.groups), ...(kit.sprites || [])]) g.removeFromParent();
        continue;
      }
      for (const b of bs) b.module = m.id;
      for (const o of m.owns || []) this.owned.add(o);
      this.modules.push({ m, kit });
    }
  }

  // Height of the bare ground at (x, z): 0, or the floor of a sunken court.
  groundAt(x, z) {
    for (const p of this.pits) if (x > p.minX && x < p.maxX && z > p.minZ && z < p.maxZ && inPoly(x, z, p.poly)) return p.y;
    return 0;
  }

  // Where someone standing at height y over (x, z) has their feet: the ground (or a sunken court's floor), raised by
  // any walkable surface (stair tread, landing, upper floor) they can step onto from y. The player's rule
  // (player.js floorAt): a surface counts if its top is no more than 0.7 m above y. Used by NPCs and the film, so
  // people walk down the Rotunda, NAB and hostel stairs instead of floating at grade.
  floorAt(x, z, y = 0) {
    const all = this.classroomColliders ? this.colliders.length + this.classroomColliders.length : this.colliders.length;
    if (!this.walkGrid || this.walkGrid.count !== all || this.walkGrid.cc !== this.classroomColliders) {
      const grid = new Map();
      for (const c of this.colliders) if (c.walkable) this.gridInsert(grid, c, c, 4);
      for (const c of this.classroomColliders || []) if (c.walkable) this.gridInsert(grid, c, c, 4);
      this.walkGrid = { grid, count: all, cc: this.classroomColliders };
    }
    let f = this.groundAt(x, z);
    for (const c of this.walkGrid.grid.get(`${Math.floor(x / 4)},${Math.floor(z / 4)}`) || []) {
      if (c.enabled === false || c.maxY <= f || c.maxY > y + 0.7) continue;
      if (x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ) f = c.maxY;
    }
    return f;
  }

  // The detailed building (module and kit) whose footprint holds (x, z), if any.
  moduleAt(x, z, pad = 0) {
    return (this.modules || []).find(({ kit }) => kit.distance(x, z) <= pad) || null;
  }

  buildBuildings() {
    const skip = new Set(['Saraswati Temple']);
    for (const b of this.buildings) {
      if (skip.has(b.name) || b.module || envBuilt(b)) continue;
      const env = ENV_STYLE[b.name];
      const kind = env?.facade || facadeOf(b);
      const fac = facadeMaterial(kind);
      const h = env?.h || (b.inCampus ? b.h : Math.min(b.h, 7));
      const [cx, cz] = centroid(b.outer);
      const cuts = this.hostCuts.get(b) || [];
      for (const ring of b.hostel ? [b.outer] : [b.outer, ...b.holes]) this.buildWallRing(ring, h, `facade:${kind}`, fac, cx, cz, cuts, b.inCampus);
      const roof = env?.roof || roofOf(b);
      this.addShape(roof, cx, cz, this.flatShape(b.outer, [...b.holes, ...(b.roofHoles || [])], h, roof === 'roofSolar' ? 16 : roof === 'roofGreen' ? TEX_SIZE.grass : 4));
      if (!b.hostel) for (const hole of b.holes) this.addShape('grass', cx, cz, this.flatShape(hole, [], 0.03, TEX_SIZE.grass)); // Krishna's courtyards are concrete
      for (const cut of cuts) if (cut.room) this.buildJambs(cut, h);
      // domed corner kiosks on the Main Building wings
      if (b.name?.startsWith('Main Building (')) for (const [x, z] of b.outer) this.chhatri(x, h + 0.9, z, 1.4, cx, cz);
    }
  }

  // Small domed pavilion (chhatri): four posts, a slab and a dome, merged into the parapet geometry.
  chhatri(x, y, z, r, cx = x, cz = z) {
    const parts = [];
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const post = new THREE.BoxGeometry(0.22 * r, 1.6 * r, 0.22 * r);
      post.translate(x + dx * r * 0.75, y + 0.8 * r, z + dz * r * 0.75);
      parts.push(post);
    }
    const slab = new THREE.BoxGeometry(2 * r, 0.18 * r, 2 * r);
    slab.translate(x, y + 1.69 * r, z);
    const dome = new THREE.SphereGeometry(0.85 * r, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    dome.translate(x, y + 1.78 * r, z);
    const tip = new THREE.ConeGeometry(0.12 * r, 0.6 * r, 6);
    tip.translate(x, y + 2.9 * r, z);
    for (const p of [...parts, slab, dome, tip]) this.addShape('parapet', cx, cz, p.index ? p.toNonIndexed() : p);
  }

  buildWallRing(ring, h, facKey, fac, cx, cz, cuts, detailed) {
    const n = ring.length;
    let u = 0;
    const b = this.bucket(facKey, cx, cz);
    const par = this.bucket('parapet', cx, cz);
    const pieceLen = 3;
    for (let i = 0; i < n; i++) {
      const p0 = ring[i]; const p1 = ring[(i + 1) % n];
      const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      if (len < 0.05) continue;
      const nrm = [-(p1[1] - p0[1]) / len, 0, (p1[0] - p0[0]) / len];
      const pieces = Math.max(1, Math.ceil(len / (cuts.length ? 0.5 : pieceLen)));
      for (let k = 0; k < pieces; k++) {
        const t0 = k / pieces; const t1 = (k + 1) / pieces;
        const a = [p0[0] + (p1[0] - p0[0]) * t0, p0[1] + (p1[1] - p0[1]) * t0];
        const c = [p0[0] + (p1[0] - p0[0]) * t1, p0[1] + (p1[1] - p0[1]) * t1];
        const mx = (a[0] + c[0]) / 2; const mz = (a[1] + c[1]) / 2;
        const segLen = len / pieces;
        const cutHit = cuts.find((q) => mx > q.minX && mx < q.maxX && mz > q.minZ && mz < q.maxZ);
        const u0 = u / fac.bay; const u1 = (u + segLen) / fac.bay;
        u += segLen;
        if (cutHit) {
          // keep the wall above the doorway
          b.quad([a[0], 2.7, a[1]], [c[0], 2.7, c[1]], [c[0], h, c[1]], [a[0], h, a[1]], [[u0, 2.7 / fac.floor], [u1, 2.7 / fac.floor], [u1, h / fac.floor], [u0, h / fac.floor]], nrm);
          continue;
        }
        b.quad([a[0], 0, a[1]], [c[0], 0, c[1]], [c[0], h, c[1]], [a[0], h, a[1]], [[u0, 0], [u1, 0], [u1, h / fac.floor], [u0, h / fac.floor]], nrm);
        this.colliders.push({ minX: Math.min(a[0], c[0]) - 0.25, maxX: Math.max(a[0], c[0]) + 0.25, minZ: Math.min(a[1], c[1]) - 0.25, maxZ: Math.max(a[1], c[1]) + 0.25, minY: 0, maxY: h, walkable: false, enabled: true, wall: true });
      }
      if (detailed) par.quad([p0[0], h, p0[1]], [p1[0], h, p1[1]], [p1[0], h + 0.9, p1[1]], [p0[0], h + 0.9, p0[1]], [[0, 0], [1, 0], [1, 1], [0, 1]], nrm);
    }
  }

  // Short side walls between the facade opening and the room's door, so the hollow host stays closed.
  buildJambs(cut, h) {
    const r = cut.room;
    const opt = { tex: 'plaster', tint: '#e9d3a4', collide: true };
    const at = r.door.at;
    if (cut.side === 'south' || cut.side === 'north') {
      const z0 = cut.side === 'south' ? r.z1 : cut.minZ;
      const z1 = cut.side === 'south' ? cut.maxZ - 2 : r.z0;
      const len = Math.max(0.3, z1 - z0);
      for (const x of [at - 1.4, at + 1.4]) this.box(x, 0, (z0 + z1) / 2, 0.25, 2.7, len, null, opt);
      this.box(at, 2.7, (z0 + z1) / 2, 3.05, 0.25, len, null, { ...opt, collide: false });
    } else {
      const x0 = cut.side === 'east' ? r.x1 : cut.minX;
      const x1 = cut.side === 'east' ? cut.maxX - 2 : r.x0;
      const len = Math.max(0.3, x1 - x0);
      for (const z of [at - 1.4, at + 1.4]) this.box((x0 + x1) / 2, 0, z, len, 2.7, 0.25, null, opt);
      this.box((x0 + x1) / 2, 2.7, at, len, 0.25, 3.05, null, { ...opt, collide: false });
    }
  }

  // ---------- landmarks ----------
  poi(name) {
    const p = D.pois.find((q) => q.name === name);
    return p ? new THREE.Vector3(p.x, 0, p.z) : null;
  }

  // Rotunda plaza paving: slate-blue and pink sandstone star inside a ring of lotus petals on beige stone.
  rotundaTexture() {
    return canvasTexture(1024, 1024, (g, W) => {
      const c = W / 2;
      const at = (r, a) => [c + Math.sin(a) * r, c - Math.cos(a) * r];
      const fillPoly = (pts, col) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = col; g.fill(); };
      g.fillStyle = '#d2bea2'; g.fillRect(0, 0, W, W);
      for (let k = 0; k < 16; k++) { // lotus petals
        const a = (k / 16) * Math.PI * 2;
        fillPoly([at(335, a - 0.17), at(430, a - 0.13), at(505, a), at(430, a + 0.13), at(335, a + 0.17)], k % 2 ? '#bf7f77' : '#cf968c');
      }
      const star = [];
      for (let k = 0; k < 16; k++) star.push(at(k % 2 ? 160 : 330, (k / 16) * Math.PI * 2));
      fillPoly(star, '#b97a72');
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; fillPoly([at(160, a - Math.PI / 8), at(330, a), at(160, a + Math.PI / 8), at(215, a)], '#4e6380'); }
      const inner = [];
      for (let k = 0; k < 16; k++) inner.push(at(k % 2 ? 60 : 150, (k / 16) * Math.PI * 2 + Math.PI / 8));
      fillPoly(inner, '#e2cfb5');
      g.strokeStyle = '#efe4d4'; g.lineWidth = 4;
      for (let k = 0; k < 16; k++) { const [x, y] = at(505, (k / 16) * Math.PI * 2); g.beginPath(); g.moveTo(c, c); g.lineTo(x, y); g.stroke(); }
      for (const r of [150, 335, 505]) { g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.stroke(); }
      g.fillStyle = '#4e6380'; g.beginPath(); g.arc(c, c, 26, 0, Math.PI * 2); g.fill();
    }, false);
  }

  // Buff sandstone wall with blind arched niches (one repeat = 3.2 m bay).
  nicheTexture() {
    return canvasTexture(128, 112, (g, W, H) => {
      g.fillStyle = '#e4cb94'; g.fillRect(0, 0, W, H);
      speckle(g, W, H, 300, 9);
      g.fillStyle = '#c9a66a'; archPath(g, W * 0.3, H * 0.28, W * 0.4, H * 0.72); g.fill();
      g.fillStyle = '#b18f58'; archPath(g, W * 0.34, H * 0.34, W * 0.32, H * 0.66); g.fill();
      g.fillStyle = '#f4ead4'; g.fillRect(0, 0, W, H * 0.08);
    });
  }

  buildRotunda() {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(24, 64), new THREE.MeshStandardMaterial({ map: this.rotundaTexture(), roughness: 0.85 }));
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(0, 0.07, 0);
    disc.receiveShadow = true;
    this.root.add(disc);
    const ring = new THREE.Mesh(new THREE.RingGeometry(24, 26.4, 64), mat('#e8dcc6'));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.075, 0);
    this.root.add(ring);
    // Curved enclosure wall; open to the NAB lawns in the south, with gaps north (Clock Tower) and east/west.
    const R = 26.4; const H = 2.8;
    const nicheTex = this.nicheTexture();
    const wallMat = new THREE.MeshStandardMaterial({ map: nicheTex, roughness: 0.9, side: THREE.DoubleSide });
    const capMat = mat('#f4ead4');
    const arcs = [[0.55, Math.PI / 2 - 0.15], [Math.PI / 2 + 0.15, Math.PI - 0.21], [Math.PI + 0.21, 1.5 * Math.PI - 0.15], [1.5 * Math.PI + 0.15, 2 * Math.PI - 0.55]];
    for (const [t0, t1] of arcs) {
      const len = t1 - t0;
      const geo = new THREE.CylinderGeometry(R, R, H, Math.ceil(len * 24), 1, true, t0, len);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) * len * R) / 3.2);
      const wall = new THREE.Mesh(geo, wallMat);
      wall.position.y = H / 2;
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.root.add(wall);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.35, R + 0.35, 0.3, Math.ceil(len * 24), 1, true, t0, len), capMat);
      cap.position.y = H + 0.15;
      this.root.add(cap);
      for (let t = t0; t <= t1 + 1e-6; t += 1.4 / R) {
        const x = Math.sin(t) * R; const z = Math.cos(t) * R;
        this.colliders.push({ minX: x - 0.6, maxX: x + 0.6, minZ: z - 0.6, maxZ: z + 0.6, minY: 0, maxY: H, walkable: false, enabled: true });
      }
    }
    this.palmPts ||= [];
    for (const s of [-1, 1]) this.palmPts.push([Math.sin(s * 0.62) * 29.5, Math.cos(s * 0.62) * 29.5], [Math.sin(s * 0.75) * 33, Math.cos(s * 0.75) * 33]);
    // flowerbeds either side (the red bougainvillea beds from the aerial view)
    for (const sx of [-1, 1]) {
      const bed = new THREE.Mesh(new THREE.CircleGeometry(9, 24, sx > 0 ? -0.4 : Math.PI - 0.6, 1.0), mat('#b8323a', { roughness: 0.95 }));
      bed.rotation.x = -Math.PI / 2;
      bed.position.set(sx * 25, 0.08, -18);
      this.root.add(bed);
    }
    this.spots.assembly = [];
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      const rr = 11 + (i % 2) * 4;
      this.spots.assembly.push(new THREE.Vector3(Math.cos(a) * rr, 0, Math.sin(a) * rr));
    }
    this.spots.assemblyPlayer = new THREE.Vector3(0, 0, 14);
  }

  // The Clock Tower rises from the centre of the Main Building's south front: a slender cream-white shaft with
  // recessed vertical slots, a clock stage, a stepped top and a small dome (drone footage and the 360° tour).
  buildClockTowerAt() {
    const p = this.poi('BITS Clock Tower');
    const cream = '#f3eee2';
    // projecting entrance block with a maroon-framed doorway
    this.box(p.x, 0, p.z + 3, 13, 15, 12, null, { tex: 'plasterWhite', tint: cream });
    this.box(p.x, 15, p.z + 3, 13.6, 0.6, 12.6, cream, { collide: false });
    this.box(p.x, 0, p.z + 9.05, 3.6, 4.6, 0.2, '#4a2622', { collide: false });
    for (const s of [-1, 1]) this.box(p.x + s * 2.4, 0, p.z + 9.2, 0.7, 6, 0.5, '#8a2f2a', { collide: false });
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.z);
    this.root.add(g);
    const add = (geo, m, y) => { const mesh = new THREE.Mesh(geo, m); mesh.position.y = y; mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); return mesh; };
    const plain = mat(cream, { roughness: 0.8 });
    const slotTex = canvasTexture(128, 512, (c, W, H) => {
      c.fillStyle = cream; c.fillRect(0, 0, W, H);
      speckle(c, W, H, 300, 4);
      c.fillStyle = '#e2dac8'; c.fillRect(0, 0, 10, H); c.fillRect(W - 10, 0, 10, H);
      c.fillStyle = '#d9cfba'; c.fillRect(W * 0.36, 0, W * 0.28, H);
      c.fillStyle = '#3d454d'; c.fillRect(W * 0.42, 6, W * 0.16, H - 12);
      c.fillStyle = cream; for (let y = 40; y < H; y += 42) c.fillRect(W * 0.42, y, W * 0.16, 4);
    }, false);
    const slotMat = new THREE.MeshStandardMaterial({ map: slotTex, roughness: 0.8 });
    add(new THREE.BoxGeometry(7, 26, 7), [slotMat, slotMat, plain, plain, slotMat, slotMat], 15 + 13);
    add(new THREE.BoxGeometry(7.6, 0.5, 7.6), plain, 41.2);
    add(new THREE.BoxGeometry(7.4, 5.2, 7.4), plain, 44);
    const dial = canvasTexture(256, 256, (c, W) => {
      const m = W / 2;
      c.fillStyle = '#fbf8f0'; c.beginPath(); c.arc(m, m, m - 2, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#2b2b2b'; c.lineWidth = 8; c.stroke();
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; c.lineWidth = 6; c.beginPath(); c.moveTo(m + Math.sin(a) * (m - 14), m - Math.cos(a) * (m - 14)); c.lineTo(m + Math.sin(a) * (m - 34), m - Math.cos(a) * (m - 34)); c.stroke(); }
      c.lineWidth = 9; c.beginPath(); c.moveTo(m, m); c.lineTo(m + 46, m - 26); c.stroke();
      c.lineWidth = 6; c.beginPath(); c.moveTo(m, m); c.lineTo(m - 10, m - 92); c.stroke();
    }, false);
    const dialMat = new THREE.MeshStandardMaterial({ map: dial, roughness: 0.6 });
    for (let k = 0; k < 4; k++) {
      const face = new THREE.Mesh(new THREE.CircleGeometry(2.4, 32), dialMat);
      const a = (k / 4) * Math.PI * 2;
      face.position.set(Math.sin(a) * 3.72, 44, Math.cos(a) * 3.72);
      face.rotation.y = a;
      g.add(face);
    }
    add(new THREE.BoxGeometry(8.2, 0.5, 8.2), plain, 46.85);
    add(new THREE.BoxGeometry(5.8, 2.8, 5.8), plain, 48.5);
    add(new THREE.BoxGeometry(6.4, 0.35, 6.4), plain, 50.05);
    add(new THREE.CylinderGeometry(2.2, 2.4, 2.6, 8), plain, 51.5);
    add(new THREE.SphereGeometry(2.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), plain, 52.8);
    add(new THREE.CylinderGeometry(0.08, 0.16, 2.6, 6), mat('#c9b27a', { roughness: 0.4 }), 56.3);
    this.spots.stage = new THREE.Vector3(p.x, 0, p.z + 12);
  }

  // ---------- Saraswati Mandir (Sharda Peeth, 1959; gates-landmarks.md §3) ----------
  // White Makrana marble, Nagara style. It faces NORTH, down the axis to the G.D. Birla statue and the Clock Tower:
  // a central front flight (13 risers to the 2.1 m plinth) between two pedestals with saffron elephants, a grid-
  // paved terrace with a balustrade and corner chhatris, and on its centreline the stepped base, the porch
  // (ardha-mandapa), the pillared mandapa with side bays, the antarala and the sanctum under the ~33.5 m shikhara
  // with its gilt kalash. The roofline steps up from porch to mandapa to spire. You can climb onto the terrace and
  // walk through the porch and mandapa to a rail at the sanctum door; the idol is seen from there. The red-sandstone
  // walk with white railings, palms and Ashoka rows runs north from the stair to the road opposite the statue.
  // Built in the footprint's frame: u across (east), v along (south); v = 0 is the north (front) edge.
  buildTemple() {
    const b = this.findBuilding('Saraswati Temple');
    if (!b) return;
    const K = new Kit(this, 'saraswati-temple', fitFrame(b.outer));
    this.templeKit = K;
    this.envKits.push(K);
    const C = 25.2; const PL = 2.1; const TF = PL + 0.9;
    const MARBLE = 't:plasterWhite:#f7f4ee'; const TRIM = 'c:#efe9de'; const SHADE = 'c:#e2dacb'; const GOLD = 'm:#d4af37';
    const tex = (name, w, h, draw) => K.texture(name, () => { const t = canvasTexture(w, h, draw); return t; });
    tex('temple-grid', 128, 128, (g, W, H) => {
      g.fillStyle = '#f3f0e9'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#9a978f'; g.lineWidth = 2;
      for (const p of [0, W / 2]) { g.beginPath(); g.moveTo(p + 1, 0); g.lineTo(p + 1, H); g.moveTo(0, p + 1); g.lineTo(W, p + 1); g.stroke(); }
      g.fillStyle = '#b9b6ae'; for (const x of [W / 4, (3 * W) / 4]) for (const y of [H / 4, (3 * H) / 4]) g.fillRect(x - 4, y - 4, 8, 8);
      speckle(g, W, H, 200, 21);
    });
    tex('temple-floor', 128, 128, (g, W, H) => {
      g.fillStyle = '#f5f2ea'; g.fillRect(0, 0, W, H);
      g.save(); g.translate(W / 2, H / 2); g.rotate(Math.PI / 4); g.strokeStyle = '#c9c2b2'; g.lineWidth = 2;
      for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(k * 30, -120); g.lineTo(k * 30, 120); g.moveTo(-120, k * 30); g.lineTo(120, k * 30); g.stroke(); }
      g.restore(); speckle(g, W, H, 150, 22);
    });
    tex('temple-lotus', 256, 256, (g, W) => {
      const c = W / 2; g.fillStyle = '#f5f2ea'; g.fillRect(0, 0, W, W);
      g.fillStyle = '#c9a04a'; g.beginPath(); g.arc(c, c, 120, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#f5f2ea'; g.beginPath(); g.arc(c, c, 110, 0, Math.PI * 2); g.fill();
      for (const [n, r0, r1, col] of [[16, 30, 104, '#e3a3b4'], [8, 20, 70, '#d27f96']]) for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; g.save(); g.translate(c, c); g.rotate(a); g.fillStyle = col; g.beginPath(); g.ellipse(0, -(r0 + r1) / 2, (r1 - r0) * 0.22, (r1 - r0) / 2, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
      g.fillStyle = '#5a3a2a'; g.beginPath(); g.arc(c, c, 18, 0, Math.PI * 2); g.fill();
    });
    tex('temple-walk', 128, 128, (g, W, H) => {
      g.fillStyle = '#9c4a3a'; g.fillRect(0, 0, W, H); speckle(g, W, H, 500, 23);
      g.fillStyle = '#eadcc0'; g.fillRect(W * 0.38, H * 0.38, W * 0.24, H * 0.24); g.fillRect(0, 0, W, 4); g.fillRect(W * 0.46, 0, W * 0.08, H * 0.3); g.fillRect(W * 0.46, H * 0.7, W * 0.08, H * 0.3);
    });
    tex('temple-frieze', 256, 64, (g, W, H) => {
      g.fillStyle = '#ece6da'; g.fillRect(0, 0, W, H);
      for (let k = 0; k < 4; k++) {
        const x = k * 64 + 32; g.fillStyle = '#d9d0bf'; archPath(g, x - 22, 6, 44, 54); g.fill();
        g.fillStyle = '#c9bfac'; g.beginPath(); g.arc(x, 22, 6, 0, Math.PI * 2); g.fill(); g.fillRect(x - 6, 28, 12, 22); g.fillRect(x - 11, 30, 22, 5);
      }
      g.fillStyle = '#d4cab8'; g.fillRect(0, 0, W, 4); g.fillRect(0, H - 4, W, 4);
    });
    // a plane of a canvas texture tiled `rep` metres, facing [du, dv] (vertical) or up (flat)
    const tiled = (name, u, v, y, w, h, rep, facing = null) => {
      const g = new THREE.PlaneGeometry(w, h);
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / rep, (uv.getY(i) * h) / (facing ? h : rep));
      if (facing) { g.rotateY(Math.atan2(facing[0], facing[1])); g.translate(u + facing[0] * 0.015, y + h / 2, v + facing[1] * 0.015); } else { g.rotateX(-Math.PI / 2); g.translate(u, y, v); }
      K.mesh(g, `x:${name}`);
    };
    // a moulding band round a rectangle (outside it, `o` deep), so nothing crosses the rooms inside
    const ring = (u0, u1, v0, v1, y0, y1, o, key = TRIM, north = true) => {
      if (north) K.box(u0 - o, u1 + o, v0 - o, v0, y0, y1, key, { collide: false });
      K.box(u0 - o, u1 + o, v1, v1 + o, y0, y1, key, { collide: false });
      K.box(u0 - o, u0, v0, v1, y0, y1, key, { collide: false }); K.box(u1, u1 + o, v0, v1, y0, y1, key, { collide: false });
    };
    // a flat of a tiled texture key ('t:...') with world-metre UVs
    const flatT = (u, v, y, w, d, key, tile) => { const g = worldPlane(w, d, tile); g.rotateX(-Math.PI / 2); g.translate(u, y, v); K.mesh(g, key); };

    // ---- plinth and terrace (the OSM outline: a 48.6 m front band and a 33 m body) ----
    const parts = [[0, 48.6, 0, 8.2], [9.0, 41.8, 8.2, 66.0]];
    for (const [u0, u1, v0, v1] of parts) {
      K.box(u0, u1, v0, v1, 0, PL, MARBLE, { walkable: true });
      tiled('temple-grid', (u0 + u1) / 2, (v0 + v1) / 2, PL + 0.012, u1 - u0, v1 - v0, 2);
    }
    // the outer edges: base moulding, cornice, carved frieze panels, and the balustrade on top
    const edges = [
      [[0, 0], [C - 2.2, 0], [0, -1]], [[C + 2.2, 0], [48.6, 0], [0, -1]], [[0, 0], [0, 8.2], [-1, 0]], [[48.6, 0], [48.6, 8.2], [1, 0]],
      [[0, 8.2], [9.0, 8.2], [0, 1]], [[41.8, 8.2], [48.6, 8.2], [0, 1]], [[9.0, 8.2], [9.0, 66], [-1, 0]], [[41.8, 8.2], [41.8, 66], [1, 0]], [[9.0, 66], [41.8, 66], [0, 1]],
    ];
    for (const [[u0, v0], [u1, v1], [du, dv]] of edges) {
      const alongU = du === 0; const len = alongU ? u1 - u0 : v1 - v0; const mid = [(u0 + u1) / 2, (v0 + v1) / 2];
      const band = (y0, y1, out) => (alongU ? K.box(u0, u1, v0 + dv * out - 0.001, v0, y0, y1, TRIM, { collide: false }) : K.box(u0 + du * out - 0.001, u0, v0, v1, y0, y1, TRIM, { collide: false }));
      band(0, 0.3, 0.12); band(PL - 0.16, PL, 0.16); band(PL - 0.32, PL - 0.24, 0.07);
      tiled('temple-frieze', mid[0] + du * 0.001, mid[1] + dv * 0.001, 0.5, len, 1.3, 4, [du, dv]);
      // balustrade: posts with urn knobs every ~3.4 m, balusters, top and bottom rails
      const n = Math.max(1, Math.round(len / 3.4));
      const at = (s) => (alongU ? [u0 + s, v0 - dv * 0.25] : [u0 - du * 0.25, v0 + s]);
      for (let k = 0; k <= n; k++) {
        const [pu, pv] = at((k / n) * len);
        K.box(pu - 0.16, pu + 0.16, pv - 0.16, pv + 0.16, PL, PL + 1.05, TRIM, { collide: false });
        const knob = new THREE.SphereGeometry(0.14, 10, 6); knob.translate(pu, PL + 1.2, pv); K.mesh(knob, TRIM);
      }
      for (let s = 0.3; s < len - 0.2; s += 0.32) { const [pu, pv] = at(s); K.box(pu - 0.04, pu + 0.04, pv - 0.04, pv + 0.04, PL + 0.1, PL + 0.85, TRIM, { collide: false }); }
      const [a0, b0] = at(0); const [a1, b1] = at(len);
      K.box(Math.min(a0, a1) - 0.07, Math.max(a0, a1) + 0.07, Math.min(b0, b1) - 0.07, Math.max(b0, b1) + 0.07, PL + 0.85, PL + 0.97, TRIM, { collide: false });
      K.box(Math.min(a0, a1) - 0.06, Math.max(a0, a1) + 0.06, Math.min(b0, b1) - 0.06, Math.max(b0, b1) + 0.06, PL, PL + 0.1, TRIM, { collide: false });
      K.col(Math.min(a0, a1) - 0.1, Math.max(a0, a1) + 0.1, Math.min(b0, b1) - 0.1, Math.max(b0, b1) + 0.1, PL, PL + 1.1);
    }
    // corner chhatris on the terrace (front pair at the wide band, rear pair at the body's corners)
    const chhatri = (u, v, y, r) => {
      K.box(u - r, u + r, v - r, v + r, y, y + 0.3, TRIM, { collide: false });
      for (const [a, c] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) K.cyl(u + a * r * 0.75, v + c * r * 0.75, y + 0.3, 0.13 * r, 1.7 * r, MARBLE, { seg: 8, collide: true });
      K.box(u - r * 1.05, u + r * 1.05, v - r * 1.05, v + r * 1.05, y + 0.3 + 1.7 * r, y + 0.5 + 1.7 * r, TRIM, { collide: false });
      const dome = new THREE.SphereGeometry(0.85 * r, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2); dome.scale(1, 1.15, 1); dome.translate(u, y + 0.5 + 1.7 * r, v); K.mesh(dome, MARBLE);
      const tip = new THREE.ConeGeometry(0.1 * r, 0.7 * r, 8); tip.translate(u, y + 0.85 + 2.7 * r, v); K.mesh(tip, GOLD);
    };
    for (const [u, v] of [[2.8, 2.8], [45.8, 2.8], [11.8, 63.2], [39.0, 63.2]]) chhatri(u, v, PL, 1.4);

    // ---- the front flight, its cheek walls and the elephant pedestals ----
    const RISE = PL / 13; const TREAD = 0.28; const RUN = 13 * TREAD;
    K.flight(C, -RUN, 0, [0, 1], 13, RISE, 4.0, MARBLE, { tread: TREAD });
    for (let j = 0; j < 13; j++) for (const s of [-1, 1]) K.box(C + s * 2.0, C + s * 2.45, -RUN + j * TREAD, -RUN + (j + 1) * TREAD, 0, RISE * (j + 1) + 0.55, TRIM);
    K.stairs.push({ name: 'Temple front stair', u0: C - 2, u1: C + 2, v0: -RUN, v1: 0, y0: 0, y1: PL });
    for (const s of [-1, 1]) {
      const pu = C + s * 3.6; const pv = -RUN + 0.6;
      K.box(pu - 0.75, pu + 0.75, pv - 0.9, pv + 0.9, 0, 1.3, TRIM);
      K.box(pu - 0.85, pu + 0.85, pv - 1.0, pv + 1.0, 1.3, 1.42, SHADE, { collide: false });
      this.templeElephant(K, pu, pv, 1.42);
    }
    flatT(C, -RUN - 4.2, 0.085, 10, 8.4, 't:paving:#b8b3ab', TEX_SIZE.paving);
    K.entrance('Saraswati Mandir front stair', C, -RUN - 0.8, [0, -1]);

    // ---- the walk north to the road: red sandstone with cream inlays, white railings with yellow rings ----
    const W0 = -52; const W1 = -RUN - 8.4;
    tiled('temple-walk', C, (W0 + W1) / 2, 0.085, 4, W1 - W0, 2);
    for (const s of [-1, 1]) {
      const ru = C + s * 2.45;
      for (let v = W0 + 1; v <= W1; v += 2.2) {
        K.box(ru - 0.07, ru + 0.07, v - 0.07, v + 0.07, 0, 0.75, 'c:#f4f2ec', { collide: false });
        if (v + 2.2 <= W1) { const ring = new THREE.TorusGeometry(0.26, 0.035, 6, 16); ring.rotateY(Math.PI / 2); ring.translate(ru, 0.42, v + 1.1); K.mesh(ring, 'c:#e0b43a'); }
      }
      K.box(ru - 0.04, ru + 0.04, W0 + 1, W1, 0.7, 0.76, 'c:#f4f2ec', { collide: false });
      K.box(ru - 0.03, ru + 0.03, W0 + 1, W1, 0.12, 0.17, 'c:#f4f2ec', { collide: false });
      K.col(ru - 0.08, ru + 0.08, W0 + 1, W1, 0, 0.8);
      // globe lamps at the walk's entrance
      K.cyl(C + s * 2.9, W0 + 0.6, 0, 0.06, 3.0, 'c:#f4f2ec', { seg: 8 });
      const globe = new THREE.SphereGeometry(0.24, 12, 8); globe.translate(C + s * 2.9, 3.2, W0 + 0.6); K.mesh(globe, 'e:#fff6dc');
      for (let v = W0 + 2; v <= -30; v += 6) { const p = K.world(C + s * 5.5, v); (this.palmPts ||= []).push([p.x, p.z]); }
      for (let v = W0 + 2; v <= -9; v += 5) { const p = K.world(C + s * 16, v); this.ashokaPts.push([p.x, p.z]); }
    }
    for (let v = W0; v <= 0; v += 5) { const p = K.world(C, v); this.envKeepOut.push([p.x, p.z, 4.5]); }

    // ---- the temple body on the centreline ----
    const BU0 = C - 9.2; const BU1 = C + 9.2; const BV0 = 10.6; const BV1 = 57.5;
    // stepped base (adhishthana) and its steps up from the terrace
    K.box(BU0, BU1, BV0, BV1, PL, TF, MARBLE, { walkable: true });
    for (const [y0, y1, o] of [[PL, PL + 0.18, 0.12], [TF - 0.14, TF - 0.01, 0.1]]) ring(BU0, BU1, BV0, BV1, y0, y1, o);
    K.flight(C, BV0 - 5 * 0.3, PL, [0, 1], 5, 0.18, 6.5, MARBLE, { tread: 0.3 });
    K.stairs.push({ name: 'Temple base steps', u0: C - 3.25, u1: C + 3.25, v0: BV0 - 1.5, v1: BV0, y0: PL, y1: TF });
    const WH = 5.2; const CEIL = TF + WH; const WT = 0.6;
    // porch (ardha-mandapa): four front pillars, side walls with deep jambs, a stepped roof with a small dome
    const PV0 = BV0 + 0.4; const PV1 = 15.6;
    const pillar = (u, v, h, key = MARBLE) => {
      K.box(u - 0.45, u + 0.45, v - 0.45, v + 0.45, TF, TF + 0.4, TRIM);
      K.box(u - 0.33, u + 0.33, v - 0.33, v + 0.33, TF + 0.4, TF + h - 0.75, key);
      for (const [a, c] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) K.box(u + a * 0.33 - (a ? a * 0.03 : 0.22), u + a * 0.33 + (a ? a * 0.03 : 0.22), v + c * 0.33 - (c ? c * 0.03 : 0.22), v + c * 0.33 + (c ? c * 0.03 : 0.22), TF + 0.5, TF + h - 0.85, SHADE, { collide: false });
      K.box(u - 0.5, u + 0.5, v - 0.5, v + 0.5, TF + h - 0.75, TF + h - 0.45, TRIM, { collide: false });
      K.box(u - 0.7, u + 0.7, v - 0.7, v + 0.7, TF + h - 0.45, TF + h, TRIM, { collide: false });
    };
    for (const pu of [C - 3.6, C - 1.6, C + 1.6, C + 3.6]) pillar(pu, PV0 + 0.5, WH);
    for (const s of [-1, 1]) K.box(C + s * 4.2, C + s * (4.2 + WT), PV0, PV1, TF, CEIL, MARBLE);
    K.box(C - 4.9, C + 4.9, PV0 - 0.3, PV1, CEIL, CEIL + 0.5, TRIM, { collide: false });
    for (let i = 0; i < 4; i++) K.box(C - 4.4 + i * 0.9, C + 4.4 - i * 0.9, PV0 + i * 0.5, PV1 - i * 0.4, CEIL + 0.5 + i * 0.55, CEIL + 1.05 + i * 0.55, i % 2 ? SHADE : MARBLE, { collide: false });
    const pdome = new THREE.SphereGeometry(1.7, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2); pdome.scale(1, 1.25, 1); pdome.translate(C, CEIL + 2.7, (PV0 + PV1) / 2); K.mesh(pdome, MARBLE);
    const pfin = new THREE.ConeGeometry(0.18, 1.0, 8); pfin.translate(C, CEIL + 5.3, (PV0 + PV1) / 2); K.mesh(pfin, GOLD);
    // mandapa: walls with a wide door from the porch and two window bays a side, pillars inside, a coffered ceiling
    const MV0 = PV1; const MV1 = 36.0; const MU0 = C - 8.4; const MU1 = C + 8.4;
    K.wall(MU0, MV0, MU1, MV0, TF, CEIL, MARBLE, { thick: WT, openings: [{ at: C - MU0, width: 3.4, top: 4.2 }] });
    for (const uu of [MU0, MU1]) K.wall(uu, MV0, uu, MV1, TF, CEIL, MARBLE, { thick: WT, openings: [{ at: 5.5, width: 3.0, bottom: 0.8, top: 4.0 }, { at: 14.0, width: 3.0, bottom: 0.8, top: 4.0 }] });
    K.wall(MU0, MV1, C - 2.4, MV1, TF, CEIL, MARBLE, { thick: WT });
    K.wall(C + 2.4, MV1, MU1, MV1, TF, CEIL, MARBLE, { thick: WT });
    K.box(C - 2.4, C + 2.4, MV1 - WT / 2, MV1 + WT / 2, TF + 4.2, CEIL, MARBLE);
    // exterior bands and the carved frieze round the mandapa
    for (const [y0, y1, o] of [[TF, TF + 0.35, 0.12], [TF + 4.5, TF + 4.65, 0.08]]) ring(MU0 - WT / 2, MU1 + WT / 2, MV0 - WT / 2, MV1, y0, y1, o, TRIM, false);
    for (const s of [-1, 1]) for (const [v0, v1] of [[MV0, MV0 + 3.9], [MV0 + 7.1, MV0 + 12.4], [MV0 + 15.6, MV1]]) tiled('temple-frieze', C + s * (8.4 + WT / 2), (v0 + v1) / 2, TF + 4.7, v1 - v0, 0.9, 3.2, [s, 0]);
    // roof: ceiling slab, then the samvarana (stepped tiers) and a bell crowned with an amalaka
    K.box(MU0 - 0.5, MU1 + 0.5, MV0 - 0.3, MV1 + 0.3, CEIL, CEIL + 0.45, TRIM, { collide: false });
    for (let i = 0; i < 6; i++) { const inset = 0.6 + i * 1.05; K.box(MU0 + inset, MU1 - inset, MV0 + inset * 0.9, MV1 - inset * 0.9, CEIL + 0.45 + i * 0.85, CEIL + 1.3 + i * 0.85, i % 2 ? SHADE : MARBLE, { collide: false }); }
    const bell = this.spireGeometry(4.2, 5.2, 16); bell.translate(C, CEIL + 5.55, (MV0 + MV1) / 2); K.mesh(bell, MARBLE);
    const mam = new THREE.CylinderGeometry(1.1, 1.1, 0.5, 20); mam.translate(C, CEIL + 10.9, (MV0 + MV1) / 2); K.mesh(mam, TRIM);
    const mk = new THREE.SphereGeometry(0.45, 12, 8); mk.translate(C, CEIL + 11.5, (MV0 + MV1) / 2); K.mesh(mk, GOLD);
    // antarala and the sanctum block under the shikhara (closed; its door is the end of the walk)
    const SV0 = MV1; const SV1 = BV1 - 0.6; const SU0 = C - 8.0; const SU1 = C + 8.0; const SH = CEIL + 0.8;
    // solid but for the sanctum's front chamber (u C±2.4, 3.1 m deep), open to the antarala through the rail
    const CH0 = SV0 + WT / 2; const CH1 = SV0 + 3.4;
    K.box(SU0, C - 2.4, CH0, SV1, TF, SH, MARBLE); K.box(C + 2.4, SU1, CH0, SV1, TF, SH, MARBLE);
    K.box(C - 2.4, C + 2.4, CH1, SV1, TF, SH, MARBLE); K.box(C - 2.4, C + 2.4, CH0, CH1, TF + 4.2, SH, MARBLE);
    for (const [y0, y1, o] of [[TF, TF + 0.35, 0.12], [TF + 2.5, TF + 2.62, 0.06], [TF + 4.5, TF + 4.65, 0.08], [SH - 0.2, SH + 0.2, 0.25]]) ring(SU0, SU1, CH0 + 0.02, SV1, y0, y1, o);
    for (const s of [-1, 1]) {
      tiled('temple-frieze', C + s * 8.0, (SV0 + SV1) / 2, TF + 2.7, SV1 - SV0 - 1, 1.7, 3.2, [s, 0]);
      for (const v of [SV0 + 4, SV0 + 10.5, SV0 + 17]) K.box(C + s * 8.0 - (s > 0 ? 0 : 0.45), C + s * 8.0 + (s > 0 ? 0.45 : 0), v - 1.0, v + 1.0, TF + 0.35, SH - 0.2, TRIM, { collide: false }); // offsets (rathas)
    }
    tiled('temple-frieze', C, SV1, TF + 2.7, 15, 1.7, 3.2, [0, 1]);
    // the shikhara: a square curvilinear spire with clustered half-spires (urushringas) and corner spirelets
    const SC = (SV0 + SV1) / 2;
    const main = this.spireGeometry(8.4, 24.5, 22); main.translate(C, SH + 0.2, SC); K.mesh(main, MARBLE);
    for (const [du, dv] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      for (const [r, h, off, y] of [[4.2, 13.5, 5.2, 0.2], [2.6, 8.5, 6.6, 0.2], [2.6, 7.2, 4.6, 9.0]]) { const g = this.spireGeometry(r, h, 12); g.translate(C + du * off, SH + y, SC + dv * off); K.mesh(g, MARBLE); }
    }
    for (const [du, dv] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const g = this.spireGeometry(2.1, 6.5, 10); g.translate(C + du * 6.3, SH + 0.2, SC + dv * 6.3); K.mesh(g, MARBLE); }
    const TOP = SH + 0.2 + 24.5;
    const am = new THREE.CylinderGeometry(2.0, 2.0, 0.8, 24); am.translate(C, TOP + 0.3, SC); K.mesh(am, TRIM);
    for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; const rib = new THREE.BoxGeometry(0.16, 0.78, 0.3); rib.rotateY(-a); rib.translate(C + Math.sin(a) * 2.02, TOP + 0.3, SC + Math.cos(a) * 2.02); K.mesh(rib, SHADE); }
    const kal = new THREE.SphereGeometry(0.75, 14, 10); kal.scale(1, 1.2, 1); kal.translate(C, TOP + 1.55, SC); K.mesh(kal, GOLD);
    const kt = new THREE.ConeGeometry(0.28, 1.5, 10); kt.translate(C, TOP + 3.0, SC); K.mesh(kt, GOLD);
    K.cyl(C + 0.5, SC, TOP + 0.6, 0.04, 4.2, 'c:#8a7a60', { seg: 6 });
    const flag = new THREE.PlaneGeometry(2.2, 1.2); flag.translate(C + 1.6, TOP + 4.1, SC); K.mesh(flag, 'c:#ff7f1e');

    // ---- inside: diagonal white marble floor with a lotus inlay, fluted pillars, carved lotus coffers ----
    K.layer('temple-inside', () => {
      tiled('temple-floor', C, (PV0 + SV0) / 2, TF + 0.012, 16.2, SV0 - PV0 + 0.2, 1.6);
      const lotus = new THREE.PlaneGeometry(3.2, 3.2); lotus.rotateX(-Math.PI / 2); lotus.translate(C, TF + 0.02, (MV0 + MV1) / 2); K.mesh(lotus, 'x:temple-lotus');
      for (const pu of [C - 5.6, C - 2.4, C + 2.4, C + 5.6]) for (const pv of [19.2, 23.6, 28.0, 32.4]) pillar(pu, pv, WH);
      for (const pv of [19.2, 23.6, 28.0, 32.4]) for (const pu of [C - 5.6, C, C + 5.6]) {
        const cu = pu === C ? C : pu + (pu < C ? 1.6 : -1.6);
        const cof = new THREE.PlaneGeometry(2.4, 2.4); cof.rotateX(Math.PI / 2); cof.translate(cu, CEIL - 0.02, pv + 2.2); K.mesh(cof, 'x:temple-lotus');
      }
      // the sanctum: a dark red niche with the white idol of Saraswati on a lotus, oil lamps, a rail at the door
      K.box(C - 2.3, C + 2.3, SV0 + 3.3, SV0 + 3.39, TF, TF + 4.15, 'c:#6e1f1c', { collide: false });
      this.saraswatiIdol(K, C, SV0 + 2.2, TF);
      for (const s of [-1, 1]) { K.box(C + s * 1.6 - 0.12, C + s * 1.6 + 0.12, SV0 + 1.0 - 0.12, SV0 + 1.0 + 0.12, TF, TF + 0.9, GOLD, { collide: false }); K.box(C + s * 1.6 - 0.06, C + s * 1.6 + 0.06, SV0 + 1.0 - 0.06, SV0 + 1.0 + 0.06, TF + 0.9, TF + 1.02, 'e:#ffc46a', { collide: false }); }
      K.rail(C - 1.9, MV1 - 0.9, C + 1.9, MV1 - 0.9, TF, 'm:#b89a4a', { h: 0.9 });
      for (const [u, v] of [[C, 17.5], [C, 25.8], [C, 33.5], [C, 12.8]]) K.tubeLight(u, v, CEIL - 0.05);
      K.sign('Garbha Griha · Saraswati', C, MV1 - 0.95, TF + 0.95, [0, -1], { width: 2.2, height: 0.32, bg: '#7a2622' });
    });
    // inner faces of the side walls between the mandapa and sanctum stay closed behind the rail
    K.col(C - 2.4, C + 2.4, MV1 + 0.1, MV1 + 0.5, TF, TF + 4.2);
    K.room('temple-mandapa', 'Saraswati Mandir · Mandapa', C - 8, C + 8, PV0, MV1, TF - 0.1, CEIL);
    K.room('temple-terrace', 'Saraswati Mandir · Terrace', 0, 48.6, 0, 66, PL - 0.1, PL + 3);
    K.finish();
    // The temple closes the axis from the Clock Tower over the sunken Rotunda and NAB, about 700 m away: keep its
    // white marble out of the distance haze so it reads from the Clock Tower as it does on campus.
    for (const g of Object.values(K.groups)) g.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.fog = false; } });
  }

  // A square-plan curvilinear (Nagara) spire of half-diagonal r and height h, ribbed by horizontal courses.
  spireGeometry(r, h, courses) {
    const pts = [];
    for (let i = 0; i <= courses; i++) {
      const t = i / courses; const R = Math.max(r * 0.1, r * Math.pow(1 - t * 0.92, 0.7) * (1 - 0.1 * t));
      pts.push(new THREE.Vector2(R * 1.035, t * h));
      if (i < courses) pts.push(new THREE.Vector2(R * 0.985, t * h + (h / courses) * 0.35));
    }
    pts.push(new THREE.Vector2(0.001, h));
    const g = new THREE.LatheGeometry(pts, 4);
    g.rotateY(Math.PI / 4);
    return g;
  }

  // Saffron-painted elephant on a stair pedestal, facing north (-v): body, head, trunk, ears, legs, tusks.
  templeElephant(K, u, v, y) {
    const S = 'c:#d0873a'; const ell = (rx, ry, rz, x, yy, z) => { const g = new THREE.SphereGeometry(1, 14, 10); g.scale(rx, ry, rz); g.translate(u + x, y + yy, v + z); K.mesh(g, S); };
    ell(0.55, 0.5, 0.8, 0, 1.05, 0.15);
    ell(0.38, 0.4, 0.36, 0, 1.3, -0.72);
    for (const s of [-1, 1]) { const ear = new THREE.CircleGeometry(0.34, 12); ear.rotateY(s * 0.5 + Math.PI); ear.translate(u + s * 0.36, y + 1.3, v - 0.58); K.mesh(ear, S); }
    const trunk = new THREE.CylinderGeometry(0.08, 0.14, 0.95, 8); trunk.rotateX(-0.25); trunk.translate(u, y + 0.82, v - 1.02); K.mesh(trunk, S);
    for (const s of [-1, 1]) { const tusk = new THREE.ConeGeometry(0.045, 0.45, 6); tusk.rotateX(-1.9); tusk.translate(u + s * 0.16, y + 1.07, v - 1.0); K.mesh(tusk, 'c:#f4efe2'); }
    for (const [a, c] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) K.cyl(u + a * 0.3, v + 0.15 + c * 0.45, y, 0.15, 0.75, S, { seg: 8 });
  }

  // The white idol of Saraswati seated on a pink lotus, a veena across her lap and a gilt crown.
  saraswatiIdol(K, u, v, y) {
    const W = 'c:#f7f5f0';
    K.box(u - 1.0, u + 1.0, v - 0.7, v + 0.7, y, y + 0.9, 'c:#e7dfcf', { collide: true });
    K.cyl(u, v, y + 0.9, 0.85, 0.25, 'c:#e39aae', { seg: 16, rTop: 0.95 });
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; const p = new THREE.SphereGeometry(0.3, 8, 6); p.scale(1, 0.45, 0.6); p.rotateY(-a); p.translate(u + Math.sin(a) * 0.82, y + 1.12, v + Math.cos(a) * 0.82); K.mesh(p, 'c:#d77f98'); }
    const lap = new THREE.SphereGeometry(0.6, 14, 8); lap.scale(1, 0.4, 0.75); lap.translate(u, y + 1.3, v - 0.1); K.mesh(lap, W);
    K.cyl(u, v + 0.05, y + 1.35, 0.32, 0.85, W, { seg: 12, rTop: 0.25 });
    const head = new THREE.SphereGeometry(0.2, 14, 10); head.translate(u, y + 2.42, v + 0.03); K.mesh(head, W);
    K.cyl(u, v + 0.03, y + 2.55, 0.14, 0.24, 'm:#d4af37', { seg: 10, rTop: 0.06 });
    for (const s of [-1, 1]) { const arm = new THREE.CylinderGeometry(0.06, 0.07, 0.6, 8); arm.rotateZ(s * 0.6); arm.rotateX(0.5); arm.translate(u + s * 0.3, y + 1.85, v - 0.15); K.mesh(arm, W); }
    const neck = new THREE.CylinderGeometry(0.035, 0.035, 1.6, 6); neck.rotateZ(1.0); neck.translate(u, y + 1.75, v - 0.42); K.mesh(neck, 'c:#8a5a2e');
    for (const [x, yy] of [[-0.62, 1.38], [0.58, 2.12]]) { const g = new THREE.SphereGeometry(x < 0 ? 0.22 : 0.15, 10, 8); g.translate(u + x, y + yy, v - 0.42); K.mesh(g, 'c:#8a5a2e'); }
  }

  // ---------- Shiv Ganga (landscape-water.md block 1) ----------
  // A 400-yard ring canal, 40 ft wide: the OSM polygon traces the island's bank, so the water runs from r 54 to 66
  // round (128, 823) (SG_WATER, data/bits-campus.js). The island side has a white parapet with a balustrade, the
  // outer bank a plain white kerb, then a red-earth (murram) ring walk and dense trees. Four white balustraded
  // footbridges (E, NE, SE and W); the SE one continues as the axial walk with globe lamps. On the island: a red-
  // earth plaza round the single-storey guest cottage (white, green hipped roof), radial paths to the bridges, two
  // small chhatris at the east bridgehead, and on the east the white octagonal stepped platform with the seated Shiva.
  buildShivGanga() {
    const a = D.areas.find((x) => x.kind === 'shivganga');
    if (!a) return;
    const K = this.envKit;
    const [cx, cz] = SG_WATER.c; const [R0, R1] = SG_WATER.r;
    const WHITE = 't:plasterWhite:#f4f1ea'; const RAIL = 'c:#f6f4ee';
    const circle = (r, n = 72, ox = cx, oz = cz) => Array.from({ length: n }, (_, k) => [ox + Math.sin((k / n) * Math.PI * 2) * r, oz + Math.cos((k / n) * Math.PI * 2) * r]);
    // water (its own depth offset so the island's grass beds never show through) and the ring walk
    const water = new THREE.Mesh(new THREE.RingGeometry(R0 - 0.2, R1 + 0.2, 120, 1), new THREE.MeshStandardMaterial({ color: '#5c6236', roughness: 0.12, metalness: 0.15, polygonOffset: true, polygonOffsetFactor: -9, polygonOffsetUnits: -18 }));
    water.rotation.x = -Math.PI / 2; water.position.set(cx, 0.08, cz); water.receiveShadow = true;
    this.root.add(water);
    this.addShape('murram', cx, cz, this.flatShape(circle(R1 + 7.5, 96), [circle(R1 + 0.3, 96)], 0.045, 6));
    const bridges = [Math.PI / 2, (3 * Math.PI) / 4, Math.PI / 4, (3 * Math.PI) / 2]; // E, NE, SE, W (angle: x = sin, z = cos)
    const gap = (ang, r, half) => bridges.some((b) => Math.abs(Math.atan2(Math.sin(ang - b), Math.cos(ang - b))) * r < half);
    // banks: arcs between the bridges (inner parapet 0.5 m with a balustrade, outer kerb 0.4 m)
    const arcs = bridges.map((b) => b).sort((p, q) => p - q);
    for (let i = 0; i < arcs.length; i++) {
      for (const [r, h, t, rail] of [[R0, 0.5, 0.4, true], [R1, 0.4, 0.4, false]]) {
        const half = 2.0 / r;
        const t0 = arcs[i] + half; const t1 = (i + 1 < arcs.length ? arcs[i + 1] : arcs[0] + Math.PI * 2) - half;
        const len = t1 - t0; const seg = Math.ceil(len * r / 2);
        // three.js cylinder angle θ puts a point at (r sin θ, r cos θ) — the same convention as ours
        // 'parapet' is double-sided: the island and canal faces of the bank both show
        for (const rr of [r - t / 2, r + t / 2]) { const g = new THREE.CylinderGeometry(rr, rr, h, seg, 1, true, t0, len); g.translate(cx, h / 2, cz); K.mesh(g, 'parapet'); }
        const top = new THREE.RingGeometry(r - t / 2, r + t / 2, seg, 1, t0 - Math.PI / 2, len); top.rotateX(-Math.PI / 2); top.translate(cx, h, cz); K.mesh(top, 'parapet');
        if (!rail) continue;
        for (const rr of [r + 0.07, r - 0.07]) { const cap = new THREE.CylinderGeometry(rr, rr, 0.1, seg, 1, true, t0, len); cap.translate(cx, h + 0.85, cz); K.mesh(cap, 'parapet'); }
        const capTop = new THREE.RingGeometry(r - 0.07, r + 0.07, seg, 1, t0 - Math.PI / 2, len); capTop.rotateX(-Math.PI / 2); capTop.translate(cx, h + 0.9, cz); K.mesh(capTop, 'parapet');
        for (let s = 0; s <= len * r; s += 0.42) {
          const ang = t0 + s / r; const x = cx + Math.sin(ang) * r; const z = cz + Math.cos(ang) * r;
          const post = Math.round(s / 0.42) % 8 === 0;
          const g = new THREE.BoxGeometry(post ? 0.24 : 0.08, post ? 1.0 : 0.8, post ? 0.24 : 0.08); g.rotateY(ang); g.translate(x, h + (post ? 0.5 : 0.4), z); K.mesh(g, RAIL);
        }
      }
    }
    // the canal blocks walking except across the bridges
    for (const rc of [R0 + 3, R1 - 3]) {
      const n = Math.ceil((2 * Math.PI * rc) / 3.6);
      for (let k = 0; k < n; k++) {
        const ang = (k / n) * Math.PI * 2;
        if (gap(ang, rc, 4.4)) continue;
        const x = cx + Math.sin(ang) * rc; const z = cz + Math.cos(ang) * rc;
        this.colliders.push({ minX: x - 2.9, maxX: x + 2.9, minZ: z - 2.9, maxZ: z + 2.9, minY: 0, maxY: 1.2, walkable: false, enabled: true });
      }
    }
    // bridges: a gently arched white deck (walkable, 0.5 m) with balustrades and square newels, in their own frames
    for (const b of bridges) {
      const ev = [Math.sin(b), Math.cos(b)]; const eu = [ev[1], -ev[0]];
      const O = [cx + ev[0] * (R0 - 2.5), cz + ev[1] * (R0 - 2.5)];
      const BK = new Kit(this, 'shivganga-bridge', { O, eu, ev, angle: Math.atan2(ev[0], ev[1]) });
      const L = R1 - R0 + 5; const Wd = 1.6;
      BK.box(-Wd, Wd, 0, L, 0, 0.5, WHITE, { walkable: true });
      const arch = new THREE.Shape(); arch.moveTo(0, 0.5); arch.lineTo(L, 0.5); arch.lineTo(L, 0); arch.lineTo(L - 2.3, 0); arch.quadraticCurveTo(L / 2, 1.0, 2.3, 0); arch.lineTo(0, 0);
      for (const s of [-1, 1]) {
        const g = new THREE.ExtrudeGeometry(arch, { depth: 0.12, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(s * (Wd + 0.06) + 0.06, 0, 0); BK.mesh(g, WHITE);
        BK.box(s * Wd - 0.09, s * Wd + 0.09, 0.3, L - 0.3, 1.38, 1.5, RAIL, { collide: false });
        BK.box(s * Wd - 0.06, s * Wd + 0.06, 0.3, L - 0.3, 0.5, 0.62, RAIL, { collide: false });
        for (let v = 0.6; v < L - 0.4; v += 0.35) BK.box(s * Wd - 0.04, s * Wd + 0.04, v - 0.04, v + 0.04, 0.6, 1.4, RAIL, { collide: false });
        BK.col(s * Wd - 0.12, s * Wd + 0.12, 0.3, L - 0.3, 0.5, 1.5);
        for (const v of [0.2, L - 0.2]) { BK.box(s * Wd - 0.22, s * Wd + 0.22, v - 0.22, v + 0.22, 0, 1.7, WHITE); const k = new THREE.SphereGeometry(0.17, 10, 6); k.translate(s * Wd, 1.86, v); BK.mesh(k, RAIL); }
      }
      BK.finish();
      this.envKits.push(BK);
    }
    // the island: a red-earth plaza round the cottage and paths out to each bridge
    const cot = this.buildings.find((x) => envBuilt(x) && x.bb.minX < 140);
    const [pcx, pcz] = cot ? centroid(cot.outer) : [cx, cz];
    this.addShape('murram', pcx, pcz, this.flatShape(circle(24, 64, pcx, pcz), [], 0.04, 6));
    for (const b of bridges) {
      const ev = [Math.sin(b), Math.cos(b)]; const eu = [ev[1], -ev[0]];
      const p0 = [cx + ev[0] * 20, cz + ev[1] * 20]; const p1 = [cx + ev[0] * (R0 + 0.2), cz + ev[1] * (R0 + 0.2)];
      const poly = [[p0[0] + eu[0] * 1.6, p0[1] + eu[1] * 1.6], [p1[0] + eu[0] * 1.6, p1[1] + eu[1] * 1.6], [p1[0] - eu[0] * 1.6, p1[1] - eu[1] * 1.6], [p0[0] - eu[0] * 1.6, p0[1] - eu[1] * 1.6]];
      this.addShape('murram', p0[0], p0[1], this.flatShape(poly, [], 0.042, 6));
      this.envKeepOut.push([(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, 3]);
    }
    // the cottage: one storey, white walls, a green-teal hipped roof
    if (cot) {
      const fac = facadeMaterial('cottage');
      this.buildWallRing(cot.outer, 4.2, 'facade:cottage', fac, pcx, pcz, [], false);
      const f = fitFrame(cot.outer);
      const roof = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); roof.rotateY(Math.PI / 4); roof.scale(f.W + 1.6, 3.4, f.L + 1.6); roof.translate(0, 4.2 + 1.7, 0); roof.rotateY(f.angle);
      const c = [f.O[0] + f.eu[0] * f.W / 2 + f.ev[0] * f.L / 2, f.O[1] + f.eu[1] * f.W / 2 + f.ev[1] * f.L / 2];
      roof.translate(c[0], 0, c[1]);
      K.mesh(roof, 'c:#5c9a8a');
      K.box(c[0] - 1.2, c[0] + 1.2, c[1] - 0.2, c[1] + 0.2, 7.2, 8.2, 'c:#e9e4da', { collide: false }); // chimney stack at the ridge
    }
    // two small domed chhatris at the east bridgehead, island side
    for (const d of [-0.075, 0.075]) { const ang = Math.PI / 2 + d; this.chhatriAt(K, cx + Math.sin(ang) * (R0 - 3.2), cz + Math.cos(ang) * (R0 - 3.2), 0, 1.1); }
    // the statue platform: three white octagonal tiers (walkable) and a wide stair down to the east landing
    const plat = this.buildings.find((x) => envBuilt(x) && x.bb.minX > 150);
    const [sx, sz] = plat ? [(plat.bb.minX + plat.bb.maxX) / 2, (plat.bb.minZ + plat.bb.maxZ) / 2] : [cx + 38, cz];
    const RX = plat ? (plat.bb.maxX - plat.bb.minX) / 2 : 8.5; const RZ = plat ? (plat.bb.maxZ - plat.bb.minZ) / 2 : 6;
    for (let i = 0; i < 3; i++) {
      const kx = RX * (1 - i * 0.24); const kz = RZ * (1 - i * 0.24);
      const g = new THREE.CylinderGeometry(1, 1, 0.6, 8); g.rotateY(Math.PI / 8); g.scale(kx, 1, kz); g.translate(sx, i * 0.6 + 0.3, sz); K.mesh(g, WHITE);
      const lip = new THREE.CylinderGeometry(1, 1, 0.08, 8); lip.rotateY(Math.PI / 8); lip.scale(kx + 0.12, 1, kz + 0.12); lip.translate(sx, i * 0.6 + 0.56, sz); K.mesh(lip, 'c:#e6e0d3');
      this.colliders.push({ minX: sx - kx * 0.86, maxX: sx + kx * 0.86, minZ: sz - kz * 0.86, maxZ: sz + kz * 0.86, minY: 0, maxY: (i + 1) * 0.6, walkable: true, enabled: true });
    }
    for (let j = 0; j < 4; j++) K.box(sx + RX * 0.86 + (3 - j) * 0.3, sx + RX * 0.86 + (4 - j) * 0.3, sz - 2.5, sz + 2.5, 0, (j + 1) * 0.15, WHITE, { walkable: true });
    this.shivaStatue(K, sx, sz, 1.8);
    this.envKeepOut.push([sx, sz, Math.max(RX, RZ) + 2]);
    // the SE axial walk out from the SE bridge: a white-kerbed paved walk with globe lamps, to the landing posts
    const se = Math.PI / 4; const ev = [Math.sin(se), Math.cos(se)]; const eu = [ev[1], -ev[0]];
    const WK = new Kit(this, 'shivganga-walk', { O: [cx + ev[0] * (R1 + 2.5), cz + ev[1] * (R1 + 2.5)], eu, ev, angle: Math.atan2(ev[0], ev[1]) });
    let end = 0;
    for (let v = 0; v < 44; v += 2) { const p = WK.world(0, v + 1); if (this.isBuilt(p.x, p.z, 2.5) || this.carriageAt(p.x, p.z, null, 2.5)) break; end = v + 2; }
    if (end > 4) {
      for (const [w, y, key, tile] of [[4, 0.06, 't:paving:#c8c2b6', TEX_SIZE.paving], [1.2, 0.07, 't:plasterWhite:#ece7dc', TEX_SIZE.plasterWhite]]) { const g = worldPlane(w, end, tile); g.rotateX(-Math.PI / 2); g.translate(0, y, end / 2); WK.mesh(g, key); }
      for (const s of [-1, 1]) {
        WK.box(s * 2.0 - 0.12, s * 2.0 + 0.12, 0, end, 0, 0.18, WHITE, { collide: false });
        for (let v = 4; v < end; v += 8) { WK.cyl(s * 2.6, v, 0, 0.07, 2.8, 'c:#f2f0ea', { seg: 8, collide: true }); const gl = new THREE.SphereGeometry(0.22, 12, 8); gl.translate(s * 2.6, 3.0, v); WK.mesh(gl, 'e:#fff6dc'); }
        WK.box(s * 1.9 - 0.25, s * 1.9 + 0.25, -2.2, -1.7, 0, 1.6, WHITE); // the landing's two finial posts
        const fin = new THREE.ConeGeometry(0.16, 0.5, 8); fin.translate(s * 1.9, 1.85, -1.95); WK.mesh(fin, WHITE);
      }
      for (let v = 0; v < end; v += 4) { const p = WK.world(0, v); this.envKeepOut.push([p.x, p.z, 3.2]); }
      WK.finish();
      this.envKits.push(WK);
    }
    this.shivGanga = { c: [cx, cz], r: [R0, R1], bridges: bridges.map((b) => [cx + Math.sin(b) * (R0 + R1) / 2, cz + Math.cos(b) * (R0 + R1) / 2]) };
  }

  // Small domed pavilion in the environment kit: four posts (colliders), a slab, a dome and a finial.
  chhatriAt(K, x, z, y, r) {
    K.box(x - r, x + r, z - r, z + r, y, y + 0.25, 't:plasterWhite:#f4f1ea');
    for (const [a, c] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) K.cyl(x + a * r * 0.75, z + c * r * 0.75, y + 0.25, 0.12 * r, 1.6 * r, 'c:#f6f4ee', { seg: 8, collide: true });
    K.box(x - r * 1.05, x + r * 1.05, z - r * 1.05, z + r * 1.05, y + 0.25 + 1.6 * r, y + 0.43 + 1.6 * r, 'c:#efe9de', { collide: false });
    const dome = new THREE.SphereGeometry(0.85 * r, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2); dome.translate(x, y + 0.43 + 1.6 * r, z); K.mesh(dome, 'c:#f6f4ee');
    const tip = new THREE.ConeGeometry(0.1 * r, 0.6 * r, 8); tip.translate(x, y + 0.75 + 2.45 * r, z); K.mesh(tip, 'c:#f6f4ee');
  }

  // Seated white Shiva facing east: crossed legs, tapering torso, the jata bun, a cobra round the neck, one hand
  // raised, and the trishul with its damru standing beside him.
  shivaStatue(K, x, z, y) {
    const W = 'c:#f7f6f2';
    const at = (g, dx, dy, dz, key = W) => { g.translate(x + dx, y + dy, z + dz); K.mesh(g, key); };
    at(new THREE.CylinderGeometry(1.9, 2.1, 0.5, 20), 0, 0.25, 0);
    const legs = new THREE.SphereGeometry(1, 18, 10); legs.scale(1.0, 0.42, 1.75); at(legs, 0.35, 0.82, 0);
    at(new THREE.CylinderGeometry(0.62, 0.95, 2.1, 14), 0, 2.05, 0);
    const chest = new THREE.SphereGeometry(0.75, 14, 10); chest.scale(0.8, 0.7, 1.15); at(chest, 0.05, 2.9, 0);
    at(new THREE.SphereGeometry(0.46, 16, 12), 0.08, 3.75, 0);
    at(new THREE.CylinderGeometry(0.2, 0.34, 0.62, 12), -0.05, 4.4, 0);
    const moon = new THREE.TorusGeometry(0.22, 0.04, 6, 12, Math.PI); moon.rotateY(Math.PI / 2); at(moon, 0.05, 4.62, 0.1, 'c:#e9e6da');
    const snake = new THREE.TorusGeometry(0.5, 0.07, 8, 20); snake.rotateX(Math.PI / 2); at(snake, 0.05, 3.3, 0, 'c:#3d6b45');
    for (const s of [-1, 1]) { const up = new THREE.CylinderGeometry(0.15, 0.17, 1.0, 10); up.rotateX(s * 0.25); at(up, 0.0, 2.55, s * 0.95); }
    const fore = new THREE.CylinderGeometry(0.13, 0.15, 0.9, 10); fore.rotateZ(0.2); at(fore, 0.2, 2.65, 1.12);
    at(new THREE.BoxGeometry(0.12, 0.42, 0.32), 0.3, 3.2, 1.12);
    const knee = new THREE.CylinderGeometry(0.13, 0.15, 0.95, 10); knee.rotateZ(Math.PI / 2); at(knee, 0.7, 1.35, -0.95);
    at(new THREE.CylinderGeometry(0.06, 0.06, 6.0, 8), 0.4, 3.0, -2.1, 'c:#c9c4b6');
    for (const d of [-0.32, 0, 0.32]) { const p = new THREE.ConeGeometry(0.07, 0.65, 6); p.translate(0, 0, d); at(p, 0.4, 6.3, -2.1, 'c:#c9c4b6'); }
    const damru = new THREE.CylinderGeometry(0.16, 0.06, 0.2, 10); at(damru, 0.4, 5.25, -2.1, 'c:#8a5a2e');
    this.colliders.push({ minX: x - 2.0, maxX: x + 2.0, minZ: z - 2.6, maxZ: z + 2.0, minY: y, maxY: y + 6, walkable: false, enabled: true });
  }

  buildGymkhana() {
    const ground = D.areas.find((x) => x.kind === 'ground');
    const track = D.areas.find((x) => x.kind === 'track'); // unpaved sandy track (Athletics panorama)
    const src = track || ground;
    const bb = bbox(src.poly);
    const cx = (bb.minX + bb.maxX) / 2; const cz = (bb.minZ + bb.maxZ) / 2;
    const halfW = Math.min(30, (bb.maxX - bb.minX) / 2 - 8);
    const halfL = Math.min(48, (bb.maxZ - bb.minZ) / 2 - 10);
    // field runs north–south: goals at the north and south ends
    this.fieldBounds = { minX: cx - halfW, maxX: cx + halfW, minZ: cz - halfL, maxZ: cz + halfL, axis: 'z', goalA: cx - 3.6, goalB: cx + 3.6, center: new THREE.Vector3(cx, 0.22, cz) };
    const field = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 2, halfL * 2), tiledMaterial('grass', '#bfe89a'));
    field.rotation.x = -Math.PI / 2;
    field.position.set(cx, 0.045, cz);
    field.receiveShadow = true;
    this.root.add(field);
    const line = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat('#ffffff')); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.05, z); this.root.add(m); };
    line(halfW * 2, 0.15, cx, cz);
    line(halfW * 2, 0.15, cx, cz - halfL);
    line(halfW * 2, 0.15, cx, cz + halfL);
    line(0.15, halfL * 2, cx - halfW, cz);
    line(0.15, halfL * 2, cx + halfW, cz);
    for (const gz of [cz - halfL, cz + halfL]) {
      this.box(cx - 3.6, 0, gz, 0.15, 2.4, 0.15, '#ffffff');
      this.box(cx + 3.6, 0, gz, 0.15, 2.4, 0.15, '#ffffff');
      this.box(cx, 2.4, gz, 7.4, 0.15, 0.15, '#ffffff', { collide: false });
    }
    this.goals = [{ z: cz - halfL, dir: -1 }, { z: cz + halfL, dir: 1 }];
    this.spots.playground = [];
    for (let i = 0; i < 16; i++) this.spots.playground.push(new THREE.Vector3(cx - halfW * 0.6 + (i % 4) * halfW * 0.4, 0, cz - halfL * 0.6 + Math.floor(i / 4) * halfL * 0.4));
  }

  buildANC() {
    const p = this.poi('All night canteen');
    const X = p.x; const Z = p.z + 6;
    for (const [px, pz] of [[-7, -5], [7, -5], [-7, 5], [7, 5]]) this.box(X + px, 0, Z + pz, 0.35, 3.2, 0.35, '#7a6a58');
    this.box(X, 3.2, Z, 16, 0.25, 12, null, { tex: 'rooftile', collide: false });
    this.box(X, 0, Z - 4.4, 9, 1.1, 1.1, null, { tex: 'wood' });
    this.box(X, 0, Z - 6.2, 10, 3.4, 1.2, null, { tex: 'plaster', tint: '#f0e0c0' });
    this.interactable('canteen', X, Z - 3, 'Buy something at ANC', { radius: 2.6 });
    this.spots.canteenStaff = new THREE.Vector3(X, 0, Z - 5.2);
    this.spots.canteen = [];
    for (const [tx, tz] of [[-4, 0], [4, 0], [-4, 3.5], [4, 3.5]]) {
      this.box(X + tx, 0, Z + tz, 3, 0.75, 1, null, { tex: 'wood' });
      this.spots.canteen.push(new THREE.Vector3(X + tx - 1, 0, Z + tz - 0.9), new THREE.Vector3(X + tx + 1, 0, Z + tz + 0.9));
    }
    this.label('ANC · All Night Canteen', X, 4.6, Z - 6.4, { height: 0.7, bg: 'rgba(192,57,43,0.92)' });
  }

  // "Your Bhawan": the Krishna Bhawan entrance (arrival, where batchmates gather at night) and your room inside.
  buildHostelGate() {
    const H = this.hostel;
    const lbl = H.world(-2.4, H.ve);
    this.label('Your Bhawan · Krishna Bhawan', lbl.x, 4.2, lbl.z, { height: 0.75, bg: 'rgba(30,60,110,0.92)' });
    this.spots.gate = [];
    for (let i = 0; i < 7; i++) this.spots.gate.push(H.world(-4.5 - (i % 3) * 1.4, H.ve - 3 + Math.floor(i / 3) * 2.2));
    this.spots.guard = H.npcSpots.guard;
    this.spots.parents = H.world(-6.5, H.ve + 2);
    this.spots.spawn = H.spawn;
    this.spawnYaw = H.spawnYaw + Math.PI; // the player faces -z at yaw 0, characters +z
    this.bedSpot = H.bedSpot;
    this.hostelEntrance = H.bedSpot;
  }

  // ---------- the Main Gate (gates-landmarks.md §1) ----------
  // Not an arch: two tall square piers of pinkish-red sandstone, stepped and moulded, each with a lantern on top,
  // a flat white "WELCOME" banner board between them near the top, a shorter pier about 4 m further out on each side,
  // and solid brown leaves (shut) in the bays between. Traffic uses the centre opening. It faces east onto the town
  // road; the avenue runs west into campus. Outside, a picket fence and planting strip edge the white wall.
  buildMainGate() {
    const p = this.poi('Main Gate');
    if (!p) return;
    const K = this.envKit;
    const X = p.x;
    // centre the opening on the gate avenue where it crosses the boundary line
    let Z = p.z;
    for (const r of D.roads) {
      if (this.roadCls.get(r) === 'foot' || this.roadCls.get(r) === 'town') continue;
      for (let i = 1; i < r.pts.length; i++) {
        const [a, b] = [r.pts[i - 1], r.pts[i]];
        if ((a[0] - X) * (b[0] - X) > 0) continue;
        const z = a[1] + ((X - a[0]) / (b[0] - a[0] || 1e-9)) * (b[1] - a[1]);
        if (Math.abs(z - p.z) < 6) Z = z;
      }
    }
    const SAND = 'c:#bf7563'; const SAND2 = 'c:#a95f4e'; const CAPS = 'c:#d39a86';
    const solid = (x0, x1, z0, z1, y1) => this.colliders.push({ minX: x0, maxX: x1, minZ: z0, maxZ: z1, minY: 0, maxY: y1, walkable: false, enabled: true, wall: true });
    const sq = (z, w, y0, y1, key, collide = false) => K.box(X - w / 2, X + w / 2, z - w / 2, z + w / 2, y0, y1, key, { collide });
    const MAIN = 4.35; const OUT = 8.6;
    for (const s of [-1, 1]) {
      const z = Z + s * MAIN;
      sq(z, 2.0, 0, 0.6, SAND2, true);
      sq(z, 1.5, 0.6, 4.6, SAND, true);
      for (const f of [-1, 1]) K.box(X + f * 0.75 - (f > 0 ? 0 : 0.03), X + f * 0.75 + (f > 0 ? 0.03 : 0), z - 0.45, z + 0.45, 1.2, 4.1, SAND2, { collide: false }); // sunk panels on the road faces
      sq(z, 1.75, 4.6, 4.85, CAPS);
      sq(z, 1.3, 4.85, 6.3, SAND);
      sq(z, 1.62, 6.3, 6.55, CAPS);
      sq(z, 1.12, 6.55, 7.0, SAND);
      K.cyl(X, z, 7.0, 0.09, 0.32, 'c:#2e2e2e', { seg: 8 });
      sq(z, 0.46, 7.32, 7.94, 'e:#fff1c8');
      for (const f of [-1, 1]) { K.box(X - 0.25, X + 0.25, z + f * 0.23 - 0.02, z + f * 0.23 + 0.02, 7.32, 7.94, 'c:#2e2e2e', { collide: false }); K.box(X + f * 0.23 - 0.02, X + f * 0.23 + 0.02, z - 0.25, z + 0.25, 7.32, 7.94, 'c:#2e2e2e', { collide: false }); }
      const cap = new THREE.ConeGeometry(0.42, 0.42, 4); cap.rotateY(Math.PI / 4); cap.translate(X, 8.15, z); K.mesh(cap, 'c:#2e2e2e');
      // the shorter outer pier and the shut leaves between
      const zo = Z + s * OUT;
      sq(zo, 1.2, 0, 0.4, SAND2, true); sq(zo, 0.95, 0.4, 3.0, SAND, true); sq(zo, 1.2, 3.0, 3.2, CAPS);
      const ball = new THREE.SphereGeometry(0.28, 12, 8); ball.translate(X, 3.48, zo); K.mesh(ball, CAPS);
      const z0 = Z + s * (MAIN + 0.75); const z1 = Z + s * (OUT - 0.48);
      K.box(X - 0.05, X + 0.05, Math.min(z0, z1), Math.max(z0, z1), 0.06, 2.4, 'c:#7a4a2c', { collide: false });
      for (const y of [0.35, 1.2, 2.05]) K.box(X - 0.08, X + 0.08, Math.min(z0, z1), Math.max(z0, z1), y, y + 0.1, 'c:#5e3820', { collide: false });
      solid(X - 0.15, X + 0.15, Math.min(z0, z1), Math.max(z0, z1), 2.4);
    }
    // the banner board between the main piers, on a steel frame
    const inner = MAIN - 0.65;
    K.box(X - 0.06, X + 0.06, Z - inner, Z + inner, 5.0, 6.15, 'c:#f7f7f4', { collide: false });
    for (const y of [4.94, 6.15]) K.box(X - 0.09, X + 0.09, Z - inner, Z + inner, y, y + 0.08, 'm:#6f767c', { collide: false });
    const board = K.texture('main-gate-welcome', () => canvasTexture(1024, 160, (g, W, H) => {
      g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#1c3f8c'; g.beginPath(); g.arc(90, H / 2, 58, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fbfbf8'; g.beginPath(); g.arc(90, H / 2, 44, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1c3f8c'; g.font = 'bold 34px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BITS', 90, H / 2 + 2);
      g.fillStyle = '#d8402f'; g.fillRect(W - 130, 30, 40, 100); g.fillStyle = '#f2b632'; g.fillRect(W - 90, 30, 40, 100);
      g.fillStyle = '#1c3f8c'; g.font = 'bold 92px system-ui, sans-serif'; g.fillText('WELCOME', W / 2 - 10, 66);
      g.font = 'bold 26px system-ui, sans-serif'; g.fillText('BIRLA INSTITUTE OF TECHNOLOGY & SCIENCE, PILANI', W / 2 - 10, 128);
    }, false));
    void board;
    for (const f of [-1, 1]) K.plane(X + f * 0.065, Z, 5.0, inner * 2 - 0.1, 1.15, [f, 0], 'x:main-gate-welcome', { offset: 0.005 });
    // outside: a low picket fence and a planting strip along the wall for ~30 m each way
    const B = D.boundary;
    for (let i = 0; i < B.length; i++) {
      const a = B[i]; const b = B[(i + 1) % B.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]); const tx = (b[0] - a[0]) / len; const tz = (b[1] - a[1]) / len;
      let nx = -tz; let nz = tx;
      const mx = (a[0] + b[0]) / 2; const mz = (a[1] + b[1]) / 2;
      if (inPoly(mx + nx * 3, mz + nz * 3, B)) { nx = -nx; nz = -nz; }
      for (let t = 0.5; t < len; t += 0.5) {
        const x = a[0] + tx * t; const z = a[1] + tz * t;
        const d = Math.hypot(x - X, z - Z);
        if (d < 10 || d > 34) continue;
        const fx = x + nx * 2.2; const fz = z + nz * 2.2;
        if (this.carriageAt(fx, fz, null, 0.5)) continue;
        K.box(fx - 0.03, fx + 0.03, fz - 0.03, fz + 0.03, 0, 0.8, 'c:#8a6440', { collide: false });
        if (Math.round(t * 2) % 4 === 0) { const bush = new THREE.IcosahedronGeometry(0.5, 1); bush.scale(1, 0.7, 1); bush.translate(x + nx * 1.1, 0.35, z + nz * 1.1); K.mesh(bush, 'c:#4f7d3a'); }
      }
    }
    this.gatePos = new THREE.Vector3(X, 0, Z);
    this.gateWall = { x: X, z0: Z - 40, z1: Z + 40 };
  }

  // ---------- statues (gates-landmarks.md §4–5) ----------
  // Gandhi (walking, with his staff) and Patel (standing in a shawl) are dark bronze on tall white stepped pedestals
  // in round grass islands with black-and-white kerbs at their roundabouts. G.D. Birla stands under a white
  // four-column chhatri with a ribbed dome, on a square red-sandstone base, in a railed lawn across the road from
  // the Saraswati Mandir walk.
  buildStatues() {
    const K = this.envKit;
    const BRONZE = 'm:#5e4630'; const WHITE = 't:plasterWhite:#f2efe8';
    this.statuePts ||= [];
    const pedestal = (x, z, y) => {
      K.box(x - 1.6, x + 1.6, z - 1.6, z + 1.6, y, y + 0.9, WHITE);
      K.box(x - 1.15, x + 1.15, z - 1.15, z + 1.15, y + 0.9, y + 2.6, WHITE);
      K.box(x - 1.32, x + 1.32, z - 1.32, z + 1.32, y + 2.6, y + 2.82, 'c:#e4dfd4', { collide: false });
      K.box(x - 0.6, x + 0.6, z - 1.17, z - 1.15, y + 1.3, y + 2.0, 'c:#3c3a36', { collide: false }); // plaque
      return y + 2.82;
    };
    for (const name of ['Gandhi', 'Patel']) {
      const p = this.poi(name);
      if (!p) continue;
      this.statuePts.push([p.x, p.z]);
      const R = 6;
      const kb = this.bucket('kerb', p.x, p.z);
      const n = 48;
      for (let k = 0; k < n; k++) {
        const a0 = (k / n) * Math.PI * 2; const a1 = ((k + 1) / n) * Math.PI * 2; const s0 = a0 * R; const s1 = a1 * R;
        const P = (a, r, y) => [p.x + Math.sin(a) * r, y, p.z + Math.cos(a) * r];
        this.face(kb, P(a0, R, 0.16), P(a1, R, 0.16), P(a1, R + 0.3, 0.16), P(a0, R + 0.3, 0.16), [[s0, 0], [s1, 0], [s1, 1], [s0, 1]], [0, 1, 0]);
        const am = (a0 + a1) / 2;
        this.face(kb, P(a0, R + 0.3, 0), P(a1, R + 0.3, 0), P(a1, R + 0.3, 0.16), P(a0, R + 0.3, 0.16), [[s0, 0], [s1, 0], [s1, 0.4], [s0, 0.4]], [Math.sin(am), 0, Math.cos(am)]);
      }
      const circ = Array.from({ length: 40 }, (_, k) => [p.x + Math.sin((k / 40) * Math.PI * 2) * (R + 0.05), p.z + Math.cos((k / 40) * Math.PI * 2) * (R + 0.05)]);
      this.addShape('lawn', p.x, p.z, this.flatShape(circ, [], 0.12, TEX_SIZE.grass));
      K.box(p.x - 2.2, p.x + 2.2, p.z - 2.2, p.z + 2.2, 0, 0.3, 't:tiles:#f4f2ee');
      const top = pedestal(p.x, p.z, 0.3);
      if (name === 'Gandhi') this.gandhiFigure(K, p.x, p.z, top, BRONZE);
      else this.patelFigure(K, p.x, p.z, top, BRONZE);
      this.colliders.push({ minX: p.x - R, maxX: p.x + R, minZ: p.z - R, maxZ: p.z + R, minY: 0, maxY: 0.16, walkable: true, enabled: true });
    }
    // G.D. Birla
    const g = this.poi('G.D. Birla Statu');
    if (g) {
      const x = g.x; const z = g.z - 2;
      this.statuePts.push([x, z]);
      const lawn = D.areas.find((a) => a.kind === 'grass' && inPoly(x, z + 6, a.poly) === false && a.poly.some(([px, pz]) => Math.hypot(px - x, pz - z) < 6));
      K.box(x - 2.2, x + 2.2, z - 2.2, z + 2.2, 0, 0.35, 'c:#9c4a3a');
      { const gp = worldPlane(3, 6.5, 2); gp.rotateX(-Math.PI / 2); gp.translate(x, 0.07, z + 5.2); K.mesh(gp, 't:paving:#a65a45'); }
      K.box(x - 1.0, x + 1.0, z - 1.0, z + 1.0, 0.35, 0.85, WHITE);
      K.box(x - 0.72, x + 0.72, z - 0.72, z + 0.72, 0.85, 2.25, WHITE);
      K.box(x - 0.85, x + 0.85, z - 0.85, z + 0.85, 2.25, 2.4, 'c:#e4dfd4', { collide: false });
      this.birlaFigure(K, x, z, 2.4, BRONZE);
      for (const [a, c] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        K.box(x + a * 1.75 - 0.14, x + a * 1.75 + 0.14, z + c * 1.75 - 0.14, z + c * 1.75 + 0.14, 0.35, 4.9, 'c:#f6f4ee');
        K.box(x + a * 1.75 - 0.22, x + a * 1.75 + 0.22, z + c * 1.75 - 0.22, z + c * 1.75 + 0.22, 0.35, 0.7, 'c:#ece7dc', { collide: false });
      }
      K.box(x - 2.15, x + 2.15, z - 2.15, z + 2.15, 4.9, 5.25, 'c:#f6f4ee', { collide: false });
      K.box(x - 2.3, x + 2.3, z - 2.3, z + 2.3, 5.25, 5.35, 'c:#e4dfd4', { collide: false });
      const dome = new THREE.SphereGeometry(1.55, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2); dome.scale(1, 1.1, 1); dome.translate(x, 5.35, z); K.mesh(dome, 'c:#f6f4ee');
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; const rib = new THREE.TorusGeometry(1.56, 0.04, 4, 12, Math.PI / 2); rib.scale(1, 1.1, 1); rib.rotateY(a); rib.translate(x, 5.35, z); K.mesh(rib, 'c:#e4dfd4'); }
      K.cyl(x, z, 7.0, 0.22, 0.3, 'c:#f6f4ee', { seg: 10, rTop: 0.12 });
      const fin = new THREE.ConeGeometry(0.1, 0.7, 8); fin.translate(x, 7.65, z); K.mesh(fin, 'm:#c9a646');
      // the low white railing round the lawn's three garden sides
      if (lawn) {
        const P = lawn.poly; const notch = ([px, pz]) => px > 85 && px < 97 && pz > 563 && pz < 579;
        for (let i = 0; i < P.length; i++) {
          const a = P[i]; const b = P[(i + 1) % P.length];
          if (notch(a) || notch(b) || Math.max(a[1], b[1]) > 576.5) continue;
          const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
          for (let t = 0; t <= len; t += 1.5) { const px = a[0] + ((b[0] - a[0]) * t) / len; const pz = a[1] + ((b[1] - a[1]) * t) / len; K.box(px - 0.05, px + 0.05, pz - 0.05, pz + 0.05, 0, 0.7, 'c:#f4f2ec', { collide: false }); }
          const ang = Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
          for (const y of [0.62, 0.3]) { const rg = new THREE.BoxGeometry(len, 0.05, 0.05); rg.rotateY(ang); rg.translate((a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2); K.mesh(rg, 'c:#f4f2ec'); }
        }
      }
    }
  }

  // Gandhi walking with his staff: a dhoti, bare chest under a shawl over one shoulder, the left leg striding.
  gandhiFigure(K, x, z, y, M) {
    const at = (g, dx, dy, dz) => { g.translate(x + dx, y + dy, z + dz); K.mesh(g, M); };
    for (const [s, ang] of [[-1, 0.28], [1, -0.22]]) { const leg = new THREE.CylinderGeometry(0.08, 0.07, 0.85, 8); leg.translate(0, -0.42, 0); leg.rotateX(ang); at(leg, s * 0.11, 0.88, 0); }
    at(new THREE.CylinderGeometry(0.23, 0.32, 0.55, 12), 0, 1.0, 0);
    const torso = new THREE.CylinderGeometry(0.2, 0.2, 0.62, 12); torso.rotateX(-0.12); at(torso, 0, 1.55, -0.03);
    const shawl = new THREE.BoxGeometry(0.46, 0.5, 0.12); shawl.rotateZ(0.5); at(shawl, -0.04, 1.6, 0.0);
    at(new THREE.SphereGeometry(0.15, 14, 10), 0, 2.02, -0.08);
    const arm = new THREE.CylinderGeometry(0.05, 0.05, 0.62, 8); arm.rotateX(0.5); at(arm, 0.25, 1.52, -0.14);
    const arm2 = new THREE.CylinderGeometry(0.05, 0.05, 0.62, 8); arm2.rotateX(-0.45); at(arm2, -0.25, 1.55, 0.12);
    const staff = new THREE.CylinderGeometry(0.025, 0.025, 1.95, 6); staff.rotateX(0.1); at(staff, 0.33, 0.98, -0.35);
  }

  // Patel standing in a dhoti and a shawl wrapped round his shoulders, one hand at his side.
  patelFigure(K, x, z, y, M) {
    const at = (g, dx, dy, dz) => { g.translate(x + dx, y + dy, z + dz); K.mesh(g, M); };
    at(new THREE.CylinderGeometry(0.22, 0.3, 0.95, 12), 0, 0.48, 0);
    at(new THREE.CylinderGeometry(0.36, 0.26, 0.85, 12), 0, 1.38, 0);
    const wrap = new THREE.SphereGeometry(0.4, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2); wrap.scale(1, 0.5, 0.85); at(wrap, 0, 1.75, 0);
    at(new THREE.SphereGeometry(0.16, 14, 10), 0, 2.02, 0);
    const arm = new THREE.CylinderGeometry(0.06, 0.055, 0.7, 8); arm.rotateX(-0.6); at(arm, 0.3, 1.42, -0.18);
  }

  // G.D. Birla standing in a long coat (achkan) and a cap.
  birlaFigure(K, x, z, y, M) {
    const at = (g, dx, dy, dz) => { g.translate(x + dx, y + dy, z + dz); K.mesh(g, M); };
    for (const s of [-1, 1]) at(new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8), s * 0.11, 0.25, 0);
    at(new THREE.CylinderGeometry(0.24, 0.34, 0.95, 12), 0, 0.95, 0);
    at(new THREE.CylinderGeometry(0.25, 0.24, 0.5, 12), 0, 1.65, 0);
    at(new THREE.SphereGeometry(0.14, 14, 10), 0, 2.07, 0);
    at(new THREE.CylinderGeometry(0.13, 0.14, 0.12, 12), 0, 2.2, 0);
    for (const s of [-1, 1]) { const arm = new THREE.CylinderGeometry(0.06, 0.06, 0.7, 8); arm.rotateZ(s * 0.12); at(arm, s * 0.3, 1.5, 0); }
  }

  // ---------- Birla Museum and the Dakota (gates-landmarks.md §6) ----------
  // The museum footprint is drawn as a low two-storey hall in the Science Centre's terracotta tile with a solar
  // roof (ENV_STYLE). Its rounded east end is the entrance: a white drum porch on round columns over a short flight
  // of steps with steel rails, a red-and-grey paver forecourt and a lawn with a metal sculpture. South of it, on
  // an open lawn, G.D. Birla's silver Douglas DC-3 Dakota on low pads.
  buildMuseum() {
    const K = this.envKit;
    const mus = this.findBuilding('Birla Museum');
    if (mus) {
      const px = -173.6; const pz = 47.2; const R = 3.4; const FL = 0.6;
      // plinth with four steps down to the east, walkable
      K.cyl(px, pz, 0, R + 0.6, FL, 't:plasterWhite:#ece6da', { seg: 24 });
      this.colliders.push({ minX: px - R, maxX: px + R, minZ: pz - R, maxZ: pz + R, minY: 0, maxY: FL, walkable: true, enabled: true });
      for (let i = 0; i < 4; i++) K.box(px + R + 0.6 + (3 - i) * 0.3, px + R + 0.6 + (4 - i) * 0.3, pz - 1.8, pz + 1.8, 0, (i + 1) * 0.15, 't:plasterWhite:#ece6da', { walkable: true });
      for (const s of [-1, 1]) { K.box(px + R + 0.55, px + R + 1.85, pz + s * 1.85 - 0.025, pz + s * 1.85 + 0.025, 0.95, 1.0, 'm:#c3c8cc', { collide: false }); for (const x of [px + R + 0.6, px + R + 1.8]) K.box(x - 0.025, x + 0.025, pz + s * 1.85 - 0.025, pz + s * 1.85 + 0.025, 0, 1.0, 'm:#c3c8cc', { collide: false }); }
      for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k / 5) * Math.PI; K.cyl(px + Math.sin(a + Math.PI / 2) * (R - 0.3), pz + Math.cos(a + Math.PI / 2) * (R - 0.3), FL, 0.22, 3.6, 'c:#f6f3ec', { seg: 12, collide: true }); }
      K.cyl(px, pz, FL + 3.6, R + 0.2, 1.4, 'c:#f6f3ec', { seg: 32 }); // the white drum
      K.cyl(px, pz, FL + 5.0, R + 0.45, 0.25, 'c:#e6e0d4', { seg: 32 });
      K.box(px + 0.6, px + 1.0, pz - 1.2, pz + 1.2, FL, FL + 2.6, 'c:#e1b739', { collide: false }); // yellow glazed doors
      K.label('Birla Science Centre', px + 6, pz, 6.5, { height: 0.5, bg: 'rgba(160,70,40,0.9)' });
      // forecourt (hexagonal red and grey pavers) and a lawn with a steel sculpture
      { const g = worldPlane(9, 16, TEX_SIZE.paving); g.rotateX(-Math.PI / 2); g.translate(px + 9, 0.06, pz); K.mesh(g, 't:paving:#b98a7a'); }
      const lawn = this.flatShape([[px + 14, pz - 14], [px + 26, pz - 14], [px + 26, pz + 14], [px + 14, pz + 14]], [], 0.03, TEX_SIZE.grass);
      this.addShape('lawn', px + 20, pz, lawn);
      K.box(px + 19.6, px + 20.4, pz - 0.4, pz + 0.4, 0, 0.6, 't:concrete:#bdb8ae');
      for (let k = 0; k < 3; k++) { const ring = new THREE.TorusGeometry(0.9 - k * 0.2, 0.06, 6, 24); ring.rotateY(k * 0.9); ring.translate(px + 20, 1.7, pz); K.mesh(ring, 'm:#c9ced3'); }
    }
    // the Dakota on its lawn
    const p = this.poi('Birla Aircraft');
    if (!p) return;
    const ax = p.x; const az = p.z;
    this.addShape('lawn', ax, az, this.flatShape(Array.from({ length: 28 }, (_, k) => [ax + Math.sin((k / 28) * Math.PI * 2) * 23, az + Math.cos((k / 28) * Math.PI * 2) * 19]), [], 0.03, TEX_SIZE.grass));
    this.envKeepOut.push([ax, az, 22]);
    this.buildDakota(ax, az, -0.75);
    this.label('Birla Aircraft · DC-3 Dakota', ax, 7.5, az, { height: 0.5, bg: 'rgba(30,50,90,0.88)' });
  }

  // A Douglas DC-3 (about 19.6 m long, 29 m span): natural-metal fuselage, low tapered wing with dihedral, two radial
  // engines with three-blade propellers, a tail wheel (so it sits nose-up), on three low concrete pads.
  buildDakota(x, z, yaw) {
    const K = this.envKit;
    const SKIN = 'm:#c7ccd1'; const DARK = 'c:#22272c'; const TYRE = 'c:#1d1d1f';
    const tilt = 0.1; const PAD = 0.3;
    const M = new THREE.Matrix4().makeTranslation(x, PAD, z)
      .multiply(new THREE.Matrix4().makeRotationY(yaw))
      .multiply(new THREE.Matrix4().makeTranslation(0, 2.0, 0))
      .multiply(new THREE.Matrix4().makeRotationX(-tilt))
      .multiply(new THREE.Matrix4().makeTranslation(0, 0, -2.4));
    const put = (g, key) => { g.applyMatrix4(M); K.mesh(g, key); };
    // fuselage (lathe along +z, nose at +9.8)
    const prof = [[0.05, 0], [0.45, 1.5], [0.9, 4], [1.2, 7], [1.36, 10], [1.36, 14], [1.25, 16.6], [0.95, 18.3], [0.55, 19.2], [0.05, 19.6]].map(([r, y]) => new THREE.Vector2(r, y));
    const fus = new THREE.LatheGeometry(prof, 20); fus.rotateX(Math.PI / 2); fus.translate(0, 0, -9.8); put(fus, SKIN);
    // cockpit glazing and a row of cabin windows each side
    for (const s of [-1, 1]) {
      const ws = new THREE.BoxGeometry(0.06, 0.38, 0.75); ws.rotateZ(s * 0.45); ws.translate(s * 0.62, 0.72, 8.15); put(ws, DARK);
      for (let k = 0; k < 7; k++) { const w = new THREE.BoxGeometry(0.06, 0.34, 0.42); w.translate(s * 1.33, 0.38, -2.2 + k * 1.25); put(w, DARK); }
    }
    // wing: one tapered planform with 6° dihedral, its top 0.75 m under the fuselage axis
    const plan = (pts, depth) => { const sh = new THREE.Shape(pts.map(([a, b]) => new THREE.Vector2(a, b))); const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false }); g.rotateX(Math.PI / 2); return g; };
    const wing = plan([[-14.5, 1.1], [-14.5, 2.4], [-13.8, 2.75], [0, 3.6], [13.8, 2.75], [14.5, 2.4], [14.5, 1.1], [0, -0.8]], 0.32);
    wing.translate(0, -0.75, 0);
    const wp = wing.attributes.position;
    for (let i = 0; i < wp.count; i++) wp.setY(i, wp.getY(i) + Math.abs(wp.getX(i)) * 0.105);
    wing.computeVertexNormals();
    put(wing, SKIN);
    // tailplane and fin
    const tp = plan([[-4.3, -9.0], [-4.3, -8.2], [0, -6.0], [4.3, -8.2], [4.3, -9.0], [0, -9.5]], 0.14); tp.translate(0, 0.35, 0); put(tp, SKIN);
    const finSh = new THREE.Shape([[-9.7, 0.2], [-6.0, 0.4], [-8.0, 2.4], [-8.6, 4.0], [-9.4, 4.1], [-9.9, 3.2]].map(([a, b]) => new THREE.Vector2(a, b)));
    const fin = new THREE.ExtrudeGeometry(finSh, { depth: 0.16, bevelEnabled: false }); fin.translate(0, 0, -0.08); fin.rotateY(-Math.PI / 2); put(fin, SKIN);
    // engines, propellers, main wheels
    for (const s of [-1, 1]) {
      const ex = s * 5.6; const ey = -0.6 + 5.6 * 0.105;
      const nac = new THREE.CylinderGeometry(0.78, 0.5, 4.4, 16); nac.rotateX(Math.PI / 2); nac.translate(ex, ey, 3.0); put(nac, SKIN);
      const cowl = new THREE.CylinderGeometry(0.8, 0.8, 0.5, 16, 1, true); cowl.rotateX(Math.PI / 2); cowl.translate(ex, ey, 5.0); put(cowl, 'c:#3a3f45');
      const hub = new THREE.ConeGeometry(0.28, 0.6, 12); hub.rotateX(Math.PI / 2); hub.translate(ex, ey, 5.55); put(hub, SKIN);
      for (let k = 0; k < 3; k++) { const bl = new THREE.BoxGeometry(0.2, 1.75, 0.05); bl.translate(0, 0.9, 0); bl.rotateZ((k / 3) * Math.PI * 2 + 0.3); bl.translate(ex, ey, 5.42); put(bl, DARK); }
      const wheel = new THREE.CylinderGeometry(0.62, 0.62, 0.38, 18); wheel.rotateZ(Math.PI / 2); wheel.translate(ex, -1.38, 2.6); put(wheel, TYRE);
      const strut = new THREE.BoxGeometry(0.16, 0.6, 0.16); strut.translate(ex, -1.0, 2.6); put(strut, 'm:#8d949a');
    }
    const tw = new THREE.CylinderGeometry(0.22, 0.22, 0.14, 12); tw.rotateZ(Math.PI / 2); tw.translate(0, -0.72, -8.3); put(tw, TYRE);
    const tws = new THREE.BoxGeometry(0.08, 0.4, 0.08); tws.translate(0, -0.45, -8.3); put(tws, 'm:#8d949a');
    // pads under the wheels, and colliders along the fuselage, the engines and the wing roots
    const W = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyMatrix4(M);
    for (const [lx, ly, lz] of [[-5.6, -2.0, 2.6], [5.6, -2.0, 2.6], [0, -0.94, -8.3]]) { const q = W(lx, ly, lz); K.box(q.x - 0.7, q.x + 0.7, q.z - 0.7, q.z + 0.7, 0, PAD, 't:concrete:#b7b2a8'); }
    for (let lz = -9; lz <= 9.5; lz += 1.5) { const q = W(0, 0, lz); this.colliders.push({ minX: q.x - 1.1, maxX: q.x + 1.1, minZ: q.z - 1.1, maxZ: q.z + 1.1, minY: 0, maxY: q.y + 1.3, walkable: false, enabled: true }); }
    for (const s of [-1, 1]) for (let lx = 1.5; lx <= 13.5; lx += 1.5) { const q = W(s * lx, -0.9 + lx * 0.105, 1.4); this.colliders.push({ minX: q.x - 1.3, maxX: q.x + 1.3, minZ: q.z - 1.3, maxZ: q.z + 1.3, minY: Math.max(0, q.y - 1.2), maxY: q.y + 0.4, walkable: false, enabled: true }); }
  }

  // Street lights (instanced). Every campus road is OSM `service`, so they are placed by road class: tall plain
  // galvanised poles with a cool-white LED head every 35 m along the avenues and the Main Building drive (sides
  // alternating, at the back of the footpath), white lantern posts every 40 m along the lanes, and the old
  // single-arm pole on the town roads. None stands in the Clock Tower → Saraswati Mandir view.
  buildLampPosts() {
    const sets = { pole: [], lantern: [], town: [] };
    const TOWN = new Set(['primary', 'secondary', 'tertiary', 'residential', 'unclassified']);
    for (const r of D.roads) {
      const c = this.roadCls.get(r);
      if (c === 'foot' || (c === 'town' && !TOWN.has(r.kind))) continue;
      const kind = c === 'town' ? 'town' : c === 'lane' ? 'lantern' : 'pole';
      const step = kind === 'lantern' ? 40 : 35;
      const hw = this.roadHalf(r);
      let acc = 0; let n = 0;
      for (let i = 1; i < r.pts.length; i++) {
        const [x0, z0] = r.pts[i - 1]; const [x1, z1] = r.pts[i];
        const len = Math.hypot(x1 - x0, z1 - z0);
        if (len < 0.01) continue;
        const nx = -(z1 - z0) / len; const nz = (x1 - x0) / len;
        for (let t = step - acc; t < len; t += step) {
          const s = kind === 'pole' && n++ % 2 ? -1 : 1;
          const bx = x0 + ((x1 - x0) * t) / len; const bz = z0 + ((z1 - z0) * t) / len;
          const offs = c === 'avenue' ? [AV.half + AV.kerb + AV.foot + 0.4, AV.half + AV.kerb + 0.35] : [hw + (kind === 'town' ? 1.1 : 0.8)];
          for (const off of offs) {
            const x = bx + nx * s * off; const z = bz + nz * s * off;
            if (kind !== 'town' && !inPoly(x, z, D.boundary)) break;
            if (kind === 'town' && (!inPoly(x, z, D.boundary) && !this.nearBoundary(x, z, 60))) break;
            if (this.isBuilt(x, z, 0.8) || this.carriageAt(x, z, null, 0.25) || this.groundAt(x, z) < -0.01 || Math.hypot(x, z) < 34 || this.onAxis(x, z, 1.5)) continue;
            if (this.gatePos && Math.hypot(x - this.gatePos.x, z - this.gatePos.z) < 12) continue;
            sets[kind].push([x, z, Math.atan2(-nx * s, -nz * s)]);
            break;
          }
        }
        acc = (acc + len) % step;
      }
    }
    // white lantern posts on the corners of the statue roundabouts and the ANC junction
    for (const [jx, jz] of [[-12.5, 359.2], [125.6, 338.7], [214.7, 323.1]]) {
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
        for (const rr of [10.5, 13, 15.5]) {
          const x = jx + Math.sin(a) * rr; const z = jz + Math.cos(a) * rr;
          if (this.isBuilt(x, z, 0.8) || this.carriageAt(x, z, null, 0.3) || this.onAxis(x, z, 1.5)) continue;
          sets.lantern.push([x, z, 0]);
          break;
        }
      }
    }
    const steel = mat('#a3a9ad', { roughness: 0.45, metalness: 0.55 });
    const white = mat('#f2f0ea', { roughness: 0.6 });
    const led = new THREE.MeshStandardMaterial({ color: '#f4f8ff', emissive: '#c9dcff', emissiveIntensity: 0.6, roughness: 0.3 });
    const warm = new THREE.MeshStandardMaterial({ color: '#fff4d6', emissive: '#6b5a2a', roughness: 0.4 });
    const merge = (list) => mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g)));
    const kinds = {
      // 9 m tapered pole, a short upswept arm and a flat LED head over the road
      pole: [merge([new THREE.CylinderGeometry(0.075, 0.13, 9, 8).translate(0, 4.5, 0), new THREE.BoxGeometry(0.07, 0.07, 1.7).rotateX(-0.12).translate(0, 8.95, 0.8), new THREE.CylinderGeometry(0.16, 0.16, 0.4, 8).translate(0, 0.2, 0)]), steel,
        new THREE.BoxGeometry(0.3, 0.09, 0.62).translate(0, 9.02, 1.75), led],
      // white fluted column on a square plinth with a lantern head (hostel lanes, junction corners)
      lantern: [merge([new THREE.BoxGeometry(0.42, 0.6, 0.42).translate(0, 0.3, 0), new THREE.CylinderGeometry(0.085, 0.12, 3.4, 8).translate(0, 2.3, 0), new THREE.CylinderGeometry(0.16, 0.12, 0.18, 8).translate(0, 4.05, 0), new THREE.ConeGeometry(0.3, 0.32, 4).rotateY(Math.PI / 4).translate(0, 4.82, 0), new THREE.SphereGeometry(0.06, 6, 4).translate(0, 5.0, 0)]), white,
        new THREE.BoxGeometry(0.34, 0.5, 0.34).translate(0, 4.4, 0), led],
      town: [merge([new THREE.CylinderGeometry(0.07, 0.11, 6.6, 6).translate(0, 3.3, 0), new THREE.BoxGeometry(0.08, 0.08, 1.3).translate(0, 6.45, 0.6)]), mat('#9aa0a3', { roughness: 0.5, metalness: 0.4 }),
        new THREE.BoxGeometry(0.28, 0.14, 0.55).translate(0, 6.35, 1.25), warm],
    };
    const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion(); const up = new THREE.Vector3(0, 1, 0); const one = new THREE.Vector3(1, 1, 1); const v = new THREE.Vector3();
    this.lampPts = [];
    for (const [kind, pts] of Object.entries(sets)) {
      if (!pts.length) continue;
      const [pole, poleMat, head, headMat] = kinds[kind];
      const poles = new THREE.InstancedMesh(pole, poleMat, pts.length);
      const heads = new THREE.InstancedMesh(head, headMat, pts.length);
      pts.forEach(([x, z, yaw], i) => {
        m4.compose(v.set(x, 0, z), q.setFromAxisAngle(up, yaw), one);
        poles.setMatrixAt(i, m4);
        heads.setMatrixAt(i, m4);
        this.colliders.push({ minX: x - 0.18, maxX: x + 0.18, minZ: z - 0.18, maxZ: z + 0.18, minY: 0, maxY: 2.5, walkable: false, enabled: true, tree: true });
        this.lampPts.push([x, z, kind]);
      });
      for (const im of [poles, heads]) { im.castShadow = kind !== 'lantern'; im.computeBoundingSphere(); this.root.add(im); }
    }
    this.lampCount = this.lampPts.length;
  }

  // ---------- boundary wall and the side gates (gates-landmarks.md §2) ----------
  // White plaster, 2.1 m, a thin maroon coping, no pilasters, along the OSM boundary. It opens at the Main Gate and
  // wherever a road crosses it; those openings get a pair of cream piers with maroon caps and urn finials.
  buildBoundaryWall() {
    const B = D.boundary; const K = this.envKit;
    const H = 2.1; const T = 0.28;
    const PL = `t:plasterWhite:#f3efe6`; const COPE = 'c:#7a2c26';
    this.wallGrid = new Map();
    const piers = [];
    let pieces = 0;
    const rbox = (cx, cz, len, w, y0, y1, ang, key) => {
      const g = worldBoxGeometry(len, y1 - y0, w, TEX_SIZE.plasterWhite);
      g.rotateY(ang);
      g.translate(cx, (y0 + y1) / 2, cz);
      K.mesh(g, key);
    };
    for (let i = 0; i < B.length; i++) {
      const a = B[i]; const b = B[(i + 1) % B.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 0.1) continue;
      const tx = (b[0] - a[0]) / len; const tz = (b[1] - a[1]) / len;
      const ang = Math.atan2(-tz, tx);
      const n = Math.ceil(len / 2);
      let prev = null;
      for (let k = 0; k < n; k++) {
        const t0 = (k / n) * len; const t1 = ((k + 1) / n) * len; const tm = (t0 + t1) / 2;
        const mx = a[0] + tx * tm; const mz = a[1] + tz * tm;
        let state = 'wall';
        if (this.gatePos && Math.hypot(mx - this.gatePos.x, mz - this.gatePos.z) < 9.6) state = 'gate';
        else if (this.carriageAt(mx, mz, null, 1.4)) state = 'road';
        else if (this.isBuilt(mx, mz, 0.4) || this.groundAt(mx, mz) < -0.01) state = 'skip';
        if (prev && ((prev === 'wall' && state === 'road') || (prev === 'road' && state === 'wall'))) piers.push([a[0] + tx * t0, a[1] + tz * t0, ang]);
        prev = state;
        if (state !== 'wall') continue;
        const pl = t1 - t0 + 0.02;
        rbox(mx, mz, pl, T, 0, H, ang, PL);
        rbox(mx, mz, pl, T + 0.1, H, H + 0.09, ang, COPE);
        const x0 = a[0] + tx * t0; const z0 = a[1] + tz * t0; const x1 = a[0] + tx * t1; const z1 = a[1] + tz * t1;
        this.colliders.push({ minX: Math.min(x0, x1) - 0.2, maxX: Math.max(x0, x1) + 0.2, minZ: Math.min(z0, z1) - 0.2, maxZ: Math.max(z0, z1) + 0.2, minY: 0, maxY: H, walkable: false, enabled: true, wall: true });
        this.gridInsert(this.wallGrid, { minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1) }, [[x0, z0], [x1, z1]], 20);
        pieces++;
      }
    }
    for (const [x, z, ang] of piers) {
      rbox(x, z, 0.85, 0.85, 0, 2.6, ang, 't:plasterWhite:#ecdcb4');
      rbox(x, z, 1.0, 1.0, 2.6, 2.78, ang, COPE);
      K.cyl(x, z, 2.78, 0.16, 0.12, 'c:#ecdcb4', { seg: 10, rTop: 0.1 });
      const urn = new THREE.SphereGeometry(0.26, 12, 8); urn.scale(1, 1.15, 1); urn.translate(x, 3.15, z); K.mesh(urn, 'c:#ecdcb4');
      K.cyl(x, z, 3.42, 0.05, 0.22, 'c:#ecdcb4', { seg: 8, rTop: 0.01 });
      this.colliders.push({ minX: x - 0.55, maxX: x + 0.55, minZ: z - 0.55, maxZ: z + 0.55, minY: 0, maxY: 2.6, walkable: false, enabled: true, wall: true });
    }
    this.wallPieces = pieces;
    this.sideGates = piers.length / 2;
  }

  // Within d metres of the boundary wall.
  wallNear(x, z, d) {
    for (const [p, q] of this.gridNear(this.wallGrid || new Map(), x, z, 20)) if (segDist(x, z, p, q) < d) return true;
    return false;
  }

  // Ashoka trees (Polyalthia longifolia): tall, narrow, drooping columns in rows along the temple approach.
  buildAshoka() {
    const list = (this.ashokaPts || []).filter(([x, z]) => !this.isBuilt(x, z, 1) && !this.nearRoad(x, z, 0.6));
    if (!list.length) return;
    const crown = new THREE.CylinderGeometry(0.25, 1.15, 8.2, 8, 4);
    const p = crown.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); const bulge = 1 + 0.35 * Math.sin(((y + 4.1) / 8.2) * Math.PI); p.setX(i, p.getX(i) * bulge); p.setZ(i, p.getZ(i) * bulge); }
    crown.translate(0, 5.6, 0);
    crown.computeVertexNormals();
    const trunk = new THREE.CylinderGeometry(0.1, 0.16, 1.8, 6).translate(0, 0.9, 0);
    const crowns = new THREE.InstancedMesh(crown, new THREE.MeshStandardMaterial({ color: '#2f5a2a', roughness: 0.95, flatShading: true }), list.length);
    const trunks = new THREE.InstancedMesh(trunk, mat('#5b4532', { roughness: 1 }), list.length);
    const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion(); const v = new THREE.Vector3(); const s = new THREE.Vector3();
    list.forEach(([x, z], i) => {
      const k = 0.9 + ((i * 7) % 5) * 0.06;
      m4.compose(v.set(x, 0, z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), i * 0.7), s.set(k, k, k));
      crowns.setMatrixAt(i, m4); trunks.setMatrixAt(i, m4);
      this.colliders.push({ minX: x - 0.2, maxX: x + 0.2, minZ: z - 0.2, maxZ: z + 0.2, minY: 0, maxY: 1.2, walkable: false, enabled: true, tree: true });
    });
    for (const im of [crowns, trunks]) { im.castShadow = true; im.computeBoundingSphere(); this.root.add(im); }
    this.ashokaCount = list.length;
  }

  // Within d metres of the campus boundary line.
  nearBoundary(x, z, d) {
    const B = D.boundary;
    for (let i = 0; i < B.length; i++) if (segDist(x, z, B[i], B[(i + 1) % B.length]) < d) return true;
    return false;
  }

  // ---------- trees ----------
  buildTrees() {
    const pts = [];
    const fb = this.fieldBounds;
    let s = 11;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const [sgx, sgz] = SG_WATER.c;
    const add = (x, z, k, painted = false) => {
      if (this.isBuilt(x, z, 1.5) || this.nearRoad(x, z, 0.8)) return;
      if (this.hostels.some((H) => !H.treeOk(x, z))) return;
      if (fb && x > fb.minX - 3 && x < fb.maxX + 3 && z > fb.minZ - 3 && z < fb.maxZ + 3) return;
      if (this.keepClear(x, z)) return;
      if (Math.hypot(x, z) < 30) return;
      if (this.onAxis(x, z)) return; // the Clock Tower → Saraswati Mandir view
      if (this.gatePos && Math.hypot(x - this.gatePos.x, z - this.gatePos.z) < 26) return;
      if (this.gateWall && Math.abs(x - this.gateWall.x) < 3.5 && z > this.gateWall.z0 && z < this.gateWall.z1) return;
      if ((this.statuePts || []).some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 9)) return;
      if ((this.envKeepOut || []).some(([kx, kz, kr]) => Math.hypot(x - kx, z - kz) < kr)) return;
      const sg = Math.hypot(x - sgx, z - sgz);
      if (sg > SG_WATER.r[0] - 3 && sg < SG_WATER.r[1] + 8.5) return; // canal and its ring walk
      if (this.wallNear(x, z, 1.6)) return;
      const zone = this.envZoneAt(x, z);
      if (zone && rnd() > zone.trees) return;
      for (const r of this.roomList) if (x > r.x0 - 3 && x < r.x1 + 3 && z > r.z0 - 3 && z < r.z1 + 3) return;
      pts.push([x, z, k, painted]);
    };
    // Avenue trees: large neem-like canopies 8 m apart in the verge behind each footpath, their trunks painted red
    // and white; smaller trees along the lanes.
    for (const r of D.roads) {
      const c = this.roadCls.get(r);
      if (c === 'foot') continue;
      const avenue = c === 'avenue';
      const off = avenue ? this.roadOuter(r) + 1.6 : this.roadHalf(r) + 2.6;
      const step = avenue ? 8 : 9;
      for (let i = 1; i < r.pts.length; i++) {
        const [x0, z0] = r.pts[i - 1]; const [x1, z1] = r.pts[i];
        const len = Math.hypot(x1 - x0, z1 - z0);
        if (len < 0.01) continue;
        const nx = -(z1 - z0) / len; const nz = (x1 - x0) / len;
        for (let t = 4; t < len; t += step) {
          const bx = x0 + ((x1 - x0) * t) / len; const bz = z0 + ((z1 - z0) * t) / len;
          for (const side of [-1, 1]) add(bx + nx * side * off, bz + nz * side * off, avenue ? 1.25 + rnd() * 0.5 : 0.9 + rnd() * 0.5, avenue && inPoly(bx, bz, D.boundary));
        }
      }
    }
    // a dense ring of tall trees round the Shiv Ganga ring walk
    for (let i = 0; i < 260; i++) {
      const a = rnd() * Math.PI * 2; const rr = SG_WATER.r[1] + 9 + rnd() * 26;
      add(sgx + Math.sin(a) * rr, sgz + Math.cos(a) * rr, 1.2 + rnd() * 0.6);
    }
    // scattered trees on the open campus ground: near-continuous canopy between the buildings in every aerial view
    const B = bbox(D.boundary);
    for (let i = 0; i < 15000 && pts.length < 15500; i++) {
      const x = B.minX + rnd() * (B.maxX - B.minX); const z = B.minZ + rnd() * (B.maxZ - B.minZ);
      if (!inPoly(x, z, D.boundary)) continue;
      if (rnd() < 0.6) add(x, z, 0.85 + rnd() * 0.8);
    }
    // Bhawan and academic courtyards are thick with trees in every aerial view
    for (const b of this.buildings) {
      if (!b.inCampus) continue;
      for (const hole of b.holes) {
        const hb = bbox(hole);
        const n = Math.floor(((hb.maxX - hb.minX) * (hb.maxZ - hb.minZ)) / 140);
        for (let i = 0; i < n * 3 && n > 0; i++) {
          const x = hb.minX + rnd() * (hb.maxX - hb.minX); const z = hb.minZ + rnd() * (hb.maxZ - hb.minZ);
          if (b.hostel && !b.hostel.treeOk(x, z)) continue;
          if (inPoly(x, z, hole) && hole.every((p, j) => segDist(x, z, p, hole[(j + 1) % hole.length]) > 4.5)) pts.push([x, z, 0.8 + rnd() * 0.5]);
        }
      }
    }
    for (const H of this.hostels) pts.push(...(H.shadeTrees || []));
    const byChunk = new Map();
    for (const p of pts) {
      const k = chunkKey(p[0], p[1]);
      if (!byChunk.has(k)) byChunk.set(k, []);
      byChunk.get(k).push(p);
    }
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 3.2, 6);
    trunkGeo.translate(0, 1.6, 0);
    // Broad, flat-topped canopies in olive greens: the khejri, neem and babool lining every campus road. Each chunk
    // has both crowns (js/world/foliage.js); update() shows the clustered one only near the camera.
    const crownGeo = { near: crownGeometry('near'), far: crownGeometry('far') };
    const trunkMat = mat('#5b4532', { roughness: 1 });
    const crownMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: true, vertexColors: true });
    const greens = ['#5b8a3c', '#4d7d34', '#6b9442', '#77954a', '#3f6f2f'].map((c) => new THREE.Color(c));
    const gulmohar = [new THREE.Color('#d0502c'), new THREE.Color('#c8402a')]; // flame-red crowns here and there
    const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion(); const v = new THREE.Vector3(); const sc = new THREE.Vector3();
    this.treeChunks = [];
    for (const list of byChunk.values()) {
      const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, list.length);
      const crowns = { near: new THREE.InstancedMesh(crownGeo.near, crownMat, list.length), far: new THREE.InstancedMesh(crownGeo.far, crownMat, list.length) };
      const box = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
      list.forEach(([x, z, k], i) => {
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (x * 13.1 + z * 7.7) % 6.28);
        m4.compose(v.set(x, 0, z), q, sc.set(k, k, k));
        trunks.setMatrixAt(i, m4);
        m4.compose(v.set(x, 0, z), q, sc.set(k * (0.85 + ((i * 7) % 5) * 0.08), k * (0.8 + ((i * 3) % 4) * 0.1), k * (0.85 + ((i * 5) % 5) * 0.07)));
        const flame = !list[i][3] && Math.abs(Math.round(x * 7 + z * 13)) % 19 === 0;
        for (const c of [crowns.near, crowns.far]) { c.setMatrixAt(i, m4); c.setColorAt(i, flame ? gulmohar[i % 2] : greens[i % greens.length]); }
        box.minX = Math.min(box.minX, x); box.maxX = Math.max(box.maxX, x); box.minZ = Math.min(box.minZ, z); box.maxZ = Math.max(box.maxZ, z);
      });
      for (const im of [trunks, crowns.near, crowns.far]) {
        im.castShadow = true;
        im.receiveShadow = true;
        im.computeBoundingSphere();
        this.root.add(im);
      }
      crowns.near.visible = false;
      this.treeChunks.push({ ...crowns, box });
    }
    this.treeCount = pts.length;
    // Avenue trunks are painted: terracotta red to 0.9 m, a white band to 1.3 m (one instanced sleeve for all).
    const painted = pts.filter((p) => p[3]);
    if (painted.length) {
      // a sleeve just outside the trunk with rings at 0, 0.9 and 1.3 m; each triangle coloured by its centre height
      const band = new THREE.CylinderGeometry(0.305, 0.352, 1.3, 8, 2, true).translate(0, 0.65, 0).toNonIndexed();
      const pos = band.attributes.position;
      for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); if (y > 0.2 && y < 1.1) pos.setY(i, 0.9); }
      const col = new Float32Array(pos.count * 3);
      const red = new THREE.Color('#b5482f'); const wht = new THREE.Color('#f2f0ea');
      for (let i = 0; i < pos.count; i++) {
        const t = Math.floor(i / 3) * 3;
        (pos.getY(t) + pos.getY(t + 1) + pos.getY(t + 2) < 2.7 ? red : wht).toArray(col, i * 3);
      }
      band.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const bands = new THREE.InstancedMesh(band, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }), painted.length);
      painted.forEach(([x, z, k], i) => { m4.compose(v.set(x, 0, z), q.identity(), sc.set(k, k, k)); bands.setMatrixAt(i, m4); });
      bands.computeBoundingSphere();
      bands.receiveShadow = true;
      this.root.add(bands);
    }
    this.buildAshoka();
    // Trunks: a lookup grid for the NPC checks and a low collider for the player. 1.2 m tall, so the
    // third-person camera (always above head height) never snaps in when a tree passes behind you.
    this.treeGrid = new Map();
    for (const [x, z, k] of pts) {
      const r = 0.34 * k;
      const key = `${Math.floor(x / 10)},${Math.floor(z / 10)}`;
      if (!this.treeGrid.has(key)) this.treeGrid.set(key, []);
      this.treeGrid.get(key).push([x, z, r]);
      const h = Math.min(0.45, Math.max(0.25, 0.3 * k));
      this.colliders.push({ minX: x - h, maxX: x + h, minZ: z - h, maxZ: z + h, minY: 0, maxY: 1.2, walkable: false, enabled: true, tree: true });
    }
    this.buildPalms();
  }

  // Date palms flank the Rotunda's opening to the NAB lawns and the temple platform.
  buildPalms() {
    const list = this.palmPts || [];
    if (!list.length) return;
    const trunk = new THREE.CylinderGeometry(0.17, 0.3, 8, 7).translate(0, 4, 0);
    const leaves = [];
    for (let k = 0; k < 9; k++) {
      const leaf = new THREE.BoxGeometry(0.75, 0.05, 3.6).translate(0, 0, 1.8);
      leaf.rotateX(0.45 + (k % 2) * 0.25);
      leaf.rotateY((k / 9) * Math.PI * 2);
      leaf.translate(0, 8, 0);
      leaves.push(leaf.toNonIndexed());
    }
    const crown = mergeGeometries(leaves);
    const trunks = new THREE.InstancedMesh(trunk, mat('#8a7458', { roughness: 1 }), list.length);
    const crowns = new THREE.InstancedMesh(crown, new THREE.MeshStandardMaterial({ color: '#4f7f36', roughness: 0.9, side: THREE.DoubleSide }), list.length);
    const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion(); const v = new THREE.Vector3(); const s = new THREE.Vector3();
    list.forEach(([x, z], i) => {
      const k = 0.85 + ((i * 7) % 5) * 0.08;
      m4.compose(v.set(x, 0, z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), i * 1.3), s.set(k, k, k));
      trunks.setMatrixAt(i, m4);
      crowns.setMatrixAt(i, m4);
    });
    for (const im of [trunks, crowns]) { im.castShadow = true; im.computeBoundingSphere(); this.root.add(im); }
  }

  // ---------- labels ----------
  buildLabels() {
    const seen = new Set();
    const important = new Set(['BITS Clock Tower', 'Rotunda', 'Saraswati Temple', 'Shiv Ganga', 'New Academic Block', 'BITS Library', 'BITS Gymkhana Grounds', 'Student Activities Center', "C'not", 'All night canteen', 'Meera Bhawan', 'VFAST', 'Med-C', 'South Park', 'M Lawns', 'S Lawns']);
    const put = (name, x, y, z) => {
      if (!name || seen.has(name)) return;
      seen.add(name);
      const big = important.has(name);
      const s = makeLabel(name, { height: big ? 2.2 : 1.3, bg: big ? 'rgba(25,40,80,0.86)' : 'rgba(20,24,40,0.72)' });
      s.position.set(x, y, z);
      s.material.transparent = true;
      s.userData.far = big ? 420 : 170;
      this.root.add(s);
      this.labels.push(s);
    };
    for (const b of this.buildings) {
      if (!b.name || !b.inCampus) continue;
      const [cx, cz] = centroid(b.outer);
      put(b.name, cx, b.h + 4, cz);
    }
    const LABEL_Y = { 'BITS Clock Tower': 60, 'Main Gate': 11.5 }; // above the tower, and above the gate's spires
    for (const p of D.pois) put(p.name === 'All night canteen' ? null : p.name, p.x, LABEL_Y[p.name] ?? 6, p.z);
    for (const a of D.areas) if (a.name) { const [cx, cz] = centroid(a.poly); put(a.name, cx, 5, cz); }
  }

  // ---------- runtime ----------
  // ---------- people: where they can stand and how they get around ----------
  // Open ground, a gameplay room, a door corridor or a NAB passage; `pad` keeps a body's width off the walls.
  walkableAt(x, z, pad = 0) {
    if (this.roomAt(x, z)) return true;
    for (const cuts of this.hostCuts.values()) {
      for (const q of cuts) {
        const inset = q.passage ? pad : 0;
        if (x > q.minX && x < q.maxX && z > q.minZ + inset && z < q.maxZ - inset) return true;
      }
    }
    for (const p of this.passages) if (x > p.minX && x < p.maxX && z > p.minZ + pad && z < p.maxZ - pad) return true;
    return !this.isBuilt(x, z, pad);
  }

  // Within `clear` metres of a tree trunk's surface.
  treeNear(x, z, clear = 0) {
    if (!this.treeGrid) return false;
    const gx = Math.floor(x / 10); const gz = Math.floor(z / 10);
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        for (const [tx, tz, r] of this.treeGrid.get(`${gx + i},${gz + j}`) || []) if (Math.hypot(x - tx, z - tz) < r + clear) return true;
      }
    }
    return false;
  }

  // Free-standing solid things outdoors (statues, stalls, benches...). Walls and trunks are checked separately.
  solidAt(x, z, pad = 0.25) {
    this.allColliders();
    for (const c of this.colliderGrid.grid.get(`${Math.floor(x / 24)},${Math.floor(z / 24)}`) || []) {
      if (!c.enabled || c.walkable || c.wall || c.tree || c.maxY < 0.4) continue;
      if (x > c.minX - pad && x < c.maxX + pad && z > c.minZ - pad && z < c.maxZ + pad) return true;
    }
    return false;
  }

  npcBlocked(x, z) {
    return !this.walkableAt(x, z, 0.35) || this.treeNear(x, z, 0.45) || this.solidAt(x, z);
  }

  // The nearest spot a person can actually stand on. Points inside gameplay rooms are left alone (seats).
  freeSpot(p) {
    if (this.roomAt(p.x, p.z) || !this.npcBlocked(p.x, p.z)) return p;
    for (let r = 0.75; r <= 30; r += 0.75) {
      const n = Math.ceil((2 * Math.PI * r) / 0.75);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const x = p.x + Math.cos(a) * r; const z = p.z + Math.sin(a) * r;
        if (!this.npcBlocked(x, z)) return new THREE.Vector3(x, p.y || 0, z);
      }
    }
    return p;
  }

  buildNav() {
    this.nav = new NavGraph(D.roads, (x, z) => this.npcBlocked(x, z));
    for (const p of this.passages) this.nav.addLink(p.a, p.b);
    for (const { kit } of this.modules) for (const [a, b] of kit.navLinks) this.nav.addLink(a, b);
    // Everywhere people stand or arrive, plus the straight line to their road, stays free of trees.
    const spots = [];
    const visit = (v) => { if (v instanceof THREE.Vector3) spots.push(v); else if (Array.isArray(v)) v.forEach(visit); };
    for (const v of Object.values(this.spots)) visit(v);
    for (const r of this.roomList) spots.push(r.exit);
    for (const p of this.passages) spots.push(new THREE.Vector3(p.a[0], 0, p.a[1]), new THREE.Vector3(p.b[0], 0, p.b[1]));
    this.clearZones = [];
    for (const v of spots) {
      if (this.roomAt(v.x, v.z)) continue;
      const e = this.nav.entry(v.x, v.z);
      const n = e.i === undefined ? null : this.nav.nodes[e.i];
      this.clearZones.push(n && e.direct ? [v.x, v.z, n.x, n.z] : [v.x, v.z, v.x, v.z]);
    }
  }

  keepClear(x, z) {
    for (const [ax, az, bx, bz] of this.clearZones || []) if (segDist(x, z, [ax, az], [bx, bz]) < 2.2) return true;
    return false;
  }

  update(dt, playerPos) {
    super.update(dt, playerPos);
    if (!playerPos) return;
    for (const s of this.labels) {
      const d = Math.hypot(s.position.x - playerPos.x, s.position.z - playerPos.z);
      const far = s.userData.far;
      const o = d < 8 ? 0 : Math.max(0, Math.min(1, (far - d) / (far * 0.3)));
      s.material.opacity = o;
      s.visible = o > 0.02;
    }
    this.nearPos = playerPos;
    for (const H of this.hostels) H.update(dt, playerPos);
    for (const { kit } of this.modules) kit.update(dt, playerPos);
    for (const kit of this.envKits || []) kit.update(dt, playerPos);
    // clustered tree crowns within ~70 m of the camera, the simple ones beyond
    for (const c of this.treeChunks || []) {
      const b = c.box;
      const dx = Math.max(b.minX - playerPos.x, 0, playerPos.x - b.maxX); const dz = Math.max(b.minZ - playerPos.z, 0, playerPos.z - b.maxZ);
      const near = dx * dx + dz * dz < 70 * 70;
      c.near.visible = near; c.far.visible = !near;
    }
    // inside a Bhawan a ceiling light follows you (your own room's light has a switch)
    const hs = this.hostelAt(playerPos.x, playerPos.z)?.roomAt(playerPos.x, playerPos.z, playerPos.y);
    if (hs) {
      this.indoorLight.position.set(playerPos.x, playerPos.y + 2.6, playerPos.z);
      this.indoorLight.intensity = hs === 'hostelroom' && !this.hostel.lightOn ? 1.2 : 10;
      this.indoorLight.distance = 9;
    } else if (!this.roomAt(playerPos.x, playerPos.z) && playerPos.y < 30) {
      // inside a detailed building the same light follows you
      const mod = this.moduleAt(playerPos.x, playerPos.z) || (this.templeKit?.roomAt(playerPos.x, playerPos.z, playerPos.y)?.id === 'temple-mandapa' ? { kit: this.templeKit } : null);
      if (mod && mod.kit.zones.some((zn) => zn.group.visible)) {
        this.indoorLight.position.set(playerPos.x, playerPos.y + 2.6, playerPos.z);
        this.indoorLight.intensity = 10;
        this.indoorLight.distance = 10;
      }
    }
  }

  allColliders() {
    if (!this.colliderGrid || this.colliderGrid.count !== this.colliders.length) {
      const grid = new Map();
      for (const c of this.colliders) this.gridInsert(grid, c, c, 24);
      this.colliderGrid = { grid, count: this.colliders.length, key: null, list: [] };
    }
    const p = this.nearPos || new THREE.Vector3();
    const gx = Math.floor(p.x / 24); const gz = Math.floor(p.z / 24);
    const key = `${gx},${gz}`;
    const G = this.colliderGrid;
    if (G.key !== key) {
      const set = new Set();
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const c of G.grid.get(`${gx + i},${gz + j}`) || []) set.add(c);
      G.list = [...set];
      G.key = key;
    }
    return this.classroomColliders ? G.list.concat(this.classroomColliders) : G.list;
  }

  // Pass y to tell the Bhawan's floors apart.
  roomAt(x, z, y = null) {
    for (const r of this.roomList) if (x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) return r.id;
    return this.hostelAt(x, z)?.roomAt(x, z, y) || null;
  }

  // The walk-in Bhawan whose footprint (grown by pad metres) contains (x, z).
  hostelAt(x, z, pad = 0) {
    return (this.hostels || []).find((H) => H.distance(x, z) <= pad) || null;
  }

  // Out of the current room by its door, along the roads (and NAB passages), in by the target's door.
  pathTo(from, targetRoomId, point) {
    const fromRoom = this.roomAt(from.x, from.z);
    if (fromRoom && fromRoom === targetRoomId) return [point.clone()];
    const pts = [];
    let start = [from.x, from.z];
    if (fromRoom && !this.rooms[fromRoom]) {
      // inside a Bhawan: out through its lobby
      const e = (this.hostelAt(from.x, from.z) || this.hostel).entrance;
      pts.push(e.inside.clone(), e.out.clone());
      start = [e.out.x, e.out.z];
    } else if (fromRoom) {
      const r = this.rooms[fromRoom];
      pts.push(r.inside.clone(), r.outside.clone(), r.exit.clone());
      start = [r.exit.x, r.exit.z];
    }
    const target = targetRoomId ? this.rooms[targetRoomId] : null;
    const goal = target ? target.exit : this.freeSpot(point);
    for (const [x, z] of this.nav.route(start, [goal.x, goal.z])) pts.push(new THREE.Vector3(x, 0, z));
    if (target) pts.push(target.outside.clone(), target.inside.clone(), point.clone());
    else pts[pts.length - 1] = goal.clone();
    return pts;
  }

  objectivePoint(location) {
    if (this.rooms[location]) return this.rooms[location].outside;
    if (location === 'assembly') return this.spots.assemblyPlayer;
    if (location === 'playground') return this.fieldBounds.center;
    if (location === 'canteen') return this.spots.canteen[0];
    if (location === 'gate') return this.hostelEntrance;
    return null;
  }

  rebuildClassroom(classNum, title) {
    const { dx, dz } = this.roomOffset.classroom;
    const dy = this.rooms.classroom.y0 || 0;
    if (!this.board) this.withOffset(dx, dz, () => this.ensureBoard(), dy);
    this.classroomGroup.position.set(dx, dy, dz);
    const keep = this.setClassroomLabel;
    this.setClassroomLabel = () => {};
    super.rebuildClassroom(Math.max(13, classNum), title);
    this.setClassroomLabel = keep;
    for (const c of this.classroomColliders) { c.minX += dx; c.maxX += dx; c.minZ += dz; c.maxZ += dz; c.minY += dy; c.maxY += dy; }
    for (const s of this.seats) { s.pos.x += dx; s.pos.y += dy; s.pos.z += dz; s.desk.x += dx; s.desk.y += dy; s.desk.z += dz; }
    this.spots.teacherFront.x += dx;
    this.spots.teacherFront.y += dy;
    this.spots.teacherFront.z += dz;
  }

  festSeat(i) {
    const { dx, dz } = this.roomOffset.auditorium;
    return new THREE.Vector3(-36 + (i % 4) * 1.6 + dx, 0, 26 + Math.floor(i / 4) * 2.2 + dz);
  }

  setMode() {}
}

export { inPoly, bbox };
