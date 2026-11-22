// The film's players: ten BITSians in five squads of two (Campus Royale, 2v2v2v2v2). Each one is built exactly like a
// player in the multiplayer game (js/paintball/client/avatar.js: a character preset, outfit and trouser colours, a
// paintball mask in the squad colour and an accessory, all from js/paintball/looks.js), so the film shows the real
// customisation. Looks never change during the film; the blaster in hand follows what each player picks up.
// Also here: the posing helpers that turn the game's NPC rig into a film actor (stand on the real floor, run at a
// set pace, aim, throw, open a crate, clean off a squadmate, cheer), all pure functions of the shot time.
import * as THREE from 'three';
import { makeAvatar } from '../paintball/client/avatar.js';
import { equip, poseAim, splat } from '../paintball/models.js';
import { TEAMS } from '../paintball/rules.js';

// team: the squad (TEAMS index). character: looks.js CHARACTERS index. outfit / pants / accessory: looks.js lists.
export const CAST = [
  { id: 'advait', name: 'Advait', team: 0, character: 2, outfit: '#f5f6fa', pants: '#24345a', accessory: 'cap', role: 'Pink squad · hero' },
  { id: 'aanya', name: 'Aanya', team: 0, character: 1, outfit: '#ff8a1f', pants: '#2d3436', accessory: 'headband', role: 'Pink squad · paint bombs' },
  { id: 'rohan', name: 'Rohan', team: 1, character: 0, outfit: '#2d3436', pants: '#3b5a86', accessory: 'scarf', role: 'Cyan squad · precision' },
  { id: 'neha', name: 'Neha', team: 1, character: 5, outfit: '#ffd23d', pants: '#1f2a52', accessory: 'backpack', role: 'Cyan squad · support' },
  { id: 'kabir', name: 'Kabir', team: 2, character: 4, outfit: '#7cff4f', pants: '#636e72', accessory: 'none', role: 'Yellow squad' },
  { id: 'tara', name: 'Tara', team: 2, character: 3, outfit: '#30d5ff', pants: '#24345a', accessory: 'headband', role: 'Yellow squad' },
  { id: 'ishaan', name: 'Ishaan', team: 3, character: 0, outfit: '#ff3d7f', pants: '#2d3436', accessory: 'cap', role: 'Lime squad' },
  { id: 'sana', name: 'Sana', team: 3, character: 1, outfit: '#b26bff', pants: '#6c3a1f', accessory: 'scarf', role: 'Lime squad' },
  { id: 'arjun', name: 'Arjun', team: 4, character: 2, outfit: '#ffd23d', pants: '#3b5a86', accessory: 'backpack', role: 'Violet squad' },
  { id: 'vikram', name: 'Vikram', team: 4, character: 4, outfit: '#f5f6fa', pants: '#1f2a52', accessory: 'none', role: 'Violet squad' },
];
export const CAST_BY_ID = Object.fromEntries(CAST.map((c) => [c.id, c]));
export const teamColour = (c) => TEAMS[(typeof c === 'string' ? CAST_BY_ID[c] : c).team].colour;
export const SPEAKER_COLOUR = (id) => (CAST_BY_ID[id] ? teamColour(id) : '#ffffff');
export const SQUADS = TEAMS.map((t, k) => ({ team: k, name: t.name, colour: t.colour, members: CAST.filter((c) => c.team === k).map((c) => c.id) }));

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// A walk along a polyline at a steady speed; the heading looks a little ahead so corners turn smoothly.
// Points are [x, z] or [x, z, y]; the height comes from the floor (campus.floorAt) at film time.
export class Walk {
  constructor(points) {
    this.p = points.map((q) => (q.isVector3 ? q.clone().setY(0) : V(q[0], 0, q[1])));
    this.yh = points.map((q) => (q.isVector3 ? null : q[2] ?? null));
    this.len = [0];
    for (let i = 1; i < this.p.length; i++) this.len.push(this.len[i - 1] + this.p[i].distanceTo(this.p[i - 1]));
    this.total = this.len.at(-1);
  }

