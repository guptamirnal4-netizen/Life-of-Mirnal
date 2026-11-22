// The film's game visuals, as pure functions of film time so seeking and frame-by-frame rendering stay exact.
// It drives the real Campus Royale models from js/paintball/fx.js (supply crates with their opening lid, item
// models, the paint bomb, the paint shield bubble, the special supply drop marker, the paint-zone ring) and adds
// what the live game animates with random numbers and dt: paint bursts (seeded droplets on ballistic arcs), paint
// bomb arcs, and the glowing campus boundary. The campus maps (tactical map, landing map, minimap, big map) are
// drawn from the same campus data the game uses (data/bits-campus.js) and the verified registries
// (js/paintball/data/royale-spots.json), styled like js/paintball/client/royale.js.
import * as THREE from 'three';
import { BITS_CAMPUS as D } from '../../data/bits-campus.js';
import { crateModel, itemModel, bombModel, shieldBubble, dropMarker, zoneRing } from '../paintball/fx.js';
import { splat } from '../paintball/models.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
export function seeded(seed = 1) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---------- paint bursts ----------
// A burst: { t, p: [x, y, z], n: [nx, ny, nz], cols: [colours], size, seed }. Its droplets fly on seeded ballistic
// arcs (gravity 12 m/s², like fx.js PaintBurst) for 0.5–1 s. Drawn with one instanced mesh.
const MAX_DROPS = 900;
export class Droplets {
  constructor(parent) {
    const geo = new THREE.SphereGeometry(0.075, 7, 5);
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.35, emissive: '#222222', emissiveIntensity: 0.4 });
    this.mesh = new THREE.InstancedMesh(geo, mat, MAX_DROPS);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.setColorAt(0, new THREE.Color('#ffffff'));
    this.mesh.frustumCulled = false; this.mesh.count = 0; this.mesh.name = 'film-droplets';
    parent.add(this.mesh);
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.c = new THREE.Color();
    this.cache = new Map();
  }
  plan(b) {
    if (this.cache.has(b)) return this.cache.get(b);
    const r = seeded(b.seed || Math.round(b.t * 1000 + b.p[0] * 13));
    const n = V(...(b.n || [0, 1, 0]));
    const size = b.size ?? 1; const count = Math.round(12 + size * 22);
    const drops = [];
    for (let i = 0; i < count; i++) {
      const v = V(n.x + (r() - 0.5) * 2, Math.abs(n.y) + r() * 1.6, n.z + (r() - 0.5) * 2).normalize().multiplyScalar((2 + r() * 4) * Math.min(1.6, size));
      drops.push({ v, s: 0.45 + r() * size * 0.55, life: 0.5 + r() * 0.5, col: b.cols[i % b.cols.length] });
    }
    this.cache.set(b, drops);
    return drops;
  }
  // bursts: the shot's list; at: time since the shot started (in the same clock as b.t); slow: time scale
  update(bursts, at, slow = 1) {
    let k = 0;
    for (const b of bursts || []) {
      const tau = (at - b.t) * slow;
      if (tau < 0 || tau > 1.1) continue;
      const p0 = V(...b.p);
      for (const d of this.plan(b)) {
        if (tau > d.life || k >= MAX_DROPS) continue;
        const x = p0.x + d.v.x * tau; const y = p0.y + d.v.y * tau - 6 * tau * tau; const z = p0.z + d.v.z * tau;
        const s = d.s * (1 - 0.5 * (tau / d.life));
        this.m.compose(V(x, Math.max(p0.y - 0.3, y), z), this.q, V(s, s, s));
        this.mesh.setMatrixAt(k, this.m); this.mesh.setColorAt(k, this.c.set(d.col)); k++;
      }
    }
    this.mesh.count = k;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
  dispose(parent) { parent.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
}

// A paint bomb thrown from `from` to land at `to` (arcs over `air` s, two small bounces, bursts at `fuse` s like the
// real ~2 s fuse). Returns the position at time u since the throw, or null once it has burst.
export function bombAt(from, to, u, { air = 0.9, fuse = 2.0, apex = 3.2 } = {}) {
  if (u < 0 || u >= fuse) return null;
  const a = V(...from); const b = V(...to);
  if (u < air) { const k = u / air; const p = a.clone().lerp(b, k); p.y += Math.sin(Math.PI * k) * apex; return p; }
  const d = b.clone().sub(a).setY(0).normalize();
  const w = u - air; // bounces: 0.35 s and 0.22 s hops, then rolling to rest
  if (w < 0.35) { const k = w / 0.35; return b.clone().addScaledVector(d, k * 0.9).setY(b.y + Math.sin(Math.PI * k) * 0.45); }
  if (w < 0.57) { const k = (w - 0.35) / 0.22; return b.clone().addScaledVector(d, 0.9 + k * 0.5).setY(b.y + Math.sin(Math.PI * k) * 0.15); }
  return b.clone().addScaledVector(d, 1.4 + Math.min(0.3, (w - 0.57) * 0.5)).setY(b.y);
}

// Splats on the ground round a paint-bomb burst (like the live game's onBoom: one big one and six round it).
export function bombSplats(p, seed = 3) {
  const r = seeded(seed); const out = [{ p: [p[0], p[1] + 0.03, p[2]], n: [0, 1, 0], r: 0.75, col: '#ff3d7f' }];
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + r(); const d = 0.6 + r() * 2.2; out.push({ p: [p[0] + Math.cos(a) * d, p[1] + 0.025, p[2] + Math.sin(a) * d], n: [0, 1, 0], r: 0.25 + r() * 0.25, col: ['#ff3d7f', '#ffd23d', '#30d5ff'][i % 3] }); }
  return out;
}

