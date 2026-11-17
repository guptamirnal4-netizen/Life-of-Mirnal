// Walk into every walk-in Bhawan through its entrance. node bhawans.mjs OUTDIR
import { chromium } from 'playwright-core';
const OUT = process.argv[2] || '.';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const g = (fn, arg) => page.evaluate(fn, arg);
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${info}`); };
await page.goto('http://localhost:8080/', { waitUntil: 'load' });
await page.waitForTimeout(800);
await g(() => { window.__game.voice.mock = true; const c = document.getElementById('game'); Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => (window.__locked ? c : null) }); });
const t0 = Date.now();
await page.getByRole('button', { name: /College Life/ }).click();
await page.getByRole('button', { name: /Turn on my microphone/ }).waitFor();
console.log('college load ms', Date.now() - t0);
await page.getByRole('button', { name: /Turn on my microphone/ }).click();
await page.waitForTimeout(500);
await page.getByRole('button', { name: 'Start the day' }).click();
await g(() => { window.__locked = true; const G = window.__game; G.state.settings.view = 'first'; G.state.day.clock = 17 * 60 + 45; });
await page.waitForTimeout(500);
const names = await g(() => window.__game.campus.hostels.map((H) => H.name));
check('seven walk-in Bhawans', names.length === 7, names.join(', '));
for (let i = 0; i < names.length; i++) {
  await g((i) => { const G = window.__game; const H = G.campus.hostels[i]; G.player.place(H.entrance.out.clone(), H.entrance.yaw + Math.PI); }, i);
  await page.waitForTimeout(300);
  await g(() => window.__game.player.keys.add('KeyW'));
  await page.waitForTimeout(2600);
  await g(() => window.__game.player.keys.delete('KeyW'));
  await page.waitForTimeout(400);
  const r = await g((i) => {
    const G = window.__game; const H = G.campus.hostels[i]; const p = G.player.pos;
    const [u, v] = H.local(p.x, p.z);
    return { room: G.campus.roomAt(p.x, p.z, p.y), u: +u.toFixed(1), dv: +(v - H.ve).toFixed(1), guide: document.querySelector('#bhawan-guide div div')?.textContent, interior: H.g.visible, others: G.campus.hostels.filter((x) => x !== H && x.g.visible).map((x) => x.name) };
  }, i);
  check(`${names[i]}: walked in through the entrance`, r.room === 'hostel' && r.u > 2, JSON.stringify(r));
  check(`${names[i]}: guide names it`, (r.guide || '').startsWith(names[i]));
  check(`${names[i]}: only its interior is drawn`, r.interior && r.others.length === 0, r.others.join(','));
  if (i === 1 || i === 5) await page.screenshot({ path: `${OUT}/bh-${i}-lobby.png` });
  // look into the courtyard from the corridor
  await g((i) => { const G = window.__game; const H = G.campus.hostels[i]; const c = H.court.at(-1); const p = H.world(6.6, (c.v0 + c.v1) / 2); const t = H.world(c.u1, (c.v0 + c.v1) / 2); G.player.place(p, Math.atan2(-(t.x - p.x), -(t.z - p.z))); G.state.settings.view = 'third'; }, i);
  await page.waitForTimeout(900);
  if (i === 1 || i === 5) await page.screenshot({ path: `${OUT}/bh-${i}-court.png` });
  await g(() => { window.__game.state.settings.view = 'first'; });
}
// from outside, far away: no interiors drawn
await g(() => { const G = window.__game; const H = G.campus.hostel; G.player.place(H.world(-120, H.ve), 0); });
await page.waitForTimeout(500);
check('far from every Bhawan: no interiors drawn', await g(() => window.__game.campus.hostels.every((H) => !H.g.visible)));
// draw calls and fps in Krishna's corridor and on a road between Bhawans
const perf = async (label) => g((label) => new Promise((res) => {
  const G = window.__game; let n = 0; let calls = 0; const t0 = performance.now();
  const step = () => { n++; calls += G.graphics.renderer.info.render.calls; if (performance.now() - t0 < 2500) requestAnimationFrame(step); else res({ label, fps: +(n / 2.5).toFixed(1), draws: Math.round(calls / n) }); };
  requestAnimationFrame(step);
}), label);
await g(() => { const G = window.__game; const H = G.campus.hostel; G.player.place(H.world(6.2, H.ve + 25), Math.atan2(-H.ev[0], -H.ev[1]) + Math.PI); });
await page.waitForTimeout(800);
const p1 = await perf('Krishna corridor'); console.log(JSON.stringify(p1));
await g(() => { const G = window.__game; const H = G.campus.hostels[1]; G.player.place(H.entrance.out.clone().add({ x: 0, y: 0, z: 0 }), H.entrance.yaw); G.state.settings.view = 'third'; });
await page.waitForTimeout(800);
const p2 = await perf('outside Gandhi'); console.log(JSON.stringify(p2));
check('60 fps in and around the Bhawans', p1.fps > 55 && p2.fps > 55);
console.log('ERRORS', JSON.stringify(errors));
console.log(results.every(Boolean) && !errors.length ? 'ALL PASS' : 'SOME FAILED');
await browser.close();
