# Ram Bhawan and Budh Bhawan: research report

Agent: `hostels-ram-budh`. Phase: research only, no game code changed.
Coordinates follow [COORDINATES.md](../COORDINATES.md): metres from the Rotunda, x east, z south, y up.

Tags: **[verified]** seen directly in a source I opened, or read from the repo or OSM data. **[visual estimate]** read off an aerial or video frame, so it is approximate. **[approximation]** a proposal for the game that no source shows. **[unknown]** no evidence.

Main evidence:
- The official 360° tour's **"Drone Day View"** panorama (`panorama_BB0577EA_FC5E_3691_41E2_80F846AEBA0C`). It is taken from roughly 80 m above the south end of the central NAB lawns, between the Gandhi and Patel statues. Its own hotspots label "Ram Bhawan" (yaw −21.5°, pitch −19°) and "Budh Bhawan" (yaw −53.8°, pitch −37°). I downloaded its full-resolution cube faces and reprojected them with ffmpeg `v360`. This gives clear oblique aerials of both Bhawans (roofs, courtyards, the facades that face east and south, and the courtyard faces).
- The SWD pages for each Bhawan.
- The SWD hostel allocation guidelines PDF.
- One 2018 frame of the Ram Bhawan common room.

**No interior walkthrough of either Bhawan was found** (corridors, rooms, washrooms, stairs). Everything inside is therefore [unknown] or [approximation].

---

## Ram Bhawan

### A. Identification
- **Official name:** "Ram Bhawan" [verified: SWD page `swd.bits-pilani.ac.in/ram-bhawan.aspx`, and the tour hotspot label]. It is also spelled "Ram Bhavan" elsewhere.
- **Category:** Student hostel (Bhawan). The tour's hotspot tooltip calls it "Boys Hostel" [verified, tour `locale/en.txt`, `HotspotPanoramaOverlayArea_C9546EA4…` and `…926FDE7A…`]. Wikipedia lists it among the hostels for male students [verified].
- **Staff:** a Warden, an Associate Warden and a Superintendent [verified, SWD page]. Names are left out on purpose; they are not needed for the game.
- **OSM footprint** (`data/bits-campus.js`) [verified]:
  - Outer: (−136.4, 84.2) (−75.6, 75.7) (−65.3, 180.7) (−124.2, 190.6)
  - Hole 1: (−126.4, 94.8) (−86.6, 89.7) (−82.9, 123.6) (−122.7, 128.0)
  - Hole 2: (−120.9, 140.9) (−80.0, 135.7) (−75.6, 169.6) (−116.1, 174.4)
  - Data height `h = 11`.
- **Size from OSM, in the building's own frame** [verified, computed]:
  - About 61 m east–west by 104–107 m north–south.
  - The long axis runs about 6° east of due south. The building is rotated about 6° clockwise from the grid.
- **Courtyards** (two, from the OSM holes) [verified, computed]:
  - South court: about 40 × 34 m.
  - North court: about 42 × 35 m.
- **Wing depths implied by OSM** [verified, computed; OSM tracing is approximate]:
  - West: about 9 m.
  - East: about 10–11 m.
  - South: about 11 m.
  - Middle (cross) wing: about 12 m.
  - North: about 13–15 m.
- **Nearby** [verified from OSM and POIs, and seen in the drone view]:
  - Ram-Budh mess immediately south (x −120…−74, z 195…234), a single-storey flat-roofed block.
  - "Ram Redi" POI at (−121, 187), just off the south-west corner.
  - "Da Cloud Cafe" at (−118, 209).
  - Malviya-A to the west (x −216…−152).
  - The S Lawns POI (−111, 37) and Main Building West Wing to the north.
  - New Academic Block (x −32…29) to the east, across "Ram Marg" (a service road from (−59, 63) towards the south-east) and its tree line.
  - "Ram Stairs" (steps) from (−53, 107) to (−25, 103), leading east towards the NAB [verified, OSM roads].

