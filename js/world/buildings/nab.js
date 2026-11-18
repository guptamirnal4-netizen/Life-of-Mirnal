// New Academic Block (NAB): the earth-sheltered academic block by Hafeez Contractor (2014). Research:
// research/buildings/nab.md (section 0: the building is underground) and research/review.md 5.2.
//
// What stands where (local frame: u = metres across the blocks, east; v = metres along them, south, from the
// north ends; the two OSM footprints are the roof lawns):
//   y   0    roof lawns at campus grade with steel railings; four buff portal pavilions with cusped arches
//   y  -4.5  level -01 (rooms 61xx) everywhere, the north courtyard, the outer light-wells and notch courts
//   y  -9    level -02 (rooms 60xx) in the south half: the lower courtyard, the colonnades under the galleries
//            and the Mathematics rooms (6065-6067) and classrooms 6013-6017; the South side ramp climbs to grade
// Everything sunken sits in one pit (kit.pit) at -9; level -01 stands on walkable fill and slabs at -4.5.
// u: west light-well -14..-8 (slope) | west block 0..30 | courtyard 30..47.5 | east block 47.5..85 | east
// light-well 88..94. The north courtyard meets the Rotunda (main-building) at its 25 m rim at y -4.5.
import * as THREE from 'three';

const L = Math.hypot(0.150, 0.9887);
const EV = [0.150 / L, 0.9887 / L]; // along the blocks (8.8 degrees east of south)
const EU = [EV[1], -EV[0]]; // across them (east)

const Y1 = -4.5; // level -01
const Y2 = -9; // level -02
const C1 = -0.8; // underside of the roof slab
const ROOF = 0.08; // the roof lawn (walkable), a step above the campus grade
const CH = 3.6; // clear height of the rooms (false ceiling)
const TOEW = -8; const TOPW = -14; const TOEE = 88; const TOPE = 94; // light-well toes and embankment tops
const WV0 = 2; const WV1 = 241; // light-wells run between these v
const STAIR_TOP = 128; const STAIR_FOOT = 137; // the canopy stair between the courtyard levels
const RSTAIR = [36.18, 41.69]; // the stair up to the at-grade Rotunda when main-building is not active (u)
const RAMP_U0 = 32; const RAMP_U1 = 42.5; const RAMP_V1 = 300; // South side ramp

// materials (research B3)
const M = {
  buff: 't:plaster:#dcbf8c', buff2: 't:plaster:#e6cc9a', white: 't:plasterWhite:#f1eee6', col: 'c:#efe8d8',
  fascia: 'c:#f4f1ea', red: 'c:#c0302a', glass: 'g:#2c3640', steel: 'm:#8d9296', maroon: 'm:#8e2b25',
  kota: 't:concrete:#d2cdb8', ochre: 'c:#b98a4a', pave: 't:paving:#b3ada2', sand: 't:paving:#b4553a',
  grass: 't:grass:#9cc06a', lawn: 't:grass:#a9c97c', earth: 't:grass:#8fb35e', portal: 't:plaster:#e7c675',
  ptrim: 'c:#f5e7b8', wall: 't:plaster:#efe9dc', ceil: 'c:#ebe8e0', door: 't:wood:#d2a86a', ochreWall: 'c:#e8b84a',
  wood: 't:wood:#c8a06a', dark: 'c:#2a2d31', seat: 'c:#7f858c', stage: 't:wood:#8a5a32', panel: 't:wood:#c99a4a',
  curtain: 'c:#1f2a4a', screen: 'e:#f4f6f8', stone: 't:concrete:#cfc8bb', retain: 't:concrete:#d8cbb0',
};

// ---------- small geometry helpers ----------
function inPolyL(u, v, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ui, vi] = poly[i]; const [uj, vj] = poly[j];
    if ((vi > v) !== (vj > v) && u < ((uj - ui) * (v - vi)) / (vj - vi + 1e-12) + ui) c = !c;
  }
  return c;
}
// u where the line at v crosses the polygon, sorted
function crossU(poly, v) {
  const xs = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]; const b = poly[(i + 1) % poly.length];
    if ((a[1] > v) !== (b[1] > v)) xs.push(a[0] + ((v - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
  }
  return xs.sort((p, q) => p - q);
}
// a rectilinear polygon as rectangles between its vertex v values
function bands(poly) {
  const vs = [...new Set(poly.map((p) => +p[1].toFixed(2)))].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < vs.length - 1; i++) {
    if (vs[i + 1] - vs[i] < 0.05) continue;
    const xs = crossU(poly, (vs[i] + vs[i + 1]) / 2);
    for (let k = 0; k + 1 < xs.length; k += 2) out.push({ u0: xs[k], u1: xs[k + 1], v0: vs[i], v1: vs[i + 1] });
  }
  return out;
}
// quad with tiled UVs (metres / tile), corners in order
function quad(a, b, c, d, tile = 4) {
  const n = new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).cross(new THREE.Vector3(...d).sub(new THREE.Vector3(...a)));
  if (n.y < 0) [b, d] = [d, b]; // counter-clockwise seen from above, so the face points up
  const g = new THREE.BufferGeometry();
  const P = [a, b, c, a, c, d];
  const pos = new Float32Array(P.flat());
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const e1 = new THREE.Vector3(...b).sub(new THREE.Vector3(...a)); const e2 = new THREE.Vector3(...d).sub(new THREE.Vector3(...a));
  const uvs = P.map((p) => { const r = new THREE.Vector3(...p).sub(new THREE.Vector3(...a)); return [r.dot(e1.clone().normalize()) / tile, r.dot(e2.clone().normalize()) / tile]; });
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs.flat()), 2));
  g.computeVertexNormals();
  return g;
}
// cusped (multifoil) Rajput arch: opening outline, x centred, from y 0, springing at `spring`
function archPts(w, spring, lobes = 5) {
  const R = w / 2; const r0 = 0.86;
  const pts = [[-R * r0, 0]];
  for (let i = 0; i <= 50; i++) {
    const th = Math.PI - (i / 50) * Math.PI;
    const r = R * (r0 + (1 - r0) * Math.abs(Math.sin(lobes * th)));
    pts.push([r * Math.cos(th), spring + r * Math.sin(th) * 1.15]);
  }
  pts.push([R * r0, 0]);
  return pts;
}

