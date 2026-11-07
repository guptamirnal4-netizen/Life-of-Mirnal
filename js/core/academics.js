import { getClassSubjects, getPracticals, getProject, getLabCourses, SENIOR_SUBJECTS } from '../../data/curriculum.js';
import { LETTER_GRADES } from '../../data/college.js';
import { ensureYear, topicRecord, newDay, newSem } from './state.js';

export const MASTERY = ['Not started', 'Introduced', 'Learning in progress', 'Practised', 'Mastered'];
export const PASS_MARK = 33;
export const ATTENDANCE_REQUIRED = 0.75;

// Mastery comes from activities and assessments, never from simply being in the room.
export function computeMastery(rec) {
  if (rec.practiceCorrect && rec.examCorrect) return 4;
  if (rec.practiceCorrect) return 3;
  if (rec.examCorrect) return 2;
  if (rec.attended) return 1;
  return 0;
}

function refreshLevel(rec) {
  rec.level = Math.max(rec.level, computeMastery(rec));
}

export function recordLesson(state, classNum, subjectId, topicId, { practiceCorrect, raisedHand = false, makeUp = false }) {
  const rec = topicRecord(state, topicId, classNum, subjectId);
  rec.attended = true;
  rec.activities.push(makeUp ? `Make-up class (Class ${classNum})` : `Lesson attended (Class ${classNum})`);
  if (raisedHand) rec.activities.push('Raised hand to ask a question');
  rec.activities.push(practiceCorrect ? 'Practice question: correct' : 'Practice question: needs another look');
  if (practiceCorrect) rec.practiceCorrect = true;
  rec.milestone = rec.milestone || `Class ${classNum}`;
  refreshLevel(rec);
  return rec;
}

export function isLabSubject(classNum, subjectId, stream) {
  return getPracticals(classNum, stream).some((p) => p.subject === subjectId);
}

// topicLimit: only the first N topics of each course (a mid-semester test covers the first half).
export function buildExam(classNum, stream, onlySubjects = null, topicLimit = null) {
  return getClassSubjects(classNum, stream)
    .filter((s) => !onlySubjects || onlySubjects.includes(s.id))
    .map((s) => ({
      subjectId: s.id,
      subjectName: s.name,
      questions: s.topics.slice(0, topicLimit ?? s.topics.length).flatMap((t) => [
        { topicId: t.id, kind: 'exam', ...t.exam },
        { topicId: t.id, kind: 'revision', ...t.practice },
      ]),
    }));
}

export function grade(total) {
  if (total >= 91) return 'A1';
  if (total >= 81) return 'A2';
  if (total >= 71) return 'B1';
  if (total >= 61) return 'B2';
  if (total >= 51) return 'C1';
  if (total >= 41) return 'C2';
  if (total >= 33) return 'D';
  return 'E';
}

// answers: { [subjectId]: boolean[] } aligned with buildExam questions.
export function scoreExam(state, classNum, stream, exam, answers) {
  const day = state.day;
  const results = {};
  for (const paper of exam) {
    const correctFlags = answers[paper.subjectId] || [];
    paper.questions.forEach((q, i) => {
      if (q.kind === 'exam' && correctFlags[i]) {
        const rec = topicRecord(state, q.topicId, classNum, paper.subjectId);
        rec.examCorrect = true;
        rec.activities.push(`Exam question: correct (Class ${classNum})`);
        if (!rec.attended) rec.activities.push('Learnt through self-study');
        refreshLevel(rec);
      }
    });
    const correct = correctFlags.filter(Boolean).length;
    const lab = isLabSubject(classNum, paper.subjectId, stream);
    const theoryMax = lab ? 70 : 80;
    const theory = Math.round((correct / paper.questions.length) * theoryMax);
    const attended = lectureAttendance(state, paper.subjectId);
    const subj = getClassSubjects(classNum, stream).find((s) => s.id === paper.subjectId);
    const practiced = subj.topics.filter((t) => state.topics[t.id]?.practiceCorrect).length / subj.topics.length;
    let internal;
    if (lab) internal = Math.round(attended * 10 + (day.practicalsDone[paper.subjectId] ?? 0) * 20);
    else internal = Math.round(attended * 10 + practiced * 10);
    const total = theory + internal;
    results[paper.subjectId] = {
      name: paper.subjectName, theory, theoryMax, internal, internalMax: 100 - theoryMax,
      total, grade: grade(total), passed: total >= PASS_MARK, correct, outOf: paper.questions.length,
    };
  }
  return results;
}

