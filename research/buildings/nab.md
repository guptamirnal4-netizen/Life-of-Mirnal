# New Academic Block (NAB): research report

Agent `nab`. Area: both NAB blocks (OSM "New Academic Block", the west block, and OSM "NAB", the east block), the sunken central courtyard, the four entrance portals, classrooms, lecture theatres, labs, corridors, stairs, and the Mathematics and Economics & Finance POIs.

Tags: **[verified]** means seen in a source listed in G. **[visual estimate]** means judged from photos or panoramas. **[approximation]** means derived or proposed and not seen directly. **[unknown]** means not found.

Local captures are in `$S = /private/tmp/claude-501/-Users-mirnal-Documents-Whisperflow/58e9866d-f336-43fa-bce9-096a63ba2c16/scratchpad/research/nab/`. None of them are in the repo.

---

## 0. The one thing to know first

**NAB is underground.** Hafeez Contractor designed it as an earth-sheltered (subterranean) building so that it would not block the visual axis from the Clock Tower to the Saraswati Mandir [verified: worldarchitecture.org, constructionworld.in, hafeezcontractor.com].

- The two OSM footprints are **green roofs at campus ground level**, about 65,000 sq ft of lawn and planting with railings and skylights [verified].
- The facades are only visible from three places [verified: photos, 360° tour]:
  - the **sunken central courtyard** between the blocks, with the winding "Snake Path";
  - the **sunken outer light-wells**, behind sloped grass embankments, along Ram Marg (west) and Krishna Marg (east);
  - the sunken **Rotunda** at the north end.
- Above ground there are only **four entrance portals**: tall buff boxes with cusped Rajasthani arches, with stairs going down [verified].
- The game today extrudes both blocks **6.6 m up from y = 0**, with grey concrete walls and windows on the outside. That is the opposite of the real thing, and it is the biggest visual error in this area (see H).

---

## A. Identification

| | West block | East block |
|---|---|---|
| OSM name | `New Academic Block` | `NAB` |
| Official name | New Academic Building / New Academic Block (NAB). There is a single official name for both blocks [verified: timetable map title "New Academic Building (NAB)"; faculty pages "New Academic Building (NAB)"]. | same |
| Category | academic; data `h = 6.6` | academic; data `h = 6.6` |
| OSM bounds (game m) | x -32…29, z 33…278 | x 15…89, z 26…270 |
| OSM area | 5,692 m² | 6,056 m² |
| Room number range, level -01 | 6151–6170 (+6154A) | 6101–6121 |
| Room number range, level -02 | 6065–6069 | 6011–6021 |
| Side road | Ram Marg (west) | Krishna Marg (east) |

The block assignment comes from the official plan: Krishna Marg is printed along the top of the plan, Ram Marg along the bottom, and Gandhi Marg at the south end. In the game data, Krishna Marg runs at x ≈ 76–123, east of the NAB [verified: `data/bits-campus.js` road "Krishna Marg"].

- **Dates and builders:**
  - Designed 2011, completed 2014; inaugurated April 2014 [verified: worldarchitecture.org; BITS 2013-14 newsletter search snippet].
  - Architect Hafeez Contractor. Structural engineer Mehro Consultants. Contractor Shapoorji Pallonji [verified].
- **Size:**
  - Built-up area 160,087 sq ft (about 14,870 m²) [verified].
  - 23 classrooms, seminar rooms, lecture-theatre halls, a 212-seat performance auditorium, and CSIS and EEE computing labs [verified: constructionworld.in].
  - The OSM roof footprints add up to about 11,750 m². That is consistent with roughly 1.3 floors' worth of floor area, which fits a partly two-level building [approximation].
- **Orientation:**
  - Both blocks run along the Clock Tower → Saraswati Temple axis, which is **8.8° east of due south** [verified: computed from the OSM footprint edges and the POI positions; the footprint edges match to within 0.1°].
  - Useful local frame:
    - `s` = metres along the axis (south), measured from the north end of the blocks.
    - `t` = metres across it (east), measured from the outer west face of the west block.
    - World conversion: `x = -32.2 + 0.1530·s + 0.9882·t`, `z = 37 + 0.9882·s − 0.1530·t`.
  - In this frame the OSM data shows:
    - west block: s 0…243, t ≈ 0…30 (notched to t ≈ 7…29 in the south);
    - **central courtyard: t ≈ 30…47.5 (about 17 m wide)**;
    - east block: s 0…243, t ≈ 47.5…85 [verified: OSM].
- **Neighbours:**
  - North: the Rotunda (0, 0) and the Clock Tower/Main Building. Owned by `main-building`.
  - West, across Ram Marg: Ram Bhawan and Budh Bhawan.
  - East, across Krishna Marg: Krishna Bhawan and Gandhi Bhawan.
  - South: the courtyard ramps up to Gandhi Marg, with the Gandhi statue at about (−12, 359) and the Patel statue at about (126, 339). The plan shows the Patel statue at the Krishna Marg corner and the Mahatma Gandhi statue at the Ram Marg corner [verified: plan labels].
  - At the north end the plan shows the Shri Jawaharlal Nehru statue (Krishna side) and the Dr. Rajendra Prasad statue (Ram side) [verified: plan labels].

---

## B. Exterior

### B1. Section: what sits where in height

Section across both blocks, looking north. This is a schematic, not to scale [approximation built from verified elements]:

```
 Ram Marg                                                                    Krishna Marg
  y=0 ___      roof lawn (y≈0) + railings      ___        ___   roof lawn   ___ y=0
        \embankment |████ W block ████|  sunken  |████ E block ████| embankment/
         \ (grass)  |  lvl -01 rooms  | courtyard|  lvl -01 rooms  |  (grass) /
          \__well___|  lvl -02 (S half)|  (Snake  | lvl -02 (S half)|__well___/
            outer light-well           |   Path)  |           outer light-well
```

- **Outer light-wells:**
  - The slope of the grass embankment is visible down to a narrow paved strip in front of the outer facade.
  - The outer corridor of the upper storey has a balcony railing [verified: hc-9].
  - IPC-lab windows look straight out onto the grassed embankment and a railing [verified: 360° "Information Processing Centre Lab"].
- **Courtyard:**
  - In the south half it shows two storeys, with columns and fins [verified: hc-banner, hc-3, hc-4, 360° "NAB Connecting"].
  - **Level -02 exists only in the south half**, from about s 105 / z ≈ 140 southward. The official "Layout plan LVL (-02)" shows rooms only there [verified: plan]. The north half is a single level (-01) under the roof, and the north courtyard is one level higher than the south courtyard [approximation from the plan: the lvl -02 plan stops there, and curved stepped bands and chevron-hatched ramps cross the courtyard between the LTs and 6111/6165].
- **Proposed levels.** Nothing gives a measured depth [unknown]. These come from stair counts and photos:

  | Level | Proposed y | Basis |
  |---|---|---|
  | roof / campus ground | 0 | lawn level matches the surrounding grass [visual estimate: hc-9, NAB drone pano] |
  | roof edge railing | +1.1 | [visual estimate] |
  | level -01 floor (rooms 61xx, north courtyard, Rotunda floor) | **−4.5** | about 25 risers from the Rotunda floor up to the Clock Tower forecourt (hc-8), and a Rotunda perimeter wall of about 4 m (360° "Rotunda") [visual estimate] |
  | level -02 floor (rooms 60xx, south courtyard) | **−9.0** | two-storey courtyard facades (hc-4: storey ≈ 4–4.5 m) [visual estimate] |
  | floor-to-floor | **4.5 m** | [visual estimate] |
  | classroom clear height to the false ceiling | ≈ 3.4–3.8 m | [visual estimate: 120-seater pano] |
  | labs | ≈ 4+ m, exposed beams with deep coffers | [visual estimate] |

### B2. Footprint check against OSM

- Plan-derived dimensions match OSM [verified by measurement]:
  - courtyard width: plan 16.5–17 m, OSM 17 m;
  - block depth across t: about 27–30 m each, in both;
  - block length: about 243 m, in both.
- The four OSM steps ways ("Ram Stairs", "Krishna Stairs", "Budh Stairs", "Gandhi Stairs") are exactly the **four portal bridges/stairs** [verified: they cross the embankment perpendicular to the axis at s ≈ 67, 67, 185, 195, which matches the plan portals 01, 02, 03, 04].
- The OSM outline is a roof outline. It leaves out:
  - the outer light-wells (about 3–6 m strips beyond each outer face) [approximation];
  - the embankments.

  The west block's notches at s 110–233 (t 3–15) match the internal light courts drawn south of 6165–6170 [verified: plan and OSM shape]. **No correction to OSM is needed.** Just treat the polygons as roof slabs.

### B3. Materials and colours (exposed courtyard and light-well faces)

| Element | Description | Colour (suggested hex) |
|---|---|---|
| Walls | smooth render or GRC panel, buff/sand ochre | `#dcbf8c` … `#e6cc9a` [visual estimate: hc-4, hc-6, NAB Connecting] |
| Vertical fins / screens | groups of 3–5 tall white flat fins (about 0.3 × 0.6 m) in front of the corridors, rising one or two storeys, some framed by a white U-frame. These are the "vertical fins under the projections" [verified: constructionworld.in; seen in hc-banner, hc-4] | `#f1eee6` |
| Round columns | tall white/cream cylindrical columns (about 0.6 m diameter) carrying the cantilevered roof canopies at the corridor bays and staircases [verified: hc-5, hc-6] | `#efe8d8` |
| Windows | punched windows set in deep reveals. **Bright red (vermilion) reveal or side panel** on one jamb, dark tinted double glazing, grey frames [verified: hc-4, hc-6, NAB Connecting] | red `#c0302a`, glass `#2c3640` |
| Roof edge | white fascia band and canopy soffit; stainless/grey steel railing with planter boxes behind it [verified: hc-banner, hc-4] | `#f4f1ea`, railing `#8d9296` |
| Stair railings (courtyard stairs) | red/maroon steel balustrades [verified: hc-4] | `#8e2b25` |
| Doors to rooms | light wood (maple-tone) flush double leaves with vision panels [verified: hc-5, NAB Connecting, 120-seater] | `#d2a86a` |
| Corridor floor | grey-green Kota stone with **ochre (Jaisalmer-type) inlay strips** in a dashed pattern [verified: hc-5; the same floor in every interior pano]. Kotah, Dholpur and Jaisalmer stone are named as local materials [verified: constructionworld.in] | grey `#8f9a90`, strip `#d39a3c` |
| Courtyard paving | Snake Path in grey stone with red-sandstone (Dholpur-type) edging bands; red-brick-look paving zones around the south blocks [verified: hc-banner path edges; plan hatching] | `#a8a49a`, edge `#b4553a` |
| Portals | tall square buff/yellow pavilions with a white **cusped (multifoil) Rajput arch**, lit warm at night; stairs go down through them [verified: hc-10, hc-11, 360° NAB drone] | `#e7c675`, arch trim `#f5e7b8` |
| Embankments | grass slopes (Wedelia creeper per the architect) with shrubs [verified] | |
| Roof landscape | lawn, shrub beds, bougainvillea/pink flower beds, gravel and paths, rectangular skylight/cut-outs [verified: hc-thumbnail, NAB drone pano down-face, ESRI aerial] | |

