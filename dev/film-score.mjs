// An original score for the film (school, then BITS Pilani), synthesised from scratch (no samples, no third-party audio):
// a pad progression in D major, plucked arpeggios, bass, a soft pulse once Mirnal arrives, risers into each act,
// a swell under the closing title, and wind and birdsong.
//
//   node dev/film-score.mjs timeline.json out.wav
//
// timeline.json comes from the film itself ({ duration, dips: [act starts], titles: [{ t0, t1 }] }); dev/render-film.mjs
// writes it, so the music follows the cuts.
import { readFileSync, writeFileSync } from 'node:fs';

const [, , timelinePath, outPath] = process.argv;
const T = JSON.parse(readFileSync(timelinePath, 'utf8'));
const SR = 48000;
const DUR = T.duration + 2;
const N = Math.ceil(DUR * SR);
const L = new Float32Array(N); const R = new Float32Array(N);
const sendL = new Float32Array(N); const sendR = new Float32Array(N); // to the reverb

let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const BPM = 84; const BEAT = 60 / BPM; const BAR = 4 * BEAT; const CHORD = 2 * BAR;

// acts: school, BITS from the air, arrival, academics, hostels, landmarks, finale
const acts = [0, ...T.dips, T.duration];
const actAt = (t) => { let a = 0; for (let i = 0; i < acts.length - 1; i++) if (t >= acts[i]) a = i; return a; };
const INTENSITY = [0.5, 0.52, 0.62, 0.78, 0.72, 0.86, 1.0];
const finaleTitle = T.titles.at(-1).t0;

// wavetables
const TBL = 4096;
const table = (harm) => { const w = new Float32Array(TBL + 1); for (let i = 0; i <= TBL; i++) { let v = 0; harm.forEach(([h, a]) => { v += a * Math.sin(2 * Math.PI * h * i / TBL); }); w[i] = v; } let m = 0; for (const v of w) m = Math.max(m, Math.abs(v)); for (let i = 0; i <= TBL; i++) w[i] /= m; return w; };
const PAD = table([[1, 1], [2, 0.45], [3, 0.28], [4, 0.16], [5, 0.1], [6, 0.06]]);
const PLUCK = table([[1, 1], [2, 0.32], [3, 0.12], [4.02, 0.06]]);
const look = (w, ph) => { const x = (ph - Math.floor(ph)) * TBL; const i = x | 0; return w[i] + (w[i + 1] - w[i]) * (x - i); };

// I – V/3 – vi – IV, with the bass under each
const PROG = [
  { bass: 38, notes: [62, 66, 69, 74] }, { bass: 37, notes: [61, 64, 69, 73] },
  { bass: 35, notes: [59, 62, 66, 71] }, { bass: 31, notes: [59, 62, 67, 71] },
];
const chordAt = (t) => PROG[Math.floor(t / CHORD) % PROG.length];

const add = (i, l, r, send = 0) => { if (i < 0 || i >= N) return; L[i] += l; R[i] += r; sendL[i] += l * send; sendR[i] += r * send; };

// ---- pad: each chord fades in and out, overlapping the next ----
for (let c = 0; c * CHORD < DUR; c++) {
  const t0 = c * CHORD; const ch = PROG[c % PROG.length];
  const len = CHORD + 2.2;
  const s0 = Math.floor(t0 * SR); const s1 = Math.min(N, Math.floor((t0 + len) * SR));
  const voices = ch.notes.flatMap((m, k) => [-5, 5].map((cents) => ({ f: hz(m) * 2 ** (cents / 1200), pan: (k / 3 - 0.5) * 0.7 + cents / 40, ph: rnd() })));
  for (let i = s0; i < s1; i++) {
    const t = i / SR; const u = t - t0;
    const env = Math.min(1, u / 1.6) * Math.min(1, Math.max(0, (len - u) / 2.2));
    const a = actAt(t);
    const level = 0.055 * (0.55 + 0.6 * INTENSITY[a]) * env * (t > finaleTitle ? 1.35 : 1);
    let l = 0; let r = 0;
    for (const v of voices) {
      v.ph += (v.f * (1 + 0.0015 * Math.sin(2 * Math.PI * 0.21 * t + v.pan * 3))) / SR;
      const s = look(PAD, v.ph);
      l += s * (0.5 - v.pan * 0.5); r += s * (0.5 + v.pan * 0.5);
    }
    add(i, l * level, r * level, 0.55);
  }
}

