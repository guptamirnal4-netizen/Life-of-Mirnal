import test from 'node:test';
import assert from 'node:assert/strict';
import { NavGraph } from '../js/world/nav.js';
import { BITS_CAMPUS } from '../data/bits-campus.js';

function inPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i]; const [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

// Every 2 m along the start → waypoints polyline, `bad` must never be true.
function sampleRoute(start, pts, bad) {
  let prev = start;
  for (const p of pts) {
    const len = Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    for (let t = 0; t <= len; t += 2) {
      const x = prev[0] + ((p[0] - prev[0]) * t) / (len || 1); const z = prev[1] + ((p[1] - prev[1]) * t) / (len || 1);
      if (bad(x, z)) return [x, z];
    }
    prev = p;
  }
  return null;
}

test('A* goes around a building on the road ring instead of through it', () => {
  // a 40 × 40 block with a road ring 5 m outside it
  const block = [[0, 0], [40, 0], [40, 40], [0, 40]];
  const ring = { pts: [[-5, -5], [45, -5], [45, 45], [-5, 45], [-5, -5]] };
  const blocked = (x, z) => x > -0.5 && x < 40.5 && z > -0.5 && z < 40.5;
  const g = new NavGraph([ring], blocked);
  const a = [-8, 20]; const b = [48, 20];
  assert.ok(!g.clear(a, b), 'the straight line is blocked');
  const route = g.route(a, b);
  assert.deepEqual(route.at(-1), b);
  assert.equal(sampleRoute(a, route, blocked), null);
});

test('extra links (a passage through a building) become shortcuts', () => {
  const block = (x, z) => x > -0.5 && x < 40.5 && z > -0.5 && z < 40.5 && !(z > 18 && z < 22);
  const ring = { pts: [[-5, -5], [45, -5], [45, 45], [-5, 45], [-5, -5]] };
  const g = new NavGraph([ring], block);
  g.addLink([-2, 20], [42, 20]);
  const route = g.route([-8, 20], [48, 20]);
  const len = route.reduce((acc, p, i) => acc + Math.hypot(p[0] - (i ? route[i - 1][0] : -8), p[1] - (i ? route[i - 1][1] : 20)), 0);
  assert.ok(len < 70, `uses the passage (route length ${len.toFixed(1)} m)`);
  assert.equal(sampleRoute([-8, 20], route, block), null);
});

test('on the real BITS map, routes between landmarks stay out of every building footprint', () => {
  const B = BITS_CAMPUS.buildings.filter((b) => b.inCampus).map((b) => {
    const xs = b.outer.map((p) => p[0]); const zs = b.outer.map((p) => p[1]);
    return { ...b, minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
  });
  const inside = (x, z) => B.some((b) => x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ && inPoly(x, z, b.outer) && !b.holes.some((h) => inPoly(x, z, h)));
  const g = new NavGraph(BITS_CAMPUS.roads, inside);
  assert.ok(g.nodes.length > 1000);
  const poi = (n) => { const p = BITS_CAMPUS.pois.find((q) => q.name === n); return [p.x, p.z]; };
  // Krishna Bhawan's west side → SAC, → C'not, → the Rotunda, → Med-C
  const hostel = [96, 122];
  for (const name of ['Student Activities Center', "C'not", 'Rotunda', 'Med-C']) {
    let goal = poi(name);
    // POIs inside a footprint: stand at the nearest point outside it
    for (let r = 2; inside(goal[0], goal[1]) && r < 80; r += 2) {
      const p = poi(name);
      goal = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => [p[0] + Math.cos((k * Math.PI) / 4) * r, p[1] + Math.sin((k * Math.PI) / 4) * r]).find(([x, z]) => !inside(x, z)) || goal;
    }
    const route = g.route(hostel, goal);
    const hit = sampleRoute(hostel, route, inside);
    assert.equal(hit, null, `${name}: route enters a building at ${hit}`);
  }
});
