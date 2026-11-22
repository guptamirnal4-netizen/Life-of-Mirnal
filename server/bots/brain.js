// One bot's mind: perception (only what it can see), a small utility state machine (think, 5–10 Hz) and the
// controls it sends every tick (the same input a browser sends: move intent, run, jump, aim, fire, reload, switch)
// plus the same discrete messages (land, open, pick, throw, use, revive). The room's BotManager
// (server/bots/manager.js) runs it; everything it does goes through the room's normal handlers and validation.
//
// Pure helpers (aim, blaster choice, loot value, landing pick, move input) are exported for the unit tests.
import { EQUIPMENT_BY_ID, PAINT_MAX } from '../../js/paintball/equipment.js';
import { MOVE, TICK_HZ } from '../../js/paintball/rules.js';
import { aimDir, ballisticAim } from '../../js/paintball/sim.js';
import { ITEMS, BOMB, pickupPlan } from '../../js/paintball/items.js';
import { ROYALE } from '../../js/paintball/royale.js';

const TAU = Math.PI * 2;
export const wrap = (a) => { a %= TAU; if (a > Math.PI) a -= TAU; if (a < -Math.PI) a += TAU; return a; };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const between = (rand, [a, b]) => a + rand() * (b - a);
const gauss = (rand) => { let u = 0; let v = 0; while (u === 0) u = rand(); while (v === 0) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };
const yawTo = (dx, dz) => Math.atan2(-dx, -dz);

// The distance each blaster likes to fight at (m), and how good a blaster is to own (Campus Royale looting).
export const PREFER = { spread: 8, rapid: 14, launcher: 18, burst: 20, standard: 22, precision: 38 };
export const BLASTER_VALUE = { standard: 2, spread: 3.5, rapid: 4, burst: 4, launcher: 4.2, precision: 5 };

// Yaw / pitch from an eye position to a point, with the paintball's drop over the flight (fixed-point refinements).
export function solveAim(eye, to, equipId) {
  const e = EQUIPMENT_BY_ID[equipId] || EQUIPMENT_BY_ID.standard;
  const a = ballisticAim(eye, to, e.speed, e.gravity);
  return { ...a, flight: a.dist / e.speed };
}

// Pitch for a paint bomb to come down about d metres away on level ground: thrown from h0 above it along the aim
// with BOMB.loft added (the flatter of the two arcs, found by bisection).
export function bombPitch(d, h0 = MOVE.eye - 0.15) {
  const v = BOMB.speed; const g = BOMB.gravity;
  const range = (th) => { const vx = v * Math.cos(th); const vy = v * Math.sin(th); return (vx / g) * (vy + Math.sqrt(vy * vy + 2 * g * h0)); };
  let lo = -0.6; let hi = Math.PI / 4;
  if (d <= range(lo)) return lo - BOMB.loft;
  if (d >= range(hi)) return hi - BOMB.loft;
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (range(m) < d) lo = m; else hi = m; }
  return (lo + hi) / 2 - BOMB.loft;
}

// Forward / sideways input (relative to the yaw you look along) that walks in the direction (dx, dz).
export function moveInput(yaw, dx, dz) {
  const l = Math.hypot(dx, dz); if (l < 1e-6) return { f: 0, s: 0 };
  const x = dx / l; const z = dz / l;
  return { f: x * -Math.sin(yaw) + z * -Math.cos(yaw), s: x * Math.cos(yaw) + z * -Math.sin(yaw) };
}

// Paintballs left for a blaster slot: hopper + carried.
export const ammoOf = (p, slot) => (slot ? p.hopper1 + p.carried1 : p.hopper0 + p.carried0);
// The slot to fight with at distance d: a loaded blaster whose favourite range is closest to d.
export function pickSlot(p, d) {
  let best = p.slot; let bs = Infinity;
  for (const slot of [0, 1]) {
    const id = slot ? p.secondary : p.primary; const e = EQUIPMENT_BY_ID[id];
    if (!e || ammoOf(p, slot) <= 0 || d > e.range * 1.05) continue;
    const score = Math.abs(PREFER[id] - d) + (slot === p.slot ? -3 : 0) + ((slot ? p.hopper1 : p.hopper0) === 0 ? 6 : 0);
    if (score < bs) { bs = score; best = slot; }
  }
  return best;
}

