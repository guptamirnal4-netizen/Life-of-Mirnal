// Play with BITSians: multiplayer paintball in the browser. Screens (start, lobby with customisation and
// paintball equipment, match HUD, results), input (keyboard/mouse with pointer lock, touch), voice chat, and the
// 3D match (./match.js) on the Med-C Ground of the one BitsCampus the game already builds.
import * as THREE from 'three';
import { Net, joinError } from './net.js';
import { normaliseCode, isCode, shareLink } from './codes.js';
import { MatchView } from './match.js';
import { VoiceChat } from './voicechat.js';
import { makeAvatar, disposeAvatar } from './avatar.js';
import { h, statBars, BLURB, EQUIPMENT_LIST, confetti, copyText, fmtTime } from './ui.js';
import * as sfx from './sounds.js';
import { arenaGroup, poseAim } from '../models.js';
import { ARENAS, ARENAS_BY_ID } from '../arena.js';
import { MODES, MODES_BY_ID, TEAMS, TIMING, modeLabel, MAX_PLAYERS } from '../rules.js';
import { EQUIPMENT_BY_ID, PAINT_MAX } from '../equipment.js';
import { CHARACTERS, OUTFIT_COLOURS, PANTS_COLOURS, MASK_COLOURS, ACCESSORIES } from '../looks.js';

export const GAME_NAME = 'Play with BITSians';
const ACTIVE = new Set(['countdown', 'playing', 'overtime']);
const store = { get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* private mode */ } } };
const lockPointer = (c) => { try { const p = c.requestPointerLock?.(); p?.catch?.(() => {}); } catch { /* not allowed now */ } };
const typing = (e) => e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement;
const teamName = (t) => (t >= 0 ? TEAMS[t].name : '');
const teamColour = (t) => (t >= 0 ? TEAMS[t].colour : '#888');

export class PaintballMode {
  constructor({ scene, camera, canvas, player, touch, loadWorld, onExit }) {
    Object.assign(this, { scene, camera, canvas, player, touch, loadWorld, onExit });
    this.net = new Net();
    this.room = null; this.view = null; this.voice = null;
    this.screen = 'start'; this.sig = ''; this.feed = [];
    this.look = { character: 0, outfit: OUTFIT_COLOURS[0], pants: PANTS_COLOURS[0], mask: MASK_COLOURS[0], accessory: 'none' };
    this.loadout = ['standard', 'rapid'];
    this.board = false; this.orbit = 0; this.voiceErr = '';
    if (!document.getElementById('pb-css')) document.head.append(h('link', { id: 'pb-css', rel: 'stylesheet', href: 'css/paintball.css' }));
    this.root = h('div', { id: 'pb-root' });
    document.body.append(this.root);
    document.body.classList.add('pb-mode');
    // the world: the one BitsCampus, with the arena on the Med-C Ground
    this.campus = loadWorld();
    this.arenaGroups = new Map();
    this.setArena('medc');
    this.bindInput();
    globalThis.__pb = this; // tests and debugging
  }

  setArena(id) {
    const a = ARENAS_BY_ID[id] || ARENAS[0];
    if (this.arena?.id === a.id) return;
    for (const g of this.arenaGroups.values()) this.scene.remove(g);
    if (!this.arenaGroups.has(a.id)) this.arenaGroups.set(a.id, arenaGroup(a));
    this.scene.add(this.arenaGroups.get(a.id));
    this.arena = a;
  }

  get state() { const s = this.room?.state; return s?.players ? s : null; } // null until the first state sync
  get me() { return this.room ? this.state?.players.get(this.room.sessionId) : null; }
  get inMatch() { return !!this.room && ACTIVE.has(this.state?.phase); }
  get viewName() { return this.view?.view || 'first'; }
  get focus() { return this.inMatch && this.view ? this.view.eye : new THREE.Vector3(this.arena.centre.x, 0, this.arena.centre.z); }

  // ---------- start screen ----------
  open({ code } = {}) {
    const c = normaliseCode(code);
    if (c && isCode(c)) return this.connect({ code: c, nickname: store.get('pb-nick') || `BITSian ${Math.floor(10 + Math.random() * 89)}` });
    this.showStart();
  }

  showStart(status = '', bad = false) {
    this.screen = 'start';
    const nick = h('input', { type: 'text', maxlength: 16, placeholder: 'Your nickname for this session', value: store.get('pb-nick') || '', 'aria-label': 'Nickname' });
    const code = h('input', { type: 'text', class: 'code', maxlength: 5, placeholder: 'CODE', 'aria-label': 'Room code' });
    const name = () => { const n = nick.value.trim() || `BITSian ${Math.floor(10 + Math.random() * 89)}`; store.set('pb-nick', n); return n; };
    const conf = this.net.configured;
    this.mount(h('div', { class: 'pb-screen' }, h('div', { class: 'pb-card narrow pb-stack' },
      h('h1', {}, GAME_NAME),
      h('div', { class: 'pb-sub' }, '🎯 Multiplayer paintball on the Med-C Ground · private rooms for up to 12 friends'),
      !conf && h('div', { class: 'pb-status bad', 'data-pb': 'not-configured' }, 'The multiplayer game server is not configured for this site yet, so rooms cannot be created or joined. (Nothing here is simulated: there are no fake rooms or players.)'),
      status && h('div', { class: `pb-status${bad ? ' bad' : ''}`, 'data-pb': 'status' }, status),
      h('label', { class: 'pb-sub' }, 'Nickname (temporary, only for this session)'), nick,
      h('button', { class: 'primary', disabled: !conf, 'data-pb': 'create', onclick: () => this.connect({ nickname: name() }) }, '➕ Create a private room'),
      h('div', { class: 'pb-row' }, code, h('button', { class: 'go grow', disabled: !conf, 'data-pb': 'join', onclick: () => { const c = normaliseCode(code.value); if (!isCode(c)) { code.focus(); return this.showStart('Room codes are 5 letters/numbers, like K7PQ2.', true); } this.connect({ code: c, nickname: name() }); } }, 'Join with code')),
      h('div', { class: 'pb-note' }, 'Laptop: WASD move · Shift run · Space jump · mouse aim, click to fire · R reload · Q / wheel / 1–6 switch blaster · right-click zoom · V view · Tab scores · hold T to talk. Phone: joystick, drag to aim, on-screen buttons.'),
      h('button', { 'data-pb': 'back', onclick: () => this.exit() }, '← Back to the title screen'))));
    setTimeout(() => (store.get('pb-nick') ? code : nick).focus(), 50);
  }

