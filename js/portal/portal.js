// The portal: the start screen of Play with BITSians, a lobby menu for multiplayer paintball over the campus
// backdrop. A live 3D preview of your character (the paintball client's Preview), your nickname, and the entries:
// Create Room, Join Room, Customise Character, Game Modes, How to Play, Settings, Watch the Intro. Each entry opens
// a panel ("sheet") that slides over the portal; Create and Join open the real paintball client at that step
// (main.js → openPaintball({ action, code, nickname, portal: true })). The Settings sheet can also open over a
// paintball room (from its lobby or match menu). First visit: a "Press to start" splash that plays the intro film.
import { h } from '../ui/dom.js';
import { loadPrefs, savePrefs, cleanNickname, markIntroSeen } from './prefs.js';
import { settings, setSetting, resetSettings, GRAPHICS_CHOICES, graphicsChoice } from './settings.js';
import { CHARACTERS, OUTFIT_COLOURS, PANTS_COLOURS, MASK_COLOURS, ACCESSORIES } from '../paintball/looks.js';
import { EQUIPMENT, EQUIPMENT_BY_ID } from '../paintball/equipment.js';
import { MODES, MODES_BY_ID, SCORE, ASSIST_WINDOW, TIMING, MAX_PLAYERS } from '../paintball/rules.js';
import { ARENAS, ARENAS_BY_ID } from '../paintball/arena.js';
import { ITEMS, BOMB, SMOKE, KITS, SHIELD, SCAN, CARRY, GEAR } from '../paintball/items.js';
import { ROYALE, ZONE_PHASES, zoneLength } from '../paintball/royale.js';
import { statBars, BLURB } from '../paintball/client/ui.js';
import { normaliseCode, isCode } from '../paintball/client/codes.js';
import { PROFILES } from '../graphics/GraphicsConfig.js';

export const PRODUCT = 'Play with BITSians';

// ---------- what the modes and arenas are (shown on the Game Modes sheet) ----------
const MODE_INFO = {
  ffa: { title: 'Individual · Duel / Free-for-All', tag: '2–12 players', text: 'Every player for themself. With two players it is a one-on-one Individual Duel; up to twelve make it a Free-for-All. Highest score wins.' },
  '6v6': { title: '6v6', tag: '12 players · 2 teams', text: 'Two teams of six. Tags and assists score for your team; voice chat is team-only during the match.' },
  '4v4': { title: '4v4', tag: '8 players · 2 teams', text: 'Two teams of four: tighter, faster rounds. Needs exactly eight players to start.' },
  '3v3v3v3': { title: '3v3v3v3', tag: '12 players · 4 squads', text: 'Four squads of three. Watch your flanks: every other squad is hunting you.' },
  '2v2v2v2v2': { title: '2v2v2v2v2', tag: '10 players · 5 duos', text: 'Five duos. Stick with your partner; in Campus Royale they can clean you off when you are fully painted.' },
};
const ARENA_INFO = {
  medc: { tag: 'Speedball field · timed', text: `A 70 × 40 m field of inflatable bunkers inside a net on the Med-C cricket ground. Timed matches (${TIMING.durations.map((d) => d / 60).join(', ')} min); tagged players are back in after ${TIMING.respawn} s.` },
  royale: { tag: 'Campus Royale · last one standing', text: `Land anywhere on the BITS Pilani campus, open supply crates for blasters, paint bombs and gear. One tag and you are out; the paint zone shrinks in ${ZONE_PHASES.length} phases (about ${Math.round(zoneLength() / 60)} min). Last player or squad standing wins.` },
};
const arenaKey = (a) => (a.royale ? 'royale' : a.id);
const modeShort = (id) => (id === 'ffa' ? 'Duel / Free-for-All' : MODES_BY_ID[id]?.name || id);
const arenaShort = (id) => { const a = ARENAS_BY_ID[id]; return a ? (a.royale ? `${a.name} · ${a.ruleset}` : a.name) : id; };

const KEYS_DESKTOP = [
  ['W A S D', 'Move'], ['Shift', 'Run'], ['Space', 'Jump'], ['Mouse', 'Aim (click the game first)'], ['Left click', 'Fire'], ['Right click', 'Zoom (Precision marker)'],
  ['R', 'Reload'], ['Q / wheel / 1–6', 'Switch blaster'], ['V', 'First / third person'], ['Tab', 'Scoreboard'], ['Hold T', 'Push-to-talk voice chat'], ['Esc', 'Match menu'],
];
const KEYS_ROYALE = [['E', 'Open a crate / pick up / clean a squadmate'], ['G', 'Throw a paint bomb'], ['B', 'Throw a colour-smoke bomb'], ['H', 'Use a cleaning wipe or kit'], ['C', 'Paint shield'], ['Z', 'Paint-scan pulse'], ['X', 'Drop the blaster in your hands'], ['M', 'Campus map']];
const TOUCH_CONTROLS = [
  ['Left thumb', 'Joystick: move (push to the edge to run)'], ['Right thumb', 'Drag to aim'], ['🎯', 'Fire (drag on it to aim while firing)'], ['⤒', 'Jump'], ['⟳', 'Reload'], ['⇄', 'Switch blaster'],
  ['🔍', 'Hold to zoom'], ['👁', 'First / third person'], ['🎤', 'Hold to talk'], ['📋', 'Hold for scores'], ['☰', 'Match menu'],
  ['✋ 💣 🧴', 'Campus Royale: pick up / open, paint bomb, clean'], ['🛡️ 📡 🗺️ 🎒', 'Campus Royale: shield, scan, map, inventory'],
];

