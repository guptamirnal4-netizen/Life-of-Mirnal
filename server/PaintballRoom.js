// The paintball room: a private room joined by a short code, server-authoritative paintball match at TICK_HZ.
// Clients send inputs only (movement intent, aim, trigger, reload, switch); the server moves everyone, fires,
// flies and sweeps the paintballs, applies paint, tags, assists, scores and runs the match clock.
import crypto from 'node:crypto';
import { Room, CloseCode } from '@colyseus/core';
import { PbState, PbPlayer, PbRank, PbTeamResult } from './schema.js';
import { EQUIPMENT_BY_ID, PAINT_MAX, LOADOUT_SIZE } from '../js/paintball/equipment.js';
import { MODES_BY_ID, MAX_PLAYERS, SCORE, ASSIST_WINDOW, TIMING, TICK_HZ, MOVE } from '../js/paintball/rules.js';
import { ARENAS_BY_ID, validateSpawns, spawnSet } from '../js/paintball/arena.js';
import { INPUT_DT, sanitizeInput, stepMove, aimDir, sweepArena, segPlayer, blocked, BODY } from '../js/paintball/sim.js';
import { cleanLook } from '../js/paintball/looks.js';
import { sameChannel } from '../js/paintball/channels.js';
import { rng, makeCode, cleanNick, assignTeams, smallestTeam, canStart, slotsFor, pickSpawn, standings, timeUp, overtimeCheck, finalise } from './logic/match.js';

export const CLOSE_BY_HOST = 4101;
export const CLOSE_IDLE = 4102;
const codes = new Set(); // codes of open rooms (unique per server process)
export const liveRooms = new Set(); // for tests: rooms not yet disposed
const ACTIVE = new Set(['countdown', 'playing', 'overtime']);
const RTC_KINDS = new Set(['offer', 'answer', 'ice', 'bye']);

export class PaintballRoom extends Room {
  static test = false; // server started with the test flag (tests/mp): allows short durations and test helpers

