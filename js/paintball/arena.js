// Paintball arenas: boundaries, cover (inflatable bunkers) and the central spawn registry.
// Shared by the game server (server/, which uses `solids` for movement and paintball collision) and the browser
// (which draws the bunkers and the net fence). Plain data, no three.js or DOM.
//
// Coordinates are campus metres (research/COORDINATES.md: x east, z south, y up). Each arena is laid out in local
// (u, v) about its centre and converted to world here; the layout is mirror-symmetric in u and v so no side or
// corner is favoured.

const R = (n) => Math.round(n * 100) / 100;

function makeArena({ id, name, centre: [cx, cz], half: [hu, hv], bunkers, spawns }) {
  const W = ([u, v]) => [R(cx + u), R(cz + v)];
  const solids = bunkers.map((b, i) => {
    const [x, z] = W([b.u, b.v]);
    return b.kind === 'cyl'
      ? { id: `b${i}`, kind: 'cyl', label: b.label, x, z, r: b.r, h: b.h }
      : { id: `b${i}`, kind: 'box', label: b.label, minX: R(x - b.w / 2), maxX: R(x + b.w / 2), minZ: R(z - b.d / 2), maxZ: R(z + b.d / 2), h: b.h };
  });
  const face = (u, v) => { const l = Math.hypot(u, v) || 1; return [R(-u / l), R(-v / l)]; }; // towards the centre
  const sets = {};
  for (const [set, list] of Object.entries(spawns)) {
    sets[set] = list.map(([u, v, group], i) => { const [x, z] = W([u, v]); return { id: `${id}:${set}:${i}`, x, z, face: face(u, v), group }; });
  }
  return {
    id, name, centre: { x: cx, z: cz },
    bounds: { minX: cx - hu, maxX: cx + hu, minZ: cz - hv, maxZ: cz + hv }, // the net fence; players stay inside
    solids,
    spawns: sets, // keyed by team count ('0' = free-for-all, '2', '4', '5'); `group` is the team index
  };
}

// ---------- Med-C Ground arena ----------
// The north outfield of the Med-C cricket ground (research/buildings/sports.md §7): flat grass at y 0, clear of
// colliders between the sight screen (z ≈ 619) and the pitch (south of z 668), far from the Clock Tower → Saraswati
// Mandir view axis. A 70 × 40 m speedball-style field of inflatable bunkers inside a net.
const mirror4 = (u, v, b) => [[u, v], [-u, v], [u, -v], [-u, -v]].map(([a, c]) => ({ ...b, u: a, v: c }));
const mirrorU = (u, v, b) => [[u, v], [-u, v]].map(([a, c]) => ({ ...b, u: a, v: c }));
const mirrorV = (u, v, b) => [[u, v], [u, -v]].map(([a, c]) => ({ ...b, u: a, v: c }));

export const MEDC = makeArena({
  id: 'medc',
  name: 'Med-C Ground',
  centre: [395, 644],
  half: [35, 20],
  bunkers: [
    { kind: 'box', u: 0, v: 0, w: 2.2, d: 2.2, h: 2.6, label: 'tower' },
    ...mirrorV(0, 10, { kind: 'box', w: 10, d: 1.2, h: 0.9, label: 'snake' }),
    ...mirror4(8, 4, { kind: 'cyl', r: 0.9, h: 1.6, label: 'can' }),
    ...mirrorU(16, 0, { kind: 'box', w: 2, d: 2, h: 1.4, label: 'cube' }),
    ...mirror4(22, 8, { kind: 'box', w: 1.5, d: 3, h: 2.4, label: 'temple' }),
    ...mirror4(12, 12.5, { kind: 'box', w: 1.6, d: 1.6, h: 1.2, label: 'dorito' }),
    ...mirrorU(26, 0, { kind: 'cyl', r: 0.8, h: 1.8, label: 'can' }),
    ...mirror4(20, 15, { kind: 'box', w: 3, d: 1, h: 1.6, label: 'wall' }),
  ],
  spawns: {
    // free-for-all and duels: 12 positions round the edge
    0: [[-32, -14, 0], [-32, 0, 0], [-32, 14, 0], [32, -14, 0], [32, 0, 0], [32, 14, 0], [-20, -18, 0], [20, -18, 0], [-20, 18, 0], [20, 18, 0], [0, -18, 0], [0, 18, 0]],
    // two teams (6v6, 4v4): the west and east ends
    2: [-15, -9, -3, 3, 9, 15].flatMap((v) => [[-32, v, 0], [32, v, 1]]),
    // four teams (3v3v3v3): the corners
    4: [[-1, -1], [1, -1], [-1, 1], [1, 1]].flatMap(([su, sv], t) => [[32, 12], [32, 17], [27, 18]].map(([u, v]) => [su * u, sv * v, t])),
    // five teams (2v2v2v2v2): west, east, north, south-west, south-east
    5: [[-32, -3, 0], [-32, 3, 0], [32, -3, 1], [32, 3, 1], [-3, -18, 2], [3, -18, 2], [-18, 18, 3], [-14, 18, 3], [14, 18, 4], [18, 18, 4]],
  },
});