### B4. Entrances

1. **Portal 01** (west, Ram Marg), at the OSM "Ram Stairs" (−25,103)→(−53,107). It sits at road level at about (−53,108) and comes down to the block's outer face at about (−25,104) [verified: OSM + plan].
2. **Portal 02** (east, Krishna Marg), at the "Krishna Stairs" (56,92)→(84,89) [verified].
3. **Portal 03** (west), at the "Budh Stairs" (8,218)→(−34,224) [verified].
4. **Portal 04** (east), at the "Gandhi Stairs" (70,219)→(104,214) [verified].

Each portal is:

- a pavilion on the embankment edge at road level (hc-9 shows it about 2 storeys tall with slot openings) [verified];
- then a bridge/stair across the outer light-well [verified: hc-9; plan hatching];
- then a **cross-corridor straight through the block to the courtyard at level -01** [verified: plan; hc-10 shows the view from the portal down the stair into a stone corridor].

In the south, portals 03 and 04 also have a stair inside the cross-corridor down to level -02 [verified: plan symbols on both levels].

Other entrances:

5. **The Rotunda.** At the north end the north courtyard opens into the sunken Rotunda at level -01 [verified: aerial photo, 360° Rotunda]. Owned by `main-building`.
6. **The South side ramp.** The Snake Path climbs from the level -02 courtyard to Gandhi Marg at about (55, 349), over about 80 m of sloping lawn between flared green embankments [verified: plan label "SOUTH SIDE RAMP"; hc-3 shows the path climbing toward the temple].
7. **Pale paved strips** from Krishna Marg and Ram Marg reach the south end of each block, at s ≈ 240–250 [verified on the plan]. Their purpose is unknown: a service path or an accessible ramp [unknown].
8. **The service bank** at the north-east of 6110/6111, with a pale strip from Krishna Marg [verified: plan label "SERVICE BANK"]. Its purpose is [unknown]; it may be a service entry for the plant.

### B5. Lighting and landscaping

- **Lighting:**
  - low bollard lights along the Snake Path [verified: hc-3, hc-banner];
  - wall lights at the portals and warm uplight in the arches [verified: hc-11];
  - fire hydrant cabinets (red) at intervals along the courtyard [verified: hc-banner, hc-4, hc-6].
- **Courtyard planting:**
  - grass panels with tall tropical clumps (cannas or heliconia-like), ornamental grasses and small trees;
  - three to five side paths branch from the Snake Path to the corridor entrances [verified: plan and photos].

---

## C. Floor-by-floor layout

All positions come from the official plan, scaled onto the OSM frame using the four portal stairs and the block ends as anchors. Accuracy is about ±6 m along `s` and ±2 m across `t` [approximation]. The coordinates are game metres (x, z) at the centre of each zone.

### C1. Level -01 ("ground floor", room numbers 61xx; floor y ≈ −4.5)

Read the plan with **north on the left**. Top = east block (Krishna Marg); bottom = west block (Ram Marg).

```
 s→  0          31  34        61 62-68 67      85     105  108-122  128                 190 190-197 198          243
     ┌───────────┐  ┌──────────┐  ║  ┌──────▷◁──────┐ ┌─SB─┐ ┌──────────────────────┐ ║  ┌──────faculty 6120/6121┐
EAST │6104 │6103 │  │6108│6107 │  P02│ 6109 ▷◁ 6110 │ │6111│ │6115│6114│6119│6118   │P04 │A P   N M L  Q R S T U │6121 tower
 t72 │6101 │6102 │  │6105│6106 │  ║  │ (fan LT pair)│ │A B C│ │6112│6113│6116│6117   │ ║  │E F..K  P O N M L K J │lift
 t50 └───────────┘  └──────────┘  ║  └──────────────┘ └────┘ └──────────────────────┘ ║  └───────────────────────┘
 t47 ===== corridor + white fins ======================================================================
     ~~~~~~~~ COURTYARD lvl -01 (Snake Path) ~~~~~ steps/ramps ⤵ ~~~~~~ COURTYARD lvl -02 (seen below) ~~~~→ South side ramp
 t30 ===== corridor + white fins ======================================================================
 t27 ┌───────────┐  ┌──────────┐  ║  ┌─────────┐ ┌──────▷◁──────┐ ┌───────────────────────┐ ║ ┌──────────────6168──┬────┐
WEST │6151 │6152 │  │6155│6156 │ P01│6159│6160│ │ 6163 ▷◁ 6164 │ │6165 │A-I / P-J cells  │P03│A..K1K3 │ K2 │6169│
 t3  │6154 │6153 │  │6158│6157 │  ║ │6162│6161│ │ (fan LT pair)│ │6166 A-H, lift │6167A│ ║ │V..Q P..K      └6170 A-J, E
     └───────────┘  └──────────┘  ║  └─────────┘ └──────────────┘ └───────────────────────┘ ║ └─────────────────────────
 6154A sits outside the NW corner, beside the Rotunda seating (s −9…3).
```

Zone centres (game x, z) [approximation ±6 m]:

| Zone | s | t | centre (x, z) |
|---|---|---|---|
| 6101–6104 (4 classrooms, 2×2) | 3–31 | 50–72 | (31, 44) |
| 6105–6108 (4 classrooms) | 34–61 | 50–72 | (35, 75) |
| N cross-corridor / Portal 02 | 62–68 | 47–77 | (39, 92) |
| LT 6109 / LT 6110 (bow-tie pair, stages back to back at the waist, small rooms 6110C/D between) | 67–105 | 47–73 | (39,103) / (42,122) |
| 6111 (+ cells A–F) and the service bank | 105–122 | 50–77 | (48, 139) |
| 6112–6119 (8 rooms) | 128–190 | 50–72 | (52, 185) |
| S cross-corridor / Portal 04 | 190–197 | 47–77 | (59, 219) |
| 6120 / 6121 faculty-chamber wing (cells A–Z) | 198–243 | 50–77 | (64, 245) |
| 6151–6154 (4 classrooms) | 3–31 | 3–27 | (−15, 52) |
| 6154A | −9–3 | −3–6 | (−31, 34) |
| 6155–6158 (4 classrooms) | 34–61 | 3–27 | (−10, 82) |
| N cross-corridor / Portal 01 | 62–68 | 0–30 | (−7, 99) |
| 6159–6162 (4 classrooms) | 67–91 | 3–27 | (−5, 113) |
| LT 6163 / LT 6164 (bow-tie pair) | 94–120 | 3–30 | (0, 140) |
| 6165 (large room) + 6166 cells A–H + lift; 6167A | 127–176 | 3–27 | (6, 184) |
| S cross-corridor / Portal 03 | 177–184 | 0–30 | (10, 213) |
| 6168 cells A–V/K1–K4, 6169 (large room), 6170 cells A–J | 185–243 | 3–27 | (15, 246) |

- **Classroom size:** typically about 13 m (along s) × 11–12 m [approximation: plan scale]. That is consistent with the "120 Seater NAB Classroom" panorama.
- **Fan LT halls** are about 18–20 m × 26 m each [approximation]. The lvl -02 plan draws the 6163/6164 outline as a grey silhouette at the lower level too, which suggests these halls are double height and raked down toward level -02 [approximation].
- **Toilets:** the plan's WC symbols mark a pair between every 2×2 cluster, in the small rooms "E/C/D" between 6103 and 6104 and similar [verified: icons].
- **Lifts** are marked in 6121, 6166 and 6170, and at level -02 in 6021, 6066 and 6069 [verified: plan text "LIFT"].

### C2. Level -02 (rooms 60xx; floor y ≈ −9.0; south half only)

```
EAST (under/next to 6111–6121): 6011 (cells A–H) │ 6012 6013 6014A/B 6015 │ 6016 6017 6018 6019 │ P04 stair │ 6020 cells A–Q │ 6021 cells B–Q, room "A" (big) + lift
     ~~~~ lower courtyard, Snake Path, cross paths every ~20 m, ends in the South side ramp to Gandhi Marg ~~~~
WEST (under/next to 6165–6170): 6065 │ 6066 (A–D + lift) │ 6067 cells A–T │ P03 stair │ 6068 cells A–Y │ 6069 cells A–H + 6070? cells A–I, F (big)
```

- The plan prints "6070" in red in the lvl -02 west-end cluster, and "6170" at level -01 [verified]. The two may be stacked.
- Dimensions for level -02 are not given separately. Use the level -01 zone positions south of s ≈ 105 [approximation].

### C3. Department POIs

- **Mathematics:** HoD office **6067-H, NAB** [verified: bits-pilani.ac.in Mathematics page]. 6067 is the level -02 west cluster at about s 147–178. The OSM POI "Mathematics Department" at (11.7, 204) is s 172, t 18 [verified: OSM], so **the POI and the room agree** [approximation ±6 m].
  - The 360° tour has a "Mathematics Lab" panorama hot-linked from "NAB Connecting" [verified]. That it sits inside the NAB is likely but not stated [approximation].
- **Economics & Finance:** HoD room **6165-I, NAB** [verified: bits-pilani.ac.in/pilani/krishna-m]. Another faculty page cited "6165 N – NAB" [not opened: it returned 404]. The 6165 cluster is at level -01, s ≈ 127–176, around (6, 184).
  - The OSM POI is at (18.9, 251.8), which is s 220, the 6168/6169 cluster. **The POI is about 45 m south of the room the HoD page gives.** Either the POI is misplaced or the department also uses 6168/6169 [unknown]. I suggest placing the in-game department sign at the 6165 cluster.
  - The 360° "Economics & Finance Lab" is hot-linked from "NAB Connecting" [verified].
- **Other tenants** hot-linked from "NAB Connecting" in the tour [verified]: Information Processing Centre Lab, Computer Science & Information System Lab, Management Studies Lab, Humanities and Social Sciences Lab, the 120 Seater NAB Classroom and the **J.C. Chaudhry Auditorium (NAB)**.
  - The architect lists CSIS and EEE computing labs [verified].
  - BITSoM says most management lectures are held in the NAB [verified: search snippet of dom.bits-pilani.ac.in; page not opened, so treat as unconfirmed].
  - Which room numbers these labs occupy is [unknown].

### C4. Rooms in use as classrooms (timetable evidence)

The Summer Term 2025-26 timetable lists these as lecture or tutorial rooms [verified: PDF text]: 6013, 6016, 6101–6105, 6107–6109, 6114, 6116–6118, 6151–6157, 6160–6162. That is 26 distinct NAB rooms in one term's timetable.

---

## D. Staircases

Seen directly:

- **(a)** the grand courtyard stair between two blocks under a canopy on round columns, about 20+ risers in one wide straight flight, going up from the lower courtyard (hc-6);
- **(b)** open dog-leg stairs in recessed bays off the courtyard corridor, with red steel railings (hc-4);
- **(c)** the portal stairs: long straight flights inside the arched portal, about 25+ risers with side cheek walls (hc-10, hc-11);
- **(d)** the Rotunda-to-Clock-Tower stair (hc-8; owned by `main-building`).

The rest comes from plan symbols. Count and positions [verified symbols / approximation positions]:

| # | Where | Connects | Type (proposed) |
|---|---|---|---|
| S1–S2 | Portal 01 and 02 bridges, s ≈ 67 (west portal at road x ≈ −53…−25, z ≈ 104–108; east portal at x ≈ 56…84, z ≈ 89–92) | road y = 0 ↔ level -01 cross-corridor | straight flight about 2.6 m wide [visual estimate], 4.5 m rise = 27 risers; split as 2 × 14 with a mid-landing |
| S3–S4 | Portal 03 and 04, s ≈ 185 / 195 | road ↔ level -01, then a second flight in the cross-corridor ↔ level -02 | 2 flights per stop, 4.5 m each |
| S5 | between 6111 and 6112 (east), about (43, 150) | level -01 corridor ↔ level -02 paved terrace | straight flight running along t |
| S6 | between 6164 and 6165 (west), about (12, 158) | the same, on the west | straight flight |
| S7–S8 | south end walls of both blocks (s ≈ 243), along the courtyard face | levels -01 ↔ -02, and out to the South-ramp lawns | long straight flight |
| S9 | the canopy stair (hc-6), probably at the north–south courtyard step, s ≈ 100–125 | north courtyard -01 ↔ south courtyard -02 | wide straight flight, 27 risers [approximation of position] |
| S10+ | small flights at the LT entries (6109B, 6110B, 6163, 6164 corners) | into the raked halls | short flights |
| — | curved landscape steps and chevron-hatched ramps in the courtyard, s ≈ 75–125 | courtyard -01 ↔ -02 | stepped terraces plus a ramp along the Snake Path |
| Lifts | 6121, 6166, 6170 (level -01); 6021, 6066, 6069 (level -02) | -01 ↔ -02 (and possibly the roof) | [verified symbols] |

- **Railings:** red/maroon steel with vertical balusters on the courtyard stairs [verified: hc-4]. The portal stairs have solid side walls [verified: hc-10, hc-11].
- **Treads:** grey Kota stone with a nosing [verified: hc-8, hc-10].
- **Width:** 1.8–3 m [visual estimate].
- **Game recipe:** use the existing stair system (`RISE = FH/16`, `TREAD = 0.27`) with FH = 4.5. That gives 16 risers of 0.28 m. Those are too steep for real stairs, but they match the game convention. A truer option is RISE = 0.16 with 28 risers per storey [approximation].

---

## E. Interior

Seen directly in the 360° panoramas:

- **Classroom ("120 Seater NAB Classroom")** [verified]:
  - Front wall painted **ochre/yellow** (`#e8b84a`), other walls off-white.
  - **Raised wooden-floored dais** across the front, about 0.3 m high, with a lectern desk and computer monitor.
  - Wide **black chalkboard**, with a **motorised projection screen** above it and a ceiling-mounted projector.
  - A **red LED digital clock** above the board.
  - Rows of **fixed light-wood bench desks** with **brown moulded plastic chairs**, in three blocks with two aisles; the floor is flat.
  - **Grid-perforated acoustic ceiling tiles** with recessed 2×2 louvred fittings, plus ceiling fans and AC grilles.
  - Grey Kota floor with ochre strips.
  - Light-wood door with a vision panel; tall windows with roller blinds; a notice frame by the door.
- **J.C. Chaudhry Auditorium (NAB)** [verified]:
  - Fan-shaped plan with curved, raked rows of **grey upholstered tip-up seats**.
  - Side and rear walls in **ochre/golden grooved wood-panel cladding** with perforated acoustic panels.
  - Two pairs of **dark-wood double doors** flanking a small stage with dark-blue curtains, a lectern and a white projection screen.
  - **Curved stepped false ceiling** with many downlights; a central projector.
  - Matches the "212-seat performance auditorium" [approximation: the seat count is not verified for this room]. It probably occupies one of the four bow-tie halls 6109/6110/6163/6164 [approximation]. Which one is [unknown].
- **Labs (Mathematics Lab, IPC Lab, CSIS Lab)** [verified]:
  - Double-height-feel rooms with **exposed concrete beams and deep coffers**, partly dropped ceilings, pendant linear lights and ceiling fans.
  - Columns inside the room.
  - Workstations in **blue / red / orange fabric-panel cubicles**.
  - Whiteboards and a projector screen; filing cabinets.
  - Windows onto the **grass embankment of the light-well**.
  - The same Kota and ochre-strip floor.
- **Economics & Finance Lab** [verified]: a smaller room (about 8 × 6 m) with light-wood desks, black mesh chairs, a wall-mounted display in an oak frame, a flip-chart whiteboard, aluminium-and-glass partition walls and an acoustic ceiling.
- **Corridors** [verified: hc-5, NAB Connecting]:
  - Open-sided colonnade corridors along the courtyard, about 3–4 m wide, under the cantilevered roof.
  - The floor pattern has ochre dashes in a herringbone/stagger pattern.
  - White columns; light-wood double doors to the rooms; small high windows.
