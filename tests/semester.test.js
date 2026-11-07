import test from 'node:test';
import assert from 'node:assert/strict';
import { CALENDAR, WEEKLY } from '../data/college-calendar.js';
import { buildDay } from '../js/core/timetable.js';
import { getClassSubjects, getPracticals } from '../data/curriculum.js';
import { createState } from '../js/core/state.js';
import { startCollege, buildExam, scoreExam, blendMidsem, lectureAttendance } from '../js/core/academics.js';

const KIND_ORDER = (cal, kind) => cal.map((d, i) => (d.kind === kind ? i : -1)).filter((i) => i >= 0);

for (const sem of [13, 14]) {
  const cal = CALENDAR[sem];
  const ids = getClassSubjects(sem).map((c) => c.id);

  test(`semester ${sem}: 30–40 days in the BITS order (registration → classes → mid-sems → last class → compre)`, () => {
    assert.ok(cal.length >= 30 && cal.length <= 40, `${cal.length} days`);
    assert.equal(cal[0].kind, 'registration');
    assert.equal(cal[1].kind, 'class');
    assert.equal(cal[1].label, 'Classwork begins');
    const mids = KIND_ORDER(cal, 'midsem');
    const compre = KIND_ORDER(cal, 'compre');
    const last = cal.findIndex((d) => d.label === 'Last day of classes');
    assert.ok(mids.length >= 2 && compre.length >= 2);
    assert.ok(Math.max(...mids) < last && last < Math.min(...compre));
    assert.equal(compre.at(-1), cal.length - 1, 'the semester ends with the last compre paper');
    for (let i = 1; i < cal.length; i++) assert.ok(cal[i].week >= cal[i - 1].week, 'weeks never go backwards');
  });

  test(`semester ${sem}: every course has exactly one mid-sem and one compre paper`, () => {
    for (const kind of ['midsem', 'compre']) {
      const papers = cal.filter((d) => d.kind === kind).flatMap((d) => d.papers);
      assert.deepEqual([...papers].sort(), [...ids].sort(), kind);
    }
  });

  test(`semester ${sem}: every day runs 7:30–22:00 with no gaps, and has the right activities`, () => {
    const labs = getPracticals(sem).map((p) => p.subject);
    for (const d of cal) {
      const day = buildDay(sem, null, { calDay: d, pendingLabs: labs });
      assert.equal(day[0].start, 7 * 60 + 30);
      assert.equal(day.at(-1).type, 'departure');
      assert.equal(day.at(-1).end, 22 * 60);
      for (let i = 1; i < day.length; i++) assert.equal(day[i].start, day[i - 1].end, `${d.week} ${d.weekday}: gap before ${day[i].label}`);
      const lessons = day.filter((s) => s.type === 'lesson');
      if (d.kind === 'class') assert.ok(lessons.length >= 2 && lessons.length <= 3 && lessons.every((s) => ids.includes(s.subject)));
      else assert.equal(lessons.length, 0, `no lectures on a ${d.kind} day`);
      assert.equal(day.filter((s) => s.type === 'arrival').length, d.kind === 'registration' ? 1 : 0, 'registration only on day 1');
      assert.equal(day.filter((s) => s.type === 'exam').length, d.kind === 'midsem' || d.kind === 'compre' ? 1 : 0);
    }
  });

  test(`semester ${sem}: each course gets enough lectures to teach every topic, and each lab has a session before mid-sems`, () => {
    const count = {};
    const midStart = cal.findIndex((d) => d.kind === 'midsem');
    for (const d of cal.slice(0, midStart)) if (d.kind === 'class') for (const id of WEEKLY[sem][d.weekday].lectures) count[id] = (count[id] || 0) + 1;
    for (const c of getClassSubjects(sem)) assert.ok((count[c.id] || 0) >= c.topics.length, `${c.code}: ${count[c.id] || 0} lectures before mid-sems`);
    for (const lab of getPracticals(sem).map((p) => p.subject)) {
      assert.ok(cal.slice(0, midStart).some((d) => d.kind === 'class' && WEEKLY[sem][d.weekday].lab === lab), `${lab} has a lab day`);
    }
  });
}

test('lab sessions only appear while that lab is still pending', () => {
  const mon = { week: 2, weekday: 'Mon', month: 'Aug', kind: 'class' };
  assert.ok(buildDay(13, null, { calDay: mon, pendingLabs: ['phy110'] }).some((s) => s.type === 'lab'));
  assert.ok(!buildDay(13, null, { calDay: mon, pendingLabs: ['chem110'] }).some((s) => s.type === 'lab'));
});

test('attendance counts across the semester, not just today', () => {
  const st = createState();
  startCollege(st);
  st.sem.held.math111 = 4;
  st.sem.attended.math111 = 3;
  assert.equal(lectureAttendance(st, 'math111'), 0.75);
  assert.equal(lectureAttendance(st, 'phy111'), 0, 'no lectures held yet and none attended today');
});

test('mid-sem (35%) and compre (65%) both count towards the theory marks', () => {
  const st = createState();
  startCollege(st);
  const exam = buildExam(13, null, ['math111']);
  const allRight = scoreExam(st, 13, null, exam, { math111: exam[0].questions.map(() => true) });
  const before = allRight.math111.theory;
  blendMidsem(allRight, { math111: 0 });
  assert.equal(allRight.math111.midsemPct, 0);
  assert.equal(allRight.math111.theory, Math.round(before * 0.65));
  assert.equal(allRight.math111.total, allRight.math111.theory + allRight.math111.internal);
  const midOnly = buildExam(13, null, ['math111'], 1);
  assert.equal(midOnly[0].questions.length, 2, 'a mid-sem covers the first topic only');
});

test('a new semester starts on registration day with a clean record', () => {
  const st = createState();
  startCollege(st);
  assert.equal(st.sem.day, 0);
  assert.equal(st.sem.registered, false);
  assert.deepEqual(st.sem.midsem, {});
});
