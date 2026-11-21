// Paintball frame time with 12 connected clients: one real Chrome page (measured, first person, the game's
// default "high" quality on a laptop) plus 11 @colyseus/sdk bots that run, turn and fire paintballs.
//   node tests/browser/paintball-perf.mjs [seconds] [headed]
// The CPU/frame measurement is the same as tests/browser/perf.mjs.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@colyseus/sdk';
import { Bot, until, sleep } from '../mp/helpers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SECS = Number(process.argv[2] || 12);
const headed = process.argv[3] === 'headed';
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => res(p)); }); });
const procs = [];
const start = (args, env, ready) => new Promise((res, rej) => {
  const p = spawn('node', args, { cwd: ROOT, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] }); procs.push(p);
  const t = setTimeout(() => rej(new Error('start timeout')), 15000);
  const on = (d) => { if (ready.test(String(d))) { clearTimeout(t); res(p); } };
  p.stdout.on('data', on); p.stderr.on('data', on);
});
process.on('exit', () => procs.forEach((p) => p.kill()));
const GP = await freePort();
await start(['dev/server.mjs'], { PORT: '8121' }, /localhost:8121/);
await start(['server/index.js'], { PORT: String(GP), PB_TEST: '1' }, /paintball server/);

const browser = await chromium.launch({ channel: 'chrome', headless: !headed, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
page.setDefaultTimeout(60000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => {
  const P = (window.__perf = { cpu: [], gaps: [], draws: [], last: 0, curDraws: 0 });
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf((t) => { if (P.last) P.gaps.push(t - P.last); P.last = t; P.curDraws = 0; const s = performance.now(); cb(t); P.cpu.push(performance.now() - s); P.draws.push(P.curDraws); });
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
    if (!C) continue;
    for (const f of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) { const o = C.prototype[f]; if (o) C.prototype[f] = function (...a) { P.curDraws++; return o.apply(this, a); }; }
  }
});
await page.goto(`http://localhost:8121/?paintball&pbserver=${encodeURIComponent(`ws://localhost:${GP}`)}`, { waitUntil: 'load' });
await page.locator('input[aria-label=Nickname]').fill('Measured');
await page.locator('[data-pb=create]').click();
await page.locator('[data-pb=code]').waitFor();
const code = (await page.locator('[data-pb=code]').innerText()).trim();
const bots = [];
for (let i = 0; i < 11; i++) bots.push(new Bot(await new Client(`ws://localhost:${GP}`).joinById(code, { nickname: `Bot ${i + 1}`, loadout: [['standard', 'rapid'], ['rapid', 'spread'], ['burst', 'launcher'], ['precision', 'standard']][i % 4] })));
await page.waitForFunction(() => window.__pb.state.players.size === 12);
await page.evaluate(() => window.__pb.room.send('config', { duration: 300 }));
for (const b of bots) b.send('ready', { ready: true });
await page.locator('[data-pb=ready]').click();
await page.waitForFunction(() => [...window.__pb.state.players.values()].every((p) => p.ready));
await page.locator('[data-pb=start]').click();
await page.waitForFunction(() => window.__pb.state.phase === 'playing');
await page.evaluate(() => { const c = document.getElementById('game'); Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => c }); });
// bots: run around, turn, aim at the measured player now and then, fire in bursts
let t = 0;
const drive = setInterval(() => {
  t += 0.1;
  for (const [i, b] of bots.entries()) {
    b.in.f = Math.sin(t * 0.7 + i) > -0.3 ? 1 : -1; b.in.s = Math.sin(t * 1.3 + i * 2); b.in.run = i % 2 === 0;
    b.in.yaw += 0.15 * Math.sin(t + i); b.in.pitch = -0.02; b.in.fire = Math.sin(t * 2 + i) > 0.2; b.in.jump = Math.random() < 0.02;
    if (i % 3 === 0) b.in.slot = Math.sin(t * 0.2 + i) > 0 ? 1 : 0;
  }
}, 100);
const stats = (a) => { const s = [...a].sort((x, y) => x - y); const avg = s.reduce((p, c) => p + c, 0) / (s.length || 1); return { avg: +avg.toFixed(2), p95: +(s[Math.floor(s.length * 0.95)] || 0).toFixed(2), max: +(s.at(-1) || 0).toFixed(1) }; };
await page.keyboard.down('KeyW');
await sleep(2500);
await page.evaluate(() => { const P = window.__perf; P.cpu = []; P.gaps = []; P.draws = []; window.__pb.view.fireHeld = true; });
await page.keyboard.up('KeyW');
await page.mouse.move(700, 450);
for (let i = 0; i < SECS * 4; i++) { await page.evaluate((k) => { window.__game.player.yaw += 0.04 * Math.sin(k / 6); }, i); await sleep(250); }
const P = await page.evaluate(() => ({ cpu: window.__perf.cpu, gaps: window.__perf.gaps, draws: window.__perf.draws, players: window.__pb.state.players.size, splats: window.__pb.view.splats.length, quality: window.__game.graphics.quality.name }));
clearInterval(drive);
const gpu = await page.evaluate(() => { const c = document.createElement('canvas').getContext('webgl2'); const d = c.getExtension('WEBGL_debug_renderer_info'); return d ? c.getParameter(d.UNMASKED_RENDERER_WEBGL) : ''; });
const gp = stats(P.gaps);
const shots = bots.reduce((n, b) => n + b.events('shot').length, 0);
console.log(JSON.stringify({ scene: 'paintball 12 clients', players: P.players, fps: +(1000 / gp.avg).toFixed(1), frame_ms: gp, cpu_ms: stats(P.cpu), draws: stats(P.draws).avg, splats: P.splats, quality: P.quality, paintballs_seen_by_bots: shots }));
console.log('GPU', gpu, '| errors', JSON.stringify(errors));
for (const b of bots) await b.leave();
await browser.close();
process.exit(0);
