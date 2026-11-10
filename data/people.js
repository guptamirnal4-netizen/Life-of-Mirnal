import { PROFESSORS } from './college.js';
// Fictional classmates and teachers. Personalities are configurable data, not stereotypes.

export const CLASSMATES = [
  {
    id: 'aarav', name: 'Aarav', personality: 'Competitive', color: '#3b6fd8',
    interest: 'cricket', sport: 'cricket', strengths: ['math', 'phy', 'acc'], weak: ['hin', 'hist'],
    joins: 1, leaves: 12, futureGroup: 'science',
    style: { greet: 'Bet I finish the next test before you!', mood: 'Ready to win, as always.' },
  },
  {
    id: 'diya', name: 'Diya', personality: 'Helpful', color: '#d8573b',
    interest: 'reading stories', sport: 'badminton', strengths: ['eng', 'hist', 'pol', 'evs'], weak: ['math'],
    joins: 1, leaves: 12, futureGroup: 'humanities',
    style: { greet: 'Hi Mirnal! Need help with anything today?', mood: 'Good! I just finished a new book.' },
  },
  {
    id: 'kabir', name: 'Kabir', personality: 'Funny', color: '#e6a72a',
    interest: 'drawing comics', sport: 'football', strengths: ['comp', 'bst', 'ent'], weak: ['sci', 'chem'],
    joins: 1, leaves: 12, futureGroup: 'commerce',
    style: { greet: 'Mirnal! Want to hear a joke? Why did the maths book look sad? Too many problems!', mood: 'Hungry. Always hungry.' },
  },
  {
    id: 'meera', name: 'Meera', personality: 'Introverted', color: '#7e4fc4',
    interest: 'painting and music', sport: 'yoga', strengths: ['sci', 'bio', 'chem', 'evs'], weak: ['sst'],
    joins: 1, leaves: 12, futureGroup: 'science',
    style: { greet: '...oh, hi.', mood: 'Fine. A bit tired.' },
  },
  {
    id: 'rohan', name: 'Rohan', personality: 'Sport enthusiast', color: '#2f9e5b',
    interest: 'football', sport: 'football', strengths: ['pe', 'eco'], weak: ['math', 'eng'],
    joins: 1, leaves: 12, futureGroup: 'commerce',
    style: { greet: 'Football at break? Say yes!', mood: 'Full of energy!' },
  },
  {
    id: 'tanvi', name: 'Tanvi', personality: 'Mischievous', color: '#d0408a',
    interest: 'debating', sport: 'kho-kho', strengths: ['eng', 'sst', 'hin'], weak: ['comp'],
    joins: 1, leaves: 10, futureGroup: null,
    leaveNote: 'Tanvi\'s family is moving to another city after Class 10. She will join a new school there.',
    style: { greet: 'Psst. I heard there is a surprise test today. Just kidding. Maybe.', mood: 'Plotting something fun.' },
  },
  {
    id: 'sana', name: 'Sana', personality: 'Curious', color: '#1aa3a3',
    interest: 'space and coding', sport: 'chess', strengths: ['comp', 'it', 'math', 'cs', 'ai'], weak: ['hin'],
    joins: 6, leaves: 12, futureGroup: 'science',
    joinNote: 'A new student, Sana, has joined your class this year.',
    style: { greet: 'Did you know a day on Venus is longer than its year?', mood: 'Curious! I read about black holes last night.' },
  },
  // College batchmates at BITS Pilani (fictional).
  {
    bitsat: 312, hometown: 'Jaipur', id: 'kartik', name: 'Kartik', personality: 'Competitive', color: '#2f6fd8', college: true,
    interest: 'quizzing', sport: 'cricket', strengths: ['math111', 'chem111', 'math112', 'thermo'], weak: ['bio111', 'trw112'],
    joins: 13, leaves: 99, futureGroup: 'science', discipline: 'Chemical Engineering',
    style: { greet: 'Bro, did you solve the tut sheet? I finished it in twenty minutes.', mood: 'Good, but midsems are coming. I can feel it.' },
  },
  {
    bitsat: 289, hometown: 'Pune', id: 'ira', name: 'Ira', personality: 'Helpful', color: '#c2417a', college: true,
    interest: 'finance and the stock market', sport: 'badminton', strengths: ['math113', 'math111', 'trw112'], weak: ['eg110', 'ws112'],
    joins: 13, leaves: 99, futureGroup: 'commerce', discipline: 'Chemical Engineering',
    style: { greet: 'Mirnal! Saved you a seat. Want my notes from yesterday?', mood: 'Pretty good! I found a great finance podcast.' },
  },
  {
    bitsat: 326, hometown: 'Hyderabad', id: 'rahul', name: 'Rahul', personality: 'Curious', color: '#1f9e8a', college: true,
    interest: 'coding and hackathons', sport: 'chess', strengths: ['cs111', 'math112', 'eee111'], weak: ['chem111', 'bio111'],
    joins: 13, leaves: 99, futureGroup: 'science', discipline: 'Electrical & Electronics',
    style: { greet: 'Hey! Did you know you can write a C program that prints its own source code?', mood: 'Sleepy. I was coding till 3 a.m.' },
  },
  {
    bitsat: 294, hometown: 'Lucknow', id: 'zoya', name: 'Zoya', personality: 'Funny', color: '#e0832a', college: true,
    interest: 'dance and Oasis rehearsals', sport: 'football', strengths: ['phy111', 'eee111'], weak: ['eg110', 'math113'],
    joins: 13, leaves: 99, futureGroup: 'science', discipline: 'Mechanical Engineering',
    style: { greet: 'Mirnal! Quick, tell me something interesting before I fall asleep in this lecture.', mood: 'Running on ANC chai and pure willpower.' },
  },
  {
    bitsat: 281, hometown: 'Chandigarh', id: 'dev', name: 'Dev', personality: 'Sport enthusiast', color: '#3f8f3f', college: true,
    interest: 'football and the gym', sport: 'football', strengths: ['ws112', 'eg110'], weak: ['math111', 'math112'],
    joins: 13, leaves: 99, futureGroup: 'science', discipline: 'Mechanical Engineering',
    style: { greet: 'Mirnal! Football at the ground after labs. You in?', mood: 'Great! Just back from a morning run.' },
  },
  {
    bitsat: 277, hometown: 'Kochi', id: 'saanvi', name: 'Saanvi', personality: 'Introverted', color: '#7a55c4', college: true,
    interest: 'photography', sport: 'yoga', strengths: ['bio111', 'chem111'], weak: ['cs111'],
    joins: 13, leaves: 99, futureGroup: 'science', discipline: 'Chemical Engineering',
    style: { greet: '…oh, hi Mirnal.', mood: 'Okay. I took some nice photos of the Clock Tower at sunset.' },
  },
];

