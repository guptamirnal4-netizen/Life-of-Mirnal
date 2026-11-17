# BITS Pilani campus: master research index

This index sets the scope and the owners for reconstructing BITS Pilani (Pilani campus) in Life of Mirnal. Coordinates, units and the rules every agent follows are in [COORDINATES.md](COORDINATES.md). The research for each building lives in [buildings/](buildings/).

Status labels:

- **existing:** something is in the game today.
- **researched:** a report is in `buildings/`.
- **pilot:** chosen for the first detailed rebuild.
- **no report:** owner assigned, but no file in `buildings/` yet.

The central review of all reports is in [review.md](review.md).

## Agent allocation (one owner per building or area, no overlaps)

| Id | Owner covers | OSM footprints (see table below) | In game today | Gameplay rooms inside | Status (2026-11-17, see [review.md](review.md)) |
|---|---|---|---|---|---|
| `library` | BITS Library | BITS Library | Single 6.6 m extruded red block with a library facade. There is no west entrance (blank wall), and the only door is the gameplay room's south door. A 12 × 10 m school-library room sits where the real Hall 4 is. | `library` | **pilot, researched.** Ready with approximations. OSM matches the official plan; the real building is 2 storeys, about 10.5 m. |
| `nab` | New Academic Block, both blocks; the department POIs inside it | New Academic Block (west), NAB (east) | Two 6.6 m concrete blocks standing above grade, with grass roofs and passages at grade. The east passages are 8–13 m off. `classroomB` sits in the faculty-chamber wing. | `classroom` (Lecture Theatre), `classroomB` | **pilot, researched.** The real NAB is underground (earth-sheltered). A faithful build is blocked on `floorAt` supporting ground below y = 0. |
| `main-building` | Main Building: West and East Wings, the Main Building Hall / Auditorium, the Clock Tower, the Rotunda, M and S Lawns | Main Building (West Wing), Main Building (East Wing), Main Building Hall | Heritage facade with punched windows (no arcades). Chhatris on every vertex. Flat Auditorium roof. Custom Clock Tower (about 57 m) and a Rotunda at grade. | `principal`, `reception`, `complab` | **pilot, researched.** Ownership overlap with `fd2-fd3`: per the official plan, the West Wing is FD III and the East Wing is the FD II quad. The Rotunda is sunken (−3 to −4.5 m, depth unresolved). |
| `fd1` | Faculty Division I | Faculty Division I (FD-I) | Solid 13 m block with four rows of arched windows and full-roof PV. It touches the BITS Workshop. The staff room is in the SW corner block. | `staffroom` | **researched.** Real: 2 storeys, 日 plan. The east projection is missing from OSM. |
| `fd2-fd3` | Faculty Division II and III | FD-II (central spine), plus the data on the FD III and FD II quads | The FD-II strip is a 37 m-deep, 12 m block with the heritage facade. `sciencelab` overlaps the Clock Tower collider by 3.4 m. FD III = OSM "Main Building (West Wing)", built with one courtyard. | `sciencelab` | **researched.** Move `sciencelab` west into the spine (real Physics Lab 2247A). |
| `sac` | Student Activities Center | Student Activities Center (SAC) | 10 m three-storey box with full PV. Grass runs under it. No portico, no pavilions. The `auditorium` room already sits inside the real east hall. | `auditorium` | **researched.** Real: single-storey halls and a pavilion complex, about 85 × 127 m. The indoor sports rooms are here. |
| `hostels-krishna-gandhi` | Krishna Bhawan (the player's) and Gandhi Bhawan | both | Walk-in `Hostel` with 7.85 m wings, oversized courts, and concrete courtyards with cricket and football. Gandhi's entrance is on the east face. FH 3.3 m. | the player's room | **pilot (Krishna), researched.** Real: lawn courts, about 15 m wings, Gandhi's entrance on the west. No interior stair evidence. |
| `hostels-ram-budh` | Ram Bhawan and Budh Bhawan | both | Walk-in `Hostel` with west entrances, concrete courts and uniform PV rings. | none | **researched.** No interior evidence. Budh occupancy is disputed (SWD 2023 says girls). |
| `hostels-shankar-vyas-vk` | Shankar, Vyas and Vishwakarma Bhawans | all three | Walk-in `Hostel` with plain white boxes. Shankar and Vyas entrances are on the east face. Vyas and VK have one courtyard. | none | **researched.** The Vyas OSM outline is about 35 m short. VK is joined to RP. Entrances face west. |
| `hostels-newer` | Malviya, Ashok, Rana Pratap, Bhagirath and Meera Bhawans, and any other Bhawan the research turns up (also CV Raman, SR, MSA) | Malviya-A, Ashok bhawan, Rana Pratap Bhawan, Bhagirath Bhawan, Meera POI | Walk-in `CombHostel` with plain facades and no porch. Bhagirath is closed. Malviya-B and SR are missing from the data. CVR footprints are unnamed. | none | **researched.** SWD 2026 lists Bhagirath under boys (needs a decision). Also owns SR Bhawan. |
| `messes` | Every mess and dining hall, plus the food courts (ANC, C'not, Redis, Looters) | VKB mess, RP mess, Ram-Budh mess, Shankar Vyas Mess, Malviya Mess, Boys Canteen; ANC and C'not POIs | Extruded blocks; VKB mess has the gameplay dining hall | `mess` | **researched.** Every boys' mess is a single-storey hall plus kitchen. OSM `h` 3.3 m is too low (halls about 5.5 m). The real hall has steel tables with attached seats and serving hatches. ANC is an open-air canopy food court with no OSM outline. Looters goes to `sac`. No exterior photos. |
| `sports` | Gymkhana grounds, swimming pool, courts, Med-C ground, skating area | BITS Gymkhana Grounds, BITS Swimming Pool, the pitches (areas) | Flat green ground with a sandy track and one football field. Plain blue courts. The pool is an oversized quad. No floodlights or stands. | none | **researched.** The indoor halls and gym are in the SAC (see `sac`), not at the Gymkhana. |
| `workshops-halls` | Workshops, labs outside FD, the larger halls, and the Lecture Theatre Complex | BITS Workshop, New BITS Workshop, Rakesh Kapoor Innovation Centre, Rakesh Verma Convention Centre, VFAST POI; LTC (not in OSM) | Extruded white blocks. The Workshop is 13 m with PV (the real one is a sawtooth shed). RVCC is shown finished. LTC and VFAST are absent. | none | **researched.** SR Bhawan handed to `hostels-newer`. |
| `roads-paths` | Road network, footpaths, steps, kerbs, lamp posts | `roads` (223 ways), `steps` | Roads with kerbs, footways | none | **researched.** Two road classes: avenues (about 6.5 m, raised black-and-white kerbs, paver footpaths, zebras) and lanes (about 4 m, no kerb). Every in-campus road is `service`, so the game places only 16 lamps. Widths are visual estimates. The library forecourt is not covered. |
| `landscape-water` | Lawns, gardens, tree species, Shiv Ganga, South Park, open spaces | `areas` (grass, water, wood), Shiv Ganga | Mostly bare sand with sparse trees. No M or S Lawns. The Shiv Ganga canal is too small (r 42–52 m). | none | **researched.** |
| `gates-landmarks` | Main Gate and the other gates, boundary wall, Saraswati Temple, Birla Museum, statues | Saraswati Temple, Birla Museum, Pilani Gallery, `boundary`; Main Gate and statue POIs | Main Gate as an Art Deco arch (the real one is a pier-and-banner gate). Temple orientation reversed. No Dakota aircraft. | none | **researched.** |
| unowned | Medical Centre; unnamed block at (−57, 210); Eco Park; Nehru and Rajendra Prasad statues at the NAB north end | none | — | none | **not assigned.** |

Integration and QA (role 20 in the brief) belongs to the orchestrator: the coordinate checks, the merge review and the browser tests.

**Pilot group, in the order the brief asks for:**

1. `library`
2. `nab`
3. one hostel (`hostels-krishna-gandhi`, Krishna Bhawan)
4. `main-building`

## Named OSM buildings inside the campus

Coordinates are in metres from the Rotunda: x east, z south.

| OSM name | kind | h (m, data) | bounds | size x × z (m) |
|---|---|---|---|---|
| Saraswati Temple | temple | 12 | x 77…129, z 637…708 | 51 × 71 |
| Birla Museum | hall | 14 | x -266…-176, z 26…74 | 90 × 47 |
| Birla Shishu Vihar | school | 9 | x -2…51, z 672…751 | 53 × 79 |
| BITS Pilani - Community Welfare Center | other | 7 | x 465…491, z 868…926 | 26 × 58 |
| Birla Balika Vidyapeeth | school | 9 | x -85…-14, z 372…477 | 71 × 106 |
| Malviya Mess | mess | 3.3 | x -258…-201, z 208…231 | 57 × 23 |
| NSS BITS Pilani | other | 7 | x 158…177, z 466…498 | 20 × 32 |
| Malviya-A | hostel | 11 | x -216…-152, z 128…195 | 65 × 67 |
| Ram-Budh mess | mess | 3.3 | x -120…-74, z 195…234 | 46 × 39 |
| Bhagirath Bhawan | hostel | 6.6 | x 232…299, z 195…297 | 68 × 101 |
| Shankar Vyas Mess | mess | 3.3 | x 187…231, z 460…499 | 43 × 39 |
| Ashok bhawan | hostel | 6.6 | x 309…376, z 184…284 | 66 × 100 |
| Rana Pratap Bhawan | hostel | 6.6 | x 266…349, z 15…116 | 82 × 101 |
| Rakesh Verma Convention Centre | hall | 14 | x 403…443, z 313…353 | 40 × 40 |
| RP mess | mess | 3.3 | x 290…334, z 130…168 | 44 × 38 |
| BITS Workshop | academic | 13 | x 195…279, z -51…7 | 84 × 58 |
| VKB mess | mess | 3.3 | x 245…288, z 140…179 | 43 × 39 |
| BITS Library | library | 6.6 | x 171…257, z -261…-184 | 85 × 77 |
| Vidya Vihar Aadhar Enrollment Centre | school | 9 | x 339…348, z -46…-35 | 9 × 12 |
| Pilani Sub Post Office | office | 8 | x 342…353, z -31…-18 | 11 × 13 |
| Rakesh Kapoor Innovation Centre | academic | 9.9 | x 30…71, z -308…-261 | 41 × 46 |
| Food Ministry | food | 5 | x 104…115, z -142…-133 | 11 × 10 |
| New BITS Workshop | academic | 6.6 | x 37…104, z -198…-148 | 66 × 50 |
| Sky Lab | food | 5 | x -188…-181, z -14…-8 | 7 × 6 |
| Paradise Cafe | food | 5 | x -5…1, z -223…-218 | 7 × 4 |
| Looters | food | 5 | x -183…-179, z 229…238 | 4 × 9 |
| New Academic Block | academic | 6.6 | x -32…29, z 33…278 | 61 × 245 |
| NAB | academic | 6.6 | x 15…89, z 26…270 | 74 × 244 |
| Pilani Gallery | hall | 14 | x -278…-244, z 76…106 | 34 × 30 |
| Main Building (West Wing) | academic | 14 | x -167…-59, z -105…13 | 108 × 118 |
| Main Building (East Wing) | academic | 14 | x 38…146, z -136…-21 | 108 × 115 |
| FD-II | academic | 12 | x -77…41, z -92…-55 | 118 × 37 |
| Main Building Hall | hall | 16 | x -34…0, z -131…-81 | 34 × 51 |
| Faculty Division I (FD-I) | academic | 13 | x 175…285, z -159…-40 | 110 × 119 |
| Krishna Bhawan | hostel | 11 | x 97…179, z 40…205 | 82 × 166 |
| Gandhi Bhawan | hostel | 11 | x 123…199, z 207…319 | 76 × 112 |
| Budh Bhawan | hostel | 11 | x -112…-38, z 245…355 | 74 × 111 |
| Shankar Bhawan | hostel | 11 | x 145…218, z 345…455 | 74 × 110 |
| Vyas Bhawan | hostel | 11 | x 181…246, z 553…623 | 65 × 70 |
| Student Activities Center (SAC) | sac | 10 | x -204…-145, z 288…321 | 59 × 33 |
| Ram Bhawan | hostel | 11 | x -136…-65, z 76…191 | 71 × 115 |
| Vishwakarma Bhawan | hostel | 11 | x 203…277, z 29…132 | 74 × 103 |

Pending OSM corrections (need orchestrator approval; see review.md section 4): extend Vyas Bhawan about 35 m north; add the FD-I east projection, the LTC, Malviya-B (relation 5372379), SR Bhawan (relation 5372462) and the Meera relation 20803053; trim BITS Workshop back from FD-I; move the Shiv Ganga water out to r 54–66 m.

Points of interest (x, z): All night canteen (233, 343); VFAST (468, 324); C'not (426, 777); C'not series (402, 776); Med-C (305, 638); Cannaught Pharmacy india (455, 771); Akshay (302, 690); BITS Clock Tower (-9, -62); Srinivas Ramanujan Bhawan (-20, -266); FD 2 (102, -55); Rotunda (0, 0); Saraswati Temple (102, 655); Student Activities Center (-182, 302); Institutional Cafe (-17, -148); Nobles (418, 822); Meera Bhawan (-134, 767); Gandhi (-12, 359); Patel (126, 339); Kamals (471, 770); Shiv Ganga (164, 819); G.D. Birla Statu (91, 573); FD3 (-111, -19); CEERI School (-542, -395); Central Electronic Engineering Research Institute (CEERI) (-269, -297); Director Quarters (-270, -493); Birla Aircraft (-208, 104); Al Café Coffee D’lite (462, 771); Jawed Habib Salon (-131, 351); Food Ministry (110, -137); TOTT (-152, 249); Da Cloud Cafe (-118, 209); Da Cloud Cafe (179, 170); -301°F (-136, 258); Skating Area (364, 375); Amul Parlour (237, 382); Balaji Temple (320, 753); South Park (58, 491); Budh Redi (-112, 256); Economics and Finance Department (19, 252); Mathematics Department (12, 204); Gandhi Redi by Ratan Ji (154, 199); M Lawns (103, 3); Student Union Office (91, -40); RC Club (61, -47); Department of Mechanical Engineering (83, -48); Electrical and Electronics Engineering Department (50, -90); Music Club (-50, -143); S Lawns (-111, 37); SWD Office (109, -44); Chemistry Department (-112, -14); Pramod's Kitchen (383, -119); WILP Division (213, -253); BITS Pilani Toastmasters Club (200, -197); CRISS Robotics (250, -39); Pooja Ground (-229, 891); Pilani Innovation & Entrepreneurship Development Society (59, -278); Ram Redi (-121, 187); Malviya Badminton Court (-186, 165); Annapurna Restaurant (426, 823); Vijay Restaurant (443, 820); Auditorium (-11, -86); Main Gate (582, 267)
