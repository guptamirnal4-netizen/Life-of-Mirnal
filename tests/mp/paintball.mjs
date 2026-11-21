// Multiplayer paintball tests against the real server (in this process) with real @colyseus/sdk clients.
//   node tests/mp/paintball.mjs        (npm run test:mp)
// Prints PASS/FAIL per check; exits 1 on any failure.
import { Client } from '@colyseus/sdk';
import { MODES, SCORE, MOVE } from '../../js/paintball/rules.js';
import { EQUIPMENT_BY_ID } from '../../js/paintball/equipment.js';
import { MEDC, spawnSet } from '../../js/paintball/arena.js';
import { liveRooms } from '../../server/PaintballRoom.js';
import { sleep, until, assert, check, summary, boot, Bot, makeRoom, startMatch, leaveAll, place, solvePitch } from './helpers.mjs';

const srv = await boot();
const timersNow = () => process.getActiveResourcesInfo().filter((r) => r === 'Timeout').length;
const baseline = timersNow();
const C = MEDC.centre;
const EAST = -Math.PI / 2; const WEST = Math.PI / 2;
const LANE = C.z + 6; // a clear lane across the middle of the arena

// ---------- capacity, ready, host controls, teams ----------
for (const [mode, n] of [['ffa', 2], ['ffa', 3], ['ffa', 12], ...MODES.filter((m) => m.teams).map((m) => [m.id, m.players[0]])]) {
  await check(`${mode} with ${n} players starts; spawns from the registry, apart${mode === 'ffa' ? '' : ', teams balanced and in their spawn groups'}`, async () => {
    const { bots } = await makeRoom(srv, n, { mode });
    await startMatch(bots);
    const s = bots[1].state; const ps = [...s.players.values()];
    const m = MODES.find((x) => x.id === mode);
    const set = spawnSet(MEDC, m.teams);
    for (const p of ps) {
      const spot = set.find((q) => Math.hypot(q.x - p.x, q.z - p.z) < 0.01);
      assert(spot, `${p.nickname} not on a registry spawn`);
      if (m.teams) assert(spot.group === p.team, `${p.nickname} spawned in another team's group`);
      for (const q of ps) if (q !== p) assert(Math.hypot(q.x - p.x, q.z - p.z) >= 2.5, 'two players spawned on top of each other');
    }
    if (m.teams) {
      const count = new Array(m.teams).fill(0); for (const p of ps) count[p.team]++;
      assert(count.every((c) => c === m.size), `teams unbalanced ${count}`);
      assert(s.teamsLocked, 'teams not locked');
    }
    await leaveAll(bots);
  });
}

await check('a 13th player is rejected', async () => {
  const { bots, url, code } = await makeRoom(srv, 12);
  let err = null;
  try { await new Client(url).joinById(code, { nickname: 'Thirteen' }); } catch (e) { err = e; }
  assert(err, '13th join accepted');
  assert(bots[0].state.players.size === 12, 'room grew past 12');
  await leaveAll(bots);
});

await check('a team mode refuses to start under capacity; start blocked until everyone is ready', async () => {
  const { bots, host } = await makeRoom(srv, 7, { mode: '4v4' });
  for (const b of bots) b.send('ready', { ready: true });
  await until(() => [...host.state.players.values()].every((p) => p.ready), 3000, 'ready');
  host.send('start', {});
  await until(() => host.events('error').some((e) => e.m.code === 'cannot-start'), 3000, 'cannot-start error');
  assert(host.state.phase === 'lobby', 'started under capacity');
  await leaveAll(bots);
  const r = await makeRoom(srv, 3);
  r.bots[0].send('ready', { ready: true }); r.bots[1].send('ready', { ready: true });
  await sleep(150);
  r.host.send('start', {});
  await until(() => r.host.events('error').some((e) => e.m.code === 'cannot-start'), 3000, 'cannot-start (not ready)');
  assert(r.host.state.phase === 'lobby', 'started with someone not ready');
  r.bots[2].send('ready', { ready: true });
  await sleep(150);
  r.host.send('start', {});
  await until(() => r.host.state.phase !== 'lobby', 3000, 'start once all ready');
  await leaveAll(r.bots);
});

