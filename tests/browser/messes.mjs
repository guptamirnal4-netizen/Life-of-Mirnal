// Messes walk-through (?explore&only=messes): into the VKB mess by both west doors, round the dining hall to the
// serving counter and the gameplay room, into the wash room; the walls, hatches and table rows block; the other
// messes are closed; the ANC yard through its gate to the stall counter; the C'not arcade (one step up) along the
// shops; screenshots; frame time against ?nomodules.
// node tests/browser/messes.mjs [OUTDIR] [URL]   (a dev server must be running; default http://localhost:8106/)
import { chromium } from 'playwright-core';
const OUT = process.argv[2] || '.';
const URL = process.argv[3] || 'http://localhost:8106/';
const ONLY = process.env.ONLY || '';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const fails = [];
const check = (ok, what) => { console.log(ok ? 'PASS' : 'FAIL', what); if (!ok) fails.push(what); };
const g = (fn, arg) => page.evaluate(fn, arg);
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

await page.goto(`${URL}?explore&only=messes`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game?.explorer && window.__game.campus?.modules, null, { timeout: 90000 });
await page.waitForTimeout(1500);
check(await g(() => window.__game.campus.modules.some((m) => m.m.id === 'messes')), 'messes module built');
await g(() => { const c = document.getElementById('game'); Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => c }); });
await g(() => { window.__k = window.__game.campus.modules.find((m) => m.m.id === 'messes').kit; });
const info = await g(() => { const k = window.__k; const C = window.__game.campus; const r = C.rooms.mess; return { adopted: k.vkb.adopted, off: k.vkb.collidersOff, hall: k.vkb.hall, wash: k.vkb.wash, seats: k.vkb.seats.length, spots: C.spots.mess.length, subs: k.subKits.length, room: [r.x0, r.x1, r.z0, r.z1, r.door.at], exit: [r.exit.x, r.exit.z], P: k.local(r.x0, r.door.at), canteen: C.interactables.find((i) => i.id === 'canteen')?.pos, cs: C.spots.canteen?.length }; });
console.log(JSON.stringify(info));
if (ONLY === 'info') { console.log('ERRORS', JSON.stringify(errors)); await browser.close(); process.exit(0); }

// ---------- helpers: place and walk in the VKB frame (k) or world ----------
const at = (u, v, du = 1, dv = 0, { world = false, kit = '__k' } = {}) => g(([u, v, du, dv, world, kit]) => {
  const Gm = window.__game; const k = window[kit]; const E = Gm.explorer;
  const p = world ? { x: u, z: v } : k.world(u, v, 0);
  const yaw = world ? Math.atan2(-du, -dv) : k.yaw(-du, -dv);
  if (!E.walking) E.walk(Gm.player.pos.clone().set(p.x, 0, p.z), yaw);
  Gm.player.pos.set(p.x, 0, p.z); Gm.player.yaw = yaw; Gm.player.vel.set(0, 0, 0);
}, [u, v, du, dv, world, kit]);
const where = (kit = '__k') => g((kit) => {
  const Gm = window.__game; const k = window[kit]; const p = Gm.player.pos; const [u, v] = k.local(p.x, p.z);
  return { u: +u.toFixed(2), v: +v.toFixed(2), y: +p.y.toFixed(2), x: +p.x.toFixed(2), z: +p.z.toFixed(2), game: Gm.campus.roomAt(p.x, p.z) };
}, kit);
const go = async (u, v, { world = false, timeout = 20000, kit = '__k' } = {}) => {
  await page.keyboard.down('KeyW');
  const t0 = Date.now(); let last = null; let still = 0; let d = 1e9;
  while (Date.now() - t0 < timeout) {
    const s = await g(([u, v, world, kit]) => {
      const Gm = window.__game; const k = window[kit]; const p = Gm.player.pos;
      const T = world ? { x: u, z: v } : k.world(u, v);
      const dx = T.x - p.x; const dz = T.z - p.z;
      Gm.player.yaw = Math.atan2(-dx, -dz); Gm.player.pitch = 0;
      return { d: Math.hypot(dx, dz), x: p.x, z: p.z };
    }, [u, v, world, kit]);
    d = s.d;
    if (d < 0.25) break;
    if (last && Math.hypot(s.x - last.x, s.z - last.z) < 0.01) { if (++still > 12) break; } else still = 0;
    last = s;
    await page.waitForTimeout(80);
  }
  await page.keyboard.up('KeyW');
  await page.waitForTimeout(250);
  return d < 0.5;
};
const route = async (name, pts, expect, opts = {}) => {
  let ok = true;
  for (const p of pts) ok = (await go(p[0], p[1], opts)) && ok;
  const w = await where(opts.kit);
  check(ok && (!expect || expect(w)), `${name} ${JSON.stringify(w)}`);
  return w;
};
const blocked = async (name, from, to, expect, opts = {}) => {
  await at(from[0], from[1], to[0] - from[0], to[1] - from[1], opts);
  await page.waitForTimeout(200);
  await go(to[0], to[1], { ...opts, timeout: 3500 });
  const w = await where(opts.kit);
  check(expect(w), `${name} ${JSON.stringify(w)}`);
};
// camera for screenshots: third-person in walk mode, or a map view from (x, y, z) at a target
const view = (cam, target) => g(([cam, target]) => { const E = window.__game.explorer; if (E.walking) E.toMap(false); E.fly = null; E.camera.position.set(...cam); E.controls.target.set(...target); E.controls.update(); }, [cam, target]);
const settle = (ms = 900) => page.waitForTimeout(ms);

