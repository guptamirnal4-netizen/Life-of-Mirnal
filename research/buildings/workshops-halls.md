# Workshops, labs and halls: research report

Agent: `workshops-halls`. Area: BITS Workshop (old Central Workshop), New BITS Workshop, Rakesh Kapoor Innovation Centre (RKIC), Rakesh Verma Convention Centre (RVCC), VFAST, Srinivas Ramanujan Bhawan, and the Lecture Theatre Complex (LTC).

Coordinates follow [../COORDINATES.md](../COORDINATES.md): metres, x east, z south, origin at the Rotunda.

Tags:

- **[verified]:** seen directly in a source listed in section G.
- **[visual estimate]:** measured or judged from imagery. Positions from the Esri z18 mosaic (about 1.9 px per metre) are good to about ±5 m.
- **[approximation]:** a layout proposed for the game. It has not been observed.
- **[unknown]:** not established.

All captures are in `SCR = /private/tmp/claude-501/-Users-mirnal-Documents-Whisperflow/58e9866d-f336-43fa-bce9-096a63ba2c16/scratchpad/research/workshops-halls/`. They are reference only and must stay out of the repo.

---

## Summary (read this first)

1. **BITS Workshop (old)** is a single-storey industrial shed with a **north-light (sawtooth) roof**. It has about 5 parallel saw-teeth, red-painted steel trusses, a continuous clerestory glazing strip on each tooth, blue-grey painted walls and a stone-flag floor [verified: CRISS Robotics panorama; satellite]. The game shows it as a 13 m windowed block with PV panels, which is wrong in shape, height and roof.
2. **New BITS Workshop** is very likely the building the tour calls **"Central Workshop"**: white and ochre-orange cladding with a "CENTRAL WORKSHOP" sign over the entrance [verified, exterior panorama]. Inside are tall machine halls with red steel trusses, a mezzanine gallery with black railings, lathes and milling machines on yellow-lined concrete floors, and glazed partition rooms [verified, "Central Workshop 1/2"]. The identification with the OSM footprint is an [approximation].
3. **Rakesh Kapoor Innovation Centre** has 3 levels and 50,000 sq ft [verified, official news]. It is built around an **open central courtyard**: grey round columns, an orange timber-slat soffit, galleries with steel railings on the upper floors, and a stair visible off the courtyard [verified: "RK - Foyer"]. The outside is ochre and cream with pilasters and dark-framed windows [verified: "RK Innovation Centre"]. The OSM footprint has **no courtyard hole**, while the satellite shows one [visual estimate].
4. **Rakesh Verma Convention Centre** is a project with two parts: a G+5 guest-room block (100 rooms, 6 suites) and a G+2 convention block (dining hall, multipurpose hall, conference hall) [verified, IPD page]. The foundation stone has been laid [verified, news headline]. Satellite imagery of the OSM footprint shows **bare ground or a construction site**, not a finished building [visual estimate; imagery date unknown].
5. **Srinivas Ramanujan Bhawan is a hostel**, with its own mess [verified, SWD page]. It is not a hall or workshop: **hand-off to `hostels-newer`**.
6. **The LTC is missing from OSM and from the game.** It is a pink and cream arcaded complex with semicircular arches around a large lawn. It has a raised circular stage, ramps with steel railings, and taller blocks behind the single-storey arcades [verified: "Lecture Theatre Complex"]. It sits at about **x 292…347, z -232…-136** [visual estimate]. The tour's 400-seater and 150-seater lecture theatres are probably inside it (see C/E).
7. **VFAST** (the guest house) is a long single-storey cream building with a red-brown parapet band, wrapped around a big lawn [verified: "VFAST Lawns"]. Its exact footprint next to the POI is a [visual estimate].

---

## 1. BITS Workshop (old Central Workshop)

### A. Identification

| Item | Value |
|---|---|
| Name | OSM "BITS Workshop". The tour shows its interior only as "CRISS Robotics" [verified]. The fd1 report calls it the old Central Workshop [approximation]. |
| Category | Engineering workshop (machine shop), which now also hosts the CRISS Robotics club [verified, panorama: CRISS banner "Welcome"]. |
| OSM footprint | 12-point polygon, roughly x 195…279, z -51…7; `kind: academic`, `h: 13`. It is rotated about **9° clockwise from the axes**: the long north edge runs (196,-39)→(273,-51). |
| Satellite | The roof shows **about 5 parallel saw-teeth** across about x 202…276, z -42…0 [visual estimate]. The OSM north edge reaches into the FD-I box (FD-I goes to z -40), but the roof begins at about z -42, with a treed gap before FD-I [visual estimate; agrees with the fd1 report]. |
| Nearby | FD-I to the north, Vishwakarma Bhawan to the south (z 29+), M Lawns and Main Building East Wing to the west. POI "CRISS Robotics" (250, -39) [verified OSM]. |

