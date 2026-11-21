// FD-I and the workshops/halls group (js/world/buildings/fd1.js, workshops.js): walk in through the entrances, up and
// down every stair (FD-I's four dog-legs, the RKIC and LTC and VFAST dog-legs, the Central Workshop mezzanine flight),
// into the key rooms and the FD-I staff room (gameplay), against walls; real key presses, positions in each frame.
//   node tests/browser/fd1-workshops.mjs [OUTDIR] [URL]      (dev server: PORT=8101 node dev/server.mjs)
//   PERF=1 node tests/browser/fd1-workshops.mjs              frame timing: ?nomodules against these modules
import { chromium } from 'playwright-core';
const OUT = process.argv[2] || '.';
const BASE = process.argv[3] || 'http://localhost:8101/';
const SHOTS = process.env.SHOTS !== '0';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu'] });

// ---------- PERF=1 ----------
if (process.env.PERF) {
  const SECS = Number(process.env.PERF_SECS || 5);
  const stats = (a) => { const s = [...a].sort((x, y) => x - y); const avg = s.reduce((p, c) => p + c, 0) / (s.length || 1); return { avg: +avg.toFixed(2), p95: +(s[Math.floor(s.length * 0.95)] || 0).toFixed(2) }; };
  const scenes = [
    ['FD-I + Workshop from the south', [236, 3, 30], [236, 4, -40]],
    ['FD-I aerial', [330, 120, 40], [235, 0, -100]],
    ['LTC from the east road', [365, 3, -183], [320, 4, -183]],
    ['Central Workshop drive', [120, 3, -172], [70, 4, -172]],
    ['RKIC forecourt', [52, 3, -238], [50, 6, -262]],
    ['VFAST + RVCC aerial', [480, 60, 270], [480, 0, 330]],
  ];
  for (const q of ['nomodules', 'only=fd1,workshops']) {
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
    await pg.evaluate(() => { const c = document.getElementById('game'); Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => c }); const G = window.__game; G.explorer.walk(new G.player.pos.constructor(0, 0, 0), 0); G.explorer.view = 'first'; });
    await pg.waitForTimeout(1000);
    for (const [name, pos, look] of scenes) {
      await pg.evaluate(([p, l]) => { const G = window.__game; G.player.place(new G.player.pos.constructor(p[0], p[1] - 1.6, p[2]), 0); G.player.yaw = Math.atan2(-(l[0] - p[0]), -(l[2] - p[2])); G.player.pitch = Math.atan2(l[1] - p[1], Math.hypot(l[0] - p[0], l[2] - p[2])); G.player.velY = 0; G.player.frozen = true; }, [pos, look]);
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
// the kit of a module by name (fd1 by id)
let KN = 'fd1';
const kitExpr = (n) => (n === 'fd1' ? 'window.__game.campus.modules.find(m=>m.m.id==="fd1").kit' : `window.__game.campus.modules.find(m=>m.m.name.startsWith(${JSON.stringify(n)})).kit`);
const use = (n) => { KN = n; };
const at = (u, v, y, du = 0, dv = 1) => g(([u, v, y, du, dv, K]) => { const kit = eval(K); const G = window.__game; G.player.place(kit.world(u, v, y), kit.yaw(-du, -dv)); G.player.pos.y = y; G.player.velY = 0; G.player.frozen = false; }, [u, v, y, du, dv, kitExpr(KN)]);
const where = () => g((K) => { const kit = eval(K); const G = window.__game; const p = G.player.pos; const [u, v] = kit.local(p.x, p.z); const r = kit.roomAt(p.x, p.z, p.y); return { u: +u.toFixed(2), v: +v.toFixed(2), y: +p.y.toFixed(2), room: r && r.id, groom: G.campus.roomAt(p.x, p.z, p.y) || null }; }, kitExpr(KN));
const go = async (u, v, { ms = 15000, near = 0.45, slow = false } = {}) => {
  const t0 = Date.now();
  if (slow) await page.keyboard.down('ShiftLeft');
  await page.keyboard.down('KeyW');
  let w;
  for (;;) {
    w = await g(([u, v, K]) => { const kit = eval(K); const G = window.__game; const p = G.player.pos; const [pu, pv] = kit.local(p.x, p.z); const d = Math.hypot(u - pu, v - pv); if (d > 0.05) G.player.yaw = kit.yaw(-(u - pu) / d, -(v - pv) / d); return d; }, [u, v, kitExpr(KN)]);
    if (w < near || Date.now() - t0 > ms) break;
    await page.waitForTimeout(120);
  }
  await page.keyboard.up('KeyW');
  if (slow) await page.keyboard.up('ShiftLeft');
  await page.waitForTimeout(300);
  return where();
};
const route = async (pts, opts) => { let lo = Infinity; let hi = -Infinity; let w; for (const [u, v] of pts) { w = await go(u, v, opts); lo = Math.min(lo, w.y); hi = Math.max(hi, w.y); } return { ...w, lo, hi }; };
const near = (a, b, tol = 0.15) => Math.abs(a - b) < tol;
const shot = (name) => (SHOTS ? page.screenshot({ path: `${OUT}/test-${name}.png` }) : null);
const face = (du, dv, pitch = 0) => g(([du, dv, pitch, K]) => { const kit = eval(K); const G = window.__game; G.player.yaw = kit.yaw(-du, -dv); G.player.pitch = pitch; }, [du, dv, pitch, kitExpr(KN)]);

// The geometry of a dog-leg (recorded by workshops.js, or derived like kit.dogleg for FD-I's)
const legOf = (s, along, reverse) => {
  if (s.start !== undefined) return s;
  const H = s.y1 - s.y0; const steps = Math.max(2, Math.ceil(H / 2 / 0.19)); const run = steps * 0.28;
  const [a0, a1, b0, b1] = along === 'v' ? [s.v0, s.v1, s.u0, s.u1] : [s.u0, s.u1, s.v0, s.v1];
  const wid = (b1 - b0 - 0.1) / 2; const landing = Math.max(1.1, wid); const dir = reverse ? -1 : 1; const far = reverse ? a0 : a1;
  const la0 = far - dir * landing;
  return { ...s, along, dir, far, la0, start: la0 - dir * run, mid1: b0 + wid / 2, mid2: b1 - wid / 2 };
};
// Up a dog-leg from its foot and back down; returns [ok up, ok down]
const stairUpDown = async (s, label, { from = null } = {}) => {
  const P = (a, b) => (s.along === 'v' ? [b, a] : [a, b]);
  const foot1 = P(s.start - s.dir * 0.7, s.mid1); const foot2 = P(s.start - s.dir * 0.7, s.mid2);
  const land1 = P(s.la0 + s.dir * 0.55, s.mid1); const land2 = P(s.la0 + s.dir * 0.55, s.mid2);
  if (from) await at(...from, s.y0, 0, 1); else await at(...foot1, s.y0, ...(s.along === 'v' ? [0, s.dir] : [s.dir, 0]));
  let w = await route([foot1, land1], { slow: true });
  const mid = w.y;
  w = await route([land2, foot2], { slow: true });
  const up = near(mid, (s.y0 + s.y1) / 2, 0.3) && near(w.y, s.y1);
  check(up, `${label}: up (landing ${mid}, top ${JSON.stringify(w)})`);
  await shot(`stair-${label.replace(/\W+/g, '-')}`);
  w = await route([land2, land1, foot1], { slow: true });
  const down = near(w.y, s.y0);
  check(down, `${label}: back down ${JSON.stringify(w)}`);
  return [up, down];
};

await page.goto(`${BASE}?explore&only=fd1,workshops`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game?.explorer && window.__game.campus?.modules, null, { timeout: 90000 });
await page.waitForTimeout(1500);
await g(() => { const c = document.getElementById('game'); Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => c }); const G = window.__game; G.explorer.walk(new G.player.pos.constructor(0, 0, 0), 0); G.explorer.view = 'first'; });
await page.waitForTimeout(800);
const mods = await g(() => window.__game.campus.modules.map((m) => m.m.name));
check(mods.length === 7, `seven modules built: ${JSON.stringify(mods)}`);

