// Plays a BITS semester the way the calendar runs it: registration day → classes → mid-sems → compre → grades → Semester 2.
import { chromium } from 'playwright-core';
const OUT = process.argv[2] || '.';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(15000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const log = (...a) => console.log(...a);
const fails = [];
const check = (ok, what) => { log(ok ? 'PASS' : 'FAIL', what); if (!ok) fails.push(what); };
const g = (fn, arg) => page.evaluate(fn, arg);
const closePanels = () => g(() => { document.querySelectorAll('#overlay .close').forEach((b) => b.click()); });

// Click the right answer for whatever question is on screen (lectures, mid-sems and compre).
const answerAll = async (c, max = 40) => {
  for (let i = 0; i < max; i++) {
    if (!(await page.locator('#overlay button.option:not([disabled])').count())) break;
    const idx = await g(async (c) => {
      const { COLLEGE } = await import('/data/college.js');
      const q = document.querySelector('#overlay h3').textContent;
      for (const co of COLLEGE[c].courses) for (const t of co.topics) for (const x of [t.exam, t.practice]) if (x.q === q) return x.answer;
      return 0;
    }, c);
    await page.locator('#overlay button.option').nth(idx).click();
    await page.waitForTimeout(800);
  }
};
const sitAt = (clock) => g((clock) => {
  const G = window.__game; G.state.settings.tts = false;
  const seat = G.campus.seats[G.campus.playerSeatIndex];
  G.player.pos.set(seat.pos.x, 0, seat.pos.z + 0.5); G.state.day.clock = clock; G.handleInteractable('mydesk');
}, clock);
const gotoDay = (i) => g((i) => { const G = window.__game; G.state.sem.day = i - 1; G.advanceDay(); }, i);

// College Life is hidden behind FEATURES.collegeLife (js/features.js); switch it on and skip the first-visit intro

await page.addInitScript(() => { try { localStorage.setItem('pwb-features', 'collegeLife'); localStorage.setItem('pwb-intro-seen', 'true'); } catch { /* */ } });

await page.goto('http://localhost:8080/', { waitUntil: 'load' });
await page.waitForTimeout(800);
await g(() => { window.__game.voice.mock = true; });
await page.getByRole('button', { name: /College Life/i }).click();
await page.getByRole('button', { name: /Turn on my microphone/ }).click();
await page.waitForTimeout(300);
const intro = await page.locator('#overlay').innerText();
check(/How the semester runs · 34 days/.test(intro) && /Day 1 · Aug: register/.test(intro), 'intro explains the semester order, starting with registration');
await page.screenshot({ path: `${OUT}/s01-intro.png` });
await page.getByRole('button', { name: 'Start the day' }).click();
await page.waitForTimeout(300);
log('HUD:', await page.locator('#hud-class').innerText(), '|', await page.locator('#hud-mission').innerText());
check(/Day 1 of 34/.test(await page.locator('#hud-class').innerText()), 'HUD shows Day 1 of 34');
check(/Register for your courses/.test(await page.locator('#hud-mission').innerText()), 'first objective is registration');
check((await g(() => window.__game.slots.filter((s) => s.type === 'lesson').length)) === 0, 'no lectures on registration day');

// Registration opens at 9:00; then the timetable is issued.
await g(() => { const G = window.__game; G.state.day.clock = 7 * 60 + 40; G.handleInteractable('registration'); });
await page.waitForTimeout(200);
check(/opens at 09:00/.test(await page.locator('#toast').innerText()), 'registration before 9:00 says it opens at 09:00');
await g(() => { const G = window.__game; G.state.day.clock = 9 * 60 + 5; G.handleInteractable('registration'); });
await page.locator('#overlay button.primary').click();
await page.waitForTimeout(300);
const tt = await page.locator('#overlay').innerText();
check(/You’re registered/.test(tt) && /Classes begin tomorrow/.test(tt), 'timetable is issued after registering');
check((await page.locator('#overlay table').nth(1).locator('tr').count()) === 34, 'semester calendar lists all 34 days');
await page.screenshot({ path: `${OUT}/s02-timetable-issued.png`, fullPage: true });

// Sleep → Day 2: classwork begins.
await page.locator('#overlay button', { hasText: 'End the day and sleep' }).click();
await page.waitForTimeout(200);
await page.locator('#overlay button', { hasText: 'Sleep → next day' }).click();
await page.waitForTimeout(400);
const hud2 = await page.locator('#hud-class').innerText();
log('Day 2 HUD:', hud2, '| lectures:', await g(() => window.__game.slots.filter((s) => s.type === 'lesson').map((s) => s.label).join(' / ')));
check(/Day 2 of 34/.test(hud2) && /Saturday/.test(hud2), 'next day is Day 2, Saturday');
check(await g(() => window.__game.state.sem.registered === true), 'registration carries over to later days');

// First lecture (PHY F111) teaches one topic; counted for the semester.
await sitAt(8 * 60 + 1);
await page.waitForTimeout(700);
check(/Lecture 1/.test(await page.locator('#overlay').innerText()), 'lecture panel says Lecture 1');
await page.locator('#overlay button.primary').click();
await answerAll(13, 1);
await page.locator('#overlay button.primary:not([disabled])').click();
await page.locator('#overlay button.primary').click();
await page.waitForTimeout(300);
const sem = await g(() => window.__game.state.sem);
log('after lecture: lectureNo', JSON.stringify(sem.lectureNo), 'attended', JSON.stringify(sem.attended));
check(sem.lectureNo.phy111 === 1 && sem.attended.phy111 === 1, 'lecture counted for the semester');
await g(() => window.__game.player.stand());

// Skip ahead from the timetable.
await closePanels();
const beforeSkip = await g(() => window.__game.state.day.clock);
await g(() => { const G = window.__game; G.skipToNext(); });
const afterSkip = await g(() => ({ clock: window.__game.state.day.clock, next: window.__game.slots.find((s) => s.start > 8 * 60 + 50)?.start }));
log('skip:', beforeSkip.toFixed(1), '→', afterSkip.clock);
check(afterSkip.clock > beforeSkip && Number.isInteger(afterSkip.clock), 'skip jumps to the start of the next slot');

// Mid-sem day 1 (MATH F111, PHY F111): written at the desk.
const midIdx = await g(async () => (await import('/data/college-calendar.js')).CALENDAR[13].findIndex((d) => d.kind === 'midsem'));
await gotoDay(midIdx);
await page.waitForTimeout(300);
const examSlot = await g(() => window.__game.slots.find((s) => s.type === 'exam'));
log('mid-sem day:', await page.locator('#hud-class').innerText(), '|', examSlot.label);
check(/Week 10/.test(await page.locator('#hud-class').innerText()) && /Mid-semester test · MATH F111, PHY F111/.test(examSlot.label), 'week 10 mid-sem day with MATH and PHY papers');
await closePanels();
await sitAt(examSlot.start + 1);
await page.waitForTimeout(600);
check(/Mid-semester test/.test(await page.locator('#overlay').innerText()), 'sitting at the desk opens the mid-sem paper');
await page.screenshot({ path: `${OUT}/s03-midsem.png` });
await page.locator('#overlay button', { hasText: 'Begin exam' }).click();
await answerAll(13);
await page.waitForTimeout(400);
const mid = await g(() => window.__game.state.sem.midsem);
log('midsem', JSON.stringify(mid));
check(mid.math111 === 1 && mid.phy111 === 1, 'mid-sem scores stored (2/2 each, first topic only)');
await g(() => window.__game.player.stand());

// Fest day exists in its place.
const festIdx = await g(async () => (await import('/data/college-calendar.js')).CALENDAR[13].findIndex((d) => d.kind === 'fest'));
await gotoDay(festIdx);
check((await g(() => window.__game.slots.some((s) => s.type === 'fest'))) && /Oasis/.test(await page.locator('#hud-mission').innerText() + await g(() => window.__game.slots.map((s) => s.label).join())), 'Oasis is its own day with the fest in the evening');

// Compre: three paper days, the grade sheet after the last.
await g(async () => { const G = window.__game; const cur = await import('/data/curriculum.js'); for (const p of cur.getPracticals(13)) G.state.day.practicalsDone[p.subject] = 0.8; G.state.day.projectDone = true; });
const compre = await g(async () => (await import('/data/college-calendar.js')).CALENDAR[13].map((d, i) => (d.kind === 'compre' ? i : -1)).filter((i) => i >= 0));
for (const [k, idx] of compre.entries()) {
  await gotoDay(idx);
  await page.waitForTimeout(300);
  await closePanels();
  const slot = await g(() => window.__game.slots.find((s) => s.type === 'exam'));
  await sitAt(slot.start + 1);
  await page.waitForTimeout(500);
  await page.locator('#overlay button', { hasText: 'Begin exam' }).click();
  await answerAll(13);
  await page.waitForTimeout(500);
  log(`compre ${k + 1}:`, slot.label);
  if (k < compre.length - 1) await g(() => window.__game.player.stand());
}
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/s04-gradesheet.png`, fullPage: true });
const res = await g(() => ({ sgpa: window.__game.state.years[13].sgpa, math: window.__game.state.years[13].results.math111, labs: window.__game.state.years[13].results.phy110 }));
log('Sem 1 SGPA', res.sgpa, '| MATH F111', JSON.stringify({ mid: res.math.midsemPct, theory: res.math.theory, internal: res.math.internal, total: res.math.total, letter: res.math.letter }));
check(res.sgpa > 0 && res.math.midsemPct === 100 && res.math.letter, 'grade sheet uses mid-sem + compre + labs');

// On to Semester 2: registration day again.
await page.locator('#overlay button', { hasText: 'Semester 2' }).click();
await page.locator('#overlay button', { hasText: 'Continue' }).click();
await page.waitForTimeout(400);
await page.locator('#overlay button', { hasText: 'Start the day' }).click();
await page.waitForTimeout(300);
const s2 = await page.locator('#hud-class').innerText();
log('Sem 2:', s2, '|', await page.locator('#hud-mission').innerText());
check(/Semester 2/.test(s2) && /Day 1 of 30/.test(s2) && /Register/.test(await page.locator('#hud-mission').innerText()), 'Semester 2 starts on its registration day');
await page.screenshot({ path: `${OUT}/s05-sem2.png` });

log('ERRORS', JSON.stringify(errors));
log(fails.length ? `FAILED ${fails.length}: ${fails.join(' | ')}` : 'ALL PASS');
await browser.close();
process.exit(fails.length || errors.length ? 1 : 0);
