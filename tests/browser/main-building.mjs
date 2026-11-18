// Main Building, Clock Tower and Rotunda (js/world/buildings/main-building.js): walk in through the porch, round the
// ground floor, up and down both tower-hall stairs, onto the terrace and the spine verandah, into Physics Lab 2247A
// and the Auditorium, into the gameplay lab, and down/up every Rotunda stair. Also takes the screenshots.
//   node tests/browser/main-building.mjs [OUTDIR] [URL]      (URL defaults to http://localhost:8093/)
//   PERF=1 node tests/browser/main-building.mjs              frame timing only: ?nomodules against this module
import { chromium } from 'playwright-core';
const OUT = process.argv[2] || '.';
const BASE = process.argv[3] || 'http://localhost:8093/';
const SHOTS = process.env.SHOTS !== '0';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu'] });

// ---------- PERF=1: perf.mjs-style frame timing (rAF gaps, CPU ms per frame, draw calls) ----------
if (process.env.PERF) {
  const SECS = Number(process.env.PERF_SECS || 6);
  const stats = (a) => { const s = [...a].sort((x, y) => x - y); const avg = s.reduce((p, c) => p + c, 0) / (s.length || 1); return { avg: +avg.toFixed(2), p95: +(s[Math.floor(s.length * 0.95)] || 0).toFixed(2) }; };
  const scenes = [
    ['outside: Rotunda → tower', [0, -2.9, 12], [-9.3, 18, -62]],
    ['outside: forecourt drone', [-9.3, 42, 30], [-9.3, 10, -62]],
    ['outside: aerial', [60, 140, 60], [-10, 0, -50]],
    ['outside: west range', [-58, 1.6, -36], [-38, 4, -56]],
    ['inside: foyer', [-9.3, 2.5, -50], [-9.3, 2, -66]],
    ['inside: auditorium', [-17.7, 2.5, -86], [-17.7, 2, -125]],
  ];
  for (const q of ['nomodules', 'only=main-building']) {
    const pg = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    pg.setDefaultTimeout(30000);
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
    await pg.evaluate(() => { const c = document.getElementById('game'); Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => c }); const E = window.__game.explorer; const p = E.places.find((r) => /Clock Tower/.test(r.name)); E.select(p); E.enter(p); E.view = 'first'; });
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
page.setDefaultTimeout(30000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const fails = [];
const check = (ok, what, info = '') => { console.log(ok ? 'PASS' : 'FAIL', what, info ? JSON.stringify(info) : ''); if (!ok) fails.push(what); };
const g = (fn, arg) => page.evaluate(fn, arg);
// yaw so the player faces world direction (dx, dz); the player looks down -z at yaw 0
const yawOf = (dx, dz) => Math.atan2(-dx, -dz);
const at = (x, y, z, dx, dz) => g(([x, y, z, yaw]) => { const G = window.__game; G.player.place(new G.player.pos.constructor(x, y, z), yaw); G.player.velY = 0; }, [x, y, z, yawOf(dx, dz)]);
const face = (dx, dz) => g((yaw) => { window.__game.player.yaw = yaw; }, yawOf(dx, dz));
const where = () => g(() => { const p = window.__game.player.pos; return { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), room: window.__game.campus.roomAt(p.x, p.z) }; });
const walk = async (ms, keys = ['KeyW']) => { for (const k of keys) await page.keyboard.down(k); await page.waitForTimeout(ms); for (const k of keys) await page.keyboard.up(k); await page.waitForTimeout(350); };
// walk towards (x, z) until within tol (steering every 150 ms); gives up after ms
const goTo = async (x, z, ms = 9000, tol = 0.35) => {
  const t0 = Date.now();
  let p = await where();
  let slow = false;
  while (Date.now() - t0 < ms) {
    const dx = x - p.x; const dz = z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < tol) break;
    // run while far, walk (Shift) for the last couple of metres so it stops on the mark
    if (d < 2.5 && !slow) { await page.keyboard.down('ShiftLeft'); slow = true; }
    if (d >= 2.5 && slow) { await page.keyboard.up('ShiftLeft'); slow = false; }
    await face(dx, dz);
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(Math.hypot(dx, dz) < 1 ? 60 : 150);
    p = await where();
  }
  await page.keyboard.up('KeyW'); await page.keyboard.up('ShiftLeft');
  await page.waitForTimeout(300);
  return where();
};
const shot = async (name) => { if (SHOTS) await page.screenshot({ path: `${OUT}/${name}.png` }); };
const near = (p, x, y, z, tol = 0.6) => Math.abs(p.x - x) < tol && Math.abs(p.z - z) < tol && Math.abs(p.y - y) < 0.12;

