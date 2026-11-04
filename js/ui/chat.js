import { h, openPanel, topPanel, toast } from './dom.js';
import { reply, newConvo } from '../core/chat.js';
import { adjustFriend } from '../core/state.js';
import { friendTier } from './dialogue.js';

let llmAvailable = null;
export async function detectLLM() {
  try {
    const r = await fetch('/api/health', { cache: 'no-store' });
    llmAvailable = r.ok && !!(await r.json()).llm;
  } catch {
    llmAvailable = false;
  }
  return llmAvailable;
}
export const llmStatus = () => llmAvailable;

function dayKey(state) {
  return `${state.classNum}-${state.years[state.classNum]?.attempts || 1}`;
}

// Friendship changes with a daily cap on gains, so spamming compliments doesn't max out a friendship.
function gainFriend(state, id, amount, memory) {
  const f = state.friends[id];
  if (!f) return;
  if (f.lastTalkDay !== dayKey(state)) {
    f.lastTalkDay = dayKey(state);
    f.talksToday = 0;
  }
  const before = friendTier(f.level);
  let delta = amount;
  if (amount > 0) {
    const room = Math.max(0, 12 - f.talksToday);
    delta = Math.min(amount, room);
    f.talksToday += delta;
  }
  adjustFriend(state, id, delta, memory);
  const after = friendTier(f.level);
  if (before !== after) toast(`${delta < 0 ? 'Friendship fell' : 'Friendship grew'}: now ${after}`);
}

async function askLLM(payload) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch('/api/npc-chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctrl.signal,
    });
    if (!r.ok) return null;
    const j = await r.json();
    return typeof j.text === 'string' && j.text.trim() ? j.text.trim() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// who: { id, name, kind, npc, staffRole, friendId, subtitle, persona, context: () => object, onAction(action) }
