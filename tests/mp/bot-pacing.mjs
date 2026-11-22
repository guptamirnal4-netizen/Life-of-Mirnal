// How bot matches play at real speed (no test helpers that move anyone): a Campus Royale Play vs Bots room with
// 1 scripted human + 11 bots, and a Med-C room where an idle human must get found. Prints the numbers; asserts the
// acceptance bars. Run several seeds in parallel (each room is one of the server's 3 bot rooms):
//   node tests/mp/bot-pacing.mjs [seed …]          (default: one campus seed + Med-C; part of npm run test:mp)
//   BOT_LEVEL=medium HUMAN=idle|zone node tests/mp/bot-pacing.mjs 1 2 3
import { Client } from '@colyseus/sdk';
import { liveRooms } from '../../server/PaintballRoom.js';
import { sleep, until, assert, check, summary, boot, Bot } from './helpers.mjs';
import { loadNav } from '../../server/bots/nav.js';
import { walkLine } from '../../server/bots/manager.js';
import { solveAim, moveInput } from '../../server/bots/brain.js';
import { CAMPUS } from '../../js/paintball/arena.js';
import { blocked } from '../../js/paintball/sim.js';

const srv = await boot();
const url = `ws://localhost:${srv.port}`;
const seeds = process.argv.slice(2).map(Number).filter(Number.isFinite);
const LEVEL = process.env.BOT_LEVEL || 'medium';
const HUMAN = process.env.HUMAN || 'zone';

async function campus(seed, human = HUMAN) {
  const room = await new Client(url).create('paintball', { nickname: 'Human', arena: 'campus', practice: { mode: 'ffa', bots: 11, level: LEVEL }, test: { seed, landing: 3 } });
  const me = new Bot(room); const R = [...liveRooms].find((r) => r.roomId === room.roomId);
  const s = () => me.state;
  const tags = []; let engaged = null; const out = [];
  room.onMessage('tag', (m) => tags.push({ ...m, t: s().now - s().playStart }));
  room.onMessage('painted', () => { if (engaged === null && s().phase === 'playing') engaged = s().now - s().playStart; });
  room.onMessage('out', (m) => out.push(m));
  await until(() => s().phase === 'playing', 20000, 'playing');
  const t0 = Date.now();
  // the human: stands where it landed ('idle'), or plays like a simple player ('zone'): walks the campus paths to
  // the middle of the next circle and fires at a bot it can see (its client-side view of the synced state)
  const G = loadNav().graph; const geo = CAMPUS.geo; let path = null; let goal = null; let wp = 0;
  while (s().phase === 'playing' && Date.now() - t0 < 12 * 60000) {
    const p = s().players.get(room.sessionId);
    if (human === 'zone' && p && p.alive && !p.out) {
      const Z = s().zone; const gx = Z.nr > 0 ? Z.nx : Z.x; const gz = Z.nr > 0 ? Z.nz : Z.z;
      if (!goal || Math.hypot(goal.x - gx, goal.z - gz) > 15 || !path) {
        goal = { x: gx, z: gz };
        const a = G.near(p.x, p.z, p.y, 12).find(([i]) => walkLine(geo, p, G.node(i))) || G.near(p.x, p.z, p.y, 30)[0]; const b = G.near(gx, gz, 0, 40, 30)[0];
        if (a && b) { const q = G.search(a[0], b[0]); let r; while (!(r = q.step(1e6))); path = [G.node(a[0]), ...r]; wp = 0; }
      }
      const eye = { x: p.x, y: p.y + 1.6, z: p.z }; let foe = null; let fd = 45;
      for (const q of s().players.values()) if (q.bot && q.alive && !q.out) { const d = Math.hypot(q.x - p.x, q.z - p.z); if (d < fd && !blocked(eye, { x: q.x, y: q.y + 1.2, z: q.z }, CAMPUS)) { fd = d; foe = q; } }
      let dir = null;
      while (path && wp < path.length) { const [x, z, y] = path[wp]; const d = Math.hypot(x - p.x, z - p.z); if (d < 1.2 && Math.abs(y - p.y) < 1.6) { wp++; continue; } dir = { x: x - p.x, z: z - p.z }; break; }
      if (foe) { const a = solveAim(eye, { x: foe.x, y: foe.y + 1.15, z: foe.z }, p.equip || 'standard'); me.in.yaw = a.yaw; me.in.pitch = a.pitch; me.in.fire = true; }
      else { me.in.fire = false; me.in.pitch = 0; if (dir) me.in.yaw = Math.atan2(-dir.x, -dir.z); }
      const m = dir ? moveInput(me.in.yaw, dir.x, dir.z) : { f: 0, s: 0 }; me.in.f = m.f; me.in.s = m.s; me.in.run = !foe;
      if (me.me.hopper0 === 0) me.in.reload = true;
    }
    await sleep(150);
  }
  const end = s().now - s().playStart;
  const zone = tags.filter((t) => t.zone).length; const byBot = tags.filter((t) => !t.zone && s().players.get(t.by)?.bot).length;
  const res = { seed, human, region: Math.round(s().regionR), ended: s().phase === 'results', minutes: +(end / 60).toFixed(1), winner: s().results.winner, eliminations: out.length, tagsByBots: byBot, zoneTags: zone, humanEngagedAt: engaged === null ? null : Math.round(engaged), humanPlaced: s().players.get(room.sessionId)?.placement, tick: R.tickStats() };
  await me.leave();
  return res;
}

