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

On a phone or tablet it switches to touch controls: put your left thumb down anywhere on the left half for a
joystick (push it to the edge to run; on the cycle, up pedals and sideways steers) and drag on the right half to
look around. Buttons: ✋ interact, ⤒ jump, 🎤 voice, 🚲 cycle, ⏩ hold to fast-forward, 👁 view, 🗺 map, ☰ menu.
New games on a phone start on Medium graphics. Hold the phone sideways for the best view.

| Key | Action |
|---|---|
| W A S D / Mouse | Walk / look |
| Shift / Space | Hold to walk (you run by default) / jump |
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
  - **Getting around:** you run at 4.5 m/s (hold Shift to walk at 2 m/s), and C gets on or off a bicycle (W pedals, S brakes, A/D steer; up to 7 m/s ≈ 25 km/h, never indoors). The HUD shows which you're doing. Krishna Bhawan to the Main Building is about 13 game minutes on foot, 6 running and 4 by cycle. The minimap (top right) points at your next objective and draws the route to it along the roads, and N opens the full labelled campus map, which tracks you live like a phone map: a blue dot with your heading, the route to your objective, and its distance and running/cycling time in game minutes. Far-away characters are streamed in place so the day keeps moving.
  - **Courses:** the first-year courses follow BITS Pilani's published list. Semester 1: MATH F111, PHY F111, CHEM F111, BIO F111, BITS F110, plus the PHY/CHEM/BIO F110 labs (17 units). Semester 2: BITS F111, MATH F112, MATH F113, CS F111, EEE F111, BITS F112, plus the ME F112 workshop (20 units).
  - **A semester, day by day:** Semester 1 is 34 playable days (Aug–Dec) and Semester 2 is 30 (Jan–May), in the order of the BITS academic calendar: registration day first (the timetable is issued once you register; late registration is possible), then classwork with two or three lectures a day in NAB and lab sessions in FD-II, holidays, BOSM (Sem 1), mid-semester tests in week 10, Oasis or APOGEE, the last day of classes, and three comprehensive-exam days. Each day starts at 7:30 in your room in Krishna Bhawan; at night, sleep in your bed (or end the day from the timetable) to move to the next day. Each lecture teaches the next topic of its course; attendance counts across the semester; exams are written at your NAB desk; theory marks are 35% mid-sem and 65% compre, and the grade sheet comes after the last compre paper.
  - **Krishna Bhawan, walk-in:** your Bhawan is a full building you can explore. Like the other boys' Bhawans at Pilani it has a ground floor, a first floor and a roof terrace. Rooms line the outer walls, and corridors run round two courtyards behind cusped arches (open on the ground floor, scrollwork grilles upstairs), as in the Gandhi Bhawan walkthrough (Phodu Club, 2026). Inside:
    - **Your room:** bed, study table with a whiteboard, steel almirah, loft shelf, clothesline. E sleeps, studies, opens the almirah, switches the light and opens or closes the door.
    - **Other rooms:** a few lived-in rooms with hostel-mates, each set up differently. All the other rooms are locked doors with 4-digit number plates. Rooms are about 5 m wide, so doors are well spaced down the corridors (170 rooms over two floors).
    - **Common room:** TT (a voice mini-game: say "forehand" or "backhand"), foosball, carrom, chess, a sofa, a TV you can switch on and off, and a small gym corner.
    - **Washrooms on both floors:** granite counter with basins and mirrors, toilets, showers with geysers, buckets and mugs.
    - **Lobby and laundry:** a laundry room, and a lobby with the security desk, CCTV, a notice board, a vending machine and a water cooler.
    - **Stairs and roof:** two staircases, and a roof terrace with water tanks and washing lines.
    - **Courtyards:** bare concrete, with tennis-ball cricket on a 22-yard pitch in one and football (plus a basketball hoop) in the other. No trees. Cycle parking is by the entrance.
    - **Hostel-mates:** eighteen of them (fictional) fill the common room and rooms and play cricket and football in the evening; most are out during class hours.
    - **Bhawan guide:** in or near the Bhawan, a small panel shows a floor plan of the floor you are on and a legend of the important places (stairs, washroom, common room, water cooler, vending machine, laundry, your room, entrance, courtyards) with direction and distance. L hides it.
  - **Every boys' Bhawan is walk-in:** Gandhi, Budh, Ram, Shankar, Vyas and Vishwakarma are courtyard Bhawans built like Krishna (Vyas and Vishwakarma have one courtyard, so football only), each with its entrance on the side facing a road. Ashok, Rana Pratap and Malviya are the newer comb-shaped Bhawans: a long spine (entrance, lobby, stairs, washroom, common room) with four arms of rooms, a corridor along each arm. Every one has a lobby with its name, a common room, washrooms, laundry, stairs to the first floor and the roof, and locked rooms with number plates; only Krishna has your room. The guide works in all of them. Bhagirath is a girls' hostel and stays closed to Mirnal. Outlines are squared up from OpenStreetMap (corners move up to 4 m), and interiors are only drawn when you are in or at the door of a Bhawan.
    - **Accuracy:** the building's outline is the OpenStreetMap one, squared up. The courtyards are a little larger than OSM's, and the layout is a game reconstruction, not a survey.
  - **Meals at the mess (daily missions):** breakfast, lunch and dinner are served in the VKB mess next to Krishna Bhawan (its OpenStreetMap name). Walk in, press E at the counter and eat (about 20 game minutes). The HUD points you there at mealtimes, the Missions panel (M) ticks off each meal, the timetable marks meals eaten or skipped, batchmates eat there too, and the night summary shows today's count. The menu is a sample, not the real VKB menu. A menu board stands outside the door with today's breakfast, lunch and dinner (the meal being served is highlighted; E shows the next few days), and the same board hangs over the counter. At mealtimes the four steel tubs on the counter hold that meal's food and the tables are laid with thalis; between meals the tubs are covered and the tables cleared.
  - **Pitstop, the extras counter:** just inside the mess door, with a fridge of cold drinks. Order maggi, an omelette, lassi, cold coffee and more by voice or click; extras go on your mess bill for the semester. Prices are illustrative.
  - **Calendar sources:** the semester order and dates follow the BITS academic calendar for 2025-26 (as published for the Hyderabad campus and quoted BITS-wide in the BITS-ISU calendar): registration Aug 1 / Jan 5, mid-sems Oct 6–11 / Mar 9–14, last classes Nov 29 / Apr 29, compre Dec 1–16 / May 2–16. The Pilani campus calendar PDF was no longer online, so Pilani's own fest dates (BOSM, Oasis, APOGEE) are approximate, and the weekly lecture pattern is illustrative, not the official timetable.
  - **Grades:** a BITS-style grade sheet with letter grades, SGPA and CGPA.
  - **Ending:** the year ends with a roadmap of Mirnal's real internships and projects from the resume.
  - **Simplifications:** professors, batchmates and story events are fictional, and grading is a simplified absolute scale (real BITS grading is relative).
