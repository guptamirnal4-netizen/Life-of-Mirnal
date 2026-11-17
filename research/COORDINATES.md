# Campus coordinates and building rules

Every building agent works in this one system. Do not pick your own origin, scale or axes.

## The system

- **Units:** metres, 1 three.js unit = 1 m. The campus is real scale (about 1.4 × 2 km).
- **Origin:** the Rotunda, at 28.363483 N, 75.587039 E (`BITS_CAMPUS.origin` in `data/bits-campus.js`).
- **Axes:**
  - `x` is metres **east**.
  - `z` is metres **south**, so north is `-z`.
  - `y` is up, and ground level is `y = 0`.
- **Converting from lat/lon:**
  - `x = (lon - 75.587039) * 111320 * cos(28.363483°)`
  - `z = -(lat - 28.363483) * 110574`
- **Source data:** `data/bits-campus.js` holds `BITS_CAMPUS`. It comes from OpenStreetMap (ODbL), with footprints traced from aerial imagery. It contains:
  - `buildings`: `{name, kind, h, outer:[[x,z]...], holes, inCampus}`
  - `roads`: `{kind, w, name, pts}`
  - `areas`: `{kind, name, poly}`
  - `pois`: `{name, x, z}`
  - `boundary`

  The footprint polygon is the ground truth for where a building sits and its outline. If research shows the OSM outline is wrong, say so in your report with evidence. Don't move it silently.
- **Floor height:**
  - Hostels use `FH = 3.3` m (`js/world/hostel.js`).
  - Academic buildings in the data use `h` = 6.6 to 16 m.
  - Pick floor heights from research and document them.

## How the world is built today (`js/world/bits-world.js`, class `BitsCampus`)

`build()` runs these steps in order:

1. ground, areas, roads
2. `placeRooms()`
3. the walk-in hostels (`Hostel`, `CombHostel`)
4. `buildBuildings()`
5. NAB passages
6. Rotunda, Clock Tower, Saraswati Temple, Shiv Ganga, Gymkhana, ANC
7. hostel gate, Main Gate
8. statues, lamp posts, nav grid, trees, labels
9. `flushGeometry()`

What each step does:

- **`buildBuildings()`** extrudes every footprint to its height `h`. It applies a facade material by kind; the heritage, NAB, hostel and library facades are canvas textures. Roofs are solar, green or plain. It cuts door corridors where a gameplay room sits inside.
- **`placeRooms()`** fits the gameplay rooms (axis-aligned boxes) inside their host buildings (`ROOM_HOSTS`):

  | Room | Host building |
  | --- | --- |
  | Lecture Theatre (`classroom`) | New Academic Block |
  | Tutorial Room (`classroomB`) | NAB |
  | labs (`sciencelab`) | FD-II |
  | `library` | BITS Library |
  | `staffroom` | FD-I |
  | Director's Office (`principal`) | Main Building East Wing |
  | AUGSD (`reception`) | Main Building West Wing |
  | Computer Lab (`complab`) | Main Building West Wing |
  | `auditorium` | SAC |
  | `mess` | VKB mess |

  **Lessons, exams and missions run inside these rooms, so they must keep working.** Their ids, `roomAt`, `pathTo`, `objectivePoint` and `exit` are used by gameplay and tests.
- **Walk-in hostels:**
  - `Hostel` (`hostel.js`) covers Krishna, Gandhi, Budh, Ram, Shankar, Vyas and Vishwakarma. Each has a ground floor, a first floor and a roof, with corridors, rooms, wash rooms, a common room, courtyards and real stairs (`space_stair`). The stairs were fixed in commit 167aa0f.
  - `CombHostel` (`comb-hostel.js`) covers Ashok, Rana Pratap and Malviya. Bhagirath is a girls' hostel and stays closed.
- **Collision:**
  - Axis-aligned boxes go in `campus.colliders` (`{minX,maxX,minZ,maxZ,minY,maxY,walkable}`).
  - `js/world/player.js` resolves them. It skips boxes with `minY > y + 1.7`. A box counts as floor if `y >= maxY - 0.7`, and the step-up limit is about 0.7.
  - Stairs are runs of walkable boxes, `RISE = FH/16` and `TREAD = 0.27`.
- **Performance:**
  - Geometry is merged per material bucket (`addShape`, `bucket`, `flushGeometry`) in 150 m chunks.
  - Interiors are hidden unless the player is within about 15 m (`update(dt, focus)`).
  - Face and trim detail on people only shows within 16 m.
  - The target is about 5 ms a frame on a MacBook Air.
- **Seeing a building without playing:**
  - `http://localhost:8080/?explore` opens the 3D map explorer. The dev server is `npm start`, port 8080.
  - In Playwright, `window.__game.explorer` has `select(place)` and `walk()`, and `window.__game.campus` is the `BitsCampus`.
  - Existing Playwright helpers are in the session scratchpad's `pw/` folder, for example `explore.mjs`.

## Rules for every agent

- Use only the coordinates above. A building's world position comes from its OSM footprint.
- **References:**
  - Downloaded photos, video frames and panoramas go in the session scratchpad (`scratchpad/research/<building-id>/`), never in the repo. They are copyrighted and for reference only.
  - Research reports go in `research/buildings/<building-id>.md` and cite sources by URL and timestamp.
- **Evidence:** describe only what you actually saw, and mark everything else as estimated or unknown.
- **Access:** don't work around consent walls, logins or bot checks. If a source won't load, record that it wasn't accessed.
- **Assets:** never copy Google Earth or Maps 3D models or imagery into the game. Build original geometry.
- **Secrets:** API keys never go in client code.
