// V2.1 check with real keyboard input: clock speed, Z fast-forward, pause, walk/run/cycle, no riding indoors.
import { chromium } from 'playwright-core';
const OUT = process.argv[2] || '.';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(15000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const log = (...a) => console.log(...a);
const fails = [];
const check = (ok, what) => { log(ok ? 'PASS' : 'FAIL', what); if (!ok) fails.push(what); };

// College Life is hidden behind FEATURES.collegeLife (js/features.js); switch it on and skip the first-visit intro

await page.addInitScript(() => { try { localStorage.setItem('pwb-features', 'collegeLife'); localStorage.setItem('pwb-intro-seen', 'true'); } catch { /* */ } });

await page.goto('http://localhost:8080/', { waitUntil: 'load' });
await page.waitForTimeout(800);
// Headless Chrome has no real pointer lock, so stand in for it: __locked = "the player clicked into the game".
await page.evaluate(() => {
  window.__game.voice.mock = true;
  const canvas = document.getElementById('game');
  Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => (window.__locked ? canvas : null) });
});
const lock = (on) => page.evaluate((on) => { window.__locked = on; }, on);
const g = (fn, arg) => page.evaluate(fn, arg);

await page.getByRole('button', { name: /College Life/i }).click();
await page.getByRole('button', { name: /Turn on my microphone/ }).click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: 'Start the day' }).click();
await page.waitForTimeout(300);
const hint = await page.locator('#toast').innerText();
log('start-of-day toast:', hint);
check(/Press C to ride your cycle/.test(hint), 'start of day suggests the cycle for the long walk to registration');
check((await g(() => window.__game.state.settings.timeScale)) === 0.35, 'new game uses Normal speed 0.35');

// --- Clock ---
await lock(true);
await page.waitForTimeout(200);
let c0 = await g(() => window.__game.state.day.clock);
const t0 = Date.now();
await page.waitForTimeout(4000);
let c1 = await g(() => window.__game.state.day.clock);
let rate = (c1 - c0) / ((Date.now() - t0) / 1000);
log('normal rate', rate.toFixed(3), 'game min / s');
check(rate > 0.3 && rate < 0.37, 'clock runs at about 0.35 game min per second');

await page.keyboard.down('KeyZ');
await page.waitForTimeout(200);
check(await page.locator('#hud-ff').isVisible(), 'FAST FORWARD badge shows while Z is held');
c0 = await g(() => window.__game.state.day.clock);
const t1 = Date.now();
await page.waitForTimeout(3000);
c1 = await g(() => window.__game.state.day.clock);
await page.keyboard.up('KeyZ');
rate = (c1 - c0) / ((Date.now() - t1) / 1000);
log('fast-forward rate', rate.toFixed(3));
check(rate > 1.2 && rate < 1.45, 'Z gives 4× (about 1.4 game min per second)');
await page.waitForTimeout(150);
check(!(await page.locator('#hud-ff').isVisible()), 'badge hides when Z is released');

// Paused: "click to play" screen (no lock), then a menu (timetable).
await lock(false);
c0 = await g(() => window.__game.state.day.clock);
await page.waitForTimeout(1500);
check((await g(() => window.__game.state.day.clock)) === c0, 'clock frozen on the click-to-play screen');
await lock(true);
await page.keyboard.press('KeyT');
await page.waitForTimeout(200);
c0 = await g(() => window.__game.state.day.clock);
await page.waitForTimeout(1500);
check((await g(() => window.__game.state.day.clock)) === c0, 'clock frozen while the timetable is open');
await page.keyboard.press('Escape');
await page.evaluate(() => document.querySelectorAll('#overlay .close, #overlay [data-close]').forEach((b) => b.click()));
await g(() => window.__game.state.day.clock); // settle
await page.evaluate(() => { const o = document.getElementById('overlay'); if (o.classList.contains('open')) o.querySelector('button')?.click(); });
await page.waitForTimeout(200);

// Seated at the desk before a lecture: no automatic jump any more.
await g(() => { const G = window.__game; G.state.day.registered = true; G.state.day.clock = 7 * 60 + 40; const seat = G.campus.seats[G.campus.playerSeatIndex]; G.player.pos.set(seat.pos.x, 0, seat.pos.z + 0.5); G.handleInteractable('mydesk'); });
await lock(true);
await page.waitForTimeout(200);
c0 = await g(() => window.__game.state.day.clock);
await page.waitForTimeout(2000);
c1 = await g(() => window.__game.state.day.clock);
log('seated waiting: +', (c1 - c0).toFixed(3), 'game min in 2 s', '| prompt:', await page.locator('#prompt').innerText());
check(c1 - c0 < 1, 'no automatic fast-forward while seated at the desk');
check(/hold Z to fast-forward/.test(await page.locator('#prompt').innerText()), 'desk prompt tells you Z fast-forwards');
await page.keyboard.press('KeyE'); // stand up
await page.waitForTimeout(200);

