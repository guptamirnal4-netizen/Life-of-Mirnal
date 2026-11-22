// Cuts the ~1:25 "Play with BITSians" trailer out of the 60 fps film master, reproducibly, from the edit decision list
// (EDL) below, and scores it (dev/trailer-score.mjs), in one encode.
//
//   node dev/render-film.mjs master.mp4 --master --fps 60 --timeline timeline.json   (npm start in another terminal)
//   node dev/make-trailer.mjs master.mp4 trailer.mp4 [--url http://localhost:8080/] [--edl edl.txt]
//
// Each EDL segment is a stretch of film time [in, out] (seconds of the film, the shot list in
// js/cinematic/paintball-film.js), its speed (a number, or a ramp: [[until, speed], ...] pieces in film time, the last
// running to `out`), the transition into it (cut | dip: through black | flash: from white | whip: a fast push from the
// previous shot) and the music/sound cues it carries (film times, mapped onto the trailer timeline after retiming).
// The trailer runs at 30 fps, so on the 60 fps master every speed used here is a whole number of master frames per
// trailer frame (0.5× = 1, 1× = 2, 1.5× = 3, 2× = 4): frame-accurate, evenly spaced, no blending or interpolation.
// The master's full-range BT.601 frames are converted once to limited-range BT.709 (same picture, standard tags).
// The site address is laid over the end card (rendered as a transparent PNG with the film's own type in Chrome).
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const FPS = 30; const SRC_FPS = 60;
const SITE = 'play-with-bitsians.vercel.app';

