// Campus Royale on the server: landing, supplies (pick up / drop / throw / use), the shrinking zone, squads'
// clean-offs, eliminations without respawn, spectating and the end of the match. One instance per room
// (server/PaintballRoom.js creates it); the room keeps doing movement, blasters and paintballs.
import { PbLoot, PbCrate } from '../schema.js';
import { EQUIPMENT_BY_ID, PAINT_MAX } from '../../js/paintball/equipment.js';
import { MODES_BY_ID, SCORE, ASSIST_WINDOW, MOVE } from '../../js/paintball/rules.js';
import { CAMPUS } from '../../js/paintball/arena.js';
import { ROYALE, ZONE_PHASES, planZone, zoneAt, readSpots, assignLandings, spawnCrates, pickFinal, nearestDrop, pickAirdrop } from '../../js/paintball/royale.js';
import { ITEMS, pickupPlan, BOMB, SMOKE, KITS, CARRY, SHIELD, SCAN, bombPaint, gearPaint, PACK, rollAirdrop } from '../../js/paintball/items.js';
import { stepBomb, throwVelocity, BODY } from '../../js/paintball/sim.js';

const r3 = (v) => Math.round(v * 1000) / 1000;
const THROWS = new Set(['paintbomb', 'smoke']);

export class RoyaleRules {
  constructor(room) {
    this.room = room;
    this.bombs = [];
    this.lootId = 0;
    this.circles = null;
    this.zoneOverride = null; // test helper
  }

  get s() { return this.room.state; }
  get geo() { return CAMPUS.geo; }
  get spots() { if (!this._spots) this._spots = readSpots(CAMPUS.spots); return this._spots; }
  teams() { return MODES_BY_ID[this.s.mode].teams; }
  groupOf(p, id) { return this.teams() ? `t${p.team}` : id; }
  sendErr(id, code, message) { this.room.sendTo(id, 'error', { code, message }); }

  // ---------- inventory helpers ----------
  inv(p) {
    const ammo = {}; for (const [k, v] of p.ammo) ammo[k] = v;
    return { primary: p.primary, secondary: p.secondary, slot: p.slot, ammo, paintbomb: p.paintbomb, smoke: p.smoke, wipes: p.wipes, kit: p.kit, gearMask: p.gearMask, gearVest: p.gearVest };
  }
  // keep the carried counts the HUD and the reload use in step with the backpack
  mirror(p) {
    p.carried0 = p.primary ? p.ammo.get(p.primary) || 0 : 0;
    p.carried1 = p.secondary ? p.ammo.get(p.secondary) || 0 : 0;
  }
  // after a reload: the backpack follows the carried count of the blaster in hand
  syncAmmo(p) {
    const b = p.slot ? p.secondary : p.primary;
    if (b) { const C = p.slot ? p.carried1 : p.carried0; if ((p.ammo.get(b) || 0) !== C) p.ammo.set(b, C); }
    this.mirror(p);
  }
  // a crate with items [[itemId, n]]; returns its id
  addCrate(kind, items, x, y, z) {
    const c = new PbCrate(); c.kind = kind; c.x = x; c.y = y; c.z = z; c.opened = kind === 'pile';
    for (const [item, n] of items) { const l = new PbLoot(); l.item = item; l.n = n; c.items.set(`I${++this.itemId}`, l); }
    const id = `C${++this.lootId}`;
    this.s.crates.set(id, c);
    return id;
  }
  // something dropped: onto the pile already at your feet, or a new pile
  addLoot(item, n, x, y, z) {
    for (const [id, c] of this.s.crates) {
      if (c.kind === 'pile' && Math.hypot(c.x - x, c.z - z) < 0.8 && Math.abs(c.y - y) < 0.5) { const l = new PbLoot(); l.item = item; l.n = n; c.items.set(`I${++this.itemId}`, l); return id; }
    }
    return this.addCrate('pile', [[item, n]], x, y, z);
  }

