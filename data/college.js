// College Journey: BITS Pilani, B.E. Chemical Engineering (+ Minor in Finance), 2022–2026.
// First-year courses follow BITS Pilani's published first-year course list
// (https://www.bits-pilani.ac.in/accordion/1st-year-courses). Professors, batchmates and story events
// are fictional; lesson content is simplified for gameplay. Course placement between semesters can
// vary by campus/section, and grading here is a simplified absolute scale (BITS uses relative grading).

const T = (id, name, teach, practice, exam) => ({ id, name, teach, practice, exam });
const Q = (q, options, answer) => ({ q, options, answer });

export const PROFESSORS = {
  'Prof. R. Natarajan': { honorific: 'Sir', style: 'draws every derivation from scratch' },
  'Prof. Meghna Rao': { honorific: "Ma'am", style: 'asks a question to the class every five minutes' },
  'Dr. Sameer Joshi': { honorific: 'Sir', style: 'loves colourful lab demonstrations' },
  'Prof. Kavya Menon': { honorific: "Ma'am", style: 'connects biology to everyday life' },
  'Dr. Arvind Sethi': { honorific: 'Sir', style: 'a perfectionist about line weights' },
  'Dr. Imran Qadri': { honorific: 'Sir', style: 'explains everything with engines and pressure cookers' },
  'Prof. Neha Bhardwaj': { honorific: "Ma'am", style: 'live-codes in every lecture' },
  'Prof. Lata Deshpande': { honorific: "Ma'am", style: 'brings dice and cards to class' },
};

const course = (id, code, name, units, teacher, topics, extra = {}) => ({ id, code, name, units, teacher: `prof:${teacher}`, topics, ...extra });

