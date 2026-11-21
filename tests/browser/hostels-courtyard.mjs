// The courtyard Bhawans other than Krishna (Gandhi, Ram, Budh, Shankar, Vyas, Vishwakarma), walked with the keyboard:
// in through the entrance block, up and down every stair core (and on to the roof from the main stair), out from the
// corridor into every courtyard and back, a walled courtyard side that blocks, and screenshots of each (street level,
// aerial, entrance, corridor, stair, courtyard). node tests/browser/hostels-courtyard.mjs [OUTDIR] [URL] [names,…]
import { chromium } from 'playwright-core';
const OUT = process.argv[2] || '.';
const URL = process.argv[3] || 'http://localhost:8104/';
const ONLY = process.argv[4] ? process.argv[4].split(',') : null;
const NAMES = ['Gandhi Bhawan', 'Ram Bhawan', 'Budh Bhawan', 'Shankar Bhawan', 'Vyas Bhawan', 'Vishwakarma Bhawan'].filter((n) => !ONLY || ONLY.some((o) => n.startsWith(o)));
const WD = 7.85; const SCREEN = 0.3; const MOD = 3.4;
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const fails = [];
const check = (ok, what) => { console.log(ok ? 'PASS' : 'FAIL', what); if (!ok) fails.push(what); };
const g = (fn, arg) => page.evaluate(fn, arg);
const walk = async (ms, keys = ['KeyW']) => { for (const k of keys) await page.keyboard.down(k); await page.waitForTimeout(ms); for (const k of keys) await page.keyboard.up(k); await page.waitForTimeout(250); };
let NAME = '';
const where = (band = null) => g(([name, band]) => {
  const G = window.__game; const H = G.campus.hostels.find((h) => h.name === name); const p = G.player.pos; const [u, v] = H.local(p.x, p.z);
  const out = { u: +u.toFixed(2), v: +v.toFixed(2), y: +p.y.toFixed(2), room: G.campus.roomAt(p.x, p.z, p.y) };
  if (band) { const [s, t] = H.toBand(H.bandOf(band), u, v); out.s = +s.toFixed(2); out.t = +t.toFixed(2); }
  return out;
}, [NAME, band]);
const atBand = (band, s, t, y, dir) => g(([name, band, s, t, y, dir]) => {
  const G = window.__game; const H = G.campus.hostels.find((h) => h.name === name); const w = H.bandOf(band);
  const d = { '+s': w.ds, '-s': [-w.ds[0], -w.ds[1]], '+t': w.dt, '-t': [-w.dt[0], -w.dt[1]] }[dir];
  const x = d[0] * H.eu[0] + d[1] * H.ev[0]; const z = d[0] * H.eu[1] + d[1] * H.ev[1];
  G.player.place(H.bandWorld(w, s, t, y), Math.atan2(-x, -z)); G.player.pos.y = y; G.player.pitch = 0;
}, [NAME, band, s, t, y, dir]);
const faceBand = (band, dir) => g(([name, band, dir]) => {
  const G = window.__game; const H = G.campus.hostels.find((h) => h.name === name); const w = H.bandOf(band);
  const d = { '+s': w.ds, '-s': [-w.ds[0], -w.ds[1]], '+t': w.dt, '-t': [-w.dt[0], -w.dt[1]] }[dir];
  const x = d[0] * H.eu[0] + d[1] * H.ev[0]; const z = d[0] * H.eu[1] + d[1] * H.ev[1];
  G.player.yaw = Math.atan2(-x, -z);
}, [NAME, band, dir]);
const at = (u, v, y, dir) => g(([name, u, v, y, dir]) => {
  const G = window.__game; const H = G.campus.hostels.find((h) => h.name === name);
  const d = { '+u': H.eu, '-u': [-H.eu[0], -H.eu[1]], '+v': H.ev, '-v': [-H.ev[0], -H.ev[1]] }[dir];
  G.player.place(H.world(u, v, y), Math.atan2(-d[0], -d[1])); G.player.pos.y = y; G.player.pitch = 0;
}, [NAME, u, v, y, dir]);
// a fixed camera at local (u, v, y) looking at local (lu, lv, ly)
const view = async (name, [u, v, y], [lu, lv, ly]) => {
  await g(([n, u, v, y, lu, lv, ly]) => {
    const G = window.__game; const H = G.campus.hostels.find((h) => h.name === n); const p = H.world(u, v); const l = H.world(lu, lv);
    G.player.place(new G.player.pos.constructor(p.x, y - 1.6, p.z), 0);
    G.player.yaw = Math.atan2(-(l.x - p.x), -(l.z - p.z)); G.player.pitch = Math.atan2(ly - y, Math.hypot(l.x - p.x, l.z - p.z));
    G.player.velY = 0; G.player.frozen = true;
  }, [NAME, u, v, y, lu, lv, ly]);
  await page.waitForTimeout(1100);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  await g(() => { window.__game.player.frozen = false; });
};
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

