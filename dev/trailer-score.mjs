// The trailer score: an original cue for the "Play with BITSians" trailer (dev/make-trailer.mjs), synthesised from
// scratch like dev/film-score.mjs (no samples, no third-party audio), but written to the trailer's own timeline: the
// beat grid is anchored on "match started", the hits land on the cuts and impacts the edit decision list names, it
// rises through the escalation, stops dead before the last tag, and resolves to D major under the champion card and
// the end card. Sound effects (countdown beeps, paint splats, crate dings, whooshes, the drop thud, the shield hum)
// are regenerated on the trailer timeline, so they stay in sync after the retiming.
//
//   node dev/trailer-score.mjs cues.json out.wav
//
// cues.json (written by make-trailer.mjs): { duration, go, major, stop, end, acts: [{ t, level }],
//   events: [{ t, kind, g }] } where kind is hit | big | riser | whoosh | splat | ding | beep | go | thud | shield | logo.
import { readFileSync, writeFileSync } from 'node:fs';

const [, , cuesPath, outPath] = process.argv;
const C = JSON.parse(readFileSync(cuesPath, 'utf8'));
const SR = 48000;
const DUR = C.duration + 0.5;
const N = Math.ceil(DUR * SR);
const L = new Float32Array(N); const R = new Float32Array(N);
const sendL = new Float32Array(N); const sendR = new Float32Array(N);

let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const BPM = 120; const BEAT = 60 / BPM; const BAR = 4 * BEAT;
const grid = (t) => (t - C.go) / BEAT; // beats from "match started" (negative before it)
const level = (t) => { let v = 0; for (const a of C.acts) if (t >= a.t) v = a.level; return v; };
const major = (t) => t >= C.major;
const stopped = (t) => t >= C.stop && t < C.major; // the held breath before the last tag, and its ring-out
const add = (i, l, r, send = 0) => { if (i < 0 || i >= N) return; L[i] += l; R[i] += r; sendL[i] += l * send; sendR[i] += r * send; };

const TBL = 4096;
const table = (harm) => { const w = new Float32Array(TBL + 1); for (let i = 0; i <= TBL; i++) { let v = 0; harm.forEach(([h, a]) => { v += a * Math.sin(2 * Math.PI * h * i / TBL); }); w[i] = v; } let m = 0; for (const v of w) m = Math.max(m, Math.abs(v)); for (let i = 0; i <= TBL; i++) w[i] /= m; return w; };
const PAD = table([[1, 1], [2, 0.5], [3, 0.33], [4, 0.2], [5, 0.14], [6, 0.08], [7, 0.05]]);
const BRASS = table([[1, 1], [2, 0.8], [3, 0.6], [4, 0.45], [5, 0.3], [6, 0.2], [8, 0.1]]);
const look = (w, ph) => { const x = (ph - Math.floor(ph)) * TBL; const i = x | 0; return w[i] + (w[i + 1] - w[i]) * (x - i); };

// i – VI – III – VII in D minor, one chord per bar from the match start (two bars each before it); I – V – vi – IV after
const MINOR = [{ bass: 38, notes: [62, 65, 69, 74] }, { bass: 34, notes: [58, 62, 65, 70] }, { bass: 41, notes: [60, 65, 69, 72] }, { bass: 36, notes: [60, 64, 67, 72] }];
const MAJOR = [{ bass: 38, notes: [62, 66, 69, 74] }, { bass: 33, notes: [61, 64, 69, 73] }, { bass: 35, notes: [59, 62, 66, 71] }, { bass: 31, notes: [59, 62, 67, 71] }];
const chordIndex = (t) => { if (major(t)) return Math.floor((t - C.major) / (2 * BAR)) % 4; const b = Math.floor(grid(t) / 4); return ((b < 0 ? Math.floor(b / 2) : b) % 4 + 4) % 4; };
const chordAt = (t) => (major(t) ? MAJOR : MINOR)[chordIndex(t)];

// ---- pad: re-voiced on every chord change ----
{
  const changes = [0];
  for (let t = 0.02; t < DUR; t += 0.02) if (chordIndex(t) !== chordIndex(changes.at(-1)) || major(t) !== major(changes.at(-1))) changes.push(t);
  changes.push(DUR);
  for (let c = 0; c < changes.length - 1; c++) {
    const t0 = changes[c]; const len = changes[c + 1] - t0 + 1.6;
    const voices = chordAt(t0 + 0.01).notes.flatMap((m, k) => [-7, 7].map((cents) => ({ f: hz(m) * 2 ** (cents / 1200), pan: (k / 3 - 0.5) * 0.8 + cents / 50, ph: rnd() })));
    for (let i = Math.floor(t0 * SR), j = 0; i < Math.min(N, Math.floor((t0 + len) * SR)); i++, j++) {
      const t = i / SR; const u = j / SR;
      const env = Math.min(1, u / 0.9) * Math.min(1, Math.max(0, (len - u) / 1.6));
      const g = 0.045 * (0.45 + 0.6 * level(t)) * env * (stopped(t) ? 0.15 : 1) * (major(t) ? 1.3 : 1);
      let l = 0; let r = 0;
      for (const v of voices) { v.ph += v.f / SR; const s = look(PAD, v.ph); l += s * (0.5 - v.pan * 0.5); r += s * (0.5 + v.pan * 0.5); }
      add(i, l * g, r * g, 0.6);
    }
  }
}