  // ---------- match start: landing ----------
  start() {
    const s = this.s; const room = this.room;
    this.bombs.length = 0; this.zoneOverride = null; this._spots = null;
    s.crates.clear(); this.lootId = 0; this.itemId = 0;
    Object.assign(s.airdrop, { x: 0, y: 0, z: 0, at: 0, announced: false, landed: false, crate: '' });
    s.geo = this.geo.hash;
    for (const id of room.joinOrder) {
      const p = s.players.get(id); if (!p) continue;
      const sim = room.sim.get(id);
      if (sim && !sim.loadout) sim.loadout = [p.primary, p.secondary]; // the lobby choice, back after the match
      Object.assign(p, { supplies: 0, shield: 0, scan: 0, shieldUntil: 0, alive: false, out: false, down: false, downUntil: 0, placement: 0, survived: 0, drop: -1, watching: '', channel: '', channelUntil: 0, paint: 0, paintbomb: 0, smoke: 0, wipes: 0, kit: 0, gearMask: 0, gearVest: 0, primary: ROYALE.start.blaster, secondary: '', slot: 0, equip: ROYALE.start.blaster, hopper0: ROYALE.start.hopper, hopper1: 0, reloadUntil: 0, switchUntil: 0 });
      p.ammo.clear();
      this.mirror(p);
    }
    // the zone for this match: a random final spot from the registry
    const final = pickFinal(CAMPUS.spots, room.rand);
    const b = this.geo.bbox; const c = CAMPUS.centre;
    const startR = Math.ceil(Math.max(...[[b.minX, b.minZ], [b.maxX, b.minZ], [b.minX, b.maxZ], [b.maxX, b.maxZ]].map(([x, z]) => Math.hypot(x - c.x, z - c.z)))) + 10;
    this.circles = planZone(room.rand, { centre: c, startR, final: { x: final[0], z: final[1] } });
    this.applyZone(zoneAt(this.circles, 0, ZONE_PHASES, room.timing.zoneScale));
    s.zone.phases = ZONE_PHASES.length;
    s.phase = 'landing';
    s.phaseEnds = s.now + room.timing.landing;
    this.updateCounts();
  }

  // 'land' { id } or { x, z }: the landing spot for you (and your squad)
  choose(id, p, msg) {
    const s = this.s;
    if (s.phase !== 'landing') return this.sendErr(id, 'not-landing', 'Landing spots are picked before the match starts.');
    const drops = this.spots.drops;
    let d = Number.isInteger(msg.id) && drops[msg.id] ? drops[msg.id] : null;
    if (!d && Number.isFinite(msg.x) && Number.isFinite(msg.z)) {
      const n = nearestDrop(drops, msg.x, msg.z);
      if (n && Math.hypot(n.x - msg.x, n.z - msg.z) < 120) d = n;
    }
    if (!d) return this.sendErr(id, 'land', 'Pick a landing spot on the campus map.');
    if (this.teams()) { for (const q of s.players.values()) if (q.team === p.team) q.drop = d.id; } else p.drop = d.id;
  }

  land() {
    const s = this.s; const room = this.room;
    const groups = new Map();
    for (const id of room.joinOrder) {
      const p = s.players.get(id); if (!p) continue;
      const k = this.groupOf(p, id);
      if (!groups.has(k)) groups.set(k, { key: k, members: [], choice: null });
      const g = groups.get(k); g.members.push(id);
      if (p.drop >= 0 && g.choice === null) g.choice = p.drop;
    }
    const L = assignLandings(this.spots.drops, [...groups.values()], room.rand);
    for (const [id, spot] of L) {
      const p = s.players.get(id); if (!p) continue;
      p.x = spot.x; p.z = spot.z; p.y = spot.y; p.vy = 0; p.drop = spot.drop;
      p.yaw = room.rand() * Math.PI * 2; p.pitch = 0;
      p.alive = true; p.out = false;
      p.protectedUntil = s.now + room.timing.countdown + room.timing.protection;
    }
    for (const c of spawnCrates(this.spots.supplies, room.rand)) this.addCrate('crate', c.items, c.x, c.y, c.z);
    // the special supply drop: where (inside the zone of its time) and when
    const at = ROYALE.airdrop.at * room.timing.zoneScale;
    const zAt = zoneAt(this.circles, at, ZONE_PHASES, room.timing.zoneScale);
    const d = pickAirdrop(this.spots.drops, zAt.next.r > 0 ? zAt.next : zAt, room.rand);
    Object.assign(s.airdrop, { x: d.x, y: d.y, z: d.z, at: 0, announced: false, landed: false, crate: '' });
    this.airdropAt = at;
    s.phase = 'countdown';
    s.phaseEnds = s.now + room.timing.countdown;
    this.updateCounts();
    room.broadcast('landed', {});
  }

