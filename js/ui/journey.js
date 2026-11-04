import { h, openPanel, replacePanelBody } from './dom.js';
import { MASTERY, journeyTotals } from '../core/academics.js';
import { getClassSubjects, stageOf, STAGES } from '../../data/curriculum.js';
import { CLASSMATES } from '../../data/people.js';
import { STREAMS } from '../../data/streams.js';
import { friendTier } from './dialogue.js';

const SVGNS = 'http://www.w3.org/2000/svg';
function svg(tag, attrs, ...kids) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  kids.forEach((k) => el.append(k));
  return el;
}

function barChart(values, { max = 100, color = 'var(--accent)', label = (v) => v } = {}) {
  const W = 600;
  const H = 180;
  const bw = W / values.length;
  const TOP = 22;
  const root = svg('svg', { viewBox: `0 0 ${W} ${H + TOP + 30}`, class: 'chart', role: 'img' });
  values.forEach((v, i) => {
    const x = i * bw + 6;
    const bh = v === null ? 0 : (v / max) * H;
    root.append(svg('rect', { x, y: TOP + H - bh, width: bw - 12, height: Math.max(bh, v === null ? 0 : 2), rx: 4, fill: v === null ? 'transparent' : color }));
    const t = svg('text', { x: x + (bw - 12) / 2, y: TOP + H + 20, 'text-anchor': 'middle', class: 'chart-label' });
    t.textContent = i + 1 > 12 ? `S${i - 11}` : `C${i + 1}`;
    root.append(t);
    if (v !== null) {
      const tv = svg('text', { x: x + (bw - 12) / 2, y: TOP + H - bh - 6, 'text-anchor': 'middle', class: 'chart-value' });
      tv.textContent = label(v);
      root.append(tv);
    }
  });
  return root;
}

function classView(state, c) {
  const year = state.years[c];
  const stream = year?.stream || (c >= 11 ? state.stream : null);
  if (c >= 11 && !stream) return h('p', { class: 'muted' }, 'Stream not chosen yet.');
  const subjects = getClassSubjects(c, stream);
  const preset = stream && STREAMS.find((s) => s.id === stream.presetId);
  const results = year?.results || {};
  return h('div', { class: 'class-view' },
    h('div', { class: 'kicker' }, `${c >= 13 ? `BITS Pilani · Year 1 · Semester ${c - 12}${year?.sgpa ? ` · SGPA ${year.sgpa}` : ''}` : `Class ${c} · ${STAGES[stageOf(c)]}`}${year?.attempts > 1 ? ` · ${year.attempts} attempts` : ''}`),
    preset && h('p', {}, h('b', {}, 'Stream: '), preset.name, ' · ', h('b', {}, 'Subjects: '), subjects.map((s) => s.name).join(', ')),
    h('div', { class: 'subject-grid' }, subjects.map((s) => h('section', { class: 'subject-card' },
      h('h4', {}, s.name, results[s.id] ? h('span', { class: 'tag' }, `${results[s.id].total}/100 · ${results[s.id].grade}`) : null),
      h('ul', { class: 'clean' }, s.topics.map((t) => {
        const rec = state.topics[t.id];
        const lvl = rec?.level ?? 0;
        return h('li', {},
          h('details', {},
            h('summary', {}, h('span', { class: `badge m${lvl}` }, MASTERY[lvl]), ` ${t.name}`),
            h('div', { class: 'small muted' }, t.teach),
            rec?.activities?.length ? h('ul', { class: 'small' }, rec.activities.map((a) => h('li', {}, a))) : h('div', { class: 'small muted' }, 'No activities yet.')));
      }))))),
    h('div', { class: 'grid2' },
      h('section', {}, h('h4', {}, 'Practicals'), listOr(state.practicals.filter((p) => p.classNum === c).map((p) => `${p.name} · ${p.score}%`))),
      h('section', {}, h('h4', {}, 'Projects'), listOr(state.projects.filter((p) => p.classNum === c).map((p) => `${p.name} · ${p.quality}${p.late ? ' (late)' : ''}`))),
      h('section', {}, h('h4', {}, 'Events & certificates'), listOr([
        ...(year?.events || []).map((e) => `${e.name}: ${e.choice}`),
        ...state.certificates.filter((x) => x.classNum === c).map((x) => `🏅 ${x.title}`)])),
      h('section', {}, h('h4', {}, 'Revise next'), listOr(year?.summary?.revise || [], year?.summary ? 'Nothing to revise!' : 'Year in progress'))));
}