// --- Movement on the open Rotunda ---
const toOpen = () => g(() => { const G = window.__game; const r = G.campus.objectivePoint('reception'); G.player.place(new window.__game.player.pos.constructor(0, 0, 20), Math.PI); G.state.day.clock = 7 * 60 + 35; });
const speedOver = async (keys, ms) => {
  for (const k of keys) await page.keyboard.down(k);
  await page.waitForTimeout(1200); // reach speed
  const a = await g(() => ({ x: window.__game.player.pos.x, z: window.__game.player.pos.z }));
  const t = Date.now();
  await page.waitForTimeout(ms);
  const b = await g(() => ({ x: window.__game.player.pos.x, z: window.__game.player.pos.z }));
  const s = Math.hypot(b.x - a.x, b.z - a.z) / ((Date.now() - t) / 1000);
  const hud = await page.locator('#hud-move').innerText();
  return { s, hud, release: async () => { for (const k of keys) await page.keyboard.up(k); } };
};
await toOpen();
let r = await speedOver(['KeyW'], 1500);
log('walk', r.s.toFixed(2), 'm/s |', r.hud);
check(r.s > 1.3 && r.s < 1.7 && /Walking/.test(r.hud), 'walking ≈ 1.5 m/s, HUD says Walking');
await r.release();
await page.keyboard.down('KeyV'); await page.keyboard.up('KeyV'); // third person for the screenshots
await toOpen();
r = await speedOver(['KeyW', 'ShiftLeft'], 1500);
log('run', r.s.toFixed(2), 'm/s |', r.hud);
check(r.s > 3.6 && r.s < 4.3 && /Running/.test(r.hud), 'running ≈ 4 m/s with Shift, HUD says Running');
await page.screenshot({ path: `${OUT}/v2-run.png` });
await r.release();
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/v2-walk-stop.png` });

await toOpen();
await page.keyboard.press('KeyC');
await page.waitForTimeout(200);
check(await g(() => window.__game.player.bike), 'C mounts the cycle');
await page.keyboard.down('KeyW');
await page.waitForTimeout(1000);
const s1 = await g(() => window.__game.player.speedNow);
await page.keyboard.up('KeyW');
log('cycle after 1 s pedalling', s1.toFixed(2));
check(s1 > 1.5 && s1 < 3, 'cycle accelerates gradually');
r = await speedOver(['KeyW', 'ShiftLeft'], 1500);
log('cycle top', r.s.toFixed(2), 'm/s |', r.hud);
await page.screenshot({ path: `${OUT}/v2-ride.png` });
check(r.s > 5.5 && r.s < 6.7 && /Cycling · 2[0-9] km\/h/.test(r.hud), 'cycle tops out ≈ 6.5 m/s (23 km/h) and Shift adds nothing');
await r.release();
await page.keyboard.down('KeyS');
await page.waitForTimeout(1500);
await page.keyboard.up('KeyS');
check((await g(() => window.__game.player.speedNow)) === 0, 'S brakes to a stop');
await page.screenshot({ path: `${OUT}/v2-bike-idle.png` });

// Ride into a room: the cycle is parked automatically.
await g(() => { const G = window.__game; const room = G.campus.rooms.classroom; G.player.pos.copy(room.inside); });
await page.waitForTimeout(300);
check(!(await g(() => window.__game.player.bike)), 'cycle is parked when you go indoors');
await page.keyboard.press('KeyC');
await page.waitForTimeout(150);
check(!(await g(() => window.__game.player.bike)) && /No cycling indoors/.test(await page.locator('#toast').innerText()), 'C indoors refuses: "No cycling indoors"');

// Settings has the presets.
await lock(false);
await page.evaluate(() => window.__game.state && null);
log('ERRORS', JSON.stringify(errors));
log(fails.length ? `FAILED ${fails.length}: ${fails.join(' | ')}` : 'ALL PASS');
await browser.close();
process.exit(fails.length || errors.length ? 1 : 0);
