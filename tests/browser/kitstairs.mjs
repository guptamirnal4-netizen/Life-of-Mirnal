// Kit smoke test: walk in the door, up the dog-leg to the first floor and back down. node kitstairs.mjs OUTDIR
import { chromium } from 'playwright-core';
const OUT = process.argv[2] || '.';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(30000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const g = (fn, arg) => page.evaluate(fn, arg);
const walk = async (ms) => { await page.keyboard.down('KeyW'); await page.waitForTimeout(ms); await page.keyboard.up('KeyW'); await page.waitForTimeout(300); };
const K = () => 'window.__game.campus.modules.find(m=>m.m.id==="library").kit';
const at = (u, v, y, du, dv) => g(([u, v, y, du, dv, K]) => { const kit = eval(K); const G = window.__game; G.player.place(kit.world(u, v, y), kit.yaw(-du, -dv)); G.player.pos.y = y; }, [u, v, y, du, dv, K()]);
const face = (du, dv) => g(([du, dv, K]) => { const kit = eval(K); window.__game.player.yaw = kit.yaw(-du, -dv); }, [du, dv, K()]);
const where = () => g((K) => { const kit = eval(K); const p = window.__game.player.pos; const [u, v] = kit.local(p.x, p.z); return { u: +u.toFixed(2), v: +v.toFixed(2), y: +p.y.toFixed(2) }; }, K());
await page.goto('http://localhost:8080/?explore&only=library', { waitUntil: 'load' });
await page.waitForFunction(() => window.__game?.explorer && window.__game.campus?.modules, null, { timeout: 60000 });
await page.waitForTimeout(1500);
console.log('modules', await g(() => window.__game.campus.modules.map((m) => m.m.id)), await g(() => window.__demo));
await g(() => { const c = document.getElementById('game'); Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => c }); });
const ex = await g(() => { const E = window.__game.explorer; const p = E.places.find((q) => /Library/.test(q.name)); E.select(p); E.walk(); return p.name; });
await page.waitForTimeout(800);
// in through the door
await at(-3, 15, 0, 1, 0); await walk(1500);
console.log('inside', await where());
await page.screenshot({ path: `${OUT}/kit-inside.png` });
// to the stair foot: flight 1 is on low-u half (u 10..12.45) climbing +v from v=3
await at(11.2, 2.2, 0, 0, 1); await walk(2300);
const mid = await where();
await face(1, 0); await walk(700); await face(0, -1); await walk(2600);
const up = await where();
await page.screenshot({ path: `${OUT}/kit-first-floor.png` });
// and back down
await face(0, 1); await walk(2600); await face(-1, 0); await walk(700); await face(0, -1); await walk(2600);
const down = await where();
console.log({ mid, up, down });
const ok = Math.abs(mid.y - 2) < 0.3 && Math.abs(up.y - 4) < 0.1 && Math.abs(down.y) < 0.1;
console.log(ok ? 'PASS stairs' : 'FAIL stairs');
console.log('ERRORS', JSON.stringify(errors.slice(0, 5)));
await browser.close();
