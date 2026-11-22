// Campus Royale in the browser: supply crates in the world (open with E, pick from the crate panel), paint bombs
// and colour smoke, the paint zone, the special supply drop, paint shields, the campus map (landing choice, big map
// on M, minimap), the inventory HUD, spectating. The server decides everything; this shows it and sends requests.
import * as THREE from 'three';
import { BITS_CAMPUS as D } from '../../../data/bits-campus.js';
import { CAMPUS } from '../arena.js';
import { ROYALE, readSpots } from '../royale.js';
import { ITEMS, SMOKE, KITS, SHIELD, SCAN } from '../items.js';
import { EQUIPMENT_BY_ID, PAINT_MAX } from '../equipment.js';
import { TEAMS, MODES_BY_ID, modeLabel } from '../rules.js';
import { stepBomb } from '../sim.js';
import { crateModel, itemModel, bombModel, PaintBurst, SmokeCloud, shieldBubble, dropMarker, zoneRing } from '../fx.js';
import { makeLabel } from '../../world/labels.js';
import { h, fmtTime } from './ui.js';
import * as sfx from './sounds.js';

const CRATE_NEAR = 150; // m: crates closer than this are in the world
const LABEL_NEAR = 14;
const teamColour = (t) => (t >= 0 ? TEAMS[t].colour : '#888');
const dirName = (dx, dz) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360 / 45) % 8];

export class RoyaleView {
  constructor(mode) {
    this.mode = mode; this.scene = mode.scene; this.camera = mode.camera;
    this.group = new THREE.Group(); this.group.name = 'pb-royale'; this.scene.add(this.group);
    this.crates = new Map(); // id → { c (crateModel), items: Group, label, key }
    this.bombs = new Map(); this.smokes = []; this.burst = new PaintBurst(this.group);
    this.zone = zoneRing(); this.group.add(this.zone.mesh);
    this.next = zoneRing({ colour: '#ffffff', height: 3 }); this.next.mesh.material.opacity = 0.35; this.group.add(this.next.mesh);
    this.drop = dropMarker(); this.drop.group.visible = false; this.group.add(this.drop.group);
    this.shields = new Map();
    this.panel = null; this.near = null; this.bigMap = false; this.scanSeen = null; this.spectating = null;
    this.landPick = null;
  }

  get room() { return this.mode.room; }
  get state() { return this.mode.state; }
  get me() { return this.mode.me; }