### B. Exterior
- **Floors:** two storeys (ground and first) plus a flat accessible roof with a parapet [visual estimate, tour Drone Day View: two rows of windows on every face].
  - There is one taller block on the far (north or west) side of the north court. It has vertical fins and stands above the roof line [visual estimate]. It could be a stair or water-tank tower, or a third-storey element. Which one is [unknown].
- **Height:** about 9–10 m to the top of the parapet [visual estimate, comparing the storey bands with the cars parked along the south face]. OSM `h = 11` is close. The game builds 2 × 3.3 = 6.6 m.
- **Plan shape:** a rectangle with two courtyards, like the numeral 8 [verified, OSM, confirmed in the drone view].
- **Outer facades (south and east):**
  - Off-white or cream plaster [visual estimate].
  - Ground floor: a regular row of tall round-headed (arched) window openings.
  - First floor: a matching row of smaller rectangular windows, one above each arch [visual estimate, `tour-drone-day-ram-zoom.jpg`].
  - A plain parapet with a thin cornice band [visual estimate].
- **Courtyard faces:**
  - **Middle (cross) wing, south face** (seen across the south court): a ground-floor arcade of about 11 tall semicircular arches on piers. Above it, a first-floor gallery of closely spaced narrow rectangular openings. This reads as an open corridor on both floors [visual estimate].
  - **West wing inner face:** pink or salmon plaster with plain rectangular windows on both floors. No arcade is visible on this face [visual estimate].
  - **East wing inner face:** not clearly visible [unknown].
- **Courtyard surfaces:**
  - South court: paved concrete or stone with a few planters and small trees, and no lawn [visual estimate].
  - North court: greener, with trees and shrubs [visual estimate, `tour-drone-day-west-context.jpg`].
- **Roof:**
  - Flat, light grey [visual estimate].
  - Large tilted solar PV arrays cover much of the west wing and the south-west corner. A strip of PV runs along the south wing [visual estimate].
  - Smaller clusters of tilted flat-plate panels sit on the east wing. They are probably solar water heaters.
  - Several small raised roof structures look like stair bulkheads or tank stands [visual estimate].
- **Doors and entrances:** not visible in the aerial. Where the main entrance is and which face it is on is [unknown].
- **Surroundings:**
  - Cars are parked along the south face, between Ram and the mess [visual estimate].
  - The east side faces a tree-lined road and walkway [visual estimate].
  - Dense tree cover surrounds the building on all sides [visual estimate].
- **Renovation:** a user review on a listing site (worldorgs; not opened by me, seen only as a search snippet) says Ram was renovated with Western-style toilets around 2021. That makes it [unknown] at the level of this report.

### C. Floor-by-floor layout
There is no interior evidence. The plan below matches the aerial massing and the OSM holes. The positions of rooms and corridors are an **[approximation]**.

```
                 N  (z ≈ 76–84)
   +----------------------------------------------+
   |              NORTH WING  (~13 m)              |
   |   +--------------------------------------+    |
   | W |   NORTH COURT  ~42 x 35 m  (trees)    | E  |
   | E |                                       | A  |
   | S +--------------------------------------+ S  |
   | T |   MIDDLE WING ~12 m: arcade + gallery  | T  |
   |   |   on its south (court) face            |    |
   | ~9+--------------------------------------+~10 |
   | m |   SOUTH COURT  ~40 x 34 m  (paved)     | m  |
   |   +--------------------------------------+    |
   |              SOUTH WING  (~11 m)              |
   +----------------------------------------------+
                 S  (z ≈ 181–191) -> Ram-Budh mess
   x ≈ -136 (west)                        x ≈ -65 (east)
```

- **Ground floor:** student rooms along the wings. An open arcade corridor on at least the middle wing's south face [visual estimate]. A common room with a TV [verified, SWD page and 2018 video]. Shared washrooms, about one bathroom per four students [verified, SWD page]. Exactly where each sits is [unknown].
- **First floor:** rooms, with a gallery corridor above the arcade [visual estimate].
- **Roof:** accessible flat terrace with solar arrays and tanks [visual estimate]. Whether students may go up is [unknown].

