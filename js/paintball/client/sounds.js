// Playful paintball sounds made with WebAudio (no recordings, nothing that sounds like a real firearm):
// a soft "pop" per paintball, a wet "splat" on impact, a "ding" hit marker and a little tag jingle.
let ctx = null; let master = null;
function ac() {
  if (!ctx) {
    const A = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!A) return null;
    ctx = new A(); master = ctx.createGain(); master.gain.value = 0.35; master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
let noiseBuf = null;
function noise(c) {
  if (noiseBuf) return noiseBuf;
  noiseBuf = c.createBuffer(1, c.sampleRate * 0.3, c.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}
function env(c, g, t, a, peak, dur) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }

// pitch: 0.6–1.6 (blasters sound different), vol by distance
export function pop(pitch = 1, vol = 1) {
  const c = ac(); if (!c || vol < 0.02) return;
  const t = c.currentTime; const o = c.createOscillator(); const g = c.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(520 * pitch, t); o.frequency.exponentialRampToValueAtTime(140 * pitch, t + 0.09);
  env(c, g, t, 0.004, 0.5 * vol, 0.12); o.connect(g).connect(master); o.start(t); o.stop(t + 0.14);
}
export function splat(vol = 1) {
  const c = ac(); if (!c || vol < 0.02) return;
  const t = c.currentTime; const s = c.createBufferSource(); s.buffer = noise(c);
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(1600, t); f.frequency.exponentialRampToValueAtTime(220, t + 0.15);
  const g = c.createGain(); env(c, g, t, 0.003, 0.4 * vol, 0.18);
  s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + 0.2);
}
export function ding(precision = false) {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  for (const [f, d] of precision ? [[1320, 0], [1760, 0.05]] : [[1046, 0]]) {
    const o = c.createOscillator(); const g = c.createGain(); o.type = 'triangle'; o.frequency.value = f;
    env(c, g, t + d, 0.004, 0.25, 0.16); o.connect(g).connect(master); o.start(t + d); o.stop(t + d + 0.18);
  }
}
export function jingle(good = true) {
  const c = ac(); if (!c) return;
  const t = c.currentTime; const notes = good ? [523, 659, 784, 1046] : [392, 330, 262];
  notes.forEach((f, i) => { const o = c.createOscillator(); const g = c.createGain(); o.type = 'square'; o.frequency.value = f; env(c, g, t + i * 0.09, 0.005, 0.12, 0.14); o.connect(g).connect(master); o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.16); });
}
export function beep(high = false) {
  const c = ac(); if (!c) return;
  const t = c.currentTime; const o = c.createOscillator(); const g = c.createGain(); o.type = 'sine'; o.frequency.value = high ? 880 : 440;
  env(c, g, t, 0.005, 0.3, high ? 0.4 : 0.15); o.connect(g).connect(master); o.start(t); o.stop(t + 0.45);
}
export const unlockAudio = () => ac();
