// The film's cast: ten BITS Pilani students with fixed looks. Once a student has picked a mask colour, a team and
// a blaster (Scene 3), those never change for the rest of the film. Plain data plus the posing helpers that turn
// the game's NPC rig into a film actor (stand on the floor, walk/run at a set pace, aim, cheer, jump, high-five).
import * as THREE from 'three';
import { NPC } from '../world/npcs.js';
import { equip, mask, poseAim, splat } from '../paintball/models.js';
import { TEAMS } from '../paintball/rules.js';

// team: 0 Pink, 1 Cyan, null = not playing. loadout: primary first (models.js blaster ids, equipment.js names).
export const CAST = [
  { id: 'mirnal', name: 'Mirnal', gender: 'm', hair: 'short', color: '#ff7a45', skin: 0, height: 1.74, team: 0, loadout: ['standard', 'rapid'], role: 'Pink captain · the idea' },
  { id: 'aanya', name: 'Aanya', gender: 'f', hair: 'ponytail', color: '#ffd23d', skin: 1, height: 1.63, team: 0, loadout: ['rapid', 'standard'], role: 'Pink · fast runner' },
  { id: 'kabir', name: 'Kabir', gender: 'm', hair: 'spiky', color: '#27ae60', skin: 2, height: 1.79, team: 0, loadout: ['launcher', 'standard'], role: 'Pink · splash' },
  { id: 'tara', name: 'Tara', gender: 'f', hair: 'braids', color: '#e84393', skin: 3, height: 1.6, team: 0, loadout: ['burst', 'spread'], role: 'Pink · planner' },
  { id: 'rohan', name: 'Rohan', gender: 'm', hair: 'short', color: '#2e86de', skin: 1, height: 1.81, team: 1, loadout: ['precision', 'standard'], role: 'Cyan captain' },
  { id: 'ishaan', name: 'Ishaan', gender: 'm', hair: 'spiky', color: '#8e44ad', skin: 4, height: 1.72, team: 1, loadout: ['spread', 'rapid'], role: 'Cyan · close range' },
  { id: 'neha', name: 'Neha', gender: 'f', hair: 'bun', color: '#00b894', skin: 2, height: 1.65, team: 1, loadout: ['standard', 'burst'], role: 'Cyan · steady' },
  { id: 'arjun', name: 'Arjun', gender: 'm', hair: 'short', color: '#fdcb6e', skin: 5, height: 1.76, team: 1, loadout: ['rapid', 'launcher'], role: 'Cyan · rapid fire' },
  { id: 'sana', name: 'Sana', gender: 'f', hair: 'long', color: '#7cff4f', outfit: 'tracksuit', skin: 0, height: 1.66, team: null, role: 'Referee and host' },
  { id: 'vikram', name: 'Vikram', gender: 'm', hair: 'short', color: '#a29bfe', skin: 3, height: 1.75, team: null, role: 'Commentator and camera' },
];
export const CAST_BY_ID = Object.fromEntries(CAST.map((c) => [c.id, c]));
export const teamColour = (c) => (c.team == null ? '#f5f6fa' : TEAMS[c.team].colour);
export const SPEAKER_COLOUR = (id) => { const c = CAST_BY_ID[id]; return c ? (c.team == null ? (id === 'sana' ? '#7cff4f' : '#c9b8ff') : TEAMS[c.team].colour) : '#ffffff'; };

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// A walk along a polyline at a steady speed; the heading looks a little ahead so corners turn smoothly.
export class Walk {
  constructor(points) {
    this.p = points.map((q) => (q.isVector3 ? q.clone().setY(0) : V(q[0], 0, q[1])));
    this.len = [0];
    for (let i = 1; i < this.p.length; i++) this.len.push(this.len[i - 1] + this.p[i].distanceTo(this.p[i - 1]));
    this.total = this.len.at(-1);
  }

  at(s) {
    s = Math.max(0, Math.min(this.total, s));
    let i = 1;
    while (i < this.p.length - 1 && this.len[i] < s) i++;
    const f = (s - this.len[i - 1]) / Math.max(1e-6, this.len[i] - this.len[i - 1]);
    return this.p[i - 1].clone().lerp(this.p[i], f);
  }

  heading(s) {
    const a = this.at(Math.min(s, this.total - 0.6) - 0.6); const b = this.at(Math.min(s, this.total - 0.6) + 1.2);
    return Math.atan2(b.x - a.x, b.z - a.z);
  }
}

