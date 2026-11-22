// Campus Royale against the real server (in this process) with real @colyseus/sdk clients: the whole-campus
// geometry, landing, supplies, paint bombs, gear, cleaning, the zone, eliminations, spectating, results.
//   node tests/mp/royale.mjs        (part of npm run test:mp)
import fs from 'node:fs';
import { SCORE } from '../../js/paintball/rules.js';
import { EQUIPMENT_BY_ID, PAINT_MAX } from '../../js/paintball/equipment.js';
import { CAMPUS } from '../../js/paintball/arena.js';
import { readSpots, ROYALE } from '../../js/paintball/royale.js';
import { BOMB, KITS, GEAR, CARRY, bombPaint } from '../../js/paintball/items.js';
import { stepBomb, throwVelocity, INPUT_DT } from '../../js/paintball/sim.js';
import { MOVE } from '../../js/paintball/rules.js';
import { liveRooms } from '../../server/PaintballRoom.js';
import { loadCampus } from '../../server/geo.js';
import { sleep, until, assert, check, summary, boot, makeRoom, startMatch, leaveAll, place } from './helpers.mjs';

const srv = await boot();
const { geo } = loadCampus();
const spots = readSpots(CAMPUS.spots);
const probes = JSON.parse(fs.readFileSync(new URL('../../js/paintball/data/campus-probes.json', import.meta.url), 'utf8')).probes;
const timersNow = () => process.getActiveResourcesInfo().filter((r) => r === 'Timeout').length;
const baseline = timersNow();
const FAST = { landing: 0.4, countdown: 0.2, protection: 0, down: 30, revive: 0.6 };
// an open lane on the Med-C cricket ground (flat, no colliders)
const MC = { x: 395, z: 650 };
const EAST = -Math.PI / 2; const WEST = Math.PI / 2; const NORTH = 0;

async function royale(n, opts = {}) {
  const r = await makeRoom(srv, n, { arena: 'campus', ...opts, test: { ...FAST, ...(opts.test || {}) } });
  await startMatch(r.bots);
  return r;
}
const aim = (bot, from, to, h = 1.1) => { const dx = to.x - from.x; const dz = to.z - from.z; bot.in.yaw = Math.atan2(-dx, -dz); bot.in.pitch = Math.atan2(h - 1.6, Math.hypot(dx, dz)); };
// steer a bot through waypoints [x, z] (server-simulated movement), walking
async function walk(bot, pts, { ms = 20000, run = false } = {}) {
  const t0 = Date.now();
  bot.in.run = run;
  for (const [x, z] of pts) {
    let last = null; let still = 0;
    for (;;) {
      const me = bot.me; const dx = x - me.x; const dz = z - me.z; const d = Math.hypot(dx, dz);
      if (d < 0.3 || Date.now() - t0 > ms) break;
      bot.in.yaw = Math.atan2(-dx, -dz); bot.in.f = 1;
      if (last && Math.hypot(me.x - last.x, me.z - last.z) < 0.01) { if (++still > 25) break; } else still = 0;
      last = { x: me.x, z: me.z };
      await sleep(40);
    }
  }
  bot.in.f = 0; bot.in.run = false;
  await sleep(300);
  return { x: bot.me.x, y: bot.me.y, z: bot.me.z };
}
const lootNear = (bot, item, x, z) => [...bot.state.loot.entries()].find(([, l]) => l.item === item && Math.hypot(l.x - x, l.z - z) < 0.5);
async function putLoot(bot, item, x, z, n = 1, y) {
  const tag = Math.random().toString(36).slice(2);
  bot.send('test:loot', { item, x, z, n, y, tag });
  const ev = await until(() => bot.events('test:loot').find((e) => e.m.tag === tag), 3000, 'test loot');
  await until(() => bot.state.loot.has(ev.m.id), 3000, 'loot synced');
  return ev.m.id;
}

