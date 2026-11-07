import { h, openPanel, replacePanelBody, shuffle, toast } from './dom.js';
import { cgpa } from '../core/academics.js';
import { COLLEGE } from '../../data/college.js';
import {
  recordLesson, buildExam, scoreExam, evaluatePromotion, applyRemedial, practicalScore, PROJECT_QUALITY_SCORE, MASTERY, buildYearSummary,
} from '../core/academics.js';
import { ensureYear } from '../core/state.js';
import { getClassSubjects, getProject } from '../../data/curriculum.js';
import { teacherFor } from '../../data/people.js';
import { attachVoice, guardClick } from './voicepick.js';

function optionList(ctx, q, onPick) {
  const wrap = h('div', { class: 'options' });
  let picker;
  q.options.forEach((opt, i) => {
    wrap.append(h('button', {
      class: 'option',
      'data-say': opt,
      onclick: (e) => {
        if (!guardClick(ctx, e)) return;
        picker.stop();
        wrap.querySelectorAll('button.option').forEach((b, j) => {
          b.disabled = true;
          if (j === q.answer) b.classList.add('correct');
        });
        if (i !== q.answer) wrap.querySelectorAll('button.option')[i].classList.add('wrong');
        onPick(i === q.answer);
      },
    }, h('span', { class: 'opt-key' }, String.fromCharCode(65 + i)), ` ${opt}`));
  });
  picker = attachVoice(ctx, wrap, { buttons: () => [...wrap.querySelectorAll('button.option')] });
  return wrap;
}

export function runLesson(ctx, { subject, classNum, makeUp = false }, onDone) {
  const teacher = teacherFor(subject.teacher, classNum);
  const topics = subject.topics;
  const results = [];
  let close;
  let raised = false;

  const teachScreen = (i) => {
    const t = topics[i];
    ctx.setBoard([`${subject.name}`, t.name, `${teacher.name}`]);
    ctx.voice.speak(t.teach);
    const extra = h('div');
    return h('div', { class: 'lesson' },
      h('div', { class: 'kicker' }, `${subject.name} · Topic ${i + 1} of ${topics.length}${makeUp ? ' · Make-up class' : ''}`),
      h('h3', {}, t.name),
      h('div', { class: 'teacher-line' }, h('b', {}, `${teacher.name}: `), t.teach),
      extra,
      h('div', { class: 'row' },
        h('button', {
          'data-voice': 'raise hand question doubt',
          onclick: (e) => {
            e.currentTarget.disabled = true;
            raised = true;
            ctx.state.stats.handsRaised += 1;
            ctx.state.reputation += 1;
            const reply = `Good question, Mirnal! The key idea is: ${t.teach.split('. ')[0].replace(/\.$/, '')}.`;
            extra.append(h('div', { class: 'teacher-line soft' }, h('b', {}, `${teacher.name}: `), reply));
            ctx.voice.speak(reply);
          },
        }, '✋ Raise hand'),
        h('button', { class: 'primary', 'data-voice': 'continue next practice', onclick: () => replacePanelBody(close, practiceScreen(i)) }, 'Try the practice question →')));
  };

  const practiceScreen = (i) => {
    const t = topics[i];
    const feedback = h('div', { class: 'feedback' });
    const next = h('button', { class: 'primary', disabled: true, 'data-voice': 'next continue', onclick: () => {
      if (i + 1 < topics.length) replacePanelBody(close, teachScreen(i + 1));
      else replacePanelBody(close, doneScreen());
    } }, i + 1 < topics.length ? 'Next topic →' : 'Finish lesson →');
    return h('div', { class: 'lesson' },
      h('div', { class: 'kicker' }, `Practice · ${t.name}`),
      h('h3', {}, t.practice.q),
      optionList(ctx, t.practice, (ok) => {
        const rec = recordLesson(ctx.state, classNum, subject.id, t.id, { practiceCorrect: ok, raisedHand: raised, makeUp });
        raised = false;
        results.push({ topic: t, ok, level: rec.level });
        feedback.replaceChildren(ok ? h('span', { class: 'good' }, '✔ Correct! Topic practised.') : h('span', { class: 'bad' }, `✘ Not quite. The answer is: ${t.practice.options[t.practice.answer]}`));
        next.disabled = false;
        next.focus();
      }),
      feedback, h('div', { class: 'row' }, next));
  };

  const doneScreen = () => {
    ctx.state.day.lessonsDone[subject.id] = true;
    return h('div', { class: 'lesson' },
      h('h3', {}, `${subject.name}: lesson complete`),
      h('ul', { class: 'clean' }, results.map((r) => h('li', {}, `${r.topic.name}: `, h('span', { class: `badge m${r.level}` }, MASTERY[r.level])))),
      h('p', { class: 'muted' }, 'Added to Mirnal’s Learning Journey.'),
      h('div', { class: 'row' }, h('button', { class: 'primary', 'data-voice': 'done close continue', onclick: () => { close(); onDone?.(); } }, 'Done')));
  };

  close = openPanel(teachScreen(0), { title: `${makeUp ? 'Make-up class' : 'Class in session'} · ${teacher.name}`, cls: 'lesson-panel' });
}