  // ---------- per tick ----------
  tick(dt) {
    const s = this.s; const room = this.room;
    if (s.phase === 'landing') { if (s.now >= s.phaseEnds) this.land(); return; }
    if (s.phase !== 'playing') return;
    const t = s.now - s.playStart;
    const z = this.zoneOverride || zoneAt(this.circles, t, ZONE_PHASES, room.timing.zoneScale);
    this.applyZone(z);
    for (const [id, p] of s.players) {
      if (!p.alive || p.out) continue;
      // zone paint
      if (Math.hypot(p.x - z.x, p.z - z.z) > z.r && !p.down) this.zonePaint(id, p, z.dps * dt);
      if (p.down && s.now >= p.downUntil) this.eliminate(id, 'down');
      if (p.channel && s.now >= p.channelUntil) this.finishChannel(id, p);
      else if (p.channel === 'revive') {
        const sim = room.sim.get(id); const tgt = s.players.get(sim?.reviveTarget);
        if (!tgt || !tgt.down || tgt.out || Math.hypot(tgt.x - p.x, tgt.z - p.z) > ROYALE.reviveRange + 0.5) p.channel = '';
      }
    }
    this.flyBombs(dt);
    this.airdropTick(t);
    this.updateCounts();
    this.checkEnd();
  }

  // the special supply drop: announced ROYALE.airdrop.warn s ahead (map, minimap, HUD countdown), then lands.
  // now: a test helper (announce at once, land half a second later)
  airdropTick(t, now = false) {
    const A = this.s.airdrop; const room = this.room;
    if (A.landed) return;
    const warn = ROYALE.airdrop.warn * room.timing.zoneScale;
    if (now) this.airdropAt = Math.min(this.airdropAt, t + 0.5);
    if (!A.announced && t >= this.airdropAt - warn - (now ? 1 : 0)) { A.announced = true; A.at = this.s.playStart + this.airdropAt; room.broadcast('airdrop', { x: A.x, z: A.z, at: A.at }); }
    if (t >= this.airdropAt) { A.landed = true; A.crate = this.addCrate('drop', rollAirdrop(room.rand), A.x, A.y, A.z); room.broadcast('airdrop', { x: A.x, z: A.z, landed: true, crate: A.crate }); }
  }

  applyZone(z) {
    const Z = this.s.zone;
    Z.x = z.x; Z.z = z.z; Z.r = z.r; Z.nx = z.next.x; Z.nz = z.next.z; Z.nr = z.next.r;
    Z.phase = z.phase; Z.shrinking = z.shrinking; Z.ends = this.s.playStart + z.ends; Z.dps = z.dps;
  }

  zonePaint(id, p, amount) {
    const s = this.s; const room = this.room;
    if (s.now < p.protectedUntil) return;
    p.paint = Math.min(PAINT_MAX, p.paint + amount);
    if (p.paint >= PAINT_MAX) {
      // the last opponent to paint them within the assist window gets the tag
      const sim = room.sim.get(id); let by = null; let at = -1;
      for (const [pid, when] of sim?.painters || []) if (s.now - when <= ASSIST_WINDOW && when > at) { at = when; by = pid; }
      if (by && s.players.has(by)) room.tag(id, by, false, true);
      else this.tagged(id, null, true);
    }
  }

