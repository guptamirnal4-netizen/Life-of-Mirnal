import test from 'node:test';
import assert from 'node:assert/strict';
import { reply, newConvo } from '../js/core/chat.js';
import { CLASSMATES } from '../data/people.js';
import { createState } from '../js/core/state.js';
import { recordLesson, buildExam, scoreExam, scoreLabs, applyCollegeGrades, cgpa, evaluatePromotion, promote, startCollege, letterGrade } from '../js/core/academics.js';
import { getClassSubjects, getPracticals, getLabCourses } from '../data/curriculum.js';
import { buildDay } from '../js/core/timetable.js';

const kartik = CLASSMATES.find((c) => c.id === 'kartik');
const ctx = (over = {}) => ({ kind: 'classmate', npc: kartik, classNum: 13, college: true, festName: 'Oasis', friendLevel: 30, memories: [], turn: 2, seed: 1, slot: { type: 'break', label: 'Afternoon · Free time' }, lessons: [], others: [], convo: newConvo(), ...over });

test('BITS first-year course list matches the official list', () => {
  assert.deepEqual(getClassSubjects(13).map((c) => c.code), ['MATH F111', 'PHY F111', 'CHEM F111', 'BIO F111', 'BITS F110']);
  assert.deepEqual(getLabCourses(13).map((c) => c.code), ['PHY F110', 'CHEM F110', 'BIO F110']);
  assert.deepEqual(getClassSubjects(14).map((c) => c.code), ['BITS F111', 'MATH F112', 'MATH F113', 'CS F111', 'EEE F111', 'BITS F112']);
  assert.deepEqual(getLabCourses(14).map((c) => c.code), ['ME F112']);
  const units = (c) => [...getClassSubjects(c), ...getLabCourses(c)].reduce((a, x) => a + x.units, 0);
  assert.equal(units(13), 17);
  assert.equal(units(14), 20);
});

test('a college class day has lectures in NAB and no school assembly', () => {
  const day = buildDay(13, null, { calDay: { week: 2, weekday: 'Mon', month: 'Aug', kind: 'class' }, pendingLabs: ['phy110'] });
  assert.ok(!day.some((s) => s.type === 'assembly'));
  assert.equal(day.filter((s) => s.type === 'lesson').length, 3);
  assert.ok(day.filter((s) => s.type === 'lesson').every((s) => s.location === 'classroom'));
  assert.ok(day.some((s) => s.type === 'lab' && s.lab === 'phy110'));
  for (let i = 1; i < day.length; i++) assert.equal(day[i].start, day[i - 1].end);
});

test('a full first year: grades, SGPA, CGPA, then the roadmap', () => {
  const st = createState();
  startCollege(st);
  for (const c of [13, 14]) {
    for (const s of getClassSubjects(c)) {
      for (const t of s.topics) recordLesson(st, c, s.id, t.id, { practiceCorrect: true });
      st.day.lessonsDone[s.id] = true;
    }
    for (const p of getPracticals(c)) st.day.practicalsDone[p.subject] = 1;
    st.day.projectDone = true;
    const exam = buildExam(c, null);
    const res = scoreExam(st, c, null, exam, Object.fromEntries(exam.map((p) => [p.subjectId, p.questions.map(() => true)])));
    Object.assign(res, scoreLabs(st, c));
    st.years[c].results = res;
    st.years[c].sgpa = applyCollegeGrades(c, res);
    assert.equal(st.years[c].sgpa, 10);
    assert.ok(evaluatePromotion(st, c, null).eligible);
    promote(st);
  }
  assert.equal(st.phase, 'collegeYearDone');
  assert.equal(cgpa(st), 10);
  assert.equal(letterGrade(85).letter, 'A-');
  assert.equal(letterGrade(20).letter, 'NC');
});

test('skipping a lab leaves that lab course not cleared', () => {
  const st = createState();
  startCollege(st);
  const labs = scoreLabs(st, 13);
  assert.equal(labs.chem110.passed, false);
});

test('conversation: several things in one sentence get several answers', () => {
  const r = reply('hey how are you, and what is your favourite subject?', ctx());
  assert.match(r.text, /tut|midsems|Good/i);
  assert.match(r.text, /Mathematics 1|MATH|math111|Maths/i);
});

test('conversation: "and you?" gets the character’s own answer', () => {
  const c = ctx({ pending: 'ask_feeling' });
  const r = reply('I am good, and you?', c);
  assert.match(r.text, /Me\?/);
});

test('conversation: repeating a question is noticed', () => {
  const c = ctx();
  reply('what is your favourite subject', c);
  const r = reply('what is your favourite subject', c);
  assert.match(r.text, /already asked|Déjà vu|Again/);
});

test('conversation: "why" follows up on the last topic', () => {
  const c = ctx();
  reply('what is your favourite subject', c);
  assert.match(reply('why?', c).text, /clicks|puzzles/);
});

test('conversation: sharing a like is remembered', () => {
  const r = reply('I love cricket', ctx());
  assert.equal(r.intent, 'share_like');
  assert.equal(r.effects.fact.hobby, 'cricket');
  assert.match(r.text, /Me too/);
});

test('conversation: college talk uses college life', () => {
  assert.match(reply('i am hungry', ctx()).text, /ANC|Mess|C’not/);
  assert.match(reply('are you ready for exams', ctx()).text, /Compre|Midsems/i);
  assert.match(reply('hi', ctx({ turn: 0, slot: { type: 'fest', label: 'Evening · Oasis' } })).text, /Oasis/);
});

test('conversation: branch and BITSAT, exactly as asked', () => {
  const saanvi = CLASSMATES.find((c) => c.id === 'saanvi');
  const c = ctx({ npc: saanvi });
  assert.match(reply('what is the branch', c).text, /Chemical Engineering/);
  assert.match(reply('what is your branch', c).text, /Chemical/);
  assert.match(reply('what is my branch', c).text, /You’re Chemical Engineering/);
  const b = reply('and what was the BITSAT score', c);
  assert.match(b.text, /277 out of 390/);
  assert.equal(b.pending, 'ask_bitsat');
  const mine = reply('I got 301', ctx({ npc: saanvi, pending: 'ask_bitsat' }));
  assert.equal(mine.effects.fact.bitsat, 301);
  assert.match(reply('where are you from', c).text, /Kochi/);
  const home = reply('I am from Delhi', ctx({ npc: saanvi, pending: 'ask_hometown' }));
  assert.equal(home.effects.fact.hometown, 'Delhi');
  assert.match(reply('how is hostel life', c).text, /wing|Hostel|roommate/i);
});

test('greeting is not doubled', () => {
  const saanvi = CLASSMATES.find((c) => c.id === 'saanvi');
  const r = reply('hello', ctx({ npc: saanvi, turn: 0, lessons: [], slot: { type: 'arrival', label: 'Morning' } }));
  assert.doesNotMatch(r.text, /Good morning, Mirnal!.*hi Mirnal/);
});

test('"where are you from" does not also give directions', () => {
  const r = reply('where are you from', ctx());
  assert.doesNotMatch(r.text, /Where to\?/);
});
