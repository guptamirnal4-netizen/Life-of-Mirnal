// Renders the campus film to an MP4, frame by frame (so every frame is perfect, however long it takes to draw).
//
//   npm start                                  (in another terminal)
//   node dev/render-film.mjs out.mp4 [--from 0] [--to <end>] [--scale 1.5] [--url http://localhost:8080/]
//
// Needs Chrome, ffmpeg, and playwright-core (npm i -D playwright-core). The film runs on Ultra with depth of field;
// frames are drawn at --scale × 1920×1080 and downscaled, and the score (dev/film-score.mjs) is muxed in.
import { chromium } from 'playwright-core';
import { spawn, execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const OUT = args[0] || 'life-of-mirnal-film.mp4';
const URL = opt('url', 'http://localhost:8080/');
const SCALE = Number(opt('scale', 1.5));
const FPS = 30;
const here = dirname(fileURLToPath(import.meta.url));
const work = mkdtempSync(join(tmpdir(), 'film-'));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: SCALE });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(1000);
const timeline = await page.evaluate(() => {
  const f = window.__game.playFilm({ capture: true });
  return { duration: f.duration, dips: f.dips, titles: f.titles, shots: f.shots.map((s) => ({ name: s.name, t0: s.t0, t1: s.t1 })) };
});
const from = Number(opt('from', 0)); const to = Math.min(Number(opt('to', timeline.duration)), timeline.duration);
writeFileSync(join(work, 'timeline.json'), JSON.stringify(timeline));
execFileSync('node', [join(here, 'film-score.mjs'), join(work, 'timeline.json'), join(work, 'score.wav')], { stdio: 'inherit' });

const ff = spawn('ffmpeg', ['-v', 'error', '-y',
  '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-ss', String(from), '-i', join(work, 'score.wav'),
  '-vf', 'scale=1920:1080:flags=lanczos,format=yuv420p',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-profile:v', 'high', '-movflags', '+faststart',
  '-c:a', 'aac', '-b:a', '192k', '-shortest', OUT], { stdio: ['pipe', 'inherit', 'inherit'] });

if (from > 0) await page.evaluate((t) => window.__game.film.seek(t), from);
const frames = Math.round((to - from) * FPS);
const t0 = Date.now();
for (let i = 0; i < frames; i++) {
  await page.evaluate((dt) => window.__game.film.step(dt, true), 1 / FPS);
  const jpg = await page.screenshot({ type: 'jpeg', quality: 94 });
  if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % 150 === 0) {
    const el = (Date.now() - t0) / 1000;
    console.log(`frame ${i}/${frames} (${(from + i / FPS).toFixed(1)} s) · ${(el / Math.max(1, i)).toFixed(2)} s/frame · ~${Math.round((frames - i) * el / Math.max(1, i) / 60)} min left`);
  }
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
console.log('errors', JSON.stringify(errors.slice(0, 5)));
console.log(`done: ${OUT} (${frames} frames, ${((Date.now() - t0) / 60000).toFixed(1)} min)`);
await browser.close();
