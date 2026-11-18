// Sports grounds walk test (js/world/buildings/sports-grounds.js): through a Gymkhana gate, onto the pavilion verandah
// and into its rooms, up and down both stands (track and basketball), into the tennis and volleyball cages and the
// skating rink, into the swimming pool block, onto its deck, up its spectator tiers, into the changing rooms, and into
// the Med-C scorers' hut; walls, the pool water and the boundary wall block. Real key presses; positions in each
// site's own frame (kit.sites). Also takes the screenshots.
//   node tests/browser/sports-grounds.mjs [OUTDIR] [URL]      (URL defaults to http://localhost:8107/)
//   PERF=1 node tests/browser/sports-grounds.mjs              frame timing only: ?nomodules against this module
import { chromium } from 'playwright-core';
const OUT = process.argv[2] || '.';
const BASE = process.argv[3] || 'http://localhost:8107/';
const SHOTS = process.env.SHOTS !== '0';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu'] });

// world position / look-at for a site-local point, evaluated in the page
const KIT = 'window.__game.campus.modules.find((m) => m.m.id === "sports-grounds")?.kit';
const placeCam = ([site, p, l, K]) => {
  const G = window.__game; const kit = eval(K); const S = site ? kit.sites[site] : kit;
  const a = S.world(p[0], p[1]); const b = S.world(l[0], l[1]);
  G.player.place(new G.player.pos.constructor(a.x, p[2] - 1.6, a.z), 0);
  G.player.yaw = Math.atan2(-(b.x - a.x), -(b.z - a.z)); G.player.pitch = Math.atan2(l[2] - p[2], Math.hypot(b.x - a.x, b.z - a.z));
  G.player.velY = 0; G.player.frozen = true;
};

// ---------- PERF=1: frame timing from outside, ?nomodules against ?only=sports-grounds ----------
if (process.env.PERF) {
  const SECS = Number(process.env.PERF_SECS || 6);
  const stats = (a) => { const s = [...a].sort((x, y) => x - y); const avg = s.reduce((p, c) => p + c, 0) / (s.length || 1); return { avg: +avg.toFixed(2), p95: +(s[Math.floor(s.length * 0.95)] || 0).toFixed(2) }; };
  // world coordinates: [x, y, z] eye, [x, y, z] look
  const scenes = [
    ['outside: over the track', [250, 30, 420], [330, 0, 500]],
    ['outside: courts street', [262, 1.7, 330], [300, 1, 360]],
    ['outside: pool road', [560, 1.7, 270], [530, 2, 230]],
  ];
  for (const q of ['nomodules', 'only=sports-grounds']) {
    const pg = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    pg.setDefaultTimeout(60000);
    await pg.addInitScript(() => {
      const P = (window.__perf = { cpu: [], gaps: [], draws: [], last: 0, curDraws: 0 });
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => raf((t) => { if (P.last) P.gaps.push(t - P.last); P.last = t; P.curDraws = 0; const s = performance.now(); cb(t); P.cpu.push(performance.now() - s); P.draws.push(P.curDraws); });
      for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
        if (!C) continue;
        for (const f of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) { const o = C.prototype[f]; if (o) C.prototype[f] = function (...a) { P.curDraws++; return o.apply(this, a); }; }
      }
    });
    await pg.goto(`${BASE}?explore&${q}`, { waitUntil: 'load' });
    await pg.waitForFunction(() => window.__game?.explorer && window.__game.campus, null, { timeout: 90000 });
    await pg.waitForTimeout(1500);
    await pg.evaluate(() => { const c = document.getElementById('game'); Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => c }); const E = window.__game.explorer; const p = E.places[0]; E.select(p); E.enter(p); E.view = 'first'; });
    await pg.waitForTimeout(1200);
    for (const [name, pos, look] of scenes) {
      await pg.evaluate(([p, l]) => {
        const G = window.__game; G.player.place(new G.player.pos.constructor(p[0], p[1] - 1.6, p[2]), 0);
        G.player.yaw = Math.atan2(-(l[0] - p[0]), -(l[2] - p[2])); G.player.pitch = Math.atan2(l[1] - p[1], Math.hypot(l[0] - p[0], l[2] - p[2])); G.player.velY = 0; G.player.frozen = true;
      }, [pos, look]);
      await pg.waitForTimeout(1500);
      await pg.evaluate(() => { const P = window.__perf; P.cpu = []; P.gaps = []; P.draws = []; });
      await pg.waitForTimeout(SECS * 1000);
      const P = await pg.evaluate(() => ({ cpu: window.__perf.cpu, gaps: window.__perf.gaps, draws: window.__perf.draws }));
      console.log(JSON.stringify({ build: q, scene: name, frame_ms: stats(P.gaps), cpu_ms: stats(P.cpu), draws: stats(P.draws).avg }));
    }
    await pg.close();
  }
  await browser.close();
  process.exit(0);
}