- **Room signage** [unknown]: no close-up of a door number plate was seen. Use 4-digit numbers on a small plate beside each door, following the official scheme: digit 1 = 6 (NAB), digit 2 = level (0 = lower / −02, 1 = −01 "ground"), digits 3–4 = serial [verified: timetable legend].

---

## F. Gameplay proposal

### F1. Key constraint: the engine has no ground below y = 0

`player.floorAt()` starts at `floor = 0`, so the player can never stand below y = 0. A colliders-only sunken courtyard will not work [verified: `js/world/player.js` `floorAt`].

There are two ways to deal with it:

- **Option A (faithful).** Add an engine-level "ground override" for NAB zones: a list of polygons with their own ground height (−4.5 / −9.0), consulted by `floorAt` and NPC nav before the 0 default. The ground mesh then needs holes, which is the job of `landscape-water` / `roads-paths`. Integration owns this change.
- **Option B (cheap).** Keep floors at y = 0 and **raise everything else**: build the roof lawns as raised berms to y = +4.5 (+9 in the south) with grass embankment slopes, and the portals as stairs going *up*.
  - This keeps the current rooms working.
  - But from Krishna Marg and Ram Marg the NAB becomes a 4.5–9 m green mound instead of flat lawn, so it looks wrong from outside.
  - **Recommended only as an interim step.**

### F2. Entry and exit points (game coordinates)

These assume Option A; for Option B add +4.5 m.

| Entry | Road-level end | Building-face end | Level reached |
|---|---|---|---|
| Portal 01 (Ram Stairs) | (−53, 108) | (−25, 104) | -01 at (−7, 99) |
| Portal 02 (Krishna Stairs) | (84, 89) | (56, 92) | -01 at (39, 92) |
| Portal 03 (Budh Stairs) | (−34, 224) | (8, 218) | -01 at (10, 213), then the stair to -02 |
| Portal 04 (Gandhi Stairs) | (104, 214) | (70, 219) | -01 at (59, 219), then the stair to -02 |
| Rotunda | Rotunda floor about (0, 15) | courtyard north (6, 31) | -01 |
| South ramp | Gandhi Marg (55, 349) | courtyard south (43, 271) | ramp to -02 |

All are [approximation ±5 m], anchored on [verified] OSM steps ways.

- **Spawn:** "Walk here" for NAB should drop the player at the Portal 02 head, (84, 89), facing west, or in the north courtyard at (13, 76) facing south [approximation].
- **Collision:**
  - outer facades along the OSM rings;
  - courtyard-face corridor columns every 4–5 m;
  - light-well railings along the embankment tops;
  - roof-edge railings at y 0…1.1 around the courtyard and light-wells, so the player cannot walk off the roof lawn;
  - the roof lawn itself is walkable at y = 0.
- **Interior culling:** keep the current rule (interiors only within about 15 m). Courtyard facades are exteriors and always render.

### F3. Enterable rooms (the brief asks for 15–20)

There are 18 listed below, all [approximation positions]:

1. **Lecture Theatre 6163** (west fan hall) — **host for the existing `classroom` "NAB · Lecture Theatre"**. The current box (x −14.2…1.8, z 146.1…156.1, door south) already sits at the 6163/6164–6165 boundary, s ≈ 113–125. Move it about 8 m north (z ≈ 132–150) to sit inside the fan pair.
   - Its `exit` should land in the courtyard corridor at about (14, 140), not on the west outer face.
   - If the room stays an axis-aligned 16 × 10 box, that is acceptable inside a 26 × 20 m hall.
2. **Tutorial Room** (`classroomB`). Its box today (x 49.8…63.8, z 223.9…233.9) falls in the **6120 faculty-chamber wing**, which is wrong. Move it to **6116 or 6113**, centre about (50, 192), door on the courtyard (west) side.
3–10. Classrooms 6101–6108, east north half: two 2×2 clusters. Doors open onto the courtyard corridor (t ≈ 47–50) and the outer corridor.
11–14. Classrooms 6151–6158, west north half.
15. LT 6109 / 6110, east fan pair. One of them can be the J.C. Chaudhry Auditorium [unknown which].
16. Computer lab (CSIS / IPC style): put it in 6115/6114 or 6012/6013 at level -02 [unknown real number].
17. **Mathematics Department** corridor 6067 (level -02, west, about (5, 170)), with the HoD office 6067-H as an interactable door.
18. **Economics & Finance Department** 6165 (level -01, west, about (6, 175)), with the HoD room 6165-I.

### F4. NPC areas, interactables and camera

- **NPC walk areas:**
  - the Snake Path and its side branches (OSM footway "Snake Path" points are already in the data);
  - the courtyard-face corridors;
  - the four cross-corridors;
  - the south ramp;
  - the roof lawn paths (light).
- **Interactables:**
  - room doors with number plates;
  - notice boards by the doors;
  - the chalkboard and projector screen in the LT and classrooms (lesson hooks);
  - fire-hydrant boxes;
  - the department name boards at 6067 and 6165;
  - the portal arches (a fast-travel or "enter NAB" prompt).
- **Camera limits:**
  - In the courtyard, keep the third-person camera below the roof railing height (about y +1.1 in Option A) or clamp the orbit to the courtyard width (17 m).
  - In the light-wells (about 4–6 m wide), switch to first person or a short boom.

### F5. Existing gameplay rooms

Ids, `roomAt`, `pathTo`, `objectivePoint` and `exit` must survive. Moving `classroom` and `classroomB` only changes their placement inside `ROOM_HOSTS` and `fitRoom`. If Option A puts their floors at y = −4.5, `pathTo` and NPC nav must learn the portal stairs. **Hand-off to integration.**

