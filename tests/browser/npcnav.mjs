// NPCs on the real BITS campus: never inside a building footprint (outside the gameplay rooms, their door
// corridors and the NAB passages) and never in a tree trunk. Also walks the player through both NAB passages.
// usage: node npcnav.mjs <outdir> [--quick]
import { chromium } from 'playwright-core';
const OUT = process.argv[2] || '.';
const QUICK = process.argv.includes('--quick');
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(20000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const log = (...a) => console.log(...a);
const fails = [];
const check = (ok, what) => { log(ok ? 'PASS' : 'FAIL', what); if (!ok) fails.push(what); };

// College Life is hidden behind FEATURES.collegeLife (js/features.js); switch it on and skip the first-visit intro

await page.addInitScript(() => { try { localStorage.setItem('pwb-features', 'collegeLife'); localStorage.setItem('pwb-intro-seen', 'true'); } catch { /* */ } });

await page.goto('http://localhost:8080/', { waitUntil: 'load' });
await page.waitForTimeout(800);
await page.evaluate(() => {
  window.__game.voice.mock = true;
  const canvas = document.getElementById('game');
  Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => (window.__locked ? canvas : null) });
});
await page.getByRole('button', { name: /College Life/i }).click();
await page.getByRole('button', { name: /Turn on my microphone/ }).click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: 'Start the day' }).click();
await page.waitForTimeout(500);

// In-page checker. Uses the campus's own helpers when present, else a fallback (for the "before" run).
await page.evaluate(() => {
  const C = () => window.__game.campus;
  const inBox = (b, x, z) => x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ;
  window.__bad = (x, z) => {
    const c = C();
    if (c.walkableAt) {
      if (!c.walkableAt(x, z, 0)) return 'building';
    } else if (c.isBuilt(x, z, 0) && !c.roomAt(x, z) && ![...c.hostCuts.values()].flat().some((q) => inBox(q, x, z))) return 'building';
    if (c.treeNear && c.treeNear(x, z, 0.3)) return 'tree';
    return null;
  };
  window.__sample = () => {
    const out = [];
    for (const n of window.__game.npcs.npcs.values()) {
      const why = window.__bad(n.pos.x, n.pos.z);
      if (why) out.push({ id: n.id || n.name, x: +n.pos.x.toFixed(1), z: +n.pos.z.toFixed(1), why, seated: n.seated, moving: n.path.length > 0 });
    }
    return out;
  };
  // Every NPC's planned route, sampled every 1 m.
  window.__routes = () => {
    const out = [];
    for (const n of window.__game.npcs.npcs.values()) {
      let prev = { x: n.pos.x, z: n.pos.z };
      for (const p of n.path) {
        const len = Math.hypot(p.x - prev.x, p.z - prev.z);
        for (let t = 0; t <= len; t += 1) {
          const x = prev.x + ((p.x - prev.x) * t) / (len || 1); const z = prev.z + ((p.z - prev.z) * t) / (len || 1);
          const why = window.__bad(x, z);
          if (why) { out.push({ id: n.id || n.name, x: +x.toFixed(1), z: +z.toFixed(1), why }); break; }
        }
        prev = p;
      }
    }
    return out;
  };
});

