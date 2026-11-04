// Offline conversation engine: understands what the player said (intent + entities), keeps context,
// and answers in the character's own personality. Pure logic, no DOM, so it can be unit-tested.

const norm = (s) => ` ${s.toLowerCase().normalize('NFC').replace(/[’']/g, '').replace(/[^\p{L}\p{N}\p{M}\s]/gu, ' ').replace(/\s+/g, ' ').trim()} `;
const has = (t, phrase) => t.includes(` ${phrase} `);
const pick = (arr, seed) => arr[Math.abs(seed) % arr.length];

// ---------- Entities ----------
const SUBJECT_WORDS = {
  math: ['math', 'maths', 'mathematics', 'ganit', 'गणित', 'algebra', 'geometry'],
  amath: ['applied maths', 'applied math', 'applied mathematics'],
  sci: ['science', 'vigyan', 'विज्ञान'],
  eng: ['english', 'grammar', 'angrezi'],
  hin: ['hindi', 'हिंदी', 'हिन्दी'],
  evs: ['evs', 'environmental', 'environment'],
  sst: ['social science', 'sst', 'social studies', 'civics'],
  comp: ['computer', 'computers', 'coding', 'programming'],
  it: ['information technology', 'it class'],
  phy: ['physics', 'bhautiki'],
  chem: ['chemistry', 'rasayan'],
  bio: ['biology', 'bio', 'jeev vigyan'],
  cs: ['computer science', 'python'],
  ip: ['informatics', 'informatics practices'],
  acc: ['accounts', 'accountancy', 'accounting'],
  bst: ['business studies', 'business', 'bst'],
  eco: ['economics', 'eco', 'arthashastra'],
  hist: ['history', 'itihas'],
  geo: ['geography', 'maps'],
  pol: ['political science', 'politics', 'pol science'],
  psy: ['psychology'],
  soc: ['sociology'],
  pe: ['physical education', 'pe', 'sports class', 'games period'],
  ent: ['entrepreneurship'],
  ai: ['artificial intelligence', 'ai'],
  ds: ['data science'],
  fmm: ['financial markets', 'stock market'],
};

export const PLACES = {
  library: { words: ['library', 'books', 'pustakalaya'], where: 'The library is in the main block, between the Principal’s office and the Science lab.' },
  canteen: { words: ['canteen', 'cafeteria', 'snacks'], where: 'The canteen is the red-roofed shelter on the left, past the Computer Lab.' },
  sciencelab: { words: ['science lab', 'lab', 'laboratory'], where: 'The Science Lab is at the right end of the main block.' },
  complab: { words: ['computer lab'], where: 'The Computer Lab is in the west building, next to the canteen.' },
  playground: { words: ['playground', 'ground', 'field', 'football field'], where: 'The playground is on the right side of the school. Look for the goalposts!' },
  classroom: { words: ['classroom', 'our class', 'class room'], where: 'Our classroom is at the left end of the main block. Look for the door with our class name.' },
  staffroom: { words: ['staff room', 'staffroom', 'teachers room'], where: 'The staff room is in the main block, right next to our classroom.' },
  principal: { words: ['principal', 'principals office', 'office'], where: 'The Principal’s office is in the middle of the main block, behind the stage.' },
  auditorium: { words: ['auditorium', 'hall'], where: 'The auditorium is the big building at the back left, near the bus stop.' },
  gate: { words: ['gate', 'exit', 'main gate', 'bus'], where: 'The main gate is straight down the path from the assembly ground. The bus waits on the left.' },
  washroom: { words: ['washroom', 'toilet', 'bathroom', 'restroom'], where: 'The washrooms are at the far right of the main block, past the Science Lab.' },
  assembly: { words: ['assembly', 'assembly ground', 'stage'], where: 'The assembly ground is the big open square in the middle, with the flag on the left.' },
};

const SPORTS = ['football', 'cricket', 'badminton', 'chess', 'kho kho', 'kabaddi', 'basketball', 'yoga', 'tag', 'running', 'race'];
const FOODS = ['samosa', 'vada pav', 'idli', 'banana', 'tiffin', 'lunch', 'paratha', 'dosa', 'maggi', 'sandwich', 'chocolate', 'ice cream', 'food', 'khana'];

