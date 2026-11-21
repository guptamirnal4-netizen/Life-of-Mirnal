// Pure paintball logic: rules data, codes, nicknames, teams, start checks, spawn selection, standings, overtime,
// results, movement and paintball sweeps, voice channels. No sockets (tests/mp/ covers the real server).
import test from 'node:test';
import assert from 'node:assert/strict';
import { rng, makeCode, CODE_ALPHABET, normaliseCode, isCode, cleanNick, assignTeams, smallestTeam, canStart, slotsFor, pickSpawn, standings, timeUp, overtimeCheck, finalise } from '../server/logic/match.js';
import { MODES, MODES_BY_ID, SCORE, MAX_PLAYERS } from '../js/paintball/rules.js';
import { EQUIPMENT } from '../js/paintball/equipment.js';
import { MEDC, validateSpawns, spawnSet } from '../js/paintball/arena.js';
import { stepMove, sanitizeInput, sweepArena, segPlayer, blocked, INPUT_DT } from '../js/paintball/sim.js';
import { voicePeers, sameChannel } from '../js/paintball/channels.js';
import { cleanLook } from '../js/paintball/looks.js';

test('room codes are 5 unambiguous characters and unique', () => {
  const r = rng(7); const taken = new Set();
  for (let i = 0; i < 500; i++) { const c = makeCode(r, taken); assert.equal(c.length, 5); assert.ok(isCode(c)); assert.ok(!taken.has(c)); taken.add(c); }
  for (const ch of 'IL0O1') assert.ok(!CODE_ALPHABET.includes(ch));
  assert.equal(normaliseCode(' ab-c2d '), 'ABC2D');
});

test('nicknames are cleaned and made unique', () => {
  assert.equal(cleanNick('  Ann <b> '), 'Ann b');
  assert.equal(cleanNick('', []), 'Player');
  assert.equal(cleanNick('ann', ['Ann']), 'ann 2');
  assert.equal(cleanNick('Ann', ['Ann', 'Ann 2']), 'Ann 3');
  assert.ok(cleanNick('x'.repeat(40)).length <= 16);
});

test('team assignment is random and balanced for every team mode', () => {
  for (const m of MODES.filter((x) => x.teams)) {
    const ids = Array.from({ length: m.players[0] }, (_, i) => `p${i}`);
    const a = assignTeams(ids, m.teams, rng(1)); const b = assignTeams(ids, m.teams, rng(2));
    const count = new Array(m.teams).fill(0); for (const t of a.values()) count[t]++;
    assert.deepEqual(count, new Array(m.teams).fill(m.size), m.id);
    assert.notDeepEqual(ids.map((id) => a.get(id)), ids.map((id) => b.get(id)), `${m.id} differs by seed`);
  }
  assert.equal(smallestTeam([0, 0, 1], 2), 1);
  assert.equal(smallestTeam([0, 1], 2), 0);
});

test('start needs the mode capacity and everyone ready', () => {
  const P = (n, ready = true) => Array.from({ length: n }, () => ({ ready, connected: true }));
  assert.equal(canStart('ffa', P(1)).ok, false);
  assert.equal(canStart('ffa', P(2)).label, 'Individual Duel');
  assert.equal(canStart('ffa', P(3)).label, 'Individual Free-for-All');
  assert.equal(canStart('ffa', P(12)).ok, true);
  assert.equal(canStart('ffa', P(3, false)).ok, false);
  assert.equal(canStart('6v6', P(11)).ok, false);
  assert.equal(canStart('6v6', P(12)).ok, true);
  assert.equal(canStart('4v4', P(7)).ok, false);
  assert.equal(canStart('4v4', P(9)).ok, false);
  assert.equal(canStart('3v3v3v3', P(12)).ok, true);
  assert.equal(canStart('2v2v2v2v2', P(10)).ok, true);
  assert.equal(slotsFor('4v4', 3), 5);
  assert.equal(slotsFor('ffa', MAX_PLAYERS), 0);
});