// ======================= FD-I =======================
use('fd1');
let w;
await at(-5, 45.5, 0, 1, 0);
w = await route([[0, 45.5], [7.5, 45.5]]);
check(w.room === 'westHall', `FD-I: in through the west porch to the entrance hall ${JSON.stringify(w)}`);
await shot('fd1-west-hall');
w = await route([[16, 45.5], [30, 45.5]]);
check(w.room === 'crossArcade' && near(w.y, 0, 0.1), `FD-I: along the cross-wing arcade ${JSON.stringify(w)}`);
await face(0, -1, 0.2); await page.waitForTimeout(300); await shot('fd1-north-court');
// into a north-wing lab from the verandah
w = await route([[16, 30], [16, 12], [25.23, 12], [25.23, 7.5]]);
check(w.room === '0:08', `FD-I: into lab 1108 off the north verandah ${JSON.stringify(w)}`);
await shot('fd1-lab-1108');
// the four stairs
const fdStairs = await g((K) => eval(K).stairs, kitExpr('fd1'));
const orient = { 'NW stair': ['u', true], 'SW stair': ['u', true], 'SE stair': ['u', false], 'East projection stair': ['v', false] };
for (const s of fdStairs) await stairUpDown(legOf(s, ...orient[s.name]), `FD-I ${s.name}`);
// walk from the corridor to the NW stair, climb, then into a first-floor classroom
await at(15.5, 30, 0, 0, -1);
const nw = legOf(fdStairs.find((s) => s.name === 'NW stair'), 'u', true);
w = await route([[15.5, 12.0], [nw.start + 0.7, nw.mid1], [nw.la0 - 0.55, nw.mid1], [nw.la0 - 0.55, nw.mid2], [nw.start + 0.7, nw.mid2], [15.5, 12.1]], { slow: true });
check(near(w.y, 5.0), `FD-I: corridor to the NW stair and up to the first floor ${JSON.stringify(w)}`);
w = await route([[15.5, 20], [15.5, 22], [12.5, 26.3], [9, 26.3]]);
check(w.room === '1:07' && near(w.y, 5.0), `FD-I: into first-floor classroom 1207 ${JSON.stringify(w)}`);
await shot('fd1-classroom-1207');
// the staff room (gameplay): from outside the south door
const stf = await g(() => { const r = window.__game.campus.rooms.staffroom; return { inside: [r.inside.x, r.inside.z], outside: [r.outside.x, r.outside.z], exit: [r.exit.x, r.exit.z] }; });
const [sou, sov] = await g(([x, z, K]) => eval(K).local(x, z), [stf.exit[0], stf.exit[1], kitExpr('fd1')]);
const [siu, siv] = await g(([x, z, K]) => eval(K).local(x, z), [stf.inside[0], stf.inside[1], kitExpr('fd1')]);
await at(sou, sov + 2, 0, 0, -1);
w = await route([[sou, sov], [siu, siv]]);
check(w.groom === 'staffroom', `FD-I: into the staff room through its south door ${JSON.stringify(w)}`);
await shot('fd1-staffroom');
w = await route([[sou, sov], [sou, sov + 2]]);
check(w.groom !== 'staffroom' && w.v > 110.5, `FD-I: back out of the staff room ${JSON.stringify(w)}`);
// walls block
await at(-2, 30, 0, 1, 0);
w = await go(6, 30, { ms: 2500 });
check(w.u < 2.1, `FD-I: the west facade blocks ${JSON.stringify(w)}`);
// east projection: in through its north door
await at(102.5, 37, 0, 0, 1);
w = await route([[102.5, 42], [102.5, 47]]);
check(w.room === 'projHall', `FD-I: in through the east projection's north door ${JSON.stringify(w)}`);