// ---------- Intents ----------
// Each intent: phrases (matched as whole words/phrases). Longer phrases score higher.
const INTENTS = [
  ['greet', ['hi', 'hello', 'hey', 'hii', 'heyy', 'namaste', 'namaskar', 'good morning', 'good afternoon', 'good evening', 'hola', 'yo', 'sup', 'नमस्ते']],
  ['how_are_you', ['how are you', 'how r u', 'how are u', 'hows it going', 'how is it going', 'how you doing', 'whats up', 'wassup', 'kaise ho', 'kaisi ho', 'kya haal', 'kya hal', 'how do you feel', 'are you ok', 'are you okay', 'how was your day', 'how is your day']],
  ['name', ['your name', 'who are you', 'tumhara naam', 'aapka naam', 'naam kya']],
  ['hobby', ['hobby', 'hobbies', 'free time', 'like to do', 'like doing', 'do for fun', 'what do you like', 'what you like', 'interests', 'pasand', 'enjoy doing', 'weekend']],
  ['fav_subject', ['favourite subject', 'favorite subject', 'best subject', 'which subject', 'what subject', 'subject do you like', 'subject you like', 'pasandida subject', 'like studying']],
  ['play', ['play', 'lets play', 'wanna play', 'want to play', 'game', 'khelna', 'khelenge', 'match', 'sports', 'sport']],
  ['help_me', ['didnt understand', 'did not understand', 'dont understand', 'do not understand', 'confused', 'explain', 'help me', 'can you help', 'teach me', 'samajh nahi', 'samjha nahi', 'doubt', 'meaning of', 'i need help', 'need help with', 'how does', 'stuck on', 'what does it mean']],
  ['offer_help', ['i can help', 'can i help', 'let me help', 'i will explain', 'ill explain', 'shall i explain', 'should i explain', 'i can explain', 'do you need help']],
  ['homework', ['homework', 'assignment', 'project', 'grihkaam', 'home work']],
  ['exam', ['exam', 'exams', 'test', 'tests', 'marks', 'result', 'results', 'report card', 'pariksha', 'board exam', 'boards', 'study', 'studying', 'revision']],
  ['food', ['hungry', 'eat', 'eating', 'lunch', 'tiffin', 'canteen', 'snack', 'food', 'khana', 'bhook', 'samosa', 'vada pav', 'idli', 'what did you bring']],
  ['schedule', ['next period', 'next class', 'whats next', 'what is next', 'which period', 'what period', 'timetable', 'time table', 'when is', 'what time', 'kitne baje', 'break time', 'when does school end', 'when is lunch']],
  ['where', ['where is', 'where are', 'how do i get', 'how to go', 'kahan hai', 'kidhar', 'way to', 'directions', 'where can i find']],
  ['joke', ['joke', 'jokes', 'funny', 'make me laugh', 'chutkula', 'something funny']],
  ['sad', ['sad', 'upset', 'tired', 'bored', 'stressed', 'stress', 'scared', 'nervous', 'worried', 'lonely', 'not good', 'not well', 'bad day', 'feel bad', 'dukhi', 'pareshan', 'unhappy', 'angry', 'sick']],
  ['happy', ['happy', 'great', 'good', 'awesome', 'fine', 'excited', 'fantastic', 'mast', 'badhiya', 'accha', 'achha', 'not bad', 'okay', 'ok']],
  ['compliment', ['you are nice', 'youre nice', 'you are smart', 'youre smart', 'you are cool', 'youre cool', 'you are awesome', 'youre awesome', 'you are kind', 'good friend', 'best friend', 'you are funny', 'youre funny', 'i like you', 'well done', 'great job', 'you are the best', 'youre the best', 'nice shirt']],
  ['insult', ['stupid', 'idiot', 'dumb', 'loser', 'shut up', 'hate you', 'ugly', 'fool', 'useless', 'pagal', 'bewakoof', 'go away', 'nobody likes you', 'boring']],
  ['apology', ['sorry', 'apologise', 'apologize', 'my bad', 'maaf', 'forgive me']],
  ['thanks', ['thanks', 'thank you', 'thank u', 'thx', 'shukriya', 'dhanyavad', 'धन्यवाद']],
  ['future', ['grow up', 'future', 'career', 'dream', 'want to become', 'want to be', 'aim', 'ambition', 'job', 'banna']],
  ['stream', ['stream', 'class 11', 'class eleven', 'pcm', 'pcb', 'commerce', 'humanities', 'arts', 'which subjects will you take', 'branch', 'your branch', 'which branch', 'what branch', 'the branch', 'my branch', 'discipline', 'department', 'major', 'which engineering', 'what are you studying', 'what do you study']],
  ['bitsat', ['bitsat', 'bit sat', 'bits at', 'bitsat score', 'entrance exam', 'entrance', 'your score', 'my score', 'jee', 'cutoff', 'cut off', 'how much did you get', 'what did you score', 'rank']],
  ['hometown', ['where are you from', 'where r u from', 'hometown', 'home town', 'kahan se', 'kaha se', 'which city', 'native place', 'where is your home', 'where do you live', 'which state']],
  ['hostel', ['hostel', 'wing', 'wingie', 'wingies', 'roommate', 'room mate', 'your room', 'bhawan', 'bhavan']],
  ['clubs', ['club', 'clubs', 'society', 'societies', 'join any', 'dance club', 'music club', 'coding club', 'extracurricular', 'tech team', 'fest team']],
  ['cgpa', ['cgpa', 'sgpa', 'pointer', 'gpa', 'grades', 'grade sheet']],
  ['ps', ['practice school', 'ps1', 'ps 1', 'ps-1', 'ps2', 'internship', 'internships', 'placement', 'placements', 'minor', 'dual degree', 'finance minor']],
  ['weather', ['weather', 'hot', 'rain', 'raining', 'sunny', 'cold', 'garmi', 'barish', 'mausam']],
  ['what_doing', ['what are you doing', 'what r u doing', 'kya kar rahe', 'kya kar rahi', 'busy']],
  ['class_info', ['which class', 'what class are we', 'how old', 'your age', 'kaunsi class']],
  ['friends', ['friends with', 'your friends', 'best friend', 'who do you like', 'dost']],
  ['book', ['book', 'books', 'read', 'reading', 'novel', 'recommend']],
  ['and_you', ['and you', 'what about you', 'how about you', 'aur tum', 'aur aap', 'tum batao', 'your turn', 'you tell me', 'and yours', 'and u', 'wbu', 'hbu']],
  ['share_like', ['i like', 'i love', 'i enjoy', 'im into', 'i am into', 'my favourite', 'my favorite', 'mujhe pasand']],
  ['yes', ['yes', 'yeah', 'yep', 'sure', 'okay', 'ok', 'of course', 'haan', 'ha', 'han', 'chalo', 'definitely', 'alright', 'sounds good', 'why not']],
  ['no', ['no', 'nope', 'nah', 'nahi', 'nahin', 'not now', 'later', 'maybe later', 'not really']],
  ['why', ['why', 'kyun', 'kyu', 'how come']],
  ['bye', ['bye', 'goodbye', 'good bye', 'see you', 'see ya', 'later', 'gotta go', 'have to go', 'alvida', 'chalta hoon', 'chalti hoon', 'tata', 'take care', 'cya']],
];

const INTENT_WEIGHT = { yes: 0.6, no: 0.6, happy: 0.8, greet: 0.9, play: 0.9, why: 0.7, bye: 1.1, and_you: 0.9, share_like: 0.85 };

export function analyse(text, { names = [] } = {}) {
  const t = norm(text);
  const scores = {};
  for (const [id, phrases] of INTENTS) {
    let s = 0;
    for (const p of phrases) if (has(t, p)) s += 1 + p.split(' ').length * 0.6;
    if (s) scores[id] = s * (INTENT_WEIGHT[id] || 1);
  }
  const subjects = Object.entries(SUBJECT_WORDS).filter(([, ws]) => ws.some((w) => has(t, w))).map(([id]) => id);
  if (subjects.includes('cs')) subjects.splice(subjects.indexOf('comp'), subjects.includes('comp') ? 1 : 0);
  const place = Object.entries(PLACES).find(([, p]) => p.words.some((w) => has(t, w)))?.[0] || null;
  const sport = SPORTS.find((s) => has(t, s)) || null;
  const food = FOODS.find((f) => has(t, f)) || null;
  const person = names.find((n) => has(t, n.toLowerCase())) || null;
  // Negations flip happy → sad ("not good", "not happy").
  if (scores.happy && /\b(not|nahi|never|bilkul nahi)\b/.test(t)) {
    scores.sad = (scores.sad || 0) + scores.happy;
    delete scores.happy;
  }
  if (place && scores.where === undefined && /\b(where|kahan|kidhar|how to get)\b/.test(t)) scores.where = 3;
  if (person && Object.keys(scores).length === 0) scores.person = 2;
  else if (person && !scores.insult && !scores.compliment) scores.person = (scores.person || 0) + 1.5;
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return {
    text,
    norm: t,
    intent: ranked[0]?.[0] || 'unknown',
    intents: ranked.map(([id]) => id),
    alsoGreeting: !!scores.greet && ranked[0]?.[0] !== 'greet',
    subjects,
    place,
    sport,
    food,
    person,
  };
}

