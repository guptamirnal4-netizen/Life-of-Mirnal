// Paintball simulation shared by the game server (authoritative) and the browser (client-side prediction):
// player movement against the arena's solids and net fence, and paintball sweeps. Plain math, no three.js or DOM,
// so the server and the client step exactly the same code.
import { MOVE, TICK_HZ } from './rules.js';
import { BOMB } from './items.js';

// The client sends one input per INPUT_DT step; the server replays them at the same step.
export const INPUT_DT = 1 / 30;
// The player's body for paintball hits: an upright cylinder from the feet to the top of the head.
export const BODY = { radius: 0.38, height: MOVE.height };

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const fin = (v, d = 0) => (Number.isFinite(v) ? v : d);

// Aim direction for a yaw / pitch, the same convention as the camera (rotation order YXZ, -z forward at yaw 0).
export function aimDir(yaw, pitch) {
  const c = Math.cos(pitch);
  return { x: -Math.sin(yaw) * c, y: Math.sin(pitch), z: -Math.cos(yaw) * c };
}

const TAU = Math.PI * 2;
const wrapAngle = (a) => { a %= TAU; if (a > Math.PI) a -= TAU; if (a < -Math.PI) a += TAU; return a; };

// Yaw / pitch that lands a paintball (speed, gravity) fired from `eye` on the point `to`. The server steps
// paintballs in sub-steps, which drops them a little more than the closed form; `h` accounts for that.
export function ballisticAim(eye, to, speed, gravity) {
  const dx = to.x - eye.x; const dz = to.z - eye.z; const dy = to.y - eye.y; const d = Math.hypot(dx, dz);
  let pitch = Math.atan2(dy, d);
  const h = 1 / TICK_HZ / Math.max(1, Math.ceil((speed / TICK_HZ) / 3));
  for (let i = 0; i < 6; i++) { const t = d / Math.max(1, speed * Math.cos(pitch)); pitch = Math.atan2(dy + 0.5 * gravity * t * (t + h), d); }
  return { yaw: Math.atan2(-dx, -dz), pitch: clamp(pitch, -1.4, 1.4), dist: d };
}

// The crosshair aim (ay, ap) may differ from where you look (yaw, pitch) only by AIM_SLACK radians: enough for the
// third-person shoulder camera and for paintball drop, never a free aimbot. Without an aim, you fire where you look.
export const AIM_SLACK = 0.45;
export function fireAim(yaw, pitch, ay, ap) {
  if (!Number.isFinite(ay) || !Number.isFinite(ap)) return { yaw, pitch };
  const dy = clamp(wrapAngle(ay - yaw), -AIM_SLACK, AIM_SLACK);
  return { yaw: yaw + dy, pitch: clamp(pitch + clamp(ap - pitch, -AIM_SLACK, AIM_SLACK), -1.45, 1.45) };
}

// Whatever the client sends, only these fields with these ranges are used.
export function sanitizeInput(i = {}) {
  let f = clamp(fin(Number(i.f)), -1, 1); let s = clamp(fin(Number(i.s)), -1, 1);
  const m = Math.hypot(f, s); if (m > 1) { f /= m; s /= m; }
  const ay = Number(i.ay); const ap = Number(i.ap); const aim = Number.isFinite(ay) && Number.isFinite(ap);
  return {
    ...(aim ? { ay: wrapAngle(ay), ap: clamp(ap, -1.45, 1.45) } : {}),
    seq: Math.max(0, Math.floor(fin(Number(i.seq)))),
    f, s,
    run: !!i.run, jump: !!i.jump, fire: !!i.fire, reload: !!i.reload,
    slot: i.slot === 1 ? 1 : 0,
    yaw: fin(Number(i.yaw)) % (Math.PI * 2),
    pitch: clamp(fin(Number(i.pitch)), -1.45, 1.45),
  };
}

