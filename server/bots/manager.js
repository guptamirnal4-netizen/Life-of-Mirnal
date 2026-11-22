// The bots of one paintball room. Each tick (before the room moves anyone) every bot's Brain thinks (5–10 Hz,
// staggered), steers and sends its inputs through the room's own 'in' handler, exactly as a browser's inputs
// arrive; its discrete actions (land, open, pick, throw, use, revive) go through the same handlers too. What a bot
// may know is decided here: its view (line-of-sight rays against the arena, a capped number per tick), the public
// room state (zone, crates, the supply drop) and the messages the room sends it.
//
// Server load (Render's free instance has very little CPU): thinking is time-sliced, rays and path searches have a
// budget per tick, paths are cached, and the room measures its own tick time.
import { MOVE } from '../../js/paintball/rules.js';
import { INPUT_DT, blocked } from '../../js/paintball/sim.js';
import { BOT_LEVELS_BY_ID, DEFAULT_BOT_LEVEL } from '../../js/paintball/bots.js';
import { rng } from '../logic/match.js';
import { Brain, pickLanding } from './brain.js';
import { loadNav, FieldNav } from './nav.js';

const ACTIVE = new Set(['landing', 'countdown', 'playing', 'overtime']);
export const BUDGET = { rays: 32, expansions: 6000, thinks: 8 }; // per room per tick
const fieldNavs = new Map();

// Can a body walk straight from `from` ({ x, y, z }) to the point [x, z, y] on the campus? The nav builder's rule:
// 0.25 m steps, floors followed, a body a little wider than a player's must not touch anything solid.
export function walkLine(geo, from, pt) {
  const L = Math.hypot(pt[0] - from.x, pt[1] - from.z); const n = Math.max(1, Math.ceil(L / 0.25));
  if (n > 200) return false;
  let y = from.y;
  for (let i = 1; i <= n; i++) {
    const x = from.x + ((pt[0] - from.x) * i) / n; const z = from.z + ((pt[1] - from.z) * i) / n;
    y = geo.floorAt(x, z, y);
    if (geo.blockedAt(x, z, y, 0.36)) return false;
  }
  return Math.abs(y - pt[2]) < 0.4;
}
const CACHE = 300;

export class BotManager {
  constructor(room) {
    this.room = room;
    this.brains = new Map();
    this.searches = [];
    this.cache = new Map();
    this.seed = 1;
    this.totals = { rays: 0, raysDenied: 0, expansions: 0, searches: 0, cacheHits: 0, noises: 0 };
    this.lastPos = new Map(); this.speeds = new Map(); this.lastNoise = new Map();
  }
  get size() { return this.brains.size; }
  has(id) { return this.brains.has(id); }
  get arena() { return this.room.arena; }
  get graph() { return this.arena.geo ? loadNav({ geoHash: this.arena.geo.hash }).graph : null; }
  get field() { const a = this.arena; if (!fieldNavs.has(a.id)) fieldNavs.set(a.id, new FieldNav(a)); return fieldNavs.get(a.id); }

  add(id, levelId, seed) { this.brains.set(id, new Brain(id, BOT_LEVELS_BY_ID[levelId] || BOT_LEVELS_BY_ID[DEFAULT_BOT_LEVEL], rng(seed))); }
  remove(id) { this.brains.delete(id); this.searches = this.searches.filter((q) => q.brain.id !== id); }
  setLevel(levelId) { const L = BOT_LEVELS_BY_ID[levelId]; if (L) for (const b of this.brains.values()) b.setLevel(L); }
  message(id, type, msg) { this.brains.get(id)?.onMessage(type, msg, this.room.state.now); }
  resetAll() { for (const b of this.brains.values()) { const st = b.stats; b.reset(); b.stats = st; } this.searches.length = 0; this.cache.clear(); }
  clear() { this.brains.clear(); this.searches.length = 0; this.cache.clear(); }