const { P, hall, wash } = info;
const Pu = P[0]; const Pv = P[1];

// ---------- 1. VKB: in by the main west door, along the cross aisle to the counter ----------
await at(info.exit[0], info.exit[1], 1, 0, { world: true });
await settle(1200);
await shot('vkb-01-entrance');
await route('through the main west door into the hall', [[hall.u0 + 1.5, Pv]], (w) => w.u > hall.u0 && w.game === 'mess');
await settle(600);
await shot('vkb-02-hall-from-door');
await route('along the cross aisle to the serving counter', [[hall.u1 - 3.0, Pv]], (w) => w.game === 'mess' && w.u > hall.u1 - 3.5);
const near = await g(() => { const G = window.__game; const p = G.player.pos; const it = G.campus.interactables.find((i) => i.id === 'mess'); return Math.hypot(it.pos.x - p.x, it.pos.z - p.z); });
check(near < 2.2, `the 'mess' counter interactable is within reach (${near.toFixed(2)} m)`);
await g(() => { window.__game.player.yaw = window.__k.yaw(-1, 0); });
await settle(500);
await shot('vkb-03-serving-wall');
// hatches block: walk into the middle hatch past the counter's end
await blocked('the serving wall blocks (north of the counter)', [hall.u1 - 1.5, Pv - 6], [hall.u1 + 2, Pv - 6], (w) => w.u < hall.u1);
await blocked('a hatch blocks', [hall.u1 - 0.8, Pv - 4.0], [hall.u1 + 2, Pv - 2.4], (w) => w.u < hall.u1);
// ---------- 2. round the hall: west aisle, second door out and back in, south end ----------
await route('west aisle north to the kiosk', [[hall.u0 + 2.5, Pv], [hall.u0 + 2.5, hall.v0 + 1.2]], (w) => w.u < hall.u0 + 3);
await shot('vkb-04-north-end');
await route('into the wash room', [[12.6, hall.v0 + 0.8], [12.6, wash.v1 - 2]], (w) => w.v < wash.v1 && w.v > wash.v0);
await settle(500);
await g(() => { window.__game.player.yaw = window.__k.yaw(0, 1); });
await shot('vkb-05-wash-room');
await blocked('wash room north wall blocks', [9, wash.v0 + 1.5], [9, wash.v0 - 3], (w) => w.v > wash.v0);
await route('back into the hall', [[12.6, wash.v1 - 1], [12.6, hall.v0 + 1.2], [hall.u0 + 2.2, hall.v0 + 1.2]], (w) => w.v > hall.v0);
await route('down the west aisle to the second door', [[hall.u0 + 1.6, Pv], [hall.u0 + 1.6, Pv + 8.8]], (w) => Math.abs(w.v - (Pv + 8.8)) < 0.6);
await route('out through the second west door', [[-2.5, Pv + 8.8]], (w) => w.u < 0 && w.game === null);
await shot('vkb-06-second-door-outside');
await route('back in through the second door', [[hall.u0 + 1.5, Pv + 8.8]], (w) => w.u > hall.u0);
await blocked('the west wall blocks between the doors', [hall.u0 + 1.0, Pv + 4.5], [-3, Pv + 4.5], (w) => w.u > hall.u0 - 0.35);
await blocked('the west wall blocks from outside', [-3, Pv + 4.5], [hall.u0 + 2, Pv + 4.5], (w) => w.u < 0);
await blocked('table rows block a walk across them', [hall.u0 + 4, Pv + 3.5], [hall.u0 + 4, Pv + 9], (w) => w.v < Pv + 5);
// the gameplay seats: inside the room, on the hall's seats
const seats = await g(() => { const C = window.__game.campus; return C.spots.mess.map((p) => C.roomAt(p.x, p.z)); });
check(seats.length >= 12 && seats.every((r) => r === 'mess'), `${seats.length} NPC seats, all in the gameplay room`);
// a free walk out by the main door
await route('out of the main door', [[hall.u0 + 1.5, Pv], [-1.8, Pv - 0.3]], (w) => w.game === null && w.u < 0);
// ---------- 3. VKB shots ----------
await at(hall.u0 + 4.6, hall.v0 + 1.0, 0.3, 1);
await settle(1000);
await shot('vkb-07-hall-long-view');
await view([info.exit[0] - 40, 26, info.exit[1] + 30], [info.exit[0] + 18, 0, info.exit[1]]);
await settle(1500);
await shot('vkb-08-aerial');
await view([info.exit[0] - 24, 3, info.exit[1] + 14], [info.exit[0] + 6, 3, info.exit[1]]);
await settle(1200);
await shot('vkb-09-street');