// ---------- start: landing ----------
await check('Campus Royale: landing phase, picks honoured, auto-placed players far apart, everyone on a verified spot, weak start, loot and zone', async () => {
  const r = await makeRoom(srv, 4, { arena: 'campus', test: { ...FAST, landing: 1.5 } });
  for (const b of r.bots) b.send('ready', { ready: true });
  await until(() => [...r.host.state.players.values()].every((p) => p.ready), 3000, 'ready');
  r.host.send('start', {});
  await until(() => r.host.state.phase === 'landing', 3000, 'landing phase');
  const pick = spots.drops.find((d) => d.name.includes('Library') && !d.indoor) || spots.drops[10];
  r.bots[0].send('land', { id: pick.id });
  r.bots[1].send('land', { x: pick.x + 3, z: pick.z + 2 }); // snaps to the nearest drop: the same one → moved to the nearest free one
  r.bots[2].send('land', { x: 5000, z: 5000 }); // nowhere near campus
  await until(() => r.bots[2].events('error').some((e) => e.m.code === 'land'), 2000, 'bad landing refused');
  await until(() => r.host.state.players.get(r.bots[0].id).drop === pick.id, 2000, 'choice stored');
  await until(() => r.host.state.phase === 'playing', 6000, 'playing');
  const ps = r.bots.map((b) => r.host.state.players.get(b.id));
  assert(Math.hypot(ps[0].x - pick.x, ps[0].z - pick.z) < 0.01, 'picked drop not honoured');
  assert(ps[1].drop !== pick.id && Math.hypot(ps[1].x - pick.x, ps[1].z - pick.z) < 80, `second pick of the same drop not moved to a free one nearby (${ps[1].drop})`);
  const onRegistry = (p) => spots.drops.some((d) => [d, ...d.slots].some((q) => Math.hypot(q.x - p.x, q.z - p.z) < 0.02 && Math.abs(q.y - p.y) < 0.05));
  for (const p of ps) assert(onRegistry(p), `${p.nickname} not on a registry landing spot`);
  assert(Math.hypot(ps[2].x - ps[3].x, ps[2].z - ps[3].z) > 150 && Math.hypot(ps[2].x - pick.x, ps[2].z - pick.z) > 150, 'auto-placed players not spread out');
  for (const p of ps) assert(p.primary === 'standard' && p.secondary === '' && p.hopper0 === ROYALE.start.hopper && p.carried0 === 0 && p.alive && !p.out, `start loadout ${p.primary}/${p.secondary}/${p.hopper0}/${p.carried0}`);
  const s = r.host.state;
  assert(s.loot.size > 250, `only ${s.loot.size} supplies on the ground`);
  assert(s.zone.r > 900 && s.zone.nr === 600 && s.zone.phase === 1 && s.standing === 4 && s.groups === 4, `zone ${s.zone.r}/${s.zone.nr} standing ${s.standing}`);
  assert(s.geo === geo.hash, 'state does not carry the geometry hash');
  r.bots[3].send('land', { id: 3 });
  await until(() => r.bots[3].events('error').some((e) => e.m.code === 'not-landing'), 2000, 'landing after the start refused');
  await leaveAll(r.bots);
});

await check('squads land together at the spot one member picked', async () => {
  const r = await makeRoom(srv, 8, { mode: '4v4', arena: 'campus', test: { ...FAST, landing: 1.2 } });
  for (const b of r.bots) b.send('ready', { ready: true });
  await until(() => [...r.host.state.players.values()].every((p) => p.ready), 3000, 'ready');
  r.host.send('start', {});
  await until(() => r.host.state.phase === 'landing', 3000, 'landing');
  const pick = spots.drops.find((d) => d.slots.length >= 4 && !d.indoor);
  const leader = r.bots[0]; const team = r.host.state.players.get(leader.id).team;
  leader.send('land', { id: pick.id });
  await until(() => r.host.state.phase === 'playing', 6000, 'playing');
  const s = r.host.state;
  const mates = [...s.players.values()].filter((p) => p.team === team); const foes = [...s.players.values()].filter((p) => p.team !== team);
  for (const p of mates) assert(Math.hypot(p.x - pick.x, p.z - pick.z) < 8, `${p.nickname} landed ${Math.hypot(p.x - pick.x, p.z - pick.z).toFixed(1)} m from the squad's pick`);
  for (const p of foes) for (const q of foes) assert(Math.hypot(p.x - q.x, p.z - q.z) < 40, 'the other squad split up');
  assert(Math.hypot(foes[0].x - pick.x, foes[0].z - pick.z) > 100, 'the other squad landed on top of this one');
  await leaveAll(r.bots);
});