// ---------- Whole Campus (Campus Royale) ----------
// The entire BITS campus inside its boundary wall: no net, no bunkers, the campus itself is the cover. Movement and
// paintballs use the exported campus geometry (js/paintball/geometry.js), attached at load time (server/geo.js on
// the server, client/geo.js in the browser) together with the verified landing and supply registries
// (js/paintball/data/royale-spots.json). Its rules are Campus Royale (js/paintball/royale.js).
export const CAMPUS = {
  id: 'campus',
  name: 'Whole Campus',
  ruleset: 'Campus Royale',
  royale: true,
  centre: { x: 139, z: 492 },
  bounds: { minX: -406, maxX: 684, minZ: -396, maxZ: 1380 },
  solids: [],
  spawns: { 0: [] },
  geo: null,
  spots: null,
  attach(geo, spots) {
    this.geo = geo; this.spots = spots;
    const b = geo.bbox;
    this.bounds = { minX: b.minX, maxX: b.maxX, minZ: b.minZ, maxZ: b.maxZ };
    this.centre = { x: (b.minX + b.maxX) / 2, z: (b.minZ + b.maxZ) / 2 };
  },
};

export const ARENAS = [MEDC, CAMPUS];
export const ARENAS_BY_ID = Object.fromEntries(ARENAS.map((a) => [a.id, a]));

// The spawn set for a mode: team count 0 → free-for-all, otherwise that many teams.
export const spawnSet = (arena, teams) => arena.spawns[String(teams)] || arena.spawns['0'];

// Distance from (x, z) to a solid's footprint (0 inside).
export function solidDist(s, x, z) {
  if (s.kind === 'cyl') return Math.max(0, Math.hypot(x - s.x, z - s.z) - s.r);
  const dx = Math.max(s.minX - x, 0, x - s.maxX); const dz = Math.max(s.minZ - z, 0, z - s.maxZ);
  return Math.hypot(dx, dz);
}

// Checks a spawn registry: inside the fence with margin, clear of every bunker, no two spawns closer than `gap`.
// Returns a list of problems (empty = valid). The server refuses to open an arena that fails.
export function validateSpawns(arena, { clear = 1.5, gap = 3, margin = 1 } = {}) {
  if (arena.royale) return arena.geo && arena.spots ? [] : [`${arena.id}: campus geometry not loaded`];
  const bad = [];
  const b = arena.bounds;
  for (const [set, list] of Object.entries(arena.spawns)) {
    const ids = new Set();
    for (const s of list) {
      if (ids.has(s.id)) bad.push(`${s.id}: duplicate id`);
      ids.add(s.id);
      if (s.x < b.minX + margin || s.x > b.maxX - margin || s.z < b.minZ + margin || s.z > b.maxZ - margin) bad.push(`${s.id}: outside the fence`);
      for (const o of arena.solids) if (solidDist(o, s.x, s.z) < clear) bad.push(`${s.id}: inside or against ${o.id} (${o.label})`);
      for (const t of list) if (t !== s && Math.hypot(t.x - s.x, t.z - s.z) < gap) bad.push(`${s.id}: too close to ${t.id}`);
    }
    if (set !== '0') {
      const teams = Number(set);
      for (let t = 0; t < teams; t++) if (!list.some((s) => s.group === t)) bad.push(`${arena.id}:${set}: team ${t} has no spawn`);
    }
  }
  if (arena.spawns['0'].length < 12) bad.push(`${arena.id}: fewer than 12 free-for-all spawns`);
  return [...new Set(bad)];
}