  // ---------- being tagged ----------
  // The room's tag() scored it; now: down (a squad with someone still standing) or out.
  tagged(id, byId, zone = false) {
    const s = this.s; const p = s.players.get(id); if (!p) return;
    const sim = this.room.sim.get(id);
    if (sim) { sim.trigger = false; sim.burstLeft = 0; }
    p.reloadUntil = 0; p.channel = '';
    if (!byId) this.room.broadcast('tag', { by: '', byName: zone ? 'the zone' : '', target: id, targetName: p.nickname, assists: [], precision: false, zone: true });
    const teams = this.teams();
    if (teams && !p.down) {
      const mates = [...s.players.values()].some((q) => q !== p && q.team === p.team && q.alive && !q.out && !q.down);
      if (mates) {
        p.down = true; p.downUntil = s.now + this.room.timing.down; p.paint = PAINT_MAX;
        this.room.broadcast('down', { id, name: p.nickname, until: p.downUntil });
        return;
      }
    }
    this.eliminate(id, zone ? 'zone' : 'tag');
  }

  eliminate(id, why = 'tag') {
    const s = this.s; const p = s.players.get(id);
    if (!p || p.out) return;
    p.out = true; p.alive = false; p.down = false; p.paint = PAINT_MAX; p.channel = '';
    p.survived = Math.max(0, s.now - s.playStart);
    // what they carried drops where they stood (a supply pile)
    this.dropAll(p);
    const teams = this.teams();
    if (teams) {
      const standing = [...s.players.values()].some((q) => q.team === p.team && !q.out && !q.down && q.alive);
      if (!standing) {
        // the whole squad is out: anyone still down is out too, and the squad gets its placement
        for (const [qid, q] of s.players) if (q.team === p.team && q.down && !q.out) { q.out = true; q.alive = false; q.down = false; q.survived = Math.max(0, s.now - s.playStart); this.dropAll(q); this.room.broadcast('out', { id: qid, name: q.nickname }); }
        const place = this.groupsStanding().size + 1;
        for (const q of s.players.values()) if (q.team === p.team) q.placement = place;
      }
    } else {
      p.placement = this.groupsStanding().size + 1;
    }
    this.room.broadcast('out', { id, name: p.nickname, why, placement: p.placement });
    this.updateCounts();
  }

  dropAll(p) {
    const items = [];
    for (const b of [p.primary, p.secondary]) if (b) items.push([`blaster:${b}`, 1]);
    for (const [k, v] of p.ammo) if (v > 0) items.push([`ammo:${k}`, v]);
    for (const k of ['paintbomb', 'smoke', 'wipes', 'kit']) if (p[k] > 0) items.push([k, p[k]]);
    if (p.gearMask) items.push([`mask${p.gearMask}`, 1]);
    if (p.gearVest) items.push([`vest${p.gearVest}`, 1]);
    if (p.shield) items.push(['shield', p.shield]);
    if (p.scan) items.push(['scan', p.scan]);
    if (items.length) this.addCrate('pile', items, p.x, p.y, p.z);
    Object.assign(p, { shield: 0, scan: 0, primary: '', secondary: '', equip: '', paintbomb: 0, smoke: 0, wipes: 0, kit: 0, gearMask: 0, gearVest: 0, hopper0: 0, hopper1: 0 });
    p.ammo.clear(); this.mirror(p);
  }

  groupsStanding() {
    const out = new Set();
    for (const [id, p] of this.s.players) if (p.alive && !p.out) out.add(this.groupOf(p, id));
    return out;
  }
  updateCounts() {
    const s = this.s; let n = 0;
    for (const p of s.players.values()) if (p.alive && !p.out) n++;
    if (s.standing !== n) s.standing = n;
    const g = this.groupsStanding().size;
    if (s.groups !== g) s.groups = g;
  }