// Push a circle of radius r at (x, z) out of a solid's footprint.
function pushOut(p, s, r) {
  if (s.kind === 'cyl') {
    const dx = p.x - s.x; const dz = p.z - s.z; const d = Math.hypot(dx, dz); const min = s.r + r;
    if (d >= min) return;
    if (d < 1e-6) { p.x = s.x + min; return; }
    p.x = s.x + (dx / d) * min; p.z = s.z + (dz / d) * min;
    return;
  }
  const nx = clamp(p.x, s.minX, s.maxX); const nz = clamp(p.z, s.minZ, s.maxZ);
  const dx = p.x - nx; const dz = p.z - nz; const d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return;
  if (d2 > 1e-10) { const d = Math.sqrt(d2); p.x += (dx / d) * (r - d); p.z += (dz / d) * (r - d); return; }
  // centre inside the box: leave by the nearest face
  const opts = [[s.minX - r - p.x, 0], [s.maxX + r - p.x, 0], [0, s.minZ - r - p.z], [0, s.maxZ + r - p.z]];
  opts.sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1]));
  p.x += opts[0][0]; p.z += opts[0][1];
}

// One movement step. p: { x, y, z, vy } (mutated). The jump is lower than the lowest bunker, so bunkers are walls
// at every height and the floor is the grass (y 0).
export function stepMove(p, inp, dt, arena, frozen = false, mul = 1) {
  if (arena.geo) return stepCampus(p, inp, dt, arena.geo, frozen, mul);
  const r = MOVE.radius;
  if (!frozen) {
    const { vx, vz } = velocity(inp, mul);
    p.x += vx * dt;
    for (const s of arena.solids) pushOut(p, s, r);
    p.z += vz * dt;
    for (const s of arena.solids) pushOut(p, s, r);
    if (inp.jump && p.y <= 0.0001) p.vy = MOVE.jump;
  }
  p.vy -= MOVE.gravity * dt;
  p.y += p.vy * dt;
  if (p.y <= 0) { p.y = 0; p.vy = 0; }
  const b = arena.bounds;
  p.x = clamp(p.x, b.minX + r, b.maxX - r); p.z = clamp(p.z, b.minZ + r, b.maxZ - r);
  return p;
}

function velocity(inp, mul = 1) {
  const sp = (inp.run ? MOVE.run : MOVE.walk) * mul;
  const fx = -Math.sin(inp.yaw); const fz = -Math.cos(inp.yaw); // forward
  const rx = Math.cos(inp.yaw); const rz = -Math.sin(inp.yaw); // right
  return { vx: (fx * inp.f + rx * inp.s) * sp, vz: (fz * inp.f + rz * inp.s) * sp };
}

// One movement step on the whole campus (Campus Royale), against the exported campus geometry
// (js/paintball/geometry.js) with the life-sim player's rules: walls and trunks block, stairs and floors are
// walked up (a step of at most 0.7 m) and down (gravity), sunken courts are lower ground, and the campus boundary
// keeps everyone in. Sub-stepped so a run never skips through a thin wall.
export function stepCampus(p, inp, dt, geo, frozen = false, mul = 1) {
  if (!frozen) {
    const { vx, vz } = velocity(inp, mul);
    const n = Math.max(1, Math.ceil((Math.hypot(vx, vz) * dt) / 0.12));
    for (let k = 0; k < n; k++) {
      const ox = p.x; const oz = p.z;
      p.x += (vx * dt) / n; geo.resolve(p, 'x');
      p.z += (vz * dt) / n; geo.resolve(p, 'z');
      if (!geo.inBounds(p.x, p.z)) { p.x = ox; p.z = oz; }
    }
    if (inp.jump && p.y <= geo.floorAt(p.x, p.z, p.y) + 0.001) p.vy = MOVE.jump;
  }
  const floor = geo.floorAt(p.x, p.z, p.y);
  p.vy -= MOVE.gravity * dt;
  p.y += p.vy * dt;
  if (p.y <= floor) { p.y = floor; p.vy = 0; }
  return p;
}

