import { h, openPanel, replacePanelBody } from './dom.js';
import { STREAMS, COMBINATION_RULES } from '../../data/streams.js';
import { SENIOR_SUBJECTS } from '../../data/curriculum.js';
import { validateCombination, defaultElectives, toStream } from '../core/streams.js';

const S = (id) => SENIOR_SUBJECTS[id];

export function openStreamSelection(ctx, { current = null, onConfirm, title = 'Class 11: Choose Your Stream' }) {
  let close;
  let sel = current
    ? { presetId: current.presetId, electives: current.subjects.filter((id) => id !== COMBINATION_RULES.compulsoryLanguage), additional: current.additional }
    : null;

  const overview = () => h('div', { class: 'streams' },
    h('p', {}, 'Pick a starting stream, then build your exact subject combination. English Core is compulsory. You need 4 electives and may add 1 additional subject.'),
    h('div', { class: 'stream-grid' }, STREAMS.map((st) => h('div', { class: 'stream-card', style: { borderColor: st.color } },
      h('h4', { style: { color: st.color } }, st.name),
      h('p', {}, st.blurb),
      h('ul', { class: 'clean small' }, st.experiences.map((e) => h('li', {}, `• ${e}`))),
      h('button', { class: 'primary', 'data-voice': `${st.name} ${st.id}`, onclick: () => {
        sel = { presetId: st.id, electives: defaultElectives(st.id), additional: null };
        replacePanelBody(close, builder());
      } }, 'Explore subjects →')))),
    current && h('div', { class: 'row' }, h('button', { onclick: () => replacePanelBody(close, builder()) }, 'Edit my current subjects')));

  const subjectInfo = h('div', { class: 'subject-info muted' }, 'Tap ⓘ on a subject to inspect it.');
  const inspect = (id) => {
    const s = S(id);
    subjectInfo.replaceChildren(
      h('h4', {}, s.name, h('span', { class: 'tag' }, s.kind)),
      h('p', {}, s.desc),
      h('p', {}, h('b', {}, 'Core topics: '), [...s.topics[11], ...s.topics[12]].map((t) => t.name).join(' · ')),
      h('p', {}, h('b', {}, 'Practicals: '), s.practical ? `${s.practical[11].name}; ${s.practical[12].name}` : 'None (written/project work)'),
      h('p', {}, h('b', {}, 'Assessment: '), s.assessment, ' · ', h('b', {}, 'Workload: '), s.workload, ' · ', h('b', {}, 'Weekly periods: '), s.weeklyPeriods),
      h('p', {}, h('b', {}, 'Learning outcomes: '), s.outcomes));
  };

  const builder = () => {
    const preset = STREAMS.find((s) => s.id === sel.presetId);
    const v = validateCombination(sel);
    const ids = Object.keys(SENIOR_SUBJECTS).filter((id) => id !== COMBINATION_RULES.compulsoryLanguage);
    const chip = (id, mode) => {
      const on = mode === 'el' ? sel.electives.includes(id) : sel.additional === id;
      const core = preset.core.includes(id);
      return h('div', { class: `chip ${on ? 'on' : ''} ${core ? 'core' : ''}` },
        h('button', { class: 'chip-main', 'data-voice': S(id).name, onclick: () => {
          if (mode === 'el') {
            sel.electives = on ? sel.electives.filter((x) => x !== id) : [...sel.electives, id];
            if (sel.additional === id) sel.additional = null;
          } else sel.additional = on ? null : id;
          replacePanelBody(close, builder());
        } }, `${on ? '✓ ' : ''}${S(id).name}`, S(id).kind === 'skill' ? ' (skill)' : '', S(id).lab ? ' 🧪' : ''),
        h('button', { class: 'chip-info', title: 'Inspect', onclick: () => inspect(id) }, 'ⓘ'));
    };
    return h('div', { class: 'builder' },
      h('div', { class: 'kicker', style: { color: preset.color } }, preset.name),
      h('p', { class: 'muted' }, `Senior says: “${preset.senior.line}”`),
      h('h4', {}, 'Compulsory'), h('div', { class: 'chips' }, h('div', { class: 'chip on locked' }, h('span', { class: 'chip-main' }, '✓ English Core'))),
      h('h4', {}, `Electives (${sel.electives.length}/${COMBINATION_RULES.electivesRequired})`),
      h('div', { class: 'chips' }, ids.map((id) => chip(id, 'el'))),
      h('h4', {}, 'Optional additional subject'),
      h('div', { class: 'chips' }, ids.filter((id) => !sel.electives.includes(id)).map((id) => chip(id, 'add'))),
      subjectInfo,
      h('div', { class: 'validation' },
        v.errors.map((e) => h('div', { class: 'bad' }, `✘ ${e}`)),
        v.warnings.map((w) => h('div', { class: 'warn' }, `⚠ ${w}`)),
        v.ok && h('div', { class: 'good' }, `✔ Valid combination · about ${v.weeklyPeriods} periods a week`)),
      h('div', { class: 'row' },
        h('button', { onclick: () => replacePanelBody(close, overview()) }, '← All streams'),
        h('button', { class: 'primary', disabled: !v.ok, 'data-voice': 'compare review next', onclick: () => replacePanelBody(close, compare()) }, 'Review & compare →')));
  };

  const summarize = (electives, additional) => {
    const all = ['eng', ...electives, ...(additional ? [additional] : [])];
    return {
      names: all.map((id) => S(id).name),
      labs: all.filter((id) => S(id).practical).length,
      periods: all.reduce((a, id) => a + S(id).weeklyPeriods, 0),
      heavy: all.filter((id) => S(id).workload === 'High').length,
    };
  };

  const compare = () => {
    const mine = summarize(sel.electives, sel.additional);
    const others = STREAMS.filter((s) => s.id !== sel.presetId && s.id !== 'voc').slice(0, 2).map((s) => ({ s, sum: summarize(defaultElectives(s.id), null) }));
    const col = (title, sum, color) => h('div', { class: 'compare-col', style: { borderColor: color } },
      h('h4', { style: { color } }, title),
      h('ul', { class: 'clean' }, sum.names.map((n) => h('li', {}, n))),
      h('p', {}, `🧪 Labs: ${sum.labs} · ⏱ ${sum.periods} periods/week · High-workload subjects: ${sum.heavy}`));
    const preset = STREAMS.find((s) => s.id === sel.presetId);
    return h('div', {},
      h('p', {}, 'Your choice compared with two other common combinations:'),
      h('div', { class: 'compare' }, col(`Your choice (${preset.name})`, mine, preset.color), others.map((o) => col(o.s.name, o.sum, o.s.color))),
      h('table', {}, h('thead', {}, h('tr', {}, ['Subject', 'Class 11 topics', 'Practical', 'Assessment'].map((x) => h('th', {}, x)))),
        h('tbody', {}, ['eng', ...sel.electives, ...(sel.additional ? [sel.additional] : [])].map((id) => h('tr', {},
          h('td', {}, S(id).name), h('td', {}, S(id).topics[11].map((t) => t.name).join(', ')), h('td', {}, S(id).practical ? 'Yes' : 'No'), h('td', {}, S(id).assessment))))),
      h('p', { class: 'muted' }, 'Your stream shapes Classes 11–12. It does not decide your whole future.'),
      h('div', { class: 'row' },
        h('button', { onclick: () => replacePanelBody(close, builder()) }, '← Change subjects'),
        h('button', { class: 'primary', 'data-voice': 'confirm choose final', onclick: () => {
          close();
          onConfirm(toStream(sel), sel);
        } }, 'Confirm my subjects ✓')));
  };

  close = openPanel(sel ? builder() : overview(), { title, wide: true, closable: true });
}
