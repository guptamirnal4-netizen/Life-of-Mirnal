// An original trailer score for the film ("Play with BITSians": a Campus Royale paintball match), synthesised from
// scratch (no samples, no third-party audio): a dark D-minor pad, a driving low ostinato, big synthesised drums,
// "braam" swells and risers into each scene, a held breath before the countdown and a hit on "match started", rising
// tension through the final zone, a hit on the last tag, then a bright D-major resolution under the results and the
// closing title, with a breeze underneath.
//
//   node dev/film-score.mjs timeline.json out.wav
//
// timeline.json comes from the film itself ({ duration, dips: [scene starts], titles: [{ t0, t1 }], marks: { countdown,
// start, drop, end } }); dev/render-film.mjs writes it, so the music follows the cuts.
import { readFileSync, writeFileSync } from 'node:fs';

const [, , timelinePath, outPath] = process.argv;
const T = JSON.parse(readFileSync(timelinePath, 'utf8'));
const M = T.marks || {};
const SR = 48000;
const DUR = T.duration + 2;
const N = Math.ceil(DUR * SR);
const L = new Float32Array(N); const R = new Float32Array(N);
const sendL = new Float32Array(N); const sendR = new Float32Array(N);

let seed = 11;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const BPM = 100; const BEAT = 60 / BPM; const BAR = 4 * BEAT; const CHORD = 2 * BAR;

const acts = [0, ...T.dips, T.duration];
const actAt = (t) => { let a = 0; for (let i = 0; i < acts.length - 1; i++) if (t >= acts[i]) a = i; return a; };
// the eight scenes: reveal, deploy, loadout, start, encounters, drop, showdown, winner
const INTENSITY = [0.55, 0.62, 0.58, 0.78, 0.92, 0.95, 1.0, 0.8];
const END = M.end ?? acts[7] ?? T.duration;
const COUNT = M.countdown ?? acts[3];
const GO = COUNT + 3.3;
const major = (t) => t >= END + 0.2; // after the last tag: the major resolution
const hush = (t) => (t > COUNT - 0.3 && t < GO ? 0.25 : 1); // the held breath before "match started"

const TBL = 4096;
const table = (harm) => { const w = new Float32Array(TBL + 1); for (let i = 0; i <= TBL; i++) { let v = 0; harm.forEach(([h, a]) => { v += a * Math.sin(2 * Math.PI * h * i / TBL); }); w[i] = v; } let m = 0; for (const v of w) m = Math.max(m, Math.abs(v)); for (let i = 0; i <= TBL; i++) w[i] /= m; return w; };
const PAD = table([[1, 1], [2, 0.5], [3, 0.33], [4, 0.2], [5, 0.14], [6, 0.08], [7, 0.05]]);
const BRASS = table([[1, 1], [2, 0.8], [3, 0.6], [4, 0.45], [5, 0.3], [6, 0.2], [8, 0.1]]);
const look = (w, ph) => { const x = (ph - Math.floor(ph)) * TBL; const i = x | 0; return w[i] + (w[i + 1] - w[i]) * (x - i); };
const add = (i, l, r, send = 0) => { if (i < 0 || i >= N) return; L[i] += l; R[i] += r; sendL[i] += l * send; sendR[i] += r * send; };

// i – VI – III – VII in D minor; I – V – vi – IV in D major for the ending
const MINOR = [{ bass: 38, notes: [62, 65, 69, 74] }, { bass: 34, notes: [58, 62, 65, 70] }, { bass: 41, notes: [60, 65, 69, 72] }, { bass: 36, notes: [60, 64, 67, 72] }];
const MAJOR = [{ bass: 38, notes: [62, 66, 69, 74] }, { bass: 33, notes: [61, 64, 69, 73] }, { bass: 35, notes: [59, 62, 66, 71] }, { bass: 31, notes: [59, 62, 67, 71] }];
const chordAt = (t) => (major(t) ? MAJOR : MINOR)[Math.floor(t / CHORD) % 4];

// ---- pad ----
for (let c = 0; c * CHORD < DUR; c++) {
  const t0 = c * CHORD; const len = CHORD + 2.4;
  const s0 = Math.floor(t0 * SR); const s1 = Math.min(N, Math.floor((t0 + len) * SR));
  const voices = (major(t0 + 1) ? MAJOR : MINOR)[c % 4].notes.flatMap((m, k) => [-6, 6].map((cents) => ({ f: hz(m) * 2 ** (cents / 1200), pan: (k / 3 - 0.5) * 0.8 + cents / 50, ph: rnd() })));
  for (let i = s0; i < s1; i++) {
    const t = i / SR; const u = t - t0;
    const env = Math.min(1, u / 1.4) * Math.min(1, Math.max(0, (len - u) / 2.4));
    const level = 0.05 * (0.5 + 0.6 * INTENSITY[actAt(t)]) * env * hush(t) * (major(t) ? 1.25 : 1);
    let l = 0; let r = 0;
    for (const v of voices) { v.ph += v.f / SR; const s = look(PAD, v.ph); l += s * (0.5 - v.pan * 0.5); r += s * (0.5 + v.pan * 0.5); }
    add(i, l * level, r * level, 0.6);
  }
}