  async connect({ code = null, nickname }) {
    if (!this.net.configured) return this.showStart();
    this.mount(h('div', { class: 'pb-screen' }, h('div', { class: 'pb-card narrow pb-stack' }, h('h1', {}, GAME_NAME), this.statusEl = h('div', { class: 'pb-status', 'data-pb': 'status' }, 'Connecting to the game server…'))));
    try {
      await this.net.wake((t) => { if (this.statusEl) this.statusEl.textContent = t; });
    } catch {
      return this.showRetry('The game server is not reachable right now. It may be starting up or offline.', { code, nickname });
    }
    try {
      this.statusEl.textContent = code ? `Joining room ${code}…` : 'Creating your room…';
      const opts = { nickname, look: this.look, loadout: this.loadout };
      const room = code ? await this.net.join(code, opts) : await this.net.create(opts);
      this.attach(room);
    } catch (e) {
      this.showStart(joinError(e), true);
    }
  }

  showRetry(msg, args) {
    this.mount(h('div', { class: 'pb-screen' }, h('div', { class: 'pb-card narrow pb-stack' }, h('h1', {}, GAME_NAME),
      h('div', { class: 'pb-status bad', 'data-pb': 'unreachable' }, msg),
      h('div', { class: 'pb-row' }, h('button', { class: 'primary grow', onclick: () => this.connect(args) }, '↻ Try again'), h('button', { onclick: () => this.showStart() }, 'Back')))));
  }

  // ---------- in a room ----------
  attach(room) {
    this.room = room; this.sig = ''; this.feed = []; this.lastPhase = null;
    history.replaceState(null, '', `${location.pathname}?room=${room.roomId}${new URLSearchParams(location.search).get('pbserver') ? `&pbserver=${encodeURIComponent(new URLSearchParams(location.search).get('pbserver'))}` : ''}`);
    this.view = new MatchView({ scene: this.scene, camera: this.camera, arena: this.arena, player: this.player, room });
    this.voice = new VoiceChat({ room, onFail: (id, msg) => this.note(`🔇 ${msg}`), onChange: () => { this.sig = ''; } });
    room.onMessage('error', (m) => this.note(`⚠️ ${m.message}`));
    room.onMessage('host', (m) => this.note(m.id === room.sessionId ? '👑 You are now the host.' : `👑 ${m.name} is now the host.`));
    room.onMessage('tag', (m) => this.onTag(m));
    room.onMessage('hit', (m) => this.onHit(m));
    room.onMessage('painted', (m) => this.onPainted(m));
    room.onMessage('overtime', () => { this.note('⏱️ Overtime! The first lead change wins.'); sfx.beep(true); });
    room.onMessage('ended', () => { sfx.jingle(true); });
    room.onMessage('closed', (m) => { this.closedReason = m.reason; });
    room.onMessage('rtc', () => {}); // handled by VoiceChat
    room.onDrop(() => this.note('📶 Connection lost: reconnecting…'));
    room.onReconnect(() => this.note('📶 Reconnected.'));
    room.onLeave((code) => this.onLeft(code));
    this.screen = 'lobby';
  }

  onLeft(code) {
    const reason = this.closedReason || (code === 4101 ? 'The host closed the room.' : code === 4102 ? 'The room was idle and has closed.' : code === 1000 || code === 4000 ? '' : 'You were disconnected from the room.');
    this.teardownRoom();
    if (this.exiting) return;
    this.showStart(reason, !!reason);
  }

  teardownRoom() {
    this.voice?.destroy(); this.voice = null;
    this.view?.dispose(); this.view = null;
    this.room = null; this.closedReason = null; this.preview?.dispose(); this.preview = null;
    if (document.pointerLockElement) document.exitPointerLock();
    history.replaceState(null, '', location.pathname + (new URLSearchParams(location.search).get('pbserver') ? `?paintball&pbserver=${encodeURIComponent(new URLSearchParams(location.search).get('pbserver'))}` : ''));
  }

  async leave() { const r = this.room; if (r) { this.exitingRoom = true; await r.leave(true).catch(() => {}); } }

  note(text) {
    this.feed.push({ text, at: performance.now() }); if (this.feed.length > 6) this.feed.shift();
    this.sig = this.screen === 'lobby' ? '' : this.sig;
    if (!this.inMatch) import('../../ui/dom.js').then(({ toast }) => toast(text, 3200));
  }

