// Stream presets and the subject-combination rules of the fictional school.
// Rules follow the general CBSE senior-secondary scheme (one language + four electives, optional
// additional subject). Verify against https://cbseacademic.nic.in/curriculum_2027.html before relying on them.

export const SCHOOL = {
  name: 'Sunrise Public School',
  board: 'CBSE (fictional affiliated school)',
  city: 'an Indian city',
};

export const COMBINATION_RULES = {
  compulsoryLanguage: 'eng',
  electivesRequired: 4,
  maxAdditional: 1,
  maxSkillAmongElectives: 1,
  mutuallyExclusive: [
    { ids: ['math', 'amath'], reason: 'Mathematics and Applied Mathematics cannot be taken together.' },
    { ids: ['cs', 'ip'], reason: 'Computer Science and Informatics Practices cannot be taken together.' },
  ],
  // School-specific limits (configurable): this school's timetable can't fit these pairs.
  schoolClashes: [
    { ids: ['bio', 'acc'], reason: 'Sunrise Public School cannot timetable Biology with Accountancy.' },
    { ids: ['pe', 'psy'], reason: 'Sunrise Public School runs Physical Education and Psychology in the same block.' },
  ],
  notOffered: [],
};

export const STREAMS = [
  {
    id: 'pcm', name: 'Science – PCM', group: 'science', color: '#4f8cff',
    core: ['phy', 'chem', 'math'],
    suggested: ['cs', 'ip', 'pe', 'eco', 'ai'],
    blurb: 'Physics, Chemistry and Mathematics, for engineering, technology and quantitative careers.',
    experiences: ['Physics lab', 'Chemistry practicals', 'Mathematical problem-solving', 'Programming projects'],
    senior: { id: 'snr_pcm', name: 'Ishaan (Class 12, PCM)', line: 'Maths every single day. If you like puzzles that fight back, PCM is fun. The lab practicals in Physics are my favourite part.' },
  },
  {
    id: 'pcb', name: 'Science – PCB', group: 'science', color: '#32b67a',
    core: ['phy', 'chem', 'bio'],
    suggested: ['psy', 'pe', 'eng', 'ip'],
    blurb: 'Physics, Chemistry and Biology, for medicine, life sciences and research.',
    experiences: ['Biology lab and microscopy', 'Human physiology', 'Chemistry experiments', 'Research projects'],
    senior: { id: 'snr_pcb', name: 'Ananya (Class 12, PCB)', line: 'Biology has a lot to remember, but the microscope work is magic. Diagrams matter a lot in our exams.' },
  },
  {
    id: 'pcmb', name: 'Science – PCMB', group: 'science', color: '#8a6bff',
    core: ['phy', 'chem', 'math', 'bio'],
    suggested: ['pe', 'cs'],
    blurb: 'All four sciences. The most demanding timetable, with the widest set of options afterwards.',
    experiences: ['Both Maths and Biology', 'Three labs', 'Heavy practical schedule'],
    senior: { id: 'snr_pcmb', name: 'Varun (Class 12, PCMB)', line: 'It is a lot of work. Only pick it if you genuinely enjoy both Maths and Biology, not to keep options open.' },
  },
  {
    id: 'com_math', name: 'Commerce with Mathematics', group: 'commerce', color: '#f2a93b',
    core: ['acc', 'bst', 'eco'],
    suggested: ['math', 'amath', 'ent', 'ip', 'fmm'],
    blurb: 'Accountancy, Business Studies and Economics, with Mathematics or Applied Mathematics.',
    experiences: ['Recording transactions', 'Balance sheets', 'Simulated business', 'Market analysis'],
    senior: { id: 'snr_com', name: 'Riya (Class 12, Commerce)', line: 'Accountancy is like a puzzle that must balance. Applied Maths really helps with Economics graphs.' },
  },
  {
    id: 'com', name: 'Commerce without Mathematics', group: 'commerce', color: '#e8833a',
    core: ['acc', 'bst', 'eco'],
    suggested: ['ent', 'ip', 'pe', 'fmm', 'psy'],
    blurb: 'Accountancy, Business Studies and Economics with a non-maths elective.',
    experiences: ['Bookkeeping', 'Financial statements', 'Business strategy', 'Entrepreneurship'],
    senior: { id: 'snr_com', name: 'Riya (Class 12, Commerce)', line: 'You can do Commerce without Maths. Entrepreneurship as the fourth subject was a great choice for me.' },
  },
  {
    id: 'hum', name: 'Humanities / Arts', group: 'humanities', color: '#e05a7a',
    core: ['hist', 'pol'],
    suggested: ['geo', 'psy', 'soc', 'eco', 'pe'],
    blurb: 'History, Political Science and a choice of Geography, Psychology, Sociology or Economics.',
    experiences: ['Historical research', 'Debates', 'Mapping exercises', 'Psychology case studies'],
    senior: { id: 'snr_hum', name: 'Aditi (Class 12, Humanities)', line: 'People think Humanities is easy. It is not, it is a lot of reading and writing. But the debates are the best classes in school.' },
  },
  {
    id: 'voc', name: 'Vocational / Skill electives', group: 'skill', color: '#20b3c4',
    core: [],
    suggested: ['ai', 'eco', 'ent', 'ip', 'bst', 'math'],
    blurb: 'Skill subjects such as AI, Data Science or Financial Markets, taken alongside academic electives. Not a separate stream on its own.',
    experiences: ['Hands-on projects', 'Industry-style practicals', 'Portfolio work'],
    senior: { id: 'snr_voc', name: 'Neel (Class 12, PCM + AI)', line: 'I took AI as a skill subject with PCM. Half the marks are practical, so you actually build things.' },
  },
];

export const COUNSELLOR = {
  id: 'counsellor', name: 'Ms. Farah Ali', role: 'Academic Counsellor',
  lines: [
    'Congratulations on finishing Class 10! Choosing subjects is a big decision, but it is not a life sentence.',
    'Pick subjects you are curious about and can work hard at. Your marks are one signal, your interest is another.',
    'Talk to the seniors around school, visit the labs, then come back to me when you are ready to choose.',
  ],
};
