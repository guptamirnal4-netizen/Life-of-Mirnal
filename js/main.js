import * as THREE from 'three';
import { Campus } from './world/campus.js';
import { setupGraphics } from './world/environment.js';
import { Player } from './world/player.js';
import { NPC, NPCManager, Ball, studentHeight } from './world/npcs.js';
import { ANTHEM_LINES, ANTHEM_DURATION, ANTHEM_AUDIO_URL, LYRIC_WORDS } from '../data/anthem.js';
import { openAnthemPractice } from './ui/anthempractice.js';
import { createState, ensureYear, activeClassmates, adjustFriend } from './core/state.js';
import { buildDay, currentSlot, nextSlot, fmt } from './core/timetable.js';
import { promote, repeatYear, applyRemedial, scoreLabs, applyCollegeGrades, cgpa, startCollege } from './core/academics.js';
import { COLLEGE, COLLEGE_STAFF, COLLEGE_INTRO, ROADMAP } from '../data/college.js';
import { saveGame, loadGame, hasSave } from './core/save.js';
import { streamGroup } from './core/streams.js';
import { getClassSubjects, getPracticals, getProject, getLabCourses, stageOf, STAGES, isCollege } from '../data/curriculum.js';
import { CLASSMATES, teacherFor, PRINCIPAL, GUARD, CANTEEN, LIBRARIAN, PARENTS } from '../data/people.js';
import { STREAMS, COUNSELLOR, SCHOOL } from '../data/streams.js';
import { h, initUI, openPanel, isOpen, closeTop, toast, onOverlayChange, topPanel, closeAll, setMicHandler } from './ui/dom.js';
import { runLesson, runPractical, runProject, runExam, showReportCard, showYearSummary, runMakeUp } from './ui/academic.js';
import { openSimpleDialogue, runAssembly, openCanteen, runFestEvent } from './ui/dialogue.js';
import { openChat, detectLLM } from './ui/chat.js';
import { openStreamSelection } from './ui/streams.js';
import { openJourney, openFinalPortfolio } from './ui/journey.js';
import { Voice, tokens } from './voice.js';

// ---------- Renderer & scene ----------
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 300);
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

initUI();
setMicHandler(() => handleVoice());
const campus = new Campus(scene);
const player = new Player(camera, canvas);
const npcs = new NPCManager(scene, campus);
const ball = new Ball(scene, campus.fieldBounds);
const gfx = setupGraphics({ renderer, scene, campus });
npcs.setPlayerPos(player.pos);
campus.interactable('assemblyLine', 0, -6, 'Join the assembly line', { radius: 4.5 });
const deskInteract = campus.interactable('mydesk', 0, 0, 'Sit at your desk', { radius: 1.6 });
campus.interactable('registration', 15.5, 38, 'Register for your courses', { radius: 2.6 });
const avatar = new NPC(scene, { id: 'mirnal', name: 'Mirnal', role: 'student', color: '#ffffff', pants: '#24345a', skinIndex: 0 });
avatar.tag.visible = false;
avatar.group.visible = false;

let state = null;
let slots = [];
let lastSlotId = null;
let mode = 'title';
const npcMeta = new Map();
let lastKick = -99;
let elapsed = 0;
let fastForward = false;
let practicalRunning = false;

const voice = new Voice(() => state?.settings || { tts: false, voiceLang: 'en-IN' });
const ctx = {
  get state() { return state; },
  voice,
  setBoard: (lines) => campus.board?.draw(lines),
};

// ---------- Helpers ----------
let audioCtx;
function bell() {
  try {
    audioCtx ||= new AudioContext();
    const t = audioCtx.currentTime;
    for (const [f, d] of [[988, 0], [784, 0.25]]) {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + d);
      g.gain.exponentialRampToValueAtTime(0.12, t + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.9);
      o.connect(g).connect(audioCtx.destination);
      o.start(t + d);
      o.stop(t + d + 1);
    }
  } catch { /* audio unavailable */ }
}

function save(silent = false) {
  if (!state) return;
  state.player = { x: player.pos.x, z: player.pos.z, yaw: player.yaw };
  const ok = saveGame(state);
  if (!silent) toast(ok ? 'Game saved.' : 'Could not save (browser storage unavailable).');
}

function classroomTitle() {
  const c = state.classNum;
  if (c >= 13) return `Lecture Theatre · ${COLLEGE[c].label}`;
  if (c <= 10) return `Class ${c} – Section A`;
  const preset = STREAMS.find((s) => s.id === state.stream?.presetId);
  return `Class ${c} – ${preset ? preset.name : 'Senior'}`;
}

function inMyGroup(cm) {
  if (state.classNum <= 10 || state.classNum >= 13) return true;
  const g = streamGroup(state.stream);
  return cm.futureGroup === (g === 'skill' ? 'science' : g);
}

// ---------- Year setup ----------
function clearWorld() {
  npcs.clear();
  npcMeta.clear();
}

function addNPC(id, meta, opts, at) {
  const n = npcs.add(id, opts);
  npcMeta.set(id, meta);
  if (at) n.teleport(at);
  return n;
}

function spawnStaff() {
  if (isCollege(state.classNum)) {
    const S = COLLEGE_STAFF;
    addNPC('guard', { kind: 'staff', who: S.guard, role: 'guard' }, { name: S.guard.name, title: S.guard.role, role: 'staff', color: '#4b5d7a', pants: '#2b3445', height: 1.7, skinIndex: 1, outfit: 'guard' }, campus.spots.guard);
    addNPC('canteen', { kind: 'staff', who: S.canteen, role: 'canteen' }, { name: S.canteen.name, title: S.canteen.role, role: 'staff', color: '#e8e2d0', pants: '#4a3b2a', height: 1.68, skinIndex: 3 }, new THREE.Vector3(-36, 0, 6.2));
    addNPC('librarian', { kind: 'staff', who: S.librarian, role: 'librarian' }, { name: S.librarian.name, title: S.librarian.role, role: 'staff', color: '#5a6a7a', pants: '#2a2a2a', height: 1.68, skinIndex: 2, outfit: 'formal', gender: 'm' }, campus.spots.librarian);
    addNPC('principal', { kind: 'staff', who: S.principal, role: 'principal' }, { name: S.principal.name, title: S.principal.role, role: 'staff', color: '#3a3a4a', pants: '#2a2a2a', height: 1.7, skinIndex: 4, outfit: 'formal', gender: 'm' }, campus.spots.principal);
    return;
  }
  addNPC('guard', { kind: 'staff', who: GUARD }, { name: GUARD.name, title: GUARD.role, role: 'staff', color: '#4b5d7a', pants: '#2b3445', height: 1.7, skinIndex: 1 }, campus.spots.guard);
  addNPC('canteen', { kind: 'staff', who: CANTEEN }, { name: CANTEEN.name, title: CANTEEN.role, role: 'staff', color: '#e8e2d0', pants: '#4a3b2a', height: 1.68, skinIndex: 3 }, new THREE.Vector3(-36, 0, 6.2));
  addNPC('librarian', { kind: 'staff', who: LIBRARIAN }, { name: LIBRARIAN.name, title: LIBRARIAN.role, role: 'staff', color: '#7a3b6a', pants: '#3a2a3a', height: 1.6, skinIndex: 2 }, campus.spots.librarian);
  addNPC('principal', { kind: 'staff', who: PRINCIPAL }, { name: PRINCIPAL.name, title: PRINCIPAL.role, role: 'staff', color: '#5a2d2d', pants: '#2a2a2a', height: 1.63, skinIndex: 4 }, campus.spots.principal);
}

function spawnClassmates(at) {
  const list = activeClassmates(state);
  list.forEach((cm, i) => {
    const college = isCollege(state.classNum);
    addNPC(`cm:${cm.id}`, { kind: 'classmate', cm }, { name: cm.name, role: 'student', color: cm.color, pants: college ? '#2f4a7a' : state.classNum <= 5 ? '#24345a' : '#3a3f4a', height: studentHeight(Math.min(state.classNum, 12)), skinIndex: i, ...(college ? { outfit: 'casual' } : {}) }, at ? at(i) : null);
  });
}

function spawnTeachers() {
  const subjects = getClassSubjects(state.classNum, state.stream);
  const seen = new Map();
  subjects.forEach((s) => {
    const t = teacherFor(s.teacher, state.classNum);
    const id = `tch:${t.name}`;
    if (seen.has(id)) {
      npcMeta.get(id).subjects.push(s);
      return;
    }
    seen.set(id, true);
    const spot = campus.spots.staffroom[seen.size % campus.spots.staffroom.length];
    addNPC(id, { kind: 'teacher', teacher: t, subjects: [s] }, { name: t.name, title: s.name, role: 'teacher', color: ['#6a8caf', '#a0522d', '#5f7f5f', '#8a6aa8', '#b07a3a', '#4f6f8f'][seen.size % 6], pants: '#333', height: 1.66, skinIndex: seen.size }, spot);
  });
  if (isCollege(state.classNum)) return;
  const pe = teacherFor('t_pe', state.classNum);
  addNPC('tch:pe', { kind: 'teacher', teacher: pe, subjects: [] }, { name: pe.name, title: 'Physical Education', role: 'teacher', color: '#d84a3a', pants: '#1f2a44', height: 1.75, skinIndex: 1 }, campus.spots.staffroom[7]);
}

function loadYear({ intro = true } = {}) {
  clearWorld();
  ensureYear(state);
  player.setClass(state.classNum);
  avatar.setHeight(studentHeight(Math.min(state.classNum, 12)));
  avatar.tag.visible = false;
  player.sensitivity = state.settings.sensitivity;
  lastSlotId = null;
  for (const cm of CLASSMATES) state.friends[cm.id] ||= { level: 10, memories: [], lastTalkDay: null, talksToday: 0 };
  campus.setMode?.(isCollege(state.classNum) ? 'college' : 'school');
  if (state.phase === 'collegeYearDone') return setupCollegeDone(intro);
  if (state.phase === 'orientation') return setupOrientation(intro);
  if (state.phase === 'graduated') return setupGraduated();
  slots = buildDay(state.classNum, state.stream);
  campus.rebuildClassroom(state.classNum, classroomTitle());
  const seat = campus.seats[campus.playerSeatIndex];
  deskInteract.pos.set(seat.desk.x, 1, seat.desk.z + 0.3);
  spawnStaff();
  spawnTeachers();
  spawnClassmates((i) => campus.spots.gate[i % campus.spots.gate.length].clone().add(new THREE.Vector3(0, 0, -4 - i)));
  if (state.classNum === 11) {
    addNPC('counsellor', { kind: 'counsellor' }, { name: COUNSELLOR.name, title: 'Counsellor', role: 'teacher', color: '#2d6a6a', pants: '#333', height: 1.62, skinIndex: 2 }, campus.spots.counsellor);
  }
  if (!state.player) player.place(campus.spots.spawn, 0);
  if (intro) showYearIntro();
}