- **Graduation:** the final portfolio, "THE SCHOOL JOURNEY OF MIRNAL", with a generated reflection. It can be revisited any time.
- **National Anthem, sung by everyone:** at every assembly the U.S. Navy Band's public-domain instrumental plays (see `audio/ATTRIBUTION.md`), lyrics appear line by line, and every character stands at attention and sings. Mirnal has to sing too. The microphone measures how long you sing and recognises anthem words. Singing along earns reputation; you can skip it any time. Lyric timing is approximate.
- **Saving:** browser localStorage. It autosaves after lessons and year changes, and you can save manually from the pause menu.

## Graphics

- **Quality presets:** Low, Medium, High (default) and Ultra, under Pause → Settings. They change at once, without a reload, and are saved with the game.
- **What each preset sets:**
  - the pixel ratio, capped both by the preset and by a pixel budget, so a full-screen Retina window isn't rendered at full 2×
  - the sun's shadows (off on Low, then soft shadows up to 4096 px)
  - texture filtering
  - the look (Medium and up): a warm, saturated colour grade with a soft vignette, warmer at sunrise and sunset; High and Ultra add a soft glow on the sky and lights. Low renders without it.
- **Light through the day:** the sun, sky, haze and bounce light turn golden in the early morning and evening.
- **Performance stats:** press `` ` `` in the game to show frame rate, frame time, draw calls and resolution.
- **Code and assets:** the code is in `js/graphics/` (see the comments at the top of each file). Third-party files and their licences are listed in `ASSETS.md`.

## The film

A 3 min 55 s cinematic of Mirnal's journey, from the first day of Class 1 to BITS Pilani, played in the game's own
engine: **🎬 Watch the campus film** on the title screen or in the pause menu, or open the game with `?film` in the
address (Esc skips).

- **The story:**
  - **School:** the title over Sunrise Public School; a small Class 1 Mirnal walks in through the gate on the first
    day; morning assembly and Jana Gana Mana; an English lesson in Class 1; and, twelve years on, a grown-up Mirnal
    walks out of the gate on the last day of school.
  - **College:** a sunrise flight over Pilani and down the main road; Mirnal walks in through the BITS Main Gate; the
    Clock Tower, the Rotunda, NAB and a lecture in progress, the computer lab, the Library and lunch at the VKB mess;
    the Bhawans from the air, into Krishna Bhawan and courtyard cricket at dusk; a cycle ride at golden hour past the
    Saraswati Temple and C'not; and a crane up from the Rotunda at sunset.
- **How it is made:** every shot is a camera move (splines, or a follow rig around Mirnal) with its own world, time of
  day, cast and title, in `js/cinematic/cinematic.js`. It runs on its own cast and never touches the saved game.
- **Music:** an original score synthesised by `dev/film-score.mjs` from the film's own timeline (no samples or
  third-party audio), shipped as `audio/film-score.m4a`; in the game the picture follows the music's clock.
- **The video:** a copy of the rendered film is kept in `film/` (not in git or on the site, because of its size).
  `node dev/render-film.mjs out.mp4` (with `npm start` running; needs Chrome, ffmpeg and playwright-core) draws
  every frame at 1.5× on Ultra with depth of field and encodes 1080p30 H.264 with the score.

## Code map

```
data/            mess.js (menu, Pitstop), curriculum-primary.js (1–5), curriculum-middle.js (6–10), senior-a/b.js (11–12),
                 curriculum.js (index), streams.js (streams + rules), people.js, events.js
js/graphics/     GraphicsEngine (wraps the renderer), GraphicsConfig (presets), RendererManager, QualityManager, PostProcessing (grade, bloom, depth of field), PerformanceMonitor
js/cinematic/    the film (school, then college): shot list, camera rigs, cast, titles
dev/             dev server, film renderer and score generator
js/core/         state, academics (mastery, marks, promotion), streams (validation), timetable, save — pure logic, no DOM
js/world/        campus (3D school), bits-world (real-scale BITS campus), hostel + comb-hostel (walk-in Bhawans), player, npcs (characters, ball), labels
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
