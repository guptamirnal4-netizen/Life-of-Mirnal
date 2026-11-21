# FD-II and FD-III (Faculty Divisions II and III), BITS Pilani, Pilani campus

Research agent: `fd2-fd3`. Phase: research only; no game code was changed.
Coordinates follow [../COORDINATES.md](../COORDINATES.md): metres, origin at the Rotunda, x east, z south (north is -z).

Tags: **[verified]** = seen directly in a cited source or read from game data; **[visual estimate]** = measured or judged from photos, panoramas or imagery; **[approximation]** = a proposal for the game that the evidence supports but does not prove; **[unknown]** = not found.

## Summary of the key finding

The official "Institute Building Plan (With Room Numbers)" on page 4 of the BITS Pilani first-semester 2026-27 timetable [verified] shows the main academic building ("Insti") as **three parts, west to east**:

1. **Faculty Division III**: the west quadrangle. In OSM this is **"Main Building (West Wing)"**, which holds both the `FD3` POI (-111, -19) and the `Chemistry Department` POI (-112, -14).
2. **A central spine**: a two-storey connecting range running west to east, with the clock-tower block and entrance porch on its axis and the auditorium ("AUDI", room 2162) behind it to the north. **Every room in the spine is numbered 2xxx, so it belongs to FD II.** In OSM, this connecting range plus the base of the tower is the **"FD-II"** strip (x -77…41, z -92…-55). The auditorium is "Main Building Hall".
3. **Faculty Division II**: the east quadrangle, with one large courtyard. In OSM this is **"Main Building (East Wing)"**, which holds the `FD 2` POI (102, -55); that POI sits inside its courtyard.

A fourth part, **Faculty Division I**, is the separate two-courtyard block further east. It matches OSM "Faculty Division I (FD-I)" and belongs to the `fd1` agent.

So the OSM "FD-II" footprint is real FD-II floor space, but it is only the connecting spine. The FD-II quadrangle and all of FD-III are in footprints that the master index gives to `main-building`. See section I for the hand-offs.

The **real first-year Physics Laboratory is room 2247A** (PHY U110, all eight sections) [verified, timetable]. By the room-number rule (first digit = division, second digit = floor) that is FD II, first floor. On the plan, "2247" is the **first floor of the west connecting range**, inside the OSM "FD-II" strip [verified, plan]. The **Chemistry Laboratory is room 3103** (CHEM U110 and CHEM F110) [verified, two timetables], which is FD III, ground floor, south range. I could not find the Biology Laboratory room [unknown].

---

## Block 1: OSM "FD-II" (the central spine: connecting ranges and the tower block)

### A. Identification

| Item | Value |
|---|---|
| Official name | Part of the "Institute Building", Faculty Division II (FD II) [verified, timetable plan] |
| Historic name | M-Block ("C-Block, M-Block and S-Block have been replaced by … Faculty Division I, II and III", GWU alumnus blog) [verified]. The order C/M/S → I/II/III is listed but not stated as a one-to-one mapping. M-Block = FD-II fits Mechanical Engineering being in FD-2 (EPC page) [visual estimate / inference]. |
| Category | Academic (lecture rooms, labs, faculty chambers) [verified] |
| OSM footprint | `FD-II`, kind academic, `h` 12, outer `[[-77.4,-85.8],[37.9,-92],[40.5,-57],[-71.1,-55.2]]`, bounds x -77.4…40.5, z -92…-55.2 (118 × 37 m) [verified, data/bits-campus.js] |
| Neighbours | West: OSM "Main Building (West Wing)" = FD III. East: OSM "Main Building (East Wing)" = FD II quad. North on the axis: "Main Building Hall" = AUDI 2162. South: BITS Clock Tower POI (-9.3, -61.6), then the ring road and the Rotunda (0, 0) [verified] |
| Orientation | Long axis runs west–east. The front faces south towards the Rotunda. In aerial imagery the range is turned about 6° (its east end lies further north) [visual estimate]. This matches the OSM wings: West Wing south edge about -4°, East Wing about -9° [verified from data]. The OSM "FD-II" south edge is only -0.9°. |

### B. Exterior

