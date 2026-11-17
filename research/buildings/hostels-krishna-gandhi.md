# Krishna Bhawan and Gandhi Bhawan: research report

Agent: `hostels-krishna-gandhi`. Research only; no game code was changed.
Captures live in `/private/tmp/claude-501/-Users-mirnal-Documents-Whisperflow/58e9866d-f336-43fa-bce9-096a63ba2c16/scratchpad/research/hostels-krishna-gandhi/` (called `CAP/` below). They are copyrighted reference material and are not in the repo.

Tags: **[verified]** seen directly in a source or read from data, **[visual estimate]** measured or judged by eye from a photo or panorama, **[approximation]** a proposal where no evidence exists, **[unknown]** not found.

## Summary of what the evidence shows

1. Both Bhawans have two storeys and a flat roof [verified: 2006 photo of the Krishna entrance; recent drone panorama of both]. Today the roofs carry many solar PV arrays and square stair-head rooms ("mumties"); Gandhi also has a cluster of black water tanks [verified: drone panorama].
2. **Krishna's courtyards are green lawns with trees, not bare concrete.** The official SWD page lists a "Green courtyard" plus badminton and volleyball courts [verified]. The game builds bare concrete with a cricket pitch and football goals.
3. **Gandhi's entrance is on the west face, facing Krishna Marg**: a projecting bay with a loggia above it, with rows of bicycles along the facade [visual estimate from the drone panorama's downward view]. The game puts Gandhi's entrance on the **east** face, towards Bhagirath Marg.
4. In OSM the wings are about **15 m deep** (all of Krishna's wings; Gandhi's west and north wings). The game uses 7.85 m, so its courtyards are about 47 × 69 m against 33 × 58 m in OSM [verified: data]. The game shrinks the built mass by about half and inflates the courtyards.
5. Real room doors are about 3 to 3.5 m apart, with a small corridor window beside each door, a concrete jaali ventilator high above, and **three-digit stencilled room numbers** (147 on the ground floor, 228 on the first floor) [verified: 2006 photos; spacing is a visual estimate]. The game uses 5.1 m bays and four-digit plates (1001, 2001 and so on).
6. The heritage facade language is right in the game: cusped (multifoil) arches, scroll or jaali grilles, and an entrance block with a pillared loggia [verified]. The colour scheme is out of date or wrong in places: Krishna was ochre-yellow with white trim in 2006, and the recent drone shows pale cream or off-white outer walls with salmon-pink courtyard walls behind the verandahs [visual estimate].

---

# Block 1: Krishna Bhawan (the player's Bhawan)

## A. Identification

| Item | Value |
|---|---|
| Official name | Krishna Bhawan, boys' hostel, Pilani campus [verified: swd.bits-pilani.ac.in/krishna-bhawan.aspx] |
| Category | Hostel (Bhawan). Older courtyard type, the same family as Gandhi, Ram, Budh and Shankar [visual estimate] |
| OSM footprint (game x, z) | outer `[[96.9,43.2],[160.2,39.5],[178.6,200.9],[115.3,205.3]]`; holes `[[113.1,57.9],[145.5,55.7],[154.7,112.4],[121.5,115.4]]` and `[[122.6,130.9],[156.5,128.6],[164.6,186.1],[130.7,189.1]]` [verified: data/bits-campus.js] |
| OSM size | sides 63.4 × 162.4 m (N, E), 63.5 × 163.1 m (S, W); courtyards 32.5–33.3 × 57.4–58.1 m (N) and 34.0 × 58.1–58.8 m (S) [verified: computed] |
| Wing depth from OSM | W 15.4 to 16.4 m, E 13.0 to 15.1 m, N 15.5 m, S 15.4 m, middle 15.9 m [verified: computed] |
| Orientation | The long axis runs roughly N–S. The west side runs at a bearing of 6.5° (its south end lies further east) [verified] |
| OSM height `h` | 11 m [verified: data]. The game sets `b.h = 2 × 3.3 = 6.6` m [verified: hostel.js] |
| Neighbours | Krishna Marg (service road) runs just west, from (76,42) to (123,328) [verified: data]. NAB (x 15…89) lies beyond it to the west. Vishwakarma Bhawan (x 203…277) is to the east. Gandhi Bhawan is directly south, only about 5 to 12 m away in OSM. POI "Da Cloud Cafe" (179,170) is at the SE corner and "Gandhi Redi by Ratan Ji" (154,199) is at the south end [verified: data]. VKB mess (245…288, 140…179) is to the east [verified: data] |
| Confirmation that the OSM building is Krishna | The official 360° tour's "Drone Day View" panorama has a "Krishna Bhawan" hotspot (yaw 27.33°, pitch −24.23°). Projected into the panorama, it lands on the two-courtyard Bhawan just east of the NAB green roof [verified: tour data plus projection] |

