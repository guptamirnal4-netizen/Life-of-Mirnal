// Paintball visuals shared by the film (js/cinematic/) and the multiplayer game (js/paintball/client/): toy-like
// blasters for the six equipment categories, the paintball mask, inflatable bunkers, the arena net, paintballs
// and paint splats. Everything is built from simple shapes in code (no third-party assets), coloured and playful:
// nothing here looks like a real firearm.
import * as THREE from 'three';
import { EQUIPMENT_BY_ID } from './equipment.js';

const cache = new Map();
const M = (color, o = {}) => {
  const k = `${color}|${o.metal || 0}|${o.rough ?? 0.55}|${o.emissive || ''}|${o.opacity ?? 1}`;
  if (!cache.has(k)) cache.set(k, new THREE.MeshStandardMaterial({ color, metalness: o.metal || 0, roughness: o.rough ?? 0.55, emissive: o.emissive || '#000000', emissiveIntensity: o.emissive ? 0.6 : 0, transparent: (o.opacity ?? 1) < 1, opacity: o.opacity ?? 1 }));
  return cache.get(k);
};
const box = (w, h, d, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; };
const cyl = (r0, r1, h, mat, x = 0, y = 0, z = 0, axis = 'z', seg = 14) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), mat);
  if (axis === 'z') m.rotation.x = Math.PI / 2; else if (axis === 'x') m.rotation.z = Math.PI / 2;
  m.position.set(x, y, z); return m;
};
const ball = (r, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat); m.position.set(x, y, z); return m; };

