// BITS Pilani at real scale (1 unit = 1 m), built from data/bits-campus.js (OpenStreetMap + traced footprints).
// Origin = Rotunda; x = east, z = south (north = −z). Gameplay rooms sit inside their real host buildings
// and reuse the school interiors, which are written in school coordinates and placed in translated groups.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Campus, ROOMS, mat } from './campus.js';
import { makeLabel } from './labels.js';
import { texture, TEX_SIZE } from './textures.js';
import { BITS_CAMPUS as D } from '../../data/bits-campus.js';
import { NavGraph } from './nav.js';
import { Hostel, WALK_IN, entranceOrder } from './hostel.js';

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
};

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
    // The courtyard Bhawans are walk-in; their outlines are squared up to fit the interiors. Krishna is yours.
    this.hostels = [];
    for (const name of WALK_IN) {
      const b = this.buildings.find((x) => x.name === name);
      if (!b) continue;
      const mine = name === 'Krishna Bhawan';
      this.hostels.push(new Hostel(this, b, { mine, outer: mine ? b.outer : entranceOrder(b.outer, D.roads) }));
      b.bb = bbox(b.outer);
    }
    this.hostel = this.hostels.find((H) => H.mine);
    this.buildingGrid = new Map();
    for (const b of this.buildings) this.gridInsert(this.buildingGrid, b.bb, b, 40);
    this.roadSegs = [];
    for (const r of D.roads) for (let i = 1; i < r.pts.length; i++) this.roadSegs.push({ a: r.pts[i - 1], b: r.pts[i], w: r.w });
    this.roadGrid = new Map();
    for (const s of this.roadSegs) this.gridInsert(this.roadGrid, bbox([s.a, s.b]), s, 40);

    this.buildGround();
    this.buildAreas();
    this.buildRoads();
    this.placeRooms();
    this.planPassages();
    for (const H of this.hostels) H.build();
    this.buildBuildings();
    this.buildPassages();
    this.buildRotunda();
    this.buildClockTowerAt();
    this.buildTemple();
    this.buildShivGanga();
    this.buildGymkhana();
    this.buildANC();
    this.buildHostelGate();
    this.buildMainGate();
    this.buildStatues();
    this.buildLampPosts();
    this.buildNav();
    this.buildTrees();
    this.buildLabels();
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
    else m = mat('#999999');
    // Ground layers sit centimetres apart; offset them in depth so they don't stripe at a distance.
    const layer = { wood: 1, grass: 2, ground: 3, pitch: 4, court: 4, track: 5, water: 6, pool: 6, kerb: 6, road: 7, path: 8 }[key];
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

  buildGround() {
    const g = new THREE.PlaneGeometry(3400, 3600);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * 3400) / TEX_SIZE.dirt, (uv.getY(i) * 3600) / TEX_SIZE.dirt);
    const m = new THREE.Mesh(g, tiledMaterial('dirt', '#f0dcb4'));
    m.rotation.x = -Math.PI / 2;
    m.position.set(140, 0, 500);
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
      this.addShape(key, cx, cz, this.flatShape(a.poly, [], Y[a.kind] ?? 0.02, tile));
    }
  }

  buildRoads() {
    for (const r of D.roads) {
      const foot = ['footway', 'path', 'steps', 'pedestrian', 'track', 'cycleway'].includes(r.kind);
      const key = foot ? 'path' : 'road';
      // Roads get black-and-white painted kerb strips; each road's asphalt sits just above every kerb so
      // crossing roads cover the paint at junctions.
      const kerb = foot ? 0 : 0.35;
      const y = foot ? 0.058 : 0.053;
      const hw = r.w / 2 - kerb;
      for (let i = 1; i < r.pts.length; i++) {
        const [x0, z0] = r.pts[i - 1];
        const [x1, z1] = r.pts[i];
        const len = Math.hypot(x1 - x0, z1 - z0);
        if (len < 0.01) continue;
        const ux = -(z1 - z0) / len; const uz = (x1 - x0) / len;
        const nx = ux * hw; const nz = uz * hw;
        const b = this.bucket(key, x0, z0);
        b.quad([x0 + nx, y, z0 + nz], [x1 + nx, y, z1 + nz], [x1 - nx, y, z1 - nz], [x0 - nx, y, z0 - nz], [[0, 0], [len / 4, 0], [len / 4, 1], [0, 1]], [0, 1, 0]);
        if (!kerb) continue;
        const k = this.bucket('kerb', x0, z0);
        for (const s of [-1, 1]) {
          const a = s * hw; const c = s * (hw + kerb);
          k.quad([x0 + ux * a, 0.05, z0 + uz * a], [x1 + ux * a, 0.05, z1 + uz * a], [x1 + ux * c, 0.05, z1 + uz * c], [x0 + ux * c, 0.05, z0 + uz * c], [[0, 0], [len / 2, 0], [len / 2, 1], [0, 1]], [0, 1, 0]);
        }
      }
      // Round joints so bends don't leave notches
      for (const [x, z] of r.pts) {
        const b = this.bucket(key, x, z);
        const n = 8;
        for (let k = 0; k < n; k++) {
          const a0 = (k / n) * Math.PI * 2; const a1 = ((k + 1) / n) * Math.PI * 2;
          b.quad([x, y, z], [x + Math.cos(a0) * hw, y, z + Math.sin(a0) * hw], [x + Math.cos(a1) * hw, y, z + Math.sin(a1) * hw], [x, y, z], [[0, 0], [0, 0], [0, 0], [0, 0]], [0, 1, 0]);
        }
      }
    }
  }

  // ---------- rooms inside real buildings ----------
  findBuilding(name) {
    return this.buildings.find((b) => b.name === name);
  }

  // Place an axis-aligned room inside the host so its door wall sits just inside the host's facade.
  // The facade is measured on the door's own line (doorOff from the room's corner), the corridor from the door
  // to the facade must stay inside the host, and the door must open onto open ground, not another building.
  fitRoom(host, w, d, side, used, doorOff) {
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
    const mid = (along[0] + along[1]) / 2;
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
    for (const [id, cfg] of Object.entries(ROOM_HOSTS)) {
      const s = school[id];
      const host = this.findBuilding(cfg.host);
      const w = s.x1 - s.x0; const d = s.z1 - s.z0;
      const used = usedByHost.get(host) || [];
      const horizDoor = s.door.side === 'south' || s.door.side === 'north';
      const fit = this.fitRoom(host, w, d, s.door.side, used, s.door.at - (horizDoor ? s.x0 : s.z0));
      if (!fit) throw new Error(`Room ${id} does not fit in ${cfg.host}`);
      const dx = fit.x0 - s.x0; const dz = fit.z0 - s.z0;
      const horiz = s.door.side === 'south' || s.door.side === 'north';
      const r = { ...s, name: cfg.name, x0: fit.x0, x1: fit.x0 + w, z0: fit.z0, z1: fit.z0 + d, door: { side: s.door.side, at: s.door.at + (horiz ? dx : dz) }, host: cfg.host };
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
    for (const r of this.roomList) this.buildRoom(r);
    // Interiors (school coordinates) moved into place
    const interior = { classroom: 'interiorClassroomDado', staffroom: 'interiorStaffroom', principal: 'interiorPrincipal', library: 'interiorLibrary', sciencelab: 'interiorLab', complab: 'interiorComplab', auditorium: 'interiorAuditorium', reception: 'interiorReception', classroomB: 'interiorClassroomB' };
    for (const [id, fn] of Object.entries(interior)) {
      const { dx, dz } = this.roomOffset[id];
      this.withOffset(dx, dz, () => {
        this.roomLights(school[id]);
        this[fn]();
      });
    }
    this.interiorMess(this.rooms.mess);
    this.roomRefs = this.rooms;
  }

  // Long tables with benches and a serving counter at the back. E at the counter eats the current meal.
  interiorMess(r) {
    const cz = (r.z0 + r.z1) / 2;
    this.box(r.x1 - 1.2, 0, cz, 0.9, 1.0, 6, '#b8c2c8', { metalness: 0.6, roughness: 0.35 });
    for (const dz of [-2, -0.7, 0.6, 1.9]) this.cyl(r.x1 - 1.2, 1.12, cz + dz, 0.35, 0.3, 0.25, '#d9dde0', { segments: 14 });
    this.box(r.x1 - 0.12, 1.4, cz, 0.04, 1.1, 3.2, '#1f3b2c', { collide: false });
    this.label('Today’s menu', r.x1 - 0.3, 2.75, cz, { height: 0.36 });
    this.spots.mess = [];
    for (const tx of [r.x0 + 3.5, r.x0 + 7.5]) {
      for (const tz of [r.z0 + 1.8, r.z0 + 7.2]) {
        this.box(tx, 0, tz, 3.0, 0.76, 0.9, null, { tex: 'wood', tint: '#b08a5a' });
        for (const s of [-1, 1]) {
          this.box(tx, 0, tz + s * 0.85, 3.0, 0.45, 0.3, '#6b4a2e', { collide: false });
          for (const ox of [-1, 0, 1]) this.spots.mess.push(new THREE.Vector3(tx + ox, 0, tz + s * 0.85));
        }
      }
    }
    this.tubeLight(r.x0 + 5.5, r.z0 + 0.3);
    this.tubeLight(r.x0 + 5.5, r.z1 - 0.3);
    this.ceilingFan(r.x0 + 3.5, cz);
    this.ceilingFan(r.x0 + 7.5, cz);
    this.interactable('mess', r.x1 - 2.1, cz, 'Eat at the mess', { radius: 2.2 });
    this.spots.messStaff = new THREE.Vector3(r.x1 - 0.5, 0, cz);
  }

  // Run school-coordinate building code, then shift everything it created by (dx, dz).
  withOffset(dx, dz, fn) {
    const prev = this.scene;
    const g = new THREE.Group();
    g.position.set(dx, 0, dz);
    prev.add(g);
    this.scene = g;
    const c0 = this.colliders.length;
    const i0 = this.interactables.length;
    const before = new Map(Object.entries(this.spots));
    try { fn(); } finally { this.scene = prev; }
    for (const c of this.colliders.slice(c0)) { c.minX += dx; c.maxX += dx; c.minZ += dz; c.maxZ += dz; }
    for (const it of this.interactables.slice(i0)) { it.pos.x += dx; it.pos.z += dz; }
    const shift = (v) => { if (v instanceof THREE.Vector3) { v.x += dx; v.z += dz; } else if (Array.isArray(v)) v.forEach(shift); };
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
  buildBuildings() {
    const skip = new Set(['Saraswati Temple']);
    for (const b of this.buildings) {
      if (skip.has(b.name)) continue;
      const kind = facadeOf(b);
      const fac = facadeMaterial(kind);
      const h = b.inCampus ? b.h : Math.min(b.h, 7);
      const [cx, cz] = centroid(b.outer);
      const cuts = this.hostCuts.get(b) || [];
      for (const ring of b.hostel ? [b.outer] : [b.outer, ...b.holes]) this.buildWallRing(ring, h, `facade:${kind}`, fac, cx, cz, cuts, b.inCampus);
      const roof = roofOf(b);
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

  buildTemple() {
    const b = this.findBuilding('Saraswati Temple');
    if (!b) return;
    const marble = '#f6f2ea';
    const bb = b.bb;
    const cx = (bb.minX + bb.maxX) / 2; const cz = (bb.minZ + bb.maxZ) / 2;
    const w = bb.maxX - bb.minX; const d = bb.maxZ - bb.minZ;
    this.addShape('parapet', cx, cz, this.flatShape(b.outer, [], 1.8, 3));
    for (const ring of [b.outer]) {
      const bk = this.bucket('parapet', cx, cz);
      for (let i = 0; i < ring.length; i++) {
        const p0 = ring[i]; const p1 = ring[(i + 1) % ring.length];
        bk.quad([p0[0], 0, p0[1]], [p1[0], 0, p1[1]], [p1[0], 1.8, p1[1]], [p0[0], 1.8, p0[1]], [[0, 0], [1, 0], [1, 1], [0, 1]], [0, 0, 1]);
      }
    }
    this.colliders.push({ minX: bb.minX, maxX: bb.maxX, minZ: bb.minZ, maxZ: bb.maxZ, minY: 0, maxY: 30, walkable: false, enabled: true });
    const g = new THREE.Group();
    g.position.set(cx, 1.8, cz);
    this.root.add(g);
    const add = (geo, color, x, y, z, rough = 0.4) => {
      const m = new THREE.Mesh(geo, mat(color, { roughness: rough }));
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      g.add(m);
      return m;
    };
    // Shardapeeth (1959): white marble in the Nagara style — a curvilinear shikhara over the sanctum, ringed by
    // smaller spirelets, with a pillared mandapa in front and chhatris at the corners of the marble platform.
    const hw = Math.min(w, 40) * 0.42; const hd = Math.min(d, 60) * 0.4;
    const zs = -hd * 0.25; // sanctum (north end)
    const zm = hd * 0.45; // mandapa (south, facing the entrance steps)
    const curve = (R, H) => {
      const pts = [];
      for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push(new THREE.Vector2(Math.max(R * 0.14, R * Math.pow(1 - t, 0.62) * (1 - 0.12 * t)), t * H)); }
      return new THREE.LatheGeometry(pts, 12);
    };
    add(new THREE.BoxGeometry(hw * 1.15, 8, hw * 1.15), marble, 0, 4, zs);
    add(new THREE.BoxGeometry(hw * 1.3, 0.7, hw * 1.3), '#ece4d4', 0, 8.3, zs);
    const shikhara = add(curve(hw * 0.56, 24), marble, 0, 8.6, zs);
    shikhara.rotation.y = Math.PI / 12;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const big = k % 2 === 0;
      add(curve(hw * (big ? 0.24 : 0.17), big ? 13 : 8), marble, Math.sin(a) * hw * 0.45, 8.6, zs + Math.cos(a) * hw * 0.45);
    }
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      add(curve(hw * 0.14, 7), marble, Math.sin(a) * hw * 0.3, 15.5, zs + Math.cos(a) * hw * 0.3);
    }
    add(new THREE.CylinderGeometry(1.7, 1.7, 0.9, 16), '#ece6d8', 0, 33.1, zs);
    add(new THREE.SphereGeometry(0.7, 14, 10), '#d4af37', 0, 34.1, zs, 0.3);
    add(new THREE.ConeGeometry(0.25, 1.4, 8), '#d4af37', 0, 35.2, zs, 0.3);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.2), new THREE.MeshStandardMaterial({ color: '#ff7f1e', side: THREE.DoubleSide }));
    flag.position.set(1.1, 36.6, zs);
    g.add(flag);
    // mandapa: pillared hall with a stepped roof and a low dome
    const mw = hw * 1.5; const md = hd * 0.8;
    add(new THREE.BoxGeometry(mw, 0.6, md), '#ece4d4', 0, 0.3, zm);
    for (let i = 0; i <= 5; i++) for (const sz of [-1, 1]) add(new THREE.CylinderGeometry(0.42, 0.48, 6, 10), marble, -mw / 2 + 0.6 + (i * (mw - 1.2)) / 5, 3.6, zm + sz * (md / 2 - 0.6));
    add(new THREE.BoxGeometry(mw * 0.55, 6, md * 0.7), marble, 0, 3.6, zm - md * 0.1);
    for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(mw - i * 2.2, 0.7, md - i * 2.2), i ? marble : '#ece4d4', 0, 6.95 + i * 0.7, zm);
    add(new THREE.SphereGeometry(Math.min(mw, md) * 0.28, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), marble, 0, 8.7, zm);
    add(curve(1.0, 3), marble, 0, 8.7 + Math.min(mw, md) * 0.27, zm);
    // corner chhatris on the platform and palms around it
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) this.chhatri(cx + dx * (w / 2 - 3), 1.8, cz + dz * (d / 2 - 3), 1.3);
    this.palmPts ||= [];
    for (const [dx, dz] of [[-0.5, 0.62], [0.5, 0.62], [-0.68, 0.2], [0.68, 0.2], [-0.68, -0.3], [0.68, -0.3]]) this.palmPts.push([cx + dx * w * 1.05, cz + dz * d * 1.05]);
  }

  buildShivGanga() {
    const a = D.areas.find((x) => x.kind === 'shivganga');
    if (!a) return;
    const bb = bbox(a.poly);
    const cx = (bb.minX + bb.maxX) / 2; const cz = (bb.minZ + bb.maxZ) / 2;
    const R = Math.min(bb.maxX - bb.minX, bb.maxZ - bb.minZ) / 2;
    // From the tour: a ring canal of murky olive water crossed by white balustraded bridges, red-brick walks,
    // and a garden island with a seated white Shiva statue on a stepped platform.
    const brick = '#a85e45'; const white = '#f4f1ea';
    // The garden beds are OSM grass areas with their own depth offset; the canal and its walks sit above them.
    const ring = (r0, r1, color, y, rough = 0.9, layer = 0) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 72), layer ? new THREE.MeshStandardMaterial({ color, roughness: rough, polygonOffset: true, polygonOffsetFactor: -layer, polygonOffsetUnits: -layer * 2 }) : mat(color, { roughness: rough }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(cx, y, cz);
      m.receiveShadow = true;
      this.root.add(m);
    };
    ring(R * 0.97, R * 1.08, brick, 0.07, 0.9, 9);
    ring(R * 0.78, R * 0.97, '#5f5a30', 0.07, 0.2, 9);
    ring(R * 0.72, R * 0.78, brick, 0.075, 0.9, 9);
    ring(R * 0.16, R * 0.72, '#7fb85a', 0.06);
    for (let k = 0; k < 8; k++) {
      const path = new THREE.Mesh(new THREE.PlaneGeometry(1.8, R * 0.56), mat(brick));
      path.rotation.x = -Math.PI / 2;
      path.rotation.z = (k / 8) * Math.PI * 2;
      const ang = (k / 8) * Math.PI * 2;
      path.position.set(cx + Math.sin(ang) * R * 0.44, 0.08, cz + Math.cos(ang) * R * 0.44);
      this.root.add(path);
    }
    const bridgeAt = [0, Math.PI / 2, Math.PI, 1.5 * Math.PI];
    const nearBridge = (a) => bridgeAt.some((b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 0.14);
    // white balustrades along both banks, open where the bridges land
    const railMat = new THREE.MeshStandardMaterial({ color: white, roughness: 0.7, side: THREE.DoubleSide });
    for (const rr of [R * 0.775, R * 0.975]) {
      for (let k = 0; k < 4; k++) {
        const t0 = bridgeAt[k] + 0.06; const len = Math.PI / 2 - 0.12;
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, 0.9, 48, 1, true, t0, len), railMat);
        rail.position.set(cx, 0.45, cz);
        this.root.add(rail);
      }
    }
    for (const a of bridgeAt) {
      const deck = new THREE.Group();
      deck.position.set(cx + Math.sin(a) * R * 0.875, 0, cz + Math.cos(a) * R * 0.875);
      deck.rotation.y = a;
      this.root.add(deck);
      const span = R * 0.26;
      const d = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.14, span), mat('#ece8de'));
      d.position.y = 0.07;
      d.receiveShadow = true;
      deck.add(d);
      for (const s of [-1, 1]) {
        const r = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.0, span), railMat);
        r.position.set(s * 1.6, 0.5, 0);
        r.castShadow = true;
        deck.add(r);
      }
    }
    // moat colliders so you can't walk on water — except across the bridges
    for (let k = 0; k < 48; k++) {
      const ang = (k / 48) * Math.PI * 2;
      if (nearBridge(ang)) continue;
      const x = cx + Math.sin(ang) * R * 0.875; const z = cz + Math.cos(ang) * R * 0.875;
      const s = R * 0.09;
      this.colliders.push({ minX: x - s, maxX: x + s, minZ: z - s, maxZ: z + s, minY: 0, maxY: 0.5, walkable: false, enabled: true });
    }
    // stepped platform and seated statue, on the first clear spot near the island centre (OSM maps buildings there)
    let sx = cx; let sz = cz;
    search: for (let r = 0; r <= R * 0.4; r += 3) {
      for (let k = 0; k < 12; k++) {
        const x = cx + Math.sin((k / 12) * Math.PI * 2) * r; const z = cz + Math.cos((k / 12) * Math.PI * 2) * r;
        if (!this.isBuilt(x, z, 6.5)) { sx = x; sz = z; break search; }
      }
    }
    for (let i = 0; i < 3; i++) this.box(sx, i * 0.6, sz, 10 - i * 2.6, 0.6, 10 - i * 2.6, null, { tex: 'plasterWhite', tint: white, collide: i === 0 });
    const statue = new THREE.Group();
    statue.position.set(sx, 1.8, sz);
    this.root.add(statue);
    const part = (geo, x, y, z) => { const m = new THREE.Mesh(geo, mat(white, { roughness: 0.6 })); m.position.set(x, y, z); m.castShadow = true; statue.add(m); return m; };
    part(new THREE.CylinderGeometry(1.5, 1.7, 0.5, 16), 0, 0.25, 0);
    part(new THREE.BoxGeometry(2.6, 0.8, 1.5), 0, 0.9, 0.1);
    part(new THREE.CylinderGeometry(0.55, 0.75, 1.9, 12), 0, 2.2, 0);
    part(new THREE.SphereGeometry(0.42, 14, 10), 0, 3.5, 0);
    part(new THREE.SphereGeometry(0.28, 10, 8), 0, 3.95, -0.05);
    for (const s of [-1, 1]) part(new THREE.CylinderGeometry(0.16, 0.18, 1.3, 8), s * 0.75, 1.8, 0.35).rotation.x = -0.9;
    part(new THREE.CylinderGeometry(0.05, 0.05, 4.6, 6), 1.3, 2.3, -0.3);
    part(new THREE.ConeGeometry(0.28, 0.6, 3), 1.3, 4.8, -0.3);
    // white chhatris on the outer bank
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      this.chhatri(cx + Math.sin(a) * R * 1.02, 0.1, cz + Math.cos(a) * R * 1.02, 1.5);
    }
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

  // Main Gate on the eastern town road: carved pink-sandstone pillars, a WELCOME banner and wooden gates.
  buildMainGate() {
    const p = this.poi('Main Gate');
    if (!p) return;
    const X = p.x; const Z = p.z;
    const sand = '#d8a487';
    for (const s of [-1, 1]) {
      const zp = Z + s * 4.6;
      this.box(X, 0, zp, 1.9, 0.6, 1.9, '#cf9a7e');
      this.box(X, 0.6, zp, 1.4, 4.8, 1.4, null, { tex: 'plasterWhite', tint: sand });
      this.box(X, 5.4, zp, 1.8, 0.4, 1.8, '#e6c2a8', { collide: false });
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.3, 4), mat('#d39c80'));
      cap.position.set(X, 6.45, zp);
      cap.rotation.y = Math.PI / 4;
      cap.castShadow = true;
      this.root.add(cap);
      this.box(X - 1.9, 0, Z + s * 2.0, 3.6, 2.2, 0.14, '#7a4f2e', { collide: false }); // gate leaf, swung open
      this.box(X, 0, Z + s * 15.5, 0.5, 2.3, 20, null, { tex: 'plasterWhite', tint: '#e9e4da' }); // boundary wall
    }
    const banner = canvasTexture(512, 64, (g, W, H) => {
      g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#1f3f8f'; g.font = 'bold 44px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('WELCOME', W / 2, H / 2 + 2);
    }, false);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.1, 8.0), [new THREE.MeshStandardMaterial({ map: banner }), new THREE.MeshStandardMaterial({ map: banner }), mat('#fbfbf8'), mat('#fbfbf8'), mat('#fbfbf8'), mat('#fbfbf8')]);
    sign.position.set(X, 5.0, Z);
    this.root.add(sign);
    this.gatePos = new THREE.Vector3(X, 0, Z);
  }

  // Bronze statues on stone pedestals in the middle of the roundabouts (Gandhi, Patel) and G.D. Birla's.
  buildStatues() {
    const bronze = mat('#6b5136', { roughness: 0.45, metalness: 0.5 });
    for (const name of ['Gandhi', 'Patel', 'G.D. Birla Statu']) {
      const p = this.poi(name);
      if (!p) continue;
      (this.statuePts ||= []).push([p.x, p.z]);
      const lawn = new THREE.Mesh(new THREE.CircleGeometry(6, 32), tiledMaterial('grass', '#cdeeb0'));
      lawn.rotation.x = -Math.PI / 2;
      lawn.position.set(p.x, 0.065, p.z);
      lawn.receiveShadow = true;
      this.root.add(lawn);
      this.box(p.x, 0, p.z, 3.4, 0.8, 3.4, null, { tex: 'plasterWhite', tint: '#d2cdc2' });
      this.box(p.x, 0.8, p.z, 2.2, 2.6, 2.2, '#b9b3a8', { collide: false });
      const fig = new THREE.Group();
      fig.position.set(p.x, 3.4, p.z);
      this.root.add(fig);
      const part = (geo, y) => { const m = new THREE.Mesh(geo, bronze); m.position.y = y; m.castShadow = true; fig.add(m); };
      part(new THREE.CylinderGeometry(0.55, 0.75, 1.6, 10), 0.8);
      part(new THREE.CylinderGeometry(0.5, 0.58, 1.2, 10), 2.2);
      part(new THREE.BoxGeometry(1.5, 0.4, 0.6), 2.7);
      part(new THREE.SphereGeometry(0.34, 12, 10), 3.15);
    }
  }

  // Street lights along the campus roads (instanced; arm points over the road).
  buildLampPosts() {
    const pts = [];
    const ROADS = new Set(['primary', 'secondary', 'tertiary', 'residential', 'unclassified']);
    for (const r of D.roads) {
      if (!ROADS.has(r.kind)) continue;
      let acc = 0;
      for (let i = 1; i < r.pts.length; i++) {
        const [x0, z0] = r.pts[i - 1]; const [x1, z1] = r.pts[i];
        const len = Math.hypot(x1 - x0, z1 - z0);
        if (len < 0.01) continue;
        const nx = -(z1 - z0) / len; const nz = (x1 - x0) / len;
        for (let t = 34 - acc; t < len; t += 34) {
          const x = x0 + ((x1 - x0) * t) / len + nx * (r.w / 2 + 1.1);
          const z = z0 + ((z1 - z0) * t) / len + nz * (r.w / 2 + 1.1);
          if (!inPoly(x, z, D.boundary) || this.isBuilt(x, z, 1) || Math.hypot(x, z) < 34) continue;
          pts.push([x, z, Math.atan2(-nx, -nz)]);
        }
        acc = (acc + len) % 34;
      }
    }
    const pole = mergeGeometries([
      new THREE.CylinderGeometry(0.07, 0.11, 6.6, 6).translate(0, 3.3, 0),
      new THREE.BoxGeometry(0.08, 0.08, 1.3).translate(0, 6.45, 0.6),
    ].map((g) => g.toNonIndexed()));
    const head = new THREE.BoxGeometry(0.28, 0.14, 0.55).translate(0, 6.35, 1.25);
    const poles = new THREE.InstancedMesh(pole, mat('#9aa0a3', { roughness: 0.5, metalness: 0.4 }), pts.length);
    const heads = new THREE.InstancedMesh(head, new THREE.MeshStandardMaterial({ color: '#fff4d6', emissive: '#6b5a2a', roughness: 0.4 }), pts.length);
    const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion(); const up = new THREE.Vector3(0, 1, 0); const one = new THREE.Vector3(1, 1, 1); const v = new THREE.Vector3();
    pts.forEach(([x, z, yaw], i) => {
      m4.compose(v.set(x, 0, z), q.setFromAxisAngle(up, yaw), one);
      poles.setMatrixAt(i, m4);
      heads.setMatrixAt(i, m4);
    });
    for (const im of [poles, heads]) { im.castShadow = true; im.computeBoundingSphere(); this.root.add(im); }
    this.lampCount = pts.length;
  }

  // ---------- trees ----------
  buildTrees() {
    const pts = [];
    const fb = this.fieldBounds;
    const add = (x, z, s) => {
      if (this.isBuilt(x, z, 1.5) || this.nearRoad(x, z, 0.8)) return;
      if (this.hostels.some((H) => !H.treeOk(x, z))) return;
      if (fb && x > fb.minX - 3 && x < fb.maxX + 3 && z > fb.minZ - 3 && z < fb.maxZ + 3) return;
      if (this.keepClear(x, z)) return;
      if (Math.hypot(x, z) < 30) return;
      if (this.gatePos && Math.hypot(x - this.gatePos.x, z - this.gatePos.z) < 26) return;
      if ((this.statuePts || []).some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 9)) return;
      for (const r of this.roomList) if (x > r.x0 - 3 && x < r.x1 + 3 && z > r.z0 - 3 && z < r.z1 + 3) return;
      pts.push([x, z, s]);
    };
    let s = 11;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    // avenues along roads
    for (const r of D.roads) {
      if (['footway', 'path', 'steps'].includes(r.kind)) continue;
      for (let i = 1; i < r.pts.length; i++) {
        const [x0, z0] = r.pts[i - 1]; const [x1, z1] = r.pts[i];
        const len = Math.hypot(x1 - x0, z1 - z0);
        const nx = -(z1 - z0) / len; const nz = (x1 - x0) / len;
        for (let t = 4; t < len; t += 9) {
          const bx = x0 + ((x1 - x0) * t) / len; const bz = z0 + ((z1 - z0) * t) / len;
          for (const side of [-1, 1]) add(bx + nx * side * (r.w / 2 + 2.6), bz + nz * side * (r.w / 2 + 2.6), 0.9 + rnd() * 0.5);
        }
      }
    }
    // scattered trees on the open campus ground (Rajasthan scrub) and in green areas
    const B = bbox(D.boundary);
    for (let i = 0; i < 9000 && pts.length < 9000; i++) {
      const x = B.minX + rnd() * (B.maxX - B.minX); const z = B.minZ + rnd() * (B.maxZ - B.minZ);
      if (!inPoly(x, z, D.boundary)) continue;
      if (rnd() < 0.45) add(x, z, 0.8 + rnd() * 0.7);
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
    // Broad, flat-topped canopies in olive greens: the khejri, neem and babool lining every campus road.
    const crownGeo = new THREE.IcosahedronGeometry(2.6, 0);
    crownGeo.scale(1.25, 0.72, 1.25);
    crownGeo.translate(0, 4.4, 0);
    const trunkMat = mat('#5b4532', { roughness: 1 });
    const crownMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: true });
    const greens = ['#5b8a3c', '#4d7d34', '#6b9442', '#77954a', '#3f6f2f'].map((c) => new THREE.Color(c));
    const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion(); const v = new THREE.Vector3(); const sc = new THREE.Vector3();
    for (const list of byChunk.values()) {
      const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, list.length);
      const crowns = new THREE.InstancedMesh(crownGeo, crownMat, list.length);
      list.forEach(([x, z, k], i) => {
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (x * 13.1 + z * 7.7) % 6.28);
        m4.compose(v.set(x, 0, z), q, sc.set(k, k, k));
        trunks.setMatrixAt(i, m4);
        m4.compose(v.set(x, 0, z), q, sc.set(k * (0.85 + ((i * 7) % 5) * 0.08), k * (0.8 + ((i * 3) % 4) * 0.1), k * (0.85 + ((i * 5) % 5) * 0.07)));
        crowns.setMatrixAt(i, m4);
        crowns.setColorAt(i, greens[i % greens.length]);
      });
      for (const im of [trunks, crowns]) {
        im.castShadow = true;
        im.receiveShadow = true;
        im.computeBoundingSphere();
        this.root.add(im);
      }
    }
    this.treeCount = pts.length;
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
    for (const p of D.pois) put(p.name === 'All night canteen' ? null : p.name, p.x, p.name === 'BITS Clock Tower' ? 60 : 6, p.z);
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
    // inside a Bhawan a ceiling light follows you (your own room's light has a switch)
    const hs = this.hostelAt(playerPos.x, playerPos.z)?.roomAt(playerPos.x, playerPos.z, playerPos.y);
    if (hs) {
      this.indoorLight.position.set(playerPos.x, playerPos.y + 2.6, playerPos.z);
      this.indoorLight.intensity = hs === 'hostelroom' && !this.hostel.lightOn ? 1.2 : 10;
      this.indoorLight.distance = 9;
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
    if (!this.board) this.withOffset(dx, dz, () => this.ensureBoard());
    this.classroomGroup.position.set(dx, 0, dz);
    const keep = this.setClassroomLabel;
    this.setClassroomLabel = () => {};
    super.rebuildClassroom(Math.max(13, classNum), title);
    this.setClassroomLabel = keep;
    for (const c of this.classroomColliders) { c.minX += dx; c.maxX += dx; c.minZ += dz; c.maxZ += dz; }
    for (const s of this.seats) { s.pos.x += dx; s.pos.z += dz; s.desk.x += dx; s.desk.z += dz; }
    this.spots.teacherFront.x += dx;
    this.spots.teacherFront.z += dz;
  }

  festSeat(i) {
    const { dx, dz } = this.roomOffset.auditorium;
    return new THREE.Vector3(-36 + (i % 4) * 1.6 + dx, 0, 26 + Math.floor(i / 4) * 2.2 + dz);
  }

  setMode() {}
}

export { inPoly, bbox };
