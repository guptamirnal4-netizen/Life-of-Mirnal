# Messes, dining halls and food places (`messes`)

Owner: research agent `messes`. Scope: VKB mess, RP mess, Ram-Budh mess, Shankar Vyas Mess, Malviya Mess, the OSM "Boys Canteen", the All Night Canteen (ANC), C'not market and the hostel Redis. Coordinates follow [COORDINATES.md](../COORDINATES.md): metres, x east, z south, origin at the Rotunda.

Evidence folder (not in the repo): `$R` = `/private/tmp/claude-501/-Users-mirnal-Documents-Whisperflow/58e9866d-f336-43fa-bce9-096a63ba2c16/scratchpad/research/messes/`

Tags: **[verified]** seen in a source or in the code, **[visual estimate]** measured from imagery or photos, **[approximation]** a proposal, **[unknown]**.

## Summary

1. **Every boys' mess on OSM uses the same plan type** [visual estimate, Esri imagery]. A long single-storey **dining hall** block about 17–20 × 35–37 m sits on one side. It is joined to a lower, cluttered **kitchen and service block** with small courts, about 25 × 20 m. VKB and RP are mirror twins placed back to back. Shankar-Vyas copies VKB, and Ram-Budh is the same type rotated. Malviya Mess is a different, long east–west block.
2. **The official tour has two mess interiors, "Student Mess 1" and "Student Mess 2"** [verified]. Neither names its Bhawan [unknown]. They show two hall types:
   - **Type A (Mess 1):** a single span with white walls, **ochre-painted transverse ceiling beams**, tube lights on the walls, ceiling fans, windows down both long walls, grey-green Kota stone floor, **stainless-steel tables with attached swivel seats** in long rows, a **serving wall with three hatches** (white tile under black granite, jali panels above), and a blue snack and drinks kiosk by the double doors.
   - **Type B (Mess 2):** a double-height hall on a **column grid**, with **clerestory jali windows** high up, Kota floor with ochre inlay strips, a stainless-steel bain-marie line in an open recess, a **brick-clad "ROOTS" snack counter**, and a whiteboard reading "TAKE ALL YOU CAN EAT, BUT EAT ALL YOU TAKE … food wastage … kgs which can feed … people".
3. **The game's VKB dining hall is a 14 × 9 m school-canteen box** [verified, code]. It has wooden tables with benches, a terrazzo floor, a 3.3 m ceiling, one counter with four tubs, and a "PITSTOP" extras counter. The real hall is about 17–20 × 35 m and 4.5–7 m high, with steel tables and seats, a Kota floor and hatch-style serving counters [visual estimate].
4. **OSM `h = 3.3` m is too low for every mess.** Hall blocks are about 5–7 m and kitchens about 4 m [visual estimate].
5. **ANC is an open-air food court:** a long tin canopy of stalls against a tall, weathered stone building, set on a stone-paved yard behind a low wall with railings. It has **red, maroon and brown round tables with bright green, blue, orange and red mesh plastic chairs**, a street lamp, and is lit at night [verified, tour "All Night Canteen"]. The game's ANC is a 16 × 12 m red-tiled pavilion with four wooden tables [verified, code].
6. **Gameplay:** keep the `mess` room id, door side and exit. Grow the room inside the VKB west wing, which is the likely hall. Swap in steel tables and seats and hatch counters. Nothing else in this area needs to be enterable.

---

## 1. VKB mess (gameplay host of `mess`)

### A. Identification

| Item | Value |
|---|---|
| Name | OSM "VKB mess" [verified]. A 2006 alumni travelogue (GWU) names "VKB" mess servants [verified]. What VKB expands to is **[unknown]**. Given where it sits (directly south of Vishwakarma Bhawan), a "VK Bhawan" mess is plausible. The game comment says the mess is "beside Krishna Bhawan" [verified, code], but Krishna is about 70 m west [verified, data]. |
| Category | Hostel mess (dining hall plus kitchen). The official site says there is "a common kitchen cum mess unit for every set of two boys' hostels" [verified, bits-pilani.ac.in/?p=16992]. Campus-wide there are "seven messes … and one all-night canteen" run by SSMS [verified, bits-pilani.ac.in/pilani/about-us]. |
| OSM footprint | 18 vertices, x 244.9…287.7, z 140.3…178.9 (43 × 39 m) [verified]. Two parts: a **west wing** of about x 245…265, z 140…179, and an **east block** of about x 260…288, z 144…168. |
| Imagery check | The Esri outline matches in shape. The imagery sits about +4…+6 m south and east of OSM, the same registration offset other reports found [visual estimate]. In imagery the west wing shows a **ribbed roof with stripes running east–west** (eight to nine bands), typical of a hall roof. The east block is a jumble of low roofs and small courts (the kitchen) [visual estimate, `$R/aerial-vkb-rp.jpg`]. **Keep OSM as the placement truth.** |
| Neighbours | North: Vishwakarma Bhawan (z ≤ 132). East: RP mess (x 290–334), separated by a 2–5 m service gap [verified, data]. Around it: trees and dirt service tracks. A track runs north–south at about x 265–275 on the south side [visual estimate]. |
| Orientation | Long axis of the hall wing is about north–south, rotated about −9° like the hostel grid [visual estimate]. |