// ---------- paintball sweeps ----------
// Segment a → b (3D, t in [0, 1]) against an upright cylinder; returns entry t or -1.
export function segCyl(a, b, cx, cz, rad, y0, y1) {
  const dx = b.x - a.x; const dy = b.y - a.y; const dz = b.z - a.z;
  const ox = a.x - cx; const oz = a.z - cz;
  const A = dx * dx + dz * dz; const B = 2 * (ox * dx + oz * dz); const C = ox * ox + oz * oz - rad * rad;
  let best = -1;
  if (C <= 0 && a.y >= y0 && a.y <= y1) return 0; // starts inside
  if (A > 1e-12) {
    const disc = B * B - 4 * A * C;
    if (disc >= 0) {
      const t = (-B - Math.sqrt(disc)) / (2 * A);
      if (t >= 0 && t <= 1) { const y = a.y + dy * t; if (y >= y0 && y <= y1) best = t; }
    }
  }
  // top cap (falling in from above)
  if (Math.abs(dy) > 1e-12) {
    const t = (y1 - a.y) / dy;
    if (t >= 0 && t <= 1 && (best < 0 || t < best)) {
      const x = a.x + dx * t - cx; const z = a.z + dz * t - cz;
      if (x * x + z * z <= rad * rad) best = t;
    }
  }
  return best;
}

// Segment against a box solid (y from 0 to h): slab method; returns { t, n } or null.
export function segBox(a, b, s) {
  const d = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const lo = { x: s.minX, y: 0, z: s.minZ }; const hi = { x: s.maxX, y: s.h, z: s.maxZ };
  let t0 = 0; let t1 = 1; let n = null;
  for (const k of ['x', 'y', 'z']) {
    if (Math.abs(d[k]) < 1e-12) { if (a[k] < lo[k] || a[k] > hi[k]) return null; continue; }
    let ta = (lo[k] - a[k]) / d[k]; let tb = (hi[k] - a[k]) / d[k]; let sign = -1;
    if (ta > tb) { [ta, tb] = [tb, ta]; sign = 1; }
    if (ta > t0) { t0 = ta; n = { x: 0, y: 0, z: 0 }; n[k] = sign; }
    if (tb < t1) t1 = tb;
    if (t0 > t1) return null;
  }
  return { t: t0, n: n || { x: 0, y: 1, z: 0 } };
}

// First thing a paintball moving a → b hits among the arena (bunkers, grass, net), or null.
// Returns { t, kind: 'solid'|'ground'|'net', n (surface normal), id }.
export function sweepArena(a, b, arena) {
  if (arena.geo) return arena.geo.sweep(a, b);
  let best = null;
  for (const s of arena.solids) {
    if (s.kind === 'cyl') {
      const t = segCyl(a, b, s.x, s.z, s.r, 0, s.h);
      if (t >= 0 && (!best || t < best.t)) {
        const x = a.x + (b.x - a.x) * t - s.x; const z = a.z + (b.z - a.z) * t - s.z; const y = a.y + (b.y - a.y) * t;
        const l = Math.hypot(x, z) || 1; const top = y >= s.h - 1e-3;
        best = { t, kind: 'solid', id: s.id, n: top ? { x: 0, y: 1, z: 0 } : { x: x / l, y: 0, z: z / l } };
      }
    } else {
      const h = segBox(a, b, s);
      if (h && (!best || h.t < best.t)) best = { t: h.t, kind: 'solid', id: s.id, n: h.n };
    }
  }
  if (b.y < 0 && a.y >= 0) { const t = a.y / (a.y - b.y); if (!best || t < best.t) best = { t, kind: 'ground', n: { x: 0, y: 1, z: 0 } }; }
  const bd = arena.bounds;
  for (const [k, lim, nk] of [['x', bd.minX, 1], ['x', bd.maxX, -1], ['z', bd.minZ, 1], ['z', bd.maxZ, -1]]) {
    const da = a[k] - lim; const db = b[k] - lim;
    if ((da >= 0) === (db >= 0) || Math.abs(da - db) < 1e-12) continue;
    const t = da / (da - db);
    if (!best || t < best.t) { const n = { x: 0, y: 0, z: 0 }; n[k] = nk; best = { t, kind: 'net', n }; }
  }
  return best;
}

