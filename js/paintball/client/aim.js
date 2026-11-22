// Crosshair aiming: what the centre of the screen points at, and the aim that lands a paintball there.
// The camera ray is swept against the same campus / arena geometry and player bodies the server uses for
// paintballs, so the crosshair point is where the server will see the paintball land (give or take the blaster's
// spread). The aim is solved from the eye (where the server fires from) with paintball drop compensated, which
// also lines up the third-person shoulder camera.
import { sweepArena, segPlayer, ballisticAim } from '../sim.js';

// Recoil per trigger pull (radians of view kick): small, paintball blasters are gentle.
export const RECOIL = { standard: 0.011, rapid: 0.006, burst: 0.008, spread: 0.026, precision: 0.03, launcher: 0.04 };

// from: camera position, dir: unit camera forward, eye: { x, y, z } of the shooter's eyes, e: the blaster,
// bodies: [{ x, y, z, id }] other players' feet. Returns { yaw, pitch, dist, point, kind, id, inRange }.
export function crosshairAim(from, dir, eye, e, arena, bodies) {
  // start the ray level with the shooter (in third person the camera is behind you: skip what is behind you)
  const t0 = Math.max(0, (eye.x - from.x) * dir.x + (eye.y - from.y) * dir.y + (eye.z - from.z) * dir.z);
  const reach = e.range * 1.6 + t0;
  const a = { x: from.x + dir.x * t0, y: from.y + dir.y * t0, z: from.z + dir.z * t0 };
  const b = { x: from.x + dir.x * reach, y: from.y + dir.y * reach, z: from.z + dir.z * reach };
  let best = null;
  const wall = sweepArena(a, b, arena);
  if (wall) best = { t: wall.t, kind: wall.kind };
  for (const p of bodies) {
    const hit = segPlayer(a, b, p);
    if (hit && (!best || hit.t < best.t)) best = { t: hit.t, kind: 'player', id: p.id };
  }
  const t = best ? best.t : 1;
  const point = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
  const dist = Math.hypot(point.x - eye.x, point.y - eye.y, point.z - eye.z);
  // past the blaster's range the paintball falls short anyway: aim at the crosshair line at full range
  const to = dist > e.range ? { x: eye.x + (point.x - eye.x) * (e.range / dist), y: eye.y + (point.y - eye.y) * (e.range / dist), z: eye.z + (point.z - eye.z) * (e.range / dist) } : point;
  const look = { yaw: Math.atan2(-dir.x, -dir.z), pitch: Math.asin(Math.max(-1, Math.min(1, dir.y))) };
  const solved = dist < 1.2 ? look : ballisticAim(eye, to, e.speed, e.gravity);
  return { yaw: solved.yaw, pitch: solved.pitch, dist, point, kind: best ? best.kind : null, id: best?.id, inRange: !!best && dist <= e.range };
}

// Crosshair gap in CSS pixels for a spread cone (radians) at a vertical field of view (degrees).
export const spreadPx = (spread, fovDeg, heightPx) => (Math.tan(spread) / Math.tan((fovDeg * Math.PI) / 360)) * (heightPx / 2);
