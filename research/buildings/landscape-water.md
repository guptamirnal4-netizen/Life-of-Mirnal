# Landscape and water: lawns, gardens, trees, Shiv Ganga

Agent: `landscape-water`. Research only; no game code was changed.
Coordinates are in the shared system of `research/COORDINATES.md` (metres, origin at the Rotunda, x east, z south).
All captures are in the session scratchpad `research/landscape-water/` (abbreviated `LW/` below). They are copyrighted reference material and are not in the repo.

Tags: [verified] = seen directly in a source or read from the data file; [visual estimate] = measured or judged from imagery; [approximation] = a proposal for the game; [unknown] = no evidence found.

---

## Summary of the main findings

1. **Shiv Ganga is larger than the game's canal.** [visual estimate] On the Esri aerial with the 10 m game grid (`LW/esri/shivganga.jpg`), the water ring runs from about x 64 to x 192 and from z 760 to z 883. That puts its centre near (128, 823), the water's outer edge at a radius of about 64 m and the inner edge at about 54 m. The OSM `shivganga` polygon (x 74–183, z 768–876, about 109 × 108 m) therefore traces the **inner bank, which is the island's edge**, and not the outer edge of the water. A centreline diameter of about 117 m gives a circumference of about 368 m, which is close to the official figure of a 400-yard (366 m) canal that is 40 ft (12.2 m) wide [verified, from the tour info panel and bet.org.in]. In the game the water sits at 0.78R to 0.97R with R = 54, which is a radius of 42 to 52 m. **The canal should move outward to a radius of about 54 to 66 m.**
2. **The island's centre holds a single-storey "Victorian cottage" (a guest house) with a green roof**, not a block with several storeys. bet.org.in says "a victorian cottage in the centre with rooms for the guests" [verified], and the GWU alumni page mentions a "guesthouse" behind locked bridge gates [verified]. The tour drone shows a white house with a green-teal pitched roof [verified, visual]. Its OSM footprint is x 108–133, z 809–835 with h = 7 [verified, data]. The game extrudes it as a generic white block with two rows of windows.
3. **The seated white Shiva statue stands on an octagonal stepped platform on the island's EAST side.** This platform is OSM building x 158–175, z 813–825 [verified, data; visual estimate that it is the octagonal platform on the aerial]. The game extrudes that footprint as a 7 m building and places its own statue near the island centre.
4. **The campus is under a dense, nearly continuous tree canopy.** Every aerial and drone source shows this [verified, visual]. The game has 11,519 sparse trees on bare tan sand. M Lawns, S Lawns and the ground around Shiv Ganga and the temple all render as **brown sand**, while the aerials show green lawns under heavy tree cover.
5. **The game has no green area for M Lawns or S Lawns.** OSM has only POIs for them [verified, data]. The aerial shows a lawn at each spot, and their outlines are approximated below.
6. **South Park is an open, dusty ground with a large furrowed cultivated plot** (x about 45–110, z 400–560), ringed by trees [visual estimate, Esri plus the Saraswati and Drone Day panoramas]. The game's plain sand is roughly right but has no furrowed plot and no ring of trees.

---

## Block 1: Shiv Ganga

### A. Identification
- **Name and use:** Shiv Ganga, an ornamental circular canal around an island garden with a guest cottage and a seated Shiva statue [verified: bet.org.in, tour panorama "Shiv Ganga"]. The Birla Education Trust page also describes "sprawling lush green lawns frequented by visitors and students in the evenings" [verified].
- **OSM:**
  - `areas` kind `shivganga`, a 16-point polygon at x 74–183, z 768–876 [verified, data].
  - 26 small `grass` polygons inside it, which are the radial garden beds [verified, data].
  - 3 unnamed buildings [verified, data]:
    - x 108–133, z 809–835, h 7: the cottage.
    - x 158–175, z 813–825, h 7: the statue platform [visual estimate].
    - x 75–81, z 816–836, h 5.5: on the west bank, purpose [unknown].
  - The POI "Shiv Ganga" sits at (164, 819), on the statue platform.
