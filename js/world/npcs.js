import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeLabel } from './labels.js';
import { mat } from './campus.js';
import { LOOKS } from '../../data/people.js';

// How far the cycle and its rider sit above the ground, so the tyres rest on top of the roads (5 cm up).
export const RIDE_LIFT = 0.075;

export function studentHeight(classNum) {
  return 1.12 + (classNum - 1) * 0.05;
}

// Faces and shirt trims are only drawn near the camera; beyond this they are a pixel or two and only cost draws.
const DETAIL_RANGE = 16;
let viewer = null;
export function setDetailViewer(position) {
  viewer = position;
}

const SKINS = ['#c68c5a', '#a8724a', '#d9a273', '#8d5a3a', '#b98055', '#e0b088'];
const HAIR = '#16110d';

// A limb as a lathe: rounded ends, `top` radius at the joint it hangs from, `bot` at the far end, and an
// optional `bulge` (a calf or a forearm muscle) a third of the way down. Centred like the capsules it replaced.
function limb(top, bot, len, bulge = 0) {
  const pts = [];
  const half = len / 2;
  for (let i = 0; i <= 4; i++) { const a = (i / 4) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.sin(a) * bot, -half - Math.cos(a) * bot)); }
  for (let i = 1; i < 8; i++) {
    const t = i / 8; // 0 at the bottom, 1 at the top
    pts.push(new THREE.Vector2(THREE.MathUtils.lerp(bot, top, t) + bulge * Math.sin(Math.PI * Math.min(1, t * 1.4)), -half + len * t));
  }
  for (let i = 4; i >= 0; i--) { const a = (i / 4) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.sin(a) * top, half + Math.cos(a) * top)); }
  return new THREE.LatheGeometry(pts, 12);
}

// Torso as a lathe through [radius, height] pairs (height from the torso centre): a waist, a chest, shoulders
// rolling in to the neck. Scaled flat front-to-back on the mesh. frontZ() says where the shirt front is at a height,
// so ties, badges and prints sit on it.
const TORSO = {
  m: [[0, -0.27], [0.148, -0.262], [0.152, -0.17], [0.146, -0.07], [0.155, 0.03], [0.166, 0.12], [0.163, 0.19], [0.14, 0.245], [0.094, 0.272], [0.052, 0.284], [0, 0.286]],
  f: [[0, -0.27], [0.15, -0.262], [0.146, -0.17], [0.132, -0.06], [0.148, 0.04], [0.16, 0.11], [0.152, 0.19], [0.13, 0.243], [0.088, 0.27], [0.05, 0.282], [0, 0.284]],
};
const TORSO_Y = 1.2;
const TORSO_DEPTH = 0.7;
function frontZ(kind, y) {
  const p = TORSO[kind];
  const h = y - TORSO_Y;
  for (let i = 1; i < p.length; i++) {
    if (h <= p[i][1]) { const t = (h - p[i - 1][1]) / (p[i][1] - p[i - 1][1]); return THREE.MathUtils.lerp(p[i - 1][0], p[i][0], THREE.MathUtils.clamp(t, 0, 1)) * TORSO_DEPTH + 0.004; }
  }
  return 0;
}

// A relaxed mitten hand: a flat palm, the fingers together and slightly curled, the thumb forward.
function handGeometry() {
  const palm = new THREE.SphereGeometry(0.048, 12, 10).scale(0.5, 1.0, 0.86).translate(0, -0.245, 0);
  const fingers = new THREE.CapsuleGeometry(0.026, 0.05, 4, 8).scale(0.62, 1, 1.25).rotateX(0.28).translate(0, -0.305, 0.008);
  const thumb = new THREE.CapsuleGeometry(0.014, 0.04, 4, 6).rotateX(0.55).translate(0, -0.248, 0.045);
  return mergeGeometries([palm, fingers, thumb].map((g) => g.toNonIndexed()));
}

// A shoe around the ankle pivot (the ankle sits 0.40 below the knee): a rounded upper and a flat sole.
function shoeGeometry() {
  const upper = new THREE.SphereGeometry(0.06, 14, 10).scale(0.95, 0.7, 2.15).translate(0, -0.039, 0.05);
  const heel = new THREE.CylinderGeometry(0.05, 0.055, 0.06, 10).translate(0, -0.035, -0.03);
  return mergeGeometries([upper, heel].map((g) => g.toNonIndexed()));
}

// Nose: a narrow bridge running into a rounded tip with two small wings.
function noseGeometry() {
  const bridge = new THREE.CapsuleGeometry(0.011, 0.03, 4, 6).rotateX(-0.35).translate(0, 0.004, -0.004);
  const tip = new THREE.SphereGeometry(0.0145, 10, 8).scale(1, 0.85, 0.95).translate(0, -0.021, 0.004);
  const wingL = new THREE.SphereGeometry(0.0085, 8, 6).translate(-0.012, -0.025, -0.005);
  const wingR = new THREE.SphereGeometry(0.0085, 8, 6).translate(0.012, -0.025, -0.005);
  return mergeGeometries([bridge, tip, wingL, wingR].map((g) => g.toNonIndexed()));
}

// Head: a sphere narrowed through the cheeks into a jaw, with the chin brought forward, as one smooth surface.
function headGeometry(narrow, lower = false) {
  // `lower`: only the front of the jaw, from the cheekbones down (a beard)
  const g = lower ? new THREE.SphereGeometry(0.12, 24, 10, 0, Math.PI, Math.PI * 0.56, Math.PI * 0.44) : new THREE.SphereGeometry(0.12, 28, 20);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = THREE.MathUtils.smoothstep(-p.getY(i) / 0.12, -0.1, 0.95);
    p.setX(i, p.getX(i) * (1 - narrow * t));
    p.setZ(i, p.getZ(i) + Math.max(0, p.getZ(i)) * 0.07 * t);
  }
  g.computeVertexNormals();
  return g;
}