// How much an item in a crate is worth to this inventory (0 = leave it). inv as items.js pickupPlan takes it.
export function lootValue(inv, itemId, n = 1, smart = true) {
  const it = ITEMS[itemId]; if (!it) return 0;
  const plan = pickupPlan(inv, itemId, n);
  if (!plan.take) return 0;
  const held = [inv.primary, inv.secondary].filter(Boolean);
  switch (it.kind) {
    case 'blaster': {
      if (held.includes(it.blaster)) return 0.3;
      if (held.length < 2) return 6 + BLASTER_VALUE[it.blaster];
      const worst = Math.min(...held.map((b) => BLASTER_VALUE[b]));
      return BLASTER_VALUE[it.blaster] > worst + (smart ? 0.4 : 0) ? 3 + BLASTER_VALUE[it.blaster] - worst : smart ? 0 : 0.5;
    }
    case 'ammo': {
      if (!held.includes(it.blaster)) return smart ? 0 : 0.4;
      const have = inv.ammo[it.blaster] || 0; const pack = EQUIPMENT_BY_ID[it.blaster].total;
      return 2 + 5 * (1 - have / pack);
    }
    case 'refill': return held.length ? 2.5 : 0;
    case 'gear': return 3 + it.tier;
    case 'throw': return it.id === 'paintbomb' ? 3 : 0.8;
    case 'kit': return it.id === 'kit' ? 3 : 2.2;
    case 'gadget': return it.id === 'shield' ? 3.5 : 1.5;
    default: return 0;
  }
}

// A landing spot far from the ones already taken: the best of `tries` random outdoor drops.
export function pickLanding(drops, taken, rand, tries = 40) {
  const pool = drops.filter((d) => !d.indoor || rand() < 0.15);
  let best = null; let bs = -1;
  for (let i = 0; i < tries && pool.length; i++) {
    const d = pool[Math.floor(rand() * pool.length)];
    const near = taken.length ? Math.min(...taken.map((t) => Math.hypot(t.x - d.x, t.z - d.z))) : 500;
    const s = Math.min(near, 400) + rand() * 8; // small tiebreak only: noise must not beat a much farther spot
    if (s > bs) { bs = s; best = d; }
  }
  return best;
}

const inv = (p) => { const ammo = {}; for (const [k, v] of p.ammo) ammo[k] = v; return { primary: p.primary, secondary: p.secondary, slot: p.slot, ammo, paintbomb: p.paintbomb, smoke: p.smoke, wipes: p.wipes, kit: p.kit, gearMask: p.gearMask, gearVest: p.gearVest, shield: p.shield, scan: p.scan }; };

export class Brain {
  constructor(id, level, rand) {
    this.id = id; this.level = level; this.rand = rand;
    this.seq = 0; this.acc = 0; this.nextThink = rand() / level.think;
    this.reset();
    this.stats = { thinks: 0, shots: 0, hits: 0, tags: 0, fired: 0, losChecks: 0, paths: 0, unstuck: 0 };
  }
  setLevel(level) { this.level = level; }
  reset() {
    this.mem = new Map(); // opponent id → { x, y, z, vx, vz, t (last seen), seen }
    this.target = null; this.visible = false; this.reactAt = 0; this.mode = 'roam';
    this.goal = null; this.path = null; this.idx = 0; this.cut = -1; this.pathPending = false; this.goalKind = '';
    this.fireUntil = 0; this.pauseUntil = 0; this.errYaw = 0; this.errPitch = 0; this.phase = this.rand() * TAU;
    this.strafe = 1; this.strafeUntil = 0; this.slot = 0; this.reload = false; this.jump = false;
    this.lookYaw = null; this.yaw = null; this.pitch = 0;
    this.stuck = { x: 0, z: 0, t: 0, n: 0, until: 0, side: 1 };
    this.actions = []; this.lastPainted = -9; this.painter = null; this.coverUntil = 0; this.coverRoll = -9;
    this.bombAt = 0; this.ignore = new Map(); this.lootAt = 0; this.crateErr = 0; this.landed = false; this.landAt = null;
    this.airdropRoll = null; this.roamUntil = 0; this.shieldRoll = -9; this.cleanRoll = -9; this.wasAlive = false; this.heard = null;
  }

  // a message the room sent this player (the same as a browser would get)
  onMessage(type, m, now) {
    if (type === 'painted') { this.lastPainted = now; this.painter = m.by; }
    else if (type === 'hit') { if (!m.protected && !m.shield) this.stats.hits++; }
    else if (type === 'error' && ['far', 'sight', 'gone', 'full', 'have-better', 'no-blaster', 'pick'].includes(m.code)) this.crateErr++;
  }

