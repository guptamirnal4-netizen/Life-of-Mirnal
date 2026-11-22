// Milestone 1 checks: one renderer, one scene render per frame, renderer configuration, resize,
// runtime quality presets (through the Settings menu), the performance overlay, camera views and cycling.
import { chromium } from 'playwright-core';
const OUT = process.argv[2] || '.';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
page.setDefaultTimeout(30000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' || /WebGL|shader/i.test(m.text())) errors.push(m.text()); });
const log = (...a) => console.log(...a);
const fails = [];
const check = (ok, what) => { log(ok ? 'PASS' : 'FAIL', what); if (!ok) fails.push(what); };
const g = (fn, arg) => page.evaluate(fn, arg);
await page.addInitScript(() => {
  window.__ctx = 0;
  const gc = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...a) { if (/webgl/.test(type) && this.id === 'game' && !this.__counted) { this.__counted = true; window.__ctx++; } return gc.call(this, type, ...a); };
});
// College Life is hidden behind FEATURES.collegeLife (js/features.js); switch it on and skip the first-visit intro
await page.addInitScript(() => { try { localStorage.setItem('pwb-features', 'collegeLife'); localStorage.setItem('pwb-intro-seen', 'true'); } catch { /* */ } });
await page.goto('http://localhost:8080/', { waitUntil: 'load' });
await page.waitForTimeout(1000);
await g(() => { window.__game.voice.mock = true; const c = document.getElementById('game'); Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => (window.__locked ? c : null) }); });
await page.getByRole('button', { name: /College Life/i }).click();
await page.getByRole('button', { name: /Turn on my microphone/ }).click();
await page.waitForTimeout(600);
await page.getByRole('button', { name: 'Start the day' }).click();
await g(() => { window.__locked = true; });
await page.waitForTimeout(800);

// one renderer, one render of the game scene per frame
const renders = await g(() => new Promise((res) => {
  const G = window.__game.graphics; const r = G.renderer; const orig = r.render.bind(r);
  let main = 0; let frames = 0;
  r.render = (s, c) => { if (s === G.scene) main++; return orig(s, c); };
  const f = () => { frames++; if (frames < 60) requestAnimationFrame(f); else { r.render = orig; res({ main, frames }); } };
  requestAnimationFrame(f);
}));
log('scene renders', JSON.stringify(renders));
check(Math.abs(renders.main - renders.frames) <= 1, 'the scene is rendered exactly once per frame');
check((await g(() => window.__ctx)) === 1, 'one WebGL context on the game canvas (no second renderer)');

// renderer configuration (High by default)
const cfg = await g(() => { const G = window.__game.graphics; const r = G.renderer; return { q: G.quality.name, tone: r.toneMapping, exp: r.toneMappingExposure, cs: r.outputColorSpace, shadows: r.shadowMap.enabled, type: r.shadowMap.type, pr: r.getPixelRatio(), w: r.domElement.width, h: r.domElement.height, map: G.env.sun.shadow.mapSize.x, span: G.env.sun.shadow.camera.right - G.env.sun.shadow.camera.left, cast: G.env.sun.castShadow, aniso: r.capabilities.getMaxAnisotropy() }; });
log('renderer', JSON.stringify(cfg));
check(cfg.q === 'high' && cfg.tone === 4 && cfg.cs === 'srgb' && cfg.shadows && cfg.type === 2 && cfg.map === 2048 && cfg.span === 76, 'High by default: ACES tone mapping, sRGB output, soft 2048 shadows over 76 m');
check(cfg.pr < 2 && cfg.w * cfg.h <= 3.7e6 + 5000, `Retina window rendered within the High pixel budget (${cfg.w}×${cfg.h} @ ${cfg.pr.toFixed(2)})`);

// resize: a burst of events → one resize, correct size and aspect
await page.setViewportSize({ width: 1100, height: 700 });
await page.setViewportSize({ width: 1000, height: 640 });
await page.waitForTimeout(400);
const rs = await g(() => { const G = window.__game.graphics; const r = G.renderer; return { w: r.domElement.width, h: r.domElement.height, cw: r.domElement.clientWidth, aspect: G.camera.aspect, pr: r.getPixelRatio() }; });
log('after resize', JSON.stringify(rs));
check(rs.cw === 1000 && Math.abs(rs.aspect - 1000 / 640) < 1e-6 && rs.w === Math.floor(1000 * rs.pr), 'resizing updates the canvas, pixel ratio and camera aspect');
check(rs.pr === 2, 'a smaller window gets full Retina (pixel budget allows it)');
await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(400);

