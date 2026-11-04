import * as THREE from 'three';
import { makeLabel, makeBoardTexture } from './labels.js';
import { texturedMaterial, worldBoxGeometry, worldPlane, TEX_SIZE } from './textures.js';

const mats = new Map();
export function mat(color, { roughness = 0.82, metalness = 0, emissive = null } = {}) {
  const key = `${color}|${roughness}|${metalness}|${emissive}`;
  if (!mats.has(key)) {
    mats.set(key, new THREE.MeshStandardMaterial({ color, roughness, metalness, ...(emissive ? { emissive, emissiveIntensity: 1.4 } : {}) }));
  }
  return mats.get(key);
}
const geoBox = new THREE.BoxGeometry(1, 1, 1);

export const ROOMS = [
  { id: 'classroom', name: 'Classroom', x0: -24, x1: -8, z0: -31, z1: -21, door: { side: 'south', at: -10 }, wall: '#f6e9cc', floor: 'tiles', hasDoor: true },
  { id: 'staffroom', name: 'Staff Room', x0: -8, x1: 0, z0: -31, z1: -21, door: { side: 'south', at: -4 }, wall: '#efe6d6', floor: 'terrazzo' },
  { id: 'principal', name: "Principal's Office", x0: 0, x1: 7, z0: -31, z1: -21, door: { side: 'south', at: 3.5 }, wall: '#ece2cf', floor: 'wood' },
  { id: 'library', name: 'Library', x0: 7, x1: 19, z0: -31, z1: -21, door: { side: 'south', at: 13 }, wall: '#f3ead8', floor: 'wood' },
  { id: 'sciencelab', name: 'Science Laboratory', x0: 19, x1: 31, z0: -31, z1: -21, door: { side: 'south', at: 25 }, wall: '#e6f0f2', floor: 'tiles' },
  { id: 'washroom', name: 'Washrooms', x0: 34, x1: 40, z0: -31, z1: -25, door: { side: 'south', at: 37 }, wall: '#e3ecf2', floor: 'tiles' },
  { id: 'classroomB', name: 'Classroom B · Senior Block', x0: -44, x1: -30, z0: -31, z1: -21, door: { side: 'south', at: -32 }, wall: '#efe6d4', floor: 'tiles' },
  { id: 'complab', name: 'Computer Lab', x0: -44, x1: -32, z0: -14, z1: -4, door: { side: 'east', at: -9 }, wall: '#e6ecf6', floor: 'terrazzo' },
  { id: 'auditorium', name: 'Auditorium', x0: -44, x1: -26, z0: 22, z1: 38, door: { side: 'east', at: 30 }, wall: '#ecdcc8', floor: 'wood' },
  { id: 'reception', name: 'Reception & Admin', x0: 12, x1: 24, z0: 34, z1: 42, door: { side: 'west', at: 38 }, wall: '#f4ebdc', floor: 'terrazzo' },
];

const WALL_H = 3.2;
const DOOR_W = 2.2;
const T = 0.2;