// ---------- geometry on the server ----------
await check('geometry: a building wall stops a player and paintballs; stairs up and down (Library, NAB portal, Bhawan); the sunken NAB court', async () => {
  const r = await royale(2);
  const [a, b] = r.bots;
  // the Library foyer's north wall: run straight at it
  const wall = probes.find((q) => q.expect?.wall);
  await place(a, wall.start[0], wall.start[2], NORTH, 0, true, wall.start[1]);
  a.in.f = 1; a.in.run = true; await sleep(1500); a.in.f = 0; await sleep(200);
  assert(Math.abs(a.me.z - wall.end[2]) < 0.45, `ran into the wall and stopped at z ${a.me.z.toFixed(2)} (life-sim ${wall.end[2]})`);
  // a paintball from there at a player on the other side hits the wall
  await place(b, a.me.x, a.me.z - 2.0, 0, 0, true, 0.6);
  assert(Math.abs(b.me.y - 0.6) < 0.05, `the far side of the wall is the Library floor (${b.me.y})`);
  a.clear();
  aim(a, a.me, b.me, 1.2);
  await a.tap(); await sleep(600);
  const imp = a.events('impact');
  assert(imp.length && imp[0].m.k === 'solid', `paintball impact ${JSON.stringify(imp.map((e) => e.m.k))}`);
  assert(b.me.paint === 0, 'painted through a building wall');
  // stairs: follow the life-sim player's own walks
  for (const name of ['Library: south twin stair up to the bridge', 'NAB: Portal 02 down the stair', 'NAB: back up the Portal 02 stair', 'main stair, first floor down']) {
    const pr = probes.find((q) => q.name.includes(name));
    await place(a, pr.start[0], pr.start[2], 0, 0, true, pr.start[1]);
    const pts = pr.waypoints || pr.path.slice(1).map(([x, , z]) => [x, z]);
    const end = await walk(a, pts, { ms: 40000 });
    assert(Math.abs(end.y - pr.end[1]) < 0.15, `${pr.name}: server y ${end.y.toFixed(2)}, life-sim ${pr.end[1]}`);
  }
  // the sunken NAB court: placed on it, the floor is -4.5
  const court = spots.supplies.find((q) => Math.abs(q.y + 4.5) < 0.01);
  await place(a, court.x, court.z, 0, 0, true, court.y);
  assert(Math.abs(a.me.y + 4.5) < 0.05, `NAB court floor ${a.me.y}`);
  assert(geo.groundAt(court.x, court.z) <= -4.5, 'the court is sunken ground');
  await leaveAll(r.bots);
});