export function runPractical(ctx, practical, classNum, onDone) {
  const order = practical.steps;
  const shuffled = shuffle(order.map((s, i) => ({ s, i })));
  let nextIdx = 0;
  let wrong = 0;
  let close;
  const done = h('ol', { class: 'steps-done' });
  const msg = h('div', { class: 'feedback' });
  const grid = h('div', { class: 'options multi-step' });
  let picker;
  shuffled.forEach(({ s, i }, k) => {
    const b = h('button', { class: 'option', 'data-say': s, onclick: (e) => {
      if (!guardClick(ctx, e)) return;
      if (i === nextIdx) {
        b.disabled = true;
        b.classList.add('correct');
        done.append(h('li', {}, s));
        nextIdx += 1;
        msg.textContent = '';
        if (nextIdx === order.length) {
          picker.stop();
          finish();
        } else picker.again();
      } else {
        wrong += 1;
        b.classList.add('shake');
        setTimeout(() => b.classList.remove('shake'), 400);
        msg.replaceChildren(h('span', { class: 'bad' }, 'That isn’t the next step. Think about what has to happen first.'));
        picker.again();
      }
    } }, h('span', { class: 'opt-key' }, String.fromCharCode(65 + k)), ` ${s}`);
    grid.append(b);
  });
  picker = attachVoice(ctx, grid, { buttons: () => [...grid.querySelectorAll('button.option')], hint: 'Say the letter of the next step, e.g. “C”' });
  const finish = () => {
    const score = practicalScore(wrong);
    ctx.state.day.practicalsDone[practical.subject] = score;
    ctx.state.practicals.push({ classNum, subject: practical.subject, name: practical.name, score: Math.round(score * 100) });
    replacePanelBody(close, h('div', {},
      h('h3', {}, 'Practical complete!'),
      h('p', {}, `${practical.name}: ${Math.round(score * 100)}% (${wrong} wrong step${wrong === 1 ? '' : 's'})`),
      h('div', { class: 'row' }, h('button', { class: 'primary', 'data-voice': 'done', onclick: () => { close(); onDone?.(); } }, 'Done'))));
  };
  close = openPanel(h('div', {},
    h('div', { class: 'kicker' }, 'Laboratory practical'),
    h('h3', {}, practical.name),
    h('p', { class: 'muted' }, 'Put the steps in the correct order, one at a time.'),
    grid, msg, h('h4', {}, 'Your record'), done), { title: 'Practical', closable: true });
}

