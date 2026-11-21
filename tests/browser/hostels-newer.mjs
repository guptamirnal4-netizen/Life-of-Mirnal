// The newer Bhawans (js/world/comb-hostel.js). For each walk-in comb (Ashok, Rana Pratap, Malviya): in through the
// porch's open arch and the vestibule to the lobby, the gated arches and the outer walls block, into a room and the
// common room, up the main stair to the first floor and on to the roof terrace and back down, up and down a wing
// stair. The closed ones (Bhagirath, Malviya-B, SR, Meera) stand where OSM puts them and their walls block. Nothing
// of theirs is on the Clock Tower → Saraswati Mandir sight line. Real key presses; positions in each Bhawan's frame.
// Also takes the screenshots.
//   node tests/browser/hostels-newer.mjs [OUTDIR] [URL]     (dev server: PORT=8105 node dev/server.mjs)
//   PERF=1 node tests/browser/hostels-newer.mjs OUTDIR URL BASELINE_URL   frame timing against another server
import { chromium } from 'playwright-core';
const OUT = process.argv[2] || '.';
const BASE = process.argv[3] || 'http://localhost:8105/';
const SHOTS = process.env.SHOTS !== '0';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu'] });

// ---------- PERF=1: frame timing at a few outside spots, this build against a baseline build ----------
if (process.env.PERF) {
  const OTHER = process.argv[4];
  const SECS = Number(process.env.PERF_SECS || 6);
  const stats = (a) => { const s = [...a].sort((x, y) => x - y); const avg = s.reduce((p, c) => p + c, 0) / (s.length || 1); return { avg: +avg.toFixed(2), p95: +(s[Math.floor(s.length * 0.95)] || 0).toFixed(2) }; };
  const scenes = [
    ['street: Ashok porch', [355, 1.7, 205], [370, 4, 228]],
    ['drone: Ashok and Bhagirath', [400, 45, 170], [300, 0, 240]],
    ['street: Malviya', [-140, 1.7, 175], [-160, 4, 160]],
    ['aerial: SR', [-60, 110, -150], [-80, 0, -250]],
  ];
  const run = async (url) => {
    const pg = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    pg.setDefaultTimeout(90000);
    await pg.addInitScript(() => {
      const P = (window.__perf = { cpu: [], gaps: [], draws: [], last: 0, curDraws: 0 });
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => raf((t) => { if (P.last) P.gaps.push(t - P.last); P.last = t; P.curDraws = 0; const s = performance.now(); cb(t); P.cpu.push(performance.now() - s); P.draws.push(P.curDraws); });
      for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
        if (!C) continue;
        for (const f of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) { const o = C.prototype[f]; if (o) C.prototype[f] = function (...a) { P.curDraws++; return o.apply(this, a); }; }
      }
    });
    await pg.goto(`${url}?explore&nomodules`, { waitUntil: 'load' });
    await pg.waitForFunction(() => window.__game?.explorer && window.__game.campus?.hostels, null, { timeout: 90000 });
    await pg.waitForTimeout(1500);
    await pg.evaluate(() => { const c = document.getElementById('game'); Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => c }); const E = window.__game.explorer; const p = E.places.find((r) => /Ashok/.test(r.name)); E.select(p); E.enter(p); E.view = 'first'; });
    await pg.waitForTimeout(1200);
    const res = {};
    for (const [name, p, l] of scenes) {
      await pg.evaluate(([p, l]) => { const G = window.__game; G.player.place(new G.player.pos.constructor(p[0], p[1] - 1.6, p[2]), 0); G.player.pos.y = p[1] - 1.6; G.player.yaw = Math.atan2(-(l[0] - p[0]), -(l[2] - p[2])); G.player.pitch = Math.atan2(l[1] - p[1], Math.hypot(l[0] - p[0], l[2] - p[2])); G.player.frozen = true; }, [p, l]);
      await pg.waitForTimeout(1500);
      await pg.evaluate(() => { const P = window.__perf; P.cpu = []; P.gaps = []; P.draws = []; });
      await pg.waitForTimeout(SECS * 1000);
      const r = await pg.evaluate(() => ({ cpu: window.__perf.cpu, gaps: window.__perf.gaps, draws: window.__perf.draws }));
      res[name] = { cpu: stats(r.cpu), frame: stats(r.gaps), draws: Math.round(r.draws.reduce((a, b) => a + b, 0) / (r.draws.length || 1)) };
    }
    await pg.close();
    return res;
  };
  const mine = await run(BASE); const base = OTHER ? await run(OTHER) : null;
  for (const [name] of scenes) {
    const a = mine[name]; const b = base?.[name];
    console.log(`${name.padEnd(30)} this: cpu ${a.cpu.avg} ms (p95 ${a.cpu.p95}), frame ${a.frame.avg} ms, ${a.draws} draws${b ? `   baseline: cpu ${b.cpu.avg} ms (p95 ${b.cpu.p95}), frame ${b.frame.avg} ms, ${b.draws} draws` : ''}`);
  }
  await browser.close();
  process.exit(0);
}

