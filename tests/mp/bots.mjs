// Bots against the real server (in this process) with real @colyseus/sdk clients: Play vs Bots rooms on Med-C and
// the Whole Campus run to results; bots tag and get tagged through the normal handlers; line of sight, cooldowns
// and paintball counts hold for them; difficulty shows in the hit rate; team modes filled with bots; the host's
// add / fill / remove rules; the last human leaving closes the room; the server-wide bot cap; tick time.
//   node tests/mp/bots.mjs        (part of npm run test:mp)
import { Client } from '@colyseus/sdk';
import { EQUIPMENT_BY_ID } from '../../js/paintball/equipment.js';
import { MEDC } from '../../js/paintball/arena.js';
import { MODES_BY_ID } from '../../js/paintball/rules.js';
import { BOT_LIMITS } from '../../js/paintball/bots.js';
import { liveRooms, PaintballRoom } from '../../server/PaintballRoom.js';
import { sleep, until, assert, check, summary, boot, Bot, makeRoom, leaveAll, place } from './helpers.mjs';

const srv = await boot();
const url = `ws://localhost:${srv.port}`;
const C = MEDC.centre;
const roomOf = (code) => [...liveRooms].find((r) => r.roomId === code);
const bots = (st) => [...st.players.entries()].filter(([, p]) => p.bot);
// a Play vs Bots room: returns the human's client (a test pilot that stands still) and the server room
async function practice({ arena = 'medc', mode = 'ffa', n = 11, level = 'hard', duration = 30, test = {}, seed } = {}) {
  const room = await new Client(url).create('paintball', { nickname: 'Human', arena, practice: { mode, bots: n, level, duration }, test: { countdown: 0.3, landing: 1, protection: 1, respawn: 1.5, seed, ...test } });
  const me = new Bot(room);
  await until(() => me.state.players?.size >= 2 && me.state.phase !== 'lobby', 5000, 'practice room started');
  return { me, R: roomOf(room.roomId), code: room.roomId };
}
// record every paintball the server fires (who, blaster, room clock, paintballs in the hopper before it)
function recordShots(R) {
  const log = []; const fire = R.fire.bind(R);
  R.fire = (id, p, e) => { log.push({ id, e: e.id, t: R.state.now, hopper: p.slot ? p.hopper1 : p.hopper0, bot: p.bot }); return fire(id, p, e); };
  return log;
}
const only = process.env.ONLY; // run just the checks whose names contain this
const chk = (name, fn) => (!only || name.includes(only) ? check(name, fn) : null);
const hitRate = (R) => { let s = 0; let h = 0; for (const b of R.bots.brains.values()) { s += b.stats.shots; h += b.stats.hits; } return { shots: s, hits: h, rate: s ? h / s : 0 }; };