export default {
  id: 'nab',
  name: 'New Academic Block',
  category: 'academic',
  osm: ['New Academic Block', 'NAB'],
  owns: ['nabPassages'],
  floors: 2,
  enabled: true,
  research: 'mixed',
  // Gameplay rooms moved underground: the Lecture Theatre into LT 6163 (west block, behind the canopy stair) and
  // the Tutorial Room into the 6120 wing (east block, off the Portal 04 corridor). Their doors face south (fixed
  // by the school rooms) and open into sunken courts at -4.5.
  rooms: {
    classroom: { host: 'New Academic Block', near: [-6, 150], y: Y1 },
    classroomB: { host: 'NAB', near: [57, 229], y: Y1 },
  },
  frame: () => ({ O: [-32.2, 37], ev: EV, eu: EU, angle: Math.atan2(EV[0], EV[1]) }),

  build(kit, ctx) {
    const { campus, D } = ctx;
    const loc = (p) => kit.local(p[0], p[1]);
    const WB = ctx.buildings[0].outer.map(loc);
    const EB = ctx.buildings[1].outer.map(loc);
    const Ew = (v) => { const x = crossU(WB, v); return x.length ? x[x.length - 1] : 30; }; // west block, courtyard face
    const Wf = (v) => { const x = crossU(WB, v); return x.length ? x[0] : 0; }; // west block, outer face
    const Ee = (v) => { const x = crossU(EB, v); return x.length ? x[0] : 47.5; };
    const Ef = (v) => { const x = crossU(EB, v); return x.length ? x[x.length - 1] : 76; };
    // the lower colonnade's back wall (level -02 rooms line) and the gallery above it, south half
    const Rw = (v) => Ew(v) - 3.5;
    const Re = (v) => (v < 201.3 ? Ee(v) + 3.5 : 53);
    const B = (u0, u1, v0, v1, y0, y1, key, o) => kit.box(u0, u1, v0, v1, y0, y1, key, o);
    const V = (u0, u1, v0, v1, y0, y1, key) => kit.box(u0, u1, v0, v1, y0, y1, key, { collide: false });
    const floorV = (u0, u1, v0, v1, y, key) => V(u0, u1, v0, v1, y - 0.03, y + 0.004, key);
    // Thin overlays (lawns on the ground, paths on lawns, floor inlays) get a polygon offset so they win the depth
    // test even from the 330 m campus-map camera, where a few centimetres are below the depth precision.
    const inlayFrame = (u0, u1, v0, v1, y, w = 0.12) => {
      if (u1 - u0 < 1 || v1 - v0 < 1) return;
      const k = po(M.ochre); const [a, b] = [y + 0.004, y + 0.01];
      V(u0, u1, v0, v0 + w, a, b, k); V(u0, u1, v1 - w, v1, a, b, k);
      V(u0, u0 + w, v0 + w, v1 - w, a, b, k); V(u1 - w, u1, v0 + w, v1 - w, a, b, k);
    };
    const po = (key) => {
      const k = `po:${key}`;
      if (!kit.customMats[k]) {
        const m = kit.material(key).clone();
        Object.assign(m, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 });
        kit.customMats[k] = m;
      }
      return k;
    };

    // gameplay rooms: keep their volume clear and give their door paths the right height
    const game = ctx.rooms.map((r) => {
      const c = [[r.x0, r.z0], [r.x1, r.z0], [r.x1, r.z1], [r.x0, r.z1]].map(loc);
      for (const p of [r.exit, r.outside, r.inside, r.center]) if (p) p.y = r.y0;
      return { r, u0: Math.min(...c.map((p) => p[0])), u1: Math.max(...c.map((p) => p[0])), v0: Math.min(...c.map((p) => p[1])), v1: Math.max(...c.map((p) => p[1])) };
    });
    const cuts = ctx.cuts.filter((c) => c.room).map((c) => {
      const p = [[c.minX, c.minZ], [c.maxX, c.minZ], [c.maxX, c.maxZ], [c.minX, c.maxZ]].map(loc);
      return { u0: Math.min(...p.map((q) => q[0])), u1: Math.max(...p.map((q) => q[0])), v0: Math.min(...p.map((q) => q[1])), v1: Math.max(...p.map((q) => q[1])) };
    });
    // The at-grade walk-through passages no longer match the sunken building (see owns); the portals, corridors
    // and courtyard below replace them, and navLinks give NPCs the same crossings.
    if (campus.passages) {
      const mine = new Set(campus.passages.filter((p) => this.osm.includes(p.host)));
      campus.passages.splice(0, campus.passages.length, ...campus.passages.filter((p) => !mine.has(p)));
      for (const b of ctx.buildings) { const list = campus.hostCuts.get(b); if (list) campus.hostCuts.set(b, list.filter((q) => !mine.has(q.passage))); }
    }

    // ---------- colliders for big walkable areas: thin pieces at the edges, big ones inside ----------
    const pushCol = (u0, u1, v0, v1, y0, y1, walkable) => {
      const ps = [kit.world(u0, v0), kit.world(u1, v0), kit.world(u1, v1), kit.world(u0, v1)];
      campus.colliders.push({ minX: Math.min(...ps.map((p) => p.x)), maxX: Math.max(...ps.map((p) => p.x)), minZ: Math.min(...ps.map((p) => p.z)), maxZ: Math.max(...ps.map((p) => p.z)), minY: y0, maxY: y1, walkable, enabled: true, building: kit.id });
    };
    const fill = (u0, u1, v0, v1, y0 = Y2, y1 = Y1, walkable = true) => {
      const E = 1.2; const S = 6;
      if (u1 - u0 < 2 * E + 1 || v1 - v0 < 2 * E + 1) { kit.col(u0, u1, v0, v1, y0, y1, walkable); return; }
      kit.col(u0, u1, v0, v0 + E, y0, y1, walkable); kit.col(u0, u1, v1 - E, v1, y0, y1, walkable);
      kit.col(u0, u0 + E, v0 + E, v1 - E, y0, y1, walkable); kit.col(u1 - E, u1, v0 + E, v1 - E, y0, y1, walkable);
      const nu = Math.ceil((u1 - u0 - 2 * E) / S); const nv = Math.ceil((v1 - v0 - 2 * E) / S);
      for (let i = 0; i < nu; i++) {
        for (let j = 0; j < nv; j++) {
          const a0 = u0 + E + ((u1 - u0 - 2 * E) * i) / nu; const a1 = u0 + E + ((u1 - u0 - 2 * E) * (i + 1)) / nu;
          const b0 = v0 + E + ((v1 - v0 - 2 * E) * j) / nv; const b1 = v0 + E + ((v1 - v0 - 2 * E) * (j + 1)) / nv;
          pushCol(a0, a1, b0, b1, y0, y1, walkable);
        }
      }
    };
    // rail along any local segment (arcs), with a tall invisible collider so you can't hop over
    const segRail = (p0, p1, y, key = M.steel) => {
      const du = p1[0] - p0[0]; const dv = p1[1] - p0[1]; const len = Math.hypot(du, dv); const a = Math.atan2(dv, du);
      for (const [yy, t] of [[y + 0.97, 0.05], [y + 0.5, 0.025]]) {
        const g = new THREE.BoxGeometry(len, t, t); g.rotateY(-a); g.translate((p0[0] + p1[0]) / 2, yy, (p0[1] + p1[1]) / 2); kit.mesh(g, key);
      }
      kit.cyl(p0[0], p0[1], y, 0.025, 1.0, key, { seg: 6 });
      for (let s = 0; s <= len; s += 0.45) { const u = p0[0] + (du * s) / len; const v = p0[1] + (dv * s) / len; kit.col(u - 0.12, u + 0.12, v - 0.12, v + 0.12, y, y + 2.2); }
    };
    const rail = (u0, v0, u1, v1, y, key = M.steel) => {
      kit.rail(u0, v0, u1, v1, y, key);
      if (Math.abs(u1 - u0) >= Math.abs(v1 - v0)) kit.col(Math.min(u0, u1), Math.max(u0, u1), v0 - 0.08, v0 + 0.08, y, y + 2.2);
      else kit.col(u0 - 0.08, u0 + 0.08, Math.min(v0, v1), Math.max(v0, v1), y, y + 2.2);
    };

    // ---------- clear the plain-campus layers this building replaces ----------
    // The ground at grade does not exist over the sunken parts: drop the OSM lawns and footways (Snake Path,
    // courtyard cross-paths, the four portal steps) that lie over them; they are rebuilt below at their level.
    // (Engine hand-off: buildAreas/buildRoads should clip to pits instead.)
    const pitPoly = [];
    {
      const mainActive = (campus.activeModules || []).some((m) => m.id === 'main-building');
      const RR = mainActive ? 25 : 26.4; // the Rotunda rim (the old at-grade Rotunda's ring reaches 26.4)
      const gon = [];
      for (let k = 0; k < 120; k++) { const a = (k * 3 * Math.PI) / 180; gon.push(kit.local(RR * Math.sin(a), RR * Math.cos(a))); }
      const hit = (U) => { // the rim where the line u = U meets it, nearest the courtyard
        let best = null;
        for (let k = 0; k < gon.length; k++) {
          const a = gon[k]; const b = gon[(k + 1) % gon.length];
          if ((a[0] > U) === (b[0] > U)) continue;
          const v = a[1] + ((U - a[0]) * (b[1] - a[1])) / (b[0] - a[0]);
          if (best === null || v > best) best = v;
        }
        return best;
      };
      const ua = 30; const ub = 47.5;
      const va = hit(ua); const vb = hit(ub);
      const arc = gon.filter(([u, v]) => u > ua && u < ub && v > -30).sort((p, q) => p[0] - q[0]);
      this._arc = [[ua, va], ...arc, [ub, vb]];
      this._rimR = RR; this._mainActive = mainActive;
      pitPoly.push([0, WV0], [0, 0], [ua, 0.3], ...this._arc, [ub, 0.3], [75.5, 0], [75.5, WV0], [TOPE, WV0], [TOPE, WV1], [85.7, WV1], [85.6, 243],
        [48.7, 243.1], [RAMP_U1, 243.1], [RAMP_U1, RAMP_V1], [RAMP_U0, RAMP_V1], [RAMP_U0, 243], [25.1, 243], [-6.7, 242.6], [-6.7, WV1], [TOPW, WV1], [TOPW, WV0]);
    }
    kit.pit(pitPoly, Y2);
    {
      const inPit = (x, z) => inPolyL(...kit.local(x, z), pitPoly);
      const nearPit = (x, z) => { const [u, v] = kit.local(x, z); return u > TOPW - 1 && u < TOPE + 1 && v > -12 && v < RAMP_V1 + 1 && inPolyL(u, v, pitPoly); };
      const drop = new Set(['Snake Path', 'Ram Stairs', 'Krishna Stairs', 'Budh Stairs', 'Gandhi Stairs']);
      const roads = D.roads.filter((r) => !(drop.has(r.name) || (['footway', 'path', 'steps'].includes(r.kind) && r.pts.every(([x, z]) => nearPit(x, z)))));
      D.roads.splice(0, D.roads.length, ...roads);
      const areas = D.areas.filter((a) => !(a.kind === 'grass' && a.poly.some(([x, z]) => inPit(x, z)) && a.poly.every(([x, z]) => { const [u, v] = kit.local(x, z); return u > 20 && u < 55 && v > -1 && v < 330; })));
      D.areas.splice(0, D.areas.length, ...areas);
      // keep the scattered campus trees out of the courts and wells
      campus.statuePts ||= [];
      for (let v = 6; v < RAMP_V1; v += 11) for (let u = TOPW + 4; u < TOPE; u += 11) if (inPolyL(u, v, pitPoly) && !inPolyL(u, v, WB) && !inPolyL(u, v, EB)) campus.statuePts.push([kit.world(u, v).x, kit.world(u, v).z]);
    }

    kit.floors.push({ y: 0, name: 'Roof lawns (campus grade)' }, { y: Y1, name: 'Level -01 (rooms 61xx)' }, { y: Y2, name: 'Level -02 (rooms 60xx, south half)' });

    // ---------- level -01 / -02 floors: fill and slabs (colliders) ----------
    // north: everything from the west toe to the east toe, v 0..128, plus the courtyard up to the Rotunda rim
    fill(TOEW, TOEE, 0, STAIR_TOP);
    {
      const arc = this._arc;
      for (let u = 30; u < 47.5 - 1e-6; u += 0.5) {
        const u1 = Math.min(47.5, u + 0.5);
        let vmin = 0;
        for (let k = 0; k + 1 < arc.length; k++) {
          const [a, b] = [arc[k], arc[k + 1]];
          if (b[0] < u || a[0] > u1) continue;
          vmin = Math.min(vmin, a[1], b[1]);
        }
        kit.col(u, u1, vmin - 0.1, 0.5, Y2, Y1, true);
      }
    }
    // south (v 128..243): banks either side of the canopy stair, behind the colonnades, the wells
    fill(TOEW, 33, STAIR_TOP, STAIR_FOOT); fill(45, TOEE, STAIR_TOP, STAIR_FOOT);
    fill(TOEW, 16, STAIR_FOOT, 182); fill(TOEW, 26, 182, 186.3); fill(TOEW, Rw(200), 186.3, 243);
    fill(66, TOEE, STAIR_FOOT, 185); fill(Re(186), TOEE, 185, 190.3); fill(Re(195), TOEE, 190.3, 201.3); fill(53, TOEE, 201.3, 243);
    // galleries over the lower colonnades
    const galleries = [[Rw(150), Ew(150), STAIR_FOOT, 186.3], [Rw(200), Ew(200), 186.3, 243], [Ee(150), Re(150), STAIR_FOOT, 190.3], [Ee(195), Re(195), 190.3, 201.3], [Ee(220), Re(220), 201.3, 243]];
    for (const [u0, u1, v0, v1] of galleries) kit.slab(u0, u1, v0, v1, Y1, M.kota, { thick: 0.4 });

    // ---------- level -01 floors inside the blocks (grey Kota) ----------
    for (const [poly, west] of [[WB, true], [EB, false]]) {
      for (const b of bands(poly)) {
        const pieces = [[b.v0, Math.min(b.v1, STAIR_FOOT)], [Math.max(b.v0, STAIR_FOOT), b.v1]];
        for (const [v0, v1] of pieces) {
          if (v1 - v0 < 0.02) continue;
          const vm = (v0 + v1) / 2;
          let [u0, u1] = [b.u0, b.u1];
          if (vm > STAIR_FOOT) {
            if (west) u1 = Math.min(u1, vm < 182 ? 16 : vm < 186.3 ? 26 : Rw(vm));
            else u0 = Math.max(u0, vm < 185 ? 66 : Re(vm));
          }
          if (u1 - u0 > 0.05) floorV(u0, u1, v0, v1, Y1, M.kota);
        }
      }
    }

    // ---------- roof lawns at grade over both blocks ----------
    for (const poly of [WB, EB]) {
      const sh = new THREE.Shape(poly.map(([u, v]) => new THREE.Vector2(u, -v)));
      // the white fascia: the slab's sides and underside only. Its top cap would lie a few cm under the lawn and
      // tear through it at map distance (depth precision), and nobody can see it anyway.
      const ext = new THREE.ExtrudeGeometry(sh, { depth: ROOF - C1, bevelEnabled: false });
      ext.rotateX(-Math.PI / 2); ext.translate(0, C1, 0);
      const src = ext.index ? ext.toNonIndexed() : ext;
      const P = src.attributes.position; const keep = [];
      for (let i = 0; i < P.count; i += 3) {
        const atTop = [0, 1, 2].every((k) => Math.abs(P.getY(i + k) - ROOF) < 1e-4);
        if (!atTop) for (let k = 0; k < 3; k++) keep.push(P.getX(i + k), P.getY(i + k), P.getZ(i + k));
      }
      const slab = new THREE.BufferGeometry(); slab.setAttribute('position', new THREE.Float32BufferAttribute(keep, 3));
      slab.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((keep.length / 3) * 2).fill(0), 2));
      slab.computeVertexNormals();
      kit.mesh(slab, M.fascia);
      const top = new THREE.ShapeGeometry(sh); top.rotateX(-Math.PI / 2); top.translate(0, ROOF, 0);
      const uv = top.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 4, uv.getY(i) / 4);
      kit.mesh(top, po(M.lawn));
      for (const b of bands(poly)) fill(b.u0, b.u1, b.v0, b.v1, C1, ROOF);
    }
    // roof landscape: shrub beds, bougainvillea, gravel paths and skylights (research B3: green roof, skylights)
    for (const [poly, uc] of [[WB, 14], [EB, 63]]) {
      for (let v = 8; v < 238; v += 18) {
        if (!inPolyL(uc, v, poly)) continue;
        V(uc - 5, uc + 5, v - 0.6, v + 0.6, ROOF, ROOF + 0.02, po(M.pave)); // gravel path
        const sk = (v / 18) % 2 < 1;
        if (sk && inPolyL(uc + 7, v + 4, poly)) { B(uc + 5.5, uc + 8.5, v + 3, v + 5, ROOF, 0.55, M.fascia, { collide: true }); V(uc + 5.7, uc + 8.3, v + 3.2, v + 4.8, 0.55, 0.62, M.glass); }
        if (inPolyL(uc - 8, v + 8, poly)) {
          const g = new THREE.SphereGeometry(0.9, 7, 5); g.scale(2.2, 0.6, 1); g.translate(uc - 8, 0.4, v + 8); kit.mesh(g, (v / 18) % 3 < 1 ? 'c:#c2385a' : 'c:#4f7f36');
        }
      }
    }

    // ---------- the pit: walls, slopes, rails ----------
    // outer light-wells: paved strip at -4.5 in front of the outer face, grass embankment up to the rail at grade
    const portals = [
      { id: '01', name: 'Portal 01 (Ram Marg)', side: -1, v: 66.2 },
      { id: '02', name: 'Portal 02 (Krishna Marg)', side: 1, v: 68.2 },
      { id: '03', name: 'Portal 03 (Budh Stairs)', side: -1, v: 185 },
      { id: '04', name: 'Portal 04 (Gandhi Stairs)', side: 1, v: 192.5 },
    ];
    const CH_W = 1.65; // half width of a portal stair channel
    for (const side of [-1, 1]) {
      const toe = side < 0 ? TOEW : TOEE; const top = side < 0 ? TOPW : TOPE;
      const vs = [WV0, ...portals.filter((p) => p.side === side).flatMap((p) => [p.v - CH_W, p.v + CH_W]), WV1];
      for (let i = 0; i < vs.length; i += 2) {
        const [v0, v1] = [vs[i], vs[i + 1]];
        kit.mesh(quad([toe, Y1, v0], [toe, Y1, v1], [top, 0.02, v1], [top, 0.02, v0]), M.earth);
        // solid embankment: six terraces under the slope, 0.75 m apart (too tall to climb from the well). Each is a
        // stack of walkable layers 0.6 m apart, so anything that ends up inside the bank (a respawn, a teleport)
        // rises to its surface instead of dropping to the pit floor. The terrace at the toe stacks only below the
        // well floor, so the well cannot climb it.
        for (let i = 0; i < 6; i++) {
          const ua = toe + ((top - toe) * i) / 6; const ub = toe + ((top - toe) * (i + 1)) / 6;
          const [a0, a1] = [Math.min(ua, ub), Math.max(ua, ub)]; const h = Y1 + 0.75 * (i + 1);
          kit.col(a0, a1, v0, v1, Y2, h, true);
          for (let y = Y2 + 0.6; y < (i === 0 ? Y1 - 0.7 : h - 0.05); y += 0.6) kit.col(a0, a1, v0, v1, y - 0.1, y, true);
        }
        rail(top - side * 0.1, v0, top - side * 0.1, v1, 0);
        // shrubs along the slope
        for (let v = v0 + 3; v < v1 - 2; v += 7) { const g = new THREE.SphereGeometry(0.8, 7, 5); g.scale(1.3, 0.7, 1); const u = toe + (top - toe) * 0.45; g.translate(u, Y1 + 4.5 * 0.45 + 0.2, v); kit.mesh(g, 'c:#557f34'); }
      }
      // paved strip, following the outer face
      const poly = side < 0 ? WB : EB;
      const byV = new Map();
      for (const b of bands(poly)) { if (!byV.has(b.v0)) byV.set(b.v0, []); byV.get(b.v0).push(b); }
      for (const list of byV.values()) {
        const b0 = list[0];
        if (b0.v1 <= WV0 || b0.v0 >= WV1) continue;
        const v0 = Math.max(WV0, b0.v0); const v1 = Math.min(WV1, b0.v1);
        list.sort((p, q) => p.u0 - q.u0);
        const gaps = side < 0 ? [[TOEW, list[0].u0]] : [[list[list.length - 1].u1, TOEE]];
        for (let i = 0; i + 1 < list.length; i++) gaps.push([list[i].u1, list[i + 1].u0]);
        for (const [a, b] of gaps) if (b - a > 0.05) floorV(a, b, v0, v1, Y1, M.pave);
      }
      // the ends of the wells: retaining walls with a rail at grade
      const face = side < 0 ? Wf : Ef;
      for (const [v, dir] of [[WV0, -1], [WV1, 1]]) {
        const ua = side < 0 ? top : face(v - dir * 0.6); const ub = side < 0 ? face(v - dir * 0.6) : top;
        B(Math.min(ua, ub), Math.max(ua, ub), v + (dir < 0 ? -0.4 : 0), v + (dir < 0 ? 0 : 0.4), Y1, 0.05, M.retain);
        rail(Math.min(ua, ub), v + dir * 0.2, Math.max(ua, ub), v + dir * 0.2, 0.05);
      }
    }
    // courtyard north extension: retaining walls up to grade on both sides, and the Rotunda rim
    for (const u of [30, 47.5]) {
      const va = this._arc[u === 30 ? 0 : this._arc.length - 1][1];
      B(u + (u === 30 ? -0.4 : 0), u + (u === 30 ? 0 : 0.4), va, 0.3, Y1, 0.05, M.retain);
      rail(u + (u === 30 ? -0.2 : 0.2), va, u + (u === 30 ? -0.2 : 0.2), 0.3, 0.05);
    }
    if (!this._mainActive) {
      // standalone (no sunken Rotunda yet): the old Rotunda sits at grade here, so the rim is a wall and rail
      // (until main-building sinks it). A straight stair climbs from the courtyard up to the Rotunda's south
      // opening, between buff cheek walls; the rest of the rim is a dressed retaining wall with a coping and rail.
      const [G0, G1] = RSTAIR;
      for (let k = 0; k + 1 < this._arc.length; k++) {
        const [a, b] = [this._arc[k], this._arc[k + 1]];
        if (a[0] >= G0 - 0.02 && b[0] <= G1 + 0.02) continue; // the stair opening
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]) + 0.05; const ang = -Math.atan2(b[1] - a[1], b[0] - a[0]);
        const piece = (h, d, y, dv, key) => { const g = new THREE.BoxGeometry(len, h, d); g.rotateY(ang); g.translate((a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2 + dv); kit.mesh(g, key); };
        piece(-Y1, 0.4, Y1 / 2, -0.2, M.retain);
        piece(0.35, 0.5, -0.4, -0.15, M.buff); // buff string course under the coping
        piece(0.12, 0.6, 0.06, -0.2, M.stone); // coping
        for (const yy of [-3.2, -2.0]) piece(0.08, 0.44, yy, -0.2, M.stone); // horizontal rustication
        segRail([a[0], a[1] - 0.1], [b[0], b[1] - 0.1], 0.12);
      }
      const n = 30; const rise = -Y1 / n; const tread = 0.28; const mid = (G0 + G1) / 2;
      const vTop = Math.max(this._arc.find((p) => p[0] >= G0 - 0.02)[1], this._arc.filter((p) => p[0] <= G1 + 0.02).pop()[1]) + 0.05;
      const vFoot = vTop + n * tread;
      kit.flight(mid, vFoot, Y1, [0, -1], n, rise, G1 - G0 - 0.8, M.stone);
      B(G0 + 0.4, G1 - 0.4, vTop - 1.2, vTop, -0.2, 0.1, M.stone, { walkable: true }); // top landing onto the Rotunda
      for (const [c0, c1] of [[G0 - 0.0, G0 + 0.4], [G1 - 0.4, G1]]) {
        B(c0, c1, vTop - 0.4, vFoot, Y1, 0.05, M.buff); // cheek walls
        B(c0 - 0.05, c1 + 0.05, vTop - 0.4, vFoot + 0.05, 0.05, 0.17, M.stone, { collide: false });
        rail((c0 + c1) / 2, vTop, (c0 + c1) / 2, vFoot, 0.17);
      }
      kit.stairs.push({ name: 'Rotunda stair (courtyard to the Rotunda)', u0: G0, u1: G1, v0: vTop, v1: vFoot, y0: Y1, y1: 0 });
      this._rotundaStair = { u: mid, vTop, vFoot };
    }
    // the south end of the lower courtyard: walls up to grade either side of the ramp
    for (const [u0, u1] of [[25.1, RAMP_U0], [RAMP_U1, 48.7]]) { B(u0, u1, 243, 243.4, Y2, 0.05, M.retain); rail(u0, 243.2, u1, 243.2, 0.05); }

    // ---------- South side ramp: a long stepped ramp from -9 up to Gandhi Marg ----------
    {
      const n = 48; const rise = -Y2 / n; const tread = (RAMP_V1 - 243) / n;
      const mid = (RAMP_U0 + RAMP_U1) / 2;
      kit.flight(mid, 243, Y2, [0, 1], n, rise, 3.2, M.pave, { tread });
      kit.flight((RAMP_U0 + mid - 1.6) / 2, 243, Y2, [0, 1], n, rise, mid - 1.6 - RAMP_U0, M.grass, { tread });
      kit.flight((mid + 1.6 + RAMP_U1) / 2, 243, Y2, [0, 1], n, rise, RAMP_U1 - mid - 1.6, M.grass, { tread });
      for (const u of [RAMP_U0, RAMP_U1]) {
        const o = u === RAMP_U0 ? -0.4 : 0.4;
        B(Math.min(u, u + o), Math.max(u, u + o), 243, RAMP_V1, Y2, 0.05, M.retain);
        rail(u + o / 2, 243.4, u + o / 2, RAMP_V1 - 6, 0.05);
      }
      kit.stairs.push({ name: 'South side ramp', u0: RAMP_U0, u1: RAMP_U1, v0: 243, v1: RAMP_V1, y0: Y2, y1: 0 });
      // the lawns the ramp cuts through (the OSM lawn was dropped above) and the Snake Path to Gandhi Marg
      const lawns = [[[25.1, 243], [RAMP_U0, 243], [RAMP_U0, RAMP_V1], [31.98, RAMP_V1]], [[RAMP_U1, 243.1], [48.7, 243.1], [43.27, RAMP_V1], [RAMP_U1, RAMP_V1]], [[31.98, RAMP_V1], [43.27, RAMP_V1], [41.2, 321.8], [34.6, 321.7]]];
      for (const p of lawns) { const g = new THREE.ShapeGeometry(new THREE.Shape(p.map(([u, v]) => new THREE.Vector2(u, -v)))); g.rotateX(-Math.PI / 2); g.translate(0, 0.05, 0); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 4, uv.getY(i) / 4); kit.mesh(g, po(M.grass)); }
      V(mid - 1.1, mid + 1.1, RAMP_V1, 322, 0.0, 0.06, M.pave);
      kit.entrance('South side ramp (Gandhi Marg)', mid, RAMP_V1 + 2, [0, 1]);
    }

    // ---------- courtyards: paving, Snake Path, planting, bollards ----------
    const snake = (pts, y) => {
      for (let i = 1; i < pts.length; i++) {
        const [a, b] = [pts[i - 1], pts[i]];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]); const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
        for (const [w, key, dy] of [[2.6, M.sand, 0.02], [2.0, M.stone, 0.035]]) {
          const g = new THREE.BoxGeometry(len + w * 0.5, 0.03, w); g.rotateY(-ang); g.translate((a[0] + b[0]) / 2, y + dy, (a[1] + b[1]) / 2); kit.mesh(g, po(key));
        }
        for (let s = 3; s < len; s += 9) { // bollard lights
          const u = a[0] + ((b[0] - a[0]) * s) / len; const v = a[1] + ((b[1] - a[1]) * s) / len;
          const nu = -(b[1] - a[1]) / len; const nv = (b[0] - a[0]) / len;
          kit.cyl(u + nu * 1.7, v + nv * 1.7, y, 0.09, 0.75, M.dark, { seg: 8, collide: true });
          kit.cyl(u + nu * 1.7, v + nv * 1.7, y + 0.75, 0.1, 0.08, 'e:#ffe8b0', { seg: 8 });
        }
      }
    };
    // north courtyard (-4.5) and its extension to the Rotunda
    for (const b of bands([...this._arc.map(([u, v]) => [u, Math.max(v, -40)]), [47.5, 0.3], [47.5, STAIR_TOP], [30, STAIR_TOP]])) floorV(b.u0, b.u1, b.v0, b.v1, Y1, M.pave);
    for (const b of bands(WB)) if (b.v0 < STAIR_TOP) floorV(b.u1, 30, b.v0, Math.min(b.v1, STAIR_TOP), Y1, M.pave);
    for (const b of bands(EB)) if (b.v0 < STAIR_TOP) floorV(47.5, b.u0, b.v0, Math.min(b.v1, STAIR_TOP), Y1, M.pave);
    snake([this._rotundaStair ? [38.9, this._rotundaStair.vFoot + 0.3] : [39.6, -5.5], [39.1, 8.2], [34.1, 30.9], [40, 50], [39.4, 60.7], [36, 70.4], [33.4, 91.8], [35.9, 116.4], [37.5, 127.5]], Y1);
    // lower courtyard (-9), including the colonnades under the galleries
    for (const [v0, v1] of [[STAIR_FOOT, 186.3], [186.3, 190.3], [190.3, 201.3], [201.3, 243]]) floorV(Rw(v0 + 0.1), Re(v0 + 0.1), v0, v1, Y2, M.pave);
    snake([[39, STAIR_FOOT + 0.5], [41.5, 148.1], [39.8, 168.8], [40.6, 183.2], [43.2, 198.5], [43.2, 207.2], [37.6, 218.3], [36.2, 229.4], [37.5, 243.5]], Y2);
    // planting beds (raised, walkable kerbs) with tall clumps and grasses, both levels
    const bed = (u0, u1, v0, v1, y) => {
      B(u0, u1, v0, v1, y, y + 0.4, M.stone, { walkable: true });
      V(u0 + 0.12, u1 - 0.12, v0 + 0.12, v1 - 0.12, y + 0.4, y + 0.42, po(M.grass));
      for (let u = u0 + 0.8; u < u1 - 0.5; u += 1.6) {
        for (let v = v0 + 0.8; v < v1 - 0.5; v += 1.7) {
          const k = Math.round(u * 7 + v * 3) % 3;
          if (k === 0) { const g = new THREE.ConeGeometry(0.35, 1.6, 5); g.translate(u, y + 1.2, v); kit.mesh(g, 'c:#4d8a3a'); } else if (k === 1) { const g = new THREE.SphereGeometry(0.45, 6, 4); g.scale(1, 0.8, 1); g.translate(u, y + 0.75, v); kit.mesh(g, 'c:#6b9a40'); }
        }
      }
    };
    for (const [u0, u1, v0, v1] of [[42, 46, 12, 26], [31.5, 35, 40, 54], [41.5, 46, 74, 90], [38.5, 42.5, 98, 112]]) bed(u0, u1, v0, v1, Y1);
    for (const [u0, u1, v0, v1] of [[33, 37, 150, 165], [44, 47.5, 172, 186], [31, 34.5, 205, 216], [41, 45.5, 222, 236]]) bed(u0, u1, v0, v1, Y2);
    // small trees in the north courtyard
    for (const [u, v] of [[44, 40], [32.5, 70], [44.5, 104], [32, 118]]) {
      kit.cyl(u, v, Y1, 0.14, 2.6, 't:wood:#6b5136', { seg: 6 });
      const g = new THREE.SphereGeometry(1.7, 8, 6); g.scale(1, 0.7, 1); g.translate(u, Y1 + 3.2, v); kit.mesh(g, 'c:#5b8a3c');
      kit.col(u - 0.2, u + 0.2, v - 0.2, v + 0.2, Y1, Y1 + 2.6);
    }

    // ---------- the canopy stair between the courtyard levels (S9) ----------
    {
      const u0 = 33; const u1 = 45; const mid = (u0 + u1) / 2; const n = 12; const rise = -(Y2 - Y1) / 2 / n;
      // from the north courtyard (-4.5) down to the landing, then down to the lower courtyard (-9)
      kit.flight(mid, STAIR_FOOT - 0.3, Y2, [0, -1], n, rise, u1 - u0, M.stone); // lower flight, climbs north
      B(u0, u1, STAIR_TOP + n * 0.28, STAIR_FOOT - 0.3 - n * 0.28, Y2, Y1 + (Y2 - Y1) / 2, M.stone, { walkable: true }); // landing
      kit.flight(mid, STAIR_TOP + n * 0.28, Y1 + (Y2 - Y1) / 2, [0, -1], n, rise, u1 - u0, M.stone);
      kit.stairs.push({ name: 'Canopy stair (courtyard -01 to -02)', u0, u1, v0: STAIR_TOP, v1: STAIR_FOOT, y0: Y2, y1: Y1 });
      // side walls of the banks and the red railings
      B(u0 - 0.3, u0, STAIR_TOP, STAIR_FOOT, Y2, Y1, M.buff); B(u1, u1 + 0.3, STAIR_TOP, STAIR_FOOT, Y2, Y1, M.buff);
      rail(u0 - 0.15, STAIR_TOP + 0.6, u0 - 0.15, STAIR_FOOT, Y1, M.maroon); rail(u1 + 0.15, STAIR_TOP + 0.6, u1 + 0.15, STAIR_FOOT, Y1, M.maroon);
      for (const [a, b] of [[Ew(130), u0 - 0.3], [u1 + 0.3, Ee(130)]]) { B(a, b, STAIR_FOOT - 0.3, STAIR_FOOT, Y2, Y1, M.buff); rail(a, STAIR_FOOT - 0.15, b, STAIR_FOOT - 0.15, Y1, M.maroon); }
      // the canopy on round columns (hc-6)
      B(u0 - 1.5, u1 + 1.5, STAIR_TOP - 1, STAIR_FOOT + 1, -0.55, -0.25, M.fascia, { collide: false });
      for (const u of [u0 - 0.9, u1 + 0.9]) {
        kit.cyl(u, STAIR_TOP + 0.4, Y1, 0.3, Y1 * -1 - 0.55, M.col, { seg: 16, collide: true });
        kit.cyl(u, STAIR_FOOT + 0.5, Y2, 0.3, -Y2 - 0.55, M.col, { seg: 16, collide: true });
      }
      // the stepped banks either side: planted
      floorV(Ew(130), u0 - 0.3, STAIR_TOP, STAIR_FOOT - 0.3, Y1, M.pave); floorV(u1 + 0.3, Ee(130), STAIR_TOP, STAIR_FOOT - 0.3, Y1, M.pave);
      bed(Ew(130) + 0.3, u0 - 0.6, STAIR_TOP + 1.2, STAIR_FOOT - 1.2, Y1);
      bed(u1 + 0.6, Ee(130) - 0.3, STAIR_TOP + 1.2, STAIR_FOOT - 1.2, Y1);
      kit.navLinks.push([this.w2(kit, mid, STAIR_TOP - 2), this.w2(kit, mid, STAIR_FOOT + 2)]);
    }

    const roomBox = (r) => !game.some((g) => r.u0 < g.u1 + 0.4 && r.u1 > g.u0 - 0.4 && r.v0 < g.v1 + 0.4 && r.v1 > g.v0 - 0.4);
    const R = (n, u0, u1, v0, v1, door, kind = 'class', extra = {}) => ({ n, u0, u1, v0, v1, door, kind, ...extra });
    // West block (research C1: 6151-6170); doors on the courtyard (u1) or the outer corridor (u0)
    const westRooms = [
      ['w-n1', [R('6154', 2.5, 14, 1.5, 16, 'u0'), R('6153', 2.5, 14, 16, 30.5, 'u0'), R('6151', 14, 26, 1.5, 16, 'u1'), R('6152', 14, 26, 16, 30.5, 'u1')]],
      ['w-n2', [R('6158', 2.5, 14, 33.5, 47, 'u0'), R('6157', 2.5, 14, 47, 61.5, 'u0'), R('6155', 14, 26, 33.5, 47, 'u1'), R('6156', 14, 26, 47, 61.5, 'u1')]],
      ['w-n3', [R('6162', 6.2, 16, 70.5, 80.5, 'u0'), R('6161', 6.2, 16, 80.5, 91, 'u0'), R('6159', 16, 26, 70.5, 80.5, 'u1'), R('6160', 16, 26, 80.5, 91, 'u1')]],
      ['w-s1', [R('6165', 7.5, 26, 129, 148, 'u1', 'lab', { title: 'Economics & Finance' }), R('6166', 16, 26, 149, 165.5, 'u1', 'office'), R('6167A', 8, 26, 166.5, 177, 'u1', 'office')]],
      ['w-s2', [R('6168', 12.4, Rw(200) - 0.1, 189, 211, 'u1', 'office'), R('6169', 12.4, Rw(200) - 0.1, 211, 232.6, 'u1', 'class'), R('6170', -6.2, Rw(200) - 0.1, 233.8, 242.2, 'v0', 'office', { doorAt: 6 })]],
    ];
    const eastRooms = [
      ['e-n1', [R('6101', 53, 64, 1.5, 16, 'u0'), R('6102', 53, 64, 16, 30.5, 'u0'), R('6104', 64, 73, 1.5, 16, 'u1'), R('6103', 64, 73, 16, 30.5, 'u1')]],
      ['e-n2', [R('6105', 53, 64.5, 33.5, 47, 'u0'), R('6106', 53, 64.5, 47, 61.5, 'u0'), R('6108', 64.5, 76.4, 33.5, 47, 'u1'), R('6107', 64.5, 76.4, 47, 61.5, 'u1')]],
      ['e-n4', [R('6111', 55, 73.2, 106.5, 126.5, 'u0', 'lab', { title: 'CSIS Lab' })]],
      ['e-s1', [R('6112', Re(150), 63.6, 128.9, 143, 'u0'), R('6115', 63.6, 71, 128.9, 143, 'u1'), R('6113', Re(150), 63.6, 143, 158, 'u0'), R('6114', 63.6, 71, 143, 158, 'u1')]],
      ['e-s2', [R('6116', Re(150), 63.6, 158, 169, 'u0'), R('6119', 63.6, 71, 158, 169, 'u1'), R('6117', Re(150), 63.6, 169, 180.3, 'u0'), R('6118', 63.6, 71, 169, 180.3, 'u1')]],
      ['e-s3', [R('6120', 53, 61.6, 212, 232.4, 'u1', 'office'), R('6121', 53, 85.4, 233.2, 242.6, 'v0', 'office', { doorAt: 23 })]],
    ];
    // a room door within reach of an outer face opens through it
    const doorBoxes = [];
    for (const [, list] of [...westRooms, ...eastRooms]) {
      for (const r of list) {
        const at = r.doorAt ?? (r.door[0] === 'u' ? (r.v1 - r.v0) - 2.2 : (r.u1 - r.u0) / 2);
        const out = r.door.endsWith('0') ? -1 : 1;
        if (r.door[0] === 'u') { const u = r.door === 'u0' ? r.u0 : r.u1; doorBoxes.push({ u0: Math.min(u, u + out * 1.2), u1: Math.max(u, u + out * 1.2), v0: r.v0 + at - 1, v1: r.v0 + at + 1 }); }
        else { const v = r.door === 'v0' ? r.v0 : r.v1; doorBoxes.push({ u0: r.u0 + at - 1, u1: r.u0 + at + 1, v0: Math.min(v, v + out * 1.2), v1: Math.max(v, v + out * 1.2) }); }
      }
    }
    // the Lecture Theatre foyer: from the notch court the gameplay LT door opens into, through to the courtyard
    doorBoxes.push({ u0: 13.4, u1: 15, v0: 124.3, v1: 127.7 });
    // ---------- block facades ----------
    // outline edges of both blocks; outer faces get punched windows with red reveals, the courtyard faces a
    // colonnade of round white columns and fin groups under the cantilevered roof, and every roof edge a railing.
    const corridors = []; // cross-corridors: { u0, u1, v0, v1 } openings through walls
    const edgeList = [];
    for (const [poly, west] of [[WB, true], [EB, false]]) {
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i]; const b = poly[(i + 1) % poly.length];
        const alongU = Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1]);
        const len = alongU ? Math.abs(b[0] - a[0]) : Math.abs(b[1] - a[1]);
        if (len < 0.3) continue;
        const c = alongU ? (a[1] + b[1]) / 2 : (a[0] + b[0]) / 2;
        const s0 = alongU ? Math.min(a[0], b[0]) : Math.min(a[1], b[1]);
        const mu = (a[0] + b[0]) / 2; const mv = (a[1] + b[1]) / 2;
        const out = alongU ? (inPolyL(mu, c - 0.3, poly) ? 1 : -1) : (inPolyL(c - 0.3, mv, poly) ? 1 : -1); // outward: +1 = towards +v / +u
        const end = alongU && (mv < 1.5 || mv > 242);
        const court = !end && (west ? mu > 22 : mu < 56);
        edgeList.push({ alongU, c, s0, len, out, end, court, west, mu, mv });
      }
    }
    this._edges = edgeList;

    // ---------- portals (S1-S4): pavilion at grade, stair down the embankment, cross-corridor ----------
    const portalDefs = [];
    for (const p of portals) {
      const dir = -p.side; // descending direction along u (towards the block)
      const top = p.side < 0 ? TOPW : TOPE;
      const at = (a) => top + dir * a; // u at distance a down the stair axis
      const n = 12; const rise = -Y1 / 2 / n; const tread = 0.28; const run = n * tread; const land = 1.4;
      const w = 2.6;
      // flights and landing
      kit.flight(at(run), p.v, Y1 / 2, [-dir, 0], n, rise, w, M.stone); // upper flight climbs out, from the landing
      const la = at(run); const lb = at(run + land);
      B(Math.min(la, lb), Math.max(la, lb), p.v - w / 2, p.v + w / 2, Y2, Y1 / 2, M.stone, { walkable: true });
      kit.flight(at(run + land + run), p.v, Y1, [-dir, 0], n, rise, w, M.stone); // lower flight
      const foot = at(run + land + run);
      kit.stairs.push({ name: `${p.name} stair`, u0: Math.min(at(0), foot), u1: Math.max(at(0), foot), v0: p.v - w / 2, v1: p.v + w / 2, y0: Y1, y1: 0 });
      // cheek walls up through the embankment, then railings over the paved strip
      const toe = p.side < 0 ? TOEW : TOEE;
      for (const s of [-1, 1]) {
        const vw = p.v + s * (w / 2 + 0.15);
        B(Math.min(top, toe), Math.max(top, toe), vw - 0.15, vw + 0.15, Y1, 1.0, M.buff);
        B(Math.min(top, toe), Math.max(top, toe), vw - 0.2, vw + 0.2, 1.0, 1.1, M.ptrim, { collide: false });
        rail(Math.min(toe, foot), vw, Math.max(toe, foot), vw, Y1 + 0.2, M.maroon);
        // the embankment between the cheek wall and the slope run is earth at grade
        const ve = p.v + s * CH_W;
        kit.col(Math.min(top, toe), Math.max(top, toe), Math.min(vw + s * 0.15, ve), Math.max(vw + s * 0.15, ve), Y2, 0, true);
      }
      // the pavilion: a tall buff box with cusped white arches front and back
      const pa0 = at(-5.5); const pa1 = at(1.2); const PW = 3.6; const PH = 8.2;
      const pu0 = Math.min(pa0, pa1); const pu1 = Math.max(pa0, pa1);
      for (const s of [-1, 1]) {
        const vw = p.v + s * (PW - 0.3);
        B(pu0, pu1, vw - 0.3, vw + 0.3, Y1, PH, M.portal);
        for (const k of [0.33, 0.66]) V(pu0 + (pu1 - pu0) * k - 0.12, pu0 + (pu1 - pu0) * k + 0.12, vw + s * 0.31 - 0.01, vw + s * 0.31 + 0.01, 3.2, 6.6, M.dark); // slot windows
      }
      for (const [au, front] of [[pa0, true], [pa1, false]]) {
        const sh = new THREE.Shape([[-PW, 0], [PW, 0], [PW, PH], [-PW, PH]].map(([x, y]) => new THREE.Vector2(x, y)));
        const ap = archPts(front ? 3.6 : 3.2, front ? 3.6 : 3.3);
        sh.holes.push(new THREE.Path(ap.map(([x, y]) => new THREE.Vector2(x, y))));
        const g = new THREE.ExtrudeGeometry(sh, { depth: 0.6, bevelEnabled: false }); g.translate(0, 0, -0.3); g.rotateY(Math.PI / 2); g.translate(au, front ? 0 : 0, p.v);
        if (!front) g.translate(0, 0, 0);
        kit.mesh(g, M.portal);
        // white trim round the arch
        const ts = new THREE.Shape(ap.map(([x, y]) => new THREE.Vector2(x * 1.16, y * 1.07)));
        ts.holes.push(new THREE.Path(ap.map(([x, y]) => new THREE.Vector2(x, y))));
        const tg = new THREE.ExtrudeGeometry(ts, { depth: 0.7, bevelEnabled: false }); tg.translate(0, 0, -0.35); tg.rotateY(Math.PI / 2); tg.translate(au, 0, p.v);
        kit.mesh(tg, M.ptrim);
        const half = (front ? 3.6 : 3.2) * 0.43;
        kit.col(au - 0.3, au + 0.3, p.v - PW, p.v - half, front ? 0 : Y1, PH); kit.col(au - 0.3, au + 0.3, p.v + half, p.v + PW, front ? 0 : Y1, PH);
        if (!front) kit.col(au - 0.3, au + 0.3, p.v - half, p.v + half, 4.4, PH);
      }
      // cornice, parapet and corner finials
      B(pu0 - 0.25, pu1 + 0.25, p.v - PW - 0.25, p.v + PW + 0.25, PH, PH + 0.35, M.ptrim, { collide: false });
      B(pu0 - 0.1, pu1 + 0.1, p.v - PW - 0.1, p.v + PW + 0.1, PH + 0.35, PH + 0.5, M.portal, { collide: false });
      V(pu0 + 0.2, pu1 - 0.2, p.v - PW + 0.2, p.v + PW - 0.2, PH - 0.1, PH + 0.36, M.portal);
      for (const cu of [pu0, pu1]) for (const cv of [p.v - PW, p.v + PW]) { kit.cyl(cu, cv, PH + 0.5, 0.28, 0.9, M.ptrim, { seg: 10 }); const g = new THREE.SphereGeometry(0.32, 10, 6); g.translate(cu, PH + 1.55, cv); kit.mesh(g, M.ptrim); }
      // the pavilion floor at grade beside the stairwell, and its ceiling and lamp
      const sideFloor = (a0, a1) => { const ua = at(a0); const ub = at(a1); for (const s of [-1, 1]) B(Math.min(ua, ub), Math.max(ua, ub), Math.min(p.v + s * (w / 2 + 0.3), p.v + s * (PW - 0.6)), Math.max(p.v + s * (w / 2 + 0.3), p.v + s * (PW - 0.6)), Y2, 0.06, M.portal, { walkable: true }); };
      sideFloor(-0.01, 1.2);
      V(Math.min(pa0, at(0)), Math.max(pa0, at(0)), p.v - PW + 0.6, p.v + PW - 0.6, 0, 0.06, M.pave);
      V(pu0 + 0.3, pu1 - 0.3, p.v - PW + 0.6, p.v + PW - 0.6, PH - 0.5, PH - 0.3, M.ceil);
      kit.cyl((pu0 + pu1) / 2, p.v, PH - 1.0, 0.25, 0.5, 'e:#ffdca0', { seg: 10 });
      // the paved approach from the road
      const road = p.side < 0 ? -28.4 : 104.5;
      V(Math.min(road, pa0), Math.max(road, pa0), p.v - 1.3, p.v + 1.3, 0, 0.06, M.pave);
      // cross-corridor at -01 from the stair foot through the block to the courtyard
      const face = p.side < 0 ? Wf(p.v) : Ef(p.v);
      const inner = p.side < 0 ? Ew(p.v) : Ee(p.v);
      corridors.push({ u0: Math.min(face, inner), u1: Math.max(face, inner), v0: p.v - 3, v1: p.v + 3, name: p.name, p });
      const roadPt = this.w2(kit, at(-8), p.v); const footPt = this.w2(kit, foot + dir * 1.5, p.v);
      const courtPt = this.w2(kit, inner + dir * 3, p.v);
      kit.navLinks.push([roadPt, footPt], [footPt, courtPt]);
      kit.entrance(p.name, at(-6.5), p.v, [p.side, 0]);
      portalDefs.push({ ...p, foot, courtPt, footPt });
    }
    // NPC crossings that replace the at-grade passages: across the north courtyard and the lower one
    const P = Object.fromEntries(portalDefs.map((p) => [p.id, p]));
    kit.navLinks.push([P['01'].courtPt, P['02'].courtPt], [P['03'].courtPt, P['04'].courtPt]);

    // the facade walls (outer faces) with windows, openings at the corridors and the gameplay-room doors
    const openingsOn = (e, y0) => {
      const ops = [];
      for (const k of [...corridors, ...cuts, ...doorBoxes]) {
        const a0 = e.alongU ? k.u0 : k.v0; const a1 = e.alongU ? k.u1 : k.v1; const b0 = e.alongU ? k.v0 : k.u0; const b1 = e.alongU ? k.v1 : k.u1;
        if (e.c < b0 - 0.3 || e.c > b1 + 0.3) continue;
        const lo = Math.max(a0, e.s0); const hi = Math.min(a1, e.s0 + e.len);
        if (hi - lo > 0.5) ops.push({ at: (lo + hi) / 2 - e.s0, width: hi - lo, bottom: 0, top: k.p ? 3.2 : 2.5, door: !k.p });
      }
      return ops;
    };
    for (const e of edgeList) {
      if (e.court) continue;
      const y0 = Y1;
      const ops = openingsOn(e, y0);
      const wins = [];
      if (!e.end) {
        for (let s = 1.6; s < e.len - 1.2; s += 3.4) {
          if (ops.some((o) => Math.abs(o.at - s) < o.width / 2 + 1.0)) continue;
          wins.push({ at: s, width: 1.6, bottom: 0.9, top: 2.7 });
        }
      }
      const [u0, v0, u1, v1] = e.alongU ? [e.s0, e.c, e.s0 + e.len, e.c] : [e.c, e.s0, e.c, e.s0 + e.len];
      kit.wall(u0, v0, u1, v1, y0, C1, e.end ? M.retain : M.buff, { thick: 0.35, openings: [...ops, ...wins] });
      for (const wnd of wins) {
        kit.window(e.alongU, e.s0 + wnd.at, e.c, y0 + wnd.bottom, wnd.width, wnd.top - wnd.bottom, { frame: 'c:#6d7378', glass: M.glass, thick: 0.35 });
        // the red reveal on one jamb (research B3)
        const j = e.s0 + wnd.at - wnd.width / 2;
        if (e.alongU) V(j - 0.14, j, e.c - 0.2, e.c + 0.2, y0 + wnd.bottom, y0 + wnd.top, M.red);
        else V(e.c - 0.2, e.c + 0.2, j - 0.14, j, y0 + wnd.bottom, y0 + wnd.top, M.red);
      }
      // a white band at the roof edge over the outer faces
      if (!e.end) { if (e.alongU) V(u0, u1, e.c + e.out * 0.18 - 0.03, e.c + e.out * 0.18 + 0.03, C1 - 0.35, C1, M.white); else V(e.c + e.out * 0.18 - 0.03, e.c + e.out * 0.18 + 0.03, v0, v1, C1 - 0.35, C1, M.white); }
    }
    // courtyard faces: columns, fins, gallery rails
    for (const e of edgeList) {
      if (!e.court || e.alongU) continue;
      const inset = -e.out * 0.45;
      for (let s = 2; s < e.len - 1; s += 4.6) {
        const v = e.s0 + s; const u = e.c + inset;
        if (game.some((g) => u > g.u0 - 1 && u < g.u1 + 1 && v > g.v0 - 1 && v < g.v1 + 1)) continue;
        const y0 = v > STAIR_FOOT ? Y2 : Y1;
        kit.cyl(u, v, y0, 0.3, C1 - y0, M.col, { seg: 14, collide: true });
        if (Math.round(s / 4.6) % 2 === 1) for (const d of [-0.55, 0, 0.55]) B(u - 0.06, u + 0.06, v + 2.3 + d - 0.3, v + 2.3 + d + 0.3, y0, C1, M.white); // fin group (narrow side to the court)
      }
      if (e.s0 + e.len > STAIR_FOOT) {
        const a = Math.max(e.s0, STAIR_FOOT); const b = e.s0 + e.len;
        rail(e.c + inset * 0.3, a, e.c + inset * 0.3, b, Y1);
        // the gallery slab edge reads as a white band
        V(e.c + inset * 0.3 - 0.05, e.c + inset * 0.3 + 0.05, a, b, Y1 - 0.4, Y1, M.white);
      }
    }
    for (const e of edgeList) if (e.court && e.alongU && e.mv > STAIR_FOOT) rail(e.s0, e.c, e.s0 + e.len, e.c, Y1);
    // roof railings (stainless, with planter boxes behind) on every roof edge that drops into a court or well
    for (const e of edgeList) {
      if (e.end) continue;
      const off = -e.out * 0.25;
      if (e.alongU) rail(e.s0, e.c + off, e.s0 + e.len, e.c + off, ROOF); else rail(e.c + off, e.s0, e.c + off, e.s0 + e.len, ROOF);
    }
    // the lower colonnade's back wall where no level -02 rooms are (retaining face of the fill)
    for (const [u, v0, v1, o] of [[Rw(150), 181.7, 186.3, 1], [Rw(200), 186.3, 243, 1], [Re(150), 184.6, 190.3, -1], [Re(195), 190.3, 201.3, -1], [Re(220), 201.3, 243, -1]]) {
      if (v1 - v0 < 0.2) continue;
      B(u - (o > 0 ? 0.3 : 0), u + (o > 0 ? 0 : 0.3), v0, v1, Y2, Y1, M.buff);
      for (let v = v0 + 2.5; v < v1 - 1; v += 9) { if (o > 0) V(u, u + 0.12, v - 0.3, v + 0.3, Y2 + 0.8, Y2 + 1.7, 'c:#b3241f'); else V(u - 0.12, u, v - 0.3, v + 0.3, Y2 + 0.8, Y2 + 1.7, 'c:#b3241f'); } // fire hydrant cabinets
    }
    // the jogs of the back wall and the north end of the colonnades
    B(Rw(200), Rw(150), 186.1, 186.5, Y2, Y1, M.buff); B(Re(195), Re(150), 190.1, 190.5, Y2, Y1, M.buff); B(Re(195), Re(220), 201.1, 201.5, Y2, Y1, M.buff);
    B(Rw(150), Ew(150), STAIR_FOOT - 0.3, STAIR_FOOT, Y2, Y1, M.buff); B(Ee(150), Re(150), STAIR_FOOT - 0.3, STAIR_FOOT, Y2, Y1, M.buff);
    // lights along the colonnades (soffit tube lights) and the courtyard hydrants at -01
    for (let v = 6; v < 240; v += 8) {
      const yw = v > STAIR_FOOT ? [Y1 - 0.42, C1] : [C1];
      for (const y of yw) { kit.tubeLight(Ew(v) - 1.6, v, y, [0, 1]); kit.tubeLight(Ee(v) + 1.6, v, y, [0, 1]); }
    }

    // ---------- interiors ----------
    const plates = []; // [text, u, v, y, [du, dv], w, h, bg, fg] for the sign atlas
    const plate = (text, u, v, y, f, w = 0.62, h = 0.2, bg = '#f3efe6', fg = '#2a2d31') => plates.push({ text, u, v, y, f, w, h, bg, fg, layer: kit.layerName });
    const lights = (u0, u1, v0, v1, y) => {
      const nu = Math.max(1, Math.round((u1 - u0) / 4)); const nv = Math.max(1, Math.round((v1 - v0) / 4));
      for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) kit.tubeLight(u0 + ((i + 0.5) * (u1 - u0)) / nu, v0 + ((j + 0.5) * (v1 - v0)) / nv, y, [0, 1]);
    };
    // one room: walls with a door, a false ceiling, lights and furniture
    // door: 'u0' | 'u1' | 'v0' | 'v1' (the wall it is in); kind: class | lt | lab | office | hall
    const room = (d) => {
      const { n, u0, u1, v0, v1, y = Y1, kind = 'class' } = d;
      const top = y === Y1 ? C1 : Y1 - 0.4;
      const ceil = Math.min(y + CH, top - 0.05);
      const T = 0.2;
      const dW = 1.8;
      const dAt = d.doorAt ?? (d.door[0] === 'u' ? (v1 - v0) - 2.2 : (u1 - u0) / 2);
      const walls = { u0: [u0, v0, u0, v1], u1: [u1, v0, u1, v1], v0: [u0, v0, u1, v0], v1: [u0, v1, u1, v1] };
      for (const [side, [a0, b0, a1, b1]] of Object.entries(walls)) {
        if (d.skip?.includes(side)) continue;
        const len = side[0] === 'u' ? v1 - v0 : u1 - u0;
        const ops = [];
        if (side === d.door) ops.push({ at: dAt, width: dW, bottom: 0, top: 2.4 });
        if (side === d.door || side === d.win) for (let s = 1.6; s < len - 1; s += 2.6) if (!ops.some((o) => Math.abs(o.at - s) < 1.9)) ops.push({ at: s, width: 1.4, bottom: side === d.win ? 1.0 : 1.7, top: 2.5 });
        kit.wall(a0, b0, a1, b1, y, top, M.wall, { thick: T, openings: ops });
        for (const o of ops) {
          const alongU = side[0] === 'v'; const c = alongU ? b0 : a0; const s0 = alongU ? u0 : v0;
          if (o.bottom === 0) {
            const inward = side.endsWith('0') ? 1 : -1;
            kit.door(alongU, s0 + o.at, c, y, dW, { leaf: M.door, side: inward });
            // number plate beside the door, outside
            const pu = alongU ? s0 + o.at + dW / 2 + 0.5 : c - inward * 0.13; const pv = alongU ? c - inward * 0.13 : s0 + o.at + dW / 2 + 0.5;
            plate(n, pu, pv, y + 1.75, alongU ? [0, -inward] : [-inward, 0]);
            if (d.title) plate(d.title, alongU ? s0 + o.at : c - inward * 0.13, alongU ? c - inward * 0.13 : s0 + o.at, y + 2.5, alongU ? [0, -inward] : [-inward, 0], 1.9, 0.36, '#7a2622', '#f6ecd2');
          } else kit.window(alongU, s0 + o.at, c, y + o.bottom, o.width, o.top - o.bottom, { frame: 'c:#8a8f94', glass: 'g:#a8c4d4', thick: T });
        }
      }
      if (d.floor) floorV(u0, u1, v0, v1, y, M.kota);
      // a continuous ochre border band inset in the Kota floor
      inlayFrame(u0 + 0.6, u1 - 0.6, v0 + 0.6, v1 - 0.6, y);
      V(u0, u1, v0, v1, ceil, ceil + 0.04, M.ceil);
      lights(u0, u1, v0, v1, ceil);
      kit.room(`nab-${n}`, `${d.title || 'Room'} ${n}`, u0, u1, v0, v1, y, ceil, y === Y1 ? -1 : -2);
      const W = u1 - u0; const Dd = v1 - v0; const uc = (u0 + u1) / 2;
      if (kind === 'class') {
        // board end: v0; desks face it (research E: ochre front wall, dais, black board, screen, red clock)
        V(u0 + 0.1, u1 - 0.1, v0 + 0.1, v0 + 0.13, y, ceil, M.ochreWall);
        B(u0 + 0.3, u1 - 0.3, v0 + 0.13, v0 + 2.0, y, y + 0.3, M.stage, { walkable: true });
        kit.board(uc, v0 + 0.16, y + 0.3, [0, 1], { w: Math.min(5.5, W - 2), h: 1.25 });
        V(uc - 1.6, uc + 1.6, v0 + 0.2, v0 + 0.24, y + 2.65, Math.min(ceil - 0.1, y + 3.4), M.screen);
        V(uc + 2.4, uc + 3.0, v0 + 0.16, v0 + 0.22, y + 2.55, y + 2.75, 'e:#ff3a1c');
        B(uc + Math.min(2.6, W / 2 - 1.2) - 0.4, uc + Math.min(2.6, W / 2 - 1.2) + 0.4, v0 + 0.8, v0 + 1.4, y + 0.3, y + 1.35, M.wood);
        const cols = W > 9 ? [-1, 0, 1] : [-0.5, 0.5]; const step = W > 9 ? (W - 1.4) / 3 : (W - 1.4) / 2;
        for (let v = v0 + 3.6; v < v1 - 2.9; v += 1.15) for (const k of cols) kit.benchDesk(uc + k * step, v, y, [0, -1], { w: Math.min(2.4, step - 0.9), top: 't:wood:#d8b07a' });
        kit.fan(uc - W / 4, (v0 + v1) / 2, ceil); kit.fan(uc + W / 4, (v0 + v1) / 2, ceil);
      } else if (kind === 'lab') {
        for (let v = v0 + 2; v < v1 - 1.5; v += 2.6) {
          for (let u = u0 + 1.3; u < u1 - 1.2; u += 2.2) {
            const k = Math.round(u + v) % 3; const fab = ['c:#3b5f9a', 'c:#a83a32', 'c:#d07a2a'][k];
            B(u - 1.0, u + 1.0, v - 0.05, v + 0.05, y, y + 1.25, fab);
            kit.desk(u, v + 0.45, y, [0, -1], { w: 1.8, d: 0.75, top: 't:wood:#d8c4a0' });
            V(u - 0.25, u + 0.25, v + 0.2, v + 0.24, y + 0.85, y + 1.2, M.dark);
            kit.chair(u, v + 1.1, y, [0, -1], { seat: 'c:#26292d' });
          }
        }
        kit.board(uc, v0 + 0.15, y, [0, 1], { w: 3.6, key: 'c:#f2f4f2', frame: 'c:#9aa0a6' });
      } else if (kind === 'office') {
        // faculty cells: partitions, a desk and a shelf each
        const cw = 3.2;
        for (let v = v0; v + cw <= v1 + 0.01; v += cw) {
          if (v > v0) B(u0 + 0.1, uc - 0.9, v - 0.05, v + 0.05, y, y + 2.2, 'c:#b8a990');
          kit.desk(u0 + 1.4, v + cw / 2, y, [-1, 0], { w: 1.4, d: 0.7 });
          kit.chair(u0 + 2.1, v + cw / 2, y, [-1, 0]);
          kit.shelf(u0 + 0.3, v + cw / 2 + 0.9, y, [1, 0], { w: 1.0, h: 1.9, d: 0.35 });
        }
      } else if (kind === 'hall') {
        for (let v = v0 + 2; v < v1 - 1.5; v += 3) for (let u = u0 + 2; u < u1 - 1.5; u += 3.2) { kit.desk(u, v, y, [0, -1], { w: 1.6, d: 0.9, top: 't:wood:#d2b58c' }); kit.chair(u, v + 0.8, y, [0, -1], { seat: 'c:#26292d' }); }
        kit.board(uc, v0 + 0.15, y, [0, 1], { w: 3.0, key: 'c:#f2f4f2', frame: 'c:#9a7b55' });
      }
      return { ceil };
    };
    // a lecture theatre: stage at one end, tiered seating rising to the other (walkable tiers)
    const lt = (d) => {
      const { n, u0, u1, v0, v1, stage } = d;
      const r = room({ ...d, kind: 'none' });
      const dir = stage === 'v1' ? -1 : 1; // seating rises away from the stage
      const sv = stage === 'v1' ? v1 : v0;
      const y = Y1;
      // stage, curtains, screen
      B(u0 + 0.2, u1 - 0.2, Math.min(sv, sv + dir * 3), Math.max(sv, sv + dir * 3), y, y + 0.45, M.stage, { walkable: true });
      V(u0 + 0.5, u1 - 0.5, Math.min(sv + dir * 0.15, sv + dir * 0.2), Math.max(sv + dir * 0.15, sv + dir * 0.2), y + 0.45, r.ceil - 0.2, d.auditorium ? M.curtain : M.ochreWall);
      V((u0 + u1) / 2 - 2.6, (u0 + u1) / 2 + 2.6, Math.min(sv + dir * 0.25, sv + dir * 0.29), Math.max(sv + dir * 0.25, sv + dir * 0.29), y + 1.2, r.ceil - 0.5, M.screen);
      B((u0 + u1) / 2 + 2.8, (u0 + u1) / 2 + 3.5, Math.min(sv + dir * 1.5, sv + dir * 2.1), Math.max(sv + dir * 1.5, sv + dir * 2.1), y + 0.45, y + 1.5, M.stage);
      // flat front, then tiers of 0.17 m, rows of grey upholstered seats
      const t0 = sv + dir * 5.5; const depth = 1.05;
      const tiers = Math.floor((Math.abs((stage === 'v1' ? v0 : v1) - t0) - 0.4) / depth);
      for (let k = 1; k <= tiers; k++) {
        const a = t0 + dir * (k - 1) * depth; const ty = y + k * 0.17;
        B(u0 + 0.12, u1 - 0.12, Math.min(a, a + dir * depth), Math.max(a, a + dir * depth), y, ty, k % 2 ? M.kota : 't:terrazzo:#a3aba2', { walkable: true });
        for (const [s0, s1] of [[u0 + 0.6, (u0 + u1) / 2 - 0.7], [(u0 + u1) / 2 + 0.7, u1 - 0.6]]) {
          const sb = a + dir * 0.35;
          V(s0, s1, Math.min(sb, sb + dir * 0.45), Math.max(sb, sb + dir * 0.45), ty + 0.42, ty + 0.5, M.seat);
          V(s0, s1, Math.min(sb + dir * 0.45, sb + dir * 0.52), Math.max(sb + dir * 0.45, sb + dir * 0.52), ty + 0.5, ty + 1.0, M.seat);
          V(s0, s1, Math.min(a + dir * 0.05, a + dir * 0.12), Math.max(a + dir * 0.05, a + dir * 0.12), ty, ty + 0.75, d.auditorium ? 't:wood:#6b4a2e' : M.wood);
        }
      }
      // side panels (ochre grooved wood, research E)
      for (const u of [u0 + 0.12, u1 - 0.16]) V(u, u + 0.04, v0 + 0.3, v1 - 0.3, y + 1.0, y + 2.6, M.panel);
    };

    // corridor walls of the cross-corridors (through the room zone), with ceilings and lights
    const crossCorr = (k) => {
      const { u0, u1, v0, v1 } = k;
      const west = k.p.side < 0;
      const end = (v) => (west ? Math.min(Rw(v), Ew(v) - 3.5) : Math.max(Re(v), Ee(v) + 3.5)); // stop at the colonnade
      for (const v of [v0, v1]) kit.wall(west ? u0 + 0.2 : end(v), v, west ? end(v) : u1 - 0.2, v, Y1, C1, M.wall, { thick: 0.25 });
      const a = west ? u0 + 0.2 : end(v0); const b = west ? end(v0) : u1 - 0.2;
      lights(a, b, v0 + 1, v1 - 1, C1);
      inlayFrame(a + 0.5, b - 0.5, v0 + 0.6, v1 - 0.6, Y1); // continuous border bands, as in the rooms
      plate(k.name.replace(/ \(.*/, ''), west ? a + 0.6 : b - 0.6, v0 + 0.15, Y1 + 2.3, [0, 1], 1.4, 0.3, '#7a2622', '#f6ecd2');
    };
    for (const [zone, list] of [...westRooms, ...eastRooms]) kit.layer(zone, () => { for (const r of list) if (roomBox(r)) room(r); });
    // lecture theatres: 6164 (west, behind the gameplay LT 6163) and the east bow-tie pair 6109 / 6110
    kit.layer('w-lt', () => {
      lt({ n: '6164', u0: 6.2, u1: 26, v0: 92.5, v1: 109.2, door: 'u1', doorAt: 12.5, stage: 'v1', title: 'Lecture Theatre' });
      // the lobby by the gameplay Lecture Theatre (6163) and the foyer to the canopy stair
      lights(17.8, 26, 110.5, 127.5, C1);
      plate('6163', 18.2, 121, Y1 + 2.2, [1, 0], 0.62, 0.2);
      plate('Lecture Theatre 6163', 18.2, 118.5, Y1 + 2.6, [1, 0], 1.9, 0.36, '#7a2622', '#f6ecd2');
      kit.wall(14.2, 128.1, 26, 128.1, Y1, C1, M.wall, { thick: 0.25 });
    });
    kit.layer('e-lt', () => {
      lt({ n: '6109', u0: 53, u1: 73, v0: 72.4, v1: 88.3, door: 'u0', doorAt: 11.7, stage: 'v1', title: 'Lecture Theatre' });
      lt({ n: '6110', u0: 53, u1: 73, v0: 88.7, v1: 104.6, door: 'u0', doorAt: 4.3, stage: 'v0', title: 'J.C. Chaudhry Auditorium', auditorium: true });
    });
    kit.layer('cross', () => { for (const k of corridors) crossCorr(k); });
    kit.layer('e-tut', () => {
      // the lobby round the Tutorial Room (gameplay classroomB) between Portal 04 and the 6120 wing
      lights(Re(195) + 1, 72, 196, 211, C1);
      plate('Tutorial Room', 63.5, 211.6, Y1 + 2.5, [0, 1], 1.6, 0.32, '#7a2622', '#f6ecd2');
    });

    // level -02: rooms behind the lower colonnades and the dog-leg stairs up to the galleries (S5, S6)
    const band = (zone, list, side) => kit.layer(zone, () => {
      for (const r of list) room({ ...r, y: Y2, floor: true });
      if (side < 0) {
        kit.slab(16, Rw(150), STAIR_FOOT, 182, Y1, M.kota, { thick: 0.4, holes: [this._sw = kit.dogleg(19.9, Rw(150), 177.6, 181.7, Y2, Y1, { along: 'u', reverse: true, name: 'Stair S6 (-02 to -01, west)', rail: M.maroon, wall: M.buff })] });
        const h = this._sw; // the hole's sides at -01: walls up to the ceiling round the stairwell
        kit.wall(h.u0 - 0.2, h.v0 - 0.2, h.u1, h.v0 - 0.2, Y1, C1, M.wall, { thick: 0.2 }); kit.wall(h.u0 - 0.2, h.v1 + 0.2, h.u1, h.v1 + 0.2, Y1, C1, M.wall, { thick: 0.2 }); kit.wall(h.u0 - 0.2, h.v0 - 0.2, h.u0 - 0.2, h.v1 + 0.2, Y1, C1, M.wall, { thick: 0.2 });
        B(16, 19.7, 177.3, 182, Y2, Y1 - 0.4, M.buff); // solid behind the stairwell
      } else {
        kit.slab(Re(150), 66, STAIR_FOOT, 185, Y1, M.kota, { thick: 0.4, holes: [this._se = kit.dogleg(Re(150), Re(150) + 6, 180.5, 184.6, Y2, Y1, { along: 'u', name: 'Stair S5 (-02 to -01, east)', rail: M.maroon, wall: M.buff })] });
        const h = this._se;
        kit.wall(h.u0, h.v0 - 0.2, h.u1 + 0.2, h.v0 - 0.2, Y1, C1, M.wall, { thick: 0.2 }); kit.wall(h.u0, h.v1 + 0.2, h.u1 + 0.2, h.v1 + 0.2, Y1, C1, M.wall, { thick: 0.2 }); kit.wall(h.u1 + 0.2, h.v0 - 0.2, h.u1 + 0.2, h.v1 + 0.2, Y1, C1, M.wall, { thick: 0.2 });
        B(Re(150) + 6.3, 66, 180.3, 185, Y2, Y1 - 0.4, M.buff);
      }
    });
    band('w-02', [R('6065', 16, Rw(150), STAIR_FOOT + 0.2, 147, 'u1'), R('6066', 16, Rw(150), 147, 156.5, 'u1', 'office'), R('6067', 16, Rw(150), 156.5, 177.3, 'u1', 'lab', { title: 'Department of Mathematics' })], -1);
    band('e-02', [R('6013', Re(150), 66, STAIR_FOOT + 0.2, 152, 'u0'), R('6016', Re(150), 66, 152, 166, 'u0'), R('6017', Re(150), 66, 166, 180.3, 'u0', 'lab', { title: 'Management Studies Lab' })], 1);
    // the band's outer walls at -02 (against the fill) and the HoD plate of 6067 (research C3)
    kit.layer('w-02', () => { B(15.7, 16, STAIR_FOOT, 177.3, Y2, Y1 - 0.4, M.buff); plate('6067-H  HoD Mathematics', Rw(150) + 0.14, 172, Y2 + 2.2, [1, 0], 1.6, 0.26); });
    kit.layer('e-02', () => { B(66, 66.3, STAIR_FOOT, 180.3, Y2, Y1 - 0.4, M.buff); });
    plate('Economics & Finance  6165-I HoD', 26.14, 133, Y1 + 2.2, [1, 0], 2.0, 0.28);

    // signs at the portals and in the courtyard
    for (const p of portalDefs) {
      const top = p.side < 0 ? TOPW : TOPE; const au = top + p.side * 5.5;
      plate('NEW ACADEMIC BLOCK', au + p.side * 0.32, p.v, 6.65, [p.side, 0], 3.4, 0.5, '#f5e7b8', '#6b3a1a');
      plate(`Portal ${p.id}`, au + p.side * 0.32, p.v, 6.1, [p.side, 0], 1.6, 0.36, '#f5e7b8', '#6b3a1a');
    }
    plate('NAB · Level -01', 39, STAIR_TOP - 0.95, -1.0, [0, -1], 2.2, 0.36, '#2f3a33', '#f3efe6');
    plate('Level -02 · 6011-6070 · Mathematics', 39, STAIR_FOOT + 0.95, -1.0, [0, 1], 2.6, 0.36, '#2f3a33', '#f3efe6');

    // ---------- sign atlas: every plate in one texture and one material ----------
    {
      const COLS = 8; const ROWS = Math.max(1, Math.ceil(plates.length / COLS)); const CW = 512; const CHh = 128;
      kit.texture('nab-atlas', () => {
        const c = document.createElement('canvas'); c.width = COLS * CW; c.height = ROWS * CHh;
        const g = c.getContext('2d');
        plates.forEach((p, i) => {
          const x = (i % COLS) * CW; const y = Math.floor(i / COLS) * CHh;
          g.fillStyle = p.bg; g.fillRect(x, y, CW, CHh);
          g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 6; g.strokeRect(x + 3, y + 3, CW - 6, CHh - 6);
          g.fillStyle = p.fg; g.textAlign = 'center'; g.textBaseline = 'middle';
          let size = 74;
          do { g.font = `bold ${size}px Georgia, serif`; size -= 2; } while (g.measureText(p.text).width > CW * 0.9 && size > 12);
          g.fillText(p.text, x + CW / 2, y + CHh / 2 + 2);
        });
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
        return t;
      });
      plates.forEach((p, i) => {
        const col = i % COLS; const row = Math.floor(i / COLS);
        const g = new THREE.PlaneGeometry(p.w, p.h);
        const uv = g.attributes.uv;
        for (let k = 0; k < uv.count; k++) uv.setXY(k, (col + uv.getX(k)) / COLS, 1 - (row + 1 - uv.getY(k)) / ROWS);
        g.rotateY(Math.atan2(p.f[0], p.f[1]));
        g.translate(p.u + p.f[0] * 0.02, p.y + p.h / 2, p.v + p.f[1] * 0.02);
        kit.layer(p.layer, () => kit.mesh(g, 'x:nab-atlas'));
      });
    }

    // floating labels over the portals and the courtyard
    for (const p of portalDefs) kit.label(p.name, (p.side < 0 ? TOPW : TOPE) + p.side * 2, p.v, 10.5, { height: 0.5 });
    kit.label('NAB Courtyard (Snake Path)', 38.8, 60, 2.5, { height: 0.5 });
    // where the explorer and tests can find things
    this.spots = { portals: portalDefs.map((p) => ({ id: p.id, v: p.v, side: p.side, foot: p.foot })) };
  },

  // world [x, z] of a local point
  w2(kit, u, v) { const p = kit.world(u, v); return [p.x, p.z]; },
};
