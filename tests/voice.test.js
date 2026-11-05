import test from 'node:test';
import assert from 'node:assert/strict';
import { matchOption } from '../js/voice.js';

const opts = ['Paris', 'New Delhi', 'Mumbai', 'Kolkata'];

test('letters, homophones and cues pick the right option', () => {
  assert.equal(matchOption('B', opts), 1);
  assert.equal(matchOption('see', opts), 2);
  assert.equal(matchOption('option d', opts), 3);
  assert.equal(matchOption('answer is a', opts), 0);
  assert.equal(matchOption('option for', opts), 3);
  assert.equal(matchOption('the second one', opts), 1);
});

test('five-step practicals accept the letter E', () => {
  const steps = ['Set up', 'Release', 'Time it', 'Find T', 'Calculate g'];
  assert.equal(matchOption('option E', steps), 4);
  assert.equal(matchOption('E', steps), 4);
  assert.equal(matchOption('E', opts), -1);
});

test('saying the answer itself works', () => {
  assert.equal(matchOption('new delhi', opts), 1);
  assert.equal(matchOption('I think it is Kolkata', opts), 3);
  assert.equal(matchOption('क', ['म', 'ल', 'क']), 2);
});

test('unclear speech does not guess', () => {
  assert.equal(matchOption('banana', opts), -1);
  assert.equal(matchOption('', opts), -1);
  assert.equal(matchOption('option d', ['x', 'y', 'z']), -1);
});

test('number options: saying the number picks that option, not that position', () => {
  const o = ['1', '2', '4', 'It diverges'];
  assert.equal(matchOption('four', o), 2);
  assert.equal(matchOption('4', o), 2);
  assert.equal(matchOption('for', o), 2);
  assert.equal(matchOption('two', o), 1);
  assert.equal(matchOption('the answer is 4', o), 2);
  assert.equal(matchOption('option D', o), 3);
  assert.equal(matchOption('D', o), 3);
  assert.equal(matchOption('B', o), 1);
  assert.equal(matchOption('it diverges', o), 3);
  assert.equal(matchOption('diverges', o), 3);
  assert.equal(matchOption('I think it is 2', o), 1);
});

test('strict (still speaking) mode never guesses from a stray letter', () => {
  const o = ['a geometric series', 'b', 'c'];
  assert.equal(matchOption('a', ['x', 'y', 'z'], { strict: true }), -1);
  assert.equal(matchOption('option c', ['x', 'y', 'z'], { strict: true }), 2);
  assert.equal(matchOption('a geometric series', o, { strict: true }), 0);
});

test('other option styles still work', () => {
  const o = ['10 min', '1 min', '0.693 min', '100 min'];
  assert.equal(matchOption('ten minutes', ['1 min', '10 min', '0.693 min', '100 min']), 1);
  assert.equal(matchOption('option b', o), 1);
});

test('spoken numbers with units and percentages', () => {
  assert.equal(matchOption('sixty percent', ['60%', '40%', '30%', '100%']), 0);
  assert.equal(matchOption('forty percent', ['60%', '40%', '30%', '100%']), 1);
  assert.equal(matchOption('three ohms', ['12 Ω', '3 Ω', '6 Ω', '36 Ω']), 1);
  assert.equal(matchOption('thirty six', ['12 Ω', '3 Ω', '6 Ω', '36 Ω']), 3);
});