- **Floors:** 2, ground and first [verified]. The plan has only 21xx (ground) and 22xx (first) numbers here, and photos show two storeys plus a parapet.
- **Height:** about 10–11 m to the parapet top [visual estimate, from the step risers in the 2006 GWU courtyard photo of the matching FD-II range]. OSM `h` = 12. The tower block steps up higher and the clock tower rises far above it (owned by `main-building`).
- **Plan size versus OSM** [visual estimate from ESRI z18 imagery and the plan scale]:
  - Connecting range depth: about 15–17 m, including a front verandah. OSM gives 33–37 m, so OSM over-claims about 15–20 m of depth behind the range. North of the range, away from the axis, imagery shows trees and garden, not building.
  - Connecting range length: about 43 m from the FD-III east face (x ≈ -70 at z -60) to the tower block (x ≈ -27). About 30 m from the tower block (x ≈ +9) to the FD-II quad west face (x ≈ 38–41).
  - Tower block: about 35–37 m wide (x ≈ -27…+9). It projects about 23–27 m in front of the range's south face, ending in a single-storey entrance porch (porte-cochère) on the axis. The plan scale gives about 27 m and the imagery about 23 m. The porch therefore reaches about 20 m south of the OSM strip's south edge, almost to the ring road [visual estimate].
