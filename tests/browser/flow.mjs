import { chromium } from 'playwright-core';

const OUT = process.argv[2];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
await page.goto('http://localhost:8080/', { waitUntil: 'load' });
await page.waitForTimeout(1000);
await page.getByRole('button', { name: 'Start New Game' }).click();
await page.getByRole('button', { name: 'Start the day' }).click();

const clickText = async (text) => {
  await page.locator('#overlay button', { hasText: text }).first().click();
  await page.waitForTimeout(200);
};

// Jump to a class with everything done, then go to the gate at dismissal.
const prepareClass = async (c, stream) => page.evaluate(async ([c, stream]) => {
  const g = window.__game;
  const cur = await import('/data/curriculum.js');
  const s = g.state;
  s.classNum = c;
  s.phase = 'day';
  if (stream) s.stream = stream;
  s.player = null;
  s.years[c] = { classNum: c, attempts: 1, results: null, attendancePct: null, promoted: false, remedial: null, events: [], summary: null, previousAttempts: [], stream: null };
  s.day = { clock: 7 * 60 + 30, attendance: {}, lessonsDone: {}, assemblyDone: true, eventDone: true, practicalsDone: {}, projectDone: true, optional: { talked: [], goal: false, library: false, canteen: false, helped: false }, ended: false };
  for (const subj of cur.getClassSubjects(c, s.stream)) s.day.lessonsDone[subj.id] = true;
  for (const p of cur.getPracticals(c, s.stream)) s.day.practicalsDone[p.subject] = 1;
  g.startGame(s, true);
  document.querySelectorAll('#overlay .panel').forEach(() => {});
  s.day.clock = g.slots.at(-1).start + 1;
  return g.slots.length;
}, [c, stream]);

const answerExam = async () => {
  for (let i = 0; i < 80; i++) {
    const opts = page.locator('#overlay button.option:not([disabled])');
    if (!(await opts.count())) break;
    const idx = await page.evaluate(async () => {
      const cur = await import('/data/curriculum.js');
      const q = document.querySelector('#overlay h3').textContent;
      const all = [];
      const { PRIMARY_CLASSES } = await import('/data/curriculum-primary.js');
      const { MIDDLE_CLASSES } = await import('/data/curriculum-middle.js');
      for (const c of [...Object.values(PRIMARY_CLASSES), ...Object.values(MIDDLE_CLASSES)]) for (const s of c.subjects) for (const t of s.topics) all.push(t.exam, t.practice);
      for (const s of Object.values(cur.SENIOR_SUBJECTS)) for (const k of [11, 12]) for (const t of s.topics[k]) all.push(t.exam, t.practice);
      const found = all.find((x) => x.q === q);
      return found ? found.answer : 0;
    });
    await opts.nth(idx).click();
    await page.waitForTimeout(750);
  }
};

const closePanels = async () => page.evaluate(() => { while (document.querySelector('#overlay.open')) { const b = document.querySelector('#overlay .panel-head .close') || document.querySelector('#overlay button.primary'); if (!b) break; b.click(); } });

// ---- Class 10 → exams → orientation
await page.waitForTimeout(300);
await closePanels();
await prepareClass(10, null);
await closePanels();
await page.waitForTimeout(300);
await page.evaluate(() => window.__game.handleInteractable('gate'));
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/20-end-of-day.png` });
await clickText('exam hall');
await clickText('Begin exam');
await answerExam();
await page.screenshot({ path: `${OUT}/21-report-10.png` });
await clickText('Promoted to Class 11');
await page.screenshot({ path: `${OUT}/22-summary-10.png` });
await clickText('Continue');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/23-orientation-intro.png` });
await clickText('explore');
console.log('phase after class 10:', await page.evaluate(() => window.__game.state.phase));

// Counsellor → streams
await page.evaluate(() => { const g = window.__game; g.player.pos.set(-36, 0, 30); g.handleInteractable('auditoriumStage'); });
await page.waitForTimeout(300);
for (let i = 0; i < 4; i++) {
  if (await page.locator('#overlay button', { hasText: 'Show me the streams' }).count()) break;
  await clickText('Go on');
}
await clickText('Show me the streams');
await page.screenshot({ path: `${OUT}/24-streams.png` });
await page.locator('.stream-card').first().getByRole('button').click();
await page.waitForTimeout(200);
await page.locator('.chip-info').nth(0).click();
await page.screenshot({ path: `${OUT}/25-builder.png`, fullPage: false });
// Try an invalid combo: add IP alongside CS
const chipNames = await page.locator('.chips').nth(1).locator('.chip-main').allTextContents();
console.log('elective chips', chipNames.length);
await page.locator('.chips').nth(1).locator('.chip-main', { hasText: 'Informatics' }).click();
await page.waitForTimeout(200);
console.log('validation:', (await page.locator('.validation').innerText()).replace(/\n/g, ' | '));
await page.screenshot({ path: `${OUT}/26-builder-invalid.png` });
await page.locator('.chips').nth(1).locator('.chip-main', { hasText: 'Informatics' }).click();
await page.waitForTimeout(200);
await clickText('Review & compare');
await page.screenshot({ path: `${OUT}/27-compare.png` });
await clickText('Confirm my subjects');
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/28-class11-intro.png` });
console.log('stream:', JSON.stringify(await page.evaluate(() => window.__game.state.stream)), 'class', await page.evaluate(() => window.__game.state.classNum));
await closePanels();
await page.evaluate(() => { const g = window.__game; g.player.pos.set(-16, 0, -22); g.player.yaw = 0; });
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/29-class11-room.png` });

// ---- Class 12 → graduation
await prepareClass(12, null);
await closePanels();
await page.evaluate(() => window.__game.handleInteractable('gate'));
await clickText('exam hall');
await clickText('Begin exam');
await answerExam();
await page.screenshot({ path: `${OUT}/30-report-12.png` });
await clickText('Graduate');
await clickText('Continue');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/31-graduation.png` });
await clickText('School Journey');
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/32-final-portfolio.png` });
await clickText('full Learning Journey');
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/33-journey-12.png` });
await page.locator('#overlay .tabs button', { hasText: 'Growth Dashboard' }).last().click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/34-dashboard.png` });
console.log('final phase', await page.evaluate(() => window.__game.state.phase));
console.log('ERRORS', JSON.stringify(errors, null, 1));
await browser.close();