await check('host-only controls are rejected from non-hosts', async () => {
  const { bots, host } = await makeRoom(srv, 3);
  const guest = bots[1];
  for (const [type, m] of [['config', { mode: '4v4', duration: 300 }], ['randomise', {}], ['start', {}], ['close', {}], ['rematch', {}], ['lobby', {}]]) guest.send(type, m);
  await until(() => guest.events('error').filter((e) => e.m.code === 'host-only').length === 6, 3000, 'six host-only errors');
  assert(host.state.mode === 'ffa' && host.state.duration === 480 && host.state.phase === 'lobby' && !host.left, 'a non-host changed the room');
  await leaveAll(bots);
});

await check('team randomise in the lobby (host), teams lock when the match starts', async () => {
  const { bots, host } = await makeRoom(srv, 8, { mode: '4v4' });
  const teams = () => [...host.state.players.entries()].map(([id, p]) => `${id}:${p.team}`).join();
  const before = teams(); let changed = false;
  for (let i = 0; i < 10 && !changed; i++) { host.send('randomise', {}); await sleep(120); changed = teams() !== before; }
  assert(changed, 're-randomise never changed the teams');
  await startMatch(bots);
  const locked = teams();
  host.send('randomise', {});
  await until(() => host.events('error').some((e) => e.m.code === 'not-lobby'), 3000, 'randomise refused in a match');
  assert(teams() === locked && host.state.teamsLocked, 'teams changed during the match');
  await leaveAll(bots);
});

await check('host migration when the host leaves', async () => {
  const { bots, host } = await makeRoom(srv, 3);
  await host.leave();
  await until(() => bots[1].state.players.size === 2, 3000, 'host gone');
  const hosts = [...bots[1].state.players.entries()].filter(([, p]) => p.host);
  assert(hosts.length === 1 && hosts[0][0] === bots[1].id, 'host did not pass to the next player');
  bots[1].send('config', { duration: 180 });
  await until(() => bots[2].state.duration === 180, 3000, 'new host controls work');
  await leaveAll(bots.slice(1));
});

// ---------- the six blasters ----------
const SKY = 1.2; // aim high: paintballs fly off without touching anyone
async function duel(primary, secondary = 'standard', test = {}) {
  const r = await makeRoom(srv, 2, { loadouts: [[primary, secondary === primary ? 'rapid' : secondary], ['standard', 'rapid']], test });
  await startMatch(r.bots);
  const [a, b] = r.bots;
  await place(a, C.x - 30, C.z, EAST, SKY);
  await place(b, C.x + 30, C.z - 17, WEST, 0);
  a.clear(); b.clear();
  return r;
}
for (const id of ['standard', 'rapid', 'burst', 'spread', 'precision', 'launcher']) {
  const e = EQUIPMENT_BY_ID[id];
  await check(`${e.name}: fire rate${e.burst > 1 ? ', burst' : ''}${e.pellets > 1 ? ', spread pellets' : ''}, paintballs count, reload`, async () => {
    const { bots } = await duel(id);
    const [a] = bots;
    const T = 2.0;
    const h0 = a.me.hopper0;
    assert(h0 === e.magazine && a.me.carried0 === e.total - e.magazine, `hopper/carried at spawn ${h0}/${a.me.carried0}`);
    a.in.fire = true;
    await until(() => a.events('shot').length, 2000, 'first shot');
    const t0 = a.events('shot')[0].at;
    await sleep(T * 1000);
    a.in.fire = false;
    await sleep(150);
    const shots = a.events('shot').filter((s) => s.m.o === a.id && s.at - t0 <= T * 1000 + 20);
    const pulls = Math.min(Math.floor(T * e.rate) + 1, e.magazine / e.burst);
    const expect = Math.min(pulls * e.burst, e.magazine) * e.pellets;
    assert(Math.abs(shots.length - expect) <= e.pellets * e.burst, `${shots.length} paintballs in ${T}s, expected ~${expect}`);
    const used = Math.round(shots.length / e.pellets);
    const allShots = a.events('shot').filter((s) => s.m.o === a.id).length / e.pellets;
    assert(a.me.hopper0 === e.magazine - allShots || (a.me.reloadUntil > 0) || a.me.hopper0 === e.magazine, `hopper ${a.me.hopper0} after ${allShots} shells`);
    if (e.pellets > 1) {
      const first = a.events('shot').filter((s) => s.m.o === a.id).slice(0, e.pellets);
      const dirs = new Set(first.map((s) => `${s.m.vx},${s.m.vy},${s.m.vz}`));
      assert(dirs.size === e.pellets, `spread pellets not spread (${dirs.size} directions)`);
    }
    if (e.burst > 1) {
      const times = shots.map((s) => s.at);
      let groups = 1; for (let i = 1; i < times.length; i++) if (times[i] - times[i - 1] > 200) groups++;
      assert(Math.abs(groups - Math.ceil(shots.length / e.burst)) <= 1, `burst groups ${groups} for ${shots.length} paintballs`);
    }
    // empty the hopper, then reload
    a.in.fire = true;
    await until(() => a.me.hopper0 === 0 || a.me.reloadUntil > 0, 12000, 'hopper empty');
    a.in.fire = false;
    await until(() => a.me.reloadUntil > 0 || a.me.hopper0 === e.magazine, 2000, 'auto reload starts');
    const carriedBefore = a.me.carried0 + (a.me.reloadUntil > 0 ? 0 : e.magazine);
    await until(() => a.me.reloadUntil === 0 && a.me.hopper0 === e.magazine, (e.reload + 1.5) * 1000, 'reload done');
    assert(a.me.carried0 <= carriedBefore && a.me.carried0 >= 0, 'carried paintballs not reduced');
    assert(used > 0, 'nothing fired');
    await leaveAll(bots);
  });
}

