// FD-III and FD-II quads (js/world/buildings/fd2-fd3.js): in through every entrance, round the verandahs, up and down
// every stair, into the department rooms and the gameplay rooms (AUGSD, Computer Lab, Director's Office), walls that
// block, the joins to the spine, and screenshots.
//   node tests/browser/fd2-fd3.mjs [OUTDIR] [URL]       (URL defaults to http://localhost:8102/)
//   FULL=1 ...   the whole campus instead of ?only=main-building,fd2-fd3
//   PERF=1 ...   frame timing only: ?nomodules against ?only=fd2-fd3 (and main-building), from outside and inside
import { chromium } from 'playwright-core';
const OUT = process.argv[2] || '.';
const BASE = process.argv[3] || 'http://localhost:8102/';
const SHOTS = process.env.SHOTS !== '0';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu'] });

// ---------- PERF=1: frame timing (rAF gaps, CPU ms per frame, draw calls) ----------
if (process.env.PERF) {
  const SECS = Number(process.env.PERF_SECS || 6);
  const stats = (a) => { const s = [...a].sort((x, y) => x - y); const avg = s.reduce((p, c) => p + c, 0) / (s.length || 1); return { avg: +avg.toFixed(2), p95: +(s[Math.floor(s.length * 0.95)] || 0).toFixed(2) }; };
  const scenes = [
    ['outside: FD-III south front', [-100, 1.7, 40], [-107, 5, 5]],
    ['outside: aerial over both quads', [-20, 170, 120], [-20, 0, -50]],
    ['outside: FD-II from M Lawns', [115, 1.7, 10], [100, 5, -25]],
    ['outside: forecourt towards FD-III', [-40, 1.7, -30], [-80, 5, -40]],
    ['inside: FD-III south court', [-100, 1.7, -18], [-115, 3, -40]],
    ['inside: FD-II verandah', [72, 1.7, -40], [100, 3, -45]],
  ];
  for (const q of ['nomodules', 'only=main-building', 'only=main-building,fd2-fd3']) {
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
const yawOf = (dx, dz) => Math.atan2(-dx, -dz);
const face = (dx, dz) => g((yaw) => { window.__game.player.yaw = yaw; }, yawOf(dx, dz));
// local (quad frame) <-> world
const W = (q, u, v) => g(([q, u, v]) => { const p = window.__fd.subs[q].world(u, v); return [p.x, p.z]; }, [q, u, v]);
const where = (q = null) => g((q) => {
  const G = window.__game; const p = G.player.pos; const C = G.campus;
  const out = { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), room: C.roomAt(p.x, p.z) };
  if (q) { const [u, v] = window.__fd.subs[q].local(p.x, p.z); out.u = +u.toFixed(2); out.v = +v.toFixed(2); out.fdRoom = window.__fd.roomAt(p.x, p.z, p.y)?.id || null; }
  return out;
}, q);
const atW = (x, y, z, dx = 0, dz = -1) => g(([x, y, z, yaw]) => { const G = window.__game; G.player.place(new G.player.pos.constructor(x, y, z), yaw); G.player.velY = 0; }, [x, y, z, yawOf(dx, dz)]);
const walk = async (ms, keys = ['KeyW']) => { for (const k of keys) await page.keyboard.down(k); await page.waitForTimeout(ms); for (const k of keys) await page.keyboard.up(k); await page.waitForTimeout(350); };
const goTo = async (x, z, ms = 9000, tol = 0.35, q = null) => {
  const t0 = Date.now();
  let p = await where(q);
  let slow = false;
  while (Date.now() - t0 < ms) {
    const dx = x - p.x; const dz = z - p.z; const d = Math.hypot(dx, dz);
    if (d < tol) break;
    if (d < 2.5 && !slow) { await page.keyboard.down('ShiftLeft'); slow = true; }
    if (d >= 2.5 && slow) { await page.keyboard.up('ShiftLeft'); slow = false; }
    await face(dx, dz);
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(d < 1 ? 60 : 150);
    p = await where(q);
  }
  await page.keyboard.up('KeyW'); await page.keyboard.up('ShiftLeft');
  await page.waitForTimeout(300);
  return where(q);
};
// walk to a local point of quad q
const goL = async (q, u, v, ms = 9000, tol = 0.35) => { const [x, z] = await W(q, u, v); return goTo(x, z, ms, tol, q); };
const atL = async (q, u, v, y = 0, du = 0, dv = -1) => { const [x, z] = await W(q, u, v); const [x2, z2] = await W(q, u + du, v + dv); return atW(x, y, z, x2 - x, z2 - z); };
const faceL = async (q, du, dv) => { const [x0, z0] = await W(q, 0, 0); const [x1, z1] = await W(q, du, dv); return face(x1 - x0, z1 - z0); };
const shot = async (name) => { if (SHOTS) await page.screenshot({ path: `${OUT}/${name}.png` }); };
const view = async (name, pos, look) => {
  await g(([p, l]) => {
    const G = window.__game; G.player.place(new G.player.pos.constructor(p[0], p[1] - 1.6, p[2]), 0);
    G.player.yaw = Math.atan2(-(l[0] - p[0]), -(l[2] - p[2])); G.player.pitch = Math.atan2(l[1] - p[1], Math.hypot(l[0] - p[0], l[2] - p[2])); G.player.velY = 0; G.player.frozen = true;
  }, [pos, look]);
  await page.waitForTimeout(1100);
  await shot(name);
  await g(() => { window.__game.player.frozen = false; window.__game.player.pitch = 0; });
};

await page.goto(`${BASE}?explore${process.env.FULL ? '' : '&only=main-building,fd2-fd3'}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game?.explorer && window.__game.campus?.modules, null, { timeout: 90000 });
await page.waitForTimeout(1500);
const info = await g(() => {
  const C = window.__game.campus; const m = C.modules.find((q) => q.m.id === 'fd2-fd3');
  window.__fd = m?.kit;
  const k = m?.kit;
  return {
    modules: C.modules.map((q) => q.m.id), zones: k?.zones.map((z) => z.name), stairs: k?.stairs.length, rooms: k?.rooms.map((r) => r.id),
    built: k && Object.fromEntries(Object.entries(k.built).map(([q, b]) => [q, { stairs: b.stairs.map((s) => ({ name: s.name, along: s.along, reverse: s.reverse, u0: s.u0, u1: s.u1, v0: s.v0, v1: s.v1, start: s.start, la0: s.la0, far: s.far, wall: s.wall })), rooms: b.rooms.map((r) => ({ id: r.id, wall: r.wall, floor: r.floor, rect: r.rect, door: r.door })), passages: b.passages.map((p) => ({ name: p.name, at: p.at, S: p.S, vIn: p.vIn, vOut: p.vOut, porch: !!p.porch })), walls: Object.fromEntries(Object.entries(b.walls).map(([id, wl]) => [id, { axis: wl.axis, face: wl.face, side: wl.side }])) }])),
    game: ['reception', 'complab', 'principal'].map((id) => { const r = C.rooms[id]; return { id, host: r.host, exit: [r.exit.x, r.exit.z], inside: [r.inside.x, r.inside.z], x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z1 }; }),
    holes: C.buildings.filter((b) => /Main Building \(/.test(b.name)).map((b) => b.holes.length),
  };
});
console.log(JSON.stringify({ modules: info.modules, zones: info.zones, stairs: info.stairs, rooms: info.rooms, holes: info.holes }));
check(info.modules.includes('fd2-fd3'), 'module built');
check(info.stairs === 4 && info.zones.length === 10, 'four stairs and ten interior zones', { stairs: info.stairs, zones: info.zones.length });
check(info.holes[0] === 2 && info.holes[1] === 1, 'FD-III has two courts, FD-II one');
await g(() => { const c = document.getElementById('game'); Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => c }); });
await g(() => { const E = window.__game.explorer; const p = E.places.find((q) => /Clock Tower/.test(q.name)); E.select(p); E.enter(p); E.view = 'first'; E.clock = 10 * 60; });
await page.waitForTimeout(1200);

const VD = 3.8;
for (const q of ['fd3', 'fd2']) {
  const B = info.built[q]; const Q = q === 'fd3' ? 'FD-III' : 'FD-II';
  // ---------- in through the main entrance (porch) and out through the north entrance ----------
  const S = B.passages.find((p) => p.S); const N = B.passages.find((p) => !p.S);
  await atL(q, S.at, S.vOut + 7, 0, 0, -1);
  let p = await goL(q, S.at, S.vOut + 3);
  check(Math.abs(p.y) < 0.06, `${Q}: under the porch`, p);
  if (q === 'fd3') { await faceL(q, 0, -1); await page.waitForTimeout(300); await shot(`${q}-entrance-porch`); }
  p = await goL(q, S.at, S.vIn - 1.5, 12000);
  check(p.v < S.vIn - 1 && Math.abs(p.y) < 0.06, `${Q}: through the main entrance passage onto the court verandah`, p);
  if (q === 'fd3') { await faceL(q, 0, 1); await page.waitForTimeout(300); await shot(`${q}-int-passage`); }
  p = await goL(q, S.at, S.vIn - VD - 4, 9000);
  check(p.v < S.vIn - VD - 3 && Math.abs(p.y - 0.035) < 0.08, `${Q}: through the arcade into the court`, p);
  await faceL(q, 0.4, -1); await page.waitForTimeout(400); await shot(`${q}-court`);
  // across the court(s) to the north entrance and out
  if (q === 'fd3') {
    // south court → west link verandah → north court
    p = await goL(q, 21, 88); p = await goL(q, 16.8, 88); p = await goL(q, 16.8, 30, 20000);
    check(p.v < 31 && p.u < 18.8 && Math.abs(p.y) < 0.06, 'FD-III: along the west verandah from the south court to the north court', p);
    await faceL(q, 0, -1); await page.waitForTimeout(300); await shot('fd3-int-verandah');
    p = await goL(q, 30, 22); p = await goL(q, N.at, 22, 12000);
  } else {
    p = await goL(q, S.at + 5, 55); p = await goL(q, S.at + 5, 30, 20000); p = await goL(q, N.at, 30);
  }
  p = await goL(q, N.at, N.vIn + 1.5); p = await goL(q, N.at, N.vOut - 2.5, 12000);
  check(p.v < N.vOut - 1.5 && Math.abs(p.y) < 0.06, `${Q}: out through the north entrance`, p);
  // ---------- walls block: walk into the outer wall beside the north entrance ----------
  await atL(q, N.at + 8, -2.5, 0, 0, 1); await walk(1500);
  p = await where(q);
  check(p.v < -0.3, `${Q}: the outer wall blocks`, p);
  // ---------- every stair, up and down ----------
  for (const st of B.stairs) {
    const wl = B.walls[st.wall];
    const dir = st.reverse ? -1 : 1;
    const ax = st.along === 'u';
    const across = ax ? [st.v0, st.v1] : [st.u0, st.u1];
    const wid = (across[1] - across[0] - 0.1) / 2;
    const b1 = across[0] + wid / 2; const b2 = across[1] - wid / 2;
    const aF = st.reverse ? (ax ? st.u1 : st.v1) : (ax ? st.u0 : st.v0); // the stairwell's front (verandah) edge
    const aV = aF - dir * 1.6; const aS = (st.start + aF) / 2; const aL = (st.far + st.la0) / 2;
    const L = (a, b) => (ax ? [a, b] : [b, a]);
    void wl;
    await atL(q, ...L(aV - dir * 1.5, b1), 0, ...(ax ? [dir, 0] : [0, dir]));
    p = await goL(q, ...L(aV, b1));
    p = await goL(q, ...L(aS, b1));
    check(Math.abs(p.y) < 0.06, `${st.name}: in from the verandah`, p);
    if (q === 'fd2' && st.along === 'v') { await faceL(q, ...(ax ? [dir, 0] : [0, dir])); await page.waitForTimeout(300); await shot(`${q}-int-stair-foot`); }
    p = await goL(q, ...L(aL, b1), 12000);
    check(Math.abs(p.y - 2.7) < 0.12, `${st.name}: flight 1 up to the half landing (2.7)`, p);
    p = await goL(q, ...L(aL, b2));
    p = await goL(q, ...L(aS, b2), 12000);
    check(Math.abs(p.y - 5.4) < 0.08, `${st.name}: flight 2 up to the first floor (5.4)`, p);
    if (q === 'fd3' && st.reverse) { await faceL(q, ...(ax ? [-dir, 0] : [0, -dir])); await page.waitForTimeout(300); await shot(`${q}-int-stair-top`); }
    p = await goL(q, ...L(aV, b2));
    check(Math.abs(p.y - 5.4) < 0.08, `${st.name}: out onto the first-floor verandah`, p);
    // the dwarf wall between the flights keeps you on flight 2: stand on its 10th tread and walk at flight 1
    const aM = st.la0 - dir * 9.5 * 0.28; const yM = 2.7 + 10 * (2.7 / 15);
    await atL(q, ...L(aM, b2), yM + 0.02, ...(ax ? [0, -1] : [-1, 0]));
    await page.waitForTimeout(300);
    const before = await where(q);
    const [tx, tz] = await W(q, ...L(aM, b1));
    await face(tx - before.x, tz - before.z); await walk(1200);
    const sp = await where(q);
    check(Math.abs(before.y - yM) < 0.1 && sp.y > yM - 0.1, `${st.name}: the wall between the flights holds you on flight 2`, { before, after: sp });
    // and down again
    await atL(q, ...L(aV, b2), 5.4);
    p = await goL(q, ...L(aS, b2));
    p = await goL(q, ...L(aL, b2), 12000);
    check(Math.abs(p.y - 2.7) < 0.12, `${st.name}: down flight 2 to the landing`, p);
    p = await goL(q, ...L(aL, b1));
    p = await goL(q, ...L(aS, b1), 12000);
    check(Math.abs(p.y) < 0.06, `${st.name}: down flight 1 to the ground floor`, p);
    p = await goL(q, ...L(aV, b1));
    check(Math.abs(p.y) < 0.06, `${st.name}: back on the ground verandah`, p);
  }
  // ---------- department rooms (first-floor ones via the first stair's top) ----------
  for (const r of B.rooms) {
    const wl = B.walls[r.wall];
    const y = r.floor ? 5.4 : 0;
    const outside = wl.axis === 'u' ? [r.door, wl.face + wl.side * 1.6] : [wl.face + wl.side * 1.6, r.door];
    const inside = wl.axis === 'u' ? [r.door, wl.face - wl.side * 1.8] : [wl.face - wl.side * 1.8, r.door];
    await atL(q, outside[0], outside[1], y);
    await page.waitForTimeout(250);
    p = await goL(q, ...inside);
    check(p.fdRoom === r.id && Math.abs(p.y - y) < 0.25, `${Q}: through the door into ${r.id}`, p);
    const cx = (r.rect.u0 + r.rect.u1) / 2; const cv = (r.rect.v0 + r.rect.v1) / 2;
    const [ix, iz] = await W(q, inside[0], inside[1]); const [cxw, czw] = await W(q, cx, cv);
    await face(cxw - ix, czw - iz); await page.waitForTimeout(400);
    if (['fd3-3103', 'fd3-3163', 'fd2-2241', 'fd2-su', 'fd3-s9'].includes(r.id)) await shot(`${q}-int-${r.id}`);
    p = await goL(q, ...outside);
    check(p.fdRoom === null && Math.abs(p.y - y) < 0.1, `${Q}: back out of ${r.id}`, p);
  }
}

// ---------- the gameplay rooms: from their exits outside the facades, in and out ----------
for (const r of info.game) {
  await atW(r.exit[0], 0, r.exit[1] + 0.0, r.inside[0] - r.exit[0], r.inside[1] - r.exit[1]);
  await page.waitForTimeout(300);
  let p = await goTo(r.inside[0], r.inside[1], 9000);
  check(p.room === r.id && Math.abs(p.y) < 0.06, `gameplay room ${r.id}: in through the facade door`, p);
  await face(((r.x0 + r.x1) / 2) - p.x, ((r.z0 + r.z1) / 2) - p.z); await page.waitForTimeout(300);
  await shot(`game-${r.id}`);
  p = await goTo(r.exit[0], r.exit[1], 9000);
  check(p.room !== r.id && Math.hypot(p.x - r.exit[0], p.z - r.exit[1]) < 0.6, `gameplay room ${r.id}: back out to its exit`, p);
}
// pathTo / exits still lead somewhere walkable (the campus nav)
const nav = await g(() => { const C = window.__game.campus; return ['reception', 'complab', 'principal'].map((id) => { const r = C.rooms[id]; return [id, C.npcBlocked(r.exit.x, r.exit.z)]; }); });
check(nav.every(([, b]) => !b), 'gameplay room exits are open ground for NPCs', nav);

// ---------- joins to the spine: no gap between the spine ends and the quads ----------
const join = await g(() => {
  const C = window.__game.campus;
  const solid = (x, z, y = 3) => C.colliders.some((c) => c.enabled && !c.walkable && x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ && y > c.minY && y < c.maxY);
  const res = [];
  for (const z of [-68.5, -62, -57]) { res.push(["west", z, solid(-70.3, z)]); res.push(['east', z, solid(41.5, z)]); }
  return res;
});
check(join.every((j) => j[2]), 'link blocks close the joins to the spine', join);
// the Clock Tower → Saraswati Mandir axis stays clear (nothing of this module within 40 m of it)
const axis = await g(() => window.__game.campus.colliders.filter((c) => c.building === 'fd2-fd3' && c.minX < 31 && c.maxX > -50 && c.minZ > -50).length);
check(axis === 0, 'nothing on the Clock Tower → Saraswati Mandir view axis', axis);

// ---------- screenshots ----------
if (SHOTS) {
  await view('ext-fd3-south-street', [-100, 1.7, 40], [-107, 5, 5]);
  await view('ext-fd3-east-forecourt', [-45, 1.7, -28], [-75, 5, -40]);
  await view('ext-fd2-south-street', [118, 1.7, 8], [100, 5, -25]);
  await view('ext-fd2-join', [30, 1.7, -40], [48, 5, -62]);
  await view('ext-fd3-join', [-55, 1.7, -42], [-72, 5, -60]);
  await view('aerial-both', [-20, 170, 120], [-20, 0, -50]);
  await view('aerial-fd3', [-60, 90, 60], [-110, 0, -45]);
  await view('aerial-fd2', [150, 90, 40], [90, 0, -75]);
  await view('int-fd2-first-verandah', [70, 7.0, -78], [100, 6.5, -85]);
}

check(errors.length === 0, 'no console errors');
console.log('ERRORS', JSON.stringify(errors.slice(0, 8)));
console.log(fails.length ? `FAILED ${fails.length}` : 'ALL PASS');
await browser.close();
process.exit(fails.length ? 1 : 0);