// ---- pulse (build-up: 8ths) and ostinato (escalation: 16ths), locked to the grid ----
for (let k = Math.ceil(grid(0) * 4); ; k++) {
  const t0 = C.go + k * BEAT / 4; if (t0 > C.duration - 1) break; if (t0 < 0) continue;
  const lv = level(t0); if (lv < 0.3 || stopped(t0) || t0 > C.major - 0.05 && t0 < C.major + 2 * BAR) continue;
  if (t0 < C.go && k % 2) continue; // 8ths before the match starts
  const ch = chordAt(t0); const pat = [0, 0, 12, 0, 0, 7, 0, 12];
  const f = hz(ch.bass + 12 + pat[((k % 8) + 8) % 8]);
  const vel = (k % 4 === 0 ? 1 : 0.62) * 0.055 * lv * (major(t0) ? 0.6 : 1);
  let ph = 0; let lp = 0;
  for (let i = Math.floor(t0 * SR), j = 0; j < SR * 0.16 && i < N; i++, j++) {
    const u = j / SR; ph += f / SR;
    const saw = 2 * (ph - Math.floor(ph)) - 1; lp += (0.08 + 0.3 * Math.exp(-u * 30)) * (saw - lp);
    const s = lp * vel * Math.exp(-u / 0.07) * Math.min(1, u / 0.003);
    add(i, s * 0.9, s * 1.1, 0.15);
  }
}

// ---- drums ----
const boom = (t0, g) => { let ph = 0; for (let i = Math.floor(t0 * SR), j = 0; j < SR * 0.9 && i < N; i++, j++) { const u = j / SR; ph += (42 + 70 * Math.exp(-u * 25)) / SR; const s = Math.sin(2 * Math.PI * ph) * Math.exp(-u * 4.5) * g; add(i, s, s, 0.25); } let lp = 0; for (let i = Math.floor(t0 * SR), j = 0; j < SR * 0.12 && i < N; i++, j++) { lp += 0.2 * ((rnd() * 2 - 1) - lp); const s = lp * Math.exp(-j / SR * 40) * g * 0.8; add(i, s, s, 0.3); } };
const clap = (t0, g) => { for (const d of [0, 0.012, 0.024]) { let prev = 0; for (let i = Math.floor((t0 + d) * SR), j = 0; j < SR * 0.09 && i < N; i++, j++) { const n = rnd() * 2 - 1; const hp = n - prev; prev = n; const s = hp * Math.exp(-j / SR * 45) * g; add(i, s * 0.9, s * 1.1, 0.5); } } };
const hat = (t0, g) => { let prev = 0; for (let i = Math.floor(t0 * SR), j = 0; j < SR * 0.04 && i < N; i++, j++) { const n = rnd() * 2 - 1; const hp = n - prev; prev = n; const s = hp * Math.exp(-j / SR * 90) * g; add(i, s * 1.1, s * 0.9, 0.2); } };
for (let k = Math.ceil(grid(0) * 2); ; k++) {
  const t0 = C.go + k * BEAT / 2; if (t0 > C.duration - 1) break; if (t0 < 0) continue;
  const lv = level(t0); if (stopped(t0) || t0 > C.major - 0.05 && t0 < C.major + 2 * BAR) continue;
  const e = ((k % 16) + 16) % 16; // eighths in a two-bar phrase
  if (t0 < C.go) { if (lv >= 0.45 && e % 8 === 0) boom(t0, 0.22 * lv); continue; }
  if (e % 8 === 0 || e === 12 || (lv > 0.85 && (e === 6 || e === 14 || e === 11))) boom(t0, 0.3 * lv);
  if (e % 8 === 4) clap(t0, 0.06 * lv);
  if (lv > 0.7 && !major(t0)) hat(t0, 0.025 * lv * (e % 2 ? 0.6 : 1));
  if (major(t0) && e % 4 === 2) hat(t0, 0.02);
}

