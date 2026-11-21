// The film's overlay and player: letterbox, titles, scene captions, dialogue captions with speaker names, the
// story's game-style overlays (group chat, plan, character cards, equipment, the in-story lobby, team intros,
// countdown, match HUD, scoreboard), clickable hotspots on 3D places, and the player controls (play/pause, scrub
// bar with chapter markers, chapters, previous/next, captions, mute, voices, replay, exit). Sound effects are
// synthesised with WebAudio (playful pops and splats, a whistle, beeps, cheers); dialogue can be spoken with the
// Web Speech API. Everything is drawn from the film time, so it follows seeking.
import * as THREE from 'three';
import { CAST, CAST_BY_ID, SPEAKER_COLOUR, teamColour } from './cast.js';
import { EQUIPMENT, EQUIPMENT_BY_ID } from '../paintball/equipment.js';
import { MEDC } from '../paintball/arena.js';
import { TEAMS } from '../paintball/rules.js';

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const fmt = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KEY = 'pwb.film';
const PREFS = 'pwb.film.prefs';
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};
// Where the viewer left the film (for "Resume the film" on the title screen), or null.
export function savedFilmPosition() { const s = store.get(KEY); return s && s.t > 3 && (!s.d || s.t < s.d - 4) ? s : null; }

const STYLE = `
#film { position: fixed; inset: 0; z-index: 50; color: #fff; font-family: 'Avenir Next', 'Futura', 'Helvetica Neue', system-ui, sans-serif; overflow: hidden; pointer-events: none; -webkit-tap-highlight-color: transparent; }
#film .stage { position: absolute; inset: 0; pointer-events: auto; cursor: pointer; }
#film.capture .stage { display: none; }
#film .lb { position: absolute; left: 0; right: 0; height: 8vh; background: #000; }
#film .lb.top { top: 0; } #film .lb.bot { bottom: 0; }
@media (max-aspect-ratio: 1/1) { #film .lb { height: 4vh; } }
#film .fade { position: absolute; inset: 0; background: #000; opacity: 0; }
#film .wipe { position: absolute; inset: -10% -60%; background: linear-gradient(100deg, transparent 0 30%, #ff3d7f 30% 42%, #ffd23d 42% 50%, #30d5ff 50% 62%, transparent 62%); transform: translateX(-120%); opacity: 0.95; }
#film .title { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); text-align: center; text-shadow: 0 4px 30px rgba(0,0,0,0.55); opacity: 0; padding: 0 16px; }
#film .title h1 { margin: 0; font-weight: 800; font-size: clamp(28px, 8.5vh, 96px); letter-spacing: 0.24em; padding-left: 0.24em; line-height: 1.1; }
#film .title p { margin: 3vh 0 0; font-weight: 600; font-size: clamp(12px, 2.3vh, 22px); letter-spacing: 0.3em; text-transform: uppercase; text-shadow: 0 2px 14px rgba(0,0,0,0.8); }
#film .cap { position: absolute; left: 5vw; top: 13vh; text-shadow: 0 2px 16px rgba(0,0,0,0.6); opacity: 0; }
#film .cap .k { font-size: clamp(10px, 1.7vh, 16px); letter-spacing: 0.38em; text-transform: uppercase; font-weight: 700; color: #ffd23d; }
#film .cap .n { font-size: clamp(20px, 4.4vh, 46px); font-weight: 800; letter-spacing: 0.03em; margin-top: 0.5vh; }
#film .cap .rule { height: 3px; background: linear-gradient(90deg, #ff3d7f, #ffd23d, #30d5ff, rgba(48,213,255,0)); margin-top: 1vh; border-radius: 2px; }
#film .line { position: absolute; left: 50%; bottom: calc(8vh + 74px); transform: translateX(-50%); max-width: min(88vw, 900px); text-align: center; font-size: clamp(15px, 2.6vh, 26px); font-weight: 600; line-height: 1.35; background: rgba(10,12,24,0.62); padding: 0.45em 0.9em; border-radius: 12px; opacity: 0; backdrop-filter: blur(4px); }
#film.capture .line { bottom: 11vh; }
#film .line b { display: block; font-size: 0.68em; letter-spacing: 0.22em; text-transform: uppercase; margin-bottom: 0.15em; }
#film.nocc .line { display: none; }
#film .hud { position: absolute; top: calc(8vh + 10px); left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 10px; opacity: 0; font-weight: 800; }
#film .hud .sc { min-width: 3.2em; padding: 0.25em 0.7em; border-radius: 999px; font-size: clamp(14px, 2.6vh, 26px); color: #101321; text-align: center; box-shadow: 0 3px 0 rgba(0,0,0,0.25); }
#film .hud .sc small { font-size: 0.55em; letter-spacing: 0.15em; display: block; margin-top: -0.2em; }
#film .hud .tm { font-size: clamp(18px, 3.6vh, 36px); background: rgba(10,12,24,0.75); padding: 0.15em 0.6em; border-radius: 12px; font-variant-numeric: tabular-nums; border: 2px solid rgba(255,255,255,0.25); }
#film .hud .tm.low { color: #ff6b6b; border-color: #ff6b6b; }
#film .feed { position: absolute; right: 2.5vw; top: calc(8vh + 12px); display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }
#film .feed div { background: rgba(10,12,24,0.7); border-radius: 8px; padding: 4px 10px; font-size: clamp(11px, 1.8vh, 17px); font-weight: 700; white-space: nowrap; }
#film .feed i { font-style: normal; opacity: 0.7; margin: 0 6px; }
#film .bang { position: absolute; left: 50%; top: 36%; transform: translate(-50%, -50%) scale(1); font-weight: 900; font-size: clamp(26px, 7vh, 72px); letter-spacing: 0.06em; opacity: 0; text-shadow: 0 4px 0 rgba(0,0,0,0.35), 0 0 30px rgba(255,255,255,0.3); white-space: nowrap; -webkit-text-stroke: 2px rgba(0,0,0,0.35); }
#film .pnl { position: absolute; opacity: 0; }
#film .glass { background: rgba(12,14,30,0.78); border: 1px solid rgba(255,255,255,0.16); border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.35); backdrop-filter: blur(8px); }
#film .chat { right: 4vw; top: 50%; transform: translateY(-50%); width: min(300px, 40vw); padding: 12px; border-radius: 26px; border: 3px solid #2d3436; background: rgba(245,246,250,0.96); color: #1e272e; }
#film .chat h4 { margin: 0 0 8px; font-size: 13px; text-align: center; }
#film .chat .m { margin: 5px 0; padding: 6px 10px; border-radius: 12px; background: #dfe6e9; font-size: 12.5px; max-width: 88%; }
#film .chat .m b { display: block; font-size: 10.5px; }
#film .chat .m.me { margin-left: auto; background: #c7f5d9; }
#film .plan { left: 50%; top: 47%; transform: translate(-50%, -50%); width: min(620px, 86vw); padding: 14px 16px; }
#film .plan h4, #film .lobby h4 { margin: 0 0 8px; font-size: clamp(13px, 2.1vh, 18px); letter-spacing: 0.12em; text-transform: uppercase; }
#film .plan svg { width: 100%; height: auto; display: block; }
#film .plan .row { display: flex; gap: 10px; flex-wrap: wrap; font-size: 12.5px; margin-top: 8px; }
#film .chip { display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border-radius: 999px; background: rgba(255,255,255,0.12); font-size: 11.5px; font-weight: 600; white-space: nowrap; }
#film .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
#film .cards { left: 50%; bottom: calc(8vh + 70px); transform: translateX(-50%); display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; width: min(1100px, 94vw); }
#film .card { width: 96px; padding: 8px; border-radius: 12px; background: rgba(12,14,30,0.8); border-top: 4px solid; font-size: 11px; transition: transform 0.3s, opacity 0.3s; }
#film .card b { display: block; font-size: 14px; }
#film .card.off { opacity: 0.25; transform: translateY(8px); }
#film .equip { left: 3vw; top: 50%; transform: translateY(-50%); width: min(300px, 44vw); padding: 10px; display: flex; flex-direction: column; gap: 6px; }
#film .eq { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 10px; font-size: 12px; transition: background 0.25s, transform 0.25s; }
#film .eq.on { background: rgba(255,255,255,0.16); transform: translateX(6px); }
#film .eq .sw { width: 14px; height: 30px; border-radius: 5px; flex: none; }
#film .eq b { display: block; font-size: 12.5px; }
#film .eq small { opacity: 0.75; }
#film .lobby { left: 50%; top: 48%; transform: translate(-50%, -50%); width: min(760px, 92vw); padding: 14px 16px; }
#film .lobby .story { display: inline-block; background: #ffd23d; color: #1e272e; font-weight: 800; font-size: 11px; letter-spacing: 0.08em; padding: 3px 8px; border-radius: 6px; margin-bottom: 6px; }
#film .lobby .meta { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
#film .lobby .teams { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
#film .lobby .team { border-radius: 12px; padding: 8px; background: rgba(255,255,255,0.06); border-top: 4px solid; }
#film .lobby .p { display: flex; align-items: center; gap: 8px; padding: 5px 4px; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.07); }
#film .lobby .p .nm { font-weight: 700; min-width: 4.5em; }
#film .lobby .p .rd { margin-left: auto; font-weight: 800; color: #7cff4f; opacity: 0; transform: scale(0.4); transition: all 0.25s; }
#film .lobby .p .rd.on { opacity: 1; transform: scale(1); }
#film .lobby .p .eqs { display: flex; gap: 4px; flex-wrap: wrap; }
#film .lobby .foot { margin-top: 10px; display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 12.5px; flex-wrap: wrap; }
#film .lobby .go { background: #7cff4f; color: #102010; font-weight: 800; padding: 6px 14px; border-radius: 10px; }
#film .teamcard { top: 50%; width: min(260px, 40vw); padding: 12px; transform: translateY(-50%); }
#film .teamcard.l { left: 3vw; } #film .teamcard.r { right: 3vw; }
#film .teamcard h4 { margin: 0 0 6px; font-size: clamp(16px, 3vh, 26px); font-weight: 900; letter-spacing: 0.1em; }
#film .teamcard .p { display: flex; justify-content: space-between; gap: 6px; font-size: 13px; padding: 3px 0; }
#film .count { left: 50%; top: 27%; transform: translate(-50%, -50%); font-size: clamp(60px, 22vh, 220px); font-weight: 900; text-shadow: 0 6px 0 rgba(0,0,0,0.3); -webkit-text-stroke: 3px rgba(0,0,0,0.25); }
#film .score { left: 50%; top: 46%; transform: translate(-50%, -50%); width: min(560px, 90vw); padding: 14px 18px; text-align: center; }
#film .score .win { font-size: clamp(24px, 5vh, 48px); font-weight: 900; letter-spacing: 0.08em; }
#film .score .big { display: flex; justify-content: center; align-items: center; gap: 16px; font-size: clamp(30px, 6vh, 58px); font-weight: 900; margin: 6px 0 10px; }
#film .score table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
#film .score td { padding: 3px 6px; border-bottom: 1px solid rgba(255,255,255,0.08); }
#film .flash { inset: 0; background: #fff; }
#film .hots { position: absolute; inset: 0; }
#film .hot { position: absolute; transform: translate(-50%, -50%); pointer-events: auto; display: flex; align-items: center; gap: 6px; background: none; border: 0; padding: 6px; color: #fff; cursor: pointer; font: inherit; font-weight: 700; font-size: clamp(11px, 1.7vh, 15px); text-shadow: 0 1px 6px rgba(0,0,0,0.9); }
#film .hot .ring { width: 20px; height: 20px; border-radius: 50%; background: #fff; border: 4px solid #ff3d7f; box-shadow: 0 0 0 0 rgba(255,61,127,0.7); animation: pwbPulse 1.6s infinite; flex: none; }
#film .hot span.l { background: rgba(10,12,24,0.68); padding: 3px 8px; border-radius: 8px; white-space: nowrap; }
@keyframes pwbPulse { 0% { box-shadow: 0 0 0 0 rgba(255,61,127,0.75); } 70% { box-shadow: 0 0 0 14px rgba(255,61,127,0); } 100% { box-shadow: 0 0 0 0 rgba(255,61,127,0); } }
#film .info { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(440px, 92vw); max-height: 80vh; overflow: auto; padding: 18px; pointer-events: auto; z-index: 3; }
#film .info h3 { margin: 0 0 8px; font-size: 20px; }
#film .info p { margin: 0 0 12px; line-height: 1.45; font-size: 14.5px; opacity: 0.92; }
#film .info .msg { background: rgba(255,210,61,0.16); border-left: 3px solid #ffd23d; padding: 8px 10px; border-radius: 6px; font-size: 13.5px; }
#film .btns { display: flex; gap: 8px; flex-wrap: wrap; }
#film button.fb { pointer-events: auto; font: inherit; font-weight: 700; font-size: 14px; color: #fff; background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.22); border-radius: 10px; padding: 9px 14px; cursor: pointer; }
#film button.fb.primary { background: #ff3d7f; border-color: #ff3d7f; }
#film button.fb:hover { filter: brightness(1.15); }
#film .ctl { position: absolute; left: 0; right: 0; bottom: 0; padding: 22px 16px max(10px, env(safe-area-inset-bottom)); background: linear-gradient(transparent, rgba(0,0,0,0.75)); pointer-events: auto; transition: opacity 0.35s; display: flex; flex-direction: column; gap: 6px; z-index: 2; }
#film.capture .ctl, #film.capture .hots, #film.capture .bigplay { display: none; }
#film.idle .ctl { opacity: 0; pointer-events: none; }
#film.idle { cursor: none; }
#film .bar { position: relative; height: 22px; cursor: pointer; touch-action: none; }
#film .bar .tr { position: absolute; left: 0; right: 0; top: 9px; height: 5px; border-radius: 3px; background: rgba(255,255,255,0.25); }
#film .bar .fill { position: absolute; left: 0; top: 9px; height: 5px; border-radius: 3px; background: linear-gradient(90deg, #ff3d7f, #ffd23d, #30d5ff); }
#film .bar .knob { position: absolute; top: 4px; width: 15px; height: 15px; margin-left: -7px; border-radius: 50%; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.5); }
#film .bar .mk { position: absolute; top: 5px; width: 3px; height: 13px; margin-left: -1px; background: rgba(255,255,255,0.85); border-radius: 2px; }
#film .bar .tip { position: absolute; bottom: 24px; transform: translateX(-50%); background: rgba(10,12,24,0.9); padding: 3px 8px; border-radius: 6px; font-size: 12px; white-space: nowrap; display: none; }
#film .bar:hover .tip { display: block; }
#film .row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
#film .row .sp { flex: 1; }
#film .row .tm { font-size: 13px; font-variant-numeric: tabular-nums; opacity: 0.9; white-space: nowrap; }
#film .row .ch { font-size: 13px; opacity: 0.85; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 32vw; }
#film .ic { pointer-events: auto; background: rgba(255,255,255,0.1); border: 0; color: #fff; font: inherit; font-size: 16px; min-width: 40px; height: 38px; border-radius: 10px; cursor: pointer; padding: 0 10px; }
#film .ic:hover { background: rgba(255,255,255,0.22); }
#film .ic.off { opacity: 0.5; text-decoration: line-through; }
#film .chapters { position: absolute; right: 16px; bottom: 110px; width: min(340px, 92vw); padding: 8px; pointer-events: auto; z-index: 3; }
#film .chapters button { display: flex; width: 100%; justify-content: space-between; gap: 8px; text-align: left; background: none; border: 0; color: #fff; font: inherit; font-size: 14px; padding: 9px 10px; border-radius: 8px; cursor: pointer; }
#film .chapters button:hover, #film .chapters button.on { background: rgba(255,255,255,0.14); }
#film .bigplay { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 84px; height: 84px; border-radius: 50%; background: rgba(10,12,24,0.6); display: grid; place-items: center; font-size: 34px; opacity: 0; transition: opacity 0.2s; pointer-events: none; }
#film.paused .bigplay { opacity: 1; }
#film .hidden { display: none !important; }
@media (max-width: 640px) { #film .ch, #film .hide-s { display: none !important; } #film .ic { min-width: 36px; padding: 0 7px; } #film .equip { width: 56vw; } #film .eq { font-size: 10.5px; padding: 4px; } #film .chat { width: 52vw; } #film .card { width: 74px; padding: 6px; font-size: 10px; } #film .card b { font-size: 12px; } }
@media (max-width: 640px) { #film .lobby .p .eqs { display: none; } #film .lobby .p { font-size: 12px; } #film .line { font-size: clamp(13px, 4vw, 20px); } }
@media (max-height: 460px) { #film .lobby, #film .plan, #film .score { transform: translate(-50%, -50%) scale(0.6); top: 44%; } #film .plan svg { max-height: 46vh; } #film .cards { transform: translateX(-50%) scale(0.8); bottom: 64px; } #film .line { bottom: 100px; font-size: 14px; } #film .equip, #film .chat, #film .teamcard { transform: translateY(-50%) scale(0.75); } #film .chapters { bottom: 70px; max-height: 70vh; overflow: auto; } }
`;