---

## G. Sources

| # | Source | URL | What it shows | Confirms | Local capture |
|---|---|---|---|---|---|
| 1 | Summer Term Timetable 2025-26 (BITS Pilani, Pilani campus), p. 5 "New Academic Building (NAB)" layout plans (LVL -01 and LVL -02) and p. 6 legend | https://academic.bits-pilani.ac.in/Downloads/Summer_Term/Summer_Term_Timetable_30_May_2026_8763920c-16e9-472a-aec2-f123746d75bc.pdf | official plans with every room number, portals 01–04, service bank, south side ramp, lifts, WCs, statues | room numbering, block layout, portals, levels, lifts; NAB rooms in use | `$S/tt/Summer_Term_Timetable_30_May_2.pdf`, `$S/tt/map-05.png`, `$S/tt/lvl01-north.png`, `lvl01-south.png`, `lvl02.png`, `z-*.png` |
| 2 | Hafeez Contractor project page | https://www.hafeezcontractor.com/projects/birla-institute-of-technology-and-science-pilani | text + 11 photos | subterranean design, four arched portals, green roof, skylights, Rotunda | `$S/hc-*.jpg` (banner, thumbnail, 3–11) |
| 3 | WorldArchitecture project page | https://worldarchitecture.org/architecture-projects/hnfvz/new-academic-block-pilani-campus---birla-institute-of-technology-science-pilani-project-pages.html | text + 1 aerial | designed 2011, completed 2014, 160,087 sq ft, embankments instead of retaining walls, 65,000 sq ft green roof | `$S/wa-1.jpg` |
| 4 | Construction World "Fusion of Style" | https://www.constructionworld.in/articles/special-report/Fusion-of-Style/16393 | text | 23 classrooms, 212-seat auditorium, CSIS/EEE labs, Kotah/Dholpur/Jaisalmer stone, vertical fins, cavity walls, double glazing | — |
| 5 | BITS 360° virtual tour, panoramas "NAB" (drone), "NAB Connecting", "120 Seater NAB Classroom", "J.C. Chaudhry Auditorium (NAB)", "Mathematics Lab", "Economics & Finance Lab", "Information Processing Centre Lab", "Computer Science & Information System Lab", "Management Studies Lab", "Humanities and Social Sciences Lab", "Rotunda" (cube level 2 tiles) | https://www.bits-pilani.ac.in/Pilani-Campus-Virtual-tour/index.htm | 360° views; the hot-spot graph links these labs to "NAB Connecting" | all interior finishes and furniture, courtyard facades, drone view of the roofs, portals and light-wells, sunken Rotunda | `$S/vt/pano-*-strip.jpg`, `$S/vt/pano-*-updown.jpg`, tiles in `$S/vt/tiles/` |
| 6 | BITS Pilani Mathematics department page (Pilani) | https://www.bits-pilani.ac.in/?p=362 | contact block | "6067-H, New Academic Building (NAB)" | — |
| 7 | Faculty page, Krishna M (Economics & Finance, Pilani) | https://www.bits-pilani.ac.in/pilani/krishna-m | profile | "6165-I", "New Academic Building (NAB)" | — |
| 8 | Esri World Imagery z18 tiles (top-down) | https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/18/{y}/{x} | aerial | OSM footprint placement, Rotunda at origin, roofs at grade, Snake Path. z19 returned "Map data not yet available". | `$S/aerial/esri-z18-nab.jpg` |
| 9 | OSM data in repo | `data/bits-campus.js` | footprints, steps ways, POIs, Snake Path | geometry anchors | `scratchpad/nabpw/axis.mjs` output |
| 10 | YouTube "BITS Pilani, Pilani Campus - Official Campus Tour" | https://www.youtube.com/watch?v=bkmKuEguTH8 | page opened; frames 0:10–1:30 decoded (intro, Clock Tower, swimming pool, a hostel corridor), but every frame after about 1:46 came back black in headless Chrome | **no NAB frames obtained** | `$S/yt/yt-bkmKuEguTH8-sheet-*.jpg` |
| 11 | YouTube "BITS PILANI CAMPUS TOUR (2025-2026)" | https://www.youtube.com/watch?v=XkDvacBC7zA | title and description read (no chapters). Frame sampling failed: the browser closed during the run ("Target page, context or browser has been closed"), so no frames were saved | — | `$S/yt/XkDvacBC7zA.html` (page only) |
| 12 | Game today (localhost:8080/?explore) | http://localhost:8080/?explore | explorer aerials, courtyard walk, passage, LT and tutorial interiors | comparison in H | `$S/game-*.png` |

**Not accessed:**