### B. Exterior

- **Floors and height:** one tall storey [verified, interior]. Walls about 5–6 m high, with the sawtooth crests at about 8–9 m [visual estimate]. The OSM `h: 13` is too high [visual estimate].
- **Roof:** north-light sawtooth. Each tooth is a sloped sheet roof plus a near-vertical glazed strip of small-pane steel windows [verified, interior]. Which way the glazing faces (probably north) is [unknown]. Some teeth may carry PV; this is not seen.
- **Walls:** inside they are painted pale blue-grey over plaster [verified]. The exterior colour is [unknown]; it was not seen in any capture.
- **Windows:** tall steel-framed windows with a small-pane grid along the walls at about 1 m sill height [verified, interior].
- **Doors:** a timber-panel door and a red-painted door are visible inside [verified]. The external entrances are [unknown].

### C. Floor layout

One open machine hall with some internal walled bays. The CRISS panorama shows a long hall that continues several bays, plus a central walled block (about 4 m high, with windows) that is open above to the trusses [verified].

```
 N (approx, rotated 9°)
 +------------------------------------------------------------+
 | ////  ////  ////  ////  ////   sawtooth bays (~5)          |
 |   machine bays (engines, lathes, benches)                  |
 |        +---------------+                                   |
 |        | walled block  |  <- interior partition, open top   |
 |        +---------------+                                   |
 |   CRISS Robotics area (tables, engines)                     |
 +------------------------------------------------------------+
 [approximation: positions of bays and the block are not measured]
```

### D. Staircases

None seen, and there is probably no upper floor [visual estimate]. The game needs no stairs here [approximation].

### E. Interior [verified, CRISS Robotics panorama]

- **Floor:** grey stone flags.
- **Walls:** pale blue-grey, with exposed black conduit and a dado.
- **Lighting:** fluorescent tube fittings on long drop rods.
- **Furniture:** old green diesel or stationary engines on plinths, timber benches and stools, display boards, a blackboard, an electrical panel with gauges, and an air compressor tank.

### F. Gameplay

- **Should it be enterable?** Optional. It would make a good "workshop" mission space [approximation].
- **Entry:** a door on the west or south face, facing M Lawns and the road, at about (200, -15) [approximation].
- **Collision:** the outer walls only, plus 6–10 machine boxes about 1.5 × 1 × 1.5 m [approximation].
- **NPCs:** students working at benches.

---

## 2. New BITS Workshop (probably the new "Central Workshop")

### A. Identification

- **OSM footprint:** a 4-point quadrilateral (37,-188), (44,-148), (104,-157), (97,-198), about 66 × 50 m. It is rotated about 8° and has `h: 6.6`.
- **Satellite:** a white roof with rows of PV and some lower wings [visual estimate]. A second building just north of it (about x 31…99, z -235…-200) is not named in OSM [unknown use].
- **Which building is it?** Calling this the tour's "Central Workshop" is an [approximation]. The tour gives no location. The exterior panorama shows a modern white block with ochre-orange cladding, plus a second white block with a full-width glazed clerestory band. Both are set on lawns with an avenue of Ashoka trees and a paved drive [verified].

### B. Exterior [verified, "Central Workshop" panorama]

- **Entrance block:** a white upper volume over a recessed glazed entrance, with an ochre-orange frame and the sign "CENTRAL WORKSHOP".
- **Second block:** white render with an ochre base and a horizontal glazed band near the top.
- **Height:** roughly two storeys, about 8–10 m [visual estimate]. This is higher than the OSM `h: 6.6`.
- **Approach:** a paved herringbone drive flanked by ochre low walls, Ashoka trees and a lawn.

### C, D. Layout and stairs

