# Research review: BITS Pilani reconstruction

Reviewer: central research reviewer. Date: 2026-11-17. Research only; no game code was changed.

Inputs read: [COORDINATES.md](COORDINATES.md), [campus-master-index.md](campus-master-index.md) and all 16 reports in [buildings/](buildings/). `messes.md` and `roads-paths.md` arrived late and were added to this review in a second pass the same day.

## 0. Is the research complete?

**Yes in coverage: all 16 expected reports now exist.** Some hand-offs are still open.

- **`messes.md` and `roads-paths.md` are now written** (an earlier version of this review listed them as missing). Here is what happened to the hand-offs other reports sent to them:
  - **Picked up:** the five boys' mess blocks (VKB, RP, Ram-Budh, Shankar-Vyas, Malviya), the Boys Canteen (outside the boundary, left unresearched), ANC, C'not and the Redis by `messes`; the road network, kerbs, lamps, the driveway arc and the main axis by `roads-paths`.
  - **Sent back to other owners:** Looters goes to `sac`. The NAB portal stairs, the Snake Path bollards and the south ramp go to `nab`. The Rotunda tiers, ramps and driveway planting go to `main-building`. The Shiv Ganga walks and steps go to `landscape-water`. The SR Bhawan mess and the CV Raman redi go to `hostels-newer`. These owners have already written their reports, so this work has no live owner (see section 3).
  - **Not picked up by anyone:** the library forecourt pavers. `library` describes them ("grey octagonal and red square interlocking pavers"), but `roads-paths` does not cover them.
- **Some captures are gone.** The scratchpad no longer holds capture folders for `fd1`, `fd2-fd3`, `nab` and `sac`. Their claims still cite public URLs, so they can be re-checked at the source, but the local evidence a builder would open is gone. `fd1` already notes that its YouTube captures were missing. The new `messes` (64 files) and `roads-paths` (52 files) capture folders are present, but they sit in the same session scratchpad and are just as likely to be lost.
- **Every report is complete in structure.** Each one has sections A to I: identification, exterior, layout, stairs, interior, gameplay, sources, comparison with the game, and uncertainties.

---

## 1. Conflicts between reports

### 1.1 Names and ownership

| Topic | Report A | Report B | Resolution |
|---|---|---|---|
| What the OSM "Main Building (West/East Wing)" and "FD-II" footprints are | `main-building` says the naming is unresolved. It treats the wings as Main Building and the central strip as the clock-tower block. | `fd2-fd3`, from the official 2026-27 timetable plan: West Wing = **FD III**, East Wing = **FD II quad**, OSM "FD-II" strip = the FD II connecting **spine** plus the tower base (rooms 21xx/22xx). | **Accept `fd2-fd3`.** It rests on an official plan with room numbers. Keep the OSM names as aliases. |
| Who owns the West Wing, East Wing and spine geometry | Index: `main-building` owns both wing footprints. | `fd2-fd3` researched the same footprints in depth (rooms 3103, 2247A, chambers). | **Ownership overlap.** Suggested split: `main-building` builds the tower block, porch, Auditorium, Rotunda and the facade kit; `fd2-fd3` supplies room data and the `sciencelab` move. The orchestrator must decide. |
| What the "Admin Block 1/2" panoramas show | `main-building`: the foyer and inner hall under the Clock Tower. | `fd2-fd3`: "a modern admin building, location unknown". | **Leaning `main-building`.** In its capture `tour-admin-block-1.jpg`, a white temple spire is visible through the porch on the axis, which fits the Clock Tower → Saraswati Temple view. Mark it "probable", not "verified". |
| Where the indoor sports rooms are (badminton, TT, squash, gym, snooker, martial arts) | `sac`: in the SAC west block and pavilions. The tour hotspots link every one of them to "SAC inside". | `sports`: location unknown; the unnamed OSM building at x 235…269, z 335…361 is a candidate. | **Accept `sac`.** The hotspot adjacency is stronger evidence. `sports` should drop the Gymkhana candidate. |
| Srinivasa Ramanujan Bhawan | `workshops-halls`: a hostel with no OSM footprint (POI only). | `hostels-newer`: OSM relation 5372462 exists (x −171…13, z −303…−198) but is missing from `data/bits-campus.js`. | **Accept `hostels-newer`.** Move SR from `workshops-halls` to `hostels-newer` in the index. |
| Looters, TOTT and −301°F | `sac` describes them as part of the SAC kiosk grid. | The index gives the food courts to `messes`. `messes` gives Looters back to `sac`, using the tour "Eatery - Looters" panorama (tent canopy, TOTT next door). | **Resolved: `sac` owns Looters, TOTT and −301°F.** Both reports agree. |
| Other eateries (Food Ministry, Sky Lab, Paradise Cafe, Da Cloud Cafe, Institute Canteen) | `messes` captured their tour panoramas "as hand-off context only". It sends the Institute Canteen to `main-building`. | No other report covers the rest. | **Unowned.** Add them to the index's unowned row. |
| Bhagirath Bhawan occupancy | Index, COORDINATES.md and the game: a girls' hostel, kept closed. | `hostels-newer`: the SWD 2026 notice lists its warden under BOYS (medium-high confidence). | Needs an orchestrator or design decision. The evidence leans "boys". |
| Budh Bhawan occupancy | Game and index: a boys' walk-in. The tour tooltip (2024) and Wikipedia also say boys. | `hostels-ram-budh`: the SWD 2023 allocation guidelines put f2022 girls in Budh. | **Unresolved.** Flag it. Keep Budh walk-in for now. |

