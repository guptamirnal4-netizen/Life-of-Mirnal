// Bots in a real browser: from the portal's PLAY VS BOTS, a single page plays on the Med-C Ground and on the Whole
// Campus against bots (bots visible, moving, firing, a tag happens, results with 🤖 badges), then the lobby's
// add / fill / remove bots flow.
//
//   node tests/browser/paintball-bots.mjs [screenshot dir]
// Starts the static dev server and the game server (test flag) itself.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = process.argv[2] || path.join(os.tmpdir(), 'paintball-bots');
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
  await ctx.addInitScript(() => { try { localStorage.setItem('pwb-intro-seen', 'true'); } catch { /* */ } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(`${name}: ${m.text()}`); });
  return page;
}
const shot = (page, file) => page.screenshot({ path: path.join(OUT, file) });
const send = (page, type, msg) => page.evaluate(([t, m]) => window.__pb.room.send(t, m), [type, msg]);
const portalUp = (page) => page.waitForFunction(() => window.__game?.mode === 'title' && window.__game.portal?.visible, null, { timeout: 30000 });
// watch the match from the page's side: shots by bots, tags, bot positions over time
const watch = (page) => page.evaluate(() => {
  clearInterval(window.__botwatch?.timer);
  const w = window.__botwatch = { shots: 0, tags: [], moved: new Set(), start: new Map() };
  const R = window.__pb.room;
  R.onMessage('shot', (m) => { if (window.__pb?.state?.players.get(m.o)?.bot) w.shots++; });
  R.onMessage('tag', (m) => w.tags.push(m));
  w.timer = setInterval(() => { if (!window.__pb?.state) return; for (const [id, p] of window.__pb.state.players) { if (!p.bot || !p.alive) continue; const s = w.start.get(id); if (!s) w.start.set(id, { x: p.x, z: p.z }); else if (Math.hypot(p.x - s.x, p.z - s.z) > 3) w.moved.add(id); } }, 200);
});
const watched = (page) => page.evaluate(() => { const w = window.__botwatch; return { shots: w.shots, tags: w.tags.length, byBot: w.tags.filter((t) => window.__pb.state.players.get(t.by)?.bot).length, moved: w.moved.size }; });
// bot avatars drawn in the 3D scene right now
const botsDrawn = (page) => page.evaluate(() => { const v = window.__pb.view; let n = 0; for (const [id, a] of v.avatars) if (window.__pb.state.players.get(id)?.bot && a.npc.group.visible) n++; return n; });
// look at the nearest bot (for the screenshot)
const lookAtBot = (page) => page.evaluate(() => {
  const me = window.__pb.me; let best = null; let bd = 1e9;
  for (const p of window.__pb.state.players.values()) if (p.bot && p.alive && !p.out) { const d = Math.hypot(p.x - me.x, p.z - me.z); if (d < bd) { bd = d; best = p; } }
  if (best) { window.__game.player.yaw = Math.atan2(-(best.x - me.x), -(best.z - me.z)); window.__game.player.pitch = -0.05; }
  return best ? Math.round(bd) : -1;
});
// for the screenshot: stand 7 m from the nearest bot (on its side towards us) and look at it
async function closeUp(page) {
  const t = await page.evaluate(() => {
    const me = window.__pb.me; let best = null; let bd = 1e9;
    for (const p of window.__pb.state.players.values()) if (p.bot && p.alive && !p.out) { const d = Math.hypot(p.x - me.x, p.z - me.z); if (d < bd) { bd = d; best = p; } }
    if (!best) return null;
    const k = 7 / (bd || 1); return { x: best.x + (me.x - best.x) * k, z: best.z + (me.z - best.z) * k, bx: best.x, bz: best.z };
  });
  if (!t) return;
  await send(page, 'test:place', { x: t.x, z: t.z, unprotect: false });
  await page.evaluate((t) => { window.__pb.view.placed = false; window.__game.player.yaw = Math.atan2(-(t.bx - t.x), -(t.bz - t.z)); window.__game.player.pitch = -0.08; }, t);
  await sleep(500);
  await lookAtBot(page);
  await sleep(250);
}
async function playVsBots(page, { arena, bots, level }) {
  await page.locator('[data-portal=bots]').click();
  await page.locator('[data-sheet=bots]').waitFor();
  await page.locator(`[data-bots="arena-${arena}"]`).click();
  await page.locator('[data-bots="mode-ffa"]').click();
  await page.evaluate((n) => { const i = document.querySelector('[data-bots=count]'); i.value = String(n); i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); }, bots);
  await page.locator(`[data-bots="level-${level}"]`).click();
  await shot(page, `portal-bots-${arena}.png`);
  await page.locator('[data-portal=bots-go]').click();
  await page.waitForFunction(() => window.__pb?.state?.phase && window.__pb.state.phase !== 'lobby', null, { timeout: 60000 });
}