  checkEnd() {
    const s = this.s; const room = this.room;
    if (s.phase !== 'playing') return;
    const standing = this.groupsStanding();
    // the squad's last members may all be down: then they are out
    if (this.teams()) {
      for (const k of standing) {
        const t = Number(k.slice(1));
        if (![...s.players.values()].some((q) => q.team === t && q.alive && !q.out && !q.down)) {
          const first = [...s.players.entries()].find(([, q]) => q.team === t && q.down && !q.out);
          if (first) { this.eliminate(first[0], 'down'); return this.checkEnd(); }
        }
      }
    }
    const capped = s.now >= s.phaseEnds;
    if (standing.size > 1 && !capped) return;
    let winner = null;
    if (standing.size === 1) winner = [...standing][0];
    else if (standing.size > 1) {
      // time cap: the standing group with the most points wins (a tie is a draw)
      const pts = [...standing].map((k) => [k, [...s.players.entries()].filter(([id, q]) => this.groupOf(q, id) === k).reduce((a, [, q]) => a + q.score, 0)]).sort((a, b) => b[1] - a[1]);
      winner = pts.length > 1 && pts[0][1] === pts[1][1] ? null : pts[0][0];
    } else {
      // everyone went out on the same tick: the group placed 1 wins
      const first = [...s.players.entries()].find(([, q]) => q.placement === 1);
      winner = first ? this.groupOf(first[1], first[0]) : null;
    }
    // placements for those still standing: the winner 1st, then the rest in order of points
    const left = [...standing].filter((k) => k !== winner);
    let place = 1 + (winner ? 1 : 0);
    for (const [id, p] of s.players) {
      if (!p.out) p.survived = Math.max(0, s.now - s.playStart);
      if (winner && this.groupOf(p, id) === winner) p.placement = 1;
    }
    for (const k of left) { for (const [id, p] of s.players) if (this.groupOf(p, id) === k) p.placement = place; place++; }
    if (!winner && standing.size > 1) for (const [id, p] of s.players) if (standing.has(this.groupOf(p, id))) p.placement = 1;
    room.endRoyale(winner);
  }

  // ---------- supplies ----------
  crateInReach(id, p, cid) {
    const c = this.s.crates.get(typeof cid === 'string' ? cid : '');
    if (!c) { this.sendErr(id, 'gone', 'That crate is gone.'); return null; }
    if (Math.hypot(c.x - p.x, c.z - p.z) > ROYALE.pickRange || Math.abs(c.y - p.y) > ROYALE.pickRise) { this.sendErr(id, 'far', 'Too far away to reach that.'); return null; }
    if (this.geo.blocked({ x: p.x, y: p.y + 1.2, z: p.z }, { x: c.x, y: c.y + 0.35, z: c.z })) { this.sendErr(id, 'sight', 'You cannot reach that from here.'); return null; }
    return c;
  }
  canLoot(id, p) {
    const s = this.s;
    if (s.phase !== 'playing' && s.phase !== 'countdown') { this.sendErr(id, 'pick', 'Nothing to pick up right now.'); return false; }
    if (!p.alive || p.out || p.down) { this.sendErr(id, 'pick', 'You cannot pick things up now.'); return false; }
    return true;
  }
  // 'open' { id }: the crate opens for everyone (lid up); its contents are in the state
  open(id, p, msg) {
    if (!this.canLoot(id, p)) return;
    const c = this.crateInReach(id, p, msg.id); if (!c) return;
    c.opened = true;
    this.room.sendTo(id, 'opened', { id: msg.id });
  }
  // 'pick' { id: crate, item: uid (optional: the first item) }
  pick(id, p, msg) {
    const s = this.s;
    if (!this.canLoot(id, p)) return;
    const c = this.crateInReach(id, p, msg.id); if (!c) return;
    c.opened = true;
    const uid = typeof msg.item === 'string' ? msg.item : c.items.keys().next().value;
    const l = uid && c.items.get(uid);
    if (!l) return this.sendErr(id, 'gone', 'Someone else got there first.');
    const plan = pickupPlan(this.inv(p), l.item, l.n);
    if (!plan.take) return this.sendErr(id, plan.reason === 'have-better' ? 'have-better' : plan.reason === 'no-blaster' ? 'no-blaster' : 'full', plan.reason === 'have-better' ? 'Your gear is already as good or better.' : plan.reason === 'no-blaster' ? 'Find a paintball blaster first.' : 'No room for that.');
    const it = ITEMS[l.item]; const item = l.item;
    if (it.kind === 'blaster') {
      const e = EQUIPMENT_BY_ID[it.blaster];
      if (plan.slot === 0) { p.primary = e.id; p.hopper0 = e.magazine; } else { p.secondary = e.id; p.hopper1 = e.magazine; }
      if (plan.swap || p.slot === plan.slot || !p.equip) { p.slot = plan.slot; p.equip = e.id; p.reloadUntil = 0; p.switchUntil = s.now + e.cooldown; }
    } else if (it.kind === 'ammo') {
      p.ammo.set(it.blaster, (p.ammo.get(it.blaster) || 0) + plan.take);
    } else if (it.kind === 'refill') {
      p.ammo.set(plan.blaster, (p.ammo.get(plan.blaster) || 0) + plan.add);
    } else if (it.kind === 'throw' || it.kind === 'kit' || it.kind === 'gadget') {
      p[l.item] += plan.take;
    } else if (it.kind === 'gear') {
      if (it.slot === 'mask') p.gearMask = it.tier; else p.gearVest = it.tier;
    }
    if (plan.take < l.n && (it.kind === 'ammo' || it.kind === 'throw' || it.kind === 'kit' || it.kind === 'gadget')) l.n -= plan.take; else c.items.delete(uid);
    if (c.kind === 'pile' && c.items.size === 0) s.crates.delete(msg.id);
    for (const [di, dn] of plan.drop) this.addLoot(di, dn, p.x, p.y, p.z);
    p.supplies++;
    this.mirror(p);
    this.room.sendTo(id, 'picked', { item, n: plan.take, crate: msg.id });
  }