- Vimeo "New Academic Building-BITS Pilani" (https://vimeo.com/93483428) was found in search but not opened.
- Google Maps and Google Earth were not tried.
- Magzter "Subterranean Green" article: paywalled, not opened.
- web.bits-pilani.ac.in/Pilani/nvmrao/Profile returned 404.
- Hyderabad-campus timetables were downloaded by mistake (they use the F/D/G room scheme) and are **not used**.

---

## H. Comparison with the game today

Captures: `$S/game-west-aerial.png`, `game-east-aerial.png`, `game-walk-courtyard-north.png`, `game-walk-courtyard-south.png`, `game-walk-passage-west.png`, `game-walk-ramroad.png`, `game-lt-aerial.png`, `game-lt-inside.png`, `game-tutorial-inside.png`, `game-maths.png`, `game-econ.png`.

**What matches:**

- the two footprints and their positions (taken from OSM);
- the green roofs;
- a lawn between the blocks with a winding path;
- two crossings per side, roughly at the right places;
- the Mathematics and Economics POIs exist as explorer places.

**What is wrong, ranked by how visible it is:**

1. **The blocks stand 6.6 m above ground. The real ones are sunk below it.** From every road and from the air, the real NAB is a flat landscaped roof at grade with railings and four arched portal pavilions. In the game it is two long two-storey grey buildings. Fix: Option A (preferred) or Option B in F1.
2. **Facade colour and language.** The game uses `concrete` `#d4cbbb` with plain punched windows on all faces. Reality:
   - **buff/ochre render** (`#dcbf8c`);
   - **white vertical fin groups** and **tall white round columns** carrying cantilevered white roof canopies;
   - **red window reveals**;
   - a white fascia with a steel railing at roof level.

   All of this appears only on the courtyard and light-well faces. Outer faces toward the roads should be grass embankment, not wall.
3. **There are no portals.** Add the four portal pavilions: tall buff boxes with a white cusped arch, at the OSM steps ways, with stairs going down. They are the only NAB elements visible from the roads.
4. **Crossings are at grade and in the wrong places on the east side.** The game puts them at y = 0. The real crossings are at level -01, reached by the portal stairs. Positions:

   | Crossing | Game z | Real z (at the building face, OSM steps) |
   |---|---|---|
   | West north | 97 | 99–104 (≈ OK) |
   | **East north** | **84** | **≈ 91–92** |
   | West south | 215 | ≈ 213–220 (OK) |
   | **East south** | **206** | **≈ 218–220** (about 13 m off) |

5. **The courtyard is flat, at grade and about 17 m wide.** In reality it is two-level: -01 in the north, -02 in the south, with a stepped and ramped transition at s ≈ 75–125 and a long **South side ramp** up to Gandhi Marg. The Snake Path is drawn, but the cross-paths every ~20 m to the corridors and the courtyard planting are missing.
6. **The sunken outer light-wells and grass embankments along Ram Marg and Krishna Marg are missing.** The game has bare dirt and a facade there (`game-walk-ramroad.png`).
7. **Lecture Theatre interior.** The game shows a flat tiled box with a green dado. Reality:
   - fan-shaped raked hall with curved rows of grey upholstered seats;
   - ochre wood-panelled walls;
   - stage with dark curtains and a projection screen;
   - Kota floor with ochre strips.

   The NAB classroom look is: ochre front wall, black board, projector screen, wooden dais, light-wood fixed bench desks with brown chairs, acoustic tile ceiling.
8. **The Tutorial Room sits in the faculty-chamber wing** (6120). Move it to 6113/6116.
9. **Room numbers and department signage are missing.** Add the 61xx/60xx plates and the "Department of Mathematics" (6067) and "Economics and Finance" (6165) boards. The Econ POI at z ≈ 252 should move to about (6, 180), or be kept with a note.
10. **Corridor floor.** The game uses checker tiles. The NAB has grey-green Kota stone with ochre inlay dashes everywhere, interior and corridor.

---

## I. Uncertainties and hand-offs

**Uncertainties:**

- **Exact depths** (−4.5 / −9.0 m) [visual estimate]. No section drawing was found.
- **Whether the north half is truly single-level.** Inferred from the lvl -02 plan covering only the south half [approximation].
- **Mapping room numbers to the auditorium and labs.** The J.C. Chaudhry Auditorium, CSIS, EEE, IPC, Management and HSS labs are not tied to numbers [unknown].
- **The Econ POI.** OSM puts it at s ≈ 220; the HoD room 6165-I is at s ≈ 150–175 [conflict noted].
- **Purpose of the pale paved strips** to the south ends and the service bank [unknown].
- **The plan is a diagrammatic signage plan.** Positions scaled from it are ±6 m.
- **Room shapes for the 6120/6121/6168/6170 cell clusters.** Cell sizes are about 3 × 3.5 m [approximation].
- **YouTube.** No NAB frame was obtained (see G #10/#11). The visual evidence rests on the official 360° tour and the architect's photos.

**Hand-offs:**

- **`main-building`:** the Rotunda is sunken. Its floor is about 4–4.5 m below the Clock Tower forecourt, with an arcaded ochre perimeter wall with niches, a stair up to the Clock Tower (hc-8), and stepped seating terraces opening south into the NAB courtyard (360° "Rotunda", hc-7). The NAB north courtyard level (-01) should equal the Rotunda floor level.
- **`roads-paths`:**
  - The OSM `steps` ways "Ram Stairs", "Krishna Stairs", "Budh Stairs" and "Gandhi Stairs" are the NAB portal stairs. Each descends about 4.5 m from the road.
  - The "Snake Path" footway runs in the sunken courtyard and up the South side ramp; it is not at grade.
  - The footways inside the courtyard are the cross-paths.
- **`landscape-water`:**
  - the NAB roof lawn landscape (lawn, shrubs, bougainvillea beds, skylight cut-outs);
  - the embankment slopes (Wedelia creeper);
  - the South side ramp lawns flanked by dark-green stepped embankments;
  - any ground mesh holes needed for the sunken courtyard and light-wells.
- **`gates-landmarks`:** the Nehru and Rajendra Prasad statues at the NAB north corners (plan labels), and the Patel and Gandhi statues at the Gandhi Marg end.
- **Integration (orchestrator):**
  - `player.floorAt` and nav must support ground below y = 0 for Option A.
  - The `classroom` and `classroomB` placement moves.
  - `NAB_PASSAGES` should become portal stairs plus level -01 corridors, at the corrected z values.
