// The film: "Play with BITSians", a ~3½-minute cinematic opening in the style of a multiplayer battle-game trailer,
// played in the game engine on the real-scale BITS Pilani campus. It shows one Campus Royale match (the whole campus
// as a paintball arena, js/paintball/royale.js) and only what the game really does: the landing map, supply crates
// with their opening lid and crate panel, the six paintball blasters, paint bombs, the paint shield, the special
// supply drop, the shrinking paint zone, squad clean-offs, round eliminations and the results screen.
//
// Everything on screen is a pure function of the film time t: a shot list (scenes → shots) gives each shot a
// duration, a time of day, a camera move, the players' blocking (positions, runs and gestures as functions of shot
// time), paintballs in flight, paint bombs, bursts, splats, crates and the overlays. Game state (inventories,
// paint, tags, scores, the feed, the zone) is rebuilt from the shots' events at load, so seeking to any t gives the
// same frame (seek(t) = set up the shot, pose it at t). The scrub bar, the scenes list, "Resume the film" and
// dev/render-film.mjs (fixed dt, frame by frame) rely on that.
import * as THREE from 'three';
import { buildCast, gear, pose, CAST, CAST_BY_ID, SQUADS, teamColour } from './cast.js';
import { FilmUI } from './film-ui.js';
import { Droplets, bombAt, bombSplats, boundaryRibbon, crateProp, zoneRings, airdropProp, shieldProp, bombProp, splatProp, seeded, ROYALE_SPOTS_URL } from './film-fx.js';
import { paintball, blaster as blasterModel } from '../paintball/models.js';
import { EQUIPMENT_BY_ID, PAINT_MAX } from '../paintball/equipment.js';
import { ITEMS, pickupPlan, SHIELD, rollAirdrop } from '../paintball/items.js';
import { ROYALE, ZONE_PHASES, planZone, zoneAt } from '../paintball/royale.js';
import { SCORE } from '../paintball/rules.js';
import { BITS_CAMPUS as D } from '../../data/bits-campus.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const curve = (pts) => (pts.length === 2 ? new THREE.LineCurve3(V(...pts[0]), V(...pts[1])) : new THREE.CatmullRomCurve3(pts.map((p) => V(...p)), false, 'centripetal'));
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const EASE = {
  linear: (u) => u,
  inOut: (u) => 0.5 - 0.5 * Math.cos(Math.PI * u),
  glide: (u) => (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u)) * 0.7 + u * 0.3,
  out: (u) => 1 - (1 - u) * (1 - u),
  in: (u) => u * u,
};
const hm = (h, m = 0) => h * 60 + m;
const FILM_RANGE = { fogNear: 420, fogFar: 1700, skyScale: 2400 };
const WIDE_RANGE = { fogNear: 1500, fogFar: 4200, skyScale: 4400 };

// ---------- the match ----------
// Campus Royale, 2v2v2v2v2 (five squads of two), on the whole campus. The zone is planned by the real planZone()
// from the campus centre to a verified final spot (registry drop 300, "near M Lawns") with a fixed seed; the special
// supply drop lands at registry drop 594 (an outdoor landing spot inside the zone of its time, as pickAirdrop picks).
const BB = { minX: Math.min(...D.boundary.map((p) => p[0])), maxX: Math.max(...D.boundary.map((p) => p[0])), minZ: Math.min(...D.boundary.map((p) => p[1])), maxZ: Math.max(...D.boundary.map((p) => p[1])) };
export const MATCH = {
  mode: '2v2v2v2v2',
  centre: { x: (BB.minX + BB.maxX) / 2, z: (BB.minZ + BB.maxZ) / 2 },
  final: { x: 117, z: -13 }, // royale-spots.json drop 300 (a final-zone centre)
  airdrop: { x: 108, y: 0, z: 18, name: 'near M Lawns' }, // drop 594
  landing: { x: 84, z: 4, name: 'near M Lawns' }, // drop 10, Pink's pick
  seed: 10936,
};
MATCH.startR = Math.ceil(Math.max(...[[BB.minX, BB.minZ], [BB.maxX, BB.minZ], [BB.minX, BB.maxZ], [BB.maxX, BB.maxZ]].map(([x, z]) => Math.hypot(x - MATCH.centre.x, z - MATCH.centre.z)))) + 10;
MATCH.circles = planZone(seeded(MATCH.seed), { centre: MATCH.centre, startR: MATCH.startR, final: MATCH.final });
// zone at match time mt (seconds into play), in the room-state shape the HUD and maps use
export function zoneState(mt) {
  const z = zoneAt(MATCH.circles, Math.max(0, mt), ZONE_PHASES, 1);
  return { x: z.x, z: z.z, r: z.r, nx: z.next.x, nz: z.next.z, nr: z.next.r, shrinking: z.shrinking, ends: z.ends, phase: z.phase, dps: z.dps };
}

export const SCENES = [
  { id: 'reveal', title: 'Arena Reveal' },
  { id: 'deploy', title: 'Deployment & Supply Hunting' },
  { id: 'loadout', title: 'Loadout & Preparation' },
  { id: 'start', title: 'The Match Begins' },
  { id: 'encounter', title: 'First Encounters' },
  { id: 'drop', title: 'Supply Drop & Arena Pressure' },
  { id: 'final', title: 'Final Showdown' },
  { id: 'winner', title: 'Winner & Results' },
];
export const FILM_NAME = 'PLAY WITH BITSIANS';
export const FILM_LINE = 'Enter the Arena. Gear Up. Paint Your Way to Victory.';

export class PaintballFilm {
  // world: { scene, camera, campus (BitsCampus), graphics, range, hooks: { paintball(opts) } }
  constructor(world) {
    Object.assign(this, world);
    this.t = 0;
    this.index = -1;
    this.paused = false;
    this.floorAt = this.campus?.floorAt ? (x, z, y) => this.campus.floorAt(x, z, y) : null;
    this.shots = this.buildShots();
    let at = 0;
    for (const s of this.shots) { s.t0 = at; at += s.dur; s.t1 = at; }
    this.duration = at;
    this.buildTimeline();
  }

  // ---------- lifecycle ----------
  start({ onEnd = null, capture = false, music = null, at = 0, paused = false } = {}) {
    this.onEnd = onEnd;
    this.capturing = capture;
    this.saved = { far: this.camera.far, fov: this.camera.fov, near: this.camera.near };
    this.camera.far = 3200;
    this.graphics.env.envStep = 1;
    this.graphics.env.setRange(FILM_RANGE); this.rangeKey = FILM_RANGE;
    // the live game's HUD styles (the film's overlays reuse them) and the verified landing/supply registries
    const css = [['pb-css', 'css/paintball.css'], ['pb-royale-css', 'css/paintball-royale.css']].map(([id, href]) => {
      let l = document.getElementById(id);
      if (!l) { l = document.createElement('link'); l.id = id; l.rel = 'stylesheet'; l.href = href; document.head.append(l); return new Promise((r) => { l.onload = r; l.onerror = r; }); }
      return Promise.resolve();
    });
    this.spots = null;
    const spots = fetch(ROYALE_SPOTS_URL).then((r) => r.json()).then((s) => { this.spots = s; }).catch(() => {});
    this.ready = Promise.all([...css, spots]);
    this.cast = buildCast(this.scene);
    this.by = Object.fromEntries(this.cast.map((n) => [n.cast.id, n]));
    this.balls = Array.from({ length: 64 }, () => { const b = paintball('#ffffff'); b.visible = false; b.scale.setScalar(1.6); this.scene.add(b); return b; });
    this.ballMats = new Map();
    this.fxRoot = new THREE.Group(); this.fxRoot.name = 'film-fx'; this.scene.add(this.fxRoot);
    this.props = new THREE.Group(); this.fxRoot.add(this.props);
    this.drops = new Droplets(this.fxRoot);
    this.boundary = boundaryRibbon(this.floorAt); this.fxRoot.add(this.boundary.mesh);
    this.zone = zoneRings(); this.fxRoot.add(this.zone.zone.mesh, this.zone.next.mesh);
    this.air = airdropProp(); this.fxRoot.add(this.air.group);
    this.shields = [shieldProp(), shieldProp()]; for (const s of this.shields) this.fxRoot.add(s.mesh);
    this.bombMeshes = [bombProp(), bombProp(), bombProp()]; for (const b of this.bombMeshes) { b.visible = false; this.fxRoot.add(b); }
    this.sprites = [];
    this.scene.traverse((o) => { if (o.isSprite) this.sprites.push([o, o.visible]); });
    this.ui = new FilmUI(this, { capture });
    if (music && !capture) { this.music = new Audio(music); this.music.preload = 'auto'; this.music.volume = 0.75; }
    this.done = false;
    this.paused = true;
    this.seek(Math.max(0, Math.min(at, this.duration - 0.05)));
    if (at > 3 && !capture) this.ui.resumed(this.t);
    if (capture) this.paused = false;
    else if (paused) this.pause();
    else this.play();
  }

  play() {
    if (this.done) return;
    if (this.t >= this.duration - 0.05) this.seek(0);
    this.paused = false;
    this.ui.audio.resume();
    if (this.music && !this.ui.muted) { try { this.music.currentTime = this.t; } catch { /* not loaded yet */ } this.music.play().catch(() => {}); }
    this.ui.sync();
  }

  pause() {
    this.paused = true;
    this.music?.pause();
    this.ui.sync();
    this.ui.remember();
  }

  toggle() { if (this.paused) this.play(); else this.pause(); }

  setMuted(m) {
    if (!this.music) return;
    if (m) this.music.pause(); else if (!this.paused) { try { this.music.currentTime = this.t; } catch { /* */ } this.music.play().catch(() => {}); }
  }

  // End now (Esc, ✕, the end of the film, or a game hotspot).
  finish(completed = false) {
    if (this.done) return;
    this.done = true;
    this.ui.remember(completed ? 0 : this.t);
    this.onEnd?.();
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    this.music?.pause(); this.music = null;
    this.ui?.dispose();
    for (const n of this.cast || []) n.dispose();
    for (const b of this.balls || []) this.scene.remove(b);
    this.clearProps();
    this.drops?.dispose(this.fxRoot);
    this.scene.remove(this.fxRoot);
    this.graphics.post.setDof(null);
    for (const [o, v] of this.sprites || []) o.visible = v;
    if (this.range) this.graphics.env.setRange(this.range);
    this.graphics.env.envStep = 4;
    Object.assign(this.camera, this.saved);
    this.camera.updateProjectionMatrix();
    const sun = this.graphics.env.sun.shadow.camera;
    if (this.savedShadow) { Object.assign(sun, this.savedShadow); sun.updateProjectionMatrix(); }
  }

  // Real-time playback. While the score plays, the film clock follows it so picture and music stay in step.
  update(dt) {
    if (this.done) return false;
    if (this.paused) { this.step(0); this.graphics.render(); return true; }
    dt = Math.min(dt, 1 / 15);
    const m = this.music;
    if (m && !m.paused && m.currentTime > 0 && Math.abs(m.currentTime - (this.t + dt)) < 0.5) dt = Math.max(0, Math.min(1 / 15, m.currentTime - this.t));
    const t0 = this.t;
    this.step(dt);
    this.ui.fire(t0, this.t);
    this.graphics.render();
    if (this.t >= this.duration) { this.finish(true); return false; }
    return true;
  }