### B. Exterior

- **Floors:** one storey [visual estimate, imagery shadows; no exterior photo of this mess was found].
- **Height:**
  - The hall should be about 5–6 m to the parapet, based on interior ceiling heights (section E) [approximation].
  - The kitchen block should be about 4 m [approximation].
  - The OSM `h = 3.3` m is too low [visual estimate].
- **Shape:** an L or T made of the hall wing and the kitchen block. Small notched yards sit on the north and south of the kitchen block [verified, OSM; visual estimate, imagery].
- **Roof:** flat RCC. The hall roof shows regular east–west ribs, either beams expressed above the roof or clerestory upstands [visual estimate]. No PV is visible in the imagery [visual estimate].
- **Colours and materials:**
  - No exterior photo of VKB [unknown].
  - The nearby RP and Shankar Bhawans use cream walls with maroon bands [verified, tour "RP Redi"; see `hostels-newer`].
  - Recommendation: cream render, a maroon band at plinth and parapet, and white window frames. This is consistent with the existing `mess` facade palette (`wall #efe5cf`, `band #a8443a`) [approximation].
- **Windows:**
  - Inside, the hall has tall rectangular windows with iron grilles down both long walls, sill about 1 m, head about 3 m [verified, tour Mess 1 interior].
  - The Type B hall adds jali clerestory windows [verified, tour Mess 2].
- **Doors:** pairs of wooden (veneer) double doors with glass vision panels and a glazed fanlight above, about 1.8 × 2.4 m [verified, tour Mess 1 and Mess 2]. Which face of VKB they sit on is **[unknown]**.

### C. Floor plan (approximation)

Based on the imagery split and the tour interiors. North is up. Not to scale.

```
 z140 ┌─────────── west wing (hall) ──────────┐
      │  windows ▯  ▯  ▯  ▯  ▯  ▯  ▯  ▯       │┌───── kitchen block ─────────┐
      │                                       ││ stores │ court │ cooking    │
      │  ═══ ═══ ═══ ═══   steel tables       ││────────┘       └─────┐      │
 z159 D  ═══ ═══ ═══ ═══   (rows E–W)  ║hatch ││ wash/dish   ┌────┐   │ prep │
      │  ═══ ═══ ═══ ═══               ║hatch ├┘ return     │yard│   │      │
      │  ═══ ═══ ═══ ═══               ║hatch │             └────┘   └──────┘
      │  [kiosk]   [tray trolleys]            │
 z179 └───────────────────────────────────────┘
      x245                               x265   x268 … x288
 D = west door (game exit)   ║ = serving hatches in the wall shared with the kitchen
```

- Hall: x ≈ 247…264, z ≈ 142…177 inside, about 17 × 35 m [approximation, from OSM and imagery].
- Serving wall: the hall's east wall, shared with the kitchen [approximation; the tour shows the counters set into a wall with kitchen behind, verified].
- Wash area: in the tour, a stainless dish-return table and racks sit beside the hatches [verified, Mess 1 y270]. Mess 2 has a **wash hatch**: a black granite shelf in a tiled opening, with a staff member behind, next to a doorway into the kitchen [verified, `$R/hi-mess2hatch.jpg`]. No student hand-wash basins appear in the captured views [unknown].

### D. Staircases

None seen. The building is single-storey [visual estimate]. Roof access, if any, is **[unknown]**. Do not add stairs.

### E. Interior (evidence from the official tour; the Bhawan is unnamed)

