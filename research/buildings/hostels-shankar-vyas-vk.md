# Shankar, Vyas and Vishwakarma Bhawans: research report

Agent `hostels-shankar-vyas-vk`. Research only; no game code was changed. All captures are outside the repo in
`/private/tmp/claude-501/-Users-mirnal-Documents-Whisperflow/58e9866d-f336-43fa-bce9-096a63ba2c16/scratchpad/research/hostels-shankar-vyas-vk/`, written `$R/` below.

Tags: **[verified]** means seen directly in a cited source or read from the data. **[visual estimate]** means judged or measured by eye from imagery. **[approximation]** means a proposal for the game, not evidence. **[unknown]** means no evidence was found.

Main sources: the official 3DVista virtual tour (the **Drone Day View** and **Drone Night View** panoramas, which carry hotspot labels "Shankar Bhawan", "Vyas Bhawan" and "Vishvakarma Bhavan"), Esri World Imagery at zoom 18 with a 10 m grid in game coordinates, the SWD Bhawan pages, `data/bits-campus.js` and `js/world/hostel.js`.

---

## Key findings (summary)

1. **All three Bhawans have two courtyards with a cross wing (a 日 plan) and two storeys, plus open square roof pavilions.** Only Shankar has two holes in OSM. Vyas and Vishwakarma each have one hole in OSM, so the game builds them with a single courtyard and no middle wing **[verified: Esri imagery + drone panorama]**.
2. **The OSM outline of Vyas Bhawan is wrong.** The real building runs from about z 516–529 (north edge) to z 611–624 (south edge), about 57 × 97 m, the same size as Shankar. OSM stops at z 553 and leaves out the whole northern courtyard and the north wing (about 35 m) **[visual estimate, Esri + drone]**.
3. **The game puts the Shankar and Vyas entrances on the wrong side.** `entranceOrder()` picks the east face, the side nearer a road. The drone panorama shows Shankar's main entrance in the **middle of the west face**, on the cross-wing axis and facing Krishna Marg. It has a raised central block, an arched doorway, a paved red forecourt with a planter, steps and a ramp **[verified, drone panorama zoom]**. Vyas and Vishwakarma show the same square block on the west face at the cross wing **[visual estimate]**.
4. **The look is wrong in the game.** The game has a plain white box with two rows of identical rectangular windows and solar panels over the whole roof. The real buildings have:
   - cream walls with thin maroon or terracotta bands;
   - **round-arched ground-floor openings filled with jaali (lattice) screens** on the outer faces, with a row of small rectangular windows above;
   - **salmon-pink plaster** on the courtyard faces;
   - **two-storey arcades** on some courtyard faces;
   - about **six open square roof pavilions** (stair heads and water-tank enclosures, with pierced screens).

   Solar panels cover only parts of the roofs (sparse on Shankar, denser rows on VK) **[verified, drone]**.
5. **Wings are deeper than the game's.** Imagery shows wings about 11–14 m deep. The game's `WD` is 7.85 m **[visual estimate]**.
6. **Vishwakarma's east wing is joined to Rana Pratap Bhawan.** VK and RP form one connected block: RP's north and south wings run east from VK's NE and SE corners. OSM VK (x 203–277) and RP (x 266–349) overlap by about 11 m **[verified, imagery + data]**. Hand-off to `hostels-newer`.
7. **The courtyards are gardens, not bare concrete.** They have lawn, large trees (one with a round platform), shrubs, a small football goal and **one concrete court per Bhawan** (in Shankar it is next to the west wing, in the north courtyard). At night the courtyards are floodlit **[verified, drone day + night]**. The game paints them as bare concrete with cricket and football markings.

---

## 1. Shankar Bhawan

### A. Identification

