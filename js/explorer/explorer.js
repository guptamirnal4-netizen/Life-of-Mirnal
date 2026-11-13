import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { h, toast } from '../ui/dom.js';
import { BITS_CAMPUS as D } from '../../data/bits-campus.js';

// The 3D map: look round the school or BITS Pilani without playing. From above it works like a map (drag to move,
// right-drag to turn, scroll to zoom); pick a place from the list to fly to it, and "Walk inside" drops you in at
// its door to walk round on foot (the same collisions, stairs and interiors as the game). M goes back up.
// main.js owns the world, the player and the render loop; this owns the map camera, the place list and the UI.

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const centroid = (p) => [p.reduce((a, q) => a + q[0], 0) / p.length, p.reduce((a, q) => a + q[1], 0) / p.length];
const faceYaw = (from, to) => Math.atan2(-(to.x - from.x), -(to.z - from.z)); // the player looks down -z at yaw 0
const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`;
const partOfDay = (m) => (m < 12 * 60 ? 'Morning' : m < 16 * 60 ? 'Afternoon' : m < 19 * 60 ? 'Evening' : 'Night');

const WORLDS = {
  school: { title: 'Sunrise Public School', home: V(0, 0, 6), dist: 92, maxDist: 190, bounds: [-90, 90, -80, 100], range: { fogNear: 160, fogFar: 650, skyScale: 900 } },
  college: { title: 'BITS Pilani', home: V(60, 0, 300), dist: 760, maxDist: 1500, bounds: [-450, 720, -420, 1400], range: { fogNear: 170, fogFar: 720, skyScale: 1900 } },
};
const KIND = { hostel: '🏠', room: '🚪', building: '🏛️', place: '📍' };

// The places you can fly to in each world.
function schoolPlaces(campus) {
  const out = [];
  for (const r of Object.values(campus.rooms)) {
    if (!r.inside) continue;
    out.push({ name: r.name, kind: 'room', focus: V((r.x0 + r.x1) / 2, 0, (r.z0 + r.z1) / 2), size: Math.max(r.x1 - r.x0, r.z1 - r.z0), enter: { pos: r.inside.clone(), yaw: faceYaw(r.outside, r.inside), label: 'Walk inside' } });
  }
  const outdoor = [
    ['Main Gate', V(0, 0, 52), V(0, 0, 58), V(0, 0, 40)],
    ['Assembly Ground', V(0, 0, -12), V(0, 0, 0), V(0, 0, -14)],
    ['Playground', V(38, 0, -10), V(28, 0, -4), V(38, 0, -10)],
    ['Canteen', V(-36, 0, 5.5), V(-28, 0, 8), V(-36, 0, 5.5)],
    ['School Bus', V(-14, 0, 44), V(-8, 0, 48), V(-14, 0, 44)],
  ];
  for (const [name, focus, at, look] of outdoor) out.push({ name, kind: 'place', focus, size: 24, enter: { pos: at, yaw: faceYaw(at, look), label: 'Walk here' } });
  return out;
}

function collegePlaces(campus) {
  const out = [];
  const seen = new Set();
  const add = (p) => { if (!seen.has(p.name)) { seen.add(p.name); out.push(p); } };
  for (const H of campus.hostels) {
    const e = H.entrance;
    const focus = H.world(H.W / 2, H.L / 2);
    add({ name: H.name, kind: 'hostel', focus, size: Math.max(H.W, H.L), enter: e ? { pos: e.inside.clone(), yaw: faceYaw(e.out, e.inside), label: 'Walk inside' } : null });
  }
  for (const r of Object.values(campus.rooms)) {
    if (!r.inside || !r.outside) continue;
    add({ name: r.name, kind: 'room', focus: V((r.x0 + r.x1) / 2, 0, (r.z0 + r.z1) / 2), size: Math.max(r.x1 - r.x0, r.z1 - r.z0), enter: { pos: r.inside.clone(), yaw: faceYaw(r.outside, r.inside), label: 'Walk inside' } });
  }
  const walkTo = (x, z) => {
    const spot = campus.freeSpot(V(x, 0, z));
    return { pos: spot, yaw: faceYaw(spot, V(x, 0, z)), label: 'Walk here' };
  };
  for (const b of campus.buildings) {
    if (!b.name || !b.inCampus) continue;
    const [x, z] = centroid(b.outer);
    add({ name: b.name, kind: 'building', focus: V(x, 0, z), size: Math.max(b.bb.maxX - b.bb.minX, b.bb.maxZ - b.bb.minZ, (b.h || 10) * 1.3), enter: () => walkTo(x, z) });
  }
  const TALL = { 'BITS Clock Tower': 80 }; // stand back far enough to see all of it
  for (const p of D.pois) if (p.name) add({ name: p.name, kind: 'place', focus: V(p.x, 0, p.z), size: TALL[p.name] || 30, enter: () => walkTo(p.x, p.z) });
  for (const a of D.areas) {
    if (!a.name) continue;
    const [x, z] = centroid(a.poly);
    add({ name: a.name, kind: 'place', focus: V(x, 0, z), size: 60, enter: () => walkTo(x, z) });
  }
  return out;
}

export class Explorer {
  // hooks: setWorld(kind) → campus, walk(pos, yaw), toMap(), exit(), quality
  constructor({ camera, canvas, graphics, hooks }) {
    Object.assign(this, { camera, canvas, graphics, hooks });
    this.clock = 10 * 60;
    this.view = 'third';
    this.walking = false;
    this.fly = null;
    this.focus = V(0, 0, 0);
    this.controls = new MapControls(camera, canvas);
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.08, screenSpacePanning: false, maxPolarAngle: 1.38, minDistance: 6, zoomToCursor: true });
    this.controls.listenToKeyEvents(window);
    this.onDbl = (e) => this.dropIn(e);
    canvas.addEventListener('dblclick', this.onDbl);
    const sc = graphics.env.sun.shadow.camera;
    this.savedShadow = { left: sc.left, right: sc.right, top: sc.top, bottom: sc.bottom };
    this.buildUI();
  }

  start(kind = 'college') {
    this.setWorld(kind);
  }

  setWorld(kind) {
    this.kind = kind;
    const W = WORLDS[kind];
    this.campus = this.hooks.setWorld(kind);
    this.graphics.worldChanged(W.range);
    this.camera.far = kind === 'college' ? 3200 : 1400;
    this.camera.updateProjectionMatrix();
    this.places = kind === 'college' ? collegePlaces(this.campus) : schoolPlaces(this.campus);
    this.places.sort((a, b) => Object.keys(KIND).indexOf(a.kind) - Object.keys(KIND).indexOf(b.kind) || a.name.localeCompare(b.name));
    this.controls.maxDistance = W.maxDist;
    if (this.walking) this.toMap(false);
    this.controls.target.copy(W.home);
    this.camera.position.copy(W.home).add(V(-W.dist * 0.35, W.dist * 0.75, W.dist * 0.6));
    this.controls.update();
    this.selected = null;
    this.ui.title.textContent = W.title;
    for (const [k, b] of Object.entries(this.ui.tabs)) b.classList.toggle('on', k === kind);
    this.ui.search.value = '';
    this.renderList();
    this.renderCard();
  }

  // ---------- UI ----------
  buildUI() {
    const tab = (kind, label) => h('button', { class: 'ex-tab', onclick: () => { if (this.kind !== kind) this.switchTo(kind); } }, label);
    const tabs = { school: tab('school', '🎒 School'), college: tab('college', '🎓 BITS Pilani') };
    const title = h('div', { class: 'ex-title' });
    const search = h('input', { class: 'ex-search', type: 'search', placeholder: 'Search places…', oninput: () => this.renderList() });
    const list = h('div', { class: 'ex-list' });
    const card = h('div', { class: 'ex-card hidden' });
    const panel = h('div', { class: 'ex-panel' },
      h('div', { class: 'ex-head' }, h('b', {}, '🗺️ 3D Campus Map'), h('button', { class: 'ex-fold', title: 'Hide the list', onclick: () => panel.classList.toggle('folded') }, '☰')),
      h('div', { class: 'ex-tabs' }, tabs.school, tabs.college), title, search, list);
    const timeLabel = h('span', { class: 'ex-time-label' });
    const slider = h('input', { type: 'range', min: 330, max: 1290, step: 5, value: this.clock, oninput: () => { this.clock = +slider.value; this.renderTime(); } });
    const hint = h('div', { class: 'ex-hint' });
    const back = h('button', { class: 'primary ex-back hidden', onclick: () => this.toMap() }, '🗺️ Back to the map');
    const bar = h('div', { class: 'ex-bar' },
      h('label', { class: 'ex-time' }, '🕒', slider, timeLabel), hint, back,
      h('button', { class: 'ex-exit', onclick: () => this.hooks.exit() }, 'Exit'));
    const root = h('div', { id: 'explorer' }, panel, card, bar);
    document.body.append(root);
    this.ui = { root, panel, tabs, title, search, list, card, slider, timeLabel, hint, back };
    if (innerWidth < 700) panel.classList.add('folded');
    this.renderTime();
    this.renderHint();
  }

  switchTo(kind) {
    if (kind === 'college' && !this.hooks.collegeReady()) {
      toast('Building BITS Pilani at full scale…', 2000);
      setTimeout(() => this.setWorld(kind), 60); // let the toast paint first
    } else this.setWorld(kind);
  }

  renderTime() {
    this.ui.timeLabel.textContent = `${fmt(this.clock)} ${partOfDay(this.clock)}`;
  }

  renderHint() {
    const touch = document.body.classList.contains('touch');
    this.ui.hint.textContent = this.walking
      ? (touch ? 'Left stick to walk, drag to look' : 'WASD to walk · click to look with the mouse · Shift walks slowly · V view · M map')
      : (touch ? 'Drag to move · two fingers to turn and zoom · double-tap to walk there' : 'Drag to move · right-drag to turn · scroll to zoom · double-click the ground to walk there');
    this.ui.back.classList.toggle('hidden', !this.walking);
    this.ui.panel.classList.toggle('hidden', this.walking);
    if (this.walking) this.ui.card.classList.add('hidden');
  }

  renderList() {
    const q = this.ui.search.value.trim().toLowerCase();
    const items = this.places.filter((p) => !q || p.name.toLowerCase().includes(q));
    this.ui.list.replaceChildren(...items.map((p) => h('button', { class: `ex-item${p === this.selected ? ' on' : ''}`, onclick: () => this.select(p) }, `${KIND[p.kind]} ${p.name}`)));
    if (!items.length) this.ui.list.append(h('div', { class: 'ex-empty' }, 'No place by that name.'));
  }

  renderCard() {
    const p = this.selected;
    this.ui.card.classList.toggle('hidden', !p || this.walking);
    if (!p) return;
    const what = { hostel: 'Bhawan · walk-in: rooms, corridors, stairs and roof', room: 'Room with a furnished interior', building: 'Building', place: 'Place' }[p.kind];
    const label = typeof p.enter === 'function' ? 'Walk here' : p.enter?.label;
    this.ui.card.replaceChildren(
      h('b', {}, `${KIND[p.kind]} ${p.name}`), h('small', {}, what),
      h('div', { class: 'ex-card-row' },
        label && h('button', { class: 'primary', onclick: () => this.enter(p) }, label === 'Walk inside' ? '🚶 Walk inside' : '🚶 Walk here'),
        h('button', { onclick: () => this.flyTo(p) }, '🎯 Fly here'),
        h('button', { onclick: () => { this.selected = null; this.renderList(); this.renderCard(); } }, '✕')));
  }

  select(p) {
    this.selected = p;
    this.renderList();
    this.renderCard();
    this.flyTo(p);
    if (innerWidth < 700) this.ui.panel.classList.add('folded');
  }

  // ---------- camera ----------
  flyTo(p) {
    const c = this.controls;
    const d = THREE.MathUtils.clamp(p.size * 2.4, 40, 420);
    const dir = this.camera.position.clone().sub(c.target).setY(0);
    if (dir.lengthSq() < 1) dir.set(-1, 0, 1);
    dir.normalize().multiplyScalar(d * 0.62);
    const to = p.focus.clone();
    this.fly = { t: 0, t0: c.target.clone(), t1: to, p0: this.camera.position.clone(), p1: to.clone().add(dir).setY(d * 0.78) };
  }

  dropIn(e) {
    if (this.walking || !this.campus) return;
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hit = ray.ray.intersectPlane(new THREE.Plane(V(0, 1, 0), 0), V(0, 0, 0));
    if (!hit) return;
    const pos = this.campus.freeSpot ? this.campus.freeSpot(hit) : hit;
    const from = this.camera.position;
    this.walk(pos, Math.atan2(-(pos.x - from.x), -(pos.z - from.z)));
  }

  enter(p) {
    const e = typeof p.enter === 'function' ? p.enter() : p.enter;
    if (e) this.walk(e.pos, e.yaw, p.name);
  }

  walk(pos, yaw, name = null) {
    this.walking = true;
    this.fly = null;
    this.controls.enabled = false;
    this.restoreShadow();
    this.hooks.walk(pos.clone().setY(pos.y || 0), yaw);
    this.renderHint();
    if (name) toast(`🚶 ${name}. ${document.body.classList.contains('touch') ? '' : 'Click to look around with the mouse. '}M goes back to the map.`, 3500);
  }

  // Back up to the map above where you are.
  toMap(fromWalk = true) {
    if (!this.walking) return;
    this.walking = false;
    this.hooks.toMap();
    this.controls.enabled = true;
    if (fromWalk) {
      const p = this.hooks.playerPos().clone().setY(0);
      const dir = this.camera.position.clone().sub(p).setY(0);
      if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);
      dir.normalize().multiplyScalar(30);
      this.controls.target.copy(p);
      this.camera.position.copy(p).add(dir).setY(38);
    }
    this.controls.update();
    this.renderHint();
    this.renderCard();
  }

  key(e) {
    if (e.target instanceof HTMLInputElement) return;
    if (this.walking && (e.code === 'KeyM' || e.code === 'Tab')) { e.preventDefault(); this.toMap(); }
    if (this.walking && e.code === 'KeyV') this.view = this.view === 'third' ? 'first' : 'third';
  }

  restoreShadow() {
    const sc = this.graphics.env.sun.shadow.camera;
    Object.assign(sc, this.savedShadow);
    sc.updateProjectionMatrix();
  }

  // The point the lighting, shadows, labels and Bhawan interiors follow while flying.
  update(dt) {
    if (this.walking || !this.kind) return null; // (no world yet: BITS Pilani is still being built)
    const c = this.controls;
    if (this.fly) {
      const f = this.fly;
      f.t = Math.min(1, f.t + dt / 1.3);
      const k = f.t * f.t * (3 - 2 * f.t);
      c.target.lerpVectors(f.t0, f.t1, k);
      this.camera.position.lerpVectors(f.p0, f.p1, k);
      if (f.t >= 1) this.fly = null;
    }
    const [x0, x1, z0, z1] = WORLDS[this.kind].bounds;
    const t = c.target;
    const cx = THREE.MathUtils.clamp(t.x, x0, x1); const cz = THREE.MathUtils.clamp(t.z, z0, z1);
    if (cx !== t.x || cz !== t.z) { this.camera.position.x += cx - t.x; this.camera.position.z += cz - t.z; t.set(cx, 0, cz); }
    t.y = 0;
    c.update();
    // sun shadows cover what you look at, wider the higher you are (as in the film)
    const alt = this.camera.position.y;
    const sc = this.graphics.env.sun.shadow.camera;
    const span = THREE.MathUtils.clamp(alt * 1.6, -this.savedShadow.left * 2, 520);
    if (Math.abs(sc.right - span / 2) > 1) { sc.left = -span / 2; sc.right = span / 2; sc.top = span / 2; sc.bottom = -span / 2; sc.updateProjectionMatrix(); }
    this.focus.set(t.x, alt, t.z);
    return this.focus;
  }

  stop() {
    this.restoreShadow();
    this.controls.dispose();
    this.canvas.removeEventListener('dblclick', this.onDbl);
    this.ui.root.remove();
  }
}