const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const fails = [];
const check = (ok, what) => { console.log(ok ? 'PASS' : 'FAIL', what); if (!ok) fails.push(what); };
const g = (fn, arg) => page.evaluate(fn, arg);
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
let SITE = '';
const use = (s) => { SITE = s; };
// place the player at site-local (u, v), feet at y, facing [du, dv]
const at = (u, v, y, du = 0, dv = 1) => g(([u, v, y, du, dv, site, K]) => { const kit = eval(K); const S = site ? kit.sites[site] : kit; const G = window.__game; G.player.frozen = false; G.player.place(S.world(u, v, y), S.yaw(-du, -dv)); G.player.pos.y = y; G.player.velY = 0; }, [u, v, y, du, dv, SITE, KIT]);
const where = () => g(([site, K]) => { const kit = eval(K); const S = site ? kit.sites[site] : kit; const G = window.__game; const p = G.player.pos; const [u, v] = S.local(p.x, p.z); return { u: +u.toFixed(2), v: +v.toFixed(2), y: +p.y.toFixed(2), room: kit.roomAt(p.x, p.z, p.y)?.id || null }; }, [SITE, KIT]);
// walk towards site-local (u, v), steering every 150 ms; stops within `near` metres or after `ms`
const go = async (u, v, { ms = 20000, near = 0.5, slow = false } = {}) => {
  const t0 = Date.now();
  if (slow) await page.keyboard.down('ShiftLeft');
  await page.keyboard.down('KeyW');
  let w;
  for (;;) {
    w = await g(([u, v, site, K]) => { const kit = eval(K); const S = site ? kit.sites[site] : kit; const G = window.__game; const p = G.player.pos; const [pu, pv] = S.local(p.x, p.z); const d = Math.hypot(u - pu, v - pv); if (d > 0.05) G.player.yaw = S.yaw(-(u - pu) / d, -(v - pv) / d); return d; }, [u, v, SITE, KIT]);
    if (w < near || Date.now() - t0 > ms) break;
    await page.waitForTimeout(150);
  }
  await page.keyboard.up('KeyW');
  if (slow) await page.keyboard.up('ShiftLeft');
  await page.waitForTimeout(350);
  return where();
};
const route = async (pts, opts) => { let lo = Infinity; let hi = -Infinity; let w; for (const [u, v] of pts) { w = await go(u, v, opts); lo = Math.min(lo, w.y); hi = Math.max(hi, w.y); } return { ...w, lo, hi }; };
const near = (a, b, tol = 0.12) => Math.abs(a - b) < tol;
const view = async (name, site, p, l) => { await g(placeCam, [site, p, l, KIT]); await page.waitForTimeout(1100); await shot(name); await g(() => { window.__game.player.frozen = false; }); };

await page.goto(`${BASE}?explore&only=sports-grounds`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game?.explorer && window.__game.campus?.modules, null, { timeout: 90000 });
await page.waitForTimeout(1500);
await g(() => { const c = document.getElementById('game'); Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => c }); const E = window.__game.explorer; const p = E.places[0]; E.select(p); E.enter(p); E.view = 'first'; E.clock = 10 * 60; });
await page.waitForTimeout(1200);

const info = await g((K) => {
  const kit = eval(K); if (!kit) return null; const c = window.__game.campus;
  const S = kit.sites;
  return {
    rooms: kit.rooms.map((r) => r.id), zones: kit.zones.map((z) => z.name), stairs: kit.stairs.map((s) => s.name), gates: kit.gates.length,
    field: !!c.fieldBounds, goals: c.goals?.length, pits: c.pits.filter((p) => p.building === 'sports-grounds').length,
    courts: S.C.courts, pool: S.P.pool, vol: S.V.size, track: S.T.track,
    // nothing within 60 m of the Clock Tower → Saraswati axis (x < 120 anywhere on campus)
    minX: Math.min(...kit.zones.map((z) => z.u0), ...c.colliders.filter((q) => q.building === 'sports-grounds').map((q) => q.minX)),
    maxTop: Math.max(...c.colliders.filter((q) => q.building === 'sports-grounds').map((q) => q.maxY)),
  };
}, KIT);
check(!!info, 'sports-grounds module built');
console.log('stairs', JSON.stringify(info.stairs), 'rooms', JSON.stringify(info.rooms));
check(['pavilionOffice', 'sportsStore', 'pavilionChanging', 'poolLobby', 'poolGents', 'poolLadies', 'medcHut'].every((r) => info.rooms.includes(r)), 'pavilion, pool block and scorers\' hut rooms registered');
check(info.zones.length === 3, `three interior zones (${info.zones})`);
check(info.gates === 6, `six Gymkhana gates (${info.gates})`);
check(info.field && info.goals === 2, 'football field and goals (bits-world) still there for the match');
check(info.pits === 1, 'the pool tank digs one pit');
check(Math.abs(info.pool.W1 - info.pool.W0 - 12.5) < 1e-6 && Math.abs(info.pool.P1 - info.pool.P0 - 25) < 1e-6, 'pool water is 25 × 12.5 m');
check(info.minX > 200, `everything well east of the Clock Tower → Saraswati axis (min x ${info.minX.toFixed(1)})`);