// Shared geometries (built once; every character reuses them).
const G = {
  thigh: limb(0.084, 0.064, 0.32),
  shin: limb(0.062, 0.046, 0.32, 0.01),
  shoe: shoeGeometry(),
  sole: new THREE.BoxGeometry(0.108, 0.022, 0.25).translate(0, -0.069, 0.035),
  torsoM: new THREE.LatheGeometry(TORSO.m.map(([r, y]) => new THREE.Vector2(r, y)), 20),
  torsoF: new THREE.LatheGeometry(TORSO.f.map(([r, y]) => new THREE.Vector2(r, y)), 20),
  pelvis: new THREE.CapsuleGeometry(0.15, 0.06, 4, 12),
  deltoid: new THREE.SphereGeometry(0.062, 12, 8),
  upperArm: limb(0.056, 0.045, 0.22),
  forearm: limb(0.045, 0.035, 0.18, 0.006),
  cuff: new THREE.CylinderGeometry(0.06, 0.06, 0.035, 12, 1, true),
  hand: handGeometry(),
  neck: new THREE.CylinderGeometry(0.05, 0.056, 0.1, 12),
  collar: new THREE.TorusGeometry(0.06, 0.013, 6, 18),
  collarFlap: new THREE.CircleGeometry(0.036, 3).rotateZ(-Math.PI / 2),
  placket: new THREE.BoxGeometry(0.014, 0.3, 0.004),
  button: new THREE.CylinderGeometry(0.006, 0.006, 0.004, 8),
  headM: headGeometry(0.2),
  headF: headGeometry(0.26),
  beard: headGeometry(0.2, true),
  eye: new THREE.SphereGeometry(0.021, 12, 10),
  iris: new THREE.CircleGeometry(0.0115, 14),
  pupil: new THREE.CircleGeometry(0.0055, 10),
  glint: new THREE.CircleGeometry(0.0028, 6),
  lid: new THREE.SphereGeometry(0.0222, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.36),
  brow: new THREE.CapsuleGeometry(0.0065, 0.036, 3, 6).rotateZ(Math.PI / 2),
  nose: noseGeometry(),
  mouth: new THREE.BoxGeometry(0.044, 0.005, 0.006),
  lip: new THREE.CapsuleGeometry(0.0065, 0.034, 3, 8).rotateZ(Math.PI / 2),
  ear: new THREE.SphereGeometry(0.026, 10, 8),
  hairCap: new THREE.SphereGeometry(0.129, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5),
  hairBack: new THREE.SphereGeometry(0.127, 16, 10, Math.PI, Math.PI, Math.PI * 0.2, Math.PI * 0.55),
  quiff: new THREE.SphereGeometry(0.075, 14, 10),
  lock: new THREE.CapsuleGeometry(0.03, 0.17, 4, 8),
  ponytail: new THREE.CapsuleGeometry(0.035, 0.16, 4, 8),
  braid: new THREE.CapsuleGeometry(0.024, 0.26, 4, 6),
  bun: new THREE.SphereGeometry(0.055, 12, 10),
  spike: new THREE.ConeGeometry(0.03, 0.07, 5),
  belt: new THREE.CylinderGeometry(0.165, 0.165, 0.04, 16),
  tie: new THREE.BoxGeometry(0.045, 0.24, 0.012),
  card: new THREE.BoxGeometry(0.06, 0.08, 0.008),
  bag: new THREE.BoxGeometry(0.28, 0.34, 0.13),
  strap: new THREE.BoxGeometry(0.035, 0.32, 0.02),
  skirt: new THREE.CylinderGeometry(0.17, 0.26, 0.3, 16, 1, true),
  sareeSkirt: new THREE.CylinderGeometry(0.17, 0.27, 0.86, 18, 1, true),
  tunic: new THREE.CylinderGeometry(0.17, 0.24, 0.42, 16, 1, true),
  coat: new THREE.CylinderGeometry(0.18, 0.25, 0.62, 16, 1, true),
  pallu: new THREE.BoxGeometry(0.09, 0.46, 0.018),
  cap: new THREE.CylinderGeometry(0.13, 0.13, 0.06, 16),
  visor: new THREE.BoxGeometry(0.16, 0.012, 0.08),
  lens: new THREE.TorusGeometry(0.022, 0.004, 6, 14),
  mustache: new THREE.BoxGeometry(0.06, 0.012, 0.01),
  blob: new THREE.CircleGeometry(0.42, 20),
};

let blobMaterial;
function blobMat() {
  if (!blobMaterial) {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    grd.addColorStop(0, 'rgba(0,0,0,0.45)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    blobMaterial = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false });
  }
  return blobMaterial;
}

// Cloth: a fine woven bump (a canvas texture, shared) so shirts and trousers read as fabric up close.
// Skin: a soft sheen at grazing angles, the warm rim real skin gets in sunlight.
let weave;
function weaveTexture() {
  if (!weave) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    let r = 11;
    const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
    for (let y = 0; y < 128; y += 2) for (let x = 0; x < 128; x += 2) {
      const v = 120 + ((x + y) % 4 ? 22 : -22) + rnd() * 26;
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(x, y, 2, 2);
    }
    weave = new THREE.CanvasTexture(c);
    weave.wrapS = weave.wrapT = THREE.RepeatWrapping;
    weave.repeat.set(5, 5);
  }
  return weave;
}
const cloths = new Map();
const cloth = (color) => {
  if (!cloths.has(color)) cloths.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.92, bumpMap: weaveTexture(), bumpScale: 0.9 }));
  return cloths.get(color);
};
const skins = new Map();
const skin = (color) => {
  if (!skins.has(color)) skins.set(color, new THREE.MeshPhysicalMaterial({ color, roughness: 0.6, sheen: 0.5, sheenColor: new THREE.Color('#ffc9ad'), sheenRoughness: 0.5 }));
  return skins.get(color);
};
// Hair: fine strands running from the crown (the v direction of the sphere caps), a little glossier than cloth.
let strands;
function strandTexture() {
  if (!strands) {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 32;
    const g = c.getContext('2d');
    let r = 7;
    const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
    for (let x = 0; x < 128; x++) {
      const v = 90 + rnd() * 120;
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(x, 0, 1, 32);
    }
    strands = new THREE.CanvasTexture(c);
    strands.wrapS = strands.wrapT = THREE.RepeatWrapping;
    strands.repeat.set(3, 1);
  }
  return strands;
}
const hairs = new Map();
const hairMaterial = (color) => {
  if (!hairs.has(color)) hairs.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.5, bumpMap: strandTexture(), bumpScale: 1.2 }));
  return hairs.get(color);
};
const sideMat = (color) => {
  const m = cloth(color).clone();
  m.side = THREE.DoubleSide;
  return m;
};