test('spawns: registry only, team group, never on a live player, furthest from opponents', () => {
  assert.deepEqual(validateSpawns(MEDC), []);
  const ffa = spawnSet(MEDC, 0);
  const enemy = { x: ffa[0].x, z: ffa[0].z, team: -1, alive: true };
  const s = pickSpawn(ffa, { others: [enemy] });
  assert.ok(ffa.includes(s));
  assert.notEqual(s.id, ffa[0].id);
  const far = Math.max(...ffa.map((q) => Math.hypot(q.x - enemy.x, q.z - enemy.z)));
  assert.equal(Math.hypot(s.x - enemy.x, s.z - enemy.z), far);
  // all 12 free-for-all players get distinct spots
  const reserved = new Set(); const others = [];
  for (let i = 0; i < 12; i++) { const q = pickSpawn(ffa, { others, reserved }); assert.ok(!reserved.has(q.id)); reserved.add(q.id); others.push({ x: q.x, z: q.z, alive: true }); }
  // team spawns stay in the team's group
  for (const teams of [2, 4, 5]) {
    const set = spawnSet(MEDC, teams);
    for (let t = 0; t < teams; t++) assert.equal(pickSpawn(set, { team: t, teams }).group, t);
  }
});

test('standings, overtime on a tie, first lead change wins, draw without a score', () => {
  const pl = [{ id: 'a', nickname: 'A', team: 0, score: 200, tags: 2 }, { id: 'b', nickname: 'B', team: 1, score: 200, tags: 2 }, { id: 'c', nickname: 'C', team: 0, score: 40, tags: 0 }];
  assert.equal(timeUp(standings('ffa', pl)).result, 'overtime');
  assert.deepEqual(timeUp(standings('4v4', pl)), { result: 'win', winner: 0 });
  assert.equal(overtimeCheck(standings('ffa', pl), false).result, 'continue');
  assert.equal(overtimeCheck(standings('ffa', pl), true).result, 'draw');
  pl[1].score += 40;
  assert.deepEqual(overtimeCheck(standings('ffa', pl), false), { result: 'win', winner: 'b' });
});

test('results: completion and win bonuses, MVP, runner-up, rankings, team results', () => {
  const mk = () => [
    { id: 'a', nickname: 'A', team: 0, score: 300, tags: 3, assists: 0, timesTagged: 1, connected: true },
    { id: 'b', nickname: 'B', team: 1, score: 140, tags: 1, assists: 1, timesTagged: 2, connected: true },
    { id: 'c', nickname: 'C', team: 1, score: 100, tags: 1, assists: 0, timesTagged: 3, connected: false },
  ];
  let pl = mk();
  const r = finalise('ffa', pl, { winner: 'a' });
  assert.equal(pl[0].score, 300 + SCORE.completion + SCORE.win);
  assert.equal(pl[1].score, 140 + SCORE.completion);
  assert.equal(pl[2].score, 100); // not present at the end: no completion bonus
  assert.equal(r.winner, 'A'); assert.equal(r.runnerUp, 'B'); assert.equal(r.mvpName, 'A');
  assert.deepEqual(r.rankings.map((x) => x.place), [1, 2, 3]);
  pl = mk();
  const t = finalise('4v4', pl, { winner: 0 });
  assert.equal(t.winner, 'Team Pink'); assert.equal(t.runnerUp, 'Team Cyan');
  assert.equal(pl[0].score, 300 + SCORE.completion + SCORE.win);
  assert.equal(t.teams.length, 2);
  pl = mk();
  const d = finalise('ffa', pl, { draw: true });
  assert.equal(d.draw, true); assert.equal(d.winner, null); assert.equal(pl[0].score, 320);
});

test('movement: speed limits, bunkers are walls, the net fence holds, jump and land', () => {
  const p = { x: MEDC.centre.x - 6, y: 0, z: MEDC.centre.z, vy: 0 };
  const inp = sanitizeInput({ f: 5, s: 0, yaw: -Math.PI / 2, run: true }); // asked too fast: clamped to 1
  assert.equal(inp.f, 1);
  const x0 = p.x;
  stepMove(p, inp, INPUT_DT, MEDC);
  assert.ok(Math.abs(p.x - x0 - 6.8 * INPUT_DT) < 1e-6, `moved ${p.x - x0}`); // east at run speed
  for (let i = 0; i < 120; i++) stepMove(p, inp, INPUT_DT, MEDC);
  const tower = MEDC.solids[0];
  assert.ok(p.x <= tower.minX - 0.34, 'stopped by the central tower');
  const q = { x: MEDC.bounds.maxX - 1, y: 0, z: MEDC.centre.z + 2, vy: 0 };
  for (let i = 0; i < 60; i++) stepMove(q, sanitizeInput({ f: 1, yaw: -Math.PI / 2, run: true }), INPUT_DT, MEDC);
  assert.ok(q.x <= MEDC.bounds.maxX - 0.35 + 1e-9);
  const j = { x: MEDC.centre.x, y: 0, z: MEDC.centre.z + 6, vy: 0 };
  stepMove(j, sanitizeInput({ jump: true }), INPUT_DT, MEDC);
  assert.ok(j.y > 0);
  for (let i = 0; i < 60; i++) stepMove(j, sanitizeInput({}), INPUT_DT, MEDC);
  assert.equal(j.y, 0);
  const bad = sanitizeInput({ f: NaN, yaw: Infinity, pitch: 9, x: 999 });
  assert.equal(bad.f, 0); assert.equal(bad.yaw, 0); assert.equal(bad.pitch, 1.45); assert.equal(bad.x, undefined);
});