| Item | Value |
|---|---|
| Official name | Shankar Bhawan, a boys' hostel on the Pilani campus (SWD page) **[verified]**. The tour hotspot label is "Shankar Bhawan" **[verified]** |
| Category | Residential hostel (Bhawan) for male students. SWD lists rooms with cot, table, chair and wardrobe; shared washrooms (about 1 bathroom per 4 students); a common room with TV, table tennis and carrom; badminton courts; 24 h guards; and a dining hall for 400 (the shared Shankar–Vyas mess) **[verified, SWD page; the list is generic and the same on every Bhawan page]** |
| OSM name / kind / h | `Shankar Bhawan`, `hostel`, `h = 11`, `traced: true` |
| OSM outer ring (game x,z) | (144.7,352.1) NW → (201.5,344.7) NE → (218.4,446.0) SE → (162.1,454.5) SW |
| OSM holes | North court (160.2,363.1) (197.1,358.7) (201.5,388.9) (164.6,393.3). South court (166.9,402.9) (203.7,398.5) (208.9,436.8) (172.0,441.2) |
| Edges | N 57.3 m, E 102.7 m, S 56.9 m, W 103.9 m. Rotated about -7.4° (north edge) and 80.5° (long edges), so the long axis runs about 9–10° east of south **[verified from data]** |
| Neighbours | North: Gandhi Marg and Gandhi Bhawan; the Amul Parlour POI (237,382) and All Night Canteen POI (233,343) are NE. East: a service road at about x 229–237, then courts and a pitched-roof shed, then the Gymkhana track. South: Shankar Vyas Mess (x 187–231, z 460–499) and NSS (x 158–177, z 466–498). West: Krishna Marg at about x 127–142 **[verified data; neighbours visual estimate from drone]** |
| Orientation | Long axis about N–S. Main entrance on the **west** face **[verified, drone]** |

### B. Exterior

| Aspect | Finding |
|---|---|
| Floors | **2** (ground and first), plus roof pavilions **[verified, drone day view]** |
| Height | No measurement found. Parapet top is about 9–10 m by eye. Roof pavilions add about 3 m **[visual estimate]**. OSM `h` is 11 |
| Footprint | Esri shows the same 日 outline as OSM, about 57 × 98–104 m. The imagery sits about +5 m east of OSM, which is a consistent offset and probably registration **[visual estimate]**. **OSM is good here; don't move it** |
| Wing depth | West about 14 m, north about 11.5 m, cross about 11.6 m, south about 11.5 m, east about 10.5 m **[visual estimate, Esri z18, ±1.5 m]** |
| Cross wing | Runs E–W at about z 392–407 (imagery), between the two courtyards. A square block at its west end forms the entrance **[visual estimate]** |
| Roof | Flat, light grey, with raised parapets that step at wing junctions. A few PV arrays sit on the cross and north wings **[verified, drone]**. About **six square roof pavilions**: open-topped, with a pierced screen in each face and inner partitions holding black water tanks **[verified, drone zoom `$R/tour-dayview-shankar-north.jpg`]**. They stand at or near the wing junctions **[visual estimate; exact positions approximation]** |
| Colours | Outer walls cream / off-white with a thin maroon line under the parapet. Courtyard walls are salmon-pink plaster. Trim is cream **[verified, drone]** |
| Outer face (west) | Ground floor: a regular row of **round-headed arched openings filled with jaali / grille screens**. First floor: a continuous row of small rectangular windows above a moulded band. At night the ground-floor arches glow evenly, so a lit corridor or verandah is probably behind them **[day: verified; corridor: visual estimate from the night view]** |
| Entrance | In the middle of the west face. It is a slightly projecting block that stands taller than the wing, with an arched doorway and a second arched opening, and large windows above. In front are a paved red forecourt with a planter, steps and a side ramp, with a sign or banner beside it **[verified, `$R/tour-dayview-shankar-entrance.jpg`]** |
| Courtyard faces | North face of the cross wing: **two-storey arcade** (round arches on the ground floor, openings with railings above). East-wing and north-wing faces: pink walls with two rows of small windows (rooms facing the courtyard) **[verified, drone zoom]** |
| Courtyards | **North:** lawn, a large tree with a round platform, shrubs along the arcade, a small football goal, and a **concrete court with line markings** (volleyball or badminton) against the west wing **[verified]**. **South:** trees and lawn with a bare patch **[verified, drone + Esri]** |
| Lighting | At night: floodlights on poles or walls light both courtyards, the ground-floor arches on the west face are lit, and the arcade is lit **[verified, `$R/tour-nightview-shankar.jpg`]** |
| Landscaping | Dense tree belts on all sides, with tree-lined roads on the west and east **[verified]** |

### C. Floor layout (ground and first floor; approximation)

No floor plan, room list or room count was found **[unknown]**. Plan below from imagery (west at the bottom, north to the left as in the drone view; drawn N-up here):

