// Campus Royale visuals, reusable on their own (the multiplayer match drives them from the room; the campus film
// can drive them directly): supply crates with an opening lid, item models, the paint bomb, its burst, colour
// smoke, the paint shield bubble, the special supply drop marker and the paint-zone ring. Built from simple shapes,
// bright and toy-like; no live room, no DOM except the label canvas.
//
//   const c = crateModel({ kind: 'crate' }); scene.add(c.group); c.setOpen(1) // 0 closed … 1 lid fully up
//   c.update(dt) eases the lid towards c.target (c.open() / c.close() set it)
//   const z = zoneRing(); z.set(x, z, r) · const b = new PaintBurst(scene); b.fire(point, normal, colour, size)
import * as THREE from 'three';
import { ITEMS } from './items.js';
import { blaster } from './models.js';

const mats = new Map();
const M = (color, o = {}) => {
  const k = `${color}|${JSON.stringify(o)}`;
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.5, metalness: o.metal ?? 0, emissive: o.emissive || '#000000', emissiveIntensity: o.ei ?? (o.emissive ? 0.8 : 0), transparent: (o.opacity ?? 1) < 1, opacity: o.opacity ?? 1, depthWrite: (o.opacity ?? 1) >= 1, side: o.side ?? THREE.FrontSide }));
  return mats.get(k);
};
const box = (w, h, d, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return o; };

// ---------- supply crates ----------
// kind: 'crate' (a supply crate, paint-splattered wood), 'drop' (the special supply drop: bigger, gold, a beacon),
// 'pile' (dropped stuff: a small open tray). The lid hinges at the back edge.
const CRATE_LOOK = {
  crate: { w: 0.9, h: 0.55, d: 0.6, body: '#c98b4b', band: '#30d5ff', glow: '#30d5ff' },
  drop: { w: 1.3, h: 0.8, d: 0.9, body: '#ffd23d', band: '#ff3d7f', glow: '#ffd23d' },
  pile: { w: 0.7, h: 0.12, d: 0.5, body: '#2d3436', band: '#7cff4f', glow: '#7cff4f' },
};
export function crateModel({ kind = 'crate', colour = null } = {}) {
  const L = CRATE_LOOK[kind] || CRATE_LOOK.crate;
  const g = new THREE.Group(); g.name = `pb-crate:${kind}`;
  const body = M(L.body, { rough: 0.7 }); const band = M(colour || L.band, { emissive: colour || L.band, ei: 0.35 });
  g.add(box(L.w, L.h, L.d, body, 0, L.h / 2, 0));
  if (kind !== 'pile') {
    for (const s of [-1, 1]) g.add(box(0.06, L.h + 0.01, L.d + 0.02, band, s * (L.w / 2 - 0.12), L.h / 2, 0));
    // a few paint splats on the sides
    for (const [x, y, c] of [[-0.15, 0.3, '#ff3d7f'], [0.2, 0.18, '#7cff4f'], [0.05, 0.4, '#b26bff']]) g.add(box(0.12, 0.1, 0.005, M(c), x * L.w, y * L.h * 1.6, L.d / 2 + 0.004));
  }
  // lid on a hinge at the back
  const hinge = new THREE.Group(); hinge.position.set(0, L.h, -L.d / 2);
  if (kind !== 'pile') { const lid = box(L.w + 0.04, 0.07, L.d + 0.04, body, 0, 0.035, L.d / 2); hinge.add(lid); hinge.add(box(0.08, 0.072, L.d + 0.05, band, 0, 0.036, L.d / 2)); }
  g.add(hinge);
  // a soft glow disc on the ground so crates read from far away
  const glow = new THREE.Mesh(new THREE.CircleGeometry(L.w * 0.95, 24), new THREE.MeshBasicMaterial({ color: L.glow, transparent: true, opacity: 0.35, depthWrite: false }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.02; g.add(glow);
  // the inside (shows when open)
  const inside = box(L.w - 0.08, 0.02, L.d - 0.08, M('#1e272e'), 0, L.h - 0.04, 0); g.add(inside);
  g.traverse((o) => { if (o.isMesh && o !== glow) o.castShadow = true; });
  const c = {
    group: g, hinge, kind, look: L, open: 0, target: 0, glow,
    setOpen(v) { c.open = v; hinge.rotation.x = -v * 1.9; },
    openLid() { c.target = 1; }, closeLid() { c.target = 0; },
    setEmpty(empty) { glow.material = empty ? emptyGlow : glow.userData.full || (glow.userData.full = glow.material); },
    update(dt) { if (c.open !== c.target) { const k = Math.min(1, dt * 5); c.setOpen(Math.abs(c.target - c.open) < 0.01 ? c.target : c.open + (c.target - c.open) * k); } },
  };
  return c;
}
const emptyGlow = new THREE.MeshBasicMaterial({ color: '#888888', transparent: true, opacity: 0.12, depthWrite: false });

// ---------- items ----------
// A small model for an item id (js/paintball/items.js): blasters use the real blaster model; the rest are simple
// coloured shapes.
export function itemModel(id) {
  const it = ITEMS[id]; const g = new THREE.Group(); g.name = `pb-item:${id}`;
  if (!it) return g;
  const c = M(it.colour, { emissive: it.colour, ei: 0.25 });
  switch (it.kind) {
    case 'blaster': { const b = blaster(it.blaster); b.rotation.y = Math.PI / 2; b.scale.setScalar(1.3); g.add(b); break; }
    case 'ammo': case 'refill': for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), c); s.position.set((i % 3) * 0.1 - 0.1, 0.05 + Math.floor(i / 3) * 0.08, 0); g.add(s); } g.add(box(0.34, 0.04, 0.14, M('#2d3436'), 0, 0.0, 0)); break;
    case 'throw': g.add(bombModel(it.id === 'smoke' ? '#b26bff' : '#ff3d7f')); break;
    case 'kit': g.add(box(0.24, 0.16, 0.12, c, 0, 0.08, 0)); g.add(box(0.06, 0.1, 0.125, M('#ffffff'), 0, 0.08, 0)); break;
    case 'gear': if (it.slot === 'mask') { g.add(box(0.22, 0.1, 0.06, c, 0, 0.1, 0)); g.add(box(0.18, 0.06, 0.065, M('#1e272e', { metal: 0.4, rough: 0.1 }), 0, 0.11, 0.003)); } else { g.add(box(0.34, 0.36, 0.12, c, 0, 0.18, 0)); } break;
    case 'gadget': if (it.id === 'shield') { const s = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 10), M('#7cf0ff', { emissive: '#7cf0ff', opacity: 0.6 })); s.position.y = 0.14; g.add(s); } else { g.add(box(0.12, 0.2, 0.06, M('#2d3436'), 0, 0.1, 0)); const d = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.015, 6, 20), c); d.position.y = 0.24; g.add(d); } break;
    default: g.add(box(0.2, 0.2, 0.2, c, 0, 0.1, 0));
  }
  return g;
}

