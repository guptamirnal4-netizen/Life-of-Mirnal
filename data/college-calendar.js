// The semester, one playable day at a time. 13 = Year 1 Semester 1 (Aug–Dec), 14 = Semester 2 (Jan–May).
//
// The order and timing follow the BITS academic calendar structure (2025-26, as published for the
// Hyderabad campus and in the BITS-ISU calendar, which quote the BITS-wide semester dates):
// Sem 1: registration Aug 1, classwork Aug 2, mid-sems Oct 6–11, last day of classes Nov 29,
//        comprehensive exams Dec 1–16. Sem 2: registration Jan 5, classwork Jan 6,
//        mid-sems Mar 9–14, last day of classes Apr 29, comprehensive exams May 2–16.
// Holidays are the national ones on those calendars. Pilani's fest dates (BOSM, Oasis, APOGEE)
// were not in any calendar we could read, so they are placed approximately and marked so.
// The weekly lecture pattern is illustrative, not the official BITS timetable.

export const CALENDAR_NOTE = 'Semester order follows the BITS academic calendar (registration → classes → mid-sems → last class → compre). Fest dates are approximate; the weekly lecture pattern is illustrative.';

const day = (week, weekday, month, kind, extra = {}) => ({ week, weekday, month, kind, ...extra });

export const CALENDAR = {
  13: [
    day(1, 'Fri', 'Aug', 'registration', { label: 'Registration day' }),
    day(1, 'Sat', 'Aug', 'class', { label: 'Classwork begins' }),
    day(2, 'Mon', 'Aug', 'class'),
    day(2, 'Tue', 'Aug', 'class'),
    day(2, 'Wed', 'Aug', 'class'),
    day(2, 'Thu', 'Aug', 'class'),
    day(3, 'Fri', 'Aug', 'holiday', { label: 'Independence Day (holiday)' }),
    day(3, 'Sat', 'Aug', 'class'),
    day(4, 'Mon', 'Aug', 'class', { label: 'Last day to substitute courses' }),
    day(4, 'Wed', 'Aug', 'class'),
    day(5, 'Tue', 'Sep', 'class'),
    day(5, 'Fri', 'Sep', 'class'),
    day(6, 'Sun', 'Sep', 'free', { label: 'Sunday' }),
    day(6, 'Mon', 'Sep', 'class'),
    day(7, 'Thu', 'Sep', 'class'),
    day(7, 'Sat', 'Sep', 'sports', { label: 'BOSM · sports fest (approximate date)' }),
    day(8, 'Tue', 'Sep', 'class'),
    day(8, 'Fri', 'Sep', 'class'),
    day(9, 'Thu', 'Oct', 'holiday', { label: 'Gandhi Jayanti and Dussehra (holiday)' }),
    day(10, 'Mon', 'Oct', 'midsem', { papers: ['math111', 'phy111'] }),
    day(10, 'Wed', 'Oct', 'midsem', { papers: ['chem111', 'bio111'] }),
    day(10, 'Fri', 'Oct', 'midsem', { papers: ['eg110'] }),
    day(11, 'Tue', 'Oct', 'class', { label: 'Mid-sem answer scripts returned' }),
    day(11, 'Thu', 'Oct', 'class'),
    day(12, 'Mon', 'Oct', 'holiday', { label: 'Deepavali (holiday)' }),
    day(12, 'Wed', 'Oct', 'class'),
    day(13, 'Fri', 'Nov', 'fest', { label: 'Oasis · cultural fest (approximate date)', fest: 'Oasis' }),
    day(14, 'Tue', 'Nov', 'class'),
    day(15, 'Thu', 'Nov', 'class'),
    day(16, 'Mon', 'Nov', 'class'),
    day(17, 'Sat', 'Nov', 'class', { label: 'Last day of classes' }),
    day(18, 'Mon', 'Dec', 'compre', { papers: ['math111', 'phy111'] }),
    day(18, 'Thu', 'Dec', 'compre', { papers: ['chem111', 'bio111'] }),
    day(19, 'Mon', 'Dec', 'compre', { papers: ['eg110'] }),
  ],
  14: [
    day(1, 'Mon', 'Jan', 'registration', { label: 'Registration day' }),
    day(1, 'Tue', 'Jan', 'class', { label: 'Classwork begins' }),
    day(1, 'Thu', 'Jan', 'class'),
    day(2, 'Mon', 'Jan', 'class'),
    day(2, 'Wed', 'Jan', 'class'),
    day(3, 'Mon', 'Jan', 'holiday', { label: 'Republic Day (holiday)' }),
    day(3, 'Thu', 'Jan', 'class'),
    day(4, 'Tue', 'Feb', 'class'),
    day(4, 'Fri', 'Feb', 'class'),
    day(5, 'Mon', 'Feb', 'class'),
    day(5, 'Sun', 'Feb', 'free', { label: 'Sunday' }),
    day(6, 'Wed', 'Feb', 'class'),
    day(7, 'Tue', 'Feb', 'class'),
    day(8, 'Mon', 'Mar', 'class'),
    day(9, 'Wed', 'Mar', 'holiday', { label: 'Holi (holiday)' }),
    day(10, 'Mon', 'Mar', 'midsem', { papers: ['math112', 'thermo'] }),
    day(10, 'Wed', 'Mar', 'midsem', { papers: ['math113', 'cs111'] }),
    day(10, 'Fri', 'Mar', 'midsem', { papers: ['eee111', 'trw112'] }),
    day(11, 'Tue', 'Mar', 'class', { label: 'Mid-sem answer scripts returned' }),
    day(12, 'Thu', 'Mar', 'class'),
    day(13, 'Fri', 'Apr', 'fest', { label: 'APOGEE · technical fest (approximate date)', fest: 'APOGEE' }),
    day(14, 'Mon', 'Apr', 'class'),
    day(14, 'Thu', 'Apr', 'class'),
    day(15, 'Tue', 'Apr', 'class'),
    day(16, 'Mon', 'Apr', 'class'),
    day(16, 'Wed', 'Apr', 'class'),
    day(17, 'Wed', 'Apr', 'class', { label: 'Last day of classes' }),
    day(18, 'Sat', 'May', 'compre', { papers: ['math112', 'thermo'] }),
    day(19, 'Tue', 'May', 'compre', { papers: ['math113', 'cs111'] }),
    day(19, 'Fri', 'May', 'compre', { papers: ['eee111', 'trw112'] }),
  ],
};

