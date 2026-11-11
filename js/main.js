import * as THREE from 'three';
import { Campus } from './world/campus.js';
import { BitsCampus } from './world/bits-world.js';
import { createMinimap } from './ui/minimap.js';
import { createBhawanGuide } from './ui/bhawan-guide.js';
import { createTouchControls } from './ui/touch.js';
import { Cinematic } from './cinematic/cinematic.js';
import { GraphicsEngine } from './graphics/GraphicsEngine.js';
import { PROFILES, PROFILE_ORDER, DEFAULT_PROFILE } from './graphics/GraphicsConfig.js';
import { Player } from './world/player.js';
import { NPC, NPCManager, Ball, studentHeight } from './world/npcs.js';
import { ANTHEM_LINES, ANTHEM_DURATION, ANTHEM_AUDIO_URL, LYRIC_WORDS } from '../data/anthem.js';
import { openAnthemPractice } from './ui/anthempractice.js';
import { createState, ensureYear, activeClassmates, adjustFriend, newDay, newSem, TIME_SPEEDS, FAST_FORWARD } from './core/state.js';
import { buildDay, currentSlot, nextSlot, fmt, advanceClock } from './core/timetable.js';
import { promote, repeatYear, applyRemedial, scoreLabs, applyCollegeGrades, cgpa, startCollege, buildExam, scoreExam, blendMidsem } from './core/academics.js';
import { CALENDAR, CALENDAR_NOTE, calendarDay, dayTitle, isLastDay } from '../data/college-calendar.js';
import { COLLEGE, COLLEGE_STAFF, COLLEGE_INTRO, ROADMAP } from '../data/college.js';
import { saveGame, loadGame, hasSave } from './core/save.js';
import { streamGroup } from './core/streams.js';
import { getClassSubjects, getPracticals, getProject, getLabCourses, stageOf, STAGES, isCollege } from '../data/curriculum.js';
import { MEALS, menuFor, PITSTOP } from '../data/mess.js';
import { CLASSMATES, teacherFor, PRINCIPAL, GUARD, CANTEEN, LIBRARIAN, PARENTS, HOSTELMATES } from '../data/people.js';
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
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 300);
// Pixel ratio, resizing, tone mapping, shadows and quality profiles: js/graphics/ (created below, once the campus exists).

initUI();
setMicHandler(() => handleVoice());
// Two worlds: the school campus, and BITS Pilani at real scale (built the first time College Life starts).
const schoolRoot = new THREE.Group();
scene.add(schoolRoot);
const schoolCampus = new Campus(schoolRoot);
let campus = schoolCampus;
let bitsCampus = null;
let bitsRoot = null;
const player = new Player(camera, canvas);
const npcs = new NPCManager(scene, campus);
const ball = new Ball(scene, campus.fieldBounds);
const graphics = new GraphicsEngine({ renderer, scene, camera, campus: () => campus });
npcs.setPlayerPos(player.pos);
function addMainInteractables(c, reg) {
  c.interactable('assemblyLine', 0, -6, 'Join the assembly line', { radius: 4.5 });
  c.deskInteract = c.interactable('mydesk', 0, 0, 'Sit at your desk', { radius: 1.6 });
  c.interactable('registration', reg.x, reg.z, 'Register for your courses', { radius: 2.6 });
}
addMainInteractables(schoolCampus, { x: 15.5, z: 38 });
let deskInteract = schoolCampus.deskInteract;
const minimap = createMinimap();
const bhawanGuide = createBhawanGuide();
const touch = createTouchControls({ canvas, player, onMenu: () => openPause() });
const bike = (() => {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: '#2a2f38', roughness: 0.4, metalness: 0.6 });
  const tyre = new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.9 });
  g.userData.wheels = [];
  for (const z of [-0.55, 0.55]) {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.04, 8, 24), tyre);
    w.rotation.y = Math.PI / 2;
    w.position.set(0, 0.36, z);
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.66, 0.02), metal);
    w.add(spoke);
    g.add(w);
    g.userData.wheels.push(w);
  }
  const bar = (len, x, y, z, rx) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, len, 6), metal); m.position.set(x, y, z); m.rotation.x = rx; g.add(m); };
  bar(1.1, 0, 0.62, 0, Math.PI / 2);
  bar(0.6, 0, 0.55, 0.32, 0.4);
  bar(0.55, 0, 0.6, -0.35, -0.3);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.26), tyre);
  seat.position.set(0, 0.88, 0.3);
  g.add(seat);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 6), metal);
  handle.rotation.z = Math.PI / 2;
  handle.position.set(0, 0.95, -0.5);
  g.add(handle);
  g.userData.handle = handle;
  g.visible = false;
  g.traverse((o) => { o.castShadow = true; });
  scene.add(g);
  return g;
})();

const COLLEGE_RANGE = { fogNear: 170, fogFar: 720, skyScale: 1900 };
function useWorld(kind) {
  const college = kind === 'college';
  if (college && !bitsCampus) {
    bitsRoot = new THREE.Group();
    scene.add(bitsRoot);
    bitsCampus = new BitsCampus(bitsRoot);
    const { dx, dz } = bitsCampus.roomOffset.reception;
    addMainInteractables(bitsCampus, { x: 15.5 + dx, z: 38 + dz });
  }
  campus = college ? bitsCampus : schoolCampus;
  schoolRoot.visible = !college;
  if (bitsRoot) bitsRoot.visible = college;
  deskInteract = campus.deskInteract;
  npcs.campus = campus;
  npcs.streamRadius = college ? 90 : null;
  ball.bounds = campus.fieldBounds;
  ball.reset();
  camera.far = college ? 1100 : 300;
  camera.updateProjectionMatrix();
  graphics.worldChanged(college ? COLLEGE_RANGE : { fogNear: 90, fogFar: 270, skyScale: 280 });
  minimap.setVisible(college);
  if (!college) setBike(false);
}

function setBike(on) {
  player.bike = on;
  bike.visible = on && state?.settings.view === 'third';
}
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
  if (state && isCollege(state.classNum)) n.speed = opts.role === 'student' ? 4.6 : 3.6;
  npcMeta.set(id, meta);
  if (at) n.teleport(at);
  return n;
}