// ======================= BITS Workshop =======================
use('BITS Workshop');
await at(-8, 16, 0, 1, 0);
await shot('ws-west-approach');
w = await route([[-3, 16], [5, 16]]);
check(w.room === 'wsHall' && near(w.y, 0, 0.1), `Workshop: in through the west door ${JSON.stringify(w)}`);
await face(1, 0, 0.25); await page.waitForTimeout(300); await shot('ws-hall');
w = await route([[5, 24], [26, 24], [35, 24], [35, 20]]);
check(w.room === 'wsToolRoom', `Workshop: into the tool room ${JSON.stringify(w)}`);
w = await route([[35, 24], [44, 24], [56, 18], [70, 18], [74, 18]]);
check(w.u > 72.2, `Workshop: out through the CRISS Robotics door ${JSON.stringify(w)}`);
await at(45, 38, 0, 0, -1);
w = await route([[45, 33]]);
check(w.room === 'wsHall', `Workshop: in through the south yard door ${JSON.stringify(w)}`);
await at(20, 26, 0, 0, 1);
w = await go(20, 40, { ms: 4000 });
check(w.v < 36, `Workshop: the south wall blocks ${JSON.stringify(w)}`);

// ======================= New BITS Workshop =======================
use('New BITS Workshop');
await at(64, 20.7, 0, -1, 0);
await shot('nw-entrance');
w = await route([[60, 20.7], [54, 20.7]]);
check(w.room === 'nwLobby', `Central Workshop: in through the glazed entrance ${JSON.stringify(w)}`);
w = await route([[53.2, 17.2], [49, 17.6], [45, 17.6], [43, 11], [39, 11]]);
check(w.room === 'nwHall1', `Central Workshop: lobby -> tool crib -> Hall 1 ${JSON.stringify(w)}`);
await shot('nw-hall1');
w = await route([[33.5, 2.5], [33.5, 0.95]]);
w = await route([[38, 0.95], [41.6, 0.95]], { slow: true });
check(near(w.y, 4.4), `Central Workshop: up the mezzanine stair ${JSON.stringify(w)}`);
w = await route([[44, 8], [46.2, 8], [49, 8]]);
check(w.room === 'nwDrafting' && near(w.y, 4.4), `Central Workshop: mezzanine into the drafting room ${JSON.stringify(w)}`);
await shot('nw-drafting');
w = await route([[50, 14.5], [50, 17], [50, 24], [50, 27]]);
check(w.room === 'nwCad' && near(w.y, 4.4), `Central Workshop: through the landing to the CAD lab ${JSON.stringify(w)}`);
w = await route([[50, 24], [50, 17], [50, 14.5], [49, 8], [46.2, 8], [44, 8], [42.2, 1.0], [40.5, 0.95], [33, 0.95]], { slow: true });
check(near(w.y, 0, 0.1), `Central Workshop: back down the mezzanine stair ${JSON.stringify(w)}`);
w = await route([[30, 3], [30, 18], [30, 23], [30, 26]]);
check(w.room === 'nwHall2', `Central Workshop: through to Hall 2 ${JSON.stringify(w)}`);
w = await route([[3, 31], [-1.5, 31]]);
check(w.u < 0, `Central Workshop: out through the loading door ${JSON.stringify(w)}`);