// ---- bass ----
for (let c = 0; c * CHORD < DUR; c++) {
  const t0 = c * CHORD; const f = hz(PROG[c % PROG.length].bass + 12);
  let ph = 0;
  for (let i = Math.floor(t0 * SR); i < Math.min(N, Math.floor((t0 + CHORD + 0.3) * SR)); i++) {
    const t = i / SR; const u = t - t0; const a = actAt(t);
    if (t < 6) continue;
    const env = Math.min(1, u / 0.25) * Math.min(1, Math.max(0, (CHORD + 0.3 - u) / 0.4));
    ph += f / SR;
    const s = (Math.sin(2 * Math.PI * ph) + 0.25 * Math.sin(4 * Math.PI * ph)) * 0.07 * INTENSITY[a] * env;
    add(i, s, s, 0.1);
  }
}

// ---- plucked arpeggio on eighth notes, from Mirnal's arrival ----
const PATTERN = [0, 2, 1, 3, 2, 1, 3, 2];
for (let k = 0; k * BEAT / 2 < DUR; k++) {
  const t0 = k * BEAT / 2; const a = actAt(t0);
  if (t0 < 8 || t0 > T.duration - 3) continue;
  if (a === 6 && t0 > finaleTitle + 4) continue;
  const ch = chordAt(t0); const m = ch.notes[PATTERN[k % 8]] + 12;
  const f = hz(m); const vel = (k % 2 ? 0.7 : 1) * 0.055 * INTENSITY[a] * (k % 8 === 0 ? 1.15 : 1);
  const pan = Math.sin(k * 0.9) * 0.45;
  let ph = 0;
  for (let i = Math.floor(t0 * SR), j = 0; j < SR * 1.6 && i < N; i++, j++) {
    const u = j / SR;
    ph += f / SR;
    const s = look(PLUCK, ph) * vel * Math.exp(-u / 0.32) * Math.min(1, u / 0.004);
    add(i, s * (0.5 - pan / 2) * 2, s * (0.5 + pan / 2) * 2, 0.45);
  }
}

// ---- pulse: soft kick and hats through the campus acts ----
for (let k = 0; k * BEAT < DUR; k++) {
  const t0 = k * BEAT; const a = actAt(t0);
  if (a < 3 || a > 5) continue;
  if (k % 2 === 0) {
    let ph = 0;
    for (let i = Math.floor(t0 * SR), j = 0; j < SR * 0.5 && i < N; i++, j++) {
      const u = j / SR; ph += (48 + 80 * Math.exp(-u * 30)) / SR;
      const s = Math.sin(2 * Math.PI * ph) * Math.exp(-u * 8) * 0.16 * INTENSITY[a];
      add(i, s, s);
    }
  }
  // hat on the off-beat: a short burst of bright noise
  let prev = 0;
  for (let i = Math.floor((t0 + BEAT / 2) * SR), j = 0; j < SR * 0.05 && i < N; i++, j++) {
    const n = rnd() * 2 - 1; const hp = n - prev; prev = n;
    const s = hp * Math.exp(-j / SR * 70) * 0.018 * INTENSITY[a];
    add(i, s * 0.8, s * 1.2, 0.2);
  }
}

// ---- risers into each act, and a low boom on the cut ----
for (const d of T.dips) {
  let lp = 0;
  for (let i = Math.floor((d - 2.6) * SR); i < Math.floor(d * SR); i++) {
    const u = (i / SR - (d - 2.6)) / 2.6; const k = 0.01 + 0.18 * u * u;
    lp += k * ((rnd() * 2 - 1) - lp);
    const s = lp * 0.16 * u * u * Math.min(1, (d - i / SR) / 0.08);
    add(i, s, s, 0.6);
  }
  let ph = 0;
  for (let i = Math.floor((d + 0.02) * SR), j = 0; j < SR * 2.2 && i < N; i++, j++) {
    const u = j / SR; ph += (38 + 20 * Math.exp(-u * 6)) / SR;
    const s = Math.sin(2 * Math.PI * ph) * Math.exp(-u * 1.6) * 0.2;
    add(i, s, s, 0.3);
  }
}
// the closing title: a bright swell (the chord an octave up) and a boom
{
  const t0 = finaleTitle; const ch = PROG[0];
  const voices = ch.notes.map((m) => ({ f: hz(m + 12), ph: rnd() }));
  for (let i = Math.floor((t0 - 3) * SR); i < Math.min(N, Math.floor((t0 + 11) * SR)); i++) {
    const u = i / SR - (t0 - 3);
    const env = Math.min(1, u / 3) ** 2 * Math.min(1, Math.max(0, (14 - u) / 6));
    let s = 0;
    for (const v of voices) { v.ph += v.f / SR; s += look(PAD, v.ph); }
    add(i, s * 0.03 * env, s * 0.03 * env, 0.7);
  }
}

