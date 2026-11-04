import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, ensureYear } from '../js/core/state.js';
import {
  computeMastery, recordLesson, buildExam, scoreExam, evaluatePromotion, promote, repeatYear, buildYearSummary, journeyTotals,
} from '../js/core/academics.js';
import { validateCombination, defaultElectives, toStream } from '../js/core/streams.js';
import { buildDay } from '../js/core/timetable.js';
import { serialize, deserialize } from '../js/core/save.js';
import { getClassSubjects, getPracticals, getProject, SENIOR_SUBJECTS } from '../data/curriculum.js';
import { STREAMS } from '../data/streams.js';

function attendAll(state, classNum, stream, practiceCorrect = true) {
  for (const s of getClassSubjects(classNum, stream)) {
    for (const t of s.topics) recordLesson(state, classNum, s.id, t.id, { practiceCorrect });
    state.day.lessonsDone[s.id] = true;
  }
  for (const p of getPracticals(classNum, stream)) state.day.practicalsDone[p.subject] = 1;
  state.day.projectDone = true;
}

function sitExam(state, classNum, stream, correct) {
  const exam = buildExam(classNum, stream);
  const answers = Object.fromEntries(exam.map((p) => [p.subjectId, p.questions.map(() => correct)]));
  const year = ensureYear(state, classNum);
  year.results = scoreExam(state, classNum, stream, exam, answers);
  return year.results;
}

test('content: every class 1-10 has subjects with 2 topics and a project', () => {
  for (let c = 1; c <= 10; c++) {
    const subs = getClassSubjects(c, null);
    assert.ok(subs.length >= 4, `class ${c}`);
    for (const s of subs) assert.equal(s.topics.length, 2, `class ${c} ${s.id}`);
    assert.ok(getProject(c, null), `project class ${c}`);
  }
});

test('content: every senior subject has topics for 11 and 12 and a project', () => {
  for (const [id, s] of Object.entries(SENIOR_SUBJECTS)) {
    assert.equal(s.topics[11].length, 2, id);
    assert.equal(s.topics[12].length, 2, id);
    assert.ok(s.project, id);
    if (s.lab) assert.ok(s.practical?.[11] && s.practical?.[12], `${id} practicals`);
  }
});

test('mastery is not granted for attendance alone', () => {
  assert.equal(computeMastery({ attended: true }), 1);
  assert.equal(computeMastery({ attended: true, practiceCorrect: true }), 3);
  assert.equal(computeMastery({ attended: true, practiceCorrect: true, examCorrect: true }), 4);
  assert.equal(computeMastery({ attended: false, examCorrect: true }), 2);
  assert.equal(computeMastery({}), 0);
});

test('a low exam score never erases demonstrated learning', () => {
  const st = createState();
  attendAll(st, 1, null, true);
  sitExam(st, 1, null, false);
  const t = getClassSubjects(1, null)[0].topics[0];
  assert.equal(st.topics[t.id].level, 3);
});

test('full marks promote; failing marks do not', () => {
  const st = createState();
  attendAll(st, 1, null);
  sitExam(st, 1, null, true);
  assert.equal(evaluatePromotion(st, 1, null).eligible, true);

  const st2 = createState();
  attendAll(st2, 1, null);
  sitExam(st2, 1, null, false);
  const ev = evaluatePromotion(st2, 1, null);
  assert.equal(ev.eligible, false);
  assert.ok(ev.failed.length > 0);
});

test('low attendance and missing project block promotion', () => {
  const st = createState();
  sitExam(st, 2, null, true);
  st.classNum = 2;
  const ev = evaluatePromotion(st, 2, null);
  assert.equal(ev.eligible, false);
  assert.ok(ev.reasons.some((r) => r.includes('attendance')));
  assert.ok(ev.reasons.some((r) => r.includes('Project')));
});

test('a new class does not overwrite earlier learning history', () => {
  const st = createState();
  attendAll(st, 1, null);
  sitExam(st, 1, null, true);
  promote(st);
  assert.equal(st.classNum, 2);
  const before = JSON.stringify(Object.entries(st.topics).filter(([, r]) => r.classNum === 1));
  attendAll(st, 2, null);
  sitExam(st, 2, null, true);
  promote(st);
  const after = JSON.stringify(Object.entries(st.topics).filter(([, r]) => r.classNum === 1));
  assert.equal(before, after);
  assert.ok(st.years[1].summary.conceptsUnderstood.length > 0);
});

