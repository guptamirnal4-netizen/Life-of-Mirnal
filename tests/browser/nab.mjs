// New Academic Block walk test: in through the portals (down to level -01), along the courtyard, down and up
// every stair (portal stairs, the canopy stair, the two dog-legs to level -02, the South side ramp), into the key
// rooms and both gameplay rooms, and against walls and rails. Real key presses; positions in the NAB frame.
// node tests/browser/nab.mjs [OUTDIR] [URL]   (dev server: PORT=8092 node dev/server.mjs)
import { chromium } from 'playwright-core';
const OUT = process.argv[2] || '.';
const BASE = process.argv[3] || 'http://localhost:8092/';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const fails = [];
const check = (ok, what) => { console.log(ok ? 'PASS' : 'FAIL', what); if (!ok) fails.push(what); };
const g = (fn, arg) => page.evaluate(fn, arg);
const K = 'window.__game.campus.modules.find(m=>m.m.id==="nab").kit';
const at = (u, v, y, du = 0, dv = 1) => g(([u, v, y, du, dv, K]) => { const kit = eval(K); const G = window.__game; G.player.place(kit.world(u, v, y), kit.yaw(-du, -dv)); G.player.pos.y = y; G.player.velY = 0; }, [u, v, y, du, dv, K]);
const where = () => g((K) => { const kit = eval(K); const G = window.__game; const p = G.player.pos; const [u, v] = kit.local(p.x, p.z); return { u: +u.toFixed(2), v: +v.toFixed(2), y: +p.y.toFixed(2), room: G.campus.roomAt(p.x, p.z, p.y) }; }, K);
// walk towards local (u, v), steering every 150 ms; stops when within `near` metres or after `ms`
const go = async (u, v, { ms = 20000, near = 0.5, slow = false } = {}) => {
  const t0 = Date.now();
  if (slow) await page.keyboard.down('ShiftLeft');
  await page.keyboard.down('KeyW');
  let w;
  for (;;) {
    w = await g(([u, v, K]) => { const kit = eval(K); const G = window.__game; const p = G.player.pos; const [pu, pv] = kit.local(p.x, p.z); const d = Math.hypot(u - pu, v - pv); if (d > 0.05) G.player.yaw = kit.yaw(-(u - pu) / d, -(v - pv) / d); return d; }, [u, v, K]);
    if (w < near || Date.now() - t0 > ms) break;
    await page.waitForTimeout(150);
  }
  await page.keyboard.up('KeyW');
  if (slow) await page.keyboard.up('ShiftLeft');
  await page.waitForTimeout(350);
  return where();
};
// a route: list of [u, v]; returns the lowest and highest y seen at the waypoints and the end
const route = async (pts, opts) => { let lo = Infinity; let hi = -Infinity; let w; for (const [u, v] of pts) { w = await go(u, v, opts); lo = Math.min(lo, w.y); hi = Math.max(hi, w.y); } return { ...w, lo, hi }; };
const near = (a, b, tol = 0.15) => Math.abs(a - b) < tol;
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });

await page.goto(`${BASE}?explore&only=nab`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game?.explorer && window.__game.campus?.modules, null, { timeout: 60000 });
await page.waitForTimeout(1500);
await g(() => { const c = document.getElementById('game'); Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => c }); });
const info = await g((K) => { const kit = eval(K); const c = window.__game.campus; return { stairs: kit.stairs.map((s) => s.name), pits: c.pits.length, rooms: Object.fromEntries(['classroom', 'classroomB'].map((id) => { const r = c.rooms[id]; return [id, { y0: r.y0, outside: kit.local(r.outside.x, r.outside.z), inside: kit.local(r.inside.x, r.inside.z), host: r.host }]; })), passages: c.passages.length, navLinks: kit.navLinks.length }; }, K);
console.log('stairs', JSON.stringify(info.stairs));
check(info.pits === 1, 'one sunken pit (ground hole) for the whole NAB');
check(info.rooms.classroom.y0 === -4.5 && info.rooms.classroomB.y0 === -4.5, 'both gameplay rooms stand at level -01 (y -4.5)');
check(info.passages === 0 && info.navLinks >= 8, `at-grade passages replaced by portal/courtyard nav links (${info.navLinks})`);
await g((K) => { const kit = eval(K); const E = window.__game.explorer; E.walk(kit.world(104, 68.2, 0), kit.yaw(1, 0)); }, K);
await page.waitForTimeout(800);