// ======================= RKIC =======================
use('Rakesh Kapoor');
await at(17, 50, 0, 0, -1);
await shot('rk-approach');
w = await route([[17, 46], [17, 41.5], [17, 35]]);
check(near(w.y, 0.45) && w.v < 36, `RKIC: up the steps, through the portico to the arcade ${JSON.stringify(w)}`);
w = await route([[17, 29], [17, 22]]);
check(w.room === 'rkCourt' && near(w.y, 0, 0.08), `RKIC: down the three steps into the courtyard ${JSON.stringify(w)}`);
await face(0, -1, 0.35); await page.waitForTimeout(300); await shot('rk-courtyard');
w = await route([[17, 31], [20, 32], [24.2, 25]]);
check(near(w.y, 0.45), `RKIC: back up to the arcade ${JSON.stringify(w)}`);
const rkSt = await g((K) => eval(K).stairs, kitExpr('Rakesh Kapoor'));
w = await route([[24.2, 20.4], [29, 20.4], [33.8, 20.0]]);
check(near(w.y, 0.45), `RKIC: arcade -> east stair lobby ${JSON.stringify(w)}`);
for (const s of rkSt) await stairUpDown(s, `RKIC ${s.name}`);
// a full climb G -> L2 on the east stair and into a level-2 room
{
  const s0 = rkSt.find((s) => s.name === 'East stair G-1'); const s1 = rkSt.find((s) => s.name === 'East stair 1-2');
  const P = (a, b) => [b, a];
  await at(29, 20.4, 0.45, 1, 0);
  w = await route([[33.8, 20.0], P(s0.start - 0.7, s0.mid1), P(s0.la0 + 0.55, s0.mid1), P(s0.la0 + 0.55, s0.mid2), P(s0.start - 0.7, s0.mid2), P(s1.start - 0.7, s1.mid1), P(s1.la0 + 0.55, s1.mid1), P(s1.la0 + 0.55, s1.mid2), P(s1.start - 0.7, s1.mid2)], { slow: true });
  check(near(w.y, 7.95), `RKIC: from the arcade up both flights to level 2 ${JSON.stringify(w)}`);
  w = await route([[29, 20.4], [24.3, 20.4], [24.3, 15], [26.4, 15]]);
  check(w.room === 'rk2:e1' && near(w.y, 7.95), `RKIC: level-2 gallery into the start-up offices ${JSON.stringify(w)}`);
  await shot('rk-level2-room');
  w = await route([[24.3, 15], [20, 13.6]]);
  await face(0, 1, -0.3); await page.waitForTimeout(300); await shot('rk-level2-gallery');
}
await at(24.2, 22, 0.45, -1, 0);
w = await route([[9.3, 22.5], [5, 22.5]]);
check(w.room === 'rk0:r2', `RKIC: arcade into the Maker Space ${JSON.stringify(w)}`);

