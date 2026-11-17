// Krishna Bhawan walk-in, driven with the keyboard: room → corridor → lobby → outside and back, stairs to the
// first floor and the roof, corridors, doors, the common room, vending machine, sofa, TT, NPCs, fps and sleep.
import { chromium } from 'playwright-core';
const OUT = process.argv[2] || '.';
const URL = process.argv[3] || 'http://localhost:8080/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(20000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const log = (...a) => console.log(...a);
const fails = [];
const check = (ok, what) => { log(ok ? 'PASS' : 'FAIL', what); if (!ok) fails.push(what); };
const g = (fn, arg) => page.evaluate(fn, arg);
const lock = (on) => g((on) => { window.__locked = on; }, on);
const walk = async (ms, keys = ['KeyW']) => { for (const k of keys) await page.keyboard.down(k); await page.waitForTimeout(ms); for (const k of keys) await page.keyboard.up(k); await page.waitForTimeout(250); };
// where am I, in the Bhawan's own frame
const where = () => g(() => { const G = window.__game; const H = G.campus.hostel; const p = G.player.pos; const [u, v] = H.local(p.x, p.z); return { u: +u.toFixed(2), v: +v.toFixed(2), y: +p.y.toFixed(2), room: G.campus.roomAt(p.x, p.z, p.y) }; });
// place at (u, v, y) facing a local direction: '+u', '-u', '+v', '-v'
const at = (u, v, y, dir) => g(([u, v, y, dir]) => {
  const G = window.__game; const H = G.campus.hostel;
  const d = { '+u': H.eu, '-u': [-H.eu[0], -H.eu[1]], '+v': H.ev, '-v': [-H.ev[0], -H.ev[1]] }[dir];
  G.player.place(H.world(u, v, y), Math.atan2(-d[0], -d[1]));
  G.player.pos.y = y;
}, [u, v, y, dir]);
const face = (dir) => g((dir) => { const G = window.__game; const H = G.campus.hostel; const d = { '+u': H.eu, '-u': [-H.eu[0], -H.eu[1]], '+v': H.ev, '-v': [-H.ev[0], -H.ev[1]] }[dir]; G.player.yaw = Math.atan2(-d[0], -d[1]); }, dir);
const closePanels = () => g(() => document.querySelectorAll('#overlay .close').forEach((b) => b.click()));
const toastText = () => page.locator('#toast').innerText();

await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(1000);
await g(() => { window.__game.voice.mock = true; const c = document.getElementById('game'); Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => (window.__locked ? c : null) }); });
await page.getByRole('button', { name: /College Life/ }).click();
await page.getByRole('button', { name: /Turn on my microphone/ }).click();
await page.waitForTimeout(500);
await page.getByRole('button', { name: 'Start the day' }).click();
await page.waitForTimeout(400);
await lock(true);
const H = await g(() => { const h = window.__game.campus.hostel; return { ve: h.ve, W: h.W, L: h.L, FH: 3.3, stair: h.ve + 3.4 }; });

// --- your room → corridor ---
let w = await where();
check(w.room === 'hostelroom' && w.y === 0, `day starts in your room on the ground floor (${JSON.stringify(w)})`);
await walk(2500);
w = await where();
log('after walking out', JSON.stringify(w));
check(w.room === 'hostel' && w.u > 4.75 && w.u < 7.6, 'walked out of your room into the corridor');

// --- corridor → lobby → outside ---
await at(6.15, H.ve, 0, '-u');
await walk(5000);
w = await where();
log('through the lobby', JSON.stringify(w));
check(w.u < -0.5 && w.room === null, 'walked from the corridor through the lobby and out of the entrance');
await page.screenshot({ path: `${OUT}/k01-outside.png` });
await face('+u');
await walk(5500);
w = await where();
log('back in', JSON.stringify(w));
check(w.room === 'hostel' && w.u > 3, 'walked back in from outside');

