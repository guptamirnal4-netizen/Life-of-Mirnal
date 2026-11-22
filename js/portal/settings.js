// Player settings for the whole game (the portal's Settings panel): audio, graphics, controls and other
// preferences. Kept in localStorage (try/catch: private mode just means defaults each visit). main.js applies them
// to the player controls, the graphics quality and the audio bus (./audio.js); the paintball match and the film
// pick them up from there.
import { setAudioLevels } from './audio.js';

const KEY = 'pwb-settings';
export const DEFAULTS = {
  master: 0.8, music: 0.8, effects: 0.8, voice: 1, muted: false,
  graphics: null, // null: automatic (Medium on phones, High elsewhere)
  mouseSensitivity: 1, touchSensitivity: 1, invertY: false, fov: 72,
  thirdPerson: false, showStats: false, reduceMotion: false,
};
export const GRAPHICS_CHOICES = ['low', 'medium', 'high'];
const RANGES = { master: [0, 1], music: [0, 1], effects: [0, 1], voice: [0, 1], mouseSensitivity: [0.2, 3], touchSensitivity: [0.2, 3], fov: [60, 95] };

function clean(o = {}) {
  const s = { ...DEFAULTS };
  for (const [k, d] of Object.entries(DEFAULTS)) {
    const v = o[k];
    if (k === 'graphics') s.graphics = GRAPHICS_CHOICES.includes(v) ? v : null;
    else if (typeof d === 'boolean') s[k] = typeof v === 'boolean' ? v : d;
    else if (Number.isFinite(v)) { const [lo, hi] = RANGES[k]; s[k] = Math.max(lo, Math.min(hi, v)); }
  }
  return s;
}
function read() { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch { return {}; } }

export const settings = clean(read());
const listeners = new Set();
export function onSettings(fn) { listeners.add(fn); fn(settings); return () => listeners.delete(fn); }
export function setSetting(key, value) {
  Object.assign(settings, clean({ ...settings, [key]: value }));
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* not remembered */ }
  for (const fn of listeners) fn(settings, key);
}
export function resetSettings() {
  Object.assign(settings, DEFAULTS);
  try { localStorage.removeItem(KEY); } catch { /* */ }
  for (const fn of listeners) fn(settings, null);
}
onSettings((s) => setAudioLevels(s));

// The graphics profile to use: the player's choice, or the automatic one.
export const graphicsChoice = (touch) => settings.graphics || (touch ? 'medium' : 'high');