// ---------- paint bombs, bursts, smoke ----------
// A paint bomb: a round, harmless pod of paint with a soft cap and a stripe.
export function bombModel(colour = '#ff3d7f') {
  const g = new THREE.Group(); g.name = 'pb-bomb';
  const s = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), M(colour, { rough: 0.3, emissive: colour, ei: 0.3 })); g.add(s);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 6, 20), M('#ffffff')); band.rotation.x = Math.PI / 2; g.add(band);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.05, 10), M('#2d3436')); cap.position.y = 0.1; g.add(cap);
  return g;
}

// A burst of paint droplets (pooled): fire(point, normal, colour, size) then update(dt) every frame.
export class PaintBurst {
  constructor(parent, max = 260) {
    this.parent = parent; this.drops = []; this.max = max;
    this.geo = new THREE.SphereGeometry(0.08, 6, 4);
  }
  fire(pt, n, colour, size = 1) {
    const count = Math.round(14 + size * 30);
    const mat = M(colour, { rough: 0.35, emissive: colour, ei: 0.2 });
    for (let i = 0; i < count; i++) {
      let d = this.drops.find((x) => !x.mesh.visible);
      if (!d) { if (this.drops.length >= this.max) d = this.drops[i % this.drops.length]; else { d = { mesh: new THREE.Mesh(this.geo, mat), v: new THREE.Vector3(), life: 0 }; this.parent.add(d.mesh); this.drops.push(d); } }
      d.mesh.material = mat; d.mesh.visible = true; d.mesh.position.copy(pt); d.mesh.scale.setScalar(0.6 + Math.random() * size);
      d.v.set(n.x + (Math.random() - 0.5) * 2, Math.abs(n.y) + Math.random() * 1.6, n.z + (Math.random() - 0.5) * 2).normalize().multiplyScalar((2 + Math.random() * 4) * size);
      d.life = 0.5 + Math.random() * 0.5;
    }
  }
  update(dt) {
    for (const d of this.drops) {
      if (!d.mesh.visible) continue;
      d.v.y -= 12 * dt; d.mesh.position.addScaledVector(d.v, dt); d.life -= dt;
      if (d.life <= 0) d.mesh.visible = false;
    }
  }
  dispose() { for (const d of this.drops) this.parent.remove(d.mesh); this.drops.length = 0; }
}

