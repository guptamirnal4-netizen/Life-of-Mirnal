// Student Activities Centre (js/world/buildings/sac.js): in through the portico (steps and the ramp), the lobby and
// the east hall into the gameplay auditorium and back out; the north and south arcades from the lawns; the sports
// halls and up and down the Martial Arts mezzanine stair; the club pavilions (Gym, Dance Club); the TOTT terrace;
// walls that must block. Also takes the screenshots. The module frame is the identity, so everything is world x, z.
//   node tests/browser/sac.mjs [OUTDIR] [URL]      (URL defaults to http://localhost:8103/)
//   PERF=1 node tests/browser/sac.mjs              frame timing only: ?nomodules against ?only=sac
import { chromium } from 'playwright-core';
const OUT = process.argv[2] || '.';
const BASE = process.argv[3] || 'http://localhost:8103/';
const SHOTS = process.env.SHOTS !== '0';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu'] });

const place = (pos, look) => {
  const G = window.__game;
  G.player.place(new G.player.pos.constructor(pos[0], pos[1] - 1.6, pos[2]), 0);
  G.player.yaw = Math.atan2(-(look[0] - pos[0]), -(look[2] - pos[2]));
  G.player.pitch = Math.atan2(look[1] - pos[1], Math.hypot(look[0] - pos[0], look[2] - pos[2]));
  G.player.velY = 0; G.player.frozen = true;
};

// ---------- PERF=1: frame timing (rAF gaps, CPU ms per frame, draw calls), ?nomodules against ?only=sac ----------
if (process.env.PERF) {
  const SECS = Number(process.env.PERF_SECS || 5);
  const stats = (a) => { const s = [...a].sort((x, y) => x - y); const avg = s.reduce((p, c) => p + c, 0) / (s.length || 1); return { avg: +avg.toFixed(2), p95: +(s[Math.floor(s.length * 0.95)] || 0).toFixed(2) }; };
  const scenes = [
    ['outside: road at the portico', [-112, 1.7, 304.6], [-140, 4, 304.6]],
    ['outside: aerial', [-90, 90, 380], [-165, 0, 295]],
    ['outside: north lawn', [-150, 1.7, 270], [-175, 4, 300]],
    ['inside: east hall', [-142, 2.1, 304.6], [-170, 2, 304.6]],
  ];
  for (const q of ['nomodules', 'only=sac']) {
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
    await pg.evaluate(() => { const c = document.getElementById('game'); Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => c }); const E = window.__game.explorer; E.walk(new window.__game.player.pos.constructor(-112, 0, 304.6), Math.PI / 2); E.view = 'first'; });
    await pg.waitForTimeout(1200);
    for (const [name, pos, look] of scenes) {
      await pg.evaluate(new Function('a', `(${place.toString()})(a[0], a[1])`), [pos, look]);
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
const check = (ok, what, info = '') => { console.log(ok ? 'PASS' : 'FAIL', what, info ? JSON.stringify(info) : ''); if (!ok) fails.push(what); };
const g = (fn, arg) => page.evaluate(fn, arg);
const yawOf = (dx, dz) => Math.atan2(-dx, -dz);
const at = (x, y, z, dx, dz) => g(([x, y, z, yaw]) => { const G = window.__game; G.player.frozen = false; G.player.place(new G.player.pos.constructor(x, y, z), yaw); G.player.pos.y = y; G.player.velY = 0; }, [x, y, z, yawOf(dx, dz)]);
const face = (dx, dz) => g((yaw) => { window.__game.player.yaw = yaw; window.__game.player.pitch = 0; }, yawOf(dx, dz));
const where = () => g(() => { const G = window.__game; const p = G.player.pos; const kit = G.campus.modules.find((q) => q.m.id === 'sac').kit; return { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), room: G.campus.roomAt(p.x, p.z, p.y) || kit.roomAt(p.x, p.z, p.y)?.id || null }; });
// walk towards (x, z), steering every 150 ms; Shift (walk) for the last couple of metres; gives up after ms
const goTo = async (x, z, ms = 12000, tol = 0.4) => {
  const t0 = Date.now(); let p = await where(); let slow = false;
  while (Date.now() - t0 < ms) {
    const dx = x - p.x; const dz = z - p.z; const d = Math.hypot(dx, dz);
    if (d < tol) break;
    if (d < 2.5 && !slow) { await page.keyboard.down('ShiftLeft'); slow = true; }
    if (d >= 2.5 && slow) { await page.keyboard.up('ShiftLeft'); slow = false; }
    await face(dx, dz);
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(d < 1 ? 60 : 150);
    p = await where();
  }
  await page.keyboard.up('KeyW'); await page.keyboard.up('ShiftLeft');
  await page.waitForTimeout(300);
  return where();
};
const route = async (pts, ms) => { let lo = Infinity; let hi = -Infinity; let p; for (const [x, z] of pts) { p = await goTo(x, z, ms); lo = Math.min(lo, p.y); hi = Math.max(hi, p.y); } return { ...p, lo, hi }; };
// press W towards (dx, dz) for ms without steering (for walls that must block)
const push = async (dx, dz, ms = 2500) => { await face(dx, dz); await page.keyboard.down('KeyW'); await page.waitForTimeout(ms); await page.keyboard.up('KeyW'); await page.waitForTimeout(300); return where(); };
const shot = async (name) => { if (SHOTS) await page.screenshot({ path: `${OUT}/${name}.png` }); };
const view = async (name, pos, look) => { await g(new Function('a', `(${place.toString()})(a[0], a[1])`), [pos, look]); await page.waitForTimeout(1200); await shot(name); await g(() => { window.__game.player.frozen = false; }); };
const near = (a, b, tol = 0.08) => Math.abs(a - b) < tol;