// ---- Portal 02 (Krishna Marg): the main entrance, down to level -01 and through to the courtyard ----
await at(104, 68.2, 0, -1, 0);
let w = await go(95.5, 68.2);
check(w.y > -0.2, `Portal 02: at the pavilion at grade ${JSON.stringify(w)}`);
await shot('test-portal02-in');
w = await route([[86.5, 68.2], [80, 68.2], [62, 68.6], [44, 68.6]]);
check(near(w.y, -4.5) && w.u < 46, `Portal 02: down the stair and through the cross-corridor to the courtyard ${JSON.stringify(w)}`);
await shot('test-courtyard-from-portal02');
w = await route([[62, 68.6], [80, 68.2], [86.5, 68.2], [96, 68.2], [103, 68.2]]);
check(w.y > -0.05 && w.u > 101, `Portal 02: back up to Krishna Marg ${JSON.stringify(w)}`);

// ---- Portal 01 (Ram Marg) ----
await at(-27, 66.2, 0, 1, 0);
w = await route([[-17, 66.2], [-6, 66.2], [10, 65.8], [33, 65.8]]);
check(near(w.y, -4.5) && w.u > 31, `Portal 01: down from Ram Marg to the courtyard ${JSON.stringify(w)}`);
w = await route([[10, 65.8], [-6, 66.2], [-17, 66.2], [-26, 66.2]]);
check(w.y > -0.05 && w.u < -24, `Portal 01: back up to Ram Marg ${JSON.stringify(w)}`);

// ---- Portal 03 (Budh Stairs) and Portal 04 (Gandhi Stairs), south, to the galleries ----
await at(-27, 185, 0, 1, 0);
w = await route([[-17, 185], [-6, 185], [10, 185], [23.5, 185]]);
check(near(w.y, -4.5) && w.u > 22, `Portal 03: down to the west gallery ${JSON.stringify(w)}`);
w = await route([[10, 185], [-6, 185], [-17, 185], [-26, 185]]);
check(w.y > -0.05, `Portal 03: back up ${JSON.stringify(w)}`);
await at(103, 192.5, 0, -1, 0);
w = await route([[95.5, 192.5], [86, 192.5], [70, 192.5], [50.5, 192.5]]);
check(near(w.y, -4.5) && w.u < 52, `Portal 04: down to the east gallery ${JSON.stringify(w)}`);
w = await route([[70, 192.5], [86, 192.5], [95.5, 192.5], [103, 192.5]]);
check(w.y > -0.05, `Portal 04: back up ${JSON.stringify(w)}`);

// ---- the canopy stair: north courtyard (-01) down to the lower courtyard (-02) and back ----
await at(39, 120, -4.5, 0, 1);
w = await route([[39, 127], [39, 133], [39, 141]]);
check(near(w.y, -9), `canopy stair down to the lower courtyard ${JSON.stringify(w)}`);
await shot('test-lower-courtyard');
w = await route([[39, 133], [39, 126], [39, 120]]);
check(near(w.y, -4.5), `canopy stair back up ${JSON.stringify(w)}`);

// ---- dog-leg S6 (west): lower colonnade (-02) up to the gallery (-01) and down ----
const sw = await g((K) => { const kit = eval(K); return kit.stairs.find((s) => /S6/.test(s.name)); }, K);
const sw1 = sw.v0 + (sw.v1 - sw.v0 - 0.1) / 4; const sw2 = sw.v1 - (sw.v1 - sw.v0 - 0.1) / 4;
await at(27.6, sw1, -9, -1, 0);
w = await route([[sw.u1 - 0.3, sw1], [sw.u0 + 1.0, sw1]], { slow: true });
const swMid = w.y;
await shot('test-dogleg-west');
w = await route([[sw.u0 + 1.0, sw2], [sw.u1 - 0.2, sw2], [27.6, sw2]], { slow: true });
check(near(swMid, -6.75, 0.3) && near(w.y, -4.5), `dog-leg S6 up: half landing ${swMid}, gallery ${JSON.stringify(w)}`);
w = await route([[sw.u1 - 0.3, sw2], [sw.u0 + 1.0, sw2], [sw.u0 + 1.0, sw1], [sw.u1 - 0.2, sw1], [27.6, sw1]], { slow: true });
check(near(w.y, -9), `dog-leg S6 down to the colonnade ${JSON.stringify(w)}`);