export function buildCast(scene) {
  return CAST.map((c, i) => {
    const n = new NPC(scene, { id: `film-${c.id}`, name: c.name, role: 'student', color: c.color, pants: '#2c3e50', gender: c.gender, hair: c.hair, outfit: c.outfit || 'casual', skinIndex: c.skin, height: c.height });
    n.tag.visible = false;
    n.group.visible = false;
    n.seed = i * 1.37;
    n.cast = c;
    n.restArms = n.arms.map((a) => a.rotation.z);
    if (c.team != null) {
      // chosen in Scene 3 and kept: the mask in the team colour, a team armband, the primary blaster
      n.filmMask = mask(n, teamColour(c));
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.07, 14, 1, true), new THREE.MeshStandardMaterial({ color: teamColour(c), roughness: 0.5, side: THREE.DoubleSide }));
      band.position.y = -0.12; n.arms[0].add(band); n.filmBand = band;
      n.filmBlaster = equip(n, c.loadout[0]);
    }
    if (c.id === 'sana') { // referee: a whistle on a lanyard
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.025), new THREE.MeshStandardMaterial({ color: '#f5f6fa', metalness: 0.6, roughness: 0.3 }));
      w.position.set(0, 1.22, 0.14); n.body.add(w);
    }
    // a phone for the group-chat scenes (in the right hand)
    const phone = new THREE.Group();
    phone.add(new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.15, 0.01), new THREE.MeshStandardMaterial({ color: '#1e272e', roughness: 0.3 })));
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.135), new THREE.MeshBasicMaterial({ color: '#7fd3ff' }));
    screen.position.z = 0.006; phone.add(screen);
    phone.position.set(0, -0.25, 0.05); phone.rotation.x = -Math.PI / 2 + 0.3; phone.visible = false;
    n.elbows[1].add(phone); n.filmPhone = phone;
    // paint on clothes (shown after a tag, and on everyone after the match)
    n.filmPaint = [];
    [[0.05, 1.2, 0.16, 0], [-0.08, 1.05, 0.15, 0.4], [0.1, 1.32, -0.15, Math.PI]].forEach(([x, y, z, ry], k) => {
      const s = splat(['#30d5ff', '#ff3d7f', '#ffd23d'][(i + k) % 3], i * 7 + k + 1, 0.075);
      s.position.set(x, y, z); s.rotation.y = ry; s.visible = false; n.body.add(s); n.filmPaint.push(s);
    });
    return n;
  });
}

// Gear shown on an actor in a shot: masks, blasters, armbands (from Scene 3 on), phones.
export function gear(n, { masks = false, blaster = false, band = false, phone = false, paint = 0 } = {}) {
  if (n.filmMask) n.filmMask.visible = masks;
  if (n.filmBlaster) n.filmBlaster.visible = blaster;
  if (n.filmBand) n.filmBand.visible = band;
  n.filmPhone.visible = phone;
  n.filmPaint.forEach((s, k) => { s.visible = k < paint; });
}

const yawTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
const clamp01 = (x) => Math.min(1, Math.max(0, x));

// Poses an actor at shot time t from a spec. Pure function of t (the leg cycle comes from the distance walked), so
// seeking the film gives the same frame as playing up to it.
//   spec: { at: [x, z] | path: [[x, z], ...], speed, delay, gait: 'walk' | 'run', yaw | face: [x, z] | actor,
//           act: (t) => 'aim' | 'cheer' | ... (or 'a+b'), y }
export function pose(film, n, spec, t) {
  n.group.visible = true;
  let p; let yaw; let moving = false; let dist = 0;
  const speed = spec.speed ?? (spec.gait === 'run' ? 5.2 : 1.45);
  if (spec.path) {
    spec.walk ||= new Walk(spec.path);
    const w = spec.walk;
    const s = Math.max(0, Math.min(w.total, speed * (t - (spec.delay || 0))));
    p = w.at(s); dist = s;
    moving = t > (spec.delay || 0) && s < w.total - 0.01;
    yaw = moving || spec.yaw == null && !spec.face ? w.heading(s) : null;
  } else p = V(spec.at[0], 0, spec.at[1]);
  if (yaw == null) {
    const f = typeof spec.face === 'function' ? spec.face(t) : spec.face;
    if (f) yaw = yawTo(p, f.isVector3 ? f : f.group ? f.pos : V(f[0], 0, f[1]));
    else yaw = spec.yaw ?? 0;
  }
  const fa = film.floorAt;
  const y = (spec.y ?? 0) + (fa ? fa(p.x, p.z, 0.2) : 0);
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
  const act = typeof spec.act === 'function' ? spec.act(t, moving) : spec.act;
  for (const a of (act || '').split('+').filter(Boolean)) gesture(n, a, t, moving);
  if (spec.talk && spec.talk.some(([a, b]) => t >= a && t < b)) talk(n, t);
  n.group.updateMatrixWorld(true);
  return n;
}