await page.goto(`${BASE}?explore&only=main-building`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game?.explorer && window.__game.campus?.modules, null, { timeout: 90000 });
await page.waitForTimeout(1500);
const info = await g(() => {
  const C = window.__game.campus; const m = C.modules.find((q) => q.m.id === 'main-building');
  const lab = C.rooms.sciencelab;
  return { modules: C.modules.map((q) => q.m.id), owned: [...C.owned], zones: m?.kit.zones.map((z) => z.name), stairs: m?.kit.stairs.map((s) => s.name), lab: lab && { x0: lab.x0, x1: lab.x1, z0: lab.z0, z1: lab.z1, exit: [lab.exit.x, lab.exit.z] }, ground: C.groundAt(0, 0), stage: C.spots.stage, assembly: C.spots.assemblyPlayer };
});
console.log(JSON.stringify(info));
check(info.modules.includes('main-building'), 'module built');
check(info.owned.includes('clockTower') && info.owned.includes('rotunda'), 'owns the Clock Tower and the Rotunda');
check(info.lab && info.lab.x1 < -27.5 && info.lab.x0 > -70, 'sciencelab moved clear of the tower block', info.lab);
check(info.ground === -4.5, 'Rotunda floor is sunk to -4.5');
await g(() => { const c = document.getElementById('game'); Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => c }); });
await g(() => { const E = window.__game.explorer; const p = E.places.find((q) => /Clock Tower/.test(q.name)); E.select(p); E.enter(p); });
await page.waitForTimeout(1200);
await g(() => { window.__game.explorer.clock = 10 * 60; });

// ---------- exterior views ----------
const view = async (name, pos, look) => {
  await g(([p, l]) => {
    const G = window.__game; const cam = G.player.camera || G.camera;
    G.player.place(new G.player.pos.constructor(p[0], p[1] - 1.6, p[2]), 0);
    G.player.yaw = Math.atan2(-(l[0] - p[0]), -(l[2] - p[2]));
    G.player.pitch = Math.atan2(l[1] - p[1], Math.hypot(l[0] - p[0], l[2] - p[2]));
    G.player.velY = 0; G.player.frozen = true; void cam;
  }, [pos, look]);
  await page.waitForTimeout(900);
  await shot(name);
  await g(() => { window.__game.player.frozen = false; });
};
await g(() => { window.__game.explorer.view = 'first'; });

// ---------- walk in through the porch ----------
await at(-9.3, 0, -36, 0, -1);
await shot('ext-porch-approach');
let p = await goTo(-9.3, -44.6);
check(Math.abs(p.y - 0.9) < 0.05, 'up the porch steps onto the terrace (y 0.9)', p);
p = await goTo(-9.3, -52);
check(p.z < -50 && Math.abs(p.y - 0.9) < 0.05, 'through the main door into the foyer', p);
await face(0, -1); await page.waitForTimeout(500); await shot('int-foyer');
p = await goTo(-9.3, -60.5);
check(p.z < -59.5, 'through the carved doors into the inner foyer', p);
p = await goTo(-12, -63); await face(1, 1); await page.waitForTimeout(400); await shot('int-inner-foyer-bust');
p = await goTo(-9.3, -68);
p = await goTo(-14.3, -69); p = await goTo(-14.3, -80.5, 9000);
check(p.z < -79.5 && Math.abs(p.y - 0.9) < 0.05, 'corridor → inner hall beside the light-court', p);
await face(0.5, 1); await page.waitForTimeout(400); await shot('int-inner-hall');
p = await goTo(-9.3, -80.6);
p = await goTo(-9.3, -84);
check(p.z < -83, 'through the carved doors into the Auditorium', p);
// the door opens onto the cross aisle behind the last bench row; the centre aisle runs down to the stage
p = await goTo(-17.7, -84.2);
check(Math.abs(p.x + 17.7) < 0.6, 'along the rear cross aisle to the centre aisle', p);
await face(0, -1); await page.waitForTimeout(500); await shot('int-auditorium');
p = await goTo(-17.7, -118, 12000);
check(p.z < -117, 'down the Auditorium aisle towards the stage', p);
p = await goTo(-17.7, -120.5); p = await goTo(-17.7, -124);
check(Math.abs(p.y - 2.0) < 0.1, 'up the stage steps', p);
p = await goTo(-17.7, -118); p = await goTo(-17.7, -84.2, 12000); p = await goTo(-9.3, -84.2); p = await goTo(-9.3, -84); p = await goTo(-9.3, -80.6); p = await goTo(-14.3, -80.5); p = await goTo(-14.3, -69); p = await goTo(-9.3, -68);
check(p.z > -69 && Math.abs(p.y - 0.9) < 0.05, 'back out to the cross corridor', p);

