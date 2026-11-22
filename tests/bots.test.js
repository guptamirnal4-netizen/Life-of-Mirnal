// Bots: the campus navigation graph (committed data, its hash, paths a body can really walk: between landing and
// supply spots, into a building through a doorway, up stairs, down into the sunken NAB court), the Med-C field
// navigation, and the bot's decision helpers and brain (aim, paint bombs, blaster choice, loot, landing spread,
// difficulty, seeing only what is in line of sight). Pure Node.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { hashBytes } from '../js/paintball/geometry.js';
import { stepCampus, stepMove, aimDir, sweepArena, stepBomb, throwVelocity } from '../js/paintball/sim.js';
import { readSpots } from '../js/paintball/royale.js';
import { MEDC, solidDist } from '../js/paintball/arena.js';
import { EQUIPMENT_BY_ID } from '../js/paintball/equipment.js';
import { BOT_LEVELS, BOT_LEVELS_BY_ID, BOT_NAMES, BOT_LIMITS } from '../js/paintball/bots.js';
import { loadCampus } from '../server/geo.js';
import { loadNav, decodeNav, encodeNav, FieldNav } from '../server/bots/nav.js';
import { walkLine } from '../server/bots/manager.js';
import { Brain, solveAim, bombPitch, moveInput, pickSlot, lootValue, pickLanding, wrap } from '../server/bots/brain.js';
import { rng } from '../server/logic/match.js';

const DATA = new URL('../js/paintball/data/', import.meta.url);
const { geo, spots: raw } = loadCampus();
const spots = readSpots(raw);
const { graph: G, header: H, ms } = loadNav();

test('the committed bot navigation graph matches its header hash and this campus export (re-run node dev/build-bot-nav.mjs after campus changes)', () => {
  const bytes = new Uint8Array(zlib.gunzipSync(fs.readFileSync(new URL('bot-nav.bin', DATA))));
  assert.equal(hashBytes(bytes), H.hash);
  assert.equal(bytes.length, H.bytes);
  assert.equal(H.geoHash, geo.hash, 'built for the campus export the server loads');
  assert.equal(G.n, H.counts.nodes); assert.equal(G.e, H.counts.edges);
  assert.ok(G.n > 10000 && G.e > 5 * G.n, `graph looks complete (${G.n} nodes, ${G.e} edges)`);
  assert.equal(H.counts.coveredGridPoints, H.counts.gridPoints, 'one strongly connected graph covers every reachable grid point');
  const gz = fs.statSync(new URL('bot-nav.bin', DATA)).size;
  assert.ok(gz < 300 * 1024, `nav data is ${Math.round(gz / 1024)} KB gzip`);
  assert.ok(ms < 2000, `decoding took ${ms} ms`);
});

test('nav encode → decode round trip (dm / cm quantised, via points kept)', () => {
  const nodes = [[0, 0, 0], [10.04, -3.3, 1.25], [-406, 1380, -9]];
  const edges = [[[1, []], [2, [[5, 5, 0.5]]]], [[0, []]], [[0, [[1, 2, 3], [4, 5, 6]]]]];
  const g = decodeNav(encodeNav(nodes, edges));
  assert.equal(g.n, 3); assert.equal(g.e, 4);
  assert.deepEqual([g.x[1], g.z[1], g.y[1]].map((v) => Math.round(v * 100) / 100), [10, -3.3, 1.25]);
  assert.deepEqual(g.edgePoints(1).map((p) => p.map((v) => Math.round(v * 10) / 10)), [[5, 5, 0.5], [-406, 1380, -9]]);
  const r = g.search(1, 2); let path; while (!(path = r.step(10)));
  assert.equal(path.length, 3, 'one → zero → two (through the via point)');
});