// ---------- Personality flavour ----------
const OPENERS = {
  Competitive: ['Ha!', 'Okay, listen.', 'Obviously,'],
  Helpful: ['Oh!', 'Sure,', 'Aww,'],
  Funny: ['Haha,', 'Arre,', 'Okay okay,'],
  Introverted: ['Um…', 'Oh… ', 'Hmm,'],
  'Sport enthusiast': ['Yo!', 'Bro,', 'Arre yaar,'],
  Mischievous: ['Psst…', 'Hehe,', 'Ooh,'],
  Curious: ['Ooh,', 'Wait,', 'Hmm!'],
};

const JOKES = [
  'Why did the student eat his homework? Because the teacher said it was a piece of cake!',
  'Why was the maths book sad? It had too many problems.',
  'What do you call a sleeping dinosaur? A dino-snore!',
  'Why did the cricket team go to the bank? To get their balance!',
  'Teacher: Why are you late? Me: Because of the sign. Teacher: What sign? Me: The one that says “School ahead, go slow”!',
  'Why don’t eggs tell jokes? They’d crack each other up.',
  'What’s a computer’s favourite snack? Microchips!',
];

const FUTURE = {
  science: ['an engineer who builds rockets', 'a doctor', 'a scientist'],
  commerce: ['a businessperson with my own startup', 'a chartered accountant'],
  humanities: ['a journalist', 'a lawyer', 'a writer'],
  null: ['someone who travels the world'],
};

const SUBJECT_NAMES = {
  math: 'Maths', sci: 'Science', eng: 'English', hin: 'Hindi', evs: 'EVS', sst: 'Social Science', comp: 'Computers', it: 'IT',
  phy: 'Physics', chem: 'Chemistry', bio: 'Biology', cs: 'Computer Science', ip: 'Informatics Practices', acc: 'Accountancy',
  bst: 'Business Studies', eco: 'Economics', hist: 'History', geo: 'Geography', pol: 'Political Science', psy: 'Psychology',
  soc: 'Sociology', pe: 'Physical Education', ent: 'Entrepreneurship', ai: 'AI', ds: 'Data Science', fmm: 'Financial Markets', amath: 'Applied Maths',
};
export const subjectLabel = (id) => SUBJECT_NAMES[id] || id;

// ---------- Reply ----------
// ctx: { kind: 'classmate'|'teacher'|'staff'|'senior', npc, classNum, slot, nextSlot, lessons, friendLevel, memories,
//        playerFacts, pending, turn, seed, others, staffRole }
const REPEAT_SENSITIVE = new Set(['name', 'hobby', 'fav_subject', 'future', 'how_are_you', 'class_info', 'stream']);
const SECONDARY_OK = new Set(['how_are_you', 'hobby', 'fav_subject', 'play', 'food', 'schedule', 'where', 'joke', 'exam', 'homework', 'future', 'help_me']);

export function newConvo() {
  return { asked: {}, lastTopic: null, used: new Set() };
}

export function reply(text, ctx) {
  const a = analyse(text, { names: ctx.others || [] });
  const seed = (ctx.seed || 0) + (ctx.turn || 0) * 7 + text.length;
  const convo = ctx.convo || newConvo();
  const out = { intent: a.intent, analysis: a, text: '', effects: { friend: 0, rep: 0, memory: null, fact: null, action: null }, pending: null, suggestions: [], end: false };
  const run = (analysis, target) => {
    if (ctx.kind === 'teacher') teacherReply(analysis, ctx, target, seed);
    else if (ctx.kind === 'staff') staffReply(analysis, ctx, target, seed);
    else classmateReply(analysis, { ...ctx, convo }, target, seed);
  };
  run(a, out);
  // People answer more than one thing at once: "hi! how are you? want to play later?"
  if (ctx.kind === 'classmate' && !out.end && out.intent !== 'unknown' && !out.handledPending) {
    const second = a.intents.find((id) => id !== a.intent && SECONDARY_OK.has(id) && id !== 'help_me' && !(id === 'where' && !a.place));
    if (second && second !== out.intent) {
      const extra = { ...out, effects: { ...out.effects }, text: '' };
      run({ ...a, intent: second }, extra);
      if (extra.text && extra.text.length < 160) {
        out.text = `${out.text} ${extra.text}`;
        out.pending = extra.pending || out.pending;
        out.effects.friend += extra.effects.friend > 0 ? 1 : 0;
      }
    }
  }
  if (ctx.kind === 'classmate' && REPEAT_SENSITIVE.has(a.intent) && convo.asked[a.intent] && !out.handledPending) {
    out.text = `${pick(['Haha, you already asked me that!', 'Déjà vu? You asked that a minute ago.', 'Again? Okay:'], seed)} ${out.text.split(/(?<=[.!?])\s/)[0]}`;
    out.pending = null;
  }
  convo.asked[a.intent] = (convo.asked[a.intent] || 0) + 1;
  if (!['why', 'yes', 'no', 'and_you', 'unknown'].includes(a.intent)) convo.lastTopic = a.intent;
  convo.used.add(out.text);
  if (!out.suggestions.length) out.suggestions = defaultSuggestions(ctx, out.intent, seed);
  return out;
}

// Pick a line this character hasn't already said in this conversation.
function fresh(convo, arr, seed) {
  const unused = arr.filter((l) => !convo?.used?.has(l));
  return pick(unused.length ? unused : arr, seed);
}

function young(ctx) {
  return ctx.classNum <= 5;
}

function partOfDay(ctx) {
  const m = ctx.clock ?? 600;
  if (m < 12 * 60) return 'morning';
  if (m < 16 * 60) return 'afternoon';
  return 'evening';
}

function scheduleLine(ctx) {
  if (!ctx.slot) return 'I’m not sure. Check the timetable on the notice board.';
  const now = `Right now it’s ${ctx.slot.label.toLowerCase()}.`;
  if (!ctx.nextSlot) return `${now} After that, we go home!`;
  return `${now} Next is ${ctx.nextSlot.label.replace(/^Period \d+ · /, '')} at ${ctx.nextSlot.time}.`;
}

function ownAnswer(topic, ctx) {
  const npc = ctx.npc;
  if (topic === 'ask_feeling' || topic === 'how_are_you' || topic === 'sad' || topic === 'happy') return `Me? ${npc.style.mood}`;
  if (topic === 'ask_fav_subject' || topic === 'fav_subject') return `Mine's ${subjectLabel(npc.strengths[0])}, obviously.`;
  if (topic === 'ask_hobby' || topic === 'hobby' || topic === 'share_like') return `Me, I'm all about ${npc.interest}.`;
  if (topic === 'play') return `I'm a ${npc.sport} person myself.`;
  if (topic === 'future') return 'Honestly, I’m still figuring it out.';
  if (topic === 'bitsat' || topic === 'ask_bitsat') return `I got ${npc.bitsat}.`;
  if (topic === 'hometown' || topic === 'ask_hometown') return `I’m from ${npc.hometown}.`;
  if (topic === 'stream') return `I’m in ${npc.discipline || 'engineering'}.`;
  if (topic === 'ask_lesson') {
    const l = ctx.openerLesson;
    return l ? `I found it ${npc.strengths.includes(l.id) ? 'pretty easy, actually' : 'kind of hard, honestly'}.` : 'I liked it.';
  }
  return 'Same here, more or less!';
}