// Is the straight line a → b blocked by a bunker? (splash cover)
export function blocked(a, b, arena) {
  if (arena.geo) return arena.geo.blocked(a, b);
  for (const s of arena.solids) {
    if (s.kind === 'cyl' ? segCyl(a, b, s.x, s.z, s.r, 0, s.h) >= 0 : segBox(a, b, s)) return true;
  }
  return false;
}

// Segment against a player standing at (p.x, p.y, p.z). Returns { t, precision } or null; a hit at or above
// the head line (MOVE.head above the feet) is a precision paint hit.
export function segPlayer(a, b, p) {
  const t = segCyl(a, b, p.x, p.z, BODY.radius, p.y, p.y + BODY.height);
  if (t < 0) return null;
  const y = a.y + (b.y - a.y) * t;
  return { t, precision: y - p.y >= MOVE.head };
}

// ---------- thrown paint bombs (Campus Royale) ----------
// A bomb in flight: { x, y, z, vx, vy, vz, rest, bounces }. Swept against the campus (never through a wall),
// bounces off what it hits (losing speed) and comes to rest on a floor. The server and the browser step the same
// code from the same throw, so both see the same arc.
export function stepBomb(b, dt, arena) {
  if (b.rest) return b;
  const n = Math.max(1, Math.ceil((Math.hypot(b.vx, b.vy, b.vz) * dt) / 1.2));
  const h = dt / n;
  for (let k = 0; k < n && !b.rest; k++) {
    b.vy -= BOMB.gravity * h;
    const a = { x: b.x, y: b.y, z: b.z };
    const e = { x: a.x + b.vx * h, y: a.y + b.vy * h, z: a.z + b.vz * h };
    const hit = sweepArena(a, e, arena);
    if (!hit) { b.x = e.x; b.y = e.y; b.z = e.z; continue; }
    const t = Math.max(0, hit.t - 1e-3); const nn = hit.n;
    b.x = a.x + (e.x - a.x) * t + nn.x * 0.02; b.y = a.y + (e.y - a.y) * t + nn.y * 0.02; b.z = a.z + (e.z - a.z) * t + nn.z * 0.02;
    const vn = b.vx * nn.x + b.vy * nn.y + b.vz * nn.z;
    if (vn < 0) {
      // reflect the normal part (losing energy), slow the sliding part
      const tx = b.vx - vn * nn.x; const ty = b.vy - vn * nn.y; const tz = b.vz - vn * nn.z;
      b.vx = tx * BOMB.friction - vn * nn.x * BOMB.bounce; b.vy = ty * BOMB.friction - vn * nn.y * BOMB.bounce; b.vz = tz * BOMB.friction - vn * nn.z * BOMB.bounce;
    }
    b.bounces = (b.bounces || 0) + 1;
    if (nn.y > 0.5 && (Math.hypot(b.vx, b.vy, b.vz) < 1.5 || b.bounces >= BOMB.maxBounces)) { b.vx = 0; b.vy = 0; b.vz = 0; b.rest = true; }
  }
  return b;
}
// Throw velocity for an aim (yaw, pitch): BOMB.speed along the aim, lofted a little.
export function throwVelocity(yaw, pitch) {
  const d = aimDir(yaw, Math.min(1.4, pitch + BOMB.loft));
  return { vx: d.x * BOMB.speed, vy: d.y * BOMB.speed, vz: d.z * BOMB.speed };
}