const T = (name, honorific, style) => ({ name, honorific, style });

// [junior teacher (Classes 1–5), senior teacher (Classes 6–10)]
export const TEACHERS = {
  t_eng: [T('Mrs. Kavita Rao', "Ma'am", 'warm storyteller'), T('Mr. Joseph Mathew', 'Sir', 'loves debates')],
  t_hin: [T('Mrs. Sunita Verma', "Ma'am", 'uses songs and poems'), T('Mr. Rakesh Tiwari', 'Sir', 'strict but fair')],
  t_math: [T('Ms. Priya Nair', "Ma'am", 'uses beads and blocks'), T('Mr. Anil Gupta', 'Sir', 'puzzle-first teacher')],
  t_evs: [T('Mrs. Lakshmi Iyer', "Ma'am", 'takes the class outdoors'), T('Mrs. Lakshmi Iyer', "Ma'am", 'takes the class outdoors')],
  t_sci: [T('Ms. Nandini Bose', "Ma'am", 'demonstration-first'), T('Ms. Nandini Bose', "Ma'am", 'demonstration-first')],
  t_sst: [T('Mr. Harpreet Gill', 'Sir', 'map lover'), T('Mr. Harpreet Gill', 'Sir', 'map lover')],
  t_comp: [T('Ms. Rachel D\'Souza', "Ma'am", 'hands-on coder'), T('Ms. Rachel D\'Souza', "Ma'am", 'hands-on coder')],
  t_pe: [T('Mr. Vikram Yadav', 'Sir', 'whistle always ready'), T('Mr. Vikram Yadav', 'Sir', 'whistle always ready')],
};

