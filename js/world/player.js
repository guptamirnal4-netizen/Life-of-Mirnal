import * as THREE from 'three';

const RADIUS = 0.32;
const GRAVITY = 22;

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
    this.seated = null;
    this.eye = 1.0;
    this.sensitivity = 1;
    this.enabled = false;
    this.moving = false;
    this.lastMove = new THREE.Vector3();

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
    this.speed = 3.2 + Math.min(classNum, 10) * 0.08;
  }

  place(pos, yaw = 0) {
    this.pos.copy(pos);
    this.yaw = yaw;
    this.pitch = 0;
    this.velY = 0;
    this.seated = null;
  }

  sit(seatPos, yaw = 0) {
    this.seated = { pos: seatPos.clone(), yaw };
    this.pos.copy(seatPos);
    this.yaw = yaw;
    this.pitch = 0.06;
  }

  stand() {
    if (!this.seated) return;
    this.pos.z += 0.55;
    this.seated = null;
  }

  forward() {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  update(dt, colliders) {
    this.moving = false;
    if (this.enabled && !this.seated && !this.frozen) {
      const f = this.forward();
      const r = new THREE.Vector3(-f.z, 0, f.x);
      const move = new THREE.Vector3();
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) move.add(f);
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) move.sub(f);
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) move.add(r);
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) move.sub(r);
      if (move.lengthSq() > 0) {
        const run = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
        move.normalize().multiplyScalar((this.bike ? 7.2 * (run ? 1.3 : 1) : this.speed * (run ? 1.8 : 1)) * dt);
        this.lastMove.copy(move).divideScalar(dt);
        this.moving = true;
        this.pos.x += move.x;
        this.resolve(colliders, 'x');
        this.pos.z += move.z;
        this.resolve(colliders, 'z');
      }
      const floor = this.floorAt(colliders);
      if (this.keys.has('Space') && this.pos.y <= floor + 0.001) this.velY = 6.2;
      this.velY -= GRAVITY * dt;
      this.pos.y += this.velY * dt;
      if (this.pos.y <= floor) {
        this.pos.y = floor;
        this.velY = 0;
      }
    }
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
    for (const c of colliders) {
      if (!c.enabled) continue;
      if (this.pos.y >= c.maxY - 0.05) continue;
      if (c.walkable && this.pos.y + 0.7 >= c.maxY) continue;
      const nx = Math.max(c.minX, Math.min(this.pos.x, c.maxX));
      const nz = Math.max(c.minZ, Math.min(this.pos.z, c.maxZ));
      const dx = this.pos.x - nx;
      const dz = this.pos.z - nz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= RADIUS * RADIUS) continue;
      if (axis === 'x') {
        if (dx !== 0) this.pos.x = nx + Math.sign(dx) * Math.sqrt(RADIUS * RADIUS - dz * dz);
        else if (dz === 0) this.pos.x = this.pos.x < (c.minX + c.maxX) / 2 ? c.minX - RADIUS : c.maxX + RADIUS;
      } else if (dz !== 0) this.pos.z = nz + Math.sign(dz) * Math.sqrt(RADIUS * RADIUS - dx * dx);
      else if (dx === 0) this.pos.z = this.pos.z < (c.minZ + c.maxZ) / 2 ? c.minZ - RADIUS : c.maxZ + RADIUS;
    }
  }
}