  onTag(m) {
    const mine = m.by === this.room.sessionId; const me = m.target === this.room.sessionId;
    const assist = m.assists.includes(this.room.sessionId);
    this.feed.push({ text: `${m.precision ? '🎯 ' : '🎨 '}${m.byName || '?'} tagged ${m.targetName}${m.assists.length ? ` (+${m.assists.length} assist${m.assists.length > 1 ? 's' : ''})` : ''}`, at: performance.now(), cls: mine || me ? 'mine' : '' });
    if (this.feed.length > 6) this.feed.shift();
    if (mine) { this.big('TAG! +100', '#7cff4f'); sfx.jingle(true); } else if (assist) this.big('ASSIST +40', '#30d5ff');
    if (me) { this.taggedBy = m.byName; sfx.jingle(false); }
  }
  onHit(m) {
    if (!this.hud) return;
    const el = this.hud.hit; el.textContent = m.protected ? '🛡' : '✕';
    el.className = `hitmark show${m.p ? ' precision' : ''}`; void el.offsetWidth; el.className = `hitmark show${m.p ? ' precision' : ''}`;
    clearTimeout(this.hitT); this.hitT = setTimeout(() => { el.className = 'hitmark'; }, 360);
    sfx.ding(!!m.p);
  }
  onPainted(m) {
    if (!this.hud) return;
    const shooter = this.state.players.get(m.by);
    const col = EQUIPMENT_BY_ID[shooter?.equip]?.colour || '#ff3d7f';
    const x = 10 + Math.random() * 80; const y = 10 + Math.random() * 80;
    this.hud.splatter.style.background = `radial-gradient(circle at ${x}% ${y}%, ${col}cc 0, ${col}66 12%, transparent 30%)`;
    this.hud.splatter.style.transition = 'none'; this.hud.splatter.style.opacity = '1';
    requestAnimationFrame(() => { this.hud.splatter.style.transition = 'opacity 0.9s'; this.hud.splatter.style.opacity = '0'; });
  }
  big(text, colour = '#fff') { this.bigMsg = { text, colour, until: performance.now() + 1100 }; }

  // ---------- lobby ----------
  lobbySig() {
    const s = this.state; const v = this.voice;
    return JSON.stringify([s.phase, s.mode, s.arena, s.duration, s.slotsOpen, [...s.players.entries()].map(([id, p]) => [id, p.nickname, p.ready, p.host, p.team, p.connected, p.character, p.outfit, p.pants, p.mask, p.accessory, p.primary, p.secondary, p.voice, p.talking]), v?.on, v?.openMic, v?.mutedAll, [...(v?.muted || [])], Object.values(v?.debug() || {}).map((d) => d.state), this.voiceErr, this.copied]);
  }

  renderLobby() {
    const s = this.state; const me = this.me; if (!me) return;
    const myId = this.room.sessionId; const host = me.host; const mode = MODES_BY_ID[s.mode];
    const ps = [...s.players.entries()];
    const check = this.startCheck();
    const sel = (opts, value, onchange, label) => h('select', { disabled: !host, 'aria-label': label, onchange: (e) => onchange(e.target.value) }, ...opts.map(([v, t]) => { const o = h('option', { value: v }, t); if (String(v) === String(value)) o.selected = true; return o; }));
    const durations = [...TIMING.durations, ...(s.testMode ? [s.duration].filter((d) => !TIMING.durations.includes(d)) : [])];
    const playerRow = ([id, p]) => h('div', { class: `pb-player${id === myId ? ' me' : ''}`, style: `--team:${mode.teams ? teamColour(p.team) : p.mask}`, 'data-pb-player': p.nickname },
      h('span', { class: `pb-speak${p.talking ? ' on' : ''}`, title: p.voice ? 'voice on' : 'voice off' }, p.voice ? '🔊' : '·'),
      h('span', { class: 'name' }, p.nickname, id === myId ? ' (you)' : ''),
      p.host && h('span', { class: 'pb-badge host' }, 'HOST'),
      !p.connected && h('span', { class: 'pb-badge off' }, 'reconnecting'),
      mode.teams > 0 && h('span', { class: 'pb-badge' }, teamName(p.team)),
      h('span', { class: `pb-badge${p.ready ? ' ready' : ''}` }, p.ready ? 'READY' : 'not ready'),
      this.voice?.on && id !== myId && p.voice && h('button', { class: 'small', title: 'Mute this player', onclick: () => this.voice.mutePeer(id, !this.voice.muted.has(id)) }, this.voice.muted.has(id) ? '🔇' : '🔈'));
    const slots = Math.max(0, Math.min(MAX_PLAYERS, mode.players[1]) - ps.length);
    const voiceState = this.voice?.debug() || {};
    const left = h('div', { class: 'pb-stack' },
      h('div', {}, h('h1', {}, GAME_NAME), h('div', { class: 'pb-sub' }, `🎯 Paintball match lobby · ${modeLabel(mode, ps.length)} · ${ARENAS_BY_ID[s.arena]?.name}`)),
      h('div', { class: 'pb-row' },
        h('div', { class: 'grow' }, h('div', { class: 'pb-note' }, 'ROOM CODE'), h('div', { class: 'pb-code', 'data-pb': 'code' }, s.code || this.room.roomId)),
        h('button', { class: 'small', 'data-pb': 'copy-code', onclick: async () => { this.copied = (await copyText(this.room.roomId)) ? 'code' : 'fail'; this.sig = ''; } }, this.copied === 'code' ? '✓ Copied' : '📋 Copy code'),
        h('button', { class: 'small', 'data-pb': 'copy-link', onclick: async () => { this.copied = (await copyText(`Join my ${GAME_NAME} paintball room: ${shareLink(this.room.roomId)}`)) ? 'link' : 'fail'; this.sig = ''; } }, this.copied === 'link' ? '✓ Link copied' : '🔗 Share link')),
      this.copied === 'fail' && h('div', { class: 'pb-note' }, `Share this link: ${shareLink(this.room.roomId)}`),
      h('h3', {}, `Players ${ps.length}/${Math.min(MAX_PLAYERS, mode.players[1])}`),
      h('div', { class: 'pb-players', 'data-pb': 'players' }, ...ps.map(playerRow), ...Array.from({ length: Math.min(slots, 4) }, () => h('div', { class: 'pb-slot' }, 'Open slot · share the code')), slots > 4 && h('div', { class: 'pb-note' }, `+${slots - 4} more open slots`)),
      mode.teams > 0 && h('div', { class: 'pb-teams' }, ...Array.from({ length: mode.teams }, (_, t) => h('div', { class: 'pb-team', style: `--team:${TEAMS[t].colour}` }, h('b', {}, `Team ${TEAMS[t].name}`), h('div', { class: 'pb-note' }, ps.filter(([, p]) => p.team === t).map(([, p]) => p.nickname).join(', ') || 'empty')))),
      h('h3', {}, 'Paintball match'),
      h('div', { class: 'pb-row' },
        sel(MODES.map((m) => [m.id, m.id === 'ffa' ? 'Individual (Duel / Free-for-All)' : `${m.name} · teams of ${m.size}`]), s.mode, (v) => this.room.send('config', { mode: v }), 'Mode'),
        sel(ARENAS.map((a) => [a.id, a.name]), s.arena, (v) => this.room.send('config', { arena: v }), 'Arena'),
        sel(durations.map((d) => [d, d >= 60 ? `${d / 60} min` : `${d} s (test)`]), s.duration, (v) => this.room.send('config', { duration: Number(v) }), 'Duration'),
        host && mode.teams > 0 && h('button', { class: 'small', 'data-pb': 'randomise', onclick: () => this.room.send('randomise', {}) }, '🎲 Re-randomise teams')),
      !host && h('div', { class: 'pb-note' }, 'The host picks the mode, arena and length.'),
      h('h3', {}, 'Voice chat'),
      h('div', { class: 'pb-row' },
        h('button', { class: `small${this.voice?.on ? ' on' : ''}`, 'data-pb': 'voice', onclick: () => this.toggleVoice() }, this.voice?.on ? '🎤 Voice on' : '🎤 Switch voice on'),
        this.voice?.on && h('button', { class: `small${this.voice.openMic ? ' on' : ''}`, onclick: () => this.voice.setOpenMic(!this.voice.openMic) }, this.voice.openMic ? 'Open mic' : 'Push-to-talk (hold T)'),
        this.voice?.on && h('button', { class: `small${this.voice.mutedAll ? ' on' : ''}`, onclick: () => this.voice.muteAll(!this.voice.mutedAll) }, this.voice.mutedAll ? '🔇 Everyone muted' : '🔈 Mute all')),
      h('div', { class: 'pb-note' }, this.voiceErr || (this.voice?.on ? `Lobby: everyone hears you. In a team paintball match: only your team. Connected: ${Object.values(voiceState).filter((d) => d.state === 'connected').length}/${Object.keys(voiceState).length}` : 'Peer-to-peer audio; the server only passes the connection details and never hears or stores it.')),
      h('div', { class: 'pb-row' },
        h('button', { class: me.ready ? 'on grow' : 'go grow', 'data-pb': 'ready', onclick: () => this.room.send('ready', { ready: !me.ready }) }, me.ready ? '✓ Ready (click to undo)' : '✋ I’m ready'),
        host && h('button', { class: 'primary grow', 'data-pb': 'start', disabled: !check.ok, title: check.reason || '', onclick: () => this.room.send('start', {}) }, '▶ Start the paintball match'),
        h('button', { 'data-pb': 'leave', onclick: () => this.leave() }, 'Leave')),
      host && !check.ok && h('div', { class: 'pb-note', 'data-pb': 'start-reason' }, check.reason));
    const right = h('div', { class: 'pb-stack' }, this.customiser(me), this.equipmentPicker(me));
    this.mount(h('div', { class: 'pb-screen see-through' }, h('div', { class: 'pb-card' }, h('div', { class: 'pb-grid' }, left, right))));
  }