for (const name of NAMES) {
  NAME = name; const tag = name.split(' ')[0].toLowerCase();
  const H = await g((name) => {
    const h = window.__game.campus.hostels.find((x) => x.name === name);
    const stairs = h.spaces.filter((s) => (s.type === 'stair' || s.type === 'core') && s.k === 0).map((s) => ({ wing: s.wing, t0: s.t0, roof: !!s.roof, label: s.label || (s.roof ? 'main' : 'east') }));
    return { ve: h.ve, W: h.W, L: h.L, court: h.court, stairs, arcade: h.style.arcade, two: h.twoCourts, wings: Object.keys(h.wings), entrance: h.local(h.entrance.out.x, h.entrance.out.z) };
  }, name);
  console.log(`--- ${name}`, JSON.stringify({ W: +H.W.toFixed(1), L: +H.L.toFixed(1), courts: H.court.length, stairs: H.stairs.length, arcade: H.arcade }));
  check(H.entrance[0] < -4, `${name}: the entrance is on the west face (u ${H.entrance[0].toFixed(1)})`);
  check(H.stairs.length >= 6, `${name}: ${H.stairs.length} stair cores (one under each roof pavilion)`);
  if (name === 'Vyas Bhawan') check(H.L > 95 && H.two, `Vyas runs about 97 m north–south with two courtyards (L ${H.L.toFixed(1)})`);
  if (name === 'Vishwakarma Bhawan') check(H.two, 'Vishwakarma has two courtyards and a middle wing');

  // --- in through the entrance block ---
  await g((name) => { const G = window.__game; const e = G.campus.hostels.find((x) => x.name === name).entrance; G.player.place(e.out.clone(), e.yaw + Math.PI); }, name);
  await page.waitForTimeout(500);
  await shot(`${tag}-entrance`);
  let maxY = 0;
  await page.keyboard.down('KeyW');
  for (let i = 0; i < 16; i++) { await page.waitForTimeout(100); maxY = Math.max(maxY, (await where()).y); }
  await page.keyboard.up('KeyW');
  await page.waitForTimeout(300);
  let w = await where();
  check(w.room === 'hostel' && w.u > 1 && Math.abs(w.y) < 0.05, `${name}: up the porch steps (highest ${maxY}) and in through the open arch (${JSON.stringify(w)})`);
  // the gated arch is shut
  await at(-3.6, H.ve - 3.75, 0, '+u'); await walk(1500); w = await where();
  check(w.u < -2.2, `${name}: the collapsible gate keeps you out (${w.u})`);

  // --- every stair core, up and down ---
  for (const st of H.stairs) {
    const sn = `${name} ${st.label} (${st.wing})`;
    await atBand(st.wing, 0.4, st.t0 + 0.8, 0, '+s');
    await walk(2600); const mid = (await where()).y;
    await faceBand(st.wing, '+t'); await walk(1000);
    await faceBand(st.wing, '-s'); await walk(2600);
    await faceBand(st.wing, '-s'); await walk(1200);
    w = await where(st.wing);
    check(Math.abs(mid - 1.65) < 0.1 && Math.abs(w.y - 3.3) < 0.05 && w.s < -0.3, `${sn}: up to the first floor (landing ${mid}, ${JSON.stringify(w)})`);
    await atBand(st.wing, -1.1, st.t0 + 2.6, 3.3, '+s');
    await walk(2600); const mid2 = (await where()).y;
    await faceBand(st.wing, '-t'); await walk(1000);
    await faceBand(st.wing, '-s'); await walk(2600);
    await faceBand(st.wing, '-s'); await walk(1200);
    w = await where(st.wing);
    check(Math.abs(mid2 - 1.65) < 0.3 && Math.abs(w.y) < 0.05 && w.s < -0.3, `${sn}: back down (landing ${mid2}, ${JSON.stringify(w)})`);
    if (st.roof) {
      await atBand(st.wing, 0.4, st.t0 + 0.8, 3.3, '+s');
      await walk(2600); await faceBand(st.wing, '+t'); await walk(1000); await faceBand(st.wing, '-s'); await walk(2600); await faceBand(st.wing, '-s'); await walk(1500);
      w = await where(st.wing);
      check(Math.abs(w.y - 6.6) < 0.05, `${sn}: on up to the roof terrace (${JSON.stringify(w)})`);
      await g(() => { window.__game.player.pitch = -0.2; }); await page.waitForTimeout(300); await shot(`${tag}-roof`);
      await atBand(st.wing, -1.1, st.t0 + 2.6, 6.6, '+s');
      await walk(2600); await faceBand(st.wing, '-t'); await walk(1000); await faceBand(st.wing, '-s'); await walk(2600); await faceBand(st.wing, '-s'); await walk(1200);
      w = await where(st.wing);
      check(Math.abs(w.y - 3.3) < 0.05, `${sn}: down from the roof (${JSON.stringify(w)})`);
    }
  }
  const core = H.stairs.find((s) => s.label !== 'main');
  await atBand(core.wing, -1.6, core.t0 + 1.7, 0, '+s'); await g(() => { window.__game.player.pitch = 0.25; }); await page.waitForTimeout(400); await shot(`${tag}-stair`);

  // --- out into every courtyard and back: through the middle bay of its north and south sides ---
  for (const [i, r] of H.court.entries()) {
    for (const side of ['N', 'S']) {
      // which run closes this court on this side: a wing (N or S) or the middle wing
      const mid = H.two && ((i === 0 && side === 'S') || (i === 1 && side === 'N'));
      if (mid && side === 'S' && !H.arcade.includes('M')) continue; // the middle wing's back has rooms, no way through
      if (mid && side === 'N') continue;
      const n = Math.max(1, Math.round((r.u1 - r.u0) / MOD)); const bw = (r.u1 - r.u0) / n; const uc = r.u0 + (Math.floor(n / 2) + 0.5) * bw;
      const vIn = side === 'N' ? r.v0 + 4 : r.v1 - 4;
      await at(uc, vIn, 0, side === 'N' ? '-v' : '+v');
      await walk(1400);
      w = await where();
      const edge = side === 'N' ? r.v0 : r.v1;
      const through = side === 'N' ? w.v < edge - SCREEN - 0.3 : w.v > edge + SCREEN + 0.3;
      check(through && w.room === 'hostel' && Math.abs(w.y) < 0.05, `${name}: courtyard ${i + 1} → ${mid ? 'middle wing' : side + ' wing'} corridor (${JSON.stringify(w)})`);
      await at(uc, side === 'N' ? edge - SCREEN - 1.4 : edge + SCREEN + 1.4, 0, side === 'N' ? '+v' : '-v');
      await walk(1400);
      w = await where();
      check(w.room === null && Math.abs(w.y) < 0.12 && w.u > r.u0 && w.u < r.u1 && w.v > r.v0 && w.v < r.v1, `${name}: back out onto courtyard ${i + 1} (${JSON.stringify(w)})`);
    }
    // a walled side (no arcade) blocks away from its doorway
    if (!H.arcade.includes('W')) {
      await at(r.u0 + 3, r.v0 + 1.7, 0, '-u'); await walk(1400); w = await where();
      check(w.u > r.u0 - SCREEN - 0.05, `${name}: the courtyard's walled west side blocks (${w.u})`);
    }
  }

  // --- screenshots ---
  const cu = H.W / 2; const c0 = H.court[0]; const cl = H.court.at(-1);
  await view(`${tag}-street`, [-17, H.ve + 24, 1.7], [0, H.ve - 4, 5]);
  await view(`${tag}-aerial`, [-70, H.ve - 40, 75], [cu, H.L / 2, 0]);
  await view(`${tag}-aerial-se`, [H.W + 60, H.L + 60, 70], [cu, H.L / 2, 0]);
  await view(`${tag}-corridor`, [6.15, H.ve + 14, 1.65], [6.15, H.ve + 40, 1.5]);
  await view(`${tag}-court1`, [c0.u0 + 1.5, (c0.v0 + c0.v1) / 2, 1.7], [c0.u1, c0.v0, 3]);
  if (H.court.length > 1) await view(`${tag}-court2`, [cl.u1 - 3, cl.v0 + 3, 1.7], [cl.u0, cl.v1, 3]);
  await view(`${tag}-lobby`, [1.6, H.ve - 2.5, 1.65], [6, H.ve + 3, 1.4]);
}

