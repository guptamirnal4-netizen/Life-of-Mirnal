# Faculty Division I (FD-I): research report

Agent `fd1`. Research only, no game code changed. Captures are stored outside the repo in
`/private/tmp/claude-501/-Users-mirnal-Documents-Whisperflow/58e9866d-f336-43fa-bce9-096a63ba2c16/scratchpad/research/fd1/`, shortened below to `$R/`.

Tags: **[verified]** means seen directly in a cited source. **[visual estimate]** means measured or judged by eye from imagery. **[approximation]** means a proposal for the game, not evidence. **[unknown]** means no evidence was found.

---

## Key findings (summary)

1. **FD-I is a two-storey building with two courtyards, shaped like the character 日.** The official "Institute Building Plan (With Room Numbers)" printed in the BITS timetable shows FD-I as a separate rectangular block south of the Library. It has a north and a south courtyard split by an east–west cross wing. It has a ground floor (rooms 11xx) and a first floor (rooms 12xx) only **[verified]**. The OSM footprint with two holes matches this **[verified]**.
2. **Ground floor = labs, first floor = classrooms.** Timetables put Chemical Engineering Lab I/II (1117, 1129), Civil Engineering practicals (Surveying 1127, Materials 1124/1112, Hydraulics 1114, Soil Mechanics 1119, GIS 1128) on the ground floor. Most lectures and tutorials are in first-floor rooms 1201–1205, 1219–1227 and 1231–1234 **[verified, timetables]**.
3. **The game draws FD-I as a solid 13 m block with four rows of arched windows and a roof covered in solar panels.** The real building has two storeys and a cream/off-white facade with flat stepped parapets. Solar panels sit in **sparse clusters** **[visual estimate, drone + aerial]**, and both courtyards are densely planted with trees **[visual estimate]**.
4. **FD-I and the BITS Workshop footprints touch or overlap by up to about 1 m in OSM.** In imagery they are separated by a strip of trees, roughly 8–15 m wide **[visual estimate]**. The staff-room door opens into that strip.

---

## A. Identification

| Item | Value |
|---|---|
| Official name | Faculty Division I (FD I), labelled "FACULTY DIVISION I" on the timetable building plan **[verified]**. Room prefix `1` = FD I **[verified]** |
| Category | Academic: laboratories and lecture/tutorial rooms; part of the "Institute Building" family with FD II and FD III **[verified]** |
| OSM name / kind / h | `Faculty Division I (FD-I)`, `academic`, `h = 13`, `traced: true` |
| OSM outer ring (game x,z) | (175.0,-149.9) NW → (267.1,-159.5) NE → (284.7,-51.5) SE → (191.5,-40.5) SW |
| OSM hole 1 (north courtyard) | (194.1,-137.4) (260.4,-144.7) (264.1,-117.8) (197.1,-111.6): 67 × 26.6 m |
| OSM hole 2 (south courtyard) | (198.5,-102) (265.6,-108.6) (270.7,-65.1) (203.7,-57.8): 67.4 × 44 m |
| Edge lengths | N 92.6 m, E 109.4 m, S 93.8 m, W 110.6 m. Bounds x 175…284.7, z -159.5…-40.5 |
| Orientation | North edge runs at -6.0° (rotated about 6° anticlockwise when seen from above, NE corner further north). The east and west edges are not exactly perpendicular to it (+80.7° and -98.6°), so the OSM ring is a slight parallelogram (3–4° shear), probably from tracing **[verified from data]** |
| Centroid | about (229.6, -100.4) |
| Neighbours | **North:** a service road (OSM `service`, (281,-180)→(142,-157)), then the BITS Library (x 171…257, z -261…-184). **South:** BITS Workshop with a sawtooth roof (x 195…279, z -51…7), whose north edge almost coincides with FD-I's south edge. **West:** a tree-lined road (about x 150–165), then Main Building East Wing (x 38…146). **North-east:** Lecture Theatre Complex (LTC), not in OSM (about x 281…346, z -229…-135 by eye from imagery). **East:** small buildings around x 295–330 **[verified from data / visual estimate]** |
| POIs | `CRISS Robotics` (249.9, -38.8) sits on the FD-I/Workshop boundary. The tour panorama of CRISS Robotics shows a sawtooth-roof workshop interior, so the club is in the Workshop, not FD-I **[verified, tour panorama]** |