// ---------- both stairs up and down ----------
for (const s of [-1, 1]) {
  const C = -9.3; const name = s < 0 ? 'west' : 'east';
  p = await goTo(C + s * 11.4, -68);
  p = await goTo(C + s * 11.4, -65.0);
  check(p.z > -65.5, `${name} stair: into the vestibule from the corridor`, p);
  p = await goTo(C + s * 16.6, -65.0, 9000);
  check(Math.abs(p.y - 3.15) < 0.12, `${name} stair: flight 1 up to the half landing (3.15)`, p);
  if (s > 0) { await face(-1, 0); await page.waitForTimeout(300); await shot('int-stair-landing'); }
  p = await goTo(C + s * 16.6, -63.0);
  p = await goTo(C + s * 11.5, -63.0, 9000);
  check(Math.abs(p.y - 5.4) < 0.08, `${name} stair: flight 2 up to the first floor (5.4)`, p);
  p = await goTo(C + s * 11.5, -68);
  check(Math.abs(p.y - 5.4) < 0.08 && p.z < -67, `${name} stair: onto the first-floor corridor`, p);
  if (s < 0) {
    // first-floor hall and the terrace under the tower
    p = await goTo(-13.3, -68); p = await goTo(-13.3, -59.2);
    await face(0.6, -1); await page.waitForTimeout(300); await shot('int-first-floor-hall');
    p = await goTo(-9.3, -59.2); p = await goTo(-9.3, -56); p = await goTo(-9.3, -50);
    check(p.z > -51 && Math.abs(p.y - 5.4) < 0.08, 'first-floor hall → out onto the terrace below the tower', p);
    await face(0.15, -1); await g(() => { window.__game.player.pitch = 0.9; }); await page.waitForTimeout(500); await shot('ext-terrace-tower-up');
    await g(() => { window.__game.player.pitch = 0; });
    p = await goTo(-9.3, -48.2);
    check(p.z < -47.6, 'terrace parapet holds you in', p);
    p = await goTo(-9.3, -59.2); p = await goTo(-13.3, -59.2); p = await goTo(-13.3, -68);
    // west side hall → verandah → Physics Lab 2247A
    p = await goTo(C - 11.4, -68); p = await goTo(C - 11.4, -61); p = await goTo(C - 14.5, -56); p = await goTo(C - 14.5, -54.7);
    p = await goTo(-30, -54.7, 9000);
    check(p.x < -28.5 && Math.abs(p.y - 5.4) < 0.08, 'side hall → door → first-floor verandah of the west range', p);
    await face(-1, 0); await page.waitForTimeout(400); await shot('ext-first-floor-verandah');
    p = await goTo(-46, -54.7, 9000);
    p = await goTo(-46, -60);
    check(p.z < -59 && Math.abs(p.y - 5.4) < 0.08, 'into Physics Laboratory 2247A', p);
    await face(0, -1); await page.waitForTimeout(400); await shot('int-lab-2247a');
    p = await goTo(-46, -63.5);
    check(p.z > -64.5, 'lab benches block the way', p);
    p = await goTo(-46, -54.7); p = await goTo(-30, -54.7, 9000); p = await goTo(C - 14.5, -54.7); p = await goTo(C - 14.5, -61); p = await goTo(C - 11.4, -63.0); p = await goTo(C - 11.4, -68);
    check(Math.abs(p.y - 5.4) < 0.08 && p.z < -67, 'back along the verandah to the corridor', p);
    p = await goTo(C + s * 11.5, -68);
  }
  // and back down
  p = await goTo(C + s * 11.5, -63.0);
  p = await goTo(C + s * 16.6, -63.0, 9000);
  check(Math.abs(p.y - 3.15) < 0.12, `${name} stair: down flight 2 to the landing`, p);
  p = await goTo(C + s * 16.6, -65.0);
  p = await goTo(C + s * 11.4, -65.0, 9000);
  check(Math.abs(p.y - 0.9) < 0.06, `${name} stair: down flight 1 to the ground floor`, p);
  p = await goTo(C + s * 11.4, -68);
  check(Math.abs(p.y - 0.9) < 0.06 && p.z < -67, `${name} stair: back in the corridor`, p);
}
// walls block: try to walk through the corridor's rear wall
p = await goTo(-1, -68); await face(0, -1); await walk(1500);
p = await where();
check(p.z > -69.7, 'the corridor rear wall blocks', p);
// out again through the foyer and down the porch steps
p = await goTo(-10.7, -66); p = await goTo(-10.7, -59); p = await goTo(-9.3, -57); p = await goTo(-9.3, -55); p = await goTo(-9.3, -45); p = await goTo(-9.3, -40);
check(p.z > -41 && Math.abs(p.y) < 0.05, 'back out down the porch steps', p);