  startCheck() {
    const s = this.state; const mode = MODES_BY_ID[s.mode]; const ps = [...s.players.values()];
    if (ps.length < mode.players[0]) return { ok: false, reason: mode.teams ? `${mode.name} needs exactly ${mode.players[0]} players (${ps.length} here).` : 'A paintball match needs at least 2 players.' };
    if (ps.length > mode.players[1]) return { ok: false, reason: `${mode.name} takes at most ${mode.players[1]} players.` };
    const waiting = ps.filter((p) => !p.ready).length;
    if (waiting) return { ok: false, reason: `Waiting for ${waiting} player${waiting > 1 ? 's' : ''} to get ready.` };
    return { ok: true };
  }

  customiser(me) {
    const send = (patch) => { Object.assign(this.look, patch); this.room.send('custom', { ...this.look }); this.sig = ''; };
    this.look = { character: me.character, outfit: me.outfit, pants: me.pants, mask: me.mask, accessory: me.accessory };
    const sw = (list, key) => h('div', { class: 'pb-swatches' }, ...list.map((c) => h('button', { class: `pb-swatch${this.look[key] === c ? ' sel' : ''}`, style: `background:${c}`, 'aria-label': `${key} ${c}`, onclick: () => send({ [key]: c }) })));
    if (!this.preview) this.preview = new Preview();
    this.preview.set({ ...this.look, nickname: me.nickname, equip: me.primary });
    const nick = h('input', { type: 'text', maxlength: 16, value: me.nickname, 'aria-label': 'Nickname', onchange: (e) => { store.set('pb-nick', e.target.value); this.room.send('nick', { nickname: e.target.value }); } });
    return h('div', { class: 'pb-stack', 'data-pb': 'customise' },
      h('h3', {}, 'Your character'),
      this.preview.canvas,
      nick,
      h('div', { class: 'pb-row' }, ...CHARACTERS.map((c, i) => h('button', { class: `small${this.look.character === i ? ' on' : ''}`, onclick: () => send({ character: i }) }, c.name))),
      h('div', { class: 'pb-note' }, 'Outfit'), sw(OUTFIT_COLOURS, 'outfit'),
      h('div', { class: 'pb-note' }, 'Trousers'), sw(PANTS_COLOURS, 'pants'),
      h('div', { class: 'pb-note' }, 'Paintball mask (your team colour shows in team matches)'), sw(MASK_COLOURS, 'mask'),
      h('div', { class: 'pb-row' }, ...ACCESSORIES.map((a) => h('button', { class: `small${this.look.accessory === a.id ? ' on' : ''}`, onclick: () => send({ accessory: a.id }) }, a.name))));
  }