// ---------- supplies ----------
await check('loot pick-up: distance, line of sight, two players grabbing at once (one wins), inventory limits, blaster swap', async () => {
  const r = await royale(3);
  const [a, b, c] = r.bots;
  await place(a, MC.x, MC.z, EAST); await place(b, MC.x + 1, MC.z + 0.8, WEST); await place(c, MC.x + 30, MC.z, WEST);
  // too far
  const far = await putLoot(a, 'paintbomb', MC.x + 6, MC.z);
  a.send('pick', { id: far });
  await until(() => a.events('error').some((e) => e.m.code === 'far'), 2000, 'too far refused');
  assert(a.state.loot.has(far) && a.me.paintbomb === 0, 'picked up from 6 m');
  // behind a wall (line of sight): the Library foyer wall, item on the far side within reach
  const wall = probes.find((q) => q.expect?.wall);
  await place(c, wall.end[0], wall.end[2], NORTH, 0, true, wall.start[1]);
  const behind = await putLoot(c, 'wipes', wall.end[0], wall.end[2] - 1.6, 1, 0.6);
  c.send('pick', { id: behind });
  await until(() => c.events('error').some((e) => e.m.code === 'sight' || e.m.code === 'far'), 2000, 'blocked pick refused');
  assert(c.state.loot.has(behind) && c.me.wipes === 0, 'picked up through a wall');
  // race: a and b both grab the same item in the same instant
  const prize = await putLoot(a, 'kit', MC.x + 0.5, MC.z + 0.4);
  a.send('pick', { id: prize }); b.send('pick', { id: prize });
  await until(() => !a.state.loot.has(prize), 2000, 'prize taken');
  await sleep(300);
  const got = [a.me.kit, b.me.kit];
  assert(got[0] + got[1] === 1, `the item was duplicated or lost: ${got}`);
  const loser = got[0] ? b : a;
  assert(loser.events('error').some((e) => e.m.code === 'gone'), 'the slower player was not told');
  // limits: paint bombs (max 4)
  a.send('test:give', { paintbomb: CARRY.paintbomb });
  await until(() => a.me.paintbomb === CARRY.paintbomb, 2000, 'give');
  const extra = await putLoot(a, 'paintbomb', MC.x, MC.z + 0.5);
  a.send('pick', { id: extra });
  await until(() => a.events('error').some((e) => e.m.code === 'full'), 2000, 'full refused');
  assert(a.me.paintbomb === CARRY.paintbomb && a.state.loot.has(extra), 'carried more than the limit');
  // paintball packs top up to the carry limit and leave the rest on the ground
  a.send('test:give', { ammo: { standard: EQUIPMENT_BY_ID.standard.total - 15 } });
  await until(() => a.me.carried0 === EQUIPMENT_BY_ID.standard.total - 15, 2000, 'ammo given');
  const pack = await putLoot(a, 'ammo:standard', MC.x - 0.5, MC.z, 40);
  a.send('pick', { id: pack });
  await until(() => a.me.carried0 === EQUIPMENT_BY_ID.standard.total, 2000, 'ammo topped up');
  await until(() => a.state.loot.get(pack)?.n === 25, 2000, 'remainder left on the ground');
  // blasters: an empty slot fills; a third swaps with the one in hand, which drops
  const r1 = await putLoot(a, 'blaster:rapid', MC.x, MC.z - 0.5);
  a.send('pick', { id: r1 });
  await until(() => a.me.secondary === 'rapid', 2000, 'second blaster');
  const r2 = await putLoot(a, 'blaster:precision', MC.x + 0.3, MC.z - 0.5);
  a.send('pick', { id: r2 });
  await until(() => a.me.primary === 'precision' && a.me.equip === 'precision', 2000, 'swap');
  await until(() => lootNear(a, 'blaster:standard', a.me.x, a.me.z), 2000, 'the swapped blaster dropped');
  // gear: a better vest replaces yours, the old one drops; a worse one is refused
  const v2 = await putLoot(a, 'vest2', MC.x, MC.z + 0.2); a.send('pick', { id: v2 });
  await until(() => a.me.gearVest === 2, 2000, 'vest');
  const v1 = await putLoot(a, 'vest1', MC.x, MC.z + 0.2); a.send('pick', { id: v1 });
  await until(() => a.events('error').some((e) => e.m.code === 'have-better'), 2000, 'worse vest refused');
  // drop: the blaster in hand goes to the ground
  a.send('drop', { what: 'blaster' });
  await until(() => a.me.primary === '' && a.me.equip === 'rapid', 2000, 'dropped the blaster in hand');
  await leaveAll(r.bots);
});