  // ---------- think: perception and decisions ----------
  think(c) {
    const { p, s, now, L } = c; this.stats.thinks++;
    if (!p.alive || p.out) { if (this.wasAlive) { const keep = this.stats; const lv = this.level; this.reset(); this.stats = keep; this.level = lv; } this.wasAlive = false; return; }
    if (!this.wasAlive) { this.wasAlive = true; this.yaw = p.yaw; this.pitch = 0; this.slot = p.slot; }
    if (s.phase === 'landing') return;
    this.perceive(c);
    if (p.down) { this.mode = 'crawl'; const m = c.nearestMate(); if (m) this.setGoal(c, m.p.x, m.p.z, m.p.y, 'mate'); return; }
    const th = this.target ? c.player(this.target) : null;
    const dist = th ? Math.hypot(th.x - p.x, th.z - p.z) : Infinity;
    // weapon for the range (or anything loaded)
    if (th) this.slot = pickSlot(p, dist);
    else if (ammoOf(p, p.slot) <= 0 && ammoOf(p, p.slot ? 0 : 1) > 0) this.slot = p.slot ? 0 : 1;
    // reload when quiet
    const H = p.slot ? p.hopper1 : p.hopper0; const e = EQUIPMENT_BY_ID[p.equip];
    if (!this.visible && e && H < e.magazine * 0.6 && (p.slot ? p.carried1 : p.carried0) > 0 && p.reloadUntil <= now) this.reload = true;
    // gadgets (Campus Royale)
    if (c.royale) {
      const hot = now - this.lastPainted < 0.8;
      if (hot && p.shield > 0 && p.paint >= 55 && now >= p.shieldUntil && now - this.shieldRoll > 3) { this.shieldRoll = now; if (this.rand() < L.shield) this.act('use', { kind: 'shield' }); }
      const Z = s.zone; const outside = Z.r > 0 && Math.hypot(p.x - Z.x, p.z - Z.z) > Z.r - 3;
      // outside the paint zone: get back in first (cleaning there is wasted)
      if (outside && (p.paint >= 40 || !this.visible) && this.thinkZone(c, true)) return;
      if (!outside && !this.visible && !p.channel && p.paint >= 35 && now - this.lastPainted > 2 && (p.wipes || p.kit) && now - this.cleanRoll > 4) {
        this.cleanRoll = now;
        if (this.rand() < L.clean) { this.act('use', { kind: p.kit && (p.paint >= 60 || !p.wipes) ? 'kit' : 'wipes' }); this.mode = 'channel'; return; }
      }
      if (p.channel) { this.mode = 'channel'; if (!this.visible) return; }
      this.thinkBomb(c, th, dist);
    }
    // cover: painted (or reloading) with an opponent around
    const threat = th || (this.painter && c.player(this.painter));
    if (threat && now >= this.coverUntil && now - this.coverRoll > 2.5 && ((now - this.lastPainted < 1 && p.paint >= 45) || (p.reloadUntil > now && this.visible))) {
      this.coverRoll = now;
      if (this.rand() < L.cover) {
        const spot = c.coverFrom(threat);
        if (spot) { this.coverUntil = now + 2.2 + this.rand() * 1.5; this.mode = 'cover'; this.setGoal(c, spot.x, spot.z, spot.y, 'cover'); if (!this.visible || e?.id !== 'precision') this.reload = this.reload || (H < (e?.magazine || 0) * 0.7); return; }
      }
    }
    if (this.mode === 'cover' && now < this.coverUntil) return;
    if (th && this.visible) { this.mode = 'engage'; this.engagePlan(c, th, dist); return; }
    // someone just went out of sight: chase where they were (Medium / Hard remember longer)
    const last = this.lastSeen(now, L.memory);
    if (last && (!c.royale || this.hasAmmo(p))) { this.mode = 'chase'; this.setGoal(c, last.x, last.z, last.y, 'chase'); return; }
    const ready = !c.royale || this.kitted(p);
    if (c.royale) {
      if (this.thinkRevive(c)) return;
      if (this.thinkZone(c, true)) return;
      if (ready && L.id !== 'easy' && this.thinkHeard(c)) return; // armed: go and see who that was
      if (this.thinkLoot(c)) return;
      if (this.thinkAirdrop(c)) return;
    }
    if (this.thinkHeard(c)) return;
    if (this.thinkFollow(c)) return;
    if (c.royale && this.thinkZone(c, false)) return;
    if (ready && this.thinkHunt(c)) return;
    this.thinkRoam(c);
  }

  hasAmmo(p) { return ammoOf(p, 0) + ammoOf(p, 1) > 0; }
  act(type, msg, aim = null) { this.actions.push({ type, msg, aim, at: 0 }); }