await chk('Play vs Bots on Med-C: 11 Hard bots join at once, the match starts without a ready-up, bots tag and get tagged, results with bot flags; inputs only through the room handlers', async () => {
  const { me, R } = await practice({ duration: 25 });
  const s = me.state;
  assert(bots(s).length === 11 && s.practice && s.botLevel === 'hard', `${bots(s).length} bots, practice ${s.practice}`);
  assert(bots(s).every(([, p]) => /^Bot [A-Z]/.test(p.nickname) && !p.voice && p.connected), `bot names, no voice`);
  assert(new Set(bots(s).map(([, p]) => p.nickname)).size === 11, 'unique names');
  const tags = []; me.room.onMessage('tag', (m) => tags.push(m));
  const shots = recordShots(R);
  await until(() => s.phase === 'results', 45000, 'results');
  const byBot = tags.filter((t) => s.players.get(t.by)?.bot); const onBot = tags.filter((t) => s.players.get(t.target)?.bot);
  assert(byBot.length >= 5 && onBot.length >= 5, `${byBot.length} tags by bots, ${onBot.length} on bots`);
  const rk = [...s.results.rankings];
  assert(s.results.ready && rk.length === 12 && rk.filter((r) => r.bot).length === 11 && rk.some((r) => !r.bot && r.nickname === 'Human'), 'results rankings with bot flags');
  // every bot input arrived through the 'in' handler (sanitised, in sequence); nothing else moved them
  assert(R.botCalls.in > 11 * 20 * 20, `bot 'in' messages: ${R.botCalls.in}`);
  for (const [id, p] of bots(s)) assert(p.seq > 300 && p.seq === R.bots.brains.get(id).seq - R.sim.get(id).queue.length, `${p.nickname}: applied seq ${p.seq} is the brain's own`);
  // cooldowns and paintball counts: never an empty hopper, never faster than the blaster's rate
  const fired = shots.filter((x) => x.bot);
  assert(fired.length > 100, `${fired.length} bot paintballs`);
  assert(fired.every((x) => x.hopper >= 1), 'a bot fired from an empty hopper');
  const pulls = new Map();
  for (const x of fired) { const k = `${x.id}|${x.e}`; if (!pulls.has(k)) pulls.set(k, []); const L = pulls.get(k); if (!L.length || x.t - L[L.length - 1] > 1e-6) L.push(x.t); }
  let tight = 0;
  for (const [k, L] of pulls) {
    const e = EQUIPMENT_BY_ID[k.split('|')[1]];
    if (e.burst > 1) continue;
    for (let i = 1; i < L.length; i++) if (L[i] - L[i - 1] < 1 / e.rate - 1 / 20 - 1e-4) tight++;
  }
  assert(tight === 0, `${tight} trigger pulls faster than the blaster allows`);
  console.log(`   Med-C: ${tags.length} tags (${byBot.length} by bots), hit rate ${(hitRate(R).rate * 100).toFixed(0)}%, tick p95 ${R.tickStats().p95.toFixed(2)} ms`);
  // rematch keeps the bots; the room stays private
  me.send('rematch', {});
  await until(() => s.phase === 'countdown' || s.phase === 'playing', 3000, 'rematch');
  assert(bots(s).length === 11, 'rematch kept the bots');
  let err = null; try { await new Client(url).joinById(me.room.roomId, { nickname: 'Gatecrasher' }); } catch (e) { err = e; }
  assert(err, 'someone else joined a Play vs Bots room');
  await me.leave();
});

await chk('a bot never fires at a player it cannot see (behind the tower), and does once the player steps out', async () => {
  const r = await makeRoom(srv, 1, { test: { protection: 0 } });
  const host = r.host; const R = roomOf(r.code);
  host.send('bot:level', { level: 'hard' }); host.send('bot:add', {});
  await until(() => bots(host.state).length === 1 && host.state.botLevel === 'hard', 3000, 'bot added');
  host.send('config', { duration: 60 });
  host.send('ready', { ready: true });
  await until(() => host.me.ready, 2000, 'ready');
  host.send('start', {});
  await until(() => host.state.phase === 'playing', 4000, 'playing');
  const [bid] = bots(host.state)[0]; const brain = R.bots.brains.get(bid); const bp = R.state.players.get(bid);
  // the bot holds still 12 m west of the tower looking east; the human crouches right behind the tower
  brain.hold = true;
  const holdAt = () => { bp.x = C.x - 12; bp.z = C.z; bp.y = 0; };
  holdAt(); brain.yaw = -Math.PI / 2; bp.yaw = -Math.PI / 2;
  await place(host, C.x + 1.7, C.z, Math.PI / 2, 0);
  const shots0 = brain.stats.shots; const los0 = brain.stats.losChecks;
  for (let i = 0; i < 40; i++) { holdAt(); await sleep(100); }
  assert(brain.stats.losChecks > los0 + 5, `the bot looked (${brain.stats.losChecks - los0} line-of-sight checks)`);
  assert(brain.stats.shots === shots0, `the bot fired ${brain.stats.shots - shots0} paintballs at a hidden player`);
  assert(!host.events('painted').length, 'the hidden player was painted');
  // step out into the open lane
  await place(host, C.x + 4, C.z + 6, Math.PI / 2, 0);
  await until(() => { holdAt(); return brain.stats.shots > shots0; }, 4000, 'the bot fires once it sees them');
  await until(() => host.events('painted').length > 0, 4000, 'and paints them');
  await leaveAll([host]);
});