  drop(id, p, msg) {
    const s = this.s;
    if (!p.alive || p.out || !(s.phase === 'playing' || s.phase === 'countdown')) return;
    const w = String(msg.what || '');
    if (w === 'blaster') {
      const b = p.slot ? p.secondary : p.primary; if (!b) return;
      this.addLoot(`blaster:${b}`, 1, p.x, p.y, p.z);
      if (p.slot) { p.secondary = ''; p.hopper1 = 0; } else { p.primary = ''; p.hopper0 = 0; }
      const other = p.slot ? p.primary : p.secondary;
      if (other) { p.slot = p.slot ? 0 : 1; p.equip = other; } else p.equip = '';
      p.reloadUntil = 0;
    } else if (w.startsWith('ammo:')) {
      const k = w.slice(5); const n = p.ammo.get(k) || 0; if (!n) return;
      this.addLoot(w, n, p.x, p.y, p.z); p.ammo.set(k, 0);
    } else if (CARRY[w] && p[w] > 0) {
      p[w]--; this.addLoot(w, 1, p.x, p.y, p.z);
    } else return;
    this.mirror(p);
  }

  // 'throw' { kind: 'paintbomb' | 'smoke' }: along your aim, lofted
  throw(id, p, msg) {
    const s = this.s; const sim = this.room.sim.get(id);
    const k = THROWS.has(msg.kind) ? msg.kind : 'paintbomb';
    if (s.phase !== 'playing' || !p.alive || p.out || p.down || p[k] <= 0) return;
    if (s.now < p.protectedUntil || s.now < (sim.nextThrow || 0)) return;
    sim.nextThrow = s.now + 0.8;
    p[k]--; p.channel = '';
    const v = throwVelocity(p.yaw, p.pitch);
    const b = { id: ++this.room.pid, owner: id, team: p.team, kind: k, x: p.x, y: p.y + MOVE.eye - 0.15, z: p.z, ...v, rest: false, bounces: 0, fuse: s.now + (k === 'smoke' ? SMOKE.fuse : BOMB.fuse) };
    this.bombs.push(b);
    this.room.broadcast('bomb', { i: b.id, o: id, k, x: r3(b.x), y: r3(b.y), z: r3(b.z), vx: r3(b.vx), vy: r3(b.vy), vz: r3(b.vz), f: k === 'smoke' ? SMOKE.fuse : BOMB.fuse });
  }

  flyBombs(dt) {
    const s = this.s; const keep = [];
    for (const b of this.bombs) {
      stepBomb(b, dt, CAMPUS);
      if (s.now >= b.fuse) this.burst(b); else keep.push(b);
    }
    this.bombs = keep;
  }