### D. Staircases
Not seen in any source [unknown]. Proposed layout, **[approximation]**:
- Four stair cores, one at each inner corner where a wing meets the next. Each is a dog-leg stair (two flights with a half landing), opening off the corridor, about 1.2–1.5 m wide, with an MS (mild-steel) railing.
- One core continues to the roof under a raised bulkhead. The small raised boxes seen on the roof are consistent with this [visual estimate].
- The game's two cores (the main one in the west wing beside the lobby, and one in the east wing) are an acceptable simplification.

### E. Interior
- **Common room** [verified, frame `yt-ramcommon-0010.png`, video "Common Room Debate Ram - Bhawan 2", 2018, 0:10]:
  - White or cream painted walls.
  - Two tiers of windows: one at normal height and a high clerestory window above it. So the ceiling is high, about 4 m or more [visual estimate].
  - A wall-mounted flat-screen TV.
  - Rows of wooden chairs or benches.
  - The room is large enough for about 40 people [visual estimate].
- **Rooms** [verified, SWD page]: "well furnished", with a cot, study table, chair and wardrobe, plus internet and 24/7 water and power.
- **Room occupancy** [verified, allocation guidelines, AY around 2023]: higher batches got single rooms and the 2022 batch of boys got double rooms. Which Bhawan held which batch is not stated for Ram.
- **Recreation** [verified, SWD page]: badminton courts, a common room with TV, a TT table and carrom.
- **Flooring, doors, room numbers, corridor finishes:** [unknown].

### F. Gameplay
Where things are in the game today [verified, read from `window.__game.campus` in `?explore`]:
- Squared frame `O = (−136.07, 83.15)`, `W = 60.49`, `L = 106.30`, angle 6.08°, two courts.
- **Entrance:** in the middle of the west face. Outside point (−132.7, 135.4), inside point (−128.9, 135.0).
- **Main stair:** (−127.5, 140.0). East stair: (−68.6, 169.5).
- **Common room:** (−130.3, 114.7). Laundry: (−126.1, 153.5).
- 122 numbered room doors.

Recommendations, **[approximation]** unless tagged:
- **Entry and exit:** keep the west entrance until the real one is found. The west face looks onto the road at x ≈ −151 [verified, OSM road], so the choice is defensible.
  - A second, south doorway towards the Ram-Budh mess would match how students actually move (Ram Redi and the mess are at the south-west).
- **Spawn:** the entrance inside point (−128.9, 135.0) is fine.
- **Collision:** the outer AABB chunks are fine. If the wings are made deeper (see H), shrink the courtyard colliders to match.
- **Enterable rooms:** keep the current few (double, study, senior, common room, washrooms, laundry). Ram has no gameplay rooms from `ROOM_HOSTS`, so nothing to protect there.
- **NPC areas:** the arcade corridor along the middle wing's south face, the south court, the strip in front of the mess.
- **Interactables:** TV in the common room [verified to exist], TT table, carrom [verified via SWD], water cooler, notice board.
- **Camera:** clamp it to the ceiling height inside corridors. Outside, the roof parapet needs a collider about 1 m high.

---

## Budh Bhawan

### A. Identification
- **Official name:** "Budh Bhawan" [verified: SWD page `swd.bits-pilani.ac.in/budh-bhawan.aspx`, and the tour hotspot label].
- **Category:** student hostel. **Who lives there is contested:**
  - The SWD Hostel Allocation Guidelines (for a year when batch f2022 was in its first or second year, so about 2023) say "Girls of batch f2022 … are expected to remain in their currently allocated rooms in Budh Bhawan" [verified, PDF text]. So Budh **housed women students at least around 2022–23**.
  - The official 360° tour's hotspot tooltip (tour build stamp 1721027154227, about July 2024) labels it "Boys Hostel" [verified].
  - Wikipedia lists it among the hostels for male students [verified].
  - Current status: **[unknown]**. Flagged for the orchestrator, because the game treats it as a boys' walk-in.
- **OSM footprint** [verified]:
  - Outer: (−111.7, 256.3) (−59.0, 244.5) (−38.0, 344.7) (−91.0, 355.0)
  - Hole 1: (−97.7, 267.3) (−62.7, 260.7) (−56.4, 299.8) (−91.0, 304.2)
  - Hole 2: (−89.6, 312.3) (−54.2, 307.1) (−47.6, 337.3) (−83.7, 341.8)
  - Data height `h = 11`.
