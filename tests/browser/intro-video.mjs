// The intro trailer video (js/portal/intro-video.js): a first visit's "Press to start" plays the 1:26 trailer, Skip
// and the video's end return to the portal and mark the intro as seen, WATCH THE INTRO replays it, a phone works.
//   PORT=8161 node dev/server.mjs   (another terminal)
//   node tests/browser/intro-video.mjs [screenshot dir] [--url http://localhost:8161/]
import { chromium, devices } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const args = process.argv.slice(2);
const OUT = args[0] && !args[0].startsWith('--') ? args[0] : '.';
const URL = args.includes('--url') ? args[args.indexOf('--url') + 1] : 'http://localhost:8161/';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--autoplay-policy=no-user-gesture-required'] });
const errors = []; const fails = [];
const check = (ok, what) => { console.log(ok ? 'PASS' : 'FAIL', what); if (!ok) fails.push(what); };
const open = async (opts = {}) => { const c = await browser.newContext({ viewport: { width: 1280, height: 720 }, ...opts }); const p = await c.newPage(); p.setDefaultTimeout(30000); p.on('pageerror', (e) => errors.push(e.message)); return p; };

const page = await open();
await page.goto(URL, { waitUntil: 'load' });
await page.locator('[data-portal=splash]').waitFor();
await page.locator('[data-portal=splash]').click({ position: { x: 200, y: 200 } });
await page.locator('#intro-video video').waitFor();
const info = await page.waitForFunction(() => { const v = document.querySelector('#intro-video video'); return v && v.readyState >= 2 && v.currentTime > 0.5 ? { d: v.duration, w: v.videoWidth, h: v.videoHeight, film: !!window.__game.film } : null; }, null, { timeout: 30000 }).then((x) => x.jsonValue(), () => null);
check(!!info, 'first visit: "Press to start" plays the trailer video');
check(info && info.d > 80 && info.d < 92, `trailer length ${info?.d?.toFixed(1)} s`);
check(info && info.w === 1920 && info.h === 1080, `trailer is 1080p (${info?.w}×${info?.h})`);
check(info && !info.film, 'the in-engine film is not running behind the video');
await page.screenshot({ path: `${OUT}/intro-video-playing.png` });
await page.locator('[data-intro=skip]').click();
await page.waitForFunction(() => !document.getElementById('intro-video'), null, { timeout: 5000 }).catch(() => {});
check(!(await page.locator('#intro-video').count()) && await page.locator('.p-menu [data-portal=create]').isVisible(), 'Skip returns to the portal');
check(await page.evaluate(() => localStorage.getItem('pwb-intro-seen') === 'true'), 'the intro is marked as seen');
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(800);
check(!(await page.locator('[data-portal=splash]').count()), 'second visit lands on the portal');
await page.locator('.p-menu [data-portal=intro]').click();
await page.locator('#intro-video video').waitFor();
await page.waitForFunction(() => Number.isFinite(document.querySelector('#intro-video video')?.duration));
// the dev server has no HTTP Range support, so seeking to the end is unreliable locally: fire the video's 'ended'
await page.evaluate(() => document.querySelector('#intro-video video').dispatchEvent(new Event('ended')));
await page.waitForFunction(() => !document.getElementById('intro-video'), null, { timeout: 15000 }).catch(() => {});
check(!(await page.locator('#intro-video').count()), 'WATCH THE INTRO replays it, and the end returns to the portal');
await page.locator('.p-menu [data-portal=intro]').click();
await page.locator('#intro-video video').waitFor();
await page.keyboard.press('Escape');
await page.waitForFunction(() => !document.getElementById('intro-video'), null, { timeout: 5000 }).catch(() => {});
check(!(await page.locator('#intro-video').count()), 'Esc skips the trailer');

const phone = await open({ ...devices['iPhone 13'] });
await phone.goto(URL, { waitUntil: 'load' });
await phone.locator('[data-portal=splash]').tap();
const ph = await phone.waitForFunction(() => { const v = document.querySelector('#intro-video video'); return v && v.readyState >= 2; }, null, { timeout: 30000 }).then(() => true, () => false);
check(ph, 'phone: the trailer loads and plays inline');
await phone.screenshot({ path: `${OUT}/intro-video-phone.png` });

console.log('ERRORS', JSON.stringify(errors));
await browser.close();
if (fails.length || errors.length) { console.log(`FAILED: ${fails.length}`); process.exit(1); }
console.log('ALL PASS');
