// Crosshair aiming: the paintball lands where the crosshair points (first and third person, every blaster,
// paintball drop included), and the server only accepts an aim close to where you look.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fireAim, AIM_SLACK, sanitizeInput, aimDir, segPlayer, sweepArena } from '../js/paintball/sim.js';
import { crosshairAim, spreadPx } from '../js/paintball/client/aim.js';
import { EQUIPMENT } from '../js/paintball/equipment.js';
import { MOVE, TICK_HZ } from '../js/paintball/rules.js';
import { MEDC } from '../js/paintball/arena.js';

const OPEN = { solids: [], bounds: { minX: -500, maxX: 500, minZ: -500, maxZ: 500 } };

// a paintball stepped exactly as the server steps it (PaintballRoom.flyPaintballs), spread left out
function fly(eye, yaw, pitch, e, target, arena = OPEN) {
  const d = aimDir(yaw, pitch);
  const pb = { x: eye.x, y: eye.y, z: eye.z, vx: d.x * e.speed, vy: d.y * e.speed, vz: d.z * e.speed, dist: 0 };
  const dt = 1 / TICK_HZ;
  for (let tick = 0; tick < 200; tick++) {
    const steps = Math.max(1, Math.ceil((e.speed * dt) / 3)); const h = dt / steps;
    for (let k = 0; k < steps; k++) {
      const a = { x: pb.x, y: pb.y, z: pb.z };
      pb.vy -= e.gravity * h;
      const b = { x: a.x + pb.vx * h, y: a.y + pb.vy * h, z: a.z + pb.vz * h };
      const wall = sweepArena(a, b, arena);
      const hit = target && segPlayer(a, b, target);
      if (hit && (!wall || hit.t <= wall.t)) return { kind: 'player', y: a.y + (b.y - a.y) * hit.t };
      if (wall) return { kind: wall.kind, x: a.x + (b.x - a.x) * wall.t, y: a.y + (b.y - a.y) * wall.t, z: a.z + (b.z - a.z) * wall.t };
      pb.dist += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
      Object.assign(pb, b);
      if (pb.dist > e.range) return { kind: 'drop' };
    }
  }
  return { kind: 'none' };
}

// the camera the game uses (MatchView.camera3): first person at the eye, third person behind the right shoulder
function camera(eye, yaw, pitch, view) {
  const f = { x: -Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: -Math.cos(yaw) * Math.cos(pitch) };
  if (view === 'first') return { from: { ...eye }, dir: f };
  const back = 3.2; const up = 0.45; const rx = Math.cos(yaw); const rz = -Math.sin(yaw);
  return { from: { x: eye.x - f.x * back + rx * 0.55, y: Math.max(0.4, eye.y + up - f.y * back), z: eye.z - f.z * back + rz * 0.55 }, dir: f };
}

// look at a point from a camera position: the yaw / pitch that puts it under the crosshair
function lookAt(from, to) {
  const dx = to.x - from.x; const dy = to.y - from.y; const dz = to.z - from.z;
  return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
}

test('the paintball hits the player under the crosshair: every blaster, first and third person, near and far', () => {
  const eye = { x: 0, y: MOVE.eye, z: 0 };
  for (const e of EQUIPMENT) {
    for (const view of ['first', 'third']) {
      for (const frac of [0.25, 0.6, 0.95]) {
        const dist = e.range * frac;
        const side = dist * 0.3; const target = { id: 't', x: side, y: 0, z: -Math.sqrt(dist * dist - side * side) };
        const chest = { x: target.x, y: 1.2, z: target.z };
        // point the camera at the target's chest (the camera itself is the player's view: aim → yaw / pitch)
        let yaw = 0; let pitch = 0;
        for (let i = 0; i < 8; i++) { const c = camera(eye, yaw, pitch, view); const l = lookAt(c.from, chest); yaw = l.yaw; pitch = l.pitch; }
        const c = camera(eye, yaw, pitch, view);
        const aim = crosshairAim(c.from, c.dir, eye, e, OPEN, [target]);
        assert.equal(aim.kind, 'player', `${e.id} ${view} ${dist.toFixed(0)} m: crosshair on the player`);
        assert.ok(aim.inRange, `${e.id} ${view} in range`);
        const fired = fireAim(yaw, pitch, aim.yaw, aim.pitch);
        const r = fly(eye, fired.yaw, fired.pitch, e, target);
        assert.equal(r.kind, 'player', `${e.id} ${view} at ${dist.toFixed(0)} m: the paintball hits (got ${r.kind})`);
        assert.ok(Math.abs(r.y - 1.2) < 0.45, `${e.id} ${view} at ${dist.toFixed(0)} m: lands near the chest (y ${r.y.toFixed(2)})`);
      }
    }
  }
});