await check('switching blasters: cooldown before the new one fires; R reloads', async () => {
  const { bots } = await duel('standard', 'precision');
  const [a] = bots;
  a.in.slot = 1;
  await until(() => a.me.slot === 1 && a.me.equip === 'precision', 2000, 'switched');
  const switchedAt = a.state.now; const until0 = a.me.switchUntil;
  assert(Math.abs(until0 - switchedAt - EQUIPMENT_BY_ID.precision.cooldown) < 0.15, `cooldown ${until0 - switchedAt}`);
  a.in.fire = true;
  await until(() => a.events('shot').length, 3000, 'shot after cooldown');
  a.in.fire = false;
  const firstShotNow = a.state.now;
  assert(firstShotNow >= until0 - 0.06, 'fired during the switch cooldown');
  assert(a.events('shot')[0].m.e === 'precision', 'wrong blaster fired');
  await sleep(1200);
  const h = a.me.hopper1;
  a.in.reload = true;
  await until(() => a.me.hopper1 === EQUIPMENT_BY_ID.precision.magazine && a.me.carried1 < EQUIPMENT_BY_ID.precision.total - EQUIPMENT_BY_ID.precision.magazine, 5000, `R reload (hopper was ${h})`);
  await leaveAll(bots);
});

// ---------- hits are the server's ----------
await check('one paintball paints once (no duplicate hits); a client claiming hits has no effect', async () => {
  const { bots } = await duel('standard');
  const [a, b] = bots;
  await place(b, C.x + 5, LANE, WEST);
  await place(a, C.x - 5, LANE, EAST);
  a.aimAt({ x: C.x - 5, z: LANE }, { x: C.x + 5, z: LANE });
  for (let i = 0; i < 20; i++) a.send('hit', { target: b.id, amount: 100, precision: true });
  await sleep(400);
  assert(b.me.paint === 0 && b.me.alive && a.me.score === 0, 'claimed hits painted the target');
  a.clear();
  await a.tap();
  await until(() => b.me.paint > 0, 3000, 'target painted');
  await sleep(500);
  assert(a.events('shot').length === 1, `${a.events('shot').length} paintballs for one tap`);
  assert(Math.abs(b.me.paint - EQUIPMENT_BY_ID.standard.tag) < 0.01, `paint ${b.me.paint}, expected ${EQUIPMENT_BY_ID.standard.tag}`);
  assert(a.events('hit').length === 1, 'hit confirmed more than once');
  await leaveAll(bots);
});