// ---------- blasters ----------
// A blaster group points down +z (the way an NPC faces), grip at the origin. Body colours are bright toy plastics
// with the category's paint colour on the hopper and the muzzle ring, so each one reads at a glance.
const SHELL = { standard: '#2f3542', rapid: '#f5f6fa', burst: '#273c75', spread: '#e1b12c', precision: '#353b48', launcher: '#44bd32' };
export function blaster(id) {
  const e = EQUIPMENT_BY_ID[id] || EQUIPMENT_BY_ID.standard;
  const g = new THREE.Group(); g.name = `blaster:${e.id}`;
  const body = M(SHELL[e.id] || '#2f3542', { rough: 0.45 });
  const paint = M(e.colour, { rough: 0.3, emissive: e.colour });
  const grey = M('#9aa3ad', { metal: 0.3, rough: 0.4 });
  g.add(box(0.035, 0.11, 0.05, body, 0, -0.04, 0)); // grip
  g.add(box(0.012, 0.04, 0.05, grey, 0, -0.005, 0.045)); // trigger guard
  switch (e.id) {
    case 'rapid': // chunky foam blaster: round drum hopper, short fat barrel
      g.add(box(0.07, 0.08, 0.32, body, 0, 0.04, 0.1));
      g.add(cyl(0.06, 0.06, 0.05, paint, 0, 0.04, 0.14, 'x', 18));
      g.add(cyl(0.028, 0.028, 0.16, grey, 0, 0.05, 0.33));
      g.add(cyl(0.034, 0.034, 0.02, paint, 0, 0.05, 0.41));
      break;
    case 'burst': // long marker with three stacked tubes over the barrel
      g.add(box(0.05, 0.06, 0.4, body, 0, 0.035, 0.13));
      for (let i = -1; i <= 1; i++) g.add(cyl(0.012, 0.012, 0.3, paint, i * 0.018, 0.08, 0.15));
      g.add(cyl(0.018, 0.018, 0.22, grey, 0, 0.03, 0.42));
      g.add(box(0.03, 0.08, 0.1, body, 0, 0.02, -0.12)); // stock
      break;
    case 'spread': // wide flared muzzle
      g.add(box(0.07, 0.07, 0.3, body, 0, 0.035, 0.1));
      { const cone = cyl(0.03, 0.08, 0.14, paint, 0, 0.035, 0.32, 'z', 16); cone.rotation.x = -Math.PI / 2; g.add(cone); }
      g.add(box(0.06, 0.025, 0.16, grey, 0, -0.01, 0.2)); // pump
      break;
    case 'precision': // slim long barrel and a scope
      g.add(box(0.04, 0.055, 0.42, body, 0, 0.03, 0.14));
      g.add(cyl(0.014, 0.014, 0.42, grey, 0, 0.035, 0.55));
      g.add(cyl(0.022, 0.022, 0.16, M('#111111', { rough: 0.2 }), 0, 0.085, 0.12));
      g.add(cyl(0.024, 0.024, 0.012, paint, 0, 0.085, 0.2));
      g.add(box(0.032, 0.09, 0.14, body, 0, 0.0, -0.15));
      break;
    case 'launcher': // stubby tube launcher with a big paint shell
      g.add(cyl(0.06, 0.06, 0.46, body, 0, 0.06, 0.14, 'z', 18));
      g.add(cyl(0.066, 0.066, 0.03, paint, 0, 0.06, 0.37, 'z', 18));
      g.add(ball(0.045, paint, 0, 0.06, 0.36));
      g.add(box(0.03, 0.06, 0.08, body, 0, -0.02, 0.22)); // fore grip
      break;
    default: // standard marker: body, barrel, round hopper on top
      g.add(box(0.045, 0.065, 0.3, body, 0, 0.035, 0.1));
      g.add(cyl(0.016, 0.016, 0.26, grey, 0, 0.04, 0.36));
      g.add(ball(0.055, paint, 0, 0.12, 0.06));
      g.add(cyl(0.02, 0.02, 0.04, body, 0, 0.08, 0.06, 'y'));
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// Puts a blaster in an NPC's right hand (and keeps one per NPC). Returns the blaster group.
export function equip(npc, id) {
  if (npc.pbBlaster) { npc.pbBlaster.parent?.remove(npc.pbBlaster); npc.pbBlaster = null; }
  if (!id) return null;
  const b = blaster(id);
  b.position.set(0, -0.24, 0.02);
  b.rotation.x = Math.PI / 2; // the hand hangs down the forearm: turn the blaster to point along the hand
  npc.elbows[1].add(b);
  npc.pbBlaster = b; npc.pbEquip = id;
  return b;
}

// Two-handed aiming pose. Call after npc.animate(): it overrides the arms only (legs keep walking).
// pitch: radians up (+) or down (-).
export function poseAim(npc, pitch = 0) {
  if (!npc.arms) return;
  npc.arms[1].rotation.x = -Math.PI / 2 + 0.15 - pitch; npc.arms[1].rotation.z = 0.12;
  npc.elbows[1].rotation.x = -0.15;
  npc.arms[0].rotation.x = -Math.PI / 2 + 0.35 - pitch; npc.arms[0].rotation.z = 0.45;
  npc.elbows[0].rotation.x = -0.6;
}

// A paintball mask: a coloured shell with a dark visor and an elastic strap. One per NPC.
export function mask(npc, colour = '#ff3d7f') {
  if (npc.pbMask) npc.head.remove(npc.pbMask);
  const g = new THREE.Group(); g.name = 'pb-mask';
  const shell = M(colour, { rough: 0.4 });
  const visor = M('#1e272e', { rough: 0.08, metal: 0.4, opacity: 0.85 });
  g.add(box(0.2, 0.075, 0.035, visor, 0, 0.055, 0.11)); // goggle lens
  g.add(box(0.22, 0.03, 0.05, shell, 0, 0.1, 0.105)); // brow
  g.add(box(0.15, 0.08, 0.04, shell, 0, -0.025, 0.115)); // mouth guard
  for (let i = -2; i <= 2; i++) g.add(box(0.012, 0.05, 0.01, M('#2d3436'), i * 0.025, -0.025, 0.137)); // vents
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.012, 6, 24), M('#2d3436'));
  strap.rotation.x = Math.PI / 2; strap.position.y = 0.06; g.add(strap);
  npc.head.add(g); npc.pbMask = g;
  return g;
}

// ---------- paintballs and splats ----------
const ballGeo = new THREE.SphereGeometry(0.035, 10, 8);
export function paintball(colour) { const m = new THREE.Mesh(ballGeo, M(colour, { rough: 0.2, emissive: colour })); m.name = 'paintball'; return m; }

