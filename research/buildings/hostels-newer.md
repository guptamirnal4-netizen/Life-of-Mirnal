# Newer and other Bhawans: Malviya, Ashok, Rana Pratap, Bhagirath, Meera, plus CV Raman, Srinivasa Ramanujan, MSA

Owner: `hostels-newer`. Research only, no game code changed. Coordinates follow `research/COORDINATES.md` (metres, x east, z south, origin at the Rotunda).

Tags: [verified] = seen directly in a source listed in G; [visual estimate] = read off a photo, panorama or aerial, about ±20 %; [approximation] = a plausible proposal, not observed; [unknown] = no evidence.

## Summary of findings

1. **The official Bhawan list is longer than the game's.** The SWD site's hostel index links 15 Bhawan pages: Ashok, Rana Pratap, Bhagirath, Budh, CV Raman (CVR), Gandhi, Krishna, Malviya, Meera, MSA, Ram, Shankar, Srinivasa Ramanujan (SR), Vishwakarma (VK) and Vyas [verified, swd.bits-pilani.ac.in/hostels.aspx].
2. **Bhagirath is probably not a girls' hostel any more.** The SWD 2026 admissions notice puts the "Warden, Bhagirath" under the heading for BOYS students, degree "FD" (first degree), next to the wardens of Ashok, Gandhi, Krishna, Shankar and Rana Pratap [verified, SWD_Reception_Pilani_26.pdf]. Girls' contacts in the same notice are Meera Bhawan only. The game's comment "Bhagirath, a girls' hostel, stays closed" conflicts with this. See I.
3. **The three combs all share one design** ("new Bhawans"): a G+1, two-storey block in a cream and beige Rajasthani style. The spine is on the road side and carries a three-arch porch with ornamental white iron gates, a first-floor loggia with paired turned columns, a Devanagari name plaque and maroon cornice bands. Square roof towers (mumties) stand at the arm junctions [verified from SWD photos and the tour panorama; the towers are a visual estimate from the drone panorama].
4. **Malviya is two buildings.** OSM has **Malviya-B** (relation 5372379) directly west of Malviya-A. It is a courtyard block with 4 inner courts, x -266…-216, z 135…206. It is **missing from `data/bits-campus.js`** and from the game [verified, OSM API].
5. **CV Raman Bhawan already sits in the game data as three unnamed `hostel` footprints** (x 387…468, z 173…228); OSM names them as relation 19101882 [verified]. **Meera Bhawan** in OSM (relation 20803053) is two footprints at x -206…-88, z 646…698, about 80 m north of the game's Meera POI (-134, 767). The game shows the girls' complex as about 13 unnamed `other` blocks around the POI [verified]. **Srinivasa Ramanujan Hostel** (relation 5372462, x -171…13, z -303…-198) is missing from the game data [verified].

---

## 1. Ashok Bhawan