// ---------- 4. closed messes: walls block ----------
const msg = await g(() => {
  const C = window.__game.campus; const out = {};
  for (const n of ['RP mess', 'Ram-Budh mess', 'Shankar Vyas Mess', 'Malviya Mess', 'Boys Canteen']) { const b = C.buildings.find((q) => q.name === n); out[n] = { c: b.outer.reduce((s, p) => [s[0] + p[0] / b.outer.length, s[1] + p[1] / b.outer.length], [0, 0]), module: b.module, bb: b.bb }; }
  return out;
});
for (const [n, b] of Object.entries(msg)) {
  check(b.module === 'messes', `${n} is built by the module`);
  const [cx, cz] = b.c; const sx = b.bb.minX - 6; // approach from the west at the centroid's z
  await blocked(`${n}: its wall blocks`, [sx, cz], [cx, cz], (w) => w.x < cx - 2, { world: true });
}
await view([msg['RP mess'].c[0] + 40, 30, msg['RP mess'].c[1] - 30], msg['RP mess'].c.length ? [msg['RP mess'].c[0], 0, msg['RP mess'].c[1]] : [0, 0, 0]);
await settle(1500); await shot('rp-aerial');
await view([msg['Malviya Mess'].c[0] + 10, 18, msg['Malviya Mess'].c[1] + 40], [msg['Malviya Mess'].c[0], 2, msg['Malviya Mess'].c[1]]);
await settle(1500); await shot('malviya-aerial');
await view([msg['Shankar Vyas Mess'].c[0] - 45, 6, msg['Shankar Vyas Mess'].c[1] + 10], [msg['Shankar Vyas Mess'].c[0], 3, msg['Shankar Vyas Mess'].c[1]]);
await settle(1500); await shot('sv-street');
await view([msg['Ram-Budh mess'].c[0] + 40, 8, msg['Ram-Budh mess'].c[1] + 20], [msg['Ram-Budh mess'].c[0], 2, msg['Ram-Budh mess'].c[1]]);
await settle(1500); await shot('rb-street');

