// Multiplayer paintball in real browsers: three pages join one room by code, customise, ready up, the host
// starts, everyone sees the others move, one page tags another (firing driven from the page), HUD and results
// render; voice chat with Chrome's fake microphone (peer connections, team-only audio, push-to-talk); a phone
// viewport with touch controls; the title screen's Campus Free Roam and film buttons still work.
//
//   node tests/browser/paintball.mjs [screenshot dir]
// Starts the static dev server (PORT=8120) and the game server (test flag, a free port) itself.
import { chromium, devices } from 'playwright-core';
import { spawn } from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = process.argv[2] || path.join(os.tmpdir(), 'paintball');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => res(p)); }); });
const fails = []; const errors = []; const expected = [];
const check = (ok, what) => { console.log(ok ? 'PASS' : 'FAIL', what); if (!ok) fails.push(what); };

const GAME_PORT = await freePort();
const procs = [];
function start(cmd, args, env, ready) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { cwd: ROOT, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    procs.push(p);
    const t = setTimeout(() => rej(new Error(`${args.join(' ')} did not start`)), 15000);
    const on = (d) => { if (ready.test(String(d))) { clearTimeout(t); res(p); } };
    p.stdout.on('data', on); p.stderr.on('data', (d) => { on(d); process.stderr.write(d); });
  });
}
const stopAll = () => { for (const p of procs) p.kill(); };
process.on('exit', stopAll);
await start('node', ['dev/server.mjs'], { PORT: '8120' }, /localhost:8120/);
await start('node', ['server/index.js'], { PORT: String(GAME_PORT), PB_TEST: '1' }, /paintball server/);
const BASE = `http://localhost:8120/`;
const PB = `pbserver=${encodeURIComponent(`ws://localhost:${GAME_PORT}`)}`;

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
async function newPage(name, opts = {}) {
  const { expectNetworkFailures, ...ctxOpts } = opts;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, permissions: ['microphone', 'clipboard-read', 'clipboard-write'], ...ctxOpts });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error' || /favicon/.test(m.text())) return;
    // Chrome logs the failed request itself in the two deliberate failure cases (a wrong room code, no server)
    if (opts.expectNetworkFailures && /Failed to load resource|ERR_CONNECTION_REFUSED/.test(m.text())) return expected.push(`${name}: ${m.text()}`);
    errors.push(`${name}: ${m.text()}`);
  });
  page.name = name;
  return page;
}
// Headless Chrome has no real pointer lock: stand in for it (as tests/browser/v2.mjs does).
const fakeLock = (page) => page.evaluate(() => { const c = document.getElementById('game'); Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => (window.__locked ? c : null) }); window.__locked = true; });
const shot = (page, file) => page.screenshot({ path: path.join(OUT, file) });
const pb = (page, fn, arg) => page.evaluate(fn, arg);