### 1.2 Locations and levels

| Topic | Conflict | Suggested value |
|---|---|---|
| How deep the Rotunda is sunk | `main-building`: about 3 m (plaza y ≈ −3; wall 3–3.5 m). `nab`: −4.5 m (about 25 risers from the Rotunda to the Clock Tower forecourt). The NAB north courtyard must match the Rotunda floor. | Both are visual estimates; no section drawing exists. Pick one value for both owners. **−4.5 m** is better supported, because it comes from a riser count. Use −3 m only if the engine cost of depth matters. |
| How far south the tower block and porch reach | `main-building`: porch steps at z ≈ −47, foyer z −55…−65. `fd2-fd3`: the porch projects about 20 m south of the strip's south edge (z −55), so it ends near z −35 to −40, close to the ring road. | Both reports put the entry on the x ≈ −9 axis. **Revised after `roads-paths`:** the OSM driveway arc (way 8) runs (66,−9) → (9,−37) → (−62,9), so its centreline reaches z −37 at its northern apex. At about 7 m wide, its north kerb is at about z −40.5. `main-building`'s own sketch puts the loop at z ≈ −45, which does not match OSM. Set the porch front at **z ≈ −42** (range −47…−42), not −40 ±5. Keep the arc where OSM has it. |
| Main Building driveway edges | `main-building`: a semicircular drive in front of a porte-cochère with cannons. | `roads-paths`: the same arc, edged with **clipped hedges and bougainvillea beds**, not black-and-white kerbs, with a dashed centre line. | Compatible. Use the `roads-paths` edge treatment. `main-building` owns the planting. |
| How you get into the NAB | `nab`: four portals, the Rotunda (north) and the South side ramp at about (55, 349). | `roads-paths` section F: "the four NAB stairs are the only crossings into the NAB". | **Accept `nab`.** The `roads-paths` line ignores the Rotunda and the south ramp, and the nav grid needs all six entrances. |
| Where the ANC Circle is | `roads-paths`: the 4-way junction at (215, 323) [approximation]. | `messes`: the ANC POI at (233, 343) is "near the ANC Circle", with hostel facades on two corners. | Consistent. Gandhi (NW), Bhagirath (NE) and Shankar (SW) all sit within about 25 m of (215, 323). Use it, still tagged [approximation]. Where the "NCC Circle" is remains unknown. |
| Lecture Theatre Complex extent (not in OSM) | `fd1`: x 281…346, z −229…−135. `workshops-halls`: x 292…347, z −232…−136. | They differ by about 11 m on the west edge, within the imagery error. Use **x 285…347, z −231…−135** until it is traced. |
| M Lawns | `main-building`: "in front of the East Wing" (taken from the POI). `landscape-water`: x 65–130, z −25…18. | Use the `landscape-water` outline. It overlaps the East Wing's south edge by about 4 m, so clip it at z −21. **Also (from `roads-paths`):** the east turning loop (centre (72, −13), r ≈ 6 m) and its spur (68, −7) → (76, 42) cut through the lawn's west edge (x 65). Start the lawn at about x 82, or cut the loop and spur out of the polygon. S Lawns (x −140…−95) stays clear of the west loop at (−68, 8). |
| Avenue width against nearby buildings | `roads-paths` proposes avenues of 6.5 m asphalt plus a 2.2 m footpath and a 0.3 m kerb on each side, about 11.5 m in all, on every named Marg. | `nab` proposes outer light-wells 3–6 m wide outside its roof slabs. Krishna Marg (76, 42) → (123, 328) runs between the NAB east block (bounds to x 89) and Krishna Bhawan (from x 97). | **Unchecked.** Nobody has tested the wider section against the light-wells or the hostel forecourts. Check the clearance along Krishna Marg and Ram Marg before widening. Where it does not fit, use footpaths on one side only. |
| FD-III courtyards | `fd1` (a hand-off note): FD III and FD II each have one large courtyard. `fd2-fd3`: the FD III plan shows two courts with an inner cross range. | **Accept `fd2-fd3`.** It is a direct plan reading; the `fd1` remark was in passing. |

