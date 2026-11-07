import { getClassSubjects, getPracticals } from '../../data/curriculum.js';
import { calendarDay, WEEKLY } from '../../data/college-calendar.js';

const hm = (h, m) => h * 60 + m;
export const fmt = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(Math.floor(mins % 60)).padStart(2, '0')}`;

export const PERIOD = 40;

// One school day per class year: every subject gets one period, plus breaks, lab, sports.
// College days come from the semester calendar: opts = { calDay, pendingLabs }.
export function buildDay(classNum, stream, opts = {}) {
  if (classNum >= 13) return buildCollegeDay(classNum, opts.calDay, opts.pendingLabs);
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

// One BITS day from the semester calendar. Every day starts at the hostel at 7:30 and ends back there at night;
// what happens in between depends on the kind of day.
function buildCollegeDay(classNum, calDay = calendarDay(classNum, 0), pendingLabs = []) {
  const courses = Object.fromEntries(getClassSubjects(classNum).map((c) => [c.id, c]));
  const slots = [];
  let t = hm(7, 30);
  const add = (id, type, label, end, location, extra = {}) => {
    if (end <= t) return;
    slots.push({ id, type, label, start: t, end, location, ...extra });
    t = end;
  };
  const free = (id, label, end) => add(id, 'break', label, end, 'free');
  const evening = () => {
    free('evening', 'Evening · C’not, ANC, the grounds or the Bhawan', hm(21, 0));
    add('departure', 'departure', 'Night · Back to the hostel', hm(22, 0), 'gate');
  };
  const title = calDay.label ? ` · ${calDay.label}` : '';

  if (calDay.kind === 'registration') {
    free('morning', 'Morning · Breakfast at the mess', hm(9, 0));
    add('arrival', 'arrival', 'Course registration · Main Building', hm(13, 0), 'reception');
    add('lunch', 'lunch', 'Lunch · Mess and ANC', hm(14, 0), 'canteen');
    free('afternoon', 'Afternoon · Explore the campus', hm(17, 30));
    evening();
    return slots;
  }

  if (calDay.kind === 'midsem' || calDay.kind === 'compre') {
    const mid = calDay.kind === 'midsem';
    const names = calDay.papers.map((id) => courses[id]?.code || id).join(', ');
    free('morning', 'Morning · Last-minute revision', mid ? hm(9, 0) : hm(9, 30));
    add('exam', 'exam', `${mid ? 'Mid-semester test' : 'Comprehensive exam'} · ${names}`, mid ? hm(10, 30) : hm(12, 30), 'classroom', { papers: calDay.papers, exam: calDay.kind });
    free('after-exam', 'Free time · compare answers at ANC', hm(13, 0));
    add('lunch', 'lunch', 'Lunch · Mess and ANC', hm(14, 0), 'canteen');
    free('afternoon', 'Afternoon · Study for the next paper', hm(17, 30));
    evening();
    return slots;
  }

  if (calDay.kind !== 'class') {
    free('morning', 'Morning · Breakfast at the mess', hm(9, 0));
    free('day', calDay.kind === 'holiday' ? `No classes${title}` : calDay.kind === 'free' ? 'Free day · no classes' : `Classwork suspended${title}`, hm(13, 0));
    add('lunch', 'lunch', 'Lunch · Mess and ANC', hm(14, 0), 'canteen');
    if (calDay.kind === 'sports') {
      free('afternoon', 'Afternoon · Free time', hm(16, 0));
      add('sports', 'sports', 'BOSM · matches at the Gymkhana Grounds', hm(18, 0), 'playground');
    } else if (calDay.kind === 'fest') {
      free('afternoon', `Afternoon · ${calDay.fest} stalls and events`, hm(18, 0));
      add('fest', 'fest', `Evening · ${calDay.fest} pro-night at the Auditorium`, hm(19, 0), 'auditorium');
    } else free('afternoon', 'Afternoon · Free time', hm(17, 30));
    evening();
    return slots;
  }

  const week = WEEKLY[classNum][calDay.weekday] || { lectures: [] };
  free('morning', `Morning · Breakfast at the mess${title}`, hm(8, 0));
  week.lectures.forEach((id, i) => {
    const c = courses[id];
    add(`p${i + 1}`, 'lesson', `Lecture · ${c.code} ${c.name}`, t + 50, 'classroom', { subject: id });
    if (i < week.lectures.length - 1) free(`gap${i + 1}`, 'Break · walk to the next lecture', t + 10);
  });
  free('late-morning', 'Free time · Library, ANC or the Bhawan', hm(12, 30));
  add('lunch', 'lunch', 'Lunch · Mess and ANC', hm(13, 30), 'canteen');
  if (week.lab && pendingLabs.includes(week.lab)) {
    free('pre-lab', 'Afternoon · Head to the lab', hm(14, 0));
    add('lab', 'lab', 'Lab session · FD-II', hm(16, 0), 'sciencelab', { lab: week.lab });
  }
  free('afternoon', 'Afternoon · Free time', hm(17, 30));
  evening();
  return slots;
}