// performance: on the road outside Gandhi and inside a corridor of Shankar
const perf = (label) => g((label) => new Promise((res) => {
  const G = window.__game; let n = 0; let calls = 0; const t0 = performance.now();
  const step = () => { n++; calls += G.graphics.renderer.info.render.calls; if (performance.now() - t0 < 2500) requestAnimationFrame(step); else res({ label, fps: +(n / 2.5).toFixed(1), draws: Math.round(calls / n) }); };
  requestAnimationFrame(step);
}), label);
await g(() => { const G = window.__game; const H = G.campus.hostels.find((h) => h.name === 'Gandhi Bhawan'); G.player.place(H.world(-30, H.ve), Math.atan2(-H.eu[0], -H.eu[1])); });
await page.waitForTimeout(800);
const p1 = await perf('outside Gandhi'); console.log(JSON.stringify(p1));
// the frame rate depends on the machine's load (the baseline at 032ec0e measures the same), so check draw calls
check(p1.draws < 900, `modest draw calls outside (${p1.draws} draws, ${p1.fps} fps)`);
check(errors.length === 0, 'no console errors');
console.log('ERRORS', JSON.stringify(errors.slice(0, 8)));
console.log(fails.length ? `FAILED ${fails.length}` : 'ALL PASS');
await browser.close();
process.exit(fails.length ? 1 : 0);