function lookFor(name, role) {
  const first = name.split(' (')[0];
  const look = LOOKS[name] || LOOKS[first] || LOOKS[first.split(' ')[0]] || {};
  const titled = /^(Mrs\.|Ms\.)/.test(name) ? 'f' : /^Mr\./.test(name) ? 'm' : null;
  return {
    gender: look.gender || titled || 'm',
    hair: look.hair || 'short',
    outfit: look.outfit || (role === 'student' ? 'uniform' : 'formal'),
    glasses: !!look.glasses,
    mustache: !!look.mustache,
  };
}

export class NPC {
  constructor(scene, { id, name, color = '#ffffff', pants = '#1f2a44', role = 'student', height = 1.2, skinIndex = 0, title = null, gender, hair, outfit }) {
    this.id = id;
    this.name = name;
    this.role = role;
    this.scene = scene;
    this.group = new THREE.Group();
    this.pos = this.group.position;
    this.path = [];
    this.speed = role === 'student' ? 2.4 : 1.9;
    this.sitOnArrive = false;
    this.faceOnArrive = null;
    this.phase = Math.random() * 6;
    this.breath = Math.random() * 6;
    this.chase = null;
    this.singing = false;
    this.singT = 0;
    this.headYaw = 0;
    this.lookTarget = null;
    this.baseY = 0;

    const look = lookFor(name, role);
    if (gender) look.gender = gender;
    if (hair) look.hair = hair;
    if (outfit) look.outfit = outfit;
    this.look = look;
    const female = look.gender === 'f';
    const skinMat = skin(SKINS[skinIndex % SKINS.length]);
    const isStudent = look.outfit === 'uniform';
    const casual = look.outfit === 'casual';
    const hash = [...name].reduce((a, ch) => a + ch.charCodeAt(0), 0);
    const hoodie = casual && hash % 3 === 0;
    const kurtaTop = casual && female && hash % 2 === 1 && !hoodie;
    const shirtColor = isStudent ? (role === 'student' && color === '#ffffff' ? '#f7f7f2' : '#f4f6f8') : look.outfit === 'guard' ? '#b49a63' : look.outfit === 'tracksuit' ? color : look.outfit === 'labcoat' ? '#f4f4f4' : color;
    const pantsColor = look.outfit === 'guard' ? '#9c8455' : look.outfit === 'kurta' ? '#efe7d8' : look.outfit === 'tracksuit' ? '#1f2a52' : casual ? ['#3b5a86', '#2f4a72', '#26282e', '#4a6a96'][hash % 4] : pants;
    const shirt = cloth(shirtColor);
    const trouser = cloth(pantsColor);
    const accent = isStudent ? color : '#8b1e2d';
    const cast = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

    // Legs (hip → knee → ankle → shoe), +z is the character's front.
    this.legs = [];
    this.knees = [];
    this.ankles = [];
    const skirtStyle = isStudent && female;
    const sporty = look.outfit === 'tracksuit' || casual;
    const shoeMat = mat(look.outfit === 'tracksuit' ? '#f2f2f2' : casual ? ['#f2f2f2', '#d8392b', '#2b2b2b', '#e8e2d0'][hash % 4] : '#111111', { roughness: sporty ? 0.7 : 0.35 });
    const soleMat = mat(sporty ? '#f4f1ea' : '#2a1c14', { roughness: 0.8 });
    for (const side of [-1, 1]) {
      const hip = new THREE.Group();
      hip.position.set(side * 0.095, 0.9, 0);
      const thigh = cast(new THREE.Mesh(G.thigh, skirtStyle ? skinMat : trouser));
      thigh.position.y = -0.2;
      hip.add(thigh);
      const knee = new THREE.Group();
      knee.position.y = -0.42;
      const shin = cast(new THREE.Mesh(G.shin, skirtStyle ? cloth('#fafafa') : trouser));
      shin.position.y = -0.2;
      knee.add(shin);
      const ankle = new THREE.Group();
      ankle.position.y = -0.4;
      ankle.add(new THREE.Mesh(G.shoe, shoeMat));
      ankle.add(new THREE.Mesh(G.sole, soleMat));
      knee.add(ankle);
      hip.add(knee);
      this.group.add(hip);
      this.legs.push(hip);
      this.knees.push(knee);
      this.ankles.push(ankle);
    }

    // Torso, pelvis, belt
    this.body = new THREE.Group();
    this.group.add(this.body);
    const pelvis = cast(new THREE.Mesh(G.pelvis, skirtStyle ? cloth(pants) : trouser));
    pelvis.position.y = 0.93;
    pelvis.scale.set(1.05, 1, 0.72);
    this.body.add(pelvis);
    const kind = female ? 'f' : 'm';
    const front = (y, off = 0.006) => frontZ(kind, y) + off;
    const torso = cast(new THREE.Mesh(female ? G.torsoF : G.torsoM, shirt));
    torso.position.y = TORSO_Y;
    torso.scale.set(female ? 1.0 : 1.1, 1, TORSO_DEPTH);
    this.body.add(torso);
    this.torso = torso;
    const trim = new THREE.Group();
    this.body.add(trim);
    this.trim = trim;
    // Shirts get a collar; the ones without a tie show a button placket.
    const shirted = isStudent || look.outfit === 'guard' || look.outfit === 'formal';
    if (shirted || look.outfit === 'labcoat') {
      const collarMat = look.outfit === 'labcoat' ? cloth('#f4f4f4') : shirt;
      const ring = cast(new THREE.Mesh(G.collar, collarMat));
      ring.position.set(0, 1.482, 0.004);
      ring.rotation.x = Math.PI / 2 + 0.15;
      ring.scale.set(1.08, 0.95, 1);
      trim.add(ring);
      // the two collar points, lying on the slope of the chest either side of the neck
      for (const side of [-1, 1]) {
        const flap = new THREE.Mesh(G.collarFlap, sideMat(shirted ? shirtColor : '#f4f4f4'));
        flap.position.set(side * 0.03, 1.452, front(1.452, 0.004));
        flap.rotation.set(-0.95, 0, side * 0.35);
        trim.add(flap);
      }
    }
    const tieless = look.outfit === 'guard' || (look.outfit === 'formal' && female);
    if (tieless) {
      const placket = new THREE.Mesh(G.placket, cloth(new THREE.Color(shirtColor).offsetHSL(0, 0, -0.06).getStyle()));
      placket.position.set(0, 1.27, front(1.27, 0.0));
      placket.rotation.x = 0.06;
      trim.add(placket);
      const btn = mat('#e8e2d2', { roughness: 0.4 });
      for (const y of [1.17, 1.25, 1.33, 1.41]) {
        const b = new THREE.Mesh(G.button, btn);
        b.position.set(0, y, front(y, 0.003));
        b.rotation.x = Math.PI / 2;
        trim.add(b);
      }
    }
    if (look.outfit === 'guard') {
      for (const side of [-1, 1]) {
        const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.075, 0.008), cloth('#a68c57'));
        pocket.position.set(side * 0.075, 1.3, front(1.3, 0.001));
        trim.add(pocket);
      }
    }
    if (look.outfit !== 'saree' && look.outfit !== 'kurta' && !casual) {
      const belt = new THREE.Mesh(G.belt, mat('#1b1b1b', { roughness: 0.5 }));
      belt.position.y = 1.0;
      belt.scale.set(1.04, 1, 0.7);
      this.body.add(belt);
    }

    // Outfit details
    if (isStudent) {
      if (skirtStyle) {
        const skirt = cast(new THREE.Mesh(G.skirt, sideMat(pants)));
        skirt.position.y = 0.79;
        skirt.scale.set(1, 1, 0.8);
        this.body.add(skirt);
      }
      const tie = new THREE.Mesh(G.tie, cloth(accent));
      tie.position.set(0, 1.3, front(1.3));
      tie.scale.y = 1.12;
      tie.rotation.x = 0.06;
      this.body.add(tie);
      const knot = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.03, 0.02), cloth(accent));
      knot.position.set(0, 1.452, front(1.452, 0.01));
      knot.rotation.x = 0.3;
      trim.add(knot);
      const card = new THREE.Mesh(G.card, mat('#ffffff'));
      card.position.set(0.075, 1.18, front(1.18, 0.005));
      trim.add(card);
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.009), cloth('#1d4fa0'));
      band.position.set(0.075, 1.21, front(1.21, 0.007));
      trim.add(band);
      const bag = cast(new THREE.Mesh(G.bag, cloth(accent)));
      bag.position.set(0, 1.17, -0.17);
      this.body.add(bag);
      this.bag = bag;
      for (const sx of [-0.1, 0.1]) {
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.03, 0.2), cloth('#2a2a2a'));
        strap.position.set(sx, 1.35, -0.04);
        this.body.add(strap);
      }
    } else if (look.outfit === 'saree') {
      const skirt = cast(new THREE.Mesh(G.sareeSkirt, sideMat(color)));
      skirt.position.y = 0.48;
      skirt.scale.set(1, 1, 0.82);
      this.body.add(skirt);
      const border = new THREE.Mesh(new THREE.CylinderGeometry(0.272, 0.272, 0.05, 18, 1, true), sideMat('#d4a72c'));
      border.position.y = 0.07;
      border.scale.set(1, 1, 0.82);
      this.body.add(border);
      const pallu = cast(new THREE.Mesh(G.pallu, sideMat(color)));
      pallu.position.set(0.0, 1.2, front(1.2, 0.01));
      pallu.rotation.z = 0.7;
      this.body.add(pallu);
      const palluBack = cast(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.55, 0.02), sideMat(color)));
      palluBack.position.set(-0.1, 1.12, -0.12);
      this.body.add(palluBack);
      torso.material = cloth(new THREE.Color(color).offsetHSL(0.05, 0, -0.12).getStyle());
      this.legs.forEach((l) => { l.children[0].visible = false; });
      this.knees.forEach((k) => { k.children[0].visible = false; });
      this.longSkirt = true;
    } else if (look.outfit === 'kurta') {
      const tunic = cast(new THREE.Mesh(G.tunic, sideMat(color)));
      tunic.position.y = 0.86;
      tunic.scale.set(1, 1, 0.75);
      this.body.add(tunic);
      if (female) {
        const dupatta = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 6, 16, Math.PI), cloth(new THREE.Color(color).offsetHSL(0.5, 0, 0.1).getStyle()));
        dupatta.position.set(0, 1.33, 0.02);
        dupatta.rotation.set(Math.PI / 2 + 0.3, 0, Math.PI);
        this.body.add(dupatta);
      }
    } else if (look.outfit === 'labcoat') {
      // the coat is the white top itself, its skirt hanging from the waist to the knees
      const coat = cast(new THREE.Mesh(G.coat, sideMat('#f4f4f4')));
      coat.position.y = 0.76;
      coat.scale.set(1.05, 1, 0.78);
      this.body.add(coat);
      const inner = new THREE.Mesh(G.tie, cloth(color));
      inner.scale.set(1.6, 1, 1);
      inner.position.set(0, 1.25, front(1.25, 0.002));
      this.body.add(inner);
    } else if (look.outfit === 'formal' && look.gender === 'm') {
      const tie = new THREE.Mesh(G.tie, cloth('#2a3a6a'));
      tie.position.set(0, 1.3, front(1.3));
      tie.scale.y = 1.12;
      tie.rotation.x = 0.06;
      this.body.add(tie);
      const knot = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.03, 0.02), cloth('#2a3a6a'));
      knot.position.set(0, 1.452, front(1.452, 0.01));
      knot.rotation.x = 0.3;
      trim.add(knot);
    } else if (casual) {
      if (kurtaTop) {
        const tunic = cast(new THREE.Mesh(G.tunic, sideMat(color)));
        tunic.position.y = 0.88;
        tunic.scale.set(0.98, 0.85, 0.74);
        this.body.add(tunic);
      } else {
        // T-shirt hem over the jeans, and a chest print
        const hem = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.168, 0.172, 0.08, 16), shirt));
        hem.position.y = 1.0;
        hem.scale.set(1.05, 1, 0.72);
        this.body.add(hem);
        const print = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.01), cloth(new THREE.Color(color).offsetHSL(0.45, 0.1, hash % 2 ? 0.25 : -0.2).getStyle()));
        print.position.set(0, 1.25, front(1.25, 0.004));
        this.body.add(print);
      }
      if (hoodie) {
        const hood = cast(new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), sideMat(color)));
        hood.position.set(0, 1.4, -0.09);
        hood.rotation.x = -1.2;
        hood.scale.set(1.1, 0.9, 0.8);
        this.body.add(hood);
        for (const sx of [-0.04, 0.04]) {
          const cord = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.1, 0.008), mat('#f2f2f2'));
          cord.position.set(sx, 1.3, front(1.3, 0.006));
          this.body.add(cord);
        }
      }
      const bag = cast(new THREE.Mesh(G.bag, cloth(['#2a2a2a', '#3a4f7a', '#7a3a3a', '#3a6a4a'][hash % 4])));
      bag.position.set(0, 1.17, -0.17);
      this.body.add(bag);
      this.bag = bag;
      for (const sx of [-0.1, 0.1]) {
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.03, 0.2), cloth('#1f1f1f'));
        strap.position.set(sx, 1.35, -0.04);
        this.body.add(strap);
      }
    } else if (look.outfit === 'tracksuit') {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.012), mat('#ffffff'));
      stripe.position.set(0, 1.2, front(1.2, 0.006));
      this.body.add(stripe);
      const whistle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.05), mat('#c9c9c9', { metalness: 0.8, roughness: 0.3 }));
      whistle.position.set(0.03, 1.12, front(1.12, 0.022));
      this.body.add(whistle);
    }

    // Arms (shoulder → elbow → hand)
    this.arms = [];
    this.elbows = [];
    const sleeve = look.outfit === 'saree' ? torso.material : shirt;
    const longSleeves = (['labcoat', 'tracksuit', 'formal', 'kurta'].includes(look.outfit) && !(look.outfit === 'formal' && female)) || hoodie || kurtaTop;
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.215, 1.38, 0);
      // a rounded shoulder cap fills the gap between the torso and the arm
      const deltoid = new THREE.Mesh(G.deltoid, sleeve);
      deltoid.position.set(-side * 0.008, -0.012, 0);
      deltoid.scale.set(1, 0.95, 0.92);
      shoulder.add(deltoid);
      const upper = cast(new THREE.Mesh(G.upperArm, longSleeves ? sleeve : skinMat));
      upper.position.y = -0.14;
      shoulder.add(upper);
      if (!longSleeves) {
        // a short sleeve, open at the hem, over the top half of the arm
        const short = new THREE.Mesh(G.cuff, sleeve);
        short.scale.set(1.08, 3.4, 1.08);
        short.position.y = -0.07;
        shoulder.add(short);
      }
      const elbow = new THREE.Group();
      elbow.position.y = -0.29;
      const fore = cast(new THREE.Mesh(G.forearm, longSleeves ? sleeve : skinMat));
      fore.position.y = -0.12;
      elbow.add(fore);
      if (longSleeves) {
        const cuff = new THREE.Mesh(G.cuff, sleeve);
        cuff.scale.set(0.78, 1, 0.78);
        cuff.position.y = -0.2;
        elbow.add(cuff);
      }
      elbow.add(new THREE.Mesh(G.hand, skinMat));
      shoulder.add(elbow);
      shoulder.rotation.z = side * 0.06;
      this.body.add(shoulder);
      this.arms.push(shoulder);
      this.elbows.push(elbow);
    }

    // Neck and head
    const neck = new THREE.Mesh(G.neck, skinMat);
    neck.position.y = 1.47;
    this.body.add(neck);
    const head = new THREE.Group();
    head.position.y = 1.6;
    this.body.add(head);
    this.head = head;
    const skull = cast(new THREE.Mesh(female ? G.headF : G.headM, skinMat));
    skull.scale.set(0.95, 1.08, 1);
    head.add(skull);
    const face = new THREE.Group();
    head.add(face);
    this.face = face;
    // Eyes: white, a brown iris, the pupil and a catch-light, under a skin-coloured upper lid that also blinks.
    this.eyes = [];
    this.blinkIn = 1 + Math.random() * 3;
    for (const side of [-1, 1]) {
      const eye = new THREE.Group();
      eye.position.set(side * 0.042, 0.016, 0.1);
      face.add(eye);
      this.eyes.push(eye);
      const ball = new THREE.Mesh(G.eye, mat('#f3eee6', { roughness: 0.25 }));
      ball.scale.set(1, 0.82, 0.62);
      eye.add(ball);
      const iris = new THREE.Mesh(G.iris, mat('#3d2516', { roughness: 0.3 }));
      iris.position.z = 0.0131;
      eye.add(iris);
      const pupil = new THREE.Mesh(G.pupil, mat('#0b0705', { roughness: 0.2 }));
      pupil.position.z = 0.0133;
      eye.add(pupil);
      const glint = new THREE.Mesh(G.glint, mat('#ffffff', { emissive: '#ffffff' }));
      glint.position.set(0.0035, 0.0038, 0.0135);
      eye.add(glint);
      const lid = new THREE.Mesh(G.lid, skinMat);
      lid.scale.set(1.04, 0.9, 0.68);
      lid.rotation.x = -0.12;
      eye.add(lid);
      const brow = new THREE.Mesh(G.brow, mat(look.hair === 'grey' ? '#9a9a9a' : HAIR, { roughness: 0.9 }));
      brow.position.set(side * 0.044, 0.056, 0.104);
      brow.rotation.set(-0.25, side * 0.25, side * -0.1);
      brow.scale.set(1, female ? 0.75 : 1.1, 0.8);
      face.add(brow);
      const ear = new THREE.Mesh(G.ear, skinMat);
      ear.position.set(side * 0.114, 0, -0.004);
      ear.scale.set(0.55, 1, 0.8);
      head.add(ear);
      if (look.glasses) {
        const lens = new THREE.Mesh(G.lens, mat('#1a1a1a', { metalness: 0.6, roughness: 0.3 }));
        lens.position.set(side * 0.042, 0.016, 0.119);
        face.add(lens);
      }
    }
    if (look.glasses) {
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.004, 0.004), mat('#1a1a1a'));
      bridge.position.set(0, 0.02, 0.121);
      face.add(bridge);
    }
    const nose = new THREE.Mesh(G.nose, skinMat);
    nose.position.set(0, -0.004, 0.111);
    face.add(nose);
    // Mouth: a dark line between two lips a shade deeper than the skin.
    const lipMat = mat('#' + new THREE.Color(SKINS[skinIndex % SKINS.length]).lerp(new THREE.Color('#8a3a36'), 0.45).getHexString(), { roughness: 0.55 });
    this.mouth = new THREE.Mesh(G.mouth, mat('#3e1512', { roughness: 0.6 }));
    this.mouth.position.set(0, -0.052, 0.1135);
    face.add(this.mouth);
    const upperLip = new THREE.Mesh(G.lip, lipMat);
    upperLip.position.set(0, -0.0482, 0.1115);
    upperLip.scale.set(1, 0.5, 0.6);
    face.add(upperLip);
    this.lowerLip = new THREE.Mesh(G.lip, lipMat);
    this.lowerLip.position.set(0, -0.0565, 0.111);
    this.lowerLip.scale.set(0.85, female ? 0.75 : 0.62, 0.65);
    face.add(this.lowerLip);
    if (look.mustache) {
      const m = new THREE.Mesh(G.mustache, mat(look.hair === 'grey' ? '#8a8a8a' : HAIR));
      m.position.set(0, -0.04, 0.116);
      m.scale.set(1.1, 1.3, 1);
      face.add(m);
    }
    if (female && !isStudent) {
      const bindi = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), mat('#c0132a'));
      bindi.position.set(0, 0.045, 0.114);
      face.add(bindi);
    }
    this.buildHair(head, look);

    const blob = new THREE.Mesh(G.blob, blobMat());
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.015;
    this.group.add(blob);
    this.blob = blob;

    this.tag = makeLabel(title ? `${name} · ${title}` : name, { height: 0.28, bg: role === 'student' ? 'rgba(20,40,90,0.75)' : 'rgba(90,30,20,0.8)' });
    this.group.add(this.tag);
    this.setHeight(height);
    scene.add(this.group);
  }

  buildHair(head, look) {
    const hairMat = hairMaterial(look.hair === 'grey' ? '#8e8e8e' : HAIR);
    const add = (geo, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) => {
      const m = new THREE.Mesh(geo, hairMat);
      m.position.set(x, y, z);
      m.scale.set(sx, sy, sz);
      m.rotation.set(rx, 0, rz);
      m.castShadow = true;
      head.add(m);
      return m;
    };
    if (look.hair === 'turban') {
      const t = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), mat('#1f3a7a', { roughness: 0.9 }));
      t.position.set(0, 0.07, -0.01);
      t.scale.set(1, 0.85, 1.08);
      t.castShadow = true;
      head.add(t);
      const fold = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 6, 18), mat('#1a3270'));
      fold.position.set(0, 0.06, 0.02);
      fold.rotation.x = Math.PI / 2 - 0.35;
      head.add(fold);
      const beard = new THREE.Mesh(G.beard, hairMat);
      beard.scale.set(0.95 * 1.06, 1.08 * 1.05, 1.07);
      head.add(beard);
      return;
    }
    // The cap is tipped back so the hairline sits above the brows at the front and low at the nape.
    add(G.hairCap, 0, 0.01, -0.008, 1.05, 1.12, 1.08, -0.5);
    const tied = ['long', 'ponytail', 'braids', 'bun'].includes(look.hair);
    if (look.hair === 'short' || look.hair === 'grey') add(G.quiff, 0.018, 0.098, 0.03, 1.38, 0.52, 1.05, 0, -0.12); // a side-swept front
    if (look.hair === 'spiky') for (let i = 0; i < 7; i++) add(G.spike, Math.cos(i) * 0.05, 0.13, Math.sin(i) * 0.05 - 0.01, 1, 1, 1, -0.3);
    if (tied) {
      add(G.hairBack, 0, -0.01, -0.012, 1.04, 1.06, 1.04);
    }
    if (look.hair === 'long') {
      add(G.lock, 0, -0.12, -0.08, 3.4, 1.3, 1.4);
      for (const side of [-1, 1]) add(G.lock, side * 0.104, -0.07, 0.02, 0.9, 0.95, 0.75, 0, side * 0.08); // framing the face
    }
    if (look.hair === 'ponytail') add(G.ponytail, 0, -0.06, -0.15, 1, 1, 1, 0.5);
    if (look.hair === 'braids') {
      add(G.braid, -0.085, -0.17, -0.05, 1, 1, 1, 0.12);
      add(G.braid, 0.085, -0.17, -0.05, 1, 1, 1, 0.12);
      for (const sx of [-0.085, 0.085]) {
        const ribbon = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), mat('#d42a3a'));
        ribbon.position.set(sx, -0.32, -0.035);
        head.add(ribbon);
      }
    }
    if (look.hair === 'bun') add(G.bun, 0, 0.0, -0.14, 1.2, 1, 1);
  }

  setHeight(h) {
    this.height = h;
    const s = h / 1.72;
    this.scale = s;
    this.group.scale.setScalar(s);
    // Children have proportionally larger heads.
    this.head.scale.setScalar(1 + THREE.MathUtils.clamp((1.72 - h) * 0.45, 0, 0.28));
    this.tag.position.y = 1.98;
    const base = this.tag.userData.base || this.tag.scale.clone();
    this.tag.userData.base = base;
    this.tag.scale.set(base.x / s, base.y / s, 1);
  }

  teleport(p) {
    if (this.placeFilter) p = this.placeFilter(p);
    this.baseY = p.y || 0;
    this.pos.set(p.x, this.baseY, p.z);
    this.path = [];
    this.seated = false;
  }

  walkTo(points, { sit = false, face = null } = {}) {
    this.path = points;
    this.sitOnArrive = sit;
    this.faceOnArrive = face;
    this.seated = false;
  }

  update(dt, ball, playerPos = null) {
    let target = this.path[0];
    if (this.chase && ball) target = ball.pos;
    let walking = false;
    if (target) {
      const ty = this.chase ? 0 : target.y || 0;
      this.baseY += THREE.MathUtils.clamp(ty - this.baseY, -dt * 1.5, dt * 1.5);
      const dx = target.x - this.pos.x;
      const dz = target.z - this.pos.z;
      const dist = Math.hypot(dx, dz);
      this.moveSpeed = this.speed * (this.chase ? 1.3 : 1);
      const step = this.moveSpeed * dt;
      if (this.chase && dist < 0.55) {
        ball.kick(new THREE.Vector3(this.chase.x - this.pos.x, 0, (Math.random() - 0.5) * 6).normalize().multiplyScalar(5 + Math.random() * 3));
      } else if (dist <= step) {
        this.pos.x = target.x;
        this.pos.z = target.z;
        if (!this.chase) this.baseY = ty;
        if (!this.chase) this.path.shift();
        if (!this.path.length && !this.chase) {
          if (this.sitOnArrive) this.seated = true;
          if (this.faceOnArrive !== null) this.group.rotation.y = this.faceOnArrive;
        }
      } else {
        this.pos.x += (dx / dist) * step;
        this.pos.z += (dz / dist) * step;
        const want = Math.atan2(dx, dz);
        let diff = want - this.group.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        this.group.rotation.y += diff * Math.min(1, dt * 10);
        walking = true;
      }
    }
    // Turn the head towards the player when they are close and the character is standing still.
    let wantYaw = 0;
    if (playerPos && !walking && !this.singing) {
      const dx = playerPos.x - this.pos.x;
      const dz = playerPos.z - this.pos.z;
      if (dx * dx + dz * dz < 16) {
        let rel = Math.atan2(dx, dz) - this.group.rotation.y;
        rel = Math.atan2(Math.sin(rel), Math.cos(rel));
        wantYaw = THREE.MathUtils.clamp(rel, -1.0, 1.0);
      }
    }
    this.headYaw += (wantYaw - this.headYaw) * Math.min(1, dt * 5);
    this.animate(dt, walking, this.baseY);
  }

  animate(dt, walking, baseY = 0) {
    if (viewer) {
      const near = this.group.position.distanceToSquared(viewer) < DETAIL_RANGE * DETAIL_RANGE;
      if (near !== this.detailed) {
        this.detailed = near;
        this.face.visible = near;
        this.trim.visible = near;
      }
    }
    if (this.gait === 'ride' || this.gait === 'bikeIdle') return this.animateRide(dt, baseY);
    const running = walking && this.gait === 'run';
    // legs keep pace with the ground: one cycle (two steps) covers ~1.9 m walking, ~2.9 m running, for a 1.72 m adult
    const v = this.moveSpeed ?? (running ? 4.5 : this.speed ?? 1.4);
    const stride = (running ? 2.9 : 1.9) * this.scale;
    this.phase += dt * (walking ? (this.chase ? 12 : (2 * Math.PI * v) / stride) : 1.5);
    this.breath += dt * 2.2;
    const s = Math.sin(this.phase);
    const swing = walking ? s * (this.longSkirt ? 0.3 : running ? 0.95 : 0.55) : 0;
    this.legs[0].rotation.x = swing;
    this.legs[1].rotation.x = -swing;
    this.knees[0].rotation.x = walking ? Math.max(0, -Math.sin(this.phase - 0.6)) * 0.9 : 0;
    this.knees[1].rotation.x = walking ? Math.max(0, Math.sin(this.phase - 0.6)) * 0.9 : 0;
    const attention = this.singing;
    this.arms[0].rotation.x = walking ? -swing * 0.8 : attention ? 0 : Math.sin(this.breath * 0.5) * 0.03;
    this.arms[1].rotation.x = walking ? swing * 0.8 : attention ? 0 : -Math.sin(this.breath * 0.5) * 0.03;
    this.elbows[0].rotation.x = running ? -1.25 : walking ? -0.25 - Math.max(0, swing) * 0.4 : -0.08;
    this.elbows[1].rotation.x = running ? -1.25 : walking ? -0.25 - Math.max(0, -swing) * 0.4 : -0.08;
    if (running) {
      this.knees[0].rotation.x *= 1.6;
      this.knees[1].rotation.x *= 1.6;
    }
    this.torso.scale.y = 1 + Math.sin(this.breath) * 0.012;
    this.lean(running ? 0.16 : 0, walking ? Math.abs(Math.cos(this.phase)) * (running ? 0.08 : 0.03) : 0);
    this.pos.y = baseY + (this.seated ? -0.36 * this.scale : 0);
    this.blob.visible = !this.seated;
    if (this.bag) this.bag.visible = !this.seated; // a bag on the back would go through the bench or chair
    if (this.seated) {
      this.legs[0].rotation.x = -1.5;
      this.legs[1].rotation.x = -1.5;
      this.knees[0].rotation.x = 1.5;
      this.knees[1].rotation.x = 1.5;
      this.arms[0].rotation.x = -0.55;
      this.arms[1].rotation.x = -0.55;
      this.elbows[0].rotation.x = -0.9;
      this.elbows[1].rotation.x = -0.9;
    }
    // The upper body counter-twists against the stride and rolls a little over the standing leg; standing,
    // the weight drifts slowly from foot to foot. The head turns back so the gaze stays steady.
    const twist = walking && !this.seated ? -swing * (running ? 0.16 : 0.12) : 0;
    this.body.rotation.y = twist;
    this.body.rotation.z = this.seated ? 0 : walking ? Math.cos(this.phase) * 0.025 : Math.sin(this.breath * 0.23) * 0.012;
    this.feet(walking);
    if (this.singing) {
      this.singT += dt * 7;
      const open = Math.abs(Math.sin(this.singT));
      this.mouth.scale.set(1, 1 + 3.2 * open, 1);
      this.lowerLip.position.y = -0.057 - open * 0.007;
      this.head.rotation.x = Math.sin(this.singT * 0.25) * 0.05;
    } else {
      this.mouth.scale.set(1, 1, 1);
      this.lowerLip.position.y = -0.057;
      this.head.rotation.x = 0;
    }
    this.head.rotation.y = this.headYaw - twist * 0.8;
    this.blink(dt);
  }

  // Feet stay level with the ground whatever the hip and knee are doing, then roll heel-to-toe in the stride.
  feet(walking, keep = 1) {
    for (const i of [0, 1]) {
      const leg = this.legs[i].rotation.x;
      this.ankles[i].rotation.x = -(leg + this.knees[i].rotation.x) * keep + (walking ? leg * 0.4 : 0);
    }
  }

  // A blink every few seconds: the eyes close for a tenth of a second.
  blink(dt) {
    this.blinkIn -= dt;
    if (this.blinkIn < -0.11) this.blinkIn = 2 + Math.random() * 4;
    const y = this.blinkIn < 0 ? 0.12 : 1;
    this.eyes[0].scale.y = y;
    this.eyes[1].scale.y = y;
  }

  // Tilt the upper body forward around the hips (the legs hang from the root, not from the body).
  lean(a, lift = 0) {
    this.body.rotation.x = a;
    this.body.position.set(0, 0.9 * (1 - Math.cos(a)) + lift, -0.9 * Math.sin(a));
  }

  // Sitting on the cycle: hands on the handlebar, legs pedalling in step with the wheels.
  animateRide(dt, baseY) {
    const pedalling = this.gait === 'ride';
    if (pedalling) this.phase += dt * this.rideSpeed / 0.85; // the cranks turn with the wheels (about 2.5 wheel turns per crank turn)
    this.blob.visible = false;
    this.pos.y = baseY + 0.91 - 0.9 * this.scale + RIDE_LIFT; // hips on the saddle
    this.lean(0.32);
    this.torso.scale.y = 1;
    for (const i of [0, 1]) {
      const p = this.phase + i * Math.PI;
      this.legs[i].rotation.x = -1.05 + Math.sin(p) * 0.42;
      this.knees[i].rotation.x = 1.2 + Math.cos(p) * 0.45;
      this.arms[i].rotation.x = -1.05;
      this.elbows[i].rotation.x = -0.35;
    }
    this.body.rotation.y = 0;
    this.body.rotation.z = 0;
    this.feet(false, 0.7);
    this.mouth.scale.set(1, 1, 1);
    this.lowerLip.position.y = -0.057;
    this.head.rotation.x = -0.25;
    this.head.rotation.y = 0;
    this.blink(dt);
  }

  // Drive this model from the player (third-person avatar).
  poseAs(pos, yaw, walking, seated, dt, gait = 'walk', speed = 0) {
    this.pos.x = pos.x;
    this.pos.z = pos.z;
    this.group.rotation.y = yaw + Math.PI;
    this.seated = !!seated;
    this.gait = gait;
    this.rideSpeed = speed;
    this.moveSpeed = speed;
    this.animate(dt, walking, pos.y);
  }

  dispose() {
    this.scene.remove(this.group);
  }
}

