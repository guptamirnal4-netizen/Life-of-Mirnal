// BITS Pilani at real scale (1 unit = 1 m), built from data/bits-campus.js (OpenStreetMap + traced footprints).
// Origin = Rotunda; x = east, z = south (north = −z). Gameplay rooms sit inside their real host buildings
// and reuse the school interiors, which are written in school coordinates and placed in translated groups.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Campus, ROOMS, mat } from './campus.js';
import { makeLabel } from './labels.js';
import { texture, TEX_SIZE } from './textures.js';
import { BITS_CAMPUS as D } from '../../data/bits-campus.js';

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
const FACADES = {
  hostel: { bay: 3.2, floor: 3.3, wall: '#e8d6b2', win: '#34495a', frame: '#f6f1e6', balcony: true },
  academic: { bay: 4.2, floor: 4.0, wall: '#e9d3a4', win: '#2f4456', frame: '#f4ead6', pilaster: '#d8bd86', tall: true },
  plain: { bay: 4.0, floor: 3.2, wall: '#e6dccb', win: '#3c4a56', frame: '#f2ece2' },
  house: { bay: 5.0, floor: 3.0, wall: '#dccbb0', win: '#465260', frame: '#efe6d6', small: true },
  school: { bay: 3.6, floor: 3.3, wall: '#f0d4c2', win: '#3b4f63', frame: '#fbf3ea' },
  food: { bay: 3.5, floor: 3.0, wall: '#f2e2c4', win: '#3a3a3a', frame: '#d84a2a' },
};
const facadeCache = new Map();
function facadeMaterial(kind) {
  if (facadeCache.has(kind)) return facadeCache.get(kind);
  const f = FACADES[kind];
  const W = 256; const H = Math.round((256 * f.floor) / f.bay);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = f.wall; g.fillRect(0, 0, W, H);
  let s = 7;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? '255,255,255' : '90,70,40'},${0.04 + r() * 0.05})`; g.fillRect(r() * W, r() * H, 3, 3); }
  const px = W / f.bay; const py = H / f.floor;
  if (f.pilaster) { g.fillStyle = f.pilaster; g.fillRect(0, 0, px * 0.35, H); g.fillRect(W - px * 0.35, 0, px * 0.35, H); }
  const ww = (f.small ? 0.8 : f.tall ? 1.6 : 1.1) * px;
  const wh = (f.small ? 1.0 : f.tall ? 2.3 : 1.45) * py;
  const wx = (W - ww) / 2; const wy = H - (f.tall ? 0.8 : 0.95) * py - wh;
  g.fillStyle = f.frame; g.fillRect(wx - 5, wy - 5, ww + 10, wh + 10);
  g.fillStyle = f.win; g.fillRect(wx, wy, ww, wh);
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(wx + 3, wy + 3, ww * 0.35, wh - 6);
  g.strokeStyle = f.frame; g.lineWidth = 3; g.beginPath(); g.moveTo(W / 2, wy); g.lineTo(W / 2, wy + wh); g.stroke();
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(wx - 10, wy - 14, ww + 20, 8); // chajja shadow
  g.fillStyle = f.frame; g.fillRect(wx - 12, wy - 18, ww + 24, 6);
  if (f.balcony) { g.fillStyle = 'rgba(220,214,200,0.95)'; g.fillRect(wx - 14, H - py * 0.22, ww + 28, py * 0.2); }
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, H - 4, W, 4);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide });
  const out = { m, bay: f.bay, floor: f.floor };
  facadeCache.set(kind, out);
  return out;
}
const FACADE_OF = { hostel: 'hostel', academic: 'academic', library: 'academic', hall: 'academic', sac: 'academic', office: 'plain', mess: 'plain', other: 'plain', house: 'house', school: 'school', food: 'food', temple: 'plain' };

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
};

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
    this.buildBuildings();
    this.buildRotunda();
    this.buildClockTowerAt();
    this.buildTemple();
    this.buildShivGanga();
    this.buildGymkhana();
    this.buildANC();
    this.buildHostelGate();
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
    else if (key === 'roof') m = new THREE.MeshStandardMaterial({ color: '#cdbfa6', roughness: 0.95, side: THREE.DoubleSide });
    else if (key === 'roofOut') m = new THREE.MeshStandardMaterial({ color: '#c9bfae', roughness: 0.95, side: THREE.DoubleSide });
    else if (key === 'parapet') m = new THREE.MeshStandardMaterial({ color: '#f1ece2', roughness: 0.85, side: THREE.DoubleSide });
    else if (key === 'grass') m = tiledMaterial('grass', '#d8f0c0');
    else if (key === 'wood') m = tiledMaterial('grass', '#b9b07a');
    else if (key === 'pitch') m = tiledMaterial('grass', '#c6f0a8');
    else if (key === 'ground') m = tiledMaterial('grass', '#c8d896');
    else if (key === 'track') m = tiledMaterial('track');
    else if (key === 'water') m = new THREE.MeshStandardMaterial({ color: '#3f7f8f', roughness: 0.15, metalness: 0.2 });
    else if (key === 'pool') m = new THREE.MeshStandardMaterial({ color: '#4fb4e6', roughness: 0.1, metalness: 0.1 });
    else if (key === 'road') m = new THREE.MeshStandardMaterial({ color: '#7b766d', roughness: 0.95 });
    else if (key === 'path') m = new THREE.MeshStandardMaterial({ color: '#c2b294', roughness: 0.95 });
    else m = mat('#999999');
    // Ground layers sit centimetres apart; offset them in depth so they don't stripe at a distance.
    const layer = { wood: 1, grass: 2, ground: 3, pitch: 4, track: 5, water: 6, pool: 6, road: 7, path: 8 }[key];
    if (layer) Object.assign(m, { polygonOffset: true, polygonOffsetFactor: -layer, polygonOffsetUnits: -layer * 2 });
    this.mats[key] = m;
    return m;
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
      const key = a.kind === 'water' ? 'water' : a.kind;
      const [cx, cz] = centroid(a.poly);
      const tile = key === 'track' ? TEX_SIZE.track : TEX_SIZE.grass;
      this.addShape(key, cx, cz, this.flatShape(a.poly, [], Y[a.kind] ?? 0.02, tile));
    }
  }

  buildRoads() {
    for (const r of D.roads) {
      const foot = ['footway', 'path', 'steps', 'pedestrian', 'track', 'cycleway'].includes(r.kind);
      const key = foot ? 'path' : 'road';
      const y = foot ? 0.058 : 0.05;
      const hw = r.w / 2;
      for (let i = 1; i < r.pts.length; i++) {
        const [x0, z0] = r.pts[i - 1];
        const [x1, z1] = r.pts[i];
        const len = Math.hypot(x1 - x0, z1 - z0);
        if (len < 0.01) continue;
        const nx = (-(z1 - z0) / len) * hw;
        const nz = ((x1 - x0) / len) * hw;
        const b = this.bucket(key, x0, z0);
        b.quad([x0 + nx, y, z0 + nz], [x1 + nx, y, z1 + nz], [x1 - nx, y, z1 - nz], [x0 - nx, y, z0 - nz], [[0, 0], [len / 4, 0], [len / 4, 1], [0, 1]], [0, 1, 0]);
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
  fitRoom(host, w, d, side, used) {
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
    for (const c of cands) {
      // door centre line c; find the facade on the door side
      const axis = side === 'south' || side === 'north' ? 'x' : 'z';
      const hits = crossings(host.outer, axis, c);
      if (!hits.length) continue;
      const edge = side === 'south' || side === 'east' ? Math.max(...hits) : Math.min(...hits);
      for (let inset = 0.6; inset < 14; inset += 0.4) {
        let x0; let z0;
        if (side === 'south') { x0 = c - w / 2; z0 = edge - inset - d; }
        if (side === 'north') { x0 = c - w / 2; z0 = edge + inset; }
        if (side === 'east') { z0 = c - d / 2; x0 = edge - inset - w; }
        if (side === 'west') { z0 = c - d / 2; x0 = edge + inset; }
        if (ok(x0, z0)) {
          if (!best || inset < best.inset) best = { x0, z0, inset, edge, c };
          break;
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
    const school = Object.fromEntries(ROOMS.map((r) => [r.id, r]));
    this.rooms = {};
    for (const [id, cfg] of Object.entries(ROOM_HOSTS)) {
      const s = school[id];
      const host = this.findBuilding(cfg.host);
      const w = s.x1 - s.x0; const d = s.z1 - s.z0;
      const used = usedByHost.get(host) || [];
      const fit = this.fitRoom(host, w, d, s.door.side, used);
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
    this.roomRefs = this.rooms;
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

  // ---------- buildings ----------
  buildBuildings() {
    const skip = new Set(['Saraswati Temple']);
    for (const b of this.buildings) {
      if (skip.has(b.name)) continue;
      const fac = facadeMaterial(FACADE_OF[b.kind] || 'plain');
      const facKey = `facade:${b.inCampus ? FACADE_OF[b.kind] || 'plain' : 'house'}`;
      const h = b.inCampus ? b.h : Math.min(b.h, 7);
      const [cx, cz] = centroid(b.outer);
      const cuts = this.hostCuts.get(b) || [];
      for (const ring of [b.outer, ...b.holes]) this.buildWallRing(ring, h, facKey, fac, cx, cz, cuts, b.inCampus);
      this.addShape(b.inCampus ? 'roof' : 'roofOut', cx, cz, this.flatShape(b.outer, b.holes, h, 4));
      for (const hole of b.holes) this.addShape('grass', cx, cz, this.flatShape(hole, [], 0.03, TEX_SIZE.grass));
      for (const cut of cuts) this.buildJambs(cut, h);
    }
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
        this.colliders.push({ minX: Math.min(a[0], c[0]) - 0.25, maxX: Math.max(a[0], c[0]) + 0.25, minZ: Math.min(a[1], c[1]) - 0.25, maxZ: Math.max(a[1], c[1]) + 0.25, minY: 0, maxY: h, walkable: false, enabled: true });
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

  buildRotunda() {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(24, 64), new THREE.MeshStandardMaterial({ map: this.sunburstTexture(), roughness: 0.85 }));
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(0, 0.07, 0);
    disc.receiveShadow = true;
    this.root.add(disc);
    const ring = new THREE.Mesh(new THREE.RingGeometry(24, 25.2, 64), mat('#e8e0cf'));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.075, 0);
    this.root.add(ring);
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

  buildClockTowerAt() {
    const p = this.poi('BITS Clock Tower');
    const grp = new THREE.Group();
    this.root.add(grp);
    // the school model sits on a roof at (3.5, base 6.9, −24.2); lift it onto a shaft at the real position
    this.buildClockTower(grp);
    const base = 15;
    grp.position.set(p.x - 3.5, base - 6.9, p.z + 24.2);
    this.box(p.x, 0, p.z, 6.6, base, 6.6, null, { tex: 'plasterWhite', tint: '#ead2a4' });
    this.box(p.x, 0, p.z + 3.4, 3.2, 3.6, 0.3, '#5a3a24', { collide: false });
    this.spots.stage = new THREE.Vector3(p.x, 0, p.z + 6);
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
    const hw = Math.min(w, 40) * 0.42; const hd = Math.min(d, 60) * 0.4;
    add(new THREE.BoxGeometry(hw * 2, 9, hd * 1.2), marble, 0, 4.5, hd * 0.35);
    for (let i = -2; i <= 2; i++) add(new THREE.CylinderGeometry(0.45, 0.5, 7, 12), marble, i * (hw / 2.5), 3.5, hd * 0.35 + hd * 0.6 + 0.3);
    add(new THREE.BoxGeometry(hw * 2 + 1, 0.8, hd * 1.4), '#ece4d4', 0, 9.4, hd * 0.35);
    const sh = add(new THREE.CylinderGeometry(1.2, hw * 0.75, 26, 8, 8), marble, 0, 9.8 + 13, -hd * 0.25);
    sh.rotation.y = Math.PI / 8;
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(new THREE.CylinderGeometry(0.4, hw * 0.25, 9, 8), marble, dx * hw * 0.55, 9.8 + 4.5, -hd * 0.25 + dz * hw * 0.45);
    add(new THREE.CylinderGeometry(1.8, 1.8, 0.8, 20), '#ece6d8', 0, 36.2, -hd * 0.25);
    add(new THREE.SphereGeometry(0.8, 14, 10), '#d4af37', 0, 37.2, -hd * 0.25, 0.3);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.2), new THREE.MeshStandardMaterial({ color: '#ff7f1e', side: THREE.DoubleSide }));
    flag.position.set(1.1, 39.2, -hd * 0.25);
    g.add(flag);
  }

  buildShivGanga() {
    const a = D.areas.find((x) => x.kind === 'shivganga');
    if (!a) return;
    const bb = bbox(a.poly);
    const cx = (bb.minX + bb.maxX) / 2; const cz = (bb.minZ + bb.maxZ) / 2;
    const R = Math.min(bb.maxX - bb.minX, bb.maxZ - bb.minZ) / 2;
    const ring = (r0, r1, color, y) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 72), mat(color, { roughness: color === '#2f5e4a' ? 0.15 : 0.9 }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(cx, y, cz);
      m.receiveShadow = true;
      this.root.add(m);
    };
    ring(R * 0.97, R * 1.03, '#d8cdb4', 0.07);
    ring(R * 0.78, R * 0.97, '#2f5e4a', 0.06);
    ring(R * 0.74, R * 0.78, '#d8cdb4', 0.075);
    ring(R * 0.18, R * 0.74, '#7fb85a', 0.06);
    for (let k = 0; k < 8; k++) {
      const path = new THREE.Mesh(new THREE.PlaneGeometry(1.6, R * 0.56), mat('#d8cdb4'));
      path.rotation.x = -Math.PI / 2;
      path.rotation.z = (k / 8) * Math.PI * 2;
      const ang = (k / 8) * Math.PI * 2;
      path.position.set(cx + Math.sin(ang) * R * 0.46, 0.08, cz + Math.cos(ang) * R * 0.46);
      this.root.add(path);
    }
    // moat collider ring (approx as 16 boxes) so you can't walk on water
    for (let k = 0; k < 24; k++) {
      const ang = (k / 24) * Math.PI * 2;
      const x = cx + Math.cos(ang) * R * 0.875; const z = cz + Math.sin(ang) * R * 0.875;
      const s = R * 0.13;
      this.colliders.push({ minX: x - s, maxX: x + s, minZ: z - s, maxZ: z + s, minY: 0, maxY: 0.5, walkable: false, enabled: true });
    }
    this.box(cx, 0, cz, 9, 0.6, 9, null, { tex: 'plasterWhite', collide: false });
    for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) this.box(cx + dx, 0.6, cz + dz, 0.5, 4, 0.5, '#f3efe6', { collide: false });
    const cup = new THREE.Mesh(new THREE.SphereGeometry(4.2, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2), mat('#9fc3e6', { roughness: 0.5 }));
    cup.position.set(cx, 4.6, cz);
    cup.castShadow = true;
    this.root.add(cup);
  }

  buildGymkhana() {
    const ground = D.areas.find((x) => x.kind === 'ground');
    const track = D.areas.find((x) => x.kind === 'track');
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

  // "Your Bhawan": the player's hostel entrance (arrival, spawn and "back to the hostel").
  buildHostelGate() {
    const b = this.findBuilding('Krishna Bhawan');
    const bb = b.bb;
    const zc = (bb.minZ + bb.maxZ) / 2;
    const hits = crossings(b.outer, 'z', zc);
    const xEdge = Math.min(...hits);
    const X = xEdge - 2.5;
    this.box(xEdge - 1.2, 0, zc, 2.2, 3, 3.6, null, { tex: 'plasterWhite', tint: '#ecd8b8' });
    this.label('Your Bhawan · Krishna Bhawan', xEdge - 2.4, 4.2, zc, { height: 0.75, bg: 'rgba(30,60,110,0.92)' });
    this.interactable('gate', X, zc, 'Go back to your Bhawan', { radius: 3.2 });
    this.spots.gate = [];
    for (let i = 0; i < 7; i++) this.spots.gate.push(new THREE.Vector3(X - 2 - (i % 3) * 1.4, 0, zc - 3 + Math.floor(i / 3) * 2.2));
    this.spots.spawn = new THREE.Vector3(X - 1.5, 0, zc);
    this.spots.guard = new THREE.Vector3(X + 0.2, 0, zc + 2.4);
    this.spots.parents = new THREE.Vector3(X - 3, 0, zc + 4);
    this.hostelEntrance = new THREE.Vector3(X, 0, zc);
  }

  // ---------- trees ----------
  buildTrees() {
    const pts = [];
    const add = (x, z, s) => {
      if (this.isBuilt(x, z, 1.5) || this.nearRoad(x, z, 0.8)) return;
      if (Math.hypot(x, z) < 27) return;
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
    const byChunk = new Map();
    for (const p of pts) {
      const k = chunkKey(p[0], p[1]);
      if (!byChunk.has(k)) byChunk.set(k, []);
      byChunk.get(k).push(p);
    }
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 3.2, 6);
    trunkGeo.translate(0, 1.6, 0);
    const crownGeo = new THREE.IcosahedronGeometry(2.6, 0);
    crownGeo.translate(0, 4.6, 0);
    const trunkMat = mat('#5b3f27', { roughness: 1 });
    const crownMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: true });
    const greens = ['#4f8f3a', '#3f7d33', '#5d9c44', '#6a8f3a', '#3a6e2e'].map((c) => new THREE.Color(c));
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
    for (const p of D.pois) put(p.name === 'All night canteen' ? null : p.name, p.x, p.name === 'BITS Clock Tower' ? 52 : 6, p.z);
    for (const a of D.areas) if (a.name) { const [cx, cz] = centroid(a.poly); put(a.name, cx, 5, cz); }
  }

  // ---------- runtime ----------
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

  roomAt(x, z) {
    for (const r of this.roomList) if (x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) return r.id;
    return null;
  }

  pathTo(from, targetRoomId, point) {
    const pts = [];
    const fromRoom = this.roomAt(from.x, from.z);
    if (fromRoom && fromRoom !== targetRoomId) {
      const r = this.rooms[fromRoom];
      pts.push(r.inside.clone(), r.outside.clone());
    }
    if (targetRoomId && fromRoom !== targetRoomId) {
      const r = this.rooms[targetRoomId];
      pts.push(r.outside.clone(), r.inside.clone());
    }
    pts.push(point.clone());
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
