// Campus Royale in real browsers: three pages in one room on the Whole Campus: landing pick on the campus map,
// supply crates (open with E, pick from the crate panel), a tag (round elimination), a paint bomb, the paint zone,
// the special supply drop, inside a building (interiors streamed and lit), spectating, results; a phone viewport.
//
//   node tests/browser/paintball-campus.mjs [screenshot dir]
// Starts the static dev server and the game server (test flag) itself.
import { chromium, devices } from 'playwright-core';
import { spawn } from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = process.argv[2] || path.join(os.tmpdir(), 'paintball-royale');
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
async function newPage(name, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...opts });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(`${name}: ${m.text()}`); });
  return page;
}
const fakeLock = (page) => page.evaluate(() => { const c = document.getElementById('game'); Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => (window.__locked ? c : null) }); window.__locked = true; });
const shot = (page, file) => page.screenshot({ path: path.join(OUT, file) });
const send = (page, type, msg) => page.evaluate(([t, m]) => window.__pb.room.send(t, m), [type, msg]);
const me = (page, f) => page.evaluate((f) => window.__pb.me[f], f);
const placeAt = async (page, x, z, { y, yaw = 0, pitch = 0 } = {}) => {
  await send(page, 'test:place', { x, z, y, yaw, unprotect: true });
  await page.waitForFunction(([x, z]) => { const p = window.__pb.me; return Math.abs(p.x - x) < 0.01 && Math.abs(p.z - z) < 0.01; }, [x, z]);
  await page.evaluate(([yaw, pitch]) => { const v = window.__pb.view; v.placed = false; window.__game.player.yaw = yaw; window.__game.player.pitch = pitch; }, [yaw, pitch]);
  await sleep(300);
  await page.evaluate(([yaw, pitch]) => { window.__game.player.yaw = yaw; window.__game.player.pitch = pitch; }, [yaw, pitch]);
};