await check('a bunker between shooter and target blocks the paintball', async () => {
  const { bots } = await duel('standard');
  const [a, b] = bots;
  await place(b, C.x + 5, C.z, WEST);
  await place(a, C.x - 5, C.z, EAST);
  a.aimAt({ x: C.x - 5, z: C.z }, { x: C.x + 5, z: C.z });
  for (let i = 0; i < 3; i++) { await a.tap(); await sleep(300); }
  await sleep(300);
  const imp = a.events('impact');
  assert(imp.length >= 3 && imp.every((x) => x.m.k === 'solid' && x.m.s === MEDC.solids[0].id), `impacts ${JSON.stringify(imp.map((x) => x.m.k))}`);
  assert(b.me.paint === 0, 'painted through the bunker');
  await leaveAll(bots);
});

await check('precision paint hit on the head multiplies the paint', async () => {
  const { bots } = await duel('precision');
  const [a, b] = bots;
  await place(b, C.x + 5, LANE, WEST);
  await place(a, C.x - 5, LANE, EAST);
  a.aimAt({ x: C.x - 5, z: LANE }, { x: C.x + 5, z: LANE }, 1.66);
  await a.tap();
  await until(() => a.events('hit').length, 3000, 'hit');
  assert(a.events('hit')[0].m.p === true, 'not a precision paint hit');
  await until(() => !b.me.alive, 2000, 'tagged by one precision paint hit (60 × 1.7)');
  await leaveAll(bots);
});

await check('spawn protection: cannot be painted and cannot fire', async () => {
  const r = await makeRoom(srv, 2, { test: { protection: 2.5 } });
  await startMatch(r.bots);
  const [a, b] = r.bots;
  // a is protected: cannot fire
  a.in.fire = true; a.in.pitch = SKY;
  await sleep(500);
  assert(!a.events('shot').length, 'fired while protected');
  a.in.fire = false;
  // b still protected: place without removing protection and shoot it with a (unprotected now)
  await place(b, C.x + 5, LANE, WEST, 0, false);
  await place(a, C.x - 5, LANE, EAST);
  a.aimAt({ x: C.x - 5, z: LANE }, { x: C.x + 5, z: LANE });
  assert(b.state.now < b.me.protectedUntil, 'target protection already over');
  await a.tap();
  await until(() => a.events('hit').length, 3000, 'protected hit reported');
  assert(a.events('hit')[0].m.protected === true && b.me.paint === 0, 'protected player was painted');
  await leaveAll(r.bots);
});

await check('no friendly fire (the paintball passes a teammate and paints the opponent behind); voice signalling stays inside the team', async () => {
  const { bots, host } = await makeRoom(srv, 8, { mode: '4v4' });
  await startMatch(bots);
  const ps = host.state.players;
  const a = bots[0]; const mate = bots.find((b) => b !== a && ps.get(b.id).team === ps.get(a.id).team); const foe = bots.find((b) => ps.get(b.id).team !== ps.get(a.id).team);
  await place(mate, C.x + 1, LANE, WEST);
  await place(foe, C.x + 6, LANE, WEST);
  await place(a, C.x - 5, LANE, EAST);
  a.aimAt({ x: C.x - 5, z: LANE }, { x: C.x + 6, z: LANE });
  await a.tap();
  await until(() => foe.me.paint > 0, 3000, 'opponent behind the teammate painted');
  assert(mate.me.paint === 0, 'teammate painted');
  assert(ps.get(a.id).score === 0, 'points for a non-tag');
  // voice: signalling relayed to the teammate, never to an opponent
  for (const b of [a, mate, foe]) b.send('voice', { on: true });
  await until(() => [a, mate, foe].every((b) => ps.get(b.id).voice), 2000, 'voice on');
  a.send('rtc', { to: mate.id, kind: 'offer', data: { type: 'offer', sdp: 'x' } });
  a.send('rtc', { to: foe.id, kind: 'offer', data: { type: 'offer', sdp: 'x' } });
  await until(() => mate.events('rtc').length, 2000, 'teammate got the offer');
  await sleep(300);
  assert(!foe.events('rtc').length, 'opponent received voice signalling');
  assert(mate.events('rtc')[0].m.from === a.id, 'relay lost the sender');
  await leaveAll(bots);
});

