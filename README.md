# Life of Mirnal

A first-person 3D game about growing up in India: **Mirnal's School Life** (Class 1 to Class 12 at the fictional Sunrise Public School, CBSE-style) and **Mirnal's College Life** (Year 1 of B.E. Chemical Engineering at BITS Pilani).

## Run it

```bash
cd life-of-mirnal
npm install                          # once: installs Three.js and the Anthropic SDK locally
npm start                            # http://localhost:8080, offline conversation engine
ANTHROPIC_API_KEY=sk-ant-... npm start   # optional: Claude-powered conversations
```

The Claude key stays on your machine: only `dev/server.mjs` (locally) and `api/` (on Vercel) use it, and the browser never sees it. Replies use `claude-opus-5-5` at low effort, with server-side refusal fallbacks switched on (`fallbacks: "default"`). Override the model with `NPC_MODEL=...` or turn the AI off with `NPC_LLM=off`. If Claude is unavailable or slow, the game silently uses the offline engine.

Open http://localhost:8080 in Chrome. Click the game to capture the mouse.

| Key | Action |
|---|---|
| W A S D / Mouse | Walk / look |
| Shift / Space | Run (on foot only) / jump |
| E | Interact, sit, stand, talk |
| F | Voice: say an on-screen option ("option two", "raise hand", "bye"), "hello Diya", "timetable", "journey" |
| T / M / J / H | Timetable / Missions / Learning Journey / Help |
| V | Switch first-person / third-person view (also in Settings and the pause menu) |
| Hold Z | Fast-forward time (×4; only while held) |
| Esc | Pause menu (save, settings, quit) |

## Deploy on Vercel

1. Push this folder to a GitHub repository.
2. On vercel.com, choose **Add New → Project**, import the repository, and keep the defaults (Framework preset: **Other**, no build command, output directory: the repository root). Vercel installs `@anthropic-ai/sdk` for the API functions automatically.
3. Deploy. The game is static (`index.html`, `js/`, `data/`, `css/`, `audio/`, and Three.js in `vendor/three/`), and `api/health.js` and `api/npc-chat.js` run as serverless functions.
4. Optional: to get Claude-powered conversations, add `ANTHROPIC_API_KEY` under **Project → Settings → Environment Variables** and redeploy. Without it, the game uses the built-in offline conversation engine.

Voice needs HTTPS (Vercel provides it) and works best in Chrome, whose speech recognition needs an internet connection.

## What's in it