// ---------- the campus boundary ----------
// A glowing ribbon along the real campus boundary wall (the gameplay boundary of Campus Royale). draw(0..1)
// reveals it along its length.
export function boundaryRibbon(floorAt) {
  const B = D.boundary; const H = 26;
  const pts = [...B, B[0]];
  const pos = []; const uv = []; const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = len.at(-1);
  // split long sides so the ribbon follows the ground
  const verts = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i]; const [x1, z1] = pts[i + 1]; const L = len[i + 1] - len[i]; const n = Math.max(1, Math.ceil(L / 25));
    for (let k = 0; k < n; k++) { const f = k / n; verts.push([x0 + (x1 - x0) * f, z0 + (z1 - z0) * f, (len[i] + L * f) / total]); }
  }
  verts.push([pts[0][0], pts[0][1], 1]);
  for (const [x, z, s] of verts) { const y = floorAt ? floorAt(x, z, 0.5) : 0; pos.push(x, y - 1, z, x, y + H, z); uv.push(s, 0, s, 1); }
  const idx = [];
  for (let i = 0; i < verts.length - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
  const cv = document.createElement('canvas'); cv.width = 4; cv.height = 64;
  const g2 = cv.getContext('2d'); const gr = g2.createLinearGradient(0, 64, 0, 0);
  gr.addColorStop(0, 'rgba(255,210,61,0.95)'); gr.addColorStop(0.5, 'rgba(255,61,127,0.55)'); gr.addColorStop(0.92, 'rgba(255,61,127,0.05)'); gr.addColorStop(0.95, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g2.fillStyle = gr; g2.fillRect(0, 0, 4, 64);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const mesh = new THREE.Mesh(geo, mat); mesh.name = 'film-boundary'; mesh.frustumCulled = false; mesh.renderOrder = 4;
  const n = idx.length;
  return { mesh, set(draw, glow = 1) { geo.setDrawRange(0, Math.floor((n / 6) * Math.min(1, draw)) * 6); mat.opacity = glow; mesh.visible = glow > 0.01 && draw > 0.001; } };
}

// ---------- the real Campus Royale props, posed by time ----------
// Supply crate (fx.js crateModel) with its items (fx.js itemModel) rising out as the lid opens.
export function crateProp({ kind = 'crate', items = [], yaw = 0 } = {}) {
  const c = crateModel({ kind });
  c.group.rotation.y = yaw;
  const box = new THREE.Group(); c.group.add(box);
  const models = items.slice(0, 4).map((id, i, a) => { const m = itemModel(id); m.position.set((i - (a.length - 1) / 2) * 0.24, c.look.h - 0.12, 0); m.scale.setScalar(0.8); box.add(m); return m; });
  return {
    group: c.group, crate: c, models,
    // open 0..1 (the lid), taken: how many items are gone (from the left), t: spin time
    pose(open, taken = 0, t = 0) {
      c.setOpen(open); box.visible = open > 0.15;
      models.forEach((m, i) => { m.visible = i >= taken; m.position.y = c.look.h - 0.12 + clamp01((open - 0.3) / 0.7) * 0.18; m.rotation.y = t * 0.6 + i; });
    },
  };
}

export function zoneRings() {
  const zone = zoneRing(); const next = zoneRing({ colour: '#ffffff', height: 3 });
  next.mesh.material.opacity = 0.35;
  return {
    zone, next,
    set(Z, t, y0 = -12) {
      zone.set(Z.x, Z.z, Z.r, y0); zone.mesh.material.map.offset.x = (t * 0.02) % 1;
      next.set(Z.nx ?? Z.x, Z.nz ?? Z.z, Z.nr ?? 0, 0); next.mesh.visible = !!Z.showNext && Z.nr > 0.5 && Z.nr < Z.r - 1;
    },
  };
}

// The special supply drop: beam, ring and the crate under its canopy. fall 0..1 (1 = on the ground).
export function airdropProp() {
  const d = dropMarker();
  const ring = d.group.children.find((o) => o.geometry?.type === 'RingGeometry');
  return {
    group: d.group, marker: d,
    pose(x, y, z, fall, t) {
      d.set(x, y, z, fall >= 1, Math.min(1, fall));
      d.fall.visible = fall < 1 && fall > 0;
      d.fall.rotation.z = Math.sin(t * 1.7) * 0.12;
      if (ring) ring.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
      d.beam.material.opacity = 0.25 + Math.sin(t * 2) * 0.08;
    },
  };
}

export function shieldProp() {
  const s = shieldBubble();
  return { mesh: s.mesh, pose(pos, t, a = 1) { s.mesh.visible = a > 0.01; s.mesh.position.set(pos.x, pos.y, pos.z); s.mesh.rotation.y = t * 0.8; s.mesh.material.opacity = (0.22 + Math.sin(t * 6) * 0.06) * a; s.mesh.scale.set(a, 1.15 * a, a); } };
}

export function bombProp(colour = '#ff3d7f') { return bombModel(colour); }

export function splatProp({ p, n = [0, 1, 0], r = 0.3, col = '#ff3d7f', seed = 1 }) {
  const m = splat(col, seed, r);
  m.position.set(...p); m.lookAt(m.position.clone().add(V(...n))); m.position.addScaledVector(V(...n), 0.012);
  return m;
}

// ---------- campus maps ----------
// The campus base map, drawn once (lawns, grounds, roads, buildings, water, the boundary wall), in the colours of
// the live game's map (js/paintball/client/royale.js base()).
let BASE = null;
export function campusBase() {
  if (BASE) return BASE;
  const xs = D.boundary.map((p) => p[0]); const zs = D.boundary.map((p) => p[1]);
  const b = { minX: Math.min(...xs) - 20, maxX: Math.max(...xs) + 20, minZ: Math.min(...zs) - 20, maxZ: Math.max(...zs) + 20 };
  const S = 0.75;
  const cv = document.createElement('canvas'); cv.width = Math.ceil((b.maxX - b.minX) * S); cv.height = Math.ceil((b.maxZ - b.minZ) * S);
  const g = cv.getContext('2d');
  const X = (x) => (x - b.minX) * S; const Z = (z) => (z - b.minZ) * S;
  const poly = (pts) => { g.beginPath(); pts.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z)))); g.closePath(); };
  g.fillStyle = '#3d5a35'; g.fillRect(0, 0, cv.width, cv.height);
  g.save(); poly(D.boundary); g.clip();
  g.fillStyle = '#6f9a54'; g.fillRect(0, 0, cv.width, cv.height);
  for (const a of D.areas) { g.fillStyle = { grass: '#7fae5e', pitch: '#86b864', ground: '#b9a27a', track: '#c0704f', wood: '#557f45', pool: '#4fb4e6', water: '#4f8fa0', shivganga: '#7fae5e' }[a.kind] || '#7fae5e'; poly(a.poly); g.fill(); }
  g.strokeStyle = '#e8e2d2'; g.lineCap = 'round';
  for (const r of D.roads) { g.lineWidth = Math.max(2, (r.w || 6) * S); g.beginPath(); r.pts.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z)))); g.stroke(); }
  g.fillStyle = '#d8c9b0'; g.strokeStyle = '#8a7a62'; g.lineWidth = 1;
  for (const bd of D.buildings) { if (!bd.inCampus) continue; poly(bd.outer); g.fill(); g.stroke(); }
  g.restore();
  g.strokeStyle = '#ffffff'; g.lineWidth = 3; poly(D.boundary); g.stroke();
  BASE = { cv, S, b };
  return BASE;
}
// world ↔ canvas for a canvas showing the whole campus (north up)
export function mapXform(cv, pad = 0) {
  const { b } = campusBase(); const W = cv.width - pad * 2; const H = cv.height - pad * 2;
  const k = Math.min(W / (b.maxX - b.minX), H / (b.maxZ - b.minZ));
  const ox = pad + (W - (b.maxX - b.minX) * k) / 2; const oz = pad + (H - (b.maxZ - b.minZ) * k) / 2;
  return { k, X: (x) => ox + (x - b.minX) * k, Z: (z) => oz + (z - b.minZ) * k };
}
export function drawBase(g, w) { const B = campusBase(); g.drawImage(B.cv, w.X(B.b.minX), w.Z(B.b.minZ), (B.b.maxX - B.b.minX) * w.k, (B.b.maxZ - B.b.minZ) * w.k); }
// the zone (pink outside, pink circle) and the next zone (dashed white), as on the live game's maps
export function drawZone(g, w, Z) {
  g.save(); g.beginPath(); g.rect(-5, -5, g.canvas.width + 10, g.canvas.height + 10); g.arc(w.X(Z.x), w.Z(Z.z), Math.max(0.5, Z.r * w.k), 0, Math.PI * 2, true); g.fillStyle = 'rgba(255,61,127,0.22)'; g.fill('evenodd'); g.restore();
  g.strokeStyle = '#ff3d7f'; g.lineWidth = 2; g.beginPath(); g.arc(w.X(Z.x), w.Z(Z.z), Math.max(0.5, Z.r * w.k), 0, Math.PI * 2); g.stroke();
  if (Z.nr > 0.5 && Z.nr < Z.r - 1) { g.strokeStyle = '#ffffff'; g.setLineDash([5, 4]); g.beginPath(); g.arc(w.X(Z.nx), w.Z(Z.nz), Z.nr * w.k, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); }
}
export function drawArrow(g, x, y, yaw, size = 7) {
  g.save(); g.translate(x, y); g.rotate(-yaw + Math.PI); g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -size); g.lineTo(size * 0.7, size * 0.7); g.lineTo(-size * 0.7, size * 0.7); g.closePath(); g.fill(); g.stroke(); g.restore();
}
// The minimap: a north-up crop R metres each way round pos (like royale.js drawMini).
export function miniXform(cv, pos, R = 90) {
  const k = cv.width / (2 * R);
  return { k, X: (x) => (x - pos.x) * k + cv.width / 2, Z: (z) => (z - pos.z) * k + cv.height / 2 };
}
export function drawMiniBase(g, cv, pos, R = 90) {
  const B = campusBase();
  g.fillStyle = '#0b1020'; g.fillRect(0, 0, cv.width, cv.height);
  g.drawImage(B.cv, (pos.x - R - B.b.minX) * B.S, (pos.z - R * (cv.height / cv.width) - B.b.minZ) * B.S, 2 * R * B.S, 2 * R * (cv.height / cv.width) * B.S, 0, 0, cv.width, cv.height);
}

export const ROYALE_SPOTS_URL = new URL('../paintball/data/royale-spots.json', import.meta.url).href;