  // Jump to time t: set its shot up and pose it at t (every shot is a function of its own time).
  seek(t) {
    t = Math.max(0, Math.min(this.duration - 1e-3, t));
    this.t = t;
    if (this.music && !this.paused) { try { this.music.currentTime = t; } catch { /* */ } }
    this.step(0);
    this.ui?.sync();
  }

  shotAt(t) { const i = this.shots.findIndex((s) => t < s.t1); return i < 0 ? this.shots.length - 1 : i; }
  sceneAt(t) { return this.shots[this.shotAt(t)].scene; }
  // match seconds at film time t (null before the match clock runs)
  matchTime(t) { const s = this.shots[this.shotAt(t)]; if (!s.mt) return null; const u = clamp01((t - s.t0) / s.dur); return s.mt[0] + (s.mt[1] - s.mt[0]) * u; }

  // Advance by dt and draw the frame at the new time.
  step(dt, render = false) {
    this.t = Math.min(this.duration, this.t + dt);
    const t = Math.min(this.t, this.duration - 1e-3);
    const i = this.shotAt(t);
    const s = this.shots[i];
    if (i !== this.index) this.setupShot(i);
    const lt = t - s.t0; const u = clamp01(lt / s.dur);
    const at = s.warp ? s.warp(lt) : lt; // action time (slow motion warps it)
    const ctx = { t: lt, at, u, s, e: (EASE[s.ease] || EASE.glide)(u) };
    // actors: posed from the shot, holding what their inventory says, painted as much as the match says
    for (const n of this.cast) n.group.visible = false;
    for (const [id, spec] of Object.entries(s.actors || {})) {
      const n = this.by[id];
      pose(this, n, spec, at);
      const st = this.stateAt(id, t);
      const inHand = st.inv.slot ? st.inv.secondary : st.inv.primary;
      gear(n, { blaster: spec.blaster ?? (st.out ? '' : inHand || ''), paint: spec.paint ?? (st.out || st.down ? 100 : st.paint) });
    }
    s.tick?.(ctx);
    this.updatePaint(s, lt, at);
    this.updateFx(s, lt, at, t);
    // camera
    const cam = s.cam(ctx);
    this.camera.position.copy(cam.pos);
    this.camera.lookAt(cam.look);
    if (cam.roll) this.camera.rotateZ(cam.roll);
    let fov = cam.fov || 42;
    // the shots are framed for 16:9; on a tall (portrait) screen open the lens up so the action stays in frame
    const asp = this.camera.aspect;
    if (asp < 1.6) fov = Math.min(80, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fov) / 2) * Math.min(1.78 / asp, 2.1))));
    const near = THREE.MathUtils.clamp(cam.pos.y * 0.01, 0.08, 4);
    const far = s.far || 3200;
    if (this.camera.fov !== fov || Math.abs(this.camera.near - near) > 0.02 || this.camera.far !== far) { this.camera.fov = fov; this.camera.near = near; this.camera.far = far; this.camera.updateProjectionMatrix(); }
    const range = s.range || FILM_RANGE;
    if (range !== this.rangeKey) { this.graphics.env.setRange(range); this.rangeKey = range; }
    this.look = cam.look;
    if (this.capturing) {
      const d = s.dof;
      const subject = d && (typeof d === 'string' ? this.by[d]?.pos.clone().setY(this.by[d].pos.y + 1.4) : V(...d));
      this.graphics.post.setDof(subject ? { focus: cam.pos.distanceTo(subject), aperture: 0.0004, maxblur: 0.005 } : null);
    }
    // sun shadows cover what the camera looks at, wider from the air
    const alt = cam.pos.y - (cam.look.y || 0);
    const sc = this.graphics.env.sun.shadow.camera;
    if (!this.savedShadow) this.savedShadow = { left: sc.left, right: sc.right, top: sc.top, bottom: sc.bottom };
    const span = THREE.MathUtils.clamp(alt * 1.6, Math.max(60, -this.savedShadow.left * 2), 520);
    if (Math.abs(sc.right - span / 2) > 1) { sc.left = -span / 2; sc.right = span / 2; sc.top = span / 2; sc.bottom = -span / 2; sc.updateProjectionMatrix(); }
    const clock = s.clock[0] + (s.clock[1] - s.clock[0]) * u;
    this.clock = clock;
    this.campus.setClock?.(clock);
    this.graphics.update(dt, { clock, focus: V(cam.look.x, cam.pos.y, cam.look.z), view: 'cinematic' });
    for (const [o] of this.sprites) o.visible = false;
    for (const l of this.campus.labels || []) l.visible = false;
    this.ui?.update(t);
    if (render) this.graphics.render();
  }

  setupShot(i) {
    this.index = i;
    const s = this.shots[i];
    this.clearProps();
    s.setup?.();
    // splats for this shot's paintballs, shown when each lands; bomb splats; crates
    this.splats = [];
    const addSplat = (q, at) => { const m = splatProp({ ...q, seed: Math.round(at * 97 + q.p[0] * 3) }); m.visible = false; this.props.add(m); this.splats.push({ m, at, big: q.big }); };
    for (const f of s.fire || []) {
      if (!f.hit || f.hit.actor) continue;
      addSplat({ p: f.hit.p, n: f.hit.n, r: f.hit.r || 0.22, col: f.colour, big: f.big }, f.t + f.dur);
    }
    for (const b of s.bombs || []) for (const q of bombSplats(b.to, Math.round(b.t * 31))) addSplat(q, b.t + (b.fuse ?? 2));
    for (const q of s.splats || []) addSplat({ p: q.p, n: q.n || [0, 1, 0], r: q.r || 0.4, col: q.col }, q.t ?? -1);
    this.crates = (s.crates || []).map((c) => {
      const p = crateProp({ kind: c.kind || 'crate', items: c.items, yaw: c.yaw || 0 });
      const y = c.p[1] ?? (this.floorAt ? this.floorAt(c.p[0], c.p[2], 0.3) : 0);
      p.group.position.set(c.p[0], y, c.p[2]);
      this.props.add(p.group);
      return { spec: c, prop: p };
    });
    this.shelf = null;
    if (s.shelf) { // the six blasters on display (Scene 3)
      this.shelf = s.shelf.map((q) => { const g = blasterModel(q.id); g.scale.setScalar(q.scale || 2.2); g.position.set(...q.p); this.props.add(g); return { g, q }; });
    }
  }

  clearProps() {
    if (!this.props) return;
    for (const c of [...this.props.children]) { this.props.remove(c); c.traverse?.((o) => { if (o.isMesh && o.name === 'splat') o.geometry.dispose(); }); }
  }

  // Paintballs in flight (a pool), splats appearing as they land.
  updatePaint(s, lt) {
    for (const b of this.balls) b.visible = false;
    let k = 0;
    for (const f of s.fire || []) {
      const u = (lt - f.t) / f.dur;
      if (u < 0 || u >= 1 || k >= this.balls.length) continue;
      const shooter = f.by && this.by[f.by];
      const from = f.from ? V(...f.from) : shooter?.pbBlaster ? shooter.pbBlaster.localToWorld(V(0, 0.05, 0.42)) : V(0, 1, 0);
      const tgt = f.hit?.actor && this.by[f.hit.actor];
      let to = tgt ? tgt.pos.clone().setY(tgt.pos.y + (f.hit.head ? 1.55 : 1.15) * tgt.scale) : V(...f.hit.p);
      if (tgt && f.hit.shield) { const c = tgt.pos.clone().setY(tgt.pos.y + 1.0); to = c.addScaledVector(from.clone().sub(c).normalize(), 1.08); }
      const b = this.balls[k++];
      b.position.lerpVectors(from, to, u);
      b.position.y += Math.sin(Math.PI * u) * (f.arc ?? 0.12) * from.distanceTo(to) * 0.04;
      if (!this.ballMats.has(f.colour)) this.ballMats.set(f.colour, paintball(f.colour).material);
      b.material = this.ballMats.get(f.colour);
      b.scale.setScalar(f.big ? 3.2 : f.scale || 1.8);
      b.visible = true;
    }
    for (const sp of this.splats || []) {
      const on = lt >= sp.at;
      sp.m.visible = on;
      if (on) sp.m.scale.setScalar((sp.big ? 2.2 : 1) * (0.4 + 0.6 * smooth(sp.at, sp.at + 0.12, lt)));
    }
  }

  // Bombs, bursts, crates, the drop, shields, the zone and the boundary at shot time lt.
  updateFx(s, lt, at, t) {
    // paint bombs in flight, then their bursts
    const bursts = [...(s.bursts || [])];
    this.bombMeshes.forEach((m) => { m.visible = false; });
    (s.bombs || []).forEach((b, k) => {
      const shooter = this.by[b.by];
      const from = b.from || (shooter ? [shooter.pos.x, shooter.pos.y + 1.9, shooter.pos.z] : b.to);
      const fuse = b.fuse ?? 2;
      if (!b.fromFixed && lt < b.t) b.fromLive = from;
      const p = bombAt(b.fromLive || from, b.to, lt - b.t, { fuse, air: b.air ?? 0.9 });
      const m = this.bombMeshes[k % this.bombMeshes.length];
      if (p) { m.visible = true; m.position.copy(p); m.rotation.x = (lt - b.t) * 8; m.scale.setScalar(1.4); }
      bursts.push({ t: b.t + fuse, p: [b.to[0], b.to[1] + 0.25, b.to[2]], cols: ['#ff3d7f', '#ffd23d', '#30d5ff'], size: 1.5, seed: 17 + k, slow: b.slow });
    });
    const slow = s.slowBurst ?? 1;
    this.drops.update(bursts, lt, slow);
    // crates: lid and items by time
    for (const c of this.crates || []) {
      const sp = c.spec;
      const open = sp.kind === 'pile' ? 1 : sp.open ? smooth(sp.open[0], sp.open[1], lt) : sp.opened ? 1 : 0;
      const taken = (sp.take || []).filter(([tt]) => lt >= tt).length;
      c.prop.group.visible = lt >= (sp.from ?? -1);
      c.prop.pose(open, sp.kind === 'pile' ? 0 : taken, lt);
      if (sp.kind === 'pile') c.prop.models.forEach((m, i) => { m.visible = !(sp.take || []).some(([tt, idx]) => lt >= tt && idx === i); });
    }
    // the six blasters on display
    for (const q of this.shelf || []) { q.g.rotation.y = q.q.yaw + lt * 0.5; q.g.position.y = q.q.p[1] + Math.sin(lt * 1.6 + q.q.p[0]) * 0.04; }
    // the special supply drop
    const A = s.airdrop;
    this.air.group.visible = !!A;
    if (A) { const f = typeof A.fall === 'function' ? A.fall(lt) : A.fall ?? 1; this.air.pose(MATCH.airdrop.x, A.y ?? 0, MATCH.airdrop.z, f, t); }
    // paint shields
    this.shields.forEach((sh, k) => {
      const q = (s.shields || [])[k];
      if (!q || lt < q.t0 || lt > q.t1 + 0.3) { sh.pose(V(0, -100, 0), 0, 0); return; }
      const n = this.by[q.who];
      const a = smooth(q.t0, q.t0 + 0.25, lt) * (1 - smooth(q.t1, q.t1 + 0.3, lt));
      sh.pose(V(n.pos.x, n.pos.y + 1.0, n.pos.z), lt, a);
    });
    // the paint zone (from the match clock) and the campus boundary
    const mt = this.matchTime(t);
    const zs = s.zone === false ? null : mt != null ? zoneState(mt) : s.zone ? zoneState(s.zone.mt ?? 0) : null;
    this.zone.zone.mesh.visible = !!zs; this.zone.next.mesh.visible = false;
    if (zs) { this.zone.set({ ...zs, showNext: s.zone?.next !== false }, t); if (s.zone?.opacity != null) this.zone.zone.mesh.material.opacity = s.zone.opacity(lt); else this.zone.zone.mesh.material.opacity = 0.55; }
    const bd = s.boundary ? s.boundary(lt) : null;
    this.boundary.set(bd ? bd.draw : 0, bd ? bd.glow : 0);
  }

  // ---------- timeline: game state, sound cues, overlays, hotspots ----------
  buildTimeline() {
    this.lines = []; this.cues = []; this.hots = []; this.panels = []; this.captions = []; this.events = [];
    this.chapters = SCENES.map((sc, k) => ({ ...sc, index: k, t0: this.shots.find((s) => s.scene === k).t0 }));
    this.chapters.forEach((c, k) => { c.t1 = this.chapters[k + 1]?.t0 ?? this.duration; });
    for (const s of this.shots) {
      for (const [at, who, text, dur] of s.lines || []) this.lines.push({ t0: s.t0 + at, t1: s.t0 + at + (dur || Math.max(2, text.length * 0.06)), who, text });
      for (const f of s.fire || []) {
        this.cues.push({ t: s.t0 + f.t, kind: f.big ? 'thump' : 'pop', p: EQUIPMENT_BY_ID[f.kind]?.id });
        if (f.hit) this.cues.push({ t: s.t0 + f.t + f.dur, kind: f.big ? 'splash' : f.hit.shield ? 'shieldHit' : 'splat' });
        if (f.by) this.events.push({ t: s.t0 + f.t, type: 'fire', who: f.by });
      }
      for (const b of s.bombs || []) { this.cues.push({ t: s.t0 + b.t, kind: 'toss' }); this.cues.push({ t: s.t0 + b.t + (b.fuse ?? 2), kind: 'burst' }); this.events.push({ t: s.t0 + b.t, type: 'use', who: b.by, kind: 'paintbomb' }); }
      for (const b of s.bursts || []) if (!b.silent) this.cues.push({ t: s.t0 + b.t, kind: 'burst' });
      for (const c of s.crates || []) { if (c.open) this.cues.push({ t: s.t0 + c.open[0], kind: 'crate' }); }
      for (const [at, kind] of s.cues || []) this.cues.push({ t: s.t0 + at, kind });
      for (const e of s.ev || []) this.events.push({ ...e, t: s.t0 + e.t });
      for (const h of s.hots || []) this.hots.push({ ...h, t0: s.t0 + (h.from ?? 0.5), t1: s.t0 + Math.min(s.dur - 0.2, h.to ?? s.dur) });
      for (const p of s.panels || []) this.panels.push({ ...p, t0: s.t0 + (p.from ?? 0), t1: s.t0 + Math.min(s.dur, p.to ?? s.dur), shot: s });
      if (s.caption) this.captions.push({ ...s.caption, t0: s.t0 + (s.caption.at ?? 0.5), t1: s.t0 + Math.min(s.dur - 0.2, (s.caption.at ?? 0.5) + (s.caption.hold ?? 3)) });
    }
    this.lines.sort((a, b) => a.t0 - b.t0);
    this.cues.sort((a, b) => a.t - b.t);
    this.events.sort((a, b) => a.t - b.t);
    for (const c of this.chapters) if (c.index > 0) this.dips.push(c.t0);
    this.marks = {};
    for (const s of this.shots) if (s.mark) this.marks[s.mark] = s.t0 + (s.markAt || 0);
    this.simulate();
  }

  // Replays the match events (pick-ups, paintballs fired, tags, clean-offs, round eliminations) into per-player
  // snapshots, with the real inventory rules (items.js pickupPlan) and scoring (rules.js SCORE).
  simulate() {
    const st = {};
    for (const c of CAST) st[c.id] = { inv: { primary: ROYALE.start.blaster, secondary: '', slot: 0, ammo: {}, hopper: [ROYALE.start.hopper, 0], paintbomb: 0, smoke: 0, wipes: 0, kit: 0, shield: 0, scan: 0, gearMask: 0, gearVest: 0 }, paint: 0, tags: 0, assists: 0, timesTagged: 0, supplies: 0, down: false, out: false, placement: 0, survived: 0, shieldUntil: -1 };
    this.snaps = Object.fromEntries(CAST.map((c) => [c.id, [[-1, JSON.parse(JSON.stringify(st[c.id]))]]]));
    this.feed = []; // { t, text, mine: [ids] }
    const snap = (id, t) => this.snaps[id].push([t, JSON.parse(JSON.stringify(st[id]))]);
    const inHand = (inv) => (inv.slot ? inv.secondary : inv.primary);
    const name = (id) => CAST_BY_ID[id].name;
    const placeOf = () => new Set(CAST.filter((c) => !st[c.id].out).map((c) => c.team)).size + 1;
    for (const e of this.events) {
      const p = st[e.who];
      switch (e.type) {
        case 'pick': {
          const inv = p.inv; const it = ITEMS[e.item]; const n = e.n ?? it.qty;
          const plan = pickupPlan({ ...inv, ammo: inv.ammo }, e.item, n);
          if (!plan.take) break;
          p.supplies++;
          if (it.kind === 'blaster') {
            const slot = plan.slot; const e2 = EQUIPMENT_BY_ID[it.blaster];
            if (slot === 0) inv.primary = it.blaster; else inv.secondary = it.blaster;
            inv.hopper[slot] = e2.magazine;
          } else if (it.kind === 'ammo') inv.ammo[it.blaster] = (inv.ammo[it.blaster] || 0) + plan.take;
          else if (it.kind === 'refill') inv.ammo[plan.blaster] = (inv.ammo[plan.blaster] || 0) + plan.add;
          else if (it.kind === 'gear') inv[it.slot === 'mask' ? 'gearMask' : 'gearVest'] = it.tier;
          else inv[e.item] = (inv[e.item] || 0) + plan.take;
          if (e.note !== false) this.feed.push({ t: e.t, text: `✋ ${it.name}${n > 1 && it.kind !== 'blaster' ? ` ×${n}` : ''}`, only: e.who });
          break;
        }
        case 'switch': p.inv.slot = e.slot; break;
        case 'use': if (p.inv[e.kind] > 0) p.inv[e.kind]--; if (e.kind === 'shield') p.shieldUntil = e.t + SHIELD.time; break;
        case 'fire': {
          const b = inHand(p.inv); if (!b) break;
          const k = p.inv.slot; p.inv.hopper[k] = Math.max(0, p.inv.hopper[k] - 1);
          if (p.inv.hopper[k] === 0 && (p.inv.ammo[b] || 0) > 0) { const r = Math.min(EQUIPMENT_BY_ID[b].magazine, p.inv.ammo[b]); p.inv.hopper[k] = r; p.inv.ammo[b] -= r; }
          break;
        }
        case 'paint': p.paint = e.v; break;
        case 'tag': { // e.who tagged by e.by (assists: [ids]); then down (a squadmate still standing) or out
          const by = st[e.by];
          by.tags++; for (const a of e.assists || []) st[a].assists++;
          p.timesTagged++; p.paint = PAINT_MAX;
          this.feed.push({ t: e.t, text: `${e.precision ? '🎯 ' : '🎨 '}${name(e.by)} tagged ${name(e.who)}${e.assists?.length ? ` (+${e.assists.length} assist${e.assists.length > 1 ? 's' : ''})` : ''}`, mine: [e.by, e.who], big: e.by, precision: e.precision, assists: e.assists || [] });
          const mates = CAST.some((c) => c.id !== e.who && c.team === CAST_BY_ID[e.who].team && !st[c.id].out && !st[c.id].down);
          if (mates) { p.down = true; this.feed.push({ t: e.t + 0.05, text: `🎨 ${name(e.who)} is fully painted: a squadmate can clean them off (E)`, mine: [e.who] }); } else this.eliminate(st, e.who, e.t, placeOf);
          break;
        }
        case 'revived': p.down = false; p.paint = ROYALE.revivePaint; this.feed.push({ t: e.t, text: `🧽 ${name(e.by)} cleaned off ${name(e.who)}`, mine: [e.who, e.by] }); break;
        case 'note': this.feed.push({ t: e.t, text: e.text, only: e.only }); break;
        default: break;
      }
      snap(e.who, e.t);
      if (e.type === 'tag') { snap(e.by, e.t); for (const a of e.assists || []) snap(a, e.t); for (const c of CAST) if (st[c.id].out) snap(c.id, e.t + 0.01); }
    }
    // the end: the last squad standing wins (finaliseRoyale: completion, placement and win bonuses)
    const end = this.marks.end ?? this.duration;
    this.endMatchT = this.marks.end; this.endMt = this.matchTime(Math.max(0, (this.marks.end ?? 1) - 0.01)) ?? 0;
    const standing = new Set(CAST.filter((c) => !st[c.id].out).map((c) => c.team));
    const winner = standing.size === 1 ? [...standing][0] : null;
    const groups = SQUADS.length;
    for (const c of CAST) {
      const p = st[c.id];
      if (!p.out) { p.placement = 1; p.survived = this.endMt; }
      p.score = p.tags * SCORE.tag + p.assists * SCORE.assist + SCORE.completion + SCORE.place * Math.max(0, groups - p.placement) + (c.team === winner ? SCORE.win : 0);
    }
    const rank = CAST.map((c) => ({ id: c.id, nickname: c.name, team: c.team, ...st[c.id] })).sort((a, b) => a.placement - b.placement || b.score - a.score || b.tags - a.tags || a.nickname.localeCompare(b.nickname));
    const rankings = rank.map((p, i) => ({ id: p.id, nickname: p.nickname, team: p.team, score: p.score, tags: p.tags, assists: p.assists, timesTagged: p.timesTagged, place: i + 1, placement: p.placement, survived: p.survived, supplies: p.supplies }));
    const mvp = [...rankings].sort((a, b) => b.score - a.score || b.tags - a.tags)[0];
    const teams = SQUADS.map((q) => ({ team: q.team, name: `Team ${q.name}`, colour: q.colour, score: rankings.filter((r) => r.team === q.team).reduce((a, r) => a + r.score, 0), tags: rankings.filter((r) => r.team === q.team).reduce((a, r) => a + r.tags, 0), placement: Math.min(...rankings.filter((r) => r.team === q.team).map((r) => r.placement)) }))
      .sort((a, b) => a.placement - b.placement || b.score - a.score).map((q, i) => ({ ...q, place: i + 1 }));
    this.results = { winner: teams[0].name, runnerUp: teams[1].name, mvp: mvp.id, mvpName: mvp.nickname, rankings, teams, winnerTeam: winner, end };
  }

  eliminate(st, id, t, placeOf) {
    const p = st[id]; const team = CAST_BY_ID[id].team;
    p.out = true; p.down = false;
    p.survived = this.matchTime(t) ?? 0;
    // the whole squad is out: anyone still down is out too, and the squad gets its placement
    const downs = CAST.filter((c) => c.team === team && st[c.id].down);
    for (const c of downs) { st[c.id].out = true; st[c.id].down = false; st[c.id].survived = p.survived; }
    if (!CAST.some((c) => c.team === team && !st[c.id].out)) { const place = placeOf(); for (const c of CAST) if (c.team === team) st[c.id].placement = place; }
    for (const c of downs) this.feed.push({ t: t + 0.1, text: `❌ ${c.name} is out`, mine: [c.id] });
    this.feed.push({ t: t + 0.08, text: `❌ ${CAST_BY_ID[id].name} is out${p.placement ? ` (#${p.placement})` : ''}`, mine: [id] });
  }

  // A player's state at film time t (the last snapshot at or before t).
  stateAt(id, t) {
    const list = this.snaps[id];
    let lo = 0; let hi = list.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (list[m][0] <= t) lo = m; else hi = m - 1; }
    return list[lo][1];
  }
  // players still in (alive and not out) and squads standing at t
  standing(t) { const ids = CAST.filter((c) => !this.stateAt(c.id, t).out); return { players: ids.length, squads: new Set(ids.map((c) => c.team)).size }; }
  teamScores(t) { return SQUADS.map((q) => q.members.reduce((a, id) => { const s = this.stateAt(id, t); return a + s.tags * SCORE.tag + s.assists * SCORE.assist; }, 0)); }

  // ---------- the shot list ----------
  buildShots() {
    const self = this;
    this.dips = [];
    this.titles = [];
    const P = (id) => self.by[id].pos;
    const fl = (x, z, y = 0.3) => (self.floorAt ? self.floorAt(x, z, y) : 0);
    // camera helpers
    const path = (pos, look, fov = 42) => {
      const pc = curve(pos); const lc = curve(look);
      return (c) => ({ pos: pc.getPoint(c.e), look: lc.getPoint(c.e), fov: Array.isArray(fov) ? fov[0] + (fov[1] - fov[0]) * c.e : fov });
    };
    // behind/beside an actor: back (m behind), up, side (m to their right), looking ahead and at a height
    const follow = (id, back, up, side = 0, ahead = 4, lookUp = 1.3, fov = 44) => () => {
      const n = self.by[id]; const yaw = n.group.rotation.y;
      const f = V(Math.sin(yaw), 0, Math.cos(yaw)); const r = V(-f.z, 0, f.x);
      return { pos: n.pos.clone().addScaledVector(f, -back).addScaledVector(r, side).setY(n.pos.y + up), look: n.pos.clone().addScaledVector(f, ahead).setY(n.pos.y + lookUp), fov };
    };
    // over the shoulder of `id` towards a world point
    const ots = (id, target, { back = 2.4, side = 0.75, up = 1.75, fov = 36 } = {}) => () => {
      const m = P(id); const tg = typeof target === 'function' ? target() : V(...target);
      const d = tg.clone().sub(m).setY(0).normalize(); const r = V(-d.z, 0, d.x);
      return { pos: m.clone().addScaledVector(d, -back).addScaledVector(r, side).setY(m.y + up), look: tg, fov };
    };
    // an orbit that keeps the subject left of centre (room for a panel on the right)
    const offsetOrbit = (c, r, a0, a1, h0, h1, shift, fov) => (x) => {
      const a = a0 + (a1 - a0) * x.e; const rr = r[0] + (r[1] - r[0]) * x.e;
      const pos = V(c[0] + Math.sin(a) * rr, h0 + (h1 - h0) * x.e, c[1] + Math.cos(a) * rr); const tg = V(c[0], 1.2, c[1]);
      const d = tg.clone().sub(pos).setY(0).normalize();
      return { pos, look: tg.addScaledVector(V(-d.z, 0, d.x), shift), fov };
    };
    const orbit = (c, r, a0, a1, h0, h1, lookY = 1.2, fov = 42) => (x) => {
      const a = a0 + (a1 - a0) * x.e; const rr = Array.isArray(r) ? r[0] + (r[1] - r[0]) * x.e : r;
      return { pos: V(c[0] + Math.sin(a) * rr, h0 + (h1 - h0) * x.e, c[1] + Math.cos(a) * rr), look: V(c[0], lookY, c[1]), fov };
    };
    const col = (id) => EQUIPMENT_BY_ID[id].colour;
    // a volley: count paintballs from an actor every gap s from t at a target (an actor or a surface point that
    // drifts by jitter); kind: the blaster (its paint colour)
    const volley = (by, t, count, gap, hit, { dur = 0.4, jitter = 0.3, last = null, kind = 'standard', burst = 1 } = {}) => {
      const out = [];
      for (let k = 0; k < count; k++) {
        for (let b = 0; b < burst; b++) {
          const h = k === count - 1 && last ? last : hit.actor || hit.none ? hit : { ...hit, p: [hit.p[0] + Math.sin(k * 2.1 + b) * jitter, hit.p[1] + Math.cos(k * 1.7 + b) * jitter * 0.4, hit.p[2] + Math.cos(k * 2.9 + b) * jitter] };
          out.push({ by, t: t + k * gap + b * 0.07, dur, hit: h, colour: col(kind), kind });
        }
      }
      return out;
    };
    const ground = (x, z, r = 0.3, y = null) => ({ p: [x, (y ?? fl(x, z)) + 0.03, z], n: [0, 1, 0], r });
    const wall = (x, y, z, n, r = 0.3) => ({ p: [x, y, z], n, r });
    const pick = (t, who, item, n) => ({ t, type: 'pick', who, item, n });
    const tag = (t, by, who, extra = {}) => ({ t, type: 'tag', by, who, ...extra });
    const slowmo = (a, b, k) => (lt) => (lt < a ? lt : lt < b ? a + (lt - a) * k : a + (b - a) * k + (lt - b));

    // ---- places (campus metres: x east, z south; see the README) ----
    // Pink lands on registry drop 10 "near M Lawns" (84, 4) and its slot (83, 10); the M Lawns lie in front of the
    // Main Building's east wing (its "Faculty Division II" entrance at about (100, -26)); tree trunks from the
    // campus collision export give the cover positions below.
    const RUN_A = [[84, 4, 0], [96.5, -24, 0], [100, -27.5, 0], [96.5, -48.5, 0], [95.4, -48.8, 0]]; // into the east wing (checked against the collision export)
    const CRATE_A = [94, 0, -49]; // registry supply 241 (indoors)
    const RUN_N = [[83, 10, 0], [77.5, -0.5, 0], [63.1, -15, 0]]; // Aanya to an outdoor crate in the trees
    const CRATE_N = [62, 0, -16]; // supply 331
    const CRATE_R = [-2, -4.5, 36]; // supply 151, the sunken NAB walk south of the Rotunda
    const CRATE_H = [21, -4.5, 52]; // supply 108, a NAB corridor
    const AD = MATCH.airdrop;
    const PINK = ['advait', 'aanya'];

    const shots = [
      // ================= 1 · Arena Reveal =================
      {
        name: 'reveal', scene: 0, dur: 10.5, clock: [hm(15, 20), hm(15, 24)], ease: 'inOut', range: WIDE_RANGE, far: 6000,
        cam: path([[700, 1250, 2150], [470, 860, 1180], [250, 430, 470]], [[150, 0, 640], [120, 0, 380], [90, 0, 80]], [40, 44]),
        boundary: (lt) => ({ draw: smooth(0.8, 7.5, lt), glow: 1 }),
        zone: { mt: 0, next: false, opacity: (lt) => 0.45 * smooth(5, 9, lt) },
        cues: [[0.2, 'braam'], [6.5, 'whoosh']],
      },
      {
        name: 'intel', scene: 0, dur: 9, clock: [hm(15, 25), hm(15, 27)], ease: 'inOut', range: WIDE_RANGE, far: 5000,
        cam: path([[330, 330, 420], [215, 235, 230]], [[90, 0, 40], [70, 0, -10]], 44),
        boundary: () => ({ draw: 1, glow: 0.7 }),
        panels: [{ kind: 'tactical', from: 0.2, to: 8.8 }],
        cues: [[0.4, 'scan'], [2.2, 'blip'], [3.4, 'blip'], [4.6, 'blip']],
      },
      {
        name: 'lowpass', scene: 0, dur: 7, clock: [hm(15, 28), hm(15, 29)], ease: 'linear',
        cam: path([[-36, 12, 36], [-8, 3.5, 8], [27, 2.4, 3.5], [56, 2.2, -2.5], [72, 2.3, 6], [92, 2.4, 4], [114, 4.5, -4]], [[-8, 2, 8], [27, 1.6, 3.5], [56, 1.8, -2.5], [72, 2, 6], [92, 2.2, 4], [112, 3, -8], [104, 8, -30]], [50, 56]),
        caption: { kicker: 'BITS PILANI · WHOLE CAMPUS', title: 'Every building. Every lawn. Every road.', at: 0.6, hold: 5.6 },
        cues: [[0.1, 'whoosh'], [4.2, 'whoosh']],
      },
      // ================= 2 · Deployment & Supply Hunting =================
      {
        name: 'landing', scene: 1, dur: 5.5, clock: [hm(15, 30), hm(15, 31)], ease: 'linear', range: WIDE_RANGE, far: 5000, lb: 0,
        cam: path([[139, 980, 1180], [139, 940, 1120]], [[139, 0, 470], [139, 0, 450]], 45),
        panels: [{ kind: 'landing', from: 0.1, to: 5.4 }],
        cues: [[2.0, 'tap']],
      },
      {
        name: 'touchdown', scene: 1, dur: 4, clock: [hm(15, 31), hm(15, 31.2)], ease: 'out', dof: 'advait',
        actors: {
          advait: { path: RUN_A, gait: 'run', speed: 5.4, delay: 2.6, face: [100, -27] },
          aanya: { path: RUN_N, gait: 'run', speed: 5.4, delay: 2.9, face: [70, -8] },
        },
        cam: path([[118, 120, 58], [96, 22, 26], [90.5, 2.4, 12.5]], [[86, 0, 4], [85, 0.8, 4], [87, 1.3, 1]], [44, 50]),
        hud: { pov: 'advait', mode: 'loot' },
        caption: { kicker: 'STEP 1', title: 'DROP ANYWHERE ON CAMPUS', at: 1.4, hold: 2.4, style: 'punch' },
        cues: [[0, 'dive'], [2.2, 'land']],
        lines: [[2.6, 'advait', 'Crates inside. Aanya, take the trees!', 1.6]],
      },
      {
        name: 'run-in', scene: 1, dur: 5, clock: [hm(15, 31.2), hm(15, 31.4)], dof: 'advait', ease: 'linear',
        actors: { advait: { path: RUN_A, gait: 'run', speed: 5.4, delay: -1.3 } },
        cam: follow('advait', 3.6, 1.9, 1.1, 6, 1.4, 50),
        hud: { pov: 'advait', mode: 'loot' },
        lines: [[0.2, 'aanya', 'On it!', 1.2]],
      },
      {
        name: 'corridor', scene: 1, dur: 4, clock: [hm(15, 31.4), hm(15, 31.5)], dof: 'advait', ease: 'linear',
        actors: { advait: { path: RUN_A, gait: 'run', speed: 5.4, delay: -6.3, face: [94, -49] } },
        cam: (c) => ({ pos: V(96.2 - c.e * 0.3, 1.55, -51.5), look: V(98 - c.e * 1.5, 1.2, -38 + c.e * 7), fov: 54 }),
        hud: { pov: 'advait', mode: 'loot', prompt: [[2.6, 4, 'E · open the supply crate']] },
        crates: [{ p: CRATE_A, yaw: 1.37, items: ['blaster:burst', 'ammo:burst', 'refill'] }],
      },
      {
        name: 'crate', scene: 1, dur: 7, clock: [hm(15, 31.5), hm(15, 32)], dof: 'advait',
        actors: { advait: { at: [95.4, -48.8], face: [94, -49], act: (t) => (t < 1.3 || (t > 2.6 && t < 2.9) || (t > 3.6 && t < 3.9) || (t > 4.6 && t < 4.9) ? 'reach' : 'ready') } },
        crates: [{ p: CRATE_A, yaw: 1.37, items: ['blaster:burst', 'ammo:burst', 'refill'], open: [0.5, 1.2], take: [[2.8], [3.8], [4.8]] }],
        cam: path([[96.6, 1.45, -50.6], [96.9, 1.65, -50.2]], [[94.2, 0.65, -48.9], [94.1, 0.75, -48.8]], [42, 38]),
        hud: { pov: 'advait', mode: 'loot', crate: { title: '📦 Supply crate', items: [['blaster:burst', 1], ['ammo:burst', 48], ['refill', 1]], from: 1.3, take: [2.8, 3.8, 4.8], to: 6.8 } },
        ev: [pick(2.8, 'advait', 'blaster:burst', 1), pick(3.8, 'advait', 'ammo:burst', 48), pick(4.8, 'advait', 'refill', 1), { t: 5.9, type: 'switch', who: 'advait', slot: 1 }],
        cues: [[2.8, 'ding'], [3.8, 'ding'], [4.8, 'ding'], [5.9, 'switch']],
        hots: [{ id: 'crates', from: 1.4, to: 6.8, screen: [0.5, 0.2], label: 'How crates work', info: 'crates' }],
      },
      {
        name: 'loot-aanya', scene: 1, dur: 3.2, clock: [hm(15, 32), hm(15, 32.2)], dof: 'aanya',
        actors: { aanya: { path: RUN_N, gait: 'run', speed: 5.4, delay: -5.6, face: [62, -16], act: (t, mv) => (mv ? 'carry' : t < 1.6 ? 'reach' : 'ready') } },
        crates: [{ p: CRATE_N, yaw: 0.9, items: ['paintbomb', 'mask2'], open: [0.5, 1.0], take: [[1.7], [2.4]] }],
        cam: path([[60.0, 1.25, -12.6], [60.3, 1.35, -12.9]], [[62.6, 0.8, -15.5], [62.6, 0.85, -15.5]], 44),
        hud: { pov: 'aanya', mode: 'loot', crate: { title: '📦 Supply crate', items: [['paintbomb', 1], ['mask2', 1]], from: 1.0, take: [1.7, 2.4], to: 3.1 } },
        ev: [pick(1.7, 'aanya', 'paintbomb', 1), pick(2.4, 'aanya', 'mask2', 1)],
        cues: [[1.7, 'ding'], [2.4, 'ding']],
      },
      {
        name: 'loot-rohan', scene: 1, dur: 3.2, clock: [hm(15, 32.2), hm(15, 32.4)], dof: 'rohan',
        actors: { rohan: { path: [[6, 25, -4.5], [-0.8, 35.4, -4.5]], speed: 5.4, gait: 'run', delay: -1.4, face: [-2, 36], act: (t, mv) => (mv ? 'carry' : t < 1.4 ? 'reach' : 'ready'), floor: -4.5 } },
        crates: [{ p: CRATE_R, yaw: 2.6, items: ['blaster:precision', 'ammo:precision', 'scan'], open: [0.3, 0.8], take: [[1.4], [2.0], [2.6]] }],
        cam: path([[1.6, -2.9, 37.4], [1.4, -2.75, 37.7]], [[-1.6, -3.8, 35.6], [-1.7, -3.7, 35.7]], 44),
        hud: { pov: 'rohan', mode: 'loot', crate: { title: '📦 Supply crate', items: [['blaster:precision', 1], ['ammo:precision', 10], ['scan', 1]], from: 0.8, take: [1.4, 2.0, 2.6], to: 3.1 } },
        ev: [pick(1.4, 'rohan', 'blaster:precision', 1), pick(2.0, 'rohan', 'ammo:precision', 10), pick(2.6, 'rohan', 'scan', 1), { t: 3.0, type: 'switch', who: 'rohan', slot: 1 }],
        cues: [[1.4, 'ding'], [2.0, 'ding'], [2.6, 'ding']],
      },
      {
        name: 'loot-neha', scene: 1, dur: 3, clock: [hm(15, 32.4), hm(15, 32.6)], dof: 'neha',
        actors: { neha: { path: [[20.5, 58, -4.5], [21, 53.2, -4.5]], speed: 5.4, gait: 'run', delay: -0.3, face: [21, 52], act: (t, mv) => (mv ? 'carry' : t < 1.6 ? 'reach' : 'ready'), floor: -4.5 } },
        crates: [{ p: CRATE_H, yaw: 0, items: ['shield', 'vest1'], open: [0.9, 1.3], take: [[1.9], [2.5]] }],
        cam: path([[22.6, -2.95, 55.6], [22.4, -2.9, 55.2]], [[20.8, -3.9, 52.2], [20.9, -3.8, 52.1]], 46),
        hud: { pov: 'neha', mode: 'loot', crate: { title: '📦 Supply crate', items: [['shield', 1], ['vest1', 1]], from: 1.3, take: [1.9, 2.5], to: 2.95 } },
        ev: [pick(1.9, 'neha', 'shield', 1), pick(2.5, 'neha', 'vest1', 1),
          // elsewhere on campus (not shown): what the other squads find
          ...[['kabir', 'blaster:spread', 1], ['kabir', 'ammo:spread', 16], ['kabir', 'vest1', 1], ['tara', 'blaster:rapid', 1], ['tara', 'ammo:rapid', 90], ['ishaan', 'mask1', 1], ['ishaan', 'wipes', 1], ['sana', 'ammo:standard', 40], ['arjun', 'wipes', 1], ['vikram', 'blaster:burst', 1], ['rohan', 'refill', 1], ['neha', 'ammo:standard', 40]].map(([w, it, n], k) => ({ ...pick(2.95, w, it, n), t: 2.9 + k * 0.004, note: false }))],
        cues: [[1.9, 'ding'], [2.5, 'ding']],
      },
      // ================= 3 · Loadout & Preparation =================
      {
        name: 'customise', scene: 2, dur: 6.6, clock: [hm(16, 0), hm(16, 1)], dof: 'advait', ease: 'inOut',
        actors: { advait: { at: [101.5, -17], face: [104, -9], act: (t) => (t > 4.4 ? 'inspect' : 'ready') } },
        cam: offsetOrbit([101.5, -17], [3.6, 2.8], 0.2, 1.1, 1.5, 1.25, 1.1, 38),
        panels: [{ kind: 'customise', from: 0.3, to: 6.9 }],
        caption: { kicker: 'STEP 2', title: 'GEAR UP', at: 0.3, hold: 2.2, style: 'punch' },
        cues: [[0.3, 'hit'], [1.4, 'tick'], [2.4, 'tick'], [3.4, 'tick'], [4.4, 'tick']],
      },
      {
        name: 'blasters', scene: 2, dur: 6.5, clock: [hm(16, 1), hm(16, 2)], ease: 'inOut',
        shelf: ['standard', 'rapid', 'burst', 'spread', 'precision', 'launcher'].map((id, k) => ({ id, p: [96 + k * 1.6, 1.45, -6 - Math.abs(k - 2.5) * 0.25], yaw: 0.6 + k * 0.5, scale: 2.4 })),
        cam: path([[95.2, 1.7, -10.2], [99.6, 1.6, -10.6], [104.2, 1.7, -10.2]], [[97.6, 1.4, -6], [100.4, 1.4, -6], [103.6, 1.4, -6]], 36),
        panels: [{ kind: 'blasters', from: 0.2, to: 6.9 }],
        hots: [{ id: 'blasters', from: 0.6, to: 6.8, screen: [0.5, 0.2], label: 'The six blasters', info: 'blasters' }],
        cues: [[0.3, 'switch'], [2.3, 'switch'], [4.6, 'switch']],
      },
      {
        name: 'squad-kit', scene: 2, dur: 6, clock: [hm(16, 2), hm(16, 3)], ease: 'inOut', dof: 'aanya',
        actors: {
          advait: { at: [100.6, -17.5], face: [101.8, -10], act: (t) => (t < 3.4 ? 'inspect' : 'ready') },
          aanya: { at: [102.4, -17.2], face: [101.4, -10], act: (t) => (t > 1.6 && t < 4.2 ? 'look+ready' : 'ready') },
        },
        cam: (c) => { const pos = V(99.4 + c.e * 1.2, 1.55, -12.8 - c.e * 0.4); const tg = V(101.5, 1.35, -17.4); const d = tg.clone().sub(pos).setY(0).normalize(); return { pos, look: tg.addScaledVector(V(-d.z, 0, d.x), 1.5), fov: 40 - c.e * 4 }; },
        panels: [{ kind: 'loadout', from: 0.3, to: 5.9 }],
        lines: [[3.2, 'aanya', 'Paint bomb ready. You?', 1.5], [4.6, 'advait', 'Burst marker. Let’s go.', 1.3]],
      },
      // ================= 4 · The Match Begins =================
      {
        name: 'squads', scene: 3, dur: 5.5, clock: [hm(16, 10), hm(16, 11)], ease: 'inOut', range: WIDE_RANGE, far: 5000,
        cam: path([[-120, 260, -260], [-60, 200, -200]], [[60, 0, 10], [70, 0, 20]], 46),
        zone: { mt: 0 },
        panels: [{ kind: 'intro', from: 0.2, to: 5.9 }],
        hots: [{ id: 'create-a', from: 1.5, to: 5.8, screen: [0.5, 0.8], label: 'Create a room', game: 'create' }],
        cues: [[0.2, 'braam']],
      },
      {
        name: 'countdown', scene: 3, dur: 5, clock: [hm(16, 11), hm(16, 11.2)], dof: 'advait', mark: 'countdown',
        actors: {
          advait: { at: [83.6, -2.2], face: [104, 2], act: 'crouch+ready' },
          aanya: { at: [83.2, -6.4], face: [104, -2], act: 'crouch+ready' },
        },
        cam: (c) => { const m = P('advait'); return { pos: V(m.x - 2.4 + c.e * 0.6, m.y + 1.15, m.z + 1.7 - c.e * 0.3), look: V(m.x + 6, m.y + 0.9, m.z - 2.2), fov: 40 - c.e * 6 }; },
        hud: { pov: 'advait', mode: 'countdown', mt: [-3.2, 0] },
        cues: [[0.3, 'count'], [1.3, 'count'], [2.3, 'count'], [3.3, 'go']],
      },
      {
        name: 'pullback', scene: 3, dur: 7, clock: [hm(16, 11.2), hm(16, 11.6)], ease: 'inOut', mark: 'start',
        actors: {
          advait: { path: [[83.6, -2.2], [87, -12], [91.4, -18.9]], gait: 'run', speed: 5.4, delay: 0.2 },
          aanya: { path: [[83.2, -6.4], [81.2, -9.6]], gait: 'run', speed: 5.4, delay: 0.4 },
          kabir: { path: [[104.6, 24.5], [99, 8]], gait: 'run', speed: 5, delay: 1.0 },
          tara: { path: [[113.6, 23.4], [110, 6]], gait: 'run', speed: 5, delay: 1.2 },
        },
        cam: path([[81, 1.6, -1.2], [86, 10, 6], [92, 42, 40]], [[90, 1.2, -3], [104, 0, -2], [106, 0, -4]], [42, 46]),
        hud: { pov: 'advait', mode: 'full', mt: [0, 7], fadeIn: [1.2, 2.6] },
        lb: (lt) => 1 - smooth(1.0, 2.2, lt),
        cues: [[0.1, 'whoosh']],
      },
      // ================= 5 · First Encounters =================
      {
        name: 'contact', scene: 4, dur: 4.5, clock: [hm(16, 14), hm(16, 14.2)], dof: 'advait', lb: 0,
        actors: {
          advait: { at: [91.4, -18.9], face: [99, 8], act: (t) => (t > 0.6 ? 'aim' : 'crouch+ready') },
          aanya: { at: [81.2, -9.6], face: [101, 15], act: 'crouch+aim' },
          kabir: { at: [99, 8], face: [91.4, -18.9], act: (t) => (t > 1.4 && t < 2.6 ? 'aim' : 'crouch+aim') },
          tara: { at: [110, 6], face: [91.4, -18.9], act: 'aim' },
        },
        cam: ots('advait', () => P('kabir').clone().setY(P('kabir').y + 1.0), { back: 1.8, side: 0.7, up: 1.7, fov: 22 }),
        fire: [
          ...volley('advait', 0.8, 3, 0.55, { actor: 'kabir' }, { dur: 0.5, kind: 'burst', burst: 3 }),
          ...volley('tara', 1.6, 4, 0.3, wall(92.4, 1.2, -19.6, [0.6, 0, 0.8]), { dur: 0.6, jitter: 0.5 }),
        ],
        ev: [{ t: 1.4, type: 'paint', who: 'kabir', v: 44 }, { t: 2.0, type: 'paint', who: 'kabir', v: 66 }],
        hud: { pov: 'advait', mode: 'full', mt: [36, 40.5], hits: [1.3, 1.85, 2.4] },
        caption: { kicker: 'FIRST CONTACT', title: 'M LAWNS · MAIN BUILDING', at: 0.2, hold: 2.4, style: 'tag' },
        lines: [[2.8, 'advait', 'Two of them, south trees!', 1.4]],
      },
      {
        name: 'aanya-down', scene: 4, dur: 4.5, clock: [hm(16, 14.3), hm(16, 14.5)], dof: 'aanya', lb: 0,
        actors: {
          aanya: { path: [[81.2, -9.6], [86.2, -6.4]], gait: 'run', speed: 5, delay: 0.3, face: [99, 8], act: (t, mv) => (t > 2.6 ? 'down' : mv ? 'carry' : 'aim') },
          kabir: { at: [99, 8], face: () => P('aanya'), act: 'aim' },
          advait: { at: [91.4, -18.9], face: [99, 8], act: 'crouch+aim' },
        },
        cam: (c) => { const a = P('aanya'); return { pos: V(a.x - 2.6 + c.e * 0.5, 1.7, a.z - 3.6), look: P('kabir').clone().setY(1.0), fov: 40 }; },
        fire: [...volley('kabir', 1.1, 5, 0.32, { actor: 'aanya' }, { dur: 0.42 })],
        ev: [{ t: 1.5, type: 'paint', who: 'aanya', v: 34 }, { t: 2.0, type: 'paint', who: 'aanya', v: 68 }, tag(2.6, 'kabir', 'aanya')],
        hud: { pov: 'advait', mode: 'full', mt: [41, 45.5] },
        lines: [[3.0, 'aanya', 'I’m painted! Advait!', 1.4]],
      },
      {
        name: 'clean-off', scene: 4, dur: 5.6, clock: [hm(16, 14.5), hm(16, 14.8)], dof: 'advait', lb: 0,
        actors: {
          aanya: { at: [86.2, -6.4], face: [101, 15], act: (t) => (t < 5.3 ? 'down' : 'ready') },
          advait: { path: [[91.4, -18.9], [86.6, -7.7]], gait: 'run', speed: 5.6, face: [86.2, -6.4], act: (t, mv) => (mv ? 'carry' : t < 5.4 ? 'clean' : 'ready') },
        },
        cam: (c) => ({ pos: V(83.2 + c.e * 0.8, 1.25, -10.2), look: V(87.2, 0.85, -6.6), fov: 42 }),
        fire: [...volley('tara', 0.6, 6, 0.7, ground(88.4, -4.6, 0.3), { dur: 0.55, jitter: 1.2 })],
        ev: [{ t: 5.3, type: 'revived', who: 'aanya', by: 'advait' }],
        hud: { pov: 'advait', mode: 'full', mt: [46, 51.6], prompt: [[1.0, 1.6, 'E · clean off Aanya']], channel: [1.3, 5.3, 'Cleaning off your squadmate…'] },
        cues: [[1.3, 'scrub'], [5.3, 'revive']],
        caption: { kicker: 'SQUADS', title: 'CLEAN OFF YOUR SQUADMATE', at: 1.4, hold: 3, style: 'tag' },
      },
      {
        name: 'slowmo', scene: 4, dur: 5.5, clock: [hm(16, 15), hm(16, 15.2)], lb: 0.6, warp: slowmo(1.0, 4.0, 0.32), slowBurst: 0.5,
        actors: {
          advait: { at: [86.8, -7.9], face: [99, 8], act: 'aim' },
          aanya: { at: [86.2, -6.4], face: [110, 6], act: 'aim' },
          kabir: { path: [[99, 8], [97.6, 3.5]], gait: 'run', speed: 3.6, face: [86.8, -7.9], act: (t, mv) => (t > 1.6 ? 'handsup' : mv ? 'carry' : 'aim') },
          tara: { path: [[110, 6], [107, 1.6]], gait: 'run', speed: 3.6, delay: 0.3, face: [86.2, -6.4], act: (t) => (t > 2.4 ? 'handsup' : 'aim') },
        },
        cam: (c) => ({ pos: V(100.5 + c.e * 1.2, 1.0, 12.5 - c.e), look: V(93, 1.4, -4), fov: 40 }),
        fire: [
          ...volley('advait', 0.3, 2, 0.55, { actor: 'kabir' }, { dur: 1.4, kind: 'burst', burst: 3 }),
          ...volley('aanya', 1.7, 3, 0.45, { actor: 'tara' }, { dur: 1.6 }),
        ],
        ev: [tag(2.2, 'advait', 'kabir'), tag(3.7, 'aanya', 'tara', { assists: ['advait'] })],
        hud: { pov: 'advait', mode: 'full', mt: [53, 58.5], hits: [1.7, 2.2] },
        cues: [[1.0, 'slow'], [4.0, 'unslow']],
      },
      {
        name: 'pile', scene: 4, dur: 3.6, clock: [hm(16, 15.3), hm(16, 15.4)], dof: 'advait', lb: 0,
        actors: { advait: { path: [[89, -5], [97.4, 2.3]], gait: 'run', speed: 5.6, delay: -0.6, face: [98.2, 3.2], act: (t, mv) => (mv ? 'carry' : t < 2.6 ? 'reach' : 'ready') } },
        crates: [{ p: [98.2, 0, 3.2], kind: 'pile', items: ['blaster:standard', 'blaster:spread', 'ammo:spread', 'vest1'], take: [[2.2, 3]] }],
        cam: path([[99.8, 1.4, 5.6], [100.2, 1.5, 5.8]], [[97.8, 0.5, 2.8], [97.7, 0.6, 2.7]], 44),
        hud: { pov: 'advait', mode: 'full', mt: [60, 63.6], crate: { title: '🎒 Dropped supplies', items: [['blaster:standard', 1], ['blaster:spread', 1], ['ammo:spread', 16], ['vest1', 1]], from: 1.0, take: [null, null, null, 2.2], to: 3.5 } },
        ev: [pick(2.2, 'advait', 'vest1', 1)],
        cues: [[2.2, 'ding']],
      },
      {
        name: 'rotunda', scene: 4, dur: 4, clock: [hm(16, 16), hm(16, 16.2)], dof: 'rohan', lb: 1,
        actors: {
          rohan: { at: [5.2, -15.6], face: () => P('arjun'), act: 'aim', floor: -1.5 },
          neha: { at: [-7.6, -14.6], face: () => P('vikram'), act: 'aim', floor: -1.5 },
          arjun: { path: [[-3, 6], [2, -3]], gait: 'run', speed: 4.2, floor: -4.5, act: (t, mv) => (t > 1.9 ? 'down' : mv ? 'carry' : 'aim') },
          vikram: { path: [[6, 5], [0.5, 1.5]], gait: 'run', speed: 4.2, delay: 0.4, floor: -4.5, act: (t, mv) => (t > 3.3 ? 'handsup' : mv ? 'carry' : 'aim') },
        },
        cam: path([[16, 3.4, 14], [12, 2.2, 15.5]], [[0, -3.4, -4], [-1, -3.6, -3]], 46),
        fire: [{ by: 'rohan', t: 1.3, dur: 0.5, hit: { actor: 'arjun', head: true }, colour: col('precision'), kind: 'precision', scale: 2.4 }, ...volley('neha', 2.4, 3, 0.3, { actor: 'vikram' }, { dur: 0.45 })],
        ev: [tag(1.8, 'rohan', 'arjun', { precision: true }), tag(3.3, 'neha', 'vikram', { assists: ['rohan'] })],
        hud: { pov: 'advait', mode: 'feed', mt: [70, 74.4] },
        caption: { kicker: 'MEANWHILE', title: 'THE ROTUNDA', at: 0.2, hold: 2.6, style: 'tag' },
      },
      // ================= 6 · Supply Drop & Arena Pressure =================
      {
        name: 'announce', scene: 5, dur: 4.2, clock: [hm(16, 40), hm(16, 40.3)], dof: 'advait', lb: 0, mark: 'drop',
        actors: {
          advait: { at: [101, -15.5], face: [AD.x, AD.z], act: (t) => (t > 1.2 && t < 2.6 ? 'point' : 'ready') },
          aanya: { at: [103.2, -14.8], face: [AD.x, AD.z], act: 'look+ready' },
        },
        airdrop: { fall: 0 },
        cam: (c) => { const m = P('advait'); return { pos: V(m.x - 1.4, m.y + 1.5, m.z - 2.8), look: V(AD.x, 6 + c.e * 10, AD.z), fov: 54 }; },
        ev: [{ t: 0.3, type: 'note', who: 'advait', text: `📦 Special supply drop incoming: ${AD.name}` }],
        hud: { pov: 'advait', mode: 'full', mt: [155.4, 159.6] },
        cues: [[0.3, 'alarm']],
        caption: { kicker: 'SPECIAL SUPPLY DROP', title: 'BETTER GEAR. ONE CRATE.', at: 0.6, hold: 3, style: 'punch' },
        lines: [[2.6, 'advait', 'Supply drop! On the lawn!', 1.4]],
      },
      {
        name: 'bigmap', scene: 5, dur: 3.4, clock: [hm(16, 40.3), hm(16, 40.5)], lb: 0,
        actors: { advait: { at: [101, -15.5], face: [AD.x, AD.z], act: 'ready' }, aanya: { at: [103.2, -14.8], face: [AD.x, AD.z], act: 'ready' } },
        airdrop: { fall: 0 },
        cam: (c) => { const m = P('advait'); return { pos: V(m.x - 1.2, m.y + 2.1, m.z - 3.4), look: V(m.x + 4, m.y + 0.8, m.z + 8), fov: 50 }; },
        hud: { pov: 'advait', mode: 'full', mt: [160, 163.4], bigmap: true },
        cues: [[0.1, 'map']],
      },
      {
        name: 'fall', scene: 5, dur: 5.6, clock: [hm(16, 44), hm(16, 44.3)], lb: 0.5, ease: 'inOut',
        airdrop: { fall: (lt) => (lt >= 5.3 ? 1 : 0.55 + 0.449 * smooth(0, 5.3, lt)) },
        crates: [{ p: [AD.x, 0, AD.z], kind: 'drop', items: [], from: 5.3 }],
        actors: {
          advait: { path: [[101, -15.5], [101.2, 6.4]], gait: 'run', speed: 5.6, delay: 1.4 },
          aanya: { path: [[103.2, -14.8], [104.6, 5.8]], gait: 'run', speed: 5.6, delay: 1.6 },
          ishaan: { path: [[66, 21], [96.4, 19.6]], gait: 'run', speed: 5.6, delay: 0.2 },
          sana: { path: [[64, 17.4], [95.2, 15.2]], gait: 'run', speed: 5.6, delay: 0.4 },
        },
        cam: path([[127, 1.9, 7], [125.5, 2.6, 5]], [[104, 16, 15], [104, 2.5, 16]], [50, 50]),
        ev: [{ t: 5.3, type: 'note', who: 'advait', text: '📦 The special supply drop has landed!' }],
        hud: { pov: 'advait', mode: 'full', mt: [194.6, 200.2] },
        cues: [[0.2, 'drone'], [5.3, 'thud'], [5.4, 'jingle']],
        lines: [[3.4, 'sana', 'Lime squad, go for the drop!', 1.5]],
      },
      {
        name: 'drop-fight', scene: 5, dur: 7, clock: [hm(16, 44.4), hm(16, 44.8)], lb: 0, dof: 'aanya', warp: slowmo(2.7, 3.9, 0.35),
        airdrop: { fall: 1 },
        crates: [{ p: [AD.x, 0, AD.z], kind: 'drop', items: rollAirdrop(() => 0.2).map(([id]) => id) }],
        actors: {
          aanya: { at: [104.6, 5.8], face: [101.8, 17.6], act: (t) => (t > 0.5 && t < 1.2 ? 'windup' : t < 1.7 ? 'throw' : 'aim') },
          advait: { at: [101.2, 6.4], face: () => P('sana'), act: 'aim' },
          ishaan: { path: [[96.4, 19.6], [101.2, 18.2]], gait: 'run', speed: 4.2, face: [104.6, 5.8], act: (t, mv) => (t > 3.2 ? 'down' : mv ? 'carry' : 'aim') },
          sana: { path: [[95.2, 15.2], [99.2, 14.2]], gait: 'run', speed: 4.2, face: [101.2, 6.4], act: (t) => (t > 5.4 ? 'handsup' : 'aim') },
        },
        bombs: [{ by: 'aanya', t: 1.1, to: [101.4, 0, 17.4], fuse: 2.0 }],
        cam: orbit([102.4, 11.6], 9.4, -0.6, -0.15, 2.4, 3.0, 0.9, 50),
        fire: [
          ...volley('sana', 0.4, 4, 0.35, ground(103.8, 7.4, 0.3), { dur: 0.5, jitter: 0.8 }),
          ...volley('advait', 4.0, 2, 0.6, { actor: 'sana' }, { dur: 0.42, kind: 'burst', burst: 3 }),
        ],
        ev: [tag(3.15, 'aanya', 'ishaan'), tag(5.4, 'advait', 'sana')],
        hud: { pov: 'advait', mode: 'full', mt: [201, 208] },
        caption: { kicker: 'PAINT BOMB', title: 'G · THROW · 2 S FUSE', at: 0.8, hold: 2, style: 'tag' },
      },
      {
        name: 'drop-open', scene: 5, dur: 5.4, clock: [hm(16, 45), hm(16, 45.3)], dof: 'advait', lb: 0,
        airdrop: { fall: 1 },
        crates: [{ p: [AD.x, 0, AD.z], kind: 'drop', items: rollAirdrop(() => 0.2).map(([id]) => id), open: [0.4, 1.0], take: [[2.0], [2.8], [3.6]] }],
        actors: { advait: { at: [AD.x - 0.4, AD.z - 1.5], face: [AD.x, AD.z], act: (t) => (t < 1.0 || (t > 1.9 && t < 2.2) || (t > 2.7 && t < 3.0) || (t > 3.5 && t < 3.8) || (t > 4.3 && t < 4.6) ? 'reach' : 'ready') }, aanya: { at: [AD.x + 1.8, AD.z - 1.2], face: [AD.x + 0.4, AD.z], act: 'look+ready' } },
        cam: path([[AD.x - 3.8, 2.5, AD.z - 4.4], [AD.x - 3.4, 2.6, AD.z - 4.0]], [[AD.x + 0.3, 0.7, AD.z], [AD.x + 0.3, 0.8, AD.z]], 44),
        hud: { pov: 'advait', mode: 'full', mt: [209, 214.4], crate: { title: '📦 Special supply drop', items: rollAirdrop(() => 0.2), from: 1.0, take: [2.0, 2.8, 3.6, null, 4.4, null], to: 5.3 } },
        ev: [{ t: 1.6, type: 'switch', who: 'advait', slot: 0 }, pick(2.0, 'advait', 'blaster:precision', 1), pick(2.8, 'advait', 'ammo:precision', 35), pick(3.6, 'advait', 'vest3', 1), pick(4.4, 'advait', 'shield', 1), pick(4.6, 'aanya', 'paintbomb', 2)],
        cues: [[0.4, 'crate'], [2.0, 'ding'], [2.8, 'ding'], [3.6, 'ding'], [4.4, 'ding']],
      },
      {
        name: 'zone-closing', scene: 5, dur: 5.4, clock: [hm(16, 50), hm(16, 50.5)], ease: 'inOut', lb: 1, range: WIDE_RANGE, far: 5000,
        actors: {
          rohan: { path: [[40, 120], [62, 70]], gait: 'run', speed: 5.6 },
          neha: { path: [[44, 124], [66, 74]], gait: 'run', speed: 5.6, delay: 0.3 },
        },
        cam: path([[300, 430, 760], [240, 380, 660]], [[90, 0, 20], [100, 0, 0]], 46),
        hud: { pov: 'advait', mode: 'full', mt: [232, 237.4] },
        cues: [[0.2, 'zone']],
        caption: { kicker: 'THE PAINT ZONE', title: 'STAY INSIDE THE WHITE CIRCLE', at: 0.4, hold: 4.2, style: 'tag' },
      },
      // ================= 7 · Final Showdown =================
      {
        name: 'final-zone', scene: 6, dur: 4.6, clock: [hm(17, 30), hm(17, 31)], ease: 'inOut', lb: 1,
        actors: {
          advait: { at: [113.0, -19.6], face: [105, 20], act: 'crouch+ready' },
          aanya: { at: [92.6, -18.9], face: [105, 20], act: 'crouch+ready' },
          rohan: { at: [104.0, 23.2], face: [110, -15], act: 'crouch+ready' },
          neha: { at: [113.2, 21.6], face: [110, -15], act: 'crouch+ready' },
        },
        cam: orbit([107, -1], [92, 78], 2.4, 1.6, 70, 52, 0, 46),
        hud: { pov: 'advait', mode: 'full', mt: [512, 516.6] },
        caption: { kicker: 'FINAL ZONE', title: '4 LEFT · 2 SQUADS', at: 0.5, hold: 3.4, style: 'punch' },
        cues: [[0.2, 'braam']],
      },
      {
        name: 'flank', scene: 6, dur: 4.6, clock: [hm(17, 31), hm(17, 31.3)], dof: 'advait', lb: 0,
        actors: {
          advait: { path: [[113.0, -19.6], [116.0, -11.6]], gait: 'run', speed: 3.2, delay: 0.6, face: [104, 23], act: (t, mv) => (mv ? 'carry' : 'crouch+aim') },
          aanya: { at: [92.6, -18.9], face: [104, 23], act: (t) => (t > 2 ? 'signal' : 'crouch+ready') },
          rohan: { at: [104.0, 23.2], face: () => P('advait'), act: 'aim' },
        },
        cam: (c) => { const m = P('advait'); return { pos: V(m.x + 2.2, m.y + 1.1, m.z - 2.6), look: V(m.x - 1, m.y + 1.0, m.z + 6), fov: 46 }; },
        fire: [...volley('rohan', 1.2, 2, 1.4, wall(117.0, 1.4, -20.4, [-0.3, 0, 1], 0.35), { dur: 0.35, kind: 'precision', jitter: 0.2 })],
        hud: { pov: 'advait', mode: 'full', mt: [517, 521.6] },
        lines: [[2.2, 'aanya', 'I’ll bomb them. Cover me!', 1.6]],
        cues: [[0.5, 'heartbeat'], [2, 'heartbeat'], [3.5, 'heartbeat']],
      },
      {
        name: 'bomb', scene: 6, dur: 5.2, clock: [hm(17, 31.3), hm(17, 31.6)], lb: 0.6, warp: slowmo(2.9, 4.4, 0.35),
        actors: {
          aanya: { path: [[92.6, -18.9], [103.6, 4.6]], gait: 'run', speed: 5.8, delay: -3, face: [113.2, 21.6], act: (t, mv) => (mv ? 'carry' : t < 1.7 ? 'windup' : t < 2.3 ? 'throw' : 'aim') },
          neha: { at: [113.2, 21.6], face: () => P('aanya'), act: (t) => (t > 3.6 ? 'down' : 'aim') },
          advait: { at: [116.0, -11.6], face: [104, 23], act: 'aim' },
        },
        bombs: [{ by: 'aanya', t: 1.7, to: [112.8, 0, 20.6], fuse: 2.0, air: 1.0 }],
        fire: [...volley('advait', 0.3, 2, 1.2, { actor: 'neha' }, { dur: 0.4, kind: 'precision' })],
        cam: path([[96, 1.6, 0], [97.5, 1.5, 1.5]], [[108, 1.2, 13], [111.5, 1.0, 19]], [48, 42]), zone: { next: false },
        ev: [tag(3.7, 'aanya', 'neha', { assists: ['advait'] })],
        hud: { pov: 'advait', mode: 'full', mt: [522, 527.2] },
        cues: [[2.9, 'slow'], [4.4, 'unslow']],
      },
      {
        name: 'scope', scene: 6, dur: 4.4, clock: [hm(17, 31.6), hm(17, 31.9)], lb: 0,
        actors: {
          rohan: { at: [103.4, 23.6], face: () => P('aanya'), act: 'aim' },
          aanya: { at: [103.6, 4.6], face: [113.2, 21.6], act: (t) => (t > 2.6 ? 'down' : 'aim') },
        },
        cam: (c) => { const r = P('rohan'); const a = P('aanya'); const d = a.clone().sub(r).normalize(); return { pos: r.clone().add(V(0, 1.58, 0)).addScaledVector(d, 0.6), look: a.clone().setY(a.y + 1.2 - c.e * 0.15), fov: 13 - c.e * 2 }; },
        fire: [{ by: 'rohan', t: 2.2, dur: 0.4, hit: { actor: 'aanya', head: true }, colour: col('precision'), kind: 'precision', scale: 2.4 }],
        ev: [tag(2.6, 'rohan', 'aanya', { precision: true })],
        hud: { pov: 'rohan', mode: 'scope', mt: [527.4, 531.8], hits: [2.6] },
        caption: { kicker: 'PRECISION MARKER', title: 'PRECISION PAINT HIT', at: 2.7, hold: 1.6, style: 'tag' },
      },
      {
        name: 'shield', scene: 6, dur: 4.8, clock: [hm(17, 32), hm(17, 32.3)], dof: 'advait', lb: 0,
        actors: {
          advait: { path: [[116.0, -11.6], [110.6, -3.2]], gait: 'run', speed: 2.4, delay: 0.6, face: [104, 23], act: (t, mv) => (mv ? 'carry' : 'ready') },
          rohan: { at: [103.4, 23.6], face: () => P('advait'), act: 'aim' },
        },
        shields: [{ who: 'advait', t0: 0.4, t1: 4.4 }],
        cam: (c) => { const m = P('advait'); return { pos: V(m.x + 3.4 - c.e, m.y + 1.4, m.z - 4.0), look: V(m.x, m.y + 1.1, m.z), fov: 44 }; },
        fire: volley('rohan', 1.1, 3, 1.0, { actor: 'advait', shield: true }, { dur: 0.32, kind: 'precision' }),
        ev: [{ t: 0.4, type: 'use', who: 'advait', kind: 'shield' }],
        hud: { pov: 'advait', mode: 'full', mt: [532, 536.8], hits: [1.45, 2.45, 3.45], shieldHits: true },
        cues: [[0.4, 'shield']],
        caption: { kicker: 'PAINT SHIELD', title: 'C · 4 SECONDS · NO PAINT GETS THROUGH', at: 0.7, hold: 2.8, style: 'tag' },
      },
      {
        name: 'final-tag', scene: 6, dur: 5.4, clock: [hm(17, 32.3), hm(17, 32.6)], lb: 0.6, warp: slowmo(1.6, 4.0, 0.25), dof: 'rohan', mark: 'end', markAt: 3.3,
        actors: {
          advait: { at: [110.6, -3.2], face: () => P('rohan'), act: 'aim' },
          rohan: { path: [[103.4, 23.6], [105.6, 10.8]], gait: 'run', speed: 4.6, face: () => P('advait'), act: (t, mv) => (t > 2.5 ? 'handsup' : mv ? 'carry' : 'aim') },
        },
        cam: (c) => (c.t < 1.6 ? ots('advait', () => P('rohan').clone().setY(1.4), { back: 2.0, side: 0.7, up: 1.7, fov: 30 })() : { pos: V(P('rohan').x - 3.8 + c.e * 1.2, 1.3, P('rohan').z - 2.6), look: V(P('rohan').x, 1.3, P('rohan').z), fov: 36 }),
        fire: [{ by: 'advait', t: 1.3, dur: 2.0, hit: { actor: 'rohan', head: true }, colour: col('precision'), kind: 'precision', scale: 3 }],
        bursts: [{ t: 3.3, p: [105.6, 1.6, 10.8], cols: ['#b26bff', '#ff3d7f', '#ffd23d'], size: 1.2, seed: 5, silent: true }],
        ev: [tag(3.3, 'advait', 'rohan', { precision: true })],
        hud: { pov: 'advait', mode: 'full', mt: [537, 539.4], hits: [3.3] },
        cues: [[1.6, 'slow'], [3.3, 'final'], [4.0, 'unslow']],
      },
      // ================= 8 · Winner & Results =================
      {
        name: 'victory', scene: 7, dur: 4.6, clock: [hm(17, 33), hm(17, 33.3)], ease: 'inOut', lb: 1,
        actors: {
          advait: { at: [110.6, -3.2], face: [104.4, 4], act: (t) => (t > 1.4 ? 'fist' : 'ready') },
          aanya: { at: [103.6, 4.6], face: [110.6, -3.2], act: (t) => (t < 2.2 ? 'down' : 'cheer'), blaster: '' },
        },
        cam: orbit([107.2, 0.6], [9, 7], -2.2, -1.4, 1.4, 2.6, 1.1, 40),
        panels: [{ kind: 'win', from: 0.2, to: 4.5 }],
        cues: [[0.1, 'win']],
      },
      {
        name: 'results', scene: 7, dur: 8, clock: [hm(17, 34), hm(17, 35)], ease: 'linear', lb: 0,
        actors: {
          advait: { at: [106.4, 0.6], face: [106.6, 8], act: 'cheer' },
          aanya: { at: [107.8, 0.4], face: [106.6, 8], act: 'cheer+jump' },
        },
        cam: orbit([107, 0.5], 12, 0.2, 0.7, 6, 7.5, 1.2, 46),
        panels: [{ kind: 'results', from: 0.2, to: 8.9 }],
        hots: [{ id: 'join', from: 2, to: 8.8, screen: [0.88, 0.07], label: 'Join a room', game: 'join' }],
      },
      {
        name: 'celebrate', scene: 7, dur: 5, clock: [hm(17, 36), hm(17, 36.5)], dof: 'advait', lb: 1,
        actors: {
          advait: { at: [106.6, 0.2], face: [106.2, 6], act: 'cheer' },
          aanya: { at: [107.9, 0.3], face: [106.2, 6], act: 'cheer+jump' },
        },
        bursts: [0.2, 0.7, 1.3, 1.8, 2.4, 3.0, 3.5].map((t, k) => ({ t, p: [104 + (k % 3) * 2.6, 3.6 + (k % 2) * 1.4, -1.6 - (k % 2)], n: [0, 1, 0], cols: [['#ff3d7f', '#ffd23d'], ['#30d5ff', '#7cff4f'], ['#b26bff', '#ff8a1f']][k % 3], size: 1.4, seed: 30 + k })),
        splats: [[104.6, 2.4, '#ff3d7f'], [108.4, 1.2, '#30d5ff'], [105.6, -1.6, '#ffd23d'], [109.4, -0.6, '#7cff4f']].map(([x, z, c], k) => ({ t: 0.4 + k * 0.6, p: [x, 0.03, z], r: 0.6, col: c })),
        cam: path([[106.8, 1.1, 5.6], [107.2, 1.4, 6.4]], [[107.2, 1.6, 0.4], [107.2, 1.9, 0.3]], [40, 44]),
        cues: [[0.1, 'cheer'], [1.5, 'cheer']],
      },
      {
        name: 'outro', scene: 7, dur: 6.5, clock: [hm(17, 40), hm(17, 42)], ease: 'inOut', lb: 1, range: WIDE_RANGE, far: 6000,
        actors: {
          advait: { at: [106.6, 0.2], face: [60, 60], act: 'wave' },
          aanya: { at: [107.9, 0.3], face: [60, 60], act: 'cheer' },
        },
        boundary: (lt) => ({ draw: 1, glow: smooth(2, 5, lt) * 0.8 }),
        cam: path([[100, 3, 12], [60, 90, 120], [-60, 420, 420]], [[107, 1.6, 0], [100, 0, -10], [120, 0, 120]], [46, 42]),
        hots: [{ id: 'create', from: 1.5, to: 6.8, screen: [0.36, 0.8], label: 'Create a room', game: 'create' }, { id: 'join2', from: 1.5, to: 6.8, screen: [0.64, 0.8], label: 'Join a room', game: 'join' }],
      },
    ];
    // match clock and letterbox: HUD shots run the match clock and drop the letterbox
    for (const q of shots) { if (q.hud?.mt) q.mt = q.hud.mt; if (q.hud && q.lb == null) q.lb = 0; }
    // title cards
    let at = 0; for (const s of shots) at += s.dur;
    this.titles.push({ t0: 0.8, t1: 10.1, title: 'WELCOME TO PLAY WITH BITSIANS', sub: 'BITS PILANI PAINTBALL ARENA', style: 'open' });
    const celebrate = shots.slice(0, shots.findIndex((s) => s.name === 'celebrate')).reduce((a, s) => a + s.dur, 0);
    this.titles.push({ t0: celebrate + 0.3, t1: celebrate + 4.9, title: 'CHAMPION OF THE ARENA', sub: 'ADVAIT & AANYA · TEAM PINK', style: 'champ' });
    this.titles.push({ t0: at - 6.2, t1: at - 0.3, title: FILM_NAME, sub: FILM_LINE, style: 'end' });
    return shots;
  }
}

export { teamColour };