// ---------- sound ----------
class FilmAudio {
  constructor(ui) { this.ui = ui; this.ctx = null; }
  ensure() {
    if (this.ctx || this.ui.capture) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { this.ctx = new AC(); } catch { return null; }
    this.out = this.ctx.createGain(); this.out.gain.value = this.ui.muted ? 0 : 0.8; this.out.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 2;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0); let s = 1;
    for (let i = 0; i < len; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; }
    // campus ambience: a soft breeze (filtered noise, slowly swelling)
    const src = this.ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
    const g = this.ctx.createGain(); g.gain.value = 0.05;
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.08; const lg = this.ctx.createGain(); lg.gain.value = 0.025; lfo.connect(lg).connect(g.gain); lfo.start();
    src.connect(f).connect(g).connect(this.out); src.start();
    this.amb = g;
    return this.ctx;
  }
  resume() { this.ensure(); this.ctx?.resume?.().catch(() => {}); this.setMuted(this.ui.muted); }
  suspend() { this.ctx?.suspend?.().catch(() => {}); }
  setMuted(m) { if (this.out) this.out.gain.value = m ? 0 : 0.8; if (m) this.stopVoices(); }
  env(g, t, a, peak, dcy) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dcy); }
  noiseHit(t, { freq = 1200, q = 1, peak = 0.4, dcy = 0.12, type = 'bandpass' } = {}) {
    const c = this.ctx; const s = c.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); this.env(g, t, 0.004, peak, dcy);
    s.connect(f).connect(g).connect(this.out); s.start(t, Math.random()); s.stop(t + dcy + 0.05);
  }
  tone(t, { f0 = 600, f1 = f0, peak = 0.2, dur = 0.1, type = 'sine', vib = 0 } = {}) {
    const c = this.ctx; const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    if (vib) { const l = c.createOscillator(); l.frequency.value = 28; const lg = c.createGain(); lg.gain.value = vib; l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + dur); }
    const g = c.createGain(); this.env(g, t, 0.006, peak, dur);
    o.connect(g).connect(this.out); o.start(t); o.stop(t + dur + 0.05);
  }
  play(kind) {
    if (!this.ensure() || this.ui.muted || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime + 0.01;
    switch (kind) {
      case 'pop': this.tone(t, { f0: 520, f1: 180, peak: 0.16, dur: 0.07, type: 'triangle' }); this.noiseHit(t, { freq: 2600, q: 2, peak: 0.12, dcy: 0.04 }); break; // a toy "thup"
      case 'thump': this.tone(t, { f0: 160, f1: 60, peak: 0.35, dur: 0.22 }); this.noiseHit(t, { freq: 500, peak: 0.15, dcy: 0.12 }); break;
      case 'splat': this.noiseHit(t, { freq: 900, q: 0.8, peak: 0.32, dcy: 0.14, type: 'lowpass' }); this.tone(t, { f0: 240, f1: 120, peak: 0.12, dur: 0.08 }); break;
      case 'splash': this.noiseHit(t, { freq: 700, q: 0.6, peak: 0.5, dcy: 0.45, type: 'lowpass' }); this.tone(t, { f0: 180, f1: 70, peak: 0.25, dur: 0.3 }); break;
      case 'whistle': this.tone(t, { f0: 2350, f1: 2300, peak: 0.16, dur: 0.75, vib: 70 }); break;
      case 'beep': this.tone(t, { f0: 880, peak: 0.18, dur: 0.18, type: 'square' }); break;
      case 'tick': this.tone(t, { f0: 1400, peak: 0.08, dur: 0.05, type: 'square' }); break;
      case 'clap': this.noiseHit(t, { freq: 1500, q: 1.2, peak: 0.5, dcy: 0.09 }); break;
      case 'shutter': this.noiseHit(t, { freq: 3000, q: 3, peak: 0.25, dcy: 0.05 }); this.noiseHit(t + 0.07, { freq: 2400, q: 3, peak: 0.2, dcy: 0.05 }); break;
      case 'cheer': for (let i = 0; i < 6; i++) this.noiseHit(t + i * 0.12, { freq: 900 + i * 140, q: 0.7, peak: 0.12, dcy: 0.6 }); break;
      default: break;
    }
  }
  speak(line) {
    if (!this.ui.voices || this.ui.muted || !window.speechSynthesis) return;
    try {
      const u = new SpeechSynthesisUtterance(line.text.replace(/\(.*?\)\s*/g, ''));
      const c = CAST_BY_ID[line.who];
      u.rate = 1.05; u.pitch = c?.gender === 'f' ? 1.25 : 0.9; u.volume = 0.9;
      const vs = speechSynthesis.getVoices().filter((v) => /^en/.test(v.lang));
      const pick = vs.filter((v) => /India|en-IN/i.test(v.lang + v.name));
      const list = pick.length ? pick : vs;
      if (list.length) u.voice = list[(CAST.findIndex((x) => x.id === line.who) + 1) % list.length];
      speechSynthesis.speak(u);
    } catch { /* no speech */ }
  }
  stopVoices() { try { window.speechSynthesis?.cancel(); } catch { /* */ } }
  dispose() { this.stopVoices(); this.ctx?.close?.().catch(() => {}); }
}