// A body steering at each waypoint in turn, as a bot does: it cuts to the next waypoint once it can walk straight
// there, and when stuck it hops and side-steps, then goes back to the previous waypoint.
function walk(start, pts, maxSteps = 9000) {
  const p = { x: start.x, y: start.y, z: start.z, vy: 0 };
  let i = 0; let steps = 0; let last = { x: p.x, z: p.z, k: 0 }; let side = 0; let tries = 0; let cut = -1;
  while (i < pts.length && steps < maxSteps) {
    const [x, z, y] = pts[i]; const d = Math.hypot(x - p.x, z - p.z); const dy = Math.abs(y - p.y);
    if (d < 0.35 && dy < 1.6) { i++; continue; }
    if (d < 1.6 && dy < 1.6 && cut !== i && i + 1 < pts.length) { cut = i; if (walkLine(geo, p, pts[i + 1])) { i++; continue; } }
    const yaw = Math.atan2(-(x - p.x), -(z - p.z));
    stepCampus(p, side > 0 ? { f: 0.3, s: tries % 2 ? 1 : -1, yaw, run: true, jump: side === 15 } : { f: 1, s: 0, yaw, run: true }, 1 / 30, geo);
    if (side > 0) side--;
    steps++;
    if (steps - last.k >= 30) {
      if (Math.hypot(p.x - last.x, p.z - last.z) < 0.4) { tries++; side = 15; if (tries % 3 === 0 && i > 0) { i--; cut = i; } if (tries > 12) break; }
      last = { x: p.x, z: p.z, k: steps };
    }
  }
  return { ok: i >= pts.length, p, steps };
}
function route(a, b) {
  const s = G.near(a.x, a.z, a.y, 12).find(([i]) => walkLine(geo, a, G.node(i)));
  const t = G.near(b.x, b.z, b.y, 15).find(([i]) => walkLine(geo, { x: G.x[i], y: G.y[i], z: G.z[i] }, [b.x, b.z, b.y]));
  assert.ok(s && t, `nav nodes near ${a.name} and ${b.name}`);
  const q = G.search(s[0], t[0]); let r; while (!(r = q.step(50000)));
  assert.ok(r.length || s[0] === t[0], `a path from ${a.name} to ${b.name}`);
  return { pts: [G.node(s[0]), ...r, [b.x, b.z, b.y]], expanded: q.expanded };
}
const arrive = (a, b, label) => {
  const { pts } = route(a, b);
  const w = walk(a, pts);
  assert.ok(w.ok, `${label}: stuck at ${w.p.x.toFixed(1)}, ${w.p.z.toFixed(1)}, ${w.p.y.toFixed(1)}`);
  assert.ok(Math.hypot(w.p.x - b.x, w.p.z - b.z) < 0.6 && Math.abs(w.p.y - b.y) < 0.3, `${label}: ended at ${w.p.x.toFixed(1)}, ${w.p.z.toFixed(1)}, y ${w.p.y.toFixed(2)} (wanted y ${b.y})`);
  return pts;
};

test('paths between sample landing and supply spots are found fast and a body walking them arrives', () => {
  const R = rng(2024); const all = [...spots.drops, ...spots.supplies];
  let ok = 0; let exp = 0; const N = 40; const t0 = performance.now();
  for (let k = 0; k < N; k++) {
    const a = all[Math.floor(R() * all.length)]; const b = all[Math.floor(R() * all.length)];
    const { pts, expanded } = route(a, b); exp += expanded;
    if (walk(a, pts).ok) ok++;
  }
  assert.ok(ok >= N - 1, `${ok}/${N} walks arrived`);
  assert.ok(exp / N < 6000, `A* expanded ${Math.round(exp / N)} nodes on average`);
  assert.ok(performance.now() - t0 < 60000);
});

test('into a building through its doorway: from an outdoor landing spot to an indoor supply spot (FD-I) and up the stairs to an upper floor (Shankar Bhawan)', () => {
  const near = (s, out) => spots.drops.filter((d) => !d.indoor && d.y === 0).sort((p, q) => Math.hypot(p.x - s.x, p.z - s.z) - Math.hypot(q.x - s.x, q.z - s.z))[out];
  const fd1 = spots.supplies.find((s) => s.indoor && s.name.includes('Faculty Division I') && s.y === 0);
  arrive(near(fd1, 2), fd1, 'into FD-I');
  const up = spots.supplies.find((s) => s.indoor && s.name.includes('Shankar') && s.y > 3);
  const pts = arrive(near(up, 1), up, 'up to the first floor of Shankar Bhawan');
  assert.ok(pts.some((q) => q[2] > 0.5 && q[2] < 3), 'the path climbs (stair waypoints between floors)');
});

