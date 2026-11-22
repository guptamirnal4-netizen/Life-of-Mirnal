// The paintball match in 3D: the local player with client-side prediction and server reconciliation, remote
// players interpolated between server snapshots, paintballs in flight, splats, paint bursts and sounds.
// The server decides everything that counts (movement, hits, paint, tags); this only shows it.
import * as THREE from 'three';
import { INPUT_DT, stepMove, sanitizeInput } from '../sim.js';
import { MOVE, TEAMS, MODES_BY_ID } from '../rules.js';
import { EQUIPMENT_BY_ID } from '../equipment.js';
import { blaster, equip, poseAim, paintball, splatGeometry } from '../models.js';
import { makeAvatar, disposeAvatar, lookKey } from './avatar.js';
import * as sfx from './sounds.js';

const INTERP_MS = 110;
const MAX_SPLATS = 160;
const ACTIVE = new Set(['landing', 'countdown', 'playing', 'overtime']);
const FAR = 260; // m: players further than this are not drawn (Campus Royale is 1.8 km long)
const LOD = 70; // m: beyond this, no arm pose (cheaper)
const DOWN_SPEED = 0.3; // js/paintball/royale.js ROYALE.downSpeed

export class MatchView {
  constructor({ scene, camera, arena, player, room }) {
    this.scene = scene; this.camera = camera; this.arena = arena; this.player = player; this.room = room;
    this.avatars = new Map();
    this.balls = new Map(); // shot id → { mesh, v, g, life }
    this.splats = []; this.splatGeos = Array.from({ length: 10 }, (_, i) => splatGeometry(i + 1, 1));
    this.splatMats = new Map();
    this.bursts = [];
    this.pos = { x: 0, y: 0, z: 0, vy: 0 }; this.smooth = new THREE.Vector3();
    this.pending = []; this.seq = 0; this.acc = 0; this.lastServer = '';
    this.fireHeld = false; this.reloadPressed = false; this.slot = 0; this.zoom = false; this.view = 'first';
    this.fx = new THREE.Group(); this.fx.name = 'pb-fx'; scene.add(this.fx);
    this.vm = null; this.vmId = null; // first-person blaster
    this.me = null; this.placed = false;
    this.sendBuf = [];
    this.unsub = [
      room.onMessage('shot', (m) => this.onShot(m)),
      room.onMessage('impact', (m) => this.onImpact(m)),
    ];
  }

  // ---------- local player ----------
  inputFrom(keys, frozen) {
    const p = this.player; const k = (...c) => c.some((x) => keys.has(x));
    let f = (k('KeyW', 'ArrowUp') ? 1 : 0) - (k('KeyS', 'ArrowDown') ? 1 : 0);
    let s = (k('KeyD', 'ArrowRight') ? 1 : 0) - (k('KeyA', 'ArrowLeft') ? 1 : 0);
    const sm = Math.hypot(p.stick.x, p.stick.y);
    if (sm > 0.15) { f = p.stick.y; s = p.stick.x; }
    const run = sm > 0.15 ? sm > 0.9 : k('ShiftLeft', 'ShiftRight');
    return sanitizeInput({ seq: ++this.seq, f, s, run, jump: k('Space') && !frozen, fire: this.fireHeld && !frozen, reload: this.reloadPressed, slot: this.slot, yaw: p.yaw, pitch: p.pitch });
  }

  step(dt, state, keys) {
    const me = state.players.get(this.room.sessionId); this.me = me;
    if (!me) return;
    const live = state.phase === 'playing' || state.phase === 'overtime';
    const frozen = !live || !me.alive || me.out;
    this.mul = me.down ? DOWN_SPEED : 1;
    if (!this.placed || !ACTIVE.has(state.phase)) {
      Object.assign(this.pos, { x: me.x, y: me.y, z: me.z, vy: me.vy }); this.smooth.set(0, 0, 0);
      if (!this.placed && ACTIVE.has(state.phase)) { this.player.yaw = me.yaw; this.player.pitch = 0; this.placed = true; this.slot = me.slot; this.seq = Math.max(this.seq, me.seq); }
    }
    this.reconcile(me, frozen);
    this.acc = Math.min(this.acc + dt, INPUT_DT * 5);
    while (this.acc >= INPUT_DT) {
      this.acc -= INPUT_DT;
      if (!ACTIVE.has(state.phase)) continue;
      const i = this.inputFrom(keys, frozen);
      this.reloadPressed = false;
      stepMove(this.pos, i, INPUT_DT, this.arena, frozen, this.mul);
      this.pending.push(i); this.sendBuf.push(i);
    }
    if (this.pending.length > 90) this.pending.splice(0, this.pending.length - 90);
    if (this.sendBuf.length && this.room.connection.isOpen) { this.room.send('in', this.sendBuf); this.sendBuf = []; }
    this.smooth.multiplyScalar(Math.exp(-dt * 12));
  }