```
                 N  (z≈345)
   +-------------------------------------+
   |  north wing (rooms → courtyard)  [P]|
   | +---------------------------------+ |
   | |  NORTH COURTYARD                | |
 W | |  lawn, tree+platform, goal      | | E
 i | | [concrete court]                | | a
 n | +=====arcade======================+ | s
 g |[P]  CROSS WING (rooms, arcade N) [P]| t
   | +---------------------------------+ |
ENT|>|  SOUTH COURTYARD (trees, lawn)  | | w
(x≈153,z≈400) |                        | | i
   | +---------------------------------+ | n
   |[P]  south wing                   [P]| g
   +-------------------------------------+
                 S  (z≈455)       [P] = roof pavilion (stair head + tanks), approx.
```

- Corridor side per wing: the cross wing has its corridor on the north (courtyard) side **[verified, arcade]**. The north and east wings show rooms on the courtyard face **[verified]**, so their corridors are probably on the outer side **[visual estimate]**. The west wing has jaali arches on the outer face and probably a corridor behind them **[visual estimate]**.
- First floor: same plan as the ground floor **[approximation]**.

### D. Staircases

Not seen from inside **[unknown]**. The roof pavilions are stair heads and water-tank housings, and stairs are probably under them. Proposal **[approximation]**:
- Six dog-leg stairs (two flights of 8 risers and a half landing at FH/2), one under each pavilion: the four corners plus the two ends of the cross wing.
- The main stair is next to the entrance lobby at the west end of the cross wing.
- Each is about 3.4 m wide, opens onto the corridor and has a steel handrail. The game's `space_stair` module fits.

### E. Interior

No Shankar-specific interior imagery was found **[unknown]**. Generic Pilani hostel-room panoramas from the official tour ("Hostel - Double Occupancy" and "Hostel - Single Occupancy"; Bhawan not named) show the following **[verified, Bhawan unknown]**:
- white walls and a grey stone (Kota-type) floor;
- tan flush wooden doors with a hook rail, and grey steel almirahs (free-standing in the double room, built in as a double-leaf cupboard in the single room);
- wooden desks with drawers, wall shelves, and plastic chairs with steel legs;
- sliding or casement windows with grey frames, and tube lights.

Room numbers are **[unknown]**.

### F. Gameplay (approximation)

- **Entrance:**
  - Move it to the west face: outside about (149, 400.5), inside about (156, 399.5), facing east.
  - Porch and forecourt about 8 × 10 m, paved red, with a planter.
- **Exits:** add a secondary door at the east end of the cross wing (imagery shows a block there) for the courts and the Gymkhana.
- **Collision:** keep the OSM outline and holes. Make wings about 11–12 m deep, which gives room bands of about 4.2–4.5 m plus a corridor of about 2.8–3 m, plus thicker walls or a verandah on the jaali face.
- **Stairs:** use the six pavilion positions above, and put the main stair next to the lobby (and roof access) at the west end of the cross wing.
- **Enterable rooms:** a double room, a single room, the common room, a washroom block and the lobby, as the module already does. Everything else stays locked.
- **NPC walk areas:** the corridors, the arcade, both courtyard lawns, and the concrete court (volleyball or badminton) in the north courtyard.
- **Camera:** clamp inside the courtyards. The roof is walkable inside the parapets.
- **Gameplay rooms:** none of the `ROOM_HOSTS` rooms is in this building. The shared mess belongs to `messes`.

---

## 2. Vyas Bhawan

### A. Identification

| Item | Value |
|---|---|
| Official name | Vyas Bhawan, a boys' hostel on the Pilani campus (SWD page) **[verified]**. The tour hotspot label is "Vyas Bhawan" **[verified]** |
| OSM name / kind / h | `Vyas Bhawan`, `hostel`, `h = 11`, `traced: true` |
| OSM outer ring | (180.5,554.9) → (237.6,553.0) → (245.7,620.5) → (187.9,622.7). One hole: (196.3,569.6) (231.0,568.1) (233.9,606.5) (200.7,608.7) |
| OSM size | 57 × 68 m, rotated -1.9° (north edge) **[verified from data]** |
| **Real outline (imagery, x shifted -5 m to match the Shankar registration)** | NW about (171,529), NE about (227,516), SE about (245.5,611), SW about (184.5,624). That is about **57 × 97 m**, rotated about -12°. Cross wing at about z 563–579 (west end). North courtyard about z 529–563, south courtyard about z 579–608 **[visual estimate, ±5 m, `$R/esri/area-south.jpg`, `$R/esri/vyas.jpg`]** |
| Neighbours | North: Shankar Vyas Mess (z ≤ 499, a gap of about 20–30 m). East: a service road at about x 254–262, then the Gymkhana track. South: a service road (172,638)–(265,626). West: a road at about x 163–169. SE: Med-C (305,638) **[data + imagery]** |