async function medc(seed) {
  const room = await new Client(url).create('paintball', { nickname: 'Human', arena: 'medc', practice: { mode: 'ffa', bots: 11, level: 'hard', duration: 180 }, test: { seed } });
  const me = new Bot(room); const R = [...liveRooms].find((r) => r.roomId === room.roomId);
  let taggedAt = null; let paintedAt = null;
  room.onMessage('tag', (m) => { if (m.target === room.sessionId && taggedAt === null) taggedAt = me.state.now; });
  room.onMessage('painted', () => { if (paintedAt === null) paintedAt = me.state.now; });
  await until(() => me.state.phase === 'playing', 5000, 'playing');
  const start = me.state.now; const protEnds = me.me.protectedUntil;
  await until(() => taggedAt !== null || me.state.now - start > 120, 130000, 'tagged or 2 min');
  const res = { seed, paintedAfter: paintedAt === null ? null : +(paintedAt - Math.max(start, protEnds)).toFixed(1), taggedAfter: taggedAt === null ? null : +(taggedAt - Math.max(start, protEnds)).toFixed(1), tick: R.tickStats() };
  await me.leave();
  return res;
}

const fmt = (t) => `tick p50 ${t.p50.toFixed(2)} / p95 ${t.p95.toFixed(2)} / max ${t.max.toFixed(2)} ms`;
await check(`Campus Royale Play vs Bots at real speed (${LEVEL} bots, human: ${HUMAN}): bots meet and fight, the human is engaged, the match ends with a winner`, async () => {
  const list = await Promise.all((seeds.length ? seeds : [11]).slice(0, 2).map((sd) => campus(sd)));
  if (seeds.length > 2) list.push(...(await Promise.all(seeds.slice(2).map((sd) => campus(sd)))));
  for (const r of list) console.log(`   campus seed ${r.seed}: play area r ${r.region} m · ${r.ended ? `ended in ${r.minutes} min, winner ${r.winner}` : 'NOT ENDED'} · ${r.eliminations} eliminations: ${r.tagsByBots} tags by bots, ${r.zoneTags} by the zone · human first painted at ${r.humanEngagedAt ?? 'never'} s, placed #${r.humanPlaced} · ${fmt(r.tick)}`);
  for (const r of list) {
    assert(r.ended && r.winner && r.minutes < 10, `seed ${r.seed}: ended ${r.ended} in ${r.minutes} min`);
    assert(r.tagsByBots > r.zoneTags, `seed ${r.seed}: ${r.tagsByBots} bot tags vs ${r.zoneTags} zone tags`);
    assert(r.humanEngagedAt !== null && r.humanEngagedAt < 200, `seed ${r.seed}: human engaged at ${r.humanEngagedAt}`);
    assert(r.tick.p95 < 10, `seed ${r.seed}: tick p95 ${r.tick.p95}`);
  }
});

await check('Med-C Play vs Bots: Hard bots find and tag an idle human within about a minute of spawn protection ending', async () => {
  const list = await Promise.all([1, 2, 3].map((sd) => medc(sd)));
  for (const r of list) console.log(`   Med-C seed ${r.seed}: human painted after ${r.paintedAfter} s, tagged after ${r.taggedAfter} s · ${fmt(r.tick)}`);
  for (const r of list) assert(r.taggedAfter !== null && r.taggedAfter <= 60, `seed ${r.seed}: tagged after ${r.taggedAfter} s`);
});

const failed = summary();
await srv.close();
process.exit(failed ? 1 : 0);