### 1.3 Floor counts and heights

| Building | Values in conflict |
|---|---|
| Central block | `main-building`: 3 storeys, about 13–14 m. `fd2-fd3`: the spine is 2 storeys, about 10–11 m, and the tower block steps higher. **Compatible:** spine 2 storeys, stepped tower block 3 storeys. |
| Main Building and FD floor-to-floor | `main-building` gives about 4.5 m for the wings and 4.2 m for the central block. `fd2-fd3` puts the first floor at about 5.0 m. `fd1` uses about 5.0 m. **Use 4.5 m for the wings and spine, and 5.0 m for FD-I.** All of these are visual estimates. |
| Heritage hostel floor height | Game FH = 3.3 m. `hostels-krishna-gandhi` and `hostels-shankar-vyas-vk`: 3.8–4.2 m. `hostels-ram-budh`: 9–10 m parapet over 2 floors. `hostels-newer` (the comb hostels): 3.3–3.6 m. **Split:** about 4.0 m for the courtyard (日-plan) Bhawans; keep 3.3–3.6 m for the combs. |
| Clock Tower | `main-building`: 40–45 m in reality, about 57 m in the game. No other report disagrees, but no published height exists. |
| Mess halls | OSM `h` 3.3 m everywhere. `messes` gives two heights. The Type A hall is 4.2–4.8 m clear, about 5–6 m to the parapet. The Type B hall is 6–7 m clear (double height, jali clerestory), so its parapet would be about 7.5–8 m. The report then proposes 5.5 m for the VKB hall. **That fits Type A only.** It is consistent because the report leans to Type A for VKB, but which tour hall belongs to which Bhawan is unknown. Use 5.5 m for all the halls until a mess exterior photo is found. |

### 1.4 Measurements that disagree with OSM

- **FD-II strip depth:** OSM gives 33–37 m. `fd2-fd3` (from imagery) gives 15–17 m. `main-building` says the ranges are 18–33 m in OSM and probably narrower in reality. Both agree the OSM strip over-claims its depth.
- **Wing depths in the game:** every hostel uses `WD = 7.85` m. The reports give:
  - Krishna and Gandhi: about 15 m;
  - Ram and Budh: 9–14 m;
  - Shankar, Vyas and VK: 11–14 m;
  - the combs: 7–8 m, so the game's value is right for them.

### 1.5 Stair counts in the courtyard Bhawans

Each report proposes a different number of dog-leg stairs:

- 6–8 for Krishna and Gandhi;
- 4 for Ram and Budh;
- 6 for Shankar, Vyas and VK.

All three are approximations inferred from the roof mumties. One rule should be standardised: **one stair under each roof mumty, with a minimum of 4.**

---

## 2. Claims that look unsupported ("verified" without a source that shows it)

