// Your room in Krishna Bhawan (walk in and out, sleep in the bed) and meals at the VKB mess as daily missions.
import { chromium } from 'playwright-core';
const OUT = process.argv[2] || '.';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(15000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const log = (...a) => console.log(...a);
const fails = [];
const check = (ok, what) => { log(ok ? 'PASS' : 'FAIL', what); if (!ok) fails.push(what); };
const g = (fn, arg) => page.evaluate(fn, arg);
const lock = (on) => g((on) => { window.__locked = on; }, on);
const roomNow = () => g(() => window.__game.campus.roomAt(window.__game.player.pos.x, window.__game.player.pos.z));
const mission = () => page.locator('#hud-mission').innerText();
const walk = async (ms, keys = ['KeyW']) => { for (const k of keys) await page.keyboard.down(k); await page.waitForTimeout(ms); for (const k of keys) await page.keyboard.up(k); await page.waitForTimeout(300); };
const closePanels = () => g(() => document.querySelectorAll('#overlay .close').forEach((b) => b.click()));

// College Life is hidden behind FEATURES.collegeLife (js/features.js); switch it on and skip the first-visit intro

await page.addInitScript(() => { try { localStorage.setItem('pwb-features', 'collegeLife'); localStorage.setItem('pwb-intro-seen', 'true'); } catch { /* */ } });

await page.goto(process.env.BASE || 'http://localhost:8080/', { waitUntil: 'load' });
await page.waitForTimeout(800);
await g(() => {
  window.__game.voice.mock = true;
  const canvas = document.getElementById('game');
  Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => (window.__locked ? canvas : null) });
});
await page.getByRole('button', { name: /College Life/i }).click();
await page.getByRole('button', { name: /Turn on my microphone/ }).click();
await page.waitForTimeout(300);
const intro = await page.locator('#overlay').innerText();
check(/breakfast, lunch and dinner at the VKB mess/.test(intro) && /wake up in your room in Krishna Bhawan/.test(intro), 'intro mentions the mess and your room');
await page.getByRole('button', { name: 'Start the day' }).click();
await page.waitForTimeout(300);

// --- Your room ---
check((await roomNow()) === 'hostelroom', 'day 1 starts inside your room in Krishna Bhawan');
await page.keyboard.down('KeyV'); await page.keyboard.up('KeyV');
await lock(true);
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/m01-room.png` });
log('objective 07:30:', await mission());
check(/Breakfast at the VKB mess first/.test(await mission()), 'first objective: breakfast at the mess, then registration');
await walk(4500);
const out = await g(() => ({ room: window.__game.campus.roomAt(window.__game.player.pos.x, window.__game.player.pos.z), x: window.__game.player.pos.x, exitX: window.__game.campus.rooms.hostelroom?.exit.x ?? Infinity }));
log('after walking out', JSON.stringify(out));
check(out.room !== 'hostelroom' && out.x < out.exitX + 0.5, 'walked out of the room through the Bhawan doorway');
await g(() => { const G = window.__game; G.player.yaw = -Math.PI / 2; }); // turn round to face the Bhawan
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/m02-bhawan-door.png` });
await walk(4500);
check((await roomNow()) === 'hostelroom', 'walked back into the room from outside');

// Bed before bedtime
await g(() => window.__game.handleInteractable('gate'));
await page.waitForTimeout(200);
check(/Not bedtime yet/.test(await page.locator('#toast').innerText()), 'bed before lights out says it is not bedtime yet');