  attach(room) {
    this.unsub = [
      room.onMessage('bomb', (m) => this.onBomb(m)),
      room.onMessage('boom', (m) => this.onBoom(m)),
      room.onMessage('airdrop', (m) => { if (m.landed) { this.mode.note('📦 The special supply drop has landed!'); sfx.jingle(true); } else this.mode.note(`📦 Special supply drop incoming: ${this.placeName(m.x, m.z)}`); }),
      room.onMessage('scan', (m) => { this.scanSeen = m; this.mode.note(`📡 Paint scan: ${m.seen.length} opponent${m.seen.length === 1 ? '' : 's'} within ${SCAN.radius} m`); }),
      room.onMessage('opened', () => sfx.ding(false)),
      room.onMessage('picked', (m) => { this.mode.note(`✋ ${ITEMS[m.item]?.name || m.item}${m.n > 1 ? ` ×${m.n}` : ''}`); sfx.ding(true); this.mode.hudAt = 0; }),
      room.onMessage('out', (m) => { this.mode.feedPush(`❌ ${m.name} is out${m.placement ? ` (#${m.placement})` : ''}`, m.id === room.sessionId); }),
      room.onMessage('down', (m) => { this.mode.feedPush(`🎨 ${m.name} is fully painted: a squadmate can clean them off (E)`, m.id === room.sessionId); }),
      room.onMessage('revived', (m) => this.mode.feedPush(`🧽 ${m.byName} cleaned off ${m.name}`, m.id === room.sessionId || m.by === room.sessionId)),
      room.onMessage('landed', () => { this.hideLanding(); }),
      room.onMessage('shield', () => sfx.beep(true)),
    ];
  }

  // ---------- place names ----------
  placeName(x, z) {
    let best = 'open campus'; let bd = 1e9;
    for (const d of this.spots.drops) { const e = (d.x - x) ** 2 + (d.z - z) ** 2; if (e < bd) { bd = e; best = d.name; } }
    return best;
  }
  get spots() { if (!this._spots) this._spots = readSpots(CAMPUS.spots); return this._spots; }

  // ---------- world ----------
  update(dt, s, nowMs) {
    const me = this.me; if (!me || !CAMPUS.geo) return;
    const cam = this.camera.position;
    // crates near the camera
    const seen = new Set();
    for (const [id, c] of s.crates) {
      const d = Math.hypot(c.x - cam.x, c.z - cam.z);
      if (d > CRATE_NEAR) continue;
      seen.add(id);
      let v = this.crates.get(id);
      if (!v) {
        const m = crateModel({ kind: c.kind }); m.group.position.set(c.x, c.y, c.z);
        m.group.rotation.y = (Number(id.slice(1)) * 2.39996) % (Math.PI * 2);
        if (c.kind === 'pile') m.setOpen(1);
        this.group.add(m.group);
        v = { c: m, items: new THREE.Group(), key: '', label: null };
        m.group.add(v.items);
        this.crates.set(id, v);
      }
      if (c.opened && c.kind !== 'pile') v.c.openLid();
      v.c.update(dt);
      const key = [...c.items.values()].map((l) => l.item).join(',');
      if (key !== v.key) {
        v.key = key; v.items.clear();
        const list = [...c.items.values()];
        list.slice(0, 4).forEach((l, i) => { const m = itemModel(l.item); m.position.set((i - (Math.min(4, list.length) - 1) / 2) * 0.22, v.c.look.h - (c.kind === 'pile' ? 0 : 0.12), 0); m.scale.setScalar(0.8); v.items.add(m); });
        v.c.setEmpty(!list.length);
        if (v.label) { v.c.group.remove(v.label); v.label.material.map.dispose(); v.label.material.dispose(); v.label = null; }
        const first = list[0] && ITEMS[list[0].item];
        if (first) { v.label = makeLabel(`${first.icon} ${first.name}${list.length > 1 ? ` +${list.length - 1}` : ''}`, { height: 0.28, size: 36, bg: c.kind === 'drop' ? 'rgba(120,80,0,0.85)' : 'rgba(20,24,40,0.78)' }); v.label.position.y = v.c.look.h + 1.0; v.c.group.add(v.label); }
      }
      v.items.visible = c.opened || c.kind === 'pile';
      if (v.label) v.label.visible = d < LABEL_NEAR && d > 3 && c.items.size > 0;
      v.items.rotation.y += dt * 0.6;
    }
    for (const [id, v] of this.crates) if (!seen.has(id)) { this.group.remove(v.c.group); v.c.group.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); this.crates.delete(id); }
    // zone
    const Z = s.zone;
    this.zone.set(Z.x, Z.z, Z.r); this.zone.update(dt);
    this.next.set(Z.nx, Z.nz, Z.nr, 0); this.next.mesh.visible = s.phase !== 'landing' && Z.nr > 0.5 && Z.nr < Z.r - 1;
    // the special supply drop
    const A = s.airdrop;
    this.drop.group.visible = A.announced || A.landed;
    if (this.drop.group.visible) {
      const f = A.landed ? 1 : Math.max(0, Math.min(1, 1 - (A.at - s.now) / 12));
      this.drop.set(A.x, A.y, A.z, A.landed, f); this.drop.update(dt);
      this.drop.fall.visible = !A.landed && A.at - s.now < 12;
    }
    // bombs in flight (the shared simulation)
    for (const b of this.bombs.values()) { b.acc += dt; while (b.acc >= 0.02) { stepBomb(b.sim, 0.02, CAMPUS); b.acc -= 0.02; } b.mesh.position.set(b.sim.x, b.sim.y, b.sim.z); b.mesh.rotation.x += dt * 8; }
    this.smokes = this.smokes.filter((c) => c.update(dt));
    this.burst.update(dt);
    // paint shields on players
    for (const [id, p] of s.players) {
      const on = p.alive && p.shieldUntil > s.now;
      let sh = this.shields.get(id);
      if (on && !sh) { sh = shieldBubble(); this.group.add(sh.mesh); this.shields.set(id, sh); }
      if (sh) { sh.set(on); if (on) { const a = this.mode.view.avatars.get(id); const pos = id === this.room.sessionId ? this.mode.view.pos : a?.npc.group.position; if (pos) sh.mesh.position.set(pos.x, pos.y + 1, pos.z); sh.update(dt); } }
    }
    // what is within reach
    this.near = this.nearest(s, me);
    if (this.panel && (!this.near || this.near.id !== this.panel.id || !s.crates.has(this.panel.id))) this.closePanel();
    if (this.panel) this.renderPanel();
  }

  nearest(s, me) {
    if (!me.alive || me.out || me.down || !(s.phase === 'playing' || s.phase === 'countdown')) return null;
    const p = this.mode.view.pos; let best = null; let bd = ROYALE.pickRange;
    for (const [id, c] of s.crates) {
      const d = Math.hypot(c.x - p.x, c.z - p.z);
      if (d < bd && Math.abs(c.y - p.y) < ROYALE.pickRise && (c.items.size || !c.opened)) { bd = d; best = { id, c }; }
    }
    return best;
  }
  downMate(s, me) {
    if (!MODES_BY_ID[s.mode].teams || !me.alive || me.down) return null;
    const p = this.mode.view.pos;
    for (const [id, q] of s.players) if (id !== this.room.sessionId && q.team === me.team && q.down && !q.out && Math.hypot(q.x - p.x, q.z - p.z) < ROYALE.reviveRange) return id;
    return null;
  }

  onBomb(m) {
    const mesh = bombModel(m.k === 'smoke' ? '#b26bff' : '#ff3d7f'); mesh.position.set(m.x, m.y, m.z);
    this.group.add(mesh);
    this.bombs.set(m.i, { mesh, sim: { x: m.x, y: m.y, z: m.z, vx: m.vx, vy: m.vy, vz: m.vz, rest: false, bounces: 0 }, acc: 0 });
    sfx.pop(0.6, 0.6);
  }
  onBoom(m) {
    const b = this.bombs.get(m.i); if (b) { this.group.remove(b.mesh); this.bombs.delete(m.i); }
    const pt = new THREE.Vector3(m.x, m.y, m.z); const up = new THREE.Vector3(0, 1, 0);
    const d = this.camera.position.distanceTo(pt);
    if (m.k === 'smoke') { this.smokes.push(new SmokeCloud(this.group, pt, { radius: SMOKE.radius, duration: SMOKE.duration })); sfx.splat(0.6 / (1 + d * 0.05)); return; }
    this.burst.fire(pt, up, '#ff3d7f', 1.4); this.burst.fire(pt, up, '#ffd23d', 0.8);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; this.mode.view.addSplat(new THREE.Vector3(m.x + Math.cos(a) * (0.6 + Math.random() * 2.2), m.y + 0.02, m.z + Math.sin(a) * (0.6 + Math.random() * 2.2)), up, ['#ff3d7f', '#ffd23d', '#30d5ff'][i % 3], 0.5 + Math.random() * 0.5); }
    this.mode.view.addSplat(pt.clone().setY(m.y + 0.03), up, '#ff3d7f', 1.6);
    sfx.splat(1.5 / (1 + d * 0.05));
  }

  // ---------- requests ----------
  interact() {
    const s = this.state; const me = this.me; if (!s || !me) return;
    const mate = this.downMate(s, me);
    if (mate) { this.room.send('revive', { id: mate }); return; }
    const n = this.near; if (!n) return;
    if (!this.panel) { this.room.send('open', { id: n.id }); this.openPanel(n.id); return; }
    const first = [...n.c.items.keys()][this.panel.sel || 0];
    if (first) this.room.send('pick', { id: n.id, item: first });
  }
  take(i) { const n = this.near; if (!n) return; const uid = [...n.c.items.keys()][i]; if (uid) this.room.send('pick', { id: n.id, item: uid }); }
  throwBomb(kind = 'paintbomb') { this.room.send('throw', { kind }); }
  clean() { const me = this.me; if (!me) return; const k = me.kit > 0 && (me.paint >= 45 || me.wipes === 0) ? 'kit' : 'wipes'; this.room.send('use', { kind: k }); }
  gadget(kind) { this.room.send('use', { kind }); }

  key(e) {
    const s = this.state; if (!s) return false;
    if (e.code === 'KeyM') { this.bigMap = !this.bigMap; return true; }
    if (s.phase === 'landing') return false;
    const me = this.me;
    if (me?.out) { if (e.code === 'KeyQ' || e.code === 'Space') { this.nextSpectate(); return true; } return false; }
    if (this.panel && /^Digit[1-9]$/.test(e.code)) { this.take(Number(e.code.slice(5)) - 1); return true; }
    switch (e.code) {
      case 'KeyE': this.interact(); return true;
      case 'KeyG': this.throwBomb('paintbomb'); return true;
      case 'KeyB': this.throwBomb('smoke'); return true;
      case 'KeyH': this.clean(); return true;
      case 'KeyC': this.gadget('shield'); return true;
      case 'KeyZ': this.gadget('scan'); return true;
      case 'KeyX': this.room.send('drop', { what: 'blaster' }); return true;
      default: return false;
    }
  }

  // ---------- spectating ----------
  watchTarget(s) {
    const alive = [...s.players.entries()].filter(([, p]) => p.alive && !p.out);
    if (!alive.length) return null;
    const me = this.me;
    if (!this.spectating || !alive.some(([id]) => id === this.spectating)) {
      const mate = alive.find(([, p]) => MODES_BY_ID[s.mode].teams && p.team === me.team);
      this.spectating = (mate || alive[0])[0];
      this.room.send('spectate', { id: this.spectating });
    }
    return this.spectating;
  }
  nextSpectate() {
    const s = this.state; const alive = [...s.players.entries()].filter(([, p]) => p.alive && !p.out).map(([id]) => id);
    if (!alive.length) return;
    this.spectating = alive[(alive.indexOf(this.spectating) + 1) % alive.length];
    this.room.send('spectate', { id: this.spectating });
  }
  // camera behind the watched player (after the match view placed it)
  spectateCam() {
    const s = this.state; const id = this.watchTarget(s); if (!id) return null;
    const a = this.mode.view.avatars.get(id); const p = s.players.get(id);
    if (!a || !p) return null;
    const pos = a.npc.group.position; const yaw = p.yaw;
    const fx = -Math.sin(yaw); const fz = -Math.cos(yaw);
    this.camera.position.set(pos.x - fx * 4.2, pos.y + 2.4, pos.z - fz * 4.2);
    this.camera.lookAt(pos.x + fx * 4, pos.y + 1.3, pos.z + fz * 4);
    a.npc.group.visible = true;
    return { x: pos.x, y: pos.y, z: pos.z, name: p.nickname };
  }

  // ---------- the crate panel ----------
  openPanel(id) { this.panel = { id, sel: 0, el: h('div', { class: 'pb-crate', 'data-pb': 'crate-panel' }), sig: '' }; this.mode.hud?.root.append(this.panel.el); }
  closePanel() { this.panel?.el.remove(); this.panel = null; }
  renderPanel() {
    const s = this.state; const c = s.crates.get(this.panel.id); if (!c) return;
    const list = [...c.items.entries()];
    const sig = JSON.stringify(list.map(([u, l]) => [u, l.item, l.n]));
    if (sig === this.panel.sig) return;
    this.panel.sig = sig;
    const title = c.kind === 'drop' ? '📦 Special supply drop' : c.kind === 'pile' ? '🎒 Dropped supplies' : '📦 Supply crate';
    this.panel.el.replaceChildren(h('b', {}, title),
      ...(list.length ? list.map(([u, l], i) => { const it = ITEMS[l.item]; return h('button', { class: 'pb-crate-item', 'data-pb-item': l.item, onclick: () => this.room.send('pick', { id: this.panel.id, item: u }) }, h('span', { class: 'k' }, String(i + 1)), h('span', { class: 'dot', style: `background:${it?.colour || '#888'}` }), `${it?.icon || ''} ${it?.name || l.item}${l.n > 1 ? ` ×${l.n}` : ''}`); }) : [h('div', { class: 'pb-note' }, 'Empty.')]),
      h('div', { class: 'pb-note' }, this.mode.touch.on ? 'Tap an item to take it.' : 'Press 1–9 (or E for the first) to take an item.'));
  }

  // ---------- landing ----------
  showLanding() {
    if (this.landing) return;
    const cv = h('canvas', { class: 'pb-landmap', 'data-pb': 'landing-map' });
    const info = h('div', { class: 'pb-landinfo' });
    const el = h('div', { class: 'pb-landing', 'data-pb': 'landing' }, h('h2', {}, '🪂 Pick your landing spot'), info, cv,
      h('div', { class: 'pb-note' }, 'Click (or tap) anywhere on campus: you land on the nearest verified spot. Squads land together on the pick of whoever chose last. No pick? You are placed far from everyone.'));
    this.landing = { el, cv, info };
    cv.addEventListener('pointerdown', (e) => {
      const r = cv.getBoundingClientRect(); const w = this.mapXform(cv);
      const x = w.ix((e.clientX - r.left) * (cv.width / r.width)); const z = w.iz((e.clientY - r.top) * (cv.height / r.height));
      this.room.send('land', { x, z }); this.landPick = { x, z };
    });
    document.body.append(el);
    if (document.pointerLockElement) document.exitPointerLock();
  }
  hideLanding() { this.landing?.el.remove(); this.landing = null; }
  updateLanding(s) {
    if (!this.landing) this.showLanding();
    const L = this.landing; const cv = L.cv;
    const W = Math.min(innerWidth - 32, 900); const Hh = Math.min(innerHeight - 170, 1000);
    const scale = Math.min(W / 1100, Hh / 1790);
    const cw = Math.round(1100 * scale); const ch = Math.round(1790 * scale);
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    this.drawMap(cv, s, { landing: true });
    const me = this.me; const d = me && me.drop >= 0 ? this.spots.drops[me.drop] : null;
    L.info.textContent = `Landing in ${Math.max(0, Math.ceil(s.phaseEnds - s.now))} s · ${d ? `your spot: ${d.name}` : 'no spot picked yet'}`;
  }

  // ---------- maps ----------
  // the campus base map, drawn once: lawns, roads, buildings, water, the boundary wall (the gameplay boundary)
  base() {
    if (this._base) return this._base;
    const geo = CAMPUS.geo; const b = geo.bbox; const S = 0.75;
    const cv = document.createElement('canvas'); cv.width = Math.ceil((b.maxX - b.minX) * S); cv.height = Math.ceil((b.maxZ - b.minZ) * S);
    const g = cv.getContext('2d');
    const X = (x) => (x - b.minX) * S; const Z = (z) => (z - b.minZ) * S;
    const poly = (pts) => { g.beginPath(); pts.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z)))); g.closePath(); };
    g.fillStyle = '#3d5a35'; g.fillRect(0, 0, cv.width, cv.height);
    g.save(); poly(geo.boundary); g.clip();
    g.fillStyle = '#6f9a54'; g.fillRect(0, 0, cv.width, cv.height);
    for (const a of D.areas) { g.fillStyle = { grass: '#7fae5e', pitch: '#86b864', ground: '#b9a27a', track: '#c0704f', wood: '#557f45', pool: '#4fb4e6', water: '#4f8fa0', shivganga: '#7fae5e' }[a.kind] || '#7fae5e'; poly(a.poly); g.fill(); }
    g.strokeStyle = '#e8e2d2'; g.lineCap = 'round';
    for (const r of D.roads) { g.lineWidth = Math.max(2, (r.w || 6) * S); g.beginPath(); r.pts.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z)))); g.stroke(); }
    for (const w of geo.water) { g.fillStyle = '#4f9fc0'; poly(w.poly); g.fill(); }
    for (const r of geo.rings) { g.strokeStyle = '#4f9fc0'; g.lineWidth = (r.r[1] - r.r[0]) * S; g.beginPath(); g.arc(X(r.c[0]), Z(r.c[1]), ((r.r[0] + r.r[1]) / 2) * S, 0, Math.PI * 2); g.stroke(); }
    for (const p of geo.pits) { g.fillStyle = 'rgba(60,50,40,0.45)'; poly(p.poly); g.fill(); }
    g.fillStyle = '#d8c9b0'; g.strokeStyle = '#8a7a62'; g.lineWidth = 1;
    for (const bd of D.buildings) { if (!bd.inCampus) continue; poly(bd.outer); g.fill(); g.stroke(); }
    g.restore();
    g.strokeStyle = '#ffffff'; g.lineWidth = 3; poly(geo.boundary); g.stroke();
    this._base = { cv, S, b };
    return this._base;
  }
  // world ↔ canvas for a canvas showing the whole campus
  mapXform(cv) {
    const { b } = this.base(); const sx = cv.width / (b.maxX - b.minX); const sz = cv.height / (b.maxZ - b.minZ); const k = Math.min(sx, sz);
    const ox = (cv.width - (b.maxX - b.minX) * k) / 2; const oz = (cv.height - (b.maxZ - b.minZ) * k) / 2;
    return { k, X: (x) => ox + (x - b.minX) * k, Z: (z) => oz + (z - b.minZ) * k, ix: (px) => (px - ox) / k + b.minX, iz: (pz) => (pz - oz) / k + b.minZ };
  }
  drawMap(cv, s, { landing = false } = {}) {
    const g = cv.getContext('2d'); const B = this.base(); const w = this.mapXform(cv);
    g.fillStyle = '#0b1020'; g.fillRect(0, 0, cv.width, cv.height);
    g.drawImage(B.cv, w.X(B.b.minX), w.Z(B.b.minZ), (B.b.maxX - B.b.minX) * w.k, (B.b.maxZ - B.b.minZ) * w.k);
    this.overlay(g, w, s, { landing, radius: 3.5, labels: true });
  }
  // zone, next zone, supply drop, teammates, me, landing picks, near crates, scanned opponents
  overlay(g, w, s, { landing = false, radius = 3, labels = false, me: mePos = null } = {}) {
    const me = this.me; const teams = MODES_BY_ID[s.mode].teams; const myId = this.room.sessionId;
    const Z = s.zone;
    if (!landing || Z.r < 2000) {
      g.save(); g.beginPath(); g.rect(-5, -5, g.canvas.width + 10, g.canvas.height + 10); g.arc(w.X(Z.x), w.Z(Z.z), Z.r * w.k, 0, Math.PI * 2, true); g.fillStyle = 'rgba(255,61,127,0.22)'; g.fill('evenodd'); g.restore();
      g.strokeStyle = '#ff3d7f'; g.lineWidth = 2; g.beginPath(); g.arc(w.X(Z.x), w.Z(Z.z), Z.r * w.k, 0, Math.PI * 2); g.stroke();
      if (Z.nr > 0.5 && Z.nr < Z.r - 1) { g.strokeStyle = '#ffffff'; g.setLineDash([5, 4]); g.beginPath(); g.arc(w.X(Z.nx), w.Z(Z.nz), Z.nr * w.k, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); }
    }
    if (landing) {
      g.fillStyle = 'rgba(255,255,255,0.55)';
      for (const d of this.spots.drops) { g.fillRect(w.X(d.x) - 1, w.Z(d.z) - 1, 2, 2); }
      for (const [id, p] of s.players) {
        if (p.drop < 0 || (teams && p.team !== me?.team && id !== myId) || (!teams && id !== myId)) continue;
        const d = this.spots.drops[p.drop]; if (!d) continue;
        g.fillStyle = teams ? teamColour(p.team) : '#ffd23d'; g.beginPath(); g.arc(w.X(d.x), w.Z(d.z), 7, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff'; g.font = '700 12px system-ui'; g.fillText(`${id === myId ? 'You' : p.nickname} · ${d.name}`, w.X(d.x) + 9, w.Z(d.z) + 4);
      }
      return;
    }
    const A = s.airdrop;
    if (A.announced || A.landed) { g.fillStyle = '#ffd23d'; g.strokeStyle = '#ff3d7f'; g.lineWidth = 2; g.beginPath(); g.rect(w.X(A.x) - 5, w.Z(A.z) - 5, 10, 10); g.fill(); g.stroke(); if (labels) { g.fillStyle = '#fff'; g.font = '700 12px system-ui'; g.fillText('📦 supply drop', w.X(A.x) + 8, w.Z(A.z) + 4); } }
    // crates near you
    const p0 = mePos || this.mode.view.pos;
    g.fillStyle = '#30d5ff';
    for (const c of s.crates.values()) if (c.items.size && Math.hypot(c.x - p0.x, c.z - p0.z) < 60) { g.fillRect(w.X(c.x) - 1.5, w.Z(c.z) - 1.5, 3, 3); }
    if (this.scanSeen && s.now < this.scanSeen.until) { g.fillStyle = '#ff3d7f'; for (const q of this.scanSeen.seen) { g.beginPath(); g.arc(w.X(q.x), w.Z(q.z), radius + 1, 0, Math.PI * 2); g.fill(); } }
    for (const [id, p] of s.players) {
      if (id === myId || !p.alive || p.out || !(teams && p.team === me?.team)) continue;
      g.fillStyle = teamColour(p.team); g.beginPath(); g.arc(w.X(p.x), w.Z(p.z), radius, 0, Math.PI * 2); g.fill();
    }
    if (me && (me.alive || me.out)) {
      const v = mePos || this.mode.view.pos; const yaw = this.mode.player.yaw;
      g.save(); g.translate(w.X(v.x), w.Z(v.z)); g.rotate(-yaw); g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 5); g.lineTo(-5, 5); g.closePath(); g.fill(); g.stroke(); g.restore();
    }
  }
  // the minimap: a north-up crop around you
  drawMini(cv, s, pos) {
    const g = cv.getContext('2d'); const B = this.base(); const R = 90; // m shown each way
    const k = cv.width / (2 * R);
    const w = { k, X: (x) => (x - pos.x) * k + cv.width / 2, Z: (z) => (z - pos.z) * k + cv.height / 2 };
    g.fillStyle = '#0b1020'; g.fillRect(0, 0, cv.width, cv.height);
    g.drawImage(B.cv, (pos.x - R - B.b.minX) * B.S, (pos.z - R * (cv.height / cv.width) - B.b.minZ) * B.S, 2 * R * B.S, 2 * R * (cv.height / cv.width) * B.S, 0, 0, cv.width, cv.height);
    this.overlay(g, w, s, { radius: 3, me: pos });
  }
  drawBig(cv, s, pos) {
    const W = Math.min(innerWidth - 40, 720); const Hh = innerHeight - 90; const scale = Math.min(W / 1100, Hh / 1790);
    const cw = Math.round(1100 * scale); const ch = Math.round(1790 * scale);
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    const g = cv.getContext('2d'); const B = this.base(); const w = this.mapXform(cv);
    g.fillStyle = '#0b1020'; g.fillRect(0, 0, cv.width, cv.height);
    g.drawImage(B.cv, w.X(B.b.minX), w.Z(B.b.minZ), (B.b.maxX - B.b.minX) * w.k, (B.b.maxZ - B.b.minZ) * w.k);
    this.overlay(g, w, s, { radius: 4, labels: true, me: pos });
  }

  // ---------- HUD ----------
  hudParts() {
    const q = (cls) => h('div', { class: cls });
    return { inv: q('pb-inv'), zone: q('pb-zoneinfo'), left: q('pb-left'), drop: q('pb-dropinfo'), prompt: q('pb-prompt'), channel: h('div', { class: 'pb-channel' }, h('i')), big: h('canvas', { class: 'pb-bigmap hidden', 'data-pb': 'big-map' }) };
  }
  updateHud(H, s, me, pos) {
    const mode = MODES_BY_ID[s.mode]; const teams = mode.teams;
    // inventory: blasters, throwables, cleaning, gadgets, gear
    const slot = (b, i) => { const e = EQUIPMENT_BY_ID[b]; return h('span', { class: `slot${me.slot === i && b ? ' sel' : ''}${b ? '' : ' empty'}`, style: e ? `--c:${e.colour}` : '' }, e ? `${i + 1} ${e.short} ${i ? me.hopper1 : me.hopper0}/${i ? me.carried1 : me.carried0}` : `${i + 1} empty`); };
    const cnt = (icon, n, key, title) => h('span', { class: `cnt${n ? '' : ' none'}`, title }, `${icon}${n}`, key && h('small', {}, key));
    H.inv.replaceChildren(slot(me.primary, 0), slot(me.secondary, 1),
      cnt('💣', me.paintbomb, 'G', 'Paint bombs'), cnt('☁️', me.smoke, 'B', 'Colour-smoke bombs'), cnt('🧻', me.wipes, 'H', 'Cleaning wipes'), cnt('🧴', me.kit, 'H', 'Cleaning kits'), cnt('🛡️', me.shield, 'C', 'Paint shield'), cnt('📡', me.scan, 'Z', 'Paint-scan pulse'),
      h('span', { class: `cnt${me.gearMask ? '' : ' none'}` }, `🥽L${me.gearMask}`), h('span', { class: `cnt${me.gearVest ? '' : ' none'}` }, `🦺L${me.gearVest}`));
    H.inv.dataset.bombs = String(me.paintbomb);
    const root = this.mode.hud?.root;
    if (root) { root.classList.toggle('landing', s.phase === 'landing'); root.classList.toggle('out', !!me.out); }
    const tb = document.querySelector('#pb-touch .p-bomb'); if (tb) tb.dataset.n = String(me.paintbomb);
    const tc = document.querySelector('#pb-touch .p-clean'); if (tc) tc.dataset.n = String(me.wipes + me.kit);
    // zone
    const Z = s.zone; const left = Math.max(0, Z.ends - s.now);
    const dOut = Math.hypot(pos.x - Z.x, pos.z - Z.z) - Z.r;
    let zt = s.phase !== 'playing' ? 'Paint zone: the whole campus' : Z.shrinking ? `🎨 Paint zone closing · ${fmtTime(left)}` : Z.r > 0.5 ? `🎨 Paint zone shrinks in ${fmtTime(left)}` : '🎨 Paint zone closed';
    if (dOut > 0 && s.phase === 'playing') {
      const dx = Z.x - pos.x; const dz = Z.z - pos.z; const ang = Math.atan2(dx, -dz) + this.mode.player.yaw;
      zt += ` · OUTSIDE: ${Math.round(dOut)} m to safety ${'⬆↗➡↘⬇↙⬅↖'[Math.round(((ang * 180) / Math.PI + 720) % 360 / 45) % 8]} (+${Z.dps}/s paint)`;
    } else if (!Z.shrinking && left < 20 && s.phase === 'playing' && Z.r > 0.5) zt += ' · get inside the white circle!';
    H.zone.textContent = zt; H.zone.classList.toggle('warn', dOut > 0 && s.phase === 'playing');
    H.left.textContent = `👥 ${s.standing} left${teams ? ` · ${s.groups} squads` : ''} · ${modeLabel(mode, s.players.size)} · Campus Royale`;
    // the special supply drop
    const A = s.airdrop;
    if (A.landed) H.drop.textContent = `📦 Supply drop landed ${Math.round(Math.hypot(A.x - pos.x, A.z - pos.z))} m ${dirName(A.x - pos.x, A.z - pos.z)}`;
    else if (A.announced) H.drop.textContent = `📦 Supply drop in ${fmtTime(A.at - s.now)} · ${Math.round(Math.hypot(A.x - pos.x, A.z - pos.z))} m ${dirName(A.x - pos.x, A.z - pos.z)}`;
    else H.drop.textContent = '';
    H.drop.style.display = H.drop.textContent ? '' : 'none';
    // prompt + channel
    let prompt = '';
    const mate = this.downMate(s, me);
    if (me.out) prompt = `👀 Spectating ${s.players.get(this.spectating)?.nickname || ''} · ${this.mode.touch.on ? 'tap 👁' : 'Q / Space'}: next player`;
    else if (mate) prompt = `E · clean off ${s.players.get(mate)?.nickname}`;
    else if (this.near && !this.panel) { const c = this.near.c; const first = [...c.items.values()][0]; prompt = c.opened ? (first ? `E · take ${ITEMS[first.item]?.name}${c.items.size > 1 ? ` (+${c.items.size - 1} more: E opens the crate)` : ''}` : 'Empty crate') : `E · open the ${c.kind === 'drop' ? 'supply drop' : 'supply crate'}`; }
    H.prompt.textContent = prompt; H.prompt.style.display = prompt ? '' : 'none';
    const ch = me.channel;
    H.channel.style.display = ch ? '' : 'none';
    if (ch) { const tot = ch === 'revive' ? ROYALE.revive : KITS[ch]?.time || 1; H.channel.firstChild.style.width = `${100 * (1 - Math.max(0, me.channelUntil - s.now) / tot)}%`; H.channel.dataset.label = { wipes: 'Cleaning (wipes)…', kit: 'Cleaning (kit)…', revive: 'Cleaning off your squadmate…' }[ch]; }
    H.big.classList.toggle('hidden', !this.bigMap);
    if (this.bigMap) this.drawBig(H.big, s, pos);
  }

  dispose() {
    for (const u of this.unsub || []) u?.();
    this.closePanel(); this.hideLanding();
    this.burst.dispose();
    this.scene.remove(this.group);
  }
}