- **Neighbours:** Saraswati Temple lies to the north, about 170 m away (temple POI at (102, 655)). Akshay Supermarket is to the NE at (302, 690), and C'not / Connaught Place is to the east at about (426, 777) [verified: tour hotspot labels "Saraswati Temple" and "Akshay Supermarket" appear in those directions]. GWU's page has a photo captioned "From Connaught" [verified].
- **Orientation:** The ring is circular, so it has no front. The main axial approach (see B) leaves the ring towards the SE [visual estimate].

### B. Exterior and landscape
- **Canal** [verified from tour and aerial unless tagged otherwise]:
  - Size: 40 ft (12.2 m) wide and 6 ft (1.83 m) deep, 9 ft (2.74 m) at the diving board [verified, tour info text].
  - Water colour: olive-ochre or murky brown in the tour, which was taken in spring. It looks dark green from the air.
  - Edges: both have white-plastered kerbs or walls about 0.3–0.5 m above the water [visual estimate].
- **Banks:**
  - Inner bank (island side): a continuous **white ornamental balustrade** about 0.9 m tall with pierced panels, set on a white parapet [verified, tour `strip-shivganga` f/l].
  - Outer bank: a plain white kerb, with **no balustrade** in the captured views [visual estimate].
  - Outer walk: about 6–8 m wide and made of **red-brown earth (murram), not brick**. Dense trees and shrub beds stand on its outer side, including bougainvillea and a low stone-edged bed [verified, tour d/r faces].
- **Bridges:**
  - Design: white balustraded footbridges with a slight arch, about 3 m wide and long enough to span the 12 m canal, with square white newel posts [verified, tour f/l].
  - Count: the aerial suggests crossings concentrated on the E/NE/SE side. At least three are visible in the tour [visual estimate]. The exact count and positions are [unknown], and the west side is hidden under canopy.
  - Gates: GWU (2010s) reports **folding iron shutters across each gate**, locked in the evening [verified, text].
- **Axial approach and diving board:**
  - A straight paved walk, white-kerbed with a light central strip and flanked by red-earth verges, runs away from the ring to the SE [verified, tour b-face; direction visual estimate].
  - Lamp posts with white globes stand at intervals along it [verified].
  - It meets the canal at a landing with two white finial posts, which is probably the "diving board" spot with the 9 ft depth [visual estimate].
- **Chhatris:** two small white domed chhatris/kiosks stand together at one bridgehead on the island side [verified, tour f/l]. The game's four outer-bank chhatris at the diagonals are an [approximation] with no source.
- **Island garden** [verified, tour f face; layout visual estimate from aerial]:
  - Formal wedge-shaped lawns divided by light paths with white kerbs and red-earth paths.
  - Ornamental conifers (thuja or cypress), small palms in pots and beds, clipped shrubs and flower borders.
  - From the air: a central circular plaza of red earth (radius about 25 m) around the cottage, radial paths to the E, NE and SE bridges, and a pair of long parallel N–S lines north and south of the cottage, which are hedges or narrow rills [unknown which].
  - Ground in the dry-season aerial: mostly red earth with scattered small trees. The tour shows green lawns, so the colour is seasonal.
- **Statue platform:** a white octagonal platform with several steps. In the tour it rises in tiers with a seated white statue on top, and a wide white stair runs down to a canal landing [verified, tour f]. Its footprint is about 17 × 12 m [verified, data]. Height of the top tier: about 3–4 m [visual estimate].
- **Cottage:** a single storey with white walls and a green or teal pitched roof (the aerial shows a pale blue-green roof) [verified visual]. Footprint about 25 × 26 m [verified, data]. Ridge height about 6–7 m [visual estimate].
- **Surroundings:** a dense ring of tall broadleaf trees all round the outer walk, with canopies of 10–15 m [visual estimate].