export const COLLEGE = {
  13: {
    label: 'Year 1 · Semester 1',
    period: 'First Semester, 2022–23',
    courses: [
      course('math111', 'MATH F111', 'Mathematics 1', 3, 'Prof. Meghna Rao', [
        T('c13-math111-1', 'Convergence of series',
          'A geometric series a + ar + ar² + … converges only when |r| < 1, and its sum is then a/(1 − r). The harmonic series 1 + 1/2 + 1/3 + … diverges.',
          Q('What is the sum of 1 + 1/2 + 1/4 + 1/8 + …?', ['1', '2', '4', 'It diverges'], 1),
          Q('The harmonic series 1 + 1/2 + 1/3 + … …', ['converges to 2', 'diverges', 'converges to 1', 'converges to e'], 1)),
        T('c13-math111-2', 'Partial derivatives',
          'A partial derivative differentiates with respect to one variable while treating the others as constants. For f = x²y, ∂f/∂x = 2xy and ∂f/∂y = x².',
          Q('For f(x, y) = x²y, what is ∂f/∂y?', ['2xy', 'x²', '2x', 'y²'], 1),
          Q('For f(x, y) = 3xy + y², what is ∂f/∂x?', ['3y', '3x + 2y', '3xy', '2y'], 0)),
      ]),
      course('phy111', 'PHY F111', 'Mechanics, Oscillations and Waves', 3, 'Prof. R. Natarajan', [
        T('c13-phy111-1', 'Newton’s laws and momentum',
          'Newton’s second law says the net force equals the rate of change of momentum, F = dp/dt, which is F = ma for constant mass. Momentum is conserved when no net external force acts.',
          Q('A 2 kg body accelerates at 3 m/s². What is the net force?', ['5 N', '6 N', '1.5 N', '9 N'], 1),
          Q('The total momentum of a system is conserved when…', ['the net external force is zero', 'kinetic energy is constant', 'acceleration is constant', 'friction is present'], 0)),
        T('c13-phy111-2', 'Simple harmonic motion',
          'In simple harmonic motion the restoring force is proportional to displacement, F = −kx. For a mass on a spring, ω = √(k/m), so the period is T = 2π√(m/k).',
          Q('If the mass on a spring becomes 4 times larger, the period becomes…', ['4 times', '2 times', 'half', 'unchanged'], 1),
          Q('In SHM, the restoring force is proportional to…', ['velocity', 'displacement', 'time', 'mass only'], 1)),
      ]),
      course('chem111', 'CHEM F111', 'General Chemistry', 3, 'Dr. Sameer Joshi', [
        T('c13-chem111-1', 'Quantum numbers',
          'Electrons are described by four quantum numbers: n (shell), l (subshell), m_l (orientation) and m_s (spin). For a given n, l runs from 0 to n − 1, and l = 0, 1, 2, 3 are the s, p, d, f subshells.',
          Q('For n = 3, the allowed values of l are…', ['0, 1, 2', '1, 2, 3', '0 to 3', 'only 3'], 0),
          Q('The quantum number l = 1 is which subshell?', ['s', 'p', 'd', 'f'], 1)),
        T('c13-chem111-2', 'First-order kinetics',
          'For a first-order reaction the rate is proportional to concentration, and the half-life t½ = 0.693/k does not depend on the starting concentration.',
          Q('A first-order reaction has k = 0.0693 per minute. Its half-life is…', ['1 min', '10 min', '0.693 min', '100 min'], 1),
          Q('The half-life of a first-order reaction…', ['doubles when concentration doubles', 'is independent of initial concentration', 'is always one hour', 'halves every hour'], 1)),
      ]),
      course('bio111', 'BIO F111', 'General Biology', 3, 'Prof. Kavya Menon', [
        T('c13-bio111-1', 'DNA and the central dogma',
          'DNA is a double helix in which adenine pairs with thymine and guanine pairs with cytosine. Genes are transcribed into RNA and translated into proteins: the central dogma.',
          Q('In DNA, adenine pairs with…', ['guanine', 'cytosine', 'thymine', 'uracil'], 2),
          Q('The flow “DNA → RNA → protein” is called…', ['the central dogma', 'osmosis', 'mitosis', 'natural selection'], 0)),
        T('c13-bio111-2', 'Enzymes',
          'Enzymes are biological catalysts, mostly proteins, that speed up reactions by lowering the activation energy. They are not used up in the reaction.',
          Q('Enzymes speed up reactions by…', ['raising the temperature', 'lowering activation energy', 'adding energy', 'changing the products'], 1),
          Q('After catalysing a reaction, an enzyme is…', ['destroyed', 'unchanged and reusable', 'turned into product', 'always denatured'], 1)),
      ]),
      course('eg110', 'BITS F110', 'Engineering Graphics', 2, 'Dr. Arvind Sethi', [
        T('c13-eg110-1', 'Orthographic projection',
          'Orthographic projection shows an object in separate views: the front view (elevation), the top view (plan) and side views. In first-angle projection, used in India, the top view goes below the front view.',
          Q('In first-angle projection, the top view is placed…', ['above the front view', 'below the front view', 'only on the left', 'nowhere'], 1),
          Q('The front view is also called the…', ['plan', 'elevation', 'section', 'isometric'], 1)),
        T('c13-eg110-2', 'Isometric drawing',
          'An isometric drawing shows three faces at once. Its three axes are 120° apart, so the receding lines are drawn at 30° to the horizontal.',
          Q('In an isometric drawing, the axes are … apart.', ['90°', '120°', '45°', '60°'], 1),
          Q('Receding lines in an isometric view are drawn at … to the horizontal.', ['30°', '45°', '60°', '90°'], 0)),
      ]),
    ],
    labCourses: [
      { id: 'phy110', code: 'PHY F110', name: 'Physics Laboratory 1', units: 1 },
      { id: 'chem110', code: 'CHEM F110', name: 'Chemistry Laboratory', units: 1 },
      { id: 'bio110', code: 'BIO F110', name: 'Biology Laboratory', units: 1 },
    ],
    practicals: [
      { subject: 'phy110', name: 'Measure g with a simple pendulum', steps: ['Set up the pendulum and measure its length L', 'Pull it aside by a small angle (under 10°) and release', 'Time 20 complete oscillations with a stopwatch', 'Find the period T = total time ÷ 20', 'Calculate g = 4π²L / T²'] },
      { subject: 'chem110', name: 'Acid–base titration', steps: ['Rinse the burette with NaOH and fill it', 'Pipette 10 mL of HCl into a conical flask', 'Add two drops of phenolphthalein', 'Titrate until a faint permanent pink appears', 'Record the burette reading and calculate the concentration'] },
      { subject: 'bio110', name: 'Observe onion peel cells', steps: ['Peel a thin transparent layer from an onion scale', 'Place it in a drop of water on a glass slide', 'Add a drop of stain', 'Lower a coverslip gently to avoid air bubbles', 'Observe under low power, then high power'] },
    ],
    project: {
      subject: 'eg110', name: 'Engineering Graphics sheet: orthographic views of a machine block',
      description: 'Draw the front, top and side views of a machine block in first-angle projection, with dimensions, on an A2 sheet.',
      choices: [
        { label: 'Draw all three views carefully with correct placement, line weights and dimensions', quality: 'excellent', result: 'Dr. Sethi holds your sheet up as an example for the section.' },
        { label: 'Get the views right but skip a few dimensions to finish on time', quality: 'good', result: 'Solid sheet. “Dimensions are not optional,” says Dr. Sethi, but the marks are decent.' },
        { label: 'Rush the whole sheet the night before submission', quality: 'basic', result: 'Smudged lines and a 3 a.m. lesson in time management.' },
      ],
    },
  },
  14: {
    label: 'Year 1 · Semester 2',
    period: 'Second Semester, 2022–23',
    courses: [
      course('thermo', 'BITS F111', 'Thermodynamics', 3, 'Dr. Imran Qadri', [
        T('c14-thermo-1', 'The first law',
          'The first law of thermodynamics is energy conservation: for a closed system, ΔU = Q − W, where Q is heat added to the system and W is work done by the system.',
          Q('A gas absorbs 500 J of heat and does 200 J of work. What is ΔU?', ['700 J', '300 J', '−300 J', '200 J'], 1),
          Q('The first law of thermodynamics is a statement of…', ['conservation of energy', 'conservation of mass', 'increasing entropy', 'absolute zero'], 0)),
        T('c14-thermo-2', 'The second law and Carnot efficiency',
          'The second law says no cycle can turn heat completely into work. The best possible efficiency between reservoirs at T_H and T_C (in kelvin) is the Carnot efficiency, 1 − T_C/T_H.',
          Q('The Carnot efficiency between 500 K and 300 K is…', ['60%', '40%', '30%', '100%'], 1),
          Q('No heat engine can be more efficient than…', ['a diesel engine', 'a Carnot engine between the same temperatures', 'a petrol engine', 'a refrigerator'], 1)),
      ]),
      course('math112', 'MATH F112', 'Mathematics 2', 3, 'Prof. Meghna Rao', [
        T('c14-math112-1', 'Determinants and invertibility',
          'A square matrix is invertible exactly when its determinant is non-zero. For a 2×2 matrix [[a, b], [c, d]], the determinant is ad − bc.',
          Q('The determinant of [[2, 3], [1, 4]] is…', ['5', '11', '8', '−5'], 0),
          Q('A square matrix with determinant 0 is…', ['always the identity', 'not invertible', 'always symmetric', 'orthogonal'], 1)),
        T('c14-math112-2', 'Complex numbers',
          'A complex number z = x + iy has modulus |z| = √(x² + y²). Euler’s formula says e^(iθ) = cos θ + i sin θ.',
          Q('The modulus of 3 + 4i is…', ['7', '5', '1', '25'], 1),
          Q('e^(iπ) equals…', ['1', '−1', 'i', '0'], 1)),
      ]),
      course('math113', 'MATH F113', 'Probability and Statistics', 3, 'Prof. Lata Deshpande', [
        T('c14-math113-1', 'Independent events',
          'If A and B are independent, P(A and B) = P(A) × P(B). So two heads in two fair coin tosses has probability 1/2 × 1/2 = 1/4.',
          Q('The probability of two sixes when rolling two fair dice is…', ['1/6', '1/36', '1/12', '2/6'], 1),
          Q('For independent events A and B, P(A and B) equals…', ['P(A) + P(B)', 'P(A) × P(B)', 'P(A) − P(B)', '1'], 1)),
        T('c14-math113-2', 'The normal distribution',
          'In a normal distribution about 68% of values lie within one standard deviation of the mean, and about 95% within two.',
          Q('About what percentage lies within ±2σ of the mean?', ['50%', '68%', '95%', '100%'], 2),
          Q('About what percentage lies within ±1σ of the mean?', ['68%', '95%', '34%', '99.7%'], 0)),
      ]),
      course('cs111', 'CS F111', 'Computer Programming', 4, 'Prof. Neha Bhardwaj', [
        T('c14-cs111-1', 'Loops in C',
          'In C, a loop like for (i = 0; i < 5; i++) runs its body 5 times, for i = 0, 1, 2, 3 and 4. Every C statement ends with a semicolon.',
          Q('How many times does for (i = 0; i < 5; i++) run?', ['4', '5', '6', 'Forever'], 1),
          Q('In C, every statement ends with…', ['a full stop', 'a colon', 'a semicolon', 'a comma'], 2)),
        T('c14-cs111-2', 'Arrays and pointers',
          'A C array stores elements of one type in a row, indexed from 0. A pointer stores a memory address: &x gives the address of x, and *p reads the value stored at p.',
          Q('The first element of an array a is…', ['a[1]', 'a[0]', 'a[-1]', 'a(0)'], 1),
          Q('In C, &x gives…', ['the value of x', 'the address of x', 'x squared', 'a copy of x'], 1)),
      ]),
      course('eee111', 'EEE F111', 'Electrical Sciences', 3, 'Prof. R. Natarajan', [
        T('c14-eee111-1', 'Ohm’s law and resistor networks',
          'Ohm’s law says V = IR. Resistors in series add up, R = R1 + R2; in parallel, 1/R = 1/R1 + 1/R2.',
          Q('Two 6 Ω resistors in parallel give…', ['12 Ω', '3 Ω', '6 Ω', '36 Ω'], 1),
          Q('A current of 2 A flows through a 5 Ω resistor. The voltage across it is…', ['2.5 V', '10 V', '7 V', '0.4 V'], 1)),
        T('c14-eee111-2', 'Kirchhoff’s laws',
          'Kirchhoff’s current law: current entering a node equals current leaving it (conservation of charge). Kirchhoff’s voltage law: voltages around any closed loop sum to zero (conservation of energy).',
          Q('3 A and 2 A flow into a node. How much flows out?', ['1 A', '5 A', '6 A', '0 A'], 1),
          Q('Kirchhoff’s voltage law comes from conservation of…', ['charge', 'energy', 'mass', 'momentum'], 1)),
      ]),
      course('trw112', 'BITS F112', 'Technical Report Writing', 2, 'Prof. Kavya Menon', [
        T('c14-trw112-1', 'Structure of a technical report',
          'A technical report usually has a title, abstract, introduction, method, results, discussion, conclusion and references. The abstract summarises the whole report in one short paragraph.',
          Q('Which section summarises the entire report briefly?', ['References', 'Abstract', 'Appendix', 'Method'], 1),
          Q('The sources you used are listed in the…', ['abstract', 'references', 'introduction', 'title'], 1)),
        T('c14-trw112-2', 'Clear, concise writing',
          'Good technical writing is clear and concise: one idea per paragraph, active voice where possible, and every claim backed by data or a source.',
          Q('Which sentence is the most concise?', ['It is to be noted that the results were found to be good.', 'The results were good.', 'In view of the fact that results occurred, they were good.'], 1),
          Q('In a technical report, every claim should be…', ['dramatic', 'backed by data or a source', 'as long as possible', 'in the passive voice'], 1)),
      ]),
    ],
    labCourses: [
      { id: 'ws112', code: 'ME F112', name: 'Workshop Practice', units: 2 },
    ],
    practicals: [
      { subject: 'cs111', name: 'Write, compile and run a C program', steps: ['Write the program in a text editor and save it as a .c file', 'Compile it with gcc', 'Fix any compilation errors and compile again', 'Run the program', 'Test it with sample inputs and check the output'] },
      { subject: 'ws112', name: 'Fitting job: file a mild-steel piece to size', steps: ['Mark the dimensions with a scriber and try-square', 'Clamp the job firmly in the bench vice', 'File the edges flat, checking with the try-square', 'Measure the dimensions with a vernier caliper', 'Deburr the edges and submit the job'] },
    ],
    project: {
      subject: 'trw112', name: 'Technical report: saving water in the hostel',
      description: 'Write a short technical report on water use in your hostel, with an abstract, data you collect, and recommendations.',
      choices: [
        { label: 'Collect real readings for a week, analyse them, and write every section properly', quality: 'excellent', result: 'Your report is chosen to be shared with the hostel’s student council.' },
        { label: 'Use estimates instead of measurements, but structure the report well', quality: 'good', result: 'Well written. “Next time, measure,” is the only comment.' },
        { label: 'Write it in one sitting the night before', quality: 'basic', result: 'It is submitted, and that is about the best that can be said for it.' },
      ],
    },
  },
};

