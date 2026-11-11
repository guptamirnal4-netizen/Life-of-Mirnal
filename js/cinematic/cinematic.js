// The film: Mirnal's journey from the first day of Class 1 at Sunrise Public School to BITS Pilani, a ~4-minute
// cinematic played in the game's own engine, in both worlds (school, then the real-scale BITS campus).
//
// Everything on screen is a function of time: the shot list below gives each shot a duration, a time of day,
// a camera move (splines, or a follow rig around Mirnal), a cast and an on-screen title. update(dt) plays it in
// real time; with a fixed dt the same frames come out every run, which is how the video is rendered
// (see dev/render-film.mjs). The film has its own cast and touches nothing in the saved game.
import * as THREE from 'three';
import { NPC } from '../world/npcs.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const curve = (pts) => (pts.length === 2 ? new THREE.LineCurve3(V(...pts[0]), V(...pts[1])) : new THREE.CatmullRomCurve3(pts.map((p) => V(...p)), false, 'centripetal'));
const EASE = {
  linear: (u) => u,
  inOut: (u) => 0.5 - 0.5 * Math.cos(Math.PI * u),
  out: (u) => 1 - (1 - u) * (1 - u),
  in: (u) => u * u,
  // starts moving, glides, settles: most camera moves
  glide: (u) => (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u)) * 0.7 + u * 0.3,
};
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const hm = (h, m = 0) => h * 60 + m;
// a long, light haze over the real-scale campus; a short one round the small school, so its edge stays hidden
const FILM_RANGE = { college: { fogNear: 420, fogFar: 1700, skyScale: 2400 }, school: { fogNear: 70, fogFar: 330, skyScale: 700 } };

// A walk along a polyline at a steady speed; heading looks a little ahead so corners turn smoothly.
class Walk {
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
    const a = this.at(s - 0.8); const b = this.at(s + 1.6);
    return Math.atan2(b.x - a.x, b.z - a.z);
  }
}

const LOOKS = [
  ['#c0392b', '#2c3e50', 'm'], ['#2e86de', '#34495e', 'f'], ['#27ae60', '#1f2a44', 'm'], ['#8e44ad', '#2d3436', 'f'],
  ['#f39c12', '#1f2a44', 'm'], ['#16a085', '#3a3f4a', 'f'], ['#d35400', '#2c3e50', 'm'], ['#e84393', '#34495e', 'f'],
  ['#0984e3', '#2d3436', 'm'], ['#6c5ce7', '#1f2a44', 'm'], ['#00b894', '#3a3f4a', 'f'], ['#fdcb6e', '#2c3e50', 'm'],
  ['#e17055', '#1f2a44', 'f'], ['#74b9ff', '#2d3436', 'm'], ['#a29bfe', '#34495e', 'f'], ['#55efc4', '#2c3e50', 'm'],
];

const STYLE = `
#film { position: fixed; inset: 0; z-index: 50; pointer-events: none; color: #fff; font-family: 'Avenir Next', 'Futura', 'Helvetica Neue', system-ui, sans-serif; overflow: hidden; }
#film .lb { position: absolute; left: 0; right: 0; height: 11.5vh; background: #000; }
#film .lb.top { top: 0; } #film .lb.bot { bottom: 0; }
#film .fade { position: absolute; inset: 0; background: #000; }
#film .title { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); text-align: center; text-shadow: 0 4px 30px rgba(0,0,0,0.45); }
#film .title h1 { margin: 0; font-weight: 800; font-size: 9vh; letter-spacing: 0.32em; padding-left: 0.32em; }
#film .title p { margin: 1.6vh 0 0; font-weight: 500; font-size: 2.3vh; letter-spacing: 0.55em; padding-left: 0.55em; text-transform: uppercase; opacity: 0.92; }
#film .cap { position: absolute; left: 6vw; bottom: 16vh; text-shadow: 0 2px 16px rgba(0,0,0,0.55); }
#film .cap .k { font-size: 1.7vh; letter-spacing: 0.42em; text-transform: uppercase; font-weight: 600; color: #ffd27a; }
#film .cap .n { font-size: 4.6vh; font-weight: 700; letter-spacing: 0.06em; margin-top: 0.6vh; }
#film .cap .rule { height: 2px; background: linear-gradient(90deg, #ffd27a, rgba(255,210,122,0)); margin-top: 1.2vh; }
#film .skip { position: absolute; right: 2.5vw; bottom: 3.6vh; font-size: 1.5vh; letter-spacing: 0.2em; text-transform: uppercase; opacity: 0.55; }
`;

export class Cinematic {
  // world: { scene, camera, campus (BITS), school (the school campus), setWorld(kind), graphics, bike, range }
  constructor(world) {
    Object.assign(this, world);
    this.t = 0;
    this.index = -1;
    this.rig = { pos: V(0, 0, 0), look: V(0, 0, 0), ready: false };
    this.shots = this.buildShots();
    let at = 0;
    for (const s of this.shots) { s.t0 = at; at += s.dur; s.t1 = at; }
    this.duration = at;
  }

  // ---------- lifecycle ----------
  start({ onEnd = null, showSkip = true, music = null } = {}) {
    this.onEnd = onEnd;
    // the score (dev/film-score.mjs); while it plays, the film's clock follows it, so picture and music stay in step
    if (music) {
      this.music = new Audio(music);
      this.music.volume = 0.85;
      this.music.play().catch(() => { this.music = null; });
    }
    this.saved = { far: this.camera.far, fov: this.camera.fov, near: this.camera.near };
    this.camera.far = 3200;
    this.camera.near = 0.1;
    this.buildOverlay(showSkip);
    this.buildCast();
    this.buildBirds();
    // no name labels in the film, and a long, light haze so the air shots see the whole campus
    this.sprites = [];
    this.scene.traverse((o) => { if (o.isSprite) this.sprites.push([o, o.visible]); });
    this.t = 0;
    this.index = -1;
    this.worldNow = null;
    this.done = false;
  }

