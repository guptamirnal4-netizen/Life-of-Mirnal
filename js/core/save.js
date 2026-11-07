import { SAVE_VERSION, DEFAULT_SETTINGS, OLD_DEFAULT_SPEEDS } from './state.js';

const KEY = 'life-of-mirnal.save.v1';

export function serialize(state) {
  return JSON.stringify(state);
}

export function deserialize(text) {
  const data = JSON.parse(text);
  if (!data || data.version !== SAVE_VERSION) throw new Error('Incompatible save file');
  data.settings = { ...DEFAULT_SETTINGS, ...data.settings };
  // Earlier defaults move to today's default; any other valid speed is the player's own choice and is kept.
  const speed = data.settings.timeScale;
  if (typeof speed !== 'number' || !(speed >= 0.02 && speed <= 2) || OLD_DEFAULT_SPEEDS.includes(speed)) data.settings.timeScale = DEFAULT_SETTINGS.timeScale;
  return data;
}

export function saveGame(state, storage = globalThis.localStorage) {
  try {
    storage.setItem(KEY, serialize(state));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(storage = globalThis.localStorage) {
  try {
    const raw = storage.getItem(KEY);
    return raw ? deserialize(raw) : null;
  } catch {
    return null;
  }
}

export function hasSave(storage = globalThis.localStorage) {
  try {
    return !!storage.getItem(KEY);
  } catch {
    return false;
  }
}

export function clearSave(storage = globalThis.localStorage) {
  try {
    storage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}