await page.goto(`${BASE}?explore${process.env.FULL ? '' : '&only=sac'}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game?.explorer && window.__game.campus?.modules, null, { timeout: 90000 });
await page.waitForTimeout(1500);
const info = await g(() => {
  const C = window.__game.campus; const m = C.modules.find((q) => q.m.id === 'sac'); const r = C.rooms.auditorium;
  return { modules: C.modules.map((q) => q.m.id), zones: m?.kit.zones.map((z) => [z.name, Math.round(z.u1 - z.u0), Math.round(z.v1 - z.v0)]), stairs: m?.kit.stairs.map((s) => s.name), rooms: m?.kit.rooms.map((q) => q.id), meshes: m && Object.values(m.kit.groups).reduce((n, gr) => n + gr.children.length, 0), shell: m?.kit.groups.shell.children.length, perZone: m && Object.fromEntries(Object.entries(m.kit.groups).map(([k, gr]) => [k, gr.children.length])), room: r && { x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z1, door: r.door, exit: [r.exit.x, r.exit.z] }, spot: C.spots?.auditorium && [C.spots.auditorium.x, C.spots.auditorium.z] };
});
console.log(JSON.stringify(info));
check(info.modules.includes('sac'), 'module built');
check(info.room && info.room.door.side === 'east' && info.room.x0 > -172 && info.room.x1 < -140.5, 'auditorium room still inside the east hall, door east', info.room);
check(info.shell < 110, `merged shell meshes (draw calls seen from outside): ${info.shell}`, info.perZone);
await g(() => { const c = document.getElementById('game'); Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => c }); const E = window.__game.explorer; E.walk(new window.__game.player.pos.constructor(-112, 0, 304.6), Math.PI / 2); E.view = 'first'; E.clock = 10 * 60; });
await page.waitForTimeout(1500);
const AX = info.room.door.at;

// ---------- the portico: up the steps, through the lobby and the east hall into the auditorium ----------
await at(-116, 0, AX + 3, -1, 0);
await shot('ext-portico-approach');
let p = await goTo(-127.8, AX + 3);
check(near(p.y, 0.45), 'up the portico steps onto the landing (y 0.45)', p);
p = await route([[-129, AX], [-136, AX]]);
check(near(p.y, 0.45) && p.x < -134, 'through the main door into the lobby', p);
await face(-1, 0); await shot('int-lobby');
p = await goTo(-143.0, AX);
check(near(p.y, 0.45) && p.x < -141, 'through the east-wall door into the hall vestibule', p);
p = await route([[-146.5, AX], [-152, AX]]);
check(p.room === 'auditorium' && near(p.y, 0), 'down the three steps into the auditorium (gameplay room)', p);
await face(-1, 0); await shot('int-auditorium-mural');
p = await route([[-146.5, AX], [-143, AX], [-136, AX], [-128, AX - 0.2], [-120, AX]]);
check(near(p.y, 0, 0.05) && p.x > -121 && p.hi > 0.4, 'back out of the auditorium, up to the vestibule and down to the forecourt', p);
// the central ramp
await at(-119, 0, AX, -1, 0);
p = await goTo(-127.6, AX);
check(near(p.y, 0.45, 0.06), 'up the central ramp to the portico landing', p);
p = await goTo(-119, AX);
check(near(p.y, 0, 0.05), 'down the ramp to the forecourt', p);

// ---------- the arcades from the lawns ----------
await at(-156, 0, 286, 0, 1);
p = await goTo(-156, 293.8);
check(near(p.y, 0.45) && p.z > 292, 'north lawn up the steps into the north arcade aisle', p);
await face(0, 1); await shot('int-hall-north-aisle');
p = await goTo(-156, 286);
check(near(p.y, 0.0, 0.05), 'back down to the north lawn', p);
await at(-156, 0, 322, 0, -1);
p = await goTo(-156, 315.2);
check(near(p.y, 0.45) && p.z < 316.5, 'south lawn up into the south arcade aisle', p);
await face(-1, 0); await shot('int-hall-south-aisle');
p = await goTo(-156, 322);
check(near(p.y, 0.0, 0.05), 'back down to the south lawn', p);

// ---------- sports halls: badminton (north door), the Martial Arts mezzanine stair up and down, TT ----------
await at(-186, 0, 285, 0, 1);
p = await goTo(-186, 295);
check(near(p.y, 0.45) && p.room === 'badminton', 'in through the north door into the badminton hall', p);
await face(0, 1); await shot('int-badminton');
p = await route([[-181.5, 291.0], [-179.5, 290.95], [-175.0, 290.95], [-173.4, 290.95], [-172.4, 296]]);
check(near(p.y, 4.45) && p.room === 'martial', 'up the stair onto the Martial Arts mezzanine', p);
await face(-1, 0); await shot('int-martial-arts');
p = await push(-1, 0, 2000);
check(p.x > -174.3 && near(p.y, 4.45), 'the gallery wall holds at the mezzanine edge', p);
p = await route([[-173.4, 290.95], [-175.0, 290.95], [-180.0, 290.95], [-182, 292.5]]);
check(near(p.y, 0.45) && p.lo < 0.5, 'down the mezzanine stair to the badminton floor', p);
await at(-179.5, 0.45, 293, 0, 1); await face(0, 1);
await page.waitForTimeout(400); await shot('int-mezzanine-stair');
p = await route([[-178, 307], [-178, 312]]);
check(near(p.y, 0.45) && p.room === 'tt', 'through the partition door into the table-tennis hall', p);
await face(1, 0.3); await shot('int-table-tennis');
p = await route([[-186, 323.5], [-186, 330]]);
check(near(p.y, 0.15, 0.05) && p.z > 328, 'out of the south door onto the south corridor', p);

// ---------- club pavilions ----------
await at(-189, 0.15, 281, 0, -1);
p = await route([[-189, 274.75], [-196, 274.75]]);
check(p.room === 'gym' && near(p.y, 0.3), 'NW corridor into the Health Club (gym)', p);
await face(-1, 0); await shot('int-gym');
p = await route([[-189, 274.75], [-189, 266]]);
p = await goTo(-195, 265.75);
check(p.room === 'gym2', 'into Gym 2 (cardio)', p);
await at(-178, 0.15, 328, 0, 1);
p = await route([[-178, 334.75], [-186, 334.75]]);
check(p.room === 'dance' && near(p.y, 0.3), 'SW corridor into the Dance Club', p);
await face(-1, 0); await shot('int-dance-club');

// ---------- TOTT terrace ----------
await at(-154, 0, 271, 0, -1);
p = await goTo(-154, 262);
check(near(p.y, 0.45), 'up the steps onto the TOTT terrace', p);
await face(0, -1); await shot('ext-tott-terrace');

// ---------- walls block ----------
await at(-203, 0, 305, 1, 0);
p = await push(1, 0);
check(p.x < -200.1, 'the west block west wall blocks', p);
await at(-127.5, 0, 315, -1, 0);
p = await push(-1, 0);
check(p.x > -129.2, 'the east wing wall blocks', p);
await at(-150, 0.45, 293.5, 0, 1);
p = await push(0, 1);
check(p.z < 296.2, 'the lining round the auditorium blocks', p);

// ---------- screenshots ----------
if (SHOTS) {
  await view('ext-street-portico', [-113, 1.7, AX + 9], [-130, 4, AX]);
  await view('ext-portico-front', [-118, 2.5, AX], [-130, 4.5, AX]);
  await view('ext-north-lawn', [-150, 1.7, 271], [-168, 3, 300]);
  await view('ext-from-se', [-110, 12, 345], [-160, 3, 300]);
  await view('ext-from-nw', [-215, 14, 235], [-170, 2, 290]);
  await view('ext-looters', [-165, 3, 225], [-180, 2, 236]);
  await view('aerial', [-80, 110, 390], [-165, 0, 295]);
  await view('aerial-top', [-165, 170, 300.1], [-165, 0, 300]);
}

check(errors.length === 0, 'no console errors');
console.log('ERRORS', JSON.stringify(errors.slice(0, 8)));
console.log(fails.length ? `FAILED ${fails.length}` : 'ALL PASS');
await browser.close();
process.exit(fails.length ? 1 : 0);