// ---- the edit decision list ----
// cue kinds (dev/trailer-score.mjs): hit, big, logo, riser (len), whoosh, splat, ding, beep, go, thud, shield, pop
export const EDL = [
  // ---- cold open: the aerial reveal under the title ----
  { name: 'reveal', in: 1.0, out: 5.4, speed: 1, why: 'cold open: whole-campus aerial + WELCOME TO PLAY WITH BITSIANS title (1×, title read in full)', cues: [[1.4, 'big']] },
  { name: 'intel', in: 12.0, out: 16.0, speed: 1.5, trans: 'dip', transDur: 0.3, why: 'Whole Campus tactical map (travelling flyover, 1.5×)', cues: [[12.3, 'hit', 0.5]] },
  { name: 'lowpass', in: 19.6, out: 26.2, speed: [[20.6, 2], [22.8, 1], [26.2, 2]], trans: 'whip', why: 'Rotunda fly-through 2× → caption 1× → FD-II reveal 2×', cues: [[20.6, 'hit', 0.6]] },
  // ---- build-up: deployment and looting ----
  { name: 'landing', in: 27.4, out: 30.4, speed: 1.5, trans: 'dip', transDur: 0.3, why: 'landing choice map (1.5×)', cues: [[27.6, 'pop', 0.6]] },
  { name: 'touchdown', in: 33.0, out: 35.8, speed: 1, why: 'touchdown + DROP ANYWHERE ON CAMPUS (1×, text 2.4 s)', cues: [[33.4, 'hit'], [34.2, 'thud', 0.5]] },
  { name: 'crate', in: 45.6, out: 49.6, speed: [[46.4, 2], [49.6, 1]], why: 'crate lid opens (2×) → panel and picks (1×)', cues: [[45.7, 'pop', 0.5], [47.8, 'ding'], [48.8, 'ding']] },
  { name: 'loot-aanya', in: 52.6, out: 55.0, speed: 2, trans: 'whip', why: 'second character loots the paint bomb (repetitive pick, 2×)', cues: [[53.7, 'ding', 0.7], [54.4, 'ding', 0.7]] },
  { name: 'customise', in: 61.6, out: 64.4, speed: 1, trans: 'dip', transDur: 0.3, why: 'loadout: STEP 2 GEAR UP (1×)', cues: [[61.7, 'hit']] },
  { name: 'blasters', in: 68.6, out: 72.6, speed: 2, why: 'the six blasters (slow pan, 2×)', cues: [[70.3, 'pop', 0.6]] },
  { name: 'squads', in: 81.0, out: 83.8, speed: 1, trans: 'dip', transDur: 0.3, why: 'CAMPUS ROYALE squads card over the aerial (1×)', cues: [[81.2, 'hit'], [86.0, 'riser', 0.8, 2.6]] },
  // ---- escalation: the match ----
  { name: 'countdown', in: 86.2, out: 90.4, speed: 1, why: '3-2-1 PAINTBALL MATCH STARTED (1×; the music hits on GO)', cues: [[86.3, 'beep'], [87.3, 'beep'], [88.3, 'beep'], [89.3, 'go'], [89.3, 'big']] },
  { name: 'pullback', in: 93.4, out: 97.4, speed: 2, why: 'camera pull-back as the squads run (long travelling, 2×)', cues: [] },
  { name: 'contact', in: 98.4, out: 101.0, speed: 1, trans: 'whip', why: 'FIRST CONTACT · M LAWNS caption, first paint hits (1×)', cues: [[99.3, 'splat', 0.5], [99.85, 'splat', 0.5], [100.4, 'splat', 0.6]] },
  { name: 'aanya-down', in: 103.6, out: 105.8, speed: 1, why: 'squadmate painted out (1×)', cues: [[104.0, 'splat', 0.5], [104.5, 'splat', 0.6], [105.1, 'hit', 0.7]] },
  { name: 'clean-off', in: 108.3, out: 112.4, speed: [[110.4, 1], [112.4, 2]], why: 'CLEAN OFF YOUR SQUADMATE (1× while the caption reads, 2× through the channel)', cues: [[112.3, 'ding']] },
  { name: 'rotunda', in: 122.0, out: 124.4, speed: 1, trans: 'whip', why: 'MEANWHILE · THE ROTUNDA: precision tag (1×)', cues: [[123.5, 'splat', 0.8]] },
  { name: 'announce', in: 126.2, out: 128.6, speed: 1, trans: 'dip', transDur: 0.3, why: 'SPECIAL SUPPLY DROP · BETTER GEAR. ONE CRATE. (1×)', cues: [[126.3, 'hit']] },
  { name: 'fall', in: 133.6, out: 138.9, speed: [[137.6, 2], [138.9, 1]], why: 'supply drop falls past the Clock Tower: 2× ramp to 1× into the landing', cues: [[138.6, 'riser', 0.8, 1.6], [138.6, 'thud']] },
  { name: 'drop-fight', in: 139.8, out: 144.6, speed: [[143.0, 1], [144.6, 2]], why: 'PAINT BOMB caption + the bomb burst (1×, in-film slow-mo), then the follow-up tag 2×', cues: [[142.2, 'splat', 1.4], [142.2, 'hit'], [144.3, 'splat', 0.8]] },
  { name: 'drop-open', in: 146.4, out: 150.6, speed: 2, why: 'special supply drop opened, four picks (repetitive, 2×)', cues: [[147.9, 'ding', 0.6], [148.7, 'ding', 0.6], [149.5, 'ding', 0.6], [150.3, 'ding', 0.6]] },
  { name: 'zone-closing', in: 151.6, out: 154.2, speed: 1, trans: 'whip', why: 'THE PAINT ZONE · STAY INSIDE THE WHITE CIRCLE aerial (1×)', cues: [[151.7, 'hit', 0.7], [154.2, 'riser', 1, 2.2]] },
  // ---- climax: the final showdown ----
  { name: 'final-zone', in: 157.1, out: 159.7, speed: 1, trans: 'flash', transDur: 0.3, why: 'FINAL ZONE · 4 LEFT · 2 SQUADS (1×)', cues: [[157.2, 'big']] },
  { name: 'bomb', in: 166.6, out: 170.6, speed: [[168.6, 2], [170.6, 1]], why: 'run-up 2× → paint bomb throw and tag 1× (in-film slow-mo)', cues: [[169.6, 'splat', 1.3], [169.6, 'hit', 0.8]] },
  { name: 'scope', in: 172.6, out: 175.2, speed: 1, why: 'precision scope shot: PRECISION PAINT HIT (1×)', cues: [[173.7, 'splat', 1]] },
  { name: 'shield', in: 176.0, out: 178.6, speed: 1, why: 'PAINT SHIELD blocks three shots (1×)', cues: [[176.0, 'shield'], [176.95, 'splat', 0.35], [177.95, 'splat', 0.35]] },
  { name: 'final-tag', in: 181.2, out: 185.2, speed: [[183.4, 1], [184.0, 0.5], [185.2, 1]], why: 'the last tag: music stops, 0.5× on the paint burst, back to 1×', cues: [[183.6, 'big'], [183.6, 'splat', 1.5]] },
  // ---- resolution ----
  { name: 'victory', in: 186.8, out: 188.8, speed: 1, trans: 'dip', transDur: 0.3, why: 'Team Pink wins! (1×)', cues: [] },
  { name: 'results', in: 192.2, out: 194.2, speed: 1, why: 'results table (1×)', cues: [[192.3, 'pop', 0.5]] },
  { name: 'celebrate', in: 198.5, out: 201.9, speed: 1, trans: 'whip', why: 'CHAMPION OF THE ARENA (1×, title 3.3 s)', cues: [[198.6, 'hit']] },
  { name: 'outro', in: 203.5, out: 208.6, speed: 1, trans: 'dip', transDur: 0.3, why: 'PLAY WITH BITSIANS end card + tagline + site address (1×)', cues: [[204.0, 'logo']] },
];
// music arc on the trailer timeline: acts (by segment name: the level from its start), the match start ("go"), the
// stop before the last tag, the last tag ("end"), the major resolution and the end-card site address (and its height, % of frame)
export const ARC = {
  acts: [['reveal', 0.35], ['landing', 0.5], ['customise', 0.55], ['squads', 0.6], ['contact', 0.85], ['announce', 0.92], ['final-zone', 1], ['victory', 0.7]],
  go: ['countdown', 89.3], stop: ['final-tag', 182.6], end: ['final-tag', 183.6], major: ['victory'], site: ['outro', 204.6], siteY: 68,
};