| Element | Type A ("Student Mess 1") | Type B ("Student Mess 2") |
|---|---|---|
| Floor | Grey-green Kota stone slabs, about 0.6 × 0.6 m, mixed light and dark [verified] | The same Kota, with **ochre (yellow) inlay strips** in a dashed grid and a solid ochre band along the column line [verified] |
| Walls | White emulsion. The serving wall is framed by a **grey stone band** and pillars [verified] | White upper, **grey dado (about 1.4 m)** on piers, cream in the kitchen recess [verified] |
| Ceiling | Flat, white, with deep **ochre-painted transverse beams** at about 4 m spacing. Clear height about 4.2–4.8 m [visual estimate] | Double height, about 6–7 m, with downstand beams on a column grid and **jali clerestory windows** [visual estimate] |
| Columns | None in the hall: a single span of about 15–17 m [visual estimate] | One row of square white columns, about 0.6 m, splitting the hall into two bays [verified] |
| Lighting | Wall-mounted tube lights at about 3.5 m, ceiling fans (two per bay), wall exhaust fans high up, small blue digital wall displays [verified] | Ceiling fans on long downrods, tube lights, the same blue wall displays [verified] |
| Tables and seats | **Stainless-steel tables with attached swivel seats**: four seats a side on steel frames, tables about 2.4 × 0.75 m, in rows perpendicular to the long walls, with a central aisle [verified] | The same steel tables with attached seats, laid in a grid [verified] |
| Serving | A wall with **three hatches**: white-tiled counters with black granite tops, steel sneeze-guard frames, decorative **white jali panels** over two hatches, staff in caps behind. An open doorway to the kitchen shows tiled walls and steel fridges [verified, `$R/pano-mess1-y0.jpg`, `$R/hi-mess1notice.jpg`] | An open recess under a beam: **a line of three stainless bain-marie units** with a steel table in front, a yellow floor marking, a glazed kitchen viewing window and a menu or notice board [verified, `$R/pano-mess2-y0.jpg`] |
| Extras and snacks | A **blue snack and drinks kiosk** with a Coca-Cola fridge and a glass display case, beside the double doors [verified, Mess 1 y180] | A **"ROOTS"-branded snack counter** with faux-brick cladding, timber beams, wicker baskets and a drinks fridge [verified, `$R/hi-mess2shop.jpg`] |
| Other | Steel **tray trolleys** labelled "VEG" and "NON[-VEG]" [verified, `$R/hi-mess1trolley.jpg`], a chest freezer, green wheelie bins, a wall clock, a steel rack [verified] | Steel racks, a steel prep table, tray trolleys, a few steel chairs along the walls [verified] |
| Signage | A notice poster by the kitchen door [verified; text unreadable] | Whiteboard: "TAKE ALL YOU CAN EAT, BUT EAT ALL YOU TAKE / YESTERDAY'S FOOD WASTAGE … KGS WHICH CAN FEED … PEOPLE / MESS COMMITTEE" [verified, `$R/hi-mess2board.jpg`] |
| Trays | Steel compartment trays (thali trays), stacked on the trolleys [verified]. The 2006 photo also shows the same trays [verified, GWU] | the same |

History (2006, GWU, labelled "RBM mess" and "VKB mess"): black-topped steel tables, terrazzo floor, a blue-and-cream wall, and a serving counter with a green stone top in front of the kitchen. "Marble table tops have been replaced by … metal" [verified]. This is useful only as a dated reference.

Which tour mess is VKB: **[unknown]**. Type A has a single span and windows down both sides, which fits a narrow (about 17 m) hall wing like VKB's best [approximation].

### F. Gameplay

