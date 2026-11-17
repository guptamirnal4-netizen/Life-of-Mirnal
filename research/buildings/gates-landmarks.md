# Gates and landmarks: Main Gate, boundary wall, Saraswati Temple, G.D. Birla statue, other statues, Birla Museum, Pilani Gallery, Birla Aircraft

Research agent: `gates-landmarks`. Coordinates follow [COORDINATES.md](../COORDINATES.md) (x east, z south, metres, Rotunda origin).
Captures are in the session scratchpad at `scratchpad/research/gates-landmarks/` (not in the repo).

Tags: **[verified]** seen in a source I opened, **[visual estimate]** measured by eye from a photo or panorama, **[approximation]** a proposal for the game that is not evidenced, **[unknown]** not found.

The strongest evidence is the official 3DVista virtual tour. Its panoramas are labelled, and several are drone shots taken 10–25 m up. I pulled their cube faces (level 2, 1024 px per face) and stitched them. I did not reach YouTube frames, Google Maps or Wikimedia Commons during this pass (see G and I).

---

## 1. Main Gate

### A. Identification
- Name: Main Gate, BITS Pilani (tour panorama "Main Gate") [verified]. The OSM POI "Main Gate" is at (581.9, 267.3) [verified]. There is no OSM footprint.
- Roads at the POI [verified, OSM]: the town road (tertiary, 7 m) runs roughly north-east to south-west outside the gate through node (599.5, 265.8). A service road runs west into campus (599.5,265.8 → 437,289 → 214.7,323). A residential road branches north (→ 575,82).
- Orientation: the gate faces east onto the town road, and the campus lies to the west (−x) [verified from the OSM roads; the tour agrees: the town road with its median lamp posts runs across the view and a straight avenue enters the gate]. This matches the game's assumption that "the road runs through along x".

### B. Exterior (tour panorama "Main Gate", a drone about 8–10 m up on the town side; crops `crop-main-gate.jpg` and `crop-main-gate-2.jpg`)
- **It is not a masonry arch.** It is two tall square piers either side of the carriageway, with a flat steel **"WELCOME" banner board** spanning between them near the top. The board is white with dark blue lettering, has the BITS logo at the left end and a small coloured logo block at the right [verified].
- The piers are pinkish-red sandstone or red plaster, square, and taper in steps (a wider base, a shaft, stepped mouldings), each with a lantern or finial on top [verified]. Height about 6–7 m [visual estimate], against people about 1.7 m tall.
- Carriageway between the main piers: about 6–7 m [visual estimate]. A second, **shorter pier** (about 3 m [visual estimate]) stands on each side of the main pair, about 4 m further out.
- **Gate leaves**: brown or rust solid-panel leaves (wood or painted sheet steel) fill the bays between each tall and short pier. They were shut or folded in the photo, and traffic used the centre opening [verified]. **They are not green railings** [verified].
- Outside the gate: a zebra crossing across the approach, a tarmac apron, and roadside stalls and kiosks along the town road (blue kiosk, a "BITS" hoarding, tea stalls) [verified].
- Inside: a straight, tree-lined avenue with a white centre line [verified].
- Lighting: lanterns on the pier tops [verified]. Double-arm street lamps run on the town road's median [verified].
- Guard booth or boom barrier: **not visible** in this panorama [unknown]. Bicycles and parked two-wheelers sit just inside on the left [verified].

### C/D/E. Not applicable (no floors, stairs or interior).

### F. Gameplay
- Gate centre (582, 267). Spawn or arrival point (approximation): (570, 268), facing west into campus. The town-side apron spans x 584…600.
- Collision: two main piers about 1.2 × 1.2 m centred at z = 267 ± 3.6, two short piers at z = 267 ± 7.5, and leaf bays between them closed by colliders unless the leaves open [approximation].
- Keep the existing `gatePos` and `gateWall` hooks.

## 2. Boundary wall