  perceive(c) {
    const { p, now, L } = c;
    const eye = { x: p.x, y: p.y + MOVE.eye, z: p.z };
    const cands = [];
    for (const [id, q] of c.opponents()) {
      const dx = q.x - p.x; const dz = q.z - p.z; const d = Math.hypot(dx, dz);
      if (d > L.view || Math.abs(q.y - p.y) > 25) continue;
      const off = Math.abs(wrap(yawTo(dx, dz) - (this.yaw ?? p.yaw)));
      const painter = this.painter === id && now - this.lastPainted < 1.5;
      const steps = d < L.hear * 1.8 && c.speed(id) > 5.5; // running footsteps carry further
      if (off > L.fov / 2 && d > L.hear && !painter && !steps) continue;
      cands.push([id, q, d - (id === this.target ? 15 : 0) - (painter ? 10 : 0)]);
    }
    cands.sort((a, b) => a[2] - b[2]);
    // the three nearest, and one of the others in turn (so a far opponent is not hidden behind near ones)
    if (cands.length > 3) { const k = 3 + (this.stats.thinks % (cands.length - 3)); cands.splice(3, cands.length - 3, cands[k]); }
    let seen = null; let checks = 0;
    for (const [id, q] of cands) {
      if (checks >= 4) break;
      const vis = c.los(eye, { x: q.x, y: q.y + 1.3, z: q.z });
      if (vis === null) break; // the room's ray budget for this tick is spent: decide next time
      checks++; this.stats.losChecks++;
      if (!vis) continue;
      const m = this.mem.get(id);
      const dt = m ? now - m.t : 0;
      const vx = m && dt > 0.02 && dt < 1 ? (q.x - m.x) / dt : 0; const vz = m && dt > 0.02 && dt < 1 ? (q.z - m.z) / dt : 0;
      this.mem.set(id, { x: q.x, y: q.y, z: q.z, vx: clamp(vx, -8, 8), vz: clamp(vz, -8, 8), t: now });
      if (!seen) seen = id;
    }
    if (checks === 0 && this.target && this.visible) { const q = c.player(this.target); if (q && q.alive && !q.out) return; } // keep last decision
    if (seen) {
      if (seen !== this.target || !this.visible) { this.reactAt = Math.max(this.reactAt, now + between(this.rand, L.reaction) * (seen === this.target && now - (this.mem.get(seen)?.t || 0) < 0.6 ? 0.3 : 1)); this.newBurstError(); }
      this.target = seen; this.visible = true;
    } else {
      this.visible = false;
      if (this.target && !this.lastSeen(now, L.memory)) this.target = null;
    }
    // a painter is known by where the paint came from
    if (this.painter && now - this.lastPainted < 0.3) { const q = c.player(this.painter); if (q) { const m = this.mem.get(this.painter); if (!m || now - m.t > 0.5) this.mem.set(this.painter, { x: q.x, y: q.y, z: q.z, vx: 0, vz: 0, t: now - 0.3 }); } }
    for (const [id, m] of this.mem) if (now - m.t > 40) this.mem.delete(id);
    if (seen && this.heard && Math.hypot(this.heard.x - p.x, this.heard.z - p.z) < 25) this.heard = null;
  }

  // a sound (paintballs fired, a paint bomb bursting, a crate opening, running feet): roughly where, not who
  hear(x, y, z, now) {
    const h = this.heard;
    if (h && now - h.t < 1.5) return;
    this.heard = { x, y, z, t: now };
  }

  // Campus Royale: kitted up = a second blaster or plenty of paintballs
  kitted(p) { return (!!p.secondary && ammoOf(p, 1) > 10) || ammoOf(p, 0) + ammoOf(p, 1) >= 60; }
  lastSeen(now, memory) {
    let best = null;
    for (const [id, m] of this.mem) if (now - m.t < memory && (!best || m.t > best.t)) best = { id, ...m };
    return best;
  }
  newBurstError() { const L = this.level; this.errYaw = gauss(this.rand) * L.aim; this.errPitch = gauss(this.rand) * L.aim * 0.6; }

  engagePlan(c, th, dist) {
    const { p, now, L } = c;
    const e = EQUIPMENT_BY_ID[p.slot ? p.secondary : p.primary];
    const pref = PREFER[e?.id] ?? 20;
    if (now >= this.strafeUntil) { this.strafe = this.rand() < L.strafe ? (this.rand() < 0.5 ? -1 : 1) : 0; this.strafeUntil = now + 0.5 + this.rand() * 1.0; }
    // too far (or no line to walk): close in along a path; otherwise hold the range and strafe
    if (dist > pref + 6) this.setGoal(c, th.x, th.z, th.y, 'approach');
    else { this.goal = null; this.path = null; }
  }