// ---------- through a Gymkhana gate, and the boundary wall blocks ----------
const gate = await g((K) => { const kit = eval(K); return kit.gates[3]; }, KIT);
use('');
await at(gate.out[0], gate.out[1], 0);
let w = await go(gate.in[0], gate.in[1]);
check(Math.hypot(w.u - gate.in[0], w.v - gate.in[1]) < 1.6 && w.y < 0.2, `in through Gymkhana gate 4 ${JSON.stringify(w)} → ${JSON.stringify(gate.in)}`);
const wallTest = await g((K) => {
  const kit = eval(K); const W = kit.sites.wall0; // a wall stretch at least 8 m from any gate
  for (let s = 10; s < 200; s += 2) { const p = W.world(0, s); if (kit.gates.every((q) => Math.hypot(q.world.x - p.x, q.world.z - p.z) > 8)) return { s }; }
  return null;
}, KIT);
use('wall0');
await at(-3, wallTest.s, 0, 1, 0);
w = await go(3, wallTest.s, { ms: 3000 });
const w2 = await (async () => { await at(3, wallTest.s, 0, -1, 0); return go(-3, wallTest.s, { ms: 3000 }); })();
check((w.u < -0.1 && w2.u > 0.1), `the boundary wall blocks both ways ${JSON.stringify(w)} ${JSON.stringify(w2)}`);

// ---------- the Gymkhana pavilion ----------
use('pav');
await at(-5, 12, 0, 1, 0);
w = await go(1.5, 12);
check(near(w.y, 0.45), `up the front steps onto the pavilion verandah ${JSON.stringify(w)}`);
if (SHOTS) await view('pav-verandah', 'pav', [1.2, 1, 2.0], [1.4, 22, 1.6]);
for (const [v, room] of [[4, 'pavilionOffice'], [13, 'sportsStore'], [21, 'pavilionChanging']]) {
  await at(1.5, v, 0.45, 1, 0);
  w = await go(6, v);
  check(w.room === room && near(w.y, 0.45), `through the door into the ${room} ${JSON.stringify(w)}`);
}
if (SHOTS) { await view('pav-office', 'pav', [3.7, 7.5, 2.0], [8, 1.5, 1.0]); await view('pav-store', 'pav', [4.0, 17.3, 2.0], [8.6, 10, 1.0]); }
await at(6, 13, 0.45, 1, 0);
w = await go(11, 13, { ms: 2500 });
check(w.u < 8.9, `the pavilion back wall blocks ${JSON.stringify(w)}`);
w = await route([[6, 13], [1.6, 13], [-3, 12]]);
check(near(w.y, 0) && w.u < -2, `back out of the store and down the steps ${JSON.stringify(w)}`);

// ---------- the east stand by the home straight (G frame: tiers rise east from u 43 to 46.5) ----------
use('G');
await at(40, 25.7, 0, 1, 0);
w = await go(46.4, 25.7, { slow: true, near: 0.15 });
check(w.y > 1.8 && w.u > 45.9, `up the west-end stair of the track stand to the top tread (the back wall stops you at the last riser) ${JSON.stringify(w)}`);
w = await go(46.2, 0);
check(near(w.y, 2.0), `along the top tier ${JSON.stringify(w)}`);
if (SHOTS) await view('stand-top', 'G', [46.2, 0, 3.6], [0, 0, 0]);
w = await go(46.3, -25.7);
w = await go(40, -25.7, { slow: true });
check(near(w.y, 0, 0.1) && w.u < 41, `down the east-end stair ${JSON.stringify(w)}`);
await at(44, 5, 2.0, 1, 0);
w = await go(48, 5, { ms: 2500 });
check(w.u < 46.6, `the stand's back wall blocks ${JSON.stringify(w)}`);

