// Campus environment test (js/world/bits-world.js: roads, lamps, lawns, trees, Shiv Ganga, gates, the wall, the
// Saraswati Mandir, statues, the Dakota). Checks the Clock Tower → Saraswati Mandir sight line by ray casting, then
// walks: up the temple's front stair, through the porch into the mandapa to the sanctum rail and back down; across
// a Shiv Ganga bridge onto the island and up the statue platform; through the Main Gate; against the gate leaves,
// the boundary wall, the canal, the temple balustrade and the Dakota. Real key presses, world coordinates.
// node tests/browser/environment.mjs [OUTDIR] [URL]   (dev server: PORT=8108 node dev/server.mjs)
import { chromium } from 'playwright-core';
const OUT = process.argv[2] || '.';
const BASE = process.argv[3] || 'http://localhost:8108/';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(90000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const fails = [];
const check = (ok, what) => { console.log(ok ? 'PASS' : 'FAIL', what); if (!ok) fails.push(what); };
const g = (fn, arg) => page.evaluate(fn, arg);
const near = (a, b, tol = 0.15) => Math.abs(a - b) < tol;
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });

// world-frame movement: place, where, walk towards (x, z) steering every 150 ms
const at = (x, z, y, dx = 0, dz = 1) => g(([x, z, y, dx, dz]) => { const G = window.__game; G.player.place(new G.player.pos.constructor(x, y, z), Math.atan2(-dx, -dz)); G.player.pos.y = y; G.player.velY = 0; }, [x, z, y, dx, dz]);
const where = () => g(() => { const p = window.__game.player.pos; return { x: +p.x.toFixed(2), z: +p.z.toFixed(2), y: +p.y.toFixed(2) }; });
const go = async (x, z, { ms = 20000, near: nr = 0.5, slow = false } = {}) => {
  const t0 = Date.now();
  if (slow) await page.keyboard.down('ShiftLeft');
  await page.keyboard.down('KeyW');
  let hi = -Infinity;
  for (;;) {
    const r = await g(([x, z]) => { const G = window.__game; const p = G.player.pos; const dx = x - p.x; const dz = z - p.z; const d = Math.hypot(dx, dz); if (d > 0.05) G.player.yaw = Math.atan2(-dx, -dz); return [d, p.y]; }, [x, z]);
    hi = Math.max(hi, r[1]);
    if (r[0] < nr || Date.now() - t0 > ms) break;
    await page.waitForTimeout(150);
  }
  await page.keyboard.up('KeyW');
  if (slow) await page.keyboard.up('ShiftLeft');
  await page.waitForTimeout(350);
  return { ...(await where()), hi: +hi.toFixed(2) };
};
const route = async (pts, opts) => { let w; let hi = -Infinity; for (const [x, z] of pts) { w = await go(x, z, opts); hi = Math.max(hi, w.hi); } return { ...w, hi }; };
// the temple's own frame (u across, v along; v = 0 is the north edge of the plinth)
const T = (u, v) => g(([u, v]) => { const p = window.__game.campus.templeKit.world(u, v); return [p.x, p.z]; }, [u, v]);
const TL = () => g(() => { const G = window.__game; const p = G.player.pos; const [u, v] = G.campus.templeKit.local(p.x, p.z); return { u: +u.toFixed(2), v: +v.toFixed(2), y: +p.y.toFixed(2) }; });

await page.goto(`${BASE}?explore`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game?.explorer && window.__game.campus?.modules, null, { timeout: 90000 });
await page.waitForTimeout(1500);
await g(() => { const c = document.getElementById('game'); Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => c }); });

// ---------- data checks ----------
const info = await g(() => {
  const c = window.__game.campus;
  const cls = {}; for (const v of c.roadCls.values()) cls[v] = (cls[v] || 0) + 1;
  let treesOnAxis = 0; let trees = 0;
  for (const list of c.treeGrid.values()) for (const [x, z] of list) { trees++; if (c.onAxis(x, z)) treesOnAxis++; }
  return {
    cls, lamps: c.lampCount, lampKinds: c.lampPts.reduce((a, [, , k]) => ({ ...a, [k]: (a[k] || 0) + 1 }), {}), lampsOnAxis: c.lampPts.filter(([x, z]) => c.onAxis(x, z)).length,
    trees, treesOnAxis, ashoka: c.ashokaCount, zebras: c.zebraCount, wall: c.wallPieces, sideGates: c.sideGates,
    wallOnAxis: c.colliders.filter((q) => q.wall && !q.building && c.onAxis((q.minX + q.maxX) / 2, (q.minZ + q.maxZ) / 2)).length,
    shiv: c.shivGanga, gate: c.gatePos && [c.gatePos.x, c.gatePos.z], temple: !!c.templeKit, rooms: c.templeKit?.rooms.map((r) => r.id),
  };
});
console.log('info', JSON.stringify(info));
check(info.cls.avenue >= 15 && info.cls.lane >= 10 && info.cls.drive === 1, `two road classes plus the drive ${JSON.stringify(info.cls)}`);
check(info.lamps > 250 && info.lampKinds.pole > 150 && info.lampKinds.lantern > 25, `street lights along the service roads (${info.lamps})`);
check(info.lampsOnAxis === 0 && info.treesOnAxis === 0 && info.wallOnAxis === 0, `no lamp, tree or wall in the Clock Tower → Mandir wedge (lamps ${info.lampsOnAxis}, trees ${info.treesOnAxis}, wall ${info.wallOnAxis})`);
check(info.zebras >= 12, `zebra crossings at the avenue junctions (${info.zebras})`);
check(info.wall > 1500 && info.sideGates >= 2, `boundary wall (${info.wall} pieces) with side gates (${info.sideGates})`);
check(info.shiv && info.shiv.r[0] === 54 && info.shiv.r[1] === 66, 'Shiv Ganga water at r 54–66');