### B. Exterior

- **Floors:** 2, plus roof pavilions **[visual estimate, drone `$R/tour-dayview-vyas-zoom.jpg`]**.
- **Style:** the same as Shankar:
  - cream outer walls and salmon-pink courtyard faces;
  - a **cross wing with a two-storey arcade on its north face** (round arches on the ground floor, a colonnaded gallery above) **[verified, drone zoom]**;
  - about six square roof pavilions with pierced screens **[verified]**;
  - PV arrays in rows on several wing roofs **[verified]**.
- **Courtyards:** the north one has lawn and a large tree; the south one has lawn, trees and a bare sandy patch, probably a play court **[verified, Esri + drone]**.
- **Wing depth:** about 11–13 m **[visual estimate]**.
- **Entrance:** the drone angle hides it **[unknown]**. Imagery shows a square block on the west face at the cross-wing axis, about x 177–190 and z 565–579, which matches Shankar's entrance block **[visual estimate]**. Proposed entrance: west face at about (176, 571), facing west **[approximation]**.
- **Lighting:** floodlit courtyard, as at Shankar **[verified, `$R/tour-nightview-vyas.jpg`]**.

### C–E. Layout, stairs, interior

The layout should follow the Shankar plan, mirrored as needed **[approximation]**. Stairs are not seen; use the same six-pavilion proposal **[approximation]**. No interior imagery specific to Vyas **[unknown]**.

### F. Gameplay (approximation)

- **Footprint:** extend the footprint north to the imagery outline. Do not change OSM silently; flag it to the orchestrator first, because Vyas is the only Bhawan of the three where the data is clearly wrong.
- **Courtyards:** two holes plus a middle wing.
- **Entrance:** west face at about (176,571).
- **Clearance:** the north wing must keep at least about 15 m from the mess (z 499).

---

## 3. Vishwakarma Bhawan (VK)

### A. Identification

| Item | Value |
|---|---|
| Official name | Vishwakarma Bhawan ("VK"), a boys' hostel on the Pilani campus (SWD page `vk-bhawan.aspx`) **[verified]**. The tour hotspot is spelt "Vishvakarma Bhavan" **[verified]**. Hyderabad campus also has a Vishwakarma Bhawan; don't confuse the two |
| OSM name / kind / h | `Vishwakarma Bhawan`, `hostel`, `h = 11`, `traced: true` |
| OSM outer ring | (202.6,33.3) → (265.0,28.7) → (276.5,128.2) → (206.3,131.7). One hole: (215.5,45.5) (255.5,42.5) (264.5,114.8) (219.2,118.0) |
| OSM size | 63 × 100 m. North edge -4.2°, west edge about 2° **[verified from data]** |
| **Real outline (imagery, x -5 m)** | NW about (201.7,38.7), NE about (276,31.7), SE about (276,118), SW about (216.7,129.3). The west edge is rotated about 9° like its neighbours, against about 2° in OSM, so the SW corner is about 10 m east of OSM. Cross wing at about z 72–88. North courtyard about z 45–72, south courtyard about z 88–118 **[visual estimate, ±5 m, `$R/esri/vk.jpg`, `$R/esri/vk-rp.jpg`]** |
| Neighbours | East: **joined to Rana Pratap Bhawan**, whose north and south wings continue east from VK's NE and SE corners to about x 350. North: BITS Workshop (sawtooth roof). South: VKB mess (x 245–288, z 140–179). West: Bhagirath Marg at about x 175–185 **[verified data + imagery]** |

### B. Exterior