function showYearIntro() {
  const c = state.classNum;
  if (isCollege(c)) return showCollegeIntro(c);
  const notes = CLASSMATES.filter((cm) => cm.joins === c && cm.joinNote).map((cm) => cm.joinNote);
  const attempt = state.years[c].attempts;
  const project = getProject(c, state.stream);
  openPanel(h('div', {},
    h('div', { class: 'kicker' }, STAGES[stageOf(c)]),
    h('p', {}, c === 1 && attempt === 1
      ? 'Mirnal’s very first day at Sunrise Public School! The gate looks enormous and the school bag is heavy. Somewhere inside, new friends are waiting.'
      : attempt > 1 ? `Mirnal is repeating Class ${c}. Everything learnt last time is still in the Learning Journey, so this is a fresh chance.`
        : `A new school year. Mirnal is taller now, and Class ${c} brings new subjects, new teachers and new challenges.`),
    notes.map((n) => h('p', { class: 'good' }, n)),
    h('h4', {}, 'Today'),
    h('ul', { class: 'clean' },
      h('li', {}, `📅 ${getClassSubjects(c, state.stream).length} lessons: ${getClassSubjects(c, state.stream).map((s) => s.name).join(', ')}`),
      getPracticals(c, state.stream).length ? h('li', {}, `🧪 Lab practical: ${getPracticals(c, state.stream).map((p) => p.name).join('; ')}`) : null,
      project ? h('li', {}, `📁 Project (in the Library): ${project.name}`) : null,
      h('li', {}, '📝 Annual exams after school ends')),
    h('p', { class: 'muted' }, 'Press T for the timetable, M for missions, J for the Learning Journey, H for help.'),
    h('div', { class: 'row' }, h('button', { class: 'primary', 'data-voice': 'start begin go', onclick: () => closeAll() }, 'Start the day'))),
  { title: `Class ${c}${attempt > 1 ? ` (attempt ${attempt})` : ''}` });
}

// ---------- Orientation (after Class 10) ----------
function setupOrientation(intro) {
  slots = [{ id: 'orientation', type: 'orientation', label: 'Stream Orientation Day', start: 0, end: 24 * 60, location: 'auditorium' }];
  state.day.clock = 9 * 60;
  campus.rebuildClassroom(11, 'Class 11 – coming soon!');
  spawnStaff();
  addNPC('counsellor', { kind: 'counsellor' }, { name: COUNSELLOR.name, title: 'Counsellor', role: 'teacher', color: '#2d6a6a', pants: '#333', height: 1.62, skinIndex: 2 }, campus.spots.auditorium);
  const seniorSpots = {
    snr_pcm: campus.spots.sciencelab[0], snr_pcb: campus.spots.sciencelab[3], snr_pcmb: campus.spots.sciencelab[5],
    snr_com: campus.spots.classroomB[4], snr_hum: campus.spots.library[0], snr_voc: campus.spots.complab[1],
  };
  const done = new Set();
  STREAMS.forEach((st, i) => {
    if (done.has(st.senior.id)) return;
    done.add(st.senior.id);
    addNPC(st.senior.id, { kind: 'senior', stream: st }, { name: st.senior.name, role: 'student', color: st.color, pants: '#3a3f4a', height: 1.68, skinIndex: i }, seniorSpots[st.senior.id]);
  });
  addNPC('parents', { kind: 'parents' }, { name: PARENTS.name, role: 'staff', color: '#8a5a8a', pants: '#3a3a3a', height: 1.66, skinIndex: 0 }, campus.spots.parents);
  const tanvi = CLASSMATES.find((c) => c.id === 'tanvi');
  addNPC('cm:tanvi', { kind: 'farewell', cm: tanvi }, { name: tanvi.name, role: 'student', color: tanvi.color, pants: '#3a3f4a', height: studentHeight(10), skinIndex: 2 }, new THREE.Vector3(2.5, 0, 46));
  CLASSMATES.filter((c) => c.leaves >= 11).forEach((cm, i) => {
    addNPC(`cm:${cm.id}`, { kind: 'classmate', cm }, { name: cm.name, role: 'student', color: cm.color, pants: '#3a3f4a', height: studentHeight(10), skinIndex: i }, campus.spots.assembly[i * 3]);
  });
  if (!state.player) player.place(campus.spots.spawn, 0);
  if (intro) {
    openPanel(h('div', {},
      h('p', {}, 'Class 10 is done! Today is Stream Orientation Day. Mirnal must choose the subjects for Classes 11 and 12.'),
      h('ul', { class: 'clean' },
        h('li', {}, `🎓 Meet ${COUNSELLOR.name} in the Auditorium (required)`),
        h('li', {}, '🧑‍🎓 Talk to seniors from each stream: Science Lab, Classroom B, Library, Computer Lab'),
        h('li', {}, '🔬 Visit the labs and classrooms'),
        h('li', {}, '👪 Talk it over with your parents at the gate')),
      h('p', { class: 'warn' }, tanvi.leaveNote),
      h('div', { class: 'row' }, h('button', { class: 'primary', onclick: () => closeAll() }, 'Let’s explore'))), { title: 'Stream Orientation Day' });
  }
}

function showCollegeIntro(c) {
  const y = COLLEGE[c];
  openPanel(h('div', {},
    h('div', { class: 'kicker' }, `BITS Pilani · ${y.period}`),
    COLLEGE_INTRO[c].map((p) => h('p', {}, p)),
    h('h4', {}, 'Today'),
    h('ul', { class: 'clean' },
      c === 13 ? h('li', {}, '📝 Register for your courses at Academic Registration') : null,
      h('li', {}, `🎓 Lectures: ${y.courses.map((x) => `${x.code} ${x.name}`).join(' · ')}`),
      h('li', {}, `🧪 Labs: ${y.practicals.map((p) => p.name).join('; ')}`),
      h('li', {}, `📁 Assignment (at the Library project table): ${y.project.name}`),
      h('li', {}, `🎉 Evening: ${c === 13 ? 'Oasis' : 'APOGEE'} at the Auditorium`),
      h('li', {}, '📝 Midsems and the Comprehensive exam after the day')),
    h('p', { class: 'muted small' }, 'Courses follow BITS Pilani’s published first-year list. Professors, batchmates and events in the story are fictional.'),
    h('div', { class: 'row' }, h('button', { class: 'primary', 'data-voice': 'start begin go', onclick: () => closeAll() }, 'Start the day'))),
  { title: `College Journey · ${y.label}` });
}

function setupCollegeDone(intro) {
  slots = [{ id: 'yeardone', type: 'graduated', label: 'Year 1 complete', start: 0, end: 24 * 60, location: 'assembly' }];
  state.day.clock = 18 * 60;
  campus.rebuildClassroom(14, 'Year 1 complete!');
  spawnStaff();
  spawnClassmates((i) => campus.spots.assembly[(i * 3 + 2) % campus.spots.assembly.length]);
  if (!state.player) player.place(campus.spots.assemblyPlayer, 0);
  if (intro) showRoadmap();
}

function showRoadmap() {
  const sg = (c) => state.years[c]?.sgpa;
  openPanel(h('div', {},
    h('p', {}, 'First year is done: new friends, two fests, fifteen courses, and a lot of ANC chai. In the second year, the real Chemical Engineering courses begin.'),
    h('div', { class: 'tiles' },
      h('div', { class: 'tile' }, h('div', { class: 'tile-n' }, sg(13) ?? '–'), h('div', { class: 'tile-l' }, 'SGPA · Semester 1')),
      h('div', { class: 'tile' }, h('div', { class: 'tile-n' }, sg(14) ?? '–'), h('div', { class: 'tile-l' }, 'SGPA · Semester 2')),
      h('div', { class: 'tile' }, h('div', { class: 'tile-n' }, cgpa(state) ?? '–'), h('div', { class: 'tile-l' }, 'CGPA after Year 1'))),
    h('h4', {}, 'The road ahead (from Mirnal’s real resume)'),
    h('ul', { class: 'clean roadmap' }, ROADMAP.map((r) => h('li', {}, h('b', {}, r.when), ` · ${r.what}`))),
    h('p', { class: 'muted small' }, 'Years 2–4 are the next chapters of this game.'),
    h('div', { class: 'row' },
      h('button', { onclick: () => openJourney(ctx, 14) }, 'Open the Learning Journey'),
      h('button', { class: 'primary', onclick: () => closeAll() }, 'Walk around campus'))),
  { title: '🎓 Year 1 complete · BITS Pilani', wide: true, closable: true });
}

function beginCollege() {
  startCollege(state);
  save(true);
  closeAll();
  loadYear();
}

function setupGraduated() {
  slots = [{ id: 'graduated', type: 'graduated', label: 'Graduated!', start: 0, end: 24 * 60, location: 'assembly' }];
  state.day.clock = 17 * 60;
  campus.rebuildClassroom(12, 'Class of Mirnal: Graduated!');
  spawnStaff();
  npcs.get('principal').teleport(campus.spots.stage);
  CLASSMATES.filter((c) => c.leaves >= 12).forEach((cm, i) => addNPC(`cm:${cm.id}`, { kind: 'classmate', cm }, { name: cm.name, role: 'student', color: cm.color, pants: '#3a3f4a', height: studentHeight(12), skinIndex: i }, campus.spots.assembly[i + 2]));
  if (!state.player) player.place(campus.spots.assemblyPlayer, 0);
}