  seg(s) { let i = 1; while (i < this.p.length - 1 && this.len[i] < s) i++; return i; }

  at(s) {
    s = Math.max(0, Math.min(this.total, s));
    const i = this.seg(s);
    const f = (s - this.len[i - 1]) / Math.max(1e-6, this.len[i] - this.len[i - 1]);
    return this.p[i - 1].clone().lerp(this.p[i], f);
  }

  // a floor hint: the height the path expects there (so floorAt picks the right storey indoors)
  hint(s) {
    s = Math.max(0, Math.min(this.total, s));
    const i = this.seg(s);
    const a = this.yh[i - 1]; const b = this.yh[i];
    if (a == null || b == null) return null;
    const f = (s - this.len[i - 1]) / Math.max(1e-6, this.len[i] - this.len[i - 1]);
    return a + (b - a) * f;
  }

  heading(s) {
    const a = this.at(Math.min(s, this.total - 0.6) - 0.6); const b = this.at(Math.min(s, this.total - 0.6) + 1.2);
    return Math.atan2(b.x - a.x, b.z - a.z);
  }
}

export function buildCast(scene) {
  return CAST.map((c, i) => {
    const n = makeAvatar(scene, { nickname: c.name, character: c.character, outfit: c.outfit, pants: c.pants, mask: teamColour(c), accessory: c.accessory, equip: 'standard' }, { id: `film-${c.id}`, maskColour: teamColour(c), showName: false });
    n.group.visible = false;
    n.seed = i * 1.37;
    n.cast = c;
    n.restArms = n.arms.map((a) => a.rotation.z);
    n.filmEquip = 'standard';
    // a squad armband on the left arm
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.07, 14, 1, true), new THREE.MeshStandardMaterial({ color: teamColour(c), roughness: 0.5, side: THREE.DoubleSide }));
    band.position.y = -0.12; n.arms[0].add(band);
    // paint on clothes: shown as a player gets painted (paint meter), and on everyone painted out
    n.filmPaint = [];
    [[0.05, 1.2, 0.16, 0], [-0.08, 1.05, 0.15, 0.4], [0.1, 1.32, -0.15, Math.PI], [-0.06, 1.1, -0.16, Math.PI]].forEach(([x, y, z, ry], k) => {
      const s = splat(['#30d5ff', '#ff3d7f', '#ffd23d', '#7cff4f'][(i + k) % 4], i * 7 + k + 1, 0.08);
      s.position.set(x, y, z); s.rotation.y = ry; s.visible = false; n.body.add(s); n.filmPaint.push(s);
    });
    return n;
  });
}

// The blaster in an actor's hands (rebuilt only when it changes) and paint on their clothes (0–100).
export function gear(n, { blaster = 'standard', paint = 0 } = {}) {
  if (blaster !== n.filmEquip) { equip(n, blaster || null); n.filmEquip = blaster; }
  // a little bigger than in the game so the toy blaster reads on screen (the game's camera is closer)
  if (n.pbBlaster) { n.pbBlaster.visible = !!blaster; n.pbBlaster.scale.setScalar(1.45); }
  const k = paint >= 100 ? 4 : Math.floor(paint / 30);
  n.filmPaint.forEach((s, i) => { s.visible = i < k; });
}

const yawTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
const clamp01 = (x) => Math.min(1, Math.max(0, x));