await chk('difficulty changes behaviour measurably: hit rate Easy < Hard over the same seed (Med-C, 11 bots each)', async () => {
  const [E, H] = await Promise.all([practice({ level: 'easy', duration: 22, seed: 4242 }), practice({ level: 'hard', duration: 22, seed: 4242 })]);
  await until(() => E.me.state.phase === 'results' && H.me.state.phase === 'results', 40000, 'both finished');
  const e = hitRate(E.R); const h = hitRate(H.R);
  const tags = (x) => [...x.me.state.results.rankings].reduce((a, r) => a + r.tags, 0);
  console.log(`   Easy: ${e.hits}/${e.shots} hits (${(e.rate * 100).toFixed(1)}%), ${tags(E)} tags · Hard: ${h.hits}/${h.shots} hits (${(h.rate * 100).toFixed(1)}%), ${tags(H)} tags`);
  assert(e.shots > 50 && h.shots > 50, 'both fired');
  assert(e.rate < h.rate, 'Easy bots hit less often than Hard bots');
  assert(tags(E) < tags(H), 'and tag less');
  await leaveAll([E.me, H.me]);
});

await chk('a team mode filled with bots starts and plays (4v4 on Med-C): bots as squadmates and opponents, no friendly fire', async () => {
  const { me, R } = await practice({ mode: '4v4', duration: 20, level: 'medium' });
  const s = me.state;
  assert(s.players.size === 8 && bots(s).length === 7, `${s.players.size} players`);
  const count = [0, 0]; for (const p of s.players.values()) count[p.team]++;
  assert(count[0] === 4 && count[1] === 4, `teams ${count}`);
  const tags = []; me.room.onMessage('tag', (m) => tags.push(m));
  await until(() => s.phase === 'results', 35000, 'results');
  assert(tags.length >= 3, `${tags.length} tags`);
  assert(tags.every((t) => s.players.get(t.by)?.team !== s.players.get(t.target)?.team), 'a teammate was tagged');
  assert(s.results.teams.length === 2, 'team results');
  await me.leave();
  assert(R.bots.size === 0, 'bots removed when the human left');
});

await chk('Campus Royale squads filled with bots (2v2v2v2v2 on the Whole Campus): the squad lands together, bots loot', async () => {
  const { me, R } = await practice({ arena: 'campus', mode: '2v2v2v2v2', level: 'medium', test: { landing: 1.2, zoneScale: 0.5 } });
  const s = me.state;
  assert(s.players.size === 10 && bots(s).length === 9, `${s.players.size} players`);
  await until(() => s.phase === 'playing', 8000, 'playing');
  const byTeam = new Map(); for (const p of s.players.values()) { if (!byTeam.has(p.team)) byTeam.set(p.team, []); byTeam.get(p.team).push(p); }
  for (const [t, L] of byTeam) assert(Math.hypot(L[0].x - L[1].x, L[0].z - L[1].z) < 12, `squad ${t} landed ${Math.hypot(L[0].x - L[1].x, L[0].z - L[1].z).toFixed(0)} m apart`);
  const drops = [...byTeam.values()].map((L) => L[0]);
  let min = Infinity; for (const a of drops) for (const b of drops) if (a !== b) min = Math.min(min, Math.hypot(a.x - b.x, a.z - b.z));
  assert(min > 40, `squads spread (${min.toFixed(0)} m)`);
  await until(() => (R.botCalls.pick || 0) >= 5, 20000, 'bots picking up supplies');
  assert(R.botCalls.open > 0, 'crates opened');
  await me.leave();
});