// Let everyone walk (no streaming) so routes, not teleports, are exercised; then cycle through the day's slots.
await page.evaluate(() => { window.__locked = true; window.__game.npcs.streamRadius = 1e9; });
const slots = await page.evaluate(() => window.__game.slots.map((s) => ({ id: s.id, type: s.type, start: s.start })));
log('slots', slots.map((s) => s.id).join(' '));
const allBad = []; const routeBad = [];
const T = QUICK ? 20 : 60;
const per = Math.max(2, Math.floor(T / slots.length));
let samples = 0;
for (const s of slots) {
  await page.evaluate((t) => { window.__game.state.day.clock = t; }, s.start + 0.5);
  await page.waitForTimeout(400);
  const rb = await page.evaluate(() => window.__routes());
  for (const r of rb) routeBad.push({ slot: s.id, ...r });
  for (let i = 0; i < per; i++) {
    // keep the clock inside this slot while people walk
    await page.evaluate((t) => { window.__game.state.day.clock = t; }, s.start + 0.5);
    const b = await page.evaluate(() => window.__sample());
    samples++;
    for (const x of b) allBad.push({ slot: s.id, ...x });
    await page.waitForTimeout(1000);
  }
}
// Streaming on again: far NPCs jump to their destinations; those destinations must be clean too.
await page.evaluate(() => { window.__game.npcs.streamRadius = 90; });
for (const s of slots) {
  await page.evaluate((t) => { window.__game.state.day.clock = t; }, s.start + 0.5);
  await page.waitForTimeout(300);
  const b = await page.evaluate(() => window.__sample());
  samples++;
  for (const x of b) allBad.push({ slot: s.id + '(stream)', ...x });
}
const uniq = (arr) => [...new Map(arr.map((b) => [`${b.slot}|${b.id}|${b.why}`, b])).values()];
log('position samples', samples, '| bad positions', allBad.length, JSON.stringify(uniq(allBad).slice(0, 25)));
log('bad routes', routeBad.length, JSON.stringify(uniq(routeBad).slice(0, 25)));
check(allBad.length === 0, 'no NPC ever stands or walks inside a building footprint or a tree trunk');
check(routeBad.length === 0, 'no planned NPC route cuts through a building or a tree');