function listOr(items, empty = 'Nothing yet') {
  return items.length ? h('ul', { class: 'clean' }, items.map((i) => h('li', {}, i))) : h('p', { class: 'muted' }, empty);
}

function dashboard(state) {
  const t = journeyTotals(state);
  const tile = (n, label) => h('div', { class: 'tile' }, h('div', { class: 'tile-n' }, n), h('div', { class: 'tile-l' }, label));
  return h('div', {},
    h('div', { class: 'tiles' },
      tile(t.subjectsStudied, 'Subjects studied'), tile(t.topicsIntroduced, 'Topics introduced'), tile(t.topicsMastered, 'Topics mastered'),
      tile(t.practicals, 'Practicals'), tile(t.projects, 'Projects'), tile(t.certificates, 'Certificates'),
      tile(state.stats.voiceAnswers || 0, '🎤 Answers spoken'), tile(state.stats.anthemsSung || 0, '🇮🇳 Anthems sung'), tile(state.stats.anthemPractice || 0, '🎤 Early practice sessions')),
    h('h4', {}, 'Average marks by class'),
    barChart(t.perClass.map((p) => p.avg), { label: (v) => `${v}%` }),
    h('h4', {}, 'Topics practised or mastered by class'),
    barChart(t.perClass.map((p) => (p.introduced ? p.practised : null)), { max: Math.max(12, ...t.perClass.map((p) => p.practised)), color: 'var(--accent2)' }),
    h('p', { class: 'muted small' }, 'Learning progress and marks are measured separately: a low exam score never erases a topic you already practised.'));
}

function friendsView(state) {
  return h('div', { class: 'friends' }, CLASSMATES.filter((c) => c.joins <= state.classNum).map((c) => {
    const f = state.friends[c.id];
    return h('section', { class: 'friend' },
      h('h4', {}, c.name, h('span', { class: 'tag' }, `${friendTier(f.level)} · ${f.level}/100`)),
      h('div', { class: 'small muted' }, `${c.personality} · loves ${c.interest}${c.leaves < state.classNum ? ' · moved away after Class 10' : ''}`),
      listOr(f.memories.slice(-4).map((m) => `Class ${m.classNum}: ${m.text}`), 'No memories yet'));
  }));
}

function portfolioView(state) {
  const reports = Object.values(state.years).filter((y) => y.results);
  return h('div', {},
    h('h4', {}, 'Report cards'),
    h('table', {}, h('thead', {}, h('tr', {}, ['Class', 'Average', 'Best subject', 'Attendance', 'Result'].map((x) => h('th', {}, x)))),
      h('tbody', {}, reports.map((y) => {
        const r = Object.values(y.results);
        const avg = Math.round(r.reduce((a, x) => a + x.total, 0) / r.length);
        const best = [...r].sort((a, b) => b.total - a.total)[0];
        return h('tr', {}, h('td', {}, y.classNum), h('td', {}, `${avg}%`), h('td', {}, best.name), h('td', {}, y.attendancePct !== null ? `${y.attendancePct}%` : '–'), h('td', {}, y.promoted ? 'Promoted' : 'In progress'));
      }))),
    h('div', { class: 'grid2' },
      h('section', {}, h('h4', {}, 'Certificates'), listOr(state.certificates.map((c) => `Class ${c.classNum}: ${c.title}`))),
      h('section', {}, h('h4', {}, 'Projects'), listOr(state.projects.map((p) => `Class ${p.classNum}: ${p.name} (${p.quality})`))),
      h('section', {}, h('h4', {}, 'Practicals'), listOr(state.practicals.map((p) => `Class ${p.classNum}: ${p.name} (${p.score}%)`))),
      h('section', {}, h('h4', {}, 'Important decisions'), listOr(state.decisions.map((d) => `Class ${d.classNum}: ${d.text}`)))));
}

