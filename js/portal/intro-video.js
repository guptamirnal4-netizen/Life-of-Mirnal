// The intro trailer (media/play-with-bitsians-trailer.mp4, 1:26): a 1080p cut of the in-engine film, made by
// dev/make-trailer.mjs. Plays full screen over the portal from the first-visit splash and WATCH THE INTRO; ends or
// skips back to the portal. FEATURES.engineIntro = true switches the intro back to the live in-engine film.
import { h } from '../ui/dom.js';

const SRC = 'media/play-with-bitsians-trailer.mp4';
const POSTER = 'media/play-with-bitsians-trailer-poster.jpg';
let open = null;

export function playIntroVideo({ onEnd } = {}) {
  if (open) return open;
  const video = h('video', { src: SRC, poster: POSTER, controls: true, playsinline: true, preload: 'auto', 'data-intro': 'video' });
  video.setAttribute('playsinline', '');
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    document.removeEventListener('keydown', key, true);
    try { video.pause(); } catch { /* */ }
    if (document.fullscreenElement === root) document.exitFullscreen?.().catch(() => {});
    root.classList.add('out');
    setTimeout(() => root.remove(), 400);
    open = null;
    onEnd?.();
  };
  const key = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(); } };
  const skip = h('button', { class: 'iv-skip', 'data-intro': 'skip', onclick: finish }, 'Skip ›');
  const root = h('div', { id: 'intro-video', role: 'dialog', 'aria-label': 'Play with BITSians trailer' }, video, skip);
  video.addEventListener('ended', finish);
  video.addEventListener('error', finish); // no video (offline, blocked): straight to the portal
  document.addEventListener('keydown', key, true);
  document.body.append(root);
  const p = video.play();
  if (p?.catch) p.catch(() => { video.muted = true; video.play().catch(() => {}); }); // autoplay with sound refused: play muted, controls unmute
  open = { root, video, finish };
  return open;
}

export const introVideoOpen = () => open;