const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(90000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const fails = [];
const check = (ok, what) => { console.log(ok ? 'PASS' : 'FAIL', what); if (!ok) fails.push(what); };
const g = (fn, arg) => page.evaluate(fn, arg);
const shot = (name) => (SHOTS ? page.screenshot({ path: `${OUT}/${name}.png` }) : null);
const near = (a, b, tol = 0.15) => Math.abs(a - b) < tol;

await page.goto(`${BASE}?explore&only=hostels-newer`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game?.explorer && window.__game.campus?.hostels, null, { timeout: 90000 });
await page.waitForTimeout(1500);
await g(() => { const c = document.getElementById('game'); Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => c }); const E = window.__game.explorer; const p = E.places.find((q) => /Ashok/.test(q.name)); E.select(p); E.enter(p); E.view = 'first'; E.clock = 10 * 60; });
await page.waitForTimeout(1200);

// in-page helpers: HN = the Bhawan we are testing
let HN = null;
const H = 'window.__game.campus.hostels.find((x) => x.name === window.__HN)';
const setH = async (name) => { HN = name; await g((n) => { window.__HN = n; }, name); };
const at = (u, v, y = 0, du = 1, dv = 0) => g(([u, v, y, du, dv, H]) => {
  const B = eval(H); const G = window.__game; const p = B.world(u, v, y); const q = B.world(u + du, v + dv, y);
  G.player.place(p, Math.atan2(-(q.x - p.x), -(q.z - p.z))); G.player.pos.y = y; G.player.velY = 0; G.player.frozen = false; G.player.pitch = 0;
}, [u, v, y, du, dv, H]);
const where = () => g((H) => { const B = eval(H); const G = window.__game; const p = G.player.pos; const [u, v] = B.local(p.x, p.z); return { u: +u.toFixed(2), v: +v.toFixed(2), y: +p.y.toFixed(2), room: G.campus.roomAt(p.x, p.z, p.y) }; }, H);
// walk towards local (u, v), steering every 120 ms; stops within `near` metres or after `ms`
const go = async (u, v, { ms = 12000, near: nr = 0.35, slow = false } = {}) => {
  const t0 = Date.now();
  if (slow) await page.keyboard.down('ShiftLeft');
  await page.keyboard.down('KeyW');
  for (;;) {
    const d = await g(([u, v, H]) => { const B = eval(H); const G = window.__game; const p = G.player.pos; const [pu, pv] = B.local(p.x, p.z); const d = Math.hypot(u - pu, v - pv); if (d > 0.05) { const q = B.world(u, v); G.player.yaw = Math.atan2(-(q.x - p.x), -(q.z - p.z)); } return d; }, [u, v, H]);
    if (d < nr || Date.now() - t0 > ms) break;
    await page.waitForTimeout(120);
  }
  await page.keyboard.up('KeyW');
  if (slow) await page.keyboard.up('ShiftLeft');
  await page.waitForTimeout(300);
  return where();
};
const route = async (pts, opts) => { let lo = Infinity; let hi = -Infinity; let w; for (const [u, v] of pts) { w = await go(u, v, opts); lo = Math.min(lo, w.y); hi = Math.max(hi, w.y); } return { ...w, lo, hi }; };
// push towards (u, v) for ms without steering away, and report where you ended up
const push = async (du, dv, ms = 1800) => {
  await g(([du, dv, H]) => { const B = eval(H); const G = window.__game; const p = G.player.pos; const [pu, pv] = B.local(p.x, p.z); const q = B.world(pu + du, pv + dv); G.player.yaw = Math.atan2(-(q.x - p.x), -(q.z - p.z)); }, [du, dv, H]);
  await page.keyboard.down('KeyW'); await page.waitForTimeout(ms); await page.keyboard.up('KeyW'); await page.waitForTimeout(250);
  return where();
};
const view = async (name, pos, look) => {
  await g(([p, l, H]) => {
    const B = eval(H); const G = window.__game; const P = B.world(p[0], p[2], p[1]); const Lk = B.world(l[0], l[2], l[1]);
    G.player.place(new G.player.pos.constructor(P.x, P.y - 1.6, P.z), 0); G.player.pos.y = P.y - 1.6;
    G.player.yaw = Math.atan2(-(Lk.x - P.x), -(Lk.z - P.z)); G.player.pitch = Math.atan2(Lk.y - P.y, Math.hypot(Lk.x - P.x, Lk.z - P.z)); G.player.velY = 0; G.player.frozen = true;
  }, [pos, look, H]);
  await page.waitForTimeout(1100);
  await shot(name);
  await g(() => { window.__game.player.frozen = false; });
};
const worldView = async (name, p, l) => {
  await g(([p, l]) => { const G = window.__game; G.player.place(new G.player.pos.constructor(p[0], p[1] - 1.6, p[2]), 0); G.player.pos.y = p[1] - 1.6; G.player.yaw = Math.atan2(-(l[0] - p[0]), -(l[2] - p[2])); G.player.pitch = Math.atan2(l[1] - p[1], Math.hypot(l[0] - p[0], l[2] - p[2])); G.player.frozen = true; }, [p, l]);
  await page.waitForTimeout(1300);
  await shot(name);
  await g(() => { window.__game.player.frozen = false; });
};