| Report | Claim tagged [verified] | Problem |
|---|---|---|
| `main-building` | Naming caveat: C/M/S blocks were renamed FD I/II/III | The tag rests on a **search snippet**, and the same report says the GWU page failed with a TLS error. (`fd2-fd3` did open the page, so the fact itself stands.) |
| `main-building` | Admin Block 1/2 are the foyer and inner hall of the central block | The tour gives no location for these panoramas. The location is an inference; see 1.1. |
| `main-building` | Tower built in 1964 | Comes from a single Wikipedia list. It is tagged "single source", which is fair, but it should read [unverified]. |
| `main-building` | 2,535 m² auditorium | The source does not tie the figure to this hall. The report says so; the tag should be [approximation]. |
| `nab` | "Inaugurated April 2014" | Rests partly on a newsletter **search snippet**. |
| `nab` | "The four OSM steps ways are **exactly** the four portals" | This is a geometric match, not a sighting. It is strong, but it should be tagged [approximation]. |
| `sports` | "Gym Ground is open for sports only" and the "Indoor Sports Complex" listing | Both are tagged verified from **search snippets**; neither page was opened. |
| `workshops-halls` | RKIC Technology Enabling Centre "on 2nd Floor"; the RVCC Bhoomi Poojan; the 200-seat MapmyIndia hall; SR listed by Wikipedia as a boys' hostel | Snippets or headlines only. These are low stakes, but they should be tagged [unverified]. |
| `gates-landmarks` | Floral tributes at the G.D. Birla statue "opposite Saraswati Mandir" | Search snippet only. The temple's 110 ft height and "70 pillars" come from secondary sources, which the report notes. |
| `fd1` | CRISS Robotics is "in the Workshop" | The panorama shows a sawtooth interior, but the tour gives no building. It is a strong inference, not a sighting. |
| `fd1`, `fd2-fd3`, `nab`, `sac` | Every [verified] tag that cites a local capture | The capture folders no longer exist in the scratchpad. The claims can only be re-checked at the source URLs. |
| `messes` | The nearby RP **and Shankar** Bhawans use cream walls with maroon bands [verified, tour "RP Redi"] | The RP Redi panorama shows only Rana Pratap's wall. For Shankar the support is `hostels-shankar-vyas-vk` (drone: cream with a maroon parapet line), which the tag does not cite. The fact stands, but it should cite both sources. |
| `messes` | Shankar-Vyas Mess has "a dining hall for 400" [verified] | This is second-hand, taken from the `hostels-shankar-vyas-vk` report. The same `messes` report says the SWD Bhawan pages refused connection this session. Tag it [verified via another report]. |
| `messes` | The ANC hall exterior: a tall stone building of about 8–10 m, a canopy about 3 m high, a wall of "about 1 m + 1 m" [verified] | The presence of these is verified from the night panorama, but the sizes are estimates. They should be tagged [visual estimate]. |
| `messes` | VKB, RP and Shankar-Vyas are a twin or copied plan type; the hall/kitchen split | This rests on roof texture in Esri imagery only. The report tags it honestly [visual estimate], but the whole gameplay plan for the `mess` room (hall in the west wing, hatches in the east wall) depends on it. |
| `roads-paths` | Night lighting is "cool-white (about 5000–6000 K)" [verified] | The drone night view verifies continuous lighting. A colour temperature cannot be read from a compressed panorama; it should be [visual estimate]. |
| `roads-paths` | T-lawns walk "red sandstone with cream inlays and white ornamental railings"; Patel and Gandhi roundabout kiosks [verified] | Second-hand from `gates-landmarks`, not re-captured. The report says so, but it still tags them [verified]. |
| `roads-paths` | "Footway in front of FD-II": (−24,10) → (−62,47) and (26,3) → (72,11) | Mislabelled. Both paths lie **south** of the Rotunda (z > 0), towards S and M Lawns. FD-II is at z −92…−55. The coordinates are right; the label is wrong. |
| `roads-paths` | Avenue width 6–7 m, footpaths 2–2.5 m, poles 30–40 m apart | Correctly tagged [visual estimate], but the ranked fixes (6.5 m, 2.2 m, 35 m) then use these as build values. They come from three panoramas (ANC, NCC, Gate avenue), not from any measurement. |
| `fd2-fd3` | YouTube XkDvacBC7zA 3:03–3:12 shows the library foyer | The cited frames are gone. The `library` agent could not reproduce them, although its own panorama shows the same twin stairs. |

The reports are otherwise careful. Most of them use [visual estimate] and [approximation] honestly. The `library`, `hostels-krishna-gandhi` and `hostels-ram-budh` reports are the most disciplined.

---

## 3. Missing evidence that matters for building

- **Staircases:** almost none were seen. Directly seen stairs are limited to:
  - the library twin foyer stairs, the Hall 4 helical stair and the gallery stair;
  - the NAB portal and courtyard stairs, and the Rotunda → Clock Tower stair;
  - the Main Building front steps;
  - the RKIC foyer stair;
  - the temple front flight.

  Nobody saw an interior stair in any hostel, FD-I, FD-II/III, the Main Building wings, the SAC mezzanine stair or the New Workshop. Those positions are all inferred from roof mumties or plan symbols.
- **Entrances:**
  - Krishna's entrance face is unproven. The 2006 photo has no orientation.
  - Ram, Budh and Vyas entrances are unknown or inferred.
  - FD-I entrances are read from plan wall marks whose meaning is unknown.
  - Library service and fire exits are unknown.
  - The Main Building wings' doors are unknown.