// Share of a course's lectures attended: across the semester in college, today's lesson at school.
export function lectureAttendance(state, subjectId) {
  const held = state.sem?.held?.[subjectId] || 0;
  if (held) return (state.sem.attended[subjectId] || 0) / held;
  return state.day.lessonsDone[subjectId] ? 1 : 0;
}

export function lessonAttendance(state, classNum, stream) {
  const subjects = getClassSubjects(classNum, stream);
  const present = subjects.reduce((sum, s) => sum + lectureAttendance(state, s.id), 0);
  return subjects.length ? present / subjects.length : 1;
}

// College theory marks: 35% mid-semester test, 65% comprehensive exam (the real split varies by course).
export function blendMidsem(results, midsem = {}) {
  for (const [id, r] of Object.entries(results)) {
    if (r.lab || midsem[id] === undefined || !r.outOf) continue;
    r.midsemPct = Math.round(midsem[id] * 100);
    r.theory = Math.round(r.theoryMax * (0.35 * midsem[id] + 0.65 * (r.correct / r.outOf)));
    r.total = r.theory + r.internal;
    r.grade = grade(r.total);
    r.passed = r.total >= PASS_MARK;
  }
  return results;
}

export function evaluatePromotion(state, classNum, stream) {
  const year = ensureYear(state, classNum);
  const results = year.results || {};
  const failed = Object.entries(results).filter(([, r]) => !r.passed).map(([id]) => id);
  const attendance = lessonAttendance(state, classNum, stream);
  const project = getProject(classNum, stream);
  const reasons = [];
  if (failed.length) reasons.push(`${classNum >= 13 ? 'NC (not cleared)' : `Below ${PASS_MARK}%`} in: ${failed.map((id) => results[id].name).join(', ')}`);
  if (classNum < 13 && attendance < ATTENDANCE_REQUIRED) reasons.push(`Lesson attendance ${Math.round(attendance * 100)}% (needs ${ATTENDANCE_REQUIRED * 100}%)`);
  if (project && !state.day.projectDone) reasons.push(`Project not submitted: ${project.name}`);
  return { eligible: reasons.length === 0, failed, attendance, reasons };
}

export function applyRemedial(state, classNum, newResults) {
  const year = ensureYear(state, classNum);
  year.remedial = { subjects: Object.keys(newResults) };
  for (const [id, r] of Object.entries(newResults)) {
    year.results[id] = { ...r, remedial: true };
  }
}

export function promote(state) {
  const year = ensureYear(state);
  year.promoted = true;
  year.attendancePct = Math.round(lessonAttendance(state, state.classNum, state.stream) * 100);
  year.summary = buildYearSummary(state, state.classNum);
  if (state.classNum >= 11) year.stream = state.stream;
  if (state.classNum === 12) {
    state.phase = 'graduated';
    return;
  }
  if (state.classNum === 14) {
    state.phase = 'collegeYearDone';
    return;
  }
  state.classNum += 1;
  state.day = newDay();
  if (state.classNum >= 13) state.sem = newSem();
  state.phase = state.classNum === 11 ? 'orientation' : 'day';
  ensureYear(state);
}

// Repeating keeps every topic record: history is never overwritten.
export function repeatYear(state) {
  const year = ensureYear(state);
  year.previousAttempts.push({ results: year.results, attempt: year.attempts });
  year.attempts += 1;
  year.results = null;
  year.remedial = null;
  state.decisions.push({ classNum: state.classNum, text: `Repeated Class ${state.classNum}` });
  state.day = newDay();
}