// ---------- what was built ----------
const info = await g(() => {
  const C = window.__game.campus;
  const mine = C.buildings.filter((b) => b.module === 'hostels-newer');
  return {
    hostels: C.hostels.map((x) => x.name), annexes: C.combAnnexes,
    mine: mine.map((b) => ({ name: b.name, annex: b.annex || null, n: b.outer.length })),
    combs: C.hostels.filter((x) => x.arms).map((x) => ({ name: x.name, ve: x.ve, arms: x.arms.length, armStairs: x.armStairs, stairs: x.spaces.filter((s) => s.type === 'stair' && s.k === 0).length })),
  };
});
console.log(JSON.stringify(info));
check(info.hostels.length === 10, `ten walk-in Bhawans still (${info.hostels.length})`);
check(['Bhagirath Bhawan', 'Malviya-B', 'Srinivas Ramanujan Bhawan', 'Meera Bhawan', 'meera-b'].every((n) => info.annexes.includes(n)), `closed Bhawans built: ${info.annexes.join(', ')}`);
check(info.mine.length === 8, `eight footprints built here, not extruded (${info.mine.map((b) => b.name || b.annex).join(', ')})`);
for (const c of info.combs) check(c.armStairs.length >= 2 && c.stairs === 1 + c.armStairs.length, `${c.name}: main stair and ${c.armStairs.length} wing stairs`);

// nothing of ours near the Clock Tower → Saraswati Mandir line (the sunken NAB and Rotunda keep it open)
const axis = await g(() => {
  const a = [-9.3, -61.6]; const b = [102.3, 654.6];
  const seg = (x, z) => { const dx = b[0] - a[0]; const dz = b[1] - a[1]; const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz); };
  return Math.min(...window.__game.campus.buildings.filter((x) => x.module === 'hostels-newer').flatMap((x) => x.outer.map(([px, pz]) => seg(px, pz))));
});
check(axis > 60, `Clock Tower → Saraswati Mandir sight line clear (nearest corner ${axis.toFixed(0)} m away)`);