export function openJourney(ctx, initialClass = null) {
  const state = ctx.state;
  let close;
  let tab = 'timeline';
  let selected = initialClass || Math.min(state.classNum, 12);
  const render = () => {
    const tabs = h('div', { class: 'tabs' }, [['timeline', 'Timeline'], ['dashboard', 'Growth Dashboard'], ['portfolio', 'Portfolio'], ['friends', 'Friendships']].map(([id, label]) =>
      h('button', { class: tab === id ? 'on' : '', 'data-voice': label, onclick: () => { tab = id; replacePanelBody(close, render()); } }, label)));
    let body;
    if (tab === 'timeline') {
      const max = state.classNum >= 13 ? 14 : 12;
      const timeline = h('div', { class: 'timeline' }, Array.from({ length: max }, (_, i) => i + 1).map((c) => {
        const reached = c <= state.classNum || state.phase === 'graduated' || state.phase === 'collegeYearDone';
        return h('button', {
          class: `tl ${c === selected ? 'on' : ''} ${state.years[c]?.promoted ? 'done' : ''}`,
          disabled: !reached, 'data-voice': `class ${c}`,
          onclick: () => { selected = c; replacePanelBody(close, render()); },
        }, c >= 13 ? `BITS Y1·S${c - 12}` : `Class ${c}`);
      }));
      body = h('div', {}, timeline, classView(state, selected));
    } else if (tab === 'dashboard') body = dashboard(state);
    else if (tab === 'portfolio') body = portfolioView(state);
    else body = friendsView(state);
    return h('div', {}, tabs, body);
  };
  close = openPanel(render(), { title: "Mirnal's Learning Journey", wide: true, closable: true, cls: 'journey' });
}

export function reflection(state) {
  const totals = journeyTotals(state);
  const preset = state.stream && STREAMS.find((s) => s.id === state.stream.presetId);
  const closest = CLASSMATES.map((c) => ({ c, f: state.friends[c.id] })).sort((a, b) => b.f.level - a.f.level).slice(0, 2);
  const best = {};
  for (const y of Object.values(state.years)) for (const r of Object.values(y.results || {})) (best[r.name] ||= []).push(r.total);
  const fav = Object.entries(best).map(([n, v]) => [n, v.reduce((a, b) => a + b, 0) / v.length]).sort((a, b) => b[1] - a[1])[0];
  return `Twelve years ago, a small Mirnal walked through the gate of Sunrise Public School, holding a school bag almost as big as the bench. `
    + `Since then Mirnal has met ${totals.topicsIntroduced} topics and mastered ${totals.topicsMastered} of them, completed ${totals.practicals} practicals and ${totals.projects} projects, and earned ${totals.certificates} certificates. `
    + `${fav ? `${fav[0]} was the subject Mirnal shone in most. ` : ''}`
    + `${preset ? `After Class 10, Mirnal chose ${preset.name}, and that choice shaped the last two years, but not the whole future. ` : ''}`
    + `${closest.length ? `Through it all, ${closest.map((x) => x.c.name).join(' and ')} were the friends who were always there. ` : ''}`
    + 'The bell will ring tomorrow for someone else. The learning stays.';
}

export function openFinalPortfolio(ctx) {
  const state = ctx.state;
  openPanel(h('div', { class: 'final' },
    h('p', { class: 'reflection' }, reflection(state)),
    dashboard(state),
    portfolioView(state),
    h('h4', {}, 'Friendships'), friendsView(state),
    h('div', { class: 'row' }, h('button', { class: 'primary', onclick: () => openJourney(ctx, 12) }, 'Open the full Learning Journey'))),
  { title: 'THE SCHOOL JOURNEY OF MIRNAL', wide: true, closable: true, cls: 'journey' });
}