- **Shape:** a long two-storey bar with a stepped, cross-shaped tower block in the middle. On the plan, the porch narrows in steps: rooms 2149 and 2148 (ground) and 2246 and 2244 (first) flank it [verified, plan].
- **Roof:** flat terrace with a parapet, light grey; the connecting range roof reads darker grey-brown in imagery. A few water tanks and AC units sit on it [visual estimate].
- **Colours today:** off-white/cream walls with thin maroon/terracotta string courses and a maroon-red plinth. The tower has a vertical maroon window strip [visual estimate; 3DVista "Clock Tower" panorama 2023–24, YouTube 2025]. In 2006 and on older Commons photos the whole building was ochre-yellow [verified, GWU 2006 and Commons "BITS_Clocktower.jpg"], so it has been repainted.
- **Ground floor:** an arcade of **cusped (multifoil, scalloped) arches** on square piers in front of the rooms [verified for the matching FD ranges: GWU corridor photo and 3DVista "Admin connecting" panorama; visual estimate for the spine itself from the drone panorama].
- **Between the floors:** a band with a row of small square **jali** ventilator grilles [verified on the FD-II courtyard range].
- **First floor:** either an open verandah with slender paired columns (courtyard faces) or paired rectangular windows (the spine's front, per the drone panorama) [visual estimate].
- **Windows:** wooden frames with many small panes (3 columns × 4–5 rows) behind the arcade [verified, GWU corridor photo]. Windows are **rectangular**, not round-headed.
- **Doors and entrances:**
  - The main entrance is the tower porch on the axis, which leads into the hall under the tower. GWU says the 1950s campus painting hangs "in the grand entrance to the Audi, just below the tower" [verified].
  - The arcaded verandahs open onto the front gardens.
  - At the west end the range runs into FD III's east range (rooms 3129/3139); at the east end, into FD II's west range (2114/2107) [verified, plan].
- **Plinth:** about 0.6–0.8 m, maroon, with short flights of 4–5 steps at entrances [visual estimate].
- **Corner pavilions:** small domed chhatri pavilions sit on the front corners of the wings, not on the spine [verified, Commons "Bits_Clock_tower.jpg", 2020].
- **Lighting:** floodlights on the tower front at night [verified, YouTube bkmKuEguTH8 at 0:30]; tube lights in the verandahs [verified, GWU].
- **Landscaping:** two front gardens fill the recesses between the wings and the tower block. They have lawns, clipped hedges, columnar trees, flowering shrubs and one large old tree west of the porch. Bougainvillea beds and the ring road lie between the porch and the Rotunda amphitheatre [verified, drone panorama].

### C. Floor-by-floor layout

The plan in the timetable is schematic. It gives room numbers, the room order (arrows) and the massing, but no dimensions. The ASCII below is redrawn from it, with north at the top. Room positions are [verified, plan]; sizes are [approximation].

```
                                  +-----------+
                                  |   2159    |   (north end of AUDI)
                                  |  [XXXXX]  |
                                  |           |
                                  |   AUDI    |   = OSM "Main Building Hall"
                                  |   2162    |
 FD III (W Wing)                  |           |                    FD II quad (E Wing)
 ...3129/3139 |+------------------+---+---+---+------------------+| 2114/2107...
              ||  2151  ------->  2154|[X]|[X]|  <------  2145    ||
              |+--------------------+-+---+---+-+-----------------+|
              |   front garden      |2149   2148|   front garden    |
              |                     +-+       +-+                   |
              |                       |  porch |                    |
                                      +--+  +--+      (GROUND FLOOR, 21xx)

 First floor: the same shape. West range "2247 ---->" (Physics Lab 2247A),
 east range "<---- 2243", porch flanks 2246 / 2244, above AUDI "2252".
 [X] = crossed squares on BOTH floors (see D).
```

- **Ground floor:** west range rooms 2151→2154; east range 2145. The east range label repeats a number used in the FD-II quad (2135→2145), probably a misprint on the plan [verified that it is printed; meaning unknown]. Tower block: two crossed squares and rooms 2149 and 2148 beside the porch [verified].
- **First floor:** west range "2247" (the Physics Lab is **2247A**) [verified]; east range "2243" [verified]; tower block rooms 2246 and 2244 [verified]; "2252" over the auditorium, probably a gallery or balcony [unknown use].
- **Corridor:** the plan shows each range as one strip of rooms with a direction arrow. The photos of the matching ranges show rooms opening off an arcaded verandah, so assume rooms on the north side and the verandah corridor on the south (front) face, about 3–3.5 m wide [approximation].

### D. Staircases

I could not see the stairs in any photo, panorama or video.

- The plan draws **two crossed squares** where the connecting ranges meet the tower block, one on each side of the axis. They appear in the same place on both floors. Each is about 8 × 11 m at the plan's scale [verified that they are drawn; size is a visual estimate]. Crossed boxes repeated on every floor usually mark stairwells, so these are probably **twin staircases flanking the tower hall** [approximation].
- Proposed layout for the game [approximation]:
  - Two dog-leg stairs at about x -24…-16 and x -2…+6, z -72…-61. They start from the tower foyer and arrive on the first-floor landings that lead into ranges 2247 (west) and 2243 (east).
  - First-floor level about 5.0 m. Two flights of 16 risers × about 0.156 m, treads 0.27 m (about 4.3 m per flight), with a half landing about 2.2 m deep.
  - Width about 1.8–2.0 m. Rendered masonry balustrade with a timber or steel handrail.
- The FD-II quad (a hatched box on its east side by 2124/2222) and FD-III (small black squares in the inner block) may hold more stairs [unknown].

### E. Interior

These are the materials of the matching FD ranges. The spine interior itself was not seen.

- **Verandah corridors** [verified, GWU 2006 "MBlockCorridor"]:
  - Floor: grey Kota-type stone slabs laid diagonally.
  - Walls and piers: white-washed, with a dark grey dado band.
  - Doors: brown timber, opening off the verandah.
  - Windows: timber, many small panes, set in grey-painted reveals.
  - Furniture: timber slatted benches.
  - Lighting: tube light on a ceiling conduit; electrical conduit run on the wall.
  - Ceiling height about 4–4.5 m [visual estimate].
- **Research labs** (3DVista panoramas "Physics Lab", "Chemistry Lab", "Biological Science Lab") [verified that they look like this; their building and room are unknown]:
  - Physics: periwinkle walls, blue vinyl floor, white false ceiling with square LED panels, white benches edged in blue with black tops, an aluminium-and-glass double door, multi-pane timber windows, split ACs.
  - Chemistry: cream walls, grey vinyl tiles, modular grey-and-blue island benches with black granite tops and steel reagent racks, a bank of fume hoods, ceiling fans and LED panels.
  - Biology: cream walls, grey-blue vinyl floor, island benches with black tops, blue stools, a green chalkboard and posters.
- Room signs and room numbers: four-digit numbers (for example "2247A") [verified as numbers; the sign design is unknown].

### F. Gameplay (game coordinates)

**Today** [verified, read from the running game and from `js/world/bits-world.js`]:
- `sciencelab` "FD-II · Physics, Chemistry & Biology Labs" is placed at **x -24.4…-12.4, z -66.65…-56.65**, door on the south side at x -18.4. `exit` is (-18.4, -54.45), `inside` is (-18.4, -58.25), `labTeacher` is (-18.4, -65.65).
- The **Clock Tower entrance block** (`buildClockTowerAt`) has a solid collider at **x -15.8…-2.8, z -64.6…-52.6, y 0…15**. **That overlaps the east 3.4 m of the lab.** Two of the seven lab NPC spots, `spots.sciencelab[3]` (-14.4, -62.95) and `[5]` (-14.9, -59.45), are inside that solid box. `main.js` uses `sciencelab[3]` as the `snr_pcb` seat. [verified, collider query in the browser]

**Proposed** [approximation]:
- Keep the room id, `roomAt`, `pathTo`, `objectivePoint` and `exit` behaviour, and keep the room on the ground. Steer `fitRoom` so `sciencelab` lands in the **west connecting range**, the ground-floor counterpart of the real 2247A. Room x ≈ -52…-40, z ≈ -67…-57; door south at x ≈ -46; exit about (-46, -53.5). That keeps it clear of the tower collider (x ≥ -15.8) and of the FD-III range (x ≤ -70).
- **Entry and exit points:**
  - The tower porch on the axis, about (-9, -40).
  - The front verandah of each range, open along z ≈ -55 for x -70…-27 and x +9…+38.
  - The corridor links into FD-III at about (-70, -62) and into FD-II at about (+38, -68). Leave them closed or as facade doors until the quads are walk-in.
- **Spawn for lab sessions:** in the west front garden, about (-46, -50), facing north.
- **Collision:**
  - The range body: x -70…-27 and +9…+38, z about -72…-58.5. Leave the verandah walkable, z -58.5…-55, behind a pier line every about 3.6 m with gaps about 2.4 m.
  - The tower block as one box (owned by `main-building`).
  - The OSM box behind the range (z -72…-92), away from the hall, should be garden, not building.
- **Stairs:** only if a first floor is added later, using the twin stairs in D. Until then the first floor is facade only.
- **Enterable:** `sciencelab`, and optionally the verandah and the tower foyer.
- **NPC walk areas:** the verandah strips, the front-garden paths, and a path to the Rotunda ring road.
- **Interactables:** the lab bench (existing), a notice board in the verandah, and a "2247A Physics Laboratory" door plate.
- **Camera:** the room walls are `WALL_H` 3.2 m in the game; real ceilings are about 4–4.5 m. Raising the lab to about 4 m would read more like the old building and give the third-person camera room.

---

## Block 2: Faculty Division III (the FD3 POI)

### A. Identification

- **Which OSM building:** "Main Building (West Wing)", bounds x -166.9…-59, z -104.9…13, with one courtyard hole (x -141…-85, z -80…-18) [verified, data].
  - The `FD3` POI (-111.4, -18.8) sits on the south inner edge of that hole.
  - The `Chemistry Department` POI (-111.6, -14.5) is in its south range.
  - The timetable plan puts Faculty Division III west of the spine [verified].
- **Old name:** S-Block, or Science Block. The "S9" print shop is named after it and is "at the FD-3 entrance" (EPC) [verified].
- **Owner conflict:** the master index gives this footprint to `main-building`. See I.

### B. Exterior

- **Floors:** 2 (31xx ground and 32xx first) [verified, plan].
- **Massing on the plan** [verified, plan]:
  - An outer ring: north 3120→3128, west 3118/3112, south 3108←3101, east 3129/3139.
  - An inner ring: north 3156→3161, west 3155/3149, east 3162/3169, south 3148←3143.
  - A divided central block, so there appear to be **two courtyards** (north and south) separated by an inner cross range. A tall annex projects from the north-east corner.
  - The ESRI and drone views agree on the two courts [visual estimate]. The game draws one large courtyard.
- **Facade:** same language as the spine. Front (south) corners carry small domed chhatris [verified, Commons 2020 photo]. Ground-floor cusped arcades face the courtyards [visual estimate].
- **Size versus OSM:** the outer ring and overall size agree with the OSM outline to within the accuracy of the imagery (±5–10 m) [visual estimate]. The OSM courtyard is one hole where the plan shows two courts.

### C. Rooms that matter for gameplay

- **Chemistry Laboratory: room 3103** (CHEM U110 sections P1–P5; CHEM F110 in the summer 2026 term) [verified]. It is in the ground-floor south range, near the east end ("3108 ← 3101" puts 3101 at the east end) [approximation for the exact bay].
- 3163: Intro Computational Chemistry Lab (CHEM F320) [verified, timetable].
- Faculty chambers [verified, EPC 2022]:
  - Chemistry: first floor, central section, 3268 A–V.
  - Pharmacy: ground floor, back section, 3170 A–Y.
  - Physics (old rooms): first floor, right section, 3263–3266 and 324X.
  - Biology: "first floor of the back building", 3277 A–Y.
- The "back building" is not drawn on the plan [unknown].

### D. Staircases

Not seen [unknown]. The small black squares in the plan's central block may be stairs [approximation].

### E. Interior

Not seen directly. Assume the same verandah and corridor finishes as Block 1 [approximation].

### F. Gameplay

FD-III hosts no gameplay room today. The game uses this footprint to host `reception` and `complab`, under the name "Main Building (West Wing)". If a chemistry lab is ever split out from `sciencelab`, room 3103 is the real place for it: ground-floor south range, about x -100…-75, z ≈ 0…+8 [approximation].

---

## Block 3: the FD-II quadrangle (OSM "Main Building (East Wing)")

Listed for completeness because it is the real FD-II. It is owned by `main-building`.

- **OSM:** x 37.9…146.2, z -136.3…-20.9, one courtyard hole x 61…126, z -112…-49. The `FD 2` POI (102, -55) is in that courtyard [verified, data].
- **Plan:**
  - Ground: outer ring 2115→2120, 2122/2124, 2104←2101, 2114/2107; inner 2135→2145 and 2134←2128; one big courtyard; an eastern projection with a hatched element [verified].
  - First floor: 2211→2217, 2210/2206, 2237→"2142", 2236←2224, 2204←2201, 2118/2222 [verified].
- **Courtyard:** one large lawn ringed by two-storey ranges. The ground floor has cusped arches; the first floor has an open verandah with paired columns, a jali vent band and a maroon plinth with steps on the centre line. The clock tower is visible over the west range [verified: 3DVista "Admin connecting" panorama and GWU 2006 "MBlock_QT2", the same viewpoint]. The courtyard is about 60 m across [visual estimate, matching the OSM hole of 59 × 62 m].
- **Departments** [verified, EPC]:
  - Physics (new rooms): first floor, 2219 A–J.
  - Mechanical Engineering chambers: first floor, 222X.
  - EEE: 2210 A–U.
- **Heavily used lecture rooms:** 2241 (44 timetable entries), 2206 (33), 2119 (21), 2139 (14) [verified, counted from the 2026-27 timetable]. 2241's position is not printed on the plan [unknown].

---

## G. Sources

| # | Source | URL | What it shows (timestamp or panorama) | Confirms | Local capture |
|---|---|---|---|---|---|
| 1 | BITS Pilani timetable, 1st sem 2026-27, p.4 "Institute Building Plan (With Room Numbers)" | https://academic.bits-pilani.ac.in/Downloads/Time-Table/Timetable_17_Aug_2026_4fdfacd4-f4d2-4008-b8d7-5f9f8de95a1e.pdf | Ground and first floor plans of FD III, the spine, AUDI, FD II and FD I; room-number legend; PHY U110 sections in 2247A; CHEM U110 in 3103 | Division layout west to east, room numbers, 2 floors, the crossed boxes, lab rooms | `scratchpad/research/fd2-fd3/pdf/plan-004.png`, `plan-gf-center.png`, `plan-ff-center.png`, `tt.txt` |
| 2 | BITS Pilani summer-term timetable 2026 | https://academic.bits-pilani.ac.in/Downloads/Summer_Term/Summer_Term_Timetable_25_May_2026_f6963c28-7167-40a4-881e-f1fff9c6d0b7.pdf | CHEM F110 Chemistry Laboratory, room 3103 | Chemistry lab in FD III | `scratchpad/research/fd2-fd3/pdf/summer.txt` |
| 3 | EPC BITS, "Campus Facilities" (2022) | https://epcbits.com/campus-facilities/ | Room numbering, faculty chamber allocations for FD-1/2/3, S9 at the FD-3 entrance, FD-3 = Science Block | Department locations | (text only) |
| 4 | Rahul Simha, "Bees Saal Baad: Return to Pilani – M-Block" (GWU) | https://www2.seas.gwu.edu/~simhaweb/misc/pilani/mblock.html | Photos dated 03/10/2006: M-Block courtyard corridor; the courtyard range with the tower behind; the 1950s campus painting "in the grand entrance to the Audi, just below the tower" | C/M/S → FD I/II/III renaming; cusped arcade; corridor materials; ochre paint in 2006 | `scratchpad/research/fd2-fd3/web/small-MBlockCorridor.jpg`, `small-MBlock_QT2.jpg`, `small-BITS_Picture.jpg`, `web-gwu-mblock.png` |
| 5 | Official 360° tour (3DVista) | https://www.bits-pilani.ac.in/Pilani-Campus-Virtual-tour/index.htm | Panorama "Clock Tower" (drone over the Rotunda) | Front massing: tower block, porch, recessed connecting ranges, front gardens, FD-II single court, FD-III wing, cream and maroon colours | `scratchpad/research/fd2-fd3/strip-clock-tower.jpg`, `tour-clock-tower-{f,l,r,b,d}.jpg` |
| 6 | Same tour | same | Panorama "Admin connecting" | FD-II courtyard range: cusped GF arcade, FF colonnade verandah, jali band, plinth and steps, tower beyond | `strip-admin-connecting.jpg`, `tour-admin-connecting-{f,l,r,b}.jpg` |
| 7 | Same tour | same | Panoramas "Physics Lab", "Chemistry Lab", "Biological Science Lab" | Research-lab interiors (building not stated) | `strip-physics-lab.jpg`, `strip-chemistry-lab.jpg`, `strip-bio-lab.jpg` and faces |
| 8 | Same tour | same | Panorama "Drone Day View" (from far south) | The whole Institute Building from the south: two quads (FD III has two courts), spine and tower | `l1/tour-drone-day-f.jpg`, `crop-drone-day-main.jpg`, `strip-drone-day.jpg` |
| 9 | Same tour | same | Panoramas "Admin Block 1/2" | A modern administration building with carved ceilings; not FD (location unknown) | `strip-admin-block-1.jpg`, `strip-admin-block-2.jpg` |
| 10 | YouTube, "BITS PILANI CAMPUS TOUR (2025-2026)", Pushkar Biltheria | https://www.youtube.com/watch?v=XkDvacBC7zA | 0:19 and 1:43: tower block front from the Rotunda; 1:15: colonnaded walkway with the tower in the distance; 3:03–3:12: library foyer with twin stairs (library, not FD) | Current colours and front massing | `yt/yt-XkDvacBC7zA-0015.jpg`, `-0099.jpg`, `-0071.jpg`, `-0183.jpg`, `-0188.jpg`, `yt/sheet-d.jpg`, `yt/sheet-f.jpg` |
| 11 | YouTube, "BITS Pilani, Pilani Campus - Official Campus Tour" | https://www.youtube.com/watch?v=bkmKuEguTH8 | 0:30 tower at night (floodlit). Sampled every 30 s from 1:40 to 15:14: no FD interior | Night lighting only | `yt/yt-bkmKuEguTH8-0030.jpg`, `-0550.jpg` |
| 12 | Wikimedia Commons, "Bits Clock tower.jpg", JRDkg, CC BY-SA 4.0, 2020-10-13 | https://commons.wikimedia.org/wiki/File:Bits_Clock_tower.jpg | Spine and tower seen from NAB, corner chhatris on the wings | Paired rectangular FF windows; chhatris | `web/Bits_Clock_tower.jpg` |
| 13 | Wikimedia Commons, "BITS Clocktower.jpg", Vinwe, CC BY-SA 3.0 (undated) | https://commons.wikimedia.org/wiki/File:BITS_Clocktower.jpg | The ochre-era front: tower, stepped base block, the gabled hall roof behind, the west range with a chhatri | Former paint; gabled auditorium roof | `web/1280px-BITS_Clocktower.jpg` |
| 14 | Wikimedia Commons, "Clock Tower, BITS Pilani.jpg", Sankhyac, CC BY-SA 4.0, 2013 | https://commons.wikimedia.org/wiki/File:Clock_Tower,_BITS_Pilani.jpg | Close-up of the tower lantern only | Nothing for FD | `web/1280px-Clock_Tower__BITS_Pilani.jpg` |
| 15 | Esri World Imagery tiles, zoom 18, with a game-coordinate grid drawn on them | https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer | Top-down view of the spine, hall and quads | Relative depth, width and tilt (absolute offset ±10 m) | `esri-institute-z18.jpg`, `esri-fd2-crop.jpg` |
| 16 | Game today (`?explore`, localhost:8080) | http://localhost:8080/?explore | Explorer views and the lab interior | Section H | `game-front-from-rotunda.png`, `game-aerial-institute.png`, `game-topdown.png`, `game-fd2-strip-close.png`, `game-fd2-strip-north.png`, `game-west-wing-fd3.png`, `game-fd2-select.png`, `game-fd2-poi.png`, `game-fd3-poi.png`, `game-clocktower.png`, `game-lab-aerial.png`, `game-lab-inside.png`, `game-lab-inside-east.png`, `game-lab-door-outside.png` |

All local paths are under `/private/tmp/claude-501/-Users-mirnal-Documents-Whisperflow/58e9866d-f336-43fa-bce9-096a63ba2c16/scratchpad/research/fd2-fd3/`.

**Not accessed or not useful:**
- Google Maps and Google Earth: not attempted.
- Wikimedia Commons category page: 404.
- Scribd copy of the Dec-2025 timetable: content truncated.
- Older timetable PDFs (Timetable_15_Sep_2025, Timetable_27_Sep_2025, Timetable_01_Aug_2026): 404.
- BIO F110 room: not found in any timetable I could open.
- theblogchatter "Insti" article: login wall after the teaser; I did not work around it.
- Wikipedia "BITS Pilani": opened, but it has no FD detail.
- GWU page through WebFetch: TLS error. It loaded normally in Chrome.

## H. Comparison with the game today

**What matches:**
- The OSM placement: a spine between two quads, the tower on the front of the spine, the hall behind [verified].
- FD-II quad has one large courtyard [verified].
- The lab is hosted in the OSM "FD-II" strip, which really is FD-II space, and the real physics lab (2247A) is in that same strip [verified].
- Cream-white overall tone; the maroon door frames on the tower block [verified].

**What is wrong**, from the game screenshots and data compared with the sources:
1. **The lab overlaps the clock-tower entrance block.** The solid collider x -15.8…-2.8 cuts 3.4 m into the lab, and two lab NPC spots, `sciencelab[3]` (the `snr_pcb` seat) and `[5]`, sit inside it [verified].
2. **Spine massing:** the game extrudes a solid 37 m-deep, 12 m box with three tiers of round-headed windows. The real building is a 15–17 m-deep, two-storey range (about 10–11 m), recessed behind two front gardens, with a 36 m-wide stepped tower block and a porch projecting about 25 m south [visual estimate].
3. **Facade language:**
   - Real: two storeys; a ground-floor cusped-arch arcade; a jali vent band; paired rectangular or verandah openings on the first floor; maroon string courses and plinth; steps.
   - Game: generic round-arched windows over three storeys, plain white, no arcade, no plinth.
4. **Front gardens:** the game shows bare sand between the wings and the tower. The real ground has lawns, hedges, columnar trees, a large tree and flower beds [verified].
5. **Names:** the explorer shows "Main Building (West Wing)" and "Main Building (East Wing)". The institute's own plan calls them Faculty Division III and Faculty Division II, and the FD-II and FD3 POIs float in their courtyards [verified].
6. **FD-III** has two courtyards; the game has one [visual estimate].
7. **Lab interior:** game white walls, checker tiles and slate benches. The real labs use coloured or cream walls, grey or blue vinyl floors, black-topped benches with blue or grey cabinets, fume hoods (chemistry) and a false ceiling with LED panels [verified for the research labs].
8. **Text:** `js/core/chat.js` says "The Science Lab is at the right end of the main block". It is west of the tower, and the real physics lab is in the west connecting range [verified].

**Ranked fixes, most visible first:**
1. Move `sciencelab` west into the connecting range (x ≈ -52…-40) so it clears the tower collider and NPC spots [3] and [5] are walkable again.
2. Rebuild the OSM "FD-II" strip as a 15–17 m two-storey range with a cusped ground-floor arcade, a jali band, rectangular first-floor openings, a maroon plinth and courses, and a flat parapet roof at about 10.5 m. Leave the rest of the OSM depth as garden.
3. Add the two front gardens (lawn, hedges, columnar trees) between the wings and the tower block. Extend the tower block's stepped base and porch south to the ring road; this is `main-building`'s geometry, so coordinate with them.
4. Use the same facade on the FD-II and FD-III quads, then rename them in labels and the explorer to "FD-II" and "FD-III", keeping the OSM names as aliases.
5. Restyle the lab interior from the tour palette, and rename it to match the real room ("FD-II · Physics Lab 2247A"), or keep the combined label but note that chemistry is in FD-III 3103.
6. Give FD-III two courtyards.

## I. Uncertainties and hand-offs

**Uncertainties:**
- The meaning of the crossed squares (stairs?) and every stair position [approximation].
- The exact positions of 2247A inside the west range and of 3103 inside the south range [approximation].
- The Biology Laboratory room [unknown].
- Where the 3DVista research labs are [unknown].
- Absolute imagery offset: tile features disagree with OSM by 5–13 m, so I used only relative measurements and kept OSM as the placement truth.
- The plan is schematic and not to scale; my plan-derived sizes are ±20%.
- The first-floor treatment of the spine's front: windows versus open verandah [visual estimate].
- Whether the spine's arcaded verandah faces south (front) or north [approximation: south, from the imagery's light strip and the front views].

