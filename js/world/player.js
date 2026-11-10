import * as THREE from 'three';

const GRAVITY = 22;

// Metres per second (1 unit = 1 m on the BITS campus). A brisk walk, a jog, and a student's cycle:
// with time at 15 s per game minute, Krishna Bhawan → Main Building (≈380 m) is about 13 game minutes
// on foot, 6 running and 4 by cycle.
export const MOVE = {
  walk: 2, run: 4.5, footAccel: 9, footDecel: 12, footRadius: 0.32,
  bikeMax: 7, bikeAccel: 2.4, bikeBrake: 6, bikeCoast: 0.9, bikeTurn: 1.7, bikeRadius: 0.45,
};

export function eyeHeightFor(classNum) {
  return 1.02 + (classNum - 1) * 0.05;
}

export class Player {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.pos = new THREE.Vector3(0, 0, 49);
    this.velY = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.keys = new Set();
    this.stick = { x: 0, y: 0 }; // touch joystick, -1..1 (y forward)
    this.seated = null;
    this.eye = 1.0;
    this.sensitivity = 1;
    this.enabled = false;
    this.moving = false;
    this.lastMove = new THREE.Vector3();
    this.vel = new THREE.Vector3(); // on foot: horizontal velocity
    this.bikeSpeed = 0; // on the cycle: forward speed
    this.steer = 0; // -1..1, for the handlebar
    this.running = false;
    this._bike = false;

