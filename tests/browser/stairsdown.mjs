import { chromium } from 'playwright-core';
const OUT = process.argv[2] || '.';
const URL = process.argv[3] || 'http://localhost:8080/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(20000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const log = (...a) => console.log(...a);
const fails = [];
const check = (ok, what) => { log(ok ? 'PASS' : 'FAIL', what); if (!ok) fails.push(what); };
const g = (fn, arg) => page.evaluate(fn, arg);
const lock = (on) => g((on) => { window.__locked = on; }, on);
const walk = async (ms, keys = ['KeyW', 'ShiftLeft']) => { for (const k of keys) await page.keyboard.down(k); await page.waitForTimeout(ms); for (const k of keys) await page.keyboard.up(k); await page.waitForTimeout(250); };
// where am I, in the Bhawan's own frame
const where = () => g(() => { const G = window.__game; const H = G.campus.hostels[window.__hi]; const p = G.player.pos; const [u, v] = H.local(p.x, p.z); return { u: +u.toFixed(2), v: +v.toFixed(2), y: +p.y.toFixed(2), room: G.campus.roomAt(p.x, p.z, p.y) }; });
// place at (u, v, y) facing a local direction: '+u', '-u', '+v', '-v'
const at = (u, v, y, dir) => g(([u, v, y, dir]) => {
  const G = window.__game; const H = G.campus.hostels[window.__hi];
  const d = { '+u': H.eu, '-u': [-H.eu[0], -H.eu[1]], '+v': H.ev, '-v': [-H.ev[0], -H.ev[1]] }[dir];
  G.player.place(H.world(u, v, y), Math.atan2(-d[0], -d[1]));
  G.player.pos.y = y;
}, [u, v, y, dir]);
const face = (dir) => g((dir) => { const G = window.__game; const H = G.campus.hostels[window.__hi]; const d = { '+u': H.eu, '-u': [-H.eu[0], -H.eu[1]], '+v': H.ev, '-v': [-H.ev[0], -H.ev[1]] }[dir]; G.player.yaw = Math.atan2(-d[0], -d[1]); }, dir);
const closePanels = () => g(() => document.querySelectorAll('#overlay .close').forEach((b) => b.click()));
const toastText = () => page.locator('#toast').innerText();

await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(1000);
await g(() => { window.__game.voice.mock = true; const c = document.getElementById('game'); Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => (window.__locked ? c : null) }); });
await page.getByRole('button', { name: /College Life/ }).click();
await page.getByRole('button', { name: /Turn on my microphone/ }).click();
await page.waitForTimeout(500);
await page.getByRole('button', { name: 'Start the day' }).click();
await page.waitForTimeout(400);
await lock(true);

const n = await g(() => window.__game.campus.hostels.length);
for (let hi = 0; hi < n; hi++) {
  await g((hi) => { window.__hi = hi; }, hi);
  const name = await g(() => window.__game.campus.hostels[window.__hi].name);
  const H = await g(() => { const h = window.__game.campus.hostels[window.__hi]; return { stair: h.ve + 3.4 }; });
  // from the first-floor landing, down the second flight, across the half landing, down the first flight
  await at(5.6, H.stair + 2.6, 3.3, '-u');
  await walk(2600);
  let w = await where();
  const mid = w.y;
  await face('-v'); await walk(1000); await face('+u'); await walk(2600); await face('+u'); await walk(1200);
  w = await where();
  check(Math.abs(mid - 1.65) < 0.3 && Math.abs(w.y) < 0.05, `${name}: down from the first floor (half landing ${mid}) ${JSON.stringify(w)}`);
  // and from the roof down to the first floor (the main stair)
  await at(5.6, H.stair + 2.6, 6.6, '-u');
  await walk(2600); await face('-v'); await walk(1000); await face('+u'); await walk(2600); await face('+u'); await walk(1200);
  w = await where();
  check(Math.abs(w.y - 3.3) < 0.05, `${name}: down from the roof ${JSON.stringify(w)}`);
}
log('ERRORS', JSON.stringify(errors));
log(fails.length || errors.length ? 'SOME FAILED' : 'ALL PASS');
await browser.close();
