# Student Activities Center (SAC): research report

Agent: `sac`. Area: the OSM footprint "Student Activities Center (SAC)" (x -204..-145, z 287.6..320.8), the SAC complex around it, and the food and shop kiosks next to it (TOTT, -301°F, Looters, Jawed Habib).

Coordinates follow [../COORDINATES.md](../COORDINATES.md): metres, x east, z south, origin at the Rotunda.

Every claim carries one of these tags:

- **[verified]:** seen directly in a source listed in section G.
- **[visual estimate]:** measured or judged from imagery. Positions taken from the satellite mosaic are good to about ±4 m.
- **[approximation]:** a plausible layout proposed for the game. It has not been observed.
- **[unknown]:** not established.

All captures are in `SCR = /private/tmp/claude-501/-Users-mirnal-Documents-Whisperflow/58e9866d-f336-43fa-bce9-096a63ba2c16/scratchpad/research/sac/`. They are reference only and must stay out of the repo.

---

## Summary (read this first)

The real SAC looks nothing like what the game shows today. The game has a single three-storey, 10 m box over the OSM rectangle. The real SAC is a **single-storey complex** [verified, from the virtual tour exterior and the drone panorama] made of four kinds of part:

1. **A central pair of large halls**, which the OSM rectangle roughly covers [visual estimate]:
   - a tall **west block**: sports hall(s) with steel-truss roofs, blue-grey metal sheeting and rooftop solar panels;
   - a lower **east hall**: the open-sided covered hall the tour calls "SAC inside". It has a curved roof, arcades open to lawns on its north and south sides, and a large mural on its west wall [verified].
2. **An entrance portico on the east side**, facing the north-south road between the SAC and Budh Bhawan. It is grey-blue with white trim, a salmon-pink chevron frieze and a terracotta medallion, and carries the sign "BITS STUDENTS ACTIVITIES CENTRE" [verified].
3. **A ring of single-storey pavilions** with salmon or terracotta roofs, linked by covered corridors with red-brick jali screens [verified in the "SAC inside" panorama; extent from satellite and drone, visual estimate]. They hold:
   - club rooms with barrel-vaulted ceilings: dance, classical music and dance, the music room, and the gym [verified, interiors];
   - small square kiosks with pyramid roofs: TOTT, -301°F and Jawed Habib [visual estimate].
4. **Two courtyard lawns**, one north and one south of the east hall [verified in the panorama; positions are visual estimates].

