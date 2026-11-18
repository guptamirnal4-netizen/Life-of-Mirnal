// temporary: map-camera shots of Krishna Bhawan. node kshots-tmp.mjs OUTDIR name:camU,camV,camY,tgtU,tgtV,tgtY ...
import { chromium } from 'playwright-core';
const OUT = process.argv[2];
const views = process.argv.slice(3);
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 860 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:8094/?explore', { waitUntil: 'load' });
await page.waitForFunction(() => window.__game?.explorer?.campus?.hostel, null, { timeout: 90000 });
await page.evaluate(() => { document.querySelector('.ex-panel')?.classList.add('folded'); const s = document.querySelector('.ex-time input'); if (s) { s.value = 600; s.dispatchEvent(new Event('input')); } });
for (const v of views) {
  const [name, rest] = v.split(':');
  const n = rest.split(',').map(Number);
  await page.evaluate((n) => {
    const E = window.__game.explorer; const H = E.campus.hostel;
    const c = H.world(n[0], n[1], n[2]); const t = H.world(n[3], n[4], n[5]);
    E.fly = null; E.camera.position.copy(c); E.controls.target.copy(t); E.controls.update();
  }, n);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}
console.log('ERRORS', JSON.stringify(errors));
await browser.close();