// ---------- 5. ANC: through the gate to the counter ----------
const anc = await g(() => { const C = window.__game.campus; const k = window.__k.subKits.find((s) => s.lights.length && s.entrances.length === 0 && C.interactables.find((i) => i.id === 'canteen') && s.distance(C.interactables.find((i) => i.id === 'canteen').pos.x, C.interactables.find((i) => i.id === 'canteen').pos.z) < 30); window.__anc = k; const it = C.interactables.find((i) => i.id === 'canteen'); return { it: [it.pos.x, it.pos.z], staff: [C.spots.canteenStaff.x, C.spots.canteenStaff.z], seats: C.spots.canteen.length, local: k ? k.local(it.pos.x, it.pos.z) : null }; });
console.log('anc', JSON.stringify(anc));
check(anc.seats >= 8 && anc.local, `ANC rebuilt with ${anc.seats} seats`);
if (anc.local) {
  const [cu, cv] = anc.local;
  await at(cu - 18, cv, 1, 0, { kit: '__anc' });
  await settle(800);
  await shot('anc-01-gate');
  await route('ANC: through the gate across the yard to the counter', [[cu, cv]], (w) => Math.hypot(w.u - cu, w.v - cv) < 0.6, { kit: '__anc' });
  await shot('anc-02-counter');
  await blocked('ANC: the stall counter blocks', [cu, cv], [cu + 3, cv], (w) => w.u < cu + 1.2, { kit: '__anc' });
  await blocked('ANC: the yard wall blocks (north end)', [cu - 8, cv - 6], [cu - 8, cv - 16], (w) => w.v > cv - 11, { kit: '__anc' });
  await view([anc.it[0] - 30, 16, anc.it[1] + 18], [anc.it[0] - 4, 1, anc.it[1]]);
  await settle(1500); await shot('anc-03-aerial');
}
// ---------- 6. C'not: up onto the arcade, along the shops ----------
const cn = await g(() => { const ks = window.__k.subKits.slice(-2); window.__cn = ks[0]; const k = ks[0]; const b = k.bounds(); return { b, c: k.world((b.u0 + b.u1) / 2, b.v1 + 6) }; });
const cnb = cn.b;
const mu = (cnb.u0 + cnb.u1) / 2;
await at(mu, cnb.v1 + 5, 0, -1, { kit: '__cn' });
await settle(800);
await shot('cnot-01-street');
await route("C'not: up the step onto the arcade", [[mu + 2.1, cnb.v1 - 1.3]], (w) => w.y > 0.25, { kit: '__cn' });
await route("C'not: along the arcade", [[mu + 10.5, cnb.v1 - 1.3]], (w) => w.y > 0.25, { kit: '__cn' });
await blocked("C'not: a shop counter blocks", [mu + 10.5, cnb.v1 - 1.3], [mu + 10.5, cnb.v1 - 6], (w) => w.v > cnb.v1 - 3, { kit: '__cn' });
await route("C'not: back down to the street", [[mu + 10.5, cnb.v1 + 3]], (w) => w.y < 0.05, { kit: '__cn' });
await view([cn.c.x - 30, 14, cn.c.z + 26], [cn.c.x, 2, cn.c.z]);
await settle(1500); await shot('cnot-02-aerial');

console.log('ERRORS', JSON.stringify(errors));
console.log(fails.length ? `FAILED ${fails.length}: ${fails.join(' | ')}` : 'ALL PASS');
await browser.close();
process.exit(fails.length || errors.length ? 1 : 0);