**No auditorium (fixed seating and a stage) was found anywhere in the SAC** [verified absence across the tour's 13 SAC-linked panoramas; [unknown] whether one exists elsewhere in the complex]. The best real counterpart for the game's `auditorium` room is the open east hall ("SAC inside"). It is used for yoga [verified] and has a natural "stage wall" in the mural on its west end.

---

## A. Identification

| Item | Value |
|---|---|
| Official name | "BITS Students Activities Centre" on the portico sign [verified]. The virtual tour labels it "Student Activity Centre" [verified]; OSM calls it "Student Activities Center (SAC)". |
| Category | Student activities and indoor sports complex with club rooms, plus attached eateries and shops [verified for the rooms listed in E]. |
| OSM footprint | Axis-aligned rectangle x -204..-145, z 287.6..320.8 (59 × 33 m), `kind: sac`, `h: 10` (data/bits-campus.js). OSM POI "Student Activities Center" at (-182.5, 301.8). |
| How well OSM matches reality | The rectangle is a fair outline of the **two central halls only**. From satellite they span about x -200..-140, z 290..325 [visual estimate, ±4 m]. OSM leaves out: the portico and lobby (x ≈ -140..-127), the east pavilions, the covered corridors, and the pavilion and kiosk clusters to the north and south. Together these make the whole complex about **x -206..-121, z 238..365 (≈ 85 × 127 m)** [visual estimate]. |
| OSM lawns | Two OSM grass polygons belong to this complex: north x -183..-147, z 272..291; south x -178..-142, z 306..328. The real lawns sit at about z 279..289 (north) and z 315..328 (south) [visual estimate]. The south polygon overlaps the east hall by about 9 m, and the game draws grass under the building (visible in `game-sac-from-se.png`). |
| Orientation | The halls and corridors line up with the game axes to within about 2° [visual estimate, satellite]. The main entrance faces **east** [verified by the panorama sequence; see the note under D/E]. |
| Nearby | Road immediately east, running about north-south (OSM service road, x ≈ -114 at z 300). Across that road is Budh Bhawan (x -112..-38, z 245..355). Malviya Mess and Malviya-A are to the north. Looters (OSM x -183..-179, z 229..238) is north of the north pavilions. To the south is a road at z ≈ 370..400 (OSM service road (-102, 371) to (-316, 404)). To the west are white flat-roofed buildings, probably residential and **not** part of the SAC [unknown use]. |
| Kiosk POIs (OSM) | TOTT (-151.9, 249.4) and -301°F (-135.9, 257.9) are in the north-east kiosk cluster. Jawed Habib Salon (-131.1, 350.8) is in the south-east kiosk cluster [visual estimate, satellite overlay]. Budh Redi (-111.9, 256.3) and Da Cloud Cafe (-117.6, 209.4) are on the east side of the road (hand-off). |

## B. Exterior

### B1. Massing and heights

| Part | Plan, game coords | Size | Floors and height | Roof | Tag |
|---|---|---|---|---|---|
| West block (sports halls) | x -200..-169, z 290..325 | ≈ 31 × 35 m | Double height; eaves about 9 m, top about 10–11 m; holds one mezzanine (martial arts) | Blue-grey metal sheeting on steel trusses, solar panels in 3 strips | plan [visual estimate]; mezzanine [verified]; heights [visual estimate] |
| East hall ("SAC inside") | x -172..-140.5, z 291..315 | ≈ 31.5 × 24 m | One tall storey: arcade arches about 4.5 m, roof springing about 6 m, crown about 8 m | Curved (segmental-vault) roof on steel arched trusses with sheeting; solar panels on the east half | shape [verified]; numbers [visual estimate] |
| Lobby and portico | x ≈ -140..-127, z ≈ 295..305 | ≈ 10 × 13 m | Portico about 8 m tall, taller than the wings | Flat roof behind a parapet | [visual estimate] |
| East pavilions (beside the portico) | x -140.5..-123.5, z ≈ 270..295 and ≈ 305..330 | about 3 units each side, each ≈ 13–17 × 7–8 m | One storey, about 4.5–5 m to the roof top | Hipped, salmon or terracotta | count [visual estimate] |
| North-west club pavilions | x -206..-169, z 251..278 | 2 columns × 3 rows, each ≈ 14 × 8 m, with a north-south corridor between the columns | One storey; barrel-vaulted inside | Salmon or terracotta | [visual estimate] |
| Dark long building, north edge | x -205..-176, z 242..253 | ≈ 29 × 11 m | One storey | Dark grey, flat or low pitch | [unknown] use |
| North-east kiosks (TOTT, -301°F) | x -165..-133, z 238..268 | about 3 × 4 grid of ≈ 6 × 6 m square units | One storey | Pyramid roofs | [visual estimate]; style [verified] in the Looters panorama |
| South-west club pavilions | x -193..-156, z 335..359 | 2 columns × 3 rows of ≈ 14 × 8 m | One storey | Salmon or terracotta | [visual estimate] |
| South-east kiosks (Jawed Habib) | x -150..-121, z 333..360 | grid of ≈ 6 × 6 m units | One storey | Pyramid roofs | [visual estimate] |
| North covered corridor | z ≈ 275..279, x ≈ -175..-140 | ≈ 3–4 m wide | One storey, open, with brick jali | Flat | [visual estimate] |
| South covered corridor | z ≈ 327..332, x ≈ -170..-140 | ≈ 3–4 m wide | One storey | Flat | [visual estimate] |
| East covered corridor | x ≈ -147..-140.5, z ≈ 272..345 | ≈ 3–6 m wide | One storey | Flat | [visual estimate] |

### B2. Entrance portico

From `vt-sac-exterior-portico-flat.jpg` and `vt-sac-exterior-equirect.jpg`:

- **Shape:** a tall rectangular frame with slightly battered (outward-leaning) sides, around a deep recessed opening [verified]. The opening is about 6 m wide and 4.5 m high [visual estimate].
- **Colours:**
  - Walls are grey-blue plaster, roughly `#9eabb4` [verified colour family; hex is a visual estimate].
  - Raised white trim bands (`#f2f2ee`) frame the panels [verified].
  - A salmon-pink band (`#d8a597`) with a zigzag (chevron) frieze runs across the top and over two side panels [verified].
  - A square terracotta medallion with concentric circles sits centred above the opening [verified].
- **Soffit:** coffered, with four large oval recesses, painted white and grey [verified].
- **Doors:** at the back of the portico is a wooden double door (the panelled doors of the hall's east wall; the mural can be seen through it) [verified]. Above the door is a white sign reading "BITS / STUDENTS ACTIVITIES CENTRE" [verified]. Glazed side doors stand either side of the main door [verified].
- **Steps:** a wide flight of about 3–4 grey stone steps with white joint lines. A **central grey ramp** runs up the middle [verified]. The landing is grey marble with white inlay lines [verified].
- **Planters and stands:** low plastered planters (grey-blue) with clipped topiary shrubs sit either side [verified]. Beyond them stand two red-sandstone pillar lamp stands [verified].
- **Wings:** left and right of the portico are single-storey wings [verified]:
  - grey-blue walls with white trim;
  - square windows with dark frames, set in deep white surrounds;
  - a small square medallion on each gable end;
  - hipped roofs with a white fascia.
- **Forecourt:** salmon-pink stamped concrete in an irregular flagstone pattern; black rubber floor mats; raised circular planters with grey plaster edges; black steel-hoop bicycle racks; parked bicycles [verified].
- **Road:** a two-lane road with a dashed white centre line passes along the forecourt [verified].
- **Trees:** neem-like, roughly 8–10 m tall, line both sides [verified that trees are present; species unknown].

### B3. Pavilions, kiosks and halls

- **Club pavilions:** from inside the hall they show cream or white walls, a band of **red-brick jali screens** (perforated brick panels in a lattice of square openings) along the covered corridors, and grey square pillars [verified]. Their roofs look salmon or terracotta from the air [visual estimate, drone and satellite].
- **Kiosks:** in the Looters panorama the TOTT block is a cluster of small square pavilions [verified]:
  - pale grey-beige pyramid roofs;
  - white and grey walls with a grey plinth band;
  - grilled windows;
  - a "TOTT" sign over a dark doorway;
  - a raised paved terrace with grey-plastered parapets, steps, and red plastic chairs at long tables.
- **Halls:** blue-grey sheet roofs with solar arrays [verified, drone]. Walls are grey or white plaster [visual estimate].

### B4. Lighting and landscaping

- **Lighting:**
  - Forecourt: the two sandstone lamp stands by the steps [verified].
  - Food court: tall single-arm white street-lamp poles [verified, Looters panorama].
  - Hall interior: long linear fluorescent fittings along the trusses [verified].
- **Landscaping:**
  - Two mown courtyard lawns flank the east hall [verified].
  - Trees dot the courtyards [verified].
  - Mature trees line the east road [verified].
  - A paved food-court courtyard with round tables and chairs, flowerbeds and white tubular railings is north of the SAC (Looters panorama) [verified].
  - The drone view shows a small semicircular stepped **open-air amphitheatre** near the south-west of the complex, next to the southern road [visual estimate; [unknown] name, exact position and whether it belongs to the SAC].

## C. Floor-by-floor layout

**Ground floor** (the whole complex). This plan is assembled from the satellite mosaic (`sat/esri-sac-crop.png`), the drone crop and the panorama links. Only the names in the rooms list below are verified; **where each named room sits is mostly an approximation**.

```
 z      x: -206        -185       -169   -160    -147 -140   -127     -116
 238  +---------------------------+  +-------------------------+
      | dark long bldg [unknown]  |  | NE kiosks (6x6 m, pyramid|
 253  +---------------------------+  | roofs): TOTT, -301F ...  |   Looters stall and
      | NW club pavilions 14x8 m  |  |                          |   food court further
      | 2 cols x 3 rows, N-S path |  +-------------------------+    N/NW of here
 278  +===== north covered corridor (brick jali) =========+----+
      |                 |    NORTH LAWN (courtyard)        | E  | E pavilions
 290  |  WEST BLOCK     +---- arcade (pillars) ---------- +cor-|  (about 3 units)
      |  sports halls   |                                  |rid-+-------+
      |  badminton, TT, |   EAST HALL "SAC inside"         |or  | lobby |  forecourt  ROAD
      |  squash?        |   open hall, Kota-stone floor    |    |  +    |  (pink      (x ~ -116,
      |  + mezzanine    |   MURAL on W wall  <-> wooden    |    |PORTICO|  stamped)   N-S)
      |  (martial arts) |   double door on E wall          |    | steps |<=== main entrance
 315  |  31 x 35 m      +---- arcade (pillars) ----------- +    +-------+
      |                 |    SOUTH LAWN (courtyard)        |    | E pavilions
 325  +-----------------+                                  |    |  (about 3 units)
 330  +===== south covered corridor (brick jali) =========+----+
      | SW club pavilions 14x8 m  |  | SE kiosks (6x6 m): Jawed |
      | 2 cols x 3 rows           |  | Habib Salon ...          |
 360  +---------------------------+  +-------------------------+
                     N up (-z), E right (+x)
```

**Rooms found in the tour** [verified, from panoramas linked to "SAC inside" or "Student Activity Centre"]:

- **Reached from "SAC inside":**
  - Badminton (paired with Martial Arts)
  - Martial Arts
  - Gym (reached through Gym 2)
  - Gym 2
  - Snooker (paired with Gym)
  - Squash (paired with Table Tennis)
  - Table Tennis
  - Music Room - Gurukul (paired with Classical Music & Dance)
  - Classical Music & Dance
  - Dance Club
- **Reached from the exterior:** Yoga, which is a view of the east hall itself with mats laid out.

**How rooms are reached** [verified as relative directions inside the "SAC inside" panorama; the mapping to compass bearings is an **approximation**]. The hotspots come in pairs, one pair per exit:

| Exit (approx. bearing from the hall centre) | Panorama yaw | Leads to |
|---|---|---|
| East, wooden door | -85° | the exterior and portico |
| West | — | no exit: this is the mural wall |
| SSW | ≈ 24° | Music and Classical rooms |
| SW | ≈ 43° | Squash and Table Tennis |
| NW | ≈ 148° | Gym and Snooker |
| NNW | ≈ 165° | Badminton and Martial Arts |

The approximation behind this: take the east door at -85° and the mural at +95° as true east and west, so bearing = yaw + 175°. Read that way, the sports rooms lie to the north-west and south-west, through the arcades and around the west block. The music rooms are south-south-west, toward the south pavilions.

**Mezzanine** [verified]: the Martial Arts room is on an upper level. It looks down into the badminton hall through large openings with steel railings. The badminton panorama shows a row of interior windows high on one wall. **Its position within the west block is [unknown]**. The [approximation] is a mezzanine along the east side of the west block, at about +4.0 m.

No other upper floors were seen anywhere [verified for every panorama listed]. The game's three window rows do not exist.

## D. Staircases

- **Seen:** none. No panorama shows a staircase [verified absence in 15 panoramas]. The only level changes seen are the portico's 3–4 external steps with a central ramp [verified], and the steps up to the TOTT terrace [verified].
- **Required:** one stair must reach the Martial Arts mezzanine [inference from the verified mezzanine].
- **Proposal [approximation]:**
  - one straight single-flight concrete stair, 1.2 m wide;
  - inside the west block, in its north-east corner (about x -173..-171.8, z 291..296), running north to south;
  - 15 risers × 0.267 m (rise 4.0 m), treads 0.27 m: a 4.05 m run plus a 1.2 m top landing;
  - steel handrail on the open side;
  - it opens at the top onto a 3 m wide mezzanine gallery along the east wall (x -172..-169) with a railing on the hall side.
- **For the game's stair code:** the runs use `RISE = FH/16`. With FH = 4.0, RISE = 0.25 m and 16 risers make a 4.32 m run. That fits.
- **Portico steps** [visual estimate]: 3–4 risers of about 0.15 m and a central ramp about 2 m wide, so the hall floor is about 0.5–0.6 m above the forecourt.

## E. Interior

### East hall ("SAC inside", the open hall) [verified]

Sources: `vt-sac-inside-equirect.jpg`, `vt-sac-inside-east-door-flat.jpg`, `vt-sac-inside-mural-flat.jpg`, `vt-yoga-equirect.jpg`.

- **Floor:** large grey Kota-stone slabs, polished and reflective, with white marble and dark-green marble inlay strips laid as a cross-axis grid [verified].
- **Arcades:** the north and south sides are open arcades [verified]:
  - square pillars clad in grey granite or stone, about 0.6 m, with a plinth;
  - shallow segmental white arches between them;
  - about 5–6 bays per side [visual estimate].
- **Roof:** curved steel arched trusses with purlins and grey sheet underside. Over the arcades is a white plastered band (clerestory zone) [verified].
- **East wall:** white plaster with a grey dado [verified]. In the centre is a wooden 4-leaf panelled double door with glazed top lights. It has a grilled window either side, a wooden notice-board case, a framed notice and a fire extinguisher [verified].
- **West wall:** a full-width mural (theatre curtain drawn back by two giant hands; stars; geometric faces) [verified]. Above it are three maroon honour boards titled "STUDENTS' UNION OF BITS PILANI" with lists of names [verified].
- **Lighting:** linear fluorescent tubes on the trusses [verified].
- **Use:** yoga sessions on interlocking yellow foam mats laid in front of the mural [verified]. A movable table and chairs were seen [verified].

### Badminton hall [verified]

- Teal or aqua painted walls with a grey dado.
- Rust-red steel roof trusses with metal sheeting.
- Long tube-light rows.
- Green synthetic court flooring with white lines; at least 3 court markings visible.
- Wooden benches along the walls.
- Grilled windows low down and interior windows high on one wall (the martial arts gallery).
- Exhaust fans.

### Table tennis hall [verified]

- Teal walls.
- Curved grey-green steel trusses.
- Green floor.
- At least 4 blue TT tables (red frames).
- Blue court surrounds.
- White plastic chairs.

### Squash [verified]

- At least one court with white walls, red lines and a maple-type wooden floor.
- Glass back wall.
- Behind it, a viewing area with a blue wall.

### Martial Arts [verified]

- Upper level with blue and yellow interlocking foam mats.
- Grey-blue walls.
- Punch bags.
- Railed openings looking down into the badminton hall.

### Gym and Gym 2 (health club) [verified]

- Barrel-vaulted rooms with orange or yellow painted arch ribs.
- Cream walls with orange accent walls.
- Grey terrazzo floor with white borders.
- Free weights and machines (Gym); treadmills and ellipticals (Gym 2).
- Mirror walls, grilled windows, ceiling fans, grey double doors.

### Snooker [verified]

- Vaulted room with orange arch accents.
- Two tables (one full-size snooker table, one smaller).
- A pendant light bar.
- Terrazzo floor, cue rack, benches.

### Club rooms [verified]

- **Dance Club:** lavender-blue vault with a dark arch rib, laminate wood floor, mirror wall, steel almirahs, ceiling fans, grilled windows, a wall-mounted speaker.
- **Classical Music & Dance:** lavender walls, terrazzo, instruments (tabla, sitar) and cushioned floor mats.
- **Music Room - Gurukul:** cream walls, terrazzo floor, drum kit, amplifiers, "DHWANI" posters, wooden shelves.

### Room numbers and signs

None were seen except the portico sign and the honour boards [unknown].

## F. Gameplay

| Item | Value |
|---|---|
| Main entry and exit | The portico, centre about (-127, 300) [visual estimate], facing east (+x). Forecourt from x -127 to the road at about -116. Hall floor about +0.5 m, reached by steps or the central ramp. |
| Spawn ("Walk here") | (-120, 300), facing west (yaw toward -x) [approximation]. |
| Secondary entries | Open arcades on the north and south sides of the east hall, onto the lawns at z ≈ 291 and ≈ 315. Covered corridors lead north to the TOTT and Looters food court and south to the south-east kiosks (Jawed Habib) [visual estimate]. |
| Enterable | East hall: yes, as the gameplay room (below). Badminton and TT halls: optional, with courts and tables as decoration. Club pavilions: optional later. Kiosks: counters only. |
| Collision | Pillar boxes about 0.6 × 0.6 m along both arcade lines. Solid walls on the east (with a door gap 2.4–3 m wide at z ≈ 300) and on the west (the mural). Lawn edges are walkable. Pavilions are solid boxes unless opened. |
| Stairs | Only the [approximation] mezzanine stair in D. The portico needs 3–4 walkable step boxes and a ramp. |
| NPC walk areas | Forecourt, east-hall floor, both lawns, the corridor rings, the TOTT terrace and the food-court courtyard. |
| Interactables | Mural and honour board (read the Students' Union board), the notice board by the wooden door, the TOTT, -301°F and Looters counters, the Jawed Habib door, and a TT table or badminton court (mini-game hooks). |
| Camera limits | East hall: walls/arcade about 4.5 m, crown about 8 m. Club rooms: about 4–4.5 m. West block: about 9 m. |

**Fitting the gameplay `auditorium` room.** The room today is x -163.6..-145.6, z 296.6..312.6. Its door is on the east at z 304.6, with exit at (-143.4, 304.6), the stage on the west, and `spots.auditorium` at (-158.1, 304.6).

- **What already matches:** this sits **inside the real east hall** (x -172..-140.5, z 291..315). The east door faces the real portico, and the west stage lines up with the real mural wall. Keep the id, `roomAt`, `pathTo`, `objectivePoint` and `exit`.
- **Recommended adjustments for the build phase:**
  1. Centre the door on the portico axis (z ≈ 300 instead of 304.6; within the ±4 m error, so optional).
  2. Render the room's north and south walls as open arcades: pillars and arches, with the lawns beyond.
  3. Make the "stage" a low platform against the mural wall instead of a red curtain.
  4. Replace the fixed red bench blocks with movable plastic chairs, or yoga mats outside events.
  5. Replace the wood floor with the grey Kota-stone and inlay floor.
- **`festSeat()`:** stays valid, since its seats lie inside the same box.

## G. Sources

The virtual-tour base URL is `https://www.bits-pilani.ac.in/Pilani-Campus-Virtual-tour/`. Panorama tiles were fetched from `media/<panorama-id>_0/{f,r,b,l,u,d}/{level}/{row}_{col}.jpg` under that base and stitched locally with ffmpeg.

| # | Source | URL | What it shows | What it confirms | Local capture |
|---|---|---|---|---|---|
| 1 | BITS Pilani official 360° virtual tour (3DVista), data files | `index.htm`, `script_general.js`, `locale/en.txt` | Panorama labels and adjacency graph | Which rooms link to "SAC inside" and "Student Activity Centre"; the "Exit to SAC" hotspots | `SCR/tour/` (index.htm, script_general.js, en.txt, pans.json) |
| 2 | Tour panorama "Student Activity Centre" (panorama_BD61E85E…) | tour base, see note above | Entrance portico, forecourt, wings, road | Portico form, colours, sign text, steps and ramp, forecourt materials | `SCR/vt-sac-exterior-equirect.jpg`, `SCR/vt-sac-exterior-L1-equirect.jpg`, `SCR/vt-sac-exterior-portico-flat.jpg` |
| 3 | Tour panorama "SAC inside" (panorama_E068CFED…) | same | Open east hall | Arcades, roof, floor, wooden door (east), mural and honour boards (west), exits to the rooms | `SCR/vt-sac-inside-equirect.jpg`, `SCR/vt-sac-inside-L1-equirect.jpg`, `SCR/vt-sac-inside-east-door-flat.jpg`, `SCR/vt-sac-inside-mural-flat.jpg` |
| 4 | Tour panorama "Yoga" (panorama_E1B1B6BF…) | same | Same hall with yoga mats | Use of the hall | `SCR/vt-yoga-equirect.jpg` |
| 5 | Tour panoramas: Badminton, Table Tennis, Squash, Martial Arts | same | Sports halls | Interiors; the mezzanine overlooking badminton | `SCR/vt-badminton-equirect.jpg`, `SCR/vt-table-tennis-equirect.jpg`, `SCR/vt-squash-equirect.jpg`, `SCR/vt-martial-arts-equirect.jpg` |
| 6 | Tour panoramas: Gym, Gym 2, Snooker | same | Health club and snooker | Vaulted rooms, finishes | `SCR/vt-gym-equirect.jpg`, `SCR/vt-gym2-equirect.jpg`, `SCR/vt-snooker-equirect.jpg` (strips in `SCR/sm/`) |
| 7 | Tour panoramas: Dance Club, Classical Music & Dance, Music Room - Gurukul | same | Club rooms | Vaulted club rooms, finishes | `SCR/vt-dance-club-equirect.jpg`, `SCR/vt-classical-music-dance-equirect.jpg`, `SCR/vt-music-gurukul-equirect.jpg` |
| 8 | Tour panorama "Eatery - Looters" (panorama_D2C9FBCF…) | same | Elevated view of TOTT, the Looters stall and the food court | Kiosk style, TOTT terrace, courtyard | `SCR/vt-looters-equirect.jpg` |
| 9 | Tour panorama "Drone Day View" (panorama_BB0577EA…), level 1 | same | Aerial looking west over Budh Bhawan; SAC hotspot at yaw -71.3 | Single-storey pavilions with salmon roofs, two blue-grey halls with solar panels, the curved east-hall roof, lawns, an amphitheatre | `SCR/vt-drone-day-L1-equirect.jpg`, `SCR/vt-drone-day-crop-sac.jpg` |
| 10 | Tour panoramas "Birla Aircraft" and "Gandhi Statue" | same | Neighbouring areas | Context only (the road toward the SAC); not used for the SAC geometry | `SCR/vt-birla-aircraft-equirect.jpg`, `SCR/vt-gandhi-statue-equirect.jpg` |
| 11 | Esri World Imagery tiles, zoom 18 (9 tiles) | https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/18/{y}/{x} (y 109520–109522, x 186110–186112) | Top-down view of the complex | Plan extents, orientation, pavilion grid. Georeferencing checked against the OSM Budh Bhawan outline (agrees within about 3 m). Zoom 19 returned placeholder tiles. | `SCR/sat/esri-z18.png`, `SCR/sat/esri-z18-overlay.png` (20 m grid, OSM SAC box in red, POIs in yellow), `SCR/sat/esri-sac-crop.png` |
| 12 | Wikipedia, "Birla Institute of Technology and Science, Pilani" | https://en.wikipedia.org/wiki/Birla_Institute_of_Technology_and_Science,_Pilani | Text | "the Student Activity Centre (SAC) cafeteria (301 °F, Looters, and Domino's)". Read up to character 100,000 of about 117,800. | none |
| 13 | SWD Physical Education and Sports notice, 01-11-2025 | https://swd.bits-pilani.ac.in/Files/Sports%20Notice_Winter.pdf | Indoor sports timetable | Indoor facilities: badminton, table tennis, squash, carrom, chess, martial arts, snooker, health club. The notice does **not** name the SAC as the venue. | none |
| 14 | YouTube "BITS Pilani, Pilani Campus - Official Campus Tour" (938 s) | https://www.youtube.com/watch?v=bkmKuEguTH8 | Title and description only | No chapters or timestamps. Frame capture failed: the watch page served mid-roll ads, and the embed player gave black frames. Frames deleted. | `SCR/yt/off-meta.json` |
| 15 | YouTube "BITS PILANI CAMPUS TOUR (2025-2026)", Pushkar Biltheria (508 s) | https://www.youtube.com/watch?v=XkDvacBC7zA | Title and description only | No chapters. The browser closed during frame capture; no usable frames. | `SCR/yt/psh-meta.json` |
| 16 | The game today | http://localhost:8080/?explore | Explorer captures | Section H | `SCR/game-sac-aerial.png`, `game-sac-from-se.png`, `game-sac-from-nw.png`, `game-sac-from-north.png`, `game-sac-from-south.png`, `game-sac-top.png`, `game-sac-auditorium-room.png`, `game-sac-auditorium-inside.png`, `game-sac-auditorium-inside-back.png`, `game-sac-tott.png`, `game-sheet.jpg` |

**Not accessed:**

- Google Maps and Google Earth (not tried; Esri imagery was used instead).
- Any YouTube video specific to the SAC (none found by search).
- Quora and Reddit (not searched).
- Wikimedia Commons (not searched).
- bits-pilani.ac.in campus-facilities pages: the Goa and Hyderabad pages were seen only as search snippets and are about other campuses, so they are not used.

## H. Comparison with the game today

**What the game has now** (js/world/bits-world.js `buildBuildings()`, FACADES.sac; captures in G16):

- the OSM rectangle extruded to 10 m;
- a `sac` facade texture: wall `#9fb0bc`, frame and band `#8e3b3b` (dark red), 3.6 m floors, so three rows of windows;
- a flat roof covered in solar panels;
- OSM grass patches that stick out from under the box (the south one overlaps the building);
- bare dirt everywhere else around it.

The TOTT area shows only the unrelated OSM "other" boxes further north (z 206..224).

The gameplay room inside is a closed box: cream walls, a wood floor, red bench blocks, a dark-wood stage with a red curtain on the west wall, and a door on the east.

**What matches:**

- The location and approximate extent of the central halls [visual estimate: the OSM box is within about 5 m of them].
- Blue-grey wall colour (close to the portico and wing plaster).
- Solar panels on the roof (present on both halls).
- The gameplay room's east door and west stage, which line up with the real east entrance and west mural wall.

**What is wrong:**

1. A three-storey office block. The real SAC is single-storey pavilions plus two tall halls.
2. Dark-red bands and frames. The real accent is salmon pink with a chevron frieze and white trim.
3. There is no portico, steps, ramp or forecourt.
4. The pavilion ring, the covered jali corridors, the courtyard lawns and the kiosk clusters are all missing.
5. The grass overlaps the building.
6. The interior is a generic theatre. The real hall is open-sided, with a stone floor and a mural.

**Ranked fixes** (most visible first; all for the build phase):

1. **Replace the 3-floor box with two hall volumes.**
   - West block: about 31 × 35 m, about 10 m tall, blue-grey sheet roof with solar strips.
   - East hall: about 31.5 × 24 m, curved roof, crown about 8 m, solar panels on the east half.
   - Open arcades along both long sides of the east hall.
   - No window rows.
2. **Add the east portico and forecourt.** See B2 for the details: battered grey-blue frame, salmon chevron frieze, terracotta medallion, oval-coffered soffit, the "BITS STUDENTS ACTIVITIES CENTRE" sign, wooden double door, 3–4 steps with a central ramp, sandstone lamp stands, topiary planters, and pink stamped paving running to the road at x ≈ -116.
3. **Add the single-storey pavilion ring.** Salmon or terracotta hipped roofs, cream and grey-blue walls, red-brick jali corridors, and courtyard lawns at z ≈ 279–289 and 315–328. Clip the OSM grass polygons so they no longer run under the halls.
4. **Re-dress the `auditorium` interior as the real hall.**
   - Grey Kota-stone floor with white and green inlay grid.
   - Granite-clad pillars and white segmental arches.
   - Curved steel truss ceiling with tube lights.
   - The mural wall and three maroon Students' Union honour boards on the west wall.
   - The wooden panelled double door with a notice board on the east wall.
   - A low stage platform and movable chairs.
5. **Add the TOTT and -301°F kiosk cluster.** About 6 × 6 m units with pyramid roofs, a raised terrace with red plastic chairs and long tables, and a paved courtyard with round tables running north to the Looters stall (neon "LOOTERS" sign, black shed).
6. **Add the south-east kiosk cluster with Jawed Habib Salon** (-131, 351).
7. **Optional interiors:** badminton (teal walls, green courts, red trusses) and TT (teal, blue tables), plus the martial-arts mezzanine and stair from D.

## I. Uncertainties and hand-offs

**Uncertainties:**

- Exact plan dimensions are ±4 m (satellite at about 0.53 m/px; georeference checked against Budh Bhawan). Heights are visual estimates only.
- Which sports room is in which part of the west block is unknown. Badminton, TT and squash could share it, or some may sit in pavilions.
- The mezzanine position and the stair are [unknown]; D is an approximation.
- Room assignments for the individual pavilions are unknown; the clusters are only roughly typed.
- The bearings derived from tour hotspot yaws do not agree across panoramas. Only relative directions inside the "SAC inside" panorama were used, and they are marked as approximations. The east-facing entrance rests on two things: (a) the "SAC inside" hotspot to the exterior sits on the wooden-door wall; (b) the mural can be seen through the portico doors from outside. Satellite and drone then place the portico on the east edge next to the north-south road (grey square block at about (-132, 300)).
- Whether an auditorium or stage hall exists anywhere in the SAC is [unknown]. None appears in the tour.
- Domino's (named on Wikipedia) was not located [unknown].
- The amphitheatre near the south-west was seen only in the drone view [unknown position].
- The dark long building at x -205..-176, z 242..253 is of unknown use.

**Hand-offs:**

- **`roads-paths`:** the north-south road east of the SAC (OSM x ≈ -114 at z 300) needs the pink stamped forecourt, bicycle racks and a crossing at the portico (z ≈ 300). The southern road at z ≈ 370–400 passes the amphitheatre.
- **`landscape-water`:** the two OSM grass polygons near the SAC overlap the halls; clip them to the courtyards (z ≈ 279–289 and 315–328). The food-court flowerbeds and trees belong there too.
- **`messes`:** Looters (OSM building x -183..-179, z 229..238) and the food court north of the SAC. This report describes Looters from the Looters panorama. If `messes` owns all eateries, it should take the Looters stall geometry, while `sac` keeps the TOTT and -301°F kiosks that form part of the SAC pavilion grid.
- **`hostels-ram-budh`:** Budh Bhawan faces the SAC entrance across the road. Budh Redi (-112, 256) and Da Cloud Cafe (-118, 209) are on that side.
- **`hostels-newer`:** Malviya-A and Malviya Mess are to the north.
- **`gates-landmarks`:** the Gandhi Statue roundabout panorama links toward the SAC; the mural boundary wall seen there is not part of the SAC.
- **The orchestrator:** the gameplay `auditorium` room can stay where it is (H, fix 4). Only cosmetic changes are proposed, with an optional shift of the door z by about -4 m to line up with the portico.

## Build notes

Module: `js/world/buildings/sac.js` (registered in `registry.js`), walk test `tests/browser/sac.mjs`. It replaces the OSM footprints "Student Activities Center (SAC)" and "Looters". Frame: the identity (world x, z), since the complex lines up with the campus axes.

**What is built** (plan as in C; sizes are the research's visual estimates):

- **West block** x -200..-170.5, z 290..325: eaves 9 m, ridge 10.6 m, north-south ridge, blue-grey sheet roof with three solar strips, low grilled windows plus a clerestory band. Inside (zone `sports`): the badminton hall (3 courts, nets, benches, rust-red trusses, tube lights), the Martial Arts mezzanine at P + 4.0 along the east wall (foam mats, punch bags, gallery wall with railed openings onto the courts) reached by a 22-riser straight stair along the north wall, the table-tennis hall (4 tables, E to play) through a partition door at x -178, and a squash court with a glass back wall. Doors north and south at x -186 with steps.
- **East hall** ("SAC inside") x -170.5..-140.5, z 291..317: hall plinth at P = 0.45 m, open arcades (7 granite piers, white segmental arches) north and south with three steps down to the lawns, curved roof (spring 6 m, crown 8 m) with solar panels on its east half, east wall with the wooden door on the room door's axis.
- **Gameplay room `auditorium`**: id, door, exit and spots unchanged (x -163.6..-145.6, z 296.6..312.6, door east at z 304.6). The hall is built round it: a lined enclosure at grade with three steps down from the plinth vestibule to its door, Kota floor overlay, the curtain mural over its stage wall and on the stage curtain, tube lights, yoga mats, a notice board. Aisles round it carry the honour boards (west wall), stacked chairs and mats. The room's own red bench blocks and stage come from bits-world and were left as they are (not in this module's files).
- **Lobby and portico** on the same axis (z 304.6, inside the research's ±4 m of z 300): battered grey-blue frame 8 m tall, salmon chevron frieze, terracotta medallion, oval-coffered soffit, the "BITS / STUDENTS ACTIVITIES CENTRE" sign, wooden doors folded open, glazed side doors, three steps either side of a central 1:11 ramp, topiary planters, sandstone lamp stands, pink stamped forecourt to the road with mats, bicycle racks and round planters.
- **East wings** either side of the lobby (closed; use unknown): hipped salmon roofs, deep white window surrounds, medallions.
- **Covered corridors** with red-brick jali (north z 279..282.5, south z 326.5..330, links to the hall corners, N-S spines through the pavilion clusters), **lawns** north and south of the hall (the two OSM grass polygons that ran under the halls are removed from `D.areas`), paved courts.
- **Club pavilions** 2 × 3 NW and 2 × 3 SW, barrel-vaulted inside: Gym, Gym 2, Snooker (zone `clubsN`); Dance Club, Classical Music & Dance, Music Room Gurukul (zone `clubsS`). The rest are closed "club rooms".
- **Kiosks**: TOTT terrace (raised paving, parapets, steps, long tables with red chairs, TOTT, Juice Corner, Stationery, -301°F), the SE cluster with Jawed Habib Salon; **Looters**: black shed, neon sign on a fascia above the tent canopy, counter (E to order), food court with round tables, flowerbeds and railings, and the dark dining shed west of it.

**Levels and stairs**: grade 0 (lawns, forecourt, the auditorium), hall plinth 0.45, pavilions 0.3, corridors 0.15, mezzanine 4.45. Every step is a walkable flight; door sills are walkable. The mezzanine stair rises 0.18 m per riser.

**Changes outside the building geometry** (all inside this module): the OSM point "Student Activities Center" is moved to the north end of the forecourt (-122, 285), so its campus label no longer floats inside the badminton hall (nor in front of the portico frieze) and the explorer drops visitors by the portico; campus trees are kept off the complex through `campus.statuePts`, except on the lawns.

**Approximations** beyond the research: room assignment inside the west block and pavilions, the mezzanine and stair position (D), the closed pavilions' use, the kiosk names other than TOTT, -301°F and Jawed Habib (Juice Corner, Stationery, General Store are placeholders), the dining shed's use.

**Tests**: `PORT=8103 node dev/server.mjs`, then `node tests/browser/sac.mjs OUTDIR http://localhost:8103/` (FULL=1 for the whole campus, PERF=1 for timing). It walks in by the portico steps and ramp, through the lobby and hall into the auditorium and out, up and down both arcades, into badminton, up and down the mezzanine stair, through to table tennis and out of the south door, into the Gym, Gym 2 and Dance Club, up onto the TOTT terrace, and checks walls that must block.

**Performance**: 49 merged meshes for the outside, 164 in all (interiors only drawn near them), about 76k triangles, under 1,000 colliders. Frame time against `?nomodules` stayed at the 16.7 ms vsync cap in every scene measured.