// ---------- NPC scheduling ----------
function scheduleNPCs(slot) {
  const cms = [...npcMeta.entries()].filter(([, m]) => m.kind === 'classmate');
  const seats = campus.seats.filter((_, i) => i !== campus.playerSeatIndex);
  let seatI = 0;
  let bI = 0;
  cms.forEach(([id, m], i) => {
    const n = npcs.get(id);
    n.chase = null;
    const cm = m.cm;
    switch (slot.type) {
      case 'arrival':
      case 'assembly':
        npcs.send(id, null, campus.spots.assembly[(i * 2 + 1) % campus.spots.assembly.length], { face: Math.PI });
        break;
      case 'lesson':
        if (inMyGroup(cm)) {
          const seat = seats[(seatI++ * 2 + 1) % seats.length];
          npcs.send(id, 'classroom', seat.pos, { sit: true, face: Math.PI });
        } else npcs.send(id, 'classroomB', campus.spots.classroomB[bI++ % campus.spots.classroomB.length], { sit: true, face: Math.PI });
        break;
      case 'break':
        if (['football', 'cricket', 'kho-kho', 'badminton'].includes(cm.sport)) npcs.send(id, null, campus.spots.playground[i * 3 % 16]);
        else if (cm.personality === 'Introverted' || cm.personality === 'Helpful') npcs.send(id, 'library', campus.spots.library[i % campus.spots.library.length]);
        else npcs.send(id, null, campus.spots.canteen[i % campus.spots.canteen.length]);
        break;
      case 'lunch':
        npcs.send(id, null, campus.spots.canteen[(i * 3) % campus.spots.canteen.length]);
        break;
      case 'lab':
        if (inMyGroup(cm)) npcs.send(id, 'sciencelab', campus.spots.sciencelab[i % campus.spots.sciencelab.length], { face: Math.PI });
        else npcs.send(id, 'library', campus.spots.library[i % campus.spots.library.length]);
        break;
      case 'sports':
        if (cm.sport === 'football' || cm.personality === 'Competitive') {
          n.chase = new THREE.Vector3(i % 2 ? 22 : 54, 0, 9);
          n.path = [];
        } else npcs.send(id, null, campus.spots.playground[(i * 5) % 16]);
        break;
      case 'fest':
        npcs.send(id, 'auditorium', new THREE.Vector3(-36 + (i % 4) * 1.6, 0, 26 + Math.floor(i / 4) * 2.2), { face: -Math.PI / 2 });
        break;
      case 'departure':
        npcs.send(id, null, i % 2 ? new THREE.Vector3(-13 + (i % 3), 0, 41.5) : campus.spots.gate[i % campus.spots.gate.length]);
        break;
      default:
    }
  });
  // Teachers
  let staffI = 0;
  let labAssigned = false;
  for (const [id, m] of npcMeta) {
    if (m.kind !== 'teacher') continue;
    const teaching = slot.type === 'lesson' && m.subjects.some((s) => s.id === slot.subject);
    if (id === 'tch:pe') {
      if (slot.type === 'sports') npcs.send(id, null, new THREE.Vector3(38, 0, 2));
      else npcs.send(id, 'staffroom', campus.spots.staffroom[7]);
    } else if (teaching) npcs.send(id, 'classroom', campus.spots.teacherFront, { face: 0 });
    else if (slot.type === 'lab' && !labAssigned && m.subjects.some((s) => getPracticals(state.classNum, state.stream).some((p) => p.subject === s.id))) {
      labAssigned = true;
      npcs.send(id, 'sciencelab', campus.spots.labTeacher, { face: 0 });
    } else if (slot.type === 'assembly') npcs.send(id, null, new THREE.Vector3(-9 + staffI++ * 1.4, 0, -13), { face: 0 });
    else npcs.send(id, 'staffroom', campus.spots.staffroom[staffI++ % 7]);
  }
  const principal = npcs.get('principal');
  if (principal) {
    if (slot.type === 'assembly' || slot.type === 'arrival') npcs.send('principal', null, campus.spots.stage, { face: 0 });
    else npcs.send('principal', 'principal', campus.spots.principal, { face: 0 });
  }
}

// ---------- Slot flow ----------
function onSlotChange(slot, prev) {
  if (prev && prev.type === 'lesson' && !state.day.lessonsDone[prev.subject]) {
    state.day.attendance[prev.id] = 'absent';
    toast(`You missed ${prev.label.split('· ')[1]}. Marked absent.`, 3500);
  }
  if (prev) bell();
  if (prev) toast(`🔔 ${fmt(slot.start)} · ${slot.label}`);
  scheduleNPCs(slot);
  if (slot.type === 'lesson') {
    const s = getClassSubjects(state.classNum, state.stream).find((x) => x.id === slot.subject);
    campus.board.draw([s.name, ...s.topics.map((t) => `• ${t.name}`)]);
  } else if (slot.type === 'break' || slot.type === 'lunch') campus.board.draw([slot.label, 'Enjoy your break!', 'Wash your hands before eating']);
}

function startLessonIfReady(slot) {
  if (slot.type !== 'lesson' || state.day.lessonsDone[slot.subject] || isOpen()) return;
  if (!player.seated || player.seated.index !== campus.playerSeatIndex) return;
  const subject = getClassSubjects(state.classNum, state.stream).find((x) => x.id === slot.subject);
  state.day.attendance[slot.id] = state.day.clock > slot.start + 15 ? 'late' : 'present';
  if (state.day.attendance[slot.id] === 'late') toast('You were late, but you made it.');
  exitLock();
  runLesson(ctx, { subject, classNum: state.classNum }, () => {
    state.day.clock = Math.max(state.day.clock, slot.end);
    save(true);
  });
}

function endDay() {
  if (state.day.ended) return;
  state.day.ended = true;
  exitLock();
  save(true);
  const c = state.classNum;
  const project = getProject(c, state.stream);
  openPanel(h('div', {},
    h('p', {}, isCollege(c) ? 'The day is over, and the rest of the semester flies by: tut tests, lab reports and late nights at ANC.' : 'The school day is over, and the rest of the term flies by: homework, revision and a few late nights.'),
    project && !state.day.projectDone ? h('p', { class: 'warn' }, `⚠ Your project "${project.name}" was not submitted. You can submit it late from the report card.`) : null,
    h('p', {}, isCollege(c) ? 'Tutorials, quizzes and midsems come and go. Now: the Comprehensive examination (Compre).' : c === 10 || c === 12 ? 'Now: the CBSE Board Examinations (simulated).' : 'Now: the Annual Examinations.'),
    h('div', { class: 'row' }, h('button', { class: 'primary', 'data-voice': 'begin exams start', onclick: () => { closeAll(); startExams(); } }, 'Go to the exam hall'))), { title: `End of Class ${c}` });
}

function startExams() {
  const c = state.classNum;
  runExam(ctx, c, {}, (results) => {
    const year = ensureYear(state, c);
    year.results = results;
    if (isCollege(c)) {
      Object.assign(results, scoreLabs(state, c));
      year.sgpa = applyCollegeGrades(c, results);
    }
    save(true);
    openReport();
  });
}

function openReport() {
  const c = state.classNum;
  showReportCard(ctx, c, {
    onPromote: () => showYearSummary(ctx, c, () => {
      promote(state);
      state.player = null;
      save(true);
      if (state.phase === 'graduated') runGraduation();
      else loadYear();
      if (state.phase === 'collegeYearDone') save(true);
    }),
    onMakeUp: () => runMakeUp(ctx, c, openReport),
    onLateProject: () => runProject(ctx, c, { late: true }, openReport),
    onRemedial: (failed) => runExam(ctx, c, { onlySubjects: failed, remedial: true }, (res) => {
      applyRemedial(state, c, res);
      if (isCollege(c)) state.years[c].sgpa = applyCollegeGrades(c, state.years[c].results);
      save(true);
      openReport();
    }),
    onRedoLabs: () => {
      const pending = getPracticals(c).filter((p) => (state.years[c].results[p.subject]?.passed === false) || state.day.practicalsDone[p.subject] === undefined);
      const next = () => {
        const p = pending.shift();
        if (!p) {
          Object.assign(state.years[c].results, scoreLabs(state, c));
          state.years[c].sgpa = applyCollegeGrades(c, state.years[c].results);
          save(true);
          openReport();
          return;
        }
        runPractical(ctx, p, c, next);
      };
      next();
    },
    onRepeat: () => {
      repeatYear(state);
      state.player = null;
      save(true);
      loadYear();
    },
  });
}

function runGraduation() {
  const preset = STREAMS.find((s) => s.id === state.stream?.presetId);
  openPanel(h('div', {},
    h('p', {}, `The auditorium is full. ${PRINCIPAL.name} calls the name: “Mirnal!” Mirnal walks up and receives the school-leaving certificate${preset ? `, ${preset.name}` : ''}.`),
    h('p', {}, 'Twelve years. Thousands of bells. One last photo with friends on the assembly ground.'),
    h('div', { class: 'row' }, h('button', { class: 'primary', 'data-voice': 'open journey portfolio', onclick: () => {
      closeAll();
      loadYear({ intro: false });
      openFinalPortfolio(ctx);
    } }, 'Open “The School Journey of Mirnal”'),
    h('button', { 'data-voice': 'college bits begin', onclick: () => beginCollege() }, 'Begin the College Journey (BITS Pilani) →'))), { title: 'Graduation Day 🎓' });
}

// ---------- Interactions ----------
function assemblyLabel() {
  const slot = currentSlot(slots, state.day.clock);
  if (slot.type === 'arrival') return '🎤 You’re early! Practise the National Anthem';
  if (slot.type === 'assembly' && !state.day.anthemDone) return 'Stand in line for the National Anthem';
  return 'Join the assembly line';
}

function interactTarget() {
  const pos = player.pos;
  const npc = npcs.nearest(pos, 2.3);
  const f = player.forward();
  let best = null;
  let bestD = Infinity;
  for (const it of campus.interactables) {
    if (it.id === 'mydesk' && (state.phase !== 'day' || player.seated)) continue;
    if (it.id === 'registration' && !isCollege(state.classNum)) continue;
    if (it.id === 'assemblyLine' && isCollege(state.classNum)) continue;
    const d = Math.hypot(it.pos.x - pos.x, it.pos.z - pos.z);
    if (d > it.radius) continue;
    const dir = new THREE.Vector3(it.pos.x - pos.x, 0, it.pos.z - pos.z).normalize();
    if (d > 1 && dir.dot(f) < 0.2) continue;
    if (d < bestD) {
      best = it;
      bestD = d;
    }
  }
  if (npc) {
    const dn = Math.hypot(npc.pos.x - pos.x, npc.pos.z - pos.z);
    if (!best || dn < bestD) return { npc, label: `Talk to ${npc.name}` };
  }
  if (best?.id === 'assemblyLine') return { it: best, label: assemblyLabel() };
  return best ? { it: best, label: best.label } : null;
}

function interact() {
  if (player.seated) {
    const slot = currentSlot(slots, state.day.clock);
    if (slot.type === 'lesson' && !state.day.lessonsDone[slot.subject]) {
      toast('Class is about to start. Stay seated!');
      return;
    }
    player.stand();
    return;
  }
  const t = interactTarget();
  if (!t) return;
  exitLock();
  if (t.npc) return talkTo(t.npc);
  handleInteractable(t.it.id);
}