export class Campus {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.interactables = [];
    this.spots = {};
    this.fans = [];
    this.time = 0;
    this.rooms = Object.fromEntries(ROOMS.map((r) => [r.id, r]));
    this.classroomGroup = new THREE.Group();
    scene.add(this.classroomGroup);
    this.indoorLight = new THREE.PointLight('#fff4e0', 0, 16, 1.6);
    scene.add(this.indoorLight);
    this.mode = 'school';
    this.schoolOnly = [];
    this.build();
  }

  box(x, y, z, w, h, d, color, { collide = true, walkable = false, parent = this.scene, collideList = this.colliders, tex = null, tint = '#ffffff', cast = true, receive = true, roughness, metalness, emissive } = {}) {
    let m;
    if (tex) {
      m = new THREE.Mesh(worldBoxGeometry(w, h, d, TEX_SIZE[tex]), texturedMaterial(tex, { tint, ...(roughness !== undefined ? { roughness } : {}) }));
    } else {
      m = new THREE.Mesh(geoBox, mat(color, { ...(roughness !== undefined ? { roughness } : {}), ...(metalness !== undefined ? { metalness } : {}), emissive }));
      m.scale.set(w, h, d);
    }
    m.position.set(x, y + h / 2, z);
    m.castShadow = cast;
    m.receiveShadow = receive;
    parent.add(m);
    if (collide) {
      collideList.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, minY: y, maxY: y + h, walkable, enabled: true });
    }
    return m;
  }

  cyl(x, y, z, rTop, rBottom, h, color, { segments = 12, collide = false, parent = this.scene } = {}) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, segments), mat(color));
    m.position.set(x, y + h / 2, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    if (collide) {
      const r = Math.max(rTop, rBottom);
      this.colliders.push({ minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r, minY: y, maxY: y + h, walkable: false, enabled: true });
    }
    return m;
  }

  label(text, x, y, z, opts) {
    const s = makeLabel(text, opts);
    s.position.set(x, y, z);
    this.scene.add(s);
    return s;
  }

  interactable(id, x, z, label, { radius = 2, y = 1.2 } = {}) {
    const it = { id, pos: new THREE.Vector3(x, y, z), radius, label };
    this.interactables.push(it);
    return it;
  }

  ground(name, x, z, w, d, y = 0.005, tint = '#ffffff') {
    const m = new THREE.Mesh(worldPlane(w, d, TEX_SIZE[name]), texturedMaterial(name, { tint }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    m.receiveShadow = true;
    this.scene.add(m);
    return m;
  }

  build() {
    // Ground, paths, assembly ground, playground
    this.ground('dirt', 0, 6, 170, 170, 0);
    this.ground('paving', 0, 18, 6, 64, 0.01, '#d4c2a2');
    this.ground('paving', -4, -19.2, 90, 3.6, 0.012, '#c6b394');
    this.ground('paving', 0, -5, 26, 19, 0.014, '#d4c2a2');
    this.ground('grass', 38, 9, 38, 44, 0.012);
    this.ground('grass', -20, 10, 14, 10, 0.012);
    this.ground('grass', 18, 10, 6, 10, 0.012);
    this.buildFieldMarkings();

    this.buildBoundary();
    for (const r of ROOMS) this.buildRoom(r);
    this.buildMainBlockUpperFloor();
    this.buildAssembly();
    this.buildPlayground();
    this.buildCanteen();
    this.buildGateArea();
    this.buildLandscape();
    this.buildRoomInteriors();
  }

  buildFieldMarkings() {
    const white = new THREE.MeshStandardMaterial({ color: '#f4f4ee', roughness: 0.9 });
    const line = (x, z, w, d) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), white);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.02, z);
      m.receiveShadow = true;
      this.scene.add(m);
    };
    line(38, -11, 34, 0.12); line(38, 29, 34, 0.12); line(21, 9, 0.12, 40); line(55, 9, 0.12, 40); line(38, 9, 0.12, 40);
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.9, 4.05, 48), white);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(38, 0.021, 9);
    this.scene.add(ring);
    for (const gx of [21, 55]) {
      const side = gx < 38 ? 1 : -1;
      line(gx + side * 4, 9, 0.12, 12); line(gx + side * 2, 2.95, 4, 0.12); line(gx + side * 2, 15.05, 4, 0.12);
    }
  }

  buildBoundary() {
    const wall = (x, z, w, d) => {
      this.box(x, 0, z, w, 2.2, d, null, { tex: 'brick' });
      this.box(x, 2.2, z, w + 0.1, 0.12, d + 0.1, '#d8d2c4', { collide: false });
    };
    wall(0, -40, 120, 0.4);
    wall(-60, 6, 0.4, 92);
    wall(60, 6, 0.4, 92);
    wall(-32, 52, 56, 0.4);
    wall(32, 52, 56, 0.4);
    for (let x = -56; x <= 56; x += 8) {
      if (Math.abs(x) < 6) continue;
      this.box(x, 0, 52, 0.7, 2.6, 0.7, null, { tex: 'brick', collide: false });
      this.box(x, 0, -40, 0.7, 2.6, 0.7, null, { tex: 'brick', collide: false });
    }
  }

  buildGateArea() {
    for (const gx of [-4.4, 4.4]) {
      this.box(gx, 0, 52, 1, 3.4, 1, null, { tex: 'brick' });
      this.box(gx, 3.4, 52, 1.3, 0.25, 1.3, '#d8d2c4', { collide: false });
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), mat('#fff6d8', { emissive: '#ffdf9a' }));
      lamp.position.set(gx, 3.9, 52);
      this.scene.add(lamp);
    }
    // Open iron gates swung inwards
    for (const [gx, rot] of [[-3.9, -1.25], [3.9, 1.25]]) {
      const leaf = new THREE.Group();
      leaf.position.set(gx, 0, 52);
      leaf.rotation.y = rot;
      const iron = mat('#2b2f36', { roughness: 0.5, metalness: 0.6 });
      for (let i = 0; i <= 10; i++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.2, 0.05), iron);
        bar.position.set((gx < 0 ? 1 : -1) * i * 0.34, 1.15, 0);
        bar.castShadow = true;
        leaf.add(bar);
      }
      for (const y of [0.3, 1.2, 2.2]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.07, 0.06), iron);
        rail.position.set((gx < 0 ? 1 : -1) * 1.7, y, 0);
        leaf.add(rail);
      }
      this.scene.add(leaf);
    }
    this.schoolOnly.push(this.label('SUNRISE PUBLIC SCHOOL', 0, 4.3, 52, { size: 64, height: 0.8, bg: 'rgba(120,40,30,0.92)' }));
    const arch = this.box(0, 3.55, 52, 9.8, 0.35, 0.5, '#7a2f22', { collide: false });
    arch.castShadow = true;

    // Bus
    this.box(-14, 0.45, 44, 9, 2.4, 2.6, '#f2bd1d', { roughness: 0.45 });
    this.box(-14, 2.85, 44, 8.8, 0.15, 2.5, '#e9e9e9', { collide: false });
    for (let i = 0; i < 6; i++) this.box(-17.6 + i * 1.3, 1.7, 42.68, 1.05, 0.8, 0.04, '#33485a', { collide: false, roughness: 0.15, metalness: 0.3 });
    this.box(-14, 1.15, 42.68, 8.6, 0.12, 0.04, '#2a2a2a', { collide: false });
    for (const [wx, wz] of [[-17, 42.7], [-11, 42.7], [-17, 45.3], [-11, 45.3]]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.3, 18), mat('#1d1d1d'));
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, 0.48, wz);
      wheel.castShadow = true;
      this.scene.add(wheel);
    }
    this.schoolOnly.push(this.label('SCHOOL BUS', -14, 3.5, 44, { height: 0.45, bg: 'rgba(40,40,40,0.8)' }));

    // Security cabin
    this.box(7, 0, 47, 2.4, 2.6, 2.4, null, { tex: 'plasterWhite' });
    this.box(7, 2.6, 47, 2.9, 0.2, 2.9, null, { tex: 'rooftile', collide: false });
    this.box(5.79, 1.0, 47, 0.04, 1, 1.2, '#33485a', { collide: false, roughness: 0.15 });
    this.label('Security', 7, 3.3, 47, { height: 0.4 });
    this.spots.gate = [new THREE.Vector3(-2, 0, 44), new THREE.Vector3(2, 0, 44), new THREE.Vector3(-3, 0, 41), new THREE.Vector3(3, 0, 41), new THREE.Vector3(0, 0, 39), new THREE.Vector3(-1, 0, 46), new THREE.Vector3(1.5, 0, 46.5)];
    this.spots.guard = new THREE.Vector3(5.3, 0, 47);
    this.spots.parents = new THREE.Vector3(-2.5, 0, 48);
    this.spots.spawn = new THREE.Vector3(0, 0, 49);
    this.interactable('gate', 0, 50.5, 'Leave school for the day', { radius: 3 });
  }

  buildAssembly() {
    this.box(0, 0, -16.3, 12, 0.6, 3.4, null, { tex: 'wood', walkable: true });
    this.box(-6.5, 0, -16.3, 1, 0.3, 3, null, { tex: 'wood', walkable: true });
    this.box(0, 0.6, -17.9, 12, 2.6, 0.15, '#7d2b22', { collide: false });
    this.schoolOnly.push(this.label('शिक्षा · सेवा · संस्कार', 0, 2.6, -17.75, { height: 0.5, bg: 'rgba(125,43,34,0.95)', color: '#ffd77a' }));
    // Flag pole + waving tricolour
    this.cyl(-7.2, 0, -12, 0.06, 0.08, 7.2, '#e6e6e6', { collide: true });
    this.cyl(-7.2, 0, -12, 0.7, 0.8, 0.35, '#c9c1b0');
    const fc = document.createElement('canvas');
    fc.width = 300;
    fc.height = 200;
    const g = fc.getContext('2d');
    g.fillStyle = '#ff9933'; g.fillRect(0, 0, 300, 67);
    g.fillStyle = '#ffffff'; g.fillRect(0, 67, 300, 66);
    g.fillStyle = '#138808'; g.fillRect(0, 133, 300, 67);
    g.strokeStyle = '#000080'; g.lineWidth = 3;
    g.beginPath(); g.arc(150, 100, 28, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 24; i++) {
      g.beginPath(); g.moveTo(150, 100); g.lineTo(150 + Math.cos((i / 24) * Math.PI * 2) * 28, 100 + Math.sin((i / 24) * Math.PI * 2) * 28); g.lineWidth = 1.2; g.stroke();
    }
    const ft = new THREE.CanvasTexture(fc);
    ft.colorSpace = THREE.SRGBColorSpace;
    this.flagGeo = new THREE.PlaneGeometry(1.8, 1.2, 18, 8);
    this.flagBase = this.flagGeo.attributes.position.array.slice();
    this.flag = new THREE.Mesh(this.flagGeo, new THREE.MeshStandardMaterial({ map: ft, side: THREE.DoubleSide, roughness: 0.9 }));
    this.flag.position.set(-6.25, 6.45, -12);
    this.flag.castShadow = true;
    this.scene.add(this.flag);
    // Notice board + bell
    this.box(10, 0, -12, 3, 2.2, 0.15, null, { tex: 'wood' });
    this.box(10, 0.6, -11.9, 2.6, 1.4, 0.05, null, { tex: 'board', collide: false });
    for (let i = 0; i < 6; i++) this.box(9 + (i % 3) * 0.8, 0.85 + Math.floor(i / 3) * 0.6, -11.86, 0.5, 0.42, 0.01, ['#fff8c4', '#d6ecff', '#ffd6d6', '#e6ffd6', '#fff', '#ffe6c4'][i], { collide: false });
    this.interactable('noticeboard', 10, -11, 'Read the notice board');
    this.cyl(6, 0, -12.5, 0.05, 0.05, 2.4, '#555', { collide: true });
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.25, 0.35, 16, 1, true), mat('#c8a43a', { roughness: 0.3, metalness: 0.8 }));
    bell.position.set(6, 2.35, -12.3);
    this.scene.add(bell);
    this.interactable('bell', 6, -11.8, 'Look at the school bell', { radius: 1.6 });
    this.schoolOnly.push(this.label('Assembly Ground', 0, 3.6, -14.5, { height: 0.45 }));
    const lines = [];
    for (let row = 0; row < 4; row++) for (let col = 0; col < 8; col++) lines.push(new THREE.Vector3(-5.6 + col * 1.6, 0, -9 + row * 1.6));
    this.spots.assembly = lines;
    this.spots.assemblyPlayer = new THREE.Vector3(0, 0, -6);
    this.spots.stage = new THREE.Vector3(0, 0.6, -16.5);
  }

  buildPlayground() {
    for (const gx of [22, 54]) {
      const white = '#f7f7f7';
      this.cyl(gx, 0, 6.5, 0.07, 0.07, 2.2, white, { collide: true });
      this.cyl(gx, 0, 11.5, 0.07, 0.07, 2.2, white, { collide: true });
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 5.1, 10), mat(white));
      bar.rotation.x = Math.PI / 2;
      bar.position.set(gx, 2.2, 9);
      bar.castShadow = true;
      this.scene.add(bar);
      const net = new THREE.Mesh(new THREE.PlaneGeometry(5, 2.2, 10, 5), new THREE.MeshStandardMaterial({ color: '#ffffff', wireframe: true, transparent: true, opacity: 0.5 }));
      net.position.set(gx + (gx < 38 ? -0.9 : 0.9), 1.1, 9);
      net.rotation.y = Math.PI / 2;
      net.rotation.x = gx < 38 ? 0.35 : -0.35;
      this.scene.add(net);
    }
    this.box(38, -0.02, 24, 3, 0.05, 20, null, { tex: 'dirt', collide: false, tint: '#e6cf9a' });
    for (const sz of [14.2, 33.8]) for (const dx of [-0.15, 0, 0.15]) this.cyl(38 + dx, 0, sz, 0.025, 0.025, 0.7, '#e8d8b0');
    this.label('Playground', 38, 3, -10, { height: 0.5 });
    this.goals = [{ x: 22, dir: -1 }, { x: 54, dir: 1 }];
    this.fieldBounds = { minX: 21, maxX: 55, minZ: -11, maxZ: 29 };
    this.spots.playground = [];
    for (let i = 0; i < 16; i++) this.spots.playground.push(new THREE.Vector3(26 + (i % 4) * 7, 0, -6 + Math.floor(i / 4) * 8));
    // Benches along the touchline
    for (const bz of [-4, 6, 16, 26]) this.bench(57.3, bz, Math.PI / 2);
  }

  bench(x, z, rot = 0) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    const seat = new THREE.Mesh(worldBoxGeometry(1.8, 0.08, 0.45, 1.5), texturedMaterial('wood'));
    seat.position.y = 0.45;
    seat.castShadow = true;
    g.add(seat);
    const back = new THREE.Mesh(worldBoxGeometry(1.8, 0.35, 0.06, 1.5), texturedMaterial('wood'));
    back.position.set(0, 0.75, -0.2);
    back.castShadow = true;
    g.add(back);
    for (const lx of [-0.8, 0.8]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.45), mat('#2c2c2c', { metalness: 0.5, roughness: 0.5 }));
      leg.position.set(lx, 0.22, 0);
      g.add(leg);
    }
    this.scene.add(g);
  }

  buildCanteen() {
    for (const [px, pz] of [[-42, 6], [-30, 6], [-42, 16], [-30, 16]]) this.box(px, 0, pz, 0.35, 3, 0.35, null, { tex: 'concrete' });
    const roof = new THREE.Mesh(worldBoxGeometry(13.5, 0.2, 11.5, TEX_SIZE.rooftile), texturedMaterial('rooftile'));
    roof.position.set(-36, 3.2, 11);
    roof.rotation.x = 0.06;
    roof.castShadow = true;
    roof.receiveShadow = true;
    this.scene.add(roof);
    this.ground('terrazzo', -36, 11, 12.5, 10.5, 0.02);
    this.box(-36, 0, 7.2, 8, 1.1, 1, null, { tex: 'wood' });
    this.box(-36, 1.1, 7.2, 8.2, 0.06, 1.15, '#d9d4cc', { collide: false, roughness: 0.3 });
    for (let i = 0; i < 4; i++) this.cyl(-39 + i * 2, 1.16, 7.2, 0.18, 0.15, 0.25, ['#c0c0c0', '#b87333', '#c0c0c0', '#e8b04a'][i], { segments: 14 });
    this.interactable('canteen', -36, 8.6, 'Buy a snack at the canteen');
    this.schoolOnly.push(this.label('Canteen', -36, 3.9, 5.5, { height: 0.5 }));
    this.box(-36, 1.9, 5.65, 4, 0.9, 0.05, '#2f5d3a', { collide: false });
    this.schoolOnly.push(this.label('Samosa ₹15 · Vada Pav ₹20 · Idli ₹25', -36, 2.35, 5.6, { height: 0.32, bg: 'rgba(47,93,58,1)', color: '#fff7d6' }));
    this.spots.canteen = [];
    for (const [tx, tz] of [[-39, 11.5], [-33, 11.5], [-39, 14.5], [-33, 14.5]]) {
      this.box(tx, 0, tz, 3, 0.75, 1, null, { tex: 'wood' });
      this.box(tx, 0, tz - 0.8, 3, 0.42, 0.35, '#5a4636', { collide: false });
      this.box(tx, 0, tz + 0.8, 3, 0.42, 0.35, '#5a4636', { collide: false });
      this.spots.canteen.push(new THREE.Vector3(tx - 1, 0, tz - 0.9), new THREE.Vector3(tx + 1, 0, tz + 0.9));
    }
  }

  tree(x, z, scale = 1, kind = 0) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * scale, 0.32 * scale, 3 * scale, 9), mat('#5b3f27', { roughness: 1 }));
    trunk.position.y = 1.5 * scale;
    trunk.castShadow = true;
    g.add(trunk);
    const greens = kind ? ['#3d7a32', '#4c8a3a', '#2f6a2a'] : ['#4f8f3a', '#3f7d33', '#5d9c44'];
    const blobs = kind ? [[0, 4.2, 0, 2.1], [1.3, 3.6, 0.4, 1.5], [-1.2, 3.7, -0.3, 1.5], [0.2, 5.2, -0.4, 1.4], [-0.3, 3.4, 1.2, 1.3]] : [[0, 3.6, 0, 1.9], [1, 4.3, 0.6, 1.3], [-0.9, 4.1, -0.5, 1.4], [0.3, 4.9, -0.2, 1.1]];
    blobs.forEach(([bx, by, bz, r], i) => {
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(r * scale, 1), new THREE.MeshStandardMaterial({ color: greens[i % 3], roughness: 0.95, flatShading: true }));
      leaf.position.set(bx * scale, by * scale, bz * scale);
      leaf.castShadow = true;
      leaf.receiveShadow = true;
      g.add(leaf);
    });
    this.scene.add(g);
    this.colliders.push({ minX: x - 0.3, maxX: x + 0.3, minZ: z - 0.3, maxZ: z + 0.3, minY: 0, maxY: 3, walkable: false, enabled: true });
  }

  buildLandscape() {
    [[-50, -30], [-52, -10], [-50, 20], [-50, 45], [50, -30], [52, 40], [30, 45], [-25, 46], [18, 12], [-20, 12], [45, 40], [-54, 2], [56, -36], [-8, 36], [30, 42]]
      .forEach(([tx, tz], i) => this.tree(tx, tz, 0.9 + (i % 3) * 0.15, i % 2));
    // Flowerbeds around the assembly ground
    const flowers = [];
    const bed = (x, z, w, d) => {
      this.box(x, 0, z, w, 0.3, d, null, { tex: 'brick', collide: false });
      this.box(x, 0.3, z, w - 0.2, 0.02, d - 0.2, '#5a3d24', { collide: false });
      for (let i = 0; i < w * d * 3; i++) flowers.push([x + (Math.random() - 0.5) * (w - 0.4), z + (Math.random() - 0.5) * (d - 0.4)]);
    };
    bed(-11.5, -3, 1.2, 12); bed(11.5, -3, 1.2, 12); bed(-3.5, 45, 1.2, 8); bed(3.5, 45, 1.2, 8); bed(-3.5, 30, 1.2, 10); bed(3.5, 30, 1.2, 10);
    const fg = new THREE.SphereGeometry(0.09, 6, 4);
    const fm = new THREE.MeshStandardMaterial({ roughness: 0.7 });
    const inst = new THREE.InstancedMesh(fg, fm, flowers.length);
    const bush = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.22, 0), new THREE.MeshStandardMaterial({ color: '#3f7a2e', flatShading: true }), flowers.length);
    const m4 = new THREE.Matrix4();
    const palette = ['#ff5a5f', '#ffd23f', '#ff8c42', '#f25cff', '#ffffff', '#ff3d7f'].map((c) => new THREE.Color(c));
    flowers.forEach(([fx, fz], i) => {
      m4.makeTranslation(fx, 0.42, fz);
      bush.setMatrixAt(i, m4);
      m4.makeTranslation(fx + 0.05, 0.6, fz);
      inst.setMatrixAt(i, m4);
      inst.setColorAt(i, palette[i % palette.length]);
    });
    inst.castShadow = true;
    bush.castShadow = true;
    this.scene.add(bush, inst);
    // Lamp posts along the main path
    for (const lz of [12, 24, 36]) {
      for (const lx of [-3.6, 3.6]) {
        this.cyl(lx, 0, lz, 0.06, 0.09, 4, '#2e3338', { collide: true });
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.25), mat('#2e3338'));
        head.position.set(lx + (lx < 0 ? 0.25 : -0.25), 4, lz);
        this.scene.add(head);
        const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 0.18), mat('#fff8e0', { emissive: '#ffe9b0' }));
        bulb.position.set(lx + (lx < 0 ? 0.3 : -0.3), 3.93, lz);
        this.scene.add(bulb);
      }
    }
    this.bench(-8, 14, Math.PI / 2);
    this.bench(8, 14, -Math.PI / 2);
    this.bench(-8, 26, Math.PI / 2);
    // Water cooler near the veranda
    this.box(33, 0, -18.4, 1.2, 1.3, 0.6, '#c9ced4', { metalness: 0.6, roughness: 0.35 });
    this.box(33, 1.3, -18.4, 1.25, 0.08, 0.65, '#9aa2aa', { collide: false, metalness: 0.6 });
  }

  buildMainBlockUpperFloor() {
    const x0 = -45;
    const x1 = 41;
    const cx = (x0 + x1) / 2;
    const w = x1 - x0;
    // First-floor slab over the classrooms and the veranda
    this.box(cx, WALL_H, -24.2, w, 0.3, 14.4, null, { tex: 'concrete', collide: false });
    // Upper storey shell
    this.box(cx, WALL_H + 0.3, -31, w, 3.1, 0.25, null, { tex: 'plaster', collide: false });
    this.box(cx, WALL_H + 0.3, -21, w, 3.1, 0.25, null, { tex: 'plaster', collide: false });
    this.box(x0, WALL_H + 0.3, -26, 0.25, 3.1, 10, null, { tex: 'plaster', collide: false });
    this.box(x1, WALL_H + 0.3, -26, 0.25, 3.1, 10, null, { tex: 'plaster', collide: false });
    this.box(cx, WALL_H + 3.4, -24.2, w + 0.4, 0.3, 14.6, null, { tex: 'concrete', collide: false });
    // Parapet with a painted band
    this.box(cx, WALL_H + 3.7, -17.05, w + 0.4, 0.7, 0.2, null, { tex: 'plasterWhite', collide: false });
    this.box(cx, WALL_H + 3.75, -16.94, w + 0.4, 0.18, 0.02, '#8f3b2a', { collide: false, cast: false });
    this.box(cx, WALL_H + 3.7, -31.4, w + 0.4, 0.7, 0.2, null, { tex: 'plasterWhite', collide: false });
    // Upper windows with sunshades (chajjas)
    for (let x = x0 + 3; x < x1 - 2; x += 4.2) {
      this.box(x, WALL_H + 1.2, -20.86, 1.8, 1.4, 0.06, '#2c4254', { collide: false, roughness: 0.12, metalness: 0.4, cast: false });
      this.box(x, WALL_H + 1.15, -20.82, 1.95, 0.08, 0.1, '#e9e2d2', { collide: false });
      this.box(x, WALL_H + 2.62, -20.82, 1.95, 0.08, 0.1, '#e9e2d2', { collide: false });
      this.box(x, WALL_H + 1.9, -20.82, 0.06, 1.4, 0.08, '#e9e2d2', { collide: false, cast: false });
      this.box(x, WALL_H + 2.75, -20.55, 2.3, 0.07, 0.6, null, { tex: 'concrete', collide: false });
    }
    // Pillars, railings and potted plants along both verandas
    const doors = ROOMS.filter((r) => r.door.side === 'south' && r.z1 === -21).map((r) => r.door.at);
    for (let x = x0 + 1; x <= x1 - 1; x += 4.5) {
      const nearDoor = doors.some((d) => Math.abs(d - x) < 1.7);
      if (!nearDoor) this.box(x, 0, -17.5, 0.42, WALL_H, 0.42, null, { tex: 'plasterWhite' });
      this.box(x, WALL_H + 0.3, -17.5, 0.36, 3.1, 0.36, null, { tex: 'plasterWhite', collide: false });
      if (!nearDoor && Math.abs(x) > 6) {
        const pot = this.cyl(x + 2.2, 0, -17.6, 0.28, 0.2, 0.45, '#a8552f', { segments: 12 });
        pot.receiveShadow = true;
        const plant = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), new THREE.MeshStandardMaterial({ color: '#3f8a35', flatShading: true }));
        plant.position.set(x + 2.2, 0.8, -17.6);
        plant.castShadow = true;
        this.scene.add(plant);
      }
    }
    const rail = mat('#f2efe8');
    for (let x = x0; x < x1; x += 0.5) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, 0.05), rail);
      b.position.set(x, WALL_H + 0.75, -17.45);
      this.scene.add(b);
    }
    this.box(cx, WALL_H + 1.2, -17.45, w, 0.08, 0.14, '#f2efe8', { collide: false });
    // Water tank on the roof
    this.cyl(-30, WALL_H + 3.55, -27, 1.1, 1.2, 1.9, '#1d1f22', { segments: 20 });
    this.cyl(-30, WALL_H + 5.45, -27, 0.3, 1.1, 0.25, '#1d1f22', { segments: 20 });
    this.schoolOnly.push(this.label('SUNRISE PUBLIC SCHOOL · Est. 1985', -2, WALL_H + 4.45, -16.85, { size: 56, height: 0.62, bg: 'rgba(25,58,110,0.95)', color: '#ffffff' }));
  }

  buildRoom(r) {
    const cx = (r.x0 + r.x1) / 2;
    const cz = (r.z0 + r.z1) / 2;
    const w = r.x1 - r.x0;
    const d = r.z1 - r.z0;
    const floor = new THREE.Mesh(worldPlane(w, d, TEX_SIZE[r.floor]), texturedMaterial(r.floor, { roughness: r.floor === 'tiles' ? 0.45 : 0.8 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, 0.025, cz);
    floor.receiveShadow = true;
    this.scene.add(floor);
    if (r.z0 !== -31) this.box(cx, WALL_H, cz, w + 0.4, 0.2, d + 0.4, null, { tex: 'concrete', collide: false, tint: '#f4f1ea' });
    const wallOpts = { tex: 'plaster', tint: r.wall };
    const walls = { north: { z: r.z0, horiz: true }, south: { z: r.z1, horiz: true }, west: { x: r.x0, horiz: false }, east: { x: r.x1, horiz: false } };
    for (const [side, wdef] of Object.entries(walls)) {
      const isDoor = r.door.side === side;
      if (wdef.horiz) {
        if (isDoor) {
          const a = r.door.at - DOOR_W / 2;
          const b = r.door.at + DOOR_W / 2;
          this.box((r.x0 + a) / 2, 0, wdef.z, a - r.x0, WALL_H, T, null, wallOpts);
          this.box((b + r.x1) / 2, 0, wdef.z, r.x1 - b, WALL_H, T, null, wallOpts);
          this.box(r.door.at, 2.5, wdef.z, DOOR_W, WALL_H - 2.5, T, null, { ...wallOpts, collide: false });
          // door frame
          this.box(a - 0.06, 0, wdef.z, 0.12, 2.5, T + 0.08, '#6b4a2e', { collide: false });
          this.box(b + 0.06, 0, wdef.z, 0.12, 2.5, T + 0.08, '#6b4a2e', { collide: false });
          this.box(r.door.at, 2.44, wdef.z, DOOR_W + 0.24, 0.12, T + 0.08, '#6b4a2e', { collide: false });
          // dado band + windows on the facade
          this.dadoAndWindows(r, wdef.z + (side === 'south' ? T / 2 + 0.01 : -T / 2 - 0.01), side === 'south' ? 1 : -1, [a, b]);
        } else this.box(cx, 0, wdef.z, w, WALL_H, T, null, wallOpts);
      } else if (isDoor) {
        const a = r.door.at - DOOR_W / 2;
        const b = r.door.at + DOOR_W / 2;
        this.box(wdef.x, 0, (r.z0 + a) / 2, T, WALL_H, a - r.z0, null, wallOpts);
        this.box(wdef.x, 0, (b + r.z1) / 2, T, WALL_H, r.z1 - b, null, wallOpts);
        this.box(wdef.x, 2.5, r.door.at, T, WALL_H - 2.5, DOOR_W, null, { ...wallOpts, collide: false });
        this.box(wdef.x, 0, a - 0.06, T + 0.08, 2.5, 0.12, '#6b4a2e', { collide: false });
        this.box(wdef.x, 0, b + 0.06, T + 0.08, 2.5, 0.12, '#6b4a2e', { collide: false });
      } else this.box(wdef.x, 0, cz, T, WALL_H, d, null, wallOpts);
    }
    if (r.id === 'auditorium' || r.id === 'reception' || r.id === 'complab' || r.id === 'washroom') {
      this.box(cx, WALL_H + 0.2, cz, w + 0.8, 0.25, d + 0.8, null, { tex: 'rooftile', collide: false });
    }
    const out = 1.6;
    let outside;
    let inside;
    if (r.door.side === 'south') { outside = new THREE.Vector3(r.door.at, 0, r.z1 + out); inside = new THREE.Vector3(r.door.at, 0, r.z1 - out); }
    if (r.door.side === 'north') { outside = new THREE.Vector3(r.door.at, 0, r.z0 - out); inside = new THREE.Vector3(r.door.at, 0, r.z0 + out); }
    if (r.door.side === 'east') { outside = new THREE.Vector3(r.x1 + out, 0, r.door.at); inside = new THREE.Vector3(r.x1 - out, 0, r.door.at); }
    if (r.door.side === 'west') { outside = new THREE.Vector3(r.x0 - out, 0, r.door.at); inside = new THREE.Vector3(r.x0 + out, 0, r.door.at); }
    r.outside = outside;
    r.inside = inside;
    r.center = new THREE.Vector3(cx, 0, cz);
    r.labelSprite = this.label(r.name, (outside.x + inside.x) / 2, 2.85, (outside.z + inside.z) / 2 + (r.door.side === 'south' ? 0.3 : 0), { height: 0.42 });

    if (r.hasDoor) {
      const pivot = new THREE.Group();
      const a = r.door.at - DOOR_W / 2;
      pivot.position.set(a, 0, r.z1);
      const leaf = new THREE.Mesh(worldBoxGeometry(DOOR_W, 2.4, 0.08, 1.5), texturedMaterial('wood', { tint: '#c79a6a' }));
      leaf.position.set(DOOR_W / 2, 1.2, 0);
      leaf.castShadow = true;
      pivot.add(leaf);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), mat('#d4af37', { metalness: 0.9, roughness: 0.3 }));
      knob.position.set(DOOR_W - 0.2, 1.1, 0.07);
      pivot.add(knob);
      this.scene.add(pivot);
      const col = { minX: a, maxX: a + DOOR_W, minZ: r.z1 - 0.1, maxZ: r.z1 + 0.1, minY: 0, maxY: 2.4, enabled: false };
      this.colliders.push(col);
      this.door = { pivot, collider: col, open: true, roomId: r.id };
      pivot.rotation.y = -Math.PI / 2;
      this.interactable('door', r.door.at, r.z1 + 0.6, 'Open / close the classroom door', { radius: 1.8 });
    }
  }

  dadoAndWindows(r, z, dir, [a, b]) {
    for (const [s, e] of [[r.x0, a], [b, r.x1]]) {
      const w = e - s;
      if (w < 0.3) continue;
      this.box((s + e) / 2, 0, z + dir * 0.02, w, 0.9, 0.04, null, { tex: 'dado', collide: false });
      for (let x = s + 1.4; x < e - 1; x += 3.4) {
        this.box(x, 1.15, z + dir * 0.03, 1.6, 1.2, 0.05, '#2c4254', { collide: false, roughness: 0.1, metalness: 0.4, cast: false });
        this.box(x, 1.1, z + dir * 0.05, 1.75, 0.08, 0.08, '#e9e2d2', { collide: false });
        this.box(x, 2.35, z + dir * 0.05, 1.75, 0.08, 0.08, '#e9e2d2', { collide: false });
        for (let g = -0.6; g <= 0.6; g += 0.3) this.box(x + g, 1.15, z + dir * 0.07, 0.025, 1.2, 0.025, '#4a4f55', { collide: false, cast: false, metalness: 0.5 });
        this.box(x, 2.55, z + dir * 0.3, 2.1, 0.06, 0.55, null, { tex: 'concrete', collide: false });
      }
    }
  }

  toggleDoor() {
    const d = this.door;
    d.open = !d.open;
    d.pivot.rotation.y = d.open ? -Math.PI / 2 : 0;
    d.collider.enabled = !d.open;
    return d.open;
  }

  ceilingFan(x, z, parent = this.scene) {
    const g = new THREE.Group();
    g.position.set(x, WALL_H - 0.05, z);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), mat('#e8e4dc'));
    rod.position.y = -0.25;
    g.add(rod);
    const rotor = new THREE.Group();
    rotor.position.y = -0.52;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.12, 14), mat('#e8e4dc', { metalness: 0.3, roughness: 0.4 }));
    rotor.add(hub);
    for (let i = 0; i < 3; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.015, 0.13), mat('#d9d4ca'));
      blade.position.set(Math.cos((i / 3) * Math.PI * 2) * 0.42, 0, Math.sin((i / 3) * Math.PI * 2) * 0.42);
      blade.rotation.y = -(i / 3) * Math.PI * 2;
      rotor.add(blade);
    }
    g.add(rotor);
    parent.add(g);
    this.fans.push(rotor);
  }

  tubeLight(x, z, rot = 0) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.07), mat('#ffffff', { emissive: '#fff8ea' }));
    t.position.set(x, WALL_H - 0.06, z);
    t.rotation.y = rot;
    this.scene.add(t);
  }

  buildRoomInteriors() {
    const R = this.rooms;
    for (const r of ROOMS) {
      if (['classroom', 'staffroom', 'library', 'sciencelab', 'classroomB', 'complab'].includes(r.id)) {
        const cx = (r.x0 + r.x1) / 2;
        const cz = (r.z0 + r.z1) / 2;
        this.tubeLight(cx, r.z0 + 0.3);
        this.tubeLight(cx, r.z1 - 0.3);
        if (r.id !== 'complab') {
          const span = r.x1 - r.x0;
          if (span > 10) { this.ceilingFan(cx - span / 4, cz); this.ceilingFan(cx + span / 4, cz); } else this.ceilingFan(cx, cz);
        }
      }
    }
    // Classroom interior dado (painted lower band)
    this.box(-16, 0, -30.88, 16, 1, 0.02, null, { tex: 'dadoGreen', collide: false, cast: false });
    this.box(-23.88, 0, -26, 0.02, 1, 10, null, { tex: 'dadoGreen', collide: false, cast: false });
    this.box(-8.12, 0, -26, 0.02, 1, 10, null, { tex: 'dadoGreen', collide: false, cast: false });
    // Staff room
    this.box(-4, 0, -27, 5, 0.78, 1.6, null, { tex: 'wood' });
    this.box(-4, 0, -24, 5, 0.78, 1.2, null, { tex: 'wood' });
    this.box(-7.6, 0, -29.5, 0.6, 1.9, 2.4, '#7c8a96', { metalness: 0.5, roughness: 0.5 });
    this.spots.staffroom = [new THREE.Vector3(-6.5, 0, -28.5), new THREE.Vector3(-1.5, 0, -28.5), new THREE.Vector3(-6.5, 0, -25.5), new THREE.Vector3(-1.5, 0, -25.5), new THREE.Vector3(-6.5, 0, -22.5), new THREE.Vector3(-1.5, 0, -22.5), new THREE.Vector3(-4, 0, -29.8), new THREE.Vector3(-4, 0, -22.2)];
    this.spots.counsellor = new THREE.Vector3(-1.5, 0, -22.4);
    // Principal
    this.box(3.5, 0, -28, 3, 0.8, 1.2, null, { tex: 'wood', tint: '#8a6040' });
    this.box(3.5, 0, -29.6, 0.8, 1.3, 0.6, '#5a2a22');
    this.box(3.5, 1.4, -30.85, 1.4, 0.9, 0.04, '#d8c8a0', { collide: false });
    this.spots.principal = new THREE.Vector3(3.5, 0, -29.5);
    this.interactable('principalDesk', 3.5, -26.8, 'Greet the Principal');
    // Library shelves with books
    const bookColors = ['#8b1e2d', '#1e4d8b', '#2d7a3a', '#c79a2a', '#5a2d82', '#1f1f1f', '#c0532a'];
    const bookGeo = new THREE.BoxGeometry(0.08, 0.3, 0.22);
    const shelves = [];
    for (let i = 0; i < 4; i++) shelves.push([8.5 + i * 3, -30.4, 2.6, 0.7, 'x']);
    shelves.push([18.3, -26, 0.7, 6, 'z']);
    let bookCount = 0;
    shelves.forEach(([sx, sz, sw, sd]) => { bookCount += Math.floor((Math.max(sw, sd) - 0.2) / 0.1) * 4; });
    const books = new THREE.InstancedMesh(bookGeo, new THREE.MeshStandardMaterial({ roughness: 0.8 }), bookCount);
    let bi = 0;
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    shelves.forEach(([sx, sz, sw, sd, axis]) => {
      this.box(sx, 0, sz, sw, 2.4, sd, null, { tex: 'wood', tint: '#a5774c' });
      const len = Math.max(sw, sd) - 0.2;
      const n = Math.floor(len / 0.1);
      for (let shelf = 0; shelf < 4; shelf++) {
        for (let k = 0; k < n; k++) {
          const off = -len / 2 + k * 0.1 + 0.05;
          const pos = axis === 'x' ? new THREE.Vector3(sx + off, 0.35 + shelf * 0.55, sz + 0.37) : new THREE.Vector3(sx - 0.37, 0.35 + shelf * 0.55, sz + off);
          q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), axis === 'x' ? 0 : Math.PI / 2);
          m4.compose(pos, q, new THREE.Vector3(1, 0.8 + ((k * 7 + shelf) % 5) * 0.08, 1));
          books.setMatrixAt(bi, m4);
          books.setColorAt(bi, new THREE.Color(bookColors[(k * 3 + shelf) % bookColors.length]));
          bi += 1;
        }
      }
    });
    books.count = bi;
    books.castShadow = true;
    this.scene.add(books);
    this.box(12, 0, -25.5, 4, 0.76, 1.6, null, { tex: 'wood' });
    this.interactable('bookshelf', 12, -29.4, 'Pick a book and read');
    this.interactable('projectTable', 12, -24.2, 'Work on your school project');
    this.spots.library = [new THREE.Vector3(10.5, 0, -24), new THREE.Vector3(13.5, 0, -24), new THREE.Vector3(10.5, 0, -27), new THREE.Vector3(13.5, 0, -27), new THREE.Vector3(16, 0, -23), new THREE.Vector3(9, 0, -22.6)];
    this.spots.librarian = new THREE.Vector3(17, 0, -22.8);
    this.box(17, 0, -24, 2, 0.9, 0.8, null, { tex: 'wood' });
    // Science lab
    for (const bz of [-28.5, -25]) {
      this.box(25, 0, bz, 9, 0.9, 1.4, '#3e4a52', { roughness: 0.35 });
      for (let k = 0; k < 4; k++) {
        const beaker = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.26, 14), new THREE.MeshStandardMaterial({ color: ['#7fd6ff', '#ffd27f', '#b4ff9a', '#ff9ac8'][k], transparent: true, opacity: 0.75, roughness: 0.1 }));
        beaker.position.set(21.5 + k * 2.2, 1.03, bz);
        this.scene.add(beaker);
        const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.2, 8), mat('#9aa3aa', { metalness: 0.7, roughness: 0.3 }));
        burner.position.set(22.3 + k * 2.2, 1.0, bz + 0.3);
        this.scene.add(burner);
      }
    }
    this.box(30.2, 0.9, -28.5, 0.3, 0.45, 0.3, '#222', { collide: false });
    this.box(20, 0, -30.4, 1.2, 2, 0.6, '#d8dde0', { metalness: 0.2 });
    this.label('⚠ Safety first: goggles on!', 25, 2.4, -30.85, { height: 0.35, bg: 'rgba(200,40,40,0.95)' });
    this.interactable('labBench', 25, -23.8, 'Do the practical experiment');
    this.interactable('microscope', 30, -27.4, 'Look through the microscope', { radius: 1.6 });
    this.spots.sciencelab = [new THREE.Vector3(21.5, 0, -27.3), new THREE.Vector3(24, 0, -27.3), new THREE.Vector3(26.5, 0, -27.3), new THREE.Vector3(29, 0, -27.3), new THREE.Vector3(21.5, 0, -23.8), new THREE.Vector3(28.5, 0, -23.8), new THREE.Vector3(26.5, 0, -22.5)];
    this.spots.labTeacher = new THREE.Vector3(25, 0, -30);
    // Computer lab
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 2; j++) {
        this.box(-41 + i * 3.2, 0, -12 + j * 4, 2.4, 0.75, 0.9, '#d4d4d0', { roughness: 0.5 });
        this.box(-41 + i * 3.2, 0.75, -12.2 + j * 4, 0.8, 0.5, 0.05, '#1e1e28', { collide: false, roughness: 0.2 });
        this.box(-41 + i * 3.2, 0.8, -12.17 + j * 4, 0.72, 0.42, 0.01, '#2a6fdb', { collide: false, emissive: '#2a6fdb', cast: false });
        this.box(-41 + i * 3.2, 0.75, -11.8 + j * 4, 0.5, 0.02, 0.16, '#2a2a2a', { collide: false });
      }
    }
    this.interactable('computer', -37.8, -9.4, 'Use a computer', { radius: 2.4 });
    this.spots.complab = [new THREE.Vector3(-41, 0, -11), new THREE.Vector3(-37.8, 0, -11), new THREE.Vector3(-34.6, 0, -11), new THREE.Vector3(-41, 0, -7), new THREE.Vector3(-37.8, 0, -7), new THREE.Vector3(-34.6, 0, -7)];
    // Auditorium
    this.box(-41.5, 0, 30, 4, 0.8, 12, null, { tex: 'wood', tint: '#9a6a48' });
    this.box(-43.7, 0.8, 30, 0.1, 2.4, 11, '#7a1f2a', { collide: false });
    for (let rrow = 0; rrow < 5; rrow++) for (let c = 0; c < 2; c++) this.box(-35 + rrow * 1.8, 0, 26 + c * 7.5, 0.8, 0.5, 5, '#9a3a3a');
    this.spots.auditorium = new THREE.Vector3(-38.5, 0, 30);
    this.interactable('auditoriumStage', -38.5, 30, 'Talk to the counsellor', { radius: 2.5 });
    // Reception
    this.box(18, 0, 38, 1, 1, 4, null, { tex: 'wood' });
    this.spots.reception = new THREE.Vector3(19.5, 0, 38);
    // Washroom
    this.box(37, 0, -29.5, 4, 1.8, 0.2, '#b0bec5');
    // Classroom B furniture (senior block)
    this.spots.classroomB = [];
    for (let rr = 0; rr < 3; rr++) {
      for (let c = 0; c < 3; c++) {
        const x = -41 + c * 4;
        const z = -27 + rr * 2;
        this.box(x, 0, z, 1.2, 0.76, 0.6, null, { tex: 'wood' });
        this.spots.classroomB.push(new THREE.Vector3(x, 0, z + 0.65));
      }
    }
    this.spots.classroomBTeacher = new THREE.Vector3(-37, 0, -29.8);
    this.box(-37, 0.9, -30.85, 5, 1.6, 0.08, '#1f3b2c', { collide: false });
    this.roomRefs = R;
  }

  ensureBoard() {
    if (this.board) return;
    this.board = makeBoardTexture();
    const boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.25), new THREE.MeshStandardMaterial({ map: this.board.texture, roughness: 0.95 }));
    boardMesh.position.set(-16, 1.9, -30.88);
    this.scene.add(boardMesh);
    this.box(-16, 0.72, -30.8, 6.2, 0.05, 0.12, '#6b4a2e', { collide: false });
    this.interactable('blackboard', -16, -29, 'Read the blackboard', { radius: 2.5 });
    this.interactable('register', -14.4, -29, 'Look at the attendance register', { radius: 1.2 });
    // Portraits / charts on the side walls
    const chart = (text, x, z, rot, bg, color) => {
      const s = makeLabel(text, { bg, color, size: 34, height: 0.42 });
      s.position.set(x, 2.25, z);
      this.scene.add(s);
      this.schoolOnly.push(s);
      s.visible = this.mode !== 'college';
    };
    chart('Clean India · Green India', -8.35, -28, 0, 'rgba(46,125,50,0.95)', '#ffffff');
    chart('Our Solar System', -8.35, -24, 0, 'rgba(20,30,70,0.95)', '#ffe08a');
  }

  // Rebuild classroom furniture to fit the class: smaller benches for little ones, single desks for seniors.
  rebuildClassroom(classNum, title) {
    const g = this.classroomGroup;
    while (g.children.length) g.remove(g.children[0]);
    this.classroomColliders = [];
    const cols = { list: this.classroomColliders };
    this.classroomTitle = title;
    this.classNum = classNum;
    if (classNum >= 13) {
      this.buildLectureTheatre(g, cols);
      this.ensureBoard();
      this.board.draw([title, 'Lecture in progress', 'Quiz this week · Check the course handout']);
      this.setClassroomLabel();
      this.spots.teacherFront = new THREE.Vector3(-18, 0, -29);
      return;
    }
    const small = classNum <= 5;
    const senior = classNum >= 11;
    const deskH = small ? 0.58 : senior ? 0.78 : 0.72;
    const deskTints = small ? ['#ff9b8a', '#8ac3ff', '#ffd77a', '#9be0b0'] : senior ? ['#c49a72'] : ['#d2a47a'];
    this.seats = [];
    let k = 0;
    for (let row = 0; row < 4; row++) {
      for (let c = 0; c < 3; c++) {
        const x = -21 + c * 5;
        const z = -27.5 + row * 1.6;
        const tint = deskTints[k++ % deskTints.length];
        const dw = senior ? 1.2 : 2.2;
        this.box(x, deskH - 0.06, z, dw, 0.06, 0.55, null, { parent: g, collideList: cols.list, tex: 'wood', tint });
        this.box(x, 0, z, dw - 0.1, deskH - 0.06, 0.5, null, { parent: g, collideList: cols.list, tex: 'wood', tint, collide: false });
        this.box(x, 0, z + 0.65, senior ? 0.5 : dw, deskH * 0.6, 0.35, null, { parent: g, collideList: cols.list, collide: false, tex: 'wood', tint: small ? '#d9d9d9' : '#b48a62' });
        if (senior) this.box(x, deskH * 0.6, z + 0.82, 0.5, 0.45, 0.05, null, { parent: g, collideList: cols.list, collide: false, tex: 'wood', tint: '#b48a62' });
        this.seats.push({ pos: new THREE.Vector3(x, 0, z + 0.6), desk: new THREE.Vector3(x, deskH, z) });
        // books and a pencil box on some desks
        if ((row + c) % 2 === 0) {
          this.box(x - 0.4, deskH, z, 0.3, 0.04, 0.22, ['#1e4d8b', '#8b1e2d', '#2d7a3a'][(row + c) % 3], { parent: g, collide: false });
          this.box(x + 0.35, deskH, z + 0.05, 0.22, 0.03, 0.08, '#f2c14e', { parent: g, collide: false });
        }
      }
    }
    this.playerSeatIndex = 4;
    const ps = this.seats[this.playerSeatIndex];
    const marker = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.35), new THREE.MeshStandardMaterial({ color: '#ffd84a', emissive: '#ffb800', emissiveIntensity: 0.6 }));
    marker.position.set(ps.desk.x, ps.desk.y + 0.02, ps.desk.z);
    g.add(marker);
    // Teacher table, chair, board, decorations
    this.box(-16, 0, -29.6, 2.4, 0.8, 0.9, null, { parent: g, collideList: cols.list, tex: 'wood', tint: '#a8784e' });
    this.box(-16, 0, -30.4, 0.55, 0.9, 0.5, '#5a3a22', { parent: g, collide: false });
    this.box(-16, 0, -30.35, 7, 0.08, 0.9, null, { parent: g, collide: false, tex: 'wood', tint: '#9a7a5a' });
    const register = this.box(-15.4, 0.8, -29.5, 0.35, 0.05, 0.25, '#2a3f7a', { parent: g, collide: false });
    register.castShadow = false;
    this.ensureBoard();
    this.board.draw([title, small ? 'Good morning, children!' : 'Welcome back, class.', 'Today: see the timetable (T)']);
    if (small) {
      const chart = makeLabel('A B C  ·  1 2 3  ·  अ आ इ', { bg: 'rgba(255,240,200,0.95)', color: '#c0392b', size: 40, height: 0.6 });
      chart.position.set(-23.8, 2.2, -26);
      g.add(chart);
    } else if (senior) {
      const chart = makeLabel('Board Exams: stay consistent!', { bg: 'rgba(230,240,255,0.95)', color: '#1d3557', size: 36, height: 0.5 });
      chart.position.set(-23.8, 2.3, -26);
      g.add(chart);
    }
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 14), mat('#3a7bd5', { roughness: 0.4 }));
    globe.position.set(-17.2, 1.02, -29.6);
    globe.castShadow = true;
    g.add(globe);
    this.globe = globe;
    this.setClassroomLabel();
    this.spots.teacherFront = new THREE.Vector3(-18, 0, -29);
  }

  setClassroomLabel() {
    const r = this.rooms.classroom;
    r.labelSprite.material.map.dispose();
    this.scene.remove(r.labelSprite);
    const text = this.mode === 'college' ? 'Lecture Theatre' : this.classroomTitle || r.name;
    r.labelSprite = this.label(text, r.door.at, 2.85, r.z1 + 0.3, { height: 0.42 });
  }

  // Tiered lecture theatre: four stepped rows of long desks facing the board.
  buildLectureTheatre(g, cols) {
    const deskH = 0.76;
    const xs = [-22.2, -19.7, -17.2, -14.7];
    this.seats = [];
    for (let row = 0; row < 4; row++) {
      const z = -27.4 + row * 1.5;
      const ph = row * 0.2;
      if (row > 0) this.box(-17.8, 0, z + 0.3, 12.1, ph, 1.5, null, { parent: g, collideList: cols.list, tex: 'wood', tint: '#8a6a4c', walkable: true });
      this.box(-18.2, ph + deskH - 0.06, z, 10.4, 0.06, 0.5, null, { parent: g, collideList: cols.list, tex: 'wood', tint: '#c49a72' });
      this.box(-18.2, ph, z - 0.2, 10.3, deskH - 0.06, 0.06, null, { parent: g, collide: false, tex: 'wood', tint: '#a07850' });
      this.box(-18.2, ph, z + 0.62, 10.3, 0.45, 0.32, null, { parent: g, collide: false, tex: 'wood', tint: '#7a5a3e' });
      this.box(-18.2, ph + 0.45, z + 0.8, 10.3, 0.4, 0.05, null, { parent: g, collide: false, tex: 'wood', tint: '#7a5a3e' });
      xs.forEach((x, c) => {
        this.seats.push({ pos: new THREE.Vector3(x, ph, z + 0.6), desk: new THREE.Vector3(x, ph + deskH, z) });
        if ((row + c) % 2 === 0) {
          this.box(x - 0.3, ph + deskH, z, 0.3, 0.03, 0.22, ['#1e4d8b', '#8b1e2d', '#2d7a3a', '#333'][(row + c) % 4], { parent: g, collide: false });
          this.box(x + 0.25, ph + deskH, z - 0.02, 0.32, 0.02, 0.22, '#2a2a2a', { parent: g, collide: false, roughness: 0.3 });
        }
      });
    }
    this.playerSeatIndex = 6;
    const ps = this.seats[this.playerSeatIndex];
    const marker = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.35), new THREE.MeshStandardMaterial({ color: '#ffd84a', emissive: '#ffb800', emissiveIntensity: 0.6 }));
    marker.position.set(ps.desk.x + 0.1, ps.desk.y + 0.02, ps.desk.z);
    g.add(marker);
    // Lectern, faculty table, projector screen and projector
    this.box(-12.8, 0, -29.3, 0.8, 1.05, 0.6, null, { parent: g, collideList: cols.list, tex: 'wood', tint: '#6e4a2e' });
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.7), texturedMaterial('wood', { tint: '#6e4a2e' }));
    top.position.set(-12.8, 1.12, -29.25);
    top.rotation.x = 0.25;
    g.add(top);
    this.box(-16, 0, -29.7, 2.6, 0.78, 0.8, null, { parent: g, collideList: cols.list, tex: 'wood', tint: '#9a7050' });
    this.box(-15.4, 0.78, -29.6, 0.36, 0.02, 0.26, '#2a2a2a', { parent: g, collide: false });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.1), new THREE.MeshStandardMaterial({ color: '#f4f6f8', roughness: 0.6, emissive: '#2a3550', emissiveIntensity: 0.15 }));
    screen.position.set(-10.6, 1.95, -30.86);
    g.add(screen);
    const slide = makeLabel('Lecture slides · Week 1', { bg: 'rgba(30,60,120,0.95)', color: '#ffffff', size: 36, height: 0.32 });
    slide.position.set(-10.6, 2.65, -30.8);
    g.add(slide);
    this.box(-10.6, 3.0, -30.82, 3.6, 0.1, 0.1, '#3a3a3a', { parent: g, collide: false, metalness: 0.5 });
    this.box(-16, WALL_H - 0.45, -25, 0.45, 0.18, 0.38, '#d9d9d9', { parent: g, collide: false });
    this.box(-16, WALL_H - 0.27, -25, 0.05, 0.27, 0.05, '#bbbbbb', { parent: g, collide: false });
  }

  // ---------- School ↔ college ----------
  setMode(mode) {
    if (mode !== 'school' && mode !== 'college') return;
    if (mode === 'college' && !this.collegeGroup) this.buildCollegeDecor();
    this.mode = mode;
    const college = mode === 'college';
    for (const o of this.schoolOnly) o.visible = !college;
    if (this.collegeGroup) this.collegeGroup.visible = college;
    for (const c of this.collegeColliders || []) c.enabled = college;
    for (const r of ROOMS) {
      if (r.id === 'classroom') continue;
      if (!r.collegeName) continue;
      r.labelSprite.visible = !college;
      if (!r.collegeLabel) {
        r.collegeLabel = makeLabel(r.collegeName, { height: 0.42 });
        r.collegeLabel.position.copy(r.labelSprite.position);
        this.collegeGroup.add(r.collegeLabel);
      }
    }
    this.setClassroomLabel();
  }

  setClock(minutes) {
    if (!this.clockHands) return;
    const m = ((minutes % 720) + 720) % 720;
    const hourA = (m / 720) * Math.PI * 2;
    const minA = ((m % 60) / 60) * Math.PI * 2;
    for (const { hour, minute } of this.clockHands) {
      hour.rotation.z = -hourA;
      minute.rotation.z = -minA;
    }
  }

  buildCollegeDecor() {
    const grp = new THREE.Group();
    this.collegeGroup = grp;
    this.scene.add(grp);
    this.collegeColliders = [];
    const opt = (o = {}) => ({ parent: grp, collideList: this.collegeColliders, ...o });
    const NAMES = {
      staffroom: 'Faculty Chambers', principal: "Director's Office", library: 'Central Library',
      sciencelab: 'Physics · Chemistry · Biology Labs', washroom: 'Washrooms', classroomB: 'Tutorial Room',
      complab: 'Computer Programming Lab', auditorium: 'Auditorium', reception: 'Academic Registration',
    };
    for (const [id, n] of Object.entries(NAMES)) this.rooms[id].collegeName = n;

    // Signage
    const sign = (text, x, y, z, o) => {
      const sp = makeLabel(text, o);
      sp.position.set(x, y, z);
      grp.add(sp);
      return sp;
    };
    sign('BITS PILANI', 0, 4.3, 52, { size: 64, height: 0.8, bg: 'rgba(28,44,92,0.94)' });
    sign('Campus Shuttle', -14, 3.5, 44, { height: 0.45, bg: 'rgba(40,40,40,0.8)' });
    sign('Central Lawns', 0, 3.6, -14.5, { height: 0.45 });
    sign('ANC · All Night Canteen', -36, 3.9, 5.5, { height: 0.5, bg: 'rgba(20,24,40,0.85)' });
    sign('Maggi · Parathas · Chai · Cold coffee', -36, 2.35, 5.6, { height: 0.32, bg: 'rgba(47,93,58,1)', color: '#fff7d6' });
    sign('Main Building', -2, WALL_H + 4.45, -16.85, { size: 56, height: 0.62, bg: 'rgba(110,70,40,0.95)', color: '#fff4dc' });

    // Central lawns over the old assembly paving
    const lawn = new THREE.Mesh(worldPlane(21, 12, TEX_SIZE.grass), texturedMaterial('grass', { tint: '#c8e6a8' }));
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.set(0, 0.018, -2.5);
    lawn.receiveShadow = true;
    grp.add(lawn);

    this.buildClockTower(grp);
    this.buildHostel(grp, opt);
    this.buildCnot(grp, opt, sign);
  }

  buildClockTower(grp) {
    const stone = '#e6cfa3';
    const trim = '#c9a774';
    const X = 3.5;
    const Z = -24.2;
    const base = WALL_H + 3.7;
    const tb = (x, y, z, w, h, d, color, tex = null) => {
      const m = tex
        ? new THREE.Mesh(worldBoxGeometry(w, h, d, TEX_SIZE[tex]), texturedMaterial(tex, { tint: color }))
        : new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
      m.position.set(x, y + h / 2, z);
      m.castShadow = true;
      m.receiveShadow = true;
      grp.add(m);
      return m;
    };
    tb(X, base, Z, 6.4, 1.2, 6.4, stone, 'plasterWhite');
    tb(X, base + 1.2, Z, 6.8, 0.3, 6.8, trim);
    tb(X, base + 1.5, Z, 4.6, 11, 4.6, stone, 'plasterWhite');
    // Vertical pilasters and slit windows on the shaft
    for (const [dx, dz] of [[-2.3, -2.3], [2.3, -2.3], [-2.3, 2.3], [2.3, 2.3]]) tb(X + dx, base + 1.5, Z + dz, 0.5, 11, 0.5, trim);
    for (let i = 0; i < 3; i++) {
      for (const [dx, dz, w, d] of [[0, 2.32, 0.5, 0.06], [0, -2.32, 0.5, 0.06], [2.32, 0, 0.06, 0.5], [-2.32, 0, 0.06, 0.5]]) {
        tb(X + dx, base + 3 + i * 3, Z + dz, w, 1.6, d, '#3a3030');
      }
    }
    const clockBase = base + 12.5;
    tb(X, clockBase, Z, 5.4, 0.4, 5.4, trim);
    tb(X, clockBase + 0.4, Z, 5, 3.4, 5, stone, 'plasterWhite');
    tb(X, clockBase + 3.8, Z, 5.6, 0.4, 5.6, trim);
    // Clock faces with hands
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const g2 = c.getContext('2d');
    g2.fillStyle = '#fbf6e8';
    g2.beginPath(); g2.arc(128, 128, 122, 0, Math.PI * 2); g2.fill();
    g2.lineWidth = 8; g2.strokeStyle = '#3a2a1a'; g2.stroke();
    g2.fillStyle = '#2a1e12';
    g2.font = '600 30px Georgia, serif';
    g2.textAlign = 'center';
    g2.textBaseline = 'middle';
    const numerals = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    numerals.forEach((n, i) => {
      const a = (i / 12) * Math.PI * 2;
      g2.fillText(n, 128 + Math.sin(a) * 92, 128 - Math.cos(a) * 92);
    });
    const faceTex = new THREE.CanvasTexture(c);
    faceTex.colorSpace = THREE.SRGBColorSpace;
    const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.6, transparent: true });
    const handMat = mat('#1f1a14', { roughness: 0.4 });
    this.clockHands = [];
    const cy = clockBase + 2.1;
    for (const rot of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const holder = new THREE.Group();
      holder.position.set(X, cy, Z);
      holder.rotation.y = rot;
      const face = new THREE.Mesh(new THREE.CircleGeometry(1.45, 40), faceMat);
      face.position.z = 2.52;
      holder.add(face);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.48, 0.07, 8, 40), mat(trim));
      ring.position.z = 2.52;
      holder.add(ring);
      const mk = (len, width) => {
        const pivot = new THREE.Group();
        pivot.position.z = 2.56;
        const hand = new THREE.Mesh(new THREE.BoxGeometry(width, len, 0.03), handMat);
        hand.position.y = len / 2 - 0.08;
        pivot.add(hand);
        holder.add(pivot);
        return pivot;
      };
      this.clockHands.push({ hour: mk(0.8, 0.09), minute: mk(1.2, 0.06) });
      grp.add(holder);
    }
    // Open belfry with corner pillars, then a dome and finial
    const bel = clockBase + 4.2;
    for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) tb(X + dx, bel, Z + dz, 0.6, 2.6, 0.6, stone, 'plasterWhite');
    for (const [dx, dz] of [[0, -2], [0, 2], [-2, 0], [2, 0]]) tb(X + dx, bel + 2.1, Z + dz, dx ? 0.4 : 3.4, 0.5, dz ? 0.4 : 3.4, trim);
    tb(X, bel + 2.6, Z, 5, 0.35, 5, trim);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(2.1, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat(stone, { roughness: 0.7 }));
    dome.position.set(X, bel + 2.95, Z);
    dome.scale.set(1, 1.35, 1);
    dome.castShadow = true;
    grp.add(dome);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.2, 12), mat(trim));
    spire.position.set(X, bel + 2.95 + 2.8 + 1.1, Z);
    spire.castShadow = true;
    grp.add(spire);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), mat('#d4af37', { metalness: 0.8, roughness: 0.3 }));
    ball.position.set(X, bel + 2.95 + 2.8 + 2.3, Z);
    grp.add(ball);
    this.setClock(9 * 60);
  }

  buildHostel(grp, opt) {
    const x0 = 34;
    const x1 = 54;
    const z0 = 44.6;
    const z1 = 50.6;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const floors = 3;
    const fh = 3;
    this.box(cx, 0, cz, x1 - x0, floors * fh, z1 - z0, null, opt({ tex: 'plaster', tint: '#ecd8b8' }));
    this.box(cx, floors * fh, cz, x1 - x0 + 0.4, 0.7, z1 - z0 + 0.4, null, opt({ tex: 'plasterWhite', collide: false }));
    this.box(cx, 0, z0 - 0.02, x1 - x0, 0.9, 0.05, null, opt({ tex: 'dado', collide: false }));
    const clothes = ['#e74c3c', '#3498db', '#f1c40f', '#ecf0f1', '#9b59b6', '#2ecc71', '#e67e22'];
    for (let f = 0; f < floors; f++) {
      const y = f * fh;
      for (let x = x0 + 1.6; x < x1 - 1; x += 3.3) {
        const k = Math.round(x * 3 + f * 7);
        this.box(x, y + 0.2 + (f ? 0 : 0.8), z0 - 0.03, f ? 1 : 1.2, f ? 2.2 : 1.2, 0.05, f ? '#5a4030' : '#2c4254', opt({ collide: false, roughness: 0.3, cast: false }));
        if (f > 0) {
          this.box(x, y, z0 - 0.5, 2.6, 0.12, 1, null, opt({ tex: 'concrete', collide: false }));
          this.box(x, y + 0.12, z0 - 0.98, 2.6, 0.9, 0.05, '#d8d2c4', opt({ collide: false }));
          this.box(x, y + 1.7, z0 - 0.8, 2.4, 0.015, 0.015, '#666', opt({ collide: false, cast: false }));
          for (let i = 0; i < 3; i++) {
            if ((k + i) % 2) continue;
            const cl = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.55), new THREE.MeshStandardMaterial({ color: clothes[(k + i) % clothes.length], side: THREE.DoubleSide, roughness: 0.95 }));
            cl.position.set(x - 0.8 + i * 0.8, y + 1.42, z0 - 0.8);
            cl.castShadow = true;
            grp.add(cl);
          }
        }
      }
    }
    this.box(cx, 0, z0 - 0.6, 2.4, 2.4, 1.2, null, opt({ tex: 'plasterWhite' }));
    this.box(cx, 0.05, z0 - 1.21, 1.4, 2.1, 0.04, '#4a3020', opt({ collide: false }));
    const s = makeLabel('Hostel', { height: 0.6, bg: 'rgba(90,40,30,0.92)', color: '#fff4dc' });
    s.position.set(cx, floors * fh + 1.2, z0 - 0.4);
    grp.add(s);
    this.cylIn(grp, x0 + 2, floors * fh + 0.7, cz, 0.9, 1.0, 1.6, '#1d1f22');
  }

  cylIn(grp, x, y, z, rTop, rBottom, h, color) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, 18), mat(color));
    m.position.set(x, y + h / 2, z);
    m.castShadow = true;
    grp.add(m);
    return m;
  }

  buildCnot(grp, opt, sign) {
    const shops = [['Stationery', '#2e6fb5'], ['Juice Corner', '#e67e22'], ['Xerox', '#7f8c8d'], ['Dhaba', '#c0392b']];
    shops.forEach(([name, color], i) => {
      const x = -40.5 + i * 3.6;
      const z = 48.8;
      this.box(x, 0, z, 3.2, 2.7, 3, null, opt({ tex: 'plasterWhite', tint: '#efe6d6' }));
      this.box(x, 0, z - 1.52, 2.6, 0.95, 0.05, null, opt({ tex: 'wood', collide: false }));
      this.box(x, 0.95, z - 1.55, 2.6, 0.05, 0.4, '#d9d4cc', opt({ collide: false }));
      this.box(x, 1.05, z - 1.52, 2.4, 1.3, 0.04, '#2a2520', opt({ collide: false, cast: false }));
      const awning = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.06, 1.1), mat(color, { roughness: 0.8 }));
      awning.position.set(x, 2.55, z - 1.95);
      awning.rotation.x = 0.28;
      awning.castShadow = true;
      grp.add(awning);
      for (let k = 0; k < 4; k++) {
        const item = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.25, 0.15), mat(['#f1c40f', '#e74c3c', '#3498db', '#2ecc71'][(k + i) % 4]));
        item.position.set(x - 0.75 + k * 0.5, 1.12, z - 1.5);
        grp.add(item);
      }
      sign(name, x, 3.2, z - 1.6, { height: 0.32, bg: color, color: '#ffffff' });
    });
    sign("C'not", -35, 4.3, 47.2, { size: 60, height: 0.6, bg: 'rgba(25,25,25,0.85)', color: '#ffd84a' });
  }

  // Animated details: fans, the flag, and an indoor light that follows the player between rooms.
  update(dt, playerPos) {
    this.time += dt;
    for (const f of this.fans) f.rotation.y += dt * 9;
    if (this.flagGeo) {
      const p = this.flagGeo.attributes.position;
      const b = this.flagBase;
      for (let i = 0; i < p.count; i++) {
        const x = b[i * 3] + 0.9;
        p.setZ(i, Math.sin(x * 3.2 - this.time * 4.5) * 0.09 * x + Math.sin(b[i * 3 + 1] * 2 + this.time * 2) * 0.02 * x);
      }
      p.needsUpdate = true;
      this.flagGeo.computeVertexNormals();
    }
    if (this.globe) this.globe.rotation.y += dt * 0.3;
    if (playerPos) {
      const room = this.roomAt(playerPos.x, playerPos.z);
      if (room) {
        const r = this.rooms[room];
        this.indoorLight.position.set((r.x0 + r.x1) / 2, WALL_H - 0.4, (r.z0 + r.z1) / 2);
        this.indoorLight.intensity = 14;
        this.indoorLight.distance = Math.max(r.x1 - r.x0, r.z1 - r.z0) * 1.1;
      } else this.indoorLight.intensity = 0;
    }
  }

  allColliders() {
    return this.classroomColliders ? this.colliders.concat(this.classroomColliders) : this.colliders;
  }

  roomAt(x, z) {
    for (const r of ROOMS) if (x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) return r.id;
    return null;
  }

  pathTo(from, targetRoomId, point) {
    const pts = [];
    const fromRoom = this.roomAt(from.x, from.z);
    if (fromRoom && fromRoom !== targetRoomId) {
      const r = this.rooms[fromRoom];
      pts.push(r.inside.clone(), r.outside.clone());
    }
    if (targetRoomId && fromRoom !== targetRoomId) {
      const r = this.rooms[targetRoomId];
      pts.push(r.outside.clone(), r.inside.clone());
    }
    pts.push(point.clone());
    return pts;
  }

  objectivePoint(location) {
    if (this.rooms[location]) return this.rooms[location].outside;
    if (location === 'assembly') return this.spots.assemblyPlayer;
    if (location === 'playground') return new THREE.Vector3(38, 0, 9);
    if (location === 'canteen') return new THREE.Vector3(-36, 0, 9);
    if (location === 'gate') return new THREE.Vector3(0, 0, 50);
    if (location === 'auditorium') return this.rooms.auditorium.outside;
    return null;
  }
}
