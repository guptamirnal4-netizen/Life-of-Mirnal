# Roads, paths, kerbs and street lights (`roads-paths`)

Agent: `roads-paths`. Date: 2026-11-17. This is research only; no game code was changed.

Scope: the campus road network, footpaths, steps, kerbs and their paint, zebra crossings, signboards, street lights, the Clock Tower → Rotunda → Saraswati Temple axis, and the links between buildings. Compared against `BITS_CAMPUS.roads` (`data/bits-campus.js`) and `buildRoads()` / `buildLampPosts()` in `js/world/bits-world.js`.

Tags: **[verified]** seen in a source or measured from data or code; **[visual estimate]** a size or colour read off images; **[approximation]** a proposal for building it; **[unknown]** not established.

Capture folder (outside the repo): `/private/tmp/claude-501/-Users-mirnal-Documents-Whisperflow/58e9866d-f336-43fa-bce9-096a63ba2c16/scratchpad/research/roads-paths/` (written `RP/` below).

---

## Summary

1. **The campus has two kinds of road, but the game builds only one.**
   - The **main avenues** are 6–7 m of asphalt with a white dashed centre line, raised kerbs painted black and white, grey concrete-paver footpaths about 2–2.5 m wide on both sides, zebra crossings with stop lines at junctions, and roadside trees whose trunks are painted red below and white above [verified: tour "ANC Circle", "NCC Circle", "VFAST-Placement-Gate Connecting"].
   - The **minor hostel and service lanes** are 3.5–4.5 m of plain asphalt with no kerb, no footpath and no markings. Sandy earth verges run right up to the tarmac [verified: tour "Boys Hostel"].
   - **In the game every campus road is one type:** OSM `service`, 4 m wide, with 3.3 m of asphalt plus a flat painted kerb strip 0.35 m wide on each side. There is no footpath, no centre line, no zebra crossing and no kerb height [verified: code and `RP/game-walk-*.png`].
2. **Street lights are almost missing.** `buildLampPosts()` lights only `primary`, `secondary`, `tertiary`, `residential` and `unclassified` ways. **Every road inside the campus boundary is `service`**, so the whole world gets just **16 lamps** (`campus.lampCount = 16`) [verified: game]. The real campus has tall grey poles along the avenues, with continuous cool-white lighting visible in the night drone view, plus white ornamental lantern posts near hostels and eateries [verified].
3. **The main axis is in the OSM data and is correct.** The Main Building driveway arc, its two small turning islands, the four NAB portal stairs, the Snake Path, the Patel and Gandhi roundabouts and the T-lawns walk to the G.D. Birla statue are all there [verified: data]. The whole campus grid is turned about **8.5–9° clockwise from north–south** [verified: data].

---

## A. Identification

| Item | Value |
|---|---|
| Area | Campus road network, `BITS_CAMPUS.roads`: 223 OSM ways [verified] |
| Inside the campus boundary (>50 % of nodes) | 46 `service` ways (12.4 km), 39 `footway` (3.3 km), 7 `steps` (151 m), 4 `path` (63 m) [verified: data] |
| Outside the boundary (town) | `primary` ×6 (w 10), `tertiary` ×3 (w 7), `unclassified` ×8 (w 6), `residential` ×93 (w 5.5), `track` ×1 [verified: data] |
| Widths in the data | Set by kind, not measured: service 4, footway 2.2, path 1.8, steps 2.5 [verified: data] |
| Orientation | The campus grid is turned about 8.5–9° clockwise from north–south. Krishna Marg runs (76,42)→(123,328), 9.3°. The axis runs Rotunda (0,0) → Saraswati Temple (102,655), 8.9°, and Clock Tower (−9,−62) → Rotunda, 8.3° [verified: data] |

### Named ways (OSM)

All are `service`, w 4, unless stated otherwise.

