// Exports the built BITS campus's collision geometry for the paintball server (which cannot run the browser's
// campus builder) and the browser's paintball prediction. Re-run it whenever a campus module changes
// (js/world/bits-world.js, js/world/buildings/*, js/world/hostel.js, comb-hostel.js, data/bits-campus.js):
//
//   node dev/export-campus-collision.mjs
//
// It starts the static dev server on a free port, opens the game in headless Chrome (all building modules), reads
// window.__game.campus (colliders, trees, sunken courts) and writes, deterministically:
//   js/paintball/data/campus-collision.bin   gzip of the encoded geometry (js/paintball/geometry.js)
//   js/paintball/data/campus-collision.json  header: version, hash of the decoded bytes, boundary, pits, water
//   js/paintball/data/campus-probes.json     life-sim walks (stairs, a wall) the paintball sim is tested against
// Then run `node dev/build-royale-spots.mjs` (landing and supply registries depend on the geometry) and
// `npm test` (tests/paintball-campus.test.js checks the hash and the registries).
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { encodeGeometry, hashBytes, decodeGeometry, polyBox, GEO_VERSION } from '../js/paintball/geometry.js';
import { BITS_CAMPUS as D } from '../data/bits-campus.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'js/paintball/data');
fs.mkdirSync(OUT, { recursive: true });
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => res(p)); }); });
const PORT = await freePort();
const srv = spawn('node', ['dev/server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'] });
process.on('exit', () => srv.kill());
await new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('dev server did not start')), 15000); srv.stdout.on('data', (d) => { if (String(d).includes(`localhost:${PORT}`)) { clearTimeout(t); res(); } }); });

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
page.setDefaultTimeout(180000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${PORT}/?explore`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game?.explorer && window.__game.campus?.modules, null, { timeout: 180000 });
await page.waitForTimeout(500);

const bb = polyBox(D.boundary); const M = 30;
const raw = await page.evaluate(([x0, x1, z0, z1]) => {
  const c = window.__game.campus;
  const boxes = []; const trees = []; let skipped = 0; let off = 0;
  for (const k of c.allColliders ? c.colliders.concat(c.classroomColliders || []) : c.colliders) {
    if (k.enabled === false) { off++; continue; }
    if (k.maxX < x0 || k.minX > x1 || k.maxZ < z0 || k.minZ > z1) { skipped++; continue; }
    if (k.tree) trees.push([(k.minX + k.maxX) / 2, (k.minZ + k.maxZ) / 2, (k.maxX - k.minX) / 2, k.minY, k.maxY - k.minY]);
    else boxes.push([k.minX, k.maxX, k.minZ, k.maxZ, k.minY, k.maxY, k.walkable ? 1 : 0]);
  }
  // doorways people walk through (building entrances, NAB portals, room doors): the spot builder uses them to reach
  // interiors its grid would miss
  const r2 = (p) => [+(p.x ?? p[0]).toFixed(2), +(p.z ?? p[1]).toFixed(2)];
  const links = [];
  for (const { kit } of c.modules) for (const [a, b] of kit.navLinks) links.push([r2(a), r2(b)]);
  for (const H of c.hostels) if (H.entrance?.out && H.entrance?.inside) links.push([r2(H.entrance.out), r2(H.entrance.inside)]);
  for (const r of c.roomList || []) { if (r.exit && r.outside) links.push([r2(r.exit), r2(r.outside)]); if (r.outside && r.inside) links.push([r2(r.outside), r2(r.inside)]); }
  for (const p of c.passages || []) links.push([r2(p.a), r2(p.b)]);
  return { boxes, trees, skipped, off, links, pits: c.pits.map((p) => ({ y: p.y, poly: p.poly.map(([x, z]) => [+x.toFixed(3), +z.toFixed(3)]) })), modules: c.modules.map((m) => m.m.id) };
}, [bb.minX - M, bb.maxX + M, bb.minZ - M, bb.maxZ + M]);

// ---------- the life-sim player's own walks (js/world/player.js), stepped in the page at 60 Hz ----------
// Each probe: a start, a list of waypoints (steering towards each in turn, as the browser tests do), and where the
// game's own player ended up. tests/mp checks the paintball sim reaches the same floor.
const probes = await page.evaluate(() => {
  const G = window.__game; const c = G.campus; const P = G.player;
  const kit = (id) => c.modules.find((m) => m.m.id === id).kit;
  const run = (name, start, y, wps, { walk = false, expect = null } = {}) => {
    P.bike = false; P.frozen = false; P.seated = null; P.enabled = true;
    P.place(start.clone ? start.clone() : start, 0); P.pos.y = y; P.vel.set(0, 0, 0); P.velY = 0;
    P.keys.clear(); P.keys.add('KeyW'); if (walk) P.keys.add('ShiftLeft');
    const dt = 1 / 60; const path = [[+P.pos.x.toFixed(3), +P.pos.y.toFixed(3), +P.pos.z.toFixed(3)]];
    let steps = 0;
    for (const w of wps) {
      let still = 0; let last = null;
      for (let k = 0; k < 60 * 25; k++) {
        const dx = w[0] - P.pos.x; const dz = w[1] - P.pos.z; const d = Math.hypot(dx, dz);
        if (d < 0.25) break;
        P.yaw = Math.atan2(-dx, -dz); P.pitch = 0;
        c.nearPos = P.pos;
        P.update(dt, c.allColliders());
        steps++;
        if (steps % 15 === 0) path.push([+P.pos.x.toFixed(3), +P.pos.y.toFixed(3), +P.pos.z.toFixed(3)]);
        if (last && Math.hypot(P.pos.x - last.x, P.pos.z - last.z) < 0.002) { if (++still > 40) break; } else still = 0;
        last = { x: P.pos.x, z: P.pos.z };
      }
    }
    // settle
    P.keys.clear();
    for (let k = 0; k < 30; k++) { c.nearPos = P.pos; P.update(dt, c.allColliders()); }
    P.enabled = false;
    const end = [+P.pos.x.toFixed(3), +P.pos.y.toFixed(3), +P.pos.z.toFixed(3)];
    path.push(end);
    return { name, start: [+start.x.toFixed(3), +y.toFixed(3), +start.z.toFixed(3)], waypoints: wps.map(([x, z]) => [+x.toFixed(3), +z.toFixed(3)]), end, expect, path };
  };
  const out = [];
  const L = kit('library'); const N = kit('nab');
  const Lw = (u, v) => { const p = L.world(u, v); return [p.x, p.z]; };
  const Nw = (u, v) => { const p = N.world(u, v); return [p.x, p.z]; };
  out.push(run('Library: across the forecourt and up the fan steps onto the portico', L.world(-62, 0), 0, [Lw(-56, 0), Lw(-45, 0)], { expect: { y: 0.6 } }));
  out.push(run('Library: south twin stair up to the bridge', L.world(-36, 3.25), 0.6, [Lw(-32.4, 3.25), Lw(-23.7, 3.25)], { expect: { y: 5.2 } }));
  out.push(run('Library: south twin stair back down to the foyer', L.world(-23.5, 8.7), 5.2, [Lw(-23.3, 3.25), Lw(-24.9, 3.25), Lw(-32.4, 3.25)], { expect: { y: 0.6 } }));
  out.push(run('Library: the foyer north wall blocks', L.world(-31.5, -5), 0.6, [Lw(-31.5, -14)], { expect: { y: 0.6, wall: true } }));
  out.push(run('NAB: Portal 02 down the stair to the courtyard (level -01, y -4.5)', N.world(104, 68.2), 0, [Nw(95.5, 68.2), Nw(86.5, 68.2), Nw(80, 68.2), Nw(62, 68.6), Nw(44, 68.6)], { expect: { y: -4.5 } }));
  out.push(run('NAB: back up the Portal 02 stair to grade', N.world(44, 68.6), -4.5, [Nw(62, 68.6), Nw(80, 68.2), Nw(86.5, 68.2), Nw(95.5, 68.2), Nw(104, 68.2)], { expect: { y: 0 } }));
  // a Bhawan's main stair (tests/browser/stairsdown.mjs): first floor (3.3) down to the ground floor
  const H = c.hostels[0];
  const s = H.ve + 3.4;
  const Hw = (u, v) => { const p = H.world(u, v); return [p.x, p.z]; };
  // the same walk as stairsdown.mjs, as directions held for a time at walking pace
  const dirRun = (name, u, v, y, legs) => {
    P.bike = false; P.frozen = false; P.seated = null; P.enabled = true;
    P.place(H.world(u, v, y), 0); P.pos.y = y; P.vel.set(0, 0, 0); P.velY = 0;
    P.keys.clear(); P.keys.add('KeyW'); P.keys.add('ShiftLeft');
    const path = [[+P.pos.x.toFixed(3), +P.pos.y.toFixed(3), +P.pos.z.toFixed(3)]];
    const dt = 1 / 60; let steps = 0;
    for (const [dir, ms] of legs) {
      const d = { '+u': H.eu, '-u': [-H.eu[0], -H.eu[1]], '+v': H.ev, '-v': [-H.ev[0], -H.ev[1]] }[dir];
      P.yaw = Math.atan2(-d[0], -d[1]);
      for (let k = 0; k < Math.round(ms / 1000 * 60); k++) { c.nearPos = P.pos; P.update(dt, c.allColliders()); if (++steps % 15 === 0) path.push([+P.pos.x.toFixed(3), +P.pos.y.toFixed(3), +P.pos.z.toFixed(3)]); }
    }
    P.keys.clear(); for (let k = 0; k < 30; k++) { c.nearPos = P.pos; P.update(dt, c.allColliders()); }
    P.enabled = false;
    const end = [+P.pos.x.toFixed(3), +P.pos.y.toFixed(3), +P.pos.z.toFixed(3)]; path.push(end);
    return { name: `${H.name}: ${name}`, start: path[0], waypoints: null, legs, end, path, expect: { y: end[1] } };
  };
  out.push(dirRun('main stair, first floor down to the ground floor', 5.6, s + 2.6, 3.3, [['-u', 2600], ['-v', 1000], ['+u', 2600], ['+u', 1200]]));
  out.push(dirRun('main stair, roof down to the first floor', 5.6, s + 2.6, 6.6, [['-u', 2600], ['-v', 1000], ['+u', 2600], ['+u', 1200]]));
  return out;
});

// ---------- encode, hash, write ----------
const boxes = raw.boxes.map(([minX, maxX, minZ, maxZ, minY, maxY, w]) => ({ minX, maxX, minZ, maxZ, minY, maxY, walkable: !!w }));
const trees = raw.trees.map(([x, z, r, y0, h]) => ({ x, z, r, y0, h }));
const bytes = encodeGeometry(boxes, trees);
const hash = hashBytes(bytes);
const gz = zlib.gzipSync(bytes, { level: 9 });
const sg = D.areas.find((a) => a.kind === 'shivganga');
const header = {
  version: GEO_VERSION,
  hash,
  bytes: bytes.length,
  gzBytes: gz.length,
  units: 'metres; x east, z south, y up; origin the Rotunda (research/COORDINATES.md)',
  counts: { boxes: new DataView(bytes.buffer).getUint32(0, true), trees: new DataView(bytes.buffer).getUint32(4, true), outsideBoundary: raw.skipped, disabled: raw.off },
  modules: raw.modules,
  boundary: D.boundary,
  pits: raw.pits,
  water: D.areas.filter((a) => a.kind === 'water' || a.kind === 'pool').map((a) => ({ name: a.name || a.kind, poly: a.poly })),
  rings: [{ name: 'Shiv Ganga canal', c: (sg?.water || { c: [128, 823] }).c, r: (sg?.water || { r: [54, 66] }).r }],
  links: raw.links,
};
// sanity: decoding gives the same counts
const geo = decodeGeometry(bytes, header);
fs.writeFileSync(path.join(OUT, 'campus-collision.bin'), gz);
fs.writeFileSync(path.join(OUT, 'campus-collision.json'), `${JSON.stringify(header, null, 1)}\n`);
fs.writeFileSync(path.join(OUT, 'campus-probes.json'), `${JSON.stringify({ hash, probes }, null, 0)}\n`);
console.log(JSON.stringify({ hash, boxes: geo.n, trees: geo.m, bytes: bytes.length, gz: gz.length, skipped: raw.skipped, disabled: raw.off, modules: raw.modules.length, probes: probes.map((p) => `${p.name} → y ${p.end[1]}`), errors }, null, 1));
await browser.close();
srv.kill();
process.exit(errors.length ? 1 : 0);