// Poses an actor at shot time t from a spec. Pure function of t (the leg cycle comes from the distance walked), so
// seeking the film gives the same frame as playing up to it.
//   spec: { at: [x, z] | path: [[x, z(, y)], ...], speed, delay, gait: 'walk' | 'run', yaw | face: [x, z] | () => …,
//           act: (t, moving) => 'aim' | 'cheer' | … (or 'a+b'), y, floor: hint height }
export function pose(film, n, spec, t) {
  n.group.visible = true;
  let p; let yaw; let moving = false; let dist = 0; let hint = spec.floor ?? null;
  const speed = spec.speed ?? (spec.gait === 'run' ? 5.4 : 1.6);
  if (spec.path) {
    spec.walk ||= new Walk(spec.path);
    const w = spec.walk;
    const s = Math.max(0, Math.min(w.total, speed * (t - (spec.delay || 0))));
    p = w.at(s); dist = s;
    hint = w.hint(s) ?? hint;
    moving = t > (spec.delay || 0) && s < w.total - 0.01;
    yaw = moving || (spec.yaw == null && !spec.face) ? w.heading(s) : null;
  } else p = V(spec.at[0], 0, spec.at[1]);
  if (yaw == null) {
    const f = typeof spec.face === 'function' ? spec.face(t) : spec.face;
    if (f) yaw = yawTo(p, f.isVector3 ? f : V(f[0], 0, f[1]));
    else yaw = spec.yaw ?? 0;
  }
  const fa = film.floorAt;
  const y = (spec.y ?? 0) + (fa ? fa(p.x, p.z, (hint ?? 0) + 0.3) : hint ?? 0);
  n.pos.set(p.x, y, p.z);
  n.group.rotation.y = yaw;
  n.gait = spec.gait === 'run' ? 'run' : 'walk';
  n.moveSpeed = speed;
  n.seated = false;
  const stride = (n.gait === 'run' ? 2.9 : 1.9) * n.scale;
  n.phase = (moving ? (2 * Math.PI * dist) / stride : t * 1.5) + n.seed;
  n.breath = t * 2.2 + n.seed;
  n.headYaw = 0;
  n.arms.forEach((a, i) => { a.rotation.z = n.restArms[i]; a.rotation.y = 0; });
  n.elbows.forEach((e) => { e.rotation.y = 0; e.rotation.z = 0; });
  n.animate(0, moving, y);
  const act = typeof spec.act === 'function' ? spec.act(t, moving) : spec.act ?? (moving ? (n.gait === 'run' ? 'carry' : '') : 'ready');
  for (const a of (act || '').split('+').filter(Boolean)) gesture(n, a, t, moving);
  n.group.updateMatrixWorld(true);
  n.moving = moving;
  return n;
}