// ---------- the sight line: rays from the porch to the temple hit nothing on the way ----------
const sight = await g(async () => {
  const THREE = await import('three');
  const c = window.__game.campus; const K = c.templeKit;
  const meshes = [];
  c.root.traverseVisible((o) => { if ((o.isMesh || o.isInstancedMesh) && !o.isSprite) meshes.push(o); });
  const templeMeshes = new Set(); for (const grp of Object.values(K.groups)) grp.traverse((o) => templeMeshes.add(o));
  const out = [];
  for (const [ex, ez, ey] of [[-9.3, -40, 1.6], [-9.3, -45, 2.5], [-7, -44, 2.5], [-11.5, -44, 2.5]]) {
    for (const [u, v, y] of [[25.2, 47, 33], [25.2, 47, 26], [25.2, 47, 19], [25.2, 25, 16], [25.2, 47, 36]]) {
      const t = K.world(u, v, y);
      const eye = new THREE.Vector3(ex, ey, ez);
      const dir = t.clone().sub(eye); const dist = dir.length(); dir.normalize();
      const ray = new THREE.Raycaster(eye, dir, 0.3, dist + 5);
      const hits = ray.intersectObjects(meshes, false).filter((h) => !templeMeshes.has(h.object));
      const first = hits[0];
      out.push({ eye: [ex, ez, ey], target: [u, v, y], blocked: first ? { d: +first.distance.toFixed(1), at: [+first.point.x.toFixed(1), +first.point.y.toFixed(1), +first.point.z.toFixed(1)], name: first.object.name || first.object.parent?.name || first.object.type } : null });
    }
  }
  return out;
});
const blocked = sight.filter((s) => s.blocked);
for (const b of blocked) console.log('  blocked', JSON.stringify(b));
check(blocked.length === 0, `Clock Tower porch → Saraswati Mandir: ${sight.length - blocked.length}/${sight.length} rays clear`);
// the same view, as a picture (narrow lens from the porch)
await g(() => { const G = window.__game; G.explorer.walk(new G.player.pos.constructor(-9.3, 0.9, -44), 0); G.explorer.view = 'first'; });
await at(-9.3, -44, 0.9, 0.152, 0.988);
await g(() => { const G = window.__game; G.player.pitch = 0.015; const c = G.player.camera; c.userData.fov0 = c.fov; c.fov = 12; c.updateProjectionMatrix(); });
await page.waitForTimeout(1500);
await shot('env-sightline-zoom');
await g(() => { const G = window.__game; const c = G.player.camera; c.fov = c.userData.fov0; c.updateProjectionMatrix(); G.player.pitch = 0; });
await page.waitForTimeout(600);
await shot('env-sightline');
await g(() => { window.__game.explorer.view = 'third'; });