// ---- the ostinato: driving 16ths on the root (low, plucky saw), from the deployment on ----
for (let k = 0; k * BEAT / 4 < DUR; k++) {
  const t0 = k * BEAT / 4; const a = actAt(t0);
  if (a < 1 || t0 > T.duration - 2) continue;
  if (a === 2 && k % 2) continue; // lighter under the loadout
  const ch = chordAt(t0); const pat = [0, 0, 12, 0, 0, 7, 0, 12];
  const f = hz(ch.bass + 12 + pat[k % 8]); const vel = (k % 4 === 0 ? 1 : 0.65) * 0.05 * INTENSITY[a] * hush(t0) * (major(t0) ? 0.7 : 1);
  let ph = 0; let lp = 0;
  for (let i = Math.floor(t0 * SR), j = 0; j < SR * 0.16 && i < N; i++, j++) {
    const u = j / SR; ph += f / SR;
    const saw = 2 * (ph - Math.floor(ph)) - 1; lp += (0.08 + 0.25 * Math.exp(-u * 30)) * (saw - lp);
    const s = lp * vel * Math.exp(-u / 0.07) * Math.min(1, u / 0.003);
    add(i, s * 0.9, s * 1.1, 0.15);
  }
}

// ---- drums: big low hits and claps, denser as the match heats up ----
const boom = (t0, g) => { let ph = 0; for (let i = Math.floor(t0 * SR), j = 0; j < SR * 0.9 && i < N; i++, j++) { const u = j / SR; ph += (42 + 70 * Math.exp(-u * 25)) / SR; const s = Math.sin(2 * Math.PI * ph) * Math.exp(-u * 4.5) * g; add(i, s, s, 0.25); } let lp = 0; for (let i = Math.floor(t0 * SR), j = 0; j < SR * 0.12 && i < N; i++, j++) { lp += 0.2 * ((rnd() * 2 - 1) - lp); const s = lp * Math.exp(-j / SR * 40) * g * 0.8; add(i, s, s, 0.3); } };
const clap = (t0, g) => { for (const d of [0, 0.012, 0.024]) { let prev = 0; for (let i = Math.floor((t0 + d) * SR), j = 0; j < SR * 0.09 && i < N; i++, j++) { const n = rnd() * 2 - 1; const hp = n - prev; prev = n; const s = hp * Math.exp(-j / SR * 45) * g; add(i, s * 0.9, s * 1.1, 0.5); } } };
for (let k = 0; k * BEAT < DUR; k++) {
  const t0 = k * BEAT; const a = actAt(t0); const g = INTENSITY[a] * hush(t0);
  if (a < 1 || t0 > T.duration - 1.5) continue;
  const b = k % 8;
  if (a === 2) { if (b === 0) boom(t0, 0.25 * g); continue; }
  if (b === 0 || b === 4 || (a >= 4 && (b === 3 || b === 6))) boom(t0, 0.32 * g);
  if (a >= 3 && (b === 2 || b === 6)) clap(t0, 0.05 * g);
  if (a >= 5 && b === 7) boom(t0 + BEAT / 2, 0.22 * g);
}

// ---- braams (a wide brassy swell) and risers into each scene; hits on the marks ----
const braam = (t0, g = 1, root = 38) => {
  const vs = [root, root + 0.08, root + 12, root + 7 + 12].map((m) => ({ f: hz(m), ph: rnd() }));
  for (let i = Math.floor(t0 * SR), j = 0; j < SR * 3.2 && i < N; i++, j++) {
    const u = j / SR; const env = Math.min(1, u / 0.08) * Math.exp(-u / 1.3);
    let s = 0; for (const v of vs) { v.ph += v.f / SR; s += look(BRASS, v.ph); }
    s *= 0.05 * g * env; add(i, s, s, 0.6);
  }
  boom(t0, 0.45 * g);
};
const riser = (t1, len = 2.4, g = 1) => {
  let lp = 0;
  for (let i = Math.floor((t1 - len) * SR); i < Math.floor(t1 * SR); i++) {
    if (i < 0) continue;
    const u = (i / SR - (t1 - len)) / len; const k = 0.01 + 0.25 * u * u;
    lp += k * ((rnd() * 2 - 1) - lp);
    const s = lp * 0.16 * g * u * u * Math.min(1, (t1 - i / SR) / 0.05); add(i, s, s, 0.6);
  }
};
for (const d of T.dips) { riser(d, 2.4); braam(d + 0.02, 0.9); }
braam(0.3, 1.1);
if (M.start != null) { braam(GO, 1.2); }
if (M.drop != null) braam(M.drop + 0.3, 0.8, 41);
riser(END, 3.2, 1.3); braam(END, 1.4);
// the held breath: a ticking clock under the countdown
for (let k = 0; k < 3; k++) { const t0 = COUNT + 0.3 + k; for (let i = Math.floor(t0 * SR), j = 0; j < SR * 0.05 && i < N; i++, j++) { const s = Math.sin(2 * Math.PI * 1760 * j / SR) * Math.exp(-j / SR * 60) * 0.06; add(i, s, s, 0.4); } }

