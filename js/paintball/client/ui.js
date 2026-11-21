// Small DOM helpers for the paintball screens (re-exports the game's h()).
import { h } from '../../ui/dom.js';
import { EQUIPMENT } from '../equipment.js';
export { h };

const MAXES = { tag: 70, range: 90, rate: 11, magazine: 45, reload: 3, speed: 120 };
export function statBars(e) {
  const rows = [['Paint per hit', e.tag * e.pellets, MAXES.tag * 1.3, `${e.tag}${e.pellets > 1 ? ` ×${e.pellets}` : ''}`], ['Range', e.range, MAXES.range, `${e.range} m`], ['Fire rate', e.rate * e.burst, MAXES.rate, `${e.rate}/s${e.burst > 1 ? ` ×${e.burst}` : ''}`], ['Hopper', e.magazine, MAXES.magazine, `${e.magazine} / ${e.total}`], ['Reload', MAXES.reload - e.reload + 0.5, MAXES.reload, `${e.reload} s`]];
  if (e.splash) rows.push(['Splash', e.splash, 5, `${e.splash} m`]);
  return h('div', { class: 'pb-stats' }, ...rows.flatMap(([k, v, max, label]) => [h('span', {}, k), h('div', { class: 'pb-bar' }, h('i', { style: { width: `${Math.max(6, Math.min(100, (v / max) * 100))}%` } })), h('span', {}, label)]));
}
export const BLURB = {
  standard: 'All-rounder: steady, accurate, three hits to tag.',
  rapid: 'Sprays foam paintballs fast; light paint per hit.',
  burst: 'Three paintballs per trigger pull.',
  spread: 'A fan of seven paintballs; deadly up close.',
  precision: 'Long range, heavy paint; right-click to zoom.',
  launcher: 'Lobs a paint shell that splashes everyone nearby.',
};
export const EQUIPMENT_LIST = EQUIPMENT;

export function confetti() {
  const box = h('div', { class: 'pb-confetti' });
  const cols = ['#ff3d7f', '#30d5ff', '#ffd23d', '#7cff4f', '#b26bff', '#ff8a1f'];
  for (let i = 0; i < 70; i++) {
    box.append(h('i', { style: { left: `${Math.random() * 100}%`, background: cols[i % cols.length], animationDuration: `${2.5 + Math.random() * 3}s`, animationDelay: `${-Math.random() * 5}s`, width: `${8 + Math.random() * 12}px`, height: `${8 + Math.random() * 12}px` } }));
  }
  return box;
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}
export const fmtTime = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