  // End now (Esc or the skip button).
  finish() {
    if (this.done) return;
    this.done = true;
    this.onEnd?.();
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    if (this.music) { this.music.pause(); this.music = null; }
    this.el?.remove();
    this.styleEl?.remove();
    for (const n of this.cast) n.dispose();
    this.guide.dispose();
    this.birds && this.scene.remove(this.birds.group);
    this.bike.visible = false;
    this.graphics.post.setDof(null);
    for (const [o, v] of this.sprites) o.visible = v;
    if (this.range) this.graphics.env.setRange(this.range);
    Object.assign(this.camera, this.saved);
    this.camera.updateProjectionMatrix();
    const sun = this.graphics.env.sun.shadow.camera;
    if (this.savedShadow) { Object.assign(sun, this.savedShadow); sun.updateProjectionMatrix(); }
  }

  // Real-time playback; returns false when the film has ended.
  update(dt) {
    if (this.done) return false;
    if (this.music && !this.music.paused && this.music.currentTime > 0) dt = Math.max(0, Math.min(1 / 15, this.music.currentTime - this.t));
    this.step(Math.min(dt, 1 / 15));
    this.graphics.render();
    if (this.t >= this.duration) { this.done = true; this.onEnd?.(); return false; }
    return true;
  }

  // Jump to time t (to preview a shot): sets the shot up and simulates from its start without drawing.
  seek(t, dt = 1 / 30) {
    const i = this.shots.findIndex((s) => t < s.t1);
    const s = this.shots[i < 0 ? this.shots.length - 1 : i];
    this.t = s.t0;
    this.index = -1;
    while (this.t + dt <= t) this.step(dt, false);
  }

  // Advance by dt: shot changes, camera, time of day, cast, overlay, and the world's own animation.
  step(dt, render = false) {
    const t = this.t;
    let i = this.shots.findIndex((s) => t < s.t1);
    if (i < 0) i = this.shots.length - 1;
    const s = this.shots[i];
    if (i !== this.index) {
      this.index = i;
      this.rig.ready = false;
      this.shotTime = 0;
      for (const n of this.cast) { n.group.visible = false; n.path = []; n.seated = false; n.singing = false; n.gait = 'walk'; }
      const w = s.world || 'college';
      if (w !== this.worldNow) {
        this.worldNow = w;
        this.setWorld?.(w);
        this.graphics.env.setRange(FILM_RANGE[w]);
        this.camera.far = 3200;
        this.camera.updateProjectionMatrix();
      }
      this.cur = w === 'school' ? this.school : this.campus;
      this.guide.setHeight(s.guideHeight || 1.74);
      this.guide.singing = false;
      this.guide.seated = false;
      this.guide.group.visible = false;
      this.bike.visible = false;
      this.birds.group.visible = false;
      this.ctx = { shot: s };
      s.setup?.(this.ctx);
    }
    const u = clamp01((t - s.t0) / s.dur);
    const ctx = this.ctx;
    ctx.u = u; ctx.t = t - s.t0; ctx.dt = dt;
    const clock = s.clock[0] + (s.clock[1] - s.clock[0]) * u;
    this.clock = clock;
    s.tick?.(ctx, u, dt);
    for (const n of this.cast) if (n.group.visible && !n.driven) n.update(dt, null, null);
    // camera
    const e = (EASE[s.ease] || EASE.glide)(u);
    const pos = typeof s.pos === 'function' ? s.pos(ctx, e) : s.pos.getPoint(e);
    const look = typeof s.look === 'function' ? s.look(ctx, e) : s.look.getPoint(e);
    if (s.damp && this.rig.ready) {
      const k = 1 - Math.exp(-s.damp * dt);
      this.rig.pos.lerp(pos, k);
      this.rig.look.lerp(look, k);
    } else { this.rig.pos.copy(pos); this.rig.look.copy(look); this.rig.ready = true; }
    this.camera.position.copy(this.rig.pos);
    this.camera.lookAt(this.rig.look);
    if (s.roll) this.camera.rotateZ(s.roll * Math.sin(Math.PI * u));
    const fov = Array.isArray(s.fov) ? s.fov[0] + (s.fov[1] - s.fov[0]) * e : s.fov || 42;
    if (this.camera.fov !== fov) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
    this.birds.update(dt, this.rig.pos);
    // depth of field (rendered video only): focus on Mirnal or the shot's subject
    if (this.capturing) {
      const d = s.dof;
      const subject = d && (d.on === 'guide' ? this.guide.pos.clone().setY(1.3) : d.on ? V(...d.on) : null);
      this.graphics.post.setDof(subject ? { focus: this.rig.pos.distanceTo(subject), aperture: d.aperture ?? 0.0005, maxblur: d.maxblur ?? 0.0055 } : null);
    }
    // sun shadows cover what the camera looks at, wider from the air
    const alt = this.rig.pos.y;
    const sc = this.graphics.env.sun.shadow.camera;
    if (!this.savedShadow) this.savedShadow = { left: sc.left, right: sc.right, top: sc.top, bottom: sc.bottom };
    const span = THREE.MathUtils.clamp(alt * 1.6, -this.savedShadow.left * 2, 520);
    if (Math.abs(sc.right - span / 2) > 1) { sc.left = -span / 2; sc.right = span / 2; sc.top = span / 2; sc.bottom = -span / 2; sc.updateProjectionMatrix(); }
    const focus = V(this.rig.look.x, alt, this.rig.look.z);
    (this.cur || this.campus).setClock?.(clock);
    // (this also runs the campus's own update: hostel interiors near the camera, label fading)
    this.graphics.update(dt, { clock, focus, view: 'cinematic' });
    for (const [o] of this.sprites) o.visible = false;
    for (const l of this.campus.labels || []) l.visible = false;
    this.updateOverlay(t);
    this.t += dt;
    if (render) this.graphics.render();
  }

