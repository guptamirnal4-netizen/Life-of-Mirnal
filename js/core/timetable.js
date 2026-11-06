import { getClassSubjects, getPracticals } from '../../data/curriculum.js';

const hm = (h, m) => h * 60 + m;
export const fmt = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(Math.floor(mins % 60)).padStart(2, '0')}`;

export const PERIOD = 40;

// One school day per class year: every subject gets one period, plus breaks, lab, sports.
export function buildDay(classNum, stream) {
  if (classNum >= 13) return buildCollegeDay(classNum);
  const subjects = getClassSubjects(classNum, stream);
  const practicals = getPracticals(classNum, stream);
  const slots = [
    { id: 'arrival', type: 'arrival', label: 'Arrival', start: hm(7, 30), end: hm(7, 50), location: 'gate' },
    { id: 'assembly', type: 'assembly', label: 'Morning Assembly', start: hm(7, 50), end: hm(8, 10), location: 'assembly' },
  ];
  let t = hm(8, 10);
  const lessonRoom = 'classroom';
  subjects.forEach((s, i) => {
    slots.push({ id: `p${i + 1}`, type: 'lesson', label: `Period ${i + 1} · ${s.name}`, subject: s.id, start: t, end: t + PERIOD, location: lessonRoom });
    t += PERIOD;
    if (i === 1) {
      slots.push({ id: 'break', type: 'break', label: 'Short Break', start: t, end: t + 15, location: 'free' });
      t += 15;
    }
    if (i === 3) {
      slots.push({ id: 'lunch', type: 'lunch', label: 'Lunch', start: t, end: t + 30, location: 'canteen' });
      t += 30;
    }
  });
  if (practicals.length) {
    const len = Math.max(PERIOD, practicals.length * 25);
    slots.push({ id: 'lab', type: 'lab', label: 'Practical · Lab', start: t, end: t + len, location: 'sciencelab' });
    t += len;
  }
  slots.push({ id: 'sports', type: 'sports', label: 'Games Period', start: t, end: t + PERIOD, location: 'playground' });
  t += PERIOD;
  slots.push({ id: 'departure', type: 'departure', label: 'Dismissal', start: t, end: t + 60, location: 'gate' });
  return slots;
}

export function currentSlot(slots, clock) {
  return slots.find((s) => clock >= s.start && clock < s.end) || slots[slots.length - 1];
}

export function nextSlot(slots, clock) {
  return slots.find((s) => s.start > clock) || null;
}

// One frame of game time. Stops at the next slot boundary so no timetable change is ever skipped.
export function advanceClock(slots, clock, dt, timeScale, fastForward = 1) {
  const next = nextSlot(slots, clock);
  const limit = next ? next.start : slots[slots.length - 1].end;
  return Math.min(limit, clock + Math.min(dt, 0.05) * timeScale * fastForward);
}

// A BITS day: lectures from 8, a lunch break at the mess/ANC, labs in the afternoon, the fest in the evening.
function buildCollegeDay(classNum) {
  const courses = getClassSubjects(classNum);
  const practicals = getPracticals(classNum);
  const slots = [{ id: 'arrival', type: 'arrival', label: 'Morning · Course registration', start: hm(7, 30), end: hm(8, 0), location: 'reception' }];
  let t = hm(8, 0);
  courses.forEach((c, i) => {
    slots.push({ id: `p${i + 1}`, type: 'lesson', label: `Lecture ${i + 1} · ${c.code} ${c.name}`, subject: c.id, start: t, end: t + 50, location: 'classroom' });
    t += 50;
    if (i === 3) {
      slots.push({ id: 'lunch', type: 'lunch', label: 'Lunch · Mess and ANC', start: t, end: t + 40, location: 'canteen' });
      t += 40;
    }
  });
  if (t < hm(14, 0)) {
    slots.push({ id: 'break', type: 'break', label: 'Afternoon · Free time', start: t, end: hm(14, 0), location: 'free' });
    t = hm(14, 0);
  }
  const len = Math.max(50, practicals.length * 30);
  slots.push({ id: 'lab', type: 'lab', label: 'Labs', start: t, end: t + len, location: 'sciencelab' });
  t += len;
  if (t < hm(17, 30)) {
    slots.push({ id: 'evening', type: 'break', label: 'Evening · C’not, ANC or the grounds', start: t, end: hm(17, 30), location: 'free' });
    t = hm(17, 30);
  }
  slots.push({ id: 'fest', type: 'fest', label: classNum === 13 ? 'Evening · Oasis (cultural fest)' : 'Evening · APOGEE (technical fest)', start: t, end: t + 60, location: 'auditorium' });
  t += 60;
  slots.push({ id: 'departure', type: 'departure', label: 'Night · Back to the hostel', start: t, end: t + 60, location: 'gate' });
  return slots;
}