- **Campus:** gate, security cabin, assembly ground with stage and flag, classroom (furniture changes with age), Classroom B, staff room, principal's office, library, science lab, computer lab, canteen, playground with goals, auditorium, reception, washrooms and school bus. Everything is built from code primitives, so there are no third-party assets.
- **A school day for every class:** arrival, assembly (the whole school stands at attention and sings *Jana Gana Mana*; Enter or saying “skip” skips it, with Devanagari and romanised lyrics timed to the official 52 seconds, followed by a yearly event), one period per subject, break, lunch, a lab period (Class 6+), a games period and dismissal. The clock runs at one game minute every 15 real seconds by default (Settings: Slow 30 s, Normal 15 s, Fast 4 s, Very fast 1 s per game minute), stops whenever a menu or the click-to-play screen is up, and only speeds up while you hold Z (×4) or skip ahead from the timetable (T); missed periods are marked absent.
- **Lessons:** sit at the yellow-marked desk and the lesson starts at the bell. The teacher teaches each topic, you can raise your hand, then answer a practice question.
- **Exams and report cards:** annual exams (simulated CBSE boards in Class 10 and 12), theory and internal marks, the CBSE 9-point grade scale, a 33% pass mark and 75% attendance. Remedial exams, make-up classes, late project submission and repeating a year are all supported.
- **Mirnal's Learning Journey (J):** a timeline for Classes 1–12, mastery per topic (Not started → Introduced → Learning in progress → Practised → Mastered) with an activity log, a growth dashboard, a portfolio and friendships. A low exam score never erases learning you already showed.
- **Class 11 stream selection:** an Orientation Day after Class 10. Meet the counsellor, talk to seniors from each stream and your parents, then use the subject-combination builder (7 streams, 21 subjects, live rule checks, comparison screen). Subjects can be changed on the first morning of Class 11. Classes 11–12 use the chosen subjects, labs and projects.
- **Real conversations:** walk up to anyone and talk (E, or just speak with F). A chat window shows the conversation, with a 🎤 that reopens after every reply, a text box and suggestion chips. The offline engine (`js/core/chat.js`) works out what you actually said: greetings, how-are-you, hobbies, favourite subjects, games, help with today's lessons, homework, exams, food, the timetable, directions, jokes, feelings, compliments, rudeness, apologies, the future, streams and goodbyes, in English and common Hinglish. It answers in each character's personality, remembers facts you share ("I love Science"), asks you questions back and handles your answers, and says so when it doesn't understand instead of guessing. Teachers re-explain the actual topics they taught you. With a Claude key, the same grounded facts feed Claude for fully natural lines.
- **People:** 7 classmates with personalities, interests, friendship levels and memories. They grow up with you, one joins in Class 6 and one moves away after Class 10. Subject teachers, PE teacher, principal, librarian, canteen uncle and guard follow the timetable around campus.
- **Voice-first (on by default):** a new game asks for the microphone. Every multiple-choice question in lessons, exams, remedial exams, practicals and projects has to be answered out loud ("A", "option B", "the second one", or the answer itself), and mouse clicks on answers are refused. Every screen has a 🎤 button and F works everywhere. Arrive early at the assembly line to practise the anthem line by line. At assembly you can read the thought for the day aloud. Spoken answers, anthems sung and practice sessions show on the Learning Journey dashboard. If the microphone is unavailable or blocked, the game falls back to clicking, and it can be turned off in Settings. Recognition uses Chrome's speech service; no audio is stored.
- **College Journey: BITS Pilani (Year 1):** start it from the title screen or from the school gate after graduating. College is played on the real BITS Pilani campus at full scale (about 1.4 × 2 km), built from OpenStreetMap footprints: every building at its real position and shape, Bhawans with courtyards, the NAB axis, the Rotunda and Clock Tower, Saraswati Temple, Shiv Ganga, the Gymkhana with its track, C'not and ANC.
  - **Real places:** lectures in NAB, chemistry lab in FD-II, library at the BITS Library, staff room in FD-I, registration and the computer lab in the Main Building, fest in SAC, assembly at the Rotunda, and you start at your Bhawan (Krishna).
  - **Getting around:** walking is 2 m/s, Shift runs at 4.5 m/s, and C gets on or off a bicycle (W pedals, S brakes, A/D steer; up to 7 m/s ≈ 25 km/h, never indoors). The HUD shows which you're doing. Krishna Bhawan to the Main Building is about 13 game minutes on foot, 6 running and 4 by cycle. The minimap (top right) points at your next objective, and N opens the full labelled campus map. Far-away characters are streamed in place so the day keeps moving.
  - **Courses:** the first-year courses follow BITS Pilani's published list. Semester 1: MATH F111, PHY F111, CHEM F111, BIO F111, BITS F110, plus the PHY/CHEM/BIO F110 labs (17 units). Semester 2: BITS F111, MATH F112, MATH F113, CS F111, EEE F111, BITS F112, plus the ME F112 workshop (20 units).
  - **A semester, day by day:** Semester 1 is 34 playable days (Aug–Dec) and Semester 2 is 30 (Jan–May), in the order of the BITS academic calendar: registration day first (the timetable is issued once you register; late registration is possible), then classwork with two or three lectures a day in NAB and lab sessions in FD-II, holidays, BOSM (Sem 1), mid-semester tests in week 10, Oasis or APOGEE, the last day of classes, and three comprehensive-exam days. Each day starts at 7:30 in your room in Krishna Bhawan, which you can walk in and out of; at night, sleep in your bed (or end the day from the timetable) to move to the next day. Each lecture teaches the next topic of its course; attendance counts across the semester; exams are written at your NAB desk; theory marks are 35% mid-sem and 65% compre, and the grade sheet comes after the last compre paper.
  - **Meals at the mess (daily missions):** breakfast, lunch and dinner are served in the VKB mess next to Krishna Bhawan (its OpenStreetMap name). Walk in, press E at the counter and eat (about 20 game minutes). The HUD points you there at mealtimes, the Missions panel (M) ticks off each meal, the timetable marks meals eaten or skipped, batchmates eat there too, and the night summary shows today's count. The menu is a sample, not the real VKB menu.
  - **Calendar sources:** the semester order and dates follow the BITS academic calendar for 2025-26 (as published for the Hyderabad campus and quoted BITS-wide in the BITS-ISU calendar): registration Aug 1 / Jan 5, mid-sems Oct 6–11 / Mar 9–14, last classes Nov 29 / Apr 29, compre Dec 1–16 / May 2–16. The Pilani campus calendar PDF was no longer online, so Pilani's own fest dates (BOSM, Oasis, APOGEE) are approximate, and the weekly lecture pattern is illustrative, not the official timetable.
  - **Grades:** a BITS-style grade sheet with letter grades, SGPA and CGPA.
  - **Ending:** the year ends with a roadmap of Mirnal's real internships and projects from the resume.
  - **Simplifications:** professors, batchmates and story events are fictional, and grading is a simplified absolute scale (real BITS grading is relative).