function spawnStaff() {
  if (isCollege(state.classNum)) {
    const S = COLLEGE_STAFF;
    const guard = addNPC('guard', { kind: 'staff', who: S.guard, role: 'guard' }, { name: S.guard.name, title: S.guard.role, role: 'staff', color: '#4b5d7a', pants: '#2b3445', height: 1.7, skinIndex: 1, outfit: 'guard' }, campus.spots.guard);
    if (campus.hostel) guard.group.rotation.y = campus.hostel.npcSpots.guardYaw;
    addNPC('canteen', { kind: 'staff', who: S.canteen, role: 'canteen' }, { name: S.canteen.name, title: S.canteen.role, role: 'staff', color: '#e8e2d0', pants: '#4a3b2a', height: 1.68, skinIndex: 3 }, campus.spots.canteenStaff || new THREE.Vector3(-36, 0, 6.2));
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
  useWorld(isCollege(state.classNum) ? 'college' : 'school');
  if (state.phase === 'collegeYearDone') return setupCollegeDone(intro);
  if (state.phase === 'orientation') return setupOrientation(intro);
  if (state.phase === 'graduated') return setupGraduated();
  if (isCollege(state.classNum)) state.sem ||= newSem();
  slots = buildDay(state.classNum, state.stream, isCollege(state.classNum) ? { calDay: today(), pendingLabs: pendingLabs() } : {});
  campus.rebuildClassroom(state.classNum, classroomTitle());
  const seat = campus.seats[campus.playerSeatIndex];
  deskInteract.pos.set(seat.desk.x, 1, seat.desk.z + 0.3);
  spawnStaff();
  spawnTeachers();
  spawnClassmates((i) => campus.spots.gate[i % campus.spots.gate.length].clone().add(new THREE.Vector3(0, 0, -4 - i)));
  if (state.classNum === 11) {
    addNPC('counsellor', { kind: 'counsellor' }, { name: COUNSELLOR.name, title: 'Counsellor', role: 'teacher', color: '#2d6a6a', pants: '#333', height: 1.62, skinIndex: 2 }, campus.spots.counsellor);
  }
  if (isCollege(state.classNum)) spawnHostelmates();
  if (!state.player) player.place(campus.spots.spawn, campus.spawnYaw ?? 0); // college: in your room, facing the door
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
    h('h4', {}, `How the semester runs · ${CALENDAR[c].length} days`),
    h('ol', { class: 'clean' },
      h('li', {}, `📝 Day 1 · ${CALENDAR[c][0].month}: register for your courses at the Main Building. Your timetable is issued after you register.`),
      h('li', {}, '🍽 Every day: breakfast, lunch and dinner at the VKB mess, next to Krishna Bhawan (daily missions, M)'),
      h('li', {}, `📚 Classes: ${y.courses.map((x) => x.code).join(', ')}, a few lectures a day in NAB, labs in FD-II (${y.practicals.map((p) => p.name).join('; ')})`),
      h('li', {}, `🏖 Holidays${c === 13 ? ' and BOSM' : ''} along the way`),
      h('li', {}, '✏ Mid-semester tests in week 10, at your desk in NAB'),
      h('li', {}, `🎉 ${c === 13 ? 'Oasis' : 'APOGEE'} at the Auditorium`),
      h('li', {}, '📝 Comprehensive exams after the last day of classes, then your grade sheet')),
    h('p', {}, `Each day you wake up in your room in Krishna Bhawan. At night, walk back in and sleep in your bed (E) to move to the next day. Assignment (at the Library): ${y.project.name}.`),
    h('p', { class: 'muted small' }, 'Courses follow BITS Pilani’s published first-year list. Professors, batchmates and events in the story are fictional.'),
    h('div', { class: 'row' }, h('button', { class: 'primary', 'data-voice': 'start begin go', onclick: () => {
      closeAll();
      const reg = campus.objectivePoint('reception');
      const far = reg ? Math.round(player.pos.distanceTo(reg) / 10) * 10 : 0;
      toast(`📝 ${dayTitle(today(), state.sem.day, semLength())}. Registration opens at 9:00 in the Main Building${far > 150 ? `, ${far} m away (C: cycle)` : ''}.`, 6500);
    } }, 'Start the day'))),
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
  if (isCollege(state.classNum)) placeHostelmates();
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
      case 'exam':
      case 'lesson':
        if (inMyGroup(cm)) {
          const seat = seats[(seatI++ * 2 + 1) % seats.length];
          npcs.send(id, 'classroom', seat.pos, { sit: true, face: Math.PI });
        } else npcs.send(id, 'classroomB', campus.spots.classroomB[bI++ % campus.spots.classroomB.length], { sit: true, face: Math.PI });
        break;
      case 'break':
        if (slot.meal && campus.spots.mess) { npcs.send(id, 'mess', campus.spots.mess[(i * 5) % campus.spots.mess.length]); break; }
        if (['football', 'cricket', 'kho-kho', 'badminton'].includes(cm.sport)) npcs.send(id, null, campus.spots.playground[i * 3 % 16]);
        else if (cm.personality === 'Introverted' || cm.personality === 'Helpful') npcs.send(id, 'library', campus.spots.library[i % campus.spots.library.length]);
        else npcs.send(id, null, campus.spots.canteen[i % campus.spots.canteen.length]);
        break;
      case 'lunch':
        if (slot.meal && campus.spots.mess) npcs.send(id, 'mess', campus.spots.mess[(i * 5) % campus.spots.mess.length]);
        else npcs.send(id, null, campus.spots.canteen[(i * 3) % campus.spots.canteen.length]);
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
        npcs.send(id, 'auditorium', campus.festSeat ? campus.festSeat(i) : new THREE.Vector3(-36 + (i % 4) * 1.6, 0, 26 + Math.floor(i / 4) * 2.2), { face: -Math.PI / 2 });
        break;
      case 'departure':
        npcs.send(id, null, i % 2 && !isCollege(state.classNum) ? new THREE.Vector3(-13 + (i % 3), 0, 41.5) : campus.spots.gate[i % campus.spots.gate.length]);
        break;
      default:
    }
  });
  // Teachers
  let staffI = 0;
  let labAssigned = false;
  for (const [id, m] of npcMeta) {
    if (m.kind !== 'teacher') continue;
    const teaching = (slot.type === 'lesson' && m.subjects.some((s) => s.id === slot.subject)) || (slot.type === 'exam' && m.subjects.some((s) => s.id === slot.papers[0]));
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
  if (prev && prev.type === 'exam' && !state.day.examDone) toast(`You missed the ${prev.exam === 'midsem' ? 'mid-sem' : 'compre'} paper. It counts as zero.`, 4000);
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
  let subject = getClassSubjects(state.classNum, state.stream).find((x) => x.id === slot.subject);
  const sem = isCollege(state.classNum) ? state.sem : null;
  if (sem) {
    // Each lecture teaches the next topic of the course; once all are covered, lectures revise them.
    const n = sem.lectureNo[subject.id] || 0;
    subject = { ...subject, name: `${subject.name} · Lecture ${n + 1}`, topics: [subject.topics[n % subject.topics.length]] };
  }
  state.day.attendance[slot.id] = state.day.clock > slot.start + 15 ? 'late' : 'present';
  if (state.day.attendance[slot.id] === 'late') toast('You were late, but you made it.');
  exitLock();
  runLesson(ctx, { subject, classNum: state.classNum }, () => {
    if (sem) {
      sem.lectureNo[slot.subject] = (sem.lectureNo[slot.subject] || 0) + 1;
      sem.attended[slot.subject] = (sem.attended[slot.subject] || 0) + 1;
    }
    state.day.clock = Math.max(state.day.clock, slot.end);
    save(true);
  });
}

// ---------- College semester ----------
const today = () => calendarDay(state.classNum, state.sem.day);
const pendingLabs = () => getPracticals(state.classNum).filter((p) => state.day.practicalsDone[p.subject] === undefined).map((p) => p.subject);
const semLength = () => CALENDAR[state.classNum].length;

// Mid-sems and compre papers are written at your desk in the NAB lecture theatre.
function startExamIfReady(slot) {
  if (slot.type !== 'exam' || state.day.examDone || isOpen()) return;
  if (!player.seated || player.seated.index !== campus.playerSeatIndex) return;
  const mid = slot.exam === 'midsem';
  exitLock();
  runExam(ctx, state.classNum, { onlySubjects: slot.papers, topicLimit: mid ? 1 : null, title: mid ? 'Mid-semester test' : 'Comprehensive examination' }, (results) => {
    state.day.examDone = true;
    for (const [id, r] of Object.entries(results)) {
      if (mid) state.sem.midsem[id] = r.outOf ? r.correct / r.outOf : 0;
      else state.sem.compre[id] = r;
    }
    state.day.clock = Math.max(state.day.clock, slot.end);
    save(true);
    if (!mid && isLastDay(state.classNum, state.sem.day)) return finalizeSemester();
    const lines = Object.entries(results).map(([, r]) => `${r.name}: ${r.correct}/${r.outOf}`);
    toast(`📝 ${mid ? 'Mid-sem' : 'Compre'} paper done · ${lines.join(' · ')}`, 5000);
    requestLock();
  });
}

// After the last compre paper: compre + mid-sems + labs → grades and SGPA, then the grade sheet.
function finalizeSemester() {
  const c = state.classNum;
  const missing = getClassSubjects(c).map((s) => s.id).filter((id) => !state.sem.compre[id]);
  const results = { ...state.sem.compre };
  if (missing.length) Object.assign(results, scoreExam(state, c, state.stream, buildExam(c, state.stream, missing), {}));
  blendMidsem(results, state.sem.midsem);
  Object.assign(results, scoreLabs(state, c));
  const year = ensureYear(state, c);
  year.results = results;
  year.sgpa = applyCollegeGrades(c, results);
  state.day.ended = true;
  save(true);
  exitLock();
  openReport();
}

