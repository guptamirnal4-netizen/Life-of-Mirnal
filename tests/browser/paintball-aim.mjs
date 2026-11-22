// Crosshair aiming in a real browser (Play vs Bots, Med-C): the crosshair is on screen with a blaster, its gap
// opens when firing and settles, recoil kicks the view and recovers, paintballs land where the crosshair points
// (a wall in first person, a bot in first and third person), hit markers show, splats appear. Screenshots.
//
//   node tests/browser/paintball-aim.mjs [screenshot dir]
// Starts the static dev server and the game server (test flag) itself.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = process.argv[2] || path.join(os.tmpdir(), 'paintball-aim');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => res(p)); }); });
const fails = []; const errors = [];
const check = (ok, what) => { console.log(ok ? 'PASS' : 'FAIL', what); if (!ok) fails.push(what); };
const procs = [];
function start(args, env, ready) {
  return new Promise((res, rej) => {
    const p = spawn('node', args, { cwd: ROOT, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    procs.push(p);
    const t = setTimeout(() => rej(new Error(`${args.join(' ')} did not start`)), 20000);
    const on = (d) => { if (ready.test(String(d))) { clearTimeout(t); res(p); } };
    p.stdout.on('data', on); p.stderr.on('data', (d) => { on(d); process.stderr.write(d); });
  });
}
process.on('exit', () => procs.forEach((p) => p.kill()));
const WEB = await freePort(); const GAME = await freePort();
await start(['dev/server.mjs'], { PORT: String(WEB) }, new RegExp(`localhost:${WEB}`));
await start(['server/index.js'], { PORT: String(GAME), PB_TEST: '1' }, /paintball server/);
const BASE = `http://localhost:${WEB}/`;
const PB = `pbserver=${encodeURIComponent(`ws://localhost:${GAME}`)}`;

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.addInitScript(() => { try { localStorage.setItem('pwb-intro-seen', 'true'); } catch { /* */ } });
const page = await ctx.newPage();
page.setDefaultTimeout(60000);
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
const shot = (file) => page.screenshot({ path: path.join(OUT, file) });
const send = (type, msg) => page.evaluate(([t, m]) => window.__pb.room.send(t, m), [type, msg]);
const frames = (n = 3) => page.evaluate((n) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);

// Med-C: centre (395, 644); the tower bunker sits on the centre (2.2 m square, 2.6 m tall)
const C = { x: 395, z: 644 };
const ME = { x: C.x - 14, z: C.z + 0.4 };
const BOT = { x: C.x - 14, z: C.z - 12 }; // 12 m north of me, clear of bunkers
// put the crosshair on a world point: iterate the camera (third person moves with the aim)
const aimAt = (pt) => page.evaluate(async (pt) => {
  const g = window.__game; const v = window.__pb.view;
  for (let i = 0; i < 6; i++) {
    const c = v.camera.position;
    const dx = pt.x - c.x; const dy = pt.y - c.y; const dz = pt.z - c.z;
    g.player.yaw = Math.atan2(-dx, -dz); g.player.pitch = Math.atan2(dy, Math.hypot(dx, dz));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }
  return v.aim ? { kind: v.aim.kind, id: v.aim.id, dist: v.aim.dist, point: v.aim.point } : null;
}, pt);
const crossGap = () => page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#pb-hud .cross')).getPropertyValue('--g')));
// count the server's word: my paintballs' impacts and hits
const record = () => page.evaluate(() => {
  const R = window.__pb.room; const me = R.sessionId; const w = window.__aimrec = { mine: new Set(), impacts: [], hits: 0 };
  R.onMessage('shot', (m) => { if (m.o === me) w.mine.add(m.i); });
  R.onMessage('impact', (m) => { if (w.mine.has(m.i) && m.x !== undefined) w.impacts.push(m); });
  R.onMessage('hit', () => { w.hits++; });
});
const reset = () => page.evaluate(() => { const w = window.__aimrec; w.impacts.length = 0; w.hits = 0; });
const rec = () => page.evaluate(() => ({ impacts: window.__aimrec.impacts.map((m) => ({ k: m.k, x: m.x, y: m.y, z: m.z, t: m.t })), hits: window.__aimrec.hits }));
// fire at the bot, holding it on its spot (bots walk about)
const fireAtBot = async (botId, ms) => {
  await page.evaluate(() => { window.__pb.view.fireHeld = true; });
  for (let t = 0; t < ms; t += 100) { await send('test:place', { id: botId, x: BOT.x, z: BOT.z, paint: 0 }); await sleep(100); }
  await page.evaluate(() => { window.__pb.view.fireHeld = false; });
};
const placeAll = async (botId) => {
  await send('test:place', { x: ME.x, z: ME.z, unprotect: true, paint: 0 });
  await send('test:place', { id: botId, x: BOT.x, z: BOT.z, unprotect: true, paint: 0 });
  await page.evaluate(() => { window.__pb.view.placed = false; });
  await sleep(300);
};

try {
  await page.goto(`${BASE}?${PB}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game?.mode === 'title' && window.__game.portal?.visible, null, { timeout: 30000 });
  await page.locator('[data-portal=bots]').click();
  await page.locator('[data-sheet=bots]').waitFor();
  await page.locator('[data-bots="arena-medc"]').click();
  await page.locator('[data-bots="mode-ffa"]').click();
  await page.evaluate(() => { const i = document.querySelector('[data-bots=count]'); i.value = '1'; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.locator('[data-bots="level-easy"]').click();
  await page.locator('[data-portal=bots-go]').click();
  await page.waitForFunction(() => window.__pb?.state?.phase === 'playing' && !!window.__pb.hud, null, { timeout: 60000 });
  const botId = await page.evaluate(() => [...window.__pb.state.players.entries()].find(([, p]) => p.bot)[0]);
  await record();

  // ---------- first person: the crosshair ----------
  await placeAll(botId);
  await page.evaluate(() => { if (window.__pb.view.view !== 'first') window.__pb.toggleView(); });
  const wall = { x: C.x - 1.1, y: 1.3, z: C.z + 0.4 }; // the tower's west face
  let a = await aimAt(wall);
  const cross = await page.evaluate(() => { const el = document.querySelector('#pb-hud .cross'); const r = el.getBoundingClientRect(); return { shown: getComputedStyle(el).display !== 'none', ticks: el.querySelectorAll('i').length, x: r.left, y: r.top, w: innerWidth, h: innerHeight }; });
  check(cross.shown && cross.ticks === 4, `crosshair: four ticks on screen with a blaster (${JSON.stringify(cross)})`);
  check(Math.abs(cross.x - cross.w / 2) < 2 && Math.abs(cross.y - cross.h / 2) < 2, 'crosshair: exactly at the centre of the screen');
  check(a?.kind === 'solid' && Math.abs(a.dist - 12.9) < 1.2, `crosshair: points at the tower bunker (${JSON.stringify(a)})`);
  const gap0 = await crossGap();
  await shot('1-first-person-crosshair.png');

  // ---------- recoil, bloom, puff: hold the trigger ----------
  await placeAll(botId); a = await aimAt(wall);
  const pitch0 = await page.evaluate(() => window.__game.player.pitch);
  await reset();
  await page.evaluate(() => { window.__pb.view.fireHeld = true; });
  await sleep(70);
  const mid = await page.evaluate(() => ({ pitch: window.__game.player.pitch, bloom: window.__pb.view.bloom, puff: window.__pb.view.puff?.visible, kick: window.__pb.view.kick }));
  const gapFiring = await crossGap();
  await shot('2-first-person-firing.png');
  await sleep(500);
  await page.evaluate(() => { window.__pb.view.fireHeld = false; });
  check(mid.pitch > pitch0 + 0.002, `recoil: the view kicks up when firing (${pitch0.toFixed(4)} → ${mid.pitch.toFixed(4)})`);
  check(gapFiring > gap0 + 2, `crosshair: opens up while firing (${gap0}px → ${gapFiring}px)`);
  await sleep(900);
  const after = await page.evaluate(() => ({ pitch: window.__game.player.pitch, bloom: window.__pb.view.bloom }));
  check(Math.abs(after.pitch - pitch0) < 0.004 && after.bloom === 0, `recoil: the view settles back (${after.pitch.toFixed(4)} vs ${pitch0.toFixed(4)}), crosshair closes`);
  check(Math.abs((await crossGap()) - gap0) < 0.5, 'crosshair: back to its resting gap');
  const r1 = await rec();
  const onWall = r1.impacts.filter((m) => m.k === 'solid');
  const near = onWall.filter((m) => Math.hypot(m.y - wall.y, m.z - wall.z) < 0.6 && Math.abs(m.x - wall.x) < 0.2).length;
  check(onWall.length >= 3 && near >= onWall.length * 0.8, `first person: paintballs land on the crosshair point on the wall (${near} of ${onWall.length} within 0.6 m)`);
  check(await page.evaluate(() => window.__pb.view.splats.length >= 3), 'paint splats on the bunker');
  await shot('3-first-person-splats.png');

  // ---------- first person: a bot under the crosshair ----------
  await placeAll(botId); await reset();
  a = await aimAt({ x: BOT.x, y: 1.2, z: BOT.z });
  check(a?.kind === 'player' && a.id === botId, `crosshair: on the bot (${a?.kind}, ${a?.dist?.toFixed(1)} m)`);
  await fireAtBot(botId, 700);
  await sleep(500);
  const r2 = await rec();
  check(r2.hits >= 1 && r2.impacts.some((m) => m.k === 'player' && m.t === botId), `first person: paintballs hit the bot under the crosshair (${r2.hits} hits)`);
  await shot('4-first-person-hit.png');

  // ---------- third person: shoulder camera, the shot still goes to the crosshair ----------
  await page.evaluate(() => { window.__pb.toggleView(); });
  check(await page.evaluate(() => window.__pb.view.view === 'third'), 'third-person view');
  await placeAll(botId); await reset();
  a = await aimAt({ x: BOT.x, y: 1.2, z: BOT.z });
  check(a?.kind === 'player' && a.id === botId, `third person: crosshair on the bot (${a?.kind})`);
  const tp = await page.evaluate(() => { const v = window.__pb.view; const g = window.__game.player; return { aimYaw: v.aim.yaw, yaw: g.yaw }; });
  check(Math.abs(tp.aimYaw - tp.yaw) > 0.01, `third person: the aim corrects for the shoulder camera (${(tp.aimYaw - tp.yaw).toFixed(3)} rad)`);
  await fireAtBot(botId, 700);
  await sleep(500);
  const r3 = await rec();
  check(r3.hits >= 1 && r3.impacts.some((m) => m.k === 'player' && m.t === botId), `third person: paintballs hit the bot under the crosshair (${r3.hits} hits)`);
  await shot('5-third-person-hit.png');
  await placeAll(botId); a = await aimAt(wall); await reset();
  await page.evaluate(() => { window.__pb.view.fireHeld = true; });
  await sleep(120); await shot('6-third-person-firing.png');
  await sleep(400); await page.evaluate(() => { window.__pb.view.fireHeld = false; });
  await sleep(500);
  const r4 = await rec();
  const w4 = r4.impacts.filter((m) => m.k === 'solid');
  const n4 = w4.filter((m) => Math.hypot(m.y - wall.y, m.z - wall.z) < 0.6).length;
  check(w4.length >= 2 && n4 >= w4.length * 0.8, `third person: paintballs land on the crosshair point on the wall (${n4} of ${w4.length})`);

  // ---------- precision marker zoom ----------
  await page.evaluate(() => { window.__pb.view.slot = 1; });
  await page.evaluate(() => { if (window.__pb.view.view !== 'first') window.__pb.toggleView(); });
  await sleep(1200);
  const eq = await page.evaluate(() => window.__pb.me.equip);
  if (eq === 'precision') {
    await page.evaluate(() => { window.__pb.view.zoom = true; }); await sleep(400);
    check(await page.evaluate(() => document.getElementById('pb-hud').classList.contains('zoom')), 'precision marker: zoom ring');
    await shot('7-precision-zoom.png');
    await page.evaluate(() => { window.__pb.view.zoom = false; });
  }
  check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
} catch (err) {
  console.error(err); fails.push(String(err?.message || err));
  await shot('error.png').catch(() => {});
} finally {
  await browser.close();
}
console.log(fails.length ? `\nFAILED: ${fails.join('; ')}` : `\nall aim checks passed · screenshots in ${OUT}`);
process.exit(fails.length ? 1 : 0);
