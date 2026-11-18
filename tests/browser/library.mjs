// BITS Library walk-through: in through the west entrance, up and down both twin stairs, round the first floor
// (galleries, Hall 6, the rotunda's upper ring), into Area 1, Halls 1-5, the rotunda court, the east lobby and the
// gameplay reading room (through its new door from Hall 4, out of its own south door).
// node tests/browser/library.mjs [OUTDIR] [URL]   (a dev server must be running; default http://localhost:8091/)
import { chromium } from 'playwright-core';
const OUT = process.argv[2] || '.';
const URL = process.argv[3] || 'http://localhost:8091/';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const fails = [];
const check = (ok, what) => { console.log(ok ? 'PASS' : 'FAIL', what); if (!ok) fails.push(what); };
const g = (fn, arg) => page.evaluate(fn, arg);
const G = 0.6; const F1 = 5.2;

await page.goto(`${URL}?explore&only=library`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game?.explorer && window.__game.campus?.modules, null, { timeout: 60000 });
await page.waitForTimeout(1500);
check(await g(() => window.__game.campus.modules.some((m) => m.m.id === 'library')), 'library module built');
await g(() => { const c = document.getElementById('game'); Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => c }); });
await g(() => { window.__lib = window.__game.campus.modules.find((m) => m.m.id === 'library').kit; });

// place at local (u, v, y) facing local direction (du, dv)
const at = (u, v, y, du = 1, dv = 0) => g(([u, v, y, du, dv]) => {
  const Gm = window.__game; const k = window.__lib; const E = Gm.explorer;
  if (!E.walking) E.walk(k.world(u, v, y), k.yaw(-du, -dv));
  Gm.player.place(k.world(u, v, y), k.yaw(-du, -dv)); Gm.player.pos.y = y; Gm.player.vel.set(0, 0, 0);
}, [u, v, y, du, dv]);
const where = () => g(() => {
  const Gm = window.__game; const k = window.__lib; const p = Gm.player.pos; const [u, v] = k.local(p.x, p.z);
  return { u: +u.toFixed(2), v: +v.toFixed(2), y: +p.y.toFixed(2), room: k.roomAt(p.x, p.z, p.y)?.id || null, game: Gm.campus.roomAt(p.x, p.z, p.y)?.id || Gm.campus.roomAt(p.x, p.z, p.y) || null };
});
// Walk (W held) towards local (u, v), steering every 80 ms; stops within 0.35 m or when stuck. world: [x, z]
const go = async (u, v, { world = false, timeout = 25000 } = {}) => {
  await page.keyboard.down('ShiftLeft'); await page.keyboard.down('KeyW');
  const t0 = Date.now(); let last = null; let still = 0; let d = 1e9;
  while (Date.now() - t0 < timeout) {
    const s = await g(([u, v, world]) => {
      const Gm = window.__game; const k = window.__lib; const p = Gm.player.pos;
      const T = world ? { x: u, z: v } : k.world(u, v);
      const dx = T.x - p.x; const dz = T.z - p.z;
      Gm.player.yaw = Math.atan2(-dx, -dz); Gm.player.pitch = 0;
      return { d: Math.hypot(dx, dz), x: p.x, z: p.z };
    }, [u, v, world]);
    d = s.d;
    if (d < 0.25) break;
    if (last && Math.hypot(s.x - last.x, s.z - last.z) < 0.01) { if (++still > 12) break; } else still = 0;
    last = s;
    await page.waitForTimeout(80);
  }
  await page.keyboard.up('KeyW'); await page.keyboard.up('ShiftLeft');
  await page.waitForTimeout(250);
  if (d >= 0.5) console.log('  (stuck short of', world ? 'world' : 'local', [u, v].map((x) => +x.toFixed(2)), 'at', JSON.stringify(await where()), ')');
  return d < 0.5;
};
const route = async (name, pts, expect) => {
  let ok = true;
  for (const p of pts) ok = (await go(...p)) && ok;
  const w = await where();
  const good = ok && (!expect || expect(w));
  check(good, `${name} ${JSON.stringify(w)}`);
  return w;
};
const near = (a, b, e = 0.06) => Math.abs(a - b) < e;
const shot = (n) => page.screenshot({ path: `${OUT}/test-${n}.png` });

// ---------- 1. the west entrance: forecourt, fan steps, portico, doors, foyer ----------
await at(-62, 0, 0, 1, 0);
await page.waitForTimeout(800);
await route('across the forecourt', [[-56, 0]], (w) => near(w.y, 0, 0.05));
await route('up the fan steps onto the portico', [[-45, 0]], (w) => near(w.y, G));
await route('through the doors into the foyer', [[-40, 0.9]], (w) => near(w.y, G) && w.room === 'foyer');
await shot('foyer');
// walls block: push north into the foyer's side wall
await at(-31.5, -5, G, 0, -1);
await go(-31.5, -14, { timeout: 4000 });
{ const w = await where(); check(w.v > -9.5 && w.v < -8.5 && near(w.y, G), `foyer north wall blocks ${JSON.stringify(w)}`); }

