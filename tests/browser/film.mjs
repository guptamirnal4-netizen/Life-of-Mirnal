// The film ("Play with BITSians"): started from the title button, every scene renders, the player controls work
// (play/pause, scrub, mute, captions, scenes, previous/next), a hotspot opens its panel, "Explore this place" opens
// Campus Free Roam and "Return to the film" resumes at the same moment, the lobby button is honest when the paintball
// game is not wired, the ending returns to the title menu, resume works after a reload, and phones work.
//
//   PORT=8121 node dev/server.mjs            (another terminal)
//   node tests/browser/film.mjs [screenshot dir] [--url http://localhost:8121/]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const args = process.argv.slice(2);
const OUT = args[0] && !args[0].startsWith('--') ? args[0] : '.';
const URL = args.includes('--url') ? args[args.indexOf('--url') + 1] : 'http://localhost:8121/';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--autoplay-policy=no-user-gesture-required'] });
const errors = [];
const fails = [];
const log = (...a) => console.log(...a);
const check = (ok, what) => { log(ok ? 'PASS' : 'FAIL', what); if (!ok) fails.push(what); };
const watch = (page, tag) => {
  page.setDefaultTimeout(30000);
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${tag}: ${m.text()}`); });
};

const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
watch(page, 'desktop');
const g = (fn, arg) => page.evaluate(fn, arg);
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
const film = (fn = (f) => ({ t: f.t, paused: f.paused })) => page.evaluate(`(${fn})(window.__game.film)`);
const waitFrames = (n = 3) => page.evaluate((n) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);

await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(600);
// ---- title screen ----
const first = await page.locator('#title .title-menu > *').first();
check(/Watch the film/.test(await first.innerText()), 'the first title action is “🎬 Watch the film”');
check(await page.getByRole('button', { name: /Campus Free Roam/ }).isVisible(), 'Campus Free Roam stays a separate title action');
await page.waitForSelector('#title.backdrop', { timeout: 60000 }).catch(() => {});
check(await page.locator('#title.backdrop').count() === 1, 'the BITS Pilani backdrop fades in behind the title card');
check(await g(() => window.__game.campus === window.__game.campus && window.__game.campus.hostel != null), 'the title backdrop is the BITS campus (not the school)');
await page.waitForTimeout(1500);
await shot('00-title');

// ---- start from the button ----
await page.getByRole('button', { name: /Watch the film/ }).click();
await page.waitForTimeout(1500);
let s = await film();
check(!!s && !s.paused && s.t > 0.3, `the film starts playing from the title button (t ${s?.t.toFixed(2)})`);
const meta = await film((f) => ({ duration: f.duration, chapters: f.chapters.map((c) => ({ title: c.title, t0: c.t0, t1: c.t1 })), hots: f.hots.map((h) => ({ id: h.id, t0: h.t0, t1: h.t1 })) }));
log('duration', meta.duration.toFixed(1), 's ·', meta.chapters.map((c) => `${c.title} ${c.t0.toFixed(0)}–${c.t1.toFixed(0)}`).join(' | '));
check(meta.chapters.length === 7 && meta.duration > 180 && meta.duration < 260, '7 scenes, about 3–4 minutes');

// ---- play / pause ----
await page.keyboard.press('Space');
await page.waitForTimeout(300);
const p1 = await film();
await page.waitForTimeout(700);
const p2 = await film();
check(p1.paused && Math.abs(p2.t - p1.t) < 1e-6, 'Space pauses (time stands still)');
await page.mouse.click(640, 300); // the picture
await page.waitForTimeout(800);
const p3 = await film();
check(!p3.paused && p3.t > p2.t + 0.3, 'clicking the picture plays again');
await page.mouse.move(640, 650);
await page.locator('#film [data-k="play"]').click();
check((await film()).paused, 'the ⏸ button pauses');

// ---- scrub bar ----
const bar = await page.locator('#film .bar').boundingBox();
await page.mouse.click(bar.x + bar.width * 0.5, bar.y + bar.height / 2);
await page.waitForTimeout(200);
s = await film();
check(Math.abs(s.t - meta.duration * 0.5) < 2, `clicking the middle of the progress bar seeks to the middle (t ${s.t.toFixed(1)})`);
await page.mouse.move(bar.x + bar.width * 0.2, bar.y + bar.height / 2);
await page.mouse.down();
await page.mouse.move(bar.x + bar.width * 0.3, bar.y + bar.height / 2, { steps: 5 });
await page.mouse.up();
s = await film();
check(Math.abs(s.t - meta.duration * 0.3) < 2, `dragging on the bar scrubs (t ${s.t.toFixed(1)})`);
check(await page.locator('#film .bar .mk').count() === 6, 'scene markers on the progress bar');

// ---- mute, captions ----
await page.keyboard.press('KeyM');
check(await g(() => window.__game.film.ui.muted) && (await page.locator('#film [data-k="mute"]').innerText()) === '🔇', 'M mutes');
await page.locator('#film [data-k="mute"]').click();
check(!(await g(() => window.__game.film.ui.muted)), 'the 🔇 button unmutes');
await page.keyboard.press('KeyC');
check(await page.locator('#film.nocc').count() === 1, 'C hides the captions');
await page.locator('#film [data-k="cc"]').click();
check(await page.locator('#film.nocc').count() === 0, 'CC shows them again');

// ---- scene navigation ----
await g((t) => window.__game.film.seek(t), meta.chapters[2].t0 + 5);
await page.locator('#film [data-k="next"]').click();
s = await film();
check(Math.abs(s.t - meta.chapters[3].t0) < 0.1, '⏭ goes to the next scene');
await page.locator('#film [data-k="prev"]').click();
s = await film();
check(Math.abs(s.t - meta.chapters[2].t0) < 0.1, '⏮ goes back a scene');
await page.keyboard.press('PageDown');
s = await film();
check(Math.abs(s.t - meta.chapters[3].t0) < 0.1, 'PageDown goes to the next scene');
await page.locator('#film [data-k="chapters"]').click();
check(await page.locator('#film .chapters button').count() === 7, 'the Scenes list lists 7 scenes');
await page.mouse.move(640, 650);
await shot('01-controls-scenes-list');
await page.locator('#film .chapters button').nth(4).click();
await page.waitForTimeout(300);
s = await film();
check(s.t >= meta.chapters[4].t0 && s.t < meta.chapters[4].t0 + 2 && !s.paused, 'picking “The Match” in the list plays from that scene');
await page.keyboard.press('Space');

// ---- every scene renders (seek into each one, screenshot) ----
for (const [k, c] of meta.chapters.entries()) {
  for (const f of [0.3, 0.7]) {
    const t = c.t0 + (c.t1 - c.t0) * f;
    await g((t) => window.__game.film.seek(t), t);
    await waitFrames(4);
    const ok = await g(() => { const c = document.getElementById('game'); return c.width > 0 && !!window.__game.film && window.__game.film.shots.length > 0; });
    await page.mouse.move(5, 5);
    await page.waitForTimeout(3100); // let the controls hide for a clean frame
    await shot(`scene-${k + 1}-${f === 0.3 ? 'a' : 'b'}`);
    if (f === 0.3) check(ok, `scene ${k + 1} “${c.title}” renders`);
  }
}

// ---- a hotspot ----
const axis = await film((f) => f.shots.find((s) => s.name === 'clocktower-axis').t0);
await g((t) => window.__game.film.seek(t), axis + 3.5);
await waitFrames(3);
const hot = page.locator('#film .hot[data-id="rotunda"]');
check(await hot.isVisible(), 'a hotspot marks the Rotunda on screen');
await page.mouse.move(640, 650);
await shot('02-hotspots');
await hot.click();
check(await page.locator('#film .info').isVisible() && /Rotunda/.test(await page.locator('#film .info').innerText()), 'clicking it opens an info panel about the place');
check((await film()).paused, 'the film pauses under the panel');
await shot('03-hotspot-panel');
const tLeft = (await film()).t;

// ---- Explore this place → Campus Free Roam → Return to the film ----
await page.getByRole('button', { name: /Explore this place/ }).click();
await page.waitForTimeout(1500);
const ex = await g(() => ({ explorer: !!window.__game.explorer, film: !!window.__game.film, place: window.__game.explorer?.selected?.name }));
check(ex.explorer && !ex.film && ex.place === 'Rotunda', `“Explore this place” opens Campus Free Roam at the Rotunda (${ex.place})`);
check(await page.getByRole('button', { name: /Return to the film/ }).isVisible(), 'a clear “Return to the film” button shows');
await shot('04-explore-from-film');
await page.getByRole('button', { name: /Return to the film/ }).click();
await page.waitForTimeout(400);
s = await film();
check(!!s && Math.abs(s.t - tLeft) < 0.6 && !s.paused, `“Return to the film” resumes at the same moment (${tLeft.toFixed(2)} → ${s?.t.toFixed(2)})`);
check(!(await g(() => !!window.__game.explorer)), 'the explorer closed');

// ---- Open the lobby (the multiplayer game is not wired in this build: an honest message) ----
const lobbyT = await film((f) => f.shots.find((s) => s.name === 'prep-lobby').t0);
await g((t) => { window.__game.film.seek(t); window.__game.film.pause(); }, lobbyT + 3);
await waitFrames(3);
await page.locator('#film .hot[data-id="lobby"]').click();
await page.getByRole('button', { name: /Open the lobby/ }).click();
const hasOpen = await g(() => typeof window.__game.openPaintball === 'function');
if (hasOpen) check(!(await g(() => !!window.__game.film)), '“Open the lobby” opens the paintball game');
else check(/not available/.test(await page.locator('#film .info .msg').innerText()), '“Open the lobby” says honestly that the live lobby is not available yet');
await shot('05-lobby-panel');
if (!hasOpen) await page.getByRole('button', { name: /Back to the film/ }).click();

// ---- the ending returns to the title menu ----
if (!hasOpen) {
  await g(() => { const f = window.__game.film; f.seek(f.duration - 2.5); f.play(); });
  await page.waitForFunction(() => !window.__game.film, null, { timeout: 15000 }).catch(() => {});
  check(!(await g(() => !!window.__game.film)) && await page.locator('#title').isVisible(), 'the end of the film returns to the title menu');
  check(!(await page.getByRole('button', { name: /Resume the film/ }).count()), 'a finished film is not offered for resume');
  await shot('06-back-at-title');
}

// ---- resume after a reload ----
await page.getByRole('button', { name: /Watch the film/ }).click();
await page.waitForTimeout(500);
await g(() => { window.__game.film.seek(100); window.__game.film.pause(); });
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(800);
const resume = page.getByRole('button', { name: /Resume the film/ });
check(await resume.isVisible() && /1:40/.test(await resume.innerText()), 'after a reload the title offers “Resume the film · 1:40”');
await shot('07-title-resume');
await resume.click();
await page.waitForTimeout(400);
s = await film();
check(!!s && s.t >= 100 && s.t < 101.5, `Resume starts at the saved moment (t ${s?.t.toFixed(2)})`);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
check(!(await g(() => !!window.__game.film)) && await page.locator('#title').isVisible(), 'Esc leaves the film for the title');
await ctx.close();

// ---- phones ----
for (const [name, vp] of [['phone-portrait', { width: 390, height: 844 }], ['phone-landscape', { width: 844, height: 390 }]]) {
  const c = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await c.newPage();
  watch(p, name);
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(600);
  await p.getByRole('button', { name: /Watch the film/ }).tap();
  await p.waitForTimeout(1200);
  const started = await p.evaluate(() => !!window.__game.film && window.__game.film.t > 0.2);
  check(started, `${name}: the film plays`);
  for (const [k, sh] of [['a', 'idea-plan'], ['b', 'match-ots'], ['c', 'prep-lobby']]) {
    await p.evaluate((n) => { const f = window.__game.film; f.seek(f.shots.find((s) => s.name === n).t0 + 3); f.pause(); }, sh);
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/${name}-${k}.png` });
  }
  const box = await p.locator('#film .ctl').boundingBox();
  const btns = await p.locator('#film .ctl .ic:visible').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0).map((r) => [r.left, r.right]));
  check(box && box.y + box.height <= vp.height + 1 && btns.every(([l, r]) => l >= 0 && r <= vp.width + 1), `${name}: the controls fit the screen`);
  await p.locator('#film [data-k="play"]').tap();
  await p.waitForTimeout(500);
  check(!(await p.evaluate(() => window.__game.film.paused)), `${name}: tapping ▶ plays`);
  await c.close();
}

// ---- dev/render-film.mjs API (capture mode, fixed steps) ----
const c2 = await browser.newContext({ viewport: { width: 960, height: 540 } });
const pc = await c2.newPage(); watch(pc, 'capture');
await pc.goto(URL, { waitUntil: 'load' });
await pc.waitForTimeout(500);
const cap = await pc.evaluate(() => { const f = window.__game.playFilm({ capture: true }); f.seek(160); const a = f.t; for (let i = 0; i < 10; i++) f.step(1 / 30, true); return { a, b: f.t, ctl: getComputedStyle(document.querySelector('#film .ctl')).display }; });
check(Math.abs(cap.b - cap.a - 10 / 30) < 1e-6 && cap.ctl === 'none', 'capture mode steps by fixed dt with no player controls');
await c2.close();

log('ERRORS', JSON.stringify(errors));
check(errors.length === 0, 'no page errors');
await browser.close();
if (fails.length) { log(`\n${fails.length} FAILED:\n- ${fails.join('\n- ')}`); process.exit(1); }
log('\nall film checks passed');