## B. Exterior

- **Floors:** 2 (ground and first), with a flat accessible roof [verified: KB.jpg 2006; drone]. No basement was seen [unknown].
- **Height:** about 8 to 9 m to the main parapet. The entrance block rises about 1 to 1.5 m higher [visual estimate: KB.jpg, using cycles and people as scale]. A floor-to-floor height of about 3.8 to 4.2 m suits the tall heritage rooms better than the game's 3.3 m [visual estimate: tall single room in the tour panorama "Hostel - Single Occupancy", with a jaali ventilator and exhaust fan well above the door; its Bhawan is not named]. OSM's `h = 11` is probably the parapet plus the roof mumties [approximation].
- **Shape:** a closed rectangle with **two courtyards** separated by a middle cross-wing, giving the figure "8" seen in the drone view [verified]. Square stair-head towers (mumties) stand on the roof. Six are visible in the drone crop: one at the far NW of the west wing, one on the north wing, two at the ends of the middle wing, one on the west wing just south of the middle wing, and one on the south wing. More are likely hidden on the east wing [visual estimate: `CAP/drone-krishna-detail.jpg`, `CAP/drone-krishna-westface.jpg`]. The mumties have small arched or jaali openings.
- **Roof:** flat, pale grey (lime terrace or brick-tile finish), with a low parapet and a moulded cornice. There are many rectangular solar PV arrays on every wing [verified: drone]. Along the west wing the roof reads as two parallel strips with a spine line [visual estimate]. This may mean two parallel structural bays (see C).
- **Colours:**
  - 2006: ochre-yellow lime plaster, white or light-grey trim on the arches, cornices and jaali panels, and green collapsible grille gates [verified: KB.jpg, KB5.jpg].
  - Recent drone (solar panels present, so after 2015 [approximation]): the outer walls look pale cream or off-white, and the room walls facing the courtyard behind the verandahs look salmon-pink [visual estimate].
  - The Ashok Bhawan entrance in the 2024-era tour is white with peach-ochre trim and a red band at the parapet and floor line. It may show the current campus scheme [verified for Ashok only; applying it to Krishna is an approximation].
- **Entrance block (from KB.jpg, 2006; which face it is on is unknown):** a projecting two-storey bay [verified].
  - Ground floor: two large **cusped multifoil arches** with white mouldings and rosette roundels in the spandrels. The left arch holds a green collapsible steel gate; the right arch is the open doorway with a fanlight grille. To each side are round-arched windows with radial fanlight grilles and five-ring grille bars.
  - Front steps: about 3 to 4 risers across the width of the bay (plinth about 0.45 to 0.6 m) [visual estimate].
  - Above the arches: a plain band carrying the Devanagari name "… भवन" [verified, partly legible].
  - First floor: an open **loggia** with paired Tuscan columns and a square-pier arcade on the returns, and jaali panels in the parapet band [verified].
  - Many bicycles are parked along the facade [verified]. The blog calls this side the "Front Wing" and notes the grille design on it [verified: blog text].
- **Outer facade elsewhere:** the ground floor has a regular row of arched windows with grilles. The first floor has a close-set row of rectangular openings, nearly continuous on the west wing, which may be an outer verandah [visual estimate: drone]. The south end has about 22 bays of small windows on each floor, with arched heads on the ground floor [visual estimate: drone].
- **Courtyard facades:** the ground floor is an arcade of semicircular or cusped arches on piers; the first floor is a colonnade of rectangular openings [verified: drone, middle-wing face]. Behind the arcade are the verandah (corridor) and the room fronts.
- **Landscaping:** both courtyards are lawn with mature trees [verified: drone; SWD "Green courtyard"]. A continuous belt of mature trees lines Krishna Marg [verified: drone]. A blue tarp or vehicle sits at the SW corner [verified, transient].
- **Lighting:** a tube light in the loggia ceiling [verified: KB.jpg]. Night lighting is [unknown].

## C. Floor-by-floor layout

