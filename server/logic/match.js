// Pure paintball match logic (no sockets, no schema), used by server/PaintballRoom.js and tested in
// tests/paintball.test.js: room codes, nicknames, team assignment, start checks, spawn selection, standings,
// overtime and results.
import { MODES_BY_ID, TEAMS, SCORE, MAX_PLAYERS, modeLabel } from '../../js/paintball/rules.js';

// Small deterministic RNG (mulberry32) so tests can seed it; the room seeds it from crypto.
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0; let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Room codes: 5 characters, no look-alikes (no I, L, O, 0, 1).
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 5;
export function makeCode(rand, taken = new Set()) {
  for (let tries = 0; tries < 1000; tries++) {
    let c = '';
    for (let i = 0; i < CODE_LENGTH; i++) c += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
    if (!taken.has(c)) return c;
  }
  throw new Error('no free room code');
}
export const normaliseCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
export const isCode = (s) => s.length === CODE_LENGTH && [...s].every((ch) => CODE_ALPHABET.includes(ch));

// Session nickname: printable, 1–16 characters, unique in the room (a number is added on a clash).
export function cleanNick(raw, taken = []) {
  let n = String(raw ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  if (!n) n = 'Player';
  const lower = new Set([...taken].map((t) => t.toLowerCase()));
  if (!lower.has(n.toLowerCase())) return n;
  for (let i = 2; ; i++) { const c = `${n.slice(0, 13)} ${i}`; if (!lower.has(c.toLowerCase())) return c; }
}

// Random, balanced teams: shuffle, then deal round the teams. Returns Map id → team index.
export function assignTeams(ids, teams, rand) {
  const out = new Map();
  if (!teams) { for (const id of ids) out.set(id, -1); return out; }
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  a.forEach((id, i) => out.set(id, i % teams));
  return out;
}
// The team with the fewest players (lowest index on a tie), for someone joining the lobby.
export function smallestTeam(teamOf, teams) {
  const n = new Array(teams).fill(0);
  for (const t of teamOf) if (t >= 0 && t < teams) n[t]++;
  return n.indexOf(Math.min(...n));
}

// Can the host start? players: [{ ready, connected }]
export function canStart(modeId, players) {
  const mode = MODES_BY_ID[modeId];
  if (!mode) return { ok: false, reason: 'Unknown paintball match mode.' };
  const n = players.length;
  const [min, max] = mode.players;
  if (n < min) return { ok: false, reason: mode.teams ? `${mode.name} needs exactly ${min} players (${n} here).` : `A paintball match needs at least ${min} players.` };
  if (n > max) return { ok: false, reason: `${mode.name} takes at most ${max} players (${n} here).` };
  if (players.some((p) => p.connected === false)) return { ok: false, reason: 'Someone is reconnecting.' };
  const waiting = players.filter((p) => !p.ready).length;
  if (waiting) return { ok: false, reason: `Waiting for ${waiting} player${waiting > 1 ? 's' : ''} to get ready.` };
  return { ok: true, label: modeLabel(mode, n) };
}
export const slotsFor = (modeId, n) => Math.max(0, Math.min(MAX_PLAYERS, MODES_BY_ID[modeId]?.players[1] ?? MAX_PLAYERS) - n);

// Spawn selection: only registry spots of your team group (any spot in free-for-all) that no live player stands
// on and nobody else has just been given (`reserved` ids); of those, the one furthest from the nearest opponent.
// others: [{ x, z, team, alive }]
export const SPAWN_CLEAR = 2.5;
export function pickSpawn(spawns, { team = -1, others = [], reserved = new Set(), teams = 0 }) {
  const mine = spawns.filter((s) => (teams ? s.group === team : true));
  const pool = mine.length ? mine : spawns;
  const live = others.filter((o) => o.alive !== false);
  const free = pool.filter((s) => !reserved.has(s.id) && !live.some((o) => Math.hypot(o.x - s.x, o.z - s.z) < SPAWN_CLEAR));
  const cands = free.length ? free : pool.filter((s) => !reserved.has(s.id)).length ? pool.filter((s) => !reserved.has(s.id)) : pool;
  const opp = live.filter((o) => !teams || o.team !== team);
  let best = null; let bestD = -1;
  for (const s of cands) {
    const near = opp.length ? Math.min(...opp.map((o) => Math.hypot(o.x - s.x, o.z - s.z))) : 1e9;
    const clear = live.length ? Math.min(...live.map((o) => Math.hypot(o.x - s.x, o.z - s.z))) : 1e9;
    const d = Math.min(near, 1e9) + Math.min(clear, 50) * 1e-3; // furthest from opponents; then the emptiest
    if (d > bestD) { bestD = d; best = s; }
  }
  return best;
}

// Standings: free-for-all → one entry per player; team modes → one entry per team (sum of its players' scores).
// players: [{ id, nickname, team, score, tags, timesTagged }]
export function standings(modeId, players) {
  const mode = MODES_BY_ID[modeId];
  if (!mode.teams) return players.map((p) => ({ key: p.id, name: p.nickname, score: p.score, tags: p.tags })).sort(byScore);
  const out = [];
  for (let t = 0; t < mode.teams; t++) {
    const mem = players.filter((p) => p.team === t);
    out.push({ key: t, team: t, name: `Team ${TEAMS[t].name}`, colour: TEAMS[t].colour, score: mem.reduce((s, p) => s + p.score, 0), tags: mem.reduce((s, p) => s + p.tags, 0) });
  }
  return out.sort(byScore);
}
function byScore(a, b) { return b.score - a.score || b.tags - a.tags || String(a.key).localeCompare(String(b.key)); }
export const leaders = (st) => st.filter((s) => st.length && s.score === st[0].score);

// At time up: a tie for first → overtime; otherwise the leader wins.
export function timeUp(st) {
  if (!st.length) return { result: 'draw' };
  return leaders(st).length > 1 ? { result: 'overtime' } : { result: 'win', winner: st[0].key };
}
// In overtime: the first lead change (a single leader) wins at once; at the end of overtime with no single
// leader it is a draw.
export function overtimeCheck(st, ended) {
  const l = leaders(st);
  if (l.length === 1 && st.length > 1) return { result: 'win', winner: l[0].key };
  return ended ? { result: 'draw' } : { result: 'continue' };
}

// Final results: completion bonus to everyone present at the end, win bonus to the winner (or the winning team's
// members). Mutates the players' scores, then ranks. Returns the results object kept in the room.
export function finalise(modeId, players, { winner = null, draw = false } = {}) {
  const mode = MODES_BY_ID[modeId];
  for (const p of players) {
    if (p.connected === false) continue;
    p.score += SCORE.completion;
    if (!draw && winner !== null && (mode.teams ? p.team === winner : p.id === winner)) p.score += SCORE.win;
  }
  const rank = [...players].sort((a, b) => b.score - a.score || b.tags - a.tags || a.timesTagged - b.timesTagged || a.nickname.localeCompare(b.nickname));
  const rankings = rank.map((p, i) => ({ id: p.id, nickname: p.nickname, team: p.team, score: p.score, tags: p.tags, assists: p.assists, timesTagged: p.timesTagged, place: i + 1 }));
  const st = standings(modeId, players);
  const mvp = rankings[0] || null;
  let win = null; let runner = null;
  if (mode.teams) {
    const w = st.find((s) => s.key === winner);
    win = draw ? null : w ? w.name : null;
    const rest = st.filter((s) => s.key !== winner);
    runner = draw ? null : rest[0]?.name ?? null;
  } else {
    const w = players.find((p) => p.id === winner);
    win = draw ? null : w ? w.nickname : null;
    runner = draw ? null : rankings.find((r) => r.id !== winner)?.nickname ?? null;
  }
  const teams = mode.teams ? standings(modeId, players).map((s, i) => ({ team: s.team, name: s.name, colour: s.colour, score: s.score, tags: s.tags, place: i + 1 })) : [];
  return { draw, winnerKey: draw ? null : winner, winner: win, runnerUp: runner, mvp: mvp?.id ?? null, mvpName: mvp?.nickname ?? null, rankings, teams };
}

// Campus Royale results: completion bonus (still connected), placement bonus (SCORE.place per player or squad
// outlasted), win bonus to the last standing. Ranked by placement, then score. players: [{ id, nickname, team,
// score, tags, assists, timesTagged, connected, placement, survived }]; winner: a player id, or 't<team>' in
// squads, or null (a draw). Mutates the scores.
export function finaliseRoyale(modeId, players, { winner = null } = {}) {
  const mode = MODES_BY_ID[modeId];
  const key = (p) => (mode.teams ? `t${p.team}` : p.id);
  const groups = new Set(players.map(key)).size;
  for (const p of players) {
    if (p.connected === false) continue;
    p.score += SCORE.completion + SCORE.place * Math.max(0, groups - (p.placement || groups));
    if (winner !== null && key(p) === winner) p.score += SCORE.win;
  }
  const pl = (p) => p.placement || 255;
  const rank = [...players].sort((a, b) => pl(a) - pl(b) || b.score - a.score || b.tags - a.tags || a.nickname.localeCompare(b.nickname));
  const rankings = rank.map((p, i) => ({ id: p.id, nickname: p.nickname, team: p.team, score: p.score, tags: p.tags, assists: p.assists, timesTagged: p.timesTagged, place: i + 1, placement: p.placement || 0, survived: p.survived || 0 }));
  const mvp = [...rankings].sort((a, b) => b.score - a.score || b.tags - a.tags)[0] || null;
  let teams = []; let win = null; let runner = null;
  if (mode.teams) {
    const T = new Map();
    for (const p of players) {
      if (!T.has(p.team)) T.set(p.team, { team: p.team, name: `Team ${TEAMS[p.team].name}`, colour: TEAMS[p.team].colour, score: 0, tags: 0, placement: p.placement || 255 });
      const t = T.get(p.team); t.score += p.score; t.tags += p.tags; t.placement = Math.min(t.placement, p.placement || 255);
    }
    teams = [...T.values()].sort((a, b) => a.placement - b.placement || b.score - a.score).map((t, i) => ({ team: t.team, name: t.name, colour: t.colour, score: t.score, tags: t.tags, place: i + 1 }));
    win = winner === null ? null : teams.find((t) => `t${t.team}` === winner)?.name ?? null;
    runner = winner === null ? null : teams.find((t) => `t${t.team}` !== winner)?.name ?? null;
  } else {
    win = winner === null ? null : players.find((p) => p.id === winner)?.nickname ?? null;
    runner = winner === null ? null : rankings.find((r) => r.id !== winner)?.nickname ?? null;
  }
  return { draw: winner === null, winner: win, runnerUp: runner, mvp: mvp?.id ?? null, mvpName: mvp?.nickname ?? null, rankings, teams };
}