const SENIOR_TEACHER_NAMES = {
  eng: ['Mr. Joseph Mathew', 'Sir'], phy: ['Dr. Ravi Shankar', 'Sir'], chem: ['Mrs. Meenakshi Pillai', "Ma'am"],
  math: ['Mr. Anil Gupta', 'Sir'], amath: ['Ms. Shalini Kapoor', "Ma'am"], bio: ['Dr. Asha Kulkarni', "Ma'am"],
  cs: ['Ms. Rachel D\'Souza', "Ma'am"], ip: ['Mr. Arjun Menon', 'Sir'], ai: ['Ms. Rachel D\'Souza', "Ma'am"],
  ds: ['Mr. Arjun Menon', 'Sir'], acc: ['Mr. Suresh Agarwal', 'Sir'], bst: ['Mrs. Neha Malhotra', "Ma'am"],
  eco: ['Dr. Kiran Desai', "Ma'am"], ent: ['Mrs. Neha Malhotra', "Ma'am"], hist: ['Mr. Harpreet Gill', 'Sir'],
  pol: ['Mrs. Zainab Qureshi', "Ma'am"], geo: ['Mr. Harpreet Gill', 'Sir'], psy: ['Ms. Tara Fernandes', "Ma'am"],
  soc: ['Mrs. Zainab Qureshi', "Ma'am"], pe: ['Mr. Vikram Yadav', 'Sir'], fmm: ['Mr. Suresh Agarwal', 'Sir'],
};

export function teacherFor(teacherId, classNum) {
  if (teacherId && teacherId.startsWith('prof:')) {
    const name = teacherId.slice(5);
    const p = PROFESSORS[name] || { honorific: 'Sir', style: 'professor' };
    return { id: teacherId, name, honorific: p.honorific, style: p.style };
  }
  if (teacherId && teacherId.startsWith('t_s_')) {
    const [name, honorific] = SENIOR_TEACHER_NAMES[teacherId.slice(4)] || ['Subject Teacher', 'Sir'];
    return { id: teacherId, name, honorific, style: 'senior secondary specialist' };
  }
  const pair = TEACHERS[teacherId] || TEACHERS.t_eng;
  const p = classNum <= 5 ? pair[0] : pair[1];
  return { id: teacherId, ...p };
}

export const PRINCIPAL = { id: 'principal', name: 'Dr. Meera Krishnan', role: 'Principal' };
export const GUARD = { id: 'guard', name: 'Ramesh Bhaiya', role: 'Security' };
export const CANTEEN = { id: 'canteen', name: 'Shankar Uncle', role: 'Canteen' };
export const LIBRARIAN = { id: 'librarian', name: 'Mrs. Gita Bhat', role: 'Librarian' };
export const PARENTS = { id: 'parents', name: "Mirnal's parents", role: 'Family' };

export const CANTEEN_MENU = [
  { item: 'Samosa', price: 15 },
  { item: 'Vada pav', price: 20 },
  { item: 'Idli plate', price: 25 },
  { item: 'Banana', price: 5 },
];