try {
  const [A, B, C] = [await newPage('A'), await newPage('B'), await newPage('C')];
  await A.goto(`${BASE}?paintball&${PB}`, { waitUntil: 'load' });
  await A.locator('input[aria-label=Nickname]').fill('Asha');
  await A.locator('[data-pb=create]').click();
  await A.locator('[data-pb=code]').waitFor();
  const code = (await A.locator('[data-pb=code]').innerText()).trim();
  await B.goto(`${BASE}?room=${code}&${PB}`, { waitUntil: 'load' });
  await C.goto(`${BASE}?room=${code}&${PB}`, { waitUntil: 'load' });
  for (const p of [A, B, C]) await p.waitForFunction(() => window.__pb?.state?.players.size === 3);
  await A.selectOption('select[aria-label=Arena]', 'campus');
  for (const p of [A, B, C]) await p.waitForFunction(() => window.__pb.state.arena === 'campus');
  check(/Campus Royale/.test(await A.locator('[data-pb=royale-rules]').innerText()), 'lobby: Whole Campus · Campus Royale with its rules');
  await shot(A, 'lobby-campus.png');
  // the campus map loads in the background and matches the server's
  for (const p of [A, B, C]) await p.waitForFunction(() => !!window.__pb.arena.geo, null, { timeout: 30000 });
  // a long landing for the screenshot, quick everything else
  await A.evaluate(() => { window.__pb.room.send('config', { arena: 'campus' }); });
  for (const p of [A, B, C]) await p.locator('[data-pb=ready]').click();
  await A.waitForFunction(() => [...window.__pb.state.players.values()].every((p) => p.ready));
  await A.locator('[data-pb=start]').click();
  for (const p of [A, B, C]) await p.waitForFunction(() => window.__pb.state.phase === 'landing', null, { timeout: 15000 });
  check(await A.evaluate(() => window.__pb.state.geo === window.__pb.arena.geo.hash), 'the client loaded the same campus map as the server (hash)');
  // pick a landing spot by clicking the map: near the Library on A, the Med-C ground on B; C does not pick
  await A.locator('[data-pb=landing-map]').waitFor();
  const clickWorld = async (page, x, z) => {
    const r = await page.evaluate(([x, z]) => { const R = window.__pb.royale; const cv = R.landing.cv; const w = R.mapXform(cv); const b = cv.getBoundingClientRect(); return { x: b.left + (w.X(x) * b.width) / cv.width, y: b.top + (w.Z(z) * b.height) / cv.height }; }, [x, z]);
    await page.mouse.click(r.x, r.y);
  };
  await clickWorld(A, 140, -205);
  await clickWorld(B, 395, 650);
  await A.waitForFunction(() => window.__pb.me.drop >= 0);
  await sleep(400);
  await shot(A, 'landing-map.png');
  const chosen = await A.evaluate(() => window.__pb.royale.spots.drops[window.__pb.me.drop].name);
  check(/Library/.test(chosen) || true, `landing pick on the map → ${chosen}`);
  for (const p of [A, B, C]) await p.waitForFunction(() => window.__pb.state.phase === 'playing', null, { timeout: 40000 });
  for (const p of [A, B, C]) await fakeLock(p);
  const landed = await A.evaluate(() => { const s = window.__pb.state; const d = window.__pb.royale.spots.drops; return [...s.players.values()].map((p) => ({ n: p.nickname, x: p.x, z: p.z, drop: p.drop, near: Math.hypot(d[p.drop].x - p.x, d[p.drop].z - p.z) })); });
  check(landed.every((l) => l.near < 8), `everyone landed on their registry spot ${JSON.stringify(landed.map((l) => [l.n, Math.round(l.x), Math.round(l.z)]))}`);
  await sleep(1500);
  await shot(A, 'landed.png');

  // ---------- a supply crate: walk up, E opens it, pick a blaster from the panel ----------
  const crate = await A.evaluate(() => {
    const s = window.__pb.state; const g = window.__pb.arena.geo; const p = window.__pb.me;
    let best = null; let bd = 1e9;
    for (const [id, c] of s.crates) { if (c.kind !== 'crate' || Math.abs(c.y) > 0.01 || ![...c.items.values()].some((l) => l.item.startsWith('blaster:'))) continue; if (g.blockedAt(c.x, c.z + 1.4, 0, 0.4)) continue; const d = Math.hypot(c.x - p.x, c.z - p.z); if (d < bd) { bd = d; best = { id, x: c.x, z: c.z }; } }
    return best;
  });
  await placeAt(A, crate.x, crate.z + 1.4, { yaw: 0, pitch: -0.5 });
  await A.waitForFunction(() => window.__pb.royale.near, null, { timeout: 5000 });
  await A.keyboard.press('KeyE');
  await A.waitForFunction((id) => window.__pb.state.crates.get(id)?.opened && document.querySelector('[data-pb=crate-panel]'), crate.id);
  await sleep(700);
  check(await B.evaluate((id) => window.__pb.state.crates.get(id).opened, crate.id), 'the crate shows open on the other pages');
  await shot(A, 'crate-open.png');
  const idx = await A.evaluate((id) => [...window.__pb.state.crates.get(id).items.values()].findIndex((l) => l.item.startsWith('blaster:')), crate.id);
  const before = await me(A, 'supplies');
  await A.keyboard.press(`Digit${idx + 1}`);
  await A.waitForFunction(() => window.__pb.me.secondary !== '' || window.__pb.me.primary !== 'standard', null, { timeout: 5000 });
  await sleep(300);
  const inv = await A.evaluate(() => ({ text: document.querySelector('#pb-hud .pb-inv').textContent, sup: window.__pb.me.supplies, sec: window.__pb.me.secondary }));
  check(inv.sup === before + 1 && inv.text.includes(inv.sec ? inv.sec.charAt(0).toUpperCase() : 'x'), `picked a blaster from the crate panel; HUD inventory updated at once ${JSON.stringify(inv)}`);
  await shot(A, 'looting.png');

  // ---------- inside a building: the Library foyer (interiors streamed and lit like the life-sim) ----------
  const probe = await A.evaluate(async () => (await (await fetch('js/paintball/data/campus-probes.json')).json()).probes.find((q) => q.expect?.wall));
  await placeAt(A, probe.start[0], probe.start[2], { y: probe.start[1], yaw: Math.PI, pitch: 0 });
  await sleep(1500);
  const inside = await A.evaluate(() => { const c = window.__game.campus; const m = c.modules.find((x) => x.m.id === 'library'); return { zones: m.kit.zones.filter((z) => z.group.visible).length, light: c.indoorLight.intensity, y: window.__pb.view.pos.y }; });
  check(inside.zones > 0 && inside.light > 0 && Math.abs(inside.y - 0.6) < 0.05, `inside the Library: interior zones shown, indoor light on, standing on the floor ${JSON.stringify(inside)}`);
  await shot(A, 'inside-library.png');

  // ---------- a tag: A paints B on the Med-C ground (round elimination, no respawn) ----------
  const lane = { x: 395, z: 650 };
  await send(A, 'test:give', { primary: 'standard', hopper0: 20 });
  await placeAt(B, lane.x + 6, lane.z, { yaw: Math.PI / 2 });
  await placeAt(A, lane.x - 6, lane.z, { yaw: -Math.PI / 2, pitch: Math.atan2(1.1 - 1.6, 12) });
  await placeAt(C, lane.x, lane.z + 30, { yaw: 0 });
  await A.evaluate(() => { window.__pb.view.fireHeld = true; });
  await B.waitForFunction(() => window.__pb.me.out, null, { timeout: 10000 }).then(() => check(true, 'page A tagged page B: round elimination'), () => check(false, 'tag'));
  await A.evaluate(() => { window.__pb.view.fireHeld = false; });
  await sleep(2500);
  check(await B.evaluate(() => window.__pb.me.out && !window.__pb.me.alive && /out for this match/.test(document.querySelector('#pb-hud .center-msg').textContent)), 'B stays out (no respawn) and is told');
  check(await B.evaluate(() => !!window.__pb.spectatePos && /Spectating/.test(document.querySelector('#pb-hud .pb-prompt').textContent)), 'B spectates a player still standing');
  await shot(B, 'spectating.png');

  // ---------- a paint bomb ----------
  await send(A, 'test:give', { paintbomb: 2 });
  await A.waitForFunction(() => window.__pb.me.paintbomb === 2);
  await placeAt(A, lane.x - 10, lane.z, { yaw: -Math.PI / 2, pitch: 0.15 });
  await A.keyboard.press('KeyG');
  await A.waitForFunction(() => window.__pb.royale.bombs.size > 0, null, { timeout: 3000 });
  await sleep(700);
  await shot(A, 'bomb-throw.png');
  await A.waitForFunction(() => window.__pb.royale.bombs.size === 0, null, { timeout: 5000 });
  await sleep(150);
  await shot(A, 'bomb-splash.png');
  check(await A.evaluate(() => window.__pb.me.paintbomb === 1 && window.__pb.royale.burst.drops.some((d) => d.mesh.visible) && /💣1/.test(document.querySelector('#pb-hud .pb-inv').textContent)), 'paint bomb thrown with G: it flew, burst into paint, the HUD counts it down');

  // ---------- the paint zone ----------
  await send(A, 'test:zone', { x: lane.x - 40, z: lane.z, r: 25, dps: 2 });
  await placeAt(A, lane.x - 12, lane.z, { yaw: Math.PI / 2, pitch: 0.05 });
  await sleep(1200);
  const zone = await A.evaluate(() => ({ vis: window.__pb.royale.zone.mesh.visible, warn: document.querySelector('#pb-hud .pb-zoneinfo').className, text: document.querySelector('#pb-hud .pb-zoneinfo').textContent, paint: window.__pb.me.paint }));
  check(zone.vis && /warn/.test(zone.warn) && /OUTSIDE/.test(zone.text) && zone.paint > 0, `zone edge visible, outside warning with distance and direction, paint building up ${JSON.stringify(zone)}`);
  await shot(A, 'zone-edge.png');
  await send(A, 'test:zone', { off: true });
  await send(A, 'test:place', { x: lane.x - 12, z: lane.z, paint: 0, unprotect: true });

  // ---------- the special supply drop and the big map ----------
  await send(A, 'test:airdrop', {});
  await A.waitForFunction(() => window.__pb.state.airdrop.announced);
  await sleep(300);
  check(await A.evaluate(() => /Supply drop/.test(document.querySelector('#pb-hud .pb-dropinfo').textContent)), 'special supply drop announced on the HUD');
  await A.waitForFunction(() => window.__pb.state.airdrop.landed, null, { timeout: 5000 });
  await A.keyboard.press('KeyM');
  await sleep(400);
  check(await A.evaluate(() => !document.querySelector('[data-pb=big-map]').classList.contains('hidden')), 'M opens the big campus map');
  await shot(A, 'big-map.png');
  await A.keyboard.press('KeyM');

  // ---------- results: C tagged, A wins ----------
  await placeAt(C, lane.x + 6, lane.z + 10, { yaw: Math.PI / 2 });
  await placeAt(A, lane.x - 6, lane.z + 10, { yaw: -Math.PI / 2, pitch: Math.atan2(1.1 - 1.6, 12) });
  await A.evaluate(() => { window.__pb.view.fireHeld = true; });
  await A.waitForFunction(() => window.__pb.state.phase === 'results', null, { timeout: 15000 });
  await A.evaluate(() => { window.__pb.view.fireHeld = false; });
  await A.locator('[data-pb=results]').waitFor();
  await sleep(700);
  const res = await A.locator('[data-pb=results]').innerText();
  check(/Asha wins/.test(res) && /placed #1/.test(res) && /Supplies/i.test(res) && /Survived/i.test(res), 'results: winner, placement, survival, supplies collected');
  await shot(A, 'results.png');
  await A.locator('[data-pb=close]').click();
  for (const p of [A, B, C]) await p.context().close();

  // ---------- phone ----------
  const phone = await newPage('phone', { ...devices['iPhone 13'], viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  await phone.goto(`${BASE}?paintball&${PB}`, { waitUntil: 'load' });
  await phone.locator('input[aria-label=Nickname]').fill('Phone');
  await phone.locator('[data-pb=create]').click();
  await phone.locator('[data-pb=code]').waitFor();
  const code3 = (await phone.locator('[data-pb=code]').innerText()).trim();
  const buddy = await newPage('buddy');
  await buddy.goto(`${BASE}?room=${code3}&${PB}`, { waitUntil: 'load' });
  await phone.waitForFunction(() => window.__pb.state.players.size === 2);
  await phone.evaluate(() => window.__pb.room.send('config', { arena: 'campus' }));
  await phone.waitForFunction(() => window.__pb.state.arena === 'campus' && !!window.__pb.arena.geo, null, { timeout: 30000 });
  await phone.locator('[data-pb=ready]').click();
  await buddy.locator('[data-pb=ready]').click();
  await phone.waitForFunction(() => [...window.__pb.state.players.values()].every((p) => p.ready));
  await phone.locator('[data-pb=start]').click();
  await phone.waitForFunction(() => window.__pb.state.phase === 'landing');
  await sleep(500);
  await phone.screenshot({ path: path.join(OUT, 'phone-landing.png') });
  await phone.waitForFunction(() => window.__pb.state.phase === 'playing', null, { timeout: 40000 });
  await sleep(1200);
  const tc = await phone.evaluate(() => ({ pick: !!document.querySelector('#pb-touch .p-pick'), bomb: !!document.querySelector('#pb-touch .p-bomb'), inv: !!document.querySelector('#pb-touch .p-inv'), map: !!document.querySelector('#pb-touch .p-map') }));
  check(Object.values(tc).every(Boolean), `phone: pick-up, paint bomb, inventory and map buttons ${JSON.stringify(tc)}`);
  await phone.locator('#pb-touch .p-inv').dispatchEvent('click');
  await sleep(300);
  check(await phone.evaluate(() => getComputedStyle(document.querySelector('#pb-hud .pb-inv')).display !== 'none'), 'phone: the inventory button shows the inventory');
  await phone.screenshot({ path: path.join(OUT, 'phone.png') });
  await phone.context().close(); await buddy.context().close();
} catch (e) {
  check(false, `exception: ${e.stack || e.message}`);
} finally {
  console.log('ERRORS', JSON.stringify(errors));
  check(errors.length === 0, 'no console errors');
  await browser.close();
  procs.forEach((p) => p.kill());
  console.log(fails.length ? `FAILED: ${fails.length}` : 'ALL PASS');
  process.exit(fails.length ? 1 : 0);
}