**Local frame used below.** u is metres along the north edge (eastward). v is metres perpendicular to it (southward). The origin is the OSM NW corner.
`world = (175 + 0.9945u + 0.1045v, -149.9 - 0.1045u + 0.9945v)`.
In this frame the OSM ring is NW(0,0), NE(92.6,0), SE(98.8,109.3) and SW(5,110.5). The courtyards are u 18…86, v 14…41 (north) and v 50…94.5 (south).

## B. Exterior

| Aspect | Finding |
|---|---|
| Floors | **2** (ground + first). The timetable plan lists only floors 1 and 2 for FD I, with no FD-I room numbers above 12xx **[verified]**. The drone frame shows two window tiers on the south and west faces **[visual estimate]** |
| Height | OSM 13 m. Two tall floors of about 5 m each plus a parapet and roof structures of about 1.5–2.5 m fits **[approximation]**. No measurement found **[unknown]** |
| Plan shape | Rectangle with two internal courtyards (日). The ring is made of a north wing, west wing, east wing, south wing and a central east–west cross wing **[verified, plan + imagery]** |
| Wing depths (imagery, by eye) | North about 10–11 m. Cross wing about 12–13 m. South about 13 m plus an outer step. West about 14–15 m (it includes a lower outer strip, possibly a verandah or plinth). East about 11–12 m **[visual estimate, Esri z18]**. OSM gives N 14, cross 9.5, S 15.5, W 15–16 and E 9–11 m |
| Courtyards | North about 24–27 m deep, south about 31–38 m deep in imagery, both about 66–68 m long **[visual estimate]**. OSM: 26.6 and 44 m. Both are **densely planted with trees** with almost no open lawn visible from above. The south courtyard has a small dark rectangular structure in its SE corner, which also appears as a box in the official plan **[verified that a box is drawn; its use is unknown]**. The plan also marks a small circle in the north courtyard (perhaps a tree, well or fountain) **[unknown]** |
| East projection | A rectangular block about 13 m deep × 27 m long sticks out of the middle of the east wing, level with the cross wing. It appears in the official plan **[verified]** and in imagery at about x 279…292, z -121…-94 **[visual estimate]**. **It is not in the OSM footprint.** Its use is unknown (an entrance hall or stair block is plausible **[approximation]**) |
| South side | The plan shows SW and SE corner blocks stepping about 6–9 m further south than the south wing, plus a crossed box labelled "SHED" in front of the west half of the south wing (u about 14–41) **[verified, plan]**. Imagery is ambiguous here because of tree cover |
| Roof | Flat with raised parapets that step at the corners and wing junctions (visible as light bands in the aerial). Clusters of **blue PV panels** sit on the north, cross and south wings and the east-wing corners. Panels cover perhaps 15–25 % of the roof, not all of it **[visual estimate, Esri + drone]**. Small roof kiosks or boxes are visible at some corners **[visual estimate]** |
| Colour / material | Cream to off-white render with slightly darker beige horizontal bands. It reads lighter and plainer than the Main Building's heritage facade **[visual estimate, drone frame]**. No close-range exterior photo was found, so cornice, pilaster and window details are **[unknown]** |
| Windows | One continuous horizontal row of rectangular windows per floor on the south facade, regularly spaced. The upper row is clearly visible in the drone frame **[visual estimate]**. Arched windows like the game's are **not** seen **[visual estimate]** |
| Doors / entrances | Thick black wall marks on the official plan, which are probably openings or entrances **[unknown]**, sit at: (1) the **middle of the west façade** at the cross wing, the longest mark, so most likely the main west entrance; (2) the NW corner; (3) the SW corner; (4) the north-courtyard west wall; (5) the south-courtyard east wall; (6) two small marks on the south wall; (7) the N and S ends of the east projection **[verified that marks exist; their meaning is unknown]** |
| Balconies / arches / pillars | Not resolvable from the available imagery **[unknown]**. The arcaded single-storey building in the "Lecture Theatre Complex" panorama is the **LTC**, not FD-I. Don't copy its arches onto FD-I |
| Landscaping | Tree belts on all sides. The west road is lined with tall trees. A tree strip separates FD-I from the Workshop to the south **[visual estimate]** |
| Lighting | **[unknown]**. No night image of FD-I at usable resolution |