// Visual looks for the 3D characters, keyed by display name (or first name for seniors).
// gender: 'f' | 'm' (only used to pick clothing/hair models); outfit: uniform | casual | saree | kurta | formal | labcoat | tracksuit | guard
// hair: short | spiky | long | ponytail | braids | bun | grey | turban; extras: glasses, mustache
// Krishna Bhawan hostel-mates (fictional). Krishna is a boys' Bhawan.
export const HOSTELMATES = [
  { id: 'aditya', name: 'Aditya', color: '#c62828', pants: '#263238', lines: ['Bro, TT tonight? The common room table is free after dinner.', 'Mess had paneer today. Paneer! Celebrate.'] },
  { id: 'varun', name: 'Varun', color: '#1565c0', pants: '#3e2723', lines: ['I have a quiz tomorrow and I have not opened the book. Classic.', 'Did you see the notice? Room inspection on Saturday.'] },
  { id: 'nikhil', name: 'Nikhil', color: '#2e7d32', pants: '#212121', lines: ['The vending machine ate my ₹20 again.', 'Wi-Fi is better near the lobby, trust me.'] },
  { id: 'harsh', name: 'Harsh', color: '#6a1b9a', pants: '#37474f', lines: ['Foosball rematch? I was not ready last time.', 'Hostel life is 50% Maggi, 50% deadlines.'] },
  { id: 'pranav', name: 'Pranav', color: '#ef6c00', pants: '#263238', lines: ['Shh, I am studying. Okay, five minutes of talking.', 'If you need notes for Thermo, I have them.'] },
  { id: 'siddharth', name: 'Siddharth', color: '#00838f', pants: '#1b1b1b', lines: ['The match is in the last over! Sit, sit.', 'Who switched the channel?'] },
  { id: 'aman', name: 'Aman', color: '#ad1457', pants: '#3e2723', lines: ['Badminton in the QT at six. Bring your own shuttle.', 'The courtyard is the best part of this Bhawan.'] },
  { id: 'rohan', name: 'Rohan', color: '#455a64', pants: '#212121', lines: ['First floor gets all the breeze. Come up sometime.', 'My roommate snores like a generator.'] },
  { id: 'yash', name: 'Yash', color: '#f9a825', pants: '#263238', lines: ['Carrom is a serious sport here. Respect the striker.', 'Queen is mine. Always.'] },
  { id: 'kunal', name: 'Kunal', color: '#4e342e', pants: '#37474f', lines: ['Senior tip: never skip the first lab.', 'Oasis prep has already started. Join a club!'] },
  { id: 'tejas', name: 'Tejas', color: '#283593', pants: '#1b1b1b', lines: ['Going to ANC, want anything?', 'The geyser on the first floor is the only reliable one.'] },
  { id: 'ishaan', name: 'Ishaan', color: '#558b2f', pants: '#3e2723', lines: ['I just came back from the gym corner. Never again.', 'Laundry day. Again.'] },
];