test('down into the sunken NAB court (−4.5 m) and the lower court (−9 m), through the NAB doorways, and back out', () => {
  const links = geo.header.links;
  const court = spots.drops.find((d) => d.y === -4.5 && d.name.includes('Economics')) || spots.drops.find((d) => d.y === -4.5);
  const lower = spots.supplies.find((s) => s.y === -9 && s.name.includes('New Academic Block'));
  const top = spots.drops.filter((d) => !d.indoor && d.y === 0).sort((p, q) => Math.hypot(p.x - court.x, p.z - court.z) - Math.hypot(q.x - court.x, q.z - court.z))[3];
  arrive(top, court, 'down into the NAB court');
  const pts = arrive(court, lower, 'into the lower court');
  const viaDoor = pts.some((q) => links.some(([a, b]) => Math.hypot(a[0] - q[0], a[1] - q[1]) < 1.6 || Math.hypot(b[0] - q[0], b[1] - q[1]) < 1.6));
  assert.ok(viaDoor || pts.some((q) => q[2] < -6), 'the path goes through a listed doorway or down the court stairs');
  arrive(lower, top, 'back out to the campus');
});

test('Med-C field navigation: round the bunkers, never through one', () => {
  const F = new FieldNav(MEDC);
  const C = MEDC.centre;
  const path = F.path(C.x - 30, C.z, C.x + 30, C.z); // the tower stands in the middle
  assert.ok(path.length >= 2, 'detours round the centre tower');
  let prev = [C.x - 30, C.z];
  for (const q of path) { assert.ok(F.clear(prev[0], prev[1], q[0], q[1]), `segment ${prev} → ${q} hits a bunker`); prev = q; }
  // walking it with the server's movement code arrives
  const p = { x: C.x - 30, y: 0, z: C.z, vy: 0 };
  for (const [x, z] of path) for (let k = 0; k < 600 && Math.hypot(x - p.x, z - p.z) > 0.3; k++) stepMove(p, { f: 1, s: 0, yaw: Math.atan2(-(x - p.x), -(z - p.z)), run: true }, 1 / 30, MEDC);
  assert.ok(Math.hypot(p.x - (C.x + 30), p.z - C.z) < 0.5, 'arrived');
  for (const s of MEDC.solids) assert.ok(solidDist(s, p.x, p.z) > 0.3);
});

test('aim: solveAim leads the paintball drop so a shot from the server lands on the target', () => {
  for (const id of ['standard', 'precision', 'rapid', 'launcher']) {
    const e = EQUIPMENT_BY_ID[id];
    for (const d of [8, 20, Math.min(40, e.range * 0.9)]) {
      const eye = { x: MEDC.centre.x - 20, y: 1.6, z: MEDC.centre.z + 6 }; const to = { x: eye.x + d, y: 1.15, z: eye.z };
      const a = solveAim(eye, to, id);
      // fly it the server's way (PaintballRoom.flyPaintballs at 20 Hz)
      const v = aimDir(a.yaw, a.pitch); let p = { ...eye }; let vy = v.y * e.speed; let best = 9;
      for (let t = 0; t < 60; t++) { const steps = Math.max(1, Math.ceil((e.speed / 20) / 3)); for (let k = 0; k < steps; k++) { vy -= e.gravity / 20 / steps; const n = { x: p.x + v.x * e.speed / 20 / steps, y: p.y + vy / 20 / steps, z: p.z + v.z * e.speed / 20 / steps }; if ((p.x - to.x) * (n.x - to.x) <= 0) best = Math.abs(p.y + (n.y - p.y) * ((to.x - p.x) / (n.x - p.x || 1)) - to.y); p = n; } }
      assert.ok(best < 0.25, `${id} at ${d} m lands ${best.toFixed(2)} m off`);
    }
  }
});

test('paint bomb pitch: a throw lands about where it was aimed (open ground)', () => {
  const C = MEDC.centre;
  for (const d of [7, 12, 16]) {
    const v = throwVelocity(-Math.PI / 2, bombPitch(d)); // east
    const b = { x: C.x - 25, y: 1.45, z: C.z + 6, ...v, rest: false, bounces: 0 };
    let first = null;
    for (let t = 0; t < 120 && !b.rest; t++) { const y0 = b.y; stepBomb(b, 1 / 20, MEDC); if (first === null && b.y <= 0.05 && y0 > 0.05) first = b.x - (C.x - 25); }
    assert.ok(first !== null && Math.abs(first - d) < 2.2, `aimed ${d} m, first bounce at ${first?.toFixed(1)} m`);
  }
});