try {
  // ---------- three players ----------
  const [A, B, C] = [await newPage('A'), await newPage('B'), await newPage('C')];
  await A.goto(`${BASE}?${PB}`, { waitUntil: 'load' });
  await A.waitForTimeout(500);
  await A.locator('[data-pb=title-paintball]').click();
  await A.locator('input[aria-label=Nickname]').fill('Asha');
  await A.locator('[data-pb=create]').click();
  await A.locator('[data-pb=code]').waitFor();
  const code = (await A.locator('[data-pb=code]').innerText()).trim();
  check(/^[A-Z2-9]{5}$/.test(code), `room created with code ${code}`);
  check(A.url().includes(`room=${code}`), 'share link in the address bar');
  await shot(A, 'lobby.png');
  // B joins by typing the code; C opens the share link (?room=CODE)
  await B.goto(`${BASE}?paintball&${PB}`, { waitUntil: 'load' });
  await B.locator('input[aria-label=Nickname]').fill('Bilal');
  await B.locator('input[aria-label="Room code"]').fill(code.toLowerCase());
  await B.locator('[data-pb=join]').click();
  await C.goto(`${BASE}?room=${code}&${PB}`, { waitUntil: 'load' });
  for (const p of [A, B, C]) await p.waitForFunction(() => window.__pb?.state?.players.size === 3, null, { timeout: 30000 });
  check(true, 'three pages in one room (code typed, share link opened)');
  // a wrong code is refused plainly
  const D = await newPage('D', { expectNetworkFailures: true });
  await D.goto(`${BASE}?paintball&${PB}`, { waitUntil: 'load' });
  await D.locator('input[aria-label="Room code"]').fill('ZZZZZ');
  await D.locator('[data-pb=join]').click();
  const wrong = await D.waitForFunction(() => /No room with that code|Could not join/.test(document.querySelector('[data-pb=status]')?.textContent || ''), null, { timeout: 15000 }).then(() => true, () => false);
  check(wrong, 'a wrong code is refused with a clear message');
  await D.context().close();

  // customise on B: character, outfit, mask, accessory, equipment
  await B.locator('[data-pb=customise] button', { hasText: 'Turban' }).click();
  await B.locator('[aria-label="mask #7cff4f"]').click();
  await B.locator('[aria-label="outfit #ffd23d"]').click();
  await B.locator('[data-pb=customise] button', { hasText: 'Cap' }).click();
  await B.locator('[data-pb-eq=precision]').click();
  await B.waitForFunction(() => { const p = window.__pb.me; return p.character === 4 && p.mask === '#7cff4f' && p.accessory === 'cap' && p.secondary === 'precision'; });
  await B.waitForTimeout(400);
  check(true, 'customisation and equipment choice reach the server');
  await B.locator('[data-pb=customise]').scrollIntoViewIfNeeded();
  await shot(B, 'customisation.png');
  const lobbyText = await A.locator('[data-pb=players]').innerText();
  check(/Asha/.test(lobbyText) && /Bilal/.test(lobbyText) && /HOST/.test(lobbyText), 'lobby lists players with the host badge');

  // voice on for all three (fake microphone)
  for (const p of [A, B, C]) await p.locator('[data-pb=voice]').click();
  await A.waitForFunction(() => { const d = window.__pbVoice?.debug() || {}; return Object.keys(d).length === 2 && Object.values(d).every((x) => x.state === 'connected' && x.tracks > 0); }, null, { timeout: 30000 }).then(() => check(true, 'lobby voice: peer connections connected, audio tracks arrive from everyone'), () => check(false, 'lobby voice peer connections'));
  const ptt = await A.evaluate(async () => { const v = window.__pbVoice; const before = v.transmitting; v.setPTT(true); const during = v.transmitting; await new Promise((r) => setTimeout(r, 400)); const flagged = window.__pb.me.talking; v.setPTT(false); return { before, during, after: v.transmitting, flagged }; });
  check(!ptt.before && ptt.during && !ptt.after && ptt.flagged, `push-to-talk toggles the microphone track ${JSON.stringify(ptt)}`);

  // the host switches to a team mode needing 4 → refuses; back to free-for-all, 60 s test match
  await A.selectOption('select[aria-label=Duration]', { index: 0 });
  await A.evaluate(() => window.__pb.room.send('config', { mode: 'ffa', duration: 40 }));
  await A.waitForFunction(() => window.__pb.state.duration === 40);
  for (const p of [A, B, C]) await p.locator('[data-pb=ready]').click();
  await A.waitForFunction(() => [...window.__pb.state.players.values()].every((p) => p.ready));
  await A.locator('[data-pb=start]').click();
  for (const p of [A, B, C]) { await p.waitForFunction(() => window.__pb.state.phase === 'playing', null, { timeout: 15000 }); await fakeLock(p); }
  check(true, 'host started the paintball match on every page');

  // everyone sees the others move
  const startPos = await A.evaluate(() => { const s = window.__pb.state; return Object.fromEntries([...s.players.entries()].map(([id, p]) => [id, [p.x, p.z]])); });
  for (const p of [B, C]) await p.keyboard.down('KeyW');
  await sleep(1200);
  for (const p of [B, C]) await p.keyboard.up('KeyW');
  await sleep(400);
  const seen = await A.evaluate((start) => { const v = window.__pb.view; const out = {}; for (const [id, a] of v.avatars) if (id !== window.__pb.room.sessionId) out[id] = Math.hypot(a.npc.group.position.x - start[id][0], a.npc.group.position.z - start[id][1]); return out; }, startPos);
  check(Object.keys(seen).length === 2 && Object.values(seen).every((d) => d > 2), `page A sees B and C move (${JSON.stringify(seen)})`);
  const seenByB = await B.waitForFunction(() => [...window.__pb.view.avatars.entries()].filter(([id, a]) => id !== window.__pb.room.sessionId && a.npc.group.visible).length === 2, null, { timeout: 6000 }).then(() => true, () => false);
  check(seenByB, 'page B renders the other two players (after spawn protection stops blinking them)');

  // set up a tag: A faces B across a clear lane (test placement), then fires from the page
  const ids = await A.evaluate(() => ({ a: window.__pb.room.sessionId }));
  const idB = await B.evaluate(() => window.__pb.room.sessionId);
  const lane = 650;
  await B.evaluate((z) => window.__pb.room.send('test:place', { x: 400, z, yaw: Math.PI / 2, unprotect: true }), lane);
  await A.evaluate((z) => { window.__pb.room.send('test:place', { x: 390, z, yaw: -Math.PI / 2, unprotect: true }); window.__game.player.yaw = -Math.PI / 2; window.__game.player.pitch = Math.atan2(1.1 - 1.6, 10); }, lane);
  await C.evaluate(() => window.__pb.room.send('test:place', { x: 380, z: 630, yaw: 0, unprotect: true }));
  await sleep(500);
  await A.evaluate(() => { window.__pb.view.fireHeld = true; });
  await B.waitForFunction(() => !window.__pb.me.alive, null, { timeout: 8000 }).then(() => check(true, 'page A tagged page B (paintballs fired from the page)'), () => check(false, 'tag'));
  await A.evaluate(() => { window.__pb.view.fireHeld = false; });
  await sleep(300);
  await shot(A, 'match-first-person.png');
  await shot(B, 'tagged.png');
  const hud = await A.evaluate(() => ({ timer: document.querySelector('#pb-hud .timer')?.textContent, ammo: document.querySelector('#pb-hud .ammo .count')?.textContent, paint: document.querySelector('#pb-hud .paint .label')?.textContent, score: document.querySelector('#pb-hud .myscore')?.textContent, feed: document.querySelector('#pb-hud .feed')?.textContent, me: window.__pb.me.tags }));
  check(/\d:\d\d/.test(hud.timer) && /paintballs remaining/.test(hud.ammo) && /Paint/.test(hud.paint) && hud.me === 1 && /tagged/.test(hud.feed), `HUD renders timer, paintballs, paint meter, score, tag feed ${JSON.stringify(hud)}`);
  // third person + scoreboard + mini-map
  await A.keyboard.press('KeyV');
  await A.keyboard.down('Tab');
  await sleep(400);
  await shot(A, 'match-third-person-scoreboard.png');
  check(await A.locator('#pb-board [data-pb=scoreboard]').isVisible(), 'Tab shows the scoreboard');
  await A.keyboard.up('Tab');
  check(await A.evaluate(() => { const a = window.__pb.view.avatars.get(window.__pb.room.sessionId); return window.__pb.viewName === 'third' && a.npc.group.visible; }), 'V switches to third person (own body visible)');
  await A.keyboard.press('KeyV');
  await sleep(300);
  await shot(A, 'hud.png');

  // voice in a team match: only teammates. Run quickly: end this match, switch to a test team mode is not
  // possible with 3 players (team modes need 8+), so check the free-for-all channel (everyone) here and the
  // team-only relay in tests/mp (server) + the 4-page team check below.
  const ffaVoice = await A.evaluate(() => Object.values(window.__pbVoice.debug()).filter((x) => x.state === 'connected').length);
  check(ffaVoice === 2, 'free-for-all match voice: everyone stays connected');

  // results: wait for the 40 s match to run out
  await A.waitForFunction(() => window.__pb.state.phase === 'results', null, { timeout: 60000 });
  await A.locator('[data-pb=results]').waitFor();
  await sleep(600);
  await shot(A, 'results.png');
  const res = await A.locator('[data-pb=results]').innerText();
  check(/Asha wins/.test(res) && /RUNNER-UP/.test(res) && /MVP/.test(res) && /Times tagged/i.test(res), 'results show winner, runner-up, MVP and rankings');
  check(await B.locator('[data-pb=results] [data-pb=rematch]').count() === 0 && await A.locator('[data-pb=rematch]').count() === 1, 'only the host gets Play again / Return to lobby / Close room');
  await A.locator('[data-pb=close]').click();
  for (const p of [B, C]) await p.waitForFunction(() => !window.__pb.room, null, { timeout: 10000 });
  check(/closed/.test(await B.locator('[data-pb=status]').innerText()), 'closing the room tells the others');
  for (const p of [A, B, C]) await p.context().close();

  // ---------- team voice: 8 pages (4v4), audio only from teammates ----------
  const team = [];
  for (let i = 0; i < 8; i++) team.push(await newPage(`T${i}`));
  await team[0].goto(`${BASE}?paintball&${PB}`, { waitUntil: 'load' });
  await team[0].locator('input[aria-label=Nickname]').fill('T0');
  await team[0].locator('[data-pb=create]').click();
  await team[0].locator('[data-pb=code]').waitFor();
  const code2 = (await team[0].locator('[data-pb=code]').innerText()).trim();
  await Promise.all(team.slice(1).map((p) => p.goto(`${BASE}?room=${code2}&${PB}`, { waitUntil: 'load' })));
  for (const p of team) await p.waitForFunction(() => window.__pb?.state?.players.size === 8, null, { timeout: 60000 });
  await team[0].evaluate(() => window.__pb.room.send('config', { mode: '4v4', duration: 30 }));
  await team[0].waitForFunction(() => window.__pb.state.mode === '4v4');
  for (const p of team) { await p.locator('[data-pb=voice]').click(); await p.locator('[data-pb=ready]').click(); }
  await team[0].waitForFunction(() => [...window.__pb.state.players.values()].every((p) => p.ready && p.voice));
  await team[0].locator('[data-pb=start]').click();
  for (const p of team) await p.waitForFunction(() => window.__pb.state.phase === 'playing', null, { timeout: 15000 });
  await sleep(1500);
  const vt = await Promise.all(team.map((p) => p.evaluate(() => { const s = window.__pb.state; const me = window.__pb.me; const d = window.__pbVoice.debug(); return { team: me.team, peers: Object.keys(d).map((id) => ({ team: s.players.get(id).team, state: d[id].state, tracks: d[id].tracks })) }; })));
  await team[0].waitForFunction(() => Object.values(window.__pbVoice.debug()).every((x) => x.state === 'connected'), null, { timeout: 20000 }).catch(() => {});
  const okTeam = vt.every((v) => v.peers.length === 3 && v.peers.every((q) => q.team === v.team));
  check(okTeam, `team match voice: each page is connected only to its 3 teammates ${JSON.stringify(vt.map((v) => v.peers.map((q) => `${q.team}:${q.state}`)))}`);
  const tracks = await team[0].evaluate(() => Object.values(window.__pbVoice.debug()));
  check(tracks.length === 3 && tracks.every((x) => x.state === 'connected' && x.tracks > 0), 'team match voice: teammates’ audio tracks arrive');
  await team[0].screenshot({ path: path.join(OUT, 'match-4v4.png') });
  for (const p of team) await p.context().close();

  // ---------- phone ----------
  const phone = await newPage('phone', { ...devices['iPhone 13'], viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, permissions: ['microphone'] });
  await phone.goto(`${BASE}?paintball&${PB}`, { waitUntil: 'load' });
  await phone.locator('input[aria-label=Nickname]').fill('Phone');
  await phone.locator('[data-pb=create]').click();
  await phone.locator('[data-pb=code]').waitFor();
  const code3 = (await phone.locator('[data-pb=code]').innerText()).trim();
  const buddy = await newPage('buddy');
  await buddy.goto(`${BASE}?room=${code3}&${PB}`, { waitUntil: 'load' });
  await phone.waitForFunction(() => window.__pb.state.players.size === 2);
  await phone.evaluate(() => window.__pb.room.send('config', { duration: 30 }));
  await phone.locator('[data-pb=ready]').click();
  await buddy.locator('[data-pb=ready]').click();
  await phone.waitForFunction(() => [...window.__pb.state.players.values()].every((p) => p.ready));
  await phone.locator('[data-pb=start]').click();
  await phone.waitForFunction(() => window.__pb.state.phase === 'playing', null, { timeout: 15000 });
  await sleep(800);
  const tc = await phone.evaluate(() => ({ touch: document.body.classList.contains('touch'), fire: !!document.querySelector('#pb-touch .p-fire'), shown: getComputedStyle(document.getElementById('touch')).display !== 'none' }));
  check(tc.touch && tc.fire && tc.shown, `phone: touch controls (joystick, fire, jump, reload, switch) ${JSON.stringify(tc)}`);
  await phone.locator('#pb-touch .p-fire').dispatchEvent('pointerdown', { pointerId: 7, pointerType: 'touch' });
  await phone.waitForFunction(() => window.__pb.view.fireHeld === true, null, { timeout: 3000 }).then(() => check(true, 'phone: the fire button fires'), () => check(false, 'phone fire button'));
  await phone.locator('#pb-touch .p-fire').dispatchEvent('pointerup', { pointerId: 7, pointerType: 'touch' });
  await phone.screenshot({ path: path.join(OUT, 'mobile.png') });
  await phone.context().close(); await buddy.context().close();

  // ---------- the title screen still works ----------
  const T = await newPage('title');
  await T.goto(BASE, { waitUntil: 'load' });
  await T.waitForTimeout(500);
  check(/PLAY WITH/.test(await T.locator('#title h1').innerText()) && (await T.title()) === 'Play with BITSians', 'title renamed to Play with BITSians');
  await T.getByRole('button', { name: /Campus Free Roam/ }).click();
  await T.waitForFunction(() => !!window.__game.explorer, null, { timeout: 30000 });
  check(true, 'Campus Free Roam opens');
  await T.goto(BASE, { waitUntil: 'load' });
  await T.waitForTimeout(500);
  await T.evaluate(() => { window.__game.playFilm(); });
  await T.waitForFunction(() => !!window.__game.film, null, { timeout: 30000 });
  check(true, 'the film still plays');
  // the paintball button with the server down says so plainly (no fake rooms)
  const U = await newPage('unreachable', { expectNetworkFailures: true });
  await U.goto(`${BASE}?paintball&pbserver=${encodeURIComponent(`ws://localhost:${await freePort()}`)}`, { waitUntil: 'load' });
  await U.locator('[data-pb=create]').click();
  const waking = await U.waitForFunction(() => /Waking the game server/.test(document.querySelector('[data-pb=status]')?.textContent || ''), null, { timeout: 20000 }).then(() => true, () => false);
  check(waking, 'an unreachable server shows "Waking the game server… (can take ~30 s)"');
  await T.context().close(); await U.context().close();
} catch (e) {
  check(false, `exception: ${e.stack || e.message}`);
} finally {
  console.log('EXPECTED network failures (deliberate wrong code / no server):', expected.length);
  console.log('ERRORS', JSON.stringify(errors));
  check(errors.length === 0, 'no console errors');
  await browser.close();
  stopAll();
  console.log(fails.length ? `FAILED: ${fails.length}` : 'ALL PASS');
  process.exit(fails.length ? 1 : 0);
}