  thinkBomb(c, th, dist) {
    const { p, now, L } = c;
    if (!p.paintbomb || now < this.bombAt || now < p.protectedUntil || L.bombs <= 0) return;
    let aim = null;
    const last = this.lastSeen(now, 2.5);
    if (!this.visible && last) { const d = Math.hypot(last.x - p.x, last.z - p.z); if (d > 6 && d < 18) aim = last; } // behind cover
    else if (th && this.visible && dist > 6 && dist < 18) {
      for (const [, q] of c.opponents()) if (q !== th && Math.hypot(q.x - th.x, q.z - th.z) < 4) { aim = th; break; } // a group
    }
    if (!aim) return;
    this.bombAt = now + 5;
    if (this.rand() >= L.bombs) return;
    const d = Math.hypot(aim.x - p.x, aim.z - p.z);
    this.act('throw', { kind: 'paintbomb' }, { yaw: yawTo(aim.x - p.x, aim.z - p.z), pitch: bombPitch(d) });
  }

  // investigate a sound heard in the last few seconds (Easy bots only when it was close)
  thinkHeard(c) {
    const { p, now, L } = c; const h = this.heard;
    if (!h || now - h.t > (L.id === 'easy' ? 6 : 12) || !this.hasAmmo(p)) return false;
    const d = Math.hypot(h.x - p.x, h.z - p.z);
    if (d < 4 || (L.id === 'easy' && d > 45)) { if (d < 4) this.heard = null; return false; }
    this.mode = 'investigate';
    this.setGoal(c, h.x, h.z, h.y, 'chase');
    return true;
  }
  // Hard bots hunt: towards where the nearest opponent was last seen or heard (up to 40 s ago)
  thinkHunt(c) {
    const { p, now, L } = c;
    if (L.id !== 'hard') return false;
    let best = null; let bd = Infinity;
    for (const [id, m] of this.mem) { const q = c.player(id); if (!q || !q.alive || q.out || now - m.t > 40) continue; const d = Math.hypot(m.x - p.x, m.z - p.z); if (d > 6 && d < bd) { bd = d; best = m; } }
    if (!best) return false;
    this.mode = 'hunt';
    this.setGoal(c, best.x, best.z, best.y, 'chase');
    return true;
  }

  thinkRevive(c) {
    const { p, s } = c;
    if (!c.teams) return false;
    let best = null; let bd = 45;
    for (const [id, q] of s.players) if (id !== this.id && q.team === p.team && q.down && !q.out) { const d = Math.hypot(q.x - p.x, q.z - p.z); if (d < bd) { bd = d; best = [id, q]; } }
    if (!best) return false;
    this.mode = 'revive';
    if (bd < ROYALE.reviveRange - 0.5) { this.goal = null; this.path = null; if (!p.channel) this.act('revive', { id: best[0] }); return true; }
    this.setGoal(c, best[1].x, best[1].z, best[1].y, 'revive');
    return true;
  }

  // Keep inside the paint zone; head for the next circle early (urgent: only when outside or about to be).
  thinkZone(c, urgent) {
    const { p, s, now, L } = c; const Z = s.zone;
    if (!Z.r) return false;
    const d = Math.hypot(p.x - Z.x, p.z - Z.z);
    const dn = Math.hypot(p.x - Z.nx, p.z - Z.nz);
    const out = d > Z.r - Math.min(25, Z.r * 0.15);
    const soon = !Z.shrinking && L.zone > 0 && Z.ends - now < L.zone + dn / 5 && dn > Z.nr * 0.7;
    const squeeze = Z.shrinking && dn > Z.nr * 0.8;
    if (urgent ? !out : !(soon || squeeze)) return false;
    let gx = Z.nx; let gz = Z.nz;
    if (dn > Z.nr * 0.6 && Z.nr > 0) { gx = Z.nx + ((p.x - Z.nx) / dn) * Z.nr * 0.45; gz = Z.nz + ((p.z - Z.nz) / dn) * Z.nr * 0.45; }
    this.mode = 'zone';
    if (!this.goal || this.goalKind !== 'zone' || Math.hypot(this.goal.x - gx, this.goal.z - gz) > 20) this.setGoal(c, gx, gz, null, 'zone');
    return true;
  }