// Sleep: tally today's lectures, then wake up at the hostel on the next calendar day.
function advanceDay() {
  for (const s of slots) if (s.type === 'lesson') state.sem.held[s.subject] = (state.sem.held[s.subject] || 0) + 1;
  const keep = { practicalsDone: state.day.practicalsDone, projectDone: state.day.projectDone, registered: state.sem.registered };
  state.sem.day += 1;
  state.day = { ...newDay(), ...keep };
  setBike(false);
  closeAll();
  state.player = null; // wake up in your room
  loadYear({ intro: false });
  save(true);
  const d = today();
  const lectures = slots.filter((x) => x.type === 'lesson').length;
  const what = d.kind === 'class' ? `${lectures} lecture${lectures === 1 ? '' : 's'}${slots.some((x) => x.type === 'lab') ? ' and a lab' : ''} today` : slots.find((x) => x.type === 'exam')?.label || d.label || 'No classes today';
  toast(`☀ ${dayTitle(d, state.sem.day, semLength())} · ${what}. Press T for the timetable.`, 6500);
}

// Jump to the start of the next timetable slot, or end the day if nothing is left.
function skipToNext() {
  const next = nextSlot(slots, state.day.clock);
  closeAll();
  if (!next || next.type === 'departure') {
    if (isCollege(state.classNum)) return endDay();
    state.day.clock = slots.at(-1).start;
  } else state.day.clock = next.start;
  requestLock();
}