export class NPCManager {
  constructor(scene, campus) {
    this.scene = scene;
    this.campus = campus;
    this.npcs = new Map();
    this.playerPos = null;
  }

  setPlayerPos(p) {
    this.playerPos = p;
  }

  add(id, opts) {
    if (this.npcs.has(id)) return this.npcs.get(id);
    const npc = new NPC(this.scene, { id, ...opts });
    // On a campus that knows where people can stand (the BITS world), never place anyone inside a wall or tree.
    npc.placeFilter = (p) => (this.campus?.freeSpot ? this.campus.freeSpot(p) : p);
    this.npcs.set(id, npc);
    return npc;
  }

  get(id) {
    return this.npcs.get(id);
  }

  remove(id) {
    const n = this.npcs.get(id);
    if (n) n.dispose();
    this.npcs.delete(id);
  }

  clear() {
    for (const id of [...this.npcs.keys()]) this.remove(id);
  }

  send(id, roomId, point, opts = {}) {
    const n = this.npcs.get(id);
    if (!n || !point) return;
    n.chase = null;
    n.walkTo(this.campus.pathTo(n.pos, roomId, point), opts);
    if (this.streamRadius && this.playerPos && Math.hypot(n.pos.x - this.playerPos.x, n.pos.z - this.playerPos.z) > this.streamRadius) this.finishPath(n);
  }