// Everything a character could truthfully know right now, for grounded replies.
function chatContext(extraFacts = []) {
  const clock = state.day.clock;
  const slot = currentSlot(slots, clock);
  const next = nextSlot(slots, clock);
  const subjects = state.phase === 'day' ? getClassSubjects(state.classNum, state.stream) : [];
  const lessons = subjects.filter((s) => state.day.lessonsDone[s.id]).map((s) => {
    const practisedTopic = s.topics.find((t) => state.topics[t.id]?.practiceCorrect);
    const topic = practisedTopic || s.topics[0];
    return {
      id: s.id, name: s.name, topicName: topic.name, teachFirst: topic.teach.split(/(?<=\.)\s/)[0],
      practised: !!practisedTopic, teacherName: teacherFor(s.teacher, state.classNum).name,
    };
  });
  const brk = slots.find((s) => (s.type === 'break' || s.type === 'lunch') && s.start > clock);
  const lunch = slots.find((s) => s.type === 'lunch');
  const preset = STREAMS.find((s) => s.id === state.stream?.presetId);
  const project = getProject(state.classNum, state.stream);
  const weak = subjects.flatMap((s) => s.topics).find((t) => (state.topics[t.id]?.level ?? 0) < 3);
  const others = [...CLASSMATES.map((c) => c.name)];
  const facts = [
    isCollege(state.classNum) ? `Mirnal is a first-year B.E. Chemical Engineering student at BITS Pilani (${COLLEGE[state.classNum].label}).` : `Mirnal is in Class ${state.classNum} at ${SCHOOL.name}.`,
    slot ? `Right now: ${slot.label} (${fmt(clock)}).` : '',
    next ? `Next: ${next.label} at ${fmt(next.start)}.` : '',
    lessons.length ? `Lessons Mirnal attended today: ${lessons.map((l) => `${l.name} (${l.topicName})`).join(', ')}.` : 'No lessons attended yet today.',
    state.playerFacts?.favSubject ? `Mirnal once said their favourite subject is ${state.playerFacts.favSubject}.` : '',
    state.playerFacts?.hobby ? `Mirnal once said they like ${state.playerFacts.hobby}.` : '',
    state.playerFacts?.bitsat ? `Mirnal told friends their BITSAT score was ${state.playerFacts.bitsat}/390.` : '',
    state.playerFacts?.hometown ? `Mirnal is from ${state.playerFacts.hometown}.` : '',
    preset ? `Mirnal's stream: ${preset.name}.` : '',
    ...extraFacts,
  ].filter(Boolean);
  return {
    classNum: state.classNum, clock, slot: slot && { type: slot.type, label: slot.label },
    nextSlot: next && { label: next.label, time: fmt(next.start) }, nextBreak: brk ? (brk.type === 'lunch' ? 'lunch break' : isCollege(state.classNum) ? 'free period' : brk.label.toLowerCase()) : null,
    lunchTime: lunch ? fmt(lunch.start) : null, lessons, playerStream: preset?.name || null,
    projectName: project?.name || null, weakTopic: weak?.name || null, others,
    college: isCollege(state.classNum), cgpa: isCollege(state.classNum) ? cgpa(state) : null, playerFacts: state.playerFacts || {}, festName: isCollege(state.classNum) ? (state.classNum === 13 ? 'Oasis' : 'APOGEE') : null,
    othersInfo: Object.fromEntries(CLASSMATES.map((c) => [c.name.toLowerCase(), c])), facts,
  };
}

function talkTo(npc, firstText = null) {
  const m = npcMeta.get(npc.id);
  if (!m) return;
  if (m.kind === 'classmate') {
    const cm = m.cm;
    const f = state.friends[cm.id];
    return openChat(ctx, {
      name: cm.name, kind: 'classmate', npc: cm, friendId: cm.id, subtitle: cm.personality, seed: cm.name.length,
      persona: `${cm.name}, ${cm.college ? `Mirnal's first-year batchmate at BITS Pilani (${cm.discipline})` : `Mirnal's classmate (same age, Class ${state.classNum})`}. Personality: ${cm.personality}. ${cm.college ? `Branch: ${cm.discipline}. BITSAT score: ${cm.bitsat}/390. From ${cm.hometown}. ` : ''}Loves ${cm.interest}; plays ${cm.sport}. Good at ${cm.strengths.join(', ')}; finds ${cm.weak.join(', ')} hard. Friendship with Mirnal: ${f.level}/100.`,
      context: () => {
        const c = chatContext([`${cm.name}'s memories with Mirnal: ${f.memories.slice(-4).map((x) => `Class ${x.classNum}: ${x.text}`).join('; ') || 'none yet'}.`]);
        return { ...c, friendLevel: f.level, memories: f.memories, others: c.others.filter((n) => n !== cm.name) };
      },
    }, { firstText });
  }
  if (m.kind === 'teacher') {
    const t = m.teacher;
    return openChat(ctx, {
      name: t.name, kind: 'teacher', npc: t, subtitle: m.subjects.map((s) => s.name).join(', ') || 'Physical Education', seed: t.name.length,
      persona: `${t.name}, Mirnal's ${m.subjects.map((s) => s.name).join(' and ') || 'Physical Education'} ${isCollege(state.classNum) ? 'professor at BITS Pilani' : 'teacher'} (${t.style}). Addressed as ${t.honorific}. Warm but professional.`,
      context: () => {
        const teacherSubjects = m.subjects.map((s) => ({ id: s.id, name: s.name, topics: s.topics.map((x) => ({ name: x.name, teach: x.teach, practised: !!state.topics[x.id]?.practiceCorrect })) }));
        const c = chatContext([`Topics this teacher teaches this year: ${teacherSubjects.flatMap((s) => s.topics.map((x) => `${x.name}: ${x.teach}`)).join(' | ') || 'sports and fitness'}.`]);
        return { ...c, teacherSubjects };
      },
    }, { firstText });
  }
  if (m.kind === 'counsellor') return counsellorTalk();
  if (m.kind === 'senior') {
    if (!state.orientation.seniorsMet.includes(m.stream.senior.id)) state.orientation.seniorsMet.push(m.stream.senior.id);
    const st = STREAMS.filter((s) => s.senior.id === m.stream.senior.id);
    const info = `${st.map((s) => s.senior.line).join(' ')} A normal week has things like ${st[0].experiences.join(', ').toLowerCase()}.`;
    return openChat(ctx, {
      name: m.stream.senior.name, kind: 'staff', staffRole: 'senior', npc: { name: m.stream.senior.name }, seed: 3,
      persona: `${m.stream.senior.name}, a friendly Class 12 student helping juniors choose streams. Speaks from experience of ${st[0].name}.`,
      context: () => ({ ...chatContext([`About ${st[0].name}: ${st[0].blurb} ${info}`]), seniorInfo: info }),
    }, { firstText });
  }
  if (m.kind === 'parents') {
    return openSimpleDialogue(ctx, PARENTS.name, [
      'Beta, we are proud of you no matter which stream you pick.',
      'What do you actually enjoy studying? Forget what relatives say for a moment.',
    ], [
      { label: 'I want to choose what I enjoy most', go: (close) => { state.orientation.parentsTalked = true; state.decisions.push({ classNum: 10, text: 'Told parents: choose by interest' }); close(); toast('Your parents smile. “Then that is what matters.”'); } },
      { label: 'I want to keep the most options open', go: (close) => { state.orientation.parentsTalked = true; state.decisions.push({ classNum: 10, text: 'Told parents: keep options open' }); close(); toast('“Just make sure you can handle the workload.”'); } },
    ]);
  }
  if (m.kind === 'farewell') {
    return openSimpleDialogue(ctx, m.cm.name, [
      'So… my family is moving after Class 10. New city, new school.',
      `I'll miss this place. And you, Mirnal. Don't forget me, okay?`,
    ], [{ label: 'I won’t. Let’s stay in touch!', go: (close) => { adjustFriend(state, 'tanvi', 10, 'we promised to stay in touch'); close(); toast('Tanvi waves goodbye.'); } }]);
  }
  if (m.kind === 'staff') {
    const who = m.who;
    const role = m.role || (who === LIBRARIAN ? 'librarian' : who === CANTEEN ? 'canteen' : who === GUARD ? 'guard' : 'principal');
    return openChat(ctx, {
      name: who.name, kind: 'staff', staffRole: role, npc: who, subtitle: who.role, seed: who.name.length,
      persona: `${who.name}, ${isCollege(state.classNum) ? `${who.role} staff at BITS Pilani` : `the school's ${who.role.toLowerCase()} at ${SCHOOL.name}`}. Kind, calls students "beta" if not the principal.`,
      context: () => chatContext(role === 'canteen' ? ['Canteen menu: samosa ₹15, vada pav ₹20, idli plate ₹25, banana ₹5.'] : []),
      onAction: (action) => {
        if (action === 'open_canteen') setTimeout(() => openCanteen(ctx), 900);
        if (action === 'read_book') readBook();
      },
    }, { firstText });
  }
}

function counsellorTalk() {
  if (state.phase === 'orientation') {
    const first = !state.orientation.counsellorMet;
    state.orientation.counsellorMet = true;
    return openSimpleDialogue(ctx, COUNSELLOR.name, first ? COUNSELLOR.lines : ['Ready to decide? Remember, you can still change during the first morning of Class 11.'], [
      { label: 'Show me the streams', go: (close) => { close(); chooseStream(); } },
    ]);
  }
  if (state.classNum === 11 && !state.streamLocked) {
    const slot = currentSlot(slots, state.day.clock);
    const windowOpen = ['arrival', 'assembly'].includes(slot.type);
    return openSimpleDialogue(ctx, COUNSELLOR.name, [windowOpen ? 'Subject changes are open until Period 1 starts this morning.' : 'The change window has closed for this year. Subjects are now locked.'],
      windowOpen ? [{ label: 'Change my subjects', go: (close) => { close(); chooseStream(true); } }] : []);
  }
  return openSimpleDialogue(ctx, COUNSELLOR.name, ['How are you finding your subjects? Remember to balance study and rest.']);
}

function chooseStream(isChange = false) {
  openStreamSelection(ctx, {
    current: isChange ? state.stream : null,
    title: isChange ? 'Change Class 11 subjects' : 'Class 11: Choose Your Stream',
    onConfirm: (stream) => {
      const preset = STREAMS.find((s) => s.id === stream.presetId);
      state.stream = stream;
      ensureYear(state, 11).stream = stream;
      state.decisions.push({ classNum: isChange ? 11 : 10, text: `${isChange ? 'Changed to' : 'Chose'} ${preset.name}: ${stream.subjects.map((id) => id.toUpperCase()).join(', ')}${stream.additional ? ` + ${stream.additional.toUpperCase()}` : ''}` });
      if (!isChange) {
        state.phase = 'day';
        state.player = null;
        save(true);
        toast(`Welcome to Class 11, ${preset.name}!`, 3500);
        loadYear();
      } else {
        const clock = state.day.clock;
        state.player = { x: player.pos.x, z: player.pos.z, yaw: player.yaw };
        loadYear({ intro: false });
        state.day.clock = clock;
        save(true);
        toast('Subjects updated. Your timetable has changed.');
      }
    },
  });
}