| Item | Today [verified, live game] | Proposal |
|---|---|---|
| Room box | x 247.47…261.47, z 154.8…163.8 (14 × 9 m), y0 = 0, inside the west wing | Grow it to about **x 247.5…262.5, z 146…174** (15 × 28 m) in the west wing. That still fits `fitRoom` with margin [approximation]. If `fitRoom` cannot take a box this deep, 15 × 18 m is the minimum that reads as a hall. |
| Door | West side, at z 159.3 | **Keep** the west side and the z [approximation]. No contrary evidence; the real door side is [unknown]. |
| Exit | (244.87, 159.3) | Keep. Tests rely on it. |
| Ceiling | 3.3 m (OSM h) | 4.5 m with ochre beams (Type A). Raise the host's `h` to about 5.5 m for the west wing [approximation]. |
| Interactables | `mess` at (x1 − 2.1, cz); `pitstop` by the door; `messmenu` outside the door | Keep the ids. Move `mess` to the middle hatch on the **east wall**, put `pitstop` at the snack kiosk beside the door (real equivalent: the blue kiosk or ROOTS counter), and add an optional `tray` pickup at the trolleys. The name "Pitstop" is **[unknown]** in sources; keep it as game fiction or rename it to a generic "Snack counter". |
| NPC spots | `spots.mess` at bench seats; `messStaff` behind the counter | Seats along the steel tables, about 8 per table. Staff stand behind each of the three hatches, inside a non-walkable kitchen strip [approximation]. |
| Collision | Room walls plus table boxes | Table and seat units as single boxes of about 2.4 × 1.9 m. Keep an aisle of at least 2 m along the serving wall and a central aisle of at least 2.5 m. |
| Kitchen | Not modelled | Not enterable. Show it through the hatches as a tiled backdrop [approximation]. |
| Camera | Indoor | The ceiling at 4.5 m gives room for the third-person camera. Clamp inside the walls. |

### H. Comparison with the game today (VKB)

Captures: `$R/game-map-VKB.png`, `$R/game-vkb-door-outside.png`, `$R/game-vkb-inside.png`, `$R/game-vkb-inside-counter.png`, `$R/game-vkb-southside.png`.

**What matches:**

- The building outline (OSM) [verified].
- One storey [verified].
- The room is placed in the west wing, which is plausibly the hall [approximation].
- Ceiling fans and tube lights [verified].
- Steel serving tubs [verified].
- The cream wall [verified].

**What is wrong, most visible first:**

1. **Hall size:** 14 × 9 m against a real hall of about 17 × 35 m. The room reads as a classroom.
2. **Furniture:** wooden tables with separate dark benches, where the real halls have **stainless-steel tables with attached swivel seats** and steel trays.
3. **Floor:** the speckled terrazzo texture should be **grey-green Kota slabs**, with ochre inlay strips if Type B is used.
4. **Serving:** one free-standing steel counter, where the real halls use **hatches set in a wall** (white tile, black granite top, jali above) or a bain-marie line in a recess.
5. **Ceiling:** flat and 3.3 m, where the real ceiling is 4.5 m with ochre transverse beams (or double height with jali clerestory).
6. **Exterior:** a plain 3.3 m white extrusion. Raise the hall to about 5.5 m, add a maroon parapet band and taller grilled windows.
7. **Snack counter:** the "PITSTOP" sign is a navy panel. Real messes have a blue kiosk or a brick-clad counter with a drinks fridge.
8. **Menu board:** green chalkboard style. Real messes show whiteboards with notices ("Take all you can eat…"). The menu board can stay as game UI.

---

## 2. RP mess

- **A.** OSM "RP mess", x 290.0…334.2, z 129.5…167.8 (44 × 38 m), 16 vertices [verified]. It is VKB's **mirror twin**. The hall wing is on the **east** (about x 313…334, z 130…167, plain light roof in the imagery). The kitchen block is on the west (x 290…313) [visual estimate, `$R/aerial-vkb-rp.jpg`]. Name: RP = Rana Pratap Bhawan, which lies to the north [approximation]. Neighbours: Rana Pratap Bhawan to the north (z ≤ 116), VKB mess to the west, Ashok Bhawan to the south-east.
- **B.** Single storey, flat roof. The hall is about 5–6 m and the kitchen about 4 m [approximation]. No exterior photo [unknown].
- **C.** Mirror of the VKB ASCII plan: hall on the east, hatches in its west wall [approximation].
- **D.** No stairs [visual estimate].
- **E.** Interior unknown. Use Type A or B [approximation].
- **F.** Not enterable. Closed extrusion with corrected height. Doors on the hall's long walls are decorative.
- **H.** The game has a plain 3.3 m extrusion (`$R/game-map-RPmess.png`; the RP mess label is visible in `$R/game-map-VKB.png`). Fix: raise the height and use the mess facade with a maroon band.

## 3. Ram-Budh mess

