import { PRIMARY_CLASSES } from './curriculum-primary.js';
import { MIDDLE_CLASSES } from './curriculum-middle.js';
import { SENIOR_A } from './senior-a.js';
import { SENIOR_B } from './senior-b.js';
import { COLLEGE } from './college.js';

export const SENIOR_SUBJECTS = { ...SENIOR_A, ...SENIOR_B };

export const STAGES = {
  Foundational: 'Foundational Stage',
  Preparatory: 'Preparatory Stage',
  Middle: 'Middle Stage',
  Secondary: 'Secondary Stage',
  'Senior Secondary': 'Secondary Stage (Senior)',
  College: 'College · BITS Pilani',
};

export const isCollege = (classNum) => classNum >= 13;

export function stageOf(classNum) {
  if (classNum >= 13) return 'College';
  if (classNum <= 2) return 'Foundational';
  if (classNum <= 5) return 'Preparatory';
  if (classNum <= 8) return 'Middle';
  if (classNum <= 10) return 'Secondary';
  return 'Senior Secondary';
}

export function getClassSubjects(classNum, stream) {
  if (classNum >= 13) return COLLEGE[classNum].courses;
  if (classNum <= 5) return PRIMARY_CLASSES[classNum].subjects;
  if (classNum <= 10) return MIDDLE_CLASSES[classNum].subjects;
  if (!stream) return [];
  return [...stream.subjects, ...(stream.additional ? [stream.additional] : [])].map((id) => {
    const s = SENIOR_SUBJECTS[id];
    return { id, name: s.name, teacher: s.teacher, topics: s.topics[classNum], lab: s.lab, kind: s.kind };
  });
}

export function getPracticals(classNum, stream) {
  if (classNum >= 13) return COLLEGE[classNum].practicals;
  if (classNum <= 5) return [];
  if (classNum <= 10) {
    const p = MIDDLE_CLASSES[classNum].practical;
    return p ? [p] : [];
  }
  return getClassSubjects(classNum, stream)
    .filter((s) => SENIOR_SUBJECTS[s.id].practical?.[classNum])
    .map((s) => ({ subject: s.id, ...SENIOR_SUBJECTS[s.id].practical[classNum] }));
}

export function getProject(classNum, stream) {
  if (classNum >= 13) return COLLEGE[classNum].project;
  if (classNum <= 5) return PRIMARY_CLASSES[classNum].project;
  if (classNum <= 10) return MIDDLE_CLASSES[classNum].project;
  const subj = getClassSubjects(classNum, stream).find((s) => s.kind !== 'language' && SENIOR_SUBJECTS[s.id].project);
  return subj ? { subject: subj.id, ...SENIOR_SUBJECTS[subj.id].project } : null;
}

export function findTopic(topicId) {
  for (const c of [...Object.values(PRIMARY_CLASSES), ...Object.values(MIDDLE_CLASSES)]) {
    for (const s of c.subjects) for (const t of s.topics) if (t.id === topicId) return { topic: t, subject: s };
  }
  for (const [id, s] of Object.entries(SENIOR_SUBJECTS)) {
    for (const cls of [11, 12]) for (const t of s.topics[cls]) if (t.id === topicId) return { topic: t, subject: { id, name: s.name } };
  }
  return null;
}

export function getLabCourses(classNum) {
  return classNum >= 13 ? COLLEGE[classNum].labCourses : [];
}

export function subjectName(classNum, subjectId) {
  if (classNum >= 13) return [...COLLEGE[classNum].courses, ...COLLEGE[classNum].labCourses].find((c) => c.id === subjectId)?.name || subjectId;
  if (classNum >= 11) return SENIOR_SUBJECTS[subjectId]?.name || subjectId;
  const cls = classNum <= 5 ? PRIMARY_CLASSES[classNum] : MIDDLE_CLASSES[classNum];
  return cls.subjects.find((s) => s.id === subjectId)?.name || subjectId;
}
