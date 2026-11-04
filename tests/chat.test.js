import test from 'node:test';
import assert from 'node:assert/strict';
import { analyse, reply } from '../js/core/chat.js';
import { CLASSMATES } from '../data/people.js';

const diya = CLASSMATES.find((c) => c.id === 'diya');
const base = (over = {}) => ({
  kind: 'classmate', npc: diya, classNum: 4, friendLevel: 30, memories: [], turn: 1, seed: 3,
  slot: { type: 'break', label: 'Short Break' }, nextSlot: { label: 'Period 3 · Mathematics', time: '09:45' },
  lessons: [{ id: 'math', name: 'Mathematics', topicName: 'Fractions', teachFirst: 'A fraction is part of a whole.', practised: true, teacherName: 'Ms. Priya Nair' }],
  others: ['Aarav', 'Rohan'], othersInfo: { aarav: CLASSMATES[0], rohan: CLASSMATES[4] }, ...over,
});

test('intent detection matches what was said', () => {
  const cases = {
    'hello diya': 'greet', 'how are you doing today': 'how_are_you', 'kya haal hai': 'how_are_you',
    "what's your favourite subject": 'fav_subject', 'do you want to play football': 'play',
    'tell me a joke': 'joke', 'where is the library': 'where', "what's the next period": 'schedule',
    'i am feeling sad': 'sad', 'you are stupid': 'insult', 'sorry about that': 'apology',
    'thank you so much': 'thanks', 'bye see you later': 'bye', 'i didnt understand maths today': 'help_me',
    'i am not good today': 'sad', 'what do you want to be when you grow up': 'future', 'i am hungry': 'food',
  };
  for (const [text, intent] of Object.entries(cases)) assert.equal(analyse(text, { names: ['Aarav'] }).intent, intent, text);
});

test('entities are extracted', () => {
  const a = analyse('where is the science lab');
  assert.equal(a.place, 'sciencelab');
  assert.deepEqual(analyse('I love maths and physics').subjects.sort(), ['math', 'phy']);
  assert.equal(analyse('what do you think of rohan', { names: ['Rohan'] }).person, 'Rohan');
});

test('replies answer the actual question', () => {
  assert.match(reply('where is the canteen', base()).text, /canteen is/i);
  assert.match(reply('what is the next period', base()).text, /Mathematics at 09:45/);
  assert.match(reply('what is your favourite subject', base()).text, /English|History/);
  assert.match(reply('tell me a joke', base()).text, /\?/);
  const bye = reply('ok bye', base());
  assert.equal(bye.end, true);
});

test('conversation context: answering a question the character asked', () => {
  const r1 = reply('what is your favourite subject', base());
  assert.equal(r1.pending, 'ask_fav_subject');
  const r2 = reply('I like science', base({ pending: 'ask_fav_subject' }));
  assert.equal(r2.effects.fact.favSubject, 'sci');
  assert.match(r2.text, /Science/);
  const r3 = reply('how are you', base());
  assert.equal(r3.pending, 'ask_feeling');
  assert.match(reply('not so good honestly', base({ pending: 'ask_feeling' })).text, /sorry|rough|sit with me/i);
});

test('rudeness hurts friendship and apology repairs it', () => {
  const r = reply('you are an idiot', base());
  assert.ok(r.effects.friend < 0);
  const s = reply('sorry', base({ memories: [{ text: 'you were rude to me', classNum: 4 }] }));
  assert.ok(s.effects.friend > 0);
});

test('unknown input is admitted, not answered randomly', () => {
  const r = reply('purple elephant quantum', base());
  assert.equal(r.intent, 'unknown');
  assert.match(r.text, /didn’t quite get/);
  assert.doesNotMatch(r.text, /^(Sure|Oh!),/);
});

test('teacher explains a topic from their subject', () => {
  const t = reply('can you explain fractions again', {
    kind: 'teacher', npc: { name: 'Ms. Priya Nair', honorific: "Ma'am" }, classNum: 4, turn: 0, seed: 1,
    teacherSubjects: [{ id: 'math', name: 'Mathematics', topics: [{ name: 'Fractions', teach: 'A fraction shows part of a whole.' }] }],
  });
  assert.match(t.text, /fraction shows part of a whole/);
});