await chk('Play vs Bots on the Whole Campus: 11 bots land (spread), loot, follow the zone and the match runs to results', async () => {
  const { me, R } = await practice({ arena: 'campus', level: 'hard', test: { landing: 1, zoneScale: 0.5, hardCap: 300 } });
  const s = me.state;
  await until(() => s.phase === 'playing', 6000, 'playing');
  assert(R.botCalls.land === 11, `${R.botCalls.land} landing picks`);
  const pos = [...s.players.values()].filter((p) => p.bot);
  let min = Infinity; for (const a of pos) for (const b of pos) if (a !== b) min = Math.min(min, Math.hypot(a.x - b.x, a.z - b.z));
  assert(min > 20 && s.regionR > 0, `bots landed ${min.toFixed(0)} m apart at the closest (inside a ${Math.round(s.regionR)} m play area)`);
  assert(pos.every((p) => Math.hypot(p.x - s.regionX, p.z - s.regionZ) <= s.regionR), 'everyone landed inside the play area');
  const tags = []; me.room.onMessage('tag', (m) => tags.push(m));
  await until(() => s.phase === 'results', 240000, 'results');
  const rk = [...s.results.rankings];
  assert(s.results.ready && rk.length === 12 && rk.every((r) => r.placement >= 1), 'placements');
  assert(R.botCalls.pick >= 3, `${R.botCalls.pick} pick-ups`);
  const st = R.bots.stats();
  console.log(`   campus: ${tags.length} tags (${tags.filter((t) => s.players.get(t.by)?.bot).length} by bots, ${tags.filter((t) => t.zone && !t.by).length} by the zone), ${R.botCalls.pick} pick-ups, ${R.botCalls.throw || 0} paint bombs, ${R.botCalls.use || 0} shields/cleaning, ${st.searches} path searches (${st.cacheHits} cache hits), winner ${s.results.winner}`);
  await me.leave();
});

await chk('host rules: add / fill / remove bots, difficulty, non-hosts cannot, mode change trims, bots take seats, team start, voice skips bots', async () => {
  const r = await makeRoom(srv, 2);
  const [host, guest] = r.bots; const R = roomOf(r.code);
  for (const t of ['bot:add', 'bot:fill', 'bot:level']) guest.send(t, { level: 'easy' });
  await until(() => guest.events('error').filter((e) => e.m.code === 'host-only').length === 3, 3000, 'host-only errors');
  assert(!bots(host.state).length && host.state.botLevel === 'medium', 'a non-host changed the bots');
  host.send('bot:add', {});
  await until(() => bots(host.state).length === 1, 2000, 'one bot');
  host.send('bot:level', { level: 'easy' });
  await until(() => host.state.botLevel === 'easy', 2000, 'level');
  assert([...R.bots.brains.values()].every((b) => b.level.id === 'easy'), 'brains follow the level');
  host.send('bot:fill', {});
  await until(() => host.state.players.size === 12 && host.state.slotsOpen === 0, 3000, 'filled to 12');
  let err = null; try { await new Client(url).joinById(r.code, { nickname: 'Thirteen' }); } catch (e) { err = e; }
  assert(err, 'a 13th player joined a room full of bots');
  const victim = bots(host.state)[3][0];
  guest.send('bot:remove', { id: victim });
  host.send('bot:remove', { id: guest.id }); // not a bot: ignored
  await sleep(200);
  assert(host.state.players.has(victim) && host.state.players.has(guest.id), 'a non-host removed a bot, or a human was removed');
  host.send('bot:remove', { id: victim });
  await until(() => !host.state.players.has(victim) && host.state.players.size === 11, 2000, 'bot removed');
  const late = await new Client(url).joinById(r.code, { nickname: 'Late' }); // a seat opened
  const lateBot = new Bot(late);
  await until(() => host.state.players.size === 12, 2000, 'a human took the freed seat');
  host.send('config', { mode: '4v4' });
  await until(() => host.state.mode === '4v4' && host.state.players.size === 8, 3000, 'mode change trimmed bots to 8');
  assert([...host.state.players.values()].filter((p) => !p.bot).length === 3, 'humans never trimmed');
  for (const b of [host, guest, lateBot]) b.send('ready', { ready: true });
  await until(() => [...host.state.players.values()].every((p) => p.ready), 3000, 'all ready (bots always are)');
  host.send('start', {});
  await until(() => host.state.phase === 'countdown' || host.state.phase === 'playing', 3000, 'team match with bots starts');
  // voice: bots are never voice peers and signalling to one goes nowhere
  const bid = bots(host.state)[0][0];
  host.send('voice', { on: true });
  await sleep(100);
  host.send('rtc', { to: bid, kind: 'offer', data: { sdp: 'x' } });
  await sleep(150);
  assert(!host.state.players.get(bid).voice, 'a bot with voice on');
  await leaveAll([host, guest, lateBot]);
});