  // Something everyone nearby can hear (paintballs fired, a paint bomb bursting, a crate opening): bots within
  // `radius` (not the source, not its teammates) get a rough position to investigate, rougher further away.
  noise(x, y, z, src, radius) {
    const s = this.room.state; if (!this.brains.size) return;
    const k = `${src}`; const last = this.lastNoise.get(k) || -9;
    if (s.now - last < 0.4) return;
    this.lastNoise.set(k, s.now); this.totals.noises++;
    const from = s.players.get(src); const teams = this.room.teams();
    for (const [id, b] of this.brains) {
      if (id === src) continue;
      const q = s.players.get(id); if (!q || !q.alive || q.out || (teams && from && from.team === q.team)) continue;
      const d = Math.hypot(q.x - x, q.z - z); if (d > radius) continue;
      const j = 2 + d * 0.1;
      b.hear(x + (b.rand() - 0.5) * 2 * j, y, z + (b.rand() - 0.5) * 2 * j, s.now);
    }
  }

  tick(dt) {
    const room = this.room; const s = room.state;
    if (!this.brains.size || !ACTIVE.has(s.phase)) return;
    // how fast everyone moves (running feet are heard further)
    for (const [id, q] of s.players) { const l = this.lastPos.get(id); if (l) this.speeds.set(id, Math.hypot(q.x - l.x, q.z - l.z) / Math.max(dt, 1e-3)); this.lastPos.set(id, { x: q.x, z: q.z }); }
    this.rays = this.arena.geo ? BUDGET.rays : BUDGET.rays * 3;
    this.runSearches();
    let thinks = 0;
    for (const [id, b] of this.brains) {
      const p = s.players.get(id);
      if (!p || !room.sim.get(id)) continue;
      const c = this.ctx(id, b, p);
      if (s.phase === 'landing') this.landing(c, b);
      if (s.now >= b.nextThink && thinks < BUDGET.thinks) {
        thinks++;
        b.think(c);
        b.nextThink = s.now + (0.9 + 0.2 * b.rand()) / b.level.think;
      }
      const intent = b.control(c, dt);
      b.acc += dt;
      const list = [];
      while (b.acc >= INPUT_DT - 1e-9) { b.acc -= INPUT_DT; list.push({ ...intent, seq: ++b.seq }); intent.jump = false; intent.reload = false; }
      if (list.length) room.dispatch(id, 'in', list);
    }
  }

  // Campus Royale: bots pick landing spots (spread out; a squad with a human leaves the pick to them)
  landing(c, b) {
    const s = this.room.state; const p = c.p;
    if (b.landed) return;
    if (b.landAt === null) b.landAt = s.now + Math.min(2, Math.max(0, s.phaseEnds - s.now) * 0.3) * b.rand();
    if (s.now < b.landAt) return;
    b.landed = true;
    const drops = this.room.royale.landingDrops();
    if (c.teams) {
      const mates = [...s.players.entries()].filter(([, q]) => q.team === p.team);
      if (mates.some(([, q]) => !q.bot) || mates.find(([, q]) => q.bot)?.[0] !== b.id) return;
    }
    const taken = [];
    const all = this.room.royale.spots.drops; // q.drop is a campus-wide drop id, not an index into `drops`
    for (const q of s.players.values()) if (q !== p && q.drop >= 0 && all[q.drop]) taken.push(all[q.drop]);
    const d = pickLanding(drops, taken, b.rand);
    if (d) c.dispatch('land', { id: d.id });
  }