// ---------- paint bombs ----------
await check('paint bombs: thrown in an arc, bounce and rest, ~2 s fuse, splash falls off with distance, walls block it', async () => {
  const r = await royale(4);
  const [a, near, far, out] = r.bots;
  const from = { x: MC.x - 8, z: MC.z };
  await place(a, from.x, from.z, EAST, 0.1);
  await sleep(300);
  // where will it come to rest? the same shared simulation the server runs
  const v = throwVelocity(EAST, 0.1);
  const sim = { x: from.x, y: a.me.y + MOVE.eye - 0.15, z: from.z, ...v, rest: false, bounces: 0 };
  let apex = sim.y;
  for (let t = 0; t < BOMB.fuse; t += 1 / 20) { stepBomb(sim, 1 / 20, CAMPUS); apex = Math.max(apex, sim.y); }
  assert(apex > a.me.y + MOVE.eye, 'no arc');
  await place(near, sim.x + 1.0, sim.z + 0.4, 0); await place(far, sim.x + 3.4, sim.z - 0.5, 0); await place(out, sim.x - 9, sim.z, 0);
  a.send('test:give', { paintbomb: 2 });
  await until(() => a.me.paintbomb === 2, 2000, 'bombs given');
  a.clear();
  a.send('throw', { kind: 'paintbomb' });
  const thrown = await until(() => a.events('bomb')[0], 2000, 'bomb thrown');
  const boom = await until(() => a.events('boom')[0], 4000, 'bomb burst');
  const fuse = (boom.at - thrown.at) / 1000;
  assert(Math.abs(fuse - BOMB.fuse) < 0.35, `fuse ${fuse.toFixed(2)} s`);
  assert(Math.hypot(boom.m.x - sim.x, boom.m.z - sim.z) < 0.6, `burst at ${boom.m.x},${boom.m.z}, the shared sim says ${sim.x.toFixed(2)},${sim.z.toFixed(2)}`);
  assert(a.me.paintbomb === 1, 'bomb not used up');
  await sleep(300);
  assert(near.me.paint > far.me.paint && far.me.paint > 0, `falloff: near ${near.me.paint}, far ${far.me.paint}`);
  assert(near.me.paint <= BOMB.paint && far.me.paint >= BOMB.paint * BOMB.min - 0.01, 'splash outside its range');
  assert(out.me.paint === 0, 'painted outside the splash radius');
  assert(a.me.paint === 0, 'the thrower painted by their own bomb');
  // a wall between the burst and a player: the Library foyer wall
  const wall = probes.find((q) => q.expect?.wall);
  await place(a, wall.end[0], wall.end[2] + 1.2, NORTH, -1.4, true, 0.6);
  await place(near, wall.end[0], wall.end[2] - 1.5, 0, 0, true, 0.6, 0);
  near.send('test:place', { x: wall.end[0], z: wall.end[2] - 1.5, y: 0.6, paint: 0, unprotect: true });
  await place(far, wall.end[0] + 1.2, wall.end[2] + 0.6, 0, 0, true, 0.6);
  far.send('test:place', { x: wall.end[0] + 1.2, z: wall.end[2] + 0.6, y: 0.6, paint: 0, unprotect: true });
  await until(() => near.me.paint === 0 && far.me.paint === 0, 2000, 'paint reset');
  a.clear();
  a.send('throw', { kind: 'paintbomb' });
  const b2 = await until(() => a.events('boom')[0], 4000, 'second burst');
  await sleep(300);
  const d = Math.hypot(b2.m.x - near.me.x, b2.m.z - near.me.z);
  assert(far.me.paint > 0, `the player on the burst's side was not painted (burst ${b2.m.x.toFixed(2)},${b2.m.z.toFixed(2)})`);
  assert(near.me.paint === 0, `painted through the wall (${d.toFixed(2)} m away)`);
  // smoke: bursts, paints nobody
  a.send('test:give', { smoke: 1 });
  await until(() => a.me.smoke === 1, 2000, 'smoke given');
  a.clear(); a.send('throw', { kind: 'smoke' });
  const sm = await until(() => a.events('boom')[0], 4000, 'smoke burst');
  assert(sm.m.k === 'smoke', 'smoke burst kind');
  await leaveAll(r.bots);
});

