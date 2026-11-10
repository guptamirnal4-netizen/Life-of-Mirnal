// Touch controls for phones and tablets. Left half of the screen: a joystick appears under your thumb
// (walk; push it to the edge to run; on the cycle, up pedals, down brakes, sideways steers). Right half:
// drag to look around. The buttons press the same keys as the keyboard, so every action goes through
// the game's existing key handling.
const coarse = () => matchMedia('(hover: none) and (pointer: coarse)').matches;

const BUTTONS = [
  // id, label, key, hold (key stays down while touched)
  ['use', '✋', 'KeyE'],
  ['jump', '⤒', 'Space', true],
  ['voice', '🎤', 'KeyF'],
  ['cycle', '🚲', 'KeyC'],
  ['ff', '⏩', 'KeyZ', true],
  ['view', '👁', 'KeyV'],
  ['map', '🗺', 'KeyN'],
  ['menu', '☰', null],
];
const STICK = 52; // joystick radius in CSS pixels

const key = (type, code) => document.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }));

export function createTouchControls({ canvas, player, onMenu }) {
  let on = false;
  const root = document.createElement('div');
  root.id = 'touch';
  root.className = 'hidden';
  const base = document.createElement('div');
  base.className = 'stick hidden';
  const knob = document.createElement('div');
  knob.className = 'knob';
  base.append(knob);
  root.append(base);
  const btn = {};
  for (const [id, label, code, hold] of BUTTONS) {
    const b = document.createElement('button');
    b.className = `tbtn t-${id}`;
    b.textContent = label;
    b.setAttribute('aria-label', id);
    if (hold) {
      const up = () => { b.classList.remove('down'); key('keyup', code); };
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); b.classList.add('down'); key('keydown', code); });
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
    } else {
      // on click, so the microphone gets the user activation it needs
      b.addEventListener('click', () => { if (code) { key('keydown', code); key('keyup', code); } else onMenu(); });
    }
    btn[id] = b;
    root.append(b);
  }
  document.body.append(root);

  const enable = () => {
    if (on) return;
    on = true;
    document.body.classList.add('touch');
  };
  if (coarse()) enable();
  window.addEventListener('touchstart', enable, { passive: true, once: true });

  // One finger may hold the joystick while another looks around.
  const fingers = new Map(); // pointerId → { role, x0, y0, x, y }
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch' || !player.enabled) return;
    const stick = e.clientX < innerWidth / 2 && ![...fingers.values()].some((f) => f.role === 'stick');
    fingers.set(e.pointerId, { role: stick ? 'stick' : 'look', x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY });
    canvas.setPointerCapture(e.pointerId);
    if (stick) {
      base.style.left = `${e.clientX - STICK}px`;
      base.style.top = `${e.clientY - STICK}px`;
      base.classList.remove('hidden');
      knob.style.transform = '';
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    const f = fingers.get(e.pointerId);
    if (!f) return;
    if (f.role === 'look') {
      const k = 0.0055 * player.sensitivity;
      player.yaw -= (e.clientX - f.x) * k;
      player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch - (e.clientY - f.y) * k));
    } else {
      let dx = e.clientX - f.x0; let dy = e.clientY - f.y0;
      const d = Math.hypot(dx, dy);
      if (d > STICK) { dx *= STICK / d; dy *= STICK / d; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      player.stick.x = dx / STICK;
      player.stick.y = -dy / STICK;
    }
    f.x = e.clientX; f.y = e.clientY;
  });
  const lift = (e) => {
    const f = fingers.get(e.pointerId);
    if (!f) return;
    fingers.delete(e.pointerId);
    if (f.role === 'stick') { player.stick.x = 0; player.stick.y = 0; base.classList.add('hidden'); }
  };
  canvas.addEventListener('pointerup', lift);
  canvas.addEventListener('pointercancel', lift);

  return {
    get on() { return on; },
    // Called every frame: show the controls while playing, and only the buttons that make sense.
    update({ playing, college, prompt, seated }) {
      root.classList.toggle('hidden', !on || !playing);
      if (!on) return;
      if (!playing && fingers.size) { fingers.clear(); player.stick.x = 0; player.stick.y = 0; base.classList.add('hidden'); }
      btn.cycle.classList.toggle('hidden', !college);
      btn.map.classList.toggle('hidden', !college);
      btn.use.classList.toggle('ready', !!prompt);
      btn.jump.classList.toggle('hidden', !!seated || player.bike);
    },
  };
}