### C. Plan (ASCII, approximate, north up)
```
                 trees / red-earth ring walk (r≈64–72)
            .-~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~-.   water r≈54–64
          /  ~~~~ canal 12 m ~~~~   ==bridge NE  \
         |  :  island lawns, radial beds  :      |
  west   |  :    .--------.               :  ==bridge E
  bldg   |  :    | cottage |  ---> path ---[octagon+Shiva]
  (75–81)|  :    '--------'   (plaza r≈25)  :    |
         |  :                              :  ==bridge SE
          \  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~    /
            '-~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~-'
                                \  axial walk with lamps to SE, landing ("diving board")
centre ≈ (128, 823); inner bank = OSM polygon (r≈54); outer water edge r≈64
```
The bridge positions are an [approximation].

### D. Staircases
- Wide white steps run from the statue platform down to a canal landing [verified, tour f].
- OSM has three `steps` ways in this area [verified, data].
- Other stairs: [unknown].

### E. Interior
The cottage interior was not seen [unknown]. It is a guest house, so it should stay closed in the game [approximation].

### F. Gameplay
- **Entry:** the player crosses the bridges only, as the game already does. The bridges should land at the real E, NE and SE positions, plus one west bridge if needed for access [approximation].
- **Collision:**
  - Canal ring: r 54–66 around (128, 823) [approximation].
  - Cottage: solid.
  - Statue platform: a stepped walkable platform, either three 0.6 m tiers or 0.15 m steps on the stair side.
  - Bridge gates are not needed.
- **NPCs:** NPCs should walk the outer ring walk at r about 66–72 and the island paths. Evening "visitors and students" use the lawns [verified, bet.org.in].
- **Interactables:** a bench or plaque at the statue [approximation; no bench observed]. There are no gameplay rooms here.

---

## Block 2: Campus tree cover and species

- **Coverage:** the Drone Day View (`main-building/tour-drone-day.jpg`), the Saraswati drone pano (`LW/strip-saraswati.jpg`) and all the Esri tiles show **near-continuous canopy** between buildings. Roads run as tunnels of trees [verified, visual]. Open ground is limited to sports fields, South Park, cultivated plots and named lawns.
- **Road avenues:** large spreading trees with feathery, pinnate leaves stand on both sides of every road. Their trunks are 0.4–0.6 m thick, they are 12–18 m tall, and they are planted about 6–10 m apart [visual estimate, Gandhi and Patel statue panos]. This is **consistent with neem** (Azadirachta indica); siris or babool cannot be ruled out [visual estimate; no species list found].
- **Trunk paint:** the base of each roadside trunk is painted with **a red band and a white band**, about 1 m high [verified, `LW/strip-gandhistatue.jpg`, `LW/strip-patelstatue.jpg`].
- **Ashoka trees** (Polyalthia longifolia, tall and columnar, 8–12 m): rows of them stand at VFAST Lawns, Eco Park and along the Saraswati Temple axis [verified visual; species identification visual estimate].
- **Gulmohar** (Delonix regia), with flame-red flowers: seen at Eco Park [visual estimate].
- **Bougainvillea:** magenta clumps at Shiv Ganga's outer walk, Eco Park, VFAST and the temple slope [verified visual].
- **Palms:**
  - Tall single-trunk palms with feather fronds (8–12 m) line the paved approach to Saraswati Temple near the G.D. Birla Statue [verified, `LW/strip-gdstatue.jpg`].
  - Medium palms stand at the ends of the Rotunda's stepped lawns [verified, `main-building/tour-rotunda.jpg`].
  - Species: [unknown].
- **Conifers:** thuja or cypress grow in the Shiv Ganga island garden [verified visual].
- **Peepal and eucalyptus:** not positively identified in any capture [unknown].
- **Dry scrub:** the southern (temple side) and outer areas have khejri- or babool-like scrub with sparse ground [visual estimate].