// ---- timing ----
const pieces = (s) => { // [{ a, b, speed }] in film time
  if (typeof s.speed === 'number') return [{ a: s.in, b: s.out, speed: s.speed }];
  const out = []; let a = s.in;
  s.speed.forEach(([until, speed], k) => { const b = k === s.speed.length - 1 ? s.out : until; out.push({ a, b, speed }); a = b; });
  return out;
};
export function plan(edl = EDL) {
  let t = 0; const segs = [];
  for (const s of edl) {
    const ps = pieces(s).map((p) => {
      const step = Math.round(p.speed * SRC_FPS / FPS); // master frames per trailer frame
      if (Math.abs(step - p.speed * SRC_FPS / FPS) > 1e-6) throw new Error(`${s.name}: speed ${p.speed} is not a whole number of master frames`);
      const j0 = Math.round(p.a * SRC_FPS) - 1; // master frame j shows film time (j + 1) / 60
      const n = Math.round((p.b - p.a) * SRC_FPS / step);
      return { ...p, step, j0, n };
    });
    const n = ps.reduce((a, p) => a + p.n, 0);
    const overlap = s.trans === 'whip' ? (s.transDur ?? 0.2) : 0;
    const start = t - overlap;
    // film time → trailer time inside this segment
    const map = (ft) => { let o = start; for (const p of ps) { if (ft <= p.b + 1e-9) return o + Math.max(0, ft - p.a) / p.speed; o += p.n / FPS; } return o; };
    segs.push({ ...s, ps, n, len: n / FPS, start, overlap, map });
    t = start + n / FPS;
  }
  return { segs, duration: t };
}