- **Floors:** 2 **[visual estimate, distant drone frames `$R/tour-dayview-vk-zoom.jpg`, low resolution]**.
- **Roof:** flat, with parapets. **Dense rows of PV panels** along the west and east wing roofs and the cross wing **[verified, Esri + drone]**. Square stair pavilions are visible on the cross wing and at the corners **[verified, drone]**.
- **Colours:** cream / off-white **[visual estimate]**.
- **Courtyards:** heavily treed, with bare sandy patches **[verified, Esri]**.
- **Wing depth:** about 11–14 m **[visual estimate]**.
- **Entrance:** a square block on the west face at the cross-wing axis (about x 208–221, z 77–90) **[visual estimate]**. Proposed entrance: about (208, 83), facing west **[approximation]**. The game entrance (202.2, 82.5) is within about 5 m of this, so it is acceptable.
- **Other evidence:** a 2010 student teaser video shows a white-walled corridor with square piers at VK (frame `$R/yt-vkteaser-0026.png`) **[visual estimate, low resolution]**. No other exterior close-ups were found.

### C–F

- **Layout and stairs:** the same 日 plan as Shankar **[approximation]**.
- **Interior:** **[unknown]**.
- **East wing:** it is the shared boundary with RP. Do not put an exterior entrance there, and the game must not leave a gap or double wall between VK and RP. Coordinate with `hostels-newer`.

---

## G. Sources

| Source | URL | What it shows (panorama / view / time) | Confirms | Local capture |
|---|---|---|---|---|
| BITS Pilani virtual tour, **Drone Day View** (`panorama_BB0577EA…`), level-0 cube tiles reprojected | https://www.bits-pilani.ac.in/Pilani-Campus-Virtual-tour/index.htm | Hotspots: Shankar yaw 125.8 / pitch -36.6; Vyas 158.7 / -16.1; Vishvakarma 46.3 / -16.7 | 2 storeys; 日 plans; roof pavilions; colours; arches and jaali; Shankar west entrance and forecourt; courtyards; neighbours | `$R/tour-dayview-shankar*.jpg`, `-vyas*.jpg`, `-vk*.jpg`, `-overview-d.jpg`, `-east-wide.jpg` |
| Same tour, **Drone Night View** (`panorama_BD69F782…`) | same | Shankar yaw 127.6 / -39.2; Vyas 158.8 / -18.7 | Floodlit courtyards, lit arches and arcade | `$R/tour-nightview-shankar.jpg`, `$R/tour-nightview-vyas.jpg` |
| Same tour, **"Boys Hostel"** panorama | same | The sign reads **अशोक-भवन (Ashok Bhawan)**: a porch with columns, a forecourt, arched windows with jaali | Style of a related Bhawan only. **Not one of my buildings** (hand-off) | `$R/tour-boyshostel-*.jpg`, `$R/sheet-boys.jpg` |
| Same tour, **"Hostel - Double Occupancy"** and **"Hostel - Single Occupancy"** | same | Room interiors, Bhawan unnamed | Generic room materials and furniture | `$R/tour-double-*.jpg`, `$R/tour-single-*.jpg`, `$R/sheet-rooms.jpg` |
| Tour locale file | https://www.bits-pilani.ac.in/Pilani-Campus-Virtual-tour/locale/en.txt | Panorama and hotspot labels | Hotspot names | `$R/tour-en.txt` |
| Esri World Imagery, z18, with a game-coordinate grid | https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer | Plan view of all three Bhawans and VK+RP | Footprints, cross wings, wing depths, the Vyas OSM error, the VK–RP link | `$R/esri/area-south.jpg`, `shankar.jpg`, `vyas.jpg`, `vyas-wide.jpg`, `vk.jpg`, `vk-rp.jpg` |
| SWD, Shankar Bhawan | https://swd.bits-pilani.ac.in/shankar-bhawan.aspx | Text page | Boys' Bhawan on the Pilani campus; generic amenities; mess for 400 | (text only) |
| SWD, Vyas Bhawan | https://swd.bits-pilani.ac.in/vyas-bhawan.aspx | Text page | Same as above | (text only) |
| SWD, Vishwakarma Bhawan | https://swd.bits-pilani.ac.in/vk-bhawan.aspx | Text page | Same as above | (text only) |
| YouTube, "Vishwakarma BITS Pilani Hostel Teaser Video" (2012 upload, made for Inbloom 2010) | https://www.youtube.com/watch?v=sZffvZtIYlQ | 0:10 aerial of a ground; 0:26 a corridor with a square pier | VK corridor finish (weak) | `$R/yt-vkteaser-0010.png`, `$R/yt-vkteaser-0026.png`, `$R/sheet-vkteaser.jpg` |
| YouTube, "Old vs New Hostels of BITS Pilani" | https://www.youtube.com/watch?v=CL5c0zHUglw | 0:15–1:30 a presenter in front of an unidentified hostel; playback failed after seeking | Nothing usable; frames deleted | (none kept) |
| Game today (explorer) | http://localhost:8080/?explore | Map, interior and facade views | Current state | `$R/game-*.png`, `$R/sheet-game.jpg` |
| Repo data and code | `data/bits-campus.js`, `js/world/hostel.js`, `js/world/bits-world.js` | Footprints, Hostel layout | OSM rings; game frame, entrance and spaces | (n/a) |