## Block 3: M Lawns
- **OSM:** only a POI at (102.5, 2.6). There is no area polygon [verified, data].
- **Aerial** (`LW/esri/mlawns.jpg`): an irregular open grass lawn at about x 65–130, z −25 to 18, between the Main Building East Wing (to the north) and Krishna Bhawan (to the south). Heavy trees stand on the east and south edges and a few large trees within it [visual estimate].
- **Game:** sand-coloured ground with road avenues and no grass [verified, `LW/game-m-lawns.png`].
- Hand-off note: the `main-building` agent owns M and S Lawns by name, according to the index. These lawn notes are for its use.

## Block 4: S Lawns
- **OSM:** a POI at (−110.9, 36.7); no polygon [verified, data]. The nearby grass polygon x −173 to −152, z 20 to 72 lies to the west [verified, data].
- **Aerial** (`LW/esri/slawns.jpg`): an open lawn at about x −140 to −95, z 10 to 50, south of the Main Building West Wing. A small light structure stands near (−112, 30) [unknown what], and dense trees surround the lawn [visual estimate].
- **Game:** sand ground [verified, `LW/game-s-lawns.png`].

## Block 5: South Park
- **OSM:** a POI at (58.1, 491.1); no polygon [verified, data].
- **Aerial** (`LW/esri/southpark.jpg`) [visual estimate]:
  - North part, x 45–110, z 400–470: bare compacted earth with a few trees, used as an open ground.
  - South part, x 45–110, z 470–560: a **furrowed cultivated plot** of nursery or vegetable beds.
  - East edge: a strip of dense trees.
  - The **G.D. Birla Statue** chhatri and its lawn lie just south, at about (91, 573).
- The Saraswati drone pano and the Drone Day View both show this patchwork of plots [verified visual].
- **Game:** a uniform sand patch with no plot texture and no trees [verified, `LW/game-south-park.png`].

## Block 6: Saraswati Temple gardens and the G.D. Birla Statue lawn
- **South of the temple:** a formal rectangular lawn split by a **red paved axial walk with white square inlays**. A low green-and-yellow ornamental iron fence runs on both sides, Ashoka trees and feather palms line the walk, and lamp posts stand at the gate [verified, `LW/strip-gdstatue.jpg`, `LW/strip-saraswati.jpg`].
- **Sidewalks:** grey interlocking pavers [verified].
- **G.D. Birla Statue:** a standing figure under a white chhatri canopy on a plinth. It sits in a fenced lawn across the road from the temple axis [verified].
- **Game:** green rectangles and a few palms on sand (`LW/game-saraswati-temple.png`). The temple itself belongs to `gates-landmarks`.

## Block 7: Statue roundabouts (Gandhi, Patel)
- **Layout:** each statue stands on a stone plinth in the middle of a **circular grass island** with a white-tiled base, at a road junction. Kerbs are painted black and white [verified, Gandhi and Patel statue panos].
- **Nearby features:** a small thatched or conical-roofed hut or kiosk stands near both junctions [verified visual]. A red relief mural wall faces the Gandhi junction [verified visual].
- The statues belong to `gates-landmarks`; the grass island is landscape.

## Block 8: Eco Park and VFAST Lawns (named in the tour)
- **ECO Park:** a garden of curving pink-stone paved paths, lawns, Ashoka rows, gulmohar, bougainvillea and a greenhouse [verified, `LW/strip-ecopark.jpg`]. The Saraswati Temple shikhara is visible on the horizon. **Location in game coordinates: [unknown].** It is not in OSM.
- **VFAST Lawns:** a large, closely mown lawn enclosed on several sides by single-storey cream buildings with a maroon band. Ashoka trees, large broadleaf trees and shrub borders stand at its edge [verified, `LW/strip-vfastlawns.jpg`]. VFAST POI: (468, 324).

## Block 9: Rotunda stepped lawns (hand-off)
- The Rotunda plaza is flanked by **curved, stepped grass terraces** (an amphitheatre) with palms at their ends. Its paving is a pink, grey and beige stone star pattern [verified, `main-building/tour-rotunda.jpg`]. These belong to `main-building`.