// ---------- gear, cleaning ----------
await check('protective gear reduces paint taken (vest: body, mask: precision paint hits)', async () => {
  const r = await royale(3);
  const [a, plain, armoured] = r.bots;
  armoured.send('test:give', { gearVest: 3 });
  await until(() => armoured.me.gearVest === 3, 2000, 'vest');
  for (const [t, z] of [[plain, MC.z], [armoured, MC.z + 6]]) {
    await place(t, MC.x + 6, z, WEST);
    await place(a, MC.x - 4, z, EAST);
    aim(a, { x: MC.x - 4, z }, { x: MC.x + 6, z });
    await a.tap();
    await until(() => t.me.paint > 0, 3000, 'painted');
    await sleep(400);
  }
  const e = EQUIPMENT_BY_ID.standard;
  assert(Math.abs(plain.me.paint - e.tag) < 0.01, `plain ${plain.me.paint}`);
  assert(Math.abs(armoured.me.paint - e.tag * (1 - GEAR.vest[3])) < 0.01, `vest L3 ${armoured.me.paint}`);
  // a precision paint hit (head) on a player with a level-2 mask
  armoured.send('test:give', { gearMask: 2 });
  armoured.send('test:place', { x: MC.x + 6, z: MC.z + 6, paint: 0, unprotect: true });
  await until(() => armoured.me.gearMask === 2 && armoured.me.paint === 0, 2000, 'mask on, paint reset');
  a.clear();
  aim(a, { x: MC.x - 4, z: MC.z + 6 }, { x: MC.x + 6, z: MC.z + 6 }, 1.66);
  await a.tap();
  await until(() => armoured.me.paint > 0, 3000, 'head hit');
  await sleep(300);
  assert(a.events('hit')[0]?.m.p === true, 'not a precision paint hit');
  assert(Math.abs(armoured.me.paint - e.tag * e.precision * (1 - GEAR.mask[2])) < 0.01, `mask L2 on a precision paint hit: ${armoured.me.paint}`);
  await leaveAll(r.bots);
});

await check('cleaning kits: wipes and kits take paint off over their channel time; firing interrupts', async () => {
  const r = await royale(2);
  const [a] = r.bots;
  await place(a, MC.x, MC.z, EAST, 1.2);
  a.send('test:place', { x: MC.x, z: MC.z, paint: 80, unprotect: true });
  a.send('test:give', { wipes: 2, kit: 1 });
  await until(() => a.me.paint === 80 && a.me.wipes === 2 && a.me.kit === 1, 2000, 'setup');
  a.send('use', { kind: 'wipes' });
  await until(() => a.me.channel === 'wipes', 1000, 'channel');
  await sleep((KITS.wipes.time - 0.6) * 1000);
  assert(a.me.paint === 80, 'cleaned before the channel ended');
  await until(() => a.me.paint === 80 - KITS.wipes.paint && a.me.wipes === 1, 2000, 'wipes cleaned 25');
  // firing interrupts
  a.send('use', { kind: 'wipes' });
  await until(() => a.me.channel === 'wipes', 1000, 'channel 2');
  await a.tap(80);
  await until(() => a.me.channel === '', 1000, 'interrupted');
  await sleep(KITS.wipes.time * 1000 + 300);
  assert(a.me.paint === 55 && a.me.wipes === 1, `interrupted cleaning still cleaned (${a.me.paint}, ${a.me.wipes})`);
  a.send('use', { kind: 'kit' });
  await until(() => a.me.paint === 0 && a.me.kit === 0, (KITS.kit.time + 1.5) * 1000, 'kit cleaned (to 0, not below)');
  await leaveAll(r.bots);
});

