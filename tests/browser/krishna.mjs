// Krishna Bhawan, walked with the keyboard: in through the entrance bay, up and down every stair core, through the
// cross passages to the courtyard verandahs and lawns, round a verandah, into your room, the common room and the
// lobby, and the courtyard games. node tests/browser/krishna.mjs [OUTDIR] [URL]
import { chromium } from 'playwright-core';
const OUT = process.argv[2] || '.';
const URL = process.argv[3] || 'http://localhost:8094/';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const log = (...a) => console.log(...a);
const fails = [];
const check = (ok, what) => { log(ok ? 'PASS' : 'FAIL', what); if (!ok) fails.push(what); };
const g = (fn, arg) => page.evaluate(fn, arg);
const walk = async (ms, keys = ['KeyW']) => { for (const k of keys) await page.keyboard.down(k); await page.waitForTimeout(ms); for (const k of keys) await page.keyboard.up(k); await page.waitForTimeout(250); };
// where am I: local (u, v), band (s, t) in a named band, height and room
const where = (band = null) => g((band) => {
  const G = window.__game; const H = G.campus.hostel; const p = G.player.pos; const [u, v] = H.local(p.x, p.z);
  const out = { u: +u.toFixed(2), v: +v.toFixed(2), y: +p.y.toFixed(2), room: G.campus.roomAt(p.x, p.z, p.y) };
  if (band) { const [s, t] = H.toBand(H.bandOf(band), u, v); out.s = +s.toFixed(2); out.t = +t.toFixed(2); }
  return out;
}, band);
// stand at (s, t, y) in a band, facing a band direction ('+s', '-s', '+t', '-t')
const atBand = (band, s, t, y, dir) => g(([band, s, t, y, dir]) => {
  const G = window.__game; const H = G.campus.hostel; const w = H.bandOf(band);
  const d = { '+s': w.ds, '-s': [-w.ds[0], -w.ds[1]], '+t': w.dt, '-t': [-w.dt[0], -w.dt[1]] }[dir];
  const x = d[0] * H.eu[0] + d[1] * H.ev[0]; const z = d[0] * H.eu[1] + d[1] * H.ev[1];
  G.player.place(H.bandWorld(w, s, t, y), Math.atan2(-x, -z));
  G.player.pos.y = y; G.player.pitch = 0;
}, [band, s, t, y, dir]);
const faceBand = (band, dir) => g(([band, dir]) => {
  const G = window.__game; const H = G.campus.hostel; const w = H.bandOf(band);
  const d = { '+s': w.ds, '-s': [-w.ds[0], -w.ds[1]], '+t': w.dt, '-t': [-w.dt[0], -w.dt[1]] }[dir];
  const x = d[0] * H.eu[0] + d[1] * H.ev[0]; const z = d[0] * H.eu[1] + d[1] * H.ev[1];
  G.player.yaw = Math.atan2(-x, -z);
}, [band, dir]);
// stand at local (u, v, y) facing '+u', '-u', '+v', '-v'
const at = (u, v, y, dir) => g(([u, v, y, dir]) => {
  const G = window.__game; const H = G.campus.hostel;
  const d = { '+u': H.eu, '-u': [-H.eu[0], -H.eu[1]], '+v': H.ev, '-v': [-H.ev[0], -H.ev[1]] }[dir];
  G.player.place(H.world(u, v, y), Math.atan2(-d[0], -d[1]));
  G.player.pos.y = y; G.player.pitch = 0;
}, [u, v, y, dir]);
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });

await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(1000);
await g(() => { window.__game.voice.mock = true; const c = document.getElementById('game'); Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => (window.__locked ? c : null) }); });
await page.getByRole('button', { name: /College Life/ }).click();
await page.getByRole('button', { name: /Turn on my microphone/ }).click();
await page.waitForTimeout(500);
await page.getByRole('button', { name: 'Start the day' }).click();
await page.waitForTimeout(400);
await g(() => { window.__locked = true; window.__game.state.settings.view = 'first'; window.__game.state.day.clock = 10 * 60; });
const H = await g(() => {
  const h = window.__game.campus.hostel;
  const stairs = h.spaces.filter((s) => (s.type === 'stair' || s.type === 'core') && s.k === 0).map((s) => ({ wing: s.wing, t0: s.t0, roof: !!s.roof, label: s.label || (s.roof ? 'main' : 'east') }));
  const passes = h.spaces.filter((s) => s.type === 'pass' && s.k === 0).map((s) => ({ wing: s.wing, t0: s.t0, t1: s.t1, depth: h.bandOf(s.wing).depth }));
  const room = h.spaces.find((s) => s.id === 'hostelroom'); const common = h.spaces.find((s) => s.type === 'common');
  return { ve: h.ve, W: h.W, L: h.L, WD: h.WD, mc0: h.mc0, mc1: h.mc1, court: h.court, stairs, passes, room: { t0: room.t0, t1: room.t1 }, common: { t0: common.t0, t1: common.t1 } };
});
log('Krishna', JSON.stringify({ W: +H.W.toFixed(1), L: +H.L.toFixed(1), WD: H.WD, courts: H.court.map((c) => [+(c.u1 - c.u0).toFixed(1), +(c.v1 - c.v0).toFixed(1)]), stairs: H.stairs.length, passes: H.passes.length }));
check(Math.abs(H.WD - 15.35) < 0.01, 'wings are 15.35 m deep, as in OSM (15.4 m)');
check(H.court.every((c) => c.u1 - c.u0 > 31 && c.u1 - c.u0 < 35 && c.v1 - c.v0 > 56 && c.v1 - c.v0 < 60), 'two courtyards of about 33 × 58 m, as in OSM');
check(H.stairs.length >= 6, `${H.stairs.length} stair cores (the research supports at least 4, ideally 6)`);

// --- your room on the ground floor ---
let w = await where();
check(w.room === 'hostelroom' && w.y === 0, `the day starts in your room (${JSON.stringify(w)})`);
await shot('k-room');

// --- in through the main entrance: steps, porch, step down into the lobby ---
await g(() => { const G = window.__game; const e = G.campus.hostel.entrance; G.player.place(e.out.clone(), e.yaw + Math.PI); });
await page.waitForTimeout(400);
await shot('k-entrance-outside');
let maxY = 0;
await page.keyboard.down('KeyW');
for (let i = 0; i < 14; i++) { await page.waitForTimeout(100); maxY = Math.max(maxY, (await where()).y); }
await page.keyboard.up('KeyW');
await page.waitForTimeout(300);
w = await where();
check(maxY > 0.2 && maxY < 0.35, `climbed the entrance steps onto the porch (highest ${maxY})`);
check(w.room === 'hostel' && w.u > 1 && Math.abs(w.y) < 0.05, `walked in through the open arch into the lobby (${JSON.stringify(w)})`);
await at(2.0, H.ve + 2.5, 0, '-v'); await page.waitForTimeout(300); await shot('k-lobby');
// the gated arch is shut
await at(-3.6, H.ve - 3.75, 0, '+u');
await walk(1500);
w = await where();
check(w.u < -2.2, `the green collapsible gate keeps you out (${JSON.stringify(w)})`);

// --- walls: the corridor ring's inner wall and a locked room ---
await at(6.15, H.ve + 12, 0, '+u'); await walk(1500); w = await where();
check(w.u < 7.6, `the corridor's inner wall blocks (${w.u})`);
await at(6.15, H.ve + 22, 0, '-u'); await walk(1500); w = await where();
check(w.u > 4.7, `a locked room's door blocks (${w.u})`);

