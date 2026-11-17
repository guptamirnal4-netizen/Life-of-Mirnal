// Frame-time benchmark, identical before and after: wraps requestAnimationFrame callbacks (CPU ms per frame)
// and counts WebGL draw calls. node perf.mjs <label> [seconds per scene] [headed]
import { chromium } from 'playwright-core';
const label = process.argv[2] || 'run';
const SECS = Number(process.argv[3] || 12);
const headed = process.argv[4] === 'headed';
const browser = await chromium.launch({ channel: 'chrome', headless: !headed, args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
page.setDefaultTimeout(30000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => {
  const P = (window.__perf = { cpu: [], gaps: [], draws: [], tris: 0, last: 0, curDraws: 0 });
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf((t) => {
    if (P.last) P.gaps.push(t - P.last);
    P.last = t;
    P.curDraws = 0;
    const s = performance.now();
    cb(t);
    P.cpu.push(performance.now() - s);
    P.draws.push(P.curDraws);
  });
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
    if (!C) continue;
    for (const f of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
      const o = C.prototype[f];
      if (o) C.prototype[f] = function (...a) { P.curDraws++; return o.apply(this, a); };
    }
  }
});
const g = (fn, arg) => page.evaluate(fn, arg);
await page.goto('http://localhost:8080/', { waitUntil: 'load' });
await page.waitForTimeout(1000);
const gpu = await g(() => { const c = document.createElement('canvas').getContext('webgl2'); const d = c.getExtension('WEBGL_debug_renderer_info'); return d ? c.getParameter(d.UNMASKED_RENDERER_WEBGL) : c.getParameter(c.RENDERER); });
await g(() => { window.__game.voice.mock = true; const c = document.getElementById('game'); Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => (window.__locked ? c : null) }); });
await page.getByRole('button', { name: /College Life/ }).click();
await page.getByRole('button', { name: /Turn on my microphone/ }).click();
await page.waitForTimeout(600);
await page.getByRole('button', { name: 'Start the day' }).click();
await g(() => { window.__locked = true; window.__game.state.settings.view = 'third'; });
const stats = (a) => { const s = [...a].sort((x, y) => x - y); const avg = s.reduce((p, c) => p + c, 0) / (s.length || 1); return { avg: +avg.toFixed(2), p95: +(s[Math.floor(s.length * 0.95)] || 0).toFixed(2) }; };
const measure = async (name, setup, keys = []) => {
  await g(setup);
  await page.waitForTimeout(1500);
  await g(() => { const P = window.__perf; P.cpu = []; P.gaps = []; P.draws = []; });
  for (const k of keys) await page.keyboard.down(k);
  await page.waitForTimeout(SECS * 1000);
  for (const k of keys) await page.keyboard.up(k);
  const P = await g(() => ({ cpu: window.__perf.cpu, gaps: window.__perf.gaps, draws: window.__perf.draws }));
  const gp = stats(P.gaps);
  const row = { scene: name, fps: +(1000 / gp.avg).toFixed(1), frame_ms: gp, cpu_ms: stats(P.cpu), draws: stats(P.draws).avg };
  console.log(JSON.stringify(row));
  return row;
};
const rows = [];
rows.push(await measure('room (hostel)', () => {}));
rows.push(await measure('hostel corridor 18:00', () => { const G = window.__game; const H = G.campus.hostel; G.state.day.clock = 18 * 60; G.player.place(H.world(6.15, H.ve - 20, 0), Math.atan2(-H.ev[0], -H.ev[1])); }, ['KeyW']));
rows.push(await measure('campus walk (Rotunda → NAB)', () => { const G = window.__game; G.state.day.clock = 11 * 60; G.player.place(new G.player.pos.constructor(0, 0, 20), Math.PI); }, ['KeyW']));
rows.push(await measure('cycling (main road)', () => { const G = window.__game; G.player.place(new G.player.pos.constructor(0, 0, 40), Math.PI); G.player.bike = true; }, ['KeyW']));
rows.push(await measure('first person, open campus', () => { const G = window.__game; G.player.bike = false; G.state.settings.view = 'first'; G.player.place(new G.player.pos.constructor(0, 0, 60), Math.PI); }));
console.log('GPU', gpu, '| label', label, '| errors', JSON.stringify(errors));
await browser.close();