// ---------- basketball: across the court, through the jaali parapet, up and down the court stand ----------
use('C');
const C = info.courts;
const sv = C.sv;
const stW = info.stairs.indexOf('stand stair west');
await at(C.bu0 + 2, C.bv1 - 4, 0.1, 0, 1);
w = await route([[C.bu0 + 2, C.pv + 0.25], [C.bu0 + 0.9, sv - 0.2]]);
check(w.v > C.pv, `through the parapet opening to the court stand ${JSON.stringify(w)}`);
w = await go(C.bu0 + 0.9, sv + 3.4, { slow: true, near: 0.15 });
check(w.y > 1.8 && w.v > sv + 2.9, `up the court stand stair to the top tread ${JSON.stringify(w)}`);
w = await go(C.bu0 + 6, sv + 3.2);
check(near(w.y, 2.0), `onto the top tier ${JSON.stringify(w)}`);
if (SHOTS) await view('courts-from-stand', 'C', [C.bu0 + 8, sv + 3.2, 3.7], [C.bu0 + 10, C.bv0, 0]);
w = await route([[C.bu0 + 0.9, sv + 3.2], [C.bu0 + 0.9, sv - 0.4]], { slow: true });
check(near(w.y, 0.1, 0.1), `down the court stand stair ${JSON.stringify(w)}`);
await at(C.bu0 + 10, C.bv1 - 1, 0.1, 0, 1);
w = await go(C.bu0 + 10, C.pv + 2, { ms: 3000 });
check(w.v < C.pv, `the jaali parapet blocks between its openings ${JSON.stringify(w)}`);
void stW;

// ---------- tennis: in through the gate; the fence and the blue wall block ----------
await at((C.tu0 + C.tu1) / 2, C.tv1 + 3, 0, 0, -1);
w = await go((C.tu0 + C.tu1) / 2, C.tv1 - 3);
check(w.v < C.tv1 - 2, `into the tennis cage through its gate ${JSON.stringify(w)}`);
w = await go(C.tu1 + 3, C.tv1 - 3, { ms: 3000 });
check(w.u < C.tu1, `the tennis fence blocks ${JSON.stringify(w)}`);
w = await go(C.tu0 - 3, C.tv1 - 3, { ms: 3000 });
check(w.u > C.tu0, `the blue wall between tennis and basketball blocks ${JSON.stringify(w)}`);
if (SHOTS) await view('tennis', 'C', [C.tu1 - 2, C.tv1 - 1, 1.7], [C.tu0 + 3, (C.tv0 + C.tv1) / 2, 0.8]);

// ---------- volleyball cage ----------
use('V');
const V = info.vol;
await at(-3, V.L / 2 - 6, 0, 1, 0);
w = await go(4, V.L / 2 - 6);
check(w.u > 3 && near(w.y, 0.08, 0.1), `into the volleyball cage through its gate ${JSON.stringify(w)}`);
w = await go(4, V.L / 2 + 3, { ms: 4000 });
check(w.v < V.L / 2, `the volleyball net blocks ${JSON.stringify(w)}`);
if (SHOTS) await view('volleyball', 'V', [1.5, 2, 2.2], [V.U - 4, V.L / 2, 1]);

// ---------- skating rink (G frame: u 50..104, v -100..-74, west opening at v -87) ----------
use('G');
await at(46, -87, 0, 1, 0);
w = await go(60, -87);
check(w.u > 59 && near(w.y, 0.12), `into the skating rink through the west opening ${JSON.stringify(w)}`);
w = await go(60, -103, { ms: 3000 });
check(w.v > -100, `the rink wall blocks ${JSON.stringify(w)}`);
if (SHOTS) await view('rink', 'G', [52, -98, 1.7], [100, -76, 0]);