// --- every stair core, up and down ---
for (const st of H.stairs) {
  const name = `${st.label} (${st.wing})`;
  // up: from the bottom step to the half landing, across it, up the second flight and off into the corridor
  await atBand(st.wing, 0.4, st.t0 + 0.8, 0, '+s');
  await walk(2600);
  const mid = (await where()).y;
  await faceBand(st.wing, '+t'); await walk(1000);
  await faceBand(st.wing, '-s'); await walk(2600);
  await faceBand(st.wing, '-s'); await walk(1200);
  w = await where(st.wing);
  check(Math.abs(mid - 1.65) < 0.1 && Math.abs(w.y - 3.3) < 0.05 && w.s < -0.3, `${name}: up to the first floor (landing ${mid}, ${JSON.stringify(w)})`);
  if (st === H.stairs[2]) await shot('k-stair-top');
  // down: from the first-floor corridor
  await atBand(st.wing, -1.1, st.t0 + 2.6, 3.3, '+s');
  await walk(2600);
  const mid2 = (await where()).y;
  await faceBand(st.wing, '-t'); await walk(1000);
  await faceBand(st.wing, '-s'); await walk(2600);
  await faceBand(st.wing, '-s'); await walk(1200);
  w = await where(st.wing);
  check(Math.abs(mid2 - 1.65) < 0.3 && Math.abs(w.y) < 0.05 && w.s < -0.3, `${name}: back down to the ground floor (landing ${mid2}, ${JSON.stringify(w)})`);
  if (st.roof) {
    await atBand(st.wing, 0.4, st.t0 + 0.8, 3.3, '+s');
    await walk(2600); await faceBand(st.wing, '+t'); await walk(1000); await faceBand(st.wing, '-s'); await walk(2600); await faceBand(st.wing, '-s'); await walk(1500);
    w = await where(st.wing);
    check(Math.abs(w.y - 6.6) < 0.05, `${name}: on up to the roof terrace (${JSON.stringify(w)})`);
    await g(() => { window.__game.player.pitch = -0.25; });
    await shot('k-roof');
    await atBand(st.wing, -1.1, st.t0 + 2.6, 6.6, '+s');
    await walk(2600); await faceBand(st.wing, '-t'); await walk(1000); await faceBand(st.wing, '-s'); await walk(2600); await faceBand(st.wing, '-s'); await walk(1200);
    w = await where(st.wing);
    check(Math.abs(w.y - 3.3) < 0.05, `${name}: down from the roof to the first floor (${JSON.stringify(w)})`);
  }
}
// a stair core from the bottom
const sc = H.stairs.find((s) => s.wing === 'M');
await atBand('M', -1.6, sc.t0 + 1.7, 0, '+s'); await g(() => { window.__game.player.pitch = 0.25; }); await page.waitForTimeout(300); await shot('k-stair');

// --- the cross passages: corridor → passage → verandah → lawn, on both floors ---
for (const p of H.passes) {
  const tc = (p.t0 + p.t1) / 2;
  await atBand(p.wing, p.depth + 0.25 + 0.9, tc, 0, '-s');
  await walk(4000);
  w = await where(p.wing);
  check(w.room === null && w.y < 0.1, `passage ${p.wing}: from the corridor through to the courtyard lawn (${JSON.stringify(w)})`);
  await atBand(p.wing, p.depth + 0.25 + 0.9, tc, 3.3, '-s');
  await walk(1600);
  w = await where(p.wing);
  check(w.s < -0.4 && Math.abs(w.y - 3.3) < 0.05, `passage ${p.wing}: first floor, out onto the verandah (${JSON.stringify(w)})`);
}
await atBand('A', 1.2, H.passes[0].t0 + 1.6, 0, '-s'); await page.waitForTimeout(300); await shot('k-passage');

// --- the verandahs: right round the first courtyard's west side, and along the middle wing ---
await at(13.65, H.court[0].v0 - 1.5, 0, '+v'); await page.waitForTimeout(300); await shot('k-verandah');
await walk(9000);
w = await where();
check(w.v > H.court[0].v0 + 30 && w.room === 'hostel', `walked down the west verandah of the first courtyard (${JSON.stringify(w)})`);
await at(6.15, (H.mc0 + H.mc1) / 2, 0, '+u'); await walk(5000); w = await where();
check(w.u > 25 && w.room === 'hostel', `from the corridor east along the middle-wing verandah (${JSON.stringify(w)})`);
await at(13.65, H.court[0].v0 + 20, 3.3, '+v'); await page.waitForTimeout(300); await shot('k-verandah-first');
await walk(3000); w = await where();
check(Math.abs(w.y - 3.3) < 0.05 && w.v > H.court[0].v0 + 30, `first-floor verandah behind the colonnade (${JSON.stringify(w)})`);
await at(13.65, H.court[0].v0 + 20, 3.3, '+u'); await walk(1500); w = await where();
check(w.u < 15.4 && Math.abs(w.y - 3.3) < 0.05, `the colonnade's parapet keeps you on the first floor (${JSON.stringify(w)})`);