// --- stairs: ground → first floor → roof ---
await at(4.1, H.stair + 0.8, 0, '-u');
await walk(2600);
let s1 = await where();
await face('+v'); await walk(1000);
await face('+u'); await walk(2600);
let s2 = await where();
log('stairs: landing', JSON.stringify(s1), '→ top of flight', JSON.stringify(s2));
check(Math.abs(s1.y - 1.65) < 0.05, 'first flight reaches the half landing (1.65 m)');
check(Math.abs(s2.y - 3.3) < 0.05, 'second flight reaches the first floor (3.3 m)');
await face('+u'); await walk(1200);
w = await where();
check(Math.abs(w.y - 3.3) < 0.05 && w.u > 4.75, 'stepped off the stairs into the first-floor corridor');
await page.screenshot({ path: `${OUT}/k02-first-floor.png` });
await face('-v'); await walk(4000);
const ff = await where();
log('first-floor corridor', JSON.stringify(ff));
check(Math.abs(ff.y - 3.3) < 0.05 && ff.v < w.v - 6, 'walked along the first-floor corridor without falling');
// up to the roof
await at(4.1, H.stair + 0.8, 3.3, '-u');
await walk(2600); await face('+v'); await walk(1000); await face('+u'); await walk(2600);
await face('+u'); await walk(1500);
w = await where();
log('roof', JSON.stringify(w));
check(Math.abs(w.y - 6.6) < 0.05, 'second stair flight pair reaches the roof terrace (6.6 m)');
await page.screenshot({ path: `${OUT}/k03-roof.png` });
await walk(4000);
w = await where();
check(Math.abs(w.y - 6.6) < 0.05 && w.u < 7.9, 'the roof parapet stops you at the courtyard edge');
// back down
await at(5.0, H.stair + 2.6, 6.6, '-u');
await walk(2600); await face('-v'); await walk(1000); await face('+u'); await walk(2600);
w = await where();
log('down one floor', JSON.stringify(w));
check(Math.abs(w.y - 3.3) < 0.1, 'walked back down from the roof to the first floor');

// --- ground corridor: long walk, no invisible walls from the floor above ---
await at(6.15, H.ve + 25, 0, '-v');
const v0 = (await where()).v;
await walk(6000);
w = await where();
log('ground corridor', JSON.stringify(w));
check(v0 - w.v > 10 && w.y === 0, 'ground-floor corridor is clear for a long walk');
// courtyard through the arches
await at(6.15, H.ve - 30, 0, '+u');
await walk(3000);
w = await where();
check(w.room === null && w.u > 8, 'walked through an arch into the courtyard');

// --- doors ---
await at(6.15, H.ve - 2.6, 0, '-u');
await page.waitForTimeout(200);
const doorId = await g(() => { const G = window.__game; return G.campus.interactables.find((i) => i.id.startsWith('hdoor:') && Math.hypot(i.pos.x - G.player.pos.x, i.pos.z - G.player.pos.z) < 2)?.id; });
await g((id) => window.__game.handleInteractable(id), doorId);
await page.waitForTimeout(200);
check(/Door closed/.test(await toastText()), `E closes your room door (${doorId})`);
await at(6.15, H.ve - 4.6, 0, '-u');
await walk(2500);
w = await where();
check(w.room !== 'hostelroom', 'a closed door keeps you out');
await g((id) => window.__game.handleInteractable(id), doorId);
await walk(2500);
w = await where();
check(w.room === 'hostelroom', 'open again, you can walk in');

// --- your room: light, almirah, study desk ---
await g(() => window.__game.handleInteractable('hlight'));
await page.waitForTimeout(150);
check(/Light off/.test(await toastText()) && (await g(() => window.__game.campus.hostel.lightOn)) === false, 'light switch turns the room light off');
await page.screenshot({ path: `${OUT}/k04-light-off.png` });
await g(() => window.__game.handleInteractable('hlight'));
await g(() => window.__game.handleInteractable('almirah'));
await page.waitForTimeout(150);
check(/almirah/i.test(await toastText()), 'almirah opens');
await page.screenshot({ path: `${OUT}/k05-almirah.png` });
await g(() => window.__game.handleInteractable('almirah'));
const c0 = await g(() => window.__game.state.day.clock);
await g(() => window.__game.handleInteractable('studydesk'));
await page.waitForTimeout(150);
const c1 = await g(() => window.__game.state.day.clock);
check(c1 - c0 > 20 && /revise/.test(await toastText()), 'studying at your desk takes about half an hour');

// --- lobby: vending machine, cooler, notices ---
await g(() => window.__game.handleInteractable('vending'));
await page.locator('#overlay button', { hasText: 'Chips' }).click();
await page.waitForTimeout(150);
check(/Chips/.test(await toastText()) && (await g(() => window.__game.state.day.optional.vending)), 'vending machine sells a snack');
await g(() => window.__game.handleInteractable('hnotice'));
check(/Room inspection/.test(await page.locator('#overlay').innerText()), 'hostel notice board opens');
await closePanels();