  // ---------- cast ----------
  buildCast() {
    this.guide = new NPC(this.scene, { id: 'film-mirnal', name: 'Mirnal', role: 'student', color: '#ffffff', pants: '#24345a', skinIndex: 0, height: 1.74 });
    this.guide.tag.visible = false;
    this.cast = LOOKS.concat(LOOKS).map(([color, pants, gender], i) => {
      const n = new NPC(this.scene, { id: `film-${i}`, name: '', role: 'student', color, pants, gender, outfit: 'casual', skinIndex: i % 4, height: 1.6 + ((i * 37) % 17) / 100 });
      n.tag.visible = false;
      n.speed = 1.3 + ((i * 13) % 5) / 10;
      n.group.visible = false;
      return n;
    });
    this.collegeCast = this.cast.length;
    this.prof = new NPC(this.scene, { id: 'film-prof', name: '', role: 'teacher', outfit: 'formal', gender: 'm', color: '#5d4e37', pants: '#2d2d2d', skinIndex: 2, height: 1.72 });
    this.prof.tag.visible = false;
    this.cast.push(this.prof);
    // the school: children in uniform, and a teacher
    this.kidBase = this.cast.length;
    for (let i = 0; i < 24; i++) {
      const [, , gender] = LOOKS[(i * 5) % LOOKS.length];
      const n = new NPC(this.scene, { id: `film-kid-${i}`, name: '', role: 'student', gender, color: '#ffffff', pants: '#24345a', skinIndex: (i * 3) % 6, height: 1.1 + ((i * 7) % 9) / 100 });
      n.tag.visible = false;
      n.speed = 1.0 + ((i * 3) % 4) / 10;
      n.group.visible = false;
      this.cast.push(n);
    }
    this.teacher = new NPC(this.scene, { id: 'film-teacher', name: '', role: 'teacher', outfit: 'saree', gender: 'f', color: '#b5476b', pants: '#333', skinIndex: 1, height: 1.62 });
    this.teacher.tag.visible = false;
    this.cast.push(this.teacher);
  }

  kid(i, p, opts) { return this.extra(this.kidBase + i, p, opts); }

  // Put cast member i at p (x, z) facing yaw; optionally walking to a point or seated.
  extra(i, p, { yaw = 0, to = null, sit = false, y = 0, speed = null } = {}) {
    const n = this.cast[i];
    n.group.visible = true;
    n.driven = false;
    n.teleport(V(p[0] ?? p.x, y, p[1] ?? p.z));
    n.group.rotation.y = yaw;
    n.seated = sit;
    n.path = [];
    if (speed) n.speed = speed;
    if (to) n.walkTo(to.map((q) => (q.isVector3 ? q.clone() : V(q[0], 0, q[1]))));
    return n;
  }