  // The server's word on where we are: take it, then replay the inputs it has not applied yet.
  reconcile(me, frozen) {
    const key = `${me.seq}|${me.x}|${me.y}|${me.z}|${me.vy}`;
    if (key === this.lastServer) return;
    this.lastServer = key;
    const before = { ...this.pos };
    this.pos.x = me.x; this.pos.y = me.y; this.pos.z = me.z; this.pos.vy = me.vy;
    this.pending = this.pending.filter((i) => i.seq > me.seq);
    for (const i of this.pending) stepMove(this.pos, i, INPUT_DT, this.arena, frozen, this.mul || 1);
    const d = Math.hypot(before.x - this.pos.x, before.y - this.pos.y, before.z - this.pos.z);
    if (d < 2) this.smooth.add(new THREE.Vector3(before.x - this.pos.x, before.y - this.pos.y, before.z - this.pos.z));
    else this.smooth.set(0, 0, 0); // respawn or a big correction: snap
  }

  get eye() { return new THREE.Vector3(this.pos.x + this.smooth.x, this.pos.y + this.smooth.y + MOVE.eye, this.pos.z + this.smooth.z); }

  camera3(dt, state) {
    const cam = this.camera; const p = this.player;
    const eye = this.eye;
    const zoomed = this.zoom && this.me && EQUIPMENT_BY_ID[this.me.equip]?.zoom;
    const fov = zoomed ? 72 / EQUIPMENT_BY_ID[this.me.equip].zoom : 72;
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov += (fov - cam.fov) * Math.min(1, dt * 14); cam.updateProjectionMatrix(); }
    const alive = this.me?.alive && ACTIVE.has(state.phase);
    if (this.view === 'third' || !alive) {
      const back = alive ? 3.2 : 5.5; const up = alive ? 0.45 : 2.2;
      const fx = -Math.sin(p.yaw) * Math.cos(p.pitch); const fz = -Math.cos(p.yaw) * Math.cos(p.pitch); const fy = Math.sin(p.pitch);
      const rx = Math.cos(p.yaw); const rz = -Math.sin(p.yaw);
      cam.position.set(eye.x - fx * back + rx * 0.55, Math.max(0.4, eye.y + up - fy * back), eye.z - fz * back + rz * 0.55);
    } else cam.position.copy(eye);
    cam.rotation.set(p.pitch, p.yaw, 0, 'YXZ');
    // first-person paintball blaster
    const id = this.me?.equip;
    const show = alive && this.view === 'first' && !zoomed;
    if (id && id !== this.vmId) {
      if (this.vm) cam.remove(this.vm);
      this.vm = blaster(id); this.vm.rotation.y = Math.PI; this.vm.scale.setScalar(0.85); this.vmId = id;
      this.vm.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.renderOrder = 5; } });
      cam.add(this.vm);
    }
    if (this.vm) {
      this.vm.visible = !!show;
      const reload = this.me && this.me.reloadUntil > state.now ? 0.25 : 0;
      this.kick = Math.max(0, (this.kick || 0) - dt * 6);
      this.vm.position.set(0.24, -0.24 - reload, -0.5 + this.kick * 0.05);
      this.vm.rotation.x = reload * 1.4 + this.kick * 0.1;
    }
  }

  // ---------- everyone else (and my body in third person) ----------
  avatarsUpdate(dt, state, nowMs) {
    const teams = MODES_BY_ID[state.mode]?.teams || 0;
    const seen = new Set();
    for (const [id, p] of state.players) {
      seen.add(id);
      const maskColour = teams && p.team >= 0 ? TEAMS[p.team].colour : null;
      let a = this.avatars.get(id);
      const key = lookKey(p, maskColour);
      if (a && a.key !== key) { disposeAvatar(a.npc); this.avatars.delete(id); a = null; }
      if (!a) {
        const npc = makeAvatar(this.scene, { ...p.toJSON?.() ?? p, nickname: p.nickname, equip: p.equip }, { id: `pb-${id}`, maskColour });
        a = { npc, key, snaps: [], equip: p.equip, marks: [] };
        this.avatars.set(id, a);
      }
      if (a.equip !== p.equip) { equip(a.npc, p.equip); a.equip = p.equip; }
      const mine = id === this.room.sessionId;
      const far = !mine && Math.hypot(p.x - this.camera.position.x, p.z - this.camera.position.z) > FAR;
      const visible = ACTIVE.has(state.phase) && p.alive && !p.out && !far && (!mine || (this.view === 'third'));
      a.npc.group.visible = visible;
      if (!visible) { if (!p.alive && a.marks.length) this.clearMarks(a); continue; }
      let x; let y; let z; let yaw; let pitch; let speed;
      if (mine) {
        x = this.pos.x + this.smooth.x; y = this.pos.y + this.smooth.y; z = this.pos.z + this.smooth.z; yaw = this.player.yaw; pitch = this.player.pitch;
        const prev = a.prev || { x, z }; speed = Math.hypot(x - prev.x, z - prev.z) / Math.max(dt, 1e-3); a.prev = { x, z };
      } else {
        const last = a.snaps[a.snaps.length - 1];
        if (!last || last.x !== p.x || last.y !== p.y || last.z !== p.z || last.yaw !== p.yaw || last.pitch !== p.pitch) {
          if (last && Math.hypot(last.x - p.x, last.z - p.z) > 4) a.snaps.length = 0; // respawned: no sliding across the arena
          a.snaps.push({ t: nowMs, x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch });
          if (a.snaps.length > 30) a.snaps.shift();
        }
        const rt = nowMs - INTERP_MS; const s = a.snaps;
        let i = s.length - 1; while (i > 0 && s[i - 1].t > rt) i--;
        const A = s[Math.max(0, i - 1)]; const B = s[i];
        const k = B.t === A.t ? 1 : Math.min(1, Math.max(0, (rt - A.t) / (B.t - A.t)));
        x = A.x + (B.x - A.x) * k; y = A.y + (B.y - A.y) * k; z = A.z + (B.z - A.z) * k;
        let dy = B.yaw - A.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); yaw = A.yaw + dy * k; pitch = A.pitch + (B.pitch - A.pitch) * k;
        speed = B.t === A.t ? 0 : Math.hypot(B.x - A.x, B.z - A.z) / ((B.t - A.t) / 1000);
      }
      const walking = speed > 0.6;
      a.npc.gait = speed > MOVE.walk + 0.5 ? 'run' : 'walk';
      a.npc.poseAs({ x, y, z }, yaw, walking && !p.down, false, dt, a.npc.gait, speed);
      const lod = !mine && Math.hypot(x - this.camera.position.x, z - this.camera.position.z) > LOD;
      if (!lod) poseAim(a.npc, pitch);
      // fully painted, waiting for a squadmate: lying down
      a.npc.group.rotation.x = p.down ? -1.35 : 0;
      if (p.down) a.npc.group.position.y = y + 0.3;
      a.npc.tag.visible = !mine;
      // spawn protection: a soft blink
      const prot = p.protectedUntil > state.now;
      a.npc.group.visible = !prot || Math.floor(nowMs / 120) % 2 === 0;
    }
    for (const [id, a] of this.avatars) if (!seen.has(id)) { disposeAvatar(a.npc); this.avatars.delete(id); }
  }

  avatarAt(id) { return this.avatars.get(id); }

  // ---------- paintballs and paint ----------
  onShot(m) {
    const e = EQUIPMENT_BY_ID[m.e]; if (!e) return;
    const mesh = paintball(e.colour);
    mesh.scale.setScalar(m.e === 'launcher' ? 2.6 : m.e === 'spread' ? 0.8 : 1);
    mesh.position.set(m.x, m.y, m.z);
    // my own paintballs start at the blaster's muzzle, not between my eyes
    if (m.o === this.room.sessionId) { mesh.position.y -= 0.16; this.kick = 1; }
    this.fx.add(mesh);
    this.balls.set(m.i, { mesh, v: new THREE.Vector3(m.vx, m.vy, m.vz), g: e.gravity, life: e.range / e.speed + 1.5 });
    const d = this.camera.position.distanceTo(mesh.position);
    if (!m.i || !this.lastPop || performance.now() - this.lastPop > 25) { sfx.pop({ standard: 1, rapid: 1.3, burst: 1.1, spread: 0.8, precision: 1.5, launcher: 0.55 }[m.e] || 1, 1 / (1 + d * 0.08)); this.lastPop = performance.now(); }
  }

  onImpact(m) {
    const b = this.balls.get(m.i);
    if (b) { this.fx.remove(b.mesh); this.balls.delete(m.i); }
    if (m.k === 'drop' || m.x === undefined) return;
    const e = EQUIPMENT_BY_ID[m.e]; const colour = e?.colour || '#ff3d7f';
    const pt = new THREE.Vector3(m.x, m.y, m.z); const n = new THREE.Vector3(m.nx, m.ny, m.nz);
    const big = e?.splash ? e.splash * 0.35 : 0.22 + Math.random() * 0.1;
    if (m.k === 'player') { const a = this.avatars.get(m.t); if (a && a.npc.group.visible) this.markAvatar(a, pt, n, colour); } else this.addSplat(pt, n, colour, big);
    this.burst(pt, n, colour, e?.splash ? 26 : 8, e?.splash ? 5 : 2.5);
    sfx.splat(1 / (1 + this.camera.position.distanceTo(pt) * 0.1));
  }

  splatMat(colour) {
    if (!this.splatMats.has(colour)) this.splatMats.set(colour, new THREE.MeshStandardMaterial({ color: colour, roughness: 0.35, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, side: THREE.DoubleSide }));
    return this.splatMats.get(colour);
  }
  addSplat(pt, n, colour, r) {
    let m;
    if (this.splats.length >= MAX_SPLATS) { m = this.splats.shift(); m.material = this.splatMat(colour); } else { m = new THREE.Mesh(this.splatGeos[0], this.splatMat(colour)); m.renderOrder = 2; this.fx.add(m); }
    m.geometry = this.splatGeos[Math.floor(Math.random() * this.splatGeos.length)];
    m.scale.setScalar(r);
    m.position.copy(pt).addScaledVector(n, 0.012);
    m.lookAt(pt.clone().add(n));
    m.rotateZ(Math.random() * Math.PI * 2);
    this.splats.push(m);
  }
  markAvatar(a, pt, n, colour) {
    const m = new THREE.Mesh(this.splatGeos[a.marks.length % this.splatGeos.length], this.splatMat(colour));
    a.npc.group.updateMatrixWorld(true);
    const local = a.npc.group.worldToLocal(pt.clone().addScaledVector(n, 0.03));
    m.position.copy(local); m.scale.setScalar(0.13);
    const ln = n.clone().applyQuaternion(a.npc.group.quaternion.clone().invert());
    m.lookAt(local.clone().add(ln));
    a.npc.group.add(m); a.marks.push(m);
    if (a.marks.length > 8) a.npc.group.remove(a.marks.shift());
  }
  clearMarks(a) { for (const m of a.marks) a.npc.group.remove(m); a.marks.length = 0; }
  clearSplats() {
    for (const m of this.splats) this.fx.remove(m);
    this.splats.length = 0;
    for (const a of this.avatars.values()) this.clearMarks(a);
  }

  burst(pt, n, colour, count, speed) {
    const mat = this.splatMat(colour);
    if (!this.dropGeo) this.dropGeo = new THREE.SphereGeometry(0.035, 6, 4);
    for (let i = 0; i < count; i++) {
      const m = this.bursts.find((b) => !b.mesh.visible)?.mesh || null;
      const mesh = m || new THREE.Mesh(this.dropGeo, mat);
      if (!m) { this.fx.add(mesh); this.bursts.push({ mesh, v: new THREE.Vector3(), life: 0 }); }
      const b = this.bursts.find((x) => x.mesh === mesh);
      mesh.material = mat; mesh.visible = true; mesh.position.copy(pt);
      b.v.set(n.x + (Math.random() - 0.5) * 1.6, Math.abs(n.y) + Math.random() * 1.2, n.z + (Math.random() - 0.5) * 1.6).normalize().multiplyScalar(speed * (0.4 + Math.random() * 0.6));
      b.life = 0.35 + Math.random() * 0.35;
    }
  }

  fxUpdate(dt) {
    for (const [id, b] of this.balls) {
      b.v.y -= b.g * dt; b.mesh.position.addScaledVector(b.v, dt); b.life -= dt;
      if (b.life <= 0 || b.mesh.position.y < -1) { this.fx.remove(b.mesh); this.balls.delete(id); }
    }
    for (const b of this.bursts) {
      if (!b.mesh.visible) continue;
      b.v.y -= 12 * dt; b.mesh.position.addScaledVector(b.v, dt); b.life -= dt;
      if (b.life <= 0 || b.mesh.position.y < 0) b.mesh.visible = false;
    }
  }

  update(dt, state, keys, nowMs) {
    this.step(dt, state, keys);
    this.camera3(dt, state);
    this.avatarsUpdate(dt, state, nowMs);
    this.fxUpdate(dt);
  }

  dispose() {
    for (const u of this.unsub) u?.();
    for (const a of this.avatars.values()) disposeAvatar(a.npc);
    this.avatars.clear();
    if (this.vm) this.camera.remove(this.vm);
    this.scene.remove(this.fx);
    this.camera.fov = 72; this.camera.updateProjectionMatrix();
  }
}