| Name | Game coords (x,z) | Length | Notes |
|---|---|---|---|
| Ram Marg | (−59,63) → (−15,348) | 289 m | West of the NAB. It ends at the Gandhi statue junction [verified: data] |
| Krishna Marg | (76,42) → (123,328), then (127,351) → (163,574) | 516 m | East of the NAB and west of Krishna and Gandhi Bhawans. It passes through the Patel roundabout [verified: data] |
| Gandhi Marg | (215,323) → (138,337), then (115,341) → (−2,357) | 196 m | The east–west road south of the NAB. It links the ANC junction, the Patel roundabout and the Gandhi statue [verified: data] |
| Bhagirath Marg | (215,323) → (170,16) → (125,−259) → (110,−378) | 709 m | The long north–south spine on the east side, past Vishwakarma, the Workshop, FD-I and the Library [verified: data] |
| Rana Pratap Marg (`unclassified`, w 6) | (−192,1257) … (−448,−8) … (347,−275) | 2561 m | Mostly **outside** the boundary, as a perimeter or town road [verified: data] |
| Snake Path (`footway`) | (6,26) → (33,192), then (35,162) → (54,350) | 366 m | Winds along the sunken NAB courtyard [verified: data; see `nab.md`] |
| Ram, Krishna, Budh and Gandhi Stairs (`steps`) | (−53,107)→(−25,103); (84,89)→(56,92); (−34,224)→(8,218); (104,214)→(70,219) | 28–42 m each | The four NAB portal stairs [verified: data and `nab.md`] |
| T-lawns (`footway`) | (91,573) → (101,635) | 63 m | The walk from the G.D. Birla statue to the Saraswati Temple steps [verified: data] |

### Unnamed ways that matter

| Feature | Data | Status |
|---|---|---|
| **Main Building driveway arc** (way 8) | (66,−9) → (9,−37) → (−62,9) | Matches the drone: a curved asphalt road with a dashed centre line passes just north of the Rotunda, in front of the Clock Tower porch [verified: `RP/tour-clock-tower-down.jpg`, `RP/tour-clock-tower-strip.jpg`] |
| **Two small turning loops** | Centred near (−68,8) and (72,−13), r ≈ 6 m | The drone shows a small circular island at the driveway junction [verified] |
| Spurs south from the loops | (−64,14) → (−59,63) to Ram Marg; (68,−7) → (76,42) to Krishna Marg | [verified: data] |
| **Patel roundabout** (way 10) | Loop around about (126,340), r ≈ 11 m | Five-way junction with the Patel statue [verified: data, and `gates-landmarks.md` pano] |
| **Gandhi statue junction** (way 32) | 16-node loop near (−12,360) | [verified: data] |
| **ANC junction** | 4-way at (215,323): Gandhi Marg, Bhagirath Marg, the gate avenue (way 87) and way 100 south to Shiv Ganga and C'not | Very likely the tour's "ANC Circle". The All-Night Canteen POI is at (233,343) [approximation: identity inferred from name and position] |
| **Gate avenue** (way 87) | (600,266) → (437,289) → (215,323) | The straight avenue from the Main Gate. Its 75 % in-boundary share means its east end is at the gate [verified: data] |
| Other spines | Way 100 (215,323)→(265,626)→(295,806); way 120 (396,293)→(482,793); way 204 (346,−13)→(396,293) | [verified: data] |
| Footways around Shiv Ganga | About 20 footways and 3 short steps near (77–296, 763–979) | See `landscape-water.md` [verified: data] |
| Footway in front of FD-II | (−24,10) → (−62,47) and (26,3) → (72,11): two paths from the Rotunda towards S and M Lawns | [verified: data] |

---

## B. Exterior: what the roads look like

### B1. Main avenue cross-section (the ANC, NCC and Gate avenues)

Sources: `RP/tour-anc-circle-strip.jpg`, `RP/tour-ncc-circle-strip.jpg`, `RP/tour-gate-connecting-strip.jpg`, `RP/crop-anc-sign.jpg`.

```
 verge/lawn | footpath | kerb | asphalt (2 lanes, dashed white centre) | kerb | footpath | verge | compound wall
  red earth | 2–2.5 m  | 0.3  |        6–7 m                          | 0.3  | 2–2.5 m  | 1–3 m | cream, maroon coping
   trees in the verge, ~6–10 m apart, trunks painted red (lower) + white (upper band)
```