**Hand-offs:**
- **`main-building`:**
  - OSM "Main Building (West Wing)" is **FD III** and "Main Building (East Wing)" is **FD II**, per the official plan. Renaming them, and deciding who rebuilds them, needs the orchestrator.
  - The tower block, porch and Clock Tower geometry: please shorten or move the entrance-block collider, or tell the orchestrator so `sciencelab` can be moved.
  - "Main Building Hall" = AUDI 2162, with 2159 at its north end and gallery 2252 above. The older photos show a **gabled (pitched) roof with a pediment**. The grand entrance under the tower holds the 1950s campus painting.
  - Admin Block 1/2 panoramas: a modern admin building, location unknown.
- **`fd1`:** the plan confirms OSM "Faculty Division I (FD-I)" is FD I: a two-courtyard block east of FD II with the Library to its north. Ground 11xx, first 12xx.
- **`library`:** YouTube XkDvacBC7zA 3:03–3:12 shows the library foyer: twin flanking stairs with geometric steel balustrades, a white marble floor with black inlay lines, a circular planter, notice boards.
- **`workshops-halls`:** the plan shows the New Workshop (7101–7109, 7201–7208) north of the spine.
- **`landscape-water`:** the two front gardens of the Institute Building (described in Block 1 B).
- **Orchestrator:** decide who owns FD-II and FD-III geometry in the two "Main Building" footprints. Approve moving `sciencelab` (gameplay ids are unchanged; only its position moves).