test('moveInput walks the wanted direction whatever way the bot looks (strafing while aiming)', () => {
  for (const yaw of [0, 1, -2, 3]) {
    for (const [dx, dz] of [[1, 0], [0, -1], [-0.6, 0.8]]) {
      const m = moveInput(yaw, dx, dz); const p = { x: MEDC.centre.x, y: 0, z: MEDC.centre.z + 6, vy: 0 };
      stepMove(p, { ...m, yaw, run: false }, 0.1, MEDC);
      const mx = p.x - MEDC.centre.x; const mz = p.z - MEDC.centre.z - 6; const l = Math.hypot(mx, mz);
      assert.ok(l > 0.3 && (mx * dx + mz * dz) / (l * Math.hypot(dx, dz)) > 0.99, `yaw ${yaw} dir ${dx},${dz}`);
    }
  }
});

test('blaster choice by range: spread up close, precision far, never an empty blaster', () => {
  const p = { primary: 'precision', secondary: 'spread', slot: 0, hopper0: 5, carried0: 30, hopper1: 8, carried1: 40 };
  assert.equal(pickSlot(p, 6), 1);
  assert.equal(pickSlot(p, 40), 0);
  assert.equal(pickSlot({ ...p, hopper1: 0, carried1: 0 }, 6), 0, 'the empty spread blaster is not picked');
  assert.equal(pickSlot({ primary: 'standard', secondary: '', slot: 0, hopper0: 10, carried0: 0, hopper1: 0, carried1: 0 }, 5), 0, 'Campus Royale start: one blaster');
});

test('loot value: upgrades and paintballs for held blasters; nothing that is no better', () => {
  const inv = { primary: 'standard', secondary: '', slot: 0, ammo: { standard: 0 }, paintbomb: 0, smoke: 0, wipes: 0, kit: 0, gearMask: 2, gearVest: 0 };
  assert.ok(lootValue(inv, 'blaster:precision') > lootValue(inv, 'ammo:standard'), 'a second blaster first');
  assert.ok(lootValue(inv, 'ammo:standard') > 3, 'paintballs for an empty blaster matter');
  assert.equal(lootValue(inv, 'ammo:launcher'), 0, 'paintballs for a blaster it does not have: no (smart)');
  assert.equal(lootValue(inv, 'mask1'), 0, 'worse gear: no');
  assert.ok(lootValue(inv, 'vest1') > 0);
  const full = { ...inv, secondary: 'precision', ammo: { standard: 120, precision: 35 } };
  assert.equal(lootValue(full, 'blaster:standard'), 0.3, 'a blaster it already has is barely worth it');
  assert.ok(lootValue(full, 'blaster:launcher') > 0, 'launcher beats the standard it would swap out');
  const best = { ...inv, primary: 'precision', secondary: 'launcher', ammo: { precision: 35, launcher: 12 } };
  assert.equal(lootValue(best, 'blaster:spread'), 0, 'no better than either held blaster: leave it');
});

test('landing picks spread bots out over the campus', () => {
  const R = rng(5); const taken = [];
  for (let i = 0; i < 11; i++) taken.push(pickLanding(spots.drops, taken, R));
  let min = Infinity; for (const a of taken) for (const b of taken) if (a !== b) min = Math.min(min, Math.hypot(a.x - b.x, a.z - b.z));
  assert.ok(min > 60, `closest two bots land ${min.toFixed(0)} m apart`);
});

test('difficulty levels get steadily better, and the names and limits are sane', () => {
  const [E, M, Hd] = ['easy', 'medium', 'hard'].map((id) => BOT_LEVELS_BY_ID[id]);
  assert.deepEqual(BOT_LEVELS.map((l) => l.id), ['easy', 'medium', 'hard']);
  assert.ok(E.aim > M.aim && M.aim > Hd.aim, 'aim error');
  assert.ok(E.reaction[0] > M.reaction[0] && M.reaction[0] > Hd.reaction[0], 'reaction');
  assert.ok(E.think < M.think && M.think < Hd.think && E.think >= 5 && Hd.think <= 10, 'think rate 5–10 Hz');
  assert.ok(E.cover < M.cover && M.cover < Hd.cover && E.bombs === 0 && Hd.bombs > M.bombs, 'cover and paint bombs');
  assert.ok(E.loot > M.loot && M.loot > Hd.loot, 'looting');
  assert.ok(new Set(BOT_NAMES).size === BOT_NAMES.length && BOT_NAMES.length >= 12);
  assert.ok(BOT_LIMITS.rooms >= 1 && BOT_LIMITS.total >= 11);
});