// --- The mess ---
await g(() => { const G = window.__game; const r = G.campus.rooms.mess; G.player.place(r.exit.clone(), -Math.PI / 2); G.state.day.clock = 7 * 60 + 40; });
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/m03-mess-door.png` });
await walk(4000);
check((await roomNow()) === 'mess', 'walked into the VKB mess through its door');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/m04-mess-inside.png` });
await g(() => window.__game.handleInteractable('mess'));
await page.waitForTimeout(200);
const panel = await page.locator('#overlay').innerText();
log('mess panel:', panel.replace(/\n+/g, ' | '));
check(/Breakfast/.test(panel) && /On the menu/.test(panel), 'counter opens the breakfast panel with the menu');
await page.screenshot({ path: `${OUT}/m05-mess-panel.png` });
await page.locator('#overlay button.primary').click();
await page.waitForTimeout(300);
const after = await g(() => ({ meals: window.__game.state.day.meals, sem: window.__game.state.sem.meals, clock: window.__game.state.day.clock }));
log('after eating', JSON.stringify(after), await page.locator('#toast').innerText());
check(after.meals.breakfast === true && after.sem === 1 && Math.abs(after.clock - (8 * 60)) < 1.5, 'breakfast eaten, counted, and takes about 20 minutes');
await g(() => window.__game.handleInteractable('mess'));
await page.waitForTimeout(200);
check(/already had breakfast/.test(await page.locator('#toast').innerText()), 'second breakfast is refused');
await g(() => { window.__game.state.day.clock = 10 * 60; });
await page.waitForTimeout(600); // let the 09:00 bell toast fire first so it does not overwrite the mess toast
await g(() => window.__game.handleInteractable('mess'));
await page.waitForTimeout(200);
log('closed:', await page.locator('#toast').innerText());
check(/closed now\. Lunch is served from 13:00/.test(await page.locator('#toast').innerText()), 'outside meal times the mess says when the next meal is');

// Missions panel
await lock(false);
await g(() => { const G = window.__game; G.state.sem.registered = true; });
await page.keyboard.press('KeyM');
await page.waitForTimeout(300);
const ms = await page.locator('#overlay').innerText();
log('missions:', ms.split('\n').slice(0, 6).join(' | '));
check(/Today’s missions · meals \(1\/3\)/i.test(ms) && /Breakfast at the VKB mess/i.test(ms) && /Dinner at the VKB mess/i.test(ms), 'missions panel lists breakfast, lunch and dinner as daily missions');
await page.screenshot({ path: `${OUT}/m06-missions.png` });
await closePanels();

// Lunch: objective points to the mess and batchmates head there
await lock(true);
await g(() => { window.__game.state.day.clock = 13 * 60 + 1; });
await page.waitForTimeout(800);
log('lunch objective:', await mission());
check(/Lunch is on at the VKB mess/.test(await mission()), 'lunch objective points to the mess');
const npcGoals = await g(() => { const G = window.__game; const out = []; for (const [id, n] of G.npcs.npcs) if (id.startsWith('cm:') && n.path?.length) { const p = n.path.at(-1); out.push(G.campus.roomAt(p.x, p.z)); } return out; });
log('batchmates heading to', JSON.stringify(npcGoals));
check(npcGoals.length > 0 && npcGoals.every((r) => r === 'mess'), 'batchmates walk to the mess for lunch');

// Dinner, then lights out in your room
await g(() => { window.__game.state.day.clock = 19 * 60 + 35; });
await page.waitForTimeout(500);
check(/Dinner is on at the VKB mess/.test(await mission()), 'dinner objective points to the mess');
await g(() => { window.__game.state.day.clock = 21 * 60 + 5; });
await page.waitForTimeout(500);
log('night objective:', await mission());
check(/go to your room in Krishna Bhawan and sleep \(E at the bed\)/.test(await mission()), 'night objective sends you to your bed');
const tt = await g(() => window.__game.slots.filter((s) => s.meal).map((s) => s.label).join(' / '));
log('meal slots:', tt);
await g(() => window.__game.handleInteractable('gate'));
await page.waitForTimeout(300);
const night = await page.locator('#overlay').innerText();
check(/Meals at the mess: 1\/3/.test(night), 'end-of-day summary shows meals eaten');
await page.locator('#overlay button', { hasText: 'Sleep → next day' }).click();
await page.waitForTimeout(500);
const day2 = await g(() => ({ room: window.__game.campus.roomAt(window.__game.player.pos.x, window.__game.player.pos.z), meals: window.__game.state.day.meals, sem: window.__game.state.sem.meals }));
log('day 2', JSON.stringify(day2));
check(day2.room === 'hostelroom' && Object.keys(day2.meals).length === 0 && day2.sem === 1, 'next day: wake up in your room, meals reset, semester count kept');

log('ERRORS', JSON.stringify(errors));
log(fails.length ? `FAILED ${fails.length}: ${fails.join(' | ')}` : 'ALL PASS');
await browser.close();
process.exit(fails.length || errors.length ? 1 : 0);
