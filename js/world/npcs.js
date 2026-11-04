import * as THREE from 'three';
import { makeLabel } from './labels.js';
import { mat } from './campus.js';
import { LOOKS } from '../../data/people.js';

export function studentHeight(classNum) {
  return 1.12 + (classNum - 1) * 0.05;
}

const SKINS = ['#c68c5a', '#a8724a', '#d9a273', '#8d5a3a', '#b98055', '#e0b088'];
const HAIR = '#16110d';

// Shared geometries (built once; every character reuses them).
const G = {
  thigh: new THREE.CapsuleGeometry(0.072, 0.3, 4, 10),
  shin: new THREE.CapsuleGeometry(0.06, 0.3, 4, 10),
  shoe: new THREE.BoxGeometry(0.11, 0.08, 0.25),
  torso: new THREE.CapsuleGeometry(0.16, 0.28, 6, 14),
  pelvis: new THREE.CapsuleGeometry(0.15, 0.06, 4, 12),
  upperArm: new THREE.CapsuleGeometry(0.05, 0.2, 4, 8),
  forearm: new THREE.CapsuleGeometry(0.043, 0.18, 4, 8),
  hand: new THREE.SphereGeometry(0.048, 10, 8),
  neck: new THREE.CylinderGeometry(0.05, 0.055, 0.09, 10),
  head: new THREE.SphereGeometry(0.12, 22, 16),
  eye: new THREE.SphereGeometry(0.021, 10, 8),
  pupil: new THREE.SphereGeometry(0.012, 8, 6),
  brow: new THREE.BoxGeometry(0.048, 0.009, 0.012),
  nose: new THREE.ConeGeometry(0.016, 0.04, 6),
  mouth: new THREE.BoxGeometry(0.05, 0.012, 0.01),
  ear: new THREE.SphereGeometry(0.026, 8, 6),
  hairCap: new THREE.SphereGeometry(0.128, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
  hairBack: new THREE.SphereGeometry(0.127, 16, 10, Math.PI, Math.PI, Math.PI * 0.2, Math.PI * 0.55),
  ponytail: new THREE.CapsuleGeometry(0.035, 0.16, 4, 8),
  braid: new THREE.CapsuleGeometry(0.024, 0.26, 4, 6),
  bun: new THREE.SphereGeometry(0.055, 10, 8),
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

const cloth = (color) => mat(color, { roughness: 0.92 });
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
    const skinMat = mat(SKINS[skinIndex % SKINS.length], { roughness: 0.65 });
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

    // Legs (hip → knee → shoe), +z is the character's front.
    this.legs = [];
    this.knees = [];
    const skirtStyle = isStudent && female;
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
      const shoe = cast(new THREE.Mesh(G.shoe, mat(look.outfit === 'tracksuit' ? '#f2f2f2' : casual ? ['#f2f2f2', '#d8392b', '#2b2b2b', '#e8e2d0'][hash % 4] : '#111111', { roughness: 0.4 })));
      shoe.position.set(0, -0.43, 0.045);
      knee.add(shoe);
      hip.add(knee);
      this.group.add(hip);
      this.legs.push(hip);
      this.knees.push(knee);
    }

    // Torso, pelvis, belt
    this.body = new THREE.Group();
    this.group.add(this.body);
    const pelvis = cast(new THREE.Mesh(G.pelvis, skirtStyle ? cloth(pants) : trouser));
    pelvis.position.y = 0.93;
    pelvis.scale.set(1.05, 1, 0.72);
    this.body.add(pelvis);
    const torso = cast(new THREE.Mesh(G.torso, shirt));
    torso.position.y = 1.2;
    torso.scale.set(female ? 0.98 : 1.08, 1, 0.68);
    this.body.add(torso);
    this.torso = torso;
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
      tie.position.set(0, 1.23, 0.112);
      tie.rotation.x = -0.12;
      this.body.add(tie);
      const card = new THREE.Mesh(G.card, mat('#ffffff'));
      card.position.set(0.075, 1.18, 0.115);
      this.body.add(card);
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.009), cloth('#1d4fa0'));
      band.position.set(0.075, 1.21, 0.117);
      this.body.add(band);
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
      pallu.position.set(0.0, 1.2, 0.114);
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
      const coat = cast(new THREE.Mesh(G.coat, sideMat('#f4f4f4')));
      coat.position.y = 0.98;
      coat.scale.set(1.05, 1, 0.78);
      this.body.add(coat);
      const inner = new THREE.Mesh(G.tie, cloth(color));
      inner.scale.set(1.6, 1, 1);
      inner.position.set(0, 1.25, 0.112);
      this.body.add(inner);
    } else if (look.outfit === 'formal' && look.gender === 'm') {
      const tie = new THREE.Mesh(G.tie, cloth('#2a3a6a'));
      tie.position.set(0, 1.23, 0.112);
      this.body.add(tie);
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
        print.position.set(0, 1.25, 0.112);
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
          cord.position.set(sx, 1.3, 0.113);
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
      stripe.position.set(0, 1.2, 0.113);
      this.body.add(stripe);
      const whistle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.05), mat('#c9c9c9', { metalness: 0.8, roughness: 0.3 }));
      whistle.position.set(0.03, 1.12, 0.12);
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
      const upper = cast(new THREE.Mesh(G.upperArm, sleeve));
      upper.position.y = -0.14;
      shoulder.add(upper);
      const elbow = new THREE.Group();
      elbow.position.y = -0.29;
      const fore = cast(new THREE.Mesh(G.forearm, longSleeves ? sleeve : skinMat));
      fore.position.y = -0.12;
      elbow.add(fore);
      const hand = new THREE.Mesh(G.hand, skinMat);
      hand.position.y = -0.26;
      elbow.add(hand);
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
    const skull = cast(new THREE.Mesh(G.head, skinMat));
    skull.scale.set(0.95, 1.08, 1);
    head.add(skull);
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(G.eye, mat('#fbfbf8', { roughness: 0.3 }));
      eye.position.set(side * 0.042, 0.018, 0.1);
      eye.scale.set(1, 0.85, 0.6);
      head.add(eye);
      const pupil = new THREE.Mesh(G.pupil, mat('#1b120c', { roughness: 0.2 }));
      pupil.position.set(side * 0.042, 0.017, 0.113);
      head.add(pupil);
      const brow = new THREE.Mesh(G.brow, mat(look.hair === 'grey' ? '#9a9a9a' : HAIR));
      brow.position.set(side * 0.043, 0.055, 0.108);
      brow.rotation.z = side * -0.12;
      head.add(brow);
      const ear = new THREE.Mesh(G.ear, skinMat);
      ear.position.set(side * 0.116, 0, 0);
      ear.scale.set(0.6, 1, 0.8);
      head.add(ear);
      if (look.glasses) {
        const lens = new THREE.Mesh(G.lens, mat('#1a1a1a', { metalness: 0.6, roughness: 0.3 }));
        lens.position.set(side * 0.043, 0.017, 0.118);
        head.add(lens);
      }
    }
    if (look.glasses) {
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.004, 0.004), mat('#1a1a1a'));
      bridge.position.set(0, 0.022, 0.12);
      head.add(bridge);
    }
    const nose = new THREE.Mesh(G.nose, skinMat);
    nose.position.set(0, -0.008, 0.118);
    nose.rotation.x = Math.PI / 2.2;
    head.add(nose);
    this.mouth = new THREE.Mesh(G.mouth, mat('#7a2a24', { roughness: 0.5 }));
    this.mouth.position.set(0, -0.05, 0.108);
    head.add(this.mouth);
    if (look.mustache) {
      const m = new THREE.Mesh(G.mustache, mat(look.hair === 'grey' ? '#8a8a8a' : HAIR));
      m.position.set(0, -0.032, 0.115);
      head.add(m);
    }
    if (female && !isStudent) {
      const bindi = new THREE.Mesh(new THREE.SphereGeometry(0.007, 6, 4), mat('#c0132a'));
      bindi.position.set(0, 0.04, 0.121);
      head.add(bindi);
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
    const hairMat = mat(look.hair === 'grey' ? '#8e8e8e' : HAIR, { roughness: 0.75 });
    const add = (geo, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0) => {
      const m = new THREE.Mesh(geo, hairMat);
      m.position.set(x, y, z);
      m.scale.set(sx, sy, sz);
      m.rotation.x = rx;
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
      const beard = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), hairMat);
      beard.position.set(0, -0.02, 0.012);
      head.add(beard);
      return;
    }
    add(G.hairCap, 0, 0.012, -0.004, 1, 1.02, 1.05, -0.18);
    if (look.hair === 'spiky') for (let i = 0; i < 7; i++) add(G.spike, Math.cos(i) * 0.05, 0.12, Math.sin(i) * 0.05 - 0.01, 1, 1, 1, -0.3);
    if (['long', 'ponytail', 'braids', 'bun'].includes(look.hair)) add(G.hairBack, 0, -0.01, -0.012, 1.02, 1.05, 1.02);
    if (look.hair === 'long') add(new THREE.BoxGeometry(0.22, 0.26, 0.05), 0, -0.13, -0.085);
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
      const step = this.speed * (this.chase ? 1.3 : 1) * dt;
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
    this.phase += dt * (walking ? (this.chase ? 12 : 9) : 1.5);
    this.breath += dt * 2.2;
    const s = Math.sin(this.phase);
    const swing = walking ? s * (this.longSkirt ? 0.3 : 0.55) : 0;
    this.legs[0].rotation.x = swing;
    this.legs[1].rotation.x = -swing;
    this.knees[0].rotation.x = walking ? Math.max(0, -Math.sin(this.phase - 0.6)) * 0.9 : 0;
    this.knees[1].rotation.x = walking ? Math.max(0, Math.sin(this.phase - 0.6)) * 0.9 : 0;
    const attention = this.singing;
    this.arms[0].rotation.x = walking ? -swing * 0.8 : attention ? 0 : Math.sin(this.breath * 0.5) * 0.03;
    this.arms[1].rotation.x = walking ? swing * 0.8 : attention ? 0 : -Math.sin(this.breath * 0.5) * 0.03;
    this.elbows[0].rotation.x = walking ? -0.25 - Math.max(0, swing) * 0.4 : -0.08;
    this.elbows[1].rotation.x = walking ? -0.25 - Math.max(0, -swing) * 0.4 : -0.08;
    this.torso.scale.y = 1 + Math.sin(this.breath) * 0.012;
    this.body.position.y = walking ? Math.abs(Math.cos(this.phase)) * 0.03 : 0;
    this.pos.y = baseY + (this.seated ? -0.36 * this.scale : 0);
    this.blob.visible = !this.seated;
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
    if (this.singing) {
      this.singT += dt * 7;
      this.mouth.scale.set(1, 1 + 2.6 * Math.abs(Math.sin(this.singT)), 1);
      this.head.rotation.x = Math.sin(this.singT * 0.25) * 0.05;
    } else {
      this.mouth.scale.set(1, 1, 1);
      this.head.rotation.x = 0;
    }
    this.head.rotation.y = this.headYaw;
  }

  // Drive this model from the player (third-person avatar).
  poseAs(pos, yaw, walking, seated, dt) {
    this.pos.x = pos.x;
    this.pos.z = pos.z;
    this.group.rotation.y = yaw + Math.PI;
    this.seated = !!seated;
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
  }

  update(dt, ball) {
    for (const n of this.npcs.values()) {
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
    this.pos.set(38, 0.22, 9);
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
    if (this.pos.z > 6.5 && this.pos.z < 11.5) {
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