  equipmentPicker(me) {
    const chosen = [me.primary, me.secondary];
    const pick = (id) => {
      let next;
      if (chosen.includes(id)) return; // keep two: picking a third replaces the older choice
      next = [chosen[1], id];
      this.loadout = next;
      this.room.send('loadout', { primary: next[0], secondary: next[1] });
    };
    return h('div', { class: 'pb-stack', 'data-pb': 'equipment' },
      h('h3', {}, 'Paintball equipment · pick 2 of 6'),
      h('div', { class: 'pb-equip' }, ...EQUIPMENT_LIST.map((e) => h('button', { class: `pb-eq${chosen.includes(e.id) ? ' sel' : ''}`, 'data-pb-eq': e.id, onclick: () => pick(e.id) },
        chosen.includes(e.id) && h('span', { class: 'slot' }, chosen[0] === e.id ? 'PRIMARY' : 'SECONDARY'),
        h('b', {}, h('span', { class: 'dot', style: `background:${e.colour}` }), e.short), h('span', { class: 'pb-note' }, BLURB[e.id]), statBars(e)))));
  }

  async toggleVoice() {
    if (!this.voice) return;
    if (this.voice.on) { this.voice.disable(); return; }
    this.voiceErr = '';
    try { await this.voice.enable(); this.voice.sync(this.state, this.room.sessionId); } catch (e) { this.voiceErr = e.message; this.note(`🎤 ${e.message}`); }
    this.sig = '';
  }

  // ---------- match HUD ----------
  buildHud() {
    const q = (cls, tag = 'div') => h(tag, { class: cls });
    const hud = {
      root: h('div', { id: 'pb-hud' }), timer: q('timer'), teams: q('teamscores'), my: q('myscore'), feed: q('feed'), meter: h('i'), paintLabel: q('label'),
      name: q('name'), count: q('count'), other: q('other'), reload: h('i'), reloadBox: q('reload'), cross: q('cross'), hit: q('hitmark'), big: q('big'), msg: q('center-msg'),
      splatter: q('splatter'), map: h('canvas', { class: 'minimap', width: 160, height: 92 }), voice: q('voice'), hint: q('hint'), board: h('div', { id: 'pb-board', class: 'hidden' }),
    };
    hud.reloadBox.append(hud.reload);
    hud.root.append(hud.splatter, h('div', { class: 'top' }, hud.teams, hud.timer), hud.my, hud.feed, hud.map, hud.voice,
      h('div', { class: 'paint' }, hud.paintLabel, h('div', { class: 'meter' }, hud.meter)),
      h('div', { class: 'ammo' }, hud.name, hud.count, hud.reloadBox, hud.other), hud.cross, hud.hit, hud.big, hud.msg, hud.hint, hud.board);
    hud.hint.textContent = 'Click to aim · WASD move · Shift run · R reload · Q switch · V view · Tab scores · hold T to talk';
    this.hud = hud;
    const t = this.touchButtons();
    this.mount(hud.root, t);
  }