const focusables = (el) => [...el.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]')].filter((e) => e.offsetParent !== null);

export function createPortal({ root, hooks }) {
  // hooks: create(nick), join(code, nick), playIntro(), openFreeRoam(), roomCode() → code | null, extras() → [{ label, sub, voice, onClick }],
  //        touch() → bool, voice (js/voice.js Voice), toast(text), credits()
  let prefs = loadPrefs();
  let visible = false;
  let preview = null; let previewLoading = null; let raf = 0; let last = 0;
  let sheet = null; // { el, name, opener, onClose }
  let statusMsg = null;

  const sheets = h('div', { id: 'portal-sheets' });
  document.body.append(sheets);

  // ---------- the portal itself ----------
  const nick = h('input', { type: 'text', maxlength: 16, placeholder: 'Your nickname', value: prefs.nickname, 'aria-label': 'Player nickname', 'data-portal': 'nickname', autocomplete: 'off', spellcheck: 'false',
    oninput: () => { prefs = savePrefs({ nickname: cleanNickname(nick.value) }); renderPreview(); },
    onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); menuEl.querySelector('[data-portal=create]')?.focus(); } } });
  const status = h('div', { class: 'p-status hidden', role: 'status', 'data-portal': 'status' });
  const platform = () => h('div', { class: 'p-platform', 'aria-hidden': 'true' });
  const fallback = () => h('div', { class: 'p-preview-fallback' }, '🎯');
  const stageCanvas = h('div', { class: 'p-preview-box' }, platform(), fallback());
  const loadoutEl = h('div', { class: 'p-loadout', 'data-portal': 'loadout' });
  const nextEl = h('div', { class: 'p-next', 'data-portal': 'next' });
  const menuEl = h('nav', { class: 'p-menu', 'aria-label': 'Main menu' });
  const extrasEl = h('div', { class: 'p-extras' });
  const micBtn = h('button', { class: 'p-icon', title: 'Voice command: say “create room”, “join room K7PQ2”, “settings”…', 'aria-label': 'Voice command', 'data-portal': 'voice', onclick: () => listen() }, '🎤');

  const entry = (id, label, sub, onClick, { cls = '', voice = '', icon = '' } = {}) => h('button', { class: `p-btn ${cls}`, 'data-portal': id, 'data-voice': voice, onclick: (e) => onClick(e.currentTarget) },
    icon && h('span', { class: 'p-btn-icon', 'aria-hidden': 'true' }, icon),
    h('span', { class: 'p-btn-text' }, h('b', {}, label), sub && h('small', {}, sub)));

  function renderMenu() {
    const extras = hooks.extras?.() || [];
    extrasEl.replaceChildren(...extras.map((x, i) => entry(`extra-${i}`, x.label, x.sub, () => x.onClick(), { cls: 'p-btn-extra', voice: x.voice || '' })));
    menuEl.replaceChildren(
      entry('create', 'CREATE ROOM', `Host a private match · ${modeShort(prefs.mode)} · ${ARENAS_BY_ID[prefs.arena]?.name}`, () => create(), { cls: 'p-hero', voice: 'create host new room match play', icon: '➕' }),
      entry('join', 'JOIN ROOM', 'Enter a friend’s 5-character code', (b) => openJoin(b), { cls: 'p-hero2', voice: 'join enter code friend', icon: '🔑' }),
      entry('customise', 'CUSTOMISE CHARACTER', 'Look, mask and preferred blasters', (b) => openCustomise(b), { voice: 'customise customize character look appearance blasters', icon: '🎨' }),
      entry('modes', 'GAME MODES', `${modeShort(prefs.mode)} · ${arenaShort(prefs.arena)}`, (b) => openModes(b), { voice: 'game modes mode arena', icon: '🗺️' }),
      entry('howto', 'HOW TO PLAY', 'Controls, items, crates, paint zone, scoring', (b) => openHowTo(b), { voice: 'how to play help controls', icon: '📖' }),
      entry('settings', 'SETTINGS', 'Audio, graphics, controls · Campus Free Roam', (b) => openSettings({ opener: b }), { voice: 'settings options audio graphics', icon: '⚙️' }),
      entry('intro', 'WATCH THE INTRO', 'The Play with BITSians story film', () => hooks.playIntro(), { voice: 'watch intro film movie story', icon: '🎬' }),
      ...(extras.length ? [extrasEl] : []));
  }

  function renderSide() {
    const [a, b] = prefs.loadout.map((id) => EQUIPMENT_BY_ID[id]);
    loadoutEl.replaceChildren(...[[a, 'PRIMARY'], [b, 'SECONDARY']].map(([e, slot]) => h('div', { class: 'p-chip', style: `--c:${e.colour}` }, h('small', {}, slot), h('b', {}, e.short))));
    nextEl.replaceChildren(h('small', {}, 'YOUR NEXT ROOM'), h('b', {}, modeShort(prefs.mode)), h('span', {}, arenaShort(prefs.arena)));
  }

  const el = h('div', { class: 'p-portal', 'data-portal': 'root' },
    h('div', { class: 'p-splats', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')),
    h('header', { class: 'p-top' },
      h('div', { class: 'p-brand' }, h('div', { class: 'p-mark', 'aria-hidden': 'true' }),
        h('div', {}, h('div', { class: 'p-kicker' }, 'BITS Pilani · Multiplayer Paintball'), h('h1', {}, 'PLAY WITH ', h('span', {}, 'BITSIANS')))),
      h('div', { class: 'p-top-actions' }, micBtn, h('button', { class: 'p-icon', title: 'Settings', 'aria-label': 'Settings', onclick: (e) => openSettings({ opener: e.currentTarget }) }, '⚙️'))),
    h('main', { class: 'p-main' },
      h('section', { class: 'p-left' }, status, menuEl),
      h('section', { class: 'p-stage', 'aria-label': 'Your character' },
        stageCanvas,
        h('div', { class: 'p-under' },
          h('label', { class: 'p-nick' }, h('small', {}, 'NICKNAME'), nick),
          loadoutEl)),
      h('aside', { class: 'p-right' }, nextEl,
        h('div', { class: 'p-tip' }, h('small', {}, 'SQUAD UP'), h('span', {}, 'Create a room, share its code or link, and play on the Med-C Ground or across the whole campus. Voice chat in the lobby; team-only in team matches.')))),
    h('footer', { class: 'p-foot' },
      h('span', { class: 'p-keys' }, h('kbd', {}, '↑'), h('kbd', {}, '↓'), ' navigate ', h('kbd', {}, 'Enter'), ' select ', h('kbd', {}, 'Esc'), ' back'),
      h('span', { class: 'p-device' }, 'Laptop (mouse + keyboard) or phone (touch, best sideways) · Chrome recommended'),
      hooks.credits && h('button', { class: 'p-link', 'data-portal': 'credits', onclick: () => hooks.credits() }, 'Credits')));

  // ---------- the live character preview ----------
  function renderPreview() {
    preview?.set({ ...prefs.look, nickname: prefs.nickname || 'You', equip: prefs.loadout[0] });
  }
  function ensurePreview() {
    if (preview || previewLoading) return;
    previewLoading = import('../paintball/client/index.js').then(({ Preview }) => {
      previewLoading = null;
      if (!visible) return;
      const small = innerWidth < 700 || innerHeight < 500;
      preview = new Preview({ width: small ? 300 : 420, height: small ? 400 : 560, cls: 'p-preview', name: 'portal-preview' });
      stageCanvas.replaceChildren(platform(), preview.canvas);
      renderPreview();
      loop();
    }).catch((e) => { previewLoading = null; console.warn('[portal] preview:', e.message); });
  }
  function loop(t = performance.now()) {
    cancelAnimationFrame(raf);
    if (!visible || !preview) return;
    const dt = Math.min(0.05, (t - (last || t)) / 1000); last = t;
    if (!document.hidden) preview.render(settings.reduceMotion ? 0 : dt);
    raf = requestAnimationFrame(loop);
  }
  function dropPreview() {
    cancelAnimationFrame(raf); last = 0;
    if (preview) { preview.dispose(); preview = null; stageCanvas.replaceChildren(platform(), fallback()); }
  }

  // ---------- actions ----------
  const nickname = () => cleanNickname(nick.value);
  function create() {
    closeSheet(false);
    hooks.create(nickname());
  }
  function join(code) {
    const c = normaliseCode(code);
    if (!isCode(c)) return false;
    closeSheet(false);
    hooks.join(c, nickname());
    return true;
  }
  function setStatus(text, bad = false) {
    statusMsg = text || null;
    status.textContent = text || '';
    status.classList.toggle('hidden', !text);
    status.classList.toggle('bad', !!bad);
  }

  // ---------- sheets ----------
  function openSheet(name, title, body, { opener = null, wide = false, onClose = null } = {}) {
    closeSheet(false);
    const close = h('button', { class: 'p-close', 'aria-label': 'Close', title: 'Close (Esc)', 'data-portal': 'close', onclick: () => closeSheet() }, '✕');
    const elx = h('div', { class: `p-sheet${wide ? ' wide' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title, 'data-sheet': name },
      h('div', { class: 'p-sheet-head' }, h('button', { class: 'p-back', 'aria-label': 'Back', onclick: () => closeSheet() }, '‹'), h('h2', {}, title), close),
      h('div', { class: 'p-sheet-body' }, body));
    sheets.replaceChildren(h('div', { class: 'p-scrim', onclick: () => closeSheet() }), elx);
    sheets.classList.add('open');
    sheets.classList.toggle('over-game', !visible);
    el.classList.add('sheet-open');
    el.classList.toggle('sheet-wide', wide);
    el.scrollTop = 0;
    sheet = { el: elx, name, opener, onClose };
    requestAnimationFrame(() => { elx.classList.add('in'); (elx.querySelector('[autofocus]') || focusables(elx.querySelector('.p-sheet-body'))[0] || close).focus({ preventScroll: true }); });
    return elx;
  }
  function closeSheet(refocus = true) {
    if (!sheet) return;
    const s = sheet; sheet = null;
    sheets.classList.remove('open');
    sheets.replaceChildren();
    el.classList.remove('sheet-open', 'sheet-wide');
    s.onClose?.();
    if (refocus && visible && s.opener?.isConnected) s.opener.focus({ preventScroll: true });
  }

  function openJoin(opener) {
    const code = h('input', { type: 'text', class: 'p-code', maxlength: 7, placeholder: 'K7PQ2', 'aria-label': 'Room code', 'data-portal': 'code', autocomplete: 'off', spellcheck: 'false', autofocus: true,
      oninput: () => { code.value = normaliseCode(code.value); err.textContent = ''; },
      onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } } });
    const err = h('div', { class: 'p-err', role: 'alert' });
    const go = () => { if (!join(code.value)) { err.textContent = 'Room codes are 5 letters/numbers, like K7PQ2.'; code.focus(); } };
    openSheet('join', 'Join a room', h('div', { class: 'p-stack' },
      h('p', {}, 'Type the 5-character code your friend sees in their lobby (or open the link they shared).'),
      code, err,
      h('button', { class: 'p-cta', 'data-portal': 'join-go', onclick: go }, 'JOIN ROOM'),
      h('p', { class: 'p-muted' }, `You join as “${nickname() || 'a random BITSian name'}” with your customised look and blasters. Rooms hold up to ${MAX_PLAYERS} players.`)), { opener });
  }

  function openCustomise(opener) {
    const body = h('div', { class: 'p-stack', 'data-portal': 'customise' });
    const draw = () => {
      const L = prefs.look;
      const set = (patch) => { prefs = savePrefs({ look: { ...prefs.look, ...patch } }); renderPreview(); renderSide(); draw(); };
      const sw = (list, key, label) => h('div', { class: 'p-field' }, h('small', {}, label), h('div', { class: 'p-swatches', role: 'radiogroup', 'aria-label': label },
        ...list.map((c) => h('button', { class: `p-swatch${L[key] === c ? ' sel' : ''}`, style: `--c:${c}`, role: 'radio', 'aria-checked': String(L[key] === c), 'aria-label': `${key} ${c}`, onclick: () => set({ [key]: c }) }))));
      const chosen = prefs.loadout;
      const pick = (id) => { if (chosen.includes(id)) return; prefs = savePrefs({ loadout: [chosen[1], id] }); renderPreview(); renderSide(); draw(); };
      const keep = document.activeElement?.getAttribute('aria-label') || document.activeElement?.dataset?.eq;
      body.replaceChildren(
        h('div', { class: 'p-field' }, h('small', {}, 'Character'), h('div', { class: 'p-chips' }, ...CHARACTERS.map((c, i) => h('button', { class: `p-pill${L.character === i ? ' sel' : ''}`, 'aria-label': `character ${c.name}`, 'aria-pressed': String(L.character === i), onclick: () => set({ character: i }) }, c.name)))),
        sw(OUTFIT_COLOURS, 'outfit', 'Outfit'),
        sw(PANTS_COLOURS, 'pants', 'Trousers'),
        sw(MASK_COLOURS, 'mask', 'Paintball mask (team colour shows in team matches)'),
        h('div', { class: 'p-field' }, h('small', {}, 'Accessory'), h('div', { class: 'p-chips' }, ...ACCESSORIES.map((a) => h('button', { class: `p-pill${L.accessory === a.id ? ' sel' : ''}`, 'aria-label': `accessory ${a.name}`, 'aria-pressed': String(L.accessory === a.id), onclick: () => set({ accessory: a.id }) }, a.name)))),
        h('div', { class: 'p-field' }, h('small', {}, 'Preferred blasters · pick 2 of 6 (the newest pick replaces the older)'),
          h('div', { class: 'p-equip' }, ...EQUIPMENT.map((e) => h('button', { class: `p-eq${chosen.includes(e.id) ? ' sel' : ''}`, style: `--c:${e.colour}`, 'data-eq': e.id, 'aria-pressed': String(chosen.includes(e.id)), onclick: () => pick(e.id) },
            chosen.includes(e.id) && h('span', { class: 'p-slot' }, chosen[0] === e.id ? 'PRIMARY' : 'SECONDARY'),
            h('b', {}, e.short), h('span', { class: 'p-muted' }, BLURB[e.id]), statBars(e))))),
        h('p', { class: 'p-muted' }, 'Saved in this browser. Your next lobby starts with this look and these blasters (you can still change them there).'));
      if (keep) body.querySelector(`[aria-label="${CSS.escape(keep)}"], [data-eq="${CSS.escape(keep)}"]`)?.focus({ preventScroll: true });
    };
    draw();
    openSheet('customise', 'Customise character', body, { opener, wide: true });
  }

  function openModes(opener) {
    const body = h('div', { class: 'p-stack', 'data-portal': 'modes' });
    const draw = () => {
      const keep = document.activeElement?.dataset?.mode || document.activeElement?.dataset?.arena;
      const set = (patch) => { prefs = savePrefs(patch); renderMenu(); renderSide(); draw(); hooks.toast?.(`Default for your next room: ${modeShort(prefs.mode)} · ${arenaShort(prefs.arena)}`); };
      body.replaceChildren(
        h('h3', {}, 'Mode'),
        h('div', { class: 'p-cards' }, ...MODES.map((m) => { const i = MODE_INFO[m.id]; const on = prefs.mode === m.id; return h('button', { class: `p-card${on ? ' sel' : ''}`, 'data-mode': m.id, 'aria-pressed': String(on), onclick: () => set({ mode: m.id }) },
          h('span', { class: 'p-card-tag' }, i.tag), h('b', {}, i.title), h('span', {}, i.text), on && h('span', { class: 'p-tick' }, '✓ DEFAULT')); })),
        h('h3', {}, 'Arena'),
        h('div', { class: 'p-cards two' }, ...ARENAS.map((a) => { const i = ARENA_INFO[arenaKey(a)]; const on = prefs.arena === a.id; return h('button', { class: `p-card arena-${arenaKey(a)}${on ? ' sel' : ''}`, 'data-arena': a.id, 'aria-pressed': String(on), onclick: () => set({ arena: a.id }) },
          h('span', { class: 'p-card-tag' }, i.tag), h('b', {}, arenaShort(a.id)), h('span', {}, i.text), on && h('span', { class: 'p-tick' }, '✓ DEFAULT')); })),
        h('p', { class: 'p-muted' }, 'Picking one sets the default for the next room you host. In the lobby the host can still change the mode, arena and match length; team modes start when the room has exactly the right number of players.'),
        h('button', { class: 'p-cta', 'data-portal': 'modes-create', onclick: () => create() }, `CREATE ROOM · ${modeShort(prefs.mode)}`));
      if (keep) body.querySelector(`[data-mode="${CSS.escape(keep)}"], [data-arena="${CSS.escape(keep)}"]`)?.focus({ preventScroll: true });
    };
    draw();
    openSheet('modes', 'Game modes', body, { opener, wide: true });
  }

  function openHowTo(opener) {
    const table = (rows) => h('table', { class: 'p-table' }, h('tbody', {}, ...rows.map(([k, v]) => h('tr', {}, h('td', {}, h('kbd', {}, k)), h('td', {}, v)))));
    const tabs = {
      controls: () => [h('h3', {}, 'Laptop · keyboard and mouse'), table(KEYS_DESKTOP), h('h3', {}, 'Campus Royale extras'), table(KEYS_ROYALE), h('h3', {}, 'Phone · touch'), table(TOUCH_CONTROLS), h('p', { class: 'p-muted' }, 'Phones play best held sideways. Mouse and touch sensitivity, invert Y and field of view are in Settings.')],
      items: () => [
        h('h3', {}, 'Blasters (six kinds)'), h('ul', { class: 'p-list' }, ...EQUIPMENT.map((e) => h('li', {}, h('b', { style: `color:${e.colour}` }, e.name), ` · ${BLURB[e.id]}`))),
        h('h3', {}, 'Supplies (Campus Royale)'),
        h('ul', { class: 'p-list' }, ...['paintbomb', 'smoke', 'wipes', 'kit', 'refill', 'shield', 'scan'].map((id) => h('li', {}, `${ITEMS[id].icon} `, h('b', {}, ITEMS[id].name), ` · ${ITEMS[id].long}${CARRY[id] ? ` · carry up to ${CARRY[id]}` : ''}`)),
          h('li', {}, '🥽 ', h('b', {}, 'Masks L1–L3'), ` stop ${GEAR.mask.slice(1).map((v) => `${Math.round(v * 100)}%`).join(' / ')} of head paint; `, '🦺 ', h('b', {}, 'padded vests L1–L3'), ` stop ${GEAR.vest.slice(1).map((v) => `${Math.round(v * 100)}%`).join(' / ')} of body paint.`))],
      crates: () => [h('h3', {}, 'Supply crates'), h('p', {}, `In Campus Royale everyone lands with a Standard blaster and ${ROYALE.start.hopper} paintballs. About ${Math.round(ROYALE.lootShare * 100)}% of the verified supply spots on campus get a crate each match. Walk up and press E (✋ on a phone) to open one: everyone sees it open, and you pick items from its panel. Nothing respawns.`),
        h('p', {}, `A special supply drop with better items lands about ${Math.round(ROYALE.airdrop.at / 60)} minutes in; it is announced ${ROYALE.airdrop.warn} s before. Picking up a third blaster swaps it with the one in your hands.`)],
      bombs: () => [h('h3', {}, 'Paint bombs'), h('p', {}, `G throws a paint bomb in an arc. It bounces, bursts after about ${BOMB.fuse} s and paints everyone within ${BOMB.radius} m (up to ${BOMB.paint} paint, less further out). Carry up to ${CARRY.paintbomb}.`),
        h('p', {}, `B throws a colour-smoke bomb: a ${SMOKE.radius} m cloud of cover for ${SMOKE.duration} s. Cleaning: wipes remove ${KITS.wipes.paint} paint over ${KITS.wipes.time} s, a kit ${KITS.kit.paint} over ${KITS.kit.time} s (H). Paint shield (C): ${SHIELD.time} s bubble, no firing from inside. Paint scan (Z): opponents within ${SCAN.radius} m on your minimap for ${SCAN.time} s.`)],
      zone: () => [h('h3', {}, 'The paint zone'), h('p', {}, `Campus Royale only. The play zone shrinks in ${ZONE_PHASES.length} phases towards a random final spot; outside it, paint builds up on you every second. Stay inside the circle on your map.`),
        h('table', { class: 'p-table' }, h('tbody', {}, h('tr', {}, h('th', {}, 'Phase'), h('th', {}, 'Holds'), h('th', {}, 'Shrinks'), h('th', {}, 'Radius'), h('th', {}, 'Paint/s outside')),
          ...ZONE_PHASES.map((p, i) => h('tr', {}, h('td', {}, String(i + 1)), h('td', {}, `${p.wait} s`), h('td', {}, `${p.shrink} s`), h('td', {}, `${p.r} m`), h('td', {}, String(p.dps))))))],
      scoring: () => [h('h3', {}, 'Scoring'), h('table', { class: 'p-table' }, h('tbody', {},
        ...[[`+${SCORE.tag}`, 'Tag: you fill an opponent’s paint meter'], [`+${SCORE.assist}`, `Assist: you painted them within ${ASSIST_WINDOW} s before someone else tagged them`], [`+${SCORE.completion}`, 'Still in the room when the match ends'], [`+${SCORE.win}`, 'Win (you, or every player on the winning team)'], [`+${SCORE.place}`, 'Campus Royale: per player or squad you outlast']].map(([k, v]) => h('tr', {}, h('td', {}, h('b', {}, k)), h('td', {}, v))))),
        h('p', {}, `A hit adds paint; at 100 you are tagged (a round elimination). Med-C Ground: back in after ${TIMING.respawn} s with ${TIMING.protection} s of spawn protection; a tie for first place goes to ${TIMING.overtime} s of overtime. Campus Royale: one tag and you are out (squads: a teammate can clean you off within ${ROYALE.down} s).`)],
    };
    const names = [['controls', 'Controls'], ['items', 'Items'], ['crates', 'Crates'], ['bombs', 'Paint bombs'], ['zone', 'Paint zone'], ['scoring', 'Scoring']];
    const content = h('div', { class: 'p-tab-body', 'data-portal': 'howto-body' });
    const bar = h('div', { class: 'p-tabs', role: 'tablist' });
    const show = (k) => { content.replaceChildren(...tabs[k]()); for (const b of bar.children) { const on = b.dataset.tab === k; b.classList.toggle('sel', on); b.setAttribute('aria-selected', String(on)); } };
    bar.append(...names.map(([k, label]) => h('button', { class: 'p-tab', role: 'tab', 'data-tab': k, onclick: () => show(k) }, label)));
    show('controls');
    openSheet('howto', 'How to play', h('div', { class: 'p-stack', 'data-portal': 'howto' }, bar, content), { opener, wide: true });
  }

  function openSettings({ opener = null } = {}) {
    const body = h('div', { class: 'p-stack', 'data-portal': 'settings' });
    const draw = () => {
      const s = settings;
      const keep = document.activeElement?.dataset?.setting;
      const slider = (key, label, min, max, step, fmt) => {
        const out = h('output', {}, fmt(s[key]));
        return h('label', { class: 'p-set' }, h('span', {}, label), h('input', { type: 'range', min, max, step, value: s[key], 'data-setting': key, 'aria-label': label,
          oninput: (e) => { setSetting(key, Number(e.target.value)); out.textContent = fmt(settings[key]); } }), out);
      };
      const pct = (v) => `${Math.round(v * 100)}%`;
      const times = (v) => `${v.toFixed(1)}×`;
      const check = (key, label, note = '') => h('label', { class: 'p-check' }, h('input', { type: 'checkbox', checked: s[key], 'data-setting': key, onchange: (e) => { setSetting(key, e.target.checked); } }), h('span', {}, label, note && h('small', {}, note)));
      const cur = graphicsChoice(hooks.touch?.());
      const room = hooks.roomCode?.();
      body.replaceChildren(
        h('h3', {}, 'Audio'),
        slider('master', 'Master volume', 0, 1, 0.05, pct), slider('music', 'Music (intro film)', 0, 1, 0.05, pct), slider('effects', 'Effects (paintballs, splats, film sounds)', 0, 1, 0.05, pct), slider('voice', 'Voice chat', 0, 1, 0.05, pct),
        check('muted', 'Mute all sound'),
        h('h3', {}, 'Graphics'),
        h('div', { class: 'p-seg', role: 'radiogroup', 'aria-label': 'Graphics quality' }, ...GRAPHICS_CHOICES.map((g) => h('button', { class: `p-pill${cur === g ? ' sel' : ''}`, role: 'radio', 'aria-checked': String(cur === g), 'data-setting': `graphics-${g}`, onclick: () => { setSetting('graphics', g); draw(); } }, PROFILES[g].label))),
        h('p', { class: 'p-muted' }, `${PROFILES[cur].label}: ${PROFILES[cur].note}.${s.graphics ? '' : ' (Automatic: Medium on phones, High elsewhere.)'}`),
        check('showStats', 'Show performance stats', 'frame rate and draw calls, top corner'),
        h('h3', {}, 'Controls'),
        slider('mouseSensitivity', 'Mouse sensitivity', 0.2, 3, 0.1, times), slider('touchSensitivity', 'Touch aim sensitivity', 0.2, 3, 0.1, times),
        check('invertY', 'Invert Y (move the mouse / thumb up to look down)'),
        slider('fov', 'Field of view (paintball match)', 60, 95, 1, (v) => `${Math.round(v)}°`),
        check('thirdPerson', 'Start matches in third-person view', 'V switches during a match'),
        h('details', { class: 'p-keys-list' }, h('summary', {}, 'Key list'), h('table', { class: 'p-table' }, h('tbody', {}, ...[...KEYS_DESKTOP, ...KEYS_ROYALE].map(([k, v]) => h('tr', {}, h('td', {}, h('kbd', {}, k)), h('td', {}, v)))))),
        h('h3', {}, 'Other'),
        check('reduceMotion', 'Reduce motion', 'calmer menus and a still character preview'),
        h('div', { class: 'p-row' },
          h('button', { class: 'p-pill', 'data-setting': 'replay-intro', onclick: () => { try { localStorage.removeItem('pwb-intro-seen'); } catch { /* */ } hooks.toast?.('The intro will play on your next visit.'); } }, 'Show the intro on my next visit'),
          h('button', { class: 'p-pill', 'data-setting': 'reset', onclick: () => { resetSettings(); draw(); hooks.toast?.('Settings reset.'); } }, 'Reset settings')),
        h('h3', {}, 'Optional experience'),
        h('div', { class: `p-exp${room ? ' off' : ''}` },
          h('div', {}, h('b', {}, '🗺️ Campus Free Roam'), h('span', {}, 'Fly over the BITS Pilani campus in 3D, pick a place and walk inside. Separate from paintball; “Back to the portal” brings you back here.')),
          h('button', { class: 'p-cta small', 'data-portal': 'free-roam', disabled: !!room, onclick: () => { closeSheet(false); hooks.openFreeRoam(); } }, 'Campus Free Roam (optional experience)'),
          room && h('div', { class: 'p-err', 'data-portal': 'free-roam-blocked' }, `You are in paintball room ${room}. Leave the room first to use Campus Free Roam.`)),
        h('p', { class: 'p-muted' }, 'Settings are saved in this browser and apply right away: volumes and graphics everywhere, controls in the paintball match.'));
      if (keep) body.querySelector(`[data-setting="${CSS.escape(keep)}"]`)?.focus({ preventScroll: true });
    };
    draw();
    openSheet('settings', 'Settings', body, { opener });
  }

  // ---------- voice commands (the game's speech recognition, js/voice.js) ----------
  function voiceText(text) {
    const t = String(text || '').toLowerCase();
    const m = t.match(/\b(?:join|code)\b(.*)$/);
    if (m) { const c = normaliseCode(m[1]); if (isCode(c)) { join(c); return 'join'; } }
    if (!sheet && /\b(create|host|new room|start a room)\b/.test(t)) { create(); return 'create'; }
    const said = [[/\bsettings?\b|\boptions\b/, 'settings'], [/\bcustomi[sz]e|\bcharacter\b|\blook\b/, 'customise'], [/\bmodes?\b|\barenas?\b/, 'modes'], [/how to|\bhelp\b|\bcontrols\b/, 'howto'], [/\bintro\b|\bfilm\b|\bmovie\b/, 'intro'], [/\bjoin\b/, 'join']].find(([re]) => re.test(t));
    const inSheet = sheet && hooks.voice?.matchButton?.(text, sheet.el); // a choice on the open panel first ("turban", "low")
    if (inSheet) { inSheet.click(); return inSheet.dataset.portal || 'button'; }
    if (said && visible) { if (sheet) closeSheet(false); menuEl.querySelector(`[data-portal=${said[1]}]`)?.click(); return said[1]; }
    const b = visible && hooks.voice?.matchButton?.(text, menuEl);
    if (b) { b.click(); return b.dataset.portal || 'button'; }
    hooks.toast?.(`🎤 Heard “${text}”. Try “create room”, “join room K7PQ2”, “customise” or “settings”.`);
    return null;
  }
  function listen() {
    const v = hooks.voice;
    if (!v) return;
    v.listen((text) => voiceText(text), (err) => hooks.toast?.(err));
  }

  // ---------- keyboard ----------
  document.addEventListener('keydown', (e) => {
    if (sheet && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeSheet(); return; }
    if (sheet && e.key === 'Tab') { // keep focus inside the open sheet
      const f = focusables(sheet.el); if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f.at(-1).focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      return;
    }
    if (!visible || sheet || splashEl) return;
    const items = [...menuEl.querySelectorAll('.p-btn')];
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (document.activeElement === nick) return;
      e.preventDefault();
      const n = i < 0 ? 0 : (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[n].focus();
    } else if (e.key === 'ArrowRight' && i >= 0) { e.preventDefault(); nick.focus(); } else if (e.key === 'ArrowLeft' && document.activeElement === nick && nick.selectionStart === 0) { e.preventDefault(); items[0].focus(); }
  }, true);

  // ---------- first visit: press to start ----------
  let splashEl = null;
  function splash({ onStart, onSkip }) {
    if (splashEl) return;
    const start = () => { if (!splashEl) return; done(); onStart(); };
    const skip = (e) => { e.stopPropagation(); if (!splashEl) return; markIntroSeen(); done(); onSkip?.(); };
    const keydown = (e) => { if (e.key === 'Escape') skip(e); else if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key !== 'Tab') { e.preventDefault(); start(); } };
    const done = () => { document.removeEventListener('keydown', keydown, true); splashEl.classList.add('out'); const s = splashEl; splashEl = null; setTimeout(() => s.remove(), 450); if (visible) document.querySelector('[data-portal=create]')?.focus({ preventScroll: true }); };
    splashEl = h('div', { id: 'p-splash', 'data-portal': 'splash', role: 'button', tabindex: '0', 'aria-label': 'Press to start: plays the intro film', onclick: start },
      h('div', { class: 'p-splash-inner' },
        h('div', { class: 'p-mark big', 'aria-hidden': 'true' }),
        h('div', { class: 'p-kicker' }, 'BITS Pilani · Multiplayer Paintball'),
        h('h1', {}, 'PLAY WITH ', h('span', {}, 'BITSIANS')),
        h('div', { class: 'p-press' }, hooks.touch?.() ? 'TAP TO START' : 'PRESS ANY KEY TO START'),
        h('p', {}, 'Starts with the intro film · sound on 🔊')),
      h('button', { class: 'p-skip', 'data-portal': 'skip-intro', onclick: skip }, 'Skip intro ›'));
    document.body.append(splashEl);
    document.addEventListener('keydown', keydown, true);
    splashEl.focus({ preventScroll: true });
  }

  root.replaceChildren(el);
  renderMenu(); renderSide();

  return {
    el,
    get visible() { return visible; },
    get sheet() { return sheet?.name || null; },
    get splashing() { return !!splashEl; },
    show({ status: st = null, bad = false } = {}) {
      prefs = loadPrefs();
      nick.value = prefs.nickname;
      visible = true;
      root.classList.add('portal-on');
      renderMenu(); renderSide();
      if (st !== null) setStatus(st, bad);
      ensurePreview(); renderPreview(); loop();
      el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter');
      if (!splashEl) setTimeout(() => { if (visible && !sheet && !splashEl && !el.contains(document.activeElement)) menuEl.querySelector('[data-portal=create]')?.focus({ preventScroll: true }); }, 60);
    },
    hide() { visible = false; closeSheet(false); setStatus(''); dropPreview(); root.classList.remove('portal-on'); },
    setStatus,
    get status() { return statusMsg; },
    openSettings, closeSheet, splash, voiceText,
    open(name) { ({ join: openJoin, customise: openCustomise, modes: openModes, howto: openHowTo, settings: () => openSettings() })[name]?.(); },
  };
}