- **Size from OSM** [verified, computed]:
  - About 54 m across by 101 m long.
  - The long axis runs about 12° east of due south (rotated about 12° clockwise).
- **Courtyards from OSM:**
  - North court: about 37 × 40 m.
  - South court: about 36 × 33 m.
- **Wing depths implied by OSM:**
  - West: about 10 m.
  - East: about 7–8 m.
  - North: about 13.6 m.
  - South: about 8.5 m.
  - Middle: **about 5.4 m**. That is too thin for rooms plus a corridor, so the OSM holes are probably traced loosely [visual estimate; the drone view shows a full-depth middle wing with an arcade].
- **Nearby** [verified, OSM and POIs]:
  - Ram-Budh mess to the north (z 195…234).
  - "Budh Redi" POI (−112, 256) at the north-west corner.
  - "TOTT" (−152, 249) and "-301°F" (−136, 258) to the west.
  - SAC (x −204…−145, z 288…321) to the west, the large blue-roofed hall seen in the drone view.
  - "Jawed Habib Salon" (−131, 351).
  - The Gandhi statue roundabout (−12, 359) to the south-east.
  - A road along the south side (z ≈ 360–371) and Ram Marg along the east.
  - "Budh Stairs" (steps) at (−34, 224).
  - An unnamed 20 × 38 m block at (−57, 210), between Budh and the NAB. There is a small blue pool-like feature near it in the drone view [visual estimate]; what it is is [unknown].

### B. Exterior
- **Floors:** two storeys plus a flat roof with a parapet [visual estimate, tour Drone Day View].
- **Height:** about 9–10 m to the parapet [visual estimate].
- **Plan shape:** a rectangle with two courtyards [verified, OSM, and visible].
- **East (outer) facade** [visual estimate, `tour-drone-day-budh-zoom2.jpg` and `tour-drone-day-budh-south.jpg`]:
  - Ground floor: a continuous row of round arches, each filled with a decorative circular-pattern grille (a metal or masonry jaali).
  - First floor: a continuous row of rectangular openings between piers, with small projecting brackets or sunshades. It looks like an **open gallery on the outer face**, which suggests that at least the east wing's corridor runs along the outside.
- **South wing outer face:** rectangular room windows with small box projections or sunshades on both floors [visual estimate]. There is a dark recessed opening near the south wing's west end that may be a doorway or a stair well [visual estimate, purpose unknown].
- **Courtyard faces:**
  - Middle wing: ground-floor round-arched arcade and a first-floor gallery of rectangular openings [visual estimate].
  - West wing inner face: **pink or salmon plaster** with plain rectangular windows, two floors [visual estimate].
  - A plain white face with small windows on the far side of the north court [visual estimate].
- **Colours:** off-white or cream outer walls, pink or salmon on some courtyard faces, light grey roof [visual estimate].
- **Courtyards:** **both are grass lawns with mature trees and shrubs** [visual estimate]. The south court also has a small paved patch [visual estimate].
- **Roof** [visual estimate]:
  - Flat, with a parapet.
  - Tilted PV arrays along parts of the west and south wings and the north wing.
  - Small groups of tilted flat-plate collectors, probably solar water heaters.
  - A cluster of about 8 black and grey plastic water tanks on a raised platform over the middle or west wing.
  - Small raised bulkheads.
- **Landscaping:** a dense tree belt all round. A wire-mesh fence along part of the east side is consistent with a cricket net or court [visual estimate; SWD lists a "cricket net" for Budh, verified].
- **Entrances:** not identified [unknown].

### C. Floor-by-floor layout
**[approximation]** (no interior evidence):

