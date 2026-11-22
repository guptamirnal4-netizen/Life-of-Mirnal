// Helpers for the multiplayer tests: start the real Colyseus server in this process and connect real
// @colyseus/sdk clients over WebSocket.
import { Client } from '@colyseus/sdk';
import { startServer } from '../../server/index.js';
import { aimDir, INPUT_DT } from '../../js/paintball/sim.js';
import { EQUIPMENT_BY_ID } from '../../js/paintball/equipment.js';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function until(fn, ms = 5000, label = 'condition') {
  const t0 = Date.now();
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() - t0 > ms) throw new Error(`timed out waiting for ${label}`);
    await sleep(20);
  }
}
export function assert(cond, msg) { if (!cond) throw new Error(msg); }

let results = [];
const allBots = new Set();
export async function check(name, fn) {
  const t0 = Date.now();
  try { await fn(); results.push([name, true]); console.log(`PASS ${name} (${Date.now() - t0} ms)`); } catch (e) { results.push([name, false]); console.log(`FAIL ${name}: ${e.stack || e.message}`); }
  await Promise.all([...allBots].map((b) => b.leave()));
  allBots.clear();
}
export function summary() {
  const failed = results.filter((r) => !r[1]);
  console.log(`\n${results.length - failed.length}/${results.length} passed${failed.length ? `; FAILED: ${failed.map((f) => f[0]).join(', ')}` : ''}`);
  return failed.length;
}

export async function boot() { return startServer({ port: 0, test: true, quiet: true }); }

const EVENTS = ['host', 'shot', 'impact', 'hit', 'painted', 'tag', 'ended', 'overtime', 'closed', 'error', 'rtc', 'landed', 'picked', 'bomb', 'boom', 'down', 'out', 'revived', 'test:loot'];
// A connected player: the room, a log of every server event, and a pilot that sends inputs at INPUT_DT.
export class Bot {
  constructor(room) {
    allBots.add(this);
    this.room = room; this.log = []; this.seq = 0; this.left = null;
    this.in = { f: 0, s: 0, yaw: 0, pitch: 0, fire: false, reload: false, slot: 0, run: false, jump: false };
    for (const type of EVENTS) room.onMessage(type, (m) => this.log.push({ type, m, at: Date.now() }));
    room.onLeave((code) => { this.left = code; this.stop(); });
    this.timer = setInterval(() => this.step(), INPUT_DT * 1000);
  }
  get id() { return this.room.sessionId; }
  get me() { return this.room.state.players.get(this.room.sessionId); }
  get state() { return this.room.state; }
  step() {
    if (!this.room.connection.isOpen) return;
    this.room.send('in', [{ ...this.in, seq: ++this.seq }]);
    this.in.reload = false; this.in.jump = false;
  }
  events(type) { return this.log.filter((e) => e.type === type); }
  clear() { this.log.length = 0; }
  send(type, m) { this.room.send(type, m); }
  aimAt(from, to, h = 1.1) {
    const dx = to.x - from.x; const dz = to.z - from.z;
    this.in.yaw = Math.atan2(-dx, -dz); this.in.pitch = Math.atan2(h - 1.6, Math.hypot(dx, dz));
  }
  async tap(ms = 40) { this.in.fire = true; await sleep(ms); this.in.fire = false; }
  stop() { clearInterval(this.timer); }
  async leave() { this.stop(); if (this.room.connection.isOpen) await this.room.leave(true).catch(() => {}); }
}

// A pitch that lands a paintball of equipment `id` at `to` (height h) from `from` (eye height), stepping the same
// way the server does.
export function solvePitch(id, from, to, h) {
  const e = EQUIPMENT_BY_ID[id];
  const D = Math.hypot(to.x - from.x, to.z - from.z);
  let best = 0; let err = 1e9;
  for (let p = -0.6; p < 0.9; p += 0.0005) {
    const d = aimDir(0, p); let x = 0; let y = 1.6; let vx = Math.hypot(d.x, d.z) * e.speed; let vy = d.y * e.speed;
    const dt = 1 / 20; const steps = Math.max(1, Math.ceil((e.speed * dt) / 3)); const hh = dt / steps;
    while (x < D && y > -1) { vy -= e.gravity * hh; const nx = x + vx * hh; const ny = y + vy * hh; if (nx >= D) { y = y + (ny - y) * ((D - x) / (nx - x)); x = D; break; } x = nx; y = ny; }
    if (x >= D && Math.abs(y - h) < err) { err = Math.abs(y - h); best = p; }
  }
  return best;
}

// Create a room and fill it with n players. Returns { url, bots, host }.
export async function makeRoom(srv, n, { mode = 'ffa', duration = null, test = {}, loadouts = [], look, arena = null } = {}) {
  const url = `ws://localhost:${srv.port}`;
  const opts = (i) => ({ nickname: `P${i + 1}`, loadout: loadouts[i], look, test: { countdown: 0.2, protection: 0, respawn: 1, ...test } });
  const first = await new Client(url).create('paintball', opts(0));
  const bots = [new Bot(first)];
  for (let i = 1; i < n; i++) bots.push(new Bot(await new Client(url).joinById(first.roomId, opts(i))));
  const host = bots[0];
  await until(() => bots.every((b) => b.state.players.size === n), 5000, 'everyone sees everyone');
  if (mode !== 'ffa' || duration) {
    host.send('config', duration ? { mode, duration } : { mode });
    await until(() => bots.every((b) => b.state.mode === mode && (!duration || b.state.duration === duration)), 3000, 'config');
  }
  if (arena) {
    host.send('config', { arena });
    await until(() => bots.every((b) => b.state.arena === arena), 3000, 'arena');
  }
  return { url, bots, host, code: first.roomId };
}

export async function startMatch(bots) {
  for (const b of bots) b.send('ready', { ready: true });
  await until(() => bots.every((b) => [...b.state.players.values()].every((p) => p.ready)), 3000, 'all ready');
  bots[0].send('start', {});
  await until(() => bots.every((b) => b.state.phase === 'playing'), 5000, 'match playing');
}

export async function leaveAll(bots) { await Promise.all(bots.map((b) => b.leave())); }

// Place a player (test helper, test flag only) and keep the pilot's aim in step.
export async function place(bot, x, z, yaw = 0, pitch = 0, unprotect = true, y = undefined) {
  bot.in.yaw = yaw; bot.in.pitch = pitch;
  bot.send('test:place', { x, z, yaw, pitch, unprotect, y });
  await until(() => Math.abs(bot.me.x - x) < 0.01 && Math.abs(bot.me.z - z) < 0.01, 2000, `place ${bot.me?.nickname}`);
}