export const COLLEGE_STAFF = {
  canteen: { name: 'Raju Bhaiya', role: 'ANC' },
  guard: { name: 'Security Bhaiya', role: 'Gate Security' },
  librarian: { name: 'Mr. Bansal', role: 'Library' },
  principal: { name: 'The Director', role: 'Director' },
};

export const COLLEGE_INTRO = {
  13: [
    'October 2022. Mirnal steps off the bus in Pilani, Rajasthan, with a suitcase, a new phone number and an admission letter for B.E. Chemical Engineering at BITS Pilani.',
    'Branch courses come later. Year 1 is the same for everyone: physics, chemistry, maths, biology and engineering graphics, plus three labs.',
    'First stop: Academic Registration, to sign up for the Semester 1 courses. Then the first lectures, under the shadow of the Clock Tower.',
  ],
  14: [
    'Second semester, early 2023. The campus feels like home now: ANC at midnight, friends from the lab, and a timetable that no longer needs a map.',
    'New courses: Thermodynamics (very useful for a future chemical engineer), Mathematics 2, Probability and Statistics, Computer Programming in C, Electrical Sciences, Workshop Practice and Technical Report Writing.',
  ],
};

// Real milestones from Mirnal's resume, shown as the road ahead after Year 1.
export const ROADMAP = [
  { when: 'Oct 2022 – Jun 2026', what: 'B.E. Chemical Engineering + Minor in Finance, BITS Pilani' },
  { when: 'May – Jul 2024', what: 'Chemical Engineering Intern, Reliance Industries, Nagothane: predictive turbine-maintenance automation that cut manual effort by 80%, plus Power BI supply-chain dashboards' },
  { when: 'Dec 2024 – Feb 2025', what: 'Risk Analyst Intern, Darashaw & Co.: risk and fund analysis for 50+ users; SEBI-compliant risk profiling that helped onboard 20+ clients (₹10L in fees)' },
  { when: 'Jul – Aug 2025', what: 'Product research: driving voice-input adoption for ChatGPT in India (1,000+ reviews, 6 competitor apps, a PRD)' },
  { when: 'Aug – Dec 2025', what: 'Product Analyst Intern, InMobi: recovered 70% of Daily Revenue Return (worth $100K) and grew incremental revenue 20% in 4 months' },
  { when: 'Jul – Sep 2026', what: 'Data Scientist Intern, Apollo 24|7: segmented 4.2M customers and automated a funnel over 10M+ events' },
];

// BITS-style letter grades (simplified absolute scale for the game).
export const LETTER_GRADES = [
  { min: 90, letter: 'A', points: 10 },
  { min: 80, letter: 'A-', points: 9 },
  { min: 70, letter: 'B', points: 8 },
  { min: 60, letter: 'B-', points: 7 },
  { min: 50, letter: 'C', points: 6 },
  { min: 42, letter: 'C-', points: 5 },
  { min: 33, letter: 'D', points: 4 },
  { min: 0, letter: 'NC', points: 0 },
];