// A flat irregular splat (a disc with a wobbly rim and a few droplets) facing +z; place it on a surface with
// lookAt(point + normal). Deterministic per seed.
export function splatGeometry(seed = 1, radius = 0.25) {
  let s = (seed * 9301 + 49297) % 233280; const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const shape = new THREE.Shape();
  const n = 18;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2; const r = radius * (0.7 + rnd() * 0.45 + (i % 4 === 0 ? rnd() * 0.35 : 0));
    if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r); else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const geos = [new THREE.ShapeGeometry(shape)];
  for (let i = 0; i < 5; i++) {
    const a = rnd() * Math.PI * 2; const d = radius * (1.25 + rnd() * 0.6);
    const c = new THREE.CircleGeometry(radius * (0.07 + rnd() * 0.1), 8); c.translate(Math.cos(a) * d, Math.sin(a) * d, 0); geos.push(c);
  }
  let count = 0; for (const g of geos) count += g.index.count;
  const pos = []; const idx = [];
  let off = 0;
  for (const g of geos) { const p = g.attributes.position.array; for (let i = 0; i < p.length; i++) pos.push(p[i]); for (const i of g.index.array) idx.push(i + off); off += p.length / 3; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  return geo;
}
export function splat(colour, seed, radius) {
  const m = new THREE.Mesh(splatGeometry(seed, radius), new THREE.MeshStandardMaterial({ color: colour, roughness: 0.35, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, side: THREE.DoubleSide }));
  m.name = 'splat'; m.renderOrder = 2; return m;
}

// ---------- the arena: inflatable bunkers and the net ----------
// Bunkers come from arena.solids (js/paintball/arena.js), so what you see is exactly what the server collides with.
const BUNKER = ['#ff3d7f', '#30d5ff', '#ffd23d', '#7cff4f', '#b26bff', '#ff8a1f'];
export function arenaGroup(arena) {
  const g = new THREE.Group(); g.name = `arena:${arena.id}`;
  arena.solids.forEach((s, i) => {
    const c = BUNKER[i % BUNKER.length];
    const skin = M(c, { rough: 0.35 }); const stripe = M('#ffffff', { rough: 0.4 });
    let m;
    if (s.kind === 'cyl') {
      m = new THREE.Group();
      m.add(cyl(s.r, s.r, s.h - s.r * 0.6, skin, 0, (s.h - s.r * 0.6) / 2, 0, 'y', 20));
      const top = new THREE.Mesh(new THREE.SphereGeometry(s.r, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), skin); top.scale.y = 0.6; top.position.y = s.h - s.r * 0.6; m.add(top);
      m.add(cyl(s.r * 1.01, s.r * 1.01, 0.12, stripe, 0, s.h * 0.45, 0, 'y', 20));
      m.position.set(s.x, 0, s.z);
    } else {
      const w = s.maxX - s.minX; const d = s.maxZ - s.minZ;
      m = new THREE.Group();
      const r = Math.min(0.25, w / 4, d / 4, s.h / 4);
      m.add(box(w - 2 * r, s.h, d, skin, 0, s.h / 2, 0)); m.add(box(w, s.h, d - 2 * r, skin, 0, s.h / 2, 0)); // rounded-ish edges
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) m.add(cyl(r, r, s.h, skin, a * (w / 2 - r), s.h / 2, b * (d / 2 - r), 'y', 10));
      m.add(box(w + 0.02, 0.12, d + 0.02, stripe, 0, s.h * 0.55, 0));
      m.position.set((s.minX + s.maxX) / 2, 0, (s.minZ + s.maxZ) / 2);
    }
    m.name = `bunker:${s.id}`;
    m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.add(m);
  });
  // the net fence: posts every 5 m and a see-through net
  const b = arena.bounds; const H = 3.2;
  const post = M('#2d3436', { metal: 0.4, rough: 0.5 });
  const net = new THREE.MeshBasicMaterial({ color: '#111111', transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
  const sides = [[[b.minX, b.minZ], [b.maxX, b.minZ]], [[b.maxX, b.minZ], [b.maxX, b.maxZ]], [[b.maxX, b.maxZ], [b.minX, b.maxZ]], [[b.minX, b.maxZ], [b.minX, b.minZ]]];
  for (const [[x0, z0], [x1, z1]] of sides) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(len, H), net);
    p.position.set((x0 + x1) / 2, H / 2, (z0 + z1) / 2); p.rotation.y = Math.atan2(-(z1 - z0), x1 - x0);
    g.add(p);
    for (let t = 0; t <= len + 0.01; t += 5) g.add(cyl(0.05, 0.05, H, post, x0 + ((x1 - x0) * t) / len, H / 2, z0 + ((z1 - z0) * t) / len, 'y', 8));
  }
  // chalk boundary line and a centre mark
  const chalk = new THREE.MeshBasicMaterial({ color: '#f5f6fa', polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  for (const [[x0, z0], [x1, z1]] of sides) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const l = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.12), chalk); l.rotation.x = -Math.PI / 2; l.rotation.z = Math.atan2(-(z1 - z0), x1 - x0);
    l.position.set((x0 + x1) / 2, 0.02, (z0 + z1) / 2); g.add(l);
  }
  return g;
}
