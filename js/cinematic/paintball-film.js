// The film: "Play with BITSians", a ~4-minute story played in the game engine on the real-scale BITS Pilani campus.
// Ten friends have an idea in the Krishna Bhawan courtyard, plan and gear up for a weekend paintball match, play it
// on the Med-C Ground and celebrate together.
//
// Everything on screen is a pure function of the film time t: a shot list (scenes → shots) gives each shot a
// duration, a time of day, a camera move, the actors' blocking (positions, walks and gestures as functions of shot
// time), the paintballs in flight, the splats, the dialogue and the overlays. So seeking to any t rebuilds that frame
// exactly (seek(t) = set up the shot, pose it at t), which is what the scrub bar, the chapters, "Return to the film"
// and dev/render-film.mjs (fixed dt, frame by frame) rely on.
import * as THREE from 'three';
import { buildCast, gear, pose, CAST, CAST_BY_ID, teamColour } from './cast.js';
import { FilmUI } from './film-ui.js';
import { arenaGroup, paintball, splat } from '../paintball/models.js';
import { MEDC } from '../paintball/arena.js';
import { EQUIPMENT_BY_ID } from '../paintball/equipment.js';
import { TEAMS } from '../paintball/rules.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const curve = (pts) => (pts.length === 2 ? new THREE.LineCurve3(V(...pts[0]), V(...pts[1])) : new THREE.CatmullRomCurve3(pts.map((p) => V(...p)), false, 'centripetal'));
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const EASE = {
  linear: (u) => u,
  inOut: (u) => 0.5 - 0.5 * Math.cos(Math.PI * u),
  glide: (u) => (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u)) * 0.7 + u * 0.3,
};
const hm = (h, m = 0) => h * 60 + m;
const FILM_RANGE = { fogNear: 420, fogFar: 1700, skyScale: 2400 };
const AC = MEDC.centre;
const A = (u, v) => [AC.x + u, AC.z + v]; // arena local (u east, v south) → world [x, z]
const A3 = (u, y, v) => [AC.x + u, y, AC.z + v];

export const SCENES = [
  { id: 'day', title: 'A Day at BITS Pilani' },
  { id: 'idea', title: 'The Idea' },
  { id: 'prep', title: 'Preparing' },
  { id: 'arena', title: 'Entering the Arena' },
  { id: 'match', title: 'The Match' },
  { id: 'final', title: 'Final Moments' },
  { id: 'end', title: 'Ending' },
];
export const FILM_NAME = 'PLAY WITH BITSIANS';
export const FILM_LINE = 'Explore. Connect. Compete. Experience BITS Pilani.';