// presets through the Settings menu
const mem0 = await g(() => ({ ...window.__game.graphics.renderer.info.memory }));
for (const q of ['low', 'medium', 'ultra', 'high', 'low', 'high']) {
  await g(() => { window.__locked = false; });
  await page.keyboard.press('KeyP');
  await page.locator('#overlay button', { hasText: 'Settings' }).click();
  await page.locator('#overlay select').filter({ has: page.locator('option[value="ultra"]') }).selectOption(q);
  await g(() => document.querySelectorAll('#overlay .close').forEach((b) => b.click()));
  await g(() => document.querySelectorAll('#overlay .close').forEach((b) => b.click()));
  await g(() => { window.__locked = true; });
  await page.waitForTimeout(700);
  const s = await g(() => { const G = window.__game.graphics; const r = G.renderer; return { q: G.quality.name, saved: window.__game.state.settings.graphics, shadows: r.shadowMap.enabled, cast: G.env.sun.castShadow, map: G.env.sun.shadow.mapSize.x, pr: +r.getPixelRatio().toFixed(2), px: r.domElement.width * r.domElement.height }; });
  log(q, JSON.stringify(s));
  await page.screenshot({ path: `${OUT}/q-${q}.png` });
  const want = { low: [false, 1024], medium: [true, 1024], high: [true, 2048], ultra: [true, 4096] }[q];
  check(s.q === q && s.saved === q && s.shadows === want[0] && s.cast === want[0] && (!want[0] || s.map === want[1]), `${q}: applied at once from Settings and saved`);
}
const mem1 = await g(() => ({ ...window.__game.graphics.renderer.info.memory }));
log('memory before/after preset changes', JSON.stringify(mem0), JSON.stringify(mem1));
check(mem1.textures <= mem0.textures + 1 && mem1.geometries <= mem0.geometries + 2, 'switching presets does not leak textures or geometry');
check(errors.length === 0, 'no shader or WebGL errors after recompiling materials');

// performance overlay
await page.keyboard.press('Backquote');
await page.waitForTimeout(1200);
const hud = await page.locator('#perf-hud').innerText();
log('perf overlay:\n' + hud);
check(/fps/.test(hud) && /draws/.test(hud) && /High/.test(hud), 'press ` shows the performance overlay');
await page.screenshot({ path: `${OUT}/perf-overlay.png` });

// camera views and cycling
const cam = async () => g(() => { const G = window.__game; const c = G.graphics.camera.position; const p = G.player.pos; return { d: Math.hypot(c.x - p.x, c.z - p.z), view: G.graphics.view }; });
await g(() => { const G = window.__game; G.state.settings.view = 'first'; G.player.place(new G.player.pos.constructor(0, 0, 30), Math.PI); });
await page.waitForTimeout(300);
const fp = await cam();
await page.keyboard.press('KeyV');
await page.waitForTimeout(400);
const tp = await cam();
log('camera', JSON.stringify({ fp, tp }));
check(fp.d < 0.05 && fp.view === 'first', 'first person: camera at the eyes');
check(tp.d > 2 && tp.view === 'third', 'V: third person, camera behind the player');
await page.keyboard.press('KeyC');
await page.keyboard.down('KeyW'); await page.waitForTimeout(2500); await page.keyboard.up('KeyW');
const cy = await g(() => ({ bike: window.__game.player.bike, speed: window.__game.player.speedNow, view: window.__game.graphics.view }));
log('cycling', JSON.stringify(cy));
check(cy.bike && cy.speed > 3 && cy.view === 'third · cycle', 'cycling works and the engine knows the cycle camera is active');
await page.screenshot({ path: `${OUT}/cycle-third.png` });

log('ERRORS', JSON.stringify(errors));
log(fails.length ? `FAILED ${fails.length}: ${fails.join(' | ')}` : 'ALL PASS');
await browser.close();
process.exit(fails.length || errors.length ? 1 : 0);