- **Halls:** tall, with a **mezzanine gallery** along at least one side, carried on concrete walls and fitted with black steel railings [verified, "Central Workshop 1"].
- **Stairs:** a staircase to the mezzanine is implied but **not seen** [unknown]. For the game, put one straight flight along a side wall up to the mezzanine at about 4 m, 1.2 m wide [approximation].

### E. Interior [verified, "Central Workshop 1" and "2"]

- **Structure and walls:** red-painted steel roof trusses, cream-white walls and pendant high-bay lights.
- **Floor:** grey polished concrete with yellow safety lines marking the machine aisles.
- **Machines:** green lathes, blue and green milling and drilling machines, timber workbenches, grey steel perforated tool-board benches and a drafting table area.
- **Rooms and doors:** aluminium and glass partition rooms, red doors and green fire-door frames.
- **Mechanical Engineering Lab** (building **not stated**): blue vinyl floor, CNC lathes (one reads "NLX 2000"), CNC machining centres and timber drafting tables [verified]. It might be in this building [unknown].

---

## 3. Rakesh Kapoor Innovation Centre (RKIC)

### A. Identification

- **OSM footprint:** a 16-point stepped outline, about x 30…71, z -308…-261 (41 × 46 m), `h: 9.9`, with no holes.
- **Satellite:** a square block with a **central open courtyard** [visual estimate].
- **Official facts:** a "3-level, 50,000 sq. ft." building, inaugurated 8 Oct 2023, with "100 co-working seats" [verified, official news].
  - Named spaces [verified]: AI, API, AR/VR, CG-CV, Fin-Tech, IoT Tinkering and UI/UX labs; a Maker Space; the Vinati Organics mini-conference room; the Hari Menon and Prem Talreja conference rooms; and co-working zones.
  - The Technology Enabling Centre is on the "2nd Floor" [verified, search snippet].
- **Nearby:** POI "Pilani Innovation & Entrepreneurship Development Society" (59, -278) is inside the footprint [verified OSM]. Srinivas Ramanujan Bhawan POI (-20, -266) is about 50 m west.

### B. Exterior [verified, "RK Innovation Centre" panorama]

- **Walls:** ochre or yellow render with full-height cream pilasters and a dark grey plinth.
- **Windows and shading:** dark-framed casement windows with cream sunshade hoods.
- **Entrance:** a cream gateway portico with a red frame and the red sign "RAKESH KAPOOR INNOVATION CENTRE", opening into a passage.
- **Name wall:** a freestanding grey stone-clad wall carries the name, with a curved stone plinth in front.
- **Paving and planting:** herringbone pavers in grey with maroon chevron and rectangle patterns, round planting beds, and street lamps on tall grey poles.
- **Height:** 3 storeys, about 11–12 m [visual estimate]. The OSM `h: 9.9` is a little low.

### C. Layout

Around the courtyard [verified, "RK - Foyer" panorama]:

- **Ground floor:** an arcade of grey round columns about 0.5 m across. The courtyard is 3 steps below the arcade, in grey stone, and paved with granite setts in curving bands with lawn strips, a circular motif and bollard lights.
- **Upper floors:** galleries with steel railings that step in and out around the courtyard.
- **Soffits:** under the galleries is an orange timber-slat ceiling.
- **Doors and stairs:** doors, a lift and a stair open off the ground arcade.

```
 +--------------------------------------+
 |  labs / offices  (3 levels)          |
 |   +--------------------------+       |
 |   | arcade (grey columns)    |       |
 |   |   +------------------+   |       |
 |   |   | sunken courtyard |   |  stair|
 |   |   |  setts + lawn    |   |  /lift|
 |   |   +------------------+   |       |
 |   +--------------------------+       |
 | entrance portico (red frame)         |
 +--------------------------------------+
 [approximation: proportions; the side the entrance is on is unknown]
```

### D. Staircases

- **Seen:** one straight stair with a steel handrail, in a white stair hall off the arcade. It is about 1.5 m wide, with a landing turning back up [verified, "RK - Foyer"].
- **Count and other positions:** [unknown]. Assume 2 stairs at opposite corners for fire egress [approximation].

### E. Interior [verified, the RK panoramas listed in G]

- **Arcade:** cream walls, grey stone floor, red fire-hose cabinets and dark signboards.
- **Labs:** modern furniture. The AR/VR, IoT, reception and co-working panoramas were captured but only skimmed [visual estimate].

---

## 4. Rakesh Verma Convention Centre (RVCC)