export function buildYearSummary(state, classNum) {
  const year = state.years[classNum];
  const stream = year?.stream || (classNum >= 11 ? state.stream : null);
  const subjects = getClassSubjects(classNum, stream);
  const topics = subjects.flatMap((s) => s.topics.map((t) => ({ subject: s, topic: t, rec: state.topics[t.id] })));
  const completed = topics.filter((x) => x.rec && x.rec.level >= 1);
  const understood = topics.filter((x) => x.rec && x.rec.level >= 3);
  const revise = topics.filter((x) => !x.rec || x.rec.level <= 2);
  const results = year?.results || {};
  const ranked = Object.entries(results).sort((a, b) => b[1].total - a[1].total);
  return {
    classNum,
    subjects: subjects.map((s) => s.name),
    topicsCompleted: completed.map((x) => `${x.subject.name}: ${x.topic.name}`),
    conceptsUnderstood: understood.map((x) => `${x.subject.name}: ${x.topic.name}`),
    practicals: state.practicals.filter((p) => p.classNum === classNum),
    projects: state.projects.filter((p) => p.classNum === classNum),
    performance: ranked.map(([, r]) => `${r.name}: ${r.total}/100 (${r.grade})`),
    strongest: ranked.slice(0, 2).map(([, r]) => r.name),
    revise: revise.map((x) => `${x.subject.name}: ${x.topic.name}`),
    newSkills: understood.map((x) => x.topic.name).slice(0, 6),
    certificates: state.certificates.filter((c) => c.classNum === classNum).map((c) => c.title),
  };
}

export function journeyTotals(state) {
  const recs = Object.values(state.topics);
  const subjects = new Set();
  for (const c of Object.keys(state.years)) {
    const y = state.years[c];
    for (const id of Object.keys(y.results || {})) subjects.add(`${y.results[id].name}`);
  }
  const perClass = [];
  const last = state.years[13] ? 14 : 12;
  for (let c = 1; c <= last; c++) {
    const y = state.years[c];
    const res = y?.results ? Object.values(y.results) : [];
    perClass.push({
      classNum: c,
      mastered: recs.filter((r) => r.classNum === c && r.level === 4).length,
      practised: recs.filter((r) => r.classNum === c && r.level >= 3).length,
      introduced: recs.filter((r) => r.classNum === c && r.level >= 1).length,
      avg: res.length ? Math.round(res.reduce((a, r) => a + r.total, 0) / res.length) : null,
    });
  }
  return {
    subjectsStudied: subjects.size,
    topicsIntroduced: recs.filter((r) => r.level >= 1).length,
    topicsMastered: recs.filter((r) => r.level === 4).length,
    practicals: state.practicals.length,
    projects: state.projects.length,
    certificates: state.certificates.length,
    perClass,
  };
}

export function practicalScore(wrongAttempts) {
  if (wrongAttempts === 0) return 1;
  if (wrongAttempts === 1) return 0.7;
  return 0.4;
}

export const PROJECT_QUALITY_SCORE = { excellent: 1, good: 0.75, basic: 0.5 };

export function seniorSubjectInfo(id) {
  return SENIOR_SUBJECTS[id];
}

// ---------- College (BITS-style) grading ----------
export function letterGrade(total) {
  return LETTER_GRADES.find((g) => total >= g.min);
}

// Lab-only courses are graded on the practical.
export function scoreLabs(state, classNum) {
  const out = {};
  for (const lab of getLabCourses(classNum)) {
    const score = state.day.practicalsDone[lab.id];
    const total = score === undefined ? 0 : Math.round(score * 100);
    out[lab.id] = { name: lab.name, theory: 0, theoryMax: 0, internal: total, internalMax: 100, total, grade: grade(total), passed: total >= PASS_MARK, correct: 0, outOf: 0, lab: true };
  }
  return out;
}

export function applyCollegeGrades(classNum, results) {
  const units = Object.fromEntries([...getClassSubjects(classNum), ...getLabCourses(classNum)].map((c) => [c.id, c]));
  let pts = 0;
  let u = 0;
  for (const [id, r] of Object.entries(results)) {
    const g = letterGrade(r.total);
    r.letter = g.letter;
    r.points = g.points;
    r.units = units[id]?.units || 0;
    r.code = units[id]?.code || '';
    pts += g.points * r.units;
    u += r.units;
  }
  return u ? Math.round((pts / u) * 100) / 100 : 0;
}

export function cgpa(state) {
  let pts = 0;
  let u = 0;
  for (const c of [13, 14]) {
    const res = state.years[c]?.results;
    if (!res) continue;
    for (const r of Object.values(res)) {
      if (r.points === undefined) continue;
      pts += r.points * r.units;
      u += r.units;
    }
  }
  return u ? Math.round((pts / u) * 100) / 100 : null;
}

export function startCollege(state) {
  state.classNum = 13;
  state.phase = 'day';
  state.day = newDay();
  state.sem = newSem();
  state.player = null;
  state.decisions.push({ classNum: 12, text: 'Joined BITS Pilani for B.E. Chemical Engineering' });
  ensureYear(state);
}