try {
  const A = await newPage('A');
  await A.goto(`${BASE}?${PB}`, { waitUntil: 'load' });
  await portalUp(A);
  check(await A.locator('.p-menu [data-portal=bots]').isVisible(), 'portal: PLAY VS BOTS is a primary entry');
  check(/PLAY VS BOTS/.test(await A.locator('[data-portal=bots]').innerText()), 'portal: its label');
  await shot(A, 'portal.png');

  // ---------- Med-C Ground ----------
  await playVsBots(A, { arena: 'medc', bots: 5, level: 'hard' });
  const st = await A.evaluate(() => { const s = window.__pb.state; return { n: s.players.size, bots: [...s.players.values()].filter((p) => p.bot).length, practice: s.practice, level: s.botLevel, arena: s.arena, phase: s.phase }; });
  check(st.n === 6 && st.bots === 5 && st.practice && st.level === 'hard' && st.arena === 'medc', `Med-C: a private match with 5 Hard bots started straight away (${JSON.stringify(st)})`);
  await A.waitForFunction(() => window.__pb.state.phase === 'playing', null, { timeout: 15000 });
  await watch(A);
  // stay out of the way: behind the north-west corner so the bots fight each other (and come for us)
  await A.waitForFunction(() => !!window.__pb.hud);
  let t0 = Date.now();
  while (Date.now() - t0 < 40000) { const w = await watched(A); if (w.tags >= 2 && w.moved >= 3 && w.shots > 10) break; await sleep(500); }
  const w1 = await watched(A);
  check(w1.moved >= 3, `Med-C: bots move (${w1.moved} of 5 moved)`);
  check(w1.shots > 10, `Med-C: bots fire (${w1.shots} paintballs)`);
  check(w1.tags >= 1, `Med-C: a tag happens (${w1.tags} tags, ${w1.byBot} by bots)`);
  const d1 = await lookAtBot(A); await sleep(700);
  const drawn1 = await botsDrawn(A);
  check(drawn1 >= 1, `Med-C: bot avatars are drawn (${drawn1}, nearest ${d1} m)`);
  check(await A.evaluate(() => [...document.querySelectorAll('#pb-hud .feed div')].some((d) => d.textContent.includes('🤖'))) || w1.tags === 0, 'Med-C: the tag feed shows 🤖 on bots');
  await closeUp(A);
  await shot(A, 'medc-match.png');
  await A.keyboard.down('Tab'); await sleep(250);
  check((await A.locator('#pb-board .pb-bot').count()) === 5, 'Med-C: the scoreboard marks the 5 bots with 🤖');
  await shot(A, 'medc-scoreboard.png');
  await A.keyboard.up('Tab');
  await send(A, 'test:end', {});
  await A.locator('[data-pb=results]').waitFor({ timeout: 15000 });
  await sleep(600);
  check((await A.locator('[data-pb=results] .pb-bot').count()) === 5, 'Med-C: results list the bots with 🤖 badges');
  check(await A.locator('[data-pb=rematch]').isVisible(), 'Med-C: Play again is offered (it keeps the bots)');
  await shot(A, 'medc-results.png');
  await A.locator('[data-pb=leave]').click();
  await portalUp(A);
  check(true, 'leaving goes back to the portal');

  // ---------- Whole Campus · Campus Royale ----------
  await playVsBots(A, { arena: 'campus', bots: 5, level: 'hard' });
  await A.waitForFunction(() => window.__pb.state.phase === 'landing', null, { timeout: 20000 });
  check(await A.evaluate(() => window.__pb.state.arena === 'campus' && [...window.__pb.state.players.values()].filter((p) => p.bot).length === 5), 'campus: 5 bots in a Campus Royale practice match');
  await A.waitForFunction(() => window.__pb.state.phase === 'playing', null, { timeout: 60000 });
  check(await A.evaluate(() => [...window.__pb.state.players.values()].filter((p) => p.bot && p.drop >= 0).length === 5), 'campus: every bot landed on a landing spot');
  await A.waitForFunction(() => !!window.__pb.arena.geo, null, { timeout: 30000 });
  await watch(A);
  // bring everyone to the Med-C cricket ground (test helpers) and pin a small paint zone there so they meet
  const MC = { x: 395, z: 650 };
  await send(A, 'test:place', { x: MC.x - 30, z: MC.z - 25, unprotect: true });
  const ids = await A.evaluate(() => [...window.__pb.state.players.entries()].filter(([, p]) => p.bot).map(([id]) => id));
  for (const [i, id] of ids.entries()) await send(A, 'test:place', { id, x: MC.x + Math.cos(i * 1.3) * 14, z: MC.z + Math.sin(i * 1.3) * 10, unprotect: true });
  await send(A, 'test:zone', { x: MC.x, z: MC.z, r: 45, dps: 2 });
  t0 = Date.now();
  while (Date.now() - t0 < 60000) { const w = await watched(A); if (w.tags >= 1 && w.moved >= 3 && w.shots > 5) break; await sleep(500); }
  const w2 = await watched(A);
  check(w2.moved >= 3, `campus: bots move (${w2.moved} moved)`);
  check(w2.shots > 5, `campus: bots fire (${w2.shots} paintballs)`);
  check(w2.tags >= 1, `campus: a tag happens (${w2.tags} tags, ${w2.byBot} by bots)`);
  const d2 = await lookAtBot(A); await sleep(900);
  check((await botsDrawn(A)) >= 1, `campus: bot avatars are drawn (nearest ${d2} m)`);
  await closeUp(A);
  await shot(A, 'campus-match.png');
  await send(A, 'test:end', {});
  await A.locator('[data-pb=results]').waitFor({ timeout: 20000 });
  await sleep(600);
  check((await A.locator('[data-pb=results] .pb-bot').count()) === 5, 'campus: results list the bots with 🤖 badges');
  check(await A.locator('[data-pb=royale-result]').isVisible(), 'campus: Campus Royale results (placement)');
  await shot(A, 'campus-results.png');
  await A.locator('[data-pb=leave]').click();
  await portalUp(A);

  // ---------- the lobby: add / fill / remove bots ----------
  await A.locator('[data-portal=create]').click();
  await A.locator('[data-pb=code]').waitFor();
  await A.locator('[data-pb=bot-add]').click();
  await A.waitForFunction(() => [...window.__pb.state.players.values()].filter((p) => p.bot).length === 1);
  check((await A.locator('[data-pb=players] .pb-badge.bot').count()) === 1, 'lobby: Add bot adds one, marked 🤖 BOT');
  await A.selectOption('select[aria-label="Bot difficulty"]', 'easy');
  await A.waitForFunction(() => window.__pb.state.botLevel === 'easy');
  check(true, 'lobby: the host sets the bots’ difficulty');
  await A.locator('[data-pb=bot-fill]').click();
  await A.waitForFunction(() => window.__pb.state.players.size === 12);
  check(true, 'lobby: Fill empty slots with bots fills the room to 12');
  await A.locator('[data-pb=bot-remove]').first().click();
  await A.waitForFunction(() => window.__pb.state.players.size === 11);
  check(true, 'lobby: ✕ removes a bot');
  await A.selectOption('select[aria-label=Mode]', '4v4');
  await A.waitForFunction(() => window.__pb.state.mode === '4v4' && window.__pb.state.players.size === 8);
  check(true, 'lobby: switching to 4v4 keeps 8 (bots trimmed)');
  await sleep(400);
  await shot(A, 'lobby-bots.png');
  await A.locator('[data-pb=ready]').click();
  await A.waitForFunction(() => !document.querySelector('[data-pb=start]')?.disabled);
  await A.locator('[data-pb=start]').click();
  await A.waitForFunction(() => window.__pb.state.phase === 'playing', null, { timeout: 20000 });
  check(true, 'lobby: a 4v4 with bots filling both teams starts');
  await sleep(1500);
  await shot(A, 'lobby-4v4-match.png');
  check(!errors.length, `no page errors${errors.length ? `: ${errors.slice(0, 5).join(' | ')}` : ''}`);
} catch (e) {
  console.log('FAIL', e.stack || e.message); fails.push(e.message);
} finally {
  await browser.close();
  console.log(`\n${fails.length ? `FAILED: ${fails.length}` : 'all passed'} · screenshots in ${OUT}`);
  process.exit(fails.length ? 1 : 0);
}
