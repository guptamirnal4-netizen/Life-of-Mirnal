import { h, openPanel, replacePanelBody } from './dom.js';
import { ANTHEM_LINES } from '../../data/anthem.js';
import { tokens } from '../voice.js';

function lineScore(text, line) {
  const said = new Set(tokens(text));
  const score = (src) => {
    const want = tokens(src).filter((w) => w.length > 1);
    return want.length ? want.filter((w) => said.has(w)).length / want.length : 0;
  };
  return Math.max(score(line.dev), score(line.rom));
}

// Arrive early at the assembly line and rehearse the anthem, line by line, out loud.
export function openAnthemPractice(ctx, onDone) {
  const state = ctx.state;
  let i = 0;
  let passed = 0;
  let close;
  const listen = (status, btn) => {
    btn.classList.add('live');
    status.textContent = 'Listening… sing or say this line';
    status.className = 'mic-status';
    const line = ANTHEM_LINES[i];
    ctx.voice.listen((text, alts = [text]) => {
      btn.classList.remove('live');
      const best = Math.max(...alts.map((a) => lineScore(a, line)));
      if (best >= 0.3) {
        passed += 1;
        status.textContent = `✔ Beautiful! (“${text}”)`;
        status.className = 'good';
        setTimeout(next, 900);
      } else status.textContent = `Heard “${text}”. Try again, a little slower.`;
    }, (err) => { btn.classList.remove('live'); status.textContent = err; }, { lang: 'hi-IN' });
  };
  const render = () => {
    const line = ANTHEM_LINES[i];
    const status = h('div', { class: 'mic-status' });
    const btn = h('button', { class: 'mic-btn', onclick: () => listen(status, btn) }, '🎤 Sing this line');
    setTimeout(() => listen(status, btn), 300);
    return h('div', { class: 'practice' },
      h('div', { class: 'kicker' }, `Line ${i + 1} of ${ANTHEM_LINES.length}`),
      h('div', { class: 'lyric-dev' }, line.dev),
      h('div', { class: 'lyric-rom' }, line.rom),
      h('div', { class: 'mic-row' }, btn, status),
      h('div', { class: 'row' }, h('button', { 'data-voice': 'skip next line', onclick: () => next() }, 'Skip line')));
  };
  const next = () => {
    i += 1;
    if (i < ANTHEM_LINES.length) {
      replacePanelBody(close, render());
      return;
    }
    ctx.voice.stop();
    state.stats.anthemPractice = (state.stats.anthemPractice || 0) + 1;
    state.reputation += passed >= 5 ? 2 : 1;
    state.day.practisedAnthem = true;
    replacePanelBody(close, h('div', {},
      h('h3', {}, passed >= 5 ? '🇮🇳 Ready for assembly!' : 'Good practice!'),
      h('p', {}, `You sang ${passed} of ${ANTHEM_LINES.length} lines clearly. Your classmates noticed you practising early.`),
      h('div', { class: 'row' }, h('button', { class: 'primary', onclick: () => { close(); onDone?.(); } }, 'Back to the line'))));
  };
  close = openPanel(render(), { title: '🎤 Early bird: practise Jana Gana Mana', closable: true, onClose: () => ctx.voice.stop() });
}
