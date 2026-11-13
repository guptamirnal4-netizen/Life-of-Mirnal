import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Tree crowns for the campus roads: broad, flat-topped canopies (khejri, neem, babool). Both versions carry a
// vertex-colour gradient (shaded underneath, sunlit on top) that multiplies the per-tree green, so a crown reads
// as a rounded mass even in flat light. 'near' is a cluster of rounded clumps for trees close to the camera;
// 'far' is the old single faceted crown, a sixth of the triangles, for everything beyond.
const GRADE = (y, y0, y1) => 0.62 + 0.55 * THREE.MathUtils.smoothstep(y, y0, y1);

function shade(geo, y0, y1, tint = 1) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const p = g.attributes.position;
  const c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const v = GRADE(p.getY(i), y0, y1) * tint;
    c[i * 3] = v; c[i * 3 + 1] = v; c[i * 3 + 2] = v * 0.96;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  g.deleteAttribute('uv');
  return g;
}

export function crownGeometry(kind) {
  if (kind === 'far') {
    const g = new THREE.IcosahedronGeometry(2.6, 0);
    g.scale(1.25, 0.72, 1.25);
    g.translate(0, 4.4, 0);
    return shade(g, 3.0, 5.6);
  }
  // [x, y, z, radius, brightness]: a wide low mass, four clumps around it and one on top
  const clumps = [[0, 4.25, 0, 2.0, 0.95], [1.55, 4.15, 0.5, 1.45, 1.02], [-1.45, 4.1, -0.6, 1.5, 0.98], [0.4, 4.0, -1.55, 1.35, 1.0], [-0.5, 4.05, 1.5, 1.4, 1.04], [0.15, 5.0, 0.1, 1.45, 1.08]];
  const parts = clumps.map(([x, y, z, r, b]) => {
    const g = new THREE.IcosahedronGeometry(r, 1);
    g.scale(1.15, 0.72, 1.15);
    g.translate(x, y, z);
    return shade(g, 3.0, 5.9, b);
  });
  return mergeGeometries(parts);
}
