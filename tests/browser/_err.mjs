import { chromium } from 'playwright-core';
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu'] });
const p = await b.newPage();
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(m.type(), m.text().slice(0, 900)); });
p.on('pageerror', (e) => console.log('PAGEERR', e.message, e.stack?.slice(0, 800)));
await p.goto(`http://localhost:8093/${process.argv[2] || '?explore&only=main-building'}`);
await p.waitForTimeout(15000);
await b.close();
