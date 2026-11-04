import { h, openPanel, replacePanelBody, toast } from './dom.js';
import { adjustFriend } from '../core/state.js';
import { YEAR_EVENTS } from '../../data/events.js';
import { CANTEEN_MENU } from '../../data/people.js';
import { tokens } from '../voice.js';

export function friendTier(level) {
  if (level >= 75) return 'Best friend';
  if (level >= 50) return 'Good friend';
  if (level >= 25) return 'Friend';
  return 'Classmate';
}

function convo(ctx, title, speaker, line, options) {
  ctx.voice.speak(line);
  return h('div', { class: 'dialogue' },
    h('div', { class: 'npc-line' }, h('b', {}, `${speaker}: `), line),
    h('div', { class: 'choices' }, options.map((o) => h('button', { class: o.cls || '', 'data-voice': o.voice || '', onclick: o.go }, o.label))));
}

export function openSimpleDialogue(ctx, name, lines, extra = []) {
  let close;
  let i = 0;
  const render = () => convo(ctx, name, name, lines[i], [
    ...(i + 1 < lines.length ? [{ label: 'Go on…', voice: 'next continue', go: () => { i += 1; replacePanelBody(close, render()); } }] : []),
    ...extra.map((e) => ({ ...e, go: () => e.go(close) })),
    { label: 'Bye', voice: 'bye leave', go: () => close() },
  ]);
  close = openPanel(render(), { title: name, closable: true });
}

const THOUGHTS = [
  'Every expert was once a beginner.',
  'Mistakes are proof that you are trying.',
  'Kindness is a language everyone understands.',
  'Small steps every day add up to big journeys.',
  'Ask questions. Curiosity is the start of learning.',
  'Be the classmate you would like to have.',
];

export function runAssembly(ctx, onDone) {
  const state = ctx.state;
  const ev = YEAR_EVENTS[state.classNum];
  const steps = [];
  let close;
  const thought = THOUGHTS[(state.classNum + (state.years[state.classNum]?.attempts || 1)) % THOUGHTS.length];
  const readStatus = h('span', { class: 'mic-status' }, 'Today it’s your turn to read the thought for the day to the school.');
  const readBtn = h('button', { class: 'mic-btn', onclick: () => {
    readBtn.classList.add('live');
    readStatus.textContent = 'Listening… read it aloud';
    ctx.voice.listen((text) => {
      readBtn.classList.remove('live');
      const want = tokens(thought).filter((w) => w.length > 2);
      const said = new Set(tokens(text));
      const score = want.filter((w) => said.has(w)).length / want.length;
      if (score >= 0.5) {
        readBtn.disabled = true;
        state.reputation += 2;
        state.stats.voiceActions = (state.stats.voiceActions || 0) + 1;
        readStatus.textContent = '✔ The whole school heard you. Well read!';
        readStatus.className = 'good';
      } else readStatus.textContent = `Heard “${text}”. Try reading the whole line again.`;
    }, (err) => { readBtn.classList.remove('live'); readStatus.textContent = err; }, { lang: 'en-IN' });
  } }, '🎤 Read it aloud');
  const readAloud = h('div', { class: 'mic-row' }, readBtn, readStatus);
  steps.push(() => h('div', {},
    h('p', {}, 'The last notes of the National Anthem fade. The morning prayer is said, and a student reads the school news.'),
    h('p', { class: 'quote' }, `Thought for the day: “${thought}”`),
    readAloud,
    h('div', { class: 'row' }, h('button', { class: 'primary', 'data-voice': 'continue next', onclick: () => next() }, 'Continue'))));
  if (ev && !state.day.eventDone) {
    steps.push(() => h('div', {},
      h('div', { class: 'kicker' }, `${ev.name} · ${ev.when}`),
      h('p', {}, ev.intro),
      h('div', { class: 'choices' }, ev.choices.map((c) => h('button', { onclick: () => {
        state.day.eventDone = true;
        const year = state.years[state.classNum];
        year.events.push({ name: ev.name, choice: c.label });
        state.decisions.push({ classNum: state.classNum, text: `${ev.name}: ${c.label}` });
        if (c.effect.rep) state.reputation += c.effect.rep;
        if (c.effect.friend) for (const id of Object.keys(state.friends)) adjustFriend(state, id, c.effect.friend);
        if (c.effect.cert) state.certificates.push({ classNum: state.classNum, title: c.effect.cert });
        replacePanelBody(close, h('div', {},
          h('p', {}, c.text),
          c.effect.cert ? h('p', { class: 'good' }, `🏅 Certificate: ${c.effect.cert}`) : null,
          h('div', { class: 'row' }, h('button', { class: 'primary', onclick: () => next() }, 'Continue'))));
      } }, c.label)))));
  }
  let i = 0;
  const next = () => {
    i += 1;
    if (i < steps.length) replacePanelBody(close, steps[i]());
    else {
      close();
      onDone?.();
    }
  };
  state.day.assemblyDone = true;
  close = openPanel(steps[0](), { title: `Morning Assembly · Class ${state.classNum}` });
}

export function openCanteen(ctx) {
  const state = ctx.state;
  let close;
  const render = (msg) => h('div', {},
    h('p', {}, msg || `Shankar Uncle: "What will you have, beta?" You have ₹${state.pocketMoney}.`),
    h('div', { class: 'choices' }, CANTEEN_MENU.map((m) => h('button', { disabled: state.pocketMoney < m.price, onclick: () => {
      state.pocketMoney -= m.price;
      state.stats.snacks += 1;
      state.day.optional.canteen = true;
      replacePanelBody(close, render(`You bought a ${m.item.toLowerCase()} for ₹${m.price}. Delicious! You have ₹${state.pocketMoney} left.`));
    } }, `${m.item} · ₹${m.price}`)),
    h('button', { onclick: () => close() }, 'Nothing, thanks')));
  close = openPanel(render(), { title: 'Canteen', closable: true });
}

// College fest (Oasis / APOGEE): same choice-and-consequence format as school events.
export function runFestEvent(ctx, onDone) {
  const state = ctx.state;
  const ev = YEAR_EVENTS[state.classNum];
  if (!ev) return onDone?.();
  let close;
  close = openPanel(h('div', {},
    h('div', { class: 'kicker' }, `${ev.name} · ${ev.when}`),
    h('p', {}, ev.intro),
    h('div', { class: 'choices' }, ev.choices.map((c) => h('button', { onclick: () => {
      state.day.eventDone = true;
      state.years[state.classNum].events.push({ name: ev.name, choice: c.label });
      state.decisions.push({ classNum: state.classNum, text: `${ev.name}: ${c.label}` });
      if (c.effect.rep) state.reputation += c.effect.rep;
      if (c.effect.friend) for (const id of Object.keys(state.friends)) adjustFriend(state, id, c.effect.friend);
      if (c.effect.cert) state.certificates.push({ classNum: state.classNum, title: c.effect.cert });
      replacePanelBody(close, h('div', {},
        h('p', {}, c.text),
        c.effect.cert ? h('p', { class: 'good' }, `🏅 ${c.effect.cert}`) : null,
        h('div', { class: 'row' }, h('button', { class: 'primary', onclick: () => { close(); onDone?.(); } }, 'Continue'))));
    } }, c.label)))), { title: `🎉 ${ev.name}` });
}