  onCreate(options = {}) {
    const test = this.constructor.test;
    const arena = ARENAS_BY_ID[options.arena] || ARENAS_BY_ID.medc;
    const problems = validateSpawns(arena);
    if (problems.length) throw new Error(`Arena ${arena.id} has an invalid spawn registry: ${problems.join('; ')}`);
    this.arena = arena;
    this.maxClients = MAX_PLAYERS;
    this.autoDispose = true;
    this.rand = rng(crypto.randomBytes(4).readUInt32LE(0));
    this.roomId = makeCode(this.rand, codes);
    codes.add(this.roomId);
    liveRooms.add(this);
    this.setPrivate(true); // never listed; joined only by code
    const o = test && options.test ? options.test : {};
    const num = (v, d) => (Number.isFinite(v) && v >= 0 ? v : d);
    this.timing = {
      countdown: num(o.countdown, TIMING.countdown), respawn: num(o.respawn, TIMING.respawn), protection: num(o.protection, TIMING.protection),
      overtime: num(o.overtime, TIMING.overtime), reconnect: num(o.reconnect, TIMING.reconnect), idle: num(o.idle, TIMING.roomIdleClose),
    };
    this.state = new PbState();
    const s = this.state;
    s.code = this.roomId; s.arena = arena.id; s.duration = TIMING.duration; s.testMode = test; s.slotsOpen = MAX_PLAYERS;
    this.sim = new Map(); // sessionId → server-only data (input queue, fire timers, painters)
    this.joinOrder = [];
    this.projectiles = [];
    this.pid = 0;
    this.lastActivity = 0;
    this.rtcCount = new Map();

    const on = (type, fn) => this.onMessage(type, (client, msg) => { this.lastActivity = s.now; const p = s.players.get(client.sessionId); if (p) fn(client, p, msg ?? {}); });
    const hostOnly = (fn) => (client, p, msg) => (p.host ? fn(client, p, msg) : client.send('error', { code: 'host-only', message: 'Only the host can do that.' }));
    const lobby = (fn) => (client, p, msg) => (s.phase === 'lobby' ? fn(client, p, msg) : client.send('error', { code: 'not-lobby', message: 'That can only be changed in the lobby.' }));

    on('in', (client, p, msg) => {
      const list = Array.isArray(msg) ? msg : [msg];
      const q = this.sim.get(client.sessionId).queue;
      for (const raw of list.slice(0, 30)) { const i = sanitizeInput(raw); if (i.seq > p.seq && (!q.length || i.seq > q[q.length - 1].seq)) q.push(i); }
      if (q.length > 60) q.splice(0, q.length - 60);
    });
    on('ready', lobby((client, p, msg) => { p.ready = !!msg.ready; }));
    on('custom', (client, p, msg) => {
      if (ACTIVE.has(s.phase)) return client.send('error', { code: 'in-match', message: 'Change your look between paintball matches.' });
      Object.assign(p, cleanLook(msg, p));
    });
    on('loadout', lobby((client, p, msg) => {
      const a = EQUIPMENT_BY_ID[msg.primary] ? msg.primary : p.primary; const b = EQUIPMENT_BY_ID[msg.secondary] ? msg.secondary : p.secondary;
      if (a === b) return client.send('error', { code: 'loadout', message: `Pick ${LOADOUT_SIZE} different paintball blasters.` });
      p.primary = a; p.secondary = b; p.equip = p.slot ? b : a;
    }));
    on('config', hostOnly(lobby((client, p, msg) => {
      if (msg.mode !== undefined && MODES_BY_ID[msg.mode] && msg.mode !== s.mode) {
        const was = MODES_BY_ID[s.mode].teams; s.mode = msg.mode;
        if (MODES_BY_ID[s.mode].teams !== was) this.randomiseTeams();
      }
      if (msg.arena !== undefined && ARENAS_BY_ID[msg.arena]) { this.arena = ARENAS_BY_ID[msg.arena]; s.arena = msg.arena; }
      if (msg.duration !== undefined) {
        const d = Math.floor(Number(msg.duration));
        if (TIMING.durations.includes(d) || (s.testMode && d >= 1 && d <= 600)) s.duration = d;
        else client.send('error', { code: 'duration', message: 'That match length is not available.' });
      }
      this.updateSlots();
    })));
    on('randomise', hostOnly(lobby(() => this.randomiseTeams())));
    on('start', hostOnly(lobby((client) => {
      const check = canStart(s.mode, [...s.players.values()]);
      if (!check.ok) return client.send('error', { code: 'cannot-start', message: check.reason });
      this.startMatch();
    })));
    on('rematch', hostOnly((client) => { if (s.phase === 'results') this.startMatch(); }));
    on('lobby', hostOnly(() => { if (s.phase === 'results') this.toLobby(); }));
    on('close', hostOnly(() => this.closeRoom()));
    // voice chat: on/off, talking indicator, and WebRTC signalling relayed only inside a voice channel
    on('voice', (client, p, msg) => { p.voice = !!msg.on; if (!p.voice) p.talking = false; });
    on('talk', (client, p, msg) => { p.talking = p.voice && !!msg.on; });
    on('rtc', (client, p, msg) => {
      const n = (this.rtcCount.get(client.sessionId) || 0) + 1; this.rtcCount.set(client.sessionId, n);
      if (n > 200) return; // per second, reset each second
      const to = typeof msg.to === 'string' ? s.players.get(msg.to) : null;
      if (!to || !p.voice || !to.voice || !RTC_KINDS.has(msg.kind)) return;
      if (!sameChannel(p, to, { phase: s.phase, teams: MODES_BY_ID[s.mode].teams })) return;
      const data = msg.data ?? null;
      if (JSON.stringify(data ?? '').length > 16000) return;
      const target = this.clients.find((c) => c.sessionId === msg.to);
      target?.send('rtc', { from: client.sessionId, kind: msg.kind, data });
    });
    // A client claiming a hit is ignored on purpose: only the server's own paintball sweeps paint anyone.
    on('hit', () => {});
    if (test) {
      on('test:place', (client, p, msg) => {
        if (Number.isFinite(msg.x)) p.x = msg.x; if (Number.isFinite(msg.z)) p.z = msg.z; p.y = 0; p.vy = 0;
        if (Number.isFinite(msg.yaw)) p.yaw = msg.yaw; if (Number.isFinite(msg.pitch)) p.pitch = msg.pitch;
        if (msg.unprotect) p.protectedUntil = 0;
      });
    }
    this.onMessage('*', () => {}); // unknown message types are ignored (not a disconnect)

    this.setPatchRate(1000 / TICK_HZ);
    this.setSimulationInterval((ms) => this.tick(ms / 1000), 1000 / TICK_HZ);
    this.clock.setInterval(() => this.rtcCount.clear(), 1000);
  }

