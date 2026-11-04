import { SAVE_VERSION, DEFAULT_SETTINGS } from './state.js';

const KEY = 'life-of-mirnal.save.v1';

export function serialize(state) {
  return JSON.stringify(state);
}

export function deserialize(text) {
  const data = JSON.parse(text);
  if (!data || data.version !== SAVE_VERSION) throw new Error('Incompatible save file');
  data.settings = { ...DEFAULT_SETTINGS, ...data.settings };
  if (data.settings.timeScale === 0.6) data.settings.timeScale = DEFAULT_SETTINGS.timeScale;
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