| Element | Description | Colour | Tag |
|---|---|---|---|
| Carriageway | Asphalt, two-way, no lane edge lines | mid grey, about `#6e6d6a`; fresher sections darker, `#55565a` | verified; width 6–7 m is a visual estimate from the zebra and pedestrians |
| Centre line | Short white dashes, about 1 m dash and 2–3 m gap | white | verified (NCC Circle, Gate, Clock Tower drone) |
| Kerb | Raised precast kerb stones, about 0.15 m high and 0.3 m wide, painted in **alternating black and white blocks about 0.5–0.6 m long** | `#1d1d1f` / `#f2f1ec` | verified presence; sizes are a visual estimate |
| Footpath | **Grey interlocking concrete pavers** (rectangular, herringbone or stretcher bond), level with the kerb top | `#a9a8a3` | verified |
| Zebra crossing | White bars across the full carriageway, with a white stop line about 2–3 m back, at every arm of the junctions seen | white | verified (ANC 4 arms, NCC 3+ arms, Gate 1) |
| Junction kerb returns | Kerbs and footpaths turn the corner with a tight radius (about 3–5 m) | | visual estimate |
| Verges | Bare red-brown earth or sand (`#c8a77a`), lawn in places, low hedges | | verified |
| Tree trunks | Painted bands up to about 1–1.5 m: **red or terracotta below, a white band above** | `#b5482f` / white | verified (also in `landscape-water.md`) |
| Bins | Blue roadside bins on posts at intervals | `#1f4fa3` | verified |
| Compound walls | Cream rendered walls about 1.5 m high with maroon coping, along the gate avenue (VFAST and placement compounds); jaali-pattern walls at NCC Circle | | verified |

### B2. Minor lanes (around hostels, the Boys Hostel / CVR / Ashok area)

Source: `RP/tour-boys-hostel-strip.jpg`.

- Plain asphalt about 3.5–4.5 m wide, with **no kerb, no markings and no footpath**. The earth verge runs straight to the tarmac edge [verified; width is a visual estimate].
- Building forecourts have **red or grey brick or paver aprons** and gate pillars [verified; see `hostels-newer.md`].

### B3. Main Building driveway and ring

Sources: `RP/tour-clock-tower-down.jpg`, `RP/tour-clock-tower-strip.jpg`, `RP/tour-rotunda-strip.jpg`.

- An asphalt road about 7 m wide with a white dashed centre line curves around the north rim of the Rotunda [verified].
- Its edges are **clipped hedge strips** (green), not black-and-white kerbs, in the drone view [verified].
- Large **pink and red bougainvillea beds** sit at the NE and NW rims of the Rotunda, between the ring and the amphitheatre [verified].
- The semicircular driveway in front of the Clock Tower porch meets the ring, and a small round lawn island sits at the west junction [verified].
- Roads at both ends of the driveway sweep south past the M and S Lawns to Krishna Marg and Ram Marg [verified: drone strip and data].
- The Rotunda floor itself is `main-building`'s and is not covered here.

### B4. Footways

- **NAB Snake Path:** grey stone paving with red-sandstone edging bands and low bollard lights. It snakes along the sunken courtyard [verified: `RP/tour-nab-connecting-strip.jpg`, and `nab.md`].
- **T-lawns walk:** red sandstone with cream inlays and white ornamental railings [verified in `gates-landmarks.md`; not re-captured].
- **Shiv Ganga:** a red-earth ring walk and a white-kerbed axial walk with globe lamps [`landscape-water.md`].

### B5. Steps

- The NAB portal stairs: buff portals with stairs going down [verified, see `nab.md`].
- Three short `steps` ways near Shiv Ganga [verified: data; their appearance is in `landscape-water.md`].
- Main Building plinth steps belong to `main-building`.

### B6. Street lights