// Screenshot: people walking on a road (third person, behind the player near the hostel → NAB route)
await page.evaluate(() => { const g = window.__game; g.npcs.streamRadius = 1e9; const s = g.slots.find((x) => x.type === 'lesson'); if (s) g.state.day.clock = s.start - 6; });
await page.waitForTimeout(200);
await page.evaluate(() => { const g = window.__game; const s = g.slots.find((x) => x.type === 'lesson'); if (s) g.state.day.clock = s.start + 0.2; });
await page.waitForTimeout(3500);
await page.keyboard.press('KeyV');
await page.evaluate(() => {
  const g = window.__game;
  // stand behind the nearest walking NPC
  let best = null;
  for (const n of g.npcs.npcs.values()) if (n.path.length && (!best || n.path.length > best.path.length)) best = n;
  if (best) { const p = best.pos; g.player.place(new p.constructor(p.x + 6, 0, p.z + 6), Math.atan2(6, 6)); g.player.pitch = -0.05; }
});
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/nav-walkers.png` });

// Aerial view of the NPC routes: draw them into the full map overlay is not available, so log them instead.
const routes = await page.evaluate(() => [...window.__game.npcs.npcs.values()].map((n) => [n.pos.x, n.pos.z, ...n.path.map((p) => [p.x, p.z])]));
await import('node:fs').then((fs) => fs.writeFileSync(`${OUT}/nav-routes.json`, JSON.stringify(routes)));

// --- NAB passages with real key presses ---
const passages = await page.evaluate(() => (window.__game.campus.passages || []).map((p) => ({ name: p.name, a: p.a, b: p.b })));
log('passages', JSON.stringify(passages));
const nabModule = await page.evaluate(() => (window.__game.campus.activeModules || []).some((m) => m.id === 'nab'));
if (nabModule) { // the sunken NAB replaces the at-grade crossings with portals and stairs (tests/browser/nab.mjs)
  check(passages.length === 0, 'sunken NAB: no at-grade passages left');
  passages.length = 0;
} else check(passages.length === 4, 'NAB has two crossings through each of its two blocks (4 passages)');

// --- people walk down into the sunken Rotunda on its floor, not over it at grade ---
const rot = await page.evaluate(async () => {
  const g = window.__game; const C = g.campus; const n = [...g.npcs.npcs.values()][0];
  g.npcs.streamRadius = 1e9; n.chase = null; n.group.visible = true;
  n.teleport(new n.pos.constructor(40, 0, 0));
  n.walkTo(C.pathTo(n.pos, null, new n.pos.constructor(0, -4.5, 2)));
  n.speed = 1.6; const out = [];
  for (let i = 0; i < 200 && n.path.length; i++) { await new Promise((r) => setTimeout(r, 150)); out.push([Math.hypot(n.pos.x, n.pos.z), n.pos.y]); }
  return { out, end: [n.pos.x, n.pos.y, n.pos.z], left: n.path.length, ground: C.groundAt ? C.groundAt(0, 2) : 0 };
});
if (rot.ground < 0) {
  const inside = rot.out.filter(([r]) => r < 16);
  log('rotunda walk', JSON.stringify({ end: rot.end, left: rot.left, inside: inside.length, maxInside: Math.max(...inside.map((q) => q[1])) }));
  check(rot.left === 0 && Math.abs(rot.end[1] + 4.5) < 0.05, 'an NPC sent to the Rotunda arrives on its floor (-4.5)');
  check(inside.length > 0 && inside.every(([, y]) => y < -4.3), 'inside the Rotunda an NPC walks on the sunken floor, never at grade');
}
const walk = async (from, yaw, ms) => {
  await page.evaluate(([f, y]) => { const g = window.__game; g.state.settings.view = 'first'; g.player.place(new g.player.pos.constructor(f[0], 0, f[1]), y); }, [from, yaw]);
  await page.waitForTimeout(150);
  await page.keyboard.down('ShiftLeft');
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(ms);
  await page.keyboard.up('KeyW');
  await page.keyboard.up('ShiftLeft');
  await page.waitForTimeout(250);
  return page.evaluate(() => [window.__game.player.pos.x, window.__game.player.pos.z]);
};
for (const p of passages) {
  // a = outer end (west for the west block, east for the east block)... just walk a → b and back
  const yawAB = Math.atan2(-(p.b[0] - p.a[0]), -(p.b[1] - p.a[1]));
  const len = Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1]);
  const ms = Math.ceil((len / 4) * 1000) + 1400;
  const end = await walk(p.a, yawAB, ms);
  const got = Math.hypot(end[0] - p.b[0], end[1] - p.b[1]);
  const passed = (end[0] - p.a[0]) * (p.b[0] - p.a[0]) + (end[1] - p.a[1]) * (p.b[1] - p.a[1]) > len * len * 0.95;
  log(`${p.name}: walked from`, p.a, 'to', end.map((v) => +v.toFixed(1)), 'target', p.b, 'dist to target', got.toFixed(1));
  check(passed, `walk through ${p.name} from one side to the other`);
}
// screenshots inside the two crossings (west block)
for (const [i, p] of passages.slice(0, 2).entries()) {
  await page.evaluate(([a, b]) => { const g = window.__game; g.state.settings.view = 'first'; const m = [(a[0] * 0.8 + b[0] * 0.2), (a[1] * 0.8 + b[1] * 0.2)]; g.player.place(new g.player.pos.constructor(m[0], 0, m[1]), Math.atan2(-(b[0] - a[0]), -(b[1] - a[1]))); g.player.pitch = 0.02; }, [p.a, p.b]);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/nav-nab-passage-${i + 1}.png` });
}
// Outside view of a passage portal
if (passages[0]) {
  await page.evaluate(([a, b]) => { const g = window.__game; g.state.settings.view = 'first'; const dx = a[0] - b[0]; const dz = a[1] - b[1]; const L = Math.hypot(dx, dz); g.player.place(new g.player.pos.constructor(a[0] + (dx / L) * 14, 0, a[1] + (dz / L) * 14), Math.atan2(dx, dz)); g.player.pitch = 0.08; }, [passages[0].a, passages[0].b]);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/nav-nab-portal.png` });
}

// fps at the Rotunda
const fps = await page.evaluate(() => new Promise((res) => { const g = window.__game; g.player.place(new g.player.pos.constructor(0, 0, 25), Math.PI); let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else res(n / ((performance.now() - t0) / 1000)); }; requestAnimationFrame(f); }));
log('fps', fps.toFixed(1));

log('ERRORS', JSON.stringify(errors));
log(fails.length ? `FAILED ${fails.length}: ${fails.join(' | ')}` : 'ALL PASS');
await browser.close();
process.exit(0);