---

## H. Comparison with the game today

Game state, measured at runtime:

| Bhawan | Game frame and courtyards | Entrance (outside → inside) | Locked/open rooms per floor |
|---|---|---|---|
| Shankar | W 57.1, L 103.3, two courtyards | (211.9,393.5) → (208.1,394.2), **east face** | 54 / 59 |
| Vyas | W 57.3, L 68.1, **one courtyard** | (243.4,583.0) → (239.7,583.4), **east face** | 32 / 36 |
| VK | W 66.4, L 99.2, **one courtyard** | (202.2,82.5) → (206.0,82.2), west face | 49 / 54 |

All three have FLOORS 2 and FH 3.3. Each has a main stair next to the lobby and an "east" stair. The facade is a white box with two rows of identical rectangular windows. The roof is almost completely covered in solar panels. There are no pavilions. The courtyards are bare concrete with cricket and football markings.

**What matches:**
- Two storeys plus a walkable roof.
- Courtyard-type Bhawans.
- Shankar's footprint and two courtyards.
- VK's entrance side (west).
- A lobby with a guard desk, notice board, cooler and vending machine (plausible, not verified).

**What is wrong, ranked by how visible it is:**
1. **Facade.** It needs cream walls with a maroon parapet line, a ground floor of round arches with jaali screens, and a row of small rectangular windows above. The courtyard faces need salmon-pink plaster and two-storey arcades on the cross wing.
2. **Roof.** Add about six square roof pavilions per Bhawan (open top, pierced screens, water tanks inside). Cut the solar panels back to partial arrays (sparse on Shankar, rows on VK and Vyas).
3. **Shankar and Vyas entrances are on the east face; move them to the west face** at the cross-wing axis. Add a raised entrance block with an arched doorway, a red paved forecourt with a planter, steps and a ramp. The cause is `entranceOrder()` choosing the long side nearest a road; it needs a per-Bhawan override.
4. **Vyas and VK need a second courtyard and a cross wing.** OSM has one hole, so `twoCourts` is false.
5. **The Vyas footprint is about 35 m too short at the north**, and both Vyas and VK are under-rotated by about 7–10° against imagery. Raise this with the orchestrator before changing the data.
6. **Courtyards should be gardens:** lawn, big trees (one with a round platform), shrubs, a small goal and one concrete play court, with floodlights at night. Bare concrete with a cricket pitch is wrong.
7. **Wings are too shallow** (7.85 m against about 11–14 m).
8. **VK's east wing must join RP Bhawan** without a gap or a duplicate wall.

---

## I. Uncertainties and hand-offs

**Uncertainties:**
- No floor plans, room counts or room-number schemes for any of the three **[unknown]**.
- No interior footage of these Bhawans. The room panoramas in the tour are not named **[unknown]**.
- Stair positions and type are inferred from the roof pavilions **[approximation]**.
- Vyas and VK entrances are inferred from the shape of the west block, not seen directly.
- Floor-to-floor height was not measured. The game's 3.3 m looks low against the tall arched ground floor; 3.8–4.2 m is plausible **[approximation]**.
- The imagery has about a +5 m east offset against OSM. Imagery corner picks are ±3–5 m.
- Sources not accessed or not inspected: Google Maps and Google Earth (not attempted); YouTube XkDvacBC7zA and bkmKuEguTH8 (not inspected); other room-tour videos (the hostel is not named).