### A/B. Exterior
- OSM `boundary`: 22 vertices, bbox x −405.5…683.1, z −395.1…1379.7 [verified].
- At the Main Gate the wall is **plain white or off-white plaster, about 2–2.2 m high, with a thin brick-red or maroon coping**. It has no pilasters and no stone plinth. A low wooden picket fence edges a strip of planting in front of it, and painted notice boards hang on it [verified, `crop-main-gate-2.jpg`; height is a visual estimate].
- Inside campus (tour "VFAST-Placement-Gate Connecting", `strip-gate-connecting.jpg`), the compound walls are **cream or ochre plaster with maroon coping**, about 1.5–1.8 m high. They curve into the gate openings and end in square piers topped with **urn finials**, carrying name boards (e.g. "VFAST HOSTEL") [verified; height is a visual estimate]. This is a secondary or internal gate.
- Other gates on the outer boundary (e.g. a back gate towards Vidya Vihar or the town): **[unknown]**. None is in OSM as a POI, and the tour has no panorama for one.

### F. Gameplay
- The game draws only about 33 m of wall each side of the Main Gate (`gateWall`). A full perimeter is optional. If added, use a thin box run along `D.boundary`, 2.1 m high, white with maroon coping [approximation]. Hand-off: whoever owns the ground and terrain.

---

## 3. Saraswati Temple (Sharda Peeth, "Birla Mandir")

### A. Identification
- Official names: Saraswati Temple, also Sharda Peeth or Saraswati Mandir. Dedicated to Saraswati and built by G.D. Birla [verified: bet.org.in, exoticindiadarshan blog, Wikipedia BITS article]. Year: 1959 per bet.org.in; other pages give 1956–1960 [verified that the sources disagree].
- OSM footprint (temple, h 12) [verified]: `[[96.8,707.6],[128.5,703.7],[120.2,646.2],[126.6,645.5],[125.1,636.9],[77.2,644.5],[78.5,652],[86.7,650.8]]`. The bbox is x 77…129, z 637…708, so about 51 × 71 m. The wider band at the north end (z 637…652, about 48 m wide) is the front terrace with its corner pavilions. The body to the south is about 33–40 m wide and slightly skewed (the long axis is rotated about 7–8° clockwise from north–south, following the outline).
- **Orientation: the entrance faces NORTH (−z)** [verified]. The tour drone ("Saraswati Temple", above the front steps) looks back along a straight axis: the temple front steps, then a red-sandstone patterned walkway, then the road, then the G.D. Birla statue under its chhatri, then a terraced garden and open ground, with the **Clock Tower on the horizon** (`crop-temple-axis.jpg`). The Clock Tower is at (−9, −62), which is north. bet.org.in and the exoticindia blog both say the Saraswati idol is in line of sight with the Clock Tower, with the G.D. Birla statue between them [verified]. **So the sanctum is at the SOUTH end and the porch and mandapa are at the NORTH end.**
- Nearby: the G.D. Birla statue (91.4, 572.6), about 65 m north across an east–west road; Birla Shishu Vihar to the west (x −2…51); Shiv Ganga to the south-east (164, 819).

### B. Exterior
- Material: **white Makrana marble** throughout [verified, bet.org.in and exoticindia]. The style is Nagara, said to be modelled on the Kandariya Mahadeva temple at Khajuraho [verified, tourism sources, quoted as a claim].
- Plinth: **about 7 ft (2.1 m) high** [verified, Wikipedia, bet.org.in]. The temple covers about 25,000 sq ft (2,300 m²) [verified]. That is consistent with a body about 18 × 60 m plus porches, not the full 51 × 71 m terrace [visual estimate].
- **Terrace (jagati)**: a large rectangular open platform paved in **white marble squares with grey joint lines in a grid**. Each tile is about 1 m with a small grey inset square [verified in drone faces `crop-temple-shikhara.jpg` and `crop-temple-down.jpg`; tile size is a visual estimate]. It has a **continuous white marble balustrade** along all edges, with taller posts and urn knobs at intervals of about 3–4 m [verified].
- **Corner pavilions**: small white chhatri-like pavilions with their own short stairs stand at the two front (north) corners of the terrace. A semicircular "sun" or chakra motif is inlaid on the paving beside each [verified, `crop-temple-down.jpg`]. Rear corner pavilions are probable (the shikhara crop shows small pavilions to the sides) [visual estimate].
- **Temple body** on the terrace centreline, from north to south [verified, drone]:
  1. a **stepped pyramidal base** with a straight flight of steps up to the entrance porch (ardha-mandapa);
  2. the porch with a carved doorway and small domed roof;
  3. the mandapa with a rounded, ribbed dome-like roof (samvarana);
  4. the antarala;
  5. the **main shikhara** over the sanctum, a clustered curvilinear Nagara spire built from many miniature spires (urushringas), with an amalaka and a **gold-plated copper kalash** finial [verified that the kalash is gold-plated, bet.org.in].
  The roofline rises in steps from the porch to the main spire, as at Khajuraho.