### Footprint check against OSM

- Position and rotation agree with Esri World Imagery (z18) to within about 5–8 m **[visual estimate]**. Imagery suggests a slightly stronger rotation (about 8–9° against OSM's 6°) and a north–south roof extent of about **97–100 m** against OSM's 110 m **[visual estimate]**. The imagery's own registration error is unknown, so **don't move the OSM outline on this evidence alone**.
- **The east projection is missing from OSM** (about 13 × 27 m at x 279…292, z -121…-94) **[visual estimate + plan]**.
- **FD-I/Workshop:** the Workshop's north edge, (196.2,-38.8)→(273.3,-51.1), sits 0–2 m from FD-I's south edge and overlaps it by about 1 m near x 273. In imagery a tree strip roughly 8–15 m wide separates the two roofs **[visual estimate]**. One of the two OSM outlines is probably drawn too far into the gap. Pass this to `workshops-halls`.

## C. Floor-by-floor layout

Source: the official "Institute Building Plan (With Room Numbers)" in the Pilani timetable PDFs (First Semester 2026-27 p.4, same plan in earlier years). Ground and first floor plans are **identical in outline** **[verified]**. Room numbering rules: first digit is the FD (1), second digit is the floor (1 = ground, 2 = first), last two digits are the serial **[verified]**.

Numbering on the plan (arrows show which way numbers increase) **[verified]**:
- **North wing:** 1108 → 1116 (first floor 1208 → 1216), running west to east along the north band.
- **West wing:** 1101 (south end) → 1107 (north end), running northward; first floor 1201 → 1207.
- **East wing:** 1117 (north) → 1124 (south), running southward; first floor 1217 → 1224.
- **South wing:** 1128 (east) → 1133 (west), running westward; first floor 1228 → 1233.
- **Cross wing and east projection:** no numbers drawn **[verified]**. Timetables also use 1125–1127, 1129, 1219–1227 and 1231–1234, which shows more rooms than the arrows label. Exact positions of the unlabelled numbers are **[unknown]**.

Each plan wing is drawn as a **room band along the outer wall** with an open **corridor or verandah band facing the courtyard**. The cross wing is drawn entirely open, as a wide corridor joining the west and east wings. The room band is about 9 m and the corridor about 3.5–4 m when scaled to OSM **[approximation from plan proportions]**.

Uses from the timetables (Sem I 2026-27 and Sem I 2020-21) **[verified]**:
- **Ground floor (labs):** 1112 (CE practical, 2020), 1114 (CE F312 Hydraulic Engg practical), 1117 (CHE F312 Chemical Engg Lab I), 1119 (CE F243 Soil Mechanics practical, 2020), 1124 (CE F230 Civil Engg Materials practical), 1127 (CE F213 Surveying practical), 1128 (CE GIS practical, 2020), 1129 (CHE F341 Chemical Engg Lab II).
- **First floor (classrooms):** 1201–1205, 1219, 1220, 1222, 1223, 1225, 1226, 1227, 1231, 1232, 1233 and 1234 hold lectures and tutorials for many departments.
- Faculty chambers or offices in FD-I: **[unknown]**. No source located a faculty "staff room".

ASCII plan, ground floor, north up. Not to scale; proportions follow the official plan and the OSM courtyards. `[R]` = room band, `:` = courtyard-side corridor, `##` = probable entrance mark.

```
          N  (service road, then Library)
 ##┌──────────────────────────────────────────────┐
   │[R] 1108 ───────────────►──────────── 1116 [R]│   north wing (≈11–14 m)
   │::::::::::::::::::::::::::::::::::::::::::::::│
   │R┊ ┌──────────────────────────────────────┐ ┊R│
   │1┊ │      NORTH COURTYARD (trees)         │ ┊1│
   │1┊ │      ~67 × 26 m       o (marker)     │ ┊1│
   │0┊ └────────────────┐    ┌────────────────┘ ┊1│
   │7┊                  └────┘                  ┊7│
 ##│ ▲        CROSS WING (open corridor)        ▼ ├──────┐
   │ ┊                                          ┊ │ EAST │ projection,
   │R┊ ┌──────────────────────────────────────┐ ┊ │ PROJ │ not in OSM
   │1┊ │      SOUTH COURTYARD (trees)         │ ┊R└──────┘
   │1┊ │      ~67 × 31–44 m          ┌──────┐ │ ┊1
   │0┊ │                             │ box  │ │ ┊1
   │1┊ └─────────────────────────────┴──────┘ ┊2│
   │::::::::::::::::::::::::::::::::::::::::::::4│
   │[R] 1133 ◄──────────────────────── 1128 [R]│   south wing (≈13–15 m)
 ##└──┬──────────────┬──────────────────┬────────┤
      │ SW block   │XX SHED XX│          │ SE block
      └────────────┴──────────┘          └──────┘
          S  (tree strip, then BITS Workshop)
```

First floor: same outline, numbered 12xx with the same arrow directions **[verified]**. Roof: flat, with parapets and PV clusters **[visual estimate]**.

## D. Staircases

**No staircase was seen in any source.** The plan draws no stair symbols, and no interior photo of FD-I circulation was found **[unknown]**. The crossed box at the south is labelled "SHED", not a stair **[verified]**.

Proposed layout, **clearly an [approximation]** for the game:
- **Four corner stairs**, one in each corner block where two wings meet. Each is a dog-leg (two flights of 16 risers with a half landing) for floor-to-floor `FH ≈ 5.0 m`. Use `RISE = FH/16` per COORDINATES.md (≈0.31 m, steep), or a 2 × 9 riser split if the gameplay step limit allows. Width about 1.8–2.0 m. MS railing plus a cream masonry parapet. Each opens onto the courtyard-side corridor.
  - NW ≈ (184.7, -143.9), NE ≈ (263.2, -152.1), SW ≈ (195.7, -48.5), SE ≈ (275.3, -56.9) (game x,z, local u/v ≈ 9–10 m in from each corner).
- **Optional main stair** in the east projection at about (280, -107), single wide flight with landing, facing the cross-wing corridor.
- A stair at the **SW corner conflicts with the staff room** (which currently occupies local u 7.6–14.6, v 99.5–110). Put the SW stair on the courtyard side of the corner block, or move it about 6 m north up the west wing.

## E. Interior

Direct interior evidence for **FD-I specifically** is weak:
- The official virtual tour has **"Chemical Engineering Lab"** (panorama `panorama_BD13EF15_B18C_8FC2_41E4_360DB603C075`) and **"Civil Engineering Lab"** (`panorama_BD1F3739_B18C_9FC2_41E2_78CE76C827B4`). The tour **does not say which building** they are in **[unknown]**. Timetables put ChemE Lab I/II and the Civil practicals in FD-I ground-floor rooms, so the ChemE panorama is *probably* an FD-I room **[approximation]**. What the panoramas show **[verified, for those rooms]**:
  - **ChemE lab:** large open lab with a white grid false ceiling, recessed linear LED troffers and ceiling fans. Floor is grey-green polished stone tile in a mixed rectangular pattern. Walls are cream. Tall wooden-framed windows with cream roller blinds. Island benches with black tops and white/blue-trim cabinets, steel stools, a fume-hood stand and wall-mounted gas panels.
  - **Civil lab:** exposed concrete beams with no false ceiling, hanging tube lights and ceiling fans. Same grey stone floor. Cream walls, wooden-framed glazed windows and doors, a red "EXIT" sign. Blue steel loading frames and a universal testing machine. A sign mentions structural engineering. Its building is **[unknown]**, and the exposed roof structure may mean it is not in FD-I.
- First-floor classrooms: **[unknown]**. No photo found. Plausibly similar to FD-II/FD-III classrooms (tiered or flat benches, green board), but don't treat that as evidence.
- Room signage: four-digit numbers (e.g. "1226") are the official scheme **[verified]**. How the signs look is **[unknown]**.
- Ceiling height: **[unknown]**. 13 m over 2 floors suggests about 4.5–5 m clear **[approximation]**.

## F. Gameplay

Today (read from the running game, `window.__game.campus`) **[verified]**:
- `staffroom` ("FD-I · Faculty Division") at **x 193…201, z -51.75…-41.75** (8 × 10 m), south door at x = 197. `exit` = (197, -39.55), `inside` = (197, -43.35). Eight NPC `spots` sit inside. The door cut is x 195.65…198.35, z -42.05…-39.15.
- In real terms that is the **SW corner block** (west-wing rooms 1101/1201 meet south-wing 1133/1233), so the location is plausible. A south-facing door, however, opens straight onto the narrow FD-I/Workshop gap.

Recommendations **[approximation]**:
1. **Keep the `staffroom` id, size and position.** It sits inside the solid SW corner block and clear of both courtyards (south courtyard starts at local u 18.4).
2. **Keep the door on the south side** for now, because tests depend on `exit`, and guarantee a walkable apron of ≥ 6 m south of z -40 at x 193…201. That means trimming the Workshop collider or footprint locally, or confirming none is there. A better long-term option: turn the door **west** onto a west-side path (exit about (191, -47)), which matches the plan's SW corner entrance mark. Update `exit` and the tests together if that is done.
3. **Entry points** for a walk-in FD-I: west main entrance ≈ **(181.7, -105)** into the cross-wing corridor; SW corner ≈ (192, -45); east projection ≈ (290, -107); the NW corner mark ≈ (177, -142).
4. **Collision:** ring walls from the OSM outer ring and holes. Courtyards are walkable ground with tree trunks as colliders. Inner corridors are about 3.5–4 m wide along the courtyard side of each wing, and the cross wing is a fully open passage. The first floor only needs to be walkable if stairs are built. Otherwise make the ground floor a shell with the staff room plus 2–3 enterable labs (e.g. "1117 Chemical Engg Lab") and keep the other rooms as closed doors with number plates.
5. **NPC walk areas:** the cross-wing corridor (W↔E), the courtyard-side corridors and the courtyard paths. Faculty NPCs go between the staff room and the cross-wing corridor.
6. **Interactables:** room number plates (11xx/12xx), a notice board at the west entrance, lab benches in 1117.
7. **Camera limits:** inside corridors keep the camera under the 5 m ceiling. Courtyards are open to the sky, but tree canopies will clip, so use canopy fade.
8. **Interior hide distance:** interiors already hide beyond about 15 m. The building is 93 m wide, so split interior groups per wing.

## G. Sources

| # | Source | URL | What it shows | Confirms | Local capture |
|---|---|---|---|---|---|
| 1 | BITS Pilani Timetable, First Semester 2026-27 (official), p.4 "Institute Building Plan (With Room Numbers)" + legend | https://academic.bits-pilani.ac.in/Downloads/Time-Table/Timetable_17_Aug_2026_4fdfacd4-f4d2-4008-b8d7-5f9f8de95a1e.pdf | Ground and first floor plans of FD I/II/III, New Workshop, Library and LTC; room numbers; numbering legend | 2 floors; 日 plan; room bands and arrows; east projection; SHED; Library to the north; room-number rule; first-floor class use | `$R/plan2026-004.png`, `$R/plan-fd1-ground-004.png`, `$R/plan-fd1-first-004.png`, `$R/dl/tt2026.pdf` |
| 2 | BITS Pilani Timetable, First Semester 2020-21 | https://academic.bits-pilani.ac.in/Downloads/Time-Table/Old_Timetable/2020-21/I-Sem-2020-21.pdf | Course list with rooms | Ground-floor lab uses (1112, 1119, 1127, 1128, 1129) | `$R/dl/tt2020.pdf` |
| 3 | Esri World Imagery tiles, z18 (Esri/Maxar) | https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/18/{y}/{x} (y 109517–109519, x 186113–186115) | Top-down roof view of FD-I and its neighbours | Two treed courtyards; wing depths; PV clusters; east projection; FD-I/Workshop gap; LTC location; OSM fit | `$R/sat-z18-plain.png`, `$R/sat-z18-overlay.png` (OSM drawn over it), `$R/sat-fd1-crop.png`, `$R/sat-fd1-crop-overlay.png` |
| 4 | Official 360° virtual tour, "Drone Day View" | https://www.bits-pilani.ac.in/Pilani-Campus-Virtual-tour/index.htm (panorama_BB0577EA_FC5E_3691_41E2_80F846AEBA0C, front face) | Oblique aerial from the south: Main Building, and FD-I behind the sawtooth Workshop | Two storeys; cream facade with horizontal window rows; flat roof with PV clusters; Library and LTC behind | `$R/pano/vt-drone-day-strip.jpg`, `$R/pano/drone-day-f-L0-fd1.jpg`, `$R/pano/drone-fd1-zoom.jpg` |
| 5 | Virtual tour, "Chemical Engineering Lab" | same tour (panorama_BD13EF15_B18C_8FC2_41E4_360DB603C075) | Lab interior | Interior materials of a ChemE lab (building not stated) | `$R/pano/vt-cheme-strip.jpg` |
| 6 | Virtual tour, "Civil Engineering Lab" | same tour (panorama_BD1F3739_B18C_9FC2_41E2_78CE76C827B4) | Structures lab interior | Interior materials (building not stated) | `$R/pano/vt-civil-strip.jpg` |
| 7 | Virtual tour, "Lecture Theatre Complex" | same tour (panorama_D25383E3_CFD7_3E83_41D4_3F9F42999D53) | Single-storey arcaded LTC around a lawn | That the arcaded look belongs to the **LTC**, not FD-I | `$R/pano/vt-ltc-strip.jpg` |
| 8 | Virtual tour, "CRISS Robotics" | same tour (panorama_BD65A009_B184_7219_41E5_6F8AC6152441) | Interior with a steel-truss sawtooth roof | CRISS Robotics is in the old Workshop, not FD-I | `$R/pano/vt-criss-strip.jpg` |
| 9 | Virtual tour, "Central Workshop" (+ "Central Workshop 1/2") | same tour (panorama_D03C3643…, BD5318D0…, BD47518A…) | The new Central Workshop building | Not FD-I (hand-off) | `$R/pano/vt-cw*-strip.jpg` |
| 10 | Virtual tour, "Drone Night View" | same tour (panorama_BD69F782_B19C_BE37_41E2_6426783183BD) | Night aerial | FD-I not resolvable; no lighting evidence | `$R/pano/vt-drone-night-strip.jpg` |
| 11 | YouTube "BITS PILANI CAMPUS TOUR (2025-2026)" | https://www.youtube.com/watch?v=XkDvacBC7zA | not recorded (see YouTube note) | nothing confirmed | captures missing |
| 12 | YouTube "BITS Pilani, Pilani Campus - Official Campus Tour" | https://www.youtube.com/watch?v=bkmKuEguTH8 | not recorded (see YouTube note) | nothing confirmed | captures missing |
| 13 | OSM data in repo | `data/bits-campus.js` | Footprints, holes, roads, POIs | Coordinates above | — |
| 14 | Game today (`?explore`) | http://localhost:8080/?explore | Current model | Section H | `$R/game-fd1-aerial.png`, `$R/game-fd1-oblique-sw.png`, `$R/game-fd1-oblique-ne.png`, `$R/game-fd1-top.png`, `$R/game-fd1-staffroom-inside.png`, `$R/game-fd1-staffroom-door.png` |

**YouTube note:** the earlier run left this note unwritten, and the captures it points to (`$R/yt/` and the rest of `$R/`) were gone from the scratchpad when this report was checked on 2026-11-17. Rows 11 and 12 therefore record no confirmed findings and should be treated as **not accessed** until someone inspects them again. Every other claim in this report rests on rows 1–10 and 13–14 **[unknown for the YouTube rows]**.

## H. Comparison with the game today

What matches **[verified, game captures]**:
- OSM footprint with both courtyard holes, placed correctly. The courtyards hold trees.
- Cream wall colour, roughly right.
- The staff room sits inside the SW corner block and is enterable.

What is wrong:
- **Floors:** the facade shows **four** rows of windows over 13 m. The real building has **two** storeys.
- **Window style:** tall **arched** dark-blue windows. Real FD-I shows rectangular windows in horizontal bands **[visual estimate]**.
- **Roof:** solid rows of PV panels over the whole roof. Real roof has parapet steps and **sparse PV clusters** **[visual estimate]**.
- **Massing:** a single flat extrusion. Real wings have lower outer steps or verandahs, corner blocks projecting south, a **missing east projection**, and a south "SHED".
- **FD-I/Workshop junction:** the two extrusions touch, forming one continuous roof mass in the oblique view. Reality has a treed gap of about 8–15 m. The Workshop is also drawn as a windowed academic block with PV, but really has a **sawtooth roof** (hand-off).
- **Staff-room door:** opens south into the narrow gap between FD-I and the Workshop, behind the building.
- **No interior circulation:** no corridors, no stairs, no lab rooms.

Ranked fixes (most visible first) **[approximation]**:
1. Re-extrude FD-I as **two storeys** (≈ 5–5.5 m each + about 1.5 m parapet, total ≈ 12–13 m). Use a facade texture with **two rows of rectangular windows** and horizontal cream/beige bands; no arches.
2. Replace the full PV roof with a **plain light roof plus parapet bands** and 6–10 small PV clusters.
3. Open a **gap between FD-I and the Workshop** (coordinate with `workshops-halls`), and give the Workshop its sawtooth roof.
4. Add the **east projection** (about x 279…292, z -121…-94) and the south **corner blocks/shed**.
5. Add a **west main entrance** at about (181.7, -105) with a wide doorway into an open **cross-wing corridor**. Add courtyard-side corridors and corner stairs (Section D).
6. Fill the courtyards with denser canopy trees and add the small structure in the SE corner of the south courtyard.
7. Make 1–3 ground-floor labs enterable (ChemE lab look from Section E). Put number plates (11xx) on closed doors.

## I. Uncertainties and hand-offs

Uncertainties:
- No close-range exterior or corridor photo of FD-I was found. Facade details, entrance design, staircase positions, ceiling heights and lighting are **[unknown]**.
- The black wall marks on the official plan are interpreted as openings or entrances. That reading is **[unknown]**.
- The north–south extent differs: imagery suggests about 97–100 m, OSM says 110 m. The imagery's registration error is unknown.
- The tour does not say where the ChemE and Civil lab panoramas were taken.
- Whether FD-I has a usable roof or a mezzanine is **[unknown]**. The timetable lists only two floors.

Hand-offs:
- **`workshops-halls`:** BITS Workshop's north edge overlaps or touches FD-I in OSM, while imagery shows a treed gap of about 8–15 m. The Workshop has a sawtooth roof (Drone Day View, CRISS Robotics panorama) but is extruded as a windowed block with PV in the game. CRISS Robotics (POI 249.9, -38.8) is inside the Workshop. "Central Workshop" panoramas show the new Central Workshop building.
- **Orchestrator / `workshops-halls` (unassigned):** the **Lecture Theatre Complex (LTC)** is missing from OSM. It sits about x 281…346, z -229…-135 by eye from Esri imagery, north-east of FD-I. The tour panorama shows a single-storey cream/pink arcaded building around a lawn with a central block. It appears on the official plan east of the Library.
- **`library`:** the plan confirms the Library is directly north of FD-I. The drone frame shows its dome and pink brick.
- **`roads-paths`:** service road north of FD-I; tree-lined road along the west side (x about 150–165); paths into the west entrance and between FD-I and the Workshop.
- **`main-building` / `fd2-fd3`:** the same official plan shows FD III (west) and FD II (east) on either side of the central Audi/clock-tower block, each with one large courtyard, plus room numbers (2xxx, 3xxx). This may help with the OSM naming of `FD-II` and the "FD 2"/"FD3" POIs.