// ---------- the brain against a tiny fake room ----------
function fakeCtx({ seeEnemy = true, level = 'hard', enemyAt = { x: MEDC.centre.x + 15, z: MEDC.centre.z + 6 }, paint = 0 } = {}) {
  const me = { x: MEDC.centre.x - 5, y: 0, z: MEDC.centre.z + 6, yaw: -Math.PI / 2, pitch: 0, alive: true, out: false, down: false, slot: 0, primary: 'standard', secondary: 'rapid', equip: 'standard', hopper0: 20, carried0: 100, hopper1: 45, carried1: 180, reloadUntil: 0, protectedUntil: 0, shieldUntil: 0, paint, team: -1, channel: '', shield: 1, paintbomb: 0, wipes: 0, kit: 0, ammo: new Map() };
  const foe = { x: enemyAt.x, y: 0, z: enemyAt.z, alive: true, out: false, team: -1 };
  const players = new Map([['me', me], ['foe', foe]]);
  const sent = []; let rays = 0;
  const s = { phase: 'playing', players, zone: { r: 0 }, crates: new Map(), airdrop: { announced: false } };
  const c = {
    id: 'me', p: me, s, now: 0, L: BOT_LEVELS_BY_ID[level], royale: false, teams: 0,
    player: (id) => players.get(id), speed: () => 0, *opponents() { yield ['foe', foe]; },
    nearestMate: () => null, leader: () => null,
    los: () => { rays++; return seeEnemy; }, walkable: () => true, coverFrom: () => null, roamPoint: () => ({ x: me.x, z: me.z, y: 0 }),
    requestPath: (b) => b.setPath([[b.goal.x, b.goal.z, 0]]), dispatch: (type, msg) => sent.push([type, msg]),
  };
  return { c, me, foe, sent, rays: () => rays };
}
function run(ctx, brain, secs) {
  let fired = 0;
  for (let t = 0; t < secs * 20; t++) {
    ctx.c.now = t / 20;
    if (ctx.c.now >= brain.nextThink) { brain.think(ctx.c); brain.nextThink = ctx.c.now + 1 / brain.level.think; }
    const o = brain.control(ctx.c, 1 / 20);
    ctx.me.yaw = o.yaw; ctx.me.pitch = o.pitch; ctx.me.slot = o.slot; ctx.me.equip = o.slot ? ctx.me.secondary : ctx.me.primary; // the server applies it
    if (o.fire) fired++;
  }
  return fired;
}

test('brain: a visible opponent in range is engaged and fired at after the reaction time; a hidden one never', () => {
  const vis = fakeCtx(); const b = new Brain('me', BOT_LEVELS_BY_ID.hard, rng(3));
  const fired = run(vis, b, 3);
  assert.equal(b.mode, 'engage'); assert.equal(b.target, 'foe');
  assert.ok(fired > 10, `fired on ${fired} ticks`);
  assert.ok(vis.rays() > 0, 'line of sight was checked');
  const hid = fakeCtx({ seeEnemy: false }); const b2 = new Brain('me', BOT_LEVELS_BY_ID.hard, rng(3));
  assert.equal(run(hid, b2, 4), 0, 'no line of sight: never fires');
  assert.notEqual(b2.mode, 'engage');
  const behind = fakeCtx({ enemyAt: { x: MEDC.centre.x - 25, z: MEDC.centre.z + 6 } }); // behind it, 20 m: outside the view cone and hearing
  const b3 = new Brain('me', BOT_LEVELS_BY_ID.easy, rng(3));
  assert.equal(run(behind, b3, 0.15), 0, 'an opponent behind an Easy bot is not noticed');
});

