// The film ("Play with BITSians", a Campus Royale trailer) with the portal: on a first visit "Press to start" plays it;
// the portal's WATCH THE INTRO starts it; all 8 scenes render (seek + screenshot); the player controls work
// (play/pause, scrub, scene markers, scenes list, previous/next, mute, captions, replay, Esc/✕); the game hotspots
// ("How crates work", "The six blasters" open info; "Create a room" / "Join a room" end the film and land in the
// portal flow); the ending returns to the portal; it resumes where you left it after a reload; phones work;
// capture mode steps by fixed dt (dev/render-film.mjs); no page errors.
//
//   PORT=8141 node dev/server.mjs            (another terminal)
//   node tests/browser/film.mjs [screenshot dir] [--url http://localhost:8141/]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const args = process.argv.slice(2);
const OUT = args[0] && !args[0].startsWith('--') ? args[0] : '.';
const URL = args.includes('--url') ? args[args.indexOf('--url') + 1] : 'http://localhost:8141/';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--autoplay-policy=no-user-gesture-required'] });
const errors = [];
const fails = [];
const log = (...a) => console.log(...a);
const check = (ok, what) => { log(ok ? 'PASS' : 'FAIL', what); if (!ok) fails.push(what); };
const watch = (page, tag) => {
  page.setDefaultTimeout(30000);
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  // a paintball room needs the game server, which this test does not start: its connection errors are expected
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|ERR_CONNECTION_REFUSED|WebSocket|Failed to load resource/.test(m.text())) errors.push(`${tag}: ${m.text()}`); });
};
const seen = (ctx) => ctx.addInitScript(() => { try { localStorage.setItem('pwb-intro-seen', 'true'); } catch { /* */ } });
const portalUp = (page) => page.waitForFunction(() => window.__game?.mode === 'title' && window.__game.portal?.visible && !document.getElementById('title').classList.contains('hidden'), null, { timeout: 30000 });

// ---- first visit: "Press to start" plays the film ----
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage(); watch(page, 'first-visit');
  await page.goto(URL, { waitUntil: 'load' });
  await page.locator('[data-portal=splash]').waitFor();
  await page.locator('[data-portal=splash]').click({ position: { x: 200, y: 200 } });
  const ok = await page.waitForFunction(() => window.__game.mode === 'film' && !!window.__game.film && window.__game.film.t > 0.2, null, { timeout: 30000 }).then(() => true, () => false);
  check(ok, 'first visit: "Press to start" plays the film');
  await page.screenshot({ path: `${OUT}/00-first-visit-film.png` });
  await ctx.close();
}

const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await seen(ctx);
const page = await ctx.newPage();
watch(page, 'desktop');
const g = (fn, arg) => page.evaluate(fn, arg);
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
const film = (fn = (f) => ({ t: f.t, paused: f.paused })) => page.evaluate(`(${fn})(window.__game.film)`);
const waitFrames = (n = 3) => page.evaluate((n) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);

await page.goto(URL, { waitUntil: 'load' });
await portalUp(page);
await page.waitForTimeout(600);
// ---- the portal's WATCH THE INTRO ----
await page.locator('.p-menu [data-portal=intro]').click();
await page.waitForFunction(() => !!window.__game.film && window.__game.film.t > 0.3, null, { timeout: 30000 });
let s = await film();
check(!!s && !s.paused, `WATCH THE INTRO starts the film (t ${s?.t.toFixed(2)})`);
await g(() => window.__game.film.ready);
const meta = await film((f) => ({ duration: f.duration, chapters: f.chapters.map((c) => ({ title: c.title, t0: c.t0, t1: c.t1 })), hots: f.hots.map((h) => ({ id: h.id, label: h.label, t0: h.t0, t1: h.t1 })), results: { winner: f.results.winner, runnerUp: f.results.runnerUp, mvp: f.results.mvpName } }));
log('duration', meta.duration.toFixed(1), 's ·', meta.chapters.map((c) => `${c.title} ${c.t0.toFixed(1)}–${c.t1.toFixed(1)}`).join(' | '));
check(meta.chapters.length === 8 && meta.duration >= 150 && meta.duration <= 210, `8 scenes, 2:30–3:30 (${meta.duration.toFixed(1)} s)`);
check(['Create a room', 'Join a room', 'How crates work', 'The six blasters'].every((l) => meta.hots.some((h) => h.label === l)), 'the game hotspots: Create a room, Join a room, How crates work, The six blasters');
check(!(await g(() => /Explore this place|Campus Free Roam/.test(document.getElementById('film').innerText))), 'no "Explore this place" / Free Roam in the film');
check(meta.results.winner === 'Team Pink' && meta.results.runnerUp === 'Team Cyan' && meta.results.mvp === 'Advait', `results: ${JSON.stringify(meta.results)}`);