function handlePending(a, ctx, out) {
  const handled = handlePendingInner(a, ctx, out);
  if (handled) {
    out.handledPending = true;
    if (a.intents.includes('and_you')) out.text = `${out.text} ${ownAnswer(ctx.pending, ctx)}`;
  }
  return handled;
}

function handlePendingInner(a, ctx, out) {
  const p = ctx.pending;
  const npc = ctx.npc;
  if (!p) return false;
  if (p === 'ask_feeling') {
    if (a.intent === 'sad' || a.intents.includes('sad')) {
      out.text = npc.personality === 'Helpful' ? 'Oh no. Do you want to sit with me at lunch? Things feel better with friends around.' : 'That’s rough. Hang in there, the bell rings soon!';
      out.effects.friend = 2;
      return true;
    }
    if (a.intents.includes('happy') || a.intent === 'yes') {
      out.text = pick(['Nice! Good days are the best.', 'Great! Let’s keep it that way.', 'Same here!'], ctx.turn);
      out.effects.friend = 1;
      return true;
    }
  }
  if (p === 'ask_fav_subject' && a.subjects.length) {
    const s = a.subjects[0];
    out.effects.fact = { favSubject: s };
    out.effects.memory = `you told me you love ${subjectLabel(s)}`;
    out.effects.friend = 2;
    out.text = npc.strengths?.includes(s) ? `${subjectLabel(s)}? Me too! We should study together before exams.` : npc.weak?.includes(s) ? `${subjectLabel(s)}?! You’re brave. I find it so hard.` : `${subjectLabel(s)}, nice choice! I’ll remember that.`;
    return true;
  }
  if (p === 'ask_hobby' && a.intent !== 'bye' && a.intent !== 'no') {
    const hobby = a.sport || (a.norm.match(/(?:i like|i love|i enjoy|mujhe) ([\p{L} ]{3,30})/u)?.[1]?.trim());
    if (hobby) {
      out.effects.fact = { hobby };
      out.effects.memory = `you told me you like ${hobby}`;
      out.effects.friend = 2;
      out.text = hobby === npc.sport || npc.interest.includes(hobby) ? `No way, I love ${hobby} too!` : `${hobby[0].toUpperCase()}${hobby.slice(1)}? That’s cool. You should show me sometime.`;
      return true;
    }
  }
  if (p === 'ask_lesson') {
    const l = ctx.openerLesson;
    if (a.intents.includes('sad') || a.intent === 'help_me' || /\b(no|nahi|confus|hard|tough|lost)/.test(a.norm)) {
      if (l && npc.strengths.includes(l.id)) {
        out.text = `Okay, the trick is: ${l.teachFirst} Makes sense now?`;
        out.effects.friend = 3;
      } else out.text = `Same, honestly. Let's ask ${l?.teacherName || 'the teacher'} together after class.`;
      return true;
    }
    if (/\b(okay|ok|fine|alright|theek|not bad|so so)\b/.test(a.norm) && !/\b(great|loved|awesome|easy|amazing)\b/.test(a.norm)) {
      out.text = fresh(ctx.convo, ['Fair enough. Not the most exciting one, right?', 'Okay is good! Better than me sleeping through half of it.', 'Haha, “okay”. That’s a very diplomatic answer.'], ctx.turn || 0);
      return true;
    }
    if (a.intents.includes('happy') || a.intent === 'yes') {
      out.text = `Lucky! ${l && npc.weak.includes(l.id) ? 'Can you explain it to me later?' : 'It was a good one.'}`;
      if (l && npc.weak.includes(l.id) && l.practised) {
        out.pending = 'wants_help';
        out.helpTopic = { name: l.topicName, line: l.teachFirst };
      }
      out.effects.friend = 1;
      return true;
    }
  }
  if (p === 'invite_fest') {
    if (a.intent === 'yes' || a.intents.includes('yes')) {
      out.text = `Yay! Let's meet at the Auditorium. It's going to be amazing.`;
      out.effects.friend = 3;
      out.effects.memory = `we went to ${ctx.festName || 'the fest'} together`;
      return true;
    }
    if (a.intent === 'no') {
      out.text = 'Aww. Come for at least an hour, okay?';
      return true;
    }
  }
  if (p === 'ask_bitsat') {
    const n = Number(a.norm.match(/\b(\d{2,3})\b/)?.[1]);
    if (n && n <= 390) {
      out.effects.fact = { bitsat: n };
      out.effects.memory = `you told me your BITSAT score was ${n}`;
      out.effects.friend = 2;
      out.text = n > npc.bitsat + 10 ? `${n}?! That’s amazing, Mirnal. Respect.` : n < npc.bitsat - 10 ? `${n}, nice! Doesn’t matter now anyway, we’re both here.` : `${n}! We’re basically the same. BITSAT twins.`;
      return true;
    }
    if (/\b(no|nahi|secret|dont|won|rather not|not telling)\b/.test(a.norm)) {
      out.text = 'Haha, fair. It doesn’t matter once you’re in.';
      return true;
    }
  }
  if (p === 'ask_hometown' && a.intent !== 'bye' && a.intent !== 'no') {
    const town = a.norm.match(/\b(?:from|in|is|hoon|hu|se)\s+([\p{L}]{3,20})/u)?.[1] || (a.norm.trim().split(' ').length <= 2 ? a.norm.trim() : null);
    if (town) {
      const t = town[0].toUpperCase() + town.slice(1);
      out.effects.fact = { hometown: t };
      out.effects.memory = `you told me you’re from ${t}`;
      out.effects.friend = 2;
      out.text = t.toLowerCase() === (npc.hometown || '').toLowerCase() ? `No way, ${t}?! Same city!` : `${t}! I’ve always wanted to visit. Is the food good there?`;
      return true;
    }
  }
  if (p === 'invite_play') {
    if (a.intent === 'yes' || a.intents.includes('yes')) {
      out.text = `Yes! Meet me at the playground in the ${ctx.nextBreak || 'next break'}.`;
      out.effects.friend = 3;
      out.effects.memory = `we planned to play ${npc.sport} together`;
      return true;
    }
    if (a.intent === 'no') {
      out.text = 'Okay, no problem. Maybe another day.';
      return true;
    }
  }
  if (p === 'offer_explain' && (a.intent === 'yes' || a.intents.includes('yes'))) {
    out.text = ctx.explainText ? `Okay, so: ${ctx.explainText}` : 'Okay! Ask the teacher too, they explain it really well.';
    out.effects.friend = 2;
    return true;
  }
  if (p === 'wants_help' && (a.intent === 'yes' || a.intent === 'offer_help' || a.intents.includes('yes'))) {
    out.text = `Really? Thank you, Mirnal! Now I get it: “${ctx.helpTopicLine}”`;
    out.effects.friend = 8;
    out.effects.rep = 2;
    out.effects.memory = `you helped me understand ${ctx.helpTopicName}`;
    out.effects.action = 'helped';
    return true;
  }
  return false;
}