  // Big-campus streaming: characters far from the player arrive instantly instead of walking for minutes.
  finishPath(n) {
    const last = n.path[n.path.length - 1];
    if (!last) return;
    n.pos.x = last.x;
    n.pos.z = last.z;
    n.baseY = last.y || 0;
    n.path = [];
    if (n.sitOnArrive) n.seated = true;
    if (n.faceOnArrive !== null && n.faceOnArrive !== undefined) n.group.rotation.y = n.faceOnArrive;
  }

  update(dt, ball) {
    for (const n of this.npcs.values()) {
      if (this.streamRadius && this.playerPos && n.path.length && !n.chase && Math.hypot(n.pos.x - this.playerPos.x, n.pos.z - this.playerPos.z) > this.streamRadius) this.finishPath(n);
      n.update(dt, ball, this.playerPos);
      if (this.playerPos && n.tag !== undefined) {
        const d = Math.hypot(n.pos.x - this.playerPos.x, n.pos.z - this.playerPos.z);
        n.tag.material.opacity = Math.max(0, Math.min(1, (d - 1.6) / 2.4));
        n.tag.visible = n.tag.material.opacity > 0.02;
      }
    }
  }

  nearest(pos, maxDist = 2.2) {
    let best = null;
    let bestD = maxDist;
    for (const n of this.npcs.values()) {
      const d = Math.hypot(n.pos.x - pos.x, n.pos.z - pos.z);
      if (d < bestD) {
        best = n;
        bestD = d;
      }
    }
    return best;
  }
}