Evidence is thin. What is known:

- The wings carry historical names: Front Wing (with the entrance), Back Wing ("towards the insti", meaning towards the Main Building to the N/NW), New Wing, T-Wing, and H-Wing. The H-Wing is a later row of rooms "joining the T-Wing to each New Wing to complete the final wing", with larger double rooms [verified: GWU alumni blog, 2006]. Which wing is which on the plan is [unknown]. A plausible reading: Back Wing = north, T-Wing = middle cross-wing, H-Wing = the closing end wing [approximation].
- Room numbers are three digits, with the floor first: 147 is a first-year room in the Back Wing; 228 is a third-year room in the New Wing [verified]. So the ground floor is numbered 1xx and the first floor 2xx [visual estimate].
- Facilities listed by SWD [verified]:
  - beds, study tables with drawers, wardrobes, utility racks
  - solar-powered geysers and drinking-water outlets
  - laundry service
  - **AC common rooms** (plural) with a digital TV, TT table, foosball and chess
  - **MultiGym**
  - badminton and volleyball courts
  - a 24×7 snacks vending machine
  - CCTV on the **entrances** (plural)
  - shared washrooms at about 1 bathroom per 4 students
- The positions of the common room, gym, washrooms and stairs are [unknown].

Cross-section. OSM wings are about 15 m deep, but a single-loaded wing (verandah plus room) is only about 7 to 8 m. The single-occupancy room in the tour panorama has no outside window, only a corridor-side window beside the door and a high ventilator, which points to **back-to-back rooms**. Two models fit [approximation]:

```
 Model 1 (double-loaded, preferred)      Model 2 (single-loaded + outer verandah)
 outside                                  outside
 |== outer verandah / jaali arcade ~3 m   |== outer verandah ~3 m
 |[ room ~4 m ][ room ~4 m ]              |[ room ~4.5 m ]
 |== inner verandah (courtyard) ~3 m      |[ service/stores ~4 m ]
 courtyard                                |== inner verandah ~3 m
                                          courtyard
```

Plan sketch (local frame; north is up; not to scale) [approximation built from the OSM outline and the drone]:

```
        N wing (rooms both sides?)                 ~63 m
   +--------------------------------------------+
   |M  verandah ring, arches facing court      M|
   |  +--------------------------------------+  |
 W |  |  courtyard 1: lawn + trees ~33x57 m  |  | E
   |  +--------------------------------------+  |
 w |M====== middle wing (T-wing?) ~16 m =====M| w
 i |  +--------------------------------------+  | i
 n |  |  courtyard 2: lawn + trees ~34x58 m  |  | n
 g |  +--------------------------------------+  | g
   |M                                        M  |
   +--------------------------------------------+
        S wing                                  ~163 m long overall
 M = roof mumty / stair head seen in the drone (positions approximate)
 Krishna Marg runs along the W face.
```

## D. Staircases