function classmateReply(a, ctx, out, seed) {
  const npc = ctx.npc;
  const op = pick(OPENERS[npc.personality] || ['Oh,'], seed);
  const cold = ctx.friendLevel < 8;
  const sm = (s) => (young(ctx) ? s.replace(/Honestly, /g, '') : s);
  if (handlePending(a, ctx, out)) return;
  const lessonsToday = ctx.lessons || [];
  switch (a.intent) {
    case 'greet': {
      if (ctx.turn === 0 && !cold) {
        const last = (ctx.lessons || []).at(-1);
        if (ctx.slot?.type === 'fest' || (ctx.festName && ctx.slot?.type === 'break' && seed % 2)) {
          out.text = `Mirnal! Are you coming for ${ctx.festName} tonight?`;
          out.pending = 'invite_fest';
          return;
        }
        if (last && seed % 3 !== 0) {
          out.text = `Hey Mirnal! How did you find the ${last.name} ${ctx.college ? 'lecture' : 'class'}?`;
          out.pending = 'ask_lesson';
          out.openerLesson = last;
          return;
        }
        if (ctx.slot?.type === 'lunch') {
          out.text = ctx.college ? 'Mirnal! Mess or ANC? I’m starving.' : 'Hey! Lunch time, finally. What did you bring?';
          return;
        }
      }
      const recall = (ctx.memories || []).filter((m) => !m.text.startsWith('you were rude') && !m.text.startsWith('you made fun')).at(-1);
      out.text = cold
        ? `Oh. Hi.`
        : `${/^\W*(?:oh,?\s*)?(hi|hey|hello|psst|mirnal)/i.test(npc.style.greet) ? '' : `Good ${partOfDay(ctx)}, Mirnal! `}${recall && ctx.turn === 0 && seed % 2 ? `Remember when ${recall.text}? ` : ''}${npc.style.greet}`;
      out.effects.friend = 1;
      return;
    }
    case 'how_are_you':
      out.text = `${a.alsoGreeting ? 'Hey! ' : ''}${npc.style.mood} ${ctx.slot?.type === 'lesson' ? 'Trying to focus in class.' : ctx.slot?.type === 'arrival' ? 'Still waking up, honestly.' : ''} How about you?`.replace(/\s+/g, ' ');
      out.pending = 'ask_feeling';
      out.effects.friend = 1;
      return;
    case 'name':
      out.text = `${op} I’m ${npc.name}! ${npc.joins < ctx.classNum ? `We’ve been in the same class since Class ${npc.joins}, remember?` : 'I’m new here. Nice to meet you!'}`;
      return;
    case 'hobby':
      out.text = sm(`${op} I love ${npc.interest}. ${npc.personality === 'Introverted' ? 'It’s… calming.' : 'I could do it all day!'} What about you, what do you like doing?`);
      out.pending = 'ask_hobby';
      out.effects.friend = 2;
      out.effects.memory = `we talked about ${npc.interest}`;
      return;
    case 'fav_subject': {
      const mine = npc.strengths.map(subjectLabel)[0];
      out.text = `${op} ${mine}, for sure. ${npc.weak?.length ? `But ${subjectLabel(npc.weak[0])}… don’t ask.` : ''} Which one’s yours?`;
      out.pending = 'ask_fav_subject';
      return;
    }
    case 'play': {
      const sport = a.sport || npc.sport;
      const keen = sport === npc.sport || ['Sport enthusiast', 'Competitive', 'Funny', 'Mischievous'].includes(npc.personality);
      if (keen) {
        out.text = `${sport === npc.sport ? `${sport[0].toUpperCase()}${sport.slice(1)}? Yes!!` : `${sport}? Sure, why not!`} Meet me at the playground in the ${ctx.nextBreak || 'next break'}.`;
        out.effects.friend = 3;
        out.effects.memory = `we planned to play ${sport} together`;
      } else {
        out.text = `${sport}? I’m not very good at it… but I’ll come watch you. Or we could play ${npc.sport} instead?`;
        out.pending = 'invite_play';
      }
      return;
    }
    case 'offer_help':
    case 'help_me': {
      const subj = a.subjects.map((s) => lessonsToday.find((l) => l.id === s)).find(Boolean) || (a.subjects.length ? null : lessonsToday[lessonsToday.length - 1]);
      if (a.intent === 'offer_help' || (subj && npc.weak.includes(subj.id) && subj.practised)) {
        const s = subj && npc.weak.includes(subj.id) ? subj : lessonsToday.find((l) => npc.weak.includes(l.id) && l.practised);
        if (s) {
          out.text = `${op} Honestly, I didn’t get “${s.topicName}” at all. Can you explain it to me?`;
          out.pending = 'wants_help';
          out.helpTopic = { name: s.topicName, line: s.teachFirst };
        } else out.text = `That’s nice of you! I’m okay for now. I’ll ask you if I get stuck.`;
        return;
      }
      if (!subj) {
        const named = a.subjects[0];
        out.text = named ? `We haven’t had ${subjectLabel(named)} today. Ask me after that class!` : `${op} Which subject? Tell me the name and I’ll try.`;
        return;
      }
      if (npc.strengths.includes(subj.id)) {
        out.text = `${op} ${subj.name} is my thing! Here’s the trick: ${subj.teachFirst}`;
        out.effects.friend = 2;
      } else {
        out.text = `Honestly, I’m confused about ${subj.name} too. Let’s ask ${subj.teacherName} after class. ${npc.personality === 'Helpful' ? 'I’ll come with you.' : ''}`;
      }
      return;
    }
    case 'share_like': {
      const thing = a.sport || (a.subjects[0] && subjectLabel(a.subjects[0])) || a.norm.match(/(?:like|love|enjoy|into|favourite|favorite) ([\p{L} ]{3,30})/u)?.[1]?.trim();
      if (!thing) { out.text = 'Oh yeah? Tell me more!'; return; }
      out.effects.fact = a.subjects[0] ? { favSubject: a.subjects[0] } : { hobby: thing };
      out.effects.memory = `you told me you like ${thing}`;
      out.effects.friend = 2;
      const same = thing.toLowerCase() === npc.sport || npc.interest.includes(thing.toLowerCase()) || (a.subjects[0] && npc.strengths.includes(a.subjects[0]));
      out.text = same ? `No way, ${thing}? Me too! We have to do that together sometime.` : `Oh nice, ${thing}! ${fresh(ctx.convo, ['How did you get into it?', 'Since when?', 'I didn’t know that about you.'], seed)}`;
      return;
    }
    case 'and_you':
      out.text = ownAnswer(ctx.convo?.lastTopic, ctx);
      return;
    case 'homework':
      if (ctx.college) {
        out.text = fresh(ctx.convo, ['The tut sheet is due tomorrow. Want to do it together in the library?', 'I still have a lab report to write. Pray for me.', 'Assignment? Already done. Kidding. Not even started.'], seed);
        return;
      }
      out.text = pick([
        `${op} The project is due today. Did you finish yours in the library?`,
        'Homework? Don’t remind me. I’ll do it on the bus.',
        `I finished mine last night! ${npc.personality === 'Mischievous' ? 'Just kidding. Haven’t even started.' : ''}`,
      ], seed);
      return;
    case 'exam':
      if (ctx.college) {
        out.text = npc.personality === 'Competitive' ? 'Midsems went fine. Compre is where I’m going to top the section.' : npc.personality === 'Funny' ? 'Compre? I plan to study the night before, like a true BITSian.' : 'Midsems were okay. I’m a bit scared of Compre, honestly. Are you?';
        out.pending = 'ask_feeling';
        return;
      }
      out.text = npc.personality === 'Competitive'
        ? 'Exams are after school today. I’m going to beat my last score, watch me.'
        : npc.personality === 'Helpful' ? 'Exams are after school. Revise the topics you found tricky. You’ll do great!'
          : npc.personality === 'Funny' ? 'Exams? My brain has left the chat. 😅 They’re after school today.'
            : 'The exams are after school. I’m a little nervous… are you?';
      out.pending = 'ask_feeling';
      return;
    case 'food':
      if (ctx.college) {
        out.text = fresh(ctx.convo, ['ANC’s Maggi at midnight is basically a BITS tradition.', 'Mess food today was… okay. Want to go to ANC later?', 'I could eat a whole plate of samosas from C’not right now.'], seed);
        out.effects.friend = 1;
        return;
      }
      out.text = `${a.food && a.food !== 'food' && a.food !== 'lunch' ? `${a.food[0].toUpperCase()}${a.food.slice(1)}? ` : ''}${pick(['Shankar Uncle’s samosas are the best. Lunch is my favourite period!', 'I brought aloo paratha from home. Want half?', 'I’m starving. When is lunch again?'], seed)}${ctx.lunchTime ? ` Lunch is at ${ctx.lunchTime}.` : ''}`;
      out.effects.friend = 1;
      return;
    case 'schedule':
      out.text = scheduleLine(ctx);
      return;
    case 'where':
      out.text = a.place ? PLACES[a.place].where : 'Where to? The library, canteen, lab, playground…?';
      return;
    case 'joke':
      out.text = `${npc.personality === 'Funny' ? 'Oh, I have a hundred. ' : ''}${pick(JOKES, seed)}`;
      out.effects.friend = 1;
      return;
    case 'sad':
      out.text = npc.personality === 'Helpful' || npc.personality === 'Introverted'
        ? 'Hey… I’m sorry you feel that way. Want to sit together at break? You don’t have to talk.'
        : npc.personality === 'Funny' ? `Okay, emergency joke: ${pick(JOKES, seed)} Better?` : 'Arre, cheer up! Games period will fix everything.';
      out.effects.friend = 2;
      return;
    case 'happy':
      out.text = pick(['That’s great!', 'Nice, love the energy!', 'Same here! Today’s a good day.'], seed);
      return;
    case 'compliment':
      out.text = npc.personality === 'Introverted' ? '…thank you. That’s really nice of you to say.' : npc.personality === 'Competitive' ? 'I know. 😎 Just kidding, thanks! You’re not bad yourself.' : 'Aww, thanks Mirnal! You’re a good friend.';
      out.effects.friend = 3;
      return;
    case 'insult':
      out.text = young(ctx) ? 'That’s mean! I’m telling Ma’am.' : npc.personality === 'Competitive' ? 'Wow. Real mature, Mirnal.' : 'That… really hurt. Why would you say that?';
      out.effects.friend = -10;
      out.effects.rep = -3;
      out.effects.memory = 'you were rude to me';
      return;
    case 'apology': {
      const wronged = (ctx.memories || []).some((m) => m.text.startsWith('you were rude') || m.text.startsWith('you made fun'));
      out.text = wronged ? 'Okay… I forgive you. Just don’t do it again.' : 'Sorry? For what? 😄';
      if (wronged) { out.effects.friend = 4; out.effects.memory = 'you said sorry to me'; }
      return;
    }
    case 'thanks':
      out.text = pick(['Anytime!', 'No problem!', 'That’s what friends are for.'], seed);
      return;
    case 'future': {
      if (ctx.college) { out.text = `${npc.futureGroup === 'commerce' ? 'Probably finance. I want to do a minor in it.' : 'Get a good PS, learn a lot, then see where it goes.'} What about you, Mirnal?`; return; }
      const opts = FUTURE[npc.futureGroup] || FUTURE.null;
      out.text = young(ctx) ? `When I grow up I want to be ${pick(['an astronaut', 'a cricket star', 'a teacher', 'a scientist'], seed)}! What about you?` : `I think I want to be ${pick(opts, seed)}. What about you?`;
      return;
    }
    case 'stream':
      if (ctx.college) {
        if (/\b(my|mera|meri)\b/.test(a.norm)) { out.text = 'You’re Chemical Engineering, Mirnal! Forgot already? 😄 Branch courses start in second year.'; return; }
        out.text = `${npc.discipline}! ${npc.discipline === 'Chemical Engineering' ? 'Same as you, Chemical gang!' : 'And you’re Chemical, right?'} First year is the same for everyone though, branch courses start in second year.`;
        return;
      }
      if (ctx.classNum < 9) out.text = 'Streams? That’s for Class 11! We have ages to decide.';
      else if (!npc.futureGroup) out.text = 'I won’t be here for Class 11… my family is moving. But I’d pick whatever lets me debate!';
      else out.text = `I’m leaning towards ${npc.futureGroup === 'science' ? 'Science' : npc.futureGroup === 'commerce' ? 'Commerce' : 'Humanities'}. ${ctx.playerStream ? `You took ${ctx.playerStream}, right?` : 'What are you thinking?'}`;
      return;
    case 'bitsat': {
      if (!ctx.college) { out.text = 'BITSAT? That’s an exam for after Class 12. Ask me in a few years!'; return; }
      if (/\b(my|mera|meri)\b/.test(a.norm) && !/\byour\b/.test(a.norm)) {
        const mine = ctx.playerFacts?.bitsat;
        out.text = mine ? `You told me ${mine}! Did you forget your own score?` : 'You never told me your score! What was it?';
        if (!mine) out.pending = 'ask_bitsat';
        return;
      }
      const react = npc.personality === 'Competitive' ? 'Not bad, but I wanted 330.' : npc.personality === 'Funny' ? 'Enough to get in, which is all that matters.' : npc.personality === 'Introverted' ? 'It was… enough, I guess.' : 'I was so nervous that day.';
      out.text = `I got ${npc.bitsat} out of 390. ${react} What about you?`;
      out.pending = 'ask_bitsat';
      return;
    }
    case 'hometown':
      if (!ctx.college) { out.text = 'From here, silly! We live in the same city.'; return; }
      out.text = `${npc.hometown}! ${pick(['Pilani feels so quiet after that.', 'I miss the food from home already.', 'Mom calls every evening to ask if I ate.'], seed)} Where are you from?`;
      out.pending = 'ask_hometown';
      return;
    case 'hostel':
      out.text = ctx.college ? fresh(ctx.convo, ['My wing is chaotic. Someone plays guitar at 2 a.m. every night.', 'Hostel life is the best part. Midnight Maggi, wing chats, no curfew for doubts.', 'My roommate sleeps through every alarm. Every single one.'], seed) : 'Hostel? We go home after school, silly.';
      return;
    case 'clubs':
      out.text = ctx.college ? `I’m trying out for something to do with ${npc.interest}. ${npc.personality === 'Funny' || npc.personality === 'Sport enthusiast' ? 'Come with me to the auditions!' : 'What about you?'}` : `I want to join a club for ${npc.interest}!`;
      return;
    case 'cgpa':
      out.text = ctx.college ? `${ctx.cgpa ? `You have a ${ctx.cgpa}, right? That’s solid.` : 'No grades yet, Compre is still coming.'} ${npc.personality === 'Competitive' ? 'I’m aiming for a 9-pointer.' : 'Honestly, I just want to understand stuff.'}` : 'Marks? Let’s not talk about marks.';
      return;
    case 'ps':
      out.text = ctx.college ? `${npc.futureGroup === 'commerce' ? 'I really want to do a minor in finance. ' : ''}Seniors say Practice School is where it all gets real. PS-1 comes after second year.` : 'Internships? We’re in school!';
      return;
    case 'weather':
      out.text = pick(['It’s sooo hot today. Thank god for the classroom fans.', 'I hope it rains during games period. Football in the rain is the best!', 'Perfect weather for cricket, honestly.'], seed);
      return;
    case 'what_doing':
      out.text = ctx.slot?.type === 'lesson' ? 'Shh, I’m trying to listen to the teacher!' : ctx.slot?.type === 'break' || ctx.slot?.type === 'lunch' ? 'Just hanging out. Want to join?' : 'Waiting for the bell, as usual.';
      return;
    case 'class_info':
      if (ctx.college) { out.text = `We’re first-years at BITS! ${npc.discipline ? `I’m in ${npc.discipline}, you’re Chemical.` : ''}`; return; }
      out.text = `We’re in Class ${ctx.classNum}! ${young(ctx) ? 'I’m almost a big kid now.' : 'Time flies, right?'}`;
      return;
    case 'friends':
    case 'person': {
      const other = a.person;
      if (other && other.toLowerCase() !== npc.name.toLowerCase()) {
        const o = (ctx.othersInfo || {})[other.toLowerCase()];
        out.text = o
          ? (o.sport === npc.sport ? `${o.name}? We play ${npc.sport} together all the time!` : `${o.name}? ${o.name} loves ${o.interest}. ${o.personality === 'Funny' ? 'Always making everyone laugh.' : o.personality === 'Competitive' ? 'Super competitive, though.' : 'Really nice.'}`)
          : `${other}? Oh, you mean the teacher? ${pick(['They’re strict but fair.', 'I like their classes.', 'They explain things well.'], seed)}`;
      } else out.text = 'You, obviously! And everyone in our class, mostly.';
      return;
    }
    case 'book':
      out.text = npc.interest.includes('reading') ? 'I just finished a great book! Mrs. Bhat in the library always has good recommendations.' : 'The library has comics too, you know. I go there sometimes.';
      return;
    case 'yes':
      out.text = pick(['Okay!', 'Cool.', 'Great!'], seed);
      return;
    case 'no':
      out.text = pick(['Okay, no worries.', 'Fine, fine.', 'Hmm, okay.'], seed);
      return;
    case 'why': {
      const t = ctx.convo?.lastTopic;
      const reasons = {
        fav_subject: `Because it just clicks for me. ${subjectLabel(npc.strengths[0])} feels like solving puzzles.`,
        hobby: `It helps me switch off. After a long day, ${npc.interest} is the best reset.`,
        play: 'Because sitting in class all day makes me restless!',
        future: 'I like the idea of building something real, not just studying it.',
        insult: 'Because what you said was hurtful, Mirnal.',
        exam: 'Because it’s a lot of material in very little time!',
        food: 'Because I skipped breakfast. Classic mistake.',
        share_like: 'No reason! Just curious. You never told me that before.',
        how_are_you: 'Just one of those days, you know?',
        stream: 'It felt like the best fit for what I enjoy.',
      };
      out.text = reasons[t] || 'Why? Hmm… good question. I just feel that way, I guess!';
      return;
    }
    case 'bye':
      out.text = pick([`Bye, Mirnal! See you ${ctx.slot?.type === 'departure' ? 'tomorrow' : 'in class'}.`, 'Okay, see you later!', 'Bye! Don’t be late for the next period.'], seed);
      out.end = true;
      return;
    default:
      out.text = `${npc.personality === 'Introverted' ? 'Um… ' : 'Hmm, '}sorry, I didn’t quite get that. ${ctx.college ? 'Ask me about my branch, BITSAT, hostel, lectures, ANC, or where I’m from.' : pick(['You can ask me about lessons, games, food or the timetable.', 'Say it another way?'], seed)}`;
  }
}