- **Graduation:** the final portfolio, "THE SCHOOL JOURNEY OF MIRNAL", with a generated reflection. It can be revisited any time.
- **National Anthem, sung by everyone:** at every assembly the U.S. Navy Band's public-domain instrumental plays (see `audio/ATTRIBUTION.md`), lyrics appear line by line, and every character stands at attention and sings. Mirnal has to sing too. The microphone measures how long you sing and recognises anthem words. Singing along earns reputation; you can skip it any time. Lyric timing is approximate.
- **Saving:** browser localStorage. It autosaves after lessons and year changes, and you can save manually from the pause menu.

## Code map

```
data/            curriculum-primary.js (1–5), curriculum-middle.js (6–10), senior-a/b.js (11–12),
                 curriculum.js (index), streams.js (streams + rules), people.js, events.js
js/core/         state, academics (mastery, marks, promotion), streams (validation), timetable, save — pure logic, no DOM
js/world/        campus (3D school), bits-world (real-scale BITS campus), player, npcs (characters, ball), labels
data/bits-campus.js  BITS Pilani footprints, roads and areas from OpenStreetMap, in metres from the Rotunda
js/ui/minimap.js minimap and full map (N) for the college campus
js/ui/           dom helpers, academic screens, dialogue, stream builder, learning journey
js/voice.js      speech in/out; setResponder() is the hook for a future LLM backend (no keys in the client)
js/main.js       game loop, school-day flow, NPC schedules, interactions, HUD
tests/           node --test: 15 tests for mastery, promotion, streams, history, save/load, full 12-year run
```

`npm test` runs the logic tests.

## Verified vs. assumed

- **Simplified from the CBSE scheme (verify before relying on it):** one language plus 4 electives with an optional additional subject; Maths and Applied Maths, and Computer Science and Informatics Practices, can't be combined; the 33% pass mark, 75% attendance and the 9-point grade scale. Check against https://cbseacademic.nic.in/curriculum_2027.html.
- **Game design choices (configurable in data/streams.js):** a school timetable clash (Biology + Accountancy), at most 1 skill subject among the electives, and the subject-change window.
- **Lesson content** is short, NCERT-level material written for gameplay. It covers 2 topics per subject per class (184 topics in total), not the full syllabus.
- **Not built:** Unity (it isn't installed on this machine, so this is a browser game), LLM-driven conversations (dialogue is scripted, with an API hook), real-time multi-day years (one representative day per class), and stairs or multiple floors.

## Credits

Campus map data © OpenStreetMap contributors (ODbL), https://www.openstreetmap.org/copyright.