function talk(n, t) {
  const open = Math.abs(Math.sin(t * 11 + n.seed)) * (0.6 + 0.4 * Math.sin(t * 3.1));
  n.mouth.scale.set(1, 1 + 2.6 * Math.max(0, open), 1);
  n.lowerLip.position.y = -0.057 - Math.max(0, open) * 0.006;
  n.head.rotation.x = Math.sin(t * 2.3 + n.seed) * 0.05;
}

// Arm and body gestures over the walking/standing pose.
export function gesture(n, a, t, moving) {
  const A = n.arms; const E = n.elbows;
  const k = Math.sin(t * 9 + n.seed);
  switch (a) {
    case 'aim': poseAim(n, 0.02); break;
    case 'aimUp': poseAim(n, 0.12); break;
    case 'carry': // blaster held across the chest, ready
      A[1].rotation.x = -0.75; A[1].rotation.z = 0.25; E[1].rotation.x = -0.9;
      A[0].rotation.x = -0.7; A[0].rotation.z = -0.1; E[0].rotation.x = -1.2; break;
    case 'cheer': // both arms up, pumping
      A[0].rotation.x = -2.9 + k * 0.15; A[1].rotation.x = -2.9 - k * 0.15; A[0].rotation.z = -0.3; A[1].rotation.z = 0.3;
      E[0].rotation.x = -0.25; E[1].rotation.x = -0.25; break;
    case 'fist': // one fist up
      A[1].rotation.x = -2.7 + k * 0.2; A[1].rotation.z = 0.2; E[1].rotation.x = -0.9; break;
    case 'jump': { const j = Math.max(0, Math.sin(t * 6.5 + n.seed)); n.pos.y += j * 0.38; n.knees[0].rotation.x = n.knees[1].rotation.x = (1 - j) * 0.5; n.legs[0].rotation.x = n.legs[1].rotation.x = -(1 - j) * 0.25; n.feet(false); break; }
    case 'wave': A[1].rotation.x = -2.6; A[1].rotation.z = 0.35 + Math.sin(t * 8) * 0.35; E[1].rotation.x = -0.4; break;
    case 'point': A[1].rotation.x = -1.5; A[1].rotation.z = 0.05; E[1].rotation.x = -0.05; break;
    case 'phone': A[1].rotation.x = -0.95; A[1].rotation.z = 0.25; E[1].rotation.x = -1.35; n.head.rotation.x = 0.32; break;
    case 'photo': // phone held up in both hands, filming
      A[1].rotation.x = -1.55; A[1].rotation.z = 0.25; E[1].rotation.x = -0.55; A[0].rotation.x = -1.55; A[0].rotation.z = -0.25; E[0].rotation.x = -0.55; break;
    case 'handsup': // tagged: hands up, walking off (round elimination)
      A[0].rotation.x = -2.95; A[1].rotation.x = -2.95; A[0].rotation.z = -0.12; A[1].rotation.z = 0.12; E[0].rotation.x = -0.1; E[1].rotation.x = -0.1; break;
    case 'highfive': A[1].rotation.x = -2.7; A[1].rotation.z = -0.35; E[1].rotation.x = -0.2; break;
    case 'handsin': // the huddle: right hands into the middle
      A[1].rotation.x = -1.25; A[1].rotation.z = -0.25; E[1].rotation.x = -0.15; n.lean(0.18); break;
    case 'clap': { const c = Math.abs(Math.sin(t * 7 + n.seed)); A[0].rotation.x = -1.2; A[1].rotation.x = -1.2; A[0].rotation.z = -0.55 + c * 0.35; A[1].rotation.z = 0.55 - c * 0.35; E[0].rotation.x = -0.9; E[1].rotation.x = -0.9; break; }
    case 'crouch': {
      // knees bent behind a bunker; the body stays upright
      const d = 0.5;
      n.legs[0].rotation.x = -1.05; n.legs[1].rotation.x = -0.55; n.knees[0].rotation.x = 1.45; n.knees[1].rotation.x = 1.6;
      n.feet(false); n.pos.y -= d * n.scale * 0.62; n.lean(0.12); break;
    }
    case 'arms': A[0].rotation.x = -0.45; A[1].rotation.x = -0.45; A[0].rotation.z = -0.5; A[1].rotation.z = 0.5; E[0].rotation.x = -1.4; E[1].rotation.x = -1.4; break; // hands on hips-ish
    case 'talk': talk(n, t); break;
    case 'nod': n.head.rotation.x = Math.max(0, Math.sin(t * 5)) * 0.2; break;
    case 'lookup': n.head.rotation.x = -0.25; break;
    default: break;
  }
}

export { yawTo, clamp01 };