test('brain: reaction time and aim error by difficulty (Easy first fires later and scatters more than Hard)', () => {
  const firstShot = (level, seed) => { const x = fakeCtx({ level }); const b = new Brain('me', BOT_LEVELS_BY_ID[level], rng(seed)); for (let t = 0; t < 80; t++) { x.c.now = t / 20; if (x.c.now >= b.nextThink) { b.think(x.c); b.nextThink = x.c.now + 1 / b.level.think; } const o = b.control(x.c, 0.05); x.me.yaw = o.yaw; x.me.pitch = o.pitch; if (o.fire) return t / 20; } return 9; };
  let e = 0; let h = 0; for (let s = 1; s <= 8; s++) { e += firstShot('easy', s); h += firstShot('hard', s); }
  assert.ok(e > h + 2, `Easy first fires after ${(e / 8).toFixed(2)} s on average, Hard after ${(h / 8).toFixed(2)} s`);
  const spread = (level) => { const b = new Brain('me', BOT_LEVELS_BY_ID[level], rng(9)); let v = 0; for (let i = 0; i < 400; i++) { b.newBurstError(); v += b.errYaw ** 2; } return Math.sqrt(v / 400); };
  assert.ok(spread('easy') > 3 * spread('hard'), 'aim error');
});

test('brain: painted heavily with a shield in Campus Royale → raises it (Hard); a throw waits for the aim to arrive', () => {
  const x = fakeCtx({ paint: 70 }); x.c.royale = true; x.c.s.zone = { r: 0 };
  const b = new Brain('me', BOT_LEVELS_BY_ID.hard, rng(1));
  b.onMessage('painted', { by: 'foe', a: 30, paint: 70 }, 0);
  b.think(x.c);
  b.control(x.c, 0.05);
  assert.ok(x.sent.some(([t, m]) => t === 'use' && m.kind === 'shield'), `sent ${JSON.stringify(x.sent)}`);
  const y = fakeCtx(); const b2 = new Brain('me', BOT_LEVELS_BY_ID.hard, rng(1));
  b2.act('throw', { kind: 'paintbomb' }, { yaw: 1, pitch: 0.3 });
  b2.control(y.c, 0.05);
  assert.equal(y.sent.length, 0, 'not thrown before the server has the new aim');
  y.me.yaw = 1; y.me.pitch = 0.3; b2.control(y.c, 0.05);
  assert.deepEqual(y.sent[0], ['throw', { kind: 'paintbomb' }]);
  assert.ok(Math.abs(wrap(7)) <= Math.PI);
});

test('sweepArena is what the bots see through: a bunker blocks the line, open grass does not', () => {
  const C = MEDC.centre;
  assert.ok(sweepArena({ x: C.x - 3, y: 1.3, z: C.z }, { x: C.x + 3, y: 1.3, z: C.z }, MEDC), 'the centre tower blocks');
  assert.equal(sweepArena({ x: C.x - 30, y: 1.3, z: C.z + 6 }, { x: C.x + 30, y: 1.3, z: C.z + 6 }, MEDC), null, 'the open lane does not');
});

test('rooms with bots play in a region sized to the player count: enough landing and supply spots, the final spot inside, a faster zone', async () => {
  const { planRegion, regionPhases, zoneLength, planZone, ZONE_PHASES } = await import('../js/paintball/royale.js');
  for (const [n, seed] of [[12, 1], [12, 2], [6, 3], [4, 4]]) {
    const R = planRegion(raw, n, rng(seed));
    assert.ok(R && R.r >= 130 && R.r < 600, `region r ${R?.r} for ${n} players`);
    const drops = spots.drops.filter((d) => !d.indoor && Math.hypot(d.x - R.x, d.z - R.z) < R.r * 0.85).length;
    const sup = spots.supplies.filter((d) => Math.hypot(d.x - R.x, d.z - R.z) < R.r * 0.9).length;
    assert.ok(drops >= 2 * n && sup >= 3 * n, `${drops} landing spots, ${sup} supply spots`);
    assert.ok(Math.hypot(R.final.x - R.x, R.final.z - R.z) < R.r * 0.45, 'final spot well inside');
    const ph = regionPhases(R.r);
    const circles = planZone(rng(seed), { centre: R, startR: R.r, final: R.final }, ph);
    for (let i = 1; i < circles.length; i++) assert.ok(circles[i].r <= circles[i - 1].r && Math.hypot(circles[i].x - circles[i - 1].x, circles[i].z - circles[i - 1].z) <= circles[i - 1].r - circles[i].r + 0.01, 'each circle inside the last');
    assert.ok(zoneLength(ph) < 6 * 60 && zoneLength(ph) < zoneLength(ZONE_PHASES) / 1.5, 'a faster zone');
  }
});