export function runProject(ctx, classNum, { late = false } = {}, onDone) {
  const project = getProject(classNum, ctx.state.stream);
  if (!project) return;
  let close;
  const choices = shuffle(project.choices);
  const grid = h('div', { class: 'options' });
  close = openPanel(h('div', {},
    h('div', { class: 'kicker' }, late ? 'Late submission' : 'School project'),
    h('h3', {}, project.name),
    h('p', {}, project.description),
    h('p', { class: 'muted' }, 'How will Mirnal approach it?'),
    grid), { title: 'Project work', closable: true });
  choices.forEach((c, k) => grid.append(h('button', { class: 'option', 'data-say': c.label, onclick: (e) => {
      if (!guardClick(ctx, e)) return;
      picker.stop();
      const quality = late && c.quality === 'excellent' ? 'good' : c.quality;
      ctx.state.day.projectDone = true;
      ctx.state.projects.push({ classNum, subject: project.subject, name: project.name, quality, result: c.result, late });
      if (quality === 'excellent') ctx.state.certificates.push({ classNum, title: `Best Project: ${project.name}` });
      ctx.state.reputation += Math.round(PROJECT_QUALITY_SCORE[quality] * 4);
      replacePanelBody(close, h('div', {},
        h('h3', {}, `Project submitted: ${quality}`),
        h('p', {}, c.result),
        late ? h('p', { class: 'muted' }, 'Late submissions are capped at “good”.') : null,
        h('div', { class: 'row' }, h('button', { class: 'primary', onclick: () => { close(); onDone?.(); } }, 'Done'))));
    } }, h('span', { class: 'opt-key' }, String.fromCharCode(65 + k)), ` ${c.label}`)));
  const picker = attachVoice(ctx, grid, { buttons: () => [...grid.querySelectorAll('button.option')] });
}

export function runExam(ctx, classNum, { onlySubjects = null, remedial = false, topicLimit = null, title: customTitle = null } = {}, onDone) {
  const stream = ctx.state.stream;
  const exam = buildExam(classNum, stream, onlySubjects, topicLimit);
  const answers = {};
  let p = 0;
  let q = 0;
  let close;
  const board = classNum === 10 || classNum === 12;
  const title = customTitle ?? (remedial ? 'Remedial Examination' : board ? `CBSE Board Examination (simulated) · Class ${classNum}` : `Annual Examination · Class ${classNum}`);

  const screen = () => {
    const paper = exam[p];
    const question = paper.questions[q];
    const total = paper.questions.length;
    return h('div', { class: 'exam' },
      h('div', { class: 'kicker' }, `Paper ${p + 1} of ${exam.length} · ${paper.subjectName} · Q${q + 1}/${total}`),
      h('h3', {}, question.q),
      optionList(ctx, question, (ok) => {
        (answers[paper.subjectId] ||= [])[q] = ok;
        setTimeout(advance, 650);
      }));
  };
  const advance = () => {
    q += 1;
    if (q >= exam[p].questions.length) {
      q = 0;
      p += 1;
    }
    if (p >= exam.length) {
      const results = scoreExam(ctx.state, classNum, stream, exam, answers);
      close();
      onDone(results);
    } else replacePanelBody(close, screen());
  };
  close = openPanel(h('div', {},
    h('p', {}, remedial ? 'You get one more chance in the subjects below the pass mark.' : `${exam.length} papers. Each has ${exam[0].questions.length} questions. Answers are marked as soon as you pick them.`),
    h('ul', { class: 'clean' }, exam.map((e) => h('li', {}, e.subjectName))),
    h('div', { class: 'row' }, h('button', { class: 'primary', 'data-voice': 'begin start exam', onclick: () => replacePanelBody(close, screen()) }, 'Begin exam'))), { title, cls: 'exam-panel' });
}

function remark(avg) {
  if (avg >= 85) return 'Outstanding effort this year. Keep your curiosity alive.';
  if (avg >= 70) return 'Very good work. A little more revision will make the difference.';
  if (avg >= 50) return 'Good progress. Focus on the topics marked for revision.';
  if (avg >= 33) return 'You have passed. Let’s build stronger study habits next year.';
  return 'This year was difficult. We will support you with extra help.';
}