- **Interior layouts:**
  - No hostel floor plan exists. Room counts, washroom, common-room and gym positions are unknown, and so is the wing cross-section (Model 1 or Model 2).
  - The library's hall sizes are approximate; only the topology is verified.
  - The Main Building offices (AUGSD, Registrar, VC) were seen but not located.
  - Which NAB hall is the J.C. Chaudhry Auditorium is unknown.
  - The FD-I first-floor classrooms were never photographed.
- **Section and depth data:** NAB −4.5/−9.0 and Rotunda −3/−4.5 are both estimates. This blocks the most expensive engine change, ground below y = 0.
- **Video:** YouTube frame capture failed for almost every agent. The two campus-tour videos are effectively unused. `roads-paths` retried XkDvacBC7zA at about 21:54 on 2026-11-17 and got "Something went wrong" on every seek. `messes` did use one video, the SR Bhawan tour, for the SR mess only.
- **Messes:**
  - No exterior photo of any mess exists. Door positions, facades and heights are all inferred.
  - "Student Mess 1" and "Student Mess 2" are not tied to a Bhawan.
  - No floor plan of a kitchen.
  - The official site says there are "seven messes", but only five boys' mess footprints are identified. The girls' mess (inside Meera) and the SR mess are not covered.
  - The ANC has no outline.
  - The CVR and Nagarji redi panoramas were captured but not analysed.
- **Roads and paths:**
  - No measured road widths; the OSM widths are defaults by kind.
  - Which roads count as avenues was confirmed at only three junctions; the rest is inferred.
  - No speed-breaker evidence either way.
  - Signboard text is unreadable.
  - The NCC Circle is not located.
  - Not covered by anyone: the library forecourt pavers, the S/M Lawns footways' surface, and the minor-lane edges around the messes ("dirt service tracks", per `messes`).
- **Hand-offs with no live owner:** `messes` and `roads-paths` sent work back to `sac`, `nab`, `main-building`, `landscape-water`, `gates-landmarks`, `hostels-newer` and the `hostels-*` owners. Those owners have already written their reports. The orchestrator should assign this work, either to a follow-up pass or to the builders of each area. The main items:
  - Looters (`sac`);
  - the Institute Canteen interior (`main-building`);
  - the SR mess and the CV Raman redi (`hostels-newer`);
  - the Rotunda-rim bougainvillea and driveway hedges (`main-building`, `landscape-water`);
  - trunk paint (`landscape-water`);
  - hostel forecourt pavers (`hostels-*`).
- **Unowned areas:**
  - the Medical Centre (it has tour panoramas);
  - the unnamed 20 × 38 m block at (−57, 210);
  - the block north of New Workshop;
  - Eco Park (location unknown);
  - the Nehru and Rajendra Prasad statues at the NAB north end (on the plan; `gates-landmarks` does not cover them).

---

## 4. OSM footprint problems the agents found