  // ---------- joining, leaving, reconnecting ----------
  onJoin(client, options = {}) {
    const s = this.state;
    const p = new PbPlayer();
    p.nickname = cleanNick(options.nickname, [...s.players.values()].map((q) => q.nickname));
    Object.assign(p, cleanLook(options.look || {}, p));
    const lo = options.loadout;
    if (Array.isArray(lo) && EQUIPMENT_BY_ID[lo[0]] && EQUIPMENT_BY_ID[lo[1]] && lo[0] !== lo[1]) { p.primary = lo[0]; p.secondary = lo[1]; }
    p.equip = p.primary;
    p.host = s.players.size === 0;
    const teams = MODES_BY_ID[s.mode].teams;
    if (teams) p.team = smallestTeam([...s.players.values()].map((q) => q.team), teams);
    p.alive = false;
    s.players.set(client.sessionId, p);
    this.sim.set(client.sessionId, this.newSim());
    this.joinOrder.push(client.sessionId);
    this.lastActivity = s.now;
    this.updateSlots();
  }

  newSim() { return { queue: [], budget: 0, trigger: false, nextFire: 0, burstLeft: 0, nextBurst: 0, reloadWanted: false, painters: new Map(), used: new Set() }; }

  onDrop(client) {
    const p = this.state.players.get(client.sessionId);
    if (!p) return;
    p.connected = false; p.ready = false; p.talking = false;
    const q = this.sim.get(client.sessionId); if (q) { q.queue.length = 0; q.trigger = false; }
    if (p.host) this.passHost(client.sessionId);
    this.allowReconnection(client, this.timing.reconnect);
  }

  onReconnect(client) {
    const p = this.state.players.get(client.sessionId);
    if (p) p.connected = true;
    this.lastActivity = this.state.now;
  }

  onLeave(client) {
    const s = this.state;
    const p = s.players.get(client.sessionId);
    if (!p) return;
    const wasHost = p.host;
    s.players.delete(client.sessionId);
    this.sim.delete(client.sessionId);
    this.joinOrder = this.joinOrder.filter((id) => id !== client.sessionId);
    if (wasHost) this.passHost(client.sessionId);
    this.updateSlots();
  }

  passHost(fromId) {
    const s = this.state;
    const next = this.joinOrder.find((id) => id !== fromId && s.players.get(id)?.connected);
    if (!next) return;
    for (const [id, q] of s.players) q.host = id === next;
    this.broadcast('host', { id: next, name: s.players.get(next).nickname });
  }

  updateSlots() { this.state.slotsOpen = slotsFor(this.state.mode, this.state.players.size); }

  randomiseTeams() {
    const s = this.state;
    if (s.teamsLocked) return;
    const teams = MODES_BY_ID[s.mode].teams;
    const map = assignTeams(this.joinOrder.filter((id) => s.players.has(id)), teams, this.rand);
    for (const [id, t] of map) s.players.get(id).team = t;
  }

  closeRoom() {
    this.broadcast('closed', { reason: 'The host closed the room.' });
    this.disconnect(CLOSE_BY_HOST);
  }

  onDispose() {
    codes.delete(this.roomId);
    liveRooms.delete(this);
    this.projectiles.length = 0;
    this.sim.clear();
  }