// ---- wind (filtered noise, gusting) and birds (morning and the temple) ----
{
  let b = 0; let lp = 0; let low = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    b = 0.997 * b + 0.02 * (rnd() * 2 - 1);
    lp += 0.05 * (b - lp);
    low += 0.004 * (lp - low); // take the rumble out
    const air0 = lp - low;
    const air = t < 10 || actAt(t) === 1 || actAt(t) === 6 ? 1 : 0.55;
    const gust = 0.6 + 0.4 * Math.sin(2 * Math.PI * t / 9.3) * Math.sin(2 * Math.PI * t / 4.1);
    const s = air0 * 0.12 * air * gust;
    add(i, s * (1 + 0.3 * Math.sin(t * 0.7)), s * (1 - 0.3 * Math.sin(t * 0.7)));
  }
}
const chirp = (t0, pan) => {
  const n = 2 + Math.floor(rnd() * 3); const base = 2600 + rnd() * 1400;
  for (let c = 0; c < n; c++) {
    let ph = 0; const st = t0 + c * 0.11;
    for (let i = Math.floor(st * SR), j = 0; j < SR * 0.07 && i < N; i++, j++) {
      const u = j / SR; ph += (base + 1800 * u / 0.07) / SR;
      const s = Math.sin(2 * Math.PI * ph) * Math.sin(Math.PI * u / 0.07) * 0.035;
      add(i, s * (1 - pan), s * (1 + pan), 0.5);
    }
  }
};
for (let t = 1; t < DUR; t += 0.8 + rnd() * 2.2) {
  const a = actAt(t);
  if (a <= 2 || (a === 5 && rnd() < 0.5) || (a === 4 && rnd() < 0.25)) chirp(t, rnd() * 1.4 - 0.7);
}

// ---- reverb on the send (Freeverb-style: parallel combs into allpasses) ----
const reverb = (inp, spread) => {
  const out = new Float32Array(N);
  const combs = [1557, 1617, 1491, 1422, 1277, 1356].map((d) => ({ buf: new Float32Array(Math.round((d + spread) * SR / 44100)), i: 0, f: 0 }));
  for (let i = 0; i < N; i++) {
    let s = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.f = y * 0.6 + c.f * 0.4;
      c.buf[c.i] = inp[i] + c.f * 0.86;
      c.i = (c.i + 1) % c.buf.length;
      s += y;
    }
    out[i] = s / combs.length;
  }
  for (const d of [556, 441, 341]) {
    const buf = new Float32Array(Math.round((d + spread) * SR / 44100)); let k = 0;
    for (let i = 0; i < N; i++) { const b = buf[k]; const x = out[i]; buf[k] = x + b * 0.5; out[i] = b - x; k = (k + 1) % buf.length; }
  }
  return out;
};
const wetL = reverb(sendL, 0); const wetR = reverb(sendR, 23);

// ---- mix, fades, normalise ----
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fade = Math.min(1, t / 2.5) * Math.min(1, Math.max(0, (T.duration + 0.5 - t) / 4));
  L[i] = (L[i] + wetL[i] * 0.9) * fade; R[i] = (R[i] + wetR[i] * 0.9) * fade;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const g = 0.89 / peak;
const wav = Buffer.alloc(44 + N * 4);
wav.write('RIFF', 0); wav.writeUInt32LE(36 + N * 4, 4); wav.write('WAVE', 8); wav.write('fmt ', 12);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22); wav.writeUInt32LE(SR, 24); wav.writeUInt32LE(SR * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  wav.writeInt16LE(Math.round(Math.tanh(L[i] * g) * 32000), 44 + i * 4);
  wav.writeInt16LE(Math.round(Math.tanh(R[i] * g) * 32000), 46 + i * 4);
}
writeFileSync(outPath, wav);
console.log(`score: ${DUR.toFixed(1)} s, ${acts.length - 1} acts, peak gain ${g.toFixed(2)} → ${outPath}`);