// ======================= LTC =======================
use('Lecture Theatre Complex');
await at(64, 48, 0, -1, 0);
await shot('ltc-east-entrance');
w = await route([[60, 48], [53, 48], [45, 48]]);
check(near(w.y, 0.45) && w.u < 46, `LTC: through the east entrance to the arcade ${JSON.stringify(w)}`);
w = await route([[45, 50], [41.5, 50], [38, 50]]);
check(near(w.y, 0, 0.08) && w.room === 'ltcLawn', `LTC: down the steps to the lawn ${JSON.stringify(w)}`);
w = await route([[30.5, 58], [28.5, 58], [32, 58]]);
check(near(w.y, 0.66, 0.1), `LTC: up onto the circular stage ${JSON.stringify(w)}`);
await face(-1, 0, 0.05); await page.waitForTimeout(300); await shot('ltc-lawn-stage');
w = await route([[28, 58], [26, 50], [25.6, 50], [23, 50]]);
check(near(w.y, 0.45), `LTC: up the steps to the west arcade ${JSON.stringify(w)}`);
w = await route([[23, 37.2], [19.6, 37.2], [18.6, 38.1]]);
check(w.room === 'LT1', `LTC: through the front doors into LT1 ${JSON.stringify(w)}`);
w = await route([[10, 38.1], [2.2, 38.1]]);
check(w.y > 3.2 && w.room === 'LT1', `LTC: up the stepped aisle to the back row of LT1 ${JSON.stringify(w)}`);
await face(1, -0.4, -0.2); await page.waitForTimeout(300); await shot('ltc-lt1');
w = await route([[10, 38.1], [17, 38.1]]);
check(near(w.y, 0.45, 0.1), `LTC: back down the aisle ${JSON.stringify(w)}`);
w = await route([[19.6, 37.2], [23, 37.2], [23, 50]]);
// east stair: arcade -> stair hall -> first floor -> verandah -> classroom C14
const lst = (await g((K) => eval(K).stairs, kitExpr('Lecture Theatre Complex')))[0];
await stairUpDown(lst, 'LTC east stair');
await at(45, 29.5, 0.45, 1, 0);
w = await route([[48.5, 29.5], [lst.start - 0.7, lst.mid1], [lst.la0 + 0.55, lst.mid1], [lst.la0 + 0.55, lst.mid2], [lst.start - 0.7, lst.mid2], [48.6, 29.5], [45, 29.5]], { slow: true });
check(near(w.y, 4.65), `LTC: up the east stair and out onto the arcade-roof verandah ${JSON.stringify(w)}`);
w = await route([[45, 64.6], [49.5, 64.6]]);
check(w.room === 'ltc:C14' && near(w.y, 4.65), `LTC: verandah into first-floor classroom C14 ${JSON.stringify(w)}`);
await shot('ltc-classroom-c14');
w = await route([[45, 64.6], [45, 80], [40, 82], [30, 82]]);
check(near(w.y, 4.65), `LTC: along the verandah round the south arcade ${JSON.stringify(w)}`);
await at(34, -3, 0, 0, 1);
w = await route([[34, 4], [34, 14]]);
check(near(w.y, 0.45) && w.v > 12, `LTC: in through the north passage ${JSON.stringify(w)}`);
await at(10, 41.5, 0, 1, 0);
w = await route([[19, 41.5], [23, 41.5]]);
check(near(w.y, 0.45), `LTC: from the theatre gap up to the arcade ${JSON.stringify(w)}`);