## Benches
- No benches were clearly identified in any capture [unknown].

---

## G. Sources

| Source | URL | What it shows | Confirms | Local capture |
|---|---|---|---|---|
| BITS 360° tour, pano "Shiv Ganga" (D777C841…) | https://www.bits-pilani.ac.in/Pilani-Campus-Virtual-tour/index.htm | Drone view over the SE bank, cube faces f/r/b/l/d plus info text | Canal size and depth text, balustrades, bridges, island garden, statue platform, cottage, ring walk, axial walk | `LW/strip-shivganga.jpg`, `LW/down-shivganga.jpg`, `LW/tour-shivganga-y0.jpg`, `LW/tour-shivganga-yaw90.jpg` |
| Tour pano "ECO Park" (D274114F…) | same | Drone view | Eco Park planting, paths | `LW/strip-ecopark.jpg` |
| Tour pano "VFAST Lawns" (32C242DE…) | same | Ground view | Lawn, Ashoka rows | `LW/strip-vfastlawns.jpg` |
| Tour pano "G.D. Birla Statue" (BD636E34…) | same | Ground view | Temple axis walk, palms, fence, statue chhatri | `LW/strip-gdstatue.jpg` |
| Tour pano "Saraswati Temple" (D7119CAF…) | same | Drone view from the temple | Temple gardens, South Park plots | `LW/strip-saraswati.jpg` |
| Tour panos "Gandhi Statue", "Patel Statue" | same | Drone views at junctions | Grass islands, painted trunks, avenue trees | `LW/strip-gandhistatue.jpg`, `LW/strip-patelstatue.jpg` |
| Tour panos "Rotunda", "Drone Day View" (captured by the `main-building` agent) | same | Plaza, campus overview | Stepped lawns, canopy density | `research/main-building/tour-rotunda.jpg`, `tour-drone-day.jpg` |
| Birla Education Trust, Shiv Ganga | https://bet.org.in/instutions/shiv-ganga-pilani/ | Text | 400 yd canal, 40 ft wide, 6/9 ft deep, seated Shiva, Victorian cottage with guest rooms, lawns | none (text) |
| GWU "Bees Saal Baad: Shiv Ganga" | https://www2.seas.gwu.edu/~simhaweb/misc/pilani/shivganga.html | Text (images not downloaded) | Iron shutters on the bridge gates, guesthouse | none |
| Esri World Imagery tiles, z18/z17 | https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer | Aerial with a 10 m game grid overlaid | Ring dimensions, lawn and plot outlines | `LW/esri/shivganga.jpg`, `southpark.jpg`, `mlawns.jpg`, `slawns.jpg`, `rotunda-nab.jpg` |
| `data/bits-campus.js` (OSM) | repo | Polygons and POIs | Footprints quoted above | none |
| Game, explorer captures | http://localhost:8080/?explore | Map and walk views | Current state | `LW/game-shiv-ganga.png`, `game-walk-shivganga-*.png`, `game-south-park.png`, `game-m-lawns.png`, `game-s-lawns.png`, `game-rotunda.png`, `game-saraswati-temple.png`, `game-g-d-birla-statu.png`, `game-walk-nab-lawn.png`, `game-walk-south-park.png`, `game-walk-m-lawns.png` |

`LW/` = `/private/tmp/claude-501/-Users-mirnal-Documents-Whisperflow/58e9866d-f336-43fa-bce9-096a63ba2c16/scratchpad/research/landscape-water/`

**Not accessed:**
- YouTube campus tours. There was no time this pass, and no frames were inspected.
- Google Maps and Google Earth. Not tried.
- Wikimedia Commons. Not searched.
- A tree species list for the Pilani campus. A web search found none (results covered the Goa and Hyderabad campuses only).

---

## H. Comparison with the game today