export function showReportCard(ctx, classNum, handlers) {
  if (classNum >= 13) return showGradeSheet(ctx, classNum, handlers);
  const state = ctx.state;
  const year = ensureYear(state, classNum);
  const results = year.results;
  const ev = evaluatePromotion(state, classNum, state.stream);
  const subjects = Object.values(results);
  const avg = Math.round(subjects.reduce((a, r) => a + r.total, 0) / subjects.length);
  const classTeacher = teacherFor(getClassSubjects(classNum, state.stream)[0].teacher, classNum);
  let close;
  const actions = h('div', { class: 'row wrap' });
  if (ev.eligible) {
    actions.append(h('button', { class: 'primary', 'data-voice': 'continue promoted next', onclick: () => { close(); handlers.onPromote(); } },
      classNum === 12 ? 'Graduate! →' : `Promoted to Class ${classNum + 1} →`));
  } else {
    if (ev.attendance < 0.75) actions.append(h('button', { onclick: () => { close(); handlers.onMakeUp(); } }, 'Attend make-up classes'));
    if (ev.reasons.some((r) => r.startsWith('Project'))) actions.append(h('button', { onclick: () => { close(); handlers.onLateProject(); } }, 'Submit project late'));
    if (ev.failed.length && !year.remedial) actions.append(h('button', { class: 'primary', onclick: () => { close(); handlers.onRemedial(ev.failed); } }, 'Take remedial exam'));
    if (ev.failed.length && year.remedial) actions.append(h('button', { class: 'primary', onclick: () => { close(); handlers.onRepeat(); } }, `Repeat Class ${classNum}`));
  }
  close = openPanel(h('div', { class: 'report' },
    h('div', { class: 'report-head' },
      h('div', {}, h('b', {}, 'Sunrise Public School'), h('div', { class: 'muted' }, `Report Card · Class ${classNum}${year.attempts > 1 ? ` (attempt ${year.attempts})` : ''}`)),
      h('div', { class: 'muted' }, 'Student: Mirnal')),
    h('table', {},
      h('thead', {}, h('tr', {}, ['Subject', 'Theory', 'Internal', 'Total', 'Grade', 'Result'].map((x) => h('th', {}, x)))),
      h('tbody', {}, subjects.map((r) => h('tr', { class: r.passed ? '' : 'fail' },
        h('td', {}, r.name, r.remedial ? ' *' : ''), h('td', {}, `${r.theory}/${r.theoryMax}`), h('td', {}, `${r.internal}/${r.internalMax}`),
        h('td', {}, h('b', {}, r.total)), h('td', {}, r.grade), h('td', {}, r.passed ? 'Pass' : 'Below 33'))))),
    h('p', {}, `Lesson attendance: ${Math.round(ev.attendance * 100)}% · Average: ${avg}%`),
    h('p', {}, h('b', {}, `${classTeacher.name} (class teacher): `), remark(avg)),
    h('p', { class: 'muted' }, `Parent-teacher meeting note: ${avg >= 60 ? 'Mirnal participates well. Encourage reading at home.' : 'Please help Mirnal revise a little every day.'}`),
    ev.eligible ? h('p', { class: 'good' }, '✔ Eligible for promotion') : h('div', { class: 'bad' }, h('b', {}, 'Not yet promoted:'), h('ul', {}, ev.reasons.map((r) => h('li', {}, r)))),
    actions), { title: 'Report Card', wide: true });
}

export function showYearSummary(ctx, classNum, onDone) {
  const s = buildYearSummary(ctx.state, classNum);
  const list = (items, empty = 'None yet') => (items.length ? h('ul', { class: 'clean' }, items.map((i) => h('li', {}, i))) : h('p', { class: 'muted' }, empty));
  let close;
  close = openPanel(h('div', { class: 'summary' },
    h('div', { class: 'grid2' },
      h('section', {}, h('h4', {}, 'Subjects studied'), list(s.subjects)),
      h('section', {}, h('h4', {}, 'Strongest subjects'), list(s.strongest)),
      h('section', {}, h('h4', {}, 'Concepts understood'), list(s.conceptsUnderstood)),
      h('section', {}, h('h4', {}, 'Topics to revise'), list(s.revise, 'Nothing! Great year.')),
      h('section', {}, h('h4', {}, 'Practicals'), list(s.practicals.map((p) => `${p.name} (${p.score}%)`))),
      h('section', {}, h('h4', {}, 'Projects'), list(s.projects.map((p) => `${p.name}: ${p.quality}`))),
      h('section', {}, h('h4', {}, 'Performance'), list(s.performance)),
      h('section', {}, h('h4', {}, 'Certificates'), list(s.certificates))),
    h('div', { class: 'row' }, h('button', { class: 'primary', 'data-voice': 'continue next', onclick: () => { close(); onDone?.(); } }, 'Continue →'))),
  { title: `What Mirnal Learned in Class ${classNum}`, wide: true });
}