| Type | Where seen | Description | Tag |
|---|---|---|---|
| **Avenue pole** | NCC Circle, Gate avenue, ANC Circle | Tall, plain **galvanised grey or silver tapered pole about 8–10 m** at the back of the footpath, with a single LED head. Poles stand about 30–40 m apart | verified presence; height and spacing are visual estimates |
| **Ornamental lantern post** | ANC Circle corner, Boys Hostel (Ashok/CVR) junction | **White** fluted column on a square plinth, about 4–5 m, with a **lantern-shaped head** | verified |
| Globe lamps | Shiv Ganga axial walk | White globes on short posts | verified (`landscape-water.md`) |
| Bollards | NAB Snake Path | Low bollard lights | verified (`nab.md`) |
| **Night colour** | Drone Night View | **Cool-white (about 5000–6000 K)** lines of light along every main avenue. The Gymkhana floodlights are the brightest thing on campus | verified (`RP/tour-drone-night-strip.jpg`) |
| Town road | Main Gate | Double-arm lamps on the median | verified (`gates-landmarks.md`) |

### B7. Signboards and traffic furniture

| Item | Description | Tag |
|---|---|---|
| Speed-limit sign | A white board on two posts reading **"20 KMPH / SPEED LIMIT"** in red and black, under a small campaign graphic, at the ANC Circle | verified (`RP/crop-anc-sign.jpg`) |
| Direction and name boards | **Blue rectangular boards with white text** on posts at junctions | verified (ANC, NCC); the wording was not legible [unknown] |
| Roundabout island | NCC Circle: a small round island with a **black-and-white banded rim**, a **white railing**, a pole, and a sign reading "KEEP LEFT" and "WAY TO … GATE" | verified (`RP/tour-ncc-circle-down.jpg`); the second word is not legible |
| Statue roundabouts | Patel and Gandhi: a round lawn with black-and-white kerbs, zebra crossings and a small conical-roofed guard kiosk | verified (`gates-landmarks.md`) |
| No-entry sign | A round red sign at the Gate avenue junction | verified presence; the face was not read |
| **Speed breakers** | **None seen** in any captured view | unknown |
| **Cycle tracks** | **None in OSM** and none seen. Cyclists and two-wheelers share the carriageway | verified absence in data; visual for the photos |

---

## C. Layout plan (network skeleton, game coordinates)

```
                        N (-z)
   Library (214,-222)      FD-I                    
        |  Bhagirath Marg (110,-378)→(125,-259)→(170,16)→(215,323)
   Main Bldg  ── driveway arc (−62,9)…(9,−37)…(66,−9) ──
   (−9,−62)⌒    loop(−68,8)              loop(72,−13)
          ⟳ Rotunda (0,0)
   Ram Marg (−59,63)                  Krishna Marg (76,42)
      |   Ram Stairs ▸ NAB ◂ Krishna Stairs   |        Vishwakarma
      |   Budh Stairs▸ Snake ◂ Gandhi Stairs  |  Krishna B.
      |            Path                        |  Gandhi B.
  Gandhi statue (−12,360)◎── Gandhi Marg ──◎ Patel (126,340) ── ANC ✚ (215,323) ── gate avenue ──▶ Main Gate (600,266)
      |                      |                            |
   (−12,370)→(25,593)   Krishna Marg →(163,574)        way 100 → (265,626) → (295,806)  (C'not, Shiv Ganga)
             └── road (25,593)–(93,583)–(163,574) ──┘
                       G.D. Birla statue (91,573)
                         │ T-lawns walk
                       Saraswati Temple (102,655)
                        S (+z)
```

**The main axis (Clock Tower → temple)** [verified: data plus the drone strips]:

1. Clock Tower porch at (−9,−62).
2. The driveway arc.
3. The Rotunda at (0,0).
4. The Snake Path, south through the sunken NAB courtyard.
5. The south side ramp up to Gandhi Marg, at about (54,350).
6. Open ground and South Park.
7. The east–west road at z ≈ 575–593.
8. The G.D. Birla statue at (91,573).
9. The T-lawns walk.
10. The Saraswati Temple at (102,655).

From the Clock Tower drone, the temple is visible on the horizon straight down the axis [verified: `RP/tour-clock-tower-strip.jpg`].

---

## D. Steps