```
                  N (z ≈ 245–256)  -> Ram-Budh mess, Budh Redi (NW corner)
   +--------------------------------------------+
   |            NORTH WING (~12-14 m)            |
   |  +-------------------------------------+    |
   |W |  NORTH COURT ~37 x 40 m (lawn,trees) | E  |
   |  +-------------------------------------+    |
   |  |  MIDDLE WING: arcade + gallery       |    |
   |  +-------------------------------------+    |
   |  |  SOUTH COURT ~36 x 33 m (lawn,trees) |    |
   |  +-------------------------------------+    |
   |            SOUTH WING (~8-9 m)              |
   +--------------------------------------------+
                  S (z ≈ 344–355)  -> road
   x ≈ -112 (west)                     x ≈ -38 (east)
   (outline rotated ~12° clockwise)
```

- **Ground and first floor:** rooms, an outer gallery corridor on the east wing [visual estimate], an arcade corridor on the middle wing's courtyard faces [visual estimate], a common room with TV, TT and carrom [verified, SWD], and shared washrooms at about one bathroom per four students [verified, SWD].
- **Roof:** terrace with tanks and solar [visual estimate].

### D. Staircases
Not seen [unknown]. Use the same proposal as for Ram, **[approximation]**: dog-leg stairs at the wing junctions, one rising to a roof bulkhead.

### E. Interior
- **Amenities** [verified, SWD page]: "well furnished rooms", cots, study tables, chairs, wardrobes, internet, 24/7 water and power, shared washrooms, badminton courts, a cricket net, a common room with TV, a TT table, carrom boards and 24-hour security guards.
- The SWD page for Budh lists "1 dining hall, capacity 400" [verified]. That figure is for the mess, not the Bhawan.
- **Finishes, room numbers, doors, lighting:** [unknown].

### F. Gameplay
Where things are in the game today [verified, live read]:
- Frame `O = (−111.77, 255.94)`, `W = 53.99`, `L = 101.61`, angle 11.84°, two courts.
- **Entrance:** in the middle of the west face. Outside point (−103.2, 307.6), inside point (−99.5, 306.8).
- **Main stair:** (−97.5, 311.7). East stair: (−43.2, 331.9).
- **Common room:** (−102.9, 286.7).
- **Courtyards:** cricket at (−79.1, 280.1), football at (−69.5, 326.1).
- 112 numbered doors.

Recommendations, **[approximation]**:
- **Entrance:** keep it on the west. The west face looks towards the SAC and the TOTT/-301°F food spots, so it is plausible. A north door towards the mess and Budh Redi would also be natural.
- **Courtyards:** walkable lawn with tree colliders (trunk cylinders as small boxes) in place of the bare concrete pitches. Cricket can stay as an informal game on the lawn, since SWD lists a cricket net.
- **NPC areas:** the outer east gallery, the middle-wing arcade, the lawns.
- **Gender status:** if the orchestrator decides Budh is currently a women's hostel, it should become closed to the player the way Bhagirath is, or be presented as such. That is a design decision, not a geometry one.

---

## G. Sources