function readBook() {
  const books = state.classNum <= 4 ? ['The Thirsty Crow', 'Panchatantra Tales', 'My First Atlas'] : state.classNum <= 8 ? ['Malgudi Days', 'The Jungle Book', 'Wings of Fire'] : ['The Discovery of India', 'A Brief History of Time', 'Sapiens'];
  const b = books[(state.stats.booksRead + state.classNum) % books.length];
  state.stats.booksRead += 1;
  state.day.optional.library = true;
  state.reputation += 1;
  state.day.clock += 10;
  toast(`📖 Mirnal reads “${b}” for a while. (+10 minutes)`, 3200);
}

function handleInteractable(id) {
  const c = state.classNum;
  const slot = currentSlot(slots, state.day.clock);
  switch (id) {
    case 'mydesk': {
      const seat = campus.seats[campus.playerSeatIndex];
      player.sit(seat.pos, 0);
      player.seated.index = campus.playerSeatIndex;
      toast('You sit at your desk. Lessons start automatically at the bell.');
      requestLock();
      break;
    }
    case 'door': toast(campus.toggleDoor() ? 'Door opened.' : 'Door closed.'); requestLock(); break;
    case 'assemblyLine':
      if (slot.type === 'arrival') {
        openAnthemPractice(ctx, () => requestLock());
        break;
      }
      if (slot.type === 'assembly' && !state.day.assemblyDone) {
        if (!state.day.anthemDone) startAnthem(() => { exitLock(); runAssembly(ctx, () => requestLock()); });
        else runAssembly(ctx, () => requestLock());
      }
      else if (state.phase === 'graduated') openFinalPortfolio(ctx);
      else { toast(state.day.assemblyDone ? 'Assembly is over for today.' : 'Assembly happens at 7:50.'); requestLock(); }
      break;
    case 'noticeboard': openNoticeBoard(); break;
    case 'bell': toast('The school bell. It rings at every period change.'); requestLock(); break;
    case 'blackboard': openPanel(h('p', {}, 'The blackboard shows today\'s lesson topics. They update every period.'), { title: 'Blackboard', closable: true }); break;
    case 'register': {
      const present = Object.values(state.day.attendance).filter((a) => a !== 'absent').length;
      toast(`Attendance register: Mirnal present for ${present} period(s) today.`);
      requestLock();
      break;
    }
    case 'bookshelf': readBook(); requestLock(); break;
    case 'projectTable': {
      if (state.phase !== 'day') return toast('Nothing to work on today.');
      if (state.day.projectDone) { toast('Project already submitted.'); requestLock(); break; }
      runProject(ctx, c, {}, () => { save(true); requestLock(); });
      break;
    }
    case 'labBench': {
      if (c <= 5) { toast('The science lab is for Class 6 and above. Soon!'); requestLock(); break; }
      if (slot.type !== 'lab') { toast('Practicals happen in the lab period. Check the timetable (T).'); requestLock(); break; }
      const pending = getPracticals(c, state.stream).filter((p) => state.day.practicalsDone[p.subject] === undefined);
      if (!pending.length) { toast('All practicals done for today.'); requestLock(); break; }
      practicalRunning = true;
      const runNext = () => {
        const p = pending.shift();
        if (!p) {
          practicalRunning = false;
          save(true);
          requestLock();
          return;
        }
        runPractical(ctx, p, c, runNext);
      };
      runNext();
      break;
    }
    case 'microscope': toast(c >= 6 ? 'Through the eyepiece: tiny cells, neatly arranged like bricks in a wall.' : 'It\'s a microscope! You\'ll get to use it in Class 6.'); requestLock(); break;
    case 'computer':
      if (c < 3) toast('The computer lab is for Class 3 and above.');
      else {
        toast(c <= 5 ? 'You play a typing game and get 12 words per minute!' : c <= 10 ? 'You write a tiny program that prints your name 10 times.' : 'You clean a small dataset and make a chart.');
        state.reputation += 1;
      }
      requestLock();
      break;
    case 'canteen': openCanteen(ctx); break;
    case 'principalDesk': talkTo(npcs.get('principal') || { id: 'principal' }); break;
    case 'registration': {
      if (!isCollege(c)) { toast('The reception desk. Nothing to do here today.'); requestLock(); break; }
      if (state.day.registered) { toast('You are already registered for this semester.'); requestLock(); break; }
      const y = COLLEGE[c];
      const rows = [...y.courses, ...y.labCourses];
      const close = openPanel(h('div', {},
        h('p', {}, `Academic Registration · ${y.period}. Check your courses and confirm.`),
        h('table', {}, h('thead', {}, h('tr', {}, ['Code', 'Course', 'Units'].map((x) => h('th', {}, x)))),
          h('tbody', {}, rows.map((r) => h('tr', {}, h('td', {}, r.code), h('td', {}, r.name), h('td', {}, r.units))))),
        h('p', {}, h('b', {}, `Total: ${rows.reduce((a, r) => a + r.units, 0)} units`)),
        h('div', { class: 'row' }, h('button', { class: 'primary', 'data-voice': 'register confirm yes', onclick: () => {
          state.day.registered = true;
          state.decisions.push({ classNum: c, text: `Registered for ${y.label}: ${rows.length} courses` });
          close();
          toast('✔ Registered! Head to the Lecture Theatre for your first lecture.');
          requestLock();
        } }, '🎤 Say “register” or click to confirm'))), { title: 'Course Registration', closable: true });
      break;
    }
    case 'auditoriumStage':
      if (isCollege(c) && slot.type === 'fest') {
        if (state.day.eventDone) { toast('What a night! Time to head back to the hostel.'); requestLock(); break; }
        runFestEvent(ctx, () => { save(true); requestLock(); });
        break;
      }
      if (state.phase === 'orientation') counsellorTalk();
      else { toast('The auditorium is quiet today.'); requestLock(); }
      break;
    case 'gate':
      if (state.phase === 'orientation') { toast(state.orientation.counsellorMet ? 'Choose your stream with the counsellor in the Auditorium first.' : `Meet ${COUNSELLOR.name} in the Auditorium first.`); requestLock(); break; }
      if (state.phase === 'graduated') {
        openPanel(h('div', {},
          h('p', {}, 'The school gate, for the last time. Where next?'),
          h('div', { class: 'row wrap' },
            h('button', { onclick: () => { closeAll(); openFinalPortfolio(ctx); } }, 'Look back: The School Journey'),
            h('button', { class: 'primary', 'data-voice': 'college bits', onclick: () => beginCollege() }, 'Go to BITS Pilani →'))), { title: 'After Class 12', closable: true });
        break;
      }
      if (state.phase === 'collegeYearDone') { showRoadmap(); break; }
      if (slot.type === 'departure') endDay();
      else { toast(isCollege(c) ? `Classes and labs aren't over yet. Head back to the hostel after ${fmt(slots.at(-1).start)}.` : `School isn't over yet! Dismissal is at ${fmt(slots.at(-1).start)}.`); requestLock(); }
      break;
    default:
  }
}

function openNoticeBoard() {
  const ev = state.phase === 'day' ? state.years[state.classNum] : null;
  openPanel(h('div', {},
    h('h4', {}, `${SCHOOL.name} · Notices`),
    h('ul', { class: 'clean' },
      h('li', {}, '📌 Uniform check every Monday.'),
      h('li', {}, '📌 Library books must be returned within 7 days.'),
      h('li', {}, `📌 Minimum 75% attendance is required for promotion.`),
      state.classNum >= 9 ? h('li', {}, '📌 Career guidance sessions: meet the counsellor.') : null,
      ev ? h('li', {}, `📌 This year's event is announced at morning assembly.`) : null)), { title: 'Notice Board', closable: true });
}

// ---------- Panels: timetable, missions, help, pause, settings ----------
function openTimetable() {
  const clock = state.day.clock;
  openPanel(h('table', {},
    h('thead', {}, h('tr', {}, ['Time', 'Period', 'Where', 'Status'].map((x) => h('th', {}, x)))),
    h('tbody', {}, slots.map((s) => {
      let status = '';
      if (s.type === 'lesson') status = state.day.lessonsDone[s.subject] ? '✔ attended' : state.day.attendance[s.id] === 'absent' ? '✘ missed' : '';
      if (s.type === 'assembly') status = state.day.assemblyDone ? '✔' : '';
      if (s.type === 'lab') status = getPracticals(state.classNum, state.stream).every((p) => state.day.practicalsDone[p.subject] !== undefined) ? '✔ done' : '';
      const now = clock >= s.start && clock < s.end;
      return h('tr', { class: now ? 'now' : '' }, h('td', {}, `${fmt(s.start)}–${fmt(s.end)}`), h('td', {}, s.label), h('td', {}, s.location === 'free' ? 'Anywhere' : s.location), h('td', {}, now ? '◀ now ' : '', status));
    }))), { title: `Timetable · ${classroomTitle()}`, closable: true });
}