function teacherReply(a, ctx, out, seed) {
  const t = ctx.npc;
  const subjects = ctx.teacherSubjects || [];
  const name = t.honorific === 'Sir' ? 'Sir' : 'Ma’am';
  const findTopic = () => {
    for (const s of subjects) {
      for (const top of s.topics) {
        const words = top.name.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
        if (words.some((w) => a.norm.includes(` ${w}`))) return { s, top };
      }
    }
    const s = subjects.find((x) => a.subjects.includes(x.id)) || subjects[0];
    if (!s) return null;
    return { s, top: s.topics.find((x) => !x.practised) || s.topics[0] };
  };
  switch (a.intent) {
    case 'greet':
      out.text = `Good ${partOfDay(ctx)}, Mirnal. ${young(ctx) ? 'Did you have your breakfast?' : 'Ready for today’s class?'}`;
      out.effects.rep = 1;
      return;
    case 'how_are_you':
      out.text = `I’m well, thank you for asking, Mirnal. ${pick(['A full day of classes ahead!', 'Your class keeps me on my toes.', 'Just checking some notebooks.'], seed)}`;
      out.effects.rep = 1;
      return;
    case 'help_me':
    case 'fav_subject': {
      const f = findTopic();
      if (!f) { out.text = 'Which topic are you stuck on? Tell me its name.'; return; }
      out.text = `Of course. In ${f.s.name}, “${f.top.name}”: ${f.top.teach} Does that make sense?`;
      out.pending = 'check_understood';
      out.effects.rep = 1;
      return;
    }
    case 'homework':
      out.text = ctx.projectName ? `Your project this year is “${ctx.projectName}”. Work on it at the project table in the library.` : 'Revise today’s topics at home, that’s your homework.';
      return;
    case 'exam':
      out.text = `The annual exams are after school today. Revise every topic you found difficult. ${ctx.weakTopic ? `I’d look at “${ctx.weakTopic}” again.` : 'You’ve practised well so far.'}`;
      return;
    case 'future':
    case 'stream':
      out.text = ctx.classNum >= 9 ? 'Choose what you are curious about, and build strong basics. Talk to Ms. Farah Ali, our counsellor, before Class 11.' : 'You have plenty of time for that. For now, enjoy learning everything!';
      return;
    case 'schedule':
      out.text = scheduleLine(ctx);
      return;
    case 'where':
      out.text = a.place ? PLACES[a.place].where : 'Where do you need to go?';
      return;
    case 'thanks':
      out.text = 'You’re welcome. Keep asking questions, that’s how you learn.';
      out.effects.rep = 1;
      return;
    case 'yes':
      out.text = ctx.pending === 'check_understood' ? 'Very good! Try the practice question in class to check yourself.' : 'Good.';
      return;
    case 'no':
      out.text = ctx.pending === 'check_understood' ? 'That’s alright. Raise your hand in class and I’ll go through it with an example.' : 'Alright.';
      return;
    case 'insult':
      out.text = 'Mirnal! That is not how we speak in this school. I’m disappointed.';
      out.effects.rep = -5;
      return;
    case 'apology':
      out.text = 'Apology accepted. Let’s move on.';
      out.effects.rep = 1;
      return;
    case 'compliment':
      out.text = 'Thank you, Mirnal. That’s kind of you.';
      out.effects.rep = 1;
      return;
    case 'joke':
      out.text = `A joke? Alright: ${pick(JOKES, seed)} Now, back to work!`;
      return;
    case 'sad':
      out.text = 'I’m sorry to hear that. If something is worrying you, you can always talk to me or the counsellor.';
      return;
    case 'bye':
      out.text = 'See you in class, Mirnal.';
      out.end = true;
      return;
    default:
      out.text = `I’m not sure I understood, Mirnal. You can ask me to explain a topic, about homework, or about the exams.`;
  }
}