- Height of the main shikhara: **about 110 ft (33.5 m)** [verified, bet.org.in and exoticindia; secondary sources].
- Body width about 15–18 m, against a terrace about 40 m wide [visual estimate].
- Outer walls and columns carry **relief sculpture of gods, saints, scientists, philosophers and statesmen** [verified, text sources]. The plinth face shows carved panel friezes [verified, drone].
- **Front (north) stair from the ground to the terrace**: one central straight flight, about 3.5–4 m wide [visual estimate], **flanked by two pedestals carrying painted (saffron or brown) animal or figure sculptures** [verified that they are present; the species is unknown, probably elephants or lions]. At the bottom is a grey-paved forecourt, about 8 × 10 m [visual estimate], then the axial walkway.
- **Approach walkway**: about 4 m wide, **red (maroon) sandstone with cream inset squares and rectangles**, about 60 m long to the road [verified, tour "G.D. Birla Statue" and drone; width is a visual estimate]. It is flanked by palms, conifers (cypress or Thuja) and lawns, and edged by low **white ornamental railings with yellow ring motifs** [verified]. There are globe-top lamp posts at the walkway entrance [verified].
- Landscaping: formal lawns in rectangles with white-edged footpaths on both sides. Trees and flowering bushes (bougainvillea) are behind [verified].

### C. Floor layout
The text sources name five sections: Garbha Griha (sanctum), Pradakshinapath (circumambulatory path), Antarala, Mandapam and Ardha Mandapam [verified, bet.org.in and exoticindia]. The ASCII plan is an approximation built on that order and on the drone and interior evidence (north is up):

```
                       N  (towards G.D. Birla statue and Clock Tower)
        red walkway ║║
     ┌──────────────╨╨──────────────┐  forecourt (grey pavers)
     │   [statue] ▓stair▓ [statue]  │  front stair, plinth 2.1 m
 ┌───┴──────────────────────────────┴───┐
 │ [chhatri]   marble grid terrace  [chhatri]│ z≈637–652 (48 m wide)
 │        ┌────── ardha-mandapa ─────┐       │
 │        │   (porch, stepped base)  │       │
 │        ├────── mandapa ───────────┤       │  pillared hall,
 │  side  │ ░ pillars ░ lotus ░ ░    │ side  │  side window bays E and W
 │ window │ ░  inlay  ░  ░  ░  ░     │window │
 │        ├────── antarala ──────────┤       │
 │        │ ┌── pradakshina path ──┐ │       │
 │        │ │   GARBHA GRIHA       │ │       │  under main shikhara (~33 m)
 │        │ │   (Saraswati idol)   │ │       │
 │        │ └──────────────────────┘ │       │
 │        └──────────────────────────┘       │
 │   balustrade on all edges                 │ z≈704–708
 └───────────────────────────────────────────┘
                       S
```

### D. Staircases
- Ground to terrace: **one central north flight** [verified], about 13–14 risers of about 0.16 m to climb 2.1 m [approximation], about 3.6 m wide, with marble cheek walls and statue pedestals (no handrail seen) [visual estimate].
- Corner pavilions at the north corners have short flights [verified that they are present; I could not resolve whether they lead down to ground level].
- Terrace to temple floor: the **stepped pyramidal base** in front of the porch, about 5–7 steps [visual estimate].
- Other flights on the sides or back: **[unknown]**.