// ---------- zone ----------
await check('zone: shrinks in timed phases; paint builds up outside it; a zone tag is a round elimination', async () => {
  const r = await royale(3, { test: { zoneScale: 0.02 } });
  const [a, b, c] = r.bots;
  const s = a.state; const r0 = s.zone.r;
  await until(() => s.zone.shrinking, 4000, 'first shrink');
  await until(() => s.zone.phase >= 2, 5000, 'second phase');
  assert(s.zone.r < r0, `zone did not shrink (${s.zone.r})`);
  // pin a small zone on the Med-C ground; a and b inside, c outside
  a.send('test:zone', { x: MC.x, z: MC.z, r: 10, dps: 40 });
  await place(b, MC.x + 2, MC.z, 0); await place(c, MC.x + 40, MC.z, 0); await place(a, MC.x - 2, MC.z, 0);
  for (const [bot, x] of [[a, MC.x - 2], [b, MC.x + 2]]) bot.send('test:place', { x, z: MC.z, paint: 0, unprotect: true });
  await until(() => a.me.paint === 0 && b.me.paint === 0, 2000, 'paint reset inside the zone');
  await until(() => c.me.paint > 0, 2000, 'zone paint');
  await sleep(400);
  assert(b.me.paint === 0 && a.me.paint === 0, 'paint inside the zone');
  await until(() => c.me.out, 4000, 'zone elimination');
  assert(!c.me.alive && c.me.placement === 3, `placement ${c.me.placement}`);
  assert(a.events('tag').some((e) => e.m.target === c.id && e.m.zone), 'tag feed did not say the zone');
  await leaveAll(r.bots);
});

// ---------- eliminations, spectating, winning ----------
async function tagOut(a, t, x = MC.x, z = MC.z) {
  await place(t, x + 5, z, WEST);
  await place(a, x - 5, z, EAST);
  a.send('test:give', { primary: 'standard', hopper0: 20 });
  await sleep(150);
  aim(a, { x: x - 5, z }, { x: x + 5, z });
  for (let i = 0; i < 8 && !(t.me.out || t.me.down); i++) { await a.tap(); await sleep(320); }
  await until(() => t.me.out || t.me.down, 3000, 'tagged');
}

await check('free-for-all: a tag is a round elimination (no respawn), spectating, last player standing wins; placement, survival, scores', async () => {
  const r = await royale(3);
  const [a, b, c] = r.bots;
  await tagOut(a, b);
  assert(b.me.out && !b.me.alive && b.me.placement === 3, `b out ${b.me.out} placement ${b.me.placement}`);
  await sleep(1500);
  assert(b.me.out && !b.me.alive, 'respawned');
  const pos = { x: b.me.x, z: b.me.z }; b.in.f = 1; await sleep(500); b.in.f = 0;
  assert(Math.hypot(b.me.x - pos.x, b.me.z - pos.z) < 0.01, 'an eliminated player moved');
  assert(lootNear(a, 'blaster:standard', pos.x, pos.z), 'their supplies did not drop');
  b.send('spectate', { id: c.id });
  await until(() => b.me.watching === c.id, 2000, 'spectating');
  a.send('spectate', { id: c.id }); await sleep(300);
  assert(a.me.watching === '', 'a standing player switched to spectating');
  assert(a.state.standing === 2 && a.state.groups === 2, 'counts');
  await tagOut(a, c, MC.x, MC.z + 8);
  await until(() => a.state.phase === 'results', 3000, 'results');
  const R = a.state.results; const s = a.state.players;
  assert(R.winner === 'P1' && !R.draw && R.runnerUp === 'P3', `winner ${R.winner} runner-up ${R.runnerUp}`);
  assert(s.get(a.id).placement === 1 && s.get(c.id).placement === 2 && s.get(b.id).placement === 3, 'placements');
  assert(s.get(a.id).score === 2 * SCORE.tag + SCORE.completion + 2 * SCORE.place + SCORE.win, `winner score ${s.get(a.id).score}`);
  assert(s.get(b.id).score === SCORE.completion, `3rd score ${s.get(b.id).score}`);
  assert(R.rankings[0].id === a.id && R.rankings[0].placement === 1 && R.rankings[2].id === b.id, 'rankings by placement');
  assert(R.rankings[2].survived > 0 && R.rankings[2].survived < R.rankings[1].survived && R.rankings[0].survived >= R.rankings[1].survived, 'survival times');
  // rematch: a new landing; back to the lobby restores the lobby blaster choice
  a.send('rematch', {});
  await until(() => a.state.phase === 'landing' || a.state.phase === 'countdown' || a.state.phase === 'playing', 3000, 'rematch');
  assert([...a.state.players.values()].every((p) => !p.out && p.score === 0), 'rematch kept eliminations');
  await until(() => a.state.phase === 'playing', 5000, 'playing again');
  a.send('test:end', {});
  await until(() => a.state.phase === 'results', 3000, 'time cap ends it');
  assert(a.state.results.draw || a.state.results.winner, 'cap result');
  a.send('lobby', {});
  await until(() => a.state.phase === 'lobby', 3000, 'lobby');
  assert([...a.state.players.values()].every((p) => p.primary === 'standard' && p.secondary === 'rapid' && a.state.loot.size === 0), 'lobby loadout not restored');
  await leaveAll(r.bots);
});

