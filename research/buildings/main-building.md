# Main Building, Clock Tower and Rotunda: research report

Agent `main-building`. This area covers the Main Building's West Wing, East Wing and central clock-tower block (OSM `FD-II`), the Main Building Hall (Auditorium), the Clock Tower, the Rotunda at the origin, M Lawns and S Lawns, the offices inside, and the department POIs around the building.

**Tags:**

- **[verified]**: seen in a source listed in section G.
- **[visual estimate]**: judged from panoramas or photos.
- **[approximation]**: proposed or derived, not seen.
- **[unknown]**: not found.

**Captures:** all captures are in `$S = /private/tmp/claude-501/-Users-mirnal-Documents-Whisperflow/58e9866d-f336-43fa-bce9-096a63ba2c16/scratchpad/research/main-building/`. They are reference only and are not in the repo.

- `tour-*.jpg` are the f/r/b/l cube faces of each 360° panorama, laid side by side. Face `f` is the panorama's default view.
- `zoom-*.jpg` are full-resolution crops.
- `game-*.png` are captures of the game as it is today.

---

## 0. What to know first

1. **The plan is a U open to the south, facing the Rotunda** [verified: tour "Clock Tower" drone panorama].
   - The centre of the U is a stepped Art-Deco block with the Clock Tower rising from its south front.
   - Behind the central block is the Auditorium, a long hall with a **pitched sheet-metal roof**.
   - On each side is a two-storey wing built round a large grass courtyard. These are the OSM West and East Wing rings.
   - The wings run south toward the Rotunda.
   - The OSM layout (`FD-II` in the middle, the two wing quads, `Main Building Hall` behind) matches this.
2. **Two different architectural languages** [verified: `zoom-clock-base.jpg`, `zoom-rotunda-north.jpg`]:
   - **Central block and tower:** stepped Art-Deco setbacks, cream-white plaster, thin **maroon/oxide-red string-courses**, a red-framed vertical slot window up the tower, and a red-ringed clock.
   - **Wings:** Rajasthani colonial. The ground floor is an **arcade of cusped/round arches**. The first floor is a **colonnaded verandah** with slender square columns. There is a red plinth band. **Domed chhatris** sit on the stepped corner pavilions at the south ends of the wings.
3. **The Rotunda is a sunken plaza, not a disc at grade** [verified: tour "Rotunda"].
   - It is 50 m in diameter and holds 1,500 people [verified: hafeezcontractor.com].
   - It is enclosed on the north by a curved **ochre-yellow retaining wall** with white-framed **cusped (multifoil) arched niches**, a central BITS emblem medallion and a pierced parapet.
   - Stepped **amphitheatre terraces** with ramps rise on the east and west sides.
   - The game builds it at ground level with a plain niche wall.

---

## A. Identification

| Block | Official / common name | OSM name, `h` | OSM bounds (game m) | Notes |
|---|---|---|---|---|
| Central block + tower | Main Building / Clock Tower. The tower is listed as "BITS Pilani Main Building The Clock Tower", built **1964** [verified: Wikipedia "List of clock towers in India"; single source]. The tour calls the foyer "Admin Block 1/2" [verified]. | `FD-II`, 12 m | x -77…41, z -92…-55 (118 × 37) | Clock Tower POI (-9, -62) sits on its south edge [verified: data] |
| West Wing | Main Building (West Wing) | `Main Building (West Wing)`, 14 m | x -167…-59, z -105…13 (108 × 118); courtyard x -141…-85, z -80…-18 | POIs: `FD3` (-111, -19), `Chemistry Department` (-112, -14) |
| East Wing | Main Building (East Wing) | `Main Building (East Wing)`, 14 m | x 38…146, z -136…-21 (108 × 115); courtyard x 61…126, z -112…-49 | POIs: `FD 2` (102, -55), Mechanical (83, -48), EEE (50, -90), SWD Office (109, -44), Student Union Office (91, -40), RC Club (61, -47) |
| Auditorium | Main Building Hall / "Audi". BITS cites a 2,535 m² auditorium decorated by art students [verified: Wikipedia BITS Pilani; not confirmed to be this hall] | `Main Building Hall`, 16 m | x -34…0, z -131…-81 (34 × 51) | POI `Auditorium` (-11, -86). The grand entrance is "just below the tower" [search snippet only, not opened] |
| Rotunda | BITS Rotunda | none; POI `Rotunda` (0, 0) | game disc r = 24, wall R = 26.4 | 50 m dia, 1,500 people [verified]; completed with NAB in 2014 [verified: Wikipedia caption "newly inaugurated Rotunda (2014)"] |
| M Lawns | M Lawns | POI (103, 3) | — | in front of the East Wing [approximation from POI] |
| S Lawns | S Lawns | POI (-111, 37) | grass area x -173…-152, z 20…72 is nearby | in front of the West Wing [approximation] |

