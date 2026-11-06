import { CLASSMATES } from '../../data/people.js';

export const SAVE_VERSION = 1;

// Game minutes per real second. Holding Z multiplies the chosen speed by FAST_FORWARD.
export const TIME_SPEEDS = { slow: 0.2, normal: 0.35, fast: 0.6, veryFast: 1 };
export const FAST_FORWARD = 4;

export const DEFAULT_SETTINGS = {
  sensitivity: 1,
  timeScale: TIME_SPEEDS.normal,
  voiceLang: 'en-IN',
  tts: true,
  showObjectiveArrow: true,
  view: 'first',
  graphics: 'high',
  voiceRequired: true,
};

export function createState() {
  const friends = {};
  for (const c of CLASSMATES) friends[c.id] = { level: 10, memories: [], lastTalkDay: null, talksToday: 0 };
  return {
    version: SAVE_VERSION,
    classNum: 1,
    phase: 'day', // day | orientation | graduated
    day: newDay(),
    stream: null,
    streamLocked: false,
    topics: {},
    years: {},
    projects: [],
    practicals: [],
    certificates: [],
    decisions: [],
    friends,
    reputation: 0,
    pocketMoney: 50,
    playerFacts: {},
    orientation: { counsellorMet: false, seniorsMet: [], labsVisited: [], parentsTalked: false },
    player: null,
    settings: { ...DEFAULT_SETTINGS },
    stats: { goals: 0, booksRead: 0, snacks: 0, handsRaised: 0, classmatesHelped: 0, voiceAnswers: 0, voiceActions: 0, anthemsSung: 0, anthemPractice: 0 },
  };
}

export function newDay() {
  return {
    clock: 7 * 60 + 30,
    attendance: {}, // slotId -> 'present' | 'late' | 'absent'
    lessonsDone: {},
    assemblyDone: false,
    anthemDone: false,
    eventDone: false,
    practicalsDone: {},
    projectDone: false,
    optional: { talked: [], goal: false, library: false, canteen: false, helped: false },
    ended: false,
  };
}

export function ensureYear(state, classNum = state.classNum) {
  if (!state.years[classNum]) {
    state.years[classNum] = {
      classNum, attempts: 1, results: null, attendancePct: null, promoted: false, remedial: null,
      events: [], summary: null, previousAttempts: [], stream: null,
    };
  }
  return state.years[classNum];
}

export function topicRecord(state, topicId, classNum, subjectId) {
  if (!state.topics[topicId]) {
    state.topics[topicId] = {
      classNum, subject: subjectId, attended: false, practiceCorrect: false, examCorrect: false,
      level: 0, activities: [], milestone: null,
    };
  }
  return state.topics[topicId];
}

export function adjustFriend(state, npcId, delta, memory) {
  const f = state.friends[npcId];
  if (!f) return;
  f.level = Math.max(0, Math.min(100, f.level + delta));
  if (memory) f.memories.push({ classNum: state.classNum, text: memory });
}

export function activeClassmates(state, classNum = state.classNum) {
  return CLASSMATES.filter((c) => c.joins <= classNum && c.leaves >= classNum);
}