  thinkLoot(c) {
    const { p, s, now, L } = c;
    const me = inv(p);
    // at a crate: open it, then take what helps (one item per L.loot seconds)
    if (this.goalKind === 'crate' && this.goal) {
      const cr = s.crates.get(this.goal.id);
      if (!cr || this.crateErr > 3) { this.ignore.set(this.goal.id, now + 60); this.goal = null; this.crateErr = 0; }
      else if (Math.hypot(cr.x - p.x, cr.z - p.z) < ROYALE.pickRange - 0.5 && Math.abs(cr.y - p.y) < ROYALE.pickRise) {
        this.mode = 'loot'; this.path = null;
        if (now < this.lootAt) return true;
        this.lootAt = now + L.loot;
        if (!cr.opened) { this.act('open', { id: this.goal.id }); return true; }
        let best = null; let bv = 0.9;
        for (const [uid, it] of cr.items) { const v = lootValue(me, it.item, it.n, L.smart); if (v > bv) { bv = v; best = [uid, it.item]; } }
        if (!best) { this.ignore.set(this.goal.id, now + 120); this.goal = null; return false; }
        const it = ITEMS[best[1]];
        if (it.kind === 'blaster' && p.primary && p.secondary) {
          // swap out the worse blaster: hold it first
          const worse = (BLASTER_VALUE[p.primary] ?? 0) <= (BLASTER_VALUE[p.secondary] ?? 0) ? 0 : 1;
          if (p.slot !== worse) { this.slot = worse; this.lootAt = now + 0.3; return true; }
        }
        this.act('pick', { id: this.goal.id, item: best[0] });
        return true;
      }
    }
    // the best crate in reach: unopened ones are a gamble (worth a little), opened ones by what is inside
    let best = null; let bv = 0;
    const needAmmo = !this.hasAmmo(p) || (p.hopper0 + p.carried0 + p.hopper1 + p.carried1) < 15;
    for (const [id, cr] of s.crates) {
      if ((this.ignore.get(id) || 0) > now) continue;
      const d = Math.hypot(cr.x - p.x, cr.z - p.z); if (d > (needAmmo ? 140 : 75) || Math.abs(cr.y - p.y) > 12) continue;
      if (c.royale && s.zone.r && Math.hypot(cr.x - s.zone.x, cr.z - s.zone.z) > s.zone.r - 10) continue;
      let v = 0;
      if (!cr.opened) v = 4; else for (const it of cr.items.values()) v = Math.max(v, lootValue(me, it.item, it.n, L.smart));
      if (cr.kind === 'drop') v += 4;
      const score = v / (1 + d / 25);
      if (v > 0.9 && score > bv) { bv = score; best = [id, cr]; }
    }
    if (!best) return false;
    this.mode = 'loot';
    if (this.goalKind !== 'crate' || this.goal?.id !== best[0]) { this.crateErr = 0; this.setGoal(c, best[1].x, best[1].z, best[1].y, 'crate'); this.goal.id = best[0]; }
    return true;
  }

  thinkAirdrop(c) {
    const { p, s, L } = c; const A = s.airdrop;
    if (!A.announced || (A.landed && !s.crates.has(A.crate))) return false;
    if (this.airdropRoll === null) this.airdropRoll = this.rand() < L.airdrop;
    if (!this.airdropRoll || Math.hypot(A.x - p.x, A.z - p.z) > 320) return false;
    if (A.landed) { const cr = s.crates.get(A.crate); this.mode = 'loot'; if (this.goal?.id !== A.crate) { this.setGoal(c, cr.x, cr.z, cr.y, 'crate'); this.goal.id = A.crate; } return true; }
    this.mode = 'airdrop'; this.setGoal(c, A.x, A.z, A.y, 'airdrop');
    return true;
  }

  // team modes: stay with the squad (a human leader first)
  thinkFollow(c) {
    const { p } = c;
    if (!c.teams) return false;
    const lead = c.leader();
    if (!lead || lead.id === this.id) return false;
    const d = Math.hypot(lead.p.x - p.x, lead.p.z - p.z);
    if (d < (c.royale ? 14 : 18)) { if (this.goalKind === 'follow') { this.goal = null; this.path = null; } return false; }
    this.mode = 'follow';
    if (!this.goal || this.goalKind !== 'follow' || Math.hypot(this.goal.x - lead.p.x, this.goal.z - lead.p.z) > 6) this.setGoal(c, lead.p.x + (this.rand() - 0.5) * 4, lead.p.z + (this.rand() - 0.5) * 4, lead.p.y, 'follow');
    return true;
  }