  // ---------- match flow ----------
  startMatch() {
    const s = this.state;
    const mode = MODES_BY_ID[s.mode];
    s.teamsLocked = !!mode.teams;
    s.results.ready = false; s.results.rankings.clear(); s.results.teams.clear();
    s.results.winner = ''; s.results.runnerUp = ''; s.results.mvp = ''; s.results.mvpName = ''; s.results.draw = false;
    s.teamScores.clear();
    for (let t = 0; t < mode.teams; t++) s.teamScores.push(0);
    this.projectiles.length = 0;
    const reserved = new Set();
    for (const id of this.joinOrder) {
      const p = s.players.get(id); if (!p) continue;
      Object.assign(p, { score: 0, tags: 0, assists: 0, timesTagged: 0, used: '', ready: false });
      const sim = this.sim.get(id); Object.assign(sim, this.newSim());
      this.spawn(id, p, reserved);
      p.protectedUntil = s.now + this.timing.countdown + this.timing.protection;
    }
    s.phase = 'countdown';
    s.phaseEnds = s.now + this.timing.countdown;
    this.lock();
  }

  toLobby() {
    const s = this.state;
    s.phase = 'lobby'; s.teamsLocked = false; s.phaseEnds = 0;
    for (const p of s.players.values()) { p.ready = false; p.alive = false; }
    this.projectiles.length = 0;
    this.unlock();
    this.updateSlots();
  }

  spawn(id, p, reserved = new Set()) {
    const s = this.state;
    const teams = MODES_BY_ID[s.mode].teams;
    const others = [];
    for (const [oid, o] of s.players) if (oid !== id && o.alive) others.push({ x: o.x, z: o.z, team: o.team, alive: true });
    const spot = pickSpawn(spawnSet(this.arena, teams), { team: p.team, others, reserved, teams });
    reserved.add(spot.id);
    p.x = spot.x; p.z = spot.z; p.y = 0; p.vy = 0;
    p.yaw = Math.atan2(-spot.face[0], -spot.face[1]); p.pitch = 0;
    p.alive = true; p.paint = 0; p.respawnAt = 0;
    p.protectedUntil = s.now + this.timing.protection;
    p.slot = 0; p.equip = p.primary; p.reloadUntil = 0; p.switchUntil = 0;
    const a = EQUIPMENT_BY_ID[p.primary]; const b = EQUIPMENT_BY_ID[p.secondary];
    p.hopper0 = a.magazine; p.carried0 = a.total - a.magazine; p.hopper1 = b.magazine; p.carried1 = b.total - b.magazine;
    const sim = this.sim.get(id);
    if (sim) { sim.burstLeft = 0; sim.painters.clear(); sim.trigger = false; }
    return spot;
  }

  endMatch(result) {
    const s = this.state;
    this.projectiles.length = 0;
    const list = [...s.players.entries()].map(([id, p]) => ({ id, nickname: p.nickname, team: p.team, score: p.score, tags: p.tags, assists: p.assists, timesTagged: p.timesTagged, connected: p.connected }));
    const r = finalise(s.mode, list, result.result === 'win' ? { winner: result.winner } : { draw: true });
    for (const q of list) s.players.get(q.id).score = q.score;
    const R = s.results;
    R.draw = r.draw; R.winner = r.winner || ''; R.runnerUp = r.runnerUp || ''; R.mvp = r.mvp || ''; R.mvpName = r.mvpName || '';
    R.rankings.clear(); R.teams.clear();
    for (const k of r.rankings) R.rankings.push(Object.assign(new PbRank(), k));
    for (const k of r.teams) R.teams.push(Object.assign(new PbTeamResult(), k));
    R.ready = true;
    for (const [id, p] of s.players) { p.used = [...(this.sim.get(id)?.used || [])].join(','); p.ready = false; }
    s.phase = 'results';
    s.phaseEnds = 0;
    this.updateTeamScores();
    this.broadcast('ended', { draw: r.draw, winner: r.winner });
  }

  plainPlayers() { return [...this.state.players.entries()].map(([id, p]) => ({ id, nickname: p.nickname, team: p.team, score: p.score, tags: p.tags })); }