**Naming caveat** [verified: search snippet from the GWU alumni page "Bees Saal Baad"]. The old names C-Block, M-Block and S-Block were replaced by Faculty Division I, II and III.

- The OSM POIs `FD 2` (in the East Wing) and `FD3` (in the West Wing) suggest the wings are the Faculty Divisions.
- OSM labels the **central block** `FD-II`, which conflicts with the `FD 2` POI in the East Wing [unknown which is right]. Hand-off: `fd2-fd3`.
- "M Lawns" and "S Lawns" probably keep the old M-Block and S-Block names [approximation].

**Orientation** [verified from OSM]:

- The front faces **south** onto the Rotunda and the NAB/Saraswati Temple axis.
- The Clock Tower → Temple axis runs 8.8° east of south.
- The south edges of the footprints are rotated differently:
  - `FD-II`: about 1°
  - West Wing: about 4°
  - East Wing: about 8.6°

  A symmetric building should share one rotation, so at least one OSM outline is skewed [visual estimate].
- The tower is 62.6 m north of the Rotunda centre [verified: data].

**Neighbours:**

- South: the Rotunda, then NAB (owner `nab`).
- North: the Institutional Cafe (-17, -148) and the Music Club (-50, -143).
- East: FD-I (owner `fd1`) beyond the East Wing.
- West: the Birla Museum (owner `gates-landmarks`).

## B. Exterior

### B1. Central block and Clock Tower

**Massing** [verified: `zoom-clock-base.jpg`]:

- **Porte-cochère:** a flat-roofed box with square piers, projecting south over the end of the driveway.
- **Entrance terrace:** a raised terrace with steps.
- **Central block:** three storeys of stepped setback volumes on either side of the tower. Each side has three tiers of horizontal window bands, with small square relief tiles in the frieze.
- **Tower base:** the tower rises from the back of the entrance terrace.

**Floors and heights:**

- The central block has 3 storeys [visual estimate]: about 4.2 m per floor, about 13–14 m to the parapet.
- The OSM `h` = 12 m is slightly low [visual estimate].

**Tower:**

| Part | Description | Height |
|---|---|---|
| Shaft | square, cream; one red-framed vertical slot with 3–4 stacked louvred panels | from about 14 m to about 34 m [visual estimate] |
| Base window | small red-framed window | — |
| Clock stage | **one round clock face per side**, white dial with a thick **red ring** and black hands [verified]; maroon bands above and below | — |
| Belfry | a narrower open belfry with an arched opening | — |
| Cap | a **curved Bengal-style (bangla) eave/cupola** edged in red, with a small dome and a finial with a weather-vane | — |

- Total height above ground is about 40–45 m [visual estimate]. The ratio of shaft width to height is about 1:4 above the central roof, assuming the shaft is about 7 m wide. No published height was found [unknown].

**Colours:**

- Walls: cream/ivory plaster, about `#efe8d6` [visual estimate].
- Trim: maroon/oxide red, about `#8e2f28`.
- Windows: dark glazing in white frames. Some green-painted shutters are seen on the wing upper floor.

**Front court** [verified: `zoom-clock-base.jpg`, `tour-clock-tower.jpg`]:

- A **semicircular driveway** loops in front of the porch.
- **Two antique field cannons** flank the entrance.
- Potted plants stand on the plinth.
- Lawns on either side are planted with **cypress (Thuja-type) cones**, shrubs and flowerbeds.
- A small circular island sits at the driveway junction.

**Roofs:**

- Flat, light-grey terrace roofs with parapets and many AC units [verified].
- No solar panels on the Main Building itself [verified in the drone pano; the neighbouring blocks to the north do have them].