// ---------- Saraswati Mandir: front stair, terrace, base steps, porch, mandapa, the sanctum rail ----------
const C = 25.2;
let p = await T(C, -9);
await at(p[0], p[1], 0, 0.157, 0.988);
let [x, z] = await T(C, -5); let w = await go(x, z);
check(near(w.y, 0, 0.1), `temple walk at grade before the stair ${JSON.stringify(w)}`);
await shot('env-temple-stair');
[x, z] = await T(C, 4); w = await go(x, z);
let tl = await TL();
check(near(tl.y, 2.1) && tl.v > 2, `up the 13-riser front stair onto the terrace (y 2.1) ${JSON.stringify(tl)}`);
[x, z] = await T(C, 12.5); w = await go(x, z, { slow: true });
tl = await TL();
check(near(tl.y, 3.0) && tl.v > 11, `up the base steps into the porch (y 3.0) ${JSON.stringify(tl)}`);
[x, z] = await T(C, 22); w = await go(x, z);
tl = await TL();
const inMandapa = await g(() => { const G = window.__game; const p = G.player.pos; return G.campus.templeKit.roomAt(p.x, p.z, p.y)?.id; });
check(inMandapa === 'temple-mandapa' && near(tl.y, 3.0), `through the door into the mandapa (${inMandapa}) ${JSON.stringify(tl)}`);
await shot('env-temple-mandapa');
[x, z] = await T(C, 39); w = await go(x, z, { ms: 5000 });
tl = await TL();
check(tl.v < 35.2 && tl.v > 30, `the rail holds at the sanctum door ${JSON.stringify(tl)}`);
await shot('env-temple-sanctum');
[x, z] = await T(C - 8.9, 21.1); w = await go(x, z, { ms: 4000 });
tl = await TL();
check(tl.u > C - 8.2, `the mandapa wall holds (window sill) ${JSON.stringify(tl)}`);
[x, z] = await T(C, 22); await go(x, z);
[x, z] = await T(C, 13); await go(x, z);
[x, z] = await T(C, 6); w = await go(x, z, { slow: true });
tl = await TL();
check(near(tl.y, 2.1), `back down the base steps to the terrace ${JSON.stringify(tl)}`);
[x, z] = await T(-4, 4); w = await go(x, z, { ms: 5000 });
tl = await TL();
check(tl.u > 0 && near(tl.y, 2.1), `the terrace balustrade holds ${JSON.stringify(tl)}`);
[x, z] = await T(C, 4); await go(x, z);
[x, z] = await T(C, -8); w = await go(x, z);
tl = await TL();
check(near(tl.y, 0, 0.1) && tl.v < -6, `back down the front stair to the walk ${JSON.stringify(tl)}`);

// ---------- Shiv Ganga: across the east bridge onto the island, up the statue platform, the canal blocks ----------
const [cx, cz] = info.shiv.c;
await at(cx + 71, cz, 0, -1, 0);
w = await route([[cx + 62, cz], [cx + 52, cz], [cx + 49, cz]]);
check(w.x < cx + 50 && w.hi > 0.4 && near(w.y, 0, 0.1), `across the east bridge (deck y ${w.hi}) onto the island ${JSON.stringify(w)}`);
await shot('env-shivganga-island');
const plat = await g(() => { const c = window.__game.campus; const b = c.buildings.find((q) => !q.name && q.bb.minX > 150 && q.bb.minX < 170 && q.bb.minZ > 800 && q.bb.maxZ < 830); return b && [(b.bb.minX + b.bb.maxX) / 2, (b.bb.minZ + b.bb.maxZ) / 2, (b.bb.maxX - b.bb.minX) / 2]; });
w = await route([[plat[0] + plat[2] + 3, plat[1]], [plat[0] + 2.9, plat[1]]], { slow: true });
check(w.y > 1.7, `up the statue platform's tiers to the Shiva (y ${w.y}) ${JSON.stringify(w)}`);
await shot('env-shiva');
w = await route([[plat[0] + plat[2] + 3, plat[1]], [cx + 49, cz], [cx + 62, cz], [cx + 71, cz]]);
check(w.x > cx + 69 && near(w.y, 0, 0.1), `back across the bridge ${JSON.stringify(w)}`);
await at(cx, cz - 71, 0, 0, 1);
w = await go(cx, cz - 40, { ms: 5000 });
check(Math.hypot(w.x - cx, w.z - cz) > 64, `the canal blocks where there is no bridge ${JSON.stringify(w)}`);

// ---------- Main Gate, the leaves, the wall ----------
const [GX, GZ] = info.gate;
await at(GX + 16, GZ, 0, -1, 0);
await page.waitForTimeout(300);
await shot('env-main-gate');
w = await go(GX - 14, GZ);
check(w.x < GX - 12 && near(w.y, 0, 0.12), `in through the Main Gate ${JSON.stringify(w)}`);
await at(GX + 4, GZ + 6.6, 0, -1, 0);
w = await go(GX - 4, GZ + 6.6, { ms: 4000 });
check(w.x > GX, `the shut gate leaves block ${JSON.stringify(w)}`);
await at(476, 92, 0, 0, -1);
w = await go(476, 66, { ms: 6000 });
check(w.z > 79, `the boundary wall blocks ${JSON.stringify(w)}`);

// ---------- avenues: kerbs are low, footpaths walkable; the Dakota is solid ----------
await at(150, 337, 0, 0, 1);
w = await go(150, 326, { ms: 6000 });
check(w.z < 327 && near(w.y, 0, 0.12), `across Gandhi Marg over the kerbs and footpaths ${JSON.stringify(w)}`);
const ac = await g(() => { const p = window.__game.campus.poi('Birla Aircraft'); return [p.x, p.z]; });
await at(ac[0] + 16, ac[1] - 6, 0, -1, 0);
await shot('env-dakota');
w = await go(ac[0] - 16, ac[1] - 6, { ms: 8000 });
check(w.x > ac[0] - 6, `the Dakota is solid ${JSON.stringify(w)}`);

console.log('ERRORS', JSON.stringify(errors.slice(0, 8)));
console.log(fails.length || errors.length ? `SOME FAILED (${fails.length})` : 'ALL PASS');
await browser.close();
process.exit(fails.length || errors.length ? 1 : 0);
