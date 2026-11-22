// The film's overlay and player. Overlays: letterbox, title cards, trailer captions, squad comms, the tactical map,
// and copies of the real Campus Royale screens built with the live game's own CSS classes (css/paintball.css,
// css/paintball-royale.css): the landing map, the in-match HUD (timer, squad scores, paint zone, players left,
// minimap, feed, paint meter, blaster and paintballs, inventory, prompts, the crate panel, the big map), the
// character customisation, the blaster cards with their real stat bars, and the results screen. Player controls:
// play/pause, scrub bar with scene markers, the scenes list, previous/next, captions, mute, replay, exit; game
// hotspots ("Create a room", "Join a room", "How crates work", "The six blasters"). Sound effects are synthesised
// with WebAudio (soft paintball pops, splats, paint-bomb bursts, crate lids, pick-up dings, countdown beeps, risers
// and hits; nothing that sounds like a firearm). Everything is drawn from the film time, so it follows seeking.
import * as THREE from 'three';
import { CAST, CAST_BY_ID, SQUADS, SPEAKER_COLOUR, teamColour } from './cast.js';
import { mapXform, drawBase, drawZone, drawArrow, miniXform, drawMiniBase } from './film-fx.js';
import { MATCH, zoneState } from './paintball-film.js';
import { EQUIPMENT, EQUIPMENT_BY_ID, PAINT_MAX } from '../paintball/equipment.js';
import { ITEMS, SHIELD, SCAN, BOMB, PACK } from '../paintball/items.js';
import { ROYALE, ZONE_PHASES, readSpots } from '../paintball/royale.js';
import { TEAMS } from '../paintball/rules.js';
import { CHARACTERS, OUTFIT_COLOURS, PANTS_COLOURS, MASK_COLOURS, ACCESSORIES } from '../paintball/looks.js';
import { statBars, BLURB } from '../paintball/client/ui.js';
import { BITS_CAMPUS } from '../../data/bits-campus.js';

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const fmt = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;
const fmtTime = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }; // the game's (client/ui.js)
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dirName = (dx, dz) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360 / 45) % 8];
const KEY = 'pwb.film';
const PREFS = 'pwb.film.prefs';
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};
// Where the viewer left the film (for "Resume the film" on the title screen), or null.
export function savedFilmPosition() { const s = store.get(KEY); return s && s.t > 3 && (!s.d || s.t < s.d - 4) ? s : null; }
const HINT = 'E open / pick up · G paint bomb · H clean · C shield · Z scan · M map · R reload · Q switch · Tab scores · T talk';