### B2. Wings (West and East)

**Floors:** 2 storeys [verified: `tour-admin-connecting.jpg`, `zoom-rotunda-east.jpg`]. They are about 4.5 m each, about 10–11 m to the parapet [visual estimate], so OSM `h` = 14 m is high.

**Courtyard elevations** [verified: "Admin connecting" panorama]:

- Ground floor: a continuous **arcade of round/cusped arches** on piers over a red-ochre plinth band with low steps into the grass.
- First floor: an open **verandah with slender square columns** and a red string-course.
- The ranges are long and straight. The clock-tower cupola shows above the roofline.
- The courtyard is a **flat grass lawn with a few large trees**.

**Outer and front elevations:**

- The same two-tier arcade/colonnade is seen from the Rotunda [verified: `zoom-rotunda-north.jpg`, `zoom-rotunda-east.jpg`].
- At the south ends, a **three-storey corner pavilion** with **a small open domed chhatri** (arched openings, ribbed dome, finial) sits on top [verified: `zoom-rotunda-east.jpg`, both ends visible in `tour-rotunda.jpg`].
- Chhatris elsewhere on the wings were not seen [unknown].

**Range depth:**

- The OSM rings make the ranges 18–33 m deep.
- The drone view suggests narrower ranges (verandah plus a single or double row of rooms, about 14–20 m) with larger courtyards [visual estimate, low confidence].

### B3. Auditorium (Main Building Hall)

- A long hall directly north of the tower [verified: `zoom-clock-front.jpg`].
- **Pitched (gabled) roof of corrugated sheets**, grey with rust-red patches.
- Cream gable walls with clerestory/louvre openings and small red-tiled hoods.
- The ridge is roughly level with the tower's lower slot window: about 15–17 m [visual estimate].
- OSM `h` = 16 m fits, but the game's **flat** roof does not.

### B4. Rotunda

All [verified: `tour-rotunda.jpg`, `zoom-rotunda-north.jpg`, `zoom-rotunda-east.jpg`] unless tagged.

- **Floor:** the plaza is sunken.
  - The paving is a large **star/lotus pattern in pink sandstone and slate-blue/grey stone** with beige borders.
  - Thin curved grass strips are set into the paving.
- **North wall:** curved, ochre-yellow (about `#e2c27a`) [visual estimate].
  - Each niche is a **multifoil (cusped) arch in a white rectangular frame**; there are about 16–18 niches.
  - A **circular BITS emblem relief** is in the centre.
  - A **pierced (jali-dot) parapet** runs along the top, with a steel railing above at grade.
  - Wall height is about 3–3.5 m [visual estimate].
- **Openings:** a **rectangular doorway** in a white frame pierces the wall at the north-east (and by symmetry the north-west [approximation]).
- **East and west sides:** stepped **amphitheatre terraces** (stone treads with grass bands), with a **ramp/stair** climbing beside them to grade.
- **South:** open to the NAB courtyard.
- **Planting:** Planting: date palms and bougainvillea beds at the rim.

## C. Floor-by-floor layout

The evidence supports only the overall plan. Room-level plans were not found [unknown].

```
                N (-z)
        +--------Auditorium (pitched roof)--------+
        |      x -34..0, z -131..-81              |
+-------+------+---------------------------+------+--------+
| WEST WING    |  CENTRAL BLOCK  (OSM FD-II)|   EAST WING    |
| 2 floors     |  3 floors, foyer + inner   |   2 floors     |
| arcade ring  |  hall around light-court   |   arcade ring  |
| [courtyard]  |        [TOWER]  (-9,-62)   |   [courtyard]  |
|  x-141..-85  |      porch + steps, z≈-50  |   x61..126     |
|  z-80..-18   +-------------+-------------+   z-112..-49   |
|              |   driveway loop  (z≈-45)  |                |
+--chhatri-----+                           +------chhatri---+
   S Lawns            ( ROTUNDA 0,0 )             M Lawns
                    sunken, 50 m dia
                          S (+z) → NAB
```

**Ground floor, central block** [verified: tour "Admin Block 1", "Admin Block 2"]:

1. **Porch steps:** the porch steps rise to a **foyer**. The foyer has a grey/white **checkerboard marble floor**, square stone pilasters, and steel handrails either side of the steps. Looking south through the portal frames the Rotunda and the Saraswati Temple.
2. **Carved doors:** large carved wooden folding doors with a square lattice pattern.
3. **Inner foyer** (white marble floor with a brown star inlay):
   - A **bronze bust** on a grey marble plinth. The plaque reads "कुलपति पद्मश्री शुकदेव पाण्डे" [visual estimate of the reading].
   - Large framed **painted murals**.
   - A deeply carved white **geometric plaster relief ceiling**.
   - A welcome screen over the inner doorway.
4. **Inner hall:** a **pillared hall around a planted light-court**: square white piers, marble floor with a brown border band, and the same relief ceiling. At its end are tall **carved wooden double doors** flanked by two stone relief panels. These are probably the Auditorium doors [approximation; consistent with the "grand entrance to the Audi below the tower" snippet].

**First floor, central block:**

- The **Director's Office** looks south over the driveway loop and the Rotunda edge [visual estimate from the window view in "Director's Office"]. That puts it at first-floor level in the central block or the inner end of a wing, **not** in the south range of the East Wing where the game puts it.
- The tour also lists the VC's Office and Waiting Room, Registrar's Office, Dean Administration, EA to VC, Placement Unit, AUGSD, AGSRD, Accounts and Admission Office. These are captured but **not located** within the building [unknown].

**Wings:**

- Each wing has a courtyard ring.
- Rooms open off the arcaded verandah, on the ground floor and on the first-floor colonnade [verified for the verandahs; rooms not seen].
- The department POIs (Mechanical, EEE, SWD, Student Union, Chemistry) come from OSM only [verified: data]. The tour has "Mechanical Engineering Lab", "Electrical & Electronics Engineering Lab", "Chemistry Lab" and "Student Welfare Division" panoramas, but they show no building location.

## D. Staircases

- **Seen:** only the external **front steps**: a wide flight from the porch up to the foyer with steel rails on both sides, and a short side stair on the entrance terrace [verified].
- **Not seen:** no internal staircase appears in any panorama I opened [unknown].
- **Proposed layout** [approximation]:
  - **Central block:** two dog-leg stairs, one either side of the foyer, behind the side setbacks.
  - **Each wing:** **four dog-leg stairs**, one at each inner corner of the courtyard ring, opening onto the verandah.
  - **Corner pavilions:** one extra stair each, going up to the roof and chhatri level.
  - **Dimensions:** stair width 1.8 m; 2 flights of 14 risers per floor (4.5 m floor gives a rise of about 0.16 m); tread 0.28 m; half-landing 1.8 m deep.
  - **Game constants:** using the game's `RISE = FH/16` means about 0.28 m risers at FH = 4.5. Use 2 × 14 risers instead, or keep FH = 4.2 with 2 × 8.

## E. Interior

| Space | Floor | Walls | Ceiling | Fittings | Tag |
|---|---|---|---|---|---|
| Foyer / porch | grey-white checkerboard marble | white plaster, stone pilasters | flat, coffered beams | carved lattice wooden doors, steel rails | [verified] |
| Inner foyer | white marble, brown star inlay | off-white; framed murals | **geometric carved plaster relief** | bust on marble plinth, wooden planter boxes, TV screen | [verified] |
| Inner hall | white marble, brown border | white piers | same relief ceiling | carved double doors, stone relief panels, potted plants in court | [verified] |
| Director's Office | cream vitrified tiles | **peach/salmon paint** | grid false ceiling, LED panels, ceiling fan | wooden-and-glass cabin partition, conference table, grey sofas, BITS emblem on wall, whiteboard, split ACs | [verified] |
| AUGSD | beige marble | **aluminium-framed grey/frosted glass cubicle partitions** with service windows | grid false ceiling, LED panels, fans | long counter corridor; signs such as "RESERVED AREA FOR ACADEMIC WORK" | [verified] |
| Student Welfare Division | **wood-look plank floor** | white | grid false ceiling | aluminium-and-glass counters | [verified] |

- **Ceiling heights:** about 4 m in the old halls; offices have false ceilings at about 3 m [visual estimate].
- **Room numbers:** none legible [unknown].

## F. Gameplay

**Entrances** (game coordinates) [approximation, based on the evidence above]:

| Entrance | Position | Notes |
|---|---|---|
| Main front | (-9, -47) | porch steps up to a foyer at y ≈ 0.9; the foyer runs from z ≈ -55 to -65 |
| Rotunda | (0, -26) | stair/ramp from grade down into the Rotunda through the north-east/north-west doorways; plaza floor at **y ≈ -3** |
| Amphitheatre terraces | east and west sides | ramps from grade down to the plaza |
| Courtyard arcades | — | each wing courtyard reached from its ring arcade; one arch-passage through the south range of each wing on its centreline: West ≈ (-108, -5), East ≈ (100, -35) |

**Spawn:** the Rotunda assembly spot can stay at (0, 0, 14) but needs y = plaza level if the Rotunda is sunk.

**Collision:**

- Footprint rings, but keep the **ground-floor arcade walkable**: a 3.5 m verandah strip on the courtyard side, piers as colliders.
- The Rotunda wall arc (R ≈ 25) with gaps for the doorways and the terraces.

**Rooms that must keep working:**

| Room | Current position | Recommendation |
|---|---|---|
| `principal` (Director's Office) | x 88…95, z -37…-27 | Move to the central block, first floor, south side (about x -25…-15, z -70…-62, y ≈ 4.5) if stairs are built. Otherwise ground floor of the central block, east of the foyer. Keep id, `exit` and `objectivePoint` semantics. |
| `reception` (AUGSD) | x -160…-148, z -50…-42 (West Wing outer range) | Fine as is: its location is [unknown]. Give it the aluminium/glass cubicle counters. |
| `complab` | x -81…-69, z -51…-41 | Fine. |

**NPC walk areas:**

- The arcade verandahs.
- The Rotunda floor and terraces (assembly).
- The driveway loop.
- The courtyard lawns.

**Interactables:**

- The bust plaque.
- The Rotunda emblem.
- The cannons.
- The clock (shows game time).

**Camera:** keep the third-person camera inside the verandah ceiling (about 4 m) under arcades.

## G. Sources

| Source | URL | What it shows | Confirms | Local capture |
|---|---|---|---|---|
| Official 360° tour, panorama "Clock Tower" (drone) | https://www.bits-pilani.ac.in/Pilani-Campus-Virtual-tour/index.htm (pano `C57F35FE…`) | aerial 360° above the front | U-plan, wing courtyards, tower details, porch, cannons, pitched auditorium roof, flat roofs | `$S/tour-clock-tower.jpg`, `$S/zoom-clock-front.jpg`, `$S/zoom-clock-base.jpg` |
| Tour "Rotunda" | same (pano `E3174430…`) | plaza level | sunken plaza, niche wall, emblem, terraces, doorway, chhatris on the wings | `$S/tour-rotunda.jpg`, `$S/zoom-rotunda-north.jpg`, `$S/zoom-rotunda-east.jpg` |
| Tour "Admin connecting" | same (pano `CF6FC720…`) | wing courtyard | 2 storeys, arcade + colonnade, lawn | `$S/tour-admin-connecting.jpg` |
| Tour "Admin Block 1" / "Admin Block 2" | same | foyer, inner hall | interior finishes, bust, doors, axis view to temple | `$S/tour-admin-block-1.jpg`, `$S/tour-admin-block-2.jpg`, `$S/zoom-admin1-door.jpg`, `$S/zoom-admin1-bust.jpg` |
| Tour "Director's Office", "Academic Undergraduate Studies Division", "Student Welfare Division" | same | offices | interiors (D, E) | `$S/tour-directors-office.jpg`, `$S/tour-augsd.jpg`, `$S/tour-swd.jpg` |
| Tour: Registrar, VC Office, Director's Waiting, Accounts, Admission, Mech/EEE/Chem labs, Drone Day View | same | captured, not analysed in detail | — | `$S/tour-*.jpg` |
| Tour locale file (panorama labels) | …/Pilani-Campus-Virtual-tour/locale/en.txt | the list of place names | which spaces exist | `$S/tour/en.txt` |
| Hafeez Contractor project page | https://hafeezcontractor.com/projects/birla-institute-of-technology-and-science-pilani | text | Rotunda 50 m dia, 1,500 people; tower atop the Academic Block; tower–Mandir axis over 50 years | — |
| Wikipedia, List of clock towers in India | https://en.wikipedia.org/wiki/List_of_clock_towers_in_India | table row | tower dated 1964 (single source) | — |
| Wikipedia, BITS Pilani | https://en.wikipedia.org/wiki/Birla_Institute_of_Technology_and_Science,_Pilani | text and captions | 2,535 m² auditorium; Rotunda 2014 caption | — |
| Explurger place page | https://www.explurger.com/pd/8huw7r723nkow0ab2 | generic description | the tower is the admin hub (weak source) | — |
| Game (explorer) | http://localhost:8080/?explore | today's build | section H | `$S/game-*.png`, `$S/game-walk-*.png` |

## H. Comparison with the game today

**What matches:**

- Footprint positions (the OSM U-plan is right).
- Wing courtyards.
- A cream-white heritage colour.
- A slim cream tower with a slot, a clock stage and a small dome.
- Rotunda star paving in pink and slate-blue.
- Palms and bougainvillea.
- The tower → Rotunda → NAB → temple axis.

**What is wrong** (see `game-main-building-west-wing-.png`, `game-bits-clock-tower.png`, `game-walk-rotunda.png`):

- The wings are plain punched-window boxes 14 m high, with no arcade or colonnade and no red bands.
- Chhatris sit on **every** footprint vertex instead of on the south corner pavilions.
- The tower has no red trim, a plain dial (no red ring), and a stacked box-and-dome top instead of the open belfry with a bangla cupola.
- The entrance is a plain box rather than stepped Art-Deco tiers with a porte-cochère.
- The Auditorium has a flat roof.
- The Rotunda sits at grade, its wall has plain round niches, and it has no emblem and no amphitheatre terraces.
- The Director's Office is in the wrong part of the building.

**Ranked fixes** (most visible first):

1. **Sink the Rotunda** (about 3 m). Use an ochre wall with white-framed cusped niches, the BITS emblem medallion and a jali parapet. Add east and west amphitheatre terraces and ramps.
2. **Wing facades:** a two-tier arcade texture. The ground floor is cusped/round arches on piers with a red plinth; the first floor is a colonnaded verandah with a red string-course. Lower `h` to about 10.5 m (2 floors). Apply the same on the courtyard sides.
3. **Clock Tower:** maroon string-courses, a red-framed slot, a red-ringed white dial, and an open belfry with a curved bangla cupola and finial. Overall about 42 m (the game is about 57 m).
4. **Central block:** stepped three-tier Art-Deco massing, a flat porte-cochère over the driveway loop, steps, and two cannons.
5. **Auditorium:** pitched corrugated roof, ridge at about 16 m.
6. **Chhatris:** only on the corner pavilions at the wings' south ends; raise those pavilions to 3 storeys.
7. **Driveway loop and front lawns:** semicircular drive and cypress cones.
8. **Director's Office** interior: peach walls, a timber-and-glass cabin, a conference table. **AUGSD:** aluminium cubicle counters.

## I. Uncertainties and hand-offs

**Uncertainties:**

- Tower height and wing range depths are visual estimates.
- The construction year 1964 comes from one source.
- The FD-I/II/III naming is unresolved: the OSM `FD-II` label is on the central block, but the `FD 2` POI is in the East Wing.
- Internal stairs, room numbers, and the locations of AUGSD, Registrar, VC, SWD and the department labs were not seen.
- The OSM rotations of the three blocks disagree by up to about 7.6°.

**Not accessed:**

- The GWU "Bees Saal Baad" M-Block page: TLS certificate error, not bypassed.
- YouTube tour videos: frames were not captured in this pass.
- Google Maps/Earth: not tried.

**Hand-offs:**

- `fd2-fd3`: the OSM `FD-II` name is on the central clock-tower block. Decide with this agent where FD-II and FD-III actually are.
- `nab`: the Rotunda's south opening and the NAB courtyard levels must meet. The NAB report already treats the Rotunda as sunken.
- `roads-paths`: the semicircular driveway loop in front of the porch, and the Rotunda ramps and steps.
- `landscape-water`: M Lawns and S Lawns planting, cypress cones, and the courtyard lawns.
- `gates-landmarks`: the cannons at the entrance, if treated as monuments.