// ---- play / pause ----
await page.keyboard.press('Space');
await page.waitForTimeout(300);
const p1 = await film();
await page.waitForTimeout(700);
const p2 = await film();
check(p1.paused && Math.abs(p2.t - p1.t) < 1e-6, 'Space pauses (time stands still)');
await page.mouse.click(640, 300);
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
check(await page.locator('#film .bar .mk').count() === 7, 'scene markers on the progress bar');

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
check(await page.locator('#film .chapters button').count() === 8, 'the Scenes list lists 8 scenes');
await page.mouse.move(640, 650);
await shot('01-controls-scenes-list');
await page.locator('#film .chapters button').nth(4).click();
await page.waitForTimeout(300);
s = await film();
check(s.t >= meta.chapters[4].t0 && s.t < meta.chapters[4].t0 + 2 && !s.paused, 'picking “First Encounters” in the list plays from that scene');
await page.keyboard.press('Space');

// ---- every scene renders (seek into each one, screenshot) ----
for (const [k, c] of meta.chapters.entries()) {
  for (const f of [0.3, 0.7]) {
    const t = c.t0 + (c.t1 - c.t0) * f;
    await g((t) => window.__game.film.seek(t), t);
    await waitFrames(4);
    const ok = await g(() => { const c = document.getElementById('game'); return c.width > 0 && !!window.__game.film; });
    await page.mouse.move(5, 5);
    await g(() => { document.getElementById('film').classList.remove('paused'); document.getElementById('film').classList.add('idle'); });
    await page.waitForTimeout(450);
    await shot(`scene-${k + 1}-${f === 0.3 ? 'a' : 'b'}`);
    if (f === 0.3) check(ok, `scene ${k + 1} “${c.title}” renders`);
  }
}
// the game overlays look like the real ones (the live game's classes)
const at = (name, dt) => g(([n, d]) => { const f = window.__game.film; f.seek(f.shots.find((s) => s.name === n).t0 + d); f.pause(); }, [name, dt]);
await at('crate', 3.0); await waitFrames(3);
check(await page.locator('#film #pb-hud .pb-crate .pb-crate-item').count() >= 1 && await page.locator('#film #pb-hud .pb-inv .slot').count() === 2, 'the crate panel and the inventory bar (real HUD classes)');
await at('contact', 2); await waitFrames(3);
check(await page.locator('#film #pb-hud .minimap').isVisible() && /\d:\d\d/.test(await page.locator('#film #pb-hud .timer').innerText()) && /left · \d squads/.test(await page.locator('#film #pb-hud .pb-left').innerText()), 'the full HUD: timer, minimap, players left');
await at('landing', 3); await waitFrames(3);
check(await page.locator('#film [data-pb=landing-map]').isVisible(), 'the landing map');
await at('results', 6); await waitFrames(3);
check(/Team Pink wins/.test(await page.locator('#film [data-pb=results]').innerText()) && await page.locator('#film [data-pb=scoreboard] tr').count() === 11, 'the results screen (winner, runner-up, MVP, 10 players)');