  // ---------- what a bot can ask about the world ----------
  ctx(id, b, p) {
    const room = this.room; const s = room.state; const M = this;
    const teams = room.teams();
    return {
      id, p, s, now: s.now, L: b.level, royale: !!this.arena.royale, teams,
      player: (pid) => s.players.get(pid),
      speed: (pid) => M.speeds.get(pid) || 0,
      *opponents() { for (const [qid, q] of s.players) if (qid !== id && q.alive && !q.out && !(teams && q.team === p.team)) yield [qid, q]; },
      nearestMate() { let best = null; let bd = Infinity; for (const [qid, q] of s.players) if (qid !== id && teams && q.team === p.team && q.alive && !q.out && !q.down) { const d = Math.hypot(q.x - p.x, q.z - p.z); if (d < bd) { bd = d; best = { id: qid, p: q }; } } return best; },
      leader() {
        const mates = room.joinOrder.filter((qid) => { const q = s.players.get(qid); return q && q.team === p.team && q.alive && !q.out && !q.down; });
        const lead = mates.find((qid) => !s.players.get(qid).bot) || mates[0];
        return lead ? { id: lead, p: s.players.get(lead) } : null;
      },
      los: (a, t) => M.los(a, t),
      walkable: (from, pt) => M.walkable(from, pt),
      coverFrom: (threat) => M.coverFrom(p, threat),
      roamPoint: (brain) => M.roamPoint(p, brain),
      requestPath: (brain) => M.requestPath(brain, p),
      dispatch: (type, msg) => room.dispatch(id, type, msg),
    };
  }

  // Line of sight a → t against the arena, or null when this tick's ray budget is spent.
  los(a, t) {
    if (this.rays <= 0) { this.totals.raysDenied++; return null; }
    this.rays--; this.totals.rays++;
    return !blocked(a, t, this.arena);
  }

  // Can a body walk straight from `from` to the point [x, z, y]? (the nav builder's rule)
  walkable(from, pt) { return this.arena.geo ? walkLine(this.arena.geo, from, pt) : this.field.clear(from.x, from.z, pt[0], pt[1]); }

  // A spot out of the threat's sight, close by: behind a bunker (Med-C) or a campus wall / tree.
  coverFrom(p, threat) {
    const eye = { x: threat.x, y: threat.y + MOVE.eye, z: threat.z };
    if (!this.arena.geo) {
      const F = this.field; let best = null; let bd = 16;
      for (const s of this.arena.solids) {
        const cx = s.kind === 'cyl' ? s.x : (s.minX + s.maxX) / 2; const cz = s.kind === 'cyl' ? s.z : (s.minZ + s.maxZ) / 2;
        const half = s.kind === 'cyl' ? s.r : Math.max(s.maxX - s.minX, s.maxZ - s.minZ) / 2;
        const dx = cx - threat.x; const dz = cz - threat.z; const l = Math.hypot(dx, dz) || 1;
        const x = cx + (dx / l) * (half + 0.9); const z = cz + (dz / l) * (half + 0.9);
        const d = Math.hypot(x - p.x, z - p.z);
        if (d >= bd || !F.free(x, z) || s.h < 1.2) continue;
        if (!blocked(eye, { x, y: 1.0, z }, this.arena)) continue;
        bd = d; best = { x, z, y: 0 };
      }
      return best;
    }
    const g = this.graph;
    const cands = g.near(p.x, p.z, p.y, 14, 3, 16).filter(([i]) => Math.hypot(g.x[i] - threat.x, g.z[i] - threat.z) > Math.hypot(p.x - threat.x, p.z - threat.z) - 4);
    for (const [i] of cands.slice(0, 4)) {
      const vis = this.los(eye, { x: g.x[i], y: g.y[i] + 1.0, z: g.z[i] });
      if (vis === null) return null;
      if (!vis) return { x: g.x[i], z: g.z[i], y: g.y[i] };
    }
    return null;
  }