function missionList() {
  const d = state.day;
  const c = state.classNum;
  if (state.phase === 'orientation') {
    return {
      mandatory: [[`Meet ${COUNSELLOR.name} in the Auditorium`, state.orientation.counsellorMet], ['Choose your subjects', !!state.stream]],
      optional: [[`Talk to seniors (${state.orientation.seniorsMet.length}/6)`, state.orientation.seniorsMet.length >= 3], ['Talk to your parents', state.orientation.parentsTalked]],
    };
  }
  if (state.phase === 'graduated') return { mandatory: [['Graduate from Class 12', true]], optional: [['Revisit the Learning Journey (J)', false], ['Go to BITS Pilani (the school gate)', false]] };
  if (state.phase === 'collegeYearDone') return { mandatory: [['Finish Year 1 at BITS Pilani', true]], optional: [['Look at the road ahead (the gate)', false]] };
  if (isCollege(c)) {
    const courses = getClassSubjects(c);
    const pr = getPracticals(c);
    return {
      mandatory: [
        ['Register for your courses at Academic Registration', !!d.registered],
        [`Attend lectures (${courses.filter((s) => d.lessonsDone[s.id]).length}/${courses.length})`, courses.every((s) => d.lessonsDone[s.id])],
        [`Labs (${pr.filter((p) => d.practicalsDone[p.subject] !== undefined).length}/${pr.length})`, pr.every((p) => d.practicalsDone[p.subject] !== undefined)],
        [`Submit the assignment at the Library: ${COLLEGE[c].project.name}`, d.projectDone],
        ['Midsems and the Comprehensive exam (end of day)', !!state.years[c]?.results],
      ],
      optional: [
        [`Talk to batchmates (${d.optional.talked.length}/3)`, d.optional.talked.length >= 3],
        [`Go to ${c === 13 ? 'Oasis' : 'APOGEE'} in the evening`, d.eventDone],
        ['Help a batchmate with a lecture', d.optional.helped],
        ['Grab something at ANC', d.optional.canteen],
        ['Read in the Central Library', d.optional.library],
      ],
    };
  }
  const subjects = getClassSubjects(c, state.stream);
  const pr = getPracticals(c, state.stream);
  const project = getProject(c, state.stream);
  return {
    mandatory: [
      [`Attend lessons (${subjects.filter((s) => d.lessonsDone[s.id]).length}/${subjects.length})`, subjects.every((s) => d.lessonsDone[s.id])],
      ...(pr.length ? [[`Lab practicals (${pr.filter((p) => d.practicalsDone[p.subject] !== undefined).length}/${pr.length})`, pr.every((p) => d.practicalsDone[p.subject] !== undefined)]] : []),
      ...(project ? [[`Submit project in the Library: ${project.name}`, d.projectDone]] : []),
      ['Sit the annual exams (after dismissal)', !!state.years[c]?.results],
    ],
    optional: [
      ['Attend morning assembly', d.assemblyDone],
      [`Talk to classmates (${d.optional.talked.length}/3)`, d.optional.talked.length >= 3],
      ['Help a classmate with a lesson', d.optional.helped],
      ['Score a goal in the playground', d.optional.goal],
      ['Read a book in the library', d.optional.library],
      ['Buy a snack at the canteen', d.optional.canteen],
    ],
  };
}

function openMissions() {
  const m = missionList();
  const row = ([t, done]) => h('li', { class: done ? 'done' : '' }, done ? '✔ ' : '○ ', t);
  openPanel(h('div', {},
    h('h4', {}, 'Mandatory (needed for promotion)'), h('ul', { class: 'clean missions' }, m.mandatory.map(row)),
    h('h4', {}, 'Optional (make school life richer)'), h('ul', { class: 'clean missions' }, m.optional.map(row)),
    h('p', { class: 'muted small' }, 'Promotion needs 33% in every subject, 75% lesson attendance and the project. Optional missions never block promotion.')), { title: 'Missions', closable: true });
}

function openHelp() {
  openPanel(h('div', { class: 'help' },
    h('table', {}, h('tbody', {}, [
      ['W A S D', 'Walk'], ['Mouse', 'Look around'], ['Shift', 'Run'], ['Space', 'Jump'], ['E', 'Interact / sit / stand'],
      ['F', 'Voice: speak to choose options or talk (Chrome)'], ['T', 'Timetable'], ['M', 'Missions'], ['J', 'Learning Journey'],
      ['V', 'Switch first-person / third-person view'], ['Hold Z', 'Fast-forward time'], ['Esc', 'Pause menu'],
    ].map(([k, v]) => h('tr', {}, h('td', {}, h('kbd', {}, k)), h('td', {}, v))))),
    h('p', {}, 'Lessons start automatically when you sit at your desk (yellow mark) in the classroom during a lesson period. Sitting early makes time skip to the bell.'),
    h('p', {}, 'Voice: press F and say an option (“option two”, “raise hand”, “bye”), or near a classmate say “hello Diya”. Say “timetable” or “journey” to open them.')), { title: 'How to play', closable: true });
}

function openSettings() {
  const s = state?.settings;
  if (!s) return;
  const range = (label, key, min, max, step) => h('label', { class: 'setting' }, label,
    h('input', { type: 'range', min, max, step, value: s[key], oninput: (e) => { s[key] = Number(e.target.value); player.sensitivity = s.sensitivity; } }));
  openPanel(h('div', { class: 'settings' },
    range('Mouse sensitivity', 'sensitivity', 0.3, 2.5, 0.1),
    range('Game time speed', 'timeScale', 0.2, 2, 0.1),
    h('label', { class: 'setting' }, 'Graphics',
      h('select', { onchange: (e) => { s.graphics = e.target.value; } },
        [['high', 'High (shadows, sharp detail)'], ['low', 'Low (faster on older laptops)']].map(([v, l]) => h('option', { value: v, selected: (s.graphics || 'high') === v }, l)))),
    h('label', { class: 'setting' }, 'Voice language',
      h('select', { onchange: (e) => { s.voiceLang = e.target.value; } },
        [['en-IN', 'English (India)'], ['hi-IN', 'Hindi'], ['hinglish', 'Hinglish (English-India recogniser)']].map(([v, l]) => h('option', { value: v, selected: s.voiceLang === v }, l)))),
    h('label', { class: 'setting' }, 'Camera view',
      h('select', { onchange: (e) => { s.view = e.target.value; } },
        [['first', 'First person (through Mirnal’s eyes)'], ['third', 'Third person (see Mirnal)']].map(([v, l]) => h('option', { value: v, selected: s.view === v }, l)))),
    h('label', { class: 'setting check' }, h('input', { type: 'checkbox', checked: s.voiceRequired, onchange: (e) => { s.voiceRequired = e.target.checked; } }), 'Listen for spoken answers automatically (you can always click too)'),
    h('label', { class: 'setting check' }, h('input', { type: 'checkbox', checked: s.tts, onchange: (e) => { s.tts = e.target.checked; } }), 'Characters speak out loud (text-to-speech)'),
    h('label', { class: 'setting check' }, h('input', { type: 'checkbox', checked: s.showObjectiveArrow, onchange: (e) => { s.showObjectiveArrow = e.target.checked; } }), 'Show objective arrow'),
    h('p', { class: 'muted small' }, 'Privacy: the microphone is only used while the red “Listening” indicator is on. The game never stores audio. Speech recognition is provided by your browser, which may send audio to its own service.')),
  { title: 'Settings', closable: true });
}

function openPause() {
  openPanel(h('div', { class: 'menu' },
    h('button', { class: 'primary', 'data-voice': 'resume continue', onclick: () => { closeAll(); requestLock(); } }, 'Resume'),
    h('button', { 'data-voice': 'save', onclick: () => save() }, 'Save game'),
    h('button', { 'data-voice': 'journey learning', onclick: () => openJourney(ctx) }, 'Learning Journey'),
    h('button', { 'data-voice': 'timetable', onclick: () => openTimetable() }, 'Timetable'),
    h('button', { 'data-voice': 'missions', onclick: () => openMissions() }, 'Missions'),
    h('button', { 'data-voice': 'view camera person', onclick: () => { toggleView(); closeAll(); requestLock(); } }, state.settings.view === 'third' ? 'Switch to first-person view' : 'Switch to third-person view'),
    h('button', { 'data-voice': 'settings', onclick: () => openSettings() }, 'Settings'),
    h('button', { 'data-voice': 'help controls', onclick: () => openHelp() }, 'How to play'),
    h('button', { 'data-voice': 'quit title', onclick: () => { save(true); closeAll(); showTitle(); } }, 'Save & quit to title')),
  { title: 'Paused', closable: true });
}

// ---------- Title screen ----------
const titleEl = document.getElementById('title');
function showTitle() {
  mode = 'title';
  exitLock();
  document.getElementById('hud').classList.add('hidden');
  titleEl.classList.remove('hidden');
  const saved = hasSave();
  const menu = titleEl.querySelector('.title-menu');
  const saveInfo = (() => {
    if (!saved) return null;
    const s = loadGame();
    if (!s) return null;
    if (s.classNum >= 13) return s.phase === 'collegeYearDone' ? 'BITS Pilani · Year 1 complete' : `BITS Pilani · Year 1 · Semester ${s.classNum - 12}`;
    return s.phase === 'graduated' ? 'School · Graduated' : `School · Class ${s.classNum}`;
  })();
  const startNew = (college) => {
    if (saved && !confirm(`Start ${college ? 'Mirnal’s College Life' : 'Mirnal’s School Life'} from the beginning? Your saved game (${saveInfo}) will be replaced.`)) return;
    const s = createState();
    if (college) startCollege(s);
    startGame(s);
  };
  const choice = (emoji, title, sub, college) => h('button', { class: 'mode-card', 'data-voice': title, onclick: () => startNew(college) },
    h('span', { class: 'mode-emoji' }, emoji),
    h('span', { class: 'mode-text' }, h('b', {}, title), h('small', {}, sub)));
  menu.replaceChildren(...[
    h('div', { class: 'title-label' }, 'Start a new game'),
    h('div', { class: 'mode-grid' },
      choice('🎒', 'Mirnal’s School Life', 'Class 1 to Class 12 at Sunrise Public School', false),
      choice('🎓', 'Mirnal’s College Life', 'BITS Pilani · B.E. Chemical Engineering · Year 1', true)),
    saveInfo && h('button', { class: 'primary', onclick: () => { const s = loadGame(); if (s) startGame(s, true); else toast('Save file could not be loaded.'); } }, `Continue · ${saveInfo}`),
    h('div', { class: 'title-row' },
      saveInfo && h('button', { onclick: () => { const s = loadGame(); if (s) { state = s; openJourney(ctx); } } }, 'Learning Journey'),
      h('button', { onclick: () => { state ||= createState(); openSettings(); } }, 'Settings'),
      h('button', { onclick: () => openPanel(h('div', {},
        h('p', {}, 'LIFE OF MIRNAL: a first-person Indian school and college life game. School runs from Class 1 to Class 12; college starts at BITS Pilani.'),
        h('p', {}, 'Built with Three.js (MIT licence). Every 3D object is generated from simple shapes in code, so there are no third-party art assets. National Anthem recording: U.S. Navy Band (public domain).'),
        h('p', {}, 'Sunrise Public School, its staff and students, and the professors and batchmates at college are fictional. BITS Pilani first-year courses follow the official course list. Lesson content is simplified for gameplay.')), { title: 'Credits', closable: true }) }, 'Credits')),
  ].filter(Boolean));
}

function startGame(s, resumed = false) {
  state = s;
  mode = 'playing';
  titleEl.classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  const savedPos = state.player;
  loadYear({ intro: !resumed });
  if (savedPos) player.place(new THREE.Vector3(savedPos.x, 0, savedPos.z), savedPos.yaw);
  if (resumed) toast(`Welcome back! Class ${state.classNum}, ${fmt(state.day.clock)}.`);
  if (!resumed) showVoiceOnboarding();
  state.player = null;
}