// ---- info hotspots ----
await at('crate', 3.0); await waitFrames(3);
await page.mouse.move(640, 650);
const crates = page.locator('#film .hot[data-id="crates"]');
check(await crates.isVisible(), 'the “How crates work” hotspot shows during the crate scene');
await crates.click();
check(await page.locator('#film .info').isVisible() && /crate panel/.test(await page.locator('#film .info').innerText()), '“How crates work” opens its panel');
check((await film()).paused, 'the film pauses under the panel');
await shot('02-hotspot-crates');
await page.getByRole('button', { name: /Back to the film/ }).click();
await at('blasters', 3); await waitFrames(3);
await page.locator('#film .hot[data-id="blasters"]').click();
check(/Precision Paint Marker/.test(await page.locator('#film .info').innerText()), '“The six blasters” lists the six blasters with their stats');
await page.keyboard.press('Escape');
check(!!(await g(() => window.__game.film)) && await page.locator('#film .info.hidden').count() === 1, 'Esc closes the panel (the film stays)');

// ---- Create a room → the portal flow ----
await at('outro', 3); await waitFrames(3);
await g(() => { const o = window.__game.openPaintball; window.__game.openPaintball = (opts) => { window.__pbOpts = opts; return o(opts); }; });
await page.locator('#film .hot[data-id="create"]').click();
await page.waitForFunction(() => !window.__game.film, null, { timeout: 10000 }).catch(() => {});
await page.waitForTimeout(800);
const cr = await g(() => ({ film: !!window.__game.film, opts: window.__pbOpts, mode: window.__game.mode }));
check(!cr.film && cr.opts?.action === 'create' && cr.opts?.portal === true, `“Create a room” ends the film and opens openPaintball({ action: 'create', portal: true }) (${JSON.stringify(cr)})`);
await shot('03-create-room');
// back to the portal (no game server here: the client goes back with a status, or via its back button)
await page.waitForFunction(() => window.__game.mode === 'title', null, { timeout: 15000 }).catch(async () => { await page.locator('[data-pb="back"], [data-pb="retry-back"]').first().click().catch(() => {}); });
await portalUp(page).catch(() => {});
check(await g(() => window.__game.mode === 'title' && window.__game.portal?.visible), 'and from there back to the portal');

// ---- Join a room → the portal's join sheet ----
await page.locator('.p-menu [data-portal=intro]').click();
await page.waitForFunction(() => !!window.__game.film, null, { timeout: 15000 });
await at('results', 4); await waitFrames(3);
await page.locator('#film .hot[data-id="join"]').click();
await page.waitForTimeout(800);
const jn = await g(() => ({ film: !!window.__game.film, mode: window.__game.mode, sheet: !!document.querySelector('[data-portal=join-go]') }));
check(!jn.film && jn.mode === 'title' && jn.sheet, `“Join a room” ends the film and opens the portal's join sheet (${JSON.stringify(jn)})`);
await shot('04-join-sheet');
await page.keyboard.press('Escape');

// ---- the ending returns to the portal ----
await page.locator('.p-menu [data-portal=intro]').click();
await page.waitForFunction(() => !!window.__game.film, null, { timeout: 15000 });
await g(() => { const f = window.__game.film; f.seek(f.duration - 2.5); f.play(); });
await page.waitForFunction(() => !window.__game.film, null, { timeout: 15000 }).catch(() => {});
await portalUp(page).catch(() => {});
check(!(await g(() => !!window.__game.film)) && await g(() => window.__game.mode === 'title' && window.__game.portal?.visible), 'the end of the film returns to the portal');
check(await g(() => localStorage.getItem('pwb-intro-seen') === 'true'), 'the intro is marked as seen');
await shot('05-back-at-portal');