## Build notes (module `js/world/buildings/fd2-fd3.js`, test `tests/browser/fd2-fd3.mjs`)

**What is built.** One module (`fd2-fd3`) replaces both OSM footprints: "Main Building (West Wing)" = FD-III and
"Main Building (East Wing)" = FD-II. Each quad has its own Kit frame squared to its OSM outline (FD-II turned about
9°, FD-III following its sheared west edge at about 6.7°). The module's own kit is the world frame and only holds the
two link blocks that join the quads to the `main-building` spine ends (x -70 and x 39.5, z -69.5 to the spine's
front parapet line).

- Two storeys, ground floor y 0, first floor 5.4, roof 9.9 with a 0.75 m parapet: the spine's levels, so the ranges
  meet it level. Cream plaster, maroon plinth and string-courses, a cornice, jali vent tiles, pilasters, relief
  windows with chajjas, paired windows upstairs, domed chhatris on the two front corners.
- FD-III: an outer ring of ranges round **two courts** split by a cross range (recommendation 6). FD-II: one large
  court. Each court has a cusped-arch arcade on the ground floor and a paired-column, balustraded verandah above,
  with lawns, perimeter and cross paths and a round flower bed. The courts become the footprints' `holes`, so the
  campus scatter plants trees in them and keeps people and trees off the ranges.