test('paintball sweeps: bunkers, ground, net, players and precision paint hits', () => {
  const c = MEDC.centre; const tower = MEDC.solids[0];
  const hit = sweepArena({ x: c.x - 5, y: 1, z: c.z }, { x: c.x + 5, y: 1, z: c.z }, MEDC);
  assert.equal(hit.kind, 'solid'); assert.equal(hit.id, tower.id); assert.deepEqual(hit.n, { x: -1, y: 0, z: 0 });
  assert.equal(sweepArena({ x: c.x - 5, y: 3, z: c.z }, { x: c.x + 5, y: 3, z: c.z }, MEDC), null); // over the tower
  assert.equal(sweepArena({ x: c.x, y: 0.5, z: c.z + 5 }, { x: c.x, y: -0.5, z: c.z + 5 }, MEDC).kind, 'ground');
  assert.equal(sweepArena({ x: MEDC.bounds.maxX - 1, y: 1, z: c.z + 3 }, { x: MEDC.bounds.maxX + 1, y: 1, z: c.z + 3 }, MEDC).kind, 'net');
  const pl = { x: c.x + 5, y: 0, z: c.z + 6 };
  assert.equal(segPlayer({ x: c.x, y: 1, z: c.z + 6 }, { x: c.x + 10, y: 1, z: c.z + 6 }, pl).precision, false);
  assert.equal(segPlayer({ x: c.x, y: 1.65, z: c.z + 6 }, { x: c.x + 10, y: 1.65, z: c.z + 6 }, pl).precision, true);
  assert.equal(segPlayer({ x: c.x, y: 2.2, z: c.z + 6 }, { x: c.x + 10, y: 2.2, z: c.z + 6 }, pl), null);
  assert.ok(blocked({ x: c.x - 3, y: 1, z: c.z }, { x: c.x + 3, y: 1, z: c.z }, MEDC));
  assert.ok(!blocked({ x: c.x - 3, y: 1, z: c.z + 6 }, { x: c.x + 3, y: 1, z: c.z + 6 }, MEDC));
});

test('equipment: six blasters with complete tunables', () => {
  assert.equal(EQUIPMENT.length, 6);
  for (const e of EQUIPMENT) for (const k of ['tag', 'range', 'rate', 'speed', 'pellets', 'spread', 'burst', 'reload', 'magazine', 'total', 'cooldown', 'splash', 'gravity', 'precision']) assert.ok(Number.isFinite(e[k]), `${e.id}.${k}`);
  assert.ok(MODES_BY_ID.ffa && MODES.length === 5);
});

test('voice channels: everyone in the lobby, own team only in a team match', () => {
  const P = { a: { team: 0, voice: true }, b: { team: 0, voice: true }, c: { team: 1, voice: true }, d: { team: 1, voice: false } };
  const list = Object.entries(P);
  assert.deepEqual(voicePeers('a', list, { phase: 'lobby', teams: 2 }), ['b', 'c']);
  assert.deepEqual(voicePeers('a', list, { phase: 'playing', teams: 2 }), ['b']);
  assert.deepEqual(voicePeers('c', list, { phase: 'playing', teams: 2 }), []);
  assert.deepEqual(voicePeers('a', list, { phase: 'playing', teams: 0 }), ['b', 'c']);
  assert.deepEqual(voicePeers('d', list, { phase: 'lobby', teams: 2 }), []);
  assert.equal(sameChannel(P.a, P.c, { phase: 'results', teams: 2 }), true);
});

test('customisation choices are validated', () => {
  const l = cleanLook({ character: 99, outfit: 'red', mask: '#FF3D7F', accessory: 'cap' }, { character: 1 });
  assert.equal(l.character, 1); assert.equal(l.mask, '#ff3d7f'); assert.equal(l.accessory, 'cap'); assert.match(l.outfit, /^#/);
});