test('repeating a year keeps topic records and archives the attempt', () => {
  const st = createState();
  attendAll(st, 1, null);
  sitExam(st, 1, null, false);
  const levels = JSON.stringify(st.topics);
  repeatYear(st);
  assert.equal(st.years[1].attempts, 2);
  assert.equal(st.years[1].previousAttempts.length, 1);
  assert.equal(JSON.stringify(st.topics), levels);
});

test('class 10 promotion leads to stream orientation', () => {
  const st = createState();
  st.classNum = 10;
  attendAll(st, 10, null);
  sitExam(st, 10, null, true);
  promote(st);
  assert.equal(st.classNum, 11);
  assert.equal(st.phase, 'orientation');
});

test('stream combination rules', () => {
  assert.ok(validateCombination({ presetId: 'pcm', electives: ['phy', 'chem', 'math', 'cs'] }).ok);
  assert.ok(validateCombination({ presetId: 'pcmb', electives: ['phy', 'chem', 'math', 'bio'] }).ok);
  assert.equal(validateCombination({ presetId: 'pcm', electives: ['phy', 'chem', 'math'] }).ok, false);
  assert.equal(validateCombination({ presetId: 'com_math', electives: ['acc', 'bst', 'math', 'amath'] }).ok, false);
  assert.equal(validateCombination({ presetId: 'pcm', electives: ['phy', 'chem', 'cs', 'ip'] }).ok, false);
  assert.equal(validateCombination({ presetId: 'pcb', electives: ['phy', 'chem', 'bio', 'acc'] }).ok, false);
  assert.equal(validateCombination({ presetId: 'voc', electives: ['phy', 'chem', 'ai', 'ds'] }).ok, false);
  assert.equal(validateCombination({ presetId: 'pcm', electives: ['phy', 'chem', 'math', 'zzz'] }).ok, false);
  assert.ok(validateCombination({ presetId: 'pcm', electives: ['phy', 'chem', 'math', 'cs'], additional: 'pe' }).ok);
});

test('every preset produces a valid default combination', () => {
  for (const s of STREAMS) {
    const electives = defaultElectives(s.id);
    const v = validateCombination({ presetId: s.id, electives });
    assert.ok(v.ok, `${s.id}: ${v.errors.join('; ')}`);
  }
});

test('class 11 subjects continue into class 12', () => {
  const stream = toStream({ presetId: 'pcm', electives: ['phy', 'chem', 'math', 'cs'] });
  const c11 = getClassSubjects(11, stream).map((s) => s.id);
  const c12 = getClassSubjects(12, stream).map((s) => s.id);
  assert.deepEqual(c11, c12);
  assert.notDeepEqual(getClassSubjects(11, stream)[1].topics, getClassSubjects(12, stream)[1].topics);
  assert.ok(getPracticals(11, stream).length >= 3);
});

test('changing stream changes the subjects', () => {
  const a = toStream({ presetId: 'pcm', electives: ['phy', 'chem', 'math', 'cs'] });
  const b = toStream({ presetId: 'hum', electives: ['hist', 'pol', 'geo', 'psy'] });
  assert.notDeepEqual(getClassSubjects(11, a).map((s) => s.id), getClassSubjects(11, b).map((s) => s.id));
});

test('timetable has one lesson per subject and ends with dismissal', () => {
  for (let c = 1; c <= 10; c++) {
    const day = buildDay(c, null);
    const lessons = day.filter((s) => s.type === 'lesson');
    assert.equal(lessons.length, getClassSubjects(c, null).length);
    assert.equal(day.at(-1).type, 'departure');
    assert.equal(day.filter((s) => s.type === 'lunch').length, 1);
    for (let i = 1; i < day.length; i++) assert.equal(day[i].start, day[i - 1].end);
  }
});

test('full 12-year journey produces a complete portfolio and survives save/load', () => {
  let st = createState();
  for (let c = 1; c <= 12; c++) {
    if (c === 11) st.stream = toStream({ presetId: 'pcm', electives: ['phy', 'chem', 'math', 'cs'] });
    attendAll(st, c, st.stream);
    sitExam(st, c, st.stream, true);
    assert.ok(evaluatePromotion(st, c, st.stream).eligible, `class ${c}`);
    promote(st);
    st = deserialize(serialize(st));
  }
  assert.equal(st.phase, 'graduated');
  for (let c = 1; c <= 12; c++) assert.ok(st.years[c].summary, `summary ${c}`);
  assert.deepEqual(st.years[12].stream.subjects, ['eng', 'phy', 'chem', 'math', 'cs']);
  const totals = journeyTotals(st);
  assert.equal(totals.topicsMastered, 40 + 60 + 2 * 5 * 2);
  assert.ok(buildYearSummary(st, 12).subjects.includes('Physics'));
});