  touchButtons() {
    if (!this.touch.on) return null;
    const box = h('div', { id: 'pb-touch' });
    const hold = (cls, label, down, up) => { const b = h('button', { class: `tbtn ${cls}`, 'aria-label': cls }, label); b.addEventListener('pointerdown', (e) => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch { /* synthetic or ended pointer */ } b.classList.add('down'); down(); }); const u = () => { b.classList.remove('down'); up(); }; b.addEventListener('pointerup', u); b.addEventListener('pointercancel', u); return b; };
    const tap = (cls, label, fn) => h('button', { class: `tbtn ${cls}`, 'aria-label': cls, onclick: fn }, label);
    // drag on the fire button to aim while firing
    const fire = hold('p-fire', '🎯', () => { this.view.fireHeld = true; }, () => { this.view.fireHeld = false; });
    let last = null;
    fire.addEventListener('pointermove', (e) => { if (last) { const k = 0.0055 * this.player.sensitivity; this.player.yaw -= (e.clientX - last.x) * k; this.player.pitch = Math.max(-1.45, Math.min(1.45, this.player.pitch - (e.clientY - last.y) * k)); } last = { x: e.clientX, y: e.clientY }; });
    fire.addEventListener('pointerup', () => { last = null; });
    box.append(fire,
      hold('p-jump', '⤒', () => this.player.keys.add('Space'), () => this.player.keys.delete('Space')),
      tap('p-reload', '⟳', () => { this.view.reloadPressed = true; }),
      tap('p-switch', '⇄', () => this.switchSlot()),
      hold('p-zoom', '🔍', () => { this.view.zoom = true; }, () => { this.view.zoom = false; }),
      tap('p-view', '👁', () => this.toggleView()),
      hold('p-mic', '🎤', () => this.ptt(true), () => this.ptt(false)),
      hold('p-board', '📋', () => { this.board = true; }, () => { this.board = false; }),
      tap('p-menu', '☰', () => this.menu()));
    return box;
  }

  updateHud(nowMs) {
    const s = this.state; const me = this.me; const hud = this.hud; if (!me || !hud) return;
    const mode = MODES_BY_ID[s.mode];
    const left = s.phaseEnds - s.now;
    hud.timer.textContent = s.phase === 'countdown' ? 'GET READY' : `${s.phase === 'overtime' ? 'OT ' : ''}${fmtTime(left)}`;
    hud.timer.className = `timer${s.phase === 'overtime' ? ' ot' : ''}`;
    hud.teams.replaceChildren(...(mode.teams ? [...s.teamScores].map((v, t) => h('span', { class: 'tscore', style: `--team:${TEAMS[t].colour}` }, `${TEAMS[t].name} ${v}`)) : []));
    hud.my.textContent = `⭐ ${me.score}  ·  🎨 ${me.tags} tags  ·  🤝 ${me.assists}`;
    hud.feed.replaceChildren(...this.feed.filter((f) => nowMs - f.at < 6000).map((f) => h('div', {}, f.text)));
    hud.meter.style.width = `${(me.paint / PAINT_MAX) * 100}%`;
    hud.paintLabel.textContent = `Paint ${Math.round(me.paint)} / ${PAINT_MAX}`;
    const e = EQUIPMENT_BY_ID[me.equip]; const o = EQUIPMENT_BY_ID[me.slot ? me.primary : me.secondary];
    hud.name.textContent = `${e.name}`;
    hud.name.style.color = e.colour;
    const H = me.slot ? me.hopper1 : me.hopper0; const C = me.slot ? me.carried1 : me.carried0;
    hud.count.replaceChildren(String(H), h('small', {}, ` / ${C} paintballs remaining`));
    const reloading = me.reloadUntil > s.now;
    hud.reloadBox.style.visibility = reloading || me.switchUntil > s.now ? 'visible' : 'hidden';
    hud.reload.style.width = reloading ? `${100 * (1 - (me.reloadUntil - s.now) / e.reload)}%` : me.switchUntil > s.now ? `${100 * (1 - (me.switchUntil - s.now) / e.cooldown)}%` : '0%';
    hud.other.textContent = `${reloading ? 'Reloading… · ' : H === 0 ? 'Empty: press R · ' : ''}Q: ${o.short} (${me.slot ? me.hopper0 : me.hopper1})`;
    let big = '';
    if (s.phase === 'countdown') big = String(Math.max(1, Math.ceil(left)));
    else if (this.bigMsg && nowMs < this.bigMsg.until) { big = this.bigMsg.text; hud.big.style.color = this.bigMsg.colour; }
    if (s.phase === 'countdown') hud.big.style.color = '#ffd23d';
    hud.big.textContent = big;
    let msg = '';
    if (!me.alive && ACTIVE.has(s.phase)) msg = `Round elimination${this.taggedBy ? `: tagged by ${this.taggedBy}` : ''} · back in ${Math.max(0, Math.ceil(me.respawnAt - s.now))}`;
    else if (me.protectedUntil > s.now && s.phase !== 'countdown') msg = '🛡 Spawn protection: you cannot be painted or fire yet';
    else if (!this.touch.on && document.pointerLockElement !== this.canvas) msg = 'Click to play';
    hud.msg.textContent = msg; hud.msg.style.display = msg ? '' : 'none';
    hud.root.classList.toggle('zoom', !!(this.view.zoom && e.zoom));
    // voice
    const talkers = [...s.players.entries()].filter(([id, p]) => p.talking && id !== this.room.sessionId && this.voice?.peers.has(id)).map(([, p]) => p.nickname);
    hud.voice.replaceChildren(
      h('div', { class: `me${this.voice?.transmitting ? ' live' : ''}` }, this.voice?.on ? (this.voice.transmitting ? '🎤 Talking' : this.voice.openMic ? '🎤 Open mic' : '🎤 Hold T to talk') : '🎤 Voice off'),
      ...talkers.map((n) => h('div', { class: 'me' }, `🔊 ${n}`)));
    hud.board.classList.toggle('hidden', !this.board);
    if (this.board) hud.board.replaceChildren(this.scoreTable(false));
    this.drawMap();
  }

  scoreTable(results) {
    const s = this.state; const mode = MODES_BY_ID[s.mode]; const myId = this.room.sessionId;
    const rows = results ? [...s.results.rankings].map((r) => [r.id, r]) : [...s.players.entries()].sort((a, b) => b[1].score - a[1].score);
    return h('table', { class: 'pb-table', 'data-pb': 'scoreboard' },
      h('tr', {}, h('th', {}, '#'), h('th', {}, 'Player'), mode.teams > 0 && h('th', {}, 'Team'), h('th', {}, 'Score'), h('th', {}, 'Tags'), h('th', {}, 'Assists'), h('th', {}, 'Times tagged'), h('th', {}, '')),
      ...rows.map(([id, r], i) => {
        const p = s.players.get(id);
        return h('tr', { class: id === myId ? 'me' : '' }, h('td', {}, String(r.place || i + 1)),
          h('td', {}, h('span', { class: 'tdot', style: `background:${mode.teams ? teamColour(r.team) : p?.mask || '#888'}` }), r.nickname, p?.host ? ' 👑' : ''),
          mode.teams > 0 && h('td', {}, teamName(r.team)), h('td', { class: 'n' }, String(r.score)), h('td', { class: 'n' }, String(r.tags)), h('td', { class: 'n' }, String(r.assists)), h('td', { class: 'n' }, String(r.timesTagged)),
          h('td', {}, p?.talking ? '🔊' : ''));
      }));
  }

  drawMap() {
    const cv = this.hud.map; const g = cv.getContext('2d'); const a = this.arena; const b = a.bounds;
    const W = cv.width; const H = cv.height; const sx = W / (b.maxX - b.minX); const sz = H / (b.maxZ - b.minZ);
    const X = (x) => (x - b.minX) * sx; const Z = (z) => (z - b.minZ) * sz;
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,0.55)';
    for (const s of a.solids) {
      if (s.kind === 'cyl') { g.beginPath(); g.arc(X(s.x), Z(s.z), Math.max(1.5, s.r * sx), 0, Math.PI * 2); g.fill(); } else g.fillRect(X(s.minX), Z(s.minZ), Math.max(1.5, (s.maxX - s.minX) * sx), Math.max(1.5, (s.maxZ - s.minZ) * sz));
    }
    const s = this.state; const me = this.me; const teams = MODES_BY_ID[s.mode].teams;
    for (const [id, p] of s.players) {
      if (!p.alive || id === this.room.sessionId) continue;
      const friend = teams && p.team === me.team;
      if (!friend) continue; // opponents stay off the mini-map
      g.fillStyle = teamColour(p.team); g.beginPath(); g.arc(X(p.x), Z(p.z), 3, 0, Math.PI * 2); g.fill();
    }
    if (me.alive) {
      const v = this.view.pos; const yaw = this.player.yaw;
      g.save(); g.translate(X(v.x), Z(v.z)); g.rotate(-yaw); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -6); g.lineTo(4, 4); g.lineTo(-4, 4); g.closePath(); g.fill(); g.restore();
    }
  }

  // ---------- results ----------
  renderResults() {
    const s = this.state; const R = s.results; const me = this.me; const mode = MODES_BY_ID[s.mode];
    const host = me?.host;
    const iWon = !R.draw && ((mode.teams > 0 && R.teams.length && R.teams[0].team === me.team) || (!mode.teams > 0 && R.rankings[0]?.id === this.room.sessionId));
    this.mount(h('div', { class: 'pb-screen see-through', 'data-pb': 'results' }, confetti(), h('div', { class: 'pb-card pb-stack' },
      h('h1', {}, `${GAME_NAME} · results`),
      h('div', { class: 'pb-winner' }, R.draw ? '🤝 Draw!' : `🏆 ${R.winner} wins!`),
      iWon && h('div', { class: 'pb-sub' }, 'That’s you! 🎉'),
      h('div', { class: 'pb-podium' },
        h('div', {}, h('span', { class: 'pb-note' }, 'WINNER'), h('b', {}, R.draw ? '—' : R.winner)),
        h('div', {}, h('span', { class: 'pb-note' }, 'RUNNER-UP'), h('b', {}, R.runnerUp || '—')),
        h('div', {}, h('span', { class: 'pb-note' }, 'MVP'), h('b', {}, `⭐ ${R.mvpName || '—'}`))),
      mode.teams > 0 && h('div', { class: 'pb-teams' }, ...[...R.teams].map((t) => h('div', { class: 'pb-team', style: `--team:${t.colour}` }, h('b', {}, `#${t.place} ${t.name}`), h('div', {}, `${t.score} points · ${t.tags} tags`)))),
      this.scoreTable(true),
      h('div', { class: 'pb-note' }, `Paintball equipment used: ${me?.used ? me.used.split(',').map((id) => EQUIPMENT_BY_ID[id]?.short).join(', ') : 'none'}. Results stay in this room until it closes; nothing is saved anywhere.`),
      h('div', { class: 'pb-row' },
        host && h('button', { class: 'primary grow', 'data-pb': 'rematch', onclick: () => this.room.send('rematch', {}) }, '🔁 Play again'),
        host && h('button', { class: 'grow', 'data-pb': 'to-lobby', onclick: () => this.room.send('lobby', {}) }, 'Return to lobby'),
        host && h('button', { 'data-pb': 'close', onclick: () => this.room.send('close', {}) }, 'Close room'),
        !host && h('div', { class: 'pb-note grow' }, 'Waiting for the host: play again or return to the lobby.'),
        h('button', { 'data-pb': 'leave', onclick: () => this.leave() }, 'Leave')))));
  }

  // ---------- input ----------
  bindInput() {
    const L = []; const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); L.push([t, ev, fn, o]); };
    on(this.canvas, 'click', () => { if (this.inMatch && !this.touch.on && document.pointerLockElement !== this.canvas) lockPointer(this.canvas); sfx.unlockAudio(); });
    on(this.canvas, 'contextmenu', (e) => e.preventDefault());
    on(document, 'mousedown', (e) => {
      if (!this.inMatch || document.pointerLockElement !== this.canvas || !this.view) return;
      if (e.button === 0) this.view.fireHeld = true; else if (e.button === 2) this.view.zoom = true;
    });
    on(document, 'mouseup', (e) => { if (!this.view) return; if (e.button === 0) this.view.fireHeld = false; else if (e.button === 2) this.view.zoom = false; });
    on(document, 'wheel', (e) => { if (this.inMatch && document.pointerLockElement === this.canvas && Math.abs(e.deltaY) > 4) this.switchSlot(); }, { passive: true });
    on(document, 'keyup', (e) => {
      if (e.code === 'KeyT') this.ptt(false);
      if (e.code === 'Tab') this.board = false;
    });
    on(document, 'pointerlockchange', () => { if (document.pointerLockElement !== this.canvas && this.view) { this.view.fireHeld = false; this.view.zoom = false; } });
    on(window, 'blur', () => { if (this.view) { this.view.fireHeld = false; this.view.zoom = false; } this.ptt(false); });
    this.unbind = () => { for (const [t, ev, fn, o] of L) t.removeEventListener(ev, fn, o); };
  }

  // keydown, dispatched from main.js while this mode is active
  key(e) {
    if (typing(e)) return;
    if (e.code === 'KeyT' && !e.repeat) { this.ptt(true); return; }
    if (!this.inMatch || !this.view) return;
    if (e.code === 'Tab') { e.preventDefault(); this.board = true; return; }
    if (e.code === 'KeyR') this.view.reloadPressed = true;
    else if (e.code === 'KeyQ') this.switchSlot();
    else if (e.code === 'KeyV') this.toggleView();
    else if (e.code === 'Escape') this.menu();
    else if (/^Digit[1-6]$/.test(e.code)) {
      const k = e.code.slice(5); const me = this.me;
      if (EQUIPMENT_BY_ID[me.primary].key === k) this.view.slot = 0;
      else if (EQUIPMENT_BY_ID[me.secondary].key === k) this.view.slot = 1;
      else if (k === '1' || k === '2') this.view.slot = Number(k) - 1;
    }
  }
  switchSlot() { if (this.view) this.view.slot = this.view.slot ? 0 : 1; }
  toggleView() { if (this.view) this.view.view = this.view.view === 'first' ? 'third' : 'first'; }
  ptt(down) { if (this.voice?.on) this.voice.setPTT(down); }
  menu() {
    if (document.pointerLockElement) document.exitPointerLock();
    import('../../ui/dom.js').then(({ openPanel }) => {
      const close = openPanel(h('div', { class: 'pb-stack' },
        h('p', {}, 'The paintball match keeps going while this is open.'),
        h('button', { class: 'primary', onclick: () => { close(); if (!this.touch.on) lockPointer(this.canvas); } }, 'Back to the match'),
        h('button', { onclick: () => { this.toggleView(); close(); } }, `Switch to ${this.viewName === 'first' ? 'third' : 'first'}-person view (V)`),
        this.voice && h('button', { onclick: () => { close(); this.toggleVoice(); } }, this.voice.on ? 'Switch voice off' : 'Switch voice on'),
        h('button', { class: 'danger', onclick: () => { close(); this.leave(); } }, 'Leave the paintball match')), { title: '🎯 Paintball match', closable: true });
    });
  }

  // ---------- per frame ----------
  update(dt) {
    const now = performance.now();
    const s = this.state;
    this.player.enabled = this.inMatch && (document.pointerLockElement === this.canvas || this.touch.on);
    if (!s || !this.room) {
      this.orbitCam(dt);
      return;
    }
    if (s.arena !== this.arena.id) { this.setArena(s.arena); if (this.view) this.view.arena = this.arena; }
    const phase = s.phase;
    if (phase !== this.lastPhase) this.phaseChanged(this.lastPhase, phase);
    this.lastPhase = phase;
    this.voice?.tick();
    if (this.voice?.on && now - (this.voiceSync || 0) > 300) { this.voiceSync = now; this.voice.sync(s, this.room.sessionId); }
    const me = this.me;
    if (me && this.wasAlive === false && me.alive) { this.player.yaw = me.yaw; this.player.pitch = 0; this.taggedBy = null; }
    this.wasAlive = me?.alive;
    if (ACTIVE.has(phase)) {
      this.view.update(dt, s, this.player.keys, now);
      if (now - (this.hudAt || 0) > 90) { this.hudAt = now; this.updateHud(now); }
      if (phase === 'countdown') { const n = Math.ceil(s.phaseEnds - s.now); if (n !== this.lastCount && n > 0) { this.lastCount = n; sfx.beep(false); } }
    } else {
      this.orbitCam(dt);
      if (phase === 'lobby') {
        const sig = `L${this.lobbySig()}`;
        if (sig !== this.sig) { this.sig = sig; this.renderLobby(); }
        this.preview?.render(dt);
      } else if (phase === 'results') {
        const R = s.results;
        const sig = `R${JSON.stringify([me?.host, R.ready, R.rankings.length, s.players.size, R.winner])}`;
        if (sig !== this.sig) { this.sig = sig; this.screen = 'results'; this.renderResults(); }
      }
      this.view?.avatarsUpdate(dt, s, now);
      this.view?.fxUpdate(dt);
    }
  }

  phaseChanged(from, to) {
    if (ACTIVE.has(to) && !ACTIVE.has(from)) {
      this.screen = 'match'; this.sig = ''; this.feed = []; this.view.placed = false; this.view.pending = []; this.view.clearSplats();
      this.preview?.dispose(); this.preview = null;
      this.buildHud();
      if (!this.touch.on) lockPointer(this.canvas);
      import('../../ui/dom.js').then(({ closeAll }) => closeAll());
    }
    if (to === 'playing' && from === 'countdown') { this.big('GO!', '#7cff4f'); sfx.beep(true); }
    if (to === 'results') { this.hud = null; this.board = false; if (document.pointerLockElement) document.exitPointerLock(); this.sig = ''; }
    if (to === 'lobby') { this.hud = null; this.screen = 'lobby'; this.sig = ''; this.view?.clearSplats(); }
  }

  orbitCam(dt) {
    this.orbit += dt * 0.06;
    const c = this.arena.centre;
    this.camera.position.set(c.x + Math.cos(this.orbit) * 46, 20, c.z + Math.sin(this.orbit) * 34);
    this.camera.lookAt(c.x, 0, c.z);
  }

  mount(...els) { this.root.replaceChildren(...els.filter(Boolean)); }

  async exit() {
    this.exiting = true;
    await this.leave();
    this.teardownRoom();
    this.unbind?.();
    for (const g of this.arenaGroups.values()) this.scene.remove(g);
    this.root.remove();
    document.body.classList.remove('pb-mode');
    this.player.enabled = false; this.player.keys.clear();
    if (globalThis.__pb === this) globalThis.__pb = null;
    this.onExit();
  }
}