- **A.** OSM "Ram-Budh mess", x −120.2…−74.2, z 195.2…233.9 (46 × 39 m), 16 vertices [verified]. Neighbours: Ram Bhawan to the north (z ≤ 191), Budh Bhawan to the south (z ≥ 245), the Ram Redi POI (−121, 187) and Budh Redi POI (−112, 256) at its corners, and the Da Cloud Cafe POI (−118, 209) at its west side [verified, data]. Imagery: the hall block is on the **east** (about x −96…−74, z 197…234, light roof). The kitchen with courts is on the west (x −120…−96) [visual estimate, `$R/aerial-ramBudh.jpg`]. The 2006 GWU "RBM mess" label may mean Ram-Budh-Malviya or Ram-Budh Mess [unknown].
- **B–E.** Same type as VKB [visual estimate]. No interior evidence [unknown].
- **F.** Not enterable.
- **H.** Plain 3.3 m extrusion (`$R/game-map-RamBudh.png`). Fix the height and facade.

## 4. Shankar Vyas Mess

- **A.** OSM "Shankar Vyas Mess", x 187.2…230.5, z 460.3…498.9 (43 × 39 m), 22 vertices [verified]. It sits between Shankar Bhawan (north, z ≤ 455) and Vyas Bhawan (south). Imagery: the **hall is the west wing** (about x 188…207, z 462…499, plain light roof). The kitchen block is on the east, with service notches on the south [visual estimate, `$R/aerial-sv.jpg`]. SWD Bhawan pages state a dining hall for 400 [verified, via `hostels-shankar-vyas-vk` report].
- **B–E.** Same type as VKB [visual estimate]. Interior unknown.
- **F.** Not enterable. Keep a 15 m clearance from Vyas if its north edge is extended (see `hostels-shankar-vyas-vk`).
- **H.** Plain extrusion (`$R/game-map-ShankarVyas.png`). Fix the height and facade.

## 5. Malviya Mess

- **A.** OSM "Malviya Mess", x −257.7…−201.0, z 207.8…230.9 (57 × 23 m), 12 vertices [verified]. It is a **long east–west block** with a separate west annex. Imagery shows a dark-roofed main block at about x −240…−205, z 215…235 (south of the OSM line by about 5 m) and a lighter annex at the west [visual estimate, `$R/aerial-malviya.jpg`]. Neighbours: Malviya-A to the north-east, the SAC to the south-east, Looters (x −183…−179, z 229…238) about 20 m east [verified, data].
- **B.** Single storey [visual estimate]. Dark roof (possibly sheet or weathered RCC) [visual estimate]. No photo [unknown]. The GWU 2006 photo "behind the mess, in front of Malviya" shows the **Malviya hostel** (a two-storey yellow block with a louvred loggia), not the mess [verified].
- **C–E.** Plan unknown. A hall along the long axis is plausible [approximation].
- **F.** Not enterable.
- **H.** Plain extrusion (`$R/game-map-MalviyaMess.png`).

## 6. "Boys Canteen" (OSM)

OSM kind `food`, x 378.8…399.7, z −501.3…−460.3 (21 × 41 m), `inCampus: false` [verified, data]. It lies outside the campus boundary, south-east of the director's area. No photo or text source was found [unknown]. Recommendation: keep it as a closed extrusion and leave it unresearched.

## 7. ANC (All Night Canteen)

- **A.** POI "All night canteen" (232.9, 343.4) [verified]. It sits near the "ANC Circle" junction. Neighbours: Gandhi Bhawan (x 123…199, z 207…319) to the west, Shankar Bhawan to the south, the Amul Parlour POI (237, 382) to the south [verified, data]. Imagery near the POI shows a long dark roof at about x 240…265, z 330…345 and a large light building to the east [visual estimate, `$R/aerial-anc.jpg`]. The exact outline is **[unknown]**; no OSM building.
- **B. Exterior** [verified, tour "All Night Canteen", night panorama, `$R/sheet-anc.jpg`]:
  - A row of **open-fronted food stalls** under a continuous flat tin or sheet canopy (about 3 m high), strung with fairy lights.
  - Steel counters, chest freezers, a water-bottle stack and fridges at the front.
  - Behind and above: a **tall, weathered stone or render building** (about 8–10 m) with small green-shuttered windows. Black water tanks sit on the canopy roof.
  - Seating yard: stone-slab paving with planters (teal pots). **Round tables** (red, maroon and brown) and **mesh plastic chairs** in green, blue, orange and red.
  - The yard is enclosed by a **low white wall with a maroon coping and an iron railing** on top (about 1 m + 1 m), with trees beyond.
  - A tall street lamp with twin heads. A gate opens to the road with a sign board.