- **OSM footprint:** an irregular 12-point outline, about x 403…443, z 313…353, `kind: hall`, `h: 14`.
- **Official description:** the "Pilani Convention Project" has two parts [verified, IPD page]:
  - a Guest Room Block (G+5): 100 executive rooms, 6 suites and 1 accessible room;
  - a Convention Block (G+2): dining hall, multipurpose hall and conference hall.
  - Press reports add a 200-seat "MapmyIndia Conference Hall" [verified only via the search summary; not opened].
- **Status:** a Bhoomi Poojan and stone-laying ceremony was reported [verified, headline only]. Esri imagery of the footprint shows **bare earth and possibly foundations**, not a roofed building [visual estimate; imagery date unknown]. Completion is [unknown].
- **Exterior, interior and stairs:** [unknown]. There are no panoramas or photos.
- **Game advice:** keep it out, or show it as a construction site with a boundary fence [approximation]. Don't build a finished 14 m hall from guesswork.

---

## 5. VFAST (guest house)

- **POI:** (468, 324) [verified OSM]. The tour has an album "VFAST" with four panoramas (Dining Hall, Guest House, Lawns, Room) and a "VFAST-Placement-Gate Connecting" panorama, which places it near the Main Gate (582, 267) [verified labels].
- **Satellite:** about 40 m east of the POI is a long white single-storey L or U-shaped building wrapped around a big lawn, at about **x 507…549, z 300…342** [visual estimate]. This matches the "VFAST Lawns" panorama. Directly beside the POI is a brown-roofed building at about x 452…483, z 303…326 [unknown use]. There is **no OSM footprint** for VFAST.
- **Exterior** [verified, "VFAST Lawns"]:
  - long single-storey cream buildings with a red-brown band at the parapet;
  - square windows and paired doors at intervals;
  - a short two-storey section at each end;
  - flowering shrubs, Ashoka trees and a large lawn.
- **Interior** [verified]:
  - **Guest House lobby:** yellow walls, a grey and white diamond-pattern stone floor, wooden sofas, a timber reception counter, a timber-handrail stair under an arch to the first floor, and a long corridor with steps.
  - **Dining Hall:** white walls, a grid ceiling, grey diamond-tile floor, rows of timber tables and chairs, a servery hatch and a buffet table.

---

## 6. Srinivas Ramanujan Bhawan

- **What it is:** a hostel, with a mess of one dining hall for 400 [verified, SWD page]. Wikipedia lists it among the boys' hostels [verified only via the search summary].
- **POI:** (-20, -266). There is no OSM footprint.
- **Hand-off:** to `hostels-newer` and `messes`. Nothing further was researched.

---

## 7. Lecture Theatre Complex (LTC)

### A. Identification

- **OSM:** not mapped.
- **Satellite:** a building at about **x 292…347, z -232…-136**, east of the BITS Library and north-east of FD-I [visual estimate; agrees with the fd1 report]. It has a courtyard and a circular feature, with sloped roof strips on its west side that probably cover raked theatres [visual estimate].

### B. Exterior [verified, "Lecture Theatre Complex" panorama]

- **Arcades:** single-storey arcades of **semicircular arches** on square piers face a large lawn on several sides.
- **Colours:** pink-cream walls. Pink horizontal rustication bands meet the arches in radiating pink voussoir lines, and there is a pink dado.
- **Courtyard features:** a raised circular stage in the lawn, edged with flowering shrubs. Ramps and short stairs with steel railings lead up to the arcades.
- **Behind the arcades:** taller two-storey blocks with pink bands and roof water tanks, and a telecom mast.

### C. Halls

- **400 Seater Lecture Theatre** [verified, panorama]:
  - curved, stepped timber bench desks in concentric rows with two side aisles;
  - a raised front stage with a large timber lecture table and a separate lectern;
  - two green chalkboards with a projector screen between them, and a red LED clock above;
  - a pair of double doors at front left and front right;
  - a stepped white grid ceiling with ceiling fans;
  - a grey-green stone tile floor and windows high on the side walls.
- **150 Seater Lecture Theatre** [verified, panorama]: the same pattern at a smaller size, with a crested lectern.
- **80 Seater Classroom** [verified]:
  - a timber platform stage;
  - individual timber desk-benches;
  - a chalkboard and projector screen in timber surrounds;
  - roller blinds and a sloped ceiling.

  Its building is not stated [unknown].