// ---- build ----
const here = dirname(fileURLToPath(import.meta.url));
const main = async () => {
  const args = process.argv.slice(2);
  const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
  const [MASTER, OUT = 'play-with-bitsians-trailer.mp4'] = args;
  const work = mkdtempSync(join(tmpdir(), 'trailer-'));
  const { segs, duration } = plan();

  // the EDL summary
  const fmt = (x) => x.toFixed(2).padStart(6);
  const lines = segs.map((s) => `${fmt(s.start)}–${fmt(s.start + s.len)}  ${s.name.padEnd(14)} film ${fmt(s.in)}–${fmt(s.out)}  ${s.ps.map((p) => `${p.speed}×`).join('→').padEnd(13)} ${(s.trans || 'cut').padEnd(5)}  ${s.why || ''}`);
  const summary = `trailer ${duration.toFixed(2)} s at ${FPS} fps from the ${SRC_FPS} fps master\n  trailer time   segment        film time          speed         in     why\n${lines.join('\n')}\n`;
  console.log(summary);
  if (opt('edl')) writeFileSync(opt('edl'), summary);
  if (args.includes('--dry')) return;

  // the site address, in the film's type, as a transparent overlay for the end card
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.setContent(`<body style="margin:0;background:transparent"><div style="position:absolute;left:0;right:0;top:${ARC.siteY}%;text-align:center;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-weight:800;font-size:32px;letter-spacing:0.1em;color:#fff;text-shadow:0 2px 14px rgba(0,0,0,0.9)"><span style="display:inline-block;padding:10px 28px;border:2px solid rgba(255,255,255,0.7);border-radius:999px;background:rgba(11,16,32,0.4)">${SITE}</span></div></body>`);
  await page.screenshot({ path: join(work, 'site.png'), omitBackground: true });
  await browser.close();

  // the score, from the EDL's cues on the trailer timeline
  const at = (name, ft) => { const s = segs.find((x) => x.name === name); if (!s) throw new Error(`no segment ${name}`); return s.map(ft ?? s.in); };
  const events = [];
  for (const s of segs) {
    for (const [ft, kind, g, len] of s.cues || []) events.push({ t: s.map(ft), kind, g, len });
    if (s.trans === 'whip') events.push({ t: s.start + s.overlap / 2, kind: 'whoosh' });
  }
  const cues = {
    duration, go: at(...ARC.go), stop: at(...ARC.stop), end: at(...ARC.end), major: at(...ARC.major),
    acts: ARC.acts.map(([name, level]) => ({ t: at(name), level })), events: events.sort((a, b) => a.t - b.t),
  };
  writeFileSync(join(work, 'cues.json'), JSON.stringify(cues, null, 1));
  if (opt('cues')) writeFileSync(opt('cues'), JSON.stringify(cues, null, 1));
  execFileSync('node', [join(here, 'trailer-score.mjs'), join(work, 'cues.json'), join(work, 'score.wav')], { stdio: 'inherit' });
  // loudness: pass 1 measures, pass 2 (linear) runs in the encode
  const TARGET = 'I=-14:TP=-2:LRA=11'; // TP -2 leaves room for the AAC encode's overshoot
  const log = spawnSync('ffmpeg', ['-hide_banner', '-i', join(work, 'score.wav'), '-af', `loudnorm=${TARGET}:print_format=json`, '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const meas = JSON.parse(log.slice(log.lastIndexOf('{'), log.lastIndexOf('}') + 1));

  // the picture: one input per speed piece (accurate seek on the master), every step-th frame, retimed to 30 fps
  const inputs = []; const graph = []; let k = 0;
  const labels = segs.map((s, si) => {
    const parts = s.ps.map((p) => {
      inputs.push('-ss', ((p.j0 - 0.25) / SRC_FPS).toFixed(5), '-i', MASTER);
      graph.push(`[${k}:v]select='not(mod(n\\,${p.step}))',trim=end_frame=${p.n},setpts=N/${FPS}/TB,fps=${FPS},settb=1/${FPS}[p${k}]`);
      return `[p${k++}]`;
    });
    const fx = [];
    const d = s.transDur ?? 0.35;
    if (s.trans === 'dip') fx.push(`fade=t=in:st=0:d=${d}`);
    if (s.trans === 'flash') fx.push(`fade=t=in:st=0:d=${d}:color=white`);
    const next = segs[si + 1];
    if (next?.trans === 'dip') fx.push(`fade=t=out:st=${(s.len - (next.transDur ?? 0.35)).toFixed(4)}:d=${next.transDur ?? 0.35}`);
    if (si === segs.length - 1) fx.push(`fade=t=out:st=${(s.len - 0.7).toFixed(4)}:d=0.7`);
    graph.push(`${parts.join('')}${parts.length > 1 ? `concat=n=${parts.length}:v=1:a=0,` : ''}${[...fx, `settb=1/${FPS}`].join(',')}[s${si}]`);
    return `s${si}`;
  });
  // join: cuts concatenate, whips push the next shot in over the last frames of the previous one
  let acc = labels[0]; let accLen = segs[0].len;
  for (let i = 1; i < segs.length; i++) {
    const s = segs[i];
    if (s.trans === 'whip') graph.push(`[${acc}][${labels[i]}]xfade=transition=${s.whip || 'slideleft'}:duration=${s.overlap}:offset=${(accLen - s.overlap).toFixed(4)},settb=1/${FPS}[j${i}]`);
    else graph.push(`[${acc}][${labels[i]}]concat=n=2:v=1:a=0,settb=1/${FPS}[j${i}]`);
    accLen += s.len - s.overlap; acc = `j${i}`;
  }
  // the site address over the end card
  const card = at(...ARC.site);
  inputs.push('-loop', '1', '-framerate', String(FPS), '-i', join(work, 'site.png'));
  graph.push(`[${k}:v]format=rgba,fade=t=in:st=${card.toFixed(3)}:d=0.6:alpha=1,fade=t=out:st=${(duration - 0.7).toFixed(3)}:d=0.7:alpha=1,trim=end=${duration.toFixed(3)}[site]`);
  graph.push(`[${acc}][site]overlay=0:0:shortest=1:format=auto,scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p[v]`);
  k++;
  inputs.push('-i', join(work, 'score.wav'));
  graph.push(`[${k}:a]atrim=end=${duration.toFixed(3)},loudnorm=${TARGET}:measured_I=${meas.input_i}:measured_TP=${meas.input_tp}:measured_LRA=${meas.input_lra}:measured_thresh=${meas.input_thresh}:offset=${meas.target_offset}:linear=true,aresample=48000[a]`);
  writeFileSync(join(work, 'graph.txt'), graph.join(';\n'));
  console.log(`encoding ${segs.length} segments (${k - 1} pieces) → ${OUT}; graph in ${join(work, 'graph.txt')}`);
  const ff = spawn('ffmpeg', ['-hide_banner', '-v', 'error', '-stats', '-y', ...inputs, '-filter_complex_script', join(work, 'graph.txt'), '-map', '[v]', '-map', '[a]',
    '-r', String(FPS), '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', '-t', duration.toFixed(3), OUT], { stdio: 'inherit' });
  const code = await new Promise((r) => ff.on('close', r));
  if (code) throw new Error(`ffmpeg exited ${code}`);
  console.log(`done: ${OUT} (${duration.toFixed(2)} s)`);
};
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