### A. Identification
- Official name: Ashok Bhawan (plaque reads "अशोक-भवन") [verified, SWD photo and tour panorama "Boys Hostel"]. Category: boys' first-degree hostel [verified, SWD 2026 notice]. It has 1 mess dining hall "with a capacity of 400 students" (SWD template text, the same on every Bhawan page) [verified, but it is generic text].
- OSM: "Ashok bhawan", way 360846151, `building=dormitory`, `building:levels=2` [verified]. Bounds x 309…376, z 184…284, about 66 × 100 m [verified].
- Orientation: the **spine is on the east side** (x ≈ 361…376) and runs N–S, rotated about 9° (game `angle` -170.9°). **Four arms** run west to about x 310…324 [verified, OSM and Esri aerial `esri/bhagirath-ashok.jpg`].
- Neighbours: Bhagirath directly west across a tree belt; CV Raman Bhawan across the road to the east (it is visible from Ashok's front, tour panorama "Boys Hostel"); RP and VKB messes to the north [verified].

### B. Exterior
- Floors: 2 (ground + first) and a flat roof terrace [verified, photos and OSM levels=2]. Floor-to-floor about 3.3–3.6 m, parapet top about 7.5–8 m, roof towers about 10–11 m [visual estimate]. The data `h = 6.6` is low by about 1 m at the parapet [visual estimate].
- Plan: a comb. The spine is about 8–10 m deep. Arms are about 7–8 m deep and about 45–52 m long, spaced about 29 m apart (centre to centre), with open sandy or tree-filled gaps between them [verified OSM, visual estimate on the aerial]. On the aerial each arm roof shows **two parallel light strips**, most likely a room block and a corridor or verandah strip at slightly different heights or split by a parapet [visual estimate].
- Arm ends are stepped and offset; OSM shows notches near the spine [verified].
- **Entrance porch** (east face of the spine, OSM bump x 367…371, z 222…236) [verified OSM; the photos confirm the porch]. It is three bays wide:
  - Ground floor: three **cusped (multifoil) arches** in raised beige surrounds, with a small rosette at each spandrel. The left arch is an open doorway; the centre and right arches hold white wrought-iron gates with a fan pattern. Two or three steps and a ramp lead up [verified, SWD photo `swd-AK_BHAWAN.JPG`].
  - A beige band carries the Devanagari name "अशोक-भवन" between two "≡" bar ornaments [verified].
  - First floor: a recessed **loggia** with two pairs of turned beige columns, with plain rectangular windows behind them [verified].
  - A thin maroon (oxide red) cornice band at first-floor level and another at the roof parapet [verified]. A small jali (lattice) panel sits beside the porch [verified].
- Long facades: ground-floor windows are set in cusped arched niches filled with white iron grilles. First-floor windows are deep-set rectangular openings between projecting fins, giving a strong vertical rhythm [verified, tour panorama "Boys Hostel" for Ashok; the same pattern shows in the Malviya and Bhagirath photos].
- Colours: off-white or cream walls (#efe9dc), beige or sand trim (#d9b98f), maroon bands (#7a2a22), white grilles [visual estimate].
- Forecourt: two square gate pillars with ball finials, a red-brick paved forecourt, a round planter with a clipped shrub, and low hedges along the front [verified, tour panorama "Boys Hostel"].
- Roof: flat terrace with solar panels on some arms, water tanks, and **square stair or tank towers (mumties) with arched or rectangular openings** at the spine–arm junctions [visual estimate, `drone-combs-a.jpg`].
- Lighting: wall-mounted floodlight above the porch [verified, SWD photo]; street lamps along the road [verified, panorama].

### C. Floor layout
Rooms are single-loaded along a corridor or verandah [approximation]. That fits the about 7–8 m arm depth (about 4 m room + about 2.5 m corridor + walls), and the game already uses this model. The interior layout was not observed [unknown].

```
          west                                            east (road, CV Raman opposite)
 arm 1  ███████████████████████████████████████▌┃
        (gap: open ground)                       ┃ spine (rooms on east face, corridor inside)
 arm 2  ███████████████████████████████████████▌┃
                                                 ┃══ PORCH (3 arches, x≈368-371, z≈222-236)
 arm 3  ███████████████████████████████████████▌┃
 arm 4  ███████████████████████████████████████▌┃
 z≈184 at north … z≈284 at south   [arms from OSM; corridor side unknown]
```

### D. Staircases
- Not seen from inside [unknown].
- [visual estimate] Square roof towers stand at the spine–arm junctions (drone panorama), which points to a stair at each junction. The game places 2 stairs, both near the lobby.
- [approximation] Proposal: one dog-leg stair at each arm–spine junction (4 in total), plus one beside the entrance lobby. Each is 2 flights of about 8 risers with a half landing, in a bay about 3.4 × 5 m, entered from the corridor. Steel or MS-pipe handrail on a masonry parapet, and a roof exit inside the mumty.

### E. Interior
- Not observed for Ashok [unknown]. The SWD page lists cots, study tables, chairs, wardrobes, and shared washrooms at "1 bathroom / 4 students on average", plus a common room with TV, TT table and carrom boards, and badminton courts [verified, generic SWD text].

### F. Gameplay (Ashok)
- The game entrance (371.6, 227.8) → (367.8, 228.4) sits on the east face, inside the OSM porch bump. **This matches reality** [verified].
- Keep the spawn in the lobby. Use the 3-arch porch as the only enterable doorway: the centre and right arches are gated, the left one is open.
- Collision: footprint as now. Add the porch steps (2 risers, about 0.15 m) and a ramp on the left.
- Stairs: see D. Add stairs at the arm junctions if performance allows.
- NPC walk areas: the spine corridor, arm corridors, forecourt, and the road to CVR. Interactables: notice board, water cooler (both already in the game), cycle stand by the porch.
- No gameplay rooms are hosted here (COORDINATES.md); none need to fit.

---

## 2. Rana Pratap Bhawan (RP)

### A. Identification
- Plaque "राणाप्रताप-भवन" [verified, SWD photo `swd-ranapratap_bhawan.jpg`]. Boys' FD hostel [verified, SWD 2026]. OSM way 360851286, `levels=2`, bounds x 266…349, z 15…116 [verified].
- **The spine is on the east** (x ≈ 335…349). Four arms run west [verified]. The **north arm (z ≈ 15…34) and the south arm (z ≈ 100…116) are long** and reach x ≈ 266–283, where they meet VK Bhawan's east wing (VK x 203…277). The middle arms stop at about x 287–292 [verified OSM, `esri/rp.jpg`].
- Neighbours: VK Bhawan west (touching at the NW corner), the BITS Workshop north-west, the RP mess and VKB mess south, and "RP Redi" (a snack kiosk) in the open ground beside the building [verified, tour panorama "RP Redi"].

### B. Exterior
- The same design as Ashok: 3-arch porch, paired-column loggia, maroon bands [verified, SWD photo]. The porch sits on the east spine at about (340, 62–70); the aerial shows a lighter square block there [visual estimate]. The game entrance (344.4, 61.3) agrees [visual estimate].
- The "RP Redi" panorama shows a long facade: the ground floor has deep **cusped-arch window niches with plain rectangular windows** and small jali vents above, the first floor a row of rectangular windows. There are maroon bands at each floor. White iron gates fill some ground arches [verified, `pano-rpredi-sheet.jpg`]. One rear elevation has plain rectangular windows with concrete sunshade boxes over them [verified, same panorama].
- Size: 82 × 101 m bounding box; arms about 7–8 m deep [verified OSM]. Height as Ashok [visual estimate].

### C–E
The layout is the same as Ashok, with arms of unequal length. Stairs and interiors were not observed [unknown]. Proposal as for Ashok [approximation].

### F. Gameplay
The entrance matches the east-face porch. The long north arm (`u1` 64.8) and south arm (65.5) are already captured by `combPlan` [verified, `game-hostels.json`]. Mind the junction with VK at the NW corner: no gap is needed, but the collision boxes must not overlap VK's walls [approximation].

---

## 3. Malviya Bhawan (Malviya-A and Malviya-B)

### A. Identification
- Plaque "पंडित मदन मोहन मालवीय भवन" (Pandit Madan Mohan Malviya Bhawan) [verified, SWD photo `swd-ML_BHAWAN.JPG`]. It has its own SWD page and a warden [verified]. It is not listed among the boys' wardens in the 2026 notice, and gender is not stated anywhere [unknown]. The tour has a hotspot label "Malviya" [verified, tour text].
- **Malviya-A**: OSM way 360846144, bounds x -216…-152, z 128…195 (65 × 67 m) [verified]. The spine is on the **east** (x ≈ -165…-152), and 4 arms run west (z ≈ 136–146, 153–165, 172–182, 182–195 in the OSM outline) [verified]. On the aerial the arms are long, unbroken bars about 45 m long. At the west ends a thin line (a wall or covered walk) appears to close the gaps at x ≈ -210 [visual estimate, `esri/malviya.jpg`].
- **Malviya-B**: OSM relation 5372379, `building=dormitory`, a multipolygon with **4 inner courtyards**, bounds x -266…-216, z 135…206 [verified]. On the aerial it is a courtyard-type block, older or weathered, with a darker roof [visual estimate]. It is **not in `data/bits-campus.js`** [verified].
- Neighbours: Malviya Mess south-west (x -258…-201, z 208…231), the Malviya badminton court (-186, 165) [verified POI], Ram Bhawan east across the road, and the SAC to the south [verified].

### B. Exterior (Malviya-A)
- Porch as Ashok, but **wider and more elaborate**: three cusped arches (the left open, the centre and right with white scrolled iron gates), a long name band, and a first-floor loggia with paired columns. Beyond the porch the facade shows **a ground arcade of cusped arched windows with white grilles**, and on the first floor **deep vertical recessed bays** with an oxide-red cornice band [verified, SWD photo].
- A roof tower box with a jali screen shows above the facade, behind the porch [verified, SWD photo]. It is likely a stair head or tank room [visual estimate].
- Many cycles are parked along the front, on red-brick paving [verified].
- Porch position: the photo shows the porch at the end of a long face. The aerial shows a lighter projecting block on the east face at about x -160…-150, z 160…175 [visual estimate]. The game entrance is at (-154, 156): close, possibly 5–10 m too far north [visual estimate].

### C–E
- Malviya-A: a comb, as Ashok. Malviya-B: courtyard rooms around 4 courts [approximation], not observed.
- Staircases and interiors were not observed [unknown].

### F. Gameplay
Keep Malviya-A walk-in. Add Malviya-B as a closed extruded block, after an orchestrator data change (hand-off). Check the entrance against the porch at z ≈ 160–175.

---

## 4. Bhagirath Bhawan

### A. Identification
- Plaque "भागीरथ-भवन" [verified, SWD photo `swd-BG_BHAWAN.JPG`]. **Boys' FD hostel per SWD 2026** [verified, see the summary]. The tour labels it "Bhagirath Bhawan" in the drone hotspots, under the "Boys Hostel" tooltip group [verified tour text; the tooltip-to-hotspot pairing is a visual estimate].
- OSM way 360846147, `levels=2`, bounds x 232…299, z 195…297 (68 × 101 m) [verified].
- **The spine is on the WEST** (x ≈ 232…252), and 4 arms run **east** to x ≈ 284–299 (z ≈ 195–209, 223–238, 253–267, 281–297). It is the mirror image of Ashok, and the two face each other across a tree belt (x ≈ 300–310) [verified OSM and aerial].

### B. Exterior
- The same design family, with a **different colour scheme in the SWD photo**: cream walls with **light-blue painted reveals, pilasters and arch soffits**, and **green** collapsible gates. Cusped arches; the porch arch on the right is open, the one on the left gated; the name band sits above. On the first floor, square columns stand in a deep verandah with blue-painted backs [verified, SWD photo; the repainting date is unknown].
- The long side has cusped ground-floor arched windows with iron grilles, and a first-floor colonnade of square piers (a deep verandah) [verified].
- Porch: OSM bump on the west spine at x 244…250, z 241…256 [verified OSM]. The aerial shows a square block there [visual estimate]. **The entrance therefore faces west**, toward Gandhi and Krishna.

### C–E
As Ashok, mirrored. Not observed inside [unknown].

### F. Gameplay
- If the orchestrator accepts that Bhagirath is a boys' hostel, it can become a `CombHostel` like the others. `combPlan` should handle the mirrored spine automatically (the spine is whichever face is straight) [approximation, not tested].
- Entrance on the west face at about (244, 248) [visual estimate].

---

## 5. Meera Bhawan (girls' hostel complex) and MSA

### A. Identification
- "Meera Bhawan Complex" is the girls' hostel; its wardens and superintendents are listed as the GIRL-student contacts [verified, SWD 2026 notice and the Meera SWD page]. The SWD page lists **2 dining halls** [verified].
- OSM: node "Meera Bhawan" (-134, 767), `levels=2` (this is the game POI), and relation 20803053, `building=dormitory;yes`, two footprints [verified]:
  - a jagged comb-like block, x -206…-156, z 665…698;
  - a long straight bar, x -186…-88, z 646…673 (about 98 × 12 m, at about 9°).
- On the aerial the complex also includes **six parallel blocks**, each about 60 × 14 m with a central core, at x ≈ -175…-100, z ≈ 700…835. These are the unnamed `other`, h 7 blocks in the game data [verified data, visual estimate for the match].
- **MSA Bhawan** has its own SWD page and a warden from the girls' list. Its photo shows blocks labelled "MSA-IV", so MSA has at least 4 blocks [verified, `swd-MSA.jpg`]. The tour has panoramas "MSA 1/2/3" (room interiors) [verified]. Where MSA stands on the map is [unknown]. It may be the six parallel blocks or the new complex at x -150…-90, z 600…650 (circular court, under construction on the aerial) [unknown].

### B. Exterior
- Gate: a "MEERA BHAWAN" signboard on a pink-banded boundary wall, a red steel gate, and a long cycle-lined access road [verified, `swd-MR_BHAWAN.JPG`].
- Tour "Girls Hostel" panorama:
  - (a) a **modern 2–3 storey block** in peach or ochre with white recesses, cantilevered balconies with steel railings, and a central glazed stair window above a gated entrance with 3 steps [verified];
  - (b) a single-storey colonnaded office or verandah building [verified];
  - (c) an **older two-storey heritage block**: cream with maroon bands, a ground-floor arcade of round arches, and a first-floor colonnade, with a circular driveway and planter in front [verified].
- MSA: **3-storey** cream blocks with maroon bands, projecting stair towers with jali panels, a cusped-arch entrance surround with rosettes, and small balconies [verified, `swd-MSA.jpg`].

### E. Interior (MSA 1 panorama)
Grey stone floor with a skirting, cream walls, a tubelight, and wooden flush doors with metal tower bolts set in **green-marble door frames**. Each room has a steel almirah, wooden wall shelves, a study table and chair, a bed board, and a window with decorative steel grilles. The rooms open off a short internal passage [verified, `pano-msa1-sheet.jpg`].

### F. Gameplay
The player is male and Meera stays closed. Use exterior-only blocks with the gate and signboard. Consider moving the label from the POI (-134, 767) toward the gate on the access road [approximation]; the real gate position is [unknown].

---

## 6. Other Bhawans found (not in the brief's list)

| Bhawan | Location (game) | Evidence | In game |
|---|---|---|---|
| CV Raman (CVR) | 3 footprints, x 387…468, z 173…228, east of Ashok across the road | OSM relation 19101882 [verified]. SWD photo: **modern 3–4 storey blocks in mustard yellow and white, with large concrete jali panels and punched windows**; sign "SIR C.V. RAMAN BHAWAN" [verified]. Tour "Boys Hostel" panorama: a white block with jali and ochre window boxes opposite Ashok [verified]. Tour "CVR Redi" exists [verified label]. | Unnamed `hostel` footprints, h 11, plain extrusion |
| Srinivasa Ramanujan (SR) | x -171…13, z -303…-198 (OSM relation 5372462, `levels=1`, 2 inner courts) | SWD: higher-degree (HD) hostel [verified]. Aerial: 4 long parallel bars about 120–140 m long, linked by cross-bars [visual estimate]. SWD photo: a **white modern block** behind a yellow-pillared gate with a diagonal-bar steel gate and a Devanagari sign "श्रीनिवास रामानुजन भवन" [verified]. | **Missing** from data (only a POI at -20, -266) |
| MSA | unknown | see 5 | — |

---

## G. Sources

| # | Source | URL | What it shows | Confirms | Local capture |
|---|---|---|---|---|---|
| 1 | SWD hostels index | https://swd.bits-pilani.ac.in/hostels.aspx | 15 Bhawan links and photos | Official Bhawan list | `scratchpad/research/hostels-newer/docs/hostels.html` |
| 2 | SWD Bhawan pages | https://swd.bits-pilani.ac.in/Ashok-Bhawan.aspx, `Rana-Pratap-Bhawan.aspx`, `malviya-bhawan.aspx`, `bhagirath-bhawan.aspx`, `meera-bhawan.aspx`, `cvr-bhawan.aspx`, `sr-bhawan.aspx`, `vk-bhawan.aspx`, `msa.aspx` | Staff, facilities, mess capacity | Each Bhawan exists; facilities (generic text) | `docs/*.html` |
| 3 | SWD Bhawan photos | https://swd.bits-pilani.ac.in/Images/AK_%20BHAWAN.JPG, ranapratap_bhawan.jpg, ML_BHAWAN.JPG, BG_BHAWAN.JPG, MR_BHAWAN.JPG, CVR_BHAWAN.JPG, SR_BHAWAN.JPG, MSA.jpg | Front porches and facades | Porch design, plaques, colours, floors | `swd-*.JPG` / `swd-*.jpg` |
| 4 | SWD admissions notice 2026 | https://swd.bits-pilani.ac.in/Files/SWD_Reception_Pilani_26.pdf | Boys' and girls' warden lists | Bhagirath listed under boys; Meera = girls | `docs/SWD_Reception_Pilani_26.txt` |
| 5 | SWD hostel allotment guidelines (2023) | https://swd.bits-pilani.ac.in/510/Hostel%20Allocation%20Guidelines.pdf | Wings of up to 12; girls in Meera and Budh | "Wing" = group of up to 12 rooms | `docs/Hostel_Allocation_Guidelines.txt` |
| 6 | OSM API | https://api.openstreetmap.org/api/0.6/relation/5372379/full.json (Malviya-B), /relation/19101882 (CVR), /relation/20803053 (Meera), /relation/5372462 (SR) | Footprints and tags | Malviya-B, CVR, Meera, SR geometry | `docs/rel-*.json` |
| 7 | Overpass API | overpass-api.de (one query; later queries hit 502 "at capacity") | Named hostels near campus | Names and levels tags | `docs/overpass.json` |
| 8 | Esri World Imagery (zoom 18) | server.arcgisonline.com World_Imagery tiles | Rooftops with a 10 m game grid | Comb shapes, spine sides, porch bumps, Malviya-B, CVR, Meera, SR | `esri/malviya.jpg`, `rp.jpg`, `bhagirath-ashok.jpg`, `cvr.jpg`, `meera.jpg`, `sr.jpg` |
| 9 | Official 360° tour, "Drone Day View" | https://www.bits-pilani.ac.in/Pilani-Campus-Virtual-tour/index.htm (panorama_BB0577EA) | Aerial oblique | 2-storey combs, roof mumties, solar panels; CVR's yellow block behind | `drone-combs-a.jpg`, `drone-combs-b.jpg`, `drone-y*.jpg` |
| 10 | Tour, "Boys Hostel" | same tour, panorama_BD6CC1EB | Ashok front (plaque read) and CVR opposite | Ashok porch, forecourt, CVR relation | `pano-boys-sheet.jpg`, `pano-boys-plaque.jpg` |
| 11 | Tour, "RP Redi" | panorama_BD62F0B3 | RP facades and kiosk | Arched niches, maroon bands | `pano-rpredi-sheet.jpg` |
| 12 | Tour, "Girls Hostel" | panorama_BD6CA87F | Meera complex blocks | Modern and heritage blocks | `pano-girls-sheet.jpg` |
| 13 | Tour, "MSA 1" | panorama_BD633192 | Room interior | Interior finishes | `pano-msa1-sheet.jpg` |
| 14 | Tour label text (decoded by the hostels-krishna-gandhi agent) | tour script | Hotspot names "Malviya", "Bhagirath Bhawan", "Meera Bhawan"; panoramas "MSA 1-3", "CVR Redi" | Names only | `scratchpad/research/hostels-krishna-gandhi/tour-en.txt` |
| 15 | YouTube "BITS PILANI CAMPUS TOUR (2025-2026)" | https://www.youtube.com/watch?v=XkDvacBC7zA | Frames 0:05–1:45 load, then the player shows "Something went wrong" | Nothing for these buildings | `yt/sheet-tour25.jpg` |
| 16 | Game today | http://localhost:8080/?explore | Explorer views and walk-in | Current state | `game-ashok-overview.png`, `game-ashok-walkin.png`, `game-malviya-overview.png`, `game-malviya-walkin.png`, `game-rana-overview.png`, `game-bhagirath-overview.png`, `game-meera-overview.png`, `game-hostels.json` |

Every path in the last column is under `/private/tmp/claude-501/-Users-mirnal-Documents-Whisperflow/58e9866d-f336-43fa-bce9-096a63ba2c16/scratchpad/research/hostels-newer/` unless shown with its own path.

Sources not accessed:
- Google Maps or Earth (not tried; Esri imagery was enough).
- YouTube https://www.youtube.com/watch?v=bkmKuEguTH8 (title only, via oEmbed: "BITS Pilani, Pilani Campus - Official Campus Tour").
- The XkDvacBC7zA video beyond 1:45 (the player errored; not worked around).
- No building-specific Pilani hostel video was found by search.
- `universe.bits-pilani.ac.in` Hostel Rules booklet (404).
- Two id.bits-pilani.ac.in PDFs (did not download as PDFs).

## H. Comparison with the game today

What matches:
- The comb plans for Ashok, RP and Malviya-A follow OSM. The spine side and the **entrance on the spine's road face match the real porches** for Ashok (exact) and RP (close) [verified].
- Each spine has rooms, corridors, a lobby, a common room and washrooms. The game's 2 floors plus roof are correct [verified].

What is wrong, ranked by visibility:
1. **The facades are plain white boxes with small windows and blue solar panels on every roof** (`game-ashok-overview.png`). Reality: cream walls with beige trim and maroon cornice bands, a ground floor of cusped arched windows with white grilles, a first floor of deep recessed bays or colonnades, and only some roofs with solar panels.
2. **The 3-arch porch is missing** (white scrolled iron gates, a Devanagari name band, a first-floor loggia with paired columns). In the game it is a plain door opening. It is the signature element of every newer Bhawan.
3. **The roof mumties (square stair or tank towers) are missing** at the arm junctions, which define the skyline in the drone view.
4. **Bhagirath is shown closed as a girls' hostel.** SWD 2026 lists it under boys; it could be walk-in like Ashok, as a mirrored comb.
5. **Malviya-B is missing** from the data, leaving empty ground west of Malviya-A.
6. **CV Raman Bhawan is a plain white extrusion.** It should be a mustard-yellow and white modern block with big jali panels, 3–4 storeys. Its `h` 11 is about right for 3 storeys [visual estimate].
7. **The Meera complex is plain 2-storey white bars.** Reality is peach or ochre blocks with balconies, 3-storey MSA blocks with maroon bands, and a heritage arcaded block. The label sits at the POI, not at the OSM building.
8. **SR Bhawan is missing** (large white HD hostel blocks at x -171…13, z -303…-198).
9. Inside: the lobby is a generic box (`game-ashok-walkin.png`); the stair count of 2 is probably too low (see D).

## I. Uncertainties and hand-offs

Uncertainties:
- **Bhagirath's gender:** the SWD 2026 list puts it under boys. The game and the master index say girls. Other SWD pages carry no gender. Confidence medium–high that it is boys now.
- Malviya gender and occupancy [unknown]. Malviya-B condition: it looks weathered on the aerial, and there is no ground photo [unknown].
- MSA location [unknown]. Which footprint "Meera Bhawan" means on the ground [partly unknown].
- No interior evidence for Ashok, RP, Malviya or Bhagirath: room size, corridor side and stair positions are approximations.
- The Esri imagery date is unknown, and the new complex at x -150…-90, z 600…650 was under construction in it.
- Exact heights were not measured; floor-to-floor is about 3.3–3.6 m [visual estimate].

Hand-offs:
- **Orchestrator / data:** add Malviya-B (OSM relation 5372379), SR Hostel (relation 5372462) and the Meera relation 20803053 to `data/bits-campus.js`. Name the three CVR footprints. Update COORDINATES.md and the master index on Bhagirath's gender.
- **messes:** the Malviya Mess, RP mess and VKB mess sit next to these combs. The SWD pages say each Bhawan has "1 dining hall" and Meera has 2.
- **hostels-shankar-vyas-vk:** RP's north-west arm touches VK's east wing at about x 266–283, z 15–34. Coordinate the shared wall.
- **landscape-water / roads-paths:** the tree belt between Bhagirath and Ashok (x ≈ 300–310); the forecourt, gate pillars and planter at Ashok's porch; the road between Ashok and CVR.
- **workshops-halls:** none.

## Build notes (phase 7, hostels-newer)

Built in `js/world/comb-hostel.js` (CombHostel overrides only; the shared Hostel base class is untouched). Test: `tests/browser/hostels-newer.mjs`.

- **Ashok, Rana Pratap, Malviya-A (walk-in combs).** The OSM outline is squared up into a spine plus arms. Facade all round in the shared "new Bhawan" design: cream render, sand-beige trim and maroon bands, cusped arched ground-floor windows with white scrolled grilles, deep first-floor bays between projecting fins, cornice and coped parapet. The three-arch porch sits on the spine's road face, with raised cusped surrounds. The left arch is open and the middle and right ones have white iron gates. It has the Devanagari name band (अशोक-भवन, राणाप्रताप-भवन, पंडित मदन मोहन मालवीय भवन), a first-floor loggia with paired turned columns, its own parapet, a forecourt and a cycle stand. Inside: vestibule, then lobby, study room, common room, washrooms and rooms along the spine. Each arm has a corridor and rooms, and a dog-leg wing stair where the arm leaves the spine, under a roof mumty. The main stair runs up to the roof terrace (parapets, tanks, washing lines), and solar panels sit on two arms only. Interiors are zoned like the other Bhawans.
- **Bhagirath (closed).** The same comb, mirrored, with its porch facing west. Light-blue reveals and green collapsible gates (SWD photo), all three arches shut. It stays closed until the boys/girls question in section I is settled.
- **Malviya-B, SR, Meera (closed, footprints not in the data file).** Their outlines are defined in `ANNEX` at the end of `comb-hostel.js` (OSM ODbL, converted with COORDINATES.md) and appended to `BITS_CAMPUS.buildings` at module load. This happens only if the data doesn't already have them (matched by `annex` id or name), so moving them into `data/bits-campus.js` later is a no-op here.
  - Malviya-B, relation 5372379: outer ring x -265.7…-216.3, z 135.5…206, with four courts. Comb style.
  - SR Bhawan, relation 5372462: outer ring x -170.8…13.1, z -302.9…-197.8, with two courts. White "modern" style with sunshades. Its gate (yellow pillars, a steel gate with diagonal bars, a name board) stands on the service road at about (5, -237); that position is an approximation.
  - Meera, relation 20803053: way 360838104 (the jagged block, x -205.7…-155.8, z 664.6…697.7, comb style) and way 360838157 (the long bar, x -186.4…-88.3, z 645.9…673.2, peach and white).
  - The exact vertex lists to add to the data file are the `outer` and `holes` arrays in `ANNEX`.
- **Sight line.** Nothing built here comes within 157 m of the Clock Tower to Saraswati Mandir axis.
- **Performance.** Measured from outside, against 032ec0e: CPU per frame is up 0.0–0.25 ms (about 0–6 %) and draw calls up 10–20. Frame time stays at vsync (16.7 ms) in both.
- **Approximations.** No interior evidence for these Bhawans, so room sizes, corridor sides and stair positions are inferred. Each closed block's single doorway sits a quarter of the way along its longest face. Meera's block colours are assigned by guess.