// The lobby's live 3D preview of your character (its own small renderer).
class Preview {
  constructor() {
    this.canvas = h('canvas', { class: 'pb-preview', width: 360, height: 276, 'data-pb': 'preview' });
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#445566', 1.6));
    const sun = new THREE.DirectionalLight('#ffffff', 1.8); sun.position.set(2, 4, 3); this.scene.add(sun);
    this.camera = new THREE.PerspectiveCamera(30, 360 / 276, 0.1, 20);
    this.camera.position.set(0, 1.25, 4.3); this.camera.lookAt(0, 0.95, 0);
    this.key = ''; this.t = 0;
  }
  set(look) {
    const key = JSON.stringify(look);
    if (key === this.key) return;
    this.key = key;
    if (this.npc) disposeAvatar(this.npc);
    this.npc = makeAvatar(this.scene, look, { id: 'preview', showName: false });
    this.npc.pbPreview = true;
  }
  render(dt) {
    if (!this.npc) return;
    this.t += dt;
    this.npc.group.rotation.y = Math.sin(this.t * 0.6) * 0.9;
    this.npc.animate(dt, false, 0);
    poseAim(this.npc, -0.1);
    this.npc.detailed = false; this.npc.face.visible = true; this.npc.trim.visible = true; // close-up: always show the face
    this.renderer.render(this.scene, this.camera);
  }
  dispose() { if (this.npc) disposeAvatar(this.npc); this.renderer.dispose(); this.renderer.forceContextLoss?.(); }
}