  // Students walking along the campus roads near a point, each between two nearby spots.
  walkers(from, n, centre, radius, seed = 1) {
    let s = seed * 9301 + 49297;
    const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let k = 0; k < n; k++) {
      const a = r() * Math.PI * 2; const b = a + Math.PI * (0.6 + r() * 0.8);
      const p = this.campus.freeSpot?.(V(centre[0] + Math.cos(a) * radius * (0.4 + r() * 0.6), 0, centre[1] + Math.sin(a) * radius * (0.4 + r() * 0.6))) || V(centre[0], 0, centre[1]);
      const q = V(centre[0] + Math.cos(b) * radius, 0, centre[1] + Math.sin(b) * radius);
      const route = this.campus.pathTo ? this.campus.pathTo(p, null, q) : [q];
      this.extra(from + k, p, { to: route });
      // start part-way along, so nobody stands still at the start of the shot
      const npc = this.cast[from + k];
      for (let j = 0; j < 40; j++) npc.update(0.1, null, null);
    }
  }

  // Mirnal: walking along a Walk at speed, from distance s0 (meters) at the start of the shot.
  walkGuide(ctx, walk, speed, s0 = 0, gait = 'walk') {
    const g = this.guide;
    g.group.visible = true;
    const s = s0 + speed * ctx.t;
    const p = walk.at(s);
    const moving = s < walk.total;
    g.pos.set(p.x, 0, p.z);
    g.group.rotation.y = walk.heading(Math.min(s, walk.total - 0.01));
    g.gait = gait;
    g.rideSpeed = speed;
    g.animate(ctx.dt, moving, 0);
    ctx.g = { p, yaw: g.group.rotation.y, s };
    if (gait === 'ride') {
      const dir = V(Math.sin(g.group.rotation.y), 0, Math.cos(g.group.rotation.y));
      this.bike.visible = true;
      this.bike.position.copy(p).addScaledVector(dir, 0.3);
      this.bike.rotation.y = g.group.rotation.y + Math.PI;
      for (const w of this.bike.userData.wheels) w.rotation.x -= (speed * ctx.dt) / 0.34;
      this.bike.userData.handle.rotation.set(0, 0, Math.PI / 2);
    }
    return ctx.g;
  }

  // A camera rig around Mirnal: back (metres behind), up, side (metres to his right), looking ahead of him.
  follow(back, up, side = 0, ahead = 4, lookUp = 1.3) {
    return {
      pos: (ctx) => {
        const { p, yaw } = ctx.g;
        const f = V(Math.sin(yaw), 0, Math.cos(yaw)); const r = V(-f.z, 0, f.x);
        return p.clone().addScaledVector(f, -back).addScaledVector(r, side).setY(up);
      },
      look: (ctx) => {
        const { p, yaw } = ctx.g;
        const f = V(Math.sin(yaw), 0, Math.cos(yaw));
        return p.clone().addScaledVector(f, ahead).setY(lookUp);
      },
    };
  }

  // ---------- ambient life ----------
  buildBirds() {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: '#2a2a2e', side: THREE.DoubleSide, fog: true });
    const wingGeo = new THREE.BufferGeometry();
    wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.12, 0, 0, 0.18, 0.55, 0, 0.02], 3));
    const birds = [];
    for (let i = 0; i < 14; i++) {
      const b = new THREE.Group();
      const l = new THREE.Mesh(wingGeo, mat); const r = new THREE.Mesh(wingGeo, mat);
      r.scale.x = -1;
      b.add(l, r);
      b.scale.setScalar(1.6);
      group.add(b);
      birds.push({ b, l, r, ph: i * 0.83, off: V(((i * 7) % 9) - 4, ((i * 5) % 7) * 0.6, ((i * 3) % 11) - 5) });
    }
    group.visible = false;
    this.scene.add(group);
    this.birds = {
      group,
      t: 0,
      centre: V(0, 0, 0),
      update: (dt) => {
        if (!group.visible) return;
        this.birds.t += dt;
        const T = this.birds.t;
        const c = this.birds.centre;
        const ang = T * 0.12;
        for (const k of birds) {
          const a = ang + k.off.x * 0.01;
          k.b.position.set(c.x + Math.cos(a) * 60 + k.off.x * 3, c.y + k.off.y * 3 + Math.sin(T * 0.7 + k.ph) * 1.5, c.z + Math.sin(a) * 60 + k.off.z * 3);
          k.b.rotation.y = -a;
          const flap = Math.sin(T * 9 + k.ph) * 0.6;
          k.l.rotation.z = flap; k.r.rotation.z = -flap;
        }
      },
    };
  }

  flock(x, y, z) { this.birds.group.visible = true; this.birds.centre.set(x, y, z); }

  // ---------- overlay ----------
  buildOverlay(showSkip) {
    this.styleEl = document.createElement('style');
    this.styleEl.textContent = STYLE;
    document.head.append(this.styleEl);
    const el = document.createElement('div');
    el.id = 'film';
    el.innerHTML = '<div class="lb top"></div><div class="lb bot"></div><div class="title"><h1></h1><p></p></div><div class="cap"><div class="k"></div><div class="n"></div><div class="rule"></div></div><div class="fade"></div>'
      + (showSkip ? '<div class="skip">Esc · skip</div>' : '');
    document.body.append(el);
    const skip = el.querySelector('.skip');
    if (skip) { skip.style.pointerEvents = 'auto'; skip.style.cursor = 'pointer'; skip.addEventListener('click', () => this.finish()); }
    this.el = el;
    this.ui = { title: el.querySelector('.title'), h1: el.querySelector('.title h1'), sub: el.querySelector('.title p'), cap: el.querySelector('.cap'), k: el.querySelector('.cap .k'), n: el.querySelector('.cap .n'), rule: el.querySelector('.cap .rule'), fade: el.querySelector('.fade'), bars: el.querySelectorAll('.lb') };
  }

  updateOverlay(t) {
    const ui = this.ui;
    // black at the very start and end, short dips between acts
    let black = 1 - smooth(0, 2.2, t);
    black = Math.max(black, smooth(this.duration - 3.5, this.duration - 0.6, t));
    for (const d of this.dips) black = Math.max(black, smooth(d - 0.55, d, t) * (1 - smooth(d, d + 0.6, t)));
    ui.fade.style.opacity = black.toFixed(3);
    // the title card, at the start and the end
    const card = this.titles.find((c) => t >= c.t0 && t < c.t1);
    if (card) {
      const a = smooth(card.t0, card.t0 + 1.6, t) * (1 - smooth(card.t1 - 1.4, card.t1, t));
      ui.title.style.opacity = a.toFixed(3);
      ui.h1.textContent = card.title;
      ui.sub.textContent = card.sub;
      const sp = 0.32 + 0.1 * (1 - smooth(card.t0, card.t1, t));
      ui.h1.style.letterSpacing = `${sp}em`;
      ui.h1.style.paddingLeft = `${sp}em`;
    } else ui.title.style.opacity = '0';
    // location captions
    const s = this.shots[this.index];
    const cap = s?.caption;
    if (cap) {
      const t0 = s.t0 + (cap.at ?? 0.8); const t1 = Math.min(s.t1 - 0.4, t0 + (cap.hold ?? 5));
      const a = smooth(t0, t0 + 0.9, t) * (1 - smooth(t1 - 0.8, t1, t));
      ui.cap.style.opacity = a.toFixed(3);
      ui.cap.style.transform = `translateX(${((1 - smooth(t0, t0 + 1.2, t)) * -24).toFixed(1)}px)`;
      ui.rule.style.width = `${(smooth(t0 + 0.2, t0 + 1.4, t) * 100).toFixed(1)}%`;
      ui.k.textContent = cap.kicker || '';
      ui.n.textContent = cap.title;
    } else ui.cap.style.opacity = '0';
  }

  // ---------- the film ----------
  buildShots() {
    const C = this.campus;
    const H = C.hostel;
    const R = C.rooms;
    const self = this;
    // the Main Gate: Mirnal walks in from the town road and up the campus road
    const gate = C.gatePos ? [C.gatePos.x, C.gatePos.z] : [582, 267];
    const inside = C.freeSpot ? C.freeSpot(V(gate[0] - 70, 0, gate[1])) : V(gate[0] - 70, 0, gate[1]);
    const gateWalk = new Walk([[gate[0] + 34, gate[1]], [gate[0] + 12, gate[1]], ...C.pathTo(V(gate[0] + 6, 0, gate[1]), null, inside)]);
    // Rotunda → NAB lecture theatre
    const nabWalk = new Walk(C.pathTo(V(28, 0, 118), 'classroom', R.classroom ? V((R.classroom.x0 + R.classroom.x1) / 2, 0, R.classroom.z1 - 1.2) : V(0, 0, 150)));
    // into Krishna Bhawan and down the west corridor
    const kIn = new Walk([H.world(-9, H.ve), H.world(-2, H.ve), H.world(2, H.ve), H.world(5.2, H.ve + 1.2), H.world(6.15, H.ve + 6), H.world(6.15, H.ve + 40)]);
    const corridor = new Walk([H.world(6.15, H.ve - 4), H.world(6.15, H.ve - 60)]);
    // cycling south from Gandhi Bhawan towards the temple
    const ride = new Walk(C.pathTo(V(150, 0, 330), null, V(110, 0, 600)));
    // evening: Mirnal walks onto the Rotunda
    const rot = new Walk([[8, 21], [3, 6], [0, -8]]);
    const room = (id) => R[id] || { x0: 0, x1: 10, z0: 0, z1: 10 };
    const cr = room('classroom'); const cl = room('complab'); const fd = room('sciencelab'); const lib = room('library'); const mess = room('mess');
    // the school: in through the gate on the first day, out of it on the last
    const S = this.school;
    const scr = S?.rooms?.classroom || { x0: -24, x1: -8, z0: -31, z1: -21 };
    const schoolIn = new Walk([[0.6, 62], [0.6, 50.5], [0.5, 38], [0.2, 22]]);
    const schoolOut = new Walk([[0.2, 20], [0.5, 36], [0.6, 50.5], [0.9, 66]]);
    this.dips = []; // filled below: dips to black between acts
    this.titles = [];
    const shots = [
      // ===== Prologue: school, Class 1 to Class 12 =====
      {
        name: 'school-aerial', world: 'school', dur: 9, clock: [hm(7, 25), hm(7, 30)], ease: 'inOut', fov: [40, 44],
        pos: curve([[70, 62, 110], [46, 42, 82], [22, 26, 60]]),
        look: curve([[0, 0, -4], [0, 2, -8], [0, 4, -12]]),
        setup: () => { self.flock(0, 40, 10); },
      },
      {
        name: 'school-gate', world: 'school', dur: 9, clock: [hm(7, 40), hm(7, 43)], damp: 3, fov: 44, guideHeight: 1.12, dof: { on: 'guide', aperture: 0.0005 },
        ...this.follow(2.6, 1.35, 0.5, 5, 1.0),
        setup: () => {
          for (let k = 0; k < 24; k++) self.cast[self.kidBase + k].setHeight(1.1 + ((k * 7) % 9) / 100);
          [[-2.4, 58], [2.6, 61], [-1.2, 64], [3.4, 55], [-3.6, 52], [1.8, 67]].forEach(([x, z], k) => self.kid(k, [x, z], { to: [[x * 0.6, z - 34]] }));
        },
        tick: (ctx) => self.walkGuide(ctx, schoolIn, 1.1),
        caption: { kicker: 'Class 1 · the first day', title: 'Sunrise Public School', at: 2.0, hold: 6 },
      },
      {
        name: 'school-assembly', world: 'school', dur: 10, clock: [hm(8, 0), hm(8, 3)], ease: 'linear', fov: 42, guideHeight: 1.12, dof: { on: 'guide', aperture: 0.0006, maxblur: 0.004 },
        pos: curve([[-8, 1.3, -12.6], [8, 1.3, -12.6]]),
        look: curve([[-3, 1.0, -7], [3, 1.0, -7]]),
        setup: () => {
          (S?.spots.assembly || []).slice(0, 24).forEach((p, k) => { const n = self.kid(k, [p.x, p.z], { yaw: Math.PI }); n.singing = true; });
          const g = self.guide; g.group.visible = true; g.pos.set(0, 0, -6); g.group.rotation.y = Math.PI; g.singing = true;
          const st = S?.spots.stage || V(0, 0, -16.5);
          self.extra(self.cast.indexOf(self.teacher), [st.x, st.z + 0.5], { yaw: 0 }).singing = true;
        },
        tick: (ctx) => { self.guide.animate(ctx.dt, false, 0); },
        caption: { kicker: 'Every morning', title: 'Assembly · Jana Gana Mana', at: 1.2, hold: 7 },
      },
      {
        name: 'school-class', world: 'school', dur: 9, clock: [hm(9, 0), hm(9, 2)], ease: 'inOut', fov: [46, 40], guideHeight: 1.12, dof: { on: [(scr.x0 + scr.x1) / 2 - 2, 1.3, scr.z0 + 1.2], aperture: 0.0009, maxblur: 0.004 },
        pos: curve([[scr.x1 - 1.0, 2.2, scr.z1 - 0.9], [(scr.x0 + scr.x1) / 2 + 1.5, 1.9, (scr.z0 + scr.z1) / 2 + 1.5]]),
        look: curve([[scr.x0 + 3, 0.9, scr.z0 + 0.6], [(scr.x0 + scr.x1) / 2 - 1, 1.3, scr.z0]]),
        setup: () => {
          S?.rebuildClassroom?.(1, 'English · Letters and their sounds');
          const seats = S?.seats || [];
          seats.forEach((st, k) => { if (k < 16 && k !== 6) self.kid(k, [st.pos.x, st.pos.z], { yaw: Math.PI, sit: true }); });
          const g = self.guide; const st = seats[6];
          if (st) { g.group.visible = true; g.pos.set(st.pos.x, 0, st.pos.z); g.group.rotation.y = Math.PI; g.seated = true; }
          self.extra(self.cast.indexOf(self.teacher), [(scr.x0 + scr.x1) / 2 - 2, scr.z0 + 1.2], { yaw: 0 });
        },
        tick: (ctx) => { self.guide.animate(ctx.dt, false, 0); self.teacher.group.rotation.y = Math.sin(ctx.t * 0.7) * 0.5; },
        caption: { kicker: 'Class 1', title: 'The classroom', at: 1.2, hold: 6 },
      },
      {
        name: 'school-farewell', world: 'school', dur: 9, clock: [hm(17, 35), hm(17, 40)], damp: 3, fov: [42, 48], guideHeight: 1.67, dof: { on: 'guide', aperture: 0.0003 },
        ...this.follow(4.2, 1.8, 0.7, 9, 1.6),
        setup: () => { [[-2.2, 24], [2.6, 27], [-3.4, 30]].forEach(([x, z], k) => { const n = self.kid(k, [x, z], { to: [[x * 0.5, z + 40]] }); n.setHeight(1.62 + k * 0.04); }); },
        tick: (ctx) => self.walkGuide(ctx, schoolOut, 1.25),
        caption: { kicker: 'Class 12', title: 'The last day of school', at: 1.4, hold: 6 },
      },
      // ===== Act 1: over Pilani at sunrise =====
      {
        name: 'aerial-arrive', dur: 10, clock: [hm(6, 32), hm(6, 38)], ease: 'linear', fov: [36, 33], dip: true,
        caption: { kicker: 'Then, college', title: 'BITS Pilani', at: 1.8, hold: 7 },
        pos: curve([[640, 360, 900], [520, 320, 720], [400, 290, 540]]),
        look: curve([[160, 0, 300], [110, 0, 220], [60, 0, 140]]),
        setup: () => { self.flock(520, 230, 640); },
        tick: (ctx) => { self.birds.centre.set(520 - ctx.t * 9, 230 - ctx.t * 2, 640 - ctx.t * 12); },
      },
      {
        name: 'aerial-descend', dur: 13, clock: [hm(6, 40), hm(6, 48)], ease: 'inOut', fov: [36, 40],
        pos: curve([[300, 240, 260], [170, 160, 140], [70, 100, 60], [-6, 66, 34]]),
        look: curve([[-10, 0, -40], [-12, 8, -60], [-13, 16, -76], [-12, 22, -80]]),
      },
      {
        name: 'aerial-to-gate', dur: 10, clock: [hm(6, 50), hm(6, 55)], ease: 'inOut', fov: [42, 46],
        pos: curve([[140, 120, 200], [330, 70, 255], [520, 30, 268], [gate[0] + 40, 5.5, gate[1] + 6]]),
        look: curve([[260, 0, 250], [450, 0, 268], [gate[0] - 10, 3, gate[1]], [gate[0] - 6, 3.6, gate[1]]]),
        setup: () => { self.flock(400, 70, 255); },
      },
      // ===== Act 2: Mirnal arrives =====
      {
        name: 'gate-follow', dof: { on: 'guide', aperture: 0.00022 }, dur: 10, clock: [hm(7, 0), hm(7, 4)], damp: 3, fov: 44, dip: true,
        ...this.follow(3.6, 2.2, 0.3, 6, 1.9),
        setup: () => { self.walkers(0, 4, [gate[0] - 30, gate[1]], 24, 3); },
        tick: (ctx) => self.walkGuide(ctx, gateWalk, 1.55, 5),
        caption: { kicker: 'Day one', title: 'The Main Gate', at: 2.2, hold: 6 },
      },
      {
        name: 'gate-front', dof: { on: 'guide', aperture: 0.0004 }, dur: 8, clock: [hm(7, 4), hm(7, 7)], damp: 4, fov: 40, ease: 'linear',
        pos: (ctx) => { const { p, yaw } = ctx.g; const f = V(Math.sin(yaw), 0, Math.cos(yaw)); const r = V(-f.z, 0, f.x); return p.clone().addScaledVector(f, 3.6 + ctx.u * 0.8).addScaledVector(r, 0.5).setY(1.05); },
        look: (ctx) => ctx.g.p.clone().setY(1.4 + ctx.u * 0.25),
        setup: () => { self.walkers(0, 4, [gate[0] - 30, gate[1]], 24, 3); },
        tick: (ctx) => self.walkGuide(ctx, gateWalk, 1.55, 5 + 1.55 * 10),
      },
      // ===== Act 3: the academic campus =====
      {
        name: 'clocktower', dur: 9, clock: [hm(9, 10), hm(9, 14)], ease: 'linear', fov: [46, 42], dip: true,
        pos: curve([[-4, 6.5, 8], [-8, 9, -4]]),
        look: curve([[-12, 30, -80], [-12, 34, -82]]),
        setup: () => { self.walkers(0, 10, [0, -30], 22, 7); },
        caption: { kicker: 'Main Building', title: 'The Clock Tower', at: 1.4, hold: 6 },
      },
      {
        name: 'rotunda', dur: 8, clock: [hm(9, 20), hm(9, 23)], ease: 'linear', fov: 44,
        pos: (ctx, e) => { const a = 0.35 + e * 0.9; return V(Math.sin(a) * 52, 26 - e * 6, Math.cos(a) * 52); },
        look: (ctx, e) => V(-4 + e * 2, 4, -18 + e * 6),
        setup: () => { self.walkers(0, 12, [6, 10], 30, 11); },
        caption: { kicker: 'The heart of campus', title: 'Rotunda', at: 1.0, hold: 5 },
      },
      {
        name: 'nab-walk', dof: { on: 'guide' }, dur: 9, clock: [hm(9, 40), hm(9, 44)], damp: 2.5, fov: 42,
        ...this.follow(3.8, 1.9, -0.6, 7, 1.7),
        setup: () => { self.walkers(0, 8, [20, 140], 30, 13); },
        tick: (ctx) => self.walkGuide(ctx, nabWalk, 1.6, Math.max(0, nabWalk.total - 1.6 * 9 - 9)),
        caption: { kicker: 'Classes', title: 'NAB · New Academic Block', at: 1.4, hold: 6 },
      },
      {
        name: 'lecture', dof: { on: [(cr.x0 + cr.x1) / 2 - 2, 1.4, cr.z0 + 1.2], aperture: 0.0009, maxblur: 0.004 }, dur: 10, clock: [hm(10, 5), hm(10, 8)], ease: 'inOut', fov: [46, 40],
        pos: curve([[cr.x1 - 1.0, 2.6, cr.z1 - 0.9], [(cr.x0 + cr.x1) / 2 + 1.5, 2.2, (cr.z0 + cr.z1) / 2 + 1.5]]),
        look: curve([[cr.x0 + 3, 1.0, cr.z0 + 0.6], [(cr.x0 + cr.x1) / 2 - 1, 1.5, cr.z0]]),
        setup: () => {
          C.rebuildClassroom?.(13, 'MATH F111 · Mathematics I');
          (C.seats || []).forEach((st, k) => { if (k < 15) self.extra(k, [st.pos.x, st.pos.z], { yaw: Math.PI, sit: true }); });
          const g = self.guide; g.group.visible = true; const st = C.seats?.[15];
          if (st) { g.pos.set(st.pos.x, 0, st.pos.z); g.group.rotation.y = Math.PI; g.seated = true; g.gait = 'walk'; }
          self.extra(self.cast.indexOf(self.prof), [(cr.x0 + cr.x1) / 2 - 2, cr.z0 + 1.2], { yaw: 0 });
        },
        tick: (ctx) => { self.guide.animate(ctx.dt, false, 0); const p = self.prof; p.group.rotation.y = Math.sin(ctx.t * 0.6) * 0.5; },
        caption: { kicker: 'NAB', title: 'Lecture Theatre', at: 1.2, hold: 6 },
      },
      {
        name: 'complab', dof: { on: [cl.x0 + 5, 1.0, cl.z0 + 3], aperture: 0.0009, maxblur: 0.004 }, dur: 7, clock: [hm(11, 0), hm(11, 2)], ease: 'linear', fov: 44,
        pos: curve([[cl.x0 + 1.0, 2.0, cl.z1 - 0.6], [cl.x0 + 4.0, 2.0, cl.z1 - 0.6]]),
        look: curve([[cl.x0 + 3.5, 0.9, cl.z0 + 1.0], [cl.x0 + 7.0, 0.9, cl.z0 + 1.0]]),
        // the seats are in front of the monitors, which face south: sit facing north
        setup: () => { (C.spots.complab || []).slice(0, 6).forEach((p, k) => { if (k !== 4) self.extra(k, [p.x, p.z + 0.1], { yaw: Math.PI, sit: true }); }); },
        caption: { kicker: 'Main Building', title: 'Computer Lab', at: 0.8, hold: 5 },
      },
      {
        name: 'library', dur: 8, clock: [hm(12, 10), hm(12, 13)], ease: 'inOut', fov: [40, 36],
        pos: curve([[306, 15, -194], [288, 7, -203]]),
        look: curve([[212, 4, -222], [212, 5, -222]]),
        setup: () => { self.walkers(0, 8, [(lib.x0 + lib.x1) / 2, lib.z1 + 16], 20, 17); },
        caption: { kicker: 'Books, quiet, deadlines', title: 'BITS Library', at: 1.0, hold: 5.5 },
      },
      {
        name: 'mess', dof: { on: [mess.x0 + 7, 1.0, mess.z0 + 4], aperture: 0.0009, maxblur: 0.004 }, dur: 9, clock: [hm(13, 15), hm(13, 18)], ease: 'linear', fov: 46,
        pos: curve([[mess.x0 + 1.2, 2.3, mess.z0 + 0.9], [mess.x0 + 4.5, 2.2, mess.z0 + 1.4]]),
        look: curve([[mess.x1 - 1.5, 1.0, mess.z1 - 2.5], [mess.x1 - 1.4, 1.0, mess.z1 - 1.6]]),
        setup: () => {
          C.setMessFood?.('lunch');
          // seats run table by table, three a side: the first three face +z, the next three -z
          (C.spots.mess || []).forEach((p, k) => { if (k % 4 !== 3 && k < 24) self.extra(k, [p.x, p.z], { yaw: Math.floor(k / 3) % 2 ? Math.PI : 0, sit: true }); });
        },
        caption: { kicker: 'Lunch', title: 'VKB Mess', at: 1.0, hold: 6 },
      },
      // ===== Act 4: the Bhawans =====
      {
        name: 'bhawans-aerial', dur: 9, clock: [hm(16, 40), hm(16, 48)], ease: 'linear', fov: 40, dip: true,
        pos: curve([[-40, 150, 30], [120, 120, 40], [300, 110, 110], [420, 120, 230]]),
        look: curve([[120, 0, 140], [180, 0, 170], [300, 0, 220], [380, 0, 260]]),
        setup: () => { self.flock(200, 90, 150); },
        caption: { kicker: 'Ten Bhawans to walk into', title: 'The Hostels', at: 1.5, hold: 7 },
      },
      {
        name: 'krishna-in', dof: { on: 'guide' }, dur: 9, clock: [hm(17, 0), hm(17, 3)], damp: 3, fov: 42,
        ...this.follow(3.2, 1.9, 0.7, 5, 1.6),
        setup: () => { self.extra(0, H.world(-5, H.ve - 3), { yaw: H.entrance.yaw }); self.extra(1, H.world(-5.4, H.ve - 1.8), { yaw: H.entrance.yaw + Math.PI }); },
        tick: (ctx) => self.walkGuide(ctx, kIn, 1.45),
        caption: { kicker: 'Home', title: 'Krishna Bhawan', at: 1.4, hold: 6 },
      },
      {
        // a leading shot: the camera walks backwards in front of Mirnal, arches and courtyard to one side
        name: 'corridor', dof: { on: 'guide', aperture: 0.0008 }, dur: 8, clock: [hm(17, 6), hm(17, 9)], ease: 'linear', fov: 48,
        pos: (ctx) => { const p = corridor.at(1.4 * ctx.t); const [u, v] = H.local(p.x, p.z); return H.world(u + 0.5, v - 3.6, 1.6); },
        look: (ctx) => { const p = corridor.at(1.4 * ctx.t); const [u, v] = H.local(p.x, p.z); return H.world(u - 0.2, v + 2, 1.35); },
        setup: () => self.cricket(),
        tick: (ctx) => { self.walkGuide(ctx, corridor, 1.4); self.tickCricket(ctx); },
      },
      {
        name: 'courtyard', dur: 11, clock: [hm(17, 12), hm(17, 16)], ease: 'inOut', fov: [40, 46],
        pos: (ctx, e) => { const c = H.cricket; return H.world(c.u + 6 - e * 4, c.v + 18 + e * 6, 1.6 + e * 17); },
        look: (ctx, e) => { const c = H.cricket; return H.world(c.u - 1, c.v - 2 - e * 8, 1.0 + e * 2); },
        setup: () => self.cricket(),
        tick: (ctx) => self.tickCricket(ctx),
        caption: { kicker: 'Every evening', title: 'Courtyard cricket', at: 1.2, hold: 7 },
      },
      // ===== Act 5: landmarks at golden hour =====
      {
        name: 'ride', dof: { on: 'guide', aperture: 0.0004 }, dur: 9, clock: [hm(17, 30), hm(17, 34)], damp: 2.2, fov: 44, dip: true,
        pos: (ctx) => { const { p, yaw } = ctx.g; const f = V(Math.sin(yaw), 0, Math.cos(yaw)); const r = V(-f.z, 0, f.x); return p.clone().addScaledVector(r, -4.2).addScaledVector(f, 1.5).setY(1.4); },
        look: (ctx) => { const { p, yaw } = ctx.g; const f = V(Math.sin(yaw), 0, Math.cos(yaw)); return p.clone().addScaledVector(f, 1.2).setY(1.2); },
        setup: () => { self.walkers(0, 6, [140, 450], 40, 21); },
        tick: (ctx) => self.walkGuide(ctx, ride, 5.2, 20, 'ride'),
        caption: { kicker: 'Golden hour', title: 'Across campus', at: 1.5, hold: 6 },
      },
      {
        name: 'temple', dur: 8, clock: [hm(17, 40), hm(17, 44)], ease: 'linear', fov: [38, 34],
        pos: (ctx, e) => { const a = -0.55 + e * 0.5; return V(105 + Math.sin(a) * 92, 9 + e * 6, 661 + Math.cos(a) * 92); },
        look: () => V(105, 10, 661),
        setup: () => { self.walkers(0, 8, [105, 600], 30, 23); self.flock(105, 50, 661); },
        caption: { kicker: 'Marble and gardens', title: 'Saraswati Temple', at: 1.5, hold: 6 },
      },
      {
        name: 'cnot', dur: 8, clock: [hm(17, 54), hm(17, 56)], ease: 'inOut', fov: [40, 36],
        pos: curve([[470, 26, 840], [452, 12, 812]]),
        look: curve([[426, 2, 777], [424, 3, 772]]),
        setup: () => { self.walkers(0, 12, [430, 790], 26, 29); },
        caption: { kicker: 'Chai, maggi, friends', title: "C'not", at: 1.0, hold: 5.5 },
      },
      // ===== Finale: sunset over the Clock Tower =====
      {
        name: 'finale', dur: 16, clock: [hm(18, 0), hm(18, 6)], ease: 'inOut', fov: [40, 40], dip: true,
        pos: (ctx, e) => V(9 + e * 90, 1.8 + e * 230, 27 + e * 230),
        look: (ctx, e) => V(-8 + e * 2, 14 - e * 10, -70 + e * 30),
        setup: () => { self.walkers(0, 10, [0, 10], 30, 37); self.flock(-20, 60, -40); },
        tick: (ctx) => { self.walkGuide(ctx, rot, 1.2); },
      },
    ];
    // dips to black at act changes, and the title cards
    let at = 0;
    for (const s of shots) { if (s.dip) this.dips.push(at); at += s.dur; }
    this.titles.push({ t0: 2.2, t1: 9.6, title: 'LIFE OF MIRNAL', sub: 'From Class 1 to the Clock Tower' });
    this.titles.push({ t0: at - 12, t1: at - 3.2, title: 'LIFE OF MIRNAL', sub: 'School · College · life-of-mirnal.vercel.app' });
    return shots;
  }

  // Hostel-mates at cricket in Krishna's first courtyard: batter, bowler running in, fielders.
  cricket() {
    const sp = this.campus.hostel.npcSpots.cricket;
    if (!sp) return;
    this.extra(20, [sp.bat.at.x, sp.bat.at.z], { yaw: sp.bat.yaw });
    const b = this.extra(21, [sp.bowl.a.x, sp.bowl.a.z]);
    b.driven = true;
    sp.field.forEach((f, k) => this.extra(22 + k, [f.at.x, f.at.z], { yaw: f.yaw }));
    this.bowl = { n: b, a: sp.bowl.a, b: sp.bowl.b };
  }

  tickCricket(ctx) {
    const { n, a, b } = this.bowl || {};
    if (!n) return;
    const T = 6; const ph = (ctx.t % T) / T;
    const f = ph < 0.55 ? ph / 0.55 : 1 - (ph - 0.55) / 0.45;
    n.pos.set(a.x + (b.x - a.x) * f, 0, a.z + (b.z - a.z) * f);
    const dir = ph < 0.55 ? [b.x - a.x, b.z - a.z] : [a.x - b.x, a.z - b.z];
    n.group.rotation.y = Math.atan2(dir[0], dir[1]);
    n.gait = ph < 0.55 ? 'run' : 'walk';
    n.animate(ctx.dt, true, 0);
  }
}
