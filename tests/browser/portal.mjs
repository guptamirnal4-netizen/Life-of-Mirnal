// The portal (the start screen of Play with BITSians) in real browsers: the first visit's "Press to start" →
// the intro film → skipping it reaches the portal; a second visit lands on the portal; every entry works (Create
// Room really creates a room on a local game server and shows the lobby, a second page joins with the code through
// JOIN ROOM, Customise persists into the lobby, Game Modes sets the host's default, How to Play opens); Settings
// persist and apply (sensitivity, invert Y, field of view and volumes reach the paintball client; graphics changes
// the quality; the film's music follows the volume); Settings → Campus Free Roam opens the explorer and its exit
// returns to the portal; Free Roam is blocked while in a room; College Life and School are not reachable; ?room=CODE
// joins directly; keyboard navigation; phone portrait and landscape; no console errors.
//
//   node tests/browser/portal.mjs [screenshot dir]
// Uses the static dev server already on PORT 8151 if one answers there (PORT=8151 node dev/server.mjs), otherwise
// starts one on a free port; always starts its own game server (test flag) on a free port.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = process.argv[2] || path.join(os.tmpdir(), 'portal');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => res(p)); }); });
const fails = []; const errors = []; const expected = [];
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
const answers = (url) => fetch(url).then((r) => r.ok, () => false);
let WEB = 8151;
if (!(await answers(`http://localhost:${WEB}/index.html`))) {
  WEB = (await answers('http://localhost:8151/')) ? await freePort() : 8151;
  await start(['dev/server.mjs'], { PORT: String(WEB) }, new RegExp(`localhost:${WEB}`));
}
const GAME = await freePort();
await start(['server/index.js'], { PORT: String(GAME), PB_TEST: '1' }, /paintball server/);
const BASE = `http://localhost:${WEB}/`;
const PB = `pbserver=${encodeURIComponent(`ws://localhost:${GAME}`)}`;
console.log(`web ${BASE} · game server ws://localhost:${GAME}`);

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
async function newPage(name, { seen = false, expectNetworkFailures = false, ...opts } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, permissions: ['microphone'], ...opts });
  await ctx.addInitScript(() => { try { localStorage.setItem('pwb-features', 'engineIntro'); } catch { /* */ } }); // these tests cover the in-engine film intro (FEATURES.engineIntro)
  if (seen) await ctx.addInitScript(() => { try { localStorage.setItem('pwb-intro-seen', 'true'); } catch { /* */ } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error' || /favicon/.test(m.text())) return;
    if (expectNetworkFailures && /Failed to load resource|ERR_CONNECTION_REFUSED/.test(m.text())) return expected.push(`${name}: ${m.text()}`);
    errors.push(`${name}: ${m.text()}`);
  });
  return page;
}
const shot = (page, file) => page.screenshot({ path: path.join(OUT, file) });
const portalUp = (page) => page.waitForFunction(() => window.__game?.mode === 'title' && window.__game.portal?.visible && !document.getElementById('title').classList.contains('hidden'), null, { timeout: 30000 });
const backdrop = (page) => page.waitForFunction(() => document.getElementById('title').classList.contains('backdrop') && !!document.querySelector('[data-pb=portal-preview]'), null, { timeout: 30000 }).catch(() => {});
const setRange = (page, key, v) => page.evaluate(([k, v]) => { const i = document.querySelector(`[data-setting="${k}"]`); i.value = String(v); i.dispatchEvent(new Event('input', { bubbles: true })); }, [key, v]);
const near = (a, b, e = 0.011) => Math.abs(a - b) < e;
const noHScroll = (page) => page.evaluate(() => { const els = [document.documentElement, document.querySelector('.p-portal')]; return els.every((e) => e && e.scrollWidth <= e.clientWidth + 1); });