// ---- accents: braams, risers, whooshes and the sound effects, from the edit ----
const braam = (t0, g = 1, root = 38) => {
  const vs = [root, root + 0.08, root + 12, root + 7 + 12].map((m) => ({ f: hz(m), ph: rnd() }));
  for (let i = Math.floor(t0 * SR), j = 0; j < SR * 3.2 && i < N; i++, j++) {
    const u = j / SR; const env = Math.min(1, u / 0.06) * Math.exp(-u / 1.3);
    let s = 0; for (const v of vs) { v.ph += v.f / SR; s += look(BRASS, v.ph); }
    s *= 0.05 * g * env; add(i, s, s, 0.6);
  }
  boom(t0, 0.45 * g);
};
const noise = (t0, len, g, { k0 = 0.02, k1 = 0.3, curve = 2, send = 0.5, pan = 0 } = {}) => { // a filtered noise swell (riser/whoosh)
  let lp = 0;
  for (let i = Math.floor(t0 * SR), j = 0; j < len * SR && i < N; i++, j++) {
    const u = j / (len * SR); lp += (k0 + (k1 - k0) * u ** curve) * ((rnd() * 2 - 1) - lp);
    const s = lp * g * Math.sin(Math.PI * Math.min(1, u * 1.15)) ** 2; add(i, s * (1 - pan), s * (1 + pan), send);
  }
};
const riser = (t1, len, g = 1) => { let lp = 0; for (let i = Math.max(0, Math.floor((t1 - len) * SR)); i < Math.min(N, Math.floor(t1 * SR)); i++) { const u = (i / SR - (t1 - len)) / len; lp += (0.01 + 0.25 * u * u) * ((rnd() * 2 - 1) - lp); const s = lp * 0.16 * g * u * u * Math.min(1, (t1 - i / SR) / 0.04); add(i, s, s, 0.6); } };
const tone = (t0, f, len, g, { decay = 0.15, send = 0.4, f1 = f } = {}) => { let ph = 0; for (let i = Math.floor(t0 * SR), j = 0; j < len * SR && i < N; i++, j++) { const u = j / SR; ph += (f + (f1 - f) * u / len) / SR; const s = Math.sin(2 * Math.PI * ph) * Math.exp(-u / decay) * Math.min(1, u / 0.003) * g; add(i, s, s, send); } };
const splat = (t0, g = 1) => { // a wet paint burst: a thump, a noisy smack and a few droplets
  tone(t0, 95, 0.25, 0.28 * g, { decay: 0.07, f1: 50, send: 0.2 });
  let lp = 0; for (let i = Math.floor(t0 * SR), j = 0; j < SR * 0.22 && i < N; i++, j++) { lp += 0.35 * ((rnd() * 2 - 1) - lp); const s = lp * Math.exp(-j / SR * 22) * 0.22 * g; add(i, s * 0.9, s * 1.1, 0.35); }
  for (let d = 0; d < 5; d++) tone(t0 + 0.05 + rnd() * 0.25, 900 + rnd() * 1400, 0.06, 0.03 * g, { decay: 0.02, send: 0.5 });
};
for (const e of C.events) {
  const g = e.g ?? 1;
  if (e.kind === 'hit') braam(e.t, 0.9 * g);
  else if (e.kind === 'big') { braam(e.t, 1.3 * g); braam(e.t, 0.6 * g, 26); }
  else if (e.kind === 'logo') { braam(e.t, 1.2 * g, 38); boom(e.t, 0.5); }
  else if (e.kind === 'riser') riser(e.t, e.len ?? 2.4, g);
  else if (e.kind === 'whoosh') noise(e.t - 0.18, 0.42, 0.22 * g, { k0: 0.03, k1: 0.5, curve: 1, pan: 0.3 });
  else if (e.kind === 'splat') splat(e.t, g);
  else if (e.kind === 'ding') { tone(e.t, hz(88), 0.5, 0.05 * g, { decay: 0.18 }); tone(e.t, hz(95), 0.4, 0.025 * g, { decay: 0.12 }); }
  else if (e.kind === 'beep') tone(e.t, 880, 0.25, 0.07 * g, { decay: 0.1 });
  else if (e.kind === 'go') { tone(e.t, 1760, 0.6, 0.07 * g, { decay: 0.25 }); }
  else if (e.kind === 'thud') { boom(e.t, 0.6 * g); noise(e.t, 0.5, 0.12 * g, { k0: 0.2, k1: 0.02 }); }
  else if (e.kind === 'shield') { for (const f of [220, 330.5, 441]) tone(e.t, f, 1.6, 0.03 * g, { decay: 0.9, send: 0.6, f1: f * 1.02 }); }
  else if (e.kind === 'pop') noise(e.t, 0.05, 0.12 * g, { k0: 0.5, k1: 0.2, curve: 1, send: 0.1 });
}

// ---- the ending: bright arpeggios over the major chords ----
const PATTERN = [0, 2, 1, 3, 2, 1, 3, 2];
for (let k = 0; ; k++) {
  const t0 = C.major + 2 * BAR + k * BEAT / 2; if (t0 > C.duration - 1.5) break;
  const m = chordAt(t0).notes[PATTERN[k % 8]] + 12; const f = hz(m); const vel = (k % 2 ? 0.7 : 1) * 0.045;
  const pan = Math.sin(k * 0.9) * 0.45; let ph = 0;
  for (let i = Math.floor(t0 * SR), j = 0; j < SR * 1.4 && i < N; i++, j++) { const u = j / SR; ph += f / SR; const s = look(PAD, ph) * vel * Math.exp(-u / 0.3) * Math.min(1, u / 0.004); add(i, s * (1 - pan), s * (1 + pan), 0.5); }
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
  const t = i / SR; const fade = Math.min(1, t / 0.05) * Math.min(1, Math.max(0, (C.duration - t) / 2.5));
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
console.log(`trailer score: ${DUR.toFixed(1)} s, ${C.events.length} cues, peak gain ${g.toFixed(2)} → ${outPath}`);