test('the paintball lands on the wall point under the crosshair (Med-C bunker, third person)', () => {
  const e = EQUIPMENT.find((x) => x.id === 'standard');
  const tower = MEDC.solids.find((s) => s.label === 'tower');
  const eye = { x: tower.minX - 20, y: MOVE.eye, z: (tower.minZ + tower.maxZ) / 2 + 0.3 };
  const spot = { x: tower.minX, y: 1.3, z: eye.z };
  let yaw = 0; let pitch = 0;
  for (let i = 0; i < 8; i++) { const c = camera(eye, yaw, pitch, 'third'); const l = lookAt(c.from, spot); yaw = l.yaw; pitch = l.pitch; }
  const c = camera(eye, yaw, pitch, 'third');
  const aim = crosshairAim(c.from, c.dir, eye, e, MEDC, []);
  assert.equal(aim.kind, 'solid');
  const f = fireAim(yaw, pitch, aim.yaw, aim.pitch);
  const r = fly(eye, f.yaw, f.pitch, e, null, MEDC);
  assert.equal(r.kind, 'solid');
  assert.ok(Math.hypot(r.y - spot.y, r.z - spot.z) < 0.15, `splat ${r.y.toFixed(2)}, ${r.z.toFixed(2)} vs crosshair ${spot.y}, ${spot.z.toFixed(2)}`);
});

test('the server keeps the crosshair aim close to the view; inputs without one fire where you look', () => {
  assert.deepEqual(fireAim(1, 0.2, undefined, undefined), { yaw: 1, pitch: 0.2 });
  const a = fireAim(0, 0, 1.5, -1.2);
  assert.ok(Math.abs(a.yaw - AIM_SLACK) < 1e-9 && Math.abs(a.pitch + AIM_SLACK) < 1e-9, 'clamped to the slack');
  const w = fireAim(Math.PI - 0.05, 0, -Math.PI + 0.05, 0); // across the ±π seam
  assert.ok(Math.abs(w.yaw - (Math.PI + 0.05)) < 1e-9, `wraps: ${w.yaw}`);
  const i = sanitizeInput({ seq: 1, yaw: 0, pitch: 0, ay: 0.1, ap: 0.05 });
  assert.equal(i.ay, 0.1); assert.equal(i.ap, 0.05);
  const j = sanitizeInput({ seq: 1, yaw: 0, pitch: 0, ay: 'x', ap: NaN });
  assert.ok(!('ay' in j) && !('ap' in j), 'junk aim dropped');
  assert.ok(sanitizeInput({ ay: 0, ap: 9 }).ap <= 1.45);
});

test('crosshair gap follows the blaster spread and the field of view', () => {
  const std = EQUIPMENT.find((x) => x.id === 'standard'); const spr = EQUIPMENT.find((x) => x.id === 'spread');
  assert.ok(spreadPx(spr.spread, 72, 900) > spreadPx(std.spread, 72, 900) * 5);
  assert.ok(spreadPx(std.spread, 30, 900) > spreadPx(std.spread, 72, 900), 'zoomed in: wider on screen');
});