await check('splash launcher: area paint with falloff, blocked by cover', async () => {
  const r = await makeRoom(srv, 3, { loadouts: [['launcher', 'standard']] });
  await startMatch(r.bots);
  const [a, near, behind] = r.bots;
  const face = MEDC.solids[0].minX; // the tower's west face
  await place(near, face - 1.4, C.z + 2.2, 0);
  await place(behind, MEDC.solids[0].maxX + 1.4, C.z, 0);
  await place(a, C.x - 10, C.z, EAST);
  a.in.yaw = EAST; a.in.pitch = solvePitch('launcher', { x: C.x - 10, z: C.z }, { x: face, z: C.z }, 1.2);
  await a.tap();
  await until(() => a.events('impact').length, 3000, 'launcher impact');
  const imp = a.events('impact')[0].m;
  assert(imp.k === 'solid', `shell hit ${imp.k}`);
  await until(() => near.me.paint > 0, 2000, 'splash paint on the player beside the burst');
  await sleep(300);
  const e = EQUIPMENT_BY_ID.launcher;
  assert(near.me.paint < e.tag && near.me.paint >= e.tag * 0.25, `splash paint ${near.me.paint} not scaled by distance`);
  assert(behind.me.paint === 0, 'splash went through the bunker');
  await leaveAll(r.bots);
});

// ---------- tags, assists, respawn, scoring, timer ----------
await check('tags, assists and respawn', async () => {
  const r = await makeRoom(srv, 3);
  await startMatch(r.bots);
  const [a, b, c] = r.bots;
  await place(c, C.x, LANE, 0);
  await place(a, C.x - 6, LANE, EAST); a.aimAt({ x: C.x - 6, z: LANE }, { x: C.x, z: LANE });
  await place(b, C.x + 6, LANE, WEST); b.aimAt({ x: C.x + 6, z: LANE }, { x: C.x, z: LANE });
  await a.tap();
  await until(() => c.me.paint >= 34, 3000, 'a paints c');
  await b.tap(); await sleep(350); await b.tap();
  await until(() => !c.me.alive, 3000, 'c tagged');
  const s = a.state.players;
  assert(s.get(b.id).tags === 1 && s.get(b.id).score === SCORE.tag, `tagger ${s.get(b.id).tags}/${s.get(b.id).score}`);
  assert(s.get(a.id).assists === 1 && s.get(a.id).score === SCORE.assist, `assist ${s.get(a.id).assists}/${s.get(a.id).score}`);
  assert(s.get(c.id).timesTagged === 1, 'times tagged');
  const tagEv = a.events('tag')[0].m;
  assert(tagEv.by === b.id && tagEv.target === c.id && tagEv.assists.includes(a.id), 'tag event');
  await until(() => c.me.alive, 3000, 'respawn');
  const spot = spawnSet(MEDC, 0).find((q) => Math.hypot(q.x - c.me.x, q.z - c.me.z) < 0.01);
  assert(spot && c.me.paint === 0, 'respawned off the registry or still painted');
  await leaveAll(r.bots);
});

async function tagOut(a, b, x = C.x) {
  await place(b, x + 5, LANE, WEST);
  await place(a, x - 5, LANE, EAST);
  a.aimAt({ x: x - 5, z: LANE }, { x: x + 5, z: LANE });
  for (let i = 0; i < 6 && b.me.alive; i++) { await a.tap(); await sleep(320); }
  await until(() => !b.me.alive, 3000, 'tag');
}

await check('timer end: the leader wins; completion and win bonuses; results kept until the room closes; rematch resets', async () => {
  const r = await makeRoom(srv, 2, { duration: 4 });
  await startMatch(r.bots);
  const [a, b] = r.bots;
  await tagOut(a, b);
  await until(() => a.state.phase === 'results', 8000, 'results');
  const R = a.state.results;
  const pa = a.state.players.get(a.id); const pb = a.state.players.get(b.id);
  assert(R.ready && !R.draw && R.winner === 'P1' && R.runnerUp === 'P2' && R.mvp === a.id, `results ${R.winner}/${R.runnerUp}/${R.mvp}`);
  assert(pa.score === SCORE.tag + SCORE.completion + SCORE.win && pb.score === SCORE.completion, `scores ${pa.score}/${pb.score}`);
  assert(R.rankings.length === 2 && R.rankings[0].tags === 1 && R.rankings[1].timesTagged === 1, 'rankings');
  assert(pa.used.includes('standard'), 'equipment used not recorded');
  await sleep(1500);
  assert(a.state.results.ready && a.state.phase === 'results', 'results not kept');
  a.send('rematch', {});
  await until(() => a.state.phase === 'countdown' || a.state.phase === 'playing', 3000, 'rematch');
  assert([...a.state.players.values()].every((p) => p.score === 0 && p.tags === 0), 'rematch kept scores');
  await leaveAll(r.bots);
});