function showVoiceOnboarding() {
  const status = h('p', { class: 'mic-status' }, voice.supported ? 'Click “Turn on my microphone” and allow access when Chrome asks.' : 'This browser has no speech recognition. Use Chrome to play with your voice.');
  const close = openPanel(h('div', {},
    h('p', {}, 'This game works great with your voice. Answer questions by speaking or clicking, sing Jana Gana Mana at assembly, and talk to anyone with the F key.'),
    h('ul', { class: 'clean' },
      h('li', {}, '🗣 Questions: say “A”, “option B” or the answer itself, or just click it'),
      h('li', {}, '🇮🇳 Assembly: stand at attention and sing the National Anthem with the tune'),
      h('li', {}, '🎤 Early at assembly? Practise the anthem line by line'),
      h('li', {}, '👋 Near a classmate? Press F and say “hello Diya”')),
    status,
    h('div', { class: 'row wrap' },
      h('button', { onclick: () => { state.settings.voiceRequired = false; close(); toast('No problem: click your answers. You can turn voice on in Settings.'); } }, 'My microphone doesn’t work'),
      h('button', { class: 'primary', disabled: !voice.supported, onclick: async () => {
        status.textContent = 'Waiting for permission…';
        const ok = await voice.requestMic();
        if (ok) { close(); toast('🎤 Microphone on. Let’s go to school!'); } else status.textContent = 'Permission was blocked. Allow the microphone in Chrome’s address bar, then try again.';
      } }, '🎤 Turn on my microphone'))), { title: '🎤 This school runs on your voice' });
}

// ---------- Pointer lock & input ----------
function requestLock() {
  if (mode !== 'playing' || isOpen()) return;
  canvas.requestPointerLock?.();
}
function exitLock() {
  if (document.pointerLockElement) document.exitPointerLock();
}
canvas.addEventListener('click', () => requestLock());
document.getElementById('resume-hint').addEventListener('click', () => requestLock());
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === canvas;
  if (!locked && mode === 'playing' && !isOpen() && !suppressPause) openPause();
  suppressPause = false;
});
let suppressPause = false;
onOverlayChange((open) => {
  if (open && document.pointerLockElement) {
    suppressPause = true;
    exitLock();
  }
});

document.addEventListener('keydown', (e) => {
  if (mode !== 'playing') return;
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
  if (e.code === 'Escape') {
    if (isOpen()) closeTop();
    return;
  }
  if (e.code === 'KeyF') {
    e.preventDefault();
    return handleVoice();
  }
  if (e.code === 'Enter' && anthem) { anthem.skipped = true; return endAnthem(); }
  if (e.code === 'KeyV' && !isOpen()) return toggleView();
  if (isOpen()) return;
  if (e.code === 'KeyE') interact();
  else if (e.code === 'KeyT') { exitLock(); openTimetable(); } else if (e.code === 'KeyJ') { exitLock(); openJourney(ctx); } else if (e.code === 'KeyM') { exitLock(); openMissions(); } else if (e.code === 'KeyH') { exitLock(); openHelp(); } else if (e.code === 'KeyP') { exitLock(); openPause(); }
});

function handleVoice() {
  voice.listen((text) => {
    if (anthem && /\bskip\b/i.test(text)) { anthem.skipped = true; return endAnthem(); }
    const panel = topPanel();
    if (panel?.__onVoiceText) return panel.__onVoiceText(text);
    if (panel) {
      const b = voice.matchButton(text, panel);
      if (b) {
        state.stats.voiceActions = (state.stats.voiceActions || 0) + 1;
        b.click();
      }
      else toast(`Heard “${text}”, but couldn't match an option.`);
      return;
    }
    const t = text.toLowerCase();
    if (/time ?table|schedule/.test(t)) return openTimetable();
    if (/journey|learning|portfolio/.test(t)) return openJourney(ctx);
    if (/mission|task/.test(t)) return openMissions();
    if (/help|control/.test(t)) return openHelp();
    if (/\bsit\b/.test(t) || /stand/.test(t)) return interact();
    for (const n of npcs.npcs.values()) {
      const first = n.name.split(' ')[0].toLowerCase().replace('.', '');
      const last = n.name.split(' ').at(-1).toLowerCase();
      if ((t.includes(first) && first.length > 2) || t.includes(last)) {
        if (Math.hypot(n.pos.x - player.pos.x, n.pos.z - player.pos.z) < 7) {
          exitLock();
          return talkTo(n, text);
        }
        return toast(`${n.name} is too far away to hear you.`);
      }
    }
    const near = npcs.nearest(player.pos, /hello|hi|namaste|good morning/.test(t) ? 5 : 3.5);
    if (near) {
      exitLock();
      return talkTo(near, text);
    }
    toast(`🎤 “${text}”: walk up to someone and talk, or say “timetable” or “journey”.`);
  }, (err) => toast(err, 4000));
}

// ---------- Camera view ----------
function toggleView() {
  state.settings.view = state.settings.view === 'third' ? 'first' : 'third';
  toast(state.settings.view === 'third' ? 'Third-person view' : 'First-person view');
}

function updateView(dt) {
  const third = state.settings.view === 'third';
  avatar.group.visible = third;
  document.getElementById('crosshair').classList.toggle('hidden', third);
  if (!third) return;
  avatar.poseAs(player.pos, player.yaw, player.moving, player.seated, dt);
  const eye = player.seated ? player.eye * 0.8 : player.eye;
  const head = new THREE.Vector3(player.pos.x, player.pos.y + eye, player.pos.z);
  const cp = Math.cos(player.pitch);
  const dir = new THREE.Vector3(-Math.sin(player.yaw) * cp, Math.sin(player.pitch), -Math.cos(player.yaw) * cp);
  const maxDist = player.seated ? 2.2 : 3.4;
  const cols = campus.allColliders();
  const at = (t) => {
    const p = head.clone().addScaledVector(dir, -t);
    p.y += 0.4 * (t / maxDist);
    return p;
  };
  let dist = maxDist;
  for (let t = 0.3; t <= maxDist; t += 0.12) {
    const p = at(t);
    if (cols.some((c) => c.enabled && p.x > c.minX - 0.15 && p.x < c.maxX + 0.15 && p.z > c.minZ - 0.15 && p.z < c.maxZ + 0.15 && p.y > c.minY && p.y < c.maxY + 0.1)) {
      dist = Math.max(0.3, t - 0.25);
      break;
    }
  }
  const cam = at(dist);
  if (campus.roomAt(cam.x, cam.z) || campus.roomAt(player.pos.x, player.pos.z)) cam.y = Math.min(cam.y, 2.9);
  cam.y = Math.max(cam.y, 0.3);
  camera.position.copy(cam);
  camera.lookAt(head.clone().addScaledVector(dir, 3));
}

// ---------- National Anthem (sung by everyone, including Mirnal) ----------
let anthem = null;
let anthemAudio = null;
const anthemEl = document.getElementById('anthem');
const anthemMustSing = () => false;

async function startAnthem(then, attempt = 1) {
  if (anthem) return;
  state.day.anthemDone = true;
  const a = { t: 0, line: -1, then, attempt, duration: ANTHEM_DURATION, words: new Set(), sing: null, mic: 'pending' };
  anthem = a;
  player.frozen = true;
  for (const n of npcs.npcs.values()) {
    n.singing = true;
    n.chase = null;
  }
  avatar.singing = true;
  anthemEl.classList.remove('hidden');
  document.getElementById('anthem-mic-text').textContent = '🎤 Starting microphone…';
  if (ANTHEM_AUDIO_URL) {
    anthemAudio = new Audio(ANTHEM_AUDIO_URL);
    anthemAudio.addEventListener('loadedmetadata', () => { if (anthem === a && Number.isFinite(anthemAudio.duration)) a.duration = anthemAudio.duration; });
    anthemAudio.addEventListener('ended', () => { if (anthem === a) a.ended = true; });
    anthemAudio.play().catch(() => {});
  }
  voice.stop();
  voice.stopSpeaking();
  toast(attempt === 1 ? '🇮🇳 Stand at attention and sing along!' : '🇮🇳 Once more, all together. Sing out loud!');
  const ctl = await voice.startSinging({
    lang: 'hi-IN',
    onWords: (text) => { for (const w of tokens(text)) if (LYRIC_WORDS.has(w)) a.words.add(w); },
  });
  if (anthem !== a) { ctl.stop(); return; }
  a.sing = ctl;
  a.mic = ctl.available ? 'on' : 'off';
}

function anthemTime() {
  return anthemAudio && anthemAudio.currentTime > 0 ? anthemAudio.currentTime : anthem.t;
}

function tickAnthem(dt) {
  const a = anthem;
  a.t += dt;
  a.sing?.tick?.(dt);
  const time = anthemTime();
  const scale = a.duration / ANTHEM_DURATION;
  let idx = 0;
  ANTHEM_LINES.forEach((l, i) => { if (time >= l.at * scale) idx = i; });
  if (idx !== a.line) {
    a.line = idx;
    document.getElementById('anthem-dev').textContent = ANTHEM_LINES[idx].dev;
    document.getElementById('anthem-rom').textContent = ANTHEM_LINES[idx].rom;
  }
  document.getElementById('anthem-bar').style.width = `${Math.min(100, (time / a.duration) * 100)}%`;
  const micText = document.getElementById('anthem-mic-text');
  const micBar = document.getElementById('anthem-mic-bar');
  if (a.mic === 'on') {
    const sung = Math.round((a.sing.voicedSeconds / a.duration) * 100);
    micText.textContent = `🎤 Your voice: sung ${sung}% · ${a.words.size} anthem words heard`;
    micBar.style.width = `${Math.min(100, a.sing.level * 900)}%`;
  } else if (a.mic === 'off') {
    micText.textContent = '🎤 Microphone unavailable: singing can’t be checked this time';
    micBar.style.width = '0%';
  }
  document.getElementById('anthem-skip').classList.toggle('hidden', anthemMustSing());
  if (a.ended || time >= a.duration + 0.5) finishAnthem();
}

function stopAnthemMedia() {
  anthemAudio?.pause();
  anthemAudio = null;
  anthem?.sing?.stop?.();
}