// ---------- the gameplay lab in the west range ----------
const lab = info.lab;
const lx = (lab.x0 + lab.x1) / 2;
p = await goTo(lab.exit[0], -48, 15000);
p = await goTo(lab.exit[0], lab.exit[1]);
check(Math.abs(p.z - lab.exit[1]) < 0.6, 'to the lab door on the verandah (exit point)', p);
await face(0, -1); await shot('ext-ground-verandah');
p = await goTo(lab.exit[0], lab.z1 - 2);
check(p.room === 'sciencelab', 'into the gameplay room sciencelab', p);
await face(0, -1); await page.waitForTimeout(300); await shot('int-sciencelab');
void lx;

// ---------- the Rotunda: down and up every stair ----------
const rot = [
  ['east aisle', [27, 0], [16, 0], [1, 0]],
  ['west aisle', [-27, 0], [-16, 0], [-1, 0]],
  ['south aisle', [0, 27], [0, 16], [0, 1]],
  ['NE doorway stair', [14, -29.5], [14, -19], [0, -1]],
  ['NW doorway stair', [-14, -29.5], [-14, -19], [0, -1]],
];
for (const [name, top, bottom] of rot) {
  await at(top[0], 0, top[1], bottom[0] - top[0], bottom[1] - top[1]);
  await page.waitForTimeout(200);
  p = await goTo(bottom[0], bottom[1], 20000);
  check(near(p, bottom[0], -4.5, bottom[1], 0.8), `Rotunda ${name}: down to the floor`, p);
  p = await goTo(top[0], top[1], 20000);
  check(near(p, top[0], 0, top[1], 0.8), `Rotunda ${name}: back up to grade`, p);
}
// the north wall stops you falling in from the forecourt
await at(0, 0, -29, 0, 1); await walk(1500);
p = await where();
check(p.y > -0.1 && p.z < -25, 'Rotunda north parapet: no falling in', p);
// terraces are stepped seating you can climb
await at(10, -4.5, 8, 1, -0.2); p = await goTo(20.5, 6, 15000);
check(p.y > -3.0, 'Rotunda terraces climb', p);
await at(0, -4.5, 14, 0, -1); await page.waitForTimeout(400);
await shot('int-rotunda-floor');

// ---------- the assembly spots stand on the Rotunda floor ----------
const spots = await g(() => window.__game.campus.spots.assembly.map((v) => [v.x, v.y, v.z]));
check(spots.length === 32 && spots.every((s) => s[1] === -4.5 && Math.hypot(s[0], s[2]) < 16.5), 'assembly spots on the Rotunda floor');

// ---------- screenshots: exterior and aerial ----------
if (SHOTS) {
  await view('ext-front-drone', [-9.3, 42, 30], [-9.3, 18, -62]);
  await view('ext-tower-from-rotunda', [0, -2.9, 12], [-9.3, 22, -62]);
  await view('ext-rotunda-north-wall', [3, -2.8, 8], [0, -2.2, -25]);
  await view('ext-west-range', [-58, 3, -36], [-38, 4, -56]);
  await view('ext-auditorium', [-55, 25, -150], [-17, 8, -105]);
  await view('aerial', [60, 140, 60], [-10, 0, -50]);
}

check(errors.length === 0, 'no console errors');
console.log('ERRORS', JSON.stringify(errors.slice(0, 8)));
console.log(fails.length ? `FAILED ${fails.length}` : 'ALL PASS');
await browser.close();
process.exit(fails.length ? 1 : 0);