- **ANC Circle** [verified, tour "ANC Circle", `$R/sheet-anccircle.jpg`]:
  - A four-way junction of tree-lined asphalt roads with zebra crossings and black-and-white painted kerbs.
  - Red-banded tree trunks and blue and red bins.
  - A small **hexagonal kiosk (gazebo)** with a grey pyramidal roof.
  - A blue direction sign.
  - Hostel facades (cream with maroon bands) on two corners.
  - Road details belong to `roads-paths`.
- **C–D.** Single-storey stalls, no stairs.
- **F. Gameplay:** keep `canteen` and `canteenStaff` and the label. Rebuild as a long canopy (about 25 × 4 m) along the stall row, with a seating yard of about 20 × 15 m in front, 8–10 round tables and coloured chairs, and a perimeter wall with railings and a gate [approximation]. Keep the interactable within 3 m of a counter.
- **H. Today** (`$R/game-anc.png`): a square, red-tiled pavilion with four wooden tables, open on all sides. Fixes: replace the tile roof with a flat grey tin canopy and string lights, add round coloured tables and mesh chairs, the perimeter wall with railing, and a tall backdrop wall.

## 8. C'not (Connaught) market

- POIs "C'not" (426.4, 776.7) and "C'not series" (401.7, 775.8), plus shop POIs Nobles (418, 822), Annapurna (426, 823), Vijay Restaurant (443, 820), Kamals (471, 770), Al Café (462, 771), Cannaught Pharmacy (455, 771) [verified, data].
- Tour "Connaught Place (Cnot)" [verified, `$R/sheet-cnot.jpg`]:
  - A **sandy, unpaved wide street** lined with **single-storey shop rows**: cream render, small arcaded fronts, each shop with a bright signboard ("NOBLES", "Annapurna Restaurant", Hindi signs).
  - **Raised brick-red planter platforms** with outdoor seating (blue-painted metal tables, plastic chairs) in front.
  - Large shade trees, parked motorbikes, cycles and cars.
  - A decorative grey **lamp pillar** with a crown finial in the open space.