**What matches:**
- A ring canal with an island, white balustrades, white bridges, a white seated statue on a stepped platform and chhatris.
- The island's radial grass beds, which come from OSM.
- Palms at the Rotunda and the temple.
- Road avenue trees.
- Black and white kerbs.

**What is wrong:**
1. **The Shiv Ganga canal radius is too small.** The game's water spans 42–52 m from the centre; the real canal spans about 54–66 m, just outside the OSM polygon. The canal should be about 12 m wide, not about 10 m.
2. **The island cottage** (x 108–133, z 809–835) renders as a white block with several storeys. It should be a single-storey white cottage with a green pitched roof.
3. **The statue platform footprint** (x 158–175, z 813–825) renders as a 7 m building, while the game places a second statue elsewhere. The statue should go on this octagonal footprint, rendered as a tiered white platform.
4. **The ground is bare tan sand almost everywhere.** M Lawns, S Lawns and the Shiv Ganga and temple surroundings should be lawns or dense tree canopy over darker earth.
5. **The tree density is far too low around Shiv Ganga, the temple, South Park and the Main Building lawns.** The real campus is close to a closed canopy.
6. **The outer bank has a balustrade in the game,** but the evidence shows one only on the inner bank. The outer ring walk should be red earth (murram), not brick.
7. **Bridges sit at N/E/S/W in the game,** while the evidence suggests E, NE and SE positions. The SE axial walk with lamps and the canal landing are missing.
8. **South Park has no furrowed plot and no ring of trees.**
9. **The species palette is missing:**
   - columnar Ashoka rows
   - red-and-white painted trunk bases
   - gulmohar and bougainvillea colour
   - conifers in the Shiv Ganga garden

**Ranked fixes (most visible first):**
1. Add grass polygons for M Lawns (about x 65–130, z −25 to 18) and S Lawns (about x −140 to −95, z 10 to 50). Make the general ground darker and greener under dense canopy, especially around the Main Building, the temple and Shiv Ganga.
2. Move the Shiv Ganga water to r 54–66 around (128, 823). Keep the inner balustrade, drop the outer one, add a red-earth outer walk of about 7 m and dense trees beyond it.
3. Replace the extrusion of the cottage footprint with a single-storey cottage with a green pitched roof. Replace the extrusion of the east footprint with a tiered octagonal statue platform, and put the statue there.
4. Raise tree density in the scatter (or add canopy clusters) inside the campus boundary. Add Ashoka rows along the temple axis and at VFAST Lawns. Paint the bases of avenue trunks red and white.
5. Add a furrowed-plot texture to South Park's south half (x 45–110, z 470–560) and trees on its east edge.
6. Move the bridges to the observed E, NE and SE positions. Add the SE axial walk with lamp posts and the landing.

## I. Uncertainties and hand-offs
**Uncertain:**
- The exact number and positions of the Shiv Ganga bridges. The west side is hidden under canopy.
- What the west-bank building at x 75–81 is.
- What the N–S parallel lines on the island are.
- Tree species: no authoritative list exists, so all species are visual identifications.
- The Esri georeferencing error. It is probably a few metres, because the OSM cottage aligns with the aerial.
- Where Eco Park is.
- Benches.

**Hand-offs:**
- `main-building`: M Lawns and S Lawns outlines (above); the Rotunda's stepped grass terraces and palms.
- `nab`: the long green strip from the Rotunda south to z about 280. The grass polygon x −2 to 52 is a green roof or lawn with meandering paths; both NAB footprints overlap it. Check whether NAB is partly earth-sheltered.
- `gates-landmarks`: the Saraswati Temple axis (red walk, iron fence, palms), the G.D. Birla, Gandhi and Patel statues and their islands.
- `roads-paths`: the SE axial walk to Shiv Ganga, the red-earth ring walk, and the bridge and steps ways (three `steps` ways in OSM near Shiv Ganga).
- `workshops-halls`: the buildings enclosing VFAST Lawns.
- `sports`: none.