// --- key rooms: yours, the common room ---
await at(5.9, H.room.t0 + 0.8, 0, '-u'); await walk(1500); w = await where();
check(w.room === 'hostelroom', `walked into your room from the corridor (${JSON.stringify(w)})`);
const ids = await g(() => window.__game.campus.interactables.map((i) => i.id));
for (const id of ['hlight', 'almirah', 'gate', 'studydesk', 'tt', 'tv', 'sofa', 'vending', 'cooler', 'hnotice', 'laundry']) check(ids.includes(id), `interactable ${id}`);
await g(() => window.__game.handleInteractable('hlight')); await page.waitForTimeout(150);
check((await g(() => window.__game.campus.hostel.lightOn)) === false, 'your light switch works');
await g(() => window.__game.handleInteractable('hlight'));
await at(2.6, H.room.t1 - 0.6, 0, '-v'); await g(() => { window.__game.player.yaw += 0.7; }); await page.waitForTimeout(300); await shot('k-room-alcove');
await at(6.15, H.common.t0 + 6.8, 0, '-u'); await walk(1500); w = await where();
check(w.room === 'hostel' && w.u < 4.5, `walked into the common room (${JSON.stringify(w)})`);
await g(() => { window.__game.state.day.clock = 18 * 60; }); await page.waitForTimeout(700);
await at(3.3, H.common.t1 - 1.0, 0, '-v'); await page.waitForTimeout(300); await shot('k-common');
check(await g(() => window.__game.campus.hostel.ttBall.visible), 'table tennis is on in the evening');
check(await g(() => window.__game.campus.hostel.setTV(true)) === true, 'the common-room TV works');

// --- courtyard games on the lawns ---
const games = await g(() => {
  const G = window.__game; const H = G.campus.hostel; const S = H.npcSpots;
  const pts = [S.cricket.bat.at, S.cricket.bowl.a, ...S.cricket.field.map((f) => f.at), ...S.football.flatMap((f) => [f.a, f.b])];
  return pts.map((p) => G.campus.roomAt(p.x, p.z, 0));
});
check(games.every((r) => r === null), 'cricket and football spots are on the courtyard lawns');
const mates = await g(() => { const out = {}; for (const [id, n] of window.__game.npcs.npcs) if (id.startsWith('hm:') && n.group.visible) out[id] = window.__game.campus.roomAt(n.pos.x, n.pos.z, n.pos.y) || 'courtyard'; return out; });
check(Object.keys(mates).length >= 10, `evening: hostel-mates in the Bhawan (${Object.keys(mates).length})`);
await at(H.court[0].u0 + 2, H.court[0].v1 - 2, 0, '-v'); await g(() => { window.__game.player.yaw += 0.35; window.__game.state.settings.view = 'third'; }); await page.waitForTimeout(800); await shot('k-court-cricket');
await g(() => { window.__game.state.settings.view = 'first'; window.__game.state.day.clock = 10 * 60; });

// --- from far outside, no interior is drawn ---
await at(-120, H.ve, 0, '+u'); await page.waitForTimeout(500);
check(await g(() => !window.__game.campus.hostel.g.visible), 'far outside: Krishna\'s interior is not drawn');
await at(-30, H.ve - 4, 0, '+u'); await g(() => { window.__game.player.pitch = 0.12; }); await page.waitForTimeout(500); await shot('k-front');

log('ERRORS', JSON.stringify(errors));
log(fails.length || errors.length ? `FAILED ${fails.length}: ${fails.join(' | ')}` : 'ALL PASS');
await browser.close();
process.exit(fails.length || errors.length ? 1 : 0);