export class FilmUI {
  constructor(film, { capture = false } = {}) {
    this.film = film; this.capture = capture;
    const prefs = store.get(PREFS) || {};
    this.muted = !!prefs.muted; this.cc = prefs.cc !== false; this.voices = !!prefs.voices;
    this.audio = new FilmAudio(this);
    this.styleEl = document.createElement('style'); this.styleEl.textContent = STYLE; document.head.append(this.styleEl);
    const el = document.createElement('div'); el.id = 'film'; el.className = capture ? 'capture' : '';
    el.innerHTML = `
      <div class="stage"></div><div class="lb top"></div><div class="lb bot"></div>
      <div class="pnls"></div>
      <div class="hud"><div class="sc pk"></div><div class="tm"></div><div class="sc cy"></div></div><div class="feed"></div><div class="bang"></div>
      <div class="cap"><div class="k"></div><div class="n"></div><div class="rule"></div></div>
      <div class="title"><h1></h1><p></p></div>
      <div class="line"><b></b><span></span></div>
      <div class="hots"></div>
      <div class="wipe"></div><div class="fade"></div>
      <div class="bigplay">▶</div>
      <div class="info glass hidden" role="dialog" aria-label="Place info"></div>
      <div class="chapters glass hidden" role="menu" aria-label="Scenes"></div>
      <div class="ctl">
        <div class="bar" aria-label="Film progress" role="slider" tabindex="0"><div class="tr"></div><div class="fill"></div><div class="knob"></div><div class="tip"></div></div>
        <div class="row">
          <button class="ic" data-k="prev" title="Previous scene (PageUp)" aria-label="Previous scene">⏮</button>
          <button class="ic" data-k="play" title="Play / pause (Space)" aria-label="Play or pause">⏸</button>
          <button class="ic" data-k="next" title="Next scene (PageDown)" aria-label="Next scene">⏭</button>
          <span class="tm"></span><span class="ch"></span><span class="sp"></span>
          <button class="ic" data-k="chapters" title="Scenes" aria-label="Scenes">☰<span class="hide-s"> Scenes</span></button>
          <button class="ic" data-k="cc" title="Captions (C)" aria-label="Captions">CC</button>
          <button class="ic hide-s" data-k="voices" title="Speak the dialogue" aria-label="Spoken dialogue">🗣</button>
          <button class="ic" data-k="mute" title="Mute (M)" aria-label="Mute">🔊</button>
          <button class="ic" data-k="replay" title="Replay from the start" aria-label="Replay">↺</button>
          <button class="ic" data-k="exit" title="Back to the title (Esc)" aria-label="Exit the film">✕</button>
        </div>
      </div>`;
    document.body.append(el);
    this.el = el;
    const q = (s) => el.querySelector(s);
    this.ui = { stage: q('.stage'), pnls: q('.pnls'), hud: q('.hud'), pk: q('.hud .pk'), cy: q('.hud .cy'), tm: q('.hud .tm'), feed: q('.feed'), bang: q('.bang'), cap: q('.cap'), k: q('.cap .k'), n: q('.cap .n'), rule: q('.cap .rule'), title: q('.title'), h1: q('.title h1'), sub: q('.title p'), line: q('.line'), who: q('.line b'), text: q('.line span'), hots: q('.hots'), wipe: q('.wipe'), fade: q('.fade'), info: q('.info'), chapters: q('.chapters'), bar: q('.bar'), fill: q('.bar .fill'), knob: q('.bar .knob'), tip: q('.bar .tip'), time: q('.row .tm'), ch: q('.row .ch'), btn: Object.fromEntries([...el.querySelectorAll('.ic')].map((b) => [b.dataset.k, b])) };
    this.panelEls = new Map();
    this.hotEls = new Map();
    this.lastSave = 0;
    // chapter markers
    for (const c of film.chapters) {
      if (c.index === 0) continue;
      const m = document.createElement('div'); m.className = 'mk'; m.style.left = `${(c.t0 / film.duration) * 100}%`; m.title = c.title; this.ui.bar.append(m);
    }
    if (!capture) this.bind();
    this.sync();
  }