| Steps | Where (game) | What is known | Proposal |
|---|---|---|---|
| NAB portals ×4 | The OSM `steps` ways above | They go down from road level into the NAB. Owned by `nab` [verified] | Build them as real stair runs (`RISE`/`TREAD`) once `floorAt` supports ground below y = 0 [approximation] |
| Shiv Ganga ×3 | (183–187,868–872), (173–177,763–768), (170–175,818–819), each 6 m | Short flights to the water or the island [verified: data] | 3–5 risers, 2.5 m wide [approximation] |
| Rotunda tiers | (0,0) | Amphitheatre steps on the south half and ramps [verified: drone]. Owned by `main-building` | — |

The game today renders `steps` as **flat grey path strips** with no risers [verified: code, `buildRoads()` treats `steps` as foot].

---

## E. "Interior" (surfaces and materials)

| Surface | Real | Game today |
|---|---|---|
| Asphalt | Mid-grey, fine texture, with a dashed white centre line on the avenues | `#62615d` speckle and no markings [verified: code] |
| Kerb | **Raised**, about 0.15 m, black and white blocks about 0.5–0.6 m long | **Flat** quads at y = 0.05, 0.35 m wide, texture repeat 2 m (1 m black and 1 m white) [verified: code]. On every service road, including minor lanes |
| Footpath beside roads | Grey interlocking pavers, 2–2.5 m | **Absent** |
| Footways | Grey stone with red edging (NAB), red sandstone (T-lawns), red earth (Shiv Ganga) | One flat `#bdb6a9` colour, 2.2 m wide [verified: code, `RP/game-walk-snake-path.png`] |
| Verges | Red-brown earth with lawn patches | Global sand texture `#f0dcb4` |
| Trunk paint | Red below, white band above | None [verified: `RP/game-walk-bhagirath-marg.png`] |

---

## F. Gameplay

- **Collision:** roads stay walkable, with no colliders. A raised kerb (0.15 m) is under the 0.7 m step-up limit, so it can be a visual mesh only, or a walkable box [approximation].
- **NPC walk areas:** keep NPCs walking on the footpaths of the avenues and on the Snake Path. Cycles and two-wheelers belong on the carriageway, keeping left [verified: "KEEP LEFT" sign; India drives on the left].
- **Navigation:** the nav grid can use the road and footway polylines directly. The four NAB stairs are the only crossings into the NAB [verified: data and `nab.md`].
- **Interactables:** the "20 KMPH" sign, blue direction boards at the ANC, Patel and Gandhi junctions (where the text is unreadable, label them with the real road names from OSM), and blue bins.
- **Spawn and camera:** nothing changes. The explorer's "walk here" should land the player on footpaths, not the carriageway [approximation].
- **Gameplay rooms:** none are in this area. Changes to road width must not push roads into the room corridors made by `placeRooms()`. Check against `isBuilt` and `nearRoad` [approximation].

---

## G. Sources

