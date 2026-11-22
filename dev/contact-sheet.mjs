// Contact sheets of a video: one frame every N seconds, labelled with its time, laid out in Chrome (no drawtext needed).
//
//   node dev/contact-sheet.mjs video.mp4 out-prefix [--every 2] [--offset 0] [--per 30] [--cols 5]
//
// Writes out-prefix-1.jpg, out-prefix-2.jpg, … (--per frames each). --offset adds to the labels (for a chunk of a film).
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? Number(args[i + 1]) : d; };
const [VIDEO, OUT] = args;
const EVERY = opt('every', 2); const OFFSET = opt('offset', 0); const PER = opt('per', 30); const COLS = opt('cols', 5);
const work = mkdtempSync(join(tmpdir(), 'sheet-'));
// frame k is the first frame at or after k × EVERY
execFileSync('ffmpeg', ['-v', 'error', '-i', VIDEO, '-vf', `select='isnan(prev_selected_t)+gte(t-prev_selected_t\\,${EVERY}-0.001)',scale=384:-2`, '-vsync', 'vfr', '-q:v', '3', join(work, 'f%05d.jpg')]);
const files = readdirSync(work).filter((f) => f.endsWith('.jpg')).sort();
const stamp = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: COLS * 392 + 8, height: 600 } });
for (let p = 0; p * PER < files.length; p++) {
  const cells = files.slice(p * PER, (p + 1) * PER).map((f, i) => {
    const t = OFFSET + (p * PER + i) * EVERY;
    return `<figure><img src="${f}"><figcaption>${stamp(t)}</figcaption></figure>`;
  }).join('');
  writeFileSync(join(work, 'sheet.html'), `<style>body{margin:0;background:#111;display:grid;grid-template-columns:repeat(${COLS},384px);gap:8px;padding:8px;font:600 15px system-ui;color:#fff}figure{margin:0;position:relative}img{display:block;width:384px}figcaption{position:absolute;left:4px;top:4px;background:#000c;padding:2px 6px;border-radius:4px}</style>${cells}`);
  await page.goto(`file://${join(work, 'sheet.html')}`, { waitUntil: 'load' });
  await page.screenshot({ path: `${OUT}-${p + 1}.jpg`, type: 'jpeg', quality: 85, fullPage: true });
  console.log(`${OUT}-${p + 1}.jpg`);
}
await browser.close();