export function runMakeUp(ctx, classNum, onDone) {
  const missed = getClassSubjects(classNum, ctx.state.stream).filter((s) => !ctx.state.day.lessonsDone[s.id]);
  const nextOne = () => {
    const ev = evaluatePromotion(ctx.state, classNum, ctx.state.stream);
    const subj = missed.shift();
    if (!subj || ev.attendance >= 0.75) {
      toast('Make-up classes complete.');
      onDone();
      return;
    }
    runLesson(ctx, { subject: subj, classNum, makeUp: true }, nextOne);
  };
  nextOne();
}

export { applyRemedial };

// BITS-style grade sheet with letter grades, SGPA and CGPA.
function showGradeSheet(ctx, classNum, handlers) {
  const state = ctx.state;
  const year = ensureYear(state, classNum);
  const ev = evaluatePromotion(state, classNum, null);
  const rows = Object.entries(year.results);
  const labFailed = ev.failed.filter((id) => year.results[id]?.lab);
  const lectureFailed = ev.failed.filter((id) => !year.results[id]?.lab);
  let close;
  const actions = h('div', { class: 'row wrap' });
  if (ev.eligible) {
    actions.append(h('button', { class: 'primary', 'data-voice': 'continue next semester', onclick: () => { close(); handlers.onPromote(); } }, classNum === 13 ? 'On to Semester 2 →' : 'Finish Year 1 →'));
  } else {
    if (ev.reasons.some((r) => r.startsWith('Project'))) actions.append(h('button', { onclick: () => { close(); handlers.onLateProject(); } }, 'Submit the assignment late'));
    if (labFailed.length) actions.append(h('button', { onclick: () => { close(); handlers.onRedoLabs(); } }, 'Redo the missed labs'));
    if (lectureFailed.length && !year.remedial) actions.append(h('button', { class: 'primary', onclick: () => { close(); handlers.onRemedial(lectureFailed); } }, 'Take the make-up exam'));
    if (lectureFailed.length && year.remedial) actions.append(h('button', { class: 'primary', onclick: () => { close(); handlers.onRepeat(); } }, 'Repeat the semester'));
  }
  const overall = cgpa(state);
  close = openPanel(h('div', { class: 'report' },
    h('div', { class: 'report-head' },
      h('div', {}, h('b', {}, 'BITS Pilani · Grade Sheet'), h('div', { class: 'muted' }, `${COLLEGE[classNum].period} · B.E. Chemical Engineering`)),
      h('div', { class: 'muted' }, 'Student: Mirnal')),
    h('table', {},
      h('thead', {}, h('tr', {}, ['Code', 'Course', 'Units', 'Marks', 'Grade'].map((x) => h('th', {}, x)))),
      h('tbody', {}, rows.map(([, r]) => h('tr', { class: r.passed ? '' : 'fail' },
        h('td', {}, r.code), h('td', {}, r.name, r.remedial ? ' *' : ''), h('td', {}, r.units), h('td', {}, `${r.total}/100`), h('td', {}, h('b', {}, r.letter)))))),
    h('div', { class: 'tiles' },
      h('div', { class: 'tile' }, h('div', { class: 'tile-n' }, year.sgpa ?? '–'), h('div', { class: 'tile-l' }, 'SGPA (out of 10)')),
      h('div', { class: 'tile' }, h('div', { class: 'tile-n' }, overall ?? '–'), h('div', { class: 'tile-l' }, 'CGPA'))),
    h('p', { class: 'muted small' }, 'Simplified absolute grading for the game (A = 10, A- = 9, B = 8, B- = 7, C = 6, C- = 5, D = 4, NC = not cleared). Real BITS grading is relative.'),
    ev.eligible ? h('p', { class: 'good' }, '✔ All courses cleared') : h('div', { class: 'bad' }, h('b', {}, 'Not yet cleared:'), h('ul', {}, ev.reasons.map((r) => h('li', {}, r)))),
    actions), { title: 'Grade Sheet', wide: true });
}