**Hand-offs:**
- **`hostels-newer`:**
  - Rana Pratap Bhawan is physically joined to VK's east wing; OSM overlaps by about 11 m.
  - The tour's "Boys Hostel" panorama is **Ashok Bhawan**: a columned porch, a forecourt with gate posts, arched windows with jaali.
- **`messes`:** Shankar Vyas Mess sits between Shankar and Vyas. A corrected Vyas north edge (about z 516–529) leaves a gap of about 20–30 m. The SWD pages give a dining hall of 400.
- **`roads-paths`:**
  - The Shankar forecourt and path link to Krishna Marg (west).
  - The road east of Shankar and Vyas.
  - The Vyas west road.
- **`sports`:** the courts, the pitched-roof shed and the Gymkhana track east of Shankar.
- **`workshops-halls`:** BITS Workshop north of VK.
- **Orchestrator:** the Vyas OSM outline correction, and the VK and Vyas rotation.

## Build notes (Shankar, Vyas and Vishwakarma Bhawan, phase 7 in js/world/hostel.js)

**Shared by all six (Gandhi, Ram, Budh, Shankar, Vyas, Vishwakarma).** They are still built by the shared `Hostel` class. The per-Bhawan differences live in the `STYLE` table in js/world/hostel.js, and nothing about Krishna (`this.mine`) changed. Each Bhawan now has:
- a cream outer face with its painted bay texture, a plinth, a first-floor string course, a cornice and a parapet coping;
- a projecting 10.4 m entrance bay on the west face with its Devanagari name band, a shut green collapsible gate and an open arch, two steps up to the porch and one step down into the lobby;
- salmon courtyard faces and a cream string course and cornice round each courtyard;
- garden courtyards with lawn, trees, a cross of paths, shrubs, benches and four lamp posts each, instead of concrete cricket and football grounds;
- kota-stone corridor floors;
- six stair cores besides the main stair: the east stair plus NW, NE and SW corners and both ends of the middle wing. Each core sits under a roof mumty, and every one is walkable up and down;
- one open round arch in the middle of every courtyard side that has no arcade, so every courtyard can be reached from the corridor.

Tests: tests/browser/hostels-courtyard.mjs walks in through each entrance, up and down every stair, onto the roof and back, and into and out of every courtyard. It also checks that the gate and the walled courtyard sides block. bhawans.mjs, stairsdown.mjs and krishna.mjs still pass.

**Needs an orchestrator change.** tests/hostel.test.js (not in this builder's files) still expects OSM's courtyard count and OSM corners. Vyas and Vishwakarma now have two courtyards, and Vyas's two north corners move 35 m. The fix is to expect 2 courtyards for those two Bhawans and to skip Vyas's north corners in the corner check. With that one test change applied, the unit tests pass.

**Not changed.** Roof material is still `roofSolar`, set by bits-world.js `roofOf`, which this builder does not own. The research says the real roofs are not covered in PV.

**All three**
- The entrance is on the west face, in line with the middle wing. This uses the outline's own west order, not the old road-facing order that put Shankar's and Vyas's entrances on the east face.
- The entrance is a closed block with round arches.
- The outer face has round-headed jaali arches below and small windows above, with a maroon line under the cornice.
- A red paved forecourt with a sandstone planter sits in front of the entrance.
- The arcade (round arches with a colonnade above) runs only on the middle wing's north face. The other courtyard faces are salmon walls with barred windows and one open arch each.
- The middle wing's south face has rooms: salmon with a window on each floor.

**Shankar**
- The north court has a concrete volleyball court against the west wing, a small football goal and lawn with trees. The south court is lawn with trees.

**Vyas**
- In code, the outline runs 35 m north of OSM (`extendN`). The data file is unchanged. The building is 57.3 × 103.1 m.
- It has two courtyards with the middle wing at 0.48 of the length.
- The north court has a large tree on a round sitting platform. The south court is lawn with a bare sandy play patch and a small goal.

**Vishwakarma**
- It has two courtyards (OSM traces one), with the middle wing at 0.46 of the length.
- The courts are a sandy patch with a goal, and lawn with trees.
- The east wing is the one joined to Rana Pratap. No entrance or arcade opens on the east outer side; that link is owned by hostels-newer.