const STYLE = `
#film { position: fixed; inset: 0; z-index: 50; color: #fff; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; overflow: hidden; pointer-events: none; -webkit-tap-highlight-color: transparent; }
#film .stage { position: absolute; inset: 0; pointer-events: auto; cursor: pointer; }
#film.capture .stage { display: none; }
#film .lb { position: absolute; left: 0; right: 0; height: 9vh; background: #000; z-index: 1; }
#film .lb.top { top: 0; } #film .lb.bot { bottom: 0; }
@media (max-aspect-ratio: 1/1) { #film .lb { height: 5vh; } }
#film .fade { position: absolute; inset: 0; background: #000; opacity: 0; z-index: 4; }
#film .flash { position: absolute; inset: 0; background: #fff; opacity: 0; z-index: 4; mix-blend-mode: screen; }
#film .wipe { position: absolute; inset: -10% -60%; background: linear-gradient(100deg, transparent 0 30%, #ff3d7f 30% 40%, #ffd23d 40% 48%, #30d5ff 48% 58%, #7cff4f 58% 63%, transparent 63%); transform: translateX(-200%); opacity: 0.95; z-index: 4; }
#film .vig { position: absolute; inset: 0; background: radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45)); opacity: 0; }
#film .title { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); text-align: center; opacity: 0; padding: 0 16px; z-index: 3; }
#film .title h1 { margin: 0; font-weight: 900; font-style: italic; font-size: clamp(28px, 10vh, 112px); letter-spacing: 0.04em; line-height: 0.95; text-transform: uppercase; text-shadow: 0 6px 0 rgba(0,0,0,0.35), 0 0 40px rgba(0,0,0,0.5); }
#film .title h1 .w { display: block; font-size: 0.36em; letter-spacing: 0.5em; padding-left: 0.5em; font-style: normal; font-weight: 800; color: #ffd23d; margin-bottom: 0.3em; }
#film .title h1 .g { background: linear-gradient(90deg, #ff3d7f, #ffd23d 35%, #7cff4f 60%, #30d5ff 85%); -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-text-stroke: 0; filter: drop-shadow(0 5px 0 rgba(0,0,0,0.4)); }
#film .title .tbar { height: 6px; width: min(560px, 70vw); margin: 2.2vh auto 0; border-radius: 3px; background: linear-gradient(90deg, #ff3d7f, #ffd23d, #7cff4f, #30d5ff, #b26bff); transform-origin: left; }
#film .title p { margin: 1.8vh 0 0; font-weight: 800; font-size: clamp(12px, 2.6vh, 26px); letter-spacing: 0.32em; padding-left: 0.32em; text-transform: uppercase; text-shadow: 0 2px 14px rgba(0,0,0,0.9); }
#film .title.end p { letter-spacing: 0.08em; padding-left: 0; text-transform: none; font-size: clamp(14px, 3.2vh, 30px); }
#film .cap { position: absolute; opacity: 0; z-index: 3; pointer-events: none; }
#film .cap.s-punch { left: 50%; top: 34%; transform: translate(-50%, -50%); text-align: center; white-space: nowrap; }
#film .cap.s-punch .k { display: inline-block; font-size: clamp(11px, 2vh, 18px); letter-spacing: 0.4em; padding: 0.2em 0.6em 0.2em 1em; font-weight: 900; color: #0b1020; background: #ffd23d; transform: skewX(-12deg); }
#film .cap.s-punch .n { font-size: clamp(26px, 8.5vh, 92px); font-weight: 900; font-style: italic; letter-spacing: 0.02em; margin-top: 0.6vh; text-shadow: 0 5px 0 rgba(0,0,0,0.4), 0 0 30px rgba(0,0,0,0.4); -webkit-text-stroke: 1px rgba(0,0,0,0.25); }
#film .cap.s-tag { left: 4vw; bottom: 24vh; }
#film .cap.s-tag .k { font-size: clamp(10px, 1.7vh, 15px); letter-spacing: 0.32em; font-weight: 900; color: #ffd23d; text-shadow: 0 2px 8px rgba(0,0,0,0.9); }
#film .cap.s-tag .n { font-size: clamp(18px, 4.6vh, 44px); font-weight: 900; font-style: italic; margin-top: 0.3vh; text-shadow: 0 3px 0 rgba(0,0,0,0.4), 0 0 18px rgba(0,0,0,0.5); }
#film .cap .rule { height: 5px; margin-top: 0.8vh; border-radius: 3px; background: linear-gradient(90deg, #ff3d7f, #ffd23d, #30d5ff, rgba(48,213,255,0)); }
#film .cap.s-plain { left: 5vw; top: 13vh; }
#film .cap.s-plain .k { font-size: clamp(10px, 1.7vh, 15px); letter-spacing: 0.34em; font-weight: 800; color: #ffd23d; text-shadow: 0 2px 10px rgba(0,0,0,0.8); }
#film .cap.s-plain .n { font-size: clamp(18px, 4vh, 40px); font-weight: 900; text-shadow: 0 2px 16px rgba(0,0,0,0.7); }
#film .line { position: absolute; left: 3vw; bottom: 22vh; max-width: min(70vw, 520px); font-size: clamp(13px, 2.2vh, 20px); font-weight: 700; line-height: 1.3; background: rgba(10,12,28,0.72); padding: 0.4em 0.8em 0.45em; border-radius: 10px; border-left: 4px solid #fff; opacity: 0; z-index: 3; }
#film .line b { display: block; font-size: 0.66em; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 0.1em; }
#film .line b::before { content: '🎙 '; }
#film.nocc .line { display: none; }
#film .pnls > * { position: absolute; }
#film .glass { background: rgba(12,14,30,0.82); border: 1px solid rgba(255,255,255,0.16); border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.35); backdrop-filter: blur(6px); }
/* the tactical map */
#film .intel { left: 3vw; top: 50%; transform: translateY(-50%); display: flex; gap: 14px; align-items: stretch; }
#film .intel .mapbox { position: relative; padding: 10px; border-radius: 14px; background: rgba(6,12,24,0.86); border: 2px solid rgba(48,213,255,0.55); box-shadow: 0 0 30px rgba(48,213,255,0.25); }
#film .intel canvas { display: block; border-radius: 8px; }
#film .intel .side { width: min(250px, 30vw); display: flex; flex-direction: column; gap: 8px; }
#film .intel h4 { margin: 0; font-size: clamp(11px, 1.8vh, 15px); letter-spacing: 0.3em; color: #30d5ff; font-weight: 900; }
#film .intel .big { font-size: clamp(18px, 3.8vh, 34px); font-weight: 900; font-style: italic; line-height: 1; }
#film .intel .stat { display: flex; justify-content: space-between; gap: 8px; padding: 6px 10px; border-radius: 9px; background: rgba(10,12,28,0.78); border-left: 4px solid var(--c, #30d5ff); font-weight: 700; font-size: clamp(11px, 1.7vh, 14px); }
#film .intel .stat b { font-size: 1.15em; }
#film .intel .stat.off { opacity: 0; transform: translateX(-10px); }
#film .intel .stat { transition: opacity 0.3s, transform 0.3s; }
/* match intro */
#film .intro { left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(900px, 94vw); text-align: center; }
#film .intro .mode { font-size: clamp(30px, 8vh, 78px); font-weight: 900; font-style: italic; letter-spacing: 0.02em; text-shadow: 0 5px 0 rgba(0,0,0,0.4); }
#film .intro .chips { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; margin: 6px 0 12px; }
#film .chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; background: rgba(10,12,28,0.78); border: 1px solid rgba(255,255,255,0.2); font-size: clamp(11px, 1.7vh, 14px); font-weight: 700; white-space: nowrap; }
#film .intro .pb-teams { grid-template-columns: repeat(5, 1fr); text-align: left; }
#film .intro .pb-team { background: rgba(10,12,28,0.82); font-size: 12.5px; transition: transform 0.35s, opacity 0.35s; }
#film .intro .pb-team.off { opacity: 0; transform: translateY(14px); }
#film .intro .pb-team b { display: block; font-size: 15px; margin-bottom: 3px; }
#film .intro .pb-team small { opacity: 0.75; }
/* customisation / blasters / loadout (lobby-style cards) */
#film .side-card { right: 3vw; top: 50%; transform: translateY(-50%); width: min(470px, 46vw); max-height: 82vh; overflow: hidden; }
#film .side-card.pb-card { padding: 14px 16px; }
#film .side-card .pb-row button { padding: 5px 10px; border-radius: 999px; font: inherit; font-size: 13px; font-weight: 600; cursor: default; }
#film .side-card .fake-input { font-size: 16px; padding: 8px 12px; border-radius: 10px; border: 2px solid rgba(255,255,255,0.25); background: rgba(255,255,255,0.08); margin-bottom: 8px; }
#film .side-card .lbl { font-size: 12px; opacity: 0.8; margin: 8px 0 4px; }
#film .side-card .pb-swatch { width: 24px; height: 24px; display: inline-block; border-radius: 50%; border-style: solid; transition: transform 0.2s; }
#film .bl-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
#film .bl-grid .pb-eq { background: rgba(255,255,255,0.08); border: 2px solid rgba(255,255,255,0.18); font-size: 11.5px; transition: background 0.25s, border-color 0.25s; }
#film .bl-detail { margin-top: 10px; padding: 10px 12px; border-radius: 12px; background: rgba(255,255,255,0.06); border-left: 5px solid var(--c); }
#film .bl-detail b { font-size: 17px; }
#film .kit { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
#film .kit .who { border-radius: 12px; padding: 8px 10px; background: rgba(255,255,255,0.06); border-top: 4px solid var(--team); }
#film .kit .who b { font-size: 16px; }
#film .kit .row { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
#film .kit .row span { background: rgba(10,12,28,0.65); border: 2px solid var(--c, rgba(255,255,255,0.25)); border-radius: 9px; padding: 2px 7px; font-weight: 800; font-size: 12px; white-space: nowrap; }
#film .kit .row span.none { opacity: 0.45; }
/* results */
#film .results { inset: 0; display: grid; place-items: center; padding: 12px; background: linear-gradient(180deg, rgba(10,12,28,0.25), rgba(10,12,28,0.6)); }
#film .results .pb-card { position: absolute; left: 50%; top: 50%; width: min(980px, calc(100vw - 24px)); transform-origin: center; }
@media (max-width: 700px) { #film .results .pb-card { width: 600px; } }
#film .results .pb-table tr { transition: opacity 0.3s; }
#film .results .pb-podium div, #film .results .pb-team { transition: opacity 0.3s, transform 0.3s; }
#film .win { left: 50%; top: 30%; transform: translate(-50%, -50%); text-align: center; white-space: nowrap; }
#film .win .pb-winner { font-size: clamp(32px, 9vh, 88px); text-shadow: 0 6px 0 rgba(0,0,0,0.35); }
#film .win .pb-sub { font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; text-shadow: 0 2px 10px rgba(0,0,0,0.9); }
/* the in-match HUD lives in #pb-hud (the game's own styles); the landing map in .pb-landing */
#film #pb-hud { z-index: 2; transition: none; }
#film #pb-hud .top { left: 0; right: 0; transform: none; justify-content: center; }
#film #pb-hud .teamscores { position: absolute; left: 12px; top: 88px; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
#film #pb-hud .tscore { padding: 3px 7px; font-size: 13px; }
@media (max-width: 900px) { #film #pb-hud .teamscores { display: none; } }
#film #pb-hud .hidden { display: none; }
#film #pb-hud .pb-crate-item.taking { background: #ffd23d; color: #0b1020; }
#film #pb-hud .pb-crate { pointer-events: none; }
#film #pb-hud .big.pop { animation: none; }
#film .pb-landing { position: absolute; z-index: 2; }
#film .pb-landmap { cursor: default; }
#film .tap { position: absolute; width: 18px; height: 18px; margin: -9px; border-radius: 50%; border: 3px solid #ffd23d; pointer-events: none; }
/* hotspots and the info panel */
#film .hots { position: absolute; inset: 0; z-index: 3; }
#film .hot { position: absolute; transform: translate(-50%, -50%); pointer-events: auto; display: flex; align-items: center; gap: 8px; background: rgba(10,12,28,0.78); border: 2px solid #ffd23d; border-radius: 999px; padding: 6px 14px 6px 8px; color: #fff; cursor: pointer; font: inherit; font-weight: 800; font-size: clamp(12px, 1.9vh, 16px); white-space: nowrap; box-shadow: 0 6px 20px rgba(0,0,0,0.4); }
#film .hot.game { background: linear-gradient(90deg, #ff3d7f, #ff8a1f); border-color: #fff; }
#film .hot .ring { width: 14px; height: 14px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 0 rgba(255,210,61,0.8); animation: pwbPulse 1.6s infinite; flex: none; }
@keyframes pwbPulse { 0% { box-shadow: 0 0 0 0 rgba(255,210,61,0.8); } 70% { box-shadow: 0 0 0 12px rgba(255,210,61,0); } 100% { box-shadow: 0 0 0 0 rgba(255,210,61,0); } }
#film .info { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(500px, 92vw); max-height: 80vh; overflow: auto; padding: 18px; pointer-events: auto; z-index: 6; }
#film .info h3 { margin: 0 0 8px; font-size: 20px; }
#film .info p { margin: 0 0 10px; line-height: 1.45; font-size: 14.5px; opacity: 0.92; }
#film .info ul { margin: 0 0 12px; padding-left: 18px; font-size: 13.5px; line-height: 1.45; }
#film .info .msg { background: rgba(255,210,61,0.16); border-left: 3px solid #ffd23d; padding: 8px 10px; border-radius: 6px; font-size: 13.5px; margin-bottom: 10px; }
#film .btns { display: flex; gap: 8px; flex-wrap: wrap; }
#film button.fb { pointer-events: auto; font: inherit; font-weight: 700; font-size: 14px; color: #fff; background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.22); border-radius: 10px; padding: 9px 14px; cursor: pointer; }
#film button.fb.primary { background: linear-gradient(90deg, #ff3d7f, #ff8a1f); border-color: transparent; }
#film button.fb:hover { filter: brightness(1.15); }
/* the player controls */
#film .ctl { position: absolute; left: 0; right: 0; bottom: 0; padding: 22px 16px max(10px, env(safe-area-inset-bottom)); background: linear-gradient(transparent, rgba(0,0,0,0.8)); pointer-events: auto; transition: opacity 0.35s; display: flex; flex-direction: column; gap: 6px; z-index: 5; }
#film.capture .ctl, #film.capture .hots, #film.capture .bigplay { display: none; }
#film.idle .ctl { opacity: 0; pointer-events: none; }
#film.idle { cursor: none; }
#film .bar { position: relative; height: 22px; cursor: pointer; touch-action: none; }
#film .bar .tr { position: absolute; left: 0; right: 0; top: 9px; height: 5px; border-radius: 3px; background: rgba(255,255,255,0.25); }
#film .bar .fill { position: absolute; left: 0; top: 9px; height: 5px; border-radius: 3px; background: linear-gradient(90deg, #ff3d7f, #ffd23d, #30d5ff); }
#film .bar .knob { position: absolute; top: 4px; width: 15px; height: 15px; margin-left: -7px; border-radius: 50%; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.5); }
#film .bar .mk { position: absolute; top: 5px; width: 3px; height: 13px; margin-left: -1px; background: rgba(255,255,255,0.85); border-radius: 2px; }
#film .bar .tip { position: absolute; bottom: 24px; transform: translateX(-50%); background: rgba(10,12,28,0.9); padding: 3px 8px; border-radius: 6px; font-size: 12px; white-space: nowrap; display: none; }
#film .bar:hover .tip { display: block; }
#film .row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
#film .row .sp { flex: 1; }
#film .row .tm { font-size: 13px; font-variant-numeric: tabular-nums; opacity: 0.9; white-space: nowrap; }
#film .row .ch { font-size: 13px; opacity: 0.85; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 32vw; }
#film .ic { pointer-events: auto; background: rgba(255,255,255,0.1); border: 0; color: #fff; font: inherit; font-size: 16px; min-width: 40px; height: 38px; border-radius: 10px; cursor: pointer; padding: 0 10px; }
#film .ic:hover { background: rgba(255,255,255,0.22); }
#film .ic.off { opacity: 0.5; text-decoration: line-through; }
#film .chapters { position: absolute; right: 16px; bottom: 110px; width: min(360px, 92vw); padding: 8px; pointer-events: auto; z-index: 6; }
#film .chapters button { display: flex; width: 100%; justify-content: space-between; gap: 8px; text-align: left; background: none; border: 0; color: #fff; font: inherit; font-size: 14px; padding: 9px 10px; border-radius: 8px; cursor: pointer; }
#film .chapters button:hover, #film .chapters button.on { background: rgba(255,255,255,0.14); }
#film .bigplay { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 84px; height: 84px; border-radius: 50%; background: rgba(10,12,28,0.6); display: grid; place-items: center; font-size: 34px; opacity: 0; transition: opacity 0.2s; pointer-events: none; z-index: 5; }
#film.paused .bigplay { opacity: 1; }
#film .hidden { display: none !important; }
#film .resumed { position: absolute; left: 50%; top: calc(9vh + 14px); transform: translateX(-50%); z-index: 5; background: rgba(10,12,28,0.85); border: 1px solid rgba(255,255,255,0.2); border-radius: 999px; padding: 6px 14px; font-weight: 700; font-size: 14px; pointer-events: auto; cursor: pointer; white-space: nowrap; }
@media (max-width: 640px) {
  #film .ch, #film .hide-s { display: none !important; } #film .ic { min-width: 36px; padding: 0 7px; }
  #film .side-card { left: 3vw; right: 3vw; width: auto; top: auto; bottom: 12vh; transform: none; max-height: 52vh; font-size: 12px; }
  #film .bl-grid { grid-template-columns: repeat(2, 1fr); }
  #film .bl-grid .pb-eq span.bl { display: none; }
  #film .intel { left: 3vw; right: 3vw; top: 12vh; transform: none; flex-direction: column; align-items: center; }
  #film .intel .side { width: 100%; flex-direction: row; flex-wrap: wrap; } #film .intel .side .stat { flex: 1 1 45%; } #film .intel .side .stat:nth-of-type(n+4), #film .intel .side .big { display: none; }
  #film .intro .pb-teams { grid-template-columns: repeat(2, 1fr); } #film .intro .pb-team:last-child { grid-column: span 2; }
  #film .line { bottom: 26vh; }
}
@media (max-height: 460px) {
  #film .side-card { transform: translateY(-50%) scale(0.72); transform-origin: right center; max-height: 120vh; }
  #film .intel { transform: translateY(-50%) scale(0.8); transform-origin: left center; }
  #film .intro { transform: translate(-50%, -50%) scale(0.7); }
  #film .chapters { bottom: 70px; max-height: 70vh; overflow: auto; }
  #film .cap.s-tag { bottom: 30vh; } #film .line { bottom: 30vh; font-size: 13px; }
}
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
    // ambience: a soft breeze over the campus (filtered noise, slowly swelling)
    const src = this.ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
    const g = this.ctx.createGain(); g.gain.value = 0.04;
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.08; const lg = this.ctx.createGain(); lg.gain.value = 0.02; lfo.connect(lg).connect(g.gain); lfo.start();
    src.connect(f).connect(g).connect(this.out); src.start();
    return this.ctx;
  }
  resume() { this.ensure(); this.ctx?.resume?.().catch(() => {}); this.setMuted(this.ui.muted); }
  setMuted(m) { if (this.out) this.out.gain.value = m ? 0 : 0.8; }
  env(g, t, a, peak, dcy) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dcy); }
  noiseHit(t, { freq = 1200, f1 = null, q = 1, peak = 0.4, a = 0.004, dcy = 0.12, type = 'bandpass' } = {}) {
    const c = this.ctx; const s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + a + dcy); f.Q.value = q;
    const g = c.createGain(); this.env(g, t, a, peak, dcy);
    s.connect(f).connect(g).connect(this.out); s.start(t, (t * 0.37) % 1.5); s.stop(t + a + dcy + 0.05);
  }
  tone(t, { f0 = 600, f1 = f0, peak = 0.2, a = 0.006, dur = 0.1, type = 'sine', vib = 0 } = {}) {
    const c = this.ctx; const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + a + dur);
    if (vib) { const l = c.createOscillator(); l.frequency.value = 6; const lg = c.createGain(); lg.gain.value = vib; l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + a + dur); }
    const g = c.createGain(); this.env(g, t, a, peak, dur);
    o.connect(g).connect(this.out); o.start(t); o.stop(t + a + dur + 0.05);
  }
  play(kind, p) {
    if (!this.ensure() || this.ui.muted || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime + 0.01;
    const notes = (list, gap, o = {}) => list.forEach((f, i) => this.tone(t + i * gap, { f0: f, peak: 0.12, dur: 0.14, type: 'triangle', ...o }));
    switch (kind) {
      case 'pop': { const k = { rapid: 1.25, burst: 1.1, spread: 0.8, precision: 0.7, launcher: 0.6 }[p] || 1; this.tone(t, { f0: 520 * k, f1: 140 * k, peak: 0.18, dur: 0.09 }); this.noiseHit(t, { freq: 2400, q: 2, peak: 0.08, dcy: 0.03 }); break; } // a soft toy "thup"
      case 'thump': this.tone(t, { f0: 160, f1: 60, peak: 0.3, dur: 0.22 }); break;
      case 'splat': this.noiseHit(t, { freq: 1600, f1: 220, q: 0.7, peak: 0.3, dcy: 0.16, type: 'lowpass' }); break;
      case 'splash': this.noiseHit(t, { freq: 900, f1: 160, q: 0.6, peak: 0.5, dcy: 0.45, type: 'lowpass' }); this.tone(t, { f0: 180, f1: 70, peak: 0.25, dur: 0.3 }); break;
      case 'burst': this.tone(t, { f0: 120, f1: 45, peak: 0.45, dur: 0.4 }); this.noiseHit(t, { freq: 1800, f1: 200, q: 0.5, peak: 0.55, dcy: 0.6, type: 'lowpass' }); for (let i = 0; i < 6; i++) this.noiseHit(t + 0.08 + i * 0.05, { freq: 1400 - i * 120, q: 1, peak: 0.12, dcy: 0.1, type: 'lowpass' }); break;
      case 'toss': this.noiseHit(t, { freq: 600, f1: 2200, q: 1.5, peak: 0.12, a: 0.15, dcy: 0.25 }); break;
      case 'crate': this.tone(t, { f0: 150, f1: 90, peak: 0.25, dur: 0.12, type: 'triangle' }); this.tone(t + 0.12, { f0: 420, f1: 300, peak: 0.06, a: 0.1, dur: 0.35, type: 'sawtooth' }); this.noiseHit(t + 0.5, { freq: 300, peak: 0.2, dcy: 0.1, type: 'lowpass' }); break;
      case 'ding': for (const [f, d] of [[1046, 0], [1568, 0.06]]) this.tone(t + d, { f0: f, peak: 0.16, dur: 0.16, type: 'triangle' }); break; // the game's pick-up ding
      case 'switch': this.noiseHit(t, { freq: 3000, q: 4, peak: 0.12, dcy: 0.03 }); this.noiseHit(t + 0.08, { freq: 2200, q: 4, peak: 0.12, dcy: 0.03 }); break;
      case 'tap': case 'blip': this.tone(t, { f0: kind === 'tap' ? 1320 : 1760, peak: 0.08, dur: 0.07, type: 'square' }); break;
      case 'scan': this.tone(t, { f0: 300, f1: 2400, peak: 0.07, a: 0.4, dur: 0.8, type: 'sine' }); break;
      case 'map': this.noiseHit(t, { freq: 2500, f1: 900, q: 1, peak: 0.1, dcy: 0.2 }); break;
      case 'braam': for (const [f, d] of [[55, 0], [55.4, 0], [82.4, 0.02], [110, 0.03]]) this.tone(t + d, { f0: f, f1: f * 0.98, peak: 0.16, a: 0.25, dur: 2.6, type: 'sawtooth' }); this.noiseHit(t, { freq: 200, peak: 0.2, a: 0.02, dcy: 1.2, type: 'lowpass' }); break;
      case 'hit': this.tone(t, { f0: 90, f1: 40, peak: 0.5, dur: 0.5 }); this.noiseHit(t, { freq: 3000, f1: 400, q: 0.5, peak: 0.3, dcy: 0.3, type: 'lowpass' }); break;
      case 'whoosh': this.noiseHit(t, { freq: 400, f1: 2800, q: 1.2, peak: 0.22, a: 0.35, dcy: 0.45 }); break;
      case 'dive': this.noiseHit(t, { freq: 3000, f1: 300, q: 1, peak: 0.25, a: 0.5, dcy: 1.6 }); break;
      case 'land': case 'thud': this.tone(t, { f0: 110, f1: 40, peak: 0.5, dur: 0.35 }); this.noiseHit(t, { freq: 400, peak: 0.3, dcy: 0.2, type: 'lowpass' }); break;
      case 'count': this.tone(t, { f0: 440, peak: 0.25, dur: 0.15 }); break; // the game's countdown beep
      case 'go': this.tone(t, { f0: 880, peak: 0.28, dur: 0.4 }); notes([523, 659, 784, 1046], 0.07, { type: 'square', peak: 0.08 }); this.play('hit'); break;
      case 'alarm': [0, 0.35, 0.7].forEach((d) => { this.tone(t + d, { f0: 988, peak: 0.12, dur: 0.14, type: 'triangle' }); this.tone(t + d + 0.15, { f0: 740, peak: 0.12, dur: 0.14, type: 'triangle' }); }); break;
      case 'drone': this.tone(t, { f0: 220, f1: 200, peak: 0.08, a: 1.2, dur: 4, type: 'triangle', vib: 3 }); break;
      case 'jingle': notes([523, 659, 784, 1046], 0.09, { type: 'square', peak: 0.1 }); break; // the game's tag jingle
      case 'slow': this.tone(t, { f0: 400, f1: 60, peak: 0.2, a: 0.05, dur: 0.9, type: 'sawtooth' }); this.noiseHit(t, { freq: 1200, f1: 200, peak: 0.15, dcy: 0.9, type: 'lowpass' }); break;
      case 'unslow': this.noiseHit(t, { freq: 200, f1: 2600, peak: 0.15, a: 0.3, dcy: 0.2 }); break;
      case 'zone': this.tone(t, { f0: 70, f1: 90, peak: 0.25, a: 1.4, dur: 3, type: 'sawtooth' }); break;
      case 'heartbeat': this.tone(t, { f0: 70, f1: 45, peak: 0.35, dur: 0.12 }); this.tone(t + 0.22, { f0: 62, f1: 42, peak: 0.25, dur: 0.12 }); break;
      case 'shield': this.tone(t, { f0: 400, f1: 1600, peak: 0.12, a: 0.25, dur: 0.6, type: 'sine', vib: 30 }); notes([784, 988, 1175], 0.06, { peak: 0.06 }); break;
      case 'shieldHit': this.tone(t, { f0: 2093, f1: 1800, peak: 0.12, dur: 0.25, type: 'sine' }); this.noiseHit(t, { freq: 4000, q: 3, peak: 0.08, dcy: 0.05 }); break;
      case 'scrub': for (let i = 0; i < 12; i++) this.noiseHit(t + i * 0.33, { freq: 2800, q: 2, peak: 0.06, a: 0.05, dcy: 0.18 }); break;
      case 'revive': notes([392, 523, 659, 784], 0.08, { peak: 0.1 }); break;
      case 'final': this.play('hit'); notes([523, 659, 784, 1046, 1318], 0.08, { type: 'square', peak: 0.1 }); break;
      case 'win': notes([523, 523, 784, 1046], 0.16, { type: 'square', peak: 0.1, dur: 0.2 }); this.play('braam'); break;
      case 'cheer': for (let i = 0; i < 8; i++) this.noiseHit(t + i * 0.1, { freq: 900 + i * 120, q: 0.7, peak: 0.1, dcy: 0.6 }); break;
      default: break;
    }
  }
  dispose() { this.ctx?.close?.().catch(() => {}); }
}

// ---------- game info for the hotspots ----------
const INFO = {
  crates: () => ({
    title: '📦 How crates work',
    body: `<p>In Campus Royale everyone lands with a ${EQUIPMENT_BY_ID[ROYALE.start.blaster].short} paintball blaster and ${ROYALE.start.hopper} paintballs. Everything else is in supply crates at verified supply spots across the campus, indoors and out.</p>
      <ul><li>Walk up and press <b>E</b>: the lid opens (everyone sees it open) and the crate panel lists what is inside.</li>
      <li>Take an item with <b>1–9</b> (or E for the first). The server owns every item, so two players can never take the same one.</li>
      <li>Crates hold 2–4 things: paintball blasters (with a full hopper), paintball packs, paint refill packs, paint bombs, colour-smoke bombs, cleaning wipes and kits, masks and padded vests (levels 1–3), a paint shield or a paint-scan pulse.</li>
      <li>Nothing respawns during a match. Out players drop what they carried as a pile. One special supply drop lands mid-match (announced ${ROYALE.airdrop.warn} s ahead) with better gear.</li></ul>`,
  }),
  blasters: () => ({
    title: '🎯 The six paintball blasters',
    body: `<ul>${EQUIPMENT.map((e) => `<li><b style="color:${e.colour}">${esc(e.name)}</b>: ${esc(BLURB[e.id])} ${e.tag}${e.pellets > 1 ? ` ×${e.pellets}` : ''} paint per hit, ${e.range} m range, hopper ${e.magazine}, reload ${e.reload} s.</li>`).join('')}</ul><p>You carry two (switch with Q). A precision paint hit (on the mask) counts extra.</p>`,
  }),
};

export class FilmUI {
  constructor(film, { capture = false } = {}) {
    this.film = film; this.capture = capture;
    const prefs = store.get(PREFS) || {};
    this.muted = !!prefs.muted; this.cc = prefs.cc !== false;
    this.audio = new FilmAudio(this);
    this.styleEl = document.createElement('style'); this.styleEl.textContent = STYLE; document.head.append(this.styleEl);
    const el = document.createElement('div'); el.id = 'film'; el.className = capture ? 'capture' : '';
    el.innerHTML = `
      <div class="stage"></div>
      <div class="vig"></div>
      <div class="pnls"></div>
      <div class="cap"><div class="k"></div><div class="n"></div><div class="rule"></div></div>
      <div class="title"><h1></h1><div class="tbar"></div><p></p></div>
      <div class="line"><b></b><span></span></div>
      <div class="lb top"></div><div class="lb bot"></div>
      <div class="hots"></div>
      <div class="wipe"></div><div class="flash"></div><div class="fade"></div>
      <div class="bigplay">▶</div>
      <div class="resumed hidden" data-film="resumed"></div>
      <div class="info glass hidden" role="dialog" aria-label="About the game"></div>
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
          <button class="ic" data-k="mute" title="Mute (M)" aria-label="Mute">🔊</button>
          <button class="ic" data-k="replay" title="Replay from the start" aria-label="Replay">↺</button>
          <button class="ic" data-k="exit" title="Back to the title (Esc)" aria-label="Exit the film">✕</button>
        </div>
      </div>`;
    document.body.append(el);
    this.el = el;
    const q = (s) => el.querySelector(s);
    this.ui = { stage: q('.stage'), vig: q('.vig'), pnls: q('.pnls'), cap: q('.cap'), k: q('.cap .k'), n: q('.cap .n'), rule: q('.cap .rule'), title: q('.title'), h1: q('.title h1'), tbar: q('.title .tbar'), sub: q('.title p'), line: q('.line'), who: q('.line b'), text: q('.line span'), lbt: q('.lb.top'), lbb: q('.lb.bot'), hots: q('.hots'), wipe: q('.wipe'), flash: q('.flash'), fade: q('.fade'), info: q('.info'), chapters: q('.chapters'), bar: q('.bar'), fill: q('.bar .fill'), knob: q('.bar .knob'), tip: q('.bar .tip'), time: q('.row .tm'), ch: q('.row .ch'), btn: Object.fromEntries([...el.querySelectorAll('.ic')].map((b) => [b.dataset.k, b])) };
    this.buildHud();
    this.panelEls = new Map();
    this.hotEls = new Map();
    this.lastSave = 0;
    // scene markers
    for (const c of film.chapters) {
      if (c.index === 0) continue;
      const m = document.createElement('div'); m.className = 'mk'; m.style.left = `${(c.t0 / film.duration) * 100}%`; m.title = c.title; this.ui.bar.append(m);
    }
    // hit markers and big messages for the HUD's player, from the match events
    this.hitTimes = [];
    for (const s of film.shots) for (const f of s.fire || []) if (f.hit?.actor && s.hud) this.hitTimes.push({ t: s.t0 + f.t + f.dur, by: f.by, who: f.hit.actor, precision: f.kind === 'precision' && f.hit.head, shield: !!f.hit.shield });
    if (!capture) this.bind();
    this.sync();
  }

  // The in-match HUD: the same elements and classes as js/paintball/client/index.js buildHud() + royale.js hudParts().
  buildHud() {
    const d = (cls, tag = 'div') => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };
    const H = { root: d(''), splatter: d('splatter'), top: d('top'), teams: d('teamscores'), timer: d('timer'), my: d('myscore'), feed: d('feed'), map: d('minimap round', 'canvas'), voice: d('voice'), paint: d('paint'), paintLabel: d('label'), meterBox: d('meter'), meter: d('', 'i'), ammo: d('ammo'), name: d('name'), count: d('count'), reloadBox: d('reload'), other: d('other'), cross: d('cross'), hit: d('hitmark'), big: d('big'), msg: d('center-msg'), hint: d('hint'), inv: d('pb-inv'), zone: d('pb-zoneinfo'), left: d('pb-left'), drop: d('pb-dropinfo'), prompt: d('pb-prompt'), channel: d('pb-channel'), chanBar: d('', 'i'), big2: d('pb-bigmap hidden', 'canvas'), crate: d('pb-crate') };
    H.root.id = 'pb-hud'; H.root.className = 'royale inv-open';
    H.map.width = 170; H.map.height = 170;
    H.voice.innerHTML = '<div class="me">🎤 Voice off</div>';
    H.top.append(H.teams, H.timer); H.meterBox.append(H.meter); H.paint.append(H.paintLabel, H.meterBox); H.reloadBox.append(d('', 'i'));
    H.ammo.append(H.name, H.count, H.reloadBox, H.other); H.channel.append(H.chanBar);
    H.hint.textContent = HINT;
    H.root.append(H.splatter, H.top, H.my, H.feed, H.map, H.voice, H.paint, H.ammo, H.cross, H.hit, H.big, H.msg, H.hint, H.inv, H.zone, H.left, H.drop, H.prompt, H.channel, H.big2, H.crate);
    H.root.style.opacity = '0';
    this.el.querySelector('.pnls').before(H.root);
    this.hud = H;
  }

  bind() {
    const ui = this.ui; const f = this.film;
    const act = {
      play: () => f.toggle(), prev: () => this.chapter(-1), next: () => this.chapter(1), chapters: () => this.toggleChapters(),
      cc: () => this.setCC(!this.cc), mute: () => this.setMute(!this.muted),
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
    this.onResize = () => { this.sig = {}; };
    window.addEventListener('resize', this.onResize);
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
      default: if (/^Digit[1-8]$/.test(e.code)) { const c = f.chapters[Number(e.code.slice(5)) - 1]; if (c) f.seek(c.t0 + 0.01); }
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
  setMute(on) { this.muted = on; this.audio.setMuted(on); this.film.setMuted(on); this.savePrefs(); this.sync(); }
  savePrefs() { store.set(PREFS, { muted: this.muted, cc: this.cc }); }

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
    if (f.paused) this.el.classList.remove('idle');
  }

  // Sound cues crossed between t0 and t1 (normal playback only, not jumps).
  fire(t0, t1) {
    if (this.capture || t1 <= t0 || t1 - t0 > 0.5) return;
    for (const c of this.film.cues) if (c.t >= t0 && c.t < t1) this.audio.play(c.kind, c.p);
    for (const g of this.hitTimes) if (g.t >= t0 && g.t < t1 && g.shield) this.audio.play('shieldHit');
    for (const e of this.film.events) if (e.t >= t0 && e.t < t1 && e.type === 'tag') this.audio.play('jingle');
    if (t1 - this.lastSave > 3 || t1 < this.lastSave) { this.lastSave = t1; this.remember(t1); }
  }

  // ---------- per frame ----------
  update(t) {
    const f = this.film; const ui = this.ui; const D = f.duration;
    const s = f.shots[f.shotAt(t)]; const lt = t - s.t0;
    // fades: in from black, out to black, short dips at scene changes, a paint wipe into the match, white flashes
    let black = 1 - smooth(0, 1.4, t);
    black = Math.max(black, smooth(D - 1.4, D - 0.05, t));
    for (const d of f.dips) if (d !== f.chapters[3].t0) black = Math.max(black, smooth(d - 0.35, d, t) * (1 - smooth(d, d + 0.4, t)));
    ui.fade.style.opacity = black.toFixed(3);
    const w = f.chapters[3].t0; const wu = (t - (w - 0.45)) / 0.9;
    ui.wipe.style.transform = wu > 0 && wu < 1 ? `translateX(${(-120 + wu * 240).toFixed(1)}%)` : 'translateX(-200%)';
    let flash = 0;
    for (const m of ['countdown', 'start', 'end']) { const x = f.marks[m]; if (x != null) flash = Math.max(flash, (m === 'start' ? 0 : 1) * (1 - smooth(x, x + 0.5, t)) * (t >= x ? 0.55 : 0)); }
    const go = (f.marks.countdown ?? -9) + 3.3; flash = Math.max(flash, t >= go ? 0.5 * (1 - smooth(go, go + 0.5, t)) : 0);
    ui.flash.style.opacity = flash.toFixed(3);
    // letterbox: per shot (0 in gameplay with the HUD, 1 in the cinematic shots)
    const lbv = typeof s.lb === 'function' ? s.lb(lt) : s.lb ?? 1;
    const prev = f.shots[f.shotAt(t) - 1]; const pv = prev ? (typeof prev.lb === 'function' ? prev.lb(prev.dur) : prev.lb ?? 1) : lbv;
    const lb = pv + (lbv - pv) * smooth(0, 0.35, lt);
    ui.lbt.style.transform = ui.lbb.style.transform = `scaleY(${lb.toFixed(3)})`; ui.lbt.style.transformOrigin = 'top'; ui.lbb.style.transformOrigin = 'bottom';
    ui.vig.style.opacity = (0.4 + 0.6 * lb).toFixed(2);
    // title cards
    const card = f.titles.find((c) => t >= c.t0 && t < c.t1);
    if (card) {
      const a = smooth(card.t0, card.t0 + 0.9, t) * (1 - smooth(card.t1 - 0.8, card.t1, t));
      ui.title.style.opacity = a.toFixed(3);
      ui.title.className = `title ${card.style || ''}`;
      if (ui.title.dataset.k !== card.title) {
        ui.title.dataset.k = card.title;
        ui.h1.innerHTML = card.style === 'open' ? `<span class="w">${esc(card.title.replace(/ PLAY WITH BITSIANS$/, ''))}</span><span class="g">PLAY WITH BITSIANS</span>` : card.style === 'end' ? `<span class="g">${esc(card.title)}</span>` : esc(card.title);
        ui.sub.textContent = card.sub;
      }
      const k = smooth(card.t0, card.t0 + 1.2, t);
      ui.h1.style.transform = `scale(${(1.12 - 0.12 * k).toFixed(3)})`;
      ui.tbar.style.transform = `scaleX(${smooth(card.t0 + 0.4, card.t0 + 1.6, t).toFixed(3)})`;
    } else ui.title.style.opacity = '0';
    // trailer captions
    const cap = f.captions.find((c) => t >= c.t0 - 0.01 && t < c.t1);
    if (cap) {
      const a = smooth(cap.t0, cap.t0 + 0.25, t) * (1 - smooth(cap.t1 - 0.4, cap.t1, t));
      ui.cap.style.opacity = a.toFixed(3);
      const st = cap.style || 'plain';
      if (ui.cap.className !== `cap s-${st}`) ui.cap.className = `cap s-${st}`;
      const pop = 1 - smooth(cap.t0, cap.t0 + 0.3, t);
      ui.cap.style.transform = st === 'punch' ? `translate(-50%, -50%) scale(${(1 + pop * 0.35).toFixed(3)}) skewX(-6deg)` : `translateX(${(pop * -30).toFixed(1)}px)`;
      ui.rule.style.width = `${(smooth(cap.t0 + 0.1, cap.t0 + 0.8, t) * 100).toFixed(1)}%`;
      if (ui.n.textContent !== cap.title) { ui.k.textContent = cap.kicker || ''; ui.n.textContent = cap.title; }
    } else ui.cap.style.opacity = '0';
    // squad comms
    const line = [...f.lines].reverse().find((l) => t >= l.t0 && t < l.t1);
    if (line) {
      ui.line.style.opacity = (smooth(line.t0, line.t0 + 0.15, t) * (1 - smooth(line.t1 - 0.2, line.t1, t))).toFixed(3);
      if (ui.text.textContent !== line.text) { ui.who.textContent = CAST_BY_ID[line.who]?.name || line.who; ui.who.style.color = SPEAKER_COLOUR(line.who); ui.line.style.borderLeftColor = SPEAKER_COLOUR(line.who); ui.text.textContent = line.text; }
    } else ui.line.style.opacity = '0';
    this.updateHud(t, s, lt);
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

  setText(el, v) { if (el.textContent !== v) el.textContent = v; }
  setHtml(el, v) { if (el.dataset.h !== v) { el.dataset.h = v; el.innerHTML = v; } }

  // ---------- the HUD (a copy of the live game's, driven by the film's match state) ----------
  updateHud(t, s, lt) {
    const f = this.film; const H = this.hud; const cfg = s.hud;
    if (!cfg) { H.root.style.opacity = '0'; return; }
    const fade = cfg.fadeIn ? smooth(cfg.fadeIn[0], cfg.fadeIn[1], lt) : smooth(0, 0.2, lt) + (f.shots[f.shotAt(t) - 1]?.hud ? 1 : 0);
    H.root.style.opacity = Math.min(1, fade).toFixed(3);
    const mode = cfg.mode || 'full';
    const pov = cfg.pov || 'advait'; const me = f.stateAt(pov, t); const inv = me.inv;
    const n = f.by[pov];
    const pos = n?.group.visible ? n.pos : (this.lastPos ||= new THREE.Vector3(MATCH.landing.x, 0, MATCH.landing.z));
    if (n?.group.visible) this.lastPos = n.pos.clone();
    const yaw = n?.group.visible ? n.group.rotation.y : 0;
    const mt = f.matchTime(t);
    const playing = mode !== 'loot' && mode !== 'countdown' && mt != null && mt >= 0;
    const show = (el, on) => el.classList.toggle('hidden', !on);
    const full = mode === 'full' || mode === 'scope';
    for (const el of [H.top, H.my, H.map, H.voice, H.left, H.hint]) show(el, full || mode === 'countdown');
    show(H.zone, full || mode === 'countdown');
    for (const el of [H.paint, H.ammo, H.inv, H.cross]) show(el, mode !== 'feed');
    show(H.feed, true);
    H.root.classList.toggle('zoom', mode === 'scope');
    // top: squad scores and the timer (the time until the zone's next step)
    const Z = zoneState(mt ?? 0);
    this.setText(H.timer, mode === 'countdown' ? 'GET READY' : fmtTime(Math.max(0, Z.ends - (mt ?? 0))));
    const ts = f.teamScores(t);
    this.setHtml(H.teams, ts.map((v, k) => `<span class="tscore" style="--team:${TEAMS[k].colour}">${TEAMS[k].name} ${v}</span>`).join(''));
    const score = me.tags * 100 + me.assists * 40;
    this.setText(H.my, `⭐ ${score}  ·  🎨 ${me.tags} tags  ·  🤝 ${me.assists}  ·  📦 ${me.supplies}`);
    const st = f.standing(t);
    this.setText(H.left, `👥 ${st.players} left · ${st.squads} squads · ${MATCH.mode} · Campus Royale`);
    // paint zone line (royale.js updateHud)
    const left = Math.max(0, Z.ends - (mt ?? 0)); const dOut = Math.hypot(pos.x - Z.x, pos.z - Z.z) - Z.r;
    let zt = !playing ? 'Paint zone: the whole campus' : Z.shrinking ? `🎨 Paint zone closing · ${fmtTime(left)}` : Z.r > 0.5 ? `🎨 Paint zone shrinks in ${fmtTime(left)}` : '🎨 Paint zone closed';
    if (dOut > 0 && playing) zt += ` · OUTSIDE: ${Math.round(dOut)} m to safety (+${Z.dps}/s paint)`;
    else if (!Z.shrinking && left < 20 && playing && Z.r > 0.5) zt += ' · get inside the white circle!';
    this.setText(H.zone, zt); H.zone.classList.toggle('warn', dOut > 0 && playing);
    // the special supply drop
    const A = MATCH.airdrop; const ann = ROYALE.airdrop.at - ROYALE.airdrop.warn;
    const dist = Math.round(Math.hypot(A.x - pos.x, A.z - pos.z)); const dn = dirName(A.x - pos.x, A.z - pos.z);
    const dt = playing && mt >= ROYALE.airdrop.at ? `📦 Supply drop landed ${dist} m ${dn}` : playing && mt >= ann ? `📦 Supply drop in ${fmtTime(ROYALE.airdrop.at - mt)} · ${dist} m ${dn}` : '';
    this.setText(H.drop, dt); H.drop.style.display = dt && full ? '' : 'none';
    // feed: tags, outs, clean-offs, notes from the last 6 s
    const feed = f.feed.filter((e) => e.t <= t && t - e.t < 6 && (!e.only || e.only === pov)).slice(-6);
    this.setHtml(H.feed, feed.map((e) => `<div class="${e.mine?.includes(pov) ? 'mine' : ''}">${esc(e.text)}</div>`).join(''));
    // paint meter, blaster, paintballs, inventory
    H.meter.style.width = `${(me.paint / PAINT_MAX) * 100}%`;
    this.setText(H.paintLabel, `Paint ${Math.round(me.paint)} / ${PAINT_MAX}`);
    const b = inv.slot ? inv.secondary : inv.primary;
    const e = EQUIPMENT_BY_ID[b] || { name: 'No paintball blaster: open a supply crate', short: '—', colour: '#bbb' };
    const o = EQUIPMENT_BY_ID[inv.slot ? inv.primary : inv.secondary] || { short: 'empty' };
    this.setText(H.name, e.name); H.name.style.color = e.colour;
    this.setHtml(H.count, `${inv.hopper[inv.slot]}<small> / ${inv.ammo[b] || 0} paintballs remaining</small>`);
    H.reloadBox.style.visibility = 'hidden';
    this.setText(H.other, `Q: ${o.short} (${inv.hopper[inv.slot ? 0 : 1]})`);
    this.setHtml(H.inv, invHtml(inv));
    // center message, prompt, channel
    let msg = '';
    if (me.down) msg = `🎨 Fully painted! A squadmate can clean you off (E) · ${ROYALE.down} s`;
    else if (me.shieldUntil > t) msg = `🛡️ Paint shield up · ${Math.ceil(me.shieldUntil - t)} s (no firing from inside)`;
    this.setText(H.msg, msg); H.msg.style.display = msg ? '' : 'none';
    const pr = (cfg.prompt || []).find(([a, z]) => lt >= a && lt < z);
    this.setText(H.prompt, pr ? pr[2] : ''); H.prompt.style.display = pr ? '' : 'none';
    const ch = cfg.channel;
    const on = ch && lt >= ch[0] && lt < ch[1];
    H.channel.style.display = on ? '' : 'none';
    if (on) { H.chanBar.style.width = `${(100 * (lt - ch[0])) / (ch[1] - ch[0])}%`; H.channel.dataset.label = ch[2]; }
    // big messages: the countdown, TAG! +100, ASSIST +40
    let big = ''; let bc = '#fff'; let bs = 1;
    if (mode === 'countdown') {
      if (lt >= 0.3 && lt < 3.3) { big = String(3 - Math.floor(lt - 0.3)); bc = '#ffd23d'; bs = 1.4 - 0.4 * smooth(0, 0.25, (lt - 0.3) % 1); } else if (lt >= 3.3) { big = 'PAINTBALL MATCH STARTED!'; bc = '#7cff4f'; bs = 1.25 - 0.25 * smooth(3.3, 3.6, lt); }
    } else {
      const tg = f.events.filter((ev) => ev.type === 'tag' && ev.t <= t && t - ev.t < 1.1 && (ev.by === pov || ev.assists?.includes(pov))).at(-1);
      if (tg) { big = tg.by === pov ? 'TAG! +100' : 'ASSIST +40'; bc = tg.by === pov ? '#7cff4f' : '#30d5ff'; bs = 1.3 - 0.3 * smooth(tg.t, tg.t + 0.2, t); }
    }
    this.setText(H.big, big); H.big.style.color = bc; H.big.style.transform = `translate(-50%, -50%) scale(${bs.toFixed(3)})`;
    if (mode === 'countdown' && lt >= 3.3) H.big.style.fontSize = 'clamp(22px, 5.4vw, 60px)'; else H.big.style.fontSize = '';
    // hit markers
    const hm = this.hitTimes.filter((g) => g.by === pov && t >= g.t && t - g.t < 0.35).at(-1);
    if (hm) { this.setText(H.hit, hm.shield ? '🛡' : '✕'); H.hit.className = `hitmark${hm.precision ? ' precision' : ''}`; const u = (t - hm.t) / 0.35; H.hit.style.opacity = (1 - u).toFixed(2); H.hit.style.transform = `scale(${(1.4 - 0.5 * u).toFixed(2)})`; } else H.hit.style.opacity = '0';
    // the crate panel
    this.crate(cfg.crate, lt);
    // minimap and big map
    if (!H.map.classList.contains('hidden')) this.drawMini(H.map, t, pos, yaw, pov, playing ? Z : null, mt);
    const bigOn = !!cfg.bigmap && lt > 0.3;
    H.big2.classList.toggle('hidden', !bigOn);
    if (bigOn) this.drawBig(H.big2, t, pos, yaw, pov, Z, mt);
  }

  crate(c, lt) {
    const el = this.hud.crate;
    const on = c && lt >= c.from && lt < c.to;
    el.style.display = on ? '' : 'none';
    if (!on) return;
    const left = c.items.map((it, i) => ({ it, i })).filter(({ i }) => !(c.take[i] != null && lt >= c.take[i]));
    const taking = c.items.findIndex((_, i) => c.take[i] != null && lt >= c.take[i] - 0.3 && lt < c.take[i]);
    const html = `<b>${esc(c.title)}</b>${left.length ? left.map(({ it: [id, n], i }, k) => { const it = ITEMS[id]; return `<button class="pb-crate-item${i === taking ? ' taking' : ''}" data-pb-item="${id}"><span class="k">${k + 1}</span><span class="dot" style="background:${it.colour}"></span>${esc(`${it.icon} ${it.name}${n > 1 ? ` ×${n}` : ''}`)}</button>`; }).join('') : '<div class="pb-note">Empty.</div>'}<div class="pb-note">Press 1–9 (or E for the first) to take an item.</div>`;
    this.setHtml(el, html);
  }

  // The minimap (royale.js drawMini): a north-up crop 90 m round the player, the zone, the drop, the squadmate.
  drawMini(cv, t, pos, yaw, pov, Z, mt) {
    const g = cv.getContext('2d');
    drawMiniBase(g, cv, pos);
    const w = miniXform(cv, pos);
    if (Z) drawZone(g, w, Z);
    this.mapMarks(g, w, t, pov, mt, 3);
    drawArrow(g, w.X(pos.x), w.Z(pos.z), yaw);
  }
  drawBig(cv, t, pos, yaw, pov, Z, mt) {
    const W = Math.min(innerWidth - 40, 720); const Hh = innerHeight - 90; const scale = Math.min(W / 1100, Hh / 1790);
    const cw = Math.round(1100 * scale); const ch = Math.round(1790 * scale);
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    const g = cv.getContext('2d'); const w = mapXform(cv);
    g.fillStyle = '#0b1020'; g.fillRect(0, 0, cv.width, cv.height);
    drawBase(g, w); drawZone(g, w, Z);
    this.mapMarks(g, w, t, pov, mt, 4, true);
    drawArrow(g, w.X(pos.x), w.Z(pos.z), yaw);
  }
  mapMarks(g, w, t, pov, mt, radius, labels = false) {
    const f = this.film; const A = MATCH.airdrop;
    if (mt != null && mt >= ROYALE.airdrop.at - ROYALE.airdrop.warn) { g.fillStyle = '#ffd23d'; g.strokeStyle = '#ff3d7f'; g.lineWidth = 2; g.beginPath(); g.rect(w.X(A.x) - 5, w.Z(A.z) - 5, 10, 10); g.fill(); g.stroke(); if (labels) { g.fillStyle = '#fff'; g.font = '700 12px system-ui'; g.fillText('📦 supply drop', w.X(A.x) + 8, w.Z(A.z) + 4); } }
    const team = CAST_BY_ID[pov].team;
    for (const c of CAST) {
      if (c.id === pov || c.team !== team) continue;
      const n = f.by[c.id]; if (!n.group.visible || f.stateAt(c.id, t).out) continue;
      g.fillStyle = teamColour(c); g.beginPath(); g.arc(w.X(n.pos.x), w.Z(n.pos.z), radius, 0, Math.PI * 2); g.fill();
    }
  }

  // ---------- overlays ----------
  updatePanels(t) {
    const f = this.film;
    for (const p of f.panels) {
      const on = t >= p.t0 && t < p.t1;
      let el = this.panelEls.get(p);
      if (!on) { if (el) el.style.display = 'none'; continue; }
      if (!el) { el = document.createElement('div'); this.ui.pnls.append(el); this.panelEls.set(p, el); }
      el.style.display = '';
      const lt = t - p.t0;
      const a = smooth(0, 0.3, lt) * (1 - smooth(p.t1 - p.t0 - 0.3, p.t1 - p.t0, lt));
      el.style.opacity = a.toFixed(3);
      const html = this[`panel_${p.kind}`]?.(lt, el, p, t);
      if (html != null && el.dataset.h !== html) { el.dataset.h = html; el.innerHTML = html; this.after?.(el, p); this.after = null; }
      this[`draw_${p.kind}`]?.(lt, el, p, t);
    }
  }

  // Scene 1: the tactical map, drawn from the campus outline and the verified landing / supply registries.
  panel_tactical(lt, el) {
    el.className = 'intel';
    const S = this.film.spots && readSpots(this.film.spots);
    const areas = S ? supplyAreas(S) : [];
    this.intelAreas = areas;
    const step = (k) => lt > 2.6 + k * 0.55;
    return `<div class="mapbox"><canvas></canvas></div><div class="side">
      <h4>ARENA INTEL</h4><div class="big">BITS PILANI<br>WHOLE CAMPUS</div>
      <div class="stat" style="--c:#ffffff"><span>Campus boundary</span><b>${Math.round(perimeter() / 10) / 100} km</b></div>
      <div class="stat${lt > 1.6 ? '' : ' off'}" style="--c:#f5f6fa"><span>🪂 Landing spots</span><b>${S ? S.drops.length : '…'}</b></div>
      <div class="stat${lt > 2.2 ? '' : ' off'}" style="--c:#30d5ff"><span>📦 Supply spots</span><b>${S ? S.supplies.length : '…'}</b></div>
      ${areas.slice(0, 4).map((a, k) => `<div class="stat${step(k) ? '' : ' off'}" style="--c:#ffd23d"><span>${esc(a.name)}</span><b>${a.n}</b></div>`).join('')}
      <div class="stat${lt > 5.2 ? '' : ' off'}" style="--c:#ff3d7f"><span>🎨 Paint zone</span><b>${ZONE_PHASES.length} phases</b></div></div>`;
  }
  draw_tactical(lt, el) {
    const cv = el.querySelector('canvas'); if (!cv) return;
    const Hh = Math.max(200, Math.min(innerHeight * 0.6, 600)); const k = Hh / 1820;
    const cw = Math.round(1130 * k); const chh = Math.round(Hh);
    if (cv.width !== cw || cv.height !== chh) { cv.width = cw; cv.height = chh; cv.style.width = `${cw}px`; cv.style.height = `${chh}px`; }
    const g = cv.getContext('2d'); const w = mapXform(cv, 4);
    g.fillStyle = '#06101c'; g.fillRect(0, 0, cv.width, cv.height);
    g.globalAlpha = smooth(0, 1.2, lt); drawBase(g, w); g.globalAlpha = 1;
    // a cyan tactical grid
    g.strokeStyle = 'rgba(48,213,255,0.16)'; g.lineWidth = 1;
    for (let x = -400; x <= 700; x += 100) { g.beginPath(); g.moveTo(w.X(x), 0); g.lineTo(w.X(x), cv.height); g.stroke(); }
    for (let z = -400; z <= 1400; z += 100) { g.beginPath(); g.moveTo(0, w.Z(z)); g.lineTo(cv.width, w.Z(z)); g.stroke(); }
    // the boundary, tracing itself
    const pts = boundaryPts();
    const upto = smooth(0.2, 2.2, lt) * pts.total;
    g.strokeStyle = '#ffd23d'; g.lineWidth = 3; g.shadowColor = '#ffd23d'; g.shadowBlur = 8; g.beginPath();
    let d = 0;
    for (let i = 0; i < pts.p.length; i++) {
      const [x, z] = pts.p[i];
      if (i === 0) { g.moveTo(w.X(x), w.Z(z)); continue; }
      const [x0, z0] = pts.p[i - 1]; const L = Math.hypot(x - x0, z - z0);
      if (d + L <= upto) { g.lineTo(w.X(x), w.Z(z)); d += L; } else { const u = (upto - d) / L; g.lineTo(w.X(x0 + (x - x0) * u), w.Z(z0 + (z - z0) * u)); break; }
    }
    g.stroke(); g.shadowBlur = 0;
    const S = this.film.spots && readSpots(this.film.spots);
    if (S) {
      g.fillStyle = `rgba(255,255,255,${(0.6 * smooth(1.4, 2.2, lt)).toFixed(2)})`;
      for (const q of S.drops) g.fillRect(w.X(q.x) - 0.75, w.Z(q.z) - 0.75, 1.5, 1.5);
      const sa = smooth(2.0, 2.8, lt);
      for (const [i, q] of S.supplies.entries()) {
        const ping = ((lt * 1.3 + i * 0.137) % 1);
        g.fillStyle = `rgba(48,213,255,${(0.9 * sa).toFixed(2)})`; g.fillRect(w.X(q.x) - 1.5, w.Z(q.z) - 1.5, 3, 3);
        if (i % 9 === 0 && lt > 2.2) { g.strokeStyle = `rgba(48,213,255,${(0.6 * (1 - ping)).toFixed(2)})`; g.lineWidth = 1; g.beginPath(); g.arc(w.X(q.x), w.Z(q.z), 2 + ping * 8, 0, Math.PI * 2); g.stroke(); }
      }
      // the supply areas (the densest clusters of supply spots)
      (this.intelAreas || []).slice(0, 4).forEach((a, k) => {
        const u = smooth(2.6 + k * 0.55, 3.1 + k * 0.55, lt); if (u <= 0) return;
        g.strokeStyle = '#ffd23d'; g.lineWidth = 2; g.setLineDash([4, 3]); g.beginPath(); g.arc(w.X(a.x), w.Z(a.z), (6 + a.r * w.k) * (0.6 + 0.4 * u), 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
      });
    }
    // key locations
    const labels = [['Clock Tower', -6, -60], ['Rotunda', 0, 0], ['M Lawns', 107, 0], ['NAB', 30, 90], ['Library', 205, -238], ['Krishna Bhawan', 120, 110], ['Gymkhana', 303, 387], ['Med-C Ground', 395, 640], ['Saraswati Mandir', 104, 676]];
    labels.forEach(([name, x, z], k) => {
      const u = smooth(4.0 + k * 0.18, 4.4 + k * 0.18, lt); if (u <= 0) return;
      g.globalAlpha = u; g.fillStyle = '#ff3d7f'; g.beginPath(); g.arc(w.X(x), w.Z(z), 3.5, 0, Math.PI * 2); g.fill();
      g.font = `800 ${Math.max(9, Math.round(cv.height / 52))}px system-ui`; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.75)'; g.strokeText(name, w.X(x) + 6, w.Z(z) + 4); g.fillStyle = '#fff'; g.fillText(name, w.X(x) + 6, w.Z(z) + 4); g.globalAlpha = 1;
    });
    // a scan line sweeping down
    const sy = ((lt * 0.35) % 1) * cv.height;
    const gr = g.createLinearGradient(0, sy - 40, 0, sy); gr.addColorStop(0, 'rgba(48,213,255,0)'); gr.addColorStop(1, 'rgba(48,213,255,0.35)');
    g.fillStyle = gr; g.fillRect(0, sy - 40, cv.width, 40);
  }

  // Scene 2: the landing map (royale.js showLanding / updateLanding).
  panel_landing(lt, el) {
    el.className = 'pb-landing'; el.dataset.pb = 'landing';
    const picked = lt > 2.0;
    const left = Math.max(0, Math.ceil(ROYALE.landing - 9 - lt));
    return `<h2>🪂 Pick your landing spot</h2><div class="pb-landinfo">Landing in ${left} s · ${picked ? `your spot: ${MATCH.landing.name}` : 'no spot picked yet'}</div><div style="position:relative"><canvas class="pb-landmap" data-pb="landing-map"></canvas><div class="tap" style="display:none"></div></div><div class="pb-note">Click (or tap) anywhere on campus: you land on the nearest verified spot. Squads land together on the pick of whoever chose last. No pick? You are placed far from everyone.</div>`;
  }
  draw_landing(lt, el) {
    const cv = el.querySelector('canvas'); if (!cv) return;
    const W = Math.min(innerWidth - 32, 900); const Hh = Math.min(innerHeight - 170, 1000);
    const scale = Math.max(0.1, Math.min(W / 1100, Hh / 1790));
    const cw = Math.round(1100 * scale); const ch = Math.round(1790 * scale);
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    const g = cv.getContext('2d'); const w = mapXform(cv);
    g.fillStyle = '#0b1020'; g.fillRect(0, 0, cv.width, cv.height);
    drawBase(g, w); drawZone(g, w, zoneState(0));
    const S = this.film.spots && readSpots(this.film.spots);
    if (S) { g.fillStyle = 'rgba(255,255,255,0.55)'; for (const d of S.drops) g.fillRect(w.X(d.x) - 1, w.Z(d.z) - 1, 2, 2); }
    const tap = el.querySelector('.tap');
    const L = MATCH.landing;
    if (lt > 2.0) {
      g.fillStyle = TEAMS[0].colour; g.beginPath(); g.arc(w.X(L.x), w.Z(L.z), 7, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.font = '700 12px system-ui'; g.fillText(`You · ${L.name}`, w.X(L.x) + 9, w.Z(L.z) + 4);
      if (lt > 3.0) g.fillText(`Aanya · ${L.name}`, w.X(L.x) + 9, w.Z(L.z) + 18);
    }
    const u = (lt - 1.6) / 0.8;
    if (tap && u > 0 && u < 1) { tap.style.display = ''; tap.style.left = `${w.X(L.x) + 1}px`; tap.style.top = `${w.Z(L.z) + 1}px`; tap.style.transform = `scale(${(1 + u * 2.5).toFixed(2)})`; tap.style.opacity = (1 - u).toFixed(2); } else if (tap) tap.style.display = 'none';
  }

  // Scene 3: character customisation (the lobby's "Your character" column, looks.js choices).
  panel_customise(lt, el) {
    el.className = 'pb-card side-card';
    const c = CAST_BY_ID.advait;
    const k = Math.min(Math.floor(lt / 0.35), c.character + 6);
    const charSel = lt < 1.0 ? k % CHARACTERS.length : c.character;
    const sel = (at, v, d) => (lt > at ? v : d);
    const sw = (list, cur) => `<div class="pb-swatches">${list.map((x) => `<span class="pb-swatch${x === cur ? ' sel' : ''}" style="background:${x}"></span>`).join('')}</div>`;
    return `<h3 style="margin-top:0">YOUR CHARACTER</h3><div class="fake-input">${esc(c.name)}</div>
      <div class="pb-row">${CHARACTERS.map((x, i) => `<button class="${i === charSel ? 'on' : ''}">${esc(x.name)}</button>`).join('')}</div>
      <div class="lbl">Outfit</div>${sw(OUTFIT_COLOURS, sel(1.5, c.outfit, OUTFIT_COLOURS[0]))}
      <div class="lbl">Trousers</div>${sw(PANTS_COLOURS, sel(2.0, c.pants, PANTS_COLOURS[0]))}
      <div class="lbl">Paintball mask (your team colour shows in team matches)</div>${sw(MASK_COLOURS, sel(2.5, teamColour(c), MASK_COLOURS[2]))}
      <div class="pb-row" style="margin-top:8px">${ACCESSORIES.map((a) => `<button class="${a.id === sel(3.0, c.accessory, 'none') ? 'on' : ''}">${esc(a.name)}</button>`).join('')}</div>
      <div class="lbl" style="margin-top:10px">Squad: <b style="color:${teamColour(c)}">Team ${TEAMS[c.team].name}</b> · with Aanya</div>`;
  }

  // Scene 3: the six blasters, with the lobby's equipment cards and the real stat bars.
  panel_blasters(lt, el) {
    el.className = 'pb-card side-card';
    const order = ['standard', 'burst', 'precision'];
    const cur = EQUIPMENT_BY_ID[order[Math.min(2, Math.floor(lt / 2.3))]];
    return `<h3 style="margin-top:0">PAINTBALL EQUIPMENT · SIX BLASTERS</h3>
      <div class="bl-grid">${EQUIPMENT.map((e) => `<div class="pb-eq${e.id === cur.id ? ' sel' : ''}"><b><span class="dot" style="background:${e.colour}"></span>${esc(e.short)}</b><span class="bl">${esc(BLURB[e.id])}</span></div>`).join('')}</div>
      <div class="bl-detail" style="--c:${cur.colour}"><b style="color:${cur.colour}">${esc(cur.name)}</b>${statBars(cur).outerHTML}<div class="pb-note" style="margin-top:6px">Paintball pack in a crate: ×${PACK[cur.id]} · carry up to ${cur.total}</div></div>`;
  }

  // Scene 3: the Pink squad's kit (inventory with quantities, as in the HUD's inventory bar).
  panel_loadout(lt, el, p, t) {
    el.className = 'pb-card side-card';
    const who = (id) => { const st = this.film.stateAt(id, t); return `<div class="who" style="--team:${teamColour(id)}"><b>${CAST_BY_ID[id].name}</b> <span class="pb-note">${esc(CAST_BY_ID[id].role)}</span><div class="row">${invSpans(st.inv)}</div><div class="pb-note" style="margin-top:6px">${st.supplies} supplies collected</div></div>`; };
    return `<h3 style="margin-top:0">🎒 SQUAD LOADOUT · TEAM PINK</h3><div class="kit">${who('advait')}${who('aanya')}</div>
      <div class="pb-note" style="margin-top:8px">Two blaster slots (Q switches) · 💣 paint bombs (G, ${BOMB.fuse} s fuse) · 🛡️ paint shield (C, ${SHIELD.time} s) · 📡 paint scan (Z, ${SCAN.radius} m) · 🥽 mask and 🦺 vest levels 1–3</div>`;
  }

  // Scene 4: the match intro: mode, arena, players, squads, starting equipment.
  panel_intro(lt, el) {
    el.className = 'intro';
    const squad = (q, k) => `<div class="pb-team${lt > 1.0 + k * 0.35 ? '' : ' off'}" style="--team:${q.colour}"><b style="color:${q.colour}">Team ${q.name}</b>${q.members.map((id) => esc(CAST_BY_ID[id].name)).join(' · ')}<br><small>🎯 ${EQUIPMENT_BY_ID[ROYALE.start.blaster].short} blaster · ${ROYALE.start.hopper} paintballs</small></div>`;
 return `<div class="pb-note" style="letter-spacing:.3em;font-weight:800;opacity:.9">PLAY WITH BITSIANS · MULTIPLAYER PAINTBALL</div><div class="mode">CAMPUS ROYALE</div>
      <div class="chips"><span class="chip">🗺️ Arena: Whole Campus · BITS Pilani</span><span class="chip">⚔️ ${MATCH.mode}</span><span class="chip">👥 ${CAST.length} players · ${SQUADS.length} squads</span><span class="chip">🎨 Last squad standing</span></div>
      <div class="pb-teams">${SQUADS.map(squad).join('')}</div>`;
  }

  panel_win(lt, el) { el.className = 'win'; return `<div class="pb-winner">🏆 ${esc(this.film.results.winner)} wins!</div><div class="pb-sub">Campus Royale · last squad standing</div>`; }

  // Scene 8: the results screen (index.js renderResults, with royale.js's columns).
  panel_results(lt, el) {
    el.className = 'results'; el.dataset.pb = 'results';
    const R = this.film.results; const me = R.rankings.find((r) => r.id === 'advait');
    const row = (r, i) => `<tr class="${r.id === 'advait' ? 'me' : ''}" style="opacity:${smooth(2.2 + i * 0.22, 2.5 + i * 0.22, lt).toFixed(2)}"><td>${r.place}</td><td><span class="tdot" style="background:${TEAMS[r.team].colour}"></span>${esc(r.nickname)}${r.id === 'advait' ? ' 👑' : ''}</td><td>${TEAMS[r.team].name}</td><td class="n">${r.score}</td><td class="n">${r.tags}</td><td class="n">${r.assists}</td><td class="n">${r.timesTagged}</td><td class="n">${r.supplies}</td><td class="n">#${r.placement}</td><td class="n">${fmtTime(r.survived)}</td></tr>`;
    const used = ['standard', 'burst', 'precision'].map((id) => EQUIPMENT_BY_ID[id].short).join(', ');
    return `<div class="pb-card pb-stack"><h1>Play with BITSians · results</h1>
      <div class="pb-winner">🏆 ${esc(R.winner)} wins!</div>
      <div class="pb-sub" data-pb="royale-result">🪂 Campus Royale · you placed #${me.placement} of ${R.teams.length} squads · survived ${fmtTime(me.survived)} · ${me.supplies} supplies collected</div>
      <div class="pb-sub">That’s you! 🎉</div>
      <div class="pb-podium"><div><span class="pb-note">WINNER</span><b>${esc(R.winner)}</b></div><div><span class="pb-note">RUNNER-UP</span><b>${esc(R.runnerUp)}</b></div><div><span class="pb-note">MVP</span><b>⭐ ${esc(R.mvpName)}</b></div></div>
      <div class="pb-teams">${R.teams.map((q, k) => `<div class="pb-team" style="--team:${q.colour};opacity:${smooth(1.2 + k * 0.15, 1.5 + k * 0.15, lt).toFixed(2)}"><b>#${q.place} ${esc(q.name)}</b><div>${q.score} points · ${q.tags} tags</div></div>`).join('')}</div>
      <table class="pb-table" data-pb="scoreboard"><tr><th>#</th><th>Player</th><th>Team</th><th class="n">Score</th><th class="n">Tags</th><th class="n">Assists</th><th class="n">Times tagged</th><th class="n">Supplies</th><th class="n">Placed</th><th class="n">Survived</th></tr>${R.rankings.map(row).join('')}</table>
      <div class="pb-note">Paintball equipment used: ${used}. Results stay in this room until it closes; nothing is saved anywhere.</div></div>`;
  }
  draw_results(lt, el) {
    const card = el.querySelector('.pb-card'); if (!card) return;
    if (!el.querySelector('.pb-confetti') && !this.capture) el.prepend(confettiEl());
    const k = Math.min(1, (innerHeight - 24) / Math.max(1, card.offsetHeight), (innerWidth - 16) / Math.max(1, card.offsetWidth, card.scrollWidth));
    card.style.transform = `translate(-50%, -50%) scale(${(k * (0.96 + 0.04 * smooth(0, 0.4, lt))).toFixed(3)})`;
  }

  // ---------- hotspots ----------
  updateHots(t) {
    const f = this.film; const w = innerWidth; const h = innerHeight;
    for (const hs of f.hots) {
      let el = this.hotEls.get(hs);
      const on = t >= hs.t0 && t < hs.t1 && this.ui.info.classList.contains('hidden');
      if (!on) { if (el) el.style.display = 'none'; continue; }
      if (!el) {
        el = document.createElement('button'); el.className = `hot${hs.game ? ' game' : ''}`; el.dataset.id = hs.id; el.setAttribute('aria-label', hs.label);
        el.innerHTML = `<span class="ring"></span><span class="l">${hs.game ? '🎮 ' : 'ⓘ '}${esc(hs.label)}</span>`;
        el.addEventListener('click', (e) => { e.stopPropagation(); this.openHot(hs); });
        this.ui.hots.append(el); this.hotEls.set(hs, el);
      }
      el.style.display = '';
      const half = el.offsetWidth / 2 + 8; el.style.left = `${Math.min(w - half, Math.max(half, hs.screen[0] * w)).toFixed(0)}px`; el.style.top = `${(hs.screen[1] * h).toFixed(0)}px`;
    }
  }

  openHot(hs) {
    const f = this.film; const ui = this.ui;
    if (hs.game) {
      // "Create a room" / "Join a room": end the film and open the multiplayer paintball game
      const ok = f.hooks?.paintball?.({ action: hs.game });
      if (ok) return;
    }
    this.resumeAfterInfo = !f.paused;
    f.pause();
    ui.info.classList.remove('hidden');
    const info = hs.info ? INFO[hs.info]() : { title: `🎮 ${hs.label}`, body: '<p>Play with BITSians runs private paintball rooms for friends: create one and share its 5-letter code, or join with a code.</p>' };
    ui.info.innerHTML = `<h3>${info.title}</h3>${info.body}${hs.game ? '<div class="msg">The multiplayer game is not available in this build.</div>' : ''}<div class="btns"></div>`;
    const btns = ui.info.querySelector('.btns');
    const btn = (label, cls, fn) => { const b = document.createElement('button'); b.className = `fb ${cls}`; b.textContent = label; b.addEventListener('click', (e) => { e.stopPropagation(); fn(); }); btns.append(b); return b; };
    if (!hs.game && f.hooks?.paintball) btn('🎮 Create a room', 'primary', () => f.hooks.paintball({ action: 'create' }));
    btn('▶ Back to the film', '', () => this.closeInfo());
  }

  // "Resumed at 1:40 · ↺ start over" for a few seconds after resuming
  resumed(t) {
    const el = this.el.querySelector('.resumed');
    el.textContent = `▶ Resumed at ${fmt(t)} · ↺ Start over`;
    el.classList.remove('hidden');
    el.onclick = (e) => { e.stopPropagation(); el.classList.add('hidden'); this.film.seek(0); this.film.play(); };
    clearTimeout(this.resT); this.resT = setTimeout(() => el.classList.add('hidden'), 5000);
  }

  closeInfo() {
    this.ui.info.classList.add('hidden');
    if (this.resumeAfterInfo) this.film.play();
  }

  dispose() {
    clearTimeout(this.idleTimer); clearTimeout(this.resT);
    if (this.onMove) window.removeEventListener('pointermove', this.onMove);
    if (this.onResize) window.removeEventListener('resize', this.onResize);
    this.audio.dispose();
    this.el.remove(); this.styleEl.remove();
  }
}

// ---------- helpers ----------
// The HUD inventory bar (royale.js updateHud): blaster slots, throwables, cleaning, gadgets, gear.
function invSpans(inv) {
  const slot = (b, i) => { const e = EQUIPMENT_BY_ID[b]; return `<span class="slot${inv.slot === i && b ? ' sel' : ''}${b ? '' : ' empty'}" style="${e ? `--c:${e.colour}` : ''}">${e ? `${i + 1} ${e.short} ${inv.hopper[i]}/${inv.ammo[b] || 0}` : `${i + 1} empty`}</span>`; };
  const cnt = (icon, n, key) => `<span class="cnt${n ? '' : ' none'}">${icon}${n}${key ? `<small>${key}</small>` : ''}</span>`;
  return slot(inv.primary, 0) + slot(inv.secondary, 1) + cnt('💣', inv.paintbomb, 'G') + cnt('☁️', inv.smoke, 'B') + cnt('🧻', inv.wipes, 'H') + cnt('🧴', inv.kit, 'H') + cnt('🛡️', inv.shield, 'C') + cnt('📡', inv.scan, 'Z') + `<span class="cnt${inv.gearMask ? '' : ' none'}">🥽L${inv.gearMask}</span><span class="cnt${inv.gearVest ? '' : ' none'}">🦺L${inv.gearVest}</span>`;
}
const invHtml = invSpans;

let BPTS = null;
function boundaryPts() {
  if (BPTS) return BPTS;
  const p = [...BITS_CAMPUS.boundary, BITS_CAMPUS.boundary[0]]; let total = 0;
  for (let i = 1; i < p.length; i++) total += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
  BPTS = { p, total };
  return BPTS;
}
const perimeter = () => boundaryPts().total;

// the densest groups of supply spots, named like the registry (for the tactical map)
let AREAS = null;
function supplyAreas(S) {
  if (AREAS) return AREAS;
  const by = new Map();
  for (const q of S.supplies) {
    const key = q.name.replace(/^near /, '').replace(/ \((East|West) Wing\)/, '').replace(/^New Academic Block$/, 'NAB');
    if (key === 'open campus') continue;
    if (!by.has(key)) by.set(key, []);
    by.get(key).push(q);
  }
  AREAS = [...by.entries()].map(([name, list]) => {
    const x = list.reduce((a, q) => a + q.x, 0) / list.length; const z = list.reduce((a, q) => a + q.z, 0) / list.length;
    const r = Math.max(...list.map((q) => Math.hypot(q.x - x, q.z - z)));
    return { name, n: list.length, x, z, r: Math.min(r, 90) };
  }).sort((a, b) => b.n - a.n);
  return AREAS;
}

function confettiEl() {
  const box = document.createElement('div'); box.className = 'pb-confetti';
  const cols = ['#ff3d7f', '#30d5ff', '#ffd23d', '#7cff4f', '#b26bff', '#ff8a1f'];
  for (let i = 0; i < 70; i++) {
    const c = document.createElement('i'); const r = (k) => ((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1;
    Object.assign(c.style, { left: `${r(1) * 100}%`, background: cols[i % cols.length], animationDuration: `${2.5 + r(2) * 3}s`, animationDelay: `${-r(3) * 5}s`, width: `${8 + r(4) * 12}px`, height: `${8 + r(5) * 12}px` });
    box.append(c);
  }
  return box;
}
