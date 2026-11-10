import test from 'node:test';
import assert from 'node:assert/strict';
import { MEALS, MENU, menuFor, COUNTER_FOOD, PITSTOP } from '../data/mess.js';

test('every day has a breakfast, lunch and dinner on the menu, repeating every four days', () => {
  for (let d = 0; d < 12; d++) {
    const m = menuFor(d);
    assert.deepEqual(Object.keys(m), Object.keys(MEALS));
    for (const meal of Object.keys(MEALS)) assert.equal(m[meal], MENU[meal][d % 4]);
  }
  assert.notEqual(menuFor(0).lunch, menuFor(1).lunch);
});

test('the serving counter has four tubs of food for every meal', () => {
  for (const meal of Object.keys(MEALS)) {
    assert.equal(COUNTER_FOOD[meal].length, 4, meal);
    for (const c of COUNTER_FOOD[meal]) assert.match(c, /^#[0-9a-f]{6}$/);
  }
});

test('Pitstop sells extras with a price and a name you can say', () => {
  assert.ok(PITSTOP.length >= 6);
  const ids = new Set();
  for (const it of PITSTOP) {
    assert.ok(it.price > 0 && it.price < 200, it.name);
    assert.match(it.id, /^[a-z ]+$/);
    assert.ok(!ids.has(it.id));
    ids.add(it.id);
  }
});