| # | Source | URL | What it shows (timestamp or panorama) | Confirms | Local capture |
|---|---|---|---|---|---|
| 1 | BITS Pilani official 360° virtual tour (3DVista), "Drone Day View" panorama | https://www.bits-pilani.ac.in/Pilani-Campus-Virtual-tour/index.htm (tiles under `media/panorama_BB0577EA_FC5E_3691_41E2_80F846AEBA0C_0/`) | Aerial 360° from above the south end of the NAB lawns. Hotspots "Ram Bhawan" (yaw −21.5, pitch −19) and "Budh Bhawan" (yaw −53.8, pitch −37) | Massing, two courtyards each, 2 storeys, courtyard surfaces, roof equipment, facade rhythm and colours | `…/scratchpad/research/hostels-ram-budh/tour-drone-day-equirect.jpg`, `tour-drone-day-west-context.jpg`, `tour-drone-day-ram-zoom.jpg`, `tour-drone-day-budh-zoom.jpg`, `tour-drone-day-budh-zoom2.jpg`, `tour-drone-day-budh-south.jpg` |
| 2 | Virtual tour locale file | https://www.bits-pilani.ac.in/Pilani-Campus-Virtual-tour/locale/en.txt | Hotspot labels and tooltips | "Ram Bhawan" and "Budh Bhawan" hotspots have the tooltip "Boys Hostel". No interior panorama is named for either Bhawan | `…/scratchpad/dl/en.txt` (working copy) |
| 3 | Virtual tour scene data | https://www.bits-pilani.ac.in/Pilani-Campus-Virtual-tour/script_general.js | Hotspot yaw and pitch, and which panorama they sit in (also the Drone Night View, `panorama_BD69F782…`) | The labels point at these buildings | `…/scratchpad/dl/script_general.js` |
| 4 | SWD, Ram Bhawan page | https://swd.bits-pilani.ac.in/ram-bhawan.aspx | Facilities list | Furnished rooms, washroom ratio, common room with TV, TT, carrom, badminton, 24h security | n/a (text) |
| 5 | SWD, Budh Bhawan page | https://swd.bits-pilani.ac.in/budh-bhawan.aspx | Facilities list | Same as Ram, plus a cricket net. Dining hall capacity 400 | n/a (text) |
| 6 | SWD, Hostel Allocation Guidelines (PDF) | https://swd.bits-pilani.ac.in/510/Hostel%20Allocation%20Guidelines.pdf | Allotment rules, wings of at most 12 | Women students of batch f2022 held rooms in Budh Bhawan. Single rooms for older batches, doubles for the f2022 boys | `…/scratchpad/dl/alloc.pdf` |
| 7 | Wikipedia, "BITS Pilani" | https://en.wikipedia.org/wiki/BITS_Pilani | Residential section (first 100k characters read) | Lists Ram and Budh as male hostels, Meera as the only female complex, and says hostels share messes in pairs. This conflicts with source 6 for Budh | n/a |
| 8 | YouTube, "Common Room Debate Ram - Bhawan 2" (2018-08-18) | https://www.youtube.com/watch?v=ERokWP5vXCQ | 0:10, interior of the Ram common room | Wall-mounted TV, two tiers of windows, wooden seating, high ceiling | `…/scratchpad/research/hostels-ram-budh/yt-ramcommon-0010.png` |
| 9 | YouTube, "BITS PILANI CAMPUS TOUR (2025-2026)" | https://www.youtube.com/watch?v=XkDvacBC7zA | Frames at 1:40 and 3:20, and every 25 s from 3:50 to 8:00. No Ram or Budh scene among them. 4:40 shows a stylised campus map | Nothing specific to these buildings | `…/scratchpad/research/hostels-ram-budh/yt-tour25-0280.png` (map frame) |
| 10 | Game today, `?explore` | http://localhost:8080/?explore | Map views and the entrance views from inside | Current geometry and layout | `…/scratchpad/research/hostels-ram-budh/game-ram-map.png`, `game-budh-map.png`, `game-ram-entrance-inside.png`, `game-budh-entrance-inside.png` |
| 11 | OSM data in the repo | `data/bits-campus.js` | Footprints, holes, roads, POIs | Section A geometry | n/a |

`…/scratchpad` = `/private/tmp/claude-501/-Users-mirnal-Documents-Whisperflow/58e9866d-f336-43fa-bce9-096a63ba2c16/scratchpad`

## H. Comparison with the game today

**What matches** [verified]:
- The game squares the OSM outlines to within about 1.3 m. Ram's frame is rotated 6.08° and Budh's 11.84°, matching OSM.
- Both have two courtyards, matching OSM and the aerial.
- Two floors plus a roof terrace, matching the aerial.
- Cream exterior, matching.
- Solar panels on the roof (present, though laid out differently).
- Ram's south court is concrete in the game and paved in reality.

**What is wrong or doubtful**:
1. **Budh's courtyards.** The game has bare concrete with cricket and football pitches. Reality: grass lawns with mature trees in both courts [visual estimate]. Ram's north court also has trees [visual estimate]. This is the most visible difference from above.
2. **Courtyard facade treatment.** The game wraps every courtyard face in cusped (multifoil) arches with scrollwork grilles, a pattern taken from Gandhi Bhawan. Reality [visual estimate]:
   - Ram's middle wing has plain semicircular arches on the ground floor and a gallery of narrow rectangular openings above.
   - Several inner faces (the west wings of both Bhawans) are pink or salmon plaster with plain rectangular windows and no arcade.
   - Budh's east outer face has the arched, grilled arcade and the upper gallery on the outside.