  thinkRoam(c) {
    const { p, now } = c;
    this.mode = 'roam';
    const reached = this.goal && Math.hypot(this.goal.x - p.x, this.goal.z - p.z) < 2.5;
    if (this.goal && this.goalKind === 'roam' && !reached && now < this.roamUntil) return;
    const g = c.roamPoint(this);
    this.roamUntil = now + (c.royale ? 25 : 9);
    if (g) this.setGoal(c, g.x, g.z, g.y, 'roam');
  }

  setGoal(c, x, z, y, kind) {
    const moving = kind === 'approach' || kind === 'chase' || kind === 'follow';
    const off = this.goal && this.goalKind === kind ? Math.hypot(this.goal.x - x, this.goal.z - z) : Infinity;
    if (off < (moving ? 4 : 1.5) && (this.path || this.pathPending)) return;
    // a moving goal (someone chased or heard): re-plan at most every 1.5 s unless it jumped far
    if (moving && off < 12 && this.path && c.now - (this.pathAt || 0) < 1.5) { this.goal.x = x; this.goal.z = z; return; }
    this.pathAt = c.now;
    this.goal = { x, z, y: y ?? c.p.y }; this.goalKind = kind;
    this.path = null; this.idx = 0; this.cut = -1;
    c.requestPath(this);
  }
  setPath(pts) { this.path = pts; this.idx = 0; this.cut = -1; this.pathPending = false; this.stats.paths++; }

  // ---------- every tick: the controls ----------
  control(c, dt) {
    const { p, s, now, L } = c;
    const out = { f: 0, s: 0, run: false, jump: false, fire: false, reload: false, slot: this.slot, yaw: this.yaw ?? p.yaw, pitch: this.pitch };
    if (!p.alive || p.out || s.phase === 'landing' || s.phase === 'lobby' || s.phase === 'results') return out;
    if (this.yaw === null) this.yaw = p.yaw;
    // where to look
    let want = null;
    const th = this.target && this.visible ? c.player(this.target) : null;
    const pend = this.actions.find((a) => a.aim);
    if (pend) want = pend.aim;
    else if (th) {
      const m = this.mem.get(this.target);
      const e = EQUIPMENT_BY_ID[p.equip] || EQUIPMENT_BY_ID.standard;
      const eye = { x: p.x, y: p.y + MOVE.eye, z: p.z };
      const flight = Math.hypot(th.x - p.x, th.z - p.z) / e.speed;
      const lead = L.lead * flight;
      const aim = solveAim(eye, { x: th.x + (m?.vx || 0) * lead, y: th.y + (th.down ? 0.4 : 1.15), z: th.z + (m?.vz || 0) * lead }, e.id);
      this.phase += dt * 1.7;
      want = { yaw: aim.yaw + this.errYaw + Math.sin(this.phase) * L.drift, pitch: aim.pitch + this.errPitch + Math.cos(this.phase * 1.3) * L.drift * 0.6, dist: aim.dist };
    }
    // where to go
    let dir = null; let run = false;
    if (this.mode === 'channel' || (this.mode === 'loot' && !this.path && this.goalKind === 'crate' && this.goal && Math.hypot(this.goal.x - p.x, this.goal.z - p.z) < ROYALE.pickRange - 0.5)) dir = null;
    else if (this.mode === 'engage' && th && !this.path) {
      const d = Math.hypot(th.x - p.x, th.z - p.z);
      const e = EQUIPMENT_BY_ID[p.equip]; const pref = PREFER[e?.id] ?? 20;
      const tx = (th.x - p.x) / (d || 1); const tz = (th.z - p.z) / (d || 1);
      const k = d > pref + 3 ? 1 : d < pref - 5 ? -0.8 : 0;
      dir = { x: tx * k + -tz * this.strafe * 0.9, z: tz * k + tx * this.strafe * 0.9 };
      if (Math.hypot(dir.x, dir.z) < 0.05) dir = null;
    } else dir = this.follow(c);
    if (this.hold) dir = null;
    if (dir && !th && !pend) { run = this.mode !== 'engage'; want = { yaw: yawTo(dir.x, dir.z), pitch: 0 }; }
    if (!want) want = { yaw: this.yaw, pitch: 0 };
    // turn towards it at the level's rate
    const maxT = L.turn * dt;
    this.yaw = wrap(this.yaw + clamp(wrap(want.yaw - this.yaw), -maxT, maxT));
    this.pitch = clamp(this.pitch + clamp(want.pitch - this.pitch, -maxT, maxT), -1.4, 1.4);
    out.yaw = this.yaw; out.pitch = this.pitch;
    if (dir) { const m = moveInput(this.yaw, dir.x, dir.z); out.f = m.f; out.s = m.s; out.run = run; }
    // unstick
    this.unstick(c, out, !!dir);
    // pending discrete actions (a throw waits until the server has our aim)
    while (this.actions.length) {
      const a = this.actions[0];
      if (a.aim && (Math.abs(wrap(p.yaw - a.aim.yaw)) > 0.06 || Math.abs(p.pitch - a.aim.pitch) > 0.06)) { a.at += dt; if (a.at < 1.5) break; this.actions.shift(); continue; }
      this.actions.shift();
      c.dispatch(a.type, a.msg);
    }
    // fire: a visible target, reaction time passed, aim settled, in range, loaded
    if (th && want.dist !== undefined && now >= this.reactAt && !p.channel) {
      const e = EQUIPMENT_BY_ID[p.equip];
      const settled = Math.abs(wrap(want.yaw - this.yaw)) < 0.05 && Math.abs(want.pitch - this.pitch) < 0.05;
      const H = p.slot ? p.hopper1 : p.hopper0;
      if (e && settled && want.dist <= e.range * L.range && H > 0 && p.reloadUntil <= now && p.slot === this.slot) {
        if (now < this.fireUntil) out.fire = true;
        else if (now >= this.pauseUntil) {
          this.fireUntil = now + between(this.rand, L.burst); this.pauseUntil = this.fireUntil + between(this.rand, L.pause); this.newBurstError();
          out.fire = true;
        }
      }
    }
    if (out.fire) this.stats.fired++;
    if (this.reload) { out.reload = true; this.reload = false; }
    if (this.jump) { out.jump = true; this.jump = false; }
    return out;
  }