// ---- resume after a reload ----
await page.locator('.p-menu [data-portal=intro]').click();
await page.waitForFunction(() => !!window.__game.film, null, { timeout: 15000 });
s = await film();
check(s.t < 3, `a finished film starts from the beginning (t ${s.t.toFixed(2)})`);
await g(() => { window.__game.film.seek(100); window.__game.film.pause(); });
await page.reload({ waitUntil: 'load' });
await portalUp(page);
await page.locator('.p-menu [data-portal=intro]').click();
await page.waitForFunction(() => !!window.__game.film, null, { timeout: 15000 });
s = await film();
check(!!s && s.t >= 100 && s.t < 101.5, `after a reload WATCH THE INTRO resumes at the saved moment (t ${s?.t.toFixed(2)})`);
check(/Resumed at 1:40/.test(await page.locator('#film .resumed').innerText()), 'it says “Resumed at 1:40 · ↺ Start over”');
await page.locator('#film [data-k="replay"]').click();
s = await film();
check(s.t < 0.5 && !s.paused, '↺ replays from the start');
await page.locator('#film [data-k="exit"]').click();
await portalUp(page).catch(() => {});
check(!(await g(() => !!window.__game.film)) && await g(() => window.__game.mode === 'title'), '✕ leaves the film for the portal');
await ctx.close();

// ---- phones ----
for (const [name, vp] of [['phone-portrait', { width: 390, height: 844 }], ['phone-landscape', { width: 844, height: 390 }]]) {
  const c = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await seen(c);
  const p = await c.newPage();
  watch(p, name);
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__game?.portal?.visible, null, { timeout: 30000 });
  await p.locator('.p-menu [data-portal=intro]').tap();
  await p.waitForFunction(() => !!window.__game.film && window.__game.film.t > 0.2, null, { timeout: 30000 });
  check(true, `${name}: the film plays`);
  await p.evaluate(() => window.__game.film.ready);
  for (const [k, sh, dt] of [['a', 'intel', 5], ['b', 'crate', 3], ['c', 'contact', 2], ['d', 'results', 6]]) {
    await p.evaluate(([n, dt]) => { const f = window.__game.film; f.seek(f.shots.find((s) => s.name === n).t0 + dt); f.pause(); }, [sh, dt]);
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/${name}-${k}.png` });
  }
  const box = await p.locator('#film .ctl').boundingBox();
  const btns = await p.locator('#film .ctl .ic:visible').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0).map((r) => [r.left, r.right]));
  check(box && box.y + box.height <= vp.height + 1 && btns.every(([l, r]) => l >= 0 && r <= vp.width + 1), `${name}: the controls fit the screen`);
  const wide = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  check(wide, `${name}: no horizontal scroll`);
  await p.locator('#film [data-k="play"]').tap();
  await p.waitForTimeout(500);
  check(!(await p.evaluate(() => window.__game.film.paused)), `${name}: tapping ▶ plays`);
  await c.close();
}

// ---- dev/render-film.mjs API (capture mode, fixed steps) ----
const c2 = await browser.newContext({ viewport: { width: 960, height: 540 } });
await seen(c2);
const pc = await c2.newPage(); watch(pc, 'capture');
await pc.goto(URL, { waitUntil: 'load' });
await pc.waitForTimeout(500);
const cap = await pc.evaluate(async () => { const f = window.__game.playFilm({ capture: true }); await f.ready; f.seek(160); const a = f.t; for (let i = 0; i < 10; i++) f.step(1 / 30, true); return { a, b: f.t, ctl: getComputedStyle(document.querySelector('#film .ctl')).display }; });
check(Math.abs(cap.b - cap.a - 10 / 30) < 1e-6 && cap.ctl === 'none', 'capture mode steps by fixed dt with no player controls');
// seeking is exact: the same frame whether played up to or jumped to
const det = await pc.evaluate(() => { const f = window.__game.film; f.seek(120); for (let i = 0; i < 15; i++) f.step(1 / 30); const a = f.by.advait.pos.toArray().concat(f.camera.position.toArray()); f.seek(120.5); const b = f.by.advait.pos.toArray().concat(f.camera.position.toArray()); return a.every((v, i) => Math.abs(v - b[i]) < 1e-6); });
check(det, 'seeking gives the same frame as playing up to it (deterministic)');
await c2.close();

log('ERRORS', JSON.stringify(errors));
check(errors.length === 0, 'no page errors');
await browser.close();
if (fails.length) { log(`\n${fails.length} FAILED:\n- ${fails.join('\n- ')}`); process.exit(1); }
log('\nall film checks passed');