await check('time up on a tie → overtime; the first lead change wins', async () => {
  const r = await makeRoom(srv, 2, { duration: 1, test: { overtime: 20 } });
  await startMatch(r.bots);
  const [a, b] = r.bots;
  await until(() => a.state.phase === 'overtime', 4000, 'overtime');
  const t0 = Date.now();
  await tagOut(a, b);
  await until(() => a.state.phase === 'results', 3000, 'results right after the lead change');
  assert(Date.now() - t0 < 15000 && a.state.results.winner === 'P1', 'overtime winner');
  await leaveAll(r.bots);
});

await check('overtime with no score → draw; return to lobby', async () => {
  const r = await makeRoom(srv, 2, { duration: 1, test: { overtime: 1 } });
  await startMatch(r.bots);
  const [a] = r.bots;
  await until(() => a.state.phase === 'overtime', 4000, 'overtime');
  await until(() => a.state.phase === 'results', 4000, 'results');
  assert(a.state.results.draw && a.state.results.winner === '', 'not a draw');
  assert([...a.state.players.values()].every((p) => p.score === SCORE.completion), 'draw scores');
  a.send('lobby', {});
  await until(() => a.state.phase === 'lobby' && !a.state.teamsLocked, 3000, 'back to the lobby');
  await leaveAll(r.bots);
});

// ---------- connection life ----------
await check('disconnect + reconnect restores the player (slot held)', async () => {
  const r = await makeRoom(srv, 2, { test: { reconnect: 5 } });
  await startMatch(r.bots);
  const [a, b] = r.bots;
  await tagOut(a, b);
  const id = b.id; const token = b.room.reconnectionToken;
  b.room.reconnection.enabled = false;
  b.stop();
  b.room.connection.close(3001, 'network drop');
  await until(() => a.state.players.get(id)?.connected === false, 3000, 'marked disconnected');
  const back = await new Client(r.url).reconnect(token);
  await until(() => a.state.players.get(id)?.connected === true, 3000, 'reconnected');
  assert(back.sessionId === id, 'new session after reconnect');
  const p = back.state.players.get(id);
  assert(p && p.timesTagged === 1 && p.nickname === 'P2', 'player not restored');
  await back.leave(true);
  await leaveAll([a]);
});

await check('a dropped player whose hold expires is removed', async () => {
  const r = await makeRoom(srv, 2, { test: { reconnect: 1 } });
  const [a, b] = r.bots;
  b.room.reconnection.enabled = false; b.stop();
  b.room.connection.close(3001, 'gone');
  await until(() => a.state.players.size === 1, 4000, 'slot released');
  await leaveAll([a]);
});

await check('room disposal: host closes, idle close, empty room; no leaked timers', async () => {
  await until(() => liveRooms.size === 0, 6000, `earlier rooms disposed (${liveRooms.size} left)`);
  const r = await makeRoom(srv, 3);
  assert(liveRooms.size === 1, 'room not live');
  r.host.send('close', {});
  await until(() => r.bots.every((b) => b.left !== null), 3000, 'everyone left');
  assert(r.bots.every((b) => b.left === 4101), `close codes ${r.bots.map((b) => b.left)}`);
  await until(() => liveRooms.size === 0, 3000, 'closed room disposed');
  const idle = await makeRoom(srv, 2, { test: { idle: 1 } });
  for (const b of idle.bots) b.stop(); // nobody sends anything
  await until(() => idle.bots.every((b) => b.left === 4102), 4000, 'idle close');
  await until(() => liveRooms.size === 0, 3000, 'idle room disposed');
  const empty = await makeRoom(srv, 2);
  await leaveAll(empty.bots);
  await until(() => liveRooms.size === 0, 3000, 'empty room disposed');
  let now = timersNow();
  for (let i = 0; i < 40 && now > baseline; i++) { await sleep(100); now = timersNow(); }
  if (process.env.DEBUG_TIMERS) console.log('timers', baseline, now);
  assert(now <= baseline, `timers: ${now} now vs ${baseline} before any room`);
});

const failed = summary();
await srv.close();
process.exit(failed ? 1 : 0);