3. **Roof equipment.** The game rings every roof edge with a uniform strip of solar panels. Reality: large PV blocks concentrated on particular wings, small groups of tilted solar water heaters, clusters of black and grey water tanks on raised stands, and stair or tank bulkheads [visual estimate].
4. **Wing depth.** The game uses `WD = 7.85 m` for every wing. OSM implies about 9–13 m (Ram) and 8–14 m (Budh), except Budh's middle wing. Its courtyards are therefore about 4–5 m wider than OSM in each direction [verified, computed]. This is a moderate change: deeper wings, smaller courts.
5. **Height.** The game is 6.6 m. Reality is about 9–10 m to the parapet [visual estimate], and OSM `h` is 11. Raising the floor height for these Bhawans, or adding a 1 m parapet, would help the silhouette.
6. **Budh's occupancy status.** It is a boys' walk-in in the game. The official 2023 allocation document places women students there [verified]. Needs a design decision.
7. **Entrance position.** The game puts both on the middle of the west face. No evidence either way [unknown].
8. **Ram's tall finned block.** It is absent in the game [visual estimate of the real one].

**Ranked fixes, most visible first:**
1. Turn Budh's two courtyards, and Ram's north court, into tree-filled lawns. Keep Ram's south court paved.
2. Replace the uniform edge ring of PV with clustered PV blocks, water-tank clusters on stands, and roof bulkheads over the stairs.
3. Give the courtyard faces variety: round arcade plus upper gallery on the middle wings, and plain pink or salmon walls with rectangular windows on the west wings' inner faces.
4. Give Budh's east outer face a ground-floor arcade of round arches with circular grilles and an open first-floor gallery.
5. Raise the overall height to about 9–10 m (taller floors or a parapet), and add a cornice band.
6. Deepen the wings towards about 10 m so the courtyards match the OSM holes.
7. Add the taller finned block on Ram's north or west side.
8. Settle Budh's status (open or closed) with the orchestrator.

## I. Uncertainties and hand-offs

**Uncertainties:**
- No interior footage or photos of either Bhawan exist in what I could reach: corridors, rooms, washrooms, stairs, lobby. Every interior layout here is an [approximation].
- Where the main entrance is, for both Bhawans: [unknown].
- Whether the corridors run on the courtyard side or the outer side of each wing: mixed evidence (Budh east wing outer gallery; Ram and Budh middle wing courtyard arcades) [visual estimate].
- Budh's current residents (women around 2023 per SWD; "Boys Hostel" per the July 2024 tour tooltip): [unknown].
- The OSM holes look loosely traced. Budh's middle wing comes out at only about 5.4 m.
- **Video playback limits:** YouTube in headless Chrome failed after in-page seeking ("Something went wrong"), and the embed player returned error 153. Loading a fresh watch URL with `&t=` worked, and I used that for the scan of `XkDvacBC7zA`.
  - The other required video, `bkmKuEguTH8` (official campus tour, 15:38), was **not scanned frame by frame**. Its description does not name Ram or Budh.
  - Google Maps and Google Earth were **not accessed**.

**Hand-offs:**
- `messes`:
  - The Ram-Budh mess (x −120…−74, z 195…234) sits between the two Bhawans. In the aerial it is a single-storey flat-roofed block with an irregular outline [visual estimate].
  - SWD lists a dining hall of 400 seats on both the Ram and Budh pages [verified].
  - Ram Redi (−121, 187) and Budh Redi (−112, 256) are kiosks at the Bhawan corners.
- `sac`: the blue-roofed hall west of Budh in the drone view is the SAC [visual estimate]. Its roof is covered in PV [visual estimate].
- `hostels-newer`: Malviya-A west of Ram. In the drone view it is a sawtooth or comb block with PV on every finger [visual estimate].
- `nab` / New Academic Block: Ram Stairs and Budh Stairs (OSM steps) link these hostels east to the NAB lawns. The unnamed 20 × 38 m block at (−57, 210) needs an owner.
- Orchestrator: decide Budh Bhawan's open or closed status (see A).