// Lectures on each weekday, and which lab (if its practical isn't done yet) runs that afternoon.
export const WEEKLY = {
  13: {
    Mon: { lectures: ['math111', 'phy111', 'chem111'], lab: 'phy110' },
    Tue: { lectures: ['bio111', 'math111', 'eg110'] },
    Wed: { lectures: ['phy111', 'chem111', 'bio111'], lab: 'chem110' },
    Thu: { lectures: ['math111', 'eg110', 'phy111'] },
    Fri: { lectures: ['chem111', 'bio111', 'math111'], lab: 'bio110' },
    Sat: { lectures: ['phy111', 'chem111'] },
  },
  14: {
    Mon: { lectures: ['math112', 'thermo', 'cs111'], lab: 'cs111' },
    Tue: { lectures: ['math113', 'eee111', 'trw112'] },
    Wed: { lectures: ['thermo', 'math112', 'cs111'], lab: 'ws112' },
    Thu: { lectures: ['eee111', 'math113', 'trw112'] },
    Fri: { lectures: ['math112', 'thermo', 'eee111'], lab: 'cs111' },
    Sat: { lectures: ['cs111', 'math113'] },
  },
};

export const WEEKDAY_NAMES = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };

export function calendarDay(classNum, index) {
  const cal = CALENDAR[classNum];
  return cal ? cal[Math.max(0, Math.min(index, cal.length - 1))] : null;
}

export function dayTitle(d, index, total) {
  return `Week ${d.week} · ${WEEKDAY_NAMES[d.weekday]} (${d.month}) · Day ${index + 1} of ${total}`;
}

export const isLastDay = (classNum, index) => index >= CALENDAR[classNum].length - 1;