function staffReply(a, ctx, out, seed) {
  const role = ctx.staffRole;
  const who = ctx.npc.name;
  if (a.intent === 'greet' || a.intent === 'how_are_you') {
    out.text = role === 'guard' ? `Good ${partOfDay(ctx)}, beta! ${ctx.classNum <= 3 ? 'Walk carefully, okay?' : 'You’ve grown so tall!'}`
      : role === 'canteen' ? 'Arre, Mirnal! What will you have today? Samosa is fresh.'
        : role === 'librarian' ? 'Shh… welcome to the library. Looking for a book?'
          : role === 'principal' ? `Good ${partOfDay(ctx)}, Mirnal. I hope Class ${ctx.classNum} is treating you well.`
            : `Hello, Mirnal!`;
    return;
  }
  if (a.intent === 'bye' || a.intent === 'thanks') {
    out.text = role === 'canteen' ? 'Come again, beta!' : 'Take care, Mirnal.';
    out.end = a.intent === 'bye';
    return;
  }
  if (a.intent === 'where') { out.text = a.place ? PLACES[a.place].where : 'Where do you want to go?'; return; }
  if (a.intent === 'schedule') { out.text = scheduleLine(ctx); return; }
  if (role === 'canteen' && (a.intent === 'food' || a.food || /\b(buy|order|give|menu|one|ek)\b/.test(a.norm))) {
    out.text = 'Here’s the menu. Tell me what you want!';
    out.effects.action = 'open_canteen';
    return;
  }
  if (role === 'librarian' && (a.intent === 'book' || /\b(borrow|read)\b/.test(a.norm))) {
    out.text = 'Here, try this one. Sit at the table and read for a while.';
    out.effects.action = 'read_book';
    return;
  }
  if (role === 'principal' && (a.intent === 'future' || a.intent === 'exam' || a.intent === 'help_me')) {
    out.text = 'Work hard, be kind, and don’t be afraid of mistakes. That is the Sunrise way.';
    return;
  }
  if (role === 'senior') {
    out.text = a.intent === 'stream' || a.intent === 'help_me' || a.intent === 'why' ? ctx.seniorInfo : a.intent === 'exam' ? 'Class 11 exams are tougher than Class 10, but you get used to it. Practicals help your marks a lot.' : `${ctx.seniorInfo} Ask me anything about it!`;
    return;
  }
  if (a.intent === 'insult') {
    out.text = 'Beta, that’s not nice. I’ll pretend I didn’t hear that.';
    out.effects.rep = -3;
    return;
  }
  out.text = `${who.split(' ')[0]} smiles. “I didn’t quite catch that, beta. ${role === 'canteen' ? 'Want something to eat?' : role === 'librarian' ? 'Want a book recommendation?' : 'What do you need?'}”`;
}