// ---------- the walk-in combs ----------
const PD = 2.6; // the porch's depth
const OUTW = 0.3; // outer wall
for (const name of ['Ashok Bhawan', 'Rana Pratap Bhawan', 'Malviya Bhawan']) {
  await setH(name);
  const S = await g((H) => {
    const B = eval(H);
    const st = B.spaces.find((s) => s.type === 'stair' && s.roof && s.k === 0);
    const room = B.spaces.find((s) => s.id === 'room-study');
    const common = B.spaces.find((s) => s.type === 'common');
    const a = B.arms.find((x) => B.armStairs.includes(x.name)); const ws = B.spaces.find((s) => s.wing === a.name && s.type === 'stair' && s.k === 0);
    const end = B.arms[0];
    return { ve: B.ve, st: st.t0, room: room.t0, common: common.t0, arm: { name: a.name, v0: a.v0, cw: a.cw, u1: a.u1, t0: ws.t0 }, end: { v0: end.v0, v1: end.v1, cw: end.cw, u1: end.u1 } };
  }, H);
  const { ve } = S;
  // in through the open (left) arch of the porch, across the vestibule and through the lobby door
  await at(-PD - 4, ve - 3.6, 0, 1, 0);
  let w = await go(-PD - 1.2, ve - 3.6);
  check(w.u < -PD + 0.05 && w.y < 0.1, `${name}: up to the porch ${JSON.stringify(w)}`);
  if (name === 'Ashok Bhawan') await shot('test-ashok-porch-approach');
  w = await route([[-1.3, ve - 3.6], [-1.3, ve]]);
  check(w.u > -PD + 0.3 && w.u < 0 && near(w.y, 0.12, 0.08), `${name}: through the open arch into the vestibule ${JSON.stringify(w)}`);
  if (name === 'Ashok Bhawan') await shot('test-ashok-vestibule');
  w = await go(2.6, ve);
  check(w.room === 'hostel' && w.u > 2 && near(w.y, 0.03, 0.1), `${name}: into the lobby ${JSON.stringify(w)}`);
  if (name === 'Ashok Bhawan') await shot('test-ashok-lobby');
  // the gated arches and the outer walls block
  await at(-PD - 1.6, ve + 3.6, 0, 1, 0); w = await push(1, 0);
  check(w.u < -PD - 0.2, `${name}: the gated arch is shut ${JSON.stringify(w)}`);
  await at(-PD - 1.6, ve, 0, 1, 0); w = await push(1, 0);
  check(w.u < -PD - 0.2, `${name}: the middle arch is gated too ${JSON.stringify(w)}`);
  await at(-1.5, ve + 8, 0, 1, 0); w = await push(1, 0);
  check(w.u < 0, `${name}: the spine's outer wall blocks ${JSON.stringify(w)}`);
  const evm = (S.end.v0 + S.end.v1) / 2;
  await at(S.end.u1 + 1.6, evm, 0, -1, 0); w = await push(-1, 0);
  check(w.u > S.end.u1, `${name}: an arm's end wall blocks from outside ${JSON.stringify(w)}`);
  // a room and the common room
  await at(2.6, ve, 0, 1, 0);
  w = await route([[6.1, ve], [6.1, S.room + 0.8], [2.6, S.room + 0.8]]);
  check(w.u < 4.4 && w.u > 0.3 && w.room === 'hostel', `${name}: into the study room ${JSON.stringify(w)}`);
  w = await route([[6.1, S.room + 0.8], [6.1, S.common + 6.8], [2.2, S.common + 6.8]]);
  check(w.u < 4.2 && near(w.y, 0, 0.1), `${name}: into the common room ${JSON.stringify(w)}`);
  if (name === 'Ashok Bhawan') await shot('test-ashok-common-room');
  // the main stair: up to the first floor, on up to the roof terrace, back down to the ground
  const t = S.st;
  await at(6.1, ve, 0, 0, 1);
  w = await route([[6.1, t + 0.8], [4.0, t + 0.8], [1.3, t + 0.8]]);
  check(near(w.y, FH_HALF(), 0.25), `${name}: main stair, up the first flight to the landing ${JSON.stringify(w)}`);
  if (name === 'Ashok Bhawan') await shot('test-ashok-stair-landing');
  w = await route([[1.3, t + 2.6], [4.1, t + 2.6], [6.1, t + 2.6]]);
  check(near(w.y, 3.3), `${name}: main stair, on the first floor ${JSON.stringify(w)}`);
  w = await route([[4.2, t + 2.6], [4.2, t + 0.8], [1.3, t + 0.8], [1.3, t + 2.6], [4.1, t + 2.6], [6.0, t + 2.6]]);
  check(near(w.y, 6.6), `${name}: main stair, out onto the roof terrace ${JSON.stringify(w)}`);
  // walk out along the terrace to the first arm and look around
  w = await route([[6.0, (S.end.v0 + S.end.v1) / 2 > ve ? t + 6 : t - 6]], {});
  check(near(w.y, 6.6), `${name}: walking on the roof ${JSON.stringify(w)}`);
  if (name === 'Ashok Bhawan') await shot('test-ashok-roof');
  w = await route([[6.0, t + 2.6], [4.1, t + 2.6], [1.3, t + 2.6], [1.3, t + 0.8], [4.2, t + 0.8], [4.2, t + 2.6]], { slow: true });
  check(near(w.y, 3.3), `${name}: main stair, down to the first floor ${JSON.stringify(w)}`);
  w = await route([[4.1, t + 2.6], [1.3, t + 2.6], [1.3, t + 0.8], [4.0, t + 0.8], [6.1, t + 0.8]], { slow: true });
  check(near(w.y, 0, 0.1), `${name}: main stair, back down to the ground floor ${JSON.stringify(w)}`);
  // a wing stair: from the spine corridor into the arm's corridor, up and back down (band: u = t, v = cw + s)
  const A = S.arm; const vc = (A.v0 + OUTW + A.cw - 0.25) / 2; const bt = A.t0;
  await at(6.1, ve, 0, 0, 1);
  w = await route([[6.1, vc], [bt + 0.8, vc]]);
  check(near(w.y, 0, 0.1) && w.room === 'hostel', `${name}: along the ${A.name} wing corridor to its stair ${JSON.stringify(w)}`);
  w = await route([[bt + 0.8, A.cw + 0.5], [bt + 0.8, A.cw + 3.4]]);
  check(near(w.y, FH_HALF(), 0.25), `${name}: wing stair, up to the landing ${JSON.stringify(w)}`);
  if (name === 'Ashok Bhawan') await shot('test-ashok-wing-stair');
  w = await route([[bt + 2.6, A.cw + 3.4], [bt + 2.6, A.cw + 0.5], [bt + 2.6, vc]]);
  check(near(w.y, 3.3), `${name}: wing stair, up on the first floor ${JSON.stringify(w)}`);
  w = await route([[bt + 6, vc]]);
  check(near(w.y, 3.3) && w.room === 'hostel', `${name}: along the first-floor wing corridor ${JSON.stringify(w)}`);
  w = await route([[bt + 2.6, vc], [bt + 2.6, A.cw + 0.5], [bt + 2.6, A.cw + 3.4], [bt + 0.8, A.cw + 3.4], [bt + 0.8, A.cw + 0.5], [bt + 0.8, vc]], { slow: true });
  check(near(w.y, 0, 0.1), `${name}: wing stair, back down to the ground floor ${JSON.stringify(w)}`);
  // and out again the way we came
  w = await route([[6.1, vc], [6.1, ve], [2.6, ve], [-1.3, ve], [-1.3, ve - 3.6], [-PD - 2, ve - 3.6]]);
  check(w.u < -PD - 1 && near(w.y, 0, 0.1), `${name}: back out through the porch ${JSON.stringify(w)}`);
}
function FH_HALF() { return 1.65; }