// ======================= VFAST =======================
use('VFAST');
await at(7, -5, 0, 0, 1);
await shot('vf-approach');
w = await route([[7, -1.5], [7, 3]]);
check(w.room === 'vfLobby' && near(w.y, 0.3), `VFAST: in through the porch to the lobby ${JSON.stringify(w)}`);
const vst = (await g((K) => eval(K).stairs, kitExpr('VFAST')))[0];
await stairUpDown(vst, 'VFAST lobby stair');
await at(7, 3, 0.3, -1, 0);
w = await route([[vst.mid1, vst.start - 0.7], [vst.mid1, vst.la0 + 0.55], [vst.mid2, vst.la0 + 0.55], [vst.mid2, vst.start - 0.7], [6, 2.5]], { slow: true });
check(w.room === 'vfSuite' && near(w.y, 3.9), `VFAST: up the stair under the arch to the suite ${JSON.stringify(w)}`);
await shot('vf-suite');
w = await route([[vst.mid2, vst.start - 0.7], [vst.mid2, vst.la0 + 0.55], [vst.mid1, vst.la0 + 0.55], [vst.mid1, vst.start - 0.7], [7, 3]], { slow: true });
check(near(w.y, 0.3), `VFAST: back down to the lobby ${JSON.stringify(w)}`);
w = await route([[5.5, 5], [8.25, 8], [8.25, 12], [8.25, 16.1], [4, 16.1]]);
check(w.room === 'vf:W1', `VFAST: lobby -> verandah -> guest room 102 ${JSON.stringify(w)}`);
await shot('vf-guest-room');
await at(28, 20, 0, 1, 0);
w = await route([[31.5, 20], [33.75, 12], [33.75, 8]]);
check(w.room === 'vfDining', `VFAST: lawn -> verandah -> dining hall ${JSON.stringify(w)}`);
await shot('vf-dining');

// ======================= RVCC =======================
use('Rakesh Verma');
const rv = await g((K) => { const k = eval(K); const e = k.entrances[0]; return { u: e.u, v: e.v, W: k.W }; }, kitExpr('Rakesh Verma'));
await at(rv.u + 2, rv.v, 0, -1, 0);
w = await route([[rv.u - 4, rv.v]]);
check(w.room === 'rvSite', `RVCC: in through the open site gate ${JSON.stringify(w)}`);
await at(rv.u + 2, rv.v + 8, 0, -1, 0);
w = await go(rv.u - 6, rv.v + 8, { ms: 3000 });
check(w.u > rv.u - 1.7, `RVCC: the hoarding blocks ${JSON.stringify(w)}`);

// ---------- exterior screenshots ----------
if (SHOTS) {
  const view = async (name, p, l) => { await g(([p, l]) => { const G = window.__game; G.player.place(new G.player.pos.constructor(p[0], p[1] - 1.6, p[2]), 0); G.player.yaw = Math.atan2(-(l[0] - p[0]), -(l[2] - p[2])); G.player.pitch = Math.atan2(l[1] - p[1], Math.hypot(l[0] - p[0], l[2] - p[2])); G.player.velY = 0; G.player.frozen = true; }, [p, l]); await page.waitForTimeout(1200); await shot(name); await g(() => { window.__game.player.frozen = false; }); };
  await view('ext-fd1-aerial', [330, 120, 40], [235, 0, -100]);
  await view('ext-fd1-west', [150, 4, -100], [180, 4, -104]);
  await view('ext-ws-aerial', [300, 70, 40], [236, 0, -20]);
  await view('ext-ws-fd1-gap', [192, 6, -36], [260, 3, -45]);
  await view('ext-nw-aerial', [140, 60, -120], [70, 0, -172]);
  await view('ext-rk-aerial', [95, 55, -230], [48, 0, -285]);
  await view('ext-ltc-aerial', [380, 70, -120], [318, 0, -183]);
  await view('ext-vf-rv-aerial', [560, 45, 270], [470, 0, 330]);
  await view('ext-rv-site', [470, 30, 300], [422, 0, 333]);
}

check(errors.length === 0, 'no console errors');
console.log('ERRORS', JSON.stringify(errors.slice(0, 8)));
console.log(fails.length ? `FAILED ${fails.length}` : 'ALL PASS');
await browser.close();
process.exit(fails.length ? 1 : 0);
