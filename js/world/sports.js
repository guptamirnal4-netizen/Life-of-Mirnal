// Games played by characters, as a function of time: cricket in the Bhawan courtyard and a passing game of football.
// Each game drives its players directly (position, facing, gait, and the arm and leg poses the walk cycle doesn't
// have) and owns its ball (and bat). update(t, dt) can be called with any t, so the campus film plays them too.
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lerp = (a, b, s) => a.clone().lerp(b, s);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ease = (x) => x * x * (3 - 2 * x);

// Faces along (dx, dz).
const face = (n, dx, dz) => { if (dx * dx + dz * dz > 1e-8) n.group.rotation.y = Math.atan2(dx, dz); };

// One delivery every T seconds: run-up, an over-arm delivery, the ball pitching and meeting the bat, the shot
// travelling to a fielder, and the bowler walking back to his mark. spots: the Bhawan's npcSpots.cricket.
export class Cricket {
  static T = 7;

  constructor(scene, { batter, bowler, fielders = [], spots }) {
    Object.assign(this, { scene, batter, bowler, fielders, spots });
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 8), new THREE.MeshStandardMaterial({ color: '#b3202a', roughness: 0.45 }));
    this.ball.castShadow = true;
    this.ball.visible = false;
    scene.add(this.ball);
    // the bat in the batter's right hand, continuing the forearm
    this.bat = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.78, 0.035), new THREE.MeshStandardMaterial({ color: '#d9b77e', roughness: 0.7 }));
    this.bat.castShadow = true;
    this.bat.position.set(0, -0.62, 0.02);
    batter.elbows[0].add(this.bat);
    const a = spots.bowl.a; const b = spots.bowl.b; const bat = spots.bat.at;
    this.a = V(a.x, 0, a.z); this.b = V(b.x, 0, b.z); this.batAt = V(bat.x, 0, bat.z);
    this.dir = this.batAt.clone().sub(this.b).normalize(); // bowler → batter
    // the shot goes towards the first fielder
    const f = fielders[0] && spots.field[0] ? V(spots.field[0].at.x, 0, spots.field[0].at.z) : this.batAt.clone().addScaledVector(V(-this.dir.z, 0, this.dir.x), 18);
    this.hitTo = f;
  }

  update(t, dt) {
    const T = Cricket.T; const u = ((t % T) + T) % T;
    const { a, b, dir, batAt } = this;
    // ---- bowler ----
    const B = this.bowler; const run = this.a.distanceTo(this.b);
    const past = b.clone().addScaledVector(dir, 1.0); const stop = b.clone().addScaledVector(dir, 2.4);
    let pos; let moving = true; let gait = 'run'; let windmill = null;
    if (u < 2.6) { pos = lerp(a, b, ease(u / 2.6) * 0.15 + (u / 2.6) * 0.85); face(B, dir.x, dir.z); } // run-up
    else if (u < 3.0) { const s = (u - 2.6) / 0.4; pos = lerp(b, past, s); face(B, dir.x, dir.z); windmill = 0.3 + s * (2 * Math.PI - 0.7); } // delivery stride
    else if (u < 3.7) { const s = (u - 3.0) / 0.7; pos = lerp(past, stop, Math.sin(s * Math.PI / 2)); gait = 'walk'; face(B, dir.x, dir.z); }
    else { const s = (u - 3.7) / (T - 3.7); pos = lerp(stop, a, ease(s)); gait = 'walk'; face(B, a.x - stop.x, a.z - stop.z); moving = s < 0.98; }
    B.pos.set(pos.x, 0, pos.z);
    B.gait = gait;
    B.moveSpeed = gait === 'run' ? run / 2.6 : 1.3;
    B.animate(dt, moving, 0);
    if (windmill !== null) { B.arms[0].rotation.x = windmill; B.elbows[0].rotation.x = 0; }
    // ---- the ball: release, pitch, bat, then away to a fielder ----
    const tr = 2.6 + 0.4 * ((Math.PI + 0.25 - 0.3) / (2 * Math.PI - 0.7)); // release, just past the top of the arc
    const R = lerp(b, past, (tr - 2.6) / 0.4).addScaledVector(dir, 0.25).setY(2.05 * B.scale);
    const P = lerp(b, batAt, 0.72).setY(0.036); // where it pitches
    const C = batAt.clone().addScaledVector(dir, -0.55).setY(0.5); // meets the bat
    const H = this.hitTo.clone().setY(0.036);
    const ball = this.ball;
    const tb = tr + 0.36; const tc = tr + 0.56; const th = tr + 2.0;
    ball.visible = u >= tr && u < th + 0.4;
    if (u >= tr && u < tb) { const s = (u - tr) / (tb - tr); ball.position.copy(lerp(R, P, s)).setY(R.y + (P.y - R.y) * s * s); }
    else if (u >= tb && u < tc) { const s = (u - tb) / (tc - tb); ball.position.copy(lerp(P, C, s)).setY(P.y + (C.y - P.y) * s + 0.35 * Math.sin(Math.PI * s)); }
    else if (u >= tc && u < th) { const s = (u - tc) / (th - tc); ball.position.copy(lerp(C, H, s)).setY(C.y * (1 - s) + 7 * 4 * s * (1 - s)); }
    else if (u >= th) ball.position.copy(H);
    // ---- batter: stance, backlift, the stroke, follow-through ----
    const Bt = this.batter;
    Bt.animate(dt, false, 0);
    let swing = -0.45; // bat held down in front
    if (u > tr - 0.1 && u < tb) swing = -0.45 + (1.75 * clamp01((u - tr + 0.1) / (tb - tr + 0.1))); // backlift
    else if (u >= tb && u < tc + 0.18) swing = 1.3 - 2.9 * ease(clamp01((u - tb) / (tc + 0.18 - tb))); // the stroke
    else if (u >= tc + 0.18 && u < tc + 1.4) swing = -1.6 + 1.15 * clamp01((u - tc - 0.18) / 1.2); // back to the stance
    for (const k of [0, 1]) { Bt.arms[k].rotation.x = swing; Bt.elbows[k].rotation.x = -0.35; }
    Bt.arms[1].rotation.z = 0.35; // the other hand on the handle
    // ---- fielders: crouch and watch the ball ----
    for (const f of this.fielders) {
      f.animate(dt, false, 0);
      const target = ball.visible ? ball.position : batAt;
      face(f, target.x - f.pos.x, target.z - f.pos.z);
      f.lean(0.25);
    }
  }

  dispose() { this.scene.remove(this.ball); this.batter.elbows[0].remove(this.bat); }
}