// Arm and body gestures over the walking/standing pose.
export function gesture(n, a, t, moving) {
  const A = n.arms; const E = n.elbows;
  const k = Math.sin(t * 9 + n.seed);
  switch (a) {
    case 'aim': poseAim(n, 0.02); break;
    case 'aimUp': poseAim(n, 0.14); break;
    case 'aimDown': poseAim(n, -0.12); break;
    case 'ready': // blaster held low across the body
      A[1].rotation.x = -0.55; A[1].rotation.z = 0.2; E[1].rotation.x = -0.7;
      A[0].rotation.x = -0.6; A[0].rotation.z = -0.05; E[0].rotation.x = -1.1; break;
    case 'carry': // running with the blaster held across the chest
      A[1].rotation.x = -0.75; A[1].rotation.z = 0.25; E[1].rotation.x = -0.9;
      A[0].rotation.x = -0.7; A[0].rotation.z = -0.1; E[0].rotation.x = -1.2; break;
    case 'throw': { // a paint bomb lobbed overarm with the left hand
      const u = clamp01((t % 1.2) / 0.5);
      A[0].rotation.x = -2.6 + u * 2.4; A[0].rotation.z = -0.2; E[0].rotation.x = -0.6 + u * 0.5;
      A[1].rotation.x = -0.6; A[1].rotation.z = 0.2; E[1].rotation.x = -0.9; break;
    }
    case 'windup': A[0].rotation.x = -2.6; A[0].rotation.z = -0.25; E[0].rotation.x = -0.9; A[1].rotation.x = -0.6; E[1].rotation.x = -0.9; break;
    case 'reach': // opening a crate / taking an item: the left hand reaches in, the blaster stays in the right
      n.lean(0.42); A[0].rotation.x = -0.9; A[0].rotation.z = -0.15; E[0].rotation.x = -0.3;
      A[1].rotation.x = -0.95; A[1].rotation.z = 0.35; E[1].rotation.x = -1.0; break;
    case 'clean': // kneeling, cleaning paint off a squadmate
      n.legs[0].rotation.x = -1.4; n.knees[0].rotation.x = 1.5; n.legs[1].rotation.x = 0.1; n.knees[1].rotation.x = 1.9;
      n.feet(false); n.pos.y -= 0.42 * n.scale; n.lean(0.35);
      A[0].rotation.x = -1.1 + Math.sin(t * 7) * 0.25; A[1].rotation.x = -1.0 - Math.sin(t * 7) * 0.25; E[0].rotation.x = -0.4; E[1].rotation.x = -0.4; break;
    case 'down': // fully painted: sitting on the grass, waiting for a squadmate (Campus Royale squads)
      n.legs[0].rotation.x = -1.45; n.legs[1].rotation.x = -1.3; n.knees[0].rotation.x = 0.2; n.knees[1].rotation.x = 0.35;
      n.feet(false); n.pos.y -= 0.72 * n.scale; n.lean(-0.15);
      A[0].rotation.x = 0.35; A[1].rotation.x = 0.35; A[0].rotation.z = -0.35; A[1].rotation.z = 0.35; break;
    case 'cheer': // both arms up, pumping
      A[0].rotation.x = -2.9 + k * 0.15; A[1].rotation.x = -2.9 - k * 0.15; A[0].rotation.z = -0.3; A[1].rotation.z = 0.3;
      E[0].rotation.x = -0.25; E[1].rotation.x = -0.25; break;
    case 'fist': A[1].rotation.x = -2.7 + k * 0.2; A[1].rotation.z = 0.2; E[1].rotation.x = -0.9; break;
    case 'jump': { const j = Math.max(0, Math.sin(t * 6.5 + n.seed)); n.pos.y += j * 0.38; n.knees[0].rotation.x = n.knees[1].rotation.x = (1 - j) * 0.5; n.legs[0].rotation.x = n.legs[1].rotation.x = -(1 - j) * 0.25; n.feet(false); break; }
    case 'wave': A[0].rotation.x = -2.6; A[0].rotation.z = -0.35 - Math.sin(t * 8) * 0.35; E[0].rotation.x = -0.4; break;
    case 'point': A[0].rotation.x = -1.5; A[0].rotation.z = -0.05; E[0].rotation.x = -0.05; break;
    case 'signal': // squad hand signal: left hand up, "hold"
      A[0].rotation.x = -2.2; A[0].rotation.z = -0.5; E[0].rotation.x = -1.4; break;
    case 'handsup': // painted out: hands up, walking off (round elimination)
      A[0].rotation.x = -2.95; A[1].rotation.x = -2.95; A[0].rotation.z = -0.12; A[1].rotation.z = 0.12; E[0].rotation.x = -0.1; E[1].rotation.x = -0.1; break;
    case 'highfive': A[1].rotation.x = -2.7; A[1].rotation.z = -0.35; E[1].rotation.x = -0.2; break;
    case 'crouch': {
      n.legs[0].rotation.x = -1.05; n.legs[1].rotation.x = -0.55; n.knees[0].rotation.x = 1.45; n.knees[1].rotation.x = 1.6;
      n.feet(false); n.pos.y -= 0.5 * n.scale * 0.62; n.lean(0.12); break;
    }
    case 'inspect': // the blaster turned in front of the face
      A[1].rotation.x = -1.35; A[1].rotation.z = 0.55 + Math.sin(t * 1.3) * 0.15; E[1].rotation.x = -1.2; E[1].rotation.y = 0.4;
      A[0].rotation.x = -1.2; A[0].rotation.z = -0.3; E[0].rotation.x = -1.3; n.head.rotation.x = 0.18; break;
    case 'nod': n.head.rotation.x = Math.max(0, Math.sin(t * 5)) * 0.2; break;
    case 'look': n.head.rotation.y = Math.sin(t * 0.9 + n.seed) * 0.5; break;
    default: break;
  }
}

export { yawTo, clamp01 };