- Not seen directly [unknown]. No interior photo or video of a Krishna stair was found.
- Indirect evidence: the square roof mumties at or near the inner courtyard corners and at the ends of the middle wing [visual estimate]. In Indian two-storey hostels of this period a mumty normally caps a stair, so **about 6 to 8 stairs, near the courtyard corners** is the likely layout [approximation].
- Proposed stair [approximation]:
  - a **dog-leg (two flights + half landing)** in a bay about 3.4 m wide off the inner verandah
  - about 1.2 m per flight, 150–165 mm risers
  - with a ~4.0 m floor height that is about 24–26 risers in two flights of 12–13 (the game's 16 risers of 206 mm at 3.3 m would also work)
  - a cement or terrazzo finish with a mild-steel rail
  - one or two stairs continuing to the roof through a mumty
- Rails: [unknown]. A plain mild-steel balustrade painted dark is typical [approximation].

## E. Interior

- **Corridor (verandah), first floor, 2006** [verified: KB_RahulsRoom3.jpg]:
  - powder-blue or light-grey distemper walls; grey kota-stone floor
  - deep reveals around each door and window; a surface electric conduit with a round bell-push or switch
  - a concrete **jaali ventilator block** high on the wall above each room
- **Room door, 2006** [verified: KB_RahulsRoom.jpg]:
  - green-painted timber frame holding two leaves: an outer leaf with diamond-mesh wire netting and an inner solid leaf
  - door opening about 0.9 × 2.1 m [visual estimate]
  - the room number stencilled in red above the frame
- **Room interior, 2006** [verified]:
  - pale-blue walls
  - an **arched wall niche with a concrete shelf (loft) above it**, used for luggage
  - a jaali ventilator high on the far wall
  - tube light; old timber beds since replaced by "dull-mauve metal" (blog)
- **Room, current**: the tour panorama "Hostel - Single Occupancy" shows a heritage Bhawan room; which Bhawan is not stated [verified: tour; Bhawan unknown].
  - cream walls, grey stone floor, dark grey skirting, high ceiling
  - ochre laminate door with a small barred window beside it (the corridor wall)
  - jaali ventilator and exhaust fan above the door
  - a wall-mounted open shelf over a laminate desk with drawers, and a steel-frame chair
  - a steel single bed with a plywood deck
  - an **arched alcove with two concrete shelves**, and a **built-in double-leaf timber wardrobe**
  - a wall tube light
  - estimated room size about 3.0–3.3 × 4.0–4.5 m [visual estimate]
- **Room, double (tour "Hostel - Double Occupancy")**, unnamed Bhawan, probably an H-wing or newer double room [visual estimate]:
  - two beds, two laminate desks, two grey steel almirahs
  - two windows on the outer wall under a dropped beam, open shelves over the desks
  - green-grey stone floor
  - about 5.5–6 × 4.5 m [visual estimate]
- Washrooms, common room, gym and lobby interiors: [unknown] (no source).

## F. Gameplay (proposals)

- **Entry:**
  - The game's entrance is on the west face at the middle of the length: outside (104.3, 127.6), inside (108.0, 127.2) [verified: game].
  - The middle wing in OSM sits at z ≈ 115–131. In the drone, the west wing roofline breaks at the junction with the middle wing, so an entrance aligned with the middle wing on the west face is plausible. **Keep it** [approximation].
  - Make the entrance a projecting bay about 2–2.5 m forward of the facade and about 10–12 m wide, with 3 to 4 steps (y 0 to 0.5) and a plinth platform. Add a first-floor loggia over it, walkable from the first-floor corridor [approximation, modelled on KB.jpg].
- **Spawn:** keep the player's room `hostelroom` near the entrance; the current spawn is (108.5, 119.4) [verified: game].
- **Second entrance:** SWD says "CCTV surveillance on entrances". A second door on the east face is plausible [approximation].
- **Collision:**
  - outer wall along the OSM outline
  - courtyard verandah edges at the OSM holes (33 × 58 m courts), not at the game's 47 × 69 m
  - if the wing depth goes to about 15 m, add a back-to-back room row or an outer verandah (see C)
- **Stairs:** put the stairs near the inner courtyard corners under the visible mumties. At least 4 (two per courtyard, diagonally opposite) are needed for navigation. Keep `space_stair` geometry (RISE = FH/16, TREAD 0.27); only the positions and count change [approximation].
- **Enterable rooms:** the player's room, two or three peer rooms, the common room (AC; TV, TT, foosball, chess), the MultiGym, one washroom block per floor and the roof via one mumty.
- **NPCs:** walk the verandah ring; sit on the courtyard lawn; gather around the entrance steps and the cycle rows. Add courtyard play: badminton and volleyball [verified as Krishna facilities; placement approximation].
- **Camera:** clamp inside the corridor ring. Verandahs are about 3 m wide and about 3.8–4.0 m high.
- **Existing gameplay rooms (COORDINATES.md):** none of the ROOM_HOSTS rooms sit in Krishna, only `hostelroom` and the decorative `room-*` ids. `roomAt` returns 'hostelroom' or 'hostel', so moving spaces is safe if those ids keep their names and `spawn`, `bedSpot` and `myRoom` stay consistent [verified: hostel.js].

---

# Block 2: Gandhi Bhawan

## A. Identification

| Item | Value |
|---|---|
| Official name | Gandhi Bhawan, boys' hostel, Pilani campus [verified: swd.bits-pilani.ac.in/gandhi-bhawan.aspx] |
| OSM footprint | outer `[[123.4,217.6],[184.2,206.5],[198.9,309.7],[138.1,318.9]]`; holes `[[141.1,229.8],[178.6,223.9],[183.1,256.3],[144.7,261.8]]` and `[[146.2,271],[185.3,265.9],[190.4,300.5],[152.1,304.9]]` [verified] |
| OSM size | 61.8 × 104.2 m (N, E), 61.5 × 102.4 m (S, W); courtyards 38.0–38.8 × 32.2–32.7 m (N) and 38.6–39.4 × 34.4–35.0 m (S), so the courtyards are wider (E–W) than long [verified: computed] |
| Wing depth from OSM | W 15.2–15.4, **E 7.2–8.1**, N 15.6, S 11.1, middle 9.6 m [verified: computed]. The thin east wing may be single-loaded, or the outline may be traced wrong [unknown] |
| Orientation | Long axis N–S; the west side runs at a bearing of 8.3° [verified] |
| Neighbours | Krishna Marg runs along the west face and Bhagirath Marg (215,323)→(170,16) along the east. Gandhi Marg and the **Patel roundabout** (statue at 126,339) are at the SW corner. Bhagirath Bhawan (a girls' hostel) is east, across Bhagirath Marg. Krishna Bhawan is north [verified: data; roundabout and road seen in the drone downward view] |
| Confirmation | The "Drone Day View" panorama has a "Gandhi Bhawan" hotspot at yaw 61.21°, pitch −42.58°, which lands on the building NE of the Patel roundabout [verified: tour data plus projection] |

## B. Exterior

- **Floors:** 2, flat roof [verified: drone oblique `CAP/drone-gandhi-oblique.jpg`].
- **Roof:**
  - many solar PV arrays on the east and middle wings
  - a **cluster of about 8 black plastic water tanks** on the middle cross-wing roof
  - square mumties: one where the middle wing meets the east wing, one at the SE, and two on the west wing roof (one with an open jaali side)
  - [verified: drone, top and oblique views]
- **West facade (onto Krishna Marg)** [visual estimate: `CAP/drone-gandhi-top.jpg`, `CAP/drone-gandhi-westface.jpg`]:
  - ground floor: a long row of **arched openings filled with dark scroll grilles**
  - first floor: a row of rectangular windows
  - a **projecting entrance bay** with larger rectangular first-floor openings (a loggia like Krishna's and Ashok's) and a raised roof block, placed roughly 34–51 m north of the SW corner
  - dense rows of bicycles parked along the facade
  - on Krishna Marg in front of it, striped posts that may be boom barriers or bollards [visual estimate]
- **Courtyards:** mostly green with trees. A **marked hard court with basketball keys** sits in one courtyard (the north one by the view geometry) and a second lined hard court (badminton or volleyball) in the other [visual estimate: drone oblique]. SWD lists a basketball court and badminton courts [verified].
- **Courtyard walls:** the room fronts behind the verandahs look salmon-pink; the arcades are pale [visual estimate].
- **Colours:** pale cream or light-grey outer walls, with salmon-pink inner walls [visual estimate].

## C. Floor-by-floor layout

- Facilities from SWD [verified]: "Well furnished rooms"; cots, study tables, chairs, wardrobe; shared washrooms at about 1 bathroom per 4 students; **1 common room with TV, TT table, carrom boards**; basketball and badminton courts; 24-hour security guards; a mess with a 400-seat dining hall.
- Room count, room numbers, and the positions of the common room and washrooms are [unknown].
- Plan sketch [approximation]:

```
            N wing ~16 m
   +-------------------------------+
   |   court 1 ~38 x 33 m          |  E wing
 W |   (basketball court + trees)  |  ~8 m
   |===== middle wing ~10 m =======|  (thin)
 w |   court 2 ~39 x 35 m          |
 i |   (lined court + trees)       |
 n +-------------------------------+
 g ~15 m      S wing ~11 m
 [ENTRANCE BAY on W face, roughly x 131-133, z 268-285]
 Krishna Marg along W face; Patel roundabout off the SW corner.
```

## D. Staircases

Not seen [unknown]. The roof mumties suggest stairs near the courtyard corners and where the middle wing meets the east wing [visual estimate]. Propose the same dog-leg type as Krishna, at least 4 [approximation].

## E. Interior

No Gandhi-specific interior source was found [unknown]. Use the generic heritage room in Block 1 E (tour panorama; its Bhawan is not named).

## F. Gameplay (proposals)

- **Entrance:**
  - Move it to the **west face**, facing Krishna Marg [visual estimate]. Proposed bay centre about (132, 277) ± 9 m along the face, facing yaw west (−x).
  - The game currently puts it at outside (193.7, 257.8) / inside (190.0, 258.3) on the east face [verified: game]. That happens because `entranceOrder()` picks the long side nearest any road, and Bhagirath Marg is slightly closer than Krishna Marg.
- **Courtyards:** in the game the courts are 45.9 × 38.6 m, bare concrete, with cricket in court 1 and football in court 2 [verified]. Make them: a basketball court in one, badminton in the other, lawn and trees around them.
- **Rooms:** Gandhi has no gameplay rooms; `room-double0`, `room-study`, `room-double` and `room-senior` are decorative ids [verified: game].

---

## G. Sources

| # | Source | URL | What it shows | Confirms | Local capture (CAP = scratchpad folder above) |
|---|---|---|---|---|---|
| 1 | BITS Pilani official 360° virtual tour (3DVista): locale and data files | https://www.bits-pilani.ac.in/Pilani-Campus-Virtual-tour/index.htm (data: `locale/en.txt`, `script_general.js`) | Panorama list. Hotspots "Krishna Bhawan" and "Gandhi Bhawan" sit on "Drone Day View" (panorama_BB0577EA) and "Drone Night View" (panorama_BD69F782) | Which OSM building is Krishna and which is Gandhi (by projecting the hotspot yaw and pitch) | `CAP/tour-en.txt`, `CAP/tour-general.js` |
| 2 | Tour panorama "Drone Day View" | same, media `panorama_BB0577EA_FC5E_3691_41E2_80F846AEBA0C_0/{f,r,d}/0` tiles | Aerial 360° from above the Gandhi/Patel roundabouts, looking north up the NAB axis | Krishna: 2 storeys, 2 lawn courtyards, roof mumties, PV, arcades. Gandhi: west-face entrance bay, cycles, courts, water tanks | `CAP/strip-BB0577EA.jpg`, `CAP/face-BB0577EA-*.jpg`, `CAP/drone-krishna-zoom.jpg`, `CAP/drone-krishna-detail.jpg`, `CAP/drone-krishna-westface.jpg`, `CAP/drone-gandhi-oblique.jpg`, `CAP/drone-gandhi-top.jpg`, `CAP/drone-gandhi-westface.jpg` |
| 3 | Tour hotspot masks | `media/panorama_BB0577EA_…_HS_f44lsfyq.png` (Krishna), `…_HS_d3r732oz.png` (Gandhi) | Highlight polygons for the two Bhawans | Building extents in the panorama | `CAP/tour/drone_HS_*.png` |
| 4 | Tour panorama "Boys Hostel" (panorama_BD6CC1EB) | tour media | Front of **Ashok Bhawan** (nameplate "अशोक-भवन" read at full resolution) | Heritage entrance-block type: cusped arches, loggia, red parapet band. **Not Krishna or Gandhi** | `CAP/strip-BD6CC1EB.jpg`, `CAP/face-BD6CC1EB-f.jpg`, `CAP/tour/BD6CC1EB_f_L0_2_2.jpg` |
| 5 | Tour panorama "Hostel - Single Occupancy" (BD6C6AC1) | tour media | Heritage single room, Bhawan not named | Room furniture, alcove, built-in wardrobe, ventilator, no outside window | `CAP/strip-BD6C6AC1.jpg`, `CAP/face-BD6C6AC1-*.jpg` |
| 6 | Tour panorama "Hostel - Double Occupancy" (BD63A32C) | tour media | Double room, Bhawan not named | Double-room furniture and windows | `CAP/strip-BD63A32C.jpg`, `CAP/face-BD63A32C-*.jpg` |
| 7 | "Bees Saal Baad: Return to Pilani – Bhavans" (alumni blog, photos dated 2006) | https://www2.seas.gwu.edu/~simhaweb/misc/pilani/bhavans.html | KB.jpg (Krishna entrance), KB5.jpg (entrance doorway), KB_RahulsRoom.jpg (room 147), KB_RahulsRoom3.jpg (corridor, rooms 227/228) | Entrance block design, 2006 colours, room door and number style, corridor finishes, wing names | `CAP/gwu/KB.jpg`, `CAP/gwu/KB5.jpg`, `CAP/gwu/KB_RahulsRoom.jpg`, `CAP/gwu/KB_RahulsRoom3.jpg` |
| 8 | Same blog, part II | https://www2.seas.gwu.edu/~simhaweb/misc/pilani/bhavans2.html | Text only (Budh and Malviya photos not used) | T-Wing, New Wing and H-Wing history; H-wing double rooms | none (text) |
| 9 | SWD Krishna Bhawan page | https://swd.bits-pilani.ac.in/krishna-bhawan.aspx | Facility list | Green courtyard, badminton and volleyball, MultiGym, AC common rooms, vending, laundry, solar geysers, CCTV on entrances | `CAP/swd-krishna-bhawan.png` |
| 10 | SWD Gandhi Bhawan page | https://swd.bits-pilani.ac.in/gandhi-bhawan.aspx | Facility list | Basketball and badminton courts, 1 common room (TV, TT, carrom), 1:4 bathrooms, 400-seat mess | `CAP/swd-gandhi-bhawan.png` |
| 11 | YouTube "BITS PILANI CAMPUS TOUR (2025-2026)" (Pushkar Biltheria; sponsored by Phodu Club) | https://www.youtube.com/watch?v=XkDvacBC7zA | About 45 frames sampled from 0:05 to 8:24. 0:36 shows an unnamed heritage Bhawan with cusped arched windows on a cycle-lined road. 4:49 shows a campus map. 4:51–5:06 show an eatery with cusped arches. **No identifiable Krishna or Gandhi interior** | Only general style. The hostel.js comment calling this a "Gandhi Bhawan walkthrough" was **not confirmed** by the frames sampled | `CAP/yt1/`, `CAP/yt1e/`, `CAP/yt1h/`, `CAP/yt1-contact.jpg`, `CAP/yt1-early.jpg`, `CAP/yt1-hostel.jpg` |
| 12 | YouTube "BITS Pilani, Pilani Campus – Official Campus Tour" | https://www.youtube.com/watch?v=bkmKuEguTH8 | 17 frames sampled from 0:31 to 15:12 (clock tower, classrooms, SAC, Food Ministry, the mess and others) | No hostel footage in the sampled frames | `CAP/yt2/`, `CAP/yt2-contact.jpg` |
| 13 | OSM data in the repo | `data/bits-campus.js` | Footprints, holes, roads, POIs | All coordinates and dimensions | n/a |
| 14 | The game today (`?explore`, explorer `select()` and `walk()`) | http://localhost:8080/?explore | Overview and lobby of both Bhawans; dumped layout data | Section H | `CAP/game-krishna-overview.png`, `CAP/game-krishna-lobby.png`, `CAP/game-gandhi-overview.png`, `CAP/game-gandhi-lobby.png`, `CAP/game-hostels.json` |

## H. Comparison with the game today

**What matches** [verified against the sources above]:
- two storeys plus a walkable roof
- two courtyards in each Bhawan, with corridors on the courtyard side behind arches
- cusped arches and scrollwork grilles
- an entrance lobby on Krishna's west face near the middle
- cycle parking at the entrance
- a vending machine (Krishna has a 24×7 one) and a water cooler
- laundry, a common room with TV, and a stair up to the roof terrace
- solar panels on the roof (the game shows blue strips)
- 1-bathroom-per-4-students style shared washrooms

**What is wrong** [verified game values against the sources above]:

| # | Game | Reality | Evidence |
|---|---|---|---|
| 1 | Courtyards are bare concrete with a cricket pitch and football goals | Krishna: green lawn with trees; badminton and volleyball courts. Gandhi: lawn and trees with a basketball court and badminton courts | SWD; drone |
| 2 | Gandhi's entrance is on the **east** face (193.7, 257.8), towards Bhagirath Marg | Projecting entrance bay on the **west** face, onto Krishna Marg, about (132, 277) | drone downward view |
| 3 | Wing depth 7.85 m; courtyards 47.6 × 68.8 m (Krishna) and 45.9 × 38.6 m (Gandhi) | OSM wings about 15 m (Gandhi's east about 8); courtyards 33 × 58 m (Krishna) and 38 × 33 m (Gandhi) | OSM data |
| 4 | Entrance is a flat opening in the wall with a small timber frame and a canopy on two posts | A projecting two-storey bay with two big cusped arches (one with a green collapsible gate), 3–4 steps, a name band, and a first-floor loggia with paired Tuscan columns | KB.jpg |
| 5 | Room bays 5.1 m; four-digit plates (1001…) | Doors about 3–3.5 m apart; three-digit red stencilled numbers (1xx ground, 2xx first) | 2006 photos |
| 6 | Roof: one mumty plus 3 water tanks on the west wing | Several square mumties near the courtyard corners and middle-wing ends; dense PV arrays on all wings; at Gandhi about 8 black tanks on the middle wing | drone |
| 7 | Floor height 3.3 m (building 6.6 m) | About 3.8–4.2 m per floor, about 8–9 m to the parapet; OSM h 11 | visual estimate |
| 8 | 2 stairs (one main by the lobby, one at the far east) | Probably 6–8, near the courtyard corners | mumty evidence, approximation |
| 9 | Room interior: window in the outer wall, clothes line, loose almirah | Heritage single room: no outside window (window on the corridor wall beside the door), arched shelf alcove, built-in timber wardrobe, steel bed, laminate desk | tour panorama |
| 10 | Corridor wall: cream with a beige dado | 2006: powder-blue distemper with a grey kota floor and jaali ventilators; current colours unknown | 2006 photo |
| 11 | Facade texture: white or cream | Outer walls pale cream (ochre-yellow in 2006); courtyard room walls salmon-pink | drone, 2006 |
| 12 | Gym missing; one common room | Krishna has a MultiGym and AC common rooms (plural) | SWD |

**Ranked fixes, most visible first:**

1. Turn the courtyards into **lawn with trees** and swap cricket and football for **badminton and volleyball (Krishna)** and **basketball and badminton (Gandhi)**. This is the biggest difference from the map, from above and from the corridors.
2. **Move Gandhi's entrance to the west face**, onto Krishna Marg, for example with a per-Bhawan override in place of the nearest-road rule.
3. Rebuild the **entrance as the projecting heritage bay**: two cusped arches, a green collapsible gate, steps, a name band and an upper loggia with paired columns, for Krishna (the player's arrival view) and Gandhi.
4. **Match the courtyard size and wing depth to OSM**: about 15 m wings, using back-to-back rooms or an outer verandah.
5. **Roof:** add several square mumties at the courtyard corners and denser PV arrays, and move the water tanks for Gandhi.
6. **Rooms:** narrower bays (about 3.2 m), three-digit stencilled numbers, corridor-side windows and heritage room furniture (alcove, built-in wardrobe).
7. Raise the floor height towards about 4 m. Check the step and riser counts and the colliders if this changes.
8. Add more stairs at the corners. Add Krishna's MultiGym and AC common room.

## I. Uncertainties and hand-offs

**Uncertainties:**
- **Which face Krishna's entrance is on** is not proven. The 2006 photo does not show orientation. The west face at the middle wing is consistent with the drone and the road, but this is unconfirmed.
- Exact position of Gandhi's entrance along the west face (±9 m); perspective makes the drone measurement rough.
- Wing cross-section (Model 1 or Model 2); real room counts; positions of the washrooms, common room, gym and stairs; stair form and rails.
- Current corridor and room colours inside Krishna and Gandhi. The 2006 photos predate renovations, and the tour room panoramas do not name their Bhawan.
- Gandhi's east wing is only about 8 m deep in OSM. It may be real (single-loaded) or a tracing error; not checked against imagery.
- Not accessed:
  - Google Maps and Google Earth (not attempted; the drone panorama was enough for massing)
  - Wikimedia Commons and Wikipedia (no Krishna or Gandhi-specific photos were found by search)
  - Reddit and Quora (no relevant results in search)
  - the "Drone Night View" panorama (only its hotspot data was read)
  - the SR Bhawan tour video linked from source 12 (a different building)

**Hand-offs:**
- `hostels-newer`: the tour panorama "Boys Hostel" is **Ashok Bhawan's** entrance (white with peach trim, cusped jaali-grilled arches, a pillared loggia, a red parapet band, a pink-paved forecourt with a planter, and two gate pillars). See `CAP/face-BD6CC1EB-f.jpg`.
- Roads and landscape owner: Krishna Marg has striped posts or barriers in front of Gandhi's west face; there is a tree belt along Krishna Marg; the Patel roundabout lies just off Gandhi's SW corner.
- Food and mess owner: POI "Gandhi Redi by Ratan Ji" (154,199) and "Da Cloud Cafe" (179,170) sit at Krishna's south and SE ends. SWD says each Bhawan's mess has a 400-seat dining hall. VKB mess is next to Krishna (bits-world.js comment).
- `hostels-ram-budh` and `hostels-shankar-vyas-vk`: the blog's wing nomenclature (Front, Back, T, New and H wings) and the 1xx/2xx room numbering probably apply to all the heritage Bhawans.
