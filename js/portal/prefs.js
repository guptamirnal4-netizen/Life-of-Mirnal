// What the player chose on the portal, kept in this browser (localStorage, in try/catch so private mode and
// blocked storage just mean "not remembered"): nickname, character look, preferred blasters, the default game mode
// and arena for the next room they host, and whether they have seen the intro film. Read by the portal and by the
// paintball client (js/paintball/client/index.js), so the lobby starts with the same choices. Also the last Play vs
// Bots setup (arena, mode, number of bots, difficulty).
import { cleanLook } from '../paintball/looks.js';
import { EQUIPMENT_BY_ID, DEFAULT_LOADOUT } from '../paintball/equipment.js';
import { MODES_BY_ID } from '../paintball/rules.js';
import { ARENAS_BY_ID } from '../paintball/arena.js';
import { BOT_LEVELS_BY_ID, DEFAULT_BOT_LEVEL } from '../paintball/bots.js';

const KEY = 'pwb-prefs';
const INTRO = 'pwb-intro-seen';
const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode: not remembered */ } };

export const cleanNickname = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 16);
export const randomNickname = () => `BITSian ${Math.floor(10 + Math.random() * 89)}`;

function clean(p = {}) {
  const lo = Array.isArray(p.loadout) && p.loadout.length === 2 && p.loadout.every((id) => EQUIPMENT_BY_ID[id]) && p.loadout[0] !== p.loadout[1] ? p.loadout : DEFAULT_LOADOUT;
  return {
    nickname: cleanNickname(p.nickname),
    look: cleanLook(p.look || {}, {}),
    loadout: [...lo],
    mode: MODES_BY_ID[p.mode] ? p.mode : 'ffa',
    arena: ARENAS_BY_ID[p.arena] ? p.arena : 'medc',
    practice: cleanPractice(p.practice),
  };
}
export function cleanPractice(q = {}) {
  q = q && typeof q === 'object' ? q : {};
  const n = Math.floor(Number(q.bots));
  return {
    arena: ARENAS_BY_ID[q.arena] ? q.arena : 'medc',
    mode: MODES_BY_ID[q.mode] ? q.mode : 'ffa',
    bots: n >= 1 && n <= 11 ? n : 5,
    level: BOT_LEVELS_BY_ID[q.level] ? q.level : DEFAULT_BOT_LEVEL,
  };
}

export function loadPrefs() { return clean(read(KEY) || {}); }
export function savePrefs(patch) { const next = clean({ ...loadPrefs(), ...patch }); write(KEY, next); return next; }

export function introSeen() { return !!read(INTRO); }
export function markIntroSeen() { write(INTRO, true); }