| Building | Problem | Source report |
|---|---|---|
| Vyas Bhawan | **Outline about 35 m too short at the north.** The real building is about 57 × 97 m with two courts; OSM has 57 × 68 m and one court. It is also under-rotated by about 10°. | `hostels-shankar-vyas-vk` |
| Vishwakarma Bhawan | One hole where there are really two courts. The west edge is under-rotated by about 7°. It overlaps Rana Pratap by about 11 m (they are physically joined). | `hostels-shankar-vyas-vk`, `hostels-newer` |
| FD-II strip | Over-claims depth by 15–20 m. The porch extends about 20 m south of the outline. Its rotation differs from the wings by up to 7.6°. | `fd2-fd3`, `main-building` |
| FD-III (West Wing) | One hole; the plan shows two courts. | `fd2-fd3` |
| FD-I | The east projection (about 13 × 27 m at x 279…292, z −121…−94) is missing. It touches or overlaps BITS Workshop by about 1 m, where imagery shows an 8–15 m treed gap. The OSM N–S extent may be about 10 m long. | `fd1`, `workshops-halls` |
| BITS Workshop | The north edge reaches into FD-I; the real roof starts at about z −42. `h` 13 is too high for a sawtooth shed (6–9 m). | `workshops-halls` |
| NAB (both) | The outlines are right, but they are **roof slabs at grade**, not walls. The outer light-wells and embankments are not mapped. | `nab` |
| SAC | Covers only the two central halls. The complex is about 85 × 127 m. The south grass polygon runs under the east hall. | `sac` |
| Library | Omits the west porch and fan steps. The west wing sits about 2 m south of the axis. `h` 6.6 is too low (should be about 10.5). | `library` |
| RKIC | No courtyard hole; imagery shows one. | `workshops-halls` |
| RVCC | Mapped as finished, but the site looks like a construction site. | `workshops-halls` |
| Gandhi Bhawan | The east wing is only 7–8 m deep. This may be a tracing error. | `hostels-krishna-gandhi` |
| Budh Bhawan | The middle wing comes out at 5.4 m, so the holes look loosely traced. | `hostels-ram-budh` |
| Shiv Ganga | The polygon traces the **inner bank**. The water lies at r 54–66 around (128, 823). | `landscape-water` |
| Swimming pool | The polygon (32 × 40 m) is the enclosure, not the 25 × 12.5 m pool. | `sports` |
| Courts | Basketball and tennis are undercounted: OSM has 2 and 1, the panoramas show 4 or more of each. | `sports` |
| Missing from data or OSM | Malviya-B (relation 5372379); SR Bhawan (relation 5372462); the Meera relation 20803053 (about 80 m north of the POI); the three CV Raman footprints (present but unnamed); LTC; VFAST; M and S Lawns (POIs only); the Econ POI, about 45 m south of room 6165. | `hostels-newer`, `fd1`, `workshops-halls`, `landscape-water`, `nab` |
| Birla Museum group | Which footprint is the museum, the Science Centre or the gallery is unknown. | `gates-landmarks` |
| All five mess blocks | `h` 3.3 m is too low. Halls are about 5–7 m and kitchens about 4 m. The Esri imagery sits about 4–6 m south-east of OSM here too; keep OSM. | `messes` |
| ANC | No OSM building. Imagery suggests a long roof at about x 240…265, z 330…345. | `messes` |
| "Boys Canteen" | Kind `food`, outside the boundary at x 379…400, z −501…−460. No source confirms it is a canteen. | `messes` |
| Road network | Every road inside the campus is tagged `service` (46 ways). The widths are defaults by kind (service 4 m), not measured. The game's lamp filter skips `service`, so the whole world has only 16 lamps. This is a code fix, not a data patch. | `roads-paths` |

**Rule reminder:** none of these outlines should be moved silently. The orchestrator should approve a data patch: the Vyas extension, the FD-I east projection, the LTC, Malviya-B, SR and the Workshop trim.

---

## 5. Pilot readiness

Scale: **ready**, **ready with approximations**, **blocked**.

### 5.1 Library: ready with approximations (the best evidenced pilot)

- **Solid enough to build now:**
  - footprint and orientation (OSM matches the official plan; long axis rotated −7.9°);
  - 2 storeys;
  - west ceremonial entrance;
  - the room sequence foyer → twin stairs → cross hall → rotunda → east lobby;
  - hall topology (Halls 1 and 2 to the north, 5, 4 and 3 to the south, Hall 6 upstairs);
  - all interior finishes;
  - the gameplay room already sits where Hall 4 is.
- **Must be approximated:**
  - hall sizes;
  - floor heights (5.0 m ground floor);
  - rotunda ring diameter (about 16 m) and column count (about 24);
  - first-floor extent;
  - the use of the north lobe;
  - fire and service stairs and any south door.
- **Build spec:**
  - **Floors and heights:** 2 floors. Ground floor 5.0 m; parapet about 10.5 m; foyer and rotunda double height (oculus at about 9.5 m); halls 4.5–5 m clear.
  - **Footprint:** use the OSM outline. Add the porch and fan steps at u −50…−44. Build the interior in a local frame rotated −7.9°, made of short AABB wall segments.
  - **Entrances:**
    - west tip, door at about (172.2, −215.4): 8 m brick arch with "BITS LIBRARY", a portico, 6 fan steps, ramps on both sides;
    - keep the existing south room door at (210.2, −189.8) as a secondary entrance.
  - **Stairs:**
    - twin straight flights S-N and S-S at u −30…−25.7, v ±3.5, each 1.8 m wide with 16 risers, rising east to a bridge at y = 5.0;
    - optional: the Hall 4 helical stair to its mezzanine.
  - **Key rooms:**
    - foyer with counters, kiosk and Help Desk;
    - Area 1 cross hall;
    - rotunda (gravel court, ring of benches);
    - Hall 4 = the `library` gameplay room, with a new north door to the rotunda;
    - Hall 5;
    - first-floor gallery ring.
  - **Signature exterior:**
    - red sandstone ground storey under a pink plaster upper band;
    - stepped crenellated parapet and porthole windows;
    - white pyramid canopy over the arch;
    - rotunda drum, skylight lanterns and PV on the roof;
    - octagon-paved forecourt with bicycles.