- The game has only labels [verified, code: no C'not builder].
- Proposal: two facing shop rows (about 3.5 m high, 4 m bays) with sign canvases and the planter platforms [approximation]. Not enterable.

## 9. Hostel Redis (snack kiosks)

- **RP Redi** [verified, tour "RP Redi", `$R/sheet-rpredi.jpg`]:
  - A **cream-painted timber kiosk** (about 2.5 × 2 m, about 2.6 m high) with a corrugated sheet roof and a front serving window.
  - Chip packets hang on strings. A printed menu panel.
  - Beside it, a **green shade net** stretched over **green-painted wooden tables and long benches** and maroon plastic stools, on a green-painted slab against the Bhawan wall.
  - Big trees on a sandy ground.
- **CVR Redi** and **Nagarji ki Redi** tour panoramas were captured (`$R/sheet-cvrredi.jpg`, `$R/sheet-nagarji.jpg`). I did not analyse them in detail.
- **POIs:** Ram Redi (−121, 187), Budh Redi (−112, 256), Gandhi Redi by Ratan Ji (154, 199) [verified, data].
- **Game:** none built. Proposal: one reusable "redi" prefab (kiosk + shade net + green tables + stools) at each POI [approximation].

## G. Sources

| # | Source | URL | What it shows | Confirms | Local capture |
|---|---|---|---|---|---|
| 1 | BITS Pilani official 360° tour, "Student Mess 1" (panorama_BD6308CE_B183_B202_4197_23DE8DC4C334) | https://www.bits-pilani.ac.in/Pilani-Campus-Virtual-tour/index.htm | Mess hall interior | Type A hall: beams, steel tables, hatches, kiosk, trolleys, floor | `$R/pano-mess1-*.jpg`, `$R/hi-mess1*.jpg`, `$R/crop-mess1-trolley.jpg`, tiles `$R/tiles0/mess1/` |
| 2 | Same tour, "Student Mess 2" (panorama_BD631959_B183_920F_41DA_0899AE6FFAAE) | same | Mess hall interior | Type B hall: columns, clerestory jali, bain-marie line, ROOTS counter, whiteboard, wash hatch | `$R/pano-mess2-*.jpg`, `$R/hi-mess2*.jpg`, `$R/tiles0/mess2/` |
| 3 | Same tour, "All Night Canteen" (panorama_BD6738DE_B18C_7210_41C3_27B21BFBF6C8) | same | ANC at night | Canopy stalls, yard, furniture, wall | `$R/pano-anc-*.jpg`, `$R/sheet-anc.jpg` |
| 4 | Same tour, "ANC Circle" (panorama_D764205C_C019_2709_41C8_091460D30F06) | same | Junction | Road and kiosk context | `$R/pano-anccircle-*.jpg`, `$R/sheet-anccircle.jpg` |
| 5 | Same tour, "Connaught Place (Cnot)" (panorama_BD6CAAC4_B18C_9670_41D7_3C26C7097D0E) | same | Market street | Shop rows, planters, signage | `$R/pano-cnot-*.jpg`, `$R/sheet-cnot.jpg` |
| 6 | Same tour, "RP Redi", "CVR Redi", "Nagarji ki Redi" | same | Kiosks | Redi prefab | `$R/sheet-rpredi.jpg`, `$R/sheet-cvrredi.jpg`, `$R/sheet-nagarji.jpg` |
| 7 | Same tour, "Eatery - Looters", "Institute Canteen", "Eatery - Food Ministry", "Eatery - Sky Lab" | same | Other eateries | Hand-off context only | `$R/sheet-looters.jpg`, `$R/sheet-instcanteen.jpg`, `$R/sheet-foodmin.jpg`, `$R/sheet-skylab.jpg` |
| 8 | Esri World Imagery tiles with a game grid and OSM outlines | https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer | Top-down view of each mess and ANC | Hall/kitchen split, twin plan, offset | `$R/aerial-vkb-rp.jpg`, `$R/aerial-sv.jpg`, `$R/aerial-ramBudh.jpg`, `$R/aerial-malviya.jpg`, `$R/aerial-anc.jpg` |
| 9 | BITS Pilani, About us (Pilani) | https://www.bits-pilani.ac.in/pilani/about-us/ | Text | SSMS runs "seven messes … and one all-night canteen"; Sodexo tie-up | (text) |
| 10 | BITS Pilani, Student Facilities | https://www.bits-pilani.ac.in/?p=16992 | Text | "common kitchen cum mess unit for every set of two boys' hostels"; girls' mess within the hostel | (text) |
| 11 | R. Simha, "Bees Saal Baad: Return to Pilani – The Mess" (GWU, photos dated 2006) | https://www2.seas.gwu.edu/~simhaweb/misc/pilani/mess.html | RBM and VKB mess photos, Malviya hostel exterior | Names "RBM" and "VKB" messes; 2006 interiors; steel tables replaced marble | `$R/gwu/*.jpg` |
| 12 | YouTube, "1st Year Hostel & Mess Tour of BITS Pilani \| SR Bhawan Official Tour Video" | https://www.youtube.com/watch?v=OHN-gBhy2hg | 4:52–6:10 SR Bhawan mess (out of my building list) | Bain-marie serving, cream and wood-panel walls | `$R/yt-sr/*.png` |
| 13 | Repo code and data | `js/world/bits-world.js` (`interiorMess`, `buildANC`, `BITS_ROOMS`), `data/bits-campus.js` | | Current game | `$R/game-*.png`, `$R/game-info.json` |
| 14 | Live game, explorer | http://localhost:8080/?explore | Map and walk views | Section H | `$R/game-*.png` |

## I. Uncertainties and hand-offs

**Uncertainties:**

- Which Bhawan each tour mess ("Student Mess 1/2") belongs to [unknown].
- What "VKB" stands for [unknown].
- Exterior appearance of every mess: no exterior photos were found [unknown].
- Door positions on every mess [unknown].
- The hall/kitchen split comes from roof texture only [visual estimate].
- The tour's "Pitstop" equivalent: the snack counters are branded only by "ROOTS" in Mess 2 [verified].
- ANC outline and size [unknown].
- Whether the "Boys Canteen" polygon is a real canteen [unknown].
- The Esri imagery is offset about 5 m from OSM; OSM is kept as placement truth.

**Not accessed:**

- Google Maps and Earth (not attempted).
- SWD Bhawan pages (connection refused this session).
- YouTube mess tours specific to the VKB, RP, Ram-Budh, SV or Malviya messes: none found by search.

**Hand-offs:**

- **`sac`:** Looters (OSM x −183…−179, z 229…238) and the tour "Eatery - Looters" panorama (outdoor paved seating, a lit "LOOTERS" sign on a tent canopy, grey hip-roofed pavilions, TOTT next door). Keep it with the SAC kiosk grid.
- **`main-building`:** "Institute Canteen" panorama (Institutional Cafe POI, −17, −148). It has wooden tables, steel chairs with cane seats, an ochre dado, curtains and columns with fluted capitals.
- **`hostels-newer`:** the SR Bhawan mess (YouTube 4:52–6:10); the CV Raman redi; Meera's own mess. RP Redi sits against Rana Pratap's facade.
- **`roads-paths`:** ANC Circle junction (zebra crossings, painted kerbs, gazebo kiosk); the C'not unpaved street and lamp pillar; service tracks around the messes.
- **`landscape-water`:** trees in the ANC yard and at C'not.
- **Orchestrator:** raise `h` for the mess buildings in `data/bits-campus.js` (hall wings about 5.5 m). Approve enlarging the `mess` room (section F). Optionally add an ANC footprint once its outline is known.

## Build notes

Module `js/world/buildings/messes.js` (id `messes`, registered in `registry.js`). Test: `tests/browser/messes.mjs` (walk-through, screenshots; `PERF=1` for frame timing against `?nomodules`).

- **Plan type.** Every boys' mess is one type: a single-storey dining hall (ceiling 4.6 m, roof 4.9 m, parapet top 5.6 m) plus a lower kitchen block (roof 3.9 m), cream render with maroon plinth and band, grilled windows under sunshades, pilasters on the bay lines, a ribbed hall roof, water tanks and flues on the kitchen. Each OSM footprint is squared up in its own frame (hostel grid, about -9 degrees) and split into cells; cells inside the hall rectangle get the hall height. Footprint `h` is set to 5.6 m (Boys Canteen 4.4 m) for labels.
- **VKB (enterable).** The gameplay room `mess` keeps its id, door side, `roomAt` rectangle and exit, but becomes part of a real 15 x 23 m hall (Type A from the tour): ochre transverse beams, fans and tube lights, Kota floor, steel tables with attached stools in rows, three serving hatches and a staff door in the kitchen wall, a snack kiosk by the door, a second west door. The room's plain walls, ceiling, wooden tables and lights are removed; its counter, tubs, menu boards, Pitstop counter and fridge are turned about the door to line up with the hall; its colliders, interactables, 29 NPC seats and staff spot move with them. A wash room (trough basins, tiled dado, dish return) closes the north end and a store (locked door) the south end. Interior is kit zone `hall` (draws only nearby).
- **RP, Ram-Budh, Shankar-Vyas, Malviya, Boys Canteen.** Same shell, closed (doors shut, walls collide); RP and Ram-Budh are VKB's mirror twin, SV a copy, Malviya a long hall with kitchens at both ends, Boys Canteen hall only.
- **ANC.** No OSM outline of its own: built in front of the unnamed tall building it backs onto (centroid 251.7, 348.0). A tin canopy of five stalls with signboards, paved yard with round tables and mesh chairs, a low wall with railings and a gate. `campus.buildANC` is replaced so the `canteen` interactable, staff spot and 24 seat spots land in the new yard.
- **C'not.** The two unnamed OSM shop rows (centroids 431.2, 773.1 and 434.5, 821.5) get arcaded shopfronts on a 0.3 m plinth (one step, walkable), named signboards, open and shuttered shops with counters, a sandy street with raised brick planters, tables, a lamp pillar and parked bikes.
- **Sight line.** Nothing is near the Clock Tower to Saraswati Mandir axis.
- **Perf (headless Chrome, Metal).** Frame time with the module is no worse than `?nomodules` in all five scenes (about 16.7 to 19.8 ms vs 19.7 to 24.5 ms; vsync-bound). Draw calls +0 to +150 (C'not street 739 vs 591, the worst); CPU per frame at C'not 8.4 ms vs 5.0 ms.
- **Tests.** `tests/browser/messes.mjs`: all PASS, no console errors. `tests/browser/mess.mjs` (gameplay): the old crash on `reading 'exit'` is fixed (the `hostelroom` lookup is optional) and the "mess closed" toast race with the 09:00 bell is fixed. Two checks still fail with or without this module, so they are not caused by it: "walked back into the room from outside" (Krishna Bhawan room layout) and "batchmates walk to the mess for lunch" (no classmate NPC has a path at 13:01; NPC scheduling in main.js).