    document.addEventListener('mousemove', (e) => {
      if (!this.enabled || document.pointerLockElement !== this.dom) return;
      const k = 0.0022 * this.sensitivity;
      this.yaw -= e.movementX * k;
      this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch - e.movementY * k));
    });
    document.addEventListener('keydown', (e) => this.keys.add(e.code));
    document.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  setClass(classNum) {
    this.eye = eyeHeightFor(classNum);
  }

  // Mounting or dismounting always starts from a standstill.
  get bike() { return this._bike; }
  set bike(on) {
    this._bike = !!on;
    this.bikeSpeed = 0;
    this.vel.set(0, 0, 0);
  }

  get speedNow() { return this._bike ? this.bikeSpeed : Math.hypot(this.vel.x, this.vel.z); }

  // 'ride' | 'run' | 'walk' | 'idle'
  gait() {
    if (this._bike) return this.bikeSpeed > 0.15 ? 'ride' : 'idle';
    const v = this.speedNow;
    return v < 0.1 ? 'idle' : this.running && v > MOVE.walk + 0.4 ? 'run' : 'walk';
  }

  place(pos, yaw = 0) {
    this.pos.copy(pos);
    this.yaw = yaw;
    this.pitch = 0;
    this.velY = 0;
    this.seated = null;
  }

  sit(seatPos, yaw = 0, standAt = null) {
    this.seated = { pos: seatPos.clone(), yaw, standAt: standAt && standAt.clone() };
    this.pos.copy(seatPos);
    this.yaw = yaw;
    this.pitch = 0.06;
  }

  stand() {
    if (!this.seated) return;
    if (this.seated.standAt) { this.pos.copy(this.seated.standAt); this.seated = null; return; }
    this.pos.z += 0.55;
    this.seated = null;
  }

  forward() {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  key(...codes) {
    return codes.some((c) => this.keys.has(c));
  }

  // On foot: WASD (or the touch joystick) sets a direction, Shift raises the target speed; velocity eases towards it.
  footStep(dt) {
    const f = this.forward();
    const r = new THREE.Vector3(-f.z, 0, f.x);
    const want = new THREE.Vector3();
    if (this.key('KeyW', 'ArrowUp')) want.add(f);
    if (this.key('KeyS', 'ArrowDown')) want.sub(f);
    if (this.key('KeyD', 'ArrowRight')) want.add(r);
    if (this.key('KeyA', 'ArrowLeft')) want.sub(r);
    const sm = Math.hypot(this.stick.x, this.stick.y);
    if (sm > 0.15) want.addScaledVector(f, this.stick.y / sm).addScaledVector(r, this.stick.x / sm);
    this.running = want.lengthSq() > 0 && (this.key('ShiftLeft', 'ShiftRight') || sm > 0.9);
    if (want.lengthSq() > 0) want.normalize().multiplyScalar(this.running ? MOVE.run : MOVE.walk);
    const diff = want.sub(this.vel);
    const rate = (want.lengthSq() >= this.vel.lengthSq() ? MOVE.footAccel : MOVE.footDecel) * dt;
    if (diff.length() > rate) diff.setLength(rate);
    this.vel.add(diff);
    return this.vel.clone().multiplyScalar(dt);
  }

  // On the cycle: W pedals, S brakes, A/D steer the handlebar. No running, no jumping.
  bikeStep(dt) {
    this.running = false;
    const pedal = this.key('KeyW', 'ArrowUp') || this.stick.y > 0.3;
    const brake = this.key('KeyS', 'ArrowDown') || this.stick.y < -0.3;
    this.steer = Math.max(-1, Math.min(1, (this.key('KeyA', 'ArrowLeft') ? 1 : 0) - (this.key('KeyD', 'ArrowRight') ? 1 : 0) - this.stick.x));
    if (brake) this.bikeSpeed = Math.max(0, this.bikeSpeed - MOVE.bikeBrake * dt);
    else if (pedal) this.bikeSpeed = Math.min(MOVE.bikeMax, this.bikeSpeed + MOVE.bikeAccel * dt);
    else this.bikeSpeed = Math.max(0, this.bikeSpeed - MOVE.bikeCoast * dt);
    this.yaw += this.steer * MOVE.bikeTurn * (0.35 + 0.65 * Math.min(1, this.bikeSpeed / 3)) * dt;
    return this.forward().multiplyScalar(this.bikeSpeed * dt);
  }

  update(dt, all) {
    this.moving = false;
    // only what is within reach this frame
    const x = this.pos.x; const z = this.pos.z; const r = 2;
    const colliders = all.filter((c) => c.maxX > x - r && c.minX < x + r && c.maxZ > z - r && c.minZ < z + r);
    if (this.enabled && !this.seated && !this.frozen) {
      const move = this._bike ? this.bikeStep(dt) : this.footStep(dt);
      if (move.lengthSq() > 1e-10) {
        const from = this.pos.clone();
        this.pos.x += move.x;
        this.resolve(colliders, 'x');
        this.pos.z += move.z;
        this.resolve(colliders, 'z');
        const done = Math.hypot(this.pos.x - from.x, this.pos.z - from.z);
        const asked = Math.hypot(move.x, move.z);
        // Hitting a wall stops you instead of letting you push along it at full speed.
        if (done < asked * 0.5) {
          if (this._bike) this.bikeSpeed *= 0.2;
          else this.vel.multiplyScalar(done / asked);
        }
        this.lastMove.set(this.pos.x - from.x, 0, this.pos.z - from.z).divideScalar(dt);
        this.moving = this.lastMove.lengthSq() > 0.01;
      }
      const floor = this.floorAt(colliders);
      if (!this._bike && this.keys.has('Space') && this.pos.y <= floor + 0.001) this.velY = 6.2;
      this.velY -= GRAVITY * dt;
      this.pos.y += this.velY * dt;
      if (this.pos.y <= floor) {
        this.pos.y = floor;
        this.velY = 0;
      }
    }
    if (!this.enabled || this.seated || this.frozen) { this.vel.set(0, 0, 0); this.bikeSpeed = 0; this.steer = 0; this.running = false; }
    const eye = this.seated ? this.eye * 0.8 : this.eye;
    this.camera.position.set(this.pos.x, this.pos.y + eye, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  floorAt(colliders) {
    let floor = 0;
    for (const c of colliders) {
      if (!c.walkable || !c.enabled) continue;
      if (this.pos.x > c.minX && this.pos.x < c.maxX && this.pos.z > c.minZ && this.pos.z < c.maxZ && this.pos.y >= c.maxY - 0.7) {
        floor = Math.max(floor, c.maxY);
      }
    }
    return floor;
  }

  resolve(colliders, axis) {
    const RADIUS = this._bike ? MOVE.bikeRadius : MOVE.footRadius;
    for (const c of colliders) {
      if (!c.enabled) continue;
      if (this.pos.y >= c.maxY - 0.05) continue;
      if (c.minY > this.pos.y + 1.7) continue; // above your head (an upper floor)
      if (c.walkable && this.pos.y + 0.7 >= c.maxY) continue;
      const nx = Math.max(c.minX, Math.min(this.pos.x, c.maxX));
      const nz = Math.max(c.minZ, Math.min(this.pos.z, c.maxZ));
      const dx = this.pos.x - nx;
      const dz = this.pos.z - nz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= RADIUS * RADIUS) continue;
      if (d2 > 1e-10) {
        // Touching from outside: push out along the contact normal, so you slide past corners
        // (walls of rotated buildings are rows of small boxes) instead of catching on them.
        const d = Math.sqrt(d2);
        this.pos.x += (dx / d) * (RADIUS - d);
        this.pos.z += (dz / d) * (RADIUS - d);
        continue;
      }
      if (axis === 'x') {
        if (dx !== 0) this.pos.x = nx + Math.sign(dx) * Math.sqrt(RADIUS * RADIUS - dz * dz);
        else if (dz === 0) this.pos.x = this.pos.x < (c.minX + c.maxX) / 2 ? c.minX - RADIUS : c.maxX + RADIUS;
      } else if (dz !== 0) this.pos.z = nz + Math.sign(dz) * Math.sqrt(RADIUS * RADIUS - dx * dx);
      else if (dx === 0) this.pos.z = this.pos.z < (c.minZ + c.maxZ) / 2 ? c.minZ - RADIUS : c.maxZ + RADIUS;
    }
  }
}