  // Somewhere to wander: Med-C anywhere on the field; the campus a node 30–80 m away, towards the middle of the next
  // circle (where everyone ends up), so bots drift together long before the zone forces them.
  roamPoint(p, b) {
    const r = b.rand;
    if (!this.arena.geo) {
      const B = this.arena.bounds; const F = this.field;
      for (let k = 0; k < 12; k++) {
        const x = B.minX + 4 + r() * (B.maxX - B.minX - 8); const z = B.minZ + 3 + r() * (B.maxZ - B.minZ - 6);
        if (F.free(x, z)) return { x, z, y: 0 };
      }
      return { x: this.arena.centre.x, z: this.arena.centre.z, y: 0 };
    }
    const Z = this.room.state.zone; const g = this.graph;
    const cx = Z.nr > 0 ? Z.nx : Z.r ? Z.x : this.arena.centre.x; const cz = Z.nr > 0 ? Z.nz : Z.r ? Z.z : this.arena.centre.z;
    const toC = Math.atan2(cz - p.z, cx - p.x); const far = Math.hypot(cx - p.x, cz - p.z);
    for (let k = 0; k < 6; k++) {
      const a = toC + (r() - 0.5) * (k < 3 ? (far > 60 ? 1.2 : 3) : 6); const d = Math.min(far > 20 ? far : 40, 30 + r() * 50);
      let x = p.x + Math.cos(a) * d; let z = p.z + Math.sin(a) * d;
      if (Z.r && Math.hypot(x - Z.x, z - Z.z) > Z.r * 0.8) { x = (x + Z.x) / 2; z = (z + Z.z) / 2; }
      const n = g.near(x, z, p.y, 20, 30, 1)[0];
      if (n) return { x: g.x[n[0]], z: g.z[n[0]], y: g.y[n[0]] };
    }
    return null;
  }

  // ---------- paths ----------
  requestPath(brain, p) {
    const goal = brain.goal; if (!goal) return;
    if (!this.arena.geo) { brain.setPath(this.field.path(p.x, p.z, goal.x, goal.z)); return; }
    const g = this.graph;
    const startC = g.near(p.x, p.z, p.y, 12, 2.5, 6);
    let a = startC.slice(0, 3).find(([i]) => this.walkable(p, g.node(i)))?.[0] ?? startC[0]?.[0];
    if (a === undefined) a = g.near(p.x, p.z, p.y, 40, 6, 1)[0]?.[0];
    let b;
    for (const R of [15, 40, 120]) {
      const cs = g.near(goal.x, goal.z, goal.y ?? p.y, R, R > 15 ? 30 : 3, 6);
      if (!cs.length) continue;
      b = R === 15 ? (cs.slice(0, 3).find(([i]) => this.walkable({ x: g.x[i], z: g.z[i], y: g.y[i] }, [goal.x, goal.z, goal.y ?? g.y[i]]))?.[0] ?? cs[0][0]) : cs[0][0];
      break;
    }
    if (a === undefined || b === undefined) { brain.goal = null; brain.pathPending = false; return; }
    const end = [goal.x, goal.z, goal.y ?? g.y[b]];
    if (a === b) { brain.setPath([g.node(a), end]); return; }
    const key = `${a}>${b}`;
    const hit = this.cache.get(key);
    if (hit) { this.cache.delete(key); this.cache.set(key, hit); this.totals.cacheHits++; brain.setPath([g.node(a), ...hit, end]); return; }
    this.searches = this.searches.filter((q) => q.brain !== brain);
    brain.pathPending = true; brain.path = null;
    this.searches.push({ brain, a, b, key, end, goal, search: null });
  }

  runSearches() {
    const g = this.searches.length ? this.graph : null;
    let budget = BUDGET.expansions;
    while (this.searches.length && budget > 0) {
      const q = this.searches[0];
      if (!q.search) { q.search = g.search(q.a, q.b); this.totals.searches++; }
      const before = q.search.expanded;
      const r = q.search.step(budget);
      const used = Math.max(1, q.search.expanded - before); budget -= used; this.totals.expansions += used;
      if (r === null) break;
      this.searches.shift();
      if (q.brain.goal !== q.goal) continue; // the bot changed its mind meanwhile
      if (!r.length) { q.brain.pathPending = false; q.brain.goal = null; continue; }
      this.cache.set(q.key, r);
      if (this.cache.size > CACHE) this.cache.delete(this.cache.keys().next().value);
      q.brain.setPath([g.node(q.a), ...r, q.end]);
    }
  }

  stats() {
    const per = [...this.brains.values()].map((b) => ({ id: b.id, level: b.level.id, mode: b.mode, ...b.stats }));
    return { bots: this.brains.size, ...this.totals, per };
  }
}