  updateTeamScores() {
    const s = this.state;
    const teams = MODES_BY_ID[s.mode].teams;
    for (let t = 0; t < teams; t++) {
      let sum = 0; for (const p of s.players.values()) if (p.team === t) sum += p.score;
      if (s.teamScores[t] !== sum) s.teamScores[t] = sum;
    }
  }

  // ---------- the simulation tick ----------
  tick(dt) {
    const s = this.state;
    s.now += dt;
    if (s.now - this.lastActivity > this.timing.idle) {
      this.broadcast('closed', { reason: 'The room was idle and has closed.' });
      this.disconnect(CLOSE_IDLE);
      return;
    }
    if (s.phase === 'countdown' && s.now >= s.phaseEnds) { s.phase = 'playing'; s.phaseEnds = s.now + s.duration; }
    const active = ACTIVE.has(s.phase);
    const live = s.phase === 'playing' || s.phase === 'overtime';
    for (const [id, p] of s.players) {
      const sim = this.sim.get(id);
      if (!sim) continue;
      sim.budget = Math.min(sim.budget + dt, 0.3);
      const frozen = !live || !p.alive;
      let n = 0;
      while (sim.queue.length && sim.budget >= INPUT_DT * 0.5 && n < 12) {
        const i = sim.queue.shift(); n++;
        sim.budget -= INPUT_DT;
        if (active) {
          const pos = { x: p.x, y: p.y, z: p.z, vy: p.vy };
          stepMove(pos, i, INPUT_DT, this.arena, frozen);
          p.x = pos.x; p.y = pos.y; p.z = pos.z; p.vy = pos.vy;
          p.yaw = i.yaw; p.pitch = i.pitch;
          sim.trigger = i.fire;
          if (i.reload) sim.reloadWanted = true;
          if (i.slot !== p.slot && live && p.alive) this.switchTo(p, sim, i.slot);
        }
        p.seq = i.seq;
      }
      if (!sim.queue.length && sim.budget > 0.25 && active) {
        // no inputs arriving (lag or a stalled client): keep gravity going so nobody hangs in the air
        const pos = { x: p.x, y: p.y, z: p.z, vy: p.vy };
        stepMove(pos, { f: 0, s: 0, yaw: p.yaw }, dt, this.arena, true);
        p.y = pos.y; p.vy = pos.vy; sim.budget = 0.2; sim.trigger = false;
      }
      if (!p.connected) sim.trigger = false;
      if (live) this.blasterTick(id, p, sim);
      if (live && !p.alive && s.now >= p.respawnAt) this.spawn(id, p);
    }
    if (live) this.flyPaintballs(dt);
    if (active) this.updateTeamScores();
    if (s.phase === 'playing' && s.now >= s.phaseEnds) {
      const r = timeUp(standings(s.mode, this.plainPlayers()));
      if (r.result === 'overtime') { s.phase = 'overtime'; s.phaseEnds = s.now + this.timing.overtime; this.broadcast('overtime', {}); } else this.endMatch(r);
    } else if (s.phase === 'overtime') {
      const r = overtimeCheck(standings(s.mode, this.plainPlayers()), s.now >= s.phaseEnds);
      if (r.result !== 'continue') this.endMatch(r);
    }
  }

  switchTo(p, sim, slot) {
    p.slot = slot; p.equip = slot ? p.secondary : p.primary;
    p.reloadUntil = 0; sim.burstLeft = 0; sim.reloadWanted = false;
    p.switchUntil = this.state.now + EQUIPMENT_BY_ID[p.equip].cooldown;
  }