function endDay() {
  if (state.day.ended) return;
  const c = state.classNum;
  if (isCollege(c)) {
    if (isLastDay(c, state.sem.day)) return finalizeSemester();
    state.day.ended = true;
    exitLock();
    save(true);
    const done = slots.filter((x) => x.type === 'lesson' && state.day.lessonsDone[x.subject]).length;
    const held = slots.filter((x) => x.type === 'lesson').length;
    const next = calendarDay(c, state.sem.day + 1);
    openPanel(h('div', {},
      h('p', {}, held ? `Lectures today: ${done}/${held} attended.` : 'No lectures today.'),
      h('p', {}, `Meals at the mess: ${mealsEaten()}/${slots.filter((x) => x.meal).length}.`),
      h('p', {}, `Tomorrow: ${dayTitle(next, state.sem.day + 1, semLength())}${next.label ? ` · ${next.label}` : ''}.`),
      h('div', { class: 'row' }, h('button', { class: 'primary', 'data-voice': 'sleep next day tomorrow', onclick: () => advanceDay() }, '🌙 Sleep → next day'))),
    { title: `Back at the Bhawan · ${dayTitle(today(), state.sem.day, semLength())}` });
    return;
  }
  state.day.ended = true;
  exitLock();
  save(true);
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
  let npc = npcs.nearest(pos, 2.3);
  if (npc && Math.abs(npc.pos.y - pos.y) > 1.6) npc = null; // someone on the floor above or below
  const f = player.forward();
  let best = null;
  let bestD = Infinity;
  for (const it of campus.interactables) {
    if (it.id === 'mydesk' && (state.phase !== 'day' || player.seated)) continue;
    if (it.id === 'registration' && !isCollege(state.classNum)) continue;
    if (it.id === 'assemblyLine' && isCollege(state.classNum)) continue;
    if (it.pos.y > pos.y + 2.7 || it.pos.y < pos.y - 0.6) continue; // another floor
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
    if (atDesk() && slot.type === 'lesson' && !state.day.lessonsDone[slot.subject]) {
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
  if (m.kind === 'hostelmate') {
    const hm = m.hm;
    const opts = [{ label: 'Catch you later!', go: (close) => { close(); requestLock(); } }];
    if (m.activity === 'tt') opts.unshift({ label: 'Play a game of TT', go: (close) => { close(); playTT(hm.name); } });
    return openSimpleDialogue(ctx, `${hm.name} · Krishna Bhawan`, [hm.lines[(state.sem?.day || 0) % hm.lines.length]], opts);
  }
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
      // In college each lab session is for one lab course (slot.lab); at school the lab period runs them all.
      const pending = getPracticals(c, state.stream).filter((p) => state.day.practicalsDone[p.subject] === undefined && (!slot.lab || p.subject === slot.lab));
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
    case 'mess': eatAtMess(slot); break;
    case 'messmenu': openMessMenu(); break;
    case 'pitstop': openPitstop(); break;
    case 'tt': playTT(npcs.get('hm:aditya')?.group.visible ? 'Aditya' : 'your wingie'); break;
    case 'foosball':
    case 'carrom': quickGame(id); break;
    case 'tv': { const H = hereHostel(); toast(H.setTV(!H.tvOn) ? '📺 TV on. A cricket match, of course.' : 'TV off.'); H.tvManual = true; requestLock(); break; }
    case 'sofa': {
      const taken = (x) => [...npcs.npcs.values()].some((n) => n.group.visible && Math.hypot(n.pos.x - x.at.x, n.pos.z - x.at.z) < 0.3);
      const seats = hereHostel().sofaSeats;
      const seat = seats.find((x) => !taken(x)) || seats.at(-1);
      player.sit(seat.at, seat.yaw + Math.PI, seat.stand);
      toast('You sink into the sofa. (E to stand up)');
      requestLock();
      break;
    }
    case 'vending': openVending(); break;
    case 'cooler': toast('💧 Ice-cold water. That beats the Pilani heat for now.'); requestLock(); break;
    case 'washbasin': toast('You splash cold water on your face. Fresh!'); requestLock(); break;
    case 'laundry': toast('🧺 Clothes in the machine. Hang them on the roof to dry.'); requestLock(); break;
    case 'hnotice': openHostelNotices(); break;
    case 'almirah': toast(campus.hostel.toggleAlmirah() ? 'Your almirah: clothes, a lock and a stash of snacks.' : 'Almirah closed.'); requestLock(); break;
    case 'hlight': toast(campus.hostel.setMyLight(!campus.hostel.lightOn) ? '💡 Light on.' : 'Light off.'); requestLock(); break;
    case 'studydesk': studyAtDesk(); break;
    case 'principalDesk': talkTo(npcs.get('principal') || { id: 'principal' }); break;
    case 'registration': {
      if (!isCollege(c)) { toast('The reception desk. Nothing to do here today.'); requestLock(); break; }
      if (state.sem.registered) { toast('You are already registered for this semester.'); requestLock(); break; }
      const regSlot = slots.find((x) => x.type === 'arrival');
      if (regSlot && state.day.clock < regSlot.start) { toast(`Registration opens at ${fmt(regSlot.start)}.`); requestLock(); break; }
      const late = !regSlot || state.day.clock >= regSlot.end;
      const y = COLLEGE[c];
      const rows = [...y.courses, ...y.labCourses];
      const close = openPanel(h('div', {},
        h('p', {}, `Academic Registration · ${y.period}. Check your courses and confirm.`),
        h('table', {}, h('thead', {}, h('tr', {}, ['Code', 'Course', 'Units'].map((x) => h('th', {}, x)))),
          h('tbody', {}, rows.map((r) => h('tr', {}, h('td', {}, r.code), h('td', {}, r.name), h('td', {}, r.units))))),
        h('p', {}, h('b', {}, `Total: ${rows.reduce((a, r) => a + r.units, 0)} units`)),
        h('div', { class: 'row' }, h('button', { class: 'primary', 'data-voice': 'register confirm yes', onclick: () => {
          state.day.registered = true;
          state.sem.registered = true;
          state.decisions.push({ classNum: c, text: `Registered for ${y.label}: ${rows.length} courses` });
          close();
          save(true);
          toast(late ? '✔ Late registration done. Your timetable is issued.' : '✔ Registered! Your timetable is issued. Classes begin tomorrow.', 5000);
          openTimetable(!late);
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
      else { toast(isCollege(c) ? `Not bedtime yet: lights out from ${fmt(slots.at(-1).start)}. To sleep early, press T → End the day.` : `School isn't over yet! Dismissal is at ${fmt(slots.at(-1).start)}.`); requestLock(); }
      break;
    default:
      if (id.startsWith('hdoor:')) { toast(hereHostel().toggleDoor(Number(id.slice(6))) ? 'Door open.' : 'Door closed.'); requestLock(); }
  }
}

// The Bhawan you are in (its TV, sofas and doors), or your own.
const hereHostel = () => campus.hostelAt?.(player.pos.x, player.pos.z) || campus.hostel;

// ---------- Krishna Bhawan: hostel-mates, the common room and your room ----------
const atDesk = () => !!player.seated && player.seated.index === campus.playerSeatIndex;
let hostelWalkers = [];

function spawnHostelmates() {
  if (!campus.hostel) return;
  HOSTELMATES.forEach((hm, i) => {
    const n = npcs.add(`hm:${hm.id}`, { name: hm.name, role: 'student', color: hm.color, pants: hm.pants, height: 1.7 + (i % 3) * 0.03, skinIndex: i, outfit: 'casual', gender: 'm' });
    n.placeFilter = null; // they live inside the Bhawan
    n.speed = 1.4;
    npcMeta.set(`hm:${hm.id}`, { kind: 'hostelmate', hm });
  });
  placeHostelmates();
}

// Evenings, holidays and early mornings the Bhawan is full; during class hours most people are out.
function placeHostelmates() {
  const H = campus.hostel;
  if (!H || !npcs.get('hm:aditya')) return;
  const clock = state.day.clock;
  const busy = clock >= 17 * 60 || clock < 8 * 60 || today()?.kind !== 'class';
  const S = H.npcSpots;
  const C = S.cricket; const F = S.football;
  const plan = busy
    ? {
      aditya: ['tt', S.tt[0]], harsh: ['tt', S.tt[1]], siddharth: ['tv', S.tv[0]], nikhil: ['tv', S.tv[1]], yash: ['carrom', S.carrom[0]], ishaan: ['carrom', S.carrom[1]],
      pranav: ['study', S.study[0]], rohan: ['room', S.double[0]], kunal: ['room', S.senior[0]], tejas: ['walk', 0],
      varun: ['cricket', C.bat], aman: ['pace', C.bowl], dhruv: ['cricket', C.field[0]], ankit: ['cricket', C.field[1]],
      mohit: ['pace', F[0]], sahil: ['pace', F[1]], parth: ['pace', F[2]], vivek: ['pace', F[3]],
    }
    : { pranav: ['study', S.study[0]], siddharth: ['tv', S.tv[0]], tejas: ['walk', 0], rohan: ['walk', 1] };
  hostelWalkers = [];
  for (const hm of HOSTELMATES) {
    const id = `hm:${hm.id}`;
    const n = npcs.get(id);
    const p = plan[hm.id];
    npcMeta.get(id).activity = p?.[0];
    n.group.visible = !!p;
    if (!p) { n.teleport(H.world(2, 2, -20)); continue; }
    n.speed = 1.4;
    if (p[0] === 'walk') {
      const y = p[1] * 3.3;
      const a = H.world(6.15, H.ve - 22, y); const b = H.world(6.15, H.ve + 22, y);
      n.teleport(p[1] ? b : a);
      hostelWalkers.push({ n, a, b });
      continue;
    }
    if (p[0] === 'pace') { // footballers and the bowler run between two points
      n.speed = p[1].speed;
      n.teleport(p[1].a);
      hostelWalkers.push({ n, a: p[1].a, b: p[1].b });
      continue;
    }
    n.teleport(p[1].at);
    n.seated = !!p[1].sit;
    n.group.rotation.y = p[1].yaw;
  }
  H.ttBall.visible = busy;
  if (!H.tvManual) H.setTV(busy);
}

// Corridor walkers pace up and down.
function tickHostel() {
  for (const w of hostelWalkers) if (!w.n.path.length) w.n.walkTo([(w.n.pos.distanceTo(w.a) < 1 ? w.b : w.a).clone()]);
}

// Table tennis: the ball comes to your forehand or backhand; say (or click) the side to return it. First to 5.
function playTT(opponent) {
  let me = 0;
  let them = 0;
  const side = () => (Math.random() < 0.5 ? 'forehand' : 'backhand');
  let ball = side();
  const body = h('div', {});
  const finish = () => {
    state.day.optional.tt = true;
    state.reputation += me > them ? 2 : 1;
    close();
    toast(me > them ? `🏓 You beat ${opponent} ${me}–${them}!` : `🏓 ${opponent} wins ${them}–${me}. Rematch tomorrow.`, 4000);
    requestLock();
  };
  const render = (msg) => body.replaceChildren(
    h('p', {}, msg),
    h('p', {}, h('b', {}, `You ${me} – ${them} ${opponent}`)),
    me >= 5 || them >= 5 ? h('button', { class: 'primary', 'data-voice': 'done ok', onclick: finish }, 'Done')
      : h('div', { class: 'row' }, ['forehand', 'backhand'].map((x) => h('button', { 'data-voice': x, onclick: () => hit(x) }, `🎤 ${x[0].toUpperCase()}${x.slice(1)}`))));
  const hit = (x) => {
    const right = x === ball;
    const win = right ? Math.random() < 0.7 : Math.random() < 0.12;
    if (win) me += 1; else them += 1;
    ball = side();
    render(`${right ? (win ? 'Clean return. Point to you!' : `Good read, but ${opponent} smashes it back.`) : `Wrong side! ${opponent} wins the point.`} Next ball: to your ${ball.toUpperCase()}.`);
  };
  const close = openPanel(body, { title: 'Table tennis · Common Room', closable: true });
  render(`${opponent} serves. The ball is coming to your ${ball.toUpperCase()}. Say “forehand” or “backhand”.`);
}

function quickGame(kind) {
  const a = 3 + Math.floor(Math.random() * 6);
  const b = 3 + Math.floor(Math.random() * 6);
  toast(kind === 'carrom' ? `Carrom with Yash: you pocket ${a} coins to his ${b}${a > b ? '. You win!' : '.'}` : `Foosball with Harsh: ${a}–${b}${a > b ? '. You win!' : '. So close.'}`, 4000);
  state.reputation += 1;
  requestLock();
}

function openVending() {
  const items = [['Chips', 20], ['Cold drink', 40], ['Chocolate', 30], ['Biscuits', 10]];
  const close = openPanel(h('div', {},
    h('p', {}, 'Pick a snack and pay by UPI on the screen.'),
    h('div', { class: 'row wrap' }, items.map(([name, price]) => h('button', { 'data-voice': name.toLowerCase(), onclick: () => {
      state.stats.snacks += 1;
      state.day.optional.vending = true;
      close();
      toast(`🥤 ${name} (₹${price}) drops into the tray.`);
      requestLock();
    } }, `🎤 ${name} · ₹${price}`))),
    h('p', { class: 'muted small' }, 'Prices are illustrative.')), { title: `Vending machine · ${hereHostel().name} lobby`, closable: true });
}

function openHostelNotices() {
  openPanel(h('div', {},
    h('ul', { class: 'clean' },
      h('li', {}, '📌 Room inspection this Saturday, 10:00. Keep your room tidy.'),
      h('li', {}, '📌 Inter-Bhawan TT tournament: sign up in the common room.'),
      h('li', {}, '📌 Keep the noise down in the corridors after 23:00.'),
      h('li', {}, '📌 Lost: blue steel water bottle near the first-floor washroom.'),
      h('li', {}, '📌 Water tanks are cleaned on Sunday morning. Store water the night before.')),
    h('p', { class: 'muted small' }, 'Sample notices for the game.')), { title: `${hereHostel().name} · Notice board`, closable: true });
}

// Half an hour of revision, stopping in time for the next lecture, lab or paper.
function studyAtDesk() {
  const d = state.day;
  const next = slots.find((x) => x.start > d.clock && !['break', 'lunch'].includes(x.type));
  d.clock = Math.min(d.clock + 30, next ? next.start : d.clock + 30);
  state.reputation += 1;
  toast(`📚 You revise at your desk until ${fmt(d.clock)}.${next && d.clock >= next.start ? ` ${next.label} is starting!` : ''}`, 4000);
  requestLock();
}

// ---------- The mess (college) ----------
const mealsEaten = () => Object.values(state.day.meals || {}).filter(Boolean).length;
const pendingMeal = (slot) => isCollege(state.classNum) && slot.meal && !state.day.meals?.[slot.meal];

function eatAtMess(slot) {
  const d = state.day;
  d.meals ||= {};
  const meal = slot.meal;
  if (!meal) {
    const next = slots.find((s) => s.meal && s.start > d.clock);
    toast(next ? `The mess is closed now. ${MEALS[next.meal]} is served from ${fmt(next.start)}.` : 'The mess is closed for the night. Breakfast is from 07:30.');
    requestLock();
    return;
  }
  if (d.meals[meal]) { toast(`You've already had ${meal}. ${mealsEaten()}/${slots.filter((s) => s.meal).length} meals today.`); requestLock(); return; }
  const menu = menuFor(state.sem.day)[meal];
  const close = openPanel(h('div', {},
    h('p', {}, `${MEALS[meal]} is being served. Grab a steel thali and join the queue.`),
    h('p', {}, h('b', {}, 'On the menu: '), menu),
    h('p', { class: 'muted small' }, 'Sample menu. Eating takes about 20 game minutes.'),
    h('div', { class: 'row' }, h('button', { class: 'primary', 'data-voice': 'eat yes food', onclick: () => {
      d.meals[meal] = true;
      state.sem.meals = (state.sem.meals || 0) + 1;
      d.clock = Math.min(d.clock + 20, slot.end);
      close();
      save(true);
      toast(`✔ ${MEALS[meal]} done · ${mealsEaten()}/${slots.filter((s) => s.meal).length} meals today.`, 4000);
      requestLock();
    } }, '🎤 Say “eat” or click'))), { title: `VKB Mess · ${MEALS[meal]}`, closable: true });
}

const mealTimes = () => Object.fromEntries(slots.filter((s) => s.meal).map((s) => [s.meal, `${fmt(s.start)}–${fmt(s.end)}`]));

// The menu board outside the mess: today and the next three days (the sample menu repeats every four days).
function openMessMenu() {
  const day = state.sem?.day || 0;
  const times = mealTimes();
  openPanel(h('div', {},
    h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Day'), ...Object.keys(MEALS).map((m) => h('th', {}, `${MEALS[m]}${times[m] ? ` (${times[m]})` : ''}`)))),
      h('tbody', {}, [0, 1, 2, 3].map((k) => { const m = menuFor(day + k); return h('tr', {}, h('td', {}, k === 0 ? h('b', {}, 'Today') : k === 1 ? 'Tomorrow' : `Day ${day + k + 1}`), ...Object.keys(MEALS).map((x) => h('td', {}, m[x]))); }))),
    h('p', { class: 'muted small' }, 'Sample menu, not the real VKB menu. Extras are at Pitstop, inside by the door.')), { title: 'VKB Mess · Menu', closable: true });
}

// Pitstop, the extras counter in the mess: anything here goes on your mess bill.
function openPitstop() {
  const sem = state.sem;
  sem.extras ||= 0;
  const close = openPanel(h('div', {},
    h('p', {}, 'Hungry between meals, or want something extra? Pick one. It goes on your mess bill.'),
    h('div', { class: 'row wrap' }, PITSTOP.map((it) => h('button', { 'data-voice': it.id, onclick: () => {
      sem.extras += it.price;
      state.stats.extras = (state.stats.extras || 0) + 1;
      state.day.optional.pitstop = true;
      close();
      save(true);
      toast(`${it.emoji} ${it.name} (₹${it.price}) · mess bill this semester: ₹${sem.extras}`, 4000);
      requestLock();
    } }, `${it.emoji} ${it.name} · ₹${it.price}`))),
    h('p', { class: 'muted small' }, `Extras this semester: ₹${sem.extras}. Prices are illustrative. Say the item's name to order.`)), { title: 'Pitstop · Extras', closable: true });
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
function openTimetable(justRegistered = false) {
  const clock = state.day.clock;
  if (isCollege(state.classNum) && state.phase === 'day') return openSemesterTimetable(justRegistered);
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

// College: today's timetable, skip/sleep buttons, and the whole semester calendar.
function openSemesterTimetable(justRegistered) {
  const clock = state.day.clock;
  const d = today();
  const next = nextSlot(slots, clock);
  const icon = { registration: '📝', class: '📚', holiday: '🏖', free: '☀', sports: '🏅', fest: '🎉', midsem: '✏', compre: '📝' };
  const dayLine = (x, i) => {
    const lectures = x.kind === 'class' ? '' : x.papers ? ` · ${x.papers.map((id) => getClassSubjects(state.classNum).find((s) => s.id === id)?.code).join(', ')}` : '';
    const what = x.kind === 'midsem' ? 'Mid-semester test' : x.kind === 'compre' ? 'Comprehensive exam' : x.label || (x.kind === 'class' ? 'Classes' : x.kind);
    return h('tr', { class: i === state.sem.day ? 'now' : '' }, h('td', {}, `${i + 1}`), h('td', {}, `W${x.week} ${x.weekday} · ${x.month}`), h('td', {}, `${icon[x.kind] || ''} ${what}${lectures}`), h('td', {}, i < state.sem.day ? '✔' : i === state.sem.day ? '◀ today' : ''));
  };
  openPanel(h('div', {},
    justRegistered ? h('p', {}, h('b', {}, '✔ You’re registered. Here is your semester. Classes begin tomorrow.')) : null,
    h('h4', {}, `Today · ${dayTitle(d, state.sem.day, semLength())}${d.label ? ` · ${d.label}` : ''}`),
    h('table', {},
      h('thead', {}, h('tr', {}, ['Time', 'What', 'Where', 'Status'].map((x) => h('th', {}, x)))),
      h('tbody', {}, slots.map((s) => {
        let status = '';
        if (s.type === 'lesson') status = state.day.lessonsDone[s.subject] ? '✔ attended' : state.day.attendance[s.id] === 'absent' ? '✘ missed' : '';
        if (s.type === 'exam') status = state.day.examDone ? '✔ written' : clock >= s.end ? '✘ missed' : '';
        if (s.type === 'lab') status = state.day.practicalsDone[s.lab] !== undefined ? '✔ done' : '';
        if (s.meal) status = state.day.meals?.[s.meal] ? '✔ eaten' : clock >= s.end ? '✘ skipped' : '';
        const now = clock >= s.start && clock < s.end;
        const where = { free: 'Anywhere', classroom: 'NAB', sciencelab: 'FD-II lab', reception: 'Main Building', canteen: 'Mess / ANC', mess: 'VKB mess', auditorium: 'SAC Auditorium', playground: 'Gymkhana', gate: 'Your room, Krishna Bhawan' }[s.location] || s.location;
        return h('tr', { class: now ? 'now' : '' }, h('td', {}, `${fmt(s.start)}–${fmt(s.end)}`), h('td', {}, s.label), h('td', {}, where), h('td', {}, now ? '◀ now ' : '', status));
      }))),
    h('div', { class: 'row wrap' },
      next && next.type !== 'departure' ? h('button', { 'data-voice': 'skip next wait', onclick: () => skipToNext() }, `⏩ Skip to ${fmt(next.start)} · ${next.label}`) : null,
      h('button', { 'data-voice': 'sleep end day', onclick: () => { closeAll(); endDay(); } }, isLastDay(state.classNum, state.sem.day) ? '📝 Finish the semester' : '🌙 End the day and sleep')),
    h('p', { class: 'muted small' }, 'Skipping past a lecture or paper marks it missed. Time runs at 15 s per game minute (Settings), and holding Z speeds it up.'),
    h('h4', {}, `Semester calendar · ${COLLEGE[state.classNum].label}`),
    h('table', {}, h('tbody', {}, CALENDAR[state.classNum].map(dayLine))),
    h('p', { class: 'muted small' }, CALENDAR_NOTE)),
  { title: `Timetable · ${COLLEGE[state.classNum].label}`, closable: true, wide: true });
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
      daily: slots.filter((s) => s.meal).map((s) => [`${MEALS[s.meal]} at the VKB mess (${fmt(s.start)}–${fmt(s.end)})`, !!d.meals?.[s.meal]]),
      mandatory: [
        ['Register for your courses (registration day)', !!state.sem.registered],
        [`Today's lectures (${slots.filter((s) => s.type === 'lesson' && d.lessonsDone[s.subject]).length}/${slots.filter((s) => s.type === 'lesson').length})`, slots.filter((s) => s.type === 'lesson').every((s) => d.lessonsDone[s.subject])],
        [`Semester attendance: ${(() => { const held = Object.values(state.sem.held).reduce((a, b) => a + b, 0); return held ? `${Math.round(Object.values(state.sem.attended).reduce((a, b) => a + b, 0) / held * 100)}%` : 'no lectures yet'; })()}`, true],
        [`Labs (${pr.filter((p) => d.practicalsDone[p.subject] !== undefined).length}/${pr.length})`, pr.every((p) => d.practicalsDone[p.subject] !== undefined)],
        [`Submit the assignment at the Library: ${COLLEGE[c].project.name}`, d.projectDone],
        [`Mid-sems written (${Object.keys(state.sem.midsem).length}/${courses.length})`, Object.keys(state.sem.midsem).length >= courses.length],
        [`Compre papers written (${Object.keys(state.sem.compre).length}/${courses.length})`, !!state.years[c]?.results],
      ],
      optional: [
        [`Talk to batchmates (${d.optional.talked.length}/3)`, d.optional.talked.length >= 3],
        [`Go to ${c === 13 ? 'Oasis' : 'APOGEE'} (fest day)`, d.eventDone],
        ['Help a batchmate with a lecture', d.optional.helped],
        ['Grab something at ANC', d.optional.canteen],
        ['Read in the Central Library', d.optional.library],
        ['Play TT in the Krishna Bhawan common room', !!d.optional.tt],
        ['Grab an extra at Pitstop (VKB mess)', !!d.optional.pitstop],
        ['Get a snack from the Bhawan vending machine', !!d.optional.vending],
        [`Meals at the mess this semester: ${state.sem.meals || 0}`, false],
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
    m.daily ? [h('h4', {}, `Today’s missions · meals (${mealsEaten()}/${m.daily.length})`), h('ul', { class: 'clean missions' }, m.daily.map(row))] : null,
    h('h4', {}, 'Mandatory (needed for promotion)'), h('ul', { class: 'clean missions' }, m.mandatory.map(row)),
    h('h4', {}, 'Optional (make school life richer)'), h('ul', { class: 'clean missions' }, m.optional.map(row)),
    h('p', { class: 'muted small' }, 'Promotion needs 33% in every subject, 75% lesson attendance and the project. Optional missions never block promotion.')), { title: 'Missions', closable: true });
}

function openHelp() {
  openPanel(h('div', { class: 'help' },
    h('table', {}, h('tbody', {}, (touch.on ? [
      ['Left thumb', 'Joystick: walk (push to the edge to run); on the cycle, up pedals and sideways steers'], ['Right thumb', 'Drag to look around'],
      ['✋', 'Interact / sit / stand (lights up when there is something to do)'], ['⤒', 'Jump'], ['🎤', 'Voice: speak to choose options or talk'],
      ['🚲', 'College: hop on / off your cycle'], ['⏩', 'Hold to fast-forward time'], ['👁', 'First-person / third-person view'], ['🗺', 'College: full campus map'], ['☰', 'Menu: timetable, missions, journey, settings'],
    ] : [
      ['W A S D', 'Run'], ['Mouse', 'Look around'], ['Shift + W A S D', 'Walk'], ['Space', 'Jump'], ['E', 'Interact / sit / stand'],
      ['F', 'Voice: speak to choose options or talk (Chrome)'], ['T', 'Timetable'], ['M', 'Missions'], ['J', 'Learning Journey'],
      ['V', 'Switch first-person / third-person view'], ['C', 'College: hop on / off your cycle'], ['N', 'College: full campus map'], ['Hold Z', 'Fast-forward time'], ['L', 'Bhawan guide: floor plan and where things are'], ['`', 'Performance stats (frame rate, draw calls)'], ['Esc', 'Pause menu'],
    ]).map(([k, v]) => h('tr', {}, h('td', {}, h('kbd', {}, k)), h('td', {}, v))))),
    h('p', {}, 'Lessons start automatically when you sit at your desk (yellow mark) in the classroom during a lesson period. Sitting early makes time skip to the bell.'),
    h('p', {}, 'Voice: press F and say an option (“option two”, “raise hand”, “bye”), or near a classmate say “hello Diya”. Say “timetable” or “journey” to open them.')), { title: 'How to play', closable: true });
}

function openSettings() {
  const s = state?.settings;
  if (!s) return;
  const range = (label, key, min, max, step) => h('label', { class: 'setting' }, label,
    h('input', { type: 'range', min, max, step, value: s[key], oninput: (e) => { s[key] = Number(e.target.value); player.sensitivity = s.sensitivity; } }));
  openPanel(h('div', { class: 'settings' },
    range(touch.on ? 'Look sensitivity' : 'Mouse sensitivity', 'sensitivity', 0.3, 2.5, 0.1),
    h('label', { class: 'setting' }, 'Game time speed',
      h('select', { onchange: (e) => { s.timeScale = Number(e.target.value); } },
        [[TIME_SPEEDS.slow, 'Slow'], [TIME_SPEEDS.normal, 'Normal'], [TIME_SPEEDS.fast, 'Fast'], [TIME_SPEEDS.veryFast, 'Very fast'], ...(Object.values(TIME_SPEEDS).includes(s.timeScale) ? [] : [[s.timeScale, 'Custom']])]
          .map(([v, l]) => h('option', { value: v, selected: s.timeScale === v }, `${l} · ${Math.round(1 / v * 10) / 10} s per game minute (an hour ≈ ${Math.round(60 / v / 6) / 10} min)`)))),
    h('label', { class: 'setting' }, 'Graphics quality',
      h('select', { onchange: (e) => { s.graphics = e.target.value; graphics.setQuality(s.graphics); } },
        PROFILE_ORDER.map((v) => h('option', { value: v, selected: (s.graphics || DEFAULT_PROFILE) === v }, `${PROFILES[v].label} (${PROFILES[v].note})`)))),
    h('label', { class: 'setting check' }, h('input', { type: 'checkbox', checked: graphics.perf.visible, onchange: (e) => graphics.perf.setVisible(e.target.checked) }), 'Show performance stats (or press ` in the game)'),
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
    isCollege(state.classNum) && h('button', { 'data-voice': 'bhawan guide', onclick: () => { toast(bhawanGuide.toggle() ? 'Bhawan guide on' : 'Bhawan guide off'); closeAll(); requestLock(); } }, 'Bhawan guide on / off'),
    h('button', { 'data-voice': 'settings', onclick: () => openSettings() }, 'Settings'),
    h('button', { 'data-voice': 'help controls', onclick: () => openHelp() }, 'How to play'),
    h('button', { 'data-voice': 'film campus tour watch', onclick: () => playFilm() }, '🎬 Watch the campus film'),
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
    if (touch.on) s.settings.graphics = 'medium';
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
    h('button', { 'data-voice': 'film campus tour watch', onclick: () => playFilm() }, '🎬 Watch the campus film'),
    h('div', { class: 'title-row' },
      saveInfo && h('button', { onclick: () => { const s = loadGame(); if (s) { state = s; openJourney(ctx); } } }, 'Learning Journey'),
      h('button', { onclick: () => { state ||= createState(); openSettings(); } }, 'Settings'),
      h('button', { onclick: () => openPanel(h('div', {},
        h('p', {}, 'LIFE OF MIRNAL: a first-person Indian school and college life game. School runs from Class 1 to Class 12; college starts at BITS Pilani.'),
        h('p', {}, 'Built with Three.js (MIT licence). Every 3D object is generated from simple shapes in code, so there are no third-party art assets. National Anthem recording: U.S. Navy Band (public domain).'),
        h('p', {}, 'Sunrise Public School, its staff and students, and the professors and batchmates at college are fictional. BITS Pilani first-year courses follow the official course list. Lesson content is simplified for gameplay.'), h('p', {}, 'Campus map data © OpenStreetMap contributors (ODbL).')), { title: 'Credits', closable: true }) }, 'Credits')),
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
  if (touch.on && innerHeight > innerWidth) toast('📱 Turn your phone sideways for the best view.', 4000);
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
        if (ok) { close(); toast(`🎤 Microphone on. Let’s go to ${state && isCollege(state.classNum) ? 'college' : 'school'}!`); } else status.textContent = 'Permission was blocked. Allow the microphone in Chrome’s address bar, then try again.';
      } }, '🎤 Turn on my microphone'))), { title: '🎤 This school runs on your voice' });
}

// ---------- Pointer lock & input ----------
function requestLock() {
  if (mode !== 'playing' || isOpen() || touch.on) return;
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
  if (mode === 'film' && e.code === 'Escape' && film && !film.capturing) return film.finish();
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
  if (e.code === 'Backquote') return graphics.perf.setVisible(!graphics.perf.visible);
  if (e.code === 'KeyL' && state && isCollege(state.classNum)) return toast(bhawanGuide.toggle() ? 'Bhawan guide on (L)' : 'Bhawan guide off (L)');
  if (e.code === 'KeyC' && !isOpen() && isCollege(state.classNum) && state.phase !== 'graduated') {
    if (player.seated) return toast('Stand up first (E).');
    if (campus.roomAt(player.pos.x, player.pos.z)) return toast('No cycling indoors. Step outside first.');
    setBike(!player.bike);
    return toast(player.bike ? '🚲 On your cycle. Press C to get off.' : 'Cycle parked.');
  }
  if (e.code === 'KeyN' && isCollege(state.classNum)) {
    mapRoute.at = -99;
    return minimap.toggleBig();
  }
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
  if (player.bike && campus.roomAt(player.pos.x, player.pos.z)) {
    setBike(false);
    toast('Cycle parked outside. No riding indoors.');
  }
  bike.visible = player.bike && third;
  if (bike.visible) {
    // Saddle (0.3 m behind the bike's centre) sits under the rider.
    bike.position.copy(player.pos).addScaledVector(player.forward(), 0.3);
    bike.rotation.y = player.yaw;
    for (const w of bike.userData.wheels) w.rotation.x -= (player.bikeSpeed * dt) / 0.34;
    bike.userData.handle.rotation.set(0, player.steer * 0.35, Math.PI / 2);
  }
  document.getElementById('crosshair').classList.toggle('hidden', third);
  if (!third) return;
  const gait = player.gait();
  avatar.poseAs(player.pos, player.yaw, player.moving, player.seated, dt, player.bike ? (gait === 'ride' ? 'ride' : 'bikeIdle') : gait, player.speedNow);
  const eye = player.seated ? player.eye * 0.8 : player.eye;
  const head = new THREE.Vector3(player.pos.x, player.pos.y + eye, player.pos.z);
  const cp = Math.cos(player.pitch);
  const dir = new THREE.Vector3(-Math.sin(player.yaw) * cp, Math.sin(player.pitch), -Math.cos(player.yaw) * cp);
  const maxDist = player.seated ? 2.2 : player.bike ? 4.4 : 3.4;
  // colliders around the camera boom only
  const reach = maxDist + 0.5;
  const cols = campus.allColliders().filter((c) => c.enabled && c.maxX > head.x - reach && c.minX < head.x + reach && c.maxZ > head.z - reach && c.minZ < head.z + reach && c.maxY > head.y - 1 && c.minY < head.y + 1.6);
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
  if (campus.roomAt(cam.x, cam.z, cam.y) || campus.roomAt(player.pos.x, player.pos.z, player.pos.y)) cam.y = Math.min(cam.y, player.pos.y + 2.75);
  cam.y = Math.max(cam.y, player.pos.y + 0.3);
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
  move: document.getElementById('hud-move'),
  ff: document.getElementById('hud-ff'),
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
    const sem = state.sem;
    const reg = slots.find((x) => x.type === 'arrival');
    if (!sem.registered && reg && d.clock < reg.start) {
      if (pendingMeal(slot)) return { text: `Breakfast at the VKB mess first (E at the counter). Registration opens at ${fmt(reg.start)}`, loc: 'mess' };
      return { text: `Registration opens at ${fmt(reg.start)} at the Main Building. Head there now`, loc: 'reception' };
    }
    if (slot.type === 'arrival' && !sem.registered) return { text: 'Register for your courses at Academic Registration, Main Building (E)', loc: 'reception' };
    if (!sem.registered && ['break', 'lunch'].includes(slot.type)) return { text: 'You missed registration: late registration at the Main Building (E)', loc: 'reception' };
    if (slot.type === 'arrival') return { text: 'Registered! Classes begin tomorrow. Explore the campus (T: timetable)', loc: null };
    if (slot.type === 'lab') {
      const pending = getPracticals(state.classNum).some((p) => p.subject === slot.lab && d.practicalsDone[p.subject] === undefined);
      return pending ? { text: 'Lab session: go to the lab bench in FD-II (E)', loc: 'sciencelab' } : { text: 'Lab done for today!', loc: null };
    }
    if (slot.type === 'exam') return d.examDone ? { text: 'Paper done. Free for the rest of the day', loc: null } : { text: `${slot.label}: sit at your desk in the NAB lecture theatre`, loc: atDesk() ? null : 'classroom' };
    if (slot.type === 'fest') return d.eventDone ? { text: 'Enjoy the fest, then head back to the Bhawan', loc: null } : { text: `${today().fest} is on! Go to the Auditorium stage (E)`, loc: 'auditorium' };
    if (slot.type === 'sports') return { text: 'BOSM is on: watch or play at the Gymkhana Grounds', loc: 'playground' };
    if (slot.type === 'departure') return { text: 'Night: go to your room in Krishna Bhawan and sleep (E at the bed)', loc: 'gate' };
    if (slot.type === 'lesson' && !d.lessonsDone[slot.subject]) return { text: `${slot.label}: take your seat (yellow mark)`, loc: atDesk() ? null : 'classroom' };
    if (slot.type === 'lesson') return { text: 'Lecture done. Next: check the timetable (T)', loc: null };
    if (slot.type === 'break' || slot.type === 'lunch') {
      const next = nextSlot(slots, d.clock);
      const p = getProject(state.classNum);
      if (pendingMeal(slot)) return { text: `${MEALS[slot.meal]} is on at the VKB mess (E at the counter)${next && ['arrival', 'lesson', 'lab', 'exam', 'fest', 'sports'].includes(next.type) ? ` · ${next.label.split(' · ')[0]} at ${fmt(next.start)}` : ''}`, loc: 'mess' };
      if (next && ['lesson', 'lab', 'exam', 'fest', 'sports'].includes(next.type)) return { text: `${slot.label}. Next at ${fmt(next.start)}: ${next.label} (T → skip ahead)`, loc: null };
      if (p && !d.projectDone && sem.registered) return { text: `${slot.label}. Assignment due: ${p.name} (Library)`, loc: 'library' };
      return { text: `${slot.label} (T → skip ahead)`, loc: null };
    }
  }
  switch (slot.type) {
    case 'arrival': return { text: 'Walk to the Assembly Ground', loc: 'assembly' };
    case 'assembly': return d.assemblyDone ? { text: 'Head to the classroom for Period 1', loc: 'classroom' } : { text: 'Join the morning assembly (E)', loc: 'assembly' };
    case 'lesson': return d.lessonsDone[slot.subject] ? { text: 'Lesson done. Stay seated for the next period', loc: null } : { text: `${slot.label}: sit at your desk (yellow mark)`, loc: atDesk() ? null : 'classroom' };
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
  hud.cls.textContent = state.phase === 'collegeYearDone' ? 'BITS Pilani · Year 1 complete' : isCollege(c) ? `BITS Pilani · ${COLLEGE[c].label} · ${dayTitle(today(), state.sem.day, semLength())}` : state.phase === 'graduated' ? 'Graduated · Class of Sunrise' : state.phase === 'orientation' ? 'Class 10 → 11 · Orientation' : `Class ${c} · ${STAGES[stageOf(c)]}`;
  hud.time.textContent = state.phase === 'day' ? fmt(state.day.clock) : '';
  const gait = player.gait();
  hud.move.textContent = player.seated ? '🪑 Seated' : gait === 'ride' ? `🚲 Cycling · ${Math.round(player.speedNow * 3.6)} km/h` : gait === 'run' ? '🏃 Running' : gait === 'walk' ? '🚶 Walking' : player.bike ? '🚲 On your cycle' : '🧍 Standing';
  hud.ff.classList.toggle('hidden', !fastForward || state.phase !== 'day');
  hud.slot.textContent = slot.label;
  const obj = objective(slot);
  hud.mission.textContent = obj.text;
  const subjects = state.phase === 'day' ? getClassSubjects(c, state.stream) : [];
  const topics = subjects.flatMap((s) => s.topics);
  const practised = topics.filter((t) => (state.topics[t.id]?.level ?? 0) >= 3).length;
  hud.progress.textContent = topics.length ? `📘 ${practised}/${topics.length} topics practised · ⭐ ${state.reputation}` : `⭐ ${state.reputation}`;
  const target = obj.loc && campus.objectivePoint(obj.loc);
  minimap.update(player, target, isCollege(c) ? liveMap().route : null);
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
  hud.prompt.textContent = player.seated ? (state.phase === 'day' && ['lesson', 'exam'].includes(nextSlot(slots, state.day.clock)?.type) && !fastForward ? `E · stand up · hold Z to fast-forward to the ${nextSlot(slots, state.day.clock).type === 'exam' ? 'paper' : 'lecture'}` : 'E · stand up') : t ? `E · ${t.label}` : '';
  if (touch.on) hud.prompt.textContent = hud.prompt.textContent.replace(/^E · /, '✋ · ').replace('hold Z', 'hold ⏩');
  hud.prompt.classList.toggle('hidden', !hud.prompt.textContent || isOpen() || !!anthem);
  hud.resume.classList.toggle('hidden', !!document.pointerLockElement || touch.on || isOpen() || mode !== 'playing');
}

// ---------- The campus film ----------
// Mirnal's journey from Class 1 to BITS Pilani, in the game engine (js/cinematic/cinematic.js). From the title screen or the
// pause menu; ?film in the URL plays it on load. capture: driven frame by frame by dev/render-film.mjs.
let film = null;
function playFilm({ capture = false } = {}) {
  if (film) return film;
  closeAll();
  exitLock();
  minimap.closeBig();
  bhawanGuide.hide();
  const back = { mode, college: campus === bitsCampus && !!bitsCampus, quality: graphics.quality.name, hidden: [] };
  for (const n of npcs.npcs.values()) if (n.group.visible) { n.group.visible = false; back.hidden.push(n); }
  avatar.group.visible = false;
  bike.visible = false;
  titleEl.classList.add('hidden');
  document.getElementById('hud').classList.add('hidden');
  useWorld('college');
  minimap.setVisible(false);
  graphics.setQuality(capture ? 'ultra' : state?.settings.graphics || (touch.on ? 'medium' : 'high'));
  mode = 'film';
  film = new Cinematic({ scene, camera, campus: bitsCampus, school: schoolCampus, setWorld: (kind) => useWorld(kind), graphics, bike, range: COLLEGE_RANGE });
  film.capturing = capture;
  film.start({ onEnd: () => endFilm(back), showSkip: !capture, music: capture ? null : 'audio/film-score.m4a' });
  return film;
}

function endFilm(back) {
  if (!film) return;
  film.stop();
  film = null;
  for (const n of back.hidden) n.group.visible = true;
  graphics.setQuality(back.quality);
  if (back.mode === 'playing') {
    useWorld(back.college ? 'college' : 'school');
    mode = 'playing';
    document.getElementById('hud').classList.remove('hidden');
    if (back.college) campus.messKey = null;
    // the film writes its own lessons on the classroom boards: put this year's back
    if (state && state.phase === 'day') {
      campus.rebuildClassroom(state.classNum, classroomTitle());
      const seat = campus.seats[campus.playerSeatIndex];
      deskInteract.pos.set(seat.desk.x, 1, seat.desk.z + 0.3);
    }
    return;
  }
  useWorld('school');
  player.place(new THREE.Vector3(0, 0, 58), 0);
  camera.position.set(0, 6, 62);
  camera.lookAt(0, 2, 0);
  showTitle();
}

// ---------- Live map ----------
// The route to the current objective along the roads (refreshed every second), for the minimap and the big map.
let mapRoute = { at: -99, key: '', pts: null };
function liveMap() {
  const o = objective(currentSlot(slots, state.day.clock));
  const target = o.loc && campus.objectivePoint(o.loc);
  if (!target || !campus.pathTo) return { target, route: null };
  if (elapsed - mapRoute.at > 1 || mapRoute.key !== o.loc) {
    mapRoute = { at: elapsed, key: o.loc, pts: campus.pathTo(player.pos, campus.rooms?.[o.loc] ? o.loc : null, target) };
  }
  const place = o.loc === 'gate' ? 'Your room · Krishna Bhawan' : campus.rooms?.[o.loc]?.name || { assembly: 'Rotunda', playground: 'Gymkhana', canteen: 'ANC' }[o.loc] || o.loc;
  return { target, route: mapRoute.pts, place, timeScale: state.settings.timeScale };
}

// ---------- Main loop ----------
const clockTimer = new THREE.Clock();
let hudTimer = 0;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clockTimer.getDelta(), 0.05);
  elapsed += dt;
  if (mode === 'film') { if (film && !film.capturing) film.update(dt); return; }
  if (mode === 'playing' && state) {
    const paused = isOpen();
    player.enabled = !paused && (document.pointerLockElement === canvas || touch.on);
    if (!paused) {
      // The clock runs only while you're actually playing: not behind a menu, not on the "click to play" screen.
      fastForward = player.enabled && player.keys.has('KeyZ');
      if (state.phase === 'day' && !state.day.ended && !anthem && player.enabled) {
        const departureEnd = slots.at(-1).end;
        state.day.clock = advanceClock(slots, state.day.clock, dt, state.settings.timeScale, fastForward ? FAST_FORWARD : 1);
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
      if (state.phase === 'day' && isCollege(state.classNum) && !state.day.ended) startExamIfReady(nowSlot);
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
      if (isCollege(state.classNum)) tickHostel();
      if (minimap.bigOpen && isCollege(state.classNum)) minimap.drawBig(player, liveMap());
      const nearHostel = isCollege(state.classNum) && campus.hostelAt?.(player.pos.x, player.pos.z, 14);
      if (nearHostel) bhawanGuide.update(dt, { hostel: nearHostel, player, visible: !isOpen() });
      else bhawanGuide.hide();
      npcs.update(dt, ball);
      if (Math.hypot(ball.pos.x - player.pos.x, ball.pos.z - player.pos.z) < 0.75 && player.moving) {
        const dir = player.lastMove.clone().setY(0).normalize();
        ball.kick(dir.multiplyScalar(player.running ? 11 : 7));
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
      if (isCollege(state.classNum) && campus.setMessBoard) {
        const s = currentSlot(slots, state.day.clock);
        const key = `${state.sem?.day}|${s.meal || ''}`;
        if (key !== campus.messKey) {
          campus.messKey = key; // the day and meal the mess board and counter are showing
          campus.setMessBoard({ day: state.sem?.day || 0, menu: menuFor(state.sem?.day || 0), times: mealTimes(), now: s.meal || null });
          campus.setMessFood(s.meal || null);
        }
      }
    }
  }
  touch.update({ playing: mode === 'playing' && !!state && !isOpen(), college: !!state && isCollege(state.classNum), prompt: !hud.prompt.classList.contains('hidden'), seated: !!player.seated });
  if (state) graphics.setQuality(state.settings.graphics);
  graphics.update(dt, { clock: state?.day?.clock ?? 600, focus: player.pos, view: state?.settings.view || 'first', riding: player.bike });
  graphics.render();
}

// Title camera
player.place(new THREE.Vector3(0, 0, 58), 0);
player.update(0, []);
camera.position.set(0, 6, 62);
camera.lookAt(0, 2, 0);
detectLLM();
showTitle();
frame();
if (new URLSearchParams(location.search).has('film')) playFilm();

// Exposed for automated testing in the browser.
window.__game = { playFilm, get film() { return film; }, graphics, get state() { return state; }, voice, talkTo, get anthem() { return anthem; }, finishAnthem, player, npcs, get campus() { return campus; }, get slots() { return slots; }, interact, handleInteractable, startGame, createState, advanceDay, skipToNext, endDay };