export const LOOKS = {
  Aarav: { gender: 'm', hair: 'short' },
  Diya: { gender: 'f', hair: 'braids' },
  Kabir: { gender: 'm', hair: 'spiky' },
  Meera: { gender: 'f', hair: 'ponytail' },
  Rohan: { gender: 'm', hair: 'short' },
  Tanvi: { gender: 'f', hair: 'ponytail' },
  Sana: { gender: 'f', hair: 'long' },
  Ishaan: { gender: 'm', hair: 'short' },
  Ananya: { gender: 'f', hair: 'ponytail' },
  Varun: { gender: 'm', hair: 'spiky' },
  Riya: { gender: 'f', hair: 'braids' },
  Aditi: { gender: 'f', hair: 'long' },
  Neel: { gender: 'm', hair: 'short' },
  'Mrs. Kavita Rao': { gender: 'f', outfit: 'saree', hair: 'bun' },
  'Mr. Joseph Mathew': { gender: 'm', outfit: 'formal', hair: 'short', glasses: true },
  'Mrs. Sunita Verma': { gender: 'f', outfit: 'saree', hair: 'bun' },
  'Mr. Rakesh Tiwari': { gender: 'm', outfit: 'formal', hair: 'short', mustache: true },
  'Ms. Priya Nair': { gender: 'f', outfit: 'kurta', hair: 'ponytail' },
  'Mr. Anil Gupta': { gender: 'm', outfit: 'formal', hair: 'grey', glasses: true },
  'Mrs. Lakshmi Iyer': { gender: 'f', outfit: 'saree', hair: 'braids' },
  'Ms. Nandini Bose': { gender: 'f', outfit: 'labcoat', hair: 'long' },
  'Mr. Harpreet Gill': { gender: 'm', outfit: 'formal', hair: 'turban' },
  "Ms. Rachel D'Souza": { gender: 'f', outfit: 'formal', hair: 'long', glasses: true },
  'Mr. Vikram Yadav': { gender: 'm', outfit: 'tracksuit', hair: 'short', mustache: true },
  'Dr. Ravi Shankar': { gender: 'm', outfit: 'labcoat', hair: 'grey', glasses: true },
  'Mrs. Meenakshi Pillai': { gender: 'f', outfit: 'saree', hair: 'bun' },
  'Ms. Shalini Kapoor': { gender: 'f', outfit: 'kurta', hair: 'long' },
  'Dr. Asha Kulkarni': { gender: 'f', outfit: 'labcoat', hair: 'bun', glasses: true },
  'Mr. Arjun Menon': { gender: 'm', outfit: 'formal', hair: 'short' },
  'Mr. Suresh Agarwal': { gender: 'm', outfit: 'formal', hair: 'grey', mustache: true },
  'Mrs. Neha Malhotra': { gender: 'f', outfit: 'saree', hair: 'long' },
  'Dr. Kiran Desai': { gender: 'f', outfit: 'kurta', hair: 'bun', glasses: true },
  'Mrs. Zainab Qureshi': { gender: 'f', outfit: 'kurta', hair: 'long' },
  'Ms. Tara Fernandes': { gender: 'f', outfit: 'formal', hair: 'ponytail' },
  'Dr. Meera Krishnan': { gender: 'f', outfit: 'saree', hair: 'bun', glasses: true },
  'Ramesh Bhaiya': { gender: 'm', outfit: 'guard', hair: 'short', mustache: true },
  'Shankar Uncle': { gender: 'm', outfit: 'kurta', hair: 'grey', mustache: true },
  'Mrs. Gita Bhat': { gender: 'f', outfit: 'saree', hair: 'bun', glasses: true },
  'Ms. Farah Ali': { gender: 'f', outfit: 'kurta', hair: 'long' },
  "Mirnal's parents": { gender: 'm', outfit: 'formal', hair: 'short' },
  Kartik: { gender: 'm', hair: 'short', outfit: 'casual' },
  Ira: { gender: 'f', hair: 'long', outfit: 'casual' },
  Rahul: { gender: 'm', hair: 'spiky', glasses: true, outfit: 'casual' },
  Zoya: { gender: 'f', hair: 'ponytail', outfit: 'casual' },
  Dev: { gender: 'm', hair: 'short', outfit: 'casual' },
  Saanvi: { gender: 'f', hair: 'braids', outfit: 'casual' },
  'Prof. R. Natarajan': { gender: 'm', outfit: 'labcoat', hair: 'grey', glasses: true },
  'Prof. Meghna Rao': { gender: 'f', outfit: 'kurta', hair: 'bun' },
  'Dr. Sameer Joshi': { gender: 'm', outfit: 'formal', hair: 'short', glasses: true },
  'Prof. Kavya Menon': { gender: 'f', outfit: 'saree', hair: 'long' },
  'Dr. Arvind Sethi': { gender: 'm', outfit: 'formal', hair: 'grey', mustache: true },
  'Prof. Neha Bhardwaj': { gender: 'f', outfit: 'formal', hair: 'ponytail', glasses: true },
  'Dr. Imran Qadri': { gender: 'm', outfit: 'labcoat', hair: 'short' },
  'Prof. Lata Deshpande': { gender: 'f', outfit: 'saree', hair: 'bun' },
  Aditya: { gender: 'm', hair: 'short', outfit: 'casual' },
  Varun: { gender: 'm', hair: 'spiky', outfit: 'casual', glasses: true },
  Nikhil: { gender: 'm', hair: 'short', outfit: 'casual' },
  Harsh: { gender: 'm', hair: 'spiky', outfit: 'casual' },
  Pranav: { gender: 'm', hair: 'short', outfit: 'casual', glasses: true },
  Siddharth: { gender: 'm', hair: 'short', outfit: 'casual' },
  Aman: { gender: 'm', hair: 'spiky', outfit: 'casual' },
  Rohan: { gender: 'm', hair: 'short', outfit: 'casual', mustache: true },
  Yash: { gender: 'm', hair: 'short', outfit: 'casual' },
  Kunal: { gender: 'm', hair: 'short', outfit: 'casual', glasses: true },
  Tejas: { gender: 'm', hair: 'spiky', outfit: 'casual' },
  Ishaan: { gender: 'm', hair: 'short', outfit: 'casual' },
};