- Entrances: a south main entrance with an arched porch carrying the division's name, and a north rear entrance,
  each a 4 m passage through the range into the court (notice boards, lights, way-finding signs).
- Stairs: two dog-leg stairs per quad (kit.dogleg) from the ground verandah to the first-floor verandah ring, in
  stair halls with walls up to the roof, a solid dwarf wall between the flights, terrazzo floors and walkable sills
  across the wall where the stair head meets the verandah.
- Department rooms (enterable, furnished, ceilings, tube lights, signs; each its own zone layer):
  FD-III: Chemistry Laboratory 3103, Department of Chemistry, S9 Xerox & Print, Computational Chemistry Lab 3163
  (cross range), Chemistry Faculty Chambers 3268 (first floor). FD-II: Mechanical Engineering, Students' Union
  Office, SWD Office, Department of EEE, Lecture Room 2241 (first floor). Department name plates on the verandahs
  for Pharmacy, Physics, Biological Sciences, RC Club and the other lecture rooms.
- Gameplay rooms (`reception`, `complab` in FD-III; `principal` in FD-II) stay where placeRooms put them, each in an
  enclosed bay open to its facade door, with paving, a light and a maroon door surround.

**Approximations.** Room positions follow the official room-number plan schematically (±20%); stair positions are
guesses (the plan's crossed squares). Ranges are solid bands with relief doors and windows except the rooms listed.
The OSM names still show on the map labels ("Main Building (West/East Wing)"); renaming them to FD-III / FD-II is
in bits-world / the campus data, which this module may not edit.

**View axis.** Nothing of this module lies within x -50…31 south of z -50; the test checks that no collider of
`fd2-fd3` sits on the Clock Tower → Saraswati Mandir axis.

**Performance.** About +100 draw calls over `?only=main-building` from outside (two quads, merged per material);
frame time stays at the 16.7 ms vsync cap in every scene of `PERF=1 node tests/browser/fd2-fd3.mjs`.