### 5.2 NAB: ready with approximations for the look, blocked for the faithful sunken build

- **Solid enough to build now:**
  - the earth-sheltered concept (green roofs at grade);
  - the 17 m courtyard between the blocks;
  - four portal positions (OSM steps ways);
  - full room numbering and zoning from the official plan;
  - facade materials (buff render, white fins, red reveals);
  - classroom, LT and lab interiors.
- **Must be approximated:**
  - level depths (−4.5 / −9.0);
  - the north courtyard as a single level;
  - the 75–125 m courtyard transition;
  - auditorium and lab room numbers;
  - room positions to ±6 m.
- **Blocker:** `player.floorAt` cannot go below y = 0. The engine needs a ground override (Option A), or the build uses interim Option B (raised berms at +4.5 / +9).
- **Build spec:**
  - **Floors and heights:** level −01 at y −4.5 (whole length); level −02 at y −9.0 (south half, from s ≈ 105); floor-to-floor 4.5 m; rooms 3.4–3.8 m clear; roof lawn at y 0 with a 1.1 m railing.
  - **Footprint:** the OSM rings become walkable roof slabs. Add outer light-wells 3–6 m wide with grass embankments.
  - **Entrances:**
    - Portals 01 to 04 at the OSM Ram, Krishna, Budh and Gandhi Stairs;
    - the Rotunda (north);
    - the South side ramp to Gandhi Marg at about (55, 349).
  - **Stairs:**
    - each portal is a straight 2.6 m flight of 27 risers with a mid-landing;
    - portals 03 and 04 add a second flight down to −02;
    - courtyard dog-legs S5 and S6 at about (43, 150) and (12, 158);
    - a wide canopy stair between the courtyard levels;
    - lifts in 6121, 6166 and 6170.
  - **Key rooms:**
    - LT 6163 (host for `classroom`; move it about 8 m north);
    - 6113 or 6116 (move `classroomB` there from the faculty wing);
    - classrooms 6101–6108 and 6151–6158;
    - Maths 6067 and Econ 6165.
  - **Signature exterior:**
    - four buff portal pavilions with cusped white arches (the only parts visible from the road);
    - the courtyard Snake Path with bollards;
    - white fin groups, round columns and cantilevered canopies;
    - red window reveals.

### 5.3 Krishna Bhawan: ready with approximations (weakest interior evidence of the four)

- **Solid enough to build now:**
  - OSM footprint with two courts (33 × 58 m), confirmed by a tour hotspot;
  - 2 storeys and a flat roof with mumties and PV;
  - lawn and tree courtyards with badminton and volleyball;
  - the entrance-bay design (2006 photo);
  - room-door and corridor finishes;
  - three-digit room numbers (1xx and 2xx);
  - SWD facility list.
- **Must be approximated:**
  - which face the entrance is on (the west face at the middle wing is consistent but unproven);
  - wing cross-section (15 m deep, so back-to-back rooms or an outer verandah);
  - stair positions and count;
  - washroom, common-room and MultiGym positions;
  - current paint colours.
- **Build spec:**
  - **Floors and heights:** 2 floors at FH ≈ 4.0 m (3.3 m acceptable); parapet 8–9 m; entrance block 1–1.5 m higher.
  - **Footprint:** OSM outer ring and holes. Wings 15 m deep, preferably double-loaded (outer verandah, two rooms, courtyard verandah).
  - **Entrance:** keep the west face at the middle wing, outside (104.3, 127.6). It is a projecting bay, 10–12 m wide, with:
    - two cusped arches, one with a green collapsible gate;
    - 3–4 steps;
    - a Devanagari name band;
    - a first-floor loggia with paired Tuscan columns.
  - **Stairs:** dog-legs in about 3.4 m bays off the courtyard verandah, under the mumties near the courtyard corners and the middle-wing ends. At least 4, ideally 6. One continues to the roof.
  - **Key rooms:**
    - `hostelroom` (keep the spawn at (108.5, 119.4)): 3.2 × 4.3 m, corridor-side window, arched shelf alcove, built-in wardrobe;
    - 2–3 peer rooms;
    - AC common room;
    - MultiGym;
    - one washroom block per floor.
  - **Signature exterior:**
    - cusped-arch courtyard arcade under a first-floor colonnade;
    - salmon courtyard walls and a cream outer face;
    - roof mumties;
    - bicycle rows at the entrance.