export function defaultSuggestions(ctx, intent, seed) {
  if (ctx.kind === 'teacher') return ['Can you explain today’s topic again?', 'When are the exams?', 'Thank you, bye!'];
  if (ctx.staffRole === 'canteen') return ['One samosa, please', 'What’s on the menu?', 'Bye!'];
  if (ctx.staffRole === 'librarian') return ['Can I borrow a book?', 'Where is the Science Lab?', 'Thank you!'];
  if (ctx.staffRole === 'senior') return ['Why did you choose this stream?', 'Are the exams hard?', 'Thanks, bye!'];
  if (ctx.kind === 'staff') return ['Good morning!', 'Where is the library?', 'Bye!'];
  if (ctx.college) {
    const cp = ['What’s your branch?', 'What was your BITSAT score?', 'Where are you from?', 'How’s hostel life?', 'Going to Oasis?', 'Which clubs are you joining?', 'Want to go to ANC?'];
    return [cp[seed % cp.length], cp[(seed + 3) % cp.length], 'Bye!'];
  }
  const pool = ['How are you?', 'What’s your favourite subject?', `Want to play ${ctx.npc.sport} at break?`, 'Tell me a joke', 'What’s the next period?', 'Did you understand today’s lesson?', 'What do you want to be when you grow up?', 'Where is the canteen?'];
  const out = [];
  for (let i = 0; out.length < 3 && i < pool.length; i++) {
    const s = pool[(seed + i * 3) % pool.length];
    if (!out.includes(s)) out.push(s);
  }
  if (intent !== 'bye') out[2] = 'Bye!';
  return out;
}