// ---- dog-leg S5 (east) ----
const se = await g((K) => { const kit = eval(K); return kit.stairs.find((s) => /S5/.test(s.name)); }, K);
const se1 = se.v0 + (se.v1 - se.v0 - 0.1) / 4; const se2 = se.v1 - (se.v1 - se.v0 - 0.1) / 4;
await at(52.4, se1, -9, 1, 0);
w = await route([[se.u0 + 0.3, se1], [se.u1 - 1.0, se1]], { slow: true });
const seMid = w.y;
w = await route([[se.u1 - 1.0, se2], [se.u0 + 0.2, se2], [52.4, se2]], { slow: true });
check(near(seMid, -6.75, 0.3) && near(w.y, -4.5), `dog-leg S5 up: half landing ${seMid}, gallery ${JSON.stringify(w)}`);
w = await route([[se.u0 + 0.3, se2], [se.u1 - 1.0, se2], [se.u1 - 1.0, se1], [se.u0 + 0.2, se1], [52.4, se1]], { slow: true });
check(near(w.y, -9), `dog-leg S5 down to the colonnade ${JSON.stringify(w)}`);

// ---- South side ramp: lower courtyard up to Gandhi Marg and back ----
await at(37.25, 238, -9, 0, 1);
w = await route([[37.25, 270], [37.25, 303]]);
check(w.y > -0.05 && w.v > 300, `South side ramp up to grade ${JSON.stringify(w)}`);
w = await route([[37.25, 270], [37.25, 238]]);
check(near(w.y, -9), `South side ramp back down ${JSON.stringify(w)}`);

// ---- key rooms ----
await at(28, 13.8, -4.5, -1, 0);
w = await go(20, 13.8);
check(near(w.y, -4.5) && w.u < 21, `classroom 6151 from the courtyard colonnade ${JSON.stringify(w)}`);
await shot('test-classroom-6151');
await at(51.6, 93, -4.5, 1, 0);
w = await route([[55, 93], [63, 93], [63, 100]]);
check(w.u > 54 && w.y > -3.6, `J.C. Chaudhry Auditorium 6110: in and up the tiers ${JSON.stringify(w)}`);
await shot('test-auditorium-6110');
w = await route([[63, 93], [55, 93], [51.6, 93]]);
check(near(w.y, -4.5), `out of 6110 down the tiers ${JSON.stringify(w)}`);
await at(27.6, 175.1, -9, -1, 0);
w = await go(21, 175.1);
check(near(w.y, -9) && w.u < 22, `Mathematics 6067 (level -02) from the lower colonnade ${JSON.stringify(w)}`);
await shot('test-maths-6067');

// ---- gameplay rooms: from the courtyard into the Lecture Theatre (6163) and to the Tutorial Room ----
const ci = info.rooms.classroom;
await at(36, 124, -4.5, -1, 0);
w = await route([[24, 126], [15, 126], [ci.outside[0], ci.outside[1]], [ci.inside[0], ci.inside[1]]], { slow: true });
check(w.room === 'classroom' && near(w.y, -4.5), `Lecture Theatre (classroom) from the courtyard via the foyer ${JSON.stringify(w)}`);
await shot('test-lecture-theatre');
const ti = info.rooms.classroomB;
await at(86, 192.5, -4.5, 0, 1);
w = await route([[84, 205], [76, 214], [ti.outside[0], ti.outside[1]], [ti.inside[0], ti.inside[1]]], { slow: true });
check(w.room === 'classroomB' && near(w.y, -4.5), `Tutorial Room (classroomB) from the Portal 04 stair foot ${JSON.stringify(w)}`);
await shot('test-tutorial-room');

// ---- walls block, rails hold ----
await at(-6, 40, -4.5, 1, 0);
w = await go(5, 40, { ms: 2500 });
check(w.u < -2.9, `the outer facade blocks (light-well into the west block) ${JSON.stringify(w)}`);
await at(25, 40, 0.08, 1, 0);
w = await go(40, 40, { ms: 3000 });
check(w.y > 0 && w.u < 30, `the roof railing holds at the courtyard edge ${JSON.stringify(w)}`);
await at(-20, 40, 0, 1, 0);
w = await go(-5, 40, { ms: 3000 });
check(w.y > -0.05 && w.u < -13.5, `the light-well railing holds at grade ${JSON.stringify(w)}`);
await at(27.6, 160, -4.5, 1, 0);
w = await go(40, 160, { ms: 2500 });
check(near(w.y, -4.5) && w.u < 29.5, `the gallery railing holds over the lower courtyard ${JSON.stringify(w)}`);

console.log('ERRORS', JSON.stringify(errors.slice(0, 8)));
console.log(fails.length || errors.length ? `SOME FAILED (${fails.length})` : 'ALL PASS');
await browser.close();
process.exit(fails.length || errors.length ? 1 : 0);
