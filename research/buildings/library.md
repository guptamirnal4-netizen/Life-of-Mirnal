# BITS Library (Pilani campus): research report

Agent: `library`. Area: the OSM footprint "BITS Library" (x 171.2..256.6, z -261.5..-184.2), its forecourt, and the gameplay room `library` placed inside it.

Coordinates follow [../COORDINATES.md](../COORDINATES.md): metres, x east, z south, origin at the Rotunda.

Tags:

- **[verified]:** seen directly in a source listed in section G.
- **[visual estimate]:** measured or judged from imagery or panoramas.
- **[approximation]:** a plausible layout proposed for the game. It has not been observed.
- **[unknown]:** not established.

All captures are in `SCR = /private/tmp/claude-501/-Users-mirnal-Documents-Whisperflow/58e9866d-f336-43fa-bce9-096a63ba2c16/scratchpad/research/library/`. They are reference only and must stay out of the repo.

---

## Summary (read this first)

The real library looks nothing like the game's flat-roofed red box with a small school-library room inside it.

- **Two storeys, with a palace-style plan** [verified]. It was opened in 2004, and the brochure describes it as "Rajasthani design". Inside, it has these parts, in order from the entrance:
  - a double-height **foyer** with glazed pyramid skylights;
  - **twin stairs**;
  - a cross hall;
  - a central **circular rotunda** under a glazed dome with a 7 m oculus, ringed by two tiers of pink Dholpur sandstone columns with cusped arches and jali parapets;
  - an east lobby.
- **Reading halls and book stacks** (Halls 1–5) sit on both sides of that axis. **Hall 6** fills the first floor [verified, from the official brochure's floor guide and the tour's signs].
- **Exterior:**
  - red and brown sandstone panel cladding over a pale pink plaster upper band;
  - small round "porthole" windows, white-framed windows, and stepped wing walls;
  - one ceremonial **west entrance**: a huge brick arch carrying the "BITS LIBRARY" lettering over a recessed portico, reached by fan-shaped semicircular steps from a paved forecourt full of bicycles [verified].
- **The OSM footprint matches the official building plan's outline well** [verified]. The OSM height of `h = 6.6` m is too low. The real building is about 10–11 m to the parapet [visual estimate].

---

## A. Identification

| Item | Value |
|---|---|
| Official name | "BITS Library" on the façade arch [verified]. The brochure uses "BITS Pilani Library"; the tour uses "Library". |
| Category | Central academic library. RFID/KOHA self-issue, reading halls, stacks, Birla Heritage Gallery, rare-book section, MakerSpace, research zone [verified, brochure]. |
| Date and architect | Opened May 2004. Architect Sanjay Moondra, Indore [from search-result snippets only (bits-pilani.ac.in / cavac.at); page not opened, so treat as unverified]. "Built out of Jodhpuri brown sandstone", cost "four-crore rupees" [verified, GWU page]. |
| Size | Brochure: "about 65000 sq.ft area … Built on about 2.5 acres of land in the north-east corner of the campus" [verified]. The OSM footprint area is 4,500 m² (48,400 sq ft) per floor [computed]. A first floor of about 1,500 m² around the voids would reach the 65,000 figure [approximation]. |
| OSM footprint | 38-vertex polygon, bbox x 171.2..256.6, z -261.5..-184.2 (85 × 77 m), centroid **(214.8, -221.3)**, `kind: library`, `h: 6.6` (data/bits-campus.js) [verified] |
| Match with the official plan | The "Institute Building Plan" in the official 2026-27 timetable shows the Library as a cross-shaped plan [verified]. It has a convex west end with a projecting porch and fan steps, a convex east end, and curved lobes on the north and south wings. OSM traces this outline closely [verified by overlay of shapes]. Two differences: OSM omits the porch and steps [verified]; the OSM west wing is offset about 2 m south of the long axis [visual estimate]. |
| Orientation | The long axis runs about east-west, rotated **-7.9°** (the east end lies further north). The unit vector along the axis is u = (0.990, -0.138) in (x, z) [computed from the OSM edges]. The **main entrance faces west** [verified: the porch is on the west end in the official plan; FD-I appears on the right (south) of the exterior panorama looking at the door]. |
| Local frame used below | u = metres along the axis (east +), v = metres across it (south +), origin at the centroid (214.8, -221.3). World = (214.8 + 0.990u + 0.138v, -221.3 - 0.138u + 0.990v). Footprint spans u -44..+42, v -39.6..+36.4. |
| Neighbours | **South:** a service road, then FD-I (x 175..285, z -159..-40) [verified, fd1 report and official plan]. **East:** the Lecture Theatre Complex (not in OSM; about x 281..346 per the fd1 report) [verified on the plan]. **West:** the forecourt, then New BITS Workshop (x 37..104, z -198..-148). **North-west:** Rakesh Kapoor Innovation Centre (x 30..71, z -308..-261). |
| OSM POIs inside the footprint | "WILP Division" (213, -253), in the north lobe. "BITS Pilani Toastmasters Club" (200, -197), in the south-west wing [verified, data]. The exterior panorama links to "Practice School and WILP Division" [verified], so a WILP office may sit in or beside the north part. Whether it is inside the library building is [unknown]. |