### E. Interior (tour "Saraswati Temple Inside", `tour-temple-inside.jpg`)
- Floor: **white marble squares laid diagonally**, with gold or brown border strips round the pillar bases and a **lotus inlay medallion** (pink petals, gold outer ring, dark centre) at the centre of the bay [verified].
- Pillars: **square, fluted white marble**, with carved bases, a band of figure brackets near the top, and corbelled bracket capitals with figures whose hands point up to the ceiling [verified; the capital figures also come from the exoticindia text]. Spacing about 3.5–4 m [visual estimate].
- Ceiling: flat marble beams with carved friezes (zigzag and beaded bands). Each bay has a **square coffer containing a carved concentric circular "lotus" dome** [verified]. Clear height about 4.5–5 m [visual estimate].
- Walls: plain white marble ashlar, with **side openings onto the terrace on the east and west** (square bays with pillar frames and low parapets) [verified].
- The sanctum is at the end of the long axis: a carved doorway frame and steps up, with the **Saraswati idol in white against a dark red backdrop** [verified]. The opposite end opens out to the porch, and daylight and the walkway are visible through it [verified].
- Furniture: almost none. One dark panel or board leans by the sanctum aisle [verified].

### F. Gameplay
- Make the temple **enterable**: the terrace, the porch, the mandapa, and the antarala up to a barrier at the sanctum door. The sanctum itself is a view-only end point [approximation].
- Entry point: the bottom of the front stair at about (104, 628), facing south (yaw towards +z) [approximation from the footprint's north edge at z ≈ 637–645].
- Collision: a walkable plinth top at y = 2.1 over the footprint, a balustrade ring about 1 m high on the outline, the front stair as walkable steps, and the temple body walls solid except the north door. Interior pillars are about 0.9 m square colliders [approximation].
- No existing gameplay room is hosted here, so nothing in `ROOM_HOSTS` changes.
- NPC walk area: the axial walkway, the forecourt and the terrace.
- Interactables: a bell or idol viewpoint at the sanctum door and a plaque at the stair [approximation].
- Camera: keep the third-person camera inside the mandapa's height of about 5 m [approximation].

---

## 4. G.D. Birla statue

- OSM POI "G.D. Birla Statu" at (91.4, 572.6) [verified]. The tour panorama is "G.D. Birla Statue".
- It is a **dark bronze standing figure of G.D. Birla under a white marble chhatri**. The chhatri has four slender columns, a cornice, and a ribbed dome with a finial [verified]. The figure stands on a tall white stepped pedestal, which sits on a **square red-sandstone base** about 4 × 4 m [visual estimate].
- Its lawn is about 25 × 20 m, enclosed by a low white railing. A narrow red path runs from the road kerb to it, on the temple axis [verified].
- Total height about 7–8 m [visual estimate]. It is **north of the east–west road**, and the temple walkway starts on the south side of the same road [verified].
- BITS news reports floral tributes paid at the statue of G.D. Birla "opposite Saraswati Mandir" [verified, search snippet of a bits-pilani.ac.in news item; I did not open the page itself].
- Behind it to the north is a terraced flower garden, with open ground and the Clock Tower further on [verified].

## 5. Gandhi and Patel statues (roundabouts)

- POIs "Gandhi" (−12.5, 359.2) and "Patel" (125.6, 338.7) [verified]. The tour panoramas are "Gandhi Statue" and "Patel Statue". Both are **roundabout statues** [verified].
- **Patel**: a dark bronze standing figure in a dhoti and shawl on a **tall white stepped marble pedestal** in a small round lawn at the centre of a five-way junction. Kerbs are painted black and white, and there are zebra crossings and a small guard kiosk with a conical roof [verified, `strip-patel-statue.jpg`].
- **Gandhi**: a dark bronze **walking Gandhi with a staff**, on a white pedestal with a plaque, in a round lawn at a junction [verified, `strip-gandhi-statue.jpg`]. A **long red relief mural wall** with a frieze of marching figures stands at the roadside beside it [verified that it is present; the subject probably shows the Dandi March but that is unknown].
- Pedestal height about 3 m and figure about 2.5 m [visual estimate].

## 6. Birla Museum, Pilani Gallery and Birla Aircraft

### A. Identification
- OSM "Birla Museum" (hall, h 14): bbox x −266…−176, z 26…74, about 90 × 47 m, an irregular E-shaped outline [verified]. OSM "Pilani Gallery" (hall, h 14): x −278…−244, z 76…106 [verified]. POI "Birla Aircraft" at (−207.7, 103.7) [verified].
- The tour labels the complex as "Birla Science Centre" (1–3, "Modern Transport Gallery"), "Birla Gallery – Dome", "Birla Gallery – Basement 1–4", "Pilani Gallery" and "Birla Aircraft" [verified, panorama list]. Text sources call it "India's first technological museum", from 1954 [verified, Wikipedia BITS article]. A search snippet says the building was designed by Stein and Polk of Calcutta and completed in 1964 [unverified secondary source].

### B. Exterior (tour "Birla Aircraft" drone and "Birla Science Centre")
- **Birla Aircraft**: a **silver, twin-engine, low-wing propeller airliner of the DC-3 or Dakota type**, displayed on a low pedestal on an open lawn [verified, drone]. The Deccan Herald (via search snippet) describes "the 14-seater Dakota aircraft used by G D Birla" [snippet only; the page returned 403]. Wingspan about 29 m and length about 19.7 m if it is a DC-3 [approximation].
- Around the lawn [verified, drone]:
  - a **long, low (1–2 storey) building whose whole roof is covered in solar panels**, with a white and ochre facade and a blue-trimmed entrance;
  - an **orange and yellow block** to the west;
  - a rectangular **reflecting pool or water channel** with a small pergola;
  - a **cream heritage building with arched windows** (two storeys) to the east;
  - red-paved paths.
- **Birla Science Centre** entrance (`strip-science-centre.jpg`): the facade is clad in **orange or terracotta tile**, with the lettering "BIRLA SCIENCE CENTRE / बिरला विज्ञान केंद्र" [verified]. It has a **white cylindrical drum porch on round columns**, yellow glazed doors, and a short flight of about 4–5 steps with steel handrails [verified]. In front is a hexagonal red and grey paver forecourt and a lawn with a metal sculpture [verified].
- Which OSM footprint is which building (museum, science centre, gallery) is **not certain** [unknown]. The game currently gives "Birla Museum" a 3–4 storey arched-window "heritage" facade at 14 m, while the drone shows the large building as a low hall with a solar roof [visual estimate].

### E. Interior
- **Pilani Gallery** (`strip-pilani-gallery.jpg`): a 360° **diorama of Rajasthani village life**. It has a painted desert-landscape cyclorama wall, a **fort gateway with crenellated towers**, life-size figures (guards in turbans, women in red odhnis, potters, a cow and calf), sand floors with shrubs, and a stone-edged central walkway. Two wooden doors lead in and out [verified].
- Science Centre and Birla Gallery interiors: panoramas exist ("Dome", "Basement 1–4") but I did not inspect them [unknown].

### F. Gameplay
- Add the Dakota as a static prop at (−208, 104), nose roughly north-west (the heading is a visual estimate), with a collider round its fuselage and wing roots [approximation].
- The museum is not a gameplay host. Making the Pilani Gallery diorama enterable later would be a strong set-piece [approximation].

---

## G. Sources

| Source | URL | What it shows | Confirms | Local capture |
| --- | --- | --- | --- | --- |
| BITS virtual tour, "Main Gate" | https://www.bits-pilani.ac.in/Pilani-Campus-Virtual-tour/index.htm (panorama_BD6A2022…) | drone 360° from the town side | pier gate, WELCOME banner, brown leaves, white wall with maroon coping, stalls | `tour-main-gate.jpg`, `crop-main-gate.jpg`, `crop-main-gate-2.jpg` |
| Tour, "VFAST-Placement-Gate Connecting" | same, panorama_D70B4346… | internal gate | cream walls, urn-finial piers | `tour-gate-connecting.jpg`, `strip-gate-connecting.jpg` |
| Tour, "Saraswati Temple" | same, panorama_D7119CAF… | drone above the front steps | north entrance, terrace grid, balustrade, chhatris, axis to statue and Clock Tower | `tour-temple.jpg`, `crop-temple-shikhara.jpg`, `crop-temple-axis.jpg`, `crop-temple-down.jpg` |
| Tour, "Saraswati Temple Inside" | same, panorama_BD622E09… | mandapa interior | pillars, floor, lotus inlay, ceiling coffer, sanctum, side bays | `tour-temple-inside.jpg` |
| Tour, "G.D. Birla Statue" | same, panorama_BD636E34… | ground level at the road | chhatri statue, red walkway, railings | `tour-gdbirla-statue.jpg` |
| Tour, "Patel Statue" and "Gandhi Statue" | same, panorama_D2647773… and panorama_D70E6B59… | drone over the roundabouts | bronze figures on white pedestals, mural wall | `tour-patel-statue.jpg`, `strip-patel-statue.jpg`, `tour-gandhi-statue.jpg`, `strip-gandhi-statue.jpg` |
| Tour, "Birla Aircraft" | same, panorama_9E1E5E0A… | drone over the museum lawn | DC-3 on a lawn, solar-roofed hall, pool | `tour-aircraft.jpg`, `strip-aircraft.jpg` |
| Tour, "Birla Science Centre" | same, panorama_C6B415E0… | entrance forecourt | terracotta facade, drum porch | `tour-science-centre.jpg`, `strip-science-centre.jpg` |
| Tour, "Pilani Gallery" | same, panorama_BD65841B… | interior | village diorama | `tour-pilani-gallery.jpg`, `strip-pilani-gallery.jpg` |
| Wikipedia, BITS Pilani | https://en.wikipedia.org/wiki/Birla_Institute_of_Technology_and_Science,_Pilani | text | temple: white marble, 7 ft foundation, 25,000 sq ft, 70 pillars; museum is India's first technological museum (1954) | none |
| Birla Education Trust, "Sharda Peeth Pilani" | https://bet.org.in/?p=2402 | text | 1959, Makrana marble, Nagara style, 70 pillars, five sections, 110 ft shikhar, gilt kalash, Clock Tower alignment | none |
| Exotic India Darshan blog | https://exoticindiadarshan.blogspot.com/2015/09/birla-mandir-in-sharda-peeth.html | text | the same facts, plus carved pillar brackets | none |
| OSM via `data/bits-campus.js` | repo | footprints, POIs, roads, boundary | coordinates | none |
| Game today | http://localhost:8080/?explore | explorer overviews and walks | current state | `game-main-gate-overview.png`, `game-walk-gate-from-inside.png`, `game-walk-gate-from-outside.png`, `game-saraswati-temple-overview.png`, `game-walk-temple-from-statue.png`, `game-g-d-birla-statu-overview.png`, `game-walk-statue.png`, `game-birla-museum-overview.png`, `game-birla-aircraft-overview.png`, `game-walk-museum-aircraft.png`, `game-patel-overview.png` |

All local captures are in `/private/tmp/claude-501/-Users-mirnal-Documents-Whisperflow/58e9866d-f336-43fa-bce9-096a63ba2c16/scratchpad/research/gates-landmarks/`.

## H. Comparison with the game today

**Matches**
- The Main Gate's position and orientation (east-facing, road along x) and a boundary wall either side.
- The temple sits on the correct OSM footprint, as a white marble platform with a curvilinear shikhara and corner chhatris.
- The Gandhi, Patel and G.D. Birla statues are at the right POIs as bronze figures on pedestals.

**Wrong** (`js/world/bits-world.js`)
1. **Temple orientation is reversed.** `buildTemple()` puts the sanctum at the north (`zs = -hd*0.25`) and the mandapa at the south "facing the entrance steps". The real entrance and porch face **north** towards the G.D. Birla statue and Clock Tower, and the sanctum is at the south.
2. **There is no temple approach.** The game is missing the north front stair with its two statue pedestals, the forecourt, the **red-sandstone axial walkway** with white railings and palms from the road to the stair, and the line of sight to the statue. In the game, a plain grey path runs off-axis (`game-walk-temple-from-statue.png`).
3. **The temple massing is off.** The real temple is a **narrow, long body on the centreline of a large open grid-paved terrace with a balustrade**, with the roofline stepping up from porch to mandapa to the main spire (about 33.5 m). The game has a squat box, a thin generic shikhara (about 35 m including the flag, so the height is fine) and a box mandapa. The terrace needs its marble grid texture and its **perimeter balustrade**. The plinth is 1.8 m in the game against 2.1 m real (minor).
4. **The Main Gate is the wrong design.** The game builds a cream Art Deco segmental arch carrying "BIRLA INSTITUTE OF TECHNOLOGY & SCIENCE", pedestrian arches and green railing leaves. The real gate is **two tall stepped pink-red sandstone piers with lantern tops, a flat "WELCOME" banner board between them, two shorter outer piers, and solid brown leaves**. The guard booth and boom are not evidenced.
5. **The boundary wall's look is wrong.** It should be white or off-white plaster with a **maroon coping**, about 2.1 m, with no pilasters or stone plinth, and a wooden picket fence and planting strip on the outside.
6. **The G.D. Birla statue has no chhatri.** It needs a white four-column domed canopy over the figure, a red square base, and a railing-fenced rectangular lawn rather than a 6 m round lawn.
7. **The Birla Aircraft is missing.** No Dakota stands at (−208, 104), and the POI label floats over bare ground.
8. **The museum facade is generic.** "Birla Museum" shows a 3–4 storey arched-window block at 14 m. Evidence points to a low hall with a solar roof plus a **terracotta-tiled Science Centre with a white drum porch**. Lawns, the reflecting pool and red paths are missing.
9. **The statue figures are generic blobs.** Patel and Gandhi need tall white stepped pedestals (about 3 m) and a recognisable silhouette: Gandhi walking with a staff, Patel standing in a shawl.

**Ranked most-visible fixes**
1. Flip the temple axis so it faces north, and add the north stair, its statue pedestals and the red axial walkway to the road opposite the G.D. Birla statue.
2. Rebuild the Main Gate as a pier-and-banner gate with brown leaves, and recolour the wall white with maroon coping.
3. Rebuild the temple massing: a slim long body, stepped rising roofs, a grid-paved terrace with a balustrade, and the plinth at 2.1 m.
4. Add the Dakota at (−208, 104) and the lawn around it.
5. Add the white chhatri canopy over the G.D. Birla statue.
6. Restyle the museum complex (solar-roof hall, terracotta Science Centre with drum porch).
7. Raise the statue pedestals and refine the statue silhouettes.

## I. Uncertainties and hand-offs

**Uncertainties**
- The exact Main Gate dimensions [visual estimate].
- Whether a guard booth or boom exists inside [unknown].
- Other gates on the perimeter [unknown].
- The temple's exact stair count, its rear and side stairs, and its interior plan dimensions [unknown or approximation].
- The species of the stair statues [unknown].
- Which OSM footprint is the museum, the Science Centre or the Birla Gallery [unknown].
- The Dakota's heading [visual estimate].
- The Wikipedia figure of "70 pillars" is from secondary sources.

**Not accessed**
- YouTube campus tours (no frames were captured in this pass).
- Google Maps and Google Earth.
- Wikimedia Commons.
- The Deccan Herald article (HTTP 403).
- The standalone Wikipedia pages for the temple and the museum (404).

**Hand-offs**
- The east–west road between the temple and the statue, the axial walkway lawns, and the roundabout geometry at the Gandhi and Patel statues go to the roads and landscape owner (`landscape-water`).
- Balaji Temple (320, 753) is a separate POI outside my list and goes to whoever owns C'not or the town edge.
- Birla Shishu Vihar and Birla Balika Vidyapeeth (schools) are not in my area.
- The Clock Tower alignment check (statue to Clock Tower) goes to the Main Building and Clock Tower owner.