### 5.4 Main Building: ready with approximations for the exterior; the interior is mostly approximated

- **Solid enough to build now:**
  - U plan (spine plus two quads, Auditorium behind);
  - the two facade languages (Art Deco tower block, Rajasthani arcades on the wings);
  - Clock Tower details;
  - pitched Auditorium roof;
  - sunken Rotunda (50 m) with niche wall, emblem and terraces;
  - foyer and inner-hall finishes;
  - room numbering from the plan (2247A Physics, 3103 Chemistry).
- **Must be approximated:**
  - Rotunda depth (see 1.2);
  - tower height (about 42 m);
  - porch reach;
  - all internal stairs (only the twin crossed boxes on the plan beside the tower);
  - office locations;
  - wing range depths.
- **Blocker:** the `sciencelab` room overlaps the Clock Tower entrance collider by 3.4 m, and two NPC spots sit inside solid geometry. Fix this first by moving the lab to the west range (x −52…−40).
- **Build spec:**
  - **Floors and heights:** wings and spine 2 floors at 4.5 m (parapet about 10.5 m); tower block 3 stepped tiers (13–14 m); tower about 42 m; Auditorium ridge about 16 m.
  - **Footprint:** use the OSM wing rings. Rebuild the spine 15–17 m deep and treat the rest of the strip as garden. Extend the porch to z ≈ −42, which keeps it clear of the OSM driveway arc (see 1.2).
  - **Entrances:**
    - porch on the axis at about (−9, −42) up to a foyer at y ≈ 0.9;
    - arcade verandahs along the courtyards and the spine front;
    - one arch passage through each wing's south range;
    - Rotunda NE and NW doorways and terraces.
  - **Stairs:**
    - twin dog-legs flanking the tower hall at x −24…−16 and −2…+6, z −72…−61;
    - 4 dog-legs per quad at the inner corners;
    - one per corner pavilion to the chhatri.
  - **Key rooms:**
    - foyer and inner hall (bust, murals, carved doors to the Auditorium);
    - `principal` moved to the central block, first floor, south side;
    - `reception` (AUGSD, aluminium cubicles);
    - `complab`;
    - `sciencelab` as 2247A in the west range.
  - **Signature exterior:**
    - red-ringed clock and bangla cupola;
    - maroon string-courses;
    - porte-cochère with cannons and a semicircular drive;
    - chhatris only on the south corner pavilions;
    - the sunken star-paved Rotunda.

---

## 6. Status updates for campus-master-index.md

1. Add a **Status** column: `library`, `nab`, `hostels-krishna-gandhi` and `main-building` are researched pilots; the other 12 are researched, including `messes` and `roads-paths`, which arrived in a second pass. Done in the index.
2. Correct "In game today" where the reports measured it:
   - FD-I has four window rows and full PV;
   - the SAC is a 3-row box;
   - the hostels have 7.85 m wings and concrete courts;
   - Gandhi, Shankar and Vyas have east-face entrances;
   - Vyas and VK have one court;
   - the Rotunda is at grade;
   - and so on. Done in the index.
3. Replace "FD-III is not a named footprint" with: FD III = OSM "Main Building (West Wing)"; FD II = "Main Building (East Wing)" plus the "FD-II" spine. Flag the ownership overlap with `main-building`.
4. Move the SR Bhawan POI from `workshops-halls` to `hostels-newer`. Add the LTC (`workshops-halls` researched it), VFAST and the Medical Centre (unowned).
5. Flag Bhagirath (SWD 2026 says boys) and Budh (SWD 2023 says girls) for a design decision.
6. Note the OSM data patches waiting for approval: Vyas outline, FD-I east projection, LTC, Malviya-B, SR, the Workshop/FD-I gap, Shiv Ganga water radius, M and S Lawns.
7. Re-capture the evidence folders for `fd1`, `fd2-fd3`, `nab` and `sac`. Copy the `messes` and `roads-paths` capture folders somewhere durable before the scratchpad is cleared.
8. Give Looters to `sac`. Add Food Ministry, Sky Lab, Paradise Cafe and Da Cloud Cafe to the unowned row. Assign the open hand-offs listed in section 3.
9. Approve the proposed `h` change for the mess blocks (halls about 5.5 m) and the bigger `mess` room (15 × 28 m, keeping its door and exit). Note the lamp-filter bug in `buildLampPosts()` (it skips `service`) for the builders.