  // the next waypoint's direction, or null when there is nowhere to go
  follow(c) {
    const { p } = c;
    if (!this.goal) return null;
    if (!this.path) {
      if (this.pathPending) return null;
      const d = Math.hypot(this.goal.x - p.x, this.goal.z - p.z);
      return d > 0.6 ? { x: this.goal.x - p.x, z: this.goal.z - p.z } : null;
    }
    while (this.idx < this.path.length) {
      const [x, z, y] = this.path[this.idx];
      const d = Math.hypot(x - p.x, z - p.z); const dy = Math.abs(y - p.y);
      if (d < 0.35 && dy < 1.6) { this.idx++; continue; }
      if (d < 1.6 && dy < 1.6 && this.cut !== this.idx && this.idx + 1 < this.path.length) {
        this.cut = this.idx; // check once per waypoint: can we walk straight at the one after?
        if (c.walkable(p, this.path[this.idx + 1])) { this.idx++; continue; }
      }
      return { x: x - p.x, z: z - p.z };
    }
    // path done: the last stretch to the goal itself
    const d = Math.hypot(this.goal.x - p.x, this.goal.z - p.z);
    if (d > 0.6 && d < 4) return { x: this.goal.x - p.x, z: this.goal.z - p.z };
    if (this.goalKind !== 'crate' && this.goalKind !== 'revive') this.goal = null;
    this.path = null;
    return null;
  }

  // not moving while trying to: jump and step sideways; then back to the last waypoint; then a new path; then give up
  unstick(c, out, moving) {
    const { p, now } = c; const S = this.stuck;
    if (!moving) { S.t = now; S.x = p.x; S.z = p.z; return; }
    if (now < S.until) { const m = moveInput(this.yaw, Math.cos(this.yaw) * S.side, -Math.sin(this.yaw) * S.side); out.s = m.s; out.f = m.f * 0.3 + out.f * 0.5; return; }
    if (now - S.t < 1) return;
    const moved = Math.hypot(p.x - S.x, p.z - S.z);
    S.t = now; S.x = p.x; S.z = p.z;
    if (moved > 0.4) { S.n = Math.max(0, S.n - 1); return; }
    S.n++; this.stats.unstuck++;
    this.jump = true; S.side = this.rand() < 0.5 ? -1 : 1; S.until = now + 0.5;
    if (S.n === 3 && this.path && this.idx > 0) { this.idx--; this.cut = this.idx; }
    else if (S.n === 5 && this.goal) { const g = this.goal; const k = this.goalKind; this.goal = null; this.setGoal(c, g.x, g.z, g.y, k); if (g.id) this.goal.id = g.id; }
    else if (S.n >= 7) { if (this.goal?.id) this.ignore.set(this.goal.id, now + 60); this.goal = null; this.path = null; S.n = 0; this.roamUntil = 0; }
  }
}