- **Are these halls in the LTC?** The tour does not say which building holds the 400 and 150-seat theatres. Placing them in the LTC is an [approximation]. The 120-seater is labelled "NAB" in the tour [verified].

### D. Staircases

- **Seen:** short external stairs and ramps with steel railings at the arcade edges [verified].
- **Inside the theatres:** stepped aisles with a riser of about 0.15–0.2 m per row [visual estimate].
- **Stairs to upper floors:** [unknown].

### F. Gameplay

- **Lecture Theatre host:** the LTC is the natural host for a big lecture theatre. The `classroom` room currently lives in NAB. Moving it is the orchestrator's or `nab`'s decision (hand-off).
- **Raked seating:** use stepped walkable boxes about 0.18 m high (inside the player's 0.7 m step-up).

---

## G. Sources

The tour base is https://www.bits-pilani.ac.in/Pilani-Campus-Virtual-tour/index.htm. Panorama tiles came from `media/<id>_0/{f,r,b,l}/2/{r}_{c}.jpg` and were stitched with ffmpeg. Labels were read from the tour's `locale/en.txt` (copy at `scratchpad/research/hostels-krishna-gandhi/tour-en.txt`).

| Source | Panorama or URL | What it shows / confirms | Local file |
|---|---|---|---|
| Tour "CRISS Robotics" | panorama_BD65A009_B184_7219_41E5_6F8AC6152441 | Sawtooth trusses, clerestory, blue-grey walls, stone floor, engines | `SCR/pano/criss-strip.jpg` |
| Tour "Central Workshop" | panorama_D03C3643_C029_EB7F_41CF_A59D91A88A72 | Exterior, signage, white and ochre blocks | `SCR/pano/cw-strip.jpg` |
| Tour "Central Workshop 1" | panorama_BD5318D0_B18C_727F_41E4_AB63DCEF5509 | Mezzanine, lathes, yellow lines | `SCR/pano/cw1-strip.jpg` |
| Tour "Central Workshop 2" | panorama_BD47518A_B18C_92E3_4184_BD6A6C6987E6 | Machine hall, benches | `SCR/pano/cw2-strip.jpg` |
| Tour "Mechanical Engineering Lab" | panorama_BD10E3E5_B18D_964E_41B4_7E955E01EDEA | CNC lab (building not stated) | `SCR/pano/mechlab-strip.jpg` |
| Tour "3D Printing Lab" | panorama_BD102CA3_B18C_72CA_412C_195A6FDCBC10 | Captured, not analysed | `SCR/pano/print3d-strip.jpg` |
| Tour "Innovation Hub" | panorama_BD6346DA_B184_BFDB_41DF_008576A7B750 | A BET-TATC "Innovation Hub" sign; **not** RKIC [unknown location] | `SCR/pano/innovhub-strip.jpg` |
| Tour "RK Innovation Centre" | panorama_BD62560F_B183_9E33_41E0_4CB5150A383E | Exterior, portico, sign, paving | `SCR/pano/rk-strip.jpg` |
| Tour "RK - Foyer" | panorama_C5E03069_D9A6_D039_41C2_87F6A3033E7F | Courtyard, columns, galleries, stair | `SCR/pano/rk-foyer-strip.jpg` |
| Tour RK Reception, AR&VR, IoT, Coworking | BD62070F…, EF6017F5…, BD638025…, BD623790… | Interiors (skimmed) | `SCR/pano/rk-*-strip.jpg` |
| Tour "Lecture Theatre Complex" | panorama_D25383E3_CFD7_3E83_41D4_3F9F42999D53 | Arcades, lawn, stage, colours | `SCR/pano/ltc-strip.jpg` |
| Tour "400 Seater Lecture Theatre" | panorama_BDCF87C5_B185_9E8F_41E4_2050261059DF | Raked benches, stage, boards | `SCR/pano/lt400-strip.jpg` |
| Tour "150 Seater Lecture Theatre" | panorama_D16A18F4_C029_6719_41C1_D1BDB03A2FDA | Same | `SCR/pano/lt150-strip.jpg` |
| Tour "80 Seater Classroom" | panorama_D059123D_C02B_2B0A_41E4_A64E2ABC0A8C | Classroom (building not stated) | `SCR/pano/cr80-strip.jpg` |
| Tour "VFAST Lawns", "Guest House", "Dining Hall", "Room" | 32C242DE…, BD62E7CD…, BD62C00F…, BD62BEFF… | VFAST exterior and interiors | `SCR/pano/vfast-*-strip.jpg` |
| Tour "Drone Day View" | panorama_BB0577EA_FC5E_3691_41E2_80F846AEBA0C | Campus aerial (my buildings not resolvable at L2) | `SCR/pano/drone-day-strip.jpg` |
| Esri World Imagery z18 | server.arcgisonline.com …/tile/18/{y}/{x}, x 186112–186116, y 109516–109521 | Footprints, sawtooth, RKIC courtyard, RVCC site, LTC, VFAST | `SCR/sat/esri-z18.jpg`, `SCR/sat/esri-z18-overlay.jpg` (OSM boxes red, 50 m grid cyan), crops `north/east/ws/se/vfast.jpg` |
| BITS news: RKIC launch | https://www.bits-pilani.ac.in/bits-pilani-launches-rakesh-kapoor-innovation-centre-for-boosting-campus-entrepreneurship/ | 3 levels, 50,000 sq ft, labs list, date | (text) |
| BITS IPD: Pilani Convention Center | https://www.bits-pilani.ac.in/pilani/infrastructure-and-planning-division/ipd-pilani-convention-center/ | G+5 guest block, G+2 convention block | (text) |
| SWD: SR Bhawan | https://swd.bits-pilani.ac.in/sr-bhawan.aspx | A hostel with a 400-seat mess | (text) |
| Game today | http://localhost:8080/?explore | Current rendering | `SCR/game-*.png` |

**Not accessed:** the YouTube tours (no frames were extracted for this area), Google Maps and Earth, Wikimedia Commons, and the RVCC news pages beyond the search-result titles.

## H. Comparison with the game today

What the game does now (`SCR/game-*.png`): every building in this area is an extruded white block with window rows. The Workshop and RKIC have PV roofs. RVCC is a 4-storey white block. VFAST and SR Bhawan are bare POIs. The LTC does not exist.

| Building | Matches | Wrong |
|---|---|---|
| BITS Workshop | Footprint position | Should be a one-storey sawtooth shed about 6–9 m high, not a 13 m windowed block. The north edge overlaps FD-I. |
| New BITS Workshop | Position | Height should be about 8–10 m. It needs the white and ochre facade and the entrance sign. |
| RKIC | Position, rough outline | Missing the courtyard hole. The colour should be ochre and cream with pilasters, not white. It needs the red-framed portico, and should be 3 storeys at about 11–12 m. |
| RVCC | Footprint | It is shown as a finished block; the imagery suggests a site under construction. |
| LTC | — | Missing entirely. |
| VFAST | POI | No building at all. |

**Ranked fixes (most visible first):**

1. Add the LTC: pink-cream arcades around a lawn with a circular stage, at about x 292…347, z -232…-136.
2. Rebuild BITS Workshop as a low sawtooth shed, and pull its north edge back to about z -42.
3. Give RKIC an ochre facade, an open courtyard and its red portico sign.
4. Add the VFAST guest house: a single-storey cream U around a lawn, at about x 507…549, z 300…342.
5. Show RVCC as a fenced construction site, or leave it out.
6. Give the New Workshop its white and ochre facade with the "CENTRAL WORKSHOP" sign.

## I. Uncertainties and hand-offs

**Uncertain:**

- Which way the sawtooth glazing faces, and the Workshop's exterior colour.
- Whether New BITS Workshop is the "Central Workshop".
- Which building holds the 400 and 150-seat theatres and the 80-seat classroom.
- Whether RVCC is finished.
- VFAST's exact footprint.
- The use of the unnamed block north of New BITS Workshop.
- The RKIC stair count.

**Hand-offs:**

- **`hostels-newer` / `messes`:** Srinivas Ramanujan Bhawan is a hostel with its own mess.
- **`nab` / orchestrator:** the LTC is a better real host for a large lecture theatre than NAB. Changing the room's host is your call.
- **`fd1`:** confirms the overlap between the Workshop and FD-I.
- **`gates-landmarks`:** VFAST is close to the Main Gate ("VFAST-Placement-Gate Connecting" panorama).
- **`landscape-water`:** add the LTC lawn, the VFAST lawn and the RKIC courtyard.
