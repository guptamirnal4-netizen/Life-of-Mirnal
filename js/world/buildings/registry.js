// The building registry: every detailed BITS building module, in build order. A module replaces the plain
// extruded block of each OSM footprint it lists in `osm` (see research/COORDINATES.md for the coordinates).
//
// Module shape:
//   id          matches research/buildings/<id>.md
//   name        official name
//   category    academic | library | hostel | mess | hall | sports | landmark | other
//   osm         names of the BITS_CAMPUS.buildings footprints it replaces
//   owns        optional: built-in landmarks it takes over ('clockTower', 'rotunda')
//   floors      floor count above ground (for the registry and the explorer)
//   enabled     false while the module is still a stub
//   research    'verified' | 'mixed' | 'approximate'
//   frame(bs)   optional: the Kit frame ({ O, eu, ev, angle }); defaults to fitFrame(first footprint)
//   build(kit, ctx)
//     kit  a Kit in the building's frame (kit.js)
//     ctx  { campus, buildings (the OSM footprints), rooms (gameplay rooms already placed inside), cuts (their
//            door openings through the facade), passages (NAB crossings), D (BITS_CAMPUS) }
//   The gameplay rooms in ctx.rooms are already built (walls, furniture, lessons): build around them, leave
//   openings at ctx.cuts and keep them reachable.
import library from './library.js';
import nab from './nab.js';
import mainBuilding from './main-building.js';
import sportsGrounds from './sports-grounds.js';

export const BUILDING_MODULES = [library, nab, mainBuilding, sportsGrounds];