export class PaintballFilm {
  // world: { scene, camera, campus (BitsCampus), graphics, range, hooks: { explore(place, t), lobby(), exit() } }
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
    this.graphics.env.setRange(FILM_RANGE);
    this.cast = buildCast(this.scene);
    this.by = Object.fromEntries(this.cast.map((n) => [n.cast.id, n]));
    this.balls = Array.from({ length: 48 }, () => { const b = paintball('#ffffff'); b.visible = false; b.scale.setScalar(1.6); this.scene.add(b); return b; });
    this.ballMats = new Map();
    this.props = new THREE.Group(); this.scene.add(this.props);
    this.sprites = [];
    this.scene.traverse((o) => { if (o.isSprite) this.sprites.push([o, o.visible]); });
    this.ui = new FilmUI(this, { capture });
    if (music && !capture) { this.music = new Audio(music); this.music.preload = 'auto'; this.music.volume = 0.7; }
    this.done = false;
    this.paused = true;
    this.seek(Math.max(0, Math.min(at, this.duration - 0.05)));
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
    this.ui.audio.stopVoices();
    this.ui.sync();
    this.ui.remember();
  }

  toggle() { if (this.paused) this.play(); else this.pause(); }

  setMuted(m) {
    if (!this.music) return;
    if (m) this.music.pause(); else if (!this.paused) { try { this.music.currentTime = this.t; } catch { /* */ } this.music.play().catch(() => {}); }
  }

  // End now (Esc, ✕, or the end of the film).
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
    this.scene.remove(this.props);
    this.setArena(false);
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
    this.ui?.audio.stopVoices();
    if (this.music && !this.paused) { try { this.music.currentTime = t; } catch { /* */ } }
    this.step(0);
    this.ui?.sync();
  }

  shotAt(t) { const i = this.shots.findIndex((s) => t < s.t1); return i < 0 ? this.shots.length - 1 : i; }
  sceneAt(t) { return this.shots[this.shotAt(t)].scene; }

  // Advance by dt and draw the frame at the new time.
  step(dt, render = false) {
    this.t = Math.min(this.duration, this.t + dt);
    const t = Math.min(this.t, this.duration - 1e-3);
    const i = this.shotAt(t);
    const s = this.shots[i];
    if (i !== this.index) this.setupShot(i);
    const lt = t - s.t0; const u = clamp01(lt / s.dur);
    const ctx = { t: lt, u, s, e: (EASE[s.ease] || EASE.glide)(u) };
    // actors
    for (const n of this.cast) n.group.visible = false;
    for (const [id, spec] of Object.entries(s.actors || {})) {
      const n = this.by[id];
      pose(this, n, spec, lt);
      const g = { ...(s.gear || {}), ...(spec.gear || {}) };
      if (n.cast.team == null) { g.masks = false; g.blaster = false; g.band = false; }
      if (spec.hitAt != null && lt >= spec.hitAt) g.paint = Math.max(g.paint || 0, 1);
      gear(n, g);
      if (n.bag) n.bag.visible = s.scene < 2; // school bags in the campus scenes, none at the paintball match
    }
    s.tick?.(ctx);
    this.updatePaint(s, lt);
    // camera
    const cam = s.cam(ctx);
    this.camera.position.copy(cam.pos);
    this.camera.lookAt(cam.look);
    if (cam.roll) this.camera.rotateZ(cam.roll);
    let fov = cam.fov || 42;
    // the shots are framed for 16:9; on a tall (portrait) screen open the lens up so the action stays in frame
    const asp = this.camera.aspect;
    if (asp < 1.6) fov = Math.min(80, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fov) / 2) * Math.min(1.78 / asp, 2.1))));
    const near = THREE.MathUtils.clamp(cam.pos.y * 0.012, 0.08, 3);
    if (this.camera.fov !== fov || Math.abs(this.camera.near - near) > 0.02) { this.camera.fov = fov; this.camera.near = near; this.camera.updateProjectionMatrix(); }
    this.look = cam.look;
    if (this.capturing) {
      const d = s.dof;
      const subject = d && (typeof d === 'string' ? this.by[d]?.pos.clone().setY(1.4) : V(...d));
      this.graphics.post.setDof(subject ? { focus: cam.pos.distanceTo(subject), aperture: 0.0004, maxblur: 0.005 } : null);
    }
    // sun shadows cover what the camera looks at, wider from the air
    const alt = cam.pos.y;
    const sc = this.graphics.env.sun.shadow.camera;
    if (!this.savedShadow) this.savedShadow = { left: sc.left, right: sc.right, top: sc.top, bottom: sc.bottom };
    const span = THREE.MathUtils.clamp(alt * 1.6, Math.max(60, -this.savedShadow.left * 2), 520);
    if (Math.abs(sc.right - span / 2) > 1) { sc.left = -span / 2; sc.right = span / 2; sc.top = span / 2; sc.bottom = -span / 2; sc.updateProjectionMatrix(); }
    const clock = s.clock[0] + (s.clock[1] - s.clock[0]) * u;
    this.clock = clock;
    this.campus.setClock?.(clock);
    this.graphics.update(dt, { clock, focus: V(cam.look.x, alt, cam.look.z), view: 'cinematic' });
    for (const [o] of this.sprites) o.visible = false;
    for (const l of this.campus.labels || []) l.visible = false;
    this.ui?.update(t);
    if (render) this.graphics.render();
  }

  setupShot(i) {
    this.index = i;
    const s = this.shots[i];
    this.clearProps();
    this.setArena(!!s.arena);
    s.setup?.();
    // splats for this shot's paintballs, shown when each lands
    this.splats = [];
    for (const f of s.fire || []) {
      if (!f.hit || f.hit.actor) continue;
      const m = splat(f.colour, Math.round(f.t * 97 + f.hit.p[0]), f.hit.r || 0.22);
      m.position.set(...f.hit.p);
      m.lookAt(m.position.clone().add(V(...f.hit.n)));
      m.position.addScaledVector(V(...f.hit.n), 0.012);
      m.visible = false;
      this.props.add(m);
      this.splats.push({ m, at: f.t + f.dur, big: f.big });
    }
  }

  clearProps() {
    if (!this.props) return;
    for (const c of [...this.props.children]) { this.props.remove(c); c.traverse?.((o) => { if (o.isMesh && o.name === 'splat') o.geometry.dispose(); }); }
  }

  setArena(on) {
    if (on && !this.arena) {
      this.arena = arenaGroup(MEDC);
      // a gap in the west net for the players to walk in through (the film's own copy of the fence)
      const b = MEDC.bounds;
      const net = this.arena.children.find((o) => o.isMesh && o.geometry.type === 'PlaneGeometry' && Math.abs(o.position.x - b.minX) < 0.01 && o.geometry.parameters.height > 1);
      if (net) {
        const gap = 3.2; const len = b.maxZ - b.minZ;
        const half = (len - gap) / 2;
        net.scale.x = half / len; net.position.z = b.minZ + half / 2;
        const other = net.clone(); other.position.z = b.maxZ - half / 2; this.arena.add(other);
      }
      this.scene.add(this.arena);
    } else if (!on && this.arena) { this.scene.remove(this.arena); this.arena = null; }
  }

  // Paintballs in flight (a pool), splats appearing as they land, and paint on tagged players.
  updatePaint(s, lt) {
    for (const b of this.balls) b.visible = false;
    let k = 0;
    for (const f of s.fire || []) {
      const u = (lt - f.t) / f.dur;
      if (u < 0 || u >= 1 || k >= this.balls.length) continue;
      const shooter = f.by && this.by[f.by];
      const from = f.from ? V(...f.from) : shooter?.pbBlaster ? shooter.pbBlaster.localToWorld(V(0, 0.05, 0.42)) : V(0, 1, 0);
      const to = f.hit?.actor ? this.by[f.hit.actor].pos.clone().setY(this.by[f.hit.actor].pos.y + 1.2 * this.by[f.hit.actor].scale) : V(...f.hit.p);
      const b = this.balls[k++];
      b.position.lerpVectors(from, to, u);
      b.position.y += Math.sin(Math.PI * u) * (f.arc ?? 0.15) * from.distanceTo(to) * 0.04;
      if (!this.ballMats.has(f.colour)) this.ballMats.set(f.colour, paintball(f.colour).material);
      b.material = this.ballMats.get(f.colour);
      b.scale.setScalar(f.big ? 3.2 : 1.6);
      b.visible = true;
    }
    for (const sp of this.splats || []) {
      const on = lt >= sp.at;
      sp.m.visible = on;
      if (on) sp.m.scale.setScalar((sp.big ? 2.2 : 1) * (0.4 + 0.6 * smooth(sp.at, sp.at + 0.12, lt)));
    }
  }

  // ---------- timeline: absolute dialogue, sound cues, HUD, hotspots ----------
  buildTimeline() {
    this.lines = []; this.cues = []; this.hots = []; this.panels = []; this.captions = []; this.tags = [];
    this.chapters = SCENES.map((sc, k) => ({ ...sc, index: k, t0: this.shots.find((s) => s.scene === k).t0 }));
    this.chapters.forEach((c, k) => { c.t1 = this.chapters[k + 1]?.t0 ?? this.duration; });
    for (const s of this.shots) {
      for (const [at, who, text, dur] of s.lines || []) this.lines.push({ t0: s.t0 + at, t1: s.t0 + at + (dur || Math.max(2.4, text.length * 0.065)), who, text });
      for (const f of s.fire || []) {
        this.cues.push({ t: s.t0 + f.t, kind: f.big ? 'thump' : 'pop' });
        if (f.hit) this.cues.push({ t: s.t0 + f.t + f.dur, kind: f.big ? 'splash' : 'splat' });
      }
      for (const [at, kind] of s.cues || []) this.cues.push({ t: s.t0 + at, kind });
      for (const h of s.hots || []) this.hots.push({ ...h, t0: s.t0 + (h.from ?? 0.5), t1: s.t0 + Math.min(s.dur - 0.3, h.to ?? s.dur) });
      if (s.panel) this.panels.push({ ...s.panel, t0: s.t0 + (s.panel.from ?? 0), t1: s.t0 + (s.panel.to ?? s.dur), shot: s });
      if (s.caption) this.captions.push({ ...s.caption, t0: s.t0 + (s.caption.at ?? 0.8), t1: s.t0 + Math.min(s.dur - 0.3, (s.caption.at ?? 0.8) + (s.caption.hold ?? 5)) });
      for (const [at, by, who, how] of s.tags || []) this.tags.push({ t: s.t0 + at, by, who, how });
    }
    this.lines.sort((a, b) => a.t0 - b.t0);
    this.cues.sort((a, b) => a.t - b.t);
    this.tags.sort((a, b) => a.t - b.t);
    for (const c of this.chapters) if (c.index > 0) this.dips.push(c.t0);
    this.match = { t0: this.chapters[4].t0, t1: this.shots.find((s) => s.name === 'final-tag').t0 + 3.5 };
  }

  // The match clock shown on the HUD (seconds left): 3:00 at the whistle, 0:00 at the final tag.
  matchClock(t) {
    const M = this.match;
    if (t < M.t0) return 180;
    if (t >= M.t1) return 0;
    const f6 = this.chapters[5].t0;
    if (t < f6) return 180 - ((t - M.t0) / (f6 - M.t0)) * 166;
    return 14 - ((t - f6) / (M.t1 - f6)) * 14;
  }

  score(t) {
    const s = [0, 0];
    for (const g of this.tags) if (g.t <= t) s[CAST_BY_ID[g.by].team]++;
    return s;
  }

  // ---------- the shot list ----------
  buildShots() {
    const C = this.campus;
    const H = C.hostel;
    const self = this;
    this.dips = [];
    this.titles = [];
    const by = (id) => () => self.by[id];
    const P = (id) => self.by[id].pos;
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
    const orbit = (c, r, a0, a1, h0, h1, lookY = 1.2, fov = 42) => (x) => {
      const a = a0 + (a1 - a0) * x.e; const rr = Array.isArray(r) ? r[0] + (r[1] - r[0]) * x.e : r;
      return { pos: V(c[0] + Math.sin(a) * rr, h0 + (h1 - h0) * x.e, c[1] + Math.cos(a) * rr), look: V(c[0], lookY, c[1]), fov };
    };
    // a ring of people around a centre, facing in
    const ring = (ids, c, r, a0 = 0, extra = {}) => Object.fromEntries(ids.map((id, k) => {
      const a = a0 + (k / ids.length) * Math.PI * 2;
      return [id, { at: [c[0] + Math.sin(a) * r, c[1] + Math.cos(a) * r], face: c, ...(extra[id] || {}) }];
    }));

    // ----- places -----
    const K1 = H.court[0]; const K2 = H.court.at(-1);
    const KU = (K1.u0 + K1.u1) / 2 + (K1.u1 - K1.u0) * 0.22; const KV = (K1.v0 + K1.v1) / 2;
    const kc = H.world(KU, KV); const KC = [kc.x, kc.z]; // the friends' spot in the first courtyard (beside the pitch)
    const kw = (u, v, y = 0) => { const p = H.world(KU + u, KV + v, y); return [p.x, p.y, p.z]; };
    const kxz = (u, v) => { const p = H.world(KU + u, KV + v); return [p.x, p.z]; };
    const FU = (K2.u0 + K2.u1) / 2; const FV = (K2.v0 + K2.v1) / 2;
    const fw = (u, v, y = 0) => { const p = H.world(FU + u, FV + v, y); return [p.x, p.y, p.z]; };
    const fxz = (u, v) => { const p = H.world(FU + u, FV + v); return [p.x, p.z]; };
    const PLAYERS = CAST.filter((c) => c.team != null).map((c) => c.id);
    const PINK = ['advait', 'aanya', 'kabir', 'tara'];
    const CYAN = ['rohan', 'ishaan', 'neha', 'arjun'];
    const ALL = CAST.map((c) => c.id);
    const col = (id) => EQUIPMENT_BY_ID[CAST_BY_ID[id].loadout[0]].colour;
    // a point on a bunker's face towards (fu, fv), at height h: { p, n } for a splat
    const bunker = (label, idx, fu, fv, h = 1) => {
      const list = MEDC.solids.filter((o) => o.label === label);
      const o = list[idx % list.length];
      const from = V(AC.x + fu, 0, AC.z + fv);
      if (o.kind === 'cyl') { const d = from.clone().sub(V(o.x, 0, o.z)).setY(0).normalize(); return { p: [o.x + d.x * o.r, h, o.z + d.z * o.r], n: [d.x, 0, d.z] }; }
      const cx = (o.minX + o.maxX) / 2; const cz = (o.minZ + o.maxZ) / 2; const hx = (o.maxX - o.minX) / 2; const hz = (o.maxZ - o.minZ) / 2;
      const dx = (from.x - cx) / hx; const dz = (from.z - cz) / hz;
      if (Math.abs(dx) > Math.abs(dz)) { const s = Math.sign(dx); return { p: [cx + s * hx, Math.min(h, o.h - 0.25), THREE.MathUtils.clamp(from.z, o.minZ + 0.3, o.maxZ - 0.3)], n: [s, 0, 0] }; }
      const s = Math.sign(dz); return { p: [THREE.MathUtils.clamp(from.x, o.minX + 0.3, o.maxX - 0.3), Math.min(h, o.h - 0.25), cz + s * hz], n: [0, 0, s] };
    };
    const ground = (u, v) => ({ p: A3(u, 0.03, v), n: [0, 1, 0], r: 0.3 });
    // a volley: count paintballs from an actor every gap s from t, at a target that drifts by jitter
    const volley = (id, t, count, gap, hit, { dur = 0.38, jitter = 0.25, last = null, big = false } = {}) => Array.from({ length: count }, (_, k) => {
      const h = k === count - 1 && last ? last : hit.actor ? hit : { ...hit, p: [hit.p[0] + (hit.n[0] ? 0 : Math.sin(k * 2.1) * jitter), hit.p[1] + Math.cos(k * 1.7) * jitter * 0.5, hit.p[2] + (hit.n[2] ? 0 : Math.cos(k * 2.9) * jitter)] };
      return { by: id, t: t + k * gap, dur, hit: h, colour: col(id), big };
    });
    const MASKED = { masks: true, blaster: true, band: true };

    // match positions (arena local): spawn ends and covers
    const SPAWN = { advait: [-32, -3], aanya: [-32, 9], kabir: [-32, -9], tara: [-32, 3], rohan: [32, -9], ishaan: [32, 9], neha: [32, 3], arjun: [32, -3] };
    const COVER = { advait: [-17.7, 0.4], aanya: [-23.4, 8.6], kabir: [-13.5, -12.2], tara: [-9.5, 3.4], rohan: [23.4, -8.6], ishaan: [13.5, 12.2], neha: [17.7, -0.4], arjun: [9.5, -3.4] };
    const toW = (uv) => A(uv[0], uv[1]);
    const coverSpec = (id, extra = {}) => ({ at: toW(COVER[id]), face: A(CAST_BY_ID[id].team ? -30 : 30, 0), ...extra });

    const shots = [
      // ================= Scene 1 · A Day at BITS Pilani =================
      {
        name: 'aerial-campus', scene: 0, dur: 10, clock: [hm(8, 40), hm(8, 44)], ease: 'linear',
        cam: path([[520, 330, 640], [390, 265, 430], [260, 205, 250]], [[150, 0, 260], [85, 0, 150], [20, 10, 30]], [38, 40]),
        hots: [{ id: 'krishna', from: 5, at: [137, 12, 120], label: 'Krishna Bhawan', place: 'Krishna Bhawan', title: 'Krishna Bhawan', text: 'One of the Bhawans (hostels) of BITS Pilani and home to our friends: two courtyards, corridors of rooms, a common room with TT and TV, stairs up to the roof. You can walk into it in Campus Free Roam.' }],
      },
      {
        name: 'clocktower-axis', scene: 0, dur: 9, clock: [hm(8, 55), hm(8, 58)], ease: 'inOut',
        cam: path([[-6.5, 9.5, -40], [-5, 13, -27]], [[100, 6, 655], [100, 5, 655]], [30, 26]),
        caption: { kicker: 'Clock Tower → Saraswati Mandir', title: 'Across the sunken Rotunda and NAB', at: 1, hold: 6.5 },
        hots: [
          { id: 'rotunda', from: 1.2, at: [2, 3, 26], label: 'Rotunda', place: 'Rotunda', title: 'The Rotunda', text: 'The sunken circular court at the heart of the campus. It sits below ground level, so from the Clock Tower you see straight across it to the Saraswati Mandir.' },
          { id: 'nab', from: 1.2, at: [8, 3, 120], label: 'NAB', place: 'New Academic Block', title: 'NAB · New Academic Block', text: 'Lecture theatres and tutorial rooms, also below grade so the view from the Clock Tower stays open.' },
          { id: 'temple', from: 2.5, at: [102, 22, 662], label: 'Saraswati Mandir', place: 'Saraswati Temple', title: 'Saraswati Mandir', text: 'The white marble temple at the south end of the axis, with gardens around it.' },
        ],
      },
      {
        name: 'friends-meet', scene: 0, dur: 9, clock: [hm(9, 20), hm(9, 23)], dof: 'advait',
        actors: {
          advait: { path: [[82, -1], [93.4, 2.2]], speed: 1.5, face: [96.6, 3.4], act: (t) => (t > 5.4 && t < 6.8 ? 'wave' : t > 7.6 ? 'highfive' : ''), talk: [[6.4, 7.6]] },
          aanya: { at: [96.9, 2.1], face: (t) => P('advait'), act: (t) => (t > 3.6 && t < 5.4 ? 'wave' : ''), talk: [[3.8, 5.2]] },
          kabir: { at: [95.6, 4.4], face: (t) => P('advait'), act: (t) => (t > 7.6 ? 'highfive' : '') },
          tara: { at: [97.9, 3.9], face: (t) => P('advait') },
          rohan: { path: [[110, 18], [99.2, 5.8]], speed: 1.4, delay: 0.6, face: [96, 3] },
          neha: { path: [[104, 14], [97.4, 6.6]], speed: 1.3, face: [96, 3] },
          // other friends crossing the lawn behind
          ishaan: { path: [[84, -9], [112, -6]], speed: 1.35 },
          arjun: { path: [[85.5, -10], [113, -7.4]], speed: 1.35 },
          sana: { path: [[118, 0], [90, -14]], speed: 1.25 },
          vikram: { path: [[119, 1.4], [91, -12.6]], speed: 1.25 },
        },
        cam: (c) => ({ pos: V(88.5 + c.e * 1.2, 1.65, 10.5 - c.e * 1.0), look: V(93.5 + c.e * 1.5, 1.3, 2.5), fov: 46 }),
        lines: [[3.8, 'aanya', 'Advait! Over here!', 1.8], [6.4, 'advait', 'Morning, everyone!', 2]],
        caption: { kicker: 'Scene 1', title: 'A Day at BITS Pilani', at: 0.4, hold: 3.4 },
      },
      {
        name: 'hostels-aerial', scene: 0, dur: 8, clock: [hm(13, 20), hm(13, 26)], ease: 'linear',
        cam: path([[60, 140, -30], [150, 120, 40], [235, 110, 140]], [[120, 0, 120], [150, 0, 170], [170, 0, 235]], 40),
        caption: { kicker: 'Ten Bhawans', title: 'The Hostels', at: 1, hold: 5.5 },
        hots: [
          { id: 'krishna2', from: 0.8, at: [137, 10, 120], label: 'Krishna Bhawan', place: 'Krishna Bhawan', title: 'Krishna Bhawan', text: 'The friends live here. This evening they meet in its first courtyard, where the idea for the match begins.' },
          { id: 'gandhi', from: 2.5, at: [160, 10, 262], label: 'Gandhi Bhawan', place: 'Gandhi Bhawan', title: 'Gandhi Bhawan', text: 'Next door to Krishna: another walk-in Bhawan with courtyards, rooms and a roof to climb.' },
        ],
      },
      // ================= Scene 2 · The Idea =================
      {
        name: 'idea-courtyard', scene: 1, dur: 10, clock: [hm(17, 10), hm(17, 13)], ease: 'inOut', dof: 'advait',
        actors: ring(ALL, KC, 2.4, 0.3, {
          advait: { talk: [[2.6, 6]], act: (t) => (t > 2.8 && t < 4.6 ? 'point' : '') },
          vikram: { act: 'phone', gear: { phone: true } },
          neha: { act: 'arms' },
        }),
        cam: path([kw(9, 7, 4.5), kw(5.5, 4.2, 2.1)], [kw(0, 0, 1.1), kw(0, 0, 1.3)], [40, 36]),
        lines: [[2.6, 'advait', 'Why don’t we organise a paintball competition this weekend?', 4]],
        caption: { kicker: 'Scene 2', title: 'The Idea', at: 0.4, hold: 2.2 },
        hots: [{ id: 'courtyard', from: 0.6, to: 8, at: [...kw(0, 0, 3)], label: 'Krishna courtyard', place: 'Krishna Bhawan', title: 'Krishna Bhawan · first courtyard', text: 'The cricket courtyard of Krishna Bhawan, where the friends hang out in the evenings. In Campus Free Roam you can walk in through the entrance lobby.' }],
      },
      {
        name: 'idea-reactions', scene: 1, dur: 9, clock: [hm(17, 14), hm(17, 16)], dof: 'aanya',
        actors: ring(ALL, KC, 2.4, 0.3, {
          aanya: { act: (t) => (t < 2.4 ? 'cheer+jump' : ''), talk: [[0.2, 1.9]] },
          kabir: { act: (t) => (t < 2.2 ? 'fist' : ''), talk: [[2.2, 4.1]] },
          ishaan: { act: (t) => (t < 2 ? 'cheer' : '') },
          rohan: { talk: [[4.3, 6.9]], act: (t) => (t > 4.3 && t < 6 ? 'point' : '') },
          tara: { act: (t) => (t < 1.8 ? 'clap' : '') },
          vikram: { act: 'phone', gear: { phone: true } },
          arjun: { act: (t) => (t > 7.2 ? 'nod' : ''), talk: [[7.2, 8.6]] },
        }),
        cam: () => { const a = P('aanya'); const r = P('rohan'); const mid = a.clone().lerp(r, 0.5); return { pos: V(KC[0], 1.55, KC[1]).lerp(mid, -0.15).add(V(0.3, 0, 0.3)), look: mid.clone().setY(1.35), fov: 48 }; },
        lines: [[0.2, 'aanya', 'Paintball? Yes! I’m in!', 1.9], [2.2, 'kabir', 'Where though? We need a big open ground.', 2], [4.3, 'rohan', 'The Med-C Ground. Flat, wide, and free on Saturday.', 2.8], [7.2, 'arjun', 'Done. Med-C it is.', 1.7]],
      },
      {
        name: 'idea-phones', scene: 1, dur: 8, clock: [hm(17, 17), hm(17, 19)], dof: 'vikram',
        actors: ring(ALL, KC, 2.4, 0.3, {
          vikram: { act: 'phone', gear: { phone: true }, talk: [[0.4, 2.6]] },
          sana: { act: 'phone', gear: { phone: true }, talk: [[2.8, 5]] },
          neha: { act: 'phone', gear: { phone: true }, talk: [[5.3, 7.4]] },
          ishaan: { act: 'phone', gear: { phone: true } },
        }),
        cam: (c) => { const v = P('vikram'); const s = P('sana'); const mid = v.clone().lerp(s, 0.5); const out = mid.clone().sub(V(KC[0], 0, KC[1])).setY(0).normalize(); return { pos: mid.clone().addScaledVector(out, 2.8 - c.e * 0.6).setY(1.75), look: mid.clone().setY(1.3), fov: 44 }; },
        lines: [[0.4, 'vikram', 'New group: “Med-C Paintball · Sat 4 PM”.', 2.2], [2.8, 'sana', 'I’ll referee and host. Inviting everyone!', 2.3], [5.3, 'neha', 'Twelve people said yes already!', 2.2]],
        panel: { kind: 'chat', from: 0.4, to: 7.8 },
      },
      {
        name: 'idea-plan', scene: 1, dur: 9, clock: [hm(17, 20), hm(17, 23)], ease: 'inOut',
        actors: ring(ALL, KC, 2.0, 0.3, {
          tara: { talk: [[0.5, 3.4]], act: (t) => (t > 0.5 && t < 2.8 ? 'point' : '') },
          rohan: { talk: [[3.6, 5.2]], act: (t) => (t > 3.6 && t < 5 ? 'fist' : '') },
          advait: { talk: [[5.6, 8.4]] },
          vikram: { act: 'phone', gear: { phone: true } },
        }),
        cam: path([kw(1.2, 1.4, 7.5), kw(0.4, 0.6, 5.2)], [kw(0, 0, 0), kw(0, 0.1, 0.4)], [44, 52]),
        lines: [[0.5, 'tara', 'Two teams: Pink and Cyan, four a side. Sana referees, Vikram commentates.', 3], [3.6, 'rohan', 'Cyan will win. Just saying.', 1.8], [5.6, 'advait', 'Saturday, four o’clock. Masks on, everyone.', 3]],
        panel: { kind: 'plan', from: 0.4, to: 8.7 },
        hots: [{ id: 'plan-medc', from: 1.2, screen: [0.5, 0.12], label: 'The plan · Med-C Ground', place: 'Med-C', title: 'The plan: Med-C Ground', text: 'The match will be on the north outfield of the Med-C cricket ground: a 70 × 40 m field of inflatable bunkers inside a net, Pink starting at the west end and Cyan at the east.' }],
      },
      // ================= Scene 3 · Preparing =================
      {
        name: 'prep-lineup', scene: 2, dur: 10, clock: [hm(15, 0), hm(15, 2)], ease: 'linear',
        actors: Object.fromEntries(ALL.map((id, k) => [id, { at: fxz(-6.3 + k * 1.4, -2), face: fxz(-6.3 + k * 1.4, 6), gear: { masks: false, blaster: false, band: true } }])),
        tick: (c) => {
          // masks and blasters go on one by one as the camera passes
          PLAYERS.forEach((id, k) => { const on = c.t > 1.0 + k * 0.95; self.by[id].filmMask.visible = on; self.by[id].filmBlaster.visible = on; });
        },
        cam: path([fw(-6.5, 3.6, 1.25), fw(6.5, 3.6, 1.25)], [fw(-4.5, -2, 1.55), fw(4.5, -2, 1.55)], 44),
        panel: { kind: 'cards', from: 0.6, to: 9.7 },
        caption: { kicker: 'Scene 3 · Saturday', title: 'Preparing', at: 0.3, hold: 2.8 },
        lines: [[7.6, 'sana', 'Masks on, colours on. You look like a rainbow!', 2.2]],
      },
      {
        name: 'prep-blasters', scene: 2, dur: 10, clock: [hm(15, 4), hm(15, 6)], ease: 'inOut',
        actors: Object.fromEntries(PLAYERS.map((id, k) => [id, { at: fxz(-7 + (k % 4) * 4.6, k < 4 ? -2 : 3), face: fxz(-7 + (k % 4) * 4.6, k < 4 ? -12 : 13), act: (t) => (t > 0.4 + k * 1.2 ? 'aim' : 'carry'), gear: MASKED }])),
        cam: (c) => {
          const k = Math.min(7, Math.floor(c.t / 1.25)); const n = self.by[PLAYERS[k]];
          const yaw = n.group.rotation.y; const f = V(Math.sin(yaw), 0, Math.cos(yaw)); const r = V(-f.z, 0, f.x);
          const d = (c.t / 1.25) % 1;
          return { pos: n.pos.clone().addScaledVector(f, 1.7).addScaledVector(r, 1.0 + d * 0.3).setY(1.45), look: n.pos.clone().addScaledVector(f, 0.3).setY(1.35), fov: 40 };
        },
        panel: { kind: 'equip', from: 0.1, to: 9.9 },
        lines: [[0.1, 'advait', 'Standard Paintball Blaster. Classic.', 1.5], [2.5, 'kabir', 'Paint Splash Launcher. Big. And orange.', 2.3], [5.0, 'rohan', 'Precision Paint Marker. One paintball, one tag.', 1.3], [6.3, 'ishaan', 'Spread Blaster. Close range is my thing.', 1.9]],
      },
      {
        name: 'prep-supplies', scene: 2, dur: 7, clock: [hm(15, 8), hm(15, 9)], dof: 'sana',
        setup: () => self.crates(fw(0, 6.5)),
        actors: {
          sana: { at: fxz(0.2, 4.7), face: fxz(0, 6.5), talk: [[0.4, 3.4]], act: (t) => (t < 3.4 ? 'point' : 'nod') },
          kabir: { at: fxz(-1.7, 5.3), face: fxz(0, 6.5), gear: MASKED, act: 'carry' },
          neha: { at: fxz(1.9, 5.5), face: fxz(0, 6.5), gear: MASKED, act: 'carry', talk: [[3.8, 6.2]] },
        },
        cam: path([fw(2.6, 9.6, 1.1), fw(1.6, 9.0, 1.35)], [fw(0, 6.4, 0.6), fw(-0.2, 5.4, 1.15)], [46, 42]),
        lines: [[0.4, 'sana', 'Twelve hundred washable paintballs. Hoppers full?', 3], [3.8, 'neha', 'Full! And spare masks, just in case.', 2.4]],
        hots: [{ id: 'supplies', from: 0.6, at: [...fw(0, 6.5, 0.9)], label: 'Paintball supplies', title: 'Paintball supplies', text: 'Washable paintballs in six colours (one per blaster category), hoppers and spare masks. In the game each blaster carries its own number of paintballs and reloads its hopper.' }],
      },
      {
        name: 'prep-strategy', scene: 2, dur: 7, clock: [hm(15, 10), hm(15, 11)],
        actors: {
          ...ring(PINK, fxz(-5, 0), 0.95, 0.4, { aanya: { talk: [[0.3, 3.2]] }, advait: { talk: [[4.2, 6.6]] } }),
          ...ring(CYAN, fxz(5, 1), 1.0, 1.1, { rohan: { talk: [[3.2, 4.2]] } }),
        },
        tick: (c) => { if (c.t > 5.4) for (const id of PINK) gestureHandsIn(self.by[id]); },
        gear: MASKED,
        cam: path([fw(-5.6, 4.2, 4.5), fw(-4.8, 3.4, 3.2)], [fw(-5, 0, 0.8), fw(-5, 0, 1.0)], 48),
        lines: [[0.3, 'aanya', 'Tara and I rush the snake. Kabir splashes the corners.', 2.9], [3.2, 'rohan', 'Cyan, hold the temples!', 1.2], [4.4, 'advait', 'I hold the cube. Pink on three!', 2.4]],
      },
      {
        name: 'prep-lobby', scene: 2, dur: 9, clock: [hm(15, 20), hm(15, 22)], ease: 'linear',
        actors: Object.fromEntries(ALL.map((id, k) => [id, { path: [fxz(-4 + (k % 5) * 1.6, -6 + Math.floor(k / 5) * 1.6), fxz(-4 + (k % 5) * 1.6, -40)], speed: 1.45, delay: k * 0.12, gear: MASKED, act: CAST_BY_ID[id].team == null ? '' : 'carry' }])),
        cam: path([fw(-6, -14, 2.2), fw(-6, -19, 2.4)], [fw(-1, -4, 1.4), fw(-1, -9, 1.4)], 46),
        panel: { kind: 'lobby', from: 0.3, to: 8.7 },
        lines: [[7, 'sana', 'Everyone’s ready. Med-C, here we come!', 1.9]],
        hots: [{ id: 'lobby', from: 0.8, to: 8.6, screen: [0.5, 0.11], label: 'The lobby', lobby: true, title: 'The pre-match lobby', text: 'In the story, the friends meet in a lobby before the match: pick a mode and an arena, choose a team and two blasters each, then tick Ready. The paintball game has the same kind of lobby for real matches.' }],
      },
      // ================= Scene 4 · Entering the Arena =================
      {
        name: 'arena-aerial', scene: 3, dur: 8, clock: [hm(15, 45), hm(15, 47)], arena: true, ease: 'inOut',
        cam: orbit([AC.x, AC.z], [120, 64], -2.3, -1.5, 80, 34, 0, 40),
        caption: { kicker: 'Scene 4', title: 'Entering the Arena · Med-C Ground', at: 0.6, hold: 5.5 },
        hots: [{ id: 'arena', from: 0.8, at: [AC.x, 4, AC.z], label: 'Arena layout', place: 'Med-C', title: 'Med-C Ground arena', text: `A ${MEDC.bounds.maxX - MEDC.bounds.minX} × ${MEDC.bounds.maxZ - MEDC.bounds.minZ} m speedball-style field on the north outfield of the Med-C cricket ground: ${MEDC.solids.length} inflatable bunkers (a tower in the middle, snakes, cans, cubes, temples, doritos and walls), mirror-symmetric so no side is favoured, inside a net. Two teams start at the west and east ends.` }],
      },
      {
        name: 'arena-walkin', scene: 3, dur: 8, clock: [hm(15, 48), hm(15, 50)], arena: true, dof: 'advait',
        actors: Object.fromEntries(ALL.map((id, k) => {
          const c = CAST_BY_ID[id]; const lane = -1.6 + (k % 3) * 1.6;
          const end = c.team == null ? (id === 'sana' ? [-28, -14] : [-27, 14]) : c.team === 0 ? [-30, -8 + (k % 4) * 3] : [-18, -8 + (k % 4) * 3];
          return [id, { path: [A(-45 - k * 1.1, lane), A(-36, lane * 0.5), A(...end)], speed: 1.55, gear: MASKED, act: c.team == null ? '' : 'carry', face: A(0, 0) }];
        })),
        cam: (c) => ({ pos: V(...A3(-25 - c.e * 2, 1.7, 5.5)), look: V(...A3(-38 + c.e * 8, 1.3, -1)), fov: 46 }),
        lines: [[1, 'vikram', 'And here they come, onto the Med-C Ground!', 2.4], [4.6, 'kabir', 'Those bunkers are huge!', 1.8]],
      },
      {
        name: 'arena-teams', scene: 3, dur: 9, clock: [hm(15, 52), hm(15, 54)], arena: true, ease: 'inOut',
        actors: {
          ...Object.fromEntries(PLAYERS.map((id) => [id, { at: toW(SPAWN[id]), face: A(0, SPAWN[id][1]), gear: MASKED, act: (t) => (t > (CAST_BY_ID[id].team ? 5.6 : 2.2) && t < (CAST_BY_ID[id].team ? 7.6 : 4.2) ? 'fist' : 'carry') }])),
          sana: { at: A(0, -15.5), face: A(0, 0), talk: [[0.2, 2.2]], act: (t) => (t < 2.2 ? 'point' : '') },
          vikram: { at: A(2.5, -16), face: A(0, 0), act: 'photo', gear: { phone: true } },
        },
        cam: (c) => { const a = THREE.MathUtils.smoothstep(c.t, 2.4, 5.4); const side = -1 + 2 * a; return { pos: V(...A3(side * (21 + c.t * 0.3), 5.2, -23)), look: V(...A3(side * 32, 1.0, 0)), fov: 36 }; },
        panel: { kind: 'teams', from: 2, to: 8.8 },
        lines: [[0.2, 'sana', 'Welcome to the Med-C Ground! 4v4, three minutes.', 2], [2.3, 'vikram', 'Pink team: Advait, Aanya, Kabir and Tara!', 2.6], [5.6, 'vikram', 'Cyan team: Rohan, Ishaan, Neha and Arjun!', 2.6]],
      },
      {
        name: 'arena-countdown', scene: 3, dur: 6, clock: [hm(15, 58), hm(15, 59)], arena: true, dof: 'advait',
        actors: { ...Object.fromEntries(PLAYERS.map((id) => [id, { at: toW(SPAWN[id]), face: A(0, SPAWN[id][1]), gear: MASKED, act: 'carry' }])), sana: { at: A(0, -15.5), face: A(0, 0), act: (t) => (t > 4.2 ? 'fist' : '') } },
        cam: (c) => { const m = P('advait'); return { pos: V(m.x + 3.0 - c.e * 0.9, 1.55, m.z + 0.9), look: V(m.x - 0.3, 1.5, m.z - 0.3), fov: 38 - c.e * 6 }; },
        panel: { kind: 'countdown', from: 0.6, to: 6 },
        cues: [[0.8, 'beep'], [2, 'beep'], [3.2, 'beep'], [4.4, 'whistle']],
        lines: [[0.1, 'sana', 'Masks down. Three… two… one…', 4]],
      },
      // ================= Scene 5 · The Match =================
      {
        name: 'match-rush', scene: 4, dur: 7, clock: [hm(16, 0), hm(16, 0.5)], arena: true, ease: 'linear',
        actors: Object.fromEntries(PLAYERS.map((id) => [id, { path: [toW(SPAWN[id]), toW([(SPAWN[id][0] + COVER[id][0]) / 2, (SPAWN[id][1] + COVER[id][1]) / 2]), toW(COVER[id])], gait: 'run', speed: 4.6 + (id.length % 3) * 0.3, face: A(CAST_BY_ID[id].team ? -30 : 30, 0), act: (t, mv) => (mv ? 'carry' : 'crouch+aim'), gear: MASKED }])),
        cam: path([A3(-44, 18, 28), A3(-28, 14, 30), A3(-10, 12, 29)], [A3(-12, 0, 0), A3(-2, 0, 0), A3(6, 0, -2)], 48),
        fire: [
          ...volley('arjun', 3.4, 6, 0.12, bunker('cube', 0, 9, -3, 1)),
          ...volley('tara', 4.2, 3, 0.18, bunker('can', 1, -10, 3, 1)),
          ...volley('rohan', 5.4, 1, 0.5, bunker('dorito', 0, 23, -8, 0.8), { dur: 0.3 }),
        ],
        caption: { kicker: 'Scene 5', title: 'The Match', at: 0.3, hold: 2.4 },
        hud: true,
      },
      {
        name: 'match-ots', scene: 4, dur: 7, clock: [hm(16, 1), hm(16, 1.5)], arena: true, dof: 'arjun',
        actors: {
          advait: coverSpec('advait', { face: A(9.5, -3.4), act: (t) => (t > 1 && t < 5.4 ? 'aim' : 'crouch+aim'), talk: [[4.8, 6.4]] }),
          arjun: coverSpec('arjun', { path: [toW(COVER.arjun), toW([16, -10])], speed: 1.5, delay: 4.4, face: A(-17, 0), act: (t) => (t < 4.2 ? 'aim' : 'handsup'), hitAt: 4.1 }),
          neha: coverSpec('neha', { act: (t) => (t > 2 ? 'aim' : 'crouch+aim') }),
        },
        cam: () => { const m = P('advait'); const d = V(...A3(9.5, 0, -3.4)).sub(m).setY(0).normalize(); const r = V(-d.z, 0, d.x); return { pos: m.clone().addScaledVector(d, -2.7).addScaledVector(r, 0.95).setY(1.75), look: V(...A3(9.5, 1.0, -3.4)), fov: 34 }; },
        fire: [
          ...volley('arjun', 0.4, 5, 0.12, bunker('cube', 0, 9, -3, 1.1), { dur: 0.3 }),
          ...volley('advait', 1.4, 6, 0.42, bunker('can', 1, -17, 0, 1.0), { dur: 0.36, last: { actor: 'arjun' } }),
        ],
        tags: [[4.1, 'advait', 'arjun', 'tag']],
        lines: [[4.8, 'advait', 'Tagged! Arjun’s out!', 1.6]],
        hud: true,
      },
      {
        name: 'match-run', scene: 4, dur: 7, clock: [hm(16, 2), hm(16, 2.5)], arena: true, dof: 'aanya',
        actors: {
          aanya: { path: [toW(COVER.aanya), toW([-15, 10.9]), toW([-6, 11.2])], gait: 'run', speed: 5, delay: 0.5, face: A(30, 5), act: (t, mv) => (mv ? 'carry' : 'crouch+aim'), talk: [[0.1, 1.7]] },
          neha: coverSpec('neha', { face: () => P('aanya'), act: 'aim' }),
          ishaan: coverSpec('ishaan', { face: () => P('aanya'), act: 'aim' }),
          tara: coverSpec('tara', { act: 'aim', face: A(13.5, 12.2) }),
        },
        cam: follow('aanya', 4.2, 1.9, 1.6, 6, 1.1, 50),
        fire: [
          ...volley('neha', 1.0, 6, 0.35, ground(-10, 11.5), { dur: 0.45, jitter: 0.7 }),
          ...volley('ishaan', 2.4, 3, 0.6, bunker('snake', 1, 13, 12, 0.6), { dur: 0.4, jitter: 0.5 }),
          ...volley('tara', 3.0, 4, 0.22, bunker('dorito', 3, 13.5, 12.2, 0.9), { dur: 0.42 }),
        ],
        lines: [[0.1, 'aanya', 'Cover me, I’m going for the snake!', 1.8], [4.4, 'tara', 'Covering! Go, go!', 1.6]],
        hud: true,
      },
      {
        name: 'match-tag-close', scene: 4, dur: 6, clock: [hm(16, 3), hm(16, 3.5)], arena: true, dof: 'ishaan',
        actors: {
          ishaan: coverSpec('ishaan', { path: [toW(COVER.ishaan), toW([20, 17])], speed: 1.3, delay: 3.2, face: A(-9.5, 3.4), act: (t) => (t < 2.3 ? 'aim' : 'handsup'), hitAt: 2.2, talk: [[3, 5]] }),
          tara: coverSpec('tara', { face: A(13.5, 12.2), act: 'aim' }),
        },
        cam: (c) => { const n = P('ishaan'); return { pos: V(...A3(10.9 + c.e * 1.2, 1.55, 10.2 + c.e * 1.6)), look: V(n.x, 1.3, n.z), fov: 34 }; },
        fire: [...volley('tara', 0.5, 5, 0.42, bunker('dorito', 3, 9.5, 3.4, 1.0), { dur: 0.42, last: { actor: 'ishaan' } })],
        tags: [[2.2, 'tara', 'ishaan', 'tag']],
        lines: [[3, 'ishaan', 'Aaah, painted! Round elimination… back soon.', 2.6]],
        hud: true,
      },
      {
        name: 'match-precision', scene: 4, dur: 7, clock: [hm(16, 4), hm(16, 4.5)], arena: true, dof: 'kabir',
        actors: {
          rohan: coverSpec('rohan', { at: toW([23.4, -10.8]), face: A(-13.5, -12.2), act: 'aim', talk: [[4.2, 6]] }),
          kabir: coverSpec('kabir', { face: A(23.4, -8.6), act: (t) => (t < 2.6 ? 'crouch' : t < 3.7 ? 'aim' : 'handsup'), hitAt: 3.7 }),
        },
        cam: (c) => {
          if (c.t < 3.75) { const r = P('rohan'); return { pos: V(r.x + 0.8, 1.72, r.z + 0.5), look: V(...A3(-13.5, 1.35, -12.2)), fov: 18 - c.t * 1.5 }; }
          const k = P('kabir'); return { pos: V(k.x - 3.0, 1.5, k.z + 2.2), look: V(k.x, 1.25, k.z), fov: 40 };
        },
        fire: [{ by: 'rohan', t: 3.3, dur: 0.4, hit: { actor: 'kabir' }, colour: col('rohan') }],
        tags: [[3.7, 'rohan', 'kabir', 'precision']],
        lines: [[4.2, 'rohan', 'Precision paint hit!', 1.8]],
        hud: true,
      },
      {
        name: 'match-splash', scene: 4, dur: 6, clock: [hm(16, 5), hm(16, 5.5)], arena: true,
        actors: {
          kabir: { at: toW([-20.5, -6]), face: A(17.7, -0.4), act: (t) => (t < 1 ? 'carry' : 'aimUp'), talk: [[0.4, 1.8]] },
          neha: coverSpec('neha', { act: (t) => (t < 2.9 ? 'aim' : 'handsup'), hitAt: 2.8 }),
          rohan: coverSpec('rohan', { act: 'crouch' }),
        },
        cam: (c) => { const k = P('kabir'); const tg = V(...A3(17.7, 0.9, -0.4)); const d = tg.clone().sub(k).setY(0).normalize(); const r = V(-d.z, 0, d.x); return { pos: k.clone().addScaledVector(d, -3.2).addScaledVector(r, 1.0).setY(2.0), look: tg.clone().setY(0.6), fov: 36 - c.e * 8 }; },
        fire: [{ by: 'kabir', t: 1.4, dur: 1.4, arc: 3.2, hit: { p: A3(16.4, 0.03, 0.9), n: [0, 1, 0], r: 0.6 }, colour: col('kabir'), big: true }, { by: 'kabir', t: 1.4, dur: 1.4, arc: 3.2, hit: { actor: 'neha' }, colour: col('kabir') }],
        tags: [[2.8, 'kabir', 'neha', 'splash']],
        lines: [[0.4, 'kabir', 'Splash incoming!', 1.4], [3.3, 'neha', 'Orange?! Everywhere!', 1.8]],
        hud: true,
      },
      {
        name: 'match-highfive', scene: 4, dur: 7, clock: [hm(16, 6), hm(16, 6.5)], arena: true, dof: 'aanya',
        actors: {
          aanya: { at: toW([-5.8, 11.3]), face: () => P('tara'), act: (t) => (t > 1.4 && t < 2.6 ? 'highfive' : t > 2.6 && t < 4.2 ? 'cheer' : 'carry'), talk: [[2.8, 4.6]] },
          tara: { path: [toW(COVER.tara), toW([-7, 10.2])], gait: 'run', speed: 4.5, face: () => P('aanya'), act: (t) => (t > 1.4 && t < 2.6 ? 'highfive' : 'carry') },
        },
        cam: (c) => ({ pos: V(...A3(-8.6 + c.e, 1.2, 13.6)), look: V(...A3(-6.2, 1.5, 10.6)), fov: 42 }),
        cues: [[1.9, 'clap']],
        // the rest of the match, in the tag feed: five all going into the last ten seconds
        tags: [[3.6, 'rohan', 'tara', 'tag'], [4.4, 'arjun', 'advait', 'tag'], [5.1, 'neha', 'kabir', 'tag'], [5.7, 'advait', 'neha', 'tag'], [6.3, 'aanya', 'ishaan', 'tag'], [6.8, 'rohan', 'kabir', 'precision']],
        lines: [[2.8, 'aanya', 'That’s how Pink does it!', 1.8]],
        hud: true,
      },
      // ================= Scene 6 · Final Moments =================
      {
        name: 'final-tension', scene: 5, dur: 7, clock: [hm(16, 9), hm(16, 9.5)], arena: true, dof: 'advait',
        actors: {
          advait: { path: [toW([-17.7, 1.8]), toW([-14.5, 2.4]), toW([-9.6, 3.0])], speed: 1.2, delay: 1.2, face: A(23.4, -8.6), act: 'crouch+aim' },
          rohan: coverSpec('rohan', { face: () => P('advait'), act: 'aim' }),
        },
        cam: () => { const m = P('advait'); return { pos: V(m.x - 1.6, 1.45, m.z + 3.6), look: V(m.x + 2, 1.0, m.z - 0.6), fov: 46 }; },
        caption: { kicker: 'Scene 6', title: 'Final Moments', at: 0.3, hold: 2.2 },
        lines: [[2.2, 'vikram', 'Ten seconds left, five all! Advait against Rohan!', 2.6], [5, 'advait', 'Last hopper. Make it count.', 1.9]],
        cues: [[3, 'tick'], [4, 'tick'], [5, 'tick'], [6, 'tick']],
        hud: true,
      },
      {
        name: 'final-tag', scene: 5, dur: 7, clock: [hm(16, 10), hm(16, 10.3)], arena: true, ease: 'linear', dof: 'rohan',
        actors: {
          advait: { path: [toW([-9.6, 3.0]), toW([-5.2, -6.8])], gait: 'run', speed: 3.6, delay: 0.4, face: A(23.4, -8.6), act: 'aim' },
          rohan: coverSpec('rohan', { face: () => P('advait'), act: (t) => (t < 3.6 ? 'aim' : 'handsup'), hitAt: 3.5 }),
        },
        cam: (c) => {
          if (c.t < 3) { const m = P('advait'); return { pos: V(m.x - 1.5, 1.5, m.z + 3.4), look: V(m.x + 2, 1.2, m.z - 1), fov: 44 }; }
          const r = P('rohan'); return { pos: V(r.x + 3.4 - (c.t - 3) * 0.15, 1.6, r.z + 3.0), look: V(r.x - 0.4, 1.3, r.z), fov: 40 };
        },
        fire: [
          ...volley('rohan', 0.8, 2, 0.9, ground(-7, -5.4), { dur: 0.35 }),
          { by: 'advait', t: 2.4, dur: 1.1, hit: { actor: 'rohan' }, colour: col('advait') },
        ],
        tags: [[3.5, 'advait', 'rohan', 'final']],
        lines: [[4, 'sana', 'TIME! That’s the match!', 2.4]],
        cues: [[3.8, 'whistle'], [4.2, 'cheer']],
        hud: true,
      },
      {
        name: 'final-scoreboard', scene: 5, dur: 8, clock: [hm(16, 11), hm(16, 12)], arena: true, ease: 'inOut',
        actors: {
          ...Object.fromEntries(PINK.map((id, k) => [id, { at: A(-6 + k * 1.3, -4.4 + (k % 2) * 1.2), face: A(-4, -12), act: k % 2 ? 'cheer+jump' : 'cheer', gear: MASKED }])),
          ...Object.fromEntries(CYAN.map((id, k) => [id, { at: A(-0.6 + k * 1.5, -6.6 + (k % 2)), face: A(-4, -12), act: k === 0 ? 'clap' : 'arms', gear: MASKED }])),
          sana: { at: A(-7.5, -8), face: A(-4, -4), act: 'point' },
          vikram: { at: A(1.8, -9.4), face: A(-2, -5), act: 'photo', gear: { phone: true } },
        },
        cam: path([A3(-3, 3.6, -16), A3(-3.6, 4.6, -17.5)], [A3(-3, 1.0, -5), A3(-2.6, 1.2, -4)], [50, 54]),
        panel: { kind: 'score', from: 0.4, to: 8 },
        lines: [[0.6, 'sana', 'Final score: Pink 6, Cyan 5. Pink wins!', 3]],
        cues: [[0.4, 'cheer'], [3, 'cheer']],
      },
      {
        name: 'final-congrats', scene: 5, dur: 7, clock: [hm(16, 13), hm(16, 14)], arena: true, dof: 'rohan',
        actors: {
          advait: { at: A(-4.6, -6), face: () => P('rohan'), act: (t) => (t > 0.6 && t < 2.2 ? 'highfive' : ''), gear: { masks: false, blaster: true, band: true, paint: 1 }, talk: [[4, 5.6]] },
          rohan: { at: A(-3.4, -5.6), face: () => P('advait'), act: (t) => (t > 0.6 && t < 2.2 ? 'highfive' : ''), gear: { masks: false, blaster: true, band: true, paint: 2 }, talk: [[1.8, 3.8]] },
          aanya: { at: A(-6, -4.6), face: () => P('ishaan'), act: (t) => (t > 2.6 && t < 4 ? 'highfive' : 'clap'), gear: { masks: false, blaster: true, band: true, paint: 1 } },
          ishaan: { at: A(-5.1, -3.9), face: () => P('aanya'), act: (t) => (t > 2.6 && t < 4 ? 'highfive' : ''), gear: { masks: false, blaster: true, band: true, paint: 2 } },
          tara: { at: A(-6.8, -6.6), face: A(-4.5, -6), act: 'clap', gear: { masks: false, blaster: true, band: true, paint: 1 } },
          neha: { at: A(-2.3, -4.4), face: A(-4.5, -5.6), act: 'clap', gear: { masks: false, blaster: true, band: true, paint: 2 } },
        },
        cam: (c) => ({ pos: V(...A3(-4.2 + c.e * 0.6, 1.6, -9.8)), look: V(...A3(-4.3, 1.5, -5.4)), fov: 42 }),
        cues: [[1.1, 'clap'], [3.2, 'clap']],
        lines: [[1.8, 'rohan', 'Good game, Advait. Rematch next weekend?', 2], [4, 'advait', 'Every weekend!', 1.8]],
      },
      // ================= Scene 7 · Ending =================
      {
        name: 'end-photo', scene: 6, dur: 8, clock: [hm(17, 20), hm(17, 22)], arena: true, ease: 'inOut',
        actors: {
          ...Object.fromEntries(ALL.filter((id) => id !== 'vikram').map((id, k) => [id, { at: A(-4 + (k % 5) * 1.3 + (k >= 5 ? 0.65 : 0), -16 + (k >= 5 ? -1.1 : 0)), face: A(-1.5, -8), act: (t) => (t > 4.2 && t < 5.8 ? 'cheer' : k % 3 === 0 ? 'arms' : ''), gear: { masks: false, blaster: true, band: true, paint: 1 + (k % 3) }, talk: [[4.2, 5.4]] }])),
          vikram: { path: [A(-1.5, -12.2), A(2.6, -15.4), A(1.9, -17.1)], speed: 2.2, delay: 1.4, face: A(-1.5, -8), act: (t) => (t < 1.6 ? 'photo' : t > 4.2 && t < 5.8 ? 'cheer' : ''), gear: { phone: true, paint: 1 } },
        },
        cam: path([A3(-1.5, 1.55, -11.1), A3(-1.5, 1.7, -11.6)], [A3(-1.5, 1.35, -16), A3(-1.5, 1.45, -16)], [58, 54]),
        cues: [[4.1, 'shutter'], [4.3, 'cheer']],
        lines: [[0.4, 'vikram', 'Everyone in! Self-timer… say “paintball”!', 3], [4.2, 'all', 'PAINTBALL!', 1.4], [6, 'sana', 'Same time next week?', 1.8]],
        caption: { kicker: 'Scene 7', title: 'After the match', at: 0.3, hold: 2.4 },
        panel: { kind: 'flash', from: 4.1, to: 4.8 },
      },
      {
        name: 'end-campus', scene: 6, dur: 17, clock: [hm(17, 40), hm(17, 52)], arena: true, ease: 'inOut',
        actors: Object.fromEntries(ALL.map((id, k) => [id, { path: [A(-3 + (k % 5) * 1.2, -15 - Math.floor(k / 5) * 1.3), A(-1 + (k % 5) * 1.2, -21), A(-60 + (k % 5) * 1.3, -36 - Math.floor(k / 5) * 1.4)], speed: 1.35, gear: { masks: false, blaster: true, band: true, paint: 1 + (k % 2) }, act: () => (k === 1 ? 'wave' : '') }])),
        cam: path([A3(-6, 2.2, -4), [AC.x - 30, 45, AC.z + 50], [AC.x - 60, 150, AC.z + 150]], [A3(-4, 1.4, -20), [200, 10, 660], [40, 15, 300]], [46, 40]),
        hots: [{ id: 'roam', from: 4, to: 16.6, screen: [0.5, 0.8], label: 'Campus Free Roam', roam: true, place: null, title: 'Campus Free Roam', text: 'Fly over the whole real-scale BITS Pilani campus like a map, pick any of more than a hundred places, and walk inside the Bhawans, the Library, NAB and more.' }],
      },
    ];
    // the closing title over the rising campus shot, and the opening one over the first aerial
    let at = 0; for (const s of shots) at += s.dur;
    this.titles.push({ t0: 1.6, t1: 10.6, title: FILM_NAME, sub: 'A weekend paintball story · BITS Pilani' });
    this.titles.push({ t0: at - 13.5, t1: at - 1.2, title: FILM_NAME, sub: FILM_LINE });
    this.walkWarm = true;
    return shots;
  }

  // Crates of washable paintballs on a low table, for the supplies shot.
  crates(c) {
    const g = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: '#c49a6c', roughness: 0.8 });
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 0.9), wood); table.position.set(0, 0.72, 0); g.add(table);
    for (const [x, z] of [[-1.1, -0.38], [1.1, -0.38], [-1.1, 0.38], [1.1, 0.38]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, 0.06), wood); l.position.set(x, 0.36, z); g.add(l); }
    const cols = ['#ff3d7f', '#30d5ff', '#ffd23d', '#7cff4f', '#b26bff', '#ff8a1f'];
    cols.forEach((colour, k) => {
      const x = -0.95 + (k % 3) * 0.95; const z = k < 3 ? -0.2 : 0.22;
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.36), new THREE.MeshStandardMaterial({ color: '#f5f6fa', roughness: 0.6 }));
      box.position.set(x, 0.83, z); g.add(box);
      for (let i = 0; i < 40; i++) { const b = paintball(colour); b.scale.setScalar(0.9); b.position.set(x - 0.26 + (i % 8) * 0.075, 0.93 + Math.floor(i / 24) * 0.04, z - 0.12 + (Math.floor(i / 8) % 3) * 0.12); g.add(b); }
    });
    g.position.set(c[0], c[1], c[2]);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.props.add(g);
  }
}

// helpers used inside shot ticks
function gestureHandsIn(n) { n.arms[1].rotation.x = -1.25; n.arms[1].rotation.z = -0.2; n.elbows[1].rotation.x = -0.1; n.group.updateMatrixWorld(true); }

export { teamColour, TEAMS };