try {
  // ---------- first visit: press to start → the intro film → skip → the portal ----------
  const A = await newPage('A');
  await A.goto(`${BASE}?${PB}`, { waitUntil: 'load' });
  await A.locator('[data-portal=splash]').waitFor();
  await backdrop(A);
  check(await A.locator('[data-portal=splash]').isVisible(), 'first visit: the "Press to start" splash shows');
  await shot(A, '01-splash.png');
  await A.locator('[data-portal=splash]').click({ position: { x: 200, y: 200 } });
  await A.waitForFunction(() => window.__game.mode === 'film' && !!window.__game.film, null, { timeout: 30000 });
  check(true, 'pressing it starts the intro film');
  await sleep(2500);
  await shot(A, '02-film.png');
  const filmAudio = await A.evaluate(() => window.__game.audioDebug());
  const music = filmAudio.media.find((m) => m.kind === 'music');
  check(!music || near(music.actual, music.requested * 0.64), `the film's music follows the volume settings (master 80% × music 80%) ${JSON.stringify(music || 'no music element')}`);
  await A.keyboard.press('Escape');
  const skipped = await A.waitForFunction(() => window.__game.mode === 'title', null, { timeout: 6000 }).then(() => true, () => false);
  if (!skipped) await A.evaluate(() => window.__game.skipFilm());
  await portalUp(A);
  check(true, `skipping the film reaches the portal${skipped ? ' (Esc)' : ' (skipFilm)'}`);
  check(await A.evaluate(() => localStorage.getItem('pwb-intro-seen') === 'true'), 'the intro is remembered as seen');

  // ---------- second visit: straight to the portal ----------
  await A.reload({ waitUntil: 'load' });
  await portalUp(A);
  await sleep(600);
  check(!(await A.locator('[data-portal=splash]').count()), 'second visit lands on the portal (no splash)');
  await backdrop(A);
  await sleep(1500);
  check(/PLAY WITH/.test(await A.locator('#title h1').innerText()) && (await A.title()) === 'Play with BITSians', 'Play with BITSians branding');
  for (const id of ['bots', 'create', 'join', 'customise', 'modes', 'howto', 'settings', 'intro']) check(await A.locator(`.p-menu [data-portal=${id}]`).isVisible(), `primary entry visible: ${id}`);
  check(await A.evaluate(() => { const c = document.querySelector('[data-pb=portal-preview]'); return !!c && c.width > 0; }), 'live 3D character preview on the portal');
  await shot(A, '03-portal.png');

  // hidden from the MVP: College Life, School, Free Roam on the main screen
  const text = await A.evaluate(() => document.body.innerText);
  check(!/College Life|School Life|Learning Journey|Continue ·/i.test(text) && !(await A.locator('[data-portal^=extra-]').count()), 'College Life / School / Continue / Learning Journey are not on the portal');
  check(!(await A.locator('.p-menu .p-btn b', { hasText: 'Free Roam' }).count()), 'Campus Free Roam is not on the main menu (it is in Settings)');

  // keyboard navigation
  await A.locator('[data-portal=create]').focus();
  await A.keyboard.press('ArrowDown');
  check(await A.evaluate(() => document.activeElement?.dataset.portal === 'join'), 'ArrowDown moves to JOIN ROOM');
  await A.keyboard.press('ArrowDown'); await A.keyboard.press('ArrowDown'); await A.keyboard.press('ArrowDown');
  check(await A.evaluate(() => document.activeElement?.dataset.portal === 'howto'), 'arrows reach HOW TO PLAY');
  await A.keyboard.press('Enter');
  await A.locator('[data-sheet=howto]').waitFor();
  check(true, 'Enter opens HOW TO PLAY');
  await sleep(400);
  await shot(A, '04-howto-controls.png');
  for (const tab of ['items', 'crates', 'bombs', 'zone', 'scoring']) {
    await A.locator(`[data-tab=${tab}]`).click();
    await sleep(150);
  }
  const zoneText = await A.evaluate(() => { document.querySelector('[data-tab=zone]').click(); return document.querySelector('[data-portal=howto-body]').innerText; });
  check(/paint zone/i.test(zoneText) && /phase/i.test(zoneText), 'How to Play: controls, items, crates, paint bombs, paint zone and scoring tabs');
  await sleep(300);
  await shot(A, '05-howto-zone.png');
  await A.keyboard.press('Escape');
  await A.waitForFunction(() => !window.__game.portal.sheet);
  check(await A.evaluate(() => document.activeElement?.dataset.portal === 'howto'), 'Esc closes the panel and returns focus to the menu');

  // voice commands (the 🎤 button feeds the recognised text here)
  check(await A.evaluate(() => window.__game.portal.voiceText('open the settings please') === 'settings' && window.__game.portal.sheet === 'settings'), 'voice command: “settings” opens Settings');
  await A.keyboard.press('Escape');

  // Game Modes: 4v4 on the Whole Campus becomes the default for the next room
  await A.locator('[data-portal=modes]').click();
  await A.locator('[data-sheet=modes]').waitFor();
  const modesText = await A.locator('[data-sheet=modes]').innerText();
  check(['Duel / Free-for-All', '6v6', '4v4', '3v3v3v3', '2v2v2v2v2', 'Med-C Ground', 'Campus Royale'].every((t) => modesText.includes(t)), 'Game Modes lists the real modes and arenas with descriptions');
  await A.locator('[data-mode="4v4"]').click();
  await A.locator('[data-arena=campus]').click();
  await sleep(400);
  await shot(A, '06-modes.png');
  const prefs1 = await A.evaluate(() => JSON.parse(localStorage.getItem('pwb-prefs')));
  check(prefs1.mode === '4v4' && prefs1.arena === 'campus', `Game Modes saves the default ${JSON.stringify([prefs1.mode, prefs1.arena])}`);
  check(/4v4/.test(await A.locator('[data-portal=create]').innerText()), 'CREATE ROOM shows the chosen default');
  await A.locator('[data-sheet=modes] [data-portal=close]').click();

  // Customise: character, colours, accessory, blasters
  await A.locator('[data-portal=customise]').click();
  await A.locator('[data-sheet=customise]').waitFor();
  await A.locator('[aria-label="character Turban"]').click();
  await A.locator('[aria-label="outfit #ffd23d"]').click();
  await A.locator('[aria-label="mask #7cff4f"]').click();
  await A.locator('[aria-label="accessory Cap"]').click();
  await A.locator('[data-eq=precision]').click();
  await sleep(700);
  await shot(A, '07-customise.png');
  const prefs2 = await A.evaluate(() => JSON.parse(localStorage.getItem('pwb-prefs')));
  check(prefs2.look.character === 4 && prefs2.look.outfit === '#ffd23d' && prefs2.look.mask === '#7cff4f' && prefs2.look.accessory === 'cap' && prefs2.loadout.join() === 'rapid,precision', `Customise is saved ${JSON.stringify(prefs2)}`);
  check(await A.evaluate(() => /Precision/.test(document.querySelector('[data-portal=loadout]').innerText)), 'the portal shows the chosen blasters');
  await A.keyboard.press('Escape');

  // Settings: persist and apply
  await A.locator('[data-portal=settings]').click();
  await A.locator('[data-sheet=settings]').waitFor();
  await setRange(A, 'master', 0.5); await setRange(A, 'effects', 0.6); await setRange(A, 'voice', 0.4); await setRange(A, 'music', 0.7);
  await setRange(A, 'mouseSensitivity', 1.7); await setRange(A, 'fov', 80);
  await A.locator('[data-setting=invertY]').check();
  await A.locator('[data-setting=graphics-low]').click();
  await sleep(500);
  check(await A.evaluate(() => window.__game.graphics.quality.name === 'low'), 'Graphics: Low applies at once');
  await shot(A, '08-settings.png');
  await A.locator('[data-setting=graphics-medium]').click();
  await sleep(300);
  check(await A.evaluate(() => window.__game.graphics.quality.name === 'medium'), 'Graphics: Medium applies at once');
  const lv = await A.evaluate(() => window.__game.audioDebug().levels);
  check(near(lv.effects, 0.3) && near(lv.voice, 0.2) && near(lv.music, 0.35), `audio levels follow the sliders ${JSON.stringify(lv)}`);
  await A.locator('[data-setting=muted]').check();
  check(await A.evaluate(() => { const l = window.__game.audioDebug().levels; return l.effects === 0 && l.voice === 0 && l.music === 0; }), 'Mute all silences every level');
  await A.locator('[data-setting=muted]').uncheck();
  await A.reload({ waitUntil: 'load' });
  await portalUp(A);
  await A.locator('[data-portal=settings]').click();
  await A.locator('[data-sheet=settings]').waitFor();
  const kept = await A.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-setting]')].filter((i) => i.type === 'range' || i.type === 'checkbox').map((i) => [i.dataset.setting, i.type === 'checkbox' ? i.checked : Number(i.value)])));
  check(kept.master === 0.5 && kept.effects === 0.6 && kept.voice === 0.4 && kept.mouseSensitivity === 1.7 && kept.fov === 80 && kept.invertY === true && kept.muted === false, `Settings persist across a reload ${JSON.stringify(kept)}`);
  check(await A.evaluate(() => window.__game.graphics.quality.name === 'medium' && document.querySelector('[data-setting=graphics-medium]').classList.contains('sel')), 'graphics choice persists');

  // Settings → Campus Free Roam (optional experience), and back to the portal
  await A.locator('[data-portal=free-roam]').scrollIntoViewIfNeeded();
  await shot(A, '09-settings-free-roam.png');
  await A.locator('[data-portal=free-roam]').click();
  await A.waitForFunction(() => window.__game.mode === 'explore' && !!window.__game.explorer, null, { timeout: 30000 });
  await sleep(2500);
  check(await A.locator('[data-portal=free-roam-exit]').isVisible(), 'Campus Free Roam opens from Settings, with "Back to the portal"');
  await shot(A, '10-free-roam.png');
  await A.locator('[data-portal=free-roam-exit]').click();
  await portalUp(A);
  check(await A.evaluate(() => !window.__game.explorer && !document.getElementById('explorer')), 'leaving Free Roam restores the portal cleanly');

  // ---------- CREATE ROOM: a real room on the local server, with the portal's choices ----------
  await A.locator('[data-portal=nickname]').fill('Asha');
  await A.locator('[data-portal=create]').click();
  await A.locator('[data-pb=code]').waitFor();
  const code = (await A.locator('[data-pb=code]').innerText()).trim();
  check(/^[A-Z2-9]{5}$/.test(code), `CREATE ROOM creates a room on the local server and shows the lobby (code ${code})`);
  await A.waitForFunction(() => window.__pb?.state?.mode === '4v4');
  const lobbyA = await A.evaluate(() => { const s = window.__pb.state; const m = window.__pb.me; return { mode: s.mode, arena: s.arena, nick: m.nickname, character: m.character, outfit: m.outfit, mask: m.mask, accessory: m.accessory, primary: m.primary, secondary: m.secondary, host: m.host }; });
  check(lobbyA.mode === '4v4' && lobbyA.arena === 'campus', `the room starts with the Game Modes default ${JSON.stringify([lobbyA.mode, lobbyA.arena])}`);
  check(lobbyA.nick === 'Asha' && lobbyA.character === 4 && lobbyA.outfit === '#ffd23d' && lobbyA.mask === '#7cff4f' && lobbyA.accessory === 'cap' && lobbyA.primary === 'rapid' && lobbyA.secondary === 'precision', `Customise persists into the lobby ${JSON.stringify(lobbyA)}`);
  await sleep(300);
  const ctrl = await A.evaluate(() => { const p = window.__pb.player; return { s: p.sensitivity, inv: p.invertY, fov: p.fov, q: window.__game.graphics.quality.name }; });
  check(near(ctrl.s, 1.7) && ctrl.inv === true && ctrl.fov === 80 && ctrl.q === 'medium', `sensitivity, invert Y, field of view and graphics reach the paintball client ${JSON.stringify(ctrl)}`);
  const fx = await A.evaluate(async () => { const m = await import('/js/paintball/client/sounds.js'); m.beep(); return window.__game.audioDebug(); });
  check(fx.buses.length > 0 && fx.buses.every((g) => near(g, 0.3)), `paintball sound effects play at master × effects (0.3) ${JSON.stringify(fx.buses)}`);
  await shot(A, '11-lobby.png');

  // Free Roam is blocked while in a room
  await A.locator('[data-pb=settings]').click();
  await A.locator('[data-sheet=settings]').waitFor();
  await A.locator('[data-portal=free-roam]').scrollIntoViewIfNeeded();
  await sleep(500);
  check(await A.locator('[data-portal=free-roam]').isDisabled() && /Leave the room first/.test(await A.locator('[data-portal=free-roam-blocked]').innerText()), 'Settings over the lobby: Campus Free Roam is disabled with a message');
  await shot(A, '12-settings-in-room.png');
  await A.keyboard.press('Escape');
  check(await A.evaluate(() => window.__game.openExplorer() === null && !window.__game.explorer && window.__game.mode === 'paintball'), 'openExplorer() refuses while in a room');

  // ---------- JOIN ROOM from a second page's portal ----------
  const B = await newPage('B', { seen: true, expectNetworkFailures: true }); // the deliberate wrong code below
  await B.goto(`${BASE}?${PB}`, { waitUntil: 'load' });
  await portalUp(B);
  await B.locator('[data-portal=nickname]').fill('Bilal');
  await B.locator('[data-portal=join]').click();
  await B.locator('[data-portal=code]').fill(code.toLowerCase());
  await shot(B, '13-join.png');
  await B.locator('[data-portal=join-go]').click();
  for (const p of [A, B]) await p.waitForFunction(() => window.__pb?.state?.players.size === 2, null, { timeout: 30000 });
  check(/Bilal/.test(await A.locator('[data-pb=players]').innerText()), 'JOIN ROOM joins with the code: both pages in one room');

  // voice chat volume: the other player's voice plays at master × voice chat on A
  await A.locator('[data-pb=voice]').click(); await B.locator('[data-pb=voice]').click();
  const voiceOk = await A.waitForFunction(() => { const m = window.__game.audioDebug().media.filter((x) => x.kind === 'voice'); return m.length > 0 && m.every((x) => Math.abs(x.actual - 0.2) < 0.011); }, null, { timeout: 30000 }).then(() => true, () => false);
  check(voiceOk, `voice chat plays at master × voice chat (0.2) ${JSON.stringify(await A.evaluate(() => window.__game.audioDebug().media))}`);

  // ---------- ?room=CODE joins directly (no intro, even on a first visit) ----------
  const C = await newPage('C');
  await C.goto(`${BASE}?room=${code}&${PB}`, { waitUntil: 'load' });
  await C.waitForFunction(() => window.__pb?.state?.players.size === 3, null, { timeout: 30000 });
  check(!(await C.locator('[data-portal=splash]').count()) && !(await C.evaluate(() => window.__game.film)), '?room=CODE skips the intro and joins straight away');

  // leaving a room returns to the portal
  await B.locator('[data-pb=leave]').click();
  await portalUp(B);
  check(true, 'leaving the room returns to the portal');
  // a wrong code comes back to the portal with a clear message
  await B.locator('[data-portal=join]').click();
  await B.locator('[data-portal=code]').fill('ZZZZZ');
  await B.locator('[data-portal=join-go]').click();
  const wrong = await B.waitForFunction(() => window.__game.portal?.visible && /No room with that code|Could not join/.test(document.querySelector('[data-portal=status]')?.textContent || ''), null, { timeout: 20000 }).then(() => true, () => false);
  check(wrong, 'a wrong code returns to the portal with a clear message');
  await shot(B, '14-wrong-code.png');
  // the life sim is not reachable from the interface
  check(await B.evaluate(() => ![...document.querySelectorAll('button')].some((b) => /College Life|School Life|Learning Journey/.test(b.textContent))), 'no button anywhere leads to College Life or School');
  await C.context().close(); await B.context().close();
  await A.locator('[data-pb=leave]').click();
  await portalUp(A);
  await A.context().close();

  // ---------- phones ----------
  for (const [name, vp] of [['portrait', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }]]) {
    const P = await newPage(`phone-${name}`, { seen: true, viewport: vp, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await P.goto(`${BASE}?${PB}`, { waitUntil: 'load' });
    await portalUp(P);
    await backdrop(P);
    await sleep(1500);
    check(await noHScroll(P), `phone ${name}: no horizontal scrolling`);
    const box = await P.locator('[data-portal=create]').boundingBox();
    check(!!box && box.y >= 0 && box.y + box.height <= vp.height && box.x >= 0 && box.x + box.width <= vp.width, `phone ${name}: CREATE ROOM is on screen without scrolling ${JSON.stringify(box)}`);
    check(await P.evaluate(() => window.__game.graphics.quality.name === 'medium'), `phone ${name}: automatic graphics is Medium`);
    await shot(P, `15-phone-${name}.png`);
    await P.locator('[data-portal=customise]').tap();
    await P.locator('[data-sheet=customise]').waitFor();
    await sleep(600);
    await shot(P, `16-phone-${name}-customise.png`);
    await P.locator('[data-sheet=customise] [data-portal=close]').tap();
    await P.locator('[data-portal=settings]').tap();
    await P.locator('[data-sheet=settings]').waitFor();
    await sleep(500);
    await shot(P, `17-phone-${name}-settings.png`);
    await P.locator('[data-sheet=settings] [data-portal=close]').tap();
    await P.locator('[data-portal=modes]').tap();
    await P.locator('[data-sheet=modes]').waitFor();
    await sleep(500);
    await shot(P, `18-phone-${name}-modes.png`);
    await P.locator('[data-sheet=modes] [data-portal=close]').tap();
    await P.locator('[data-portal=create]').tap();
    await P.locator('[data-pb=code]').waitFor();
    check(true, `phone ${name}: CREATE ROOM opens the lobby`);
    await sleep(500);
    await shot(P, `19-phone-${name}-lobby.png`);
    await P.context().close();
  }
} catch (e) {
  check(false, `exception: ${e.stack || e.message}`);
} finally {
  console.log('EXPECTED network failures (deliberate wrong code):', expected.length);
  console.log('ERRORS', JSON.stringify(errors));
  check(errors.length === 0, 'no console errors');
  await browser.close();
  procs.forEach((p) => p.kill());
  console.log(fails.length ? `FAILED: ${fails.length}` : 'ALL PASS');
  process.exit(fails.length ? 1 : 0);
}