// A passing game: the player with the ball dribbles a few metres, passes along the ground, and the next player
// runs on to it. players: NPCs; anchors: where each one plays, as [x, z].
export class Football {
  static P = 2.6; // one possession

  constructor(scene, { players, anchors }) {
    Object.assign(this, { scene, players });
    this.anchors = anchors.map(([x, z]) => V(x, 0, z));
    const g = new THREE.IcosahedronGeometry(0.11, 1).toNonIndexed();
    const c = new Float32Array(g.attributes.position.count * 3);
    for (let f = 0; f < g.attributes.position.count / 3; f++) { const v = f % 5 === 0 ? 0.08 : 0.95; for (let k = 0; k < 9; k++) c[f * 9 + k] = v; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    this.ball = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, flatShading: true }));
    this.ball.castShadow = true;
    scene.add(this.ball);
  }

  holder(k) { const n = this.players.length; let h = 0; for (let i = 0; i < k; i++) h = (h + 1 + (i % 2)) % n; return h; }

  update(t, dt) {
    const P = Football.P;
    const k = Math.floor(t / P); const u = (t - k * P) / P;
    const h = this.holder(k); const r = this.holder(k + 1);
    const A = this.anchors;
    // the holder dribbles from his anchor a third of the way towards the receiver, then passes
    const start = A[h]; const toward = A[r].clone().sub(start);
    const kickAt = start.clone().addScaledVector(toward, 0.3);
    const dribble = 0.45; const pass = 0.85;
    const ballPos = new THREE.Vector3();
    this.players.forEach((p, i) => {
      let pos; let moving = false; let look = this.ball.position;
      if (i === h) {
        if (u < dribble) { pos = lerp(start, kickAt, u / dribble); moving = true; look = A[r]; }
        else { pos = lerp(kickAt, start, ease(clamp01((u - pass) / (1 - pass)))); moving = u > pass; look = this.ball.position; }
      } else if (i === r) {
        // runs on to the pass, then carries the ball back to his spot
        const meet = A[r].clone().addScaledVector(toward, -0.12);
        pos = u < dribble ? A[r].clone() : lerp(A[r], meet, ease(clamp01((u - dribble) / (pass - dribble))));
        moving = u >= dribble && u < pass;
      } else {
        // the others jog around their spot
        const w = t * 0.9 + i * 1.7;
        pos = A[i].clone().add(V(Math.sin(w) * 1.2, 0, Math.cos(w * 0.8) * 1.0));
        moving = true;
      }
      const prev = p.pos.clone();
      p.pos.set(pos.x, 0, pos.z);
      const v = dt > 0 ? prev.distanceTo(p.pos) / dt : 0;
      if (moving && v > 0.05) face(p, p.pos.x - prev.x, p.pos.z - prev.z); else face(p, look.x - pos.x, look.z - pos.z);
      p.gait = v > 2.4 ? 'run' : 'walk';
      p.moveSpeed = Math.max(0.8, v);
      p.animate(dt, moving && v > 0.05, 0);
      // the kick: the right leg swings through as the pass goes
      if (i === h && u >= dribble - 0.06 && u < dribble + 0.08) { p.legs[0].rotation.x = -1.0; p.knees[0].rotation.x = 0.2; }
    });
    // the ball: at the dribbler's feet, then rolling to the receiver
    const H = this.players[h]; const R = this.players[r];
    if (u < dribble) {
      const f = V(Math.sin(H.group.rotation.y), 0, Math.cos(H.group.rotation.y));
      ballPos.copy(H.pos).addScaledVector(f, 0.45);
    } else if (u < pass) {
      const s = (u - dribble) / (pass - dribble);
      ballPos.copy(lerp(kickAt.clone().addScaledVector(toward.clone().normalize(), 0.45), R.pos, ease(s)));
    } else {
      const f = V(Math.sin(R.group.rotation.y), 0, Math.cos(R.group.rotation.y));
      ballPos.copy(R.pos).addScaledVector(f, 0.4);
    }
    const roll = ballPos.distanceTo(this.ball.position);
    this.ball.position.set(ballPos.x, 0.11, ballPos.z);
    this.ball.rotation.x += roll / 0.11;
  }

  dispose() { this.scene.remove(this.ball); }
}