// A colour-smoke cloud: a cluster of soft puffs that swell, then fade. update(dt) returns false when gone.
export class SmokeCloud {
  constructor(parent, pos, { radius = 6, duration = 12, colour = '#b26bff' } = {}) {
    this.parent = parent; this.t = 0; this.duration = duration; this.group = new THREE.Group(); this.group.position.copy(pos);
    const cols = [colour, '#ff3d7f', '#30d5ff', '#ffd23d'];
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: cols[i % cols.length], transparent: true, opacity: 0, depthWrite: false }));
      const a = Math.random() * Math.PI * 2; const r = Math.random() * radius * 0.7;
      m.position.set(Math.cos(a) * r, 0.6 + Math.random() * 2.2, Math.sin(a) * r); m.userData.s = 1.4 + Math.random() * 1.6;
      this.group.add(m);
    }
    parent.add(this.group);
  }
  update(dt) {
    this.t += dt; const k = this.t / this.duration;
    for (const m of this.group.children) { m.scale.setScalar(m.userData.s * Math.min(1, this.t / 1.2)); m.material.opacity = 0.75 * Math.min(1, this.t / 0.6) * (k > 0.75 ? Math.max(0, (1 - k) / 0.25) : 1); m.position.y += dt * 0.05; }
    if (k >= 1) { this.parent.remove(this.group); for (const m of this.group.children) m.material.dispose(); return false; }
    return true;
  }
}

// ---------- the paint shield ----------
// A shimmering bubble round a player (height ~2 m). set(active) shows / hides it; update(dt) shimmers.
export function shieldBubble(colour = '#7cf0ff') {
  const mat = new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: 0.6, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide, roughness: 0.1 });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.05, 28, 18), mat); mesh.scale.set(1, 1.15, 1); mesh.position.y = 1.0; mesh.name = 'pb-shield';
  let t = 0;
  return { mesh, update(dt) { t += dt; mat.opacity = 0.22 + Math.sin(t * 6) * 0.06; mesh.rotation.y += dt * 0.8; }, set(on) { mesh.visible = on; } };
}

// ---------- the special supply drop ----------
// A tall coloured beam with a ring, visible across campus, and a crate swinging under a striped canopy while it
// falls. set(x, y, z, landed, fall 0..1: how far down it is).
export function dropMarker() {
  const g = new THREE.Group(); g.name = 'pb-drop-marker';
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 120, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#ffd23d', transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 60; g.add(beam);
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.8, 48), new THREE.MeshBasicMaterial({ color: '#ff3d7f', transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; g.add(ring);
  const fall = new THREE.Group(); g.add(fall);
  const crate = crateModel({ kind: 'drop' }); fall.add(crate.group);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#ff3d7f', side: THREE.DoubleSide, roughness: 0.6 }));
  canopy.position.y = 4.5; canopy.scale.y = 0.55; fall.add(canopy);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 3.9, 4), M('#f5f6fa')); l.position.set(x * 0.9, 2.6, z * 0.6); l.rotation.z = -x * 0.35; l.rotation.x = z * 0.25; fall.add(l); }
  let t = 0;
  return {
    group: g, crate, beam, fall,
    set(x, y, z, landed, f = 1) { g.position.set(x, y, z); fall.visible = !landed; fall.position.y = (1 - f) * 90; },
    update(dt) { t += dt; ring.scale.setScalar(1 + Math.sin(t * 3) * 0.08); beam.material.opacity = 0.25 + Math.sin(t * 2) * 0.08; fall.rotation.z = Math.sin(t * 1.7) * 0.12; },
  };
}

// ---------- the paint zone ----------
// A tall, see-through, softly striped wall of paint colour on the zone circle (open at top and bottom). Playful:
// a curtain of colour, not a hazard. set(x, z, r).
export function zoneRing({ colour = '#ff3d7f', height = 70 } = {}) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g2 = c.getContext('2d');
  const grad = g2.createLinearGradient(0, 0, 0, 64); grad.addColorStop(0, 'rgba(255,255,255,0)'); grad.addColorStop(1, 'rgba(255,255,255,1)');
  g2.fillStyle = grad; g2.fillRect(0, 0, 256, 64);
  g2.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 256; i += 32) { g2.fillStyle = 'rgba(0,0,0,0.45)'; g2.fillRect(i, 0, 14, 64); }
  const tex = new THREE.CanvasTexture(c); tex.wrapS = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ color: colour, map: tex, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, height, 128, 1, true), mat);
  mesh.name = 'pb-zone'; mesh.renderOrder = 3; mesh.frustumCulled = false;
  let t = 0;
  return {
    mesh,
    set(x, z, r, y0 = -12) { mesh.visible = r > 0.5; mesh.position.set(x, y0 + height / 2, z); mesh.scale.set(Math.max(r, 0.5), 1, Math.max(r, 0.5)); tex.repeat.set(Math.max(4, Math.round((2 * Math.PI * r) / 40)), 1); },
    update(dt) { t += dt; tex.offset.x = (t * 0.02) % 1; },
  };
}