| # | Source | URL | What it shows | Confirms | Local file |
|---|---|---|---|---|---|
| 1 | BITS 360° tour, "ANC Circle" (panorama D764205C…) | https://www.bits-pilani.ac.in/Pilani-Campus-Virtual-tour/index.htm | 4-way junction at road level | Kerb paint, paver footpaths, zebras, trunk paint, bins, blue boards, ornamental lamp post, "20 KMPH" sign | `RP/tour-anc-circle-strip.jpg`, `RP/tour-anc-circle-down.jpg`, `RP/crop-anc-sign.jpg` |
| 2 | Tour, "NCC Circle" (D77247B0…) | same | Mini-roundabout from above the island | Centre dashes, tall grey poles, island rim and railing, "KEEP LEFT", cyclists on the road | `RP/tour-ncc-circle-strip.jpg`, `RP/tour-ncc-circle-down.jpg` |
| 3 | Tour, "VFAST-Placement-Gate Connecting" (D70B4346…) | same | Avenue junction | Avenue cross-section, compound walls, grey poles, zebra | `RP/tour-gate-connecting-strip.jpg` |
| 4 | Tour, "Clock Tower" drone (C57F35FE…) | same | Aerial panorama, plus a look straight down at the Rotunda | Driveway ring with centre dashes, hedge edges, bougainvillea, island, axis to the temple | `RP/tour-clock-tower-strip.jpg`, `RP/tour-clock-tower-down.jpg` |
| 5 | Tour, "Rotunda" (E3174430…) | same | From the Rotunda floor | Patterned floor and tiers (for `main-building`) | `RP/tour-rotunda-strip.jpg` |
| 6 | Tour, "Drone Day View" (BB0577EA…) | same | High aerial | Straight tree-tunnel avenues on the rotated grid | `RP/tour-drone-day-strip.jpg` |
| 7 | Tour, "Drone Night View" (BD69F782…) | same | Night aerial | Cool-white continuous street lighting along the avenues | `RP/tour-drone-night-strip.jpg` |
| 8 | Tour, "NAB Connecting" (D717750D…) | same | NAB courtyard | Snake Path paving and red edging | `RP/tour-nab-connecting-strip.jpg` |
| 9 | Tour, "Boys Hostel" (BD6CC1EB…) | same | Hostel lane junction | Minor lanes have no kerb or footpath; white lantern post | `RP/tour-boys-hostel-strip.jpg` |
| 10 | Tour, other panoramas captured (Main Gate, Patel, Gandhi, Faculty Housing, C'not, Nagarji ki Redi, LTC, NAB, Post Office, RP Redi, Library, Admin connecting) | same | Various | Not all were inspected in detail. Patel and Gandhi were read through `gates-landmarks.md` | `RP/tour-*-strip.jpg` |
| 11 | OSM diary, ajithranka "BITS Pilani" | https://www.openstreetmap.org/user/ajithranka/diary/38752 | Text | Roads were mapped by another contributor; trees line the roads | — |
| 12 | OSM data in the repo | `data/bits-campus.js` | 223 ways | All coordinates, kinds, names and widths | analysis scripts: `scratchpad/rp-scripts/roads*.mjs`, `junc.mjs` |
| 13 | Game code | `js/world/bits-world.js` `buildRoads()` (l.431), `buildLampPosts()` (l.1494), `material()` | Code | Widths, kerb, colours, lamp filter | — |
| 14 | The game, `?explore` | http://localhost:8080/?explore | Explorer overviews and walks | Current look; `lampCount = 16` | `RP/game-rotunda-overview.png`, `RP/game-bits-clock-tower-overview.png`, `RP/game-patel-overview.png`, `RP/game-gandhi-overview.png`, `RP/game-walk-ringroad-north.png`, `RP/game-walk-krishna-marg.png`, `RP/game-walk-bhagirath-marg.png`, `RP/game-walk-gate-avenue.png`, `RP/game-walk-snake-path.png` |

**Not accessed:**

- YouTube campus tours. A re-check on 2026-11-17 (about 21:54) loaded https://www.youtube.com/watch?v=XkDvacBC7zA ("BITS PILANI CAMPUS TOUR (2025-2026)", 8:28), but the player showed "Something went wrong" on every seek, so no usable frame was captured and the frames were deleted. `hostels-krishna-gandhi.md` sampled the same video earlier and notes a cycle-lined road at 0:36.
- Google Maps and Google Earth.
- An official campus road map with road names. A web search found none.

---

## H. Comparison with the game today

**What matches:**

- The network geometry is real OSM, including:
  - the driveway arc;
  - the Patel and Gandhi roundabouts;
  - the NAB stairs and the Snake Path;
  - the T-lawns walk.
- Kerbs carry black-and-white paint.
- Roadside trees form avenues.
- The road surface is grey asphalt.

**What is wrong:**

1. **Lamp posts: 16 in the whole world.** `buildLampPosts()` skips `service`, and every in-campus road is `service`. The posts it does place are a generic 6.6 m grey pole with an arm, and the head is warm (`#fff4d6`, emissive `#6b5a2a`) where the real night view is cool-white [verified: code l.1516–1521]. The real campus has 8–10 m grey avenue poles about every 30–40 m on both or alternate sides, plus white lantern posts at junctions and hostel fronts [verified].
2. **Main avenues are too narrow and have no footpaths.** They are 3.3 m of asphalt in the game against about 6–7 m, plus 2–2.5 m paver footpaths on each side [visual estimate].
3. **Kerbs are flat paint strips on every road.** The real kerbs are raised blocks of about 0.15 m on the avenues only. Minor lanes have no kerb.
4. **No road markings:** no dashed centre line, no zebra crossings and no stop lines at junctions.
5. **Tree trunks are not painted** with the red and white bands.
6. **Footways are all one beige-grey.** The Snake Path should be grey stone with red edging and the T-lawns walk red sandstone. **Steps are flat**, with no risers.
7. **The driveway ring should be edged with hedges and bougainvillea beds**, not black-and-white kerbs.
8. **No signs or street furniture:** speed-limit boards, blue direction boards, blue bins, roundabout island railings.

**Ranked fixes (most visible first):**

1. **Street lights** [approximation]:
   - Include `service` in `buildLampPosts()`, but only for the avenue set: named Marg ways and ways 8, 87, 100, 120 and 204, or simply service ways longer than 150 m.
   - Space the poles at about 35 m, set 0.5 m behind the footpath.
   - Replace the pole with a plain 9 m galvanised taper and an LED head with cool-white emissive light.
   - Add white lantern posts (about 4.5 m) at the ANC, Patel and Gandhi junctions and at hostel gates.
2. **Two road classes** [approximation]:
   - "Avenue": 6.5 m asphalt, 0.3 m raised black and white kerb (0.15 m high, 0.5 m blocks), 2.2 m grey paver footpath each side, and a white dashed centre line (1 m dash, 2.5 m gap).
   - "Lane": 4 m asphalt, no kerb.
   - Do it with a per-way override table keyed by OSM name or index. Do not change `BITS_CAMPUS`.
3. **Zebra crossings and stop lines** on every arm of the ANC (215,323), Patel (126,340) and Gandhi (−12,360) junctions, and at the gate avenue junctions.
4. **Trunk paint:** red (`#b5482f`) from 0 to 0.9 m and white from 0.9 to 1.3 m on trees within about 6 m of an avenue. Coordinate with `landscape-water`.
5. **Footway materials:** Snake Path grey with red edging, T-lawns red sandstone; Shiv Ganga is owned by `landscape-water`. Give `steps` real risers.
6. **Driveway ring:** hedge edges and bougainvillea beds; coordinate with `main-building`.
7. **Signs:** a "20 KMPH SPEED LIMIT" board on the main avenues, blue name boards at junctions, NCC-style island rims and railings, blue bins.

---

## I. Uncertainties and hand-offs

**Uncertainties:**

- **Exact road widths** [unknown]. The 6–7 m avenue and 4 m lane figures are visual estimates from zebras, people and cars. The OSM widths are defaults by kind, not measured.
- **Which roads are "avenues"** [approximation]. Kerbs and footpaths were confirmed only at the ANC Circle, the NCC Circle and the VFAST/Gate avenue. Treating all named Margs and the long service spines as avenues is an inference.
- **Where the NCC Circle is** [unknown]. No OSM tag or POI places it.
- **ANC Circle = the (215,323) junction** [approximation].
- **Speed breakers** [unknown]. None were seen, which does not prove there are none.
- **Lamp spacing and height** [visual estimate].
- **Road names on signboards** were not legible [unknown].

**Hand-offs:**

- `main-building`: the Rotunda floor and tiers, the porch and driveway island planting, and the bougainvillea beds at the Rotunda rims.
- `nab`: the portal stair geometry, the Snake Path bollards and the south side ramp.
- `landscape-water`: trunk paint, hedges along the driveway, verge colour (red earth versus sand), and the Shiv Ganga walks and steps.
- `gates-landmarks`: the Main Gate apron, the town-road median lamps, the Patel and Gandhi roundabout statues and kiosks, and the T-lawns railings.
- `hostels-*`: forecourt pavers and gate pillars at each Bhawan entrance. Real lanes in front of the hostels have no kerbs.
- Orchestrator: the lamp filter bug (`service` excluded) affects every area's night look.