  burst(b) {
    const s = this.s; const room = this.room; const teams = this.teams();
    room.broadcast('boom', { i: b.id, k: b.kind, o: b.owner, x: r3(b.x), y: r3(b.y), z: r3(b.z) });
    if (b.kind === 'smoke') return;
    const from = { x: b.x, y: b.y + 0.25, z: b.z };
    for (const [id, p] of s.players) {
      if (id === b.owner || !p.alive || p.out) continue;
      if (teams && p.team === b.team) continue;
      const c = { x: p.x, y: p.y + 0.9, z: p.z };
      const d = Math.max(0, Math.hypot(c.x - from.x, c.y - from.y, c.z - from.z) - BODY.radius);
      const amount = bombPaint(d);
      if (amount <= 0) continue;
      if (this.geo.blocked(from, c)) continue; // a wall between the burst and them
      room.paint(id, b.owner, amount, false, { id: 'paintbomb', colour: '#ff3d7f' }, true);
    }
  }

  // ---------- cleaning ----------
  use(id, p, msg) {
    const s = this.s;
    if (msg.kind === 'shield' || msg.kind === 'scan') return this.gadget(id, p, msg.kind);
    const k = msg.kind === 'kit' ? 'kit' : 'wipes';
    if (s.phase !== 'playing' || !p.alive || p.out || p.down || p.channel || p[k] <= 0) return;
    if (p.paint <= 0) return this.sendErr(id, 'clean', 'You are already clean.');
    p.channel = k; p.channelUntil = s.now + KITS[k].time;
  }
  // paint shield (a bubble no paint gets through) and paint-scan pulse (opponents nearby, to you only)
  gadget(id, p, k) {
    const s = this.s;
    if (s.phase !== 'playing' || !p.alive || p.out || p.down || p[k] <= 0) return;
    p[k]--;
    if (k === 'shield') { p.shieldUntil = s.now + SHIELD.time; p.channel = ''; this.room.broadcast('shield', { id, until: p.shieldUntil }); return; }
    const seen = [];
    for (const [qid, q] of s.players) {
      if (qid === id || !q.alive || q.out || (this.teams() && q.team === p.team)) continue;
      if (Math.hypot(q.x - p.x, q.z - p.z) <= SCAN.radius) seen.push({ id: qid, x: Math.round(q.x * 10) / 10, z: Math.round(q.z * 10) / 10 });
    }
    this.room.sendTo(id, 'scan', { until: s.now + SCAN.time, seen });
  }
  revive(id, p, msg) {
    const s = this.s; const t = s.players.get(msg.id);
    if (s.phase !== 'playing' || !p.alive || p.out || p.down || p.channel) return;
    if (!t || !t.down || t.out || t.team !== p.team || !this.teams()) return this.sendErr(id, 'revive', 'Only a fully painted squadmate can be cleaned off.');
    if (Math.hypot(t.x - p.x, t.z - p.z) > ROYALE.reviveRange) return this.sendErr(id, 'far', 'Get closer to clean them off.');
    this.room.sim.get(id).reviveTarget = msg.id;
    p.channel = 'revive'; p.channelUntil = s.now + this.room.timing.revive;
  }
  cancel(p) { if (p.channel) p.channel = ''; }
  finishChannel(id, p) {
    const k = p.channel; p.channel = '';
    if (k === 'revive') {
      const tid = this.room.sim.get(id)?.reviveTarget; const t = this.s.players.get(tid);
      if (t && t.down && !t.out) { t.down = false; t.paint = ROYALE.revivePaint; this.room.broadcast('revived', { id: tid, by: id, name: t.nickname, byName: p.nickname }); }
      return;
    }
    if (p[k] <= 0) return;
    p[k]--; p.paint = Math.max(0, p.paint - KITS[k].paint);
    this.room.sim.get(id)?.painters.clear();
  }

  spectate(id, p, msg) {
    const t = this.s.players.get(msg.id);
    if (!p.out || !t || t.out) return;
    p.watching = msg.id;
  }

  // paint after gear; a downed player is finished by any opponent's paint
  gear(t, amount, precision) { return gearPaint(amount, t, { head: !!precision }); }
}

export { PACK };