export class Ball {
  constructor(scene, bounds) {
    this.bounds = bounds;
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#f6f6f6';
    g.fillRect(0, 0, 128, 64);
    g.fillStyle = '#1b1b1b';
    for (let i = 0; i < 10; i++) {
      g.beginPath();
      const x = (i * 29) % 128;
      const y = (i * 17) % 64;
      for (let k = 0; k < 5; k++) g.lineTo(x + Math.cos((k / 5) * Math.PI * 2) * 7, y + Math.sin((k / 5) * Math.PI * 2) * 7);
      g.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 14), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }));
    this.mesh.castShadow = true;
    scene.add(this.mesh);
    this.pos = this.mesh.position;
    this.vel = new THREE.Vector3();
    this.reset();
  }

  reset() {
    if (this.bounds?.center) this.pos.copy(this.bounds.center);
    else this.pos.set(38, 0.22, 9);
    this.vel.set(0, 0, 0);
  }

  kick(v) {
    this.vel.copy(v);
  }

  update(dt) {
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this.vel.multiplyScalar(Math.max(0, 1 - 1.1 * dt));
    this.mesh.rotation.x += this.vel.z * dt * 3;
    this.mesh.rotation.z -= this.vel.x * dt * 3;
    const b = this.bounds;
    let scored = null;
    if (b.axis === 'z') {
      if (this.pos.x > b.goalA && this.pos.x < b.goalB) {
        if (this.pos.z < b.minZ + 1) scored = 'left';
        if (this.pos.z > b.maxZ - 1) scored = 'right';
      }
    } else if (this.pos.z > 6.5 && this.pos.z < 11.5) {
      if (this.pos.x < b.minX + 1) scored = 'left';
      if (this.pos.x > b.maxX - 1) scored = 'right';
    }
    if (scored) {
      this.reset();
      return scored;
    }
    if (this.pos.x < b.minX || this.pos.x > b.maxX) {
      this.vel.x *= -0.6;
      this.pos.x = Math.max(b.minX, Math.min(b.maxX, this.pos.x));
    }
    if (this.pos.z < b.minZ || this.pos.z > b.maxZ) {
      this.vel.z *= -0.6;
      this.pos.z = Math.max(b.minZ, Math.min(b.maxZ, this.pos.z));
    }
    return null;
  }
}