function finishAnthem() {
  const a = anthem;
  if (!a) return;
  const sungFrac = a.sing ? a.sing.voicedSeconds / a.duration : 0;
  const wordFrac = a.words.size / LYRIC_WORDS.size;
  const sang = sungFrac >= 0.4 || wordFrac >= 0.25;
  if (a.mic === 'on' && !sang && !a.skipped) toast('Next time, sing along with everyone! 🇮🇳');
  if (a.mic === 'on' && sang) {
    state.stats.anthemsSung = (state.stats.anthemsSung || 0) + 1;
    state.reputation += 2;
    toast('🇮🇳 Jai Hind! Beautifully sung.');
  }
  endAnthem();
}

function endAnthem() {
  if (!anthem) return;
  stopAnthemMedia();
  for (const n of npcs.npcs.values()) n.singing = false;
  avatar.singing = false;
  player.frozen = false;
  anthemEl.classList.add('hidden');
  const then = anthem.then;
  anthem = null;
  then?.();
}

// ---------- HUD ----------
const hud = {
  cls: document.getElementById('hud-class'),
  time: document.getElementById('hud-time'),
  slot: document.getElementById('hud-slot'),
  mission: document.getElementById('hud-mission'),
  progress: document.getElementById('hud-progress'),
  prompt: document.getElementById('prompt'),
  arrow: document.getElementById('arrow'),
  arrowText: document.getElementById('arrow-text'),
  resume: document.getElementById('resume-hint'),
};

function objective(slot) {
  const d = state.day;
  if (state.phase === 'orientation') {
    if (!state.orientation.counsellorMet || !state.stream) return { text: `Meet ${COUNSELLOR.name} in the Auditorium and choose your stream`, loc: 'auditorium' };
  }
  if (state.phase === 'graduated') return { text: 'You graduated! Walk to the gate to begin college, or press J to relive school.', loc: 'gate' };
  if (state.phase === 'collegeYearDone') return { text: 'Year 1 complete! The road ahead is at the gate.', loc: 'gate' };
  if (isCollege(state.classNum)) {
    if (slot.type === 'arrival' && !d.registered) return { text: 'Register for your courses at Academic Registration (E)', loc: 'reception' };
    if (slot.type === 'arrival') return { text: 'Head to the Lecture Theatre', loc: 'classroom' };
    if (slot.type === 'lab') {
      const pending = getPracticals(state.classNum).some((p) => d.practicalsDone[p.subject] === undefined);
      return pending ? { text: 'Labs: go to the lab bench (E)', loc: 'sciencelab' } : { text: 'Labs done!', loc: null };
    }
    if (slot.type === 'fest') return d.eventDone ? { text: 'Enjoy the fest, then head back to the hostel', loc: null } : { text: `${state.classNum === 13 ? 'Oasis' : 'APOGEE'} is on! Go to the Auditorium stage (E)`, loc: 'auditorium' };
    if (slot.type === 'departure') return { text: 'Head back to the hostel: walk to the gate (E)', loc: 'gate' };
    if (slot.type === 'lesson' && !d.lessonsDone[slot.subject]) return { text: `${slot.label}: take your seat (yellow mark)`, loc: player.seated ? null : 'classroom' };
  }
  switch (slot.type) {
    case 'arrival': return { text: 'Walk to the Assembly Ground', loc: 'assembly' };
    case 'assembly': return d.assemblyDone ? { text: 'Head to the classroom for Period 1', loc: 'classroom' } : { text: 'Join the morning assembly (E)', loc: 'assembly' };
    case 'lesson': return d.lessonsDone[slot.subject] ? { text: 'Lesson done. Stay seated for the next period', loc: null } : { text: `${slot.label}: sit at your desk (yellow mark)`, loc: player.seated ? null : 'classroom' };
    case 'break':
    case 'lunch': {
      const p = getProject(state.classNum, state.stream);
      if (p && !d.projectDone) return { text: `${slot.label}: free time. Tip: finish your project in the Library`, loc: 'library' };
      return { text: `${slot.label}: free time! Talk to friends, eat, read, or play`, loc: null };
    }
    case 'lab': {
      const pending = getPracticals(state.classNum, state.stream).some((p) => d.practicalsDone[p.subject] === undefined);
      return pending ? { text: 'Go to the Science Lab and use the lab bench (E)', loc: 'sciencelab' } : { text: 'Practicals done!', loc: null };
    }
    case 'sports': return { text: 'Games period at the Playground. Try to score a goal!', loc: 'playground' };
    case 'departure': return { text: "School's over! Walk to the gate (E)", loc: 'gate' };
    default: return { text: '', loc: null };
  }
}

function updateHUD(slot) {
  const c = state.classNum;
  hud.cls.textContent = state.phase === 'collegeYearDone' ? 'BITS Pilani · Year 1 complete' : isCollege(c) ? `BITS Pilani · ${COLLEGE[c].label}` : state.phase === 'graduated' ? 'Graduated · Class of Sunrise' : state.phase === 'orientation' ? 'Class 10 → 11 · Orientation' : `Class ${c} · ${STAGES[stageOf(c)]}`;
  hud.time.textContent = state.phase === 'day' ? fmt(state.day.clock) : '';
  hud.slot.textContent = slot.label;
  const obj = objective(slot);
  hud.mission.textContent = obj.text;
  const subjects = state.phase === 'day' ? getClassSubjects(c, state.stream) : [];
  const topics = subjects.flatMap((s) => s.topics);
  const practised = topics.filter((t) => (state.topics[t.id]?.level ?? 0) >= 3).length;
  hud.progress.textContent = topics.length ? `📘 ${practised}/${topics.length} topics practised · ⭐ ${state.reputation}` : `⭐ ${state.reputation}`;
  const target = obj.loc && campus.objectivePoint(obj.loc);
  if (target && state.settings.showObjectiveArrow && !isOpen()) {
    const dx = target.x - player.pos.x;
    const dz = target.z - player.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 2.5) {
      const ty = Math.atan2(-dx, -dz);
      let rel = ty - player.yaw;
      rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      hud.arrow.style.transform = `rotate(${-rel}rad)`;
      hud.arrow.parentElement.classList.remove('hidden');
      hud.arrowText.textContent = `${Math.round(dist)} m`;
    } else hud.arrow.parentElement.classList.add('hidden');
  } else hud.arrow.parentElement.classList.add('hidden');
  const t = !isOpen() && !player.seated ? interactTarget() : null;
  hud.prompt.textContent = player.seated ? 'E · stand up' : t ? `E · ${t.label}` : '';
  hud.prompt.classList.toggle('hidden', !hud.prompt.textContent || isOpen() || !!anthem);
  hud.resume.classList.toggle('hidden', !!document.pointerLockElement || isOpen() || mode !== 'playing');
}

// ---------- Main loop ----------
const clockTimer = new THREE.Clock();
let hudTimer = 0;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clockTimer.getDelta(), 0.05);
  elapsed += dt;
  if (mode === 'playing' && state) {
    const paused = isOpen();
    player.enabled = !paused && document.pointerLockElement === canvas;
    if (!paused) {
      const slot = currentSlot(slots, state.day.clock);
      if (state.phase === 'day' && !state.day.ended && !anthem) {
        const next = nextSlot(slots, state.day.clock);
        const waitingAtDesk = player.seated && (slot.type !== 'lesson' || state.day.lessonsDone[slot.subject]) && next?.type === 'lesson';
        fastForward = player.keys.has('KeyZ') || waitingAtDesk;
        const departureEnd = slots.at(-1).end;
        state.day.clock = Math.min(departureEnd, state.day.clock + dt * state.settings.timeScale * (fastForward ? 12 : 1));
        if (state.day.clock >= departureEnd) {
          toast('The last bus is leaving! Mirnal heads home.');
          endDay();
        }
      }
      const nowSlot = currentSlot(slots, state.day.clock);
      if (nowSlot.id !== lastSlotId) {
        const prev = slots.find((s) => s.id === lastSlotId);
        lastSlotId = nowSlot.id;
        onSlotChange(nowSlot, prev);
      }
      if (state.phase === 'day' && !practicalRunning) startLessonIfReady(nowSlot);
      if (state.phase === 'day' && !isCollege(state.classNum) && nowSlot.type === 'arrival' && !state.day.earlyPrompted && player.pos.distanceTo(campus.spots.assemblyPlayer) < 9) {
        state.day.earlyPrompted = true;
        toast('🎤 You’re early! Press E at the assembly line to practise Jana Gana Mana with your voice.', 4500);
      }
      if (state.phase === 'day' && nowSlot.type === 'assembly' && !state.day.anthemDone && state.day.clock >= nowSlot.start + 5) {
        startAnthem(() => {
          const near = player.pos.distanceTo(campus.spots.assemblyPlayer) < 9;
          if (near && !state.day.assemblyDone) { exitLock(); runAssembly(ctx, () => requestLock()); } else if (!near) toast('Assembly went on without you today.');
        });
      }
      if (anthem) tickAnthem(dt);
      player.update(dt, campus.allColliders());
      updateView(dt);
      npcs.update(dt, ball);
      if (Math.hypot(ball.pos.x - player.pos.x, ball.pos.z - player.pos.z) < 0.75 && player.moving) {
        const dir = player.lastMove.clone().setY(0).normalize();
        ball.kick(dir.multiplyScalar(player.keys.has('ShiftLeft') ? 11 : 7));
        lastKick = elapsed;
      }
      const scored = ball.update(dt);
      if (scored && elapsed - lastKick < 3) {
        state.day.optional.goal = true;
        state.stats.goals += 1;
        state.reputation += 1;
        toast('⚽ GOAL! Your friends cheer!');
      }
      if (state.phase === 'orientation') {
        const room = campus.roomAt(player.pos.x, player.pos.z);
        if (room && ['sciencelab', 'complab', 'classroomB', 'library'].includes(room) && !state.orientation.labsVisited.includes(room)) state.orientation.labsVisited.push(room);
      }
    }
    hudTimer += dt;
    if (hudTimer > 0.1) {
      hudTimer = 0;
      updateHUD(currentSlot(slots, state.day.clock));
      if (isCollege(state.classNum)) campus.setClock?.(state.day.clock);
    }
  }
  gfx.update(dt, { clock: state?.day?.clock ?? 600, focus: player.pos, quality: state?.settings?.graphics || 'high' });
  renderer.render(scene, camera);
}

// Title camera
player.place(new THREE.Vector3(0, 0, 58), 0);
player.update(0, []);
camera.position.set(0, 6, 62);
camera.lookAt(0, 2, 0);
detectLLM();
showTitle();
frame();

// Exposed for automated testing in the browser.
window.__game = { get state() { return state; }, voice, talkTo, get anthem() { return anthem; }, finishAnthem, player, npcs, campus, get slots() { return slots; }, interact, handleInteractable, startGame, createState };