export function openChat(ctx, who, { firstText = null } = {}) {
  const state = ctx.state;
  const voice = ctx.voice;
  let turn = 0;
  let pending = null;
  let helpTopic = null;
  let openerLesson = null;
  const convo = newConvo();
  let closed = false;
  const history = [];
  const log = h('div', { class: 'chat-log' });
  const chips = h('div', { class: 'chips chat-chips' });
  const input = h('input', { type: 'text', class: 'chat-input', placeholder: 'Say something (🎤) or type here…', maxlength: '200' });
  const micBtn = h('button', { class: 'mic-btn', type: 'button', onclick: () => listen() }, '🎤');
  const sendBtn = h('button', { class: 'primary', type: 'button', onclick: () => { if (input.value.trim()) send(input.value.trim()); } }, 'Send');
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter' && input.value.trim()) send(input.value.trim());
    if (e.key === 'Escape') close();
  });

  const title = () => {
    if (who.friendId) {
      const f = state.friends[who.friendId];
      return `${who.name} · ${friendTier(f.level)} (${f.level}/100)${who.subtitle ? ` · ${who.subtitle}` : ''}`;
    }
    return `${who.name}${who.subtitle ? ` · ${who.subtitle}` : ''}`;
  };

  const bubble = (from, text) => {
    const b = h('div', { class: `bubble ${from}` }, h('div', { class: 'who' }, from === 'me' ? 'Mirnal' : who.name), h('div', {}, text));
    log.append(b);
    log.scrollTop = log.scrollHeight;
    return b;
  };

  const setChips = (list) => {
    chips.replaceChildren(...list.map((s) => h('button', { class: 'chip-say', type: 'button', onclick: () => send(s) }, s)));
  };

  const listen = () => {
    if (closed) return;
    micBtn.classList.add('live');
    voice.listen((text) => {
      micBtn.classList.remove('live');
      if (!closed) send(text);
    }, (err) => {
      micBtn.classList.remove('live');
      if (!/didn’t hear/.test(err)) toast(err);
    });
  };

  const autoListen = () => {
    if (closed || !(voice.mock || (voice.supported && !voice.blocked))) return;
    setTimeout(listen, 250);
  };

  const npcSays = (text, end = false) => {
    bubble('npc', text);
    history.push({ role: 'npc', text });
    voice.speak(text, () => { if (end) close(); else autoListen(); });
    if (!state.settings.tts || !window.speechSynthesis) {
      if (end) setTimeout(close, 1500);
      else autoListen();
    }
  };

  async function send(text) {
    if (closed) return;
    voice.stop();
    input.value = '';
    bubble('me', text);
    history.push({ role: 'me', text });
    const base = { ...who.context(), kind: who.kind, npc: who.npc, staffRole: who.staffRole, pending, turn, seed: who.seed || 0, convo, openerLesson };
    if (helpTopic) {
      base.helpTopicName = helpTopic.name;
      base.helpTopicLine = helpTopic.line;
    }
    const local = reply(text, base);
    turn += 1;
    pending = local.pending;
    if (local.helpTopic) helpTopic = local.helpTopic;
    if (local.openerLesson) openerLesson = local.openerLesson;
    const fx = local.effects;
    if (who.friendId && (fx.friend || fx.memory)) gainFriend(state, who.friendId, fx.friend, fx.memory);
    if (fx.rep) state.reputation += fx.rep;
    if (fx.fact) state.playerFacts = { ...(state.playerFacts || {}), ...fx.fact };
    if (fx.action === 'helped') {
      state.stats.classmatesHelped += 1;
      state.day.optional.helped = true;
    }
    state.stats.chatTurns = (state.stats.chatTurns || 0) + 1;
    const typing = bubble('npc typing', '…');
    let line = local.text;
    if (llmAvailable) {
      const better = await askLLM({
        persona: who.persona,
        name: who.name,
        facts: base.facts || [],
        history: history.slice(-9, -1),
        text,
        intent: local.intent,
        draft: local.text,
      });
      if (better) line = better;
    }
    else await new Promise((r) => setTimeout(r, voice.mock ? 0 : Math.min(1500, 380 + line.length * 14)));
    typing.remove();
    if (closed) return;
    title && (panelHead.textContent = title());
    setChips(local.suggestions);
    npcSays(line, local.end);
    if (fx.action && fx.action !== 'helped') who.onAction?.(fx.action);
  }

  const close = () => {
    if (closed) return;
    closed = true;
    voice.stop();
    voice.stopSpeaking();
    closePanel();
  };

  const closePanel = openPanel(h('div', { class: 'chat' },
    log,
    chips,
    h('div', { class: 'chat-row' }, micBtn, input, sendBtn),
    h('div', { class: 'small muted' }, llmAvailable ? '💬 Natural conversation powered by Claude (local server).' : '💬 Talk naturally: greetings, lessons, games, food, feelings, directions, the timetable…')),
  { title: title(), closable: true, cls: 'chat-panel', onClose: () => { closed = true; voice.stop(); voice.stopSpeaking(); } });
  const panel = topPanel();
  const panelHead = panel.querySelector('.panel-head h2');
  panel.__onVoiceText = (text) => send(text);

  if (firstText) send(firstText);
  else {
    const opener = reply('hello', { ...who.context(), kind: who.kind, npc: who.npc, staffRole: who.staffRole, turn: 0, seed: (who.seed || 0) + Math.floor(Math.random() * 6), convo });
    pending = opener.pending;
    if (opener.openerLesson) openerLesson = opener.openerLesson;
    if (opener.helpTopic) helpTopic = opener.helpTopic;
    if (who.friendId && opener.effects.friend) gainFriend(state, who.friendId, opener.effects.friend);
    setChips(opener.suggestions);
    npcSays(opener.text);
    history.length = 0;
    history.push({ role: 'npc', text: opener.text });
  }
  setTimeout(() => input.focus({ preventScroll: true }), 50);
  return close;
}