await chk('the last human leaving closes the room and its bots; the host passes to a human, never a bot', async () => {
  const r = await makeRoom(srv, 2);
  const [host, guest] = r.bots;
  host.send('bot:fill', {});
  await until(() => host.state.players.size === 12, 3000, 'filled');
  await host.leave();
  await until(() => guest.me?.host, 3000, 'host passed to the other human');
  assert(PaintballRoom.botsInUse().total === 10, `bots in use ${PaintballRoom.botsInUse().total}`);
  await guest.leave();
  await until(() => !roomOf(r.code), 4000, 'room closed');
  assert(PaintballRoom.botsInUse().total === 0, 'bots still counted');
  const p = await practice({ duration: 60 });
  await p.me.leave();
  await until(() => !roomOf(p.code) && PaintballRoom.botsInUse().total === 0, 4000, 'practice room closed with its bots');
});

await chk('server-wide bot cap: a third bot room (or the 34th bot) is refused with a clear message', async () => {
  const saved = PaintballRoom.botLimits;
  PaintballRoom.botLimits = { rooms: 2, total: 8 };
  try {
    const a = await practice({ n: 3, duration: 60 }); const b = await practice({ n: 3, duration: 60 });
    let err = null; try { await new Client(url).create('paintball', { nickname: 'Third', practice: { bots: 2 } }); } catch (e) { err = e; }
    assert(err && /Bots are busy/.test(err.message), `third bot room: ${err?.message}`);
    const r = await makeRoom(srv, 1);
    r.host.send('bot:add', {});
    await until(() => r.host.events('error').some((e) => e.m.code === 'bots-busy' && /Bots are busy/.test(e.m.message)), 3000, 'lobby add refused');
    assert(!bots(r.host.state).length, 'a bot was added past the cap');
    await a.me.leave();
    await until(() => PaintballRoom.botsInUse().rooms === 1, 3000, 'room freed');
    r.host.send('bot:fill', {});
    await until(() => bots(r.host.state).length === 5, 3000, 'fill stops at the total cap (3 + 5 = 8)');
    assert(r.host.events('error').filter((e) => e.m.code === 'bots-busy').length >= 2, 'told why the fill stopped');
    await leaveAll([b.me, r.host]);
  } finally { PaintballRoom.botLimits = saved; }
  assert(BOT_LIMITS.rooms === 3 && BOT_LIMITS.total === 33, 'default cap: 3 rooms, 33 bots');
});

await chk('server load: 1 human + 11 Hard bots on the Whole Campus keep the 20 Hz tick (p95, max) and memory in budget', async () => {
  const { me, R } = await practice({ arena: 'campus', level: 'hard', test: { landing: 1 } });
  await until(() => me.state.phase === 'playing', 6000, 'playing');
  // pin a 150 m paint zone over the Med-C cricket ground: everyone heads there, so the bots see, chase and fight
  me.send('test:zone', { x: 395, z: 650, r: 150, dps: 1 });
  R.tickN = 0; // measure play only
  const t0 = Date.now(); let rss = 0;
  while (Date.now() - t0 < 60000) { await sleep(1000); rss = Math.max(rss, process.memoryUsage().rss); }
  const t = R.tickStats(); const st = R.bots.stats();
  console.log(`   TICK (campus, 1 human + 11 Hard bots, ${t.n} ticks over 60 s): wall p50 ${t.p50.toFixed(2)} ms · p95 ${t.p95.toFixed(2)} ms · max ${t.max.toFixed(2)} ms · CPU p95 ${t.cpuP95.toFixed(2)} ms, max ${t.cpuMax.toFixed(2)} ms (budget ${(1000 / 20).toFixed(0)} ms) · RSS ${Math.round(rss / 1048576)} MB (whole test process) · rays ${st.rays}, denied ${st.raysDenied}, searches ${st.searches}, expansions ${st.expansions}, cache hits ${st.cacheHits}`);
  assert(t.n > 1000, 'ticks measured');
  assert(t.cpuP95 < 10, `tick CPU p95 ${t.cpuP95.toFixed(2)} ms`);
  assert(t.p95 < 25, `tick wall p95 ${t.p95.toFixed(2)} ms`);
  assert(rss < 512 * 1048576, `RSS ${Math.round(rss / 1048576)} MB`);
  await me.leave();
});

const failed = summary();
await srv.close();
process.exit(failed ? 1 : 0);