  bind() {
    const ui = this.ui; const f = this.film;
    const act = {
      play: () => f.toggle(), prev: () => this.chapter(-1), next: () => this.chapter(1), chapters: () => this.toggleChapters(),
      cc: () => this.setCC(!this.cc), mute: () => this.setMute(!this.muted), voices: () => this.setVoices(!this.voices),
      replay: () => { f.seek(0); f.play(); }, exit: () => f.finish(),
    };
    for (const [k, b] of Object.entries(ui.btn)) b.addEventListener('click', (e) => { e.stopPropagation(); b.blur(); act[k](); this.poke(); });
    ui.stage.addEventListener('click', () => {
      if (!ui.chapters.classList.contains('hidden')) return this.toggleChapters(false);
      if (document.body.classList.contains('touch') && this.el.classList.contains('idle')) return this.poke();
      f.toggle(); this.poke();
    });
    // scrubbing
    const at = (e) => { const r = ui.bar.getBoundingClientRect(); return clamp01((e.clientX - r.left) / r.width) * f.duration; };
    let drag = false; let wasPaused = false;
    ui.bar.addEventListener('pointerdown', (e) => { drag = true; wasPaused = f.paused; if (!f.paused) f.pause(); ui.bar.setPointerCapture(e.pointerId); f.seek(at(e)); e.stopPropagation(); });
    ui.bar.addEventListener('pointermove', (e) => {
      const t = at(e); ui.tip.textContent = `${fmt(t)} · ${f.chapters[f.sceneAt(t)].title}`; ui.tip.style.left = `${(t / f.duration) * 100}%`;
      if (drag) f.seek(t);
    });
    const end = () => { if (!drag) return; drag = false; if (!wasPaused) f.play(); this.remember(); };
    ui.bar.addEventListener('pointerup', end); ui.bar.addEventListener('pointercancel', end);
    ui.bar.addEventListener('keydown', (e) => { if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); f.seek(f.t + (e.code === 'ArrowLeft' ? -5 : 5)); } });
    this.onMove = () => this.poke();
    this.el.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointermove', this.onMove);
    this.poke();
  }

  // Keyboard (main.js routes keydown here while the film is on).
  key(e) {
    const f = this.film;
    if (e.target instanceof HTMLInputElement) return;
    this.poke();
    switch (e.code) {
      case 'Space': case 'KeyK': e.preventDefault(); if (!this.ui.info.classList.contains('hidden')) this.closeInfo(); else f.toggle(); break;
      case 'ArrowLeft': e.preventDefault(); f.seek(f.t - 5); break;
      case 'ArrowRight': e.preventDefault(); f.seek(f.t + 5); break;
      case 'PageUp': case 'BracketLeft': case 'KeyP': e.preventDefault(); this.chapter(-1); break;
      case 'PageDown': case 'BracketRight': case 'KeyN': e.preventDefault(); this.chapter(1); break;
      case 'Home': f.seek(0); break;
      case 'KeyM': this.setMute(!this.muted); break;
      case 'KeyC': this.setCC(!this.cc); break;
      case 'Escape':
        if (!this.ui.info.classList.contains('hidden')) this.closeInfo();
        else if (!this.ui.chapters.classList.contains('hidden')) this.toggleChapters(false);
        else f.finish();
        break;
      default: if (/^Digit[1-7]$/.test(e.code)) { const c = f.chapters[Number(e.code.slice(5)) - 1]; if (c) f.seek(c.t0 + 0.01); }
    }
  }

  poke() {
    this.el.classList.remove('idle');
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => { if (!this.film.paused && this.ui.chapters.classList.contains('hidden') && !this.el.querySelector('.ctl:hover')) this.el.classList.add('idle'); }, 2800);
  }

  chapter(d) {
    const f = this.film; const i = f.sceneAt(f.t);
    const into = f.t - f.chapters[i].t0;
    const j = d < 0 && into > 3 ? i : Math.max(0, Math.min(f.chapters.length - 1, i + d));
    f.seek(f.chapters[j].t0 + 0.01);
  }

  toggleChapters(on = this.ui.chapters.classList.contains('hidden')) {
    const f = this.film; const ui = this.ui;
    ui.chapters.classList.toggle('hidden', !on);
    if (!on) return;
    const cur = f.sceneAt(f.t);
    ui.chapters.replaceChildren(...f.chapters.map((c) => {
      const b = document.createElement('button'); b.className = c.index === cur ? 'on' : '';
      b.innerHTML = `<span>${c.index + 1}. ${esc(c.title)}</span><span>${fmt(c.t0)}</span>`;
      b.addEventListener('click', (e) => { e.stopPropagation(); f.seek(c.t0 + 0.01); this.toggleChapters(false); if (f.paused) f.play(); });
      return b;
    }));
  }

  setCC(on) { this.cc = on; this.savePrefs(); this.sync(); }
  setVoices(on) { this.voices = on; if (!on) this.audio.stopVoices(); this.savePrefs(); this.sync(); }
  setMute(on) { this.muted = on; this.audio.setMuted(on); this.film.setMuted(on); this.savePrefs(); this.sync(); }
  savePrefs() { store.set(PREFS, { muted: this.muted, cc: this.cc, voices: this.voices }); }

  // Remember where the viewer is (resume from the title screen). t = 0 forgets it.
  remember(t = this.film.t) { if (this.capture) return; store.set(KEY, t > 0 ? { t: Math.round(t * 100) / 100, d: this.film.duration, at: Date.now() } : null); }

  sync() {
    const f = this.film; const b = this.ui.btn;
    this.el.classList.toggle('paused', !!f.paused && !this.capture);
    this.el.classList.toggle('nocc', !this.cc);
    if (!b) return;
    b.play.textContent = f.paused ? '▶' : '⏸';
    b.play.setAttribute('aria-label', f.paused ? 'Play' : 'Pause');
    b.mute.textContent = this.muted ? '🔇' : '🔊';
    b.cc.classList.toggle('off', !this.cc);
    b.voices.classList.toggle('off', !this.voices);
    if (f.paused) this.el.classList.remove('idle');
  }

  // Sound cues and spoken lines crossed between t0 and t1 (normal playback only, not jumps).
  fire(t0, t1) {
    if (this.capture || t1 <= t0 || t1 - t0 > 0.5) return;
    for (const c of this.film.cues) if (c.t >= t0 && c.t < t1) this.audio.play(c.kind);
    for (const l of this.film.lines) if (l.t0 >= t0 && l.t0 < t1) this.audio.speak(l);
    if (t1 - this.lastSave > 3 || t1 < this.lastSave) { this.lastSave = t1; this.remember(t1); }
  }

  // ---------- per frame ----------
  update(t) {
    const f = this.film; const ui = this.ui; const D = f.duration;
    // fades: in from black, out to black, short dips at scene changes; a paint wipe into the match
    let black = 1 - smooth(0, 1.6, t);
    black = Math.max(black, smooth(D - 1.6, D - 0.1, t));
    for (const d of f.dips) if (d !== f.chapters[4].t0) black = Math.max(black, smooth(d - 0.5, d, t) * (1 - smooth(d, d + 0.55, t)));
    ui.fade.style.opacity = black.toFixed(3);
    const w = f.chapters[4].t0; const wu = (t - (w - 0.45)) / 0.9;
    ui.wipe.style.transform = wu > 0 && wu < 1 ? `translateX(${(-120 + wu * 240).toFixed(1)}%)` : 'translateX(-200%)';
    // title cards
    const card = f.titles.find((c) => t >= c.t0 && t < c.t1);
    if (card) {
      const a = smooth(card.t0, card.t0 + 1.4, t) * (1 - smooth(card.t1 - 1.2, card.t1, t));
      ui.title.style.opacity = a.toFixed(3);
      if (ui.sub.textContent !== card.sub) { ui.h1.textContent = card.title; ui.sub.textContent = card.sub; }
      const sp = 0.24 + 0.08 * (1 - smooth(card.t0, card.t1, t));
      ui.h1.style.letterSpacing = `${sp.toFixed(3)}em`; ui.h1.style.paddingLeft = `${sp.toFixed(3)}em`;
    } else ui.title.style.opacity = '0';
    // scene / place captions
    const cap = f.captions.find((c) => t >= c.t0 - 0.01 && t < c.t1);
    if (cap) {
      const a = smooth(cap.t0, cap.t0 + 0.8, t) * (1 - smooth(cap.t1 - 0.7, cap.t1, t));
      ui.cap.style.opacity = a.toFixed(3);
      ui.cap.style.transform = `translateX(${((1 - smooth(cap.t0, cap.t0 + 1, t)) * -24).toFixed(1)}px)`;
      ui.rule.style.width = `${(smooth(cap.t0 + 0.2, cap.t0 + 1.2, t) * 100).toFixed(1)}%`;
      ui.k.textContent = cap.kicker || ''; ui.n.textContent = cap.title;
    } else ui.cap.style.opacity = '0';
    // dialogue
    const line = [...f.lines].reverse().find((l) => t >= l.t0 && t < l.t1);
    if (line) {
      ui.line.style.opacity = (smooth(line.t0, line.t0 + 0.2, t) * (1 - smooth(line.t1 - 0.25, line.t1, t))).toFixed(3);
      const name = line.who === 'all' ? 'Everyone' : CAST_BY_ID[line.who]?.name || line.who;
      if (ui.text.textContent !== line.text) { ui.who.textContent = name; ui.who.style.color = SPEAKER_COLOUR(line.who); ui.text.textContent = line.text; }
    } else ui.line.style.opacity = '0';
    this.updateHud(t);
    this.updatePanels(t);
    if (!this.capture) this.updateHots(t);
    // the player bar
    if (!this.capture) {
      const p = (t / D) * 100;
      ui.fill.style.width = `${p}%`; ui.knob.style.left = `${p}%`;
      ui.time.textContent = `${fmt(t)} / ${fmt(D)}`;
      const c = f.chapters[f.sceneAt(t)];
      const label = `${c.index + 1}. ${c.title}`;
      if (ui.ch.textContent !== label) ui.ch.textContent = label;
      ui.bar.setAttribute('aria-valuenow', t.toFixed(1));
    }
  }

  updateHud(t) {
    const f = this.film; const ui = this.ui;
    const s = f.shots[f.shotAt(t)];
    const on = !!s.hud;
    ui.hud.style.opacity = on ? '1' : '0';
    ui.feed.style.opacity = on ? '1' : '0';
    if (!on) { ui.bang.style.opacity = '0'; return; }
    const [p, c] = f.score(t);
    const left = f.matchClock(t);
    ui.tm.textContent = fmt(Math.ceil(left));
    ui.tm.classList.toggle('low', left <= 15);
    ui.pk.innerHTML = `${p}<small>PINK</small>`; ui.pk.style.background = TEAMS[0].colour;
    ui.cy.innerHTML = `${c}<small>CYAN</small>`; ui.cy.style.background = TEAMS[1].colour;
    const recent = f.tags.filter((g) => g.t <= t && t - g.t < 5).slice(-3);
    const key = recent.map((g) => g.t).join();
    if (ui.feed.dataset.k !== key) {
      ui.feed.dataset.k = key;
      ui.feed.innerHTML = recent.map((g) => { const a = CAST_BY_ID[g.by]; const b = CAST_BY_ID[g.who]; return `<div><span style="color:${teamColour(a)}">${a.name}</span><i>${g.how === 'precision' ? '🎯' : g.how === 'splash' ? '💥' : '🎨'}</i><span style="color:${teamColour(b)}">${b.name}</span></div>`; }).join('');
    }
    const last = [...f.tags].reverse().find((g) => g.t <= t && t - g.t < 1.6);
    if (last) {
      const u = (t - last.t) / 1.6;
      ui.bang.textContent = { precision: 'PRECISION PAINT HIT!', splash: 'SPLASH TAG!', final: 'FINAL TAG!' }[last.how] || 'TAGGED!';
      ui.bang.style.color = teamColour(CAST_BY_ID[last.by]);
      ui.bang.style.opacity = (smooth(0, 0.08, u) * (1 - smooth(0.7, 1, u))).toFixed(3);
      ui.bang.style.transform = `translate(-50%, -50%) scale(${(1.35 - 0.35 * smooth(0, 0.15, u)).toFixed(3)}) rotate(-4deg)`;
    } else ui.bang.style.opacity = '0';
  }

  // ---------- story overlays ----------
  updatePanels(t) {
    const f = this.film;
    for (const p of f.panels) {
      const on = t >= p.t0 && t < p.t1;
      let el = this.panelEls.get(p);
      if (!on) { if (el) el.style.opacity = '0'; continue; }
      if (!el) { el = document.createElement('div'); this.ui.pnls.append(el); this.panelEls.set(p, el); }
      const lt = t - p.t0;
      const a = p.kind === 'flash' ? 1 - smooth(0, 0.6, lt) : smooth(0, 0.35, lt) * (1 - smooth(p.t1 - p.t0 - 0.35, p.t1 - p.t0, lt));
      el.style.opacity = a.toFixed(3);
      const html = this[`panel_${p.kind}`]?.(lt, el, p, t);
      if (html != null && el.dataset.h !== html) { el.dataset.h = html; el.innerHTML = html; }
    }
  }

  panel_chat(lt, el) {
    el.className = 'pnl chat';
    const M = [[0.2, 'vikram', '🎨 created “Med-C Paintball · Sat 4 PM”'], [1.3, 'sana', 'I’ll referee + host! Bring water 💧'], [2.5, 'aanya', 'PINK TEAM 💗💗'], [3.6, 'rohan', 'Cyan > Pink 😎'], [4.7, 'ishaan', '+3 from Gandhi Bhawan coming to watch'], [5.9, 'neha', 'Masks? Paintballs?'], [7.1, 'sana', 'Sorted: masks + 1,200 washable paintballs 🎯']];
    const shown = M.filter((m) => lt >= m[0]);
    return `<h4>📱 BITSians · Paintball 🎨</h4>${shown.map(([, who, text]) => `<div class="m${who === 'vikram' ? ' me' : ''}"><b style="color:${who === 'vikram' ? '#16a085' : '#2d3436'}">${CAST_BY_ID[who].name}</b>${esc(text)}</div>`).join('')}`;
  }

  panel_plan(lt, el) {
    el.className = 'pnl plan glass';
    const b = MEDC.bounds; const W = b.maxX - b.minX; const H = b.maxZ - b.minZ; const S = 8;
    const x = (v) => ((v - b.minX) * S).toFixed(1); const z = (v) => ((v - b.minZ) * S).toFixed(1);
    const step = Math.floor(lt / 1.2);
    const solids = MEDC.solids.map((o, k) => (o.kind === 'cyl'
      ? `<circle cx="${x(o.x)}" cy="${z(o.z)}" r="${o.r * S}" fill="${['#ff3d7f', '#30d5ff', '#ffd23d', '#7cff4f', '#b26bff', '#ff8a1f'][k % 6]}"/>`
      : `<rect x="${x(o.minX)}" y="${z(o.minZ)}" width="${((o.maxX - o.minX) * S).toFixed(1)}" height="${((o.maxZ - o.minZ) * S).toFixed(1)}" rx="4" fill="${['#ff3d7f', '#30d5ff', '#ffd23d', '#7cff4f', '#b26bff', '#ff8a1f'][k % 6]}"/>`)).join('');
    const sp = MEDC.spawns['2'].map((s) => `<circle cx="${x(s.x)}" cy="${z(s.z)}" r="7" fill="none" stroke="${TEAMS[s.group].colour}" stroke-width="3"/>`).join('');
    const arrows = step >= 3 ? `<path d="M ${x(MEDC.bounds.minX + 4)} ${z(MEDC.centre.z + 8)} Q ${x(MEDC.centre.x - 14)} ${z(MEDC.centre.z + 14)} ${x(MEDC.centre.x - 6)} ${z(MEDC.centre.z + 11)}" stroke="#ff3d7f" stroke-width="4" fill="none" stroke-dasharray="10 7"/><path d="M ${x(MEDC.bounds.maxX - 4)} ${z(MEDC.centre.z - 8)} Q ${x(MEDC.centre.x + 14)} ${z(MEDC.centre.z - 14)} ${x(MEDC.centre.x + 6)} ${z(MEDC.centre.z - 11)}" stroke="#30d5ff" stroke-width="4" fill="none" stroke-dasharray="10 7"/>` : '';
    const team = (k) => CAST.filter((c) => c.team === k).map((c) => `<span class="chip"><span class="dot" style="background:${TEAMS[k].colour}"></span>${c.name}</span>`).join('');
    return `<h4>📋 The plan · Med-C Ground</h4>
      <svg viewBox="-8 -8 ${W * S + 16} ${H * S + 16}"><rect x="-6" y="-6" width="${W * S + 12}" height="${H * S + 12}" rx="10" fill="#3f8f45" stroke="#f5f6fa" stroke-width="3"/>${solids}${step >= 1 ? sp : ''}${arrows}
      <text x="12" y="${H * S - 10}" fill="#fff" font-size="20" font-weight="700">PINK ⟵</text><text x="${W * S - 100}" y="${H * S - 10}" fill="#fff" font-size="20" font-weight="700">⟶ CYAN</text></svg>
      <div class="row"><span class="chip">🗓 Sat · 4:00 PM</span><span class="chip">📍 Med-C Ground</span><span class="chip">⚔️ 4v4 Team Match</span><span class="chip">⏱ 3 min</span><span class="chip">🦺 Ref: Sana</span></div>
      ${step >= 2 ? `<div class="row">${team(0)}</div><div class="row">${team(1)}</div>` : ''}`;
  }

  panel_cards(lt, el) {
    el.className = 'pnl cards';
    const players = CAST.filter((c) => c.team != null);
    return CAST.map((c) => {
      const k = players.indexOf(c); const on = c.team == null ? lt > 9 : lt > 1.2 + k * 1.25 - 0.8;
      const what = c.team == null ? c.role : `${TEAMS[c.team].name} · ${EQUIPMENT_BY_ID[c.loadout[0]].short}`;
      return `<div class="card${on ? '' : ' off'}" style="border-color:${teamColour(c)}"><b>${c.name}</b>${esc(what)}</div>`;
    }).join('');
  }

  panel_equip(lt, el) {
    el.className = 'pnl equip glass';
    const players = CAST.filter((c) => c.team != null);
    const cur = players[Math.min(7, Math.floor((lt + 0.1) / 1.25))];
    return `<h4 style="margin:2px 4px 4px;font-size:13px;letter-spacing:.12em">🎯 SIX BLASTER CATEGORIES</h4>${EQUIPMENT.map((e) => {
      const who = players.filter((c) => c.loadout[0] === e.id).map((c) => c.name).join(', ');
      return `<div class="eq${cur.loadout[0] === e.id ? ' on' : ''}"><span class="sw" style="background:${e.colour}"></span><span><b>${e.name}</b><small>range ${e.range} m · ${e.pellets > 1 ? `${e.pellets} paintballs a pull` : `${e.rate}/s`}${who ? ` · ${who}` : ''}</small></span></div>`;
    }).join('')}`;
  }

  panel_lobby(lt, el) {
    el.className = 'pnl lobby glass';
    const team = (k) => {
      const list = CAST.filter((c) => c.team === k);
      return `<div class="team" style="border-color:${TEAMS[k].colour}"><b style="color:${TEAMS[k].colour}">${TEAMS[k].name.toUpperCase()}</b>${list.map((c, i) => {
        const ready = lt > 1.2 + (k * 4 + i) * 0.75;
        return `<div class="p"><span class="dot" style="background:${TEAMS[k].colour};width:14px;height:14px"></span><span class="nm">${c.name}</span><span class="eqs">${c.loadout.map((id) => `<span class="chip"><span class="dot" style="background:${EQUIPMENT_BY_ID[id].colour}"></span>${EQUIPMENT_BY_ID[id].short}</span>`).join('')}</span><span class="rd${ready ? ' on' : ''}">✓ READY</span></div>`;
      }).join('')}</div>`;
    };
    const all = lt > 1.2 + 8 * 0.75;
    return `<span class="story">🎬 IN THE STORY · a scene from the film, not a live session</span>
      <h4>Lobby · Med-C Paintball</h4>
      <div class="meta"><span class="chip">⚔️ 4v4 Team Match</span><span class="chip">📍 Med-C Ground</span><span class="chip">⏱ 3:00</span><span class="chip">👑 Host: Sana (referee)</span><span class="chip">🎙 Vikram (commentary)</span></div>
      <div class="teams">${team(0)}${team(1)}</div>
      <div class="foot"><span>${all ? 'Everyone is ready.' : 'Waiting for players to tick Ready…'}</span><span class="go"${all ? '' : ' style="opacity:.35"'}>${all ? '▶ STARTING AT MED-C' : 'START'}</span></div>`;
  }

  panel_teams(lt, el, p) {
    if (!el.dataset.init) { el.dataset.init = 1; el.className = 'pnl'; el.style.inset = '0'; }
    const card = (k, at) => {
      const a = smooth(at, at + 0.4, lt);
      return `<div class="teamcard glass ${k ? 'r' : 'l'}" style="position:absolute;opacity:${a.toFixed(2)};border-top:5px solid ${TEAMS[k].colour}"><h4 style="color:${TEAMS[k].colour}">${TEAMS[k].name.toUpperCase()} TEAM</h4>${CAST.filter((c) => c.team === k).map((c) => `<div class="p"><b>${c.name}</b><span class="chip"><span class="dot" style="background:${EQUIPMENT_BY_ID[c.loadout[0]].colour}"></span>${EQUIPMENT_BY_ID[c.loadout[0]].short}</span></div>`).join('')}</div>`;
    };
    return `<div style="position:absolute;left:50%;top:calc(8vh + 12px);transform:translateX(-50%);font-weight:900;letter-spacing:.14em;font-size:clamp(14px,2.6vh,24px);text-shadow:0 2px 12px rgba(0,0,0,.6);white-space:nowrap">4v4 TEAM MATCH · MED-C GROUND</div>${card(0, 0.1)}${card(1, 4)}`;
  }

  panel_countdown(lt, el) {
    el.className = 'pnl count';
    const n = lt < 0.2 ? '' : lt < 1.4 ? '3' : lt < 2.6 ? '2' : lt < 3.8 ? '1' : 'START!';
    const k = n === 'START!' ? lt - 3.8 : (lt - 0.2) % 1.2;
    el.style.transform = `translate(-50%, -50%) scale(${(1.5 - 0.5 * smooth(0, 0.25, k)).toFixed(3)})`;
    el.style.color = { 3: '#ff3d7f', 2: '#ffd23d', 1: '#30d5ff', 'START!': '#7cff4f' }[n] || '#fff';
    if (n === 'START!') el.style.fontSize = 'clamp(48px, 15vh, 160px)';
    else el.style.fontSize = '';
    return n;
  }

  panel_score(lt, el, p, t) {
    el.className = 'pnl score glass';
    const f = this.film; const [a, b] = f.score(t);
    const rows = CAST.filter((c) => c.team != null).map((c) => ({ c, tags: f.tags.filter((g) => g.by === c.id).length, out: f.tags.filter((g) => g.who === c.id).length }))
      .sort((x, y) => y.tags - x.tags || x.c.team - y.c.team);
    return `<div class="win" style="color:${TEAMS[0].colour}">🏆 PINK WINS!</div>
      <div class="big"><span style="color:${TEAMS[0].colour}">${a}</span><span style="opacity:.6;font-size:.5em">PINK · CYAN</span><span style="color:${TEAMS[1].colour}">${b}</span></div>
      <table><tr style="opacity:.7"><td>Player</td><td>Team</td><td>Tags</td><td>Tagged</td><td>Score</td></tr>${rows.map((r, k) => `<tr style="opacity:${smooth(0.6 + k * 0.25, 0.9 + k * 0.25, lt).toFixed(2)}"><td><b>${r.c.name}</b></td><td style="color:${teamColour(r.c)}">${TEAMS[r.c.team].name}</td><td>${r.tags}</td><td>${r.out}</td><td>${r.tags * 100 + (r.c.team === 0 ? 50 : 0)}</td></tr>`).join('')}</table>`;
  }

  panel_flash(lt, el) { el.className = 'pnl flash'; return ''; }

  // ---------- hotspots ----------
  updateHots(t) {
    const f = this.film; const cam = f.camera; const w = innerWidth; const h = innerHeight;
    const v = new THREE.Vector3();
    cam.updateMatrixWorld();
    for (const hs of f.hots) {
      let el = this.hotEls.get(hs);
      const on = t >= hs.t0 && t < hs.t1 && this.ui.info.classList.contains('hidden');
      let x; let y; let vis = on;
      if (on) {
        if (hs.screen) { x = hs.screen[0] * w; y = hs.screen[1] * h; } else {
          v.set(...hs.at).project(cam);
          x = (v.x * 0.5 + 0.5) * w; y = (-v.y * 0.5 + 0.5) * h;
          vis = v.z < 1 && x > 20 && x < w - 20 && y > h * 0.09 && y < h - 120;
        }
      }
      if (!vis) { if (el) el.style.display = 'none'; continue; }
      if (!el) {
        el = document.createElement('button'); el.className = 'hot'; el.dataset.id = hs.id; el.setAttribute('aria-label', `About ${hs.label}`);
        el.innerHTML = `<span class="ring"></span><span class="l">${esc(hs.label)}</span>`;
        el.addEventListener('click', (e) => { e.stopPropagation(); this.openInfo(hs); });
        this.ui.hots.append(el); this.hotEls.set(hs, el);
      }
      el.style.display = '';
      el.style.left = `${x.toFixed(0)}px`; el.style.top = `${y.toFixed(0)}px`;
    }
  }

  openInfo(hs) {
    const f = this.film; const ui = this.ui;
    this.resumeAfterInfo = !f.paused;
    f.pause();
    ui.info.classList.remove('hidden');
    ui.info.innerHTML = `<h3>${hs.lobby ? '🎮' : hs.roam ? '🗺️' : '📍'} ${esc(hs.title)}</h3><p>${esc(hs.text)}</p><div class="msg hidden"></div><div class="btns"></div>`;
    const btns = ui.info.querySelector('.btns'); const msg = ui.info.querySelector('.msg');
    const btn = (label, cls, fn) => { const b = document.createElement('button'); b.className = `fb ${cls}`; b.textContent = label; b.addEventListener('click', (e) => { e.stopPropagation(); fn(); }); btns.append(b); return b; };
    if (hs.place || hs.roam) btn(hs.roam ? '🗺️ Open Campus Free Roam' : '🗺️ Explore this place', 'primary', () => f.hooks?.explore?.(hs.place || null, f.t));
    if (hs.lobby) btn('🎮 Open the lobby', 'primary', () => {
      const ok = f.hooks?.lobby?.();
      if (!ok) { msg.classList.remove('hidden'); msg.textContent = 'The live paintball lobby is not available in this version yet. The lobby above is the one from the story.'; }
    });
    btn('▶ Back to the film', '', () => this.closeInfo());
  }

  closeInfo() {
    this.ui.info.classList.add('hidden');
    if (this.resumeAfterInfo) this.film.play();
  }

  dispose() {
    clearTimeout(this.idleTimer);
    if (this.onMove) window.removeEventListener('pointermove', this.onMove);
    this.audio.dispose();
    this.el.remove(); this.styleEl.remove();
  }
}