// ---------- the closed Bhawans: their walls block ----------
const closed = await g(() => window.__game.campus.buildings.filter((b) => b.module === 'hostels-newer' && !b.hostel).map((b) => {
  // a point 30 % along the longest edge (clear of a porch in its middle), and its outward side
  let best = null;
  b.outer.forEach((a, i) => { const c = b.outer[(i + 1) % b.outer.length]; const l = Math.hypot(c[0] - a[0], c[1] - a[1]); if (!best || l > best.l) best = { a, c, l }; });
  const m = [best.a[0] + (best.c[0] - best.a[0]) * 0.3, best.a[1] + (best.c[1] - best.a[1]) * 0.3]; let n = [(best.c[1] - best.a[1]) / best.l, -(best.c[0] - best.a[0]) / best.l];
  const inPoly = (x, z) => { let c = false; for (let i = 0, j = b.outer.length - 1; i < b.outer.length; j = i++) { const [xi, zi] = b.outer[i]; const [xj, zj] = b.outer[j]; if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
  if (inPoly(m[0] + n[0] * 2, m[1] + n[1] * 2)) n = [-n[0], -n[1]];
  return { name: b.name || b.annex, m, n };
}));
for (const c of closed) {
  const r = await g(async (c) => {
    const G = window.__game; const p = new G.player.pos.constructor(c.m[0] + c.n[0] * 3.5, 0, c.m[1] + c.n[1] * 3.5);
    G.player.place(p, Math.atan2(c.n[0], c.n[1])); G.player.pos.y = 0; G.player.frozen = false;
    return [p.x, p.z];
  }, c);
  await page.keyboard.down('KeyW'); await page.waitForTimeout(2200); await page.keyboard.up('KeyW'); await page.waitForTimeout(250);
  const d = await g((c) => { const p = window.__game.player.pos; return (p.x - c.m[0]) * c.n[0] + (p.z - c.m[1]) * c.n[1]; }, c);
  check(d > 0 && d < 2.5, `${c.name}: walking into its wall stops outside it (${d.toFixed(2)} m off the OSM wall line)`);
}

// ---------- screenshots ----------
if (SHOTS) {
  await setH('Ashok Bhawan');
  const ve = await g((H) => eval(H).ve, H);
  await view('ashok-street', [-26, 1.7, ve - 9], [0, 4, ve]);
  await view('ashok-entrance', [-10, 1.7, ve - 1.5], [0, 3.4, ve]);
  await view('ashok-drone', [-55, 40, ve - 30], [20, 0, ve]);
  await view('ashok-gap-between-arms', [30, 1.7, 20], [8, 3, 18]);
  await view('ashok-loggia-columns', [-6, 5.5, ve + 4], [-2, 4.6, ve - 1]);
  await view('ashok-roof-mumties', [6, 8.5, ve + 8], [10, 6.6, 8]);
  await setH('Rana Pratap Bhawan');
  const ve2 = await g((H) => eval(H).ve, H);
  await view('rp-street', [-24, 1.7, ve2 + 12], [0, 4, ve2]);
  await setH('Malviya Bhawan');
  const ve3 = await g((H) => eval(H).ve, H);
  await view('malviya-street', [-22, 1.7, ve3 + 14], [0, 4, ve3]);
  await view('malviya-aerial', [-60, 90, ve3 + 70], [30, 0, ve3]);
  await worldView('bhagirath-street', [212, 1.7, 236], [240, 4, 247]);
  await worldView('bhagirath-ashok-aerial', [200, 110, 340], [300, 0, 240]);
  await worldView('malviya-b-street', [-238, 1.7, 222], [-238, 4, 195]);
  await worldView('malviya-a-b-aerial', [-300, 80, 240], [-210, 0, 165]);
  await worldView('sr-street', [12, 1.7, -224], [-40, 4, -236]);
  await worldView('sr-gate', [22, 1.7, -240], [3, 2, -237]);
  await worldView('sr-aerial', [-60, 110, -150], [-80, 0, -250]);
  await worldView('meera-street', [-128, 1.7, 636], [-150, 4, 658]);
  await worldView('meera-aerial', [-140, 80, 600], [-150, 0, 680]);
}

check(errors.length === 0, 'no console errors');
console.log('ERRORS', JSON.stringify(errors.slice(0, 8)));
console.log(fails.length ? `FAILED ${fails.length}` : 'ALL PASS');
await browser.close();
process.exit(fails.length ? 1 : 0);