  blasterTick(id, p, sim) {
    const now = this.state.now;
    const e = EQUIPMENT_BY_ID[p.equip];
    const H = p.slot ? 'hopper1' : 'hopper0'; const C = p.slot ? 'carried1' : 'carried0';
    // finish a reload
    if (p.reloadUntil > 0 && now >= p.reloadUntil) {
      const add = Math.min(e.magazine - p[H], p[C]); p[H] += add; p[C] -= add; p.reloadUntil = 0;
    }
    if (!p.alive) return;
    const reloading = p.reloadUntil > 0;
    const startReload = () => { if (!reloading && p[C] > 0 && p[H] < e.magazine) { p.reloadUntil = now + e.reload; sim.burstLeft = 0; } };
    if (sim.reloadWanted) { sim.reloadWanted = false; startReload(); }
    if (reloading || p.reloadUntil > 0) return;
    const canFire = now >= p.protectedUntil && now >= p.switchUntil;
    // the rest of a burst
    while (sim.burstLeft > 0 && now >= sim.nextBurst && canFire) {
      if (p[H] <= 0) { sim.burstLeft = 0; startReload(); break; }
      this.fire(id, p, e); p[H]--; sim.burstLeft--; sim.nextBurst += e.burstGap;
    }
    if (!sim.trigger || !canFire || sim.burstLeft > 0) return;
    let shots = 0;
    while (now >= sim.nextFire && shots < 2) {
      if (p[H] <= 0) { startReload(); break; }
      sim.nextFire = Math.max(sim.nextFire, now - 1 / TICK_HZ) + 1 / e.rate;
      sim.used.add(e.id);
      this.fire(id, p, e); p[H]--; shots++;
      if (e.burst > 1) { sim.burstLeft = e.burst - 1; sim.nextBurst = now + e.burstGap; break; }
    }
  }

  fire(id, p, e) {
    const eye = { x: p.x, y: p.y + MOVE.eye, z: p.z };
    for (let k = 0; k < e.pellets; k++) {
      const a = this.rand() * Math.PI * 2; const r = e.spread * Math.sqrt(this.rand());
      const d = aimDir(p.yaw + Math.cos(a) * r, p.pitch + Math.sin(a) * r);
      const pb = { id: ++this.pid, owner: id, team: p.team, equip: e.id, x: eye.x, y: eye.y, z: eye.z, vx: d.x * e.speed, vy: d.y * e.speed, vz: d.z * e.speed, dist: 0, hit: new Set() };
      this.projectiles.push(pb);
      this.broadcast('shot', { i: pb.id, o: id, e: e.id, x: r3(pb.x), y: r3(pb.y), z: r3(pb.z), vx: r3(pb.vx), vy: r3(pb.vy), vz: r3(pb.vz) });
    }
  }