// ---------- 2. the south twin stair: up to the bridge, the south gallery, and down ----------
await at(-36, 3.25, G, 1, 0);
await route('south twin stair: up to the bridge', [[-32.4, 3.25], [-23.7, 3.25]], (w) => near(w.y, F1));
await route('bridge to the south gallery', [[-23.5, 8.7], [-28, 8.7]], (w) => near(w.y, F1) && w.room === 'galleries');
await shot('gallery-south');
await route('south twin stair: down to the foyer', [[-23.5, 8.7], [-23.3, 3.25], [-24.9, 3.25], [-32.4, 3.25]], (w) => near(w.y, G) && w.room === 'foyer');

// ---------- 3. the north twin stair, Hall 6, the rotunda's upper ring, and down ----------
await route('north twin stair: up to the bridge', [[-33, -3.25], [-32.4, -3.25], [-23.3, -3.25]], (w) => near(w.y, F1));
await shot('stair-top');
await route('first floor: into Hall 6', [[-23.5, -8.7], [-17, -8.7], [-17, -12]], (w) => near(w.y, F1) && w.room === 'hall6');
await shot('hall6');
await route('first floor: the rotunda upper ring', [[-17, -8.7], [-13, -8.7], [-10.3, -8.4], [-9.8, -10.4]], (w) => near(w.y, F1) && w.room === 'rotunda');
await shot('rotunda-upper');
await route('north twin stair: down to the foyer', [[-10.3, -8.4], [-13, -8.7], [-23.5, -8.7], [-23.3, -3.25], [-24.9, -3.25], [-32.4, -3.25]], (w) => near(w.y, G) && w.room === 'foyer');

// ---------- 4. ground floor: Area 1, Hall 1, Hall 5, the rotunda and its court ----------
await route('under the bridge into Area 1', [[-30, 0], [-20, 0]], (w) => near(w.y, G) && w.room === 'area1');
await shot('area1');
await route('Area 1 to Hall 1', [[-18, -8], [-18, -12]], (w) => near(w.y, G) && w.room === 'hall1');
await route('Area 1 to Hall 5', [[-18, -8], [-20, 0], [-20, 8], [-20, 11.4]], (w) => near(w.y, G) && w.room === 'hall5');
await route('Area 1 to the rotunda', [[-20, 8], [-15, 0], [-9, 0]], (w) => near(w.y, G) && w.room === 'rotunda');
await route('down the two steps into the gravel court', [[-7.6, 0.7], [-4.9, 0.7], [-2.5, 0]], (w) => near(w.y, G - 0.3));
await shot('rotunda-court');
await route('back up out of the court on the east side', [[-2.5, -1.5], [2.5, -1.5], [2.6, -0.7], [4.9, -0.7], [7.6, -0.7]], (w) => near(w.y, G));

// ---------- 5. east lobby, Halls 2 and 3 ----------
await route('rotunda to the east lobby', [[9, 0], [16, -2]], (w) => near(w.y, G) && w.room === 'eastLobby');
await shot('east-lobby');
await route('east lobby to Hall 2', [[24, -4], [24, -10.5]], (w) => near(w.y, G) && w.room === 'hall2');
await route('east lobby to Hall 3', [[24, -4], [24, 4], [24, 10.5]], (w) => near(w.y, G) && w.room === 'hall3');

// ---------- 6. Hall 4 and the gameplay reading room ----------
const R = await g(() => { const r = window.__game.campus.rooms.library; return { x1: r.x1, zc: r.z1 - 1.25, exit: [r.exit.x, r.exit.z], y0: r.y0 || 0 }; });
await route('rotunda to Hall 4', [[24, 4], [16, 2], [9.5, 0], [9.5, 9.5], [2, 10], [2, 14]], (w) => near(w.y, G) && w.room === 'hall4');
await shot('hall4');
await route('Hall 4 to the reading room door', [[R.x1 + 2.2, R.zc, { world: true }]], (w) => near(w.y, G));
await route('down the steps into the reading room (gameplay room library)', [[R.x1 - 1.6, R.zc, { world: true }]], (w) => near(w.y, R.y0) && w.game === 'library');
await shot('reading-room');
await route('out of the reading room by its south door', [[R.x1 - 6, R.zc + 0.3, { world: true }], [R.exit[0], R.exit[1] - 1.6, { world: true }], [R.exit[0], R.exit[1], { world: true }]], (w) => near(w.y, 0) && !w.game);
await route('back in by the south door and up into Hall 4', [[R.exit[0], R.exit[1] - 2.5, { world: true }], [R.x1 - 1.6, R.zc, { world: true }], [R.x1 + 2.2, R.zc, { world: true }]], (w) => near(w.y, G) && w.room === 'hall4');

// ---------- 7. and out of the main entrance ----------
await at(-20, 0, G, -1, 0);
await route('Area 1 back out through the foyer and down the fan steps', [[-36, 1.2], [-42, 0.9], [-46, 0], [-56, 0]], (w) => near(w.y, 0, 0.05));

console.log('ERRORS', JSON.stringify(errors));
console.log(fails.length || errors.length ? `SOME FAILED (${fails.length})` : 'ALL PASS');
await browser.close();
process.exit(fails.length || errors.length ? 1 : 0);