// ---------- the swimming pool ----------
use('P');
const P = info.pool;
await at(P.DOOR, P.v1 + 6, 0, 0, -1);
if (SHOTS) await view('pool-entrance', 'P', [P.DOOR + 4, P.v1 + 14, 1.7], [P.DOOR, P.v1, 2.6]);
w = await go(P.DOOR, P.v1 + 1);
check(near(w.y, P.DECK), `up onto the pool porch ${JSON.stringify(w)}`);
w = await go(P.DOOR, P.BV + 3);
check(w.room === 'poolLobby' && near(w.y, P.DECK), `into the pool lobby ${JSON.stringify(w)}`);
if (SHOTS) await view('pool-lobby', 'P', [P.DOOR - 2.5, P.v1 - 0.8, 1.9], [P.DOOR + 3, P.BV + 2, 1.0]);
const dv = P.BV + 0.23 + 5.6;
w = await go(P.uM + 1.5, dv, { near: 0.25, slow: true });
w = await go(P.uM - 2.5, dv);
check(w.room === 'poolGents', `through the partition door into the gents' changing room ${JSON.stringify(w)}`);
if (SHOTS) await view('pool-gents', 'P', [P.uM - 1, dv, 1.8], [1, P.BV + 2, 1.0]);
w = await route([[P.uM + 1, dv], [P.uW - 1, dv], [P.uW + 2.5, dv]]);
check(w.room === 'poolLadies', `into the ladies' changing room ${JSON.stringify(w)}`);
w = await route([[P.uW - 1, dv], [P.DOOR, P.BV + 2], [P.DOOR, P.BV - 2]]);
check(w.v < P.BV && near(w.y, P.DECK), `out of the lobby's back door onto the deck ${JSON.stringify(w)}`);
w = await go(P.DOOR, P.P1 - 3, { ms: 4000 });
check(w.v > P.P1 && w.y > 0.1, `the water edge stops you on the coping ${JSON.stringify(w)}`);
if (SHOTS) await view('pool-deck', 'P', [P.W1 + 2, P.P1 + 2, 1.7], [P.W0, P.P0, 0]);
// spectator tiers on the west deck: stair at v 5.8..7, rising west from u 3 to 0.6
await at(4.5, 6.4, P.DECK, -1, 0);
w = await go(0.8, 6.4, { slow: true, near: 0.15 });
check(near(w.y, P.DECK + 1.2), `up the pool spectator tiers ${JSON.stringify(w)}`);
w = await go(1.0, 18);
check(near(w.y, P.DECK + 1.2), `along the top tier ${JSON.stringify(w)}`);
w = await route([[1.0, 6.4], [4.5, 6.4]], { slow: true });
check(near(w.y, P.DECK), `down the pool tiers ${JSON.stringify(w)}`);
await at(3, 3, P.DECK, 0, -1);
w = await go(3, -3, { ms: 3000 });
check(w.v > 0.2, `the pool's perimeter wall blocks ${JSON.stringify(w)}`);

// ---------- the Med-C scorers' hut (G frame: u 9..15, v 135.5..145.5, door at v 138.5) ----------
use('G');
await at(19, 138.5, 0, -1, 0);
await page.waitForTimeout(600);
w = await route([[17.6, 138.5], [16, 138.5]], { slow: true });
check(near(w.y, 0.3), `onto the scorers' hut verandah ${JSON.stringify(w)}`);
w = await go(12, 138.5);
check(w.room === 'medcHut' && near(w.y, 0.3), `into the scorers' hut ${JSON.stringify(w)}`);
w = await go(5, 138.5, { ms: 3000 });
check(w.u > 9.2, `the hut's back wall blocks ${JSON.stringify(w)}`);
w = await route([[12, 138.5], [16, 138.5], [20, 138.5]]);
check(near(w.y, 0, 0.1), `back out onto the ground ${JSON.stringify(w)}`);
if (SHOTS) {
  await view('medc-hut', 'G', [12, 138, 2.0], [14.5, 143, 1.0]);
  await view('medc-ground', 'G', [24, 150, 3], [68, 206, 0]);
}

// ---------- screenshots: exterior street level and aerial ----------
if (SHOTS) {
  await view('ext-pavilion', 'G', [25, -60, 1.7], [50, -68, 2]);
  await view('ext-stands', 'G', [20, 10, 1.7], [44, -5, 1]);
  await view('ext-hockey', 'G', [60, 0, 6], [89, 50, 0]);
  await view('ext-courts-street', 'C', [-6, (C.bv0 + C.bv1) / 2, 1.7], [C.bu1, (C.bv0 + C.bv1) / 2, 2]);
  await view('ext-pool-front', 'P', [P.DOOR - 6, P.v1 + 22, 1.7], [P.DOOR, P.v1, 2.5]);
  await view('aerial-gymkhana', 'G', [-140, -120, 160], [30, 20, 0]);
  await view('aerial-courts', 'C', [-20, -20, 40], [40, 30, 0]);
  await view('aerial-pool', 'P', [-15, -10, 30], [16, 22, 0]);
  await g(() => { window.__game.explorer.clock = 21 * 60; });
  await page.waitForTimeout(2500);
  await view('night-track', 'G', [-60, -40, 25], [30, 30, 0]);
}

check(errors.length === 0, 'no console errors');
console.log('ERRORS', JSON.stringify(errors.slice(0, 8)));
console.log(fails.length ? `FAILED ${fails.length}` : 'ALL PASS');
await browser.close();
process.exit(fails.length ? 1 : 0);