## B. Exterior

| Feature | Description | Tag |
|---|---|---|
| Floors | 2 (ground + first). Small rooftop pavilions and skylight lanterns stand above. | [verified] (panoramas; drone) |
| Height | Parapet about 10–11 m. The entrance arch crown about 9–10 m. The rotunda skylight drum rises a little above the roof. | [visual estimate] (door 2.7 m used as scale) |
| Length × width | 86 × 76 m in the rotated frame. OSM is consistent with the plan. | [verified] / [computed] |
| Shape | Cross-shaped plan. Convex apse-like ends to the west (entrance) and east. Curved bays on the north and south lobes. Massing steps back in stages, so the walls form a "cascade". | [verified] (plan, photos) |
| Roof | Flat roof, with solar PV arrays across much of it and pale skylight lanterns and domes. A white tent-like pyramid canopy (white with dark lines) sits over the entrance arch. | [visual estimate] (drone frame); canopy [verified] (2006 photo and exterior panorama) |
| Wall materials and colours | Ground storey and wing walls: **red-brown sandstone panels** (about #b0584a to #a65446) in a large ashlar grid with thin cream joints, and cream sandstone string courses. Upper band: **pale pink and salmon plaster** (about #e8b9ad), with a stepped, crenellated parapet edged in cream. Small round porthole windows (blue glass) sit in the parapet zone. Decorative recessed square panels with carved rosettes are set on the wing walls. | [verified] (exterior panorama, 2006 photos); colours [visual estimate] |
| Entrance | One ceremonial door, on the west end. It has these parts: <br>• a **huge brick arch**, the brochure's "big 8M dia exposed brick arch", carrying the cream metal letters "BITS LIBRARY" on its crown; <br>• a recessed portico whose ceiling is painted with a fresco; <br>• a glazed aluminium door screen of 4 leaves under a grid of coloured glass panels (yellow, blue, red, grey); <br>• a marble threshold platform; <br>• **fan-shaped semicircular steps**: 4 risers to the platform plus 2 to the door, sandstone risers with cream marble nosings; <br>• **ramps on both sides** with stainless-steel tube railings. <br>Stepped sandstone wing walls fall away on both sides. | [verified] (exterior panorama, 2006 photo 2, brochure) |
| Other doors | None seen. Service or fire exits are [unknown]. | [unknown] |
| Windows | Rectangular openings with white-framed casements (2×2 or 3×2 lights) on both storeys. Narrow vertical slit windows sit in the wing walls. Upper windows are set in the pink band. | [verified] (photos) |
| Balconies, pillars, arches | Outside: the main arch only, plus small arched niches. All the column and arch work is inside (see E). | [verified] |
| Lighting (exterior) | Tall steel pole lamps in the forecourt. | [verified] (exterior panorama) |
| Landscaping | A large forecourt paved with **grey octagonal and red square interlocking pavers**. Raised sandstone planters with shrubs, rows of bicycles on stands, trees (neem and conifers) around the edges, and low hedges and lawns along the façade. | [verified] (exterior panorama, 2006 photo 1) |

ASCII outline in the local frame (u →east, v ↓south; not to scale):

```
                 north lobe (curved)
           ┌──────╮__╭──────┐
   ┌───────┘                └───────┐
   │  Hall 1 / gallery    Hall 2    │──╮
 ╭─┤                                  │   ╲
(  │ FOYER ─ X1 ─  ◎ ROTUNDA ─ E-LOBBY│    ) east apse
 ╰─┤                                  │   ╱
   │  Hall 5         Hall 4  Hall 3   │──╯
   └───────┐                ┌───────┘
           └──────┐   ┌─────┘
   ◠ fan steps    south lobe (flat)
 ← WEST ENTRANCE
```

## C. Floor-by-floor layout

### C1. What the official floor guide says (brochure "Know your Library") [verified]

| Floor | Space | Contents |
|---|---|---|
| Ground | **Foyer (Lobby)** | Self issue/return kiosk, help desk, information counter, new arrivals, reading room, GMAT test centre and library offices |
| Ground | **Hall No. 1** | Birla Heritage Gallery, magazines and journals, reading room, reference section |
| Ground | **Hall No. 2** | Books: computer science, social sciences, languages, science and technology, basic sciences (call no. 001-623) |
| Ground | **Hall No. 3** | Books: chemical and civil engineering, environment science, management, literature, history, biographies, novels and fiction, the G.D. Birla rare-book section, the G.D. room (call no. 624-999) |
| Ground | **Hall No. 4** | Reference section, MakerSpace (seats 8; IoT, HPC and 3D printers), research zone, young-learner section, reading room |
| Ground | **Hall No. 5** | Reading room. The tour's sign adds the Harvard Business Review collection and books published by BITS faculty. |
| First | **Hall No. 6** | Bound volumes and the secondary collection. Reading area, a brainstorm room (air-conditioned, about 20 seats), an E-zone, study carrels, group-discussion rooms (1–4 people each) |

Also: "convenient access to the first floor via the staircase from the atrium". "The whole building is divided into two equal parts by a series of courtyards around which all the other areas of the library are placed." "The dome in the centre of the building - seven meters in diameter … Dholpur stone … stone jali railing, arches and column cladding". "Floral pattern in the flooring … white and green marble along with Jaisalmer stone." Hours: 9:00 AM to 12:00 midnight; 9:00 AM to 6:00 AM in exam weeks [all verified, brochure].

### C2. How the spaces connect (tour graph and panorama directions) [verified]

`Library (exterior)` → `Library Reception (2)` (foyer) → `Library Area 1` (cross hall). From Area 1:

- Hall 1 is to the **north** (left);
- Hall 5 is to the **south** (right);
- the Heritage Gallery (`Gallery 1–3`) lies behind and to the north-west;
- straight ahead is `Library Area 2`, the circular rotunda.

From the rotunda:

- **Hall 4** is to the **south** (`Hall 4` ↔ `Hall 5` are linked directly);
- straight on east is `Library Area Ending`, the east lobby. **Hall No. 2** (call no. 001-623) opens off its **north** side and **Hall No. 3** (624-999) off its **south** side; both signs were read in the panorama.

The directions come from the tour's hotspot yaws. These were checked against door positions in each stitched panorama: in Area 1, the yaw for Hall 5 (+45°) lands on the "HALL NO. 5" door, and the yaw for Area 2 (-50°) lands on the central passage. West→east is anchored by the official plan's west porch.

### C3. Ground-floor plan [approximation built on C1/C2; positions of halls are not measured]

Local frame (u east, v south), metres:

```
v=-40           ┌──────N lobe (use unknown; WILP POI here)──────┐
                │                                               │
v=-28   ┌───────┘   HALL 1 (reference, journals,     HALL 2     └──────┐
        │           reading)  + Heritage Gallery     stacks 001-623    │
v=-12 ╭─┤  GALLERY │                               │                   ├─╮
      │ │  counter ┌─┐  X1  ┌─────────────┐   E-LOBBY                    │ │
 v=0 (P)│  FOYER   │S│ ───▶ │  ROTUNDA ◎   │ ───▶  (logo pillar)        │ ) east apse
      │ │  counter └─┘  X1  │ Ø≈16 m court │                            │ │
v=+12 ╰─┤          S = twin └─────────────┘                            ├─╯
        │  HALL 5 (reading,   HALL 4 (reference, MakerSpace,   HALL 3   │
v=+28   └───────┐  HBR)       research zone, mezzanine stair)  stacks ┌──┘
                │      [gameplay `library` room sits here]   624-999 │
v=+36           └────────────────── S lobe ──────────────────────────┘
        u=-44  -30  -24  -14   -8          +8   +14         +32   +42
```

- **P** = porch and fan steps, u -50..-44 [approximation; existence verified]
- **Foyer**: u -44..-28, v -12..+12; double height, with 4–6 glazed pyramid skylights [visual estimate].
- **Twin stairs (S)**: u -30..-24, see D.
- **X1** (Area 1, cross hall): u -24..-14; Hall 1's door on the north, Hall 5's on the south.
- **Rotunda**: centred at about u -2..+2, v 0 (world ≈ (214.8, -221.3)). The column ring is about 16 m across [visual estimate]. The dome oculus is 7 m [verified].
- The size of each hall is an [approximation]. The north lobe's use is [unknown].

### C4. First floor [approximation from the `Library 1st Floor` panorama and the brochure]

- A **gallery ring** runs around the double-height voids over the foyer, Area 1 and the rotunda. It has black steel balustrades in a diamond pattern with wooden handrails [verified].
- Reading tables (teak, 6–8 chairs) stand right at the balustrades [verified].
- A bridge over the central passage joins the two stair heads [verified, 2006 photo 3].
- **Hall 6** spaces sit in the wings: bound volumes, carrels, brainstorm and GD rooms, the E-zone [verified that they exist; positions unknown].
- The upper tier of the rotunda colonnade gives a jali-screened walkway [verified].
- Not every wing has a first floor. Hall 4 has a mezzanine reached by an internal stair [verified], and the two-storey exterior suggests most wings do. Exact extent [unknown].

## D. Staircases

| Stair | Evidence | Description |
|---|---|---|
| **S-N and S-S: twin foyer stairs** (main) | [verified] (Reception panorama, 1st Floor panorama, 2006 photo 3, brochure "staircase from the atrium") | Two identical straight flights on each side of the central passage from the foyer into Area 1. Each rises **eastward**, away from the entrance, against the passage's side walls. Their tops are joined by a bridge or landing that spans the passage at first-floor level, with the opening under it framed by an arch. Treads are dark green/black granite with white edges, about 1.6–1.8 m wide [visual estimate]. Balustrade: black steel bars in a geometric (diamond and triangle) pattern with a wooden handrail. Large semicircular red-brick arch cut-outs sit in the side walls beside them. Flights: one straight run each; the landing count is [unknown], since one run with no intermediate landing is seen. |
| Hall 4 internal stair | [verified] (Hall 4 panorama) | A curving, helical stair with a black steel rail rises from the hall's west side to a mezzanine. Width about 1.2 m [visual estimate]. |
| Heritage Gallery stair | [verified] (Gallery 1–2 panoramas) | A small straight stair with a wooden handrail and steel balusters, with display shelves built under it. It goes up to a first-floor part of the gallery (destination [unknown]). |
| Other (fire or service) stairs | [unknown] | None seen. For the game, put one more stair in the east lobby [approximation]. |

**Game proposal** [approximation]:

- FH_ground = 5.0 m, so with the existing `RISE = FH/16` each flight has 16 risers of 0.3125 m.
- TREAD 0.27 gives a 4.3 m run per flight.
- S-N from (u -30, v -3.5) to (u -25.7, v -3.5); S-S from (u -30, v +3.5) to (u -25.7, v +3.5). Each is 1.8 m wide.
- A bridge at y = 5.0 spans u -25.7..-24, v -4.4..+4.4.
- The central passage between the stairs is 3.4 m wide at ground level.

## E. Interior

| Space | Floor | Walls and ceiling | Lighting | Furniture and signs | Tag |
|---|---|---|---|---|---|
| Foyer | **White marble** with **dark green marble** inlay bands and **yellow Jaisalmer stone**, forming a large starburst medallion around a red-draped round display table ("Must Read"). Green marble planters at the corners. | White plaster with **exposed red-brick** arches and bands. Clerestory with a row of small jali niches (red stone grilles in white frames). Coffered cream ceiling with octagonal glazed **pyramid skylights** (radial mullions). Two painted vaults (brochure: "Guru Shishya parampara"). | Brass chandeliers hanging from the skylights, wall tube lights | Help Desk (wooden lectern), **issue/return counters on both sides** (brick-faced, glazed screens behind), a self-checkout kiosk, blue sofas with a coffee table, notice boards, red door mats, glass doors with a curved brick surround | [verified] (Reception panorama, brochure photo) |
| Area 1 (cross hall) | White marble with dark green grid lines; leaf-shaped planters (money plant) | Double height, with first-floor balconies (black steel balustrades) all round. Rows of **framed portraits** of BITS figures. Glazed-roof skylights. Signs reading "HALL NO. 1" and "HALL NO. 5", and a "LIBRARY FLOOR GUIDE" stand. | Tube lights | Fire extinguishers, a lectern, a brochure stand | [verified] |
| Rotunda (Area 2) | **Gravel** court floor inside a ring of green marble planters (money plant), with stainless-steel 3-seater airport benches facing outward. Around it, a marble walkway 2 steps up. | **Two tiers of octagonal pink Dholpur sandstone columns** with cream bands, in pairs, carrying **cusped (scalloped) arches** with carved spandrels and **jali parapets** on the upper tier. A white ribbed dome with a **7 m glazed oculus** (radial stained-glass-like mullions) and a ring of small round lights or ports. | Daylight from the oculus, downlights in the arcade soffits | Through the arches: jharokha-framed book displays, a Help Desk, a "Stationery" counter | [verified] (Area 2 panorama incl. up-face; 2006 photos 4–6) |
| East lobby (Area Ending) | White marble with sweeping green inlay lines | Double height under skylights. A central square pillar with the BITS logo and a framed "Message from the Vice-Chancellor / Director". A large painted mural (an Avatar-style face) on the wall. | Tube lights | "HALL NO. 2 CALL NO. (001-623)" and "HALL NO. 3 CALL NO. (624-999)" signs beside wide doorways into the stacks | [verified] |
| Reading halls (Halls 4, 5) | **Grey Kota stone** slabs with white strip inlay in arcs | White walls. Deep **haunched concrete beams** (curved soffits) in a grid. Ceiling fans. Large white-framed windows. Height about 4.5–5 m [visual estimate]. | Rows of suspended twin-tube fluorescent battens | Teak tables for 6–8 with wooden or yellow/green plastic chairs; low book shelves; cushioned round pouffes around the columns (blue bases); a wooden issue counter (Hall 5); a children's "rainbow" corner (Hall 4, young-learner section); wall paintings | [verified] |
| Hall 1 (reference and reading) | Grey Kota stone | **Dropped grid ceiling** with square LED panels and cassette ACs. Large window bays. | LED panels | Long timber tables with black office chairs; perimeter counters along the windows; wooden reference shelving | [verified] |
| Stacks (Halls 2, 3) | Grey stone | White | Tube lights | Double-sided **wooden bookstacks** about 2.2 m tall, in rows perpendicular to the doors | [verified] (seen through the doors) |
| Birla Heritage Gallery | Grey stone | White walls. Grid ceiling with track spotlights. Campus panorama photo friezes ("Pilani Campus", "Hyderabad Campus", "Goa Campus", "Dubai Campus"). A lime-green alumni display niche. | Track spots | Framed historical photos, cream sofas, a touchscreen kiosk, the "BITS Pilani HERITAGE GALLERY" sign | [verified] |

## F. Gameplay

- **Main entry** [approximation from verified layout]:
  - fan steps from about (166.3, -214.6) up to the door at the west tip, (172.2, -215.4);
  - a 4–5 m wide door corridor into the foyer;
  - spawn or arrival point outside at (160, -214), facing east (yaw toward +x).
- **The existing gameplay room** (live values from the running game):
  - `library` is placed at x 204.2..216.2, z -202.0..-192.0;
  - its door is on the south side at x 210.2, `exit` (210.2, -189.8), `inside` (210.2, -193.6), `outside` (210.2, -190.4);
  - in the local frame it sits at about u -6..+6, v +20..+30, which is the **south lobe, where Hall 4 should be**. That is a good fit, so keep it there.
- **Recommended room treatment** [approximation]:
  - Keep the id, `roomAt`, `pathTo`, `objectivePoint` and `exit` behaviour.
  - Restyle the room as **Hall 4, the reading and reference hall**: Kota stone floor, white walls with haunched beams, tube battens, teak 6–8-seat tables, wooden stacks along the walls, an issue desk.
  - Keep the existing south facade door as a secondary entrance; whether a real south door exists is [unknown].
  - Add an inner door on the room's north wall that opens to the rotunda, so the player can also reach it through the west entrance → foyer → Area 1 → rotunda.
  - Interactables (`bookshelf`, `projectTable`) and the librarian spot carry over. The librarian is better placed at a Hall 4 issue desk.
- **Enterable spaces** (in priority order):
  1. foyer;
  2. Area 1;
  3. rotunda;
  4. Hall 4 (the gameplay room);
  5. Hall 5;
  6. the twin stairs and the first-floor gallery ring.
  Halls 1–3 and the north lobe can be visible through glazed doors but closed at first.
- **NPC walk areas**:
  - forecourt (bicycles);
  - foyer between the counters;
  - the rotunda benches;
  - reading tables in Halls 4 and 5 (seated students);
  - a librarian at the Help Desk and the Hall 4/5 counters.
- **Interactables** [approximation]:
  - self-issue kiosk;
  - Help Desk;
  - "Must Read" table;
  - floor-guide board, which can show the C1 table;
  - Hall 2/3 signs;
  - rotunda bench (sit).
- **Collisions**:
  - outer walls follow the OSM polygon;
  - the interior is axis-aligned in the local frame, rotated -7.9°. The collider system is axis-aligned, so either approximate each wall with short AABB segments or build the interior unrotated inside the footprint with a 1–2 m inset.
  - The rotunda colonnade gets small column colliders (about 0.6 m) on a ring of radius 8 m. The gravel centre is walkable.
  - Balustrade colliders on the first-floor voids, height 1.0 m.
- **Stair navigation**: walkable box runs as in D. Floor y = 0 and y = 5.0. The interior is visible within 15 m, as for other buildings.
- **Camera limits**: ceiling 4.5–5 m in the halls; the foyer and rotunda are open to about 9.5 m (oculus). Clamp the camera inside below about 4.3 m in the halls.

## G. Sources

| # | Source | URL | What it shows | Confirms | Local capture |
|---|---|---|---|---|---|
| 1 | BITS Pilani Library brochure "Know your Library" (official, 2 pp.) | https://library.bits-pilani.ac.in/back/backend-media/brochure/brochure_HNpMuID.pdf (redirect from /about/brochure) | Introduction, floor guide, hours, facilities, foyer photo | Halls 1–6 contents, 2 floors, 65,000 sq ft, 2.5 acres, 7 m Dholpur-stone dome, marble and Jaisalmer floors, staircase from the atrium, 8 m brick entrance arch, courtyards | `SCR/web/brochure.pdf`, `SCR/brochure-1.png`, `SCR/brochure-2.png`, `SCR/brochure-intro.png`, `SCR/brochure-foyer-photo.png` |
| 2 | "Bees Saal Baad: Return to Pilani – The New Library" (personal page, photos dated 03/10/2006) | https://www2.seas.gwu.edu/~simhaweb/misc/pilani/library.html | 6 photos: exterior, entrance, foyer twin stairs, rotunda columns, dome, court | Jodhpuri brown sandstone; 4 crore cost; entrance form; twin stairs; domed skylight rotunda | `SCR/web/gwu.html`, `SCR/gwu-Library1..6.jpg`, `SCR/gwu-sheet.jpg` |
| 3 | BITS timetable 1st Sem 2026-27, p.4 "Institute Building Plan (With Room Numbers)" (official) | https://academic.bits-pilani.ac.in/Downloads/Time-Table/Timetable_17_Aug_2026_4fdfacd4-f4d2-4008-b8d7-5f9f8de95a1e.pdf | Outline of the Library (ground and first floor) beside FD I and LTC | Cross plan, west porch with fan steps, convex east end, matches OSM; Library north of FD-I | `SCR/web/tt2026.pdf`, `SCR/ttplan-004.png`, `SCR/plan-library-ground.png`, `SCR/plan-library-firstfloor.png` |
| 4 | Official 360° virtual tour (3DVista), data files | https://www.bits-pilani.ac.in/Pilani-Campus-Virtual-tour/index.htm (`script_general.js`, `locale/en.txt`) | Panorama labels and hotspot adjacency with yaws | 12 library panoramas; connections in C2 | `SCR/tour/` |
| 5 | Tour panorama "Library" (panorama_BC48A5DD…) | same base, `media/<id>_0/{f,r,b,l,u,d}/1/` | West forecourt and entrance | Arch, lettering, portico, coloured glazed doors, fan steps, ramps, pavers, bicycles | `SCR/pano/vt-library-equirect.jpg`, `SCR/pano/vt-library-entrance-crop.jpg` |
| 6 | Tour panorama "Library Reception (2)" (panorama_CFFC029D…) | same | Foyer | Counters, help desk, kiosk, skylights, chandeliers, brick arches, twin stairs, starburst floor | `SCR/pano/vt-reception-equirect.jpg` |
| 7 | Tour panorama "Library Area 1" (panorama_D639F60E…) | same | Cross hall | Hall 1 and Hall 5 doors and signs, portraits, balconies, floor guide | `SCR/pano/vt-area1-equirect.jpg`, `SCR/sign-area1-hall5.jpg` |
| 8 | Tour panorama "Library Area 2" (panorama_BD478D3A…) | same | Central rotunda | Two-tier sandstone colonnade, cusped arches, jali, gravel court, benches, dome oculus (up face) | `SCR/pano/vt-area2-equirect.jpg`, `SCR/pano/vt-area2-dome-up.png` |
| 9 | Tour panorama "Library Area Ending" (panorama_CEFF5CBC…) | same | East lobby | Hall 2 (001-623) and Hall 3 (624-999) signs, logo pillar, mural | `SCR/pano/vt-area-ending-equirect.jpg`, `SCR/sign-areaending-left.jpg`, `SCR/sign-areaending-right.jpg`, `SCR/signs.jpg` |
| 10 | Tour panorama "Library 1st Floor" (panorama_BD478DE6…) | same | From the first-floor gallery over Area 1 | Gallery ring, balustrades, reading tables at the voids, twin stairs from above | `SCR/pano/vt-1st-floor-equirect.jpg` |
| 11 | Tour panoramas "Library - Hall 4 (2)", "Library - Reading Hall No 5", "Library - Hall 1 Reference Section (2)" | same | Reading halls | Finishes, furniture, lighting, Hall 4 helical stair, Hall 1 grid ceiling | `SCR/pano/vt-hall4-equirect.jpg`, `SCR/pano/vt-hall5-equirect.jpg`, `SCR/pano/vt-hall1-ref-equirect.jpg` |
| 12 | Tour panoramas "Library - Gallery 1 (2)/2 (2)/3" | same | Birla Heritage Gallery | Gallery fit-out and its stair | `SCR/pano/vt-gallery1/2/3-equirect.jpg`, `SCR/pano/galleries-sheet.jpg` |
| 13 | Tour panorama "Drone Day View" (panorama_BB0577EA…), level-0 front-face tiles | same | Aerial from the south | Two storeys, pink/red walls, roof PV and skylight lanterns, Library behind FD-I | `SCR/pano/drone-day-L0-mid.jpg`, `SCR/pano/drone-day-library-zoom.jpg` |
| 14 | The game today (`?explore`, explorer place "BITS Library") | http://localhost:8080/?explore | Aerial, 4 orbit views, room interior | See H | `SCR/game-library-aerial.png`, `game-library-sw.png`, `game-library-west-entrance.png`, `game-library-north.png`, `game-library-east.png`, `game-library-room-inside.png`, `game-sheet.jpg` |
| 15 | Repo code | `data/bits-campus.js`, `js/world/bits-world.js` (ROOM_HOSTS, placeRooms, facade `library`), `js/world/campus.js` (`interiorLibrary`, room def) | Footprint, facade, room | Current state | — |

## H. Comparison with the game today

**What matches:**

- The footprint outline (cross plan with convex ends) is correct [verified against the official plan].
- The red facade colour is in the right family.
- The `library` room already sits where the real Hall 4 is.

**What is wrong:**

1. **No entrance.** The real building has a ceremonial west portal: a giant brick arch with "BITS LIBRARY", a recessed portico, coloured glazed doors, fan steps and ramps. The game has a blank wall there. The only opening is the small south door of the gameplay room.
2. **Height and storeys.** The game is 6.6 m and reads as one tall storey. The real building is about 10–11 m over 2 storeys, with a **pale pink upper plaster band**, porthole windows and a stepped, crenellated parapet. The game's uniform red brick with cream bands misses this two-tone split.
3. **Massing.** The game is a single extrusion. The real building has stepped, cascading wing walls and convex bays. The roof also needs PV arrays, skylight lanterns, the rotunda drum and the white pyramid canopy over the entrance.
4. **Interior.** The game has a 12 × 10 m school room with a wooden floor and 4 shelves. The real interior is a marble palace-style sequence (foyer → twin stairs → rotunda) with Kota-stone reading halls, teak tables and tube battens.
5. **Ground.** The game has bare sand round the building. It should have a paved forecourt (grey octagon and red pavers), planters, bicycle rows, lamp posts and hedges on the west and south.
6. **Windows.** The game has thin slot windows. The real building has white-framed rectangular windows on both storeys, plus porthole oculi.

**Ranked fixes (most visible first):**

1. Build the **west entrance portal**: brick arch (about 8 m) with lettering, portico, fan steps, ramps, forecourt paving and bicycles.
2. Raise to **2 storeys, about 10.5 m**, with a red sandstone ground storey and a pink upper band, a stepped parapet, porthole windows and white-framed windows.
3. Add the **roof features**: rotunda drum and oculus, skylight lanterns, PV rows, entrance canopy.
4. Make the **foyer, twin stairs and rotunda** walkable (the signature spaces).
5. Restyle the gameplay room as **Hall 4** and connect it to the rotunda; keep the south door.
6. Add the forecourt landscaping and lamp posts on the west and south.
7. First-floor gallery ring and Hall 5. Signs: "HALL NO. 1–5" and the floor guide.

## I. Uncertainties and hand-offs

**Uncertainties:**

- The exact size and position of each hall inside the footprint are [approximation]. Only the topology and directions (C2) are verified.
- The north lobe's use (WILP office? admin?) is [unknown]. OSM puts a "WILP Division" POI there. The Toastmasters POI at (200, -197) is probably a meeting-room booking, not a separate building [unknown].
- Floor-to-floor heights: there was no direct measurement. 5.0 m and 4.5 m are [visual estimate].
- Number of columns in the rotunda: about 24, in pairs [visual estimate]. Ring diameter about 16 m [visual estimate]. The 7 m dome figure is verified.
- Whether there is a south or service door, and where the fire stairs are, is [unknown].
- The tour hotspot yaws on the exterior panorama do not all agree with OSM positions. Only relative directions inside panoramas, checked against visible doors, were used.

**Sources not accessed:**

- library.bits-pilani.ac.in/about/library_overview: the WebFetch certificate failed and the page was not retried.
- YouTube XkDvacBC7zA: the player errored after 0:00. The frames captured at the 2:56–3:03 seek points were frozen on an outdoor non-library frame and were deleted. The fd2-fd3 report says 3:03–3:12 shows the library foyer twin stairs, which matches source 6.
- YouTube bkmKuEguTH8: not attempted.
- Wikipedia and Wikimedia Commons: not searched.
- Google Maps/Earth: not attempted.
- Search-result snippets mention the architect (Sanjay Moondra) and the May 2004 opening, but those pages were not opened.

**Hand-offs:**

- **`roads-paths`:** the library forecourt pavers (grey octagons and red squares) and the service road between the Library and FD-I. The west forecourt connects to the road toward New BITS Workshop.
- **`landscape-water`:** the hedges, trees and planters around the forecourt.
- **`fd1`:** FD-I is visible on the right of the library entrance panorama (cream, horizontal window bands). This agrees with Library-north-of-FD-I.
- **`workshops-halls` / orchestrator:** the Lecture Theatre Complex, east of the Library, is not in OSM (see the fd1 report). The tour links "Library" ↔ "Lecture Theatre Complex", "Central Workshop" and "RK Innovation Centre".
- **Orchestrator:** the explorer's dedupe hides the "BITS Library" *building* entry behind the *room* entry of the same name, so `select()` flies to the room (focus (210.2, -197.0), size 12) and not to the building.