// ---- the ending: bright arpeggios over the major chords, a swell under the closing title ----
const PATTERN = [0, 2, 1, 3, 2, 1, 3, 2];
for (let k = 0; k * BEAT / 2 < DUR; k++) {
  const t0 = k * BEAT / 2;
  if (!major(t0) || t0 > T.duration - 2) continue;
  const m = chordAt(t0).notes[PATTERN[k % 8]] + 12; const f = hz(m); const vel = (k % 2 ? 0.7 : 1) * 0.05;
  const pan = Math.sin(k * 0.9) * 0.45; let ph = 0;
  for (let i = Math.floor(t0 * SR), j = 0; j < SR * 1.4 && i < N; i++, j++) { const u = j / SR; ph += f / SR; const s = look(PAD, ph) * vel * Math.exp(-u / 0.3) * Math.min(1, u / 0.004); add(i, s * (1 - pan), s * (1 + pan), 0.5); }
}
{
  const t0 = T.titles.at(-1).t0; const vs = MAJOR[0].notes.map((m) => ({ f: hz(m + 12), ph: rnd() }));
  for (let i = Math.floor((t0 - 2) * SR); i < Math.min(N, Math.floor((t0 + 8) * SR)); i++) {
    const u = i / SR - (t0 - 2); const env = Math.min(1, u / 2.5) ** 2 * Math.min(1, Math.max(0, (10 - u) / 4));
    let s = 0; for (const v of vs) { v.ph += v.f / SR; s += look(PAD, v.ph); }
    add(i, s * 0.03 * env, s * 0.03 * env, 0.7);
  }
}

// ---- a breeze underneath ----
{
  let b = 0; let lp = 0; let low = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR; b = 0.997 * b + 0.02 * (rnd() * 2 - 1); lp += 0.05 * (b - lp); low += 0.004 * (lp - low);
    const s = (lp - low) * 0.08 * (0.6 + 0.4 * Math.sin(2 * Math.PI * t / 9.3)); add(i, s, s);
  }
}

// ---- reverb (Freeverb-style) ----
const reverb = (inp, spread) => {
  const out = new Float32Array(N);
  const combs = [1557, 1617, 1491, 1422, 1277, 1356].map((d) => ({ buf: new Float32Array(Math.round((d + spread) * SR / 44100)), i: 0, f: 0 }));
  for (let i = 0; i < N; i++) { let s = 0; for (const c of combs) { const y = c.buf[c.i]; c.f = y * 0.6 + c.f * 0.4; c.buf[c.i] = inp[i] + c.f * 0.85; c.i = (c.i + 1) % c.buf.length; s += y; } out[i] = s / combs.length; }
  for (const d of [556, 441, 341]) { const buf = new Float32Array(Math.round((d + spread) * SR / 44100)); let k = 0; for (let i = 0; i < N; i++) { const b = buf[k]; const x = out[i]; buf[k] = x + b * 0.5; out[i] = b - x; k = (k + 1) % buf.length; } }
  return out;
};
const wetL = reverb(sendL, 0); const wetR = reverb(sendR, 23);

let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR; const fade = Math.min(1, t / 1.5) * Math.min(1, Math.max(0, (T.duration + 0.5 - t) / 3));
  L[i] = (L[i] + wetL[i] * 0.85) * fade; R[i] = (R[i] + wetR[i] * 0.85) * fade;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const g = 0.9 / peak;
const wav = Buffer.alloc(44 + N * 4);
wav.write('RIFF', 0); wav.writeUInt32LE(36 + N * 4, 4); wav.write('WAVE', 8); wav.write('fmt ', 12);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22); wav.writeUInt32LE(SR, 24); wav.writeUInt32LE(SR * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { wav.writeInt16LE(Math.round(Math.tanh(L[i] * g) * 32000), 44 + i * 4); wav.writeInt16LE(Math.round(Math.tanh(R[i] * g) * 32000), 46 + i * 4); }
writeFileSync(outPath, wav);
console.log(`score: ${DUR.toFixed(1)} s, ${acts.length - 1} scenes, peak gain ${g.toFixed(2)} → ${outPath}`);