// --- evening: the common room fills up ---
await g(() => { window.__game.state.day.clock = 18 * 60; });
await page.waitForTimeout(600);
const people = await g(() => { const out = {}; for (const [id, n] of window.__game.npcs.npcs) if (id.startsWith('hm:') && n.group.visible) out[id] = window.__game.campus.roomAt(n.pos.x, n.pos.z, n.pos.y) || 'courtyard'; return out; });
log('hostel-mates at 18:00', JSON.stringify(people));
check(Object.keys(people).length >= 10, 'evening: at least 10 hostel-mates around the Bhawan');
await at(3.2, H.ve - 15.5, 0, '-v');
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/k06-common-evening.png` });
const ball = await g(() => window.__game.campus.hostel.ttBall.visible);
check(ball, 'TT ball is in play in the evening');
// TT match by voice-style buttons until someone gets 5
await g(() => window.__game.handleInteractable('tt'));
for (let i = 0; i < 12; i++) {
  if (await page.locator('#overlay button', { hasText: 'Done' }).count()) break;
  const txt = await page.locator('#overlay').innerText();
  const side = /to your FOREHAND/.test(txt) ? 'Forehand' : 'Backhand';
  await page.locator('#overlay button', { hasText: side }).click();
  await page.waitForTimeout(60);
}
const score = await page.locator('#overlay').innerText();
log('TT:', score.split('\n').filter((l) => /You \d/.test(l)).join(''));
await page.screenshot({ path: `${OUT}/k07-tt.png` });
await page.locator('#overlay button', { hasText: 'Done' }).click();
check(await g(() => window.__game.state.day.optional.tt), 'a TT match finishes and counts as the TT mission');
// sofa
await at(2.1, H.ve - 3.4 - 3 * 3.4 + 0, 0, '-v');
await g(() => window.__game.handleInteractable('sofa'));
await page.waitForTimeout(200);
check(await g(() => !!window.__game.player.seated), 'sit on the common-room sofa');
await page.keyboard.press('KeyE');
await page.waitForTimeout(200);
w = await where();
check(!(await g(() => !!window.__game.player.seated)) && w.room === 'hostel', 'E stands you back up inside the common room');
// TV
await g(() => window.__game.handleInteractable('tv'));
check(/TV off/.test(await toastText()), 'TV switches off');
// talking to a hostel-mate
await g(() => { const G = window.__game; G.talkTo(G.npcs.get('hm:aditya')); });
await page.waitForTimeout(300);
check(/Aditya · Krishna Bhawan/.test(await page.locator('#overlay').innerText()), 'talk to a hostel-mate');
await closePanels();

// --- daytime: most people are out ---
await g(() => { window.__game.state.day.clock = 9 * 60 + 5; });
await page.waitForTimeout(600);
const dayPeople = await g(() => [...window.__game.npcs.npcs].filter(([id, n]) => id.startsWith('hm:') && n.group.visible).length);
check(dayPeople <= 5, `class hours: only a few people in the Bhawan (${dayPeople})`);

// --- fps inside and outside ---
const fps = async () => g(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(n / ((performance.now() - t0) / 1000)); }; requestAnimationFrame(f); }));
await at(6.15, H.ve - 10, 0, '+v');
const fIn = await fps();
await at(-30, H.ve, 0, '+u');
const fOut = await fps();
log('fps inside', fIn.toFixed(1), 'outside', fOut.toFixed(1));
check(fIn > 40 && fOut > 40, 'frame rate stays smooth inside and outside the Bhawan');

// --- sleep in your bed at night, wake up there ---
await g(() => { const G = window.__game; const b = G.campus.bedSpot; G.player.place(b.clone(), 0); G.state.day.clock = 21 * 60 + 5; });
await page.waitForTimeout(500);
check(/sleep \(E at the bed\)/.test(await page.locator('#hud-mission').innerText()), 'night objective: sleep in your bed');
await g(() => window.__game.handleInteractable('gate'));
await page.locator('#overlay button', { hasText: 'Sleep → next day' }).click();
await page.waitForTimeout(600);
w = await where();
check(w.room === 'hostelroom', 'next morning you wake up in your room');

log('ERRORS', JSON.stringify(errors));
log(fails.length ? `FAILED ${fails.length}: ${fails.join(' | ')}` : 'ALL PASS');
await browser.close();
process.exit(fails.length || errors.length ? 1 : 0);