await check('squads: no friendly fire; a fully painted squadmate is down and can be cleaned off; down too long → out; last squad standing wins', async () => {
  const r = await royale(8, { mode: '4v4', test: { down: 1.5 } });
  const s = r.host.state;
  const A = r.bots.filter((b) => s.players.get(b.id).team === 0); const B = r.bots.filter((b) => s.players.get(b.id).team === 1);
  // friendly fire: none
  await place(A[1], MC.x + 5, MC.z, WEST);
  await place(A[0], MC.x - 5, MC.z, EAST);
  aim(A[0], { x: MC.x - 5, z: MC.z }, { x: MC.x + 5, z: MC.z });
  await A[0].tap(); await sleep(600);
  assert(A[1].me.paint === 0, 'a squadmate was painted');
  // B0 down, cleaned off by B1
  await tagOut(A[0], B[0]);
  assert(B[0].me.down && B[0].me.alive && !B[0].me.out, 'not down');
  await place(B[1], B[0].me.x + 1, B[0].me.z, 0);
  B[1].send('revive', { id: B[0].id });
  await until(() => !B[0].me.down, 3000, 'cleaned off');
  assert(B[0].me.paint === ROYALE.revivePaint && B[0].me.alive, `after clean-off paint ${B[0].me.paint}`);
  assert(A[0].events('revived').length === 1, 'revived event');
  // down too long → out
  await tagOut(A[0], B[0]);
  await until(() => B[0].me.out, 4000, 'down expired → out');
  // the zone takes the rest of squad B: they go down (others still standing), then out when the last one falls
  A[0].send('test:zone', { x: MC.x, z: MC.z, r: 20, dps: 80 });
  for (const [i, b] of A.entries()) await place(b, MC.x + i, MC.z - 3, 0);
  for (const [i, b] of B.slice(1).entries()) await place(b, MC.x + 60 + i * 2, MC.z, 0);
  await until(() => s.phase === 'results', 10000, 'results');
  const R = s.results;
  assert(R.winner === 'Team Pink' && R.teams[0].team === 0, `winner ${R.winner}`);
  for (const b of B) assert(s.players.get(b.id).placement === 2, 'squad placement');
  for (const b of A) assert(s.players.get(b.id).placement === 1, 'winners placement');
  await leaveAll(r.bots);
});

await check('a player who leaves mid-match is eliminated; room cleanup: close, idle, empty, no leaked timers', async () => {
  const r = await royale(3);
  const [a, b, c] = r.bots;
  await c.leave();
  await until(() => a.state.players.size === 2 && a.state.standing === 2, 3000, 'leaver gone');
  await b.leave();
  await until(() => a.state.phase === 'results', 3000, 'last one standing after the others left');
  assert(a.state.results.winner === 'P1', 'winner');
  await leaveAll([a]);
  await until(() => liveRooms.size === 0, 6000, `rooms disposed (${liveRooms.size} left)`);
  const r2 = await royale(2);
  r2.host.send('close', {});
  await until(() => r2.bots.every((x) => x.left === 4101), 3000, 'closed');
  await until(() => liveRooms.size === 0, 3000, 'closed room disposed');
  let now = timersNow();
  for (let i = 0; i < 40 && now > baseline; i++) { await sleep(100); now = timersNow(); }
  assert(now <= baseline, `timers: ${now} now vs ${baseline} before any room`);
});

const failed = summary();
await srv.close();
process.exit(failed ? 1 : 0);