  flyPaintballs(dt) {
    const s = this.state;
    const teams = MODES_BY_ID[s.mode].teams;
    const keep = [];
    for (const pb of this.projectiles) {
      const e = EQUIPMENT_BY_ID[pb.equip];
      const steps = Math.max(1, Math.ceil((e.speed * dt) / 3));
      const h = dt / steps;
      let done = false;
      for (let k = 0; k < steps && !done; k++) {
        const a = { x: pb.x, y: pb.y, z: pb.z };
        pb.vy -= e.gravity * h;
        const b = { x: a.x + pb.vx * h, y: a.y + pb.vy * h, z: a.z + pb.vz * h };
        const wall = sweepArena(a, b, this.arena);
        let who = null;
        for (const [id, p] of s.players) {
          if (id === pb.owner || !p.alive || pb.hit.has(id)) continue;
          if (teams && p.team === pb.team) continue; // no friendly fire: teammates are not painted
          const hit = segPlayer(a, b, p);
          if (hit && (!who || hit.t < who.t)) who = { ...hit, id };
        }
        const at = (t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });
        if (who && (!wall || who.t <= wall.t)) {
          const pt = at(who.t);
          pb.hit.add(who.id);
          const tp = s.players.get(who.id);
          const n = norm({ x: pt.x - tp.x, y: 0, z: pt.z - tp.z });
          this.impact(pb, e, pt, n, 'player', who.id, who.precision);
          done = true;
        } else if (wall) {
          this.impact(pb, e, at(wall.t), wall.n, wall.kind, null, false, wall.id);
          done = true;
        } else {
          pb.dist += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
          pb.x = b.x; pb.y = b.y; pb.z = b.z;
          if (pb.dist > e.range) { this.broadcast('impact', { i: pb.id, k: 'drop' }); done = true; }
        }
      }
      if (!done) keep.push(pb);
    }
    this.projectiles = keep;
  }

  impact(pb, e, pt, n, kind, targetId, precision, solidId) {
    this.broadcast('impact', { i: pb.id, k: kind, e: e.id, x: r3(pt.x), y: r3(pt.y), z: r3(pt.z), nx: r3(n.x), ny: r3(n.y), nz: r3(n.z), t: targetId || undefined, p: precision || undefined, s: solidId });
    if (targetId) this.paint(targetId, pb.owner, e.tag * (precision ? e.precision : 1), precision, e);
    if (e.splash > 0) this.splash(pb, e, pt, n, targetId);
  }

  // Paint splash launcher: everyone (opponents) within the splash radius gets paint scaled by distance, unless a
  // bunker stands between the burst and them.
  splash(pb, e, pt, n, direct) {
    const s = this.state;
    const teams = MODES_BY_ID[s.mode].teams;
    const from = { x: pt.x + n.x * 0.15, y: Math.max(0.05, pt.y + n.y * 0.15), z: pt.z + n.z * 0.15 };
    for (const [id, p] of s.players) {
      if (id === pb.owner || id === direct || !p.alive || pb.hit.has(id)) continue;
      if (teams && p.team === pb.team) continue;
      const c = { x: p.x, y: p.y + 0.9, z: p.z };
      const d = Math.max(0, Math.hypot(c.x - pt.x, c.y - pt.y, c.z - pt.z) - BODY.radius);
      if (d > e.splash) continue;
      if (blocked(from, c, this.arena)) continue;
      pb.hit.add(id);
      this.paint(id, pb.owner, e.tag * Math.max(0.25, 1 - d / e.splash), false, e, true);
    }
  }

  paint(targetId, shooterId, amount, precision, e, splash = false) {
    const s = this.state;
    const t = s.players.get(targetId); const sh = s.players.get(shooterId);
    if (!t || !t.alive || amount <= 0) return;
    if (s.now < t.protectedUntil) { this.sendTo(shooterId, 'hit', { t: targetId, protected: true }); return; }
    if (sh && MODES_BY_ID[s.mode].teams && sh.team === t.team) return;
    t.paint = Math.min(PAINT_MAX, t.paint + amount);
    const tsim = this.sim.get(targetId);
    tsim?.painters.set(shooterId, s.now);
    this.sendTo(shooterId, 'hit', { t: targetId, a: Math.round(amount), p: precision || undefined, sp: splash || undefined });
    this.sendTo(targetId, 'painted', { by: shooterId, a: Math.round(amount), paint: Math.round(t.paint) });
    if (t.paint >= PAINT_MAX) this.tag(targetId, shooterId, precision);
  }

  // A tag: the target is out for this round (round elimination) and comes back after TIMING.respawn.
  tag(targetId, shooterId, precision) {
    const s = this.state;
    const t = s.players.get(targetId); const sh = s.players.get(shooterId);
    const tsim = this.sim.get(targetId);
    const assists = [];
    if (sh) { sh.tags++; sh.score += SCORE.tag; }
    for (const [pid, when] of tsim?.painters || []) {
      if (pid === shooterId || s.now - when > ASSIST_WINDOW) continue;
      const a = s.players.get(pid); if (!a) continue;
      a.assists++; a.score += SCORE.assist; assists.push(pid);
    }
    t.timesTagged++; t.alive = false; t.respawnAt = s.now + this.timing.respawn; t.paint = PAINT_MAX;
    tsim?.painters.clear();
    if (tsim) { tsim.trigger = false; tsim.burstLeft = 0; }
    t.reloadUntil = 0;
    this.broadcast('tag', { by: shooterId, byName: sh?.nickname || '', target: targetId, targetName: t.nickname, assists, precision: !!precision });
  }

  sendTo(id, type, msg) { this.clients.find((c) => c.sessionId === id)?.send(type, msg); }
}

const r3 = (v) => Math.round(v * 1000) / 1000;
const norm = (v) => { const l = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / l, y: v.y / l, z: v.z / l }; };

export class TestPaintballRoom extends PaintballRoom { static test = true; }
export { CloseCode };
